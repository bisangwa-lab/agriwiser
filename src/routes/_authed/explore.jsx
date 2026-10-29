import { sourceProvenance } from "@/lib/source-provenance";
import { SourceTableLibrary } from "@/components/data/SourceTableLibrary";
import { createFileRoute } from "@tanstack/react-router";
import { requireWorkspace } from "@/lib/route-access";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterBar } from "@/components/common/FilterBar";
import { EmptyState } from "@/components/common/EmptyState";
import { SourceNote } from "@/components/common/SourceNote";
import { DemoNotice } from "@/components/common/DemoNotice";
import { ToneTag, observationStatusLabel, observationStatusTone } from "@/components/common/ToneTag";
import { TrendChart } from "@/components/charts/TrendChart";
import { ExplainChangeButton } from "@/components/explain/ExplainChangeDialog";
import { useObservations } from "@/hooks/useObservations";
import { useDatasets } from "@/hooks/useAgriRecords";
import { CROPS, cropLabel, DISTRICT_NAMES, INDICATORS, SEASONS } from "@/lib/constants";
import { coverage, percentageChange, seriesByYear } from "@/lib/metrics";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatNumber, formatValue } from "@/lib/format";
import { CloudRain, Download, Database, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authed/explore")({
  beforeLoad: requireWorkspace(["planner", "data_manager"]),
  head: () => ({ meta: [{ title: "Explore data · HingaSmart Rwanda" }] }),
  component: ExplorePage,
});

const DEFAULT_FILTERS = { crop: "Maize", district: "all", season: "Season B", indicator: "production" };

const FILTER_FIELDS = [
  { key: "crop", label: "Crop", allLabel: "All available crops", options: CROPS.map((c) => ({ value: c, label: cropLabel(c) })) },
  {
    key: "district",
    label: "District",
    allLabel: "All districts",
    options: DISTRICT_NAMES.map((name) => ({ value: name, label: name })),
  },
  { key: "season", allowAll: false, label: "Season", allLabel: "Available seasons", options: SEASONS.map((s) => ({ value: s, label: s })) },
  {
    key: "indicator",
    allowAll: false,
    label: "Indicator",
    allLabel: "Production",
    options: ["production", "harvested_area", "cultivated_area", "yield", "reported_yield"].map((key) => ({ value: key, label: INDICATORS[key].label })),
  },
];

