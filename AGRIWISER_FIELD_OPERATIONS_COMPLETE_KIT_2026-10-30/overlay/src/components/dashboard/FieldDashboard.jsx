/**
 * Repository-specific UI candidate for `src/components/dashboard/FieldDashboard.jsx`.
 * DO NOT paste blindly: compare current repo and implement secure local backend writes.
 * Counts are labeled as LOADED, not system totals, until backend aggregates exist.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ClipboardList, CloudRain, ClockAlert, Clock3, FileSearch, MapPin, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { WeatherContext } from '@/components/weather/WeatherContext';
import { NewInvestigationDialog } from '@/components/investigations/NewInvestigationDialog';
import { useAlerts, useAllFollowUps, useInvestigations } from '@/hooks/useAgriRecords';
import { useAuth } from '@/lib/AuthContext';
import { usesAppData } from '@/api/appClient';
import { summaryFromLoaded, selectTopFindings, todayInKigali, buildInvestigationDraftFromAlert, potentialTruncation, displayMetric } from '@/lib/field-ops-model';

const cardDefs = [
 { key:'signals',label:'Review signals',hint:'Published changes that need a human check',icon:AlertTriangle },
 { key:'assigned',label:'Assigned to me',hint:'Open cases assigned to your account',icon:ClipboardList },
 { key:'evidence',label:'Awaiting evidence',hint:'Investigations still needing evidence',icon:FileSearch },
 { key:'overdue',label:'Overdue actions',hint:'Outstanding tasks past their due date',icon:ClockAlert },
 { key:'dueSoon',label:'Due within 7 days',hint:'Open actions with upcoming deadlines',icon:Clock3 },
];
const shortText = text => String(text ?? '').trim() || 'Not recorded';
function Section({title,caption,action,children}) {
 return <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{caption}</p></div>{action}</div>
   {children}
 </section>;
}
function Empty({message}) {return <p className="rounded-lg bg-muted/30 p-5 text-xs text-muted-foreground">{message}</p>}
function SignalRow({alert,onStart,canStart}){
 const current=alert.observed_value;
 const baseline=alert.previous_value;
 return <article className="rounded-xl border p-4 space-y-3" aria-label={shortText(alert.title)}>
  <div className="flex flex-wrap items-start justify-between gap-2">
   <div className="space-y-1"><p className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full border px-2 py-0.5 font-medium">{alert.severity === 'priority' ? 'Priority review' : 'Review signal'}</span><span className="text-muted-foreground">{shortText(alert.district)} · {shortText(alert.crop)}</span></p><h3 className="text-sm font-semibold">{shortText(alert.title)}</h3></div>
   {alert.investigation_id ? <Button asChild size="sm" variant="outline"><Link to="/investigations/$investigationId" params={{investigationId:alert.investigation_id}}>Open case</Link></Button> : <Button size="sm" onClick={()=>onStart(alert)} disabled={!canStart}>Start investigation</Button>}
  </div>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs"><p><span className="block text-muted-foreground">Current</span><strong>{displayMetric(current,alert.unit)}</strong><span className="block text-muted-foreground">{shortText(alert.period)}</span></p><p><span className="block text-muted-foreground">Baseline</span><strong>{displayMetric(baseline,alert.unit)}</strong><span className="block text-muted-foreground">{shortText(alert.previous_period)}</span></p><p><span className="block text-muted-foreground">Change</span><strong>{displayMetric(alert.absolute_change,alert.unit)}</strong></p><p><span className="block text-muted-foreground">Rule</span><strong>{shortText(alert.rule_id)} v{alert.rule_version ?? '?'}</strong></p></div>
  <details className="text-xs"><summary className="cursor-pointer font-medium text-primary">Source, rule and quality details</summary><div className="mt-2 space-y-1 text-muted-foreground"><p>Dataset: {shortText(alert.dataset_name)}</p><p>Quality: {shortText(alert.quality_status)} · flags: {Array.isArray(alert.quality_flags)&&alert.quality_flags.length?alert.quality_flags.join('; '):'Not recorded'}</p><p>Threshold: {displayMetric(alert.rule_threshold_pct,'%')} · relative change: {displayMetric(alert.percentage_change,'%')}</p><p>{shortText(alert.explanation)}</p><p>This is a review signal, not a confirmed field incident or explanation of cause.</p></div></details>
 </article>;
}
export default function FieldDashboard(){
 const {user}=useAuth(); const navigate=useNavigate();const queryClient=useQueryClient();
 const cases=useInvestigations();const actions=useAllFollowUps();const alerts=useAlerts();
 const [view,setView]=useState('signals');const [showWeather,setShowWeather]=useState(false);
 const [createOpen,setCreateOpen]=useState(false);const [draft,setDraft]=useState(null);const [selectedAlert,setSelectedAlert]=useState(null);
 const items=cases.data??[];const tasks=actions.data??[];const signals=alerts.data??[];
 const summary=useMemo(()=>summaryFromLoaded({investigations:items,actions:tasks,alerts:signals,userEmail:user?.email,dateISO:todayInKigali()}),[items,tasks,signals,user?.email]);
 const isLoading=cases.isLoading||actions.isLoading||alerts.isLoading;
 const hasError=cases.isError||actions.isError||alerts.isError;
 const notComplete=potentialTruncation({investigations:items,actions:tasks,alerts:signals});
 const candidates=selectTopFindings(signals,6);
 const queue=view==='assigned'?summary.mine:view==='evidence'?summary.evidenceNeeded:summary.openCases;
 const activeTasks=view==='overdue'?summary.overdue:summary.dueSoon;
 function begin(alert){setSelectedAlert(alert);setDraft(buildInvestigationDraftFromAlert(alert));setCreateOpen(true);}
 return <div className="space-y-5">
  <PageHeader eyebrow="Field Operations · agricultural intelligence" title="What needs attention?" description="Review verified source information, carry out assigned investigations, and record the next step." actions={<Button asChild size="sm"><Link to="/investigations"><ClipboardList className="mr-2 h-4 w-4"/>Open investigations</Link></Button>}/>
  {isLoading && <p role="status" className="rounded-lg bg-muted p-3 text-xs">Loading authorised field records…</p>}
  {hasError && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-xs">Some records could not be loaded. Counts below must not be treated as complete. Check the connection and try again.</p>}
  {notComplete && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">Record lists may be truncated by current API limits. These are loaded-record counts, not verified system totals. Replace with server aggregates and pagination.</p>}
  {usesAppData && <p role="status" className="rounded-lg border p-3 text-xs text-muted-foreground">Local mode currently supports reading these records; writing investigations and follow-ups requires the authenticated backend implementation from this kit.</p>}
  <section aria-label="Actionable workload based on loaded records" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
   {cardDefs.map(x=>{let Icon=x.icon;const active=x.key===view;const value=hasError||isLoading?'—':summary.counts[x.key];return <button key={x.key} type="button" aria-pressed={active} onClick={()=>setView(x.key)} className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active?'border-primary bg-accent/50':'bg-card hover:bg-muted/30'}`}>
     <div className="flex items-start justify-between gap-2 text-[11px] text-muted-foreground"><span>{x.label}</span><Icon className="h-4 w-4 shrink-0" aria-hidden/></div><p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{x.hint}</p>
    </button>})}
  </section>
  <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
   <div className="space-y-5">
    <Section title="Published changes to review" caption="Year-on-year rule signals from available agricultural records. They are not confirmed incidents." action={<span className="text-xs text-muted-foreground">{hasError?'Unknown':summary.reviewSignals.length} loaded active signals</span>}>
      {alerts.isLoading?<Empty message="Loading source-linked findings…"/>:alerts.isError?<Empty message="Findings unavailable. Do not interpret this as zero signals."/>:candidates.length===0?<Empty message="No active review signals are present in the loaded results. This does not guarantee none exist in other reporting periods."/>:<div className="space-y-3">{candidates.map(a=><SignalRow key={a.id} alert={a} onStart={begin} canStart={!usesAppData}/>)}</div>}
    </Section>
    <Section title="Investigation queue" caption="Cases tied to your account and currently visible to your role." action={<Button size="sm" asChild variant="outline"><Link to="/investigations">View all cases</Link></Button>}>
      {cases.isLoading?<Empty message="Loading cases…"/>:cases.isError?<Empty message="Cases unavailable. Check your permissions or connection."/>:queue.length===0?<Empty message="No matching investigations in the loaded records."/>:<div className="space-y-2">{queue.slice(0,8).map(x=><Link to="/investigations/$investigationId" params={{investigationId:x.id}} key={x.id} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-xs hover:bg-muted/30"><span><strong className="block text-sm">{shortText(x.title)}</strong><span className="text-muted-foreground">{shortText(x.district)} · {shortText(x.crop)} · {shortText(x.period)}</span></span><span className="shrink-0 text-muted-foreground">{shortText(x.status)}</span></Link>)}</div>}
    </Section>
   </div>
   <div className="space-y-5">
    <Section title="Action deadlines" caption="Follow-up tasks belonging to visible cases. Click 'Overdue' or 'Due soon' above to filter.">
      {actions.isError?<Empty message="Follow-up actions unavailable."/>:activeTasks.length===0?<Empty message="No actions match this time window in the loaded records."/>:<ul className="space-y-2">{activeTasks.slice(0,7).map(a=><li className="rounded-lg border p-3 text-xs" key={a.id}><strong className="block">{shortText(a.title)}</strong><p className="text-muted-foreground">{shortText(a.owner)} · due {shortText(a.due_date)}</p></li>)}</ul>}
    </Section>
    <Section title="Before a field visit" caption="Check the source, period and original question first.">
     <ol className="space-y-2 text-xs text-muted-foreground"><li>1. Read the original NISR table and indicator definition.</li><li>2. Verify district, crop, year, season and survey release.</li><li>3. Check whether missing values were incorrectly treated as zero.</li><li>4. Record what was observed, by whom and when.</li><li>5. Submit findings for authorized review.</li></ol>
    </Section>
    <Section title="Published statistics and climate" caption="Weather estimates provide context; they do not establish why production changed." action={<Button size="sm" variant="outline" onClick={()=>setShowWeather(x=>!x)}><CloudRain className="mr-1 h-3.5 w-3.5"/>{showWeather?'Hide snapshot':'Open snapshot'}</Button>}>
      {showWeather?<WeatherContext/>:<Empty message="Select 'Open snapshot' to choose a district, crop and agricultural season and inspect compatible sources."/>}
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5"/>Rainfall and temperature are estimated from weather model grids, not measured at each farm.</p>
    </Section>
    <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0"/>Never convert a source anomaly directly into a confirmed field event. Published statistics, weather estimates and field observations have distinct evidence classes.</p>
   </div>
  </div>
  <NewInvestigationDialog open={createOpen} onOpenChange={setCreateOpen} initialValues={draft} alertId={selectedAlert?.id} onCreated={async created=>{await Promise.all([queryClient.invalidateQueries({queryKey:['investigations']}),queryClient.invalidateQueries({queryKey:['alerts']})]); if(created?.id)navigate({to:'/investigations/$investigationId',params:{investigationId:created.id}});}}/>
 </div>;
}
