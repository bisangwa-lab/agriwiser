import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceService } from '../src/lib/intelligence/evidence-service.js';
import { evaluateDistrictCropRisk, buildInvestigationProposal, RISK_LEVELS } from '../src/lib/intelligence/risk-engine.js';
import { runDigitalTwinSimulation, SCENARIO_TYPES } from '../src/lib/intelligence/digital-twin.js';
import { AIAnalystEngine, AI_CLAIM_TYPES } from '../src/lib/intelligence/ai-analyst.js';
import { DATA_CLASSIFICATIONS } from '../src/lib/intelligence/classification.js';

function makeMockIntegrationRepo() {
  const observations = [
    // Bugesera Maize Time Series 2022 - 2024
    {
      id: 'bg-2022-p', domain: 'crop', crop: 'Maize', geography: 'Bugesera', season: 'Season A', year: 2022,
      indicator: 'production', value: 16000, unit: 'tonnes', is_demo: false, dataset_id: 'nisr-sas-2022-ab', source_reference: 'SAS 2022, Table 3!D10'
    },
    {
      id: 'bg-2022-a', domain: 'crop', crop: 'Maize', geography: 'Bugesera', season: 'Season A', year: 2022,
      indicator: 'harvested_area', value: 8000, unit: 'hectares', is_demo: false, dataset_id: 'nisr-sas-2022-ab', source_reference: 'SAS 2022, Table 3!E10'
    },
    {
      id: 'bg-2023-p', domain: 'crop', crop: 'Maize', geography: 'Bugesera', season: 'Season A', year: 2023,
      indicator: 'production', value: 15500, unit: 'tonnes', is_demo: false, dataset_id: 'nisr-sas-2023-ab', source_reference: 'SAS 2023, Table 4!D10'
    },
    {
      id: 'bg-2023-a', domain: 'crop', crop: 'Maize', geography: 'Bugesera', season: 'Season A', year: 2023,
      indicator: 'harvested_area', value: 7800, unit: 'hectares', is_demo: false, dataset_id: 'nisr-sas-2023-ab', source_reference: 'SAS 2023, Table 4!E10'
    },
    {
      id: 'bg-2024-p', domain: 'crop', crop: 'Maize', geography: 'Bugesera', season: 'Season A', year: 2024,
      indicator: 'production', value: 9200, unit: 'tonnes', is_demo: false, dataset_id: 'nisr-sas-2024-ab', source_reference: 'SAS 2024, Table 5!D10'
    },
    {
      id: 'bg-2024-a', domain: 'crop', crop: 'Maize', geography: 'Bugesera', season: 'Season A', year: 2024,
      indicator: 'harvested_area', value: 6500, unit: 'hectares', is_demo: false, dataset_id: 'nisr-sas-2024-ab', source_reference: 'SAS 2024, Table 5!E10'
    },
  ];

  const datasets = [
    { id: 'nisr-sas-2024-ab', name: 'NISR SAS 2024', publisher: 'NISR', reporting_period: '2024' },
    { id: 'nisr-sas-2023-ab', name: 'NISR SAS 2023', publisher: 'NISR', reporting_period: '2023' },
    { id: 'nisr-sas-2022-ab', name: 'NISR SAS 2022', publisher: 'NISR', reporting_period: '2022' },
  ];

  return {
    async read({ entity, query = {} }) {
      if (entity === 'Dataset') return { items: datasets, has_more: false };
      if (entity === 'AgriculturalObservation') {
        const matches = observations.filter((obs) => {
          for (const [k, v] of Object.entries(query)) {
            if (obs[k] !== v) return false;
          }
          return true;
        });
        return { items: matches, has_more: false };
      }
      return { items: [], has_more: false };
    },
  };
}

test('Cross-Engine Integration - Full Analytical Lifecycle', async () => {
  const repo = makeMockIntegrationRepo();
  const user = { email: 'policy@minagri.gov.rw', role: 'policy_maker' };

  // Step 1: Query genuine time-series via EvidenceService
  const evidenceService = new EvidenceService(repo, user);
  const timeSeries = await evidenceService.getSeries('Bugesera', 'Maize', 'Season A');

  assert.equal(timeSeries.length, 3);
  assert.equal(timeSeries[0].year, 2022);
  assert.equal(timeSeries[1].year, 2023);
  assert.equal(timeSeries[2].year, 2024);
  assert.equal(timeSeries[2].production, 9200);
  assert.equal(timeSeries[2].harvestedArea, 6500);
  assert.ok(timeSeries[2].derivedYield > 0);

  // Step 2: Run Risk Engine multi-signal anomaly evaluation
  const climateContext = {
    rainfall: 220,
    normalRainfall: 340,
    rainfallAnomalyPct: -35.3,
  };

  const riskAssessment = evaluateDistrictCropRisk(timeSeries, climateContext);

  assert.equal(riskAssessment.district, 'Bugesera');
  assert.equal(riskAssessment.crop, 'Maize');
  assert.ok(riskAssessment.compositeScore >= 60, `Score was ${riskAssessment.compositeScore}`);
  assert.ok([RISK_LEVELS.HIGH, RISK_LEVELS.CRITICAL].includes(riskAssessment.riskLevel));
  assert.ok(riskAssessment.signals.length >= 2);
  assert.ok(riskAssessment.prediction !== null);
  assert.equal(riskAssessment.prediction.targetSeasonYear, 2025);

  // Step 3: Dispatch Field Operations investigation proposal
  const proposal = buildInvestigationProposal(riskAssessment);
  assert.equal(proposal.geography, 'Bugesera');
  assert.equal(proposal.category, 'agricultural_risk');
  assert.equal(proposal.status, 'draft');
  assert.ok(proposal.evidence.compositeScore >= 60);

  // Step 4: Run Digital Twin Policy Simulator on the affected baseline
  const baseline = timeSeries[2]; // 2024 observation
  const simulation = runDigitalTwinSimulation(baseline, {
    scenarioType: SCENARIO_TYPES.IRRIGATION,
    parameters: { newlyIrrigatedHectares: 1500 },
    title: 'Bugesera Emergency Irrigation Rehabilitation',
  });

  assert.equal(simulation.classification, DATA_CLASSIFICATIONS.SCENARIO_OUTPUT);
  assert.equal(simulation.baseline.productionTonnes, 9200);
  assert.ok(simulation.simulated.productionTonnes > 9200);
  assert.ok(simulation.comparison.absoluteProductionDifference > 0);

  // Step 5: AI Analyst queries the situation and provides an evidence-grounded finding
  const aiAnalyst = new AIAnalystEngine(repo, user);
  const aiResponse = await aiAnalyst.answerResearchQuestion('Why did Maize decline in Bugesera Season A?');

  assert.ok(aiResponse.finding.includes('Bugesera'));
  assert.ok(aiResponse.supportingEvidence.length > 0);
  assert.equal(aiResponse.claimClassification, AI_CLAIM_TYPES.DERIVED_STATISTIC);

  // Step 6: Create immutable evidence snapshot
  const snapshot = await evidenceService.createSnapshot('Bugesera 2024 Maize Risk & Simulation Dossier', {
    timeSeries,
    riskAssessment,
    simulation,
    aiResponse,
  });

  assert.ok(snapshot.id.startsWith('snap-'));
  assert.ok(snapshot.hash.startsWith('sha256-'));
  assert.equal(snapshot.creator, 'policy@minagri.gov.rw');
});
