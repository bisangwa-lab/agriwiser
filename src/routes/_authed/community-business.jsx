import { createFileRoute } from "@tanstack/react-router";
import CommunityBusinessPanel from "@/components/panels/CommunityBusinessPanel";

export const Route = createFileRoute("/_authed/community-business")({
  head: () => ({ meta: [{ title: "Community & business · AgriWiser" }] }),
  component: CommunityBusinessPanel,
});