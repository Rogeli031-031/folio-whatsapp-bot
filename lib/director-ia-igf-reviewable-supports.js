"use strict";

/**
 * Director IA — first slice C: Folios reviewable (reglas reales de cancelación)
 * + contrafactual IGF overlay live, read-only, en memoria.
 * No writes. No HTTP. No cheques. No ahorro realizado.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { currentYearMonthCdmx } = require("./director-ia-mejora-continua");
const { resolveYearMonthFromQuestion, loadIgfArrSourceBlocksForChat } = require("./director-ia-igf-arr");
const {
  ESTADOS,
  getEtapaVisibleLabel,
  assertFolioStatusAccess,
  requirePlantaId,
} = require("./director-ia-m2-folio-status");
const { getPlantaIdsEquivalentesForPendientes } = require("./director-ia-m3-plantas-kpis-proyectos");
const usuarioPermisos = require("./usuario-permisos");

const SEMANTIC_CLASS = "igf_reviewable_supports";
const SOURCE_FOLIOS = "public.folios";
const SOURCE_IGF = "igf.compromiso_lines + overlay live GET dashboard";
const RECORD_LIMIT = 40;

const NON_CANCELLABLE_STATES = Object.freeze([
  ESTADOS.PAGADO,
  ESTADOS.CERRADO,
  ESTADOS.COMPROBACIONES,
  ESTADOS.EVIDENCIAS,
]);

const ESTADOS_CARRO_COMPRA = Object.freeze([
  ESTADOS.APROBADO_ZP,
  ESTADOS.LISTO_PARA_PROGRAMACION,
  ESTADOS.SELECCIONADO_SEMANA,
]);

const ESTADOS_CHEQUE_GENERADO = Object.freeze([ESTADOS.CHEQUE_GENERADO, ESTADOS.SOLICITANDO_PAGO]);

/** Misma lista que server.js ESTADOS_HASTA_CHEQUE. */
const ESTADOS_HASTA_CHEQUE = Object.freeze([
  ...ESTADOS_CARRO_COMPRA,
  ESTADOS.CUENTA_FONDOS,
  ...ESTADOS_CHEQUE_GENERADO,
]);

const ESTADOS_APROB_ZP = Object.freeze([ESTADOS.PENDIENTE_APROB_ZP, ESTADOS.CANCELACION_SOLICITADA]);

const HYPOTHETICAL_LABEL = "ESCENARIO HIPOTÉTICO";

const SYSTEM_ADDENDUM = [
  "EVIDENCIA DE APOYOS REVIEWABLE (chat legado; no es IES; no es Recommendation N5).",
  "REVIEWABLE = cancelable bajo las reglas actuales de cancelación. No usar atajo de depósito.",
  "No cancelable operacional ≠ materializado contable ≠ ahorro realizado.",
  "Si hay ESCENARIO HIPOTÉTICO, es matemática live del overlay IGF, no un forecast oficial ni un cambio real.",
  "Prohibido: ahorrarías, el IGF real mejorará, impacto de caja, debes cancelarlos, materializado contable sin prueba.",
  "Lenguaje seguro: “Si estos folios dejaran de formar parte del cálculo bajo las mismas reglas actuales, el escenario matemático sería…”.",
  "Ordenar por importe es para revisión humana, no una recomendación de cancelar.",
  "Si falta vínculo folio→cliente/venta/comentarios, di exactamente qué información falta. No inventes riesgo comercial.",
  "Director IA es read-only: no cancela, no solicita cancelación, no mueve, no aprueba, no edita.",
].join(" ");

