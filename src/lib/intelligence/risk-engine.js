/**
 * AGRIWISER — PREDICTIVE AGRICULTURAL RISK & RESPONSE ENGINE
 *
 * Implements Innovation One:
 * - Multi-signal risk detection (Agricultural + Climate + Provenance)
 * - Transparent composite risk index with confidence scoring
 * - Validated predictive forecasting with uncertainty bounds
 * - Seamless handoff to Field Operations
 */

import { DATA_CLASSIFICATIONS, tagEvidence } from './classification.js';
import {
  toNumber,
  computeYield,
  computeChange,
  decomposeProductionChange,
  descriptiveStatistics,
  simpleExponentialSmoothing,
  linearRegression,
} from './statistical-engine.js';
import { getModelInfo } from './model-registry.js';

export const RISK_LEVELS = Object.freeze({
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  ELEVATED: 'ELEVATED',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

export function getRiskLevel(score) {
  if (score >= 80) return RISK_LEVELS.CRITICAL;
  if (score >= 60) return RISK_LEVELS.HIGH;
  if (score >= 40) return RISK_LEVELS.ELEVATED;
  if (score >= 20) return RISK_LEVELS.MODERATE;
  return RISK_LEVELS.LOW;
}

/**
 * Evaluates multi-signal risk for a specific district, crop, and season.
 *
 * @param {Array} historySeries - Array of chronological points { year, production, harvestedArea, ... }
 * @param {Object} climateContext - Optional climate summary { rainfall, normalRainfall, rainfallAnomalyPct, temperatureAnomalyC }
 * @param {Object} options - Thresholds and evaluation parameters
 */
export function evaluateDistrictCropRisk(historySeries, climateContext = null, options = {}) {
  const model = getModelInfo('RISK-MULTI-SIGNAL-V1');
  const series = (historySeries ?? []).filter((p) => p && Number.isFinite(p.year)).sort((a, b) => a.year - b.year);

  if (series.length < 2) {
    return tagEvidence(
      {
        status: 'insufficient_history',
        riskLevel: RISK_LEVELS.LOW,
        compositeScore: 0,
        confidence: 0.1,
        signals: [],
        prediction: null,
        message: 'At least two verified seasons are required to compute agricultural risk signals.',
      },
      DATA_CLASSIFICATIONS.DERIVED_STATISTIC
    );
  }

  const currentPoint = series[series.length - 1];
  const previousPoint = series[series.length - 2];

  const signals = [];

  // --- 1. AGRICULTURAL PRODUCTION ANOMALY ---
  const prodChange = computeChange(currentPoint.production, previousPoint.production, {
    materialityThreshold: options.productionMateriality ?? 50,
  });

  if (prodChange.status === 'decline' && prodChange.percentChange !== null) {
    const absPct = Math.abs(prodChange.percentChange);
    let severity = 'low';
    let signalWeight = 0;

    if (absPct >= 35) {
      severity = 'critical';
      signalWeight = 100;
    } else if (absPct >= 20) {
      severity = 'high';
      signalWeight = 75;
    } else if (absPct >= 10) {
      severity = 'moderate';
      signalWeight = 45;
    }

    if (severity !== 'low') {
      signals.push({
        id: 'SIG-PROD-DECLINE',
        category: 'agricultural',
        type: 'production_decline',
        severity,
        score: signalWeight,
        metric: 'production',
        observedChangeMetricTonnes: prodChange.absoluteChange,
        percentChange: prodChange.percentChange,
        currentYear: currentPoint.year,
        baselineYear: previousPoint.year,
        description: `Production fell by ${Math.abs(prodChange.percentChange).toFixed(1)}% (${Math.abs(prodChange.absoluteChange).toFixed(1)} tonnes) compared to previous season.`,
      });
    }
  }

  // --- 2. HARVESTED AREA CONTRACTION ---
  const areaChange = computeChange(currentPoint.harvestedArea, previousPoint.harvestedArea, {
    materialityThreshold: options.areaMateriality ?? 20,
  });

  if (areaChange.status === 'decline' && areaChange.percentChange !== null) {
    const absAreaPct = Math.abs(areaChange.percentChange);
    if (absAreaPct >= 15) {
      const severity = absAreaPct >= 30 ? 'high' : 'moderate';
      signals.push({
        id: 'SIG-AREA-CONTRACTION',
        category: 'agricultural',
        type: 'area_contraction',
        severity,
        score: absAreaPct >= 30 ? 80 : 50,
        metric: 'harvested_area',
        observedChangeHectares: areaChange.absoluteChange,
        percentChange: areaChange.percentChange,
        description: `Harvested area contracted by ${Math.abs(areaChange.percentChange).toFixed(1)}% (${Math.abs(areaChange.absoluteChange).toFixed(1)} ha).`,
      });
    }
  }

  // --- 3. YIELD DECOMPOSITION ---
  const decomp = decomposeProductionChange(
    currentPoint.production,
    currentPoint.harvestedArea,
    previousPoint.production,
    previousPoint.harvestedArea
  );

  if (decomp && decomp.deltaYield < -0.2) {
    signals.push({
      id: 'SIG-YIELD-DROP',
      category: 'agricultural',
      type: 'yield_drop',
      severity: decomp.deltaYield < -0.5 ? 'high' : 'moderate',
      score: decomp.deltaYield < -0.5 ? 70 : 40,
      deltaYield: decomp.deltaYield,
      yieldContributionTonnes: decomp.yieldContribution,
      description: `Derived crop yield declined by ${Math.abs(decomp.deltaYield).toFixed(2)} t/ha, accounting for ${Math.abs(decomp.yieldContribution).toFixed(1)} tonnes of output loss.`,
    });
  }

  // --- 4. PERSISTENT HISTORICAL TREND (3+ seasons) ---
  let persistentDecline = false;
  if (series.length >= 3) {
    const pPrev2 = series[series.length - 3];
    const prevChange = computeChange(previousPoint.production, pPrev2.production);
    if (prodChange.status === 'decline' && prevChange.status === 'decline') {
      persistentDecline = true;
      signals.push({
        id: 'SIG-PERSISTENT-DECLINE',
        category: 'agricultural',
        type: 'multi_season_decline',
        severity: 'critical',
        score: 95,
        description: `Consecutive production decline confirmed across ${pPrev2.year}, ${previousPoint.year}, and ${currentPoint.year}.`,
      });
    }
  }

  // --- 5. CLIMATE STRESS SIGNALS ---
  if (climateContext) {
    const rainAnomaly = toNumber(climateContext.rainfallAnomalyPct);
    const tempAnomaly = toNumber(climateContext.temperatureAnomalyC);

    if (rainAnomaly !== null && rainAnomaly <= -20) {
      signals.push({
        id: 'SIG-RAINFALL-DEFICIT',
        category: 'climate',
        type: 'rainfall_deficit',
        severity: rainAnomaly <= -35 ? 'critical' : 'high',
        score: rainAnomaly <= -35 ? 90 : 65,
        anomalyPct: rainAnomaly,
        description: `Seasonal rainfall was ${Math.abs(rainAnomaly).toFixed(1)}% below the 30-year climate baseline.`,
      });
    } else if (rainAnomaly !== null && rainAnomaly >= 40) {
      signals.push({
        id: 'SIG-RAINFALL-EXCESS',
        category: 'climate',
        type: 'excess_rainfall',
        severity: rainAnomaly >= 60 ? 'high' : 'moderate',
        score: rainAnomaly >= 60 ? 70 : 45,
        anomalyPct: rainAnomaly,
        description: `Excess seasonal rainfall of +${rainAnomaly.toFixed(1)}% poses soil waterlogging or erosion hazards.`,
      });
    }

    if (tempAnomaly !== null && tempAnomaly >= 1.2) {
      signals.push({
        id: 'SIG-HEAT-STRESS',
        category: 'climate',
        type: 'heat_anomaly',
        severity: tempAnomaly >= 2.0 ? 'high' : 'moderate',
        score: tempAnomaly >= 2.0 ? 75 : 40,
        anomalyC: tempAnomaly,
        description: `Average seasonal temperature departed by +${tempAnomaly.toFixed(1)}°C above the historical baseline.`,
      });
    }
  }

  // --- 6. COMPOSITE RISK CALCULATION ---
  let compositeScore = 0;
  if (signals.length > 0) {
    const maxSignal = Math.max(...signals.map((s) => s.score));
    const avgSignal = signals.reduce((sum, s) => sum + s.score, 0) / signals.length;
    // Composite blends peak signal severity with cumulative multi-signal breadth
    compositeScore = Math.min(100, Math.round(maxSignal * 0.7 + avgSignal * 0.3));
  }

  // Confidence calculation based on evidence volume
  const evidencePoints = series.filter((p) => p.production !== null).length;
  const hasClimate = climateContext !== null && climateContext.rainfall !== undefined;
  const confidence = Math.min(1.0, 0.4 + (evidencePoints / 10) * 0.4 + (hasClimate ? 0.2 : 0));

  // --- 7. SCIENTIFIC PREDICTIVE PROJECTION (Next Season) ---
  const prodSeries = series.map((p) => p.production).filter((p) => p !== null);
  const { forecast: expForecast } = simpleExponentialSmoothing(prodSeries, 0.35);

  const regression = linearRegression(
    series.map((p, idx) => ({ x: idx, y: p.production })).filter((p) => p.y !== null)
  );

  const nextIndex = series.length;
  const regForecast = regression.predict(nextIndex);

  let prediction = null;
  if (prodSeries.length >= 3 && expForecast !== null && regForecast !== null) {
    const stats = descriptiveStatistics(prodSeries);
    const pooledForecast = (expForecast * 0.6 + regForecast * 0.4);
    const uncertaintyMargin = (regression.standardError || stats.stdDev || 50) * 1.645; // 90% CI

    prediction = tagEvidence(
      {
        modelId: 'RISK-EXP-SMOOTH-V1',
        targetSeasonYear: currentPoint.year + 1,
        projectedProductionTonnes: Math.max(0, Math.round(pooledForecast)),
        lowerBound90: Math.max(0, Math.round(pooledForecast - uncertaintyMargin)),
        upperBound90: Math.round(pooledForecast + uncertaintyMargin),
        trendSlopeTonnesPerYear: regression.slope !== null ? Math.round(regression.slope * 10) / 10 : null,
        rSquared: regression.rSquared !== null ? Math.round(regression.rSquared * 100) / 100 : null,
        method: 'Ensemble Exponential Smoothing (α=0.35) & OLS Trend Holdout',
        validationMetrics: model.evaluationMetrics,
      },
      DATA_CLASSIFICATIONS.MODEL_PREDICTION,
      {
        datasetId: currentPoint.datasetId,
        trainingPoints: prodSeries.length,
      }
    );
  }

  return tagEvidence(
    {
      district: currentPoint.district,
      crop: currentPoint.crop,
      season: currentPoint.season,
      currentYear: currentPoint.year,
      riskLevel: getRiskLevel(compositeScore),
      compositeScore,
      confidence: Math.round(confidence * 100) / 100,
      signals,
      signalCount: signals.length,
      agriculturalSignalCount: signals.filter((s) => s.category === 'agricultural').length,
      climateSignalCount: signals.filter((s) => s.category === 'climate').length,
      persistentDecline,
      prediction,
      currentObservations: {
        production: currentPoint.production,
        harvestedArea: currentPoint.harvestedArea,
        derivedYield: currentPoint.derivedYield,
      },
      baselineObservations: {
        year: previousPoint.year,
        production: previousPoint.production,
        harvestedArea: previousPoint.harvestedArea,
        derivedYield: previousPoint.derivedYield,
      },
      evaluationTimestamp: new Date().toISOString(),
      modelMetadata: {
        id: model.id,
        version: model.version,
      },
    },
    DATA_CLASSIFICATIONS.DERIVED_STATISTIC
  );
}

/**
 * Creates an authorized Field Investigation payload directly from an evaluated Risk Finding.
 */
export function buildInvestigationProposal(riskAssessment) {
  if (!riskAssessment || riskAssessment.compositeScore === undefined) {
    throw new Error('Valid Risk Assessment required to generate an investigation proposal.');
  }

  const { district, crop, season, currentYear, riskLevel, compositeScore, signals } = riskAssessment;

  const topSignals = (signals ?? []).map((s) => s.description).join('; ');

  return {
    title: `[${riskLevel} RISK] ${district} · ${crop} ${season} ${currentYear}`,
    geography: district,
    crop,
    season,
    year: currentYear,
    category: 'agricultural_risk',
    priority: riskLevel === RISK_LEVELS.CRITICAL ? 'urgent' : riskLevel === RISK_LEVELS.HIGH ? 'high' : 'medium',
    status: 'draft',
    source: 'risk_engine',
    evidence: {
      compositeScore,
      riskLevel,
      signals,
      evaluationTimestamp: riskAssessment.evaluationTimestamp,
    },
    initialNotes: `Automated Risk Engine identified ${signals.length} alert signal(s) with composite vulnerability score of ${compositeScore}/100. Key findings: ${topSignals}`,
    suggestedVerificationTasks: [
      `Conduct transect walk in ${district} major ${crop} producing sectors.`,
      'Survey local agricultural extension officers (AEOs) regarding input distribution timing and local drought incidence.',
      'Check pest/disease surveillance reports with RAB (Rwanda Agriculture Board) district agronomist.',
      'Verify farmer post-harvest storage conditions and preliminary grain moisture levels.',
    ],
  };
}
