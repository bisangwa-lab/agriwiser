import { normalizeRole } from './rbac.js';
import { CROPS, DISTRICT_NAMES, NOTE_TYPES } from './constants.js';
import { paginateDatasetFindings } from './dataset-findings.js';
import { isUsableRiskRecord } from './intelligence/evidence-service.js';

export const WORK_ENTITIES = new Set([
  'Investigation',
  'InvestigationNote',
  'FollowUpAction',
  'FieldVisit',
  'ReviewDecision',
  'EvidenceAttachment',
  'EvidenceVerification',
  'AuditEvent',
]);
export const EVIDENCE_TYPES = Object.freeze([
  'document_reference',
  'photo_reference',
  'interview_record',
  'source_excerpt',
  'other',
]);
const STAFF = new Set(['super_admin', 'field_supervisor', 'agricultural_officer', 'field_investigator']);
const ASSIGNABLE = new Set(STAFF);
export const isSupervisor = (user) => ['super_admin', 'field_supervisor'].includes(normalizeRole(user));
export const workflowError = (message, status = 400) => Object.assign(new Error(message), { status });
const fail = (message, status) => {
  throw workflowError(message, status);
};
const clean = (value, max = 10000) =>
  typeof value === 'string' && value.length <= max ? value.trim() : fail('Invalid or oversized text.');
const date = (value) => {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    fail('Choose a valid calendar date.');
  return value;
};
const required = (value, label, min = 1) => {
  if (value === undefined || value === null || value === '') fail(`${label} is required (${min} characters minimum).`);
  const text = clean(value);
  if (text.length < min) fail(`${label} is required (${min} characters minimum).`);
  return text;
};
const choice = (value, allowed) => (allowed.includes(value) ? value : fail('Invalid workflow status or classification.'));
const ident = (value) => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_.:@| -]{1,500}$/.test(value)) fail('Invalid record identifier.');
  return value;
};
const same = (a, b) => Boolean(a && b && String(a).toLowerCase() === String(b).toLowerCase());
const safeReference = (value) => {
  const text = required(value, 'Evidence reference', 3);
  if (text.length > 1000) fail('Evidence reference is too long.');
  if (/^(javascript|data|vbscript):/i.test(text)) fail('Use a document, record or https reference, not executable content.');
  return text;
};

export function canReadCase(user, item) {
  if (!user || !item) return false;
  if (isSupervisor(user)) return true;
  const role = normalizeRole(user);
  if (['agricultural_analyst', 'policy_maker', 'data_manager'].includes(role)) return true;
  if (!STAFF.has(role)) return false;
  // Risk cases submitted by analysts enter the field team's unassigned queue.
  if (item.source === 'risk_engine' && !item.assignee_id && !item.assignee_email) return true;
  return (
    same(item.assignee_id, user.id) ||
    same(item.created_by_id, user.id) ||
    same(item.created_by, user.email) ||
    same(item.assignee_email, user.email)
  );
}
export function assertCaseAccess(user, item) {
  if (!user) fail('Sign in to continue.', 401);
  if (!canReadCase(user, item)) fail('This case is outside your assigned work.', 403);
}

