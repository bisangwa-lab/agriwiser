import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { requireWorkspace } from "@/lib/route-access";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag, investigationStatusLabel, investigationStatusTone } from "@/components/common/ToneTag";
import { ObservationsPanel } from "@/components/investigations/ObservationsPanel";
import { FollowUpPanel } from "@/components/investigations/FollowUpPanel";
import { useInvestigation } from "@/hooks/useAgriRecords";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CROPS, DISTRICT_NAMES, INDICATORS, INVESTIGATION_PRIORITIES, INVESTIGATION_STATUSES } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { ArrowLeft, ClipboardList, Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/_authed/investigations/$investigationId")({
  beforeLoad: requireWorkspace(["officer", "data_manager"]),
  head: () => ({ meta: [{ title: "Investigation · HingaSmart Rwanda" }] }),
  component: InvestigationDetailPage,
});

const EDITABLE = [
  "title",
  "description",
  "reason",
  "status",
  "priority",
  "crop",
  "district",
  "indicator",
  "period",
  "questions",
  "assignee_name",
  "assignee_email",
  "due_date",
  "outcome_summary",
];

function InvestigationDetailPage() {
  const { investigationId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: investigation, isLoading, error } = useInvestigation(investigationId);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (investigation) {
      const next = {};
      for (const key of EDITABLE) next[key] = investigation[key] ?? "";
      setForm(next);
    }
  }, [investigation]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function save(extra = {}) {
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      const payload = { ...form, ...extra };
      if (payload.status === "completed" && !payload.closed_date) payload.closed_date = new Date().toISOString();
      const savedRecord = await base44.entities.Investigation.update(investigationId, payload);
      await queryClient.invalidateQueries({ queryKey: ["investigation", investigationId] });
      await queryClient.invalidateQueries({ queryKey: ["investigations"] });
      setForm((prev) => ({ ...prev, ...payload, assignee_name: savedRecord?.assignee_name ?? prev.assignee_name, assignee_email: savedRecord?.assignee_email ?? prev.assignee_email }));
      setNotice("Saved. The record and its evidence are stored, not held in the browser.");
    } catch (err) {
      setSaveError(err?.message ?? "The investigation could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <p className="py-16 text-center text-[13px] text-muted-foreground">Loading investigation…</p>;
  }

  if (error || !investigation || !form) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Investigations" title="Investigation not available" />
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="This investigation could not be opened"
            description={
              error?.message ??
              "The record does not exist, or it is not available to your account. It may have been removed."
            }
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/investigations">Back to the workspace</Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Investigation"
        title={form.title || "Untitled investigation"}
        description={[form.crop, form.district, form.period].filter(Boolean).join(" · ") || "Scope not set"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/investigations">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                All investigations
              </Link>
            </Button>
            <Button size="sm" onClick={() => save()} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              )}
              Save changes
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ToneTag tone={investigationStatusTone(form.status)}>{investigationStatusLabel(form.status)}</ToneTag>
        <ToneTag tone={form.priority === "elevated" ? "warning" : "outline"}>
          {form.priority === "elevated" ? "Elevated priority" : "Standard priority"}
        </ToneTag>
        <span className="text-[11.5px] text-muted-foreground">
          Created {formatDateTime(investigation.created_date)} · last updated {formatDateTime(investigation.updated_date)}
        </span>
      </div>

      {notice ? (
        <p className="rounded-lg border border-primary/25 bg-accent/60 p-3 text-[12.5px] text-accent-foreground">
          {notice}
        </p>
      ) : null}
      {saveError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[12.5px] text-destructive">
          {saveError}
        </p>
      ) : null}

      <div className="rounded-xl border bg-muted/35 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="font-semibold text-foreground">Work through the investigation</p>
        <p className="mt-1">1. Confirm the question and assignment → 2. Record dated checks → 3. Assign follow-up work → 4. Summarize the outcome. Save changes when you update the investigation details.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Review the finding and assignment</CardTitle>
            <CardDescription className="text-[12.5px]">
              Confirm the district, crop, reporting period and who is responsible. Original evidence remains unchanged.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="d-title">Title</Label>
              <Input id="d-title" value={form.title} onChange={(event) => set("title", event.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="d-status">Status</Label>
                <Select value={form.status} onValueChange={(value) => set("status", value)}>
                  <SelectTrigger id="d-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTIGATION_STATUSES.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-priority">Priority</Label>
                <Select value={form.priority || "standard"} onValueChange={(value) => set("priority", value)}>
                  <SelectTrigger id="d-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTIGATION_PRIORITIES.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-indicator">Indicator</Label>
                <Select
                  value={form.indicator || "none"}
                  onValueChange={(value) => set("indicator", value === "none" ? "" : value)}
                >
                  <SelectTrigger id="d-indicator">
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
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="d-crop">Crop</Label>
                <Select value={form.crop || "none"} onValueChange={(value) => set("crop", value === "none" ? "" : value)}>
                  <SelectTrigger id="d-crop">
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {CROPS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-district">District</Label>
                <Select
                  value={form.district || "none"}
                  onValueChange={(value) => set("district", value === "none" ? "" : value)}
                >
                  <SelectTrigger id="d-district">
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {DISTRICT_NAMES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-period">Period</Label>
                <Input id="d-period" value={form.period} onChange={(event) => set("period", event.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="d-reason">Reason for investigating</Label>
              <Textarea id="d-reason" rows={3} value={form.reason} onChange={(event) => set("reason", event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="d-questions">Questions to investigate</Label>
              <Textarea
                id="d-questions"
                rows={4}
                value={form.questions}
                onChange={(event) => set("questions", event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="d-description">Description</Label>
              <Textarea
                id="d-description"
                rows={3}
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
              />
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="d-assignee">Assigned officer (from account)</Label>
                <Input
                  id="d-assignee"
                  value={form.assignee_name}
                  readOnly
                  placeholder="Enter an officer email to assign"
                />
                {user?.full_name && form.assignee_name !== user.full_name ? (
                  <button
                    type="button"
                    className="text-[11.5px] font-medium text-primary hover:underline"
                    onClick={() => {
                      set("assignee_name", user.full_name ?? user.email ?? "");
                      set("assignee_email", user.email ?? "");
                    }}
                  >
                    Assign to me
                  </button>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-due">Due date</Label>
                <Input id="d-due" type="date" value={form.due_date} onChange={(event) => set("due_date", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-assignee-email">Officer account email</Label>
                <Input
                  id="d-assignee-email"
                  type="email"
                  value={form.assignee_email}
                  onChange={(event) => set("assignee_email", event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="panel border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Original source evidence</CardTitle>
              <CardDescription className="text-[12.5px]">
                Preserved from the moment the investigation was created, so the original finding is never lost.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Original source notes (read-only)</p>
                <p className="whitespace-pre-line rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">{investigation.evidence || "No original evidence note was supplied."}</p>
                <p className="text-[11px] text-muted-foreground">Add new checks below as dated observations. The original evidence is not overwritten.</p>
              </div>

              {investigation.alert_id ? (
                <p className="text-[12.5px] text-muted-foreground">
                  Raised from alert:{" "}
                  <Link to="/alerts" className="font-medium text-primary hover:underline">
                    {investigation.alert_title || investigation.alert_id}
                  </Link>
                </p>
              ) : null}

              {investigation.calculation_snapshot ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-[12px] leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">Calculation used</p>
                  <p className="mt-1">{investigation.calculation_snapshot}</p>
                </div>
              ) : null}

              {investigation.metric_snapshot ? (
                <details className="rounded-lg border border-border p-3 text-[12px]">
                  <summary className="cursor-pointer font-medium text-foreground">Stored evidence snapshot</summary>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                    {investigation.metric_snapshot}
                  </pre>
                </details>
              ) : null}

              <p className="text-[11.5px] text-muted-foreground">
                Source dataset: {investigation.dataset_name || "not recorded"}
              </p>
            </CardContent>
          </Card>

        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ObservationsPanel investigationId={investigationId} />
        <FollowUpPanel investigationId={investigationId} />
      </div>

          <Card className="panel border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">4. Record the outcome</CardTitle>
              <CardDescription className="text-[12.5px]">
                Write what the evidence establishes, what is still uncertain, and the recommended next step. This does not prove a cause.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={5}
                value={form.outcome_summary}
                onChange={(event) => set("outcome_summary", event.target.value)}
                placeholder="What the evidence showed, what it could not establish, and the recommended next step"
                aria-label="Outcome summary"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => save({ status: "awaiting_evidence" })}
                  disabled={saving}
                >
                  Mark awaiting evidence
                </Button>
                <Button
                  size="sm"
                  onClick={() => save({ status: "completed", closed_date: new Date().toISOString() })}
                  disabled={saving || (form.outcome_summary?.trim().length ?? 0) < 15}
                >
                  Complete with this summary
                </Button>
              </div>
              {(form.outcome_summary?.trim().length ?? 0) < 15 ? (
                <p className="text-[11.5px] text-muted-foreground">
                  Write at least 15 characters describing the outcome before marking the investigation complete.
                </p>
              ) : null}
              {investigation.closed_date ? (
                <p className="text-[11.5px] text-muted-foreground">
                  Closed {formatDate(investigation.closed_date)}. It can be reopened by changing the status.
                </p>
              ) : null}
            </CardContent>
          </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/investigations" })}>
          Back to all investigations
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/reports">Build a report from this investigation</Link>
        </Button>
      </div>
    </div>
  );
}