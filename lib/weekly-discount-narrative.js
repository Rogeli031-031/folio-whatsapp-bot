/**
 * Lectura semanal de descuento por planta: métricas ARR, proyección (venta-proyeccion-mes) y narrativa ejecutiva para WhatsApp.
 */

"use strict";

const ventaProyeccionMes = require("./venta-proyeccion-mes");
const ldConfig = require("./weekly-discount-ld-config");

const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

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

function formatMx(n, frac = 2) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("es-MX", { minimumFractionDigits: frac, maximumFractionDigits: frac });
}

/** Resuelve nombre de planta y código ARR (misma idea que getPlantCodeArrFromPlantaNombre en server). */
async function resolvePlantaForLectura(client, plantInput) {
  const raw = String(plantInput || "").trim();
  if (!raw) return null;
  const alias = ldConfig.LD_ALIAS_TO_CANONICAL[ldConfig.normalizePlantKey(raw)] || raw;
  const r = await client.query(
    `WITH prov_map AS (
       SELECT DISTINCT p.nombre AS prov_name, ap.plant_code AS arr_plant_code
         FROM public.plantas p
         JOIN arr.provincia_plants ap ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre)) OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
        WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO' AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
     )
     SELECT pm.prov_name, pm.arr_plant_code AS plant_code FROM prov_map pm
     WHERE pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1))
     LIMIT 1`,
    [alias]
  );
  if (r.rows && r.rows[0] && r.rows[0].prov_name && r.rows[0].plant_code) {
    return { plantDisplayName: r.rows[0].prov_name, plantCode: r.rows[0].plant_code };
  }
  const r2 = await client.query(
    `SELECT plant_code FROM arr.provincia_plants WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1)) LIMIT 1`,
    [raw]
  );
  if (r2.rows && r2.rows[0] && r2.rows[0].plant_code) {
    return { plantDisplayName: raw, plantCode: r2.rows[0].plant_code };
  }
  return null;
}

/**
 * Agregados por cliente en [startStr, endStr] inclusive.
 * @returns {Promise<Map<string, { kg: number, monto: number }>>}
 */
async function fetchAggByCliente(client, plantaNombre, startStr, endStr) {
  const r = await client.query(
    `WITH prov_map AS (${SQL_PROV_MAP}),
     desc_m AS (
       SELECT d.cliente_norm, SUM(d.monto) AS monto
         FROM arr.descuentos_diarios_cliente d
         JOIN prov_map pm
           ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
           OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
        WHERE pm.prov_name = $1
          AND d.fecha >= $2::date AND d.fecha <= $3::date
        GROUP BY d.cliente_norm
     ),
     vent_m AS (
       SELECT v.cliente_norm, SUM(v.kg) AS kg
         FROM arr.ventas_diarias_cliente v
         JOIN prov_map pm
           ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
           OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
        WHERE pm.prov_name = $1
          AND v.fecha >= $2::date AND v.fecha <= $3::date
        GROUP BY v.cliente_norm
     )
     SELECT COALESCE(d.cliente_norm, v.cliente_norm) AS cliente_norm,
            COALESCE(d.monto, 0)::numeric AS monto,
            COALESCE(v.kg, 0)::numeric AS kg
       FROM desc_m d
       FULL OUTER JOIN vent_m v ON d.cliente_norm = v.cliente_norm`,
    [plantaNombre, startStr, endStr]
  );
  const map = new Map();
  for (const row of r.rows || []) {
    const k = row.cliente_norm;
    if (!k) continue;
    map.set(k, { kg: Number(row.kg || 0), monto: Number(row.monto || 0) });
  }
  return map;
}

function sumMapValues(map) {
  let kg = 0;
  let monto = 0;
  for (const v of map.values()) {
    kg += v.kg;
    monto += v.monto;
  }
  return { kg, monto };
}

function descKg(kg, monto) {
  if (kg <= 0) return null;
  return monto / kg;
}

/**
 * Contribución del cliente al “peso” del descuento en la mezcla: monto_i / kg_total_planta.
 * (Equivale a participación × desc $/kg del cliente.)
 */
function contribPlanta(montoCliente, kgPlanta) {
  if (kgPlanta <= 0) return 0;
  return montoCliente / kgPlanta;
}

/**
 * Proyección por cliente: escala el acumulado del mes al cierre proyectado de planta (transparente y estable).
 */
