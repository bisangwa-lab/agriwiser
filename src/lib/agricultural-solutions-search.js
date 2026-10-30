import { CROPS, DISTRICT_NAMES, SEASONS, YEARS } from "./constants.js";

/** The shared scope for the three Agricultural Solutions activities lives in the URL so a
 *  refresh, a direct link or an activity switch all describe the same evidence view. */
export const AGRI_SCOPE_DEFAULTS = {
  crop: "Maize",
  district: "all",
  season: "Season B",
  year: Math.max(...YEARS),
};

const asText = (value) => (typeof value === "string" || typeof value === "number" ? String(value) : "");

export function parseAgriScope(search) {
  const raw = search && typeof search === "object" ? search : {};
  const crop = asText(raw.crop);
  const district = asText(raw.district);
  const season = asText(raw.season);
  const year = Number(raw.year);
  return {
    crop: CROPS.includes(crop) ? crop : AGRI_SCOPE_DEFAULTS.crop,
    district: DISTRICT_NAMES.includes(district) ? district : "all",
    season: SEASONS.includes(season) ? season : AGRI_SCOPE_DEFAULTS.season,
    year: YEARS.includes(year) ? year : AGRI_SCOPE_DEFAULTS.year,
  };
}

/** Only writes the parameters that differ from the defaults, keeping shared links short. */
export function agriScopeSearch(scope) {
  const parsed = parseAgriScope(scope);
  const out = {};
  for (const key of ["crop", "district", "season", "year"]) {
    if (parsed[key] !== AGRI_SCOPE_DEFAULTS[key]) out[key] = parsed[key];
  }
  return out;
}
