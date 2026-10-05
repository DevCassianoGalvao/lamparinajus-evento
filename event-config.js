/**
 * Configuração central · Advocacia de Sucesso · 3ª Edição
 * Edite só este bloco para plugar o evento em produção.
 */
export const CONFIG = {
  // Função da Vercel que envia o e-mail (Brevo) e grava na planilha. Chaves em variáveis de ambiente (.env.example).
  API_URL: "/api/inscricao",

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

// Envia a inscrição para a função /api/inscricao (Brevo + planilha).
export async function submitInscricao(payload) {
  const res = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Não foi possível enviar sua inscrição. Tente novamente.");
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
