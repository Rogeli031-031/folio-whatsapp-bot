"use strict";

/**
 * Director IA — M2 primer slice: estatus/etapa de folios (read-only, in-process).
 * SQL equivalente a getFolioById / getFolioByNumero / getManyFoliosStatus.
 * Listado: SELECT delgado + buildDashboardWhere (ventana off).
 * No HTTP. No maybeAdvance. No writes.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const {
  parseDashboardFilters,
  buildDashboardWhere,
  getPlantaIdsEquivalentesForPendientes,
} = require("./director-ia-m3-plantas-kpis-proyectos");
const usuarioPermisos = require("./usuario-permisos");

const FOLIO_STATUS_SEMANTIC_CLASS = "folio_status_stage";
const LIST_LIMIT = 40;
const SOURCE = "public.folios.estatus";

const ESTADOS = {
  GENERADO: "GENERADO",
  PENDIENTE_APROB_PLANTA: "PENDIENTE_APROB_PLANTA",
  APROB_PLANTA: "APROB_PLANTA",
  PENDIENTE_APROB_ZP: "PENDIENTE_APROB_ZP",
  APROBADO_ZP: "APROBADO_ZP",
  LISTO_PARA_PROGRAMACION: "LISTO_PARA_PROGRAMACION",
  SELECCIONADO_SEMANA: "SELECCIONADO_SEMANA",
  SOLICITANDO_PAGO: "SOLICITANDO_PAGO",
  CUENTA_FONDOS: "CUENTA_FONDOS",
  CHEQUE_GENERADO: "CHEQUE_GENERADO",
  PAGADO: "PAGADO",
  CERRADO: "CERRADO",
  COMPROBACIONES: "COMPROBACIONES",
  EVIDENCIAS: "EVIDENCIAS",
  CANCELACION_SOLICITADA: "CANCELACION_SOLICITADA",
  CANCELADO: "CANCELADO",
};

const ESTADOS_CARRO_COMPRA = [
  ESTADOS.APROBADO_ZP,
  ESTADOS.LISTO_PARA_PROGRAMACION,
  ESTADOS.SELECCIONADO_SEMANA,
];
const ESTADOS_CHEQUE_GENERADO = [ESTADOS.CHEQUE_GENERADO, ESTADOS.SOLICITANDO_PAGO];

const ETAPA_VISUAL = {
  PENDIENTE_APROB_PLANTA: "PENDIENTE_APROB_PLANTA",
  APROB_DIRECTOR_ZP: "APROB_DIRECTOR_ZP",
  CARRO_COMPRA: "CARRO_COMPRA",
  CUENTA_FONDOS: "CUENTA_FONDOS",
  CHEQUE_GENERADO: "CHEQUE_GENERADO",
  DEPOSITO_CIERRE: "DEPOSITO_CIERRE",
  COMPROBACIONES: "COMPROBACIONES",
  EVIDENCIAS: "EVIDENCIAS",
  CANCELADO: "CANCELADO",
};

const ETAPAS_VISUAL_ORDER = [
  ETAPA_VISUAL.PENDIENTE_APROB_PLANTA,
  ETAPA_VISUAL.APROB_DIRECTOR_ZP,
  ETAPA_VISUAL.CARRO_COMPRA,
  ETAPA_VISUAL.CUENTA_FONDOS,
  ETAPA_VISUAL.CHEQUE_GENERADO,
  ETAPA_VISUAL.DEPOSITO_CIERRE,
  ETAPA_VISUAL.COMPROBACIONES,
  ETAPA_VISUAL.EVIDENCIAS,
  ETAPA_VISUAL.CANCELADO,
];

const ETAPA_VISIBLE = {
  [ETAPA_VISUAL.PENDIENTE_APROB_PLANTA]: { label: "Pendiente aprobación planta" },
  [ETAPA_VISUAL.APROB_DIRECTOR_ZP]: { label: "Aprobación Director ZP" },
  [ETAPA_VISUAL.CARRO_COMPRA]: { label: "Carro de compra" },
  [ETAPA_VISUAL.CUENTA_FONDOS]: { label: "Cuenta de fondos" },
  [ETAPA_VISUAL.CHEQUE_GENERADO]: { label: "Cheque Generado" },
  [ETAPA_VISUAL.DEPOSITO_CIERRE]: { label: "Depósito y cierre" },
  [ETAPA_VISUAL.COMPROBACIONES]: { label: "Comprobaciones" },
  [ETAPA_VISUAL.EVIDENCIAS]: { label: "Evidencias" },
  [ETAPA_VISUAL.CANCELADO]: { label: "Cancelado" },
};

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

function authCanVerFoliosSoloZpAd(auth) {
  return usuarioPermisos.authHasPermiso(auth, "acceso_ver_folios_solo_zp_ad");
}

/** Misma semántica que server.js estatusToEtapaVisual. */
function estatusToEtapaVisual(estatus) {
  const s = String(estatus || "").trim().toUpperCase();
  if (!s) return ETAPA_VISUAL.PENDIENTE_APROB_PLANTA;
  if (s === ESTADOS.CANCELADO) return ETAPA_VISUAL.CANCELADO;
  if (s === ESTADOS.CANCELACION_SOLICITADA) return ETAPA_VISUAL.APROB_DIRECTOR_ZP;
  if (s === ESTADOS.EVIDENCIAS) return ETAPA_VISUAL.EVIDENCIAS;
  if (s === ESTADOS.COMPROBACIONES) return ETAPA_VISUAL.COMPROBACIONES;
  if ([ESTADOS.PAGADO, ESTADOS.CERRADO].includes(s)) return ETAPA_VISUAL.DEPOSITO_CIERRE;
  if (ESTADOS_CHEQUE_GENERADO.includes(s)) return ETAPA_VISUAL.CHEQUE_GENERADO;
  if (s === ESTADOS.CUENTA_FONDOS) return ETAPA_VISUAL.CUENTA_FONDOS;
  if (ESTADOS_CARRO_COMPRA.includes(s)) return ETAPA_VISUAL.CARRO_COMPRA;
  if ([ESTADOS.PENDIENTE_APROB_ZP].includes(s) || /RECHAZADO_ZP/.test(s)) return ETAPA_VISUAL.APROB_DIRECTOR_ZP;
  return ETAPA_VISUAL.PENDIENTE_APROB_PLANTA;
}

