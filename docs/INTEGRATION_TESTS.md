# AgriWiser — Integration & Regression Test Suite

## 1. Test Suite Architecture

The test suite validates data integrity, mathematical correctness, model governance, role-based authorization, and end-to-end analytical workflows.

Total Active Automated Tests: **166 tests**  
Test Runner: Node.js Built-in Test Runner (`node:test`, `node:assert/strict`)

---

## 2. Test Files Directory

| Test File | Test Count | Focus Area |
| :--- | :---: | :--- |
| `tests/shared-intelligence.test.js` | 6 | Data classification, zero-baseline safety, exact decomposition, regression, model registry |
| `tests/risk-engine.test.js` | 6 | Multi-signal detection, risk level thresholds, bounded prediction, field investigation handoff |
| `tests/digital-twin.test.js` | 7 | 6 deterministic scenario models, sensitivity analysis sweep, missing baseline rejection |
| `tests/ai-analyst.test.js` | 2 | Tool execution, research question answering with strict 6-part evidence structure |
| `tests/cross-engine-integration.test.js` | 1 | End-to-end integration: Query -> Risk -> Field Handoff -> Twin Simulation -> AI Query -> Snapshot |
| `tests/climate-analysis.test.js` | 6 | Reanalysis grid parsing, anomaly calculations, spatial weight aggregation |
| `tests/dataset-findings.test.js` | 23 | Finding rules, adjacent-year comparisons, conflicting release protection |
| `tests/field-operations.test.js` | 8 | Notes, statuses, role navigation, workspace panel resolution |
| `tests/field-workflow.test.js` | 15 | Multi-stage investigation workflows, evidence attachment, escalation |
| `tests/local-auth.test.js` | 12 | Sign-in, password handling, session validation, unauthorized route rejection |
| `tests/local-data-writes.test.js` | 24 | SQLite atomic writes, role access controls, record schema validations |
| `tests/local-data.test.js` | 11 | Local read pagination, sorting, zero vs null preservation |
| `tests/supabase.test.js` | 7 | Supabase client auth, RLS enforcement, rate limiting |
| `tests/weather-integration.test.js` | 14 | NASA POWER & ERA5 fetch pipelines, rate limiting backoff, cache coalesce |
| `tests/weather-spatial.test.js` | 12 | District polygon grid overlap intersections, spatial averaging |
| `tests/weather.test.js` | 12 | Daily weather series assembly, extreme event flagging |

---

## 3. Execution Commands

```bash
# Run all automated tests
node --test tests/*.test.js

# Run code style and syntax linter
npm run lint

# Build production bundle
npm run build
```
