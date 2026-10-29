import { ALERT_RULES, RULE_BY_ID } from "@/lib/constants";

/**
 * Deterministic, transparent alert rules.
 *
 * This module is the single implementation of the rule, shared by the seeding
 * routine and the in-app recompute. Nothing here is a prediction or a validated
 * model: a rule compares two comparable reported values and flags the size of the
 * change so that a person can review it. Every alert stores the rule id, version,
 * threshold and the values it used.
 */

export function computeYield(production, area) {
  if (!Number.isFinite(production) || !Number.isFinite(area) || area <= 0) return null;
  return production / area;
}

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
 */
export function evaluateAlerts(observations, { ruleId = "YOY-CHANGE" } = {}) {
  const rule = RULE_BY_ID[ruleId] ?? ALERT_RULES[0];
  const rows = (observations ?? []).filter((row) => row.domain !== "climate");

  const years = [...new Set(rows.map((row) => Number(row.year)).filter((year) => Number.isFinite(year)))].sort(
    (a, b) => a - b,
  );
  if (years.length < 2) return [];

  const currentYear = years[years.length - 1];
  const previousYear = years[years.length - 2];

  const index = new Map();
  for (const row of rows) {
    const year = Number(row.year);
    if (year !== currentYear && year !== previousYear) continue;
    const value = Number(row.value);
    if (!Number.isFinite(value)) continue;
    const seriesKey = `${row.crop}|${row.geography}|${row.season}`;
    const entryKey = `${seriesKey}|${year}`;
    if (!index.has(entryKey)) index.set(entryKey, { production: null, harvested_area: null });
    const entry = index.get(entryKey);
    if (row.indicator === "production") entry.production = value;
    if (row.indicator === "harvested_area") entry.harvested_area = value;
  }

  const seriesKeys = new Set([...index.keys()].map((key) => key.split("|").slice(0, 3).join("|")));
  const drafts = [];

  for (const seriesKey of seriesKeys) {
    const [crop, district, season] = seriesKey.split("|");
    const current = index.get(`${seriesKey}|${currentYear}`);
    const previous = index.get(`${seriesKey}|${previousYear}`);
    if (!current || !previous) continue;

    const metrics = [
      { key: "production", current: current.production, previous: previous.production },
      { key: "harvested_area", current: current.harvested_area, previous: previous.harvested_area },
      {
        key: "yield",
        current: computeYield(current.production, current.harvested_area),
        previous: computeYield(previous.production, previous.harvested_area),
      },
    ];

    for (const metric of metrics) {
      const { current: currentValue, previous: previousValue } = metric;
      if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) continue;
      if (previousValue <= 0) continue;

      const absolute = currentValue - previousValue;
      const percentage = (absolute / previousValue) * 100;
      const absolutePercent = Math.abs(percentage);
      const severity = severityFor(absolutePercent, rule);
      if (!severity) continue;

      const floor = rule.materiality?.[metric.key] ?? 0;
      if (Math.abs(absolute) < floor) continue;

      const unit = metric.key === "production" ? "t" : metric.key === "harvested_area" ? "ha" : "t/ha";
      const currentPeriod = `${currentYear} ${season}`;
      const previousPeriod = `${previousYear} ${season}`;

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
        explanation:
          `${crop} ${METRIC_LABELS[metric.key]} in ${district}, ${season}, was ${currentValue.toFixed(2)} ${unit} in ` +
          `${currentPeriod} against ${previousValue.toFixed(2)} ${unit} in ${previousPeriod}, a change of ` +
          `${absolute >= 0 ? "+" : ""}${absolute.toFixed(2)} ${unit} (${percentage >= 0 ? "+" : ""}${percentage.toFixed(
            1,
          )}%). Rule ${rule.id} version ${rule.version} flags a ${severity === "priority" ? "priority" : "review"} ` +
          `when a comparable year-on-year change reaches ${rule.rule_threshold_pct ?? ""}` +
          `${severity === "priority" ? rule.thresholdPriorityPct : rule.thresholdReviewPct}%. This signal means the ` +
          `change deserves review. It does not establish why the change happened.`,
      });
    }
  }

  return drafts.sort((a, b) => Math.abs(b.percentage_change) - Math.abs(a.percentage_change));
}