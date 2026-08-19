function clearCookie(name) {
  return `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`;
}

export default async function handler(req, res) {
  const method = String(req.method || 'GET').toUpperCase();
  if (!['GET', 'POST'].includes(method)) {
    res.statusCode = 405;
    res.setHeader('allow', 'GET, POST');
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed.' }));
  }

  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('set-cookie', [clearCookie('bdz_admin'), clearCookie('bdz_pending')]);
  return res.end(JSON.stringify({ ok: true, message: 'Đã đăng xuất.' }));
}
