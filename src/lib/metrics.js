import { INDICATORS } from "./constants.js";

/**
 * The shared metric engine. Charts, comparisons, alert explanations, reports and
 * exports all read values through these functions, so a number shown on screen
 * and the same number printed in a report are produced the same way.
 *
 * Rules enforced here:
 *  - Missing values stay missing. Nothing is imputed and nothing becomes zero.
 *  - Yield is only derived when production and harvested area are both present,
 *    on the same crop, geography and period, and area is greater than zero.
 *  - A percentage change is only produced from a non-zero, present baseline.
 */

export function toNumber(value) {
  if (value === null || value === undefined || typeof value === "boolean" || (typeof value === "string" && !value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function computeYield(production, area) {
  const p = toNumber(production);
  const a = toNumber(area);
  if (p === null || a === null || a <= 0) return null;
  return p / a;
}

/** Ratios use matching crop/district/season/release pairs, never unmatched totals. */
export function yieldFromRows(rows) {
  const pairs = new Map();
  for (const row of rows ?? []) {
    if (!["production", "harvested_area"].includes(row.indicator)) continue;
    const key = [row.year,row.season,row.geography,row.crop].join("|");
    if (!pairs.has(key)) pairs.set(key, []);
    pairs.get(key).push(row);
  }
  if (!pairs.size) return null;
  let production = 0, area = 0;
  for (const pair of pairs.values()) {
    const p = pair.filter(row=>row.indicator === "production");
    const a = pair.filter(row=>row.indicator === "harvested_area");
    if (p.length !== 1 || a.length !== 1 || p[0].dataset_id !== a[0].dataset_id) return null;
    const pv = toNumber(p[0].value), av = toNumber(a[0].value);
    if (pv === null || av === null || pv < 0 || av < 0 || (av === 0 && pv !== 0)) return null;
    production += pv; area += av;
  }
  return computeYield(production, area);
}

export function absoluteChange(current, previous) {
  const c = toNumber(current);
  const p = toNumber(previous);
  if (c === null || p === null) return { value: null, reason: "missing" };
  return { value: c - p, reason: null };
}

export function percentageChange(current, previous) {
  const change = absoluteChange(current, previous);
  if (change.reason) return change;
  if (toNumber(previous) === 0) return { value: null, reason: "zero_baseline" };
  return { value: (change.value / toNumber(previous)) * 100, reason: null };
}

export const NOT_CALCULABLE_TEXT = {
  missing: "Not calculable — one of the two values is missing from the loaded data.",
  zero_baseline: "Not calculable — the previous value is zero, so a percentage change has no meaning.",
};

export function indicatorValueFromTotals(indicatorKey, totals) {
  if (indicatorKey === "yield") return computeYield(totals.production, totals.harvested_area);
  if (indicatorKey === "production") return totals.production ?? null;
  if (indicatorKey === "harvested_area") return totals.harvested_area ?? null;
  if (indicatorKey === "cultivated_area") return totals.cultivated_area ?? null;
  if (indicatorKey === "reported_yield") return totals.reported_yield ?? null;
  return null;
}

/** One bucket per agricultural year, with production, area and derived yield. */
export function seriesByYear(rows) {
  const buckets = new Map();
  for (const row of rows ?? []) {
    const year = toNumber(row.year);
    if (year === null) continue;
    if (!buckets.has(year)) {
      buckets.set(year, { year, production: null, harvested_area: null, cultivated_area: null, reported_yield: null, yieldCount: 0, rainfall_mm: null, counts: 0 });
    }
    const bucket = buckets.get(year);
    if (row.indicator === "reported_yield") bucket.yieldCount += 1;
    const value = toNumber(row.value);
    bucket.counts += 1;
    if (value === null) continue;
    if (row.indicator === "production") bucket.production = (bucket.production ?? 0) + value;
    if (row.indicator === "harvested_area") bucket.harvested_area = (bucket.harvested_area ?? 0) + value;
    if (row.indicator === "cultivated_area") bucket.cultivated_area = (bucket.cultivated_area ?? 0) + value;
    if (row.indicator === "reported_yield") bucket.reported_yield = value;
    if (row.indicator === "rainfall_mm") bucket.rainfall_mm = (bucket.rainfall_mm ?? 0) + value;
  }

  return [...buckets.values()]
    .sort((a, b) => a.year - b.year)
    .map((bucket) => ({
      year: bucket.year,
      label: String(bucket.year),
      production: bucket.production,
      harvested_area: bucket.harvested_area,
      cultivated_area: bucket.cultivated_area,
      reported_yield: bucket.yieldCount === 1 ? bucket.reported_yield : null,
      yield: yieldFromRows((rows ?? []).filter(row=>Number(row.year) === bucket.year)),
      rainfall_mm: bucket.rainfall_mm,
      observationCount: bucket.counts,
    }));
}

/** Totals for one exact period (year + optional season) and one indicator. */
export function totalsForPeriod(rows, { year, season, indicator }) {
  if (["cultivated_area", "reported_yield"].includes(indicator)) {
    const matching = (rows ?? []).filter(row => toNumber(row.year) === toNumber(year) && (!season || row.season === season) && row.indicator === indicator);
    const values = matching.map(row => toNumber(row.value)).filter(value => value !== null);
    return { value: indicator === "reported_yield" ? (matching.length === 1 && values.length === 1 ? values[0] : null) : values.length ? values.reduce((a,b)=>a+b,0) : null, count: values.length };
  }
  let production = null;
  let harvested_area = null;
  let count = 0;
  for (const row of rows ?? []) {
    if (toNumber(row.year) !== toNumber(year)) continue;
    if (season && row.season !== season) continue;
    const value = toNumber(row.value);
    if (value === null) continue;
    if (indicator === "yield" ? !["production", "harvested_area"].includes(row.indicator) : row.indicator !== indicator) continue;
    count += 1;
    if (row.indicator === "production") production = (production ?? 0) + value;
    if (row.indicator === "harvested_area") harvested_area = (harvested_area ?? 0) + value;
  }
  if (indicator === "yield") return { value: yieldFromRows((rows ?? []).filter(row=>toNumber(row.year) === toNumber(year) && (!season || row.season === season))), count, production, harvested_area };
  return { value: indicator === "production" ? production : harvested_area, count, production, harvested_area };
}

/**
 * Group rows by a dimension (geography or crop) and reduce each group to the
 * selected indicator, deriving yield from the group's own totals.
 */
export function groupByDimension(rows, { dimension, year, season, indicator }) {
  const groups = new Map();
  for (const row of rows ?? []) {
    if (year && toNumber(row.year) !== toNumber(year)) continue;
    if (season && row.season !== season) continue;
    const key = row[dimension];
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { key, production: null, harvested_area: null, cultivated_area: null, reported_yield: null, yieldCount: 0, count: 0, rows: [] });
    const group = groups.get(key);
    group.rows.push(row);
    if (row.indicator === "reported_yield") group.yieldCount += 1;
    const value = toNumber(row.value);
    group.count += 1;
    if (value === null) continue;
    if (row.indicator === "production") group.production = (group.production ?? 0) + value;
    if (row.indicator === "harvested_area") group.harvested_area = (group.harvested_area ?? 0) + value;
    if (row.indicator === "cultivated_area") group.cultivated_area = (group.cultivated_area ?? 0) + value;
    if (row.indicator === "reported_yield") group.reported_yield = value;
  }

  return [...groups.values()]
    .map((group) => ({
      key: group.key,
      name: group.key,
      value: indicator === "yield" ? yieldFromRows(group.rows) : indicatorValueFromTotals(indicator, { ...group, reported_yield: group.yieldCount === 1 ? group.reported_yield : null }),
      production: group.production,
      harvested_area: group.harvested_area,
      observationCount: group.count,
    }))
    .filter((group) => group.value !== null)
    .sort((a, b) => b.value - a.value);
}

export function latestYear(rows) {
  const years = (rows ?? []).map((row) => toNumber(row.year)).filter((year) => year !== null);
  return years.length ? Math.max(...years) : null;
}

export function latestPeriod(rows) {
  const years = (rows ?? []).map((row) => toNumber(row.year)).filter((year) => year !== null);
  if (!years.length) return null;
  const year = Math.max(...years);
  const seasons = (rows ?? [])
    .filter((row) => toNumber(row.year) === year)
    .map((row) => row.season)
    .filter(Boolean);
  const season = seasons.includes("Season A") ? "Season A" : seasons[0];
  return season ? `${year} ${season}` : String(year);
}

/** Distinct district count and record counts, for the completeness figure. */
export function coverage(rows, expectedCount) {
  const districts = new Set((rows ?? []).map((row) => row.geography).filter(Boolean));
  const present = (rows ?? []).filter((row) => toNumber(row.value) !== null).length;
  const total = (rows ?? []).length;
  return {
    districts: districts.size,
    present,
    total,
    missing: Math.max(0, total - present),
    completeness: expectedCount > 0 ? Math.min(100, (present / expectedCount) * 100) : null,
  };
}

export function indicatorMeta(key) {
  return INDICATORS[key] ?? INDICATORS.production;
}

/** Round for display without changing the stored or compared value. */
export function displayDigits(indicatorKey) {
  return indicatorKey === "yield" ? 2 : 0;
}
