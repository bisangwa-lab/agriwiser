import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RISK_LEVELS,
  getRiskLevel,
  evaluateDistrictCropRisk,
  buildInvestigationProposal,
} from '../src/lib/intelligence/risk-engine.js';
import { DATA_CLASSIFICATIONS } from '../src/lib/intelligence/classification.js';

test('Risk Engine - risk level thresholds', () => {
  assert.equal(getRiskLevel(0), RISK_LEVELS.LOW);
  assert.equal(getRiskLevel(15), RISK_LEVELS.LOW);
  assert.equal(getRiskLevel(20), RISK_LEVELS.MODERATE);
  assert.equal(getRiskLevel(39), RISK_LEVELS.MODERATE);
  assert.equal(getRiskLevel(40), RISK_LEVELS.ELEVATED);
  assert.equal(getRiskLevel(59), RISK_LEVELS.ELEVATED);
  assert.equal(getRiskLevel(60), RISK_LEVELS.HIGH);
  assert.equal(getRiskLevel(79), RISK_LEVELS.HIGH);
  assert.equal(getRiskLevel(80), RISK_LEVELS.CRITICAL);
  assert.equal(getRiskLevel(100), RISK_LEVELS.CRITICAL);
});

test('Risk Engine - insufficient history requires at least two seasons', () => {
  const emptyRes = evaluateDistrictCropRisk([]);
  assert.equal(emptyRes.status, 'insufficient_history');
  assert.equal(emptyRes.riskLevel, RISK_LEVELS.LOW);
  assert.equal(emptyRes.prediction, null);

  const singleRes = evaluateDistrictCropRisk([
    { year: 2024, district: 'Bugesera', crop: 'Maize', season: 'Season A', production: 12000, harvestedArea: 6000 }
  ]);
  assert.equal(singleRes.status, 'insufficient_history');
  assert.equal(singleRes.confidence, 0.1);
});

test('Risk Engine - acute agricultural decline triggers elevated/high risk', () => {
  // Baseline 2023: 10,000 tonnes, 5,000 ha (yield 2.0 t/ha)
  // Current 2024:   6,500 tonnes, 4,800 ha (yield 1.354 t/ha) -> 35% prod decline, yield drop -0.646 t/ha
  const history = [
    { year: 2022, district: 'Nyagatare', crop: 'Maize', season: 'Season A', production: 9800, harvestedArea: 5000, derivedYield: 1.96 },
    { year: 2023, district: 'Nyagatare', crop: 'Maize', season: 'Season A', production: 10000, harvestedArea: 5000, derivedYield: 2.0 },
    { year: 2024, district: 'Nyagatare', crop: 'Maize', season: 'Season A', production: 6500, harvestedArea: 4800, derivedYield: 1.354 },
  ];

  const assessment = evaluateDistrictCropRisk(history);

  assert.equal(assessment.district, 'Nyagatare');
  assert.equal(assessment.crop, 'Maize');
  assert.equal(assessment.currentYear, 2024);
  assert.ok(assessment.compositeScore >= 60, `Score was ${assessment.compositeScore}, expected >= 60`);
  assert.ok(assessment.riskLevel === RISK_LEVELS.HIGH || assessment.riskLevel === RISK_LEVELS.CRITICAL);

  // Check signals detected
  const prodSignal = assessment.signals.find((s) => s.id === 'SIG-PROD-DECLINE');
  assert.ok(prodSignal, 'Must trigger production decline signal');
  assert.equal(prodSignal.severity, 'critical');

  const yieldSignal = assessment.signals.find((s) => s.id === 'SIG-YIELD-DROP');
  assert.ok(yieldSignal, 'Must trigger yield drop signal');
  assert.equal(yieldSignal.severity, 'high');
});

test('Risk Engine - multi-signal climate stress amplifies risk to CRITICAL', () => {
  const history = [
    { year: 2023, district: 'Bugesera', crop: 'Beans', season: 'Season B', production: 8000, harvestedArea: 7000, derivedYield: 1.14 },
    { year: 2024, district: 'Bugesera', crop: 'Beans', season: 'Season B', production: 4800, harvestedArea: 5000, derivedYield: 0.96 },
  ];

  const climateContext = {
    rainfall: 180,
    normalRainfall: 320,
    rainfallAnomalyPct: -43.75, // Severe rainfall deficit > 35%
    temperatureAnomalyC: 1.8,
  };

  const assessment = evaluateDistrictCropRisk(history, climateContext);

  assert.ok(assessment.compositeScore >= 80, `Expected CRITICAL score, got ${assessment.compositeScore}`);
  assert.equal(assessment.riskLevel, RISK_LEVELS.CRITICAL);

  const climateSignal = assessment.signals.find((s) => s.id === 'SIG-RAINFALL-DEFICIT');
  assert.ok(climateSignal, 'Must trigger climate rainfall deficit signal');
  assert.equal(climateSignal.severity, 'critical');
});