function ExplorePage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [recordPage, setRecordPage] = useState(0);
  const crop = filters.crop !== "all" ? filters.crop : undefined;
  const district = filters.district !== "all" ? filters.district : undefined;
  const season = filters.season !== "all" ? filters.season : undefined;
  const indicator = filters.indicator;

  const meta = INDICATORS[indicator] ?? INDICATORS.production;
  const digits = meta.derived ? 2 : 0;

  const { data: rows = [], isLoading, error } = useObservations({ domain: "crop", crop, district, season });
  const { data: rainfallRows = [] } = useObservations(
    district ? { domain: "climate", district } : { domain: "climate", district: "Gasabo" },
  );
  const { data: datasets = [] } = useDatasets();

  const series = useMemo(() => seriesByYear(rows), [rows]);
  const latest = series.length ? series[series.length - 1] : null;
  const previous = series.length > 1 ? series[series.length - 2] : null;

  const expected = rows.length;
  const scope = useMemo(() => coverage(rows, expected), [rows, expected]);

  const { dataset } = sourceProvenance(datasets, rows);

  const tableRows = useMemo(
    () =>
      [...rows]
        .sort((a, b) => Number(b.year) - Number(a.year) || String(a.season).localeCompare(String(b.season))),
    [rows],
  );

  const rainfallSeries = useMemo(() => seriesByYear(rainfallRows), [rainfallRows]);
  const periodLabel = season ? `${latest?.year} ${season}` : String(latest?.year ?? "");

  const explainPayload =
    latest && previous
      ? {
          indicator,
          current: latest[indicator],
          previous: previous[indicator],
          currentPeriod: periodLabel,
          previousPeriod: season ? `${previous.year} ${season}` : String(previous.year),
          crop: crop ?? "all crops",
          geography: district ?? "all districts",
          season: season ?? "available seasons",
          dataset,
          qualityFlags: [...new Set(rows.flatMap((row) => row.quality_flags ?? []))].slice(0, 8),
          coverage: scope,
        }
      : null;

  function exportCsv() {
    const csv = toCsv(
      rows.map((row) => ({
        dataset: row.dataset_name,
        geography: row.geography,
        province: row.province,
        crop: row.crop,
        season: row.season,
        year: row.year,
        period: row.period,
        indicator: row.indicator,
        value: row.value,
        unit: row.unit,
        observation_status: row.observation_status,
        quality_flags: (row.quality_flags ?? []).join(" | "),
        source_url: row.source_url,
        source_reference: row.source_reference,
      })),
      [
        "dataset",
        "geography",
        "province",
        "crop",
        "season",
        "year",
        "period",
        "indicator",
        "value",
        "unit",
        "observation_status",
        "quality_flags",
        "source_url",
        "source_reference",
      ],
    );
    downloadCsv(`hingasmart-observations-${indicator}-${crop ?? "all-crops"}.csv`, csv);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Explore"
        title="Explore agricultural data"
        description="Select a crop, district, season and indicator. Charts and the table below always show the same filtered records, with their unit, period, source and quality status."
        actions={
          <div className="flex flex-wrap gap-2">
            <ExplainChangeButton payload={explainPayload} />
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Export filtered rows (CSV)
            </Button>
          </div>
        }
      />

      <p className="text-xs text-muted-foreground">Need seeds, fertilizer, irrigation, livestock, household or survey-quality data? <a href="#published-tables" className="font-medium text-primary underline">Browse the full published data library</a>.</p>
      {dataset?.quality_status === "demonstration" ? <DemoNotice /> : null}

      <SourceTableLibrary />
      <FilterBar
        fields={FILTER_FIELDS}
        filters={filters}
        onChange={(key, value) => { setRecordPage(0); setFilters((prev) => ({ ...prev, [key]: value })); }}
        onReset={() => { setRecordPage(0); setFilters(DEFAULT_FILTERS); }}
      >
        <p className="text-[11.5px] text-muted-foreground">
          {isLoading ? "Loading observations…" : `${formatNumber(rows.length)} matching observations`}
          {scope.missing ? ` · ${scope.missing} values are missing and were not estimated` : ""}
        </p>
      </FilterBar>

      {error ? (
        <Card>
          <EmptyState
            icon={Database}
            title="The observations could not be loaded"
            description={error.message || "The data service did not answer."}
          />
        </Card>
      ) : null}

      <Card className="panel border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {meta.label} by year — {crop ?? "all crops"}, {district ?? "all districts"}
              </CardTitle>
              <CardDescription className="mt-1 text-[12.5px]">
                {season ?? "Available seasons"} · {series.length} year{series.length === 1 ? "" : "s"} with data
              </CardDescription>
            </div>
            <ToneTag tone="outline">{meta.unit}</ToneTag>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLoading && !series.length ? (
            <EmptyState
              icon={TrendingUp}
              title="No records match these filters"
              description="Nothing in the loaded data matches this combination of crop, district and season. Try widening a filter, or check Data sources for what the dataset covers."
              className="py-12"
            />
          ) : (
            <TrendChart
              data={series}
              series={[{ key: indicator, label: meta.label, digits }]}
              unitShort={meta.unitShort}
              emptyMessage="No compatible observations for this combination."
            />
          )}
          <SourceNote
            dataset={dataset?.name ?? "Loaded dataset"}
            period={latest ? periodLabel : "—"}
            geography={district ?? "All districts"}
            unit={meta.unit}
            quality={
              dataset?.quality_status === "demonstration"
                ? "Demonstration data"
                : rows.length
                  ? observationStatusLabel(rows[0].observation_status)
                  : "—"
            }
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Indicator definition, units and limitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                {meta.label} ({meta.unit})
              </span>{" "}
              — {meta.definition}
            </p>
            <dl className="grid gap-x-5 gap-y-2 text-[12.5px] sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground/80">Reporting period</dt>
                <dd className="font-medium text-foreground">{dataset?.reporting_period ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground/80">Geography level</dt>
                <dd className="font-medium text-foreground">{dataset?.geography_level ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground/80">Observations in scope</dt>
                <dd className="num font-medium text-foreground">
                  {formatNumber(scope.present)} of {formatNumber(expected)} available source cells
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground/80">Data-quality status</dt>
                <dd className="font-medium text-foreground">
                  {dataset?.quality_status === "demonstration" ? "Demonstration data" : (dataset?.quality_status ?? "Not recorded")}
                </dd>
              </div>
            </dl>
            {[...new Set(rows.flatMap((row) => row.quality_flags ?? []))].length ? (
              <ul className="space-y-1 rounded-lg border border-amber-300/70 bg-amber-50/70 p-3 text-[12px] leading-relaxed text-amber-900">
                {[...new Set(rows.flatMap((row) => row.quality_flags ?? []))].slice(0, 5).map((flag) => (
                  <li key={flag}>• {flag}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-[12px] text-muted-foreground/80">
              Missing observations are reported as missing. They are never replaced with zero or with an
              average, and a percentage change is not produced from a zero baseline.
            </p>
            <a href="/weather" className="inline-block text-xs font-medium text-primary underline">Open NASA POWER weather & climate analysis</a>
          </CardContent>
        </Card>

        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CloudRain className="h-4 w-4 text-muted-foreground" aria-hidden />
              Weather context
            </CardTitle>
            <CardDescription className="text-[12.5px]">
              {district
                ? `Seasonal rainfall for ${district}, from a gridded product aggregated to district boundaries.`
                : "Seasonal rainfall for Gasabo, shown as an example. Choose a district to see its own context."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <TrendChart
              data={rainfallSeries}
              series={[{ key: "rainfall_mm", label: "Seasonal rainfall", digits: 0 }]}
              unitShort="mm"
              height={220}
              emptyMessage="No rainfall context is loaded for this selection."
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Rainfall here is an areal estimate for the district and season, not a measurement at a farm, and
              its window is the agricultural season rather than a crop calendar. It is context: two series
              moving together is not evidence that one caused the other.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="panel border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Records behind the chart</CardTitle>
          <CardDescription className="text-[12.5px]">
            All matching observations are available across pages and in the CSV export. Units, period and quality status travel with every row.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tableRows.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No rows to show"
              description="Adjust the filters to see the observations behind the series."
              className="py-8"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Indicator</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.slice(recordPage*100,(recordPage+1)*100).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="num whitespace-nowrap">{row.period}</TableCell>
                      <TableCell>{row.crop ?? "—"}</TableCell>
                      <TableCell>{row.geography}</TableCell>
                      <TableCell>{INDICATORS[row.indicator]?.label ?? row.indicator}</TableCell>
                      <TableCell className="num text-right font-medium">{formatValue(row.value, "", digits)}</TableCell>
                      <TableCell className="text-muted-foreground">{row.unit}</TableCell>
                      <TableCell>
                        <ToneTag tone={observationStatusTone(row.observation_status)}>
                          {observationStatusLabel(row.observation_status)}
                        </ToneTag>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{formatNumber(tableRows.length)} matching records · page {recordPage+1} of {Math.max(1,Math.ceil(tableRows.length/100))}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={recordPage===0} onClick={()=>setRecordPage(value=>value-1)}>Previous records</Button><Button size="sm" variant="outline" disabled={(recordPage+1)*100>=tableRows.length} onClick={()=>setRecordPage(value=>value+1)}>Next records</Button></div></div>
        </CardContent>
      </Card>
    </div>
  );
}
