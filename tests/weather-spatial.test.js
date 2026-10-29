// All numeric measurements below are explicit test fixtures, never production data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {districtCellOverlaps} from '../src/lib/weather-overlap.js';
import {WEATHER_OVERLAPS,spatialLocation,weightedDistrictWeather,spatialWeatherRange,loadWeatherCells} from '../src/lib/weather-spatial.js';
import {weatherGrid} from '../src/lib/weather-datasets.js';
import {normalizeEra5,fetchEra5,era5Url} from '../src/lib/weather-era5-provider.js';
import {createWeatherService} from '../src/lib/weather-service.js';
import {WEATHER_LOCATIONS,validateWeatherRange,validateWeatherMap,validateBaseline,dateList,climateBaseline,aggregateWeather} from '../src/lib/weather-model.js';
import {weatherReportRecords,weatherDailyRecords} from '../src/lib/weather-report.js';
import {climateAgricultureComparison} from '../src/lib/weather-agriculture.js';
const start='2025-03-01',end='2025-03-02',now=Date.UTC(2026,9,30);
const rectangle=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
const feature=(type,coordinates)=>({type:'Feature',properties:{shapeName:'TEST ONLY'},geometry:{type,coordinates}});
const memory=()=>{const map=new Map();return {map,get:async key=>map.get(key),set:async(key,value)=>map.set(key,value)};};
function body(grid,from=start,to=end){return {latitude:grid.latitude,longitude:grid.longitude,utc_offset_seconds:0,timezone:'GMT',daily_units:{time:'iso8601',precipitation_sum:'mm',temperature_2m_mean:'°C',temperature_2m_min:'°C',temperature_2m_max:'°C'},daily:{time:dateList(from,to),...Object.fromEntries(Object.entries({precipitation_sum:1,temperature_2m_mean:20,temperature_2m_min:15,temperature_2m_max:25}).map(([key,value])=>[key,dateList(from,to).map(()=>value)]))}};}
function resultsFor(location,from=start,to=end){return new Map(location.cells.map((cell,i)=>[cell.id,{rows:dateList(from,to).map(date=>({date,PRECTOTCORR:i===0?0:10,T2M:20+i,T2M_MIN:15+i,T2M_MAX:25+i,qualityFlags:[]})),sources:[{provider:'Open-Meteo',sourceUrl:'https://example.test/'+cell.id,dataset:'TEST FIXTURE',parameters:{}}],cache:{status:'cached',retrievedAt:'2026-10-30T00:00:00Z'}}]));}
test('overlap geometry partitions known areas, subtracts holes, includes islands and handles concave polygons',()=>{
 const geometry=feature('MultiPolygon',[[rectangle(29.9,-2.1,30.1,-1.9),rectangle(29.95,-2.05,30.05,-1.95)],[rectangle(30.4,-2.1,30.6,-1.9)]]);
 const result=districtCellOverlaps(geometry,'merra2');
 assert.equal(result.cells.length,2);
 const sin=value=>Math.sin(value*Math.PI/180),outer=0.2*(sin(-1.9)-sin(-2.1)),hole=0.1*(sin(-1.95)-sin(-2.05));
 assert.ok(Math.abs(result.cells[0].weight-(outer-hole)/(2*outer-hole))<1e-10);
 assert.ok(Math.abs(result.cells[1].weight-outer/(2*outer-hole))<1e-10);
 const touching=districtCellOverlaps(feature('Polygon',[rectangle(29.6875,-2.25,30.3125,-1.75)]));
 assert.equal(touching.cells.length,1);assert.equal(touching.cells[0].weight,1);
 const concave=districtCellOverlaps(feature('Polygon',[[[29.5,-2.4],[30.4,-2.4],[30.4,-1.6],[30.1,-1.6],[30.1,-2.1],[29.8,-2.1],[29.8,-1.6],[29.5,-1.6],[29.5,-2.4]]]),'era5');
 assert.ok(Math.abs(concave.cells.reduce((sum,c)=>sum+c.weight,0)-1)<1e-9);
 const south=districtCellOverlaps(feature('Polygon',[rectangle(29.8,-60.2,30.2,-59.8)]),'era5');
 assert.ok(south.cells.every(cell=>cell.weight>0));
});
test('real district overlaps include all 14 MERRA-2 and 51 ERA5 cells, are reproducible and sum to full area',()=>{
 const boundaries=JSON.parse(readFileSync(new URL('../src/data/rwanda-districts.geojson',import.meta.url),'utf8'));
 for(const [dataset,count]of [['merra2',14],['era5',51]]){
  const partition=WEATHER_OVERLAPS[dataset];assert.equal(partition.cells.length,count);assert.equal(partition.districts.length,30);
  for(const district of partition.districts){assert.ok(district.areaKm2>0);assert.ok(Math.abs(district.cells.reduce((sum,c)=>sum+c.weight,0)-1)<1e-7);assert.ok(district.cells.every(cell=>cell.weight>0&&partition.cells.some(c=>c.id===cell.id)));}
  for(const f of boundaries.features)assert.deepEqual(districtCellOverlaps(f,dataset),partition.districts.find(d=>d.district===f.properties.shapeName));
 }
 assert.ok(WEATHER_OVERLAPS.merra2.cells.some(cell=>!WEATHER_LOCATIONS.some(point=>point.grid.id===cell.id)));
});
test('district values use every overlap weight; missing area is never renormalized and zeros remain valid',()=>{
 const location={district:'TEST',dataset:'era5',spatialMethod:'area-weighted',spatialResolution:'test',areaKm2:100,cells:[{id:'a',weight:0.25},{id:'b',weight:0.75}]};
 const results=resultsFor(location),weather=weightedDistrictWeather(location,results,start,end);
 assert.equal(weather.rows[0].PRECTOTCORR,7.5);assert.equal(weather.summary.rainfall,15);assert.equal(weather.rows[0].T2M,20.75);assert.equal(weather.summary.spatialCoverage.PRECTOTCORR,1);
 results.get('b').rows[0].PRECTOTCORR=null;
 const partial=weightedDistrictWeather(location,results,start,end);
 assert.equal(partial.rows[0].PRECTOTCORR,null);assert.equal(partial.rows[0].spatialCoverage.PRECTOTCORR,0.25);assert.equal(partial.summary.rainfall,null);assert.equal(partial.summary.temperature,20.75);
 results.set('b',{error:{code:'TIMEOUT',message:'test failure'}});
 const failed=weightedDistrictWeather(location,results,start,end);
 assert.equal(failed.rows[0].T2M,null);assert.equal(failed.summary.temperature,null);assert.equal(failed.cache.status,'partial');
 results.set('a',{error:{code:'TIMEOUT'}});assert.equal(weightedDistrictWeather(location,results,start,end).cache.status,'unavailable');
});
test('map district assembly and analysis return the same weighted daily series, independent of representative point',async()=>{
 const point=WEATHER_LOCATIONS.find(item=>item.district==='Gasabo');
 const location=spatialLocation(point,'era5'),results=resultsFor(location);
 const engine={range:async loc=>({...results.get(loc.grid.id),location:loc,start,end})};
 const analysis=await spatialWeatherRange(engine,{...point,latitude:-2.1,longitude:29.9},start,end,'era5');
 const map=weightedDistrictWeather(location,results,start,end);
 assert.deepEqual(analysis.rows,map.rows);assert.deepEqual(analysis.summary,map.summary);assert.equal(analysis.location.grid,undefined);assert.ok(analysis.location.cells.length>1);
 const pointResult=await spatialWeatherRange(engine,{latitude:point.latitude,longitude:point.longitude},start,end,'era5');assert.equal(pointResult.location.spatialMethod,'grid-cell');assert.ok(pointResult.location.grid);
});
test('ERA5 requests pin the model, UTC, nearest native cells and disabled elevation downscaling',async()=>{
 const grids=[weatherGrid(-2,30,'era5'),weatherGrid(-2.25,30.25,'era5')],url=new URL(era5Url(grids,start,end));
 assert.equal(url.origin,'https://archive-api.open-meteo.com');assert.equal(url.searchParams.get('models'),'era5');assert.equal(url.searchParams.get('elevation'),'nan,nan');assert.equal(url.searchParams.get('cell_selection'),'nearest');assert.equal(url.searchParams.get('timezone'),'GMT');
 const data=await fetchEra5(grids,start,end,{fetcher:async(_,options)=>{assert.deepEqual(Object.keys(options.headers),['Accept']);assert.equal(options.redirect,'manual');return Response.json(grids.map(g=>body(g)));}});
 assert.equal(data.length,2);assert.equal(data[0].rows[0].T2M,20);assert.equal(data[0].source.provider,'Open-Meteo');assert.equal(data[0].source.timeStandard,'UTC');
 const missing=body(grids[0]);missing.daily.precipitation_sum[0]=null;missing.daily.temperature_2m_mean[1]='20';
 const normalized=normalizeEra5(missing,grids[0],start,end,url.href,'now');assert.equal(normalized.rows[0].PRECTOTCORR,null);assert.equal(normalized.rows[1].T2M,null);
 for(const mutate of [b=>b.latitude=-3,b=>b.timezone='Africa/Kigali',b=>b.daily_units.precipitation_sum='inch',b=>b.daily.time.reverse(),b=>b.daily.temperature_2m_mean.pop()]){const invalid=body(grids[0]);mutate(invalid);assert.throws(()=>normalizeEra5(invalid,grids[0],start,end,url.href,'now'),{code:'INVALID_RESPONSE'});}
 for(const [status,code]of [[302,'PROVIDER_UNAVAILABLE'],[503,'PROVIDER_UNAVAILABLE'],[429,'RATE_LIMITED']])await assert.rejects(fetchEra5(grids,start,end,{fetcher:async()=>new Response('private details',{status})}),error=>error.code===code&&!error.message.includes('private'));
 await assert.rejects(fetchEra5(grids,start,end,{fetcher:async()=>Response.json([body(grids[0])])}),{code:'INVALID_RESPONSE'});
 await assert.rejects(fetchEra5(grids,start,end,{timeoutMs:5,fetcher:async(_,o)=>new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(Error('aborted'))))}),{code:'TIMEOUT'});
});
test('ERA5 batched map cache is reused by district reads without source mixing, and failures remain bounded',async()=>{
 const cache=memory(),events=[];let calls=0;
 const fetcher=async url=>{calls++;const u=new URL(url),lat=u.searchParams.get('latitude').split(',').map(Number),lon=u.searchParams.get('longitude').split(',').map(Number);return Response.json(lat.map((latitude,i)=>body({latitude,longitude:lon[i]},u.searchParams.get('start_date'),u.searchParams.get('end_date'))));};
 const service=createWeatherService({cache,fetcher,now:()=>now,record:async e=>events.push(e)});
 const cells=WEATHER_OVERLAPS.era5.cells;const data=await loadWeatherCells(service,cells,start,end);
 assert.equal(calls,6);assert.ok([...data.values()].every(d=>!d.error&&d.sources[0].provider==='Open-Meteo'));assert.ok(events.every(e=>e.provider==='Open-Meteo'));
 const district=await spatialWeatherRange(service,WEATHER_LOCATIONS[0],start,end,'era5');assert.equal(calls,6);assert.ok(Math.abs(district.summary.rainfall-2)<1e-10);assert.equal(district.summary.validDays.PRECTOTCORR,2);
 assert.ok([...cache.map.keys()].every(key=>key.includes('era5:')));
 let failures=0;const failedService=createWeatherService({cache:memory(),now:()=>now,fetcher:async()=>{failures++;return new Response('',{status:503});}});
 const unavailable=await loadWeatherCells(failedService,cells,start,end);assert.equal(failures,6);assert.ok([...unavailable.values()].every(d=>d.error.code==='PROVIDER_UNAVAILABLE'));
});
test('district reports retain weights, area coverage and methods, and baselines use district daily means',()=>{
 const point=WEATHER_LOCATIONS[0],location=spatialLocation(point,'era5'),results=resultsFor(location),weather=weightedDistrictWeather(location,results,start,end);
 const report=weatherReportRecords(weather),daily=weatherDailyRecords(weather);
 assert.equal(report.length,4);assert.equal(report[0].sampled_latitude,'');assert.ok(report[0].method.includes('area-weighted'));assert.equal(JSON.parse(report[0].cell_weights).length,location.cells.length);assert.equal(daily[0].grid_latitude,'');assert.equal(daily[0].precipitation_area_coverage_pct,100);
 const input={year:2025,season:'Season B',baselineStart:2001,baselineEnd:2020};
 const rows=[];
 for(const year of [...Array.from({length:20},(_,i)=>2001+i),2025])rows.push(...dateList(`${year}-03-01`,`${year}-06-30`).map(date=>({date,PRECTOTCORR:year===2025?2:1,T2M:year===2025?22:20,T2M_MIN:15,T2M_MAX:25})));
 const baseline=climateBaseline(rows,input);assert.equal(baseline.rainfallAnomalyPct,100);assert.equal(baseline.temperatureAnomalyC,2);
 const summary=aggregateWeather(rows,'2025-03-01','2025-06-30');
 const alignment=climateAgricultureComparison({...weather,start:'2025-03-01',end:'2025-06-30',summary},[],{district:point.district,crop:'Maize',year:2025,season:'Season B'});
 assert.ok(!alignment.errors.some(e=>e.includes('provenance')));assert.ok(alignment.limitation.includes('area-weighted district'));
});
test('only the two known datasets pass server request validation',()=>{
 for(const dataset of ['merra2','era5']){assert.equal(validateWeatherRange({location:{district:'Gasabo'},start,end,dataset}).dataset,dataset);assert.equal(validateWeatherMap({start,end,dataset}).dataset,dataset);assert.equal(validateBaseline({location:{district:'Gasabo'},year:2025,season:'Season B',baselineStart:1991,baselineEnd:2020,dataset}).dataset,dataset);}
 for(const dataset of ['best_match','https://example.com',{},null,''])assert.throws(()=>validateWeatherRange({location:{district:'Gasabo'},start,end,dataset}));
});

