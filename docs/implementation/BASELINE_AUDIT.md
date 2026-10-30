# Field operations baseline — 30 October 2026

Source commit: `c80d0a7415ea1add6a23f7eb273b32b0baa12e0e`. The checkout contains extensive uncommitted migration and frontend work; it is being preserved. No checkpoint commit can safely include that unrelated work.

## Runtime and source inventory

- React 19, TanStack Start, Cloudflare Worker; `src/routes/__root.jsx` owns the document. Supabase is the configured backend (`src/lib/supabase.server.js`); SQLite/D1 remains an offline development adapter. Supabase has been removed, so the kit's Supabase acceptance item is inapplicable.
- `supabase/migrations/20261030091627_hingasmart_backend.sql` contains profiles, JSON records, RLS, bounded reads and weather storage. Direct authenticated Data API writes are revoked.
- `src/lib/supabase-records.js` has generic staff writes but no case scope, versions, closure prerequisites or transactional audit. `src/lib/local-data-service.js` also has working writes, superseding the kit's older read-only audit.
- Existing dashboards, notes, tasks, source viewers, weather provenance and source import pipeline are implemented. `src/hooks/useAgriRecords.js` truncates work queues at 100–400 rows. Field landing fetches the agricultural observation collection into the browser.
- `migration/nisr-source-manifest.json`, `migration/nisr-report-manifest.json`, and `migration/real-data-import-report.json` remain source inventories, not current publication verification. No new official values will be manufactured.
- The README links to `SUPABASE_SETUP.md`, but that file is missing in this checkout. Infrastructure setup and migration/rollback instructions must be restored before changing infrastructure.

## Gaps to implement

Case-level read/write scope; canonical assignees; immutable source snapshot; atomic alert link and idempotency; optimistic concurrency; audit trail; visits; independent review/returns; evidence and task closure gates; source-preserving authorized printable report; complete work counts and explicit query errors. Attachments require private storage and content validation; unavailable scanning must remain explicit.

## Measured baseline

- `node --test tests/*.test.js`: 117 passed, 0 failed (30 October 2026).
- `npm run lint`: passed.
- Existing tests include statistical missingness, compatible yield, pagination, weather source identity, local auth and local writes. Some field tests only reproduce frontend checks and do not establish server enforcement.
- Live role journeys, deployment, workbook reconciliation, accessibility and migration validation have not yet been run. These must not be represented as passing.

## Integration decisions

Keep the present frontend and routes. Integrate workflow enforcement beneath the existing entity adapter so alternative callers cannot bypass it. Store new workflow entities in the existing record store, with a private atomic commit function for Supabase and transactional SQLite batches. Preserve legacy status values and add review status separately. Keep old records intact; absent provenance remains unavailable. Do not expose respondent files or create an offline draft cache.
