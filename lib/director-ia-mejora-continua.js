"use strict";

const { isDirectorIaEnabled } = require("./director-ia");
const { pgCalendarDateToYmd } = require("./action-register-board");

/** Áreas estratégicas Plan Maestro — Mejora Continua Presidencial v0.8 */
const AREAS_MEJORA_CONTINUA = Object.freeze([
  "Oficinas",
  "Taller",
  "Sistema vs Incendio",
  "ERP",
  "Imagen Corporativa",
]);

const MAX_ACCIONES_DESTACADAS = 3;

/** @type {{ pool?: import("pg").Pool, assertPlantaAccess?: Function, ensureActionRegisterTables?: Function }} */
let deps = {};

function configureDirectorIaMejoraContinua(injected) {
  deps = { ...deps, ...injected };
}

function todayYmdMexicoCity() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function monthInclusiveRangeCdmx(year, month) {
  const y = Number(year);
  const m = Number(month);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    dateFrom: `${y}-${String(m).padStart(2, "0")}-01`,
    dateTo: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

function currentYearMonthCdmx() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "0", 10);
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "0", 10);
  return { year, month };
}

function isItemOverdue(item, todayYmd) {
  if (item.closed) return false;
  const due = pgCalendarDateToYmd(item.due_date);
  if (!due) return false;
  return due < todayYmd;
}

function computeEstatus(evidenciasMes, accionesAbiertas) {
  if (evidenciasMes > 0) return "VERDE";
  if (accionesAbiertas > 0) return "AMARILLO";
  return "ROJO";
}

function formatResponsableLabel(raw) {
  const s = String(raw || "").trim();
  return s || null;
}

function sortAccionesDestacadas(a, b) {
  if (a.vencida !== b.vencida) return a.vencida ? -1 : 1;
  const da = a.ultima_evidencia || "";
  const db = b.ultima_evidencia || "";
  if (db !== da) return db.localeCompare(da);
  return a.title.localeCompare(b.title, "es");
}

/**
 * @param {import("pg").PoolClient} client
 * @param {{ planta_id: number, year: number, month: number }} opts
 */
async function buildMejoraContinuaPayload(client, opts) {
  const planta_id = Number(opts.planta_id);
  const year = Number(opts.year);
  const month = Number(opts.month);
  const { dateFrom, dateTo } = monthInclusiveRangeCdmx(year, month);
  const todayYmd = todayYmdMexicoCity();

  const itemsRes = await client.query(
    `SELECT id, tema, title, responsable, closed, due_date
     FROM arr.action_register_items
     WHERE planta_id = $1
       AND tema = ANY($2::text[])`,
    [planta_id, [...AREAS_MEJORA_CONTINUA]]
  );

  const attRes = await client.query(
    `SELECT a.id AS attachment_id,
            a.item_id,
            i.tema,
            (a.created_at AT TIME ZONE 'America/Mexico_City')::date AS evidencia_fecha
     FROM arr.action_register_attachments a
     JOIN arr.action_register_items i ON i.id = a.item_id
     WHERE i.planta_id = $1
       AND i.tema = ANY($2::text[])
       AND (a.created_at AT TIME ZONE 'America/Mexico_City')::date >= $3::date
       AND (a.created_at AT TIME ZONE 'America/Mexico_City')::date <= $4::date
     ORDER BY a.item_id ASC, a.created_at ASC, a.id ASC`,
    [planta_id, [...AREAS_MEJORA_CONTINUA], dateFrom, dateTo]
  );

  const itemsByArea = new Map();
  for (const area of AREAS_MEJORA_CONTINUA) {
    itemsByArea.set(area, []);
  }
  for (const row of itemsRes.rows || []) {
    const area = String(row.tema || "").trim();
    if (!itemsByArea.has(area)) continue;
    itemsByArea.get(area).push({
      id: Number(row.id),
      tema: area,
      title: String(row.title || "").trim() || "(sin título)",
      responsable: formatResponsableLabel(row.responsable),
      closed: row.closed === true,
      due_date: row.due_date,
      vencida: isItemOverdue(row, todayYmd),
    });
  }

  const evidenceByItem = new Map();
  const evidenceCountByArea = new Map();
  for (const area of AREAS_MEJORA_CONTINUA) {
    evidenceCountByArea.set(area, 0);
  }
  for (const row of attRes.rows || []) {
    const itemId = Number(row.item_id);
    const area = String(row.tema || "").trim();
    const fecha = row.evidencia_fecha
      ? pgCalendarDateToYmd(row.evidencia_fecha)
      : null;
    if (!evidenceByItem.has(itemId)) {
      evidenceByItem.set(itemId, { count: 0, ultima: null });
    }
    const slot = evidenceByItem.get(itemId);
    slot.count += 1;
    if (fecha && (!slot.ultima || fecha > slot.ultima)) slot.ultima = fecha;
    if (evidenceCountByArea.has(area)) {
      evidenceCountByArea.set(area, (evidenceCountByArea.get(area) || 0) + 1);
    }
  }

  const areas = [];
  let verdes = 0;
  let amarillas = 0;
  let rojas = 0;

  for (const area of AREAS_MEJORA_CONTINUA) {
    const items = itemsByArea.get(area) || [];
    let acciones_abiertas = 0;
    /** Snapshot actual (items.closed); no cuenta acciones cerradas durante el mes. */
    let acciones_cerradas = 0;
    let acciones_vencidas = 0;
    const responsablesSet = new Set();

    const candidatas = [];
    for (const it of items) {
      if (it.closed) acciones_cerradas += 1;
      else acciones_abiertas += 1;
      if (it.vencida) acciones_vencidas += 1;
      if (it.responsable) responsablesSet.add(it.responsable);

      const ev = evidenceByItem.get(it.id) || { count: 0, ultima: null };
      candidatas.push({
        id: it.id,
        title: it.title,
        responsable: it.responsable,
        evidencias_mes: ev.count,
        ultima_evidencia: ev.ultima,
        vencida: it.vencida,
      });
    }

    const evidencias_mes = evidenceCountByArea.get(area) || 0;
    const acciones_con_evidencia_mes = candidatas.filter((c) => c.evidencias_mes > 0).length;
    const estatus = computeEstatus(evidencias_mes, acciones_abiertas);
    if (estatus === "VERDE") verdes += 1;
    else if (estatus === "AMARILLO") amarillas += 1;
    else rojas += 1;

    let ultima_evidencia = null;
    for (const c of candidatas) {
      if (c.ultima_evidencia && (!ultima_evidencia || c.ultima_evidencia > ultima_evidencia)) {
        ultima_evidencia = c.ultima_evidencia;
      }
    }

    const acciones_destacadas = [...candidatas]
      .sort(sortAccionesDestacadas)
      .slice(0, MAX_ACCIONES_DESTACADAS)
      .map((c) => ({
        id: c.id,
        title: c.title,
        responsable: c.responsable,
        evidencias_mes: c.evidencias_mes,
        ultima_evidencia: c.ultima_evidencia,
        vencida: c.vencida,
      }));

    areas.push({
      area,
      estatus,
      acciones_abiertas,
      acciones_cerradas,
      acciones_vencidas,
      acciones_con_evidencia_mes,
      evidencias_mes,
      responsables: Array.from(responsablesSet).sort((a, b) => a.localeCompare(b, "es")),
      ultima_evidencia,
      cumple_meta_mensual: evidencias_mes > 0,
      acciones_destacadas,
    });
  }

  const totalAreas = AREAS_MEJORA_CONTINUA.length;
  const cumplimiento_pct = Math.round((verdes / totalAreas) * 1000) / 10;

  return {
    ok: true,
    year,
    month,
    planta_id,
    areas,
    resumen: {
      verdes,
      amarillas,
      rojas,
      cumplimiento: `${verdes}/${totalAreas}`,
      cumplimiento_pct,
    },
  };
}

