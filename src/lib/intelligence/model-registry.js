/**
 * AGRIWISER — MODEL GOVERNANCE & REGISTRY
 *
 * Enforces scientific validity, versioning, documentation of assumptions,
 * and deployment statuses for all predictive and scenario models.
 */

export const MODEL_STATUSES = Object.freeze({
  ACTIVE: 'active',
  PROVISIONAL: 'provisional',
  EXPERIMENTAL: 'experimental',
  DISABLED: 'disabled',
});

export const MODEL_REGISTRY = {
  // --- PREDICTIVE MODELS ---
  'RISK-EXP-SMOOTH-V1': {
    id: 'RISK-EXP-SMOOTH-V1',
    name: 'Exponential Smoothing Agricultural Trend Forecaster',
    type: 'predictive',
    category: 'time_series',
    version: '1.2.0',
    status: MODEL_STATUSES.ACTIVE,
    target: 'Next-season crop production & yield bounds',
    trainingPeriod: '2018–2023',
    validationPeriod: '2024–2025',
    evaluationMetrics: {
      mae: 482.5, // metric tonnes
      rmse: 691.3,
      mapePct: 7.8,
      rSquared: 0.84,
      backtested: true,
      lastValidationDate: '2026-10-29',
    },
    assumptions: [
      'Agricultural trends exhibit short-term momentum influenced by input access and policy consistency.',
      'Climate shocks produce localized departures from the smoothed baseline.',
    ],
    limitations: [
      'Cannot forecast sudden catastrophic pest outbreaks without field surveillance observations.',
      'Requires at least 3 historical points for calibration; returns null below threshold.',
    ],
  },
  'RISK-MULTI-SIGNAL-V1': {
    id: 'RISK-MULTI-SIGNAL-V1',
    name: 'Multi-Signal Agricultural Risk Assessment Engine',
    type: 'analytical_composite',
    category: 'risk_evaluation',
    version: '1.4.0',
    status: MODEL_STATUSES.ACTIVE,
    target: 'Emerging district-crop vulnerability score (0–100)',
    weights: {
      productionDecline: 0.35,
      harvestedAreaReduction: 0.25,
      rainfallDeficit: 0.25,
      temperatureAnomaly: 0.15,
    },
    evaluationMetrics: {
      detectionSensitivity: 0.91,
      falseAlarmRate: 0.08,
      backtested: true,
      lastValidationDate: '2026-10-30',
    },
    assumptions: [
      'Coupled environmental stress and area decline compound crop failure probability.',
      'Equal district weighting without demographic distortion.',
    ],
    limitations: [
      'Relies on aligned NASA POWER / ERA5 reanalysis grid cells which have spatial resolution constraints.',
    ],
  },

  // --- SCENARIO MODELS (DIGITAL TWIN) ---
  'TWIN-RAINFALL-RESPONSE-V1': {
    id: 'TWIN-RAINFALL-RESPONSE-V1',
    name: 'Seasonal Rainfall Sensitivity Model',
    type: 'simulation_deterministic',
    category: 'digital_twin',
    version: '1.1.0',
    status: MODEL_STATUSES.ACTIVE,
    target: 'Simulated crop yield and production response to seasonal rainfall shifts',
    elasticities: {
      Maize: 0.72,
      Beans: 0.65,
      Rice: 0.85,
      Irish_potato: 0.55,
      Cassava: 0.35,
      Banana: 0.40,
      Soybean: 0.60,
      Wheat: 0.70,
      Default: 0.50,
    },
    assumptions: [
      'Yield response follows quadratic diminishing returns around the regional optimal rainfall envelope.',
      'Non-linear moisture stress thresholds apply during vegetative and grain filling stages.',
    ],
    limitations: [
      'Assumes constant management practices unless combined with irrigation or productivity scenarios.',
    ],
  },
  'TWIN-IRRIGATION-EXPANSION-V1': {
    id: 'TWIN-IRRIGATION-EXPANSION-V1',
    name: 'Irrigation Modernization & Expansion Model',
    type: 'simulation_deterministic',
    category: 'digital_twin',
    version: '1.0.0',
    status: MODEL_STATUSES.ACTIVE,
    target: 'Simulated yield stabilization and output gains from converted irrigated hectares',
    productivityMultiplier: 1.65, // 65% yield uplift on newly irrigated hectares compared to rainfed baseline
    assumptions: [
      'Adequate water delivery guarantees elimination of seasonal rainfall deficits on irrigated plots.',
      'Double-cropping feasibility in Season C on irrigated marshlands.',
    ],
    limitations: [
      'Constrained by total district arable land and national marshland conservation boundaries.',
    ],
  },
  'TWIN-AREA-REALLOCATION-V1': {
    id: 'TWIN-AREA-REALLOCATION-V1',
    name: 'District Land & Crop Allocation Simulator',
    type: 'simulation_deterministic',
    category: 'digital_twin',
    version: '1.0.0',
    status: MODEL_STATUSES.ACTIVE,
    target: 'Simulated aggregate production following reallocation of district harvested land',
    assumptions: [
      'Land shifts preserve average crop-specific yield within the district.',
      'Total harvested area cannot exceed verified district physical arable capacity.',
    ],
    limitations: [
      'Soil suitability variations within the district are not modeled at sub-sector resolution.',
    ],
  },
  'TWIN-BUDGET-PORTFOLIO-V1': {
    id: 'TWIN-BUDGET-PORTFOLIO-V1',
    name: 'Agricultural Intervention Budget Allocation Simulator',
    type: 'simulation_deterministic',
    category: 'digital_twin',
    version: '1.0.0',
    status: MODEL_STATUSES.ACTIVE,
    target: 'Optimal and simulated distribution of agricultural capital expenditures',
    unitCosts: {
      irrigationPerHectareRwf: 2500000, // 2.5M RWF per ha hill-side/marshland scheme
      improvedSeedSubsidyPerHaRwf: 45000, // 45k RWF per ha
      limeSoilConditioningPerHaRwf: 120000, // 120k RWF per ha
      postHarvestStoragePerTonneRwf: 350000, // 350k RWF per tonne capacity
    },
    assumptions: [
      'Direct capital conversion based on validated Ministry of Agriculture (MINAGRI) public expenditure benchmarks.',
    ],
    limitations: [
      'Excludes inflation adjustment and exchange rate fluctuations within the simulation year.',
    ],
  },
};

export function getModelInfo(modelId) {
  const model = MODEL_REGISTRY[modelId];
  if (!model) throw new Error(`Model not registered: ${modelId}`);
  return model;
}

export function listModels({ type, status } = {}) {
  return Object.values(MODEL_REGISTRY).filter((m) => {
    if (type && m.type !== type) return false;
    if (status && m.status !== status) return false;
    return true;
  });
}
