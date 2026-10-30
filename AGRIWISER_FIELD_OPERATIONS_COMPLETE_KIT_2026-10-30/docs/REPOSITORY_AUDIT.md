# Repository-grounded audit — snapshot 2026-10-30

**Target:** `bisangwa-lab/project44` private repository, `main`. Read-only source review via connected GitHub. This snapshot must be refreshed before implementation. Not a live browser runtime test.

## Existing implementation verified in source
- `src/components/dashboard/FieldDashboard.jsx`: five workload cards, `WeatherContext`, investigation queue, upcoming follow-ups, status distribution, guidance. Data from `useInvestigations()` and `useAllFollowUps()`.
- `src/routes/_authed/investigations.index.jsx`: creation dialog, filter/search, list, status badges, assignment and due date.
- `src/routes/_authed/investigations.$investigationId.jsx`: editable case, outcome and linked observations/actions.
- `src/components/investigations/NewInvestigationDialog.jsx`, `ObservationsPanel.jsx`, `FollowUpPanel.jsx`: create case, notes, actions via `appClient.entities`.
- `src/routes/_authed/alerts.jsx` and `src/components/alerts/AlertCard.jsx`: rule-backed signals and create-investigation link.
- `src/lib/alert-rules.js`: deterministic YOY change rules. Thresholds currently review 15%, priority 30%; materiality floors production 50 t, area 25 ha, yield 0.08 t/ha. These are **application triage thresholds**, not NISR severity classifications.
- `src/components/weather/WeatherDashboard.jsx`: selectable ERA5/MERRA-2 climate estimates, charts, map, anomalies and NISR comparison; `WeatherContext.jsx` provides case-context weather.
- `src/lib/rbac.js`, `src/routes/_authed.jsx`, `src/components/layout/SidebarNav.jsx`: five panel mappings, centralized route-level guards and role navigation.
- `src/lib/local-data-service.js`: secure local read collection; includes relevant entities but permits broad record reads to authorized role categories; check assignment-scoped access.
- `src/api/localClient.js`: local entity writes (`create`, `update`, `delete`) are **explicitly unavailable**, so local-mode investigation creation/notes/actions will fail.
- `schemas/entities/Investigation.jsonc`, `InvestigationNote.jsonc`, `FollowUpAction.jsonc`, `Alert.jsonc`, `AgriculturalObservation.jsonc`: existing entity structures and RLS. RLS broadly permits `admin` and `user`, not robust supervisor/assigned-record policies.
- `src/hooks/useAgriRecords.js`: list limits 300 investigations, 300 follow-ups and 400 alerts; dashboard totals are limited to the returned page, not proven complete.
- `src/lib/route-access.js`: legacy `canAccess()` always returns `true`; central panel guard exists but individual action policies still need backend enforcement.
- `migration/nisr-source-manifest.json` and `nisr-report-manifest.json`: source links; `migration/real-data-import-report.json`: last prepared local data metrics.

## Contradictions / risks to resolve
1. Screenshots show a different or newer dashboard than the `main` FieldDashboard code; use the screenshots as design references, not proof a feature is in git.
2. Screenshot zero investigations and many detected findings are not a contradiction in record counts; alerts/signals must not silently become confirmed incidents. Provide explicit linkage.
3. `is_demo: true` is hard-coded in new investigation, note and follow-up creation components. Determine legitimate distinction of live and demo records before changing; never relabel simulated entries as official.
4. Local-mode record write flow is blocked by `localClient.js`; implement real secure server paths.
5. `useInvestigations` limits affect counts and queues; replace with paginated or aggregate endpoints.
6. Weather estimates and survey figures must be comparable by geography/period/definitions, not blindly joined.
7. Supervisor assignment/approval, evidence uploads and field-visit planning are not established as production-ready by inspected code.

## Required agent verification commands
- `git status --short`, `git rev-parse HEAD`, `npm ci`, `npm run lint`, `npm run build`.
- Run existing tests explicitly (`node --test tests/*.test.js` if current configuration supports it), plus targeted e2e tests against actual running local/backend environment.
- Check both `VITE_AUTH_MODE=local` and the deployment’s actual auth mode.
- Run repo's documented `node scripts/check-real-data.js` and `node scripts/check-weather.js` with approved data/network access.

## Caution on source links
Private GitHub files may not be accessible without repository connection. Relative paths are the canonical integration pointers.
