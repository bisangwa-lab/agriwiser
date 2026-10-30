import fs from 'node:fs';
import {createInterface} from 'node:readline';
import {createClient} from '@supabase/supabase-js';
import {serverSettings,queryDatabase} from './supabase-management.js';
const settings=await serverSettings(),client=createClient(settings.SUPABASE_URL,settings.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const checked=response=>{if(response.error)throw new Error('Supabase import failed: '+response.error.code);return response.data;};
const migrations=fs.readdirSync('supabase/migrations').filter(name=>/^\d{14}_.+\.sql$/.test(name)).sort();
if(!migrations.length)throw new Error('No timestamped Supabase migrations were found.');
const migrationSql=migrations.map(name=>fs.readFileSync('supabase/migrations/'+name,'utf8')).join('\n');
await queryDatabase('begin;\n'+migrationSql+'\ncommit;');
const progressFile='data/private/supabase-import-progress.json',progress=fs.existsSync(progressFile)?JSON.parse(fs.readFileSync(progressFile,'utf8')):{records:0,weather:0};
let batch=[],bytes=0,seen=0,lastQueued=progress.records;
async function flush(){if(!batch.length)return;checked(await client.from('hingasmart_records').upsert(batch,{onConflict:'entity,id'}));progress.records=lastQueued;fs.writeFileSync(progressFile,JSON.stringify(progress));console.log('Imported records: '+lastQueued);batch=[];bytes=0;}
for await(const line of createInterface({input:fs.createReadStream('data/private/records-export.ndjson'),crlfDelay:Infinity})){
 if(!line)continue;seen++;if(seen<=progress.records)continue;
 const row=JSON.parse(line),data=JSON.parse(row.data);const record={entity:row.entity,id:row.id,data,published:Boolean(row.published)};
 const length=Buffer.byteLength(JSON.stringify(record));if(batch.length&&(bytes+length>3*1024*1024||batch.length>=1000))await flush();batch.push(record);bytes+=length;lastQueued=seen;
}
await flush();
let weatherSeen=0;
for await(const line of createInterface({input:fs.createReadStream('data/private/weather-export.ndjson'),crlfDelay:Infinity})){
 if(!line)continue;weatherSeen++;if(weatherSeen<=progress.weather)continue;const row=JSON.parse(line);if(row.cache_key.startsWith('climate-analysis|'))continue;
 const data=JSON.parse(row.data),rows=data.rows??[];checked(await client.from('hs_weather_cache').upsert({cache_key:row.cache_key,data,expires_at:row.expires_at,provider:data.source?.provider??null,record_days:rows.length,rainfall_missing:rows.filter(r=>r.PRECTOTCORR==null).length,temperature_missing:rows.filter(r=>r.T2M==null).length},{onConflict:'cache_key'}));progress.weather=weatherSeen;fs.writeFileSync(progressFile,JSON.stringify(progress));
}
console.log('Weather cache copied without legacy session-owned analyses.');
const users=JSON.parse(fs.readFileSync('data/private/users-export.json','utf8')),credentials=fs.existsSync('.local-accounts.json')?JSON.parse(fs.readFileSync('.local-accounts.json','utf8')):{},passwords=new Map();
if(credentials.email&&credentials.password)passwords.set(credentials.email,credentials.password);for(const value of Object.values(credentials))if(value?.email&&value?.password)passwords.set(value.email,value.password);
const existing=checked(await client.auth.admin.listUsers({page:1,perPage:1000})).users;
for(const user of users){
 let authUser=existing.find(item=>item.email?.toLowerCase()===user.email.toLowerCase());
 if(!authUser)authUser=checked(await client.auth.admin.createUser({email:user.email,email_confirm:true,...(passwords.has(user.email)?{password:passwords.get(user.email)}:{}),user_metadata:{full_name:user.full_name}})).user;
 checked(await client.from('hingasmart_profiles').upsert({id:authUser.id,full_name:user.full_name,workspace_role:user.workspace_role,active:Boolean(user.active),created_at:user.created_date},{onConflict:'id',ignoreDuplicates:true}));
}
console.log('Imported '+users.length+' account profiles. Existing passwords were reused only where locally available; no hashes, tokens, emails or credentials were printed or emailed.');
console.log(await queryDatabase("select entity,count(*)::int as records from public.hingasmart_records group by entity order by entity"));
