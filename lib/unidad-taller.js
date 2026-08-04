/**
 * Homologación de unidad (AT/PT/S/C) para Taller.
 * - Normaliza variantes: AT-15, AT15, AT 15, T15, 15, at-15 → AT-15
 * - CIL-33 → C-33; padding a 2 dígitos si num < 100 (AT-03)
 * - Listas: "11,12,13", "AT11-AT15", "AT11.13.17", "AT-142, 144 Y 145"
 */

const PREFIXES = ["AT", "PT", "S", "C"];
const MAX_RANGE_SPAN = 40;

function formatUnit(prefix, num) {
  const p = String(prefix || "AT").toUpperCase();
  if (!Number.isFinite(num) || num < 1 || num > 9999) return null;
  const n = num < 100 ? String(num).padStart(2, "0") : String(num);
  return `${p}-${n}`;
}

/** Normaliza un solo token (sin listas). defaultPrefix si solo hay número. */
function normalizeUnidadToken(input, defaultPrefix = "AT") {
  let s = String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212\uFF0D]/g, "-")
    .replace(/\s+/g, "");
  if (!s) return null;
  s = s.replace(/^CIL/, "C");

  let pref = String(defaultPrefix || "AT").toUpperCase();
  if (pref === "T") pref = "AT";
  if (!PREFIXES.includes(pref) && pref !== "AT") pref = "AT";

  if (/^\d{1,4}$/.test(s)) {
    return formatUnit(pref, parseInt(s, 10));
  }

  const m = s.match(/^(AT|PT|S|C|T)[\-]?(\d{1,4})$/);
  if (!m) return null;
  const prefix = m[1] === "T" ? "AT" : m[1];
  return formatUnit(prefix, parseInt(m[2], 10));
}

function expandRange(prefix, fromNum, toNum) {
  const a = Math.min(fromNum, toNum);
  const b = Math.max(fromNum, toNum);
  if (b - a > MAX_RANGE_SPAN) return [];
  const out = [];
  for (let n = a; n <= b; n += 1) {
    const u = formatUnit(prefix, n);
    if (u) out.push(u);
  }
  return out;
}

/**
 * Expande un fragmento (sin comas) a una o más unidades canónicas.
 * @param {string} part
 * @param {string} defaultPrefix
 * @returns {string[]}
 */
function expandToken(part, defaultPrefix = "AT") {
  let s = String(part || "")
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212\uFF0D]/g, "-")
    .replace(/\s+/g, "");
  if (!s) return [];
  s = s.replace(/^CIL/, "C");

  // Rango: AT11-AT15 | AT11-15 | 11-15
  const range = s.match(/^(?:(AT|PT|S|C|T))?(\d{1,4})-(?:(AT|PT|S|C|T))?(\d{1,4})$/);
  if (range) {
    let p1 = range[1] || defaultPrefix;
    let p2 = range[3] || p1;
    if (p1 === "T") p1 = "AT";
    if (p2 === "T") p2 = "AT";
    const prefix = p1 || p2 || "AT";
    return expandRange(prefix, parseInt(range[2], 10), parseInt(range[4], 10));
  }

  // Puntos: AT11.13.17.24.65
  const dotted = s.match(/^(AT|PT|S|C|T)(\d{1,4}(?:\.\d{1,4})+)$/);
  if (dotted) {
    let prefix = dotted[1] === "T" ? "AT" : dotted[1];
    return dotted[2]
      .split(".")
      .map((n) => formatUnit(prefix, parseInt(n, 10)))
      .filter(Boolean);
  }

  const one = normalizeUnidadToken(s, defaultPrefix);
  return one ? [one] : [];
}

/** Partes separadas por espacio que parecen varias unidades (ej. "S-96 S-101"). */
function splitSpaceUnits(chunk) {
  const s = String(chunk || "").trim();
  if (!s) return [];
  // Si es un solo token compacto, no partir
  const compact = s.toUpperCase().replace(/\s+/g, "");
  if (/^(?:AT|PT|S|C|T|CIL)?[\-]?\d{1,4}(?:-(?:AT|PT|S|C|T)?\d{1,4}|\.\d{1,4})*$/.test(compact)) {
    return [s];
  }
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return [s];
  const unitLike = parts.every((p) => {
    const t = p.toUpperCase().replace(/\s+/g, "");
    return /^(?:AT|PT|S|C|T|CIL)?[\-]?\d{1,4}$/.test(t) || /^\d{1,4}$/.test(t);
  });
  return unitLike ? parts : [s];
}

/**
 * Parsea texto libre a lista canónica de unidades (sin duplicados, orden de aparición).
 * @param {string|null|undefined} input
 * @returns {string[]}
 */
function parseUnidadesList(input) {
  let s = String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212\uFF0D]/g, "-")
    .replace(/\s+Y\s+/g, ",")
    .replace(/;/g, ",");
  if (!s) return [];

  const chunks = s.split(",").map((c) => c.trim()).filter(Boolean);
  const out = [];
  let lastPrefix = "AT";

  for (const chunk of chunks) {
    for (const part of splitSpaceUnits(chunk)) {
      const expanded = expandToken(part, lastPrefix);
      for (const u of expanded) {
        if (!out.includes(u)) out.push(u);
        const m = u.match(/^([A-Z]+)-/);
        if (m) lastPrefix = m[1];
      }
    }
  }
  return out;
}

function formatUnidadesStored(unidades) {
  const list = Array.isArray(unidades) ? unidades.filter(Boolean) : [];
  if (!list.length) return null;
  return list.join(", ");
}

/**
 * Reparte importe en centavos (resto a las primeras unidades).
 * @param {number} total
 * @param {string[]} unidades
 * @returns {{ unidad: string, importe: number }[]}
 */
function splitImportePorUnidades(total, unidades) {
  const list = (unidades || []).filter(Boolean);
  if (!list.length) return [];
  const cents = Math.round((Number(total) || 0) * 100);
  if (!Number.isFinite(cents)) return list.map((u) => ({ unidad: u, importe: 0 }));
  const n = list.length;
  const base = Math.floor(cents / n);
  let rem = cents - base * n;
  return list.map((u) => {
    const c = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
    return { unidad: u, importe: Math.round(c) / 100 };
  });
}

/**
 * Resuelve unidad de Taller para guardar en DB.
 * @returns {{ unidades: string[], stored: string|null, ok: boolean, error?: string }}
 */
function resolveUnidadTaller(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return { unidades: [], stored: null, ok: true };
  }
  const unidades = parseUnidadesList(raw);
  if (!unidades.length) {
    return {
      unidades: [],
      stored: null,
      ok: false,
      error: "Unidad no reconocida. Ej: AT-15, 15, T15, PT-69, o varias: 11,12,13 / AT11-AT15",
    };
  }
  return { unidades, stored: formatUnidadesStored(unidades), ok: true };
}

/** Compat WhatsApp / búsquedas: una sola unidad canónica (primera si hay lista). */
function normalizeUnidad(input) {
  const list = parseUnidadesList(input);
  if (list.length) return list[0];
  return normalizeUnidadToken(input);
}

module.exports = {
  formatUnit,
  normalizeUnidadToken,
  normalizeUnidad,
  parseUnidadesList,
  formatUnidadesStored,
  splitImportePorUnidades,
  resolveUnidadTaller,
  PREFIXES,
};
