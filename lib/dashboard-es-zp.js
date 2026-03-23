"use strict";

/**
 * ¿Debe tratarse el usuario como Director ZP (JWT role "ZP", todas las plantas)?
 * Alineado con los enlaces de dashboard / DICF; amplía claves y nombres frecuentes en catálogo.
 */
function isDirectorZPForDashboard(rolClave, rolNombre) {
  const c = (rolClave != null ? String(rolClave) : "").replace(/\s+/g, "").toUpperCase();
  const nom = rolNombre != null ? String(rolNombre) : "";
  if (c === "ZP") return true;
  const clavesZP = ["DIR_ZP", "DIRZP", "DIRECTORZP", "DIRECTOR_ZP", "DZP", "DIR-ZP"];
  if (clavesZP.includes(c)) return true;
  if (nom && /director/i.test(nom) && /zp/i.test(nom)) return true;
  if (nom && /director/i.test(nom) && /z\.\s*p\./i.test(nom)) return true;
  return false;
}

module.exports = { isDirectorZPForDashboard };
