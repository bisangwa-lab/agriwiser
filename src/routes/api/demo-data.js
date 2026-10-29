import { createFileRoute } from "@tanstack/react-router";
import { buildDemoData } from "@/lib/demo-data";
import { evaluateAlerts } from "@/lib/alert-rules";

/**
 * Loads the clearly labelled demonstration dataset.
 *
 * Written as resumable batches: `?offset=0&batch=900` writes one slice of the
 * generated set and reports what is left, so a large load never exceeds the
 * platform's per-minute write budget and can be re-driven until it completes.
 * The generator is deterministic, so a slice is always the same records.
 *
 * Non-destructive: it never deletes or rewrites an observation, it only appends
 * generated records, and alerts are only created when none exist.
 */
function clamp(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

async function datasetCounts(service) {
  const [datasets, observations, alerts] = await Promise.all([
    service.entities.Dataset.count({}),
    service.entities.AgriculturalObservation.count({}),
    service.entities.Alert.count({}),
  ]);
  return { datasets, observations, alerts };
}

export const Route = createFileRoute("/api/demo-data")({
  server: {
    handlers: {
      GET: async ({ context }) => {
        const counts = await datasetCounts(context.getBase44().asServiceRole);
        return Response.json(
          { ...counts, seeded: counts.observations > 0 },
          { headers: { "cache-control": "no-store" } },
        );
      },

      POST: async ({ request, context }) => {
        const service = context.getBase44().asServiceRole;
        const url = new URL(request.url);
        const offset = clamp(url.searchParams.get("offset") ?? 0, 0, 20000);
        const batch = clamp(url.searchParams.get("batch") ?? 900, 100, 1200);

        const onlyDistrict = url.searchParams.get("district");
        const { datasets, observations, expectedCropObservations } = buildDemoData();
        const target = onlyDistrict
          ? observations.filter((row) => row.geography === onlyDistrict)
          : observations;

        if (onlyDistrict) {
          const already = await service.entities.AgriculturalObservation.count({ geography: onlyDistrict });
          if (already > 0) {
            return Response.json({ status: "already-present", district: onlyDistrict, written: already });
          }
        }

        if (offset === 0) {
          const existing = await service.entities.Dataset.count({});
          if (existing === 0) {
            await service.entities.Dataset.bulkCreate(
              datasets.map((dataset) => ({
                name: dataset.name,
                publisher: dataset.publisher,
                source_url: dataset.source_url,
                source_reference: dataset.source_reference,
                retrieval_date: dataset.retrieval_date,
                reporting_period: dataset.reporting_period,
                geographic_coverage: dataset.geographic_coverage,
                geography_level: dataset.geography_level,
                version: dataset.version,
                license: dataset.license,
                methodology: dataset.methodology,
                limitations: dataset.limitations,
                units: dataset.units,
                update_cadence: dataset.update_cadence,
                indicators: dataset.indicators,
                quality_status: dataset.quality_status,
                quality_warnings: dataset.quality_warnings,
                is_demo: true,
                active: true,
                row_count: observations.filter((row) => row.dataset_id === dataset.id).length,
              })),
            );
          }
        }

        const slice = target.slice(offset, offset + batch);
        if (slice.length) await service.entities.AgriculturalObservation.bulkCreate(slice);

        const written = Math.min(target.length, offset + slice.length);
        let alertsCreated = 0;

        if (!onlyDistrict && written >= target.length) {
          const existingAlerts = await service.entities.Alert.count({});
          if (existingAlerts === 0) {
            const drafts = evaluateAlerts(observations);
            const generatedDate = new Date().toISOString();
            const cropDataset = datasets[0];
            const payload = drafts.map((draft) => ({
              ...draft,
              generated_date: generatedDate,
              dataset_id: cropDataset.id,
              dataset_name: cropDataset.name,
              quality_status: "demonstration",
              observation_count: 4,
              is_demo: true,
              evidence_snapshot: JSON.stringify({
                rule: draft.rule_id,
                version: draft.rule_version,
                crop: draft.crop,
                district: draft.district,
                season: draft.season,
                indicator: draft.indicator,
                unit: draft.unit,
                current: { period: draft.period, value: draft.observed_value },
                previous: { period: draft.previous_period, value: draft.previous_value },
                absolute_change: draft.absolute_change,
                percentage_change: draft.percentage_change,
                threshold_pct: draft.rule_threshold_pct,
              }),
            }));
            for (let index = 0; index < payload.length; index += 300) {
              await service.entities.Alert.bulkCreate(payload.slice(index, index + 300));
            }
            alertsCreated = payload.length;
          }
        }

        const complete = written >= target.length;

        return Response.json({
          status: complete ? "complete" : "partial",
          district: onlyDistrict ?? null,
          written,
          total: target.length,
          nextOffset: complete ? null : written,
          alertsCreated,
          expectedCropObservations,
        });
      },
    },
  },
});