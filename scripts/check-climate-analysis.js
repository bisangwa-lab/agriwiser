import assert from 'node:assert/strict';
import {fromCrossJSON,toJSONAsync} from 'seroval';
const origin='http://127.0.0.1:5174',ids={};let cookie='';
for(const module of ['local-auth','weather']){
 const source=await(await fetch(origin+'/src/lib/'+module+'.js')).text();
 for(const match of source.matchAll(/export const (\w+) = [\s\S]*?createClientRpc\("([^"]+)"\)/g))ids[match[1]]=match[2];
}
async function rpc(name,data){
 assert.ok(ids[name],'RPC available: '+name);
 const body=JSON.stringify(await toJSONAsync({data}));
 const response=await fetch(origin+'/_serverFn/'+ids[name],{method:'POST',headers:{accept:'application/json','x-tsr-serverFn':'true','content-type':'application/json',Origin:origin,...(cookie?{Cookie:cookie}:{})},body});
 if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
 const payload=await response.json(),decoded=response.headers.get('x-tss-serialized')?fromCrossJSON(payload,{refs:new Map()}):payload;
 if(decoded.error)throw decoded.error;
 return decoded.result;
}
const scope={district:'Gasabo',crop:'Maize',season:'Season B',year:2026,referenceYear:2025,baselineStart:1991,baselineEnd:2020,dataset:'merra2',includeBaseline:true};
await assert.rejects(rpc('getClimateAnalysis',scope));
await rpc('localQuickLogin',{account:'viewer'});assert.equal((await rpc('getClimateAnalysis',scope)).error.status,403);
await rpc('localQuickLogin',{account:'analytics'});
const analysis=await rpc('getClimateAnalysis',scope);assert.equal(analysis.ok,true,JSON.stringify(analysis.error));const a=analysis.data;
assert.equal(a.trend.length,5);assert.equal(a.current.summary.validDays.PRECTOTCORR,122);assert.ok(a.normal.completeRainfallYears>=20);assert.ok(a.crops.current.yield>0);assert.ok(Math.abs(a.crops.decomposition.areaTonnes+a.crops.decomposition.yieldTonnes-a.crops.changes.production.absolute)<1e-8);
console.log('Live analysis passed',{rainfall:a.current.summary.rainfall,yield:a.crops.current.yield,normalYears:a.normal.completeRainfallYears,trendYears:a.trend.length});
const ranking=await rpc('getClimateRanking',scope);assert.equal(ranking.ok,true,JSON.stringify(ranking.error));assert.equal(ranking.data.rows.length,30);assert.equal(ranking.data.rows.find(r=>r.district==='Gasabo').yield,a.crops.current.yield);
console.log('Live all-district comparison passed',{rows:ranking.data.rows.length,comparable:ranking.data.rows.filter(r=>r.yieldChangePct!==null).length});
assert.equal((await rpc('saveClimateFinding',{analysisId:crypto.randomUUID(),notes:'Verification only; no finding should be saved.'})).error.code,'ANALYSIS_EXPIRED');
await rpc('localQuickLogin',{account:'field_operations'});assert.equal((await rpc('saveClimateFinding',{analysisId:a.analysisId,notes:'Verification only; no finding should be saved.'})).error.code,'ANALYSIS_EXPIRED');
await rpc('localLogout');console.log('Anonymous/viewer access, snapshot ownership and expiry checks passed.');
