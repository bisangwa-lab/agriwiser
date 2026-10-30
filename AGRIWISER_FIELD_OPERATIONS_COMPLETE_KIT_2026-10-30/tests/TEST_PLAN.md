# Comprehensive test plan

This package includes `overlay/tests/field-ops-model.test.js`, a pure-node test for dashboard count/date/ordering/provenance utilities. It is **not** sufficient to validate end-to-end production readiness.

## Unit
- `src/lib/metrics.js`, `src/lib/alert-rules.js`, model helper: null-vs-zero, yield with denominator 0/missing, percent baseline 0, repeated year/season, parents/subtypes.
- Field model: exact 7-day due range, Kigali date arithmetic, omitted due dates, completed tasks excluded, priority sorting and assignee email normalization.

## Integration
- Local mode: authenticate, add/update case, note, follow-up, visit and review, reload; verify local D1 row data and history.
- Supabase mode: test equivalent paths or document unsupported operations and block release accordingly.
- Pagination: >300 cases and >400 signals with exact backend total; filtering and virtualized/paged lists.
- NISR ingest: real workbook and report table cross checks, source lineage, missing data and survey release compatibility.
- Weather: provider outage, cache, incomplete daily records, district grid and comparison constraints.

## Security
- Anonymous mutation -> 401, unauthorized role -> 403, outside district scope -> 403, deleted/inaccessible case -> 404, malformed request -> 400.
- Test attachment extension/MIME/size/content, signed link expiry, role change, CSRF, rate-limit, idempotency, audit immutability, XSS in user notes and Excel exports.

## End-to-end
- Finding to case to officer assignment, evidence, supervisor approve, action and sourced report.
- Status changes visible after reload, no false success on server failure.
- Field officer Weather route stays in Field Operations; direct Admin route blocked appropriately.
- 390px viewport, keyboard-only, browser zoom 200%, chart alternatives, ARIA loading/error announcements.

## Release evidence
Capture CI output, date, repo SHA, relevant screenshots, backend API responses and sanitized logs. Update `ACCEPTANCE_MATRIX.csv` with `PASS`, `FAIL`, `BLOCKED`, test execution timestamp and link to test run. Never fill `PASS` without actual execution.
