import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { requireWorkspace } from "@/lib/route-access";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag, investigationStatusLabel, investigationStatusTone } from "@/components/common/ToneTag";
import { ObservationsPanel } from "@/components/investigations/ObservationsPanel";
import { FollowUpPanel } from "@/components/investigations/FollowUpPanel";
import { PublishedEvidenceViewer } from "@/components/investigations/PublishedEvidenceViewer";
import { WeatherContext } from "@/components/weather/WeatherContext";
import { useFollowUps, useInvestigation, useInvestigationNotes } from "@/hooks/useAgriRecords";
import { useFieldDirectory } from "@/hooks/useFieldFindings";
import { appClient } from "@/api/appClient";
import { useAuth } from "@/lib/AuthContext";
import { normalizeRole } from "@/lib/rbac";
import { CROPS, DISTRICT_NAMES, INDICATORS, INVESTIGATION_PRIORITIES, INVESTIGATION_STATUSES } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { attachFieldEvidence, decideFieldReview, getFieldReport, verifyFieldEvidence } from "@/lib/field-api";
import { buildFieldReportHtml } from "@/lib/field-report-print";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudSun,
  FileCheck2,
  FileText,
  History,
  Loader2,
  Paperclip,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authed/investigations/$investigationId")({
  beforeLoad: requireWorkspace(["officer", "data_manager"]),
  head: () => ({ meta: [{ title: "Investigation Workspace · AgriWiser" }] }),
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
  "evidence",
  "questions",
  "due_date",
  "outcome_summary",
];

const EVIDENCE_TYPE_OPTIONS = [
  ["document_reference", "Document reference"],
  ["photo_reference", "Photo reference"],
  ["interview_record", "Interview record"],
  ["source_excerpt", "Source excerpt"],
  ["other", "Other reference"],
];

const OUTCOME_TEMPLATE = `1. Scope & questions investigated:
Examined the reported yield and production variations for this district and season.

2. Evidence collected & source checks:
- Reviewed published agricultural data against previous season records.
- Completed local agronomist inquiries and field observations recorded in Step 2.

3. Key findings established:
- 

4. Remaining uncertainties & data limitations:
- 

5. Recommended operational or policy action:
- 

6. Follow-up requirements:
- `;

const REVIEW_LABEL = {
  not_submitted: "Not submitted",
  submitted: "Under review",
  approved: "Approved",
  returned: "Returned for evidence",
};

const SUPERVISORS = new Set(["super_admin", "field_supervisor"]);
const STAFF = new Set(["super_admin", "field_supervisor", "agricultural_officer", "field_investigator"]);

const attachmentVerification = (attachmentId, verifications = []) =>
  verifications
    .filter((item) => item.attachment_id === attachmentId)
    .sort((a, b) => String(b.created_date ?? "").localeCompare(String(a.created_date ?? "")))[0] ?? null;

