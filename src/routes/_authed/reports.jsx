import { sourceProvenance } from "@/lib/source-provenance";
import { WeatherContext } from '@/components/weather/WeatherContext';
import { SavedMapFindings } from "@/components/maps/SavedMapFindings";
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireWorkspace } from "@/lib/route-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag, investigationStatusLabel, severityLabel, severityTone } from "@/components/common/ToneTag";
import { ComparisonBarChart } from "@/components/charts/ComparisonBarChart";
import { useObservations } from "@/hooks/useObservations";
import { useAlerts, useDatasets, useFollowUps, useInvestigations } from "@/hooks/useAgriRecords";
import { CROPS, DISTRICT_NAMES, INDICATORS, RULE_BY_ID, SEASONS, YEARS } from "@/lib/constants";
import { absoluteChange, yieldFromRows, percentageChange, toNumber } from "@/lib/metrics";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatDateTime, formatNumber, formatValue } from "@/lib/format";
import { Download, FileText, Printer } from "lucide-react";

export const Route = createFileRoute("/_authed/reports")({
  beforeLoad: requireWorkspace(["planner", "officer", "data_manager"]),
  head: () => ({ meta: [{ title: "Reports · HingaSmart Rwanda" }] }),
  component: ReportsPage,
});

const SOURCES = [
  { key: 'weather', label: 'Weather & agriculture' },
  { key: "comparison", label: "Comparison" },
  { key: "alert", label: "Alert" },
  { key: "investigation", label: "Investigation" },
];

function totals(rows, indicator) {
  let production = null;
  let harvested_area = null;
  for (const row of rows) {
    const value = toNumber(row.value);
    if (value === null) continue;
    if (row.indicator === "production") production = (production ?? 0) + value;
    if (row.indicator === "harvested_area") harvested_area = (harvested_area ?? 0) + value;
  }
  return {
    value: indicator === "yield" ? yieldFromRows(rows) : indicator === "production" ? production : harvested_area,
    production,
    harvested_area,
  };
}

