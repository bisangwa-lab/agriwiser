import { DISTRICT_PROVINCE, DISTRICTS } from "@/lib/constants";
// The illustrative demo is independent of the full imported source catalogue.
const CROPS = ["Maize", "Rice", "Beans", "Cassava", "Irish Potato", "Banana"];
const SEASONS = ["Season A", "Season B"];
const YEARS = [2021, 2022, 2023, 2024];

/**
 * Deterministic demonstration dataset.
 *
 * Everything in this module is generated from a stable hash of the record key, so
 * the same demonstration dataset is produced on every run and the story it tells
 * (a handful of sharp year-on-year movements, a district with a missing baseline,
 * one district reporting zero, a dry 2022) is reproducible and inspectable.
 *
 * These are NOT official statistics. They are labelled as demonstration data in
 * the dataset record and everywhere they are displayed.
 */

export const DEMO_CROP_DATASET_ID = "ds-demo-crop-production";
export const DEMO_RAINFALL_DATASET_ID = "ds-demo-rainfall";

const TOTAL_AREA_PER_DISTRICT_SEASON = 22000;

const CROP_PROFILE = {
  Maize: { yield: 2.3, share: 0.22 },
  Rice: { yield: 4.1, share: 0.025 },
  Beans: { yield: 1.05, share: 0.26 },
  Cassava: { yield: 11.5, share: 0.13 },
  "Irish Potato": { yield: 11.2, share: 0.1 },
  Banana: { yield: 8.6, share: 0.265 },
};

const YEAR_AREA_FACTOR = { 2021: 0.93, 2022: 0.97, 2023: 1.01, 2024: 1.06 };
const YEAR_YIELD_FACTOR = { 2021: 0.96, 2022: 1.0, 2023: 1.055, 2024: 1.02 };
const SEASON_AREA_FACTOR = { "Season A": 1.0, "Season B": 0.78 };

const RAINFALL_YEAR_FACTOR = { 2021: 1.02, 2022: 0.9, 2023: 1.04, 2024: 0.96 };

/** Documented, hand-set movements so the demonstration has a clear narrative. */
const OVERRIDES = [
  { crop: "Maize", district: "Kirehe", season: "Season A", year: 2024, metric: "production", factor: 0.64 },
  { crop: "Rice", district: "Nyagatare", season: "Season A", year: 2024, metric: "harvested_area", factor: 1.34 },
  { crop: "Banana", district: "Nyarugenge", season: "Season B", year: 2024, metric: "production", factor: 0.79 },
  { crop: "Beans", district: "Nyaruguru", season: "Season B", year: 2024, metric: "production", factor: 0.71 },
  { crop: "Irish Potato", district: "Musanze", season: "Season A", year: 2024, metric: "harvested_area", factor: 1.22 },
  { crop: "Cassava", district: "Rusizi", season: "Season A", year: 2024, metric: "production", factor: 1.32 },
  { crop: "Maize", district: "Nyagatare", season: "Season A", year: 2024, metric: "harvested_area", factor: 1.19 },
  { crop: "Banana", district: "Rwamagana", season: "Season A", year: 2024, metric: "production", factor: 0.76 },
  { crop: "Beans", district: "Gakenke", season: "Season A", year: 2024, metric: "harvested_area", factor: 0.77 },
  { crop: "Maize", district: "Gatsibo", season: "Season B", year: 2024, metric: "production", factor: 1.36 },
  { crop: "Cassava", district: "Nyamasheke", season: "Season B", year: 2024, metric: "production", factor: 0.68 },
  { crop: "Irish Potato", district: "Burera", season: "Season B", year: 2024, metric: "production", factor: 0.73 },
];

/** Rice is reported in Nyagatare only from 2023, so earlier comparisons are unavailable. */
const LATE_INTRODUCTION = [{ crop: "Rice", district: "Nyagatare", fromYear: 2023 }];

/** One district reported no harvested banana area in 2021 Season B. */
const REPORTED_ZEROS = [{ crop: "Banana", district: "Nyarugenge", season: "Season B", year: 2021 }];

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic value in [0, 1) derived from a string key. */
function unit(key) {
  return (hashString(key) % 1000003) / 1000003;
}

/** Deterministic value in [-1, 1) derived from a string key. */
function signed(key) {
  return unit(key) * 2 - 1;
}

function districtAreaWeight(name) {
  return 0.55 + unit(`district:${name}`) * 1.3;
}

