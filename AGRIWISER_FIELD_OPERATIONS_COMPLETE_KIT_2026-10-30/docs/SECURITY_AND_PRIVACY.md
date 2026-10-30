# Security, privacy and authorization requirements

## Threats
- A field officer updates a supervisor-approved case by guessing its ID.
- A policy-maker opens a private investigation through direct API access.
- Local auth users invoke a application mutation without a protected server check.
- A downloaded evidence attachment URL leaks confidential content.
- Household microdata is copied into client state, prompt logs, PDF report, git, or public S3.
- User-supplied descriptions inject HTML into notes/reports.
- Fraudulent source URLs or tampered snapshots masquerade as NISR.

## Controls
- Authenticate on every server read/write, not just the frontend route guard.
- Authorize actions based on canonical role, assigned district/scope, case membership, tenant/workspace (if present), record confidentiality, approval state and ownership. Default deny.
- Supervisor approve/return must be limited to supervisor or explicitly delegated approver, with non-self approval as required by policy.
- User/role assignment only by privileged role, verify selected assignee account and applicable geographic scope.
- Store audit actor/user ID, action, record ID, before/after reason, timestamp, request correlation ID; prevent users from altering/deleting audit history.
- Use CSRF and same-site cookie protections in local mode, rate limits, server-side schema validation, safe ID parsing, optimistic version checks and idempotency keys.
- File upload: allowlisted MIME/extension; bounded size; content validation & malware scanning where available; private storage; random non-guessable object key; signed URLs short TTL; access check per request; retention and safe deletion protocol. Do not rely on `accept=` attributes.
- Avoid collecting phone, plot GPS, identity or household details unless essential, legally authorized and minimized. Do not expose raw microdata publicly.
- Store API keys and credentials server side; do not commit `.env` or download files containing private data.
- Security scan of export/HTML content; escape user notes and sanitize/validate optional rich text.
- Never claim compliance certifications without evidence; verify actual Rwanda privacy/legal requirements with counsel when applicable.

## Role permissions (proposed baseline)
| Action | Officer | Investigator | Supervisor | Analyst | Data manager | Super admin |
|---|---|---|---|---|---|---|
| Read permitted published aggregates | Y | Y | Y | Y | Y | Y |
| Read assigned/private cases | scoped | scoped | supervised scope | only explicitly granted | admin process | privileged |
| Create investigation | assigned scope | Y | Y | optionally propose | data review only | Y |
| Add field notes | assigned cases | assigned cases | assigned cases | N | N | audited |
| Assign/reassign cases | N | N | Y | N | N | Y |
| Decide review/approve | N | N | Y | N | N | delegated |
| Import/update official dataset | N | N | N | N | Y | Y |
| Public export of private notes | N | N | N | N | N | N |

**Important:** This is a proposed policy, not a statement of deployed authorization. Reconcile roles and source data permissions with organization policy. `src/lib/route-access.js` currently has a permissive legacy helper; server-side read/write restrictions still required.
