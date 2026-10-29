# HingaSmart Rwanda: local accounts

The application now uses separate accounts on this computer. Base44 accounts, tokens and records are not used in local mode.

## Start

Use Node.js 24 (verified with 24.20.0). From this folder:

```powershell
npm ci --legacy-peer-deps
Copy-Item .env.example .env.local
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open http://127.0.0.1:5174/. The ignored `.env.local` already enables `VITE_AUTH_MODE=local`. Port 5173 was already occupied by another app. The first start prebundles dependencies and may take about a minute.

`package-lock.json` pins installed versions. Installation uses `--legacy-peer-deps` for inherited React 19/react-day-picker peer conflicts.

## Accounts and storage

### Quick local sign-in

The login page has five panel badges matching Base44: **Administration**, **Analytics & planning**, **Field operations**, **Community & business**, and **Public insights**. Click one to enter its separate local account and panel without completing the password form. Each panel keeps its own navigation. The normal form is under **Use email and password instead**.

The administrator's **Switch panel** menu also contains all five panels, matching the Base44 oversight menu. Other accounts can enter only their assigned panel. Badge destinations follow the panel clicked rather than a previous login return URL.

Quick sign-in is explicitly enabled with `VITE_LOCAL_QUICK_LOGIN=true` in `.env.local`. It is allowed only in the development server, with local authentication and a loopback hostname. The server rejects it in production builds, when the flag is absent/false, or outside localhost. It uses the existing fixed accounts and never creates a user or changes a role. Normal session cookies, logout and CSRF checks still apply. Set the flag to `false` and restart to remove the badges.

An initial administrator was created as `admin@hingasmart.local`. Its generated password is in `.local-accounts.json`, which is ignored by Git. Keep that file private.

A second account, `viewer@hingasmart.local`, was registered through the UI to verify the Public Viewer flow. Its credentials are in the same ignored file under `viewer`.

The remaining panel accounts are `analyst@hingasmart.local`, `officer@hingasmart.local`, and `community@hingasmart.local`. Their generated credentials are stored under `analytics`, `field_operations`, and `community_business` in that file. Their assigned roles are Agricultural Analyst, Agricultural Officer, and Farmer, respectively.

The **Create one** link registers a local account without sending email. New accounts always receive the `public_viewer` workspace; registration rejects supplied role fields. Workspace roles are read from the database and cannot be selected in a browser to gain access.

The local D1/SQLite database is stored under `.wrangler/state/v3/d1/`. Keep `.wrangler/state` to preserve accounts across restarts. Dependency installation and production builds do not replace this database. Deleting the local database removes its users and sessions.

Passwords are salted PBKDF2-SHA256 hashes (100,000 iterations, supported by workerd). Session tokens are random, stored only as hashes in the database, and carried in HttpOnly, SameSite=Strict cookies. Sessions expire after 12 hours. Logout revokes the server-side session. Five failed sign-ins for an email trigger a 15-minute limit. Local authentication endpoints require local mode and a loopback hostname; writes also check request origin. TanStack's CSRF middleware protects server-function requests.

The dev server blocks HTTP access to `.wrangler`, `.local-accounts.json` and temporary account SQL files, in addition to Vite's default environment/key/Git exclusions.

## Provisioning and password recovery

The person managing this computer can create an account with an assigned role:

```powershell
node scripts/local-account.js --email analyst@example.com --role agricultural_analyst --name "Local Analyst"
```

The command prints a generated password once. Valid roles are in `src/lib/rbac.js`. This is an offline local administration command; normal registration cannot assign these privileges.

Assign a workspace to an existing account and revoke its old sessions:

```powershell
node scripts/local-account.js --email analyst@example.com --set-role --role agricultural_analyst
```

Reset an existing local password and revoke its sessions:

```powershell
node scripts/local-account.js --email analyst@example.com --reset
```

Email recovery and Google login are not configured for local accounts. Their controls are omitted in local mode. Account and role management from the Administration page is not yet implemented.

## Data features

Local identities are kept separate from the existing Base44 backend. Published NISR agricultural tables now populate the local database: 2,160 observations across 30 districts, six crops and 2024–2026 Seasons A and B. All 32 supplied survey archives are catalogued separately. See [LOCAL_DATA.md](LOCAL_DATA.md) for source details, limitations and the repeatable import workflow. Local reads require a valid session; archive metadata and import logs require an administration role. The map can create an investigation with a server-resolved evidence snapshot. Other data mutations, invitations and Base44 service-role operations remain unavailable. Sample preview is explicitly labelled and does not modify records.

To deliberately reconnect to the original Base44 accounts instead, change `VITE_AUTH_MODE=base44` and restart the dev server. The existing Base44 app ID and URL remain in `.env.example`; the original SDK auth flows remain available in that mode. Local cookies do not authenticate to Base44.

## Verification

```powershell
node --test tests/local-auth.test.js tests/sign-in.test.js tests/local-data.test.js tests/district-map.test.js
node scripts/check-real-data.js
node scripts/check-local-auth.js
npm run lint
npm run build
```

The HTTP check requires the dev server on port 5174 and the ignored administrator setup file. It checks a real login, cookie flags, session lookup, cross-origin denial, logout and revocation, without printing passwords or session cookies. Unit tests cover hashing, registration privilege rejection, bad credentials, normalization, expiry, deactivation, forged sessions, throttling and role-aware redirects.

Browser checks passed for administrator login, page-refresh persistence, logout, registration to Public Insights, redirecting a Public Viewer who enters `/admin` back to Public Insights, the Administration and Analytics entry badges, and switching from Administration to Public insights through the five-option administrator menu. All 27 unit tests, HTTP checks (including all five panel badges, roles and landing routes), lint and the production build pass. The production server bundle passes `development: false` to the quick sign-in guard.

The Cloudflare runtime may fall back to placeholder `Request.cf` metadata when its optional metadata fetch times out. Builds also emit an inherited CSS source-map warning.

## Original source and dependency audit

The original Base44 main-branch copy contained 170 source files. `migration/base44-source-manifest.json` records that original import's paths, sizes and SHA-256 hashes; it is not a manifest of subsequent local authentication changes.

The inherited dependency set reports one high npm advisory for `zod` and two low advisories for `react-quill-new`/`quill`. See `migration/npm-audit.json`; dependency upgrades were kept outside this authentication change.
