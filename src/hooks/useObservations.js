import { useQuery } from "@tanstack/react-query";
import { appClient, usesAppData } from "@/api/appClient";
import { fetchAll } from "@/lib/fetch-all";

/**
 * The one place observations are read. Every screen builds its filters here, so
 * a chart, a table, an export and a rule evaluation all read the same records
 * through the same query shape.
 */
export function buildObservationQuery({ domain, crop, district, season, year, indicator, includeSubtypes = false, coreMeasures = false } = {}) {
  const query = {};
  if (domain) query.domain = domain;
  if (crop) query.crop = crop;
  if (usesAppData && domain === "crop" && !crop && !includeSubtypes) query.aggregation_level = "main";
  if (district) query.geography = district;
  if (season) query.season = season;
  if (year !== undefined && year !== null && year !== "all") query.year = Number(year);
  if (indicator) query.indicator = indicator;
  if (usesAppData && coreMeasures) query.measure_group = "production_area";
  return query;
}

export function useObservations(params = {}) {
  const query = buildObservationQuery(params);
  const key = JSON.stringify(query);
  return useQuery({
    queryKey: ["observations", key, params.view ?? "full"],
    enabled: params.enabled !== false,
    queryFn: () => fetchAll(appClient.entities.AgriculturalObservation, query, usesAppData ? {view: params.view} : {}),
    staleTime: 60_000,
  });
}
