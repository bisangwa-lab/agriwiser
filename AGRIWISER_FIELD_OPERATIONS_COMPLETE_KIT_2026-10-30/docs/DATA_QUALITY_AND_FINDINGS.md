# Statistical findings policy & triage safeguards

A finding is a **review signal**, never proof of a disaster, cause, falsification or change in physical reality. Relevant uncertainty includes survey error, publication revision, sampling methods, geography-level mismatch, incomplete seasonal coverage and numeric extraction faults.

## Existing detector in repo
`src/lib/alert-rules.js`: latest and preceding year, same crop/district/season, indicators production, harvested_area and derived yield. Current thresholds review >=15%, priority >=30%; minimum absolute change production 50 t, area 25 ha, yield 0.08 t/ha. These are project-defined. An alert must display rule ID/version, threshold, observed/baseline, absolute/relative difference and quality flags.

## Robust pre-alert validation
- Compare only allowed source dimensions, same release policy, units and seasonal coverage.
- Validate source zero vs missing and positive baseline. If baseline missing or zero: don't calculate percentage change.
- Check district codes/boundaries, season A year convention, crop parent and subtype duplicates.
- Check source revision date and tables/sheets; distinguish no report from reported zero.
- If the same record is used across multiple alerts, show source link and rule details.
- Allow analysts to suppress with reviewed reason, expiration, audit trail, never quietly delete.

## Finding priority formula
Do not invent a universal NISR 'risk score'. Prefer transparent severity based on existing documented thresholds, data quality, recentness, assignment and human escalation. If introducing a composite score, require preapproved weights, rationale, evaluation, configuration version, and no bias from greater data coverage masquerading as greater need.

## Investigation-to-finding link
One finding may have a case record; case can also be started manually. The link contains source snapshot, exact matching keys, no automatic status claim, user who opened, timestamps and idempotent UUID. Later source updates do not overwrite the original evidence snapshot; show a separate 'newer data available' marker.

## Case evidence classification
Published source observation | calculated derivative | field-recorded observation | model-based climate estimate | independent published reference | submitted testimony | simulation. Different types have different confidence/collection rules. None automatically establishes a causal relationship.
