import test from 'node:test';
import assert from 'node:assert/strict';
import { DATA_CLASSIFICATIONS, tagEvidence, isObservedEvidence } from '../src/lib/intelligence/classification.js';
import {
  toNumber,
  computeYield,
  computeChange,
  decomposeProductionChange,
  descriptiveStatistics,
  zScore,
  linearRegression,
  simpleExponentialSmoothing,
} from '../src/lib/intelligence/statistical-engine.js';
import { listModels, getModelInfo } from '../src/lib/intelligence/model-registry.js';

test('Data classification system enforces strict categorization', () => {
  assert.equal(isObservedEvidence(DATA_CLASSIFICATIONS.OFFICIAL_OBSERVATION), true);
  assert.equal(isObservedEvidence(DATA_CLASSIFICATIONS.SCENARIO_OUTPUT), false);
  assert.equal(isObservedEvidence(DATA_CLASSIFICATIONS.MODEL_PREDICTION), false);

  const payload = { district: 'Bugesera', production: 12500 };
  const tagged = tagEvidence(payload, DATA_CLASSIFICATIONS.OFFICIAL_OBSERVATION, { source: 'NISR SAS 2024' });

  assert.equal(tagged.classification, 'OFFICIAL_OBSERVATION');
  assert.equal(tagged.isOfficial, true);
  assert.equal(tagged.isSimulated, false);
  assert.equal(tagged.provenance.source, 'NISR SAS 2024');

  assert.throws(() => tagEvidence(payload, 'FABRICATED_DATA'), /Invalid data classification/);
});

test('Statistical engine safeguards missing values and prevents zero coercion', () => {
  assert.equal(toNumber(null), null);
  assert.equal(toNumber(undefined), null);
  assert.equal(toNumber(''), null);
  assert.equal(toNumber(0), 0);
  assert.equal(toNumber('142.5'), 142.5);

  // Missing values produce missing yield, never 0
  assert.equal(computeYield(null, 100), null);
  assert.equal(computeYield(100, null), null);
  assert.equal(computeYield(100, 0), null); // Zero area cannot calculate yield
  assert.equal(computeYield(100, -5), null); // Negative area is invalid
  assert.equal(computeYield(500, 250), 2.0); // 500 tonnes / 250 ha = 2.0 t/ha
});

test('Zero baseline protects against division-by-zero and false 100% declines', () => {
  // Baseline is zero
  const zeroBase = computeChange(50, 0);
  assert.equal(zeroBase.absoluteChange, 50);
  assert.equal(zeroBase.percentChange, null); // Cannot compute percentage on zero baseline
  assert.equal(zeroBase.reason, 'baseline_is_zero');

  // Both missing
  const bothMissing = computeChange(null, null);
  assert.equal(bothMissing.status, 'missing_data');
  assert.equal(bothMissing.absoluteChange, null);

  // Normal valid decline
  const validDecline = computeChange(80, 100);
  assert.equal(validDecline.status, 'decline');
  assert.equal(validDecline.absoluteChange, -20);
  assert.equal(validDecline.percentChange, -20);
});

test('Exact agricultural production decomposition recovers output change exactly', () => {
  // Baseline: 1000 ha, 2.0 t/ha -> 2000 tonnes
  // Current:  1100 ha, 2.2 t/ha -> 2420 tonnes
  // ΔProduction = +420 tonnes
  const decomp = decomposeProductionChange(2420, 1100, 2000, 1000);
  assert.ok(decomp);
  assert.equal(decomp.deltaProduction, 420);
  assert.equal(decomp.deltaArea, 100);
  assert.ok(Math.abs(decomp.deltaYield - 0.2) < 1e-6);

  // Area contribution = Y_base * ΔA = 2.0 * 100 = 200 tonnes
  assert.equal(decomp.areaContribution, 200);

  // Yield contribution = A_curr * ΔY = 1100 * 0.2 = 220 tonnes
  assert.ok(Math.abs(decomp.yieldContribution - 220) < 1e-6);

  // Total recovered difference = 200 + 220 = 420 tonnes
  assert.ok(Math.abs(decomp.recoveredDifference - 420) < 1e-6);
  assert.equal(decomp.exactRecovery, true);
});

test('Descriptive statistics and regression handle temporal trends deterministically', () => {
  const points = [
    { x: 2020, y: 100 },
    { x: 2021, y: 110 },
    { x: 2022, y: 120 },
    { x: 2023, y: 130 },
  ];

  const reg = linearRegression(points);
  assert.equal(reg.slope, 10); // +10 tonnes per year
  assert.equal(reg.rSquared, 1); // Perfect linear correlation
  assert.equal(reg.predict(2024), 140); // Forecast 2024 = 140 tonnes

  const expSmooth = simpleExponentialSmoothing([100, 110, 120, 130], 0.3);
  assert.ok(expSmooth.forecast > 100);
});

test('Model registry lists and validates model governance records', () => {
  const models = listModels();
  assert.ok(models.length >= 4);

  const riskModel = getModelInfo('RISK-MULTI-SIGNAL-V1');
  assert.equal(riskModel.status, 'active');
  assert.ok(riskModel.assumptions.length > 0);
  assert.ok(riskModel.evaluationMetrics.detectionSensitivity > 0.85);

  const twinModel = getModelInfo('TWIN-RAINFALL-RESPONSE-V1');
  assert.equal(twinModel.status, 'active');
  assert.ok(twinModel.elasticities.Maize > 0);
});
