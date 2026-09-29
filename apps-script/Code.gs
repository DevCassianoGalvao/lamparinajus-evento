// Cole em Extensões > Apps Script da planilha. Troque o SECRET por uma senha sua.
const SECRET = 'TROQUE_POR_UMA_SENHA_LONGA';
const HEADERS = ['data_hora','nome','whatsapp','email','area','tamanho',
                 'utm_source','utm_medium','utm_campaign','utm_content','utm_term'];

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.secret !== SECRET) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON);
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  // whatsapp como texto para não perder o zero/parênteses
  sheet.appendRow(HEADERS.map(h => (h === 'whatsapp' ? "'" + (d[h] || '') : (d[h] || ''))));
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
