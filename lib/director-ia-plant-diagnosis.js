"use strict";

/**
 * Chat legado: ensamblaje AR + DICF + bitácora + ARR + IGF + commercial_state
 * para plant_diagnosis. No IES. No Reasoning Engine. No M9. No HTTP. No writes.
 * commercial_state: SELECT-only arr.dicf_cliente_mes (sin recálculo DICF ni caché).
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { loadIgfArrSourceBlocksForChat } = require("./director-ia-igf-arr");
const { buildActionRegisterBoardPayload } = require("./action-register-board");
const {
  summarizeActionRegisterBoard,
  summarizeActionRegisterResponsables,
  summarizeTopOverdueActions,
  summarizeDicfContext,
  collectResponsableUsuarioIds,
  loadUsuarioRolesByIds,
  todayYmdMexicoCity,
} = require("./director-ia-action-register");
const { loadBitacoraForChat, CHAT_CONTEXT_MONTH_WINDOW } = require("./director-ia-bitacora");

const SEMANTIC_CLASS = "plant_diagnosis_multi_source";
const AR_SOURCE = "arr.action_register_revisions";
const DICF_SOURCE = "arr.dicf_acciones";
const BITACORA_SOURCE = "arr.director_ia_bitacora";
const ARR_SOURCE = "arr.proyeccion_planta";
const IGF_SOURCE = "igf.compromiso_lines";
const CS_SOURCE = "arr.dicf_cliente_mes";

const AR_OVERDUE_LIMIT = 5;
const AR_RESPONSABLES_LIMIT = 5;
const DICF_LIMIT = 8;
const BITACORA_LIMIT = 5;
const CS_DEJARON_LIMIT = 5;
const CS_OTHER_LIMIT = 3;
const IGF_COMPOSITION_LINES = 12;

const PLANT_DIAGNOSIS_SYSTEM_ADDENDUM = [
  "EVIDENCIA DE PLANTA MULTI-FUENTE (chat legado; no es IES; no es Reasoning Engine N5).",
  "Hay seis bloques separados: action_register, dicf, bitacora, commercial_state, arr, igf.",
  "Cada hecho cita su bloque. No fusiones origen. No sustituyas una fuente con otra.",
  "null no es 0. Ausencia no es cero. Error no es ausencia. SOURCE_RESTRICTED no es missing.",
  "Si alignment.status es mismatch, no trates los cortes YYYY-MM como el mismo mes.",
  "AR/DICF/bitácora tienen ventanas distintas a IGF/ARR/CS; no las alinees en silencio.",
  "Si assembly_status no es complete, no presentes un diagnóstico completo.",
  "Permitido: riesgos observables, acciones/responsables registrados, coincidencias y tensiones etiquetadas.",
  "Prohibido: causalidad; «AR causó IGF»; «comentario DICF prueba causa»; KPI identifica responsable.",
  "No formules hipótesis N5. No completes vacíos. No es M9.",
].join(" ");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYyyyMm(year, month) {
  if (!Number.isFinite(Number(year)) || !Number.isFinite(Number(month))) return null;
  return `${year}-${pad2(month)}`;
}

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

function emptyPlant(plantaId) {
  return { planta_id: Number(plantaId) || null, planta_nombre: null, plant_code: null };
}

function sourceBlock(over) {
  return {
    status: over.status || DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    plant: over.plant || emptyPlant(over.planta_id),
    period: over.period != null ? over.period : null,
    payload: over.payload !== undefined ? over.payload : null,
    source: over.source,
    absence: over.absence != null ? over.absence : null,
    error: over.error != null ? over.error : null,
    error_kind: over.error_kind || null,
    code: over.code || over.status || DIRECTOR_IA_VERACITY.SOURCE_ERROR,
  };
}

function restrictedBlock(source, plant, period, error) {
  return sourceBlock({
    status: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
    plant,
    period: period != null ? period : null,
    source,
    absence: null,
    error: error || "SOURCE_RESTRICTED",
    code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
    payload: null,
  });
}

/**
 * Authz operativa (AR/DICF/bitácora): misma norma que Action Register.
 * ZP/AD/CF_CDMX global. Resto (incl. GA/GV): plantas_permitidas.
 */
