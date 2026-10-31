import { sourceProvenance } from "@/lib/source-provenance";
import { WeatherContext } from "@/components/weather/WeatherContext";
import { SavedMapFindings } from "@/components/maps/SavedMapFindings";
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireWorkspace } from "@/lib/route-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag } from "@/components/common/ToneTag";
import { ComparisonBarChart } from "@/components/charts/ComparisonBarChart";
import { useObservations } from "@/hooks/useObservations";
import { useAlerts, useDatasets, useFollowUps, useInvestigations } from "@/hooks/useAgriRecords";
import { CROPS, DISTRICT_NAMES, INDICATORS, SEASONS, YEARS } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  FileCheck,
  Building2,
  Calendar,
  Layers,
} from "lucide-react";
import { buildReportSnapshot, REPORT_TYPES } from "@/lib/reports/snapshot-builder";
import { exportReportFile } from "@/lib/reports/download-helpers";
import { ChartExplanationButton } from "@/components/charts/ChartExplanationButton";
import { useLanguage } from "@/lib/LanguageContext";

export const Route = createFileRoute("/_authed/reports")({
  beforeLoad: requireWorkspace(["planner", "officer", "data_manager"]),
  head: () => ({ meta: [{ title: "Evidence-Based Reports · AgriWiser" }] }),
  component: ReportsPage,
});

