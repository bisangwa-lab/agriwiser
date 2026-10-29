import {dateList,failure,WEATHER_PARAMETERS} from './weather-model.js';
const fields={PRECTOTCORR:'precipitation_sum',T2M:'temperature_2m_mean',T2M_MIN:'temperature_2m_min',T2M_MAX:'temperature_2m_max'};
export function era5Url(grids,start,end){
 const url=new URL('https://archive-api.open-meteo.com/v1/archive');
 for(const [key,value]of Object.entries({latitude:grids.map(g=>g.latitude).join(','),longitude:grids.map(g=>g.longitude).join(','),start_date:start,end_date:end,daily:Object.values(fields).join(','),models:'era5',timezone:'GMT',cell_selection:'nearest',elevation:grids.map(()=>'nan').join(','),temperature_unit:'celsius',precipitation_unit:'mm'}))url.searchParams.set(key,value);
 return url.toString();
}
export function normalizeEra5(body,grid,start,end,sourceUrl,retrievedAt){
 const dates=dateList(start,end),daily=body?.daily;
 if(!body||Math.abs(body.latitude-grid.latitude)>0.0001||Math.abs(body.longitude-grid.longitude)>0.0001||![body.latitude,body.longitude].every(Number.isFinite)||body.utc_offset_seconds!==0||body.timezone!=='GMT'||body.daily_units?.time!=='iso8601'||!Array.isArray(daily?.time)||daily.time.length!==dates.length||daily.time.some((date,i)=>date!==dates[i]))throw failure('INVALID_RESPONSE','ERA5 returned incompatible coordinates, time zone or dates.');
 for(const [code,field]of Object.entries(fields))if(body.daily_units?.[field] !== (code==='PRECTOTCORR'?'mm':'°C')||!Array.isArray(daily[field])||daily[field].length!==dates.length)throw failure('INVALID_RESPONSE','ERA5 returned incompatible parameter arrays or units.');
 const rows=dates.map((date,i)=>{
  const row={date,qualityFlags:[]};
  for(const [code,field]of Object.entries(fields)){
   const value=daily[field][i],valid=Number.isFinite(value)&&(code==='PRECTOTCORR'?value>=0&&value<=2000:value>=-100&&value<=70);
   row[code]=valid?value:null;if(!valid)row.qualityFlags.push(`${code}: missing or invalid ERA5 value`);
  }
  if(row.T2M_MIN!==null&&row.T2M_MAX!==null&&(row.T2M_MIN>row.T2M_MAX||(row.T2M!==null&&(row.T2M<row.T2M_MIN||row.T2M>row.T2M_MAX)))){row.T2M=row.T2M_MIN=row.T2M_MAX=null;row.qualityFlags.push('Temperature minimum, mean and maximum are inconsistent');}
  return row;
 });
 return {rows,source:{provider:'Open-Meteo',dataset:'ECMWF ERA5 reanalysis via Open-Meteo (fixed model)',classification:'model-estimated',temporalResolution:'daily',spatialResolution:grid.resolution,timeStandard:'UTC',latitude:grid.latitude,longitude:grid.longitude,sourceUrl,retrievedAt,apiVersion:'v1/archive · models=era5',parameters:Object.fromEntries(Object.entries(WEATHER_PARAMETERS).map(([key,meta])=>[key,{label:key==='PRECTOTCORR'?'ERA5 total precipitation':meta.label,unit:meta.unit}])),messages:['ERA5 native grid; elevation downscaling disabled. Open-Meteo free API: non-commercial use. Data: CC BY 4.0; credit Open-Meteo and Copernicus/ECMWF.']}};
}
export async function fetchEra5(grids,start,end,{fetcher=fetch,timeoutMs=45000,now=()=>new Date().toISOString()}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs),url=era5Url(grids,start,end);
 try{
  const response=await fetcher(url,{signal:controller.signal,headers:{Accept:'application/json'},redirect:'manual'});
  if(response.status===429)throw failure('RATE_LIMITED','Open-Meteo is rate limiting requests. Retry later.',429,Math.min(3600,Math.max(60,Number(response.headers.get('retry-after'))||60)));
  if(!response.ok)throw failure('PROVIDER_UNAVAILABLE','Open-Meteo ERA5 is temporarily unavailable. Retry later.',503);
  if(Number(response.headers.get('content-length'))>8*1024*1024)throw failure('INVALID_RESPONSE','ERA5 response exceeds the supported size.');
  const reader=response.body?.getReader();let text='';
  if(reader){const decoder=new TextDecoder();let bytes=0;try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>8*1024*1024){await reader.cancel();throw failure('INVALID_RESPONSE','ERA5 response exceeds the supported size.');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}}
  else text=await response.text();
  let body;try{body=JSON.parse(text);}catch{throw failure('INVALID_RESPONSE','Open-Meteo returned unreadable JSON.');}
  const list=Array.isArray(body)?body:[body];
  if(list.length!==grids.length)throw failure('INVALID_RESPONSE','ERA5 returned a different number of locations.');
  return list.map((item,i)=>normalizeEra5(item,grids[i],start,end,url,now()));
 }catch(error){if(error.code&&error.status)throw error;throw failure(controller.signal.aborted?'TIMEOUT':'PROVIDER_UNAVAILABLE',controller.signal.aborted?'ERA5 request timed out. Retry or use cached data.':'Open-Meteo ERA5 could not be reached.',503);}finally{clearTimeout(timer);}
}
