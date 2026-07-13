/**
 * Carga ARR.xlsm → DB (schema arr).
 * Estrategia: borrar mes objetivo y recargar limpio.
 * Solo inserta filas cuya fecha cae en el mes objetivo (evita UPSERT que pise meses históricos,
 * p. ej. Notas con fecha de vencimiento de meses anteriores).
 * No modifica nada fuera del schema arr (ventas_diarias_cliente, descuentos_diarios_cliente, cliente_categoria_mes).
 */

"use strict";

const XLSX = require("xlsx");

const ARR_SHEETS = ["Total", "Notas", "Factura", "Comision Extra", "Categoria"];

/** Normaliza nombre cliente: mayúsculas, sin acentos, trim, espacios dobles. */
function normalizeClient(s) {
  if (s == null || typeof s !== "string") return "";
  let t = s.trim().replace(/\s+/g, " ");
  t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return t.toUpperCase();
}

/** true si fecha YYYY-MM-DD pertenece al year/month objetivo. */
function inTargetMonth(fechaYmd, year, month) {
  if (!fechaYmd || typeof fechaYmd !== "string") return false;
  const [y, m] = fechaYmd.split("-").map(Number);
  return y === year && m === month;
}

/** Filtra items con .fecha al mes objetivo. */
function filterByTargetMonth(items, year, month) {
  return (items || []).filter((x) => inTargetMonth(x && x.fecha, year, month));
}

/** Valor numérico seguro. */
function num(val) {
  if (val == null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/** Fecha: Excel serial o string YYYY-MM-DD / DD/MM/YYYY. */
function parseDate(val) {
  if (val == null || val === "") return null;
  if (typeof val === "number" && val >= 0) {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof val === "string") {
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const m2 = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m2) return `${m2[3]}-${m2[2].padStart(2, "0")}-${m2[1].padStart(2, "0")}`;
  }
  return null;
}

/** Lee hoja como array de objetos { headerName: value }. Headers fila 1, normalizados (trim, sin tildes para búsqueda). */
function sheetToRows(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  if (data.length < 2) return [];
  const rawHeaders = data[0].map((h) => String(h == null ? "" : h).trim());
  const rows = [];
  for (let r = 1; r < data.length; r++) {
    const row = {};
    for (let c = 0; c < rawHeaders.length; c++) {
      const key = rawHeaders[c] || `Col${c}`;
      row[key] = data[r][c];
    }
    rows.push(row);
  }
  return rows;
}

/** Busca valor en fila por posible nombre de columna (sin importar tildes/mayúsculas). */
function getCol(row, ...names) {
  const keys = Object.keys(row || {});
  const n = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const name of names) {
    const nName = n(name);
    for (const k of keys) {
      if (n(k) === nName || n(k).includes(nName) || nName.includes(n(k))) return row[k];
    }
  }
  return undefined;
}

/**
 * Detecta mes objetivo a partir de fechas de operación (Total/Categoria/Factura/Comision Extra).
 * No usa "Fecha de vencimiento" de Notas: esas fechas suelen ser de meses anteriores y sesgarían el mes.
 * Si no hay fechas, devuelve mes actual del sistema.
 */
function detectTargetMonth(workbook, fallbackDate = new Date()) {
  const dates = [];
  for (const sh of ["Total", "Categoria", "Factura", "Comision Extra"]) {
    const rows = sheetToRows(workbook, sh);
    for (const row of rows) {
      const f = parseDate(getCol(row, "Fecha"));
      if (f) dates.push(f);
    }
  }
  if (dates.length === 0) {
    const y = fallbackDate.getFullYear();
    const m = fallbackDate.getMonth() + 1;
    return { year: y, month: m };
  }
  const byMonth = {};
  for (const d of dates) {
    const [y, m] = d.split("-").map(Number);
    const key = `${y}-${m}`;
    byMonth[key] = (byMonth[key] || 0) + 1;
  }
  const sorted = Object.entries(byMonth).sort((a, b) => b[1] - a[1]);
  const [y, m] = sorted[0][0].split("-").map(Number);
  return { year: y, month: m };
}

