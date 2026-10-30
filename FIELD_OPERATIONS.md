# Field Operations — evidence to action

Field Operations is the place for agricultural officers to work through a reported concern. It is deliberately a workflow, not a duplicate statistics dashboard.

## Four steps

1. **Review the finding and assignment.** Start a case with an explicit reason, district, crop, reporting period and accountable field account. Existing district-map investigations remain supported. In local mode, assigning by email is checked against an active local field-work account; an empty email leaves the case unassigned.
2. **Record observations.** Add dated notes describing what was actually checked. Notes are attributed on the server to the signed-in user and are append-only. Source claims and field reports are not automatically treated as official statistics or proof of cause.
3. **Assign follow-up actions.** Each action needs a clear title, owner and due date. Officers can track pending, in-progress, completed and cancelled work; marking an action complete requires a written outcome.
4. **Record the outcome.** Explain what the investigation established, what remains uncertain and what should happen next. Closing requires an outcome summary. Completing an investigation does not imply a follow-up task is finished.

The Field Operations homepage highlights unassigned, overdue and evidence-blocked cases, with links to the case detail and next action. Additional weather context is optional and does not claim causality.

## Local data and integrity

- The local backend supports creating/updating Investigation and FollowUpAction records and creating InvestigationNote records; unrelated collections remain read-only.
- Mutations are POST server functions, require a valid local session and approved field-work role, and write to D1 with bound SQL parameters.
- The authenticated identity, record IDs, creation timestamps and note author are assigned on the server. Assignments must use active local field-work accounts.
- Existing immutable evidence, source snapshots, dataset references and original creator fields cannot be changed through the local update endpoint.
- A case linked to an alert copies that alert's existing evidence and dataset metadata from the server rather than trusting source figures typed in the browser.
- User-entered notes are distinguished from published observations; no source observations are inserted by these field-work operations.
- Concurrent updates are rejected rather than silently overwriting another officer's change.
- Readability and permissions for local work records remain governed by the existing role-aware read service.
- Local case lists, notes and actions traverse all result pages; the Base44 backend continues to use its existing entity API and rules.

## Verify

Run in a compatible Node.js 24 environment:

```sh
node --test tests/field-work.test.js tests/local-auth.test.js tests/local-data.test.js tests/district-map.test.js
npm run lint
npm run build
```

Then test in a running local app:

1. Sign in as a field-work account. Start an investigation. Confirm it appears in the queue and survives reload.
2. Assign to a valid account email. Verify an unknown or public account is rejected.
3. Open the investigation, add a dated observation, reload and confirm it is preserved.
4. Add a follow-up with owner and due date. Mark it in progress. Attempt completion without an outcome, then complete with a written result.
5. Attempt to close the investigation without a meaningful outcome; verify it is rejected. Add an outcome and complete.
6. Confirm source evidence remains unchanged, and the homepage count and task queues update after writes.
7. Test public-viewer access denial, direct server-function requests, and two-officer concurrent edits.
8. Check responsive layout, navigation and screen-reader labels on desktop/mobile.

## Limits

This implementation does not upload photographs, capture GPS, send notifications, dispatch real-world assistance, validate the truth of field notes, or automatically infer causes. Assigned people must already have active local accounts. The Base44 mode continues to require review of its own entity-level access rules. Any weather sidebar-context fix is tracked separately from this feature.

The repository source and tests describe intended behavior; successful deployment and end-to-end execution must be independently verified.