function normalizeQ(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYyyyMm(year, month) {
  return `${Number(year)}-${pad2(Number(month))}`;
}

function num(v) {
  return v != null && Number.isFinite(Number(v)) ? Number(v) : 0;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function normalizeEstatus(estatus) {
  return String(estatus || "").trim().toUpperCase();
}

/**
 * Preguntas de este slice. No cheques/póliza. No comparativo M4.
 * @param {string} question
 */
function isIgfReviewableSupportsQuestion(question) {
  const q = normalizeQ(question);
  if (!q) return false;
  if (/\bcheque\b/.test(q) || /\bpoliza\b/.test(q) || /\bpolizas\b/.test(q)) return false;
  if (/\bclasificacion\b/.test(q) && /\bapoyos?\b/.test(q)) return false;
  if (/\bcomparativo\b/.test(q) && /\b(clasificacion|apoyos)\b/.test(q)) return false;
  if (/\bmatriz\b/.test(q) && /\bclasificacion\b/.test(q)) return false;

  const hasApoyos = /\bapoyos?\b/.test(q);
  const hasFolio = /\bfolios?\b/.test(q);
  const cutVerb =
    /\brecortar\b/.test(q) ||
    /\bdetener\b/.test(q) ||
    /\bcancel/.test(q) ||
    /\bquitar\b/.test(q);
  if (cutVerb && (hasApoyos || hasFolio)) return true;
  if (hasApoyos && (/\brevisar\b/.test(q) || /\brevisarias\b/.test(q))) return true;
  if (/\btodavia\b/.test(q) && /\b(detener|cancel)/.test(q)) return true;
  if (/\bya\s+no\b/.test(q) && /\bcancel/.test(q)) return true;
  if (
    (/\bdeposito\b/.test(q) || /\bdepositaron\b/.test(q) || /\bcierre\b/.test(q)) &&
    (hasApoyos ||
      hasFolio ||
      /\bcuales\b/.test(q) ||
      /\btodavia\b/.test(q) ||
      /\bya\b/.test(q) ||
      /\bsuman\b/.test(q))
  ) {
    return true;
  }
  if (/\bigf\b/.test(q) && cutVerb) return true;
  if (/\bigf\b/.test(q) && hasApoyos) return true;
  if (/\briesgo\b/.test(q) && (cutVerb || /\besos\b/.test(q) || hasApoyos)) return true;
  if (/\brevisarias\s+primero\b/.test(q)) return true;
  return false;
}

function wantsCommercialRisk(question) {
  const q = normalizeQ(question);
  return /\briesgo\b/.test(q);
}

function wantsReviewFirst(question) {
  const q = normalizeQ(question);
  return /\brevisarias\s+primero\b/.test(q) || (/\bprimero\b/.test(q) && /\brevis/.test(q));
}

function wantsCounterfactual(question) {
  const q = normalizeQ(question);
  if (/\bigf\b/.test(q) && (/\bcancel/.test(q) || /\bquitar\b/.test(q) || /\brecortar\b/.test(q))) return true;
  if (/\bquedaria\b/.test(q) && /\bigf\b/.test(q)) return true;
  if (/\befecto\b/.test(q) && /\bigf\b/.test(q)) return true;
  return false;
}

/**
 * Misma semántica de bloqueo de estatus que la cancelación directa del dashboard.
 * El rol no cambia el conjunto; solo quién puede invocar el endpoint.
 */
function classifyCancellationEligibility(estatus) {
  const s = normalizeEstatus(estatus);
  if (s === ESTADOS.CANCELADO) {
    return {
      group: "excluded",
      cancelable_under_current_rules: false,
      reason: "CANCELADO está fuera del conjunto reviewable.",
    };
  }
  if (NON_CANCELLABLE_STATES.includes(s)) {
    return {
      group: "not_cancellable",
      cancelable_under_current_rules: false,
      reason: "Ya no cancelable bajo reglas actuales (PAGADO/CERRADO/COMPROBACIONES/EVIDENCIAS).",
    };
  }
  return {
    group: "reviewable",
    cancelable_under_current_rules: true,
    reason: "La operación de cancelación actual acepta este estatus (no está en el bloqueo de 4 estados).",
  };
}

/** Misma exclusión que server.js SQL_WHERE_IGF_EXCLUYE_FOLIOS_CATEGORIA. */
function igfCategoryExcludedFromFolioCubes(categoria, subcategoria) {
  const cat = String(categoria || "").trim().toUpperCase();
  const sub = String(subcategoria || "").trim().toUpperCase();
  if (!cat) {
    return sub === "COMISIONES";
  }
  if (cat === "INVERSIONES" || cat === "DYO" || cat === "COMISIONES") return true;
  if (cat.includes("DERECHOS") || cat.includes("OBLIGACIONES")) return true;
  if (sub === "COMISIONES") return true;
  return false;
}

function isInversionesCategory(categoria) {
  return String(categoria || "").trim().toUpperCase() === "INVERSIONES";
}

function categoryFeedsIgfSupportCalc(categoria, subcategoria) {
  if (isInversionesCategory(categoria)) return true;
  return !igfCategoryExcludedFromFolioCubes(categoria, subcategoria);
}

function igfFolioBucket(estatus, categoria, subcategoria, isMesActual) {
  const s = normalizeEstatus(estatus);
  if (s === ESTADOS.CANCELADO) return "none";
  if (isInversionesCategory(categoria)) {
    return isMesActual ? "inversiones" : "none";
  }
  if (igfCategoryExcludedFromFolioCubes(categoria, subcategoria)) return "none";
  if (ESTADOS_APROB_ZP.includes(s)) return "aprob_zp";
  if (ESTADOS_HASTA_CHEQUE.includes(s)) return "carro";
  if (s === ESTADOS.PAGADO || s === ESTADOS.CERRADO || s === ESTADOS.COMPROBACIONES || s === ESTADOS.EVIDENCIAS) {
    return "deposito_cierre";
  }
  return "none";
}

/**
 * Copia exacta de server.js recalcularUtilYResultado.
 * @param {object} row
 */
function recalcularUtilYResultado(row) {
  const n = (v) => (v != null && Number.isFinite(Number(v)) ? Number(v) : 0);
  const margen = n(row.margen_kg);
  const comDesc = n(row.com_desc_kg);
  const impuesto = n(row.impuesto_kg);
  const hgKg = n(row.hg_kg);
  const bancosPlanta = n(row.bancos_planta_kg);
  const provisionPlanta = n(row.provision_planta_kg);
  const presupuesto = n(row.presupuesto_kg);
  const foliosZP = n(row.folios_aprob_zp_kg);
  const foliosCarro = n(row.folios_carro_kg);
  const depositoCierreKg = n(row.deposito_cierre_kg);
  const ventaTon = n(row.venta_ton);
  const ventaKg = ventaTon * 1000;
  const gtosCorp = n(row.gtos_apoyos_corp_kg);
  const bancosCorp = n(row.bancos_corp_kg);
  const otrosProg = n(row.otros_programas_kg);
  const inversiones = n(row.inversiones_kg);

  const util_oper_kg =
    margen +
    comDesc +
    depositoCierreKg -
    presupuesto -
    foliosZP -
    foliosCarro -
    impuesto -
    hgKg -
    bancosPlanta -
    provisionPlanta;
  const util_oper_importe = ventaKg > 0 ? util_oper_kg * ventaKg : 0;
  const resultado_final_kg = util_oper_kg - gtosCorp - bancosCorp - otrosProg - inversiones;
  const resultado_final_importe = ventaKg > 0 ? resultado_final_kg * ventaKg : 0;
  return { util_oper_kg, util_oper_importe, resultado_final_kg, resultado_final_importe };
}

function overlayFolioKgFromSums(ventaTon, plantaCount, sums, isMesActual, snapshotInversionesKg) {
  const ventaKg = (ventaTon != null ? Number(ventaTon) : 0) * 1000;
  const hasPlantas = Number(plantaCount) > 0;
  const zp = num(sums.aprob_zp);
  const carro = num(sums.carro);
  const depositoCierre = num(sums.deposito) + num(sums.cierre) + num(sums.comprobaciones) + num(sums.evidencias);
  const inversiones = num(sums.inversiones);

  const kgOrNull = (total) =>
    ventaKg > 0 && hasPlantas ? round2(total / ventaKg) : null;

  const deposito_cierre_kg = ventaKg > 0 && depositoCierre > 0 ? round2(-depositoCierre / ventaKg) : null;

  let inversiones_kg = snapshotInversionesKg != null ? Number(snapshotInversionesKg) : null;
  if (isMesActual) {
    inversiones_kg = ventaKg > 0 && inversiones > 0 ? round2(inversiones / ventaKg) : null;
  }

  return {
    venta_kg: ventaKg > 0 ? ventaKg : 0,
    folios_aprob_zp_kg: kgOrNull(zp),
    folios_carro_kg: kgOrNull(carro),
    deposito_cierre_kg,
    inversiones_kg,
  };
}

function applyGastoAndResult(baseRow, folioKg) {
  const n = (v) => (v != null && Number.isFinite(Number(v)) ? Number(v) : 0);
  const merged = {
    ...baseRow,
    folios_aprob_zp_kg: folioKg.folios_aprob_zp_kg,
    folios_carro_kg: folioKg.folios_carro_kg,
    deposito_cierre_kg: folioKg.deposito_cierre_kg,
    inversiones_kg: folioKg.inversiones_kg,
  };
  merged.gasto_kg = round2(
    n(merged.presupuesto_kg) +
      n(merged.folios_aprob_zp_kg) +
      n(merged.folios_carro_kg) +
      n(merged.deposito_cierre_kg)
  );
  const calc = recalcularUtilYResultado(merged);
  return {
    ...merged,
    util_oper_kg: round2(calc.util_oper_kg),
    util_oper_importe: round2(calc.util_oper_importe),
    resultado_final_kg: round2(calc.resultado_final_kg),
    resultado_final_importe: round2(calc.resultado_final_importe),
  };
}

function emptySums() {
  return {
    aprob_zp: 0,
    carro: 0,
    deposito: 0,
    cierre: 0,
    comprobaciones: 0,
    evidencias: 0,
    inversiones: 0,
  };
}

function addRowToSums(sums, row, isMesActual) {
  const importe = num(row.importe);
  const s = normalizeEstatus(row.estatus);
  if (s === ESTADOS.CANCELADO) return;
  if (isInversionesCategory(row.categoria)) {
    if (isMesActual) sums.inversiones += importe;
    return;
  }
  if (igfCategoryExcludedFromFolioCubes(row.categoria, row.subcategoria)) return;
  if (ESTADOS_APROB_ZP.includes(s)) sums.aprob_zp += importe;
  else if (ESTADOS_HASTA_CHEQUE.includes(s)) sums.carro += importe;
  else if (s === ESTADOS.PAGADO) sums.deposito += importe;
  else if (s === ESTADOS.CERRADO) sums.cierre += importe;
  else if (s === ESTADOS.COMPROBACIONES) sums.comprobaciones += importe;
  else if (s === ESTADOS.EVIDENCIAS) sums.evidencias += importe;
}

function pickIgfFields(row) {
  if (!row) return null;
  return {
    venta_ton: row.venta_ton != null ? Number(row.venta_ton) : null,
    margen_kg: row.margen_kg != null ? Number(row.margen_kg) : null,
    com_desc_kg: row.com_desc_kg != null ? Number(row.com_desc_kg) : null,
    presupuesto_kg: row.presupuesto_kg != null ? Number(row.presupuesto_kg) : null,
    impuesto_kg: row.impuesto_kg != null ? Number(row.impuesto_kg) : null,
    hg_kg: row.hg_kg != null ? Number(row.hg_kg) : null,
    bancos_planta_kg: row.bancos_planta_kg != null ? Number(row.bancos_planta_kg) : null,
    provision_planta_kg: row.provision_planta_kg != null ? Number(row.provision_planta_kg) : null,
    gtos_apoyos_corp_kg: row.gtos_apoyos_corp_kg != null ? Number(row.gtos_apoyos_corp_kg) : null,
    bancos_corp_kg: row.bancos_corp_kg != null ? Number(row.bancos_corp_kg) : null,
    otros_programas_kg: row.otros_programas_kg != null ? Number(row.otros_programas_kg) : null,
    inversiones_kg: row.inversiones_kg != null ? Number(row.inversiones_kg) : null,
    resultado_final_kg: row.resultado_final_kg != null ? Number(row.resultado_final_kg) : null,
    resultado_final_importe: row.resultado_final_importe != null ? Number(row.resultado_final_importe) : null,
    util_oper_kg: row.util_oper_kg != null ? Number(row.util_oper_kg) : null,
    empresa: row.empresa != null ? String(row.empresa) : null,
  };
}

function summarizeIgf(row) {
  if (!row) return null;
  return {
    venta_ton: row.venta_ton != null ? Number(row.venta_ton) : null,
    folios_aprob_zp_kg: row.folios_aprob_zp_kg != null ? Number(row.folios_aprob_zp_kg) : null,
    folios_carro_kg: row.folios_carro_kg != null ? Number(row.folios_carro_kg) : null,
    deposito_cierre_kg: row.deposito_cierre_kg != null ? Number(row.deposito_cierre_kg) : null,
    gasto_kg: row.gasto_kg != null ? Number(row.gasto_kg) : null,
    inversiones_kg: row.inversiones_kg != null ? Number(row.inversiones_kg) : null,
    util_oper_kg: row.util_oper_kg != null ? Number(row.util_oper_kg) : null,
    resultado_final_kg: row.resultado_final_kg != null ? Number(row.resultado_final_kg) : null,
    resultado_final_importe: row.resultado_final_importe != null ? Number(row.resultado_final_importe) : null,
  };
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "importe no registrado";
  return n.toFixed(2);
}

function inheritedYearMonth(opts) {
  const raw = opts && opts.inheritedYearMonth;
  if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(String(raw))) {
    const [y, m] = String(raw).split("-");
    return { year: Number(y), month: Number(m) };
  }
  const active = opts && opts.activeDate;
  if (active && /^\d{4}-\d{2}-\d{2}$/.test(String(active))) {
    const [y, m] = String(active).split("-");
    return { year: Number(y), month: Number(m) };
  }
  return null;
}

function resolveSliceYearMonth(question, opts = {}) {
  const inherited = inheritedYearMonth(opts);
  if (inherited) return inherited;
  const fallback = opts.nowYearMonth || currentYearMonthCdmx();
  return resolveYearMonthFromQuestion(question, fallback);
}

function projectRecord(row, isMesActual) {
  const eligibility = classifyCancellationEligibility(row.estatus);
  const bucket = igfFolioBucket(row.estatus, row.categoria, row.subcategoria, isMesActual);
  return {
    id: row.id != null ? Number(row.id) : null,
    numero_folio: row.numero_folio ? String(row.numero_folio) : null,
    folio_codigo: row.folio_codigo ? String(row.folio_codigo) : null,
    planta_id: row.planta_id != null ? Number(row.planta_id) : null,
    planta_nombre: row.planta_nombre || null,
    mes_cargo: row.mes_cargo || null,
    importe: row.importe != null ? Number(row.importe) : null,
    estatus: normalizeEstatus(row.estatus) || null,
    etapa_label: getEtapaVisibleLabel(row.estatus),
    categoria: row.categoria || null,
    subcategoria: row.subcategoria || null,
    concepto: row.concepto || null,
    beneficiario: row.beneficiario && row.beneficiario !== "—" ? row.beneficiario : row.beneficiario || null,
    group: eligibility.group,
    cancelable_under_current_rules: eligibility.cancelable_under_current_rules,
    reason: eligibility.reason,
    igf_bucket: bucket,
    source: SOURCE_FOLIOS,
  };
}

function derivedTotal(records) {
  let total = 0;
  let seen = false;
  for (const row of records || []) {
    if (row && row.importe != null && Number.isFinite(Number(row.importe))) {
      total += Number(row.importe);
      seen = true;
    }
  }
  return seen ? round2(total) : null;
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [
    plantaId,
  ]);
  return r.rows[0] || null;
}

