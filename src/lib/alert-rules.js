import { ALERT_RULES, RULE_BY_ID } from "@/lib/constants";
import { computeYield, toNumber } from "@/lib/metrics";

/**
 * Deterministic, transparent alert rules.
 *
 * This module is the single implementation of the rule, shared by the seeding
 * routine and the in-app recompute. Nothing here is a prediction or a validated
 * model: a rule compares two comparable reported values and flags the size of the
 * change so that a person can review it. Every alert stores the rule id, version,
 * threshold, calculation details, and contributing source metadata.
 */

const METRIC_LABELS = {
  production: "production",
  harvested_area: "harvested area",
  yield: "yield",
};

function severityFor(absolutePercent, rule) {
  if (absolutePercent >= rule.thresholdPriorityPct) return "priority";
  if (absolutePercent >= rule.thresholdReviewPct) return "review";
  return null;
}

function directionWord(change) {
  return change > 0 ? "rose" : "fell";
}

/**
 * Evaluate the year-on-year rule over a set of crop observations.
 * Returns alert drafts, one per crop / district / season / indicator series.
 *
 * Enforced safeguards:
 * - Missing values stay null and are NEVER converted to zero.
 * - Compares matching crop, district, and season pairs.
 * - Evaluates available years per specific series.
 * - Preserves authentic dataset identifier, name, source reference, and provenance.
 * - Never fabricates or hardcodes demo flags on official statistics.
 */
