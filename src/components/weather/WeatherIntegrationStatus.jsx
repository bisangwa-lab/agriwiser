import { CloudSun, Database, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useWeatherStatus } from '@/hooks/useWeather';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { ToneTag } from '@/components/common/ToneTag';
import { Button } from '@/components/ui/button';

const date = value => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC'
  : 'Not recorded';
const number = value => value.toLocaleString('en-GB');
const STATUSES = {
  'verified-cache': { label: 'Verified cache', tone: 'primary' },
  'last-attempt-failed': { label: 'Last attempt failed', tone: 'danger' },
  'not-yet-retrieved': { label: 'Not yet retrieved', tone: 'neutral' },
  'not-configured': { label: 'Not configured', tone: 'neutral' },
  'delivery-error': { label: 'Delivery error', tone: 'danger' },
  'authorized-delivery': { label: 'Authorized delivery', tone: 'primary' },
};

function StatusBadge({ status }) {
  const display = STATUSES[status] ?? { label: status ?? 'Unknown', tone: 'neutral' };
  return <ToneTag tone={display.tone}>{display.label}</ToneTag>;
}

function MissingMetric({ label, missing, days }) {
  const assessed = days > 0 && Number.isFinite(missing);
  return <div className="flex items-start justify-between gap-3 py-2.5">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-right tabular-nums">
      <span className="font-semibold">{assessed ? (100 * missing / days).toFixed(2) + '% missing' : 'Not assessed'}</span>
      {assessed && <span className="mt-0.5 block text-[11px] text-muted-foreground">{number(missing)} / {number(days)} cell-days</span>}
    </dd>
  </div>;
}

function ProviderStatus({ label, model, report, inventoryAvailable }) {
  if (!report) return <div className="rounded-xl border p-4"><h3 className="font-semibold">{label}</h3><p className="mt-2 text-muted-foreground">Status unavailable.</p></div>;
  const quality = report.quality;
  const years = report.years ?? [];
  return <article className="min-w-0 rounded-xl border bg-card">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
      <div><h3 className="text-sm font-semibold">{label}</h3><p className="mt-1 text-xs text-muted-foreground">{model} · Model-estimated</p></div>
      <StatusBadge status={report.status} />
    </div>
    <div className="space-y-4 p-4">
      <dl><dt className="text-[11px] text-muted-foreground">Last successful retrieval</dt><dd className="mt-1 font-medium tabular-nums">{date(report.lastSuccessfulRetrieval)}</dd></dl>
      {inventoryAvailable ? <>
        <dl className="grid grid-cols-3 divide-x rounded-lg border bg-muted/25 py-3 text-center">
          <div><dt className="text-[10px] text-muted-foreground">Grid cells</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{number(report.gridCells)}</dd></div>
          <div><dt className="text-[10px] text-muted-foreground">Cell-year entries</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{number(report.entries)}</dd></div>
          <div><dt className="text-[10px] text-muted-foreground">Expired</dt><dd className={'mt-1 text-lg font-semibold tabular-nums ' + (report.staleEntries ? 'text-amber-800' : '')}>{number(report.staleEntries)}</dd></div>
        </dl>
        <details className="rounded-lg border px-3 py-2.5">
          <summary className="cursor-pointer font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Calendar years cached <span className="text-muted-foreground">({years.length})</span></summary>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Cached calendar years">{years.length ? years.map(year => <span key={year} className="rounded border bg-muted/40 px-2 py-1 tabular-nums">{year}</span>) : <p className="text-muted-foreground">No calendar years cached.</p>}</div>
          <p className="mt-2 text-[11px] text-muted-foreground">A listed year may have partial coverage and may not be cached for every cell.</p>
        </details>
      </> : <p className="rounded-lg border bg-muted/25 p-3 text-muted-foreground">Full cache inventory is unavailable with edge cache storage.</p>}
      <div><h4 className="font-semibold">Missing data in cached coverage</h4><dl className="mt-1 divide-y">
        <MissingMetric label="Precipitation" missing={quality?.rainfall_missing} days={quality?.days} />
        <MissingMetric label="Mean temperature" missing={quality?.temperature_missing} days={quality?.days} />
      </dl></div>
      {report.source && <p className="border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">{report.source.dataset} · {report.source.spatialResolution} · {report.source.temporalResolution} / {report.source.timeStandard} · {report.source.classification}.</p>}
    </div>
  </article>;
}

