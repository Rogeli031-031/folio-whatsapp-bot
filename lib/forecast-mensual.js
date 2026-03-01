/**
 * Forecast mensual directo: por planta, canal, subcanal.
 * Ventas: promedio por día de semana (solo dos últimos días equivalentes) × días restantes por DOW; feriados × 0.50.
 * Descuento: mismo método en $; descuento/kg = $desc_forecast / kg_forecast.
 * Ignora fecha = hoy; backfill mes anterior si hace falta.
 */

"use strict";

const { feriadosSet } = require("./feriados-mx");

function dateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDow(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * Días restantes del mes desde el día después de ayer hasta fin de mes.
 * Cada día tiene { fecha, dow, isHoliday }.
 */
function remainingDaysInMonth(year, month, ayerStr) {
  const ayer = new Date(ayerStr + "T12:00:00Z");
  const lastDay = new Date(year, month, 0).getDate();
  const list = [];
  for (let d = ayer.getDate() + 1; d <= lastDay; d++) {
    const f = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    list.push({
      fecha: f,
      dow: getDow(f),
      isHoliday: feriadosSet(year).has(f),
    });
  }
  return list;
}

/**
 * Obtiene las dos últimas fechas con el mismo DOW que ya hayan ocurrido (hasta ayer).
 * Busca en mes actual y, si no hay suficientes, en mes anterior (backfill).
 */
function getLastTwoSameDow(datesWithDow, targetDow, ayerStr, year, month) {
  const filtered = datesWithDow.filter((x) => x.dow === targetDow && x.fecha <= ayerStr);
  filtered.sort((a, b) => b.fecha.localeCompare(a.fecha));
  const two = filtered.slice(0, 2);
  return two;
}

/**
 * Calcula forecast mensual y escribe en arr.forecast_mensual.
 * @param {object} client - pg client
 * @param {string} plantCode
 * @param {number} year
 * @param {number} month
 * @param {string} todayStr - YYYY-MM-DD (opcional; default hoy sistema)
 */
async function calcularForecastMensual(client, plantCode, year, month, todayStr = null) {
  const today = todayStr ? new Date(todayStr + "T12:00:00Z") : new Date();
  const ayer = new Date(today);
  ayer.setDate(ayer.getDate() - 1);
  const ayerStr = dateStr(ayer);

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevFirst = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
  const prevLastStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(prevLastDay).padStart(2, "0")}`;

  const ventasRes = await client.query(
    `SELECT fecha, canal, COALESCE(subcanal, '') AS subcanal, SUM(kg) AS kg
     FROM arr.ventas_diarias_cliente
     WHERE plant_code = $1 AND fecha >= $2::date AND fecha <= $3::date
     GROUP BY fecha, canal, subcanal`,
    [plantCode, prevFirst, lastDayStr]
  );

  const descRes = await client.query(
    `SELECT d.fecha, COALESCE(c.canal, 'Casa') AS canal, COALESCE(c.subcanal, '') AS subcanal, SUM(d.monto) AS monto
     FROM arr.descuentos_diarios_cliente d
     LEFT JOIN arr.cliente_categoria_mes c ON c.plant_code = d.plant_code AND c.year = $2 AND c.month = $3 AND c.cliente_norm = d.cliente_norm
     WHERE d.plant_code = $1 AND d.fecha >= $4::date AND d.fecha <= $5::date
     GROUP BY d.fecha, COALESCE(c.canal, 'Casa'), COALESCE(c.subcanal, '')`,
    [plantCode, year, month, prevFirst, lastDayStr]
  );

  const ventasByKey = new Map();
  for (const r of ventasRes.rows || []) {
    const key = `${r.canal}|${r.subcanal}`;
    if (!ventasByKey.has(key)) ventasByKey.set(key, []);
    ventasByKey.get(key).push({ fecha: r.fecha, kg: Number(r.kg || 0), desc: 0 });
  }

  const descByKey = new Map();
  for (const r of descRes.rows || []) {
    const canal = r.canal || "Casa";
    const subcanal = r.subcanal != null ? r.subcanal : "";
    const key = `${canal}|${subcanal}`;
    if (!descByKey.has(key)) descByKey.set(key, []);
    descByKey.get(key).push({ fecha: r.fecha, monto: Number(r.monto || 0) });
  }

  const allKeys = new Set([...ventasByKey.keys(), ...descByKey.keys()]);
  const results = [];

  for (const key of allKeys) {
    const [canal, subcanal] = key.split("|");
    const subcanalNull = subcanal === "" ? null : subcanal;

    const ventasList = ventasByKey.get(key) || [];
    const descList = descByKey.get(key) || [];
    const byDateV = new Map();
    for (const v of ventasList) byDateV.set(v.fecha, v.kg);
    const byDateD = new Map();
    for (const d of descList) byDateD.set(d.fecha, d.monto);

    const datesInRange = new Set();
    for (const v of ventasList) datesInRange.add(v.fecha);
    for (const d of descList) datesInRange.add(d.fecha);
    const datesWithDow = Array.from(datesInRange).filter((f) => f <= ayerStr).map((f) => ({ fecha: f, dow: getDow(f) }));

    let kgActual = 0;
    let descActual = 0;
    for (const f of datesInRange) {
      if (f > ayerStr || f < firstDay) continue;
      kgActual += byDateV.get(f) || 0;
      descActual += byDateD.get(f) || 0;
    }

    let kgProyectado = 0;
    let descProyectado = 0;
    const remaining = remainingDaysInMonth(year, month, ayerStr);

    for (let dow = 0; dow < 7; dow++) {
      const lastTwo = getLastTwoSameDow(datesWithDow, dow, ayerStr, year, month);
      const avgKg = lastTwo.length ? lastTwo.reduce((s, t) => s + (byDateV.get(t.fecha) || 0), 0) / lastTwo.length : 0;
      const avgDesc = lastTwo.length ? lastTwo.reduce((s, t) => s + (byDateD.get(t.fecha) || 0), 0) / lastTwo.length : 0;

      const daysThisDow = remaining.filter((x) => x.dow === dow);
      for (const day of daysThisDow) {
        const factor = day.isHoliday ? 0.5 : 1;
        kgProyectado += avgKg * factor;
        descProyectado += avgDesc * factor;
      }
    }

    const kgForecast = kgActual + kgProyectado;
    const descForecast = descActual + descProyectado;
    const descKgForecast = kgForecast > 0 ? descForecast / kgForecast : null;

    results.push({
      canal,
      subcanal: subcanalNull,
      kg_actual: kgActual,
      kg_proyectado: kgProyectado,
      kg_forecast: kgForecast,
      desc_actual: descActual,
      desc_proyectado: descProyectado,
      desc_forecast: descForecast,
      desc_kg_forecast: descKgForecast,
    });
  }

  await client.query(
    `DELETE FROM arr.forecast_mensual WHERE plant_code = $1 AND year = $2 AND month = $3`,
    [plantCode, year, month]
  );

  for (const r of results) {
    await client.query(
      `INSERT INTO arr.forecast_mensual (plant_code, year, month, canal, subcanal, kg_actual, kg_proyectado, kg_forecast, desc_actual, desc_proyectado, desc_forecast, desc_kg_forecast)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        plantCode,
        year,
        month,
        r.canal,
        r.subcanal,
        r.kg_actual,
        r.kg_proyectado,
        r.kg_forecast,
        r.desc_actual,
        r.desc_proyectado,
        r.desc_forecast,
        r.desc_kg_forecast,
      ]
    );
  }

  return { rows: results.length };
}

module.exports = { calcularForecastMensual, dateStr, getDow, remainingDaysInMonth, feriadosSet };
