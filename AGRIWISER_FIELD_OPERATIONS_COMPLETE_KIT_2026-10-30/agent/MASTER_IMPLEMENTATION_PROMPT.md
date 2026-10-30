# Master coding-agent instruction — complete AgriWiser Field Operations

You are the senior full-stack engineer, data engineer, geospatial analyst, agricultural statistics QA reviewer, security engineer and UX engineer working inside **the existing** `bisangwa-lab/project44` repository. Work in the user’s checked-out repo; **do not create a separate product, delete working modules, or overwrite new local changes**. Treat this kit, `references/AGRIWISER_ORIGINAL_PRODUCT_SPEC.md`, the latest repository, NISR original publications, and legitimately available local datasets as sources of truth, in that order of specificity: original published evidence governs facts, while the existing code governs integration decisions.

**Goal:** Make the full Field Operations experience operational: dashboard → verified statistical finding → assigned investigation → planned field visit → documented observations/evidence → supervisor review → corrective/follow-up task → audited resolution → reproducible report. Usability and statistical discipline matter equally. Names are placeholders, can be changed, and should not be used to justify redesigning unrelated panels.

## Mandatory first actions
1. Read `README.md`, `docs/REPOSITORY_AUDIT.md`, `docs/FUNCTIONAL_REQUIREMENTS.md`, `docs/NISR_DATA_CONTRACT.md`, `docs/SECURITY_AND_PRIVACY.md`, `docs/INTEGRATION_ARCHITECTURE.md`, and `agent/PHASES_AND_GATES.md`.
2. Inspect latest working tree/commit and read current source for field dashboard, alerts, investigations, datasets, weather, authentication, RBAC, localClient, `local-data-service.js`, D1 schema, Data Manager import, NISR manifests and tests. Check whether code changed since kit date.
3. Distinguish **implemented, partially implemented, broken, proposed, blocked** with file paths and test evidence.
4. Confirm runtime mode(s): Supabase, local D1, or both. Do not let a Supabase success conceal a local-mode failure.
5. Write `docs/implementation/BASELINE_AUDIT.md` in the target repository recording source commit, schema status, data coverage, broken flows and measured test results.

## Core execution rules
- Do not stop at mockups or components. Finish backend reads/writes, authorization, migrations, UX, tests, audit logs and exports for each stage before signing it off. Complete in **phases**, without reducing final scope to MVP.
- Reuse existing `FieldDashboard`, `WeatherContext`, `NewInvestigationDialog`, observations, follow-ups, alert calculation, NISR source library, maps and report engine where safe. The `overlay/` implementation is a starting point, not a replacement for auditing current code.
- Keep access constrained: `agricultural_officer`, `field_investigator`, `field_supervisor`, `data_manager`, `agricultural_analyst`, `super_admin`, and legacy role mappings. Role guards must exist server-side for each sensitive action and record.
- Fix `localClient.js` write limitations with dedicated authenticated server functions / D1 commands, schema validation and audit logs. Never bypass them by anonymous endpoints or granting all users write access.
- Transactionally bind alert-to-investigation linking; preserve original finding snapshot, source hash, units, periods and rule version. Idempotency prevents duplicate investigations from accidental double-clicks.
- Offer users focused actions: `Review finding`, `Start investigation`, `Assign`, `Record observation`, `Submit for review`, `Approve/Return`, `Create follow-up`, `Close`, `Export report` — only when permitted and prerequisites satisfied.
- Dashboard must show assigned work, urgent **review signals**, evidence backlog, overdue tasks, priority cases, and contextual NISR/weather data with drilldowns. Avoid dense default walls of content.
- NISR datasets are never faked; obtain authorized original XLS/XLSX, publications and source archives according to `migration/nisr-source-manifest.json`, `migration/nisr-report-manifest.json` and local data instructions. Do not upload household/plot respondent rows to public app, repo, AI models or logs.
- Derive yield from aligned production and positive harvested area with compatible units and same geography/crop/season/year/release; source-published yield remains separate. Null/blank does not equal zero. No percent change when baseline zero. Avoid parent/subtype double counting and sum of rates.
- NISR published statistics, model-based climate estimates (ERA5/MERRA-2), authorized Meteo Rwanda observations, local field observations and simulation outputs must remain visually and structurally separate, with source, timestamp, spatial/temporal resolution and limitations.
- Avoid alarmist labels: statistical anomaly is **not** a confirmed crop failure, disaster, causation or validated forecast. Confirm suspicious 100% falls against missingness, zero handling and season/release compatibility.
- Ensure all counts are from complete paginated queries or backend aggregate queries; don't count only first 300/400 rows and call it a total.
- Use geography from approved districts; support location hierarchy only if fields and permissions exist; never infer exact farm coordinates from gridded weather.
- Use secure storage for attachments, malware/type/size validation, signed download URLs, per-record ACL, retention and immutable provenance; no direct upload to public buckets.
- Provide errors, loading, empty, no permission, partial coverage, unavailable-data and offline-draft states explicitly. Offline support must be secure, opt-in and tested before being promised.
- Preserve working Weather & Climate routing, other panels, styling and accessible layout; confirm no redirect to Administration when field user opens weather.

## Implementation sequence
Execute `agent/PHASES_AND_GATES.md` steps P0–P8. Run all relevant tests after each commit. For every phase report (a) files modified, (b) migrations, (c) API integration, (d) tests with pass/fail output, (e) screenshots/accessibility checks, (f) blockers, (g) exact follow-up actions. Do not claim tests passed without running them.

## Definition of finished
Every acceptance item in `tests/ACCEPTANCE_MATRIX.csv` is either verified passing in actual target runtime or clearly documented as blocked/not implemented; no placeholder numbers or empty shell routes. An officer can act on an authentic source-linked case from start to approved closure and reliably export a report, while unauthorized users cannot read or mutate it. Preserve all functioning areas of the app.
