import { ALERT_RULES, MAIN_CROPS } from "./constants.js";
import { computeYield, toNumber } from "./metrics.js";

/**
 * Field-operations finding engine.
 *
 * The engine never invents a value. It compares only observations that share
 * the same crop, district and agricultural season, in immediately adjacent
 * calendar years, with compatible units, and a present, non-zero baseline for
 * any percentage calculation. Missing cells stay missing; an observed zero is
 * retained as an observed zero and is never described as a total loss.
 *
 * A statistical anomaly is a review signal, not a confirmed agricultural
 * incident. Every finding keeps both source records and the calculation used.
 */

export const FINDING_RULE = Object.freeze({
  id: "YOY-CHANGE",
  version: 2,
  reviewThresholdPct: 15,
  priorityThresholdPct: 30,
  materiality: Object.freeze({ production: 50, harvested_area: 25, yield: 0.08 }),
  cooldown:
    "One condition per crop, district, season and current year. Related production, area and yield signals are grouped into that condition.",
});

export const FINDING_VALIDATION = Object.freeze({
  source_validated: {
    label: "Source values validated · field verification pending",
    short: "Source validated",
    description:
      "Both published source values are present, compatible and from identified NISR tables. The anomaly itself has not been verified in the field.",
  },
  source_provisional: {
    label: "Provisional source · verify before relying on it",
    short: "Provisional source",
    description:
      "At least one source release is marked provisional. The figures may be revised by the publisher.",
  },
  insufficient_comparable_evidence: {
    label: "Insufficient comparable evidence",
    short: "Insufficient evidence",
    description:
      "A complete, compatible current and baseline pair is not available, so no percentage change is calculated.",
  },
  conflicting_source: {
    label: "Conflicting source records",
    short: "Source conflict",
    description:
      "More than one published value exists for the same crop, district, season, year and indicator. The engine does not choose between them.",
  },
  invalid_unit: {
    label: "Incompatible unit",
    short: "Unit mismatch",
    description:
      "The source unit is not compatible with the indicator. No comparison is calculated.",
  },
  observed_zero: {
    label: "Observed zero · verify whether nothing was grown or nothing was recorded",
    short: "Observed zero",
    description:
      "The published current value is a real zero in the source table. It does not by itself prove a total production loss.",
  },
});

const EXPECTED_UNITS = Object.freeze({
  production: ["metric tonnes", "tonnes", "t"],
  harvested_area: ["hectares", "ha"],
  yield: ["tonnes per hectare", "t/ha"],
});

const METRIC_LABEL = Object.freeze({
  production: "production",
  harvested_area: "harvested area",
  yield: "yield",
});

const VALIDATION_RANK = Object.freeze({
  conflicting_source: 0,
  invalid_unit: 1,
  insufficient_comparable_evidence: 2,
  source_provisional: 3,
  observed_zero: 4,
  source_validated: 5,
});

const isDemoRow = (row) => row?.is_demo === true;
const slug = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const datasetMap = (datasets) => {
  if (!datasets) return new Map();
  if (datasets instanceof Map) return datasets;
  const entries = Array.isArray(datasets) ? datasets : Object.values(datasets);
  return new Map(entries.filter(Boolean).map((item) => [item.id, item]));
};

const datasetQuality = (datasets, id) => {
  const item = datasets.get(id);
  return item?.quality_status ?? item?.qualityStatus ?? "unknown";
};

function normalizeUnit(unit) {
  return typeof unit === "string" ? unit.trim().toLowerCase() : "";
}

function unitIsCompatible(indicator, unit) {
  const accepted = EXPECTED_UNITS[indicator];
  if (!accepted) return false;
  return accepted.includes(normalizeUnit(unit));
}

function sourceOf(row) {
  if (!row) return null;
  return {
    observation_id: row.id ?? null,
    dataset_id: row.dataset_id ?? null,
    dataset_name: row.dataset_name ?? row.datasetName ?? null,
    source_publisher: row.source_publisher ?? null,
    source_organization: row.source_organization ?? null,
    source_reference: row.source_reference ?? null,
    source_cell: row.source_cell ?? null,
    source_sheet: row.source_sheet ?? null,
    source_url: row.source_url ?? null,
    source_value: row.source_value ?? null,
    observation_status: row.observation_status ?? null,
    quality_status: row.quality_status ?? null,
    quality_flags: Array.isArray(row.quality_flags) ? row.quality_flags : [],
    unit: row.unit ?? null,
    period: row.period ?? null,
  };
}

function rowIdentity(row) {
  return [row.id, row.dataset_id, row.value, row.unit, row.source_reference].join("|");
}

/**
 * Normalize the metric rows once. Demo rows are deliberately excluded from
 * official detection: demonstration and official evidence must never mix.
 */
function normalizeObservations(observations, { crop, district } = {}) {
  const rows = [];
  const excluded = { demo: 0, nonCrop: 0, nonMain: 0, invalidYear: 0, invalidGeography: 0, unsupportedIndicator: 0 };

  for (const row of observations ?? []) {
    if (!row || typeof row !== "object") continue;
    if (row.domain !== "crop") {
      excluded.nonCrop += 1;
      continue;
    }
    if (isDemoRow(row)) {
      excluded.demo += 1;
      continue;
    }
    if (row.aggregation_level && row.aggregation_level !== "main") {
      excluded.nonMain += 1;
      continue;
    }
    if (!row.crop || !row.geography || !row.season) {
      excluded.invalidGeography += 1;
      continue;
    }
    if (crop && row.crop !== crop) continue;
    if (district && row.geography !== district) continue;
    if (!["production", "harvested_area"].includes(row.indicator)) {
      excluded.unsupportedIndicator += 1;
      continue;
    }
    const year = Number(row.year);
    if (!Number.isInteger(year) || year < 1900 || year > 2200) {
      excluded.invalidYear += 1;
      continue;
    }
    rows.push({ ...row, year });
  }
  return { rows, excluded };
}

