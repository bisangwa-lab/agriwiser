/**
 * AGRIWISER — STATISTICAL COMPUTATION ENGINE
 *
 * Deterministic, mathematically reproducible calculations strictly enforcing:
 * - Missing values remain null (never converted to 0)
 * - Zero is treated as a valid observation when recorded, but never as an assumed missing value
 * - Division by zero is prevented
 * - Exact contribution decompositions
 * - Transparent error metrics and trend modeling
 */

export function toNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

/**
 * Derives crop yield strictly when production is numeric and harvested area is positive.
 * Units: Production in metric tonnes, harvested area in hectares -> Yield in tonnes/ha (or kg/ha if converted).
 */
export function computeYield(production, harvestedArea) {
  const p = toNumber(production);
  const a = toNumber(harvestedArea);
  if (p === null || a === null || a <= 0) return null;
  return p / a;
}

/**
 * Calculates absolute and relative change between two periods.
 * Enforces strict zero-baseline and missing-data protections.
 */
export function computeChange(currentVal, baselineVal, { materialityThreshold = 0 } = {}) {
  const curr = toNumber(currentVal);
  const base = toNumber(baselineVal);

  if (curr === null || base === null) {
    return {
      absoluteChange: null,
      percentChange: null,
      status: 'missing_data',
      isMaterial: false,
      reason: curr === null && base === null ? 'both_missing' : curr === null ? 'current_missing' : 'baseline_missing',
    };
  }

  const absoluteChange = curr - base;

  // Zero-baseline handling: percentage change cannot be computed by dividing by zero
  if (base === 0) {
    return {
      absoluteChange,
      percentChange: null,
      status: curr === 0 ? 'unchanged_zero' : 'zero_baseline_growth',
      isMaterial: Math.abs(absoluteChange) >= materialityThreshold,
      reason: 'baseline_is_zero',
    };
  }

  const percentChange = (absoluteChange / Math.abs(base)) * 100;
  const isMaterial = Math.abs(absoluteChange) >= materialityThreshold;

  return {
    absoluteChange,
    percentChange,
    status: absoluteChange > 0 ? 'increase' : absoluteChange < 0 ? 'decline' : 'no_change',
    isMaterial,
    reason: null,
  };
}

/**
 * Exact arithmetic decomposition of agricultural production difference.
 * ΔP = (Y_base * ΔA) + (A_curr * ΔY)
 * Exactly recovers: ΔProduction === AreaContribution + YieldContribution
 */
export function decomposeProductionChange(currProd, currArea, baseProd, baseArea) {
  const pCurr = toNumber(currProd);
  const aCurr = toNumber(currArea);
  const pBase = toNumber(baseProd);
  const aBase = toNumber(baseArea);

  if (pCurr === null || aCurr === null || pBase === null || aBase === null || aCurr <= 0 || aBase <= 0) {
    return null;
  }

  const yBase = pBase / aBase;
  const yCurr = pCurr / aCurr;

  const deltaP = pCurr - pBase;
  const deltaA = aCurr - aBase;
  const deltaY = yCurr - yBase;

  const areaContribution = yBase * deltaA;
  const yieldContribution = aCurr * deltaY;
  const discrepancy = Math.abs(deltaP - (areaContribution + yieldContribution));

  return {
    deltaProduction: deltaP,
    deltaArea: deltaA,
    deltaYield: deltaY,
    areaContribution,
    yieldContribution,
    recoveredDifference: areaContribution + yieldContribution,
    exactRecovery: discrepancy < 1e-6,
  };
}

/**
 * Descriptive statistics for an array of numbers, ignoring nulls.
 */
export function descriptiveStatistics(values) {
  const valid = (values ?? []).map(toNumber).filter((v) => v !== null);
  if (!valid.length) {
    return {
      count: 0,
      mean: null,
      median: null,
      stdDev: null,
      variance: null,
      min: null,
      max: null,
      sum: null,
    };
  }

  const n = valid.length;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  const sorted = [...valid].sort((a, b) => a - b);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  const min = sorted[0];
  const max = sorted[n - 1];

  let variance = null;
  let stdDev = null;
  if (n > 1) {
    variance = valid.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
    stdDev = Math.sqrt(variance);
  } else {
    variance = 0;
    stdDev = 0;
  }

  return {
    count: n,
    mean,
    median,
    stdDev,
    variance,
    min,
    max,
    sum,
  };
}

/**
 * Computes z-score against a series.
 */
export function zScore(value, series) {
  const val = toNumber(value);
  if (val === null) return null;
  const stats = descriptiveStatistics(series);
  if (stats.count < 2 || stats.stdDev === 0 || stats.stdDev === null) return 0;
  return (val - stats.mean) / stats.stdDev;
}

/**
 * Ordinary Least Squares linear regression over time-indexed points: [{ x: number, y: number }]
 */
export function linearRegression(points) {
  const valid = (points ?? []).filter((p) => Number.isFinite(p?.x) && toNumber(p?.y) !== null).map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  if (valid.length < 2) {
    return {
      slope: null,
      intercept: null,
      rSquared: null,
      standardError: null,
      predict: () => null,
    };
  }

  const n = valid.length;
  const sumX = valid.reduce((acc, p) => acc + p.x, 0);
  const sumY = valid.reduce((acc, p) => acc + p.y, 0);
  const sumXY = valid.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumXX = valid.reduce((acc, p) => acc + p.x * p.x, 0);

  const meanX = sumX / n;
  const meanY = sumY / n;

  const denominator = sumXX - (sumX * sumX) / n;
  if (denominator === 0) {
    return {
      slope: 0,
      intercept: meanY,
      rSquared: 0,
      standardError: 0,
      predict: () => meanY,
    };
  }

  const slope = (sumXY - (sumX * sumY) / n) / denominator;
  const intercept = meanY - slope * meanX;

  // Compute R-squared & standard error
  let ssTot = 0;
  let ssRes = 0;
  for (const p of valid) {
    const yHat = slope * p.x + intercept;
    ssTot += Math.pow(p.y - meanY, 2);
    ssRes += Math.pow(p.y - yHat, 2);
  }

  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  const standardError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  return {
    slope,
    intercept,
    rSquared,
    standardError,
    predict: (targetX) => slope * Number(targetX) + intercept,
  };
}

/**
 * Exponential smoothing for single time-series trend forecasting with parameter alpha.
 */
export function simpleExponentialSmoothing(series, alpha = 0.3) {
  const valid = (series ?? []).map(toNumber).filter((v) => v !== null);
  if (!valid.length) return { smoothed: [], forecast: null };

  const smoothed = [valid[0]];
  for (let t = 1; t < valid.length; t++) {
    smoothed.push(alpha * valid[t] + (1 - alpha) * smoothed[t - 1]);
  }

  const forecast = smoothed[smoothed.length - 1];
  return { smoothed, forecast };
}
