import { useId, useMemo, useRef, useState } from "react";
import { Link,useNavigate } from "@tanstack/react-router";
import { WeatherDistrictMap } from "@/components/weather/WeatherDistrictMap";
import { seasonRange } from "@/lib/weather-model";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Check, ClipboardList, CloudRain, ExternalLink, Info, Loader2, MapPin, Minus, Plus, RotateCcw } from "lucide-react";
import boundaries from "@/data/rwanda-districts.geojson?raw";
import { districtPaths } from "@/lib/map-geometry";
import { districtMapData, mapScale, MAP_MODES } from "@/lib/district-map";
import { useObservations } from "@/hooks/useObservations";
import { useDatasets } from "@/hooks/useAgriRecords";
import { useAuth } from "@/lib/AuthContext";
import { normalizeRole } from "@/lib/rbac";
import { CROPS, cropLabel, DISTRICT_NAMES, SEASONS, YEARS } from "@/lib/constants";
import { formatNumber, formatSignedPercent, formatDate } from "@/lib/format";
import { localCreateDistrictReview, localSaveDistrictFinding } from "@/lib/local-data";
import { isLocalAuth } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DashboardCard } from "@/components/dashboard/DashboardCard";

const SHAPES=districtPaths(JSON.parse(boundaries));
if(SHAPES.length!==30 || SHAPES.some(shape=>!DISTRICT_NAMES.includes(shape.name))) throw new Error("The geographic boundaries do not match the district catalogue.");
const CONTROL="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30";
const valueLabel=(value,unit,digits=0)=>value===null?"Not available":formatNumber(value,digits)+" "+unit;
function MapSelect({label,value,onChange,options}) {
 const id=useId();
 return <div className="min-w-0 space-y-1.5"><Label htmlFor={id} className="text-[10.5px] text-muted-foreground">{label}</Label><select id={id} value={value} onChange={event=>onChange(event.target.value)} className={CONTROL}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}
const asOptions=items=>items.map(value=>({value,label:value}));

