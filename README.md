# BDZ Key Service

## Kiến trúc
- **Vercel**: Admin Web + serverless API + Telegram webhook.
- **Supabase**: nguồn dữ liệu chính cho keys, validation logs, Telegram users, claim tokens, shortener và admin controls.
- **Telegram Bot**: flow GET KEY, claim token một lần, trạng thái key và thông tin bảo mật.
- **App**: gọi một API xác thực duy nhất.

## Unified Key API
### Vercel
`POST /api/check-key`

Cũng hỗ trợ `GET /api/check-key`.

Request:
```json
{
  "key": "YOUR_KEY",
  "device_id": "unique-device-id",
  "app_version": "1.0.0"
}
```

Không có tham số phân loại key ở phía client. Hệ thống dùng một loại key và một contract xác thực duy nhất.

Response hợp lệ:
```json
{
  "ok": true,
  "valid": true,
  "result": "VALID",
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

Các trạng thái chính: `ACTIVE`, `DISABLED`, `EXPIRED`, `DEVICE_MISMATCH`, `LIMIT_REACHED`, `KEY_NOT_FOUND`, `INVALID_FORMAT`.

### Supabase direct
RPC dành cho client:
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

## Admin Control Center
Admin có hamburger navigation ở góc trên trái để mở các khu vực:
- Dashboard
- Keys
- Users
- API Center
- Security

Dashboard tập trung vào system health và **Bot Status**: online/offline, username, webhook, pending updates, maintenance, users, keys, claims và failed checks.

## Shorten
`POST /api/shorten` là endpoint server-side dành cho Admin. Provider hiện tại là **VuotLink**.

```json
{
  "url": "https://bdzteam.vercel.app/..."
}
```

VuotLink token chỉ được dùng server-side.

## Telegram Bot
- `/start` hoặc `/menu`: mở dashboard hội thoại.
- `/getkey`: tạo link nhận token.
- `/status`: xem key hiện tại, hạn, device và số checks.
- `/security`: thông tin bảo mật.
- `/help`: hướng dẫn.
- `/id`: Telegram ID.
- `/support`: gửi yêu cầu hỗ trợ.

Claim token được hash khi lưu, gắn với Telegram ID và chỉ redeem một lần.

## Vercel Environment Variables
Bắt buộc:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `TELEGRAM_BOT_TOKEN`

Tuỳ chọn:
- `VUOTLINK_API_TOKEN`
- `VUOTLINK_BASE_URL`
- `TELEGRAM_ADMIN_IDS`
