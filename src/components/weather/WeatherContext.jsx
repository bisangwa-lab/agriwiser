import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useWeather } from '@/hooks/useWeather';
import { useObservations } from '@/hooks/useObservations';
import { seasonRange,validateWeatherRange,WEATHER_LOCATIONS } from '@/lib/weather-model';
import { climateAgricultureComparison } from '@/lib/weather-agriculture';
import { weatherReportRecords } from '@/lib/weather-report';
import { downloadCsv,toCsv } from '@/lib/csv';
import { CROPS,cropLabel } from '@/lib/constants';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Button } from '@/components/ui/button';

const display=(value,unit='')=>value==null?'Unavailable':value.toLocaleString('en-GB',{maximumFractionDigits:2})+' '+unit;
export function WeatherContext({district='Gasabo',year=2025,season='Season B',crop='Maize',report=false}){
 const [draft,setDraft]=useState({district:WEATHER_LOCATIONS.some(item=>item.district===district)?district:'Gasabo',year:String(year),season,crop:CROPS.includes(crop)?crop:'Maize'});
 const [selection,setSelection]=useState(null),[error,setError]=useState('');
 const input=selection?{location:{district:selection.district},...seasonRange(Number(selection.year),selection.season)}:{location:{district:'Gasabo'},...seasonRange(2025,'Season B')};
 const query=useWeather(input,{enabled:Boolean(selection)}),weather=selection?query.data:null;
 const observations=useObservations({domain:'crop',district:selection?.district,crop:selection?.crop,year:selection?.year,season:selection?.season,enabled:Boolean(selection)});
 const alignment=selection?climateAgricultureComparison(weather,observations.data,{...selection,year:Number(selection.year)}):null;
 const records=weatherReportRecords(weather,selection??{},alignment);
 const change=(key,value)=>setDraft(old=>({...old,[key]:value}));
 function load(event){event.preventDefault();try{validateWeatherRange({location:{district:draft.district},...seasonRange(Number(draft.year),draft.season)});setSelection({...draft});setError('');if(selection&&Object.keys(draft).every(key=>draft[key]===selection[key]))query.refetch();}catch(error){setError(error.message);}}
 return <DashboardCard title={report?'Historical weather report':'Climate context for agricultural analysis'} subtitle="NASA POWER estimates and published NISR records remain separately attributed.">
  <form className="no-print grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-5" onSubmit={load}>
   {[['district','Context district',WEATHER_LOCATIONS.map(item=>[item.district,item.district])],['season','Context season',['Season A','Season B','Season C'].map(value=>[value,value])],['crop','Context crop',CROPS.map(value=>[value,cropLabel(value)])]].map(([key,label,options])=><label key={key} className="min-w-0 text-xs text-muted-foreground">{label}<select aria-label={label} className="mt-2 h-10 w-full rounded-lg border bg-background px-2" value={draft[key]} onChange={event=>change(key,event.target.value)}>{options.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>)}
   <label className="text-xs text-muted-foreground">Context year<input aria-label="Context year" required type="number" min="1982" max="2100" value={draft.year} onChange={event=>change('year',event.target.value)} className="mt-2 h-10 w-full rounded-lg border bg-background px-3"/></label>
   <Button disabled={query.isFetching} type="submit">{query.isFetching?'Loading climate context…':'Load climate context'}</Button>
  </form>
  {error&&<p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
  {selection&&query.error&&<p role="alert" className="mt-3 text-xs text-destructive">{query.error.message} Use Load climate context to retry.</p>}
  {!selection&&<p className="mt-3 text-xs text-muted-foreground">Choose a district and completed season to inspect climate alongside production, harvested area and yield. No national weather value is inferred from one point.</p>}
  {weather&&<div className="mt-4 space-y-4" aria-label="Climate context results">
   <p className="text-sm font-semibold">{selection.district} · {selection.year} {selection.season} · {weather.start} → {weather.end}</p>
   <div className="grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">{[['Precipitation','rainfall','mm','PRECTOTCORR'],['Mean temperature','temperature','°C','T2M'],['Minimum temperature','minimum','°C','T2M_MIN'],['Maximum temperature','maximum','°C','T2M_MAX']].map(([label,key,unit,code])=><div key={key} className="rounded-xl bg-muted/40 p-3"><p className="text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold">{display(weather.summary[key],unit)}</p><p className="mt-1 text-[10px] text-muted-foreground">{weather.summary.validDays[code]}/{weather.summary.expectedDays} valid days</p></div>)}</div>
   <p className="text-[11px] text-muted-foreground">NASA POWER · MERRA-2 · {weather.classification} · sampled cell {weather.location.grid.latitude}, {weather.location.grid.longitude} · {weather.location.grid.resolution}. Representative point {weather.location.latitude}, {weather.location.longitude}; these are shared grid-cell samples, not district averages. Cache: {weather.cache.status}; retrieved {weather.cache.retrievedAt}.</p>
   {weather.cache.status==='stale'&&<p role="alert" className="text-xs text-amber-900">Refresh failed: this report uses explicitly stale cached data.</p>}
   {!weather.summary.complete&&<p className="text-xs text-amber-900">Partial parameter coverage. Missing days remain missing; incomplete rainfall has no seasonal total.</p>}
   {observations.isLoading?<p role="status" className="text-xs">Checking agricultural compatibility…</p>:observations.error?<p role="alert" className="text-xs text-destructive">NISR records could not be loaded; no agricultural association is reported.</p>:alignment?.compatible?<p className="text-sm">Published NISR {selection.crop}: production {display(alignment.production,'t')} · harvested area {display(alignment.area,'ha')} · derived yield {display(alignment.yield,'t/ha')}.</p>:<p className="text-xs text-muted-foreground">Agricultural alignment unavailable: {alignment?.errors.join(' ')}</p>}
   <p className="text-xs leading-relaxed text-muted-foreground">{alignment?.limitation} Check coverage and harvested-area changes, then seek local evidence before attributing a production change to weather. No planting recommendation, forecast or disaster declaration is generated.</p>
   <details className="text-xs"><summary className="cursor-pointer text-primary">Report provenance & methods</summary><ul className="mt-2 space-y-2">{records.map((row,index)=><li key={index}>{row.provider} · {row.indicator} · {row.unit} · {row.method} · {row.source_references??row.quality_notes??'No additional flags'} · {row.start_utc} → {row.end_utc}</li>)}</ul>{weather.sources.map(source=><a key={source.sourceUrl} href={source.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block text-primary underline">NASA POWER original request</a>)}{alignment?.compatible&&alignment.sourceRecords.map(row=><p className="mt-2" key={row.id}>{row.source_reference} · <a href={row.source_url} target="_blank" rel="noreferrer" className="text-primary underline">NISR source</a></p>)}</details>
   <div className="no-print flex flex-wrap gap-3"><Button size="sm" variant="outline" onClick={()=>downloadCsv(`hingasmart-climate-report-${selection.district}-${selection.year}-${selection.season.replace(' ','-')}.csv`,toCsv(records,[...new Set(records.flatMap(Object.keys))]))}>Export climate report CSV</Button><Button size="sm" variant="outline" onClick={()=>window.print()}>Print climate report / PDF</Button><Button size="sm" variant="ghost" asChild><Link to="/weather" search={{district:selection.district,year:Number(selection.year),season:selection.season}}>Investigate weather & anomalies</Link></Button></div>
  </div>}
 </DashboardCard>;
}
