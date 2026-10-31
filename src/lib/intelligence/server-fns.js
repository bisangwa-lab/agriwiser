/**
 * AGRIWISER — AGRICULTURAL INTELLIGENCE SERVER FUNCTIONS
 *
 * Exposes Risk Engine, Digital Twin, and AI Agricultural Analyst endpoints
 * with backend authentication and role-based access control.
 */

import { createServerFn } from '@tanstack/react-start';
import { requireUser } from '@/lib/auth-middleware';
import { recordsForUser } from '@/lib/local-data.server';
import { EvidenceService, isUsableRiskRecord } from './evidence-service.js';
import { evaluateDistrictCropRisk, buildInvestigationProposal } from './risk-engine.js';
import { buildPeerYieldBenchmark } from './action-brief.js';
import { runDigitalTwinSimulation } from './digital-twin.js';
import { AIAnalystEngine } from './ai-analyst.js';
import { listModels, getModelInfo } from './model-registry.js';
import { workflowForUser } from '@/lib/field-workflow.server';
import { CROPS, DISTRICT_NAMES, SEASONS } from '@/lib/constants';
import { computeYield } from './statistical-engine.js';

// Warm-isolate cache for the read-only district risk matrix. Keyed by account
// and filters so one user's data can never be served to another user.
const riskMapCache = new Map();
const RISK_MAP_CACHE_TTL_MS = 120_000;

/**
 * Retrieves the Model Registry catalog and governance information.
 */
export const getModelRegistryCatalog = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .handler(async () => {
    return {
      models: listModels(),
      retrievedAt: new Date().toISOString(),
    };
  });

/**
 * Runs Risk Assessment for a specific crop, district, and season.
 */
export const getDistrictRiskAssessment = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .validator((d) => ({
    district: String(d.district || 'Bugesera'),
    crop: String(d.crop || 'Maize'),
    season: String(d.season || 'Season A'),
  }))
  .handler(async ({ context, data }) => {
    const repository = await recordsForUser(context.user);
    const service = new EvidenceService(repository, context.user);
    const series = await service.getSeries(data.district, data.crop, data.season);
    return evaluateDistrictCropRisk(series);
  });

/**
 * Computes composite risk scores for all 30 Rwanda districts for a chosen crop and season.
 */
