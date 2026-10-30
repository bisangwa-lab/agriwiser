import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Info,
  Loader2,
  MapPin,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ToneTag,
  investigationStatusTone,
  investigationStatusLabel,
  followUpStatusTone,
  followUpStatusLabel,
} from "@/components/common/ToneTag";
import { TrendChart } from "@/components/charts/TrendChart";
import { useAgriculturalSolutions } from "@/components/agricultural-solutions/AgriculturalSolutionsLayout";
import { useInvestigation, useInvestigationNotes, useFollowUps } from "@/hooks/useAgriRecords";
import { useObservations } from "@/hooks/useObservations";
import { appClient } from "@/api/appClient";
import { exploreData } from "@/lib/explore-data";
import { normalizeRole } from "@/lib/rbac";
import { useAuth } from "@/lib/AuthContext";
import { CROPS, DISTRICT_NAMES, INDICATORS, INVESTIGATION_PRIORITIES, SEASONS, YEARS } from "@/lib/constants";
import { formatNumber, formatSignedPercent } from "@/lib/format";

/** The workflow accepts these roles only; the server enforces it independently. */
const FIELD_ROLES = new Set(["super_admin", "field_supervisor", "agricultural_officer", "field_investigator"]);

const STEPS = [
  { key: "problem", label: "Review the problem" },
  { key: "intervention", label: "Review the intervention" },
  { key: "proposal", label: "Prepare the proposal" },
  { key: "submit", label: "Submit for review" },
  { key: "track", label: "Track implementation" },
  { key: "results", label: "Review follow-up" },
];

