# BDZ Key System

## Kiến trúc
- **Vercel**: Web Get Key + Admin Web + serverless API.
- **Supabase**: dữ liệu Key, validation logs, claim sessions, shortener config và admin controls.
- **GitHub**: source code và triển khai qua Vercel.
- **Client/App**: gọi một API xác thực duy nhất.

Hệ thống web không phụ thuộc vào bot hay webhook bên ngoài.

## Web Get Key
Trang chủ `/` là giao diện GET KEY.

Flow:
1. User bấm **Bắt đầu GET KEY**.
2. Vercel tạo claim session một lần và chỉ lưu hash trong Supabase.
3. Vercel tạo link đích `/token?token=...` rồi gửi qua shortener server-side.
4. User hoàn tất bước rút gọn và quay về trang `/token`.
5. Vercel xác nhận session, đánh dấu đã dùng và tạo Key mới.
6. Website hiển thị Key trực tiếp.

Claim session có thời hạn ngắn và token thô không được lưu trong database.

## Unified Key API
### Check Key
`POST /api/check-key`

Cũng hỗ trợ `GET /api/check-key`.

Request:
```json
{
  "key": "YOUR_KEY",
  "device_id": "unique-device-id",
  "app_version": "V1.0.0"
}
```

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
  "app_version": "V1.0.0"
}
```

### Version API
Client version được kiểm tra bằng RPC `check_app_version` trong Supabase trước khi xác thực Key.

## Admin Control Center
Admin Web nằm tại `/admin`.

Khu vực chính:
- Dashboard
- Keys
- Devices
- Versions
- Releases
- Shortener
- API
- Security

Admin session được ký bằng `ADMIN_SESSION_SECRET`; session, tài khoản admin và audit log dùng Supabase làm nguồn dữ liệu.

## Shortener
`POST /api/shorten` là endpoint server-side dành cho việc rút gọn link. Token provider chỉ được đọc ở server.

Provider hiện đang được web GET KEY sử dụng là **VuotLink**.

## Environment Variables trên Vercel
Bắt buộc:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Tuỳ chọn:
- `VUOTLINK_API_TOKEN`
- `VUOTLINK_BASE_URL`
