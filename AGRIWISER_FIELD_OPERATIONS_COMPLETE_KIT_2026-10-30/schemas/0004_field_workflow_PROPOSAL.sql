-- AGRIWISER FIELD OPERATIONS, PROPOSED D1/SQLite ADDITIVE SCHEMA.
-- NOT production migration; inspect existing D1 and Supabase schemas first.
-- Existing cases and follow-ups may be stored inside local_records; case_id is text on purpose.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS field_visits (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL, district TEXT NOT NULL,
  planned_for TEXT NOT NULL, objective TEXT NOT NULL,
  precise_location_json TEXT, -- sensitive, store only if authorized and encrypted/app-policy permits
  assigned_user_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'planned',
  checklist_json TEXT NOT NULL DEFAULT '[]', created_by TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, row_version INTEGER NOT NULL DEFAULT 1,
  CHECK (status IN ('planned','in_progress','completed','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_field_visits_case ON field_visits(case_id);
CREATE INDEX IF NOT EXISTS idx_field_visits_assigned_date ON field_visits(assigned_user_id,planned_for);

CREATE TABLE IF NOT EXISTS field_evidence (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL, visit_id TEXT,
  evidence_class TEXT NOT NULL, content TEXT, observed_on TEXT,
  author_user_id TEXT NOT NULL, source_reference TEXT, source_hash TEXT,
  document_object_key TEXT, mime_type TEXT, byte_size INTEGER,
  quality_status TEXT, created_at TEXT NOT NULL, row_version INTEGER NOT NULL DEFAULT 1,
  CHECK(evidence_class IN ('published_statistic','derived_indicator','field_observation','weather_estimate','testimony','reference','simulation')),
  CHECK(byte_size IS NULL OR byte_size >= 0)
);
CREATE INDEX IF NOT EXISTS idx_field_evidence_case ON field_evidence(case_id);

CREATE TABLE IF NOT EXISTS field_reviews (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL, reviewer_user_id TEXT NOT NULL,
  decision TEXT NOT NULL, reason TEXT NOT NULL, requested_at TEXT NOT NULL,
  decided_at TEXT, review_version INTEGER NOT NULL DEFAULT 1,
  CHECK (decision IN ('pending','approved','returned','rejected'))
);
CREATE INDEX IF NOT EXISTS idx_field_reviews_case ON field_reviews(case_id);
CREATE INDEX IF NOT EXISTS idx_field_reviews_reviewer ON field_reviews(reviewer_user_id,decision);

CREATE TABLE IF NOT EXISTS field_case_source_snapshots (
  case_id TEXT PRIMARY KEY, source_kind TEXT NOT NULL,
  source_reference TEXT, source_document_hash TEXT,
  frozen_json TEXT NOT NULL, frozen_at TEXT NOT NULL, frozen_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS field_case_assignments (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL, assignee_user_id TEXT NOT NULL,
  assigned_by TEXT NOT NULL, assigned_at TEXT NOT NULL, effective_until TEXT,
  reason TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_field_case_assignments_case ON field_case_assignments(case_id);

CREATE TABLE IF NOT EXISTS field_idempotency (
  idempotency_key TEXT PRIMARY KEY, actor_user_id TEXT NOT NULL,
  operation_name TEXT NOT NULL, result_record_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS field_audit_events (
  id TEXT PRIMARY KEY, event_type TEXT NOT NULL, actor_user_id TEXT NOT NULL,
  record_type TEXT NOT NULL, record_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL, reason TEXT,
  before_hash TEXT, after_hash TEXT, request_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_field_audit_case ON field_audit_events(record_type,record_id,occurred_at);
-- All read/write access MUST be mediated by authenticated server functions
-- with record-scoped checks. D1 tables alone are not per-user security.