function getEtapaVisibleLabel(estatus) {
  const ev = estatusToEtapaVisual(estatus);
  return ETAPA_VISIBLE[ev] ? ETAPA_VISIBLE[ev].label : estatus || "—";
}

function etapaVisualToEstatusTecnicos(etapaVisual) {
  const ev = String(etapaVisual || "").trim().toUpperCase();
  if (ev === ETAPA_VISUAL.PENDIENTE_APROB_PLANTA) {
    return [ESTADOS.GENERADO, ESTADOS.PENDIENTE_APROB_PLANTA, ESTADOS.APROB_PLANTA];
  }
  if (ev === ETAPA_VISUAL.APROB_DIRECTOR_ZP) return [ESTADOS.PENDIENTE_APROB_ZP, ESTADOS.CANCELACION_SOLICITADA];
  if (ev === ETAPA_VISUAL.CARRO_COMPRA) return [...ESTADOS_CARRO_COMPRA];
  if (ev === ETAPA_VISUAL.CUENTA_FONDOS) return [ESTADOS.CUENTA_FONDOS];
  if (ev === ETAPA_VISUAL.CHEQUE_GENERADO) return [...ESTADOS_CHEQUE_GENERADO];
  if (ev === ETAPA_VISUAL.DEPOSITO_CIERRE) return [ESTADOS.PAGADO, ESTADOS.CERRADO];
  if (ev === ETAPA_VISUAL.COMPROBACIONES) return [ESTADOS.COMPROBACIONES];
  if (ev === ETAPA_VISUAL.EVIDENCIAS) return [ESTADOS.EVIDENCIAS];
  if (ev === ETAPA_VISUAL.CANCELADO) return [ESTADOS.CANCELADO];
  return [];
}

function assertFolioStatusAccess(auth, plantaId) {
  const role = dashboardAuthRoleNorm(auth);
  if (role === "GV") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Tu rol (GV) no tiene acceso al dashboard de folios.",
    };
  }
  if (["GG", "GA", "AD"].includes(role) && auth && auth.plantas_permitidas?.length > 0) {
    if (!plantaId || !auth.plantas_permitidas.includes(plantaId)) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
        status: 403,
        error: "Sin permiso para esta planta",
      };
    }
  }
  return { ok: true };
}

