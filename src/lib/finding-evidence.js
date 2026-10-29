/** Accept both existing map findings and the richer seasonal-analysis snapshot. */
export function normalizeFindingEvidence(raw){
 if(!raw)return null;
 if(!raw.scope||!raw.crops)return raw;
 const period=row=>({...row,period:row.period??`${row.year} ${row.season}`});
 return {method:raw.limitation+' '+(raw.normal?.formula??''),current:raw.crops.current.records.map(period),previous:raw.crops.reference.records.map(period),warnings:[...raw.current.errors??[],...raw.reference.errors??[],...raw.normalEvidence?.errors??[]].map(e=>e.message),weatherSources:[...raw.current.sources,...raw.reference.sources,...raw.normalEvidence?.sources??[]],baseline:raw.normal,scope:raw.scope};
}
