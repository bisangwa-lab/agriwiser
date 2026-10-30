import test from "node:test";
import assert from "node:assert/strict";
import { canReadCase, createFieldWorkflow, isSupervisor } from "../src/lib/field-workflow.js";
import { normalizeRole } from "../src/lib/rbac.js";

test("normalizeRole and isSupervisor work correctly for test users", () => {
  const OFFICER = { id: "user-officer", email: "officer@example.rw", full_name: "Officer One", workspace_role: "agricultural_officer" };
  const SUPERVISOR = { id: "user-supervisor", email: "supervisor@example.rw", full_name: "Supervisor One", workspace_role: "field_supervisor" };
  const OTHER_OFFICER = { id: "user-other", email: "other@example.rw", full_name: "Officer Two", workspace_role: "field_investigator" };
  
  assert.equal(normalizeRole(OFFICER), "agricultural_officer");
  assert.equal(normalizeRole(SUPERVISOR), "field_supervisor");
  assert.equal(normalizeRole(OTHER_OFFICER), "field_investigator");
  assert.equal(isSupervisor(OFFICER), false);
  assert.equal(isSupervisor(SUPERVISOR), true);
  assert.equal(isSupervisor(OTHER_OFFICER), false);
});

const OFFICER = {
  id: "user-officer",
  email: "officer@example.rw",
  full_name: "Officer One",
  workspace_role: "agricultural_officer",
};
const OTHER_OFFICER = {
  id: "user-other",
  email: "other@example.rw",
  full_name: "Officer Two",
  workspace_role: "field_investigator",
};
const SUPERVISOR = {
  id: "user-supervisor",
  email: "supervisor@example.rw",
  full_name: "Supervisor One",
  workspace_role: "field_supervisor",
};
const CREATOR_SUPERVISOR = {
  id: "user-supervisor-creator",
  email: "creator.supervisor@example.rw",
  full_name: "Creating Supervisor",
  workspace_role: "field_supervisor",
};
const VIEWER = { id: "user-viewer", email: "viewer@example.rw", full_name: "Viewer", workspace_role: "public_viewer" };

test("case read access follows staff role scope", () => {
  const item = { id: "case-1", assignee_id: OTHER_OFFICER.id };
  assert.equal(canReadCase(OFFICER, item), false);
  assert.equal(canReadCase(SUPERVISOR, item), true);
  for (const role of ["agricultural_analyst", "policy_maker", "data_manager"]) {
    assert.equal(canReadCase({ id: `user-${role}`, workspace_role: role }, item), true);
  }
  assert.equal(canReadCase(VIEWER, item), false);
});

const DIRECTORY = [OFFICER, OTHER_OFFICER, SUPERVISOR, CREATOR_SUPERVISOR].map((account) => ({
  id: account.id,
  email: account.email,
  full_name: account.full_name,
  workspace_role: account.workspace_role,
}));

function fakeRepository() {
  const store = new Map();
  const key = (entity, id) => `${entity}:${id}`;
  const read = (entity, id) => store.get(key(entity, id)) ?? null;
  let clock = 0;
  return {
    store,
    read,
    now: () => new Date(Date.UTC(2026, 9, 30, 8, clock++)).toISOString(),
    get: async (entity, id) => read(entity, id),
    list: async (entity, query = {}, cursor = "0") => {
      const rows = [...store.entries()]
        .filter(([entryKey]) => entryKey.startsWith(`${entity}:`))
        .map(([, value]) => value)
        .filter((row) =>
          Object.entries(query ?? {}).every(([field, value]) => {
            if (field === "measure_group") return true;
            return row[field] === value;
          }),
        )
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
      const offset = Number(cursor);
      const items = rows.slice(offset, offset + 1000);
      const has_more = rows.length > offset + 1000;
      return { items, has_more, next_cursor: has_more ? String(offset + 1000) : null };
    },
    account: async (identity) =>
      DIRECTORY.find((account) => account.id === identity || account.email.toLowerCase() === String(identity).toLowerCase()) ??
      null,
    directory: async () => DIRECTORY,
    commit: async (changes) => {
      const pending = [];
      for (const change of changes) {
        const previous = read(change.entity, change.id);
        const expected = Number(change.expected);
        if (expected === -1 && previous) throw Object.assign(new Error("conflict"), { status: 409 });
        if (expected >= 0 && (!previous || Number(previous.version ?? 0) !== expected))
          throw Object.assign(new Error("conflict"), { status: 409 });
        if (["AuditEvent", "ReviewDecision", "InvestigationNote", "EvidenceAttachment", "EvidenceVerification"].includes(change.entity) && previous)
          throw Object.assign(new Error("immutable"), { status: 409 });
        pending.push(change);
      }
      for (const change of pending) store.set(key(change.entity, change.id), structuredClone(change.data));
    },
  };
}

