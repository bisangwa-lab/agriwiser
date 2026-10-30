# AgriWiser

Agricultural intelligence for Rwanda, built with React 19, TanStack Start, Cloudflare Workers and Supabase. The existing dashboards, district maps, investigation tools, published NISR datasets and weather analysis share AgriWiser's own authenticated server functions.

## Development

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` for development UI settings.
3. Copy `.dev.vars.example` to `.dev.vars` and configure your Supabase project URL, publishable key and server secret key. Both files are ignored by Git. Never put private credentials in a variable beginning with `VITE_`.
4. Apply the versioned SQL under `supabase/migrations/` to your own project. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
5. Start with `npm run dev -- --host 127.0.0.1 --port 5174`.

The development panel badges are limited to loopback hosts, a development build, an explicit flag and the five existing development accounts. They establish real Supabase sessions and never send a login link by email. Production requires normal account sign-in.

## Build and deploy

`npm run build` emits `dist/client` and the Worker under `dist/server`. Configure runtime secrets through your hosting platform, then deploy the Worker with the generated Cloudflare configuration. Run `npx wrangler deploy --help` for the installed CLI's deployment options. Do not deploy development account shortcuts or the local database placeholder as production infrastructure.

## Architecture and security

- `src/routes/__root.jsx` owns the HTML document and frontend assets. There is no index.html.
- `src/api/appClient.js` exposes AgriWiser's browser adapter. It calls application server functions; sessions stay in HttpOnly cookies.
- `src/lib/supabase.server.js` creates request-scoped Supabase clients, validates identity against Auth and reads current roles from `hingasmart_profiles`.
- `src/lib/supabase-records.js` reads through bounded Postgres RPCs and checks write permissions before using the server-only administrative client.
- Database RLS independently restricts published indicators, administrative archives and private staff work. Users cannot edit their role or write records directly through the public Data API.
- Weather caches, API budgets and source metadata live in separate private Supabase tables. External sources are never merged or fabricated.
- The private local backup and source microdata remain outside Git and outside static file serving. Local database code is retained only for offline development and migration tests; the configured application uses Supabase.

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md), [LOCAL_DATA.md](LOCAL_DATA.md), [WEATHER.md](WEATHER.md) and [EXPLORE_DATA.md](EXPLORE_DATA.md).

## Checks

Run `npm run lint`, `npm run build` and `node --test tests/*.test.js`. The source is JavaScript/JSX; the router-generated TypeScript tree is not hand edited or committed.