export function DistrictMap({crop="Maize",season="Season B",year,onCropChange,onSeasonChange,onYearChange,large=false,initialMode="yield",compareYear,compareSeason,onCompareYearChange,onCompareSeasonChange,initialCompareYear,initialCompareSeason}) {
 const navigate=useNavigate();
 const [localCrop,setLocalCrop]=useState(crop);
 const [localSeason,setLocalSeason]=useState(season);
 const [localYear,setLocalYear]=useState(2026);
 const chosenCrop=onCropChange?crop:localCrop;
 const chosenSeason=onSeasonChange?season:localSeason;
 const chosenYear=Number(year??localYear);
 const [localCompareYear,setLocalCompareYear]=useState(initialCompareYear??null);
 const [localCompareSeason,setLocalCompareSeason]=useState(initialCompareSeason??null);
 const baselineYear=Number(compareYear??localCompareYear??chosenYear-1);
 const baselineSeason=compareSeason??localCompareSeason??chosenSeason;
 const [focus,setFocus]=useState("");
 const [peer,setPeer]=useState("");
 const [saveKind,setSaveKind]=useState("investigation");
 const [mode,setMode]=useState(initialMode);
 const [selected,setSelected]=useState(null);
 const [hovered,setHovered]=useState(null);
 const [zoom,setZoom]=useState(1);
 const [pan,setPan]=useState({x:0,y:0});
 const drag=useRef(null);
 const [reviewOpen,setReviewOpen]=useState(false);
 const [reason,setReason]=useState("");
 const [saving,setSaving]=useState(false);
 const [reviewError,setReviewError]=useState("");
 const [saved,setSaved]=useState(null);
 const queryClient=useQueryClient();
 const {user}=useAuth();
 const records=useObservations({domain:"crop",crop:chosenCrop});
 const climate=useObservations({domain:"climate"});
 const {data:datasets=[]}=useDatasets();
 const metrics=useMemo(()=>districtMapData(records.data,{crop:chosenCrop,season:chosenSeason,year:chosenYear,compareYear:baselineYear,compareSeason:baselineSeason},climate.data),[records.data,chosenCrop,chosenSeason,chosenYear,baselineYear,baselineSeason,climate.data]);
 const scale=useMemo(()=>mapScale(mode,metrics),[mode,metrics]);
 const byName=new Map(metrics.map(item=>[item.name,item]));
 const meta=MAP_MODES.find(item=>item.key===mode);
 const detail=byName.get(selected);
 const peerDetail=byName.get(peer);
 const candidates=focus==="declines"?metrics.filter(item=>item.changePct!==null&&item.changePct<0).sort((a,b)=>a.changePct-b.changePct):focus==="yields"?metrics.filter(item=>item.yield!==null).sort((a,b)=>b.yield-a.yield):focus==="gaps"?metrics.filter(item=>item.quality!=="complete"):[];
 const sources=datasets.filter(source=>[...(detail?.records??[]),...(detail?.previousRecords??[])].some(row=>row.dataset_id===source.id));
 const weatherSources=datasets.filter(source=>detail?.rainfallRecords.some(row=>row.dataset_id===source.id));
 const activeSources=mode==="weather"?weatherSources:sources;
 const noWeather=!metrics.some(item=>item.rainfall!==null);
 const canReview=isLocalAuth&&["super_admin","data_manager","agricultural_analyst","policy_maker","agricultural_officer","field_investigator","field_supervisor"].includes(normalizeRole(user));
 const id=useId().replace(/:/g,"");
 const patternId="district-missing-"+id;
 const period=chosenYear+" "+chosenSeason;
 const baselinePeriod=baselineYear+" "+baselineSeason;
 const noValue=metrics.filter(item=>mode==="quality"?item.quality==="missing":item[meta.field]===null).length;
 function selectDistrict(name) {setSelected(name);setReviewOpen(false);setReviewError("");setSaved(null);setReason("");setPeer("");}
 function describe(item) {
  if(mode==="quality") return item.quality;
  return valueLabel(item[meta.field],meta.unit,mode==="yield"||mode==="trend"?2:0);
 }
 async function submitReview(event) {
  event.preventDefault();setSaving(true);setReviewError("");
  try {
   const action=saveKind==="report"?localSaveDistrictFinding:localCreateDistrictReview;
   const result=await action({data:{district:selected,crop:chosenCrop,season:chosenSeason,year:chosenYear,compareYear:baselineYear,compareSeason:baselineSeason,reason,mode}});
   setSaved(result);setReviewOpen(false);
   await queryClient.invalidateQueries({queryKey:[saveKind==="report"?"report-findings":"investigations"]});
  } catch(error) {setReviewError(error.message||"The investigation could not be created.");}
  finally {setSaving(false);}
 }
 const changeSelection=(setter,value)=>{setter(value);setSelected(null);setSaved(null);};
 if(mode==="weather")return <div className="space-y-3"><WeatherDistrictMap period={seasonRange(chosenYear,chosenSeason)} autoLoad onAnalyze={district=>navigate({to:'/weather',search:{district,year:chosenYear,season:chosenSeason}})}/><div className="flex flex-wrap gap-3"><Button size="sm" variant="outline" onClick={()=>setMode('yield')}>Back to crop map</Button><Link to="/weather" className="self-center text-xs font-medium text-primary underline">Open full weather & climate analysis</Link></div></div>;
 return <>
  <DashboardCard title={large?"Rwanda district map":meta.label+" across Rwanda"} subtitle="Select a district to inspect its evidence and reporting context"
   action={!large?<Link to="/compare" hash="district-map" search={{crop:chosenCrop,season:chosenSeason,year:chosenYear,mapView:mode,compareYear:baselineYear,compareSeason:baselineSeason}} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">Larger map<ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></Link>:<MapPin className="h-4 w-4 text-primary" aria-hidden />}
   contentClassName="space-y-4">
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <MapSelect label="Map view" value={mode} onChange={value=>{setMode(value);setSaved(null);setReviewOpen(false);}} options={MAP_MODES.map(item=>({value:item.key,label:item.label}))} />
    <MapSelect label="Map crop" value={chosenCrop} onChange={value=>changeSelection(onCropChange??setLocalCrop,value)} options={CROPS.map(value=>({value,label:cropLabel(value)}))} />
    <MapSelect label="Map season" value={chosenSeason} onChange={value=>changeSelection(onSeasonChange??setLocalSeason,value)} options={asOptions(SEASONS)} />
    <MapSelect label="Map year" value={chosenYear} onChange={value=>changeSelection(onYearChange??setLocalYear,value)} options={asOptions([...YEARS].reverse())} />
   </div>
   <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/35 p-3">
    <MapSelect label="Baseline year" value={baselineYear} onChange={value=>changeSelection(onCompareYearChange??setLocalCompareYear,value)} options={asOptions([...new Set([...YEARS,chosenYear-1,baselineYear])].sort((a,b)=>b-a))} />
    <MapSelect label="Baseline season" value={baselineSeason} onChange={value=>changeSelection(onCompareSeasonChange??setLocalCompareSeason,value)} options={asOptions(SEASONS)} />
   </div>
   <div aria-label="Analyst focus" className="flex flex-wrap gap-2">{[["declines","Production declines","trend"],["yields","Higher yields","yield"],["gaps","Data gaps","quality"]].map(([key,label,view])=><Button key={key} type="button" size="sm" variant={focus===key?"default":"outline"} className="h-7 text-[10.5px]" aria-pressed={focus===key} onClick={()=>{setFocus(focus===key?"":key);setMode(view);}}>{label}</Button>)}</div>
   <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]"><p className="font-medium">{mode==="weather"?"District rainfall":chosenCrop} · {period} · {meta.unit}</p><span className="text-muted-foreground">{records.isFetching?"Loading observations…":noValue+" districts without "+(mode==="quality"?"current records":"a calculable value")}</span></div>
   {(records.error||climate.error&&mode==="weather")&&<p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Data could not be loaded. Unavailable values are not coloured as zero.</p>}
   {mode==="trend"&&chosenSeason!==baselineSeason&&<p role="note" className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">Season-to-season comparison. Seasonal conditions differ, so interpret these changes in that context.</p>}
   {chosenYear===baselineYear&&chosenSeason===baselineSeason&&<p role="note" className="rounded-lg bg-amber-50 p-3 text-[11px] text-amber-900">Choose two distinct reporting periods to compare a change.</p>}
   {mode==="weather"&&<p role="note" className="flex gap-2 rounded-lg bg-sky-50 p-3 text-[11px] leading-relaxed text-sky-900"><CloudRain className="h-4 w-4 shrink-0" aria-hidden />{noWeather?"No suitable district rainfall series is connected for this period. The map shows missing data.":"Rainfall is contextual evidence. It is not a crop-risk classification or a forecast."}</p>}
   <div className="relative overflow-hidden rounded-xl border border-border/80 bg-[#f4f8f5]">
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
     <Button size="icon" variant="outline" className="h-8 w-8 bg-white" aria-label="Zoom map in" disabled={zoom>=3} onClick={()=>setZoom(old=>Math.min(3,old+0.5))}><Plus className="h-3.5 w-3.5" /></Button>
     <Button size="icon" variant="outline" className="h-8 w-8 bg-white" aria-label="Zoom map out" disabled={zoom<=1} onClick={()=>{setZoom(old=>Math.max(1,old-0.5));setPan({x:0,y:0});}}><Minus className="h-3.5 w-3.5" /></Button>
     <Button size="icon" variant="outline" className="h-8 w-8 bg-white" aria-label="Reset map position" onClick={()=>{setZoom(1);setPan({x:0,y:0});}}><RotateCcw className="h-3.5 w-3.5" /></Button>
    </div>
    <svg viewBox="0 0 700 460" className={"block w-full touch-none "+(large?"h-[340px] md:h-[560px]":"h-[320px]")} style={{cursor:zoom>1?"grab":"default"}} aria-label={"Rwanda districts: "+meta.label+", "+chosenCrop+", "+period}
      onPointerDown={event=>{drag.current={x:event.clientX,y:event.clientY,pan,moved:false};}}
      onPointerMove={event=>{if(!drag.current||!event.buttons||zoom===1)return;const rect=event.currentTarget.getBoundingClientRect();const dx=(event.clientX-drag.current.x)*700/rect.width;const dy=(event.clientY-drag.current.y)*460/rect.height;if(Math.abs(dx)+Math.abs(dy)>4)drag.current.moved=true;setPan({x:Math.max(-300,Math.min(300,drag.current.pan.x+dx)),y:Math.max(-200,Math.min(200,drag.current.pan.y+dy))});}}
      onPointerLeave={()=>setHovered(null)}>
     <defs><pattern id={patternId} width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#f3f3ef" /><path d="M-2,2 L2,-2 M0,7 L7,0 M5,9 L9,5" stroke="#a4aaa5" strokeWidth="1" /></pattern></defs>
     <g transform={"translate("+pan.x+" "+pan.y+") translate(350 230) scale("+zoom+") translate(-350 -230)"}>
      {SHAPES.map(shape=>{const item=byName.get(shape.name);return <path key={shape.name} d={shape.path} fill={scale.color(item)??"url(#"+patternId+")"} fillRule="evenodd" stroke={selected===shape.name?"#112f23":"#fff"} strokeWidth={selected===shape.name?2.4:1} vectorEffect="non-scaling-stroke" tabIndex={0} role="button" aria-label={shape.name+": "+describe(item)} aria-pressed={selected===shape.name} className="transition-[fill] focus:outline-none focus:stroke-[#112f23] focus:stroke-[3px]"
       onPointerEnter={()=>setHovered(shape.name)} onFocus={()=>setHovered(shape.name)}
       onClick={()=>{if(!drag.current?.moved)selectDistrict(shape.name);drag.current=null;}}
       onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();selectDistrict(shape.name);}}}><title>{shape.name+" · "+describe(item)}</title></path>;})}
     </g>
     <g transform="translate(652 24)" fill="#627b6e"><text textAnchor="middle" fontSize="11" fontWeight="600">N</text><path d="M0 10 L-4 25 L0 21 L4 25 Z" /></g>
    </svg>
    <p className="pointer-events-none absolute bottom-3 left-3 max-w-[85%] rounded-lg border border-border/60 bg-white/95 px-3 py-2 text-[10.5px] text-muted-foreground" aria-live="polite">{hovered?<><strong className="text-foreground">{hovered}</strong>{" · "+describe(byName.get(hovered))}</>:"Click a district for details. Zoom and drag to explore."}</p>
   </div>
   <div aria-label="Map legend" className="flex flex-wrap gap-x-4 gap-y-2">{scale.legend.map(entry=><span key={entry.label} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="h-3 w-4 rounded-sm border border-black/10" style={{background:entry.color}} />{entry.label}</span>)}<span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="h-3 w-4 rounded-sm border border-gray-300" style={{background:"repeating-linear-gradient(135deg,#f3f3ef,#f3f3ef 3px,#a4aaa5 3px,#a4aaa5 4px)"}} />Missing / not calculable</span></div>
   {focus&&<section aria-label="Districts matching analyst focus" className="rounded-xl border border-border bg-muted/20 p-3"><h3 className="text-xs font-semibold">{focus==="declines"?"Districts with recorded production declines":focus==="yields"?"Districts with higher reported yields":"Districts needing data checks"}</h3><p className="mt-1 text-[10px] text-muted-foreground">{focus==="yields"?"Ranked within the selected crop and period.":focus==="declines"?period+" compared with "+baselinePeriod+".":"Availability in the imported records, not a measure of survey confidence."}</p>{candidates.length?<div className="mt-3 grid gap-2 sm:grid-cols-2">{candidates.slice(0,large?8:4).map(item=><button type="button" key={item.name} onClick={()=>selectDistrict(item.name)} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-[11px] hover:border-primary/40"><span className="font-medium">{item.name}</span><span className="num text-muted-foreground">{focus==="declines"?formatSignedPercent(item.changePct):focus==="yields"?valueLabel(item.yield,"t/ha",2):item.quality}</span></button>)}<p className="col-span-full text-[10px] text-muted-foreground">Showing {Math.min(candidates.length,large?8:4)} of {candidates.length} matching districts. All 30 remain selectable on the map.</p></div>:<p className="mt-3 text-[11px] text-muted-foreground">{focus==="gaps"?"No missing or incompatible cells were found for this selection.":"No matching calculable values for these periods."}</p>}</section>}
   <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[10px] leading-relaxed text-muted-foreground"><p>Boundaries: geoBoundaries / Open Data Rwanda · 2012 vintage · CC BY 4.0 · 30 matched districts</p><a href="https://www.geoboundaries.org/api/current/gbOpen/RWA/ADM2/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Boundary source<ExternalLink className="h-3 w-3" /></a></div>
   {mode==="trend"&&<p className="text-[10.5px] text-muted-foreground">Production change compares {period} with {baselinePeriod} for {chosenCrop}. {chosenSeason!==baselineSeason?"Different seasons can have different agricultural conditions. ":""}A zero or missing baseline has no percentage colour.</p>}
  </DashboardCard>
  <Sheet open={Boolean(selected)} onOpenChange={open=>{if(!open)setSelected(null);}}>
   <SheetContent overlayClassName="bg-black/25" className="w-full overflow-y-auto sm:max-w-[440px]">
    <SheetHeader className="text-left"><SheetTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" aria-hidden />{selected}</SheetTitle><SheetDescription>{chosenCrop} · {period}</SheetDescription></SheetHeader>
    {detail&&<div className="mt-6 space-y-5">
     <div className="grid grid-cols-2 gap-3">{[
      ["Production",valueLabel(detail.production,"t")],["Harvested area",valueLabel(detail.area,"ha")],["Yield",valueLabel(detail.yield,"t/ha",2)],["Production change",detail.changePct===null?"Not calculable":formatSignedPercent(detail.changePct)],
     ].map(([label,value])=><div key={label} className="rounded-xl border border-border bg-card p-3.5"><p className="text-[10.5px] text-muted-foreground">{label}</p><p className="num mt-2 text-lg font-semibold">{value}</p></div>)}</div>
     <p className="text-[11px] text-muted-foreground">Change compares {period} with {baselinePeriod}. Yield = compatible production ÷ positive harvested area.</p>
     {mode==="weather"&&<p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-900">Rainfall: {valueLabel(detail.rainfall,"mm")}. {detail.rainfall===null?"No suitable district series is connected.":"Context only; no risk model is applied."}</p>}
     <section className="rounded-xl border border-border bg-card p-4"><h3 className="text-xs font-semibold">Compare reporting periods</h3><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-[10.5px]"><thead><tr className="border-b border-border text-muted-foreground"><th className="py-2 font-medium">Measure</th><th className="p-2 font-medium">{baselinePeriod}</th><th className="p-2 font-medium">{period}</th></tr></thead><tbody>{[["Production (t)",detail.previous,detail.production,0],["Area (ha)",detail.previousArea,detail.area,0],["Yield (t/ha)",detail.previousYield,detail.yield,2]].map(([label,before,after,digits])=><tr key={label} className="border-b border-border/50"><th className="py-2 font-medium">{label}</th><td className="num p-2">{formatNumber(before,digits)}</td><td className="num p-2">{formatNumber(after,digits)}</td></tr>)}</tbody></table></div><p className="mt-3 text-[10.5px] text-muted-foreground">Harvested-area change: {detail.areaChangePct===null?"not calculable":formatSignedPercent(detail.areaChangePct)}. Yield change: {detail.yieldChangePct===null?"not calculable":formatSignedPercent(detail.yieldChangePct)}.</p></section>
     <section className="rounded-xl border border-border bg-card p-4"><MapSelect label="Compare another district" value={peer} onChange={setPeer} options={[{value:"",label:"Choose a district"},...asOptions(DISTRICT_NAMES.filter(name=>name!==selected))]} />{peerDetail&&<div className="mt-3 overflow-x-auto"><table className="w-full text-left text-[10.5px]"><thead><tr className="border-b border-border"><th className="py-2 font-medium">Same period</th><th className="p-2 font-medium">{selected}</th><th className="p-2 font-medium">{peer}</th></tr></thead><tbody>{[["Production (t)",detail.production,peerDetail.production,0],["Area (ha)",detail.area,peerDetail.area,0],["Yield (t/ha)",detail.yield,peerDetail.yield,2]].map(([label,a,b,digits])=><tr key={label}><th className="py-2 font-medium">{label}</th><td className="num p-2">{formatNumber(a,digits)}</td><td className="num p-2">{formatNumber(b,digits)}</td></tr>)}</tbody></table><p className="mt-2 text-[10px] text-muted-foreground">{chosenCrop} · {period} · {peerDetail.quality} records for {peer}.</p></div>}</section>
     <section className="rounded-xl bg-accent/40 p-4"><h3 className="text-xs font-semibold">What to check next</h3><ul className="mt-2 list-disc space-y-2 pl-4 text-[11px] leading-relaxed text-muted-foreground"><li>Compare production with harvested area and yield in both periods.</li><li>{detail.rainfall===null?"No suitable rainfall data is connected. A weather explanation cannot be assessed here.":"Compare the available district rainfall with the crop changes."}</li><li>Check coverage, source revisions and any missing-data warnings before making a recommendation.</li><li>These comparisons suggest questions for review. They do not establish a cause.</li></ul></section>
     <div className="rounded-xl border border-border bg-card p-4"><h3 className="text-xs font-semibold">Source & reporting context</h3>
      <p className="mt-2 text-[11px] text-muted-foreground">Reporting period: {period}</p>
      {activeSources.length?activeSources.map(source=><div key={source.id} className="mt-3 text-[11px] leading-relaxed"><a href={source.publication_url??source.source_url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{source.name}</a><p className="mt-1 text-muted-foreground">Published {formatDate(source.publication_date)} · retrieved {formatDate(source.retrieval_date)}</p></div>):<p className="mt-2 text-[11px] text-muted-foreground">No source for the selected map measure and period.</p>}
      {detail.records.map(row=><p key={row.id} className="mt-2 break-words text-[10px] text-muted-foreground">{row.indicator==="production"?"Production":"Area"}: {row.source_reference??row.dataset_name}</p>)}
      <p className="mt-3 text-[10.5px] text-muted-foreground">Data status: {detail.quality}. {detail.quality==="outdated"?"Latest available year: "+detail.lastYear+".":""}</p>
     </div>
     {detail.warnings.length?<div role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="flex items-center gap-2 text-xs font-semibold text-amber-900"><Info className="h-4 w-4" />Missing data & calculation limits</h3><ul className="mt-2 list-disc space-y-1.5 pl-4 text-[11px] leading-relaxed text-amber-900">{detail.warnings.map(warning=><li key={warning}>{warning}</li>)}</ul></div>:<p className="flex items-center gap-2 text-[11px] text-primary"><Check className="h-4 w-4" aria-hidden />Production and area are present for both comparable periods.</p>}
     {saved?<div role="status" className="rounded-xl bg-accent p-4 text-xs"><p className="font-semibold">{saved.kind==="ReportFinding"?(saved.alreadyExists?"Finding already in Reports":"Finding saved to Reports"):(saved.alreadyExists?"Investigation already recorded":"Investigation created")}</p><p className="mt-2">{saved.record.title}</p><p className="mt-2 break-all text-[10px] text-muted-foreground">Reference: {saved.record.id}</p><p className="mt-2 text-[11px] text-muted-foreground">{saved.kind==="ReportFinding"?"Your note and source evidence are available in Reports.":"Available in the Field operations investigation queue. Source evidence has been preserved."}</p>{saved.kind==="ReportFinding"&&<Link to="/reports" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">Open Reports<ArrowUpRight className="ml-1 h-3.5 w-3.5" aria-hidden /></Link>}</div>
      :<div className="grid gap-2"><Button className="w-full gap-2" disabled={!canReview||(mode==="weather"&&detail.rainfall===null)} onClick={()=>{setSaveKind("investigation");setReviewOpen(true);}}><ClipboardList className="h-4 w-4" aria-hidden />Investigate this district</Button><Button variant="outline" disabled={!canReview||(mode==="weather"&&detail.rainfall===null)} onClick={()=>{setSaveKind("report");setReviewOpen(true);}}>Save finding to Reports</Button></div>}
     {reviewOpen&&<form onSubmit={submitReview} className="space-y-3 rounded-xl border border-border bg-card p-4"><Label htmlFor={"review-reason-"+id} className="text-xs">{saveKind==="report"?"Finding and recommended next step":"What should the investigator check?"}</Label><Textarea id={"review-reason-"+id} value={reason} onChange={event=>setReason(event.target.value)} minLength={10} maxLength={2000} required className="min-h-24 text-xs" placeholder="Describe the question or missing evidence to review." /><p className="text-[10.5px] text-muted-foreground">The district, crop, period and source values will be saved from the database. This does not establish a cause or assign an officer.</p>{reviewError&&<p role="alert" className="text-xs text-destructive">{reviewError}</p>}<div className="flex gap-2"><Button size="sm" type="submit" disabled={saving}>{saving&&<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> }{saveKind==="report"?"Save finding":"Create investigation"}</Button><Button size="sm" type="button" variant="ghost" disabled={saving} onClick={()=>setReviewOpen(false)}>Cancel</Button></div></form>}
    </div>}
   </SheetContent>
  </Sheet>
 </>;
}