export const getNationalRiskMap = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .validator((d) => {
    if (!d || !CROPS.includes(d.crop) || !SEASONS.includes(d.season))
      throw Object.assign(new Error('Choose a supported crop and reporting season.'), { status: 400 });
    return { crop: d.crop, season: d.season };
  })
  .handler(async ({ context, data }) => {
    const cacheKey = `${context.user.id ?? context.user.email}:${data.crop}:${data.season}`;
    const cached = riskMapCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const repository = await recordsForUser(context.user);
    const service = new EvidenceService(repository, context.user);
    const allObservations = await service.queryObservations({ crop: data.crop, season: data.season, coreMeasures: true });

    // Group observations by district
    const byDistrict = new Map();
    for (const obs of allObservations) {
      const dist = obs.geography;
      if (!dist) continue;
      if (!byDistrict.has(dist)) byDistrict.set(dist, new Map());
      const yearMap = byDistrict.get(dist);
      const year = Number(obs.year);
      if (!Number.isInteger(year) || !DISTRICT_NAMES.includes(dist)) continue;
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          year,
          district: dist,
          crop: data.crop,
          season: data.season,
          productionRows: [],
          harvestedAreaRows: [],
          datasetId: obs.dataset_id,
          sourceReference: obs.source_reference,
        });
      }
      const entry = yearMap.get(year);
      if (obs.indicator === 'production' && isUsableRiskRecord(obs, 'production')) entry.productionRows.push(obs);
      if (obs.indicator === 'harvested_area' && isUsableRiskRecord(obs, 'harvested_area')) entry.harvestedAreaRows.push(obs);
    }

    const assessments = {};
    const districtAssessments = DISTRICT_NAMES.map((dist) => {
      const yearMap = byDistrict.get(dist) ?? new Map();
      const series = [...yearMap.values()].sort((a, b) => a.year - b.year).map((entry) => {
        const productionRow = entry.productionRows.length === 1 ? entry.productionRows[0] : null;
        const areaRow = entry.harvestedAreaRows.length === 1 ? entry.harvestedAreaRows[0] : null;
        const compatible = productionRow && areaRow && productionRow.dataset_id === areaRow.dataset_id;
        const production = productionRow ? Number(productionRow.value) : null;
        const harvestedArea = areaRow ? Number(areaRow.value) : null;
        return {
          year: entry.year,
          district: dist,
          crop: data.crop,
          season: data.season,
          production,
          harvestedArea,
          derivedYield: compatible ? computeYield(production, harvestedArea) : null,
          datasetId: productionRow?.dataset_id ?? null,
          sources: {
            ...(productionRow ? { production: sourceDetails(productionRow) } : {}),
            ...(areaRow ? { harvested_area: sourceDetails(areaRow) } : {}),
          },
          sourceWarnings: [
            ...(entry.productionRows.length > 1 ? ['Multiple production records; value withheld.'] : []),
            ...(entry.harvestedAreaRows.length > 1 ? ['Multiple harvested-area records; value withheld.'] : []),
            ...(productionRow && areaRow && !compatible ? ['Production and harvested area are from different source releases; derived yield withheld.'] : []),
          ],
        };
      });
      const assessment = evaluateDistrictCropRisk(series);
      const peerBenchmark = assessment.currentYear
        ? buildPeerYieldBenchmark(allObservations, dist, { crop: data.crop, season: data.season, year: assessment.currentYear })
        : { status: 'unavailable', reason: 'A current comparable reporting year is unavailable.', minimumPeerDistricts: 8, peerDistrictCount: 0 };
      assessment.peerBenchmark = peerBenchmark;
      assessments[dist] = assessment;
      return {
        district: dist,
        status: assessment.status,
        riskLevel: assessment.status === 'no_signals' ? 'LOW' : assessment.riskLevel,
        compositeScore: assessment.status === 'insufficient_history' ? null : assessment.compositeScore,
        signalCount: assessment.signalCount ?? 0,
        signals: assessment.signals ?? [],
        currentYear: assessment.currentYear ?? null,
        message: assessment.message ?? null,
        peerBenchmark,
      };
    });

    const result = {
      crop: data.crop,
      season: data.season,
      districts: districtAssessments,
      assessments,
      evaluatedAt: new Date().toISOString(),
    };
    riskMapCache.set(cacheKey, { value: result, expiresAt: Date.now() + RISK_MAP_CACHE_TTL_MS });
    if (riskMapCache.size > 100) {
      const now = Date.now();
      for (const [key, entry] of riskMapCache) if (entry.expiresAt <= now) riskMapCache.delete(key);
      while (riskMapCache.size > 100) riskMapCache.delete(riskMapCache.keys().next().value);
    }
    return result;
  });

/**
 * Runs a deterministic Digital Twin scenario.
 */
export const runDigitalTwinScenario = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .validator((d) => ({
    district: String(d.district || 'Bugesera'),
    crop: String(d.crop || 'Maize'),
    season: String(d.season || 'Season A'),
    year: Number(d.year || 2024),
    scenarioType: String(d.scenarioType || 'rainfall'),
    parameters: d.parameters || {},
    title: d.title || 'Custom Simulation',
  }))
  .handler(async ({ context, data }) => {
    const repository = await recordsForUser(context.user);
    const service = new EvidenceService(repository, context.user);
    const rows = await service.queryObservations({
      district: data.district,
      crop: data.crop,
      season: data.season,
      year: data.year,
    });

    const productionRows = rows.filter((r) => r.indicator === 'production');
    const areaRows = rows.filter((r) => r.indicator === 'harvested_area');
    const compatiblePairs = productionRows.flatMap((production) => areaRows
      .filter((area) => production.dataset_id && production.dataset_id === area.dataset_id)
      .map((area) => ({ production, area })));

    if (compatiblePairs.length !== 1) {
      throw Object.assign(
        new Error(`A unique production and harvested-area pair from the same dataset is required for ${data.district} ${data.crop} ${data.season} ${data.year}. Check the source releases before simulating.`),
        { status: compatiblePairs.length ? 409 : 404 }
      );
    }

    const { production: prodRow, area: areaRow } = compatiblePairs[0];
    if (prodRow.unit !== 'metric tonnes' || areaRow.unit !== 'hectares') {
      throw Object.assign(
        new Error(`This baseline uses incompatible units (${prodRow.unit || 'unit missing'} and ${areaRow.unit || 'unit missing'}). Production must be metric tonnes and area must be hectares before simulation.`),
        { status: 422 }
      );
    }
    if (!prodRow.source_reference || !areaRow.source_reference) {
      throw Object.assign(
        new Error('The baseline is missing source references. Add traceable source references before simulating.'),
        { status: 422 }
      );
    }

    const production = Number(prodRow.value);
    const harvestedArea = Number(areaRow.value);
    if (!Number.isFinite(production) || production < 0 || !Number.isFinite(harvestedArea) || harvestedArea <= 0) {
      throw Object.assign(
        new Error('The selected baseline has invalid production or harvested-area values and cannot be simulated.'),
        { status: 422 }
      );
    }

    const baseline = {
      district: data.district,
      crop: data.crop,
      season: data.season,
      year: data.year,
      production,
      harvestedArea,
      datasetId: prodRow.dataset_id,
      sourceReference: prodRow.source_reference,
      sourceUrl: prodRow.source_url,
    };

    return runDigitalTwinSimulation(baseline, {
      scenarioType: data.scenarioType,
      parameters: data.parameters,
      title: data.title,
    });
  });

