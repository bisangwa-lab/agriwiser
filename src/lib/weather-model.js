import locations from "../data/weather-locations.json" with {type:"json"};
import { normalizeRole } from "./rbac.js";
export const WEATHER_LOCATIONS=locations.locations;
export const LOCATION_METHOD=locations.method;
export const WEATHER_ROLES=["super_admin","data_manager","agricultural_analyst","policy_maker","agricultural_officer","field_investigator","field_supervisor"];
export const canReadWeather=user=>WEATHER_ROLES.includes(normalizeRole(user));
export function assertWeatherAccess(user) {if(!user)throw Object.assign(new Error("Sign in to use weather data."),{status:401,code:'UNAUTHORIZED'});if(!canReadWeather(user))throw Object.assign(new Error("Your role cannot access climate analysis."),{status:403,code:'FORBIDDEN'});}
export const WEATHER_PARAMETERS={PRECTOTCORR:{label:"Precipitation corrected",unit:"mm/day",summaryUnit:"mm",field:"rainfall",kind:"total"},T2M:{label:"Mean temperature at 2 m",unit:"C",summaryUnit:"°C",field:"temperature",kind:"mean"},T2M_MIN:{label:"Minimum temperature at 2 m",unit:"C",summaryUnit:"°C",field:"minimum",kind:"minimum"},T2M_MAX:{label:"Maximum temperature at 2 m",unit:"C",summaryUnit:"°C",field:"maximum",kind:"maximum"}};
export const POWER_DOCUMENTATION="https://power.larc.nasa.gov/docs/services/api/temporal/daily/";
export const DEFAULT_THRESHOLDS={rainfallDeficitPct:-20,hotDayC:35,coldDayC:10,temperatureAnomalyC:2};
export const failure=(code,message,status=502,retryAfter)=>Object.assign(new Error(message),{code,status,retryAfter});
const DAY=86400000;
export function dateUTC(text) {
  if(typeof text!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(text))throw failure("INVALID_DATE","Use a valid date in YYYY-MM-DD format.",400);
  const date=new Date(text+"T00:00:00Z");
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==text)throw failure("INVALID_DATE","This calendar date does not exist.",400);
  return date;
}
export function daysBetween(start,end){return Math.round((dateUTC(end)-dateUTC(start))/DAY)+1;}
export function dateList(start,end){return Array.from({length:daysBetween(start,end)},(_,i)=>new Date(dateUTC(start).getTime()+i*DAY).toISOString().slice(0,10));}
export function seasonRange(year,season) {
  if(!Number.isInteger(year)||year<1982||year>2100||!["Season A","Season B","Season C"].includes(season))throw failure("INVALID_PERIOD","Choose a supported agricultural season and year (1982 onward).",400);
  return season==="Season A"?{start:`${year-1}-09-01`,end:new Date(Date.UTC(year,2,0)).toISOString().slice(0,10)}:season==="Season B"?{start:`${year}-03-01`,end:`${year}-06-30`}:{start:`${year}-07-01`,end:`${year}-09-30`};
}
function validateLocation(location){
  if(!location||typeof location!=="object"||Array.isArray(location))throw failure("INVALID_LOCATION","Choose a district or Rwanda coordinates.",400);
  if(location.district!==undefined){if(Object.keys(location).length!==1||!WEATHER_LOCATIONS.some(item=>item.district===location.district))throw failure("INVALID_LOCATION","Choose a valid Rwanda district.",400);return {district:location.district};}
  if(Object.keys(location).length!==2||![location.latitude,location.longitude].every(value=>typeof value==="number"&&Number.isFinite(value))||location.latitude< -3||location.latitude> -1||location.longitude<28||location.longitude>31)throw failure("INVALID_LOCATION","Enter coordinates inside Rwanda.",400);
  return {latitude:location.latitude,longitude:location.longitude};
}
export function validateWeatherRange(input,now=new Date()) {
  if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(key=>!["location","start","end","dataset"].includes(key))||input.dataset!==undefined&&!['merra2','era5'].includes(input.dataset))throw failure("INVALID_INPUT","Invalid weather request or dataset.",400);
  const location=validateLocation(input.location),start=dateUTC(input.start),end=dateUTC(input.end);
  if(start<dateUTC("1981-01-01")||end<start||end>=dateUTC(now.toISOString().slice(0,10))||daysBetween(input.start,input.end)>1831)throw failure("INVALID_RANGE","Choose a historical range from 1981 onward, ending before today, spanning at most five years per request.",400);
  return {location,start:input.start,end:input.end,...(input.dataset?{dataset:input.dataset}:{})};
}
export function validateWeatherMap(input){
 if(!input||Object.keys(input).some(key=>!["start","end","dataset"].includes(key)))throw failure("INVALID_INPUT","Invalid map period.",400);
 const result=validateWeatherRange({...input,location:{district:"Gasabo"}});
 if(daysBetween(result.start,result.end)>366)throw failure("INVALID_RANGE","Choose at most one year for the district weather map.",400);
 return {start:result.start,end:result.end,...(result.dataset?{dataset:result.dataset}:{})};
}
export function validateBaseline(input){
 if(!input||Object.keys(input).some(key=>!["location","year","season","baselineStart","baselineEnd","dataset"].includes(key)))throw failure("INVALID_INPUT","Invalid climate baseline.",400);
 const location=validateLocation(input.location),period=seasonRange(input.year,input.season);
 validateWeatherRange({location,...period,...(input.dataset?{dataset:input.dataset}:{})});
 if(!Number.isInteger(input.baselineStart)||!Number.isInteger(input.baselineEnd)||input.baselineStart<1982||input.baselineEnd>input.year-1||input.baselineEnd-input.baselineStart<19||input.baselineEnd-input.baselineStart>39)throw failure("INVALID_BASELINE","Use 20–40 completed baseline years from 1982 onward, all before the selected year.",400);
 return {...input,location};
}
export function aggregateWeather(rows,start,end) {
 const expected=daysBetween(start,end),selected=(rows??[]).filter(row=>row.date>=start&&row.date<=end),summary={expectedDays:expected,validDays:{},missingDays:{}};
 for(const [code,meta] of Object.entries(WEATHER_PARAMETERS)){
  const values=selected.map(row=>row[code]).filter(value=>typeof value==="number"&&Number.isFinite(value));
  summary.validDays[code]=values.length;summary.missingDays[code]=expected-values.length;
  const complete=values.length===expected;
  summary[meta.field]=!values.length?null:meta.kind==="total"?(complete?values.reduce((a,b)=>a+b,0):null):meta.kind==="minimum"?Math.min(...values):meta.kind==="maximum"?Math.max(...values):values.reduce((a,b)=>a+b,0)/values.length;
  if(code==="PRECTOTCORR")summary.observedRainfall=values.length?values.reduce((a,b)=>a+b,0):null;
 }
 summary.complete=Object.values(summary.missingDays).every(value=>value===0);
 return summary;
}
export function weatherSeries(rows,group="month") {
 const groups=new Map();
 for(const row of rows??[]){const key=group==="day"?row.date:group==="year"?row.date.slice(0,4):row.date.slice(0,7);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([label,items])=>{items.sort((a,b)=>a.date.localeCompare(b.date));return {label,start:items[0].date,end:items.at(-1).date,...aggregateWeather(items,items[0].date,items.at(-1).date)};});
}
export function climateBaseline(rows,{year,season,baselineStart,baselineEnd}) {
 const periods=Array.from({length:baselineEnd-baselineStart+1},(_,i)=>{const y=baselineStart+i,r=seasonRange(y,season);return {year:y,...r,...aggregateWeather(rows,r.start,r.end)};});
 const rain=periods.filter(item=>item.rainfall!==null),temperatures=periods.filter(item=>item.validDays.T2M===item.expectedDays);
 const rainfall=rain.length>=20?rain.reduce((sum,item)=>sum+item.rainfall,0)/rain.length:null;
 const temperature=temperatures.length>=20?temperatures.reduce((sum,item)=>sum+item.temperature,0)/temperatures.length:null;
 const currentRange=seasonRange(year,season),current=aggregateWeather(rows,currentRange.start,currentRange.end);
 return {baselineStart,baselineEnd,season,year,completeRainfallYears:rain.length,completeTemperatureYears:temperatures.length,rainfall,temperature,current,
  rainfallAnomalyMm:rainfall!==null&&current.rainfall!==null?current.rainfall-rainfall:null,
  rainfallAnomalyPct:rainfall!==null&&rainfall>0&&current.rainfall!==null?(current.rainfall-rainfall)/rainfall*100:null,
  temperatureAnomalyC:temperature!==null&&current.validDays.T2M===current.expectedDays?current.temperature-temperature:null,
  periods,formula:"Rainfall anomaly (%) = 100 × (selected season total − mean of complete baseline season totals) / baseline mean. Temperature anomaly (°C) = selected season mean − mean of complete baseline season means. At least 20 complete baseline years per parameter; incomplete current rainfall is unavailable."};
}
export function riskIndicators(rows,summary,baseline,thresholds=DEFAULT_THRESHOLDS) {
 const thresholdsValid=thresholds&&Number.isFinite(thresholds.rainfallDeficitPct)&&thresholds.rainfallDeficitPct>= -100&&thresholds.rainfallDeficitPct<0&&Number.isFinite(thresholds.hotDayC)&&thresholds.hotDayC>=20&&thresholds.hotDayC<=60&&Number.isFinite(thresholds.coldDayC)&&thresholds.coldDayC>= -20&&thresholds.coldDayC<=20&&thresholds.coldDayC<thresholds.hotDayC&&Number.isFinite(thresholds.temperatureAnomalyC)&&thresholds.temperatureAnomalyC>0&&thresholds.temperatureAnomalyC<=15;
 if(!thresholdsValid)throw failure("INVALID_THRESHOLDS","Choose valid climate indicator thresholds.",400);
 return {rainfallDeficit:baseline?.rainfallAnomalyPct==null?null:baseline.rainfallAnomalyPct<=thresholds.rainfallDeficitPct,
  unusualWarmth:baseline?.temperatureAnomalyC==null?null:baseline.temperatureAnomalyC>=thresholds.temperatureAnomalyC,
  hotDays:summary.validDays.T2M_MAX?(rows??[]).filter(row=>row.T2M_MAX!==null&&row.T2M_MAX>=thresholds.hotDayC).length:null,
  coldDays:summary.validDays.T2M_MIN?(rows??[]).filter(row=>row.T2M_MIN!==null&&row.T2M_MIN<=thresholds.coldDayC).length:null,
  thresholds,classification:"Exploratory climate indicators, not confirmed disasters or official warnings."};
}