/**
 * Borra datos del mes en ventas_diarias_cliente, descuentos_diarios_cliente, cliente_categoria_mes.
 */
async function deleteMonth(client, plantCode, year, month) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  await client.query(
    `DELETE FROM arr.ventas_diarias_cliente WHERE plant_code = $1 AND fecha >= $2::date AND fecha <= $3::date`,
    [plantCode, start, end]
  );
  await client.query(
    `DELETE FROM arr.descuentos_diarios_cliente WHERE plant_code = $1 AND fecha >= $2::date AND fecha <= $3::date`,
    [plantCode, start, end]
  );
  await client.query(
    `DELETE FROM arr.cliente_categoria_mes WHERE plant_code = $1 AND year = $2 AND month = $3`,
    [plantCode, year, month]
  );
}

/**
 * Carga hoja Total: ventas (Fecha, Cliente, Total kilos) y descuento contado = -(Comision $ + Comision acumulada $ + DIP $ + Descuento $).
 * Ignora filas con fecha = hoy (día no cerrado).
 */
function extractTotal(rows, todayStr) {
  const ventas = [];
  const descuentos = [];
  for (const row of rows) {
    const fecha = parseDate(getCol(row, "Fecha"));
    if (!fecha) continue;
    if (fecha === todayStr) continue;
    const cliente = normalizeClient(getCol(row, "Cliente"));
    if (!cliente) continue;
    const kg = num(getCol(row, "Total kilos", "Total kilos"));
    const comision = num(getCol(row, "Comision $", "Comision"));
    const comisionAcum = num(getCol(row, "Comision acumulada $", "Comision acumulada"));
    const dip = num(getCol(row, "DIP $"));
    const desc = num(getCol(row, "Descuento $", "Descuento"));
    if (kg != null && kg !== 0) ventas.push({ fecha, cliente, kg, canal: null, subcanal: null });
    const contado = -(Number(comision || 0) + Number(comisionAcum || 0) + Number(dip || 0) + Number(desc || 0));
    if (contado !== 0) descuentos.push({ fecha, cliente, monto: contado });
  }
  return { ventas, descuentos };
}

/** Notas: fecha = Fecha de vencimiento, monto = Total firmado (normalizar a negativo). */
function extractNotas(rows, todayStr) {
  const out = [];
  for (const row of rows) {
    const fecha = parseDate(getCol(row, "Fecha de vencimiento", "Fecha de vencimiento"));
    if (!fecha || fecha === todayStr) continue;
    const cliente = normalizeClient(getCol(row, "Cliente"));
    if (!cliente) continue;
    let monto = num(getCol(row, "Total firmado", "Total firmado"));
    if (monto == null) continue;
    if (monto > 0) monto = -monto;
    out.push({ fecha, cliente, monto });
  }
  return out;
}

/** Factura: Descuento * 1.16, negativo. */
function extractFactura(rows, todayStr) {
  const out = [];
  for (const row of rows) {
    const fecha = parseDate(getCol(row, "Fecha"));
    if (!fecha || fecha === todayStr) continue;
    const cliente = normalizeClient(getCol(row, "Cliente"));
    if (!cliente) continue;
    const d = num(getCol(row, "Descuento"));
    if (d == null) continue;
    const monto = -Math.abs(d * 1.16);
    out.push({ fecha, cliente, monto });
  }
  return out;
}

/** Comision Extra: Fecha, Cliente, Comisión extraordinaria. */
function extractComisionExtra(rows, todayStr) {
  const out = [];
  for (const row of rows) {
    const fecha = parseDate(getCol(row, "Fecha"));
    if (!fecha || fecha === todayStr) continue;
    const cliente = normalizeClient(getCol(row, "Cliente"));
    if (!cliente) continue;
    const monto = num(getCol(row, "Comisión extraordinaria", "Comision extraordinaria"));
    if (monto == null) continue;
    out.push({ fecha, cliente, monto: -Math.abs(monto) });
  }
  return out;
}