function dedupeMetric(rows, { indicator, year, crop, district, season, datasets }) {
  const validRows = rows.filter((row) => row.indicator === indicator);
  if (!validRows.length) return { state: "missing", reason: "no_record", rows: [] };

  const present = validRows.filter((row) => {
    const value = toNumber(row.value);
    return row.observation_status !== "missing" && value !== null && value >= 0;
  });
  const missingRows = validRows.filter((row) => !present.includes(row));

  if (!present.length) return { state: "missing", reason: "missing_value", rows: validRows, missingRows };

  const invalidUnit = present.filter((row) => !unitIsCompatible(indicator, row.unit));
  if (invalidUnit.length) {
    return { state: "invalid_unit", rows: invalidUnit, missingRows };
  }

  const distinct = new Map();
  for (const row of present) distinct.set(rowIdentity(row), row);
  const unique = [...distinct.values()];

  const values = new Set(unique.map((row) => Number(toNumber(row.value)).toFixed(6)));
  if (values.size > 1) {
    return {
      state: "conflict",
      rows: unique,
      values: unique.map((row) => ({ value: toNumber(row.value), source: sourceOf(row) })),
    };
  }

  const chosen = unique[0];
  const provisional =
    (chosen.observation_status && chosen.observation_status !== "observed") ||
    ["provisional", "estimated", "forecast"].includes(String(datasetQuality(datasets, chosen.dataset_id)).toLowerCase());

  return {
    state: "present",
    value: toNumber(chosen.value),
    row: chosen,
    duplicateCount: unique.length - 1,
    provisional,
    missingRows,
  };
}

function buildSeries(rows, datasets) {
  const series = new Map();
  for (const row of rows) {
    const key = [row.crop, row.geography, row.season].join("|");
    if (!series.has(key)) {
      series.set(key, { key, crop: row.crop, district: row.geography, season: row.season, years: new Map() });
    }
    const entry = series.get(key);
    if (!entry.years.has(row.year)) entry.years.set(row.year, []);
    entry.years.get(row.year).push(row);
  }

  for (const entry of series.values()) {
    for (const [year, yearRows] of entry.years) {
      const production = dedupeMetric(yearRows, {
        indicator: "production",
        year,
        crop: entry.crop,
        district: entry.district,
        season: entry.season,
        datasets,
      });
      const area = dedupeMetric(yearRows, {
        indicator: "harvested_area",
        year,
        crop: entry.crop,
        district: entry.district,
        season: entry.season,
        datasets,
      });
      entry.years.set(year, { year, production, area });
    }
  }
  return series;
}

function metricValues(year) {
  const production = year?.production?.state === "present" ? year.production.value : null;
  const area = year?.area?.state === "present" ? year.area.value : null;
  return {
    production,
    harvested_area: area,
    yield: computeYield(production, area),
  };
}

function validationFor(current, baseline, currentYear, baselineYear) {
  if (!current || !baseline) return "insufficient_comparable_evidence";
  if ([current, baseline].some((year) => year.production.state === "conflict" || year.area.state === "conflict")) {
    return "conflicting_source";
  }
  if ([current, baseline].some((year) => year.production.state === "invalid_unit" || year.area.state === "invalid_unit")) {
    return "invalid_unit";
  }
  const provisional = [current, baseline].some(
    (year) => year.production.provisional || year.area.provisional,
  );
  if (provisional) return "source_provisional";
  if (currentYear == null || baselineYear == null || baselineYear !== currentYear - 1) {
    return "insufficient_comparable_evidence";
  }
  const lineageAvailable = [current, baseline].every((year) =>
    [year.production, year.area]
      .filter((metric) => metric.state === "present")
      .every((metric) => Boolean(metric.row?.dataset_id && metric.row?.source_reference)),
  );
  if (!lineageAvailable) return "insufficient_comparable_evidence";
  return "source_validated";
}

function findingId(parts) {
  return `finding-v2-${parts.map(slug).join("-")}`;
}

function conditionId({ district, crop, season, year }) {
  return `condition-${slug(district)}-${slug(crop)}-${slug(season)}-${year}`;
}

function periodLabel(year, season) {
  return `${year} ${season}`;
}

function formatChange(value, unit, digits = 2) {
  return `${value >= 0 ? "+" : ""}${Number(value).toFixed(digits)} ${unit}`;
}

