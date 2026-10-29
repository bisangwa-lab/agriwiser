import { readFile, writeFile, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const prepared = JSON.parse(await readFile(path.join(root, "data/private/local-records.json"), "utf8"));
const records = process.argv.includes("--catalogue-only") ? prepared.filter(row => row.entity !== "AgriculturalObservation") : prepared;
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const schema = await readFile(path.join(root, "migrations/0002_local_data.sql"), "utf8");
const statements = records.map(({ entity, id, data, published }) => {
  if (!["Dataset", "AgriculturalObservation", "ImportLog", "SourceArchive", "SourceTableIndex", "SourceTable", "SurveyFile", "SourceReportIndex", "SourceReportPage"].includes(entity) || data.id !== id) throw new Error("Invalid prepared record.");
  const json = JSON.stringify(data);
  if (Buffer.byteLength(json) < 48000) return "INSERT INTO local_records(entity,id,data,published) VALUES(" + [entity, id, json].map(quote).join(",") + "," + (published ? 1 : 0) + ") ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data,published=excluded.published;";
  // D1 limits SQL statement length. Assemble large, intact source tables in a
  // private staging row, then publish the complete valid JSON in one operation.
  const key = "entity=" + quote(entity) + " AND id=" + quote(id);
  const parts = ["CREATE TABLE IF NOT EXISTS local_import_staging(entity TEXT,id TEXT,data TEXT,PRIMARY KEY(entity,id));", "INSERT OR REPLACE INTO local_import_staging VALUES(" + quote(entity) + "," + quote(id) + ",'');"];
  for (let offset=0; offset<json.length; offset+=12000) parts.push("UPDATE local_import_staging SET data=data||" + quote(json.slice(offset,offset+12000)) + " WHERE " + key + ";");
  parts.push("INSERT INTO local_records(entity,id,data,published) SELECT entity,id,data," + (published?1:0) + " FROM local_import_staging WHERE " + key + " ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data,published=excluded.published;", "DELETE FROM local_import_staging WHERE " + key + ";");
  return parts.join("\n");
});
const temp = path.join(root, "data/private/import.sql");
try {
  for (let offset = 0; offset < statements.length; offset += 2000) {
    const batch = statements.slice(offset, offset + 2000);
    const last = offset + batch.length === statements.length;
    const crops = [...new Set(prepared.filter(row => row.entity === "AgriculturalObservation").map(row => row.data.crop))];
    const managedDatasets = prepared.filter(row => row.entity === "Dataset").map(row => row.id);
    // Remove obsolete normalized labels only inside these managed source releases.
    // Accounts, reviews, notes and any user-owned datasets remain untouched.
    const cleanup = last ? "\nDELETE FROM local_records WHERE entity='AgriculturalObservation' AND json_extract(data,'$.dataset_id') IN (" + managedDatasets.map(quote).join(",") + ") AND json_extract(data,'$.crop') NOT IN (" + crops.map(quote).join(",") + ");\nSELECT entity,COUNT(*) AS records FROM local_records GROUP BY entity;" : "";
    await writeFile(temp, schema + "\n" + batch.join("\n") + cleanup);
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/wrangler/bin/wrangler.js"), "d1", "execute", "hingasmart-local-auth", "--local", "--json", "--file", temp], { cwd: root, encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Import failed.");
    console.log(`Imported ${Math.min(offset + batch.length, statements.length)} / ${statements.length} records`);
    if (last) console.log(JSON.stringify(JSON.parse(result.stdout).filter(entry => entry.results?.length).flatMap(entry => entry.results), null, 2));
  }
} finally { await unlink(temp); }
