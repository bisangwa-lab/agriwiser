import { createFileRoute } from "@tanstack/react-router";
import DataManagerPanel from "@/components/panels/DataManagerPanel";

export const Route = createFileRoute("/_authed/admin")({
  head: () => ({ meta: [{ title: "Administration · AgriWiser" }] }),
  component: DataManagerPanel,
});