function buildTemporalFinding({ metric, currentValues, baselineValues, current, baseline, currentYear, baselineYear, season, crop, district, validation }) {
  // Number(null) is 0, so a missing derived yield must be rejected explicitly.
  const currentValue = toNumber(currentValues[metric]);
  const baselineValue = toNumber(baselineValues[metric]);
  if (currentValue === null || baselineValue === null) return null;

  const diff = currentValue - baselineValue;
  if (Math.abs(diff) < (FINDING_RULE.materiality[metric] ?? 0)) return null;

  const zeroBaseline = baselineValue === 0;
  const pct = zeroBaseline ? null : (diff / baselineValue) * 100;
  if (!zeroBaseline && (pct === null || Math.abs(pct) < FINDING_RULE.reviewThresholdPct)) return null;
  if (zeroBaseline && diff === 0) return null;

  const isDecline = diff < 0;
  const zeroCurrent = currentValue === 0;
  const priority = zeroBaseline
    ? "review"
    : Math.abs(pct) >= FINDING_RULE.priorityThresholdPct
      ? "priority"
      : "review";

  const unit = metric === "yield" ? "t/ha" : metric === "production" ? "tonnes" : "hectares";
  const digits = metric === "yield" ? 2 : 2;
  const currentPeriod = periodLabel(currentYear, season);
  const baselinePeriod = periodLabel(baselineYear, season);
  const dataType = metric === "yield" ? "derived yield (production ÷ harvested area)" : `published ${METRIC_LABEL[metric]}`;

  let title;
  if (zeroCurrent) {
    title = `${crop} ${METRIC_LABEL[metric]} reported at zero in ${district} (${currentPeriod} vs ${baselinePeriod})`;
  } else if (zeroBaseline) {
    title = `${crop} ${METRIC_LABEL[metric]} recorded above a zero baseline in ${district} (${currentPeriod})`;
  } else {
    title = `${crop} ${METRIC_LABEL[metric]} ${isDecline ? "decline" : "increase"} of ${Math.abs(pct).toFixed(1)}% in ${district} (${currentPeriod} vs ${baselinePeriod})`;
  }

  const validationStatus = zeroCurrent ? "observed_zero" : validation;
  const validationMeta = FINDING_VALIDATION[validationStatus] ?? FINDING_VALIDATION.insufficient_comparable_evidence;

  const stateKey = metric === "production" ? "production" : "area";

  const calculation =
    metric === "yield"
      ? `${currentPeriod}: ${current.production.value} t ÷ ${current.area.value} ha = ${currentValue.toFixed(2)} t/ha. ` +
        `${baselinePeriod}: ${baseline.production.value} t ÷ ${baseline.area.value} ha = ${baselineValue.toFixed(2)} t/ha. ` +
        `Difference = ${formatChange(diff, "t/ha", 2)}.`
      : zeroBaseline
        ? `Baseline is zero, so a percentage change is undefined. Absolute change = ${currentValue.toFixed(2)} − 0 = ${formatChange(diff, unit, digits)}.`
        : `Difference = ${currentValue.toFixed(2)} − ${baselineValue.toFixed(2)} = ${formatChange(diff, unit, digits)}. ` +
          `Percentage change = (${diff.toFixed(2)} ÷ ${baselineValue.toFixed(2)}) × 100 = ${pct.toFixed(1)}%.`;

  const evidenceLimitations = [
    "Published district aggregates are compared, not individual farms.",
    "A statistical change does not establish cause, loss or an official incident.",
    "Survey coverage, revisions, mixed cropping and reporting practice can affect the figures.",
    zeroCurrent
      ? "A zero may mean no crop was grown, no harvest was recorded, or the season was outside the survey scope. Field verification is required."
      : "Field verification is required before treating this as an operational problem.",
  ].join(" ");

  const currentSource = sourceOf(metric === "yield" ? current.production.row : current[stateKey].row);
  const baselineSource = sourceOf(metric === "yield" ? baseline.production.row : baseline[stateKey].row);
  const id = findingId(["temporal", district, crop, season, currentYear, metric]);

  return {
    id,
    rule_id: FINDING_RULE.id,
    rule_version: FINDING_RULE.version,
    finding_type: "temporal_comparison",
    condition_type: "temporal",
    title,
    short_title: `${crop} · ${METRIC_LABEL[metric]} · ${district}`,
    summary: zeroCurrent
      ? `${dataType} is an observed zero in ${currentPeriod}; baseline ${baselineValue.toFixed(2)} ${unit} in ${baselinePeriod}.`
      : `${dataType} changed by ${formatChange(diff, unit, digits)} (${zeroBaseline ? "percentage not calculable" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}) between ${baselinePeriod} and ${currentPeriod}.`,
    crop,
    district,
    season,
    indicator: metric,
    unit,
    current_period: currentPeriod,
    baseline_period: baselinePeriod,
    previous_period: baselinePeriod,
    current_value: Number(currentValue.toFixed(metric === "yield" ? 4 : 2)),
    previous_value: Number(baselineValue.toFixed(metric === "yield" ? 4 : 2)),
    baseline_value: Number(baselineValue.toFixed(metric === "yield" ? 4 : 2)),
    absolute_change: Number(diff.toFixed(metric === "yield" ? 4 : 2)),
    percentage_change: pct === null ? null : Number(pct.toFixed(2)),
    comparison_state: zeroBaseline ? "zero_baseline" : "calculable",
    priority,
    severity: priority === "priority" ? "priority" : "review",
    is_decline: isDecline,
    isDecline,
    is_main_crop: MAIN_CROPS.includes(crop),
    isMainCrop: MAIN_CROPS.includes(crop),
    zero_current: zeroCurrent,
    validation_status: validationStatus,
    validation_label: validationMeta.label,
    validation_short: validationMeta.short,
    validation_description: validationMeta.description,
    requires_field_verification: true,
    calculation_method:
      metric === "yield"
        ? "Derived yield = production ÷ harvested area, using matching year, crop, district, season and release."
        : "Percentage change = (current − baseline) ÷ baseline × 100; only calculated when the baseline is present and greater than zero.",
    calculation_used: calculation,
    calculation_text: calculation,
    evidence_limitations: evidenceLimitations,
    source_reference: currentSource?.source_reference ?? null,
    source_publisher: currentSource?.source_publisher ?? null,
    source_organization: currentSource?.source_organization ?? currentSource?.source_publisher ?? null,
    dataset_id: currentSource?.dataset_id ?? "",
    dataset_name: currentSource?.dataset_name ?? null,
    source: { current: currentSource, baseline: baselineSource },
    current_source: currentSource,
    baseline_source: baselineSource,
    evidence_snapshot: JSON.stringify({
      schema_version: 2,
      type: "temporal_comparison",
      rule_id: FINDING_RULE.id,
      rule_version: FINDING_RULE.version,
      crop,
      district,
      season,
      indicator: metric,
      unit,
      current_period: currentPeriod,
      baseline_period: baselinePeriod,
      current_value: currentValue,
      baseline_value: baselineValue,
      absolute_change: diff,
      percentage_change: pct,
      comparison_state: zeroBaseline ? "zero_baseline" : "calculable",
      validation_status: validationStatus,
      current_source: currentSource,
      baseline_source: baselineSource,
      limitations: evidenceLimitations,
    }),
    group_id: conditionId({ district, crop, season, year: currentYear }),
    current_year: currentYear,
    baseline_year: baselineYear,
    quality_status: validationMeta.label,
    quality_status_legacy: "Statistical anomaly requiring verification",
  };
}

