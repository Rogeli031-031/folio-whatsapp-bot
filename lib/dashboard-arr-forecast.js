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
const ventaProyeccionMes = require("./venta-proyeccion-mes");

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
const IGF_FORECAST_COLS = [
  "empresa", "venta_ton", "margen_kg", "com_desc_kg", "presupuesto_kg", "folios_aprob_zp_kg", "folios_carro_kg",
  "impuesto_kg", "hg_pct", "hg_kg", "bancos_planta_kg", "provision_planta_kg", "util_oper_kg", "util_oper_importe",
  "gtos_apoyos_corp_kg", "bancos_corp_kg", "otros_programas_kg", "inversiones_kg", "resultado_final_kg", "resultado_final_importe",
];
const IGF_FORECAST_HEADERS = [
  "Empresa", "Venta (ton)", "Margen ($/kg)", "Com. y Desc. ($/kg)", "Presupuesto ($/kg)", "Folios Aprob. ZP ($/kg)", "Folios carro ($/kg)",
  "Impuesto ($/kg)", "HG (%)", "HG ($/kg)", "Bancos Planta", "Prov. Planta", "Util. Oper. ($/kg)", "Util. Oper. (Importe)",
  "Gtos/Apoyos Corp", "Bancos Corp.", "Otros Programas", "Inversiones", "Resultado ($/kg)", "Resultado (Importe)",
];

