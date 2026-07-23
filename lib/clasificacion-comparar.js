"use strict";

/**
 * Parsea / inspecciona Excel de apoyos (hojas variables) y compara vs dashboard.
 * - Importe en blanco = rechazo CDJZ (no se crea folio; se busca match por concepto).
 * - Hojas y columnas se configuran explícitamente (nombres variables).
 */

const XLSX = require("xlsx");
const { PLANTAS_DETALLE_SHEETS } = require("./clasificacion-apoyos-excel");

function normalizeText(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function roundMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.round(x * 100) / 100;
}

function parseMoneyCell(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return roundMoney(v);
  let s = String(v).trim();
  if (!s || /^[-–—]$/.test(s)) return null;
  s = s.replace(/[$\s]/g, "").replace(/\(/g, "-").replace(/\)/g, "");
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? roundMoney(n) : null;
}

function cellStr(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

function colLetterToIndex(letter) {
  const s = String(letter || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{1,2}$/.test(s)) return -1;
  let n = 0;
  for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
  return n - 1;
}

function indexToColLetter(idx) {
  let n = Number(idx) + 1;
  if (!Number.isFinite(n) || n < 1) return "";
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function matchKey(row, { ignoreImporte = false } = {}) {
  return [
    row.categoria || "",
    row.planta_clave || "",
    normalizeText(row.concepto),
    ignoreImporte || row.importe == null ? "" : String(row.importe),
    normalizeText(row.unidad || ""),
  ].join("|");
}

function resolvePlantaCfgById(plantaId) {
  const id = Number(plantaId);
  if (!Number.isFinite(id)) return null;
  return PLANTAS_DETALLE_SHEETS.find((p) => (p.ids || []).includes(id)) || null;
}

function suggestPlantaFromTitle(titleText) {
  const t = normalizeText(titleText);
  if (!t) return null;
  for (const cfg of PLANTAS_DETALLE_SHEETS) {
    const title = normalizeText(cfg.title);
    if (t.includes(title) || title.includes(t)) return cfg;
    if (t.includes(normalizeText(cfg.clave))) return cfg;
  }
  // aliases
  if (/TEHUAC/.test(t)) return PLANTAS_DETALLE_SHEETS.find((p) => p.clave === "E8");
  if (/ACAPUL/.test(t)) return PLANTAS_DETALLE_SHEETS.find((p) => p.clave === "E9");
  if (/QUERET/.test(t)) return PLANTAS_DETALLE_SHEETS.find((p) => p.clave === "E12");
  if (/SAN LUIS|SLP|POTOS/.test(t)) return PLANTAS_DETALLE_SHEETS.find((p) => p.clave === "E13");
  if (/MORELOS/.test(t)) return PLANTAS_DETALLE_SHEETS.find((p) => p.clave === "E15");
  if (/PUEBLA/.test(t)) return PLANTAS_DETALLE_SHEETS.find((p) => p.clave === "E7");
  return null;
}

function suggestCategoriaFromSheet(sheetName, listadoHint) {
  const s = normalizeText(`${sheetName} ${listadoHint || ""}`);
  if (/TALLER/.test(s)) return "TALLER";
  if (/\bINVERSION/.test(s) || /\bE\s*I\b/.test(s) || /LISTADO DE INVERSION/.test(s)) return "INVERSIONES";
  if (/\bGASTO/.test(s) || /\bE\s*G\b/.test(s) || /LISTADO DE GASTO/.test(s)) return "GASTOS";
  // sheet name patterns: "E G", "E7 G", "E I"
  if (/^E\d*\s*G$/i.test(String(sheetName).trim())) return "GASTOS";
  if (/^E\d*\s*I$/i.test(String(sheetName).trim())) return "INVERSIONES";
  if (/^E\d*\s*T$/i.test(String(sheetName).trim())) return "TALLER";
  return null;
}

function guessFieldFromHeader(label) {
  const t = normalizeText(label);
  if (!t) return null;
  if (/^(AT|UNIDAD)\b/.test(t) || t === "AT") return "unidad";
  if (/BREVE|DESCRIPCION|CONCEPTO/.test(t)) return "concepto";
  if (/^IMPORTE/.test(t) || t === "IMPORTE") return "importe";
  if (/PROVEEDOR|BENEFICIARIO/.test(t)) return "beneficiario";
  if (/^MAYOR/.test(t)) return "mayor";
  if (/PREVENTIVO/.test(t)) return "preventivo";
  if (/PASIVO|RECUPERACION/.test(t)) return "pasivo";
  if (/^FECHA$/.test(t) || t === "FECHA") return "fecha";
  if (/FECHA DE ENVIO|ENVIO/.test(t)) return "fecha_envio";
  if (/BANCO/.test(t)) return "banco";
  if (/CTA|CUENTA/.test(t)) return "cuenta_bancaria";
  return null;
}

function findHeaderRow(data, maxScan = 12) {
  let best = { row: -1, score: 0, headers: [] };
  for (let r = 0; r < Math.min(maxScan, data.length); r++) {
    const row = data[r] || [];
    let score = 0;
    const headers = [];
    for (let c = 0; c < row.length; c++) {
      const label = cellStr(row[c]);
      const field = guessFieldFromHeader(label);
      if (field) {
        score += field === "concepto" || field === "importe" ? 3 : 1;
        headers.push({ col: indexToColLetter(c), index: c, label, field });
      } else if (label) {
        headers.push({ col: indexToColLetter(c), index: c, label, field: null });
      }
    }
    if (score > best.score) best = { row: r, score, headers };
  }
  return best.row >= 0 ? best : { row: -1, score: 0, headers: [] };
}

function suggestedColumnsFromHeaders(headers) {
  const cols = {
    concepto: "",
    importe: "",
    unidad: "",
    beneficiario: "",
    mayor: "",
    preventivo: "",
    pasivo: "",
    fecha: "",
    banco: "",
    cuenta_bancaria: "",
  };
  for (const h of headers) {
    if (h.field && cols[h.field] === "") cols[h.field] = h.col;
  }
  return cols;
}

function subcatFromSectionTitle(title, categoria) {
  const t = normalizeText(title).replace(/:$/, "");
  if (categoria === "INVERSIONES") {
    if (/EQUIPO/.test(t) && /PLANTA/.test(t)) return "Equipo para planta";
    if (/INSTALACION/.test(t)) return "Instalaciones a clientes";
    if (/PUBLICIDAD/.test(t)) return "Publicidad";
    if (/TANQUE|CILINDRO/.test(t)) return "Tanques y cilindros";
    if (/ESTACION/.test(t)) return "Estaciones";
    return null;
  }
  if (/EQUIPO/.test(t) && /PLANTA/.test(t)) return "Equipo planta";
  if (/ESTACION/.test(t)) return "Estaciones";
  if (/JURIDICO/.test(t)) return "Juridicos";
  if (/LIQUIDACION/.test(t)) return "Liquidaciones laborales";
  if (/PASIVO/.test(t)) return "Pasivos meses anteriores";
  if (/CONTRACTUAL|SINDICATO/.test(t)) return "Contractuales";
  if (/RENTA/.test(t)) return "Rentas";
  if (/TRAMITE|VEHICULAR/.test(t)) return "Trámites vehiculares";
  if (/VIATICO/.test(t)) return "Viáticos";
  if (/PERMISO/.test(t)) return "Permisos";
  if (/BONO/.test(t)) return "Bonos por venta";
  if (/VARIO/.test(t)) return "Varios";
  return null;
}

function tallerSubcatFromTipo(tipo) {
  if (tipo === "mayor") return "REPARACIÓN MAYOR";
  if (tipo === "pasivo") return "PASIVO/RECUPERACIÓN";
  if (tipo === "preventivo") return "PREVENTIVO";
  return "PREVENTIVO";
}

function isSkipLabel(s) {
  const t = normalizeText(s);
  if (!t) return true;
  return /^(SUMA|TOTAL|%|FECHA|IMPORTE|BREVE|DESCRIPCION|CONCEPTO|AT|CHEQUE|PRESTAMO|POR RECUPERAR|MAYOR|PASIVO|PREVENTIVO|OTROS|PLANTA|PROVEEDOR|BANCO|LISTADO)/.test(
    t
  );
}

/**
 * Inspección previa: hojas + sugerencias de planta/categoría/columnas.
 */
function inspectClasificacionWorkbook(fileBuffer) {
  const wb = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const sheets = [];
  for (const sheetName of wb.SheetNames || []) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
    if (!Array.isArray(data) || data.length < 2) continue;

    const titleHint = cellStr((data[0] || [])[0]) || cellStr((data[0] || [])[1]);
    const listadoHint = cellStr((data[1] || [])[0]) || cellStr((data[1] || [])[1]);
    const hdr = findHeaderRow(data);
    const plantaCfg = suggestPlantaFromTitle(titleHint) || suggestPlantaFromTitle(listadoHint);
    const categoria = suggestCategoriaFromSheet(sheetName, listadoHint) || suggestCategoriaFromSheet(sheetName, titleHint);

    // Skip obvious non-data sheets
    const nameN = normalizeText(sheetName);
    if (/^(RESUMEN|COMPARATIVO|GASTOS|INVERSIONES|DYO|DY O)$/.test(nameN) && !categoria) {
      // still include if has useful headers
      if (hdr.score < 3) continue;
    }

    sheets.push({
      sheetName,
      titleHint: titleHint || null,
      listadoHint: listadoHint || null,
      suggestedCategoria: categoria,
      suggestedPlantaId: plantaCfg ? plantaCfg.ids[0] : null,
      suggestedPlantaClave: plantaCfg ? plantaCfg.clave : null,
      suggestedPlantaTitle: plantaCfg ? plantaCfg.title : null,
      headerRow: hdr.row >= 0 ? hdr.row + 1 : null,
      headers: hdr.headers,
      suggestedColumns: suggestedColumnsFromHeaders(hdr.headers),
    });
  }

  // Si hojas Taller no traen planta en el título, heredar la más frecuente del libro
  const withPlanta = sheets.filter((s) => s.suggestedPlantaId != null);
  if (withPlanta.length) {
    const counts = new Map();
    for (const s of withPlanta) {
      counts.set(s.suggestedPlantaId, (counts.get(s.suggestedPlantaId) || 0) + 1);
    }
    let bestId = null;
    let bestN = 0;
    for (const [id, n] of counts) {
      if (n > bestN) {
        bestId = id;
        bestN = n;
      }
    }
    const donor = withPlanta.find((s) => s.suggestedPlantaId === bestId);
    if (donor) {
      for (const s of sheets) {
        if (s.suggestedPlantaId == null && s.suggestedCategoria === "TALLER") {
          s.suggestedPlantaId = donor.suggestedPlantaId;
          s.suggestedPlantaClave = donor.suggestedPlantaClave;
          s.suggestedPlantaTitle = donor.suggestedPlantaTitle;
        }
      }
    }
  }

  return {
    sheets,
    plantas: PLANTAS_DETALLE_SHEETS.map((p) => ({
      clave: p.clave,
      title: p.title,
      id: p.ids[0],
      ids: p.ids,
    })),
  };
}

function getColIdx(columns, key) {
  if (!columns || !columns[key]) return -1;
  return colLetterToIndex(columns[key]);
}

function parseSheetWithConfig(data, sheetCfg) {
  const categoria = String(sheetCfg.categoria || "").toUpperCase();
  const columns = sheetCfg.columns || {};
  const plantaCfg = resolvePlantaCfgById(sheetCfg.planta_id);
  const planta_id = plantaCfg ? plantaCfg.ids[0] : sheetCfg.planta_id != null ? Number(sheetCfg.planta_id) : null;
  const planta_clave = plantaCfg ? plantaCfg.clave : "";
  const planta_title = plantaCfg ? plantaCfg.title : null;
  const planta_ids = plantaCfg ? plantaCfg.ids : planta_id != null ? [planta_id] : [];

  const idxConcepto = getColIdx(columns, "concepto");
  const idxImporte = getColIdx(columns, "importe");
  const idxUnidad = getColIdx(columns, "unidad");
  const idxBenef = getColIdx(columns, "beneficiario");
  const idxMayor = getColIdx(columns, "mayor");
  const idxPrev = getColIdx(columns, "preventivo");
  const idxPasivo = getColIdx(columns, "pasivo");
  const idxBanco = getColIdx(columns, "banco");
  const idxCuenta = getColIdx(columns, "cuenta_bancaria");

  if (idxConcepto < 0) {
    return { rows: [], rechazos: [], warning: `Hoja ${sheetCfg.sheetName}: falta mapear columna Concepto` };
  }

  const hdr = findHeaderRow(data);
  const startRow = hdr.row >= 0 ? hdr.row + 1 : 1;
  let currentSubcat = null;
  const rows = [];
  const rechazos = [];

  for (let r = startRow; r < data.length; r++) {
    const row = data[r] || [];

    // section titles (gastos/inversiones): text ending with : and no concepto
    if (categoria !== "TALLER") {
      for (let c = 0; c < Math.min(4, row.length); c++) {
        const t = cellStr(row[c]);
        if (t.endsWith(":") && t.length > 2) {
          currentSubcat = subcatFromSectionTitle(t, categoria);
        }
      }
    }

    const concepto = cellStr(row[idxConcepto]);
    if (!concepto || isSkipLabel(concepto)) continue;

    const unidad = idxUnidad >= 0 ? cellStr(row[idxUnidad]) : null;
    if (unidad && isSkipLabel(unidad) && normalizeText(unidad) === "AT") continue;

    const beneficiario = idxBenef >= 0 ? cellStr(row[idxBenef]) : null;
    const banco = idxBanco >= 0 ? cellStr(row[idxBanco]) : null;
    const cuenta_bancaria = idxCuenta >= 0 ? cellStr(row[idxCuenta]) : null;

    let importe = idxImporte >= 0 ? parseMoneyCell(row[idxImporte]) : null;
    let tallerTipo = null;
    if (categoria === "TALLER") {
      const mayor = idxMayor >= 0 ? parseMoneyCell(row[idxMayor]) : null;
      const pasivo = idxPasivo >= 0 ? parseMoneyCell(row[idxPasivo]) : null;
      const preventivo = idxPrev >= 0 ? parseMoneyCell(row[idxPrev]) : null;
      if (importe == null || importe === 0) {
        if (mayor != null && mayor !== 0) {
          importe = mayor;
          tallerTipo = "mayor";
        } else if (pasivo != null && pasivo !== 0) {
          importe = pasivo;
          tallerTipo = "pasivo";
        } else if (preventivo != null && preventivo !== 0) {
          importe = preventivo;
          tallerTipo = "preventivo";
        }
      } else if (mayor != null && Math.abs(mayor - importe) < 0.02) tallerTipo = "mayor";
      else if (pasivo != null && Math.abs(pasivo - importe) < 0.02) tallerTipo = "pasivo";
      else if (preventivo != null && Math.abs(preventivo - importe) < 0.02) tallerTipo = "preventivo";
      else tallerTipo = "preventivo";
    }

    const base = {
      source: "excel",
      sheet: sheetCfg.sheetName,
      categoria,
      planta_clave,
      planta_title,
      planta_id,
      planta_ids,
      concepto,
      unidad: unidad || null,
      beneficiario: beneficiario || null,
      banco: banco || null,
      cuenta_bancaria: cuenta_bancaria || null,
      subcategoria:
        categoria === "TALLER" ? tallerSubcatFromTipo(tallerTipo || "preventivo") : currentSubcat,
      taller_tipo: tallerTipo,
      row_excel: r + 1,
    };

    // Importe en blanco / cero sin monto en columnas de tipo → rechazo CDJZ
    if (importe == null || importe === 0) {
      // Require some substance: concept long enough, not just "COMPROBACIÓN" short noise without AT on taller
      if (concepto.length < 8 && categoria !== "TALLER") continue;
      rechazos.push({ ...base, importe: null, rechazo_cdjz_excel: true });
      continue;
    }

    rows.push({ ...base, importe });
  }

  return { rows, rechazos, warning: null };
}

/**
 * Parsea workbook usando configuración explícita por hoja.
 * @param {Buffer} fileBuffer
 * @param {Array<{sheetName, enabled?, planta_id, categoria, columns}>} sheetConfigs
 */
function parseClasificacionExcelWithConfigs(fileBuffer, sheetConfigs) {
  const wb = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const rows = [];
  const rechazos = [];
  const warnings = [];
  const sheetsUsed = [];

  for (const cfg of sheetConfigs || []) {
    if (cfg.enabled === false) continue;
    if (!cfg.sheetName || !cfg.categoria) {
      warnings.push(`Config incompleta para hoja ${cfg.sheetName || "?"}`);
      continue;
    }
    const ws = wb.Sheets[cfg.sheetName];
    if (!ws) {
      warnings.push(`No se encontró la hoja "${cfg.sheetName}"`);
      continue;
    }
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
    const parsed = parseSheetWithConfig(data, cfg);
    if (parsed.warning) warnings.push(parsed.warning);
    sheetsUsed.push(cfg.sheetName);
    rows.push(...parsed.rows);
    rechazos.push(...parsed.rechazos);
  }

  return { rows, rechazos, sheets: sheetsUsed, warnings };
}

function normalizeCategoriaDb(cat) {
  const c = normalizeText(cat);
  if (!c) return "";
  if (c.includes("TALLER")) return "TALLER";
  if (c.includes("INVERSION")) return "INVERSIONES";
  if (c === "DYO" || c.includes("DERECHO") || c.includes("OBLIGACION")) return "DYO";
  if (c.includes("GASTO")) return "GASTOS";
  return c;
}

function folioToCompareRow(f) {
  const plantaId = f.planta_id != null ? Number(f.planta_id) : null;
  let planta_clave = "";
  let planta_title = null;
  let planta_ids = [];
  for (const cfg of PLANTAS_DETALLE_SHEETS) {
    if (plantaId != null && (cfg.ids || []).includes(plantaId)) {
      planta_clave = cfg.clave;
      planta_title = cfg.title;
      planta_ids = cfg.ids || [];
      break;
    }
  }
  return {
    source: "dashboard",
    folio_id: f.id,
    numero_folio: f.numero_folio || f.folio_codigo || null,
    estatus: f.estatus || null,
    categoria: normalizeCategoriaDb(f.categoria),
    planta_clave,
    planta_title,
    planta_id: plantaId,
    planta_ids,
    concepto: String(f.descripcion || f.concepto || "").trim(),
    importe: roundMoney(f.importe),
    unidad: f.unidad != null ? String(f.unidad).trim() : null,
    beneficiario: f.beneficiario != null ? String(f.beneficiario).trim() : null,
    subcategoria: f.subcategoria != null ? String(f.subcategoria).trim() : null,
    mes_cargo: f.mes_cargo != null ? String(f.mes_cargo).trim() : null,
  };
}

/**
 * Compara Excel vs dashboard.
 * - Filas con importe: match 1:1 → coinciden / faltan en dashboard / faltan en excel
 * - Filas Excel sin importe (rechazo CDJZ): buscan folio en dashboard por concepto(+unidad+cat+planta) → lista rechazos_sugeridos
 */
function compareExcelVsDashboard(excelRows, excelRechazos, dashboardRows) {
  const dash = (dashboardRows || []).map((r) => ({
    ...r,
    _key: matchKey(r),
    _keyNoImp: matchKey(r, { ignoreImporte: true }),
    _used: false,
  }));

  const matched = [];
  const missingInDashboard = [];
  const missingInExcel = [];
  const rechazosSugeridos = [];

  for (const ex of excelRows || []) {
    const key = matchKey(ex);
    const idx = dash.findIndex((d) => !d._used && d._key === key);
    if (idx >= 0) {
      dash[idx]._used = true;
      matched.push({ excel: ex, dashboard: dash[idx] });
    } else {
      missingInDashboard.push({ ...ex, match_key: key });
    }
  }

  for (const rej of excelRechazos || []) {
    const keyNo = matchKey(rej, { ignoreImporte: true });
    // Prefer unused dashboard rows with same concept key
    const candidates = dash.filter((d) => !d._used && d._keyNoImp === keyNo);
    if (candidates.length === 1) {
      const d = candidates[0];
      d._used = true;
      rechazosSugeridos.push({
        folio_id: d.folio_id,
        numero_folio: d.numero_folio,
        categoria: d.categoria || rej.categoria,
        planta_clave: d.planta_clave || rej.planta_clave,
        concepto: d.concepto,
        importe_dashboard: d.importe,
        unidad: d.unidad || rej.unidad,
        motivo: "Importe en blanco en Excel (rechazo CDJZ)",
      });
    } else if (candidates.length > 1) {
      // take closest by importe presence — still suggest all as ambiguous? take first
      const d = candidates[0];
      d._used = true;
      rechazosSugeridos.push({
        folio_id: d.folio_id,
        numero_folio: d.numero_folio,
        categoria: d.categoria || rej.categoria,
        planta_clave: d.planta_clave || rej.planta_clave,
        concepto: d.concepto,
        importe_dashboard: d.importe,
        unidad: d.unidad || rej.unidad,
        motivo: "Importe en blanco en Excel (varios posibles; se tomó el primero)",
        ambiguous: true,
      });
    } else {
      // soft match: same concepto only within categoria
      const soft = dash.find(
        (d) =>
          !d._used &&
          d.categoria === rej.categoria &&
          normalizeText(d.concepto) === normalizeText(rej.concepto) &&
          (!rej.planta_clave || !d.planta_clave || d.planta_clave === rej.planta_clave)
      );
      if (soft) {
        soft._used = true;
        rechazosSugeridos.push({
          folio_id: soft.folio_id,
          numero_folio: soft.numero_folio,
          categoria: soft.categoria || rej.categoria,
          planta_clave: soft.planta_clave || rej.planta_clave,
          concepto: soft.concepto,
          importe_dashboard: soft.importe,
          unidad: soft.unidad || rej.unidad,
          motivo: "Importe en blanco en Excel (match por concepto)",
        });
      } else {
        rechazosSugeridos.push({
          folio_id: null,
          numero_folio: null,
          categoria: rej.categoria,
          planta_clave: rej.planta_clave,
          concepto: rej.concepto,
          importe_dashboard: null,
          unidad: rej.unidad,
          motivo: "Importe en blanco en Excel; no hay folio coincidente en dashboard",
        });
      }
    }
  }

  for (const d of dash) {
    if (!d._used) {
      const { _key, _keyNoImp, _used, ...rest } = d;
      missingInExcel.push({ ...rest, match_key: _key });
    }
  }

  return {
    matched_count: matched.length,
    missing_in_dashboard: missingInDashboard,
    missing_in_excel: missingInExcel,
    rechazos_cdjz: rechazosSugeridos,
  };
}

function categoriaNombreForInsert(cat) {
  if (cat === "GASTOS") return "Gastos";
  if (cat === "INVERSIONES") return "Inversiones";
  if (cat === "TALLER") return "Taller";
  return cat;
}

module.exports = {
  inspectClasificacionWorkbook,
  parseClasificacionExcelWithConfigs,
  compareExcelVsDashboard,
  folioToCompareRow,
  matchKey,
  normalizeText,
  normalizeCategoriaDb,
  categoriaNombreForInsert,
  PLANTAS_DETALLE_SHEETS,
  colLetterToIndex,
  indexToColLetter,
};
