import { seasonRange } from "./weather-model.js";
import { yieldFromRows } from "./metrics.js";
export function climateAgricultureComparison(weather,rows,{district,crop,year,season}) {
 const errors=[],range=seasonRange(Number(year),season);
 if(!district||weather?.location?.district!==district)errors.push('A validated district weather location must match the NISR district. Custom coordinates cannot be joined automatically.');
 if(weather?.start!==range.start||weather?.end!==range.end)errors.push('Weather dates must cover the complete selected agricultural season.');
 if(weather?.classification!=='model-estimated'||!(weather?.location?.grid?.id||weather?.location?.spatialMethod==='area-weighted'&&weather.location.cells?.length))errors.push('Compatible gridded climate provenance is unavailable.');
 const matches=(rows??[]).filter(row=>row.domain==='crop'&&row.crop===crop&&row.geography===district&&Number(row.year)===Number(year)&&row.season===season&&row.is_demo!==true&&row.quality_status!=='demonstration');
 const production=matches.filter(row=>row.indicator==='production'&&row.unit==='metric tonnes'),area=matches.filter(row=>row.indicator==='harvested_area'&&row.unit==='hectares');
 const valid=row=>row&&typeof row.value==='number'&&Number.isFinite(row.value)&&row.value>=0&&row.dataset_id&&row.source_reference;
 if(production.length!==1||area.length!==1||!valid(production[0])||!valid(area[0])||production[0].dataset_id!==area[0].dataset_id)errors.push('Unique compatible NISR production and harvested-area records are required.');
 if(weather?.summary?.validDays?.PRECTOTCORR!==weather?.summary?.expectedDays||weather?.summary?.validDays?.T2M!==weather?.summary?.expectedDays)errors.push('Complete rainfall and mean-temperature coverage is required for the seasonal context comparison.');
 return {compatible:!errors.length,errors,contextualOnly:true,production:!errors.length?production[0].value:null,area:!errors.length?area[0].value:null,yield:!errors.length?yieldFromRows(matches):null,sourceRecords:matches,
  limitation:`Contextual alignment only: weather is ${weather?.location?.spatialMethod==='area-weighted'?'an area-weighted district estimate from gridded reanalysis':'a sampled grid-cell estimate associated with the district'}; agriculture is a published district survey estimate. Weather resolution and survey coverage still differ. This does not establish correlation or causation, and is not a yield forecast.`};
}
