import { CROPS, CROP_PARENTS, DATA_COVERAGE, DISTRICT_NAMES, INDICATORS, MAIN_CROPS, SEASONS, YEARS } from "./constants.js";
import { percentageChange, toNumber } from "./metrics.js";

export const EXPLORE_INDICATORS = ["production", "harvested_area", "cultivated_area", "yield", "reported_yield"];
export const EXPLORE_DEFAULTS = {
  crop: "Maize", district: "all", season: "Season B", indicator: "production",
  fromYear: Math.min(...YEARS), toYear: Math.max(...YEARS), baselineYear: Math.max(...YEARS) - 1, view: "trends",
};

export function validateExploreSearch(input) {
  const choose = (key, values) => values.includes(input[key]) ? input[key] : EXPLORE_DEFAULTS[key];
  const year = key => YEARS.includes(Number(input[key])) ? Number(input[key]) : EXPLORE_DEFAULTS[key];
  const from = year("fromYear"), to = year("toYear");
  return {
    crop: choose("crop", ["all", ...CROPS]), district: choose("district", ["all", ...DISTRICT_NAMES]),
    season: choose("season", SEASONS), indicator: choose("indicator", EXPLORE_INDICATORS),
    fromYear: Math.min(from, to), toYear: Math.max(from, to), baselineYear: year("baselineYear"),
    view: choose("view", ["trends", "library"]),
  };
}

const keyFor = (year, crop, district, indicator) => JSON.stringify([year, crop, district, indicator]);
const unique = values => [...new Set(values.filter(Boolean))];
const usable = row => toNumber(row.value) !== null && toNumber(row.value) >= 0 && row.unit === INDICATORS[row.indicator]?.unit && !["forecast", "missing"].includes(row.observation_status);

/** A fixed crop/district scope across years. Absent cells count as gaps too.
 * This measures availability for the selection, never statistical confidence.
 * Keep this engine local to Explore; other screens retain their own semantics.
 */
