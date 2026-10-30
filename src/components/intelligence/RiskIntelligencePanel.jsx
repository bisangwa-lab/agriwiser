import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  CloudRain,
  Layers3,
  Calendar,
  MapPin,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  Info,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToneTag } from '@/components/common/ToneTag';
import { CROPS, DISTRICT_NAMES, SEASONS } from '@/lib/constants';
import { getDistrictRiskAssessment, getNationalRiskMap, dispatchRiskInvestigation } from '@/lib/intelligence/server-fns';
import { toast } from 'sonner';

export function RiskIntelligencePanel() {
  const [district, setDistrict] = useState('Bugesera');
  const [crop, setCrop] = useState('Maize');
  const [season, setSeason] = useState('Season A');

  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [nationalMap, setNationalMap] = useState([]);
  const [investigating, setInvestigating] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      try {
        const [resAssessment, resNational] = await Promise.all([
          getDistrictRiskAssessment({ data: { district, crop, season } }),
          getNationalRiskMap({ data: { crop, season } }),
        ]);
        if (active) {
          setAssessment(resAssessment);
          setNationalMap(resNational?.districts ?? []);
        }
      } catch (err) {
        if (active) toast.error('Failed to load risk evaluation: ' + err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [district, crop, season]);

  const handleLaunchInvestigation = async () => {
    if (!assessment) return;
    setInvestigating(true);
    try {
      const res = await dispatchRiskInvestigation({ data: { riskAssessment: assessment } });
      toast.success(`Field investigation launched: ${res.title}`);
    } catch (err) {
      toast.error('Investigation creation failed: ' + err.message);
    } finally {
      setInvestigating(false);
    }
  };

  const getBadgeColor = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'warning';
      case 'ELEVATED':
        return 'accent';
      case 'MODERATE':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">District</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="mt-0.5 block w-40 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary"
            >
              {DISTRICT_NAMES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Crop</label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="mt-0.5 block w-36 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary"
            >
              {CROPS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="mt-0.5 block w-32 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary"
            >
              {SEASONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleLaunchInvestigation}
            disabled={investigating || !assessment || assessment.compositeScore === 0}
            className="gap-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {investigating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
            Handoff to Field Operations
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Evaluating multi-signal risk matrix...
          </div>
        </div>
      ) : assessment ? (
        <>
          {/* Top assessment cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Composite Vulnerability</span>
                <ShieldAlert className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">{assessment.compositeScore}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
              <div className="mt-2">
                <ToneTag tone={getBadgeColor(assessment.riskLevel)}>{assessment.riskLevel} RISK</ToneTag>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Active Signals</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight">{assessment.signalCount}</div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {assessment.agriculturalSignalCount} agricultural, {assessment.climateSignalCount} climate
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Evidence Confidence</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight">
                {Math.round(assessment.confidence * 100)}%
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Grounded in verified NISR survey records</p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Multi-Season Trend</span>
                {assessment.persistentDecline ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <div className="mt-2 text-sm font-semibold">
                {assessment.persistentDecline ? 'Persistent 3-Year Decline' : 'Fluctuating / Stable'}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {assessment.currentYear} vs previous reference seasons
              </p>
            </div>
          </div>

          {/* Active Risk Signals */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold tracking-tight">Detected Risk Signals & Evidence Breakdown</h3>
            <p className="text-xs text-muted-foreground">
              Evaluated using validated materiality floors and source attribution
            </p>

            {assessment.signals?.length ? (
              <div className="mt-4 space-y-3">
                {assessment.signals.map((sig) => (
                  <div key={sig.id} className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3.5">
                    <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-amber-500" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{sig.id} · {sig.type.replace(/_/g, ' ').toUpperCase()}</span>
                        <ToneTag tone={sig.severity === 'critical' ? 'destructive' : 'warning'}>{sig.severity}</ToneTag>
                      </div>
                      <p className="text-xs text-foreground/90">{sig.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                No active risk signals triggered for {district} {crop} {season}. Historical yield and production remain within expected variance.
              </div>
            )}
          </div>

          {/* Predictive Model Forecast */}
          {assessment.prediction && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-950 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                  Validated Predictive Projection ({assessment.prediction.targetSeasonYear} {season})
                </h3>
              </div>
              <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                Model: {assessment.prediction.modelId} · {assessment.prediction.method}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-background p-3 shadow-xs">
                  <span className="text-[11px] text-muted-foreground">Projected Production</span>
                  <div className="text-xl font-bold text-foreground">
                    {assessment.prediction.projectedProductionTonnes?.toLocaleString()} t
                  </div>
                </div>
                <div className="rounded-lg bg-background p-3 shadow-xs">
                  <span className="text-[11px] text-muted-foreground">90% Confidence Interval</span>
                  <div className="text-sm font-semibold text-foreground">
                    {assessment.prediction.lowerBound90?.toLocaleString()} t — {assessment.prediction.upperBound90?.toLocaleString()} t
                  </div>
                </div>
                <div className="rounded-lg bg-background p-3 shadow-xs">
                  <span className="text-[11px] text-muted-foreground">Model Calibration (R² / MAPE)</span>
                  <div className="text-sm font-semibold text-foreground">
                    R² = {assessment.prediction.rSquared} · MAPE = {assessment.prediction.validationMetrics?.mapePct}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* National District Vulnerability Ranking */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold tracking-tight">
              Rwanda National Risk Ranking ({crop} · {season})
            </h3>
            <p className="text-xs text-muted-foreground">
              Comparison across all 30 districts based on verified survey series
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 font-medium text-muted-foreground">
                    <th className="p-2.5">District</th>
                    <th className="p-2.5">Risk Level</th>
                    <th className="p-2.5">Composite Score</th>
                    <th className="p-2.5">Active Signals</th>
                    <th className="p-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {nationalMap
                    .sort((a, b) => b.compositeScore - a.compositeScore)
                    .map((item) => (
                      <tr key={item.district} className={item.district === district ? 'bg-primary/5 font-semibold' : ''}>
                        <td className="p-2.5 flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {item.district}
                        </td>
                        <td className="p-2.5">
                          <ToneTag tone={getBadgeColor(item.riskLevel)}>{item.riskLevel}</ToneTag>
                        </td>
                        <td className="p-2.5 font-mono">{item.compositeScore}/100</td>
                        <td className="p-2.5">{item.signalCount}</td>
                        <td className="p-2.5">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setDistrict(item.district)}
                            className="h-6 px-2 text-[11px]"
                          >
                            Select
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