function projectClientMontoKg(kgMtd, montoMtd, kgPlantaProj, kgPlantaMtd, montoPlantaProj, montoPlantaMtd) {
  const kgP =
    kgPlantaMtd > 1e-6
      ? kgMtd * (kgPlantaProj / kgPlantaMtd)
      : 0;
  const montoP =
    montoPlantaMtd > 1e-6
      ? montoMtd * (montoPlantaProj / montoPlantaMtd)
      : 0;
  return { kgProj: kgP, montoProj: montoP };
}

function classifyReason(row, plantDescMtd, role) {
  const { kgPrev, montoPrev, kgMtd, montoMtd, deltaContrib } = row;
  const rMtd = kgMtd > 0 ? montoMtd / kgMtd : null;
  if (role === "worst") {
    if (kgPrev > 10 && kgMtd < 1) return "dejó de comprar en el acumulado frente a un mes anterior con volumen (afecta la mezcla)";
    if (kgPrev < 1 && kgMtd > 10) return "entró con volumen y empujó la mezcla hacia un patrón nuevo";
    if (rMtd != null && plantDescMtd != null && rMtd > plantDescMtd * 1.05 && kgMtd > kgPrev * 1.1) {
      return "subió participación con descuento por encima del promedio de planta";
    }
    if (deltaContrib > 0) return "aumentó su aporte relativo al descuento en la mezcla vs el mes anterior";
    return "concentra parte del cambio en la mezcla frente al mes pasado";
  }
  /** role === "best" — deltaContrib negativo ayuda a bajar el descuento ponderado */
  if (kgPrev < 1 && kgMtd > 10) return "entró con volumen y un descuento por kg que ayuda a la mezcla";
  if (rMtd != null && plantDescMtd != null && rMtd < plantDescMtd * 0.95 && kgMtd > 1) {
    return "operaba con descuento por debajo del promedio de planta con volumen relevante";
  }
  if (deltaContrib < 0) return "bajó su aporte relativo al descuento en la mezcla vs el mes anterior";
  return "compensa parte de la presión en el descuento ponderado";
}

/**
 * @param {object} client - pg
 * @param {string} plantaInput - nombre o alias (LD)
 * @param {string} fechaCorte - YYYY-MM-DD (zona negocio; típicamente último día cerrado en México)
 * @returns {Promise<object>}
 */
