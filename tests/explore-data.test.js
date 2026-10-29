import test from "node:test";
import assert from "node:assert/strict";
import { DISTRICT_NAMES, INDICATORS } from "../src/lib/constants.js";
import { EXPLORE_DEFAULTS, exploreData, exploreExportRows, validateExploreSearch } from "../src/lib/explore-data.js";
import { sourceTableView } from "../src/lib/source-table-view.js";

const selection = { ...EXPLORE_DEFAULTS, fromYear: 2024, toYear: 2025, baselineYear: 2024, district: "Gasabo" };
const cell = (year, indicator = "production", value = 100, extra = {}) => ({
  id: `${year}-${indicator}`, domain: "crop", year, crop: "Maize", geography: "Gasabo", season: "Season B",
  indicator, value, unit: INDICATORS[indicator].unit, dataset_id: `release-${year}`, observation_status: "observed",
  source_reference: `workbook ${year}!C5`, source_url: "https://example.com/source.xlsx", quality_flags: [], ...extra,
});
test("complete totals and selected-indicator exports share the same observations", () => {
  const result = exploreData([cell(2024), cell(2025, "production", 125), cell(2025, "cultivated_area", 900)], selection);
  assert.equal(result.current.value, 125);
  assert.equal(result.change, 25);
  assert.equal(result.records.length, 2);
  assert.ok(exploreExportRows(result.records).every(row => row.indicator === "production"));
});
test("an absent district and a missing source value both withhold all-district totals", () => {
  const rows = DISTRICT_NAMES.map(geography => cell(2025, "production", 10, { geography }));
  const complete = exploreData(rows, { ...selection, district: "all" });
  assert.equal(complete.current.value, 300);
  const absent = exploreData(rows.slice(1), { ...selection, district: "all" });
  assert.equal(absent.current.expected, 30);
  assert.equal(absent.current.present, 29);
  assert.equal(absent.current.absent, 1);
  assert.equal(absent.current.value, null);
  assert.equal(absent.change, null);
  const missing = exploreData(rows.map((row, i) => i ? row : { ...row, value: null }), { ...selection, district: "all" });
  assert.equal(missing.current.absent, 0);
  assert.equal(missing.current.missing, 1);
  assert.equal(missing.current.value, null);
});
test("gaps stay in the series; explicit missing baseline is never replaced by an older year", () => {
  const result = exploreData([cell(2023), cell(2025, "production", 150)], { ...selection, fromYear: 2023 });
  assert.deepEqual(result.series.map(item => item.value), [100, null, 150]);
  assert.equal(result.previous.year, 2024);
  assert.equal(result.change, null);
});
test("zero baselines, wrong units, forecasts and conflicting releases cannot produce a change", () => {
  assert.equal(exploreData([cell(2024, "production", 0), cell(2025)], selection).change, null);
  for (const extra of [{ unit: "kg" }, { observation_status: "forecast" }, { value: -3 }]) {
    assert.equal(exploreData([cell(2024), cell(2025, "production", 100, extra)], selection).current.value, null);
  }
  const conflicting = exploreData([cell(2025), cell(2025, "production", 101, { dataset_id: "revision" })], selection);
  assert.equal(conflicting.current.value, null);
  assert.match(conflicting.current.records[0].analysis_status, /Conflicting/);
});
test("derived yield exports matched components and rejects mismatched releases", () => {
  const rows = [cell(2024), cell(2024, "harvested_area", 50), cell(2025, "production", 150), cell(2025, "harvested_area", 50)];
  const result = exploreData(rows, { ...selection, indicator: "yield" });
  assert.equal(result.current.value, 3);
  assert.equal(result.change, 50);
  assert.ok(result.records.every(row => row.indicator === "yield"));
  const exported = exploreExportRows(result.records)[0];
  assert.equal(exported.production_t, 150);
  assert.equal(exported.harvested_area_ha, 50);
  assert.match(exported.source_reference, /2025/);
  assert.equal(exploreData(rows.map(row => row.indicator === "harvested_area" ? { ...row, dataset_id: "different-release" } : row), { ...selection, indicator: "yield" }).current.value, null);
});
test("all-crop scope keeps fixed categories across years and excludes subtypes", () => {
  const catalogue = { availability: [{ crop: "Maize", level: "main", year: 2024, season: "Season B" }, { crop: "Sorghum", level: "main", year: 2025, season: "Season B" }] };
  const result = exploreData([cell(2024), cell(2025), cell(2025, "production", 20, { crop: "Sorghum" }), cell(2025, "production", 999, { crop: "Cooking Banana", aggregation_level: "subtype" })], { ...selection, crop: "all" }, catalogue);
  assert.deepEqual(result.crops, ["Maize", "Sorghum"]);
  assert.equal(result.previous.value, null);
  assert.equal(result.current.value, 120);
  assert.equal(result.change, null);
});
test("published yield cannot be summed across districts or crops", () => {
  const row = cell(2025, "reported_yield", 2000);
  assert.equal(exploreData([row], { ...selection, indicator: "reported_yield" }).current.value, 2000);
  assert.equal(exploreData([row], { ...selection, district: "all", indicator: "reported_yield" }).current.value, null);
});
test("district review list ranks calculable changes and withholds missing comparisons", () => {
  const rows = [cell(2024), cell(2025, "production", 50), cell(2024, "production", 100, { geography: "Huye" }), cell(2025, "production", 110, { geography: "Huye" })];
  const result = exploreData(rows, { ...selection, district: "all" });
  assert.equal(result.current.value, null);
  assert.equal(result.districtComparisons.length, 30);
  assert.equal(result.districtComparisons[0].district, "Gasabo");
  assert.equal(result.districtComparisons[0].change, -50);
  assert.equal(result.districtComparisons[1].district, "Huye");
  assert.equal(result.districtComparisons[2].change, null);
});
test("zero-area pairs contribute no weight; rates and entirely zero-area totals remain unavailable", () => {
  const rows = DISTRICT_NAMES.flatMap((geography, i) => [cell(2025, "production", i ? 0 : 100, { geography }), cell(2025, "harvested_area", i ? 0 : 50, { geography })]);
  const result = exploreData(rows, { ...selection, indicator: "yield", district: "all" });
  assert.equal(result.current.value, 2);
  assert.equal(result.current.present, 30);
  assert.equal(result.current.records.find(row => row.geography === DISTRICT_NAMES[1]).value, null);
  assert.equal(exploreData([cell(2025, "production", 0), cell(2025, "harvested_area", 0)], { ...selection, indicator: "yield" }).current.value, null);
});
test("sample and published years are never compared and exports preserve precision and formula safety", () => {
  const result = exploreData([cell(2024, "production", 50, { is_demo: true }), cell(2025, "production", 123.456789, { dataset_name: "=HYPERLINK(1)", source_reference: "@source" })], selection);
  assert.equal(result.change, null);
  assert.match(result.comparisonReason, /Sample/);
  const exported = exploreExportRows(result.records)[0];
  assert.equal(exported.value, 123.456789);
  assert.equal(exported.dataset, "'=HYPERLINK(1)");
  assert.equal(exported.source_reference, "'@source");
});
test("search validation bounds years and choices and normalizes reversed ranges", () => {
  const result = validateExploreSearch({ fromYear: "2025", toYear: "2024", crop: "forged", indicator: "unknown", district: "Atlantis", view: "library" });
  assert.equal(result.crop, "Maize");
  assert.equal(result.fromYear, 2024);
  assert.equal(result.toYear, 2025);
  assert.equal(result.district, "all");
  assert.equal(result.view, "library");
});
test("readable tables retain source coordinates, headings and numeric precision", () => {
  const table = { column_count: 4, rows: [[null, "Table 1: Production", null, null], [null, "District", "Production (t)", null], [null, "Gasabo", 123.456789, null], [null, null, null, null], [null, "Huye", 456, null]] };
  const readable = sourceTableView(table, { search: "Gasabo" });
  assert.equal(readable.columns.length, 2);
  assert.equal(readable.columns[0].coordinate, "B");
  assert.equal(readable.columns[1].label, "Production (t)");
  assert.equal(readable.rows[0].row, 3);
  assert.equal(readable.rows[0].cells[2], 123.456789);
  const original = sourceTableView(table, { original: true });
  assert.equal(original.rows.length, 5);
  assert.equal(original.columns.length, 4);
  assert.equal(table.rows[3].length, 4);
});
