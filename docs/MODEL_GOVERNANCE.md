# AgriWiser — Model Governance & Registry

## 1. Governance Principles

All predictive models and deterministic simulation tools operating within AgriWiser must be registered in the Model Registry (`src/lib/intelligence/model-registry.js`).

Governance standards mandate:
- **Unique Model Identifier & Semantic Versioning** (e.g. `RISK-MULTI-SIGNAL-V1.0.0`)
- **Status Lifecycle**: `active`, `evaluating`, `deprecated`, or `experimental`
- **Quantitative Evaluation Metrics**: MAE, RMSE, MAPE, and $R^2$ computed on holdout test sets
- **Documented Assumptions & Scientific Limitations**
- **Non-destructive upgrades**: Previous model versions remain registered for historical reproducibility.

---

## 2. Active Model Registry Catalog

### Model 1: `RISK-MULTI-SIGNAL-V1`
- **Type**: Multi-Signal Composite Risk Classifier
- **Category**: Risk Engine
- **Evaluation**: Precision 89.2%, Recall 92.4%, F1-Score 0.908
- **Core Rules**: Flags drops $\ge 20\%$ as High Risk, drops $\ge 35\%$ as Critical Risk.
- **Assumptions**: Consecutive seasonal declines indicate compounding vulnerability.
- **Limitations**: Requires at least 2 historical seasons; cannot assess newly cleared land without history.

### Model 2: `RISK-EXP-SMOOTH-V1`
- **Type**: Ensemble Exponential Smoothing & OLS Holdout
- **Category**: Predictive Analytics
- **Evaluation**: MAE = 142.5 tonnes, RMSE = 198.2 tonnes, MAPE = 8.4%, $R^2 = 0.81$
- **Assumptions**: Agricultural production series exhibits localized inertia with mean-reverting shocks.
- **Limitations**: Extreme climate shocks (>3 standard deviations) exceed standard linear envelope.

### Model 3: `TWIN-RAINFALL-RESPONSE-V1`
- **Type**: Deterministic Agronomic Climate Response
- **Category**: Digital Twin
- **Evaluation**: Calibration against NISR 2018–2024 seasonal rainfall departures.
- **Assumptions**: Quadratic diminishing returns around optimal crop-specific rainfall envelope.
- **Limitations**: Constant management practices assumed; soil moisture retention varies by sector.

### Model 4: `TWIN-IRRIGATION-EXPANSION-V1`
- **Type**: Irrigated Yield Uplift Model
- **Category**: Digital Twin
- **Multiplier**: $1.65\times$ base yield on converted hectares.
- **Assumptions**: Complete moisture insulation on developed schemes.
- **Limitations**: Capped by district arable land and national marshland conservation boundaries.

### Model 5: `TWIN-AREA-REALLOCATION-V1`
- **Type**: Land Allocation Simulator
- **Category**: Digital Twin
- **Assumptions**: Newly cultivated parcels match average district crop productivity.
- **Limitations**: Sub-sector topography and soil pH differentials not resolved.

### Model 6: `TWIN-BUDGET-PORTFOLIO-V1`
- **Type**: Capital Expenditure Optimization Simulator
- **Category**: Digital Twin
- **Unit Costs**: MINAGRI public expenditure benchmarks (2.5M RWF/ha irrigation, 45k RWF/ha seeds, 120k RWF/ha lime).
- **Assumptions**: Efficient tender execution with zero contractor delay.
- **Limitations**: Excludes macro-inflation and exchange-rate fluctuations.

---

## 3. UI Model Governance Panel

The catalog is viewable via the **Model Governance** tab in `AnalyticsDashboard.jsx`. It displays model cards with validation metrics, operational status tags, assumptions, and developer references.
