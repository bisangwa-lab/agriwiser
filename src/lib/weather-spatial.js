import overlaps from '../data/weather-overlaps.json' with {type:'json'};
import {aggregateWeather,dateList,WEATHER_PARAMETERS} from './weather-model.js';
import {WEATHER_DATASETS,weatherGrid} from './weather-datasets.js';
export const WEATHER_OVERLAPS=overlaps.datasets;
export function spatialLocation(location,dataset='merra2'){
 const {grid,sharedDistricts,...point}=location;
 const overlap=WEATHER_OVERLAPS[dataset].districts.find(item=>item.district===location.district);
 return overlap?{...point,...overlap,dataset,spatialResolution:WEATHER_DATASETS[dataset].resolution,spatialMethod:'area-weighted'}:{...point,dataset,grid:weatherGrid(location.latitude,location.longitude,dataset),spatialResolution:WEATHER_DATASETS[dataset].resolution,spatialMethod:'grid-cell'};
}
export async function loadWeatherCells(engine,cells,start,end){
 await engine.warm?.(cells,start,end);
 return new Map(await Promise.all(cells.map(async grid=>{
  try{return [grid.id,await engine.range({latitude:grid.latitude,longitude:grid.longitude,grid},start,end)];}
  catch(error){return [grid.id,{error:{code:error.code??'PROVIDER_UNAVAILABLE',message:error.status?error.message:'Weather data is temporarily unavailable.',retryAfter:error.retryAfter}}];}
 })));
}
export function weightedDistrictWeather(location,results,start,end){
 const dates=dateList(start,end),byCell=new Map(location.cells.map(cell=>[cell.id,new Map((results.get(cell.id)?.rows??[]).map(row=>[row.date,row]))]));
 const rows=dates.map(date=>{
  const row={date,qualityFlags:[],spatialCoverage:{}};
  for(const code of Object.keys(WEATHER_PARAMETERS)){
   let weight=0,value=0,validCells=0;
   for(const cell of location.cells){const raw=byCell.get(cell.id).get(date)?.[code];if(typeof raw==='number'&&Number.isFinite(raw)){weight+=cell.weight;value+=raw*cell.weight;validCells++;}}
   row.spatialCoverage[code]=Math.min(1,weight);
   row[code]=validCells===location.cells.length&&Math.abs(weight-1)<1e-7?value:null;
   if(row[code]===null)row.qualityFlags.push(`${code}: ${(weight*100).toFixed(2)}% of district area has valid cell data; full district estimate unavailable`);
  }
  return row;
 });
 const loaded=location.cells.map(cell=>results.get(cell.id)).filter(item=>item?.cache);
 const sources=[...new Map(loaded.flatMap(item=>item.sources).map(source=>[source.sourceUrl,source])).values()];
 const stale=loaded.find(item=>item.cache.status==='stale');
 const errors=[...new Map(location.cells.flatMap(cell=>{const item=results.get(cell.id);return item?.error?[item.error]:item?.errors??[];}).map(error=>[error.code+'|'+error.message,error])).values()];
 const summary=aggregateWeather(rows,start,end);
 summary.spatialCoverage=Object.fromEntries(Object.keys(WEATHER_PARAMETERS).map(code=>[code,Math.min(...rows.map(row=>row.spatialCoverage[code]))]));
 return {location,start,end,dataset:location.dataset,rows,summary,sources,errors,classification:'model-estimated',spatialSupport:`Area-weighted ${WEATHER_DATASETS[location.dataset].label} district estimate. Each daily value is the sum of intersecting cell values × district overlap fractions, requiring 100% area coverage. No interpolation or station observations. Daily minima/maxima are area averages of cell daily minima/maxima, not the coldest/hottest place in the district.`,cache:{status:!loaded.length?'unavailable':loaded.length<location.cells.length||loaded.some(item=>item.cache.status==='partial')?'partial':stale?'stale':loaded.some(item=>item.cache.status==='refreshed')?'refreshed':'cached',staleReason:stale?.cache.staleReason??errors[0]??null,retrievedAt:loaded.map(item=>item.cache.retrievedAt).filter(Boolean).sort()[0]??null},cells:location.cells.map(cell=>({...cell,error:results.get(cell.id)?.error??results.get(cell.id)?.errors?.[0]??null,cache:results.get(cell.id)?.cache??null,summary:results.get(cell.id)?.rows?aggregateWeather(results.get(cell.id).rows,start,end):null}))};
}
export async function spatialWeatherRange(engine,location,start,end,dataset='merra2'){
 const resolved=spatialLocation(location,dataset);
 if(!resolved.cells){const data=await engine.range(resolved,start,end);return {...data,dataset,summary:aggregateWeather(data.rows,start,end)};}
 const results=await loadWeatherCells(engine,resolved.cells,start,end);
 return weightedDistrictWeather(resolved,results,start,end);
}
