/** Describe only the releases actually used by the displayed observations. */
export function sourceProvenance(datasets, rows) {
 const ids=new Set((rows??[]).map(row=>row.dataset_id).filter(Boolean));
 const sources=(datasets??[]).filter(item=>ids.has(item.id));
 if(!sources.length)return {dataset:null,sources:[]};
 if(sources.length===1)return {dataset:sources[0],sources};
 const joined=field=>[...new Set(sources.map(item=>item[field]).filter(Boolean))].join("; ");
 return {sources,dataset:{
  ...sources[0],id:null,name:joined("name"),reporting_period:joined("reporting_period"),version:joined("version"),source_url:null,
  source_reference:joined("source_reference"),publisher:joined("publisher"),license:joined("license"),
  quality_status:sources.some(item=>item.quality_status==="demonstration")?"demonstration":sources.every(item=>item.quality_status==="verified")?"verified":"provisional",
  quality_warnings:[...new Set(sources.flatMap(item=>item.quality_warnings??[]))],
  limitations:joined("limitations"),methodology:joined("methodology"),
 }};
}
