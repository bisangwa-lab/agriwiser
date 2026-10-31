import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceActionBrief, buildPeerYieldBenchmark, MINIMUM_PEER_DISTRICTS } from '../src/lib/intelligence/action-brief.js';

function benchmarkRows(peerCount = MINIMUM_PEER_DISTRICTS) {
  const rows = [];
  const addDistrict = (geography, production = 100, area = 50, overrides = {}) => {
    for (const [indicator, value, unit, suffix] of [
      ['production', production, 'metric tonnes', 'p'],
      ['harvested_area', area, 'hectares', 'a'],
    ]) rows.push({
      id: `${geography}-${suffix}`, domain: 'crop', crop: 'Maize', geography,
      season: 'Season A', year: 2024, indicator, value, unit,
      dataset_id: 'nisr-release-2024', source_reference: `${geography}-${suffix}-ref`,
      observation_status: 'observed', is_demo: false, ...overrides,
    });
  };
  addDistrict('Bugesera', 120, 60);
  for (let i = 1; i <= peerCount; i += 1) addDistrict(`Peer ${i}`, i * 10, 10);
  return { rows, addDistrict };
}

test('peer benchmark compares same-release observed districts and computes descriptive median', () => {
  const { rows } = benchmarkRows();
  const result = buildPeerYieldBenchmark(rows, 'Bugesera', { crop: 'Maize', season: 'Season A', year: 2024 });
  assert.equal(result.status, 'available');
  assert.equal(result.districtYield, 2);
  assert.equal(result.peerDistrictCount, 8);
  assert.equal(result.peerMedianYield, 4.5);
  assert.equal(result.differencePct, ((2 - 4.5) / 4.5) * 100);
  assert.match(result.interpretation, /not a causal estimate/);
});

test('peer benchmark withholds comparison when support is below minimum or rows are incompatible', () => {
  const { rows, addDistrict } = benchmarkRows(7);
  addDistrict('Wrong unit', 100, 50, { unit: 'tonnes' });
  addDistrict('Wrong season', 100, 50, { season: 'Season B' });
  addDistrict('Forecast', 100, 50, { observation_status: 'forecast' });
  addDistrict('Unverified', 100, 50, { observation_status: null });
  addDistrict('Different release', 100, 50, { dataset_id: 'other-release' });
  const result = buildPeerYieldBenchmark(rows, 'Bugesera', { crop: 'Maize', season: 'Season A', year: 2024 });
  assert.equal(result.status, 'insufficient_support');
  assert.equal(result.peerDistrictCount, 7);
  assert.match(result.reason, /At least 8 other districts/);
});

test('action brief provides signal-specific verification and honest interpretation limits', () => {
  const brief = buildEvidenceActionBrief({
    district: 'Bugesera', crop: 'Maize', season: 'Season A', currentYear: 2024,
    compositeScore: 74, riskLevel: 'HIGH', status: 'signals_found',
    signals: [{ type: 'production_decline', description: 'Production fell', triggerRule: 'drop > 20%' }],
    history: [
      { year: 2023, production: 100, harvestedArea: 50, sources: { production: { sourceReference: 'ref-23' } } },
      { year: 2024, production: 80, harvestedArea: 45, sources: { production: { sourceReference: 'ref-24' } } },
    ],
  }, { status: 'unavailable', reason: 'not enough peers' });
  assert.equal(brief.screening.isProbability, false);
  assert.deepEqual(brief.evidence.sourceReferences, ['ref-24', 'ref-23']);
  assert.ok(brief.verificationQuestions.some((question) => question.includes('reporting period')));
  assert.ok(brief.limitations.some((limitation) => limitation.includes('not a probability')));
  assert.equal(brief.peerBenchmark.status, 'unavailable');
});
