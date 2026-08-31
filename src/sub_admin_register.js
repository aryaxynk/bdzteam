import bcrypt from 'bcryptjs';
import { json, ipOf, sb, sameOrigin, consumeRateLimit } from './db.js';

export async function registerSubAdmin(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Method Not Allowed' }, 405);
  if (!sameOrigin(request)) return json({ ok: false, error: 'Origin không hợp lệ.' }, 403);
  const ip = ipOf(request);
  if (!(await consumeRateLimit(env, 'sub-register', ip, 300, 5))) return json({ ok: false, error: 'Bạn thử đăng ký quá nhiều lần. Vui lòng thử lại sau 5 phút.' }, 429);
  const b = await request.json().catch(() => ({}));
  const username = String(b.username || '').trim();
  const password = String(b.password || '');
  const confirmPassword = String(b.confirm_password || '');
  const referralCode = String(b.referral_code || '').trim().toUpperCase();
  if (!/^[A-Za-z0-9_]{3,32}$/.test(username) || username.toLowerCase() === 'admin') return json({ ok: false, error: 'Tên tài khoản không hợp lệ.' }, 400);
  if (password.length < 6 || password.length > 128) return json({ ok: false, error: 'Mật khẩu phải từ 6 đến 128 ký tự.' }, 400);
  if (password !== confirmPassword) return json({ ok: false, error: 'Mật khẩu xác nhận không khớp.' }, 400);
  if (!/^BDZ-ADM-[A-Z0-9]{12}$/.test(referralCode)) return json({ ok: false, error: 'Referral Code không hợp lệ.' }, 400);
  const passwordHash = await bcrypt.hash(password, 10);
  const raw = await sb(env, 'rpc/consume_admin_referral', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ p_code: referralCode, p_username: username, p_password_hash: passwordHash, p_note: '' }) });
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row?.ok) return json({ ok: false, error: row?.error || 'Không thể đăng ký Admin phụ.' }, 400);
  return json({ ok: true, username, message: 'Đăng ký Admin phụ thành công. Bạn có thể đăng nhập bằng tài khoản này.' }, 201);
}
