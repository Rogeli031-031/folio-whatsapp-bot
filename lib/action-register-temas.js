"use strict";

const ACTION_REGISTER_TEMAS = Object.freeze([
  "Contrataciones",
  "Mantenimiento",
  "General",
  "Clientes",
  "Apoyos",
  "Licencias",
  "Taller",
  "Oficinas",
  "Sistema vs Incendio",
  "ERP",
  "Imagen Corporativa",
]);

const TEMA_LOOKUP = new Map(
  ACTION_REGISTER_TEMAS.map((t) => [normalizeActionRegisterTemaKey(t), t])
);

function normalizeActionRegisterTemaKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isActionRegisterTema(value) {
  const key = normalizeActionRegisterTemaKey(value);
  return key !== "" && TEMA_LOOKUP.has(key);
}

/**
 * Devuelve el tema canónico del catálogo o null si no es válido.
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeActionRegisterTema(value) {
  const key = normalizeActionRegisterTemaKey(value);
  if (!key || !TEMA_LOOKUP.has(key)) return null;
  return TEMA_LOOKUP.get(key);
}

module.exports = {
  ACTION_REGISTER_TEMAS,
  isActionRegisterTema,
  normalizeActionRegisterTema,
  normalizeActionRegisterTemaKey,
};