function buildDataQualityFindings({ series }) {
  const findings = [];

  for (const entry of series.values()) {
    for (const [year, metrics] of entry.years) {
      const condition = conditionId({ district: entry.district, crop: entry.crop, season: entry.season, year });
      const period = periodLabel(year, entry.season);
      const production = metrics.production;
      const area = metrics.area;

      // Two different published values for the same cell: never choose one.
      for (const [indicator, state] of [
        ["production", production],
        ["harvested_area", area],
      ]) {
        if (state.state !== "conflict") continue;
        const id = findingId(["conflict", entry.district, entry.crop, entry.season, year, indicator]);
        findings.push({
          id,
          rule_id: "SOURCE-CONFLICT",
          rule_version: 1,
          finding_type: "data_quality",
          condition_type: "source_conflict",
          issue: "conflicting_observations",
          title: `Conflicting ${METRIC_LABEL[indicator]} records for ${entry.crop} in ${entry.district} (${period})`,
          short_title: `${entry.crop} · conflicting ${METRIC_LABEL[indicator]} · ${entry.district}`,
          summary: `${state.values.length} published values disagree for the same crop, district, season, year and indicator. No comparison is calculated until the source is reconciled.`,
          crop: entry.crop,
          district: entry.district,
          season: entry.season,
          indicator,
          unit: indicator === "production" ? "tonnes" : "hectares",
          current_period: period,
          baseline_period: "",
          current_value: null,
          previous_value: null,
          baseline_value: null,
          absolute_change: null,
          percentage_change: null,
          comparison_state: "not_comparable",
          priority: "review",
          severity: "review",
          is_decline: false,
          isDecline: false,
          is_main_crop: MAIN_CROPS.includes(entry.crop),
          isMainCrop: MAIN_CROPS.includes(entry.crop),
          validation_status: "conflicting_source",
          validation_label: FINDING_VALIDATION.conflicting_source.label,
          validation_short: FINDING_VALIDATION.conflicting_source.short,
          requires_field_verification: true,
          calculation_method: "No calculation. Conflicting source values are retained for manual reconciliation.",
          calculation_used: state.values
            .map((item) => `${item.value} ${item.source.unit ?? ""} (${item.source.source_reference ?? "source"})`)
            .join("; "),
          evidence_limitations: "The application does not choose between contradictory published values.",
          source_reference: state.values[0]?.source?.source_reference ?? "",
          source_publisher: "National Institute of Statistics of Rwanda (NISR)",
          dataset_id: state.values[0]?.source?.dataset_id ?? "",
          dataset_name: state.values[0]?.source?.dataset_name ?? "NISR Seasonal Agricultural Survey",
          source: { conflicting: state.values.map((item) => item.source) },
          group_id: condition,
          current_year: year,
          baseline_year: null,
          quality_status: FINDING_VALIDATION.conflicting_source.label,
        });
      }

      // Invalid units block comparison.
      for (const [indicator, state] of [
        ["production", production],
        ["harvested_area", area],
      ]) {
        if (state.state !== "invalid_unit") continue;
        const id = findingId(["unit", entry.district, entry.crop, entry.season, year, indicator]);
        findings.push({
          id,
          rule_id: "UNIT-CHECK",
          rule_version: 1,
          finding_type: "data_quality",
          condition_type: "unit_mismatch",
          issue: "invalid_unit",
          title: `${entry.crop} ${METRIC_LABEL[indicator]} uses an incompatible unit in ${entry.district} (${period})`,
          short_title: `${entry.crop} · unit mismatch · ${entry.district}`,
          summary: `The source unit cannot be compared with ${EXPECTED_UNITS[indicator].join(" or ")}. No change is calculated.`,
          crop: entry.crop,
          district: entry.district,
          season: entry.season,
          indicator,
          unit: state.rows[0]?.unit ?? "",
          current_period: period,
          baseline_period: "",
          current_value: toNumber(state.rows[0]?.value),
          previous_value: null,
          baseline_value: null,
          absolute_change: null,
          percentage_change: null,
          comparison_state: "not_comparable",
          priority: "review",
          severity: "review",
          is_decline: false,
          isDecline: false,
          is_main_crop: MAIN_CROPS.includes(entry.crop),
          isMainCrop: MAIN_CROPS.includes(entry.crop),
          validation_status: "invalid_unit",
          validation_label: FINDING_VALIDATION.invalid_unit.label,
          validation_short: FINDING_VALIDATION.invalid_unit.short,
          requires_field_verification: true,
          calculation_method: "No calculation. Convert the source unit before importing.",
          calculation_used: `Source unit: ${state.rows[0]?.unit ?? "missing"}. Expected: ${EXPECTED_UNITS[indicator].join(" or ")}.`,
          evidence_limitations: "Unit conversion is not performed automatically.",
          source_reference: state.rows[0]?.source_reference ?? "",
          source_publisher: "National Institute of Statistics of Rwanda (NISR)",
          dataset_id: state.rows[0]?.dataset_id ?? "",
          dataset_name: state.rows[0]?.dataset_name ?? "NISR Seasonal Agricultural Survey",
          source: { current: sourceOf(state.rows[0]) },
          group_id: condition,
          current_year: year,
          baseline_year: null,
          quality_status: FINDING_VALIDATION.invalid_unit.label,
        });
      }

      // Production published without a usable harvested area.
      const productionValue = production.state === "present" ? production.value : null;
      const areaValue = area.state === "present" ? area.value : null;
      if (
        productionValue !== null &&
        productionValue >= FINDING_RULE.materiality.production &&
        area.state === "missing"
      ) {
        const id = findingId(["coverage", entry.district, entry.crop, entry.season, year, "harvested_area"]);
        const areaMissing = true;
        findings.push({
          id,
          rule_id: "COVERAGE-GAP",
          rule_version: 1,
          finding_type: "data_quality",
          condition_type: "coverage_gap",
          issue: areaMissing ? "missing_harvested_area" : "unusable_harvested_area",
          title: `${entry.crop} production (${productionValue.toFixed(1)} t) published without a usable harvested area in ${entry.district} (${period})`,
          short_title: `${entry.crop} · harvested area unavailable · ${entry.district}`,
          summary: `Production is present in the source. Harvested area is ${areaMissing ? "not published" : "not usable"}, so yield cannot be derived and no area change is calculated.`,
          crop: entry.crop,
          district: entry.district,
          season: entry.season,
          indicator: "harvested_area",
          unit: "hectares",
          current_period: period,
          baseline_period: "",
          current_value: Number(productionValue.toFixed(2)),
          previous_value: null,
          baseline_value: null,
          absolute_change: null,
          percentage_change: null,
          comparison_state: "not_comparable",
          priority: "review",
          severity: "review",
          is_decline: false,
          isDecline: false,
          is_main_crop: MAIN_CROPS.includes(entry.crop),
          isMainCrop: MAIN_CROPS.includes(entry.crop),
          validation_status: "insufficient_comparable_evidence",
          validation_label: FINDING_VALIDATION.insufficient_comparable_evidence.label,
          validation_short: FINDING_VALIDATION.insufficient_comparable_evidence.short,
          requires_field_verification: true,
          calculation_method: "Derived yield requires both production and a positive harvested area from the same period.",
          calculation_used: `Production = ${productionValue.toFixed(2)} t. Harvested area = ${areaMissing ? "missing (not zero)" : "unavailable"}. Yield is not calculable.`,
          evidence_limitations: "A missing area is not zero and is not treated as zero.",
          source_reference: production.row?.source_reference ?? "",
          source_publisher: "National Institute of Statistics of Rwanda (NISR)",
          dataset_id: production.row?.dataset_id ?? "",
          dataset_name: production.row?.dataset_name ?? "NISR Seasonal Agricultural Survey",
          source: { current: sourceOf(production.row), missing: sourceOf(area.missingRows?.[0]) },
          group_id: condition,
          current_year: year,
          baseline_year: null,
          quality_status: FINDING_VALIDATION.insufficient_comparable_evidence.label,
        });
      }

      // Production and area contradict each other (one positive, one zero).
      if (productionValue !== null && areaValue !== null) {
        const contradictory =
          (productionValue > FINDING_RULE.materiality.production && areaValue === 0) ||
          (areaValue > FINDING_RULE.materiality.harvested_area && productionValue === 0);
        if (contradictory) {
          const id = findingId(["inconsistent", entry.district, entry.crop, entry.season, year]);
          findings.push({
            id,
            rule_id: "INTERNAL-CONSISTENCY",
            rule_version: 1,
            finding_type: "data_quality",
            condition_type: "record_inconsistency",
            issue: "production_area_inconsistency",
            title: `Production and harvested area disagree for ${entry.crop} in ${entry.district} (${period})`,
            short_title: `${entry.crop} · production/area inconsistency · ${entry.district}`,
            summary: `Production is ${productionValue.toFixed(2)} t and harvested area is ${areaValue.toFixed(2)} ha. One of the two published cells needs source verification.`,
            crop: entry.crop,
            district: entry.district,
            season: entry.season,
            indicator: "harvested_area",
            unit: "hectares",
            current_period: period,
            baseline_period: "",
            current_value: Number(areaValue.toFixed(2)),
            previous_value: null,
            baseline_value: null,
            absolute_change: null,
            percentage_change: null,
            comparison_state: "not_comparable",
            priority: "review",
            severity: "review",
            is_decline: false,
            isDecline: false,
            is_main_crop: MAIN_CROPS.includes(entry.crop),
            isMainCrop: MAIN_CROPS.includes(entry.crop),
            validation_status: "insufficient_comparable_evidence",
            validation_label: FINDING_VALIDATION.insufficient_comparable_evidence.label,
            validation_short: FINDING_VALIDATION.insufficient_comparable_evidence.short,
            requires_field_verification: true,
            calculation_method: "No comparison. The two published measures are internally contradictory.",
            calculation_used: `Production = ${productionValue.toFixed(2)} t; harvested area = ${areaValue.toFixed(2)} ha.`,
            evidence_limitations: "The application does not overwrite either source value.",
            source_reference: production.row?.source_reference ?? "",
            source_publisher: "National Institute of Statistics of Rwanda (NISR)",
            dataset_id: production.row?.dataset_id ?? "",
            dataset_name: production.row?.dataset_name ?? "NISR Seasonal Agricultural Survey",
            source: { production: sourceOf(production.row), harvested_area: sourceOf(area.row) },
            group_id: condition,
            current_year: year,
            baseline_year: null,
            quality_status: FINDING_VALIDATION.insufficient_comparable_evidence.label,
          });
        }
      }
    }
  }

  return findings;
}

