/**
 * AGRIWISER — AGRICULTURAL INTELLIGENCE SERVER FUNCTIONS
 *
 * Exposes Risk Engine, Digital Twin, and AI Agricultural Analyst endpoints
 * with backend authentication and role-based access control.
 */

import { createServerFn } from '@tanstack/react-start';
import { requireUser } from '@/lib/auth-middleware';
import { recordsForUser } from '@/lib/local-data.server';
import { EvidenceService } from './evidence-service.js';
import { evaluateDistrictCropRisk, buildInvestigationProposal } from './risk-engine.js';
import { runDigitalTwinSimulation } from './digital-twin.js';
import { AIAnalystEngine } from './ai-analyst.js';
import { listModels, getModelInfo } from './model-registry.js';
import { workflowForUser } from '@/lib/field-workflow.server';

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
  .validator((d) => ({
    crop: String(d.crop || 'Maize'),
    season: String(d.season || 'Season A'),
  }))
  .handler(async ({ context, data }) => {
    const repository = await recordsForUser(context.user);
    const service = new EvidenceService(repository, context.user);
    const allObservations = await service.queryObservations({ crop: data.crop, season: data.season });

    // Group observations by district
    const byDistrict = new Map();
    for (const obs of allObservations) {
      const dist = obs.geography;
      if (!dist) continue;
      if (!byDistrict.has(dist)) byDistrict.set(dist, new Map());
      const yearMap = byDistrict.get(dist);
      const year = Number(obs.year);
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          year,
          district: dist,
          crop: data.crop,
          season: data.season,
          production: null,
          harvestedArea: null,
          datasetId: obs.dataset_id,
          sourceReference: obs.source_reference,
        });
      }
      const entry = yearMap.get(year);
      if (obs.indicator === 'production') entry.production = Number(obs.value);
      if (obs.indicator === 'harvested_area') entry.harvestedArea = Number(obs.value);
    }

    const districtAssessments = [];
    for (const [dist, yearMap] of byDistrict.entries()) {
      const series = [...yearMap.values()].sort((a, b) => a.year - b.year);
      if (series.length >= 2) {
        const assessment = evaluateDistrictCropRisk(series);
        districtAssessments.push({
          district: dist,
          riskLevel: assessment.riskLevel,
          compositeScore: assessment.compositeScore,
          signalCount: assessment.signalCount,
          signals: assessment.signals,
          currentYear: assessment.currentYear,
          confidence: assessment.confidence,
        });
      }
    }

    return {
      crop: data.crop,
      season: data.season,
      districts: districtAssessments,
      evaluatedAt: new Date().toISOString(),
    };
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

    const prodRow = rows.find((r) => r.indicator === 'production');
    const areaRow = rows.find((r) => r.indicator === 'harvested_area');

    if (!prodRow || !areaRow) {
      throw Object.assign(
        new Error(`Missing verified baseline for ${data.district} ${data.crop} ${data.season} ${data.year}.`),
        { status: 404 }
      );
    }

    const baseline = {
      district: data.district,
      crop: data.crop,
      season: data.season,
      year: data.year,
      production: Number(prodRow.value),
      harvestedArea: Number(areaRow.value),
      datasetId: prodRow.dataset_id,
      sourceReference: prodRow.source_reference,
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
  .validator((d) => ({
    riskAssessment: d.riskAssessment,
  }))
  .handler(async ({ context, data }) => {
    const proposal = buildInvestigationProposal(data.riskAssessment);
    const workflow = await workflowForUser(context.user);
    const investigation = await workflow.create({
      entity: 'Investigation',
      record: {
        ...proposal,
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
