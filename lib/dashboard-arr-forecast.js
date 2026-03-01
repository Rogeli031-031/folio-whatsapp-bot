/**
 * Genera Excel con 3 hojas adicionales al Dashboard (sin modificar hojas actuales):
 * A) Provincia Venta diaria (reales + proyectados), ACUM, PROM, PROY, Comp, Dif Comp
 * B) Provincia Comisiones (descuento/kg diario), ACUM = sum(desc)/sum(kg)
 * C) IGF ejecutivo horizontal: V1, vMax, Forecast, deltas $/kg y MXN; Totales Provincia y Centro
 *
 * Lista de plantas Provincia: env ARR_ZONA_PROVINCIA (comma-separated) o todas las que tengan datos.
 */

"use strict";

const XLSX = require("xlsx");

const IGF_VAR_ORDER = [
  "venta_ton", "margen_kg", "com_desc_kg", "gasto_kg", "impuesto_kg",
  "hg_pct", "hg_kg", "bancos_planta_kg", "provision_planta_kg",
  "util_oper_kg", "util_oper_importe",
  "gtos_apoyos_corp_kg", "bancos_corp_kg", "otros_programas_kg", "inversiones_kg",
  "resultado_final_kg", "resultado_final_importe",
];

function getProvinciaPlantCodes() {
  const env = (process.env.ARR_ZONA_PROVINCIA || "").trim();
  if (env) return env.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/**
 * Obtiene empresas (plantas) de IGF compromiso para el mes y las separa en Provincia vs Centro.
 * Si no hay config de Provincia, todas se consideran Provincia para las hojas diarias.
 */
async function getPlantasZona(client, year, month) {
  const provinciaCodes = getProvinciaPlantCodes();
  const r = await client.query(
    `SELECT DISTINCT c.empresa FROM igf.compromiso_lines c
     JOIN igf.versions v ON v.id = c.version_id
     WHERE v.plant_code = 'GLOBAL' AND v.year = $1 AND v.month = $2`,
    [year, month]
  );
  const empresas = (r.rows || []).map((row) => (row.empresa || "").trim()).filter(Boolean);
  const provincia = provinciaCodes.length
    ? empresas.filter((e) => provinciaCodes.some((p) => e.toUpperCase().includes(p.toUpperCase())))
    : [...empresas];
  const centro = provinciaCodes.length ? empresas.filter((e) => !provincia.includes(e)) : [];
  return { provincia, centro, todas: empresas };
}

/**
 * Genera buffer Excel con las 3 hojas.
 * @param {object} client - pg client
 * @param {number} year
 * @param {number} month
 * @param {string} plantCode - planta para datos ARR (si una DB por planta); si no, se usan todas las de arr.ventas_diarias_cliente
 */
async function generarDashboardArrForecast(client, year, month, plantCode = null) {
  const wb = XLSX.utils.book_new();
  const lastDay = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { provincia: provinciaPlantas, centro } = await getPlantasZona(client, year, month);

  const plantsForArr = plantCode ? [plantCode] : await getPlantCodesFromArr(client, year, month);
  const plantsForProvinciaSheets = provinciaPlantas.length
    ? plantsForArr.filter((p) => provinciaPlantas.some((emp) => (emp || "").toUpperCase().includes((p || "").toUpperCase()) || (p || "").toUpperCase().includes((emp || "").toUpperCase())))
    : plantsForArr;

  const ventaDiaria = await getVentaDiariaProvincia(client, year, month, plantsForProvinciaSheets, provinciaPlantas, lastDayStr, todayStr);
  const compTotalKg = await getCompromisoTotalProvincia(client, year, month, provinciaPlantas);

  hojaA(wb, ventaDiaria, year, month, compTotalKg, lastDayStr, todayStr);
  hojaB(wb, ventaDiaria, year, month, lastDayStr, todayStr);
  await hojaC(client, wb, year, month, provinciaPlantas, centro, plantsForProvinciaSheets);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf;
}

async function getPlantCodesFromArr(client, year, month) {
  const r = await client.query(
    `SELECT DISTINCT plant_code FROM arr.forecast_mensual WHERE year = $1 AND month = $2`,
    [year, month]
  );
  const fromForecast = (r.rows || []).map((row) => row.plant_code).filter(Boolean);
  if (fromForecast.length > 0) return fromForecast;
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const r2 = await client.query(
    `SELECT DISTINCT plant_code FROM arr.ventas_diarias_cliente WHERE fecha >= $1::date AND fecha <= $2::date`,
    [firstDay, lastDayStr]
  );
  return (r2.rows || []).map((row) => row.plant_code).filter(Boolean);
}

async function getVentaDiariaProvincia(client, year, month, plantCodes, provinciaEmpresas, lastDayStr, todayStr) {
  if (plantCodes.length === 0) return { byDate: [], forecastKg: 0 };
  const placeholders = plantCodes.map((_, i) => `$${i + 1}`).join(",");
  const r = await client.query(
    `SELECT fecha, SUM(kg) AS kg FROM arr.ventas_diarias_cliente
     WHERE plant_code IN (${placeholders}) AND fecha >= $${plantCodes.length + 1}::date AND fecha <= $${plantCodes.length + 2}::date
     GROUP BY fecha ORDER BY fecha`,
    [...plantCodes, `${year}-${String(month).padStart(2, "0")}-01`, lastDayStr]
  );
  const byDate = (r.rows || []).map((row) => ({ fecha: row.fecha, kg: Number(row.kg || 0), isProjected: row.fecha > todayStr }));
  const forecastR = await client.query(
    `SELECT COALESCE(SUM(kg_forecast), 0) AS total FROM arr.forecast_mensual WHERE plant_code IN (${placeholders}) AND year = $${plantCodes.length + 1} AND month = $${plantCodes.length + 2}`,
    [...plantCodes, year, month]
  );
  const forecastKg = Number(forecastR.rows && forecastR.rows[0] ? forecastR.rows[0].total : 0);

  const descR = await client.query(
    `SELECT d.fecha, SUM(d.monto) AS monto FROM arr.descuentos_diarios_cliente d
     WHERE d.plant_code IN (${placeholders}) AND d.fecha >= $${plantCodes.length + 1}::date AND d.fecha <= $${plantCodes.length + 2}::date
     GROUP BY d.fecha ORDER BY d.fecha`,
    [...plantCodes, `${year}-${String(month).padStart(2, "0")}-01`, lastDayStr]
  );
  const descByDate = new Map((descR.rows || []).map((row) => [row.fecha, Number(row.monto || 0)]));
  for (const d of byDate) {
    d.desc = descByDate.get(d.fecha) || 0;
  }
  return { byDate, forecastKg, provinciaEmpresas };
}

async function getCompromisoTotalProvincia(client, year, month, provinciaEmpresas) {
  if (provinciaEmpresas.length === 0) return 0;
  const v1 = await client.query(
    `SELECT c.empresa, c.venta_ton FROM igf.compromiso_lines c
     JOIN igf.versions v ON v.id = c.version_id
     WHERE v.plant_code = 'GLOBAL' AND v.year = $1 AND v.month = $2 AND v.version_number = 1`,
    [year, month]
  );
  let total = 0;
  for (const row of v1.rows || []) {
    const emp = (row.empresa || "").trim();
    if (provinciaEmpresas.some((p) => emp.toUpperCase().includes(p.toUpperCase())))
      total += (row.venta_ton || 0) * 1000;
  }
  return total;
}

function hojaA(wb, ventaDiaria, year, month, compTotalKg, lastDayStr, todayStr) {
  const { byDate, forecastKg } = ventaDiaria;
  const headers = ["Fecha", "Venta diaria (kg)", "ACUM"];
  const data = [headers];
  let acum = 0;
  const reales = byDate.filter((d) => !d.isProjected);
  const numReales = reales.length;
  const promReales = numReales ? reales.reduce((s, x) => s + x.kg, 0) / numReales : null;
  const kgReales = reales.reduce((s, x) => s + x.kg, 0);
  const kgProyectados = byDate.filter((d) => d.isProjected).reduce((s, x) => s + x.kg, 0);
  for (const d of byDate) {
    acum += d.kg;
    const dia = typeof d.fecha === "string" ? d.fecha : (d.fecha && d.fecha.toISOString ? d.fecha.toISOString().slice(0, 10) : "");
    data.push([dia, d.kg, acum]);
  }
  data.push([]);
  data.push(["ACUM", acum, ""]);
  data.push(["PROM", promReales != null ? promReales : "", ""]);
  data.push(["PROY", forecastKg, ""]);
  data.push(["Comp", compTotalKg, ""]);
  data.push(["Dif Comp", compTotalKg != null ? acum - compTotalKg : "", ""]);
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Provincia Venta Diaria");
}

function hojaB(wb, ventaDiaria, year, month, lastDayStr, todayStr) {
  const { byDate } = ventaDiaria;
  const headers = ["Fecha", "Comisiones ($/kg)", "ACUM ratio"];
  const data = [headers];
  let sumDesc = 0;
  let sumKg = 0;
  for (const d of byDate) {
    const ratio = d.kg !== 0 ? d.desc / d.kg : null;
    sumDesc += d.desc || 0;
    sumKg += d.kg || 0;
    const acumRatio = sumKg !== 0 ? sumDesc / sumKg : null;
    const dia = typeof d.fecha === "string" ? d.fecha : (d.fecha && d.fecha.toISOString ? d.fecha.toISOString().slice(0, 10) : "");
    data.push([dia, ratio, acumRatio]);
  }
  data.push(["ACUM", "", sumKg !== 0 ? sumDesc / sumKg : ""]);
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Provincia Comisiones");
}

async function hojaC(client, wb, year, month, provinciaPlantas, centroPlantas, plantCodes) {
  const versionIds = await client.query(
    `SELECT id, version_number FROM igf.versions WHERE plant_code = 'GLOBAL' AND year = $1 AND month = $2 ORDER BY version_number`,
    [year, month]
  );
  const v1Id = (versionIds.rows || []).find((r) => r.version_number === 1)?.id;
  const vMaxRow = (versionIds.rows || []).filter((r) => r.version_number != null).sort((a, b) => b.version_number - a.version_number)[0];
  const vMaxId = vMaxRow ? vMaxRow.id : null;

  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'igf' AND table_name = 'compromiso_lines' ORDER BY ordinal_position`
  );
  const colNames = (cols.rows || []).map((r) => r.column_name).filter((c) => IGF_VAR_ORDER.includes(c));
  const varOrder = IGF_VAR_ORDER.filter((c) => colNames.includes(c));

  const data = [];
  data.push(["Hoja 3 - IGF Ejecutivo", year, month]);
  data.push([]);
  data.push(["Bloque Provincia: V1 (Compromiso), vMax, Forecast, Deltas $/kg y MXN"]);
  data.push(["Empresa", ...varOrder.flatMap((v) => [v + " V1", v + " vMax", v + " Forecast", "Delta " + v + " $/kg", "Delta " + v + " MXN"])]);
  if (v1Id && vMaxId) {
    const linesV1 = await client.query(`SELECT empresa, * FROM igf.compromiso_lines WHERE version_id = $1`, [v1Id]);
    const linesVMax = await client.query(`SELECT empresa, * FROM igf.compromiso_lines WHERE version_id = $1`, [vMaxId]);
    const byEmpV1 = new Map((linesV1.rows || []).map((r) => [(r.empresa || "").trim(), r]));
    const byEmpVMax = new Map((linesVMax.rows || []).map((r) => [(r.empresa || "").trim(), r]));
    const forecastByPlant = await getForecastByPlant(client, year, month, plantCodes);
    for (const emp of provinciaPlantas) {
      const r1 = byEmpV1.get(emp);
      const rMax = byEmpVMax.get(emp);
      const forecast = forecastByPlant.get(emp) || {};
      const kgV1 = (r1 && r1.venta_ton != null) ? r1.venta_ton * 1000 : 0;
      const kgMax = (rMax && rMax.venta_ton != null) ? rMax.venta_ton * 1000 : 0;
      const kgF = forecast.kg_forecast || 0;
      const row = [emp];
      for (const col of varOrder) {
        const v1Val = r1 && r1[col] != null ? Number(r1[col]) : null;
        const vMaxVal = rMax && rMax[col] != null ? Number(rMax[col]) : null;
        let fVal = null;
        if (col === "venta_ton") fVal = kgF / 1000;
        else if (col === "com_desc_kg") fVal = forecast.desc_kg_forecast;
        if (fVal == null && (col === "hg_pct" || col === "hg_kg")) fVal = vMaxVal;
        const deltaKg = (fVal != null && v1Val != null) ? fVal - v1Val : null;
        const mxnV1 = (v1Val != null && kgV1) ? v1Val * kgV1 : null;
        const mxnF = (fVal != null && kgF) ? fVal * kgF : null;
        const deltaMxn = (mxnF != null && mxnV1 != null) ? mxnF - mxnV1 : null;
        row.push(v1Val, vMaxVal, fVal, deltaKg, deltaMxn);
      }
      data.push(row);
    }
  }
  data.push([]);
  data.push(["Bloque Centro: V1 vs vMax (sin Forecast)"]);
  data.push(["Empresa", ...varOrder.flatMap((v) => [v + " V1", v + " vMax", "Delta " + v + " $/kg", "Delta " + v + " MXN"])]);
  if (v1Id && vMaxId) {
    const linesV1 = await client.query(`SELECT empresa, * FROM igf.compromiso_lines WHERE version_id = $1`, [v1Id]);
    const linesVMax = await client.query(`SELECT empresa, * FROM igf.compromiso_lines WHERE version_id = $1`, [vMaxId]);
    const byEmpV1 = new Map((linesV1.rows || []).map((r) => [(r.empresa || "").trim(), r]));
    const byEmpVMax = new Map((linesVMax.rows || []).map((r) => [(r.empresa || "").trim(), r]));
    for (const emp of centroPlantas) {
      const r1 = byEmpV1.get(emp);
      const rMax = byEmpVMax.get(emp);
      const kgV1 = (r1 && r1.venta_ton != null) ? r1.venta_ton * 1000 : 0;
      const kgMax = (rMax && rMax.venta_ton != null) ? rMax.venta_ton * 1000 : 0;
      const row = [emp];
      for (const col of varOrder) {
        const v1Val = r1 && r1[col] != null ? Number(r1[col]) : null;
        const vMaxVal = rMax && rMax[col] != null ? Number(rMax[col]) : null;
        const deltaKg = (vMaxVal != null && v1Val != null) ? vMaxVal - v1Val : null;
        const mxnV1 = (v1Val != null && kgV1) ? v1Val * kgV1 : null;
        const mxnMax = (vMaxVal != null && kgMax) ? vMaxVal * kgMax : null;
        const deltaMxn = (mxnMax != null && mxnV1 != null) ? mxnMax - mxnV1 : null;
        row.push(v1Val, vMaxVal, deltaKg, deltaMxn);
      }
      data.push(row);
    }
  }
  data.push([]);
  data.push(["Totales: Total Provincia y Total Centro (ponderados por kg para $/kg, suma para MXN)"]);
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "IGF Ejecutivo");
}

async function getForecastByPlant(client, year, month, plantCodes) {
  if (plantCodes.length === 0) return new Map();
  const placeholders = plantCodes.map((_, i) => `$${i + 1}`).join(",");
  const r = await client.query(
    `SELECT plant_code, SUM(kg_forecast) AS kg_forecast, SUM(desc_forecast) AS desc_forecast
     FROM arr.forecast_mensual WHERE plant_code IN (${placeholders}) AND year = $${plantCodes.length + 1} AND month = $${plantCodes.length + 2}
     GROUP BY plant_code`,
    [...plantCodes, year, month]
  );
  const byPlant = new Map();
  for (const row of r.rows || []) {
    const kg = Number(row.kg_forecast || 0);
    const desc = Number(row.desc_forecast || 0);
    byPlant.set((row.plant_code || "").trim(), {
      kg_forecast: kg,
      desc_forecast: desc,
      desc_kg_forecast: kg > 0 ? desc / kg : null,
    });
  }
  return byPlant;
}

module.exports = {
  generarDashboardArrForecast,
  getProvinciaPlantCodes,
  getPlantasZona,
};
