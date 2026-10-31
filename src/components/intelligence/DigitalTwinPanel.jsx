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
import { useLanguage } from '@/lib/LanguageContext';

export function DigitalTwinPanel() {
  const { t } = useLanguage();
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
            <h3 className="text-sm font-semibold">{t("Select baseline")}</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">{t("District")}</label>
              <select
                value={district}
                onChange={(e) => { setDistrict(e.target.value); setResult(null); }}
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
              <label className="text-xs text-muted-foreground">{t("Crop")}</label>
              <select
                value={crop}
                onChange={(e) => { setCrop(e.target.value); setResult(null); }}
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
                <label className="text-xs text-muted-foreground">{t("Season")}</label>
                <select
                  value={season}
                  onChange={(e) => { setSeason(e.target.value); setResult(null); }}
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
                <label className="text-xs text-muted-foreground">{t("Year")}</label>
                <select
                  value={year}
                  onChange={(e) => { setYear(Number(e.target.value)); setResult(null); }}
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
            <h3 className="text-sm font-semibold">{t("Choose a scenario and change an assumption")}</h3>
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
                  onClick={() => { setScenarioType(st.id); setResult(null); }}
                  className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : 'hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                  <span className="text-xs font-medium text-foreground">{t(st.label)}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic parameter inputs */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            {scenarioType === 'rainfall' && (
              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{t("Rainfall Departure from Normal")}</span>
                  <span className="font-mono font-bold text-primary">{rainfallDeltaPct}%</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  value={rainfallDeltaPct}
                  onChange={(e) => { setRainfallDeltaPct(Number(e.target.value)); setResult(null); }}
                  className="w-full accent-primary mt-2"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("Simulates drought deficit (negative) or excess precipitation (positive) based on crop rainfall elasticity.")}
                </p>
              </div>
            )}

            {scenarioType === 'irrigation' && (
              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{t("Newly Irrigated Hectares")}</span>
                  <span className="font-mono font-bold text-primary">{newlyIrrigatedHectares} ha</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="50"
                  value={newlyIrrigatedHectares}
                  onChange={(e) => { setNewlyIrrigatedHectares(Number(e.target.value)); setResult(null); }}
                  className="w-full accent-primary mt-2"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("Applies validated 1.65x yield stabilization multiplier to converted hectares.")}
                </p>
              </div>
            )}

            {scenarioType === 'productivity' && (
              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{t("Yield Improvement Target")}</span>
                  <span className="font-mono font-bold text-primary">+{yieldIncreasePct}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={yieldIncreasePct}
                  onChange={(e) => { setYieldIncreasePct(Number(e.target.value)); setResult(null); }}
                  className="w-full accent-primary mt-2"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("Models adoption of certified hybrid seed, targeted micro-dosing fertilizer, and soil amendment.")}
                </p>
              </div>
            )}

            {scenarioType === 'harvested_area' && (
              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{t("Harvested Area Shift")}</span>
                  <span className="font-mono font-bold text-primary">{areaDeltaPct > 0 ? '+' : ''}{areaDeltaPct}%</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="5"
                  value={areaDeltaPct}
                  onChange={(e) => { setAreaDeltaPct(Number(e.target.value)); setResult(null); }}
                  className="w-full accent-primary mt-2"
                />
              </div>
            )}

            {scenarioType === 'budget_allocation' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{t("Intervention Budget (RWF)")}</span>
                  <span className="font-mono font-bold text-primary">{totalBudgetRwf.toLocaleString()} RWF</span>
                </div>
                <input
                  type="range"
                  min="20000000"
                  max="1000000000"
                  step="20000000"
                  value={totalBudgetRwf}
                  onChange={(e) => { setTotalBudgetRwf(Number(e.target.value)); setResult(null); }}
                  className="w-full accent-primary mt-2"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("Evaluates investment trade-offs across hillside irrigation (2.5M RWF/ha), certified seeds (45k RWF/ha), and soil lime (120k RWF/ha).")}
                </p>
              </div>
            )}

            {scenarioType === 'combined' && (
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-muted-foreground">{t("Rainfall Shift:")}</span> {rainfallDeltaPct}%
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="5"
                    value={rainfallDeltaPct}
                    onChange={(e) => { setRainfallDeltaPct(Number(e.target.value)); setResult(null); }}
                    className="w-full accent-primary mt-1"
                  />
                </div>
                <div>
                  <span className="text-muted-foreground">{t("Irrigation:")}</span> {newlyIrrigatedHectares} ha
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={newlyIrrigatedHectares}
                    onChange={(e) => { setNewlyIrrigatedHectares(Number(e.target.value)); setResult(null); }}
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
              {t("Run scenario")}
            </Button>
          </div>
        </div>
      </div>

      {/* Simulation Results View */}
      {result && (
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5 shadow-sm" aria-label={t("Scenario baseline")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("Baseline ·")} {t(result.baseline.district)} {t(result.baseline.crop)}</p>
                <h3 className="mt-1 text-sm font-semibold">{result.baseline.season} {result.baseline.year}</h3>
              </div>
              <ToneTag tone="outline">{t("Source baseline")}</ToneTag>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <BaselineMetric label="Production" value={result.baseline.productionTonnes} unit="t" />
              <BaselineMetric label="Harvested area" value={result.baseline.harvestedAreaHectares} unit="ha" />
              <BaselineMetric label="Derived yield" value={result.baseline.derivedYieldTonnesPerHa} unit="t/ha" />
            </div>
            <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">
              Source: {result.baseline.datasetId ?? 'Dataset ID unavailable'}{result.baseline.sourceReference ? ` · ${result.baseline.sourceReference}` : ''} · Production in metric tonnes; area in hectares.
              {safeExternalUrl(result.baseline.sourceUrl) && <> <a href={safeExternalUrl(result.baseline.sourceUrl)} target="_blank" rel="noreferrer" className="font-medium text-primary underline">View source</a></>}
            </p>
          </section>

          {/* Comparison Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <span className="text-xs text-muted-foreground">{t("Baseline production")}</span>
              <div className="mt-2 text-2xl font-bold">{result.baseline.productionTonnes.toLocaleString()} t</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {result.baseline.harvestedAreaHectares.toLocaleString()} ha · {t("Yield")} {result.baseline.derivedYieldTonnesPerHa} t/ha
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <span className="text-xs text-muted-foreground">{t("Scenario estimate")}</span>
              <div className="mt-2 text-2xl font-bold text-primary">
                {result.simulated.productionTonnes.toLocaleString()} t
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {result.simulated.harvestedAreaHectares.toLocaleString()} ha · {t("Yield")} {result.simulated.derivedYieldTonnesPerHa} t/ha
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <span className="text-xs text-muted-foreground">{t("Difference from baseline")}</span>
              <div className={`mt-2 text-2xl font-bold ${result.comparison.absoluteProductionDifference >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {result.comparison.absoluteProductionDifference >= 0 ? '+' : ''}
                {result.comparison.absoluteProductionDifference.toLocaleString()} t
              </div>
              <div className="mt-2">
                <ToneTag tone={result.comparison.absoluteProductionDifference >= 0 ? 'primary' : 'danger'}>
                  {result.comparison.percentProductionDifference >= 0 ? '+' : ''}
                  {result.comparison.percentProductionDifference}% {t("output shift")}
                </ToneTag>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{t("Baseline compared with scenario")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t("Both bars use metric tonnes. The change is also shown in the summary above.")}</p>
              </div>
              <ToneTag tone={result.comparison.absoluteProductionDifference >= 0 ? 'primary' : 'warning'}>
                {result.comparison.absoluteProductionDifference > 0 ? '+' : ''}{result.comparison.absoluteProductionDifference.toLocaleString()} t · {result.comparison.percentProductionDifference > 0 ? '+' : ''}{result.comparison.percentProductionDifference}%
              </ToneTag>
            </div>
            <ProductionComparison
              baseline={result.baseline.productionTonnes}
              simulated={result.simulated.productionTonnes}
            />
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <div>
              <h4 className="text-sm font-semibold">{t("How the estimate changes when the input varies")}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{t("The central point matches the selected scenario. Other points vary one input while holding the remaining assumptions constant.")}</p>
            </div>
            <SensitivityChart points={result.sensitivityAnalysis} />
          </div>

          {/* Sensitivity values for accessible and exact reading */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-semibold">{t("Sensitivity values ·")} {t(result.sensitivityAnalysis[0]?.inputLabel)}</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 font-medium text-muted-foreground">
                    <th className="p-2.5">{t("Input Variation")}</th>
                    <th className="p-2.5">{t("Simulated Output")}</th>
                    <th className="p-2.5">{t("Difference vs Baseline")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.sensitivityAnalysis.map((s) => (
                    <tr key={s.variationPct} className={s.variationPct === 0 ? 'bg-primary/5 font-semibold' : ''}>
                      <td className="p-2.5 font-mono">{s.variationPct > 0 ? '+' : ''}{s.variationPct}% · {Number(s.inputValue).toLocaleString()}</td>
                      <td className="p-2.5 font-mono">{s.simulatedProductionTonnes.toLocaleString()} t</td>
                      <td className={`p-2.5 font-mono ${s.differenceTonnes >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {s.differenceTonnes > 0 ? '+' : ''}{s.differenceTonnes.toLocaleString()} t
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Assumptions & Formulas */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-semibold">{t("Model Transparency & Mathematical Formulas")}</h4>
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

function ProductionComparison({ baseline, simulated }) {
  const { t } = useLanguage();
  const maximum = Math.max(Math.abs(baseline), Math.abs(simulated), 1);
  const rows = [
    { label: t("Baseline"), value: baseline, color: "bg-slate-500" },
    { label: t("Scenario estimate"), value: simulated, color: "bg-emerald-600" },
  ];

  return (
    <div className="mt-5 space-y-4" role="img" aria-label={`Production comparison: baseline ${baseline.toLocaleString()} tonnes; scenario estimate ${simulated.toLocaleString()} tonnes`}>
      {rows.map((row) => (
        <div key={row.label} className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_130px] sm:items-center">
          <span className="text-xs font-medium">{row.label}</span>
          <div className="h-5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.max(0, (Math.abs(row.value) / maximum) * 100)}%` }} />
          </div>
          <span className="text-right text-xs font-semibold tabular-nums">{row.value.toLocaleString()} t</span>
        </div>
      ))}
      <p className="text-[11px] leading-relaxed text-muted-foreground">{t("This comparison illustrates the selected assumptions. It is not a measured outcome or a guarantee.")}</p>
    </div>
  );
}

function BaselineMetric({ label, value, unit }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg bg-muted/35 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t(label)}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{Number(value).toLocaleString()} <span className="text-xs font-medium text-muted-foreground">{unit}</span></p>
    </div>
  );
}