function districtYieldWeight(name) {
  return 0.84 + unit(`yield:${name}`) * 0.32;
}

function overrideFor(crop, district, season, year, metric) {
  return OVERRIDES.find(
    (item) =>
      item.crop === crop &&
      item.district === district &&
      item.season === season &&
      item.year === year &&
      item.metric === metric,
  );
}

function isLateIntroduction(crop, district, year) {
  return LATE_INTRODUCTION.some((item) => item.crop === crop && item.district === district && item.fromYear > year);
}

function isReportedZero(crop, district, season, year) {
  return REPORTED_ZEROS.some(
    (item) => item.crop === crop && item.district === district && item.season === season && item.year === year,
  );
}

function makeCropObservation({ dataset, crop, district, season, year, indicator, value, flags }) {
  const isProvisional = unit(`prov:${dataset.id}|${crop}|${district}|${season}|${year}`) < 0.06;
  const isEstimated = !isProvisional && unit(`est:${crop}|${district}|${season}|${year}`) < 0.05;
  const qualityFlags = [...flags];
  if (isProvisional) qualityFlags.push("Provisional — may be revised by the publisher");
  if (isEstimated) qualityFlags.push("Estimated from administrative reports rather than a full enumeration");

  return {
    dataset_id: dataset.id,
    dataset_name: dataset.name,
    source_publisher: dataset.publisher,
    domain: "crop",
    geography: district,
    province: DISTRICT_PROVINCE[district],
    crop,
    season,
    year,
    period: `${year} ${season}`,
    indicator,
    value,
    unit: indicator === "production" ? "metric tonnes" : "hectares",
    observation_status: isProvisional ? "provisional" : isEstimated ? "estimated" : "observed",
    quality_flags: qualityFlags,
    is_demo: true,
  };
}

export const DEMO_CROP_DATASET = {
  id: DEMO_CROP_DATASET_ID,
  name: "Crop production and harvested area by district and season (demonstration)",
  publisher: "Demonstration dataset — not an official NISR publication",
  source_url: "https://microdata.statistics.gov.rw/index.php/catalog/124/data-dictionary",
  source_reference: "Modelled on the structure of the NISR Seasonal Agricultural Survey data dictionary.",
  retrieval_date: "2026-10-19",
  reporting_period: "2021–2024, Season A and Season B",
  geographic_coverage: "All 30 districts of Rwanda, district level",
  geography_level: "District",
  version: "demo-1.0",
  license: "Demonstration data — freely reusable for testing, not citable as statistics",
  methodology:
    "Values are generated deterministically from a stable hash of crop, district, season and year, for the purpose of demonstrating the platform. A small number of year-on-year movements are set by hand so that the alert, comparison and investigation workflows have a clear narrative.",
  limitations:
    "Not official statistics. Season C is not represented. Values are not survey-weighted and carry no variance estimates. District aggregates should not be read as farm-level measurements. Reporting coverage and definitions differ from a real NISR release.",
  units: "Production in metric tonnes; harvested area in hectares; yield derived in tonnes per hectare.",
  update_cadence: "Not scheduled — demonstration data",
  indicators: ["production", "harvested_area"],
  quality_status: "demonstration",
  quality_warnings: [
    "Demonstration values — not official NISR figures",
    "Season C and marshland production are not included",
    "No survey weights or variance estimates available",
  ],
  is_demo: true,
  active: true,
};

export const DEMO_RAINFALL_DATASET = {
  id: DEMO_RAINFALL_DATASET_ID,
  name: "Seasonal rainfall by district (demonstration gridded product)",
  publisher: "Demonstration dataset — modelled on gridded climate products such as NASA POWER",
  source_url: "https://power.larc.nasa.gov/",
  source_reference: "Structure modelled on NASA POWER district-aggregated seasonal rainfall.",
  retrieval_date: "2026-10-19",
  reporting_period: "2021–2024, Season A and Season B",
  geographic_coverage: "All 30 districts of Rwanda — one areal estimate per district and season",
  geography_level: "District (grid cells aggregated to district boundaries)",
  version: "demo-1.0",
  license: "Demonstration data — freely reusable for testing, not citable as statistics",
  methodology:
    "A seasonal rainfall total per district, generated deterministically and shaped to a plausible national pattern including a drier 2022. Gridded products are averages over an area, not measurements at a point.",
  limitations:
    "Areal estimates, not farm-level measurements. Grid cells are aggregated to district boundaries, so no within-district variation is represented. The rainfall window is aligned to the agricultural season, not to a crop calendar. Correlation with production does not establish cause.",
  units: "Millimetres per season",
  update_cadence: "Not scheduled — demonstration data",
  indicators: ["rainfall_mm"],
  quality_status: "demonstration",
  quality_warnings: [
    "Gridded estimate aggregated to district — not a station measurement",
    "Context only: never presented as evidence of cause",
  ],
  is_demo: true,
  active: true,
};

