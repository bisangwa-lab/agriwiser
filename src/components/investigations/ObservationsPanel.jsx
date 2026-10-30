import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag, noteTypeLabel, noteTypeTone } from "@/components/common/ToneTag";
import { NOTE_TYPES } from "@/lib/constants";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { appClient } from "@/api/appClient";
import { useInvestigationNotes } from "@/hooks/useAgriRecords";
import { AlertCircle, CheckCircle2, HelpCircle, Loader2, NotebookPen, Plus } from "lucide-react";

const SOURCE_CLASS_LABEL = {
  field_observation: "Direct field observation",
  source_check: "Published source check",
  reported_observation: "Reported by another person",
};

/** Notes, field observations and evidence attached to an investigation. */
export function ObservationsPanel({ investigationId }) {
  const { data: notes = [], isLoading, refetch } = useInvestigationNotes(investigationId);
  const [form, setForm] = useState({
    note_type: "field_observation",
    source_class: "field_observation",
    content: "",
    observed_on: new Date().toISOString().slice(0, 10),
    measurement: "",
    unit: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function addNote(event) {
    event.preventDefault();
    if (!form.content.trim()) {
      setError("Write the observation or evidence description before saving it.");
      return;
    }
    if (form.measurement !== "" && !Number.isFinite(Number(form.measurement))) {
      setError("Enter a finite measured value or leave the measurement blank.");
      return;
    }
    if (form.measurement !== "" && !form.unit.trim()) {
      setError("Add the unit for the measured value, or leave the measurement blank.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await appClient.entities.InvestigationNote.create({
        investigation_id: investigationId,
        note_type: form.note_type,
        source_class: form.source_class,
        content: form.content.trim(),
        observed_on: form.observed_on || new Date().toISOString().slice(0, 10),
        measurement: form.measurement === "" ? null : Number(form.measurement),
        unit: form.measurement === "" ? "" : form.unit,
      });
      setForm((previous) => ({
        ...previous,
        content: "",
        observed_on: new Date().toISOString().slice(0, 10),
        measurement: "",
        unit: "",
      }));
      setSuccess("Observation added successfully.");
      await refetch();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err?.message ?? "The observation could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const iconForType = (type) => {
    switch (type) {
      case "evidence":
        return CheckCircle2;
      case "unresolved_question":
        return HelpCircle;
      default:
        return AlertCircle;
    }
  };

  return (
    <Card className="panel border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Observations & collected evidence</CardTitle>
          <span className="text-[11px] font-medium text-muted-foreground">{notes.length} recorded</span>
        </div>
        <CardDescription className="text-[12.5px]">
          Record field findings, farmer interviews, or source-check notes. Clearly distinguish verified evidence from unresolved questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-primary/20 bg-accent/40 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Evidence collection standard</p>
          <p className="mt-0.5">
            Do not automatically conclude that weather, disease, or input issues caused an observed change.
            Record what was directly inspected, identify the source, and log remaining uncertainties.
          </p>
        </div>

        <form onSubmit={addNote} className="space-y-3 rounded-lg border border-dashed border-border p-3.5 bg-card/60">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="note-type">Observation category</Label>
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
              <Label htmlFor="note-source">Evidence source class</Label>
              <Select
                value={form.source_class}
                onValueChange={(value) => setForm((prev) => ({ ...prev, source_class: value }))}
              >
                <SelectTrigger id="note-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="field_observation">Direct field observation</SelectItem>
                  <SelectItem value="source_check">Published source check</SelectItem>
                  <SelectItem value="reported_observation">Reported by another person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-date">Observed / checked date</Label>
              <Input
                id="note-date"
                type="date"
                value={form.observed_on}
                onChange={(event) => setForm((prev) => ({ ...prev, observed_on: event.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="note-measurement">Optional measured value</Label>
              <Input
                id="note-measurement"
                type="number"
                inputMode="decimal"
                value={form.measurement}
                onChange={(event) => setForm((prev) => ({ ...prev, measurement: event.target.value }))}
                placeholder="Leave blank when nothing was measured"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-unit">Measurement unit</Label>
              <Input
                id="note-unit"
                value={form.unit}
                onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
                placeholder="e.g. hectares, tonnes, t/ha"
                disabled={form.measurement === ""}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-content">Details & findings</Label>
            <Textarea
              id="note-content"
              rows={3}
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="Describe what was verified in the field or source table, specific location or farmers visited, and what remains unclear."
            />
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
              Save observation
            </Button>
          </div>
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
            {notes.map((note) => {
              const Icon = iconForType(note.note_type);
              const isEvidence = note.note_type === "evidence";
              const isQuestion = note.note_type === "unresolved_question";
              return (
                <li
                  key={note.id}
                  className={`rounded-lg border p-3.5 transition-colors ${
                    isEvidence
                      ? "border-primary/40 bg-accent/20"
                      : isQuestion
                        ? "border-amber-300 bg-amber-50/40"
                        : "border-border/80 bg-card"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ToneTag tone={noteTypeTone(note.note_type)} icon={Icon}>
                      {noteTypeLabel(note.note_type)}
                    </ToneTag>
                    <p className="text-[11.5px] text-muted-foreground">
                      <span className="font-medium text-foreground">{note.author_name || "Authorized Officer"}</span>
                      {note.author_email ? ` (${note.author_email})` : ""} ·{" "}
                      {note.observed_on ? formatDate(note.observed_on) : formatDateTime(note.created_date)}
                    </p>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-foreground/90">
                    {note.content}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="rounded-full border px-2 py-0.5">
                      {SOURCE_CLASS_LABEL[note.source_class] ?? "Source class not recorded"}
                    </span>
                    {note.measurement !== null && note.measurement !== undefined ? (
                      <span>
                        Measured: <strong className="font-medium text-foreground">{formatNumber(note.measurement, 2)}</strong>{" "}
                        {note.unit || "(unit not recorded)"}
                      </span>
                    ) : (
                      <span>No measurement recorded</span>
                    )}
                    <span>Quality: {note.quality_status === "unreviewed" ? "Not reviewed" : note.quality_status || "Not reviewed"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
