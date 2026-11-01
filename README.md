# AgriWiser

### Evidence-to-decision support for Rwanda's agricultural analysts

**The problem:** Agricultural analysts need to turn official statistics and related climate evidence into valid comparisons and findings they can explain, cite and act on. Those sources differ in indicator, unit, geography, reporting period and quality. If this context is lost, a comparison can mislead; if evidence is separated from its interpretation, it is harder to brief decision-makers or request field verification.

**AgriWiser helps analysts follow one evidence trail:** find the relevant observations, check their context and quality, compare compatible data, investigate patterns, prepare a source-backed report, and route a supported signal for authorized field follow-up. Its primary user is the **Agricultural Analyst**. Policy makers use the resulting analysis; field teams verify questions raised by it. Other workspaces provide supporting services for distinct users.

The platform is designed around a simple principle: every figure should retain its source, unit, period and geographic context. Missing values stay missing, estimates are identified as estimates, and analytical scenarios are not presented as observed outcomes.

## The analyst workflow

1. **Find evidence:** select available datasets and observations by crop, district, season, indicator and period.
2. **Check context:** inspect source, unit, geography, reporting period, missing values and quality notes before interpreting a figure.
3. **Analyze:** compare compatible observations, review maps and risk signals, examine climate context, and run explicitly labeled scenarios or research queries.
4. **Explain:** prepare reports and exports with calculations, source references and limitations attached.
5. **Request verification:** when evidence supports it, create a source-linked field case. Authorized Field Operations staff assign the case and record field evidence and follow-up.

AgriWiser supports analysis; it does not establish why an agricultural outcome changed or turn a statistical signal into a confirmed field incident.

## Supporting workspaces

| Workspace | What users can do |
| --- | --- |
| **Administration** | Manage authorized accounts and data operations, review system information, and access account settings. |
| **Analytics & Planning** | Review agricultural indicators, explore and compare datasets, use maps and planning tools, inspect risk signals, run Digital Twin scenarios, consult the AI Agricultural Analyst, and prepare reports. |
| **Field Operations** | Review investigations, assignments and follow-up work; record evidence and outcomes through controlled workflows. |
| **Community & Business** | Browse community agricultural information, compare seasons, save interests, review Rwanda’s published agriculture snapshot, explore historical market-price context, and find listed cooperatives and opportunities. |
| **Public Insights** | Preview a basic-phone USSD menu experience in English or Kinyarwanda. It is a simulator, not a live telecom service. |

### Evidence-to-Field-Action Brief

The district risk review can create a field case with a source-linked brief containing the selected crop, season and district; current and baseline observations; rule-triggered signals; a descriptive yield comparison with other districts in the same source release when support is sufficient; and questions for field verification. The handoff stores the referenced published records with the case evidence snapshot. Field Operations staff assign an officer and record follow-ups with an owner and due date through the existing workflow.

The score is a review-priority aid, not a probability or confirmed diagnosis. The peer comparison is the median yield among other districts with complete production and harvested-area values from the same crop, season, year and dataset release. AgriWiser suppresses the comparison unless at least eight other districts have explicitly observed, unit-compatible values. This is a product support rule, not an NISR statistical threshold. The comparison does not establish causation or statistical significance. Survey precision is shown as unavailable where source records do not provide design-based uncertainty.

Demo path: open Analytics, choose a district/crop/season with review signals, inspect the source references and evidence brief, and create a field case. In the authorized Field Operations workflow, assign the case and create an owned, dated follow-up; then review the captured source evidence and verification result.

### Community and public information tools

- **Rwanda Agriculture Snapshot** filters published agricultural observations by crop, district, season and measure, with source context and comparisons where the data supports them.
- **Market Prices & Trends** presents historical WFP market observations with market locations, monthly medians and explicit date, unit and coverage context. It is not a live eSoko feed or a guaranteed offer.
- **Directory & Services** brings together listed cooperatives and approved sourcing opportunities. Users should confirm current membership, availability and terms with the relevant organization.
- **USSD Simulator** demonstrates numbered menus for market-price references, crop statistics, recent weather and support information. It places no calls, checks no eligibility and submits no service requests.

### Analysis, investigation and reporting

- Agricultural exploration and comparisons retain indicator definitions, units, source releases and reporting periods.
- Weather and climate analysis identifies provider, coverage, resolution, missing data and relevant limitations.
- Risk analysis surfaces evidence-based signals and can prepare a controlled handoff for field follow-up; the handoff does not itself confirm a cause or field condition.
- Digital Twin scenarios model hypothetical changes using explicit baselines and assumptions. Their results are scenarios, not forecasts or observed impacts.
- Reports and exports present selected evidence, explanations and source context for review and communication.

## Evidence and data limits

