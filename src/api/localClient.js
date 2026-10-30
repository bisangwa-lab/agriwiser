import { localEmptyCollection, localLogin, localLogout, localMe, localQuickLogin, localRegister,requestPasswordReset,resetAccountPassword } from "@/lib/local-auth";
import {
  localReadCollection,
  localCreateRecord,
  localUpdateRecord,
  localDeleteRecord,
  localBulkCreate,
} from "@/lib/local-data";
import {updateProfile,inviteAgriWiserAccount} from '@/lib/account-management';

async function unwrap(promise) {
  const result = await promise;
  if (result?.error) throw Object.assign(new Error(result.error), { status: result.status });
  return result;
}

const unavailable = async () => {
  throw new Error("This data operation is not yet available for local accounts.");
};

const DATA_ENTITIES = new Set([
  "Dataset",
  "AgriculturalObservation",
  "ImportLog",
  "SourceArchive",
  "SourceTableIndex",
  "SourceTable",
  "SourceReportIndex",
  "SourceReportPage",
  "SurveyFile",
  "Alert",
  "Investigation",
  "FollowUpAction",
  "InvestigationNote",
  "ReportFinding",
  "FieldVisit",
  "ReviewDecision",
  "AuditEvent",
  "EvidenceAttachment",
  "EvidenceVerification",
]);

const collection = (entity) => ({
  list: (options) => (DATA_ENTITIES.has(entity) ? localReadCollection({ data: { entity, options } }) : localEmptyCollection()),
  filter: (query, options) => (DATA_ENTITIES.has(entity) ? localReadCollection({ data: { entity, query, options } }) : localEmptyCollection()),
  get: async (id) => {
    const result = await localReadCollection({ data: { entity, query: { id }, options: { limit: 1 } } });
    if (!result.items.length) throw Object.assign(new Error(`No local ${entity} record found with id ${id}.`), { status: 404 });
    return result.items[0];
  },
  count: async (query = {}) => {
    let count=0,cursor='0';const seen=new Set();
    do{if(seen.has(cursor))throw new Error('Incomplete record count.');seen.add(cursor);const result=await localReadCollection({data:{entity,query,options:{limit:2000,cursor}}});count+=result.items.length;if(!result.has_more)return count;cursor=result.next_cursor;if(!cursor)throw new Error('Incomplete record count.');}while(cursor);
  },
  create: (record) => unwrap(localCreateRecord({ data: { entity, record } })),
  update: (id, patch) => unwrap(localUpdateRecord({ data: { entity, id, patch } })),
  delete: (id) => unwrap(localDeleteRecord({ data: { entity, id } })),
  bulkCreate: (records) => unwrap(localBulkCreate({ data: { entity, records } })),
});

export const localClient = {
  auth: {
    hasToken: () => true, // The HttpOnly cookie is resolved only by the server.
    loginViaEmailPassword: (email, password) => unwrap(localLogin({ data: { email, password } })),
    quickLogin: (account) => unwrap(localQuickLogin({ data: { account } })),
    register: (data) => unwrap(localRegister({ data })),
    resetPasswordRequest:email=>unwrap(requestPasswordReset({data:{email}})),
    resetPassword:({newPassword})=>unwrap(resetAccountPassword({data:{password:newPassword}})),
    me: async () => (await unwrap(localMe())).user,
    logout: async (returnTo = "/login") => {
      await unwrap(localLogout());
      window.location.assign(returnTo);
    },
    updateMe: data=>updateProfile({data}),
  },
  entities: new Proxy({}, { get: (_, entity) => (typeof entity === "string" ? collection(entity) : undefined) }),
  users: { inviteUser: (email,workspace_role='public_viewer')=>inviteAgriWiserAccount({data:{email,workspace_role}}) },
};
