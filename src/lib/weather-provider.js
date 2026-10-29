import { WEATHER_PARAMETERS, dateList, failure } from "./weather-model.js";
export const NASA_POWER_ORIGIN="https://power.larc.nasa.gov";
export function powerUrl({latitude,longitude,start,end}) {
 const url=new URL('/api/temporal/daily/point',NASA_POWER_ORIGIN);
 for(const [key,value] of Object.entries({parameters:Object.keys(WEATHER_PARAMETERS).join(','),community:'AG',latitude,longitude,start:start.replaceAll('-',''),end:end.replaceAll('-',''),format:'JSON','time-standard':'UTC'}))url.searchParams.set(key,String(value));
 return url.toString();
}
export function normalizePower(body,request,retrievedAt=new Date().toISOString()) {
 const coordinates=body?.geometry?.coordinates,header=body?.header,parameters=body?.properties?.parameter;
 if(body?.type!=="Feature"||body.geometry.type!=="Point"||!Array.isArray(coordinates)||!coordinates.slice(0,2).every(Number.isFinite)||Math.abs(coordinates[0]-request.longitude)>0.0001||Math.abs(coordinates[1]-request.latitude)>0.0001||!header||!Number.isFinite(header.fill_value)||header.time_standard!=="UTC"||header.start!==request.start.replaceAll('-','')||header.end!==request.end.replaceAll('-','')||!parameters||!Array.isArray(header.sources)||!header.sources.includes("MERRA2"))throw failure("INVALID_RESPONSE","NASA POWER returned incompatible coordinates, dates or source metadata.");
 const dates=dateList(request.start,request.end),allowed=new Set(dates.map(date=>date.replaceAll('-','')));
 for(const [code,meta] of Object.entries(WEATHER_PARAMETERS)) {
  if(body.parameters?.[code]?.units!==meta.unit||!parameters[code]||typeof parameters[code]!=="object"||Array.isArray(parameters[code])||Object.keys(parameters[code]).some(date=>!/^\d{8}$/.test(date)||!allowed.has(date)))throw failure("INVALID_RESPONSE","NASA POWER returned an unexpected parameter, unit or date schema.");
 }
 const rows=dates.map(date=>{
  const row={date,qualityFlags:[]},key=date.replaceAll('-','');
  for(const code of Object.keys(WEATHER_PARAMETERS)) {
   const raw=parameters[code][key];
   const valid=typeof raw==='number'&&Number.isFinite(raw)&&raw!==header.fill_value&&(code==='PRECTOTCORR'?raw>=0&&raw<=2000:raw>= -100&&raw<=70);
   row[code]=valid?raw:null;
   if(!valid)row.qualityFlags.push(code+': missing or invalid provider value');
  }
  if(row.T2M_MIN!==null&&row.T2M_MAX!==null&&(row.T2M_MIN>row.T2M_MAX||(row.T2M!==null&&(row.T2M<row.T2M_MIN||row.T2M>row.T2M_MAX)))){
   row.T2M=row.T2M_MIN=row.T2M_MAX=null;row.qualityFlags.push('Temperature minimum, mean and maximum are inconsistent');
  }
  return row;
 });
 return {rows,source:{provider:'NASA POWER',dataset:'MERRA-2 meteorological reanalysis via POWER',classification:'model-estimated',temporalResolution:'daily',spatialResolution:'0.5° latitude × 0.625° longitude',timeStandard:'UTC',latitude:request.latitude,longitude:request.longitude,sourceUrl:powerUrl(request),retrievedAt,apiVersion:typeof header.api?.version==='string'?header.api.version:'Not supplied',parameters:Object.fromEntries(Object.entries(WEATHER_PARAMETERS).map(([key,meta])=>[key,{label:meta.label,unit:meta.unit}])),fillValue:header.fill_value,messages:Array.isArray(body.messages)?body.messages.filter(item=>typeof item==='string').slice(0,8).map(item=>item.slice(0,300)):[]}};
}
export async function fetchPower(request,{fetcher=fetch,timeoutMs=45000,now=()=>new Date().toISOString()}={}) {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try {
  const response=await fetcher(powerUrl(request),{signal:controller.signal,headers:{Accept:'application/json'},redirect:'manual'});
  if(response.status===429){const raw=response.headers.get('retry-after'),numeric=Number(raw),seconds=Number.isFinite(numeric)&&numeric>0?numeric:Math.ceil((Date.parse(raw)-Date.parse(now()))/1000);throw failure('RATE_LIMITED','NASA POWER is rate limiting requests. Cached data remains available; retry later.',429,Number.isFinite(seconds)&&seconds>0?Math.min(seconds,3600):60);}
  if(!response.ok)throw failure('PROVIDER_UNAVAILABLE','NASA POWER is temporarily unavailable. Please retry.',503);
  const length=Number(response.headers.get('content-length'));
  if(length>8*1024*1024)throw failure('INVALID_RESPONSE','The provider response exceeds the supported size.');
  const reader=response.body?.getReader();let text='';
  if(reader){const decoder=new TextDecoder();let bytes=0;try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>8*1024*1024){await reader.cancel();throw failure('INVALID_RESPONSE','The provider response exceeds the supported size.');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}}
  else text=await response.text();
  let body;try{body=JSON.parse(text);}catch{throw failure('INVALID_RESPONSE','NASA POWER returned an unreadable response.');}
  if(body?.properties?.parameter&&Object.values(body.properties.parameter).every(value=>value&&typeof value==='object'&&!Object.keys(value).length))throw failure('EMPTY_RESPONSE','NASA POWER returned no daily data for this request.',503);
  return normalizePower(body,request,now());
 } catch(error) {
  if(error.code&&error.status)throw error;
  console.warn('NASA_POWER_FETCH_FAILED',{type:error.name??'Error',networkCode:typeof error.cause?.code==='string'?error.cause.code:'unavailable'});
  throw failure(controller.signal.aborted?'TIMEOUT':'PROVIDER_UNAVAILABLE',controller.signal.aborted?'NASA POWER did not respond within 45 seconds. Retry or use cached data.':'NASA POWER could not be reached. Please retry.',503);
 } finally {clearTimeout(timer);}
}
