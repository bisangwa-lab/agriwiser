import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Copy, Database, Download, Search, TriangleAlert } from "lucide-react";
import { requireWorkspace } from "@/lib/route-access";
import { sourceProvenance } from "@/lib/source-provenance";
import { CROPS, cropLabel, DISTRICT_NAMES, INDICATORS, SEASONS, SEASON_NOTES, YEARS } from "@/lib/constants";
import { EXPLORE_DEFAULTS, EXPLORE_INDICATORS, exploreData, exploreExportRows, validateExploreSearch } from "@/lib/explore-data";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatNumber, formatSignedPercent } from "@/lib/format";
import { useObservations } from "@/hooks/useObservations";
import { useDatasets } from "@/hooks/useAgriRecords";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterBar } from "@/components/common/FilterBar";
import { EmptyState } from "@/components/common/EmptyState";
import { DemoNotice } from "@/components/common/DemoNotice";
import { ToneTag } from "@/components/common/ToneTag";
import { StatCard } from "@/components/common/StatCard";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { ExplainChangeButton } from "@/components/explain/ExplainChangeDialog";
import { SourceTableLibrary } from "@/components/data/SourceTableLibrary";
import { ExploreWeatherContext } from "@/components/data/ExploreWeatherContext";

export const Route = createFileRoute("/_authed/explore")({
  beforeLoad: requireWorkspace(["planner", "data_manager"]),
  validateSearch: validateExploreSearch,
  head: () => ({ meta: [{ title: "Explore data · HingaSmart Rwanda" }] }),
  component: ExplorePage,
});

const fields = [
  { key: "crop", label: "Crop", allLabel: "All main crops (fixed categories)", options: CROPS.map(value => ({ value, label: cropLabel(value) })) },
  { key: "district", label: "District", allLabel: "All 30 districts", options: DISTRICT_NAMES.map(value => ({ value, label: value })) },
  { key: "season", allowAll: false, label: "Agricultural season", options: SEASONS.map(value => ({ value, label: value })) },
  { key: "indicator", allowAll: false, label: "Measure", options: EXPLORE_INDICATORS.map(value => ({ value, label: INDICATORS[value].label })) },
];
const control = "mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs";
function YearSelect({ label, value, onChange, years = YEARS }) {
  return <label className="block text-xs text-muted-foreground">{label}<select aria-label={label} className={control} value={value} onChange={event => onChange(Number(event.target.value))}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>;
}

