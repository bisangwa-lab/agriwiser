import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, ExternalLink, MapPin, ShoppingBasket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { SourcePublications } from "@/components/dashboard/SourcePublications";
import { FilterBar } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { SourceNote } from "@/components/common/SourceNote";
import { StatCard } from "@/components/common/StatCard";
import { ComparisonBarChart } from "@/components/charts/ComparisonBarChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { useObservations } from "@/hooks/useObservations";
import { useDatasets } from "@/hooks/useAgriRecords";
import { APPROVED_GUIDANCE } from "@/lib/community-data";
import { CROPS, cropLabel, DISTRICT_NAMES, INDICATORS, SEASONS } from "@/lib/constants";
import { groupByDimension, percentageChange, seriesByYear, totalsForPeriod } from "@/lib/metrics";
import { selectTraceableAgricultureData } from "@/lib/agriculture-snapshot-data";

const INITIAL_FILTERS = { crop: "all", district: "all", season: "Season B", indicator: "production" };
const FILTER_FIELDS = [
  { key: "crop", label: "Crop", allLabel: "All main crops", options: CROPS.map((value) => ({ value, label: cropLabel(value) })) },
  { key: "district", label: "District", allLabel: "All Rwanda", options: DISTRICT_NAMES.map((value) => ({ value, label: value })) },
  { key: "season", label: "Survey season", allLabel: "All available seasons", options: SEASONS.map((value) => ({ value, label: value })) },
  { key: "indicator", label: "Measure", allLabel: "Production", options: ["production", "harvested_area", "yield"].map((value) => ({ value, label: INDICATORS[value].label })) },
];

function indicatorValue(rows, year, season, indicator) {
  if (year === null) return null;
  return totalsForPeriod(rows, { year, season: season === "all" ? undefined : season, indicator }).value;
}

