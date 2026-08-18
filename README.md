# BDZTEAM — Cloudflare Workers + GitHub Private + Supabase

Project này chuyển hệ thống PHP/InfinityFree sang static HTML/CSS/JS + Cloudflare Worker nhưng giữ flow và logic chính của source gốc: get-key 4 bước, chuỗi shortener 4 vị trí, quota theo IP/ngày, token một lần 15 phút, Check Key, Admin chính, Admin phụ 2 bước, quản lý Key, sản phẩm, shortener, settings, logs và bảo mật.

## Cloudflare Variables

Text:
- `SUPABASE_URL=https://nklukqriopezsoalnghm.supabase.co`
- `PUBLIC_ORIGIN=https://bdzteam.vortexvn.workers.dev`
- `LINK4M_BASE_URL=https://link4m.co/api-shorten/v2`
- `TRAFFICVN_BASE_URL=https://trafficvn.com/apidevelop`
- `TURNSTILE_SITE_KEY=<site key của Cloudflare Turnstile>`
- `ADMIN_USERNAME=admin`

Secret:
- `SUPABASE_SECRET_KEY=<Supabase Secret Key MỚI đã rotate>`
- `TURNSTILE_SECRET_KEY=<Turnstile Secret Key>`
- `ADMIN_PASSWORD=<mật khẩu Admin mới>`
- `ADMIN_SESSION_SECRET=<chuỗi ngẫu nhiên dài>`

Không commit secret vào GitHub. Secret Supabase và reCAPTCHA cũ từ PHP source đã được xem là đã lộ; hãy rotate và dùng secret mới trong Cloudflare.

## Turnstile

Google reCAPTCHA của PHP source được thay bằng Cloudflare Turnstile. Site key chỉ xuất ra frontend; Worker xác minh token server-side trước khi bắt đầu get-key.

## Deploy

Worker entry: `src/worker.js`.
Static files: `public/`.
Dependency `bcryptjs` giữ tương thích với password/auth-code hash của Admin phụ.

Target: `https://bdzteam.vortexvn.workers.dev`
