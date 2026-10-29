import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag, followUpStatusLabel, followUpStatusTone } from "@/components/common/ToneTag";
import { FOLLOWUP_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { base44 } from "@/api/base44Client";
import { useFollowUps } from "@/hooks/useAgriRecords";
import { ListChecks, Loader2, Plus } from "lucide-react";

/** Follow-up actions: what someone will do, by when, and how it turned out. */
export function FollowUpPanel({ investigationId }) {
  const { data: actions = [], isLoading, refetch } = useFollowUps(investigationId);
  const [form, setForm] = useState({ title: "", description: "", owner: "", due_date: "" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  async function addAction(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Give the action a title so it can be tracked.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await base44.entities.FollowUpAction.create({
        investigation_id: investigationId,
        title: form.title.trim(),
        description: form.description,
        owner: form.owner,
        due_date: form.due_date || "",
        status: "pending",
        is_demo: true,
      });
      setForm({ title: "", description: "", owner: "", due_date: "" });
      await refetch();
    } catch (err) {
      setError(err?.message ?? "The action could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(action, status) {
    setBusyId(action.id);
    try {
      await base44.entities.FollowUpAction.update(action.id, {
        status,
        completion_date: status === "completed" ? new Date().toISOString().slice(0, 10) : "",
      });
      await refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="panel border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Follow-up actions</CardTitle>
        <CardDescription className="text-[12.5px]">
          Each action has an owner, a due date and a status that persist between visits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-[12.5px] text-muted-foreground">Loading actions…</p>
        ) : actions.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No follow-up actions yet"
            description="Add the first action below: what will be done, by whom and by when."
            className="py-8"
          />
        ) : (
          <ul className="space-y-3">
            {actions.map((action) => (
              <li key={action.id} className="rounded-lg border border-border/80 p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-foreground">{action.title}</p>
                    {action.description ? (
                      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{action.description}</p>
                    ) : null}
                    <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                      {action.owner || "No owner"} · due {action.due_date ? formatDate(action.due_date) : "not set"}
                      {action.completion_date ? ` · completed ${formatDate(action.completion_date)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ToneTag tone={followUpStatusTone(action.status)}>{followUpStatusLabel(action.status)}</ToneTag>
                    <Select value={action.status} onValueChange={(status) => changeStatus(action, status)} disabled={busyId === action.id}>
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
            ))}
          </ul>
        )}

        <form onSubmit={addAction} className="space-y-3 rounded-lg border border-dashed border-border p-3.5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fu-title">New action</Label>
              <Input
                id="fu-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Verify harvested area with the district agronomist"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu-due">Due date</Label>
              <Input
                id="fu-due"
                type="date"
                value={form.due_date}
                onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="fu-owner">Owner</Label>
              <Input
                id="fu-owner"
                value={form.owner}
                onChange={(event) => setForm((prev) => ({ ...prev, owner: event.target.value }))}
                placeholder="Name or role"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fu-description">Description</Label>
              <Textarea
                id="fu-description"
                rows={2}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
          </div>
          {error ? <p className="text-[12.5px] text-destructive">{error}</p> : null}
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            )}
            Add action
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}