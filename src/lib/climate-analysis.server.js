import {env} from 'cloudflare:workers';
import {authorizeClimateAnalysis,runWeatherMap} from './weather.server.js';
import {spatialWeatherRange} from './weather-spatial.js';
import {WEATHER_LOCATIONS,seasonRange,aggregateWeather,climateBaseline,weatherSeries,failure} from './weather-model.js';
import {readLocalRecords} from './local-data-service.js';
import {cropComparison,cropSeason,rankDistricts,fullTemperature,difference} from './climate-analysis-model.js';
import {saveClimateFindingEvidence} from './climate-finding.js';
const owner=user=>String(user.id??user.email);
async function cropRecords(context,scope,all=false){
 const query={domain:'crop',crop:scope.crop,season:scope.season,...(all?{}:{geography:scope.district})},rows=[];
 for(let offset=0;offset<10000;offset+=1000){
  if(import.meta.env.VITE_AUTH_MODE==='local'){const page=await readLocalRecords(env.LOCAL_AUTH_DB,context.user,{entity:'AgriculturalObservation',query:{...query,measure_group:'production_area'},options:{limit:1000,cursor:String(offset)}});rows.push(...page.items);if(!page.has_more)return rows;}
  else{const page=await context.getBase44().entities.AgriculturalObservation.filter(query,'id',1000,offset),items=Array.isArray(page)?page:page.items??[];rows.push(...items);if(items.length<1000)return rows;}
 }
 throw failure('TOO_MANY_RECORDS','Narrow the selected crop records before running this analysis.',400);
}
function compact(weather){return {start:weather.start,end:weather.end,summary:weather.summary,location:weather.location,sources:weather.sources,cache:weather.cache,errors:weather.errors??[],spatialSupport:weather.spatialSupport};}
export async function runClimateAnalysis(context,scope){
 const {engine,store}=await authorizeClimateAnalysis(context.user),location=WEATHER_LOCATIONS.find(l=>l.district===scope.district),period=seasonRange(scope.year,scope.season),referencePeriod=seasonRange(scope.referenceYear,scope.season),first=seasonRange(scope.year-4,scope.season);
 const [history,reference,crops]=await Promise.all([spatialWeatherRange(engine,location,first.start,period.end,scope.dataset),spatialWeatherRange(engine,location,referencePeriod.start,referencePeriod.end,scope.dataset),cropRecords(context,scope)]);
 const selectedRows=history.rows.filter(row=>row.date>=period.start&&row.date<=period.end),current={...history,...period,rows:selectedRows,summary:aggregateWeather(selectedRows,period.start,period.end)};
 let normal=null,normalEvidence=null;
 if(scope.includeBaseline){const a=seasonRange(scope.baselineStart,scope.season),b=seasonRange(scope.baselineEnd,scope.season),baseline=await spatialWeatherRange(engine,location,a.start,b.end,scope.dataset);normal=climateBaseline([...baseline.rows,...selectedRows],scope);normalEvidence=compact(baseline);}
 const trend=Array.from({length:5},(_,i)=>{const year=scope.year-4+i,p=seasonRange(year,scope.season),weather=aggregateWeather(history.rows,p.start,p.end),crop=cropSeason(crops,{...scope,year});return {year,...p,rainfall:weather.rainfall,temperature:fullTemperature(weather),yield:crop.yield,production:crop.production,area:crop.area,validRainDays:weather.validDays.PRECTOTCORR,validTemperatureDays:weather.validDays.T2M,expectedDays:weather.expectedDays,cropReason:crop.reason};});
 const result={scope,current:compact(current),reference:compact(reference),normal:normal?{rainfall:normal.rainfall,temperature:normal.temperature,rainfallAnomalyMm:normal.rainfallAnomalyMm,rainfallAnomalyPct:normal.rainfallAnomalyPct,temperatureAnomalyC:normal.temperatureAnomalyC,completeRainfallYears:normal.completeRainfallYears,completeTemperatureYears:normal.completeTemperatureYears,periods:normal.periods,formula:normal.formula}:null,normalEvidence,crops:cropComparison(crops,scope),weatherChanges:{rainfall:difference(current.summary.rainfall,reference.summary.rainfall),temperature:difference(fullTemperature(current.summary),fullTemperature(reference.summary))},trend,monthly:weatherSeries(selectedRows,'month'),createdAt:new Date().toISOString(),analysisId:crypto.randomUUID(),limitation:'Aligned seasonal observations support investigation. Shared weather cells and survey estimates are not independent measurements; no causal effect or yield forecast is estimated.'};
 await store.cache.pruneAnalyses?.();
 await store.cache.set('climate-analysis|'+result.analysisId,{owner:owner(context.user),result,expiresAt:Date.now()+86400000});
 return result;
}
export async function runClimateRanking(context,scope){await authorizeClimateAnalysis(context.user);const period=seasonRange(scope.year,scope.season),previous=seasonRange(scope.referenceYear,scope.season);const [current,reference,crops]=await Promise.all([runWeatherMap(context.user,{...period,dataset:scope.dataset}),runWeatherMap(context.user,{...previous,dataset:scope.dataset}),cropRecords(context,scope,true)]);return {scope,rows:rankDistricts(crops,current,reference,scope),currentSources:current.cells.flatMap(c=>c.sources??[]),referenceSources:reference.cells.flatMap(c=>c.sources??[]),createdAt:new Date().toISOString()};}
export async function runSaveClimateFinding(context,input){
 const {store}=await authorizeClimateAnalysis(context.user);
 return saveClimateFindingEvidence({cache:store.cache,write:async record=>{
  if(import.meta.env.VITE_AUTH_MODE==='local'){await env.LOCAL_AUTH_DB.prepare('INSERT OR IGNORE INTO local_records(entity,id,data,published) VALUES(?,?,?,0)').bind('ReportFinding',record.id,JSON.stringify(record)).run();const saved=await env.LOCAL_AUTH_DB.prepare('SELECT data FROM local_records WHERE entity=? AND id=?').bind('ReportFinding',record.id).first();return JSON.parse(saved.data);}
  return context.getBase44().entities.ReportFinding.create(record);
 }},context.user,input);
}
