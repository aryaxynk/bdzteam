# BDZ Key Service

New architecture:
- Vercel: static Admin Web + serverless API
- Supabase: keys, key checks, Telegram users, shortener configuration, audit log
- Telegram Bot: GET KEY / GET DEV YS
- App: POST /api/check-key with key, scope and device_id

Required Vercel environment variables:
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_USERNAME
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
TELEGRAM_BOT_TOKEN
QUICK_KEY_HOURS (optional)
DEV_YS_KEY_HOURS (optional)

Telegram webhook endpoint: /api/telegram/webhook
