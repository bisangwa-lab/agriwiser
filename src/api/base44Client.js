import { createClient } from "@base44/sdk";
import { getAppParams } from "@/lib/app-params";
import { localClient } from "./localClient";

export const isLocalAuth = import.meta.env.VITE_AUTH_MODE === "local";
export const base44 = isLocalAuth ? localClient : createClient({ ...getAppParams(), serverUrl: "" });
