"use strict";

/**
 * Director IA — SEH_OPERATION_STATUS.
 * Misma fuente física que GET /api/seh (public.seh_equipos).
 * Solo lectura. No muta. No scrapea HTML. No crea tabla espejo.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { sehParseVence } = require("./seh-equipos");

const SEMANTIC_CLASS = "seh_operation_status";
const SOURCE_TABLE = "public.seh_equipos";
const SOURCE_ENDPOINT = "GET /api/seh";

const SEH_SELECT_SQL = `SELECT id, planta_id, categoria,
       COALESCE(locacion, '') AS locacion,
       COALESCE(descripcion, '') AS descripcion,
       COALESCE(componente, '') AS componente,
       COALESCE(nombre, '') AS nombre,
       to_char(vence, 'YYYY-MM-DD') AS vence, sort_order
 FROM public.seh_equipos
 WHERE planta_id = $1
 ORDER BY categoria, sort_order, id`;

const SCOPES = Object.freeze({
  STATION: "STATION",
  AUTOTANK: "AUTOTANK",
  PLANT: "PLANT",
  FIRE_SYSTEM: "FIRE_SYSTEM",
  ALL_EXTINGUISHERS: "ALL_EXTINGUISHERS",
  ALL_SEH: "ALL_SEH",
});

const METRICS = Object.freeze({
  COUNT: "COUNT",
  LIST: "LIST",
  STATUS: "STATUS",
  EXPIRED: "EXPIRED",
  EXPIRING_SOON: "EXPIRING_SOON",
  NEXT_EXPIRATION: "NEXT_EXPIRATION",
});

const EXPIRATION = Object.freeze({
  VIGENTE: "VIGENTE",
  POR_VENCER: "POR_VENCER",
  VENCIDO: "VENCIDO",
  SIN_FECHA: "SIN_FECHA",
});

const CATEGORY = Object.freeze({
  ESTACIONES: "ESTACIONES",
  PIPAS: "PIPAS",
  PLANTA: "PLANTA",
  SCI: "SISTEMA CONTRA INCENDIO",
});

const PLANTS = Object.freeze([
  { key: "acapulco", label: "Acapulco" },
  { key: "puebla", label: "Puebla" },
  { key: "tehuacan", label: "Tehuacán" },
  { key: "queretaro", label: "Querétaro" },
  { key: "san luis", label: "San Luis" },
  { key: "morelos", label: "Morelos" },
]);

function normalizeText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYmd(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(raw) {
  const parsed = sehParseVence(raw);
  if (!parsed || !/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return null;
  return parsed;
}

function daysUntil(venceYmd, now) {
  const v = parseYmd(venceYmd);
  if (!v) return null;
  const [vy, vm, vd] = v.split("-").map(Number);
  const n = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const a = Date.UTC(vy, vm - 1, vd);
  const b = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.round((a - b) / 86400000);
}

function classifyExpiration(vence, now) {
  const days = daysUntil(vence, now);
  if (days == null) return EXPIRATION.SIN_FECHA;
  if (days < 0) return EXPIRATION.VENCIDO;
  if (days <= 30) return EXPIRATION.POR_VENCER;
  return EXPIRATION.VIGENTE;
}

function assertSehPlantaAccess(auth, plantaId) {
  const role = String((auth && auth.role) || "").toUpperCase();
  if (role === "ZP" || role === "AD" || role === "CF_CDMX") return { ok: true };
  const allowed = ((auth && auth.plantas_permitidas) || []).map((x) => Number(x)).filter(Number.isFinite);
  if (allowed.length === 0) return { ok: true };
  if (!allowed.includes(Number(plantaId))) {
    return {
      ok: false,
      status: 403,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: "Sin permiso para esta planta",
    };
  }
  return { ok: true };
}

function isExtinguisherRow(row) {
  if (String((row && row.categoria) || "").toUpperCase() === CATEGORY.SCI) return false;
  const comp = String((row && row.componente) || "").trim().toUpperCase();
  return comp === "EXTINTOR" || comp === "";
}

function categoryOfScope(scope) {
  if (scope === SCOPES.STATION) return CATEGORY.ESTACIONES;
  if (scope === SCOPES.AUTOTANK) return CATEGORY.PIPAS;
  if (scope === SCOPES.PLANT) return CATEGORY.PLANTA;
  if (scope === SCOPES.FIRE_SYSTEM) return CATEGORY.SCI;
  return null;
}

function rowsForScope(items, scope) {
  const list = Array.isArray(items) ? items : [];
  if (scope === SCOPES.ALL_SEH) return list;
  if (scope === SCOPES.ALL_EXTINGUISHERS) {
    return list.filter(
      (row) =>
        [CATEGORY.ESTACIONES, CATEGORY.PIPAS, CATEGORY.PLANTA].includes(String(row.categoria || "").toUpperCase()) &&
        isExtinguisherRow(row)
    );
  }
  const cat = categoryOfScope(scope);
  return list.filter((row) => String(row.categoria || "").toUpperCase() === cat);
}

function locationKey(row) {
  if (String((row && row.categoria) || "").toUpperCase() === CATEGORY.SCI) {
    return normalizeText(row && row.nombre);
  }
  return normalizeText(row && row.locacion);
}

function distinctAssets(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const key = locationKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function entityMatches(row, entityKey) {
  const want = normalizeText(entityKey);
  if (!want) return true;
  const loc = locationKey(row);
  const name = normalizeText(row && row.nombre);
  if (!loc && !name) return false;
  if (loc === want || name === want) return true;
  const wantTokens = want.split(" ").filter(Boolean);
  if (!wantTokens.length) return false;
  // Un solo token sin dígitos no es resolución: "cuesta" no es Pie de la Cuesta.
  if (wantTokens.length === 1 && !/\d/.test(wantTokens[0])) return false;
  const pools = [loc, name].filter(Boolean);
  for (const hay of pools) {
    const hayTokens = hay.split(" ").filter(Boolean);
    if (hayTokens.length < wantTokens.length) continue;
    for (let i = 0; i <= hayTokens.length - wantTokens.length; i += 1) {
      if (hayTokens.slice(i, i + wantTokens.length).join(" ") === wantTokens.join(" ")) return true;
    }
  }
  return false;
}

function extractPlantLabel(q) {
  const n = normalizeText(q);
  for (const plant of PLANTS) {
    if (n.includes(plant.key)) return plant.label;
  }
  return null;
}

function stripPlantTokens(q) {
  let work = ` ${normalizeText(q)} `;
  for (const plant of PLANTS) {
    work = work.replace(new RegExp(`\\s${plant.key}\\s`, "g"), " ");
  }
  return work.replace(/\s+/g, " ").trim();
}

function isDomainEntityPhrase(work) {
  const n = normalizeText(work);
  if (!n) return true;
  return /^(sistema contra incendio|seguridad e higiene|seguridad contra incendio|sin fecha|extintor(?:es)?|estaciones?|estacion|pipas?|autotanques?|autotanque|planta|la planta)(\s+sin fecha)?$/.test(
    n
  );
}

function extractEntity(q) {
  const n = stripPlantTokens(q);
  if (/\bpie de la cuesta\b/.test(n)) return "pie de la cuesta";
  if (/\bcuarto de control\b/.test(n)) return "cuarto de control";
  const eco = n.match(/\beco\s*\d+/);
  if (eco) return eco[0].replace(/\s+/g, " ");
  const captured = n.match(
    /\b(?:en|de|del|tiene)\s+(?:la\s+estacion\s+(?:de\s+)?|el\s+autotanque\s+)?(?!las?\s+estaciones\b|los?\s+autotanques\b|la\s+planta\b|el\s+sistema\b|sistema\b|acapulco\b)(.+)$/
  );
  if (!captured) return null;
  const work = captured[1]
    .replace(
      /\b(cuantas|cuantos|dime|dame|numero|total|cantidad|equipos?|extintor(?:es)?|estaciones?|carburacion|pipas?|autotanques?|estatus|estado|vigentes?|vencidos?|registrados?|aparecen|sin fecha)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  if (!work || work.length < 3 || isDomainEntityPhrase(work)) return null;
  return work;
}

function detectScope(q) {
  const n = normalizeText(q);
  if (
    /\bsistema\s+contra\s+incendio\b/.test(n) ||
    (/\bsin\s+fecha\b/.test(n) && /\bsistema\b/.test(n))
  ) {
    return SCOPES.FIRE_SYSTEM;
  }
  if (/\bseguridad\s+e\s+higiene\b/.test(n) || /\bseguridad\s+contra\s+incendio\b/.test(n)) {
    return SCOPES.ALL_SEH;
  }
  if (/\b(estaciones?|estacion|carburacion)\b/.test(n)) return SCOPES.STATION;
  if (/\b(pipas?|autotanques?|autotanque|unidades?\s+de\s+autotanque)\b/.test(n)) return SCOPES.AUTOTANK;
  if (/\bextintor(?:es)?\s+de\s+la\s+planta\b/.test(n) || /\bextintor(?:es)?\s+de\s+planta\b/.test(n)) {
    return SCOPES.PLANT;
  }
  if (/\bcuarto\s+de\s+control\b/.test(n) || (/\ben\s+la\s+planta\b/.test(n) && /\bvence\s+primero\b/.test(n))) {
    return SCOPES.PLANT;
  }
  if (/\bextintor(?:es)?\b/.test(n) && extractPlantLabel(n) && !/\bestacion|autotanque|pipa|planta\b/.test(n)) {
    return SCOPES.ALL_EXTINGUISHERS;
  }
  if (extractEntity(n)) {
    if (/\beco\s*\d+/.test(n) || /\bautotanque\b/.test(n)) return SCOPES.AUTOTANK;
    if (/\bextintor(?:es)?\b/.test(n) || /\bestacion\b/.test(n)) return SCOPES.STATION;
    return SCOPES.STATION;
  }
  return null;
}

function detectMetric(q) {
  const n = normalizeText(q);
  if (/\bvence\s+primero\b/.test(n) || /\bvence\s+el\s+proximo\b/.test(n) || /\bcuando\s+vence\b/.test(n)) {
    return METRICS.NEXT_EXPIRATION;
  }
  if (/\bpor\s+vencer\b/.test(n) || /\bvencen\s+pronto\b/.test(n)) return METRICS.EXPIRING_SOON;
  if (/\bvencid/.test(n)) return METRICS.EXPIRED;
  if (/\bcuales\s+son\b/.test(n)) return METRICS.LIST;
  if (
    /\bcuantas\b/.test(n) ||
    /\bcuantos\b/.test(n) ||
    /\bnumero\b/.test(n) ||
    /\btotal\b/.test(n) ||
    /\bcantidad\b/.test(n)
  ) {
    if (/\bestatus\b/.test(n) || /\bestado\b/.test(n)) return METRICS.STATUS;
    return METRICS.COUNT;
  }
  if (
    /\bcomo\s+estan\b/.test(n) ||
    /\bcomo\s+esta\b/.test(n) ||
    /\bestatus\b/.test(n) ||
    /\bestado\b/.test(n) ||
    /\bvigentes?\b/.test(n) ||
    /\brevisame\b/.test(n)
  ) {
    return METRICS.STATUS;
  }
  return METRICS.STATUS;
}

function isSehFollowUp(question) {
  const n = normalizeText(question);
  if (!n) return false;
  return (
    /^(y\s+)?(cual es su estatus|como estan|hay alguno vencido|cual vence primero|cuando vence el proximo)\b/.test(n) ||
    /^estan vigentes los del\b/.test(n)
  );
}

function extractSehSpec(question, prior) {
  const q = normalizeText(question);
  const follow = isSehFollowUp(question);
  if (!q) return { ok: false };
  const scope = detectScope(q) || (follow && prior && prior.scope) || null;
  if (!scope && !follow) return { ok: false };
  const metric = follow && prior && !/\bextintor|estacion|pipa|autotanque|sistema|seguridad\b/.test(q)
    ? detectMetric(q)
    : detectMetric(q);
  const plant_label = extractPlantLabel(q) || (follow && prior ? prior.plant_label : null);
  let entity = extractEntity(q);
  if (follow && prior && prior.entity && !entity) entity = prior.entity;
  if (follow && /^estan vigentes los del\b/.test(q)) {
    entity = extractEntity(q.replace(/^estan vigentes los del\b/, " ")) || entity;
  }
  return {
    ok: true,
    semantic_class: SEMANTIC_CLASS,
    scope: scope || (prior && prior.scope) || SCOPES.STATION,
    metric: metric || (prior && prior.metric) || METRICS.STATUS,
    plant_label,
    entity,
  };
}

function isSehOperationStatusQuestion(question, prior) {
  const n = normalizeText(question);
  if (!n) return false;
  if (isSehFollowUp(question) && prior && prior.ok) return true;
  if (/\b(excel|xlsx|export|descarg)\b/.test(n)) return false;
  if (/\b(gasto|gastos|gaste|gastamos|gastado)\b/.test(n) || /\bse\s+gasto\b/.test(n)) return false;
  if (extractSehSpec(question, prior).ok !== true) return false;
  return Boolean(
    /\b(extintor(?:es)?|estaciones?|estacion|pipas?|autotanques?|autotanque|sistema\s+contra\s+incendio|seguridad\s+e\s+higiene|seguridad\s+contra\s+incendio|cuarto\s+de\s+control)\b/.test(
      n
    ) ||
      /\beco\s*\d+/.test(n) ||
      (isSehFollowUp(question) && prior)
  );
}

function tallyExpiration(rows, now) {
  const counts = {
    [EXPIRATION.VIGENTE]: 0,
    [EXPIRATION.POR_VENCER]: 0,
    [EXPIRATION.VENCIDO]: 0,
    [EXPIRATION.SIN_FECHA]: 0,
  };
  for (const row of rows || []) {
    counts[classifyExpiration(row.vence, now)] += 1;
  }
  return counts;
}

function formatDate(vence) {
  const v = parseYmd(vence);
  return v || "sin fecha";
}

function rowLabel(row) {
  if (String((row && row.categoria) || "").toUpperCase() === CATEGORY.SCI) {
    return String((row && row.nombre) || "equipo").trim() || "equipo";
  }
  const loc = String((row && row.locacion) || "").trim() || "ubicación";
  const desc = String((row && row.descripcion) || "").trim();
  return desc ? `${loc} · ${desc}` : loc;
}

function detailLines(rows, now, statuses) {
  const wanted = new Set(statuses);
  return (rows || [])
    .filter((row) => wanted.has(classifyExpiration(row.vence, now)))
    .map((row) => `${rowLabel(row)} (${formatDate(row.vence)})`);
}

function analyze(items, spec, now) {
  const scoped = rowsForScope(items, spec.scope).filter((row) => entityMatches(row, spec.entity));
  const extinguishers = scoped.filter(isExtinguisherRow);
  const assets = distinctAssets(
    spec.scope === SCOPES.FIRE_SYSTEM ? scoped : scoped.filter((row) => locationKey(row))
  );
  const countAssets = assets.length;
  const countExtinguishers = extinguishers.length;
  const assetCountMetric =
    (spec.scope === SCOPES.STATION || spec.scope === SCOPES.AUTOTANK) &&
    !spec.entity &&
    (spec.metric === METRICS.COUNT || spec.metric === METRICS.LIST);
  const targetRows = spec.scope === SCOPES.FIRE_SYSTEM ? scoped : assetCountMetric ? assets : extinguishers;
  const tallies = tallyExpiration(
    spec.scope === SCOPES.FIRE_SYSTEM ? scoped : extinguishers,
    now
  );
  const next = (spec.scope === SCOPES.FIRE_SYSTEM ? scoped : extinguishers)
    .filter((row) => parseYmd(row.vence))
    .sort((a, b) => String(a.vence).localeCompare(String(b.vence)))[0] || null;
  return {
    scoped,
    extinguishers,
    assets,
    targetRows,
    countAssets,
    countExtinguishers,
    tallies,
    next,
  };
}

function statusSentence(name, n, tallies) {
  return `${name} tiene ${n} extintores registrados: ${tallies.VIGENTE} vigentes, ${tallies.POR_VENCER} por vencer, ${tallies.VENCIDO} vencidos y ${tallies.SIN_FECHA} sin fecha.`;
}

function appendAlerts(lines, rows, now) {
  const expired = detailLines(rows, now, [EXPIRATION.VENCIDO]);
  const soon = detailLines(rows, now, [EXPIRATION.POR_VENCER]);
  if (expired.length) lines.push(`Vencidos: ${expired.join("; ")}.`);
  if (soon.length) lines.push(`Por vencer: ${soon.join("; ")}.`);
  return lines;
}

function buildSehAnswer(payload) {
  if (!payload) return "No pude consultar SEH.";
  if (payload.ok === false) return payload.error || "No pude consultar SEH.";
  const spec = payload.spec || {};
  const analysis = payload.analysis || {};
  const plant = spec.plant_display || spec.plant_label || "la planta";
  const now = payload.now;
  const entityName = spec.entity_display || spec.entity;
  const tallies = analysis.tallies || {};
  const nExt = analysis.countExtinguishers || 0;
  const nAssets = analysis.countAssets || 0;

  if (payload.clarification) return payload.clarification;

  if (!analysis.scoped || analysis.scoped.length === 0) {
    if (entityName) return `No hay registros SEH para ${entityName} en ${plant}.`;
    return `No hay registros SEH en ${plant} para esa consulta.`;
  }

  if (spec.metric === METRICS.COUNT && spec.scope === SCOPES.STATION && !spec.entity) {
    return `${plant} tiene ${nAssets} estaciones de carburación registradas en SEH.`;
  }
  if (spec.metric === METRICS.COUNT && spec.scope === SCOPES.AUTOTANK && !spec.entity) {
    return `${plant} tiene ${nAssets} autotanques registrados en SEH.`;
  }
  if (spec.metric === METRICS.LIST && spec.scope === SCOPES.STATION) {
    const names = (analysis.assets || []).map((row) => row.locacion).filter(Boolean);
    return names.length
      ? `Estaciones de ${plant}: ${names.join(", ")}.`
      : `No hay estaciones registradas en SEH para ${plant}.`;
  }
  if (spec.metric === METRICS.LIST && spec.scope === SCOPES.AUTOTANK) {
    const names = (analysis.assets || []).map((row) => row.locacion).filter(Boolean);
    return names.length
      ? `Autotanques de ${plant}: ${names.join(", ")}.`
      : `No hay autotanques registrados en SEH para ${plant}.`;
  }
  if (spec.metric === METRICS.COUNT && spec.entity) {
    return `${entityName} tiene ${nExt} extintores registrados.`;
  }
  if (spec.scope === SCOPES.FIRE_SYSTEM && /\bsin\s+fecha\b/.test(normalizeText(payload.question))) {
    const missing = (analysis.scoped || []).filter((row) => classifyExpiration(row.vence, now) === EXPIRATION.SIN_FECHA);
    if (!missing.length) return `En ${plant} no hay equipos del sistema contra incendio sin fecha.`;
    return `Equipos del sistema contra incendio sin fecha en ${plant}: ${missing.map((row) => row.nombre || "equipo").join(", ")}.`;
  }
  if (spec.metric === METRICS.EXPIRED) {
    const lines = [`${entityName || plant}: ${tallies.VENCIDO || 0} extintores vencidos.`];
    appendAlerts(lines, spec.scope === SCOPES.FIRE_SYSTEM ? analysis.scoped : analysis.extinguishers, now);
    return lines.join(" ");
  }
  if (spec.metric === METRICS.EXPIRING_SOON) {
    const lines = [`${entityName || plant}: ${tallies.POR_VENCER || 0} extintores por vencer.`];
    appendAlerts(lines, spec.scope === SCOPES.FIRE_SYSTEM ? analysis.scoped : analysis.extinguishers, now);
    return lines.join(" ");
  }
  if (spec.metric === METRICS.NEXT_EXPIRATION) {
    if (!analysis.next) return `No hay fecha de vencimiento usable en ${entityName || plant}.`;
    return `El próximo vencimiento en ${entityName || plant} es ${rowLabel(analysis.next)} el ${formatDate(analysis.next.vence)}.`;
  }
  if (spec.scope === SCOPES.FIRE_SYSTEM) {
    const lines = [
      `Sistema contra incendio de ${plant}: ${analysis.scoped.length} equipos (${tallies.VIGENTE} vigentes, ${tallies.POR_VENCER} por vencer, ${tallies.VENCIDO} vencidos y ${tallies.SIN_FECHA} sin fecha).`,
    ];
    appendAlerts(lines, analysis.scoped, now);
    return lines.join(" ");
  }
  if (spec.scope === SCOPES.ALL_SEH) {
    const stations = distinctAssets(rowsForScope(payload.items, SCOPES.STATION)).length;
    const tanks = distinctAssets(rowsForScope(payload.items, SCOPES.AUTOTANK)).length;
    const plantExt = rowsForScope(payload.items, SCOPES.PLANT).filter(isExtinguisherRow);
    const sci = rowsForScope(payload.items, SCOPES.FIRE_SYSTEM);
    const allExt = rowsForScope(payload.items, SCOPES.ALL_EXTINGUISHERS);
    const extT = tallyExpiration(allExt, now);
    const sciT = tallyExpiration(sci, now);
    return [
      `SEH en ${plant}: ${stations} estaciones, ${tanks} autotanques, ${plantExt.length} extintores de planta y ${sci.length} equipos de sistema contra incendio.`,
      `Extintores (estaciones + autotanques + planta): ${allExt.length} registrados, ${extT.VIGENTE} vigentes, ${extT.POR_VENCER} por vencer, ${extT.VENCIDO} vencidos y ${extT.SIN_FECHA} sin fecha.`,
      `Sistema contra incendio: ${sciT.VIGENTE} vigentes, ${sciT.POR_VENCER} por vencer, ${sciT.VENCIDO} vencidos y ${sciT.SIN_FECHA} sin fecha.`,
    ].join(" ");
  }
  if (spec.scope === SCOPES.ALL_EXTINGUISHERS) {
    const lines = [
      `En ${plant} hay ${nExt} extintores registrados considerando estaciones, autotanques y planta: ${tallies.VIGENTE} vigentes, ${tallies.POR_VENCER} por vencer, ${tallies.VENCIDO} vencidos y ${tallies.SIN_FECHA} sin fecha.`,
    ];
    appendAlerts(lines, analysis.extinguishers, now);
    return lines.join(" ");
  }
  const subject = entityName || (spec.scope === SCOPES.PLANT ? `La planta de ${plant}` : plant);
  const lines = [statusSentence(subject, nExt, tallies)];
  appendAlerts(lines, analysis.extinguishers, now);
  return lines.join(" ");
}

async function querySehEquipos(client, plantaId) {
  const r = await client.query(SEH_SELECT_SQL, [plantaId]);
  return r.rows || [];
}

function resolveDisplayEntity(items, entity) {
  if (!entity) return null;
  const hit = (items || []).find((row) => entityMatches(row, entity));
  if (!hit) return entity;
  return String(hit.locacion || hit.nombre || entity).trim() || entity;
}

async function loadSehOperationStatusForChat(pool, plantaId, req, opts = {}) {
  const now = opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();
  const question = opts.question || "";
  const prior = opts.priorSpec && opts.priorSpec.ok ? opts.priorSpec : null;
  const spec = extractSehSpec(question, prior);
  if (!spec.ok) {
    return { ok: false, error: "No pude determinar la consulta SEH.", spec, now };
  }

  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const selectedId = Number(plantaId);
  const plantIdToUse = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null;
  if (!plantIdToUse) {
    return {
      ok: true,
      clarification: "¿De qué planta quieres el estado de SEH?",
      spec,
      now,
      analysis: { scoped: [] },
    };
  }
  const denied = assertSehPlantaAccess(auth, plantIdToUse);
  if (!denied.ok) return { ...denied, spec, now };

  let items = [];
  try {
    const query = opts.querySehEquipos || querySehEquipos;
    if (opts.items) items = opts.items;
    else if (pool && typeof pool.connect === "function") {
      const client = await pool.connect();
      try {
        items = await query(client, plantIdToUse);
      } finally {
        client.release();
      }
    } else if (pool && typeof pool.query === "function") {
      items = await query(pool, plantIdToUse);
    }
  } catch (e) {
    return {
      ok: false,
      status: 500,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      error: e && e.message ? e.message : "No se pudo leer public.seh_equipos",
      spec,
      now,
    };
  }

  const fromItems = (() => {
    const n = normalizeText(question);
    let best = null;
    let bestLen = 0;
    for (const row of items || []) {
      const loc = locationKey(row);
      if (!loc || loc.length < 4) continue;
      if (n.includes(loc) && loc.length > bestLen) {
        best = loc;
        bestLen = loc.length;
      }
    }
    return best;
  })();
  if (fromItems) spec.entity = fromItems;
  const analysis = analyze(items, spec, now);
  spec.plant_display = spec.plant_label || opts.plant_label || "la planta";
  spec.entity_display = resolveDisplayEntity(items, spec.entity);
  return {
    ok: true,
    spec,
    analysis,
    items,
    now,
    question,
    planta_id: plantIdToUse,
    source: SOURCE_TABLE,
  };
}

function encodeSehPrior(spec) {
  if (!spec || !spec.ok) return null;
  return {
    kind: "seh_entity",
    key: spec.entity || "",
    display: spec.entity_display || spec.entity || spec.scope || "SEH",
    scope: spec.scope,
    metric: spec.metric,
    plant_label: spec.plant_label || spec.plant_display || null,
  };
}

function priorSpecFromState(state) {
  if (!state || state.parent_intent !== "seh_operation_status") return null;
  const ent = Array.isArray(state.active_entities) ? state.active_entities[0] : null;
  if (!ent && !state.active_subtopic) return null;
  return {
    ok: true,
    scope: String((ent && ent.scope) || state.active_subtopic || SCOPES.STATION).toUpperCase(),
    metric: (ent && ent.metric) || METRICS.STATUS,
    entity: (ent && (ent.key || ent.display)) || null,
    plant_label: (ent && ent.plant_label) || null,
  };
}

function buildSehOperationStatusChatResult(payload, opts = {}) {
  const answer = buildSehAnswer(payload);
  const spec = payload && payload.spec;
  const entity = encodeSehPrior(spec);
  return {
    ok: true,
    answer,
    sources: payload && payload.ok !== false ? [SOURCE_TABLE] : [],
    context_meta: {
      mode: SEMANTIC_CLASS,
      openai_called: false,
      veracity:
        payload && payload.ok === false
          ? payload.code || DIRECTOR_IA_VERACITY.SOURCE_ERROR
          : DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
      semantic_class: SEMANTIC_CLASS,
      scope: spec && spec.scope,
      metric: spec && spec.metric,
      entity: spec && spec.entity,
      planta_id: opts.planta_id != null ? opts.planta_id : payload && payload.planta_id,
      conversation_state: {
        parent_intent: "seh_operation_status",
        planta_id: opts.planta_id != null ? opts.planta_id : payload && payload.planta_id,
        active_subtopic: spec && spec.scope,
        active_entities: entity ? [entity] : [],
      },
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SOURCE_TABLE,
  SOURCE_ENDPOINT,
  SEH_SELECT_SQL,
  SCOPES,
  METRICS,
  EXPIRATION,
  CATEGORY,
  normalizeText,
  classifyExpiration,
  assertSehPlantaAccess,
  isExtinguisherRow,
  distinctAssets,
  entityMatches,
  extractSehSpec,
  isSehOperationStatusQuestion,
  isSehFollowUp,
  analyze,
  buildSehAnswer,
  loadSehOperationStatusForChat,
  buildSehOperationStatusChatResult,
  priorSpecFromState,
  querySehEquipos,
};