function findingGroup() {
  const source = (id) => ({ id, is_demo: false, dataset_id: "ds-nisr", dataset_name: "NISR Seasonal Survey" });
  const finding = {
    id: "finding-1",
    rule_id: "YOY-CHANGE",
    rule_version: 2,
    finding_type: "temporal_comparison",
    condition_type: "yield_change",
    indicator: "yield",
    unit: "t/ha",
    current_period: "2024 Season A",
    baseline_period: "2023 Season A",
    current_value: 1.2,
    baseline_value: 2.4,
    absolute_change: -1.2,
    percentage_change: -50,
    comparison_state: "comparable",
    validation_status: "source_validated",
    validation_label: "Validated against source",
    calculation_used: "Derived yield = production ÷ harvested area",
    evidence_limitations: [],
    source_reference: "Table 18",
    dataset_id: "ds-nisr",
    dataset_name: "NISR Seasonal Survey",
    source: { current: source("obs-current"), baseline: source("obs-baseline") },
  };
  return {
    id: "group-1",
    district: "Gasabo",
    crop: "Maize",
    current_period: "2024 Season A",
    validation_status: "source_validated",
    findings: [finding],
    primary_finding: finding,
  };
}

function setup({ user = OFFICER, groups = [findingGroup()] } = {}) {
  const repo = fakeRepository();
  const workflow = createFieldWorkflow(repo, user, {
    now: repo.now,
    findingsProvider: async () => ({ groups }),
  });
  return { repo, workflow };
}

async function createCase(workflow, overrides = {}) {
  return workflow.create({
    entity: "Investigation",
    record: {
      title: "Investigate the reported yield change",
      reason: "A published year-on-year change needs field verification.",
      district: "Gasabo",
      crop: "Maize",
      priority: "standard",
      idempotency_key: "key-1",
      finding_group_id: "group-1",
      ...overrides,
    },
  });
}

async function addEvidenceNote(workflow, id, content = "Visited two sectors and checked cooperative records.") {
  return workflow.create({
    entity: "InvestigationNote",
    record: {
      investigation_id: id,
      note_type: "field_observation",
      source_class: "field_observation",
      observed_on: "2026-10-20",
      content,
    },
  });
}

async function setOutcome(workflow, id, outcome = "Field verification found a reporting change, not a confirmed production loss.") {
  const current = await workflow.parent(id);
  return workflow.update({
    entity: "Investigation",
    id,
    patch: { expected_version: current.version, outcome_summary: outcome },
  });
}

test("workflow rejects anonymous and non-field roles at the backend", async () => {
  const anonymous = createFieldWorkflow(fakeRepository(), null, { findingsProvider: async () => ({ groups: [] }) });
  await assert.rejects(
    anonymous.create({ entity: "Investigation", record: {} }),
    (error) => error.status === 401,
  );

  const viewer = createFieldWorkflow(fakeRepository(), VIEWER, { findingsProvider: async () => ({ groups: [] }) });
  await assert.rejects(
    viewer.create({ entity: "Investigation", record: {} }),
    (error) => error.status === 403,
  );
  await assert.rejects(viewer.findings(), (error) => error.status === 403);
});

test("a case is linked to the real finding snapshot and created idempotently", async () => {
  const { workflow } = setup();
  const created = await createCase(workflow);
  assert.equal(created.finding_group_id, "group-1");
  assert.equal(created.finding_ids[0], "finding-1");
  assert.equal(created.provenance_status, "source_linked");
  assert.equal(created.is_demo, false);
  assert.equal(created.source_snapshot.schema_version, 2);
  assert.equal(created.source_snapshot.validation_status, "source_validated");
  assert.equal(created.source_snapshot.records.length, 2);
  assert.match(created.calculation_snapshot, /Derived yield/);
  assert.equal(created.assignee_id, OFFICER.id);

  const again = await createCase(workflow);
  assert.equal(again.id, created.id);
});

