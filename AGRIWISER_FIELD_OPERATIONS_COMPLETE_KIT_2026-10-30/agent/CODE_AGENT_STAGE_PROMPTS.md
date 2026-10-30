# Optional stage-specific prompts

## P0 audit
Read `agent/MASTER_IMPLEMENTATION_PROMPT.md`. Report precise path-to-feature mapping of repo vs kit, source manifests, auth modes and observed failures. Do not implement until audit is written.

## P1 NISR
Implement source-backed aggregates for Field Operations using existing published tables and survey definitions. Keep data categories separate. Show exact lineage, units, null handling, quality flags. Build tests comparing computed figures to original workbooks; do not infer absent district measures.

## P2 data persistence
Fix local D1 workflow write paths for cases, alerts, notes, follow-ups, visits, reviews and audit using protected server functions, with RBAC and scope. Do not relax RLS or use client-provided roles. Run 401/403 and persistence tests.

## P3 dashboard
Integrate `overlay/src/lib/field-ops-model.js` and `overlay/src/components/dashboard/FieldDashboard.jsx` after comparison with current source. Replace hook page-limited totals with backend aggregate/cursor model. Ensure top cards, findings, cases, tasks and weather are accurate, actionable, responsive and traceable.

## P4-P6 investigation workflow
Implement immutable evidence snapshot, visit and notes, attachments, supervisor review, follow-up and closure gating. Reuse existing UI; preserve legacy records and status mapping.

## P7-P8 weather, reports and QA
Join climate estimates only as compatible contextual evidence and export reproducible field reports. Run full access/security, statistical, usability and performance tests, produce evidence and release checklist.
