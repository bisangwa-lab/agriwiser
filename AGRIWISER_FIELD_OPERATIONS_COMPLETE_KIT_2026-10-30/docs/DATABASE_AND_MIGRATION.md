# Migration design — do not apply blindly

Current repository has `migrations/0001_local_auth.sql`, `migrations/0002_local_data.sql`, `migrations/0003_weather.sql` and Supabase JSONC entity schemas. `schemas/0004_field_workflow_PROPOSAL.sql` defines optional typed tables for new workflow entities; it is **not** certified to work with the deployed database without schema reconciliation.

## Rules
1. Inspect D1 table definitions and actual Supabase entity capability; do not create duplicate authoritative sources for the same case without migration contract.
2. Prefer extending current persisted entities for notes/follow-ups when possible. New tables for visits, evidence, reviews and audit may be appropriate if existing store cannot support proper foreign keys/ACL.
3. Keep immutable source snapshots in case creation transaction; preserve `source_hash`, `source_url`, `source_report_page` when possible. Changes use version numbers and audit events.
4. Add indexes on scope (`district`, `assignee`, `status`, `due_date`) only after checking query patterns and migration conflicts.
5. Check SQLite/Cloudflare D1 limitations and migration tool compatibility; test inside actual workerd/D1 environment.
6. Backfill existing status values: `open`, `in_progress`, `awaiting_evidence`, `completed`, `cancelled` without deleting history. New review/visit/task statuses are separate from case status until explicitly migrated.
7. Rollback strategy must restore or reverse additive migrations; validate foreign key behavior and unique constraints.
8. Store private attachment bytes in private object storage, references in DB; never inline binary evidence into NISR source tables.

## Performance
Implement backend summary counts, cursor pagination and targeted indexes; avoid fetching all NISR records to compute dashboard numbers. Track query latency and ensure no 300/400 item cap distorts visible counts. Cache published aggregates separately from private case queues and invalidation triggers.