test("case scope must match its finding and missing findings fail closed", async () => {
  const { workflow } = setup();
  await assert.rejects(
    createCase(workflow, { district: "Huye" }),
    (error) => error.status === 400 && /scope must match/.test(error.message),
  );
  await assert.rejects(
    createCase(workflow, { finding_group_id: "missing-group" }),
    (error) => error.status === 404,
  );
});

test("officers cannot read or modify another officer's case; supervisors can", async () => {
  const { workflow, repo } = setup();
  const created = await createCase(workflow);

  const other = createFieldWorkflow(repo, OTHER_OFFICER, { now: repo.now, findingsProvider: async () => ({ groups: [] }) });
  const visible = await other.read({ entity: "Investigation" });
  assert.equal(visible.length, 0);
  await assert.rejects(
    other.update({ entity: "Investigation", id: created.id, patch: { expected_version: created.version, title: "Hijacked" } }),
    (error) => error.status === 403,
  );

  const supervisor = createFieldWorkflow(repo, SUPERVISOR, { now: repo.now, findingsProvider: async () => ({ groups: [] }) });
  const supervised = await supervisor.read({ entity: "Investigation" });
  assert.equal(supervised.length, 1);
});

test("stale versions are rejected and the stored record is unchanged", async () => {
  const { workflow, repo } = setup();
  const created = await createCase(workflow);
  const saved = await setOutcome(workflow, created.id, "First outcome summary with enough detail.");
  await assert.rejects(
    workflow.update({
      entity: "Investigation",
      id: created.id,
      patch: { expected_version: created.version, title: "Stale overwrite" },
    }),
    (error) => error.status === 409,
  );
  assert.equal(repo.read("Investigation", created.id).title, created.title);
  assert.equal(repo.read("Investigation", created.id).version, saved.version);
});

test("only supervisors may reassign, and the reason is required", async () => {
  const { workflow, repo } = setup();
  const created = await createCase(workflow);
  await assert.rejects(
    workflow.update({
      entity: "Investigation",
      id: created.id,
      patch: { expected_version: created.version, assignee_id: OTHER_OFFICER.id, assignment_reason: "Workload balance" },
    }),
    (error) => error.status === 403,
  );

  const supervisor = createFieldWorkflow(repo, SUPERVISOR, { now: repo.now, findingsProvider: async () => ({ groups: [] }) });
  await assert.rejects(
    supervisor.update({
      entity: "Investigation",
      id: created.id,
      patch: { expected_version: created.version, assignee_id: OTHER_OFFICER.id },
    }),
    (error) => error.status === 400 && /Reassignment reason/.test(error.message),
  );
  const assigned = await supervisor.update({
    entity: "Investigation",
    id: created.id,
    patch: { expected_version: created.version, assignee_id: OTHER_OFFICER.id, assignment_reason: "Workload balance" },
  });
  assert.equal(assigned.assignee_id, OTHER_OFFICER.id);
  assert.equal(assigned.assignee_email, OTHER_OFFICER.email);
});

test("submission requires an outcome and evidence, and approval requires an independent supervisor", async () => {
  const { workflow, repo } = setup();
  const created = await createCase(workflow);
  await assert.rejects(
    workflow.review({ case_id: created.id, expected_version: created.version, decision: "submit", reason: "Ready for review" }),
    (error) => error.status === 400 && /Outcome/.test(error.message),
  );

  await addEvidenceNote(workflow, created.id);
  const withOutcome = await setOutcome(workflow, created.id);
  await assert.rejects(
    workflow.review({ case_id: created.id, expected_version: withOutcome.version, decision: "approve", reason: "Approved after check" }),
    (error) => error.status === 403,
  );

  const submitted = await workflow.review({
    case_id: created.id,
    expected_version: withOutcome.version,
    decision: "submit",
    reason: "Documentation and field evidence are complete.",
  });
  assert.equal(submitted.review_status, "submitted");

  await assert.rejects(
    workflow.review({
      case_id: created.id,
      expected_version: submitted.version,
      decision: "approve",
      reason: "Self approval is not allowed",
    }),
    (error) => error.status === 403,
  );

  const supervisor = createFieldWorkflow(repo, SUPERVISOR, { now: repo.now, findingsProvider: async () => ({ groups: [] }) });
  const approved = await supervisor.review({
    case_id: created.id,
    expected_version: submitted.version,
    decision: "approve",
    reason: "Independent review of evidence and calculations.",
  });
  assert.equal(approved.review_status, "approved");
  const decisions = await supervisor.read({ entity: "ReviewDecision", query: { investigation_id: created.id } });
  assert.equal(decisions.length, 2);
});

