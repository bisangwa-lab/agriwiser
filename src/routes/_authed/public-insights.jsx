import { createFileRoute } from "@tanstack/react-router";
import { UssdSimulator } from "@/components/ussd/UssdSimulator";

export const Route = createFileRoute("/_authed/public-insights")({
  head: () => ({ meta: [{ title: "USSD Simulator · AgriWiser" }] }),
  component: () => <UssdSimulator embedded />,
});
