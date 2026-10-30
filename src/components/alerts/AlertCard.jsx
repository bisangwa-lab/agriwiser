import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToneTag, alertStatusLabel, alertStatusTone, severityLabel, severityTone } from "@/components/common/ToneTag";
import { ExplainChangeButton } from "@/components/explain/ExplainChangeDialog";
import { formatDateTime, formatValue } from "@/lib/format";
import { INDICATORS, RULE_BY_ID } from "@/lib/constants";
import { ClipboardList, Loader2 } from "lucide-react";
import { appClient } from "@/api/appClient";
import { useAuth } from "@/lib/AuthContext";
import { canAccess } from "@/lib/route-access";

const STATUS_OPTIONS = ["new", "acknowledged", "investigating", "resolved", "dismissed"];

/**
 * One alert, shown with everything that produced it: the rule and threshold, the
 * two values and periods compared, the dataset, the quality flags, when it was
 * generated, and a plain statement that it signals a need for review.
 */
export function AlertCard({ alert, datasets = [], onCreateInvestigation, onChanged }) {
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const canInvestigate = canAccess(user, "/investigations");
  const meta = INDICATORS[alert.indicator] ?? INDICATORS.production;
  const rule = RULE_BY_ID[alert.rule_id];
  const digits = meta.derived ? 2 : 0;
  const dataset = datasets.find((item) => item.id === alert.dataset_id) ?? datasets[0] ?? null;

  async function changeStatus(status) {
    setSaving(true);
    try {
      await appClient.entities.Alert.update(alert.id, { status });
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="panel border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <ToneTag tone={severityTone(alert.severity)}>{severityLabel(alert.severity)}</ToneTag>
              <ToneTag tone={alertStatusTone(alert.status)}>{alertStatusLabel(alert.status)}</ToneTag>
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {alert.rule_id} v{alert.rule_version}
              </span>
            </div>
            <CardTitle className="text-[15px] leading-snug">{alert.title}</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={alert.status} onValueChange={changeStatus} disabled={saving}>
              <SelectTrigger className="h-8 w-[150px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {alertStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canInvestigate ? (
              <Button variant="default" size="sm" onClick={() => onCreateInvestigation?.(alert)}>
                <ClipboardList className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                {alert.investigation_id ? "Open investigation" : "Open an investigation"}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Crop and district</dt>
            <dd className="font-medium text-foreground">
              {alert.crop} · {alert.district}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Indicator and unit</dt>
            <dd className="font-medium text-foreground">
              {meta.label} · {alert.unit}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Period</dt>
            <dd className="font-medium text-foreground">
              {alert.period} vs {alert.previous_period}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Generated</dt>
            <dd className="font-medium text-foreground">{formatDateTime(alert.generated_date)}</dd>
          </div>
        </dl>

        <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-3.5 sm:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Observed</p>
            <p className="num text-[15px] font-semibold">{formatValue(alert.observed_value, alert.unit, digits)}</p>
            <p className="text-[11px] text-muted-foreground">{alert.period}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Compared with</p>
            <p className="num text-[15px] font-semibold">{formatValue(alert.previous_value, alert.unit, digits)}</p>
            <p className="text-[11px] text-muted-foreground">{alert.previous_period}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Absolute change</p>
            <p className="num text-[15px] font-semibold">
              {alert.absolute_change > 0 ? "+" : ""}
              {formatValue(alert.absolute_change, alert.unit, digits)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Relative change</p>
            <p className="num text-[15px] font-semibold">
              {alert.percentage_change > 0 ? "+" : ""}
              {alert.percentage_change?.toFixed(1)}%
            </p>
            <p className="text-[11px] text-muted-foreground">threshold {alert.rule_threshold_pct}%</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">Rule and threshold</p>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            {rule
              ? `${rule.name} (${rule.id} version ${rule.version}). Window: ${rule.window} Thresholds: ${rule.thresholdReviewPct}% for review, ${rule.thresholdPriorityPct}% for priority. ${rule.minCoverage} Deduplication: ${rule.cooldown}`
              : `Rule ${alert.rule_id} version ${alert.rule_version}, threshold ${alert.rule_threshold_pct}%.`}
          </p>
        </div>

        <p className="text-[12.5px] leading-relaxed text-muted-foreground">{alert.explanation}</p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border/70 pt-3 text-[11.5px] text-muted-foreground">
          <span>
            <span className="font-medium text-muted-foreground/70">Source:</span> {alert.dataset_name || "Not recorded"}
          </span>
          <span>
            <span className="font-medium text-muted-foreground/70">Quality:</span>{" "}
            {alert.quality_status || "not recorded"}
          </span>
          {(alert.quality_flags ?? []).length ? (
            <span>
              <span className="font-medium text-muted-foreground/70">Flags:</span>{" "}
              {(alert.quality_flags ?? []).join("; ")}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExplainChangeButton
            payload={{
              indicator: alert.indicator,
              current: alert.observed_value,
              previous: alert.previous_value,
              currentPeriod: alert.period,
              previousPeriod: alert.previous_period,
              crop: alert.crop,
              geography: alert.district,
              season: alert.season,
              dataset,
              qualityFlags: alert.quality_flags ?? [],
              ruleId: alert.rule_id,
            }}
          />
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Saving status" />
          ) : null}
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
          This alert signals that a review is warranted. It is a rule applied to reported values, not a
          prediction and not proof of cause.
        </p>
      </CardContent>
    </Card>
  );
}