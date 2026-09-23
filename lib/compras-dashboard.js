"use strict";

/**
 * Módulo Compras del dashboard.
 * Captura: kg + importe. Costo/kg y consolidados son siempre SUM(importe)/SUM(kg).
 */

const crypto = require("crypto");

const PDF_MAGIC = Buffer.from("%PDF");
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const DEFAULT_PROVIDER_NAMES = Object.freeze(["PEMEX TUXPAN", "TOMZA TUXPAN", "TOMZA TEPEJI"]);

const USER_ERRORS = Object.freeze({
  SAVE: "No se pudo guardar la compra.",
  PLANT: "No tienes acceso a esta planta.",
  PROVIDER: "El proveedor no pertenece a esta planta.",
  INVOICE: "La factura no es válida.",
  INACTIVE: "El proveedor no está activo.",
});

function pad2(n) {
  return String(n).padStart(2, "0");
}

function ymd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** node-pg entrega DATE como Date (UTC midnight). String(date).slice(0,10) no es YYYY-MM-DD. */
function toYmd(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
}

const COMPRAS_MENU_PLANTAS = Object.freeze([
  "acapulco",
  "puebla",
  "tehuacan",
  "queretaro",
  "san luis",
  "morelos",
]);

function normComprasPlantaNombre(nombre) {
  return String(nombre || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function filterComprasPlantasMenu(plantas) {
  return (plantas || []).filter((p) => {
    const n = normComprasPlantaNombre(p && p.nombre);
    if (!n) return false;
    return COMPRAS_MENU_PLANTAS.includes(n);
  });
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function costKg(kg, importe) {
  const k = toNum(kg);
  const i = toNum(importe);
  if (k == null || i == null || k <= 0) return null;
  return i / k;
}

function addPair(acc, kg, importe) {
  const k = toNum(kg) || 0;
  const i = toNum(importe) || 0;
  acc.kg += k;
  acc.importe += i;
  return acc;
}

function pairOf(kg, importe) {
  const k = toNum(kg) || 0;
  const i = toNum(importe) || 0;
  return { kg: k, importe: i, costo_kg: costKg(k, i) };
}

function buildMonthRows(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new Error("año inválido");
  if (!Number.isInteger(m) || m < 1 || m > 12) throw new Error("mes inválido");
  const last = daysInMonth(y, m);
  const rows = [];
  let bucket = [];
  let weekNum = 0;
  for (let day = 1; day <= last; day += 1) {
    const date = new Date(y, m - 1, day);
    const item = { type: "day", ymd: ymd(y, m, day), day, dow: date.getDay() };
    bucket.push(item);
    if (date.getDay() === 6 || day === last) {
      weekNum += 1;
      for (const d of bucket) rows.push(d);
      rows.push({ type: "week", week: weekNum, ymds: bucket.map((d) => d.ymd) });
      bucket = [];
    }
  }
  return rows;
}

function isPdfBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 4 && buffer.subarray(0, 4).equals(PDF_MAGIC);
}

function validatePurchaseInput(body) {
  const kg = toNum(body && body.kg);
  const importe = toNum(body && body.importe);
  const fecha = toYmd(body && body.fecha);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: "fecha válida requerida" };
  if (kg == null || kg <= 0) return { ok: false, error: "kg debe ser mayor que 0" };
  if (importe == null || importe < 0) return { ok: false, error: "importe no puede ser negativo" };
  return { ok: true, kg, importe, fecha };
}

function validatePdfUpload(buffer, mimeType, fileName) {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(fileName || "").toLowerCase();
  if (!buffer || !buffer.length) return { ok: false, error: USER_ERRORS.INVOICE };
  if (buffer.length > MAX_PDF_BYTES) return { ok: false, error: USER_ERRORS.INVOICE };
  if (mime && mime !== "application/pdf") return { ok: false, error: USER_ERRORS.INVOICE };
  if (name && !name.endsWith(".pdf")) return { ok: false, error: USER_ERRORS.INVOICE };
  if (!isPdfBuffer(buffer)) return { ok: false, error: USER_ERRORS.INVOICE };
  return { ok: true };
}

function visibleProvidersForPeriod(providers, purchases) {
  const used = new Set((purchases || []).map((p) => Number(p.proveedor_id)));
  return (providers || []).filter((p) => p.activo !== false || used.has(Number(p.id)));
}

function aggregatePurchases(purchases, providers, year, month) {
  const rows = buildMonthRows(year, month);
  const byProvDay = new Map();
  const capturedDays = new Set();
  for (const p of purchases || []) {
    const fecha = toYmd(p.fecha);
    const key = `${p.proveedor_id}|${fecha}`;
    if (!byProvDay.has(key)) byProvDay.set(key, { kg: 0, importe: 0, count: 0, ids: [] });
    const cell = byProvDay.get(key);
    addPair(cell, p.kg, p.importe);
    cell.count += 1;
    cell.ids.push(p.id);
    capturedDays.add(fecha);
  }

  function cellFor(proveedorId, fecha) {
    const hit = byProvDay.get(`${proveedorId}|${fecha}`);
    if (!hit) return { kg: 0, importe: 0, costo_kg: null, count: 0, ids: [] };
    return { ...hit, costo_kg: costKg(hit.kg, hit.importe) };
  }

  function rollup(ymds) {
    const perProv = {};
    const cons = { kg: 0, importe: 0 };
    for (const prov of providers || []) {
      const acc = { kg: 0, importe: 0 };
      for (const fecha of ymds) {
        const c = cellFor(prov.id, fecha);
        addPair(acc, c.kg, c.importe);
      }
      perProv[prov.id] = { ...acc, costo_kg: costKg(acc.kg, acc.importe) };
      addPair(cons, acc.kg, acc.importe);
    }
    return { providers: perProv, consolidado: { ...cons, costo_kg: costKg(cons.kg, cons.importe) } };
  }

  const days = [];
  const weeks = [];
  for (const row of rows) {
    if (row.type === "day") {
      const cells = {};
      const cons = { kg: 0, importe: 0 };
      for (const prov of providers || []) {
        const c = cellFor(prov.id, row.ymd);
        cells[prov.id] = c;
        addPair(cons, c.kg, c.importe);
      }
      days.push({
        ymd: row.ymd,
        captured: capturedDays.has(row.ymd),
        cells,
        consolidado: { ...cons, costo_kg: costKg(cons.kg, cons.importe) },
      });
    } else {
      weeks.push({ week: row.week, ymds: row.ymds, ...rollup(row.ymds) });
    }
  }
  const monthYmds = days.map((d) => d.ymd);
  return {
    rows,
    days,
    weeks,
    month: rollup(monthYmds),
    captured_dates: [...capturedDays].sort(),
  };
}

async function ensureComprasTables(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS arr`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS arr.compras_proveedores (
      id SERIAL PRIMARY KEY,
      planta_id INT NOT NULL REFERENCES public.plantas(id),
      nombre TEXT NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      orden INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_compras_proveedores_planta_nombre
      ON arr.compras_proveedores (planta_id, lower(btrim(nombre)))
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_compras_proveedores_planta_activo_orden
      ON arr.compras_proveedores (planta_id, activo, orden)
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS arr.compras (
      id SERIAL PRIMARY KEY,
      planta_id INT NOT NULL REFERENCES public.plantas(id),
      proveedor_id INT NOT NULL REFERENCES arr.compras_proveedores(id),
      fecha DATE NOT NULL,
      kg NUMERIC(14,3) NOT NULL CHECK (kg > 0),
      importe NUMERIC(14,2) NOT NULL CHECK (importe >= 0),
      created_by_usuario_id INT NULL REFERENCES public.usuarios(id),
      updated_by_usuario_id INT NULL REFERENCES public.usuarios(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_compras_planta_fecha ON arr.compras (planta_id, fecha)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_compras_proveedor_fecha ON arr.compras (proveedor_id, fecha)`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS arr.compras_documentos (
      id SERIAL PRIMARY KEY,
      compra_id INT NOT NULL REFERENCES arr.compras(id) ON DELETE CASCADE,
      nombre_archivo TEXT NOT NULL,
      storage_key TEXT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INT NOT NULL,
      data BYTEA NULL,
      uploaded_by_usuario_id INT NULL REFERENCES public.usuarios(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_compras_documentos_compra ON arr.compras_documentos (compra_id)`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS arr.compras_hg (
      id SERIAL PRIMARY KEY,
      planta_id INT NOT NULL REFERENCES public.plantas(id),
      fecha DATE NOT NULL,
      hg_kilos NUMERIC(14,3) NOT NULL,
      created_by_usuario_id INT NULL REFERENCES public.usuarios(id),
      updated_by_usuario_id INT NULL REFERENCES public.usuarios(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (planta_id, fecha)
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_compras_hg_planta_fecha ON arr.compras_hg (planta_id, fecha)`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS arr.compras_flete_tarifas (
      id SERIAL PRIMARY KEY,
      planta_id INT NOT NULL REFERENCES public.plantas(id),
      proveedor_id INT NOT NULL REFERENCES arr.compras_proveedores(id),
      year INT NOT NULL,
      month INT NOT NULL,
      tarifa NUMERIC(14,6) NOT NULL CHECK (tarifa >= 0),
      created_by_usuario_id INT NULL REFERENCES public.usuarios(id),
      updated_by_usuario_id INT NULL REFERENCES public.usuarios(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (planta_id, proveedor_id, year, month)
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_compras_flete_tarifas_planta_periodo
      ON arr.compras_flete_tarifas (planta_id, year, month)
  `);
}

function mapProvider(row) {
  return {
    id: Number(row.id),
    planta_id: Number(row.planta_id),
    nombre: String(row.nombre || ""),
    activo: row.activo !== false,
    orden: Number(row.orden) || 0,
  };
}

function mapPurchase(row) {
  return {
    id: Number(row.id),
    planta_id: Number(row.planta_id),
    proveedor_id: Number(row.proveedor_id),
    fecha: toYmd(row.fecha),
    kg: toNum(row.kg),
    importe: toNum(row.importe),
    created_by_usuario_id: row.created_by_usuario_id != null ? Number(row.created_by_usuario_id) : null,
    updated_by_usuario_id: row.updated_by_usuario_id != null ? Number(row.updated_by_usuario_id) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapHg(row) {
  return {
    id: Number(row.id),
    planta_id: Number(row.planta_id),
    fecha: toYmd(row.fecha),
    hg_kilos: toNum(row.hg_kilos),
    created_by_usuario_id: row.created_by_usuario_id != null ? Number(row.created_by_usuario_id) : null,
    updated_by_usuario_id: row.updated_by_usuario_id != null ? Number(row.updated_by_usuario_id) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function parseHgInput(body) {
  const fecha = toYmd(body && body.fecha);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: "fecha válida requerida" };
  if (body == null || body.hg_kilos === "" || body.hg_kilos === null || body.hg_kilos === undefined) {
    return { ok: true, fecha, empty: true };
  }
  const n = toNum(body.hg_kilos);
  if (n == null) return { ok: false, error: "hg_kilos inválido" };
  return { ok: true, fecha, empty: false, hg_kilos: n };
}

function sumHgYmds(byFecha, ymds) {
  let sum = 0;
  let any = false;
  for (const y of ymds || []) {
    if (byFecha.has(y)) {
      sum += byFecha.get(y);
      any = true;
    }
  }
  return any ? sum : null;
}

function mapFleteTarifa(row) {
  return {
    id: Number(row.id),
    planta_id: Number(row.planta_id),
    proveedor_id: Number(row.proveedor_id),
    year: Number(row.year),
    month: Number(row.month),
    tarifa: toNum(row.tarifa),
    created_by_usuario_id: row.created_by_usuario_id != null ? Number(row.created_by_usuario_id) : null,
    updated_by_usuario_id: row.updated_by_usuario_id != null ? Number(row.updated_by_usuario_id) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function parseFleteTarifaInput(body) {
  const proveedorId = Number(body && body.proveedor_id);
  const year = Number(body && body.year);
  const month = Number(body && body.month);
  if (!Number.isInteger(proveedorId) || proveedorId <= 0) return { ok: false, error: "proveedor_id requerido" };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, error: "year inválido" };
  if (!Number.isInteger(month) || month < 1 || month > 12) return { ok: false, error: "month inválido" };
  if (body == null || body.tarifa === "" || body.tarifa === null || body.tarifa === undefined) {
    return { ok: true, proveedor_id: proveedorId, year, month, empty: true };
  }
  const n = toNum(body.tarifa);
  if (n == null || n < 0) return { ok: false, error: "tarifa inválida" };
  return { ok: true, proveedor_id: proveedorId, year, month, empty: false, tarifa: n };
}

function hgCosto(costoKg, tarifa) {
  const c = toNum(costoKg);
  const t = toNum(tarifa);
  if (c == null || t == null) return null;
  return Math.round((c + t) * 1000) / 1000;
}

function hgImporte(costo, hgKilos) {
  const c = toNum(costo);
  const h = toNum(hgKilos);
  if (c == null || h == null) return null;
  const n = Math.round(c * h * -1 * 100) / 100;
  return n === 0 ? 0 : n;
}

function hgImporteSum(days) {
  let sum = 0;
  let saw = false;
  for (const d of days || []) {
    if (d == null || toNum(d.hg_kilos) == null) continue;
    const imp = d.hg_importe_efectivo !== undefined
      ? d.hg_importe_efectivo
      : hgImporte(
        hgCosto(
          d.consolidado && d.consolidado.costo_kg,
          d.flete && d.flete.consolidado && d.flete.consolidado.tarifa
        ),
        d.hg_kilos
      );
    if (imp == null) return null;
    sum += imp;
    saw = true;
  }
  return saw ? Math.round(sum * 100) / 100 : null;
}

function isPositiveHgCost(value) {
  const n = toNum(value);
  return n != null && n > 0;
}

/** Costo HG crudo del día. Costo de compra 0 o ausente no abre una secuencia nueva. */
function rawDailyHgCost(day) {
  const compra = toNum(day && day.consolidado && day.consolidado.costo_kg);
  const tarifa = toNum(day && day.flete && day.flete.consolidado && day.flete.consolidado.tarifa);
  if (compra == null || compra <= 0 || tarifa == null || tarifa < 0) return null;
  const raw = hgCosto(compra, tarifa);
  return isPositiveHgCost(raw) ? raw : null;
}

function applyHgCostCarryForward(grid, seedCost) {
  let prev = isPositiveHgCost(seedCost) ? Number(seedCost) : null;
  const days = [...((grid && grid.days) || [])].sort((a, b) => String(a.ymd).localeCompare(String(b.ymd)));
  for (const day of days) {
    const raw = rawDailyHgCost(day);
    const effective = raw != null ? raw : prev;
    day.hg_costo_efectivo = effective;
    day.hg_importe_efectivo = hgImporte(effective, day.hg_kilos);
    if (effective != null) prev = effective;
  }
  return grid;
}

function latestHgCostFromHistory(purchaseRows, tarifaRows) {
  const tarifas = new Map();
  for (const t of tarifaRows || []) {
    const n = toNum(t.tarifa);
    if (n == null || n < 0) continue;
    tarifas.set(`${Number(t.proveedor_id)}|${Number(t.year)}|${Number(t.month)}`, n);
  }
  const byDate = new Map();
  for (const row of purchaseRows || []) {
    const fecha = toYmd(row.fecha);
    if (!fecha) continue;
    if (!byDate.has(fecha)) byDate.set(fecha, []);
    byDate.get(fecha).push(row);
  }
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
  for (const fecha of dates) {
    const [year, month] = fecha.split("-").map(Number);
    let kg = 0;
    let importe = 0;
    const cells = [];
    for (const row of byDate.get(fecha)) {
      const k = toNum(row.kg) || 0;
      const i = toNum(row.importe) || 0;
      kg += k;
      importe += i;
      const tarifa = tarifas.get(`${Number(row.proveedor_id)}|${year}|${month}`);
      cells.push(freightCell(k, tarifa == null ? null : tarifa));
    }
    const raw = rawDailyHgCost({
      consolidado: { costo_kg: costKg(kg, importe) },
      flete: { consolidado: { tarifa: freightConsolidado(cells).tarifa } },
    });
    if (raw != null) return raw;
  }
  return null;
}

async function loadLatestHgCostBeforeDate(client, plantaId, beforeYmd) {
  if (!client || typeof client.query !== "function") return null;
  const purch = await client.query(
    `SELECT fecha, proveedor_id, SUM(kg) AS kg, SUM(importe) AS importe
       FROM arr.compras
      WHERE planta_id = $1 AND fecha < $2::date
      GROUP BY fecha, proveedor_id
      ORDER BY fecha DESC`,
    [plantaId, beforeYmd]
  );
  const tarifas = await client.query(
    `SELECT proveedor_id, year, month, tarifa
       FROM arr.compras_flete_tarifas
      WHERE planta_id = $1`,
    [plantaId]
  );
  return latestHgCostFromHistory(purch.rows || [], tarifas.rows || []);
}

function freightImporte(kg, tarifa) {
  const k = toNum(kg) || 0;
  const t = toNum(tarifa);
  if (t == null) return k === 0 ? 0 : null;
  return Math.round(k * t * 100) / 100;
}

function freightCell(kg, tarifa) {
  const k = toNum(kg) || 0;
  const t = toNum(tarifa);
  return { kg: k, tarifa: t, importe: freightImporte(k, t) };
}

function freightWeightedTarifa(kg, importe) {
  const k = toNum(kg) || 0;
  const i = toNum(importe);
  if (k <= 0 || i == null) return null;
  return i / k;
}

function hasMissingTarifaForPositiveKg(cells) {
  return (cells || []).some((c) => (toNum(c && c.kg) || 0) > 0 && toNum(c && c.tarifa) == null);
}

function freightConsolidado(cells) {
  let consKg = 0;
  let consImp = 0;
  const incomplete = hasMissingTarifaForPositiveKg(cells);
  for (const cell of cells || []) {
    consKg += toNum(cell && cell.kg) || 0;
    if (!incomplete) consImp += toNum(cell && cell.importe) || 0;
  }
  if (incomplete) {
    return { kg: consKg, importe: null, tarifa: null, incomplete: true };
  }
  consImp = Math.round(consImp * 100) / 100;
  return {
    kg: consKg,
    importe: consImp,
    tarifa: freightWeightedTarifa(consKg, consImp),
    incomplete: false,
  };
}

function freightRollup(providers, ymds, dayMap, tarifas) {
  const perProv = {};
  const cells = [];
  for (const prov of providers || []) {
    let kg = 0;
    for (const fecha of ymds || []) {
      const day = dayMap.get(fecha);
      const cell = day && (day.providers[prov.id] || day.providers[String(prov.id)]);
      kg += cell ? Number(cell.kg) || 0 : 0;
    }
    const next = freightCell(kg, tarifas.has(Number(prov.id)) ? tarifas.get(Number(prov.id)) : null);
    perProv[prov.id] = next;
    cells.push(next);
  }
  return { providers: perProv, consolidado: freightConsolidado(cells) };
}

function attachFleteToGrid(grid, tarifas, providers) {
  const byProv = new Map();
  for (const t of tarifas || []) {
    const id = Number(t.proveedor_id);
    const n = toNum(t.tarifa);
    if (Number.isFinite(id) && n != null) byProv.set(id, n);
  }
  const dayMap = new Map();
  for (const day of (grid && grid.days) || []) {
    const fleteProviders = {};
    const cells = [];
    for (const prov of providers || []) {
      const purchase = (day.cells && (day.cells[prov.id] || day.cells[String(prov.id)])) || { kg: 0 };
      const cell = freightCell(purchase.kg, byProv.has(Number(prov.id)) ? byProv.get(Number(prov.id)) : null);
      fleteProviders[prov.id] = cell;
      cells.push(cell);
    }
    day.flete = { providers: fleteProviders, consolidado: freightConsolidado(cells) };
    dayMap.set(day.ymd, day.flete);
  }
  for (const week of (grid && grid.weeks) || []) {
    week.flete = freightRollup(providers, week.ymds, dayMap, byProv);
  }
  if (grid && grid.month) {
    grid.month.flete = freightRollup(providers, ((grid.days || []).map((d) => d.ymd)), dayMap, byProv);
  }
  return grid;
}

function attachHgToGrid(grid, hgRows) {
  const byFecha = new Map();
  for (const h of hgRows || []) {
    const fecha = toYmd(h.fecha);
    const n = toNum(h.hg_kilos);
    if (fecha && n != null) byFecha.set(fecha, n);
  }
  for (const day of (grid && grid.days) || []) {
    day.hg_kilos = byFecha.has(day.ymd) ? byFecha.get(day.ymd) : null;
  }
  for (const week of (grid && grid.weeks) || []) {
    week.hg_kilos = sumHgYmds(byFecha, week.ymds);
  }
  if (grid && grid.month) {
    grid.month.hg_kilos = sumHgYmds(byFecha, ((grid.days || []).map((d) => d.ymd)));
  }
  return grid;
}

function mapDocument(row) {
  return {
    id: Number(row.id),
    compra_id: Number(row.compra_id),
    nombre_archivo: String(row.nombre_archivo || ""),
    mime_type: String(row.mime_type || "application/pdf"),
    size_bytes: Number(row.size_bytes) || 0,
    created_at: row.created_at,
  };
}

function normProviderName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function orderSheetProviders(providers) {
  const list = Array.isArray(providers) ? [...providers] : [];
  const used = new Set();
  const ordered = [];
  for (const name of DEFAULT_PROVIDER_NAMES) {
    const hit = list.find((p) => !used.has(p.id) && normProviderName(p.nombre) === normProviderName(name));
    if (hit) {
      ordered.push(hit);
      used.add(hit.id);
    }
  }
  for (const p of list) {
    if (!used.has(p.id)) ordered.push(p);
  }
  return ordered;
}

async function ensureRequiredProviders(client, plantaId) {
  const existing = await listProviders(client, plantaId, { includeInactive: true });
  const byNorm = new Map(existing.map((p) => [normProviderName(p.nombre), p]));
  let created = 0;
  for (let i = 0; i < DEFAULT_PROVIDER_NAMES.length; i += 1) {
    const name = DEFAULT_PROVIDER_NAMES[i];
    const hit = byNorm.get(normProviderName(name));
    if (!hit) {
      const out = await createProvider(client, plantaId, { nombre: name, orden: i });
      if (out.ok) {
        created += 1;
        byNorm.set(normProviderName(name), out.provider);
      }
    } else if (Number(hit.orden) !== i) {
      await patchProvider(client, plantaId, hit.id, { orden: i });
    }
  }
  const all = await listProviders(client, plantaId, { includeInactive: true });
  return { seeded: created > 0, providers: orderSheetProviders(all) };
}

async function ensureDefaultProviders(client, plantaId) {
  return ensureRequiredProviders(client, plantaId);
}

async function listProviders(client, plantaId, opts = {}) {
  const includeInactive = opts.includeInactive === true;
  const r = await client.query(
    `SELECT id, planta_id, nombre, activo, orden
     FROM arr.compras_proveedores
     WHERE planta_id = $1 ${includeInactive ? "" : "AND activo = true"}
     ORDER BY orden ASC, id ASC`,
    [plantaId]
  );
  return (r.rows || []).map(mapProvider);
}

async function createProvider(client, plantaId, body) {
  const nombre = String((body && body.nombre) || "").trim();
  if (!nombre) return { ok: false, status: 400, error: "nombre requerido" };
  const orden = Number.isFinite(Number(body && body.orden)) ? Number(body.orden) : 0;
  const ins = await client.query(
    `INSERT INTO arr.compras_proveedores (planta_id, nombre, activo, orden)
     VALUES ($1, $2, true, $3)
     RETURNING id, planta_id, nombre, activo, orden`,
    [plantaId, nombre, orden]
  );
  return { ok: true, provider: mapProvider(ins.rows[0]) };
}

async function patchProvider(client, plantaId, providerId, body) {
  const cur = await client.query(`SELECT * FROM arr.compras_proveedores WHERE id = $1`, [providerId]);
  if (!cur.rows[0]) return { ok: false, status: 404, error: "Proveedor no encontrado" };
  if (Number(cur.rows[0].planta_id) !== Number(plantaId)) {
    return { ok: false, status: 403, error: USER_ERRORS.PROVIDER };
  }
  const nombre = body.nombre != null ? String(body.nombre).trim() : cur.rows[0].nombre;
  const activo = body.activo != null ? Boolean(body.activo) : cur.rows[0].activo;
  const orden = body.orden != null && Number.isFinite(Number(body.orden)) ? Number(body.orden) : cur.rows[0].orden;
  if (!nombre) return { ok: false, status: 400, error: "nombre requerido" };
  const upd = await client.query(
    `UPDATE arr.compras_proveedores
     SET nombre = $2, activo = $3, orden = $4, updated_at = now()
     WHERE id = $1
     RETURNING id, planta_id, nombre, activo, orden`,
    [providerId, nombre, activo, orden]
  );
  return { ok: true, provider: mapProvider(upd.rows[0]) };
}

async function assertProviderInPlant(client, proveedorId, plantaId, opts = {}) {
  const r = await client.query(`SELECT id, planta_id, activo FROM arr.compras_proveedores WHERE id = $1`, [proveedorId]);
  if (!r.rows[0]) return { ok: false, status: 404, error: "Proveedor no encontrado" };
  if (Number(r.rows[0].planta_id) !== Number(plantaId)) {
    return { ok: false, status: 403, error: USER_ERRORS.PROVIDER };
  }
  if (opts.requireActive && r.rows[0].activo === false) {
    return { ok: false, status: 400, error: USER_ERRORS.INACTIVE };
  }
  return { ok: true, provider: mapProvider(r.rows[0]) };
}

async function loadMonth(client, plantaId, year, month) {
  const start = ymd(year, month, 1);
  const end = ymd(year, month, daysInMonth(year, month));
  await ensureRequiredProviders(client, plantaId);
  const providers = await listProviders(client, plantaId, { includeInactive: true });
  const purch = await client.query(
    `SELECT id, planta_id, proveedor_id, fecha, kg, importe,
            created_by_usuario_id, updated_by_usuario_id, created_at, updated_at
     FROM arr.compras
     WHERE planta_id = $1 AND fecha >= $2::date AND fecha <= $3::date
     ORDER BY fecha ASC, id ASC`,
    [plantaId, start, end]
  );
  const purchases = (purch.rows || []).map(mapPurchase);
  const ids = purchases.map((p) => p.id);
  let documents = [];
  if (ids.length) {
    const docs = await client.query(
      `SELECT id, compra_id, nombre_archivo, mime_type, size_bytes, created_at
       FROM arr.compras_documentos
       WHERE compra_id = ANY($1::int[])
       ORDER BY id ASC`,
      [ids]
    );
    documents = (docs.rows || []).map(mapDocument);
  }
  const ordered = orderSheetProviders(providers);
  const required = [];
  const extras = [];
  for (const p of ordered) {
    const isRequired = DEFAULT_PROVIDER_NAMES.some((n) => normProviderName(n) === normProviderName(p.nombre));
    if (isRequired && !required.some((r) => r.id === p.id) && required.length < DEFAULT_PROVIDER_NAMES.length) {
      required.push(p);
    } else extras.push(p);
  }
  const extraVisible = visibleProvidersForPeriod(extras, purchases);
  const sheetProviders = [...required, ...extraVisible];
  const grid = aggregatePurchases(purchases, sheetProviders, year, month);
  const hgRes = await client.query(
    `SELECT id, planta_id, fecha, hg_kilos, created_by_usuario_id, updated_by_usuario_id, created_at, updated_at
     FROM arr.compras_hg
     WHERE planta_id = $1 AND fecha >= $2::date AND fecha <= $3::date
     ORDER BY fecha ASC, id ASC`,
    [plantaId, start, end]
  );
  const hg = (hgRes.rows || []).map(mapHg);
  attachHgToGrid(grid, hg);
  const tarifaRes = await client.query(
    `SELECT id, planta_id, proveedor_id, year, month, tarifa,
            created_by_usuario_id, updated_by_usuario_id, created_at, updated_at
     FROM arr.compras_flete_tarifas
     WHERE planta_id = $1 AND year = $2 AND month = $3
     ORDER BY id ASC`,
    [plantaId, Number(year), Number(month)]
  );
  const tarifas_flete = (tarifaRes.rows || []).map(mapFleteTarifa);
  attachFleteToGrid(grid, tarifas_flete, sheetProviders);
  const seed = await loadLatestHgCostBeforeDate(client, plantaId, start);
  applyHgCostCarryForward(grid, seed);
  return {
    plant: { id: Number(plantaId) },
    year: Number(year),
    month: Number(month),
    providers: sheetProviders,
    all_providers: orderSheetProviders(providers),
    purchases,
    documents,
    hg,
    tarifas_flete,
    grid,
  };
}

async function upsertFleteTarifa(client, plantaId, body, actorId) {
  const parsed = parseFleteTarifaInput(body);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const own = await assertProviderInPlant(client, parsed.proveedor_id, plantaId);
  if (!own.ok) return own;
  if (parsed.empty) {
    const del = await deleteFleteTarifa(client, plantaId, parsed.proveedor_id, parsed.year, parsed.month);
    return del.ok ? { ok: true, deleted: true, proveedor_id: parsed.proveedor_id, year: parsed.year, month: parsed.month } : del;
  }
  const ins = await client.query(
    `INSERT INTO arr.compras_flete_tarifas
       (planta_id, proveedor_id, year, month, tarifa, created_by_usuario_id, updated_by_usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (planta_id, proveedor_id, year, month)
     DO UPDATE SET tarifa = EXCLUDED.tarifa, updated_by_usuario_id = EXCLUDED.updated_by_usuario_id, updated_at = now()
     RETURNING id, planta_id, proveedor_id, year, month, tarifa,
               created_by_usuario_id, updated_by_usuario_id, created_at, updated_at`,
    [plantaId, parsed.proveedor_id, parsed.year, parsed.month, parsed.tarifa, actorId || null]
  );
  return { ok: true, tarifa: mapFleteTarifa(ins.rows[0]) };
}

async function deleteFleteTarifa(client, plantaId, proveedorId, year, month) {
  const parsed = parseFleteTarifaInput({ proveedor_id: proveedorId, year, month, tarifa: null });
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  await client.query(
    `DELETE FROM arr.compras_flete_tarifas
     WHERE planta_id = $1 AND proveedor_id = $2 AND year = $3 AND month = $4`,
    [plantaId, parsed.proveedor_id, parsed.year, parsed.month]
  );
  return { ok: true, deleted: true, proveedor_id: parsed.proveedor_id, year: parsed.year, month: parsed.month };
}

async function upsertHg(client, plantaId, body, actorId) {
  const parsed = parseHgInput(body);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  if (parsed.empty) {
    const del = await deleteHg(client, plantaId, parsed.fecha);
    return del.ok ? { ok: true, deleted: true, fecha: parsed.fecha } : del;
  }
  const ins = await client.query(
    `INSERT INTO arr.compras_hg (planta_id, fecha, hg_kilos, created_by_usuario_id, updated_by_usuario_id)
     VALUES ($1, $2::date, $3, $4, $4)
     ON CONFLICT (planta_id, fecha)
     DO UPDATE SET hg_kilos = EXCLUDED.hg_kilos, updated_by_usuario_id = EXCLUDED.updated_by_usuario_id, updated_at = now()
     RETURNING id, planta_id, fecha, hg_kilos, created_by_usuario_id, updated_by_usuario_id, created_at, updated_at`,
    [plantaId, parsed.fecha, parsed.hg_kilos, actorId || null]
  );
  return { ok: true, hg: mapHg(ins.rows[0]) };
}

async function deleteHg(client, plantaId, fecha) {
  const y = toYmd(fecha);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) return { ok: false, status: 400, error: "fecha válida requerida" };
  await client.query(`DELETE FROM arr.compras_hg WHERE planta_id = $1 AND fecha = $2::date`, [plantaId, y]);
  return { ok: true, deleted: true, fecha: y };
}

async function createPurchase(client, plantaId, body, actorId) {
  const parsed = validatePurchaseInput(body);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const proveedorId = Number(body && body.proveedor_id);
  if (!Number.isFinite(proveedorId)) return { ok: false, status: 400, error: "proveedor_id requerido" };
  const own = await assertProviderInPlant(client, proveedorId, plantaId, { requireActive: true });
  if (!own.ok) return own;
  const ins = await client.query(
    `INSERT INTO arr.compras (planta_id, proveedor_id, fecha, kg, importe, created_by_usuario_id, updated_by_usuario_id)
     VALUES ($1, $2, $3::date, $4, $5, $6, $6)
     RETURNING id, planta_id, proveedor_id, fecha, kg, importe, created_by_usuario_id, updated_by_usuario_id, created_at, updated_at`,
    [plantaId, proveedorId, parsed.fecha, parsed.kg, parsed.importe, actorId || null]
  );
  return { ok: true, purchase: mapPurchase(ins.rows[0]) };
}

async function loadPurchase(client, compraId) {
  const r = await client.query(
    `SELECT id, planta_id, proveedor_id, fecha, kg, importe, created_by_usuario_id, updated_by_usuario_id, created_at, updated_at
     FROM arr.compras WHERE id = $1`,
    [compraId]
  );
  return r.rows[0] ? mapPurchase(r.rows[0]) : null;
}

async function patchPurchase(client, compraId, plantaId, body, actorId) {
  const cur = await loadPurchase(client, compraId);
  if (!cur) return { ok: false, status: 404, error: "Compra no encontrada" };
  if (Number(cur.planta_id) !== Number(plantaId)) return { ok: false, status: 403, error: USER_ERRORS.PLANT };
  const next = {
    kg: body.kg != null ? body.kg : cur.kg,
    importe: body.importe != null ? body.importe : cur.importe,
    fecha: body.fecha != null ? body.fecha : cur.fecha,
  };
  const parsed = validatePurchaseInput(next);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  if (body.proveedor_id != null) {
    const own = await assertProviderInPlant(client, Number(body.proveedor_id), plantaId, { requireActive: true });
    if (!own.ok) return own;
  }
  const proveedorId = body.proveedor_id != null ? Number(body.proveedor_id) : cur.proveedor_id;
  const upd = await client.query(
    `UPDATE arr.compras
     SET proveedor_id = $2, fecha = $3::date, kg = $4, importe = $5, updated_by_usuario_id = $6, updated_at = now()
     WHERE id = $1
     RETURNING id, planta_id, proveedor_id, fecha, kg, importe, created_by_usuario_id, updated_by_usuario_id, created_at, updated_at`,
    [compraId, proveedorId, parsed.fecha, parsed.kg, parsed.importe, actorId || null]
  );
  return { ok: true, purchase: mapPurchase(upd.rows[0]) };
}

async function deletePurchase(client, compraId, plantaId) {
  const cur = await loadPurchase(client, compraId);
  if (!cur) return { ok: false, status: 404, error: "Compra no encontrada" };
  if (Number(cur.planta_id) !== Number(plantaId)) return { ok: false, status: 403, error: USER_ERRORS.PLANT };
  await client.query(`DELETE FROM arr.compras WHERE id = $1`, [compraId]);
  return { ok: true };
}

async function listDocumentsByCompra(client, compraId) {
  const r = await client.query(
    `SELECT id, compra_id, nombre_archivo, storage_key, mime_type, size_bytes, created_at
     FROM arr.compras_documentos
     WHERE compra_id = $1
     ORDER BY id ASC`,
    [compraId]
  );
  return (r.rows || []).map((row) => ({ ...mapDocument(row), storage_key: row.storage_key || null }));
}

function storageKeysOf(docs) {
  return (docs || []).map((d) => d.storage_key).filter((k) => k && String(k).trim());
}

async function deleteStorageKeys(keys, deleteFromS3) {
  const list = storageKeysOf(keys.map((k) => (typeof k === "string" ? { storage_key: k } : k)));
  if (!list.length) return { ok: true, skipped: true };
  if (typeof deleteFromS3 !== "function") return { ok: false, error: USER_ERRORS.SAVE };
  for (const key of list) {
    await deleteFromS3(key);
  }
  return { ok: true };
}

async function compensateOrphanS3Object(storageKey, deleteFromS3) {
  if (!storageKey) return { ok: true, skipped: true };
  try {
    if (typeof deleteFromS3 !== "function") {
      console.error("[Compras factura S3 compensate] missing deleteFromS3", storageKey);
      return { ok: false, skipped: false };
    }
    await deleteFromS3(storageKey);
    return { ok: true };
  } catch (e) {
    console.error("[Compras factura S3 compensate failed]", storageKey, e && e.message);
    return { ok: false };
  }
}

async function persistInvoiceMetadata(client, compraId, plantaId, meta, actorId, deleteFromS3) {
  try {
    const out = await attachDocument(client, compraId, plantaId, meta, actorId);
    if (!out.ok) {
      await compensateOrphanS3Object(meta && meta.storage_key, deleteFromS3);
    }
    return out;
  } catch (e) {
    await compensateOrphanS3Object(meta && meta.storage_key, deleteFromS3);
    throw e;
  }
}

async function authorizeInvoiceUpload(client, compraId, plantaId, buffer, mimeType, fileName) {
  const cur = await loadPurchase(client, compraId);
  if (!cur) return { ok: false, status: 404, error: "Compra no encontrada" };
  if (Number(cur.planta_id) !== Number(plantaId)) return { ok: false, status: 403, error: USER_ERRORS.PLANT };
  const valid = validatePdfUpload(buffer, mimeType, fileName);
  if (!valid.ok) return { ok: false, status: 400, error: valid.error };
  return { ok: true, purchase: cur };
}

async function attachDocument(client, compraId, plantaId, meta, actorId) {
  const ready = await authorizeInvoiceUpload(client, compraId, plantaId, meta.buffer, meta.mime_type, meta.nombre_archivo);
  if (!ready.ok) return ready;
  const ins = await client.query(
    `INSERT INTO arr.compras_documentos
      (compra_id, nombre_archivo, storage_key, mime_type, size_bytes, data, uploaded_by_usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, compra_id, nombre_archivo, mime_type, size_bytes, created_at`,
    [
      compraId,
      String(meta.nombre_archivo || "factura.pdf"),
      meta.storage_key || null,
      "application/pdf",
      meta.buffer.length,
      meta.data || null,
      actorId || null,
    ]
  );
  return { ok: true, document: mapDocument(ins.rows[0]) };
}

async function loadDocument(client, compraId, documentoId) {
  const r = await client.query(
    `SELECT d.id, d.compra_id, d.nombre_archivo, d.storage_key, d.mime_type, d.size_bytes, d.data, d.created_at,
            c.planta_id
     FROM arr.compras_documentos d
     JOIN arr.compras c ON c.id = d.compra_id
     WHERE d.id = $1 AND d.compra_id = $2`,
    [documentoId, compraId]
  );
  return r.rows[0] || null;
}

function registerComprasRoutes(app, deps) {
  const pool = deps.pool;
  const auth = deps.dashboardAuthMiddleware;
  const assertPlant = deps.assertPlantaAccess;
  const uploadPdf = deps.uploadPdfToS3;
  const getBuffer = deps.getBufferFromS3;
  const deleteFromS3 = deps.deleteFromS3;
  const isS3 = typeof deps.s3Enabled === "function" ? deps.s3Enabled : () => Boolean(deps.s3Enabled);

  function actorId(req) {
    return req.dashboardAuth && req.dashboardAuth.actor_id != null ? Number(req.dashboardAuth.actor_id) : null;
  }

  function requirePlant(req, res) {
    const plantaId = parseInt(String(req.query.planta_id || req.body && req.body.planta_id || ""), 10);
    if (!Number.isFinite(plantaId) || plantaId <= 0) {
      res.status(400).json({ error: "planta_id requerido" });
      return null;
    }
    if (!assertPlant(req, plantaId)) {
      res.status(403).json({ error: USER_ERRORS.PLANT });
      return null;
    }
    return plantaId;
  }

  app.get("/api/compras/proveedores", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      await ensureDefaultProviders(client, plantaId);
      const providers = await listProviders(client, plantaId, { includeInactive: true });
      res.json({ providers });
    } catch (e) {
      console.error("[Compras GET proveedores]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.post("/api/compras/proveedores", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const out = await createProvider(client, plantaId, req.body || {});
      if (!out.ok) return res.status(out.status || 400).json({ error: out.error });
      res.status(201).json(out);
    } catch (e) {
      console.error("[Compras POST proveedor]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.patch("/api/compras/proveedores/:id", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const id = parseInt(String(req.params.id), 10);
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const out = await patchProvider(client, plantaId, id, req.body || {});
      if (!out.ok) return res.status(out.status || 400).json({ error: out.error });
      res.json(out);
    } catch (e) {
      console.error("[Compras PATCH proveedor]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.get("/api/compras", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const year = parseInt(String(req.query.year), 10);
    const month = parseInt(String(req.query.month), 10);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "year y month requeridos" });
    }
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const payload = await loadMonth(client, plantaId, year, month);
      res.json(payload);
    } catch (e) {
      console.error("[Compras GET mes]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.post("/api/compras/hg", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const out = await upsertHg(client, plantaId, req.body || {}, actorId(req));
      if (!out.ok) return res.status(out.status || 400).json({ error: out.error });
      res.json(out);
    } catch (e) {
      console.error("[Compras POST hg]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.post("/api/compras/flete-tarifa", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const out = await upsertFleteTarifa(client, plantaId, req.body || {}, actorId(req));
      if (!out.ok) return res.status(out.status || 400).json({ error: out.error });
      res.json(out);
    } catch (e) {
      console.error("[Compras POST flete-tarifa]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.delete("/api/compras/flete-tarifa", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const proveedorId = parseInt(String(req.query.proveedor_id || (req.body && req.body.proveedor_id) || ""), 10);
    const year = parseInt(String(req.query.year || (req.body && req.body.year) || ""), 10);
    const month = parseInt(String(req.query.month || (req.body && req.body.month) || ""), 10);
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const own = await assertProviderInPlant(client, proveedorId, plantaId);
      if (!own.ok) return res.status(own.status || 400).json({ error: own.error });
      const out = await deleteFleteTarifa(client, plantaId, proveedorId, year, month);
      if (!out.ok) return res.status(out.status || 400).json({ error: out.error });
      res.json(out);
    } catch (e) {
      console.error("[Compras DELETE flete-tarifa]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.delete("/api/compras/hg", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const fecha = toYmd(req.query.fecha || (req.body && req.body.fecha));
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const out = await deleteHg(client, plantaId, fecha);
      if (!out.ok) return res.status(out.status || 400).json({ error: out.error });
      res.json(out);
    } catch (e) {
      console.error("[Compras DELETE hg]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.get("/api/compras/excel", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const year = parseInt(String(req.query.year), 10);
    const month = parseInt(String(req.query.month), 10);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "year y month requeridos" });
    }
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const payload = await loadMonth(client, plantaId, year, month);
      let plantName = "";
      try {
        const pr = await client.query(`SELECT nombre FROM public.plantas WHERE id = $1`, [plantaId]);
        plantName = pr.rows[0] ? String(pr.rows[0].nombre) : "";
      } catch (_e) {
        plantName = "";
      }
      const { buildComprasWorkbook } = require("./compras-excel");
      const wb = await buildComprasWorkbook(payload, { plantName });
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      const mes = String(month).padStart(2, "0");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="control-compras-${plantaId}-${year}-${mes}.xlsx"`
      );
      res.send(buffer);
    } catch (e) {
      console.error("[Compras GET excel]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.post("/api/compras", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const out = await createPurchase(client, plantaId, req.body || {}, actorId(req));
      if (!out.ok) return res.status(out.status || 400).json({ error: out.error });
      res.status(201).json(out);
    } catch (e) {
      console.error("[Compras POST]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.patch("/api/compras/:id", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const id = parseInt(String(req.params.id), 10);
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const out = await patchPurchase(client, id, plantaId, req.body || {}, actorId(req));
      if (!out.ok) return res.status(out.status || 400).json({ error: out.error });
      res.json(out);
    } catch (e) {
      console.error("[Compras PATCH]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.delete("/api/compras/:id", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const id = parseInt(String(req.params.id), 10);
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const cur = await loadPurchase(client, id);
      if (!cur) return res.status(404).json({ error: "Compra no encontrada" });
      if (Number(cur.planta_id) !== Number(plantaId)) return res.status(403).json({ error: USER_ERRORS.PLANT });
      const docs = await listDocumentsByCompra(client, id);
      const keys = storageKeysOf(docs);
      if (keys.length) {
        try {
          const gone = await deleteStorageKeys(keys, deleteFromS3);
          if (!gone.ok) return res.status(500).json({ error: USER_ERRORS.SAVE });
        } catch (e) {
          console.error("[Compras DELETE S3]", e);
          return res.status(500).json({ error: USER_ERRORS.SAVE });
        }
      }
      const out = await deletePurchase(client, id, plantaId);
      if (!out.ok) return res.status(out.status || 400).json({ error: out.error });
      res.json({ ok: true });
    } catch (e) {
      console.error("[Compras DELETE]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.post("/api/compras/:id/factura", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const compraId = parseInt(String(req.params.id), 10);
    const fileName = String((req.body && req.body.file_name) || "factura.pdf");
    const b64 = req.body && req.body.fileBase64;
    let buffer;
    try {
      buffer = Buffer.from(String(b64 || ""), "base64");
    } catch (_e) {
      return res.status(400).json({ error: USER_ERRORS.INVOICE });
    }
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const ready = await authorizeInvoiceUpload(client, compraId, plantaId, buffer, "application/pdf", fileName);
      if (!ready.ok) return res.status(ready.status || 400).json({ error: ready.error });
      let storageKey = null;
      let data = null;
      if (isS3() && typeof uploadPdf === "function") {
        storageKey = `compras/${plantaId}/${compraId}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.pdf`;
        try {
          await uploadPdf(buffer, storageKey);
        } catch (e) {
          console.error("[Compras factura S3]", e);
          storageKey = null;
          data = buffer;
        }
      } else {
        data = buffer;
      }
      const out = await persistInvoiceMetadata(
        client,
        compraId,
        plantaId,
        { buffer, nombre_archivo: fileName, mime_type: "application/pdf", storage_key: storageKey, data },
        actorId(req),
        deleteFromS3
      );
      if (!out.ok) return res.status(out.status || 400).json({ error: out.error });
      res.status(201).json(out);
    } catch (e) {
      console.error("[Compras POST factura]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.get("/api/compras/:id/factura/:documento_id/download", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const compraId = parseInt(String(req.params.id), 10);
    const docId = parseInt(String(req.params.documento_id), 10);
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const row = await loadDocument(client, compraId, docId);
      if (!row) return res.status(404).json({ error: "Factura no encontrada" });
      if (Number(row.planta_id) !== Number(plantaId) || !assertPlant(req, Number(row.planta_id))) {
        return res.status(403).json({ error: USER_ERRORS.PLANT });
      }
      let buffer = row.data || null;
      if ((!buffer || !buffer.length) && row.storage_key && typeof getBuffer === "function") {
        buffer = await getBuffer(row.storage_key);
      }
      if (!buffer || !buffer.length) return res.status(404).json({ error: "Factura no encontrada" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${String(row.nombre_archivo || "factura.pdf").replace(/"/g, "")}"`);
      res.send(buffer);
    } catch (e) {
      console.error("[Compras GET factura]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });

  app.delete("/api/compras/:id/factura/:documento_id", auth, async (req, res) => {
    const plantaId = requirePlant(req, res);
    if (!plantaId) return;
    const compraId = parseInt(String(req.params.id), 10);
    const docId = parseInt(String(req.params.documento_id), 10);
    const client = await pool.connect();
    try {
      await ensureComprasTables(client);
      const row = await loadDocument(client, compraId, docId);
      if (!row) return res.status(404).json({ error: "Factura no encontrada" });
      if (Number(row.planta_id) !== Number(plantaId) || !assertPlant(req, Number(row.planta_id))) {
        return res.status(403).json({ error: USER_ERRORS.PLANT });
      }
      if (row.storage_key) {
        try {
          const gone = await deleteStorageKeys([row.storage_key], deleteFromS3);
          if (!gone.ok) return res.status(500).json({ error: USER_ERRORS.SAVE });
        } catch (e) {
          console.error("[Compras DELETE factura S3]", e);
          return res.status(500).json({ error: USER_ERRORS.SAVE });
        }
      }
      await client.query(`DELETE FROM arr.compras_documentos WHERE id = $1 AND compra_id = $2`, [docId, compraId]);
      res.json({ ok: true });
    } catch (e) {
      console.error("[Compras DELETE factura]", e);
      res.status(500).json({ error: USER_ERRORS.SAVE });
    } finally {
      client.release();
    }
  });
}

module.exports = {
  USER_ERRORS,
  DEFAULT_PROVIDER_NAMES,
  MAX_PDF_BYTES,
  toYmd,
  COMPRAS_MENU_PLANTAS,
  normComprasPlantaNombre,
  filterComprasPlantasMenu,
  normProviderName,
  orderSheetProviders,
  ensureRequiredProviders,
  costKg,
  pairOf,
  daysInMonth,
  buildMonthRows,
  aggregatePurchases,
  visibleProvidersForPeriod,
  validatePurchaseInput,
  validatePdfUpload,
  isPdfBuffer,
  ensureComprasTables,
  listProviders,
  ensureDefaultProviders,
  createProvider,
  patchProvider,
  loadMonth,
  parseHgInput,
  attachHgToGrid,
  sumHgYmds,
  upsertHg,
  deleteHg,
  parseFleteTarifaInput,
  attachFleteToGrid,
  freightImporte,
  freightCell,
  freightWeightedTarifa,
  hasMissingTarifaForPositiveKg,
  freightConsolidado,
  hgCosto,
  hgImporte,
  hgImporteSum,
  rawDailyHgCost,
  applyHgCostCarryForward,
  latestHgCostFromHistory,
  loadLatestHgCostBeforeDate,
  upsertFleteTarifa,
  deleteFleteTarifa,
  createPurchase,
  patchPurchase,
  deletePurchase,
  listDocumentsByCompra,
  storageKeysOf,
  deleteStorageKeys,
  authorizeInvoiceUpload,
  compensateOrphanS3Object,
  persistInvoiceMetadata,
  attachDocument,
  loadDocument,
  registerComprasRoutes,
};