function assertOperationalPlantAccess(auth, plantaId) {
  if (!auth || typeof auth !== "object") {
    return {
      ok: false,
      abort: true,
      status: 403,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: "Sin acceso a esta planta",
    };
  }
  const role = dashboardAuthRoleNorm(auth);
  if (!role) {
    return {
      ok: false,
      abort: true,
      status: 403,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: "Sin acceso a esta planta",
    };
  }
  const pid = Number(plantaId);
  if (!Number.isFinite(pid) || pid <= 0) {
    return {
      ok: false,
      abort: true,
      status: 400,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      error: "planta_id es obligatorio",
    };
  }
  if (role === "ZP" || role === "AD" || role === "CF_CDMX") {
    return { ok: true };
  }
  const allowed = (auth.plantas_permitidas || []).map((x) => Number(x)).filter(Number.isFinite);
  if (!allowed.includes(pid)) {
    return {
      ok: false,
      abort: true,
      status: 403,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: "Sin acceso a esta planta",
    };
  }
  return { ok: true };
}

function isGaFinancialRestricted(auth) {
  return dashboardAuthRoleNorm(auth) === "GA";
}

function mapIgfBlock(raw, plant, year, month) {
  const period = toYyyyMm(year, month);
  const basePlant = plant || emptyPlant();
  if (raw && raw.restricted) {
    return restrictedBlock(IGF_SOURCE, basePlant, period, raw.error);
  }
  if (!raw) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant: basePlant,
      period,
      source: IGF_SOURCE,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: null,
    });
  }
  if (raw.load_error) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      plant: basePlant,
      period,
      source: IGF_SOURCE,
      absence: null,
      error: raw.load_error,
      error_kind: "TOOL_ERROR",
      payload: null,
    });
  }
  if (!raw.version_id) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant: basePlant,
      period,
      source: IGF_SOURCE,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: { version_id: null, version_number: null, composition: null, omitted_null_keys: [] },
    });
  }
  if (!raw.row) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant: basePlant,
      period,
      source: IGF_SOURCE,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: {
        version_id: raw.version_id,
        version_number: raw.version_number,
        composition: null,
        omitted_null_keys: [],
      },
    });
  }
  const composition = raw.composition || null;
  const omitted = (composition && composition.omitted_null_keys) || [];
  const status =
    omitted.length > 0 ? DIRECTOR_IA_VERACITY.SOURCE_PARTIAL : DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  return sourceBlock({
    status,
    plant: basePlant,
    period,
    source: IGF_SOURCE,
    absence: omitted.length ? "omitted_null_keys" : null,
    error: null,
    payload: {
      version_id: raw.version_id,
      version_number: raw.version_number,
      composition,
      omitted_null_keys: omitted,
      null_is_not_zero: true,
    },
  });
}

function mapArrBlock(raw, plant, year, month) {
  const period = toYyyyMm(year, month);
  const basePlant = plant || emptyPlant();
  if (raw && raw.restricted) {
    return restrictedBlock(ARR_SOURCE, basePlant, period, raw.error);
  }
  if (!raw) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant: basePlant,
      period,
      source: ARR_SOURCE,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: { venta_ton: null, desc_kg: null },
    });
  }
  if (raw.load_error) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      plant: basePlant,
      period,
      source: ARR_SOURCE,
      absence: null,
      error: raw.load_error,
      error_kind: "TOOL_ERROR",
      payload: { venta_ton: null, desc_kg: null },
    });
  }
  const venta = raw.venta_ton;
  const desc = raw.desc_kg;
  const ventaOk = venta != null && Number.isFinite(Number(venta));
  const descOk = desc != null && Number.isFinite(Number(desc));
  let status = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  let absence = null;
  if (!ventaOk && !descOk) {
    status = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
    absence = "DATA_NOT_FOUND";
  } else if (!ventaOk || !descOk) {
    status = DIRECTOR_IA_VERACITY.SOURCE_PARTIAL;
    absence = "partial_null";
  }
  return sourceBlock({
    status,
    plant: basePlant,
    period,
    source: ARR_SOURCE,
    absence,
    error: null,
    payload: {
      venta_ton: ventaOk ? Number(venta) : null,
      desc_kg: descOk ? Number(desc) : null,
      null_is_not_zero: true,
    },
  });
}

function mapOperationalBlock(input, source, plant) {
  const period = input && input.period != null ? input.period : null;
  if (input && input.restricted) {
    return restrictedBlock(source, plant, period, input.error);
  }
  if (!input) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant,
      period,
      source,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: null,
    });
  }
  if (input.load_error) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      plant,
      period,
      source,
      absence: null,
      error: input.load_error,
      error_kind: "TOOL_ERROR",
      payload: null,
    });
  }
  if (input.not_found) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant,
      period,
      source,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: input.payload != null ? input.payload : null,
    });
  }
  return sourceBlock({
    status: DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
    plant,
    period,
    source,
    absence: null,
    error: null,
    payload: input.payload,
  });
}

