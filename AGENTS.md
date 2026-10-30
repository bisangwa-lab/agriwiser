# AgriWiser project instructions

This is an independent React 19 / TanStack Start application using JavaScript and JSX, Cloudflare Workers and Supabase. Read README.md and SUPABASE_SETUP.md before changing infrastructure.

- Preserve the current frontend, file-based routes, SSR structure and layout boundaries. src/routes/__root.jsx owns the HTML document; there is no index.html.
- Keep Cloudflare, TanStack Start and React Vite plugins in their working order. Keep the explicit @ alias and dependency prebundling.
- src/routeTree.gen.ts is router-generated; never edit or commit it. Do not add other TypeScript files.
- All application access goes through authenticated server functions. A route gate or hidden button does not protect an endpoint.
- Verify Supabase users on the server and read current roles from hingasmart_profiles. Never trust user_metadata for authorization. Keep RLS enabled and keep private helper functions outside exposed schemas.
- Check permissions and bound inputs before any use of a server-secret client. Never pass tokens, request headers or private keys to browsers or external providers.
- Store secrets only in ignored server settings / hosting secrets. Never use VITE_ for a secret. Cookie-bearing responses must be private and no-store.
- Direct Data API writes are disabled. Staff mutations and role changes use AgriWiser server functions, with separate administrator checks. Preserve the last active super administrator.
- Keep private survey respondent files, local database backups and account credentials out of Git and static serving. Published aggregates retain their source and unit metadata.
- Weather source identity, coverage, native resolution and missing values must remain explicit. Do not invent observations, forecasts or causal effects.
- Existing local SQLite code supports offline development and migration tests. Supabase is the configured application backend. Preserve user data when moving between them.
- Use npm run lint, appropriate tests and npm run build before finishing code changes. Do not rewrite unrelated features or discard uncommitted work.
