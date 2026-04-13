/**
 * Genera Excel con 3 hojas adicionales al Dashboard (sin modificar hojas actuales):
 * A) Provincia Venta diaria (reales + proyectados), ACUM, PROM, PROY, Comp, Dif Comp
 * B) Provincia Comisiones (descuento/kg diario), ACUM = sum(desc)/sum(kg)
 * C) IGF ejecutivo horizontal: V1, vMax, Forecast, deltas $/kg y MXN; Totales Provincia y Centro
 *
 * Lista de plantas Provincia: env ARR_ZONA_PROVINCIA (comma-separated) o todas las que tengan datos.
 */

"use strict";

/**
 * Exportación Dashboard ARR Forecast: ExcelJS (estilos reales en .xlsx).
 * Otras rutas del servidor siguen usando `xlsx` (SheetJS) en server.js — no mezclar aquí.
 */
const ExcelJS = require("exceljs");
const excelTheme = require("./excel-theme");
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

/** Nombre de hoja semanal provincia (PROY venta col I, PROY desc $/kg al final del bloque desc). */
const SHEET_PRONOSTICO = "Pronostico";

/** Fila 1-based donde empieza el segundo bloque resumen en "IGF Forecast" (títulos). */
const IGF_FORECAST_SECOND_BLOCK_HEADER_ROW = 28;

/** Plantas en orden del cuadro inferior (debe coincidir con filas IGF superiores C18:C23 típicas). */
const IGF_PROVINCIA_RESUMEN_PLANTAS = [
  "GT Puebla",
  "Tehuacan",
  "Acapulco",
  "GTM Queretaro",
  "GTM San Luis",
  "Morelos",
];

/** Mini-resumen provincia: encabezado + filas planta + Zona (encima de la tabla IGF principal, hoja Compromiso 18 col). */
const IGF_MINI_RESUMEN_EXCEL_ROW_COUNT = 1 + IGF_PROVINCIA_RESUMEN_PLANTAS.length + 1;
/** Primera fila Excel de encabezados de la tabla grande (después de título, hueco y mini). */
const IGF_COMPROMISO_MAIN_HEADER_EXCEL_ROW = 6 + IGF_MINI_RESUMEN_EXCEL_ROW_COUNT;
/** Índice 0-based de la primera fila de datos de la tabla IGF superior (Compromiso con mini arriba). */
const IGF_COMPROMISO_DATA_START_ROW0 = 5 + IGF_MINI_RESUMEN_EXCEL_ROW_COUNT + 2 + 1;

/**
 * plant_code en arr.provincia_plants / título Pronostico ("Puebla — venta (ton)")
 * → etiquetas usadas en el bloque resumen IGF (col A filas 29–34).
 */
const PRONOSTICO_PLANT_CODE_TO_IGF_RESUMEN_LABELS = {
  Puebla: ["GT Puebla"],
  Tehuacán: ["Tehuacan"],
  Tehuacan: ["Tehuacan"],
  Acapulco: ["Acapulco"],
  "Querétaro": ["GTM Queretaro"],
  Queretaro: ["GTM Queretaro"],
  "San Luis": ["GTM San Luis"],
  Morelos: ["Morelos"],
};

function normEmpresaKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ");
}

/** Alinea códigos de planta (p. ej. "Tehuacán" vs "Tehuacan") con la lista canónica de `arr.provincia_plants`. */
function resolveCanonicalPlantCode(rawCode, plants) {
  const w = String(rawCode || "").trim();
  if (!w || !Array.isArray(plants) || !plants.length) return null;
  if (plants.includes(w)) return w;
  const nw = normEmpresaKey(w);
  for (const p of plants) {
    if (normEmpresaKey(p) === nw) return p;
  }
  for (const p of plants) {
    const np = normEmpresaKey(p);
    if (np.includes(nw) || nw.includes(np)) return p;
  }
  return null;
}

/**
 * Obtiene PROY snapshot / mapa cuando la clave difiere por tildes o alias (Tehuacán vs Tehuacan).
 * @param {Map<string,{proy_venta_ton:number,proy_desc_kg:number}>} m
 */
function resolveProyFromPlantMap(m, plantCodeWanted) {
  const want = String(plantCodeWanted || "").trim();
  if (!want || !m || typeof m.get !== "function") return null;
  if (m.has(want)) return m.get(want);
  const nw = normEmpresaKey(want);
  for (const [k, v] of m.entries()) {
    if (normEmpresaKey(k) === nw) return v;
  }
  for (const [k, v] of m.entries()) {
    const nk = normEmpresaKey(k);
    if (nk.includes(nw) || nw.includes(nk)) return v;
  }
  return null;
}

/**
 * Puntuación para emparejar etiqueta resumen (ej. "GTM Queretaro") con clave Pronostico/IGF (ej. "Queretaro", "GT Puebla").
 */
function scorePlantMatch(wantNorm, codeNorm) {
  if (!wantNorm || !codeNorm) return -1;
  if (wantNorm === codeNorm) return 10000;
  if (wantNorm.includes(codeNorm) || codeNorm.includes(wantNorm)) {
    return 5000 - Math.abs(wantNorm.length - codeNorm.length);
  }
  const strip = (x) => x.replace(/^(gtm|gt)\s+/i, "").trim();
  const w = strip(wantNorm);
  const c = strip(codeNorm);
  if (w && c && (w === c || w.includes(c) || c.includes(w))) return 4000;
  const tokens = (x) => x.split(/\s+/).filter((t) => t.length > 2);
  const wt = tokens(wantNorm);
  const ct = tokens(codeNorm);
  let hit = 0;
  for (const a of wt) {
    for (const b of ct) {
      if (a === b || a.includes(b) || b.includes(a)) hit += 1;
    }
  }
  if (hit > 0) return 1000 + hit * 150;
  return -1;
}

/** Columnas (0-based) E,I,J,M,N,O,P — regla de tres respecto a fila IGF y columna B. F se enlaza aparte a la fila IGF (Impuestos). */
const IGF_RULE_OF_THREE_COL_INDICES = [4, 8, 9, 12, 13, 14, 15];

/** Índice de columna 0-based → letra Excel (A, B, …, Z, AA). */
function colIndexToA1Letter(col0) {
  let n = col0 + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Escapa nombre de hoja para fórmulas Excel ('Hoja'! si hace falta).
 */
function sheetRefForFormula(sheetName) {
  const n = String(sheetName || "");
  if (/[^A-Za-z0-9_]/.test(n) || /^\d/.test(n)) return `'${n.replace(/'/g, "''")}'`;
  return n;
}

/**
 * Añade fórmulas al segundo bloque de "IGF Forecast": venta PROY desde Pronostico!I, margen =C(fila IGF), desc PROY $/kg,
 * y regla de tres en E,F,I,J,M,N,O,P: =E$igf*$B$igf/B(fila) (columna B fija en numerador $B$igf; denominador B de la fila actual).
 * row0Header: índice 0-based de la fila de títulos (equivalente Excel fila row0Header+1).
 * worksheet: hoja ExcelJS (no SheetJS).
 */
function applyIgfProvinciaResumenFormulas(worksheet, nCols, row0Header, plantMetaList, pronosticoColI0, pronosticoDescCol0) {
  const sh = sheetRefForFormula(SHEET_PRONOSTICO);
  const colI = colIndexToA1Letter(pronosticoColI0);
  const colDesc = colIndexToA1Letter(pronosticoDescCol0);
  const margenCol = colIndexToA1Letter(2); // C
  const colB = colIndexToA1Letter(1);

  for (let i = 0; i < plantMetaList.length; i++) {
    const meta = plantMetaList[i];
    const r0 = row0Header + 1 + i;
    const excelRow = r0 + 1;
    if (meta.pronosticoVentaRow != null) {
      excelTheme.setCellFormula(worksheet, r0, 1, `${sh}!$${colI}$${meta.pronosticoVentaRow}`);
    }
    if (meta.igfMargenRow != null) {
      excelTheme.setCellFormula(worksheet, r0, 2, `$${margenCol}$${meta.igfMargenRow}`);
    }
    if (meta.pronosticoDescRow != null) {
      excelTheme.setCellFormula(worksheet, r0, 3, `${sh}!$${colDesc}$${meta.pronosticoDescRow}`);
    }
    const igfR = meta.igfMargenRow;
    if (igfR != null) {
      const colF = colIndexToA1Letter(5);
      excelTheme.setCellFormula(worksheet, r0, 5, `$${colF}$${igfR}`);
      for (const c0 of IGF_RULE_OF_THREE_COL_INDICES) {
        if (c0 >= nCols) continue;
        const L = colIndexToA1Letter(c0);
        excelTheme.setCellFormula(
          worksheet,
          r0,
          c0,
          `IF(${colB}${excelRow}=0,0,${L}$${igfR}*$${colB}$${igfR}/${colB}${excelRow})`
        );
      }
    }
  }

  const rZona = row0Header + 1 + plantMetaList.length;
  const firstDataR = row0Header + 1;
  const lastPlantR = row0Header + plantMetaList.length;
  const sumRange = `${colIndexToA1Letter(1)}${firstDataR + 1}:${colIndexToA1Letter(1)}${lastPlantR + 1}`;
  excelTheme.setCellFormula(worksheet, rZona, 1, `SUM(${sumRange})`);
}

/**
 * Resuelve fila Excel (1-based) de la fila PROY de una planta en la hoja Pronostico.
 * Prioridad: clave exacta en el mapa (incl. alias "GT Puebla" registrados al generar Pronostico), luego coincidencia por nombre.
 */
function matchPronosticoProyRow(plantToProyExcelRow, label) {
  const raw = String(label || "").trim();
  if (!raw) return null;
  if (plantToProyExcelRow.has(raw)) return plantToProyExcelRow.get(raw);
  const want = normEmpresaKey(label);
  if (!want) return null;
  for (const [code, excelRow] of plantToProyExcelRow) {
    if (normEmpresaKey(code) === want) return excelRow;
  }
  let bestRow = null;
  let best = -1;
  let bestKeyLen = -1;
  for (const [code, excelRow] of plantToProyExcelRow) {
    const k = normEmpresaKey(code);
    if (!k) continue;
    const sc = scorePlantMatch(want, k);
    if (sc > best || (sc === best && k.length > bestKeyLen)) {
      best = sc;
      bestKeyLen = k.length;
      bestRow = excelRow;
    }
  }
  return best >= 500 ? bestRow : null;
}

/**
 * Resuelve filas PROY en Pronostico para IGF: con mapas venta/desc separados, a veces solo uno tiene la clave.
 * Comportamiento equivalente al mapa único anterior: misma fila Excel cuando venta y desc tienen la misma altura de tabla.
 */
function pronosticoProyRowsForIgfLabel(plantToProyVentaExcelRow, plantToProyDescExcelRow, label) {
  const v = matchPronosticoProyRow(plantToProyVentaExcelRow, label);
  const d = matchPronosticoProyRow(plantToProyDescExcelRow, label);
  return {
    pronosticoVentaRow: v ?? d,
    pronosticoDescRow: d ?? v,
  };
}

/** Registra la misma fila PROY bajo el plant_code de BD y bajo cada etiqueta IGF del resumen (p. ej. GT Puebla). */
function registerPronosticoProyRows(plantToProyExcelRow, plantCodeDb, proyExcelRow) {
  const p = String(plantCodeDb || "").trim();
  if (!p) return;
  plantToProyExcelRow.set(p, proyExcelRow);
  const pn = normEmpresaKey(p);
  for (const [canon, extraLabels] of Object.entries(PRONOSTICO_PLANT_CODE_TO_IGF_RESUMEN_LABELS)) {
    const cn = normEmpresaKey(canon);
    if (pn !== cn && !(pn.includes(cn) && cn.length >= 4) && !(cn.includes(pn) && pn.length >= 4)) continue;
    for (const lbl of extraLabels) plantToProyExcelRow.set(String(lbl).trim(), proyExcelRow);
    return;
  }
}

/**
 * Mapa empresa (celda A) → fila Excel 1-based en la primera tabla IGF (columna margen = C).
 */
function buildIgfEmpresaToExcelRowMap(dataRowsAoa, dataStartRow0) {
  const m = new Map();
  for (let i = 0; i < dataRowsAoa.length; i++) {
    const row = dataRowsAoa[i];
    const emp = row && row[0] != null ? String(row[0]).trim() : "";
    if (!emp) continue;
    const excelRow = dataStartRow0 + i + 1;
    m.set(normEmpresaKey(emp), excelRow);
  }
  return m;
}

function matchIgfMargenRow(empresaToExcelRow, label) {
  const want = normEmpresaKey(label);
  if (!want) return null;
  if (empresaToExcelRow.has(want)) return empresaToExcelRow.get(want);
  let bestRow = null;
  let best = -1;
  let bestKeyLen = -1;
  for (const [k, row] of empresaToExcelRow) {
    const sc = scorePlantMatch(want, k);
    if (sc > best || (sc === best && k.length > bestKeyLen)) {
      best = sc;
      bestKeyLen = k.length;
      bestRow = row;
    }
  }
  return best >= 500 ? bestRow : null;
}

/** Fila IGF Forecast API (dashboard) que corresponde a una etiqueta del resumen (GT Puebla, etc.). */
function matchIgfForecastDataRow(igfRows, label) {
  const want = normEmpresaKey(label);
  if (!want) return null;
  const rows = (igfRows || []).filter((r) => {
    const e = r && r.empresa != null ? String(r.empresa).trim() : "";
    return e && !/^TOTALES?$/i.test(e);
  });
  let best = null;
  let bestScore = -1;
  let bestKeyLen = -1;
  for (const row of rows) {
    const k = normEmpresaKey(row.empresa);
    const sc = scorePlantMatch(want, k);
    if (sc > bestScore || (sc === bestScore && k.length > bestKeyLen)) {
      bestScore = sc;
      bestKeyLen = k.length;
      best = row;
    }
  }
  return bestScore >= 500 ? best : null;
}

/** hg_pct en API/BD es decimal (0.12); mismo número que muestra el dashboard como 12.0. */
function hgPctDbToDashboardPercent(hgPct) {
  const n = Number(hgPct);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100 * 10) / 10;
}

