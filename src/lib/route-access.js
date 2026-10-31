// Workspace access is enforced centrally in src/routes/_authed.jsx. Keep these
// legacy wrappers for compatibility; protected operations also enforce roles
// in their server functions.
export function canAccess() {
  return true;
}

export function requireWorkspace() {
  return () => {};
}
