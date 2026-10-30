import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CloudRain,
  Info,
  Loader2,
  TriangleAlert,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToneTag } from "@/components/common/ToneTag";
import { DistrictMap } from "@/components/maps/DistrictMap";
import { ComparisonBarChart } from "@/components/charts/ComparisonBarChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { useObservations } from "@/hooks/useObservations";
import { useDatasets } from "@/hooks/useAgriRecords";
import { exploreData } from "@/lib/explore-data";
import { getDistrictRiskAssessment } from "@/lib/intelligence/server-fns";
import { DISTRICT_NAMES, INDICATORS, YEARS } from "@/lib/constants";
import { formatNumber, formatSignedPercent } from "@/lib/format";
import { useAgriculturalSolutions } from "@/components/agricultural-solutions/AgriculturalSolutionsLayout";

const INDICATOR_OPTIONS = [
  { value: "production", label: "Production (t)" },
  { value: "harvested_area", label: "Harvested area (ha)" },
  { value: "yield", label: "Yield (t/ha)" },
];

export function FindProblems() {
  const { crop, district, season, year, setContext } = useAgriculturalSolutions();
  const [indicator, setIndicator] = useState("production");
  const [view, setView] = useState("overview");
  const [baselineYear, setBaselineYear] = useState(() => (Math.max(...YEARS) - 1));

  const observations = useObservations({ domain: "crop", crop: crop === "all" ? undefined : crop, season });
  const { data: datasets = [] } = useDatasets();

  const effectiveBaseline = YEARS.includes(baselineYear) && baselineYear !== year
    ? baselineYear
    : YEARS.filter((y) => y !== year).slice(-1)[0];

  const exploration = useMemo(() => {
    if (!observations.data) return null;
    return exploreData(observations.data, {
      crop,
      district,
      season,
      indicator,
      fromYear: Math.min(...YEARS),
      toYear: year,
      baselineYear: effectiveBaseline,
    });
  }, [observations.data, crop, district, season, indicator, year, effectiveBaseline]);

  const districtRanking = useMemo(
    () => (exploration?.districtComparisons ?? []).filter((d) => d.change !== null),
    [exploration],
  );
  const declined = districtRanking.filter((d) => d.change < 0);
  const improved = districtRanking.filter((d) => d.change > 0);

  const sourceSummaries = useMemo(() => {
    if (!exploration) return [];
    const ids = new Set(exploration.sourceRows.map((row) => row.dataset_id).filter(Boolean));
    return datasets
      .filter((d) => ids.has(d.id))
      .map((d) => ({
        id: d.id,
        name: d.name,
        publisher: d.publisher ?? "Publisher not recorded",
        periods: [...new Set(exploration.sourceRows.filter((r) => r.dataset_id === d.id).map((r) => r.year))].sort(),
      }));
  }, [exploration, datasets]);

  if (observations.isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading agricultural observations…</p>
        </CardContent>
      </Card>
    );
  }

  if (!exploration) {
    return (
      <Card>
        <CardContent className="flex items-start gap-2 py-10 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span>Observations could not be read, so no problem can be identified. Nothing below is estimated.</span>
        </CardContent>
      </Card>
    );
  }

  const { current, previous, change, comparisonReason } = exploration;
  const meta = INDICATORS[indicator];
  const digits = indicator === "yield" ? 2 : 0;

  return (
    <div className="space-y-6">
      <Tabs value={view} onValueChange={setView} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">Productivity</TabsTrigger>
          <TabsTrigger value="districts">District priority</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="risk">Risk evidence</TabsTrigger>
        </TabsList>

        {/* ── Productivity ───────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label={`Current ${meta.label}`}
              value={current.value !== null ? formatNumber(current.value, digits) : "—"}
              note={`${year} ${season} · ${current.present} of ${current.expected} source values`}
            />
            <StatCard
              label={`Baseline ${meta.label}`}
              value={previous.value !== null ? formatNumber(previous.value, digits) : "—"}
              note={`${effectiveBaseline} ${season} · ${previous.present} of ${previous.expected} source values`}
            />
            <StatCard
              label="Change"
              value={change !== null ? formatSignedPercent(change, 1) : "—"}
              tone={change === null ? undefined : change < 0 ? "bad" : change > 0 ? "good" : undefined}
              note={comparisonReason ?? "Compared against the baseline period"}
            />
          </div>

          {change === null && (
            <p role="note" className="rounded-lg bg-amber-50 p-3 text-[11.5px] leading-relaxed text-amber-900">
              <Info className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Totals are withheld whenever a required source value is missing or incompatible. A withheld total is not
              zero and must not be read as one.
            </p>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">District map — {meta.label}</CardTitle>
                  <CardDescription className="text-[12px]">
                    Select a district to inspect its values, sources and gaps. Hatched areas have no calculable value.
                    {indicator === "harvested_area" &&
                      " The map has no harvested-area layer, so it shows coverage instead — the ranking below uses area."}
                  </CardDescription>
                </div>
                <Select value={indicator} onValueChange={setIndicator}>
                  <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDICATOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <DistrictMap
                crop={crop === "all" ? "Maize" : crop}
                season={season}
                year={year}
                initialMode={indicator === "yield" ? "yield" : indicator === "production" ? "production" : "quality"}
                compareYear={effectiveBaseline}
                compareSeason={season}
                large
              />
            </CardContent>
          </Card>

          <DataQualityPanel
            exploration={exploration}
            sourceSummaries={sourceSummaries}
            scope={{ crop, district, season, year, baselineYear: effectiveBaseline }}
          />
        </TabsContent>

        {/* ── District priority ──────────────────────────────────────────── */}
        <TabsContent value="districts" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Districts to investigate</CardTitle>
                  <CardDescription className="text-[12px]">
                    {year} {season} against {effectiveBaseline} {season}, ranked on {meta.label.toLowerCase()} only.
                    Districts without a calculable value in both periods are excluded rather than assumed flat.
                  </CardDescription>
                </div>
                <div className="space-y-1">
                  <label htmlFor="fp-baseline" className="text-[10.5px] text-muted-foreground">Baseline year</label>
                  <select
                    id="fp-baseline"
                    value={effectiveBaseline}
                    onChange={(e) => setBaselineYear(Number(e.target.value))}
                    className="h-8 rounded-lg border bg-background px-2 text-xs"
                  >
                    {YEARS.filter((y) => y !== year).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {districtRanking.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-muted-foreground">
                  No district has comparable {meta.label.toLowerCase()} values in both periods for this selection.
                  Pick “All districts” in the filter above to rank the whole country.
                </p>
              ) : (
                <>
                  <ComparisonBarChart
                    rows={declined.slice(0, 12).map((d) => ({ name: d.district, value: d.change }))}
                    unitShort="%"
                    digits={1}
                    emptyMessage="No district recorded a decline for this selection."
                    explanationProps={{
                      chartType: "district ranking chart",
                      title: `${meta.label} change by district`,
                      indicator,
                      scope: district === "all" ? "All districts" : district,
                      period: `${year} ${season} vs ${effectiveBaseline} ${season}`,
                      filters: { crop, district, season, indicator },
                    }}
                  />

                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[52px]">Priority</TableHead>
                          <TableHead>District</TableHead>
                          <TableHead className="text-right">{year}</TableHead>
                          <TableHead className="text-right">{effectiveBaseline}</TableHead>
                          <TableHead className="text-right">Change</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {declined.slice(0, 10).map((d, i) => (
                          <TableRow key={d.district}>
                            <TableCell className="font-mono text-[12px]">{i + 1}</TableCell>
                            <TableCell className="font-medium">{d.district}</TableCell>
                            <TableCell className="text-right tabular-nums">{d.current !== null ? formatNumber(d.current, digits) : "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{d.previous !== null ? formatNumber(d.previous, digits) : "—"}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-red-500">{formatSignedPercent(d.change, 1)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-[11px]"
                                onClick={() => setContext((c) => ({ ...c, district: d.district }))}
                              >
                                <Link to="/agricultural-solutions/compare">
                                  Compare solutions <ArrowRight className="h-3 w-3" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {improved.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-emerald-600">
                        <TrendingUp className="h-3.5 w-3.5" /> Recorded improvements
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {improved.slice(-8).reverse().map((d) => (
                          <Badge key={d.district} variant="outline" className="text-[10.5px]">
                            {d.district} {formatSignedPercent(d.change, 1)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-dashed p-4 text-[11px] text-muted-foreground">
                    <p className="mb-2 font-medium text-foreground">How this ranking is built</p>
                    <ul className="list-disc space-y-1 pl-4">
                      <li>One indicator only — {meta.label} in {unitOf(meta)}. Indicators with different units are never mixed into a single rank.</li>
                      <li>A district appears only when both periods have complete, compatible source values.</li>
                      <li>Percentage change is undefined against a zero baseline, so those districts are listed as excluded.</li>
                      <li>A statistical decline raises a question for field verification. It does not establish a cause.</li>
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Trends ─────────────────────────────────────────────────────── */}
        <TabsContent value="trends" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{crop === "all" ? "All main crops" : crop} · {season} over time</CardTitle>
              <CardDescription className="text-[12px]">
                {meta.label} for each reporting year. A year whose required values are incomplete plots no point —
                gaps are missing evidence, not zero.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={exploration.series}
                series={[{ key: "value", label: meta.label, digits }]}
                unitShort={meta.unitShort}
                height={300}
                emptyMessage="No year in this range has complete, compatible values."
                explanationProps={{
                  chartType: "trend chart",
                  title: `${meta.label} trend`,
                  indicator,
                  scope: district === "all" ? "All districts" : district,
                  period: `${Math.min(...YEARS)}–${year} ${season}`,
                  filters: { crop, district, season, indicator },
                }}
              />
              <p className="mt-2 text-[10.5px] text-muted-foreground">
                {exploration.series.filter((s) => s.value === null).length} of {exploration.series.length} years have
                no calculable total for this selection.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Component breakdown</CardTitle>
              <CardDescription className="text-[12px]">
                Production is the product of harvested area and yield, so the three move together by construction —
                this is a decomposition, not independent evidence.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead className="text-right">{year}</TableHead>
                      <TableHead className="text-right">{effectiveBaseline}</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exploration.breakdown.map((b) => (
                      <TableRow key={b.indicator}>
                        <TableCell className="font-medium">{INDICATORS[b.indicator]?.label ?? b.indicator}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.current !== null ? formatNumber(b.current, b.indicator === "yield" ? 2 : 0) : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.previous !== null ? formatNumber(b.previous, b.indicator === "yield" ? 2 : 0) : "—"}</TableCell>
                        <TableCell className="text-right font-mono">{b.change !== null ? formatSignedPercent(b.change, 1) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Risk evidence ──────────────────────────────────────────────── */}
        <TabsContent value="risk" className="mt-4 space-y-6">
          <RiskEvidence crop={crop} district={district} season={season} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Post-harvest loss evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p role="note" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11.5px] leading-relaxed text-amber-900">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  No post-harvest loss observations, storage-stage rates or crop price series are connected to this
                  workspace. The imported records hold cultivated area, harvested area, production and published yield
                  only, so loss cannot be quantified or compared here and no loss rate is shown.
                </span>
              </p>
              <div className="rounded-lg border bg-muted/30 p-3 text-[11.5px] text-muted-foreground">
                <p className="font-medium text-foreground">Available next action</p>
                <p className="mt-1">
                  Import a loss dataset through Data management once a sourced table exists; loss comparisons then become
                  calculable. Until then Compare Solutions keeps post-harvest options disabled.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-2 gap-1.5 text-[11px]">
                  <Link to="/data-sources">Open data management</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RiskEvidence({ crop, district, season }) {
  const [assessment, setAssessment] = useState(null);
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState(null);
  const single = crop !== "all" && DISTRICT_NAMES.includes(district);

  async function evaluate() {
    setState("loading");
    setMessage(null);
    try {
      setAssessment(await getDistrictRiskAssessment({ data: { district, crop, season } }));
      setState("done");
    } catch (err) {
      setAssessment(null);
      setState("error");
      setMessage(err?.message ?? "The risk assessment could not be run.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Production risk signals</CardTitle>
        <CardDescription className="text-[12px]">
          Runs the shared multi-signal risk engine over the district’s own published series. Climate signals require a
          weather baseline and are evaluated in Weather &amp; Climate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!single ? (
          <p className="text-[11.5px] text-muted-foreground">
            Choose one crop and one district to evaluate risk. Risk is not aggregated across crops.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={evaluate} disabled={state === "loading"} className="gap-1.5 text-[11px]">
                {state === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Evaluate {district}
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-1.5 text-[11px]">
                <Link to="/weather" search={{ panel: "analytics", district }}>
                  <CloudRain className="h-3.5 w-3.5" /> Weather &amp; climate
                </Link>
              </Button>
            </div>

            {message && <p role="alert" className="rounded-lg bg-red-50 p-3 text-[11.5px] text-red-700">{message}</p>}

            {assessment && assessment.status === "insufficient_history" && (
              <p className="rounded-lg bg-muted/40 p-3 text-[11.5px] text-muted-foreground">{assessment.message}</p>
            )}

            {assessment && assessment.signals && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ToneTag tone={assessment.compositeScore >= 60 ? "danger" : assessment.compositeScore >= 40 ? "warning" : "neutral"}>
                    {assessment.riskLevel}
                  </ToneTag>
                  <span className="text-[11.5px] text-muted-foreground">
                    composite {assessment.compositeScore} · confidence {assessment.confidence}
                  </span>
                </div>
                {assessment.signals.length === 0 ? (
                  <p className="text-[11.5px] text-muted-foreground">
                    No production, area or yield signal crossed its materiality threshold for {assessment.crop} in{" "}
                    {assessment.season}. Absence of a signal is not evidence of stability.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {assessment.signals.map((s) => (
                      <li key={s.id} className="rounded-lg border bg-card p-2.5 text-[11.5px]">
                        <p className="font-medium">{s.description}</p>
                        <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                          {s.id} · {s.category} · {s.severity} · weight {s.score}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {assessment.prediction && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-[11px]">
                    <p className="font-medium text-foreground">Modelled projection for {assessment.prediction.targetSeasonYear}</p>
                    <p className="mt-1 tabular-nums text-muted-foreground">
                      {formatNumber(assessment.prediction.projectedProductionTonnes, 0)} t, 90% interval{" "}
                      {formatNumber(assessment.prediction.lowerBound90, 0)}–{formatNumber(assessment.prediction.upperBound90, 0)} t.
                      Method: {assessment.prediction.method}.
                    </p>
                    <p className="mt-1 text-[10.5px] text-muted-foreground">
                      A projection from this district’s own history. It is not an observation and carries no weather forecast.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DataQualityPanel({ exploration, sourceSummaries, scope }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data coverage and provenance</CardTitle>
        <CardDescription className="text-[12px]">
          Availability of the imported records for this selection. This is not a measure of survey confidence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Values present" value={`${exploration.present} / ${exploration.expected}`} />
          <StatCard label="Missing or incompatible" value={String(exploration.missing)} tone="warn" />
          <StatCard label="No source record" value={String(exploration.absent)} tone="warn" />
          <StatCard label="Crop categories" value={String(exploration.crops?.length ?? 0)} />
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-[11px] font-medium">Reporting period</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {scope.year} {scope.season} compared with {scope.baselineYear} {scope.season} for{" "}
            {scope.crop === "all" ? "all main crops" : scope.crop} in{" "}
            {scope.district === "all" ? "all 30 districts" : scope.district}.
          </p>
        </div>

        {sourceSummaries.length > 0 ? (
          <div>
            <p className="mb-2 text-[11px] font-medium">Sources behind these figures</p>
            <ul className="space-y-1.5">
              {sourceSummaries.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-[11px]">
                  <span className="min-w-0 truncate font-medium">{s.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {s.publisher} · years {s.periods.slice(0, 6).join(", ")}
                    {s.periods.length > 6 ? ` +${s.periods.length - 6} more` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            No dataset metadata matched the records in this selection, so the source cannot be named.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, note, tone }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[12px] font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold tabular-nums ${
            tone === "bad" ? "text-red-500" : tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-500" : ""
          }`}
        >
          {value}
        </div>
        {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}

function unitOf(meta) {
  return meta?.unit ?? "unknown units";
}
