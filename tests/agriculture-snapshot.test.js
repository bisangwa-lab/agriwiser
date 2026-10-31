import test from "node:test";
import assert from "node:assert/strict";
import { selectTraceableAgricultureData } from "../src/lib/agriculture-snapshot-data.js";

test("Agriculture Snapshot includes traceable real records and excludes demonstrations or missing sources", () => {
  const datasets = [
    { id: "nisr", name: "NISR SAS 2024", source_url: "https://statistics.gov.rw/sas-2024.xlsx", quality_status: "verified" },
    { id: "demo", name: "Sample data", source_url: "https://example.org/sample", quality_status: "demonstration" },
    { id: "unlinked", name: "Unlinked table", source_url: "local-file.xlsx", quality_status: "verified" },
    { id: "provisional", name: "NISR SAS provisional", source_url: "https://statistics.gov.rw/sas-provisional.xlsx", quality_status: "provisional" },
  ];
  const observations = [
    { id: "real", dataset_id: "nisr", quality_status: "verified", is_demo: false },
    { id: "demo-source", dataset_id: "demo", quality_status: "verified", is_demo: false },
    { id: "demo-row", dataset_id: "nisr", quality_status: "demonstration", is_demo: false },
    { id: "demo-flag", dataset_id: "nisr", quality_status: "verified", is_demo: true },
    { id: "no-source", dataset_id: "unlinked", quality_status: "verified", is_demo: false },
    { id: "unknown", dataset_id: "missing", quality_status: "verified", is_demo: false },
    { id: "provisional-real", dataset_id: "provisional", quality_status: "provisional", is_demo: false },
  ];

  const result = selectTraceableAgricultureData(observations, datasets);

  assert.deepEqual(result.rows.map((row) => row.id), ["real", "provisional-real"]);
  assert.deepEqual(result.sources.map((source) => source.id), ["nisr", "provisional"]);
  assert.equal(result.sources[1].quality_status, "provisional");
});
