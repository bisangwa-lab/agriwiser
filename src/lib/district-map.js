import { DISTRICT_NAMES } from "./constants.js";
import { computeYield, percentageChange, toNumber } from "./metrics.js";

const valid=(row,key)=>row.indicator===key&&row.unit===(key==="production"?"metric tonnes":key==="harvested_area"?"hectares":"millimetres");
export function districtMapData(rows,{crop,season,year,compareYear=Number(year)-1,compareSeason=season},climate=[]) {
 const approved=(rows??[]).filter(row=>row.is_demo!==true&&row.quality_status!=="demonstration"&&row.domain==="crop"&&row.crop===crop);
 return DISTRICT_NAMES.map(name=>{
  const history=approved.filter(row=>row.geography===name);
  const current=history.filter(row=>Number(row.year)===Number(year)&&row.season===season);
  const prior=history.filter(row=>Number(row.year)===Number(compareYear)&&row.season===compareSeason);
  const warnings=[...new Set([...current,...prior].flatMap(row=>row.quality_flags??[]))];
  const measure=(items,key)=>{
   const matches=items.filter(row=>valid(row,key));
   const value=matches.length===1?toNumber(matches[0].value):null;
   return value!==null&&value>=0?value:null;
  };
  const compatible=items=>{
   const source=items.find(row=>valid(row,"production"))?.dataset_id;
   return Boolean(source)&&source===items.find(row=>valid(row,"harvested_area"))?.dataset_id;
  };
  const production=measure(current,"production"),area=measure(current,"harvested_area");
  const previous=measure(prior,"production"),previousArea=measure(prior,"harvested_area");
  const yieldValue=compatible(current)?computeYield(production,area):null;
  const previousYield=compatible(prior)?computeYield(previous,previousArea):null;
  const samePeriod=Number(year)===Number(compareYear)&&season===compareSeason;
  const change=samePeriod?{value:null,reason:"same_period"}:percentageChange(production,previous);
  if(production===null)warnings.push("Production is missing, duplicated or uses an incompatible unit.");
  if(area===null)warnings.push("Harvested area is missing, duplicated or uses an incompatible unit.");
  if(area===0)warnings.push("Harvested area is zero. Yield cannot be calculated.");
  if(!compatible(current)&&production!==null&&area!==null)warnings.push("Production and area come from different dataset releases. Yield is unavailable.");
  if(change.reason)warnings.push(change.reason==="same_period"?"Choose two distinct reporting periods.":change.reason==="zero_baseline"?"Baseline production is zero. Percentage change is not calculable.":"No production value is available for the selected baseline period.");
  if(prior.length&&previousArea===null)warnings.push("Baseline harvested area is missing or incompatible. Area and yield changes may not be calculable.");
  if(previous!==null&&previousArea!==null&&!compatible(prior))warnings.push("Baseline production and area do not share a compatible dataset release.");
  if(season!==compareSeason)warnings.push("This comparison uses different agricultural seasons. Seasonal conditions can differ; interpret the change within that context.");
  const sameSeason=history.filter(row=>row.season===season);
  const lastYear=sameSeason.length?Math.max(...sameSeason.map(row=>Number(row.year))):null;
  const quality=!current.length?(lastYear!==null&&lastYear<year?"outdated":"missing"):production===null||area===null||!compatible(current)||current.some(row=>row.quality_flags?.length)?"incomplete":samePeriod||previous===null||previous===0||previousArea===null||!compatible(prior)?"incomparable":"complete";
  const rainfallFor=(selectedYear,selectedSeason)=>(climate??[]).filter(row=>row.geography===name&&row.season===selectedSeason&&Number(row.year)===Number(selectedYear)&&row.indicator==="rainfall_mm"&&row.unit==="millimetres"&&row.is_demo!==true&&row.quality_status!=="demonstration");
  const rainfallRows=rainfallFor(year,season),previousRainfallRows=rainfallFor(compareYear,compareSeason);
  const rain=items=>items.length===1&&toNumber(items[0].value)!==null&&toNumber(items[0].value)>=0?toNumber(items[0].value):null;
  return {name,production,area,yield:yieldValue,previous,previousArea,previousYield,changePct:change.value,areaChangePct:samePeriod?null:percentageChange(area,previousArea).value,yieldChangePct:samePeriod?null:percentageChange(yieldValue,previousYield).value,changeAbsolute:!samePeriod&&production!==null&&previous!==null?production-previous:null,quality,lastYear,rainfall:rain(rainfallRows),previousRainfall:rain(previousRainfallRows),warnings,records:current,previousRecords:prior,rainfallRecords:rainfallRows,previousRainfallRecords:previousRainfallRows};
 });
}
export const MAP_MODES=[
 {key:"yield",label:"Productivity",unit:"t/ha",field:"yield"},
 {key:"production",label:"Production",unit:"t",field:"production"},
 {key:"trend",label:"Production change",unit:"%",field:"changePct"},
 {key:"weather",label:"Rainfall context",unit:"mm",field:"rainfall"},
 {key:"quality",label:"Data quality",unit:"status",field:"quality"},
];
export const QUALITY_LEGEND=[
 {label:"Complete for selected period",color:"#23754c",key:"complete"},
 {label:"Incomplete or incompatible",color:"#dfac46",key:"incomplete"},
 {label:"Only older records available",color:"#7a91a6",key:"outdated"},
 {label:"Baseline comparison limited",color:"#b09ac2",key:"incomparable"},
];
export const TREND_LEGEND=[
 {label:"≤ −15%",color:"#b65b27"},
 {label:"−15% to < 0%",color:"#efc18c"},
 {label:"0%",color:"#edf2ee"},
 {label:"> 0% to < 15%",color:"#a5d5b2"},
 {label:"≥ 15%",color:"#23754c"},
];
const GREEN=["#e1efd7","#bad99d","#89bc70","#4b9654","#226d43"];
export function mapScale(mode,districts) {
 const meta=MAP_MODES.find(item=>item.key===mode)??MAP_MODES[0];
 if(mode==="quality") return {legend:QUALITY_LEGEND,color:item=>QUALITY_LEGEND.find(entry=>entry.key===item.quality)?.color??null};
 if(mode==="trend") return {legend:TREND_LEGEND,color:item=>{
  const value=item.changePct;
  if(value===null) return null;
  return TREND_LEGEND[value<=-15?0:value<0?1:value===0?2:value<15?3:4].color;
 }};
 const values=districts.map(item=>item[meta.field]).filter(value=>typeof value==="number"&&Number.isFinite(value));
 const max=values.length?Math.max(...values):0;
 if(!values.length) return {legend:[],color:()=>null};
 if(max===0) return {legend:[{label:"0 "+meta.unit,color:GREEN[0]}],color:item=>item[meta.field]===null?null:GREEN[0]};
 const digits=meta.key==="yield"?2:0;
 const format=value=>value.toLocaleString("en-GB",{maximumFractionDigits:digits});
 return {legend:GREEN.map((color,index)=>({label:format(max*index/5)+"–"+format(max*(index+1)/5)+" "+meta.unit,color})),color:item=>{
  const value=item[meta.field];
  return value===null?null:GREEN[Math.min(4,Math.floor(value/max*5))];
 }};
}
