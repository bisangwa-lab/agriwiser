import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {normalizePower,fetchPower,powerUrl} from '../src/lib/weather-provider.js';
import {aggregateWeather,climateBaseline,dateList,seasonRange,validateWeatherRange,validateWeatherMap,validateBaseline,WEATHER_LOCATIONS,assertWeatherAccess,riskIndicators,weatherSeries} from '../src/lib/weather-model.js';
import {insideRwanda,powerGrid} from '../src/lib/weather-geometry.js';
import {createWeatherService} from '../src/lib/weather-service.js';
import {createD1WeatherStore} from '../src/lib/weather-store.js';
import {climateAgricultureComparison} from '../src/lib/weather-agriculture.js';
const request={latitude:-2,longitude:30,start:'2025-01-01',end:'2025-01-03'};
const user={workspace_role:'agricultural_analyst'},now=Date.UTC(2026,9,29);
function responseBody(input=request){
 const parameters={};for(const [code,value]of Object.entries({PRECTOTCORR:1,T2M:20,T2M_MIN:15,T2M_MAX:25}))parameters[code]=Object.fromEntries(dateList(input.start,input.end).map(date=>[date.replaceAll('-',''),value]));
 return {type:'Feature',geometry:{type:'Point',coordinates:[input.longitude,input.latitude,1500]},properties:{parameter:parameters},header:{fill_value:-999,sources:['MERRA2','POWER'],time_standard:'UTC',start:input.start.replaceAll('-',''),end:input.end.replaceAll('-',''),api:{version:'test'}},parameters:Object.fromEntries(Object.keys(parameters).map(code=>[code,{units:code==='PRECTOTCORR'?'mm/day':'C'}])),messages:[]};
}
function fromUrl(url){const u=new URL(url),date=value=>value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8);return {latitude:Number(u.searchParams.get('latitude')),longitude:Number(u.searchParams.get('longitude')),start:date(u.searchParams.get('start')),end:date(u.searchParams.get('end'))};}
function memory(){const map=new Map();return {map,get:async key=>map.get(key),set:async(key,data)=>map.set(key,data)};}
test('weather validates bounds, calendar dates, locations, periods and baseline length',()=>{
 assert.equal(validateWeatherRange({location:{district:'Gasabo'},...seasonRange(2025,'Season B')}).location.district,'Gasabo');
 for(const input of [{location:{district:'Invented'},...request},{location:{district:'Gasabo'},start:'2025-02-30',end:'2025-03-01'},{location:{latitude:0,longitude:0},start:request.start,end:request.end},{location:{district:'Gasabo'},start:'1980-01-01',end:'2025-01-01'},{location:{district:'Gasabo'},start:'2025-01-01',end:'2099-01-01'},{location:{district:'Gasabo',role:'admin'},start:request.start,end:request.end}])assert.throws(()=>validateWeatherRange(input));
 assert.throws(()=>validateWeatherMap({start:'2020-01-01',end:'2025-01-01'}));
 assert.throws(()=>validateBaseline({location:{district:'Gasabo'},year:2025,season:'Season B',baselineStart:2010,baselineEnd:2020}));
 assert.throws(()=>validateBaseline({location:{district:'Gasabo'},year:2025,season:'Season B',baselineStart:1991,baselineEnd:2025}));
 assert.deepEqual(seasonRange(2024,'Season A'),{start:'2023-09-01',end:'2024-02-29'});
 assert.deepEqual(seasonRange(2025,'Season C'),{start:'2025-07-01',end:'2025-09-30'});
});
test('NASA parsing preserves zeros, gaps, fill values, quality and provenance without coercion',()=>{
 const body=responseBody();body.properties.parameter.PRECTOTCORR['20250101']=0;body.properties.parameter.PRECTOTCORR['20250102']=-999;delete body.properties.parameter.T2M['20250103'];
 const result=normalizePower(body,request,'2026-10-29T00:00:00Z');
 assert.equal(result.rows[0].PRECTOTCORR,0);assert.equal(result.rows[1].PRECTOTCORR,null);assert.equal(result.rows[2].T2M,null);
 assert.equal(result.rows.length,3);assert.equal(result.source.classification,'model-estimated');assert.equal(result.source.timeStandard,'UTC');assert.ok(result.rows[1].qualityFlags.length);
 const summary=aggregateWeather(result.rows,request.start,request.end);assert.equal(summary.rainfall,null);assert.equal(summary.observedRainfall,1);assert.equal(summary.validDays.PRECTOTCORR,2);
 assert.equal(summary.temperature,20);assert.equal(summary.validDays.T2M,2);
 const inconsistent=responseBody();inconsistent.properties.parameter.T2M_MIN['20250101']=30;assert.equal(normalizePower(inconsistent,request).rows[0].T2M,null);
});
test('NASA rejects wrong units, coordinates, date keys, headers and malformed schemas',()=>{
 for(const change of [body=>{body.parameters.PRECTOTCORR.units='mm';},body=>{body.geometry.coordinates=[0,0];},body=>{body.header.time_standard='LST';},body=>{body.header.start='20200101';},body=>{body.properties.parameter.T2M['20250230']=10;},body=>{delete body.parameters.T2M_MAX;},body=>{body.header.sources=['Unknown'];}]){const body=responseBody();change(body);assert.throws(()=>normalizePower(body,request));}
 assert.throws(()=>normalizePower({},request));
});
test('provider errors, rate limits, invalid JSON, redirects and timeouts have safe messages',async()=>{
 for(const [status,code]of [[500,'PROVIDER_UNAVAILABLE'],[422,'PROVIDER_UNAVAILABLE'],[302,'PROVIDER_UNAVAILABLE'],[429,'RATE_LIMITED']])await assert.rejects(fetchPower(request,{fetcher:async()=>new Response('private error details',{status,headers:{'Retry-After':'15'}})}),error=>error.code===code&&!error.message.includes('private'));
 await assert.rejects(fetchPower(request,{fetcher:async()=>new Response('<html>Unavailable</html>')}),{code:'INVALID_RESPONSE'});
 await assert.rejects(fetchPower(request,{timeoutMs:5,fetcher:async(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted'))))}),{code:'TIMEOUT'});
 const source=await fetchPower(request,{fetcher:async(url,options)=>{assert.equal(new URL(url).origin,'https://power.larc.nasa.gov');assert.equal(options.redirect,'manual');assert.deepEqual(Object.keys(options.headers),['Accept']);return Response.json(responseBody());}});
 assert.equal(source.rows[0].T2M,20);assert.ok(!powerUrl(request).includes('api_key'));
});
test('persistent cache coalesces shared cell requests, reuses data and exposes stale fallback',async()=>{
 const cache=memory();let calls=0,fail=false;
 const service=createWeatherService({cache,now:()=>now,fetcher:async url=>{calls++;if(fail)return new Response('outage',{status:503});return Response.json(responseBody(fromUrl(url)));}});
 const location=WEATHER_LOCATIONS.find(item=>item.district==='Gasabo');
 const [a,b]=await Promise.all([service.range(location,request.start,request.end),service.range(location,'2025-02-01','2025-02-05')]);
 assert.equal(calls,1);assert.equal(a.rows.length,3);assert.equal(b.rows.length,5);
 assert.equal((await service.range(location,request.start,request.end)).cache.status,'cached');
 fail=true;for(const [key,value]of cache.map)if(key.startsWith('weather-v1'))value.expiresAt=now-1;
 const stale=await service.range(location,request.start,request.end);assert.equal(stale.cache.status,'stale');assert.equal(stale.rows[0].T2M,20);assert.equal(stale.cache.staleReason.code,'PROVIDER_UNAVAILABLE');
});
test('provider 429 backoff prevents repeated uncached calls',async()=>{
 const cache=memory();let calls=0;
 const service=createWeatherService({cache,now:()=>now,fetcher:async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'60'}});}});
 for(let i=0;i<2;i++)await assert.rejects(service.range(WEATHER_LOCATIONS[0],request.start,request.end),{code:'RATE_LIMITED'});
 assert.equal(calls,1);
});
test('concurrent requests never exceed the upstream concurrency bound',async()=>{
 const cache=memory();let active=0,peak=0;
 const service=createWeatherService({cache,now:()=>now,concurrency:3,fetcher:async url=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,3));active--;return Response.json(responseBody(fromUrl(url)));}});
 const locations=[...new Map(WEATHER_LOCATIONS.map(item=>[item.grid.id,item])).values()];
 await Promise.all(locations.map(item=>service.range(item,request.start,request.end)));
 assert.ok(peak<=3);assert.equal(peak,3);
});
test('D1 adapter safely upserts cache and atomically rate limits windows',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../migrations/0003_weather.sql',import.meta.url),'utf8'));
 const db={prepare:statement=>({bind:(...args)=>({first:async()=>sql.prepare(statement).get(...args),run:async()=>sql.prepare(statement).run(...args)})})};
 let time=now;const store=createD1WeatherStore(db,()=>time);
 await store.cache.set("a' OR 1=1 --",{value:1,expiresAt:now+1000});await store.cache.set("a' OR 1=1 --",{value:2,expiresAt:now+2000});assert.equal((await store.cache.get("a' OR 1=1 --")).value,2);
 await store.consume('user:test',2);await store.consume('user:test',2);await assert.rejects(store.consume('user:test',2),{code:'APP_RATE_LIMIT'});time+=60000;await store.consume('user:test',2);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM weather_cache').get().n,1);sql.close();
});
test('climate baselines require complete comparable seasons and document anomaly formulas',()=>{
 const input={year:2025,season:'Season B',baselineStart:1991,baselineEnd:2020},rows=[];
 for(const year of [...Array.from({length:30},(_,i)=>1991+i),2025]){const range=seasonRange(year,'Season B');rows.push(...dateList(range.start,range.end).map(date=>({date,PRECTOTCORR:year===2025?0.5:1,T2M:year===2025?23:20,T2M_MIN:15,T2M_MAX:36})));}
 const result=climateBaseline(rows,input);assert.equal(result.rainfall,122);assert.equal(result.rainfallAnomalyPct,-50);assert.equal(result.temperatureAnomalyC,3);assert.equal(result.completeRainfallYears,30);
 const risk=riskIndicators(rows.filter(row=>row.date.startsWith('2025')),result.current,result);assert.equal(risk.rainfallDeficit,true);assert.equal(risk.unusualWarmth,true);assert.equal(risk.hotDays,122);
 const partial=rows.map(row=>row.date==='2025-03-01'?{...row,PRECTOTCORR:null}:row);assert.equal(climateBaseline(partial,input).rainfallAnomalyPct,null);
 const insufficient=rows.map(row=>Number(row.date.slice(0,4))<2002?{...row,PRECTOTCORR:null}:row);assert.equal(climateBaseline(insufficient,input).rainfall,null);
 assert.throws(()=>riskIndicators([],result.current,result,{rainfallDeficitPct:10}));
});
test('series, missing weather and agriculture compatibility remain explicit',()=>{
 const range=seasonRange(2025,'Season B'),rows=normalizePower(responseBody({...request,...range}),{...request,...range}).rows;
 const summary=aggregateWeather(rows,range.start,range.end),weather={...range,location:WEATHER_LOCATIONS.find(item=>item.district==='Gasabo'),classification:'model-estimated',summary};
 const scope={district:'Gasabo',crop:'Maize',year:2025,season:'Season B'};
 const agriculture=[['production',100,'metric tonnes'],['harvested_area',50,'hectares']].map(([indicator,value,unit])=>({domain:'crop',crop:'Maize',geography:'Gasabo',year:2025,season:'Season B',indicator,value,unit,dataset_id:'nisr',source_reference:'Table!A1'}));
 assert.equal(climateAgricultureComparison(weather,agriculture,scope).yield,2);assert.equal(climateAgricultureComparison(weather,agriculture,scope).contextualOnly,true);
 for(const incompatible of [{...weather,start:'2025-03-02'},{...weather,location:{latitude:-2,longitude:30}},{...weather,summary:{...summary,validDays:{...summary.validDays,PRECTOTCORR:100}}}])assert.equal(climateAgricultureComparison(incompatible,agriculture,scope).compatible,false);
 assert.equal(climateAgricultureComparison(weather,[...agriculture,agriculture[0]],scope).compatible,false);
 assert.equal(climateAgricultureComparison(weather,agriculture.map(row=>({...row,is_demo:true})),scope).compatible,false);
 assert.equal(weatherSeries(rows,'month').length,4);assert.equal(weatherSeries(rows,'year')[0].rainfall,122);assert.equal(aggregateWeather([],range.start,range.end).rainfall,null);
});
test('representative locations use real district boundaries and roles are enforced',()=>{
 const geojson=JSON.parse(readFileSync(new URL('../src/data/rwanda-districts.geojson',import.meta.url),'utf8'));
 assert.equal(WEATHER_LOCATIONS.length,30);assert.equal(new Set(WEATHER_LOCATIONS.map(item=>item.grid.id)).size,8);
 assert.ok(WEATHER_LOCATIONS.every(item=>insideRwanda(item.latitude,item.longitude,geojson)));
 assert.equal(insideRwanda(-2.9,30.9,geojson),false);assert.deepEqual(powerGrid(-1.95,30.05),WEATHER_LOCATIONS.find(item=>item.district==='Gasabo').grid);
 for(const role of ['agricultural_analyst','policy_maker','agricultural_officer','data_manager','field_investigator','field_supervisor','super_admin'])assert.doesNotThrow(()=>assertWeatherAccess({workspace_role:role}));
 assert.throws(()=>assertWeatherAccess(null),{status:401});for(const role of ['farmer','public_viewer','cooperative','buyer','agribusiness'])assert.throws(()=>assertWeatherAccess({workspace_role:role}),{status:403});assert.doesNotThrow(()=>assertWeatherAccess(user));
});
