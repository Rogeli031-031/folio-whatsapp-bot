"use strict";

const XLSX = require("xlsx");
const crypto = require("node:crypto");
const desglose = require("./igf-diario-gastos-desglose");
const distribucion = require("./igf-diario-gastos-distribucion");
const manuales = require("./igf-diario-gastos-manuales");
const { monthBusinessDays } = require("./igf-diario-puebla");

const FIELDS = [
  ["gasto_corporativo", "Gasto corporativo", "GASTO CORPORATIVO"],
  ["inversiones", "Inversiones", "INVERSIONES"],
  ["impuestos_federales", "Impuestos federales", "IMPUESTOS FEDERALES"],
  ["presupuesto_nomina_gastos", "Nómina/Gastos", "NOMINA/GASTOS"],
  ["presupuesto_imss_sua", "IMSS/SUA", "IMSS/SUA"],
  ["extraordinarios", "Extraordinarios/GEND", "EXTRAORDINARIOS/GEND"],
  ["provisiones_planta", "Provisión de planta", "PROVISION DE PLANTA"],
];
const KEYS = FIELDS.map(([key]) => key);
function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function normalized(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " "); }
function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
function parseRequest(body) {
  const plantCode = String(body.plant_code || "").trim();
  if (!plantCode || plantCode.length > 40) fail("Selecciona una planta");
  const from = body.desde, to = body.hasta;
  if (!validDate(from) || !validDate(to) || from > to) fail("Selecciona una ventana de fechas válida");
  if (from < "2026-10-01") fail("El presupuesto detallado aplica desde octubre de 2026");
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 365) fail("La ventana no puede superar un año");
  if (typeof body.file_base64 !== "string" || !body.file_base64 || body.file_base64.length > 7 * 1024 * 1024
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.file_base64)) fail("Selecciona un archivo Excel válido de hasta 5 MB");
  const buffer = Buffer.from(body.file_base64, "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) fail("El archivo no puede superar 5 MB");
  return { plantCode, from, to, buffer };
}
function excelDate(cell) {
  if (!cell || cell.t === "e") return null;
  const v = cell.v;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d || d.H || d.M || d.S) return null;
    const key = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    return validDate(key) ? key : null;
  }
  if (validDate(v)) return v;
  return null;
}
function parseWorkbook(buffer, from, to) {
  let wb;
  try { wb = XLSX.read(buffer, { type: "buffer", cellFormula: true, sheetRows: 5000 }); }
  catch { fail("No se pudo leer el Excel"); }
  if (wb.Workbook?.WBProps?.date1904) fail("El archivo usa calendario 1904; conviértelo al calendario estándar de Excel");
  const sheet = wb.Sheets.DatosCorpo;
  if (!sheet || !sheet["!ref"]) fail("El archivo no contiene la hoja DatosCorpo");
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  if (range.e.r >= 4999 || range.e.c > 100) fail("DatosCorpo excede el tamaño permitido");
  let header = -1, columns;
  for (let r = 0; r <= Math.min(range.e.r, 30); r++) {
    const labels = Array.from({ length: range.e.c + 1 }, (_, c) => normalized(sheet[XLSX.utils.encode_cell({ r, c })]?.v));
    if (labels.includes("DIA INICIA")) {
      if (header !== -1) fail("DatosCorpo tiene encabezados duplicados");
      const required = ["DIA INICIA", ...FIELDS.map(([, , label]) => label)];
      if (required.some(label => labels.filter(v => v === label).length !== 1)) fail("DatosCorpo debe contener fecha y los siete conceptos sin columnas duplicadas");
      header = r;
      columns = required.map(label => labels.indexOf(label));
    }
  }
  if (header === -1) fail("No se encontraron los encabezados de DatosCorpo");
  const rows = new Map();
  for (let r = header + 1; r <= range.e.r; r++) {
    const dateCell = sheet[XLSX.utils.encode_cell({ r, c: columns[0] })];
    const fecha = excelDate(dateCell);
    const hasAmounts = columns.slice(1).some(c => sheet[XLSX.utils.encode_cell({ r, c })]?.v != null);
    if (!fecha) { if (hasAmounts) fail(`Fecha inválida en DatosCorpo, fila ${r + 1}`); continue; }
    if (fecha < from || fecha > to) continue;
    if (rows.has(fecha)) fail(`Fecha duplicada en DatosCorpo: ${fecha}`);
    const values = {};
    KEYS.forEach((key, i) => {
      const address = XLSX.utils.encode_cell({ r, c: columns[i + 1] });
      const cell = sheet[address];
      if (!cell || cell.t === "e" || typeof cell.v !== "number" || !Number.isFinite(cell.v) || cell.v < 0
        || cell.v > 1e12) fail(`Importe vacío o inválido en DatosCorpo!${address}. Abre, recalcula y guarda el Excel si contiene fórmulas.`);
      values[key] = Math.round((cell.v + Number.EPSILON) * 100);
    });
    rows.set(fecha, values);
  }
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const fecha = d.toISOString().slice(0, 10);
    if (!rows.has(fecha)) fail(`Falta la fecha ${fecha} en DatosCorpo`);
  }
  return rows;
}

