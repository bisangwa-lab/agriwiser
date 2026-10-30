import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2 } from "lucide-react";
import { appClient } from "@/api/appClient";
import { CROPS, DISTRICT_NAMES, INDICATORS, INVESTIGATION_PRIORITIES } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";
import { useFieldDirectory } from "@/hooks/useFieldFindings";

const EMPTY = {
  title: "",
  description: "",
  reason: "",
  crop: "",
  district: "",
  indicator: "",
  period: "",
  evidence: "",
  questions: "",
  assignee_id: "",
  due_date: "",
  priority: "standard",
};

/**
 * Create an investigation from any finding, alert or comparison. The evidence and
 * the calculation that prompted it are copied onto the record so the source
 * context survives every later edit.
 */
export function NewInvestigationDialog({ open, onOpenChange, initialValues, alertId, onCreated }) {
  const { user } = useAuth();
  const { data: directory = [], isLoading: directoryLoading, error: directoryError } = useFieldDirectory({ enabled: open });
  const [values, setValues] = useState(EMPTY);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setValues({
        ...EMPTY,
        ...(initialValues ?? {}),
        assignee_id: initialValues?.assignee_id || user?.id || "",
      });
      setIdempotencyKey(crypto.randomUUID());
      setError(null);
      setSuccess(false);
    }
  }, [open, initialValues, user]);

  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    if (!values.title.trim()) {
      setError("Please provide an investigation title identifying the problem.");
      return;
    }
    if (!values.district) {
      setError("Please select the district where the issue occurred.");
      return;
    }
    if (!values.crop) {
      setError("Please select the crop being investigated.");
      return;
    }
    if (!values.reason.trim()) {
      setError("Please explain why an investigation is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await appClient.entities.Investigation.create({
        ...values,
        title: values.title.trim(),
        reason: values.reason.trim(),
        description: values.description.trim(),
        evidence: values.evidence.trim(),
        questions: values.questions.trim(),
        assignee_id: values.assignee_id || undefined,
        idempotency_key: idempotencyKey,
        finding_group_id: initialValues?.finding_group_id ?? "",
        finding_ids: initialValues?.finding_ids ?? [],
        alert_id: alertId ?? "",
        alert_title: initialValues?.alert_title ?? "",
        dataset_id: initialValues?.dataset_id ?? "",
        dataset_name: initialValues?.dataset_name ?? "",
      });

      setSuccess(true);
      setTimeout(() => {
        onCreated?.(created);
        onOpenChange(false);
      }, 400);
    } catch (err) {
      setError(err?.message ?? "The investigation could not be saved. Nothing was written.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="brand-serif text-xl">Start new investigation</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Identify the agricultural problem, assign an authorized officer, and document initial evidence to begin tracing.
          </DialogDescription>
        </DialogHeader>

        {initialValues?.dataset_name ? (
          <div className="rounded-lg border border-primary/25 bg-accent/40 p-3 text-xs leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Verified evidence carried over from: {initialValues.dataset_name}
            </div>
            {initialValues.calculation_snapshot ? (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{initialValues.calculation_snapshot}</p>
            ) : null}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Source coordinates, compared figures, and calculation logic are permanently preserved on this record.
            </p>
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-title">Agricultural problem / Title *</Label>
            <Input
              id="inv-title"
              value={values.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="e.g. Severe maize yield decline in Kirehe, 2024 Season A"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-district">District *</Label>
              <Select
                value={values.district || "none"}
                onValueChange={(value) => set("district", value === "none" ? "" : value)}
              >
                <SelectTrigger id="inv-district">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select district</SelectItem>
                  {DISTRICT_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-crop">Crop *</Label>
              <Select value={values.crop || "none"} onValueChange={(value) => set("crop", value === "none" ? "" : value)}>
                <SelectTrigger id="inv-crop">
                  <SelectValue placeholder="Select crop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select crop</SelectItem>
                  {CROPS.map((crop) => (
                    <SelectItem key={crop} value={crop}>
                      {crop}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-indicator">Indicator</Label>
              <Select
                value={values.indicator || "none"}
                onValueChange={(value) => set("indicator", value === "none" ? "" : value)}
              >
                <SelectTrigger id="inv-indicator">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {["production", "harvested_area", "yield"].map((key) => (
                    <SelectItem key={key} value={key}>
                      {INDICATORS[key]?.label ?? key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-period">Reporting period</Label>
              <Input
                id="inv-period"
                value={values.period}
                onChange={(event) => set("period", event.target.value)}
                placeholder="2024 Season A"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-reason">Why investigation is needed *</Label>
              <Textarea
                id="inv-reason"
                rows={3}
                value={values.reason}
                onChange={(event) => set("reason", event.target.value)}
                placeholder="Explain the anomaly, discrepancy, or unexpected change requiring verification..."
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-questions">Questions to investigate</Label>
              <Textarea
                id="inv-questions"
                rows={3}
                value={values.questions}
                onChange={(event) => set("questions", event.target.value)}
                placeholder="1. Check if weather anomalies occurred during flowering&#10;2. Verify seed variety distribution"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-evidence">Supporting evidence & source references</Label>
            <Textarea
              id="inv-evidence"
              rows={2}
              value={values.evidence}
              onChange={(event) => set("evidence", event.target.value)}
              placeholder="Published statistics compared, table numbers, or initial farmer reports"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="inv-assignee">Assigned officer</Label>
                {user?.id && values.assignee_id !== user.id ? (
                  <button
                    type="button"
                    className="text-[11.5px] font-medium text-primary hover:underline"
                    onClick={() => set("assignee_id", user.id)}
                  >
                    Assign to me
                  </button>
                ) : null}
              </div>
              <Select
                value={values.assignee_id || "none"}
                onValueChange={(value) => set("assignee_id", value === "none" ? "" : value)}
                disabled={directoryLoading}
              >
                <SelectTrigger id="inv-assignee">
                  <SelectValue placeholder={directoryLoading ? "Loading officers…" : "Choose an officer"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {directory.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.full_name || account.email} · {account.workspace_role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {directoryError ? (
                <p className="text-[11px] text-destructive">The officer directory could not be loaded.</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-due">Deadline / Due date</Label>
              <Input id="inv-due" type="date" value={values.due_date} onChange={(event) => set("due_date", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-priority">Priority</Label>
              <Select value={values.priority} onValueChange={(value) => set("priority", value)}>
                <SelectTrigger id="inv-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVESTIGATION_PRIORITIES.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-accent/40 p-2.5 text-[12.5px] text-primary">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Investigation created successfully! Opening workspace…
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || success}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              Create investigation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
