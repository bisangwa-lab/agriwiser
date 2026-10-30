import { createFileRoute } from "@tanstack/react-router";
import { CompareSolutions } from "@/components/agricultural-solutions/CompareSolutions";

export const Route = createFileRoute("/_authed/agricultural-solutions/compare")({
  component: CompareSolutionsRoute,
});

function CompareSolutionsRoute() {
  return <CompareSolutions />;
}