/**
 * HG (%) del IGF Dashboard en el bloque resumen (mismas filas que B/C/D).
 * Plantilla 18 col: columna G (índice 6). Plantilla 20 col: columna I — "HG (%)" (índice 8).
 * Fila Zona Provincia: sin total HG (vacío).
 */
function applyIgfResumenHgPctFromDashboard(worksheet, row0Header, igfRows, nCols) {
  const hgCol0 = nCols >= 20 ? 8 : 6;
  for (let i = 0; i < IGF_PROVINCIA_RESUMEN_PLANTAS.length; i++) {
    const dataRow = matchIgfForecastDataRow(igfRows, IGF_PROVINCIA_RESUMEN_PLANTAS[i]);
    const pct = dataRow && dataRow.hg_pct != null ? hgPctDbToDashboardPercent(dataRow.hg_pct) : null;
    if (pct == null) continue;
    const r0 = row0Header + 1 + i;
    excelTheme.setCellNumber(worksheet, r0, hgCol0, pct, excelTheme.FMT_PCT_DISPLAY);
  }
}

/**
 * Bloque resumen plantilla 18 col: H regla de tres vs tabla superior;
 * K = C+D-E-F+H-I-J; L = K*B*1000; Q = K-M-N-O-P; R = Q*B*1000.
 * Fila Zona Provincia: solo L y R con SUM (K35 sin fórmula).
 */
function applyIgfResumenBlockDerivedFormulas(worksheet, row0Header, plantMetaList, nCols) {
  if (nCols !== IGF_COMPROMISO_HEADER_ROW7.length) return;
  const B = colIndexToA1Letter(1);
  const C = colIndexToA1Letter(2);
  const D = colIndexToA1Letter(3);
  const E = colIndexToA1Letter(4);
  const F = colIndexToA1Letter(5);
  const G = colIndexToA1Letter(6);
  const H = colIndexToA1Letter(7);
  const I = colIndexToA1Letter(8);
  const J = colIndexToA1Letter(9);
  const K = colIndexToA1Letter(10);
  const L = colIndexToA1Letter(11);
  const M = colIndexToA1Letter(12);
  const N = colIndexToA1Letter(13);
  const O = colIndexToA1Letter(14);
  const P = colIndexToA1Letter(15);
  const Q = colIndexToA1Letter(16);
  const R = colIndexToA1Letter(17);

  const setDerivedForPlantRow = (r0, igfR) => {
    const er = r0 + 1;
    if (igfR != null) {
      excelTheme.setCellFormula(
        worksheet,
        r0,
        7,
        `IF($${G}$${igfR}=0,0,${H}$${igfR}*$${G}${er}/$${G}$${igfR})`
      );
    }
    excelTheme.setCellFormula(worksheet, r0, 10, `=${C}${er}+${D}${er}-${E}${er}-${F}${er}+${H}${er}-${I}${er}-${J}${er}`);
    excelTheme.setCellFormula(worksheet, r0, 11, `=${K}${er}*${B}${er}*1000`);
    excelTheme.setCellFormula(worksheet, r0, 16, `=${K}${er}-${M}${er}-${N}${er}-${O}${er}-${P}${er}`);
    excelTheme.setCellFormula(worksheet, r0, 17, `=${Q}${er}*${B}${er}*1000`);
  };

  for (let i = 0; i < plantMetaList.length; i++) {
    setDerivedForPlantRow(row0Header + 1 + i, plantMetaList[i].igfMargenRow);
  }

  const rZona = row0Header + 1 + plantMetaList.length;
  const firstPlantExcel = row0Header + 2;
  const lastPlantExcel = row0Header + 1 + plantMetaList.length;
  excelTheme.setCellFormula(worksheet, rZona, 11, `SUM($${L}$${firstPlantExcel}:$${L}$${lastPlantExcel})`);
  excelTheme.setCellFormula(worksheet, rZona, 17, `SUM($${R}$${firstPlantExcel}:$${R}$${lastPlantExcel})`);
}

/**
 * Tercer bloque (mini-resumen) debajo de "Zona Provincia" (a partir de A36 en la plantilla típica):
 * reacomoda valores (Venta/Margen/Com.Desc/Impuestos/HG $/kg) y calcula:
 * INGRESO, OPERATIVOS, CORPORATIVOS, GASTO, Util Oper (Importe), Resultado Final (Importe).
 *
 * Notas:
 * - Se basa en la tabla superior del bloque resumen (mismas filas por planta).
 * - Mantiene exactamente las fórmulas provistas por el usuario (ajustadas a filas dinámicas).
 */