export function groupDatasetFindings(findings) {
  const groups = new Map();
  for (const finding of findings ?? []) {
    const key = finding.group_id ?? conditionId({ ...finding, year: finding.current_year });
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        district: finding.district,
        crop: finding.crop,
        season: finding.season,
        current_period: finding.current_period,
        baseline_period: finding.baseline_period,
        current_year: finding.current_year,
        baseline_year: finding.baseline_year,
        findings: [],
      });
    }
    groups.get(key).findings.push(finding);
  }

  return [...groups.values()]
    .map((group) => {
      const findings = [...group.findings].sort((a, b) => {
        const priority = { priority: 0, review: 1, info: 2 };
        return (priority[a.priority] ?? 3) - (priority[b.priority] ?? 3) || String(a.indicator).localeCompare(String(b.indicator));
      });
      const primary = findings.find((item) => item.finding_type === "temporal_comparison") ?? findings[0];
      const validationStatus = findings
        .map((item) => item.validation_status)
        .sort((a, b) => (VALIDATION_RANK[a] ?? 9) - (VALIDATION_RANK[b] ?? 9))[0];
      const priority = findings.some((item) => item.priority === "priority") ? "priority" : "review";
      const indicatorRank = { production: 0, harvested_area: 1, yield: 2 };
      const indicators = [...new Set(findings.map((item) => item.indicator))].sort(
        (a, b) => (indicatorRank[a] ?? 9) - (indicatorRank[b] ?? 9),
      );
      const hasZero = findings.some((item) => item.zero_current);
      const allDecline = findings.filter((item) => item.finding_type === "temporal_comparison").every((item) => item.is_decline);
      const changes = findings
        .filter((item) => item.finding_type === "temporal_comparison" && Number.isFinite(item.percentage_change))
        .map((item) => Math.abs(item.percentage_change));
      const magnitude = changes.length ? Math.max(...changes) : 0;
      const indicatorLabel = (indicator) =>
        indicator === "production" ? "production" : indicator === "harvested_area" ? "harvested area" : "yield";
      const label = indicators.map(indicatorLabel);
      const labelText =
        label.length <= 1
          ? label[0] ?? "measure"
          : `${label.slice(0, -1).join(", ")} and ${label[label.length - 1]}`;
      const title = hasZero
        ? `${group.crop} ${labelText} reported at zero in ${group.district} (${group.current_period})`
        : findings.length > 1 && findings.every((item) => item.finding_type === "temporal_comparison")
          ? `${group.crop} ${labelText} ${allDecline ? "declined" : "changed"} in ${group.district} (${group.current_period} vs ${group.baseline_period})`
          : primary.title;
      return {
        ...group,
        id: group.id,
        title,
        summary: primary.summary,
        primary_finding: primary,
        priority,
        severity: priority,
        validation_status: validationStatus,
        validation_label: FINDING_VALIDATION[validationStatus]?.label ?? FINDING_VALIDATION.insufficient_comparable_evidence.label,
        validation_short: FINDING_VALIDATION[validationStatus]?.short ?? "Insufficient evidence",
        indicators,
        source_references: [...new Set(findings.map((item) => item.source_reference).filter(Boolean))],
        dataset_names: [...new Set(findings.map((item) => item.dataset_name).filter(Boolean))],
        current_values: findings.map((item) => ({
          indicator: item.indicator,
          value: item.current_value,
          baseline: item.baseline_value,
          unit: item.unit,
          change: item.percentage_change,
          absolute_change: item.absolute_change,
          zero_current: Boolean(item.zero_current),
        })),
        magnitude,
        is_decline: allDecline,
        has_zero_current: hasZero,
        is_main_crop: findings.some((item) => item.is_main_crop),
        requires_field_verification: true,
        signal_count: findings.length,
      };
    })
    .sort((a, b) => {
      const priority = { priority: 0, review: 1 };
      return (
        (priority[a.priority] ?? 2) - (priority[b.priority] ?? 2) ||
        Number(b.is_main_crop) - Number(a.is_main_crop) ||
        b.magnitude - a.magnitude ||
        String(b.current_period).localeCompare(String(a.current_period)) ||
        a.district.localeCompare(b.district) ||
        a.crop.localeCompare(b.crop)
      );
    });
}