/**
 * Build the whole demonstration set: datasets, crop observations, rainfall
 * context and the count of crop observations that would exist with complete
 * reporting (used for the completeness figure).
 */
export function buildDemoData() {
  const observations = [];
  const skipped = [];

  for (const district of DISTRICTS) {
    for (const crop of CROPS) {
      const profile = CROP_PROFILE[crop];
      for (const season of SEASONS) {
        for (const year of YEARS) {
          const key = `crop:${crop}|${district.name}|${season}|${year}`;

          if (isLateIntroduction(crop, district.name, year)) {
            skipped.push(key);
            continue;
          }

          if (unit(`skip:${key}`) < 0.02) {
            skipped.push(key);
            continue;
          }

          const areaSeed = `${crop}|${district.name}|${season}|${year}`;
          let area =
            TOTAL_AREA_PER_DISTRICT_SEASON *
            profile.share *
            districtAreaWeight(district.name) *
            SEASON_AREA_FACTOR[season] *
            YEAR_AREA_FACTOR[year] *
            (1 + signed(`area:${areaSeed}`) * 0.04);

          let production =
            area *
            profile.yield *
            districtYieldWeight(district.name) *
            YEAR_YIELD_FACTOR[year] *
            (1 + signed(`yield:${areaSeed}`) * 0.05);

          const areaOverride = overrideFor(crop, district.name, season, year, "harvested_area");
          const productionOverride = overrideFor(crop, district.name, season, year, "production");
          const flags = [];

          if (areaOverride) {
            area *= areaOverride.factor;
            production *= areaOverride.factor;
            flags.push("Large year-on-year movement — verify against the source table");
          }
          if (productionOverride) {
            production *= productionOverride.factor;
            flags.push("Large year-on-year movement — verify against the source table");
          }

          if (isReportedZero(crop, district.name, season, year)) {
            area = 0;
            production = 0;
            flags.push("Reported as zero — verify against the source table");
          }

          const roundedArea = Math.round(area);
          const roundedProduction = Math.round(production);

          observations.push(
            makeCropObservation({
              dataset: DEMO_CROP_DATASET,
              crop,
              district: district.name,
              season,
              year,
              indicator: "production",
              value: roundedProduction,
              flags,
            }),
          );
          observations.push(
            makeCropObservation({
              dataset: DEMO_CROP_DATASET,
              crop,
              district: district.name,
              season,
              year,
              indicator: "harvested_area",
              value: roundedArea,
              flags,
            }),
          );
        }
      }
    }
  }

  for (const district of DISTRICTS) {
    const base = 620 + districtAreaWeight(district.name) * 250;
    for (const season of SEASONS) {
      for (const year of YEARS) {
        const noise = 1 + signed(`rain:${district.name}|${season}|${year}`) * 0.09;
        const value = Math.round(base * (season === "Season A" ? 1 : 0.88) * RAINFALL_YEAR_FACTOR[year] * noise);
        observations.push({
          dataset_id: DEMO_RAINFALL_DATASET.id,
          dataset_name: DEMO_RAINFALL_DATASET.name,
          source_publisher: DEMO_RAINFALL_DATASET.publisher,
          domain: "climate",
          geography: district.name,
          province: district.province,
          crop: null,
          season,
          year,
          period: `${year} ${season}`,
          indicator: "rainfall_mm",
          value,
          unit: "millimetres",
          observation_status: "estimated",
          quality_flags: [
            "Gridded estimate aggregated to district boundaries",
            "Context only: not evidence of cause",
            ...(year === 2022 ? ["Season reported drier than the surrounding years in this demonstration set"] : []),
          ],
          is_demo: true,
        });
      }
    }
  }

  return {
    datasets: [DEMO_CROP_DATASET, DEMO_RAINFALL_DATASET],
    observations,
    expectedCropObservations: DISTRICTS.length * CROPS.length * SEASONS.length * YEARS.length * 2,
    skippedCombinations: skipped.length,
  };
}
