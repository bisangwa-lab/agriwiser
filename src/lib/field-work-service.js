import { CROPS, DISTRICT_NAMES, FOLLOWUP_STATUSES, INVESTIGATION_PRIORITIES, INVESTIGATION_STATUSES, NOTE_TYPES } from "./constants.js";
import { normalizeRole } from "./rbac.js";

// Field work is distinct from published survey observations. These records are
// attributed to the authenticated officer, and source snapshots are immutable.
const WRITERS = new Set(["super_admin", "data_manager", "agricultural_officer", "field_investigator", "field_supervisor"]);
const INITIATORS = new Set([...WRITERS, "agricultural_analyst", "policy_maker"]);
const ENTITIES = new Set(["Investigation", "FollowUpAction", "InvestigationNote"]);
const FIELDS = {
  Investigation: {
    create: ["title", "description", "reason", "status", "priority", "crop", "district", "indicator", "period", "evidence", "questions", "assignee_name", "assignee_email", "due_date", "alert_id", "alert_title", "dataset_id", "dataset_name", "metric_snapshot", "calculation_snapshot", "is_demo"],
    update: ["title", "description", "reason", "status", "priority", "crop", "district", "indicator", "period", "questions", "assignee_name", "assignee_email", "due_date", "outcome_summary", "closed_date"],
  },
  FollowUpAction: {
    create: ["investigation_id", "title", "description", "owner", "due_date", "status", "is_demo"],
    update: ["status", "completion_date", "notes"],
  },
  InvestigationNote: {
    create: ["investigation_id", "note_type", "content", "observed_on", "author_name", "author_email", "is_demo"],
  },
};
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const keys = (value) => value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : null;
const requiredText = (value, name, max = 2000, min = 1) => {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) throw fail(name + " must be between " + min + " and " + max + " characters.");
  return value.trim();
};
const optionalText = (value, name, max = 2000) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > max) throw fail(name + " is too long or invalid.");
  return value.trim();
};
const validDate = (value, label) => {
  if (!value) return "";
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(value + "T00:00:00Z")) ||
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value) throw fail("Choose a valid " + label + ".");
  return value;
};
const among = (value, values, label, empty = true) => {
  if (empty && !value) return "";
  if (!values.includes(value)) throw fail("Choose a supported " + label + ".");
  return value;
};
const enumKeys = (values) => values.map(item => item.key);

