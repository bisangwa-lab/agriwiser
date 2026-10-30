import { useState } from 'react';
import {
  Sliders,
  Play,
  Layers,
  CloudRain,
  Sprout,
  DollarSign,
  Info,
  TrendingUp,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToneTag } from '@/components/common/ToneTag';
import { CROPS, DISTRICT_NAMES, SEASONS } from '@/lib/constants';
import { runDigitalTwinScenario } from '@/lib/intelligence/server-fns';
import { toast } from 'sonner';

export function DigitalTwinPanel() {
  const [district, setDistrict] = useState('Bugesera');
  const [crop, setCrop] = useState('Maize');
  const [season, setSeason] = useState('Season A');
  const [year, setYear] = useState(2024);

  const [scenarioType, setScenarioType] = useState('rainfall');
  const [rainfallDeltaPct, setRainfallDeltaPct] = useState(-20);
  const [newlyIrrigatedHectares, setNewlyIrrigatedHectares] = useState(500);
  const [yieldIncreasePct, setYieldIncreasePct] = useState(15);
  const [areaDeltaPct, setAreaDeltaPct] = useState(10);
  const [totalBudgetRwf, setTotalBudgetRwf] = useState(150000000); // 150M RWF

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleSimulate = async () => {
    setRunning(true);
    try {
      const res = await runDigitalTwinScenario({
        data: {
          district,
          crop,
          season,
          year,
          scenarioType,
          parameters: {
            rainfallDeltaPct,
            newlyIrrigatedHectares,
            yieldIncreasePct,
            areaDeltaPct,
            totalBudgetRwf,
          },
          title: `${district} ${crop} ${scenarioType.replace(/_/g, ' ')} simulation`,
        },
      });
      setResult(res);
      toast.success('Simulation executed deterministically.');
    } catch (err) {
      toast.error('Simulation failed: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Controls */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Baseline Selection */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            <h3 className="text-sm font-semibold">Select Authentic Baseline</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">District</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mt-1 block w-full rounded-lg border bg-background px-3 py-1.5 text-xs font-medium"
              >
                {DISTRICT_NAMES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Crop</label>
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="mt-1 block w-full rounded-lg border bg-background px-3 py-1.5 text-xs font-medium"
              >
                {CROPS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Season</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="mt-1 block w-full rounded-lg border bg-background px-3 py-1.5 text-xs font-medium"
                >
                  {SEASONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 block w-full rounded-lg border bg-background px-3 py-1.5 text-xs font-medium"
                >
                  {[2024, 2023, 2022, 2021, 2020, 2019, 2018].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Scenario Model & Assumptions */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <h3 className="text-sm font-semibold">Configure Policy Assumptions</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { id: 'rainfall', label: 'Rainfall Variation', icon: CloudRain },
              { id: 'irrigation', label: 'Irrigation Expansion', icon: Layers },
              { id: 'productivity', label: 'Agronomic Yield Uplift', icon: Sprout },
              { id: 'harvested_area', label: 'Area Reallocation', icon: Sliders },
              { id: 'combined', label: 'Combined Scenario', icon: TrendingUp },
              { id: 'budget_allocation', label: 'Budget Portfolio', icon: DollarSign },
            ].map((st) => {
              const Icon = st.icon;
              const active = scenarioType === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setScenarioType(st.id)}
                  className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : 'hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                  <span className="text-xs font-medium text-foreground">{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic parameter inputs */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            {scenarioType === 'rainfall' && (
              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Rainfall Departure from Normal</span>
                  <span className="font-mono font-bold text-primary">{rainfallDeltaPct}%</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  value={rainfallDeltaPct}
                  onChange={(e) => setRainfallDeltaPct(Number(e.target.value))}
                  className="w-full accent-primary mt-2"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Simulates drought deficit (negative) or excess precipitation (positive) based on crop rainfall elasticity.
                </p>
              </div>
            )}

            {scenarioType === 'irrigation' && (
              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Newly Irrigated Hectares</span>
                  <span className="font-mono font-bold text-primary">{newlyIrrigatedHectares} ha</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="50"
                  value={newlyIrrigatedHectares}
                  onChange={(e) => setNewlyIrrigatedHectares(Number(e.target.value))}
                  className="w-full accent-primary mt-2"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Applies validated 1.65x yield stabilization multiplier to converted hectares.
                </p>
              </div>
            )}

            {scenarioType === 'productivity' && (
              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Yield Improvement Target</span>
                  <span className="font-mono font-bold text-primary">+{yieldIncreasePct}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={yieldIncreasePct}
                  onChange={(e) => setYieldIncreasePct(Number(e.target.value))}
                  className="w-full accent-primary mt-2"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Models adoption of certified hybrid seed, targeted micro-dosing fertilizer, and soil amendment.
                </p>
              </div>
            )}

            {scenarioType === 'harvested_area' && (
              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Harvested Area Shift</span>
                  <span className="font-mono font-bold text-primary">{areaDeltaPct > 0 ? '+' : ''}{areaDeltaPct}%</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="5"
                  value={areaDeltaPct}
                  onChange={(e) => setAreaDeltaPct(Number(e.target.value))}
                  className="w-full accent-primary mt-2"
                />
              </div>
            )}

            {scenarioType === 'budget_allocation' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Intervention Budget (RWF)</span>
                  <span className="font-mono font-bold text-primary">{totalBudgetRwf.toLocaleString()} RWF</span>
                </div>
                <input
                  type="range"
                  min="20000000"
                  max="1000000000"
                  step="20000000"
                  value={totalBudgetRwf}
                  onChange={(e) => setTotalBudgetRwf(Number(e.target.value))}
                  className="w-full accent-primary mt-2"
                />
                <p className="text-[11px] text-muted-foreground">
                  Evaluates investment trade-offs across hillside irrigation (2.5M RWF/ha), certified seeds (45k RWF/ha), and soil lime (120k RWF/ha).
                </p>
              </div>
            )}

            {scenarioType === 'combined' && (
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Rainfall Shift:</span> {rainfallDeltaPct}%
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="5"
                    value={rainfallDeltaPct}
                    onChange={(e) => setRainfallDeltaPct(Number(e.target.value))}
                    className="w-full accent-primary mt-1"
                  />
                </div>
                <div>
                  <span className="text-muted-foreground">Irrigation:</span> {newlyIrrigatedHectares} ha
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={newlyIrrigatedHectares}
                    onChange={(e) => setNewlyIrrigatedHectares(Number(e.target.value))}
                    className="w-full accent-primary mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSimulate}
              disabled={running}
              className="gap-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run Digital Twin Simulation
            </Button>
          </div>
        </div>
      </div>

      {/* Simulation Results View */}
      {result && (
        <div className="space-y-6">
          {/* Comparison Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <span className="text-xs text-muted-foreground">Observed Baseline Output</span>
              <div className="mt-2 text-2xl font-bold">{result.baseline.productionTonnes.toLocaleString()} t</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {result.baseline.harvestedAreaHectares.toLocaleString()} ha · Yield {result.baseline.derivedYieldTonnesPerHa} t/ha
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <span className="text-xs text-muted-foreground">Simulated Scenario Output</span>
              <div className="mt-2 text-2xl font-bold text-primary">
                {result.simulated.productionTonnes.toLocaleString()} t
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {result.simulated.harvestedAreaHectares.toLocaleString()} ha · Yield {result.simulated.derivedYieldTonnesPerHa} t/ha
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <span className="text-xs text-muted-foreground">Projected Impact (Δ)</span>
              <div className={`mt-2 text-2xl font-bold ${result.comparison.absoluteProductionDifference >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {result.comparison.absoluteProductionDifference >= 0 ? '+' : ''}
                {result.comparison.absoluteProductionDifference.toLocaleString()} t
              </div>
              <div className="mt-2">
                <ToneTag tone={result.comparison.absoluteProductionDifference >= 0 ? 'accent' : 'destructive'}>
                  {result.comparison.percentProductionDifference >= 0 ? '+' : ''}
                  {result.comparison.percentProductionDifference}% output shift
                </ToneTag>
              </div>
            </div>
          </div>

          {/* Sensitivity Analysis Table */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-semibold">Sensitivity Analysis (Parameter Sweep)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 font-medium text-muted-foreground">
                    <th className="p-2.5">Input Variation</th>
                    <th className="p-2.5">Simulated Output</th>
                    <th className="p-2.5">Difference vs Baseline</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.sensitivityAnalysis.map((s) => (
                    <tr key={s.variationPct} className={s.variationPct === 0 ? 'bg-primary/5 font-semibold' : ''}>
                      <td className="p-2.5 font-mono">{s.variationPct > 0 ? '+' : ''}{s.variationPct}%</td>
                      <td className="p-2.5 font-mono">{s.simulatedProductionTonnes.toLocaleString()} tonnes</td>
                      <td className={`p-2.5 font-mono ${s.differenceTonnes >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {s.differenceTonnes > 0 ? '+' : ''}{s.differenceTonnes.toLocaleString()} tonnes
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Assumptions & Formulas */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-semibold">Model Transparency & Mathematical Formulas</h4>
            <div className="space-y-2">
              {result.assumptions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{a}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg bg-muted/30 p-3 font-mono text-[11px] text-muted-foreground space-y-1">
              {result.mathematicalFormulas.map((f, i) => (
                <div key={i}>{f}</div>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-950 dark:bg-amber-950/20 dark:text-amber-200">
              <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{result.scientificCaveat}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
