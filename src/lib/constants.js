import dataCoverage from "../data/data-coverage.json" with { type: "json" };
// Canonical reference values shared by the UI, the calculation engine, the
// alert rules and the demonstration-data generator. Nothing here is a statistic.

export const PROVINCES = ["Kigali City", "Southern", "Western", "Northern", "Eastern"];

export const DISTRICTS = [
  { name: "Gasabo", province: "Kigali City" },
  { name: "Kicukiro", province: "Kigali City" },
  { name: "Nyarugenge", province: "Kigali City" },
  { name: "Huye", province: "Southern" },
  { name: "Gisagara", province: "Southern" },
  { name: "Nyanza", province: "Southern" },
  { name: "Nyaruguru", province: "Southern" },
  { name: "Muhanga", province: "Southern" },
  { name: "Kamonyi", province: "Southern" },
  { name: "Ruhango", province: "Southern" },
  { name: "Karongi", province: "Western" },
  { name: "Nyamasheke", province: "Western" },
  { name: "Rutsiro", province: "Western" },
  { name: "Rubavu", province: "Western" },
  { name: "Rusizi", province: "Western" },
  { name: "Nyabihu", province: "Western" },
  { name: "Ngororero", province: "Western" },
  { name: "Musanze", province: "Northern" },
  { name: "Burera", province: "Northern" },
  { name: "Gicumbi", province: "Northern" },
  { name: "Gakenke", province: "Northern" },
  { name: "Rulindo", province: "Northern" },
  { name: "Bugesera", province: "Eastern" },
  { name: "Gatsibo", province: "Eastern" },
  { name: "Kayonza", province: "Eastern" },
  { name: "Kirehe", province: "Eastern" },
  { name: "Ngoma", province: "Eastern" },
  { name: "Nyagatare", province: "Eastern" },
  { name: "Rwamagana", province: "Eastern" },
  // Nyamagabe is listed last on purpose: the deterministic demonstration
  // generator iterates this array, so appending keeps every existing district's
  // generated records at the same position.
  { name: "Nyamagabe", province: "Southern" },
];

export const DISTRICT_NAMES = DISTRICTS.map((d) => d.name);

export const DISTRICT_PROVINCE = DISTRICTS.reduce((acc, d) => {
  acc[d.name] = d.province;
  return acc;
}, {});

export const CROPS = dataCoverage.crops;
export const MAIN_CROPS = dataCoverage.mainCrops;
export const CROP_PARENTS = dataCoverage.subtypes;
export const DATA_COVERAGE = dataCoverage;
export const cropLabel = crop => CROP_PARENTS[crop] ? `${crop} (${CROP_PARENTS[crop]} subtype)` : crop;

export const SEASONS = dataCoverage.seasons;

export const SEASON_NOTES = {
  "Season A": "Season A — September to February, as defined in the NISR survey releases.",
  "Season B": "Season B — March to June, as defined in the NISR survey releases.",
  "Season C": "Season C — July to September. Availability and crop coverage vary by release.",
};

export const YEARS = dataCoverage.years;

export const INDICATORS = {
  cultivated_area: {
    key: "cultivated_area", label: "Cultivated area", unit: "hectares", unitShort: "ha", kind: "measured",
    definition: "Published crop area cultivated in the selected season. This is different from harvested area and unique physical land area.",
  },
  reported_yield: {
    key: "reported_yield", label: "Published yield", unit: "kilograms per hectare", unitShort: "kg/ha", kind: "measured",
    definition: "Yield exactly as published in the source district table. Available for a single crop and district; rates are not added across districts or crops. Derived yield remains production divided by compatible harvested area.",
  },
  production: {
    key: "production",
    label: "Production",
    unit: "metric tonnes",
    unitShort: "t",
    kind: "measured",
    definition:
      "Quantity harvested for the selected crop, geography and period, reported in metric tonnes.",
  },
  harvested_area: {
    key: "harvested_area",
    label: "Harvested area",
    unit: "hectares",
    unitShort: "ha",
    kind: "measured",
    definition:
      "Area actually harvested for the selected crop, geography and period, reported in hectares.",
  },
  yield: {
    key: "yield",
    label: "Yield",
    unit: "tonnes per hectare",
    unitShort: "t/ha",
    kind: "derived",
    derived: true,
    definition:
      "Derived indicator: production (t) ÷ harvested area (ha). Calculated only when production and harvested area are present, compatible on crop, geography and period, and harvested area is greater than zero. Never calculated from a zero or missing denominator.",
  },
  rainfall_mm: {
    key: "rainfall_mm",
    label: "Seasonal rainfall",
    unit: "millimetres",
    unitShort: "mm",
    kind: "context",
    context: true,
    definition:
      "Seasonal rainfall total from a gridded climate product, aggregated to district level. Contextual evidence only: an areal estimate rather than a farm-level measurement. It does not establish cause.",
  },
};

