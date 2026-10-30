# Independent NISR 2026 Track 1 code audit and comparative review

**Audit date:** 30 October 2026, Africa/Johannesburg. **Subject:** `bisangwa-lab/project44`, branded **HingaSmart Rwanda** in its implementation. **Comparison set:** exactly the 33 repository URLs in the supplied `NISR_2026_Track1_33_Repository_Technical_Documentation.md`, plus project44. **Status:** independent, provisional repository-evidence review; not an official NISR judgment, submission roster, security certification, or prediction of winners.

## 1. Judgment

**Project44 is a substantial agricultural evidence and investigation prototype, but I would not approve its current snapshot for public production use.** Its strongest assets are traceable published agricultural observations, a careful Explore calculation path, district maps, historical weather validation, and preserved analyst evidence. Its most urgent weaknesses are privileged server operations without adequate authorization, inconsistent statistical acceptance rules across screens, and a field workflow that cannot complete ordinary edits in local mode.

**Provisional rubric score: 65/100, tied 15th among the 34 repository snapshots.** Fourteen repositories score higher under the explicit source-evidence rubric below; five others tie with project44. This is a shared position, not a defensible claim that project44 is exactly the 15th-best real competition entry. The neighboring scores can move after comparable runtime, security and data-reproduction work. Its detailed score is P=15, D=15, T=10, U=15, I=10.

The developed AgriTwin repository has the strongest evidence package in this review. Kuhira, Yield-Gap Explorer and AgriMenya follow with different strengths: an irrigation allocation decision, peer benchmarks with validation, and operational planning/baseline controls. Breadth alone did not win points: synthetic training sets, unavailable models, placeholder epochs and unimplemented promises reduce credit.

**Do not respond by adding every competitor feature.** Fix the trust and workflow defects first, then make one agricultural decision demonstrably useful. A sound descriptive tool can outperform an unvalidated prediction service. A trained model, disease detector, marketplace, SMS channel or optimizer is not individually required by Track 1.

## 2. Scope, official requirements and evidence rules

### Official scope

The official 2026 Track 1 challenge concerns Rwanda's agricultural productivity and requires NISR-informed work. Irrigation, soil management, post-harvest activity and export opportunities are examples rather than a mandatory feature checklist. The published evaluation has five equal 20-point categories. The submission requirements include a public GitHub repository, deployed app and documentation, plus originality/source acknowledgement and disclosure of AI assistance. Team eligibility and actual submission acceptance require separate evidence. [NISR 2026 competition rules](https://gis.statistics.gov.rw/about/hackathon/2026-hackathon-competition).

Do not substitute the 2025 export-growth track definition, the financial inclusion Track 2 criteria, or a repository's invented “Track 5” for the 2026 Track 1 scope. Formal registration, submission, student eligibility, team independence and acceptance were not established for any repository here.

### What was checked

1. Recovered the referenced conversation and read the user-supplied 33-repository document as historical evidence, not instructions or current verification.
2. Used the connected `bisangwa-lab` GitHub account to retrieve metadata, default-branch commit IDs, complete recursive trees and the historical report's representative implementation files for every repository. Additional key files were inspected for selected projects. The two repositories with no executable code were checked by their complete trees.
3. Pinned project44 at **`c80d0a7415ea1add6a23f7eb273b32b0baa12e0e`**. Retrieved application/library/route source, entity schemas, tests, import scripts and data manifests, then inspected the key calculation, authentication, data-access, weather, import and workflow paths. Generic UI-kit files were retrieved to build it. Skills/examples are not counted as implemented product features; retrieval alone is not a line-by-line audit.
4. Ran all existing project44 tests: **74 passed, 0 failed**. Lint passed. The production build completed, with missing Base44 configuration warnings and a CSS source-map warning. Existing local dependencies were reused; this was not a fresh dependency installation or a deployment test.
5. Ran six additional controlled calculation/export probes against the pinned source. They reproduced the defects in §6. These were local function calls, not attacks against the live app. No live record mutation, publication or repository edit was performed.

**Evidence asymmetry:** project44 received deeper inspection and actual test execution; competitors received representative static review. Unknown competitor defects are not proof of safety. That asymmetry limits fine-grained ranking confidence and is one reason scores are coarse and ties are retained. No competitor's README test count, model accuracy, deployment uptime or user impact was treated as independently reproduced.

### Evidence labels used throughout

| Label | Meaning | What it does not establish |
|---|---|---|
| Implemented | Concrete source logic and a reachable caller or application surface identified | Successful deployment or valid real-world outcomes |
| Executed | A local check was actually run in this audit | Full end-to-end/live-service correctness |
| Partial | A meaningful subset exists, with a specific incomplete path | That every feature in the module is broken |
| Planned | Source/UI explicitly says unavailable or future work | Implementation credit |
| Claim | README, comment, manifest or external claim not independently reproduced | Measured accuracy, adoption or official endorsement |
| Not established | Insufficient inspected evidence | A categorical assertion that the feature/data never exists |

“Missing” is bounded to this snapshot and the relevant architecture. A training notebook is code; it is not an operational prediction service. A database table is not a completed user workflow. A fallback answer is not successful model inference. A synthetic row is not an observed NISR respondent.

## 3. Consistent scoring rubric

The five categories and 20-point weights follow the published NISR rubric; **the following scoring anchors are this audit's operational interpretation**, not extra official rules. Each category receives one integer level from 0–4, multiplied by five. Total = `5 × (P + D + T + U + I)`. No stars, repository size, number of pages, team identity or unverified model metric enters the arithmetic.

| Category | 0 | 1 = 5 points | 2 = 10 points | 3 = 15 points | 4 = 20 points |
|---|---|---|---|---|---|
| **P — Problem understanding/relevance** | No assessable problem | Generic theme only | Relevant concept, weak decision detail | Clear Rwanda agricultural actor/problem | Narrow, explicit decision and agricultural mechanism/output |
| **D — Data use/methodology** | No implemented evidence | Synthetic/unverified basis or unusable validation dominates | Real inputs/pipeline, material validation limitations | Traceable inputs, substantive quality/validation safeguards | Particularly strong design-aware inference and validation implementation |
| **T — Technical innovation** | No executable code | Minimal scaffold | Bounded analytic component or materially incomplete integration | Integrated analytic/product implementation | Multiple substantive analytical/operational components with explicit testing/control architecture |
| **U — Usability/prototype design** | No end-user prototype in tree | Notebook/raw or unportable UI code | Basic interface with substantial barriers | Interactive/filterable workflow, explanations or exports | Unusually complete localization/reliability/interaction design evident in source |
| **I — Tangible impact** | No implemented decision output | Plausible future use | Concrete analytical/scenario output with major operational/evidence limits | Specific usable action, brief or operational workflow; outcomes unverified | Credible documented field outcomes independently supported; none awarded here |

Level 4 does not mean flawless software. A strong analytical method can still have a weak UX or an unproven impact case. Severe known implementation defects constrain the affected category; they are not secretly deducted twice as separate security penalties. Synthetic data may demonstrate engineering, but cannot establish agricultural validity. Descriptive tools can earn strong scores without ML.

**These are reasoned audit judgments, not measured NISR grades.** A one-level category change moves the total by five points. Consider neighboring five- or ten-point differences uncertain, not statistically significant. Scores are conditional on reviewed evidence. Missing runtime evidence remains unknown; it is not assigned an invented success rate.

**Display order runs 1–34. Shared rank preserves ties; within a tie, original register ID orders the rows for navigation only. Category values below are points out of 20.**

