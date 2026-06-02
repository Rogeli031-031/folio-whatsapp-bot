"use strict";

/**
 * Bandera global Director IA (MVP).
 * Cuando está deshabilitada, no debe montarse UI ni rutas del módulo;
 * el resto del dashboard (IGF, ARR, Action Register, DICF, etc.) no depende de este archivo.
 */

/**
 * @returns {boolean} true solo si ENABLE_DIRECTOR_IA está definida y es "true" o "1".
 */
function isDirectorIaEnabled() {
  const raw = process.env.ENABLE_DIRECTOR_IA;
  if (raw == null || String(raw).trim() === "") {
    return false;
  }
  const v = String(raw).trim().toLowerCase();
  return v === "true" || v === "1";
}

module.exports = {
  isDirectorIaEnabled,
};