/**
 * Analyze published observation rows. Returns flat findings, grouped conditions
 * and explicit coverage statistics so missing data is visible without becoming
 * a fabricated finding.
 */
export function analyzeDatasetFindings(observations, options = {}) {
  const { rows, excluded } = normalizeObservations(observations, options);
  const datasets = datasetMap(options.datasets);
  const series = buildSeries(rows, datasets);
  const findings = [];
  const coverage = {
    observations: observations?.length ?? 0,
    usedObservations: rows.length,
    series: 0,
    comparableSeries: 0,
    missingCurrent: 0,
    missingBaseline: 0,
    zeroBaselineSeries: 0,
    observedZeroSeries: 0,
    provisionalSeries: 0,
  };

  for (const entry of series.values()) {
    coverage.series += 1;
    const years = [...entry.years.keys()].sort((a, b) => a - b);
    if (!years.length) continue;
    const currentYear = years[years.length - 1];
    const baselineYear = currentYear - 1;
    const current = entry.years.get(currentYear);
    const baseline = entry.years.get(baselineYear);

    if (!current || (current.production.state !== "present" && current.area.state !== "present")) {
      coverage.missingCurrent += 1;
      continue;
    }
    if (!baseline) {
      coverage.missingBaseline += 1;
    }

    const hasBaseline = Boolean(baseline);
    if (hasBaseline) coverage.comparableSeries += 1;
    if (current.production.value === 0 || current.area.value === 0) coverage.observedZeroSeries += 1;
    if (baseline && (baseline.production.value === 0 || baseline.area.value === 0)) {
      coverage.zeroBaselineSeries += 1;
    }
    const validation = validationFor(current, baseline, currentYear, baselineYear);
    if (validation === "source_provisional") coverage.provisionalSeries += 1;

    const currentValues = metricValues(current);
    const baselineValues = baseline ? metricValues(baseline) : { production: null, harvested_area: null, yield: null };

    for (const metric of ["production", "harvested_area", "yield"]) {
      if (!baseline) continue;
      const finding = buildTemporalFinding({
        metric,
        currentValues,
        baselineValues,
        current,
        baseline,
        currentYear,
        baselineYear,
        season: entry.season,
        crop: entry.crop,
        district: entry.district,
        validation,
        datasets,
      });
      if (finding) findings.push(finding);
    }
  }

  findings.push(...buildDataQualityFindings({ series }));
  const groups = groupDatasetFindings(findings);

  return {
    findings,
    groups,
    stats: {
      ...coverage,
      findings: findings.length,
      conditions: groups.length,
      excluded,
      rule: FINDING_RULE,
    },
  };
}

