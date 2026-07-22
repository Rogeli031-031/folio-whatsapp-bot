"use strict";

/**
 * Catálogo explícito de permisos del dashboard / bot.
 * Los valores por defecto dependen del rol; se pueden sobreescribir por usuario (permisos_json).
 */
const PERMISOS_CATALOGO = [
  { clave: "acceso_crear_folios", etiqueta: "Acceso a crear folios" },
  { clave: "acceso_aprobar_folios", etiqueta: "Acceso a aprobar folios" },
  { clave: "acceso_aprobar_comprobaciones", etiqueta: "Acceso a aprobar comprobaciones (pasar a EVIDENCIAS)" },
  { clave: "acceso_mover_folio_arrastre", etiqueta: "Acceso a mover un folio de forma arrastre" },
  { clave: "acceso_avanzar_etapa", etiqueta: "Acceso a avanzar etapa (carro / cuenta fondos / cheque)" },
  { clave: "acceso_solicitar_cancelacion", etiqueta: "Acceso a solicitar cancelación de folio" },
  { clave: "acceso_aprobar_cancelacion", etiqueta: "Acceso a aprobar cancelación" },
  { clave: "acceso_cancelar_folio_dashboard", etiqueta: "Acceso a cancelar folio desde el dashboard" },
  { clave: "acceso_editar_folio", etiqueta: "Acceso a editar folio" },
  { clave: "acceso_subir_poliza", etiqueta: "Acceso a subir póliza" },
  {
    clave: "acceso_marcar_solo_zp_ad",
    etiqueta: "Solo ZP y AD (hacer privado) — seleccionar / marcar folio como privado",
  },
  {
    clave: "acceso_ver_folios_solo_zp_ad",
    etiqueta: "Ver folios Solo ZP y AD (privados)",
  },
  { clave: "acceso_asignar_mes_cargo", etiqueta: "Acceso a asignar mes de cargo" },
  { clave: "acceso_marcar_urgente", etiqueta: "Acceso a marcar folio como urgente" },
  { clave: "acceso_ver_imprimir_folios", etiqueta: "Acceso a ver e imprimir folios" },
  { clave: "acceso_igf_forecast_kpis", etiqueta: "Acceso a IGF Forecast / KPIs financieros" },
  { clave: "acceso_acciones_dicf", etiqueta: "Acceso a Acciones (Action Register / DICF)" },
  { clave: "acceso_consola_whatsapp_ar", etiqueta: "Acceso a comandos WhatsApp Action Register / Director IA" },
];

const PERMISO_CLAVES = PERMISOS_CATALOGO.map((p) => p.clave);

function emptyPermisos(value = false) {
  const out = {};
  for (const k of PERMISO_CLAVES) out[k] = !!value;
  return out;
}

