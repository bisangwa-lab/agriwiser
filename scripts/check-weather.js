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
const input={location:{district:'Gasabo'},start:'2025-03-01',end:'2025-06-30'};
async function login(account,role){const result=await rpc('localQuickLogin',{account});assert.equal(result.user?.workspace_role,role,result.error??'Quick-login role mismatch');}
await assert.rejects(rpc('getWeather',input));
await login('viewer','public_viewer');
assert.equal((await rpc('getWeather',input)).error.status,403);
assert.equal((await rpc('getMeteoCatalogue')).error.status,403);
assert.equal((await rpc('getWeatherStatus')).error.status,403);
await login('analytics','agricultural_analyst');
assert.equal((await rpc('getWeatherStatus')).error.status,403);
const meteo=await rpc('getMeteoCatalogue');assert.equal(meteo.ok,true);assert.equal(meteo.data.status,'not-configured');assert.deepEqual(meteo.data.locations,[]);
assert.equal((await rpc('getMeteoWeather',input)).error.code,'METEO_NOT_CONFIGURED');
const result=await rpc('getWeather',input);
assert.equal(result.ok,true,result.error?.message);
assert.equal(result.data.rows.length,122);assert.equal(result.data.summary.expectedDays,122);
assert.equal(result.data.classification,'model-estimated');
assert.equal(result.data.location.grid.id,'merra2:-2:30');
assert.ok(result.data.sources.every(source=>source.provider==='NASA POWER'&&source.timeStandard==='UTC'&&source.sourceUrl.startsWith('https://power.larc.nasa.gov/api/temporal/daily/point?')));
assert.ok(result.data.summary.validDays.PRECTOTCORR>0);
const repeat=await rpc('getWeather',input);assert.equal(repeat.data.cache.status,'cached');assert.deepEqual(repeat.data.rows,result.data.rows);
console.log('Authenticated live NASA POWER retrieval, schema, daily coverage, provenance and persistent cache passed.',{rainfall:result.data.summary.rainfall,temperature:result.data.summary.temperature});
const invalidPoint=await rpc('getWeather',{location:{latitude:-2.9,longitude:30.9},start:input.start,end:input.end});
assert.equal(invalidPoint.ok,false);assert.equal(invalidPoint.error.code,'INVALID_LOCATION');
await assert.rejects(rpc('getWeather',{...input,end:'2025-02-30'}));
const map=await rpc('getWeatherMap',{start:input.start,end:input.end});
assert.equal(map.ok,true,map.error?.message);assert.equal(map.data.districts.length,30);assert.equal(map.data.gridCells,8);
assert.ok(map.data.districts.some(item=>item.summary?.rainfall!==null&&item.summary?.rainfall!==undefined));
assert.ok(map.data.districts.every(item=>item.summary||item.error));
console.log('Live district map returned 30 districts with 8 shared cells; unavailable responses remain explicit.',{loaded:map.data.districts.filter(item=>item.summary).length});
const baseline=await rpc('getWeatherBaseline',{location:input.location,year:2025,season:'Season B',baselineStart:1991,baselineEnd:2020});
assert.equal(baseline.ok,true,baseline.error?.message);assert.equal(baseline.data.periods.length,30);
assert.ok(baseline.data.completeRainfallYears>=20);assert.ok(baseline.data.completeTemperatureYears>=20);
assert.equal(baseline.data.current.rainfall,result.data.summary.rainfall);
assert.ok(Math.abs(baseline.data.rainfallAnomalyPct-100*(baseline.data.current.rainfall-baseline.data.rainfall)/baseline.data.rainfall)<1e-8);
console.log('Live 1991–2020 climate baseline and selected-season anomaly formula passed.',{years:baseline.data.completeRainfallYears,anomalyPct:baseline.data.rainfallAnomalyPct});
await login('field_operations','agricultural_officer');assert.equal((await rpc('getWeather',input)).ok,true);
const csrf=await fetch(origin+'/_serverFn/'+ids.getWeather,{method:'POST',headers:{Origin:'https://example.com',Cookie:cookie}});assert.equal(csrf.status,403);
await login('administrator','super_admin');
const status=await rpc('getWeatherStatus');assert.equal(status.ok,true,status.error?.message);assert.ok(status.data.nasa.lastSuccessfulRetrieval);assert.ok(status.data.nasa.entries>=8);assert.ok(status.data.nasa.quality.days>0);assert.equal(status.data.meteo.status,'not-configured');
assert.ok(!JSON.stringify(status.data).includes('authorizationReference'));
console.log('Administrator-only persistent integration monitoring and explicit disconnected Meteo Rwanda status passed.',{cellYearEntries:status.data.nasa.entries,gridCells:status.data.nasa.gridCells});
await rpc('localLogout');
console.log('Weather HTTP verification passed: real provider, cache, map, baseline, analyst/field roles, denied viewer/anonymous, invalid coordinates/dates and CSRF.');
