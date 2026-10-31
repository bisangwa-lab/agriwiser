import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AuthGateError, requireSignedIn } from "@/components/auth/AuthGate";
import { AppShell } from "@/components/layout/AppShell";
import { canOpenPanel, normalizeRole, panelForPath, panelForRole } from "@/lib/rbac";

export const Route = createFileRoute("/_authed")({
  ssr: false,
  // Require a verified session, then enforce the account's assigned workspace.
  // Protected data and operations also enforce permissions in server functions.
  beforeLoad: async ({ context, location }) => {
    const { user } = await requireSignedIn({ context, location });
    const panel = panelForPath(location.pathname);
    if (panel && !canOpenPanel(user, panel)) {
      throw redirect({ to: panelForRole(normalizeRole(user)) });
    }
    return { user };
  },
  errorComponent: AuthGateError,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}
