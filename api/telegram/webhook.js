const crypto = require('node:crypto');
const { json, env, supabaseFetch, createKey } = require('../_lib');

function webhookSecret() { return crypto.createHash('sha256').update(env('ADMIN_SESSION_SECRET') + ':telegram-webhook').digest('hex').slice(0, 48); }
async function telegram(method, payload) {
  const token = env('TELEGRAM_BOT_TOKEN');
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await r.json().catch(() => null);
  if (!r.ok || data?.ok === false) throw new Error(`Telegram HTTP ${r.status}`);
  return data;
}
function isTelegramAdmin(userId) {
  const raw = String(process.env.TELEGRAM_ADMIN_IDS || '').trim();
  return raw ? raw.split(',').map(v => v.trim()).filter(Boolean).includes(String(userId)) : false;
}
function parseArgs(text) { return String(text || '').trim().split(/\s+/).filter(Boolean).slice(1); }
async function touchTelegramUser(tg) {
  if (!tg?.id) return;
  await supabaseFetch('telegram_users', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ telegram_user_id: tg.id, username: tg.username || null, first_name: tg.first_name || null, last_name: tg.last_name || null, last_seen_at: new Date().toISOString() }) });
}
async function sendKey(chatId, scope, tg) {
  const item = await createKey(scope, tg);
  const label = scope === 'dev_ys' ? 'DEV YS' : 'QUICK';
  await telegram('sendMessage', { chat_id: chatId, text: `✅ KEY ${label}\n\n<code>${item.key_code}</code>\n\n⏱️ Hạn: ${new Date(item.expires_at).toLocaleString('vi-VN')}`, parse_mode: 'HTML' });
}
async function handleCommand(chatId, text, tg) {
  const lower = String(text || '').trim().toLowerCase();
  await touchTelegramUser(tg);
  if (lower === '/start' || lower === '/help') return telegram('sendMessage', { chat_id: chatId, text: '🔐 <b>BDZ KEY BOT</b>\n\n/getkey — tạo và nhận KEY QUICK\n/getdev — tạo và nhận KEY DEV YS\n/createkey quick 24 — admin tạo key', parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🔑 GET KEY', callback_data: 'get:quick' }], [{ text: '🛠️ GET DEV YS', callback_data: 'get:dev_ys' }]] } });
  if (lower === '/getkey' || lower === '/getquick') return sendKey(chatId, 'quick', tg);
  if (lower === '/getdev' || lower === '/getdevys') return sendKey(chatId, 'dev_ys', tg);
  if (lower.startsWith('/createkey')) {
    if (!isTelegramAdmin(tg?.id)) return telegram('sendMessage', { chat_id: chatId, text: '⛔ Lệnh này chỉ dành cho Telegram admin.' });
    const args = parseArgs(text);
    const scope = String(args[0] || 'quick').toLowerCase() === 'dev_ys' ? 'dev_ys' : 'quick';
    const hours = Math.max(1, Math.min(8760, Number(args[1] || 24)));
    const item = await createKey(scope, null, hours);
    return telegram('sendMessage', { chat_id: chatId, text: `✅ <b>Đã tạo key</b>\n\n<code>${item.key_code}</code>\n\nScope: ${scope}\n⏱️ Hạn: ${new Date(item.expires_at).toLocaleString('vi-VN')}`, parse_mode: 'HTML' });
  }
}
async function answerCallback(query) {
  const chatId = query?.message?.chat?.id;
  if (!chatId) return;
  await telegram('answerCallbackQuery', { callback_query_id: query.id });
  const [kind, scope] = String(query.data || '').split(':');
  if (kind === 'get' && (scope === 'quick' || scope === 'dev_ys')) await sendKey(chatId, scope, query.from);
}
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  const expected = webhookSecret();
  if (String(req.headers['x-telegram-bot-api-secret-token'] || '') !== expected) return json(res, 401, { ok: false, error: 'INVALID_WEBHOOK_SECRET' });
  try {
    const update = req.body || {};
    if (update.message?.chat?.id) await handleCommand(update.message.chat.id, update.message.text, update.message.from);
    if (update.callback_query) await answerCallback(update.callback_query);
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error(error);
    try {
      const chatId = req.body?.message?.chat?.id || req.body?.callback_query?.message?.chat?.id;
      if (chatId) await telegram('sendMessage', { chat_id: chatId, text: '⚠️ Không thể xử lý yêu cầu lúc này. Vui lòng thử lại.' });
    } catch (sendError) { console.error(sendError); }
    return json(res, 500, { ok: false, error: 'BOT_HANDLER_FAILED' });
  }
};