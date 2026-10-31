# AgriWiser Project Documentation

AgriWiser is an agricultural intelligence and decision-support application focused on Rwanda. This guide introduces the current product, its technical structure, data practices, security model, development workflow and detailed references maintained with the repository. For a user-oriented explanation of the complete product and its boundaries, see the [Current Product Guide](CURRENT_PRODUCT_GUIDE.md).

## Contents

- [Product overview](#product-overview)
- [Workspaces](#workspaces)
- [Current feature map](#current-feature-map)
- [System architecture](#system-architecture)
- [Data and analytical practice](#data-and-analytical-practice)
- [Identity and security](#identity-and-security)
- [Local development](#local-development)
- [Validation](#validation)
- [Deployment](#deployment)
- [Reference library](#reference-library)

## Product overview

AgriWiser connects published agricultural statistics, climate context, maps, analytical tools, reports and authorized field workflows. Its central journey is to discover relevant information, understand its context, investigate patterns, coordinate follow-up where permitted, and communicate findings with their evidence.

The application is built for users who need to explore agricultural conditions and make informed decisions. Access to protected actions and records is governed by server-side authorization and the signed-in user's current role. Data availability depends on the deployment and configured sources.

## Workspaces

The application has five main workspaces:

| Workspace | Scope |
| --- | --- |
| Administration | Authorized account, dataset and system operations. |
| Analytics & Planning | Agricultural indicators, dataset exploration, comparisons, maps, reports and planning analysis. |
| Field Operations | Assigned investigation work and operational follow-up. |
| Community & Business | Community-focused agricultural information and business-relevant published records. |
| Public Insights | A USSD-menu simulator that previews how selected agricultural information could appear through a basic-phone flow. |

Agricultural Solutions is a feature within Analytics & Planning, not a sixth workspace. Weather and climate analysis, reports and dataset tools are available within the application's existing navigation and permissions.

## Current feature map

The workspace table above gives the high-level structure. Current user-facing capabilities include:

- **Agricultural data:** Overview, dataset exploration, crop and district comparisons, maps and published-source context.
- **Analytics & Planning:** Planning tools, Agricultural Solutions, risk intelligence, Digital Twin scenarios, AI Agricultural Analyst, model governance, weather and climate, alerts, and reports with export options.
- **Field Operations:** Investigations and follow-up workflows with assignments, evidence references, audit events, review gates and role-checked actions.
- **Community & Business:** Agricultural information, seasonal comparisons, approved guidance, per-user saved interests, Rwanda Agriculture Snapshot, historical Market Prices & Trends, and Directory & Services.
- **Public Insights:** An English/Kinyarwanda USSD simulator for demonstrating menu navigation and selected information paths.

The simulator does not place calls or connect to a telecom gateway. Market-price records are historical WFP observations rather than live eSoko quotes. Listings and guidance should be verified with their responsible source before users act. Analysis scenarios are hypothetical and do not establish causal effects. The [Current Product Guide](CURRENT_PRODUCT_GUIDE.md) explains these capabilities and their limits in detail; [Price Data Sources](PRICE_DATA_SOURCES.md) documents the market-price data specifically.

## System architecture

AgriWiser uses React 19, JavaScript/JSX, TanStack Start, Vite, Cloudflare Workers and Supabase. File-based routes and server-side rendering are part of the application structure. `src/routes/__root.jsx` owns the document shell, and the router tree is generated.

The browser uses the application's data adapter and authenticated server functions. Server code verifies the request identity and performs data access under the application's authorization rules. Supabase is the configured application backend. Local SQLite support is retained for offline development and migration tests.

### Important code areas

| Location | Responsibility |
| --- | --- |
| `src/routes/` | File-based route definitions, including the authenticated workspace routes. |
| `src/components/` | Shared interface, workspace panels, maps and visualizations. |
| `src/hooks/` | Client query hooks for observations and application records. |
| `src/api/` | Browser-facing application data adapter. |
| `src/lib/` | Authentication, authorization, metrics, provenance and server-side services. |
| `supabase/migrations/` | Versioned database schema and policy changes. |
| `tests/` | Automated Node test suites. |
| `docs/` | Product, architecture, data, security and validation references. |

## Data and analytical practice

Agricultural statistics and climate products have different origins and meanings. Interpret a value with its indicator definition, unit, period, geography, source and quality context. A missing observation is not zero. Historical production is not current inventory, supply, price, demand or a confirmed commercial opportunity.

Yield or change calculations should be shown only when their source values and definitions support the calculation. Seasonal comparisons should use compatible periods and definitions. Weather estimates should be described as estimates at their native coverage and resolution, not as direct measurements at an individual farm. Observed association does not establish causation.

The application documentation includes a data inventory, provenance notes, statistical methods and real-data verification references. These describe the datasets and methods documented by the repository; runtime availability depends on deployment configuration. Historical price records, farmer survey prices, published agricultural statistics, external weather estimates and model outputs are distinct evidence types and should not be conflated.

## Identity and security

- Authenticate users through the configured Supabase Auth flow.
- Verify identity on the server and read current authorization roles from `hingasmart_profiles`.
- Enforce access to protected operations in server functions; interface visibility alone is not an access control.
- Keep Row Level Security enabled and use bounded server-side database operations.
- Validate permissions and inputs before using a server-secret client.
- Keep secrets out of browser bundles, source control and `VITE_` variables.
- Keep private files and database backups outside Git and static serving.

For detailed policies and role descriptions, see [Security and RBAC](SECURITY_AND_RBAC.md) and [Supabase setup](../SUPABASE_SETUP.md).

## Local development

### Prerequisites

- Node.js and npm compatible with the repository lockfile.
- Supabase credentials for local server execution.
- Cloudflare tooling for Worker deployment.

### Setup steps

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` for non-secret frontend configuration.
3. Copy `.dev.vars.example` to `.dev.vars` and configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`.
4. Review and apply the versioned migrations in `supabase/migrations/` using the procedure in [Supabase setup](../SUPABASE_SETUP.md).
5. Run `npm run dev -- --host 127.0.0.1 --port 5174`.

Do not commit either local environment file. Keep server secrets in server-only configuration.

## Validation

The repository defines lint and build scripts. Run the applicable checks from the project root:

```sh
npm run lint
node --test tests/*.test.js
npm run build
```

Use the test files and integration guidance relevant to the changed area. A successful build confirms bundling; it does not by itself validate external services, deployed database policies or browser workflows.

## Deployment

Build with `npm run build`. The build emits client files under `dist/client` and Worker output under `dist/server`. Configure production secrets in the hosting platform, apply reviewed migrations using the deployment's database release procedure, and deploy the Worker through the authorized Cloudflare account workflow. Do not deploy local shortcuts or local database placeholders as production infrastructure.

Database changes require review against the existing schema and policies, a private backup, and a safe migration rehearsal before production application. Consult [Supabase setup](../SUPABASE_SETUP.md) for the repository's migration guidance.

## Reference library

### Product and application operations

- [Project README](../README.md) — concise overview and quick start.
- [Current Product Guide](CURRENT_PRODUCT_GUIDE.md) — current feature set, end-to-end use, workspace capabilities and interpretation limits.
- [Product and system specification](../Documentation.md) — detailed product requirements and implementation specification.
- [Local development setup](../LOCAL_SETUP.md) — local application configuration.
- [Supabase setup](../SUPABASE_SETUP.md) — authentication, schema, migrations and operational guidance.

### Data and analytical methods

- [Real-data inventory](REAL_DATA_INVENTORY.md) — documented datasets and observation coverage.
- [Real-data verification](REAL_DATA_VERIFICATION.md) — verification approach and evidence.
- [Data provenance](DATA_PROVENANCE.md) — source lineage and evidence context.
- [Price data sources](PRICE_DATA_SOURCES.md) — WFP extract provenance, licensing context, preparation, dates and limitations.
- [Statistical methods](STATISTICAL_METHODS.md) — definitions and calculation methods.
- [Explore data](../EXPLORE_DATA.md) — dataset discovery and use.
- [Weather](../WEATHER.md) — weather sources and analysis context.

### Security, intelligence and testing

- [Security and RBAC](SECURITY_AND_RBAC.md) — roles, authorization and security boundaries.
- [Intelligence architecture](INTELLIGENCE_ARCHITECTURE.md) — analytical service organization.
- [Risk engine](RISK_ENGINE.md) — risk analysis approach and interpretation.
- [Digital twin](DIGITAL_TWIN.md) — scenario analysis documentation.
- [AI agricultural analyst](AI_AGRICULTURAL_ANALYST.md) — evidence-grounded analyst capabilities.
- [Model governance](MODEL_GOVERNANCE.md) — model registry, assumptions and evaluation context.
- [Integration tests](INTEGRATION_TESTS.md) — integration validation guidance.
- [Implementation reports](implementation/) — scoped implementation and baseline reports.

## Contribution guidelines

Keep changes consistent with the existing application architecture. Preserve authorization boundaries, data provenance, user data and generated-file conventions. Add or update relevant tests for behavior changes, and report validation results accurately. Never commit credentials, private respondent data, local backups or generated router output.
