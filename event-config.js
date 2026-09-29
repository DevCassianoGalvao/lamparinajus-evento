/**
 * Configuração central · Advocacia de Sucesso · 3ª Edição
 * Edite só este bloco para plugar o evento em produção.
 */
export const CONFIG = {
  // E-mail que recebe cada inscrição via FormSubmit.
  EMAIL_DESTINO: "lamparinajus@gmail.com",

  // URL do Web App do Google Apps Script (deixe "" para desativar o envio à planilha).
  // Passo a passo para criar o webhook do Sheets:
  // 1. Crie uma planilha no Google Sheets com as colunas:
  //    nome | whatsapp | email | area | tamanho | utm_source | utm_medium | utm_campaign | utm_content | utm_term | data_hora
  // 2. Menu Extensões > Apps Script.
  // 3. Cole o código abaixo no editor:
  //
  //    function doPost(e) {
  //      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  //      const data = JSON.parse(e.postData.contents);
  //      sheet.appendRow([
  //        data.nome, data.whatsapp, data.email, data.area, data.tamanho,
  //        data.utm_source, data.utm_medium, data.utm_campaign, data.utm_content, data.utm_term,
  //        data.data_hora
  //      ]);
  //      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
  //        .setMimeType(ContentService.MimeType.JSON);
  //    }
  //
  // 4. Implantar > Nova implantação > tipo "App da Web".
  // 5. Executar como "Eu", acesso "Qualquer pessoa".
  // 6. Copie a URL gerada e cole abaixo.
  SHEETS_WEBHOOK_URL: "",

  // Link do grupo de WhatsApp já existente do Advocacia de Sucesso.
  GROUP_URL: "https://chat.whatsapp.com/JaOauBnZtcNJCrZVyGDAaw?s=cl&p=i&mlu=0&ilr=4",

  // ID do Meta Pixel (deixe "" para não carregar o Pixel).
  META_PIXEL_ID: "",
};

export function formatPhoneBR(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, "($1");
  if (digits.length <= 6) return digits.replace(/(\d{2})(\d{0,4})/, "($1) $2");
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function isValidPhone(value) {
  return String(value || "").replace(/\D/g, "").length >= 10;
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const UTM_STORAGE_KEY = "ads_utms";

// Captura os UTMs da URL na primeira visita e preserva o "first touch" em sessionStorage.
export function captureUTMs() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = {};
    let hasAny = false;
    UTM_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) { fromUrl[k] = v; hasAny = true; }
    });
    const stored = JSON.parse(sessionStorage.getItem(UTM_STORAGE_KEY) || "{}");
    const merged = hasAny ? { ...stored, ...fromUrl } : stored;
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    return {};
  }
}

export function getStoredUTMs() {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_STORAGE_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

// Envia a inscrição por e-mail (FormSubmit) e, se configurado, para o webhook do Sheets.
export async function submitInscricao(payload) {
  const body = {
    ...payload,
    _subject: "Nova inscrição · Advocacia de Sucesso 3ª edição",
    _template: "table",
    _captcha: "false",
  };

  const res = await fetch(`https://formsubmit.co/ajax/${CONFIG.EMAIL_DESTINO}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Não foi possível enviar sua inscrição. Tente novamente.");

  if (CONFIG.SHEETS_WEBHOOK_URL) {
    try {
      await fetch(CONFIG.SHEETS_WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // Falha no webhook não deve travar o fluxo principal (o e-mail já foi enviado).
    }
  }

  return true;
}

export function saveInscricaoLocal(payload) {
  try {
    sessionStorage.setItem("ads_inscricao", JSON.stringify(payload));
  } catch (e) {}
}

export function getInscricaoLocal() {
  try {
    return JSON.parse(sessionStorage.getItem("ads_inscricao") || "null");
  } catch (e) {
    return null;
  }
}
