import { analyzeDatasetFindings } from './dataset-findings.js';

/**
 * Server-side finding analysis.
 *
 * Findings are computed from the published observation store, not from a
 * browser-side copy. The cache is process-local and short-lived; it never
 * rewrites a value and it is keyed by backend so local development data cannot
 * be served as Supabase data (or the reverse).
 */
const CACHE_MS = 120_000;
const cache = new Map();

/** Read every page through the repository's bounded cursor contract. */
export async function listAll(repo, entity, query = {}) {
  const rows = [];
  let cursor = '0';
  const seen = new Set();
  for (;;) {
    if (seen.has(cursor)) throw new Error('Incomplete record pagination.');
    seen.add(cursor);
    const page = await repo.list(entity, query, cursor);
    rows.push(...(page.items ?? []));
    if (!page.has_more) break;
    cursor = page.next_cursor;
    if (!cursor) throw new Error('Incomplete record pagination.');
    if (rows.length > 200_000) throw new Error('Finding analysis exceeds the record budget.');
  }
  return rows;
}

export function clearFieldFindingsCache() {
  cache.clear();
}

export async function loadFieldFindings(repo, { fresh = false } = {}) {
  const key = repo.cacheKey ?? 'default';
  const cached = cache.get(key);
  if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const [observations, datasets] = await Promise.all([
    listAll(repo, 'AgriculturalObservation', {
      domain: 'crop',
      measure_group: 'production_area',
      aggregation_level: 'main',
    }),
    listAll(repo, 'Dataset', {}),
  ]);

  const analysis = analyzeDatasetFindings(observations, { datasets });
  const value = {
    ...analysis,
    generated_at: new Date().toISOString(),
    dataset_count: datasets.length,
    dataset_ids: datasets.map((dataset) => dataset.id).filter(Boolean).sort(),
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
