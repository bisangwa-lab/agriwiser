import { useState } from "react";
import { CloudRain } from "lucide-react";
import { useWeather } from "@/hooks/useWeather";
import { seasonRange, validateWeatherRange } from "@/lib/weather-model";
import { percentageChange } from "@/lib/metrics";
import { formatNumber, formatSignedPercent } from "@/lib/format";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";

/** Requests only the two selected agricultural seasons, through the existing
 * authenticated, cached provider. Never substitute an example district.
 */
export function ExploreWeatherContext({ selection, onChooseDistrict }) {
  const { district, season, toYear, baselineYear } = selection;
  const [requested, setRequested] = useState(false), [validationError, setValidationError] = useState("");
  const currentInput = { location: { district }, ...seasonRange(toYear, season) };
  const previousInput = { location: { district }, ...seasonRange(baselineYear, season) };
  const current = useWeather(currentInput, { enabled: requested && district !== "all" });
  const previous = useWeather(previousInput, { enabled: requested && district !== "all" && toYear !== baselineYear });
  const rainNow = current.data?.summary.rainfall ?? null, rainBefore = previous.data?.summary.rainfall ?? null;
  const delta = percentageChange(rainNow, rainBefore);
  const loading = requested && (current.isFetching || previous.isFetching);
  const error = current.error ?? previous.error;
  const href = district === "all" ? "/weather" : `/weather?district=${encodeURIComponent(district)}&year=${toYear}&season=${encodeURIComponent(season)}&dataset=merra2`;
  function load() {
    try {
      validateWeatherRange(currentInput);
      if (toYear !== baselineYear) validateWeatherRange(previousInput);
      setValidationError("");
      if (requested) { current.refetch(); if (toYear !== baselineYear) previous.refetch(); }
      else setRequested(true);
    } catch (error) { setValidationError(error.message); }
  }
  return <DashboardCard title={<span className="flex items-center gap-2"><CloudRain className="h-4 w-4" aria-hidden />Check the weather context</span>} subtitle="Same district, same agricultural season, explicit comparison years">
    {district === "all" ? <div className="space-y-3"><p className="text-sm leading-relaxed text-muted-foreground">Choose a district above to compare its rainfall with the crop figures. An example district would not represent all districts.</p><Button size="sm" variant="outline" onClick={onChooseDistrict}>Choose a district</Button></div> : <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{district} · {season} · {toYear} ({currentInput.start} to {currentInput.end}) versus {baselineYear} ({previousInput.start} to {previousInput.end})</p>
      {!requested && <p className="text-sm text-muted-foreground">Load NASA POWER rainfall for these exact seasons. Availability is checked before showing a total.</p>}
      <Button size="sm" variant="outline" disabled={loading} onClick={load}>{loading ? "Loading seasonal rainfall…" : requested ? "Refresh rainfall" : "Load matching rainfall"}</Button>
      {validationError && <p role="alert" className="text-xs text-amber-900">{validationError}</p>}
      {error && <p role="alert" className="text-xs text-amber-900">{error.message} Use Refresh rainfall to retry.{error.retryAfter ? ` Wait about ${error.retryAfter} seconds.` : ""}</p>}
      {loading && <p role="status" className="text-xs text-muted-foreground">Checking provider data and daily coverage for both seasons…</p>}
      {requested && !loading && current.data && <>
        <div className="grid grid-cols-2 gap-3">{[[toYear, current.data], [baselineYear, toYear === baselineYear ? current.data : previous.data]].map(([year, data], index) => <div key={index} className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{year} {season}</p><p className="mt-1 text-lg font-semibold">{data?.summary.rainfall == null ? "Unavailable" : `${formatNumber(data.summary.rainfall, 1)} mm`}</p>{data && <p className="mt-1 text-[11px] text-muted-foreground">{data.summary.validDays.PRECTOTCORR}/{data.summary.expectedDays} days · {data.cache.status === "stale" ? "Stale cached data" : "Provider data loaded"}</p>}</div>)}</div>
        <p className="text-xs leading-relaxed text-muted-foreground">{delta.value !== null && toYear !== baselineYear ? `Rainfall difference: ${formatSignedPercent(delta.value)}. ` : "A rainfall percentage difference requires two complete seasons and a non-zero baseline. "}Missing days withhold a seasonal rainfall total.</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{current.data.spatialSupport ?? "NASA POWER model estimate on a coarse weather grid."} Rainfall differences cannot establish the cause of a crop change.</p>
        <details className="text-xs"><summary className="cursor-pointer text-primary">Weather source references</summary><ul className="mt-2 space-y-2">{[...new Map([...(current.data.sources ?? []), ...(previous.data?.sources ?? [])].map(source => [source.sourceUrl, source])).values()].map(source => <li key={source.sourceUrl}><a className="break-all text-primary underline" target="_blank" rel="noreferrer" href={source.sourceUrl}>{source.sourceUrl}</a></li>)}</ul></details>
      </>}
    </div>}
    <a className="mt-4 inline-block text-xs font-medium text-primary underline" href={href}>Open full weather & climate analysis</a>
  </DashboardCard>;
}
