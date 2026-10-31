import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, ReferenceLine } from "recharts";
import { CalendarClock, MapPin, TrendingUp } from "lucide-react";
import { getMarketPriceView } from "@/lib/market-prices-fns";
import { formatDate, formatPrice } from "@/lib/market-prices-format";
import { MarketPriceMap } from "@/components/community/MarketPriceMap";
import { useLanguage } from "@/lib/LanguageContext";

const DEFAULTS = { commodity: "Maize", unit: "KG", priceType: "Retail", district: "all", marketId: "all", period: "24m" };
const PERIODS = [{ value: "12m", label: "Last 12 months" }, { value: "24m", label: "Last 24 months" }, { value: "all", label: "All available history" }];

function PanelCard({ title, description, children, className = "" }) {
  const { t } = useLanguage();
  return <section className={`rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6 ${className}`}><div className="mb-4"><h2 className="text-base font-semibold text-foreground">{t(title)}</h2>{description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(description)}</p> : null}</div>{children}</section>;
}

function FilterSelect({ label, value, onChange, options, disabled = false }) {
  const { t } = useLanguage();
  return <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">{t(label)}<select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60">{options.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}</select></label>;
}

function PriceTooltip({ active, payload, currency, unit }) {
  const { t } = useLanguage();
  if (!active || !payload?.length || payload[0].value == null) return null;
  const point = payload[0].payload;
  const isEstimate = payload[0].dataKey === "gapEstimate";
  return <div className="rounded-lg border bg-background p-3 text-xs shadow-lg"><p className="font-semibold">{point.label}</p><p className="mt-1">{t(isEstimate ? "Estimated bridge" : "Observed median")}: {formatPrice(payload[0].value, currency, unit)}</p>{isEstimate ? <p className="mt-1 max-w-52 text-muted-foreground">{t("Linear interpolation between recorded months. This is not a source observation or price forecast.")}</p> : <p className="text-muted-foreground">{point.recordCount} {t("records")} · {point.marketCount} {t(point.marketCount === 1 ? "market" : "markets")}</p>}</div>;
}

function addGapEstimates(trend) {
  const points = trend.map((point) => ({ ...point, gapEstimate: null }));
  let previousObserved = -1;
  for (let index = 0; index < points.length; index += 1) {
    if (points[index].value == null) continue;
    if (previousObserved >= 0 && index - previousObserved > 1) {
      const startValue = points[previousObserved].value;
      const endValue = points[index].value;
      const missingCount = index - previousObserved - 1;
      points[previousObserved].gapEstimate = startValue;
      points[index].gapEstimate = endValue;
      for (let gap = 1; gap <= missingCount; gap += 1) {
        points[previousObserved + gap].gapEstimate = startValue + ((endValue - startValue) * gap) / (missingCount + 1);
      }
    }
    previousObserved = index;
  }
  return points;
}

function addExploratoryProjection(trend, horizon = 3) {
  const lastObservedIndex = trend.reduce((last, point, index) => point.value == null ? last : index, -1);
  if (lastObservedIndex < 5) return { points: trend, projectionAvailable: false };
  const historical = trend.slice(0, lastObservedIndex + 1).filter((point) => point.value != null).slice(-6);
  if (historical.length < 5) return { points: trend.slice(0, lastObservedIndex + 1), projectionAvailable: false };
  const xs = historical.map((point) => trend.findIndex((candidate) => candidate.key === point.key));
  const ys = historical.map((point) => point.value);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const denominator = xs.reduce((sum, value) => sum + ((value - meanX) ** 2), 0);
  const slope = denominator ? xs.reduce((sum, value, index) => sum + ((value - meanX) * (ys[index] - meanY)), 0) / denominator : 0;
  const intercept = meanY - slope * meanX;
  const residuals = xs.map((value, index) => ys[index] - (intercept + slope * value));
  const residualError = Math.sqrt(residuals.reduce((sum, value) => sum + value ** 2, 0) / Math.max(1, residuals.length - 2));
  const latest = trend[lastObservedIndex];
  const latestDate = new Date(`${latest.key}-01T00:00:00.000Z`);
  const points = trend.slice(0, lastObservedIndex + 1).map((point, index) => ({ ...point, projection: index === lastObservedIndex ? point.value : null, projectionLow: index === lastObservedIndex ? point.value : null, projectionHigh: index === lastObservedIndex ? point.value : null }));
  for (let step = 1; step <= horizon; step += 1) {
    const date = new Date(latestDate);
    date.setUTCMonth(date.getUTCMonth() + step);
    const key = date.toISOString().slice(0, 7);
    const x = lastObservedIndex + step;
    const value = Math.max(0, intercept + slope * x);
    const uncertainty = Math.max(residualError * Math.sqrt(1 + step / historical.length), meanY * 0.05);
    points.push({ key, label: date.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }), value: null, gapEstimate: null, projection: value, projectionLow: Math.max(0, value - uncertainty), projectionHigh: value + uncertainty, recordCount: 0, marketCount: 0 });
  }
  return { points, projectionAvailable: true };
}