function applyIgfMiniResumenFormulas(worksheet, row0Header, plantCount, nCols, options = {}) {
  // Solo tiene sentido en la plantilla "Compromiso" (18 cols: A..R) porque usa M:P.
  if (nCols !== IGF_COMPROMISO_HEADER_ROW7.length) return;
  const miniAtTop = options.miniAtTop !== false;
  const provinciaHeaderExcelRow = row0Header + 1; // 1-based: encabezado bloque resumen provincia
  const firstPlantExcelRow = provinciaHeaderExcelRow + 1;
  const zonaExcelRow = firstPlantExcelRow + plantCount;
  let miniHeaderExcelRow;
  let miniFirstDataExcelRow;
  let miniZonaExcelRow;
  if (miniAtTop) {
    miniHeaderExcelRow = 6;
    miniFirstDataExcelRow = 7;
    miniZonaExcelRow = miniFirstDataExcelRow + plantCount;
  } else {
    miniHeaderExcelRow = zonaExcelRow + 1;
    miniFirstDataExcelRow = miniHeaderExcelRow + 1;
    miniZonaExcelRow = miniFirstDataExcelRow + plantCount;
  }

  // Encabezados del mini-resumen (A..L)
  const headers = [
    "Empresa",
    "Venta",
    "Margen",
    "Com. y Desc.",
    "Impuestos",
    "HG - $/Kg",
    "INGRESO",
    "OPERATIVOS",
    "CORPORATIVOS",
    "GASTO",
    "Util. Operación - Importe",
    "Resultado Final - Importe",
  ];

  // Estilo base (sin depender de constantes internas de excel-theme)
  const fillHeader = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
  const fillLabel = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
  const borderBlack = { style: "thin", color: { argb: "FF000000" } };
  // Formatos numéricos (Excel guarda formato, no el idioma de la UI):
  // - Verde: 2 decimales
  // - Azul: moneda MXN sin decimales (enteros; negativos en rojo)
  const FMT_2DEC = "#,##0.00";
  const FMT_CURRENCY_MXN_INT = '"$"#,##0;[Red]"$"#,##0';
  const applyCellBorder = (cell) => {
    cell.border = { top: borderBlack, left: borderBlack, bottom: borderBlack, right: borderBlack };
  };

  for (let c0 = 0; c0 < headers.length; c0++) {
    const cell = worksheet.getCell(miniHeaderExcelRow, c0 + 1);
    cell.value = headers[c0];
    cell.fill = fillHeader;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    applyCellBorder(cell);
  }

  for (let i = 0; i < plantCount; i++) {
    const srcExcelRow = firstPlantExcelRow + i; // fila de planta en bloque resumen superior
    const dstExcelRow = miniFirstDataExcelRow + i; // fila mini-resumen

    // A: Empresa (mismo texto que la fila del bloque superior)
    {
      excelTheme.setCellFormula(worksheet, dstExcelRow - 1, 0, `A${srcExcelRow}`);
      const cell = worksheet.getCell(dstExcelRow, 1);
      cell.fill = fillLabel;
      cell.font = { bold: true, color: { argb: "FF000000" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      applyCellBorder(cell);
    }

    // Reacomodo (mismos valores, solo reubicados)
    // B = B(src)  Venta
    // C = C(src)  Margen
    // D = D(src)  Com y Desc
    // E = F(src)  Impuestos
    // F = H(src)  HG - $/Kg
    excelTheme.setCellFormula(worksheet, dstExcelRow - 1, 1, `=B${srcExcelRow}`);
    excelTheme.setCellFormula(worksheet, dstExcelRow - 1, 2, `=C${srcExcelRow}`);
    excelTheme.setCellFormula(worksheet, dstExcelRow - 1, 3, `=D${srcExcelRow}`);
    excelTheme.setCellFormula(worksheet, dstExcelRow - 1, 4, `=F${srcExcelRow}`);
    excelTheme.setCellFormula(worksheet, dstExcelRow - 1, 5, `=H${srcExcelRow}`);

    // INGRESO (G): (Margen − HG $/kg + Com/Desc) × Venta(ton) × 1000 — misma lógica que mini-resumen web.
    excelTheme.setCellFormula(
      worksheet,
      dstExcelRow - 1,
      6,
      `=(C${dstExcelRow}-F${dstExcelRow}+D${dstExcelRow})*B${dstExcelRow}*1000`
    );
    // H (OPERATIVOS) = (Gasto + Bancos Planta + Provisión Planta en tabla superior + Impuestos en mini) * Venta * 1000
    // Equiv. Excel: =(E_src+I_src+J_src+E_dst)*B_dst*1000 (ej. fila 39 vs 29).
    excelTheme.setCellFormula(
      worksheet,
      dstExcelRow - 1,
      7,
      `=(E${srcExcelRow}+I${srcExcelRow}+J${srcExcelRow}+E${dstExcelRow})*B${dstExcelRow}*1000`
    );
    // I = SUM(M:P)*B*1000 (corporativos) tomando la fila fuente
    excelTheme.setCellFormula(worksheet, dstExcelRow - 1, 8, `=SUM(M${srcExcelRow}:P${srcExcelRow})*B${dstExcelRow}*1000`);
    // J = H+I
    excelTheme.setCellFormula(worksheet, dstExcelRow - 1, 9, `=H${dstExcelRow}+I${dstExcelRow}`);
    // K = G-H
    excelTheme.setCellFormula(worksheet, dstExcelRow - 1, 10, `=G${dstExcelRow}-H${dstExcelRow}`);
    // L = K-I
    excelTheme.setCellFormula(worksheet, dstExcelRow - 1, 11, `=K${dstExcelRow}-I${dstExcelRow}`);

    // Bordes para el resto de celdas de la fila (B..L)
    for (let c = 2; c <= 12; c++) {
      const cell = worksheet.getCell(dstExcelRow, c);
      applyCellBorder(cell);
      if (c >= 2) cell.alignment = { vertical: "middle", horizontal: "right" };
    }

    // Formatos:
    // E (Impuestos) y F (HG - $/Kg): 2 decimales (verde)
    worksheet.getCell(dstExcelRow, 5).numFmt = FMT_2DEC;
    worksheet.getCell(dstExcelRow, 6).numFmt = FMT_2DEC;
    // G..L (dinero): moneda sin decimales (azul)
    for (let col = 7; col <= 12; col++) {
      worksheet.getCell(dstExcelRow, col).numFmt = FMT_CURRENCY_MXN_INT;
    }
  }

  // Fila total "Zona Provincia": SUM(G..L) sobre filas de plantas del mini-resumen
  const firstMiniData = miniFirstDataExcelRow;
  const lastMiniData = miniFirstDataExcelRow + plantCount - 1;
  const fillZonaA = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7F7F7F" } };

  for (let c = 1; c <= 12; c++) {
    const cell = worksheet.getCell(miniZonaExcelRow, c);
    applyCellBorder(cell);
    if (c === 1) {
      cell.value = "Zona Provincia";
      cell.fill = fillZonaA;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    } else if (c >= 7 && c <= 12) {
      const colLetter = colIndexToA1Letter(c - 1);
      excelTheme.setCellFormula(
        worksheet,
        miniZonaExcelRow - 1,
        c - 1,
        `=SUM(${colLetter}${firstMiniData}:${colLetter}${lastMiniData})`
      );
      cell.numFmt = FMT_CURRENCY_MXN_INT;
      cell.fill = fillZonaA;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "right" };
    } else {
      cell.fill = fillZonaA;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    }
  }

  // Bordes negros para todo el bloque (encabezado + plantas + zona), A..L
  try {
    excelTheme.applyBordersRangeBlack(worksheet, miniHeaderExcelRow - 1, 0, miniZonaExcelRow - 1, 11);
  } catch {
    /* ignore */
  }
}

/**
 * Añade filas 28+ (con relleno): títulos completos (misma cantidad de columnas que la tabla IGF), plantas provincia, Zona Provincia.
 * @param {string[]} secondBlockHeaders - ej. IGF_COMPROMISO_HEADER_ROW7 o IGF_FORECAST_HEADERS
 */
function appendProvinciaResumenToIgfData(data, nCol, dataRows, secondBlockHeaders, dataStartRow0 = 8) {
  const nFirst = data.length;
  const pad = Math.max(0, IGF_FORECAST_SECOND_BLOCK_HEADER_ROW - nFirst - 1);
  for (let i = 0; i < pad; i++) data.push(padRowToCols([], nCol));
  const hdr = (secondBlockHeaders && secondBlockHeaders.length ? secondBlockHeaders : []).slice(0, nCol);
  data.push(padRowToCols(hdr, nCol));
  for (const pl of IGF_PROVINCIA_RESUMEN_PLANTAS) data.push(padRowToCols([pl], nCol));
  data.push(padRowToCols(["Zona Provincia"], nCol));
  const row0Header = nFirst + pad;
  const empMap = buildIgfEmpresaToExcelRowMap(dataRows, dataStartRow0);
  return { row0Header, empMap };
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
  for (let i = 0; i < IGF_MINI_RESUMEN_EXCEL_ROW_COUNT; i++) rows.push(padRowToCols([], n));
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
  const wb = new ExcelJS.Workbook();
  wb.creator = "folio-whatsapp-bot";
  wb.created = new Date();
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
  const pronosticoMeta = await appendHojaAcapulcoSemanaDow(client, wb, year, month, { fechaCorte });

  const rawIgfRows = await fetchIgfCompromisoRawRows(client, year, month);
  if (rawIgfRows.length > 0) {
    const dataRows = buildIgfCompromisoRawDataRows(rawIgfRows);
    const data = buildIgfCompromisoTemplateAoa(year, month, dataRows);
    const nCol = IGF_COMPROMISO_HEADER_ROW7.length;
    const { row0Header, empMap } = appendProvinciaResumenToIgfData(
      data,
      nCol,
      dataRows,
      IGF_COMPROMISO_HEADER_ROW7,
      IGF_COMPROMISO_DATA_START_ROW0
    );
    const ws = wb.addWorksheet("IGF Forecast", {
      views: [{ state: "frozen", ySplit: IGF_COMPROMISO_MAIN_HEADER_EXCEL_ROW + 1, showGridLines: true }],
    });
    excelTheme.writeAoa(ws, data);
    const plantMetaList = IGF_PROVINCIA_RESUMEN_PLANTAS.map((label) => ({
      ...pronosticoProyRowsForIgfLabel(
        pronosticoMeta.plantToProyVentaExcelRow,
        pronosticoMeta.plantToProyDescExcelRow,
        label
      ),
      igfMargenRow: matchIgfMargenRow(empMap, label),
    }));
    applyIgfProvinciaResumenFormulas(
      ws,
      nCol,
      row0Header,
      plantMetaList,
      pronosticoMeta.pronosticoProyVentaCol0,
      pronosticoMeta.pronosticoProyDescKgCol0
    );
    if (options.igfForecast && Array.isArray(options.igfForecast.rows) && options.igfForecast.rows.length > 0) {
      applyIgfResumenHgPctFromDashboard(ws, row0Header, options.igfForecast.rows, nCol);
    }
    applyIgfResumenBlockDerivedFormulas(ws, row0Header, plantMetaList, nCol);
    applyIgfMiniResumenFormulas(ws, row0Header, IGF_PROVINCIA_RESUMEN_PLANTAS.length, nCol, { miniAtTop: true });
    excelTheme.applyIgfForecastSheetLayout(ws, {
      nCol,
      headerRow6: IGF_COMPROMISO_HEADER_ROW6,
      mainHeaderExcelRow1Based: IGF_COMPROMISO_MAIN_HEADER_EXCEL_ROW,
      dataStartRow0: IGF_COMPROMISO_DATA_START_ROW0,
      dataRowCount: dataRows.length,
      row0Header,
      resumenPlantCount: IGF_PROVINCIA_RESUMEN_PLANTAS.length,
      lastRow0: data.length - 1,
    });
    excelTheme.setColumnWidths(
      ws,
      Array.from({ length: nCol }, (_, i) => (i === 0 ? 24 : i >= 10 ? 16 : 12))
    );
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
    const forecastDataRows = buildIgfForecastDataRows();
    const data = buildIgfForecastStyleSheetAoa(title, IGF_FORECAST_HEADER_ROW6, IGF_FORECAST_HEADERS, forecastDataRows);
    const nCol = IGF_FORECAST_HEADERS.length;
    const { row0Header, empMap } = appendProvinciaResumenToIgfData(data, nCol, forecastDataRows, IGF_FORECAST_HEADERS);
    const ws = wb.addWorksheet("IGF Forecast", {
      views: [{ state: "frozen", ySplit: 7, showGridLines: true }],
    });
    excelTheme.writeAoa(ws, data);
    const plantMetaList = IGF_PROVINCIA_RESUMEN_PLANTAS.map((label) => ({
      ...pronosticoProyRowsForIgfLabel(
        pronosticoMeta.plantToProyVentaExcelRow,
        pronosticoMeta.plantToProyDescExcelRow,
        label
      ),
      igfMargenRow: matchIgfMargenRow(empMap, label),
    }));
    applyIgfProvinciaResumenFormulas(
      ws,
      nCol,
      row0Header,
      plantMetaList,
      pronosticoMeta.pronosticoProyVentaCol0,
      pronosticoMeta.pronosticoProyDescKgCol0
    );
    if (options.igfForecast && Array.isArray(options.igfForecast.rows) && options.igfForecast.rows.length > 0) {
      applyIgfResumenHgPctFromDashboard(ws, row0Header, options.igfForecast.rows, nCol);
    }
    applyIgfResumenBlockDerivedFormulas(ws, row0Header, plantMetaList, nCol);
    applyIgfMiniResumenFormulas(ws, row0Header, IGF_PROVINCIA_RESUMEN_PLANTAS.length, nCol);
    excelTheme.applyIgfForecastSheetLayout(ws, {
      nCol,
      headerRow6: IGF_FORECAST_HEADER_ROW6,
      dataStartRow0: 8,
      dataRowCount: forecastDataRows.length,
      row0Header,
      resumenPlantCount: IGF_PROVINCIA_RESUMEN_PLANTAS.length,
      lastRow0: data.length - 1,
    });
    excelTheme.setColumnWidths(
      ws,
      Array.from({ length: nCol }, (_, i) => (i === 0 ? 22 : 11))
    );
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
    await appendHojaProyeccionCatSub(client, wb, {
      ...baseHist,
      targetYear: year,
      targetMonth: 3,
      fechaHasta: finMes(year, 3),
      sheetName: "Marzo",
    });
    await appendHojaProyeccionCatSub(client, wb, {
      ...baseHist,
      targetYear: year,
      targetMonth: 4,
      fechaHasta: finMes(year, 4),
      sheetName: "Abril",
    });
    await appendHojaProyeccionCatSub(client, wb, {
      ...baseHist,
      targetYear: year,
      targetMonth: 5,
      fechaHasta: finMes(year, 5),
      sheetName: "Mayo",
    });
  }

  // Hoja adicional: lista de clientes por planta y su descuento del mes ($/kg).
  // El descuento $/kg se calcula como |SUM(monto)| / SUM(kg) en el mes calendario (ej. marzo).
  await appendHojaClientesDescuentoMes(client, wb, year, month, plantCode, {
    targetYear: options.proyeccionCatSubForecast?.targetYear ?? year,
    targetMonth: options.proyeccionCatSubForecast?.targetMonth ?? month,
    fechaHasta: options.proyeccionCatSubForecast?.fechaHasta,
    forecastKgByPlant: options.proyeccionCatSubForecast?.forecastKgByPlant,
  });

  appendHojaPueblaConsolidada(wb);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

/**
 * Totales kg forecast por planta (provincia_plants.plant_code), igual que Proy cat-sub Forecast.
 */
async function fetchForecastKgByPlantMap(client, targetYear, targetMonth, forecastKgByPlantOpt) {
  if (forecastKgByPlantOpt && typeof forecastKgByPlantOpt === "object") {
    try {
      const m = new Map();
      for (const [k, v] of Object.entries(forecastKgByPlantOpt)) {
        const kk = String(k || "").trim();
        const vv = Number(v);
        if (kk && Number.isFinite(vv) && vv >= 0) m.set(kk, vv);
      }
      return m;
    } catch {
      /* fall through */
    }
  }
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
  return new Map((r.rows || []).map((row) => [String(row.plant_code || "").trim(), Number(row.kg_forecast || 0)]));
}

function resolveTargetKgForPlantaLabel(plantaLabel, forecastMap) {
  const L = String(plantaLabel || "").trim();
  if (!L || !forecastMap || forecastMap.size === 0) return 0;
  if (forecastMap.has(L)) return Number(forecastMap.get(L)) || 0;
  const want = normEmpresaKey(L);
  let bestKg = 0;
  let bestSc = -1;
  for (const [code, kg] of forecastMap) {
    const sc = scorePlantMatch(want, normEmpresaKey(code));
    if (sc > bestSc) {
      bestSc = sc;
      bestKg = Number(kg) || 0;
    }
  }
  return bestSc >= 0 ? bestKg : 0;
}

/**
 * Hoja: clientes por planta con descuento del mes en $/kg.
 * Fuente: arr.ventas_diarias_cliente + arr.descuentos_diarios_cliente.
 * Planta se normaliza a provincia_plants (prov_name) cuando hay mapeo; si no, usa el plant_code bruto.
 * @param {object} [forecastOpts]
 * @param {number} [forecastOpts.targetYear]
 * @param {number} [forecastOpts.targetMonth]
 * @param {string} [forecastOpts.fechaHasta] — solo informativo en encabezado si aplica
 * @param {object} [forecastOpts.forecastKgByPlant] — override del mapa forecast (misma opción que Proy cat-sub Forecast)
 */
async function appendHojaClientesDescuentoMes(client, wb, year, month, plantCode = null, forecastOpts = {}) {
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
  if (plantFilter) params.push(plantFilter);

  // Cat/sub por cliente (del mes)
  const catParams = plantFilter ? [year, month, plantFilter] : [year, month];
  const catQ = await client.query(
    `
    WITH prov_map AS (${SQL_PROV_MAP})
    SELECT
      COALESCE(pm.prov_name, TRIM(c.plant_code)) AS planta,
      c.cliente_norm AS cliente,
      COALESCE(c.canal, 'Casa') AS categoria,
      COALESCE(c.subcanal, '') AS subcategoria
    FROM arr.cliente_categoria_mes c
    LEFT JOIN prov_map pm
      ON UPPER(TRIM(c.plant_code)) = pm.key_nombre
      OR (pm.key_clave <> '' AND UPPER(TRIM(c.plant_code)) = pm.key_clave)
    WHERE c.year = $1 AND c.month = $2
    ${plantFilter ? "AND (UPPER(TRIM(c.plant_code)) = UPPER(TRIM($3::text)))" : ""}
    `,
    catParams
  );
  const catByKey = new Map();
  for (const row of catQ.rows || []) {
    const p = (row.planta || "").toString().trim();
    const c = (row.cliente || "").toString().trim();
    if (!p || !c) continue;
    const key = `${p}|${c}`;
    if (!catByKey.has(key)) {
      catByKey.set(key, {
        categoria: (row.categoria || "").toString().trim(),
        subcategoria: (row.subcategoria || "").toString().trim(),
      });
    }
  }

  const ty = forecastOpts.targetYear != null ? Number(forecastOpts.targetYear) : year;
  const tm = forecastOpts.targetMonth != null ? Number(forecastOpts.targetMonth) : month;
  let fechaHastaNote = (forecastOpts.fechaHasta || "").toString().trim().slice(0, 10);
  if (!fechaHastaNote) {
    const today = new Date();
    const endOfTarget = new Date(year, month - 1, lastDay);
    const y = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    y.setDate(y.getDate() - 1);
    const cut = y < endOfTarget ? y : endOfTarget;
    fechaHastaNote = `${cut.getFullYear()}-${String(cut.getMonth() + 1).padStart(2, "0")}-${String(cut.getDate()).padStart(2, "0")}`;
  }
  const forecastKgByPlant = await fetchForecastKgByPlantMap(client, ty, tm, forecastOpts.forecastKgByPlant);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
  const prevFirst = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const prevLastStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(prevLastDay).padStart(2, "0")}`;
  const prevParams = [prevFirst, prevLastStr];
  if (plantFilter) prevParams.push(plantFilter);
  const prevQ = await client.query(
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
    )
    SELECT planta, cliente, COALESCE(kg, 0) AS kg FROM ventas
    `,
    prevParams
  );
  const prevKgByKey = new Map();
  for (const row of prevQ.rows || []) {
    const p = (row.planta || "").toString().trim();
    const c = (row.cliente || "").toString().trim();
    if (p && c) prevKgByKey.set(`${p}|${c}`, Number(row.kg || 0));
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

  const rows = (q.rows || [])
    .map((r) => {
      const kg = Number(r.kg || 0);
      const monto = Number(r.monto || 0);
      const descKg = kg > 0 ? Math.abs(monto) / kg : null;
      const planta = (r.planta || "").toString().trim();
      const cliente = (r.cliente || "").toString().trim();
      const key = `${planta}|${cliente}`;
      const cat = catByKey.get(key) || { categoria: "", subcategoria: "" };
      const prevKg = prevKgByKey.get(key) || 0;
      return {
        planta,
        cliente,
        categoria: cat.categoria,
        subcategoria: cat.subcategoria,
        kg,
        monto,
        descKg,
        prevKg,
        factor: 0,
        kgProy: 0,
        estatus: "",
      };
    })
    .filter((r) => r.planta && r.cliente);

  const byPlant = new Map();
  for (const r of rows) {
    if (!byPlant.has(r.planta)) byPlant.set(r.planta, []);
    byPlant.get(r.planta).push(r);
  }
  for (const [plantaKey, list] of byPlant) {
    const targetKg = resolveTargetKgForPlantaLabel(plantaKey, forecastKgByPlant);
    const sumReal = list.reduce((s, rr) => s + (Number(rr.kg) || 0), 0);
    const factor = sumReal > 0 && targetKg > 0 ? targetKg / sumReal : 0;
    for (const rr of list) {
      rr.factor = factor;
      rr.kgProy = Math.round((Number(rr.kg) || 0) * factor * 100) / 100;
    }
    const sumP = list.reduce((s, rr) => s + (Number(rr.kgProy) || 0), 0);
    const diff = Math.round((targetKg - sumP) * 100) / 100;
    if (Math.abs(diff) >= 0.01 && list.length && sumReal > 0) {
      let idx = 0;
      let maxK = -1;
      for (let i = 0; i < list.length; i++) {
        const k = Number(list[i].kgProy) || 0;
        if (k > maxK) {
          maxK = k;
          idx = i;
        }
      }
      const kgOld = Number(list[idx].kgProy) || 0;
      list[idx].kgProy = Math.max(0, Math.round((kgOld + diff) * 100) / 100);
    }
  }

  for (const r of rows) {
    const cur = Number(r.kg) || 0;
    const prev = Number(r.prevKg) || 0;
    if (cur <= 0 && prev > 0) r.estatus = "Dejó de comprar";
    else if (cur > 0 && prev <= 0) r.estatus = "Nuevo";
    else if (cur > 0 && prev > 0) {
      if (cur < prev) r.estatus = "Disminuyó";
      else if (cur > prev) r.estatus = "Aumentó";
      else r.estatus = "Sin cambio";
    } else {
      r.estatus = "";
    }
  }

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
  aoa.push([
    `Kg mes (proyectado) = kg real × factor por planta. Factor = total forecast mensual (objetivo, mismo que Proy cat-sub Forecast para ${ty}-${String(tm).padStart(2, "0")}) / Σ kg real clientes de esa planta. Referencia corte: ${fechaHastaNote}.`,
  ]);
  aoa.push([
    "Estatus vs mes anterior: Nuevo, Dejó de comprar, Aumentó, Disminuyó, Sin cambio (comparación de kg del mes calendario).",
  ]);
  aoa.push([]);
  aoa.push([
    "Planta",
    "Cliente",
    "Categoría",
    "Subcategoría",
    "Kg mes (real)",
    "Kg mes (proyectado)",
    "Descuento MXN mes",
    "Descuento $/kg mes",
    "Estatus",
  ]);

  for (const r of rows) {
    aoa.push([
      r.planta,
      r.cliente,
      r.categoria,
      r.subcategoria,
      Math.round(r.kg * 100) / 100,
      Math.round(Number(r.kgProy || 0) * 100) / 100,
      Math.round(r.monto * 100) / 100,
      r.descKg != null ? Math.round(r.descKg * 1e6) / 1e6 : "",
      r.estatus || "",
    ]);
  }

  if (rows.length === 0) {
    aoa.push(["(sin datos)", "", "", "", 0, 0, 0, "", ""]);
  }

  const ws = wb.addWorksheet("Clientes desc mes", {
    views: [{ state: "frozen", ySplit: 6, showGridLines: true }],
  });
  excelTheme.writeAoa(ws, aoa);
  excelTheme.applyTitleStyle(ws, 1, 0, 8);
  excelTheme.applyTitleStyle(ws, 2, 0, 8);
  excelTheme.applyTitleStyle(ws, 3, 0, 8);
  excelTheme.applyTitleStyle(ws, 4, 0, 8);
  excelTheme.applyHeaderRow(ws, 6, 0, 8);
  const lastR = aoa.length - 1;
  excelTheme.applyBordersRange(ws, 5, 0, lastR, 8);
  excelTheme.setColumnWidths(ws, [22, 36, 16, 18, 14, 18, 18, 16, 22]);
  for (let r0 = 6; r0 <= lastR; r0++) {
    const kgReal = ws.getCell(r0 + 1, 5).value;
    const kgProy = ws.getCell(r0 + 1, 6).value;
    const mxn = ws.getCell(r0 + 1, 7).value;
    const dk = ws.getCell(r0 + 1, 8).value;
    if (typeof kgReal === "number") ws.getCell(r0 + 1, 5).numFmt = excelTheme.FMT_NUMBER;
    if (typeof kgProy === "number") ws.getCell(r0 + 1, 6).numFmt = excelTheme.FMT_NUMBER;
    if (typeof mxn === "number") ws.getCell(r0 + 1, 7).numFmt = excelTheme.FMT_CURRENCY_MXN;
    if (typeof dk === "number") ws.getCell(r0 + 1, 8).numFmt = excelTheme.FMT_NUMBER;
  }
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

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 5, showGridLines: true }],
  });
  excelTheme.writeAoa(ws, data);
  const maxC = Math.max(0, ...data.map((row) => (row ? row.length : 0))) - 1;
  for (let r = 1; r <= Math.min(3, data.length); r++) {
    excelTheme.applyTitleStyle(ws, r, 0, Math.max(maxC, 0));
  }
  const plantaHeaderIdx = data.findIndex((row) => row && row[0] === "Planta");
  const headerRow1Based = plantaHeaderIdx >= 0 ? plantaHeaderIdx + 1 : Math.min(5, data.length);
  if (plantaHeaderIdx >= 0 && maxC >= 0) {
    excelTheme.applyHeaderRow(ws, headerRow1Based, 0, maxC);
    excelTheme.applyBordersRange(ws, plantaHeaderIdx, 0, data.length - 1, maxC);
  }
  const widths = new Array(Math.max(maxC + 1, 1)).fill(14);
  widths[0] = 20;
  excelTheme.setColumnWidths(ws, widths);
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
/**
 * @param {Date | null} corteDtForPending - Si está en el mes objetivo: marca en pendingMaskRows los días del mes estrictamente posteriores al corte (faltan por transcurrir).
 */
