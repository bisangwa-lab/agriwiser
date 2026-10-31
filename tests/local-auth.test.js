import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createLocalAuthService, SESSION_SECONDS } from "../src/lib/local-auth-service.js";
import { tokenHash } from "../src/lib/local-password.js";
import { QUICK_LOCAL_ACCOUNTS, quickLoginAllowed } from "../src/lib/local-quick-login.js";
import { PANEL_ORDER, PANELS, canOpenPanel, resolveWorkspacePanel } from "../src/lib/rbac.js";
import { destinationAfterSignIn } from "../src/lib/sign-in.js";

const schema = readFileSync(new URL("../migrations/0001_local_auth.sql", import.meta.url), "utf8");
function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(schema);
  const db = { prepare: (sql) => ({ bind: (...args) => ({
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    run: async () => sqlite.prepare(sql).run(...args),
  }) }) };
  let time = Date.now();
  return { sqlite, db, auth: createLocalAuthService(db, () => time), advance: (milliseconds) => { time += milliseconds; } };
}
const details = { email: "person@example.com", full_name: "Local Person", password: "long local password" };

test("registration persists a password hash, a safe role and a server-side session", async () => {
  const { auth, sqlite } = fixture();
  const { user, token } = await auth.register(details);
  assert.equal(user.workspace_role, "public_viewer");
  assert.equal(user.role, "user");
  assert.equal(user.password_hash, undefined);
  const stored = sqlite.prepare("SELECT * FROM local_users").get();
  assert.notEqual(stored.password_hash, details.password);
  assert.match(stored.password_hash, /^pbkdf2-sha256\$100000\$/);
  const session = sqlite.prepare("SELECT * FROM local_sessions").get();
  assert.equal(session.token_hash, await tokenHash(token));
  assert.notEqual(session.token_hash, token);
  assert.equal((await auth.me(token)).id, user.id);
});

test("public registration cannot assign roles or privileged attributes", async () => {
  const { auth, sqlite } = fixture();
  await assert.rejects(auth.register({ ...details, workspace_role: "super_admin" }), /Only name/);
  await assert.rejects(auth.register({ ...details, role: "admin" }), /Only name/);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM local_users").get().n, 0);
});

test("login rejects wrong and unknown passwords, normalizes email and survives a fresh service instance", async () => {
  const { auth, sqlite, db } = fixture();
  await auth.register(details);
  await assert.rejects(auth.login({ ...details, password: "wrong password" }), /Invalid email or password/);
  await assert.rejects(auth.login({ ...details, email: "missing@example.com" }), /Invalid email or password/);
  const session = await auth.login({ ...details, email: " PERSON@EXAMPLE.COM " });
  assert.equal(session.user.email, details.email);
  assert.equal((await auth.me(session.token)).email, details.email);
  assert.equal((await createLocalAuthService(db).me(session.token)).email, details.email);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM local_users").get().n, 1);
});

test("logout revokes the session and expiry and deactivation are checked on every request", async () => {
  const { auth, sqlite, advance } = fixture();
  const first = await auth.register(details);
  await auth.logout(first.token);
  await assert.rejects(auth.me(first.token), /expired/);
  const second = await auth.login(details);
  advance((SESSION_SECONDS + 1) * 1000);
  await assert.rejects(auth.me(second.token), /expired/);
  const third = await auth.login(details);
  sqlite.prepare("UPDATE local_users SET active=0").run();
  await assert.rejects(auth.me(third.token), /expired/);
  await assert.rejects(auth.login(details), /Invalid email or password/);
});

test("sessions cannot be forged or reused as a user ID", async () => {
  const { auth } = fixture();
  const { user } = await auth.register(details);
  await assert.rejects(auth.me(user.id), /Sign in/);
  await assert.rejects(auth.me("0".repeat(64)), /expired/);
  await assert.rejects(auth.me(undefined), /Sign in/);
});

test("failed login is rate limited, then recovers after the window", async () => {
  const { auth, advance } = fixture();
  await auth.register(details);
  for (let attempt = 0; attempt < 5; attempt++) await assert.rejects(auth.login({ ...details, password: "wrong password" }), /Invalid email/);
  await assert.rejects(auth.login(details), /Too many/);
  advance(15 * 60 * 1000 + 1);
  assert.equal((await auth.login(details)).user.email, details.email);
});

test("registration validates passwords and email uniqueness without changing existing accounts", async () => {
  const { auth } = fixture();
  await assert.rejects(auth.register({ ...details, password: "short" }), /12 and 128/);
  await assert.rejects(auth.register({ ...details, email: "not-email" }), /valid email/);
  await auth.register(details);
  await assert.rejects(auth.register({ ...details, email: "PERSON@example.com" }), /already exists/);
  assert.equal((await auth.login(details)).user.workspace_role, "public_viewer");
});

test("quick login uses existing fixed accounts and never creates or upgrades a user", async () => {
  const { auth, sqlite } = fixture();
  await assert.rejects(auth.quickLogin("administrator"), /local development/);
  await assert.rejects(auth.quickLogin("administrator", { enabled: true }), /not available/);
  await auth.register({ ...details, email: "admin@hingasmart.local" });
  const session = await auth.quickLogin("administrator", { enabled: true });
  assert.equal(session.user.workspace_role, "public_viewer");
  assert.equal((await auth.me(session.token)).email, "admin@hingasmart.local");
  await assert.rejects(auth.quickLogin("person@example.com", { enabled: true }), /listed local account/);
  await assert.rejects(auth.quickLogin("__proto__", { enabled: true }), /listed local account/);
  sqlite.prepare("UPDATE local_users SET active=0").run();
  await assert.rejects(auth.quickLogin("administrator", { enabled: true }), /not available/);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM local_users").get().n, 1);
});

test("quick login requires development, explicit enablement, local auth and a loopback host", () => {
  const allowed = { development: true, authMode: "local", enabled: "true", hostname: "127.0.0.1" };
  assert.equal(quickLoginAllowed(allowed), true);
  assert.equal(quickLoginAllowed({ ...allowed, development: false }), false);
  assert.equal(quickLoginAllowed({ ...allowed, authMode: "appClient" }), false);
  assert.equal(quickLoginAllowed({ ...allowed, enabled: "false" }), false);
  assert.equal(quickLoginAllowed({ ...allowed, enabled: undefined }), false);
  assert.equal(quickLoginAllowed({ ...allowed, hostname: "example.com" }), false);
});

test("all five AgriWiser panels have assigned landing pages and role-limited workspace access", async () => {
  const { auth, sqlite } = fixture();
  assert.deepEqual(Object.values(QUICK_LOCAL_ACCOUNTS).map((account) => account.key), PANEL_ORDER);
  assert.equal(new Set(Object.values(QUICK_LOCAL_ACCOUNTS).map((account) => account.email)).size, 5);
  for (const [key, account] of Object.entries(QUICK_LOCAL_ACCOUNTS)) {
    await auth.register({ ...details, email: account.email });
    sqlite.prepare("UPDATE local_users SET workspace_role=? WHERE email=?").run(account.role, account.email);
    const { user } = await auth.quickLogin(key, { enabled: true });
    assert.equal(destinationAfterSignIn(user, account.path), account.path);
    for (const panel of PANEL_ORDER) {
      const allowed = key === "administrator" || panel === account.key;
      assert.equal(canOpenPanel(user, panel), allowed);
      if (allowed) assert.equal(resolveWorkspacePanel(user, PANELS[panel].path, {}), panel);
    }
  }
});
