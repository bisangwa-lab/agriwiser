import { sourceProvenance } from "@/lib/source-provenance";
import { DistrictMap } from "@/components/maps/DistrictMap";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireWorkspace } from "@/lib/route-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SourceNote } from "@/components/common/SourceNote";
import { ToneTag } from "@/components/common/ToneTag";
import { ComparisonBarChart } from "@/components/charts/ComparisonBarChart";
import { ExplainChangeButton } from "@/components/explain/ExplainChangeDialog";
import { useObservations } from "@/hooks/useObservations";
import { useDatasets } from "@/hooks/useAgriRecords";
import { CROPS, DISTRICT_NAMES, INDICATORS, SEASONS, YEARS } from "@/lib/constants";
import { absoluteChange, yieldFromRows, percentageChange, toNumber } from "@/lib/metrics";
import { formatNumber, formatValue, NOT_AVAILABLE } from "@/lib/format";
import { ArrowLeftRight, Download } from "lucide-react";
import { downloadCsv, toCsv } from "@/lib/csv";

export const Route = createFileRoute("/_authed/compare")({
  validateSearch: (search) => ({
    ...(CROPS.includes(search.crop) ? { crop: search.crop } : {}),
    ...(SEASONS.includes(search.season) ? { season: search.season } : {}),
    ...(YEARS.includes(Number(search.year)) ? { year: Number(search.year) } : {}),
    ...(Number.isInteger(Number(search.compareYear)) && Number(search.compareYear)>=1900 && Number(search.compareYear)<=2100 ? { compareYear: Number(search.compareYear) } : {}),
    ...(SEASONS.includes(search.compareSeason) ? { compareSeason: search.compareSeason } : {}),
    ...(["production", "yield", "trend", "quality", "weather"].includes(search.mapView) ? { mapView: search.mapView } : {}),
  }),
  beforeLoad: requireWorkspace(["planner", "data_manager"]),
  head: () => ({ meta: [{ title: "Compare · HingaSmart Rwanda" }] }),
  component: ComparePage,
});

const MODES = [
  { key: "districts", label: "Districts" },
  { key: "crops", label: "Crops" },
  { key: "years", label: "Years" },
];

function totalsFor(rows, indicator) {
  let production = null;
  let harvested_area = null;
  let count = 0;
  for (const row of rows) {
    const value = toNumber(row.value);
    if (value === null) continue;
    count += 1;
    if (row.indicator === "production") production = (production ?? 0) + value;
    if (row.indicator === "harvested_area") harvested_area = (harvested_area ?? 0) + value;
  }
  const value = indicator === "yield" ? yieldFromRows(rows) : indicator === "production" ? production : harvested_area;
  return { value, count, production, harvested_area };
}

