import { failure } from "./weather-model.js";
export function createD1WeatherStore(db,now=()=>Date.now()) {
 return {
  record:async event=>{
   await db.prepare('INSERT INTO weather_events(occurred_at,provider,event,code) VALUES(?,?,?,?)').bind(event.at,event.provider??'NASA POWER',event.event,event.code??null).run();
   await db.prepare('DELETE FROM weather_events WHERE id NOT IN (SELECT id FROM weather_events ORDER BY id DESC LIMIT 100)').run();
  },
  status:async()=>{
   const entries=await db.prepare("SELECT cache_key, json_extract(data,'$.source') AS source, json_array_length(json_extract(data,'$.rows')) AS days, expires_at FROM weather_cache WHERE cache_key LIKE 'weather-v1|%'").all();
   const quality=await db.prepare("SELECT COUNT(*) AS days, SUM(json_extract(r.value,'$.PRECTOTCORR') IS NULL) AS rainfall_missing, SUM(json_extract(r.value,'$.T2M') IS NULL) AS temperature_missing FROM weather_cache c, json_each(c.data,'$.rows') r WHERE c.cache_key LIKE 'weather-v1|%'").first();
   const events=await db.prepare('SELECT occurred_at AS at,provider,event,code FROM weather_events ORDER BY id DESC LIMIT 20').all();
   return {entries:(entries.results??[]).map(item=>({...item,source:JSON.parse(item.source)})),quality,events:events.results??[],persistent:true};
  },
  cache:{
   get:async key=>{const row=await db.prepare('SELECT data FROM weather_cache WHERE cache_key=?').bind(key).first();return row?JSON.parse(row.data):null;},
   set:async(key,data)=>{await db.prepare('INSERT INTO weather_cache(cache_key,data,expires_at) VALUES(?,?,?) ON CONFLICT(cache_key) DO UPDATE SET data=excluded.data,expires_at=excluded.expires_at').bind(key,JSON.stringify(data),data.expiresAt).run();},
  },
  consume:async(key,limit=60)=>{
   const window=Math.floor(now()/60000)*60000;
   const row=await db.prepare('INSERT INTO weather_request_limits(limit_key,window_start,used) VALUES(?,?,1) ON CONFLICT(limit_key) DO UPDATE SET window_start=excluded.window_start,used=CASE WHEN weather_request_limits.window_start=excluded.window_start THEN weather_request_limits.used+1 ELSE 1 END WHERE weather_request_limits.window_start<>excluded.window_start OR weather_request_limits.used<? RETURNING used').bind(key,window,limit).first();
   if(!row)throw failure('APP_RATE_LIMIT','Too many weather requests. Retry in a minute.',429,Math.ceil((window+60000-now())/1000));
   // Keep limiter storage bounded without logging user identifiers.
   await db.prepare('DELETE FROM weather_request_limits WHERE window_start<?').bind(window-3600000).run();
  },
 };
}
