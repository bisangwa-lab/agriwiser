import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { explainChange, explainChart } from "../src/lib/explain.js";
import { buildReportSnapshot, REPORT_TYPES } from "../src/lib/reports/snapshot-builder.js";
import { generateExcelReport } from "../src/lib/reports/excel-builder.js";
import { generateWordReport } from "../src/lib/reports/word-builder.js";
import { generatePdfReport } from "../src/lib/reports/pdf-builder.js";
import { generateCsvReport } from "../src/lib/reports/csv-builder.js";

const sampleRecords = [
  { district: "Kirehe", crop: "Maize", year: 2025, season: "Season B", indicator: "production", value: 12000 },
  { district: "Kirehe", crop: "Maize", year: 2026, season: "Season B", indicator: "production", value: 14400 },
  { district: "Kirehe", crop: "Maize", year: 2025, season: "Season B", indicator: "harvested_area", value: 8000 },
  { district: "Kirehe", crop: "Maize", year: 2026, season: "Season B", indicator: "harvested_area", value: 8000 },
  { district: "Bugesera", crop: "Maize", year: 2026, season: "Season B", indicator: "production", value: 9500 },
  { district: "Bugesera", crop: "Maize", year: 2026, season: "Season B", indicator: "harvested_area", value: 6500 },
  { district: "Nyagatare", crop: "Maize", year: 2026, season: "Season B", indicator: "production", value: 18200 },
  { district: "Nyagatare", crop: "Maize", year: 2026, season: "Season B", indicator: "harvested_area", value: 10000 },
];

test("1. Multi-level explanation engine adapts to audiences without fabricating data", () => {
  // Simple mode test
  const simple = explainChange({
    indicator: "production",
    current: 14400,
    previous: 12000,
    currentPeriod: "2026 Season B",
    previousPeriod: "2025 Season B",
    crop: "Maize",
    geography: "Kirehe",
    season: "Season B",
    mode: "simple",
  });
  assert.equal(simple.mode, "simple");
  assert.ok(simple.headline.includes("increased by about 20.0%"));
  assert.ok(simple.blocks.some((b) => b.title === "What is happening?"));
  assert.ok(simple.blocks.some((b) => b.title === "What does this mean for farmers and communities?"));

  // Professional mode test (Default)
  const prof = explainChange({
    indicator: "production",
    current: 14400,
    previous: 12000,
    currentPeriod: "2026 Season B",
    previousPeriod: "2025 Season B",
    crop: "Maize",
    geography: "Kirehe",
    season: "Season B",
    mode: "professional",
  });
  assert.equal(prof.mode, "professional");
  assert.ok(prof.headline.includes("increased by 20.0%"));
  assert.ok(prof.blocks.some((b) => b.title.includes("Main Finding")));
  assert.ok(prof.blocks.some((b) => b.title.includes("Data Quality")));
  assert.ok(prof.blocks.some((b) => b.body.includes("cannot identify the specific agronomic, climate, or economic causes")));

  // Technical mode test
  const tech = explainChange({
    indicator: "production",
    current: 14400,
    previous: 12000,
    currentPeriod: "2026 Season B",
    previousPeriod: "2025 Season B",
    crop: "Maize",
    geography: "Kirehe",
    season: "Season B",
    mode: "technical",
    currentArea: 8000,
    previousArea: 8000,
    currentProd: 14400,
    previousProd: 12000,
  });
  assert.equal(tech.mode, "technical");
  assert.ok(tech.blocks.some((b) => b.title.includes("Delta Formulation")));
  assert.ok(tech.blocks.some((b) => b.title.includes("Factor Decomposition")));
  assert.ok(tech.blocks.some((b) => b.body.includes("Two-stage stratified cluster sampling")));

  // Missing data and zero baseline safeguards
  const zeroBase = explainChange({
    indicator: "production",
    current: 500,
    previous: 0,
    currentPeriod: "2026 Season B",
    previousPeriod: "2025 Season B",
    crop: "Maize",
  });
  assert.ok(zeroBase.headline.includes("percentage change is not calculable"));

  const missingVal = explainChange({
    indicator: "production",
    current: 500,
    previous: null,
    currentPeriod: "2026 Season B",
    previousPeriod: "2025 Season B",
    crop: "Maize",
  });
  assert.ok(missingVal.headline.includes("could not be compared"));
});

test("2. Chart explanation tool provides 4-part empirical explanation", () => {
  const chartExp = explainChart({
    chartType: "trend line",
    title: "Maize Production Trajectory",
    indicator: "production",
    scope: "Kirehe District",
    period: "2024–2026",
    data: [
      { name: "2024 Season B", value: 10000 },
      { name: "2025 Season B", value: 12000 },
      { name: "2026 Season B", value: 14400 },
    ],
  });

  assert.ok(chartExp.whatItShows.includes("production"));
  assert.ok(chartExp.whatChanged.includes("+44.0%"));
  assert.ok(chartExp.evidenceAndSource.includes("Seasonal Agricultural Survey"));
  assert.ok(chartExp.limitations.includes("do not establish agronomic cause"));
});

