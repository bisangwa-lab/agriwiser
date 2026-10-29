import { WORKSPACE_ROLE_LABEL } from "@/lib/constants";

export const ADMIN_ROLE = "admin";

export function isAdmin(user) {
  return user?.role === ADMIN_ROLE;
}

/**
 * Which workspace an account works in. Derived from the account itself, never
 * from a selector the user can flip: app administrators default to the
 * data-manager workspace, everyone else to the planner workspace until an
 * administrator assigns a workspace role in Settings. Permissions are enforced
 * on the data (row-level rules), not by which menu items are visible.
 */
export function workspaceRole(user) {
  if (user?.workspace_role) return user.workspace_role;
  return isAdmin(user) ? "data_manager" : "planner";
}

export function workspaceRoleLabel(user) {
  return WORKSPACE_ROLE_LABEL[workspaceRole(user)] ?? "Planner / analyst";
}

export function displayName(user) {
  return user?.full_name || user?.email || "Signed in";
}

export function initials(user) {
  const source = user?.full_name || user?.email || "?";
  return source
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}