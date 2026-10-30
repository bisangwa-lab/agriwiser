import {createServerFn} from '@tanstack/react-start';
import {requireUser} from '@/lib/auth-middleware';
import {evaluateAlerts} from '@/lib/alert-rules';
import {normalizeRole} from '@/lib/rbac';
import {recordsForUser} from './local-data.server.js';
import {fetchUserSavedInterests, addUserSavedInterest, deleteUserSavedInterest} from './community-interests.server.js';

export const getServerInfo=createServerFn({method:'GET'}).handler(()=>({renderedAt:new Date().toISOString()}));
export const regenerateAlerts=createServerFn({method:'POST'}).middleware([requireUser]).handler(async({context})=>{
 if(!['super_admin','data_manager'].includes(normalizeRole(context.user)))throw Object.assign(new Error('Only administrators and data managers can regenerate alerts.'),{status:403});
 const repository=await recordsForUser(context.user);
 async function all(entity,query={}){const rows=[];for(let offset=0;offset<200000;offset+=1000){const page=await repository.read({entity,query,options:{limit:1000,cursor:String(offset)}});rows.push(...page.items);if(!page.has_more)return rows;}throw new Error('Record scope exceeds the supported regeneration budget.');}
 const observations=await all('AgriculturalObservation',{domain:'crop'}),drafts=evaluateAlerts(observations),existing=await all('Alert'),keys=new Set(existing.map(row=>row.dedupe_key).filter(Boolean)),generated_date=new Date().toISOString(),created=drafts.filter(row=>!keys.has(row.dedupe_key)).map(row=>({...row,generated_date}));
 for(let offset=0;offset<created.length;offset+=400)await repository.bulkCreate({entity:'Alert',records:created.slice(offset,offset+400)});
 return {evaluated:observations.length,candidates:drafts.length,created:created.length,alreadyPresent:drafts.length-created.length};
});

export const getCommunitySavedInterests = createServerFn({method: 'GET'}).middleware([requireUser]).handler(async ({context}) => {
  return fetchUserSavedInterests(context.user);
});

export const saveCommunityInterest = createServerFn({method: 'POST'}).middleware([requireUser]).validator((input) => input).handler(async ({data, context}) => {
  return addUserSavedInterest(context.user, data);
});

export const removeCommunityInterest = createServerFn({method: 'POST'}).middleware([requireUser]).validator((input) => input).handler(async ({data, context}) => {
  return deleteUserSavedInterest(context.user, data?.id);
});
