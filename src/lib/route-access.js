// Panel-level access is enforced centrally in src/routes/_authed.jsx (the
// beforeLoad guard reads the role from the trusted session and redirects a user
// who tries to open a panel that is not assigned to them). These no-ops are kept
// so existing route files that import them keep building without effect.
export function canAccess() {
  return true;
}

export function requireWorkspace() {
  return () => {};
}