function SensitivityChart({ points }) {
  const { t } = useLanguage();
  const values = points.map((point) => point.simulatedProductionTonnes);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 560;
  const height = 170;
  const padX = 36;
  const padY = 18;
  const plotWidth = width - padX * 2;
  const plotHeight = height - padY * 2;
  const coords = points.map((point, index) => ({
    x: padX + (index / Math.max(points.length - 1, 1)) * plotWidth,
    y: padY + plotHeight - ((point.simulatedProductionTonnes - min) / span) * plotHeight,
    ...point,
  }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{t("Estimated production (tonnes)")}</span>
        <span>{t("Scenario input:")} {t(points[0]?.inputLabel ?? 'selected assumption')}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label={`${t("Sensitivity line chart. Estimated production ranges from")} ${min.toLocaleString()} ${t("to")} ${max.toLocaleString()} ${t("tonnes as")} ${t(points[0]?.inputLabel ?? 'the selected input')} ${t("varies.")}`}>
        {[0, 0.5, 1].map((fraction) => {
          const y = padY + plotHeight * fraction;
          const value = max - span * fraction;
          return (
            <g key={fraction}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="currentColor" strokeDasharray="3 4" className="text-border" />
              <text x="0" y={y + 4} fontSize="10" fill="currentColor" className="text-muted-foreground">{Math.round(value).toLocaleString()}</text>
            </g>
          );
        })}
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
        {coords.map((point) => (
          <g key={point.variationPct}>
            <circle cx={point.x} cy={point.y} r={point.variationPct === 0 ? 5 : 3.5} fill="currentColor" className={point.variationPct === 0 ? 'text-emerald-600' : 'text-primary'}>
              <title>{`${point.variationPct > 0 ? '+' : ''}${point.variationPct}% ${t("input variation:")} ${point.simulatedProductionTonnes.toLocaleString()} ${t("tonnes")}`}</title>
            </circle>
            <text x={point.x} y={height - 1} textAnchor="middle" fontSize="10" fill="currentColor" className="text-muted-foreground">{point.variationPct > 0 ? '+' : ''}{point.variationPct}%</text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" /> {t("Selected scenario")}</span>
        <span>{t("Input change from selected value (%)")}</span>
      </div>
    </div>
  );
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
