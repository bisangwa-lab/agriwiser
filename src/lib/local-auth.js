import { createServerFn } from "@tanstack/react-start";
import { runLocalAuth, localSessionUser } from "./local-auth.server.js";

const credentials = (data) => {
  if (!data || typeof data !== "object" || typeof data.email !== "string" || typeof data.password !== "string") throw new Error("Email and password are required.");
  if (data.email.length > 254 || data.password.length > 128) throw new Error("Account details are too long.");
  return data;
};

export const localLogin = createServerFn({ method: "POST" }).validator(credentials).handler(({ data }) => runLocalAuth("login", data));
export const localRegister = createServerFn({ method: "POST" }).validator(credentials).handler(({ data }) => runLocalAuth("register", data));
export const localMe = createServerFn({ method: "GET" }).handler(() => runLocalAuth("me"));
export const localLogout = createServerFn({ method: "POST" }).handler(() => runLocalAuth("logout"));
export const localQuickLogin = createServerFn({ method: "POST" }).validator((data) => {
  if (!data || Object.keys(data).length !== 1 || typeof data.account !== "string" || data.account.length > 32) throw new Error("Choose a listed local account.");
  return data.account;
}).handler(({ data }) => runLocalAuth("quickLogin", data));

// No Base44 records are exposed to local identities. Empty local collections let
// existing pages show their empty states until local data features are implemented.
export const localEmptyCollection = createServerFn({ method: "GET" }).handler(async () => {
  await localSessionUser();
  return { items: [], total: 0, has_more: false };
});