function mapCommercialStateBlock(raw, plant) {
  if (raw && raw.restricted) {
    const period = raw.period != null ? raw.period : null;
    return restrictedBlock(CS_SOURCE, plant, period, raw.error);
  }
  if (!raw) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant,
      period: null,
      source: CS_SOURCE,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: null,
    });
  }
  if (raw.load_error) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      plant,
      period: raw.period != null ? raw.period : null,
      source: CS_SOURCE,
      absence: null,
      error: raw.load_error,
      error_kind: "TOOL_ERROR",
      payload: null,
    });
  }
  if (raw.not_found) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant,
      period: raw.period != null ? raw.period : null,
      source: CS_SOURCE,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: raw.payload != null ? raw.payload : { counts: {}, clients_shown: [] },
    });
  }
  return sourceBlock({
    status: DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
    plant,
    period: raw.period != null ? raw.period : null,
    source: CS_SOURCE,
    absence: null,
    error: null,
    payload: raw.payload,
  });
}

function kpiPeriodString(block) {
  if (!block || block.period == null) return null;
  if (typeof block.period === "string") return block.period;
  if (block.period.yyyy_mm) return String(block.period.yyyy_mm);
  return null;
}

function buildAlignment(sources) {
  const igfPeriod = kpiPeriodString(sources.igf);
  const arrPeriod = kpiPeriodString(sources.arr);
  const csPeriod = kpiPeriodString(sources.commercial_state);
  const kpiPresent = Boolean(igfPeriod && arrPeriod);
  const kpiSame = kpiPresent && igfPeriod === arrPeriod;
  const csComparable =
    !csPeriod ||
    sources.commercial_state.status === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED ||
    sources.commercial_state.status === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND ||
    sources.commercial_state.status === DIRECTOR_IA_VERACITY.SOURCE_ERROR;
  const csSame = csComparable || (igfPeriod && csPeriod === igfPeriod) || (arrPeriod && csPeriod === arrPeriod);
  const mismatch = (kpiPresent && !kpiSame) || (csPeriod && igfPeriod && csPeriod !== igfPeriod) || (csPeriod && arrPeriod && csPeriod !== arrPeriod);
  return {
    status: mismatch ? "mismatch" : "visible",
    igf_period: igfPeriod,
    arr_period: arrPeriod,
    commercial_state_period: csPeriod,
    ar_window: sources.action_register.period,
    dicf_window: sources.dicf.period,
    bitacora_window: sources.bitacora.period,
    silently_aligned: false,
    heterogeneous_windows: true,
    note: mismatch
      ? "Los cortes YYYY-MM de IGF/ARR/CS no coinciden. No se alinearon en silencio. AR/DICF/bitácora usan otras ventanas."
      : "Cada fuente conserva su corte. AR/DICF/bitácora no son el mismo mes que IGF/ARR/CS.",
  };
}

function collectLimitations(sources, alignment) {
  const out = [
    "no_causalidad",
    "no_fusion_entre_fuentes",
    "null_no_es_cero",
    "chat_legado_no_ies_no_n5",
    "no_m9",
    "heterogeneous_windows",
  ];
  if (alignment.status === "mismatch") out.push("period_mismatch");
  for (const key of ["action_register", "dicf", "bitacora", "arr", "igf", "commercial_state"]) {
    const st = sources[key] && sources[key].status;
    if (st && st !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE) out.push(`${key}_${st}`);
  }
  return out;
}

function computeAssemblyStatus(sources) {
  const keys = ["action_register", "dicf", "bitacora", "arr", "igf", "commercial_state"];
  const statuses = keys.map((k) => sources[k] && sources[k].status);
  if (statuses.every((s) => s === DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE)) return "complete";
  const usable = statuses.filter(
    (s) => s === DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE || s === DIRECTOR_IA_VERACITY.SOURCE_PARTIAL
  );
  if (usable.length === 0) return "empty";
  return "partial";
}

function assemblePlantDiagnosisEvidence(input) {
  const plant = input.plant || emptyPlant(input.planta_id);
  const year = input.year;
  const month = input.month;
  const action_register = mapOperationalBlock(input.actionRegisterRaw, AR_SOURCE, plant);
  const dicf = mapOperationalBlock(input.dicfRaw, DICF_SOURCE, plant);
  const bitacora = mapOperationalBlock(input.bitacoraRaw, BITACORA_SOURCE, plant);
  const arr = mapArrBlock(input.arrRaw, plant, year, month);
  const igf = mapIgfBlock(input.igfRaw, plant, year, month);
  const commercial_state = mapCommercialStateBlock(input.commercialStateRaw, plant);
  const sources = { action_register, dicf, bitacora, arr, igf, commercial_state };
  const alignment = buildAlignment(sources);
  const limitations = collectLimitations(sources, alignment);
  const assembly_status = computeAssemblyStatus(sources);
  return {
    ok: true,
    abort: false,
    semantic_class: SEMANTIC_CLASS,
    plant,
    requested_period: {
      igf_arr_yyyy_mm: toYyyyMm(year, month),
    },
    sources,
    alignment,
    limitations,
    assembly_status,
  };
}

