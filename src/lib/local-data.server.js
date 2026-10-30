import { env } from "cloudflare:workers";
import schema from "../../migrations/0002_local_data.sql?raw";
import { localSessionUser } from "./local-auth.server.js";
import {
  readLocalRecords,
  createLocalRecord,
  updateLocalRecord,
  deleteLocalRecord,
  bulkCreateLocalRecords,
} from "./local-data-service.js";
import { createDistrictReview, saveDistrictFinding } from "./district-review-service.js";
import {backendMode,supabaseRequestClient,supabaseAdminClient} from './supabase.server.js';
import {createSupabaseRecords} from './supabase-records.js';
import { WORK_ENTITIES } from './field-workflow.js';
import { workflowForUser } from './field-workflow.server.js';

let initialized;
async function ensureDb() {
  initialized ??= env.LOCAL_AUTH_DB.batch(
    schema
      .split(";")
      .map((sql) => sql.trim())
      .filter(Boolean)
      .map((sql) => env.LOCAL_AUTH_DB.prepare(sql)),
  ).catch((error) => {
    initialized = undefined;
    throw error;
  });
  await initialized;
}

export async function runLocalRead(input) {
  if(WORK_ENTITIES.has(input.entity)) {
    const {entity,query,options}= (await import('./local-data-service.js')).validateLocalRead(input);
    const rows=await (await workflowForUser(await localSessionUser())).read({entity,query});
    const field=options.sort.replace(/^-/,'');rows.sort((a,b)=>String(a[field]??'').localeCompare(String(b[field]??''))*(options.sort.startsWith('-')?-1:1)||a.id.localeCompare(b.id));
    const offset=Number(options.cursor),has_more=rows.length>offset+options.limit;
    return {items:rows.slice(offset,offset+options.limit),has_more,next_cursor:has_more?String(offset+options.limit):null};
  }
  if(backendMode()==='supabase')return createSupabaseRecords(supabaseRequestClient(),await localSessionUser(),supabaseAdminClient).read(input);
  await ensureDb();
  const user = await localSessionUser();
  return readLocalRecords(env.LOCAL_AUTH_DB, user, input);
}

export async function runLocalCreate(input) {
  if(WORK_ENTITIES.has(input.entity))return (await workflowForUser(await localSessionUser())).create(input);
  if(backendMode()==='supabase')return createSupabaseRecords(supabaseRequestClient(),await localSessionUser(),supabaseAdminClient).create(input);
  await ensureDb();
  const user = await localSessionUser();
  return createLocalRecord(env.LOCAL_AUTH_DB, user, input);
}

export async function runLocalUpdate(input) {
  if(WORK_ENTITIES.has(input.entity))return (await workflowForUser(await localSessionUser())).update(input);
  if(backendMode()==='supabase')return createSupabaseRecords(supabaseRequestClient(),await localSessionUser(),supabaseAdminClient).update(input);
  await ensureDb();
  const user = await localSessionUser();
  return updateLocalRecord(env.LOCAL_AUTH_DB, user, input);
}

export async function runLocalDelete(input) {
  if(WORK_ENTITIES.has(input.entity))throw Object.assign(new Error('Work history cannot be deleted. Record a cancellation or correction.'),{status:403});
  if(backendMode()==='supabase')return createSupabaseRecords(supabaseRequestClient(),await localSessionUser(),supabaseAdminClient).delete(input);
  await ensureDb();
  const user = await localSessionUser();
  return deleteLocalRecord(env.LOCAL_AUTH_DB, user, input);
}

export async function runLocalBulkCreate(input) {
  if(WORK_ENTITIES.has(input.entity))throw Object.assign(new Error('Use audited individual workflow actions.'),{status:403});
  if(backendMode()==='supabase')return createSupabaseRecords(supabaseRequestClient(),await localSessionUser(),supabaseAdminClient).bulkCreate(input);
  await ensureDb();
  const user = await localSessionUser();
  return bulkCreateLocalRecords(env.LOCAL_AUTH_DB, user, input);
}

export async function runDistrictReview(input) {
  if(backendMode()==='supabase'){const user=await localSessionUser();return createDistrictReview(districtRepository(user),user,input);}
  await ensureDb();
  const user = await localSessionUser();
  const repository={readRecords:input=>readLocalRecords(env.LOCAL_AUTH_DB,user,input),insertOnce:async(entity,record)=>({record:await(await workflowForUser(user)).create({entity,record:{...record,idempotency_key:record.id}}),kind:entity,alreadyExists:false})};
  return createDistrictReview(repository, user, input);
}

export async function runDistrictFinding(input) {
  if(backendMode()==='supabase'){const user=await localSessionUser();return saveDistrictFinding(districtRepository(user),user,input);}
  await ensureDb();
  return saveDistrictFinding(env.LOCAL_AUTH_DB, await localSessionUser(), input);
}
function districtRepository(user){const records=createSupabaseRecords(supabaseRequestClient(),user,supabaseAdminClient);return {readRecords:records.read,insertOnce:async(entity,record)=>entity==='Investigation'?{record:await (await workflowForUser(user)).create({entity,record:{...record,idempotency_key:record.id}}),kind:entity,alreadyExists:false}:records.insertOnce(entity,record)};}
export async function recordsForUser(user){
 if(backendMode()==='supabase')return createSupabaseRecords(supabaseRequestClient(),user,supabaseAdminClient);
 await ensureDb();return {read:input=>readLocalRecords(env.LOCAL_AUTH_DB,user,input),create:input=>createLocalRecord(env.LOCAL_AUTH_DB,user,input),bulkCreate:input=>bulkCreateLocalRecords(env.LOCAL_AUTH_DB,user,input)};
}