function ExplorePage() {
  const filters = Route.useSearch(), navigate = Route.useNavigate();
  const { crop, district, season, indicator, fromYear, toYear, baselineYear, view } = filters;
  const [recordPage, setRecordPage] = useState(0), [recordSearch, setRecordSearch] = useState(""), [gapsOnly, setGapsOnly] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [showAllDistricts, setShowAllDistricts] = useState(false);
  const meta = INDICATORS[indicator], digits = indicator.includes("yield") ? 2 : 1;
  const observations = useObservations({ domain: "crop", crop: crop === "all" ? undefined : crop, district: district === "all" ? undefined : district, season });
  const datasets = useDatasets();
  const analysis = useMemo(() => exploreData(observations.data, filters), [observations.data, filters]);
  const { current, previous, change, comparisonReason } = analysis;
  const { dataset, sources } = sourceProvenance(datasets.data, analysis.sourceRows);
  const comparisonRows = [...current.records, ...previous.records].flatMap(row => row.sourceRows);
  const comparisonDataset = sourceProvenance(datasets.data, comparisonRows).dataset;
  const qualityFlags = [...new Set(analysis.sourceRows.flatMap(row => row.quality_flags ?? []))];
  const period = `${toYear} ${season}`, baselinePeriod = `${baselineYear} ${season}`;
  const scopeLabel = `${crop === "all" ? `${analysis.crops.length} fixed main crop categories` : cropLabel(crop)} · ${district === "all" ? "all 30 districts" : district}`;
  const recordRows = useMemo(() => {
    const terms = recordSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return analysis.records.filter(row => (!gapsOnly || !row.usable || row.value === null) && terms.every(term => [row.period, row.crop, row.geography, row.analysis_status, row.source_reference].join(" ").toLowerCase().includes(term)));
  }, [analysis, gapsOnly, recordSearch]);
  const shownPage = Math.min(recordPage, Math.max(0, Math.ceil(recordRows.length / 50) - 1));
  const pending = observations.isLoading;

  function update(changes) {
    setRecordPage(0); setRecordSearch(""); setGapsOnly(false); setCopyMessage("");
    return navigate({ search: previous => ({ ...previous, ...changes }), replace: true });
  }
  // Existing dashboard links use this anchor. Keep them opening the library.
  useEffect(() => {
    if (window.location.hash === "#published-tables") navigate({ search: previous => ({ ...previous, view: "library" }), hash: "", replace: true });
  }, [navigate]);

  function changeYear(key, value) {
    const changes = { [key]: value };
    if (key === "fromYear" && value > toYear) changes.toYear = value;
    if (key === "toYear") {
      if (value < fromYear) changes.fromYear = value;
      changes.baselineYear = YEARS.includes(value - 1) ? value - 1 : YEARS.find(year => year !== value) ?? value;
    }
    update(changes);
  }
  function showGaps() {
    setGapsOnly(true); setRecordSearch(""); setRecordPage(0);
    document.getElementById("explore-records")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopyMessage("Selection link copied"); }
    catch { setCopyMessage("Copy this page’s URL from your address bar; it includes the selection."); }
  }
  function exportRecords() {
    downloadCsv(`hingasmart-${indicator}-${crop}-${district}-${season.replaceAll(" ", "-")}-${fromYear}-${toYear}.csv`, toCsv(exploreExportRows(recordRows)));
  }
  const explainPayload = !pending && !observations.error && !comparisonReason ? {
    indicator, current: current.value, previous: previous.value, currentPeriod: period, previousPeriod: baselinePeriod,
    crop: crop === "all" ? `${analysis.crops.length} fixed main crop categories` : crop, geography: district === "all" ? "all 30 districts" : district,
    season, dataset: comparisonDataset, valueDigits: digits, qualityFlags: [...new Set(comparisonRows.flatMap(row => row.quality_flags ?? []))], coverage: { present: current.present + previous.present, total: current.expected + previous.expected, missing: 0 },
    calculationNote: `${indicator === "yield" ? "Derived yield = total production (t) ÷ total harvested area (ha), using compatible source pairs from the same release in each crop/district/period. Zero-area, zero-production pairs have no weight; total area must be positive." : indicator === "reported_yield" ? "Published yield is the source rate for one crop and one district. Rates are never summed." : "Totals require one usable value with the expected unit for every selected crop and district. Conflicting records, forecasts and missing records withhold the total."} Both periods use the same selected crop categories and districts. Percentage change = 100 × (current − baseline) ÷ baseline; baseline must be non-zero. Complete source availability does not establish statistical significance or identical survey methods.`,
  } : null;

  return <div className="space-y-5">
    <PageHeader eyebrow="Explore & investigate" title="Turn agricultural data into answers" description="Follow a crop over time, check whether a comparison is trustworthy, and find the source evidence for your next step." actions={<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={copyLink}><Copy className="mr-2 h-3.5 w-3.5" aria-hidden />Copy selection link</Button>{view === "trends" && <Button size="sm" variant="outline" onClick={exportRecords} disabled={pending || Boolean(observations.error) || !recordRows.length}><Download className="mr-2 h-3.5 w-3.5" aria-hidden />Export records ({recordRows.length})</Button>}</div>} />
    {copyMessage && <p role="status" className="text-xs text-primary">{copyMessage}</p>}
    <Tabs value={view} onValueChange={value => update({ view: value })}>
      <TabsList className="mb-4 h-auto w-full justify-start gap-1 overflow-x-auto p-1 sm:w-auto"><TabsTrigger className="text-xs sm:text-sm" value="trends">Crop trends & next steps</TabsTrigger><TabsTrigger className="text-xs sm:text-sm" value="library">Published tables & reports</TabsTrigger></TabsList>
      <TabsContent value="trends" className="space-y-5">
        <FilterBar fields={fields} filters={filters} onChange={(key, value) => update({ [key]: value })} onReset={() => update(EXPLORE_DEFAULTS)}>
          <p className="text-xs text-muted-foreground">{SEASON_NOTES[season]} · Filters are saved in the page URL.</p>
        </FilterBar>
        <div className="panel grid gap-4 p-4 sm:grid-cols-3 sm:p-5"><YearSelect label="Trend from year" value={fromYear} onChange={value => changeYear("fromYear", value)} /><YearSelect label="Current year / trend to" value={toYear} onChange={value => changeYear("toYear", value)} /><YearSelect label="Compare current year with" value={baselineYear} onChange={value => changeYear("baselineYear", value)} /><p className="text-xs leading-relaxed text-muted-foreground sm:col-span-3">The comparison always uses {season} in both years. Missing years stay visible as gaps; an older year is never silently used instead.</p></div>
        {pending ? <div role="status" className="panel p-8 text-sm text-muted-foreground">Loading the source observations and checking the selected scope…</div> : observations.error ? <div role="alert" className="panel p-6"><EmptyState icon={Database} title="Observations could not be loaded" description="Retry before interpreting this selection." /><Button variant="outline" onClick={() => observations.refetch()}>Retry observations</Button></div> : <>
          {dataset?.quality_status === "demonstration" && <DemoNotice />}
          <div className="grid gap-4 lg:grid-cols-3">
            <StatCard label={`${meta.label} · ${period}`} value={current.value} unitShort={meta.unitShort} digits={digits} footnote={current.reason ?? scopeLabel} />
            <StatCard label={`Change from ${baselinePeriod}`} value={change} unitShort="%" digits={1} footnote={comparisonReason ?? `Same crop categories and districts. Baseline: ${formatNumber(previous.value, digits)} ${meta.unitShort}. This is a descriptive difference, not a significance test.`} />
            <StatCard label={indicator === "yield" ? "Matched source pairs · current year" : "Usable source values · current year"} value={current.present} unitShort={`of ${current.expected}`} footnote={`${current.absent} entirely absent · ${current.missing - current.absent} other gaps. This measures availability, not survey confidence.`} />
          </div>
          {(analysis.missing > 0 || current.reason || previous.reason) && <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><div className="space-y-2"><p className="text-sm font-semibold">Check coverage before interpreting the trend</p><p className="text-xs leading-relaxed">{current.reason ?? previous.reason ?? `${analysis.missing} required values or pairs are missing across the displayed years.`} Incomplete totals and comparisons are withheld. A missing source cell is never replaced with zero.</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={showGaps}>Inspect missing or incompatible rows</Button><Button size="sm" variant="outline" onClick={() => update({ view: "library" })}>Check original publications</Button></div></div></div></div>}
          {indicator === "reported_yield" && (district === "all" || crop === "all") && <p className="text-sm text-muted-foreground">To see published yield, select a single crop and district above. Choose <button className="font-medium text-primary underline" onClick={() => update({ indicator: "yield" })}>derived yield</button> for a weighted production ÷ harvested-area calculation across districts.</p>}
          <DashboardCard title={`${meta.label} over time`} subtitle={`${scopeLabel} · ${season} · ${meta.unit}`}>
            <TrendChart data={analysis.series} series={[{ key: "value", label: meta.label, digits }]} unitShort={meta.unitShort} emptyMessage="No complete, compatible totals for this selection. Check the coverage table or narrow the scope." />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Only complete totals are plotted. Unavailable years break the line. {crop === "all" ? "The same set of main crop categories is required in every year; banana and bean subtypes are excluded from totals. Cross-crop totals describe the selected basket, so crop mix still matters. " : ""}Source revisions and survey methods can still affect interpretation.</p>
            <details className="mt-4 text-xs"><summary className="cursor-pointer font-medium text-primary">Check year-by-year coverage ({fromYear}–{toYear})</summary><div className="mt-3 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Year</TableHead><TableHead>Usable / required</TableHead><TableHead>Total ({meta.unitShort})</TableHead><TableHead>Interpretation</TableHead></TableRow></TableHeader><TableBody>{analysis.series.map(point => <TableRow key={point.year}><TableCell>{point.year} {season}</TableCell><TableCell>{point.present} / {point.expected}</TableCell><TableCell>{formatNumber(point.value, digits)}</TableCell><TableCell className="min-w-[220px] text-xs">{point.reason ?? "Complete for the selected scope"}</TableCell></TableRow>)}</TableBody></Table></div></details>
          </DashboardCard>
          {district === "all" && <DashboardCard title="Which districts should I look at?" subtitle={`${period} versus ${baselinePeriod} · largest percentage decreases first, with unavailable comparisons last`}>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{analysis.districtComparisons.filter(item => item.change !== null).length} of 30 districts have a calculable comparison. These are descriptive differences, not a risk classification. Open a district to inspect its sources, area, yield and rainfall.</p>
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>District</TableHead><TableHead>Current ({meta.unitShort})</TableHead><TableHead>Baseline ({meta.unitShort})</TableHead><TableHead>Change</TableHead><TableHead>Next step</TableHead></TableRow></TableHeader><TableBody>{analysis.districtComparisons.slice(0, showAllDistricts ? 30 : 6).map(item => <TableRow key={item.district}><TableCell className="font-medium">{item.district}</TableCell><TableCell className="num">{formatNumber(item.current, digits)}</TableCell><TableCell className="num">{formatNumber(item.previous, digits)}</TableCell><TableCell className="min-w-[150px] text-xs">{item.change === null ? item.reason ?? "Comparison unavailable" : formatSignedPercent(item.change)}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => { update({ district: item.district }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Inspect {item.district}</Button></TableCell></TableRow>)}</TableBody></Table></div>
            <Button size="sm" variant="ghost" className="mt-3" onClick={() => setShowAllDistricts(value => !value)}>{showAllDistricts ? "Show first 6 districts" : "Show all 30 districts"}</Button>
          </DashboardCard>}
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <DashboardCard title="What should I investigate next?" subtitle={`${period} compared with ${baselinePeriod}`}>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{comparisonReason ? "Resolve the comparison limits first. A change in reporting coverage can look like a change in agriculture." : `The selected measure ${change > 0 ? "increased" : change < 0 ? "decreased" : "was unchanged"}${change === 0 ? "" : ` by ${formatNumber(Math.abs(change), 1)}%`}. Check area and productivity before forming an explanation.`}</p>
              <div className="space-y-2">{analysis.breakdown.map(item => <div key={item.indicator} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs"><span>{INDICATORS[item.indicator].label}</span><span className="num">{formatNumber(item.current, item.indicator === "yield" ? 2 : 1)} {INDICATORS[item.indicator].unitShort} · {item.change === null ? "Comparison unavailable" : formatSignedPercent(item.change)}</span></div>)}</div>
              <ol className="mt-4 list-decimal space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground"><li>Check missing values, source footnotes and changes in survey definitions.</li><li>Compare harvested area and derived yield. Production equals area × yield where the source pairs are compatible.</li><li>Select a district and inspect matching rainfall. Then seek input, pest, price or field evidence before explaining a cause.</li></ol>
              <div className="mt-4 flex flex-wrap gap-2"><ExplainChangeButton payload={explainPayload} /><Button size="sm" variant="outline" onClick={() => update({ view: "library" })}>Find inputs & supporting evidence<ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden /></Button></div>
            </DashboardCard>
            <ExploreWeatherContext key={`${district}-${season}-${toYear}-${baselineYear}`} selection={filters} onChooseDistrict={() => document.getElementById("filter-district")?.focus()} />
          </div>
          <DashboardCard title="Definition, sources & limits" subtitle={`${meta.label} · ${meta.unit}`}>
            <p className="text-sm leading-relaxed text-muted-foreground">{meta.definition}</p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">A total requires one usable source value for each selected crop × district × year. Wrong units, conflicting releases, forecasts and absent records are treated as gaps. Derived yield requires matching releases and uses total production ÷ total harvested area. Zero-area, zero-production pairs contribute no area; their individual rate is unavailable.</p>
            {datasets.error ? <div role="alert" className="mt-3 text-xs text-amber-900">Source metadata could not be loaded. <button className="underline" onClick={() => datasets.refetch()}>Retry source metadata</button></div> : datasets.isLoading ? <p role="status" className="mt-3 text-xs">Loading source references…</p> : sources.length ? <details className="mt-3 text-xs"><summary className="cursor-pointer font-medium text-primary">View {sources.length} contributing source releases and their quality status</summary><ul className="mt-3 space-y-2">{sources.map(source => <li key={source.id} className="rounded-lg bg-muted/30 p-3"><p className="font-medium">{source.name} · {source.quality_status}</p><p className="mt-1 text-muted-foreground">{source.reporting_period} · {source.publisher} · retrieved {source.retrieval_date ?? "date not recorded"}</p>{source.source_url && <a className="mt-1 inline-block text-primary underline" href={source.source_url} target="_blank" rel="noreferrer">Open source</a>}</li>)}</ul></details> : <p className="mt-3 text-xs text-muted-foreground">No source metadata is available for this selection. Inspect row references below.</p>}
            {qualityFlags.length > 0 && <details className="mt-3 rounded-lg border border-amber-200 p-3 text-xs"><summary className="cursor-pointer font-medium">Source quality warnings ({qualityFlags.length})</summary><ul className="mt-2 list-disc space-y-1 pl-4">{qualityFlags.map(flag => <li key={flag}>{flag}</li>)}</ul></details>}
          </DashboardCard>
          <div id="explore-records" className="scroll-mt-24"><DashboardCard title="Records behind this measure" subtitle={`${meta.label} only · ${fromYear}–${toYear} ${season} · ${scopeLabel}`}>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">The chart and these records use the same measure and year range. Expected records missing from the source are shown explicitly. Derived-yield rows include production and harvested-area components in the export. Table search and the gap filter apply to this table and its CSV only.</p>
            <div className="mb-4 flex flex-wrap items-center gap-3"><div className="relative min-w-0 flex-1 sm:max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden /><Input className="pl-9" aria-label="Search analysis records" placeholder="District, crop, year or source reference" value={recordSearch} onChange={event => { setRecordSearch(event.target.value); setRecordPage(0); }} /></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={gapsOnly} onChange={event => { setGapsOnly(event.target.checked); setRecordPage(0); }} />Missing or unavailable values only</label><Button size="sm" variant="outline" disabled={!recordRows.length} onClick={exportRecords}><Download className="mr-2 h-3.5 w-3.5" aria-hidden />Export matching records</Button></div>
            {!recordRows.length ? <EmptyState icon={CheckCircle2} title={gapsOnly ? "No unavailable values match" : "No matching records"} description="Clear the table search or change the gap filter." /> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Crop</TableHead><TableHead>District</TableHead><TableHead className="text-right">Value ({meta.unitShort})</TableHead><TableHead>Status</TableHead><TableHead>Source & warnings</TableHead></TableRow></TableHeader><TableBody>{recordRows.slice(shownPage * 50, (shownPage + 1) * 50).map(row => <TableRow key={row.id}><TableCell className="whitespace-nowrap">{row.period}</TableCell><TableCell>{row.crop}</TableCell><TableCell>{row.geography}</TableCell><TableCell className="num text-right">{formatNumber(row.value, digits)}</TableCell><TableCell className="min-w-[180px]"><ToneTag tone={row.usable && row.value !== null ? "neutral" : "warning"}>{row.analysis_status}</ToneTag><p className="mt-1 text-[11px] text-muted-foreground">{row.observation_status}</p></TableCell><TableCell className="min-w-[220px] max-w-sm text-xs"><details><summary className="cursor-pointer text-primary">{row.source_reference || "No source record"}</summary>{row.source_url.split(" | ").filter(Boolean).map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-primary underline">Open source workbook</a>)}{row.quality_flags.length > 0 && <p className="mt-2 leading-relaxed text-muted-foreground">{row.quality_flags.join(" · ")}</p>}</details></TableCell></TableRow>)}</TableBody></Table></div>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{formatNumber(recordRows.length)} matching records · page {shownPage + 1} of {Math.max(1, Math.ceil(recordRows.length / 50))}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={shownPage === 0} onClick={() => setRecordPage(shownPage - 1)}>Previous records</Button><Button size="sm" variant="outline" disabled={(shownPage + 1) * 50 >= recordRows.length} onClick={() => setRecordPage(shownPage + 1)}>Next records</Button></div></div>
          </DashboardCard></div>
        </>}
      </TabsContent>
      <TabsContent value="library"><SourceTableLibrary trendSelection={filters} /></TabsContent>
    </Tabs>
  </div>;
}
