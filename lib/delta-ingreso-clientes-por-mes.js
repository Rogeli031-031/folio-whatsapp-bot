"use strict";

/**
 * Delta Ingreso ejecutivo = misma semántica que IGF Forecast ARR → Clientes por mes.
 * Reutiliza computeClientesDescuentoMes + ingresoClienteMarginal.
 * No usa projectKgToMonthEnd / OLS de computeDeltaIngresoForecast.
 */

const dashboardArrForecast = require("./dashboard-arr-forecast");
const {
  ingresoClienteMarginal,
  targetKgDesdeIgfVentaTon,
  metricsFromIgfLine,
} = require("./ingreso-cliente-marginal");

function yyyyMm(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function mesHistorico(year, month, now) {
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  return year < cy || (year === cy && month < cm);
}

function normCliente(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function normPlant(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function findPlantLine(rows, plantLabel) {
  const want = normPlant(plantLabel);
  if (!want) return null;
  let best = null;
  let bestScore = -1;
  for (const row of rows || []) {
    const emp = normPlant(row && row.empresa);
    if (!emp) continue;
    let score = -1;
    if (emp === want) score = 10000;
    else if (emp.includes(want) || want.includes(emp)) score = 5000 - Math.abs(emp.length - want.length);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return bestScore >= 0 ? best : null;
}

async function defaultLoadIgfPlantMetrics(client, plantLabel, year, month, opts = {}) {
  if (typeof opts.loadIgfPlantMetrics === "function") {
    return opts.loadIgfPlantMetrics(client, plantLabel, year, month, opts);
  }
  if (!client || typeof client.query !== "function") return null;
  const ver = await client.query(
    `SELECT id, version_number, financial_state
       FROM igf.versions
      WHERE plant_code = 'GLOBAL' AND year = $1 AND month = $2
      ORDER BY version_number DESC
      LIMIT 1`,
    [year, month]
  );
  const version = ver.rows && ver.rows[0];
  if (!version) return null;
  const lines = await client.query(
    `SELECT empresa, venta_ton, margen_kg, hg_pct, hg_kg, com_desc_kg
       FROM igf.compromiso_lines
      WHERE version_id = $1`,
    [version.id]
  );
  const row = findPlantLine(lines.rows, plantLabel);
  if (!row) return null;
  const hg = metricsFromIgfLine(row);
  const ventaTon = row.venta_ton != null ? Number(row.venta_ton) : null;
  const margenKg = row.margen_kg != null ? Number(row.margen_kg) : null;
  return {
    ventaTon,
    margenKg,
    hgDisplay: hg.hgDisplay,
    hgDinero: hg.hgDinero,
    hgPct: hg.hgPct,
    hgKg: hg.hgKg,
    version_id: version.id,
    version_number: version.version_number,
    financial_state: version.financial_state,
    targetKg: targetKgDesdeIgfVentaTon(ventaTon),
  };
}

function moneyOrZero(v) {
  return v == null || !Number.isFinite(Number(v)) ? 0 : Number(v);
}

async function computeDeltaIngresoClientesPorMes(client, plantCode, yearA, monthA, yearB, monthB, opts = {}) {
  const now = opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();
  const computeCDM = opts.computeClientesDescuentoMes || dashboardArrForecast.computeClientesDescuentoMes;
  const loadMetrics =
    opts.loadIgfPlantMetrics ||
    ((c, plant, y, m) => defaultLoadIgfPlantMetrics(c, plant, y, m, opts));

  const metricsA = await loadMetrics(client, plantCode, yearA, monthA);
  const metricsB = await loadMetrics(client, plantCode, yearB, monthB);
  if (!metricsA || !metricsB || metricsA.margenKg == null || metricsB.margenKg == null) {
    return {
      ok: false,
      planta: plantCode,
      periodoA: yyyyMm(yearA, monthA),
      periodoB: yyyyMm(yearB, monthB),
      rows: [],
      source_helper: "computeDeltaIngresoClientesPorMes",
      physical_source: "dashboard-arr-forecast.computeClientesDescuentoMes",
      error: "No hay métricas IGF de planta para Clientes por mes. No invento margen ni target.",
    };
  }

  const histA = mesHistorico(yearA, monthA, now);
  const histB = mesHistorico(yearB, monthB, now);
  const targetKgB =
    metricsB.targetKg != null && Number.isFinite(Number(metricsB.targetKg)) && Number(metricsB.targetKg) > 0
      ? Number(metricsB.targetKg)
      : targetKgDesdeIgfVentaTon(metricsB.ventaTon);

  const packA = await computeCDM(client, yearA, monthA, plantCode, { historico: histA });
  const packB = await computeCDM(client, yearB, monthB, plantCode, {
    historico: histB,
    targetKgOverride: !histB && targetKgB ? targetKgB : null,
    forecastKgByPlant: opts.forecastKgByPlant,
  });

  const mapA = new Map();
  for (const r of (packA && packA.rows) || []) {
    const key = normCliente(r.cliente);
    if (key) mapA.set(key, r);
  }
  const mapB = new Map();
  for (const r of (packB && packB.rows) || []) {
    const key = normCliente(r.cliente);
    if (key) mapB.set(key, r);
  }
  const keys = new Set([...mapA.keys(), ...mapB.keys()]);
  const rows = [];

  for (const key of keys) {
    const ra = mapA.get(key);
    const rb = mapB.get(key);
    const cliente = String((rb && rb.cliente) || (ra && ra.cliente) || "").trim();
    if (!cliente) continue;
    const kgA = ra ? Number(ra.kg) || 0 : 0;
    const kgB = histB ? (rb ? Number(rb.kg) || 0 : 0) : rb ? Number(rb.kgProy) || 0 : 0;
    const descA = ra && ra.descKg != null && Number.isFinite(Number(ra.descKg)) ? Number(ra.descKg) : 0;
    const descB = rb && rb.descKg != null && Number.isFinite(Number(rb.descKg)) ? Number(rb.descKg) : 0;
    const ingresoA = ingresoClienteMarginal(kgA, descA, metricsA);
    const ingresoB = ingresoClienteMarginal(kgB, descB, metricsB);
    const aVal = moneyOrZero(ingresoA);
    const bVal = moneyOrZero(ingresoB);
    rows.push({
      cliente,
      kgA,
      kgB,
      descKgA: descA,
      descKgB: descB,
      ingresoA: aVal,
      ingresoB: bVal,
      deltaIngreso: bVal - aVal,
      margenA: metricsA.margenKg,
      margenB: metricsB.margenKg,
      hgDisplayA: metricsA.hgDisplay,
      hgDisplayB: metricsB.hgDisplay,
      hgDineroA: metricsA.hgDinero,
      hgDineroB: metricsB.hgDinero,
    });
  }

  return {
    ok: true,
    planta: plantCode,
    periodoA: yyyyMm(yearA, monthA),
    periodoB: yyyyMm(yearB, monthB),
    margenA: metricsA.margenKg,
    margenB: metricsB.margenKg,
    targetKg: targetKgB || null,
    igf_venta_ton: metricsB.ventaTon != null ? Number(metricsB.ventaTon) : null,
    igf_financial_state: metricsB.financial_state || null,
    igf_version_number: metricsB.version_number != null ? Number(metricsB.version_number) : null,
    rows,
    source_helper: "computeDeltaIngresoClientesPorMes",
    physical_source: "dashboard-arr-forecast.computeClientesDescuentoMes",
  };
}

module.exports = {
  computeDeltaIngresoClientesPorMes,
  defaultLoadIgfPlantMetrics,
  mesHistorico,
};
