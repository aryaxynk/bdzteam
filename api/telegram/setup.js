const crypto = require('node:crypto');
const { json, env } = require('../_lib');

function webhookSecret() {
  return crypto.createHash('sha256').update(env('ADMIN_SESSION_SECRET') + ':telegram-webhook').digest('hex').slice(0, 48);
}

async function telegram(method, payload) {
  const token = env('TELEGRAM_BOT_TOKEN');
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) {
    throw new Error(`Telegram ${method} failed: HTTP ${response.status}`);
  }
  return data;
}

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim()
      .replace(/:\d+$/, '');

    if (!host) return json(res, 400, { ok: false, error: 'MISSING_HOST' });

    const webhookUrl = `https://${host}/api/telegram/webhook`;
    const secretToken = webhookSecret();

    await telegram('setWebhook', {
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false
    });

    await telegram('setMyCommands', {
      commands: [
        { command: 'start', description: 'Mở menu BDZ Key Bot' },
        { command: 'getkey', description: 'Tạo và nhận KEY QUICK' },
        { command: 'getdev', description: 'Tạo và nhận KEY DEV YS' },
        { command: 'createkey', description: 'Admin tạo key' }
      ]
    });

    const info = await telegram('getWebhookInfo', {});
    return json(res, 200, {
      ok: true,
      message: 'Telegram webhook configured',
      webhook: info.result?.url || webhookUrl,
      pending_update_count: info.result?.pending_update_count || 0,
      last_error_message: info.result?.last_error_message || null,
      last_error_date: info.result?.last_error_date || null
    });
  } catch (error) {
    console.error(error);
    return json(res, 500, {
      ok: false,
      error: 'TELEGRAM_SETUP_FAILED'
    });
  }
};
