import test from 'node:test';
import assert from 'node:assert/strict';
import {supabaseConfig,selectedBackend} from '../src/lib/supabase-config.js';
import {createSupabaseRecords} from '../src/lib/supabase-records.js';
import {createSupabaseWeatherStore} from '../src/lib/supabase-weather-store.js';
test('Supabase configuration rejects browser-secret misuse and production local fallback',()=>{
 assert.throws(()=>supabaseConfig({}),{status:503});
 assert.throws(()=>supabaseConfig({SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_secret_fixture'}));
 for(const url of ['http://example.com','https://user:password@example.com','https://example.com/path','https://example.com/?key=fixture'])assert.throws(()=>supabaseConfig({SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'}));
 const legacy='eyJ.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.fixture';assert.throws(()=>supabaseConfig({SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:legacy}));
 assert.equal(selectedBackend({APP_BACKEND:'local'},false),'supabase');assert.equal(selectedBackend({APP_BACKEND:'local'},true),'local');assert.equal(selectedBackend({APP_BACKEND:'local',SUPABASE_URL:'https://example.supabase.co'},true),'supabase');
});
test('Supabase data adapter enforces role checks before privileged writes or private reads',async()=>{
 let privileged=false;const client={rpc:async()=>{throw new Error('Unexpected request');}},repository=createSupabaseRecords(client,{id:'fixture',workspace_role:'public_viewer'},()=>{privileged=true;throw new Error('Unexpected admin client');});
 await assert.rejects(repository.create({entity:'Dataset',record:{name:'Fixture'}}),{status:403});
 await assert.rejects(repository.read({entity:'SourceArchive'}),{status:403});
 await assert.rejects(repository.bulkCreate({entity:'Investigation',records:[]}),{status:403});assert.equal(privileged,false);
});
test('Supabase reads preserve validated filters and bounded pagination',async()=>{
 let args;const repository=createSupabaseRecords({rpc:async(name,input)=>{args={name,input};return {data:{items:[{value:0}],has_more:false,next_cursor:null},error:null};}},{id:'fixture',workspace_role:'agricultural_analyst'});
 const page=await repository.read({entity:'AgriculturalObservation',query:{year:'2025',crop:'Maize'},options:{limit:2000,cursor:'2000',view:'metrics'}});
 assert.equal(page.items[0].value,0);assert.equal(args.name,'hs_read_records');assert.equal(args.input.p_query.year,2025);assert.equal(args.input.p_offset,2000);assert.equal(args.input.p_limit,2000);
 await assert.rejects(repository.read({entity:'local_users'}));await assert.rejects(repository.read({entity:'Dataset',query:{sql:'fixture'}}));
});
test('Supabase cache metadata preserves real zeros and counts missing values explicitly',async()=>{
 let saved;const store=createSupabaseWeatherStore({from:table=>({upsert:async row=>{saved={table,row};return {data:null};}})});
 await store.cache.set('weather-v1|fixture|2025',{expiresAt:100,source:{provider:'TEST FIXTURE ONLY'},rows:[{PRECTOTCORR:0,T2M:null},{PRECTOTCORR:null,T2M:20}]});
 assert.equal(saved.table,'hs_weather_cache');assert.equal(saved.row.record_days,2);assert.equal(saved.row.rainfall_missing,1);assert.equal(saved.row.temperature_missing,1);assert.equal(saved.row.data.rows[0].PRECTOTCORR,0);
});
test('Supabase rate-limit rejection remains a controlled 429',async()=>{
 const store=createSupabaseWeatherStore({rpc:async()=>({data:false,error:null})},()=>1000);
 await assert.rejects(store.consume('fixture',10,1,60000),{code:'APP_RATE_LIMIT',status:429});
});
