import { createFileRoute, redirect } from "@tanstack/react-router";
import { normalizeRole, panelForRole } from "@/lib/rbac";

// The root of the signed-in area sends each user to the panel assigned to their
// role. There is no shared "home" page: every role has its own panel landing.
export const Route = createFileRoute("/_authed/")({
  beforeLoad: ({ context }) => {
    throw redirect({ to: panelForRole(normalizeRole(context.user)) });
  },
  component: () => null,
});