function plantScopeIds(plantaId, resolveEquivalentIds) {
  const fn = resolveEquivalentIds || getPlantaIdsEquivalentesForPendientes;
  const ids = fn(plantaId) || [];
  return [...new Set(ids.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))];
}

async function queryReviewableSupportFolios(client, plantaId, mesCargo, opts = {}) {
  const ids = plantScopeIds(plantaId, opts.resolveEquivalentIds);
  const r = await client.query(
    `SELECT f.id,
            f.numero_folio,
            f.folio_codigo,
            f.planta_id,
            f.mes_cargo,
            f.importe,
            f.estatus,
            f.categoria,
            f.subcategoria,
            COALESCE(NULLIF(TRIM(f.descripcion), ''), NULLIF(TRIM(f.concepto), ''), '') AS concepto,
            f.beneficiario,
            COALESCE(f.solo_zp_ad, false) AS solo_zp_ad,
            p.nombre AS planta_nombre
       FROM public.folios f
       LEFT JOIN public.plantas p ON p.id = f.planta_id
      WHERE f.mes_cargo = $1
        AND f.planta_id = ANY($2::int[])
      ORDER BY f.importe DESC NULLS LAST, f.id`,
    [mesCargo, ids.length ? ids : [Number(plantaId)]]
  );
  return r.rows || [];
}

