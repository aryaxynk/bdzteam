const crypto = require('node:crypto');
const { json, env, supabaseFetch } = require('../_lib');

async function telegram(method, payload) {
  const token = env('TELEGRAM_BOT_TOKEN');
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
  if (!r.ok) throw new Error(`Telegram HTTP ${r.status}`);
  return r.json();
}
async function createGetKey(scope, tg) {
  const hours = scope === 'dev_ys' ? Number(process.env.DEV_YS_KEY_HOURS || 24) : Number(process.env.QUICK_KEY_HOURS || 24);
  const keyCode = `BDZ-${scope.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const expires = new Date(Date.now()+hours*3600000).toISOString();
  const rows = await supabaseFetch('app_keys',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({key_code:keyCode,key_scope:scope,status:'ACTIVE',duration_hours:hours,expires_at:expires,telegram_user_id:tg.id,telegram_username:tg.username || null})});
  await supabaseFetch('telegram_users',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({telegram_user_id:tg.id,username:tg.username||null,first_name:tg.first_name||null,last_name:tg.last_name||null,last_seen_at:new Date().toISOString()})});
  return rows?.[0] || {key_code:keyCode,expires_at:expires};
}
async function sendKey(chatId, scope, tg) {
  const item=await createGetKey(scope,tg);
  await telegram('sendMessage',{chat_id:chatId,text:`✅ KEY ${scope.toUpperCase()}\n\n${item.key_code}\n\n⏱️ Hạn: ${new Date(item.expires_at).toLocaleString('vi-VN')}`});
}
module.exports = async function handler(req,res) {
  if (req.method !== 'POST') return json(res,405,{ok:false});
  try {
    const update = req.body || {};
    const msg = update.message;
    if (msg?.chat?.id) {
      const chatId=msg.chat.id; const text=String(msg.text||'').trim().toLowerCase();
      if (text === '/start' || text === '/help') await telegram('sendMessage',{chat_id:chatId,text:'🔐 BDZ KEY BOT\n\n/getkey — key QUICK\n/getdev — key DEV YS',reply_markup:{inline_keyboard:[[{text:'🔑 GET KEY',callback_data:'get:quick'}],[{text:'🛠️ GET DEV YS',callback_data:'get:dev_ys'}]]}});
      else if (text === '/getkey' || text === '/getquick') await sendKey(chatId,'quick',msg.from);
      else if (text === '/getdev') await sendKey(chatId,'dev_ys',msg.from);
    }
    const q=update.callback_query;
    if (q?.message?.chat?.id) { const [kind,scope]=String(q.data||'').split(':'); await telegram('answerCallbackQuery',{callback_query_id:q.id}); if(kind==='get'&&(scope==='quick'||scope==='dev_ys')) await sendKey(q.message.chat.id,scope,q.from); }
    return json(res,200,{ok:true});
  } catch(e) { console.error(e); return json(res,200,{ok:true}); }
};