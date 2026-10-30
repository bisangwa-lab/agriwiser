# Test-only case walkthrough — no invented official measurements

1. An officer with permission opens a real source-linked alert; no record may be created if source/reference invalid or missing.
2. Existing case link opens the case; clicking create twice does not duplicate it.
3. New case stores snapshot, validated metadata and its source hash, records actor and timestamp.
4. Supervisor assigns permitted district officer; assignment audit is recorded.
5. Officer records text observation, optional allowed attachment, observed date and classification.
6. Supervisor returns incomplete evidence with reason. User sees outstanding evidence and status.
7. Officer adds evidence and resubmits; supervisor approves, audit records decision.
8. Follow-up actions show owner, deadline, overdue status; all approvals obey role and independent reviewer policy.
9. Case closes only with valid outcome, review and task disposition; generates sourced report without restricted microdata.
10. A public viewer, farmer, or officer outside the case scope receives 403 on API read/write, not merely hidden UI.

Use synthetic tests only in isolated tests/staging, clearly labelled fixture. Never present synthetic numbers as NISR data in production or screenshots.