test("closure is gated on approval, recorded evidence, and finished follow-up work", async () => {
  const { workflow, repo } = setup();
  const created = await createCase(workflow);
  await addEvidenceNote(workflow, created.id);

  // Add follow-up task BEFORE setting outcome and submission
  const task = await workflow.create({
    entity: "FollowUpAction",
    record: {
      investigation_id: created.id,
      title: "Confirm cooperative delivery records",
      description: "Check the delivery log with the sector cooperative.",
      owner_id: OFFICER.id,
      due_date: "2026-11-15",
    },
  });

  const withOutcome = await setOutcome(workflow, created.id);

  await assert.rejects(
    workflow.update({
      entity: "Investigation",
      id: created.id,
      patch: { expected_version: withOutcome.version, status: "completed" },
    }),
    (error) => error.status === 409 && /approval/.test(error.message),
  );

  const submitted = await workflow.review({
    case_id: created.id,
    expected_version: withOutcome.version,
    decision: "submit",
    reason: "Ready for independent approval.",
  });
  const supervisor = createFieldWorkflow(repo, SUPERVISOR, { now: repo.now, findingsProvider: async () => ({ groups: [] }) });
  const approved = await supervisor.review({
    case_id: created.id,
    expected_version: submitted.version,
    decision: "approve",
    reason: "Approved after reviewing the evidence.",
  });

  // Cannot close while task is open
  await assert.rejects(
    workflow.update({
      entity: "Investigation",
      id: created.id,
      patch: { expected_version: approved.version, status: "completed" },
    }),
    (error) => error.status === 409 && /Complete or cancel/.test(error.message),
  );

  // Close the task
  const closedTask = await workflow.update({
    entity: "FollowUpAction",
    id: task.id,
    patch: {
      expected_version: task.version,
      status: "completed",
      notes: "Delivery log checked; the reported quantity was revised by the cooperative.",
    },
  });
  assert.equal(closedTask.status, "completed");

  // Now can close investigation
  const current = await workflow.parent(created.id);
  const closed = await workflow.update({
    entity: "Investigation",
    id: created.id,
    patch: { expected_version: current.version, status: "completed" },
  });
  assert.equal(closed.status, "completed");
  assert.ok(closed.closed_date);
});

test("follow-up actions must belong to the case officer or the current actor", async () => {
  const { workflow } = setup();
  const created = await createCase(workflow);
  await assert.rejects(
    workflow.create({
      entity: "FollowUpAction",
      record: {
        investigation_id: created.id,
        title: "Unrelated assignment",
        owner_id: OTHER_OFFICER.id,
        due_date: "2026-11-15",
      },
    }),
    (error) => error.status === 400 && /case officer|Reassign/.test(error.message),
  );
  await assert.rejects(
    workflow.create({
      entity: "FollowUpAction",
      record: { investigation_id: created.id, title: "No deadline", owner_id: OFFICER.id, due_date: "" },
    }),
    (error) => error.status === 400 && /calendar date/.test(error.message),
  );
});