test('ERA5 reserves weighted provider budgets and waits for a minute window before fetching',async()=>{
 const cache=memory(),reservations=[],waits=[];let rejected=false,time=now;
 const service=createWeatherService({cache,now:()=>time,sleep:async ms=>{waits.push(ms);time+=ms;},consume:async(key,limit,cost=1,window=60000)=>{reservations.push({key,limit,cost,window});if(key==='provider:era5:minute'&&!rejected){rejected=true;throw Object.assign(Error('fixture budget exhausted'),{code:'APP_RATE_LIMIT',retryAfter:1});}},fetcher:async url=>{const u=new URL(url);return Response.json(body({latitude:Number(u.searchParams.get('latitude')),longitude:Number(u.searchParams.get('longitude'))},u.searchParams.get('start_date'),u.searchParams.get('end_date')));}});
 const grid=weatherGrid(-2,30,'era5');await service.range({grid},start,end);
 assert.deepEqual(waits,[2000]);
 const daily=reservations.find(r=>r.key==='provider:era5:day');assert.equal(daily.cost,27);assert.equal(daily.window,86400000);
 assert.ok(reservations.some(r=>r.key==='provider:era5:hour'&&r.limit===4500));
 assert.equal(reservations.filter(r=>r.key==='provider:era5:minute').length,2);
});
test('a failed historical chunk preserves completed cell-years and retry fetches only missing years',async()=>{
 const cache=memory();let fail=true,calls=0;
 const service=createWeatherService({cache,now:()=>now,retries:0,fetcher:async url=>{calls++;const u=new URL(url),from=u.searchParams.get('start_date'),to=u.searchParams.get('end_date');if(fail&&from.startsWith('1996'))return new Response('',{status:503});return Response.json(body({latitude:Number(u.searchParams.get('latitude')),longitude:Number(u.searchParams.get('longitude'))},from,to));}});
 const location={grid:weatherGrid(-2,30,'era5')};
 const partial=await service.range(location,'1991-01-01','2000-12-31');assert.equal(calls,2);assert.equal(partial.cache.status,'partial');assert.equal(partial.errors[0].code,'PROVIDER_UNAVAILABLE');
 assert.equal(partial.rows.find(row=>row.date==='1995-12-31').T2M,20);assert.equal(partial.rows.find(row=>row.date==='1996-01-01').T2M,null);
 fail=false;const complete=await service.range(location,'1991-01-01','2000-12-31');assert.equal(calls,3);assert.equal(complete.errors.length,0);assert.ok(complete.rows.every(row=>row.T2M===20));
});
