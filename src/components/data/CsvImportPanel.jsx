import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToneTag } from "@/components/common/ToneTag";
import { EmptyState } from "@/components/common/EmptyState";
import { parseCsv, templateCsv } from "@/lib/csv";
import { validateObservationRows } from "@/lib/validation";
import { formatDateTime } from "@/lib/format";
import { base44 } from "@/api/base44Client";
import { useImportLogs } from "@/hooks/useAgriRecords";
import { CheckCircle2, FileSpreadsheet, History, Loader2, TriangleAlert, Upload } from "lucide-react";

/** Administrator-only: validate a table before anything is stored, then import. */
export function CsvImportPanel({ datasets = [], onImported }) {
  const fileRef = useRef(null);
  const { data: logs = [], refetch: refetchLogs } = useImportLogs();
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState(null);
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "none");
  const [importing, setImporting] = useState(false);
  const [outcome, setOutcome] = useState(null);

  const selectedDataset = datasets.find((dataset) => dataset.id === datasetId) ?? null;

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setOutcome(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { rows } = parseCsv(String(reader.result ?? ""));
        const validation = validateObservationRows(rows);
        setReport({ ...validation, raw: rows });
      } catch (err) {
        setReport({
          accepted: [],
          rejected: [],
          warnings: [`The file could not be read: ${err?.message ?? "unknown error"}. Nothing was stored.`],
          summary: { total: 0, accepted: 0, rejected: 0, warnings: 1, blocked: true },
          missingColumns: [],
          raw: [],
        });
      }
    };
    reader.readAsText(file);
  }

  async function importRows() {
    if (!report?.accepted?.length) return;
    setImporting(true);
    setOutcome(null);
    try {
      const payload = report.accepted.map((row) => ({
        dataset_id: selectedDataset?.id ?? "",
        dataset_name: selectedDataset?.name ?? "Imported table",
        source_publisher: selectedDataset?.publisher ?? "",
        domain: row.domain,
        geography: row.geography,
        crop: row.crop,
        season: row.season,
        year: row.year,
        period: row.period,
        indicator: row.indicator,
        value: row.value,
        unit: row.unit,
        observation_status: row.observation_status,
        quality_flags: [],
        is_demo: false,
      }));

      for (let index = 0; index < payload.length; index += 250) {
        await base44.entities.AgriculturalObservation.bulkCreate(payload.slice(index, index + 250));
      }

      await base44.entities.ImportLog.create({
        file_name: fileName || "untitled.csv",
        dataset_id: selectedDataset?.id ?? "",
        dataset_name: selectedDataset?.name ?? "Imported table",
        imported_by: "",
        total_rows: report.summary.total,
        imported_rows: report.summary.accepted,
        rejected_rows: report.summary.rejected,
        warning_count: report.summary.warnings,
        status: report.warnings.length ? "completed_with_warnings" : "completed",
        warnings: report.warnings.slice(0, 40),
        errors: report.rejected.slice(0, 40).map((item) => `Row ${item.rowNumber}: ${item.message}`),
        completed_date: new Date().toISOString(),
      });

      setOutcome({
        imported: report.summary.accepted,
        rejected: report.summary.rejected,
        file: fileName,
      });
      setReport(null);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      await refetchLogs();
      onImported?.();
    } catch (err) {
      setOutcome({ error: err?.message ?? "The import failed. No rows were reported as stored." });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="panel border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Import and validate a table</CardTitle>
          <CardDescription className="text-[12.5px]">
            Check the file before it is stored. Required columns: geography, crop, season, year, indicator,
            value, unit. Nothing is written until you confirm, and a missing value is never turned into zero.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="import-dataset">Destination dataset</Label>
              <Select value={datasetId} onValueChange={setDatasetId}>
                <SelectTrigger id="import-dataset">
                  <SelectValue placeholder="Choose a dataset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No dataset record</SelectItem>
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      {dataset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="import-file">CSV file</Label>
              <input
                id="import-file"
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="block w-full cursor-pointer rounded-md border border-input bg-card px-3 py-1.5 text-[12.5px] file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-[12px] file:font-medium"
              />
            </div>
          </div>

          <details className="rounded-lg border border-border bg-muted/40 p-3 text-[12px]">
            <summary className="cursor-pointer font-medium text-foreground">Expected column layout</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[11.5px] leading-relaxed text-muted-foreground">
              {templateCsv()}
            </pre>
          </details>

          {report ? (
            <div className="space-y-3 rounded-lg border border-border p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <ToneTag tone={report.summary.blocked || report.summary.rejected ? "warning" : "primary"}>
                  {report.summary.accepted} ready to store
                </ToneTag>
                {report.summary.rejected ? <ToneTag tone="danger">{report.summary.rejected} rejected</ToneTag> : null}
                {report.summary.warnings ? <ToneTag tone="warning">{report.summary.warnings} warnings</ToneTag> : null}
                <span className="text-[11.5px] text-muted-foreground">{report.summary.total} rows read</span>
              </div>

              {(report.missingColumns ?? []).length ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[12.5px] text-destructive">
                  The file is missing required columns: {report.missingColumns.join(", ")}. Nothing can be imported
                  until the column names match.
                </p>
              ) : null}

              {report.rejected.length ? (
                <div className="space-y-1.5">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Rejected rows and reasons
                  </p>
                  <ul className="max-h-52 space-y-1 overflow-y-auto text-[12px] leading-relaxed text-muted-foreground">
                    {report.rejected.slice(0, 25).map((item) => (
                      <li key={`${item.rowNumber}-${item.message}`}>
                        <span className="font-medium text-foreground">Row {item.rowNumber}:</span> {item.message}
                      </li>
                    ))}
                    {report.rejected.length > 25 ? <li>…and {report.rejected.length - 25} more.</li> : null}
                  </ul>
                </div>
              ) : null}

              {report.warnings.length ? (
                <div className="space-y-1.5">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Warnings</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-[12px] leading-relaxed text-muted-foreground">
                    {report.warnings.slice(0, 20).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={importRows} disabled={importing || !report.accepted.length}>
                  {importing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  )}
                  Store {report.accepted.length} validated rows
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReport(null);
                    setFileName("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {outcome ? (
            outcome.error ? (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[12.5px] text-destructive">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {outcome.error}
              </p>
            ) : (
              <p className="flex items-start gap-2 rounded-lg border border-primary/25 bg-accent/60 p-3 text-[12.5px] text-accent-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {outcome.imported} rows stored from {outcome.file}
                {outcome.rejected ? `, ${outcome.rejected} rejected` : ""}. The tables and charts refresh from the
                stored records.
              </p>
            )
          ) : null}
        </CardContent>
      </Card>

      <Card className="panel border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Import history</CardTitle>
          <CardDescription className="text-[12.5px]">
            Every import, with the counts it actually produced and the errors it reported.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <EmptyState
              icon={History}
              title="No imports recorded yet"
              description="Import history appears here after the first validated upload."
              className="py-8"
            />
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="rounded-lg border border-border/80 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      {log.file_name}
                    </p>
                    <ToneTag tone={log.rejected_rows ? "warning" : "primary"}>
                      {log.imported_rows} stored · {log.rejected_rows} rejected
                    </ToneTag>
                  </div>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    {formatDateTime(log.completed_date)} · {log.dataset_name || "no dataset record"}
                    {log.warning_count ? ` · ${log.warning_count} warnings` : ""}
                  </p>
                  {(log.errors ?? []).length ? (
                    <ul className="mt-2 space-y-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                      {(log.errors ?? []).slice(0, 5).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}