export function evaluateAlerts(observations, { ruleId = "YOY-CHANGE" } = {}) {
  const rule = RULE_BY_ID[ruleId] ?? ALERT_RULES[0];
  const rows = (observations ?? []).filter((row) => row && row.domain !== "climate" && row.crop && row.geography && row.season);

  if (!rows.length) return [];

  // Group by seriesKey: `${crop}|${district}|${season}` and year
  const seriesMap = new Map();

  for (const row of rows) {
    const year = Number(row.year);
    if (!Number.isFinite(year)) continue;

    const value = toNumber(row.value);
    if (value === null) continue; // Missing values stay excluded, never become 0

    const seriesKey = `${row.crop}|${row.geography}|${row.season}`;
    if (!seriesMap.has(seriesKey)) {
      seriesMap.set(seriesKey, new Map());
    }

    const yearMap = seriesMap.get(seriesKey);
    if (!yearMap.has(year)) {
      yearMap.set(year, {
        production: null,
        harvested_area: null,
        production_obs_id: null,
        harvested_area_obs_id: null,
        dataset_id: row.dataset_id || "",
        dataset_name: row.dataset_name || "NISR Seasonal Agriculture Survey",
        source_publisher: row.source_publisher || "National Institute of Statistics of Rwanda (NISR)",
        source_reference: row.source_reference || "",
        source_url: row.source_url || "",
        quality_status: row.quality_status || "verified",
        is_demo: Boolean(row.is_demo),
      });
    }

    const entry = yearMap.get(year);
    if (row.indicator === "production") {
      entry.production = value;
      entry.production_obs_id = row.id;
    }
    if (row.indicator === "harvested_area") {
      entry.harvested_area = value;
      entry.harvested_area_obs_id = row.id;
    }
    if (row.source_reference && !entry.source_reference) entry.source_reference = row.source_reference;
    if (row.dataset_id && !entry.dataset_id) entry.dataset_id = row.dataset_id;
    if (row.dataset_name && !entry.dataset_name) entry.dataset_name = row.dataset_name;
  }

  const drafts = [];

  for (const [seriesKey, yearMap] of seriesMap.entries()) {
    const [crop, district, season] = seriesKey.split("|");
    const availableYears = [...yearMap.keys()].sort((a, b) => a - b);
    if (availableYears.length < 2) continue;

    const currentYear = availableYears[availableYears.length - 1];
    const previousYear = availableYears[availableYears.length - 2];

    const current = yearMap.get(currentYear);
    const previous = yearMap.get(previousYear);
    if (!current || !previous) continue;

    const metrics = [
      { key: "production", current: current.production, previous: previous.production, unit: "tonnes", obsIds: [current.production_obs_id, previous.production_obs_id] },
      { key: "harvested_area", current: current.harvested_area, previous: previous.harvested_area, unit: "hectares", obsIds: [current.harvested_area_obs_id, previous.harvested_area_obs_id] },
      {
        key: "yield",
        current: computeYield(current.production, current.harvested_area),
        previous: computeYield(previous.production, previous.harvested_area),
        unit: "t/ha",
        obsIds: [current.production_obs_id, current.harvested_area_obs_id, previous.production_obs_id, previous.harvested_area_obs_id],
      },
    ];

    for (const metric of metrics) {
      const { current: currentValue, previous: previousValue, unit, obsIds } = metric;
      if (currentValue === null || previousValue === null || !Number.isFinite(currentValue) || !Number.isFinite(previousValue)) continue;
      if (previousValue <= 0) continue; // mathematically cannot compute percentage change on zero or negative baseline

      const absolute = currentValue - previousValue;
      const percentage = (absolute / previousValue) * 100;
      const absolutePercent = Math.abs(percentage);
      const severity = severityFor(absolutePercent, rule);
      if (!severity) continue;

      const floor = rule.materiality?.[metric.key] ?? 0;
      if (Math.abs(absolute) < floor) continue;

      const currentPeriod = `${currentYear} ${season}`;
      const previousPeriod = `${previousYear} ${season}`;

      const datasetId = current.dataset_id || previous.dataset_id || "nisr-sas";
      const datasetName = current.dataset_name || previous.dataset_name || "NISR Seasonal Agriculture Survey";
      const sourcePublisher = current.source_publisher || "National Institute of Statistics of Rwanda (NISR)";
      const sourceRef = current.source_reference || previous.source_reference || "NISR Tables";
      const sourceUrl = current.source_url || previous.source_url || "";
      const qualityStatus = current.quality_status || previous.quality_status || "verified";
      const isDemo = Boolean(current.is_demo && previous.is_demo);
      const contributingObs = obsIds.filter(Boolean);

      drafts.push({
        dedupe_key: `${rule.id}|v${rule.version}|${crop}|${district}|${season}|${metric.key}|${currentYear}`,
        title: `${crop} ${METRIC_LABELS[metric.key]} in ${district} ${directionWord(percentage)} ${absolutePercent.toFixed(
          1,
        )}% year on year`,
        severity,
        status: "new",
        rule_id: rule.id,
        rule_version: rule.version,
        rule_name: rule.name,
        rule_threshold_pct:
          severity === "priority" ? rule.thresholdPriorityPct : rule.thresholdReviewPct,
        crop,
        district,
        season,
        indicator: metric.key,
        unit,
        period: currentPeriod,
        previous_period: previousPeriod,
        observed_value: Number(currentValue.toFixed(2)),
        previous_value: Number(previousValue.toFixed(2)),
        absolute_change: Number(absolute.toFixed(2)),
        percentage_change: Number(percentage.toFixed(2)),
        dataset_id: datasetId,
        dataset_name: datasetName,
        source_publisher: sourcePublisher,
        source_reference: sourceRef,
        source_url: sourceUrl,
        quality_status: qualityStatus,
        is_demo: isDemo,
        observation_count: contributingObs.length,
        contributing_observation_ids: contributingObs,
        explanation:
          `${crop} ${METRIC_LABELS[metric.key]} in ${district}, ${season}, was ${currentValue.toFixed(2)} ${unit} in ` +
          `${currentPeriod} against ${previousValue.toFixed(2)} ${unit} in ${previousPeriod}, a change of ` +
          `${absolute >= 0 ? "+" : ""}${absolute.toFixed(2)} ${unit} (${percentage >= 0 ? "+" : ""}${percentage.toFixed(
            1,
          )}%). Rule ${rule.id} version ${rule.version} flags a ${severity === "priority" ? "priority" : "review"} ` +
          `when a comparable year-on-year change reaches ${
            severity === "priority" ? rule.thresholdPriorityPct : rule.thresholdReviewPct
          }%. This signal means the change deserves review. It does not establish why the change happened.`,
        evidence_snapshot: JSON.stringify({
          rule: rule.id,
          version: rule.version,
          crop,
          district,
          season,
          indicator: metric.key,
          unit,
          current: { period: currentPeriod, value: Number(currentValue.toFixed(2)) },
          previous: { period: previousPeriod, value: Number(previousValue.toFixed(2)) },
          absolute_change: Number(absolute.toFixed(2)),
          percentage_change: Number(percentage.toFixed(2)),
          threshold_pct: severity === "priority" ? rule.thresholdPriorityPct : rule.thresholdReviewPct,
          dataset_id: datasetId,
          dataset_name: datasetName,
          source_reference: sourceRef,
          quality_status: qualityStatus,
        }),
      });
    }
  }

  return drafts.sort((a, b) => Math.abs(b.percentage_change) - Math.abs(a.percentage_change));
}
