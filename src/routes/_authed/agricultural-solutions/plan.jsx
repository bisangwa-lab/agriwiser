import { createFileRoute } from "@tanstack/react-router";
import { PrepareActionPlan } from "@/components/agricultural-solutions/PrepareActionPlan";

export const Route = createFileRoute("/_authed/agricultural-solutions/plan")({
  component: PrepareActionPlanRoute,
});

function PrepareActionPlanRoute() {
  return <PrepareActionPlan />;
}