function buildSemanaDowTableRows(year, month, byDateValue, isSum, corteDtForPending = null, selPlant = null) {
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
  const pendingMonthMaskRows = []; // null o bool[7]: true = día del mes aún no ocurrido (post corte)
  const cellBgRows = []; // 'hist' | 'lookback' | 'pending' | '' por celda DOW
  const promHighlightRows = []; // true si el día entra en el PROM (lookback + dato + no desmarcado)
  rows.push(["Semana (año)", ...DOW_HEADERS_EXCEL, "Total semana"]);
  lookbackMaskRows.push(null);
  pendingMonthMaskRows.push(null);
  cellBgRows.push(null);
  promHighlightRows.push(null);

  const corteNorm =
    corteDtForPending &&
    corteDtForPending.getFullYear() === year &&
    corteDtForPending.getMonth() + 1 === month
      ? new Date(corteDtForPending.getFullYear(), corteDtForPending.getMonth(), corteDtForPending.getDate())
      : null;

  for (let wkMon = startWeekMon, guard = 0; guard < 80 && wkMon <= endWeekSun; guard++, wkMon = addDays(wkMon, 7)) {
    const wkSun = addDays(wkMon, 6);
    const weekNo = isoWeekNumber(wkMon);
    const cells = ["", "", "", "", "", "", ""];
    const lbMask = [false, false, false, false, false, false, false];
    const pendingMask = [false, false, false, false, false, false, false];
    const cellBg = ["", "", "", "", "", "", ""];
    const promH = [false, false, false, false, false, false, false];
    if (corteNorm) {
      for (let i = 0; i < 7; i++) {
        const d = addDays(wkMon, i);
        const inMonth = d.getFullYear() === year && d.getMonth() + 1 === month;
        if (!inMonth) continue;
        const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        // Incluye el día de corte: “en curso”, se proyecta igual que el resto del mes (azul).
        if (d0 >= corteNorm) pendingMask[isoDow(d) - 1] = true;
      }
    }
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
      const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (corteNorm && inMonth && d0 >= corteNorm) {
        cellBg[col] = "pending";
      } else if (t != null) {
        if (!inMonth && inLookback) cellBg[col] = "lookback";
        else if (inMonth) cellBg[col] = "hist";
      }
      if (inLookback && t != null && Number.isFinite(t)) {
        const inc = !selPlant || !selPlant.has(fecha) || selPlant.get(fecha) !== false;
        if (inc) promH[col] = true;
      }
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
    pendingMonthMaskRows.push(pendingMask);
    cellBgRows.push(cellBg);
    promHighlightRows.push(promH);
  }

  return { rows, height: rows.length, lookbackMaskRows, pendingMonthMaskRows, cellBgRows, promHighlightRows };
}