/** Permisos por defecto según clave de rol del dashboard / bot. */
function permisosPorRol(rolClave) {
  const r = String(rolClave || "")
    .trim()
    .toUpperCase();
  const p = emptyPermisos(false);

  if (r === "AD") {
    return {
      ...p,
      acceso_crear_folios: true,
      acceso_aprobar_folios: true,
      acceso_aprobar_comprobaciones: true,
      acceso_mover_folio_arrastre: true,
      acceso_avanzar_etapa: true,
      acceso_solicitar_cancelacion: true,
      acceso_aprobar_cancelacion: true,
      acceso_cancelar_folio_dashboard: true,
      acceso_editar_folio: true,
      acceso_subir_poliza: true,
      acceso_marcar_solo_zp_ad: true,
      acceso_ver_folios_solo_zp_ad: true,
      acceso_asignar_mes_cargo: true,
      acceso_marcar_urgente: true,
      acceso_ver_imprimir_folios: true,
      acceso_igf_forecast_kpis: true,
      acceso_acciones_dicf: true,
      acceso_consola_whatsapp_ar: false,
    };
  }

  if (r === "ZP" || r === "DIR_ZP" || r === "DIRZP" || r === "DIRECTOR_ZP" || r === "DZP") {
    return {
      ...p,
      acceso_crear_folios: true,
      acceso_aprobar_folios: true,
      acceso_aprobar_comprobaciones: true,
      acceso_mover_folio_arrastre: true,
      acceso_avanzar_etapa: true,
      acceso_solicitar_cancelacion: false,
      acceso_aprobar_cancelacion: true,
      acceso_cancelar_folio_dashboard: true,
      acceso_editar_folio: false,
      acceso_subir_poliza: false,
      acceso_marcar_solo_zp_ad: true,
      acceso_ver_folios_solo_zp_ad: true,
      acceso_asignar_mes_cargo: true,
      acceso_marcar_urgente: true,
      acceso_ver_imprimir_folios: true,
      acceso_igf_forecast_kpis: true,
      acceso_acciones_dicf: true,
      acceso_consola_whatsapp_ar: false,
    };
  }

  if (r === "GG") {
    return {
      ...p,
      acceso_crear_folios: true,
      acceso_aprobar_folios: true,
      acceso_aprobar_comprobaciones: true,
      acceso_mover_folio_arrastre: false,
      acceso_avanzar_etapa: true,
      acceso_solicitar_cancelacion: true,
      acceso_aprobar_cancelacion: false,
      acceso_cancelar_folio_dashboard: true,
      acceso_editar_folio: false,
      acceso_subir_poliza: false,
      acceso_marcar_solo_zp_ad: false,
      acceso_ver_folios_solo_zp_ad: false,
      acceso_asignar_mes_cargo: true,
      acceso_marcar_urgente: true,
      acceso_ver_imprimir_folios: true,
      acceso_igf_forecast_kpis: true,
      acceso_acciones_dicf: true,
      acceso_consola_whatsapp_ar: false,
    };
  }

  if (r === "GA") {
    return {
      ...p,
      acceso_crear_folios: true,
      acceso_aprobar_folios: false,
      acceso_aprobar_comprobaciones: false,
      acceso_mover_folio_arrastre: false,
      acceso_avanzar_etapa: false,
      acceso_solicitar_cancelacion: true,
      acceso_aprobar_cancelacion: false,
      acceso_cancelar_folio_dashboard: true,
      acceso_editar_folio: false,
      acceso_subir_poliza: false,
      acceso_marcar_solo_zp_ad: false,
      acceso_ver_folios_solo_zp_ad: false,
      acceso_asignar_mes_cargo: false,
      acceso_marcar_urgente: false,
      acceso_ver_imprimir_folios: true,
      acceso_igf_forecast_kpis: false,
      acceso_acciones_dicf: false,
      acceso_consola_whatsapp_ar: false,
    };
  }

  if (r === "CF_CDMX" || r === "CDMX") {
    return {
      ...p,
      acceso_crear_folios: false,
      acceso_aprobar_folios: false,
      acceso_aprobar_comprobaciones: false,
      acceso_mover_folio_arrastre: false,
      acceso_avanzar_etapa: false,
      acceso_solicitar_cancelacion: true,
      acceso_aprobar_cancelacion: false,
      acceso_cancelar_folio_dashboard: false,
      acceso_editar_folio: false,
      acceso_subir_poliza: false,
      acceso_marcar_solo_zp_ad: false,
      acceso_ver_folios_solo_zp_ad: false,
      acceso_asignar_mes_cargo: false,
      acceso_marcar_urgente: false,
      acceso_ver_imprimir_folios: true,
      acceso_igf_forecast_kpis: true,
      acceso_acciones_dicf: true,
      acceso_consola_whatsapp_ar: false,
    };
  }

  if (r === "GV") {
    return {
      ...p,
      acceso_crear_folios: false,
      acceso_aprobar_folios: false,
      acceso_aprobar_comprobaciones: false,
      acceso_mover_folio_arrastre: false,
      acceso_avanzar_etapa: false,
      acceso_solicitar_cancelacion: false,
      acceso_aprobar_cancelacion: false,
      acceso_cancelar_folio_dashboard: false,
      acceso_editar_folio: false,
      acceso_subir_poliza: false,
      acceso_marcar_solo_zp_ad: false,
      acceso_ver_folios_solo_zp_ad: false,
      acceso_asignar_mes_cargo: false,
      acceso_marcar_urgente: false,
      acceso_ver_imprimir_folios: false,
      acceso_igf_forecast_kpis: true,
      acceso_acciones_dicf: false,
      acceso_consola_whatsapp_ar: false,
    };
  }

  if (r === "GO" || r === "SG" || r === "SEH") {
    return {
      ...p,
      acceso_ver_imprimir_folios: false,
      acceso_igf_forecast_kpis: false,
      acceso_acciones_dicf: false,
      acceso_consola_whatsapp_ar: true,
    };
  }

  return p;
}

function parsePermisosJson(raw) {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Permisos efectivos: defaults del rol + overrides en permisos_json (solo claves conocidas).
 */
function permisosEfectivos(rolClave, permisosJson) {
  const base = permisosPorRol(rolClave);
  const custom = parsePermisosJson(permisosJson);
  if (!custom) return base;
  const out = { ...base };
  for (const k of PERMISO_CLAVES) {
    if (Object.prototype.hasOwnProperty.call(custom, k)) {
      out[k] = !!custom[k];
    }
  }
  return out;
}

/** Normaliza un mapa de permisos entrante (solo claves del catálogo → boolean). */
function normalizePermisosInput(input) {
  const out = emptyPermisos(false);
  if (!input || typeof input !== "object") return out;
  for (const k of PERMISO_CLAVES) {
    if (Object.prototype.hasOwnProperty.call(input, k)) {
      out[k] = !!input[k];
    }
  }
  return out;
}

/**
 * ¿El auth del dashboard tiene el permiso?
 * Si el token trae `permisos`, se usa; si no, se deriva del role.
 */
function authHasPermiso(auth, permisoClave) {
  if (!auth) return false;
  const key = String(permisoClave || "").trim();
  if (!key || !PERMISO_CLAVES.includes(key)) return false;
  const fromToken = auth.permisos;
  if (fromToken && typeof fromToken === "object" && Object.prototype.hasOwnProperty.call(fromToken, key)) {
    return !!fromToken[key];
  }
  return !!permisosPorRol(auth.role)[key];
}

function permisosParaExcelColumns() {
  return PERMISOS_CATALOGO.map((p) => ({ key: p.clave, header: p.etiqueta }));
}

module.exports = {
  PERMISOS_CATALOGO,
  PERMISO_CLAVES,
  emptyPermisos,
  permisosPorRol,
  parsePermisosJson,
  permisosEfectivos,
  normalizePermisosInput,
  authHasPermiso,
  permisosParaExcelColumns,
};
