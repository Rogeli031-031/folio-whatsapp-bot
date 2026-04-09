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

/**
 * IGF tal como se guarda al subir la hoja "Compromiso" (modIgfUpload / BuildInsertCompromiso).
 * Mismo orden que INSERT en igf.compromiso_lines — sin forecast ARR, sin presupuesto/folios ni recálculo de utilidad/resultado.
 */
const IGF_COMPROMISO_RAW_COLS = [
  "empresa", "venta_ton", "margen_kg", "com_desc_kg", "gasto_kg", "impuesto_kg", "hg_pct", "hg_kg",
  "bancos_planta_kg", "provision_planta_kg", "util_oper_kg", "util_oper_importe",
  "gtos_apoyos_corp_kg", "bancos_corp_kg", "otros_programas_kg", "inversiones_kg",
  "resultado_final_kg", "resultado_final_importe",
];
/** Subtítulos fila 7 — alineados a plantilla tipo “ABRIL, 2026” (datos desde fila 9). */
const IGF_COMPROMISO_HEADER_ROW7 = [
  "Empresa",
  "Venta",
  "Margen",
  "Com. y Desc.",
  "Gasto",
  "Impuestos",
  "HG - %",
  "HG - $/Kg",
  "Bancos Planta",
  "Provisión Planta",
  "Util. Operación - $/Kg",
  "Util. Operación - Importe",
  "Gtos, Apoyos y Prov",
  "Bancos Corp.",
  "Otros Programas",
  "Inversiones",
  "Resultado Final - $/Kg",
  "Resultado Final - Importe",
];
/** Fila 6 (encabezado superior) — una etiqueta por columna para parsers VBA de dos filas. */
const IGF_COMPROMISO_HEADER_ROW6 = [
  "Empresa",
  "Venta y margen",
  "Venta y margen",
  "Venta y margen",
  "Gasto operativo",
  "Gasto operativo",
  "HG",
  "HG",
  "Planta",
  "Planta",
  "Utilidad operación",
  "Utilidad operación",
  "Corporativo",
  "Corporativo",
  "Corporativo",
  "Corporativo",
  "Resultado",
  "Resultado",
];

/** Alineado a VBA: título fila 1, encabezados 6–7, fila 8 vacía, datos fila 9. */
const MESES_NOMBRE_ES = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function padRowToCols(row, colCount) {
  const out = row.slice(0, colCount);
  while (out.length < colCount) out.push("");
  return out;
}

/**
 * Hoja estilo plantilla Compromiso: título mes (fila 1), filas 2–5 vacías, encabezados 6–7, fila 8 vacía, datos desde fila 9.
 * Misma cantidad de columnas que IGF_COMPROMISO_RAW_COLS (18).
 */
function buildIgfCompromisoTemplateAoa(year, month, dataRows) {
  const n = IGF_COMPROMISO_HEADER_ROW7.length;
  const title = `${String(MESES_NOMBRE_ES[month] || "").toUpperCase()}, ${year}`;
  const rows = [];
  rows.push(padRowToCols([title], n));
  for (let i = 0; i < 4; i++) rows.push(padRowToCols([], n));
  rows.push(padRowToCols(IGF_COMPROMISO_HEADER_ROW6, n));
  rows.push(padRowToCols(IGF_COMPROMISO_HEADER_ROW7, n));
  rows.push(padRowToCols([], n));
  for (const line of dataRows) rows.push(padRowToCols(line, n));
  return rows;
}

/** Fila 6 para hoja IGF Forecast (20 columnas): presupuesto y folios ARR. */
const IGF_FORECAST_HEADER_ROW6 = [
  "Empresa",
  "Venta y margen",
  "Venta y margen",
  "Venta y margen",
  "Forecast ARR",
  "Forecast ARR",
  "Forecast ARR",
  "Impuestos",
  "HG",
  "HG",
  "Planta",
  "Planta",
  "Utilidad operación",
  "Utilidad operación",
  "Corporativo",
  "Corporativo",
  "Corporativo",
  "Corporativo",
  "Resultado",
  "Resultado",
];

async function fetchIgfCompromisoRawRows(client, year, month) {
  const ver = await client.query(
    `SELECT id FROM igf.versions
     WHERE plant_code = 'GLOBAL' AND year = $1::int AND month = $2::int
     ORDER BY version_number DESC LIMIT 1`,
    [year, month]
  );
  const versionId = ver.rows && ver.rows[0] && ver.rows[0].id != null ? Number(ver.rows[0].id) : null;
  if (versionId == null) return [];
  const r = await client.query(
    `SELECT empresa, venta_ton, margen_kg, com_desc_kg, gasto_kg, impuesto_kg, hg_pct, hg_kg,
            bancos_planta_kg, provision_planta_kg, util_oper_kg, util_oper_importe,
            gtos_apoyos_corp_kg, bancos_corp_kg, otros_programas_kg, inversiones_kg,
            resultado_final_kg, resultado_final_importe
       FROM igf.compromiso_lines
      WHERE version_id = $1::int
      ORDER BY id`,
    [versionId]
  );
  return r.rows || [];
}

/** Solo filas de datos (sin encabezados ni filas de título). Orden = IGF_COMPROMISO_RAW_COLS. */
function buildIgfCompromisoRawDataRows(dbRows) {
  const toNum = (v) => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const out = [];
  for (const row of dbRows) {
    const line = [];
    for (const key of IGF_COMPROMISO_RAW_COLS) {
      if (key === "empresa") {
        line.push(row.empresa != null ? String(row.empresa).trim() : "");
        continue;
      }
      const n = toNum(row[key]);
      if (n == null) {
        line.push("");
        continue;
      }
      // En BD hg_pct es decimal (ej. 0.0816); en Excel Compromiso suele verse como 8.16
      if (key === "hg_pct") {
        line.push(Math.round(n * 100 * 1e6) / 1e6);
      } else {
        line.push(n);
      }
    }
    out.push(line);
  }
  return out;
}

/**
 * Hoja completa lista para VBA modIgfUpload: filas 6–7 encabezados, datos fila 9+.
 * @param {string} sheetTitleRow1 - ej. "ABRIL, 2026"
 */
function buildIgfForecastStyleSheetAoa(sheetTitleRow1, headerRow6, headerRow7, dataRows) {
  const n = headerRow7.length;
  if (headerRow6.length !== n) throw new Error("buildIgfForecastStyleSheetAoa: headerRow6/7 distinto ancho");
  const rows = [];
  rows.push(padRowToCols([sheetTitleRow1], n));
  for (let i = 0; i < 4; i++) rows.push(padRowToCols([], n));
  rows.push(padRowToCols(headerRow6, n));
  rows.push(padRowToCols(headerRow7, n));
  rows.push(padRowToCols([], n));
  for (const line of dataRows) rows.push(padRowToCols(line, n));
  return rows;
}

/**
 * Map Provincia plant_code (canónico) ↔ public.plantas (nombre/clave) ↔ ARR (plant_code puede ser clave o nombre).
 * Igual que en lib/venta-proyeccion-mes.js
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

function parseYmdToDate(s) {
  const [y, m, d] = String(s || "").slice(0, 10).split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Acumulado real del mes hasta fechaHasta por canal/subcanal (kg y descuento $).
 * Se usa para "Forecast" del mismo mes: regla de tres contra el total objetivo.
 */
