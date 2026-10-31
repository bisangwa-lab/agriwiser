import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  MapPin,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToneTag } from '@/components/common/ToneTag';
import { CROPS, DISTRICT_NAMES, SEASONS } from '@/lib/constants';
import { getNationalRiskMap, dispatchRiskInvestigation } from '@/lib/intelligence/server-fns';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { buildEvidenceActionBrief } from '@/lib/intelligence/action-brief.js';

export function RiskIntelligencePanel() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [district, setDistrict] = useState('Bugesera');
  const [crop, setCrop] = useState('Maize');
  const [season, setSeason] = useState('Season A');

  const [investigating, setInvestigating] = useState(false);
  const [lastHandoff, setLastHandoff] = useState(null);

  const riskQuery = useQuery({
    queryKey: ['risk-overview', user?.id ?? user?.email ?? 'current-user', crop, season],
    enabled: Boolean(user),
    queryFn: () => getNationalRiskMap({ data: { crop, season } }),
    // Risk results use published aggregates and are unchanged between imports.
    // Keep them fresh across brief panel switches instead of recomputing on return.
    staleTime: 120_000,
    retry: false,
  });
  const assessment = riskQuery.data?.assessments?.[district] ?? null;
  const nationalMap = riskQuery.data?.districts ?? [];
  const loading = riskQuery.isLoading;

  useEffect(() => {
    if (riskQuery.isError) toast.error('Failed to load risk evaluation: ' + riskQuery.error.message);
  }, [riskQuery.isError, riskQuery.error]);

  const handleLaunchInvestigation = async () => {
    if (!assessment) return;
    setInvestigating(true);
    setLastHandoff(null);
    try {
      const res = await dispatchRiskInvestigation({ data: { riskAssessment: assessment } });
      setLastHandoff(res);
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
        return 'danger';
      case 'HIGH':
        return 'warning';
      case 'ELEVATED':
        return 'info';
      case 'MODERATE':
        return 'primary';
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
            <label className="text-[11px] font-medium text-muted-foreground">{t("District")}</label>
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
            <label className="text-[11px] font-medium text-muted-foreground">{t("Crop")}</label>
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
            <label className="text-[11px] font-medium text-muted-foreground">{t("Season")}</label>
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

      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {t("Evaluating multi-signal risk matrix...")}
          </div>
        </div>
      ) : assessment ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold">
                {assessment.status === 'insufficient_history'
                  ? t('More data needed')
                  : assessment.signalCount
                    ? `${assessment.signalCount} ${t(assessment.signalCount === 1 ? 'signal' : 'signals')} ${t("for review")}`
                    : t('No signals found')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {assessment.status === 'insufficient_history'
                  ? assessment.message
                  : `${district} · ${crop} · ${season} · ${assessment.currentYear ?? 'period unavailable'}`}
              </p>
            </div>
            <ToneTag tone={assessment.signalCount ? getBadgeColor(assessment.riskLevel) : 'outline'}>
              {assessment.status === 'insufficient_history' ? t('Insufficient history') : assessment.signalCount ? `${t(assessment.riskLevel)} ${t("risk")}` : t('No active signals')}
            </ToneTag>
          </div>

          {(() => {
            const brief = buildEvidenceActionBrief(assessment, assessment.peerBenchmark);
            return (
              <section className="rounded-xl border border-primary/20 bg-primary/[0.025] p-5 shadow-sm" aria-labelledby="action-brief-title">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 id="action-brief-title" className="text-sm font-semibold tracking-tight">Evidence-to-Field-Action Brief</h3>
                    <p className="mt-1 text-xs text-muted-foreground">A source-linked review summary for {district} · {crop} · {season}.</p>
                  </div>
                  <ToneTag tone={brief.screening.signalCount ? getBadgeColor(brief.screening.riskLevel) : 'outline'}>
                    {brief.screening.score === null ? 'Score unavailable' : `Screening score ${brief.screening.score}/100 · triage only`}
                  </ToneTag>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-background p-3">
                    <h4 className="text-xs font-semibold">Observed evidence</h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {brief.evidence.current ? `${brief.evidence.current.year}: production ${formatMetric(brief.evidence.current.production)} t; harvested area ${formatMetric(brief.evidence.current.harvestedArea)} ha; derived yield ${formatMetric(brief.evidence.current.derivedYield)} t/ha.` : 'Current comparable production and area values are unavailable.'}
                      {brief.evidence.baseline ? ` Baseline ${brief.evidence.baseline.year}: production ${formatMetric(brief.evidence.baseline.production)} t; area ${formatMetric(brief.evidence.baseline.harvestedArea)} ha.` : ' No earlier comparable baseline is available.'}
                    </p>
                    <p className="mt-2 break-words text-[10px] text-muted-foreground">Source references: {brief.evidence.sourceReferences.length ? brief.evidence.sourceReferences.join(' · ') : 'unavailable'}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <h4 className="text-xs font-semibold">Same-release district comparison</h4>
                    {brief.peerBenchmark.status === 'available' ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">This district: {formatMetric(brief.peerBenchmark.districtYield)} t/ha; median of {brief.peerBenchmark.peerDistrictCount} other districts: {formatMetric(brief.peerBenchmark.peerMedianYield)} t/ha ({brief.peerBenchmark.differencePct === null ? 'difference unavailable' : `${brief.peerBenchmark.differencePct > 0 ? '+' : ''}${brief.peerBenchmark.differencePct.toFixed(1)}%`}). {brief.peerBenchmark.interpretation}</p>
                    ) : (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Comparison suppressed: {brief.peerBenchmark.reason ?? 'compatible observed peer data are unavailable'} This benchmark requires at least {brief.peerBenchmark.minimumPeerDistricts ?? 8} other districts in the same source release.</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-lg border bg-background p-3">
                  <h4 className="text-xs font-semibold">Verify before acting</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
                    {brief.verificationQuestions.map((question) => <li key={question}>{question}</li>)}
                  </ul>
                  <p className="mt-3 border-t pt-2 text-[10px] leading-relaxed text-muted-foreground">{brief.limitations.join(' ')} Precision: {brief.sourcePrecision}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                  <p className="max-w-2xl text-xs text-muted-foreground">A handoff creates a field case with linked source evidence. Field Operations assigns an officer and records each follow-up with an owner and due date.</p>
                  <Button size="sm" onClick={handleLaunchInvestigation} disabled={investigating || !assessment.signals?.length} className="gap-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white">
                    {investigating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
                    {investigating ? 'Creating field case…' : 'Create field case'}
                  </Button>
                </div>
                {!assessment.signals?.length && <p className="mt-2 text-xs text-muted-foreground">A case is available only when this assessment contains review signals.</p>}
                {lastHandoff && <p role="status" className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-950">Field case created: {lastHandoff.title} (#{lastHandoff.investigationId}). Field Operations can now assign an officer and set follow-up ownership and due dates.</p>}
              </section>
            );
          })()}

          {/* Active Risk Signals */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold tracking-tight">{t("Detected Risk Signals & Evidence Breakdown")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("Each signal shows its comparison, trigger rule, period, and available source reference.")}
            </p>

            {assessment.signals?.length ? (
              <div className="mt-4 space-y-3">
                {assessment.signals.map((sig) => (
                  <RiskSignalCard
                    key={sig.id}
                    signal={sig}
                    assessment={assessment}
                    severityTone={sig.severity === 'critical' || sig.severity === 'high' ? 'danger' : 'warning'}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed bg-muted/15 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden>
                  {assessment.status === 'insufficient_history' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {assessment.status === 'insufficient_history' ? t('Not enough comparable data yet') : t('No review signals for this selection')}
                  </p>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                    {assessment.status === 'insufficient_history'
                      ? assessment.message
                      : t(`No configured rule triggered for ${district} ${crop} ${season} in the available records. This does not prove that no agricultural risk exists.`)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Predictive Model Forecast */}
          {assessment.prediction && (() => {
            const weakFit = assessment.prediction.rSquared !== null && assessment.prediction.rSquared < 0.3;
            const mapeAvailable = Number.isFinite(assessment.prediction.validationMetrics?.mapePct);
            const needsCaution = weakFit || !mapeAvailable;
            const projectionContent = (
              <div className={`rounded-xl border p-5 ${needsCaution ? 'border-amber-200 bg-amber-50/40 dark:border-amber-950 dark:bg-amber-950/10' : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20'}`}>
              <div className="flex items-center gap-2">
                <Sparkles className={`h-4 w-4 ${needsCaution ? 'text-amber-700' : 'text-emerald-700'}`} />
                <h3 className="text-sm font-semibold text-foreground">
                  {t("Experimental next-season estimate")} ({assessment.prediction.targetSeasonYear} {t(season)})
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Model: {assessment.prediction.modelId} · {assessment.prediction.method}
              </p>

              {needsCaution && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-100/60 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                {t(weakFit ? 'The historical fit is weak for this district and crop.' : 'The forecast error metric is unavailable for this estimate.')} {t("Treat the range as exploratory; do not use it as a confirmed forecast.")}
              </p>}

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-background p-3 shadow-xs">
                  <span className="text-[11px] text-muted-foreground">{t("Estimated production")}</span>
                  <div className="text-xl font-bold text-foreground">
                    {assessment.prediction.projectedProductionTonnes?.toLocaleString()} t
                  </div>
                </div>
                <div className="rounded-lg bg-background p-3 shadow-xs">
                  <span className="text-[11px] text-muted-foreground">{t("Model range · not a guarantee")}</span>
                  <div className="text-sm font-semibold text-foreground">
                    {assessment.prediction.lowerBound90?.toLocaleString()} t — {assessment.prediction.upperBound90?.toLocaleString()} t
                  </div>
                </div>
                <div className="rounded-lg bg-background p-3 shadow-xs">
                  <span className="text-[11px] text-muted-foreground">{t("Fit and error measure")}</span>
                  <div className="text-sm font-semibold text-foreground">
                  R² = {assessment.prediction.rSquared ?? 'not available'} · MAPE = {Number.isFinite(assessment.prediction.validationMetrics?.mapePct) ? `${assessment.prediction.validationMetrics.mapePct}%` : 'not available'}
                  </div>
                </div>
              </div>
              </div>
            );
            return needsCaution
              ? <details className="group rounded-xl border border-amber-200 bg-card"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span><span className="block text-sm font-semibold">{t("Experimental estimate ·")} {assessment.prediction.targetSeasonYear} {t(season)}</span><span className="mt-1 block text-xs text-muted-foreground">{t("Weak or incomplete model validation · expand to inspect")}</span></span><span className="text-xs font-medium text-amber-800">{t("Exploratory")}</span></summary><div className="border-t border-amber-100 p-2">{projectionContent}</div></details>
              : projectionContent;
          })()}

          {/* National district screening ranking */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold tracking-tight">
              {t("District screening overview")} ({t(crop)} · {t(season)})
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Districts with triggered review signals, ordered by screening score. The score is a triage aid, not a probability or measure of confirmed harm.")}
            </p>

            {nationalMap.some((item) => item.signalCount > 0) ? (
              <div className="mt-4 grid gap-x-8 gap-y-2 lg:grid-cols-2">
                {nationalMap
                  .filter((item) => item.signalCount > 0 && Number.isFinite(item.compositeScore))
                  .slice()
                  .sort((a, b) => b.compositeScore - a.compositeScore)
                  .slice(0, 10)
                  .map((item, index) => (
                    <button
                      key={item.district}
                      type="button"
                      onClick={() => setDistrict(item.district)}
                      aria-label={`Select ${item.district}, ${item.signalCount} review signals, highest severity ${item.riskLevel}, screening score ${item.compositeScore} out of 100`}
                      aria-current={item.district === district ? 'true' : undefined}
                      className={`grid grid-cols-[minmax(105px,0.8fr)_minmax(90px,1.2fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${item.district === district ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="w-4 shrink-0 text-[10px] text-muted-foreground">{index + 1}</span>
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate text-xs font-medium">{item.district}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <span className={`block h-full rounded-full ${item.riskLevel === 'CRITICAL' || item.riskLevel === 'HIGH' ? 'bg-rose-600' : item.riskLevel === 'ELEVATED' || item.riskLevel === 'MODERATE' ? 'bg-amber-500' : 'bg-emerald-600'}`} style={{ width: `${Math.max(0, Math.min(100, item.compositeScore))}%` }} />
                        </span>
                        <span className="w-12 text-right font-mono text-[10px] tabular-nums">{item.compositeScore}/100</span>
                      </span>
                      <span className="flex flex-col items-start gap-1"><ToneTag tone={getBadgeColor(item.riskLevel)}>{item.riskLevel}</ToneTag><span className="text-[9px] text-muted-foreground">{item.signalCount} signal{item.signalCount === 1 ? '' : 's'}</span></span>
                      <span className="col-span-full pl-6 text-[10px] leading-relaxed text-muted-foreground">{item.signals?.[0]?.description ?? 'Review signal needs inspection.'}</span>
                    </button>
                  ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-muted/25 p-4 text-xs text-muted-foreground">{t("No district has a review signal in the available comparable records.")}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-3 text-[10px]">
              <ToneTag tone="outline">{nationalMap.filter((item) => item.status === 'no_signals').length} {t("with no triggered signal")}</ToneTag>
              <ToneTag tone="warning">{nationalMap.filter((item) => item.status === 'insufficient_history').length} {t("with insufficient data")}</ToneTag>
            </div>
            {nationalMap.filter((item) => item.signalCount > 0).length > 10 && <p className="mt-3 text-[10px] text-muted-foreground">{t("Showing the 10 highest screening scores. Select a district to review its evidence above.")}</p>}
          </div>
        </>
      ) : null}
    </div>
  );
}

function RiskSignalCard({ signal, assessment, severityTone }) {
  const metric = signal.metric === 'yield' ? 'derivedYield' : signal.metric === 'harvested_area' ? 'harvestedArea' : 'production';
  const unit = metric === 'derivedYield' ? 't/ha' : metric === 'harvestedArea' ? 'ha' : 't';
  const label = metric === 'derivedYield' ? 'Yield' : metric === 'harvestedArea' ? 'Harvested area' : metric === 'production' ? 'Production' : signal.metric;
  const history = assessment.history ?? [];
  const currentPoint = history.find((point) => point.year === signal.currentYear) ?? history.at(-1);
  const baselinePoint = history.find((point) => point.year === signal.baselineYear)
    ?? history.at(-2)
    ?? assessment.baselineObservations;
  const current = currentPoint?.[metric] ?? assessment.currentObservations?.[metric];
  const baseline = baselinePoint?.[metric] ?? assessment.baselineObservations?.[metric];
  const change = Number.isFinite(signal.percentChange)
    ? signal.percentChange
    : Number.isFinite(current) && Number.isFinite(baseline) && baseline !== 0
      ? ((current - baseline) / Math.abs(baseline)) * 100
      : null;
  const trendHistory = history.filter((point) => Number.isFinite(point[metric]));
  const sourceKey = metric === 'derivedYield' ? 'production' : signal.metric;
  const currentSource = currentPoint?.sources?.[sourceKey] ?? assessment.observationSources?.current?.[sourceKey];
  const baselineSource = baselinePoint?.sources?.[sourceKey] ?? assessment.observationSources?.baseline?.[sourceKey];

  return (
    <article className="rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">{label} · {assessment.district}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{signal.description}</p>
        </div>
        <ToneTag tone={severityTone}>{signal.severity} signal</ToneTag>
      </div>

      {signal.comparisonValues?.length === 3 ? (
        <div className="mt-4 rounded-xl bg-muted/20 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Observed production by year · metric tonnes</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {signal.comparisonValues.map((point) => (
              <div key={point.year} className="rounded-lg bg-background p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{point.year}</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{formatMetric(point.value)} <span className="text-xs font-medium text-muted-foreground">t</span></p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {signal.yearToYearChanges?.map((change) => (
              <ToneTag key={`${change.fromYear}-${change.toYear}`} tone={change.percentChange < 0 ? 'warning' : 'info'}>
                {change.fromYear} → {change.toYear}: {change.percentChange > 0 ? '+' : ''}{change.percentChange.toFixed(1)}%
              </ToneTag>
            ))}
            <ToneTag tone="danger">Overall {signal.percentChange > 0 ? '+' : ''}{signal.percentChange.toFixed(1)}%</ToneTag>
          </div>
        </div>
      ) : Number.isFinite(current) && Number.isFinite(baseline) ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{signal.baselineYear ?? baselinePoint?.year ?? 'Previous'}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatMetric(baseline)} <span className="text-xs font-medium text-muted-foreground">{unit}</span></p>
          </div>
          <ArrowChange change={current - baseline} />
          <div className="rounded-lg bg-primary/5 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{signal.currentYear ?? currentPoint?.year ?? assessment.currentYear ?? 'Current'}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatMetric(current)} <span className="text-xs font-medium text-muted-foreground">{unit}</span></p>
          </div>
          <ToneTag tone={change !== null && change < 0 ? 'danger' : 'info'}>
            {change === null ? 'Change unavailable' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
          </ToneTag>
        </div>
      ) : null}

      {trendHistory.length > 1 && <MiniTrend data={trendHistory} metric={metric} label={`${label} trend`} />}

      <div className="mt-4 grid gap-2 border-t pt-3 text-xs sm:grid-cols-2">
        <p><span className="font-semibold">Trigger:</span> {signal.triggerRule ?? 'Documented rule; details unavailable.'}</p>
        <p><span className="font-semibold">Period:</span> {signal.baselineYear ?? baselinePoint?.year ?? 'Previous available period'}–{signal.currentYear ?? currentPoint?.year ?? assessment.currentYear ?? 'current'}</p>
        <div className="sm:col-span-2">
          <span className="font-semibold">Sources:</span>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>Baseline: {renderSource(baselineSource)} <SourceAction source={baselineSource} /></span>
            <span>Current: {renderSource(currentSource)} <SourceAction source={currentSource} /></span>
            {signal.comparisonValues?.slice(1, -1).map((point) => {
              const source = history.find((yearPoint) => yearPoint.year === point.year)?.sources?.production;
              return <span key={point.year}>{point.year}: {renderSource(source)} <SourceAction source={source} /></span>;
            })}
            {metric === 'derivedYield' && (
              <span>Area input: {renderSource(currentPoint?.sources?.harvested_area)} <SourceAction source={currentPoint?.sources?.harvested_area} /></span>
            )}
          </div>
          {metric === 'derivedYield' && <p className="mt-1 text-muted-foreground">Yield is derived from production ÷ harvested area.</p>}
        </div>
      </div>
    </article>
  );
}

function ArrowChange({ change }) {
  const Icon = change < 0 ? TrendingDown : TrendingUp;
  return <Icon className={`hidden h-4 w-4 sm:block ${change < 0 ? 'text-amber-600' : 'text-emerald-600'}`} aria-hidden />;
}

function MiniTrend({ data, metric, label }) {
  const values = data.map((point) => point[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 180},${36 - ((value - min) / span) * 28}`).join(' ');
  return (
    <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-muted/20 px-3 py-2">
      <div>
        <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{data[0].year}–{data.at(-1).year}</p>
      </div>
      <svg viewBox="0 0 180 40" className="h-10 w-44 max-w-[55%]" role="img" aria-label={`${label}, ${data.length} annual observations`}>
        <polyline points={coords} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
        <circle cx="180" cy={36 - ((values.at(-1) - min) / span) * 28} r="3" fill="currentColor" className="text-primary" />
      </svg>
    </div>
  );
}

function formatMetric(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function renderSource(source) {
  if (!source) return 'Dataset reference unavailable';
  return [source.datasetId, source.sourceReference, source.unit].filter(Boolean).join(' · ') || 'Dataset reference unavailable';
}

function SourceAction({ source }) {
  const href = safeExternalUrl(source?.sourceUrl);
  return href ? <a href={href} target="_blank" rel="noreferrer" className="ml-1 font-medium text-primary underline">View source</a> : null;
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
