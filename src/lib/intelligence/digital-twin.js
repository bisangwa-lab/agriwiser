/**
 * AGRIWISER — AGRICULTURAL DIGITAL TWIN & POLICY SIMULATOR
 *
 * Implements Innovation Two:
 * - Deterministic, reproducible simulation engine built on verified baselines
 * - Six supported scenario models:
 *     1. Rainfall Variation Scenario
 *     2. Irrigation Modernization Scenario
 *     3. Agronomic Productivity Scenario
 *     4. Harvested Land Reallocation Scenario
 *     5. Combined Multi-Factor Scenario
 *     6. Budget-Constrained Intervention Portfolio Scenario
 * - Sensitivity analysis & parameter sweeping
 * - Strict provenance: original baseline, explicit assumptions, and limitations preserved
 */

import { DATA_CLASSIFICATIONS, tagEvidence } from './classification.js';
import { toNumber, computeYield } from './statistical-engine.js';
import { getModelInfo } from './model-registry.js';

export const SCENARIO_TYPES = Object.freeze({
  RAINFALL: 'rainfall',
  IRRIGATION: 'irrigation',
  PRODUCTIVITY: 'productivity',
  HARVESTED_AREA: 'harvested_area',
  COMBINED: 'combined',
  BUDGET_ALLOCATION: 'budget_allocation',
});

/**
 * Runs a deterministic policy scenario against an authentic baseline.
 *
 * @param {Object} baseline - Verified real-data point { district, crop, season, year, production, harvestedArea, derivedYield, datasetId, sourceReference }
 * @param {Object} scenarioConfig - { scenarioType, parameters, description }
 */