function normalizeEstadoKey(estado) {
  const s = String(estado || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (!s) return "sin_estado";
  if (s.includes("dejaron")) return "dejaron";
  if (s.includes("disminuy")) return "disminuyeron";
  if (s.includes("aument")) return "aumentaron";
  if (s === "nuevo" || s.startsWith("nuevo")) return "nuevos";
  return s;
}

function summarizeCommercialStateRows(rows, plantCode, year, month) {
  const counts = {};
  const byKey = {};
  for (const row of rows || []) {
    const key = normalizeEstadoKey(row.estado);
    counts[key] = (counts[key] || 0) + 1;
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push({
      cliente: row.cliente_norm != null ? String(row.cliente_norm) : null,
      estado: row.estado != null ? String(row.estado) : null,
      canal: row.canal != null ? String(row.canal) : null,
      subcanal: row.subcanal != null ? String(row.subcanal) : null,
      es_nuevo: Boolean(row.es_nuevo),
      es_recuperable: Boolean(row.es_recuperable),
    });
  }
  const clients_shown = [];
  const dejaron = (byKey.dejaron || []).slice(0, CS_DEJARON_LIMIT);
  for (const c of dejaron) clients_shown.push({ category: "dejaron", ...c });
  for (const key of ["disminuyeron", "aumentaron", "nuevos"]) {
    for (const c of (byKey[key] || []).slice(0, CS_OTHER_LIMIT)) {
      clients_shown.push({ category: key, ...c });
    }
  }
  return {
    period: {
      kind: "materialized_cache",
      yyyy_mm: toYyyyMm(year, month),
      year,
      month,
      plant_code: plantCode || null,
    },
    payload: {
      materialized: true,
      live_compute: false,
      counts,
      clients_shown,
      row_count: (rows || []).length,
      null_is_not_zero: true,
    },
  };
}

async function queryPlantCodeSelectOnly(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [
    plantaId,
  ]);
  const planta = r.rows[0] || null;
  if (!planta) return { plant: emptyPlant(plantaId), plantCode: null };
  const nombre = String(planta.nombre || "").trim();
  const clave = String(planta.clave || "").trim();
  const plant = {
    planta_id: Number(plantaId),
    planta_nombre: nombre || clave || null,
    plant_code: null,
  };
  const r1 = await client.query(
    `SELECT plant_code
       FROM arr.dicf_cliente_mes
      WHERE ($1 <> '' AND UPPER(TRIM(plant_code)) = UPPER(TRIM($1)))
         OR ($2 <> '' AND UPPER(TRIM(plant_code)) = UPPER(TRIM($2)))
      ORDER BY year DESC, month DESC
      LIMIT 1`,
    [nombre, clave]
  );
  let plantCode = r1.rows[0] && r1.rows[0].plant_code ? String(r1.rows[0].plant_code) : null;
  if (!plantCode) {
    const r2 = await client.query(
      `SELECT plant_code
         FROM arr.provincia_plants
        WHERE ($1 <> '' AND UPPER(TRIM(plant_code)) = UPPER(TRIM($1)))
           OR ($2 <> '' AND UPPER(TRIM(plant_code)) = UPPER(TRIM($2)))
        LIMIT 1`,
      [nombre, clave]
    );
    plantCode = r2.rows[0] && r2.rows[0].plant_code ? String(r2.rows[0].plant_code) : nombre || clave || null;
  }
  plant.plant_code = plantCode;
  return { plant, plantCode };
}

