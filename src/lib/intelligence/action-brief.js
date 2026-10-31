const EXPECTED_UNITS = Object.freeze({
  production: 'metric tonnes',
  harvested_area: 'hectares',
});

export const MINIMUM_PEER_DISTRICTS = 8;

function observedCropRow(row, { requireExplicitObserved = false } = {}) {
  if (!row || row.domain !== 'crop' || row.is_demo === true || row.is_forecast === true) return false;
  const status = String(row.observation_status ?? '').trim().toLowerCase();
  if (status === 'forecast' || status === 'missing' || status === 'provisional') return false;
  if (requireExplicitObserved && status !== 'observed') return false;
  if (/demo|forecast|model|scenario/i.test(String(row.quality_status ?? ''))) return false;
  return true;
}

function finiteNonnegative(value) {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Compare a district with other districts in the same crop, season, year and
 * published dataset. The minimum support rule is a product screening rule,
 * not an NISR precision threshold or a test of statistical significance.
 */
export function buildPeerYieldBenchmark(rows, district, { crop, season, year, minimumPeerDistricts = MINIMUM_PEER_DISTRICTS } = {}) {
  const grouped = new Map();
  for (const row of rows ?? []) {
    if (!observedCropRow(row, { requireExplicitObserved: true })) continue;
    if (row.crop !== crop || row.season !== season || Number(row.year) !== Number(year)) continue;
    if (!['production', 'harvested_area'].includes(row.indicator)) continue;
    if (row.unit !== EXPECTED_UNITS[row.indicator] || !row.dataset_id || !row.source_reference) continue;
    const value = finiteNonnegative(row.value);
    if (value === null) continue;
    const key = [row.geography, row.dataset_id].join('|');
    if (!grouped.has(key)) grouped.set(key, { district: row.geography, datasetId: row.dataset_id, production: [], area: [] });
    grouped.get(key)[row.indicator === 'production' ? 'production' : 'area'].push({ value, sourceReference: row.source_reference });
  }

  const complete = [...grouped.values()]
    .filter((item) => item.production.length === 1 && item.area.length === 1 && item.area[0].value > 0)
    .map((item) => ({ ...item, yield: item.production[0].value / item.area[0].value }));
  const targetRecords = complete.filter((item) => item.district === district);
  if (targetRecords.length !== 1) {
    return {
      status: 'unavailable',
      reason: targetRecords.length ? 'The selected district has more than one compatible source release.' : 'A complete, unit-compatible source pair is unavailable for the selected district.',
      minimumPeerDistricts,
      peerDistrictCount: 0,
    };
  }

  const target = targetRecords[0];
  const peers = complete.filter((item) => item.district !== district && item.datasetId === target.datasetId);
  if (peers.length < minimumPeerDistricts) {
    return {
      status: 'insufficient_support',
      reason: `At least ${minimumPeerDistricts} other districts with complete values in the same release are required; ${peers.length} are available.`,
      year: Number(year),
      datasetId: target.datasetId,
      districtYield: target.yield,
      minimumPeerDistricts,
      peerDistrictCount: peers.length,
    };
  }

  const peerMedian = median(peers.map((item) => item.yield));
  return {
    status: 'available',
    year: Number(year),
    datasetId: target.datasetId,
    districtYield: target.yield,
    peerMedianYield: peerMedian,
    differencePct: peerMedian === 0 ? null : ((target.yield - peerMedian) / peerMedian) * 100,
    minimumPeerDistricts,
    peerDistrictCount: peers.length,
    peerDistricts: peers.map((item) => item.district).sort((a, b) => a.localeCompare(b)),
    peerSourceReferences: peers.flatMap((item) => [item.production[0].sourceReference, item.area[0].sourceReference]),
    unit: 'metric tonnes per hectare',
    interpretation: 'Descriptive median of other districts in the same crop, season, year and source release. This is not a causal estimate, target yield, or statistical-significance test.',
  };
}

function verificationQuestions(signals = []) {
  const types = new Set(signals.map((signal) => signal.type));
  const questions = [];
  if (types.has('production_decline') || types.has('persistent_production_decline')) {
    questions.push('Confirm the crop, season, reporting period and source figures with the district agriculture office before interpreting the production change.');
  }
  if (types.has('area_contraction') || types.has('yield_drop')) {
    questions.push('Check whether the reported harvested area and production definitions match the field records for this crop and season.');
  }
  if (types.has('rainfall_deficit') || types.has('excess_rainfall') || types.has('heat_anomaly')) {
    questions.push('Ask local extension staff whether the reported climate period matches the crop calendar and whether any field conditions were observed.');
  }
  if (!questions.length) {
    questions.push('Review the published values and confirm whether any local condition requires field verification.');
  }
  questions.push('Record evidence that could not be verified and the source or method used for each field observation.');
  return questions;
}

/** Builds a concise, source-aware brief without treating a screening score as probability. */
export function buildEvidenceActionBrief(assessment, peerBenchmark = null) {
  if (!assessment || typeof assessment !== 'object') throw new Error('A risk assessment is required.');
  const history = Array.isArray(assessment.history) ? assessment.history : [];
  const current = history.find((point) => point.year === assessment.currentYear) ?? history.at(-1) ?? null;
  const baseline = history.filter((point) => point.year < (current?.year ?? Infinity)).at(-1) ?? null;
  const signals = Array.isArray(assessment.signals) ? assessment.signals : [];
  const sourceRefs = [...new Set([current, baseline]
    .flatMap((point) => Object.values(point?.sources ?? {}))
    .map((source) => source?.sourceReference)
    .filter(Boolean))];

  return {
    scope: {
      district: assessment.district ?? '',
      crop: assessment.crop ?? '',
      season: assessment.season ?? '',
      currentYear: current?.year ?? assessment.currentYear ?? null,
      baselineYear: baseline?.year ?? null,
    },
    screening: {
      status: assessment.status ?? 'unknown',
      riskLevel: assessment.riskLevel ?? 'LOW',
      score: Number.isFinite(assessment.compositeScore) ? assessment.compositeScore : null,
      isProbability: false,
      signalCount: signals.length,
      signals: signals.map((signal) => ({ type: signal.type, description: signal.description, triggerRule: signal.triggerRule })),
    },
    evidence: {
      sourceReferences: sourceRefs,
      current: current ? { year: current.year, production: current.production ?? null, harvestedArea: current.harvestedArea ?? null, derivedYield: current.derivedYield ?? null, sources: current.sources ?? {} } : null,
      baseline: baseline ? { year: baseline.year, production: baseline.production ?? null, harvestedArea: baseline.harvestedArea ?? null, derivedYield: baseline.derivedYield ?? null, sources: baseline.sources ?? {} } : null,
      periodsIncluded: history.filter((point) => Number.isFinite(point.year) && Number.isFinite(point.production)).length,
    },
    peerBenchmark: peerBenchmark ?? { status: 'unavailable', reason: 'A comparable same-release benchmark was not supplied.', peerDistrictCount: 0, minimumPeerDistricts: MINIMUM_PEER_DISTRICTS },
    verificationQuestions: verificationQuestions(signals),
    limitations: [
      'This rule-based score prioritizes review; it is not a probability of harm or a confirmed diagnosis.',
      'Published district survey figures do not identify a cause for a local change.',
      'Design-based standard errors or confidence intervals are not carried into this brief; statistical significance is not assessed.',
      ...(signals.some((signal) => signal.category === 'climate') ? ['Climate context is contextual evidence and does not establish that weather caused an agricultural outcome.'] : []),
    ],
    sourcePrecision: 'Unavailable in the observation fields used for this calculation.',
  };
}
