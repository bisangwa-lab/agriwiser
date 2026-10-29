// Central Role-Based Access Control for HingaSmart Rwanda.
//
// One source of truth for the five panels, the roles that map to each, and the
// page-to-panel mapping used by the route guard. Panel access is enforced in
// src/routes/_authed.jsx (beforeLoad), so a direct URL is blocked too — not just
// the sidebar link. Data-level read/write rules live in the entity schemas.

export const PANELS = {
  admin: { key: "admin", path: "/admin", label: "Administration" },
  analytics: { key: "analytics", path: "/analytics", label: "Analytics & planning" },
  field_operations: { key: "field_operations", path: "/field-operations", label: "Field operations" },
  community_business: { key: "community_business", path: "/community-business", label: "Community & business" },
  public_insights: { key: "public_insights", path: "/public-insights", label: "Public insights" },
};

export const PANEL_ORDER = ["admin", "analytics", "field_operations", "community_business", "public_insights"];

export const ROLES = [
  { key: "super_admin", label: "Super admin", panel: "admin" },
  { key: "data_manager", label: "Data manager", panel: "admin" },
  { key: "agricultural_analyst", label: "Agricultural analyst", panel: "analytics" },
  { key: "policy_maker", label: "Policy maker", panel: "analytics" },
  { key: "agricultural_officer", label: "Agricultural officer", panel: "field_operations" },
  { key: "field_investigator", label: "Field investigator", panel: "field_operations" },
  { key: "field_supervisor", label: "Field supervisor", panel: "field_operations" },
  { key: "farmer", label: "Farmer", panel: "community_business" },
  { key: "cooperative", label: "Cooperative", panel: "community_business" },
  { key: "buyer", label: "Buyer", panel: "community_business" },
  { key: "agribusiness", label: "Agribusiness", panel: "community_business" },
  { key: "public_viewer", label: "Public viewer", panel: "public_insights" },
];

export const ROLE_BY_KEY = Object.fromEntries(ROLES.map((r) => [r.key, r]));

// Existing accounts use the original workspace_role values. Map them to the
// canonical keys so no one is locked out and no duplicate roles are created.
const LEGACY_ROLE_MAP = {
  admin: "super_admin",
  planner: "agricultural_analyst",
  officer: "agricultural_officer",
  data_manager: "data_manager",
};

/**
 * The canonical role for a signed-in user. A Base44 admin is a super admin.
 * An unset or unknown role gets the least-privilege, read-only role — never a
 * privileged one. The role is read from the trusted session (`/me`), never from
 * the browser or a form.
 */
export function normalizeRole(user) {
  if (!user) return null;
  if (user.role === "admin") return "super_admin";
  const wr = user.workspace_role;
  if (wr && (LEGACY_ROLE_MAP[wr] || ROLE_BY_KEY[wr])) return LEGACY_ROLE_MAP[wr] ?? wr;
  return "public_viewer";
}

export function roleLabel(user) {
  const role = normalizeRole(user);
  return ROLE_BY_KEY[role]?.label ?? "Public viewer";
}

/** The panel route a role lands on after sign-in. */
export function panelForRole(role) {
  const r = ROLE_BY_KEY[role];
  return r ? PANELS[r.panel].path : PANELS.public_insights.path;
}

/**
 * Super admins oversee the whole platform and may open any panel. Every other
 * role may open only the panel assigned to it.
 */
export function canOpenPanel(user, panelKey) {
  const role = normalizeRole(user);
  if (!role) return false;
  if (role === "super_admin") return true;
  return ROLE_BY_KEY[role]?.panel === panelKey;
}

// Which panel a path belongs to. Order matters: longer/more specific prefixes
// could be added first; here none overlap.
const PAGE_PANEL = [
  { prefix: "/admin", panel: "admin" },
  { prefix: "/data-sources", panel: "admin" },
  { prefix: "/settings", panel: "admin" },
  { prefix: "/analytics", panel: "analytics" },
  { prefix: "/explore", panel: "analytics" },
  { prefix: "/compare", panel: "analytics" },
  { prefix: "/alerts", panel: "analytics" },
  { prefix: "/reports", panel: "analytics" },
  { prefix: "/field-operations", panel: "field_operations" },
  { prefix: "/investigations", panel: "field_operations" },
  { prefix: "/community-business", panel: "community_business" },
  { prefix: "/public-insights", panel: "public_insights" },
];

/** The panel a route path belongs to, or null (e.g. the root redirect). */
export function panelForPath(pathname) {
  for (const { prefix, panel } of PAGE_PANEL) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return panel;
  }
  return null;
}