export default function AgricultureSnapshotPanel() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const { data: observations = [], isLoading: observationsLoading, isError: observationsError } = useObservations({
    domain: "crop",
    crop: filters.crop === "all" ? undefined : filters.crop,
    season: filters.season === "all" ? undefined : filters.season,
    coreMeasures: filters.crop === "all",
    view: "metrics",
  });
  const { data: datasets = [], isLoading: datasetsLoading, isError: datasetsError } = useDatasets();

  const realData = useMemo(() => {
    return selectTraceableAgricultureData(observations, datasets);
  }, [datasets, observations]);

  const selection = useMemo(() => {
    const allRows = realData.rows;
    const scopedRows = filters.district === "all"
      ? allRows
      : allRows.filter((row) => row.geography === filters.district);
    const trend = seriesByYear(scopedRows);
    const years = trend.map((point) => point.year);
    const currentYear = years.length ? Math.max(...years) : null;
    const previousYear = currentYear === null ? null : years.filter((year) => year < currentYear).at(-1) ?? null;
    const periodSeason = filters.season === "all" ? "all" : filters.season;
    const values = Object.fromEntries(["production", "harvested_area", "yield"].map((indicator) => [
      indicator,
      indicatorValue(scopedRows, currentYear, periodSeason, indicator),
    ]));
    const previousValues = Object.fromEntries(["production", "harvested_area", "yield"].map((indicator) => [
      indicator,
      indicatorValue(scopedRows, previousYear, periodSeason, indicator),
    ]));
    const districtComparison = currentYear === null ? [] : groupByDimension(allRows, {
      dimension: "geography",
      year: currentYear,
      season: periodSeason === "all" ? undefined : periodSeason,
      indicator: filters.indicator,
    }).filter((row) => DISTRICT_NAMES.includes(row.name)).slice(0, 10);
    const visibleSources = realData.sources.filter((source) => allRows.some((row) => row.dataset_id === source.id));
    return { scopedRows, trend, currentYear, previousYear, values, previousValues, districtComparison, visibleSources };
  }, [realData, filters.district, filters.season, filters.indicator]);

  const indicator = INDICATORS[filters.indicator];
  const currentPeriod = selection.currentYear === null
    ? "No reporting period"
    : filters.season === "all" ? `All available seasons · ${selection.currentYear}` : `${selection.currentYear} · ${filters.season}`;
  const guidance = APPROVED_GUIDANCE.find((item) => item.verificationStatus === "Verified Public Guidance" &&
    (item.crops.includes("All Crops") || filters.crop === "all" || item.crops.includes(filters.crop)));
  const loading = observationsLoading || datasetsLoading;
  const failed = observationsError || datasetsError;
  const sourceStatus = selection.visibleSources.some((source) => source.quality_status === "provisional") ? "Published · provisional source" : "Published source records";

  return <div className="space-y-5">
    <PageHeader
      eyebrow="Community & business · Agriculture snapshot"
      title="Rwanda Agriculture Snapshot"
      description="Explore published crop statistics and practical, source-linked information for farmers and agriculture users."
      actions={<Badge variant="outline" className="gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden /> Rwanda</Badge>}
    />

    <FilterBar fields={FILTER_FIELDS} filters={filters}
      onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
      onReset={() => setFilters(INITIAL_FILTERS)} disabled={loading}>
      <p className="text-[11px] text-muted-foreground">{filters.crop === "all" ? "Main crop categories" : cropLabel(filters.crop)} · {filters.district === "all" ? "Rwanda" : filters.district} · {currentPeriod}</p>
    </FilterBar>

    {filters.crop === "all" && <p className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
      All-crop totals use main crop categories only. Crop subtypes are excluded to avoid counting the same crop output twice. Survey coverage varies by crop, district, season, and year.
    </p>}

    {failed && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Published statistics could not be loaded. Try again later; no sample figures are substituted.</p>}
    {!loading && !failed && selection.scopedRows.length === 0 && <p role="status" className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No traceable, non-demonstration published records match these filters. Try another crop, district, or season.</p>}

    <section aria-label="Latest published agricultural indicators" className="grid gap-3 sm:grid-cols-3">
      <StatCard label="Reported production" value={loading || failed ? null : selection.values.production} unitShort="t" deltaPct={selection.currentYear && selection.previousYear ? percentageChange(selection.values.production, selection.previousValues.production).value : null} deltaLabel="vs previous available year" footnote={currentPeriod} />
      <StatCard label="Harvested area" value={loading || failed ? null : selection.values.harvested_area} unitShort="ha" deltaPct={selection.currentYear && selection.previousYear ? percentageChange(selection.values.harvested_area, selection.previousValues.harvested_area).value : null} deltaLabel="vs previous available year" footnote={currentPeriod} />
      <StatCard label="Yield" value={loading || failed ? null : selection.values.yield} digits={2} unitShort="t/ha" deltaPct={selection.currentYear && selection.previousYear ? percentageChange(selection.values.yield, selection.previousValues.yield).value : null} deltaLabel="vs previous available year" footnote="Derived only from compatible production and harvested-area records" />
    </section>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-5">
        <DashboardCard title={`${indicator.label} over time`} subtitle={`${filters.crop === "all" ? "Main crop categories" : cropLabel(filters.crop)} · ${filters.district === "all" ? "Rwanda" : filters.district} · ${indicator.unit}`}>
          {loading ? <p role="status" className="flex h-[270px] items-center justify-center text-sm text-muted-foreground">Loading published observations…</p> : <TrendChart data={selection.trend} series={[{ key: indicator.key, label: indicator.label, digits: indicator.derived ? 2 : 0 }]} unitShort={indicator.unitShort} height={270} emptyMessage="No compatible published values match this scope." />}
          <SourceNote dataset={selection.visibleSources.map((source) => source.name).join("; ")} period={currentPeriod} geography={filters.district === "all" ? "Rwanda" : filters.district} unit={indicator.unit} quality={sourceStatus} />
        </DashboardCard>

        <DashboardCard title="District comparison" subtitle={`${indicator.label} · ${currentPeriod} · top 10 districts with published values`}>
          {loading ? <p role="status" className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Loading district records…</p> : <ComparisonBarChart rows={selection.districtComparison} unitShort={indicator.unitShort} digits={indicator.derived ? 2 : 0} emptyMessage="No comparable district records are available for this period." />}
        </DashboardCard>
      </div>

      <div className="space-y-5">
        <DashboardCard title="Farmer information" subtitle="Source-linked guidance from the AgriWiser catalogue" action={<BookOpen className="h-4 w-4 text-primary" aria-hidden />}>
          {guidance ? <div>
            <Badge variant="secondary" className="text-[10px]">{guidance.categoryLabel}</Badge>
            <h3 className="mt-3 text-sm font-semibold leading-snug">{guidance.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{guidance.summary}</p>
            <a href={guidance.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline">
              {guidance.source} <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
            <p className="mt-2 text-[10px] text-muted-foreground">Guidance published {guidance.publishedDate}. Follow current local advisories where conditions differ.</p>
          </div> : <p className="text-xs text-muted-foreground">No matching guidance is listed for this crop yet.</p>}
        </DashboardCard>

        <DashboardCard title="Useful agriculture services" subtitle="Continue to community resources">
          <div className="space-y-2">
            <Link to="/market-prices" className="flex items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/40">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary"><ShoppingBasket className="h-4 w-4" aria-hidden /></span>
              <span><span className="block text-xs font-medium">Market prices & trends</span><span className="text-[10px] text-muted-foreground">View the available market-price series</span></span>
            </Link>
            <Link to="/directory-services" className="flex items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/40">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary"><Users className="h-4 w-4" aria-hidden /></span>
              <span><span className="block text-xs font-medium">Directory & services</span><span className="text-[10px] text-muted-foreground">Find listed community resources</span></span>
            </Link>
          </div>
        </DashboardCard>

        <DashboardCard title="Read the figures carefully" subtitle="Published values are historical survey results">
          <ul className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
            <li>Production and area refer to the selected reporting period; they do not show current stocks or guaranteed sales.</li>
            <li>Yield is derived only where compatible production and harvested-area values are present.</li>
            <li>Gaps mean data is unavailable for that selection; missing values are never treated as zero.</li>
          </ul>
        </DashboardCard>
      </div>
    </div>

    <SourcePublications sources={selection.visibleSources} />
  </div>;
}