function requirePlantaId(plantaId) {
  if (!Number.isFinite(Number(plantaId)) || Number(plantaId) <= 0) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: "planta_id es obligatorio",
    };
  }
  return null;
}

function sourceError(message) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: message || "Error de fuente de folios",
  };
}

function plantScopeIds(plantaId, resolveEquivalentIds) {
  const fn = resolveEquivalentIds || getPlantaIdsEquivalentesForPendientes;
  const ids = fn(plantaId) || [];
  return [...new Set(ids.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))];
}

function folioVisibleToAuth(auth, folio) {
  if (!folio) return { ok: false, reason: "not_found" };
  if (folio.solo_zp_ad && !authCanVerFoliosSoloZpAd(auth)) return { ok: false, reason: "not_found" };
  const role = dashboardAuthRoleNorm(auth);
  const creadoAd = folio.creado_por_rol_clave && String(folio.creado_por_rol_clave).toUpperCase() === "AD";
  if (creadoAd && role !== "ZP" && role !== "AD") return { ok: false, reason: "not_found" };
  return { ok: true };
}

function folioInPlantScope(folio, plantaId, resolveEquivalentIds) {
  if (!folio || folio.planta_id == null) return false;
  const allowed = plantScopeIds(plantaId, resolveEquivalentIds);
  return allowed.includes(Number(folio.planta_id));
}

function projectFolioCard(row) {
  const estatusRaw = row && row.estatus != null ? String(row.estatus) : null;
  const estatusTrim = estatusRaw != null ? estatusRaw.trim() : "";
  const estatusObserved = estatusTrim !== "" ? estatusTrim : null;
  const etapaDefaulted = !estatusObserved;
  const etapa = estatusToEtapaVisual(estatusObserved);
  return {
    folio_id: row.id != null ? Number(row.id) : null,
    numero_folio: row.numero_folio || null,
    folio_codigo: row.folio_codigo || null,
    planta_id: row.planta_id != null ? Number(row.planta_id) : null,
    planta_nombre: row.planta_nombre || null,
    estatus: estatusObserved,
    etapa,
    etapa_label: getEtapaVisibleLabel(estatusObserved),
    etapa_defaulted: etapaDefaulted,
    categoria: row.categoria || null,
    importe: row.importe != null ? Number(row.importe) : null,
    source: SOURCE,
  };
}

const FOLIO_SELECT = `
      SELECT f.id, f.numero_folio, f.folio_codigo, f.planta_id, f.estatus, f.categoria,
             f.importe, f.creado_en, f.creado_por_rol_clave,
             COALESCE(f.solo_zp_ad, false) AS solo_zp_ad,
             p.nombre AS planta_nombre
        FROM public.folios f
        LEFT JOIN public.plantas p ON p.id = f.planta_id`;

async function getFolioById(client, id) {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return null;
  const r = await client.query(`${FOLIO_SELECT} WHERE f.id = $1`, [n]);
  return r.rows[0] || null;
}

async function getFolioByNumero(client, numero) {
  const num = String(numero || "").trim();
  if (!num) return null;
  const r = await client.query(`${FOLIO_SELECT} WHERE f.numero_folio = $1`, [num]);
  return r.rows[0] || null;
}

async function getManyFoliosStatus(client, numeros) {
  if (!numeros || numeros.length === 0) return [];
  const uniq = [...new Set(numeros.map((n) => String(n).trim()).filter(Boolean))];
  if (!uniq.length) return numeros.map((numero) => ({ numero, folio: null }));
  const r = await client.query(`${FOLIO_SELECT} WHERE f.numero_folio = ANY($1::text[])`, [uniq]);
  const map = new Map();
  for (const row of r.rows || []) map.set(row.numero_folio, row);
  return numeros.map((numero) => ({ numero, folio: map.get(String(numero).trim()) || null }));
}

