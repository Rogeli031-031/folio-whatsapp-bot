"use strict";

/**
 * Director IA — M18 primer slice: query read-only del carro presupuestal semanal.
 * SELECT sobre public.presupuestos_semanales + public.presupuesto_folios.
 * No writes. No cheques. No WhatsApp/Twilio. No HTTP. No presupuesto_asignacion_detalle.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { assertFolioStatusAccess, requirePlantaId } = require("./director-ia-m2-folio-status");

const PRESUPUESTO_SEMANAL_SEMANTIC_CLASS = "presupuesto_semanal_carro";
const SOURCE = "public.presupuestos_semanales + public.presupuesto_folios";
const FOLIO_LIMIT = 40;

function sourceError(message) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: message || "Error de fuente de presupuesto semanal",
  };
}

function dateToPg(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function pgCalendarDateToYmd(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }
  if (v instanceof Date && !isNaN(v.getTime())) {
    try {
      return v.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }
  const s = String(v).trim();
  const m2 = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m2 ? m2[1] : "";
}

/** Semana lunes–domingo desde un Date UTC. Misma regla que server.js getCurrentWeekMexico. */
function weekContainingUtcDate(date) {
  const src = date instanceof Date ? date : new Date(date);
  const utc = new Date(Date.UTC(src.getUTCFullYear(), src.getUTCMonth(), src.getUTCDate()));
  const dow = utc.getUTCDay();
  const lunesOffset = dow === 0 ? -6 : 1 - dow;
  const lunes = new Date(utc);
  lunes.setUTCDate(utc.getUTCDate() + lunesOffset);
  const domingo = new Date(lunes);
  domingo.setUTCDate(lunes.getUTCDate() + 6);
  return { lunes, domingo };
}

function getCurrentWeekMexico(now) {
  return weekContainingUtcDate(now || new Date());
}

function parseYyyyMmDdTokens(question) {
  const found = [];
  const re = /\b(\d{4}-\d{2}-\d{2})\b/g;
  const text = String(question || "");
  let m;
  while ((m = re.exec(text))) found.push(m[1]);
  return found;
}

function parseDdMmYyyyTokens(question) {
  const found = [];
  const re = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
  const text = String(question || "");
  let m;
  while ((m = re.exec(text))) {
    found.push(`${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`);
  }
  return found;
}

function isValidYyyyMmDd(value) {
  const s = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, mo, d] = s.split("-").map((n) => Number(n));
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function normalizeQuestion(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isCurrentWeekTrigger(question) {
  const q = normalizeQuestion(question);
  if (!q) return false;
  return (
    /\besta\s+semana\b/.test(q) ||
    /\bsemana\s+actual\b/.test(q) ||
    /\bmi\s+presupuesto\b/.test(q) ||
    /\bpresupuesto\s+semanal\b/.test(q)
  );
}

function resolveWeek(question, opts = {}) {
  const explicit = [...parseYyyyMmDdTokens(question), ...parseDdMmYyyyTokens(question)];
  if (explicit.length > 2) {
    return {
      ok: false,
      status: 400,
      code: "invalid_week",
      error: "Indica una fecha YYYY-MM-DD o un par inicio/fin. No invento la semana.",
    };
  }
  for (const token of explicit) {
    if (!isValidYyyyMmDd(token)) {
      return {
        ok: false,
        status: 400,
        code: "invalid_week",
        error: "Fecha de semana inválida. Usa YYYY-MM-DD o DD/MM/AAAA. No invento la semana.",
      };
    }
  }
  if (explicit.length === 2) {
    const a = explicit[0];
    const b = explicit[1];
    const inicio = a <= b ? a : b;
    const fin = a <= b ? b : a;
    return { ok: true, semana_inicio: inicio, semana_fin: fin, week_source: "explicit_range" };
  }
  if (explicit.length === 1) {
    const [y, mo, d] = explicit[0].split("-").map((n) => Number(n));
    const { lunes, domingo } = weekContainingUtcDate(new Date(Date.UTC(y, mo - 1, d)));
    return {
      ok: true,
      semana_inicio: dateToPg(lunes),
      semana_fin: dateToPg(domingo),
      week_source: "explicit_date",
    };
  }
  if (isCurrentWeekTrigger(question)) {
    const nowFn = opts.now || (() => new Date());
    const { lunes, domingo } = getCurrentWeekMexico(nowFn());
    return {
      ok: true,
      semana_inicio: dateToPg(lunes),
      semana_fin: dateToPg(domingo),
      week_source: "current_week_rule",
    };
  }
  return {
    ok: false,
    status: 400,
    code: "missing_week",
    error:
      "Indica la semana (esta semana, presupuesto semanal, o fechas YYYY-MM-DD). No invento la semana.",
  };
}

function isUrgentePrioridad(prioridad) {
  return /urgente/i.test(String(prioridad || ""));
}

function computeResumen(row, folioRows) {
  const lista = (folioRows || []).map((r) => {
    const importe = Number(r.importe) || 0;
    const prioridad = r.prioridad != null ? String(r.prioridad) : null;
    return {
      folio_id: r.folio_id != null ? Number(r.folio_id) : null,
      numero_folio: r.numero_folio ? String(r.numero_folio) : null,
      importe,
      prioridad,
      urgente: isUrgentePrioridad(prioridad),
      ligado_por: r.ligado_por || null,
      ligado_en: r.ligado_en || null,
    };
  });
  const seleccionado = lista.reduce((s, f) => s + f.importe, 0);
  const asignado = Number(row.monto_asignado) || 0;
  const disponible = Math.max(0, asignado - seleccionado);
  const urgentes = lista.filter((f) => f.urgente).length;
  return { asignado, seleccionado, disponible, urgentes, folios: lista, numFolios: lista.length };
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [
    plantaId,
  ]);
  return r.rows[0] || null;
}

