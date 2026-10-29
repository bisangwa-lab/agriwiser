import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { requireWorkspace } from "@/lib/route-access";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterBar } from "@/components/common/FilterBar";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag } from "@/components/common/ToneTag";
import { AlertCard } from "@/components/alerts/AlertCard";
import { NewInvestigationDialog } from "@/components/investigations/NewInvestigationDialog";
import { useAlerts, useDatasets } from "@/hooks/useAgriRecords";
import { regenerateAlerts } from "@/lib/server-fns";
import { ALERT_RULES, ALERT_SEVERITIES, ALERT_STATUSES, CROPS, DISTRICT_NAMES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { BellRing, Loader2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authed/alerts")({
  beforeLoad: requireWorkspace(["planner", "officer", "data_manager"]),
  head: () => ({ meta: [{ title: "Alerts · HingaSmart Rwanda" }] }),
  component: AlertsPage,
});

const DEFAULT_FILTERS = { severity: "all", status: "all", crop: "all", district: "all" };

const FILTER_FIELDS = [
  {
    key: "severity",
    label: "Severity",
    allLabel: "All severities",
    options: ALERT_SEVERITIES.map((item) => ({ value: item.key, label: item.label })),
  },
  {
    key: "status",
    label: "Status",
    allLabel: "All statuses",
    options: ALERT_STATUSES.map((item) => ({ value: item.key, label: item.label })),
  },
  { key: "crop", label: "Crop", allLabel: "All crops", options: CROPS.map((c) => ({ value: c, label: c })) },
  {
    key: "district",
    label: "District",
    allLabel: "All districts",
    options: DISTRICT_NAMES.map((name) => ({ value: name, label: name })),
  },
];

function investigationDraftFrom(alert) {
  return {
    title: alert.title,
    reason: alert.explanation,
    crop: alert.crop,
    district: alert.district,
    indicator: alert.indicator,
    period: alert.period,
    evidence: `Observed ${alert.observed_value} ${alert.unit} in ${alert.period} against ${alert.previous_value} ${alert.unit} in ${alert.previous_period}. Rule ${alert.rule_id} version ${alert.rule_version}, threshold ${alert.rule_threshold_pct}%. Source: ${alert.dataset_name || "not recorded"}.`,
    questions:
      "Was reporting coverage the same in both periods?\nDid the source table change definition, unit or revision?\nDoes splitting production into harvested area and yield explain the change?\nIs there rainfall, input, pest or price evidence for the same district and season?",
    alert_title: alert.title,
    dataset_id: alert.dataset_id,
    dataset_name: alert.dataset_name,
    metric_snapshot: alert.evidence_snapshot,
    calculation_snapshot:
      "Absolute change = current − previous. Percentage change = ((current − previous) ÷ previous) × 100, only where the previous value is present and greater than zero.",
  };
}

function AlertsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [notice, setNotice] = useState(null);

  const { data: alerts = [], isLoading, error } = useAlerts();
  const { data: datasets = [] } = useDatasets();
  const runRegenerate = useServerFn(regenerateAlerts);

  const regenerate = useMutation({
    mutationFn: () => runRegenerate(),
    onSuccess: async (result) => {
      setNotice(
        `Rule ${ALERT_RULES[0].id} evaluated ${formatNumber(result.evaluated)} observations: ${result.created} new alert${
          result.created === 1 ? "" : "s"
        }, ${result.alreadyPresent} already present.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (mutationError) => setNotice(mutationError?.message ?? "The rule could not be run."),
  });

  const filtered = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          (filters.severity === "all" || alert.severity === filters.severity) &&
          (filters.status === "all" || alert.status === filters.status) &&
          (filters.crop === "all" || alert.crop === filters.crop) &&
          (filters.district === "all" || alert.district === filters.district),
      ),
    [alerts, filters],
  );

  const counts = useMemo(
    () => ({
      total: alerts.length,
      priority: alerts.filter((alert) => alert.severity === "priority").length,
      open: alerts.filter((alert) => alert.status === "new" || alert.status === "acknowledged").length,
      investigating: alerts.filter((alert) => alert.status === "investigating").length,
    }),
    [alerts],
  );

  function startInvestigation(alert) {
    if (alert.investigation_id) {
      navigate({ to: "/investigations/$investigationId", params: { investigationId: alert.investigation_id } });
      return;
    }
    setActiveAlert(alert);
    setDraft(investigationDraftFrom(alert));
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alerts"
        title="Alert centre"
        description="Every alert here comes from a documented rule applied to comparable reported values. An alert says a change deserves review; it does not say what caused it, and it is not a prediction."
        actions={
          <Button size="sm" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
            {regenerate.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            )}
            Re-run the alert rule
          </Button>
        }
      />

      <Card className="panel border-0 shadow-none">
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <ToneTag tone="outline">{formatNumber(counts.total)} alerts</ToneTag>
            <ToneTag tone="danger">{counts.priority} priority</ToneTag>
            <ToneTag tone="warning">{counts.open} awaiting review</ToneTag>
            <ToneTag tone="info">{counts.investigating} under investigation</ToneTag>
          </div>
          {ALERT_RULES.map((rule) => (
            <p key={rule.id} className="text-[12px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                {rule.name} ({rule.id} version {rule.version})
              </span>{" "}
              — {rule.purpose} {rule.window} Review threshold {rule.thresholdReviewPct}%, priority threshold{" "}
              {rule.thresholdPriorityPct}%. Thresholds are product rules for triage, not official
              classifications. {rule.cooldown}
            </p>
          ))}
          {notice ? (
            <p className="rounded-lg border border-border bg-muted/50 p-2.5 text-[12px] text-muted-foreground">
              {notice}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <FilterBar
        fields={FILTER_FIELDS}
        filters={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      >
        <p className="text-[11.5px] text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of {alerts.length} alerts
        </p>
      </FilterBar>

      {error ? (
        <Card>
          <EmptyState icon={BellRing} title="Alerts could not be loaded" description={error.message} />
        </Card>
      ) : null}

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((key) => (
            <div key={key} className="panel h-56 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="panel border-0 shadow-none">
          <EmptyState
            icon={BellRing}
            title="No alerts match these filters"
            description={
              alerts.length === 0
                ? "No rule has been triggered yet. Alerts only appear when two comparable periods exist and a documented threshold is crossed — they are never invented to fill this screen."
                : "Nothing matches the selected severity, status, crop and district. Widen a filter to see more."
            }
            action={
              <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Reset filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              datasets={datasets}
              onCreateInvestigation={startInvestigation}
              onChanged={() => queryClient.invalidateQueries({ queryKey: ["alerts"] })}
            />
          ))}
        </div>
      )}

      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        Looking for something else?{" "}
        <Link to="/compare" className="font-medium text-primary hover:underline">
          Compare two values
        </Link>{" "}
        or{" "}
        <Link to="/investigations" className="font-medium text-primary hover:underline">
          open the investigation workspace
        </Link>
        .
      </p>

      <NewInvestigationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValues={draft}
        alertId={activeAlert?.id}
        onCreated={async () => {
          await queryClient.invalidateQueries({ queryKey: ["alerts"] });
          await queryClient.invalidateQueries({ queryKey: ["investigations"] });
        }}
      />
    </div>
  );
}