# BDZ Key Service

## Kiến trúc
- **Vercel**: Admin Web + serverless API.
- **Supabase**: nguồn dữ liệu chính cho keys, key checks, Telegram users, shortener configs và admin audit.
- **Telegram Bot**: tạo/phát key cho người dùng; `/getkey` và `/getdev` tự tạo key rồi lưu vào Supabase.
- **App**: gọi `POST` hoặc `GET /api/check-key` để xác thực key qua backend, không nhúng service-role key vào APK.

## API
### Check key
`POST /api/check-key`

Body JSON:
```json
{
  "key": "BDZ-QUICK-...",
  "scope": "quick",
  "device_id": "unique-device-id",
  "app_version": "1.0.0"
}
```

Cũng hỗ trợ `GET /api/check-key?key=...&scope=quick&device_id=...&app_version=...` và CORS cho app/client.

Kết quả hợp lệ trả `ok: true`, `valid: true`, `result: "VALID"`. Key bị khoá, hết hạn, sai scope hoặc khác thiết bị sẽ trả trạng thái tương ứng.

### Shorten
`POST /api/shorten` là endpoint dành cho Admin session. Provider mặc định là **VuotLink**.

```json
{
  "url": "https://bdzteam.vercel.app/..."
}
```

Endpoint mặc định của VuotLink:
`https://vuotlink.xyz/api?api=<VUOTLINK_API_TOKEN>&url=<ENCODED_URL>`

Ứng dụng đọc trường `shortenedUrl` từ JSON khi `status` là `success`.

## Telegram Bot
- `/start` hoặc `/help`: hiện menu.
- `/getkey`: tạo và gửi KEY QUICK; key được lưu vào Supabase.
- `/getdev`: tạo và gửi KEY DEV YS; key được lưu vào Supabase.
- `/createkey quick 24` hoặc `/createkey dev_ys 24`: tạo key thủ công cho Telegram admin khi `TELEGRAM_ADMIN_IDS` được cấu hình.

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
- `DEV_YS_KEY_HOURS`
- `TELEGRAM_ADMIN_IDS` (ID Telegram, ngăn cách bằng dấu phẩy)
- `VUOTLINK_API_TOKEN` (token API mặc định cho VuotLink)

**Không** đưa `SUPABASE_SERVICE_ROLE_KEY` vào app/APK hoặc frontend public. Repo/API chỉ sử dụng key này ở server-side.