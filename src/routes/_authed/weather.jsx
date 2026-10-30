import { createFileRoute, redirect } from "@tanstack/react-router";
import WeatherDashboard from "@/components/weather/WeatherDashboard";
import { canReadWeather, WEATHER_LOCATIONS } from "@/lib/weather-model";
import { normalizeRole, panelForRole, resolveWorkspacePanel } from "@/lib/rbac";

export const Route = createFileRoute("/_authed/weather")({
  ssr: false,
  validateSearch: (search) => ({
    ...(WEATHER_LOCATIONS.some((item) => item.district === search.district) ? { district: search.district } : {}),
    ...(Number.isInteger(Number(search.year)) && Number(search.year) >= 1982 && Number(search.year) <= 2100
      ? { year: Number(search.year) }
      : {}),
    ...(["Season A", "Season B", "Season C"].includes(search.season) ? { season: search.season } : {}),
    ...(["merra2", "era5"].includes(search.dataset) ? { dataset: search.dataset } : {}),
    ...(["admin", "analytics", "field_operations"].includes(search.panel) ? { panel: search.panel } : {}),
  }),
  beforeLoad: ({ context }) => {
    if (!canReadWeather(context.user)) throw redirect({ to: panelForRole(normalizeRole(context.user)) });
  },
  head: () => ({ meta: [{ title: "Weather & climate · AgriWiser" }] }),
  component: WeatherPage,
});

function WeatherPage() {
  const search = Route.useSearch();
  const { user } = Route.useRouteContext();
  const activePanel = resolveWorkspacePanel(user, "/weather", search);
  return (
    <WeatherDashboard
      key={`${JSON.stringify(search)}-${activePanel}`}
      panel={activePanel}
      initialSelection={{
        district: search.district ?? "Gasabo",
        year: search.year ?? 2025,
        season: search.season ?? "Season B",
        dataset: search.dataset ?? "era5",
        panel: activePanel,
      }}
    />
  );
}
