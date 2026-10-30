/**
 * Testable view model for existing AgriWiser Field Operations dashboard.
 * IMPORTANT: Inputs may be incomplete due to existing hook pagination limits.
 * Computed counts describe loaded records only, unless a complete backend
 * aggregate endpoint independently confirms totals.
 */
export const ACTIVE_CASE_STATUSES = new Set(['open', 'in_progress', 'awaiting_evidence']);
export const ACTIVE_ACTION_STATUSES = new Set(['pending', 'in_progress']);
export const ACTIVE_ALERT_STATUSES = new Set(['new', 'acknowledged', 'investigating']);

const isISODate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const normalEmail = value => String(value ?? '').trim().toLocaleLowerCase('en');
export const safeNumber = value => (typeof value === 'number' && Number.isFinite(value)) ? value : null;
export const hasValue = value => safeNumber(value) !== null;

export function displayMetric(value, unit = '', fractionDigits = 2) {
  return hasValue(value) ? `${value.toLocaleString('en-GB', { maximumFractionDigits: fractionDigits })}${unit ? ` ${unit}` : ''}` : 'Unavailable';
}
export function todayInKigali(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function plusDaysISO(dateISO, days) {
  if (!isISODate(dateISO)) return null;
  const d = new Date(dateISO + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function actionTiming(action, dateISO) {
  if (!ACTIVE_ACTION_STATUSES.has(action?.status) || !isISODate(action?.due_date) || !isISODate(dateISO)) return 'none';
  if (action.due_date < dateISO) return 'overdue';
  if (action.due_date <= plusDaysISO(dateISO, 7)) return 'due-soon';
  return 'later';
}
export function isMyCase(item, email) {
  return Boolean(normalEmail(email)) && normalEmail(item?.assignee_email) === normalEmail(email);
}
export function summaryFromLoaded({ investigations = [], actions = [], alerts = [], userEmail = '', dateISO } = {}) {
  const openCases = investigations.filter(x => ACTIVE_CASE_STATUSES.has(x?.status));
  const mine = openCases.filter(x => isMyCase(x, userEmail));
  const evidenceNeeded = openCases.filter(x => x.status === 'awaiting_evidence');
  const openActions = actions.filter(x => ACTIVE_ACTION_STATUSES.has(x?.status));
  const overdue = openActions.filter(x => actionTiming(x, dateISO) === 'overdue');
  const dueSoon = openActions.filter(x => actionTiming(x, dateISO) === 'due-soon');
  const reviewSignals = alerts.filter(x => ACTIVE_ALERT_STATUSES.has(x?.status));
  return {
    mine, openCases, evidenceNeeded, openActions, overdue, dueSoon, reviewSignals,
    counts: {
      assigned: mine.length,
      open: openCases.length,
      evidence: evidenceNeeded.length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      signals: reviewSignals.length,
    },
  };
}
const order = { priority: 0, review: 1, info: 2 };
export function selectTopFindings(alerts = [], limit = 6) {
  return alerts.filter(x => ACTIVE_ALERT_STATUSES.has(x?.status))
    .sort((a, b) => (order[a?.severity] ?? 3) - (order[b?.severity] ?? 3)
      || String(b?.generated_date ?? '').localeCompare(String(a?.generated_date ?? ''))
      || String(a?.id ?? '').localeCompare(String(b?.id ?? '')))
    .slice(0, Math.max(0, limit));
}
export function buildInvestigationDraftFromAlert(alert) {
  if (!alert || typeof alert !== 'object' || !alert.id) throw new Error('A valid source alert is required');
  const now = hasValue(alert.observed_value) ? alert.observed_value : null;
  const prev = hasValue(alert.previous_value) ? alert.previous_value : null;
  const snapshot = {
    source_kind: 'published-statistics-alert', alert_id: String(alert.id),
    source_dataset_id: alert.dataset_id ?? null, source_dataset_name: alert.dataset_name ?? null,
    crop: alert.crop ?? null, district: alert.district ?? null,
    indicator: alert.indicator ?? null, unit: alert.unit ?? null,
    current_period: alert.period ?? null, baseline_period: alert.previous_period ?? null,
    current_value: now, baseline_value: prev,
    absolute_change: safeNumber(alert.absolute_change), percentage_change: safeNumber(alert.percentage_change),
    quality_status: alert.quality_status ?? null, quality_flags: Array.isArray(alert.quality_flags) ? alert.quality_flags : [],
    rule_id: alert.rule_id ?? null, rule_version: alert.rule_version ?? null,
    rule_threshold_pct: safeNumber(alert.rule_threshold_pct),
  };
  return {
    title: String(alert.title ?? 'Investigation of published finding'),
    reason: String(alert.explanation ?? 'Review the source evidence'),
    crop: String(alert.crop ?? ''), district: String(alert.district ?? ''),
    indicator: String(alert.indicator ?? ''), period: String(alert.period ?? ''),
    alert_title: String(alert.title ?? ''), dataset_id: String(alert.dataset_id ?? ''),
    dataset_name: String(alert.dataset_name ?? ''), metric_snapshot: JSON.stringify(snapshot),
    calculation_snapshot: JSON.stringify({
      method: 'absolute = current - baseline; percent = absolute / baseline × 100 (baseline nonzero, compatible values)',
      rule_id: snapshot.rule_id, rule_version: snapshot.rule_version, threshold_pct: snapshot.rule_threshold_pct,
    }),
    evidence: `${snapshot.indicator ?? 'Indicator'}: ${displayMetric(now, snapshot.unit ?? '')} (${snapshot.current_period ?? 'period not recorded'}); baseline ${displayMetric(prev, snapshot.unit ?? '')} (${snapshot.baseline_period ?? 'period not recorded'}). Source: ${snapshot.source_dataset_name ?? 'not recorded'}. Quality and source must be verified.`,
    questions: 'Are both source periods and definitions comparable?\nIs zero reported or is a source cell missing?\nWhat source and field observations could confirm or challenge the finding?',
  };
}
export function potentialTruncation({ investigations = [], actions = [], alerts = [] } = {}) {
  // This is only a warning heuristic; a page with fewer rows may still have incomplete coverage.
  return investigations.length >= 300 || actions.length >= 300 || alerts.length >= 400;
}
