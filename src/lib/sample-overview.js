/**
 * Clearly labelled demonstration values used before any dataset has been loaded
 * into the database. Everything here is illustrative: the numbers are generated
 * to make the workflow visible and are never official statistics. Every screen
 * that renders them shows a "Demonstration data" notice.
 */
export const SAMPLE_OVERVIEW = {
  datasetName: "Crop production and harvested area by district and season (demonstration)",
  datasetId: "ds-demo-crop-production",
  latestPeriod: "2024 Season A",
  previousPeriod: "2023 Season A",
  observationCount: 3120,
  expectedObservationCount: 3240,
  cards: {
    production: { value: 486320, unitShort: "t", deltaPct: 6.4, digits: 0 },
    harvested_area: { value: 210480, unitShort: "ha", deltaPct: 8.3, digits: 0 },
    yield: { value: 2.31, unitShort: "t/ha", deltaPct: -1.8, digits: 2 },
    districts: { value: 30 },
    completeness: { value: 96, unitShort: "%" },
  },
  trend: [
    { label: "2021", year: 2021, production: 402140, harvested_area: 186420, yield: 2.16 },
    { label: "2022", year: 2022, production: 428760, harvested_area: 195880, yield: 2.19 },
    { label: "2023", year: 2023, production: 456980, harvested_area: 194360, yield: 2.35 },
    { label: "2024", year: 2024, production: 486320, harvested_area: 210480, yield: 2.31 },
  ],
  districtRows: [
    { name: "Nyagatare", value: 61240 },
    { name: "Gatsibo", value: 48910 },
    { name: "Kirehe", value: 41260 },
    { name: "Bugesera", value: 37650 },
    { name: "Musanze", value: 33180 },
    { name: "Kayonza", value: 30420 },
    { name: "Gicumbi", value: 27940 },
    { name: "Muhanga", value: 25310 },
  ],
  alerts: [
    {
      id: "sample-alert-1",
      title: "Maize production in Kirehe fell 34% year on year",
      severity: "priority",
      crop: "Maize",
      district: "Kirehe",
      indicator: "production",
      period: "2024 Season A",
      status: "new",
      ruleId: "YOY-CHANGE",
    },
    {
      id: "sample-alert-2",
      title: "Rice harvested area in Nyagatare rose 22% year on year",
      severity: "review",
      crop: "Rice",
      district: "Nyagatare",
      indicator: "harvested_area",
      period: "2024 Season A",
      status: "acknowledged",
      ruleId: "YOY-CHANGE",
    },
    {
      id: "sample-alert-3",
      title: "Banana yield in Nyarugenge fell 18% year on year",
      severity: "review",
      crop: "Banana",
      district: "Nyarugenge",
      indicator: "yield",
      period: "2024 Season B",
      status: "new",
      ruleId: "YOY-CHANGE",
    },
  ],
  investigations: [
    {
      id: "sample-inv-1",
      title: "Kirehe maize production drop, 2024 Season A",
      status: "in_progress",
      crop: "Maize",
      district: "Kirehe",
      period: "2024 Season A",
      assignee_name: "Field officer",
    },
    {
      id: "sample-inv-2",
      title: "Nyagatare rice expansion — verify reporting",
      status: "awaiting_evidence",
      crop: "Rice",
      district: "Nyagatare",
      period: "2024 Season A",
      assignee_name: "Unassigned",
    },
  ],
};