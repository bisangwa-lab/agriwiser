import { env } from "cloudflare:workers";
import { setResponseHeader } from "@tanstack/react-start/server";
import boundariesText from "../data/rwanda-districts.geojson?raw";
import schema from "../../migrations/0003_weather.sql?raw";
import { insideRwanda,powerGrid } from "./weather-geometry.js";
import { createD1WeatherStore } from "./weather-store.js";
import { createWeatherService } from "./weather-service.js";
import { normalizeRole } from './rbac.js';
import { normalizeMeteoDelivery,meteoCatalogue,meteoRange } from './meteo-rwanda-provider.js';
import { aggregateWeather,assertWeatherAccess,climateBaseline,failure,seasonRange,WEATHER_LOCATIONS } from "./weather-model.js";
import {WEATHER_OVERLAPS,spatialLocation,spatialWeatherRange,loadWeatherCells,weightedDistrictWeather} from './weather-spatial.js';
const boundaries=JSON.parse(boundariesText);
let setup,service,store;
const transientLimits=new Map();
let transientEvents=[];
async function storage(){
 if(setup)return setup;
 setup=(async()=>{
  const db=env.WEATHER_DB??(import.meta.env.VITE_AUTH_MODE==='local'?env.LOCAL_AUTH_DB:null);
  if(db){await db.batch(schema.split(';').map(sql=>sql.trim()).filter(Boolean).map(sql=>db.prepare(sql)));store=createD1WeatherStore(db);}
  else{
   if(typeof caches==='undefined'||!caches.default)throw failure('CACHE_NOT_CONFIGURED','Configure a WEATHER_DB D1 binding or Cloudflare Cache API for weather caching.',503);
   const edge=caches.default;
   store={record:async event=>{transientEvents=[{provider:'NASA POWER',...event},...transientEvents].slice(0,20);},status:async()=>({entries:[],quality:null,events:transientEvents,persistent:false}),cache:{get:async key=>{const response=await edge.match('https://hingasmart-weather-cache.invalid/'+encodeURIComponent(key));return response?response.json():null;},set:async(key,data)=>{await edge.put('https://hingasmart-weather-cache.invalid/'+encodeURIComponent(key),new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=2678400'}}));}},
    consume:async(key,limit=60,cost=1,windowMs=60000)=>{const window=Math.floor(Date.now()/windowMs)*windowMs,old=transientLimits.get(key),used=old?.window===window?old.used+cost:cost;if(used>limit)throw failure('APP_RATE_LIMIT','Weather request budget reached. Retry after the limit window.',429,Math.ceil((window+windowMs-Date.now())/1000));transientLimits.set(key,{window,used});for(const [id,value]of transientLimits)if(value.window<Date.now()-2*86400000)transientLimits.delete(id);}};
  }
  service=createWeatherService(store);return {service,store};
 })().catch(error=>{setup=undefined;throw error;});return setup;
}
async function meteoDelivery(){
 if(!env.METEO_RWANDA_DATA)return null;
 let object;try{object=await env.METEO_RWANDA_DATA.get('approved-delivery.json');}catch{throw failure('METEO_DELIVERY_UNAVAILABLE','The authorized Meteo Rwanda delivery could not be read.',503);}
 if(!object)throw failure('METEO_DELIVERY_UNAVAILABLE','Meteo Rwanda storage is configured, but no approved delivery is available.',503);
 if(object.size>8*1024*1024)throw failure('INVALID_METEO_DELIVERY','The authorized delivery exceeds the supported 8 MiB size.',503);
 let body;try{body=await object.json();}catch{throw failure('INVALID_METEO_DELIVERY','The authorized Meteo Rwanda delivery is not valid JSON.',503);}
 return normalizeMeteoDelivery(body,(lat,lon)=>insideRwanda(lat,lon,boundaries),object.uploaded?.toISOString()??new Date().toISOString());
}
export async function runMeteoCatalogue(user){
 await authorize(user);const delivery=await meteoDelivery();
 return delivery?meteoCatalogue(delivery):{status:'not-configured',locations:[],message:'Awaiting an authorized Meteo Rwanda data-delivery agreement and dataset. No station connection is active.'};
}
export async function runMeteoWeather(user,input){
 await authorize(user);const delivery=await meteoDelivery();
 if(!delivery)throw failure('METEO_NOT_CONFIGURED','Meteo Rwanda is awaiting authorized data access. NASA POWER is a separate available source; it is never substituted silently.',503);
 return meteoRange(delivery,input);
}
export async function runWeatherStatus(user){
 assertWeatherAccess(user);
 if(!['super_admin','data_manager'].includes(normalizeRole(user)))throw failure('FORBIDDEN','Only administrators and data managers can inspect integration operations.',403);
 await authorize(user);const report=await store.status(),entries=report.entries;
 function providerReport(provider){
  const selected=entries.filter(item=>item.source.provider===provider),events=report.events.filter(item=>item.provider===provider);
  const latest=selected.map(item=>item.source.retrievedAt).sort().at(-1);
  return {provider,status:events[0]?.event==='error'?'last-attempt-failed':latest?'verified-cache':'not-yet-retrieved',lastSuccessfulRetrieval:latest??null,entries:selected.length,gridCells:new Set(selected.map(item=>item.cache_key.split('|')[1])).size,years:[...new Set(selected.map(item=>Number(item.cache_key.split('|').at(-1))))].sort((a,b)=>a-b),staleEntries:selected.filter(item=>item.expires_at<=Date.now()).length,quality:report.qualityByProvider?.[provider]??null,events,source:selected.find(item=>item.source.retrievedAt===latest)?.source??null};
 }
 let meteo;try{meteo=await runMeteoCatalogue(user);}catch(error){meteo={status:'delivery-error',message:error.code&&error.status?error.message:'The authorized delivery could not be validated.',locations:[]};}
 return {checkedAt:new Date().toISOString(),persistent:report.persistent,nasa:providerReport('NASA POWER'),era5:providerReport('Open-Meteo'),events:report.events,meteo};
}
function resolveLocation(input){
 if(input.district)return WEATHER_LOCATIONS.find(item=>item.district===input.district);
 if(!insideRwanda(input.latitude,input.longitude,boundaries))throw failure('INVALID_LOCATION','These coordinates are outside Rwanda.',400);
 return {...input,grid:powerGrid(input.latitude,input.longitude),name:'Custom Rwanda location'};
}
async function authorize(user){
 assertWeatherAccess(user);setResponseHeader('Cache-Control','no-store');
 const storageContext=await storage();
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(user.id??user.email)));
 const key=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 await storageContext.store.consume('user:'+key,60);return storageContext.service;
}
export async function authorizeClimateAnalysis(user){const engine=await authorize(user);return {engine,store};}
export async function runWeather(user,input){
 const engine=await authorize(user),location=resolveLocation(input.location);
 return spatialWeatherRange(engine,location,input.start,input.end,input.dataset??'merra2');
}
export async function runWeatherMap(user,input){
 const engine=await authorize(user),dataset=input.dataset??'merra2',cells=WEATHER_OVERLAPS[dataset].cells;
 const results=await loadWeatherCells(engine,cells,input.start,input.end);
 const districts=WEATHER_LOCATIONS.map(point=>{
  const data=weightedDistrictWeather(spatialLocation(point,dataset),results,input.start,input.end);
  const {rows,...metadata}=data;return {...metadata,...metadata.location};
 });
 return {start:input.start,end:input.end,dataset,gridCells:cells.length,cells:cells.map(cell=>{const data=results.get(cell.id);return {...cell,...(data.error?{error:data.error}:{summary:aggregateWeather(data.rows,input.start,input.end),cache:data.cache,sources:data.sources})};}),districts,classification:'model-estimated',spatialSupport:'Native weather cells with district boundaries, or district estimates weighted by all cell/district intersection areas. Coarse estimates do not resolve local conditions.'};
}
export async function runWeatherBaseline(user,input){
 const engine=await authorize(user),location=resolveLocation(input.location),first=seasonRange(input.baselineStart,input.season),last=seasonRange(input.baselineEnd,input.season),current=seasonRange(input.year,input.season);
 const [history,selected]=await Promise.all([spatialWeatherRange(engine,location,first.start,last.end,input.dataset??'merra2'),spatialWeatherRange(engine,location,current.start,current.end,input.dataset??'merra2')]);
 const rows=[...new Map([...history.rows,...selected.rows].map(row=>[row.date,row])).values()].sort((a,b)=>a.date.localeCompare(b.date));
 return {...climateBaseline(rows,input),dataset:input.dataset??'merra2',spatialSupport:history.spatialSupport,location:history.location,errors:[...history.errors??[],...selected.errors??[]],historyCells:history.cells??[],selectedRows:selected.rows,sources:[...history.sources,...selected.sources],cache:{status:[history.cache.status,selected.cache.status].includes('unavailable')?'unavailable':[history.cache.status,selected.cache.status].includes('partial')?'partial':[history.cache.status,selected.cache.status].includes('stale')?'stale':history.cache.status==='cached'&&selected.cache.status==='cached'?'cached':'refreshed',retrievedAt:[history.cache.retrievedAt,selected.cache.retrievedAt].filter(Boolean).sort()[0]??null}};
}
export async function safeWeather(action){
 try{return {ok:true,data:await action()};}
 catch(error){
  // Only controlled error codes/messages are returned; no headers, stack or credentials.
  if(!error.code||!error.status)console.warn('Weather integration unavailable',{code:'INTERNAL'});
  return {ok:false,error:{code:error.code??'INTERNAL',status:error.status??503,message:error.code&&error.status?error.message:'Weather data is temporarily unavailable. Retry or check the server cache configuration.',retryAfter:error.retryAfter}};
 }
}
