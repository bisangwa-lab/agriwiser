import { SourcePublications } from "./SourcePublications";
import { WeatherContext } from '@/components/weather/WeatherContext';
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BellRing,
  CircleCheck,
  ClipboardList,
  Database,
  Eye,
  FileText,
  FlaskConical,
  Layers3,
  MapPin,
  Sprout,
  TrendingUp,
  ShieldAlert,
  Cpu,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DemoNotice } from "@/components/common/DemoNotice";
import { SourceNote } from "@/components/common/SourceNote";
import { FilterBar } from "@/components/common/FilterBar";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag, severityLabel, severityTone, investigationStatusLabel, investigationStatusTone } from "@/components/common/ToneTag";
import { TrendChart } from "@/components/charts/TrendChart";
import { DistrictMap } from "@/components/maps/DistrictMap";
import { DashboardCard, DashboardLink } from "./DashboardCard";
import { useOverviewData } from "@/hooks/useOverviewData";
import { CROPS, cropLabel, DISTRICT_NAMES, INDICATORS, SEASONS } from "@/lib/constants";
import { SAMPLE_OVERVIEW } from "@/lib/sample-overview";
import { formatNumber, NOT_AVAILABLE } from "@/lib/format";
import { RiskIntelligencePanel } from "@/components/intelligence/RiskIntelligencePanel";
import { DigitalTwinPanel } from "@/components/intelligence/DigitalTwinPanel";
import { AIAnalystPanel } from "@/components/intelligence/AIAnalystPanel";
import { ModelGovernancePanel } from "@/components/intelligence/ModelGovernancePanel";

const DEFAULT_FILTERS = { crop: "all", district: "all", season: "Season B", indicator: "production" };
const FILTER_FIELDS = [
  { key: "crop", label: "Crop", allLabel: "All available crops", options: CROPS.map((value) => ({ value, label: cropLabel(value) })) },
  { key: "district", label: "District", allLabel: "All districts", options: DISTRICT_NAMES.map((value) => ({ value, label: value })) },
  { key: "season", allowAll: false, label: "Season", allLabel: "Available seasons", options: SEASONS.map((value) => ({ value, label: value })) },
  { key: "indicator", allowAll: false, label: "Measure", allLabel: "Production", options: ["production", "harvested_area", "cultivated_area", "yield"].map((value) => ({ value, label: INDICATORS[value].label })) },
];