export function PrepareActionPlan() {
  const ctx = useAgriculturalSolutions();
  const { crop, district, season, year, selectedScenario } = ctx;
  const { user } = useAuth();

  const canSubmit = FIELD_ROLES.has(normalizeRole(user));
  const scopeReady = DISTRICT_NAMES.includes(district) && crop !== "all";

  const observations = useObservations({ domain: "crop", crop: scopeReady ? crop : undefined, district });
  const exploration = useMemo(() => {
    if (!observations.data || !scopeReady) return null;
    return exploreData(observations.data, {
      crop,
      district,
      season,
      indicator: "production",
      fromYear: Math.min(...YEARS),
      toYear: year,
      baselineYear: Math.max(Math.min(...YEARS), year - 1),
    });
  }, [observations.data, scopeReady, crop, district, season, year]);

  const [created, setCreated] = useState(null);
  const activeCase = useInvestigation(created?.id ?? null);
  const notes = useInvestigationNotes(created?.id ?? null);
  const followUps = useFollowUps(created?.id ?? null);

  const mainFinding = useMemo(() => {
    if (!exploration) return null;
    if (exploration.comparisonReason) return `Change not calculable — ${exploration.comparisonReason}`;
    if (exploration.change === null) return "No comparable production values are available for this selection.";
    return `Production ${exploration.change < 0 ? "fell" : "rose"} by ${formatSignedPercent(exploration.change, 1)}`;
  }, [exploration]);

  return (
    <div className="space-y-6">
      <StepRail steps={STEPS} reached={created ? 4 : selectedScenario ? 2 : 1} />

      {!scopeReady && (
        <Card>
          <CardContent className="flex items-start gap-2 py-4 text-[12px] text-amber-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              An action plan needs one district and one crop. Set both in the filters above, or start from a problem
              in <Link to="/agricultural-solutions" className="font-semibold underline">Find Problems</Link>.
            </span>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1 — the problem ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            1 · The problem
          </CardTitle>
          <CardDescription className="text-[12px]">Evidence carried from the statistical records for this scope.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <Fact label="District" value={scopeReady ? district : "Not selected"} />
            <Fact label="Crop" value={scopeReady ? crop : "All crops"} />
            <Fact label="Reporting period" value={`${year} ${season}`} />
            <Fact label="Baseline period" value={`${Math.max(Math.min(...YEARS), year - 1)} ${season}`} />
          </div>
          {mainFinding && (
            <p className="rounded-lg border border-primary/25 bg-accent/40 p-3 text-[12px] font-medium text-accent-foreground">
              Main finding: {mainFinding}.
            </p>
          )}
          {exploration && (
            <p className="text-[11px] text-muted-foreground">
              Coverage: {exploration.present} of {exploration.expected} required source values present,{" "}
              {exploration.absent} with no source record. A published change is a statistical signal, not a confirmed
              incident.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Step 2 — the intervention ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2 · The selected intervention</CardTitle>
          <CardDescription className="text-[12px]">
            Scenario results, estimated costs and the assumptions they rest on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedScenario ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <ToneTag tone="primary">{selectedScenario.interventionLabel}</ToneTag>
                <span className="text-[11px] text-muted-foreground">{selectedScenario.group}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <Fact label="Scenario district" value={selectedScenario.savedForDistrict ?? "—"} />
                <Fact
                  label="Simulated production"
                  value={`${formatNumber(selectedScenario.scenario.simulated.productionTonnes, 0)} t`}
                />
                <Fact
                  label="Change vs baseline"
                  value={formatSignedPercent(selectedScenario.scenario.comparison.percentProductionDifference, 1)}
                />
                <Fact
                  label="Estimated cost"
                  value={selectedScenario.budget ? `${formatNumber(selectedScenario.budget)} RWF` : "Not budget-modelled"}
                />
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-[11px] font-semibold">Assumptions carried into this plan</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                  {selectedScenario.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {selectedScenario.scenario.scientificCaveat}
              </p>
              {selectedScenario.savedForDistrict && selectedScenario.savedForDistrict !== district && (
                <p role="note" className="rounded-lg bg-sky-50 p-3 text-[11px] text-sky-900">
                  This scenario was run for {selectedScenario.savedForDistrict}, which is not the district selected
                  above. Re-run it before submitting, or the plan will mix two geographies.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-[12px] text-muted-foreground">
              <p>No scenario has been saved yet. This plan can still be written, but it will carry no costed intervention.</p>
              <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
                <Link to="/agricultural-solutions/compare">
                  <ArrowLeft className="h-3.5 w-3.5" /> Compare Solutions
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Steps 3 & 4 — proposal form + submit ─────────────────────────── */}
      <ProposalForm
        defaults={{
          district,
          crop,
          season,
          year,
          mainFinding,
          selectedScenario,
          scopeReady,
        }}
        canSubmit={canSubmit}
        onCreated={setCreated}
      />

      {/* ── Steps 5 & 6 — tracking and follow-up ─────────────────────────── */}
      {created && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">5 · Implementation tracking</CardTitle>
              <CardDescription className="text-[12px]">
                This plan is now a Field Operations case. Progress below comes from records staff actually write.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <ToneTag tone={investigationStatusTone(activeCase.data?.status ?? "open")}>
                  {investigationStatusLabel(activeCase.data?.status ?? "open")}
                </ToneTag>
                <ToneTag tone="outline">Review: {activeCase.data?.review_status ?? "not_submitted"}</ToneTag>
                <span className="break-all text-[11px] text-muted-foreground">Case {created.id}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Fact label="Milestones recorded" value={String(followUps.data?.length ?? 0)} />
                <Fact label="Milestones completed" value={String((followUps.data ?? []).filter((f) => f.status === "completed").length)} />
                <Fact label="Evidence notes" value={String(notes.data?.length ?? 0)} />
              </div>

              {(followUps.data ?? []).length > 0 && (
                <ul className="space-y-1.5">
                  {followUps.data.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-[11.5px]">
                      <span className="min-w-0 truncate font-medium">{f.title}</span>
                      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                        <ToneTag tone={followUpStatusTone(f.status)}>{followUpStatusLabel(f.status)}</ToneTag>{f.due_date ? ` · due ${f.due_date}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="gap-2 text-xs">
                  <Link to="/investigations/$investigationId" params={{ investigationId: created.id }}>
                    <ClipboardList className="h-3.5 w-3.5" /> Open the case
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-2 text-xs">
                  <Link to="/reports" search={{ district: district !== "all" ? district : undefined, crop: crop !== "all" ? crop : undefined, season }}>
                    <FileText className="h-3.5 w-3.5" /> Build a report
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <FollowUpResults
            district={district}
            crop={crop}
            season={season}
            year={year}
            notes={notes.data ?? []}
            loading={notes.isLoading}
          />
        </>
      )}
    </div>
  );
}

function ProposalForm({ defaults, canSubmit, onCreated }) {
  const { district, crop, season, year, mainFinding, selectedScenario, scopeReady } = defaults;
  const [values, setValues] = useState(() => ({
    title: selectedScenario ? `${selectedScenario.interventionLabel} — ${district}, ${crop}` : "",
    problem: mainFinding ?? "",
    activities: "",
    budget: selectedScenario?.budget ? String(selectedScenario.budget) : "",
    responsibleRole: "agricultural_officer",
    timeline: "",
    indicators: "",
    references: selectedScenario?.scenario?.baseline?.sourceReference ?? "",
    priority: "standard",
    due_date: "",
  }));
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setValues((v) => ({
      ...v,
      title: v.title || (selectedScenario ? `${selectedScenario.interventionLabel} — ${district}, ${crop}` : ""),
      problem: v.problem || mainFinding || "",
      references: v.references || selectedScenario?.scenario?.baseline?.sourceReference || "",
    }));
  }, [selectedScenario, district, crop, mainFinding]);

  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const validation = () => {
    if (!scopeReady) return "Choose one district and one crop before preparing a proposal.";
    if (values.title.trim().length < 3) return "Give the proposal a title of at least 3 characters.";
    if (values.problem.trim().length < 10) return "Describe the problem in at least 10 characters.";
    if (values.activities.trim().length < 10) return "List the proposed activities in at least 10 characters.";
    if (!DISTRICT_NAMES.includes(district)) return "The district is not in the district catalogue.";
    if (!CROPS.includes(crop)) return "The crop is not in the crop catalogue.";
    if (values.budget && (!Number.isFinite(Number(values.budget)) || Number(values.budget) < 0)) {
      return "Enter the budget as a number of RWF, or leave it empty.";
    }
    if (values.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(values.due_date)) return "Use a start-by date in YYYY-MM-DD form.";
    return null;
  };

  async function submit(event) {
    event.preventDefault();
    const problem = validation();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    const description = [
      `Proposed activities: ${values.activities.trim()}`,
      values.budget ? `Budget: ${formatNumber(Number(values.budget))} RWF` : "Budget: not quantified",
      `Responsible role: ${values.responsibleRole}`,
      values.timeline ? `Timeline: ${values.timeline.trim()}` : "Timeline: not stated",
      `Success indicators: ${values.indicators.trim() || "not stated"}`,
      selectedScenario
        ? `Intervention modelled: ${selectedScenario.interventionLabel} (${selectedScenario.scenario.modelMetadata.id} v${selectedScenario.scenario.modelMetadata.version}), simulated ${formatNumber(selectedScenario.scenario.simulated.productionTonnes, 0)} t versus observed ${formatNumber(selectedScenario.scenario.baseline.productionTonnes, 0)} t baseline.`
        : "Intervention modelled: none — this plan was submitted without a saved scenario.",
      `Assumptions: ${(selectedScenario?.assumptions ?? ["none recorded"]).join(" ")}`,
      "Limitations: simulated figures are deterministic model output against published statistics, not measured outcomes.",
    ].join("\n");

    try {
      const record = await appClient.entities.Investigation.create({
        title: values.title.trim(),
        description,
        reason: values.problem.trim(),
        priority: values.priority,
        crop,
        district,
        indicator: "production",
        period: `${year} ${season}`,
        evidence: values.references.trim(),
        questions: values.indicators.trim(),
        due_date: values.due_date || undefined,
        idempotency_key: `action-plan-${idempotencyKey}`,
      });
      onCreated(record);
    } catch (err) {
      setError(err?.message ?? "The proposal could not be saved. Nothing was written.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">3 · Prepare the proposal</CardTitle>
        <CardDescription className="text-[12px]">
          Submitted through the authorized field workflow. Plan details without their own database column are stored
          as structured text on the case, because no action-plan entity exists yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ap-title" className="text-[11px]">Intervention title</Label>
            <Input
              id="ap-title"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Hillside irrigation expansion in Bugesera, maize"
              className="text-xs"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px]">District</Label>
              <p className="rounded-lg border bg-muted/30 px-3 py-2 text-xs font-medium">{district}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Crop and period</Label>
              <p className="rounded-lg border bg-muted/30 px-3 py-2 text-xs font-medium">
                {crop === "all" ? "All crops" : crop} · {year} {season}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ap-problem" className="text-[11px]">Problem statement</Label>
            <Textarea
              id="ap-problem"
              rows={3}
              value={values.problem}
              onChange={(e) => set("problem", e.target.value)}
              placeholder="What the evidence shows and why action is proposed."
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ap-activities" className="text-[11px]">Proposed activities</Label>
            <Textarea
              id="ap-activities"
              rows={3}
              value={values.activities}
              onChange={(e) => set("activities", e.target.value)}
              placeholder={"1. Verify water access on candidate parcels\n2. Contract scheme construction\n3. Train farmer groups"}
              className="text-xs"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-budget" className="text-[11px]">Budget (RWF)</Label>
              <Input id="ap-budget" type="number" min="0" step="100000" value={values.budget} onChange={(e) => set("budget", e.target.value)} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-role" className="text-[11px]">Responsible role</Label>
              <Select value={values.responsibleRole} onValueChange={(v) => set("responsibleRole", v)}>
                <SelectTrigger id="ap-role" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agricultural_officer">Agricultural officer</SelectItem>
                  <SelectItem value="field_supervisor">Field supervisor</SelectItem>
                  <SelectItem value="field_investigator">Field investigator</SelectItem>
                  <SelectItem value="agricultural_analyst">Agricultural analyst</SelectItem>
                  <SelectItem value="policy_maker">Policy maker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-timeline" className="text-[11px]">Timeline</Label>
              <Input id="ap-timeline" value={values.timeline} onChange={(e) => set("timeline", e.target.value)} placeholder="One season / two seasons" className="text-xs" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ap-indicators" className="text-[11px]">Success indicators</Label>
            <Textarea
              id="ap-indicators"
              rows={2}
              value={values.indicators}
              onChange={(e) => set("indicators", e.target.value)}
              placeholder="Measured against which indicator, in which period?"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ap-refs" className="text-[11px]">Evidence references</Label>
            <Textarea
              id="ap-refs"
              rows={2}
              value={values.references}
              onChange={(e) => set("references", e.target.value)}
              placeholder="Source table, dataset or publication supporting the finding."
              className="text-xs"
            />
            <p className="text-[10.5px] text-muted-foreground">
              References are stored as text. No file content is uploaded and none is scanned by this application.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ap-priority" className="text-[11px]">Priority</Label>
              <Select value={values.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger id="ap-priority" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVESTIGATION_PRIORITIES.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-due" className="text-[11px]">Start by (optional)</Label>
              <Input id="ap-due" type="date" value={values.due_date} onChange={(e) => set("due_date", e.target.value)} className="text-xs" />
            </div>
          </div>

          <Separator />

          {!canSubmit && (
            <p role="note" className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Submitting creates a Field Operations case, which the server restricts to field operations roles. Your
              current role cannot submit, so this button will be refused. Review the plan with an officer who holds a
              field operations role, or export it from Reports. The check happens on the server, not here.
            </p>
          )}

          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-[11.5px] text-red-700">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving || !scopeReady} className="gap-2 text-xs">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              4 · Submit for review
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
              <Link to="/agricultural-solutions/compare">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Compare Solutions
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function FollowUpResults({ district, crop, season, year, notes, loading }) {
  const observations = useObservations({ domain: "crop", crop, district });
  const comparison = useMemo(() => {
    if (!observations.data) return null;
    return exploreData(observations.data, {
      crop,
      district,
      season,
      indicator: "production",
      fromYear: Math.min(...YEARS),
      toYear: Math.max(...YEARS),
      baselineYear: year,
    });
  }, [observations.data, crop, district, season, year]);

  const measured = (notes ?? []).filter((n) => Number.isFinite(n.measurement) && n.measurement !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">6 · Follow-up results</CardTitle>
        <CardDescription className="text-[12px]">
          Progress is whatever staff have recorded. Published statistics after this season are shown as compatible
          observations only — an improvement is not proof the intervention caused it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {measured.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11.5px] font-semibold">Measurements recorded by the field team</p>
            <ul className="space-y-1">
              {measured.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-[11.5px]">
                  <span className="min-w-0 truncate text-muted-foreground">{n.content}</span>
                  <span className="shrink-0 tabular-nums font-medium">
                    {formatNumber(n.measurement, 2)} {n.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[11.5px] text-muted-foreground">
            {loading ? "Loading recorded notes…" : "No measured field observations have been recorded on this case yet."}
          </p>
        )}

        {comparison && (
          <div className="space-y-2">
            <p className="text-[11.5px] font-semibold">Published production after the planning period</p>
            <TrendChart
              data={comparison.series}
              series={[{ key: "value", label: INDICATORS.production.label, digits: 0 }]}
              unitShort={INDICATORS.production.unitShort}
              height={240}
              emptyMessage="No compatible published production values exist yet for later periods."
              explanationProps={{
                chartType: "trend chart",
                title: `${crop} production in ${district}`,
                indicator: "production",
                scope: district,
                period: `${Math.min(...YEARS)}–${Math.max(...YEARS)} ${season}`,
                filters: { crop, district, season, indicator: "production" },
              }}
            />
            <p className="text-[10.5px] text-muted-foreground">
              Gaps are periods with no compatible source value. They are left blank rather than estimated.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepRail({ steps, reached }) {
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border bg-card p-3">
      {steps.map((step, i) => (
        <li key={step.key} className="flex items-center gap-1.5 text-[11px]">
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full text-[9.5px] font-bold ${
              i < reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
            aria-hidden
          >
            {i + 1}
          </span>
          <span className={i < reached ? "font-medium text-foreground" : "text-muted-foreground"}>{step.label}</span>
          {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function Fact({ label, value }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[10.5px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-[13px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}
