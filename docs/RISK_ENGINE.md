# Innovation One: Predictive Agricultural Risk & Response Engine

## 1. Engine Objectives & Philosophy

The Predictive Agricultural Risk & Response Engine (`src/lib/intelligence/risk-engine.js`) identifies emerging agricultural stress, land contractions, and crop output collapses before they manifest as regional food security crises.

Key capabilities:
- Multi-signal detection across agricultural surveys and satellite climate data.
- Transparent composite risk scoring (0 to 100) with confidence metrics.
- Validated predictive forecasting with 90% confidence intervals.
- Direct operational handoff to Field Operations for on-the-ground verification.

---

## 2. Risk Levels & Thresholds

| Risk Level | Score Range | Operational Meaning | Recommended Protocol |
| :--- | :--- | :--- | :--- |
| **LOW** | 0 – 19 | Production within normal seasonal parameters | Regular surveillance |
| **MODERATE** | 20 – 39 | Minor anomalies in rainfall or small yield dips | District agronomist desk review |
| **ELEVATED** | 40 – 59 | Noticeable decline in output (>10%) or dry spell | Targeted sector sampling |
| **HIGH** | 60 – 79 | Severe drop (>20% prod or >15% area) | Prompt field investigation dispatch |
| **CRITICAL** | 80 – 100 | Acute collapse (>35% prod) or compound climate-crop shock | Emergency inter-agency response |

---

## 3. Multi-Signal Detection Architecture

The engine integrates multiple independent signals:

1. **Agricultural Production Drop (`SIG-PROD-DECLINE`)**:
   - Compares current season output against immediate previous season baseline.
   - Severity: Moderate (10–19%), High (20–34%), Critical (>=35%).
2. **Harvested Area Contraction (`SIG-AREA-CONTRACTION`)**:
   - Detects abandonment or delayed planting (>=15% contraction).
3. **Yield Shock (`SIG-YIELD-DROP`)**:
   - Uses exact production decomposition (`decomposeProductionChange`) to evaluate whether output loss was driven by land contraction or yield collapse.
4. **Multi-Season Persistent Trend (`SIG-PERSISTENT-DECLINE`)**:
   - Flags cumulative declines across 3 or more consecutive cycles.
5. **Climate Stress Anomaly (`SIG-RAINFALL-DEFICIT` / `SIG-HEAT-STRESS`)**:
   - Integrates MERRA-2 and ERA5 rainfall deficits (<= -20% or <= -35%) and temperature anomalies (>= +1.2°C).

---

## 4. Predictive Forecasting Methodology

For time-series with $\ge 3$ verified points, the engine computes:
- **Exponential Smoothing**: Holt-Winters / Brown simple smoothing ($\alpha = 0.35$).
- **Ordinary Least Squares (OLS) Regression**: Trend slope and $R^2$ goodness-of-fit.
- **Ensemble Blend**:
  $$\hat{Y}_{t+1} = 0.60 \cdot \hat{Y}_{\text{exp}} + 0.40 \cdot \hat{Y}_{\text{OLS}}$$
- **Uncertainty Bounds**: 90% confidence interval ($z = 1.645 \cdot \text{SE}$).
- **Non-negativity constraint**: $\text{Lower Bound} = \max(0, \text{Lower Bound})$.

---

## 5. Field Operations Handoff

When risk is evaluated, the `buildInvestigationProposal(riskAssessment)` method creates a standardized investigation draft:
- Pre-populated with district, crop, season, and priority.
- Embedded signal evidence payload and cryptographic timestamp.
- Concrete verification tasks tailored for Rwanda Agricultural Board (RAB) agronomists:
  1. Conduct transect walks in high-risk sectors.
  2. Survey Agricultural Extension Officers (AEOs) regarding seed distribution timing.
  3. Inspect RAB pest surveillance bulletins.
  4. Measure farm-gate grain moisture levels.
