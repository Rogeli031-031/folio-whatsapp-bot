"use strict";

/**
 * Sanitiza códigos internos en respuestas de Director IA.
 * No inventa traducciones. Si no hay etiqueta humana segura, omite el código.
 */

const INTERNAL_CODE_RE = /\b(E\d{1,2}|plant_id=\d+|status_code=\d+|internal_key)\b/gi;
const BARE_PLANT_CODE_RE = /^E\d{1,2}$/i;

const KNOWN_PLANT_CODE_LABELS = Object.freeze({
  E7: null,
  E8: null,
  E9: null,
  E10: null,
  E11: null,
  E12: null,
  E13: null,
  E15: null,
});

function normalizeText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isInternalPlantCode(raw) {
  return BARE_PLANT_CODE_RE.test(String(raw || "").trim());
}

function humanPlantLabel(raw, catalog) {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (!isInternalPlantCode(value)) return value;
  const code = value.toUpperCase();
  const rows = Array.isArray(catalog) ? catalog : [];
  const hit = rows.find((row) => {
    const clave = String((row && (row.clave || row.plant_code || row.code)) || "").trim().toUpperCase();
    return clave === code;
  });
  const label = hit && String(hit.nombre || hit.label || "").trim();
  if (label && !isInternalPlantCode(label)) return label;
  return null;
}

function sanitizePlantScopeLabel(raw, catalog) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const mapped = humanPlantLabel(value, catalog);
  if (mapped) return mapped;
  if (isInternalPlantCode(value) || /^planta\s+E\d{1,2}$/i.test(value) || /^planta\s+\d+$/i.test(value)) {
    return null;
  }
  return value;
}

function stripInternalCodes(text, catalog) {
  const raw = String(text || "");
  if (!raw) return raw;
  return raw.replace(INTERNAL_CODE_RE, (match) => {
    const mapped = humanPlantLabel(match, catalog);
    return mapped || "";
  }).replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
}

function looksLikeInternalCode(raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  if (isInternalPlantCode(s)) return true;
  if (/^plant_id=\d+$/i.test(s)) return true;
  if (/^status_code=\d+$/i.test(s)) return true;
  if (/^internal_key$/i.test(s)) return true;
  return Object.prototype.hasOwnProperty.call(KNOWN_PLANT_CODE_LABELS, s.toUpperCase());
}

module.exports = {
  normalizeText,
  isInternalPlantCode,
  humanPlantLabel,
  sanitizePlantScopeLabel,
  stripInternalCodes,
  looksLikeInternalCode,
};
