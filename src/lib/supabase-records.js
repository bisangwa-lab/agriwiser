import {assertLocalReadAccess,assertLocalWriteAccess,validateLocalRead} from './local-data-service.js';
import {WORK_ENTITIES} from './field-workflow.js';
const failure=(message,status=400)=>Object.assign(new Error(message),{status});
function result(response){if(response.error)throw failure('The database operation failed. Check your access and the Supabase schema.',response.error.code==='42501'?403:503);return response.data;}
const writable=new Set(['Dataset','AgriculturalObservation','ImportLog','SourceArchive','SourceTableIndex','SourceTable','SourceReportIndex','SourceReportPage','SurveyFile','Alert','Investigation','FollowUpAction','InvestigationNote','ReportFinding']);
function payload(user,entity,record){
 if(WORK_ENTITIES.has(entity))throw failure('Use the audited field workflow.',403);
 if(!writable.has(entity)||!record||typeof record!=='object'||Array.isArray(record)||JSON.stringify(record).length>2*1024*1024)throw failure('Invalid record payload.');
 const id=record.id??`${entity.toLowerCase()}-${crypto.randomUUID()}`;
 if(typeof id!=='string'||!id.length||id.length>500)throw failure('Invalid record identifier.');
 const now=new Date().toISOString();
 return {entity,id,published:['Dataset','AgriculturalObservation','SourceTableIndex','SourceTable','SourceReportIndex','SourceReportPage'].includes(entity),data:{...record,id,created_date:record.created_date??now,updated_date:now,created_by:user.email??user.id}};
}
export function createSupabaseRecords(client,user,writeClient=()=>client){
 return {
  read:async input=>{
   const {entity,query,options}=validateLocalRead(input);assertLocalReadAccess(user,entity);
   const converted={...query};if(converted.year!==undefined)converted.year=Number(converted.year);
   return result(await client.rpc('hs_read_records',{p_entity:entity,p_query:converted,p_sort:options.sort,p_limit:options.limit,p_offset:Number(options.cursor),p_view:options.view}));
  },
  create:async({entity,record})=>{assertLocalWriteAccess(user,entity);return result(await writeClient().from('hingasmart_records').insert(payload(user,entity,record)).select('data').single()).data;},
  update:async({entity,id,patch})=>{
   if(WORK_ENTITIES.has(entity))throw failure('Use the audited field workflow.',403);
   assertLocalWriteAccess(user,entity);if(typeof id!=='string'||!patch||typeof patch!=='object'||Array.isArray(patch)||JSON.stringify(patch).length>2*1024*1024)throw failure('Invalid update.');
   const previous=result(await client.from('hingasmart_records').select('data').eq('entity',entity).eq('id',id).single());
   const data={...previous.data,...patch,id,created_by:previous.data.created_by,updated_date:new Date().toISOString()};
   return result(await writeClient().from('hingasmart_records').update({data}).eq('entity',entity).eq('id',id).select('data').single()).data;
  },
  delete:async({entity,id})=>{if(WORK_ENTITIES.has(entity))throw failure('Workflow history cannot be deleted.',403);assertLocalWriteAccess(user,entity);if(typeof id!=='string')throw failure('Invalid record identifier.');result(await writeClient().from('hingasmart_records').delete().eq('entity',entity).eq('id',id));return {success:true,id};},
  bulkCreate:async({entity,records})=>{assertLocalWriteAccess(user,entity);if(!Array.isArray(records)||records.length>500||JSON.stringify(records).length>8*1024*1024)throw failure('Import at most 500 records and 8 MiB per batch.');if(!records.length)return [];return result(await writeClient().from('hingasmart_records').insert(records.map(record=>payload(user,entity,record))).select('data')).map(item=>item.data);},
  insertOnce:async(entity,record)=>{assertLocalWriteAccess(user,entity);const saved=result(await writeClient().from('hingasmart_records').upsert(payload(user,entity,record),{onConflict:'entity,id',ignoreDuplicates:true}).select('data'));if(saved.length)return {record:saved[0].data,kind:entity,alreadyExists:false};return {record:result(await client.from('hingasmart_records').select('data').eq('entity',entity).eq('id',record.id).single()).data,kind:entity,alreadyExists:true};},
 };
}
