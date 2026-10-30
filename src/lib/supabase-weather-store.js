import {failure} from './weather-model.js';
function data(response){if(response.error)throw failure('CACHE_UNAVAILABLE','Supabase weather storage is unavailable. Check the configured schema.',503);return response.data;}
export function createSupabaseWeatherStore(client,now=()=>Date.now()){
 return {
  cache:{
   get:async key=>data(await client.from('hs_weather_cache').select('data').eq('cache_key',key).maybeSingle())?.data??null,
   set:async(key,value)=>{const rows=value.rows??[];data(await client.from('hs_weather_cache').upsert({cache_key:key,data:value,expires_at:value.expiresAt??now(),provider:value.source?.provider??null,record_days:rows.length,rainfall_missing:rows.filter(row=>row.PRECTOTCORR==null).length,temperature_missing:rows.filter(row=>row.T2M==null).length},{onConflict:'cache_key'}));},
   pruneAnalyses:async()=>{data(await client.from('hs_weather_cache').delete().like('cache_key','climate-analysis|%').lt('expires_at',now()));},
  },
  consume:async(key,limit=60,cost=1,windowMs=60000)=>{const allowed=data(await client.rpc('hs_consume_weather_budget',{p_key:key,p_limit:limit,p_cost:cost,p_window_ms:windowMs}));if(!allowed)throw failure('APP_RATE_LIMIT','Weather request budget reached. Retry after the current limit window.',429,Math.ceil((windowMs-now()%windowMs)/1000));},
  record:async event=>{data(await client.rpc('hs_record_weather_event',{p_at:event.at,p_provider:event.provider??'NASA POWER',p_event:event.event,p_code:event.code??null}));},
  status:async()=>{
   const inventory=data(await client.rpc('hs_weather_inventory')),quality={days:0,rainfall_missing:0,temperature_missing:0},qualityByProvider={};
   for(const item of inventory.entries){const provider=item.source.provider;qualityByProvider[provider]??={provider,days:0,rainfall_missing:0,temperature_missing:0};for(const key of ['days','rainfall_missing','temperature_missing']){quality[key]+=item[key]??0;qualityByProvider[provider][key]+=item[key]??0;}}
   return {...inventory,quality,qualityByProvider,persistent:true};
  },
 };
}
