# BDZ Key Service

## Kiến trúc
- **Vercel**: Web Get Key + Admin Web + serverless API.
- **Supabase**: nguồn dữ liệu chính cho keys, validation logs, claim tokens, shortener và admin controls.
- **GitHub**: source code và triển khai qua Vercel.
- **Telegram Bot**: đã loại bỏ khỏi hệ thống.
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
  "key_valid": true,
  "version_valid": true,
  "update_required": false,
  "authenticated": true,
  "expires_at": "...",
  "device_bound": true,
  "checks_used": 1,
  "checks_remaining": 99,
  "max_checks": 100,
  "max_devices": 1,
  "activated_at": "...",
  "last_checked_at": "...",
  "server_time": "...",
  "app_version": "1.0.0"
}
```

## Web Get Key
Trang chủ `/` là giao diện GET KEY.

Flow:
1. User bấm **Bắt đầu GET KEY**.
2. Vercel tạo claim token dùng một lần và lưu hash trong Supabase.
3. Vercel tạo link đích `/token?token=...` rồi gửi qua shortener đang cấu hình.
4. User hoàn tất bước rút gọn và quay về trang `/token`.
5. Vercel nhận token, đánh dấu token đã dùng và tạo Key mới phía server.
6. Website hiển thị Key trực tiếp, không cần Telegram.

Claim token có thời hạn ngắn và không được lưu dạng plaintext trong Supabase.

## Admin Control Center
Admin có hamburger navigation ở góc trên trái để mở các khu vực:
- Dashboard
- Keys
- Users
- API Center
- Security
- Versions / Releases

Admin session được ký bằng `ADMIN_SESSION_SECRET`; dữ liệu admin và audit được lưu trong Supabase.

## Shorten
`POST /api/shorten` là endpoint server-side dành cho Admin. Provider hiện tại là **VuotLink**.

```json
{
  "url": "https://bdzteam.vercel.app/token?..."
}
```

VuotLink token chỉ được dùng server-side.

## Vercel Environment Variables
Bắt buộc:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Tuỳ chọn:
- `VUOTLINK_API_TOKEN`
- `VUOTLINK_BASE_URL`