test("evidence stores references and metadata only, and only a supervisor can verify", async () => {
  const { workflow, repo } = setup();
  const created = await createCase(workflow);
  await assert.rejects(
    workflow.attachEvidence({
      investigation_id: created.id,
      title: "Executable reference",
      reference: "javascript:alert(1)",
      collected_on: "2026-10-20",
    }),
    (error) => error.status === 400,
  );

  const evidence = await workflow.attachEvidence({
    investigation_id: created.id,
    title: "District agronomist note",
    evidence_type: "document_reference",
    reference: "MINAGRI/2026/014",
    description: "Signed visit note held by the district office.",
    collected_on: "2026-10-20",
  });
  assert.equal(evidence.binary_stored, false);
  assert.equal(evidence.storage, "external_reference");
  assert.equal(evidence.scanning_status, "not_available");
  assert.match(evidence.limitations, /No file content/);

  await assert.rejects(
    workflow.verifyEvidence({ attachment_id: evidence.id, decision: "verified", reason: "Checked against the original" }),
    (error) => error.status === 403,
  );

  const supervisor = createFieldWorkflow(repo, SUPERVISOR, { now: repo.now, findingsProvider: async () => ({ groups: [] }) });
  const verification = await supervisor.verifyEvidence({
    attachment_id: evidence.id,
    decision: "verified",
    reason: "Compared with the signed original at the district office.",
  });
  assert.equal(verification.decision, "verified");
  assert.equal(verification.attachment_id, evidence.id);
});

test("closed cases can only be reopened by a supervisor with a recorded reason", async () => {
  const { workflow, repo } = setup();
  const created = await createCase(workflow);
  await addEvidenceNote(workflow, created.id);
  const withOutcome = await setOutcome(workflow, created.id);
  const submitted = await workflow.review({
    case_id: created.id,
    expected_version: withOutcome.version,
    decision: "submit",
    reason: "Ready for independent approval.",
  });
  const supervisor = createFieldWorkflow(repo, SUPERVISOR, { now: repo.now, findingsProvider: async () => ({ groups: [] }) });
  const approved = await supervisor.review({
    case_id: created.id,
    expected_version: submitted.version,
    decision: "approve",
    reason: "Approved after independent review.",
  });
  const closed = await workflow.update({
    entity: "Investigation",
    id: created.id,
    patch: { expected_version: approved.version, status: "completed" },
  });

  await assert.rejects(
    workflow.update({
      entity: "Investigation",
      id: created.id,
      patch: { expected_version: closed.version, status: "in_progress", reopen_reason: "New evidence arrived" },
    }),
    (error) => error.status === 403,
  );
  await assert.rejects(
    supervisor.update({
      entity: "Investigation",
      id: created.id,
      patch: { expected_version: closed.version, status: "in_progress" },
    }),
    (error) => error.status === 400 && /Reopen reason/.test(error.message),
  );
  const reopened = await supervisor.update({
    entity: "Investigation",
    id: created.id,
    patch: {
      expected_version: closed.version,
      status: "in_progress",
      reopen_reason: "A corrected source table was published after closure.",
    },
  });
  assert.equal(reopened.status, "in_progress");
  assert.equal(reopened.review_status, "not_submitted");
  assert.match(reopened.reopen_reason, /corrected source/);
  assert.ok(reopened.reopened_date);
});

test("the authorized report contains every case section and audit history", async () => {
  const { workflow, repo } = setup();
  const created = await createCase(workflow);
  await addEvidenceNote(workflow, created.id);
  await workflow.attachEvidence({
    investigation_id: created.id,
    title: "Source excerpt",
    reference: "https://example.rw/source/table-18",
    collected_on: "2026-10-20",
  });
  for (const entity of ["InvestigationNote", "EvidenceAttachment", "ReviewDecision", "AuditEvent", "FieldVisit", "FollowUpAction", "EvidenceVerification"]) {
    assert.ok(Array.isArray((await workflow.read({ entity, query: { investigation_id: created.id } }))), `${entity} must be readable`);
  }
  const report = await workflow.report(created.id);
  assert.match(report.classification, /Private staff report/);
  assert.equal(report.investigation.id, created.id);
  assert.equal(report.InvestigationNote.length, 1);
  assert.equal(report.EvidenceAttachment.length, 1);
  assert.ok(report.AuditEvent.length >= 3);
  assert.match(report.limitations, /do not prove causation/);

  const other = createFieldWorkflow(repo, OTHER_OFFICER, { now: repo.now, findingsProvider: async () => ({ groups: [] }) });
  await assert.rejects(other.report(created.id), (error) => error.status === 403);
});