function sourceError(message, status = 500) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status,
    error: message || "Error de fuente de apoyos reviewable",
  };
}

async function loadIgfReviewableSupportsForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertFolioStatusAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const question = opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const ym = resolveSliceYearMonth(question, opts);
  const mesCargo = toYyyyMm(ym.year, ym.month);
  const nowYm = opts.nowYearMonth || currentYearMonthCdmx();
  const nowMes = toYyyyMm(nowYm.year, nowYm.month);
  const isMesActual = mesCargo === nowMes;
  const plantIds = plantScopeIds(plantaId, opts.resolveEquivalentIds);

  const queryFn = opts.queryFolios || queryReviewableSupportFolios;
  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;
  const loadIgf = opts.loadIgfBlocks || loadIgfArrSourceBlocksForChat;

  let planta;
  let rawRows;
  const injected = Boolean(opts.queryFolios && opts.resolvePlanta);
  if (injected) {
    planta = await resolvePlanta(null, Number(plantaId));
    rawRows = await queryFn(null, Number(plantaId), mesCargo, opts);
  } else {
    if (!pool) return sourceError("Pool no configurado");
    const client = await pool.connect();
    try {
      planta = await resolvePlanta(client, Number(plantaId));
      rawRows = await queryFn(client, Number(plantaId), mesCargo, opts);
    } catch (e) {
      return sourceError(e && e.message);
    } finally {
      client.release();
    }
  }

  const canSeeSoloZpAd = usuarioPermisos.authHasPermiso(auth, "acceso_ver_folios_solo_zp_ad");
  const visibleRows = (rawRows || []).filter((row) => {
    if (row.solo_zp_ad && !canSeeSoloZpAd) return false;
    return true;
  });

  const mathRows = (rawRows || []).filter((row) => normalizeEstatus(row.estatus) !== ESTADOS.CANCELADO);
  const listed = visibleRows
    .filter((row) => normalizeEstatus(row.estatus) !== ESTADOS.CANCELADO)
    .filter((row) => categoryFeedsIgfSupportCalc(row.categoria, row.subcategoria))
    .map((row) => projectRecord(row, isMesActual));

  const reviewable = listed.filter((r) => r.group === "reviewable");
  const notCancellable = listed.filter((r) => r.group === "not_cancellable");
  const reviewableInIgf = reviewable.filter((r) => r.igf_bucket && r.igf_bucket !== "none");

  const currentSums = emptySums();
  for (const row of mathRows) addRowToSums(currentSums, row, isMesActual);
  const hypoSums = emptySums();
  const reviewableIds = new Set(reviewable.map((r) => r.id));
  for (const row of mathRows) {
    const id = row.id != null ? Number(row.id) : null;
    if (id != null && reviewableIds.has(id)) continue;
    addRowToSums(hypoSums, row, isMesActual);
  }

  let igfBlocks = null;
  let igfError = null;
  try {
    igfBlocks = await loadIgf(pool, Number(plantaId), req, `IGF ${mesCargo}`);
  } catch (e) {
    igfError = (e && e.message) || "Error IGF";
  }

  const igfRestricted = Boolean(igfBlocks && (igfBlocks.abort || igfBlocks.status === 403));
  const snapshotRow = igfBlocks && igfBlocks.ok && igfBlocks.igf && igfBlocks.igf.row ? igfBlocks.igf.row : null;
  const baseFields = pickIgfFields(snapshotRow);
  const ventaTon = baseFields && baseFields.venta_ton != null ? baseFields.venta_ton : null;
  const missingDenominator = !(ventaTon != null && Number(ventaTon) > 0);

  let igfCurrent = null;
  let igfCounterfactual = null;
  let delta = null;
  if (baseFields && !igfRestricted && !missingDenominator) {
    const currentKg = overlayFolioKgFromSums(
      ventaTon,
      plantIds.length,
      currentSums,
      isMesActual,
      baseFields.inversiones_kg
    );
    const hypoKg = overlayFolioKgFromSums(
      ventaTon,
      plantIds.length,
      hypoSums,
      isMesActual,
      baseFields.inversiones_kg
    );
    const currentLive = applyGastoAndResult(baseFields, currentKg);
    const hypoLive = applyGastoAndResult(baseFields, hypoKg);
    igfCurrent = summarizeIgf(currentLive);
    igfCounterfactual = summarizeIgf(hypoLive);
    delta = {
      folios_aprob_zp_kg: round2(num(hypoLive.folios_aprob_zp_kg) - num(currentLive.folios_aprob_zp_kg)),
      folios_carro_kg: round2(num(hypoLive.folios_carro_kg) - num(currentLive.folios_carro_kg)),
      deposito_cierre_kg: round2(num(hypoLive.deposito_cierre_kg) - num(currentLive.deposito_cierre_kg)),
      gasto_kg: round2(num(hypoLive.gasto_kg) - num(currentLive.gasto_kg)),
      resultado_final_kg: round2(num(hypoLive.resultado_final_kg) - num(currentLive.resultado_final_kg)),
      resultado_final_importe: round2(
        num(hypoLive.resultado_final_importe) - num(currentLive.resultado_final_importe)
      ),
    };
  }

  const reviewableTotal = derivedTotal(reviewable);
  const notCancellableTotal = derivedTotal(notCancellable);

  const limitations = [
    "Director IA es read-only: no cancela ni solicita cancelación.",
    "cancelable operacional != materializado contable != ahorro realizado.",
    "No depositado no implica recortable.",
    "CHEQUE_GENERADO/CUENTA_FONDOS/SOLICITANDO_PAGO pueden ser reviewable operativamente; no son ahorro.",
    "gtos_apoyos_corp_kg no sale de esta lista de folios.",
  ];
  if (igfRestricted) {
    limitations.push(igfBlocks && igfBlocks.error ? igfBlocks.error : "Sin acceso a KPIs financieros.");
  } else if (igfError) {
    limitations.push(igfError);
  } else if (!snapshotRow && !igfRestricted) {
    limitations.push("No hay fila IGF para esta planta/mes. No invento el contrafactual.");
  } else if (missingDenominator) {
    limitations.push("Falta denominador venta_ton > 0. No convierto ausencia en overlay cero.");
  }
  if (wantsCommercialRisk(question)) {
    limitations.push(
      "No hay join físico folio → cliente canónico → venta/DICF/comentarios/acciones. Falta ese vínculo para hablar de riesgo comercial."
    );
  }

  return {
    ok: true,
    semantic_class: SEMANTIC_CLASS,
    planta_id: Number(plantaId),
    planta_nombre: planta && planta.nombre ? String(planta.nombre) : null,
    planta_clave: planta && planta.clave ? String(planta.clave) : null,
    periodo: { year: ym.year, month: ym.month, mes_cargo: mesCargo, is_current_open_month: isMesActual },
    reviewable,
    not_cancellable: notCancellable,
    reviewable_count: reviewable.length,
    reviewable_total: reviewableTotal,
    not_cancellable_count: notCancellable.length,
    not_cancellable_total: notCancellableTotal,
    reviewable_in_igf_count: reviewableInIgf.length,
    truncated: listed.length > RECORD_LIMIT,
    listed_count: listed.length,
    igf_current: igfCurrent,
    igf_counterfactual: igfCounterfactual,
    delta_counterfactual: delta,
    folios_included_in_scenario: reviewableInIgf.map((r) => ({
      id: r.id,
      numero_folio: r.numero_folio,
      importe: r.importe,
      estatus: r.estatus,
      igf_bucket: r.igf_bucket,
    })),
    hypothetical_label: HYPOTHETICAL_LABEL,
    igf_restricted: igfRestricted,
    missing_denominator: Boolean(baseFields && missingDenominator),
    no_igf_row: Boolean(!snapshotRow && !igfRestricted && !igfError),
    limitations,
    source: SOURCE_FOLIOS,
    igf_source: SOURCE_IGF,
    retrieved_at: new Date().toISOString(),
    read_only: true,
    mutated: false,
  };
}

