/**
 * Homologación de unidad (AT/PT/S/C/U) para Taller.
 * - AT-15, AT15, A.T.10, AT-P 12, T15, 15 → AT-15
 * - CIL-33 → C-33; U-56 / U56 → U-56
 * - AT-144-142 → AT-144, AT-142 (lista, no rango continuo)
 * - AT11-AT15 → rango AT-11…AT-15
 * - Listas: "11,12,13", "AT11.13.17", "AT-142, 144 Y 145"
 */

const PREFIXES = ["AT", "PT", "S", "C", "U"];
const PREF_RE = "AT|PT|S|C|U|T";
const MAX_RANGE_SPAN = 40;

function formatUnit(prefix, num) {
  const p = String(prefix || "AT").toUpperCase();
  if (!Number.isFinite(num) || num < 1 || num > 9999) return null;
  const n = num < 100 ? String(num).padStart(2, "0") : String(num);
  return `${p}-${n}`;
}

function canonPrefix(p, fallback = "AT") {
  let pref = String(p || fallback).toUpperCase();
  if (pref === "T") pref = "AT";
  if (!PREFIXES.includes(pref)) pref = fallback === "T" ? "AT" : fallback;
  if (!PREFIXES.includes(pref)) pref = "AT";
  return pref;
}

/** Limpia variantes tipográficas de un fragmento. */
function preprocessPart(input) {
  let s = String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212\uFF0D]/g, "-")
    .replace(/\s+/g, "");
  if (!s) return "";

  // A.T.10 → AT10
  if (/^(?:[A-Z]\.)+[A-Z0-9]/.test(s)) {
    s = s.replace(/\./g, "");
  }

  s = s.replace(/^CIL/, "C");
  // AT-P12 / AT-P-12 / ATP12 (P = pipa)
  s = s.replace(new RegExp(`^(${PREF_RE})-?P-?(?=\\d)`, "i"), (_, p) => p.toUpperCase());
  return s;
}

/** Normaliza un solo token (sin listas). defaultPrefix si solo hay número. */
function normalizeUnidadToken(input, defaultPrefix = "AT") {
  const s = preprocessPart(input);
  if (!s) return null;

  const pref = canonPrefix(defaultPrefix);

  if (/^\d{1,4}$/.test(s)) {
    return formatUnit(pref, parseInt(s, 10));
  }

  const m = s.match(new RegExp(`^(${PREF_RE})[\\-]?(\\d{1,4})$`));
  if (!m) return null;
  return formatUnit(canonPrefix(m[1]), parseInt(m[2], 10));
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
  const s = preprocessPart(part);
  if (!s) return [];

  // Lista con un prefijo: AT-144-142 → AT-144, AT-142 (NO rellena 143)
  const multi = s.match(new RegExp(`^(${PREF_RE})-(\\d{1,4}(?:-\\d{1,4})+)$`));
  if (multi) {
    const prefix = canonPrefix(multi[1]);
    return multi[2]
      .split("-")
      .map((n) => formatUnit(prefix, parseInt(n, 10)))
      .filter(Boolean);
  }

  // Rango con prefijo en ambos lados o compacto: AT11-AT15 | AT11-15 | 11-15
  const range = s.match(new RegExp(`^(?:(${PREF_RE}))?(\\d{1,4})-(?:(${PREF_RE}))?(\\d{1,4})$`));
  if (range) {
    const prefix = canonPrefix(range[1] || range[3] || defaultPrefix);
    // Si ambos lados traen prefijo explícito (AT11-AT15) → rango continuo
    // Si solo números 11-15 → rango
    // Si AT11-15 → rango
    return expandRange(prefix, parseInt(range[2], 10), parseInt(range[4], 10));
  }

  // Puntos: AT11.13.17.24.65
  const dotted = s.match(new RegExp(`^(${PREF_RE})(\\d{1,4}(?:\\.\\d{1,4})+)$`));
  if (dotted) {
    const prefix = canonPrefix(dotted[1]);
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
  const compact = preprocessPart(s);
  if (
    new RegExp(
      `^(?:${PREF_RE}|CIL)?[\\-]?\\d{1,4}(?:-(?:${PREF_RE})?\\d{1,4}|\\.\\d{1,4})*$`
    ).test(compact) ||
    new RegExp(`^(${PREF_RE})-\\d{1,4}(?:-\\d{1,4})+$`).test(compact)
  ) {
    return [s];
  }
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return [s];
  const unitLike = parts.every((p) => {
    const t = preprocessPart(p);
    return new RegExp(`^(?:${PREF_RE})?[\\-]?\\d{1,4}$`).test(t) || /^\d{1,4}$/.test(t);
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
      error:
        "Unidad no reconocida. Ej: AT-15, A.T.10, AT-P12, U-56, PT-69, o varias: 11,12,13 / AT-144-142",
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
