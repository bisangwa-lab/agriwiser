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
import { Loader2 } from "lucide-react";
import { base44, isLocalAuth } from "@/api/base44Client";
import { CROPS, DISTRICT_NAMES, INDICATORS, INVESTIGATION_PRIORITIES, SEASONS } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";
import { normalizeRole } from "@/lib/rbac";

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
  assignee_name: "",
  assignee_email: "",
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
  const canAssignSelf = !isLocalAuth || ["super_admin", "data_manager", "agricultural_officer", "field_investigator", "field_supervisor"].includes(normalizeRole(user));
  const [values, setValues] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setValues({ ...EMPTY, ...(initialValues ?? {}) });
      setError(null);
    }
  }, [open, initialValues]);

  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    if (values.title.trim().length < 5 || values.reason.trim().length < 10) {
      setError("Enter a clear title (at least 5 characters) and why the finding needs checking (at least 10 characters).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await base44.entities.Investigation.create({
        ...values,
        title: values.title.trim(),
        status: "open",
        alert_id: alertId ?? "",
        alert_title: initialValues?.alert_title ?? "",
        dataset_id: initialValues?.dataset_id ?? "",
        dataset_name: initialValues?.dataset_name ?? "",
        metric_snapshot: initialValues?.metric_snapshot ?? "",
        calculation_snapshot: initialValues?.calculation_snapshot ?? "",
        is_demo: Boolean(initialValues?.is_demo),
      });

      if (alertId && !isLocalAuth) {
        await base44.entities.Alert.update(alertId, {
          status: "investigating",
          investigation_id: created.id,
        });
      }

      onCreated?.(created);
      onOpenChange(false);
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
          <DialogTitle className="brand-serif text-xl">New investigation</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Describe the problem, choose the district and who should check it. Linked alert evidence is preserved from the source; manually entered notes are identified as user evidence.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-title">Title</Label>
            <Input
              id="inv-title"
              value={values.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="Maize production drop in Kirehe, 2024 Season A"
              required
              minLength={5}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-reason">Reason for investigating</Label>
              <Textarea
                id="inv-reason"
                rows={3}
                value={values.reason}
                onChange={(event) => set("reason", event.target.value)}
                placeholder="What was reported, what is uncertain and why should someone check it?"
                required
                minLength={10}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-questions">Questions to investigate</Label>
              <Textarea
                id="inv-questions"
                rows={3}
                value={values.questions}
                onChange={(event) => set("questions", event.target.value)}
                placeholder="One question per line"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-description">Description</Label>
            <Textarea
              id="inv-description"
              rows={2}
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-crop">Crop</Label>
              <Select value={values.crop || "none"} onValueChange={(value) => set("crop", value === "none" ? "" : value)}>
                <SelectTrigger id="inv-crop">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {CROPS.map((crop) => (
                    <SelectItem key={crop} value={crop}>
                      {crop}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-district">District</Label>
              <Select
                value={values.district || "none"}
                onValueChange={(value) => set("district", value === "none" ? "" : value)}
              >
                <SelectTrigger id="inv-district">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {DISTRICT_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
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
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {["production", "harvested_area", "yield"].map((key) => (
                    <SelectItem key={key} value={key}>
                      {INDICATORS[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-period">Period</Label>
              <Input
                id="inv-period"
                value={values.period}
                onChange={(event) => set("period", event.target.value)}
                placeholder="2024 Season A"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-evidence">Supporting evidence and source references</Label>
            <Textarea
              id="inv-evidence"
              rows={3}
              value={values.evidence}
              onChange={(event) => set("evidence", event.target.value)}
              placeholder="Values compared, periods, dataset and any field evidence already collected"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-assignee">Assign to officer (email)</Label>
              <Input
                id="inv-assignee"
                type="email"
                value={values.assignee_email}
                onChange={(event) => set("assignee_email", event.target.value)}
                placeholder="officer@example.com"
              />
              {canAssignSelf && user?.email && values.assignee_email !== user.email ? (
                <button type="button" className="mt-1 text-[11.5px] font-medium text-primary underline"
                  onClick={() => {
                    setValues(prev => ({...prev, assignee_name: user.full_name ?? user.email, assignee_email: user.email}));
                  }}>Assign to me</button>
              ) : null}
              {isLocalAuth && <p className="text-[11px] text-muted-foreground">Use an active field account, or leave blank to assign later.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-due">Due date</Label>
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

          {initialValues?.reason ? (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Carried over from the alert:</span>{" "}
              {initialValues.reason}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              Create investigation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}