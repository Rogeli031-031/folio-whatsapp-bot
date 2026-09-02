"use strict";

/**
 * Sincroniza detalle_lineas[0].beneficiario con el beneficiario principal del folio.
 * No fabrica JSON. No toca líneas 1..N. Conserva el resto de propiedades de la línea 0.
 *
 * @param {unknown} raw
 * @param {string|null} nuevoBeneficiario
 * @returns {{ synced: boolean, detalle_lineas: object[] | null }}
 */
function syncDetalleLineasPrincipalBeneficiario(raw, nuevoBeneficiario) {
  if (raw == null) return { synced: false, detalle_lineas: null };
  let parsed = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return { synced: false, detalle_lineas: null };
    try {
      parsed = JSON.parse(trimmed);
    } catch (_) {
      return { synced: false, detalle_lineas: null };
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { synced: false, detalle_lineas: null };
  }
  const first = parsed[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) {
    return { synced: false, detalle_lineas: null };
  }
  const nextFirst = Object.assign({}, first, { beneficiario: nuevoBeneficiario });
  return {
    synced: true,
    detalle_lineas: [nextFirst].concat(parsed.slice(1)),
  };
}

module.exports = {
  syncDetalleLineasPrincipalBeneficiario,
};
