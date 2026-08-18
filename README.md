# BDZTEAM — Cloudflare Workers + Supabase

Private migration of BDZTEAM from InfinityFree/PHP to Cloudflare Workers with Supabase.

Target: https://bdzteam.vortexvn.workers.dev

## Secrets
Never commit Supabase secret/service-role keys, CAPTCHA secrets, or shortener API tokens. Configure them as Cloudflare Worker secrets.

Required:
- `SUPABASE_SECRET_KEY`

Optional:
- `LINK4M_BASE_URL`
- `TRAFFICVN_BASE_URL`

## Deploy
`npx wrangler deploy`

The public site is static HTML/CSS/JS and the Worker handles the Supabase-backed API routes.