async function defaultLoadCommercialStateSelect(client, plantaId) {
  const { plant, plantCode } = await queryPlantCodeSelectOnly(client, plantaId);
  if (!plantCode) {
    return { not_found: true, period: null, payload: { counts: {}, clients_shown: [] }, plant };
  }
  const latest = await client.query(
    `SELECT year, month
       FROM arr.dicf_cliente_mes
      WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1))
      ORDER BY year DESC, month DESC
      LIMIT 1`,
    [plantCode]
  );
  if (!latest.rows[0]) {
    return {
      not_found: true,
      period: { kind: "materialized_cache", yyyy_mm: null, plant_code: plantCode },
      payload: { counts: {}, clients_shown: [] },
      plant,
    };
  }
  const year = Number(latest.rows[0].year);
  const month = Number(latest.rows[0].month);
  const r = await client.query(
    `SELECT plant_code, year, month, cliente_norm, canal, subcanal, estado,
            window_days, last_date, kg_mes_real, kg_mes_forecast, ingreso_forecast,
            es_nuevo, es_recuperable
       FROM arr.dicf_cliente_mes
      WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1))
        AND year = $2 AND month = $3
      ORDER BY cliente_norm ASC`,
    [plantCode, year, month]
  );
  const rows = r.rows || [];
  if (!rows.length) {
    return {
      not_found: true,
      period: { kind: "materialized_cache", yyyy_mm: toYyyyMm(year, month), year, month, plant_code: plantCode },
      payload: { counts: {}, clients_shown: [] },
      plant,
    };
  }
  const summarized = summarizeCommercialStateRows(rows, plantCode, year, month);
  return { ...summarized, plant };
}

async function defaultLoadActionRegister(client, plantaId, ensureFn) {
  const ensure = typeof ensureFn === "function" ? ensureFn : async () => {};
  const board = await buildActionRegisterBoardPayload(client, plantaId, {
    ensureActionRegisterTables: ensure,
    includeDicf: false,
    includeNotes: false,
  });
  const asOf = todayYmdMexicoCity();
  const latest = (board.revisions || [])[0];
  const period = {
    kind: "snapshot",
    as_of: asOf,
    latest_revision_date: latest && latest.revision_date != null ? String(latest.revision_date).slice(0, 10) : null,
  };
  const roleMap = await loadUsuarioRolesByIds(client, collectResponsableUsuarioIds(board));
  const summary = summarizeActionRegisterBoard(board);
  const payload = {
    summary,
    top_overdue: summarizeTopOverdueActions(board, { roleMap, limit: AR_OVERDUE_LIMIT }),
    responsables: summarizeActionRegisterResponsables(board, { roleMap, limit: AR_RESPONSABLES_LIMIT }),
    notes_excluded: true,
  };
  return { period, payload };
}

async function defaultLoadDicf(client, plantaId) {
  const details = await summarizeDicfContext(client, plantaId, { limit: DICF_LIMIT });
  const period = { kind: "action_dates", window: "acciones registradas (no mes único)" };
  if (!details.length) {
    return { not_found: true, period, payload: { actions: [] } };
  }
  const actions = details.map((row) => ({
    public_code: row.public_code,
    cliente_nombre: row.cliente_nombre,
    descripcion: row.descripcion,
    estado: row.estado,
    cerrada: row.cerrada,
    fecha_compromiso: row.fecha_compromiso,
    responsable: row.responsable,
    resultado_cierre: row.resultado_cierre,
  }));
  return { period, payload: { actions, limit: DICF_LIMIT, historial_omitted: true } };
}

async function defaultLoadBitacora(client, plantaId) {
  const rows = await loadBitacoraForChat(client, plantaId, BITACORA_LIMIT);
  const period = {
    kind: "bitacora_window",
    months: CHAT_CONTEXT_MONTH_WINDOW,
  };
  if (!rows.length) {
    return { not_found: true, period, payload: { sessions: [] } };
  }
  const sessions = rows.slice(0, BITACORA_LIMIT).map((row) => ({
    fecha: row.fecha,
    tipo: row.tipo,
    titulo: row.titulo,
    resumen_ia: row.resumen_ia ? String(row.resumen_ia).slice(0, 400) : "",
  }));
  return { period, payload: { sessions, limit: BITACORA_LIMIT, contenido_omitted: true } };
}

