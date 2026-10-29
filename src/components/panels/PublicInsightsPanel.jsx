import { SourcePublications } from "@/components/dashboard/SourcePublications";
import { SourceTableLibrary } from "@/components/data/SourceTableLibrary";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { DemoNotice } from "@/components/common/DemoNotice";
import { SourceNote } from "@/components/common/SourceNote";
import { FilterBar } from "@/components/common/FilterBar";
import { StatCard } from "@/components/common/StatCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { ComparisonBarChart } from "@/components/charts/ComparisonBarChart";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ToneTag } from "@/components/common/ToneTag";
import { useOverviewData } from "@/hooks/useOverviewData";
import { CROPS, cropLabel, DISTRICT_NAMES, INDICATORS, SEASONS } from "@/lib/constants";
import { BookOpen, Globe2, Search, ShieldCheck } from "lucide-react";

const DEFAULT_FILTERS = { crop: "all", district: "all", season: "Season B", indicator: "production" };
const FILTER_FIELDS = [
  { key: "crop", label: "Crop", allLabel: "All available crops", options: CROPS.map((value) => ({ value, label: cropLabel(value) })) },
  { key: "district", label: "District", allLabel: "All districts", options: DISTRICT_NAMES.map((value) => ({ value, label: value })) },
  { key: "season", allowAll: false, label: "Season", allLabel: "Available seasons", options: SEASONS.map((value) => ({ value, label: value })) },
  { key: "indicator", allowAll: false, label: "Measure", allLabel: "Production", options: ["production", "harvested_area", "yield"].map((value) => ({ value, label: INDICATORS[value].label })) },
];
const filterSummary = (filters) => [
  filters.crop === "all" ? "All available crops" : filters.crop,
  filters.district === "all" ? "All districts" : filters.district,
  filters.season === "all" ? "Available seasons" : filters.season,
].join(" · ");

export default function PublicInsightsPanel() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const { isDemonstration, data, error } = useOverviewData(filters);
  const indicator = INDICATORS[filters.indicator] ?? INDICATORS.production;
  const cards = data?.cards ?? {};
  const scope = filterSummary(filters);
  const districtRows = useMemo(() => {
    const rows = data?.districtRows ?? [];
    const search = query.trim().toLowerCase();
    return search ? rows.filter((row) => (row.name ?? "").toLowerCase().includes(search)) : rows;
  }, [data, query]);

  return <div className="space-y-5">
    <PageHeader eyebrow="Panel 5 · Public insights" title="Explore Rwanda's agriculture"
      description="Understand published agricultural trends, with clear sources, units and reporting periods."
      actions={<ToneTag tone="primary" icon={Globe2}>Public indicators</ToneTag>} />
    {isDemonstration && <DemoNotice />}
    {error && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Published data could not be loaded. Please try again.</p>}
    <FilterBar fields={FILTER_FIELDS} filters={filters}
      onChange={(key, value) => setFilters((previous) => ({ ...previous, [key]: value }))} onReset={() => setFilters(DEFAULT_FILTERS)}>
      <p className="text-[11px] text-muted-foreground">{scope} · {data?.latestPeriod ?? "No reporting period"}</p>
    </FilterBar>
    {filters.crop === "all" && <p className="text-xs leading-relaxed text-muted-foreground">Historical crop coverage varies. Totals use available main categories; select an individual crop for a consistent crop series. Subtypes are not added to their parent totals.</p>}
    <section aria-label="Published indicators" className="grid gap-3 sm:grid-cols-3">
      <StatCard label="Production" value={cards.production?.value} unitShort="t" deltaPct={cards.production?.deltaPct} deltaLabel="vs previous period" footnote={data?.latestPeriod ?? "No published production records"} />
      <StatCard label="Harvested area" value={cards.harvested_area?.value} unitShort="ha" deltaPct={cards.harvested_area?.deltaPct} deltaLabel="vs previous period" footnote={data?.latestPeriod ?? "No published area records"} />
      <StatCard label="Yield" value={cards.yield?.value} digits={2} unitShort="t/ha" deltaPct={cards.yield?.deltaPct} deltaLabel="vs previous period" footnote="Production ÷ compatible harvested area" />
    </section>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
      <div className="space-y-5">
        <DashboardCard title={indicator.label + " over time"} subtitle={scope + " · " + indicator.unit}>
          <TrendChart data={data?.trend ?? []} series={[{ key: indicator.key, label: indicator.label, digits: indicator.derived ? 2 : 0 }]} unitShort={indicator.unitShort} height={270} />
          <div className="mt-4"><SourceNote dataset={data?.datasetName} period={data?.latestPeriod} geography={filters.district === "all" ? "All districts" : filters.district} unit={indicator.unit} quality={isDemonstration ? "Demonstration data" : data ? "Published dataset" : "No published data"} /></div>
        </DashboardCard>
        <DashboardCard title="Compare districts" subtitle={indicator.label + " · " + (data?.latestPeriod ?? "No reporting period")}>
          <div className="relative mb-5 max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a district in this comparison" className="h-9 bg-muted/30 pl-9 text-xs" aria-label="Search district comparison" />
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground">{query.trim() ? "Matching districts" : "Top 10 districts by the selected measure"}</p>
          <ComparisonBarChart rows={districtRows.slice(0, 10)} unitShort={indicator.unitShort} digits={indicator.derived ? 2 : 0} emptyMessage={query.trim() ? "No district in this comparison matches your search." : "Compatible district values will appear here when published records are available."} />
        </DashboardCard>
      </div>
      <div className="space-y-5">
        <DashboardCard title="How to read the chart" subtitle="A little context makes a difference" action={<BookOpen className="h-4 w-4 text-primary" aria-hidden />}>
          <ol className="space-y-4">{[
            ["Follow the years", "Each point represents one agricultural year for your selected crop, area and season."],
            ["Check the unit", "Production is measured in tonnes, harvested area in hectares and yield in tonnes per hectare."],
            ["Read changes carefully", "An increase or decrease describes the reported values. It does not establish the cause."],
          ].map(([title, description], index) => <li key={title} className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-primary">{index + 1}</span><div><p className="text-[12px] font-medium">{title}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p></div></li>)}</ol>
        </DashboardCard>
        <DashboardCard title="Published with context" subtitle="Read-only information for everyone">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden /><p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">Use the source and period below each chart to understand its scope. Missing values are shown as gaps rather than zero.</p>
          <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">Personal details and private investigation records are not displayed in this panel.</p>
        </DashboardCard>
      </div>
    </div>
    <SourcePublications sources={data?.sources} />
    <SourceTableLibrary />
  </div>;
}