export const CROP_INDICATORS = ["production", "harvested_area", "yield"];
export const ALL_INDICATORS = ["production", "harvested_area", "yield", "rainfall_mm"];

export const OBSERVATION_STATUSES = [
  {
    key: "observed",
    label: "Observed",
    description: "Recorded directly from the source table for the stated period.",
  },
  {
    key: "estimated",
    label: "Estimated",
    description: "Derived or interpolated rather than directly reported; treat with caution.",
  },
  {
    key: "provisional",
    label: "Provisional",
    description: "Reported but not yet final; may be revised by the publisher.",
  },
  {
    key: "forecast",
    label: "Forecast",
    description: "Projected value. Not an observation and never used as evidence of an outcome.",
  },
];

export const ALERT_SEVERITIES = [
  {
    key: "priority",
    label: "Priority",
    description: "Change far beyond the documented review threshold.",
  },
  {
    key: "review",
    label: "Review",
    description: "Change beyond the documented review threshold; worth a look.",
  },
  {
    key: "info",
    label: "Info",
    description: "Flagged for awareness only.",
  },
];

export const ALERT_SEVERITY_KEYS = ALERT_SEVERITIES.map((s) => s.key);

export const ALERT_STATUSES = [
  { key: "new", label: "New" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "investigating", label: "Investigating" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
];

export const INVESTIGATION_STATUSES = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "awaiting_evidence", label: "Awaiting evidence" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export const INVESTIGATION_PRIORITIES = [
  { key: "standard", label: "Standard" },
  { key: "elevated", label: "Elevated" },
];

export const FOLLOWUP_STATUSES = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export const NOTE_TYPES = [
  { key: "field_observation", label: "Field observation" },
  { key: "evidence", label: "Verified evidence" },
  { key: "unresolved_question", label: "Unresolved question" },
  { key: "source_check", label: "Source-check note" },
  { key: "note", label: "General note" },
];

/**
 * The documented, deterministic alert rules. Thresholds are product rules chosen
 * for review purposes; they are not official classifications and they are not
 * predictions. Every alert stores the rule id, version and threshold it used.
 */
export const ALERT_RULES = [
  {
    id: "YOY-CHANGE",
    version: 1,
    name: "Year-on-year change beyond threshold",
    purpose:
      "Surface a comparable year-on-year change in an indicator that deserves a human look.",
    metric: "Production, harvested area or derived yield",
    window:
      "Same crop, district, season and indicator; the current calendar year compared with the previous calendar year.",
    thresholdReviewPct: 15,
    thresholdPriorityPct: 30,
    // Materiality floor per indicator: a large percentage on a tiny base is not
    // worth a reviewer's time, so the absolute change must also clear this.
    materiality: { production: 50, harvested_area: 25, yield: 0.08 },
    cooldown:
      "One alert per crop, district, season and indicator: only the latest reported year is compared with the year before it, so repeated runs never duplicate an alert.",
    minCoverage:
      "Both years must have a valid, compatible observation with the same crop, district, season and indicator, and the previous value must be greater than zero.",
    explanation:
      "A change this large may reflect a real shift, a reporting change, a revision, or a single unusual season. The rule cannot tell which.",
  },
];

export const RULE_BY_ID = ALERT_RULES.reduce((acc, r) => {
  acc[r.id] = r;
  return acc;
}, {});

export const WORKSPACE_ROLES = [
  {
    key: "planner",
    label: "Planner / analyst",
    description: "Indicator exploration, comparisons, alerts and reports.",
  },
  {
    key: "officer",
    label: "Field officer / investigator",
    description: "Assigned investigations, field observations and follow-up actions.",
  },
  {
    key: "data_manager",
    label: "Data manager",
    description: "Dataset descriptions, imports, validation and configuration.",
  },
];

export const WORKSPACE_ROLE_LABEL = WORKSPACE_ROLES.reduce((acc, r) => {
  acc[r.key] = r.label;
  return acc;
}, {});

export const DEMO_DATASET = {
  observations: "ds-demo-crop-production",
  rainfall: "ds-demo-rainfall",
};

export const CSV_REQUIRED_COLUMNS = [
  "geography",
  "crop",
  "season",
  "year",
  "indicator",
  "value",
  "unit",
];

export const CSV_TEMPLATE_HEADER = [
  "geography",
  "crop",
  "season",
  "year",
  "indicator",
  "value",
  "unit",
  "observation_status",
  "dataset_id",
].join(",");
