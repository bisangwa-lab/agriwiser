import { createFileRoute } from "@tanstack/react-router";
import { FindProblems } from "@/components/agricultural-solutions/FindProblems";

export const Route = createFileRoute("/_authed/agricultural-solutions/")({
  component: FindProblemsRoute,
});

function FindProblemsRoute() {
  return <FindProblems />;
}