/**
 * Hoja: por cada planta (provincia), tabla semana×DOW de venta (ton) y,
 * desde columna K, la misma tabla pero de descuento ($/kg) diario.
 */
async function appendHojaAcapulcoSemanaDow(client, wb, year, month, opts = {}) {
  const fechaCorte = (opts && opts.fechaCorte ? String(opts.fechaCorte).trim().slice(0, 10) : "") || "";
  /** Fila Excel 1-based fila "PROY" venta (col I) y fila "PROY" desc $/kg — pueden diferir 1 fila (desc tiene un resumen más). */
  const plantToProyVentaExcelRow = new Map();
  const plantToProyDescExcelRow = new Map();
  const ventaTonGrid = await getVentaToneladasGrid(client, year, month, fechaCorte);
  const descuentoGrid = await getDescuentoPorKiloGrid(client, year, month, fechaCorte);
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

  // Lookback visual + PROM: 28 días hasta el corte (4 semanas). Con 14 días solo hay 2 slots por DOW;
  // si el día de corte está vacío (día en curso), a menudo queda 1 solo dato y el promedio no es representativo.
  // Con 28 días hay hasta 4 ocurrencias por DOW y suele entrar la semana previa al mes (ej. vie previo al 1.er viernes del mes).
  // Días fuera del mes se pintan amarillo y NO entran en TOTAL mes.
  const isCorteEnMes = corteDtInput && corteDtInput.getFullYear() === year && (corteDtInput.getMonth() + 1) === month;
  const enableLookback = Boolean(isCorteEnMes);
  let lookbackStartYmd = null;
  let lookbackEndYmd = null;
  if (enableLookback) {
    const end = new Date(corteDt.getFullYear(), corteDt.getMonth(), corteDt.getDate());
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    start.setDate(start.getDate() - 27);
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
        const rawP = (row.plant_code || "").toString().trim();
        const p = resolveCanonicalPlantCode(rawP, plants) || rawP;
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
        const rawP = (row.plant_code || "").toString().trim();
        const p = resolveCanonicalPlantCode(rawP, plants) || rawP;
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
  let pronosticoProyDescKgCol0 = COLK + 9;
  let pronosticoDescColComputed = false;
  const styleBlocks = [];
  let curRow = 0;

  const pad2 = (n) => String(n).padStart(2, "0");
  const fmtYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const isoDow = (d) => (d.getDay() === 0 ? 7 : d.getDay()); // 1..7
  const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);

  /**
   * Ocurrencias de cada DOW desde la fecha de corte hasta fin de mes.
   * Con corte en el mes: incluye el día de corte (día “en curso” → cuenta para POR COMPRAR).
   * Sin corte en mes (corte = fin de mes): mismo comportamiento que antes (ningún día restante).
   */
  const countRemainingDowInMonth = (dow1to7) => {
    let c = 0;
    const startDay = isCorteEnMes ? corteDt.getDate() : corteDt.getDate() + 1;
    for (let day = startDay; day <= lastDay; day++) {
      const d = new Date(year, month - 1, day);
      if (isoDow(d) === dow1to7) c += 1;
    }
    return c;
  };

  const remainingByDow = [];
  for (let dow = 1; dow <= 7; dow++) remainingByDow.push(countRemainingDowInMonth(dow));

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
    const corteForPending = isCorteEnMes ? corteDt : null;
    const ventaWeeks = buildSemanaDowTableRows(year, month, ventaMap, true, corteForPending);

    // TOTAL mes (por día de semana): suma de días del mes actual hasta corte
    const totalMesVenta = [0, 0, 0, 0, 0, 0, 0];
    for (let day = 1; day <= corteDt.getDate(); day++) {
      const d = new Date(year, month - 1, day);
      const key = fmtYmd(d);
      const v = ventaMap.get(key);
      if (v != null && Number.isFinite(Number(v))) totalMesVenta[isoDow(d) - 1] += Number(v);
    }
    for (let i = 0; i < 7; i++) totalMesVenta[i] = Math.round(totalMesVenta[i] * 100) / 100;

    // PROM mes (por día de semana): promedio de valores en la ventana lookback (28 días hasta corte; puede incluir mes anterior)
    const promMesVenta = ["", "", "", "", "", "", ""];
    if (enableLookback && lookbackStartYmd && lookbackEndYmd) {
      const startDt = parseYmdToDate(lookbackStartYmd);
      const endDt = parseYmdToDate(lookbackEndYmd);
      const valsByDow = [[], [], [], [], [], [], []];
      const promDayCount =
        startDt && endDt
          ? Math.min(120, Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / 86400000) + 1))
          : 0;
      for (let i = 0; i < promDayCount; i++) {
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
    const ventaPendingMask = [];
    for (let i = 0; i < ventaWeeks.rows.length; i++) {
      ventaRows.push(ventaWeeks.rows[i]);
      ventaMask.push(ventaWeeks.lookbackMaskRows[i] || null);
      ventaPendingMask.push(ventaWeeks.pendingMonthMaskRows[i] || null);
    }
    ventaRows.push(["PROM mes (por día de semana)", ...promMesVenta, sum(promMesVenta.filter((x) => x !== ""))]);
    ventaMask.push(null);
    ventaPendingMask.push(null);
    ventaRows.push(["TOTAL mes (por día de semana)", ...totalMesVenta, sum(totalMesVenta)]);
    ventaMask.push(null);
    ventaPendingMask.push(null);
    // Alinear con desc (fila "PROM" en $): fila vacía en toneladas.
    ventaRows.push(["", "", "", "", "", "", "", "", ""]);
    ventaMask.push(null);
    ventaPendingMask.push(null);
    ventaRows.push(["POR COMPRAR", ...porComprarVenta, sum(porComprarVenta.filter((x) => x !== ""))]);
    ventaMask.push(null);
    ventaPendingMask.push(null);
    ventaRows.push(["PROY", ...proyVenta, sum(proyVenta)]);
    ventaMask.push(null);
    ventaPendingMask.push(null);

    // === Bloque DESCUENTO ($/kg) + cálculos en dinero ===
    const descWeeks = buildSemanaDowTableRows(year, month, descMap, false, corteForPending);

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
      const promDayCountDesc =
        startDt && endDt
          ? Math.min(120, Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / 86400000) + 1))
          : 0;
      for (let i = 0; i < promDayCountDesc; i++) {
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
    const descPendingMask = [];
    for (let i = 0; i < descWeeks.rows.length; i++) {
      descRows.push(descWeeks.rows[i]);
      descMask.push(descWeeks.lookbackMaskRows[i] || null);
      descPendingMask.push(descWeeks.pendingMonthMaskRows[i] || null);
    }
    // PROM mes (ratio) igual al formato (no entra en Desc/kg)
    descRows.push(["PROM mes (por día de semana)", ...promMesDescRatio, meanNonEmpty(promMesDescRatio.filter((x) => x !== "")) || ""]);
    descMask.push(null);
    descPendingMask.push(null);
    // TOTAL mes / PROM / POR COMPRAR / PROY en dinero (con $)
    descRows.push(["TOTAL mes (por día de semana)", ...totalMesDescMxn, sum(totalMesDescMxn)]);
    descMask.push(null);
    descPendingMask.push(null);
    descRows.push(["PROM", ...promDescMxn, sum(promDescMxn.filter((x) => x !== ""))]);
    descMask.push(null);
    descPendingMask.push(null);
    descRows.push(["POR COMPRAR", ...porComprarDescMxn, sum(porComprarDescMxn.filter((x) => x !== ""))]);
    descMask.push(null);
    descPendingMask.push(null);
    descRows.push(["PROY", ...proyDescMxn, sum(proyDescMxn)]);
    descMask.push(null);
    descPendingMask.push(null);

    // Agregar columna Desc/kg para descuento (solo en filas de dinero)
    const addDescKgCol = (rowLabel, numByDow, denByDow) => {
      const num = sum(numByDow);
      const den = sum(denByDow);
      const ratio = den > 0 ? Math.round((num / den) * 100) / 100 : "";
      for (let i = 0; i < descRows.length; i++) {
        if (descRows[i] && descRows[i][0] === rowLabel) {
          const row = descRows[i];
          // Ya existe celda placeholder ("") en índice 9 → reemplazar, no push (evita columna U en vez de T).
          if (row.length === 10 && row[9] === "") {
            row[9] = ratio;
          } else if (row.length === 9) {
            row.push(ratio);
          } else {
            row.push(ratio);
          }
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

    const ventaProyExcel1Based = tableStartRow + ventaRows.length;
    const descProyExcel1Based = tableStartRow + descRows.length;
    registerPronosticoProyRows(plantToProyVentaExcelRow, String(p).trim(), ventaProyExcel1Based);
    registerPronosticoProyRows(plantToProyDescExcelRow, String(p).trim(), descProyExcel1Based);

    if (!pronosticoDescColComputed) {
      const proyDescLine = descRows[descRows.length - 1];
      if (Array.isArray(proyDescLine) && proyDescLine.length > 0) {
        pronosticoProyDescKgCol0 = COLK + proyDescLine.length - 1;
      }
      pronosticoDescColComputed = true;
    }

    aoa.push([]);
    curRow++;

    const Wweek = ventaWeeks.rows.length;
    styleBlocks.push({
      header1Row,
      tableStartRow,
      height,
      ventaMask,
      descMask,
      ventaPendingMask,
      descPendingMask,
      colOffsetRight: COLK,
      descColCount: descRows[0] ? descRows[0].length : 9,
      summaryRows: {
        firstWeekExcelRow: tableStartRow + 2,
        lastWeekExcelRow: tableStartRow + Wweek,
        promRowExcel: tableStartRow + Wweek + 1,
        totalRowExcel: tableStartRow + Wweek + 2,
        promDescMxnRowExcel: tableStartRow + Wweek + 3,
        porRowExcel: tableStartRow + Wweek + 4,
        proyRowExcel: tableStartRow + Wweek + 5,
      },
    });
  }

  const ws = wb.addWorksheet(SHEET_PRONOSTICO, {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });
  excelTheme.writeAoa(ws, aoa);
  excelTheme.applyPronosticoPlantBlocks(ws, aoa, styleBlocks, COLK);
  excelTheme.applyPronosticoSummaryFormulas(ws, styleBlocks, COLK, remainingByDow);
  return {
    plantToProyVentaExcelRow,
    plantToProyDescExcelRow,
    pronosticoProyVentaCol0: 8,
    pronosticoProyDescKgCol0,
  };
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
  const ws = wb.addWorksheet("Provincia Venta Diaria", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });
  excelTheme.writeAoa(ws, data);
  excelTheme.applyHeaderRow(ws, 1, 0, headers.length - 1);
  for (let i = 0; i < byDate.length; i++) {
    const day = byDate[i].day;
    const isReal = day < cutoffDay;
    const fill = isReal ? excelTheme.FILL_BAND_REAL : excelTheme.FILL_BAND_PROY;
    for (let j = 0; j < headers.length; j++) {
      const cell = ws.getCell(i + 2, j + 1);
      cell.fill = fill;
      if (j >= 1 && typeof cell.value === "number") cell.numFmt = excelTheme.FMT_NUMBER;
    }
  }
  const lastDataR0 = data.length - 1;
  excelTheme.applyBordersRange(ws, 0, 0, lastDataR0, headers.length - 1);
  excelTheme.setColumnWidths(ws, [14, ...plants.map(() => 12), 16]);
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
  const ws = wb.addWorksheet("Provincia Comisiones", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });
  excelTheme.writeAoa(ws, data);
  excelTheme.applyHeaderRow(ws, 1, 0, headers.length - 1);
  for (let i = 0; i < byDate.length; i++) {
    const day = byDate[i].day;
    const isReal = day < cutoffDay;
    const fill = isReal ? excelTheme.FILL_BAND_REAL : excelTheme.FILL_BAND_PROY;
    for (let j = 0; j < headers.length; j++) {
      const cell = ws.getCell(i + 2, j + 1);
      cell.fill = fill;
      if (j >= 1 && typeof cell.value === "number") cell.numFmt = excelTheme.FMT_NUMBER;
    }
  }
  const lastR0 = data.length - 1;
  excelTheme.applyBordersRange(ws, 0, 0, lastR0, headers.length - 1);
  excelTheme.setColumnWidths(ws, [14, ...plants.map(() => 12)]);
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
  const ws = wb.addWorksheet("IGF Ejecutivo", {
    views: [{ state: "frozen", ySplit: 4, showGridLines: true }],
  });
  excelTheme.writeAoa(ws, data);
  const ncols = Math.max(0, ...data.map((row) => (row ? row.length : 0)));
  if (ncols > 0) {
    excelTheme.applyTitleStyle(ws, 1, 0, Math.min(ncols - 1, 5));
    excelTheme.applyBordersRange(ws, 3, 0, data.length - 1, ncols - 1);
    excelTheme.setColumnWidths(ws, Array.from({ length: ncols }, (_, i) => (i === 0 ? 20 : 11)));
  }
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

/** Texto legible de celda (incl. resultado de fórmula). */
function getWorksheetCellText(ws, excelRow, col) {
  const cell = ws.getCell(excelRow, col);
  const v = cell.value;
  if (v == null || v === "") return "";
  if (typeof v === "object" && v.formula != null && v.result !== undefined && v.result !== null) {
    return String(v.result).trim();
  }
  if (typeof v === "object" && v.richText && Array.isArray(v.richText)) {
    return v.richText.map((x) => x.text || "").join("").trim();
  }
  return String(v).trim();
}

function copyWorksheetRowScalars(wsSrc, excelSrcRow, wsDst, excelDstRow, colCount) {
  for (let c = 1; c <= colCount; c++) {
    const src = wsSrc.getCell(excelSrcRow, c);
    const dst = wsDst.getCell(excelDstRow, c);
    const v = src.value;
    if (v && typeof v === "object" && v.formula != null) {
      dst.value = v.result !== undefined && v.result !== null ? v.result : null;
    } else {
      dst.value = v;
    }
    if (src.numFmt) dst.numFmt = src.numFmt;
  }
}

function findIgfMiniResumenHeaderRow(ws) {
  const maxR = 250;
  for (let r = 1; r <= maxR; r++) {
    const a = getWorksheetCellText(ws, r, 1);
    const b = getWorksheetCellText(ws, r, 2);
    const l = getWorksheetCellText(ws, r, 12);
    if (a === "Empresa" && b === "Venta" && l.indexOf("Resultado") >= 0) return r;
  }
  return null;
}

function findGtPueblaMiniDataRow(ws, miniHeaderRow) {
  for (let i = 1; i <= 8; i++) {
    const er = miniHeaderRow + i;
    const a = getWorksheetCellText(ws, er, 1);
    if (!a) continue;
    if (scorePlantMatch(normEmpresaKey("GT Puebla"), normEmpresaKey(a)) >= 500) return er;
  }
  return miniHeaderRow + 1;
}

function plantLabelMatchesPueblaExport(label) {
  const g = normEmpresaKey(String(label || "").trim());
  if (!g) return false;
  const p = normEmpresaKey("Puebla");
  const gt = normEmpresaKey("GT Puebla");
  if (g === p || g === gt) return true;
  return scorePlantMatch(p, g) >= 4000 || scorePlantMatch(gt, g) >= 4000;
}

function findHeaderRowColA(ws, wantA, maxR = 80) {
  const lim = Math.min(ws.actualRowCount || ws.rowCount || maxR, maxR);
  for (let r = 1; r <= lim; r++) {
    if (getWorksheetCellText(ws, r, 1) === wantA) return r;
  }
  return null;
}

function countNonEmptyCols(ws, excelRow, maxCol = 20) {
  let n = 0;
  for (let c = 1; c <= maxCol; c++) {
    const v = ws.getCell(excelRow, c).value;
    if (v != null && String(v).trim() !== "") n = c;
  }
  return Math.max(n, 1);
}

/**
 * Hoja consolidada "Puebla": (1) mini-resumen IGF GT Puebla, (2) filas Proy cat-sub Forecast, (3) filas Clientes desc mes.
 * Copia valores calculados (las fórmulas del mini IGF se convierten en resultado para esta hoja).
 */
function appendHojaPueblaConsolidada(wb) {
  const name = "Puebla";
  const prevPuebla = wb.getWorksheet(name);
  if (prevPuebla) wb.removeWorksheet(prevPuebla.id);

  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  let excelRow = 1;
  const titleFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7EEF7" } };

  const writeSectionTitle = (text) => {
    const cell = ws.getCell(excelRow, 1);
    cell.value = text;
    cell.font = { bold: true, size: 12, color: { argb: "FF1F2937" } };
    cell.fill = titleFill;
    excelRow += 1;
  };

  // —— 1) IGF Forecast: encabezado mini-resumen + fila GT Puebla ——
  writeSectionTitle("1. IGF Forecast — mini resumen (GT Puebla)");
  const igf = wb.getWorksheet("IGF Forecast");
  const miniHdr = igf ? findIgfMiniResumenHeaderRow(igf) : null;
  if (miniHdr != null) {
    const dataR = findGtPueblaMiniDataRow(igf, miniHdr);
    const nCols = 12;
    copyWorksheetRowScalars(igf, miniHdr, ws, excelRow, nCols);
    excelRow += 1;
    copyWorksheetRowScalars(igf, dataR, ws, excelRow, nCols);
    excelRow += 1;
    try {
      excelTheme.applyHeaderRow(ws, excelRow - 2, 0, nCols - 1);
      excelTheme.applyBordersRangeBlack(ws, excelRow - 2 - 1, 0, excelRow - 1 - 1, nCols - 1);
    } catch {
      /* ignore */
    }
  } else {
    ws.getCell(excelRow, 1).value =
      "(No disponible: el mini-resumen IGF solo se genera con plantilla Compromiso 18 columnas, o la hoja IGF Forecast no existe.)";
    excelRow += 1;
  }

  excelRow += 1;

  // —— 2) Proy cat-sub Forecast — Puebla ——
  writeSectionTitle("2. Proy cat-sub Forecast — planta Puebla");
  const proy = wb.getWorksheet("Proy cat-sub Forecast");
  if (!proy) {
    ws.getCell(excelRow, 1).value = "(Hoja «Proy cat-sub Forecast» no incluida en esta exportación.)";
    excelRow += 1;
  } else {
    const hdrR = findHeaderRowColA(proy, "Planta", 40);
    if (hdrR == null) {
      ws.getCell(excelRow, 1).value = "(No se encontró la tabla en Proy cat-sub Forecast.)";
      excelRow += 1;
    } else {
      const nCol = countNonEmptyCols(proy, hdrR, 14);
      const rowsOut = [hdrR];
      const maxData = hdrR + 2000;
      for (let r = hdrR + 1; r <= maxData; r++) {
        const a = getWorksheetCellText(proy, r, 1);
        if (!a) continue;
        if (plantLabelMatchesPueblaExport(a)) rowsOut.push(r);
      }
      if (rowsOut.length <= 1) {
        ws.getCell(excelRow, 1).value = "(Sin filas con planta Puebla en Proy cat-sub Forecast.)";
        excelRow += 1;
      } else {
        const startOut = excelRow;
        for (const sr of rowsOut) {
          copyWorksheetRowScalars(proy, sr, ws, excelRow, nCol);
          excelRow += 1;
        }
        try {
          excelTheme.applyHeaderRow(ws, startOut, 0, nCol - 1);
          excelTheme.applyBordersRangeBlack(ws, startOut - 1, 0, excelRow - 1 - 1, nCol - 1);
        } catch {
          /* ignore */
        }
      }
    }
  }

  excelRow += 1;

  // —— 3) Clientes desc mes — Puebla ——
  writeSectionTitle("3. Clientes desc mes — planta Puebla");
  const cli = wb.getWorksheet("Clientes desc mes");
  if (!cli) {
    ws.getCell(excelRow, 1).value = "(Hoja «Clientes desc mes» no encontrada.)";
    excelRow += 1;
  } else {
    const hdrR = (() => {
      const lim = 30;
      for (let r = 1; r <= lim; r++) {
        const a = getWorksheetCellText(cli, r, 1);
        const b = getWorksheetCellText(cli, r, 2);
        if (a === "Planta" && b === "Cliente") return r;
      }
      return null;
    })();
    if (hdrR == null) {
      ws.getCell(excelRow, 1).value = "(No se encontró el encabezado en Clientes desc mes.)";
      excelRow += 1;
    } else {
      const nCol = countNonEmptyCols(cli, hdrR, 12);
      const rowsOut = [hdrR];
      const maxData = hdrR + 25000;
      for (let r = hdrR + 1; r <= maxData; r++) {
        const a = getWorksheetCellText(cli, r, 1);
        if (!a) continue;
        if (plantLabelMatchesPueblaExport(a)) rowsOut.push(r);
      }
      if (rowsOut.length <= 1) {
        ws.getCell(excelRow, 1).value = "(Sin filas con planta Puebla en Clientes desc mes.)";
        excelRow += 1;
      } else {
        const startOut = excelRow;
        for (const sr of rowsOut) {
          copyWorksheetRowScalars(cli, sr, ws, excelRow, nCol);
          excelRow += 1;
        }
        try {
          excelTheme.applyHeaderRow(ws, startOut, 0, nCol - 1);
          excelTheme.applyBordersRangeBlack(ws, startOut - 1, 0, excelRow - 1 - 1, nCol - 1);
        } catch {
          /* ignore */
        }
      }
    }
  }

  excelTheme.setColumnWidths(
    ws,
    [22, 36, 16, 18, 14, 16, 16, 16, 16, 18, 14, 14].concat(Array.from({ length: 8 }, () => 12))
  );
}

/**
 * Mapa plant_code → (fecha YYYY-MM-DD → incluir en promedio PROM). Si no hay fila en BD, se asume true.
 */
async function loadPronosticoDiasSeleccionMap(client, year, month, corteDayYmd) {
  const m = new Map();
  try {
    const r = await client.query(
      `SELECT plant_code, fecha, selected
         FROM arr.pronostico_dias_seleccion
        WHERE year = $1::int AND month = $2::int AND corte_day = $3::date`,
      [year, month, corteDayYmd]
    );
    for (const row of r.rows || []) {
      const p = String(row.plant_code || "").trim();
      const fecha =
        row.fecha && (typeof row.fecha === "string" ? row.fecha.slice(0, 10) : row.fecha.toISOString?.().slice(0, 10));
      if (!p || !fecha) continue;
      if (!m.has(p)) m.set(p, new Map());
      m.get(p).set(fecha, row.selected !== false);
    }
  } catch {
    /* tabla puede no existir aún */
  }
  return m;
}

/**
 * Misma construcción de mapas que Pronostico / Excel (venta ton y desc $/kg por día).
 */
async function buildPronosticoVentaDescMaps(client, year, month, fechaCorte) {
  const corteStr = String(fechaCorte || "").trim().slice(0, 10);
  const ventaTonGrid = await getVentaToneladasGrid(client, year, month, /^\d{4}-\d{2}-\d{2}$/.test(corteStr) ? corteStr : "");
  const descuentoGrid = await getDescuentoPorKiloGrid(client, year, month, /^\d{4}-\d{2}-\d{2}$/.test(corteStr) ? corteStr : "");
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

  const lastDay = new Date(year, month, 0).getDate();
  const lastDt = new Date(year, month - 1, lastDay);
  const corteDtInput = parseYmdToDate(fechaCorte);
  const corteDt =
    corteDtInput && corteDtInput.getFullYear() === year && corteDtInput.getMonth() + 1 === month
      ? new Date(corteDtInput.getFullYear(), corteDtInput.getMonth(), corteDtInput.getDate())
      : lastDt;
  const isCorteEnMes = Boolean(corteDtInput && corteDtInput.getFullYear() === year && corteDtInput.getMonth() + 1 === month);
  const enableLookback = Boolean(isCorteEnMes);

  const pad2 = (n) => String(n).padStart(2, "0");
  const fmtYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const isoDow = (d) => (d.getDay() === 0 ? 7 : d.getDay());
  const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
  const corteYmdStr = fmtYmd(corteDt);

  let lookbackStartYmd = null;
  let lookbackEndYmd = null;
  if (enableLookback) {
    const end = new Date(corteDt.getFullYear(), corteDt.getMonth(), corteDt.getDate());
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    start.setDate(start.getDate() - 27);
    lookbackStartYmd = fmtYmd(start);
    lookbackEndYmd = fmtYmd(end);

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
        const rawP = (row.plant_code || "").toString().trim();
        const p = resolveCanonicalPlantCode(rawP, plants) || rawP;
        if (!p || !ventaMapByPlant.has(p)) continue;
        const v = Number(row.venta_ton);
        if (Number.isFinite(v)) ventaMapByPlant.get(p).set(fecha, v);
      }
    } catch {
      /* best-effort */
    }
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
        const rawP = (row.plant_code || "").toString().trim();
        const p = resolveCanonicalPlantCode(rawP, plants) || rawP;
        if (!p || !descMapByPlant.has(p)) continue;
        const v = Number(row.descuento_por_kg);
        if (Number.isFinite(v)) descMapByPlant.get(p).set(fecha, v);
      }
    } catch {
      /* best-effort */
    }
  }

  return {
    plants,
    ventaMapByPlant,
    descMapByPlant,
    lastDay,
    corteDt,
    corteDtInput,
    isCorteEnMes,
    enableLookback,
    lookbackStartYmd,
    lookbackEndYmd,
    corteYmdStr,
    fmtYmd,
    isoDow,
    sum,
    pad2,
  };
}