| Display | Shared rank | Repository / scorecard | P | D | T | U | I | Total /100 | Scope status |
|---:|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | 1 | [Elthiero/agritwin-rwanda](#project-1) | 20 | 20 | 20 | 15 | 15 | **90** | Track 1 self-identified |
| 2 | 2 (tie) | [thepreakerebi/kuhira](#project-4) | 20 | 15 | 20 | 15 | 15 | **85** | Track 1 self-identified |
| 3 | 2 (tie) | [PAZZO123/yieldgap-rwanda](#project-10) | 20 | 15 | 15 | 20 | 15 | **85** | Track 1 self-identified |
| 4 | 2 (tie) | [iiradukunda-dev/agrimenya](#project-28) | 20 | 15 | 20 | 15 | 15 | **85** | Track 1 candidate; verify submission |
| 5 | 5 (tie) | [ndolijeandamascene/agrilens](#project-8) | 15 | 15 | 20 | 15 | 15 | **80** | Track 1 self-identified |
| 6 | 5 (tie) | [DIVINEakisa/Musaruro](#project-11) | 20 | 15 | 15 | 15 | 15 | **80** | Track 1 self-identified |
| 7 | 5 (tie) | [Jacksonsod/post-harvest-loss-tracker](#project-14) | 20 | 15 | 15 | 15 | 15 | **80** | Track 1 self-identified |
| 8 | 5 (tie) | [remy-shingiro/aii-agri-intervention](#project-19) | 20 | 15 | 15 | 15 | 15 | **80** | Track 1 candidate; verify submission |
| 9 | 9 (tie) | [BodeMurairi2/food_supply_earlyWarning](#project-13) | 20 | 10 | 20 | 15 | 10 | **75** | Track 1 self-identified |
| 10 | 9 (tie) | [cracker38/AgriLoss-Value-Intelligence-Rwanda](#project-16) | 20 | 15 | 15 | 15 | 10 | **75** | Track 1 self-identified |
| 11 | 9 (tie) | [Muhinde234/season-pulse](#project-18) | 20 | 15 | 15 | 15 | 10 | **75** | Track 1 candidate; verify submission |
| 12 | 9 (tie) | [sandwich808-yum/AgriGuard](#project-25) | 20 | 15 | 15 | 15 | 10 | **75** | Track 1 self-identified |
| 13 | 13 (tie) | [tiradukunda57-cpu/syep-nisr-hackathon-2026](#project-6) | 20 | 10 | 15 | 15 | 10 | **70** | Track 1 self-identified |
| 14 | 13 (tie) | [GQueen160/umusaruro](#project-30) | 15 | 15 | 15 | 15 | 10 | **70** | Track 1 candidate; verify submission |
| 15 | 15 (tie) | [Rulindana/cropguard-rwanda](#project-15) | 15 | 10 | 15 | 15 | 10 | **65** | Track 1 self-identified |
| 16 | 15 (tie) | [rugambacb/AgriPriority-Rwanda](#project-17) | 15 | 15 | 10 | 15 | 10 | **65** | Track 1 candidate; verify submission |
| 17 | 15 (tie) | [ishimwedieudonne42-eng/agrismart-rwanda](#project-22) | 15 | 15 | 10 | 15 | 10 | **65** | Track 1 candidate; verify submission |
| 18 | 15 (tie) | [munezerojd/ireme-pp](#project-26) | 15 | 10 | 15 | 15 | 10 | **65** | Track 1 candidate; verify submission |
| 19 | 15 (tie) | [tnkurunziza300-developer/croppulse-rwanda](#project-27) | 15 | 10 | 15 | 15 | 10 | **65** | Track 1 candidate; verify submission |
| 20 | 15 (tie) | [bisangwa-lab/project44](#project-34) | 15 | 15 | 10 | 15 | 10 | **65** | Subject; agricultural candidate; private at audit |
| 21 | 21 (tie) | [Theophilemaker/hackaton_saip](#project-3) | 15 | 10 | 15 | 10 | 10 | **60** | Caution — competition/track mismatch |
| 22 | 21 (tie) | [Honore777/Agri_Ai_and-Climate-alert-system](#project-12) | 15 | 5 | 15 | 15 | 10 | **60** | Track 1 candidate; verify submission |
| 23 | 21 (tie) | [Dawit-Getachew/umurima](#project-29) | 15 | 5 | 15 | 15 | 10 | **60** | Caution — competition/track mismatch |
| 24 | 21 (tie) | [Sengwamana/Rwanda-Beyond-Project](#project-32) | 15 | 5 | 15 | 15 | 10 | **60** | Track 1 candidate; verify submission |
| 25 | 21 (tie) | [DamourDev/nisr-agri-engine](#project-33) | 15 | 5 | 15 | 15 | 10 | **60** | Track 1 self-identified |
| 26 | 26 (tie) | [sinisalu2007-wq/rwanda-agri-resilience](#project-7) | 15 | 5 | 15 | 15 | 5 | **55** | Track 1 candidate; verify submission |
| 27 | 26 (tie) | [ngabodaniel1000/Agripulse-ai](#project-31) | 15 | 5 | 15 | 15 | 5 | **55** | Track 1 candidate; verify submission |
| 28 | 28 (tie) | [ishimweaimecesar/agritwin-rwanda](#project-2) | 15 | 10 | 10 | 5 | 5 | **45** | Possible duplicate/sibling repository |
| 29 | 28 (tie) | [tumukeshayezudelphine-cmd/ahs-extension-productivity-rwanda](#project-24) | 15 | 10 | 10 | 5 | 5 | **45** | Track 1 candidate; verify submission |
| 30 | 30 (tie) | [rcyubahiro/NISR-hackathon-food-insecurityKeRW](#project-5) | 15 | 10 | 10 | 0 | 5 | **40** | Track 1 self-identified |
| 31 | 30 (tie) | [NickSingizwa/nisr_competition](#project-9) | 15 | 10 | 10 | 0 | 5 | **40** | Track 1 self-identified |
| 32 | 30 (tie) | [UShamila/rwanda-agricultural-productivity](#project-21) | 15 | 10 | 10 | 0 | 5 | **40** | Track 1 candidate; verify submission |
| 33 | 33 | [Jonathan2055/nisr-planting-window-advisor](#project-20) | 10 | 0 | 0 | 0 | 0 | **10** | Not implemented in public repo |
| 34 | 34 | [nsanzimanaadolphe9-eng/data-driven-agricultural-decision-support-platform-for-Rwanda](#project-23) | 0 | 0 | 0 | 0 | 0 | **0** | Not implemented in public repo |

### Scope interpretation of the ranking

The table is an **engineering/prototype comparison of 34 URLs**, so every requested URL is preserved. It is not a list of 34 confirmed entrants. The AgriTwin sibling is not established as an independent team. Umurima identifies another contest; SAIP's track claim conflicts with the official tracks. The two code-free repositories remain concepts/external links. These statuses must remain visible if this table is reused.

Excluding the sibling and the two competition-conflict entries from a *candidate* subset does not establish anyone else's eligibility. All three score below project44, so that exclusion would leave its 14 higher-scoring comparators unchanged. Do not label this a verified Track 1 placement.

## 4. Project44: what is actually implemented

| Capability | Evidence-based status | Limits |
|---|---|---|
| Published agricultural data ingestion | Implemented Python preparation, source manifests and local import path | Counts below are committed preparation-report claims, not a freshly reproduced import |
| Source-linked table/report library | Implemented original tables, source references and report/page catalogue | Actual private raw inputs and deployed database contents not reconstructed |
| Seasonal crop comparisons | Implemented; Explore explicitly withholds incomplete/incompatible totals | Older overview/report/alert paths do not enforce the same rules |
| Rwanda district maps | Implemented geographic shapes, comparison/quality states and saved evidence | One district crop choice is not farm-level precision |
| Historical weather/climate context | Implemented NASA POWER and ERA5 request/validation/cache/spatial logic | Historical model estimates, not live crop forecasts or station observations |
| Meteo Rwanda integration | Adapter implemented, with an explicit not-configured state | Authorized delivery and operating connection not established |
| Evidence findings/reports | Implemented local server-preserved map/climate findings and CSV/print/report views | SavedMapFindings UI is local-only; hosted ReportFinding schema is not in repository |
| Investigations/follow-ups/notes | UI, schemas and some creation paths exist | Generic local create/update/delete are unavailable; full local close-out is incomplete |
| Authentication and roles | Implemented local cookies/hashing/throttle/origin checks and client panel guards | Base44 record rules are broader than the panel separation; privileged endpoints have gaps |
| Farmer/cooperative/business workspace | Planned | Source explicitly says tools are not active |
| Validated yield forecast, disease ML, irrigation allocator, message delivery | No corresponding product implementation found in this snapshot | Optional expansions, not automatically Track 1 violations |
| Automated tests | Executed: 74/74 pass | No pinned GitHub workflow in tree; current suite misses the six reproduced edge cases |

Sources: [scripts/prepare-full-data.py:1](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/scripts/prepare-full-data.py#L1); [src/lib/explore-data.js:30](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/explore-data.js#L30); [src/components/maps/DistrictMap.jsx](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/maps/DistrictMap.jsx#L1); [src/lib/weather.server.js:38](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/weather.server.js#L38); [src/lib/weather-spatial.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/weather-spatial.js#L1); [src/components/maps/SavedMapFindings.jsx:14](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/maps/SavedMapFindings.jsx#L14); [src/api/localClient.js:20](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/api/localClient.js#L20); [src/components/panels/CommunityBusinessPanel.jsx:24](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/panels/CommunityBusinessPanel.jsx#L24).

### Important corrections to an over-harsh audit

- **Not only a mock dashboard:** the committed import report records 55,394 normalized observations, 17 datasets, 1,161 source tables, years 2018–2026 and Seasons A/B/C. It includes 26 crop categories including subtypes, with 19 main categories. These are manifest counts, not independently verified deployed row counts. [migration/real-data-import-report.json](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/migration/real-data-import-report.json#L1)
- **Not missing data provenance:** source cells, source releases, hashes, source tables and report references are implemented. The local preparation avoids treating raw respondent rows as national totals. [scripts/prepare-full-data.py:57](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/scripts/prepare-full-data.py#L57); [src/lib/source-provenance.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/source-provenance.js#L1)
- **Not missing weather quality controls:** units, coordinate/time checks, missing-day handling, bounds, spatial overlap, cache status, timeouts/retries and provider limits exist. [src/lib/weather-era5-provider.js:8](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/weather-era5-provider.js#L8); [src/lib/weather-service.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/weather-service.js#L1)
- **Not using an LLM to invent change explanations:** `explainChange` is deterministic and explicitly separates reported differences from causal explanations. The AI adapter alone does not establish an active AI product. [src/lib/explain.js:11](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/explain.js#L11); [src/lib/ai.server.js:8](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/ai.server.js#L8)
- **Not missing tests or login safeguards:** local sessions use HttpOnly cookies, bounded password input, hashing, expiry, revocation, rate limiting and same-origin checks. Do not confuse development-only quick login with an automatically exposed production bypass. [src/lib/local-auth.server.js:2](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/local-auth.server.js#L2); [src/lib/local-auth-service.js:59](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/local-auth-service.js#L59); [src/lib/local-quick-login.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/local-quick-login.js#L1)
- **Not required to re-estimate microdata just to display published NISR estimates:** reproducing published aggregates can be legitimate. Uncertainty and comparison limitations still need clear handling.

## 5. Submission and product gaps

### S1 — Public submission packaging is not ready in the reviewed evidence — P0 before submission

Connected GitHub metadata reports project44 as **private**. That conflicts with the published requirement for a public GitHub submission link. The repository's homepage field is empty; that does not prove the app has no deployment. A working public app link, official team/track declaration, user guide and submission receipt were not established. [Repository](https://github.com/bisangwa-lab/project44); [NISR rules](https://gis.statistics.gov.rw/about/hackathon/2026-hackathon-competition).

**Required improvement:** prepare a public-safe submission package: documented app URL, exact snapshot, public/reviewer access instructions, data acquisition instructions, source/licence acknowledgements, AI-use disclosure, originality statement, two-person team/eligibility evidence and Track 1 declaration. Review private inputs/credentials before changing visibility. This audit did not change repository visibility or publish anything.

### S2 — README describes the starter rather than HingaSmart — P1

The README still introduces a Base44 starter, including a `src/routes/index.jsx` example, rather than the actual product's user/decision/data flow. Local setup also retains an older 2,160-row/six-crop description while the newer import manifest describes substantially broader data. These contradictions make judging and reproduction harder. [README.md:5](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/README.md#L5); [LOCAL_SETUP.md:69](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/LOCAL_SETUP.md#L69); [migration/real-data-import-report.json](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/migration/real-data-import-report.json#L1)

**Acceptance:** a new reader can identify the farmer/planner problem, see one concrete decision walkthrough, distinguish local versus hosted behavior, reproduce the chosen data release, run checks, and open the deployed prototype using only current instructions. A documentation claim such as “all checks passed” must name the snapshot and actual checks.

### S3 — Broad role promise exceeds delivered farmer/business value — P1

Farmer, cooperative, buyer and agribusiness roles lead to a panel whose source explicitly marks all six tools as planned. These users cannot yet perform the stated crop/area/guidance/saved-interest workflow there. [src/lib/rbac.js:26](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/rbac.js#L26); [src/components/panels/CommunityBusinessPanel.jsx:30](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/panels/CommunityBusinessPanel.jsx#L30)

**Decision:** either deliver one small useful farmer workflow, or make the submission explicitly a planner/officer evidence tool and label community roles as roadmap. Do not count planned cards as completed functionality. Low-bandwidth or Kinyarwanda delivery should be chosen from target-user evidence, not added merely to inflate the feature count.

### S4 — Decision benefit and field outcomes are not demonstrated — P1

Source code supports investigation and descriptive comparison; the inspected materials do not establish a user study, successful pilot or measured outcome. This limits Tangible Impact credit. It is not proof that no user has ever tried the app.

**Acceptance:** document a small observed evaluation with intended users: task, starting evidence, action selected, completion time, errors, understanding of uncertainty and follow-through. Compare against the current spreadsheet/manual process. Keep hypothetical production gains separate from measured task improvements.

## 6. Reproduced statistical and data-quality defects

The six probes below used deliberately constructed inputs to expose acceptance-rule differences. They establish behavior of these functions; they do not establish that the committed NISR data currently contain every trigger.

### D1 — Alert rules convert missing values to zero — P0

`evaluateAlerts` uses `Number(row.value)`, so `null` becomes `0`. A probe with a previous production value of 100 and a current null produced a **−100% production alert with current value 0**. That contradicts the application's missing-data principle. [src/lib/alert-rules.js:54](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/alert-rules.js#L54)

It also indexes by crop/district/season/year without release/unit validation, overwrites duplicate indicator values, and compares the latest two available years even if they are non-adjacent. These are further code-observed weaknesses, not separately executed production incidents.

**Fix:** use the same validated source-cell/comparability engine as Explore; reject null, blank, non-finite, forecast and incompatible rows; reject ambiguous duplicate/release pairs; require adjacent years for a “year-on-year” label or name the actual interval. Store the exact records, units and releases used by each alert. Regression checks must cover null, a genuine source zero, duplicate rows, wrong units, a year gap and mixed releases.

### D2 — Shared yield engine accepts incompatible units — P0

The more careful climate/Explore paths check units; `yieldFromRows` only checks indicator pairing and equal `dataset_id`. A probe with **1,000 kilograms** of production and one hectare returned **1,000** in an engine whose displayed yield unit is tonnes/ha; a correct conversion would be 1 t/ha. Empty release IDs can also compare equal, since a nonempty ID is not required there. [src/lib/metrics.js:29](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/metrics.js#L29); [src/lib/climate-analysis-model.js:10](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/climate-analysis-model.js#L10)

**Fix:** enforce canonical units, nonempty matching releases and valid observation status centrally. If conversions are supported, record them explicitly. Never let a chart and a printed report disagree because they use different eligibility rules.

### D3 — Overview/report totals can silently be partial — P1

`totalsForPeriod` skips missing values and sums remaining observations. The probe returned 100 for a scope containing one 100-valued district and another null-valued district. Overview completeness uses loaded rows as its expected denominator; entirely absent district/crop cells are not counted. Reports contain another independent summation helper. Explore, by contrast, builds an expected scope and withholds incomplete totals. [src/lib/metrics.js:115](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/metrics.js#L115); [src/hooks/useOverviewData.js:63](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/hooks/useOverviewData.js#L63); [src/routes/_authed/reports.jsx:38](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/routes/_authed/reports.jsx#L38); [src/lib/explore-data.js:94](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/explore-data.js#L94)

The UI does say “available source cells,” and warns that historical crop categories can differ. Those are useful disclosures. The problem is the inconsistent default semantics, not an assertion that the UI claims survey confidence everywhere.

**Fix:** use one scope-aware calculation result with `value`, `status`, `expected`, `present`, source versions and warnings across overview, map, alerts, report and export. Either withhold incomplete totals or prominently call them partial. Comparisons need a common crop/district set; a changing coverage set must not appear to be production growth.

### D4 — Forecast-status rows can enter observed map/climate outputs — P0

The map excludes demo records but does not reject `observation_status='forecast'`. `cropSeason` rejects `is_forecast` and forecast-like quality labels, yet omits that explicit status field. A probe containing forecast-status production=100 and area=10 returned **yield=10** in both paths. Explore rejects the same forecast status. [src/lib/district-map.js:6](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/district-map.js#L6); [src/lib/climate-analysis-model.js:7](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/climate-analysis-model.js#L7); [src/lib/explore-data.js:24](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/explore-data.js#L24)

**Fix:** normalize the observation type once, allow only the intended types for each analysis, and carry that type to map legends, saved findings and exports. Test every legacy/current forecast flag and conflicting flags. No need to remove forecasts from the product; they need their own explicitly labeled views.

### D5 — CSV validation accepts Infinity and drops row-level warning detail — P1

The validator uses `Number.isNaN` rather than `Number.isFinite`. The probe imported the string `Infinity` as an accepted value with an empty `quality_flags` array. Suspicious-value warnings are accumulated separately, while the import payload again writes `quality_flags: []`. Thus a warning can remain in a batch log without following the affected row into charts. [src/lib/validation.js:91](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/validation.js#L91); [src/lib/validation.js:130](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/validation.js#L130); [src/components/data/CsvImportPanel.jsx:72](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/data/CsvImportPanel.jsx#L72)

The UI validates before import, but entity schemas do not reproduce all that domain validation. A browser-side check is not an authorization or data-integrity boundary. The parser also tolerates malformed quoting/row-width inconsistencies rather than producing a strict parse error. [src/lib/csv.js:4](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/csv.js#L4); [base44/entities/AgriculturalObservation.jsonc](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/base44/entities/AgriculturalObservation.jsonc#L1)

**Fix:** validate finite values and all indicator units/statuses on the server; preserve row-level quality reasons and source details. Reject malformed CSV with precise row errors. Stage an import with checksum, duplicate/revision policy, validated row count and transaction/batch recovery semantics.

### D6 — Shared CSV serialization does not neutralize formula text — P1, conditional export risk

The probe `toCsv([{note:'=1+1'}])` returned `note\n=1+1`; CSV quoting alone does not make that text inert in spreadsheet software. Investigation/report exports include free-text fields. The newer SavedMapFindings component already has a local `safeText` function, demonstrating that the protection exists only in one path. [src/lib/csv.js:63](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/csv.js#L63); [src/routes/_authed/reports.jsx:216](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/routes/_authed/reports.jsx#L216); [src/components/maps/SavedMapFindings.jsx:12](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/maps/SavedMapFindings.jsx#L12)

**Fix:** one export policy for text columns beginning with formula/control prefixes, with tests for commas, quotes, newlines and whitespace-prefixed formulas. Preserve intended numeric negatives as numbers. This is an export behavior finding; no spreadsheet exploit was executed.

### D7 — Published uncertainty tables are not integrated into analytical confidence — P1

The library can retain survey-quality worksheets, and uses published estimates rather than naively summing microdata. However, the comparison/alert paths reviewed do not propagate source standard errors, CVs, design information or confidence intervals into change judgments. A large percentage change or a complete set of cells is not evidence of statistical significance. [scripts/prepare-full-data.py:41](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/scripts/prepare-full-data.py#L41); [src/lib/metrics.js:57](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/metrics.js#L57); [src/lib/alert-rules.js:24](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/alert-rules.js#L24)

**Fix:** attach published precision flags/intervals when available; otherwise say precision is unavailable. Separate source availability, comparability and statistical uncertainty. Do not invent confidence intervals from the 30 district point values. If microdata estimates are later added, use the actual survey design/weights/PSUs/strata and document the estimand. AgriTwin provides design-aware code worth studying; its definitions must be checked rather than copied blindly. [src/agritwin/survey/core.py](https://github.com/Elthiero/agritwin-rwanda/blob/a9d35452ff0e39f658025e5d017a58adf6f016f0/src/agritwin/survey/core.py#L1)

### D8 — Quality flags and reconciliation need operational gates — P1

The committed preparation report contains **4 failed checks out of 564 district/national reconciliation checks** and 2,563 missing observation cells. Those counts are not evidence that 560 checks were independently rerun here. The preparation code preserves differences and changes a dataset to provisional, which is good. Per-observation `quality_status` is initially “verified”; downstream users need both row and release-level qualification. [migration/real-data-import-report.json](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/migration/real-data-import-report.json#L1); [scripts/prepare-full-data.py:105](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/scripts/prepare-full-data.py#L105)

**Fix:** expose the failed check, source table/cell, difference, tolerance and investigation disposition. Gate affected aggregates or visibly qualify them. Name “verified” as “source extracted/validated” if that is all it means; do not imply NISR has independently certified the app's transformation. Retain all source figures unchanged while resolving discrepancies.

## 7. Security findings

Severity below concerns the inspected source path. Deployed exploitability depends on whether that path, permissions and platform configuration are active. None was tested destructively.

### SEC1 — Unauthenticated demo endpoint uses service privileges — P0, critical if deployed

`GET /api/demo-data` counts records through `asServiceRole`; POST takes the same service client and can bulk-create datasets, observations and alerts. The route has no `requireUserRoute`, signature, role check or development-only guard. Global request middleware supplies a client; it does not authenticate the caller. The local service client rejects service-role operations, so this is principally the Base44 path. [src/routes/api/demo-data.js:33](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/routes/api/demo-data.js#L33); [src/routes/api/demo-data.js:42](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/routes/api/demo-data.js#L42); [src/lib/auth-middleware.js:28](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/auth-middleware.js#L28); [src/lib/local-auth.server.js:65](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/local-auth.server.js#L65)

The slice count/offset controls bound a single request but do not provide authorization, safe retry or duplicate prevention for repeated unrestricted calls. Appended demo data can contaminate calculations that lack demo isolation.

**Fix before public deployment:** remove the endpoint from public production or require a verified administrator on the server; enforce origin/CSRF policy where cookie authentication applies; reject unsupported inputs; make a seed operation idempotent under a unique seed/run version and apply a bounded job budget. Prefer a controlled setup command or admin-only job. Verify anonymous and ordinary-user calls cannot read privileged counts or write anything.

### SEC2 — Signed-in users can invoke privileged alert generation — P0

`regenerateAlerts` adds `requireUser` and then immediately uses `asServiceRole`; it does not check a managerial role. The browser button being hidden is irrelevant to direct server-function calls. [src/lib/server-fns.js:20](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/server-fns.js#L20)

**Fix:** explicit server allowlist, per-job limits, concurrency/idempotency protection and an audit event with actor/run/source version. Test ordinary/public/farmer users as well as signed-out users.

### SEC3 — Base44 record permissions do not match panel separation — P0/P1 by data sensitivity

The Investigation schema permits every platform `role='user'` to read/create/update investigations, regardless of workspace role, assignee or district. Follow-up and note schemas use similarly broad user conditions. The frontend distinguishes farmer/public/analyst/officer roles, but that does not narrow a direct entity request. Local reads restrict some collections to occupational roles but do not filter individual investigations by owner/assignment/geography. [base44/entities/Investigation.jsonc:98](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/base44/entities/Investigation.jsonc#L98); [base44/entities/FollowUpAction.jsonc:45](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/base44/entities/FollowUpAction.jsonc#L45); [base44/entities/InvestigationNote.jsonc:37](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/base44/entities/InvestigationNote.jsonc#L37); [src/lib/rbac.js:73](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/rbac.js#L73); [src/lib/local-data-service.js:29](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/local-data-service.js#L29)

**Fix:** first state the intended sharing model. If all officers intentionally share all cases, document it. If cases/notes are restricted, enforce that rule at record access and every mutation, using trusted server roles. Add direct API tests for cross-role and cross-assignment access. The reviewed User schema's workspace-role enum also contains only three legacy values while the frontend defines many more canonical roles; reconcile this contract. This audit does **not** establish a platform-level self-role-escalation exploit. [base44/entities/User.jsonc](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/base44/entities/User.jsonc#L1)

### SEC4 — Dependency advisory remains in the pinned lock — P1

The lockfile resolves Zod **4.4.3**. The saved audit reports one high-severity Zod item and two low-severity Quill-related items. The current GitHub advisory lists Zod versions below 4.6.6 as affected by resource exhaustion under its described array-validation conditions. This does not establish reachability through project44's current bounded object schemas. [package-lock.json](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/package-lock.json#L1); [migration/npm-audit.json](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/migration/npm-audit.json#L1); [GitHub Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

**Fix:** update to a compatible patched version after checking release compatibility, rerun the dependency audit and meaningful tests, and bound request bodies/collections before expensive parsing. Review whether Quill is used at all before retaining the dependency. Do not apply a blind downgrade merely because an automated audit suggests one.

### SEC5 — Preserve the security controls already present

Keep the local same-origin checks, HttpOnly/SameSite cookies, random session tokens, stored token hashes, login throttle, least-privilege registration and disabled production quick login. Existing safeguards deserve credit. Production-specific rate-limiting, account recovery and identity operations still require deployment evidence. Local auth intentionally rejects non-loopback hosts; it is not a ready-made public hosting mode. [src/lib/local-auth.server.js:14](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/local-auth.server.js#L14); [src/lib/local-auth-service.js:47](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/local-auth-service.js#L47)

## 8. Reliability, workflow and UX gaps

### R1 — Local investigations cannot complete the ordinary lifecycle — P0 for the claimed workflow

The local client makes generic create/update/delete/bulkCreate throw “not yet available.” Map-specific server functions can create a case or finding, so “investigations entirely missing” would be false. However, the case detail, follow-up and observation UIs invoke those unavailable generic mutations. Users can reach apparent save/close/follow-up actions that fail in local mode. [src/api/localClient.js:10](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/api/localClient.js#L10); [src/lib/district-review-service.js:43](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/district-review-service.js#L43); [src/components/investigations/FollowUpPanel.jsx:33](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/investigations/FollowUpPanel.jsx#L33); [src/routes/_authed/investigations.$investigationId.jsx:76](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/routes/_authed/investigations.%24investigationId.jsx#L76)

**Fix:** implement authenticated, authorized local mutations with schema validation, audit history and explicit status transitions; or suppress/disable unavailable actions with an honest explanation. Acceptance is a full case: source anomaly → assigned investigation → evidence note → follow-up → completed outcome → report, persisting after reload and rejecting an unauthorized editor.

### R2 — Local/hosted feature parity is unproven — P1

The normalized source library and local collections include entity types absent from the eight committed Base44 entity schemas. `runSaveClimateFinding` calls `entities.ReportFinding.create` in hosted mode, while no ReportFinding schema is in this tree and SavedMapFindings is local-only. That is a **repository/configuration gap**, not proof that a remote dashboard entity does not exist. [src/lib/climate-analysis.server.js:35](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/climate-analysis.server.js#L35); [src/components/maps/SavedMapFindings.jsx:15](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/maps/SavedMapFindings.jsx#L15); [src/lib/local-data-service.js:3](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/local-data-service.js#L3)

**Fix:** maintain one documented capability matrix and deployable schema/migration source for the selected target. Demonstrate data publication, authorization, saved findings and report retrieval on that target. Avoid pitching local-only data/workflows as proven hosted capabilities.

### R3 — Import is append-only and can partially succeed — P1

CSV import bulk-creates chunks of 250, then writes an ImportLog. A late failure leaves earlier chunks stored; retrying can duplicate rows. Existing-row duplicates are not checked by the per-file `seen` set. The generic catch message can say no rows were reported as stored even when earlier chunks were written. [src/components/data/CsvImportPanel.jsx:76](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/data/CsvImportPanel.jsx#L76); [src/components/data/CsvImportPanel.jsx:106](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/data/CsvImportPanel.jsx#L106); [src/lib/validation.js:36](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/validation.js#L36)

**Fix:** stage/validate first, use stable natural keys plus release/revision identity, then commit or resume a logged run. Show exact stored/rejected/pending counts. Test a second-batch failure, retry, same-file reimport and a legitimate new release.

### R4 — Operational lists are capped without complete-list semantics — P1/P2

Agricultural `fetchAll` follows cursors and detects bad cursors, which is good. Alerts/investigations/actions/notes/datasets use one page with limits such as 400/300/100/200/60, and saved findings use 100. The map's server evidence capture reads only the first 1,000 crop rows. Current single-crop/district volumes may fit; future growth or duplicates can truncate evidence or queues. [src/lib/fetch-all.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/fetch-all.js#L1); [src/hooks/useAgriRecords.js:44](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/hooks/useAgriRecords.js#L44); [src/components/maps/SavedMapFindings.jsx:14](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/maps/SavedMapFindings.jsx#L14); [src/lib/district-review-service.js:20](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/district-review-service.js#L20)

**Fix:** provide visible pagination or full-query traversal as appropriate, stable ordering and count semantics. For evidence capture, fetch the exact selected periods and fail visibly on incomplete data. Test queue counts and snapshots beyond each limit; do not assert that current data already exceed every threshold.

### R5 — Weather persistence/rate controls depend on deployment mode — P1

D1 provides persisted cache and an atomic limiter. The alternative uses edge cache plus in-memory request counters/events, so those counters are per process/isolate rather than a globally durable provider budget. `wrangler.jsonc` contains a placeholder local D1 database ID; authorized Meteo data are optional. [src/lib/weather.server.js:14](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/weather.server.js#L14); [src/lib/weather-store.js:22](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/weather-store.js#L22); [wrangler.jsonc](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/wrangler.jsonc#L1)

**Fix:** configure and demonstrate the intended durable weather store/provider budget on the deployed target, with health/readiness and last-success evidence. Keep the explicit stale/unavailable states and do not silently replace Meteo with another provider. Exercise cold-cache, warm-cache, timeout, 429, partial history and restart scenarios. Existing unit tests already cover many provider failure mechanics; deployment behavior is the remaining evidence gap.

### R6 — Verification does not yet prove deployment or full user journeys — P1

The existing 74 tests, lint and build passed. The build warned that missing `VITE_BASE44_APP_ID` would make hosted API calls fail in that configuration. This audit intentionally did not supply private runtime settings. A successful bundle is not a successful hosted app. No GitHub Actions workflow is present in the pinned project44 tree; the package scripts omit a test command, though Node tests run directly. [package.json:6](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/package.json#L6); [vite.config.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/vite.config.js#L1)

**Fix:** one repeatable check command and CI for the selected deployment; build with real deployment configuration; then smoke-test login, role denial, complete data retrieval, compare/map/report consistency and case close-out. Add targeted regression coverage for the six confirmed defects. Do not replace working provider/auth tests with superficial UI assertions.

### UX1 — Users need one clear next action — P1

The UI has sources, filters, empty states, warnings and maps, so it is not reasonable to say it lacks UX altogether. The remaining product issue is converting a change into a practical next action while retaining uncertainty: “Review Huye maize in Season B; these cells support the change; these facts remain unknown; assign this check; record the result.” Remove or clearly distinguish unavailable role tools and local-only buttons.

### UX2 — Localization, mobile and offline support are opportunities, not proven universal requirements — P2

No equivalent end-to-end Kinyarwanda UI or offline submission/reconciliation path was found in the reviewed project44 source. Competitors have source-level localization and offline-support components. That does not prove their translations are correct or that their offline writes are safe. Test the actual target users' devices/language before choosing the feature. A basic offline read-only saved brief may be a better first step than offline case editing.

### UX3 — Use interpretation-safe language — P1/P2

Keep production (t), published yield (kg/ha), derived yield (t/ha), source completeness and uncertainty distinct. A climate threshold is exploratory, not an official warning. A ranked district is a review priority, not a measured causal diagnosis. Project44 already has useful limitations text; make the calculation contracts enforce the same promises. [src/lib/weather-model.js:86](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/weather-model.js#L86); [src/lib/explain.js:99](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/explain.js#L99)

## 9. Competitor features project44 lacks or partially implements

This table identifies transferable capabilities, not a requirement to copy code or add every feature. Preserve sources, licences and originality. “No equivalent” means none found in the reviewed snapshot. A competitor's code demonstrates a mechanism, not validated agricultural efficacy.

| Capability and competitor evidence | Project44 status | What to learn / condition for adding it |
|---|---|---|
| **Irrigation budget allocation, cost/payback and rank uncertainty — Kuhira.** [src/kuhira/plan.py:188](https://github.com/thepreakerebi/kuhira/blob/8075aa943f7ca7358f799b04932d4c30c4ccd510/src/kuhira/plan.py#L188); [src/kuhira/plan.py:150](https://github.com/thepreakerebi/kuhira/blob/8075aa943f7ca7358f799b04932d4c30c4ccd510/src/kuhira/plan.py#L150) | No equivalent allocation engine | Add only for a planner investment question, with water feasibility, dated costs and sensitivity. Observational irrigation associations are not treatment effects. |
| **Crop-specific peer and upper-quartile yield benchmarks — Yield-Gap Explorer.** [src/yield_gaps.py:27](https://github.com/PAZZO123/yieldgap-rwanda/blob/439e7b4d90f18ac0713661e0c8a066f8f3c53c2b/src/yield_gaps.py#L27); [src/peer_districts.py:139](https://github.com/PAZZO123/yieldgap-rwanda/blob/439e7b4d90f18ac0713661e0c8a066f8f3c53c2b/src/peer_districts.py#L139) | Partial: district comparison exists, validated peer selection does not | Retain comparable crop/season definitions and minimum support; label the benchmark descriptive rather than attainable yield. |
| **Design-aware estimates and model validation — developed AgriTwin.** [src/agritwin/survey/core.py](https://github.com/Elthiero/agritwin-rwanda/blob/a9d35452ff0e39f658025e5d017a58adf6f016f0/src/agritwin/survey/core.py#L1); [src/agritwin/models/nowcast.py](https://github.com/Elthiero/agritwin-rwanda/blob/a9d35452ff0e39f658025e5d017a58adf6f016f0/src/agritwin/models/nowcast.py#L1) | Published-estimate display exists; no equivalent microdata variance/nowcast pipeline | Valuable if adding original inference. Keep source estimands/area definitions separate; retrospective cross-validation is not live future-season evidence. |
| **Model registry, temporal weighted training and quantile checks — AgriLens.** [apps/ml/services/training.py:265](https://github.com/ndolijeandamascene/agrilens/blob/664f152cffdfa57454f262e0726032d0e8a36312/apps/ml/services/training.py#L265) | No active agricultural model registry/training product found | Add only when a model improves a baseline and the team can maintain data/version/evaluation lineage. An installed AI SDK earns no model credit. |
| **Post-harvest cooperative assessment and benchmarked loss/RWF breakdown — Harvest Loss Tracker.** [backend/scoring_service.py:36](https://github.com/Jacksonsod/post-harvest-loss-tracker/blob/b6685f14f2456e28a49796aaba83ca9f9423e4cb/backend/scoring_service.py#L36); [backend/benchmark_service.py](https://github.com/Jacksonsod/post-harvest-loss-tracker/blob/b6685f14f2456e28a49796aaba83ca9f9423e4cb/backend/benchmark_service.py#L1) | No equivalent measured loss-assessment product | Build from user-entered loss/harvest records, explicit prices and reliable benchmark definitions. Do not import its abandoned ML model as an advantage. |
| **Source-grounded action briefs — Musaruro and AII.** [src/actions.py:36](https://github.com/DIVINEakisa/Musaruro/blob/86cdadf39b5527a444dd4f918b590fa770b9194a/src/actions.py#L36); [src/features/intelligence/agriculturalSignalEngine.ts:169](https://github.com/remy-shingiro/aii-agri-intervention/blob/efc12c51148521c32085e804314e5294386251b9/src/features/intelligence/agriculturalSignalEngine.ts#L169) | Partial: explanations, findings and reports exist | Strengthen the evidence → question → owner → due date → outcome flow. This is the closest fit to the current product. |
| **Field reports linked to historical baselines — Season Pulse.** [core/db.py:39](https://github.com/Muhinde234/season-pulse/blob/00495ec15cc5efe38efbf1cb9dba062f98c07328/core/db.py#L39); [core/risk.py:29](https://github.com/Muhinde234/season-pulse/blob/00495ec15cc5efe38efbf1cb9dba062f98c07328/core/risk.py#L29) | Partial: investigation/observation UI exists; local writes incomplete | Complete real reporting first. Do not copy its hand-selected log-index coefficients as a calibrated forecast. |
| **Seasonal planning and controlled messaging — AgriMenya.** [backend/app/services/seasonal_planner.py](https://github.com/iiradukunda-dev/agrimenya/blob/df4f82243467c68207f62686a61230c2fb1bc025/backend/app/services/seasonal_planner.py#L1); [backend/app/services/whatsapp/dispatcher.py](https://github.com/iiradukunda-dev/agrimenya/blob/df4f82243467c68207f62686a61230c2fb1bc025/backend/app/services/whatsapp/dispatcher.py#L1) | No comparable plan/action/messaging delivery flow | Plans need editable assumptions, ownership and outcome logging. Confirm mock/live status, consent, credentials and delivery receipts before claiming alerts are sent. |
| **Model explanations with survey-only evaluation views — HarvestWatch.** [api/services/store.py:283](https://github.com/BodeMurairi2/food_supply_earlyWarning/blob/2b33bacf487dd5aecbcf415398ec2cf6b9ec13db/api/services/store.py#L283); [api/services/store.py:84](https://github.com/BodeMurairi2/food_supply_earlyWarning/blob/2b33bacf487dd5aecbcf415398ec2cf6b9ec13db/api/services/store.py#L84) | No predictive SHAP panel; deterministic descriptive explanations already exist | Add only alongside a defensible model. Avoid HarvestWatch's future-informed interpolated-label issue. SHAP is not causal attribution. |
| **Human review before source publication — Umusaruro.** [engine/ingest.py:102](https://github.com/GQueen160/umusaruro/blob/9b87469efff8233150740a6b7320dc2d8e1dec7a/engine/ingest.py#L102) | Partial: validation/provenance exists; no equivalent robust local publish workflow | Stage imports, retain reviewer/run history and publish atomically; it addresses a current trust gap. |
| **Localized, short risk communication — AgriGuard.** [agriguard/risk.py:120](https://github.com/sandwich808-yum/AgriGuard/blob/576cdd635c63cd20db4cdfdeef360e397548ff81/agriguard/risk.py#L120); [agriguard/weather.py:55](https://github.com/sandwich808-yum/AgriGuard/blob/576cdd635c63cd20db4cdfdeef360e397548ff81/agriguard/weather.py#L55) | No equivalent localized message product found | Start with reviewable text previews and source freshness. A preview is not live SMS. |
| **Disease-image workflow — Agri AI / CropPulse / IREME.** [backend/app/ml/predictor.py:70](https://github.com/Honore777/Agri_Ai_and-Climate-alert-system/blob/fce5ab19068d71d869822da766647f26313b0c0f/backend/app/ml/predictor.py#L70); [backend/crop_disease_model.py:41](https://github.com/tnkurunziza300-developer/croppulse-rwanda/blob/dd856522a32ec410363e7a383781ed7faf68b88d/backend/crop_disease_model.py#L41) | No equivalent | Optional, weak fit for current scope unless user evidence supports it. Never copy the fixed “healthy” fallback; require model/version/field validation and abstention. |
| **Feature-phone SMS access — Umurima.** [backend/app/advisor.py](https://github.com/Dawit-Getachew/umurima/blob/9a119ace8274327e3dd779d0288a00d2f35947b9/backend/app/advisor.py#L1) | No equivalent | Adjacent-contest inspiration only, not a confirmed NISR opponent. Costs, consent, language review and failure handling must be demonstrated. |

**Features you should not claim to lack:** maps, agricultural data sources, seasonal comparison, weather context, CSV export, source citations, authentication, role navigation, tests, saved findings or all investigation creation. Each exists at least in part. The appropriate improvements are consistency, completion and verification.

## 10. Prioritized improvement plan

Effort bands below are scope estimates, not delivery promises: **S** = a focused change; **M** = several related changes; **L** = substantial data/product integration. Sequence by risk and dependency, not by the largest competitor's page count.

| Priority/order | Improvement | Why it matters | Effort | Concrete acceptance evidence |
|---|---|---|---|---|
| **P0.1** | Remove/gate demo service endpoint; authorize alert jobs | Prevent privileged writes/data contamination | S–M | Anonymous/ordinary-user calls denied; administrator job idempotent; actor/source run logged |
| **P0.2** | Align entity/server permissions with intended sharing | Protect investigations and notes regardless of UI | M | Direct cross-role/assignment tests, documented sharing policy, least-privilege schemas |
| **P0.3** | Centralize observation eligibility, units, missingness and comparisons | Stop false alerts and inconsistent official-looking numbers | M | Six probe regressions corrected; same selected scope yields identical values in Explore, overview, map, alert and report |
| **P0.4** | Complete or honestly disable local case mutations | Turn investigation promise into a usable workflow | M | Source → case → assignment → note → action → closure → report persists after reload |
| **P0.5** | Prepare safe, current submission package | Meet actual submission/access requirements | S–M | Public-safe repo and reachable app, current README, data/reproduction guide, AI/originality/source disclosures, eligibility/submission evidence |
| **P1.1** | Server-side staged/idempotent import and row-level quality | Avoid partial/duplicate/untraceable data | M | Retry/second-batch/revision/invalid-value tests; exact stored counts; source hashes retained |
| **P1.2** | Integrate precision/comparability/reconciliation states | Prevent overconfident statistical interpretation | M | Source SE/CV where available, explicit unavailable precision, four reconciliation failures surfaced and disposition recorded |
| **P1.3** | Deploy the intended auth/data/weather store and reproduce a clean run | Convert local code into a reviewable prototype | M | Correct environment configuration; fresh install/import; public smoke test; no live-data claim without traceable retrieval |
| **P1.4** | Patch/review dependencies and add focused CI | Reduce known risk and regressions | S–M | Patched compatible lock, current audit, unit/auth/data checks, role-aware journey tests |
| **P1.5** | Pagination, job budgets and observability | Keep evidence/queues complete as data grow | M | Beyond-limit queue tests; bounded weather jobs; failure/last-success visibility; backup/restore demonstration |
| **P1.6** | Evaluate the core planner/officer task with real users | Earn impact/usability evidence | M | Recorded task study and changes; no invented yield/profit outcome claims |
| **P2.1** | Source-grounded action briefs and case prioritization | Closest competitor advantage to current architecture | M | Each action has evidence, uncertainty, owner, due date and outcome; optional advice clearly distinguished from diagnosis |
| **P2.2** | Comparable crop-specific peer benchmarking | Help planners interpret district shortfalls | M | Peer support thresholds, nested validation if tuned, no cross-crop tonne opportunity sum, dated price basis |
| **P2.3** | Kinyarwanda/mobile/offline read-only briefs | Improve target-user access if user study supports it | M | Native-language review, small-screen/low-bandwidth tasks, dated cached brief and clear offline status |
| **P3** | Irrigation allocation, loss assessment, messaging or forecasts | Optional product expansion | L | Choose one documented user decision; verified inputs, baseline comparison, uncertainty, deployment and failure-mode tests |

### Recommended coherent next version

Position HingaSmart as **a planner/officer tool that turns a traceable agricultural anomaly into a completed, evidence-backed field investigation**. Its existing provenance/maps/weather pieces support that identity. The next version should let a reviewer answer five questions in one case:

1. What changed for this crop, district and season, using comparable source cells?
2. Is that difference interpretable given coverage, releases, units and uncertainty?
3. What contextual evidence and unknowns justify a field check?
4. Who owns the check, what is due, and what evidence was actually collected?
5. What conclusion/action was recorded, with a reproducible report?

That is a stronger near-term submission than adding a disease model, marketplace and forecasting tab before the core case can be saved and closed. Do not promise that implementing this plan guarantees winning; competitors, judging presentations and actual submissions remain uncertain.

## 11. Repository-by-repository scorecards and file evidence

Each profile below gives five explicit grounds in rubric order. Source links are pinned to the inspected commit; profile IDs preserve the original document's numbering, with **34** added for project44. “Reviewed files” refers to files actually fetched/read for this review, not every file in a competitor repository.

<a id="project-1"></a>

### 01. AgriTwin Rwanda — developed implementation

**Repository:** [Elthiero/agritwin-rwanda](https://github.com/Elthiero/agritwin-rwanda) · **Snapshot:** [a9d35452ff0e](https://github.com/Elthiero/agritwin-rwanda/commit/a9d35452ff0e39f658025e5d017a58adf6f016f0) · **Score:** 90/100 · **Shared rank:** 1.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | Specific early-season district/crop planning decision |
| D — Data/methodology | 20 | Survey-weighted ratio estimates and variance code; fold-safe historical validation |
| T — Technical innovation | 20 | Separate analytical models, APIs, exports and tests in tree |
| U — Usability/design | 15 | Filterable API and web application; retrospective outputs identified |
| I — Tangible impact | 15 | District briefs and scenarios; prospective outcomes unverified |

**Judgment:** Strongest source-evidence package in this set. Historical nowcasts are retrospective evaluations, not proof of live-season forecast accuracy. Survey estimates use cultivated-area definitions in this pipeline; compare definitions before importing its yield figures.

**Reviewed file evidence:** [api/app/routers/nowcast.py](https://github.com/Elthiero/agritwin-rwanda/blob/a9d35452ff0e39f658025e5d017a58adf6f016f0/api/app/routers/nowcast.py#L1) · [api/app/routers/yield_gap.py](https://github.com/Elthiero/agritwin-rwanda/blob/a9d35452ff0e39f658025e5d017a58adf6f016f0/api/app/routers/yield_gap.py#L1) · [docs/STATUS.md](https://github.com/Elthiero/agritwin-rwanda/blob/a9d35452ff0e39f658025e5d017a58adf6f016f0/docs/STATUS.md#L1).

<a id="project-2"></a>

### 02. AgriTwin Rwanda — related partial implementation

**Repository:** [ishimweaimecesar/agritwin-rwanda](https://github.com/ishimweaimecesar/agritwin-rwanda) · **Snapshot:** [362bd4a46287](https://github.com/ishimweaimecesar/agritwin-rwanda/commit/362bd4a4628770e37603086568c38f1009413117) · **Score:** 45/100 · **Shared rank:** 28.

**Scope:** Possible duplicate/sibling repository. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Same relevant AgriTwin planning concept |
| D — Data/methodology | 10 | Visible geospatial feature joins; full inference pipeline not exposed |
| T — Technical innovation | 10 | Feature mart and geographic API, with much smaller implemented surface |
| U — Usability/design | 5 | Only geographic router included in inspected app |
| I — Tangible impact | 5 | Partial prototype; independence from developed AgriTwin unresolved |

**Judgment:** Keep this URL, but do not count it as a second confirmed team. Repository size metadata says zero while its tree contains 69 files; the actual tree and files take precedence.

**Reviewed file evidence:** [src/agritwin/features/gee_mart.py](https://github.com/ishimweaimecesar/agritwin-rwanda/blob/362bd4a4628770e37603086568c38f1009413117/src/agritwin/features/gee_mart.py#L1) · [api/app/main.py](https://github.com/ishimweaimecesar/agritwin-rwanda/blob/362bd4a4628770e37603086568c38f1009413117/api/app/main.py#L1) · [README.md](https://github.com/ishimweaimecesar/agritwin-rwanda/blob/362bd4a4628770e37603086568c38f1009413117/README.md#L1).

<a id="project-3"></a>

### 03. SAIP — Smart Agriculture Intelligence Platform

**Repository:** [Theophilemaker/hackaton_saip](https://github.com/Theophilemaker/hackaton_saip) · **Snapshot:** [61e73fc87893](https://github.com/Theophilemaker/hackaton_saip/commit/61e73fc878933776bb3e4c801d7e80a0b5e09eff) · **Score:** 60/100 · **Shared rank:** 21.

**Scope:** Caution — competition/track mismatch. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Agricultural data portal and management needs |
| D — Data/methodology | 10 | CSV analysis implementation; optional binary and unsupported parsers |
| T — Technical innovation | 15 | Substantial PHP controller and analysis bridge |
| U — Usability/design | 10 | Explorer/comparison interfaces in tree; runtime unverified |
| I — Tangible impact | 10 | Useful portal concept; institutional uptake unverified |

**Judgment:** The Track 5 claim conflicts with NISR 2026's three tracks. CSV parsing exists, but Excel/PDF parsing is explicitly a placeholder, and the optional analysis binary can return unavailable. Exclude from a confirmed Track 1 roster until clarified.

**Reviewed file evidence:** [app/Helpers/NisrEngine.php](https://github.com/Theophilemaker/hackaton_saip/blob/61e73fc878933776bb3e4c801d7e80a0b5e09eff/app/Helpers/NisrEngine.php#L1) · [app/Controllers/NisrController.php](https://github.com/Theophilemaker/hackaton_saip/blob/61e73fc878933776bb3e4c801d7e80a0b5e09eff/app/Controllers/NisrController.php#L1) · [README.md](https://github.com/Theophilemaker/hackaton_saip/blob/61e73fc878933776bb3e4c801d7e80a0b5e09eff/README.md#L1).

<a id="project-4"></a>

### 04. Kuhira — irrigation investment targeting

**Repository:** [thepreakerebi/kuhira](https://github.com/thepreakerebi/kuhira) · **Snapshot:** [8075aa943f7c](https://github.com/thepreakerebi/kuhira/commit/8075aa943f7ca7358f799b04932d4c30c4ccd510) · **Score:** 85/100 · **Shared rank:** 2.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | Specific irrigation investment and farmer estimate decisions |
| D — Data/methodology | 15 | Survey/CHIRPS processing and clustered regression; observational identification limits |
| T — Technical innovation | 20 | Budget allocation, rank uncertainty and cost/payback calculations |
| U — Usability/design | 15 | Planner/farmer web surface and API present |
| I — Tangible impact | 15 | Concrete hectare and cost plans; gains remain assumptions/associations |

**Judgment:** A strong decision-focused competitor. Its p-value gate, clustered uncertainty and rank simulation are real code. Neither significance nor a scenario's RWF output proves an irrigation treatment effect or a realizable return.

**Reviewed file evidence:** [src/kuhira/plan.py](https://github.com/thepreakerebi/kuhira/blob/8075aa943f7ca7358f799b04932d4c30c4ccd510/src/kuhira/plan.py#L1) · [src/kuhira/water_bonus.py](https://github.com/thepreakerebi/kuhira/blob/8075aa943f7ca7358f799b04932d4c30c4ccd510/src/kuhira/water_bonus.py#L1) · [src/kuhira/sas.py](https://github.com/thepreakerebi/kuhira/blob/8075aa943f7ca7358f799b04932d4c30c4ccd510/src/kuhira/sas.py#L1).

<a id="project-5"></a>

### 05. Food-insecurity screening — CFSVA

**Repository:** [rcyubahiro/NISR-hackathon-food-insecurityKeRW](https://github.com/rcyubahiro/NISR-hackathon-food-insecurityKeRW) · **Snapshot:** [8b7affdb1e37](https://github.com/rcyubahiro/NISR-hackathon-food-insecurityKeRW/commit/8b7affdb1e375392d9f24383fc20995c9569ca30) · **Score:** 40/100 · **Shared rank:** 30.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Explicit CFSVA food-insecurity screening problem |
| D — Data/methodology | 10 | Survey weights, leakage exclusions and splits; one placeholder epoch |
| T — Technical innovation | 10 | Training pipeline, neural model and baselines |
| U — Usability/design | 0 | No application UI found in the five-file tree |
| I — Tangible impact | 5 | Screening potential; no validated operational model |

**Judgment:** Not merely a README: substantial training code exists. It deliberately stops at one epoch and reserves the test set for later evaluation; do not report its preliminary output as validated accuracy.

**Reviewed file evidence:** [food_insecurity_pipeline.py](https://github.com/rcyubahiro/NISR-hackathon-food-insecurityKeRW/blob/8b7affdb1e375392d9f24383fc20995c9569ca30/food_insecurity_pipeline.py#L1) · [food_insecurity_pipeline.ipynb](https://github.com/rcyubahiro/NISR-hackathon-food-insecurityKeRW/blob/8b7affdb1e375392d9f24383fc20995c9569ca30/food_insecurity_pipeline.ipynb#L1) · [README.md](https://github.com/rcyubahiro/NISR-hackathon-food-insecurityKeRW/blob/8b7affdb1e375392d9f24383fc20995c9569ca30/README.md#L1).

<a id="project-6"></a>

### 06. SmartYield Export & Post-Harvest Planner (SYEP)

**Repository:** [tiradukunda57-cpu/syep-nisr-hackathon-2026](https://github.com/tiradukunda57-cpu/syep-nisr-hackathon-2026) · **Snapshot:** [81ce3f1faa2b](https://github.com/tiradukunda57-cpu/syep-nisr-hackathon-2026/commit/81ce3f1faa2bb59f4aa81628fa7adb4d6ad719e4) · **Score:** 70/100 · **Shared rank:** 13.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | Specific post-harvest/storage/export choices |
| D — Data/methodology | 10 | Real survey processing plus demo mode; missing losses filled with zero |
| T — Technical innovation | 15 | Aggregation, classifier and scenario application |
| U — Usability/design | 15 | Interactive Streamlit workflow and storage inputs |
| I — Tangible impact | 10 | Actionable scenarios depend on entered prices, facilities and assumptions |

**Judgment:** Its post-harvest calculator is a useful feature reference, but the cleaner turns missing/negative-coded loss components into zero and substitutes missing weights with one. Do not transfer those statistical assumptions into project44.

**Reviewed file evidence:** [prepare_data.py](https://github.com/tiradukunda57-cpu/syep-nisr-hackathon-2026/blob/81ce3f1faa2bb59f4aa81628fa7adb4d6ad719e4/prepare_data.py#L1) · [app.py](https://github.com/tiradukunda57-cpu/syep-nisr-hackathon-2026/blob/81ce3f1faa2bb59f4aa81628fa7adb4d6ad719e4/app.py#L1) · [data/cold_storage.csv](https://github.com/tiradukunda57-cpu/syep-nisr-hackathon-2026/blob/81ce3f1faa2bb59f4aa81628fa7adb4d6ad719e4/data/cold_storage.csv#L1).

<a id="project-7"></a>

### 07. Rwanda Agri-Climate Resilience

**Repository:** [sinisalu2007-wq/rwanda-agri-resilience](https://github.com/sinisalu2007-wq/rwanda-agri-resilience) · **Snapshot:** [862e4f64429a](https://github.com/sinisalu2007-wq/rwanda-agri-resilience/commit/862e4f64429aa3ebbb9683259c9539d67bbbc628) · **Score:** 55/100 · **Shared rank:** 26.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Rwandan agricultural climate-risk planning |
| D — Data/methodology | 5 | Synthetic generator and placeholder source citations |
| T — Technical innovation | 15 | Time-split models, baselines and quantile code |
| U — Usability/design | 15 | Multi-page Streamlit simulator |
| I — Tangible impact | 5 | No measured agricultural evidence from the generated data |

**Judgment:** The forecasting mechanics exist. The data generator is synthetic, and the README still has source/deployment placeholders. Model intervals on that data do not establish Rwanda field performance.

**Reviewed file evidence:** [src/models.py](https://github.com/sinisalu2007-wq/rwanda-agri-resilience/blob/862e4f64429aa3ebbb9683259c9539d67bbbc628/src/models.py#L1) · [scripts/make_sample_data.py](https://github.com/sinisalu2007-wq/rwanda-agri-resilience/blob/862e4f64429aa3ebbb9683259c9539d67bbbc628/scripts/make_sample_data.py#L1) · [pages/4_Scenario_Simulator.py](https://github.com/sinisalu2007-wq/rwanda-agri-resilience/blob/862e4f64429aa3ebbb9683259c9539d67bbbc628/pages/4_Scenario_Simulator.py#L1).

<a id="project-8"></a>

### 08. AgriLens — agricultural intelligence platform

**Repository:** [ndolijeandamascene/agrilens](https://github.com/ndolijeandamascene/agrilens) · **Snapshot:** [664f152cffdf](https://github.com/ndolijeandamascene/agrilens/commit/664f152cffdfa57454f262e0726032d0e8a36312) · **Score:** 80/100 · **Shared rank:** 5.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Broad institutional agricultural intelligence |
| D — Data/methodology | 15 | Temporal split, sample-weighted regression and quantile evaluation code |
| T — Technical innovation | 20 | Integrated Django analytics/governance/ML services and tests |
| U — Usability/design | 15 | Multiple role/application workflows in tree |
| I — Tangible impact | 15 | Institutional review and insights; deployment/adoption unverified |

**Judgment:** Its temporal training, sampling weights and quantile models are visible implementations. The tiny analytics/pipeline.py file is not the substantive pipeline; the training and insights services are. Public survey files require a disclosure/licence check, not an automatic allegation of misuse.

**Reviewed file evidence:** [apps/ml/services/training.py](https://github.com/ndolijeandamascene/agrilens/blob/664f152cffdfa57454f262e0726032d0e8a36312/apps/ml/services/training.py#L1) · [analytics/pipeline.py](https://github.com/ndolijeandamascene/agrilens/blob/664f152cffdfa57454f262e0726032d0e8a36312/analytics/pipeline.py#L1) · [apps/insights/services/engine.py](https://github.com/ndolijeandamascene/agrilens/blob/664f152cffdfa57454f262e0726032d0e8a36312/apps/insights/services/engine.py#L1).

<a id="project-9"></a>

### 09. SeasonSense — crop yield forecast

**Repository:** [NickSingizwa/nisr_competition](https://github.com/NickSingizwa/nisr_competition) · **Snapshot:** [1ee11614ce3d](https://github.com/NickSingizwa/nisr_competition/commit/1ee11614ce3d1f529dd394d9898f69d8ed960320) · **Score:** 40/100 · **Shared rank:** 30.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Explicit district crop-yield forecasting problem |
| D — Data/methodology | 10 | SAS/ERA5 feature preparation; placeholder training/output |
| T — Technical innovation | 10 | GRU/embedding notebook code |
| U — Usability/design | 0 | No deployable user interface found |
| I — Tangible impact | 5 | Forecast concept; no final operational performance |

**Judgment:** The notebook contains a real modeling implementation, but the exported forecast is explicitly named placeholder and training is one epoch. A complex network is not a competitive advantage until evaluation supports it.

**Reviewed file evidence:** [nisr_yield_pipeline.ipynb](https://github.com/NickSingizwa/nisr_competition/blob/1ee11614ce3d1f529dd394d9898f69d8ed960320/nisr_yield_pipeline.ipynb#L1) · [data/processed/forecast_2026A_placeholder.csv](https://github.com/NickSingizwa/nisr_competition/blob/1ee11614ce3d1f529dd394d9898f69d8ed960320/data/processed/forecast_2026A_placeholder.csv#L1) · [README.md](https://github.com/NickSingizwa/nisr_competition/blob/1ee11614ce3d1f529dd394d9898f69d8ed960320/README.md#L1).

<a id="project-10"></a>

### 10. Rwanda Yield-Gap Explorer

**Repository:** [PAZZO123/yieldgap-rwanda](https://github.com/PAZZO123/yieldgap-rwanda) · **Snapshot:** [439e7b4d90f1](https://github.com/PAZZO123/yieldgap-rwanda/commit/439e7b4d90f18ac0713661e0c8a066f8f3c53c2b) · **Score:** 85/100 · **Shared rank:** 2.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | Specific crop/district opportunity and peer comparison |
| D — Data/methodology | 15 | Published SAS extraction, minimum area/count gates and nested peer validation |
| T — Technical innovation | 15 | Benchmark and peer-selection engines plus static application |
| U — Usability/design | 20 | Multilingual map, reliability states and shareable/filterable views in source |
| I — Tangible impact | 15 | Crop-specific opportunity briefs; benchmark attainment not causal |

**Judgment:** Particularly useful feature reference: crop-specific 75th-percentile benchmarks, minimum 200 ha and eight-district gates, and nested leave-one-district-out peer validation. These are project rules, not official NISR reliability cutoffs. RWF opportunities use 2017-price value assumptions.

**Reviewed file evidence:** [src/yield_gaps.py](https://github.com/PAZZO123/yieldgap-rwanda/blob/439e7b4d90f18ac0713661e0c8a066f8f3c53c2b/src/yield_gaps.py#L1) · [src/peer_districts.py](https://github.com/PAZZO123/yieldgap-rwanda/blob/439e7b4d90f18ac0713661e0c8a066f8f3c53c2b/src/peer_districts.py#L1) · [app/app.js](https://github.com/PAZZO123/yieldgap-rwanda/blob/439e7b4d90f18ac0713661e0c8a066f8f3c53c2b/app/app.js#L1).

<a id="project-11"></a>

### 11. Musaruro — district crop productivity decisions

**Repository:** [DIVINEakisa/Musaruro](https://github.com/DIVINEakisa/Musaruro) · **Snapshot:** [86cdadf39b55](https://github.com/DIVINEakisa/Musaruro/commit/86cdadf39b5527a444dd4f918b590fa770b9194a) · **Score:** 80/100 · **Shared rank:** 5.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | District underperformance investigation and action briefs |
| D — Data/methodology | 15 | Published survey/CHIRPS processing and explicit quality exclusions |
| T — Technical innovation | 15 | Practice shares, crop peers and brief generation |
| U — Usability/design | 15 | Interactive maps, source/quality views and exports |
| I — Tangible impact | 15 | Locally verifiable investigation prompts; no causal remedy claim |

**Judgment:** Good survey-to-action design: it excludes an inconsistent improved-seed measure instead of blindly charting it. Action briefs say what to consider and verify; they do not demonstrate that an intervention will work.

**Reviewed file evidence:** [src/actions.py](https://github.com/DIVINEakisa/Musaruro/blob/86cdadf39b5527a444dd4f918b590fa770b9194a/src/actions.py#L1) · [src/build_dataset.py](https://github.com/DIVINEakisa/Musaruro/blob/86cdadf39b5527a444dd4f918b590fa770b9194a/src/build_dataset.py#L1) · [app/musaruro_app.py](https://github.com/DIVINEakisa/Musaruro/blob/86cdadf39b5527a444dd4f918b590fa770b9194a/app/musaruro_app.py#L1).

<a id="project-12"></a>

### 12. Agri AI — disease diagnosis & climate alerts

**Repository:** [Honore777/Agri_Ai_and-Climate-alert-system](https://github.com/Honore777/Agri_Ai_and-Climate-alert-system) · **Snapshot:** [fce5ab19068d](https://github.com/Honore777/Agri_Ai_and-Climate-alert-system/commit/fce5ab19068d71d869822da766647f26313b0c0f) · **Score:** 60/100 · **Shared rank:** 21.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Crop disease review and climate context |
| D — Data/methodology | 5 | Image inference implementation but fixed healthy fallback and weak verified NISR linkage |
| T — Technical innovation | 15 | FastAPI/model loader and farmer/agronomist workflow |
| U — Usability/design | 15 | Image submission/review application in tree |
| I — Tangible impact | 10 | Potential review service; false reassurance risk when model unavailable |

**Judgment:** Critical competitor limitation: absent torch or model returns Maize_healthy with confidence 95.0, while actual softmax confidence is a 0–1 fraction. Do not imitate the silent fallback or inconsistent confidence scale.

**Reviewed file evidence:** [backend/app/ml/predictor.py](https://github.com/Honore777/Agri_Ai_and-Climate-alert-system/blob/fce5ab19068d71d869822da766647f26313b0c0f/backend/app/ml/predictor.py#L1) · [backend/app/api/v1/inference.py](https://github.com/Honore777/Agri_Ai_and-Climate-alert-system/blob/fce5ab19068d71d869822da766647f26313b0c0f/backend/app/api/v1/inference.py#L1) · [backend/app/ml/model_loader.py](https://github.com/Honore777/Agri_Ai_and-Climate-alert-system/blob/fce5ab19068d71d869822da766647f26313b0c0f/backend/app/ml/model_loader.py#L1).

<a id="project-13"></a>

### 13. HarvestWatch — food insecurity early warning

**Repository:** [BodeMurairi2/food_supply_earlyWarning](https://github.com/BodeMurairi2/food_supply_earlyWarning) · **Snapshot:** [2b33bacf487d](https://github.com/BodeMurairi2/food_supply_earlyWarning/commit/2b33bacf487dd5aecbcf415398ec2cf6b9ec13db) · **Score:** 75/100 · **Shared rank:** 9.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | Specific district food-insecurity early-warning decision |
| D — Data/methodology | 10 | Saved models and survey-only metrics; future-informed interpolated training labels |
| T — Technical innovation | 20 | Forecast API, SHAP explanations and model/visualization store |
| U — Usability/design | 15 | Historical/performance/forecast UI and API in tree |
| I — Tangible impact | 10 | Planning utility; forecast validity limited by sparse real survey labels |

**Judgment:** Code separates real-survey scores from interpolated years, but explicitly admits 2019–2020 training labels use the 2021 survey. That contaminates a strict 2021 prospective holdout. SHAP explains the model and does not identify causes.

**Reviewed file evidence:** [api/services/store.py](https://github.com/BodeMurairi2/food_supply_earlyWarning/blob/2b33bacf487dd5aecbcf415398ec2cf6b9ec13db/api/services/store.py#L1) · [api/main.py](https://github.com/BodeMurairi2/food_supply_earlyWarning/blob/2b33bacf487dd5aecbcf415398ec2cf6b9ec13db/api/main.py#L1) · [analysis.ipynb](https://github.com/BodeMurairi2/food_supply_earlyWarning/blob/2b33bacf487dd5aecbcf415398ec2cf6b9ec13db/analysis.ipynb#L1).

<a id="project-14"></a>

### 14. Rwanda Harvest Loss Tracker

**Repository:** [Jacksonsod/post-harvest-loss-tracker](https://github.com/Jacksonsod/post-harvest-loss-tracker) · **Snapshot:** [b6685f14f245](https://github.com/Jacksonsod/post-harvest-loss-tracker/commit/b6685f14f2456e28a49796aaba83ca9f9423e4cb) · **Score:** 80/100 · **Shared rank:** 5.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | Concrete cooperative post-harvest assessment |
| D — Data/methodology | 15 | Survey benchmarks, input checks and an explicitly rejected weak model |
| T — Technical innovation | 15 | Shared assessment/import scoring service and persistent API |
| U — Usability/design | 15 | Assessment, benchmark, history and report interfaces |
| I — Tangible impact | 15 | Measured user-entered loss records and advice; impact unverified |

**Judgment:** A focused product reference. It centralizes assessment scoring and distinguishes measured/reported causes from an estimated national dominant cause. Its attempted model's weak unseen-year performance should not be sold as a deployed forecast.

**Reviewed file evidence:** [backend/scoring_service.py](https://github.com/Jacksonsod/post-harvest-loss-tracker/blob/b6685f14f2456e28a49796aaba83ca9f9423e4cb/backend/scoring_service.py#L1) · [backend/benchmark_service.py](https://github.com/Jacksonsod/post-harvest-loss-tracker/blob/b6685f14f2456e28a49796aaba83ca9f9423e4cb/backend/benchmark_service.py#L1) · [notebooks/predict_loss_risk.py](https://github.com/Jacksonsod/post-harvest-loss-tracker/blob/b6685f14f2456e28a49796aaba83ca9f9423e4cb/notebooks/predict_loss_risk.py#L1).

<a id="project-15"></a>

### 15. CropGuard AI — post-harvest risk monitoring

**Repository:** [Rulindana/cropguard-rwanda](https://github.com/Rulindana/cropguard-rwanda) · **Snapshot:** [148c05e292cd](https://github.com/Rulindana/cropguard-rwanda/commit/148c05e292cd05637a692388fee48330269e802f) · **Score:** 65/100 · **Shared rank:** 15.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | District storage and harvest-risk communication |
| D — Data/methodology | 10 | Survey/weather fusion with hard-coded fallback weather |
| T — Technical innovation | 15 | Risk synchronization, saved JSON and Flutter/Firebase code |
| U — Usability/design | 15 | Mobile maps and alerts in tree |
| I — Tangible impact | 10 | Risk communication prototype; calibration and live recency unverified |

**Judgment:** The pipeline uses estimated light-rain values when the weather API fails. Fixed rainfall/humidity/soil assumptions must be clearly shown; a recently generated timestamp does not make those assumptions recent weather observations.

**Reviewed file evidence:** [app.py](https://github.com/Rulindana/cropguard-rwanda/blob/148c05e292cd05637a692388fee48330269e802f/app.py#L1) · [sync_pipeline/sync_nisr_data.py](https://github.com/Rulindana/cropguard-rwanda/blob/148c05e292cd05637a692388fee48330269e802f/sync_pipeline/sync_nisr_data.py#L1) · [flutter_app/cropguard_app/lib/main.dart](https://github.com/Rulindana/cropguard-rwanda/blob/148c05e292cd05637a692388fee48330269e802f/flutter_app/cropguard_app/lib/main.dart#L1).

<a id="project-16"></a>

### 16. AgriLoss Rwanda — loss/value analysis

**Repository:** [cracker38/AgriLoss-Value-Intelligence-Rwanda](https://github.com/cracker38/AgriLoss-Value-Intelligence-Rwanda) · **Snapshot:** [103b65ef0499](https://github.com/cracker38/AgriLoss-Value-Intelligence-Rwanda/commit/103b65ef0499a4006113d0ef74d9fb342c710608) · **Score:** 75/100 · **Shared rank:** 9.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | Specific post-harvest investigation question |
| D — Data/methodology | 15 | Schema/hash/linkage audits and clearly unweighted summaries |
| T — Technical innovation | 15 | Aggregate dashboard, validation scripts and tests in tree |
| U — Usability/design | 15 | Source/quality/method views and aggregate outputs |
| I — Tangible impact | 10 | Transparent evidence exploration; no national loss estimator or proven intervention |

**Judgment:** Strong restraint is a feature: the application labels unweighted survey-row summaries and displays baseline/holdout model limitations. It does not implement a nationally representative loss estimator, so do not use its row counts as national prevalence.

**Reviewed file evidence:** [scripts/dashboard_data.py](https://github.com/cracker38/AgriLoss-Value-Intelligence-Rwanda/blob/103b65ef0499a4006113d0ef74d9fb342c710608/scripts/dashboard_data.py#L1) · [scripts/audit_sas_2024.py](https://github.com/cracker38/AgriLoss-Value-Intelligence-Rwanda/blob/103b65ef0499a4006113d0ef74d9fb342c710608/scripts/audit_sas_2024.py#L1) · [app.py](https://github.com/cracker38/AgriLoss-Value-Intelligence-Rwanda/blob/103b65ef0499a4006113d0ef74d9fb342c710608/app.py#L1).

<a id="project-17"></a>

### 17. AgriPriority — district screening dashboard

**Repository:** [rugambacb/AgriPriority-Rwanda](https://github.com/rugambacb/AgriPriority-Rwanda) · **Snapshot:** [8bc1ed7e47f2](https://github.com/rugambacb/AgriPriority-Rwanda/commit/8bc1ed7e47f224fa6959498d5725433e1fa7faee) · **Score:** 65/100 · **Shared rank:** 15.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | District agricultural field-verification screening |
| D — Data/methodology | 15 | Committed data, descriptive limits and nine-threshold robustness display |
| T — Technical innovation | 10 | Rule-based screening rather than a trained model |
| U — Usability/design | 15 | Map, executive and district explanations |
| I — Tangible impact | 10 | Guides field checks; stability is not event probability |

**Judgment:** Current code goes beyond the earlier two-year summary by exposing nine threshold scenarios and category stability. It labels rainfall averages as unweighted district descriptions and avoids claiming survey confidence.

**Reviewed file evidence:** [app.py](https://github.com/rugambacb/AgriPriority-Rwanda/blob/8bc1ed7e47f224fa6959498d5725433e1fa7faee/app.py#L1) · [national_insights.py](https://github.com/rugambacb/AgriPriority-Rwanda/blob/8bc1ed7e47f224fa6959498d5725433e1fa7faee/national_insights.py#L1) · [executive_overview.py](https://github.com/rugambacb/AgriPriority-Rwanda/blob/8bc1ed7e47f224fa6959498d5725433e1fa7faee/executive_overview.py#L1).

<a id="project-18"></a>

### 18. Season Pulse — in-season field reporting

**Repository:** [Muhinde234/season-pulse](https://github.com/Muhinde234/season-pulse) · **Snapshot:** [00495ec15cc5](https://github.com/Muhinde234/season-pulse/commit/00495ec15cc5efe38efbf1cb9dba062f98c07328) · **Score:** 75/100 · **Shared rank:** 9.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | Specific in-season officer-report prioritization |
| D — Data/methodology | 15 | Historical yield-index baseline and a 2024 historical backtest |
| T — Technical innovation | 15 | SQLite reports and transparent log-index adjustment |
| U — Usability/design | 15 | Officer/report/dashboard surface in tree |
| I — Tangible impact | 10 | Workflow potential; field adjustment coefficients not calibrated probabilities |

**Judgment:** Separate its historical baseline backtest from its hand-chosen field-report effects. Simulated reports are explicitly supported by the database; deployment must keep them separate from real officer evidence.

**Reviewed file evidence:** [core/risk.py](https://github.com/Muhinde234/season-pulse/blob/00495ec15cc5efe38efbf1cb9dba062f98c07328/core/risk.py#L1) · [core/db.py](https://github.com/Muhinde234/season-pulse/blob/00495ec15cc5efe38efbf1cb9dba062f98c07328/core/db.py#L1) · [build_baseline.py](https://github.com/Muhinde234/season-pulse/blob/00495ec15cc5efe38efbf1cb9dba062f98c07328/build_baseline.py#L1).

<a id="project-19"></a>

### 19. Agricultural Intervention Intelligence (AII)

**Repository:** [remy-shingiro/aii-agri-intervention](https://github.com/remy-shingiro/aii-agri-intervention) · **Snapshot:** [efc12c511485](https://github.com/remy-shingiro/aii-agri-intervention/commit/efc12c51148521c32085e804314e5294386251b9) · **Score:** 80/100 · **Shared rank:** 5.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | Traceable district investigation and intervention review |
| D — Data/methodology | 15 | NISR provenance/status checks and comparable evidence pairs |
| T — Technical innovation | 15 | Evidence extraction, signal engine and component tests |
| U — Usability/design | 15 | District maps, briefs and availability states in source |
| I — Tangible impact | 15 | Auditable investigation prompts; no causal intervention model |

**Judgment:** A close conceptual comparator to project44. Its evidence engine requires observed records, supported units and source links. Frontend evidence processing is not proof of a live analytics backend or measured policy impact.

**Reviewed file evidence:** [src/features/intelligence/agriculturalSignalEngine.ts](https://github.com/remy-shingiro/aii-agri-intervention/blob/efc12c51148521c32085e804314e5294386251b9/src/features/intelligence/agriculturalSignalEngine.ts#L1) · [src/features/evidence/data/loadAgriculturalEvidence.ts](https://github.com/remy-shingiro/aii-agri-intervention/blob/efc12c51148521c32085e804314e5294386251b9/src/features/evidence/data/loadAgriculturalEvidence.ts#L1) · [scripts/extract-nisr-agricultural-data.cjs](https://github.com/remy-shingiro/aii-agri-intervention/blob/efc12c51148521c32085e804314e5294386251b9/scripts/extract-nisr-agricultural-data.cjs#L1).

<a id="project-20"></a>

### 20. Planting Window Advisor — stated concept

**Repository:** [Jonathan2055/nisr-planting-window-advisor](https://github.com/Jonathan2055/nisr-planting-window-advisor) · **Snapshot:** [d0b894d95ca1](https://github.com/Jonathan2055/nisr-planting-window-advisor/commit/d0b894d95ca12a0c984c5b22ef574941377abfbe) · **Score:** 10/100 · **Shared rank:** 33.

**Scope:** Not implemented in public repo. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 10 | Documented planting-window concept |
| D — Data/methodology | 0 | No implemented dataset pipeline |
| T — Technical innovation | 0 | README-only tree |
| U — Usability/design | 0 | No executable prototype |
| I — Tangible impact | 0 | No implemented decision output |

**Judgment:** At this snapshot the complete repository tree has one file: README.md. Its proposed rainfall/planting features receive no implementation credit. This says nothing about undisclosed work elsewhere.

**Reviewed file evidence:** [README.md](https://github.com/Jonathan2055/nisr-planting-window-advisor/blob/d0b894d95ca12a0c984c5b22ef574941377abfbe/README.md#L1).

<a id="project-21"></a>

### 21. SAS productivity classification study

**Repository:** [UShamila/rwanda-agricultural-productivity](https://github.com/UShamila/rwanda-agricultural-productivity) · **Snapshot:** [61072f598036](https://github.com/UShamila/rwanda-agricultural-productivity/commit/61072f5980369cae98bc6705dea41553026e9f51) · **Score:** 40/100 · **Shared rank:** 30.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Survey productivity classification question |
| D — Data/methodology | 10 | SAS input and researcher-defined yield tertiles |
| T — Technical innovation | 10 | Notebook model comparisons and neural training |
| U — Usability/design | 0 | No end-user application in the three-file tree |
| I — Tangible impact | 5 | Research potential; no operational decision workflow |

**Judgment:** Low/Medium/High labels are constructed from yield tertiles, not official NISR classifications. The notebook's random record split and global tertile construction do not establish generalization to new years or districts.

**Reviewed file evidence:** [Agricultural_Productivity_Classification.ipynb](https://github.com/UShamila/rwanda-agricultural-productivity/blob/61072f5980369cae98bc6705dea41553026e9f51/Agricultural_Productivity_Classification.ipynb#L1) · [README.md](https://github.com/UShamila/rwanda-agricultural-productivity/blob/61072f5980369cae98bc6705dea41553026e9f51/README.md#L1).

<a id="project-22"></a>

### 22. AgriSmart Rwanda — survey table explorer

**Repository:** [ishimwedieudonne42-eng/agrismart-rwanda](https://github.com/ishimwedieudonne42-eng/agrismart-rwanda) · **Snapshot:** [1ccd8d2baadc](https://github.com/ishimwedieudonne42-eng/agrismart-rwanda/commit/1ccd8d2baadc0adc3a9997703f1b05bafbd238f6) · **Score:** 65/100 · **Shared rank:** 15.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Published district/national agricultural access |
| D — Data/methodology | 15 | Source-table CSV checks and explicit indicator semantics |
| T — Technical innovation | 10 | Static dashboard plus validation automation |
| U — Usability/design | 15 | District comparisons, maps, charts and CSV outputs |
| I — Tangible impact | 10 | Useful descriptive access; field outcomes unverified |

**Judgment:** Current dashboard source includes ranking/scorecard/opportunity downloads and explanatory notes. These are descriptive functions, not proof that opportunity ranks estimate realizable gains. Practice percentages and crop yields require different interpretations.

**Reviewed file evidence:** [backend/analyze_crops.py](https://github.com/ishimwedieudonne42-eng/agrismart-rwanda/blob/1ccd8d2baadc0adc3a9997703f1b05bafbd238f6/backend/analyze_crops.py#L1) · [districts.html](https://github.com/ishimwedieudonne42-eng/agrismart-rwanda/blob/1ccd8d2baadc0adc3a9997703f1b05bafbd238f6/districts.html#L1) · [national-dashboard.html](https://github.com/ishimwedieudonne42-eng/agrismart-rwanda/blob/1ccd8d2baadc0adc3a9997703f1b05bafbd238f6/national-dashboard.html#L1).

<a id="project-23"></a>

### 23. Agricultural decision-support proposal/link

**Repository:** [nsanzimanaadolphe9-eng/data-driven-agricultural-decision-support-platform-for-Rwanda](https://github.com/nsanzimanaadolphe9-eng/data-driven-agricultural-decision-support-platform-for-Rwanda) · **Snapshot:** [359218dcfdf5](https://github.com/nsanzimanaadolphe9-eng/data-driven-agricultural-decision-support-platform-for-Rwanda/commit/359218dcfdf57a18fdb095f1e6ed39fe3f45e32e) · **Score:** 0/100 · **Shared rank:** 34.

**Scope:** Not implemented in public repo. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 0 | Substantive external proposal not inspected |
| D — Data/methodology | 0 | No dataset evidence in repository |
| T — Technical innovation | 0 | No executable code in two-file tree |
| U — Usability/design | 0 | No local prototype |
| I — Tangible impact | 0 | No implemented output |

**Judgment:** README and Project NISR both link to an external document. The GitHub repository does not contain implementation evidence; zero here means no assessable repository evidence, not a conclusion about the external document or team's ability.

**Reviewed file evidence:** [README.md](https://github.com/nsanzimanaadolphe9-eng/data-driven-agricultural-decision-support-platform-for-Rwanda/blob/359218dcfdf57a18fdb095f1e6ed39fe3f45e32e/README.md#L1) · [Project NISR](https://github.com/nsanzimanaadolphe9-eng/data-driven-agricultural-decision-support-platform-for-Rwanda/blob/359218dcfdf57a18fdb095f1e6ed39fe3f45e32e/Project%20NISR#L1).

<a id="project-24"></a>

### 24. Agricultural extension & productivity R analysis

**Repository:** [tumukeshayezudelphine-cmd/ahs-extension-productivity-rwanda](https://github.com/tumukeshayezudelphine-cmd/ahs-extension-productivity-rwanda) · **Snapshot:** [8a20e4c3bee8](https://github.com/tumukeshayezudelphine-cmd/ahs-extension-productivity-rwanda/commit/8a20e4c3bee8647c839a481e18c40863598a72b2) · **Score:** 45/100 · **Shared rank:** 28.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Extension-access and productivity association |
| D — Data/methodology | 10 | Cleaning/sensitivity code; unweighted preliminary analysis |
| T — Technical innovation | 10 | Large R analysis with Shiny implementation |
| U — Usability/design | 5 | Shiny code exists; absolute local path/data dependency |
| I — Tangible impact | 5 | Analytical potential; portable deployment and impact unverified |

**Judgment:** The script explicitly says the comparisons/models are unweighted and noncausal. It hard-codes a Windows working directory and expects external inputs; it is not equivalent to a ready-to-run public application.

**Reviewed file evidence:** [complete  data analysis.R](https://github.com/tumukeshayezudelphine-cmd/ahs-extension-productivity-rwanda/blob/8a20e4c3bee8647c839a481e18c40863598a72b2/complete%20%20data%20analysis.R#L1) · [README.md](https://github.com/tumukeshayezudelphine-cmd/ahs-extension-productivity-rwanda/blob/8a20e4c3bee8647c839a481e18c40863598a72b2/README.md#L1).

<a id="project-25"></a>

### 25. AgriGuard — weather and agricultural risk alerts

**Repository:** [sandwich808-yum/AgriGuard](https://github.com/sandwich808-yum/AgriGuard) · **Snapshot:** [576cdd635c63](https://github.com/sandwich808-yum/AgriGuard/commit/576cdd635c63cd20db4cdfdeef360e397548ff81) · **Score:** 75/100 · **Shared rank:** 9.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | Specific drought/heavy-rain/storage review decision |
| D — Data/methodology | 15 | NISR crop areas and live/snapshot weather with source date |
| T — Technical innovation | 15 | Transparent crop-water-demand heuristics and tests in tree |
| U — Usability/design | 15 | Map, multilingual labels, downloads and SMS preview |
| I — Tangible impact | 10 | Useful warning prototype; no calibrated event precision or live SMS delivery proof |

**Judgment:** Weather fallback retains the snapshot's last observed day rather than relabeling it today. SMS-preview text is implemented, but should not be promoted as proof of actual message delivery.

**Reviewed file evidence:** [agriguard/risk.py](https://github.com/sandwich808-yum/AgriGuard/blob/576cdd635c63cd20db4cdfdeef360e397548ff81/agriguard/risk.py#L1) · [agriguard/weather.py](https://github.com/sandwich808-yum/AgriGuard/blob/576cdd635c63cd20db4cdfdeef360e397548ff81/agriguard/weather.py#L1) · [app.py](https://github.com/sandwich808-yum/AgriGuard/blob/576cdd635c63cd20db4cdfdeef360e397548ff81/app.py#L1).

<a id="project-26"></a>

### 26. IREME — smart farming advisor

**Repository:** [munezerojd/ireme-pp](https://github.com/munezerojd/ireme-pp) · **Snapshot:** [5514a3230216](https://github.com/munezerojd/ireme-pp/commit/5514a323021623c7b9c3159785a5ad956b6029d1) · **Score:** 65/100 · **Shared rank:** 15.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Farmer advice, observations and disease scan |
| D — Data/methodology | 10 | Survey-linked insights and empirical baselines with unverified generalization |
| T — Technical innovation | 15 | FastAPI/SQLite, advisor, submissions and asset proxy |
| U — Usability/design | 15 | Multilingual browser advice and admin/user surfaces |
| I — Tangible impact | 10 | Advice workflow; agronomic validity and deployment unverified |

**Judgment:** PredictYield-style function names do not establish a trained forecasting model. The advisor operates on saved survey insights, medians and rule adjustments. Browser model hosting must be configured and independently validated.

**Reviewed file evidence:** [backend/app/nisr_advisor.py](https://github.com/munezerojd/ireme-pp/blob/5514a323021623c7b9c3159785a5ad956b6029d1/backend/app/nisr_advisor.py#L1) · [backend/app/main.py](https://github.com/munezerojd/ireme-pp/blob/5514a323021623c7b9c3159785a5ad956b6029d1/backend/app/main.py#L1) · [frontend/src/nisr/engine.js](https://github.com/munezerojd/ireme-pp/blob/5514a323021623c7b9c3159785a5ad956b6029d1/frontend/src/nisr/engine.js#L1).

<a id="project-27"></a>

### 27. CropPulse Rwanda — crop planning & evidence

**Repository:** [tnkurunziza300-developer/croppulse-rwanda](https://github.com/tnkurunziza300-developer/croppulse-rwanda) · **Snapshot:** [dd856522a32e](https://github.com/tnkurunziza300-developer/croppulse-rwanda/commit/dd856522a32ec410363e7a383781ed7faf68b88d) · **Score:** 65/100 · **Shared rank:** 15.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Crop choice and farm planning workflow |
| D — Data/methodology | 10 | Checksum-checked NISR context but provisional crop suitability knowledge |
| T — Technical innovation | 15 | Planner, evidence validators, database/API and image model code |
| U — Usability/design | 15 | Interactive planning and evidence views |
| I — Tangible impact | 10 | Planning potential; NISR history deliberately does not drive suitability rank |

**Judgment:** The recommender explicitly identifies its crop/zone suitability guide as unverified and says NISR history is contextual. This is a substantial application with an important agronomic evidence gap, not a validated planting recommendation engine.

**Reviewed file evidence:** [utils/recommender.py](https://github.com/tnkurunziza300-developer/croppulse-rwanda/blob/dd856522a32ec410363e7a383781ed7faf68b88d/utils/recommender.py#L1) · [backend/crop_disease_model.py](https://github.com/tnkurunziza300-developer/croppulse-rwanda/blob/dd856522a32ec410363e7a383781ed7faf68b88d/backend/crop_disease_model.py#L1) · [data/verified/MANIFEST.json](https://github.com/tnkurunziza300-developer/croppulse-rwanda/blob/dd856522a32ec410363e7a383781ed7faf68b88d/data/verified/MANIFEST.json#L1).

<a id="project-28"></a>

### 28. AgriMenya — data-backed farm decisions

**Repository:** [iiradukunda-dev/agrimenya](https://github.com/iiradukunda-dev/agrimenya) · **Snapshot:** [df4f82243467](https://github.com/iiradukunda-dev/agrimenya/commit/df4f82243467c68207f62686a61230c2fb1bc025) · **Score:** 85/100 · **Shared rank:** 2.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 20 | Farm planning, field operations and communication decisions |
| D — Data/methodology | 15 | Verified artifact checks and season-aware official yield baseline logic |
| T — Technical innovation | 20 | FastAPI/database, plans, imports, communication and extensive tests |
| U — Usability/design | 15 | Role-based planning and localized/offline-support components |
| I — Tangible impact | 15 | Closed-loop planning potential; live delivery/adoption unverified |

**Judgment:** Current serving code explicitly prefers database/official SAS baselines; do not label it a live ML forecast. Model-card/hash checks and readiness handling are useful references. WhatsApp requires credentials, consent and approved templates; mocks are not live delivery.

**Reviewed file evidence:** [backend/app/ml/predict.py](https://github.com/iiradukunda-dev/agrimenya/blob/df4f82243467c68207f62686a61230c2fb1bc025/backend/app/ml/predict.py#L1) · [backend/app/main.py](https://github.com/iiradukunda-dev/agrimenya/blob/df4f82243467c68207f62686a61230c2fb1bc025/backend/app/main.py#L1) · [backend/app/db/migrations/0007_nisr_imports.sql](https://github.com/iiradukunda-dev/agrimenya/blob/df4f82243467c68207f62686a61230c2fb1bc025/backend/app/db/migrations/0007_nisr_imports.sql#L1).

<a id="project-29"></a>

### 29. Umurima AI — SMS agricultural advice

**Repository:** [Dawit-Getachew/umurima](https://github.com/Dawit-Getachew/umurima) · **Snapshot:** [9a119ace8274](https://github.com/Dawit-Getachew/umurima/commit/9a119ace8274327e3dd779d0288a00d2f35947b9) · **Score:** 60/100 · **Shared rank:** 21.

**Scope:** Caution — competition/track mismatch. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Specific feature-phone farmer access problem |
| D — Data/methodology | 5 | Curated knowledge; limited implemented NISR analytics |
| T — Technical innovation | 15 | Triage/FAQ/cache/model/fallback adviser and SMS relay |
| U — Usability/design | 15 | English/Kinyarwanda short-message workflow in source |
| I — Tangible impact | 10 | Access potential; external service operation and outcomes unverified |

**Judgment:** Adjacent design reference only: README identifies the Hack-Nation × World Bank challenge. Keep it in the 34-URL engineering table, but exclude it from any confirmed NISR Track 1 competition standing.

**Reviewed file evidence:** [backend/app/advisor.py](https://github.com/Dawit-Getachew/umurima/blob/9a119ace8274327e3dd779d0288a00d2f35947b9/backend/app/advisor.py#L1) · [sms-gateway/lib/services/sms_service.dart](https://github.com/Dawit-Getachew/umurima/blob/9a119ace8274327e3dd779d0288a00d2f35947b9/sms-gateway/lib/services/sms_service.dart#L1) · [README.md](https://github.com/Dawit-Getachew/umurima/blob/9a119ace8274327e3dd779d0288a00d2f35947b9/README.md#L1).

<a id="project-30"></a>

### 30. Umusaruro — survey-linked district view

**Repository:** [GQueen160/umusaruro](https://github.com/GQueen160/umusaruro) · **Snapshot:** [9b87469efff8](https://github.com/GQueen160/umusaruro/commit/9b87469efff8233150740a6b7320dc2d8e1dec7a) · **Score:** 70/100 · **Shared rank:** 13.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | District survey information and farm guidance |
| D — Data/methodology | 15 | Hash-based registration, table review and confirmed publication |
| T — Technical innovation | 15 | Django ingestion, published observations and source/stat classes |
| U — Usability/design | 15 | District and method views with survey references |
| I — Tangible impact | 10 | Governed publication potential; field outcomes unverified |

**Judgment:** The register/propose/publish distinction is real code, including publication confirmation. A published district statistic must retain district precision; geographic navigation cannot justify sector/village claims.

**Reviewed file evidence:** [engine/ingest.py](https://github.com/GQueen160/umusaruro/blob/9b87469efff8233150740a6b7320dc2d8e1dec7a/engine/ingest.py#L1) · [sheet/stats.py](https://github.com/GQueen160/umusaruro/blob/9b87469efff8233150740a6b7320dc2d8e1dec7a/sheet/stats.py#L1) · [sheet/views.py](https://github.com/GQueen160/umusaruro/blob/9b87469efff8233150740a6b7320dc2d8e1dec7a/sheet/views.py#L1).

<a id="project-31"></a>

### 31. AgriPulse AI — yield, inputs and market decisions

**Repository:** [ngabodaniel1000/Agripulse-ai](https://github.com/ngabodaniel1000/Agripulse-ai) · **Snapshot:** [c6e52a294f90](https://github.com/ngabodaniel1000/Agripulse-ai/commit/c6e52a294f9038c3f2124c3fc19bfe80906556d4) · **Score:** 55/100 · **Shared rank:** 26.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Input/yield/market decision concept |
| D — Data/methodology | 5 | Training examples generated from assumed/calibrated distributions |
| T — Technical innovation | 15 | Three training engines and API/frontend architecture |
| U — Usability/design | 15 | Multiple dashboard workflows in tree |
| I — Tangible impact | 5 | Simulation demonstration; no demonstrated real-farm validity |

**Judgment:** Synthetic micro-record generation is explicit in code. Calibrating a generator to a few NISR marginals does not make its outcomes observed survey records or validate sell/store profitability.

**Reviewed file evidence:** [ai/ml/data_generator.py](https://github.com/ngabodaniel1000/Agripulse-ai/blob/c6e52a294f9038c3f2124c3fc19bfe80906556d4/ai/ml/data_generator.py#L1) · [ai/ml/train_all.py](https://github.com/ngabodaniel1000/Agripulse-ai/blob/c6e52a294f9038c3f2124c3fc19bfe80906556d4/ai/ml/train_all.py#L1) · [client/app/page.tsx](https://github.com/ngabodaniel1000/Agripulse-ai/blob/c6e52a294f9038c3f2124c3fc19bfe80906556d4/client/app/page.tsx#L1).

<a id="project-32"></a>

### 32. Rwanda Beyond — smart maize farm system

**Repository:** [Sengwamana/Rwanda-Beyond-Project](https://github.com/Sengwamana/Rwanda-Beyond-Project) · **Snapshot:** [08e8f6605798](https://github.com/Sengwamana/Rwanda-Beyond-Project/commit/08e8f660579814edab94aba6f5b5908853bd2d13) · **Score:** 60/100 · **Shared rank:** 21.

**Scope:** Track 1 candidate; verify submission. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Maize farm, irrigation and pest operations |
| D — Data/methodology | 5 | Sensor/farm/weather data path; NISR grounding not established |
| T — Technical innovation | 15 | Express/Convex sensor routes and AI/fallback services |
| U — Usability/design | 15 | Farm/admin/notification interfaces in tree |
| I — Tangible impact | 10 | Operational concept; hardware reliability and impact unverified |

**Judgment:** Substantial farm-system code exists. Sensor endpoints and AI calls do not prove a live field deployment, and the inspected implementation does not establish the required NISR data contribution.

**Reviewed file evidence:** [Backend/src/services/aiService.js](https://github.com/Sengwamana/Rwanda-Beyond-Project/blob/08e8f660579814edab94aba6f5b5908853bd2d13/Backend/src/services/aiService.js#L1) · [Backend/src/routes/sensors.js](https://github.com/Sengwamana/Rwanda-Beyond-Project/blob/08e8f660579814edab94aba6f5b5908853bd2d13/Backend/src/routes/sensors.js#L1) · [Backend/README.md](https://github.com/Sengwamana/Rwanda-Beyond-Project/blob/08e8f660579814edab94aba6f5b5908853bd2d13/Backend/README.md#L1).

<a id="project-33"></a>

### 33. NISR Agri Intelligence Engine

**Repository:** [DamourDev/nisr-agri-engine](https://github.com/DamourDev/nisr-agri-engine) · **Snapshot:** [0c78ee20f2f3](https://github.com/DamourDev/nisr-agri-engine/commit/0c78ee20f2f3acfc4e3bc14aa685c3ff72464a74) · **Score:** 60/100 · **Shared rank:** 21.

**Scope:** Track 1 self-identified. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Agricultural/climate district prioritization |
| D — Data/methodology | 5 | Only 36 rows, and target-derived Price_Yield_Ratio remains in predictor features |
| T — Technical innovation | 15 | Leave-one-row-out model notebook and Streamlit scenarios |
| U — Usability/design | 15 | District/crop charts and what-if interface |
| I — Tangible impact | 10 | Planning demonstration; leakage, geography and causal validity limited |

**Judgment:** A confirmed leakage issue: the notebook computes Price_Yield_Ratio as Mean_Farmgate_Price_RWF / Yield_Kg_Ha, then includes all numeric columns except Yield_Kg_Ha and Production_MT in X. The held-out row therefore carries its own target-derived ratio. Leave-one-row-out also shares district context. Existing cross-validation scores cannot support forecast superiority until this is removed and evaluation is rebuilt.

**Reviewed file evidence:** [app.py](https://github.com/DamourDev/nisr-agri-engine/blob/0c78ee20f2f3acfc4e3bc14aa685c3ff72464a74/app.py#L1) · [notebooks/03_ml_yield_models.ipynb](https://github.com/DamourDev/nisr-agri-engine/blob/0c78ee20f2f3acfc4e3bc14aa685c3ff72464a74/notebooks/03_ml_yield_models.ipynb#L1) · [data/df_master_phase4_predictions.csv](https://github.com/DamourDev/nisr-agri-engine/blob/0c78ee20f2f3acfc4e3bc14aa685c3ff72464a74/data/df_master_phase4_predictions.csv#L1).

<a id="project-34"></a>

### 34. HingaSmart Rwanda / project44

**Repository:** [bisangwa-lab/project44](https://github.com/bisangwa-lab/project44) · **Snapshot:** [c80d0a7415ea](https://github.com/bisangwa-lab/project44/commit/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e) · **Score:** 65/100 · **Shared rank:** 15.

**Scope:** Subject; agricultural candidate; private at audit. No organizer acceptance verified.

| Criterion | Points /20 | Evidence-based reason |
|---|---:|---|
| P — Problem/relevance | 15 | Agricultural evidence investigation with broad role scope |
| D — Data/methodology | 15 | Traceable published aggregates and strict Explore/weather logic, but inconsistent older calculations |
| T — Technical innovation | 10 | Integrated app and 74 passing tests, offset by privileged endpoint and broken local edits |
| U — Usability/design | 15 | Maps, filters, provenance, reports and evidence snapshots; farmer panel planned |
| I — Tangible impact | 10 | Investigation support exists; local follow-through and measured impact incomplete |

**Judgment:** HingaSmart Rwanda has a substantial evidence base and a useful investigation concept. It is not a production-ready closed-loop field platform at this snapshot: service-role authorization, metric consistency, local writes and submission packaging need correction before optional feature expansion.

**Reviewed file evidence:** [src/lib/explore-data.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/explore-data.js#L1) · [src/routes/api/demo-data.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/routes/api/demo-data.js#L1) · [src/lib/server-fns.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/server-fns.js#L1) · [src/api/localClient.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/api/localClient.js#L1) · [src/lib/metrics.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/metrics.js#L1) · [src/lib/climate-analysis-model.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/climate-analysis-model.js#L1) · [src/lib/weather-service.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/weather-service.js#L1) · [src/lib/rbac.js](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/lib/rbac.js#L1) · [src/components/panels/CommunityBusinessPanel.jsx](https://github.com/bisangwa-lab/project44/blob/c80d0a7415ea1add6a23f7eb273b32b0baa12e0e/src/components/panels/CommunityBusinessPanel.jsx#L1).


## 12. Verification record and remaining unknowns

- **Executed for project44:** 74 existing tests passed; lint passed; production build completed. Six additional probes confirmed the behaviors described in D1–D6. These probes are adversarial examples, not observations of corrupted production data.
- **Environment limit:** reused installed dependencies, including Zod 4.4.3 matching the lock. No clean installation was performed. Build warnings identify missing Base44 app configuration; no successful deployment is inferred.
- **Data limit:** inspected preparation code/manifests and source catalogue; did not redownload private survey inputs, re-estimate all tables or compare all 55,394 values with source workbooks. The 4/564 reconciliation failures and other preparation counts are committed artifact evidence.
- **Competitor limit:** current metadata, tree and representative source verified for all 33; no blanket claim that apps run, tests pass, model metrics reproduce, credentials work or users benefit. Large codebases require further targeted audits. No full penetration test, hardware test or survey disclosure audit was performed.
- **Eligibility limit:** no organizer roster, submission receipts or team/student verification. Track self-identification and topical relevance are not acceptance. Repository names or duplicated documentation do not prove plagiarism or separate teams.
- **Ranking limit:** the scores are an explicit, coarse independent assessment. A source-only review cannot provide a verified official ordering of 34 teams. Ties, scope flags and these limits must accompany the ranking.

The companion evidence manifest records the 34 snapshot commits and hashes of retrieved source files so this report can be checked later. Its file inventory includes build dependencies such as UI source; it must not be read as a claim that each retrieved line received equal inspection. The comparison remains tied to those snapshots even if a repository changes. Project44's GitHub links require permission while the repository remains private.

**Independent review; not affiliated with or endorsed by NISR.**