export default function MarketPricesPanel() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState(DEFAULTS);
  const [showAllMarkets, setShowAllMarkets] = useState(false);
  const [highestFirst, setHighestFirst] = useState(true);
  const { data, isPending, isFetching, isPlaceholderData, error } = useQuery({
    queryKey: ["market-prices-view", filters],
    queryFn: () => getMarketPriceView({ data: filters }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previous) => previous,
  });

  const catalog = data?.catalog;
  const commodity = catalog?.commodities.find((item) => item.name === filters.commodity);
  const unitOption = commodity?.units.find((item) => item.name === filters.unit);
  const priceTypes = unitOption?.priceTypes ?? [];
  const comparisons = data?.comparisons ?? [];
  const districtMarkets = useMemo(() => comparisons.filter((market) => filters.district === "all" || market.district === filters.district), [comparisons, filters.district]);
  const rankedComparisons = useMemo(() => [...comparisons].sort((left, right) => highestFirst
    ? right.medianPrice - left.medianPrice || left.market.localeCompare(right.market)
    : left.medianPrice - right.medianPrice || left.market.localeCompare(right.market)), [comparisons, highestFirst]);
  const visibleComparisons = showAllMarkets ? rankedComparisons : rankedComparisons.slice(0, 10);
  const latest = data?.latest;
  const trendAnalysis = useMemo(() => {
    const gapFilled = addGapEstimates(data?.trend ?? []);
    return addExploratoryProjection(gapFilled);
  }, [data?.trend]);
  const trendWithGaps = trendAnalysis.points;
  const hasEstimatedGaps = trendWithGaps.some((point) => point.gapEstimate != null);
  const chartCurrency = latest?.currency ?? "RWF";
  const chartUnit = filters.unit;
  const hasCurrentData = Boolean(data && !isPending && !isPlaceholderData);

  function changeFilter(key, value) {
    setShowAllMarkets(false);
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "commodity") {
        const nextCommodity = catalog?.commodities.find((item) => item.name === value);
        const nextUnit = nextCommodity?.units[0];
        next.unit = nextUnit?.name ?? "KG";
        next.priceType = nextUnit?.priceTypes[0] ?? "Retail";
      }
      if (key === "unit") next.priceType = nextCommodityTypes(value)?.[0] ?? current.priceType;
      if (["commodity", "unit", "priceType", "district", "period"].includes(key)) next.marketId = "all";
      return next;
    });
    function nextCommodityTypes(unit) {
      return catalog?.commodities.find((item) => item.name === filters.commodity)?.units.find((item) => item.name === unit)?.priceTypes;
    }
  }

  const latestLabel = t(filters.marketId === "all" ? "Latest matching record" : "Latest for this market");
  const trendTitle = t(filters.marketId === "all" ? "Price trend across reporting markets" : "Price trend for selected market");

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{t("Panel 4 · Community & business")}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t("Market Prices & Trends")}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("Check recorded food prices, compare reporting markets, and see how prices changed over time.")}</p></div>
      </header>

      <div className="flex gap-3 rounded-xl border border-amber-300/70 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100" role="status">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div><p className="text-sm font-semibold">{t("Historical prices · not live quotes")}</p><p className="mt-1 text-xs leading-relaxed">{t("This WFP snapshot was downloaded")} {formatDate(data?.metadata.retrievedAt ?? "2026-10-31")}. {t("The latest included price record is")} {formatDate(data?.metadata.latestObservation ?? "2026-07-15")}. {t("Records dated 15 Aug 2026 are flagged aggregate-only and excluded. Changing filters updates this view; it does not fetch newer prices.")}</p></div>
      </div>

      <PanelCard title="Choose what to look at" description="Comparisons use the same crop, unit, price type, district and date range. A selected market focuses the latest price and trend.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <FilterSelect label="Crop or food" value={filters.commodity} disabled={!catalog} onChange={(value) => changeFilter("commodity", value)} options={(catalog?.commodities ?? [{ name: "Maize" }]).map((item) => ({ value: item.name, label: t(item.name) }))} />
          <FilterSelect label="Unit" value={filters.unit} disabled={!catalog} onChange={(value) => changeFilter("unit", value)} options={(commodity?.units ?? [{ name: filters.unit }]).map((item) => ({ value: item.name, label: item.name }))} />
          <FilterSelect label="Price type" value={filters.priceType} disabled={!catalog} onChange={(value) => changeFilter("priceType", value)} options={priceTypes.length ? priceTypes.map((name) => ({ value: name, label: name })) : [{ value: filters.priceType, label: filters.priceType }]} />
          <FilterSelect label="District" value={filters.district} disabled={!catalog} onChange={(value) => changeFilter("district", value)} options={[{ value: "all", label: "All districts" }, ...(catalog?.districts ?? []).map((name) => ({ value: name, label: name }))]} />
          <FilterSelect label="Market" value={filters.marketId} disabled={!catalog || isPlaceholderData} onChange={(value) => changeFilter("marketId", value)} options={[{ value: "all", label: "All matching markets" }, ...districtMarkets.map((market) => ({ value: market.marketId, label: `${market.market} · ${market.district}` }))]} />
          <FilterSelect label="Time period" value={filters.period} disabled={!catalog} onChange={(value) => changeFilter("period", value)} options={PERIODS} />
        </div>
        {!catalog ? <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">{t("Loading available crops, markets and periods…")}</p> : null}
        {isFetching && catalog ? <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">{t("Updating the results for these filters…")}</p> : null}
        {catalog && data?.metadata ? <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">{t("WFP coverage in this snapshot:")} {data.metadata.coveredDistrictCount} {t("of")} {data.metadata.nationalDistrictCount} {t("districts across")} {data.metadata.marketCount} {t("markets.")} {t("Other districts have no matching WFP records in this snapshot.")}</p> : null}
        {catalog ? <p className="mt-3 text-[11px] text-muted-foreground">{t("The WFP file does not provide a consistent crop grade field; grade-level comparisons are unavailable.")}</p> : null}
      </PanelCard>

      {error ? <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{t("Could not load market prices.")} {t(error.message || "Please try again.")}</div> : null}
      {(isPending || isPlaceholderData) ? <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground" role="status">{t("Loading price records for the selected filters…")}</div> : null}
      {hasCurrentData ? <>
        <div className="grid gap-4 lg:grid-cols-[1.05fr_2fr]">
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <p className="text-xs font-medium text-muted-foreground">{latestLabel}</p>
            {latest ? <><p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{formatPrice(latest.price, latest.currency, latest.unit)}</p><p className="mt-2 flex items-center gap-1.5 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" aria-hidden />{t(latest.market)}, {t(latest.district)}</p><p className="mt-1 text-xs text-muted-foreground">{t("Observed")} {formatDate(latest.date)} · {t(latest.priceType.toLowerCase())} {t("price")}</p><p className="mt-3 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-900">{t("Historical · source observation")}</p>{latest.priceFlag.includes("aggregate") ? <p className="mt-3 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">{t("WFP marks this record as an actual, aggregate price entry.")}</p> : null}</> : <p className="mt-3 rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">{t("No matching price records were found. Try a different market, district, or period.")}</p>}
          </section>
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-base font-semibold">{t(trendTitle)}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Monthly median · missing months are left blank")}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{t(filters.marketId === "all" ? "Market-level records" : "Selected market")}</span></div>
            {data.trend.some((point) => point.value != null) ? <><div className="mt-4 h-64" role="img" aria-label={t(`${trendTitle}; observed prices, estimated missing months, and exploratory three-month price projection in ${chartCurrency} per ${chartUnit}`)}><ResponsiveContainer width="100%" height="100%"><LineChart data={trendWithGaps} margin={{ top: 8, right: 14, left: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={24} /><YAxis tick={{ fontSize: 10 }} width={62} tickFormatter={(value) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)} /><Tooltip content={<PriceTooltip currency={chartCurrency} unit={chartUnit} />} /><Line type="monotone" dataKey="value" name={t("Observed median")} stroke="#146c50" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls={false} /><Line type="linear" dataKey="gapEstimate" name={t("Gap estimate")} stroke="#c2413a" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3, fill: "#c2413a" }} activeDot={{ r: 5 }} connectNulls={false} /><ReferenceLine x={trendWithGaps.find((point) => point.projection != null)?.label} stroke="#94a3b8" strokeDasharray="3 4" label={{ value: t("Projection starts"), position: "insideTopRight", fill: "#64748b", fontSize: 10 }} /><Line type="linear" dataKey="projectionLow" name={t("Indicative lower range")} stroke="#93c5fd" strokeWidth={1} strokeDasharray="2 4" dot={false} connectNulls /><Line type="linear" dataKey="projectionHigh" name={t("Indicative upper range")} stroke="#93c5fd" strokeWidth={1} strokeDasharray="2 4" dot={false} connectNulls /><Line type="linear" dataKey="projection" name={t("Exploratory projection")} stroke="#2563eb" strokeWidth={2.5} strokeDasharray="7 5" dot={{ r: 3, fill: "#2563eb" }} activeDot={{ r: 5 }} connectNulls={false} /></LineChart></ResponsiveContainer></div><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-emerald-800" />{t("Recorded")}</span>{hasEstimatedGaps ? <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-rose-700" />{t("Estimated missing months")}</span> : null}{trendAnalysis.projectionAvailable ? <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-blue-600" />{t("Exploratory 3-month projection")}</span> : null}</div></> : <p className="mt-5 rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">{t("No trend points are available for this selection.")}</p>}
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{filters.marketId === "all" ? "Solid green shows monthly medians across reporting markets; it is not a national market price." : "Solid green shows this market’s recorded monthly median."} {hasEstimatedGaps ? "Dashed red bridges missing months using linear interpolation; those values are assumptions, not observations." : "Months without records remain blank."} {trendAnalysis.projectionAvailable ? "Dashed green extends three months using a straight-line fit to the latest six observed monthly values. Thin green bounds show an indicative range, not a validated confidence interval; weather, supply, transport and demand are not included." : "A future projection needs at least five recent observed months; this selection does not have enough history."}</p>
          </section>
        </div>

        <PanelCard title="Compare markets" description={`${t("Median of matching records within")} ${t(filters.period === "all" ? "all available history" : filters.period === "12m" ? "the last 12 months" : "the last 24 months")}. ${t("Markets can have observations from different dates; check each market’s latest date before comparing.")}`}>
          {comparisons.length ? <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{t("Showing")} {visibleComparisons.length} {t("of")} {comparisons.length} {t("markets with matching records.")}</p><button type="button" aria-label={`${t("Change market order; currently")} ${t(highestFirst ? "highest to lowest" : "lowest to highest")}`} onClick={() => setHighestFirst((current) => !current)} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">{t("Order:")} {t(highestFirst ? "highest to lowest" : "lowest to highest")} · {t("change")}</button></div>
            <div className="h-[min(480px,65vh)] min-h-72" role="img" aria-label={`Median ${filters.priceType.toLowerCase()} ${filters.commodity} price by market, in ${chartCurrency} per ${chartUnit}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={visibleComparisons} layout="vertical" margin={{ top: 4, right: 18, left: 12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(value) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)} /><YAxis type="category" dataKey="market" width={118} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => [formatPrice(value, chartCurrency, chartUnit), "Median"]} labelFormatter={(name) => { const item = visibleComparisons.find((market) => market.market === name); return item ? `${item.market} · ${item.district}` : name; }} /><Bar dataKey="medianPrice" name="Median price" radius={[0, 5, 5, 0]} cursor="pointer">{visibleComparisons.map((item) => <Cell key={item.marketId} fill={filters.marketId === item.marketId ? "#0f766e" : "#78b49a"} onClick={() => changeFilter("marketId", item.marketId)} />)}</Bar></BarChart></ResponsiveContainer></div>
            <div className="mt-4 overflow-x-auto rounded-lg border"><table className="w-full min-w-[540px] text-left text-xs"><thead className="bg-muted/60 text-muted-foreground"><tr><th className="px-3 py-2.5 font-medium">Market</th><th className="px-3 py-2.5 font-medium">Period median</th><th className="px-3 py-2.5 font-medium">Records</th><th className="px-3 py-2.5 font-medium">Latest observation</th></tr></thead><tbody>{visibleComparisons.map((item) => <tr key={item.marketId} className="border-t"><td className="px-3 py-2.5 font-medium"><button type="button" className="text-left text-primary underline-offset-2 hover:underline" onClick={() => changeFilter("marketId", item.marketId)}>{item.market}, {item.district}</button></td><td className="px-3 py-2.5">{formatPrice(item.medianPrice, chartCurrency, chartUnit)}</td><td className="px-3 py-2.5">{item.recordCount}</td><td className="px-3 py-2.5">{formatDate(item.lastDate)}</td></tr>)}</tbody></table></div>
            {comparisons.length > 10 ? <button type="button" onClick={() => setShowAllMarkets((value) => !value)} className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5">{showAllMarkets ? t("Show fewer markets") : `${t("Show all")} ${comparisons.length} ${t("markets")}`}</button> : null}
          </> : <p className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">No market comparisons are available for these filters and dates.</p>}
        </PanelCard>

        <PanelCard title="Where are matching markets?" description="Markers show a market with matching price records. Relative colors compare the displayed market medians; a gray district means no matching market is shown there.">
          <MarketPriceMap comparisons={comparisons} currency={chartCurrency} unit={chartUnit} onSelectMarket={(marketId) => changeFilter("marketId", marketId)} selectedMarketId={filters.marketId} />
        </PanelCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950 dark:bg-sky-950/30 dark:text-sky-100"><TrendingUp className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><div><h2 className="text-sm font-semibold">{t("Future price forecast")}</h2><p className="mt-1 text-xs leading-relaxed">{t("Not available for this selection. This dataset contains historical prices but no validated, time-aligned supply, weather, transport or demand inputs for a reliable future estimate. A forecast will appear here only after those inputs and model accuracy are verified.")}</p></div></section>
          <details className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"><summary className="cursor-pointer text-sm font-semibold">About these prices and sources</summary><div className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground"><p>Source: {data.metadata.attribution}, distributed by {data.metadata.distributor}. Dataset: <a className="font-medium text-primary underline underline-offset-2" href={data.metadata.datasetUrl} target="_blank" rel="noreferrer">WFP Rwanda Food Prices on HDX</a>.</p><p>License: {data.metadata.license}. Coverage shown here: {formatDate(data.metadata.coverageStart)} to {formatDate(data.metadata.latestObservation)}. Retrieved {formatDate(data.metadata.retrievedAt)}. The full source file includes later aggregate-only entries; these are not treated as market observations here.</p><p>Only positive food prices flagged actual or actual,aggregate are included; the source field does not provide a consistent grade option, so grade is not compared. This page summarizes recorded prices and does not explain their causes or guarantee a price farmers can obtain today. Map points are shown only when supplied market coordinates matched the listed district; district borders use a 2012 boundary reference.</p><p>Current selection: {data.range.startDate} to {data.metadata.latestObservation}. {isFetching ? <span>Updating view…</span> : null}</p></div></details>
        </div>
      </> : null}
    </main>
  );
}
