// Vercel Function: recebe a inscrição (JSON), envia e-mail via Brevo e (opcional) grava na planilha.
// Configuração por variáveis de ambiente na Vercel (Settings > Environment Variables) — ver .env.example.

const FIELDS = ['nome', 'whatsapp', 'email', 'area', 'tamanho',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

const LABELS = {
  nome: 'Nome', whatsapp: 'WhatsApp', email: 'E-mail', area: 'Área de atuação',
  tamanho: 'Tamanho do escritório', utm_source: 'utm_source', utm_medium: 'utm_medium',
  utm_campaign: 'utm_campaign', utm_content: 'utm_content', utm_term: 'utm_term', data_hora: 'Data/hora',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function clean(v) {
  return String(v ?? '').replace(/<[^>]*>/g, '').trim().slice(0, 200);
}

function brasiliaNow() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

async function sendEmail(env, d) {
  const rows = Object.entries(LABELS).map(([k, label]) =>
    `<tr><td style="padding:6px 12px;border:1px solid #ddd"><b>${label}</b></td>` +
    `<td style="padding:6px 12px;border:1px solid #ddd">${esc(d[k] || '')}</td></tr>`).join('');

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: env.BREVO_SENDER_NAME, email: env.BREVO_SENDER_EMAIL },
      to: [{ email: env.TO_EMAIL }],
      replyTo: { email: d.email, name: d.nome },
      subject: `Nova inscrição · Advocacia de Sucesso 3ª edição — ${d.nome}`,
      htmlContent: '<h3>Nova inscrição</h3><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">' + rows + '</table>',
    }),
  });
  if (!res.ok) console.error('inscricao: Brevo', res.status, await res.text().catch(() => ''));
  return res.ok;
}

async function sendSheet(env, d) {
  if (!env.SHEETS_WEBHOOK_URL) return false;
  try {
    const res = await fetch(env.SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...d, secret: env.SHEETS_SECRET || '' }),
      redirect: 'follow', // Apps Script responde com redirect
    });
    const text = await res.text();
    return res.ok && text.includes('"ok":true');
  } catch (e) {
    console.error('inscricao: planilha', e);
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const env = {
    BREVO_API_KEY: process.env.BREVO_API_KEY || '',
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || '',
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'Advocacia de Sucesso',
    TO_EMAIL: process.env.TO_EMAIL || 'lamparinajus@gmail.com',
    SHEETS_WEBHOOK_URL: process.env.SHEETS_WEBHOOK_URL || '',
    SHEETS_SECRET: process.env.SHEETS_SECRET || '',
  };

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, error: 'json' });

  if (body.website) return res.status(200).json({ ok: true }); // honeypot anti-bot

  const d = {};
  FIELDS.forEach((f) => { d[f] = clean(body[f]); });
  d.data_hora = brasiliaNow();

  if (d.nome.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) || d.whatsapp.replace(/\D/g, '').length < 10) {
    return res.status(422).json({ ok: false, error: 'validation' });
  }

  const mailOk = env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL ? await sendEmail(env, d) : false;
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) console.error('inscricao: BREVO_API_KEY/BREVO_SENDER_EMAIL não configurados');
  const sheetOk = await sendSheet(env, d);

  if (!mailOk && !sheetOk) return res.status(502).json({ ok: false, error: 'delivery' });
  return res.status(200).json({ ok: true, mail: mailOk, sheet: sheetOk });
};