export default function ReportsPage() {
  const { language, t } = useLanguage();
  // Step 1: Report Type
  const [reportType, setReportType] = useState("district_performance");

  // Step 2: Scope Filters
  const [crop, setCrop] = useState("Maize");
  const [district, setDistrict] = useState("Kirehe");
  const [indicator, setIndicator] = useState("production");
  const [yearA, setYearA] = useState("2025");
  const [yearB, setYearB] = useState("2026");
  const [season, setSeason] = useState("Season B");
  const [alertId, setAlertId] = useState("");
  const [investigationId, setInvestigationId] = useState("");

  // Step 3: Customization
  const [explanationDepth, setExplanationDepth] = useState("professional");
  const [approvalStatus, setApprovalStatus] = useState("Approved Evidence");

  // Export state
  const [exportingFormat, setExportingFormat] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null);
  const [exportError, setExportError] = useState(null);

  // Data fetching
  const { data: rows = [] } = useObservations({ domain: "crop", crop, district, season });
  const { data: datasets = [] } = useDatasets();
  const { data: alerts = [] } = useAlerts();
  const { data: investigations = [] } = useInvestigations();
  const { data: followUps = [] } = useFollowUps(reportType === "investigation_dossier" ? investigationId : null);

  // Provenance
  const provenanceRows =
    reportType === "comparison" || reportType === "district_performance"
      ? rows.filter((row) => [Number(yearA), Number(yearB)].includes(Number(row.year)))
      : [];
  const { dataset: activeDataset } = sourceProvenance(datasets, provenanceRows);

  // Build canonical report snapshot
  const snapshot = useMemo(() => {
    return buildReportSnapshot({
      reportType,
      filters: { crop, district, season, indicator, yearA, yearB, alertId, investigationId },
      records: rows,
      datasets: activeDataset ? [activeDataset, ...datasets] : datasets,
      alerts,
      investigations,
      followUps,
      options: {
        explanationDepth,
        approvalStatus,
        preparedBy: "AgriWiser · Agricultural Analytics & Planning System",
      },
    });
  }, [
    reportType,
    crop,
    district,
    season,
    indicator,
    yearA,
    yearB,
    alertId,
    investigationId,
    rows,
    activeDataset,
    datasets,
    alerts,
    investigations,
    followUps,
    explanationDepth,
    approvalStatus,
  ]);

  // Handle Export Dispatcher
  async function handleExport(format) {
    setExportingFormat(format);
    setExportSuccess(null);
    setExportError(null);
    try {
      const localize = (value) => {
        if (typeof value === "string") return t(value);
        if (Array.isArray(value)) return value.map(localize);
        if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localize(item)]));
        return value;
      };
      const exportSnapshot = language === "rw" ? localize(snapshot) : snapshot;
      const res = await exportReportFile(exportSnapshot, format);
      setExportSuccess(`${t(res.format)} ${t("downloaded successfully.")}`);
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err) {
      console.error("Export error:", err);
      setExportError(t(err.message || "Failed to generate report export."));
      setTimeout(() => setExportError(null), 6000);
    } finally {
      setExportingFormat(null);
    }
  }

  const meta = INDICATORS[indicator] ?? INDICATORS.production;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("Official Reporting System")}
        title={t("Evidence-Based Reports & Publications")}
        description={t("Generate publication-grade agricultural dossiers grounded in verified NISR statistics and meteorological evidence. Every report guarantees reproducible calculations, traceable source references, explicit data limitations, and native editable formats.")}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("pdf")}
              disabled={Boolean(exportingFormat)}
              className="gap-1.5"
            >
              {exportingFormat === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {t("PDF Dossier")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("excel")}
              disabled={Boolean(exportingFormat)}
              className="gap-1.5"
            >
              {exportingFormat === "excel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
              {t("Excel (.xlsx + Chart)")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("word")}
              disabled={Boolean(exportingFormat)}
              className="gap-1.5"
            >
              {exportingFormat === "word" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
              {t("Word (.docx)")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              disabled={Boolean(exportingFormat)}
              className="gap-1.5"
            >
              {exportingFormat === "csv" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {t("CSV Records")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              {t("Print")}
            </Button>
          </div>
        }
      />

      {/* Export Notifications */}
      {exportSuccess ? (
        <div className="no-print flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/30 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{exportSuccess}</span>
        </div>
      ) : null}
      {exportError ? (
        <div className="no-print flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{exportError}</span>
        </div>
      ) : null}

      <SavedMapFindings />

      {/* 5-Step Report Builder Card */}
      <Card className="no-print panel border-0 shadow-none">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("Report Configuration & Scope Builder")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("Configure report type, agricultural filters, audience depth, and approval metadata.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Select Report Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("Step 1 — Report Type")}</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {t(item.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11.5px] text-muted-foreground">
              {t(REPORT_TYPES.find((item) => item.id === reportType)?.description)}
            </p>
          </div>

          {/* Step 2: Select Data Scope */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-medium">{t("Step 2 — Data Scope & Filters")}</Label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {reportType !== "investigation_dossier" && reportType !== "alert" ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t("District")}</Label>
                    <Select value={district} onValueChange={setDistrict}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRICT_NAMES.map((d) => (
                          <SelectItem key={d} value={d} className="text-xs">
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t("Crop")}</Label>
                    <Select value={crop} onValueChange={setCrop}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CROPS.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t("Measure")}</Label>
                    <Select value={indicator} onValueChange={setIndicator}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["production", "harvested_area", "yield"].map((key) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {t(INDICATORS[key].label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t("Season")}</Label>
                    <Select value={season} onValueChange={setSeason}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEASONS.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t("Target Period")}</Label>
                    <Select value={yearB} onValueChange={setYearB}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={String(y)} className="text-xs">
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : null}

              {/* Alert selection if alert report */}
              {reportType === "alert" ? (
                <div className="col-span-full space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t("Select Alert Record")}</Label>
                  <Select value={alertId || (alerts[0]?.id ?? "")} onValueChange={setAlertId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("Choose an alert")} />
                    </SelectTrigger>
                    <SelectContent>
                      {alerts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.title} ({a.crop} · {a.district})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {/* Investigation selection if investigation report */}
              {reportType === "investigation_dossier" ? (
                <div className="col-span-full space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t("Select Investigation Dossier")}</Label>
                  <Select
                    value={investigationId || (investigations[0]?.id ?? "")}
                    onValueChange={setInvestigationId}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("Choose an investigation")} />
                    </SelectTrigger>
                    <SelectContent>
                      {investigations.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.title} ({i.crop} · {i.district})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </div>

          {/* Step 3: Customize Report (Audience Depth & Status) */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-medium">{t("Step 3 — Customization & Audience Depth")}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{t("Explanation Depth")}</Label>
                <Select value={explanationDepth} onValueChange={setExplanationDepth}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple" className="text-xs">
                      {t("Simple — Plain language for general readers & farmers")}
                    </SelectItem>
                    <SelectItem value="professional" className="text-xs">
                      {t("Professional (Default) — For officers, analysts & planners")}
                    </SelectItem>
                    <SelectItem value="technical" className="text-xs">
                      {t("Technical — Mathematical formulas, decompositions & sampling frame")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{t("Publication Approval Status")}</Label>
                <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Approved Evidence" className="text-xs">
                      {t("Approved Evidence (Official verified records)")}
                    </SelectItem>
                    <SelectItem value="Under Review" className="text-xs">
                      {t("Under Supervisory Review")}
                    </SelectItem>
                    <SelectItem value="Field Investigation Dossier" className="text-xs">
                      {t("Field Investigation Dossier")}
                    </SelectItem>
                    <SelectItem value="Simulated Policy Scenario" className="text-xs">
                      {t("Simulated Policy Scenario (Exploratory)")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weather Context Module if selected */}
      {reportType === "climate_context" ? <WeatherContext report /> : null}

      {/* Step 4: Full Interactive Report Preview */}
      <Card className="panel border-0 shadow-none">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ToneTag tone="outline">{snapshot.approvalStatus}</ToneTag>
              <ToneTag tone="primary">{snapshot.geographicScope}</ToneTag>
              <span className="text-xs text-muted-foreground">{t("ID")}: {snapshot.id}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {t("Generated")} {formatDateTime(snapshot.generatedAt)}
            </span>
          </div>

          <CardTitle className="mt-2 text-xl font-semibold tracking-tight text-foreground brand-serif">
            {t(snapshot.title)}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t(snapshot.subtitle)} · {t("Prepared by")} {t(snapshot.preparedBy)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-5">
          {/* Executive Summary */}
          <section className="space-y-2 rounded-lg border border-primary/20 bg-accent/40 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
              {t("Executive Summary")}
            </h3>
            <p className="text-sm leading-relaxed text-foreground italic">
              {t(snapshot.executiveSummary)}
            </p>
          </section>

          {/* Key Findings (5 Core Reporting Questions) */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/80">
              {t("Key Verified Findings (5 Core Questions)")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(snapshot.keyFindings || []).map((f) => (
                <div
                  key={f.question}
                  className="space-y-1.5 rounded-md border border-border/60 bg-card/60 p-3.5"
                >
                  <h4 className="text-xs font-medium text-primary">{t(f.question)}</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t(f.text)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Performance & Formula Metrics Table */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/80">
              {t("Statistical Observations & Empirical Metrics")}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  {(snapshot.tableHeaders || []).map((h, i) => (
                    <TableHead key={h} className={i >= 2 ? "text-right" : "text-left"}>
                      {t(h)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(snapshot.tableRows || []).map((row, rIdx) => {
                  const vals = Object.values(row);
                  return (
                    <TableRow key={rIdx}>
                      {vals.map((v, cIdx) => (
                        <TableCell
                          key={cIdx}
                          className={
                            cIdx === 0
                              ? "font-medium"
                              : cIdx >= 2
                                ? "num text-right"
                                : "text-muted-foreground"
                          }
                        >
                          {t(String(v ?? ""))}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>

          {/* Visual Analytics Chart: Inserted ONLY where analytically needed! */}
          {snapshot.chartSpec ? (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                  {t("Visual Evidence")}: {t(snapshot.chartSpec.title)}
                </h3>
                <ChartExplanationButton
                  chartType="bar comparison"
                  title={snapshot.chartSpec.title}
                  indicator={indicator}
                  scope={district}
                  period={`${yearB} ${season}`}
                  data={snapshot.chartSpec.data}
                  dataset={snapshot.primaryDataset}
                  filters={{ crop, district, indicator, season }}
                />
              </div>

              <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                <ComparisonBarChart
                  rows={snapshot.chartSpec.data}
                  unitShort={snapshot.chartSpec.unit}
                  digits={meta.derived ? 2 : 0}
                  height={200}
                  highlightKeys={[snapshot.chartSpec.data[0]?.name]}
                />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {t(snapshot.chartSpec.explanation)}
                </p>
              </div>
            </section>
          ) : null}

          {/* Data Quality, Coverage, and Limitations */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/80">
              {t("Data Quality, Coverage & Scientific Limitations")}
            </h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {(snapshot.limitations || []).map((lim, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-primary">•</span>
                  <span>{t(lim)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Recommended Next Steps */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/80">
              {t("Actionable Verification & Follow-Up Steps")}
            </h3>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {(snapshot.recommendations || []).map((rec, idx) => (
                <p key={idx} className="flex items-start gap-1.5">
                  <span className="font-semibold text-primary">{idx + 1}.</span>
                  <span>{t(rec)}</span>
                </p>
              ))}
            </div>
          </section>

          {/* Source Attribution & Calculation Methodology */}
          <section className="space-y-1 border-t border-border pt-4 text-[11.5px] text-muted-foreground">
            <p>
              <strong>{t("Authoritative Source:")}</strong> {snapshot.primaryDataset?.name} (
              {snapshot.primaryDataset?.publisher}). Release Period:{" "}
              {snapshot.primaryDataset?.reporting_period}. License:{" "}
              {snapshot.primaryDataset?.license}.
            </p>
            <p>
              <strong>{t("Mathematical Protocol:")}</strong> {t(snapshot.methodology?.formula)}
            </p>
            <p>
              <strong>{t("Yield Definition:")}</strong> {t(snapshot.methodology?.yieldFormula)}
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
