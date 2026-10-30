import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AIAnalystEngine,
  AI_CLAIM_TYPES,
  AI_ANALYST_TOOLS,
} from '../src/lib/intelligence/ai-analyst.js';
import { DATA_CLASSIFICATIONS } from '../src/lib/intelligence/classification.js';

function createMockRepository() {
  const datasets = [
    {
      id: 'nisr-sas-2024-ab',
      name: 'NISR Seasonal Agricultural Survey 2024',
      publisher: 'National Institute of Statistics of Rwanda (NISR)',
      reporting_period: '2024 Season A & B',
      source_url: 'https://statistics.gov.rw/sas-2024',
    },
    {
      id: 'nisr-sas-2023-ab',
      name: 'NISR Seasonal Agricultural Survey 2023',
      publisher: 'National Institute of Statistics of Rwanda (NISR)',
      reporting_period: '2023 Season A & B',
      source_url: 'https://statistics.gov.rw/sas-2023',
    },
  ];

  const observations = [
    {
      id: 'obs-1',
      domain: 'crop',
      crop: 'Maize',
      geography: 'Bugesera',
      season: 'Season A',
      year: 2023,
      indicator: 'production',
      value: 15000,
      unit: 'tonnes',
      is_demo: false,
      dataset_id: 'nisr-sas-2023-ab',
      source_reference: 'SAS 2023, Table 4!C12',
    },
    {
      id: 'obs-2',
      domain: 'crop',
      crop: 'Maize',
      geography: 'Bugesera',
      season: 'Season A',
      year: 2024,
      indicator: 'production',
      value: 9000,
      unit: 'tonnes',
      is_demo: false,
      dataset_id: 'nisr-sas-2024-ab',
      source_reference: 'SAS 2024, Table 5!C14',
    },
    {
      id: 'obs-3',
      domain: 'crop',
      crop: 'Maize',
      geography: 'Nyagatare',
      season: 'Season A',
      year: 2023,
      indicator: 'production',
      value: 25000,
      unit: 'tonnes',
      is_demo: false,
      dataset_id: 'nisr-sas-2023-ab',
      source_reference: 'SAS 2023, Table 4!C15',
    },
    {
      id: 'obs-4',
      domain: 'crop',
      crop: 'Maize',
      geography: 'Nyagatare',
      season: 'Season A',
      year: 2024,
      indicator: 'production',
      value: 26000,
      unit: 'tonnes',
      is_demo: false,
      dataset_id: 'nisr-sas-2024-ab',
      source_reference: 'SAS 2024, Table 5!C18',
    },
    {
      id: 'obs-5',
      domain: 'crop',
      crop: 'Maize',
      geography: 'Bugesera',
      season: 'Season A',
      year: 2023,
      indicator: 'harvested_area',
      value: 7500,
      unit: 'hectares',
      is_demo: false,
      dataset_id: 'nisr-sas-2023-ab',
      source_reference: 'SAS 2023, Table 4!D12',
    },
    {
      id: 'obs-6',
      domain: 'crop',
      crop: 'Maize',
      geography: 'Bugesera',
      season: 'Season A',
      year: 2024,
      indicator: 'harvested_area',
      value: 6000,
      unit: 'hectares',
      is_demo: false,
      dataset_id: 'nisr-sas-2024-ab',
      source_reference: 'SAS 2024, Table 5!D14',
    },
  ];

  return {
    async read({ entity, query = {} }) {
      if (entity === 'Dataset') {
        return { items: datasets, has_more: false };
      }
      if (entity === 'AgriculturalObservation') {
        let items = observations.filter((obs) => {
          for (const [k, v] of Object.entries(query)) {
            if (obs[k] !== v) return false;
          }
          return true;
        });
        return { items, has_more: false };
      }
      return { items: [], has_more: false };
    },
  };
}

test('AI Analyst - executes research tools with real provenance', async () => {
  const repo = createMockRepository();
  const analyst = new AIAnalystEngine(repo, { email: 'analyst@minagri.gov.rw', role: 'agricultural_analyst' });

  // Tool 1: searchDatasets
  const datasets = await analyst.executeTool(AI_ANALYST_TOOLS.searchDatasets, { query: 'seasonal' });
  assert.equal(datasets.length, 2);
  assert.equal(datasets[0].classification, DATA_CLASSIFICATIONS.OFFICIAL_OBSERVATION);

  // Tool 2: compareDistricts
  const comparison = await analyst.executeTool(AI_ANALYST_TOOLS.compareDistricts, {
    crop: 'Maize',
    season: 'Season A',
    year: 2024,
    indicator: 'production',
  });
  assert.equal(comparison.rankedDistricts.length, 2);
  assert.equal(comparison.topDistrict.district, 'Nyagatare');
  assert.equal(comparison.topDistrict.value, 26000);
  assert.equal(comparison.lowestDistrict.district, 'Bugesera');
  assert.equal(comparison.lowestDistrict.value, 9000);

  // Tool 3: calculateStatistics
  const stats = await analyst.executeTool(AI_ANALYST_TOOLS.calculateStatistics, {
    crop: 'Maize',
    season: 'Season A',
    year: 2024,
    indicator: 'production',
  });
  assert.equal(stats.recordCount, 2);
  assert.equal(stats.stats.mean, 17500);
  assert.equal(stats.stats.min, 9000);
  assert.equal(stats.stats.max, 26000);

  // Tool 4: createReportDraft
  const draft = await analyst.executeTool(AI_ANALYST_TOOLS.createReportDraft, {
    title: 'Bugesera Maize Vulnerability Note',
    summary: 'Identified 40% production drop.',
    citations: ['SAS 2024 Table 5!C14'],
  });
  assert.ok(draft.reportId.startsWith('rep-'));
  assert.equal(draft.status, 'draft_pending_human_review');
});

test('AI Analyst - answers research questions with strict 6-part evidence structure', async () => {
  const repo = createMockRepository();
  const analyst = new AIAnalystEngine(repo, { email: 'analyst@minagri.gov.rw' });

  const answer = await analyst.answerResearchQuestion('Which district had the largest Maize decline in Season A?');

  assert.ok(answer.question);
  assert.ok(answer.finding.includes('Bugesera'));
  assert.ok(answer.finding.includes('-40.0%'));

  // 1. Supporting evidence with exact citations
  assert.ok(answer.supportingEvidence.length > 0);
  const bugeseraEvidence = answer.supportingEvidence.find((e) => e.district === 'Bugesera');
  assert.ok(bugeseraEvidence);
  assert.equal(bugeseraEvidence.baselineProductionTonnes, 15000);
  assert.equal(bugeseraEvidence.currentProductionTonnes, 9000);
  assert.equal(bugeseraEvidence.percentDecline, -40);
  assert.equal(bugeseraEvidence.sourceCitation, 'SAS 2024, Table 5!C14');
  assert.equal(bugeseraEvidence.claimType, AI_CLAIM_TYPES.OBSERVED_FACT);

  // 2. Mathematical calculation explicitly documented
  assert.ok(answer.calculation.formula.includes('Percentage Change'));
  assert.equal(answer.calculation.zeroBaselineProtected, true);

  // 3. Interpretation clearly distinguishes observation from causation
  assert.ok(answer.interpretation.includes('Causal attribution requires field verification'));

  // 4. Uncertainty bounds acknowledged
  assert.ok(answer.uncertainty.includes('margins of error'));

  // 5. Recommended action provided
  assert.ok(answer.recommendedAction.includes('transect survey'));

  // 6. Classification
  assert.equal(answer.claimClassification, AI_CLAIM_TYPES.DERIVED_STATISTIC);
});