async function generarDashboardArrForecast(client, year, month, plantCode = null, options = {}) {
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

  const compTotalKg = await getCompromisoTotalProvincia(client, year, month, provinciaPlantas);
  const ventaTonGrid = await getVentaToneladasGrid(client, year, month);
  const descuentoGrid = await getDescuentoPorKiloGrid(client, year, month);

  hojaA(wb, ventaTonGrid, year, month, compTotalKg, lastDayStr, todayStr);
  hojaB(wb, descuentoGrid, ventaTonGrid, year, month, lastDayStr, todayStr);

  if (options.igfForecast && options.igfForecast.rows && options.igfForecast.rows.length > 0) {
    const data = [IGF_FORECAST_HEADERS];
    for (const row of options.igfForecast.rows) {
      const r = [];
      for (let k = 0; k < IGF_FORECAST_COLS.length; k++) {
        const key = IGF_FORECAST_COLS[k];
        let v = row[key];
        if (key === "empresa") {
          r.push(v != null && v !== "" ? String(v) : "");
        } else if (key === "hg_pct" && v != null && Number.isFinite(Number(v))) {
          r.push(Number(v) * 100);
        } else {
          r.push(v != null && v !== "" && (typeof v === "number" || !Number.isNaN(Number(v))) ? (typeof v === "number" ? v : Number(v)) : "");
        }
      }
      data.push(r);
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "IGF Forecast");
  } else {
    await hojaC(client, wb, year, month, provinciaPlantas, centro, plantsForProvinciaSheets);
  }

  if (options.proyeccionCatSub && options.proyeccionCatSub.targetYear && options.proyeccionCatSub.targetMonth) {
    await appendHojaProyeccionCatSub(client, wb, options.proyeccionCatSub);
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf;
}

/**
 * Hoja: venta kg y descuento $ proyectados por planta, categoría (canal) y subcategoría (subcanal).
 * Misma regla que /api/dashboard/venta-proyeccion-mes (14 días × DOW → mes objetivo).
 */
async function appendHojaProyeccionCatSub(client, wb, opts) {
  const targetYear = opts.targetYear;
  const targetMonth = opts.targetMonth;
  let fechaHasta = (opts.fechaHasta || "").toString().trim().slice(0, 10);
  if (!fechaHasta) {
    const t = new Date();
    t.setDate(t.getDate() - 1);
    fechaHasta = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
  const plantFilter = (opts.plantCodeFilter || "").toString().trim();
  let plants;
  if (plantFilter) {
    plants = [plantFilter];
  } else {
    const r = await client.query(`SELECT plant_code FROM arr.provincia_plants ORDER BY plant_code`);
    plants = (r.rows || []).map((row) => row.plant_code).filter(Boolean);
  }

  const data = [];
  data.push([
    "Proyección por categoría y subcategoría (venta kg y descuento $)",
    `Mes objetivo: ${targetYear}-${String(targetMonth).padStart(2, "0")}`,
    `Ventana 14 días hasta: ${fechaHasta}`,
  ]);
  data.push([
    "Regla: promedio de los últimos 14 días por día de la semana (cada DOW aparece 2 veces → suma÷2) × cantidad de ese DOW en el mes objetivo. Descuento: misma lógica sobre montos diarios (join cliente_categoria_mes del mes de la ventana).",
  ]);
  data.push([]);
  data.push([
    "Planta",
    "Categoría",
    "Subcategoría",
    "Kg proyectados",
    "Descuento $ proyectado",
    "Desc $/kg proyectado",
  ]);

  for (const p of plants) {
    const block = await ventaProyeccionMes.computeProyeccionCanalSubMes(client, p, targetYear, targetMonth, fechaHasta);
    for (const row of block.rows) {
      data.push([
        row.plant_code,
        row.categoria,
        row.subcategoria,
        row.kg_proyectado,
        row.descuento_mxn_proyectado,
        row.descuento_por_kg_proyectado != null ? row.descuento_por_kg_proyectado : "",
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Proy cat/sub mes");
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

/** Plantas provincia en orden (para columnas del Excel). */
async function getProvinciaPlantsOrdered(client) {
  const r = await client.query(
    `SELECT plant_code FROM arr.provincia_plants ORDER BY plant_code`
  );
  return (r.rows || []).map((row) => (row.plant_code || "").trim()).filter(Boolean);
}

/**
 * Grid venta toneladas: plantas en columnas, días en filas.
 * Fuente: arr.venta_toneladas_diarias_provincia; si está vacía, fallback desde arr.ventas_diarias_cliente (prov_map).
 * Forecast por planta: arr.forecast_mensual mapeado por nombre/clave a provincia_plants.
 */
async function getVentaToneladasGrid(client, year, month) {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const plants = await getProvinciaPlantsOrdered(client);
  if (plants.length === 0) return { plants: [], byDate: [], forecastByPlant: new Map(), cutoffDay: lastDay + 1 };

  const r = await client.query(
    `SELECT plant_code, fecha, venta_ton
     FROM arr.venta_toneladas_diarias_provincia
     WHERE fecha >= $1::date AND fecha <= $2::date
     ORDER BY fecha`,
    [firstDay, lastDayStr]
  );
  const byDateMap = new Map(); // fecha -> { byPlant: {}, tot }
  for (const row of r.rows || []) {
    const fecha = row.fecha && (typeof row.fecha === "string" ? row.fecha : row.fecha.toISOString?.().slice(0, 10));
    if (!fecha) continue;
    if (!byDateMap.has(fecha)) byDateMap.set(fecha, { fecha, byPlant: {}, tot: 0 });
    const rec = byDateMap.get(fecha);
    const v = Number(row.venta_ton) || 0;
    rec.byPlant[row.plant_code] = v;
    rec.tot += v;
  }
  if (byDateMap.size === 0) {
    const fallback = await client.query(
      `WITH prov_map AS (
         SELECT DISTINCT p.nombre AS prov_name, UPPER(TRIM(p.nombre)) AS key_nombre, UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
         FROM public.plantas p
         JOIN arr.provincia_plants ap ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
           OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
         WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO' AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
       )
       SELECT pm.prov_name AS plant_code, v.fecha, ROUND(SUM(v.kg) / 1000.0, 0)::INTEGER AS venta_ton
       FROM arr.ventas_diarias_cliente v
       JOIN prov_map pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
       WHERE v.fecha >= $1::date AND v.fecha <= $2::date
       GROUP BY pm.prov_name, v.fecha ORDER BY v.fecha`,
      [firstDay, lastDayStr]
    );
    for (const row of fallback.rows || []) {
      const fecha = row.fecha && (typeof row.fecha === "string" ? row.fecha : row.fecha.toISOString?.().slice(0, 10));
      if (!fecha) continue;
      if (!byDateMap.has(fecha)) byDateMap.set(fecha, { fecha, byPlant: {}, tot: 0 });
      const rec = byDateMap.get(fecha);
      const v = Number(row.venta_ton) || 0;
      rec.byPlant[row.plant_code] = v;
      rec.tot += v;
    }
  }
  const byDate = [];
  for (let d = 1; d <= lastDay; d++) {
    const fecha = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const rec = byDateMap.get(fecha) || { fecha, byPlant: {}, tot: 0 };
    byDate.push({ day: d, fecha, byPlant: rec.byPlant, tot: rec.tot });
  }

  const forecastR = await client.query(
    `SELECT ap.plant_code, COALESCE(SUM(fm.kg_forecast), 0) AS kg_forecast
     FROM arr.forecast_mensual fm
     JOIN public.plantas p ON UPPER(TRIM(fm.plant_code)) = UPPER(TRIM(p.nombre))
       OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(fm.plant_code)) = UPPER(TRIM(p.clave)))
     JOIN arr.provincia_plants ap ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
       OR (ap.plant_code = p.clave AND TRIM(COALESCE(p.clave,'')) <> '')
     WHERE fm.year = $1 AND fm.month = $2
     GROUP BY ap.plant_code`,
    [year, month]
  );
  const forecastByPlant = new Map((forecastR.rows || []).map((row) => [row.plant_code, Number(row.kg_forecast || 0) / 1000]));

  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const cutoffDay = isCurrentMonth ? today.getDate() : (year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth() + 1) ? lastDay + 1 : 1);
  if (cutoffDay <= lastDay) {
    const remainingDays = lastDay - cutoffDay + 1;
    for (const p of plants) {
      const realSum = byDate.filter((d) => d.day < cutoffDay).reduce((s, d) => s + (Number(d.byPlant[p]) || 0), 0);
      const forecastTon = forecastByPlant.get(p) || 0;
      let remainingTon = forecastTon - realSum;
      if (remainingTon < 0) remainingTon = 0;
      const perDay = remainingDays > 0 ? remainingTon / remainingDays : 0;
      for (const d of byDate) {
        if (d.day >= cutoffDay) d.byPlant[p] = Math.round(perDay * 1000) / 1000;
      }
    }
    for (const d of byDate) {
      if (d.day >= cutoffDay) d.tot = plants.reduce((s, p) => s + (Number(d.byPlant[p]) || 0), 0);
    }
  }
  return { plants, byDate, forecastByPlant, cutoffDay };
}

/**
 * Grid descuento por kilo: plantas en columnas, días en filas.
 * Fuente: arr.descuento_por_kilo_diario_provincia; si vacía, fallback desde descuentos_diarios_cliente/ventas con prov_map.
 * Días desde hoy: desc_kg_forecast por planta (forecast_mensual mapeado por nombre/clave).
 */
async function getDescuentoPorKiloGrid(client, year, month) {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const plants = await getProvinciaPlantsOrdered(client);
  if (plants.length === 0) return { plants: [], byDate: [], cutoffDay: lastDay + 1 };

  const r = await client.query(
    `SELECT plant_code, fecha, descuento_por_kg
     FROM arr.descuento_por_kilo_diario_provincia
     WHERE fecha >= $1::date AND fecha <= $2::date
     ORDER BY fecha`,
    [firstDay, lastDayStr]
  );
  const byDateMap = new Map();
  for (const row of r.rows || []) {
    const fecha = row.fecha && (typeof row.fecha === "string" ? row.fecha : row.fecha.toISOString?.().slice(0, 10));
    if (!fecha) continue;
    if (!byDateMap.has(fecha)) byDateMap.set(fecha, { fecha, byPlant: {} });
    byDateMap.get(fecha).byPlant[row.plant_code] = Number(row.descuento_por_kg);
  }
  if (byDateMap.size === 0) {
    const fallback = await client.query(
      `WITH prov_map AS (
         SELECT DISTINCT p.nombre AS prov_name, UPPER(TRIM(p.nombre)) AS key_nombre, UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
         FROM public.plantas p
         JOIN arr.provincia_plants ap ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
           OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
         WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
       ),
       k AS (
         SELECT pm.prov_name AS plant_code, v.fecha, SUM(v.kg) AS total_kg
         FROM arr.ventas_diarias_cliente v
         JOIN prov_map pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
         WHERE v.fecha >= $1::date AND v.fecha <= $2::date GROUP BY pm.prov_name, v.fecha
       ),
       d AS (
         SELECT pm.prov_name AS plant_code, d.fecha, SUM(d.monto) AS total_monto
         FROM arr.descuentos_diarios_cliente d
         JOIN prov_map pm ON UPPER(TRIM(d.plant_code)) = pm.key_nombre OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
         WHERE d.fecha >= $1::date AND d.fecha <= $2::date GROUP BY pm.prov_name, d.fecha
       )
       SELECT k.plant_code, k.fecha, ROUND((d.total_monto / NULLIF(k.total_kg, 0))::numeric, 2) AS descuento_por_kg
       FROM k JOIN d ON k.plant_code = d.plant_code AND k.fecha = d.fecha`,
      [firstDay, lastDayStr]
    );
    for (const row of fallback.rows || []) {
      const fecha = row.fecha && (typeof row.fecha === "string" ? row.fecha : row.fecha.toISOString?.().slice(0, 10));
      if (!fecha) continue;
      if (!byDateMap.has(fecha)) byDateMap.set(fecha, { fecha, byPlant: {} });
      byDateMap.get(fecha).byPlant[row.plant_code] = Number(row.descuento_por_kg);
    }
  }
  const byDate = [];
  for (let d = 1; d <= lastDay; d++) {
    const fecha = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const rec = byDateMap.get(fecha) || { fecha, byPlant: {} };
    byDate.push({ day: d, fecha, byPlant: { ...rec.byPlant } });
  }

  const forecastR = await client.query(
    `SELECT ap.plant_code, COALESCE(SUM(fm.desc_forecast), 0) AS desc_forecast, COALESCE(SUM(fm.kg_forecast), 0) AS kg_forecast
     FROM arr.forecast_mensual fm
     JOIN public.plantas p ON UPPER(TRIM(fm.plant_code)) = UPPER(TRIM(p.nombre))
       OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(fm.plant_code)) = UPPER(TRIM(p.clave)))
     JOIN arr.provincia_plants ap ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre)) OR (ap.plant_code = p.clave AND TRIM(COALESCE(p.clave,'')) <> '')
     WHERE fm.year = $1 AND fm.month = $2
     GROUP BY ap.plant_code`,
    [year, month]
  );
  const descKgByPlant = new Map();
  for (const row of forecastR.rows || []) {
    const kg = Number(row.kg_forecast || 0);
    const desc = Number(row.desc_forecast || 0);
    descKgByPlant.set(row.plant_code, kg > 0 ? desc / kg : 0);
  }
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const cutoffDay = isCurrentMonth ? today.getDate() : (year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth() + 1) ? lastDay + 1 : 1);
  for (const d of byDate) {
    if (d.day >= cutoffDay) {
      for (const p of plants) {
        const val = descKgByPlant.get(p);
        if (val != null) d.byPlant[p] = Math.round(val * 100) / 100;
      }
    }
  }
  return { plants, byDate, cutoffDay };
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

function hojaA(wb, ventaTonGrid, year, month, compTotalKg, lastDayStr, todayStr) {
  const { plants, byDate, forecastByPlant, cutoffDay = 999 } = ventaTonGrid;
  const headers = ["DÍA", ...plants, "Tot Provincia"];
  const data = [headers];

  for (const d of byDate) {
    const row = [d.day];
    let tot = 0;
    for (const p of plants) {
      const v = d.byPlant[p] != null ? d.byPlant[p] : "";
      row.push(v === "" ? "" : v);
      if (typeof v === "number") tot += v;
    }
    row.push(tot);
    data.push(row);
  }

  const acums = plants.map((p) => byDate.reduce((s, d) => s + (Number(d.byPlant[p]) || 0), 0));
  const totAcum = acums.reduce((s, a) => s + a, 0);
  const numDias = byDate.length;
  const proms = plants.map((p) => (numDias ? acums[plants.indexOf(p)] / numDias : ""));
  const totProm = numDias ? totAcum / numDias : "";
  const proys = plants.map((p) => forecastByPlant.get(p) ?? "");
  const totProy = plants.reduce((s, p) => s + (forecastByPlant.get(p) || 0), 0) || "";

  data.push([]);
  data.push(["ACUM", ...acums, totAcum]);
  data.push(["PROM", ...proms, totProm]);
  data.push(["PROY", ...proys, totProy]);
  data.push(["Comp", ...plants.map(() => ""), compTotalKg != null ? compTotalKg / 1000 : ""]);
  data.push(["Dif Comp", ...plants.map(() => ""), compTotalKg != null ? totAcum - compTotalKg / 1000 : ""]);
  const ws = XLSX.utils.aoa_to_sheet(data);
  for (let i = 0; i < byDate.length; i++) {
    const day = byDate[i].day;
    const isReal = day < cutoffDay;
    const fill = isReal ? "DCE6F1" : "F2F2F2";
    for (let j = 0; j < headers.length; j++) {
      const ref = XLSX.utils.encode_cell({ r: i + 1, c: j });
      if (!ws[ref]) continue;
      ws[ref].s = { fill: { fgColor: { rgb: fill } } };
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, "Provincia Venta Diaria");
}

function hojaB(wb, descuentoGrid, ventaTonGrid, year, month, lastDayStr, todayStr) {
  const { plants, byDate, cutoffDay = 999 } = descuentoGrid;
  const headers = ["DÍA", ...plants];
  const data = [headers];

  for (const d of byDate) {
    const row = [d.day];
    for (const p of plants) {
      const v = d.byPlant[p];
      row.push(v != null ? v : "");
    }
    data.push(row);
  }

  const ventaByFecha = new Map((ventaTonGrid.byDate || []).map((d) => [d.fecha, d.byPlant || {}]));
  const acumByPlant = plants.map((p) => {
    let num = 0;
    let den = 0;
    for (const d of byDate) {
      const desc = d.byPlant[p];
      const ventaTon = (ventaByFecha.get(d.fecha) || {})[p];
      const descNum = desc != null && desc !== "" ? Number(desc) : null;
      const vTon = ventaTon != null && ventaTon !== "" ? Number(ventaTon) : null;
      if (descNum == null || vTon == null) continue;
      if (!Number.isFinite(descNum) || !Number.isFinite(vTon) || vTon === 0) continue;
      num += descNum * vTon;
      den += vTon;
    }
    if (den === 0) return "";
    return Math.round((num / den) * 1e6) / 1e6;
  });
  data.push([]);
  data.push(["ACUM", ...acumByPlant]);
  const ws = XLSX.utils.aoa_to_sheet(data);
  for (let i = 0; i < byDate.length; i++) {
    const day = byDate[i].day;
    const isReal = day < cutoffDay;
    const fill = isReal ? "DCE6F1" : "F2F2F2";
    for (let j = 0; j < headers.length; j++) {
      const ref = XLSX.utils.encode_cell({ r: i + 1, c: j });
      if (!ws[ref]) continue;
      ws[ref].s = { fill: { fgColor: { rgb: fill } } };
    }
  }
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
