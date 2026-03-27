# Webapp Selenium E2E tests

Python + Selenium + pytest against a running Vite build of the admin UI. Tests use **real Supabase** (anon key + auth) and a **school-linked admin** account, same as production.

## Prerequisites

- Python 3.10+
- Chrome (or Chromium) installed locally; Selenium 4 resolves a matching ChromeDriver automatically. On some Linux setups, set `CHROME_BIN` or `GOOGLE_CHROME_BIN` to the browser binary if Selenium cannot find it.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` applied when you **build** the webapp (`npm run build` / `npm run dev`).
- `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` for an admin user whose profile has a `school_id` so User Management and Location Management load.

## Run locally

1. Build and serve the webapp (preview uses port `4173` by default):

   ```bash
   cd webapp
   npm ci
   npm run build
   npm run preview -- --host 127.0.0.1 --port 4173
   ```

2. In another terminal, set env and run tests **from the `e2e` directory** (so `helpers` imports resolve):

   ```bash
   cd webapp/e2e
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   export E2E_BASE_URL=http://127.0.0.1:4173
   export E2E_ADMIN_EMAIL=your-admin@example.com
   export E2E_ADMIN_PASSWORD=your-password
   pytest -v
   ```

If `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` are unset, tests **skip** with a clear reason.

## What is covered

- Sign in at `/admin/signin` and reach the admin shell.
- User Management: headings, open **Add New User**, cancel (no DB writes).
- Location Management: heading, open **Add Location** form, cancel (no DB writes).

## CI

See [.github/workflows/webapp-e2e.yml](../../.github/workflows/webapp-e2e.yml). Configure GitHub Actions secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
