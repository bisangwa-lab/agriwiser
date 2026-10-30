import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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

export function FollowUpPanel({ investigationId }) {
  const client = useQueryClient();
  const { data: actions = [], isLoading, refetch } = useFollowUps(investigationId);
  const [form, setForm] = useState({ title: "", description: "", owner: "", due_date: "" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [completionId, setCompletionId] = useState(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    await refetch();
    await client.invalidateQueries({ queryKey: ["follow-ups-all"] });
  };

  async function addAction(event) {
    event.preventDefault();
    if (form.title.trim().length < 5 || form.owner.trim().length < 2 || !form.due_date) {
      setError("Enter an action, its responsible person and a due date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await base44.entities.FollowUpAction.create({
        investigation_id: investigationId,
        title: form.title.trim(),
        description: form.description,
        owner: form.owner.trim(),
        due_date: form.due_date,
        status: "pending",
      });
      setForm({ title: "", description: "", owner: "", due_date: "" });
      await refresh();
    } catch (err) {
      setError(err?.message ?? "Could not save this action.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(action, status, notes = undefined) {
    setBusyId(action.id);
    setError("");
    try {
      await base44.entities.FollowUpAction.update(action.id, {
        status,
        ...(notes !== undefined ? { notes } : {}),
      });
      setCompletionId(null);
      setCompletionNotes("");
      await refresh();
    } catch (err) {
      setError(err?.message ?? "Could not update the action. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return <Card className="panel border-0 shadow-none" id="investigation-follow-ups">
    <CardHeader className="pb-3">
      <CardTitle className="text-base">3. Agree the next action</CardTitle>
      <CardDescription className="text-[12.5px]">
        Give each action a responsible person and due date. Record the result before marking it complete.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-xs text-destructive">{error}</p>}
      {isLoading ? <p role="status" className="text-xs text-muted-foreground">Loading follow-up work…</p>
        : actions.length === 0
          ? <EmptyState icon={ListChecks} title="No follow-up actions yet" description="Add a specific next step below so someone can take responsibility." className="py-8"/>
          : <ul className="space-y-3">
              {actions.map(action => <li key={action.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{action.title}</p>
                    {action.description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{action.description}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">Responsible: {action.owner || "Not recorded"} · Due: {action.due_date ? formatDate(action.due_date) : "Not recorded"}</p>
                    {action.notes && <p className="mt-2 rounded-lg bg-muted/50 p-2.5 text-xs"><strong>Recorded outcome:</strong> {action.notes}</p>}
                  </div>
                  <div className="space-y-2">
                    <ToneTag tone={followUpStatusTone(action.status)}>{followUpStatusLabel(action.status)}</ToneTag>
                    <Select disabled={busyId === action.id} value={action.status} onValueChange={status => {
                      if (status === "completed" && action.status !== "completed") {
                        setCompletionId(action.id);
                        setCompletionNotes(action.notes || "");
                      } else changeStatus(action, status);
                    }}>
                      <SelectTrigger className="h-9 w-[144px] text-xs" aria-label={"Change status: " + action.title}><SelectValue/></SelectTrigger>
                      <SelectContent>{FOLLOWUP_STATUSES.map(status => <SelectItem key={status.key} value={status.key}>{status.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {completionId === action.id && <div className="mt-4 space-y-2 rounded-lg border border-primary/25 bg-accent/30 p-3">
                  <Label htmlFor={"action-outcome-" + action.id}>What was actually done?</Label>
                  <Textarea id={"action-outcome-" + action.id} rows={2} value={completionNotes} onChange={event => setCompletionNotes(event.target.value)} placeholder="Describe the action completed and what evidence confirms it."/>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busyId === action.id || completionNotes.trim().length < 10} onClick={() => changeStatus(action, "completed", completionNotes.trim())}>{busyId === action.id ? "Saving…" : "Confirm completion"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => {setCompletionId(null);setCompletionNotes("");}}>Cancel</Button>
                  </div>
                </div>}
              </li>)}
            </ul>}
      <form onSubmit={addAction} className="space-y-3 rounded-lg border border-dashed p-3.5">
        <p className="text-xs font-semibold">Add a follow-up action</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fu-title">What needs to be done?</Label>
            <Input id="fu-title" value={form.title} onChange={event => setForm(old => ({...old,title:event.target.value}))} placeholder="Verify harvested area records" required minLength={5}/>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu-owner">Who is responsible?</Label>
            <Input id="fu-owner" value={form.owner} onChange={event => setForm(old => ({...old,owner:event.target.value}))} placeholder="Officer or assigned contact" required minLength={2}/>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fu-due">Due date</Label>
            <Input id="fu-due" type="date" value={form.due_date} onChange={event => setForm(old => ({...old,due_date:event.target.value}))} required/>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu-description">How will it be checked? (optional)</Label>
            <Textarea id="fu-description" rows={2} value={form.description} onChange={event => setForm(old => ({...old,description:event.target.value}))} placeholder="Source, contact or evidence to collect"/>
          </div>
        </div>
        <Button type="submit" size="sm" disabled={saving}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin"/> : <Plus className="mr-1.5 h-4 w-4"/>}Add action</Button>
      </form>
    </CardContent>
  </Card>;
}