/** Backwards-compatible flat list used by existing callers and tests. */
export function detectDatasetFindings(observations, options = {}) {
  return analyzeDatasetFindings(observations, options).findings;
}

function includesText(value, term) {
  return String(value ?? "").toLowerCase().includes(term);
}

/**
 * Pure query layer used by the authenticated server function. It never
 * re-derives or alters a finding; it only filters, orders and paginates the
 * grouped conditions produced by the analysis.
 */
export function paginateDatasetFindings(analysis, query = {}, investigations = []) {
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 50);
  const requestedPage = Math.max(Number(query.page) || 1, 1);
  const term = String(query.search ?? "").trim().toLowerCase();
  const cases = new Map();
  for (const item of investigations ?? []) {
    if (item?.finding_group_id && !cases.has(item.finding_group_id)) cases.set(item.finding_group_id, item);
  }

  const allGroups = analysis?.groups ?? [];
  const filters = {
    crops: [...new Set(allGroups.map((group) => group.crop).filter(Boolean))].sort(),
    districts: [...new Set(allGroups.map((group) => group.district).filter(Boolean))].sort(),
    seasons: [...new Set(allGroups.map((group) => group.season).filter(Boolean))].sort(),
    validations: [...new Set(allGroups.map((group) => group.validation_status).filter(Boolean))].sort(),
    priorities: ["priority", "review"],
    classifications: ["temporal", "data_quality"],
  };

  const filtered = allGroups.filter((group) => {
    if (query.crop && query.crop !== "all" && group.crop !== query.crop) return false;
    if (query.district && query.district !== "all" && group.district !== query.district) return false;
    if (query.season && query.season !== "all" && group.season !== query.season) return false;
    if (query.year && query.year !== "all" && Number(group.current_year) !== Number(query.year)) return false;
    if (query.priority && query.priority !== "all" && group.priority !== query.priority) return false;
    if (query.validation && query.validation !== "all" && group.validation_status !== query.validation) return false;
    if (query.indicator && query.indicator !== "all" && !group.indicators.includes(query.indicator)) return false;
    if (query.classification && query.classification !== "all") {
      const temporal = group.findings.some((finding) => finding.finding_type === "temporal_comparison");
      if (query.classification === "temporal" && !temporal) return false;
      if (query.classification === "data_quality" && temporal) return false;
    }
    if (term) {
      const haystack = [group.title, group.crop, group.district, group.season, group.current_period, ...group.indicators];
      if (!haystack.some((value) => includesText(value, term))) return false;
    }
    return true;
  });

  const sort = ["priority", "magnitude", "recent", "district", "crop"].includes(query.sort) ? query.sort : "priority";
  const priorityRank = { priority: 0, review: 1 };
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "magnitude") return b.magnitude - a.magnitude || String(a.id).localeCompare(String(b.id));
    if (sort === "recent") {
      return (
        Number(b.current_year) - Number(a.current_year) ||
        String(b.current_period).localeCompare(String(a.current_period)) ||
        String(a.id).localeCompare(String(b.id))
      );
    }
    if (sort === "district") return a.district.localeCompare(b.district) || a.crop.localeCompare(b.crop);
    if (sort === "crop") return a.crop.localeCompare(b.crop) || a.district.localeCompare(b.district);
    return (
      (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2) ||
      Number(b.is_main_crop) - Number(a.is_main_crop) ||
      b.magnitude - a.magnitude ||
      String(b.current_period).localeCompare(String(a.current_period)) ||
      a.district.localeCompare(b.district) ||
      a.crop.localeCompare(b.crop)
    );
  });

  const pageCount = Math.max(Math.ceil(sorted.length / pageSize), 1);
  const page = Math.min(requestedPage, pageCount);
  const items = sorted.slice((page - 1) * pageSize, page * pageSize).map((group) => {
    const existing = cases.get(group.id);
    return {
      ...group,
      existing_investigation: existing
        ? { id: existing.id, title: existing.title, status: existing.status, review_status: existing.review_status }
        : null,
    };
  });

  const temporalGroups = allGroups.filter((group) =>
    group.findings.some((finding) => finding.finding_type === "temporal_comparison"),
  ).length;
  return {
    items,
    page,
    pageSize,
    pageCount,
    total: sorted.length,
    totalConditions: allGroups.length,
    stats: {
      ...(analysis?.stats ?? {}),
      priorityConditions: allGroups.filter((group) => group.priority === "priority").length,
      reviewConditions: allGroups.filter((group) => group.priority !== "priority").length,
      observedZeroConditions: allGroups.filter((group) => group.has_zero_current).length,
      temporalConditions: temporalGroups,
      dataQualityConditions: allGroups.length - temporalGroups,
      withExistingInvestigation: allGroups.filter((group) => cases.has(group.id)).length,
    },
    filters,
    rule: analysis?.stats?.rule ?? FINDING_RULE,
  };
}

