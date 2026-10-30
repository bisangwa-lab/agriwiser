import { createFileRoute } from "@tanstack/react-router";
import PublicInsightsPanel from "@/components/panels/PublicInsightsPanel";

export const Route = createFileRoute("/_authed/public-insights")({
  head: () => ({ meta: [{ title: "Public insights · AgriWiser" }] }),
  component: PublicInsightsPanel,
});