"use strict";

/**
 * Comentario del día (AH) y clientes nuevos (AI) para IGF Diario.
 * Read-only. No OpenAI, no HTTP, no DDL, no writes.
 * La matemática sale de computeDailySalesDeviationFromRows y
 * computeDailyDiscountDeviationFromRows. Provincia reutiliza los datasets
 * ya precargados; no vuelve a consultar.
 */

const { normNombre } = require("./cliente-contacto");
const {
  BUSINESS_TZ,
  addDaysYmd,
  businessTodayYmd,
  computeDailySalesDeviationFromRows,
  ymdFromValue,
} = require("./director-ia-daily-deviation");
const { computeDailyDiscountDeviationFromRows } = require("./director-ia-daily-discount");

const QUERIES_PER_PLANT = 3;
const MATERIAL_SHARE = 0.1;
const NAMESPACE = "|||";

const SQL_PROV_MAP = `
       SELECT DISTINCT
              p.nombre AS prov_name,
              UPPER(TRIM(p.nombre)) AS key_nombre,
              UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
         FROM public.plantas p
         JOIN arr.provincia_plants ap
           ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
           OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
        WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
          AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
`;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function monthStartYmd(year, month) {
  return `${year}-${pad2(month)}-01`;
}

function monthEndYmd(year, month) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad2(month)}-${pad2(last)}`;
}

function previousMonth(year, month) {
  if (Number(month) === 1) return { year: Number(year) - 1, month: 12 };
  return { year: Number(year), month: Number(month) - 1 };
}

function corteYmdOf(value) {
  const raw = value != null ? String(value).trim().slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function maxEligibleInsightYmd(opts) {
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  const today = (opts && opts.todayYmd) || businessTodayYmd(opts && opts.now);
  if (!today) return null;
  const start = monthStartYmd(year, month);
  const end = monthEndYmd(year, month);
  const yesterday = addDaysYmd(today, -1);
  let cap = end < today ? end : yesterday;
  const corte = corteYmdOf(opts && opts.corteYmd);
  if (corte) {
    const corteMinus = addDaysYmd(corte, -1);
    if (corteMinus && corteMinus < cap) cap = corteMinus;
  }
  if (!cap || cap < start) return null;
  if (cap > end) cap = end;
  return cap;
}

function insightQueryRange(year, month, eligibleEnd) {
  const prev = previousMonth(year, month);
  return {
    start: monthStartYmd(prev.year, prev.month),
    end: eligibleEnd || monthEndYmd(year, month),
  };
}

function eachYmd(start, end) {
  const out = [];
  let cursor = start;
  while (cursor && end && cursor <= end) {
    out.push(cursor);
    cursor = addDaysYmd(cursor, 1);
  }
  return out;
}

function formatKg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  const rounded = Math.round(abs * 10) / 10;
  const intLike = Math.abs(rounded - Math.round(rounded)) < 1e-6;
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: intLike ? 0 : 1,
  }).format(intLike ? Math.round(rounded) : rounded);
}

function formatSignedKg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (n > 0) return `+${formatKg(n)}`;
  if (n < 0) return `-${formatKg(n)}`;
  return formatKg(0);
}

function formatPct(ratio) {
  const n = Number(ratio);
  if (!Number.isFinite(n)) return "";
  const pct = n * 100;
  const body = Math.abs(pct).toFixed(1);
  if (pct > 0) return `+${body}%`;
  if (pct < 0) return `-${body}%`;
  return `${body}%`;
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `$${Math.abs(n).toFixed(2)}`;
}

function formatSignedMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (n > 0) return `+${formatMoney(n)}`;
  if (n < 0) return `-${formatMoney(n)}`;
  return formatMoney(0);
}

function contactKey(plantaId, clienteNorm) {
  const id = Number(plantaId);
  if (!Number.isFinite(id)) return "";
  return `${id}\t${normNombre(clienteNorm)}`;
}

function formatContact(contact) {
  const parts = [
    contact && contact.nombre_contacto,
    contact && contact.telefono,
    contact && contact.correo,
  ]
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean);
  if (!parts.length) return "Contacto: no capturado.";
  return `Contacto: ${parts.join(" | ")}`;
}

function lookupContact(contactsByNorm, plantaId, clienteNorm) {
  if (!contactsByNorm || typeof contactsByNorm.get !== "function") return null;
  return contactsByNorm.get(contactKey(plantaId, clienteNorm)) || null;
}

function isNegativeTop(item, deltaKg) {
  if (!item || !(Number(item.contribution_kg) < 0)) return false;
  const absC = Math.abs(Number(item.contribution_kg));
  if (absC < 1e-9) return false;
  const share = item.share_of_total_deviation;
  if (share != null && Math.abs(Number(share)) >= MATERIAL_SHARE) return true;
  if (deltaKg == null || Number(deltaKg) === 0) return true;
  return absC >= Math.abs(Number(deltaKg)) * MATERIAL_SHARE;
}

function displayClient(label) {
  const raw = String(label || "").trim();
  const idx = raw.indexOf(NAMESPACE);
  if (idx < 0) return raw;
  const plant = raw.slice(0, idx).trim();
  const name = raw.slice(idx + NAMESPACE.length).trim();
  return plant ? `${plant} · ${name}` : name;
}

function clientIdentity(label, identityByLabel, plantaId) {
  const raw = String(label || "");
  const known = identityByLabel && identityByLabel.get && identityByLabel.get(raw);
  if (known) return known;
  return { plantaId, clienteNorm: raw, plantLabel: "" };
}

function renderClientLine(item, contactsByNorm, identityByLabel, plantaId) {
  const kgTarget = Number(item.kg_target);
  const kgRef = Number(item.kg_reference);
  const contribution = Number(item.contribution_kg);
  if (!Number.isFinite(kgTarget) || !Number.isFinite(kgRef)) return "";
  let action = "";
  if (kgTarget === 0 && kgRef > 0) action = "dejó de comprar";
  else if (kgTarget > 0 && contribution < 0) action = `bajó ${formatKg(Math.abs(contribution))} kg`;
  else return "";
  const identity = clientIdentity(item.label || item.cliente_norm, identityByLabel, plantaId);
  const contact = formatContact(lookupContact(contactsByNorm, identity.plantaId, identity.clienteNorm));
  const name = displayClient(item.label || item.cliente_norm);
  return `${name}: ${action} (${formatKg(kgTarget)} vs ${formatKg(kgRef)} kg ref). Llamar y recuperar. ${contact}`;
}

function renderDailyComment(salesComputed, discountComputed, opts) {
  const detection = salesComputed && salesComputed.detection;
  if (!detection || detection.target_sales_kg == null) return "";
  const requested = opts && opts.targetDate;
  if (requested && detection.target_date && detection.target_date !== requested) return "";
  const target = detection.target_sales_kg;
  const reference = detection.reference_sales_kg;
  const observations = Number(detection.reference_observation_count) || 0;
  let line = "";
  if (reference == null || observations === 0) {
    line = `Venta: ${formatKg(target)} kg; referencia insuficiente.`;
  } else {
    const delta = detection.deviation_kg;
    const pct = detection.deviation_pct;
    const deltaText = delta == null ? "" : ` (${formatSignedKg(delta)} kg${pct == null ? "" : `; ${formatPct(pct)}`})`;
    line = `Venta: ${formatKg(target)} kg vs ref ${formatKg(reference)} kg${deltaText}.`;
  }
  const discount = discountComputed && discountComputed.detection;
  const discountTarget = discount && discount.target_ratio;
  const discountRef = discount && discount.reference_ratio;
  const discountDelta = discount && discount.delta_ratio;
  if (discountTarget != null && discountRef != null && discountDelta != null) {
    line += ` Desc.: ${formatMoney(discountTarget)}/kg vs ref ${formatMoney(discountRef)}/kg (${formatSignedMoney(discountDelta)}).`;
  } else {
    line += " Desc.: descuento/kg no calculable.";
  }
  const deltaKg = detection.deviation_kg;
  const pool = (salesComputed && (salesComputed.top_customers || salesComputed.customers)) || [];
  const negatives = pool
    .filter((item) => isNegativeTop(item, deltaKg))
    .slice()
    .sort((a, b) => {
      const diff = Math.abs(Number(b.contribution_kg) || 0) - Math.abs(Number(a.contribution_kg) || 0);
      if (diff !== 0) return diff;
      return String(a.label || "").localeCompare(String(b.label || ""), "es");
    });
  const lines = [line];
  for (const item of negatives) {
    const row = renderClientLine(item, opts && opts.contactsByNorm, opts && opts.identityByLabel, opts && opts.plantaId);
    if (row) lines.push(row);
  }
  return lines.join("\n");
}

function normalizeSalesRow(row) {
  const fecha = ymdFromValue(row && row.fecha);
  const kg = row && row.kg != null && row.kg !== "" ? Number(row.kg) : null;
  if (!fecha || !Number.isFinite(kg)) return null;
  return {
    fecha,
    cliente_norm: String((row && row.cliente_norm) || "").trim(),
    canal: String(row && row.canal != null ? row.canal : "").trim(),
    subcanal: String(row && row.subcanal != null ? row.subcanal : "").trim(),
    kg,
  };
}

function normalizeDiscountRow(row) {
  const fecha = ymdFromValue(row && row.fecha);
  const monto = row && row.monto != null && row.monto !== "" ? Number(row.monto) : null;
  if (!fecha || !Number.isFinite(monto)) return null;
  return {
    fecha,
    cliente_norm: String((row && row.cliente_norm) || "").trim(),
    monto,
  };
}

function newClientEvents(salesRows, year, month) {
  const prev = previousMonth(year, month);
  const prevPrefix = `${prev.year}-${pad2(prev.month)}`;
  const curPrefix = `${year}-${pad2(month)}`;
  const byClient = new Map();
  for (const raw of salesRows || []) {
    const row = raw && raw.fecha && raw.kg != null && raw.cliente_norm != null && raw.canal != null
      ? raw
      : normalizeSalesRow(raw);
    if (!row || !row.cliente_norm) continue;
    if (!byClient.has(row.cliente_norm)) byClient.set(row.cliente_norm, { prevKg: 0, days: new Map() });
    const rec = byClient.get(row.cliente_norm);
    if (row.fecha.startsWith(prevPrefix)) rec.prevKg += row.kg;
    if (row.fecha.startsWith(curPrefix)) rec.days.set(row.fecha, (rec.days.get(row.fecha) || 0) + row.kg);
  }
  const events = [];
  for (const [cliente, rec] of byClient) {
    if (rec.prevKg > 0) continue;
    let first = null;
    let kg = 0;
    for (const [fecha, dayKg] of rec.days) {
      if (!(dayKg > 0)) continue;
      if (first == null || fecha < first) {
        first = fecha;
        kg = dayKg;
      }
    }
    if (first) events.push({ fecha: first, cliente, kg });
  }
  events.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.cliente.localeCompare(b.cliente, "es"));
  return events;
}

function emptyBundle(opts, todayYmd, eligibleEnd, queryCount) {
  return {
    plantaId: opts && opts.plantaId != null ? Number(opts.plantaId) : null,
    plantaNombre: opts && opts.plantaNombre ? String(opts.plantaNombre) : "",
    plantLabel: opts && (opts.plantLabel || opts.plantaNombre) ? String(opts.plantLabel || opts.plantaNombre) : "",
    salesRows: [],
    discountRows: [],
    contactsByNorm: new Map(),
    queryCount: queryCount || 0,
    byDate: {},
    eligibleEnd: eligibleEnd || null,
    todayYmd: todayYmd || null,
  };
}

function ventasLinesForPlant(events, fecha) {
  return events
    .filter((event) => event.fecha === fecha)
    .map((event) => `NUEVO: ${event.cliente} — ${formatKg(event.kg)} kg`);
}

function buildPlantInsightMap(sources, opts) {
  const todayYmd = (opts && opts.todayYmd) || businessTodayYmd(opts && opts.now);
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const eligibleEnd = maxEligibleInsightYmd({ year, month, corteYmd: opts && opts.corteYmd, todayYmd });
  const salesRows = (sources && sources.salesRows) || [];
  const discountRows = (sources && sources.discountRows) || [];
  const byDate = {};
  if (!eligibleEnd) {
    return { byDate, eligibleEnd, todayYmd, queryCount: (sources && sources.queryCount) || 0 };
  }
  const corte = corteYmdOf(opts && opts.corteYmd);
  const events = newClientEvents(salesRows, year, month);
  const start = monthStartYmd(year, month);
  for (const fecha of eachYmd(start, eligibleEnd)) {
    if (corte && fecha >= corte) continue;
    const salesComputed = computeDailySalesDeviationFromRows(salesRows, { todayYmd, targetDate: fecha });
    const discountComputed = computeDailyDiscountDeviationFromRows(discountRows, salesRows, { todayYmd, targetDate: fecha });
    const comentario = renderDailyComment(salesComputed, discountComputed, {
      targetDate: fecha,
      contactsByNorm: sources && sources.contactsByNorm,
      plantaId: sources && sources.plantaId,
    });
    const ventas = ventasLinesForPlant(events, fecha).join("\n");
    if (comentario || ventas) byDate[fecha] = { comentario, ventas };
  }
  return { byDate, eligibleEnd, todayYmd, queryCount: (sources && sources.queryCount) || 0 };
}

function namespaceCliente(plantLabel, clienteNorm) {
  return `${plantLabel}${NAMESPACE}${String(clienteNorm || "").trim()}`;
}

function buildProvinceInsightMap(bundles, opts) {
  const todayYmd = (opts && opts.todayYmd) || businessTodayYmd(opts && opts.now);
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const eligibleEnd = maxEligibleInsightYmd({ year, month, corteYmd: opts && opts.corteYmd, todayYmd });
  const salesRows = [];
  const discountRows = [];
  const identityByLabel = new Map();
  const contactsByNorm = new Map();
  const events = [];
  for (const bundle of bundles || []) {
    const plantLabel = String((bundle && (bundle.plantLabel || bundle.plantaNombre)) || "").trim();
    const plantaId = bundle && bundle.plantaId;
    if (bundle && bundle.contactsByNorm && typeof bundle.contactsByNorm.forEach === "function") {
      bundle.contactsByNorm.forEach((value, key) => contactsByNorm.set(key, value));
    }
    for (const row of (bundle && bundle.salesRows) || []) {
      const original = String(row.cliente_norm || "").trim();
      if (!plantLabel || !original) continue;
      const label = namespaceCliente(plantLabel, original);
      salesRows.push({ ...row, cliente_norm: label });
      identityByLabel.set(label, { plantaId, clienteNorm: original, plantLabel });
    }
    for (const row of (bundle && bundle.discountRows) || []) {
      const original = String(row.cliente_norm || "").trim();
      if (!plantLabel || !original) continue;
      discountRows.push({ ...row, cliente_norm: namespaceCliente(plantLabel, original) });
    }
    for (const event of newClientEvents(bundle && bundle.salesRows, year, month)) {
      events.push({ ...event, plantLabel });
    }
  }
  const byDate = {};
  if (!eligibleEnd) return { byDate, eligibleEnd, todayYmd, queryCount: 0 };
  const corte = corteYmdOf(opts && opts.corteYmd);
  const start = monthStartYmd(year, month);
  events.sort((a, b) => a.plantLabel.localeCompare(b.plantLabel, "es") || a.cliente.localeCompare(b.cliente, "es"));
  for (const fecha of eachYmd(start, eligibleEnd)) {
    if (corte && fecha >= corte) continue;
    const salesComputed = computeDailySalesDeviationFromRows(salesRows, { todayYmd, targetDate: fecha });
    const discountComputed = computeDailyDiscountDeviationFromRows(discountRows, salesRows, { todayYmd, targetDate: fecha });
    const comentario = renderDailyComment(salesComputed, discountComputed, {
      targetDate: fecha,
      contactsByNorm,
      identityByLabel,
    });
    const ventas = events
      .filter((event) => event.fecha === fecha)
      .map((event) => `${event.plantLabel} · ${event.cliente} — ${formatKg(event.kg)} kg`)
      .join("\n");
    if (comentario || ventas) byDate[fecha] = { comentario, ventas };
  }
  return { byDate, eligibleEnd, todayYmd, queryCount: 0 };
}

async function safeQuery(client, sql, params, label) {
  try {
    const result = await client.query(sql, params);
    return (result && result.rows) || [];
  } catch (error) {
    console.error(`[igf-diario-daily-insights] ${label}`, error && error.message ? error.message : error);
    return [];
  }
}

async function loadPlantDailyInsights(client, opts) {
  const todayYmd = (opts && opts.todayYmd) || businessTodayYmd(opts && opts.now);
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const eligibleEnd = maxEligibleInsightYmd({ year, month, corteYmd: opts && opts.corteYmd, todayYmd });
  const base = emptyBundle(opts, todayYmd, eligibleEnd, 0);
  if (!eligibleEnd || !client || typeof client.query !== "function") return base;
  const plantaNombre = String((opts && opts.plantaNombre) || "").trim();
  const plantaId = Number(opts && opts.plantaId);
  const range = insightQueryRange(year, month, eligibleEnd);
  let queryCount = 0;
  let salesRows = [];
  let discountRows = [];
  const contactsByNorm = new Map();
  if (plantaNombre) {
    queryCount += 1;
    const salesRaw = await safeQuery(
      client,
      `WITH prov_map AS (${SQL_PROV_MAP})
       SELECT v.fecha::text AS fecha,
              v.cliente_norm,
              COALESCE(v.canal, '') AS canal,
              COALESCE(v.subcanal, '') AS subcanal,
              SUM(v.kg) AS kg
         FROM arr.ventas_diarias_cliente v
         JOIN prov_map pm
           ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
           OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
        WHERE pm.prov_name = $1
          AND v.fecha >= $2::date
          AND v.fecha <= $3::date
        GROUP BY v.fecha, v.cliente_norm, v.canal, v.subcanal`,
      [plantaNombre, range.start, range.end],
      "ventas"
    );
    salesRows = salesRaw.map(normalizeSalesRow).filter(Boolean);
    queryCount += 1;
    const discountRaw = await safeQuery(
      client,
      `WITH prov_map AS (${SQL_PROV_MAP})
       SELECT d.fecha::text AS fecha,
              d.cliente_norm,
              SUM(d.monto) AS monto
         FROM arr.descuentos_diarios_cliente d
         JOIN prov_map pm
           ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
           OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
        WHERE pm.prov_name = $1
          AND d.fecha >= $2::date
          AND d.fecha <= $3::date
        GROUP BY d.fecha, d.cliente_norm`,
      [plantaNombre, range.start, range.end],
      "descuentos"
    );
    discountRows = discountRaw.map(normalizeDiscountRow).filter(Boolean);
  }
  if (Number.isFinite(plantaId)) {
    queryCount += 1;
    const contactRows = await safeQuery(
      client,
      `SELECT planta_id, cliente_nombre_norm, nombre_contacto, telefono, correo
         FROM arr.cliente_contactos
        WHERE planta_id = $1`,
      [plantaId],
      "contactos"
    );
    for (const row of contactRows) {
      const key = contactKey(row.planta_id, row.cliente_nombre_norm);
      if (!key) continue;
      contactsByNorm.set(key, {
        nombre_contacto: row.nombre_contacto || "",
        telefono: row.telefono || "",
        correo: row.correo || "",
      });
    }
  }
  const sources = {
    plantaId: Number.isFinite(plantaId) ? plantaId : null,
    plantaNombre,
    plantLabel: base.plantLabel,
    salesRows,
    discountRows,
    contactsByNorm,
    queryCount,
  };
  const map = buildPlantInsightMap(sources, { ...opts, todayYmd });
  return { ...sources, ...map, queryCount };
}

module.exports = {
  BUSINESS_TZ,
  QUERIES_PER_PLANT,
  SQL_PROV_MAP,
  maxEligibleInsightYmd,
  insightQueryRange,
  formatKg,
  renderDailyComment,
  newClientEvents,
  buildPlantInsightMap,
  buildProvinceInsightMap,
  loadPlantDailyInsights,
};
