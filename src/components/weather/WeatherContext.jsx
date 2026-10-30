import {useState} from 'react';
import {Link} from '@tanstack/react-router';
import {CloudRain,Thermometer,CheckCircle2,Info,Download,Printer,ArrowUpRight} from 'lucide-react';
import {useWeather} from '@/hooks/useWeather';
import {useObservations} from '@/hooks/useObservations';
import {seasonRange,validateWeatherRange,WEATHER_LOCATIONS} from '@/lib/weather-model';
import {climateAgricultureComparison} from '@/lib/weather-agriculture';
import {weatherReportRecords} from '@/lib/weather-report';
import {downloadCsv,toCsv} from '@/lib/csv';
import {CROPS,cropLabel} from '@/lib/constants';
import {DashboardCard} from '@/components/dashboard/DashboardCard';
import {Button} from '@/components/ui/button';
import {getStoredWorkspace} from '@/lib/rbac';
import {WeatherSpatialDetails,WeatherRetrievalErrors} from './WeatherSpatialDetails';
import {WeatherAnalysisPanel} from './WeatherAnalysisPanel';

const display=(value,unit='')=>!Number.isFinite(value)?'Unavailable':value.toLocaleString('en-GB',{maximumFractionDigits:2})+(unit?' '+unit:'');
const dateLabel=value=>new Date(value+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const retrievedLabel=value=>value?new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC':'Not available';
const control='mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground';
const CURRENT_YEAR=new Date().getUTCFullYear();
const SEASONS=['Season A','Season B','Season C'];
function periodDefaults(value){
 const match=String(value??'').match(/\b(19|20)\d{2}\b/);
 const parsedYear=match?Number(match[0]):null;
 const parsedSeason=String(value??'').match(/Season [ABC]/)?.[0]??null;
 return {
  year:Number.isInteger(parsedYear)&&parsedYear>=1982&&parsedYear<=CURRENT_YEAR?parsedYear:null,
  season:parsedSeason,
 };
}
function contextualDraft({district,year,season,crop,period}){
 const fromPeriod=periodDefaults(period);
 const validDistrict=WEATHER_LOCATIONS.some(item=>item.district===district)?district:WEATHER_LOCATIONS[0]?.district??'Gasabo';
 const numericYear=Number(year);
 return {
  district:validDistrict,
  year:String(fromPeriod.year??(Number.isInteger(numericYear)&&numericYear>=1982&&numericYear<=CURRENT_YEAR?numericYear:CURRENT_YEAR)),
  season:fromPeriod.season??(SEASONS.includes(season)?season:'Season B'),
  crop:CROPS.includes(crop)?crop:'Maize',
  periodComplete:Boolean(fromPeriod.year&&fromPeriod.season),
 };
}
function loadableSelection(draft){
 try{validateWeatherRange({location:{district:draft.district},...seasonRange(Number(draft.year),draft.season)});return true;}catch{return false;}
}

function SnapshotMetric({label,value,unit,note,icon:Icon}){
 return <div className="min-w-0 rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{Icon&&<Icon className="h-4 w-4 shrink-0" aria-hidden/>}<span>{label}</span></div><p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{display(value)}{Number.isFinite(value)&&<span className="ml-1.5 text-xs font-normal tracking-normal text-muted-foreground">{unit}</span>}</p><p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{note}</p></div>;
}
export function WeatherContext({district,year,season,crop='Maize',period='',autoLoad=false,report=false}){
 const initial=contextualDraft({district,year,season,crop,period});
 const [draft,setDraft]=useState(initial);
 const [selection,setSelection]=useState(()=>((autoLoad||initial.periodComplete)&&loadableSelection(initial)?{district:initial.district,year:initial.year,season:initial.season,crop:initial.crop}:null)),[error,setError]=useState('');
 const input=selection?{location:{district:selection.district},...seasonRange(Number(selection.year),selection.season)}:{location:{district:draft.district},...seasonRange(Number(draft.year),draft.season)};
 const query=useWeather(input,{enabled:Boolean(selection)}),weather=selection?query.data:null;
 const observations=useObservations({domain:'crop',district:selection?.district,crop:selection?.crop,year:selection?.year,season:selection?.season,enabled:Boolean(selection)});
 const alignment=selection?climateAgricultureComparison(weather,observations.data,{...selection,year:Number(selection.year)}):null;
 const records=weatherReportRecords(weather,selection??{},alignment);
 const change=(key,value)=>setDraft(old=>({...old,[key]:value}));
 const hasChanges=selection&&Object.keys(draft).some(key=>draft[key]!==selection[key]);
 function load(event){event.preventDefault();try{validateWeatherRange({location:{district:draft.district},...seasonRange(Number(draft.year),draft.season)});setSelection({...draft});setError('');if(selection&&Object.keys(draft).every(key=>draft[key]===selection[key]))query.refetch();}catch(error){setError(error.message);}}
 function exportReport(){downloadCsv(`agriwiser-climate-report-${selection.district}-${selection.year}-${selection.season.replace(' ','-')}.csv`,toCsv(records,[...new Set(records.flatMap(Object.keys))]));}
 const complete=weather?.summary.complete,cellCount=weather?.location.cells?.length;
 return <DashboardCard title={report?'Seasonal weather & crop report':'Weather & crop snapshot'} subtitle="See seasonal weather beside published crop figures for the same district.">
  <form className="no-print grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-5" onSubmit={load}>
   {[['district','District',WEATHER_LOCATIONS.map(item=>[item.district,item.district])],['season','Season',['Season A','Season B','Season C'].map(value=>[value,value])],['crop','Crop',CROPS.map(value=>[value,cropLabel(value)])]].map(([key,label,options])=><label key={key} className="min-w-0 text-xs text-muted-foreground">{label}<select aria-label={`Context ${key}`} className={control} value={draft[key]} onChange={event=>change(key,event.target.value)}>{options.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>)}
   <label className="text-xs text-muted-foreground">Year<input aria-label="Context year" required type="number" min="1982" max="2100" value={draft.year} onChange={event=>change('year',event.target.value)} className={control}/></label>
   <Button disabled={query.isFetching} type="submit">{query.isFetching?'Loading snapshot…':'Show snapshot'}</Button>
  </form>
  {error&&<p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
  {selection&&query.error&&<p role="alert" className="mt-3 text-xs text-destructive">{query.error.message} Use Show snapshot to retry.</p>}
  {!selection&&<div className="mt-5 rounded-xl bg-muted/40 p-5"><p className="text-sm font-medium">Start with a district and season</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Choose the crop and year, then select Show snapshot to see rainfall, temperature, production and yield together.</p></div>}
  {hasChanges&&<p role="status" className="no-print mt-3 text-xs text-amber-900">Your filters have changed. Select Show snapshot to update the results below.</p>}
  {weather&&<div className="mt-6 space-y-5" aria-label="Climate context results">
   <div className="flex flex-wrap items-start justify-between gap-3 border-t pt-5"><div><h3 className="text-lg font-semibold tracking-tight">{selection.district} · {cropLabel(selection.crop)}</h3><p className="mt-1 text-xs text-muted-foreground">{selection.season}, {selection.year} <span aria-hidden>·</span> {dateLabel(weather.start)} – {dateLabel(weather.end)}</p></div><span className="rounded-full border bg-muted/30 px-3 py-1 text-[11px] text-muted-foreground">Seasonal snapshot</span></div>
   <section aria-label="Seasonal weather" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Seasonal weather</h4><span className="rounded-full bg-accent px-2.5 py-1 text-[10px] text-muted-foreground">NASA POWER · estimated</span></div>
    <div className="grid gap-3 sm:grid-cols-2"><SnapshotMetric label="Total rainfall" value={weather.summary.rainfall} unit="mm" note="Estimated rainfall over the whole season" icon={CloudRain}/><SnapshotMetric label="Average temperature" value={weather.summary.temperature} unit="°C" note="Average of available daily temperature estimates" icon={Thermometer}/></div>
    <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-lg bg-muted/30 px-4 py-3 text-xs"><p><span className="text-muted-foreground">Lowest daily minimum </span><strong className="font-semibold">{display(weather.summary.minimum,'°C')}</strong></p><p><span className="text-muted-foreground">Highest daily maximum </span><strong className="font-semibold">{display(weather.summary.maximum,'°C')}</strong></p><p className="w-full text-[11px] text-muted-foreground">Temperatures describe district estimates. Daily limits are averaged across the district’s weather cells.</p></div>
    <div className="flex items-start gap-2 text-xs text-muted-foreground">{complete?<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden/>:<Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden/>}<div><p className="font-medium text-foreground">{complete?`All ${weather.summary.expectedDays} days available for all four weather measures`:'Some weather data is missing'}</p>{!complete&&<p className="mt-1">Rainfall: {weather.summary.validDays.PRECTOTCORR}/{weather.summary.expectedDays} days · average temperature: {weather.summary.validDays.T2M}/{weather.summary.expectedDays} days. A seasonal rainfall total requires every day.</p>}<p className="mt-1">{cellCount===1?`One weather grid cell covers ${selection.district}.`:cellCount?`The district estimate combines ${cellCount} weather grid cells.`:'Weather is estimated from a model grid.'} Local conditions can vary.</p><p className="mt-1 text-[11px]">Day counts describe available data, not how accurate the estimates are.</p></div></div>
    <WeatherRetrievalErrors errors={weather.errors}/>
    {weather.cache.status==='stale'&&<p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">The latest refresh failed. These saved weather estimates were retrieved {retrievedLabel(weather.cache.retrievedAt)}.</p>}
   </section>
   <section aria-label="Published crop figures" className="space-y-3 border-t pt-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">{cropLabel(selection.crop)} production & yield</h4><span className="rounded-full border px-2.5 py-1 text-[10px] text-muted-foreground">NISR · published statistics</span></div>
    {observations.isLoading?<p role="status" className="text-xs text-muted-foreground">Loading matching crop figures…</p>:observations.error?<p role="alert" className="text-xs text-destructive">Crop figures could not be loaded. Weather estimates are shown above.</p>:alignment?.compatible?<div className="grid gap-3 sm:grid-cols-3"><SnapshotMetric label="Crop production" value={alignment.production} unit="tonnes" note="Published amount of crop produced"/><SnapshotMetric label="Harvested area" value={alignment.area} unit="hectares" note="Published area harvested for this crop"/><SnapshotMetric label="Yield per hectare" value={alignment.yield} unit="t/ha" note="Calculated as production ÷ harvested area"/></div>:<div className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground"><p className="font-medium text-foreground">Matching crop figures are unavailable</p><p className="mt-1">The crop figures need to match this district, crop and complete season.</p><details className="mt-2"><summary className="cursor-pointer text-primary">Why a comparison is unavailable</summary><ul className="mt-2 list-disc space-y-1 pl-4">{alignment?.errors.map(message=><li key={message}>{message}</li>)}</ul></details></div>}
   </section>
   <div className="rounded-xl border border-primary/15 bg-accent/30 p-4 text-xs leading-relaxed"><p className="font-medium">How to read this snapshot</p><p className="mt-1 text-muted-foreground">{alignment?.compatible?'These figures describe the same district and season. They do not show that weather caused a change in yield.':'Weather estimates are seasonal context; crop comparisons require matching published records.'} Compare with past seasons to assess whether rainfall or temperature was unusual.</p></div>
   <WeatherAnalysisPanel key={JSON.stringify(selection)} selection={selection}/>
   <details className="rounded-xl border p-4 text-xs"><summary className="cursor-pointer font-medium text-primary">Snapshot sources & calculations</summary><div className="mt-4 space-y-4"><WeatherSpatialDetails weather={weather}/><p className="text-muted-foreground">NASA POWER · MERRA-2 · retrieved {retrievedLabel(weather.cache.retrievedAt)} · {weather.cache.status}.</p>{weather.sources.map(source=><a key={source.sourceUrl} href={source.sourceUrl} target="_blank" rel="noreferrer" className="block text-primary underline">{source.provider} weather request</a>)}{alignment?.compatible&&alignment.sourceRecords.map(row=><p className="text-muted-foreground" key={row.id}>{row.source_reference} · <a href={row.source_url} target="_blank" rel="noreferrer" className="text-primary underline">NISR source</a></p>)}</div></details>
   <div className="no-print flex flex-wrap gap-2 border-t pt-4"><Button size="sm" asChild><Link to="/weather" search={{district:selection.district,year:Number(selection.year),season:selection.season,dataset:'merra2',...(getStoredWorkspace()?{panel:getStoredWorkspace()}:{})}}>Compare with past seasons<ArrowUpRight className="ml-2 h-3.5 w-3.5" aria-hidden/></Link></Button><Button size="sm" variant="outline" disabled={!records.length} onClick={exportReport}><Download className="mr-2 h-3.5 w-3.5" aria-hidden/>Download report (CSV)</Button><Button size="sm" variant="ghost" onClick={()=>window.print()}><Printer className="mr-2 h-3.5 w-3.5" aria-hidden/>Print / save PDF</Button></div>
  </div>}
 </DashboardCard>;
}
