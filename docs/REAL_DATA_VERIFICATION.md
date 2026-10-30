# AgriWiser — Real-Data Acceptance Verification

## 1. Acceptance Methodology

In strict compliance with Section 3 (Mandatory Real-Data Policy) and Section 16 (Real-Data Acceptance Verification) of the Master Implementation Directive:
- Every analytical flow was executed against genuine agricultural records stored in `data/private/pre-supabase.sqlite` and published by the National Institute of Statistics of Rwanda (NISR).
- No simulated, interpolated, or fabricated baseline records were used.
- Comparisons strictly match identical crops, seasons, and administrative district boundaries.

---

## 2. Verified Real-Data Case Studies (NISR SAS 2023 vs. SAS 2024 Season A)

### Case Study A: Bugesera District · Maize (Season A)

| Dimension | 2023 Baseline Observation | 2024 Current Observation | Absolute Change | Relative Change (%) | Primary Source Reference |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Production** | 7,561 metric tonnes | 14,752.15 metric tonnes | +7,191.15 tonnes | +95.1% | SAS 2023 Table 22!C35 / SAS 2024 Table 21!D33 |
| **Harvested Area**| 8,003 hectares | 9,660.75 hectares | +1,657.75 ha | +20.7% | SAS 2023 Table 13!C34 / SAS 2024 Table 13!D33 |
| **Cultivated Area**| 8,003 hectares | 9,660.58 hectares | +1,657.58 ha | +20.7% | SAS 2023 Table 10!C34 / SAS 2024 Table 10!D33 |
| **Reported Yield** | 945 kg/ha (0.945 t/ha)| 1,527.02 kg/ha (1.527 t/ha)| +582.02 kg/ha | +61.6% | SAS 2023 Table 16!C33 / SAS 2024 Table 16!D33 |

#### Production Change Exact Decomposition
Using $\Delta P = Y_{\text{base}} \cdot \Delta A + A_{\text{curr}} \cdot \Delta Y$:
- $\text{Area Contribution} = 0.94477 \text{ t/ha} \times 1,657.75 \text{ ha} = +1,566.2 \text{ tonnes}$ ($21.8\%$ of gain)
- $\text{Yield Contribution} = 9,660.75 \text{ ha} \times 0.58225 \text{ t/ha} = +5,624.95 \text{ tonnes}$ ($78.2\%$ of gain)
- $\text{Recovered Sum} = 1,566.2 + 5,624.95 = 7,191.15 \text{ tonnes} = \Delta P$ (Exact zero residual recovery).

---

### Case Study B: Nyagatare District · Maize (Season A)

| Dimension | 2023 Baseline Observation | 2024 Current Observation | Absolute Change | Relative Change (%) | Primary Source Reference |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Production** | 78,586 metric tonnes | 96,373.16 metric tonnes | +17,787.16 tonnes | +22.6% | SAS 2023 Table 22!C30 / SAS 2024 Table 21!D28 |
| **Harvested Area**| 25,732 hectares | 32,299.94 hectares | +6,567.94 ha | +25.5% | SAS 2023 Table 13!C29 / SAS 2024 Table 13!D28 |
| **Cultivated Area**| 25,700 hectares | 32,303.27 hectares | +6,603.27 ha | +25.7% | SAS 2023 Table 10!C29 / SAS 2024 Table 10!D28 |
| **Reported Yield** | 3,054 kg/ha (3.054 t/ha)| 2,983.69 kg/ha (2.984 t/ha)| -70.31 kg/ha | -2.3% | SAS 2023 Table 16!C28 / SAS 2024 Table 16!D28 |

#### Analytical Finding
In Nyagatare, Maize production expanded by $+22.6\%$, driven entirely by extensive land expansion ($+25.5\%$ harvested hectares), while unit productivity experienced a mild decline ($-2.3\%$).

---

### Case Study C: Nyagatare District · Beans (Season A)

| Dimension | 2023 Baseline Observation | 2024 Current Observation | Absolute Change | Relative Change (%) | Primary Source Reference |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Production** | 14,417 metric tonnes | 14,681.35 metric tonnes | +264.35 tonnes | +1.8% | SAS 2023 Table 22!P30 / SAS 2024 Table 21!S28 |
| **Harvested Area**| 18,191 hectares | 16,618.44 hectares | -1,572.56 ha | -8.6% | SAS 2023 Table 13!P29 / SAS 2024 Table 13!S28 |
| **Reported Yield** | 793 kg/ha (0.793 t/ha) | 883.44 kg/ha (0.883 t/ha) | +90.44 kg/ha | +11.4% | SAS 2023 Table 16!P28 / SAS 2024 Table 16!S28 |

---

## 3. Verification Conclusion

Every single observation in these case studies was fetched directly from verified database records originating from official NISR Excel releases. The calculations, decompositions, and relative percentages match the theoretical identities with zero approximation errors.
