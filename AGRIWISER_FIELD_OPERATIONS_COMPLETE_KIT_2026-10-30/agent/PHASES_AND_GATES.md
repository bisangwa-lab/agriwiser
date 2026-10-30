# Phases, dependencies and non-negotiable release gates

| Phase | Deliverable | Required proof |
|---|---|---|
| P0: audit | Current Git SHA, runtime, NISR import and schema inventory, screenshot-vs-code diff | Audit report with verified paths & test results |
| P1: NISR data | Reliable catalogue, source mapping, harmonized indicators, quality badges, aggregate endpoints | Reconciliation & no-fake-data tests |
| P2: writable foundation | Authenticated D1/Supabase entity contract; cases, follow-ups, notes, row/role ACL, atomic linking, audit | Write/read/update persistence and 403 tests for every action |
| P3: dashboard | Priority signals, workload, overdue, evidence queue, assignment and district/crop context | Click-through works; totals complete; data loading/error states |
| P4: investigation | Immutable source snapshot, evidence history, task/assignment, checklist, status transitions | End-to-end create → inspect → save → reopen |
| P5: visits and evidence | Visit planning, mobile-friendly forms, optional secure attachments, provenance | Signed access and permission tests; audit trail |
| P6: supervisor / actions | Review decisions, return-for-correction, follow-up owners, due dates, evidence gating | Unauthorized approve rejected; closure blocked without criteria |
| P7: weather + reporting | Matching verified climate context, comparative interpretation, sourced report exports | Missing-data, spatial mismatch and source-label tests |
| P8: hardening | End-to-end QA, performance, WCAG, deployment, rollback, retention, docs | Release checklist signed; no fabricated claims |

**Order note:** Finish P2 before promising that any 'New investigation' or 'Add observation' button works in local auth mode. P1 and P2 may progress independently only with contract tests; P3 must not depend on unimplemented writes.

## Work discipline
- At the end of each phase, log pass/fail evidence and list files changed. Keep builds runnable.
- Create a checkpoint commit only after tests pass; do not push without user instruction.
- On every migration: backup, dry run, apply, validate, rollback plan. Never drop tables to 'fix' inconsistent data.
- If a published figure is unavailable, render `Unavailable` with a source/coverage explanation, not a fabricated example.
- If the agent cannot reach a real API/source, report the blocker and retain a validated contract; never assert the endpoint is integrated.
