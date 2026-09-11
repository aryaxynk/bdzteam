# BDZ Key Service

## Kiến trúc
- **Vercel**: Admin Web + serverless API.
- **Supabase**: nguồn dữ liệu chính cho keys, key checks, Telegram users, shortener configs và admin audit.
- **Telegram Bot**: tạo/phát key cho người dùng; flow GET KEY và claim token lưu dữ liệu ở Supabase.
- **App**: gọi một API xác thực duy nhất để kiểm tra key.

## Unified Key API
### Vercel
`POST /api/check-key`

Cũng hỗ trợ `GET /api/check-key`.

Request JSON/query:
```json
{
  "key": "YOUR_KEY",
  "device_id": "unique-device-id",
  "app_version": "1.0.0"
}
```

**Không còn tham số `scope` ở client và không còn hai API QUICK/DEV.** QUICK/DEV chỉ là phân loại key nội bộ. Server tự trả `scope` trong response.

Response thành công:
```json
{
  "ok": true,
  "valid": true,
  "result": "VALID",
  "key": "YOUR_KEY",
  "scope": "quick",
  "status": "ACTIVE",
  "expires_at": "...",
  "created_at": "...",
  "activated": true,
  "activated_at": "...",
  "last_checked_at": "...",
  "check_count": 1,
  "max_checks": 0,
  "max_devices": 1,
  "telegram_user_id": null,
  "telegram_username": null,
  "app_version": "1.0.0"
}
```

### Supabase direct
RPC duy nhất dành cho client:
`POST /rest/v1/rpc/check_key`

Body:
```json
{
  "p_key": "YOUR_KEY",
  "p_device_id": "unique-device-id",
  "p_app_version": "1.0.0"
}
```

Client chỉ dùng publishable/anon key. Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào APK hoặc frontend public.

## Shorten
`POST /api/shorten` là endpoint dành cho Admin session. Provider duy nhất là **VuotLink**.

```json
{
  "url": "https://bdzteam.vercel.app/..."
}
```

Token VuotLink chỉ được dùng server-side.

## Telegram Bot
- `/start` hoặc `/help`: hiện menu.
- GET KEY tạo claim/key theo cấu hình hiện tại.
- Claim token được hash trước khi lưu và được redeem bằng RPC an toàn.

## Vercel Environment Variables
Bắt buộc:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `TELEGRAM_BOT_TOKEN`

Tuỳ chọn:
- `QUICK_KEY_HOURS`
- `DEV_KEY_HOURS`
- `TELEGRAM_ADMIN_IDS`
- `VUOTLINK_API_TOKEN`
- `VUOTLINK_BASE_URL`
