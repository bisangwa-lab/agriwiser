import { createFileRoute } from "@tanstack/react-router";
import OverviewPanel from "@/components/panels/OverviewPanel";

export const Route = createFileRoute("/_authed/analytics")({
  head: () => ({ meta: [{ title: "Analytics & planning · HingaSmart Rwanda" }] }),
  component: OverviewPanel,
});