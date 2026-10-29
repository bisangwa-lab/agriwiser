import { aggregateWeather,dateList,failure,dateUTC,WEATHER_LOCATIONS,WEATHER_PARAMETERS,validateWeatherRange } from './weather-model.js';

export function validateMeteoRange(input){
 if(!input||Object.keys(input).some(key=>!['location','start','end','stationId'].includes(key))||input.stationId!==undefined&&(typeof input.stationId!=='string'||input.stationId.length>500))throw failure('INVALID_INPUT','Invalid Meteo Rwanda request.',400);
 const {stationId,...range}=input,validated=validateWeatherRange(range);
 if(!validated.location.district)throw failure('INVALID_LOCATION','Choose a district and an identified authorized station or sample.',400);
 return {...validated,...(stationId?{stationId}:{})};
}

// Authorized file delivery adapter. This is our ingestion contract, not a claimed
// Meteo Rwanda API schema. No endpoint is guessed and no NASA values are substituted.
export function normalizeMeteoDelivery(body,insideCountry,retrievedAt=new Date().toISOString()){
 const invalid=()=>{throw failure('INVALID_METEO_DELIVERY','The approved Meteo Rwanda delivery has invalid metadata, units, dates or station records.',503);};
 const bounded=value=>typeof value==='string'&&value.trim().length>0&&value.length<=500;
 let url;try{url=new URL(body?.sourceUrl);}catch{invalid();}
 if(body?.provider!=='Meteo Rwanda'||body.schemaVersion!==1||!bounded(body.dataset)||!bounded(body.licence)||!bounded(body.authorizationReference)||!Number.isFinite(Date.parse(body.issuedAt))||Date.parse(body.issuedAt)>Date.parse(retrievedAt)||body.timeStandard!=='UTC'||body.temporalResolution!=='daily'||url.protocol!=='https:'||!(url.hostname==='meteorwanda.gov.rw'||url.hostname.endsWith('.meteorwanda.gov.rw'))||url.username||url.password||url.search||url.hash||!Array.isArray(body.stations)||body.stations.length<1||body.stations.length>100)invalid();
 if(Object.entries(WEATHER_PARAMETERS).some(([key,meta])=>body.units?.[key]!==meta.unit))invalid();
 const ids=new Set();
 const stations=body.stations.map(station=>{
  if(!bounded(station.id)||!bounded(station.name)||ids.has(station.id)||!WEATHER_LOCATIONS.some(item=>item.district===station.district)||!Number.isFinite(station.latitude)||!Number.isFinite(station.longitude)||!insideCountry(station.latitude,station.longitude)||!['station-observed','blended-grid-estimate'].includes(station.classification)||!bounded(station.spatialResolution)||!Array.isArray(station.rows)||station.rows.length<1||station.rows.length>17000)invalid();
  ids.add(station.id);const dates=new Set();
  const rows=station.rows.map(row=>{
   try{dateUTC(row.date);}catch{invalid();}
   if(dates.has(row.date)||row.date>=retrievedAt.slice(0,10))invalid();dates.add(row.date);
   const record={date:row.date,qualityFlags:[]};
   for(const key of Object.keys(WEATHER_PARAMETERS)){
    const value=row[key];
    if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)||(key==='PRECTOTCORR'?(value<0||value>2000):(value< -100||value>70))))invalid();
    record[key]=value;if(value===null)record.qualityFlags.push(key+': missing in authorized delivery');
   }
   if(record.T2M_MIN!=null&&record.T2M_MAX!=null&&(record.T2M_MIN>record.T2M_MAX||(record.T2M!=null&&(record.T2M<record.T2M_MIN||record.T2M>record.T2M_MAX))))invalid();
   if(row.qualityFlags!==undefined&&(!Array.isArray(row.qualityFlags)||row.qualityFlags.length>10||!row.qualityFlags.every(bounded)))invalid();
   record.qualityFlags.push(...(row.qualityFlags??[]));return record;
  }).sort((a,b)=>a.date.localeCompare(b.date));
  return {id:station.id,name:station.name,district:station.district,latitude:station.latitude,longitude:station.longitude,classification:station.classification,spatialResolution:station.spatialResolution,rows};
 });
 return {stations,source:{provider:'Meteo Rwanda',dataset:body.dataset,licence:body.licence,issuedAt:body.issuedAt,timeStandard:'UTC',temporalResolution:'daily',sourceUrl:url.toString(),retrievedAt,parameters:{...WEATHER_PARAMETERS,PRECTOTCORR:{...WEATHER_PARAMETERS.PRECTOTCORR,label:'Daily precipitation (authorized delivery)'}}}};
}
export function meteoCatalogue(delivery){
 return {status:'authorized-delivery',source:delivery.source,locations:delivery.stations.map(({rows,...station})=>({...station,start:rows[0].date,end:rows.at(-1).date,recordDays:rows.length}))};
}
export function meteoRange(delivery,input){
 const locations=delivery.stations.filter(item=>item.district===input.location.district),station=input.stationId?locations.find(item=>item.id===input.stationId):locations.length===1?locations[0]:null;
 if(!station)throw failure('METEO_LOCATION_UNAVAILABLE',locations.length>1?'Choose a specific station or grid sample; these records are never averaged automatically.':'No authorized Meteo Rwanda records match this district and station.',404);
 const indexed=new Map(station.rows.map(row=>[row.date,row])),rows=dateList(input.start,input.end).map(date=>indexed.get(date)??{date,PRECTOTCORR:null,T2M:null,T2M_MIN:null,T2M_MAX:null,qualityFlags:['No authorized delivery record for this day']});
 const {rows:unused,...location}=station;
 return {start:input.start,end:input.end,location,rows,summary:aggregateWeather(rows,input.start,input.end),classification:station.classification,sources:[delivery.source],cache:{status:'authorized-delivery',retrievedAt:delivery.source.retrievedAt},spatialSupport:'One identified station or blended sample. No automatic district aggregation, NASA substitution or cross-provider averaging.'};
}