// Reads only. A partial replacement freezes the current assigned amounts outside
// the window before deriving the new monthly totals; no implicit redistribution.
async function buildPlan(client, spec) {
  const months = [...new Set([...spec.rows.keys()].map(d => d.slice(0, 7)))].sort();
  const plans = [];
  for (const ym of months) {
    const [year, month] = ym.split("-").map(Number);
    const old = await client.query(`SELECT * FROM arr.igf_diario_gastos_desglose
      WHERE plant_code = $1 AND year = $2 AND month = $3`, [spec.plantCode, year, month]);
    const oldRow = old.rows[0] || null;
    const fixed = await client.query(`SELECT concepto, fecha, importe FROM arr.igf_diario_gastos_distribucion_manual
      WHERE plant_code = $1 AND year = $2 AND month = $3 ORDER BY concepto, fecha`, [spec.plantCode, year, month]);
    const days = monthBusinessDays(year, month).days;
    const fullMonth = days.every(day => spec.rows.has(day.fecha));
    const concepts = [], daily = [];
    for (const [key, label] of FIELDS) {
      const existing = Object.fromEntries(fixed.rows.filter(row => row.concepto === key).map(row => [distribucion.fechaKey(row.fecha), row.importe]));
      const known = oldRow && oldRow[key] != null;
      const before = known ? distribucion.buildExpenseDailySchedule({ monthlyAmount: oldRow[key], days, overrides: existing }) : null;
      if (!fullMonth && (!before || !before.ok)) fail(`Para reemplazar parte de ${ym}, primero debe existir una distribución mensual válida de ${label}`);
      let oldWindow = before?.ok ? 0 : null, newWindow = 0, total = 0;
      for (const day of days) {
        const imported = spec.rows.get(day.fecha);
        if (imported && day.inhabil && imported[key] !== 0) fail(`${day.fecha} es inhábil en el sistema y ${label} tiene un importe distinto de cero en Excel`);
        const previous = before?.ok ? Math.round(before.byFecha[day.fecha] * 100) : 0;
        const cents = imported ? imported[key] : previous;
        if (imported) { newWindow += cents; if (oldWindow != null) oldWindow += previous; }
        total += cents;
        if (!day.inhabil) daily.push({ concepto: key, fecha: day.fecha, importe: cents / 100 });
      }
      concepts.push({ key, label, anterior_ventana: oldWindow == null ? null : oldWindow / 100,
        nuevo_ventana: newWindow / 100, mensual_anterior: known ? Number(oldRow[key]) : null, mensual_nuevo: total / 100 });
    }
    plans.push({ year, month, concepts, daily, previous: { row: oldRow, fixed: fixed.rows } });
  }
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify({ plant: spec.plantCode, from: spec.from, to: spec.to, plans })).digest("hex");
  return { plans, fingerprint };
}
function publicPreview(plan, spec) {
  return { ok: true, plant_code: spec.plantCode, desde: spec.from, hasta: spec.to, dias: spec.rows.size,
    preview_token: plan.fingerprint, months: plan.plans.map(({ year, month, concepts }) => ({ year, month, concepts })),
    days: [...spec.rows].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, values]) => ({ fecha, values: Object.fromEntries(KEYS.map(key => [key, values[key] / 100])) })) };
}
async function savePlan(client, spec, expected, actor) {
  if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) fail("Primero revisa la vista previa");
  await client.query("BEGIN");
  try {
    // Serialize this import for the plant; row locks also protect existing
    // monthly amounts while the preview is revalidated and applied.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`igf-presupuesto:${spec.plantCode}`]);
    const months = [...new Set([...spec.rows.keys()].map(d => d.slice(0, 7)))].sort();
    for (const ym of months) {
      const [year, month] = ym.split("-").map(Number);
      await client.query("SELECT plant_code FROM arr.igf_diario_gastos_desglose WHERE plant_code=$1 AND year=$2 AND month=$3 FOR UPDATE", [spec.plantCode, year, month]);
      await client.query("SELECT plant_code FROM arr.igf_diario_gastos_manual WHERE plant_code=$1 AND year=$2 AND month=$3 FOR UPDATE", [spec.plantCode, year, month]);
    }
    const plan = await buildPlan(client, spec);
    if (plan.fingerprint !== expected) fail("El presupuesto cambió desde la vista previa. Vuelve a revisar antes de guardar.", 409);
    for (const part of plan.plans) {
      const totals = Object.fromEntries(part.concepts.map(c => [c.key, c.mensual_nuevo]));
      await client.query(desglose.UPSERT_CORP_SQL, [spec.plantCode, part.year, part.month, ...desglose.CORP_KEYS.map(k => totals[k]), actor]);
      await client.query(desglose.UPSERT_OPER_SQL, [spec.plantCode, part.year, part.month, ...desglose.OPER_KEYS.map(k => totals[k]), actor]);
      await client.query(manuales.UPSERT_SQL,
      [spec.plantCode, part.year, part.month, desglose.sumMoney(desglose.OPER_KEYS.map(k => totals[k])), desglose.sumMoney(desglose.CORP_KEYS.map(k => totals[k])), actor]);
      // Pin all business days to preserve the assigned amounts outside the window.
      for (const day of part.daily) await client.query(`INSERT INTO arr.igf_diario_gastos_distribucion_manual
        (plant_code,year,month,concepto,fecha,importe,updated_at,updated_by) VALUES ($1,$2,$3,$4,$5,$6,now(),$7)
        ON CONFLICT (plant_code,year,month,concepto,fecha) DO UPDATE SET importe=EXCLUDED.importe,updated_at=now(),updated_by=EXCLUDED.updated_by`,
      [spec.plantCode, part.year, part.month, day.concepto, day.fecha, day.importe, actor]);
    }
    await client.query("COMMIT");
    return publicPreview(plan, spec);
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) { error.rollbackError = rollbackError; }
    throw error;
  }
}

module.exports = { FIELDS, parseRequest, parseWorkbook, buildPlan, publicPreview, savePlan };
