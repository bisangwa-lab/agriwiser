import { createFileRoute } from "@tanstack/react-router";
import OverviewPanel from "@/components/panels/OverviewPanel";

export const Route = createFileRoute("/_authed/analytics")({
  validateSearch: (search) => ({
    view: search.view === "planning-tools" ? "planning-tools" : "overview",
  }),
  head: () => ({ meta: [{ title: "Analytics & planning · AgriWiser" }] }),
  component: AnalyticsRoute,
});

function AnalyticsRoute() {
  const { view } = Route.useSearch();
  return <OverviewPanel view={view} />;
}
