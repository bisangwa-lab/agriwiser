import { workflowError } from './field-workflow.js';

function checked(result) {
  if(result.error){
    const {code,message}=result.error;
    // Keep backend details in server logs; never send SQL or provider errors to the browser.
    console.error('[field-workflow] Supabase operation failed', {code, message: typeof message==='string'?message.slice(0,300):undefined});
    if(code==='40001'||code==='23505')throw workflowError('This record changed. Reload before saving.',409);
    if(code==='42501')throw workflowError('Your current role cannot save this field-workflow action.',403);
    throw workflowError('Workflow storage is unavailable.',503);
  }
  return result.data;
}

const LOCAL_FILTER_FIELDS = new Set([
  'id','domain','crop','geography','season','year','indicator','dataset_id','investigation_id','status',
  'aggregation_level','family','topic','archive','report_id','finding_group_id',
]);

/** Translate the bounded record query into D1 JSON filters so large tables are not scanned in full. */
function localWhere(entity,query){
  const clauses=['entity=?'];const binds=[entity];
  if(['Dataset','AgriculturalObservation'].includes(entity))clauses.push('published=1');
  for(const [key,value] of Object.entries(query??{})){
    if(key==='measure_group'){
      if(value==='production_area')clauses.push("json_extract(data,'$.indicator') IN ('production','harvested_area')");
      else if(value==='reported_yield')clauses.push("json_extract(data,'$.indicator')='reported_yield'");
      else throw workflowError('Invalid measure group.');
      continue;
    }
    if(!LOCAL_FILTER_FIELDS.has(key))throw workflowError('Invalid filter.');
    if(value===undefined||value===null||typeof value==='object')throw workflowError('Invalid filter value.');
    clauses.push(`json_extract(data,'$.${key}')=?`);binds.push(value);
  }
  return {sql:clauses.join(' AND '),binds};
}

export function supabaseFieldRepository(client, admin) {
  const fieldDirectory = async () => {
    // Keep the profile as the authority for active status and role. Auth's
    // users endpoint is server-only and supplies the matching email address;
    // the service_role cannot read auth.users through the Data API.
    const server = admin();
    const profiles = checked(await server
      .from('hingasmart_profiles')
      .select('id,full_name,workspace_role')
      .eq('active', true)
      .in('workspace_role', ['super_admin','field_supervisor','agricultural_officer','field_investigator'])
      .limit(1000));
    if (!profiles.length) return [];

    const users = [];
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await server.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        console.error('[field-workflow] Supabase account directory failed', {
          code: error.code,
          status: error.status,
        });
        throw workflowError('Field account directory is unavailable.', 503);
      }
      users.push(...(data?.users ?? []));
      if ((data?.users?.length ?? 0) < 1000) break;
      if (page === 10) throw workflowError('Field account directory exceeds its safe query limit.', 503);
    }

    const usersById = new Map(users.map((user) => [user.id, user]));
    return profiles.flatMap((profile) => {
      const authUser = usersById.get(profile.id);
      return authUser ? [{
        id: profile.id,
        full_name: profile.full_name,
        workspace_role: profile.workspace_role,
        email: authUser.email ?? '',
      }] : [];
    });
  };
  return {
    cacheKey:'supabase',
    get:async(entity,id)=>checked(await client.from('hingasmart_records').select('data').eq('entity',entity).eq('id',id).maybeSingle())?.data??null,
    list:async(entity,query,cursor)=>checked(await client.rpc('hs_read_records',{p_entity:entity,p_query:query,p_limit:1000,p_offset:Number(cursor)})),
    account:async identity=>{
      // Called only after workflow role and assignment checks.
      const accounts=await fieldDirectory();
      return accounts.find(item=>item.id===identity||item.email?.toLowerCase()===identity.toLowerCase())??null;
    },
    directory:fieldDirectory,
    commit:async(changes,actor)=>checked(await admin().rpc('hs_commit_field_work',{p_changes:changes,p_actor:actor})),
  };
}

export function localFieldRepository(db) {
  return {
    cacheKey:'local',
    get:async(entity,id)=>{const row=await db.prepare('SELECT data FROM local_records WHERE entity=? AND id=?').bind(entity,id).first();return row?JSON.parse(row.data):null;},
    list:async(entity,query,cursor)=>{
      const where=localWhere(entity,query);
      const rows=await db.prepare(`SELECT data FROM local_records WHERE ${where.sql} ORDER BY id LIMIT 1001 OFFSET ?`).bind(...where.binds,Number(cursor)).all();
      return {items:rows.results.slice(0,1000).map(row=>JSON.parse(row.data)),has_more:rows.results.length>1000,next_cursor:rows.results.length>1000?String(Number(cursor)+1000):null};
    },
    account:async identity=>{const row=await db.prepare('SELECT id,email,full_name,workspace_role FROM local_users WHERE active=1 AND (id=? OR lower(email)=lower(?))').bind(identity,identity).first();return row??null;},
    directory:async()=>(await db.prepare("SELECT id,email,full_name,workspace_role FROM local_users WHERE active=1 AND workspace_role IN ('super_admin','field_supervisor','agricultural_officer','field_investigator','officer','admin') ORDER BY full_name").all()).results,
    commit:async changes=>{
      const token=crypto.randomUUID(), statements=[];
      for(const change of changes){
        statements.push(db.prepare(`INSERT INTO field_write_guards(token,ok) SELECT ?, CASE WHEN ?=-1 THEN NOT EXISTS(SELECT 1 FROM local_records WHERE entity=? AND id=?) ELSE EXISTS(SELECT 1 FROM local_records WHERE entity=? AND id=? AND coalesce(json_extract(data,'$.version'),0)=?) END`).bind(`${token}-${change.entity}-${change.id}`,change.expected,change.entity,change.id,change.entity,change.id,change.expected));
        statements.push(db.prepare('INSERT INTO local_records(entity,id,data,published) VALUES(?,?,?,0) ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data').bind(change.entity,change.id,JSON.stringify(change.data)));
      }
      statements.push(db.prepare('DELETE FROM field_write_guards WHERE token LIKE ?').bind(`${token}-%`));
      try{await db.batch(statements);}catch(error){if(/CHECK constraint/i.test(error.message))throw workflowError('This record changed. Reload before saving.',409);throw error;}
    },
  };
}
