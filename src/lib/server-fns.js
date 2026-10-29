import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-middleware";
import { evaluateAlerts } from "@/lib/alert-rules";
import { fetchAll } from "@/lib/fetch-all";

export const getServerInfo = createServerFn({ method: "GET" }).handler(async () => ({
  renderedAt: new Date().toISOString(),
}));

/**
 * Recompute the transparent year-on-year rule over the stored observations.
 *
 * Runs as the signed-in caller (the platform attaches their session), then writes
 * with the service role so alert records are produced by one system path rather
 * than by whoever happens to be at the keyboard. Existing alerts are never
 * deleted or rewritten: a human may already have acknowledged or started an
 * investigation from them. Alerts are keyed by series, so re-running adds nothing
 * that is already present.
 */
export const regenerateAlerts = createServerFn({ method: "POST" }).middleware([requireUser]).handler(
  async ({ context }) => {
    const service = context.getBase44().asServiceRole;
    const observations = await fetchAll(
      service.entities.AgriculturalObservation,
      { domain: "crop" },
      { pageSize: 1000, max: 9000 },
    );

    const drafts = evaluateAlerts(observations);
    const existing = await fetchAll(service.entities.Alert, {}, { pageSize: 500, max: 3000 });
    const existingKeys = new Set(existing.map((alert) => alert.dedupe_key).filter(Boolean));

    const created = drafts.filter((draft) => !existingKeys.has(draft.dedupe_key));
    const generatedDate = new Date().toISOString();
    const payload = created.map((draft) => ({
      ...draft,
      generated_date: generatedDate,
      dataset_id: observations[0]?.dataset_id ?? "",
      dataset_name: observations[0]?.dataset_name ?? "",
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

    for (let index = 0; index < payload.length; index += 400) {
      await service.entities.Alert.bulkCreate(payload.slice(index, index + 400));
    }

    return {
      evaluated: observations.length,
      candidates: drafts.length,
      created: payload.length,
      alreadyPresent: drafts.length - payload.length,
    };
  },
);