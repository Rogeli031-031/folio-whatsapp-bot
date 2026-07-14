/** Normalización de texto para búsqueda de folios (coma, acentos, DE/DEL). */

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const STOPWORDS = new Set([
  "a", "al", "con", "de", "del", "en", "para", "por", "y", "e", "o",
  "el", "la", "los", "las", "un", "una", "que", "su", "se", "al",
]);

export function normalizeForSearch(text: string | null | undefined): string {
  return stripAccents(String(text || ""))
    .toLowerCase()
    // Sin \p{L}/\p{N} (requieren target ES2018+); tras quitar acentos basta a-z0-9.
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(text: string): string[] {
  const n = normalizeForSearch(text);
  if (!n) return [];
  return n.split(" ").filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Match flexible: includes normalizado o ≥85% de tokens del query en el texto. */
export function textMatchesSearch(haystack: string | null | undefined, needle: string | null | undefined): boolean {
  const q = normalizeForSearch(needle || "");
  if (!q) return true;
  const h = normalizeForSearch(haystack || "");
  if (!h) return false;
  if (h.includes(q)) return true;
  const qTok = significantTokens(needle || "");
  const hTok = significantTokens(haystack || "");
  if (qTok.length >= 2 && hTok.length >= 2) {
    const hSet = new Set(hTok);
    const hit = qTok.filter((t) => hSet.has(t)).length;
    if (hit / qTok.length >= 0.85) return true;
  }
  return false;
}
