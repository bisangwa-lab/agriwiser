import { canOpenPanel, normalizeRole, panelForPath, panelForRole } from "./rbac.js";

export function destinationAfterSignIn(user, returnTo = "/") {
  const home = panelForRole(normalizeRole(user));
  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.includes("\\")) return home;
  const pathname = returnTo.split(/[?#]/, 1)[0];
  const panel = panelForPath(pathname);
  if (panel && canOpenPanel(user, panel)) return returnTo;
  if (pathname === "/oauth/consent") return returnTo;
  return home;
}

// Verify the newly established session before leaving the sign-in screen.
// A failed /me request must remain an error, rather than redirecting into a loop.
export async function signIn(auth, { email, password, returnTo }) {
  await auth.loginViaEmailPassword(email.trim(), password);
  const user = await auth.me();
  if (!user?.id) throw new Error("Your session could not be verified. Please sign in again.");
  return { user, destination: destinationAfterSignIn(user, returnTo) };
}

export function signInError(error) {
  if (/invalid email or password/i.test(error?.message ?? "")) {
    return "Email or password not recognized. Use your registered AgriWiser account, create an account, or reset your password.";
  }
  return error?.message || "Sign-in could not be completed. Please try again.";
}