async function loadPlantDiagnosisForChat(pool, plantaId, req, opts = {}) {
  const question =
    opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const access = assertOperationalPlantAccess(auth, plantaId);
  if (!access.ok) {
    return {
      ok: false,
      abort: true,
      status: access.status || 403,
      code: access.code || DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: access.error || "Sin acceso a esta planta",
    };
  }

  const plantFallback = emptyPlant(plantaId);
  const gaRestricted = isGaFinancialRestricted(auth);
  const loadIgfArr = opts.loadIgfArrBlocks || loadIgfArrSourceBlocksForChat;
  const loadAr = opts.loadActionRegister;
  const loadDicf = opts.loadDicf;
  const loadBitacora = opts.loadBitacora;
  const loadCs = opts.loadCommercialStateSelect;

  let actionRegisterRaw;
  let dicfRaw;
  let bitacoraRaw;
  let commercialStateRaw;
  let igfRaw;
  let arrRaw;
  let plant = plantFallback;
  let year;
  let month;

  const runOperational = async (client) => {
    try {
      actionRegisterRaw = loadAr
        ? await loadAr(pool, plantaId, req, { question, client })
        : await defaultLoadActionRegister(client, plantaId, opts.ensureActionRegisterTables);
    } catch (e) {
      actionRegisterRaw = { load_error: e && e.message ? String(e.message) : "Error Action Register" };
    }
    try {
      dicfRaw = loadDicf
        ? await loadDicf(pool, plantaId, req, { question, client })
        : await defaultLoadDicf(client, plantaId);
    } catch (e) {
      dicfRaw = { load_error: e && e.message ? String(e.message) : "Error DICF" };
    }
    try {
      bitacoraRaw = loadBitacora
        ? await loadBitacora(pool, plantaId, req, { question, client })
        : await defaultLoadBitacora(client, plantaId);
    } catch (e) {
      bitacoraRaw = { load_error: e && e.message ? String(e.message) : "Error bitácora" };
    }
    if (gaRestricted) {
      commercialStateRaw = {
        restricted: true,
        error: "GA no tiene acceso a KPIs financieros.",
      };
    } else {
      try {
        commercialStateRaw = loadCs
          ? await loadCs(pool, plantaId, req, { question, client })
          : await defaultLoadCommercialStateSelect(client, plantaId);
        if (commercialStateRaw && commercialStateRaw.plant) {
          plant = { ...plant, ...commercialStateRaw.plant };
        }
      } catch (e) {
        commercialStateRaw = { load_error: e && e.message ? String(e.message) : "Error commercial_state" };
      }
    }
  };

  if (loadAr && loadDicf && loadBitacora && (gaRestricted || loadCs)) {
    await runOperational(null);
  } else if (!pool) {
    await runOperational(null);
  } else {
    const client = await pool.connect();
    try {
      await runOperational(client);
    } finally {
      client.release();
    }
  }

  if (gaRestricted) {
    igfRaw = { restricted: true, error: "GA no tiene acceso a KPIs financieros." };
    arrRaw = { restricted: true, error: "GA no tiene acceso a KPIs financieros." };
  } else {
    const igfArr = await loadIgfArr(pool, plantaId, req, question);
    if (igfArr && igfArr.abort) {
      const err = igfArr.error || "SOURCE_RESTRICTED";
      igfRaw = { restricted: true, error: err };
      arrRaw = { restricted: true, error: err };
      year = igfArr.year;
      month = igfArr.month;
      if (igfArr.plant) plant = { ...plant, ...igfArr.plant };
    } else if (igfArr && igfArr.ok === false && !igfArr.abort) {
      igfRaw = igfArr.igf || { load_error: igfArr.error || "Error IGF" };
      arrRaw = igfArr.arr || { load_error: igfArr.error || "Error ARR" };
      year = igfArr.year;
      month = igfArr.month;
      if (igfArr.plant) plant = { ...plant, ...igfArr.plant };
    } else {
      igfRaw = igfArr && igfArr.igf;
      arrRaw = igfArr && igfArr.arr;
      year = igfArr && igfArr.year;
      month = igfArr && igfArr.month;
      if (igfArr && igfArr.plant) plant = { ...plant, ...igfArr.plant };
    }
  }

  plant.planta_id = Number(plantaId);
  return assemblePlantDiagnosisEvidence({
    planta_id: plantaId,
    plant,
    year,
    month,
    actionRegisterRaw,
    dicfRaw,
    bitacoraRaw,
    arrRaw,
    igfRaw,
    commercialStateRaw,
  });
}

function statusLine(block) {
  const bits = [`status=${block.status}`];
  if (block.absence) bits.push(`absence=${block.absence}`);
  if (block.error) bits.push(`error=${block.error}`);
  return bits.join(" | ");
}

function formatPeriod(period) {
  if (period == null) return "—";
  if (typeof period === "string") return period;
  if (period.yyyy_mm) return `${period.kind || "period"} ${period.yyyy_mm}`;
  if (period.kind === "snapshot") {
    return `snapshot as_of=${period.as_of || "—"} revision=${period.latest_revision_date || "—"}`;
  }
  if (period.kind) return `${period.kind}${period.months != null ? ` months=${period.months}` : ""}`;
  return JSON.stringify(period);
}

