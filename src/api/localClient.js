import { localEmptyCollection, localLogin, localLogout, localMe, localQuickLogin, localRegister } from "@/lib/local-auth";
import { localReadCollection } from "@/lib/local-data";

async function unwrap(promise) {
  const result = await promise;
  if (result?.error) throw Object.assign(new Error(result.error), { status: result.status });
  return result;
}

const unavailable = async () => { throw new Error("This data operation is not yet available for local accounts."); };
const DATA_ENTITIES = new Set(["Dataset", "AgriculturalObservation", "ImportLog", "SourceArchive", "SourceTableIndex", "SourceTable", "SourceReportIndex", "SourceReportPage", "SurveyFile", "Alert", "Investigation", "FollowUpAction", "InvestigationNote", "ReportFinding"]);
const collection = (entity) => ({
  list: (options) => DATA_ENTITIES.has(entity) ? localReadCollection({ data: { entity, options } }) : localEmptyCollection(),
  filter: (query, options) => DATA_ENTITIES.has(entity) ? localReadCollection({ data: { entity, query, options } }) : localEmptyCollection(),
  get: async (id) => {
    const result = await localReadCollection({ data: { entity, query: { id }, options: { limit: 1 } } });
    if (!result.items.length) throw Object.assign(new Error("No local record was found."), { status: 404 });
    return result.items[0];
  },
  create: unavailable, update: unavailable, delete: unavailable, bulkCreate: unavailable,
});

export const localClient = {
  auth: {
    hasToken: () => true, // The HttpOnly cookie is resolved only by the server.
    loginViaEmailPassword: (email, password) => unwrap(localLogin({ data: { email, password } })),
    quickLogin: (account) => unwrap(localQuickLogin({ data: { account } })),
    register: (data) => unwrap(localRegister({ data })),
    me: async () => (await unwrap(localMe())).user,
    logout: async (returnTo = "/login") => { await unwrap(localLogout()); window.location.assign(returnTo); },
    updateMe: unavailable,
  },
  entities: new Proxy({}, { get: (_, entity) => typeof entity === "string" ? collection(entity) : undefined }),
  users: { inviteUser: unavailable },
};