/** Categoria: Fecha, Cliente, Total kilos, Comisionista (bool), sub canal com → canal + subcanal + ventas. */
function extractCategoria(rows, todayStr) {
  const ventas = [];
  const catalog = [];
  for (const row of rows) {
    const fecha = parseDate(getCol(row, "Fecha"));
    if (!fecha || fecha === todayStr) continue;
    const cliente = normalizeClient(getCol(row, "Cliente"));
    if (!cliente) continue;
    const kg = num(getCol(row, "Total kilos", "Total kilos"));
    const comisionista = getCol(row, "Comisionista", "Comisionista");
    const canal = comisionista === true || comisionista === "TRUE" || String(comisionista).toLowerCase() === "true" || comisionista === 1 ? "Comisionista" : "Casa";
    const subcanal = String(getCol(row, "sub canal com", "sub canal com", "Subcanal") || "").trim() || null;
    if (kg != null && kg !== 0) ventas.push({ fecha, cliente, kg, canal, subcanal });
    catalog.push({ fecha, cliente, canal, subcanal });
  }
  return { ventas, catalog };
}

/**
 * Unifica descuentos por (fecha, cliente): suma de todos los montos.
 */
function mergeDescuentos(arrays) {
  const map = new Map();
  for (const arr of arrays) {
    for (const { fecha, cliente, monto } of arr) {
      const key = `${fecha}|${cliente}`;
      const prev = map.get(key) || 0;
      map.set(key, prev + monto);
    }
  }
  return Array.from(map.entries()).map(([key, monto]) => {
    const [fecha, cliente] = key.split("|");
    return { fecha, cliente, monto };
  });
}

/**
 * Ventas: de Total (sin canal/subcanal) y de Categoria (con canal/subcanal).
 * Para Total sin Categoria usamos canal 'Casa' y subcanal null si no hay catálogo.
 */
function mergeVentas(totalVentas, categoriaVentas) {
  const byKey = new Map();
  for (const v of categoriaVentas) {
    const key = `${v.fecha}|${v.cliente}|${v.canal}|${v.subcanal || ""}`;
    const prev = byKey.get(key) || { ...v, kg: 0 };
    prev.kg += Number(v.kg || 0);
    byKey.set(key, prev);
  }
  for (const v of totalVentas) {
    const canal = v.canal || "Casa";
    const subcanal = v.subcanal != null ? v.subcanal : "";
    const key = `${v.fecha}|${v.cliente}|${canal}|${subcanal}`;
    const prev = byKey.get(key);
    if (prev) prev.kg += Number(v.kg || 0);
    else byKey.set(key, { fecha: v.fecha, cliente: v.cliente, kg: v.kg || 0, canal, subcanal: subcanal || null });
  }
  return Array.from(byKey.values()).filter((x) => x.kg !== 0);
}

/**
 * Carga ARR desde buffer (archivo .xlsm o .xlsx).
 * @param {object} client - pg client
 * @param {string} plantCode - código planta
 * @param {Buffer} fileBuffer - contenido del archivo
 * @param {object} options - { targetYear, targetMonth } opcionales; si no se pasan, se detectan del archivo
 * @returns {Promise<{ year, month, ventasCount, descuentosCount, catalogCount }>}
 */
