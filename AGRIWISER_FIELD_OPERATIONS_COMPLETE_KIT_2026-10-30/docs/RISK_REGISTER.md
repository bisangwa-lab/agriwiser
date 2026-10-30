# Field Operations risk register

| Risk | Impact | Mitigation / gate |
|---|---|---|
| D1 local writes unavailable | Users cannot save actions | Build authenticated server writes in P2; test both auth modes |
| First-page count truncated | False zero/total and missed work | Aggregate server counts or full cursor pagination; load warning |
| Misclassified missing as zero | False -100% alarms | Null/zero tests and raw source checks |
| Cross-period comparison | Misleading change | Align year/season/district/crop/release + unit |
| Duplicate source categories | Inflated production | Parent/subtype reconciliation and disjoint aggregation |
| Broad RLS | Private case leakage | Server per-record ACL, 403 tests, least privilege |
| Case closed without validation | Operational false assurance | Review gate and auditable exception policy |
| Weather interpreted as observed farm measurement | Inaccurate conclusions | Source and spatial resolution badges, explanatory text |
| Private microdata exposure | Privacy harm | Only approved aggregates, secure local archives, redact reports |
| Evidence tampering | Untrustworthy audit | Immutable snapshots, hashes, audit events, signed download |
| Wrong weather redirect | Broken field officer workflow | Navigation regression tests across officer roles |
| Misleading 'live' data counts | User trusts stale snapshots | Source as-of timestamp + data completeness status |