/** Misma fecha de corte que `buildPronosticoVentaDescMaps` / snapshot (sin armar grids). */
function getPronosticoCorteYmdStr(year, month, fechaCorte) {
  const lastDay = new Date(year, month, 0).getDate();
  const lastDt = new Date(year, month - 1, lastDay);
  const corteDtInput = parseYmdToDate(fechaCorte);
  const corteDt =
    corteDtInput && corteDtInput.getFullYear() === year && corteDtInput.getMonth() + 1 === month
      ? new Date(corteDtInput.getFullYear(), corteDtInput.getMonth(), corteDtInput.getDate())
      : lastDt;
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${corteDt.getFullYear()}-${pad2(corteDt.getMonth() + 1)}-${pad2(corteDt.getDate())}`;
}

async function savePronosticoMiniSnapshot(client, year, month, corteDayYmd, proyByPlant) {
  if (!proyByPlant || typeof proyByPlant.forEach !== "function") return;
  for (const [plant_code, v] of proyByPlant) {
    const pv = v && Number.isFinite(Number(v.proy_venta_ton)) ? Number(v.proy_venta_ton) : null;
    if (pv == null) continue;
    const dk = v && v.proy_desc_kg != null && Number.isFinite(Number(v.proy_desc_kg)) ? Number(v.proy_desc_kg) : null;
    await client.query(
      `INSERT INTO arr.pronostico_mini_snapshot (year, month, corte_day, plant_code, proy_venta_ton, proy_desc_kg, updated_at)
       VALUES ($1::int, $2::int, $3::date, $4, $5, $6, now())
       ON CONFLICT (year, month, corte_day, plant_code)
       DO UPDATE SET proy_venta_ton = EXCLUDED.proy_venta_ton, proy_desc_kg = EXCLUDED.proy_desc_kg, updated_at = now()`,
      [year, month, corteDayYmd, String(plant_code).trim(), pv, dk]
    );
  }
}

async function loadPronosticoMiniSnapshot(client, year, month, corteDayYmd) {
  const m = new Map();
  try {
    const r = await client.query(
      `SELECT plant_code, proy_venta_ton, proy_desc_kg
         FROM arr.pronostico_mini_snapshot
        WHERE year = $1::int AND month = $2::int AND corte_day = $3::date`,
      [year, month, corteDayYmd]
    );
    for (const row of r.rows || []) {
      const p = String(row.plant_code || "").trim();
      m.set(p, {
        proy_venta_ton: Number(row.proy_venta_ton),
        proy_desc_kg: row.proy_desc_kg != null ? Number(row.proy_desc_kg) : 0,
      });
    }
  } catch {
    /* */
  }
  return m;
}

/**
 * Tabla venta (ton) como en hoja Pronostico: semanas × DOW + PROM / TOTAL / POR COMPRAR / PROY.
 * respeta arr.pronostico_dias_seleccion en el PROM (como computePronosticoProyByPlant).
 */
function buildVentaPronosticoSheetLike(year, month, ctx, plantKey, selPlant) {
  const ventaMap = ctx.ventaMapByPlant.get(plantKey) || new Map();
  const vm = new Map(ventaMap);
  if (ctx.enableLookback && ctx.lookbackStartYmd && ctx.lookbackEndYmd) {
    vm.__meta = { lookbackStart: ctx.lookbackStartYmd, lookbackEnd: ctx.lookbackEndYmd };
  }
  const corteForPending = ctx.isCorteEnMes ? ctx.corteDt : null;
  const ventaWeeks = buildSemanaDowTableRows(year, month, vm, true, corteForPending, selPlant);
  const { fmtYmd, isoDow, sum } = ctx;
  const corteDt = ctx.corteDt;
  const lastDay = ctx.lastDay;

  const totalMesVenta = [0, 0, 0, 0, 0, 0, 0];
  for (let day = 1; day <= corteDt.getDate(); day++) {
    const d = new Date(year, month - 1, day);
    const key = fmtYmd(d);
    const v = vm.get(key);
    if (v != null && Number.isFinite(Number(v))) totalMesVenta[isoDow(d) - 1] += Number(v);
  }
  for (let i = 0; i < 7; i++) totalMesVenta[i] = Math.round(totalMesVenta[i] * 100) / 100;

  const promMesVenta = ["", "", "", "", "", "", ""];
  if (ctx.enableLookback && ctx.lookbackStartYmd && ctx.lookbackEndYmd) {
    const startDt = parseYmdToDate(ctx.lookbackStartYmd);
    const endDt = parseYmdToDate(ctx.lookbackEndYmd);
    const valsByDow = [[], [], [], [], [], [], []];
    const promDayCount =
      startDt && endDt ? Math.min(120, Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / 86400000) + 1)) : 0;
    for (let i = 0; i < promDayCount; i++) {
      const d = new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate());
      d.setDate(d.getDate() + i);
      if (d > endDt) break;
      const key = fmtYmd(d);
      const v = vm.get(key);
      if (v == null || !Number.isFinite(Number(v))) continue;
      if (selPlant && selPlant.get(key) === false) continue;
      valsByDow[isoDow(d) - 1].push(Number(v));
    }
    for (let k = 0; k < 7; k++) {
      const m = meanNonEmpty(valsByDow[k]);
      promMesVenta[k] = m != null ? Math.round(m * 100) / 100 : "";
    }
  }

  const countRemainingDowInMonth = (dow1to7) => {
    let c = 0;
    const startDay = ctx.isCorteEnMes ? corteDt.getDate() : corteDt.getDate() + 1;
    for (let day = startDay; day <= lastDay; day++) {
      const d = new Date(year, month - 1, day);
      if (isoDow(d) === dow1to7) c += 1;
    }
    return c;
  };

  const porComprarVenta = promMesVenta.map((v, idx) => {
    const n = countRemainingDowInMonth(idx + 1);
    return v !== "" ? Math.round(Number(v) * n * 100) / 100 : "";
  });
  const proyVenta = totalMesVenta.map((v, i) => {
    const pc = porComprarVenta[i] !== "" ? Number(porComprarVenta[i]) : 0;
    return Math.round((Number(v) + pc) * 100) / 100;
  });
  const proyVentaTon = Math.round(sum(proyVenta) * 100) / 100;

  const weeks = [];
  for (let i = 1; i < ventaWeeks.rows.length; i++) {
    const row = ventaWeeks.rows[i];
    const bg = (ventaWeeks.cellBgRows && ventaWeeks.cellBgRows[i]) || ["", "", "", "", "", "", ""];
    const ph = (ventaWeeks.promHighlightRows && ventaWeeks.promHighlightRows[i]) || [false, false, false, false, false, false, false];
    weeks.push({
      label: row[0],
      dow: [row[1], row[2], row[3], row[4], row[5], row[6], row[7]],
      total_semana: row[8],
      cell_bg: bg,
      prom_highlight: ph,
    });
  }

  const promFiltered = promMesVenta.filter((x) => x !== "");
  const porcFiltered = porComprarVenta.filter((x) => x !== "");

  return {
    title: `${plantKey} — venta (ton)`,
    year_month: `${year}-${String(month).padStart(2, "0")}`,
    columns: ["Semana (año)", ...DOW_HEADERS_EXCEL, "Total semana"],
    weeks,
    prom_mes_dow: promMesVenta,
    prom_mes_total: sum(promFiltered.map((x) => Number(x))),
    total_mes_dow: totalMesVenta,
    total_mes_sum: sum(totalMesVenta),
    por_comprar_dow: porComprarVenta,
    por_comprar_sum: sum(porcFiltered.map((x) => Number(x))),
    proy_dow: proyVenta,
    proy_total_ton: proyVentaTon,
  };
}

/**
 * Detalle lookback + filas resumen para una planta (misma lógica que hoja Pronostico).
 */
async function getPronosticoPlantDetail(client, year, month, plantCode, fechaCorte) {
  const ctx = await buildPronosticoVentaDescMaps(client, year, month, fechaCorte);
  const pNorm = String(plantCode || "").trim();
  let p = ctx.plants.find((x) => String(x).trim() === pNorm) || null;
  if (!p) {
    const n = normEmpresaKey(pNorm);
    for (const cand of ctx.plants) {
      if (normEmpresaKey(cand) === n || normEmpresaKey(cand).includes(n) || n.includes(normEmpresaKey(cand))) {
        p = cand;
        break;
      }
    }
  }
  if (!p) return null;
  const ventaMap = ctx.ventaMapByPlant.get(p) || new Map();
  const descMap = ctx.descMapByPlant.get(p) || new Map();
  const selPlant = (await loadPronosticoDiasSeleccionMap(client, year, month, ctx.corteYmdStr)).get(String(p).trim()) || new Map();

  const days = [];
  if (ctx.enableLookback && ctx.lookbackStartYmd && ctx.lookbackEndYmd) {
    const startDt = parseYmdToDate(ctx.lookbackStartYmd);
    const endDt = parseYmdToDate(ctx.lookbackEndYmd);
    for (let d = new Date(startDt); d <= endDt; d.setDate(d.getDate() + 1)) {
      const key = ctx.fmtYmd(d);
      const venta_ton = ventaMap.has(key) ? Number(ventaMap.get(key)) : null;
      const desc_ratio = descMap.has(key) ? Number(descMap.get(key)) : null;
      const selected = selPlant.has(key) ? selPlant.get(key) !== false : true;
      days.push({ fecha: key, venta_ton, desc_ratio, selected });
    }
  }

  const proyMap = await computePronosticoProyByPlant(client, year, month, {
    fechaCorte,
    prebuiltVentaDescCtx: ctx,
  });
  const proy = proyMap.get(String(p).trim()) || null;

  const venta_sheet = buildVentaPronosticoSheetLike(year, month, ctx, p, selPlant);

  return {
    plant_code: String(p).trim(),
    year,
    month,
    corte_day: ctx.corteYmdStr,
    lookback_start: ctx.lookbackStartYmd,
    lookback_end: ctx.lookbackEndYmd,
    days,
    venta_sheet,
    proy_venta_ton: proy ? proy.proy_venta_ton : null,
    proy_desc_kg: proy ? proy.proy_desc_kg : null,
    dow_headers: DOW_HEADERS_EXCEL,
  };
}

/**
 * Calcula PROY (venta ton) y descuento PROY ($/kg) por planta provincia,
 * con la misma lógica usada en la hoja "Pronostico" del Excel.
 * @returns {Promise<Map<string,{proy_venta_ton:number,proy_desc_kg:number}>>}
 */
async function computePronosticoProyByPlant(client, year, month, opts = {}) {
  const fechaCorte = (opts && opts.fechaCorte ? String(opts.fechaCorte).trim().slice(0, 10) : "") || "";
  const ctx =
    opts && opts.prebuiltVentaDescCtx
      ? opts.prebuiltVentaDescCtx
      : await buildPronosticoVentaDescMaps(client, year, month, fechaCorte);
  const {
    plants,
    ventaMapByPlant,
    descMapByPlant,
    lastDay,
    corteDt,
    isCorteEnMes,
    enableLookback,
    lookbackStartYmd,
    lookbackEndYmd,
    fmtYmd,
    isoDow,
    sum,
    corteYmdStr,
  } = ctx;

  const selAll = await loadPronosticoDiasSeleccionMap(client, year, month, corteYmdStr);

  const countRemainingDowInMonth = (dow1to7) => {
    let c = 0;
    const startDay = isCorteEnMes ? corteDt.getDate() : corteDt.getDate() + 1;
    for (let day = startDay; day <= lastDay; day++) {
      const d = new Date(year, month - 1, day);
      if (isoDow(d) === dow1to7) c += 1;
    }
    return c;
  };

  const out = new Map();
  for (const p of plants) {
    const ventaMap = ventaMapByPlant.get(p) || new Map();
    const descMap = descMapByPlant.get(p) || new Map();
    const selPlant = selAll.get(String(p).trim()) || new Map();

    // TOTAL mes venta (hasta corte)
    const totalMesVenta = [0, 0, 0, 0, 0, 0, 0];
    for (let day = 1; day <= corteDt.getDate(); day++) {
      const d = new Date(year, month - 1, day);
      const key = fmtYmd(d);
      const v = ventaMap.get(key);
      if (v != null && Number.isFinite(Number(v))) totalMesVenta[isoDow(d) - 1] += Number(v);
    }
    for (let i = 0; i < 7; i++) totalMesVenta[i] = Math.round(totalMesVenta[i] * 100) / 100;

    // PROM mes venta (por DOW) usando lookback
    const promMesVenta = ["", "", "", "", "", "", ""];
    if (enableLookback && lookbackStartYmd && lookbackEndYmd) {
      const startDt = parseYmdToDate(lookbackStartYmd);
      const endDt = parseYmdToDate(lookbackEndYmd);
      const valsByDow = [[], [], [], [], [], [], []];
      const promDayCount =
        startDt && endDt ? Math.min(120, Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / 86400000) + 1)) : 0;
      for (let i = 0; i < promDayCount; i++) {
        const d = new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate());
        d.setDate(d.getDate() + i);
        if (d > endDt) break;
        const key = fmtYmd(d);
        const v = ventaMap.get(key);
        if (v == null || !Number.isFinite(Number(v))) continue;
        if (selPlant.get(key) === false) continue;
        valsByDow[isoDow(d) - 1].push(Number(v));
      }
      for (let k = 0; k < 7; k++) {
        const m = meanNonEmpty(valsByDow[k]);
        promMesVenta[k] = m != null ? Math.round(m * 100) / 100 : "";
      }
    }

    // POR COMPRAR / PROY venta
    const porComprarVenta = promMesVenta.map((v, idx) => {
      const n = countRemainingDowInMonth(idx + 1);
      return v !== "" ? Math.round(Number(v) * n * 100) / 100 : "";
    });
    const proyVenta = totalMesVenta.map((v, i) => {
      const pc = porComprarVenta[i] !== "" ? Number(porComprarVenta[i]) : 0;
      return Math.round((Number(v) + pc) * 100) / 100;
    });
    const proyVentaTon = Math.round(sum(proyVenta) * 100) / 100;

    // TOTAL mes descuento en dinero (ratio * venta_ton) por DOW
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

    // PROM mes descuento ratio (por DOW) usando lookback
    const promMesDescRatio = ["", "", "", "", "", "", ""];
    if (enableLookback && lookbackStartYmd && lookbackEndYmd) {
      const startDt = parseYmdToDate(lookbackStartYmd);
      const endDt = parseYmdToDate(lookbackEndYmd);
      const valsByDow = [[], [], [], [], [], [], []];
      const promDayCountDesc =
        startDt && endDt ? Math.min(120, Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / 86400000) + 1)) : 0;
      for (let i = 0; i < promDayCountDesc; i++) {
        const d = new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate());
        d.setDate(d.getDate() + i);
        if (d > endDt) break;
        const key = fmtYmd(d);
        const v = descMap.get(key);
        if (v == null || !Number.isFinite(Number(v))) continue;
        if (selPlant.get(key) === false) continue;
        valsByDow[isoDow(d) - 1].push(Number(v));
      }
      for (let k = 0; k < 7; k++) {
        const m = meanNonEmpty(valsByDow[k]);
        promMesDescRatio[k] = m != null ? Math.round(m * 100) / 100 : "";
      }
    }

    // PROM (dinero) = promRatio * promVenta
    const promDescMxn = promMesDescRatio.map((r, i) => {
      if (r === "" || promMesVenta[i] === "") return "";
      return Math.round(Number(r) * Number(promMesVenta[i]) * 100) / 100;
    });
    const porComprarDescMxn = promDescMxn.map((v, idx) => {
      const n = countRemainingDowInMonth(idx + 1);
      return v !== "" ? Math.round(Number(v) * n * 100) / 100 : "";
    });
    const proyDescMxn = totalMesDescMxn.map((v, i) => {
      const pc = porComprarDescMxn[i] !== "" ? Number(porComprarDescMxn[i]) : 0;
      return Math.round((Number(v) + pc) * 100) / 100;
    });
    const proyDescKg = proyVentaTon > 0 ? Math.round((sum(proyDescMxn) / proyVentaTon) * 100) / 100 : 0;

    out.set(String(p).trim(), { proy_venta_ton: proyVentaTon, proy_desc_kg: proyDescKg });
  }
  return out;
}

module.exports = {
  generarDashboardArrForecast,
  getProvinciaPlantCodes,
  getPlantasZona,
  computePronosticoProyByPlant,
  buildPronosticoVentaDescMaps,
  getPronosticoCorteYmdStr,
  savePronosticoMiniSnapshot,
  loadPronosticoMiniSnapshot,
  getPronosticoPlantDetail,
  loadPronosticoDiasSeleccionMap,
  resolveProyFromPlantMap,
  resolveCanonicalPlantCode,
};