function formatArPayload(block) {
  const p = block.payload;
  if (!p) return ["(sin payload)"];
  const s = p.summary || {};
  const lines = [
    `open=${s.open != null ? s.open : "—"} closed=${s.closed != null ? s.closed : "—"} overdue=${s.overdue != null ? s.overdue : "—"}`,
    `notas M12 excluidas. 0 es conteo observado, no ausencia.`,
    "TOP VENCIDAS:",
  ];
  const top = Array.isArray(p.top_overdue) ? p.top_overdue : [];
  if (!top.length) lines.push("(sin vencidas válidas en este snapshot)");
  for (const a of top) {
    lines.push(
      `- ${a.titulo || "(sin título)"} | tema=${a.tema || "—"} | días=${a.dias_vencido ?? "—"} | resp=${a.responsable || "—"}`
    );
  }
  lines.push("RESPONSABLES:");
  const resp = Array.isArray(p.responsables) ? p.responsables : [];
  if (!resp.length) lines.push("(sin responsables en abiertas)");
  for (const r of resp) {
    lines.push(`- ${r.name} | open=${r.open_count} overdue=${r.overdue_count}`);
  }
  return lines;
}

function formatDicfPayload(block) {
  const p = block.payload;
  if (!p) return ["(sin payload)"];
  const actions = Array.isArray(p.actions) ? p.actions : [];
  const lines = [`acciones=${actions.length} (límite ${p.limit || DICF_LIMIT}). historial omitido.`];
  if (!actions.length) lines.push("(sin acciones DICF)");
  for (const a of actions) {
    lines.push(
      `- ${a.public_code || "—"} | ${a.cliente_nombre || "—"} | ${a.estado || "—"} | resp=${a.responsable || "—"} | ${String(a.descripcion || "").slice(0, 120)}`
    );
  }
  return lines;
}

function formatBitacoraPayload(block) {
  const p = block.payload;
  if (!p) return ["(sin payload)"];
  const sessions = Array.isArray(p.sessions) ? p.sessions : [];
  const lines = [`sesiones=${sessions.length}. contenido crudo omitido.`];
  if (!sessions.length) lines.push("(sin bitácora en ventana)");
  for (const s of sessions) {
    lines.push(`- ${s.fecha || "—"} | ${s.tipo || "—"} | ${s.titulo || "—"} | ${String(s.resumen_ia || "").slice(0, 180)}`);
  }
  return lines;
}

function formatCsPayload(block) {
  const p = block.payload;
  if (!p) return ["(sin payload)"];
  const lines = [
    `materialized=${p.materialized === true} live_compute=${p.live_compute === true}`,
    `counts=${JSON.stringify(p.counts || {})} rows=${p.row_count != null ? p.row_count : "—"}`,
    "clientes mostrados (estado almacenado; no recálculo):",
  ];
  const shown = Array.isArray(p.clients_shown) ? p.clients_shown : [];
  if (!shown.length) lines.push("(sin clientes materializados)");
  for (const c of shown) {
    lines.push(`- [${c.category}] ${c.cliente || "—"} | estado=${c.estado || "—"}`);
  }
  return lines;
}

function formatIgfPayload(block) {
  const p = block.payload;
  if (!p) return ["(sin payload)"];
  const lines = [
    `periodo=${block.period || "—"} | version=${p.version_id != null ? `v${p.version_number} id ${p.version_id}` : "—"}`,
    "null no es 0. COMPOSICIÓN != CAUSALIDAD. No es M9.",
  ];
  const comp = p.composition;
  if (!comp || comp.ok !== true || !Array.isArray(comp.lines) || !comp.lines.length) {
    lines.push("sin líneas de composición observadas.");
  } else {
    for (const line of comp.lines.slice(0, IGF_COMPOSITION_LINES)) {
      lines.push(`- ${line.line_key}: valor almacenado ${line.value} ${line.unit || ""}`.trim());
    }
    if (Array.isArray(p.omitted_null_keys) && p.omitted_null_keys.length) {
      lines.push(`omitted_null_keys (no son cero): ${p.omitted_null_keys.join(", ")}`);
    }
  }
  return lines;
}

function formatArrPayload(block) {
  const p = block.payload || {};
  return [
    `periodo=${block.period || "—"}`,
    `venta_ton=${p.venta_ton == null ? "null" : p.venta_ton}`,
    `desc_kg=${p.desc_kg == null ? "null" : p.desc_kg}`,
    "ARR proyección/corte de planta. No es delta M9. null no es 0.",
  ];
}

