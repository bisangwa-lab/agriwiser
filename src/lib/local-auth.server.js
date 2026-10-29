import { env } from "cloudflare:workers";
import { deleteCookie, getCookie, getRequest, setCookie, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import schema from "../../migrations/0001_local_auth.sql?raw";
import { createLocalAuthService, SESSION_SECONDS } from "./local-auth-service.js";
import { quickLoginAllowed } from "./local-quick-login.js";

const COOKIE = "hingasmart_local_session";
let initialized;

async function service() {
  const request = getRequest();
  const url = new URL(request.url);
  if (import.meta.env.VITE_AUTH_MODE !== "local" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw Object.assign(new Error("Local accounts are available only on this computer."), { status: 403 });
  }
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (!origin || origin !== url.origin) throw Object.assign(new Error("Invalid request origin."), { status: 403 });
  }
  if (!env.LOCAL_AUTH_DB) throw new Error("The local account database is not configured.");
  initialized ??= env.LOCAL_AUTH_DB.batch(schema.split(";").map((sql) => sql.trim()).filter(Boolean)
    .map((sql) => env.LOCAL_AUTH_DB.prepare(sql))).catch((error) => { initialized = undefined; throw error; });
  await initialized;
  setResponseHeader("Cache-Control", "no-store");
  return createLocalAuthService(env.LOCAL_AUTH_DB);
}

export async function runLocalAuth(action, data) {
  try {
    const auth = await service();
    if (action === "me") return { user: await auth.me(getCookie(COOKIE)) };
    if (action === "logout") {
      await auth.logout(getCookie(COOKIE));
      deleteCookie(COOKIE, { path: "/" });
      return { ok: true };
    }
    const { user, token } = action === "quickLogin"
      ? await auth.quickLogin(data, { enabled: quickLoginAllowed({
        development: import.meta.env.DEV,
        authMode: import.meta.env.VITE_AUTH_MODE,
        enabled: import.meta.env.VITE_LOCAL_QUICK_LOGIN,
        hostname: new URL(getRequest().url).hostname,
      }) })
      : await auth[action](data);
    // Do not return the session token to JavaScript or store it in browser storage.
    const oldToken = getCookie(COOKIE);
    if (oldToken) await auth.logout(oldToken);
    setCookie(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: new URL(getRequest().url).protocol === "https:", path: "/", maxAge: SESSION_SECONDS });
    return { user };
  } catch (error) {
    if (!error.status) throw error;
    setResponseStatus(error.status);
    return { error: error.message, status: error.status };
  }
}

export async function localSessionUser() {
  const auth = await service();
  return auth.me(getCookie(COOKIE));
}

export function localServerClient() {
  return {
    auth: { me: localSessionUser },
    get asServiceRole() { throw new Error("Base44 service operations are unavailable in local account mode."); },
  };
}