function ComparePage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState("districts");
  const [crop, setCrop] = useState(search.crop ?? "Maize");
  const [district, setDistrict] = useState("Kirehe");
  const [season, setSeason] = useState(search.season ?? "Season B");
  const [indicator, setIndicator] = useState("production");
  const [yearA, setYearA] = useState(String(search.compareYear ?? 2025));
  const [baselineSeason, setBaselineSeason] = useState(search.compareSeason ?? search.season ?? "Season B");
  const [yearB, setYearB] = useState(String(search.year ?? 2026));
  const [entityA, setEntityA] = useState("");
  const [entityB, setEntityB] = useState("");

  const meta = INDICATORS[indicator] ?? INDICATORS.production;
  const digits = meta.derived ? 2 : 0;

  const query = useMemo(() => {
    if (mode === "districts") return { domain: "crop", crop, season: season === "all" ? undefined : season, year: yearB };
    if (mode === "crops") return { domain: "crop", includeSubtypes: true, district, season: season === "all" ? undefined : season, year: yearB };
    return { domain: "crop", crop, district };
  }, [mode, crop, district, season, yearB]);

  const { data: rows = [], isLoading } = useObservations(query);
  const { data: datasets = [] } = useDatasets();

  const options = useMemo(() => {
    if (mode === "districts") {
      return [...new Set(rows.map((row) => row.geography))].sort().map((name) => ({ value: name, label: name }));
    }
    if (mode === "crops") {
      return [...new Set(rows.map((row) => row.crop).filter(Boolean))].sort().map((name) => ({ value: name, label: name }));
    }
    return [...new Set(rows.map((row) => Number(row.year)))].sort((a, b) => a - b).map((year) => ({ value: String(year), label: String(year) }));
  }, [rows, mode]);

  useEffect(() => {
    if (!options.length) return;
    if (!options.some((option) => option.value === entityA)) setEntityA(options[0].value);
    if (!options.some((option) => option.value === entityB)) setEntityB(options[Math.min(1, options.length - 1)].value);
  }, [options, entityA, entityB]);

  const compared = useMemo(() => {
    if (mode === "years") {
      const seasonFilter = season === "all" ? undefined : season;
      const rowsA = rows.filter((row) => Number(row.year) === Number(yearA) && (!seasonFilter || row.season === baselineSeason));
      const rowsB = rows.filter((row) => Number(row.year) === Number(yearB) && (!seasonFilter || row.season === seasonFilter));
      return {
        labelA: yearA,
        labelB: yearB,
        a: totalsFor(rowsA, indicator),
        b: totalsFor(rowsB, indicator),
        periodA: season === "all" ? String(yearA) : `${yearA} ${baselineSeason}`,
        periodB: season === "all" ? String(yearB) : `${yearB} ${season}`,
      };
    }
    const key = mode === "districts" ? "geography" : "crop";
    const rowsA = rows.filter((row) => row[key] === entityA);
    const rowsB = rows.filter((row) => row[key] === entityB);
    const period = season === "all" ? String(yearB) : `${yearB} ${season}`;
    return {
      labelA: entityA,
      labelB: entityB,
      a: totalsFor(rowsA, indicator),
      b: totalsFor(rowsB, indicator),
      periodA: period,
      periodB: period,
    };
  }, [rows, mode, indicator, entityA, entityB, yearA, yearB, season, baselineSeason]);

  const absolute = absoluteChange(compared.b.value, compared.a.value);
  const percent = percentageChange(compared.b.value, compared.a.value);
  const { dataset } = sourceProvenance(datasets, rows);

  const chartRows = [
    { name: compared.labelA, value: compared.a.value },
    { name: compared.labelB, value: compared.b.value },
  ].filter((row) => typeof row.value === "number");

  const comparisonTable = [
    { id: "indicator", metric: `${meta.label} (selected)`, unit: meta.unit, a: compared.a.value, b: compared.b.value },
    { id: "observations", metric: "Observations used", unit: "records", a: compared.a.count, b: compared.b.count },
    { id: "production", metric: "Production", unit: "metric tonnes", a: compared.a.production, b: compared.b.production },
    { id: "area", metric: "Harvested area", unit: "hectares", a: compared.a.harvested_area, b: compared.b.harvested_area },
  ];

  function exportCsv() {
    const csv = toCsv(
      [
        {
          comparison: mode,
          entity_a: compared.labelA,
          entity_b: compared.labelB,
          period_a: compared.periodA,
          period_b: compared.periodB,
          crop: mode === "crops" ? `${entityA} vs ${entityB}` : crop,
          district: mode === "districts" ? `${entityA} vs ${entityB}` : district,
          indicator,
          unit: meta.unit,
          value_a: compared.a.value,
          value_b: compared.b.value,
          absolute_change: absolute.value,
          percentage_change: percent.value,
          dataset: dataset?.name ?? "",
          generated_at: new Date().toISOString(),
        },
      ],
      [
        "comparison",
        "entity_a",
        "entity_b",
        "period_a",
        "period_b",
        "crop",
        "district",
        "indicator",
        "unit",
        "value_a",
        "value_b",
        "absolute_change",
        "percentage_change",
        "dataset",
        "generated_at",
      ],
    );
    downloadCsv(`hingasmart-comparison-${mode}-${indicator}.csv`, csv);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compare"
        title="Compare districts, crops and years"
        description="Only compatible values are compared: the same crop, indicator, unit, geography level and period meaning. When the baseline is missing or zero, the change is reported as not calculable rather than as a number."
        actions={
          <div className="flex flex-wrap gap-2">
            <ExplainChangeButton
              payload={
                compared.a.value === null || compared.b.value === null
                  ? null
                  : {
                      indicator,
                      current: compared.b.value,
                      previous: compared.a.value,
                      currentPeriod: compared.periodB,
                      previousPeriod: compared.periodA,
                      crop: mode === "crops" ? `${entityA} vs ${entityB}` : crop,
                      geography: mode === "districts" ? `${entityA} vs ${entityB}` : district,
                      season: season === "all" ? "available seasons" : season,
                      dataset,
                    }
              }
            />
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!chartRows.length}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Export comparison (CSV)
            </Button>
          </div>
        }
      />

      <section id="district-map" className="scroll-mt-24"><DistrictMap large initialMode={search.mapView ?? "yield"} crop={crop} season={season === "all" ? "Season B" : season} year={yearB}
        compareYear={yearA} compareSeason={baselineSeason} onCompareYearChange={setYearA} onCompareSeasonChange={setBaselineSeason}
        onCropChange={setCrop} onSeasonChange={setSeason} onYearChange={setYearB} /></section>

      <Card className="panel border-0 shadow-none">
        <CardContent className="space-y-4 pt-5">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList>
              {MODES.map((item) => (
                <TabsTrigger key={item.key} value={item.key}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {mode !== "crops" ? (
              <div className="space-y-1.5">
                <Label className="text-[11.5px] text-muted-foreground">Crop</Label>
                <Select value={crop} onValueChange={setCrop}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CROPS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {mode !== "districts" ? (
              <div className="space-y-1.5">
                <Label className="text-[11.5px] text-muted-foreground">District</Label>
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRICT_NAMES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-[11.5px] text-muted-foreground">Season</Label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEASONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11.5px] text-muted-foreground">Indicator</Label>
              <Select value={indicator} onValueChange={setIndicator}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["production", "harvested_area", "yield"].map((key) => (
                    <SelectItem key={key} value={key}>
                      {INDICATORS[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-[11.5px] text-muted-foreground">
                {mode === "districts" ? "District A" : mode === "crops" ? "Crop A" : "Year A"}
              </Label>
              <Select value={entityA} onValueChange={setEntityA}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11.5px] text-muted-foreground">
                {mode === "districts" ? "District B" : mode === "crops" ? "Crop B" : "Year B"}
              </Label>
              <Select value={entityB} onValueChange={setEntityB}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mode === "years" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[11.5px] text-muted-foreground">Year A value</Label>
                  <Select value={yearA} onValueChange={setYearA}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11.5px] text-muted-foreground">Year B value</Label>
                  <Select value={yearB} onValueChange={setYearB}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-[11.5px] text-muted-foreground">Period</Label>
                <Select value={yearB} onValueChange={setYearB}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {season === "all" ? String(year) : `${year} ${season}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selected values</CardTitle>
            <CardDescription className="text-[12.5px]">
              {compared.labelA} versus {compared.labelB} · {meta.label} · {meta.unit}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {compared.a.value === null || compared.b.value === null ? (
              <EmptyState
                icon={ArrowLeftRight}
                title="A comparison cannot be made here"
                description={
                  compared.a.value === null
                    ? `${compared.labelA} has no valid value for these filters, so no difference is shown. Missing values are not treated as zero.`
                    : `${compared.labelB} has no valid value for these filters, so no difference is shown.`
                }
                className="py-10"
              />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-3.5">
                    <p className="text-[11.5px] uppercase tracking-wide text-muted-foreground">{compared.labelA}</p>
                    <p className="num text-xl font-semibold">{formatValue(compared.a.value, meta.unitShort, digits)}</p>
                    <p className="text-[11.5px] text-muted-foreground">{compared.periodA}</p>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-accent/50 p-3.5">
                    <p className="text-[11.5px] uppercase tracking-wide text-accent-foreground/70">{compared.labelB}</p>
                    <p className="num text-xl font-semibold">{formatValue(compared.b.value, meta.unitShort, digits)}</p>
                    <p className="text-[11.5px] text-accent-foreground/70">{compared.periodB}</p>
                  </div>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/50 p-3.5">
                    <dt className="text-[11.5px] uppercase tracking-wide text-muted-foreground">Absolute difference</dt>
                    <dd className="num text-lg font-semibold">
                      {absolute.value === null
                        ? NOT_AVAILABLE
                        : `${absolute.value > 0 ? "+" : ""}${formatValue(absolute.value, meta.unitShort, digits)}`}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3.5">
                    <dt className="text-[11.5px] uppercase tracking-wide text-muted-foreground">Percentage difference</dt>
                    <dd className="num text-lg font-semibold">
                      {percent.value === null
                        ? "Not calculable"
                        : `${percent.value > 0 ? "+" : ""}${percent.value.toFixed(1)}%`}
                    </dd>
                    {percent.reason === "zero_baseline" ? (
                      <p className="text-[11px] text-muted-foreground">
                        The earlier value is zero, so a percentage has no meaning here.
                      </p>
                    ) : null}
                  </div>
                </dl>

                <ComparisonBarChart
                  rows={chartRows}
                  unitShort={meta.unitShort}
                  digits={digits}
                  height={190}
                  highlightKeys={[compared.labelB]}
                />

                <SourceNote
                  dataset={dataset?.name ?? "Loaded dataset"}
                  period={`${compared.periodA} → ${compared.periodB}`}
                  geography={mode === "districts" ? `${compared.labelA}, ${compared.labelB}` : district}
                  unit={meta.unit}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comparison table and calculation</CardTitle>
            <CardDescription className="text-[12.5px]">
              The same records, shown as values so the comparison can be checked by hand.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Measure</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">{compared.labelA}</TableHead>
                    <TableHead className="text-right">{compared.labelB}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonTable.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.metric}</TableCell>
                      <TableCell className="text-muted-foreground">{row.unit}</TableCell>
                      <TableCell className="num text-right">
                        {row.a === null || row.a === undefined ? NOT_AVAILABLE : formatNumber(row.a, row.unit === "t/ha" ? 2 : 0)}
                      </TableCell>
                      <TableCell className="num text-right">
                        {row.b === null || row.b === undefined ? NOT_AVAILABLE : formatNumber(row.b, row.unit === "t/ha" ? 2 : 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3.5 text-[12px] leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Method</p>
              <p>Absolute change = current value − previous value.</p>
              <p>Percentage change = ((current value − previous value) ÷ previous value) × 100.</p>
              <p>
                Percentage change is shown as “Not calculable” when the previous value is zero or missing. Yield
                is always derived from the group's own production and harvested area, never averaged.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ToneTag tone="outline">{mode === "years" && season !== "all" && baselineSeason !== season ? "Different seasons selected" : "Comparability checked"}</ToneTag>
              <span className="text-[11.5px] text-muted-foreground">
                {mode === "years" && season !== "all" && baselineSeason !== season ? "Seasonal conditions can differ. Review both reporting periods before interpreting the change." : "Both sides use the same crop, indicator, unit, geography level and period meaning."}
              </span>
            </div>

            {isLoading ? <p className="text-[12px] text-muted-foreground">Loading observations…</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
