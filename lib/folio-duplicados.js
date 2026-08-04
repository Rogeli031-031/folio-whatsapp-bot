"use strict";

/**
 * Detección de posibles folios duplicados por importe + concepto similar
 * (normalización + Jaccard tokens + Dice bigramas). Sin IA.
 */

const STOPWORDS = new Set([
  "a", "al", "ante", "con", "contra", "de", "del", "desde", "en", "entre",
  "hacia", "hasta", "para", "por", "segun", "sin", "sobre", "tras",
  "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "e", "o", "u",
  "que", "lo", "su", "sus", "mi", "mis", "tu", "tus", "se", "es", "son",
  "fue", "ser", "como", "mas", "menos", "muy", "ya", "no", "si",
]);

function stripAccents(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Texto normalizado para includes fuzzy (búsqueda). */
function normalizeForSearch(text) {
  return stripAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokens sin stopwords (para similitud de concepto). */
function tokenizeConcepto(text) {
  const norm = normalizeForSearch(text);
  if (!norm) return [];
  return norm.split(" ").filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function bigrams(tokens) {
  const s = tokens.join(" ");
  const out = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

function jaccard(a, b) {
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function diceBigrams(tokensA, tokensB) {
  const a = bigrams(tokensA);
  const b = bigrams(tokensB);
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const counts = new Map();
  for (const g of a) counts.set(g, (counts.get(g) || 0) + 1);
  let inter = 0;
  for (const g of b) {
    const n = counts.get(g) || 0;
    if (n > 0) {
      inter++;
      counts.set(g, n - 1);
    }
  }
  return (2 * inter) / (a.length + b.length);
}

/**
 * Score 0..1 entre dos conceptos.
 * Combina solapamiento de tokens y similitud por bigramas.
 */
function conceptoSimilarity(a, b) {
  const ta = tokenizeConcepto(a);
  const tb = tokenizeConcepto(b);
  if (!ta.length && !tb.length) return 1;
  if (!ta.length || !tb.length) {
    // Fallback: comparar normalizado completo (coma / DE-DEL)
    const na = normalizeForSearch(a);
    const nb = normalizeForSearch(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    if (na.includes(nb) || nb.includes(na)) {
      const shorter = Math.min(na.length, nb.length);
      const longer = Math.max(na.length, nb.length);
      return shorter / longer;
    }
    return diceBigrams(na.split(""), nb.split(""));
  }
  const jac = jaccard(ta, tb);
  const dice = diceBigrams(ta, tb);
  return Math.round(Math.max(jac, dice * 0.55 + jac * 0.45) * 1000) / 1000;
}

function roundImporte(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Math.round(Number(n) * 100) / 100;
}

function folioTextoConcepto(row) {
  return (row.descripcion || row.concepto || "").toString();
}

/**
 * ¿El término de búsqueda aparece en el texto (normalizado, includes fuzzy)?
 */
function textMatchesSearch(haystack, needle) {
  const q = normalizeForSearch(needle);
  if (!q) return true;
  const h = normalizeForSearch(haystack);
  if (!h) return false;
  if (h.includes(q)) return true;
  // Tolerar DE/DEL y diferencias menores: score alto sobre ventanas
  const qTok = tokenizeConcepto(needle);
  const hTok = tokenizeConcepto(haystack);
  if (qTok.length >= 3 && hTok.length >= 3) {
    const score = conceptoSimilarity(needle, haystack);
    if (score >= 0.85) return true;
    // Todas las palabras significativas del query están en el haystack
    const hSet = new Set(hTok);
    const hit = qTok.filter((t) => hSet.has(t)).length;
    if (hit / qTok.length >= 0.85) return true;
  }
  return false;
}

/**
 * Busca candidatos similares a un folio nuevo (mismo importe + concepto parecido).
 * @param {Array} rows - folios candidatos (misma planta)
 * @param {{ concepto: string, importe: number, excludeId?: number }} query
 * @param {{ umbral?: number, limit?: number }} opts
 */
function findSimilarTo(rows, query, opts = {}) {
  const umbral = opts.umbral != null ? Number(opts.umbral) : 0.72;
  const limit = opts.limit != null ? Number(opts.limit) : 15;
  const impQ = roundImporte(query.importe);
  if (impQ == null) return [];
  const out = [];
  for (const row of rows) {
    if (query.excludeId != null && Number(row.id) === Number(query.excludeId)) continue;
    const imp = roundImporte(row.importe);
    if (imp == null || imp !== impQ) continue;
    const texto = folioTextoConcepto(row);
    const score = conceptoSimilarity(query.concepto, texto);
    if (score >= umbral) {
      out.push({
        id: row.id,
        numero_folio: row.numero_folio || row.folio_codigo,
        folio_codigo: row.folio_codigo || row.numero_folio,
        concepto: texto,
        importe: imp,
        estatus: row.estatus || null,
        mes_cargo: row.mes_cargo || null,
        creado_en: row.creado_en || null,
        score,
      });
    }
  }
  out.sort((a, b) => b.score - a.score || String(b.creado_en || "").localeCompare(String(a.creado_en || "")));
  return out.slice(0, limit);
}

/**
 * Empareja folios de una planta: mismo importe + concepto similar.
 * Limita el tamaño de cada grupo de importe para evitar timeouts (Failed to fetch).
 * @returns {{ pairs: Array, scanned: number, groups_importe: number, truncated?: boolean }}
 */
function findDuplicatePairs(rows, opts = {}) {
  const umbral = opts.umbral != null ? Number(opts.umbral) : 0.72;
  const maxPairs = opts.maxPairs != null ? Number(opts.maxPairs) : 200;
  /** Evita O(n²) explosivo cuando muchos folios comparten el mismo monto. */
  const maxGroupSize = opts.maxGroupSize != null ? Number(opts.maxGroupSize) : 80;
  const byImporte = new Map();
  for (const row of rows) {
    const imp = roundImporte(row.importe);
    if (imp == null || imp === 0) continue;
    const key = String(imp);
    if (!byImporte.has(key)) byImporte.set(key, []);
    byImporte.get(key).push(row);
  }
  const pairs = [];
  let truncated = false;
  for (const [, groupRaw] of byImporte) {
    if (groupRaw.length < 2) continue;
    // Preferir los más recientes si el grupo es enorme
    let group = groupRaw;
    if (group.length > maxGroupSize) {
      truncated = true;
      group = [...groupRaw]
        .sort((a, b) => {
          const ta = a.creado_en ? new Date(a.creado_en).getTime() : 0;
          const tb = b.creado_en ? new Date(b.creado_en).getTime() : 0;
          return tb - ta;
        })
        .slice(0, maxGroupSize);
    }
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const score = conceptoSimilarity(folioTextoConcepto(a), folioTextoConcepto(b));
        if (score >= umbral) {
          pairs.push({
            score,
            importe: roundImporte(a.importe),
            a: {
              id: a.id,
              numero_folio: a.numero_folio || a.folio_codigo,
              folio_codigo: a.folio_codigo || a.numero_folio,
              concepto: folioTextoConcepto(a),
              estatus: a.estatus || null,
              mes_cargo: a.mes_cargo || null,
              creado_en: a.creado_en || null,
            },
            b: {
              id: b.id,
              numero_folio: b.numero_folio || b.folio_codigo,
              folio_codigo: b.folio_codigo || b.numero_folio,
              concepto: folioTextoConcepto(b),
              estatus: b.estatus || null,
              mes_cargo: b.mes_cargo || null,
              creado_en: b.creado_en || null,
            },
          });
          if (pairs.length >= maxPairs) {
            pairs.sort((x, y) => y.score - x.score);
            return { pairs, scanned: rows.length, groups_importe: byImporte.size, truncated: true };
          }
        }
      }
    }
  }
  pairs.sort((x, y) => y.score - x.score || (y.importe || 0) - (x.importe || 0));
  return { pairs, scanned: rows.length, groups_importe: byImporte.size, truncated };
}

module.exports = {
  normalizeForSearch,
  tokenizeConcepto,
  conceptoSimilarity,
  textMatchesSearch,
  findSimilarTo,
  findDuplicatePairs,
  roundImporte,
};
