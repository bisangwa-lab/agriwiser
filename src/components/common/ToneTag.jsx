import { cn } from "@/lib/utils";

const TONES = {
  neutral: "border-border bg-muted/70 text-muted-foreground",
  primary: "border-primary/25 bg-accent text-accent-foreground",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  danger: "border-red-300 bg-red-50 text-red-700",
  info: "border-sky-300 bg-sky-50 text-sky-800",
  outline: "border-border bg-transparent text-muted-foreground",
};

/** Severity and status always pair colour with a written label. */
export function ToneTag({ tone = "neutral", icon: Icon, children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      {children}
    </span>
  );
}

const SEVERITY_TONE = { priority: "danger", review: "warning", info: "info" };
const SEVERITY_LABEL = { priority: "Priority", review: "Review", info: "Info" };

export function severityTone(severity) {
  return SEVERITY_TONE[severity] ?? "neutral";
}

export function severityLabel(severity) {
  return SEVERITY_LABEL[severity] ?? "Review";
}

const ALERT_STATUS_TONE = {
  new: "primary",
  acknowledged: "info",
  investigating: "warning",
  resolved: "neutral",
  dismissed: "outline",
};

const ALERT_STATUS_LABEL = {
  new: "New",
  acknowledged: "Acknowledged",
  investigating: "Investigating",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export function alertStatusTone(status) {
  return ALERT_STATUS_TONE[status] ?? "neutral";
}

export function alertStatusLabel(status) {
  return ALERT_STATUS_LABEL[status] ?? status ?? "New";
}

const INVESTIGATION_STATUS_TONE = {
  open: "primary",
  in_progress: "info",
  awaiting_evidence: "warning",
  completed: "neutral",
  cancelled: "outline",
};

const INVESTIGATION_STATUS_LABEL = {
  open: "Open",
  in_progress: "In progress",
  awaiting_evidence: "Awaiting evidence",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function investigationStatusTone(status) {
  return INVESTIGATION_STATUS_TONE[status] ?? "neutral";
}

export function investigationStatusLabel(status) {
  return INVESTIGATION_STATUS_LABEL[status] ?? status ?? "Open";
}

const FOLLOWUP_STATUS_TONE = {
  pending: "primary",
  in_progress: "info",
  completed: "neutral",
  cancelled: "outline",
};

const FOLLOWUP_STATUS_LABEL = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function followUpStatusTone(status) {
  return FOLLOWUP_STATUS_TONE[status] ?? "neutral";
}

export function followUpStatusLabel(status) {
  return FOLLOWUP_STATUS_LABEL[status] ?? status ?? "Pending";
}

const OBSERVATION_STATUS_TONE = {
  observed: "primary",
  estimated: "info",
  provisional: "warning",
  forecast: "outline",
};

const OBSERVATION_STATUS_LABEL = {
  observed: "Observed",
  estimated: "Estimated",
  provisional: "Provisional",
  forecast: "Forecast",
};

export function observationStatusTone(status) {
  return OBSERVATION_STATUS_TONE[status] ?? "neutral";
}

export function observationStatusLabel(status) {
  return OBSERVATION_STATUS_LABEL[status] ?? status ?? "Observed";
}