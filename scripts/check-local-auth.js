import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fromCrossJSON, toJSONAsync } from "seroval";
import { QUICK_LOCAL_ACCOUNTS } from "../src/lib/local-quick-login.js";
import { PANEL_ORDER, canOpenPanel } from "../src/lib/rbac.js";
import { destinationAfterSignIn } from "../src/lib/sign-in.js";

// Integration check against the running development server. Credentials stay in
// the ignored local setup file; neither cookies nor passwords are printed.
const origin = "http://127.0.0.1:5174";
const account = JSON.parse(await readFile(new URL("../.local-accounts.json", import.meta.url), "utf8"));
const source = await (await fetch(`${origin}/src/lib/local-auth.js`)).text();
const ids = Object.fromEntries([...source.matchAll(/export const (\w+) = [^\n]*?createClientRpc\("([^"]+)"\)/g)].map((match) => [match[1], match[2]]));
let cookie = "";
let flags = "";
const transport = async (url, init) => {
  const headers = new Headers(init.headers);
  headers.set("Origin", origin);
  if (cookie) headers.set("Cookie", cookie);
  const response = await fetch(url, { ...init, headers });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) { flags = setCookie; cookie = setCookie.split(";")[0]; }
  return response;
};
const rpc = async (name, method, data) => {
  assert.ok(ids[name], `Missing development RPC: ${name}`);
  const body = data === undefined ? undefined : JSON.stringify(await toJSONAsync({ data }));
  const response = await transport(`${origin}/_serverFn/${ids[name]}`, {
    method, headers: { accept: "application/json", "x-tsr-serverFn": "true", ...(body ? { "content-type": "application/json" } : {}) }, body,
  });
  const payload = await response.json();
  const result = response.headers.get("x-tss-serialized") ? fromCrossJSON(payload, { refs: new Map() }) : payload;
  if (result.error) throw result.error;
  return result.result;
};
assert.deepEqual(Object.values(QUICK_LOCAL_ACCOUNTS).map((entry) => entry.key), PANEL_ORDER);
for (const [key, expected] of Object.entries(QUICK_LOCAL_ACCOUNTS)) {
  const quick = await rpc("localQuickLogin", "POST", { account: key });
  assert.equal(quick.user.email, expected.email);
  assert.equal(quick.user.workspace_role, expected.role);
  assert.equal(destinationAfterSignIn(quick.user, expected.path), expected.path);
  assert.equal((await rpc("localMe", "GET")).user.email, expected.email);
  assert.match(flags, /HttpOnly/i);
  for (const panel of PANEL_ORDER) assert.equal(canOpenPanel(quick.user, panel), key === "administrator" || panel === expected.key);
  await rpc("localLogout", "POST");
}
assert.equal((await rpc("localQuickLogin", "POST", { account: "unknown" })).status, 400);
const invalid = await rpc("localLogin", "POST", { email: account.email, password: `${account.password}-wrong` });
assert.equal(invalid.status, 401);
const signedIn = await rpc("localLogin", "POST", { email: account.email, password: account.password });
assert.equal(signedIn.user.email, account.email);
assert.match(flags, /HttpOnly/i);
assert.match(flags, /SameSite=Strict/i);
assert.equal(signedIn.token, undefined);
assert.equal((await rpc("localMe", "GET")).user.email, account.email);
const rejected = await fetch(`${origin}/_serverFn/${ids.localLogout}`, { method: "POST", headers: { Origin: "https://example.com", Cookie: cookie } });
assert.equal(rejected.status, 403);
await rpc("localLogout", "POST");
assert.equal((await rpc("localMe", "GET")).status, 401);
console.log("HTTP checks passed: all five panel badges, assigned roles and destinations, panel access rules, invalid badge rejection, password login, session cookies, CSRF denial and logout.");
