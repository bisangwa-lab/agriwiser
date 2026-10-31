import { createFileRoute } from "@tanstack/react-router";
import AgricultureSnapshotPanel from "@/components/community/AgricultureSnapshotPanel";

export const Route = createFileRoute("/_authed/agriculture-snapshot")({
  head: () => ({ meta: [{ title: "Rwanda Agriculture Snapshot · AgriWiser" }] }),
  component: AgricultureSnapshotPanel,
});
