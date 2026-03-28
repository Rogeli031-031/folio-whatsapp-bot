/**
 * Proyección de venta (kg) para un mes futuro:
 * promedio de las últimas 2 semanas (14 días) por día de la semana,
 * multiplicado por cuántos días de cada DOW tiene el mes objetivo.
 *
 * Usa arr.ventas_diarias_cliente agregado por fecha y plant_code.
 */

"use strict";

function dateStrFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(s) {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

function addDaysStr(ymd, days) {
  const d = parseYMD(ymd);
  if (!d || Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return dateStrFromDate(d);
}

/** Cuenta cuántos domingos (0) … sábados (6) hay en el mes. */
function countDowInMonth(year, month) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const last = new Date(year, month, 0).getDate();
  for (let day = 1; day <= last; day++) {
    const dow = new Date(year, month - 1, day).getDay();
    counts[dow]++;
  }
  return counts;
}

/**
 * Misma lógica que arr-refresh / dashboard: arr.provincia_plants (nombre canónico) ↔ public.plantas (nombre o clave) ↔ filas ARR (plant_code puede ser clave E12 o nombre).
 */
const SQL_PM_ONE = `
  SELECT DISTINCT p.nombre AS prov_name,
         UPPER(TRIM(p.nombre)) AS key_nombre,
         UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
    FROM public.plantas p
    JOIN arr.provincia_plants ap
      ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
      OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
   WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
     AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
     AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM($1::text))
`;

/**
 * Suma kg por DOW en la ventana [startStr, endStr] inclusive (14 días consecutivos).
 * @returns {Promise<{ sumByDow: number[], kgByFecha: Map<string, number> }>}
 */
async function fetchKgSumByDowWindow(client, plantCode, startStr, endStr) {
  const r = await client.query(
    `WITH pm AS (${SQL_PM_ONE})
     SELECT v.fecha::date AS fecha, SUM(v.kg) AS kg
       FROM arr.ventas_diarias_cliente v
       JOIN pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
              OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
      WHERE v.fecha >= $2::date AND v.fecha <= $3::date
      GROUP BY v.fecha::date`,
    [plantCode, startStr, endStr]
  );
  const kgByFecha = new Map();
  for (const row of r.rows || []) {
    const f = row.fecha instanceof Date ? dateStrFromDate(row.fecha) : String(row.fecha).slice(0, 10);
    kgByFecha.set(f, Number(row.kg || 0));
  }
  const sumByDow = [0, 0, 0, 0, 0, 0, 0];
  let cur = parseYMD(startStr);
  const end = parseYMD(endStr);
  if (!cur || !end) return { sumByDow, kgByFecha };
  for (let i = 0; i < 500 && cur <= end; i++) {
    const fs = dateStrFromDate(cur);
    const dow = cur.getDay();
    sumByDow[dow] += kgByFecha.get(fs) || 0;
    cur.setDate(cur.getDate() + 1);
  }
  return { sumByDow, kgByFecha };
}

/**
 * Promedio kg por DOW: en 14 días corridos cada DOW aparece exactamente 2 veces → sum/2.
 */
function avgKgByDowFromTwoWeekSums(sumByDow) {
  return sumByDow.map((s) => s / 2);
}

function projectKgForMonth(avgByDow, year, month) {
  const counts = countDowInMonth(year, month);
  let kg = 0;
  for (let dow = 0; dow < 7; dow++) {
    kg += (avgByDow[dow] || 0) * counts[dow];
  }
  return { kg, diasPorDow: counts };
}

function keyCanalSub(canal, subcanal) {
  return `${String(canal || "").trim()}|${String(subcanal || "").trim()}`;
}

function emptyDow7() {
  return [0, 0, 0, 0, 0, 0, 0];
}

async function fetchVentasCanalSubRows(client, plantCode, startStr, endStr) {
  const r = await client.query(
    `WITH pm AS (${SQL_PM_ONE})
     SELECT v.fecha::date AS fecha, v.canal, COALESCE(v.subcanal, '') AS subcanal, SUM(v.kg) AS kg
       FROM arr.ventas_diarias_cliente v
       JOIN pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
              OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
      WHERE v.fecha >= $2::date AND v.fecha <= $3::date
      GROUP BY v.fecha::date, v.canal, COALESCE(v.subcanal, '')`,
    [plantCode, startStr, endStr]
  );
  return r.rows || [];
}

async function fetchDescuentosCanalSubRows(client, plantCode, startStr, endStr, catYear, catMonth) {
  const r = await client.query(
    `WITH pm AS (${SQL_PM_ONE})
     SELECT d.fecha::date AS fecha,
            COALESCE(c.canal, 'Casa') AS canal,
            COALESCE(c.subcanal, '') AS subcanal,
            SUM(d.monto) AS monto
       FROM arr.descuentos_diarios_cliente d
       JOIN pm ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
              OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
       LEFT JOIN arr.cliente_categoria_mes c
         ON c.cliente_norm = d.cliente_norm AND c.year = $4 AND c.month = $5
        AND (
              c.plant_code = d.plant_code
           OR UPPER(TRIM(c.plant_code)) = UPPER(TRIM(pm.prov_name))
           OR (pm.key_clave <> '' AND UPPER(TRIM(c.plant_code)) = UPPER(TRIM(pm.key_clave)))
            )
      WHERE d.fecha >= $2::date AND d.fecha <= $3::date
      GROUP BY d.fecha::date, COALESCE(c.canal, 'Casa'), COALESCE(c.subcanal, '')`,
    [plantCode, startStr, endStr, catYear, catMonth]
  );
  return r.rows || [];
}

/**
 * Suma kg y monto por DOW y por canal/subcanal en la ventana de 14 días.
 */
function aggregateKgMontoByKeyAndDow(ventaRows, descRows) {
  const byKeyKg = new Map();
  const byKeyMonto = new Map();
  const ensure = (map, key) => {
    if (!map.has(key)) map.set(key, emptyDow7());
  };
  for (const row of ventaRows) {
    const f = row.fecha instanceof Date ? dateStrFromDate(row.fecha) : String(row.fecha).slice(0, 10);
    const dt = parseYMD(f);
    if (!dt) continue;
    const dow = dt.getDay();
    const key = keyCanalSub(row.canal, row.subcanal);
    ensure(byKeyKg, key);
    byKeyKg.get(key)[dow] += Number(row.kg || 0);
  }
  for (const row of descRows) {
    const f = row.fecha instanceof Date ? dateStrFromDate(row.fecha) : String(row.fecha).slice(0, 10);
    const dt = parseYMD(f);
    if (!dt) continue;
    const dow = dt.getDay();
    const key = keyCanalSub(row.canal, row.subcanal);
    ensure(byKeyMonto, key);
    byKeyMonto.get(key)[dow] += Number(row.monto || 0);
  }
  return { byKeyKg, byKeyMonto };
}

/**
 * Proyección abril (o mes objetivo) por categoría/canal y subcategoría/subcanal.
 * Misma regla que venta total: promedio en 14 días por DOW (suma/2) × días del mes objetivo.
 * Descuento: misma lógica sobre montos diarios por canal/subcanal.
 */
async function computeProyeccionCanalSubMes(client, plantCode, targetYear, targetMonth, fechaHasta) {
  const endStr = String(fechaHasta || "").trim().slice(0, 10);
  const startStr = addDaysStr(endStr, -13);
  if (!startStr) throw new Error("fechaHasta inválida");
  const endDt = parseYMD(endStr);
  const catYear = endDt ? endDt.getFullYear() : targetYear;
  const catMonth = endDt ? endDt.getMonth() + 1 : targetMonth;

  const ventaRows = await fetchVentasCanalSubRows(client, plantCode, startStr, endStr);
  const descRows = await fetchDescuentosCanalSubRows(client, plantCode, startStr, endStr, catYear, catMonth);
  const { byKeyKg, byKeyMonto } = aggregateKgMontoByKeyAndDow(ventaRows, descRows);

  const allKeys = new Set([...byKeyKg.keys(), ...byKeyMonto.keys()]);
  const rows = [];
  for (const key of allKeys) {
    const sumKg = byKeyKg.get(key) || emptyDow7();
    const sumMonto = byKeyMonto.get(key) || emptyDow7();
    const avgKg = avgKgByDowFromTwoWeekSums(sumKg);
    const avgMonto = avgKgByDowFromTwoWeekSums(sumMonto);
    const kgProj = projectKgForMonth(avgKg, targetYear, targetMonth).kg;
    const montoProj = projectKgForMonth(avgMonto, targetYear, targetMonth).kg;
    const sep = key.indexOf("|");
    const canal = sep >= 0 ? key.slice(0, sep) : key;
    const subcanal = sep >= 0 ? key.slice(sep + 1) : "";
    const descPorKg = kgProj > 0 ? montoProj / kgProj : null;
    rows.push({
      plant_code: plantCode,
      categoria: canal || "",
      subcategoria: subcanal || "",
      kg_proyectado: Math.round(kgProj * 100) / 100,
      descuento_mxn_proyectado: Math.round(montoProj * 100) / 100,
      descuento_por_kg_proyectado: descPorKg != null ? Math.round(descPorKg * 1000000) / 1000000 : null,
    });
  }
  rows.sort((a, b) => {
    const p = String(a.categoria).localeCompare(String(b.categoria), "es");
    if (p !== 0) return p;
    return String(a.subcategoria).localeCompare(String(b.subcategoria), "es");
  });
  if (rows.length === 0) {
    rows.push({
      plant_code: plantCode,
      categoria: "(sin datos en ventana)",
      subcategoria: "",
      kg_proyectado: 0,
      descuento_mxn_proyectado: 0,
      descuento_por_kg_proyectado: null,
    });
  }
  return {
    plant_code: plantCode,
    mes_objetivo: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
    ventana_inicio: startStr,
    ventana_fin: endStr,
    categoria_mes_join: `${catYear}-${String(catMonth).padStart(2, "0")}`,
    rows,
  };
}

/**
 * @param {object} client - pg
 * @param {string} plantCode - ej. Tehuacán, Acapulco
 * @param {number} targetYear - año del mes a proyectar (ej. 2026)
 * @param {number} targetMonth - mes a proyectar 1-12 (ej. 4 abril)
 * @param {string} fechaHasta - YYYY-MM-DD último día incluido en las 2 semanas (típicamente ayer)
 */
async function computeVentaProyectadaMes(client, plantCode, targetYear, targetMonth, fechaHasta) {
  const endStr = String(fechaHasta || "").trim().slice(0, 10);
  const startStr = addDaysStr(endStr, -13);
  if (!startStr) {
    throw new Error("fechaHasta inválida");
  }
  const { sumByDow, kgByFecha } = await fetchKgSumByDowWindow(client, plantCode, startStr, endStr);
  const avgByDow = avgKgByDowFromTwoWeekSums(sumByDow);
  const { kg, diasPorDow } = projectKgForMonth(avgByDow, targetYear, targetMonth);
  const ventaTon = kg / 1000;
  const dowLabels = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const promedioPorDow = {};
  const diasPorDowObj = {};
  for (let i = 0; i < 7; i++) {
    promedioPorDow[dowLabels[i]] = Math.round(avgByDow[i] * 100) / 100;
    diasPorDowObj[dowLabels[i]] = diasPorDow[i];
  }
  return {
    plant_code: plantCode,
    mes_objetivo: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
    ventana_inicio: startStr,
    ventana_fin: endStr,
    regla: "Promedio kg por DOW en últimos 14 días (sum/2 por DOW) × días por DOW en mes objetivo",
    kg_proyectado: Math.round(kg * 100) / 100,
    venta_ton: Math.round(ventaTon * 1000000) / 1000000,
    sum_kg_por_dow_en_ventana: sumByDow.map((s) => Math.round(s * 100) / 100),
    promedio_kg_por_dow: promedioPorDow,
    dias_por_dow_en_mes_objetivo: diasPorDowObj,
    fechas_con_venta_en_ventana: kgByFecha.size,
  };
}

module.exports = {
  computeVentaProyectadaMes,
  computeProyeccionCanalSubMes,
  countDowInMonth,
  addDaysStr,
};
