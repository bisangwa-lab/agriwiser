# AgriWiser development setup

The application uses Supabase Auth, Postgres and private storage. Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for runtime secrets, schema setup, migration and sign-in. The frontend and five workspaces retain their existing appearance.

The old local account database is preserved as a private backup and an optional offline test backend. Production never falls back to local accounts. Supabase project credentials and the management personal access token belong in ignored server settings.

Local development badges are enabled only for a development build on a loopback host, with VITE_LOCAL_QUICK_LOGIN=true and pre-provisioned development accounts. Production builds disable these shortcuts. Normal sign-in and password recovery use Supabase Auth.
