/**
 * Planilha de inscrições · Advocacia de Sucesso 3ª edição
 * Cole este arquivo em Extensões > Apps Script da planilha (substituindo o conteúdo).
 * 1) Troque o SECRET abaixo por uma senha longa sua (a mesma vai no SHEETS_SECRET do .env).
 * 2) Rode a função "configurarPlanilha" uma vez (monta o modelo: cabeçalho, formatos, larguras).
 * 3) Implante como App da Web (Executar como: Eu · Acesso: Qualquer pessoa) e copie a URL /exec.
 */
const SECRET = 'TROQUE_POR_UMA_SENHA_LONGA';
const ABA = 'Inscrições';

// [chave enviada pelo site, título da coluna, largura em px]
const COLUNAS = [
  ['data_hora',    'Data/hora',              150],
  ['nome',         'Nome',                   220],
  ['whatsapp',     'WhatsApp',               140],
  ['email',        'E-mail',                 240],
  ['area',         'Área de atuação',        180],
  ['tamanho',      'Pessoas no escritório',  160],
  ['utm_source',   'utm_source',             120],
  ['utm_medium',   'utm_medium',             120],
  ['utm_campaign', 'utm_campaign',           160],
  ['utm_content',  'utm_content',            160],
  ['utm_term',     'utm_term',               120],
];

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(ABA) || ss.insertSheet(ABA, 0);
}

/** Monta o modelo da planilha. Pode rodar de novo sem perder dados. */
function configurarPlanilha() {
  const sh = aba_();
  const n = COLUNAS.length;
  const head = sh.getRange(1, 1, 1, n);
  head.setValues([COLUNAS.map(c => c[1])])
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#FF6A00')
      .setVerticalAlignment('middle').setHorizontalAlignment('left');
  sh.setRowHeight(1, 34);
  sh.setFrozenRows(1);
  COLUNAS.forEach((c, i) => sh.setColumnWidth(i + 1, c[2]));
  // WhatsApp como texto puro (não perde parênteses/zeros)
  sh.getRange(2, 3, sh.getMaxRows() - 1, 1).setNumberFormat('@');
  // linhas zebradas
  sh.getBandings().forEach(b => b.remove());
  sh.getRange(2, 1, sh.getMaxRows() - 1, n).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  // remove colunas sobrando à direita
  if (sh.getMaxColumns() > n) sh.deleteColumns(n + 1, sh.getMaxColumns() - n);
  if (!sh.getFilter()) sh.getRange(1, 1, sh.getMaxRows(), n).createFilter();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'json' }); }
  if (d.secret !== SECRET) return json_({ ok: false, error: 'secret' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // evita linhas sobrepostas com inscrições simultâneas
  try {
    const sh = aba_();
    if (sh.getLastRow() === 0) configurarPlanilha();
    sh.appendRow(COLUNAS.map(c => String(d[c[0]] || '')));
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

/** Teste manual: Executar > testarEnvio. Deve aparecer uma linha "TESTE" na planilha. */
function testarEnvio() {
  const r = doPost({ postData: { contents: JSON.stringify({
    secret: SECRET, data_hora: new Date().toLocaleString('pt-BR'), nome: 'TESTE', whatsapp: '(21) 99999-9999',
    email: 'teste@exemplo.com', area: 'Previdenciário', tamanho: 'Apenas eu', utm_source: 'teste',
  }) } });
  Logger.log(r.getContent());
}
