import { failure } from "./weather-model.js";
export function createD1WeatherStore(db,now=()=>Date.now()) {
 return {
  record:async event=>{
   await db.prepare('INSERT INTO weather_events(occurred_at,provider,event,code) VALUES(?,?,?,?)').bind(event.at,event.provider??'NASA POWER',event.event,event.code??null).run();
   await db.prepare('DELETE FROM weather_events WHERE id NOT IN (SELECT id FROM weather_events ORDER BY id DESC LIMIT 100)').run();
  },
  status:async()=>{
   // Parse source metadata once per cache entry, not once per daily row. Repeated
   // parsing of a whole year while grouping thousands of days blocks SQLite reads.
   const entries=await db.prepare("SELECT cache_key,json_extract(data,'$.source') AS source,json_array_length(data,'$.rows') AS days,expires_at,(SELECT SUM(json_extract(r.value,'$.PRECTOTCORR') IS NULL) FROM json_each(weather_cache.data,'$.rows') r) AS rainfall_missing,(SELECT SUM(json_extract(r.value,'$.T2M') IS NULL) FROM json_each(weather_cache.data,'$.rows') r) AS temperature_missing FROM weather_cache WHERE cache_key LIKE 'weather-v1|%'").all();
   const normalized=(entries.results??[]).map(item=>({...item,source:JSON.parse(item.source)})),quality={days:0,rainfall_missing:0,temperature_missing:0},qualityByProvider={};
   for(const item of normalized){const provider=item.source.provider;qualityByProvider[provider]??={provider,days:0,rainfall_missing:0,temperature_missing:0};for(const key of ['days','rainfall_missing','temperature_missing']){quality[key]+=item[key]??0;qualityByProvider[provider][key]+=item[key]??0;}}
   const events=await db.prepare('SELECT occurred_at AS at,provider,event,code FROM weather_events ORDER BY id DESC LIMIT 20').all();
   return {entries:normalized,quality,qualityByProvider,events:events.results??[],persistent:true};
  },
  cache:{
   pruneAnalyses:async()=>{await db.prepare("DELETE FROM weather_cache WHERE cache_key LIKE 'climate-analysis|%' AND expires_at<?").bind(now()).run();},
   get:async key=>{const row=await db.prepare('SELECT data FROM weather_cache WHERE cache_key=?').bind(key).first();return row?JSON.parse(row.data):null;},
   set:async(key,data)=>{await db.prepare('INSERT INTO weather_cache(cache_key,data,expires_at) VALUES(?,?,?) ON CONFLICT(cache_key) DO UPDATE SET data=excluded.data,expires_at=excluded.expires_at').bind(key,JSON.stringify(data),data.expiresAt).run();},
  },
  consume:async(key,limit=60,cost=1,windowMs=60000)=>{
   const window=Math.floor(now()/windowMs)*windowMs;
   const row=await db.prepare('INSERT INTO weather_request_limits(limit_key,window_start,used) VALUES(?,?,?) ON CONFLICT(limit_key) DO UPDATE SET window_start=excluded.window_start,used=CASE WHEN weather_request_limits.window_start=excluded.window_start THEN weather_request_limits.used+? ELSE excluded.used END WHERE weather_request_limits.window_start<>excluded.window_start OR weather_request_limits.used<=? RETURNING used').bind(key,window,cost,cost,limit-cost).first();
   if(!row)throw failure('APP_RATE_LIMIT','Weather request budget reached. Retry after the current limit window.',429,Math.ceil((window+windowMs-now())/1000));
   // Keep limiter storage bounded without logging user identifiers.
   await db.prepare('DELETE FROM weather_request_limits WHERE window_start<?').bind(now()-2*86400000).run();
  },
 };
}
