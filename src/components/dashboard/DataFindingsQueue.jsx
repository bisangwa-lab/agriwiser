import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToneTag } from "@/components/common/ToneTag";
import { EmptyState } from "@/components/common/EmptyState";
import { investigationDraftFromFinding } from "@/lib/dataset-findings";
import { formatNumber, formatSignedPercent } from "@/lib/format";
import { useFieldFindings } from "@/hooks/useFieldFindings";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Filter,
  Search,
  Sparkles,
} from "lucide-react";

const INITIAL = {
  page: 1,
  pageSize: 10,
  sort: "priority",
  crop: "all",
  district: "all",
  indicator: "all",
  priority: "all",
  validation: "all",
  classification: "all",
  search: "",
};

const INDICATOR_LABEL = {
  production: "Production",
  harvested_area: "Harvested area",
  yield: "Derived yield",
};

const VALIDATION_LABEL = {
  source_validated: "Source validated",
  source_provisional: "Provisional source",
  insufficient_comparable_evidence: "Insufficient evidence",
  conflicting_source: "Source conflict",
  invalid_unit: "Unit mismatch",
  observed_zero: "Observed zero",
};

const selectClass = "h-8 rounded border bg-background px-2 text-xs";

function valueLabel(signal) {
  if (signal.zero_current) return "Observed zero";
  if (signal.value === null || signal.value === undefined) return "Not available";
  return `${formatNumber(signal.value, signal.indicator === "yield" ? 2 : 1)} ${signal.unit ?? ""}`.trim();
}

function baselineLabel(signal) {
  if (signal.baseline === null || signal.baseline === undefined) return "Not available";
  return `${formatNumber(signal.baseline, signal.indicator === "yield" ? 2 : 1)} ${signal.unit ?? ""}`.trim();
}

/**
 * Server-computed statistical review signals. A signal is not a confirmed
 * incident: every card keeps the source reference, calculation and limitation.
 */
