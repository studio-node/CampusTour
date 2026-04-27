# Supabase Staging Setup (hosted Supabase project)

This repo includes:
- A full schema dump: `supabase/supabase_schema.sql`
- Incremental SQL scripts: `supabase/sql/*.sql`
- Edge Functions: `supabase/functions/*`

This folder gives you a repeatable way to initialize a **separate** Supabase **staging** project.

## Prereqs

- Supabase CLI available (either `supabase` or `npx supabase`)
- `psql` installed locally (Postgres client)
- A **new** Supabase project created in the Supabase dashboard (staging)

## Required secrets/values (from Supabase dashboard)

- **Project ref** (looks like `xxxxxxxxxxxxxxxxxxxx`)
- **DB password** (you set this when creating the project)
- **API URL** (Supabase URL)
- **Anon key**
- **Service role key** (server-only; never put in mobile/web clients)

## 1) Link the CLI to your staging project

From repo root:

```bash
npx -y supabase login
npx -y supabase link --project-ref "<YOUR_STAGING_PROJECT_REF>"
```

It will prompt for the DB password.

## 2) Apply schema + policies + triggers + RPCs

Run:

```bash
./supabase/staging/apply-schema.sh
```

What it does:
- Uses `supabase db connect --linked` to discover the connection string
- Applies `supabase/supabase_schema.sql`
- Applies each `supabase/sql/*.sql` in numeric order (idempotent where possible)

## 3) Deploy Edge Functions

Run:

```bash
./supabase/staging/deploy-functions.sh
```

This deploys all functions under `supabase/functions/` (excluding `_shared`).

## 4) Configure app environment variables for staging

You’ll need these values in AWS (backend container) and at build-time (webapp + Expo web preview):

- Backend:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_TOKEN` (if you use Gemini features in staging)
- Webapp:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Mobile (Expo web preview build):
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY` (if routes are used in staging)

## Notes

- **Do not reuse** the linked project ref currently in `supabase/.temp/*`. That’s your existing project.
- This project uses a public storage bucket named **`media`** (see `supabase/sql/002_location_media_storage.sql`).

