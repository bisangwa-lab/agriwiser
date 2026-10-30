# AgriWiser — Statistical Methods & Safeguards

## 1. Zero-Baseline Protection & Missing Value Handling

In agricultural reporting, treating missing values as zeroes is a catastrophic defect that fabricates false $100\%$ production declines.

The Statistical Engine (`src/lib/intelligence/statistical-engine.js`) implements strict mathematical safeguards:

### Missing Data Contract
```javascript
toNumber(null)      // returns null
toNumber(undefined) // returns null
toNumber('')        // returns null
toNumber(0)         // returns 0 (valid observed zero)
```

### Baseline Zero Rules
When evaluating relative change between baseline $B$ and current value $C$:
1. If $B = \text{null}$ or $C = \text{null}$, return `status: 'missing_data'`, `percentChange: null`.
2. If $B = 0$ and $C > 0$, return `absoluteChange: C`, `percentChange: null`, `reason: 'baseline_is_zero'`.
3. If $B = 0$ and $C = 0$, return `status: 'no_change'`, `absoluteChange: 0`, `percentChange: 0`.
4. If $B > 0$, compute:
   $$\text{Percent Change} = \frac{C - B}{B} \times 100$$

---

## 2. Exact Agricultural Production Decomposition

When crop production changes between two seasons, the difference is driven by two interdependent factors:
1. Changes in cultivated/harvested land area ($\Delta A$)
2. Changes in crop yield/productivity ($\Delta Y$)

The statistical engine calculates the exact decomposition:
$$\Delta P = P_{\text{current}} - P_{\text{base}}$$
$$\text{Area Contribution} = Y_{\text{base}} \cdot \Delta A$$
$$\text{Yield Contribution} = A_{\text{current}} \cdot \Delta Y$$

### Mathematical Identity Proof
$$Y_{\text{base}} \cdot (A_{\text{curr}} - A_{\text{base}}) + A_{\text{curr}} \cdot (Y_{\text{curr}} - Y_{\text{base}})$$
$$= Y_{\text{base}} A_{\text{curr}} - Y_{\text{base}} A_{\text{base}} + A_{\text{curr}} Y_{\text{curr}} - A_{\text{curr}} Y_{\text{base}}$$
$$= A_{\text{curr}} Y_{\text{curr}} - A_{\text{base}} Y_{\text{base}}$$
$$= P_{\text{current}} - P_{\text{base}} = \Delta P$$

This exact recovery eliminates residual terms and isolates whether land contraction or yield shock drove the observed production shift.

---

## 3. Ordinary Least Squares (OLS) Linear Regression

For time series points $(x_i, y_i)$:
$$\text{Slope } \beta_1 = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sum (x_i - \bar{x})^2}$$
$$\text{Intercept } \beta_0 = \bar{y} - \beta_1 \bar{x}$$
$$R^2 = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$$
$$\text{Standard Error } \text{SE} = \sqrt{\frac{\sum (y_i - \hat{y}_i)^2}{n - 2}}$$

---

## 4. Exponential Smoothing

Simple exponential smoothing recursively weights recent observations:
$$\hat{Y}_{t+1} = \alpha \cdot Y_t + (1 - \alpha) \cdot \hat{Y}_t$$
With damping parameter $\alpha = 0.35$.