/**
 * Submits a question to the Evidence-Grounded AI Agricultural Analyst.
 */
export const queryAIAnalyst = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .validator((d) => ({
    question: String(d.question || ''),
  }))
  .handler(async ({ context, data }) => {
    const repository = await recordsForUser(context.user);
    const engine = new AIAnalystEngine(repository, context.user);
    return engine.answerResearchQuestion(data.question);
  });

/**
 * Directly transforms a Risk Assessment into an authorized Field Investigation.
 */
export const dispatchRiskInvestigation = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .validator((d) => {
    const assessment = d?.riskAssessment;
    if (!assessment || typeof assessment.district !== 'string' || typeof assessment.crop !== 'string' || typeof assessment.season !== 'string')
      throw new Error('Choose a district, crop and season before requesting field follow-up.');
    if (!DISTRICT_NAMES.includes(assessment.district) || !CROPS.includes(assessment.crop) || !SEASONS.includes(assessment.season))
      throw new Error('The selected district, crop or season is not valid.');
    return { district: assessment.district, crop: assessment.crop, season: assessment.season };
  })
  .handler(async ({ context, data }) => {
    const repository = await recordsForUser(context.user);
    const service = new EvidenceService(repository, context.user);
    const series = await service.getSeries(data.district, data.crop, data.season);
    const comparisonRows = await service.queryObservations({ crop: data.crop, season: data.season, coreMeasures: true });
    const riskAssessment = evaluateDistrictCropRisk(series);
    riskAssessment.district = data.district;
    riskAssessment.crop = data.crop;
    riskAssessment.season = data.season;
    riskAssessment.peerBenchmark = riskAssessment.currentYear
      ? buildPeerYieldBenchmark(comparisonRows, data.district, { crop: data.crop, season: data.season, year: riskAssessment.currentYear })
      : { status: 'unavailable', reason: 'A current comparable reporting year is unavailable.', minimumPeerDistricts: 8, peerDistrictCount: 0 };
    if (!riskAssessment.signals?.length)
      throw Object.assign(new Error('No current risk signals are available for field follow-up.'), { status: 409 });
    const proposal = buildInvestigationProposal(riskAssessment);
    const workflow = await workflowForUser(context.user);
    const investigation = await workflow.createRiskHandoff({
      entity: 'Investigation',
      record: {
        title: proposal.title,
        reason: proposal.initialNotes,
        description: proposal.initialNotes,
        district: proposal.geography,
        crop: proposal.crop,
        indicator: 'production',
        period: `${proposal.season} ${proposal.year}`,
        evidence: JSON.stringify(proposal.evidence),
        questions: proposal.suggestedVerificationTasks.join('\n'),
        priority: ['urgent', 'high'].includes(proposal.priority) ? 'elevated' : 'standard',
        source: 'risk_engine',
        idempotency_key: `risk-inv-${proposal.geography}-${proposal.crop}-${proposal.year}-${proposal.season}`,
      },
    });

    return {
      success: true,
      investigationId: investigation.id,
      title: investigation.title,
      status: investigation.status,
    };
  });

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
