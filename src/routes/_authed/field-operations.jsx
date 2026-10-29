import { createFileRoute } from "@tanstack/react-router";
import OfficerPanel from "@/components/panels/OfficerPanel";

export const Route = createFileRoute("/_authed/field-operations")({
  head: () => ({ meta: [{ title: "Field operations · HingaSmart Rwanda" }] }),
  component: OfficerPanel,
});