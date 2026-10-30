import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Scatter,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ArrowRight,
  CloudRain,
  DollarSign,
  Droplets,
  Info,
  Layers,
  Loader2,
  Play,
  Save,
  Sprout,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToneTag } from "@/components/common/ToneTag";
import { ComparisonBarChart } from "@/components/charts/ComparisonBarChart";
import { DistributionChart } from "@/components/dashboard/DistributionChart";
import { useAgriculturalSolutions } from "@/components/agricultural-solutions/AgriculturalSolutionsLayout";
import { runDigitalTwinScenario } from "@/lib/intelligence/server-fns";
import { getModelInfo } from "@/lib/intelligence/model-registry";
import { DISTRICT_NAMES, SEASONS, YEARS } from "@/lib/constants";
import { formatNumber, formatSignedPercent } from "@/lib/format";

const UNIT_COSTS = getModelInfo("TWIN-BUDGET-PORTFOLIO-V1").unitCosts;

/**
 * Interventions mapped to a scenario the Digital Twin can actually run against
 * a verified NISR baseline. `supported: false` entries stay visible so the
 * evidence gap is explicit rather than silently hidden.
 */
const INTERVENTIONS = [
  {
    id: "budget_portfolio",
    label: "Irrigation & input investment",
    short: "Investment portfolio",
    icon: DollarSign,
    scenarioType: "budget_allocation",
    supported: true,
    group: "Irrigation investment optimization",
    evidence: "Splits a budget across irrigation, certified seed and soil conditioning at the registered unit costs.",
  },
  {
    id: "irrigation",
    label: "Irrigation expansion",
    short: "Irrigation",
    icon: Droplets,
    scenarioType: "irrigation",
    supported: true,
    group: "Irrigation investment optimization",
    evidence: "Applies the registered 1.65× irrigated-yield multiplier to converted hectares.",
  },
  {
    id: "productivity",
    label: "Seed & fertilizer productivity",
    short: "Productivity",
    icon: Sprout,
    scenarioType: "productivity",
    supported: true,
    group: "Soil and productivity improvements",
    evidence: "Applies a chosen yield uplift percentage to the observed baseline area.",
  },
  {
    id: "rainfall",
    label: "Rainfall stress preparedness",
    short: "Rainfall risk",
    icon: CloudRain,
    scenarioType: "rainfall",
    supported: true,
    group: "Agricultural risk mitigation",
    evidence: "Uses the crop-specific rainfall elasticity in the registered sensitivity model.",
  },
  {
    id: "harvested_area",
    label: "Planted area reallocation",
    short: "Area",
    icon: Layers,
    scenarioType: "harvested_area",
    supported: true,
    group: "Soil and productivity improvements",
    evidence: "Holds observed yield constant and shifts harvested area only.",
  },
  {
    id: "post_harvest",
    label: "Post-harvest loss reduction",
    short: "Post-harvest",
    icon: TriangleAlert,
    scenarioType: null,
    supported: false,
    group: "Post-harvest loss reduction",
    evidence: "No post-harvest loss observations, storage rates or crop price series are connected to this workspace.",
  },
];

const STRATEGY_COMPOSITIONS = [
  { name: "Irrigation only", irrigation: 100, seed: 0, lime: 0 },
  { name: "Certified seed only", irrigation: 0, seed: 100, lime: 0 },
  { name: "Soil conditioning only", irrigation: 0, seed: 0, lime: 100 },
  { name: "Balanced split", irrigation: 40, seed: 35, lime: 25 },
];