async function queryPresupuestoSemanal(client, plantaId, semanaInicio, semanaFin) {
  const r = await client.query(
    `SELECT id, planta_id, semana_inicio, semana_fin, monto_asignado, estatus
       FROM public.presupuestos_semanales
      WHERE planta_id = $1
        AND semana_inicio = $2::date
        AND semana_fin = $3::date
      LIMIT 1`,
    [plantaId, semanaInicio, semanaFin]
  );
  return r.rows[0] || null;
}

async function queryPresupuestoFolios(client, presupuestoId) {
  const r = await client.query(
    `SELECT pf.id, pf.folio_id, pf.numero_folio, pf.importe, pf.prioridad, pf.ligado_por, pf.ligado_en
       FROM public.presupuesto_folios pf
      WHERE pf.presupuesto_id = $1
      ORDER BY (CASE WHEN UPPER(TRIM(COALESCE(pf.prioridad,''))) LIKE '%URGENTE%' THEN 0 ELSE 1 END),
               pf.ligado_en ASC`,
    [presupuestoId]
  );
  return r.rows || [];
}

async function loadPresupuestoSemanalForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertFolioStatusAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const question = opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const week = resolveWeek(question, { now: opts.now });
  if (!week.ok) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: week.status,
      error: week.error,
      week_code: week.code,
    };
  }

  const queryHeader = opts.queryPresupuestoSemanal || queryPresupuestoSemanal;
  const queryFolios = opts.queryPresupuestoFolios || queryPresupuestoFolios;
  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;

  async function run(client) {
    const planta = await resolvePlanta(client, Number(plantaId));
    const plantaNombre = planta && planta.nombre ? String(planta.nombre) : null;
    const plantaClave = planta && planta.clave ? String(planta.clave) : null;
    const row = await queryHeader(client, Number(plantaId), week.semana_inicio, week.semana_fin);
    if (!row) {
      return {
        ok: true,
        found: false,
        planta_id: Number(plantaId),
        planta_nombre: plantaNombre,
        planta_clave: plantaClave,
        semana_inicio: week.semana_inicio,
        semana_fin: week.semana_fin,
        week_source: week.week_source,
        presupuesto_semana_id: null,
        estatus: null,
        asignado: null,
        seleccionado: null,
        disponible: null,
        numFolios: 0,
        urgentes: 0,
        folios: [],
        truncated: false,
        retrieved_at: new Date().toISOString(),
        source: SOURCE,
        semantic_class: PRESUPUESTO_SEMANAL_SEMANTIC_CLASS,
      };
    }

    const folioRows = await queryFolios(client, row.id);
    const resumen = computeResumen(row, folioRows);
    const truncated = resumen.folios.length > FOLIO_LIMIT;
    const folios = truncated ? resumen.folios.slice(0, FOLIO_LIMIT) : resumen.folios;
    return {
      ok: true,
      found: true,
      planta_id: Number(plantaId),
      planta_nombre: plantaNombre,
      planta_clave: plantaClave,
      presupuesto_semana_id: Number(row.id),
      semana_inicio: pgCalendarDateToYmd(row.semana_inicio) || week.semana_inicio,
      semana_fin: pgCalendarDateToYmd(row.semana_fin) || week.semana_fin,
      week_source: week.week_source,
      estatus: row.estatus != null ? String(row.estatus) : null,
      asignado: resumen.asignado,
      seleccionado: resumen.seleccionado,
      disponible: resumen.disponible,
      numFolios: resumen.numFolios,
      urgentes: resumen.urgentes,
      folios,
      truncated,
      retrieved_at: new Date().toISOString(),
      source: SOURCE,
      semantic_class: PRESUPUESTO_SEMANAL_SEMANTIC_CLASS,
    };
  }

  const injected = Boolean(opts.queryPresupuestoSemanal && opts.queryPresupuestoFolios && opts.resolvePlanta);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message);
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de presupuesto semanal no disponible");
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

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "importe no registrado";
  return n.toFixed(2);
}

function buildPresupuestoSemanalAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar el presupuesto semanal de esta planta.";
    }
    if (payload && (payload.status === 400 || payload.week_code)) {
      return payload.error || "Indica la semana. No invento la semana.";
    }
    return "No pude consultar el presupuesto semanal por un error de fuente. No invento asignado ni folios.";
  }

  const scope = payload.planta_nombre || `planta ${payload.planta_id}`;
  const rango = `${payload.semana_inicio} a ${payload.semana_fin}`;

  if (!payload.found) {
    return (
      `No hay presupuesto semanal registrado para ${scope} (${rango}). ` +
      `Hechos observados en ${SOURCE}. No invento asignado, seleccionado ni folios. ` +
      `No es cheque, no es pagado y no es presupuesto_asignacion_detalle.`
    );
  }

  const trunc = payload.truncated ? ` Listado truncado a ${FOLIO_LIMIT} de ${payload.numFolios} folios.` : "";
  const lines = (payload.folios || []).slice(0, 16).map((row, i) => {
    const folio = row.numero_folio || row.folio_id || "folio no registrado";
    const importe = formatMoney(row.importe);
    const prioridad = row.prioridad || "prioridad no registrada";
    const urgenteBit = row.urgente ? "urgente" : "no urgente";
    return `${i + 1}. ${folio}; ${importe}; ${prioridad}; ${urgenteBit}`;
  });
  const estatus = payload.estatus || "estatus no registrado";
  return (
    `Presupuesto semanal de ${scope} (${rango}). Estatus ${estatus}. ` +
    `Asignado ${formatMoney(payload.asignado)}; seleccionado ${formatMoney(payload.seleccionado)}; ` +
    `disponible ${formatMoney(payload.disponible)}. Folios ${payload.numFolios}; urgentes ${payload.urgentes}.${trunc} ` +
    `Hechos observados en ${SOURCE}. Seleccionado no es pagado. Presupuesto no es cheque. Asignado no es aprobado. ` +
    `Urgente solo si prioridad coincide /urgente/i. No es presupuesto_asignacion_detalle.\n` +
    lines.join("\n")
  );
}

function buildPresupuestoSemanalChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const okPayload = payload && payload.ok === true;
  const answer = buildPresupuestoSemanalAnswer(payload);
  let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (!okPayload) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
    } else {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_ERROR;
    }
  } else if (payload.found === false) {
    veracity = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
  }
  return {
    ok: true,
    answer,
    sources: okPayload ? [SOURCE] : [],
    context_meta: {
      mode: "presupuesto_semanal",
      requested_domain: "presupuestos",
      openai_called: false,
      veracity,
      semantic_class: PRESUPUESTO_SEMANAL_SEMANTIC_CLASS,
      planta_id,
      semana_inicio: okPayload ? payload.semana_inicio : undefined,
      semana_fin: okPayload ? payload.semana_fin : undefined,
      timestamp: new Date().toISOString(),
    },
    presupuesto_semanal: okPayload
      ? {
          semantic_class: payload.semantic_class,
          found: payload.found,
          planta_id: payload.planta_id,
          planta_nombre: payload.planta_nombre,
          presupuesto_semana_id: payload.presupuesto_semana_id,
          semana_inicio: payload.semana_inicio,
          semana_fin: payload.semana_fin,
          week_source: payload.week_source,
          estatus: payload.estatus,
          asignado: payload.asignado,
          seleccionado: payload.seleccionado,
          disponible: payload.disponible,
          numFolios: payload.numFolios,
          urgentes: payload.urgentes,
          folios: payload.folios,
          truncated: payload.truncated,
          source: payload.source,
          retrieved_at: payload.retrieved_at,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "presupuestos", label: "Presupuestos semanales" }
        : undefined,
  };
}

module.exports = {
  PRESUPUESTO_SEMANAL_SEMANTIC_CLASS,
  SOURCE,
  FOLIO_LIMIT,
  dateToPg,
  pgCalendarDateToYmd,
  weekContainingUtcDate,
  getCurrentWeekMexico,
  parseYyyyMmDdTokens,
  isValidYyyyMmDd,
  isCurrentWeekTrigger,
  resolveWeek,
  isUrgentePrioridad,
  computeResumen,
  queryPresupuestoSemanal,
  queryPresupuestoFolios,
  loadPresupuestoSemanalForChat,
  buildPresupuestoSemanalAnswer,
  buildPresupuestoSemanalChatResult,
};