AgriWiser uses data available and configured for the deployment. Published agricultural statistics describe their stated reporting periods; they do not establish current inventory, demand, income or market availability. WFP price records are historical observations and may differ by market date and unit. USSD content is a demonstration. Confirm changing programs, prices, offers and services with the responsible local source before acting.

The application distinguishes published observations, external estimates, model outputs, sample previews and demo content. It does not infer missing values as zero, claim that weather caused an agricultural outcome, or label scenario outputs as validated forecasts. See [Data Provenance](docs/DATA_PROVENANCE.md), [Statistical Methods](docs/STATISTICAL_METHODS.md), [Weather](WEATHER.md) and [Price Data Sources](docs/PRICE_DATA_SOURCES.md).

## Access and security

AgriWiser provides separate workspaces for signed-in users. Server-side checks still govern access to protected records and operations; a workspace switcher or hidden button is not the security boundary. Supabase identity is verified by server code, current roles are read from `hingasmart_profiles`, and Row Level Security remains enabled. Server secrets stay in ignored local settings or hosting secret storage. Private respondent files and backups are not published as application assets.

See [Security and RBAC](docs/SECURITY_AND_RBAC.md) and [Supabase setup](SUPABASE_SETUP.md) for the implementation and operational controls.

## Technology

React 19, JavaScript and JSX, TanStack Start, Vite, Cloudflare Workers and Supabase. The application uses file-based routes and server-side rendering; `src/routes/__root.jsx` owns the HTML document. Supabase is the configured application backend. Local SQLite support remains available for offline development and migration tests.

## Run locally

### Requirements

- Node.js and npm compatible with the project lockfile.
- A Supabase project configured for AgriWiser.
- Cloudflare Worker tooling for deployment tasks.

### Setup

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env.local` for non-secret frontend settings.
3. Copy `.dev.vars.example` to `.dev.vars` and set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` for local server use.
4. Review and apply migrations following [Supabase setup](SUPABASE_SETUP.md).
5. Start the local server:

   ```sh
   npm run dev -- --host 127.0.0.1 --port 5174
   ```

Use the configured sign-in flow. Development shortcuts, when enabled, are restricted to eligible local development sessions.

## Project documentation

- [Watch the AgriWiser demo](<demo video/InShot_20261101_114817216.mp4>) — recorded walkthrough of the application.

- [Current Product Guide](docs/CURRENT_PRODUCT_GUIDE.md) — end-to-end product, workspace, access and data guide.
- [Complete Project Documentation](docs/PROJECT_DOCUMENTATION.md) — architecture, development and operating guidance.
- [Product and System Specification](Documentation.md) — requirements and implementation reference; verify planned items against the current code.
- [Price Data Sources](docs/PRICE_DATA_SOURCES.md) — source inventory and market-price interpretation.
- [Data Provenance](docs/DATA_PROVENANCE.md) and [Real-data Inventory](docs/REAL_DATA_INVENTORY.md) — lineage and available records.
- [Weather](WEATHER.md), [Statistical Methods](docs/STATISTICAL_METHODS.md), [Risk Engine](docs/RISK_ENGINE.md), [Digital Twin](docs/DIGITAL_TWIN.md), and [AI Agricultural Analyst](docs/AI_AGRICULTURAL_ANALYST.md).
- [Local Setup](LOCAL_SETUP.md), [Explore Data](EXPLORE_DATA.md), [Security and RBAC](docs/SECURITY_AND_RBAC.md), and [Integration Tests](docs/INTEGRATION_TESTS.md).

## Quality checks

Run from the repository root:

```sh
npm run lint
node --test tests/*.test.js
npm run build
```

The production build emits client assets under `dist/client` and Worker output under `dist/server`. Passing local checks does not by itself verify external provider availability, deployed Supabase policies or production configuration.

## Deployment

Configure production values and secrets in the hosting platform, review and apply database migrations through the established release process, then deploy the Cloudflare Worker using the authorized account procedure. Follow [Supabase setup](SUPABASE_SETUP.md) before changing database infrastructure. Do not deploy local placeholders or development shortcuts to production.

## Development conventions

- Preserve the frontend, file-based routes, SSR structure, plugin order and layout boundaries.
- Keep application source in JavaScript and JSX. `src/routeTree.gen.ts` is generated; never edit it manually.
- Preserve server-side authorization, provenance and user data.
- Keep private survey files, credentials, backups and local environment files out of Git and static serving.
- Update relevant documentation and regression coverage with behavior changes.

## AI Use Disclosure

OpenAI Codex was used as an AI-assisted development tool for project documentation and code-lint review. Team members reviewed AI-assisted suggestions before incorporating them. The team is responsible for the project, its data, analysis and final submission.