export function runDigitalTwinSimulation(baseline, scenarioConfig) {
  if (!baseline || toNumber(baseline.production) === null || toNumber(baseline.harvestedArea) === null) {
    throw new Error('Digital Twin simulation requires a valid, verified baseline with production and harvested area.');
  }

  const baseProd = Number(baseline.production);
  const baseArea = Number(baseline.harvestedArea);
  const baseYield = baseline.derivedYield ?? (baseArea > 0 ? baseProd / baseArea : 0);

  const { scenarioType, parameters = {}, title = 'Custom Scenario' } = scenarioConfig;

  let simulatedProd = baseProd;
  let simulatedArea = baseArea;
  let simulatedYield = baseYield;
  let modelUsed = null;
  const appliedAssumptions = [];
  const formulas = [];

  switch (scenarioType) {
    case SCENARIO_TYPES.RAINFALL: {
      modelUsed = getModelInfo('TWIN-RAINFALL-RESPONSE-V1');
      const rainfallDeltaPct = Number(parameters.rainfallDeltaPct ?? 0); // e.g. -20 for 20% drought
      const cropElasticity = modelUsed.elasticities[baseline.crop] ?? modelUsed.elasticities.Default;

      // Yield response modeled with non-linear diminishing return around normal
      // ΔYield% = Elasticity * (ΔRainfall% / 100) * (1 - 0.2 * (ΔRainfall% / 100))
      const yieldShiftFraction = cropElasticity * (rainfallDeltaPct / 100) * (1 - 0.15 * Math.abs(rainfallDeltaPct / 100));
      simulatedYield = Math.max(0.05, baseYield * (1 + yieldShiftFraction));
      simulatedProd = simulatedArea * simulatedYield;

      appliedAssumptions.push(`Rainfall departure of ${rainfallDeltaPct > 0 ? '+' : ''}${rainfallDeltaPct}% applied against baseline.`);
      appliedAssumptions.push(`Empirical crop rainfall elasticity of ${cropElasticity} applied for ${baseline.crop}.`);
      formulas.push('Yield_sim = Yield_base * (1 + Elasticity * (ΔRain% / 100) * (1 - 0.15 * |ΔRain% / 100|))');
      formulas.push('Production_sim = Area_base * Yield_sim');
      break;
    }

    case SCENARIO_TYPES.IRRIGATION: {
      modelUsed = getModelInfo('TWIN-IRRIGATION-EXPANSION-V1');
      const newlyIrrigatedHa = Math.min(baseArea, Math.max(0, Number(parameters.newlyIrrigatedHectares ?? 0)));
      const yieldMultiplier = modelUsed.productivityMultiplier; // 1.65

      const rainfedRemainingHa = Math.max(0, baseArea - newlyIrrigatedHa);
      const rainfedProd = rainfedRemainingHa * baseYield;
      const irrigatedYield = baseYield * yieldMultiplier;
      const irrigatedProd = newlyIrrigatedHa * irrigatedYield;

      simulatedProd = rainfedProd + irrigatedProd;
      simulatedArea = baseArea;
      simulatedYield = simulatedArea > 0 ? simulatedProd / simulatedArea : baseYield;

      appliedAssumptions.push(`Converted ${newlyIrrigatedHa.toLocaleString()} hectares to modern irrigation schemes.`);
      appliedAssumptions.push(`Yield multiplier of ${yieldMultiplier}x achieved on irrigated parcels through moisture stabilization.`);
      formulas.push('Production_sim = (Area_rainfed * Yield_base) + (Area_irrigated * (Yield_base * 1.65))');
      formulas.push('Yield_sim = Production_sim / Area_total');
      break;
    }

    case SCENARIO_TYPES.PRODUCTIVITY: {
      const yieldIncreasePct = Number(parameters.yieldIncreasePct ?? 15); // e.g. +15%
      simulatedYield = Math.max(0, baseYield * (1 + yieldIncreasePct / 100));
      simulatedProd = baseArea * simulatedYield;

      appliedAssumptions.push(`Targeted agronomic intervention (certified seeds, targeted fertilizer) delivers +${yieldIncreasePct}% yield efficiency.`);
      formulas.push('Yield_sim = Yield_base * (1 + yieldIncreasePct / 100)');
      formulas.push('Production_sim = Area_base * Yield_sim');
      break;
    }

    case SCENARIO_TYPES.HARVESTED_AREA: {
      modelUsed = getModelInfo('TWIN-AREA-REALLOCATION-V1');
      const areaDeltaPct = Number(parameters.areaDeltaPct ?? 0); // e.g. +10%
      simulatedArea = Math.max(1, baseArea * (1 + areaDeltaPct / 100));
      simulatedProd = simulatedArea * baseYield;
      simulatedYield = baseYield;

      appliedAssumptions.push(`Harvested area shifted by ${areaDeltaPct > 0 ? '+' : ''}${areaDeltaPct}% under district land management.`);
      appliedAssumptions.push('Average land productivity retained on newly cultivated hectares.');
      formulas.push('Area_sim = Area_base * (1 + areaDeltaPct / 100)');
      formulas.push('Production_sim = Area_sim * Yield_base');
      break;
    }

    case SCENARIO_TYPES.COMBINED: {
      // Combines rainfall anomaly, irrigation buffer, and productivity gains
      const rainShift = Number(parameters.rainfallDeltaPct ?? 0);
      const irrigatedHa = Math.min(baseArea, Math.max(0, Number(parameters.newlyIrrigatedHectares ?? 0)));
      const inputBoostPct = Number(parameters.yieldIncreasePct ?? 0);
      const areaShiftPct = Number(parameters.areaDeltaPct ?? 0);

      const rainModel = getModelInfo('TWIN-RAINFALL-RESPONSE-V1');
      const elasticity = rainModel.elasticities[baseline.crop] ?? rainModel.elasticities.Default;
      const rainStressFactor = 1 + elasticity * (rainShift / 100) * (1 - 0.15 * Math.abs(rainShift / 100));

      simulatedArea = Math.max(1, baseArea * (1 + areaShiftPct / 100));
      const rainfedHa = Math.max(0, simulatedArea - irrigatedHa);

      const rainfedYield = Math.max(0.1, baseYield * rainStressFactor * (1 + inputBoostPct / 100));
      const irrigatedYield = Math.max(0.1, baseYield * 1.65 * (1 + inputBoostPct / 100)); // insulated from rain stress

      simulatedProd = rainfedHa * rainfedYield + irrigatedHa * irrigatedYield;
      simulatedYield = simulatedArea > 0 ? simulatedProd / simulatedArea : baseYield;

      appliedAssumptions.push(`Combined scenario: Rainfall ${rainShift}%, Irrigated ${irrigatedHa} ha, Inputs +${inputBoostPct}%, Area ${areaShiftPct}%.`);
      appliedAssumptions.push('Irrigated parcels insulated from rainfall stress while receiving input uplift.');
      formulas.push('Production_sim = (Area_rainfed * Yield_rainfed) + (Area_irrigated * Yield_irrigated)');
      break;
    }

    case SCENARIO_TYPES.BUDGET_ALLOCATION: {
      modelUsed = getModelInfo('TWIN-BUDGET-PORTFOLIO-V1');
      const totalBudgetRwf = Math.max(0, Number(parameters.totalBudgetRwf ?? 100000000)); // default 100M RWF
      const irrigationPct = Number(parameters.irrigationBudgetPct ?? 50) / 100;
      const seedSubsidyPct = Number(parameters.seedSubsidyBudgetPct ?? 30) / 100;
      const soilLimePct = Number(parameters.soilLimeBudgetPct ?? 20) / 100;

      const irrigationBudget = totalBudgetRwf * irrigationPct;
      const seedBudget = totalBudgetRwf * seedSubsidyPct;
      const limeBudget = totalBudgetRwf * soilLimePct;

      const irrigatedHaFunded = Math.min(baseArea, Math.floor(irrigationBudget / modelUsed.unitCosts.irrigationPerHectareRwf));
      const seedHaFunded = Math.min(baseArea, Math.floor(seedBudget / modelUsed.unitCosts.improvedSeedSubsidyPerHaRwf));
      const limeHaFunded = Math.min(baseArea, Math.floor(limeBudget / modelUsed.unitCosts.limeSoilConditioningPerHaRwf));

      // Agronomic calculations:
      // Irrigated ha gets +65%
      // Seed ha gets +18%
      // Lime ha gets +12%
      const irrigationContribution = irrigatedHaFunded * (baseYield * 0.65);
      const seedContribution = seedHaFunded * (baseYield * 0.18);
      const limeContribution = limeHaFunded * (baseYield * 0.12);

      simulatedProd = baseProd + irrigationContribution + seedContribution + limeContribution;
      simulatedArea = baseArea;
      simulatedYield = simulatedArea > 0 ? simulatedProd / simulatedArea : baseYield;

      appliedAssumptions.push(`Allocated ${totalBudgetRwf.toLocaleString()} RWF: ${irrigationBudget.toLocaleString()} RWF for irrigation (${irrigatedHaFunded} ha), ${seedBudget.toLocaleString()} RWF for certified seeds (${seedHaFunded} ha), and ${limeBudget.toLocaleString()} RWF for soil conditioning (${limeHaFunded} ha).`);
      formulas.push('Production_sim = Base_Prod + (Ha_irr * 0.65 * Y_base) + (Ha_seed * 0.18 * Y_base) + (Ha_lime * 0.12 * Y_base)');
      break;
    }

    default:
      throw new Error(`Unknown scenario type: ${scenarioType}`);
  }

  const deltaProd = simulatedProd - baseProd;
  const deltaProdPct = baseProd > 0 ? (deltaProd / baseProd) * 100 : null;
  const deltaYield = simulatedYield - baseYield;
  const deltaYieldPct = baseYield > 0 ? (deltaYield / baseYield) * 100 : null;
  const deltaArea = simulatedArea - baseArea;

  // --- SENSITIVITY ANALYSIS SWEEP (-20% to +20% variation on primary driver) ---
  const sensitivity = [-20, -10, 0, 10, 20].map((step) => {
    let sweptProd = simulatedProd;
    if (scenarioType === SCENARIO_TYPES.RAINFALL) {
      const sweptDelta = (parameters.rainfallDeltaPct ?? 0) + step;
      const el = (modelUsed?.elasticities?.[baseline.crop] ?? 0.5);
      sweptProd = baseProd * (1 + el * (sweptDelta / 100));
    } else {
      sweptProd = simulatedProd * (1 + (step / 100) * 0.8);
    }
    return {
      variationPct: step,
      simulatedProductionTonnes: Math.round(sweptProd),
      differenceTonnes: Math.round(sweptProd - baseProd),
    };
  });

  return tagEvidence(
    {
      scenarioId: 'scen-' + crypto.randomUUID(),
      title,
      scenarioType,
      baseline: {
        district: baseline.district || baseline.geography,
        crop: baseline.crop,
        season: baseline.season,
        year: baseline.year,
        productionTonnes: baseProd,
        harvestedAreaHectares: baseArea,
        derivedYieldTonnesPerHa: Math.round(baseYield * 1000) / 1000,
        datasetId: baseline.datasetId || baseline.dataset_id,
        sourceReference: baseline.sourceReference || baseline.source_reference,
      },
      simulated: {
        productionTonnes: Math.round(simulatedProd * 10) / 10,
        harvestedAreaHectares: Math.round(simulatedArea * 10) / 10,
        derivedYieldTonnesPerHa: Math.round(simulatedYield * 1000) / 1000,
      },
      comparison: {
        absoluteProductionDifference: Math.round(deltaProd * 10) / 10,
        percentProductionDifference: deltaProdPct !== null ? Math.round(deltaProdPct * 10) / 10 : null,
        absoluteYieldDifference: Math.round(deltaYield * 1000) / 1000,
        percentYieldDifference: deltaYieldPct !== null ? Math.round(deltaYieldPct * 10) / 10 : null,
        absoluteAreaDifference: Math.round(deltaArea * 10) / 10,
      },
      parameters,
      assumptions: appliedAssumptions,
      mathematicalFormulas: formulas,
      sensitivityAnalysis: sensitivity,
      executionTimestamp: new Date().toISOString(),
      modelMetadata: {
        id: modelUsed?.id || 'CUSTOM-SIMULATOR',
        name: modelUsed?.name || 'Deterministic Agronomic Simulator',
        version: modelUsed?.version || '1.0.0',
      },
      scientificCaveat:
        'A simulation is a deterministic exploration of explicit assumptions, not an empirical observation or established causal impact. Real-world outcomes depend on seasonal execution, weather variability, and local agronomic adherence.',
    },
    DATA_CLASSIFICATIONS.SCENARIO_OUTPUT,
    {
      baselineYear: baseline.year,
      baselineSeason: baseline.season,
      datasetId: baseline.datasetId || baseline.dataset_id,
    }
  );
}
