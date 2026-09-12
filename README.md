# BDZ Key System

## Kiến trúc
- **GitHub Pages**: host frontend tĩnh từ thư mục `public/`.
- **Supabase**: database + RPC cho GET KEY, CHECK KEY và Admin.
- **Vercel**: không dùng trong flow mới.
- **Telegram**: không dùng.

## Web Get Key
1. User bấm **Bắt đầu GET KEY**.
2. Frontend gọi RPC `bdz_web_start` trên Supabase.
3. Supabase tạo claim token một lần và chỉ lưu hash.
4. Frontend mở `token/?token=...`.
5. RPC `bdz_web_claim` cấp Key một lần.

## Check Key
Client dùng RPC `bdz_check_key_public` với:
```json
{"key":"YOUR_KEY","device_id":"DEVICE_ID","app_version":"V2.0"}
```

## Admin
`public/admin.html` dùng các RPC:
- `bdz_admin_login`
- `bdz_admin_logout`
- `bdz_admin_me`
- `bdz_admin_keys`
- `bdz_admin_key_action`

Admin hỗ trợ tạo/sửa/enable/disable/reset/delete Key.

## GitHub Pages
Workflow tự deploy: `.github/workflows/deploy-pages.yml`.

Site dự kiến:
`https://aryaxynk.github.io/bdzteam/`

Trong Repository Settings cần chọn **Pages → GitHub Actions** một lần.

## Shortener
Bản migration hiện tại giữ provider token ở phía server/database; frontend GitHub Pages không nhận token provider. Luồng direct claim được dùng làm nền an toàn trong lúc chuyển hẳn khỏi Vercel.
