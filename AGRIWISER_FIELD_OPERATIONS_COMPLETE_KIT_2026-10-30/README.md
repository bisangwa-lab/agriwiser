# AgriWiser — Field Operations Completion Kit

**Prepared:** 2026-10-30  | **Target:** `bisangwa-lab/project44` (`main`)  | **Stack observed:** React 19, TanStack Start/Router, Supabase-backed AgriWiser adapter, Cloudflare/D1 local mode, Tailwind, Recharts.

## What this ZIP is
A repository-specific **implementation package**, not a claim that the production application is already finished. Includes:

1. `agent/MASTER_IMPLEMENTATION_PROMPT.md`: paste into Codex/OpenCode/Claude Code with repository open.
2. `docs/`: requirements, pages, journeys, architecture, security, reliability, dataset mapping, observability, acceptance criteria, migration and rollout.
3. `overlay/`: actual source for a redesigned **Field Operations dashboard**, a shared pure computation module and automated unit tests. Agent must inspect and integrate it; don't blindly overwrite a changed file.
4. `schemas/`: proposed D1 schema for visits, evidence attachments, review decisions, audit events and action assignments. **Design proposals only**; reconcile with existing D1 before running migrations.
5. `data/`: NISR source catalogue from the repository manifest, indicator definitions, catalogue audit instructions, source-ingestion checklist and coverage snapshot.
6. `examples/`: JSON contract examples with *null* measurements (not fabricated official values) and workflow test cases.
7. `tests/`: acceptance, safety, accessibility and integration test matrices.
8. `references/`: user-supplied product specification and screenshots.
9. `scripts/`: check-kit script and source audit helper.

## The crucial implementation issue
`src/api/localClient.js` currently implements local **reads** but its entity `create/update/delete` methods throw "not yet available". Thus the screenshots of alerts/investigations do not establish that local writes work. Implement audited, role-protected backend writes before claiming complete investigations, notes, follow-ups, visits or reviews.

## Quick start
1. Extract this ZIP **outside the repo** as a reference kit.
2. Check out the latest `bisangwa-lab/project44` and commit/back up your current changes.
3. Open `agent/MASTER_IMPLEMENTATION_PROMPT.md` in your coding agent and give it this kit directory, the repo and access to locally held NISR data (only if authorized).
4. The agent must audit before changing code; compare `overlay/src/components/dashboard/FieldDashboard.jsx` to the latest `src/components/dashboard/FieldDashboard.jsx`.
5. Apply `overlay/` selectively; validate any new D1 tables against existing database. Work sequentially using `agent/PHASES_AND_GATES.md`.
6. Run `node --test overlay/tests/*.test.js` **in your repo after copying overlay logic** or directly from this kit; additional app tests require the real repo and services.
7. Do not mark a phase complete unless it passes the required functional, role-based and NISR provenance checks.

## Explicit non-claims and source limits
- No original NISR spreadsheets, private survey microdata, private database, API credentials or GitHub source snapshots are bundled. The repository's source manifests and authorized local archives are the ingestion source of truth.
- The source catalog is a **snapshot of URLs from `migration/nisr-source-manifest.json`**. It is not a live availability or publication verification.
- Dataset counts represent the repository's **2026-10-29 prepared import report**, not real-time system counts.
- The dashboard overlay is a **UI integration candidate with a unit-tested pure view-model**, not an end-to-end tested working application. Local write endpoints, supervisor reviews, and file upload require implementation and integration tests.
- Rename the page labels freely. Preserve semantics, role boundaries, API paths and evidence fields until carefully migrated.

## Project invariants
Official NISR ≠ external weather estimates ≠ simulated values ≠ field observations. Missing ≠ zero. Large change ≠ proven cause. Per-record authorization is required, not merely a hidden button.