test("3. Shared reporting engine generates validated snapshots across report types", () => {
  assert.equal(REPORT_TYPES.length, 8);

  // District performance snapshot
  const distSnapshot = buildReportSnapshot({
    reportType: "district_performance",
    filters: { crop: "Maize", district: "Kirehe", season: "Season B", yearA: "2025", yearB: "2026", indicator: "production" },
    records: sampleRecords,
  });
  assert.equal(distSnapshot.reportType, "district_performance");
  assert.ok(distSnapshot.id.startsWith("HS-REP-"));
  assert.equal(distSnapshot.keyFindings.length, 5);
  assert.equal(distSnapshot.keyFindings[0].question, "1. What is happening?");
  assert.equal(distSnapshot.tableRows.length, 3);
  assert.ok(distSnapshot.chartSpec !== null);

  // Crop analysis snapshot
  const cropSnapshot = buildReportSnapshot({
    reportType: "crop_analysis",
    filters: { crop: "Maize", season: "Season B", yearB: "2026" },
    records: sampleRecords,
  });
  assert.equal(cropSnapshot.reportType, "crop_analysis");
  assert.ok(cropSnapshot.chartSpec !== null);
  assert.equal(cropSnapshot.tableHeaders[0], "District");

  // Climate context snapshot
  const climateSnapshot = buildReportSnapshot({
    reportType: "climate_context",
    filters: { district: "Kirehe", season: "Season B", yearB: "2026" },
    weatherData: { precipitationTotal: 390, temperatureMean: 21.4, precipitationAnomalyPct: -7.1 },
  });
  assert.equal(climateSnapshot.reportType, "climate_context");
  assert.ok(climateSnapshot.executiveSummary.includes("must not be asserted as the sole or direct cause"));

  // Investigation dossier snapshot
  const invSnapshot = buildReportSnapshot({
    reportType: "investigation_dossier",
    investigations: [{ id: "INV-01", title: "Test Investigation", crop: "Maize", district: "Kirehe", period: "2026 Season B", status: "completed" }],
  });
  assert.equal(invSnapshot.reportType, "investigation_dossier");
  assert.equal(invSnapshot.chartSpec, null); // Analytical rule: no redundant charts for actions
});

test("4. Native Excel exporter creates authentic .xlsx with DrawingML live chart", async () => {
  const snapshot = buildReportSnapshot({
    reportType: "district_performance",
    filters: { crop: "Maize", district: "Kirehe", season: "Season B", yearA: "2025", yearB: "2026", indicator: "production" },
    records: sampleRecords,
  });

  const buffer = await generateExcelReport(snapshot);
  assert.ok(buffer instanceof Uint8Array);
  assert.ok(buffer.length > 5000);

  // Unzip and inspect OpenXML structure
  const zip = await JSZip.loadAsync(buffer);
  assert.ok(zip.file("[Content_Types].xml"));
  assert.ok(zip.file("xl/workbook.xml"));
  assert.ok(zip.file("xl/worksheets/sheet1.xml"));
  assert.ok(zip.file("xl/worksheets/sheet2.xml"));
  assert.ok(zip.file("xl/drawings/drawing1.xml"));
  assert.ok(zip.file("xl/charts/chart1.xml"));

  const chartXml = await zip.file("xl/charts/chart1.xml").async("text");
  assert.ok(chartXml.includes("<c:barChart>"));
  assert.ok(chartXml.includes("<c:cat>"));
  assert.ok(chartXml.includes("<c:val>"));
  assert.ok(chartXml.includes("'Statistical Observations'!$A$"));
  assert.ok(chartXml.includes("'Statistical Observations'!$B$"));

  const sheet1Xml = await zip.file("xl/worksheets/sheet1.xml").async("text");
  assert.ok(sheet1Xml.includes("EXECUTIVE SUMMARY"));
  assert.ok(sheet1Xml.includes("KEY VERIFIED FINDINGS"));
});

test("5. Professional Word exporter generates structured .docx document", async () => {
  const snapshot = buildReportSnapshot({
    reportType: "district_performance",
    filters: { crop: "Maize", district: "Kirehe", season: "Season B", yearA: "2025", yearB: "2026", indicator: "production" },
    records: sampleRecords,
  });

  const buffer = await generateWordReport(snapshot);
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 5000);

  // Unzip docx to inspect document.xml
  const zip = await JSZip.loadAsync(buffer);
  assert.ok(zip.file("word/document.xml"));
  const docXml = await zip.file("word/document.xml").async("text");
  assert.ok(docXml.includes("Executive Summary"));
  assert.ok(docXml.includes("Key Verified Findings"));
  assert.ok(docXml.includes("Statistical Observations"));
  assert.ok(docXml.includes("Sources &amp; Calculation Methodology"));
});

test("6. Paginated PDF exporter creates publication-grade PDF with searchable text", async () => {
  const snapshot = buildReportSnapshot({
    reportType: "district_performance",
    filters: { crop: "Maize", district: "Kirehe", season: "Season B", yearA: "2025", yearB: "2026", indicator: "production" },
    records: sampleRecords,
  });

  const arrayBuffer = await generatePdfReport(snapshot);
  assert.ok(arrayBuffer instanceof ArrayBuffer);
  assert.ok(arrayBuffer.byteLength > 5000);

  // Inspect PDF magic header %PDF-
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
  const headerStr = String.fromCharCode(...headerBytes);
  assert.equal(headerStr, "%PDF-");
});

test("7. CSV exporter retains units, sources, and provenance metadata", () => {
  const snapshot = buildReportSnapshot({
    reportType: "district_performance",
    filters: { crop: "Maize", district: "Kirehe", season: "Season B", yearA: "2025", yearB: "2026", indicator: "production" },
    records: sampleRecords,
  });

  const csv = generateCsvReport(snapshot);
  assert.ok(csv.includes("# Report Title"));
  assert.ok(csv.includes("# Geographic Scope"));
  assert.ok(csv.includes("# Dataset Publisher"));
  assert.ok(csv.includes("Total Production"));
  assert.ok(csv.includes("Harvested Area"));
  assert.ok(csv.includes("Derived Yield"));
});