/**
 * GET /api/director-ia/mejora-continua
 * Requiere dashboardAuthMiddleware antes de invocar.
 */
async function handleGetMejoraContinua(req, res) {
  if (!isDirectorIaEnabled()) {
    return res.status(200).json({ enabled: false });
  }

  const planta_id =
    req.query && req.query.planta_id != null ? parseInt(String(req.query.planta_id), 10) : null;
  const year = parseInt(String(req.query.year || ""), 10);
  const month = parseInt(String(req.query.month || ""), 10);

  if (!planta_id || !Number.isFinite(planta_id)) {
    return res.status(400).json({ ok: false, error: "planta_id requerido" });
  }
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return res.status(400).json({ ok: false, error: "year y month (1-12) son obligatorios" });
  }

  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return res.status(403).json({ ok: false, error: "Sin acceso a esta planta" });
  }

  if (!deps.pool || !deps.ensureActionRegisterTables) {
    return res.status(500).json({ ok: false, error: "Mejora Continua Director IA no configurado" });
  }

  const client = await deps.pool.connect();
  try {
    await deps.ensureActionRegisterTables(client);
    const payload = await buildMejoraContinuaPayload(client, { planta_id, year, month });
    return res.status(200).json(payload);
  } catch (e) {
    console.error("[Director IA mejora-continua]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al calcular mejora continua" });
  } finally {
    client.release();
  }
}

/**
 * Carga payload de mejora continua para chat/contexto (requiere configure previo).
 * @param {import("express").Request} req
 * @param {number} planta_id
 * @param {number} year
 * @param {number} month
 */
async function loadMejoraContinuaForChat(req, planta_id, year, month) {
  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return { ok: false, error: "Sin acceso a esta planta" };
  }
  if (!deps.pool || !deps.ensureActionRegisterTables) {
    return { ok: false, error: "Mejora Continua Director IA no configurado" };
  }

  const client = await deps.pool.connect();
  try {
    await deps.ensureActionRegisterTables(client);
    return await buildMejoraContinuaPayload(client, { planta_id, year, month });
  } catch (e) {
    console.error("[Director IA mejora-continua chat]", e);
    return { ok: false, error: e.message || "Error al calcular mejora continua" };
  } finally {
    client.release();
  }
}

module.exports = {
  AREAS_MEJORA_CONTINUA,
  configureDirectorIaMejoraContinua,
  buildMejoraContinuaPayload,
  handleGetMejoraContinua,
  loadMejoraContinuaForChat,
  monthInclusiveRangeCdmx,
  currentYearMonthCdmx,
};