export function validateFieldMutation(input) {
  if (!keys(input) || Object.keys(input).some(key => !["entity", "operation", "id", "data"].includes(key))) throw fail("Invalid field-work request.");
  const { entity, operation, id, data } = input;
  if (!ENTITIES.has(entity) || !["create", "update"].includes(operation) || !FIELDS[entity]?.[operation]) throw fail("This field-work operation is not available.");
  if (!keys(data) || Object.keys(data).some(key => !FIELDS[entity][operation].includes(key))) throw fail("Unexpected field-work properties.");
  if (operation === "update" && (typeof id !== "string" || !/^[\w.-]{1,240}$/.test(id))) throw fail("Invalid record identifier.");
  if (operation === "create" && id !== undefined) throw fail("The server assigns record identifiers.");
  return { entity, operation, id, data };
}
export function assertFieldWriter(user, entity, operation) {
  if (!user) throw fail("Sign in to update field work.", 401);
  const permitted = entity === "Investigation" && operation === "create" ? INITIATORS : WRITERS;
  if (!permitted.has(normalizeRole(user))) throw fail("Your role cannot change field investigations.", 403);
}
const emptyIf = (value) => value ?? "";
const textFields = (data, names, max = 2000) => Object.fromEntries(names.map(name => [name, optionalText(data[name], name, max)]));
const getStored = async (db, entity, id) => {
  const row = await db.prepare("SELECT data FROM local_records WHERE entity=? AND id=?").bind(entity, id).first();
  if (!row) throw fail("This field-work record was not found.", 404);
  return { original: row.data, record: JSON.parse(row.data) };
};
async function resolveAssignee(db, email) {
  const normalized = optionalText(email, "Assigned officer email", 254).toLowerCase();
  if (!normalized) return { assignee_name: "", assignee_email: "" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw fail("Enter a valid officer email address.");
  const officer = await db.prepare("SELECT full_name,email,workspace_role,active FROM local_users WHERE email=?")
    .bind(normalized).first();
  if (!officer?.active || !WRITERS.has(officer.workspace_role)) throw fail("Assign an existing, active field-work account. Check the officer email.");
  return { assignee_name: officer.full_name || officer.email, assignee_email: officer.email };
}
async function parentRecord(db, id) {
  requiredText(id, "Investigation reference", 240);
  return (await getStored(db, "Investigation", id)).record;
}
export async function mutateFieldWork(db, user, input, now = () => new Date().toISOString()) {
  const { entity, operation, id, data } = validateFieldMutation(input);
  assertFieldWriter(user, entity, operation);
  const timestamp = now();

  if (operation === "create") {
    let record;
    if (entity === "Investigation") {
      const title = requiredText(data.title, "Investigation title", 180, 5);
      const reason = requiredText(data.reason, "Reason for investigation", 2000, 10);
      const alert = data.alert_id ? (await getStored(db, "Alert", requiredText(data.alert_id, "Alert reference", 240))).record : null;
      if (data.status && data.status !== "open") throw fail("New investigations begin as open.");
      if (alert) {
        for (const field of ["crop", "district", "indicator", "period"]) {
          if (alert[field] && data[field] && alert[field] !== data[field]) {
            throw fail("The linked alert's source scope cannot be changed. Open a separate investigation for a different scope.");
          }
        }
      }
      const assignee = await resolveAssignee(db, data.assignee_email);
      record = {
        id: crypto.randomUUID(), title, reason,
        ...textFields(data, ["description", "questions", "evidence"], 4000),
        ...assignee,
        crop: among(alert?.crop ?? data.crop, CROPS, "crop"),
        district: among(alert?.district ?? data.district, DISTRICT_NAMES, "district"),
        indicator: among(alert?.indicator ?? data.indicator, ["production", "harvested_area", "yield"], "indicator"),
        period: optionalText(alert?.period ?? data.period, "Reporting period", 180),
        priority: among(data.priority ?? "standard", enumKeys(INVESTIGATION_PRIORITIES), "priority", false),
        due_date: validDate(data.due_date, "due date"),
        status: "open", outcome_summary: "", closed_date: "",
        alert_id: alert?.id ?? "", alert_title: alert?.title ?? "",
        dataset_id: alert?.dataset_id ?? "", dataset_name: alert?.dataset_name ?? "",
        metric_snapshot: alert?.evidence_snapshot ?? "",
        calculation_snapshot: alert ? "Source alert values and rule are preserved in metric_snapshot." : "",
        is_demo: Boolean(alert?.is_demo || alert?.quality_status === "demonstration") || (data.is_demo === true && !alert),
        requested_by: user.email, requested_by_name: user.full_name || user.email,
        created_date: timestamp, updated_date: timestamp,
      };
    } else if (entity === "InvestigationNote") {
      const parent = await parentRecord(db, data.investigation_id);
      record = {
        id: crypto.randomUUID(), investigation_id: parent.id,
        content: requiredText(data.content, "Observation", 4000, 10),
        note_type: among(data.note_type, enumKeys(NOTE_TYPES), "observation type", false),
        observed_on: validDate(data.observed_on, "observation date") || timestamp.slice(0, 10),
        author_name: user.full_name || user.email, author_email: user.email,
        is_demo: Boolean(parent.is_demo), created_date: timestamp,
      };
    } else {
      const parent = await parentRecord(db, data.investigation_id);
      record = {
        id: crypto.randomUUID(), investigation_id: parent.id,
        title: requiredText(data.title, "Action", 180, 5),
        description: optionalText(data.description, "Description", 2000),
        owner: requiredText(data.owner, "Action owner", 150, 2),
        due_date: validDate(data.due_date, "action due date"),
        status: "pending", completion_date: "", notes: "",
        is_demo: Boolean(parent.is_demo), created_date: timestamp, updated_date: timestamp,
      };
      if (!record.due_date) throw fail("Give the follow-up action a due date.");
      if (data.status && data.status !== "pending") throw fail("New actions begin as pending.");
    }
    await db.prepare("INSERT INTO local_records(entity,id,data,published) VALUES(?,?,?,0)")
      .bind(entity, record.id, JSON.stringify(record)).run();
    return record;
  }

  const { original, record: stored } = await getStored(db, entity, id);
  let record;
  if (entity === "Investigation") {
    const nextStatus = among(data.status ?? stored.status, enumKeys(INVESTIGATION_STATUSES), "investigation status", false);
    const summary = optionalText(data.outcome_summary ?? stored.outcome_summary, "Outcome", 4000);
    if (["completed", "cancelled"].includes(nextStatus) && summary.length < 15) throw fail("Write an outcome or cancellation reason of at least 15 characters before closing an investigation.");
    const assignee = await resolveAssignee(db, data.assignee_email ?? stored.assignee_email);
    record = {
      ...stored,
      title: requiredText(data.title ?? stored.title, "Investigation title", 180, 5),
      reason: requiredText(data.reason ?? stored.reason, "Reason for investigation", 2000, 10),
      ...textFields({ ...stored, ...data }, ["description", "questions"], 4000),
      ...textFields({ ...stored, ...data }, ["period"], 180), ...assignee,
      crop: among(emptyIf(data.crop ?? stored.crop), CROPS, "crop"),
      district: among(emptyIf(data.district ?? stored.district), DISTRICT_NAMES, "district"),
      indicator: among(emptyIf(data.indicator ?? stored.indicator), ["production", "harvested_area", "yield"], "indicator"),
      priority: among(data.priority ?? stored.priority ?? "standard", enumKeys(INVESTIGATION_PRIORITIES), "priority", false),
      due_date: validDate(data.due_date ?? stored.due_date, "due date"),
      status: nextStatus, outcome_summary: summary,
      closed_date: nextStatus === "completed" ? (stored.status === "completed" && stored.closed_date ? stored.closed_date : timestamp) : "",
      updated_date: timestamp,
    };
    // Never update original source evidence, snapshots, creator, or identifiers.
  } else {
    const status = among(data.status ?? stored.status, enumKeys(FOLLOWUP_STATUSES), "follow-up status", false);
    const notes = optionalText(data.notes ?? stored.notes, "Action outcome", 2000);
    if (["completed", "cancelled"].includes(status) && notes.length < 10) throw fail("Record what was done or why the action was cancelled (at least 10 characters).");
    record = {
      ...stored, status, notes,
      completion_date: status === "completed" ? (stored.completion_date || timestamp.slice(0, 10)) : "",
      updated_date: timestamp,
    };
  }
  const outcome = await db.prepare("UPDATE local_records SET data=? WHERE entity=? AND id=? AND data=?")
    .bind(JSON.stringify(record), entity, id, original).run();
  if ((outcome.meta?.changes ?? outcome.changes ?? 0) !== 1) throw fail("Someone updated this record. Refresh before saving your changes.", 409);
  return record;
}
