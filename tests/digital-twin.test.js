import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENARIO_TYPES,
  runDigitalTwinSimulation,
} from '../src/lib/intelligence/digital-twin.js';
import { DATA_CLASSIFICATIONS } from '../src/lib/intelligence/classification.js';

const baselineNyagatareMaize = {
  district: 'Nyagatare',
  crop: 'Maize',
  season: 'Season A',
  year: 2024,
  production: 20000,
  harvestedArea: 10000,
  derivedYield: 2.0,
  datasetId: 'nisr-sas-2024-ab',
  sourceReference: 'SAS 2024 Tables, Table 10!D4',
};

function assertSensitivityCenterMatches(result) {
  const center = result.sensitivityAnalysis.find((point) => point.variationPct === 0);
  assert.ok(center, 'sensitivity analysis includes the selected input value');
  assert.equal(center.simulatedProductionTonnes, result.simulated.productionTonnes);
}

test('Digital Twin - throws on missing or invalid baseline', () => {
  assert.throws(() => runDigitalTwinSimulation(null, {}), /valid, verified baseline/);
  assert.throws(() => runDigitalTwinSimulation({ production: null }, {}), /valid, verified baseline/);
  assert.throws(() => runDigitalTwinSimulation({ production: 1000, harvestedArea: null }, {}), /valid, verified baseline/);
});

test('Digital Twin - rainfall shock scenario computes deterministic yield change', () => {
  // -20% rainfall anomaly on Maize (elasticity 0.72)
  // yieldShift = 0.72 * (-0.2) * (1 - 0.15 * 0.2) = -0.13968 (-13.97%)
  // Baseline: 20,000 t, 10,000 ha, 2.0 t/ha
  // Simulated yield = 2.0 * (1 - 0.13968) = 1.72064 t/ha -> 1.721 t/ha
  // Simulated prod = 10,000 * 1.72064 = 17,206.4 t
  const result = runDigitalTwinSimulation(baselineNyagatareMaize, {
    scenarioType: SCENARIO_TYPES.RAINFALL,
    parameters: { rainfallDeltaPct: -20 },
    title: 'Drought Impact Assessment',
  });

  assert.equal(result.classification, DATA_CLASSIFICATIONS.SCENARIO_OUTPUT);
  assert.equal(result.isSimulated, true);
  assert.equal(result.baseline.productionTonnes, 20000);
  assert.equal(result.simulated.productionTonnes, 17206.4);
  assert.equal(result.simulated.derivedYieldTonnesPerHa, 1.721);
  assert.equal(result.comparison.absoluteProductionDifference, -2793.6);
  assert.equal(result.comparison.percentProductionDifference, -14);
  assert.ok(result.sensitivityAnalysis.length >= 5);
  assertSensitivityCenterMatches(result);
});

test('Digital Twin - irrigation expansion scenario models yield uplift on expanded area', () => {
  // Baseline: 20,000 t, 10,000 ha (2.0 t/ha)
  // Expand irrigation by 2,000 ha with standard multiplier 1.65x
  // Rainfed area: 8,000 ha * 2.0 = 16,000 t
  // Irrigated area: 2,000 ha * (2.0 * 1.65 = 3.3) = 6,600 t
  // Total simulated prod = 22,600 t (+2,600 t, +13%)
  const result = runDigitalTwinSimulation(baselineNyagatareMaize, {
    scenarioType: SCENARIO_TYPES.IRRIGATION,
    parameters: { newlyIrrigatedHectares: 2000 },
  });

  assert.equal(result.baseline.productionTonnes, 20000);
  assert.equal(result.simulated.productionTonnes, 22600);
  assert.equal(result.simulated.derivedYieldTonnesPerHa, 2.26);
  assert.equal(result.comparison.absoluteProductionDifference, 2600);
  assert.equal(result.comparison.percentProductionDifference, 13);
  assertSensitivityCenterMatches(result);
});

test('Digital Twin - agronomic productivity scenario elevates crop yield directly', () => {
  // +25% yield uplift on same 10,000 ha
  // Baseline yield 2.0 t/ha -> 2.5 t/ha
  // Simulated prod = 25,000 t (+5,000 t, +25%)
  const result = runDigitalTwinSimulation(baselineNyagatareMaize, {
    scenarioType: SCENARIO_TYPES.PRODUCTIVITY,
    parameters: { yieldIncreasePct: 25 },
  });

  assert.equal(result.simulated.derivedYieldTonnesPerHa, 2.5);
  assert.equal(result.simulated.productionTonnes, 25000);
  assert.equal(result.comparison.absoluteProductionDifference, 5000);
  assert.equal(result.comparison.percentProductionDifference, 25);
  assertSensitivityCenterMatches(result);
});

test('Digital Twin - harvested land reallocation scenario', () => {
  // +10% harvested area expansion (10,000 -> 11,000 ha) at constant yield 2.0 t/ha
  // Simulated prod = 22,000 t (+2,000 t, +10%)
  const result = runDigitalTwinSimulation(baselineNyagatareMaize, {
    scenarioType: SCENARIO_TYPES.HARVESTED_AREA,
    parameters: { areaDeltaPct: 10 },
  });

  assert.equal(result.simulated.harvestedAreaHectares, 11000);
  assert.equal(result.simulated.productionTonnes, 22000);
  assert.equal(result.comparison.absoluteAreaDifference, 1000);
  assert.equal(result.comparison.absoluteProductionDifference, 2000);
  assertSensitivityCenterMatches(result);
});

test('Digital Twin - combined multi-factor scenario accounts for area & yield interaction', () => {
  // +10% area (11,000 ha), newly irrigated 1,000 ha, +10% input boost
  const result = runDigitalTwinSimulation(baselineNyagatareMaize, {
    scenarioType: SCENARIO_TYPES.COMBINED,
    parameters: { areaDeltaPct: 10, yieldIncreasePct: 10, newlyIrrigatedHectares: 1000 },
  });

  assert.equal(result.simulated.harvestedAreaHectares, 11000);
  assert.ok(result.simulated.productionTonnes > 20000);
  assert.ok(result.comparison.absoluteProductionDifference > 0);
  assert.ok(result.assumptions.length >= 2);
  assertSensitivityCenterMatches(result);
});

test('Digital Twin - budget allocation scenario computes intervention portfolio impact', () => {
  // Budget = 500,000,000 RWF (500M)
  // Cost per ha irrigation = 2,500,000 RWF
  // 100% to irrigation -> 200 ha funded
  // 200 ha * (2.0 * 0.65) = 260 tonnes incremental output
  const result = runDigitalTwinSimulation(baselineNyagatareMaize, {
    scenarioType: SCENARIO_TYPES.BUDGET_ALLOCATION,
    parameters: {
      totalBudgetRwf: 500000000,
      irrigationBudgetPct: 100,
      seedSubsidyBudgetPct: 0,
      soilLimeBudgetPct: 0,
    },
  });

  assert.ok(result.simulated.productionTonnes > result.baseline.productionTonnes);
  assert.equal(result.comparison.absoluteProductionDifference, 260);
  assert.ok(result.assumptions.length >= 1);
  assert.ok(result.scientificCaveat.includes('not an empirical observation'));
  assertSensitivityCenterMatches(result);
});
