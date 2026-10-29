// All measurements in this file are explicit automated test fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { normalizeMeteoDelivery,meteoCatalogue,meteoRange,validateMeteoRange } from '../src/lib/meteo-rwanda-provider.js';
import { weatherReportRecords } from '../src/lib/weather-report.js';
import { createD1WeatherStore } from '../src/lib/weather-store.js';
import { createWeatherService } from '../src/lib/weather-service.js';
import { WEATHER_LOCATIONS } from '../src/lib/weather-model.js';

const now='2026-10-29T00:00:00Z';
const fixture=()=>({schemaVersion:1,provider:'Meteo Rwanda',dataset:'TEST FIXTURE ONLY',licence:'Fixture testing licence',authorizationReference:'PRIVATE-TEST-REFERENCE',issuedAt:'2025-03-03T00:00:00Z',sourceUrl:'https://www.meteorwanda.gov.rw/climate-warning',timeStandard:'UTC',temporalResolution:'daily',units:{PRECTOTCORR:'mm/day',T2M:'C',T2M_MIN:'C',T2M_MAX:'C'},stations:[{id:'TEST-ONLY-1',name:'Fixture station',district:'Gasabo',latitude:-1.9,longitude:30.1,classification:'station-observed',spatialResolution:'Single test point; no areal representation',rows:[{date:'2025-03-01',PRECTOTCORR:0,T2M:20,T2M_MIN:15,T2M_MAX:25},{date:'2025-03-02',PRECTOTCORR:null,T2M:21,T2M_MIN:16,T2M_MAX:26}]}]});
test('authorized delivery retains independent source identity, zeros, gaps and private authorization',()=>{
 const delivery=normalizeMeteoDelivery(fixture(),()=>true,now),catalogue=meteoCatalogue(delivery);
 assert.equal(catalogue.status,'authorized-delivery');assert.equal(catalogue.locations[0].classification,'station-observed');
 assert.ok(!JSON.stringify(catalogue).includes('PRIVATE-TEST-REFERENCE'));
 const result=meteoRange(delivery,{location:{district:'Gasabo'},start:'2025-03-01',end:'2025-03-03'});
 assert.equal(result.rows[0].PRECTOTCORR,0);assert.equal(result.rows[2].T2M,null);assert.equal(result.summary.rainfall,null);assert.equal(result.summary.missingDays.PRECTOTCORR,2);
 const report=weatherReportRecords(result);assert.equal(report[0].provider,'Meteo Rwanda');assert.equal(report[0].value,null);assert.equal(report[0].missing_days,2);assert.ok(!report[0].indicator.includes('corrected'));
 assert.ok(!JSON.stringify(report).includes('PRIVATE-TEST-REFERENCE'));assert.ok(!JSON.stringify(report).includes('NASA POWER'));
});
test('authorized delivery rejects false provenance, invalid units, duplicates, locations and dates',()=>{
 for(const mutate of [body=>body.provider='NASA POWER',body=>body.units.T2M='F',body=>body.sourceUrl='https://example.com/',body=>body.sourceUrl+='?token=private',body=>body.authorizationReference='',body=>body.stations[0].rows.push(body.stations[0].rows[0]),body=>body.stations[0].rows[0].date='2025-02-30',body=>body.stations[0].rows[0].T2M=-999,body=>body.stations[0].rows[0].T2M_MAX=10,body=>delete body.stations[0].rows[0].PRECTOTCORR]){
  const body=fixture();mutate(body);assert.throws(()=>normalizeMeteoDelivery(body,()=>true,now),{code:'INVALID_METEO_DELIVERY'});
 }
 assert.throws(()=>normalizeMeteoDelivery(fixture(),()=>false,now),{code:'INVALID_METEO_DELIVERY'});
 assert.throws(()=>validateMeteoRange({location:{district:'Gasabo'},start:'2025-01-01',end:'2025-01-02',url:'https://example.com'}));
 assert.throws(()=>validateMeteoRange({location:{latitude:-2,longitude:30},start:'2025-01-01',end:'2025-01-02'}));
});
test('multiple stations require explicit selection and never average or substitute',()=>{
 const body=fixture();body.stations.push({...body.stations[0],id:'TEST-ONLY-2'});const delivery=normalizeMeteoDelivery(body,()=>true,now),input={location:{district:'Gasabo'},start:'2025-03-01',end:'2025-03-02'};
 assert.throws(()=>meteoRange(delivery,input),{code:'METEO_LOCATION_UNAVAILABLE'});
 assert.equal(meteoRange(delivery,{...input,stationId:'TEST-ONLY-2'}).location.id,'TEST-ONLY-2');
 assert.throws(()=>meteoRange(delivery,{...input,location:{district:'Kirehe'}}));
});
test('persistent administrator monitoring counts cache quality and bounds safe events',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../migrations/0003_weather.sql',import.meta.url),'utf8'));
 const db={prepare:statement=>({bind:(...args)=>({first:async()=>sql.prepare(statement).get(...args),run:async()=>sql.prepare(statement).run(...args)}),all:async()=>({results:sql.prepare(statement).all()}),first:async()=>sql.prepare(statement).get(),run:async()=>sql.prepare(statement).run()})},store=createD1WeatherStore(db);
 await store.cache.set('weather-v1|merra2:-2:30|2025',{expiresAt:1,source:{provider:'NASA POWER',retrievedAt:now},rows:[{date:'2025-01-01',PRECTOTCORR:0,T2M:null}]});
 for(let i=0;i<105;i++)await store.record({at:now,event:i%2?'success':'error',code:i%2?undefined:'TIMEOUT'});
 const status=await store.status();assert.equal(status.entries.length,1);assert.equal(status.quality.days,1);assert.equal(status.quality.rainfall_missing,0);assert.equal(status.quality.temperature_missing,1);assert.equal(status.events.length,20);assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM weather_events').get().count,100);sql.close();
});
test('transient failures get one bounded backoff retry and every attempt is monitored',async()=>{
 const map=new Map(),events=[],delays=[];let calls=0;
 const service=createWeatherService({cache:{get:async key=>map.get(key),set:async(key,value)=>map.set(key,value)},record:async event=>events.push(event),sleep:async ms=>delays.push(ms),fetcher:async()=>{calls++;return new Response('private upstream message',{status:503});},now:()=>Date.parse(now)});
 await assert.rejects(service.range(WEATHER_LOCATIONS[0],'2025-03-01','2025-03-02'),{code:'PROVIDER_UNAVAILABLE'});
 assert.equal(calls,2);assert.deepEqual(delays,[500]);assert.equal(events.length,2);assert.ok(events.every(event=>event.code==='PROVIDER_UNAVAILABLE'));assert.ok(!JSON.stringify(events).includes('private upstream message'));
});
