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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag, followUpStatusLabel, followUpStatusTone } from "@/components/common/ToneTag";
import { FOLLOWUP_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { appClient } from "@/api/appClient";
import { useAuth } from "@/lib/AuthContext";
import { useFieldDirectory } from "@/hooks/useFieldFindings";
import { useFollowUps } from "@/hooks/useAgriRecords";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, ListChecks, Loader2, Plus, UserCheck, XCircle } from "lucide-react";

/** Follow-up actions: what someone will do, by when, and how it turned out. */
export function FollowUpPanel({ investigationId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: actions = [], isLoading, refetch } = useFollowUps(investigationId);
  const directory = useFieldDirectory();
  const [form, setForm] = useState({ title: "", description: "", owner_id: "", due_date: "" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!form.owner_id && user?.id) setForm((previous) => ({ ...previous, owner_id: user.id }));
  }, [form.owner_id, user?.id]);

  // Resolution modal state for completion or cancellation
  const [resolutionAction, setResolutionAction] = useState(null); // action object
  const [resolutionTargetStatus, setResolutionTargetStatus] = useState(null); // 'completed' | 'cancelled'
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolutionError, setResolutionError] = useState(null);
  const [resolving, setResolving] = useState(false);

  async function addAction(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Give the action a specific task title so it can be tracked.");
      return;
    }
    if (!form.owner_id) {
      setError("Choose the field account responsible for this action.");
      return;
    }
    if (!form.due_date) {
      setError("Set a target due date for this action.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await appClient.entities.FollowUpAction.create({
        investigation_id: investigationId,
        title: form.title.trim(),
        description: form.description.trim(),
        owner_id: form.owner_id,
        due_date: form.due_date,
      });
      setForm({ title: "", description: "", owner_id: user?.id ?? "", due_date: "" });
      setSuccess("Follow-up action created.");
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["follow-ups-all"] });
      await queryClient.invalidateQueries({ queryKey: ["investigation", investigationId] });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err?.message ?? "The action could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function handleStatusChangeRequest(action, newStatus) {
    if (newStatus === "completed" || newStatus === "cancelled") {
      // Require outcome or cancellation reason
      setResolutionAction(action);
      setResolutionTargetStatus(newStatus);
      setResolutionNote(action.notes || "");
      setResolutionError(null);
    } else {
      executeStatusUpdate(action, newStatus, action.notes || "");
    }
  }

  async function executeStatusUpdate(action, status, notes) {
    setBusyId(action.id);
    try {
      await appClient.entities.FollowUpAction.update(action.id, {
        expected_version: action.version ?? 0,
        status,
        notes: notes || "",
      });
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["follow-ups-all"] });
      await queryClient.invalidateQueries({ queryKey: ["investigation", investigationId] });
    } finally {
      setBusyId(null);
    }
  }

  async function submitResolution() {
    if (!resolutionNote.trim()) {
      setResolutionError(
        resolutionTargetStatus === "completed"
          ? "Please describe what was actually done or discovered to complete this action."
          : "Please state the reason why this action is being cancelled.",
      );
      return;
    }
    setResolving(true);
    setResolutionError(null);
    try {
      await executeStatusUpdate(resolutionAction, resolutionTargetStatus, resolutionNote.trim());
      setResolutionAction(null);
      setResolutionTargetStatus(null);
      setResolutionNote("");
    } catch (err) {
      setResolutionError(err?.message ?? "Failed to update action outcome.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <Card className="panel border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Follow-up actions & assignments</CardTitle>
          <span className="text-[11px] font-medium text-muted-foreground">{actions.length} tasks</span>
        </div>
        <CardDescription className="text-[12.5px]">
          Coordinate responsibilities with clear deadlines. Completion and cancellation require recorded outcomes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-[12.5px] text-muted-foreground">Loading actions…</p>
        ) : actions.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No follow-up actions yet"
            description="Add an action below: specify what needs checking, assign an officer, and set a due date."
            className="py-8"
          />
        ) : (
          <ul className="space-y-3">
            {actions.map((action) => {
              const isDone = action.status === "completed";
              const isCancelled = action.status === "cancelled";
              return (
                <li
                  key={action.id}
                  className={`rounded-lg border p-3.5 transition-colors ${
                    isDone
                      ? "border-primary/30 bg-accent/15"
                      : isCancelled
                        ? "border-muted bg-muted/20 opacity-80"
                        : "border-border/80 bg-card"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-[13.5px] font-medium ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {action.title}
                        </p>
                      </div>
                      {action.description ? (
                        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{action.description}</p>
                      ) : null}

                      {action.notes ? (
                        <div className="mt-2 rounded border border-border/80 bg-muted/40 p-2 text-[12px] leading-relaxed">
                          <span className="font-semibold text-foreground">
                            {isDone ? "Outcome recorded: " : isCancelled ? "Cancellation reason: " : "Action notes: "}
                          </span>
                          <span className="text-muted-foreground">{action.notes}</span>
                        </div>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3" aria-hidden />
                          <strong className="font-medium text-foreground">{action.owner || "Unassigned"}</strong>
                        </span>
                        {action.due_date ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden />
                            Due {formatDate(action.due_date)}
                          </span>
                        ) : null}
                        {action.completion_date ? (
                          <span className="flex items-center gap-1 text-primary">
                            <CheckCircle2 className="h-3 w-3" aria-hidden />
                            Completed {formatDate(action.completion_date)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ToneTag tone={followUpStatusTone(action.status)}>{followUpStatusLabel(action.status)}</ToneTag>
                      <Select
                        value={action.status}
                        onValueChange={(status) => handleStatusChangeRequest(action, status)}
                        disabled={busyId === action.id}
                      >
                        <SelectTrigger className="h-8 w-[132px] text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FOLLOWUP_STATUSES.map((status) => (
                            <SelectItem key={status.key} value={status.key}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={addAction} className="space-y-3 rounded-lg border border-dashed border-border p-3.5 bg-card/60">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Create new follow-up action
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fu-title">Task to complete</Label>
              <Input
                id="fu-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Verify harvested area with district agronomist or sector cooperative"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu-due">Target due date (required)</Label>
              <Input
                id="fu-due"
                type="date"
                value={form.due_date}
                onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="fu-owner">Responsible field account</Label>
                {user?.id && form.owner_id !== user.id ? (
                  <button
                    type="button"
                    className="text-[11px] font-medium text-primary hover:underline"
                    onClick={() => setForm((prev) => ({ ...prev, owner_id: user.id }))}
                  >
                    Assign to me
                  </button>
                ) : null}
              </div>
              <Select
                value={form.owner_id}
                onValueChange={(value) => setForm((prev) => ({ ...prev, owner_id: value }))}
                disabled={directory.isLoading}
              >
                <SelectTrigger id="fu-owner">
                  <SelectValue placeholder={directory.isLoading ? "Loading accounts…" : "Choose an officer"} />
                </SelectTrigger>
                <SelectContent>
                  {(directory.data ?? []).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.full_name || account.email} · {account.workspace_role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {directory.error ? (
                <p className="text-[11px] text-destructive">The account directory could not be loaded.</p>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fu-description">Description of what needs checking</Label>
              <Textarea
                id="fu-description"
                rows={2}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Specific guidance on documents to review, fields to visit, or contacts to verify with"
              />
            </div>
          </div>
          {error ? <p className="text-[12.5px] text-destructive">{error}</p> : null}
          {success ? <p className="text-[12.5px] text-primary">{success}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              )}
              Add follow-up action
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Completion or Cancellation Dialog */}
      <Dialog open={Boolean(resolutionAction)} onOpenChange={(open) => !open && setResolutionAction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {resolutionTargetStatus === "completed" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                  Document action completion
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" aria-hidden />
                  Reason for cancelling action
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-[12.5px]">
              {resolutionTargetStatus === "completed"
                ? "Every completed action must document what was actually observed, verified, or resolved."
                : "Record why this action is no longer necessary or cannot be executed."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{resolutionAction?.title}</p>
              {resolutionAction?.description && <p className="mt-1">{resolutionAction.description}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="res-note">
                {resolutionTargetStatus === "completed" ? "Written outcome / findings (required)" : "Cancellation reason (required)"}
              </Label>
              <Textarea
                id="res-note"
                rows={4}
                value={resolutionNote}
                onChange={(event) => setResolutionNote(event.target.value)}
                placeholder={
                  resolutionTargetStatus === "completed"
                    ? "Summarize what was inspected, documents verified, or feedback received from local agronomists..."
                    : "Explain why this step is no longer applicable or was superseded by other evidence..."
                }
                required
              />
            </div>
            {resolutionError && <p className="text-[12.5px] text-destructive">{resolutionError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setResolutionAction(null)} disabled={resolving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitResolution}
              disabled={resolving || !resolutionNote.trim()}
              variant={resolutionTargetStatus === "completed" ? "default" : "destructive"}
            >
              {resolving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />}
              {resolutionTargetStatus === "completed" ? "Confirm completion" : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
