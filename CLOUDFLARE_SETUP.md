# BDZTEAM Cloudflare setup

## Variables (Text)
- `SUPABASE_URL` = `https://nklukqriopezsoalnghm.supabase.co`
- `PUBLIC_ORIGIN` = `https://bdzteam.vortexvn.workers.dev`
- `LINK4M_BASE_URL` = `https://link4m.co/api-shorten/v2`
- `TRAFFICVN_BASE_URL` = `https://trafficvn.com/apidevelop`
- `TURNSTILE_SITE_KEY` = Cloudflare Turnstile Site Key for `bdzteam.vortexvn.workers.dev`
- `ADMIN_USERNAME` = `admin`

## Variables (Secret)
- `SUPABASE_SECRET_KEY` = a NEW Supabase Secret key after rotating the key that was present in the old PHP `config.php`
- `TURNSTILE_SECRET_KEY` = Cloudflare Turnstile Secret Key
- `ADMIN_PASSWORD` = new admin password
- `ADMIN_SESSION_SECRET` = long random secret

## Turnstile
Create a Cloudflare Turnstile widget and allow the hostname `bdzteam.vortexvn.workers.dev`. Put its Site Key in `TURNSTILE_SITE_KEY` and Secret Key in `TURNSTILE_SECRET_KEY`.

The browser sends the Turnstile token only to `/api/start-get-key`. The Worker verifies it against Cloudflare's Siteverify endpoint. The Turnstile Secret Key is never sent to the browser and is never committed to GitHub.

## Supabase
The Worker uses `SUPABASE_SECRET_KEY` server-side for REST/RPC access. The browser does not receive the Secret key. Keep the original project URL above so the existing Supabase project remains the backend.

## Preserved application flow
1. `index.php` -> `index.html`
2. `key.php` -> `key.html`
3. `check-key.php` -> `check-key.html`
4. `login.php` -> `login.html`
5. `session-check.php` -> `/session-check`
6. Admin PHP logic -> `admin.html` + `admin.js` + Worker API
7. `config.php`/`supabase.php` server connection -> Worker environment secret + `src/db.js`
8. `anti.php` security -> Worker edge checks, rate limits, IP bans, auto-bans and Turnstile

Do not copy the old PHP secret or Google reCAPTCHA secret into the repository.
