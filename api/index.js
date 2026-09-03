import handler from '../src/vercel_handler.js';
import profileHandler, {loginHandler} from './admin-profile.js';

export default async function apiIndex(req, res) {
  const route = String(req.query?.route || '/').trim();
  const normalized = route.startsWith('/') ? route : `/${route}`;
  if (normalized === '/admin/profile') return profileHandler(req, res);
  if (normalized === '/admin/login') return loginHandler(req, res);
  const originalUrl = req.url;
  req.url = normalized.startsWith('/api/') ? normalized : `/api${normalized}`;
  try {
    return await handler(req, res);
  } finally {
    req.url = originalUrl;
  }
}
