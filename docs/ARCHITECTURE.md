# BDZTEAM architecture

## Backend

- `api/` — thin Vercel HTTP entrypoints and routing only.
- `src/db.js` — backward-compatible data/security facade for Supabase, sessions, rate limits, and slot persistence.
- `src/public_api.js` — public business flows: site data, Get Key, claim Key, and Check Key.
- `src/admin_api.js` — admin authentication, dashboard data, and admin actions.
- `src/ip_verify.js` — public verification rules and client/IP checks.
- `src/shorteners/` — one adapter per supported shortener plus `index.js` provider registry.

Supported shorteners are intentionally limited to `link4m` and `trafficvn`.

## Frontend

- `public/index.html`, `public/key.html`, `public/check-key.html` — public pages.
- `public/login.html`, `public/admin.html` — administration pages.
- `public/*.js` — page behavior; keep API calls out of HTML markup.
- `public/*.css` — visual styling. New UI work should be isolated in new UI modules so backend behavior remains untouched.

## Rules for future UI updates

1. Do not put provider credentials or Supabase server credentials in `public/`.
2. Keep provider-specific API logic inside `src/shorteners/`.
3. Keep `api/` as transport/routing code and keep business logic in `src/`.
4. Add new UI components/assets without changing backend contracts unless required.
5. Preserve `/api/*` response shapes when changing the UI.