function listLines(rows, limit = 12) {
  return (rows || []).slice(0, limit).map((row, i) => {
    const folio = row.numero_folio || row.folio_codigo || row.id || "folio";
    return `${i + 1}. ${folio}; ${row.estatus || "—"}; ${row.categoria || "—"}; ${formatMoney(row.importe)}; cubo IGF ${
      row.igf_bucket || "none"
    }; ${row.reason}`;
  });
}

function buildIgfReviewableSupportsPack(payload) {
  if (!payload || payload.ok !== true) return payload;
  const reviewableForReview = [...payload.reviewable].sort((a, b) => num(b.importe) - num(a.importe));
  return {
    ...payload,
    review_order_by_amount: reviewableForReview.slice(0, RECORD_LIMIT).map((r) => ({
      id: r.id,
      numero_folio: r.numero_folio,
      importe: r.importe,
      estatus: r.estatus,
      igf_bucket: r.igf_bucket,
    })),
  };
}

function buildIgfReviewableSupportsAnswer(payload, question) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar folios de esta planta.";
    }
    return "No pude consultar apoyos reviewable por un error de fuente. No invento folios ni efecto IGF.";
  }

  const scope = payload.planta_nombre || `planta ${payload.planta_id}`;
  const mes = payload.periodo && payload.periodo.mes_cargo;
  const lines = [];
  lines.push(
    `Apoyos/folios de ${scope} en ${mes} (misma planta y mes_cargo; consulta fresca de ${SOURCE_FOLIOS}).`
  );
  lines.push(
    `REVIEWABLE (cancelable bajo reglas actuales): ${payload.reviewable_count} folio(s), total ${
      payload.reviewable_total == null ? "sin importe registrado" : formatMoney(payload.reviewable_total)
    }.`
  );
  if (payload.reviewable_count === 0) {
    lines.push("No hay folios reviewable en este periodo/planta/categorías IGF. Eso no es un total cero inventado de IGF.");
  } else {
    lines.push(...listLines(payload.reviewable));
  }
  lines.push(
    `Ya no cancelable bajo reglas actuales (PAGADO/CERRADO/COMPROBACIONES/EVIDENCIAS): ${
      payload.not_cancellable_count
    } folio(s), total ${
      payload.not_cancellable_total == null ? "sin importe registrado" : formatMoney(payload.not_cancellable_total)
    }. No los llamo materializados contablemente.`
  );
  if (payload.not_cancellable_count > 0) {
    lines.push(...listLines(payload.not_cancellable, 8));
  }

  if (wantsReviewFirst(question) && payload.reviewable_count > 0) {
    lines.push("Para revisión humana (no es recomendación de cancelar), orden por importe:");
    const ordered = [...payload.reviewable].sort((a, b) => num(b.importe) - num(a.importe));
    lines.push(...listLines(ordered, 8));
  }

  if (payload.igf_restricted) {
    lines.push("No calculo contrafactual IGF: KPIs financieros restringidos para este rol.");
  } else if (payload.no_igf_row) {
    lines.push("No hay fila IGF para armar el overlay. No invento el escenario.");
  } else if (payload.missing_denominator) {
    lines.push("Falta venta_ton > 0. No fabrico $/kg ni un delta cero.");
  } else if (payload.igf_current && payload.igf_counterfactual) {
    lines.push(HYPOTHETICAL_LABEL + ".");
    lines.push("NO es ahorro realizado. NO es un cambio real al IGF. NO es impacto de caja. NO es una orden de cancelar.");
    lines.push(
      `IGF actual (overlay live): resultado ${payload.igf_current.resultado_final_kg} $/kg; gasto ${payload.igf_current.gasto_kg} $/kg.`
    );
    lines.push(
      `Si estos folios reviewable que hoy entran al cálculo (${payload.reviewable_in_igf_count}) dejaran de formar parte del cálculo bajo las mismas reglas actuales, el escenario matemático del IGF sería resultado ${payload.igf_counterfactual.resultado_final_kg} $/kg (delta resultado ${payload.delta_counterfactual.resultado_final_kg} $/kg).`
    );
    if (payload.folios_included_in_scenario && payload.folios_included_in_scenario.length) {
      lines.push(
        `Folios incluidos en el escenario: ${payload.folios_included_in_scenario
          .map((f) => f.numero_folio || f.id)
          .join(", ")}.`
      );
    }
  }

  if (wantsCommercialRisk(question)) {
    lines.push(
      "Riesgo comercial: no hay evidencia física folio→cliente→venta/comentarios/acciones. Falta ese vínculo. No invento el riesgo."
    );
  }

  lines.push(`Limitaciones: ${(payload.limitations || []).join(" ")}`);
  lines.push("Provenance: public.folios (estatus/importe/categoría) + overlay IGF live en memoria. Sin writes.");
  return lines.join("\n");
}

