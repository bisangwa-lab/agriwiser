import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AuthGateError, requireSignedIn } from "@/components/auth/AuthGate";
import { AppShell } from "@/components/layout/AppShell";
import { canOpenPanel, normalizeRole, panelForPath, panelForRole } from "@/lib/rbac";

export const Route = createFileRoute("/_authed")({
  ssr: false,
  // Central route guard. First resolve the session (throws to /login if not
  // signed in), then deny access to any panel the user is not assigned to,
  // redirecting them to their own panel. This runs for every _authed route, so
  // a direct URL is blocked too — not just the sidebar link.
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