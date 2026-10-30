# AgriWiser — Shared Agricultural Intelligence Architecture

## 1. System Mission & Architectural Vision

The AgriWiser Agricultural Intelligence System is a research-grade, production-oriented decision-support platform designed to transform official agricultural surveys (NISR SAS/AHS), satellite reanalysis (NASA POWER MERRA-2, ECMWF ERA5), and verified field notes into actionable intelligence.

The platform directly resolves critical risks in agricultural decision-making:
- **No data fabrication**: Every metric, baseline, and finding is anchored in genuine, traceable records.
- **Strict evidentiary boundaries**: Clear separation between official observations, model estimates, deterministic simulations, and predictions.
- **Full reproducibility**: Cryptographic evidence snapshots guarantee auditability across policy reviews.

---

## 2. Architectural Blueprint

```
+-----------------------------------------------------------------------------------+
|                            AUTHENTIC EVIDENCE SOURCES                             |
|  - NISR Seasonal Agricultural Surveys (SAS 2018-2024, 55,394 verified records)    |
|  - NASA POWER MERRA-2 (14 Rwanda spatial cells, 0.5° x 0.625°)                    |
|  - ECMWF ERA5 Reanalysis (51 Rwanda spatial cells, 0.25° x 0.25°)                 |
|  - RAB Agricultural Extension Field Notes & Verification Surveys                 |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        DATA CLASSIFICATION & QUALITY LAYER                         |
|  [src/lib/intelligence/classification.js]                                          |
|  - OFFICIAL_OBSERVATION (NISR official releases)                                  |
|  - EXTERNAL_OBSERVATION (Weather station readings)                                |
|  - MODEL_ESTIMATE (Gridded reanalysis)                                            |
|  - FIELD_OBSERVATION (Authorized field officer records)                           |
|  - DERIVED_STATISTIC (Pure mathematical calculations)                             |
|  - SCENARIO_OUTPUT (Deterministic simulation outcomes)                            |
|  - MODEL_PREDICTION (Forecasts with uncertainty bounds)                           |
|  - DEMONSTRATION (Sample content, excluded from analytics)                        |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        SHARED EVIDENCE & COMPUTATION LAYER                        |
|  [src/lib/intelligence/statistical-engine.js] [evidence-service.js]                |
|  - Zero-baseline protection & missing-data safeguards                              |
|  - Exact production decomposition (ΔP = Y_base * ΔA + A_curr * ΔY)                |
|  - Least-squares linear regression & simple exponential smoothing                 |
|  - SHA-256 evidence snapshotting for audit trails                                 |
+-----------------------------------------------------------------------------------+
                  |                                 |                             |
                  v                                 v                             v
+-----------------------------+   +-----------------------------+   +-----------------------------+
|    INNOVATION ONE:          |   |    INNOVATION TWO:          |   |   INNOVATION THREE:         |
|    PREDICTIVE RISK ENGINE   |   |    DIGITAL TWIN SIMULATOR   |   |   AI AGRICULTURAL ANALYST   |
|  [risk-engine.js]           |   |  [digital-twin.js]          |   |  [ai-analyst.js]            |
|  - Multi-signal detection   |   |  - 6 deterministic scenarios|   |  - 10 research tools        |
|  - Composite vulnerability  |   |  - Sensitivity analysis     |   |  - Strict 6-part structure  |
|  - Ensembled forecasting    |   |  - Agronomic parameter space|   |  - Zero hallucination       |
|  - Field Operations handoff |   |  - Explicit caveats         |   |  - Verified citations       |
+-----------------------------+   +-----------------------------+   +-----------------------------+
                  |                                 |                             |
                  +---------------------------------+-----------------------------+
                                                    |
                                                    v
+-----------------------------------------------------------------------------------+
|                          MODEL GOVERNANCE & ACCESS CONTROL                        |
|  [src/lib/intelligence/model-registry.js] [src/lib/intelligence/server-fns.js]    |
|  - Central catalog of models, versions, evaluation metrics (MAE, RMSE, R²)        |
|  - Strict RBAC: agricultural_officer, agricultural_analyst, policy_maker, admin   |
+-----------------------------------------------------------------------------------+
                                                    |
                                                    v
+-----------------------------------------------------------------------------------+
|                         PRODUCTION APPLICATION INTERFACES                         |
|  [src/components/dashboard/AnalyticsDashboard.jsx]                                |
|  - Risk Intelligence Panel                                                       |
|  - Digital Twin Scenario Simulator                                                |
|  - AI Evidence Analyst Workspace                                                  |
|  - Model Governance Registry                                                      |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Operating Contracts

1. **Evidence Integrity**: All observations are queried via `EvidenceService` wrapping authenticated repository instances (`recordsForUser(user)`).
2. **Missing Data Contract**: Missing cells in historical records remain `null` or `missing_data`. They are NEVER coerced to `0`, preventing false 100% loss calculations.
3. **Audit Trail**: Every scenario simulation, risk finding, and AI response includes an immutable timestamp, model identifier, version, and input parameter hash.