function ReportsPage() {
  const [source, setSource] = useState("comparison");
  const [crop, setCrop] = useState("Maize");
  const [district, setDistrict] = useState("Kirehe");
  const [indicator, setIndicator] = useState("production");
  const [yearA, setYearA] = useState("2025");
  const [yearB, setYearB] = useState("2026");
  const [season, setSeason] = useState("Season B");
  const [alertId, setAlertId] = useState("");

  const meta = INDICATORS[indicator] ?? INDICATORS.production;
  const digits = meta.derived ? 2 : 0;

  const { data: rows = [] } = useObservations({ domain: "crop", crop, district, season });
  const { data: datasets = [] } = useDatasets();
  const { data: alerts = [] } = useAlerts();
  const { data: investigations = [] } = useInvestigations();
  const [investigationId, setInvestigationId] = useState("");
  const { data: followUps = [] } = useFollowUps(source === "investigation" ? investigationId : null);

  const alert = alerts.find((item) => item.id === alertId) ?? null;
  const investigation = investigations.find((item) => item.id === investigationId) ?? null;
  const provenanceRows = source === "comparison" ? rows.filter(row => [Number(yearA),Number(yearB)].includes(Number(row.year))) : [{dataset_id:source === "alert" ? alert?.dataset_id : investigation?.dataset_id}];
  const { dataset, sources: reportSources } = sourceProvenance(datasets, provenanceRows);

  const comparison = useMemo(() => {
    const rowsA = rows.filter((row) => Number(row.year) === Number(yearA));
    const rowsB = rows.filter((row) => Number(row.year) === Number(yearB));
    const a = totals(rowsA, indicator);
    const b = totals(rowsB, indicator);
    return {
      a,
      b,
      absolute: absoluteChange(b.value, a.value),
      percent: percentageChange(b.value, a.value),
      rowsA,
      rowsB,
    };
  }, [rows, yearA, yearB, indicator]);

  const generatedAt = formatDateTime(new Date().toISOString());
  const rule = alert ? RULE_BY_ID[alert.rule_id] : null;

  function exportComparisonCsv() {
    const csv = toCsv(
      [
        {
          report: "Indicator comparison",
          generated_at: generatedAt,
          crop,
          district,
          indicator,
          unit: meta.unit,
          period_a: `${yearA} ${season}`,
          period_b: `${yearB} ${season}`,
          value_a: comparison.a.value,
          value_b: comparison.b.value,
          absolute_change: comparison.absolute.value,
          percentage_change: comparison.percent.value,
          dataset: dataset?.name ?? "",
          dataset_publisher: dataset?.publisher ?? "",
          source_urls: reportSources.map(item => item.source_url).join(" | "),
          methodology: dataset?.methodology ?? "",
          limitations: dataset?.limitations ?? "",
        },
      ],
      [
        "report",
        "generated_at",
        "crop",
        "district",
        "indicator",
        "unit",
        "period_a",
        "period_b",
        "value_a",
        "value_b",
        "absolute_change",
        "percentage_change",
        "dataset",
        "dataset_publisher",
        "source_urls",
        "methodology",
        "limitations",
      ],
    );
    downloadCsv(`hingasmart-report-comparison-${crop}-${district}.csv`, csv);
  }

  function exportAlertCsv() {
    if (!alert) return;
    const csv = toCsv(
      [
        {
          report: "Alert report",
          generated_at: generatedAt,
          title: alert.title,
          severity: alert.severity,
          status: alert.status,
          rule: `${alert.rule_id} v${alert.rule_version}`,
          threshold_pct: alert.rule_threshold_pct,
          crop: alert.crop,
          district: alert.district,
          indicator: alert.indicator,
          unit: alert.unit,
          period: alert.period,
          previous_period: alert.previous_period,
          observed_value: alert.observed_value,
          previous_value: alert.previous_value,
          absolute_change: alert.absolute_change,
          percentage_change: alert.percentage_change,
          dataset: alert.dataset_name,
          quality_status: alert.quality_status,
          quality_flags: (alert.quality_flags ?? []).join(" | "),
          alert_generated: alert.generated_date,
        },
      ],
      [
        "report",
        "generated_at",
        "title",
        "severity",
        "status",
        "rule",
        "threshold_pct",
        "crop",
        "district",
        "indicator",
        "unit",
        "period",
        "previous_period",
        "observed_value",
        "previous_value",
        "absolute_change",
        "percentage_change",
        "dataset",
        "quality_status",
        "quality_flags",
        "alert_generated",
      ],
    );
    downloadCsv(`hingasmart-report-alert-${alert.id}.csv`, csv);
  }

  function exportInvestigationCsv() {
    if (!investigation) return;
    const csv = toCsv(
      [
        {
          report: "Investigation report",
          generated_at: generatedAt,
          title: investigation.title,
          status: investigation.status,
          priority: investigation.priority,
          crop: investigation.crop,
          district: investigation.district,
          period: investigation.period,
          assignee: investigation.assignee_name,
          due_date: investigation.due_date,
          reason: investigation.reason,
          evidence: investigation.evidence,
          questions: investigation.questions,
          outcome_summary: investigation.outcome_summary,
          follow_up_actions: followUps.length,
          open_follow_ups: followUps.filter((item) => item.status !== "completed" && item.status !== "cancelled").length,
          dataset: investigation.dataset_name,
          created: investigation.created_date,
          updated: investigation.updated_date,
        },
      ],
      [
        "report",
        "generated_at",
        "title",
        "status",
        "priority",
        "crop",
        "district",
        "period",
        "assignee",
        "due_date",
        "reason",
        "evidence",
        "questions",
        "outcome_summary",
        "follow_up_actions",
        "open_follow_ups",
        "dataset",
        "created",
        "updated",
      ],
    );
    downloadCsv(`hingasmart-report-investigation-${investigation.id}.csv`, csv);
  }

  const exportCurrent = source === "comparison" ? exportComparisonCsv : source === "alert" ? exportAlertCsv : exportInvestigationCsv;
  const canExport = source === 'weather' ? false : source === "comparison" ? comparison.a.value !== null || comparison.b.value !== null : source === "alert" ? Boolean(alert) : Boolean(investigation);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Reports and exports"
        description="Build a report from a comparison, an alert or an investigation. Every report carries the filters it used, the calculation method, the source dataset, the missing-data warnings and the limitations — and exports the same values shown on screen."
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportCurrent} disabled={!canExport}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Export (CSV)
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Print / Save as PDF
            </Button>
          </div>
        }
      />

      <SavedMapFindings />

      <Card className="no-print panel border-0 shadow-none">
        <CardContent className="space-y-4 pt-5">
          <Tabs value={source} onValueChange={setSource}>
            <TabsList>
              {SOURCES.map((item) => (
                <TabsTrigger key={item.key} value={item.key}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {source === "comparison" && <label className="block max-w-xs text-xs text-muted-foreground">Report season<select aria-label="Report season" className="mt-2 h-10 w-full rounded-lg border bg-background px-3" value={season} onChange={event=>setSeason(event.target.value)}>{SEASONS.map(item=><option key={item}>{item}</option>)}</select><span className="mt-2 block">Both years use this season. An unreported period stays unavailable.</span></label>}
          {source === "comparison" ? (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
              <div className="space-y-1.5">
                <Label className="text-[11.5px] text-muted-foreground">Reference period</Label>
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
                <Label className="text-[11.5px] text-muted-foreground">Current period</Label>
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
            </div>
          ) : null}

          {source === "alert" ? (
            <div className="max-w-xl space-y-1.5">
              <Label className="text-[11.5px] text-muted-foreground">Alert</Label>
              <Select value={alertId || "none"} onValueChange={(value) => setAlertId(value === "none" ? "" : value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose an alert" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose an alert</SelectItem>
                  {alerts.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {source === "investigation" ? (
            <div className="max-w-xl space-y-1.5">
              <Label className="text-[11.5px] text-muted-foreground">Investigation</Label>
              <Select
                value={investigationId || "none"}
                onValueChange={(value) => setInvestigationId(value === "none" ? "" : value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose an investigation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose an investigation</SelectItem>
                  {investigations.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {source==='weather'&&<WeatherContext report/>}
      {source === "comparison" ? (
        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
              {meta.label} in {district}, {crop}: {yearA} and {yearB} · {season}
            </CardTitle>
            <CardDescription className="text-[12.5px]">Generated {generatedAt}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">Main finding</h3>
              <p className="text-[13.5px] leading-relaxed text-foreground">
                {comparison.a.value === null || comparison.b.value === null ? (
                  <>
                    {meta.label} could not be compared for {district}, {crop}: one of the two periods has no valid
                    value in the loaded data. No difference is reported, because a missing value is not zero.
                  </>
                ) : comparison.percent.value === null ? (
                  <>
                    {meta.label} was {formatValue(comparison.b.value, meta.unitShort, digits)} in {yearB} against{" "}
                    {formatValue(comparison.a.value, meta.unitShort, digits)} in {yearA}. The absolute change is{" "}
                    {formatValue(comparison.absolute.value, meta.unitShort, digits)}; a percentage change is not
                    calculable because the {yearA} value is zero.
                  </>
                ) : (
                  <>
                    {meta.label} for {crop} in {district} moved from{" "}
                    <strong>{formatValue(comparison.a.value, meta.unitShort, digits)} in {yearA}</strong> to{" "}
                    <strong>{formatValue(comparison.b.value, meta.unitShort, digits)} in {yearB}</strong> — an absolute
                    change of {comparison.absolute.value > 0 ? "+" : ""}
                    {formatValue(comparison.absolute.value, meta.unitShort, digits)} and a relative change of{" "}
                    {comparison.percent.value > 0 ? "+" : ""}
                    {comparison.percent.value.toFixed(1)}%. This is a statement about reported values, not about cause.
                  </>
                )}
              </p>
            </section>

            {comparison.a.value !== null && comparison.b.value !== null ? (
              <ComparisonBarChart
                rows={[
                  { name: yearA, value: comparison.a.value },
                  { name: yearB, value: comparison.b.value },
                ]}
                unitShort={meta.unitShort}
                digits={digits}
                height={190}
                highlightKeys={[yearB]}
              />
            ) : null}

            <section className="space-y-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                Values, units and method
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Measure</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">{yearA}</TableHead>
                    <TableHead className="text-right">{yearB}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">{meta.label}</TableCell>
                    <TableCell className="text-muted-foreground">{meta.unit}</TableCell>
                    <TableCell className="num text-right">{formatNumber(comparison.a.value, digits)}</TableCell>
                    <TableCell className="num text-right">{formatNumber(comparison.b.value, digits)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Production</TableCell>
                    <TableCell className="text-muted-foreground">metric tonnes</TableCell>
                    <TableCell className="num text-right">{formatNumber(comparison.a.production, 0)}</TableCell>
                    <TableCell className="num text-right">{formatNumber(comparison.b.production, 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Harvested area</TableCell>
                    <TableCell className="text-muted-foreground">hectares</TableCell>
                    <TableCell className="num text-right">{formatNumber(comparison.a.harvested_area, 0)}</TableCell>
                    <TableCell className="num text-right">{formatNumber(comparison.b.harvested_area, 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Absolute change = current value − previous value. Percentage change = ((current value − previous
                value) ÷ previous value) × 100, shown only when the previous value is present and greater than zero.
                Yield is derived as production ÷ harvested area for the same crop, geography and period.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">Source dataset</h3>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                {dataset
                  ? `${dataset.name} — ${dataset.publisher}. Reporting period: ${dataset.reporting_period}. Retrieved ${dataset.retrieval_date}. Version ${dataset.version}. License: ${dataset.license}.`
                  : "No dataset record is attached to these observations."}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                Missing data and limitations
              </h3>
              <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                <li>• {comparison.rowsA.length} observations in {yearA} and {comparison.rowsB.length} in {yearB} contributed to this report.</li>
                {(dataset?.quality_warnings ?? []).map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
                <li>• {dataset?.limitations ?? "No limitations are recorded for this dataset."}</li>
                <li>• The data shows what was reported for each period. It does not establish why a change happened.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                Next verification steps
              </h3>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Confirm that reporting coverage was the same in both periods; check whether the source table changed
                definition, unit or revision; split the change into harvested area and yield; and look for rainfall,
                input, pest or price evidence for the same district and period. None of these steps is a diagnosis.
              </p>
            </section>
          </CardContent>
        </Card>
      ) : null}

      {source === "alert" ? (
        alert ? (
          <Card className="panel border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <ToneTag tone={severityTone(alert.severity)}>{severityLabel(alert.severity)}</ToneTag>
                <ToneTag tone="outline">{alert.rule_id} v{alert.rule_version}</ToneTag>
              </div>
              <CardTitle className="mt-2 text-base">{alert.title}</CardTitle>
              <CardDescription className="text-[12.5px]">
                Generated {formatDateTime(alert.generated_date)} · report generated {generatedAt}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <section className="space-y-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">Main finding</h3>
                <p className="text-[13.5px] leading-relaxed text-foreground">{alert.explanation}</p>
              </section>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Measure</TableHead>
                    <TableHead className="text-right">{alert.previous_period}</TableHead>
                    <TableHead className="text-right">{alert.period}</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      {INDICATORS[alert.indicator]?.label ?? alert.indicator} ({alert.unit})
                    </TableCell>
                    <TableCell className="num text-right">{formatNumber(alert.previous_value, 2)}</TableCell>
                    <TableCell className="num text-right">{formatNumber(alert.observed_value, 2)}</TableCell>
                    <TableCell className="num text-right">
                      {alert.percentage_change > 0 ? "+" : ""}
                      {alert.percentage_change?.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <section className="space-y-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                  Rule, threshold and source
                </h3>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  Rule {alert.rule_id} version {alert.rule_version} ({rule?.name ?? "documented rule"}). Threshold applied:{" "}
                  {alert.rule_threshold_pct}% ({rule ? `${rule.thresholdReviewPct}% review, ${rule.thresholdPriorityPct}% priority` : "product rule"}).
                  Source: {alert.dataset_name || "not recorded"}. Quality status: {alert.quality_status || "not recorded"}.
                  {(alert.quality_flags ?? []).length ? ` Flags: ${(alert.quality_flags ?? []).join("; ")}.` : ""}
                </p>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  This alert is a rule applied to reported values. It signals that a review is warranted and does
                  not establish cause.
                </p>
              </section>
            </CardContent>
          </Card>
        ) : (
          <Card className="panel border-0 shadow-none">
            <EmptyState
              icon={FileText}
              title="Choose an alert"
              description="Pick an alert above to build a report from its rule, values, periods and source."
            />
          </Card>
        )
      ) : null}

      {source === "investigation" ? (
        investigation ? (
          <Card className="panel border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <ToneTag tone="outline">{investigationStatusLabel(investigation.status)}</ToneTag>
                {investigation.priority === "elevated" ? <ToneTag tone="warning">Elevated</ToneTag> : null}
              </div>
              <CardTitle className="mt-2 text-base">{investigation.title}</CardTitle>
              <CardDescription className="text-[12.5px]">
                {[investigation.crop, investigation.district, investigation.period].filter(Boolean).join(" · ")} · created{" "}
                {formatDateTime(investigation.created_date)} · report generated {generatedAt}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <section className="space-y-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">Main finding</h3>
                <p className="text-[13.5px] leading-relaxed text-foreground">
                  {investigation.outcome_summary?.trim()
                    ? investigation.outcome_summary
                    : "This investigation is not complete. No outcome has been recorded yet, so no conclusion is reported."}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">Reason and evidence</h3>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">{investigation.reason || "Not recorded."}</p>
                <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-muted-foreground">
                  {investigation.evidence || "No evidence recorded."}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">Follow-up actions</h3>
                {followUps.length === 0 ? (
                  <p className="text-[12.5px] text-muted-foreground">No follow-up actions recorded.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {followUps.map((action) => (
                        <TableRow key={action.id}>
                          <TableCell className="font-medium">{action.title}</TableCell>
                          <TableCell className="text-muted-foreground">{action.owner || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{action.due_date || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{action.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <p className="text-[12px] text-muted-foreground">
                  {followUps.filter((item) => item.status !== "completed" && item.status !== "cancelled").length} of{" "}
                  {followUps.length} actions still open.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                  Limitations and source
                </h3>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  Source dataset: {investigation.dataset_name || "not recorded"}. The investigation records what
                  people found; it is not evidence that an intervention changed an outcome. Where an outcome is
                  attributed to an action, the supporting evidence is the recorded observations, not the sequence of
                  events.
                </p>
                {investigation.calculation_snapshot ? (
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    Calculation used: {investigation.calculation_snapshot}
                  </p>
                ) : null}
              </section>
            </CardContent>
          </Card>
        ) : (
          <Card className="panel border-0 shadow-none">
            <EmptyState
              icon={FileText}
              title="Choose an investigation"
              description="Pick an investigation above to build a report from its evidence, follow-up actions and outcome."
            />
          </Card>
        )
      ) : null}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Exported values match the values displayed here and the filters shown above. Exports include the source,
        period, unit, calculation and noted limitations.
        {source === "comparison" && comparison.rowsA.length === 0
          ? " Note: the reference period has no records in scope."
          : ""}
      </p>
    </div>
  );
}