function formatPlantDiagnosisContext(assembled) {
  const s = assembled.sources;
  const plant = assembled.plant || {};
  const align = assembled.alignment || {};
  const lines = [
    "---",
    "BLOQUES DE PLANTA SEPARADOS (plant_diagnosis)",
    `Planta: ${plant.planta_nombre || "—"} | planta_id=${plant.planta_id || "—"} | ARR code=${plant.plant_code || "—"}`,
    `assembly_status=${assembled.assembly_status} (complete = las seis SOURCE_AVAILABLE; si no, no es diagnóstico completo)`,
    `alignment.status=${align.status} | IGF=${align.igf_period || "—"} | ARR=${align.arr_period || "—"} | CS=${align.commercial_state_period || "—"}`,
    `alignment.note: ${align.note}`,
    `limitations: ${(assembled.limitations || []).join(", ")}`,
    "",
    `BLOQUE action_register | source=${s.action_register.source} | period=${formatPeriod(s.action_register.period)} | ${statusLine(s.action_register)}`,
    ...formatArPayload(s.action_register),
    "",
    `BLOQUE dicf | source=${s.dicf.source} | period=${formatPeriod(s.dicf.period)} | ${statusLine(s.dicf)}`,
    ...formatDicfPayload(s.dicf),
    "",
    `BLOQUE commercial_state | source=${s.commercial_state.source} | period=${formatPeriod(s.commercial_state.period)} | ${statusLine(s.commercial_state)}`,
    ...formatCsPayload(s.commercial_state),
    "",
    `BLOQUE bitacora | source=${s.bitacora.source} | period=${formatPeriod(s.bitacora.period)} | ${statusLine(s.bitacora)}`,
    ...formatBitacoraPayload(s.bitacora),
    "",
    `BLOQUE arr | source=${s.arr.source} | plant=${(s.arr.plant && s.arr.plant.planta_nombre) || "—"} | ${statusLine(s.arr)}`,
    ...formatArrPayload(s.arr),
    "",
    `BLOQUE igf | source=${s.igf.source} | plant=${(s.igf.plant && s.igf.plant.planta_nombre) || "—"} | ${statusLine(s.igf)}`,
    ...formatIgfPayload(s.igf),
    "",
    "Fin de bloques. No inventes cifras. No afirmes causa. No uses M9.",
  ];
  return lines.join("\n");
}

function buildPlantDiagnosisPrompt(assembled, question) {
  const context = formatPlantDiagnosisContext(assembled);
  const systemPrompt = [
    "Eres Director IA. Responde en español, breve y ejecutivo.",
    PLANT_DIAGNOSIS_SYSTEM_ADDENDUM,
  ].join("\n");
  const userContent = [
    context,
    "",
    "Pregunta del ejecutivo:",
    String(question || ""),
    "",
    "Resume hechos por bloque. Señala riesgos observables y tensiones sin causalidad. Declara limitaciones, SOURCE_RESTRICTED y period mismatch si existen.",
  ].join("\n");
  return { systemPrompt, userContent, context };
}

function listedSources() {
  return [AR_SOURCE, DICF_SOURCE, BITACORA_SOURCE, ARR_SOURCE, IGF_SOURCE, CS_SOURCE];
}

function buildPlantDiagnosisChatResult(assembled, opts = {}) {
  const planta_id =
    opts.planta_id != null ? Number(opts.planta_id) : assembled.plant && assembled.plant.planta_id;
  const openaiCalled = opts.openai_called !== false;
  return {
    ok: true,
    answer: opts.answer || "",
    sources: listedSources(),
    context_meta: {
      mode: "plant_diagnosis",
      requested_domain: "plant_diagnosis",
      openai_called: openaiCalled,
      openai_call_count: openaiCalled ? 1 : 0,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      assembly_status: assembled.assembly_status,
      alignment: assembled.alignment,
      limitations: assembled.limitations,
      prompt_mode: "plant_diagnosis",
      focus_type: "plant_diagnosis",
      igf_arr_annex: false,
      ies_runtime: false,
      reasoning_engine: false,
      m9_included: false,
    },
    plant_diagnosis: {
      semantic_class: SEMANTIC_CLASS,
      plant: assembled.plant,
      requested_period: assembled.requested_period,
      sources: assembled.sources,
      alignment: assembled.alignment,
      limitations: assembled.limitations,
      assembly_status: assembled.assembly_status,
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  AR_SOURCE,
  DICF_SOURCE,
  BITACORA_SOURCE,
  ARR_SOURCE,
  IGF_SOURCE,
  CS_SOURCE,
  PLANT_DIAGNOSIS_SYSTEM_ADDENDUM,
  toYyyyMm,
  assertOperationalPlantAccess,
  assemblePlantDiagnosisEvidence,
  loadPlantDiagnosisForChat,
  formatPlantDiagnosisContext,
  buildPlantDiagnosisPrompt,
  buildPlantDiagnosisChatResult,
  summarizeCommercialStateRows,
};
