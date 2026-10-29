import { useState } from 'react';
import { useMeteoCatalogue,useMeteoWeather } from '@/hooks/useWeather';
import { validateMeteoRange } from '@/lib/meteo-rwanda-provider';
import { weatherSeries } from '@/lib/weather-model';
import { weatherReportRecords } from '@/lib/weather-report';
import { downloadCsv,toCsv } from '@/lib/csv';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { RainfallChart,TemperatureChart } from './WeatherCharts';

export function WeatherSourceSelect({value,onChange}){
 return <label className="no-print block max-w-sm text-xs text-muted-foreground">Weather source<select aria-label="Weather source" className="mt-2 h-10 w-full rounded-lg border bg-background px-3" value={value} onChange={event=>onChange(event.target.value)}><option value="nasa">NASA POWER · gridded estimates</option><option value="meteo">Meteo Rwanda · authorized delivery</option></select></label>;
}
export function MeteoRwandaPanel({onSourceChange}){
 const catalogue=useMeteoCatalogue(),[stationId,setStationId]=useState(''),[start,setStart]=useState('2025-03-01'),[end,setEnd]=useState('2025-06-30'),[request,setRequest]=useState(null),[error,setError]=useState('');
 const stations=catalogue.data?.locations??[],station=stations.find(item=>item.id===stationId),query=useMeteoWeather(request,{enabled:Boolean(request)}),data=request?query.data:null;
 function apply(event){event.preventDefault();try{if(!station)throw new Error('Choose an authorized station or grid sample.');setRequest(validateMeteoRange({location:{district:station.district},stationId,start,end}));setError('');if(request?.stationId===stationId&&request.start===start&&request.end===end)query.refetch();}catch(error){setError(error.message);}}
 return <div className="space-y-5"><PageHeader eyebrow="Climate analysis" title="Weather & climate" description="Meteo Rwanda is an independent source. No NASA values are copied into this view."/><WeatherSourceSelect value="meteo" onChange={onSourceChange}/>
  <DashboardCard title="Meteo Rwanda access" subtitle="Official authorization and source-specific provenance are required">
   {catalogue.isFetching&&<p role="status" className="text-xs">Checking authorized delivery availability…</p>}
   {catalogue.error&&<p role="alert" className="text-xs text-destructive">{catalogue.error.message}</p>}
   <p className="text-sm font-semibold">Status: {catalogue.data?.status??(catalogue.error?'delivery unavailable':'checking')}</p>
   {catalogue.data?.status==='not-configured'&&<p className="mt-3 text-xs leading-relaxed text-muted-foreground">Awaiting authorized data access. Obtain an official data delivery and licence from Meteo Rwanda. An administrator can then configure the private METEO_RWANDA_DATA storage binding using WEATHER.md. No station connection or Meteo Rwanda measurements are active.</p>}
   <p className="mt-3 text-xs text-muted-foreground">Station observations and blended products retain their supplied classification. Samples are never silently averaged, merged with NASA, or treated as district totals. When sources differ, select and report each separately with its spatial support.</p>
   <a href="https://www.meteorwanda.gov.rw/" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-primary underline">Official Meteo Rwanda data-access authority</a><Button className="ml-3" size="sm" variant="outline" onClick={()=>catalogue.refetch()}>Check delivery status</Button>
  </DashboardCard>
  {stations.length>0&&<DashboardCard title="Authorized station or sample analysis" subtitle={`${catalogue.data.source.dataset} · ${catalogue.data.source.licence}`}>
   <form onSubmit={apply} className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs">Station / sample<select aria-label="Meteo station" className="mt-2 h-10 w-full rounded-lg border bg-background px-2" value={stationId} onChange={event=>setStationId(event.target.value)} required><option value="">Choose an identified sample</option>{stations.map(item=><option key={item.id} value={item.id}>{item.name} · {item.district} · {item.classification}</option>)}</select></label>{[['Meteo start date',start,setStart],['Meteo end date',end,setEnd]].map(([label,value,setter])=><label key={label} className="text-xs">{label}<input aria-label={label} className="mt-2 h-10 w-full rounded-lg border bg-background px-3" type="date" required value={value} onChange={event=>setter(event.target.value)}/></label>)}<Button type="submit" disabled={query.isFetching}>Load authorized records</Button></form>
   {station&&<p className="mt-3 text-xs text-muted-foreground">Delivery coverage {station.start} → {station.end} · {station.latitude}, {station.longitude} · {station.spatialResolution}. District attribution identifies the sample location; it does not establish district representativeness.</p>}
   {(error||query.error)&&<p role="alert" className="mt-3 text-xs text-destructive">{error||query.error.message}</p>}{query.isFetching&&<p role="status" className="mt-3 text-xs">Reading validated delivery…</p>}
  </DashboardCard>}
  {data&&<><DashboardCard title={`${data.location.name} · ${data.start} → ${data.end}`} subtitle={`${data.classification} · ${data.location.spatialResolution}`}>
   <div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Indicator</th><th className="p-2">Value</th><th className="p-2">Coverage</th></tr></thead><tbody>{weatherReportRecords(data).map(row=><tr key={row.parameter} className="border-t"><td className="p-2">{row.indicator}</td><td className="p-2">{row.value==null?'Unavailable':row.value.toLocaleString('en-GB',{maximumFractionDigits:2})} {row.unit}</td><td className="p-2">{row.valid_days}/{row.expected_days} days · {row.missing_days} missing</td></tr>)}</tbody></table></div>
   <p className="mt-3 text-xs text-muted-foreground">{data.spatialSupport} Delivered {data.cache.retrievedAt}. {data.sources[0].licence} · <a className="text-primary underline" href={data.sources[0].sourceUrl} target="_blank" rel="noreferrer">Official source</a>. These records are not automatically joined to NISR district statistics; station-to-district methodology must be established first.</p>
   <Button size="sm" className="mt-3" variant="outline" onClick={()=>{const records=weatherReportRecords(data);downloadCsv('hingasmart-meteo-weather-report.csv',toCsv(records));}}>Export Meteo climate report CSV</Button>
  </DashboardCard><div className="grid gap-5 xl:grid-cols-2"><DashboardCard title="Delivered precipitation" subtitle="Monthly totals in mm; incomplete intervals remain unavailable"><RainfallChart data={weatherSeries(data.rows,'month')}/></DashboardCard><DashboardCard title="Delivered temperatures" subtitle="Monthly mean and extremes · °C"><TemperatureChart data={weatherSeries(data.rows,'month')}/></DashboardCard></div>
   <DashboardCard title="Delivered daily records" subtitle="UTC · all requested days, including missing records"><div className="max-h-80 overflow-auto"><table className="w-full text-left text-xs"><thead><tr>{['Date','Rain mm/day','Mean °C','Min °C','Max °C','Quality'].map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{data.rows.map(row=><tr key={row.date} className="border-t">{[row.date,row.PRECTOTCORR??'Missing',row.T2M??'Missing',row.T2M_MIN??'Missing',row.T2M_MAX??'Missing',row.qualityFlags.join('; ')||'Valid delivered value'].map((value,index)=><td key={index} className="p-2">{value}</td>)}</tr>)}</tbody></table></div></DashboardCard></>}
 </div>;
}
