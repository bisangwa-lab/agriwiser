import { normalizeRole } from "./rbac.js";

const READABLE = new Set(["Dataset", "AgriculturalObservation", "ImportLog", "SourceArchive", "SourceTableIndex", "SourceTable", "SourceReportIndex", "SourceReportPage", "SurveyFile", "Alert", "Investigation", "FollowUpAction", "InvestigationNote", "ReportFinding", "FieldVisit", "ReviewDecision", "AuditEvent", "EvidenceAttachment"]);
const FIELDS = new Set(["id", "domain", "crop", "geography", "season", "year", "indicator", "dataset_id", "investigation_id", "status", "aggregation_level", "family", "topic", "archive", "report_id", "measure_group"]);
const SORTS = new Set(["id", "created_date", "updated_date", "completed_date", "generated_date", "due_date", "year", "name"]);
const MANAGERS = new Set(["super_admin", "data_manager"]);

export function validateLocalRead(input) {
  if (!input || typeof input !== "object" || !READABLE.has(input.entity)) throw Object.assign(new Error("Unknown local collection."), { status: 400 });
  const query = input.query ?? {};
  if (!query || typeof query !== "object" || Array.isArray(query) || Object.keys(query).length > FIELDS.size) throw new Error("Invalid record filters.");
  for (const [key, value] of Object.entries(query)) {
    if (!FIELDS.has(key) || !["string", "number"].includes(typeof value) || String(value).length > 200) throw new Error("Invalid record filter.");
    if (key === "year" && (!Number.isInteger(Number(value)) || Number(value) < 1900 || Number(value) > 2100)) throw new Error("Invalid reporting year.");
    if (key === "measure_group" && value !== "production_area") throw new Error("Invalid measure group.");
  }
  const options = input.options ?? {};
  const sort = options.sort ?? "id";
  if (typeof sort !== "string" || !SORTS.has(sort.replace(/^-/, ""))) throw new Error("Invalid record ordering.");
  const limit = options.limit ?? 1000;
  if (!Number.isInteger(limit) || limit < 1 || limit > 2000) throw new Error("Choose a page size from 1 to 2000.");
  const cursor = options.cursor ?? "0";
  const view = options.view ?? "full";
  if (!["full", "metrics"].includes(view) || (view === "metrics" && input.entity !== "AgriculturalObservation")) throw new Error("Invalid record view.");
  if (!/^\d{1,7}$/.test(String(cursor))) throw new Error("Invalid page cursor.");
  return { entity: input.entity, query, options: { sort, limit, cursor: String(cursor), view } };
}

export function assertLocalReadAccess(user, entity) {
  if (!user) throw Object.assign(new Error("Sign in to read local data."), { status: 401 });
  const role = normalizeRole(user);
  const manager = MANAGERS.has(role);
  if (["ImportLog", "SourceArchive", "SurveyFile"].includes(entity) && !manager) throw Object.assign(new Error("This collection requires an administration role."), { status: 403 });
  if (["Investigation", "FollowUpAction", "InvestigationNote", "ReportFinding"].includes(entity) && !manager && !["agricultural_analyst", "policy_maker", "agricultural_officer", "field_investigator", "field_supervisor"].includes(role)) throw Object.assign(new Error("Private work records are unavailable to this account."), { status: 403 });
  if (entity === "Alert" && !manager && !["agricultural_analyst", "policy_maker", "agricultural_officer", "field_investigator", "field_supervisor"].includes(role)) throw Object.assign(new Error("Review signals are unavailable to this account."), { status: 403 });
}

export async function readLocalRecords(db, user, input) {
  const { entity, query, options } = validateLocalRead(input);
  assertLocalReadAccess(user, entity);
  const conditions = ["entity = ?"];
  const values = [entity];
  // The web application serves approved statistical aggregates only. Archive
  // metadata is restricted to administration; respondent files never enter D1.
  if (["Dataset", "AgriculturalObservation", "SourceTableIndex", "SourceTable", "SourceReportIndex", "SourceReportPage"].includes(entity)) conditions.push("published = 1");
  for (const [key, value] of Object.entries(query)) {
    if (key === "measure_group") { conditions.push("json_extract(data,'$.indicator') IN ('production','harvested_area')"); continue; }
    conditions.push(key === "id" ? "id = ?" : "json_extract(data, '$." + key + "') = ?");
    values.push(key === "year" ? Number(value) : value);
  }
  const field = options.sort.replace(/^-/, "");
  const direction = options.sort.startsWith("-") ? "DESC" : "ASC";
  const order = field === "id" ? "id" : "json_extract(data, '$." + field + "')";
  const offset = Number(options.cursor);
  const result = await db.prepare("SELECT data FROM local_records WHERE " + conditions.join(" AND ") + " ORDER BY " + order + " " + direction + ", id ASC LIMIT ? OFFSET ?")
    .bind(...values, options.limit + 1, offset).all();
  const has_more = result.results.length > options.limit;
  const metricFields = ["id","domain","crop","geography","season","year","indicator","value","unit","dataset_id","is_demo","quality_status","quality_flags","aggregation_level"];
  return { items: result.results.slice(0, options.limit).map((row) => {
    const data = JSON.parse(row.data);
    return options.view === "metrics" ? Object.fromEntries(metricFields.map(key=>[key,data[key]])) : data;
  }), has_more, next_cursor: has_more ? String(offset + options.limit) : null };
}

