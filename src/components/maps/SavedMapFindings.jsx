import { useQuery } from "@tanstack/react-query";
import { base44, isLocalAuth } from "@/api/base44Client";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatDateTime, formatNumber, formatSignedPercent } from "@/lib/format";
import { Download, FileText } from "lucide-react";

import {normalizeFindingEvidence} from '@/lib/finding-evidence';

const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
const safeText=value=>/^[=+@\-\t\r]/.test(String(value??""))?"'"+value:value;
export function SavedMapFindings() {
 const {data:findings=[],isLoading,error}=useQuery({queryKey:["report-findings"],enabled:isLocalAuth,queryFn:async()=>(await base44.entities.ReportFinding.list({sort:"-created_date",limit:100})).items,staleTime:30_000});
 if(!isLocalAuth)return null;
 function exportFinding(item) {
  const metrics=parse(item.metric_snapshot)??{};
  const evidence=normalizeFindingEvidence(parse(item.calculation_snapshot))??{};
  downloadCsv("hingasmart-map-finding-"+item.district+"-"+item.year+".csv",toCsv([{
   district:item.district,crop:item.crop,current_period:item.period,baseline_period:item.previous_period,
   production_t:metrics.production,baseline_production_t:metrics.previous_production,harvested_area_ha:metrics.harvested_area,baseline_area_ha:metrics.previous_area,yield_t_ha:metrics.yield,baseline_yield_t_ha:metrics.previous_yield,production_change_pct:metrics.production_change_pct,
   analyst_finding:safeText(item.summary),requested_by:safeText(item.requested_by_name),recorded_at:item.created_date,
   source_references:[...(evidence.current??[]),...(evidence.previous??[])].map(row=>row.period+": "+row.source_reference).join(" | "),
   source_urls:[...new Set([...(evidence.current??[]),...(evidence.previous??[])].map(row=>row.source_url).filter(Boolean))].join(" | "),
   missing_data_warnings:(evidence.warnings??[]).join(" | "),method:evidence.method,weather_source_urls:[...new Set((evidence.weatherSources??[]).map(source=>source.sourceUrl))].join(" | "),weather_normal_period:evidence.scope?`${evidence.scope.baselineStart}–${evidence.scope.baselineEnd}`:"",rainfall_anomaly_pct:evidence.baseline?.rainfallAnomalyPct??null,temperature_anomaly_c:evidence.baseline?.temperatureAnomalyC??null,
  }]));
 }
 return <DashboardCard title="Saved analysis & map findings" subtitle="Analyst notes with the source evidence preserved at the time of saving">
  {isLoading?<p className="text-xs text-muted-foreground">Loading saved findings…</p>:error?<p role="alert" className="text-xs text-destructive">Saved findings could not be loaded.</p>:!findings.length?<div className="flex items-start gap-3 rounded-xl bg-muted/30 p-4"><FileText className="mt-0.5 h-5 w-5 text-primary" aria-hidden /><div><p className="text-xs font-medium">No findings saved yet</p><p className="mt-1 text-[11px] text-muted-foreground">Open a district on the map and choose “Save finding to Reports” to record a question, finding or recommended next step.</p></div></div>:<div className="space-y-4">{findings.map(item=>{
   const metrics=parse(item.metric_snapshot),evidence=normalizeFindingEvidence(parse(item.calculation_snapshot));
   return <article key={item.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-[11px] text-muted-foreground">{item.previous_period} → {item.period} · {formatDateTime(item.created_date)}</p></div><Button size="sm" variant="outline" className="no-print h-8 text-xs" onClick={()=>exportFinding(item)}><Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />Export finding</Button></div><p className="mt-3 whitespace-pre-wrap text-[12px] leading-relaxed">{item.summary}</p>{metrics?<p className="mt-3 text-[11px] text-muted-foreground">Production: {formatNumber(metrics.production)} t · Harvested area: {formatNumber(metrics.harvested_area)} ha · Yield: {formatNumber(metrics.yield,2)} t/ha · Production change: {formatSignedPercent(metrics.production_change_pct)}</p>:<p className="mt-3 text-xs text-amber-800">The metric snapshot is unavailable.</p>}
    <details className="mt-3 text-[11px] text-muted-foreground"><summary className="cursor-pointer font-medium text-primary">Sources and calculation limits</summary>{evidence?<div className="mt-2 space-y-2"><p>{evidence.method}</p>{evidence.scope&&<><p>Weather average: {evidence.scope.baselineStart}–{evidence.scope.baselineEnd} · {evidence.baseline?.completeRainfallYears??0} complete rainfall seasons. Rainfall anomaly: {evidence.baseline?.rainfallAnomalyPct==null?"Unavailable":formatSignedPercent(evidence.baseline.rainfallAnomalyPct)}.</p><Button size="sm" variant="outline" onClick={()=>{const url=URL.createObjectURL(new Blob([item.calculation_snapshot],{type:"application/json"})),link=document.createElement("a");link.href=url;link.download=item.id+"-evidence.json";link.click();URL.revokeObjectURL(url);}}>Download saved analysis evidence</Button></>}{[...(evidence.current??[]),...(evidence.previous??[])].map(row=><p key={row.id}>{row.period} · {row.source_reference}</p>)}{evidence.warnings?.map(warning=><p key={warning} className="text-amber-800">{warning}</p>)}<p>Recorded by {item.requested_by_name||item.requested_by}. Analyst interpretations require review and do not establish causation.</p></div>:<p className="mt-2 text-amber-800">The source snapshot is unavailable.</p>}</details>
   </article>;
  })}</div>}
 </DashboardCard>;
}
