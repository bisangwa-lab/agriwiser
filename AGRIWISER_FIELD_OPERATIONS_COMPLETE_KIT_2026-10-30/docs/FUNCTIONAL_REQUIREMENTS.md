# End-to-end functional requirements

## FR-01: Dashboard landing
Header: visible role/assigned geography, active source refresh/coverage summary, filters `District`, `Crop`, `Season`, `Year` (only available source values). Four core actionable cards: (a) review signals, (b) assigned active cases, (c) evidence needed, (d) overdue actions. Optional fifth 'Due in 7 days'. Each card filters its own list, never navigates to an unrelated panel. Show 'counts unavailable' on query error or incomplete pagination.

Next: high-priority findings with indicator, source, dates, baseline, current, absolute and percentage change, materiality check, quality flags, review state, linked case. Then 'My work' queue, immediate follow-ups, compact weather/crop snapshot for selected context, a small audit/quality strip. Large data library and historical plots should live in drill-down tabs rather than push urgent tasks below multiple screens.

## FR-02: Finding review
Signals are analytical prompts. Show NISR publication + table/sheet/page where known, extraction source, geographic level, crop definition, survey release, data status, numeric coverage, value units, rule ID/version/threshold. Provide 'Check underlying cells', 'Why flagged?', 'Compare periods' and 'Start investigation' actions. If already linked, open existing case. Do not auto-mark as incident.

## FR-03: Investigation creation
Can start from finding, district map or manual reason. Must capture immutable triggering snapshot, source link, calculation, original unit, two period labels, original metadata and no fabricated numbers. User defines question, crop, geography, evidence plan, owner, due date and priority. Reject malformed values. Double-click idempotency. Auto-link to the alert only with consistent transaction + permission.

## FR-04: Assignments
Support unassigned queue (supervisor); assigned-to-me queue (officer); assignment history and deadlines. Reassignment requires permission and audit reason. Display user name only from authoritative directory; email can be stable reference but not an arbitrary reviewer string.

## FR-05: Field visit plan
Create scheduled visit linked to case. Capture planned date, allowed location precision, purpose, checklist, team, safety considerations, status. Offline drafts are optional and cannot be represented as uploaded until server confirms. Avoid unnecessary exact farm coordinates and personal information.

## FR-06: Field observations and evidence
Structured entries: observation type, observed date, author, source classification, observation content, relevant crop/period/location, units for quantitative measurements, quality status. Attachments if supported: type/size/scan, source filename, hash, secure reference, author, timestamp, access policy. Distinguish field observation from NISR, climate and simulated outcomes.

## FR-07: Review and outcome
Review supervisor sees original question, evidence timeline, unresolved gaps, stated uncertainty, report and action history. Approve, return with reason, or request new evidence; all require permissions and audit records. Officer cannot self-approve when independent review is required. Close only after required review and action disposition, but allow administrative exception with documented reason.

## FR-08: Follow-up actions
Every action has owner, due date, description, status, last update and linked case. Allow reminders/overdue markers; create/complete with evidence as necessary. Keep cancelled/completed history rather than delete. Distinguish a due-soon task from overdue.

## FR-09: Reports
Generate user-readable report: title, IDs, creation date and reporting periods; indicators, units, definitions; original NISR source/publication; evidence table with source class; methods/calculations and limitation; supervisor decision; tasks and next actions; data refresh/revision status; approvals. Show 'not available' when missing. Export only authorized content, prevent restricted data leaks.

## FR-10: Weather linkage
Choose same district/crop/season when weather and agriculture comparison has a verified intersection. Weather provider defaults must show provenance and gridded resolution; climate estimates cannot be presented as farm sensor readings or evidence of causal attribution.

## FR-11: Accessibility and navigation
Responsive at phone/tablet/desktop; keyboard focus, readable names/units, aria status for loading, chart textual tables, color not sole status signal, visible empty/partial/error states, no action hidden solely by hover. Weather route must remain in officer panel, never redirect to Administration.

## FR-12: Operational integrity
Implement complete pagination, optimistic concurrency/versions, retry and idempotency, audit events, safe attachment retention, role/record ACL and monitoring. Views change only after validated server confirmations.

## Global invariants
No synthetic 'NISR' numbers. Missing ≠ zero; source reported zero is valid and distinguishable. Comparison across noncomparable years, seasons or geographic definitions blocked/explained. Source-published yield and derived yield distinct; derived yield is not averaged/summed. All date and source metadata visible on drill-down.
