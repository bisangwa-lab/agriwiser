import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { NOTE_TYPES } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useInvestigationNotes } from "@/hooks/useAgriRecords";
import { Loader2, NotebookPen, Plus } from "lucide-react";

const NOTE_LABEL = NOTE_TYPES.reduce((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {});

/** Notes, field observations and evidence attached to an investigation. */
export function ObservationsPanel({ investigationId, isDemo = false }) {
  const { user } = useAuth();
  const { data: notes = [], isLoading, refetch } = useInvestigationNotes(investigationId);
  const [form, setForm] = useState({ note_type: "field_observation", content: "", observed_on: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function addNote(event) {
    event.preventDefault();
    if (form.content.trim().length < 10) {
      setError("Describe what was checked in at least 10 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await base44.entities.InvestigationNote.create({
        investigation_id: investigationId,
        note_type: form.note_type,
        content: form.content.trim(),
        observed_on: form.observed_on || new Date().toISOString().slice(0, 10),
        author_name: user?.full_name ?? user?.email ?? "Unknown",
        author_email: user?.email ?? "",
        is_demo: Boolean(isDemo),
      });
      setForm((prev) => ({ ...prev, content: "", observed_on: "" }));
      await refetch();
    } catch (err) {
      setError(err?.message ?? "The observation could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="panel border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Observations and evidence</CardTitle>
        <CardDescription className="text-[12.5px]">
          Add dated field notes or source checks. Record only what was actually observed, and distinguish uncertainty from a verified finding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addNote} className="space-y-3 rounded-lg border border-dashed border-border p-3.5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="note-type">Type</Label>
              <Select value={form.note_type} onValueChange={(value) => setForm((prev) => ({ ...prev, note_type: value }))}>
                <SelectTrigger id="note-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TYPES.map((type) => (
                    <SelectItem key={type.key} value={type.key}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-date">Observed on</Label>
              <Input
                id="note-date"
                type="date"
                value={form.observed_on}
                onChange={(event) => setForm((prev) => ({ ...prev, observed_on: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-content">Observation</Label>
            <Textarea
              id="note-content"
              rows={3}
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="What did you check? What did you actually observe? What remains uncertain?"
              required
              minLength={10}
            />
          </div>
          {error ? <p className="text-[12.5px] text-destructive">{error}</p> : null}
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            )}
            Add observation
          </Button>
        </form>

        {isLoading ? (
          <p className="text-[12.5px] text-muted-foreground">Loading observations…</p>
        ) : notes.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="No observations recorded yet"
            description="Record what a field visit or a source check showed. Missing evidence stays visible rather than being assumed."
            className="py-8"
          />
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg border border-border/80 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
                    {NOTE_LABEL[note.note_type] ?? "Note"}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {note.author_name || "Unknown"} · {note.observed_on ? formatDate(note.observed_on) : formatDateTime(note.created_date)}
                  </p>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
                  {note.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}