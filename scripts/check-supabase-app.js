import assert from 'node:assert/strict';
import {fromCrossJSON,toJSONAsync} from 'seroval';
import {defaultSerovalDeserializerPlugins} from '@tanstack/start-client-core';
const origin='http://127.0.0.1:5174',ids={},cookies=new Map();
for(const module of ['local-auth','local-data','weather','account-management']){
 const source=await(await fetch(origin+'/src/lib/'+module+'.js')).text();
 for(const match of source.matchAll(/export const (\w+) = [\s\S]*?createClientRpc\("([^"]+)"\)/g))ids[match[1]]=match[2];
}
async function rpc(name,method='GET',data){
 assert.ok(ids[name],'RPC available: '+name);
 const encoded=data===undefined?undefined:JSON.stringify(await toJSONAsync({data}));
 const headers={accept:'application/json','x-tsr-serverFn':'true',Origin:origin,...(cookies.size?{Cookie:[...cookies].map(([key,value])=>key+'='+value).join('; ')}:{})};
 if(method==='POST'&&encoded)headers['content-type']='application/json';
 const response=await fetch(origin+'/_serverFn/'+ids[name]+(method==='GET'&&encoded?'?payload='+encodeURIComponent(encoded):''),{method,headers,...(method==='POST'&&encoded?{body:encoded}:{}),signal:AbortSignal.timeout(60000)});
 for(const entry of response.headers.getSetCookie()){const pair=entry.split(';',1)[0],index=pair.indexOf('='),key=pair.slice(0,index),value=pair.slice(index+1);if(/max-age=0/i.test(entry)||!value)cookies.delete(key);else cookies.set(key,value);assert.match(entry,/httponly/i);}
 const payload=await response.json(),decoded=response.headers.get('x-tss-serialized')?fromCrossJSON(payload,{refs:new Map(),plugins:defaultSerovalDeserializerPlugins}):payload;if(decoded.error)throw decoded.error;return decoded.result;
}
const configuration=await rpc('accountConfiguration');assert.equal(configuration.backend,'supabase');
await assert.rejects(rpc('localReadCollection','GET',{entity:'Dataset'}));
const viewer=await rpc('localQuickLogin','POST',{account:'viewer'});assert.equal(viewer.user.workspace_role,'public_viewer');
assert.equal((await rpc('localMe')).user.id,viewer.user.id);
assert.ok((await rpc('localReadCollection','GET',{entity:'Dataset'})).items.length>=17);
await assert.rejects(rpc('localReadCollection','GET',{entity:'SourceArchive'}));
await assert.rejects(rpc('getAccounts'));
assert.equal((await rpc('getWeatherStatus','POST')).error.status,403);
const analyst=await rpc('localQuickLogin','POST',{account:'analytics'});assert.equal(analyst.user.workspace_role,'agricultural_analyst');
const crop=await rpc('localReadCollection','GET',{entity:'AgriculturalObservation',query:{domain:'crop',crop:'Maize',geography:'Gasabo',year:2025,season:'Season B'}});assert.ok(crop.items.length>=2);
const input={location:{district:'Gasabo'},start:'2025-03-01',end:'2025-06-30',dataset:'merra2'},weather=await rpc('getWeather','POST',input);assert.equal(weather.ok,true,weather.error?.message);assert.ok(Math.abs(weather.data.summary.rainfall-352.21)<0.01);assert.equal(weather.data.cache.status,'cached');
const meteo=await rpc('getMeteoCatalogue','POST');assert.equal(meteo.data.status,'not-configured');
const admin=await rpc('localQuickLogin','POST',{account:'administrator'});assert.equal(admin.user.workspace_role,'super_admin');
const accounts=await rpc('getAccounts');assert.ok(accounts.length>=5);
const status=await rpc('getWeatherStatus','POST');assert.equal(status.ok,true,status.error?.message);assert.ok(status.data.nasa.entries>0);assert.ok(status.data.era5.entries>0);
for(const path of ['/.dev.vars','/.env.local','/.local-accounts.json','/data/private/records-export.ndjson']){const response=await fetch(origin+path);assert.ok([403,404].includes(response.status),'Private file blocked: '+path);}
const html=await(await fetch(origin+'/login')).text();assert.match(html,/favicon\.svg/);
const csrf=await fetch(origin+'/_serverFn/'+ids.localQuickLogin,{method:'POST',headers:{Origin:'https://example.com'}});assert.equal(csrf.status,403);
await rpc('localLogout','POST');assert.equal((await rpc('localMe')).status,401);
console.log('Live Supabase application checks passed: real sessions, HttpOnly cookies, account roles, dataset reads, private-archive denial, real cached NASA weather, administrator monitoring, source availability, CSRF and secret-file protection.');