async function buildWeeklyDiscountNarrative(client, plantaInput, fechaCorte) {
  const fc = String(fechaCorte || "").trim().slice(0, 10);
  const resolved = await resolvePlantaForLectura(client, plantaInput);
  if (!resolved) {
    return {
      planta: String(plantaInput || "").trim(),
      fecha_corte: fc,
      error: "planta_no_encontrada",
      narrativa_whatsapp:
        "No reconocí la planta. Usa por ejemplo: LD MORELOS, LD PUEBLA o LD GAS URIBE.",
      factores_principales: [],
      detalle_clientes_relevantes: [],
    };
  }

  const { plantDisplayName: planta, plantCode } = resolved;
  const [yStr, mStr, dStr] = fc.split("-");
  const yB = parseInt(yStr, 10);
  const mB = parseInt(mStr, 10);
  const dB = parseInt(dStr, 10);
  if (!Number.isFinite(yB) || !Number.isFinite(mB) || !Number.isFinite(dB)) {
    return {
      planta,
      fecha_corte: fc,
      error: "fecha_invalida",
      narrativa_whatsapp: "Fecha de corte inválida.",
      factores_principales: [],
      detalle_clientes_relevantes: [],
    };
  }

  let yA = yB;
  let mA = mB - 1;
  if (mA < 1) {
    mA = 12;
    yA -= 1;
  }
  const lastDayA = new Date(yA, mA, 0).getDate();
  const startPrev = `${yA}-${pad2(mA)}-01`;
  const endPrev = `${yA}-${pad2(mA)}-${pad2(lastDayA)}`;
  const startCur = `${yB}-${pad2(mB)}-01`;
  const endCur = fc;

  const mesAnteriorLabel = `${MESES_LARGO[mA - 1]} ${yA}`;
  const mesActualLabel = `${MESES_LARGO[mB - 1]} ${yB}`;

  const prevMap = await fetchAggByCliente(client, planta, startPrev, endPrev);
  const mtdMap = await fetchAggByCliente(client, planta, startCur, endCur);

  const totPrev = sumMapValues(prevMap);
  const totMtd = sumMapValues(mtdMap);

  const descKgPrev = descKg(totPrev.kg, totPrev.monto);
  const descKgMtd = descKg(totMtd.kg, totMtd.monto);

  let ventaProjRes;
  let montoPlantaProj = 0;
  let kgPlantaProj = 0;
  try {
    ventaProjRes = await ventaProyeccionMes.computeVentaProyectadaMes(client, plantCode, yB, mB, fc);
    kgPlantaProj = ventaProjRes.kg_proyectado || 0;
    const canalProj = await ventaProyeccionMes.computeProyeccionCanalSubMes(client, plantCode, yB, mB, fc);
    for (const row of canalProj.rows || []) {
      montoPlantaProj += Number(row.descuento_mxn_proyectado || 0);
    }
  } catch (e) {
    ventaProjRes = { error: e.message };
  }

  const descKgProj =
    kgPlantaProj > 1e-6 ? montoPlantaProj / kgPlantaProj : null;

  const minKg = Number(process.env.WEEKLY_LD_MIN_KG_MTD || "5000");
  if (
    (totMtd.kg < minKg && totPrev.kg < minKg) ||
    (descKgPrev == null && descKgMtd == null)
  ) {
    return {
      planta,
      fecha_corte: fc,
      mes_anterior: `${yA}-${pad2(mA)}`,
      mes_actual: `${yB}-${pad2(mB)}`,
      descuento_kg_mes_anterior: descKgPrev,
      descuento_kg_actual: descKgMtd,
      descuento_kg_proyectado: descKgProj,
      descuento_total_mes_anterior: totPrev.monto,
      descuento_total_actual: totMtd.monto,
      descuento_total_proyectado: montoPlantaProj,
      venta_kg_mes_anterior: totPrev.kg,
      venta_kg_actual: totMtd.kg,
      venta_kg_proyectada: kgPlantaProj,
      insuficiente_datos: true,
      narrativa_whatsapp:
        `Hola. Revisé ${planta} al ${fc} y aún no hay suficiente volumen o descuento registrado para armar una lectura confiable de la mezcla. Cuando haya más días cargados en ${mesActualLabel}, lo volvemos a intentar.`,
      cliente_mayor_impacto_negativo: { cliente: null, impacto_estimado: null, razon: null },
      cliente_mayor_impacto_positivo: { cliente: null, impacto_estimado: null, razon: null },
      factores_principales: [],
      detalle_clientes_relevantes: [],
    };
  }

  const allClientes = new Set([...prevMap.keys(), ...mtdMap.keys()]);
  const rows = [];
  for (const cliente of allClientes) {
    const p = prevMap.get(cliente) || { kg: 0, monto: 0 };
    const t = mtdMap.get(cliente) || { kg: 0, monto: 0 };
    const kgPrev = p.kg;
    const montoPrev = p.monto;
    const kgMtd = t.kg;
    const montoMtd = t.monto;

    const { kgProj, montoProj } = projectClientMontoKg(
      kgMtd,
      montoMtd,
      kgPlantaProj,
      totMtd.kg,
      montoPlantaProj,
      totMtd.monto
    );

    const cPrev = contribPlanta(montoPrev, totPrev.kg);
    const cProj = contribPlanta(montoProj, kgPlantaProj);
    const deltaContrib = cProj - cPrev;

    const rPrev = descKg(kgPrev, montoPrev);
    const rMtd = descKg(kgMtd, montoMtd);
    const rProj = descKg(kgProj, montoProj);

    rows.push({
      cliente,
      kgPrev,
      montoPrev,
      kgMtd,
      montoMtd,
      kgProj,
      montoProj,
      descKgPrev: rPrev,
      descKgMtd: rMtd,
      descKgProj: rProj,
      contribPrev: cPrev,
      contribProj: cProj,
      deltaContrib,
    });
  }

  rows.sort((a, b) => Math.abs(b.deltaContrib) - Math.abs(a.deltaContrib));

  const meaningful = rows.filter((r) => r.kgPrev > 1 || r.kgMtd > 1);
  let worst = null;
  let best = null;
  for (const r of meaningful) {
    if (worst == null || r.deltaContrib > worst.deltaContrib) worst = r;
    if (best == null || r.deltaContrib < best.deltaContrib) best = r;
  }
  if (worst && best && worst.cliente === best.cliente) {
    best = meaningful
      .filter((x) => x.cliente !== worst.cliente)
      .sort((a, b) => a.deltaContrib - b.deltaContrib)[0] || null;
  }

  const factores = [];
  const fuertes = rows.filter((x) => x.kgPrev > 50 && x.kgMtd < 5).slice(0, 2);
  for (const f of fuertes) {
    factores.push(`${f.cliente} prácticamente no compró en el acumulado vs un mes anterior con volumen.`);
  }
  const nuevos = rows.filter((x) => x.kgPrev < 5 && x.kgMtd > 100).slice(0, 2);
  for (const n of nuevos) {
    factores.push(`${n.cliente} entró con volumen relevante en ${mesActualLabel}.`);
  }

  const detalle_clientes_relevantes = rows.slice(0, 12).map((r) => ({
    cliente: r.cliente,
    delta_impacto_contrib: Math.round(r.deltaContrib * 1000000) / 1000000,
    desc_kg_prev: r.descKgPrev,
    desc_kg_proyectado_cliente: r.descKgProj,
    kg_prev: r.kgPrev,
    kg_mtd: r.kgMtd,
  }));

  const neg = worst
    ? {
        cliente: worst.cliente,
        impacto_estimado: Math.round(worst.deltaContrib * 1000000) / 1000000,
        razon: classifyReason(worst, descKgMtd, "worst"),
      }
    : { cliente: null, impacto_estimado: null, razon: null };

  const pos = best
    ? {
        cliente: best.cliente,
        impacto_estimado: Math.round(best.deltaContrib * 1000000) / 1000000,
        razon: classifyReason(best, descKgMtd, "best"),
      }
    : { cliente: null, impacto_estimado: null, razon: null };

  if (factores.length < 3 && worst) {
    factores.push(
      `El movimiento de ${worst.cliente} concentra buena parte del cambio de mezcla vs ${mesAnteriorLabel}.`
    );
  }

  const lineA =
    descKgPrev != null
      ? `${mesAnteriorLabel.charAt(0).toUpperCase() + mesAnteriorLabel.slice(1)} cerró alrededor de ${formatMx(descKgPrev, 2)} $/kg de descuento.`
      : `El mes anterior no tuvo base suficiente para comparar $/kg.`;

  const lineB =
    descKgMtd != null
      ? `Al corte del ${fc}, el acumulado de ${mesActualLabel} va en ${formatMx(descKgMtd, 2)} $/kg.`
      : `El acumulado del mes aún no permite calcular un $/kg estable.`;

  const lineC =
    descKgProj != null
      ? `Con la tendencia de venta/descuento que traemos (misma regla de forecast ARR que el tablero), el cierre podría quedar cerca de ${formatMx(descKgProj, 2)} $/kg si se mantiene el patrón reciente.`
      : `La proyección de cierre aún no es estable (revisa carga de datos o ventana de forecast).`;

  const lineD =
    neg.cliente && pos.cliente
      ? `La mayor presión al alza viene de ${neg.cliente} (${neg.razon}). Del lado que ayuda a compensar, ${pos.cliente} (${pos.razon}).`
      : `Los clientes con más peso en la mezcla están en transición; conviene revisar el detalle en tablero.`;

  const extra = factores.slice(0, 3).map((f) => `• ${f}`).join("\n");

  const cierre =
    "¿Te hace sentido esta lectura? ¿Hubo promoción, negociación o algo fuera de sistema que debamos anotar?";

  let narrativa_whatsapp = [
    `Hola, revisé ${planta} al corte del ${fc}.`,
    "",
    lineA,
    lineB,
    lineC,
    "",
    lineD,
    extra ? `\nOtros movimientos:\n${extra}` : "",
    "",
    cierre,
  ]
    .filter(Boolean)
    .join("\n");

  if (narrativa_whatsapp.length > 1500) {
    narrativa_whatsapp = narrativa_whatsapp.slice(0, 1480) + "\n…(recortado)";
  }

  return {
    planta,
    fecha_corte: fc,
    mes_anterior: `${yA}-${pad2(mA)}`,
    mes_actual: `${yB}-${pad2(mB)}`,
    descuento_kg_mes_anterior: descKgPrev,
    descuento_kg_actual: descKgMtd,
    descuento_kg_proyectado: descKgProj,
    descuento_total_mes_anterior: totPrev.monto,
    descuento_total_actual: totMtd.monto,
    descuento_total_proyectado: montoPlantaProj,
    venta_kg_mes_anterior: totPrev.kg,
    venta_kg_actual: totMtd.kg,
    venta_kg_proyectada: kgPlantaProj,
    cliente_mayor_impacto_negativo: neg,
    cliente_mayor_impacto_positivo: pos,
    factores_principales: factores.slice(0, 5),
    detalle_clientes_relevantes: detalle_clientes_relevantes,
    narrativa_whatsapp,
    _forecast_meta: ventaProjRes && !ventaProjRes.error
      ? { ventana: `${ventaProjRes.ventana_inicio}…${ventaProjRes.ventana_fin}`, regla: ventaProjRes.regla }
      : ventaProjRes,
  };
}

module.exports = {
  buildWeeklyDiscountNarrative,
  resolvePlantaForLectura,
};