async function fetchMtdKgMontoByCatSub(client, plantCode, year, month, fechaHasta) {
  const hasta = String(fechaHasta || "").slice(0, 10);
  const hastaDt = parseYmdToDate(hasta);
  if (!hastaDt) return [];
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const startDt = parseYmdToDate(start);
  if (!startDt || hastaDt < startDt) return [];
  const catYear = hastaDt.getFullYear();
  const catMonth = hastaDt.getMonth() + 1;

  const ventasR = await client.query(
    `WITH pm AS (${SQL_PM_ONE})
     SELECT v.canal AS categoria,
            COALESCE(v.subcanal, '') AS subcategoria,
            SUM(v.kg) AS kg
       FROM arr.ventas_diarias_cliente v
       JOIN pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
              OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
      WHERE v.fecha >= $2::date AND v.fecha <= $3::date
      GROUP BY v.canal, COALESCE(v.subcanal, '')`,
    [plantCode, start, hasta]
  );
  const kgByKey = new Map();
  for (const row of ventasR.rows || []) {
    const k = `${String(row.categoria || "").trim()}|${String(row.subcategoria || "").trim()}`;
    kgByKey.set(k, Number(row.kg || 0));
  }

  const descR = await client.query(
    `WITH pm AS (${SQL_PM_ONE})
     SELECT COALESCE(c.canal, 'Casa') AS categoria,
            COALESCE(c.subcanal, '') AS subcategoria,
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
      GROUP BY COALESCE(c.canal, 'Casa'), COALESCE(c.subcanal, '')`,
    [plantCode, start, hasta, catYear, catMonth]
  );
  const montoByKey = new Map();
  for (const row of descR.rows || []) {
    const k = `${String(row.categoria || "").trim()}|${String(row.subcategoria || "").trim()}`;
    montoByKey.set(k, Number(row.monto || 0));
  }

  const allKeys = new Set([...kgByKey.keys(), ...montoByKey.keys()]);
  const out = [];
  for (const key of allKeys) {
    const sep = key.indexOf("|");
    const categoria = sep >= 0 ? key.slice(0, sep) : key;
    const subcategoria = sep >= 0 ? key.slice(sep + 1) : "";
    const kg = kgByKey.get(key) || 0;
    const monto = montoByKey.get(key) || 0;
    out.push({ plant_code: plantCode, categoria, subcategoria, kg, monto });
  }
  out.sort((a, b) => {
    const p = String(a.categoria).localeCompare(String(b.categoria), "es");
    if (p !== 0) return p;
    return String(a.subcategoria).localeCompare(String(b.subcategoria), "es");
  });
  return out;
}

async function generarDashboardArrForecast(client, year, month, plantCode = null, options = {}) {
  const wb = XLSX.utils.book_new();
  const lastDay = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const fechaCorte = (options && options.fechaCorte ? String(options.fechaCorte).trim().slice(0, 10) : "") || "";

  const { provincia: provinciaPlantas, centro } = await getPlantasZona(client, year, month);

  const plantsForArr = plantCode ? [plantCode] : await getPlantCodesFromArr(client, year, month);
  const plantsForProvinciaSheets = provinciaPlantas.length
    ? plantsForArr.filter((p) => provinciaPlantas.some((emp) => (emp || "").toUpperCase().includes((p || "").toUpperCase()) || (p || "").toUpperCase().includes((emp || "").toUpperCase())))
    : plantsForArr;

  const compTotalKg = await getCompromisoTotalProvincia(client, year, month, provinciaPlantas);
  const ventaTonGrid = await getVentaToneladasGrid(client, year, month, fechaCorte);
  const descuentoGrid = await getDescuentoPorKiloGrid(client, year, month, fechaCorte);

  // Para que PROY coincida con IGF Forecast del dashboard (si viene en options).
  let proyTonByPlantFromIgf = null;
  if (options && options.igfForecast && Array.isArray(options.igfForecast.rows)) {
    try {
      const norm = (s) =>
        String(s || "")
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[-–—]/g, " ")
          .replace(/\s+/g, " ");
      const igfRows = options.igfForecast.rows
        .map((r) => {
          const emp = (r && r.empresa != null ? String(r.empresa) : "").trim();
          const ton = r && r.venta_ton != null && Number.isFinite(Number(r.venta_ton)) ? Number(r.venta_ton) : null;
          return emp && ton != null ? { emp, empNorm: norm(emp), ton } : null;
        })
        .filter(Boolean);
      const m = new Map();
      for (const p of (ventaTonGrid.plants || [])) {
        const pNorm = norm(p);
        let best = null;
        for (const row of igfRows) {
          if (!row.empNorm) continue;
          if (row.empNorm === pNorm || row.empNorm.includes(pNorm) || pNorm.includes(row.empNorm)) {
            if (!best || row.empNorm.length < best.empNorm.length) best = row;
          }
        }
        if (best) m.set(p, best.ton);
      }
      proyTonByPlantFromIgf = m;
    } catch {
      proyTonByPlantFromIgf = null;
    }
  }

  hojaA(wb, ventaTonGrid, year, month, compTotalKg, lastDayStr, todayStr, { proyTonByPlant: proyTonByPlantFromIgf });
  hojaB(wb, descuentoGrid, ventaTonGrid, year, month, lastDayStr, todayStr);
  await appendHojaAcapulcoSemanaDow(client, wb, year, month, { fechaCorte });

  const rawIgfRows = await fetchIgfCompromisoRawRows(client, year, month);
  if (rawIgfRows.length > 0) {
    const dataRows = buildIgfCompromisoRawDataRows(rawIgfRows);
    const data = buildIgfCompromisoTemplateAoa(year, month, dataRows);
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "IGF Forecast");
  } else if (options.igfForecast && options.igfForecast.rows && options.igfForecast.rows.length > 0) {
    const buildIgfForecastDataRows = () => {
      const out = [];
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
        out.push(r);
      }
      return out;
    };
    const title = `${String(MESES_NOMBRE_ES[month] || "").toUpperCase()}, ${year}`;
    const data = buildIgfForecastStyleSheetAoa(title, IGF_FORECAST_HEADER_ROW6, IGF_FORECAST_HEADERS, buildIgfForecastDataRows());
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "IGF Forecast");
  } else {
    await hojaC(client, wb, year, month, provinciaPlantas, centro, plantsForProvinciaSheets);
  }

  if (options.proyeccionCatSub && options.proyeccionCatSub.targetYear && options.proyeccionCatSub.targetMonth) {
    await appendHojaProyeccionCatSub(client, wb, options.proyeccionCatSub);
  }

  if (options.proyeccionCatSubForecast && options.proyeccionCatSubForecast.targetYear && options.proyeccionCatSubForecast.targetMonth) {
    await appendHojaProyeccionCatSub(client, wb, {
      ...options.proyeccionCatSubForecast,
      sheetName: options.proyeccionCatSubForecast.sheetName || "Proy cat-sub Forecast",
    });
  }

  // Enero y Febrero del mismo año del libro: solo BD, mes calendario completo (sin proyección).
  {
    const finMes = (yy, mm) => {
      const ld = new Date(yy, mm, 0).getDate();
      return `${yy}-${String(mm).padStart(2, "0")}-${String(ld).padStart(2, "0")}`;
    };
    const baseHist = {
      plantCodeFilter: plantCode || "",
      useMtdAcumulado: true,
      scaleToForecastTotal: false,
      useMtdRuleOfThree: false,
      historicoMesCompleto: true,
    };
    await appendHojaProyeccionCatSub(client, wb, {
      ...baseHist,
      targetYear: year,
      targetMonth: 1,
      fechaHasta: finMes(year, 1),
      sheetName: "Enero",
    });
    await appendHojaProyeccionCatSub(client, wb, {
      ...baseHist,
      targetYear: year,
      targetMonth: 2,
      fechaHasta: finMes(year, 2),
      sheetName: "Febrero",
    });
  }

  // Hoja adicional: lista de clientes por planta y su descuento del mes ($/kg).
  // El descuento $/kg se calcula como |SUM(monto)| / SUM(kg) en el mes calendario (ej. marzo).
  await appendHojaClientesDescuentoMes(client, wb, year, month, plantCode);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf;
}

