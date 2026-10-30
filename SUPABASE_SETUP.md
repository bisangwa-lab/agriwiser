# Supabase setup and field workflow migrations

Read `README.md` and `AGENTS.md` first. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` only in ignored `.dev.vars` or hosting secrets. Never use a `VITE_` prefix for secrets. Supabase is the application backend; local SQLite is development/test support only.

Apply the versioned files in `supabase/migrations/` in order. Before applying to an existing project, create a private database backup, inspect existing entity constraints/policies and run the migration in a transaction ending in `ROLLBACK`. Apply only after the dry run passes. Validate RLS, grants, anonymous denial, assigned-record access, active canonical profiles and direct-write denial. The workflow commit RPC is service-role-only and checks the current actor profile again; application server functions enforce action and record permissions before obtaining the server-secret client.

Workflow migrations are additive: existing case IDs, JSON and source records are retained. Legacy cases without immutable provenance are labelled as such; users cannot manufacture an official source by submitting JSON. Legacy ownership can use the authenticated email until a supervisor assigns a canonical profile ID.

Rollback: stop workflow writes, restore the prior Worker version, retain the new records and audit events, then restore a private backup only if a reviewed recovery requires it. Do not drop tables or erase workflow/audit history to roll back a frontend release. New workflow records will not be readable by older clients that do not know those entities.

After migration run `npm run lint`, `node --test tests/*.test.js`, `npm run build`, and the workflow integration check described in `docs/implementation/`. Deployment and private backups are operational steps and must be recorded separately from unit-test results.