async function listFoliosByPlanta(client, auth, plantaId, etapa, opts = {}) {
  const filters = parseDashboardFilters({
    planta_id: String(plantaId),
    etapa: etapa || "",
    ventana: "0",
    solo_activos: "false",
  });
  const buildWhere = opts.buildDashboardWhere || buildDashboardWhere;
  const { where, params } = buildWhere(auth, filters, {
    authCanVerFoliosSoloZpAd: opts.authCanVerFoliosSoloZpAd || authCanVerFoliosSoloZpAd,
    getEquivalentIds: opts.resolveEquivalentIds || getPlantaIdsEquivalentesForPendientes,
    etapaVisualToEstatusTecnicos: opts.etapaVisualToEstatusTecnicos || etapaVisualToEstatusTecnicos,
    ETAPAS_VISUAL_ORDER: opts.ETAPAS_VISUAL_ORDER || ETAPAS_VISUAL_ORDER,
  });
  const limit = opts.limit != null ? Number(opts.limit) : LIST_LIMIT;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 80) : LIST_LIMIT;
  const n = params.length + 1;
  const r = await client.query(
    `${FOLIO_SELECT}
       WHERE 1=1 ${where}
       ORDER BY f.creado_en ASC NULLS LAST
       LIMIT $${n}`,
    [...params, safeLimit + 1]
  );
  const rows = r.rows || [];
  const truncated = rows.length > safeLimit;
  return { rows: truncated ? rows.slice(0, safeLimit) : rows, truncated, limit: safeLimit };
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  return r.rows[0] || null;
}

function parseFolioRefs(question) {
  const q = String(question || "");
  const numeros = [];
  const fRe = /\b(F-\d{6}-\d+)\b/gi;
  let m;
  while ((m = fRe.exec(q))) numeros.push(m[1].toUpperCase());
  const ids = [];
  const idRe = /\bfolio(?:s)?\s*(?:n[uú]mero|num|#|id)?\s*[:.]?\s*(\d+)\b/gi;
  while ((m = idRe.exec(q))) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) ids.push(n);
  }
  const listRe = /\bfolios?\s+(?:n[uú]mero|num|#|id)?\s*[:.]?\s*(\d+(?:\s*(?:,|y)\s*\d+)+)/gi;
  while ((m = listRe.exec(q))) {
    for (const raw of String(m[1]).split(/\s*(?:,|y)\s*/)) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) ids.push(n);
    }
  }
  return { ids: [...new Set(ids)], numeros: [...new Set(numeros)] };
}

function parseEtapaFromQuestion(question) {
  const q = String(question || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/\bcancelad/.test(q)) return ETAPA_VISUAL.CANCELADO;
  if (/\bevidencias?\b/.test(q)) return ETAPA_VISUAL.EVIDENCIAS;
  if (/\bcomprobaciones?\b/.test(q)) return ETAPA_VISUAL.COMPROBACIONES;
  if (/\bcarro\b/.test(q)) return ETAPA_VISUAL.CARRO_COMPRA;
  if (/\bcuenta\s+de\s+fondos\b/.test(q)) return ETAPA_VISUAL.CUENTA_FONDOS;
  if (/\baprobacion\s+(director\s+)?zp\b/.test(q) || /\bpendiente\s+zp\b/.test(q)) {
    return ETAPA_VISUAL.APROB_DIRECTOR_ZP;
  }
  if (/\bpendiente\s+aprobacion\s+planta\b/.test(q)) return ETAPA_VISUAL.PENDIENTE_APROB_PLANTA;
  if (ETAPAS_VISUAL_ORDER.includes(String(question || "").trim().toUpperCase())) {
    return String(question).trim().toUpperCase();
  }
  return null;
}

function finalizePayload(base) {
  return {
    ...base,
    retrieved_at: new Date().toISOString(),
    source: SOURCE,
    semantic_class: FOLIO_STATUS_SEMANTIC_CLASS,
  };
}

/**
 * Executor read-only de get_folio_status.
 */
