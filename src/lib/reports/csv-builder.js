import { toCsv, downloadCsv } from "../csv.js";

/**
 * AGRIWISER — STANDARDIZED CSV REPORT EXPORTER
 *
 * Exports snapshot observations along with report metadata, units,
 * methodology notes, and source provenance.
 */
export function generateCsvReport(snapshot) {
  const metadataRows = [
    { key: "# Report Title", value: snapshot.title },
    { key: "# Report ID", value: snapshot.id },
    { key: "# Geographic Scope", value: snapshot.geographicScope },
    { key: "# Agricultural Period", value: snapshot.agriculturalPeriod },
    { key: "# Approval Status", value: snapshot.approvalStatus },
    { key: "# Generation Timestamp", value: snapshot.generatedAt },
    { key: "# Dataset Publisher", value: snapshot.primaryDataset?.publisher || "NISR" },
    { key: "# Dataset Name", value: snapshot.primaryDataset?.name || "SAS" },
    { key: "# Dataset Version", value: snapshot.primaryDataset?.version || "1.0" },
    { key: "# Limitations", value: (snapshot.limitations || []).join(" | ") },
    { key: "#", value: "" },
  ];

  const metaText = metadataRows.map((r) => `${r.key},${JSON.stringify(r.value)}`).join("\n");

  const tableRows = snapshot.tableRows || [];
  const headers = snapshot.tableHeaders || (tableRows[0] ? Object.keys(tableRows[0]) : []);
  
  // Format data lines with human-readable headers
  const lines = [headers.map((h) => JSON.stringify(h)).join(",")];
  for (const row of tableRows) {
    const vals = Object.values(row);
    lines.push(vals.map((v) => JSON.stringify(String(v ?? ""))).join(","));
  }
  const dataCsv = lines.join("\n");

  return `${metaText}\n${dataCsv}`;
}

export function downloadReportCsv(filename, snapshot) {
  const csvContent = generateCsvReport(snapshot);
  downloadCsv(filename, csvContent);
}