/**
 * Hoja: clientes por planta con descuento del mes en $/kg.
 * Fuente: arr.ventas_diarias_cliente + arr.descuentos_diarios_cliente.
 * Planta se normaliza a provincia_plants (prov_name) cuando hay mapeo; si no, usa el plant_code bruto.
 */
async function appendHojaClientesDescuentoMes(client, wb, year, month, plantCode = null) {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const plantFilter = (plantCode || "").toString().trim();

  // Reutiliza el mapeo provincia (nombre/clave) para que "Planta" sea consistente.
  const SQL_PROV_MAP = `
    SELECT DISTINCT p.nombre AS prov_name,
           UPPER(TRIM(p.nombre)) AS key_nombre,
           UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
      FROM public.plantas p
      JOIN arr.provincia_plants ap
        ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
        OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
     WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
       AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
  `;

  const params = [firstDay, lastDayStr];
  let filterSql = "";
  if (plantFilter) {
    params.push(plantFilter);
    filterSql = `
      AND (
           UPPER(TRIM(v.plant_code)) = UPPER(TRIM($3::text))
        OR UPPER(TRIM(d.plant_code)) = UPPER(TRIM($3::text))
      )
    `;
  }

  const q = await client.query(
    `
    WITH prov_map AS (${SQL_PROV_MAP}),
    ventas AS (
      SELECT
        COALESCE(pm.prov_name, TRIM(v.plant_code)) AS planta,
        v.cliente_norm AS cliente,
        SUM(v.kg) AS kg
      FROM arr.ventas_diarias_cliente v
      LEFT JOIN prov_map pm
        ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
        OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
      WHERE v.fecha >= $1::date AND v.fecha <= $2::date
      ${plantFilter ? "AND (UPPER(TRIM(v.plant_code)) = UPPER(TRIM($3::text)))" : ""}
      GROUP BY COALESCE(pm.prov_name, TRIM(v.plant_code)), v.cliente_norm
    ),
    descs AS (
      SELECT
        COALESCE(pm.prov_name, TRIM(d.plant_code)) AS planta,
        d.cliente_norm AS cliente,
        SUM(d.monto) AS monto
      FROM arr.descuentos_diarios_cliente d
      LEFT JOIN prov_map pm
        ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
        OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
      WHERE d.fecha >= $1::date AND d.fecha <= $2::date
      ${plantFilter ? "AND (UPPER(TRIM(d.plant_code)) = UPPER(TRIM($3::text)))" : ""}
      GROUP BY COALESCE(pm.prov_name, TRIM(d.plant_code)), d.cliente_norm
    )
    SELECT
      COALESCE(v.planta, d.planta) AS planta,
      COALESCE(v.cliente, d.cliente) AS cliente,
      COALESCE(v.kg, 0) AS kg,
      COALESCE(d.monto, 0) AS monto
    FROM ventas v
    FULL OUTER JOIN descs d
      ON v.planta = d.planta AND v.cliente = d.cliente
    ORDER BY COALESCE(v.planta, d.planta), COALESCE(v.cliente, d.cliente)
    `,
    params
  );

  const rows = (q.rows || []).map((r) => {
    const kg = Number(r.kg || 0);
    const monto = Number(r.monto || 0);
    const descKg = kg > 0 ? Math.abs(monto) / kg : null;
    return {
      planta: (r.planta || "").toString().trim(),
      cliente: (r.cliente || "").toString().trim(),
      kg,
      monto,
      descKg,
    };
  }).filter((r) => r.planta && r.cliente);

  // Orden: planta, luego descuento $/kg (desc) y luego kg (desc) para ver primero "más caros".
  rows.sort((a, b) => {
    const p = String(a.planta).localeCompare(String(b.planta), "es");
    if (p !== 0) return p;
    const da = a.descKg == null ? -1 : a.descKg;
    const db = b.descKg == null ? -1 : b.descKg;
    if (db !== da) return db - da;
    return (b.kg || 0) - (a.kg || 0);
  });

  const aoa = [];
  aoa.push([
    "Clientes por planta — descuento del mes ($/kg)",
    `${year}-${String(month).padStart(2, "0")}`,
    plantFilter ? `Filtro planta: ${plantFilter}` : "Todas las plantas",
  ]);
  aoa.push(["Descuento $/kg = |SUM(descuento MXN)| / SUM(kg) del mes (calendario)."]);
  aoa.push([]);
  aoa.push(["Planta", "Cliente", "Kg mes", "Descuento MXN mes", "Descuento $/kg mes"]);

  for (const r of rows) {
    aoa.push([
      r.planta,
      r.cliente,
      Math.round(r.kg * 100) / 100,
      Math.round(r.monto * 100) / 100,
      r.descKg != null ? Math.round(r.descKg * 1e6) / 1e6 : "",
    ]);
  }

  if (rows.length === 0) {
    aoa.push(["(sin datos)", "", 0, 0, ""]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, "Clientes desc mes");
}

/**
 * Hoja: venta kg y descuento $ proyectados por planta, categoría (canal) y subcategoría (subcanal).
 * Misma regla que /api/dashboard/venta-proyeccion-mes (14 días × DOW → mes objetivo).
 */
async function appendHojaProyeccionCatSub(client, wb, opts) {
  const targetYear = opts.targetYear;
  const targetMonth = opts.targetMonth;
  const sheetName = (opts.sheetName || "Proy cat-sub mes").toString().trim().slice(0, 31) || "Proy cat-sub mes";
  const scaleToForecastTotal = Boolean(opts.scaleToForecastTotal);
  const useMtdRuleOfThree = Boolean(opts.useMtdRuleOfThree);
  const useMtdAcumulado = Boolean(opts.useMtdAcumulado);
  const historicoMesCompleto = Boolean(opts.historicoMesCompleto);
  const forecastKgByPlantOpt = opts && opts.forecastKgByPlant && typeof opts.forecastKgByPlant === "object" ? opts.forecastKgByPlant : null;
  let fechaHasta = (opts.fechaHasta || "").toString().trim().slice(0, 10);
  if (!fechaHasta) {
    const t = new Date();
    t.setDate(t.getDate() - 1);
    fechaHasta = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
  const firstDayStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
  const plantFilter = (opts.plantCodeFilter || "").toString().trim();
  let plants;
  if (plantFilter) {
    plants = [plantFilter];
  } else {
    const r = await client.query(`SELECT plant_code FROM arr.provincia_plants ORDER BY plant_code`);
    plants = (r.rows || []).map((row) => row.plant_code).filter(Boolean);
  }

  const data = [];
  if (historicoMesCompleto) {
    data.push([
      "Real por categoría y subcategoría (venta kg y descuento $, sin proyección)",
      `Mes: ${targetYear}-${String(targetMonth).padStart(2, "0")} (mes completo)`,
      `Periodo: ${firstDayStr} a ${fechaHasta} · Fuente: BD (arr)`,
    ]);
    data.push([
      "Regla: SUM(kg) y SUM(monto descuento) por planta/categoría/subcategoría en el rango; descuentos asignados con arr.cliente_categoria_mes del mes correspondiente.",
    ]);
  } else {
    data.push([
      "Proyección por categoría y subcategoría (venta kg y descuento $)",
      `Mes objetivo: ${targetYear}-${String(targetMonth).padStart(2, "0")}`,
      `Ventana 14 días hasta: ${fechaHasta}`,
    ]);
    data.push([
      "Regla: promedio de los últimos 14 días por día de la semana (cada DOW aparece 2 veces → suma÷2) × cantidad de ese DOW en el mes objetivo. Descuento: misma lógica sobre montos diarios (join cliente_categoria_mes del mes de la ventana).",
    ]);
    if (useMtdAcumulado) {
      data.push([
        "Modo: acumulado real del mes hasta la fecha de corte (sin proyección).",
      ]);
    }
  }
  if (scaleToForecastTotal) {
    data.push([
      "Ajuste: regla de tres por cat/sub para que ΣKg coincida con el total objetivo del mes (por planta).",
    ]);
  }
  data.push([]);
  if (useMtdAcumulado && scaleToForecastTotal) {
    data.push([
      "Planta",
      "Categoría",
      "Subcategoría",
      "Kg Acumulado",
      "Descuento $ Acumulado",
      "Desc $/kg Acumulado",
      "Factor",
      "Kg proyectado",
      "Descuento $ proyectado",
      "Desc $/kg proyectado",
    ]);
  } else {
    data.push([
      "Planta",
      "Categoría",
      "Subcategoría",
      useMtdAcumulado ? "Kg Acumulado" : "Kg proyectados",
      useMtdAcumulado ? "Descuento $ Acumulado" : "Descuento $ proyectado",
      useMtdAcumulado ? "Desc $/kg Acumulado" : "Desc $/kg proyectado",
    ]);
  }

  let forecastKgByPlant = null;
  if (scaleToForecastTotal) {
    if (forecastKgByPlantOpt) {
      try {
        const m = new Map();
        for (const [k, v] of Object.entries(forecastKgByPlantOpt)) {
          const kk = String(k || "").trim();
          const vv = Number(v);
          if (kk && Number.isFinite(vv) && vv >= 0) m.set(kk, vv);
        }
        forecastKgByPlant = m;
      } catch {
        forecastKgByPlant = null;
      }
    } else {
      // Fallback: usar total oficial arr.forecast_mensual del mes objetivo.
      const r = await client.query(
        `SELECT ap.plant_code, COALESCE(SUM(fm.kg_forecast), 0) AS kg_forecast
           FROM arr.forecast_mensual fm
           JOIN public.plantas p
             ON UPPER(TRIM(fm.plant_code)) = UPPER(TRIM(p.nombre))
             OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(fm.plant_code)) = UPPER(TRIM(p.clave)))
           JOIN arr.provincia_plants ap
             ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
             OR (ap.plant_code = p.clave AND TRIM(COALESCE(p.clave,'')) <> '')
          WHERE fm.year = $1 AND fm.month = $2
          GROUP BY ap.plant_code`,
        [targetYear, targetMonth]
      );
      forecastKgByPlant = new Map((r.rows || []).map((row) => [String(row.plant_code || "").trim(), Number(row.kg_forecast || 0)]));
    }
  }

  for (const p of plants) {
    let rows = [];
    if (useMtdAcumulado) {
      const mtd = await fetchMtdKgMontoByCatSub(client, p, targetYear, targetMonth, fechaHasta);
      rows = mtd.map((r) => ({
        plant_code: r.plant_code,
        categoria: r.categoria,
        subcategoria: r.subcategoria,
        kg_acum: Math.round(Number(r.kg || 0) * 100) / 100,
        desc_mxn_acum: Math.round(Number(r.monto || 0) * 100) / 100,
      }));
    } else if (useMtdRuleOfThree) {
      const mtd = await fetchMtdKgMontoByCatSub(client, p, targetYear, targetMonth, fechaHasta);
      rows = mtd.map((r) => ({
        plant_code: r.plant_code,
        categoria: r.categoria,
        subcategoria: r.subcategoria,
        kg_proyectado: Math.round(Number(r.kg || 0) * 100) / 100,
        descuento_mxn_proyectado: Math.round(Number(r.monto || 0) * 100) / 100,
        descuento_por_kg_proyectado: Number(r.kg || 0) > 0 ? Math.round((Number(r.monto || 0) / Number(r.kg || 0)) * 1000000) / 1000000 : null,
      }));
      const sumKg = rows.reduce((s, r) => s + (Number(r.kg_proyectado) || 0), 0);
      if (sumKg <= 0) {
        const block = await ventaProyeccionMes.computeProyeccionCanalSubMes(client, p, targetYear, targetMonth, fechaHasta);
        rows = Array.isArray(block.rows) ? block.rows : [];
      }
    } else {
      const block = await ventaProyeccionMes.computeProyeccionCanalSubMes(client, p, targetYear, targetMonth, fechaHasta);
      rows = Array.isArray(block.rows) ? block.rows : [];
    }

    // Caso pedido: acumulado + factor + proyección por regla de tres para cerrar con IGF.
    if (useMtdAcumulado && scaleToForecastTotal && forecastKgByPlant) {
      const targetKg = forecastKgByPlant.get(String(p || "").trim()) || 0;
      const totalAcumKg = rows.reduce((s, r) => s + (Number(r.kg_acum) || 0), 0);
      const factor = totalAcumKg > 0 && targetKg > 0 ? targetKg / totalAcumKg : 0;

      // Si no hubo datos MTD para la planta, deja un renglón en cero (para que "aparezca" en la hoja).
      if (!rows.length) {
        rows = [{
          plant_code: p,
          categoria: "(sin datos)",
          subcategoria: "",
          kg_acum: 0,
          desc_mxn_acum: 0,
        }];
      }

      // Proyecta por cat/sub = acumulado * factor
      for (const r of rows) {
        const kgA = Number(r.kg_acum) || 0;
        const mxnA = Number(r.desc_mxn_acum) || 0;
        const kgP = Math.round((kgA * factor) * 100) / 100;
        const mxnP = Math.round((mxnA * factor) * 100) / 100;
        r.factor = factor;
        r.kg_proj = kgP;
        r.desc_mxn_proj = mxnP;
        r.descKg_acum = kgA > 0 ? Math.round((mxnA / kgA) * 1000000) / 1000000 : null;
        r.descKg_proj = kgP > 0 ? Math.round((mxnP / kgP) * 1000000) / 1000000 : null;
      }

      // Ajuste final por redondeo para que ΣKg proyectado = targetKg
      const sumKgP = rows.reduce((s, r) => s + (Number(r.kg_proj) || 0), 0);
      const diff = Math.round((targetKg - sumKgP) * 100) / 100;
      if (Math.abs(diff) >= 0.01 && rows.length) {
        let idx = 0;
        let maxKg = -1;
        for (let i = 0; i < rows.length; i++) {
          const kg = Number(rows[i].kg_proj) || 0;
          if (kg > maxKg) {
            maxKg = kg;
            idx = i;
          }
        }
        const r = rows[idx];
        const kgOld = Number(r.kg_proj) || 0;
        const kgNew = Math.max(0, Math.round((kgOld + diff) * 100) / 100);
        const descKg = kgOld > 0 ? (Number(r.desc_mxn_proj) || 0) / kgOld : 0;
        r.kg_proj = kgNew;
        r.desc_mxn_proj = Math.round((kgNew * descKg) * 100) / 100;
        r.descKg_proj = kgNew > 0 ? Math.round((Number(r.desc_mxn_proj) / kgNew) * 1000000) / 1000000 : null;
      }

      for (const row of rows) {
        data.push([
          row.plant_code,
          row.categoria,
          row.subcategoria,
          row.kg_acum,
          row.desc_mxn_acum,
          row.descKg_acum != null ? row.descKg_acum : "",
          row.factor,
          row.kg_proj,
          row.desc_mxn_proj,
          row.descKg_proj != null ? row.descKg_proj : "",
        ]);
      }
      continue;
    }

    if (useMtdAcumulado && !scaleToForecastTotal) {
      for (const row of rows) {
        const kgA = Number(row.kg_acum) || 0;
        const mxnA = Number(row.desc_mxn_acum) || 0;
        const descKg = kgA > 0 ? Math.round((mxnA / kgA) * 1000000) / 1000000 : "";
        data.push([row.plant_code, row.categoria, row.subcategoria, kgA, mxnA, descKg !== "" ? descKg : ""]);
      }
      continue;
    }

    // Default: comportamiento previo (solo 3 columnas numéricas).
    for (const row of rows) {
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
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

const DOW_HEADERS_EXCEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function meanNonEmpty(values) {
  let s = 0;
  let c = 0;
  for (const v of values) {
    if (v == null || v === "" || !Number.isFinite(Number(v))) continue;
    s += Number(v);
    c += 1;
  }
  return c ? s / c : null;
}

/**
 * Construye filas de la tabla semana×DOW para un Map(fecha->valor).
 * - isSum=true: total semana/mes = suma.
 * - isSum=false: total semana/mes = promedio (no suma).
 */
function buildSemanaDowTableRows(year, month, byDateValue, isSum) {
  const pad2 = (n) => String(n).padStart(2, "0");
  const fmtYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fmtDmy = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  const isoDow = (d) => (d.getDay() === 0 ? 7 : d.getDay()); // 1..7 (L..D)
  const startOfIsoWeekMon = (d) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - (isoDow(x) - 1));
    return x;
  };
  const addDays = (d, n) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  };
  const isoWeekNumber = (d) => {
    // ISO week algorithm: week starts Monday; week 1 has Jan 4th.
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = isoDow(date);
    // shift to Thursday
    date.setDate(date.getDate() + (4 - day));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const diffDays = Math.floor((date - yearStart) / 86400000);
    return Math.floor(diffDays / 7) + 1;
  };

  const lastDay = new Date(year, month, 0).getDate();
  const firstDt = new Date(year, month - 1, 1);
  const lastDt = new Date(year, month - 1, lastDay);

  // "Lookback" visual: permite mostrar días previos (mes anterior) sin afectar totales del mes.
  // Se activa solo si byDateValue trae el contexto (opcional).
  const meta = byDateValue && typeof byDateValue === "object" ? byDateValue.__meta : null;
  const lookbackStart = meta && meta.lookbackStart ? parseYmdToDate(meta.lookbackStart) : null;
  const lookbackEnd = meta && meta.lookbackEnd ? parseYmdToDate(meta.lookbackEnd) : null;

  const startWeekMon = startOfIsoWeekMon(lookbackStart && lookbackEnd ? lookbackStart : firstDt);
  const endWeekSun = addDays(startOfIsoWeekMon(lastDt), 6);

  const rows = [];
  const lookbackMaskRows = []; // null o bool[7] por renglón (true = celda fuera del mes, solo referencia visual)
  rows.push(["Semana (año)", ...DOW_HEADERS_EXCEL, "Total semana"]);
  lookbackMaskRows.push(null);

  for (let wkMon = startWeekMon, guard = 0; guard < 80 && wkMon <= endWeekSun; guard++, wkMon = addDays(wkMon, 7)) {
    const wkSun = addDays(wkMon, 6);
    const weekNo = isoWeekNumber(wkMon);
    const cells = ["", "", "", "", "", "", ""];
    const lbMask = [false, false, false, false, false, false, false];
    let rowSum = 0;
    const weekVals = [];

    for (let i = 0; i < 7; i++) {
      const d = addDays(wkMon, i);
      const inMonth = d.getFullYear() === year && (d.getMonth() + 1) === month;
      const inLookback = lookbackStart && lookbackEnd ? (d >= lookbackStart && d <= lookbackEnd) : false;
      if (!inMonth && !inLookback) continue;
      const col = isoDow(d) - 1; // 0..6 (L..D)
      if (!inMonth && inLookback) lbMask[col] = true;
      const fecha = fmtYmd(d);
      const raw = byDateValue.get(fecha);
      const t = raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null;
      if (t != null) {
        const v = Math.round(t * 100) / 100;
        cells[col] = v;
        weekVals.push(v);
        // Total semana: SOLO cuenta días del mes objetivo (los lookback son referencia visual).
        if (inMonth) rowSum += (isSum ? v : 0);
      }
    }

    const totalSemana = isSum
      ? Math.round(rowSum * 100) / 100
      : (() => {
          const m = meanNonEmpty(weekVals);
          return m != null ? Math.round(m * 100) / 100 : "";
        })();
    rows.push([`Semana ${weekNo} (${fmtDmy(wkMon)}–${fmtDmy(wkSun)})`, ...cells, totalSemana]);
    lookbackMaskRows.push(lbMask);
  }

  return { rows, height: rows.length, lookbackMaskRows };
}

/**
 * Hoja: por cada planta (provincia), tabla semana×DOW de venta (ton) y,
 * desde columna K, la misma tabla pero de descuento ($/kg) diario.
 */
async function appendHojaAcapulcoSemanaDow(client, wb, year, month, opts = {}) {
  const fechaCorte = (opts && opts.fechaCorte ? String(opts.fechaCorte).trim().slice(0, 10) : "") || "";
  const ventaTonGrid = await getVentaToneladasGrid(client, year, month);
  const descuentoGrid = await getDescuentoPorKiloGrid(client, year, month);
  const plants = ventaTonGrid.plants || [];
  const byDateVenta = ventaTonGrid.byDate || [];
  const byDateDesc = descuentoGrid.byDate || [];

  const ventaMapByPlant = new Map();
  for (const p of plants) ventaMapByPlant.set(p, new Map());
  for (const d of byDateVenta) {
    const fecha = d.fecha;
    for (const p of plants) {
      const v = d.byPlant && d.byPlant[p] != null ? Number(d.byPlant[p]) : null;
      if (v != null && Number.isFinite(v)) ventaMapByPlant.get(p).set(fecha, v);
    }
  }

  const descMapByPlant = new Map();
  for (const p of plants) descMapByPlant.set(p, new Map());
  for (const d of byDateDesc) {
    const fecha = d.fecha;
    for (const p of plants) {
      const v = d.byPlant && d.byPlant[p] != null ? Number(d.byPlant[p]) : null;
      if (v != null && Number.isFinite(v)) descMapByPlant.get(p).set(fecha, v);
    }
  }

  // Corte efectivo para cálculos (si no hay, usar fin de mes).
  const lastDay = new Date(year, month, 0).getDate();
  const lastDt = new Date(year, month - 1, lastDay);
  const corteDtInput = parseYmdToDate(fechaCorte);
  const corteDt = (corteDtInput && corteDtInput.getFullYear() === year && (corteDtInput.getMonth() + 1) === month)
    ? new Date(corteDtInput.getFullYear(), corteDtInput.getMonth(), corteDtInput.getDate())
    : lastDt;

  // Lookback visual: siempre mantener mínimo 2 semanas (14 días) hacia atrás respecto al corte.
  // Días fuera del mes se pintan amarillo y NO afectan cálculos del mes.
  const isCorteEnMes = corteDtInput && corteDtInput.getFullYear() === year && (corteDtInput.getMonth() + 1) === month;
  const enableLookback = Boolean(isCorteEnMes);
  let lookbackStartYmd = null;
  let lookbackEndYmd = null;
  if (enableLookback) {
    const end = new Date(corteDt.getFullYear(), corteDt.getMonth(), corteDt.getDate());
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    start.setDate(start.getDate() - 13);
    lookbackStartYmd = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    lookbackEndYmd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

    // Venta (ton) por día (provincia) para rango lookback
    try {
      const qVenta = await client.query(
        `SELECT plant_code, fecha, venta_ton
           FROM arr.venta_toneladas_diarias_provincia
          WHERE fecha >= $1::date AND fecha <= $2::date
          ORDER BY fecha`,
        [lookbackStartYmd, lookbackEndYmd]
      );
      for (const row of qVenta.rows || []) {
        const fecha = row.fecha && (typeof row.fecha === "string" ? row.fecha : row.fecha.toISOString?.().slice(0, 10));
        if (!fecha) continue;
        const p = (row.plant_code || "").toString().trim();
        if (!p || !ventaMapByPlant.has(p)) continue;
        const v = Number(row.venta_ton);
        if (Number.isFinite(v)) ventaMapByPlant.get(p).set(fecha, v);
      }
    } catch {
      // best-effort; si no hay tabla o datos, solo se muestra el mes actual
    }

    // Descuento ($/kg) por día (provincia) para rango lookback
    try {
      const qDesc = await client.query(
        `SELECT plant_code, fecha, descuento_por_kg
           FROM arr.descuento_por_kilo_diario_provincia
          WHERE fecha >= $1::date AND fecha <= $2::date
          ORDER BY fecha`,
        [lookbackStartYmd, lookbackEndYmd]
      );
      for (const row of qDesc.rows || []) {
        const fecha = row.fecha && (typeof row.fecha === "string" ? row.fecha : row.fecha.toISOString?.().slice(0, 10));
        if (!fecha) continue;
        const p = (row.plant_code || "").toString().trim();
        if (!p || !descMapByPlant.has(p)) continue;
        const v = Number(row.descuento_por_kg);
        if (Number.isFinite(v)) descMapByPlant.get(p).set(fecha, v);
      }
    } catch {
      // best-effort
    }

    // Fallback BD cruda: llenar celdas faltantes del lookback (sin afectar cálculos del mes).
    try {
      const SQL_PROV_MAP = `
        SELECT DISTINCT p.nombre AS prov_name,
               UPPER(TRIM(p.nombre)) AS key_nombre,
               UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
          FROM public.plantas p
          JOIN arr.provincia_plants ap
            ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
            OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
         WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
           AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
      `;

      const fmtRowDate = (dt) =>
        dt instanceof Date
          ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
          : String(dt).slice(0, 10);

      const qVentaRaw = await client.query(
        `WITH prov_map AS (${SQL_PROV_MAP})
         SELECT pm.prov_name AS plant_code, v.fecha::date AS fecha, ROUND(SUM(v.kg) / 1000.0, 0)::INTEGER AS venta_ton
           FROM arr.ventas_diarias_cliente v
           JOIN prov_map pm
             ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
             OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
          WHERE v.fecha >= $1::date AND v.fecha <= $2::date
          GROUP BY pm.prov_name, v.fecha::date`,
        [lookbackStartYmd, lookbackEndYmd]
      );
      for (const row of qVentaRaw.rows || []) {
        const fecha = fmtRowDate(row.fecha);
        const p = (row.plant_code || "").toString().trim();
        if (!p || !ventaMapByPlant.has(p)) continue;
        const m = ventaMapByPlant.get(p);
        if (m.has(fecha)) continue;
        const v = Number(row.venta_ton);
        if (Number.isFinite(v)) m.set(fecha, v);
      }

      const qKgRaw = await client.query(
        `WITH prov_map AS (${SQL_PROV_MAP})
         SELECT pm.prov_name AS plant_code, v.fecha::date AS fecha, SUM(v.kg) AS kg
           FROM arr.ventas_diarias_cliente v
           JOIN prov_map pm
             ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
             OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
          WHERE v.fecha >= $1::date AND v.fecha <= $2::date
          GROUP BY pm.prov_name, v.fecha::date`,
        [lookbackStartYmd, lookbackEndYmd]
      );
      const kgByKey = new Map();
      for (const row of qKgRaw.rows || []) {
        const fecha = fmtRowDate(row.fecha);
        const p = (row.plant_code || "").toString().trim();
        kgByKey.set(`${p}|${fecha}`, Number(row.kg || 0));
      }

      const qDescRaw = await client.query(
        `WITH prov_map AS (${SQL_PROV_MAP})
         SELECT pm.prov_name AS plant_code, d.fecha::date AS fecha, SUM(d.monto) AS monto
           FROM arr.descuentos_diarios_cliente d
           JOIN prov_map pm
             ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
             OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
          WHERE d.fecha >= $1::date AND d.fecha <= $2::date
          GROUP BY pm.prov_name, d.fecha::date`,
        [lookbackStartYmd, lookbackEndYmd]
      );
      for (const row of qDescRaw.rows || []) {
        const fecha = fmtRowDate(row.fecha);
        const p = (row.plant_code || "").toString().trim();
        if (!p || !descMapByPlant.has(p)) continue;
        const m = descMapByPlant.get(p);
        if (m.has(fecha)) continue;
        const kg = kgByKey.get(`${p}|${fecha}`) || 0;
        const monto = Number(row.monto || 0);
        const ratio = kg > 0 ? (monto / kg) : null;
        if (ratio != null && Number.isFinite(ratio)) m.set(fecha, Math.round(ratio * 100) / 100);
      }
    } catch {
      // best-effort
    }
  }

  const aoa = [];
  const COLK = 10; // 0-index => columna K
  const styleBlocks = [];
  let curRow = 0;

  const pad2 = (n) => String(n).padStart(2, "0");
  const fmtYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const isoDow = (d) => (d.getDay() === 0 ? 7 : d.getDay()); // 1..7
  const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);

  const countRemainingDowInMonth = (dow1to7) => {
    let c = 0;
    for (let day = corteDt.getDate() + 1; day <= lastDay; day++) {
      const d = new Date(year, month - 1, day);
      if (isoDow(d) === dow1to7) c += 1;
    }
    return c;
  };

  for (const p of plants) {
    const ventaMap = ventaMapByPlant.get(p) || new Map();
    const descMap = descMapByPlant.get(p) || new Map();

    // Adjuntar meta al Map para habilitar lookback visual en la tabla semana×DOW.
    if (enableLookback && lookbackStartYmd && lookbackEndYmd) {
      ventaMap.__meta = { lookbackStart: lookbackStartYmd, lookbackEnd: lookbackEndYmd };
      descMap.__meta = { lookbackStart: lookbackStartYmd, lookbackEnd: lookbackEndYmd };
    }

    const header1 = [];
    header1[0] = `${p} — venta (ton)`;
    header1[1] = `${year}-${String(month).padStart(2, "0")}`;
    header1[COLK] = `${p} — descuento ($/kg)`;
    header1[COLK + 1] = `${year}-${String(month).padStart(2, "0")}`;
    aoa.push(header1);
    const header1Row = curRow;
    curRow++;

    const header2 = [];
    // Quitar texto (lo que marcaste en amarillo) para todas las plantas.
    header2[0] = "";
    header2[COLK] = "";
    aoa.push(header2);
    curRow++;
    aoa.push([]);
    curRow++;

    // === Bloque VENTA (ton) ===
    const ventaWeeks = buildSemanaDowTableRows(year, month, ventaMap, true);

    // TOTAL mes (por día de semana): suma de días del mes actual hasta corte
    const totalMesVenta = [0, 0, 0, 0, 0, 0, 0];
    for (let day = 1; day <= corteDt.getDate(); day++) {
      const d = new Date(year, month - 1, day);
      const key = fmtYmd(d);
      const v = ventaMap.get(key);
      if (v != null && Number.isFinite(Number(v))) totalMesVenta[isoDow(d) - 1] += Number(v);
    }
    for (let i = 0; i < 7; i++) totalMesVenta[i] = Math.round(totalMesVenta[i] * 100) / 100;

    // PROM mes (por día de semana): promedio de las últimas 2 semanas (ventana 14 días hasta corte; puede incluir mes anterior)
    const promMesVenta = ["", "", "", "", "", "", ""];
    if (enableLookback && lookbackStartYmd && lookbackEndYmd) {
      const startDt = parseYmdToDate(lookbackStartYmd);
      const endDt = parseYmdToDate(lookbackEndYmd);
      const valsByDow = [[], [], [], [], [], [], []];
      for (let i = 0; i < 32 && startDt && endDt && i < 500; i++) {
        const d = new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate());
        d.setDate(d.getDate() + i);
        if (d > endDt) break;
        const key = fmtYmd(d);
        const v = ventaMap.get(key);
        if (v == null || !Number.isFinite(Number(v))) continue;
        valsByDow[isoDow(d) - 1].push(Number(v));
      }
      for (let k = 0; k < 7; k++) {
        const m = meanNonEmpty(valsByDow[k]);
        promMesVenta[k] = m != null ? Math.round(m * 100) / 100 : "";
      }
    }

    // POR COMPRAR = promMesVenta * días restantes del mes por DOW
    const porComprarVenta = promMesVenta.map((v, idx) => {
      const n = countRemainingDowInMonth(idx + 1);
      return v !== "" ? Math.round((Number(v) * n) * 100) / 100 : "";
    });

    // PROY = TOTAL mes + POR COMPRAR
    const proyVenta = totalMesVenta.map((v, i) => {
      const pc = porComprarVenta[i] !== "" ? Number(porComprarVenta[i]) : 0;
      return Math.round((Number(v) + pc) * 100) / 100;
    });

    // Armar tabla venta: semanas + filas resumen
    const ventaRows = [];
    const ventaMask = [];
    for (let i = 0; i < ventaWeeks.rows.length; i++) {
      ventaRows.push(ventaWeeks.rows[i]);
      ventaMask.push(ventaWeeks.lookbackMaskRows[i] || null);
    }
    ventaRows.push(["PROM mes (por día de semana)", ...promMesVenta, sum(promMesVenta.filter((x) => x !== ""))]);
    ventaMask.push(null);
    ventaRows.push(["TOTAL mes (por día de semana)", ...totalMesVenta, sum(totalMesVenta)]);
    ventaMask.push(null);
    ventaRows.push(["POR COMPRAR", ...porComprarVenta, sum(porComprarVenta.filter((x) => x !== ""))]);
    ventaMask.push(null);
    ventaRows.push(["PROY", ...proyVenta, sum(proyVenta)]);
    ventaMask.push(null);

    // === Bloque DESCUENTO ($/kg) + cálculos en dinero ===
    const descWeeks = buildSemanaDowTableRows(year, month, descMap, false);

    const totalMesDescMxn = [0, 0, 0, 0, 0, 0, 0];
    for (let day = 1; day <= corteDt.getDate(); day++) {
      const d = new Date(year, month - 1, day);
      const key = fmtYmd(d);
      const ratio = descMap.get(key);
      const vTon = ventaMap.get(key);
      if (ratio == null || vTon == null) continue;
      if (!Number.isFinite(Number(ratio)) || !Number.isFinite(Number(vTon))) continue;
      totalMesDescMxn[isoDow(d) - 1] += Number(ratio) * Number(vTon);
    }
    for (let i = 0; i < 7; i++) totalMesDescMxn[i] = Math.round(totalMesDescMxn[i] * 100) / 100;

    const promMesDescRatio = ["", "", "", "", "", "", ""];
    if (enableLookback && lookbackStartYmd && lookbackEndYmd) {
      const startDt = parseYmdToDate(lookbackStartYmd);
      const endDt = parseYmdToDate(lookbackEndYmd);
      const valsByDow = [[], [], [], [], [], [], []];
      for (let i = 0; i < 32 && startDt && endDt && i < 500; i++) {
        const d = new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate());
        d.setDate(d.getDate() + i);
        if (d > endDt) break;
        const key = fmtYmd(d);
        const v = descMap.get(key);
        if (v == null || !Number.isFinite(Number(v))) continue;
        valsByDow[isoDow(d) - 1].push(Number(v));
      }
      for (let k = 0; k < 7; k++) {
        const m = meanNonEmpty(valsByDow[k]);
        promMesDescRatio[k] = m != null ? Math.round(m * 100) / 100 : "";
      }
    }

    // PROM (dinero) = promMesDescRatio * promMesVenta
    const promDescMxn = promMesDescRatio.map((r, i) => {
      if (r === "" || promMesVenta[i] === "") return "";
      return Math.round((Number(r) * Number(promMesVenta[i])) * 100) / 100;
    });
    const porComprarDescMxn = promDescMxn.map((v, idx) => {
      const n = countRemainingDowInMonth(idx + 1);
      return v !== "" ? Math.round((Number(v) * n) * 100) / 100 : "";
    });
    const proyDescMxn = totalMesDescMxn.map((v, i) => {
      const pc = porComprarDescMxn[i] !== "" ? Number(porComprarDescMxn[i]) : 0;
      return Math.round((Number(v) + pc) * 100) / 100;
    });

    const descRows = [];
    const descMask = [];
    for (let i = 0; i < descWeeks.rows.length; i++) {
      descRows.push(descWeeks.rows[i]);
      descMask.push(descWeeks.lookbackMaskRows[i] || null);
    }
    // PROM mes (ratio) igual al formato (no entra en Desc/kg)
    descRows.push(["PROM mes (por día de semana)", ...promMesDescRatio, meanNonEmpty(promMesDescRatio.filter((x) => x !== "")) || ""]);
    descMask.push(null);
    // TOTAL mes / PROM / POR COMPRAR / PROY en dinero (con $)
    descRows.push(["TOTAL mes (por día de semana)", ...totalMesDescMxn, sum(totalMesDescMxn)]);
    descMask.push(null);
    descRows.push(["PROM", ...promDescMxn, sum(promDescMxn.filter((x) => x !== ""))]);
    descMask.push(null);
    descRows.push(["POR COMPRAR", ...porComprarDescMxn, sum(porComprarDescMxn.filter((x) => x !== ""))]);
    descMask.push(null);
    descRows.push(["PROY", ...proyDescMxn, sum(proyDescMxn)]);
    descMask.push(null);

    // Agregar columna Desc/kg para descuento (solo en filas de dinero)
    const addDescKgCol = (rowLabel, numByDow, denByDow) => {
      const num = sum(numByDow);
      const den = sum(denByDow);
      const ratio = den > 0 ? Math.round((num / den) * 100) / 100 : "";
      // encontrar la fila correspondiente y poner el ratio al final (col extra)
      for (let i = 0; i < descRows.length; i++) {
        if (descRows[i] && descRows[i][0] === rowLabel) {
          descRows[i].push(ratio);
          return;
        }
      }
    };
    // expandir header para Desc/kg
    descRows[0] = [...descRows[0], "Desc /kg"];
    // Para filas normales, agrega celda vacía
    for (let i = 1; i < descRows.length; i++) {
      if (!Array.isArray(descRows[i])) continue;
      if (descRows[i].length === 9) descRows[i].push("");
    }
    // TOTAL mes: Σ(desc_mxn)/Σ(venta)
    addDescKgCol("TOTAL mes (por día de semana)", totalMesDescMxn, totalMesVenta);
    addDescKgCol("PROM", promDescMxn.map((x) => (x === "" ? 0 : Number(x))), promMesVenta.map((x) => (x === "" ? 0 : Number(x))));
    addDescKgCol("POR COMPRAR", porComprarDescMxn.map((x) => (x === "" ? 0 : Number(x))), porComprarVenta.map((x) => (x === "" ? 0 : Number(x))));
    addDescKgCol("PROY", proyDescMxn, proyVenta);

    const height = Math.max(ventaRows.length, descRows.length);
    const tableStartRow = curRow;

    for (let i = 0; i < height; i++) {
      const row = [];
      const left = ventaRows[i] || [];
      const right = descRows[i] || [];
      for (let c = 0; c < left.length; c++) row[c] = left[c];
      for (let c = 0; c < right.length; c++) row[COLK + c] = right[c];
      aoa.push(row);
      curRow++;
    }

    aoa.push([]);
    curRow++;

    styleBlocks.push({
      header1Row,
      tableStartRow,
      height,
      ventaMask,
      descMask,
      colOffsetRight: COLK,
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Estilos: encabezado de planta más grande/bold + lookback en gris (solo referencia visual).
  const rgbYellowFill = "FFF200";
  for (const b of styleBlocks) {
    for (const col of [0, COLK]) {
      const ref = XLSX.utils.encode_cell({ r: b.header1Row, c: col });
      if (ws[ref]) ws[ref].s = { ...(ws[ref].s || {}), font: { bold: true, sz: 14 } };
    }
    for (let i = 0; i < b.height; i++) {
      const vm = b.ventaMask[i];
      if (Array.isArray(vm)) {
        for (let k = 0; k < 7; k++) {
          if (!vm[k]) continue;
          const ref = XLSX.utils.encode_cell({ r: b.tableStartRow + i, c: 1 + k }); // Lun..Dom
          if (!ws[ref]) continue;
          ws[ref].s = { ...(ws[ref].s || {}), fill: { fgColor: { rgb: rgbYellowFill } } };
        }
      }
      const dm = b.descMask[i];
      if (Array.isArray(dm)) {
        for (let k = 0; k < 7; k++) {
          if (!dm[k]) continue;
          const ref = XLSX.utils.encode_cell({ r: b.tableStartRow + i, c: b.colOffsetRight + 1 + k });
          if (!ws[ref]) continue;
          ws[ref].s = { ...(ws[ref].s || {}), fill: { fgColor: { rgb: rgbYellowFill } } };
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Acapulco venta L-D");
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
async function getVentaToneladasGrid(client, year, month, fechaCorteYmd = "") {
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

  // Corte: después de la fecha seleccionada no debe aparecer venta (cero).
  // cutoffDay funciona como "primer día NO real" (para isReal = day < cutoffDay).
  let cutoffDay = lastDay + 1;
  const corte = String(fechaCorteYmd || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(corte)) {
    const [cy, cm, cd] = corte.split("-").map((x) => parseInt(x, 10));
    if (cy === year && cm === month && Number.isFinite(cd) && cd >= 1 && cd <= lastDay) cutoffDay = cd + 1;
  }
  for (const d of byDate) {
    if (d.day >= cutoffDay) {
      for (const p of plants) d.byPlant[p] = 0;
      d.tot = 0;
    }
  }
  return { plants, byDate, forecastByPlant, cutoffDay, fechaCorte: corte || null };
}

/**
 * Grid descuento por kilo: plantas en columnas, días en filas.
 * Fuente: arr.descuento_por_kilo_diario_provincia; si vacía, fallback desde descuentos_diarios_cliente/ventas con prov_map.
 * Días desde hoy: desc_kg_forecast por planta (forecast_mensual mapeado por nombre/clave).
 */
async function getDescuentoPorKiloGrid(client, year, month, fechaCorteYmd = "") {
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
  // Corte: después de la fecha seleccionada no debe aparecer descuento (cero).
  let cutoffDay = lastDay + 1;
  const corte = String(fechaCorteYmd || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(corte)) {
    const [cy, cm, cd] = corte.split("-").map((x) => parseInt(x, 10));
    if (cy === year && cm === month && Number.isFinite(cd) && cd >= 1 && cd <= lastDay) cutoffDay = cd + 1;
  }
  for (const d of byDate) {
    if (d.day >= cutoffDay) {
      for (const p of plants) d.byPlant[p] = 0;
    }
  }
  return { plants, byDate, cutoffDay, fechaCorte: corte || null };
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

function hojaA(wb, ventaTonGrid, year, month, compTotalKg, lastDayStr, todayStr, opts = {}) {
  const { plants, byDate, forecastByPlant, cutoffDay = 999 } = ventaTonGrid;
  const headers = ["DÍA", ...plants, "Tot Provincia"];
  const data = [headers];
  const proyTonByPlant = (opts && opts.proyTonByPlant instanceof Map) ? opts.proyTonByPlant : null;

  for (const d of byDate) {
    const row = [d.day];
    let tot = 0;
    for (const p of plants) {
      const raw = d.byPlant[p] != null ? d.byPlant[p] : "";
      const v = raw === "" ? "" : raw;
      row.push(v);
      if (typeof v === "number") tot += v;
    }
    row.push(tot);
    data.push(row);
  }

  const realDates = byDate.filter((d) => d.day < cutoffDay);
  const realDays = realDates.length;
  const acums = plants.map((p) => realDates.reduce((s, d) => s + (Number(d.byPlant[p]) || 0), 0));
  const totAcum = acums.reduce((s, a) => s + a, 0);
  const proms = plants.map((p) => (realDays ? acums[plants.indexOf(p)] / realDays : ""));
  const totProm = realDays ? totAcum / realDays : "";
  const proys = plants.map((p) => (proyTonByPlant && proyTonByPlant.has(p)) ? proyTonByPlant.get(p) : (forecastByPlant.get(p) ?? ""));
  const totProy = plants.reduce((s, p) => {
    const v = (proyTonByPlant && proyTonByPlant.has(p)) ? proyTonByPlant.get(p) : (forecastByPlant.get(p) || 0);
    return s + (Number(v) || 0);
  }, 0) || "";

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
    for (const d of byDate.filter((x) => x.day < cutoffDay)) {
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
