# AgriWiser

### Agricultural intelligence for Rwanda

AgriWiser brings agricultural statistics, climate context, analytical tools and field workflows together in a secure decision-support platform. It helps users move from trusted data to clearer understanding, coordinated investigation and evidence-based reporting.

## Platform

AgriWiser is organized into five connected workspaces:

| Workspace | Purpose |
| --- | --- |
| **Administration** | Govern users, datasets and authorized system operations. |
| **Analytics & Planning** | Explore agricultural indicators, compare crops and districts, and use planning and analytical tools. |
| **Field Operations** | Coordinate assigned investigations and operational follow-up. |
| **Community & Business** | Present agricultural information and community services in an accessible, practical context. |
| **Public Insights** | Explore published information through approachable public-facing views. |

Additional capabilities include weather and climate analysis, reports, dataset exploration, maps, and Agricultural Solutions within Analytics & Planning. Available actions depend on account role and the records configured for the deployment.

## Built for evidence-led decisions

- Explore published agricultural indicators across available crops, places and reporting periods.
- Compare production, harvested area and yield where the underlying definitions support those calculations.
- Review weather information with its source, coverage, resolution and missing values made explicit.
- Coordinate investigation and follow-up through authenticated field workflows.
- Use analytical and planning tools with documented inputs, methods and assumptions.
- Trace information to its dataset and source context.

AgriWiser distinguishes reported observations from estimates and analytical outputs. Missing values remain missing; historical production is not presented as current inventory or market availability.

## Technology

The application uses React 19, JavaScript and JSX, TanStack Start, Vite, Cloudflare Workers and Supabase. It uses file-based routing and server-side rendering. The document shell is owned by `src/routes/__root.jsx`.

The browser communicates with authenticated AgriWiser server functions. Supabase provides application authentication and data services. Local SQLite support is retained for offline development and migration testing.

## Run locally

### Prerequisites

- Node.js and npm compatible with the project lockfile.
- A Supabase project configured for AgriWiser.
- Cloudflare Worker tooling for deployment tasks.

### Setup

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env.local` for non-secret frontend settings.
3. Copy `.dev.vars.example` to `.dev.vars`. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` for local server use.
4. Apply the reviewed migrations in `supabase/migrations/` following [Supabase setup](SUPABASE_SETUP.md).
5. Start the local server:

   ```sh
   npm run dev -- --host 127.0.0.1 --port 5174
   ```

Use the configured sign-in flow. Development account shortcuts, when enabled, are restricted to eligible local development sessions.

## Data and interpretation

Agricultural and climate records retain their source context, units, reporting periods and geographic coverage. Dataset availability varies by deployment and selection. Production statistics describe reported production for a defined period; they do not establish current supply, prices, demand, income or an active commercial offer.

Yield is shown only where the measure and its inputs are valid. Comparisons use compatible periods and definitions. Estimated weather products are not direct farm measurements, and statistical association is not evidence of causation.

## Security

- Server functions authenticate requests and enforce permissions for protected operations.
- The server validates Supabase identity and obtains current roles from `hingasmart_profiles`.
- Row-level security protects database records, and application workflows mediate writes.
- Server-secret credentials stay on the server and are used only after authorization and input validation.
- Session cookies are HttpOnly; cookie-bearing responses are private and non-cacheable.
- Keep credentials in ignored local settings or hosting secret stores. Never use `VITE_` for secrets.
- Keep private respondent files, backups and credentials out of Git and static assets.

See [Security and RBAC](docs/SECURITY_AND_RBAC.md) and [Supabase setup](SUPABASE_SETUP.md) for implementation and operational details.

## Project references

- [Complete project documentation](docs/PROJECT_DOCUMENTATION.md)
- [Supabase configuration and migrations](SUPABASE_SETUP.md)
- [Local setup](LOCAL_SETUP.md)
- [Local data workflow](LOCAL_DATA.md)
- [Dataset exploration](EXPLORE_DATA.md)
- [Weather and climate](WEATHER.md)
- [Statistical methods](docs/STATISTICAL_METHODS.md)
- [Data provenance](docs/DATA_PROVENANCE.md)
- [Real-data inventory](docs/REAL_DATA_INVENTORY.md)
- [Security and role-based access](docs/SECURITY_AND_RBAC.md)
- [Integration test guidance](docs/INTEGRATION_TESTS.md)

## Quality checks

Run the project checks from the repository root:

```sh
npm run lint
node --test tests/*.test.js
npm run build
```

The production build writes client assets to `dist/client` and Worker output to `dist/server`.

## Deployment

Configure production environment values and secrets in the hosting platform, apply reviewed database migrations through the established release process, then deploy the generated Cloudflare Worker using the target account's deployment procedure. Keep development shortcuts and local database placeholders out of production deployments. See [Supabase setup](SUPABASE_SETUP.md) before changing database infrastructure.

## Development conventions

- Preserve the existing route, SSR and plugin structure.
- Keep application source in JavaScript and JSX.
- Treat `src/routeTree.gen.ts` as generated router output; do not edit it manually.
- Maintain source provenance, server-side authorization and user data protections.
- Keep changes focused and add relevant regression coverage.
- Never commit credentials, private source records or local database backups.

## AI Use Disclosure

Our team used OpenAI Codex as an AI-assisted development tool for project documentation and code-lint review. Team members reviewed AI-assisted suggestions before incorporating them. The team is responsible for the project, its data, analysis and final submission.