function buildIgfReviewableSupportsPrompt(payload, question) {
  const pack = buildIgfReviewableSupportsPack(payload);
  const facts = buildIgfReviewableSupportsAnswer(pack, question);
  return {
    systemPrompt: `${SYSTEM_ADDENDUM} Responde en español. Una sola respuesta. No contradigas los hechos.`,
    userContent: `Pregunta: ${question}\n\nHECHOS DETERMINISTAS:\n${facts}`,
  };
}

function buildIgfReviewableSupportsChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const okPayload = payload && payload.ok === true;
  const answer = opts.answer || buildIgfReviewableSupportsAnswer(payload, opts.question || "");
  let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (!okPayload) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
    } else {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_ERROR;
    }
  }
  return {
    ok: true,
    answer,
    sources: okPayload ? [SOURCE_FOLIOS] : [],
    context_meta: {
      mode: SEMANTIC_CLASS,
      requested_domain: SEMANTIC_CLASS,
      openai_called: Boolean(opts.openai_called),
      veracity,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      mes_cargo: okPayload && payload.periodo ? payload.periodo.mes_cargo : undefined,
      hypothetical: Boolean(okPayload && payload.igf_counterfactual),
      read_only: true,
    },
    igf_reviewable_supports: okPayload ? buildIgfReviewableSupportsPack(payload) : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: SEMANTIC_CLASS, label: "Apoyos reviewable" }
        : undefined,
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SOURCE_FOLIOS,
  SOURCE_IGF,
  RECORD_LIMIT,
  NON_CANCELLABLE_STATES,
  ESTADOS_HASTA_CHEQUE,
  ESTADOS_APROB_ZP,
  HYPOTHETICAL_LABEL,
  SYSTEM_ADDENDUM,
  isIgfReviewableSupportsQuestion,
  wantsCommercialRisk,
  wantsReviewFirst,
  wantsCounterfactual,
  classifyCancellationEligibility,
  igfCategoryExcludedFromFolioCubes,
  categoryFeedsIgfSupportCalc,
  igfFolioBucket,
  recalcularUtilYResultado,
  overlayFolioKgFromSums,
  applyGastoAndResult,
  addRowToSums,
  emptySums,
  resolveSliceYearMonth,
  loadIgfReviewableSupportsForChat,
  buildIgfReviewableSupportsPack,
  buildIgfReviewableSupportsAnswer,
  buildIgfReviewableSupportsPrompt,
  buildIgfReviewableSupportsChatResult,
};