export function exploreData(inputRows, selection, catalogue = DATA_COVERAGE) {
  const { crop, district, season, indicator, fromYear, toYear, baselineYear } = selection;
  const rows = (inputRows ?? []).filter(row => row.domain === "crop" && row.season === season &&
    (crop === "all" ? !CROP_PARENTS[row.crop] && row.aggregation_level !== "subtype" : row.crop === crop) &&
    (district === "all" || row.geography === district));
  // Use the union of categories for the displayed and baseline periods so a
  // changing crop mix cannot masquerade as a production change.
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);
  const scopeYears = new Set([...years, baselineYear]);
  const catalogueCrops = (catalogue.availability ?? []).filter(item => item.season === season && scopeYears.has(item.year) && item.level === "main").map(item => item.crop);
  const crops = crop !== "all" ? [crop] : unique([...catalogueCrops, ...rows.filter(row => scopeYears.has(Number(row.year))).map(row => row.crop)]).filter(name => MAIN_CROPS.includes(name)).sort();
  const districts = district === "all" ? DISTRICT_NAMES : [district];
  const index = new Map();
  for (const row of rows) {
    const key = keyFor(Number(row.year), row.crop, row.geography, row.indicator);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(row);
  }

  function sourceCell(year, name, geography, measure) {
    const candidates = index.get(keyFor(year, name, geography, measure)) ?? [];
    const original = candidates[0];
    const reason = !candidates.length ? "No source record" : candidates.length > 1 ? "Conflicting source records" : !usable(original) ? "Missing or incompatible source value" : null;
    return {
      ...original, id: keyFor(year, name, geography, measure), year, season, crop: name, geography,
      period: `${year} ${season}`, indicator: measure, unit: INDICATORS[measure].unit,
      value: reason ? null : toNumber(original.value), source_value: original?.source_value ?? original?.value ?? null,
      source_unit: original?.unit ?? null, usable: !reason, absent: !candidates.length,
      analysis_status: reason ?? "Available", observation_status: original?.observation_status ?? "missing",
      source_reference: unique(candidates.map(row => row.source_reference)).join(" | "),
      source_url: unique(candidates.map(row => row.source_url)).join(" | "),
      quality_flags: unique([...candidates.flatMap(row => row.quality_flags ?? []), reason]),
      sourceRows: candidates,
    };
  }

  function derivedCell(year, name, geography) {
    const p = sourceCell(year, name, geography, "production"), a = sourceCell(year, name, geography, "harvested_area");
    const compatible = p.usable && a.usable && Boolean(p.dataset_id) && p.dataset_id === a.dataset_id && Boolean(p.is_demo) === Boolean(a.is_demo) && (a.value > 0 || p.value === 0);
    const value = compatible && a.value > 0 ? p.value / a.value : null;
    return {
      ...p, id: keyFor(year, name, geography, "yield"), indicator: "yield", unit: INDICATORS.yield.unit, value,
      usable: compatible, absent: p.absent || a.absent, production: p.value, harvested_area: a.value,
      analysis_status: !compatible ? "Missing or incompatible yield components" : a.value === 0 ? "No harvested area; rate unavailable" : "Calculated from matched source cells",
      observation_status: "derived", source_value: null, source_unit: null,
      source_reference: unique([p.source_reference, a.source_reference]).join(" | "),
      source_url: unique([p.source_url, a.source_url]).join(" | "),
      quality_flags: unique([...p.quality_flags, ...a.quality_flags, !compatible && "Yield requires production and harvested area from the same release."]),
      sourceRows: [...p.sourceRows, ...a.sourceRows],
    };
  }

  const pointCache = new Map();
  function point(year, measure, selectedDistricts = districts) {
    const cacheKey = `${year}|${measure}|${selectedDistricts.join(",")}`;
    if (pointCache.has(cacheKey)) return pointCache.get(cacheKey);
    const records = crops.flatMap(name => selectedDistricts.map(geography => measure === "yield" ? derivedCell(year, name, geography) : sourceCell(year, name, geography, measure)));
    const present = records.filter(row => row.usable).length, expected = records.length;
    const modes = new Set(records.flatMap(row => row.sourceRows).map(row => Boolean(row.is_demo) || row.quality_status === "demonstration"));
    const scopeRestriction = measure === "reported_yield" && (crop === "all" || selectedDistricts.length !== 1);
    const complete = expected > 0 && present === expected && modes.size <= 1 && !scopeRestriction;
    const total = field => records.reduce((sum, row) => sum + (row[field] ?? 0), 0);
    const area = measure === "yield" ? total("harvested_area") : null;
    const value = !complete ? null : measure === "yield" ? area > 0 ? total("production") / area : null : total("value");
    const reason = scopeRestriction ? "Published yield needs one crop and one district. Rates cannot be added." : modes.size > 1 ? "Sample and published observations cannot be combined." : !expected ? "No crop categories are available for this selection." : !complete ? `${expected - present} of ${expected} required ${measure === "yield" ? "source pairs" : "values"} are missing or incompatible. Total withheld.` : value === null ? "Harvested area is zero; yield is unavailable." : null;
    const result = { year, label: String(year), value, complete, reason, expected, present, missing: expected - present, absent: records.filter(row => row.absent).length, records };
    pointCache.set(cacheKey, result);
    return result;
  }
  const series = years.map(year => point(year, indicator)), current = point(toYear, indicator), previous = point(baselineYear, indicator);
  const delta = percentageChange(current.value, previous.value);
  const comparisonModes = new Set([...current.records, ...previous.records].flatMap(row => row.sourceRows).map(row => Boolean(row.is_demo) || row.quality_status === "demonstration"));
  const comparisonReason = toYear === baselineYear ? "Choose a different baseline year." : comparisonModes.size > 1 ? "Sample and published periods cannot be compared." : current.reason ?? previous.reason ?? (delta.reason === "zero_baseline" ? "The baseline is zero; a percentage change is undefined." : delta.reason ? "Comparable values are unavailable." : null);
  const records = series.flatMap(item => item.records).sort((a, b) => b.year - a.year || a.geography.localeCompare(b.geography) || a.crop.localeCompare(b.crop));
  return {
    series, current, previous, records, crops, districts,
    change: comparisonReason ? null : delta.value, comparisonReason,
    expected: records.length, present: records.filter(row => row.usable).length,
    missing: records.filter(row => !row.usable).length, absent: records.filter(row => row.absent).length,
    sourceRows: unique([...records, ...previous.records].flatMap(row => row.sourceRows)),
    districtComparisons: district !== "all" ? [] : districts.map(geography => {
      const now = point(toYear, indicator, [geography]), before = point(baselineYear, indicator, [geography]);
      const modes = new Set([...now.records, ...before.records].flatMap(row => row.sourceRows).map(row => Boolean(row.is_demo) || row.quality_status === "demonstration"));
      const reason = now.reason ?? before.reason ?? (toYear === baselineYear ? "Choose a different baseline year." : modes.size > 1 ? "Sample and published periods cannot be compared." : null);
      const delta = percentageChange(now.value, before.value);
      return { district: geography, current: now.value, previous: before.value, change: reason ? null : delta.value, reason: reason ?? (delta.reason === "zero_baseline" ? "Zero baseline; percentage unavailable." : null) };
    }).sort((a, b) => (a.change === null) - (b.change === null) || (a.change ?? 0) - (b.change ?? 0) || a.district.localeCompare(b.district)),
    breakdown: ["production", "harvested_area", "yield"].map(measure => {
      const now = point(toYear, measure), before = point(baselineYear, measure);
      const modes = new Set([...now.records, ...before.records].flatMap(row => row.sourceRows).map(row => Boolean(row.is_demo) || row.quality_status === "demonstration"));
      return { indicator: measure, current: now.value, previous: before.value, change: toYear === baselineYear || modes.size > 1 ? null : percentageChange(now.value, before.value).value };
    }),
  };
}

export function exploreExportRows(records) {
  // Spreadsheet formula protection for source/user-supplied string fields.
  const safe = value => typeof value === "string" && /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
  return records.map(row => Object.fromEntries(Object.entries({
    dataset: row.dataset_name ?? "", geography: row.geography, crop: row.crop, season: row.season, year: row.year,
    period: row.period, indicator: row.indicator, value: row.value, unit: row.unit,
    analysis_status: row.analysis_status, observation_status: row.observation_status, source_record_absent: row.absent,
    quality_flags: row.quality_flags.join(" | "), source_value: row.source_value, source_unit: row.source_unit,
    production_t: row.production, harvested_area_ha: row.harvested_area,
    source_url: row.source_url, source_reference: row.source_reference,
  }).map(([key, value]) => [key, safe(value)])));
}