export function DataFindingsQueue({ onInvestigateFinding, onOpenInvestigation }) {
  const [query, setQuery] = useState(INITIAL);
  const [expandedId, setExpandedId] = useState(null);
  const { data, isLoading, isFetching, error, refetch } = useFieldFindings(query);

  const set = (key, value) =>
    setQuery((previous) => ({ ...previous, [key]: value, page: key === "page" ? value : 1 }));

  const stats = data?.stats;
  const filters = data?.filters;
  const items = data?.items ?? [];
  const hasFilters = useMemo(
    () =>
      ["crop", "district", "indicator", "priority", "validation", "classification"].some(
        (key) => query[key] !== "all",
      ) || query.search.trim(),
    [query],
  );

  return (
    <Card className="panel border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
            <div>
              <CardTitle className="text-base">Published statistical signals requiring review</CardTitle>
              <CardDescription className="text-[12.5px]">
                Adjacent-year comparisons and source checks from published NISR tables. A signal is a review
                prompt, not a confirmed agricultural incident.
              </CardDescription>
            </div>
          </div>
          <ToneTag tone="primary">
            <Database className="h-3 w-3" aria-hidden />
            NISR source records
          </ToneTag>
        </div>

        {stats ? (
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            <ToneTag tone="outline">{formatNumber(stats.totalConditions)} conditions</ToneTag>
            <ToneTag tone="danger">{formatNumber(stats.priorityConditions)} priority</ToneTag>
            <ToneTag tone="warning">{formatNumber(stats.reviewConditions)} review</ToneTag>
            <ToneTag tone="info">{formatNumber(stats.observedZeroConditions)} observed zero</ToneTag>
            <ToneTag tone="neutral">{formatNumber(stats.dataQualityConditions)} source checks</ToneTag>
            <ToneTag tone="outline">{formatNumber(stats.comparableSeries)} comparable series</ToneTag>
            <ToneTag tone="outline">{formatNumber(stats.missingBaseline)} without an adjacent baseline</ToneTag>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/20 p-2 text-xs">
          <span className="flex items-center gap-1 font-medium text-muted-foreground">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          <select aria-label="Filter by crop" className={selectClass} value={query.crop} onChange={(event) => set("crop", event.target.value)}>
            <option value="all">All crops</option>
            {(filters?.crops ?? []).map((crop) => <option key={crop} value={crop}>{crop}</option>)}
          </select>
          <select aria-label="Filter by district" className={selectClass} value={query.district} onChange={(event) => set("district", event.target.value)}>
            <option value="all">All districts</option>
            {(filters?.districts ?? []).map((district) => <option key={district} value={district}>{district}</option>)}
          </select>
          <select aria-label="Filter by measure" className={selectClass} value={query.indicator} onChange={(event) => set("indicator", event.target.value)}>
            <option value="all">All measures</option>
            <option value="production">Production</option>
            <option value="harvested_area">Harvested area</option>
            <option value="yield">Derived yield</option>
          </select>
          <select aria-label="Filter by priority" className={selectClass} value={query.priority} onChange={(event) => set("priority", event.target.value)}>
            <option value="all">All priorities</option>
            <option value="priority">Priority</option>
            <option value="review">Review</option>
          </select>
          <select aria-label="Filter by evidence status" className={selectClass} value={query.validation} onChange={(event) => set("validation", event.target.value)}>
            <option value="all">All evidence states</option>
            {(filters?.validations ?? []).map((validation) => (
              <option key={validation} value={validation}>{VALIDATION_LABEL[validation] ?? validation}</option>
            ))}
          </select>
          <select aria-label="Filter by signal type" className={selectClass} value={query.classification} onChange={(event) => set("classification", event.target.value)}>
            <option value="all">All signal types</option>
            <option value="temporal">Year-on-year change</option>
            <option value="data_quality">Source quality check</option>
          </select>
          <select aria-label="Sort findings" className={selectClass} value={query.sort} onChange={(event) => set("sort", event.target.value)}>
            <option value="priority">Sort: priority</option>
            <option value="magnitude">Sort: largest change</option>
            <option value="recent">Sort: most recent</option>
            <option value="district">Sort: district</option>
            <option value="crop">Sort: crop</option>
          </select>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <Input
              value={query.search}
              onChange={(event) => set("search", event.target.value)}
              placeholder="Search crop, district…"
              className="h-8 w-44 pl-7 text-xs"
              aria-label="Search findings"
            />
          </div>
          {hasFilters ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setQuery(INITIAL)}>
              Reset
            </Button>
          ) : null}
          <span className="ml-auto text-muted-foreground">
            {isFetching ? "Updating…" : `${formatNumber(data?.total ?? 0)} matching conditions`}
          </span>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <p className="font-medium">Statistical signals could not be loaded</p>
            <p className="mt-1">{error.message}</p>
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Comparing adjacent published releases for the same crop, district and season…
          </p>
        ) : !items.length ? (
          <EmptyState
            icon={CheckCircle2}
            title="No published signals match these filters"
            description={
              hasFilters
                ? "Clear the filters to see other conditions. Missing comparisons are reported as coverage, not as zero."
                : "No adjacent-year change currently clears the documented review threshold and materiality floor."
            }
            className="py-8"
          />
        ) : (
          <div className="space-y-3">
            {items.map((group) => {
              const expanded = expandedId === group.id;
              return (
                <article key={group.id} className="space-y-2.5 rounded-lg border border-border/80 bg-card p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ToneTag tone={group.priority === "priority" ? "danger" : "warning"}>
                          {group.priority === "priority" ? "Priority" : "Review"}
                        </ToneTag>
                        <ToneTag tone={group.validation_status === "observed_zero" ? "info" : "outline"}>
                          {group.validation_short ?? VALIDATION_LABEL[group.validation_status] ?? "Needs review"}
                        </ToneTag>
                        {group.has_zero_current ? <ToneTag tone="warning">Observed zero</ToneTag> : null}
                        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground">
                          {group.district} · {group.crop}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{group.current_period}</span>
                        <span className="text-[11px] text-muted-foreground">· {group.signal_count} signal{group.signal_count === 1 ? "" : "s"}</span>
                      </div>
                      <h4 className="mt-1 text-[13px] font-semibold leading-snug text-foreground">{group.title}</h4>
                      {group.summary ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{group.summary}</p> : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {group.existing_investigation ? (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onOpenInvestigation?.(group.existing_investigation)}>
                          Open case
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      ) : (
                        <Button size="sm" className="gap-1 text-xs" onClick={() => onInvestigateFinding?.(investigationDraftFromFinding(group))}>
                          Investigate
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-md border border-border/60">
                    <table className="w-full min-w-[560px] text-left text-[11.5px]">
                      <thead className="bg-muted/35 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-2.5 py-2 font-medium">Measure</th>
                          <th className="px-2.5 py-2 font-medium">Current</th>
                          <th className="px-2.5 py-2 font-medium">Baseline</th>
                          <th className="px-2.5 py-2 font-medium">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {group.current_values.map((signal) => (
                          <tr key={`${group.id}-${signal.indicator}`}>
                            <td className="px-2.5 py-2 font-medium text-foreground">{INDICATOR_LABEL[signal.indicator] ?? signal.indicator}</td>
                            <td className="px-2.5 py-2">{valueLabel(signal)}</td>
                            <td className="px-2.5 py-2">{baselineLabel(signal)}</td>
                            <td className="px-2.5 py-2">
                              {signal.zero_current ? (
                                <span className="font-medium text-amber-800">Observed zero · verify</span>
                              ) : signal.change === null || signal.change === undefined ? (
                                <span className="text-muted-foreground">Not calculable</span>
                              ) : (
                                <span className={`font-medium ${signal.change < 0 ? "text-destructive" : "text-primary"}`}>
                                  {formatSignedPercent(signal.change)} {signal.absolute_change != null ? `(${formatNumber(signal.absolute_change, 1)} ${signal.unit ?? ""})` : ""}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11.5px] text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : group.id)}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      {expanded ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
                      {expanded ? "Hide calculation & source checks" : "View calculation, source reference & limitations"}
                    </button>

                    {expanded ? (
                      <div className="mt-2 space-y-2 rounded-lg border border-border/70 bg-muted/40 p-3 leading-relaxed text-[11px]">
                        <p>
                          <strong className="text-foreground">Rule: </strong>
                          {data?.rule?.id} v{data?.rule?.version} · review at {data?.rule?.reviewThresholdPct}% · priority at{" "}
                          {data?.rule?.priorityThresholdPct}% · materiality {data?.rule?.materiality?.production} t,{" "}
                          {data?.rule?.materiality?.harvested_area} ha, {data?.rule?.materiality?.yield} t/ha.
                        </p>
                        {group.findings.map((finding) => (
                          <div key={finding.id} className="rounded border border-border/60 bg-card p-2">
                            <p className="font-medium text-foreground">
                              {INDICATOR_LABEL[finding.indicator] ?? finding.indicator} · {finding.validation_label}
                            </p>
                            <p className="mt-0.5 font-mono text-[10.5px]">{finding.calculation_used}</p>
                            <p className="mt-1">
                              Source: {finding.source_reference || "Unavailable"} · {finding.dataset_name || "NISR release"}
                            </p>
                            <p className="mt-1">{finding.evidence_limitations}</p>
                          </div>
                        ))}
                        <p className="flex items-start gap-1.5">
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                          A statistical change does not establish cause, loss or an official incident. Field verification is
                          required before operational action.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-[11.5px] text-muted-foreground">
                Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of{" "}
                {formatNumber(data.total)} conditions
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={data.page <= 1 || isFetching}
                  onClick={() => set("page", data.page - 1)}
                >
                  <ArrowLeft className="mr-1 h-3 w-3" aria-hidden /> Previous
                </Button>
                <span className="text-[11.5px] text-muted-foreground">
                  Page {data.page} of {data.pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={data.page >= data.pageCount || isFetching}
                  onClick={() => set("page", data.page + 1)}
                >
                  Next <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