function MeteoStatus({ report }) {
  if (!report) return null;
  return <article className="rounded-xl border bg-muted/15 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">Meteo Rwanda</h3><StatusBadge status={report.status} /></div>
    <p className="mt-3 leading-relaxed text-muted-foreground">{report.message ?? report.locations.length + ' authorized station/grid samples. Each retains its classification and coverage.'}</p>
    {report.locations.map(item => <p className="mt-2" key={item.id}>{item.name} · {item.classification} · {item.start} → {item.end}</p>)}
    <p className="mt-3 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">WEATHER.md defines the approved-delivery contract. Credentials and authorization references remain private.</p>
  </article>;
}

export function WeatherIntegrationStatus() {
  const query = useWeatherStatus(), data = query.data;
  const events = data?.events ?? data?.nasa?.events ?? [];
  return <DashboardCard title="Weather integration operations" subtitle="Administrator view · provider identity, cached coverage, quality and recent outcomes" action={
    <Button size="sm" variant="outline" className="gap-2" disabled={query.isFetching} onClick={() => query.refetch()}>
      <RefreshCw className={'h-3.5 w-3.5 ' + (query.isFetching ? 'animate-spin' : '')} aria-hidden />
      {query.isFetching ? 'Refreshing…' : 'Refresh integration status'}
    </Button>
  }>
    {query.isFetching && <p role="status" className="mb-4 text-xs text-muted-foreground">Reading integration metadata…</p>}
    {query.error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{data ? 'Status refresh failed. Showing the last checked snapshot. ' : ''}{query.error.message}</p>}
    {data && <div className="space-y-5 text-xs">
      <div className="flex items-start gap-2 rounded-lg border bg-muted/25 p-3 leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /><p>Cache inventory describes stored records, not live provider availability or complete geographic coverage. Missing-data rates use each provider’s cached cell-days. Expired records can only be used as explicitly stale fallback.</p></div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <ProviderStatus label="NASA POWER" model="MERRA-2" report={data.nasa} inventoryAvailable={data.persistent} />
        <ProviderStatus label="Open-Meteo" model="ERA5" report={data.era5} inventoryAvailable={data.persistent} />
      </div>
      <MeteoStatus report={data.meteo} />
      <details className="rounded-xl border" open>
        <summary className="cursor-pointer px-4 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Recent provider attempts and error codes <span className="font-normal text-muted-foreground">({events.length})</span></summary>
        {events.length ? <div className="max-h-80 overflow-auto border-t"><table className="w-full min-w-[560px] text-left">
          <caption className="sr-only">Latest recorded upstream provider attempts, newest first. All timestamps are UTC.</caption>
          <thead className="sticky top-0 bg-muted text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{['Time (UTC)', 'Provider', 'Result', 'Safe error code'].map(label => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y">{events.map((event, index) => <tr key={event.at + '-' + index}><td className="whitespace-nowrap px-4 py-3 tabular-nums">{date(event.at)}</td><td className="px-4 py-3 font-medium">{event.provider}</td><td className="px-4 py-3"><ToneTag tone={event.event === 'error' ? 'danger' : 'neutral'}>{event.event}</ToneTag></td><td className="px-4 py-3 font-mono text-[11px]">{event.code ?? '—'}</td></tr>)}</tbody>
        </table></div> : <p className="border-t px-4 py-5 text-muted-foreground">No upstream attempts recorded. Existing cached retrieval timestamps remain visible above.</p>}
      </details>
      {!data.persistent && <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900"><TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /><span>Edge cache fallback: the full cache inventory is unavailable and attempt history is limited to this server instance. Configure WEATHER_DB for persistent monitoring and distributed rate limits.</span></p>}
      <footer className="flex flex-wrap items-start justify-between gap-3 border-t pt-4 text-[11px] leading-relaxed text-muted-foreground"><p className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" aria-hidden />Checked {date(data.checkedAt)}</p><p className="flex items-start gap-1.5"><CloudSun className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /><span>Sources are selected explicitly and never blended.<br />Open-Meteo free access is for non-commercial use.</span></p></footer>
    </div>}
  </DashboardCard>;
}