export async function hashSnapshot(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

const CASE_FIELDS = [
  'title',
  'description',
  'reason',
  'priority',
  'crop',
  'district',
  'indicator',
  'period',
  'evidence',
  'questions',
  'due_date',
  'outcome_summary',
];
function caseFields(input, creating = false) {
  const output = {};
  for (const key of CASE_FIELDS) if (input[key] !== undefined) output[key] = clean(input[key]);
  if (creating || input.title !== undefined) output.title = required(input.title, 'Question/title', 3);
  if (creating || input.reason !== undefined) output.reason = required(input.reason, 'Investigation reason', 10);
  if (creating || input.district !== undefined) output.district = choice(input.district, DISTRICT_NAMES);
  if (creating || input.crop !== undefined) output.crop = choice(input.crop, CROPS);
  if (input.priority !== undefined) output.priority = choice(input.priority, ['standard', 'elevated']);
  if (input.due_date) output.due_date = date(input.due_date);
  return output;
}

/**
 * Repository commits compare versions and persist the change plus audit as one
 * transaction. Every mutation is authorized here, not in the browser.
 */
export function createFieldWorkflow(repo, user, { now = () => new Date().toISOString(), findingsProvider } = {}) {
  const authenticate = () => {
    if (!user) fail('Sign in to continue.', 401);
  };
  const staff = () => {
    authenticate();
    if (!STAFF.has(normalizeRole(user))) fail('A field operations role is required.', 403);
  };
  async function parent(id) {
    ident(id);
    const item = await repo.get('Investigation', id);
    if (!item) fail('Investigation unavailable.', 404);
    assertCaseAccess(user, item);
    return item;
  }
  async function all(entity, query = {}) {
    const rows = [];
    let cursor = '0';
    const seen = new Set();
    do {
      if (seen.has(cursor)) fail('Incomplete workflow pagination.', 503);
      seen.add(cursor);
      const page = await repo.list(entity, query, cursor);
      rows.push(...page.items);
      if (!page.has_more) return rows;
      cursor = page.next_cursor;
      if (!cursor || rows.length > 100000) fail('Workflow result exceeds the query budget.', 503);
    } while (cursor);
    return rows;
  }
  async function assignment(input, current, creating, { riskHandoff = false } = {}) {
    const requestedProvided = input.assignee_id !== undefined || input.assignee_email !== undefined;
    if (!creating && !requestedProvided) return {};
    const requested = input.assignee_id ?? input.assignee_email ?? '';
    if (!creating) {
      const existing = current?.assignee_id || current?.assignee_email || '';
      if (requested === existing || (requested && same(requested, current?.assignee_email))) return {};
      if (!isSupervisor(user)) fail('Only supervisors can reassign cases.', 403);
      required(input.assignment_reason, 'Reassignment reason', 10);
    }
    if (requested && !isSupervisor(user) && !same(requested, user.id) && !same(requested, user.email)) {
      fail('Only supervisors can assign other officers.', 403);
    }
    const target = requested ? await repo.account(requested) : creating && !isSupervisor(user) && !riskHandoff ? user : null;
    if (requested && !target) fail('Choose an active officer from the account directory.');
    if (target && !ASSIGNABLE.has(normalizeRole(target))) fail('Assign an active field operations account.');
    return {
      assignee_id: target?.id ?? '',
      assignee_email: target?.email ?? '',
      assignee_name: target?.full_name ?? '',
    };
  }
  async function persist(entity, before, after, caseRecord, action, extras = [], reason = '') {
    const at = now(),
      version = (before?.version ?? 0) + 1;
    const record = {
      ...after,
      version,
      updated_date: at,
      id: after.id,
      created_date: before?.created_date ?? at,
      created_by: before?.created_by ?? user.email ?? user.id,
      created_by_id: before?.created_by_id ?? user.id,
    };
    const audit = {
      id: `audit-${crypto.randomUUID()}`,
      investigation_id: caseRecord?.id ?? record.id,
      actor_id: user.id,
      actor_name: user.full_name ?? user.email,
      action,
      entity,
      record_id: record.id,
      from_version: before?.version ?? 0,
      to_version: version,
      before: before ?? null,
      after: record,
      reason,
      created_date: at,
    };
    const changes = [
      { entity, id: record.id, expected: before?.version ?? (before ? 0 : -1), data: record },
      ...extras,
      { entity: 'AuditEvent', id: audit.id, expected: -1, data: audit },
    ];
    if (caseRecord && entity !== 'Investigation')
      changes.unshift({
        entity: 'Investigation',
        id: caseRecord.id,
        expected: caseRecord.version ?? 0,
        data: { ...caseRecord, version: (caseRecord.version ?? 0) + 1, updated_date: at },
      });
    await repo.commit(changes, user.id);
    return record;
  }

  function findingSignals(group) {
    return group.findings.map((finding) => ({
      id: finding.id,
      rule_id: finding.rule_id,
      rule_version: finding.rule_version,
      finding_type: finding.finding_type,
      condition_type: finding.condition_type,
      indicator: finding.indicator,
      unit: finding.unit,
      current_period: finding.current_period,
      baseline_period: finding.baseline_period,
      current_value: finding.current_value,
      baseline_value: finding.baseline_value,
      absolute_change: finding.absolute_change,
      percentage_change: finding.percentage_change,
      comparison_state: finding.comparison_state,
      validation_status: finding.validation_status,
      validation_label: finding.validation_label,
      calculation_used: finding.calculation_used,
      evidence_limitations: finding.evidence_limitations,
      source_reference: finding.source_reference,
      dataset_id: finding.dataset_id,
      dataset_name: finding.dataset_name,
      source: finding.source,
    }));
  }

  async function sourceSnapshot(input) {
    let alert = null;
    let finding = null;

    if (input.finding_group_id) {
      if (typeof findingsProvider !== 'function') fail('Finding analysis is unavailable.', 503);
      const analysis = await findingsProvider();
      finding = (analysis?.groups ?? []).find((group) => group.id === input.finding_group_id);
      if (!finding) fail('The selected finding is no longer available. Reload the queue.', 404);
      if (input.district !== finding.district || input.crop !== finding.crop)
        fail('The case scope must match its triggering finding.');
      const signals = findingSignals(finding);
      const records = signals.flatMap((signal) => [signal.source?.current, signal.source?.baseline].filter(Boolean));
      const snapshot = {
        schema_version: 2,
        captured_at: now(),
        source_class: 'published_statistics',
        finding_group_id: finding.id,
        finding_ids: signals.map((signal) => signal.id),
        finding_type: signals.every((signal) => signal.finding_type === 'data_quality')
          ? 'data_quality'
          : 'temporal_comparison',
        validation_status: finding.validation_status,
        signals,
        records,
        sources: [...new Set(signals.map((signal) => signal.dataset_name).filter(Boolean))],
        period: finding.current_period,
        limitations:
          'Published district aggregates; a statistical signal is not a confirmed incident. Field verification remains required.',
      };
      if (JSON.stringify(snapshot).length > 1000000) fail('The finding evidence is too large to attach.');
      return { snapshot, alert: null, finding };
    }

    if (input.source === 'risk_engine') {
      let evidence;
      try {
        evidence = JSON.parse(input.evidence);
      } catch {
        fail('The risk brief evidence is invalid. Re-run the assessment before dispatch.');
      }
      const brief = evidence?.actionBrief;
      const current = brief?.evidence?.current;
      const baseline = brief?.evidence?.baseline;
      const sourceRows = [current, baseline].flatMap((point) => Object.values(point?.sources ?? {}));
      const targetReferences = new Set(sourceRows.map((source) => source?.sourceReference).filter(Boolean));
      const targetYears = new Set([current?.year, baseline?.year].filter(Number.isInteger));
      const targetDatasetIds = new Set(sourceRows.map((source) => source?.datasetId).filter(Boolean));
      const peer = brief?.peerBenchmark;
      if (!targetReferences.size || !targetYears.size || !targetDatasetIds.size)
        fail('No source-linked current and baseline records are available for this field handoff.');

      const peerDistricts = new Set(peer?.status === 'available' ? peer.peerDistricts ?? [] : []);
      const peerYear = peer?.status === 'available' ? Number(peer.year) : null;
      const peerDatasetId = peer?.status === 'available' ? peer.datasetId : null;
      const season = input.period.match(/Season [ABC]/)?.[0];
      const candidates = await all('AgriculturalObservation', { domain: 'crop', crop: input.crop, season });
      const records = candidates.filter((row) => {
        if (row.is_demo === true || row.is_forecast === true || /demo|forecast|model|scenario/i.test(String(row.quality_status ?? ''))) return false;
        if (row.geography === input.district && targetYears.has(Number(row.year)) && targetDatasetIds.has(row.dataset_id) && targetReferences.has(row.source_reference) &&
          ['production', 'harvested_area'].includes(row.indicator) && isUsableRiskRecord(row, row.indicator)) return true;
        return Boolean(peerDatasetId) && Number(row.year) === peerYear && row.dataset_id === peerDatasetId && peerDistricts.has(row.geography) &&
          ['production', 'harvested_area'].includes(row.indicator) && isUsableRiskRecord(row, row.indicator, { requireExplicitObserved: true });
      });
      if (!records.some((row) => row.geography === input.district))
        fail('The selected source observations are no longer available. Refresh the brief before dispatch.');
      const datasetIds = new Set(records.map((row) => row.dataset_id).filter(Boolean));
      const datasets = (await all('Dataset')).filter((row) => datasetIds.has(row.id));
      const snapshot = {
        schema_version: 3,
        captured_at: now(),
        source_class: 'published_statistics',
        action_brief: brief,
        records,
        sources: datasets,
        period: `${season ?? ''} ${[...targetYears].sort().at(-1) ?? ''}`.trim(),
        limitations: [...(brief.limitations ?? []), 'Field verification is required; this screening signal does not establish a cause or confirmed incident.'],
      };
      if (JSON.stringify(snapshot).length > 1000000) fail('Narrow the field brief before saving its source snapshot.');
      return { snapshot, alert: null, finding: null };
    }

    if (input.alert_id) {
      alert = await repo.get('Alert', ident(input.alert_id));
      if (!alert) fail('The source signal is unavailable.', 404);
    }
    const district = alert?.district ?? input.district,
      crop = alert?.crop ?? input.crop;
    if (alert && (input.district !== district || input.crop !== crop))
      fail('The case scope must match its triggering signal.');
    const candidates = await all('AgriculturalObservation', { domain: 'crop', geography: district, crop });
    const period = alert?.period ?? input.period ?? '';
    const year = Number(period.match(/\b(19|20)\d{2}\b/)?.[0]);
    const season = period.match(/Season [ABC]/)?.[0];
    const ids = alert?.contributing_observation_ids;
    const records = candidates.filter((row) =>
      ids?.length
        ? ids.includes(row.id)
        : (!year || Number(row.year) === year || Number(row.year) === year - 1) &&
          (!season || row.season === season),
    );
    const datasets = await all('Dataset');
    const sources = datasets.filter((row) => records.some((cell) => cell.dataset_id === row.id));
    const snapshot = {
      schema_version: 1,
      captured_at: now(),
      source_class: 'published_statistics',
      trigger: alert,
      records,
      sources,
      period,
      limitations: records.length
        ? 'Published source records; statistical signals require verification and do not establish causation.'
        : 'No matching published source record is available. This is a manually reported question, not verified NISR evidence.',
    };
    if (JSON.stringify(snapshot).length > 1000000) fail('Narrow the case period before saving the source snapshot.');
    return { snapshot, alert, finding };
  }

  async function create({ entity, record: input }, { riskHandoff = false } = {}) {
    if (riskHandoff) {
      authenticate();
      if (![...STAFF, 'agricultural_analyst', 'policy_maker'].includes(normalizeRole(user)) || entity !== 'Investigation' || input?.source !== 'risk_engine')
        fail('This account cannot send a risk signal for field follow-up.', 403);
    } else {
      staff();
    }
    if (!WORK_ENTITIES.has(entity) || ['AuditEvent', 'ReviewDecision', 'EvidenceAttachment', 'EvidenceVerification'].includes(entity))
      fail('Use the dedicated workflow action.', 403);
    if (!input || typeof input !== 'object' || Array.isArray(input) || JSON.stringify(input).length > 1100000)
      fail('Invalid workflow payload.');
    if (entity === 'Investigation') {
      const fields = caseFields(input, true),
        key = required(input.idempotency_key, 'Idempotency key');
      ident(key);
      const id = `case-${await hashSnapshot([user.id, key])}`;
      const existing = await repo.get(entity, id);
      if (existing) {
        assertCaseAccess(user, existing);
        return existing;
      }
      const { snapshot, alert, finding } = await sourceSnapshot(input);
      if (alert?.investigation_id) return parent(alert.investigation_id);
      if (finding) {
        const cases = await all('Investigation');
        const match = cases.find(
          (item) => item.finding_group_id === finding.id && !['completed', 'cancelled'].includes(item.status),
        );
        if (match) {
          assertCaseAccess(user, match);
          return match;
        }
      }
      const assigned = await assignment(input, null, true, { riskHandoff });
      const signals = snapshot.signals ?? [];
      const after = {
        ...fields,
        ...(riskHandoff ? { source: 'risk_engine' } : {}),
        ...assigned,
        id,
        status: 'open',
        review_status: 'not_submitted',
        source_snapshot: snapshot,
        source_snapshot_hash: await hashSnapshot(snapshot),
        metric_snapshot: JSON.stringify(signals.length ? signals : snapshot.records.slice(0, 50)),
        calculation_snapshot: signals
          .map((signal) => signal.calculation_used)
          .filter(Boolean)
          .join('\n'),
        dataset_id: finding?.primary_finding?.dataset_id ?? alert?.dataset_id ?? snapshot.sources[0]?.id ?? '',
        dataset_name:
          finding?.primary_finding?.dataset_name ??
          alert?.dataset_name ??
          snapshot.sources[0]?.name ??
          'Source unavailable',
        alert_id: alert?.id ?? '',
        finding_group_id: finding?.id ?? '',
        finding_ids: snapshot.finding_ids ?? [],
        finding_validation_status: finding?.validation_status ?? '',
        is_demo: snapshot.records.some((row) => row.is_demo === true),
        provenance_status: finding || snapshot.records.length ? 'source_linked' : 'manual_unverified',
      };
      const extras = alert
        ? [
            {
              entity: 'Alert',
              id: alert.id,
              expected: alert.version ?? 0,
              data: { ...alert, status: 'investigating', investigation_id: id, version: (alert.version ?? 0) + 1 },
            },
          ]
        : [];
      try {
        return await persist(entity, null, after, null, 'case_created', extras);
      } catch (error) {
        if (error.status === 409) {
          const saved = await repo.get(entity, id);
          if (saved) {
            assertCaseAccess(user, saved);
            return saved;
          }
        }
        throw error;
      }
    }
    const caseRecord = await parent(input.investigation_id);
    if (['completed', 'cancelled'].includes(caseRecord.status) || caseRecord.review_status === 'submitted')
      fail('Reopen or return the case before adding evidence or tasks.', 409);
    const data = {
      id: `${entity.toLowerCase()}-${crypto.randomUUID()}`,
      investigation_id: caseRecord.id,
      is_demo: caseRecord.is_demo ?? false,
    };
    if (entity === 'InvestigationNote')
      Object.assign(data, {
        content: required(input.content, 'Observation', 3),
        note_type: choice(input.note_type, NOTE_TYPES.map((t) => t.key)),
        observed_on: date(input.observed_on),
        source_class: choice(input.source_class ?? 'field_observation', [
          'field_observation',
          'source_check',
          'reported_observation',
        ]),
        author_name: user.full_name ?? user.email,
        author_email: user.email,
        quality_status: 'unreviewed',
        measurement: input.measurement == null ? null : Number(input.measurement),
        unit: input.measurement == null ? '' : required(input.unit, 'Measurement unit'),
      });
    if (
      entity === 'InvestigationNote' &&
      data.measurement !== null &&
      (!Number.isFinite(data.measurement) || input.measurement === '')
    )
      fail('Enter a finite measurement or leave it unavailable.');
    if (entity === 'FollowUpAction') {
      const target = input.owner_id ? await repo.account(ident(input.owner_id)) : user;
      if (!target || !STAFF.has(normalizeRole(target))) fail('Choose an active field account.');
      if (!same(target.id, user.id) && !same(target.id, caseRecord.assignee_id))
        fail('Tasks must belong to the case officer or current actor. Reassign the case first.');
      Object.assign(data, {
        title: required(input.title, 'Action title', 3),
        description: clean(input.description ?? ''),
        owner: target.full_name ?? target.email,
        owner_id: target.id,
        due_date: date(input.due_date),
        status: 'pending',
      });
    }
    if (entity === 'FieldVisit')
      Object.assign(data, {
        scheduled_for: date(input.scheduled_for),
        purpose: required(input.purpose, 'Visit purpose', 10),
        location: caseRecord.district,
        checklist: required(input.checklist, 'Checklist', 3),
        safety: clean(input.safety ?? ''),
        team: clean(input.team ?? ''),
        status: 'scheduled',
      });
    // New evidence invalidates prior approval; closed records cannot be edited.
    return persist(entity, null, data, { ...caseRecord, review_status: 'not_submitted' }, `${entity.toLowerCase()}_created`);
  }

  async function update({ entity, id, patch }) {
    staff();
    ident(id);
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || JSON.stringify(patch).length > 100000)
      fail('Invalid update.');
    const before = await repo.get(entity, id);
    if (!before) fail('Work record unavailable.', 404);
    const caseRecord = entity === 'Investigation' ? before : await parent(before.investigation_id);
    assertCaseAccess(user, caseRecord);
    if (patch.expected_version !== (before.version ?? 0)) fail('This record changed. Reload before saving.', 409);
    if (!['Investigation', 'FollowUpAction', 'FieldVisit'].includes(entity))
      fail('Evidence and audit history are immutable. Add a correction note instead.', 403);
    if (entity === 'Investigation') {
      if (caseRecord.review_status === 'submitted') fail('The supervisor must return this case before edits.', 409);
      const status = choice(patch.status ?? before.status, [
        'open',
        'in_progress',
        'awaiting_evidence',
        'completed',
        'cancelled',
      ]);
      const reopening = ['completed', 'cancelled'].includes(before.status) && status !== before.status;
      if (reopening) {
        if (!isSupervisor(user)) fail('Only a supervisor can reopen a closed case.', 403);
        if (['completed', 'cancelled'].includes(status)) fail('Reopen the case before changing its status.');
        required(patch.reopen_reason, 'Reopen reason', 10);
      } else if (['completed', 'cancelled'].includes(before.status) && status === before.status) {
        fail('Reopen the case before editing it.', 409);
      }
      const fields = caseFields(patch),
        assigned = await assignment(patch, before, false);
      const after = { ...before, ...fields, ...assigned, status };
      if (status === 'completed') {
        if (before.review_status !== 'approved') fail('Independent supervisor approval is required before closure.', 409);
        if (
          CASE_FIELDS.some((k) => patch[k] !== undefined && patch[k] !== before[k]) ||
          Object.keys(assigned).length
        )
          fail('Save the changes and obtain a new review before closing.', 409);
        required(after.outcome_summary, 'Outcome and limitations', 20);
        const notes = await all('InvestigationNote', { investigation_id: id });
        if (!notes.length) fail('Record evidence before closing the case.', 409);
        if (!notes.some((note) => ['evidence', 'source_check', 'field_observation'].includes(note.note_type)))
          fail('Record at least one evidence, source-check or field-observation note before closing.', 409);
        const tasks = await all('FollowUpAction', { investigation_id: id }),
          visits = await all('FieldVisit', { investigation_id: id });
        if (
          tasks.some((t) => !['completed', 'cancelled'].includes(t.status)) ||
          visits.some((t) => !['completed', 'cancelled'].includes(t.status))
        )
          fail('Complete or cancel all visits and follow-up actions before closure.', 409);
        after.closed_date = now();
      } else {
        if (status === 'cancelled') required(patch.cancellation_reason, 'Cancellation reason', 10);
        after.closed_date = status === 'cancelled' ? now() : '';
        after.review_status = 'not_submitted';
        if (reopening) {
          after.reopened_date = now();
          after.reopened_by = user.id;
          after.reopen_reason = clean(patch.reopen_reason);
        }
      }
      return persist(
        entity,
        before,
        after,
        null,
        status !== before.status ? 'case_status_changed' : 'case_updated',
        [],
        patch.assignment_reason ?? patch.cancellation_reason ?? patch.reopen_reason ?? '',
      );
    }
    if (['completed', 'cancelled'].includes(caseRecord.status) || caseRecord.review_status === 'submitted')
      fail('This case is closed or under review.', 409);
    const status = choice(
      patch.status,
      entity === 'FieldVisit' ? ['scheduled', 'completed', 'cancelled'] : ['pending', 'in_progress', 'completed', 'cancelled'],
    );
    if (['completed', 'cancelled'].includes(before.status))
      fail('Finished work history cannot be overwritten. Create another task or visit.', 409);
    const after = { ...before, status };
    if (['completed', 'cancelled'].includes(status)) after.notes = required(patch.notes, 'Outcome or cancellation reason', 10);
    if (entity === 'FieldVisit' && patch.scheduled_for) after.scheduled_for = date(patch.scheduled_for);
    if (entity === 'FollowUpAction' && patch.due_date) after.due_date = date(patch.due_date);
    if (status === 'completed') after.completion_date = now().slice(0, 10);
    return persist(entity, before, after, caseRecord, `${entity.toLowerCase()}_updated`);
  }

  async function review(input) {
    staff();
    const before = await parent(input.case_id);
    if (input.expected_version !== (before.version ?? 0)) fail('The case changed. Reload before review.', 409);
    if (['completed', 'cancelled'].includes(before.status)) fail('Reopen this case before review.', 409);
    const decision = choice(input.decision, ['submit', 'approve', 'return']);
    const reason = required(input.reason, 'Review reason and limitations', 10);
    if (decision === 'submit') {
      if (before.review_status === 'submitted') fail('This case is already under review.', 409);
      required(before.outcome_summary, 'Outcome and limitations', 20);
      const notes = await all('InvestigationNote', { investigation_id: before.id });
      if (!notes.length) fail('Record evidence before submitting for review.', 409);
    } else {
      if (!isSupervisor(user)) fail('Only a supervisor can decide a review.', 403);
      if (
        same(before.created_by_id, user.id) ||
        same(before.created_by, user.email) ||
        same(before.assignee_id, user.id) ||
        same(before.assignee_email, user.email) ||
        same(before.submitted_by, user.id)
      )
        fail('An independent supervisor must review this case.', 403);
      if (before.review_status !== 'submitted') fail('Submit the case before a decision.', 409);
    }
    const decisionRecord = {
      id: `review-${crypto.randomUUID()}`,
      investigation_id: before.id,
      decision,
      reason,
      actor_id: user.id,
      actor_name: user.full_name ?? user.email,
      case_version: before.version ?? 0,
      created_date: now(),
    };
    const after = {
      ...before,
      review_status: { submit: 'submitted', approve: 'approved', return: 'returned' }[decision],
      ...(decision === 'submit' ? { submitted_by: user.id, submitted_date: now() } : { reviewed_by: user.id }),
      status: decision === 'return' ? 'awaiting_evidence' : before.status,
    };
    return persist(
      'Investigation',
      before,
      after,
      null,
      `review_${decision}`,
      [{ entity: 'ReviewDecision', id: decisionRecord.id, expected: -1, data: decisionRecord }],
      reason,
    );
  }

  async function attachEvidence(input) {
    staff();
    const caseRecord = await parent(input.investigation_id);
    if (['completed', 'cancelled'].includes(caseRecord.status) || caseRecord.review_status === 'submitted')
      fail('Reopen or return the case before adding evidence.', 409);
    const data = {
      id: `evidence-${crypto.randomUUID()}`,
      investigation_id: caseRecord.id,
      is_demo: caseRecord.is_demo ?? false,
      title: required(input.title, 'Evidence title', 3),
      evidence_type: choice(input.evidence_type ?? 'document_reference', EVIDENCE_TYPES),
      reference: safeReference(input.reference),
      description: clean(input.description ?? '', 4000),
      collected_on: date(input.collected_on),
      collected_by: user.full_name ?? user.email,
      collected_by_id: user.id,
      verification_status: 'unverified',
      storage: 'external_reference',
      binary_stored: false,
      scanning_status: 'not_available',
      limitations:
        'Only a reference and metadata are stored. No file content was uploaded, scanned or analysed by this application.',
    };
    return persist(
      'EvidenceAttachment',
      null,
      data,
      { ...caseRecord, review_status: 'not_submitted' },
      'evidence_attached',
    );
  }

  async function verifyEvidence(input) {
    staff();
    if (!isSupervisor(user)) fail('Only a supervisor can verify evidence.', 403);
    const attachment = await repo.get('EvidenceAttachment', ident(input.attachment_id));
    if (!attachment) fail('Evidence reference unavailable.', 404);
    const caseRecord = await parent(attachment.investigation_id);
    if (['completed', 'cancelled'].includes(caseRecord.status) || caseRecord.review_status === 'submitted')
      fail('Reopen or return the case before verifying evidence.', 409);
    const decision = choice(input.decision, ['verified', 'rejected']);
    const data = {
      id: `verification-${crypto.randomUUID()}`,
      investigation_id: caseRecord.id,
      attachment_id: attachment.id,
      decision,
      reason: required(input.reason, 'Verification reason and limitations', 10),
      actor_id: user.id,
      actor_name: user.full_name ?? user.email,
      created_date: now(),
      is_demo: caseRecord.is_demo ?? false,
    };
    return persist(
      'EvidenceVerification',
      null,
      data,
      { ...caseRecord, review_status: 'not_submitted' },
      `evidence_${decision}`,
    );
  }

  async function directory() {
    staff();
    const accounts = (await repo.directory()) ?? [];
    return accounts.map((account) => ({
      id: account.id,
      full_name: account.full_name,
      email: account.email,
      workspace_role: account.workspace_role,
    }));
  }

  async function findings(query = {}) {
    staff();
    if (typeof findingsProvider !== 'function') fail('Finding analysis is unavailable.', 503);
    const analysis = await findingsProvider();
    const cases = await all('Investigation');
    return paginateDatasetFindings(analysis, query, cases);
  }

  async function read(input) {
    authenticate();
    if (input.entity === 'Investigation') {
      staff();
      const rows = await all('Investigation', input.query ?? {});
      return rows.filter((item) => canReadCase(user, item));
    }
    staff();
    if (!WORK_ENTITIES.has(input.entity)) fail('Invalid workflow collection.');
    if (input.query?.investigation_id) await parent(input.query.investigation_id);
    const rows = await all(input.entity, input.query ?? {}),
      cases = await all('Investigation');
    const allowed = new Set(cases.filter((item) => canReadCase(user, item)).map((item) => item.id));
    return rows.filter((item) => allowed.has(item.investigation_id));
  }

  async function report(id) {
    const investigation = await parent(id),
      sections = {};
    for (const entity of [
      'InvestigationNote',
      'FollowUpAction',
      'FieldVisit',
      'EvidenceAttachment',
      'EvidenceVerification',
      'ReviewDecision',
      'AuditEvent',
    ])
      sections[entity] = await read({ entity, query: { investigation_id: id } });
    return {
      classification: 'Private staff report — authorized case members only',
      generated_at: now(),
      investigation,
      ...sections,
      limitations:
        'Statistical changes and climate estimates do not prove causation. Missing source fields remain unavailable. Exact farm coordinates and respondent files are not included.',
    };
  }

  return {
    create,
    createRiskHandoff: (request) => create(request, { riskHandoff: true }),
    update,
    review,
    attachEvidence,
    verifyEvidence,
    directory,
    findings,
    read,
    report,
    parent,
    assertStaff: staff,
  };
}