async function loadFolioStatusForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertFolioStatusAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const question = opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const resolveEq = opts.resolveEquivalentIds || getPlantaIdsEquivalentesForPendientes;
  const byId = opts.getFolioById || getFolioById;
  const byNumero = opts.getFolioByNumero || getFolioByNumero;
  const byMany = opts.getManyFoliosStatus || getManyFoliosStatus;
  const listFn = opts.listFoliosByPlanta || listFoliosByPlanta;
  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;

  async function run(client) {
    const planta = await resolvePlanta(client, Number(plantaId));
    if (!planta) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        status: 404,
        error: "Planta no encontrada",
      };
    }

    const refs = parseFolioRefs(question);
    const etapaFilter = parseEtapaFromQuestion(question);

    if (refs.ids.length === 1 && refs.numeros.length === 0) {
      const row = await byId(client, refs.ids[0]);
      return packSingle(row, { lookup: "id", lookup_value: refs.ids[0] });
    }
    if (refs.numeros.length === 1 && refs.ids.length === 0) {
      const row = await byNumero(client, refs.numeros[0]);
      return packSingle(row, { lookup: "numero_folio", lookup_value: refs.numeros[0] });
    }
    if (refs.ids.length > 1 && refs.numeros.length === 0) {
      const rows = [];
      for (const id of refs.ids) {
        const row = await byId(client, id);
        if (row) rows.push(row);
      }
      return packMany(rows, { lookup: "id", lookup_values: refs.ids, asked: refs.ids.length });
    }
    if (refs.numeros.length > 1) {
      const found = await byMany(client, refs.numeros);
      const rows = found.map((x) => x.folio).filter(Boolean);
      return packMany(rows, { lookup: "numero_folio", lookup_values: refs.numeros, asked: refs.numeros.length });
    }
    if (refs.ids.length === 1 && refs.numeros.length === 1) {
      const byIdRow = await byId(client, refs.ids[0]);
      const byNumRow = await byNumero(client, refs.numeros[0]);
      if (byIdRow && byNumRow && Number(byIdRow.id) !== Number(byNumRow.id)) {
        return {
          ok: false,
          code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
          status: 400,
          error: "Identificador de folio ambiguo. Indica solo el id o solo el numero_folio.",
        };
      }
      return packSingle(byIdRow || byNumRow, { lookup: "id_or_numero", lookup_value: refs.ids[0] });
    }

    const listed = await listFn(client, auth, Number(plantaId), etapaFilter, {
      buildDashboardWhere: opts.buildDashboardWhere,
      resolveEquivalentIds: resolveEq,
      authCanVerFoliosSoloZpAd: opts.authCanVerFoliosSoloZpAd,
      etapaVisualToEstatusTecnicos: opts.etapaVisualToEstatusTecnicos,
      ETAPAS_VISUAL_ORDER: opts.ETAPAS_VISUAL_ORDER,
      limit: opts.limit,
    });
    const cards = (listed.rows || []).map(projectFolioCard);
    const counts = {};
    for (const c of cards) {
      const key = c.etapa || "UNKNOWN";
      counts[key] = (counts[key] || 0) + 1;
    }
    return finalizePayload({
      ok: true,
      mode: "list",
      planta_id: Number(plantaId),
      planta_nombre: planta.nombre || null,
      planta_clave: planta.clave || null,
      etapa_filter: etapaFilter,
      count: cards.length,
      counts_by_etapa: counts,
      truncated: !!listed.truncated,
      folios: cards,
    });

    function packSingle(row, meta) {
      if (!row) {
        return {
          ok: false,
          code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
          status: 404,
          error: "Folio no encontrado",
          lookup: meta.lookup,
          lookup_value: meta.lookup_value,
        };
      }
      const vis = folioVisibleToAuth(auth, row);
      if (!vis.ok) {
        return {
          ok: false,
          code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
          status: 404,
          error: "Folio no encontrado",
          lookup: meta.lookup,
          lookup_value: meta.lookup_value,
        };
      }
      if (!folioInPlantScope(row, Number(plantaId), resolveEq)) {
        return {
          ok: false,
          code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
          status: 403,
          error: "Sin permiso para este folio",
          lookup: meta.lookup,
          lookup_value: meta.lookup_value,
        };
      }
      return finalizePayload({
        ok: true,
        mode: "single",
        planta_id: Number(plantaId),
        planta_nombre: planta.nombre || null,
        lookup: meta.lookup,
        lookup_value: meta.lookup_value,
        folio: projectFolioCard(row),
      });
    }

    function packMany(rows, meta) {
      const visible = [];
      let cross = 0;
      for (const row of rows) {
        const vis = folioVisibleToAuth(auth, row);
        if (!vis.ok) continue;
        if (!folioInPlantScope(row, Number(plantaId), resolveEq)) {
          cross += 1;
          continue;
        }
        visible.push(projectFolioCard(row));
      }
      if (!visible.length && cross > 0) {
        return {
          ok: false,
          code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
          status: 403,
          error: "Sin permiso para estos folios",
        };
      }
      if (!visible.length) {
        return {
          ok: false,
          code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
          status: 404,
          error: "Folio no encontrado",
          lookup: meta.lookup,
          lookup_values: meta.lookup_values,
        };
      }
      return finalizePayload({
        ok: true,
        mode: "many",
        planta_id: Number(plantaId),
        planta_nombre: planta.nombre || null,
        lookup: meta.lookup,
        asked: meta.asked,
        count: visible.length,
        folios: visible,
      });
    }
  }

  const injected = Boolean(opts.getFolioById && opts.getFolioByNumero && opts.resolvePlanta);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message);
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de folios no disponible");
  }

  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return sourceError(e && e.message);
  } finally {
    client.release();
  }
}

function buildFolioStatusAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar folios de esta planta.";
    }
    if (payload && payload.status === 404) {
      return "No encontré ese folio en el alcance de la planta autorizada. No invento estatus ni etapa.";
    }
    if (payload && payload.status === 400) {
      return payload.error || "No pude interpretar el identificador del folio.";
    }
    return "No pude consultar el estatus del folio por un error de fuente. No afirmo etapa ni estatus.";
  }

  const scope = payload.planta_nombre || `planta ${payload.planta_id}`;
  if (payload.mode === "single" && payload.folio) {
    const f = payload.folio;
    const defaultNote = f.etapa_defaulted
      ? " El estatus observado está vacío; la etapa es el default del tablero (Pendiente aprobación planta), no un dato almacenado."
      : "";
    return (
      `Folio ${f.numero_folio || f.folio_id} (${scope}): estatus observado ${f.estatus || "null"}; ` +
      `etapa derivada ${f.etapa_label} (${f.etapa}).${defaultNote} ` +
      "La etapa no es una columna de base de datos. No incluye historial, documentos ni cheque/póliza."
    );
  }

  const list = payload.folios || [];
  const trunc = payload.truncated ? ` Listado truncado a ${payload.count} folios.` : "";
  const etapaBit = payload.etapa_filter ? ` en etapa ${payload.etapa_filter}` : "";
  if (!list.length) {
    return `No hay folios${etapaBit} en el alcance de ${scope} con los filtros aplicados. No invento el tablero.`;
  }
  const lines = list.slice(0, 12).map((f, i) => {
    return `${i + 1}. ${f.numero_folio || f.folio_id}: estatus ${f.estatus || "null"} → ${f.etapa_label}`;
  });
  return (
    `${list.length} folio(s)${etapaBit} en ${scope}.${trunc} ` +
    `Estatus observado; etapa derivada. No es Action Register ni KPIs agregados.\n` +
    lines.join("\n")
  );
}

function buildFolioStatusChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const okPayload = payload && payload.ok === true;
  const answer = buildFolioStatusAnswer(payload);
  let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (!okPayload) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
    } else if (payload && payload.code === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND) {
      veracity = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
    } else {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_ERROR;
    }
  }
  return {
    ok: true,
    answer,
    sources: okPayload ? [SOURCE] : [],
    context_meta: {
      mode: "folio_status",
      requested_domain: "folios",
      openai_called: false,
      veracity,
      semantic_class: FOLIO_STATUS_SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      folio_mode: okPayload ? payload.mode : undefined,
      count: okPayload ? payload.count : undefined,
    },
    folio_status: okPayload
      ? {
          semantic_class: payload.semantic_class,
          mode: payload.mode,
          planta_id: payload.planta_id,
          planta_nombre: payload.planta_nombre,
          source: payload.source,
          retrieved_at: payload.retrieved_at,
          folio: payload.folio || null,
          folios: payload.folios || null,
          count: payload.count,
          truncated: payload.truncated,
          etapa_filter: payload.etapa_filter,
          counts_by_etapa: payload.counts_by_etapa,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "folios", label: "Folios operativos" }
        : undefined,
  };
}

module.exports = {
  FOLIO_STATUS_SEMANTIC_CLASS,
  LIST_LIMIT,
  SOURCE,
  ESTADOS,
  ETAPA_VISUAL,
  ETAPAS_VISUAL_ORDER,
  estatusToEtapaVisual,
  getEtapaVisibleLabel,
  etapaVisualToEstatusTecnicos,
  assertFolioStatusAccess,
  projectFolioCard,
  parseFolioRefs,
  parseEtapaFromQuestion,
  getFolioById,
  getFolioByNumero,
  getManyFoliosStatus,
  listFoliosByPlanta,
  loadFolioStatusForChat,
  buildFolioStatusAnswer,
  buildFolioStatusChatResult,
};
