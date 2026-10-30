# UI information architecture — titles are provisional

## Navigation recommendation
Keep sidebar compact: `Workspace`, `Investigations`, `Weather & climate`, with nested sections or tabs for `Findings`, `My tasks`, `Visits`, `Review`, `Reports`. On mobile use a condensed primary navigation. Distinct role-specific tabs prevent overwhelming an officer. Do not force new route names unless needed for permissions/deeplinks.

### Page 1 — Field dashboard
**Decision question:** What needs my attention now? Top cards show actionable counts and data availability; urgent signals; 'My work'; tasks due soon/overdue; contextual compact weather+NISR snapshot; source/coverage status. Reuse designs in screenshots but reduce vertical length. Stats click to filter in-place and optionally navigate filtered routes.

### Page 2 — Findings (queue)
**Decision question:** What changed, and is it credible? Filter by district/crop/season/year/indicator/severity/source quality; sort by priority and newest first. Each row expandable to underlying data, numerator/denominator, source line/sheet, historical comparison, flags and original source. One authoritative case per chosen signal unless intentional duplicates approved.

### Page 3 — Investigation list
**Decision question:** What has been assigned and what is pending? Table: title/crop/district/period, reason, assignee, status, due date, last update, related alert, actions. Filters: status, assignment, district, crop, search, overdue; deep link preserves filters.

### Page 4 — Investigation detail
**Decision question:** What do we know and what must we verify? Use tabs or a compact stepper: Overview, Evidence, Field visits, Follow-up, Review, Report. Persistent header with Case ID, status, source badges, responsible officer, due, last update. Snapshot immutable; record edited fields separated. Case timeline always available.

### Page 5 — Field visits
**Decision question:** Where am I going and what should I collect? Scheduled visits/cards/map if exact site is authorized; date, assigned staff, district, objective, checklist, visit status, notes, evidence upload; mobile readable. Avoid showing sensitive exact coordinates unless authorized.

### Page 6 — Review and follow-up
**Decision question:** Can we conclude? Supervisor review inbox: submitted cases, evidence completeness, documented quality issues, decision and reason, actionable next steps; follow-up board by due/status/assignee.

### Page 7 — Weather context
**Decision question:** Does available climate context warrant follow-up? Scoped rainfall, temperature, baseline, quality, district aggregation limits, provenance and compatible published agricultural observations. Deeper existing WeatherDashboard stays available.

### Page 8 — Report/export
**Decision question:** What did we find and what is justified? Structured export with complete provenance, charts only where based on real values, limitations, approval history, restrictions and version stamps.

## Design system
Use existing AgriWiser deep green, muted backgrounds, white cards, readable typography, restrained severity color. Use icons + explicit text. KPIs are navigation to actions rather than giant decorative numbers. Maximize readability at 1280px and 390px. Never include sample metrics disguised as current values.
