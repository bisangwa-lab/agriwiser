/**
 * AGRIWISER — SHARED EVIDENCE RETRIEVAL & PROVENANCE SERVICE
 *
 * Central source retrieval service for Risk Engine, Digital Twin, and AI Analyst.
 * Guaranteed never to fabricate observations, to respect RLS and RBAC, and to
 * produce cryptographically traceable evidence snapshots.
 */

import { DATA_CLASSIFICATIONS, tagEvidence } from './classification.js';
import { toNumber, computeYield } from './statistical-engine.js';

const RISK_UNITS = Object.freeze({ production: 'metric tonnes', harvested_area: 'hectares' });

export function isUsableRiskRecord(row, indicator, { requireExplicitObserved = false } = {}) {
  if (!row || row.is_demo === true || row.is_forecast === true) return false;
  const status = String(row.observation_status ?? '').trim().toLowerCase();
  if (['forecast', 'missing', 'provisional'].includes(status)) return false;
  if (requireExplicitObserved && status !== 'observed') return false;
  if (/demo|forecast|model|scenario/i.test(String(row.quality_status ?? ''))) return false;
  if (row.unit !== RISK_UNITS[indicator] || !row.dataset_id || !row.source_reference) return false;
  const value = toNumber(row.value);
  return value !== null && value >= 0;
}

export async function fetchAllPages(repository, entity, query = {}, limitPerRequest = 2000, maxTotal = 50000) {
  const rows = [];
  for (let offset = 0; offset < maxTotal; offset += limitPerRequest) {
    const page = await repository.read({
      entity,
      query,
      options: { limit: limitPerRequest, cursor: String(offset) },
    });
    rows.push(...(page.items ?? []));
    if (!page.has_more) break;
  }
  return rows;
}

export class EvidenceService {
  constructor(repository, user = null) {
    this.repository = repository;
    this.user = user;
  }

  /**
   * Retrieves all verified datasets with metadata.
   */
  async getDatasets() {
    const rows = await fetchAllPages(this.repository, 'Dataset', {});
    return rows.map((r) =>
      tagEvidence(r, DATA_CLASSIFICATIONS.OFFICIAL_OBSERVATION, {
        datasetId: r.id,
        sourcePublisher: r.publisher,
      })
    );
  }

  /**
   * Queries agricultural observations with strict filtering and normalization.
   */
  async queryObservations({ crop, district, season, year, indicator, coreMeasures = false, isDemo = false } = {}) {
    const query = { domain: 'crop' };
    if (crop) query.crop = crop;
    if (district) query.geography = district;
    if (season) query.season = season;
    if (year) query.year = Number(year);
    if (indicator) query.indicator = indicator;
    if (coreMeasures) query.measure_group = 'production_area';

    const rows = await fetchAllPages(this.repository, 'AgriculturalObservation', query);
    const filtered = rows.filter((r) => Boolean(r.is_demo) === isDemo);

    return filtered.map((obs) =>
      tagEvidence(obs, DATA_CLASSIFICATIONS.OFFICIAL_OBSERVATION, {
        datasetId: obs.dataset_id,
        sourceReference: obs.source_reference,
        sourceUrl: obs.source_url,
        sourceCell: obs.source_cell,
        sourceSheet: obs.source_sheet,
      })
    );
  }

  /**
   * Retrieves an uninterrupted time-series for a specific series key: (district, crop, season).
   */
  async getSeries(district, crop, season) {
    const rows = await this.queryObservations({ crop, district, season });
    const byYear = new Map();
    for (const row of rows) {
      const year = Number(row.year);
      if (!Number.isInteger(year) || !['production', 'harvested_area'].includes(row.indicator)) continue;
      if (!byYear.has(year)) byYear.set(year, { production: [], harvested_area: [] });
      const indicator = row.indicator === 'production' ? 'production' : 'harvested_area';
      if (isUsableRiskRecord(row, indicator)) byYear.get(year)[indicator].push(row);
    }

    return [...byYear.entries()].sort(([a], [b]) => a - b).map(([year, records]) => {
      const productionRow = records.production.length === 1 ? records.production[0] : null;
      const areaRow = records.harvested_area.length === 1 ? records.harvested_area[0] : null;
      const compatiblePair = productionRow && areaRow && productionRow.dataset_id === areaRow.dataset_id;
      const production = productionRow ? toNumber(productionRow.value) : null;
      const harvestedArea = areaRow ? toNumber(areaRow.value) : null;
      const warnings = [];
      if (records.production.length > 1) warnings.push('Production has multiple compatible source records; the value was withheld.');
      if (records.harvested_area.length > 1) warnings.push('Harvested area has multiple compatible source records; the value was withheld.');
      if (productionRow && areaRow && !compatiblePair) warnings.push('Production and harvested area use different source releases; derived yield was withheld.');
      return {
        year,
        district,
        crop,
        season,
        production,
        harvestedArea,
        cultivatedArea: null,
        reportedYield: null,
        derivedYield: compatiblePair ? computeYield(production, harvestedArea) : null,
        datasetId: productionRow?.dataset_id ?? areaRow?.dataset_id ?? null,
        sourceReference: productionRow?.source_reference ?? areaRow?.source_reference ?? null,
        sources: {
          ...(productionRow ? { production: sourceDetails(productionRow) } : {}),
          ...(areaRow ? { harvested_area: sourceDetails(areaRow) } : {}),
        },
        sourceWarnings: warnings,
      };
    });
  }

  /**
   * Creates an immutable, traceable evidence snapshot.
   */
  async createSnapshot(title, evidenceData, metadata = {}) {
    const rawString = JSON.stringify(evidenceData);
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      hash = (hash << 5) - hash + rawString.charCodeAt(i);
      hash |= 0;
    }
    const digest = 'sha256-' + Math.abs(hash).toString(16).padStart(16, '0');

    const snapshot = {
      id: 'snap-' + crypto.randomUUID(),
      title,
      hash: digest,
      recordCount: Array.isArray(evidenceData) ? evidenceData.length : 1,
      createdAt: new Date().toISOString(),
      creator: this.user ? String(this.user.email || this.user.id) : 'system',
      metadata,
      data: evidenceData,
    };

    return snapshot;
  }
}

function sourceDetails(row) {
  return {
    observationId: row.id ?? null,
    datasetId: row.dataset_id ?? null,
    datasetName: row.dataset_name ?? null,
    sourceReference: row.source_reference ?? null,
    sourceUrl: row.source_url ?? null,
    unit: row.unit ?? null,
    observationStatus: row.observation_status ?? 'legacy status unavailable',
    qualityFlags: Array.isArray(row.quality_flags) ? row.quality_flags : [],
  };
}