test('Risk Engine - validated prediction generates bounded forecasts', () => {
  const history = [
    { year: 2021, district: 'Gatsibo', crop: 'Maize', season: 'Season A', production: 12000, harvestedArea: 6000, derivedYield: 2.0 },
    { year: 2022, district: 'Gatsibo', crop: 'Maize', season: 'Season A', production: 12500, harvestedArea: 6100, derivedYield: 2.05 },
    { year: 2023, district: 'Gatsibo', crop: 'Maize', season: 'Season A', production: 11800, harvestedArea: 5900, derivedYield: 2.0 },
    { year: 2024, district: 'Gatsibo', crop: 'Maize', season: 'Season A', production: 11200, harvestedArea: 5800, derivedYield: 1.93 },
  ];

  const assessment = evaluateDistrictCropRisk(history);

  assert.ok(assessment.prediction, 'Prediction must be generated for >= 3 points');
  assert.equal(assessment.prediction.targetSeasonYear, 2025);
  assert.ok(assessment.prediction.projectedProductionTonnes > 0);
  assert.ok(assessment.prediction.lowerBound90 >= 0);
  assert.ok(assessment.prediction.upperBound90 > assessment.prediction.lowerBound90);
  assert.equal(assessment.prediction.classification, DATA_CLASSIFICATIONS.MODEL_PREDICTION);
});

test('Risk Engine - persistent decline requires consecutive comparable years and shows each comparison', () => {
  const history = [
    { year: 2022, district: 'Rwamagana', crop: 'Maize', season: 'Season A', production: 10000, sources: { production: { unit: 'metric tonnes' } } },
    { year: 2023, district: 'Rwamagana', crop: 'Maize', season: 'Season A', production: 9400, sources: { production: { unit: 'metric tonnes' } } },
    { year: 2024, district: 'Rwamagana', crop: 'Maize', season: 'Season A', production: 8400, sources: { production: { unit: 'metric tonnes' } } },
  ];
  const assessment = evaluateDistrictCropRisk(history);
  const signal = assessment.signals.find((item) => item.id === 'SIG-PERSISTENT-DECLINE');
  assert.ok(signal);
  assert.equal(signal.severity, 'moderate');
  assert.equal(signal.score, 45);
  assert.deepEqual(signal.comparisonValues.map((point) => point.year), [2022, 2023, 2024]);
  assert.deepEqual(signal.yearToYearChanges.map((item) => [item.fromYear, item.toYear]), [[2022, 2023], [2023, 2024]]);
});

test('Risk Engine - mild two-year decline is not labeled critical or persistent', () => {
  const assessment = evaluateDistrictCropRisk([
    { year: 2024, district: 'Rwamagana', crop: 'Maize', season: 'Season A', production: 18669.17, sources: { production: { unit: 'metric tonnes' } } },
    { year: 2025, district: 'Rwamagana', crop: 'Maize', season: 'Season A', production: 18000, sources: { production: { unit: 'metric tonnes' } } },
    { year: 2026, district: 'Rwamagana', crop: 'Maize', season: 'Season A', production: 17311.14, sources: { production: { unit: 'metric tonnes' } } },
  ]);
  assert.equal(assessment.status, 'no_signals');
  assert.equal(assessment.persistentDecline, false);
  assert.equal(assessment.signals.some((item) => item.id === 'SIG-PERSISTENT-DECLINE'), false);
});

test('Risk Engine - gaps in years or mismatched units do not confirm persistent decline', () => {
  const base = [
    { year: 2022, district: 'Rwamagana', crop: 'Maize', season: 'Season A', production: 10000, sources: { production: { unit: 'metric tonnes' } } },
    { year: 2023, district: 'Rwamagana', crop: 'Maize', season: 'Season A', production: 9000, sources: { production: { unit: 'metric tonnes' } } },
    { year: 2024, district: 'Rwamagana', crop: 'Maize', season: 'Season A', production: 8000, sources: { production: { unit: 'metric tonnes' } } },
  ];
  const gap = evaluateDistrictCropRisk([base[0], { ...base[2], year: 2025 }, { ...base[2], year: 2026, production: 7000 }]);
  const mismatch = evaluateDistrictCropRisk([base[0], base[1], { ...base[2], sources: { production: { unit: 'kilograms' } } }]);
  assert.equal(gap.persistentDecline, false);
  assert.equal(mismatch.persistentDecline, false);
});

test('Risk Engine - buildInvestigationProposal constructs valid Field Operations handoff', () => {
  const history = [
    { year: 2023, district: 'Kayonza', crop: 'Maize', season: 'Season A', production: 15000, harvestedArea: 7500, derivedYield: 2.0 },
    { year: 2024, district: 'Kayonza', crop: 'Maize', season: 'Season A', production: 8000, harvestedArea: 7000, derivedYield: 1.14 },
  ];

  const assessment = evaluateDistrictCropRisk(history);
  const proposal = buildInvestigationProposal(assessment);

  assert.ok(proposal.title.includes('Kayonza'));
  assert.ok(proposal.title.includes('Maize'));
  assert.equal(proposal.geography, 'Kayonza');
  assert.equal(proposal.crop, 'Maize');
  assert.equal(proposal.season, 'Season A');
  assert.equal(proposal.year, 2024);
  assert.equal(proposal.status, 'draft');
  assert.equal(proposal.source, 'risk_engine');
  assert.ok(proposal.evidence.compositeScore >= 60);
  assert.ok(proposal.suggestedVerificationTasks.length >= 3);
});
