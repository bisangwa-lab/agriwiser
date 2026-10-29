import { fetchPower } from "./weather-provider.js";
import { dateList, failure, WEATHER_LOCATIONS } from "./weather-model.js";
import { powerGrid } from "./weather-geometry.js";
import { fetchEra5 } from './weather-era5-provider.js';
import { WEATHER_DATASETS } from './weather-datasets.js';

/** Server service. Cache and rate-limit adapters are injected for storage/testing. */
export function createWeatherService({cache,consume=async()=>{},record=async()=>{},fetcher,now=()=>Date.now(),timeoutMs=45000,concurrency=3,retries=1,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
 const pending=new Map();let active=0;const queue=[];
 const limited=async task=>{if(active<concurrency)active++;else await new Promise(resolve=>queue.push(resolve));try{return await task();}finally{const next=queue.shift();if(next)next();else active--;}};
 async function fetchYears(grid,startYear,endYear,old) {
  const dataset=grid.dataset??'merra2',spec=WEATHER_DATASETS[dataset],blockKey=dataset==='merra2'?'provider-backoff-v1':'provider-backoff-era5-v1';
  const start=`${startYear}-01-01`,available=new Date(now()-spec.delayDays*86400000).toISOString().slice(0,10),end=`${endYear}-12-31`<available?`${endYear}-12-31`:available;
  const key=[grid.id,start,end].join('|');
  if(pending.has(key))return pending.get(key);
  const request=limited(async()=>{
   try {
    const backoff=await cache.get(blockKey);
    if(backoff?.until>now())throw failure('RATE_LIMITED',`${spec.provider} is cooling down after a rate limit. Retry later.`,429,Math.ceil((backoff.until-now())/1000));
    if(end<start)throw failure('NOT_YET_AVAILABLE',`${spec.provider} data is not yet available for this period.`,503);
    let result;
    for(let attempt=0;;attempt++){
     await consume(dataset==='merra2'?'provider':'provider:era5',dataset==='merra2'?45:120);
     try{const options={fetcher,timeoutMs,now:()=>new Date(now()).toISOString()};result=dataset==='era5'?(await fetchEra5([grid],start,end,options))[0]:await fetchPower({...grid,start,end},options);break;}
     catch(error){
      await record({at:new Date(now()).toISOString(),provider:spec.provider,event:'error',code:error.code??'PROVIDER_UNAVAILABLE'});
      if(attempt>=retries||!['PROVIDER_UNAVAILABLE','TIMEOUT'].includes(error.code))throw error;
      await sleep(500*2**attempt);
     }
    }
    for(let year=startYear;year<=endYear;year++){
     const data={rows:result.rows.filter(row=>row.date.startsWith(String(year))),source:result.source,expiresAt:now()+(year<new Date(now()).getUTCFullYear()?7*86400000:6*3600000)};
     await cache.set(`weather-v1|${grid.id}|${year}`,data);
    }
    await record({at:new Date(now()).toISOString(),provider:spec.provider,event:'success'});
    return null;
   }catch(error){
    if(error.code==='RATE_LIMITED')await cache.set(blockKey,{until:now()+(error.retryAfter??60)*1000,expiresAt:now()+(error.retryAfter??60)*1000});
    if(old.every(Boolean))return {code:error.code??'PROVIDER_UNAVAILABLE',message:error.message};
    throw error;
   }
  });
  pending.set(key,request);try{return await request;}finally{pending.delete(key);}
 }
 async function range(location,start,end){
  const grid=location.grid??powerGrid(location.latitude,location.longitude),years=Array.from({length:Number(end.slice(0,4))-Number(start.slice(0,4))+1},(_,i)=>Number(start.slice(0,4))+i),keys=years.map(year=>`weather-v1|${grid.id}|${year}`);
  const initial=await Promise.all(keys.map(key=>cache.get(key))),missing=years.filter((_,i)=>!initial[i]||initial[i].expiresAt<=now());
  let staleReason=null;
  // Fetch adjacent missing years in a single public request, then cache by year.
  for(let index=0;index<missing.length;){let last=index;while(last+1<missing.length&&(grid.dataset!=='era5'||last-index<4)&&missing[last+1]===missing[last]+1)last++;
   const old=initial.slice(years.indexOf(missing[index]),years.indexOf(missing[last])+1);
   staleReason=await fetchYears(grid,missing[index],missing[last],old)??staleReason;index=last+1;
  }
  const stored=await Promise.all(keys.map(key=>cache.get(key)));
  if(stored.some(item=>!item))throw failure('EMPTY_RESPONSE','No weather data is available for this location and range.',503);
  const byDate=new Map(stored.flatMap(item=>item.rows).map(row=>[row.date,row]));
  const rows=dateList(start,end).map(date=>byDate.get(date)??{date,PRECTOTCORR:null,T2M:null,T2M_MIN:null,T2M_MAX:null,qualityFlags:['No cached provider record for this day']});
  return {location:{...location,grid,spatialResolution:grid.resolution,sharedDistricts:WEATHER_LOCATIONS.filter(item=>item.grid.id===grid.id).map(item=>item.district)},start,end,rows,sources:[...new Map(stored.map(item=>[item.source.sourceUrl,item.source])).values()],cache:{status:staleReason?'stale':missing.length?'refreshed':'cached',staleReason,retrievedAt:stored.map(item=>item.source.retrievedAt).sort()[0]},classification:'model-estimated',spatialSupport:'Native weather grid-cell estimate; not a station observation or a district-wide average.'};
 }
 // Multi-coordinate ERA5 requests warm the same per-cell/year cache used by
 // point, district, map and baseline reads. A failed batch is never cached.
 async function warm(grids,start,end){
  if(!grids.length||grids[0].dataset!=='era5'||Number(end.slice(0,4))-Number(start.slice(0,4))>1)return;
  for(let year=Number(start.slice(0,4));year<=Number(end.slice(0,4));year++){
   const entries=await Promise.all(grids.map(async grid=>({grid,old:await cache.get(`weather-v1|${grid.id}|${year}`)})));
   const missing=entries.filter(item=>!item.old||item.old.expiresAt<=now());
   await Promise.all(Array.from({length:Math.ceil(missing.length/10)},(_,i)=>missing.slice(i*10,i*10+10)).map(batch=>{
    const batchGrids=batch.map(item=>item.grid),from=`${year}-01-01`,available=new Date(now()-6*86400000).toISOString().slice(0,10),to=`${year}-12-31`<available?`${year}-12-31`:available;
    const key=`batch|${year}|${batchGrids.map(grid=>grid.id).join('|')}`;
    if(pending.has(key))return pending.get(key);
    const task=limited(async()=>{
     try{
      const backoff=await cache.get('provider-backoff-era5-v1');
      if(backoff?.until>now()||to<from)return;
      await consume('provider:era5',120);
      const results=await fetchEra5(batchGrids,from,to,{fetcher,timeoutMs,now:()=>new Date(now()).toISOString()});
      await Promise.all(results.map((result,i)=>cache.set(`weather-v1|${batchGrids[i].id}|${year}`,{...result,expiresAt:now()+(year<new Date(now()).getUTCFullYear()?7*86400000:6*3600000)})));
      await record({at:new Date(now()).toISOString(),provider:'Open-Meteo',event:'success'});
     }catch(error){
      await record({at:new Date(now()).toISOString(),provider:'Open-Meteo',event:'error',code:error.code??'PROVIDER_UNAVAILABLE'});
      if(error.code==='RATE_LIMITED')await cache.set('provider-backoff-era5-v1',{until:now()+(error.retryAfter??60)*1000,expiresAt:now()+(error.retryAfter??60)*1000});
      // range() supplies controlled per-cell errors or explicitly stale data.
     }
    });
    pending.set(key,task);return task.finally(()=>pending.delete(key));
   }));
  }
 }
 return {range,warm};
}