function InvestigationDetailPage() {
  const { investigationId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: investigation, isLoading, error } = useInvestigation(investigationId);
  const notes = useInvestigationNotes(investigationId);
  const tasks = useFollowUps(investigationId);
  const directory = useFieldDirectory();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [showWeather, setShowWeather] = useState(false);
  const [assignmentReason, setAssignmentReason] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [reasonDialog, setReasonDialog] = useState(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewBusy, setReviewBusy] = useState(null);
  const [evidenceForm, setEvidenceForm] = useState({
    title: "",
    evidence_type: "document_reference",
    reference: "",
    description: "",
    collected_on: new Date().toISOString().slice(0, 10),
  });
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [verification, setVerification] = useState(null);

  const evidence = useQuery({
    queryKey: ["evidence-attachments", investigationId],
    enabled: Boolean(investigationId),
    queryFn: async () => {
      const page = await appClient.entities.EvidenceAttachment.filter(
        { investigation_id: investigationId },
        { sort: "-created_date", limit: 100 },
      );
      return page?.items ?? [];
    },
    staleTime: 10_000,
  });

  const verifications = useQuery({
    queryKey: ["evidence-verifications", investigationId],
    enabled: Boolean(investigationId),
    queryFn: async () => {
      const page = await appClient.entities.EvidenceVerification.filter(
        { investigation_id: investigationId },
        { sort: "-created_date", limit: 200 },
      );
      return page?.items ?? [];
    },
    staleTime: 10_000,
  });

  const reviews = useQuery({
    queryKey: ["review-decisions", investigationId],
    enabled: Boolean(investigationId),
    queryFn: async () => {
      const page = await appClient.entities.ReviewDecision.filter(
        { investigation_id: investigationId },
        { sort: "-created_date", limit: 100 },
      );
      return page?.items ?? [];
    },
    staleTime: 10_000,
  });

  const audit = useQuery({
    queryKey: ["audit-events", investigationId],
    enabled: Boolean(investigationId),
    queryFn: async () => {
      const page = await appClient.entities.AuditEvent.filter(
        { investigation_id: investigationId },
        { sort: "-created_date", limit: 200 },
      );
      return page?.items ?? [];
    },
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!investigation) return;
    const next = { assignee_id: investigation.assignee_id ?? "" };
    for (const key of EDITABLE) next[key] = investigation[key] ?? "";
    setForm(next);
    setAssignmentReason("");
    setCancellationReason(investigation.cancellation_reason ?? "");
    setReviewReason("");
  }, [investigation]);

  const role = normalizeRole(user);
  const isStaff = STAFF.has(role);
  const isSupervisor = SUPERVISORS.has(role);
  const isClosed = investigation ? ["completed", "cancelled"].includes(investigation.status) : false;
  const underReview = investigation?.review_status === "submitted";
  const locked = isClosed || underReview;
  const caseMemberIds = useMemo(
    () => [investigation?.created_by_id, investigation?.assignee_id, investigation?.submitted_by].filter(Boolean),
    [investigation?.created_by_id, investigation?.assignee_id, investigation?.submitted_by],
  );
  const caseMemberEmails = useMemo(
    () => [investigation?.created_by, investigation?.assignee_email].filter(Boolean).map((value) => String(value).toLowerCase()),
    [investigation?.created_by, investigation?.assignee_email],
  );
  const independentReviewer =
    isSupervisor &&
    !caseMemberIds.includes(user?.id) &&
    !caseMemberEmails.includes(String(user?.email ?? "").toLowerCase());
  const canApprove = independentReviewer && underReview && !isClosed;
  const openTasks = (tasks.data ?? []).filter((task) => !["completed", "cancelled"].includes(task.status));
  const noteRows = notes.data ?? [];
  const evidenceRows = evidence.data ?? [];
  const verificationRows = verifications.data ?? [];
  const readyToSubmit = Boolean(form?.outcome_summary?.trim()?.length >= 20 && noteRows.length);
  const readyToClose =
    investigation?.review_status === "approved" &&
    noteRows.length > 0 &&
    openTasks.length === 0 &&
    Boolean(form?.outcome_summary?.trim()?.length >= 20);
  const assigneeChanged = Boolean(form && form.assignee_id !== (investigation?.assignee_id ?? ""));

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function refreshRelated() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["investigation", investigationId] }),
      queryClient.invalidateQueries({ queryKey: ["investigations"] }),
      queryClient.invalidateQueries({ queryKey: ["investigation-notes", investigationId] }),
      queryClient.invalidateQueries({ queryKey: ["follow-ups", investigationId] }),
      queryClient.invalidateQueries({ queryKey: ["evidence-attachments", investigationId] }),
      queryClient.invalidateQueries({ queryKey: ["evidence-verifications", investigationId] }),
      queryClient.invalidateQueries({ queryKey: ["review-decisions", investigationId] }),
      queryClient.invalidateQueries({ queryKey: ["audit-events", investigationId] }),
    ]);
  }

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(null), 5000);
  }

  async function save(extra = {}) {
    if (!form || !investigation) return;
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      const payload = { ...form, ...extra, expected_version: investigation.version ?? 0 };
      if (payload.status === "cancelled" && cancellationReason.trim().length < 10) {
        throw new Error("Record a cancellation reason of at least 10 characters.");
      }
      if (assigneeChanged && assignmentReason.trim().length < 10) {
        throw new Error("Record why this case is being reassigned (at least 10 characters).");
      }
      if (assigneeChanged) payload.assignment_reason = assignmentReason.trim();
      if (payload.status === "cancelled") payload.cancellation_reason = cancellationReason.trim();
      delete payload.assignee_name;
      delete payload.assignee_email;

      await appClient.entities.Investigation.update(investigationId, payload);
      await refreshRelated();
      flash("Investigation saved. The change and its audit entry were committed together.");
    } catch (err) {
      setSaveError(
        err?.status === 409
          ? "This case changed while you were editing. Reload the workspace before saving again."
          : err?.message ?? "The investigation could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmReason() {
    const text = reasonDialog?.text?.trim() ?? "";
    if (text.length < 10) {
      setSaveError("Record a reason of at least 10 characters.");
      return;
    }
    if (reasonDialog?.mode === "reopen") {
      await save({ status: "in_progress", reopen_reason: text, closed_date: "" });
    } else if (reasonDialog?.mode === "cancel") {
      setCancellationReason(text);
      set("status", "cancelled");
      await save({ status: "cancelled", cancellation_reason: text });
    }
    setReasonDialog(null);
  }

  async function decide(decision) {
    if (reviewReason.trim().length < 10) {
      setSaveError("Record the review reason and its limitations (at least 10 characters).");
      return;
    }
    setReviewBusy(decision);
    setSaveError(null);
    setNotice(null);
    try {
      await decideFieldReview({
        data: {
          case_id: investigationId,
          expected_version: investigation.version ?? 0,
          decision,
          reason: reviewReason.trim(),
        },
      });
      await refreshRelated();
      setReviewReason("");
      flash(
        decision === "submit"
          ? "Submitted for independent supervisor review."
          : decision === "approve"
            ? "Review approved. The case can now be completed once all gates are met."
            : "Returned for additional evidence. The case is no longer under review.",
      );
    } catch (err) {
      setSaveError(err?.message ?? "The review decision could not be recorded.");
    } finally {
      setReviewBusy(null);
    }
  }

  async function attachEvidence(event) {
    event.preventDefault();
    if (!evidenceForm.title.trim() || !evidenceForm.reference.trim()) {
      setSaveError("Give the evidence a title and a resolvable reference.");
      return;
    }
    setEvidenceBusy(true);
    setSaveError(null);
    try {
      await attachFieldEvidence({
        data: {
          investigation_id: investigationId,
          title: evidenceForm.title.trim(),
          evidence_type: evidenceForm.evidence_type,
          reference: evidenceForm.reference.trim(),
          description: evidenceForm.description.trim(),
          collected_on: evidenceForm.collected_on,
        },
      });
      setEvidenceForm({
        title: "",
        evidence_type: "document_reference",
        reference: "",
        description: "",
        collected_on: new Date().toISOString().slice(0, 10),
      });
      await refreshRelated();
      flash("Evidence reference attached. Only metadata and the reference were stored.");
    } catch (err) {
      setSaveError(err?.message ?? "The evidence reference could not be attached.");
    } finally {
      setEvidenceBusy(false);
    }
  }

  async function submitVerification() {
    if (!verification) return;
    if (verification.reason.trim().length < 10) {
      setSaveError("Record what was checked and any limitations (at least 10 characters).");
      return;
    }
    setEvidenceBusy(true);
    setSaveError(null);
    try {
      await verifyFieldEvidence({
        data: {
          attachment_id: verification.attachmentId,
          decision: verification.decision,
          reason: verification.reason.trim(),
        },
      });
      await refreshRelated();
      setVerification(null);
      flash("Evidence verification recorded.");
    } catch (err) {
      setSaveError(err?.message ?? "The verification could not be recorded.");
    } finally {
      setEvidenceBusy(false);
    }
  }

  async function printReport() {
    setSaveError(null);
    try {
      const report = await getFieldReport({ data: investigationId });
      const win = window.open("", "_blank");
      if (!win) throw new Error("Allow pop-ups to open the printable report.");
      win.opener = null;
      win.document.write(buildFieldReportHtml(report));
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
    } catch (err) {
      setSaveError(err?.message ?? "The authorized report could not be generated.");
    }
  }

  if (isLoading) {
    return <p className="py-16 text-center text-[13px] text-muted-foreground">Loading investigation workspace…</p>;
  }

  if (error || !investigation || !form || !isStaff) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Investigations" title="Investigation not available" />
        <Card>
          <EmptyState
            icon={FileText}
            title="This investigation could not be opened"
            description={
              !isStaff
                ? "Your role does not have access to field investigation records."
                : error?.message ??
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
        eyebrow="Panel 3 · Investigation Workspace"
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
            <Button size="sm" variant="outline" onClick={printReport}>
              <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Authorized report
            </Button>
            <Button size="sm" onClick={() => save()} disabled={saving || locked || !isStaff}>
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <ToneTag tone={investigationStatusTone(form.status)}>{investigationStatusLabel(form.status)}</ToneTag>
          <ToneTag tone={investigation.review_status === "approved" ? "primary" : underReview ? "warning" : "outline"}>
            {REVIEW_LABEL[investigation.review_status] ?? "Not submitted"}
          </ToneTag>
          <ToneTag tone={form.priority === "elevated" ? "warning" : "outline"}>
            {form.priority === "elevated" ? "Elevated priority" : "Standard priority"}
          </ToneTag>
          <span className="text-[11.5px] text-muted-foreground">
            Version {investigation.version ?? 0} · updated {formatDateTime(investigation.updated_date)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {form.district && WEATHER_READY(form.district) ? (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowWeather((prev) => !prev)}>
              <CloudSun className="mr-1.5 h-3.5 w-3.5 text-primary" aria-hidden />
              {showWeather ? "Hide district climate" : `Review ${form.district} climate`}
              {showWeather ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
            </Button>
          ) : null}
          {isClosed && isSupervisor ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReasonDialog({ mode: "reopen", text: "" })}
              disabled={saving}
              className="text-xs text-primary"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Reopen with reason
            </Button>
          ) : null}
        </div>
      </div>

      {showWeather && form.district ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Seasonal climate context · {form.district}</h3>
              <p className="text-xs text-muted-foreground">
                Contextual estimates only. A rainfall or temperature anomaly never proves the cause of a reported change.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowWeather(false)}>
              Close
            </Button>
          </div>
          <WeatherContext
            key={`${form.district}-${form.period}-${form.crop}`}
            district={form.district}
            crop={form.crop || "Maize"}
            period={form.period}
          />
        </div>
      ) : null}

      {notice ? (
        <p className="rounded-lg border border-primary/25 bg-accent/60 p-3 text-[12.5px] text-accent-foreground">{notice}</p>
      ) : null}
      {saveError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[12.5px] text-destructive">
          {saveError}
        </p>
      ) : null}
      {locked ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-[12.5px] text-amber-900">
          {underReview
            ? "This case is under independent review. Editing is locked until the supervisor approves or returns it."
            : "This case is closed. A supervisor must reopen it with a recorded reason before edits are allowed."}
        </p>
      ) : null}

      {/* Step 1: Understand the Problem & Operational Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            1
          </span>
          <h2 className="text-sm font-semibold text-foreground">Step 1 — Understand the agricultural problem & operational scope</h2>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Card className="panel border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Operational details</CardTitle>
              <CardDescription className="text-[12.5px]">
                Every save compares the stored version and records an audit entry. Original published evidence is never rewritten.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="d-title">Title / Problem identification</Label>
                <Input id="d-title" value={form.title} disabled={locked} onChange={(event) => set("title", event.target.value)} />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="d-status">Status</Label>
                  <Select
                    value={form.status}
                    disabled={locked}
                    onValueChange={(value) => {
                      if (value === "cancelled") {
                        set("status", value);
                        return;
                      }
                      set("status", value);
                    }}
                  >
                    <SelectTrigger id="d-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVESTIGATION_STATUSES.map((item) => (
                        <SelectItem key={item.key} value={item.key} disabled={item.key === "completed" && !readyToClose}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-priority">Priority</Label>
                  <Select value={form.priority || "standard"} disabled={locked} onValueChange={(value) => set("priority", value)}>
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
                  <Label htmlFor="d-indicator">Agricultural Indicator</Label>
                  <Select
                    value={form.indicator || "none"}
                    disabled={locked}
                    onValueChange={(value) => set("indicator", value === "none" ? "" : value)}
                  >
                    <SelectTrigger id="d-indicator">
                      <SelectValue placeholder="Not set" />
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
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="d-crop">Crop</Label>
                  <Select
                    value={form.crop || "none"}
                    disabled={locked}
                    onValueChange={(value) => set("crop", value === "none" ? "" : value)}
                  >
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
                    disabled={locked}
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
                  <Label htmlFor="d-period">Reporting period</Label>
                  <Input
                    id="d-period"
                    value={form.period}
                    disabled={locked}
                    onChange={(event) => set("period", event.target.value)}
                    placeholder="e.g. 2024 Season A"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="d-reason">Why investigation is needed</Label>
                <Textarea
                  id="d-reason"
                  rows={3}
                  value={form.reason}
                  disabled={locked}
                  onChange={(event) => set("reason", event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="d-questions">Specific questions to check</Label>
                <Textarea
                  id="d-questions"
                  rows={3}
                  value={form.questions}
                  disabled={locked}
                  onChange={(event) => set("questions", event.target.value)}
                  placeholder="e.g. Did fertilizer delivery delays affect planting? Was fall armyworm reported?"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="d-description">Operational context & notes</Label>
                <Textarea
                  id="d-description"
                  rows={2}
                  value={form.description}
                  disabled={locked}
                  onChange={(event) => set("description", event.target.value)}
                />
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="d-assignee">Assigned field account</Label>
                  <Select
                    value={form.assignee_id || "none"}
                    disabled={locked || !isStaff}
                    onValueChange={(value) => set("assignee_id", value === "none" ? "" : value)}
                  >
                    <SelectTrigger id="d-assignee">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {(directory.data ?? []).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.full_name || account.email} · {account.workspace_role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {investigation.assignee_name || investigation.assignee_email || "No officer assigned."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-due">Investigation deadline</Label>
                  <Input
                    id="d-due"
                    type="date"
                    value={form.due_date}
                    disabled={locked}
                    onChange={(event) => set("due_date", event.target.value)}
                  />
                </div>
              </div>

              {assigneeChanged ? (
                <div className="space-y-1.5">
                  <Label htmlFor="d-assignment-reason">Reassignment reason (required)</Label>
                  <Textarea
                    id="d-assignment-reason"
                    rows={2}
                    value={assignmentReason}
                    onChange={(event) => setAssignmentReason(event.target.value)}
                    placeholder="Explain why responsibility is moving to another field account."
                  />
                  {!isSupervisor ? (
                    <p className="text-[11.5px] text-destructive">Only a supervisor can reassign cases.</p>
                  ) : null}
                </div>
              ) : null}

              {form.status === "cancelled" && !isClosed ? (
                <div className="space-y-1.5">
                  <Label htmlFor="d-cancellation-reason">Cancellation reason (required)</Label>
                  <Textarea
                    id="d-cancellation-reason"
                    rows={2}
                    value={cancellationReason}
                    onChange={(event) => setCancellationReason(event.target.value)}
                    placeholder="Explain why this investigation is no longer required or cannot proceed."
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="panel border-0 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Preserved evidence & source context</CardTitle>
                <CardDescription className="text-[12.5px]">
                  Original data that triggered this investigation, preserved so source context remains tamper-free.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="d-evidence">Supporting evidence & source references</Label>
                  <Textarea
                    id="d-evidence"
                    rows={4}
                    value={form.evidence}
                    disabled={locked}
                    onChange={(event) => set("evidence", event.target.value)}
                  />
                </div>

                {investigation.finding_group_id ? (
                  <p className="rounded-lg border border-border bg-muted/40 p-3 text-[12px] text-muted-foreground">
                    Triggered by grouped dataset finding{" "}
                    <span className="font-mono text-[11px] text-foreground">{investigation.finding_group_id}</span>
                    {investigation.finding_validation_status ? ` · ${investigation.finding_validation_status}` : ""}.
                  </p>
                ) : null}
                {investigation.alert_id ? (
                  <p className="text-[12.5px] text-muted-foreground">
                    Originating alert:{" "}
                    <Link to="/alerts" className="font-medium text-primary hover:underline">
                      {investigation.alert_title || investigation.alert_id}
                    </Link>
                  </p>
                ) : null}

                {investigation.calculation_snapshot ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-[12px] leading-relaxed text-muted-foreground">
                    <p className="font-medium text-foreground">Calculation logic at capture</p>
                    <p className="mt-1 whitespace-pre-line">{investigation.calculation_snapshot}</p>
                  </div>
                ) : null}

                {investigation.metric_snapshot ? (
                  <details className="rounded-lg border border-border p-3 text-[12px]">
                    <summary className="cursor-pointer font-medium text-foreground">Stored metric snapshot</summary>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                      {investigation.metric_snapshot}
                    </pre>
                  </details>
                ) : null}

                <p className="text-[11.5px] text-muted-foreground">
                  Source dataset:{" "}
                  <span className="font-medium text-foreground">{investigation.dataset_name || "Not recorded"}</span> ·
                  provenance: {investigation.provenance_status || "unknown"}
                  {investigation.is_demo ? " · demonstration record (excluded from official detection)" : ""}
                </p>
              </CardContent>
            </Card>

            <Card className="panel border-0 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Paperclip className="h-4 w-4 text-primary" aria-hidden />
                  Evidence references
                </CardTitle>
                <CardDescription className="text-[12.5px]">
                  Store a resolvable reference and its metadata. File upload, malware scanning and content analysis are not configured.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {evidence.isLoading ? (
                  <p className="text-[12px] text-muted-foreground">Loading evidence references…</p>
                ) : evidenceRows.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">No evidence references attached yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {evidenceRows.map((item) => {
                      const decision = attachmentVerification(item.id, verificationRows);
                      return (
                        <li key={item.id} className="rounded-lg border border-border/80 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                              <p className="mt-0.5 break-all text-[11.5px] text-muted-foreground">{item.reference}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {item.evidence_type} · collected {formatDate(item.collected_on)} by {item.collected_by}
                              </p>
                            </div>
                            <ToneTag tone={decision?.decision === "verified" ? "primary" : decision?.decision === "rejected" ? "danger" : "outline"}>
                              {decision ? decision.decision : "Unverified"}
                            </ToneTag>
                          </div>
                          {decision ? (
                            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                              {decision.actor_name}: {decision.reason}
                            </p>
                          ) : null}
                          {!decision && isSupervisor && !locked ? (
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={() => setVerification({ attachmentId: item.id, decision: "verified", reason: "" })}
                              >
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px] text-destructive"
                                onClick={() => setVerification({ attachmentId: item.id, decision: "rejected", reason: "" })}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {!locked ? (
                  <form onSubmit={attachEvidence} className="space-y-3 rounded-lg border border-dashed border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attach a reference</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="ev-title">Evidence title</Label>
                        <Input
                          id="ev-title"
                          value={evidenceForm.title}
                          onChange={(event) => setEvidenceForm((prev) => ({ ...prev, title: event.target.value }))}
                          placeholder="District agronomist visit note"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ev-type">Reference type</Label>
                        <Select
                          value={evidenceForm.evidence_type}
                          onValueChange={(value) => setEvidenceForm((prev) => ({ ...prev, evidence_type: value }))}
                        >
                          <SelectTrigger id="ev-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EVIDENCE_TYPE_OPTIONS.map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ev-reference">Reference (document ID, https link or record locator)</Label>
                      <Input
                        id="ev-reference"
                        value={evidenceForm.reference}
                        onChange={(event) => setEvidenceForm((prev) => ({ ...prev, reference: event.target.value }))}
                        placeholder="e.g. MINAGRI/2026/014 or https://…"
                        required
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="ev-date">Collected / checked date</Label>
                        <Input
                          id="ev-date"
                          type="date"
                          value={evidenceForm.collected_on}
                          onChange={(event) => setEvidenceForm((prev) => ({ ...prev, collected_on: event.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ev-description">What it shows</Label>
                        <Input
                          id="ev-description"
                          value={evidenceForm.description}
                          onChange={(event) => setEvidenceForm((prev) => ({ ...prev, description: event.target.value }))}
                          placeholder="Short description and limitations"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" disabled={evidenceBusy}>
                        {evidenceBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : <Paperclip className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
                        Attach reference
                      </Button>
                    </div>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <PublishedEvidenceViewer district={form.district} crop={form.crop} currentPeriod={form.period} />
      </div>

      {/* Step 2 & Step 3: Collect Evidence & Manage Actions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            2 & 3
          </span>
          <h2 className="text-sm font-semibold text-foreground">Step 2 & 3 — Collect verified evidence and manage follow-up tasks</h2>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <ObservationsPanel investigationId={investigationId} />
          <FollowUpPanel investigationId={investigationId} />
        </div>
      </div>

      {/* Step 4: Document the Outcome and review */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            4
          </span>
          <h2 className="text-sm font-semibold text-foreground">Step 4 — Document the outcome, review and close</h2>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Card className="panel border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Final outcome summary & recommendations</CardTitle>
                  <CardDescription className="text-[12.5px]">
                    Closure requires an approved review, recorded evidence, completed follow-ups and a meaningful outcome summary.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={locked}
                  onClick={() => {
                    if (!form.outcome_summary?.trim()) set("outcome_summary", OUTCOME_TEMPLATE);
                  }}
                >
                  Insert outcome structure
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                rows={8}
                value={form.outcome_summary}
                disabled={locked}
                onChange={(event) => set("outcome_summary", event.target.value)}
                placeholder="Detail what was investigated, evidence verified, established findings, what remains uncertain, and recommended actions..."
                aria-label="Outcome summary"
              />

              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-[11.5px]">
                <p className="font-medium text-foreground">Closure readiness</p>
                <p className={investigation.review_status === "approved" ? "text-primary" : "text-amber-800"}>
                  {investigation.review_status === "approved" ? "✓" : "•"} Independent supervisor approval{" "}
                  {investigation.review_status === "approved" ? "recorded" : "required"}
                </p>
                <p className={noteRows.length ? "text-primary" : "text-amber-800"}>
                  {noteRows.length ? "✓" : "•"} Evidence or observation notes: {noteRows.length}
                </p>
                <p className={openTasks.length === 0 ? "text-primary" : "text-amber-800"}>
                  {openTasks.length === 0 ? "✓" : "•"} Open follow-up actions: {openTasks.length}
                </p>
                <p className={form.outcome_summary?.trim()?.length >= 20 ? "text-primary" : "text-amber-800"}>
                  {form.outcome_summary?.trim()?.length >= 20 ? "✓" : "•"} Outcome summary at least 20 characters
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => save({ status: "awaiting_evidence" })}
                    disabled={saving || locked}
                  >
                    Mark awaiting evidence
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => save({ status: "completed" })}
                    disabled={saving || locked || !readyToClose}
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Complete investigation
                  </Button>
                </div>
                {investigation.closed_date ? (
                  <p className="text-[11.5px] text-muted-foreground">Closed on {formatDate(investigation.closed_date)}.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="panel border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                Independent review
              </CardTitle>
              <CardDescription className="text-[12.5px]">
                The officer submits the documented case; a different supervisor approves or returns it. The database enforces both steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-[12px]">
                <p>
                  <span className="text-muted-foreground">Review state: </span>
                  <strong>{REVIEW_LABEL[investigation.review_status] ?? "Not submitted"}</strong>
                </p>
                {investigation.submitted_date ? (
                  <p className="mt-1 text-muted-foreground">Submitted {formatDateTime(investigation.submitted_date)}</p>
                ) : null}
                {investigation.reviewed_by ? (
                  <p className="mt-1 text-muted-foreground">Last decision by account {investigation.reviewed_by}</p>
                ) : null}
              </div>

              {!isClosed ? (
                <div className="space-y-1.5">
                  <Label htmlFor="review-reason">Review reason and limitations</Label>
                  <Textarea
                    id="review-reason"
                    rows={3}
                    value={reviewReason}
                    onChange={(event) => setReviewReason(event.target.value)}
                    placeholder="State what was checked, what remains uncertain, and why the decision is justified."
                  />
                  <p className="text-[11px] text-muted-foreground">At least 10 characters; stored with the decision and audit trail.</p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {investigation.review_status !== "submitted" && investigation.review_status !== "approved" && !isClosed ? (
                  <Button size="sm" onClick={() => decide("submit")} disabled={!readyToSubmit || reviewBusy !== null}>
                    {reviewBusy === "submit" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : <FileCheck2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
                    Submit for review
                  </Button>
                ) : null}
                {canApprove ? (
                  <>
                    <Button size="sm" onClick={() => decide("approve")} disabled={reviewBusy !== null}>
                      {reviewBusy === "approve" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
                      Approve review
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decide("return")} disabled={reviewBusy !== null}>
                      Return for evidence
                    </Button>
                  </>
                ) : null}
                {underReview && isSupervisor && !independentReviewer ? (
                  <p className="text-[11.5px] text-amber-800">
                    You created, are assigned to, or submitted this case. Another supervisor must decide the review.
                  </p>
                ) : null}
              </div>

              {reviews.data?.length ? (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decision history</p>
                  {reviews.data.map((decision) => (
                    <div key={decision.id} className="rounded border border-border/80 p-2 text-[11.5px]">
                      <p className="font-medium text-foreground">
                        {decision.decision} · {decision.actor_name}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">{decision.reason}</p>
                      <p className="mt-0.5 text-muted-foreground">{formatDateTime(decision.created_date)}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="panel border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" aria-hidden />
            Audit trail
          </CardTitle>
          <CardDescription className="text-[12.5px]">
            Each workflow change is committed with its audit entry. Versions show which stored record was changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audit.isLoading ? (
            <p className="text-[12px] text-muted-foreground">Loading audit history…</p>
          ) : (audit.data ?? []).length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No audit entries are recorded for this case yet.</p>
          ) : (
            <ol className="space-y-2">
              {audit.data.map((event) => (
                <li key={event.id} className="rounded-lg border border-border/80 p-3 text-[11.5px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {event.action} · {event.entity} {event.record_id}
                    </p>
                    <p className="text-muted-foreground">{formatDateTime(event.created_date)}</p>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {event.actor_name || event.actor_id} · version {event.from_version ?? 0} → {event.to_version ?? "?"}
                  </p>
                  {event.reason ? <p className="mt-1 text-foreground/80">Reason: {event.reason}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/investigations" })}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Back to all investigations
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/reports">Build a report from this investigation</Link>
        </Button>
      </div>

      <Dialog open={Boolean(reasonDialog)} onOpenChange={(open) => !open && setReasonDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {reasonDialog?.mode === "cancel" ? "Cancel this investigation" : "Reopen this investigation"}
            </DialogTitle>
            <DialogDescription className="text-[12.5px]">
              A supervisor must record why a closed case is being reopened. The reason is stored in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reason-dialog">Reason (required, at least 10 characters)</Label>
            <Textarea
              id="reason-dialog"
              rows={4}
              value={reasonDialog?.text ?? ""}
              onChange={(event) => setReasonDialog((prev) => ({ ...prev, text: event.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReasonDialog(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={confirmReason} disabled={saving || (reasonDialog?.text?.trim()?.length ?? 0) < 10}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              {reasonDialog?.mode === "cancel" ? "Confirm cancellation" : "Confirm reopen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(verification)} onOpenChange={(open) => !open && setVerification(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {verification?.decision === "rejected" ? "Reject evidence reference" : "Verify evidence reference"}
            </DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Describe what you checked and any remaining limitations. This decision is immutable and audited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="verification-reason">Verification reason and limitations (required)</Label>
            <Textarea
              id="verification-reason"
              rows={4}
              value={verification?.reason ?? ""}
              onChange={(event) => setVerification((prev) => ({ ...prev, reason: event.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setVerification(null)} disabled={evidenceBusy}>
              Cancel
            </Button>
            <Button
              onClick={submitVerification}
              disabled={evidenceBusy || (verification?.reason?.trim()?.length ?? 0) < 10}
              variant={verification?.decision === "rejected" ? "destructive" : "default"}
            >
              {evidenceBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              {verification?.decision === "rejected" ? "Confirm rejection" : "Confirm verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Kept outside the component so the weather button stays declarative without
// importing the full weather-location dataset into the initial route chunk.
function WEATHER_READY(district) {
  return DISTRICT_NAMES.includes(district);
}