const scopeLabel = (filters) => [filters.crop === "all" ? "All available crops" : filters.crop, filters.district === "all" ? "All districts" : filters.district, filters.season === "all" ? "Available seasons" : filters.season].join(" · ");

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [preview, setPreview] = useState(false);
  const live = useOverviewData(filters);
  const data = preview ? SAMPLE_OVERVIEW : live.data;
  const alerts = preview ? SAMPLE_OVERVIEW.alerts : live.alerts;
  const investigations = preview ? SAMPLE_OVERVIEW.investigations : live.investigations;
  const cards = data?.cards ?? {};
  const indicator = INDICATORS[filters.indicator] ?? INDICATORS.production;
  const demonstration = preview || live.isDemonstration;
  const scope = scopeLabel(filters);
  const current = data?.trend?.at(-1)?.[indicator.key];
  const previous = data?.trend?.at(-2)?.[indicator.key];
  const comparable = Number.isFinite(current) && Number.isFinite(previous);
  const change = comparable ? current - previous : null;
  const changePct = comparable && previous !== 0 ? ((current - previous) / previous) * 100 : null;
  const completeness = cards.completeness?.value;
  const hasCompleteness = typeof completeness === "number";
  const period = data?.latestPeriod ?? "No reporting period";
  const previewToggle = () => {
    const next = !preview;
    setPreview(next);
    setFilters(next ? { ...DEFAULT_FILTERS, season: "Season A" } : DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Panel 2 · Analytics & planning"
        title="Agricultural Intelligence Workspace"
        description="Integrated agricultural overview, predictive risk assessment, digital twin policy simulator, and evidence-grounded AI analyst."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={previewToggle} aria-pressed={preview} className="gap-1.5 text-xs">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              {preview ? "Return to connected data" : "Preview sample data"}
            </Button>
            <Button size="sm" asChild className="gap-1.5 text-xs">
              <Link to="/explore">
                Explore data
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </>
        }
      />

      {/* Primary Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-2">
        {[
          { id: "overview", label: "Overview", icon: Layers3 },
          { id: "risk", label: "Predictive Risk & Response", icon: ShieldAlert },
          { id: "twin", label: "Digital Twin & Simulator", icon: Cpu },
          { id: "analyst", label: "AI Agricultural Analyst", icon: Sparkles },
          { id: "governance", label: "Model Governance", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "risk" && <RiskIntelligencePanel />}
      {activeTab === "twin" && <DigitalTwinPanel />}
      {activeTab === "analyst" && <AIAnalystPanel />}
      {activeTab === "governance" && <ModelGovernancePanel />}

      {activeTab === "overview" && (
        <div className="space-y-5">
          {demonstration && (
            <DemoNotice>
              <strong>Illustrative dashboard preview.</strong> Generated sample values show the layout and workflow. These are not official NISR statistics.
              {preview && " Filters are fixed to the sample scope."}
            </DemoNotice>
          )}
          {live.error && !preview && (
            <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Connected data could not be loaded. {live.error.message}
            </div>
          )}

          {live.isLoading && !preview && (
            <p role="status" className="text-xs text-muted-foreground">
              Loading all records for the selected scope…
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            <Link to="/weather" className="font-medium text-primary underline">
              Weather & climate
            </Link>{" "}
            · real NASA POWER rainfall, temperature, seasonal comparisons and climate context.
          </p>
          <FilterBar
            fields={FILTER_FIELDS}
            filters={filters}
            disabled={preview}
            onChange={(key, value) => setFilters((old) => ({ ...old, [key]: value }))}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          >
            <p className="text-[11px] text-muted-foreground">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              {scope}
              <span className="mx-2 text-border">|</span>
              {period}
            </p>
          </FilterBar>

          <section aria-label="Headline indicators" className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4 xl:grid-cols-4">
            <StatCard
              icon={Sprout}
              label="Total production"
              value={cards.production?.value}
              unitShort="t"
              deltaPct={cards.production?.deltaPct}
              deltaLabel="vs previous period"
              footnote={data?.latestPeriod ?? "No compatible production records"}
            />
            <StatCard
              icon={Layers3}
              label="Harvested area"
              value={cards.harvested_area?.value}
              unitShort="ha"
              deltaPct={cards.harvested_area?.deltaPct}
              deltaLabel="vs previous period"
              footnote={data?.latestPeriod ?? "No compatible area records"}
            />
            <StatCard
              icon={TrendingUp}
              label="Yield"
              value={cards.yield?.value}
              digits={2}
              unitShort="t/ha"
              deltaPct={cards.yield?.deltaPct}
              deltaLabel="vs previous period"
              footnote="Production ÷ compatible harvested area"
            />
            <StatCard
              icon={Eye}
              label={"Change in " + indicator.label.toLowerCase()}
              value={change}
              digits={indicator.derived ? 2 : 0}
              unitShort={indicator.unitShort}
              deltaPct={changePct}
              deltaLabel="vs previous period"
              footnote={comparable ? data.previousPeriod + " → " + period : "Two comparable periods are needed"}
            />
          </section>

          <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_290px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <DashboardCard
              title={indicator.label + " over time"}
              subtitle={scope + " · one point per agricultural year"}
              action={<ToneTag tone={demonstration ? "warning" : "outline"}>{demonstration ? "Sample preview" : indicator.unitShort}</ToneTag>}
              contentClassName="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {indicator.label} · {indicator.unit}
                </span>
                <span>{data?.trend?.length ? data.trend[0].label + "–" + data.trend.at(-1).label : "Reporting years unavailable"}</span>
              </div>
              <TrendChart
                data={data?.trend ?? []}
                series={[{ key: indicator.key, label: indicator.label, digits: indicator.derived ? 2 : 0 }]}
                unitShort={indicator.unitShort}
                height={260}
                emptyMessage="Connect a compatible dataset to see changes over time, or use the labelled sample preview."
              />
              <SourceNote
                dataset={data?.datasetName}
                period={data?.latestPeriod}
                geography={filters.district === "all" ? "All districts" : filters.district}
                unit={indicator.unit}
                quality={demonstration ? "Illustrative sample" : data ? "Connected dataset" : "No data connected"}
              />
              {filters.crop === "all" && !preview && (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Historical releases can cover different crop categories. These are totals for available main categories; select one crop to examine a consistent crop series. Subtypes are excluded from combined totals.
                </p>
              )}
            </DashboardCard>

            <DashboardCard
              title="Needs attention"
              subtitle="Signals for human review"
              action={<ToneTag tone="outline">{alerts.length}</ToneTag>}
              contentClassName="flex h-[calc(100%-73px)] flex-col gap-3"
            >
              {alerts.length ? (
                alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <ToneTag tone={severityTone(alert.severity)}>{severityLabel(alert.severity)}</ToneTag>
                    <p className="mt-2 text-[12px] font-medium leading-relaxed">{alert.title}</p>
                    <p className="mt-1.5 text-[10.5px] text-muted-foreground">{alert.period}</p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={BellRing}
                  title="No signals to review"
                  description="Alerts appear when a documented rule finds a change in comparable records."
                  className="flex-1 px-1 py-8"
                />
              )}
            </DashboardCard>
          </div>

          <p className="text-xs text-muted-foreground">
            Explore inputs, irrigation, land use, households, livestock and survey quality in the{" "}
            <a href="/explore#published-tables" className="font-medium text-primary underline">
              full published data library
            </a>
            .
          </p>
          {!preview && (
            <WeatherContext
              key={[filters.district, filters.crop, filters.season, data?.trend?.at(-1)?.year].join("|")}
              district={filters.district}
              crop={filters.crop}
              season={filters.season === "all" ? "Season B" : filters.season}
              year={data?.trend?.at(-1)?.year ?? 2025}
            />
          )}
          <SourcePublications sources={data?.sources} />

          <DashboardCard
            title="Recent investigations"
            subtitle="Evidence, ownership and progress in one place"
            action={<DashboardLink to="/reports">View reports</DashboardLink>}
            contentClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[590px] text-left text-[12px]">
                <thead className="border-b border-border/70 bg-muted/35 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {["Investigation", "Location & crop", "Period", "Assigned to", "Status"].map((title) => (
                      <th key={title} className="px-5 py-3 font-medium">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {investigations.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/25">
                      <td className="max-w-[300px] px-5 py-4 font-medium">{item.title}</td>
                      <td className="px-5 py-4 text-muted-foreground">{[item.district, item.crop].filter(Boolean).join(" · ") || "Not recorded"}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{item.period ?? "Not recorded"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{item.assignee_name || "Unassigned"}</td>
                      <td className="px-5 py-4">
                        <ToneTag tone={investigationStatusTone(item.status)}>{investigationStatusLabel(item.status)}</ToneTag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!investigations.length && (
              <EmptyState
                icon={ClipboardList}
                title="No investigations recorded"
                description="Investigation summaries will appear here as authorized records become available."
                className="py-10"
              />
            )}
            {preview && <p className="border-t border-border px-5 py-3 text-[10.5px] text-amber-800">Sample investigations illustrate this table. They are not saved records.</p>}
          </DashboardCard>

          <div className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              Read every figure with its period, unit and source. Reporting coverage and changes in harvested area should be checked before interpreting a change in production.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