export function CompareSolutions() {
  const ctx = useAgriculturalSolutions();
  const { crop, district, season, year, setContext, selectedScenario, setSelectedScenario } = ctx;

  const [interventionId, setInterventionId] = useState("budget_portfolio");
  const [budget, setBudget] = useState(150000000);
  const [irrigationPct, setIrrigationPct] = useState(50);
  const [seedPct, setSeedPct] = useState(30);
  const [limePct, setLimePct] = useState(20);
  const [irrigatedHa, setIrrigatedHa] = useState(500);
  const [yieldIncreasePct, setYieldIncreasePct] = useState(15);
  const [rainfallDeltaPct, setRainfallDeltaPct] = useState(-20);
  const [areaDeltaPct, setAreaDeltaPct] = useState(10);

  const [running, setRunning] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [error, setError] = useState(null);
  const [runState, setRunState] = useState(null);

  const intervention = INTERVENTIONS.find((i) => i.id === interventionId);
  const allocationTotal = irrigationPct + seedPct + limePct;
  const unallocatedPct = 100 - allocationTotal;

  const scopeError = useMemo(() => {
    if (!DISTRICT_NAMES.includes(district)) {
      return "Choose one district. A scenario needs a verified district-level baseline.";
    }
    if (!YEARS.includes(year)) return "Choose a reporting year that exists in the source records.";
    if (!SEASONS.includes(season)) return "Choose a supported season.";
    if (crop === "all") return "Choose a single crop. Scenarios cannot aggregate across crops.";
    return null;
  }, [district, year, season, crop]);

  const budgetError = useMemo(() => {
    if (!Number.isFinite(Number(budget)) || Number(budget) <= 0) return "Enter a budget above 0 RWF.";
    if (Number(budget) > 100000000000) return "Enter a budget below 100 billion RWF.";
    if (allocationTotal > 100) return `Allocations total ${allocationTotal}%, which exceeds the available budget.`;
    return null;
  }, [budget, allocationTotal]);

  const activeError = intervention && !intervention.supported
    ? `${intervention.label} cannot be modelled here. ${intervention.evidence}`
    : scopeError
      ? scopeError
      : intervention?.scenarioType === "budget_allocation" && budgetError
        ? budgetError
        : null;

  const parameters = () => {
    switch (intervention?.scenarioType) {
      case "budget_allocation":
        return {
          totalBudgetRwf: Number(budget),
          irrigationBudgetPct: irrigationPct,
          seedSubsidyBudgetPct: seedPct,
          soilLimeBudgetPct: limePct,
        };
      case "irrigation":
        return { newlyIrrigatedHectares: Number(irrigatedHa) };
      case "productivity":
        return { yieldIncreasePct: Number(yieldIncreasePct) };
      case "rainfall":
        return { rainfallDeltaPct: Number(rainfallDeltaPct) };
      case "harvested_area":
        return { areaDeltaPct: Number(areaDeltaPct) };
      default:
        return {};
    }
  };

  async function runScenario(overrides = {}) {
    return runDigitalTwinScenario({
      data: {
        district,
        crop,
        season,
        year,
        scenarioType: intervention.scenarioType,
        parameters: { ...parameters(), ...overrides },
        title: `${district} · ${crop} · ${intervention.short}`,
      },
    });
  }

  /** Identifies the exact scope + parameter set a result belongs to, so a changed
   *  input is never displayed as though it had already been recalculated. */
  const fingerprint = useMemo(() => JSON.stringify({
    district,
    crop,
    season,
    year,
    interventionId,
    parameters: parameters(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [district, crop, season, year, interventionId, budget, irrigationPct, seedPct, limePct, irrigatedHa, yieldIncreasePct, rainfallDeltaPct, areaDeltaPct]);

  async function handleRun() {
    if (activeError) return;
    setRunning(true);
    setError(null);
    try {
      const res = await runScenario();
      setResult(res);
      setRunState({ fingerprint, scope: { district, crop, season, year } });
    } catch (err) {
      setResult(null);
      setRunState(null);
      setError(err?.message ?? "The scenario could not be run.");
    } finally {
      setRunning(false);
    }
  }

  /** Compares whole-budget compositions through the same engine, not local arithmetic. */
  async function handleCompareStrategies() {
    if (activeError || intervention?.scenarioType !== "budget_allocation") return;
    setComparing(true);
    setError(null);
    try {
      const rows = [];
      for (const composition of STRATEGY_COMPOSITIONS) {
        const res = await runScenario({
          irrigationBudgetPct: composition.irrigation,
          seedSubsidyBudgetPct: composition.seed,
          soilLimeBudgetPct: composition.lime,
        });
        const spent = Math.min(
          Number(budget),
          composition.irrigation + composition.seed + composition.lime > 0
            ? (Number(budget) * (composition.irrigation + composition.seed + composition.lime)) / 100
            : 0,
        );
        const gain = res.comparison.absoluteProductionDifference;
        rows.push({
          name: composition.name,
          tonnage: res.simulated.productionTonnes,
          gain,
          spentRwf: spent,
          costPerTonne: gain > 0 ? Math.round(spent / gain) : null,
          result: res,
        });
      }
      setStrategies(rows);
    } catch (err) {
      setError(err?.message ?? "The strategy comparison could not be run.");
    } finally {
      setComparing(false);
    }
  }

  function handleSave() {
    if (!result || runState?.fingerprint !== fingerprint) return;
    setSelectedScenario({
      interventionId: intervention.id,
      interventionLabel: intervention.label,
      group: intervention.group,
      scenario: result,
      assumptions: result.assumptions,
      limitations: [result.scientificCaveat, ...result.mathematicalFormulas],
      budget: intervention.scenarioType === "budget_allocation" ? Number(budget) : null,
      savedForDistrict: runState?.scope.district ?? district,
    });
  }

  const resultIsStale = result !== null && runState?.fingerprint !== fingerprint;
  const allocationRows = [
    { name: "Hillside/marshland irrigation", value: Math.round((Number(budget) * irrigationPct) / 100) },
    { name: "Certified seed subsidy", value: Math.round((Number(budget) * seedPct) / 100) },
    { name: "Soil conditioning (lime)", value: Math.round((Number(budget) * limePct) / 100) },
    { name: "Unallocated", value: Math.max(0, Math.round((Number(budget) * unallocatedPct) / 100)) },
  ];

  const baselineVsScenario = result
    ? [
        { name: "Observed baseline", value: result.baseline.productionTonnes },
        { name: "Simulated scenario", value: result.simulated.productionTonnes },
      ]
    : [];

  const sensitivityRows = (result?.sensitivityAnalysis ?? []).map((s) => ({
    name: `${s.variationPct > 0 ? "+" : ""}${s.variationPct}%`,
    value: s.simulatedProductionTonnes,
  }));

  const costVsBenefit = strategies
    .filter((s) => s.costPerTonne !== null)
    .map((s) => ({ name: s.name, x: s.gain, y: s.costPerTonne, z: s.spentRwf }));

  return (
    <div className="space-y-6">
      {/* ── 1. Scenario scope ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 · Scenario scope</CardTitle>
          <CardDescription className="text-[12px]">
            Every scenario runs against the observed district production and harvested area for one crop and one
            reporting period. Nothing is simulated without a matching source record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <ScopeSelect
              id="cs-district"
              label="District"
              value={district}
              onValueChange={(v) => setContext((c) => ({ ...c, district: v }))}
            >
              {DISTRICT_NAMES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </ScopeSelect>
            <ScopeSelect
              id="cs-season"
              label="Season"
              value={season}
              onValueChange={(v) => setContext((c) => ({ ...c, season: v }))}
            >
              {SEASONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </ScopeSelect>
            <ScopeSelect
              id="cs-year"
              label="Reporting year"
              value={String(year)}
              onValueChange={(v) => setContext((c) => ({ ...c, year: Number(v) }))}
            >
              {[...YEARS].sort((a, b) => b - a).map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </ScopeSelect>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Crop: <strong className="text-foreground">{crop}</strong> — change it with the crop filter above.
          </p>
          {scopeError && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {scopeError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── 2. Choose an intervention ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2 · Choose an intervention</CardTitle>
          <CardDescription className="text-[12px]">
            Unsupported options stay listed with the reason they cannot be calculated, so the evidence gap is visible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Intervention">
            {INTERVENTIONS.map((item) => {
              const Icon = item.icon;
              const active = item.id === interventionId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!item.supported}
                  onClick={() => {
                    setInterventionId(item.id);
                    setResult(null);
                    setRunState(null);
                    setStrategies([]);
                    setError(null);
                  }}
                  className={`flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    active
                      ? "border-primary bg-accent text-accent-foreground"
                      : item.supported
                        ? "border-border bg-card hover:bg-accent/60"
                        : "cursor-not-allowed border-dashed bg-muted/30 opacity-70"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
                    <span className="text-[12.5px] font-semibold">{item.label}</span>
                  </span>
                  <span className="text-[10.5px] leading-relaxed text-muted-foreground">{item.group}</span>
                  {!item.supported && <ToneTag tone="warning">No evidence connected</ToneTag>}
                </button>
              );
            })}
          </div>
          {intervention && (
            <p className="mt-3 rounded-lg bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              {intervention.evidence}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Assumptions ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3 · Assumptions</CardTitle>
          <CardDescription className="text-[12px]">
            These are documented model parameters, not measured results. Registered unit costs are unsourced
            planning benchmarks and are labelled as assumptions throughout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {intervention?.scenarioType === "budget_allocation" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cs-budget" className="text-[11px]">Total budget (RWF)</Label>
                  <Input
                    id="cs-budget"
                    type="number"
                    min="1"
                    step="1000000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    aria-invalid={Boolean(budgetError)}
                    className="text-xs"
                  />
                  <p className="text-[10.5px] text-muted-foreground">{formatNumber(Number(budget) || 0)} RWF</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Funded area at registered unit costs</Label>
                  <ul className="space-y-0.5 rounded-lg border bg-muted/30 p-2.5 text-[10.5px] text-muted-foreground">
                    <li>Irrigation: {formatNumber(UNIT_COSTS.irrigationPerHectareRwf)} RWF/ha</li>
                    <li>Certified seed: {formatNumber(UNIT_COSTS.improvedSeedSubsidyPerHaRwf)} RWF/ha</li>
                    <li>Soil conditioning: {formatNumber(UNIT_COSTS.limeSoilConditioningPerHaRwf)} RWF/ha</li>
                  </ul>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <AllocationInput id="cs-irr" label="Irrigation" value={irrigationPct} onChange={setIrrigationPct} />
                <AllocationInput id="cs-seed" label="Certified seed" value={seedPct} onChange={setSeedPct} />
                <AllocationInput id="cs-lime" label="Soil conditioning" value={limePct} onChange={setLimePct} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ToneTag tone={allocationTotal > 100 ? "danger" : unallocatedPct > 0 ? "warning" : "primary"}>
                  Allocated {allocationTotal}%
                </ToneTag>
                {unallocatedPct > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {formatNumber((Number(budget) * unallocatedPct) / 100)} RWF unallocated — it funds no additional area.
                  </span>
                )}
              </div>
            </>
          )}

          {intervention?.scenarioType === "irrigation" && (
            <RangeInput
              id="cs-ha"
              label="Hectares converted to irrigation"
              unit=" ha"
              min={0}
              max={5000}
              step={25}
              value={irrigatedHa}
              onChange={setIrrigatedHa}
            />
          )}
          {intervention?.scenarioType === "productivity" && (
            <RangeInput
              id="cs-yield"
              label="Target yield uplift"
              unit="%"
              min={5}
              max={50}
              step={1}
              value={yieldIncreasePct}
              onChange={setYieldIncreasePct}
            />
          )}
          {intervention?.scenarioType === "rainfall" && (
            <RangeInput
              id="cs-rain"
              label="Rainfall departure from the seasonal norm"
              unit="%"
              min={-50}
              max={50}
              step={5}
              value={rainfallDeltaPct}
              onChange={setRainfallDeltaPct}
            />
          )}
          {intervention?.scenarioType === "harvested_area" && (
            <RangeInput
              id="cs-area"
              label="Harvested area shift"
              unit="%"
              min={-30}
              max={30}
              step={1}
              value={areaDeltaPct}
              onChange={setAreaDeltaPct}
            />
          )}

          {budgetError && intervention?.scenarioType === "budget_allocation" && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-[11px] text-red-700">{budgetError}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRun} disabled={Boolean(activeError) || running} className="gap-2 text-xs">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? "Recalculating…" : "Run scenario"}
            </Button>
            {intervention?.scenarioType === "budget_allocation" && (
              <Button variant="outline" onClick={handleCompareStrategies} disabled={Boolean(activeError) || comparing} className="gap-2 text-xs">
                {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                {comparing ? "Comparing allocations…" : "Compare allocation strategies"}
              </Button>
            )}
            {result && (
              <Button variant="outline" onClick={handleSave} disabled={resultIsStale} className="gap-2 text-xs">
                <Save className="h-4 w-4" />
                {selectedScenario?.scenario?.scenarioId === result.scenarioId ? "Saved for action plan" : "Save for action plan"}
              </Button>
            )}
          </div>

          {activeError && (
            <p role="alert" className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
              {activeError}
              {!intervention.supported && (
                <span className="mt-1 block">
                  Next action: import a post-harvest loss dataset through Data management, then this option becomes calculable.
                </span>
              )}
            </p>
          )}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-[11px] text-red-700">{error}</p>}
          {resultIsStale && (
            <p role="note" className="rounded-lg bg-sky-50 p-3 text-[11px] text-sky-900">
              The figures below belong to the previous selection or parameter set. Nothing recalculates until you run the scenario again.
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          {/* ── Headline finding ──────────────────────────────────────────── */}
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Result — {district}, {crop}, {year} {season}</CardTitle>
              <CardDescription className="text-[12px]">
                Simulated figures are deterministic model output against a published baseline. They are not
                observations and do not establish a causal effect.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label="Observed production" value={`${formatNumber(result.baseline.productionTonnes, 0)} t`} note="Published source record" />
                <Metric label="Simulated production" value={`${formatNumber(result.simulated.productionTonnes, 0)} t`} note={result.modelMetadata.id} />
                <Metric
                  label="Change"
                  value={formatSignedPercent(result.comparison.percentProductionDifference, 1)}
                  tone={result.comparison.absoluteProductionDifference >= 0 ? "good" : "bad"}
                  note={`${formatNumber(result.comparison.absoluteProductionDifference, 1)} t`}
                />
                <Metric
                  label="Yield"
                  value={`${formatNumber(result.baseline.derivedYieldTonnesPerHa, 2)} → ${formatNumber(result.simulated.derivedYieldTonnesPerHa, 2)} t/ha`}
                  note="Production ÷ compatible harvested area"
                />
              </div>
              <p className="mt-3 text-[10.5px] text-muted-foreground">
                Baseline source: {result.baseline.sourceReference ?? "not recorded on the source cell"} · dataset{" "}
                {result.baseline.datasetId ?? "unavailable"} · executed {result.executionTimestamp.slice(0, 16)} UTC.
              </p>
            </CardContent>
          </Card>

          {/* ── Charts ────────────────────────────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Baseline versus scenario</CardTitle>
                <CardDescription className="text-[12px]">Production in metric tonnes. The observed bar is a published value; the simulated bar is model output.</CardDescription>
              </CardHeader>
              <CardContent>
                <ComparisonBarChart
                  rows={baselineVsScenario}
                  unitShort="t"
                  digits={0}
                  highlightKeys={["Simulated scenario"]}
                  explanationProps={{
                    chartType: "baseline versus scenario comparison",
                    title: `${intervention.short} — production effect`,
                    indicator: "production",
                    scope: `${district} · ${crop}`,
                    period: `${year} ${season}`,
                    filters: { crop, district, season, indicator: "production" },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sensitivity to the main assumption</CardTitle>
                <CardDescription className="text-[12px]">Simulated production (t) as the driving parameter moves −20% to +20%.</CardDescription>
              </CardHeader>
              <CardContent>
                <ComparisonBarChart
                  rows={sensitivityRows}
                  unitShort="t"
                  digits={0}
                  highlightKeys={["0%"]}
                  emptyMessage="The scenario returned no sensitivity sweep."
                  explanationProps={{
                    chartType: "sensitivity chart",
                    title: "Sensitivity of simulated production",
                    indicator: "production",
                    scope: `${district} · ${crop}`,
                    period: `${year} ${season}`,
                    filters: { crop, district, season, indicator: "production" },
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {intervention?.scenarioType === "budget_allocation" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Budget allocation</CardTitle>
                <CardDescription className="text-[12px]">RWF assigned to each component, including any amount left unallocated.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-[240px_1fr]">
                <DistributionChart rows={allocationRows} unit="RWF" />
                <div className="space-y-3">
                  <ComparisonBarChart
                    rows={allocationRows.filter((r) => r.value > 0).map((r) => ({ name: r.name, value: r.value }))}
                    unitShort="RWF"
                    digits={0}
                    height={200}
                    emptyMessage="Enter a budget to see the allocation."
                  />
                  <Separator />
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    The engine converts each component budget into funded hectares at the registered unit cost, then
                    caps it at the observed harvested area. Unallocated money funds nothing and is shown separately.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {strategies.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Allocation strategies compared</CardTitle>
                  <CardDescription className="text-[12px]">
                    Each row is a separate {formatNumber(Number(budget))} RWF run through the same engine. Only the
                    spend is comparable — the benefit is simulated, not measured.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ComparisonBarChart
                    rows={strategies.map((s) => ({ name: s.name, value: s.tonnage }))}
                    unitShort="t simulated"
                    digits={0}
                    emptyMessage="No strategy produced a calculable result."
                  />
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="p-2 font-medium">Strategy</th>
                          <th className="p-2 text-right font-medium">Simulated production (t)</th>
                          <th className="p-2 text-right font-medium">Change vs baseline</th>
                          <th className="p-2 text-right font-medium">RWF per added tonne</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {strategies.map((s) => (
                          <tr key={s.name}>
                            <td className="p-2 font-medium">{s.name}</td>
                            <td className="p-2 text-right tabular-nums">{formatNumber(s.tonnage, 0)}</td>
                            <td className={`p-2 text-right tabular-nums ${s.gain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {formatSignedPercent(s.result.comparison.percentProductionDifference, 1)}
                            </td>
                            <td className="p-2 text-right tabular-nums">
                              {s.costPerTonne === null ? "no gain to divide" : `${formatNumber(s.costPerTonne)} RWF`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {costVsBenefit.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cost versus estimated benefit</CardTitle>
                    <CardDescription className="text-[12px]">
                      Plotted because both axes are comparable quantities for every strategy: simulated tonnes gained
                      against RWF spent. Points above the pack are less cost-effective.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ width: "100%", height: 300 }}>
                      <ResponsiveContainer>
                        <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 4" />
                          <XAxis
                            type="number"
                            dataKey="x"
                            name="Tonnes gained"
                            unit=" t"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(v) => formatNumber(v, 0)}
                          />
                          <YAxis
                            type="number"
                            dataKey="y"
                            name="RWF per tonne"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(v) => formatNumber(v, 0)}
                            width={90}
                          />
                          <ZAxis type="number" dataKey="z" range={[60, 400]} name="Budget spent" unit=" RWF" />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const p = payload[0].payload;
                              return (
                                <div className="rounded-lg border bg-card p-2 text-[11px] shadow-md">
                                  <p className="font-semibold">{p.name}</p>
                                  <p className="text-muted-foreground">+{formatNumber(p.x, 1)} t simulated</p>
                                  <p className="text-muted-foreground">{formatNumber(p.y)} RWF per tonne</p>
                                </div>
                              );
                            }}
                          />
                          <Scatter data={costVsBenefit} fill="hsl(var(--chart-1))" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ── Transparency: progressive disclosure ──────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">How this was calculated</CardTitle>
              <CardDescription className="text-[12px]">Expand to see the assumptions, formulas and model status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Disclosure summary="Model and status" defaultOpen>
                <p className="text-[11px] text-muted-foreground">
                  {result.modelMetadata.name} v{result.modelMetadata.version} · id {result.modelMetadata.id}.
                  Registered unit costs and yield multipliers are planning benchmarks recorded in the model registry,
                  not verified expenditure or trial results, so treat every output as conditional on them.
                </p>
              </Disclosure>
              <Disclosure summary="Assumptions applied">
                <ul className="list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                  {result.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </Disclosure>
              <Disclosure summary="Formulas">
                <div className="space-y-1 rounded-lg bg-muted/30 p-3 font-mono text-[10.5px] text-muted-foreground">
                  {result.mathematicalFormulas.map((f) => (
                    <p key={f}>{f}</p>
                  ))}
                </div>
              </Disclosure>
              <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {result.scientificCaveat}
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Handoff ────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carry this into an action plan</CardTitle>
          <CardDescription className="text-[12px]">
            Save a scenario above to bring its district, crop, cost and assumption set into Prepare Action Plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedScenario ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-[11px]">
              <p className="font-semibold text-foreground">{selectedScenario.interventionLabel}</p>
              <p className="text-muted-foreground">
                {selectedScenario.savedForDistrict} · simulated{" "}
                {formatNumber(selectedScenario.scenario.simulated.productionTonnes, 0)} t (
                {formatSignedPercent(selectedScenario.scenario.comparison.percentProductionDifference, 1)})
                {selectedScenario.budget ? ` · ${formatNumber(selectedScenario.budget)} RWF` : ""}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">No scenario saved yet.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild className="gap-2 text-xs">
              <Link to="/agricultural-solutions/plan">
                Prepare Action Plan
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="text-xs">
              <Link to="/weather" search={{ panel: "analytics" }}>Weather &amp; climate evidence</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, note, tone }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[10.5px] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums ${
          tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-500" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>
    </div>
  );
}

function ScopeSelect({ id, label, value, onValueChange, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px]">{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {children}
      </select>
    </div>
  );
}

function AllocationInput({ id, label, value, onChange }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px]">{label} share</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <span className="w-12 shrink-0 text-right text-[11px] font-semibold tabular-nums">{value}%</span>
      </div>
    </div>
  );
}

function RangeInput({ id, label, unit, min, max, step, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-[11px]">{label}</Label>
        <span className="text-[11px] font-semibold tabular-nums text-primary">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function Disclosure({ summary, children, defaultOpen = false }) {
  return (
    <details open={defaultOpen} className="rounded-lg border bg-card">
      <summary className="cursor-pointer px-3 py-2 text-[11.5px] font-medium">{summary}</summary>
      <div className="border-t px-3 py-3">{children}</div>
    </details>
  );
}