/** Build the investigation prefill from one finding or a grouped condition. */export function investigationDraftFromFinding(finding) {
  if (!finding) throw new Error("A finding is required.");
  const isGroup = Array.isArray(finding.findings);
  const items = isGroup ? finding.findings : [finding];
  const primary = isGroup ? finding.primary_finding ?? items[0] : items[0];
  const isDataQuality = items.every((item) => item.finding_type === "data_quality");

  const indicatorList = [...new Set(items.map((item) => item.indicator))];
  const reasonParts = items.map((item) => item.summary || item.title).filter(Boolean);
  const sourceLines = items
    .map((item) => {
      const current = item.source?.current;
      const baseline = item.source?.baseline;
      const line = [
        item.indicator,
        item.current_period,
        item.current_value ?? "unavailable",
        item.unit,
        current?.source_reference ? `current: ${current.source_reference}` : "",
        baseline?.source_reference ? `baseline: ${baseline.source_reference}` : "",
      ].filter(Boolean);
      return `- ${line.join(" · ")}`;
    })
    .join("\n");

  return {
    title: finding.title ?? primary.title,
    reason: reasonParts.join(" "),
    crop: finding.crop ?? primary.crop,
    district: finding.district ?? primary.district,
    indicator: indicatorList.length === 1 ? indicatorList[0] : primary.indicator,
    period: finding.current_period ?? primary.current_period,
    priority: (finding.priority ?? primary.priority) === "priority" ? "elevated" : "standard",
    evidence: `${isDataQuality ? "Data-quality source check" : "Published statistical comparison"}:\n${sourceLines}`,
    questions: isDataQuality
      ? "1. Verify the original worksheet cell and its row/column definitions.\n2. Check whether the release is provisional and whether a revision exists.\n3. Record the source-check result, including missing cells."
      : `1. Did the source records use the same crop, district and season definitions in both periods?\n2. Was survey coverage, mixed cropping or an administrative boundary change reported?\n3. What did field officers observe for ${finding.crop} in ${finding.district}?\n4. Do climate estimates support further inquiry without assuming cause?`,
    finding_id: finding.id ?? primary.group_id,
    finding_group_id: finding.id ?? primary.group_id,
    finding_ids: items.map((item) => item.id),
    dataset_id: primary.dataset_id,
    dataset_name: primary.dataset_name,
    metric_snapshot: JSON.stringify({
      group_id: finding.id ?? primary.group_id,
      finding_ids: items.map((item) => item.id),
      signals: items.map((item) => ({
        indicator: item.indicator,
        current_period: item.current_period,
        baseline_period: item.baseline_period,
        current_value: item.current_value,
        baseline_value: item.baseline_value,
        unit: item.unit,
        percentage_change: item.percentage_change,
        validation_status: item.validation_status,
        source: item.source,
      })),
    }),
    calculation_snapshot: items.map((item) => item.calculation_used).filter(Boolean).join("\n"),
    source_snapshot: items.map((item) => item.evidence_snapshot).filter(Boolean),
    finding_validation_status: finding.validation_status ?? primary.validation_status,
  };
}

export const findingLabel = (status) => FINDING_VALIDATION[status]?.short ?? "Needs review";
export const findingValidation = (status) => FINDING_VALIDATION[status] ?? FINDING_VALIDATION.insufficient_comparable_evidence;
export const findingRule = ALERT_RULES.find((rule) => rule.id === FINDING_RULE.id) ?? null;
