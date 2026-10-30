/**
 * Tests for the production finding engine. These import the real module so a
 * regression in the shipped code cannot be hidden by a test-local copy.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  FINDING_RULE,
  analyzeDatasetFindings,
  detectDatasetFindings,
  groupDatasetFindings,
  investigationDraftFromFinding,
  findingLabel,
  findingRule,
} from "../src/lib/dataset-findings.js";

function obs(crop, geography, season, year, indicator, value, opts = {}) {
  return {
    id: opts.id ?? `${geography}-${crop}-${season}-${year}-${indicator}-${value}-${Math.random().toString(36).slice(2, 7)}`,
    domain: "crop",
    crop,
    geography,
    season,
    year,
    indicator,
    value,
    unit: opts.unit ?? (indicator === "production" ? "tonnes" : "hectares"),
    observation_status: opts.observation_status ?? "observed",
    quality_status: "verified",
    aggregation_level: "main",
    is_demo: opts.is_demo ?? false,
    dataset_id: opts.dataset_id ?? "nisr-sas-2024-ab",
    dataset_name: opts.dataset_name ?? "NISR SAS 2024 · Annual tables",
    source_reference: opts.source_reference ?? `SAS_2024_Tables.xlsx, Table 10!${indicator === "production" ? "D4" : "E4"}`,
    source_url: "https://statistics.gov.rw/example.xlsx",
    ...opts,
  };
}

const ids = (findings) => findings.map((finding) => finding.id);
const temporal = (findings) => findings.filter((finding) => finding.finding_type === "temporal_comparison");

test("empty or invalid input produces no findings and no fabricated statistics", () => {
  for (const input of [[], null, undefined]) {
    const result = analyzeDatasetFindings(input);
    assert.deepEqual(result.findings, []);
    assert.deepEqual(result.groups, []);
    assert.equal(result.stats.findings, 0);
    assert.equal(result.stats.conditions, 0);
  }
});

test("finding rule matches the documented thresholds and materiality", () => {
  assert.equal(FINDING_RULE.reviewThresholdPct, 15);
  assert.equal(FINDING_RULE.priorityThresholdPct, 30);
  assert.deepEqual(FINDING_RULE.materiality, { production: 50, harvested_area: 25, yield: 0.08 });
  assert.equal(findingRule.reviewThresholdPct ?? findingRule.thresholdReviewPct, 15);
  assert.equal(findingLabel("observed_zero"), "Observed zero");
});

test("a material adjacent-year production decline is detected", () => {
  const rows = [
    obs("Maize", "Kirehe", "Season A", 2023, "production", 5000),
    obs("Maize", "Kirehe", "Season A", 2024, "production", 3500),
  ];
  const findings = detectDatasetFindings(rows);
  const production = findings.find((finding) => finding.indicator === "production");
  assert.ok(production, "production finding must exist");
  assert.equal(production.current_value, 3500);
  assert.equal(production.baseline_value, 5000);
  assert.equal(production.percentage_change, -30);
  assert.equal(production.priority, "priority");
  assert.equal(production.is_decline, true);
  assert.equal(production.validation_status, "source_validated");
  assert.match(production.rule_id, /YOY-CHANGE/);
});

test("non-adjacent years are never compared", () => {
  const rows = [
    obs("Maize", "Kirehe", "Season A", 2022, "production", 5000),
    obs("Maize", "Kirehe", "Season A", 2024, "production", 1000),
  ];
  const result = analyzeDatasetFindings(rows);
  assert.equal(result.findings.filter((finding) => finding.finding_type === "temporal_comparison").length, 0);
  assert.equal(result.stats.missingBaseline, 1);
  assert.equal(result.stats.comparableSeries, 0);
});

test("a missing previous year is not treated as a zero baseline", () => {
  const rows = [
    obs("Maize", "Kirehe", "Season A", 2023, "production", 5000),
    obs("Maize", "Kirehe", "Season A", 2025, "production", 1000),
  ];
  const result = analyzeDatasetFindings(rows);
  assert.equal(result.findings.filter((finding) => finding.finding_type === "temporal_comparison").length, 0);
  assert.equal(result.stats.missingBaseline, 1);
});

test("an observed zero baseline produces an absolute change, never a percentage", () => {
  const rows = [
    obs("Rice", "Bugesera", "Season A", 2023, "production", 0),
    obs("Rice", "Bugesera", "Season A", 2024, "production", 500),
  ];
  const findings = detectDatasetFindings(rows);
  const production = findings.find((finding) => finding.indicator === "production");
  assert.ok(production, "the material absolute increase is retained");
  assert.equal(production.percentage_change, null);
  assert.equal(production.comparison_state, "zero_baseline");
  assert.equal(production.baseline_value, 0);
  assert.match(production.calculation_used, /percentage change is undefined/i);
  assert.equal(production.priority, "review");
});

test("an observed zero current value is labelled observed zero, not a total loss", () => {
  const rows = [
    obs("Beans", "Burera", "Season C", 2024, "production", 117.5),
    obs("Beans", "Burera", "Season C", 2025, "production", 0),
  ];
  const findings = detectDatasetFindings(rows);
  const production = findings.find((finding) => finding.indicator === "production");
  assert.ok(production);
  assert.equal(production.validation_status, "observed_zero");
  assert.equal(production.zero_current, true);
  assert.equal(production.percentage_change, -100);
  assert.match(production.title, /reported at zero/);
  assert.doesNotMatch(production.title, /loss/i);
  assert.doesNotMatch(production.summary, /loss/i);
  assert.match(production.evidence_limitations, /no crop was grown|no harvest was recorded|outside the survey scope/i);
});

test("the materiality floor suppresses a large percentage on a tiny base", () => {
  const rows = [
    obs("Other Crops", "Ngoma", "Season A", 2023, "production", 0.14),
    obs("Other Crops", "Ngoma", "Season A", 2024, "production", 0.25),
    obs("Maize", "Ngoma", "Season A", 2023, "production", 100),
    obs("Maize", "Ngoma", "Season A", 2024, "production", 140),
  ];
  const findings = detectDatasetFindings(rows);
  assert.equal(
    findings.filter((finding) => finding.indicator === "production").length,
    0,
    "0.11 t and 40 t absolute changes are below the 50 t floor",
  );
});

test("the review threshold suppresses a material but small relative change", () => {
  const rows = [
    obs("Maize", "Kayonza", "Season A", 2023, "production", 1000),
    obs("Maize", "Kayonza", "Season A", 2024, "production", 1120),
  ];
  assert.equal(temporal(detectDatasetFindings(rows)).length, 0, "a 12% change is below the 15% review threshold");
});

test("different seasons are never compared with each other", () => {
  const rows = [
    obs("Beans", "Bugesera", "Season A", 2023, "production", 2000),
    obs("Beans", "Bugesera", "Season B", 2024, "production", 800),
  ];
  assert.equal(temporal(detectDatasetFindings(rows)).length, 0);
});

test("yield is derived only when both production and a positive area are present", () => {
  const rows = [
    obs("Maize", "Musanze", "Season A", 2023, "production", 4000),
    obs("Maize", "Musanze", "Season A", 2023, "harvested_area", 800),
    obs("Maize", "Musanze", "Season A", 2024, "production", 2000),
    obs("Maize", "Musanze", "Season A", 2024, "harvested_area", 800),
  ];
  const findings = detectDatasetFindings(rows);
  const yieldFinding = findings.find((finding) => finding.indicator === "yield");
  assert.ok(yieldFinding);
  assert.equal(yieldFinding.baseline_value, 5);
  assert.equal(yieldFinding.current_value, 2.5);
  assert.equal(yieldFinding.unit, "t/ha");
  assert.match(yieldFinding.calculation_method, /production ÷ harvested area/);
});

test("missing harvested area becomes a coverage-gap finding, not a zero", () => {
  const rows = [obs("Maize", "Nyagatare", "Season A", 2024, "production", 450)];
  const findings = detectDatasetFindings(rows);
  const gap = findings.find((finding) => finding.rule_id === "COVERAGE-GAP");
  assert.ok(gap);
  assert.equal(gap.issue, "missing_harvested_area");
  assert.match(gap.calculation_used, /missing \(not zero\)/);
  assert.equal(gap.indicator, "harvested_area");
  assert.equal(gap.current_value, 450);
});

test("an incompatible unit blocks comparison and is reported explicitly", () => {
  const rows = [
    obs("Maize", "Rulindo", "Season A", 2023, "production", 1000),
    obs("Maize", "Rulindo", "Season A", 2023, "harvested_area", 500, { unit: "acres" }),
    obs("Maize", "Rulindo", "Season A", 2024, "production", 500),
    obs("Maize", "Rulindo", "Season A", 2024, "harvested_area", 250, { unit: "acres" }),
  ];
  const findings = detectDatasetFindings(rows);
  const unit = findings.find((finding) => finding.rule_id === "UNIT-CHECK");
  assert.ok(unit);
  assert.equal(unit.validation_status, "invalid_unit");
  assert.equal(findings.filter((finding) => finding.indicator === "harvested_area" && finding.finding_type === "temporal_comparison").length, 0);
});

test("conflicting published values are never resolved by choosing one", () => {
  const rows = [
    obs("Maize", "Gicumbi", "Season A", 2023, "production", 1000, { id: "a", source_reference: "Table 1!A1" }),
    obs("Maize", "Gicumbi", "Season A", 2024, "production", 600, { id: "b", source_reference: "Table 1!A2" }),
    obs("Maize", "Gicumbi", "Season A", 2024, "production", 900, { id: "c", source_reference: "Table 2!B2" }),
  ];
  const findings = detectDatasetFindings(rows);
  const conflict = findings.find((finding) => finding.rule_id === "SOURCE-CONFLICT");
  assert.ok(conflict);
  assert.equal(conflict.validation_status, "conflicting_source");
  assert.equal(findings.filter((finding) => finding.indicator === "production" && finding.finding_type === "temporal_comparison").length, 0);
  assert.match(conflict.calculation_used, /Table 1!A2/);
  assert.match(conflict.calculation_used, /Table 2!B2/);
});

test("identical duplicate rows are deduplicated without a false conflict", () => {
  const rows = [
    obs("Maize", "Gicumbi", "Season A", 2023, "production", 1000, { id: "a" }),
    obs("Maize", "Gicumbi", "Season A", 2024, "production", 600, { id: "b" }),
    obs("Maize", "Gicumbi", "Season A", 2024, "production", 600, { id: "c" }),
  ];
  const findings = detectDatasetFindings(rows);
  assert.equal(findings.filter((finding) => finding.rule_id === "SOURCE-CONFLICT").length, 0);
  assert.ok(findings.find((finding) => finding.indicator === "production" && finding.current_value === 600));
});

test("related production, area and yield signals are grouped into one condition", () => {
  const rows = [
    obs("Maize", "Musanze", "Season A", 2023, "production", 4000),
    obs("Maize", "Musanze", "Season A", 2023, "harvested_area", 800),
    obs("Maize", "Musanze", "Season A", 2024, "production", 1600),
    obs("Maize", "Musanze", "Season A", 2024, "harvested_area", 400),
  ];
  const result = analyzeDatasetFindings(rows);
  assert.equal(result.groups.length, 1);
  const group = result.groups[0];
  assert.equal(group.signal_count, 3);
  assert.deepEqual([...group.indicators].sort(), ["harvested_area", "production", "yield"]);
  assert.equal(group.findings.length, 3);
  assert.equal(group.priority, "priority");
  assert.match(group.title, /production, harvested area and yield/);
});

test("demo rows are excluded from official detection", () => {
  const demoId = "demo-current";
  const rows = [
    obs("Maize", "Kirehe", "Season A", 2023, "production", 5000),
    obs("Maize", "Kirehe", "Season A", 2024, "production", 1000, { is_demo: true, id: demoId }),
  ];
  const result = analyzeDatasetFindings(rows);
  assert.equal(result.stats.excluded.demo, 1);
  assert.equal(result.findings.filter((finding) => finding.finding_type === "temporal_comparison").length, 0);
  assert.equal(ids(result.findings).includes(demoId), false);
});

test("partial stratification is excluded and counted, never mixed with main rows", () => {
  const rows = [
    obs("Maize", "Kirehe", "Season A", 2023, "production", 5000, { aggregation_level: "main" }),
    obs("Maize", "Kirehe", "Season A", 2023, "harvested_area", 1000, { aggregation_level: "main" }),
    obs("Maize", "Kirehe", "Season A", 2024, "production", 1000, { aggregation_level: "subtype" }),
    obs("Maize", "Kirehe", "Season A", 2024, "harvested_area", 500, { aggregation_level: "subtype" }),
  ];
  const result = analyzeDatasetFindings(rows);
  assert.equal(result.stats.excluded.nonMain, 2);
  assert.equal(result.findings.length, 0);
});

test("source provenance survives onto the finding and the investigation draft", () => {
  const rows = [
    obs("Maize", "Kirehe", "Season A", 2023, "production", 5000, {
      source_reference: "SAS_2023_Tables.xlsx, Table 10!D4",
      dataset_id: "nisr-sas-2023-annual",
      dataset_name: "NISR SAS 2023 · Annual tables",
    }),
    obs("Maize", "Kirehe", "Season A", 2024, "production", 3000, {
      source_reference: "SAS_2024_Tables.xlsx, Table 10!D4",
      dataset_id: "nisr-sas-2024-ab",
      dataset_name: "NISR SAS 2024 · Annual tables",
    }),
  ];
  const finding = detectDatasetFindings(rows)[0];
  assert.equal(finding.source.current.source_reference, "SAS_2024_Tables.xlsx, Table 10!D4");
  assert.equal(finding.source.baseline.source_reference, "SAS_2023_Tables.xlsx, Table 10!D4");
  assert.equal(finding.source_reference, "SAS_2024_Tables.xlsx, Table 10!D4");

  const draft = investigationDraftFromFinding(finding);
  assert.equal(draft.finding_id, finding.id);
  assert.equal(draft.finding_ids[0], finding.id);
  assert.equal(draft.crop, "Maize");
  assert.equal(draft.district, "Kirehe");
  assert.equal(draft.priority, "elevated");
  assert.match(draft.evidence, /SAS_2024_Tables\.xlsx/);
  assert.match(draft.evidence, /SAS_2023_Tables\.xlsx/);
  assert.equal(Object.hasOwn(draft, "is_demo"), false, "provenance must be derived on the server");
});

test("missing source lineage is shown as unknown and never labeled source validated", () => {
  const rows = [
    obs("Maize", "Kirehe", "Season A", 2023, "production", 5000, { source_reference: null }),
    obs("Maize", "Kirehe", "Season A", 2024, "production", 3000, { source_reference: null }),
  ];
  const finding = detectDatasetFindings(rows)[0];
  assert.ok(finding);
  assert.equal(finding.validation_status, "insufficient_comparable_evidence");
  assert.equal(finding.source_reference, null);
  assert.equal(finding.dataset_name, "NISR SAS 2024 · Annual tables");

  const noDataset = rows.map((row) => ({ ...row, dataset_id: null, dataset_name: null }));
  const unlinked = detectDatasetFindings(noDataset)[0];
  assert.equal(unlinked.validation_status, "insufficient_comparable_evidence");
  assert.equal(unlinked.dataset_name, null);
});

test("grouping is deterministic and keeps one condition per crop, district, season and year", () => {
  const rows = [
    obs("Maize", "Kirehe", "Season A", 2024, "production", 1000),
    obs("Maize", "Kirehe", "Season A", 2024, "harvested_area", 500),
    obs("Maize", "Kirehe", "Season A", 2025, "production", 500),
    obs("Maize", "Kirehe", "Season A", 2025, "harvested_area", 250),
    obs("Maize", "Kirehe", "Season B", 2024, "production", 1000),
    obs("Maize", "Kirehe", "Season B", 2024, "harvested_area", 500),
    obs("Maize", "Kirehe", "Season B", 2025, "production", 500),
    obs("Maize", "Kirehe", "Season B", 2025, "harvested_area", 250),
  ];
  const result = analyzeDatasetFindings(rows);
  assert.equal(result.groups.length, 2);
  for (const group of result.groups) {
    assert.equal(group.findings.every((finding) => finding.group_id === group.id), true);
  }
  const regroups = groupDatasetFindings([...result.findings].reverse());
  assert.deepEqual(
    regroups.map((group) => group.id).sort(),
    result.groups.map((group) => group.id).sort(),
  );
});

test("grouped data-quality findings remain visible when no temporal comparison exists", () => {
  const rows = [obs("Maize", "Nyagatare", "Season A", 2024, "production", 450)];
  const result = analyzeDatasetFindings(rows);
  assert.equal(result.groups.length, 1);
  const group = result.groups[0];
  assert.equal(group.validation_status, "insufficient_comparable_evidence");
  assert.equal(group.findings[0].finding_type, "data_quality");
  assert.equal(group.current_period, "2024 Season A");
});

test("a provisional source release marks the comparison provisional", () => {
  const rows = [
    obs("Maize", "Kirehe", "Season A", 2023, "production", 5000, {
      dataset_id: "nisr-sas-2023-annual",
      dataset_name: "NISR SAS 2023 · Annual tables",
    }),
    obs("Maize", "Kirehe", "Season A", 2024, "production", 3000, {
      dataset_id: "nisr-sas-2026-a",
      dataset_name: "NISR SAS 2026 · Season A",
    }),
  ];
  const datasets = [
    { id: "nisr-sas-2023-annual", quality_status: "verified" },
    { id: "nisr-sas-2026-a", quality_status: "provisional" },
  ];
  const finding = detectDatasetFindings(rows, { datasets })[0];
  assert.equal(finding.validation_status, "source_provisional");
  assert.match(finding.validation_label, /Provisional/i);
});

test("the engine records coverage so missing data stays visible", () => {
  const rows = [
    obs("Maize", "Kirehe", "Season A", 2024, "production", 1000),
    obs("Maize", "Kirehe", "Season A", 2024, "harvested_area", null, { observation_status: "missing" }),
    obs("Maize", "Kirehe", "Season B", 2025, "production", 1000),
  ];
  const result = analyzeDatasetFindings(rows);
  assert.equal(result.stats.series, 2);
  assert.equal(result.stats.missingBaseline, 2);
  assert.equal(result.stats.observations, 3);
  assert.ok(result.stats.usedObservations >= 2);
  assert.equal(result.stats.excluded.invalidGeography, 0);
});

test("an all-zero current year is reported as observed zero, not as an incident", () => {
  const rows = [
    obs("Wheat", "Gasabo", "Season A", 2024, "production", 110),
    obs("Wheat", "Gasabo", "Season A", 2024, "harvested_area", 100),
    obs("Wheat", "Gasabo", "Season A", 2025, "production", 0),
    obs("Wheat", "Gasabo", "Season A", 2025, "harvested_area", 0),
  ];
  const result = analyzeDatasetFindings(rows);
  assert.ok(result.findings.length >= 2);
  assert.equal(result.findings.every((finding) => finding.validation_status === "observed_zero"), true);
  assert.equal(result.groups[0].has_zero_current, true);
  assert.equal(result.groups[0].findings.some((finding) => finding.indicator === "yield"), false, "yield is undefined when area is zero");
});
