import { env } from "cloudflare:workers";
import schema from "../../migrations/0002_local_data.sql?raw";
import { localSessionUser } from "./local-auth.server.js";
import { readLocalRecords } from "./local-data-service.js";
import { createDistrictReview, saveDistrictFinding } from "./district-review-service.js";

let initialized;
export async function runLocalRead(input) {
  const user = await localSessionUser();
  initialized ??= env.LOCAL_AUTH_DB.batch(schema.split(";").map((sql) => sql.trim()).filter(Boolean).map((sql) => env.LOCAL_AUTH_DB.prepare(sql)))
    .catch((error) => { initialized = undefined; throw error; });
  await initialized;
  return readLocalRecords(env.LOCAL_AUTH_DB, user, input);
}

export async function runDistrictReview(input) {
  await runLocalRead({ entity: "Dataset", options: { limit: 1 } });
  const user = await localSessionUser();
  return createDistrictReview(env.LOCAL_AUTH_DB, user, input);
}

export async function runDistrictFinding(input) {
  await runLocalRead({ entity: "Dataset", options: { limit: 1 } });
  return saveDistrictFinding(env.LOCAL_AUTH_DB, await localSessionUser(), input);
}
