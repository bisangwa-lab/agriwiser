import { useMemo } from "react";
import { useObservations } from "@/hooks/useObservations";
import { useAlerts, useDatasets, useInvestigations } from "@/hooks/useAgriRecords";
import {
  coverage,
  groupByDimension,
  percentageChange,
  seriesByYear,
  totalsForPeriod,
} from "@/lib/metrics";
import { useAuth } from "@/lib/AuthContext";
import { normalizeRole } from "@/lib/rbac";
import { usesAppData } from "@/api/appClient";


/**
 * Everything the overview shows, computed from the stored observations through
 * the shared metric engine. `isSample` is only true when nothing has been loaded
 * at all. The dashboard shows empty states unless sample preview is explicitly selected.
 */
export function useOverviewData(filters) {
  const { user } = useAuth();
  const canReadReviews = !usesAppData || ["super_admin", "data_manager", "agricultural_analyst", "policy_maker", "agricultural_officer", "field_investigator", "field_supervisor"].includes(normalizeRole(user));
  const crop = filters.crop !== "all" ? filters.crop : undefined;
  const district = filters.district !== "all" ? filters.district : undefined;
  const season = filters.season !== "all" ? filters.season : undefined;

  const observations = useObservations({ domain: "crop", crop, district, season, coreMeasures: filters.indicator !== "cultivated_area", view: "metrics" });
  const datasets = useDatasets();
  const alerts = useAlerts({ enabled: canReadReviews });
  const investigations = useInvestigations({ enabled: canReadReviews });

  const indicator = filters.indicator ?? "production";

  const rows = observations.data ?? [];

  const derived = useMemo(() => {
    if (!rows.length) return null;

    const trend = seriesByYear(rows);
    const years = trend.map((point) => point.year);
    const latestYear = years.length ? Math.max(...years) : null;
    const previousYear = years.length > 1 ? years[years.length - 2] : null;

    const currentTotals = totalsForPeriod(rows, { year: latestYear, season, indicator });
    const previousTotals = previousYear
      ? totalsForPeriod(rows, { year: previousYear, season, indicator })
      : { value: null };

    const productionNow = totalsForPeriod(rows, { year: latestYear, season, indicator: "production" }).value;
    const areaNow = totalsForPeriod(rows, { year: latestYear, season, indicator: "harvested_area" }).value;
    const yieldNow = totalsForPeriod(rows, { year: latestYear, season, indicator: "yield" }).value;
    const productionPrev = previousYear
      ? totalsForPeriod(rows, { year: previousYear, season, indicator: "production" }).value
      : null;
    const areaPrev = previousYear
      ? totalsForPeriod(rows, { year: previousYear, season, indicator: "harvested_area" }).value
      : null;
    const yieldPrev = previousYear
      ? totalsForPeriod(rows, { year: previousYear, season, indicator: "yield" }).value
      : null;

    // The observations endpoint does not provide a source-backed catalogue of
    // expected district/crop/season cells. Do not infer completeness from the
    // rows returned: absent categories are invisible in this response.
    const scope = coverage(rows, null);

    const districtRows = groupByDimension(rows, {
      dimension: "geography",
      year: latestYear,
      season,
      indicator,
    })
      .map((row) => ({ name: row.name, value: row.value }));

    const seriesPoint = { label: String(latestYear), year: latestYear };
    const previousPoint = previousYear ? { label: String(previousYear), year: previousYear } : null;

    return {
      trend,
      latestYear,
      previousYear,
      latestPeriod: season ? `${latestYear} ${season}` : String(latestYear),
      previousPeriod: previousYear ? (season ? `${previousYear} ${season}` : String(previousYear)) : null,
      currentTotals,
      previousTotals,
      seriesPoint,
      previousPoint,
      cards: {
        production: {
          value: productionNow,
          unitShort: "t",
          deltaPct: percentageChange(productionNow, productionPrev).value,
        },
        harvested_area: {
          value: areaNow,
          unitShort: "ha",
          deltaPct: percentageChange(areaNow, areaPrev).value,
        },
        yield: {
          value: yieldNow,
          unitShort: "t/ha",
          deltaPct: percentageChange(yieldNow, yieldPrev).value,
        },
        districts: { value: scope.districts },
        completeness: {
          value: null,
          unitShort: "%",
        },
      },
      observationCount: scope.present,
      expectedObservationCount: null,
      districtRows,
    };
  }, [rows, crop, district, season, indicator]);

  // The dataset record the loaded observations actually came from, so the
  // provenance strip names the right source.
  const newestRow = rows.reduce((latest, row) => !latest || row.year > latest.year ? row : latest, null);
  const observationDatasetId = newestRow?.dataset_id;
  const usedIds = new Set(rows.map((row) => row.dataset_id));
  const sources = (datasets.data ?? []).filter((item) => usedIds.has(item.id));
  const dataset =
    (datasets.data ?? []).find((item) => item.id === observationDatasetId) ?? (datasets.data ?? [])[0] ?? null;
  const loaded = Boolean(derived);

  return {
    isLoading: observations.isLoading,
    isFetching: observations.isFetching,
    isError: observations.isError || datasets.isError || alerts.isError || investigations.isError,
    error: observations.error ?? datasets.error ?? null,
    isSample: !observations.isLoading && !loaded,
    // Alerts and investigations are read separately from the observations, so
    // they are still reported while the indicator query is in flight.
    alerts: alerts.data ?? [],
    investigations: (investigations.data ?? []).slice(0, 4),
    dataset,
    isDemonstration: dataset?.quality_status === "demonstration",
    data: derived
      ? {
          ...derived,
          datasetName: sources.length > 1 ? `NISR SAS · ${derived.trend[0].year}–${derived.latestYear} (${sources.length} releases)` : dataset?.name ?? "Loaded dataset",
          dataset,
          sources,
        }
      : null,
  };
}
