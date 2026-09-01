import handler from '../src/vercel_handler.js';

export default async function apiIndex(req, res) {
  const route = String(req.query?.route || '/').trim();
  const normalized = route.startsWith('/') ? route : `/${route}`;
  const originalUrl = req.url;
  req.url = normalized.startsWith('/api/') ? normalized : `/api${normalized}`;
  try {
    return await handler(req, res);
  } finally {
    req.url = originalUrl;
  }
}
