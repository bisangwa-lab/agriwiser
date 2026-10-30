# Project44 validation record

Snapshot: `c80d0a7415ea1add6a23f7eb273b32b0baa12e0e`. Audit date: 30 October 2026.

Existing Node test suite: **74 passed / 0 failed**. Lint passed. Production build completed with missing Base44 app configuration warnings and a CSS source-map warning. Reused installed dependencies; no fresh installation or deployment test. No live records changed.

## Additional executed probes

### A1 — Dashboard total ignores absent/null district cell

Observed output:

```json
100
```

Expected safe behavior: Withhold total or explicitly label partial 100.

### A2 — Shared yield engine accepts wrong production units

Observed output:

```json
1000
```

Expected safe behavior: Reject incompatible units or convert 1000 kg to 1 tonne.

### A3 — Null observation creates false 100% decline alert

Observed output:

```json
[
  {
    "indicator": "production",
    "current": 0,
    "change": -100
  }
]
```

Expected safe behavior: No production-change alert from null current value.

### A4 — CSV validator accepts Infinity

Observed output:

```json
[
  {
    "value": "Infinity",
    "flags": []
  }
]
```

Expected safe behavior: Reject non-finite numbers.

### A5 — Shared CSV export leaves spreadsheet formula active

Observed output:

```json
"note\n=1+1"
```

Expected safe behavior: Neutralize formula in text columns.

### A6 — Map and climate crop selectors accept forecast status

Observed output:

```json
{
  "mapYield": 10,
  "climateYield": 10
}
```

Expected safe behavior: Withhold observed-statistics output for observation_status=forecast.

These are controlled local inputs, not observed production incidents. See the main audit for source citations, impacts and proposed fixes.
