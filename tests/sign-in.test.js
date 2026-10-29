import assert from "node:assert/strict";
import test from "node:test";
import { destinationAfterSignIn, signIn, signInError } from "../src/lib/sign-in.js";

const analyst = { id: "analyst-1", role: "user", workspace_role: "planner" };

test("verified sign-in trims email, preserves password and returns the assigned panel", async () => {
  const calls = [];
  const auth = {
    loginViaEmailPassword: async (...args) => calls.push(args),
    me: async () => analyst,
  };
  const result = await signIn(auth, { email: " analyst@example.com ", password: " spaces matter ", returnTo: "/" });
  assert.deepEqual(calls, [["analyst@example.com", " spaces matter "]]);
  assert.equal(result.destination, "/analytics");
  assert.equal(result.user, analyst);
});

test("failed credentials do not attempt to resolve a session", async () => {
  const failure = new Error("Invalid email or password");
  await assert.rejects(signIn({
    loginViaEmailPassword: async () => { throw failure; },
    me: async () => assert.fail("must not call /me"),
  }, { email: "analyst@example.com", password: "wrong" }), failure);
});

test("session verification failure does not produce a successful redirect", async () => {
  const failure = new Error("Session service unavailable");
  await assert.rejects(signIn({
    loginViaEmailPassword: async () => {},
    me: async () => { throw failure; },
  }, { email: "analyst@example.com", password: "password" }), failure);
  await assert.rejects(signIn({ loginViaEmailPassword: async () => {}, me: async () => null },
    { email: "analyst@example.com", password: "password" }), /could not be verified/);
});

test("post-login navigation honors only permitted destinations", () => {
  assert.equal(destinationAfterSignIn(analyst, "/compare?crop=maize"), "/compare?crop=maize");
  assert.equal(destinationAfterSignIn(analyst, "/admin"), "/analytics");
  assert.equal(destinationAfterSignIn(analyst, "/login"), "/analytics");
  assert.equal(destinationAfterSignIn(analyst, "https://example.com"), "/analytics");
  assert.equal(destinationAfterSignIn(analyst, "//example.com"), "/analytics");
  assert.equal(destinationAfterSignIn(analyst, "/\\example.com"), "/analytics");
  assert.equal(destinationAfterSignIn(analyst, "/oauth/consent?ctx=123"), "/oauth/consent?ctx=123");
});

test("roles retain separate landing panels", () => {
  for (const [workspace_role, expected] of [
    ["data_manager", "/admin"], ["officer", "/field-operations"],
    ["farmer", "/community-business"], ["public_viewer", "/public-insights"],
  ]) assert.equal(destinationAfterSignIn({ id: "user", role: "user", workspace_role }), expected);
});

test("unrecognized credentials receive actionable feedback", () => {
  assert.match(signInError(new Error("Invalid email or password")), /registered HingaSmart account/);
  assert.equal(signInError(new Error("Service unavailable")), "Service unavailable");
});