async function loadArrFromBuffer(client, plantCode, fileBuffer, options = {}) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: false });
  const today = options.today != null ? new Date(options.today) : new Date();
  const todayStr = today.toISOString().slice(0, 10);

  let { year, month } = options.targetYear != null && options.targetMonth != null
    ? { year: options.targetYear, month: options.targetMonth }
    : detectTargetMonth(workbook, today);

  await deleteMonth(client, plantCode, year, month);

  const totalRows = sheetToRows(workbook, "Total");
  const notasRows = sheetToRows(workbook, "Notas");
  const facturaRows = sheetToRows(workbook, "Factura");
  const comisionRows = sheetToRows(workbook, "Comision Extra");
  const categoriaRows = sheetToRows(workbook, "Categoria");

  const { ventas: totalVentasRaw, descuentos: totalDescRaw } = extractTotal(totalRows, todayStr);
  const notasDescRaw = extractNotas(notasRows, todayStr);
  const facturaDescRaw = extractFactura(facturaRows, todayStr);
  const comisionDescRaw = extractComisionExtra(comisionRows, todayStr);
  const { ventas: catVentasRaw, catalog: catCatalogRaw } = extractCategoria(categoriaRows, todayStr);

  const skippedOutOfMonth = {
    ventas: 0,
    descuentos: 0,
    catalog: 0,
  };

  const totalVentas = filterByTargetMonth(totalVentasRaw, year, month);
  const catVentas = filterByTargetMonth(catVentasRaw, year, month);
  const totalDesc = filterByTargetMonth(totalDescRaw, year, month);
  const notasDesc = filterByTargetMonth(notasDescRaw, year, month);
  const facturaDesc = filterByTargetMonth(facturaDescRaw, year, month);
  const comisionDesc = filterByTargetMonth(comisionDescRaw, year, month);
  const catCatalog = filterByTargetMonth(catCatalogRaw, year, month);

  skippedOutOfMonth.ventas =
    totalVentasRaw.length +
    catVentasRaw.length -
    totalVentas.length -
    catVentas.length;
  skippedOutOfMonth.descuentos =
    totalDescRaw.length +
    notasDescRaw.length +
    facturaDescRaw.length +
    comisionDescRaw.length -
    totalDesc.length -
    notasDesc.length -
    facturaDesc.length -
    comisionDesc.length;
  skippedOutOfMonth.catalog = catCatalogRaw.length - catCatalog.length;

  if (skippedOutOfMonth.descuentos > 0 || skippedOutOfMonth.ventas > 0) {
    console.warn(
      "[arr-load] Filas omitidas por fecha fuera del mes objetivo",
      { plantCode, year, month, ...skippedOutOfMonth }
    );
  }

  const allDescuentos = mergeDescuentos([totalDesc, notasDesc, facturaDesc, comisionDesc]);
  const allVentas = mergeVentas(totalVentas, catVentas);

  const clienteCatMap = new Map();
  for (const c of catCatalog) {
    const key = c.cliente;
    if (!clienteCatMap.has(key)) clienteCatMap.set(key, { cliente: c.cliente, canal: c.canal, subcanal: c.subcanal });
  }

  for (const v of allVentas) {
    const cat = clienteCatMap.get(v.cliente);
    const canal = (v.canal && v.canal !== "null") ? v.canal : (cat && cat.canal) || "Casa";
    const subcanalVal = (v.subcanal != null && v.subcanal !== "") ? v.subcanal : (cat && cat.subcanal) || "";
    await client.query(
      `INSERT INTO arr.ventas_diarias_cliente (plant_code, fecha, cliente_norm, canal, subcanal, kg)
       VALUES ($1, $2::date, $3, $4, $5, $6)
       ON CONFLICT (plant_code, fecha, cliente_norm, canal, subcanal)
       DO UPDATE SET kg = EXCLUDED.kg`,
      [plantCode, v.fecha, v.cliente, canal, subcanalVal, v.kg]
    );
  }

  for (const d of allDescuentos) {
    await client.query(
      `INSERT INTO arr.descuentos_diarios_cliente (plant_code, fecha, cliente_norm, monto)
       VALUES ($1, $2::date, $3, $4)
       ON CONFLICT (plant_code, fecha, cliente_norm)
       DO UPDATE SET monto = EXCLUDED.monto`,
      [plantCode, d.fecha, d.cliente, d.monto]
    );
  }

  for (const c of clienteCatMap.values()) {
    await client.query(
      `INSERT INTO arr.cliente_categoria_mes (plant_code, year, month, cliente_norm, canal, subcanal)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (plant_code, year, month, cliente_norm)
       DO UPDATE SET canal = EXCLUDED.canal, subcanal = EXCLUDED.subcanal`,
      [plantCode, year, month, c.cliente, c.canal, (c.subcanal != null && c.subcanal !== "") ? c.subcanal : ""]
    );
  }

  return {
    year,
    month,
    ventasCount: allVentas.length,
    descuentosCount: allDescuentos.length,
    catalogCount: clienteCatMap.size,
    skippedOutOfMonth,
  };
}

module.exports = {
  normalizeClient,
  parseDate,
  sheetToRows,
  detectTargetMonth,
  deleteMonth,
  loadArrFromBuffer,
  inTargetMonth,
  filterByTargetMonth,
  ARR_SHEETS,
};
