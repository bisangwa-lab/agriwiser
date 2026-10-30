# Innovation Two: Agricultural Digital Twin & Policy Simulator

## 1. Executive Summary & Purpose

The Agricultural Digital Twin & Policy Simulator (`src/lib/intelligence/digital-twin.js`) enables policy makers, agricultural planners, and analysts to simulate the impacts of climatic shocks, infrastructural investments, and input programs before allocating public funds.

Crucially, **a simulation is never presented as an empirical observation or established causal truth.** All simulation outputs are explicitly tagged as `SCENARIO_OUTPUT`, with documented equations, baseline evidence links, and caveat disclosures.

---

## 2. Six Supported Policy Scenarios

### 1. Seasonal Rainfall Variation Scenario (`rainfall`)
- **Model**: `TWIN-RAINFALL-RESPONSE-V1`
- **Formula**:
  $$\Delta Y = Y_{\text{base}} \cdot \epsilon_{\text{crop}} \cdot \left(\frac{\Delta R}{100}\right) \cdot \left(1 - 0.15 \left|\frac{\Delta R}{100}\right|\right)$$
- **Crop Elasticities ($\epsilon$)**:
  - Maize: 0.72
  - Beans: 0.65
  - Rice: 0.85
  - Irish Potato: 0.55
  - Cassava: 0.35

### 2. Irrigation Expansion & Marshland Modernization (`irrigation`)
- **Model**: `TWIN-IRRIGATION-EXPANSION-V1`
- **Productivity Multiplier**: $1.65\times$ on newly irrigated parcels due to guaranteed moisture stability.
- **Formula**:
  $$P_{\text{sim}} = (A_{\text{rainfed}} \cdot Y_{\text{base}}) + (A_{\text{irrigated}} \cdot Y_{\text{base}} \cdot 1.65)$$

### 3. Agronomic Productivity Uplift (`productivity`)
- **Parameters**: `yieldIncreasePct` (e.g. $+15\%$ to $+25\%$).
- Simulates certified hybrid seeds and balanced inorganic/organic fertilization adoption.

### 4. Harvested Land Reallocation (`harvested_area`)
- **Model**: `TWIN-AREA-REALLOCATION-V1`
- Simulates district crop consolidation programs while respecting total arable physical land boundaries.

### 5. Combined Multi-Factor Stress & Intervention (`combined`)
- Simultaneously models climate drought stress, partial irrigation insulation, input subsidies, and harvested area changes.

### 6. Budget-Constrained Intervention Portfolio (`budget_allocation`)
- **Model**: `TWIN-BUDGET-PORTFOLIO-V1`
- **Public Expenditure Benchmarks**:
  - Hill-side / Marshland Irrigation Scheme: 2,500,000 RWF / hectare
  - Certified Seed Subsidies: 45,000 RWF / hectare
  - Agricultural Lime & Soil Conditioning: 120,000 RWF / hectare
- Optimizes capital distribution to maximize aggregate district food security.

---

## 3. Sensitivity Analysis Sweep

Every simulation run automatically generates a five-point parameter sensitivity sweep ($-20\%, -10\%, 0\%, +10\%, +20\%$), allowing decision-makers to evaluate margin of error and downside risk.

---

## 4. UI Integration

The simulator is accessible through the **Digital Twin** tab in `AnalyticsDashboard.jsx`, featuring:
- Scenario type selection
- Interactive slider controls for parameters
- Comparative metric cards (simulated vs. baseline)
- Side-by-side production and yield charts
- Formally documented assumptions and formulas.