export function assertLocalWriteAccess(user, entity) {
  if (!user) throw Object.assign(new Error("Sign in to modify records."), { status: 401 });
  const role = normalizeRole(user);
  const isManager = MANAGERS.has(role);
  const isStaff = isManager || ["agricultural_analyst", "policy_maker", "agricultural_officer", "field_investigator", "field_supervisor"].includes(role);

  // Official datasets and archive tables are strictly managed by super_admin / data_manager
  if (["Dataset", "AgriculturalObservation", "ImportLog", "SourceArchive", "SourceTableIndex", "SourceTable", "SourceReportIndex", "SourceReportPage", "SurveyFile"].includes(entity)) {
    if (!isManager) {
      throw Object.assign(new Error("Only data managers and administrators can modify official datasets and import logs."), { status: 403 });
    }
    return;
  }

  // Work items (investigations, follow-up actions, notes, alert statuses) can be modified by authorized staff
  if (["Investigation", "FollowUpAction", "InvestigationNote", "Alert", "ReportFinding"].includes(entity)) {
    if (!isStaff) {
      throw Object.assign(new Error("Your account role is not authorized to create or update field work records."), { status: 403 });
    }
    return;
  }

  throw Object.assign(new Error("Unauthorized entity write."), { status: 403 });
}

export async function createLocalRecord(db, user, { entity, record }) {
  if (!record || typeof record !== "object") throw new Error("Invalid record payload.");
  assertLocalWriteAccess(user, entity);

  const now = new Date().toISOString();
  const id = record.id || `${entity.toLowerCase()}-${crypto.randomUUID()}`;
  const isOfficial = ["Dataset", "AgriculturalObservation"].includes(entity);
  const published = isOfficial ? 1 : 0;

  const dataToSave = {
    ...record,
    id,
    created_date: record.created_date || now,
    updated_date: now,
    created_by: user.email ?? user.id,
  };

  await db.prepare("INSERT INTO local_records (entity, id, data, published) VALUES (?, ?, ?, ?)")
    .bind(entity, id, JSON.stringify(dataToSave), published)
    .run();

  return dataToSave;
}

export async function updateLocalRecord(db, user, { entity, id, patch }) {
  if (!id || typeof id !== "string") throw new Error("Missing record identifier.");
  if (!patch || typeof patch !== "object") throw new Error("Invalid update patch.");
  assertLocalWriteAccess(user, entity);

  const row = await db.prepare("SELECT data FROM local_records WHERE entity = ? AND id = ?")
    .bind(entity, id)
    .first();

  if (!row) {
    throw Object.assign(new Error(`No ${entity} record found with id ${id}`), { status: 404 });
  }

  const existing = JSON.parse(row.data);
  const now = new Date().toISOString();
  const updated = {
    ...existing,
    ...patch,
    id, // protect id against alteration
    updated_date: now,
  };

  await db.prepare("UPDATE local_records SET data = ? WHERE entity = ? AND id = ?")
    .bind(JSON.stringify(updated), entity, id)
    .run();

  return updated;
}

export async function deleteLocalRecord(db, user, { entity, id }) {
  if (!id || typeof id !== "string") throw new Error("Missing record identifier.");
  assertLocalWriteAccess(user, entity);

  const res = await db.prepare("DELETE FROM local_records WHERE entity = ? AND id = ?")
    .bind(entity, id)
    .run();

  return { success: true, id, changes: res.meta?.changes ?? res.changes ?? 1 };
}

export async function bulkCreateLocalRecords(db, user, { entity, records }) {
  if (!Array.isArray(records) || !records.length) return [];
  assertLocalWriteAccess(user, entity);

  const now = new Date().toISOString();
  const isOfficial = ["Dataset", "AgriculturalObservation"].includes(entity);
  const published = isOfficial ? 1 : 0;

  const prepared = [];
  const inserted = [];

  for (const item of records) {
    const id = item.id || `${entity.toLowerCase()}-${crypto.randomUUID()}`;
    const payload = {
      ...item,
      id,
      created_date: item.created_date || now,
      updated_date: now,
    };
    inserted.push(payload);
    prepared.push(
      db.prepare("INSERT INTO local_records (entity, id, data, published) VALUES (?, ?, ?, ?)")
        .bind(entity, id, JSON.stringify(payload), published)
    );
  }

  await db.batch(prepared);
  return inserted;
}
