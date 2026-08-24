"use strict";

/**
 * Anexo IGF Forecast + ARR para Chat Director IA (complemento, no sustituto).
 * Reutiliza commercial_state (dejaron/aumentaron/…) y dashboard-arr-forecast.
 */

const dashboardArrForecast = require("./dashboard-arr-forecast");
const { currentYearMonthCdmx } = require("./director-ia-mejora-continua");
const { loadCommercialStateForChat, CATEGORY_META } = require("./director-ia-commercial-state");

/** @type {{ getPlantCodeArrFromPlantaNombre?: Function, getMargenKgPorPeriodo?: Function, assertGVPlantaNombreAccess?: Function }} */
let deps = {};

function configureDirectorIaIgfArr(injected) {
  deps = { ...deps, ...injected };
}

const MESES_ES = Object.freeze([
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]);

const IGF_ARR_ANNEX_SYSTEM_ADDENDUM =
  "Cuando el mensaje incluya un ANEXO — IGF / ARR, úsalo para KPIs financieros de planta (margen $/kg, venta, descuento, rentabilidad). Si preguntan por margen, responde PRIMERO con el bloque COMPARACION MARGEN $/kg (mes actual vs mes previo y delta). No sustituyas ese bloque por Bitácora IA ni Action Register. Bitácora/DICF solo como complemento si aportan causa operativa.";

/** IGF / forecast financiero / utilidad. */
const IGF_SIGNAL_RE =
  /\b(igf|forecast\s+igf|compromiso\s+igf|util(?:idad)?\s+oper|resultado\s+final|rentabilidad(?:\s+(?:de\s+la\s+)?planta)?|c[oó]mo\s+va\s+(?:la\s+)?utilidad|hg\s*\$?\/?\s*kg)\b/i;

const IGF_COMPOSITION_SOURCE = "igf.compromiso_lines";
const IGF_COMPOSITION_MAX_USD_KG = 18;

/** Allowlist. *_kg = $/kg (no kilogramos). formula_role = referencia semántica; no se ejecuta recálculo. */
const IGF_COMPOSITION_CATALOG = Object.freeze([
  { key: "venta_ton", label: "Venta", unit: "ton", formula_role: "none", order: 0 },
  { key: "margen_kg", label: "Margen", unit: "$/kg", formula_role: "add", order: 1 },
  { key: "com_desc_kg", label: "Com. y Desc.", unit: "$/kg", formula_role: "add", order: 2 },
  { key: "deposito_cierre_kg", label: "Depósito / cierre", unit: "$/kg", formula_role: "add", order: 3 },
  { key: "presupuesto_kg", label: "Presupuesto", unit: "$/kg", formula_role: "subtract", order: 4 },
  { key: "folios_aprob_zp_kg", label: "Folios Aprob. ZP", unit: "$/kg", formula_role: "subtract", order: 5 },
  { key: "folios_carro_kg", label: "Folios carro", unit: "$/kg", formula_role: "subtract", order: 6 },
  { key: "impuesto_kg", label: "Impuesto", unit: "$/kg", formula_role: "subtract", order: 7 },
  { key: "hg_kg", label: "HG", unit: "$/kg", formula_role: "subtract", order: 8 },
  { key: "bancos_planta_kg", label: "Bancos planta", unit: "$/kg", formula_role: "subtract", order: 9 },
  { key: "provision_planta_kg", label: "Provisión planta", unit: "$/kg", formula_role: "subtract", order: 10 },
  { key: "gasto_kg", label: "Gasto", unit: "$/kg", formula_role: "none", order: 11 },
  { key: "util_oper_kg", label: "Util. operación", unit: "$/kg", formula_role: "stored_subtotal", order: 12 },
  { key: "gtos_apoyos_corp_kg", label: "Gtos/Apoyos corp", unit: "$/kg", formula_role: "subtract", order: 13 },
  { key: "bancos_corp_kg", label: "Bancos corp.", unit: "$/kg", formula_role: "subtract", order: 14 },
  { key: "otros_programas_kg", label: "Otros programas", unit: "$/kg", formula_role: "subtract", order: 15 },
  { key: "inversiones_kg", label: "Inversiones", unit: "$/kg", formula_role: "subtract", order: 16 },
  { key: "resultado_final_kg", label: "Resultado", unit: "$/kg", formula_role: "stored_total", order: 17 },
  { key: "hg_pct", label: "HG %", unit: "%", formula_role: "none", order: 18 },
  { key: "util_oper_importe", label: "Util. operación", unit: "MXN", formula_role: "stored_importe", order: 19 },
  { key: "resultado_final_importe", label: "Resultado", unit: "MXN", formula_role: "stored_importe", order: 20 },
]);

/** ARR / proyección venta / descuento mes a mes. */
const ARR_SIGNAL_RE =
  /\b(arr|pron[oó]stico\s+(?:de\s+)?venta|forecast\s+(?:de\s+)?venta|proyecci[oó]n\s+(?:de\s+)?venta|venta\s+proyectada|toneladas?\s+(?:al\s+)?cierre|descuento\s+(?:forecast|mes|mensual)|desc\.?\s*\/?\s*kg|lookback|corte\s+arr|delta\s+ingreso|ingreso\s+(?:entre\s+)?meses|cu[aá]nto\s+(?:vamos\s+a\s+)?vender)\b/i;

/** Lists + KPI financieros juntos. */
const DELTA_CLIENTES_SIGNAL_RE =
  /\b(dejaron\s+de\s+comprar|disminuyeron|aumentaron|clientes?\s+nuevos|nuevos\s+clientes|delta\s+(?:ingreso|venta)|ca[ií]da\s+de\s+(?:ingreso|venta|ton))\b/i;

/** Preguntas de KPI financiero de planta (IGF Forecast ARR), p. ej. «cómo se comportó el margen». */
const PLANT_FINANCIAL_KPI_RE =
  /\b(margenes?|margen\s*\$?\/?\s*kg|rentabilidad|descuento(?:s)?(?:\s+\$?\/?\s*kg)?|gasto(?:s)?|utilidad|resultado\s+final|ingreso\s+(?:de\s+la\s+)?planta|c[oó]mo\s+se\s+comport[oó]\s+(?:el\s+|la\s+)?margen|comportamiento\s+del\s+margen)\b/i;

function normalizeQ(question) {
  return String(question || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isIgfForecastQuestion(question) {
  return IGF_SIGNAL_RE.test(String(question || "")) || isIgfCompositionQuestion(question);
}

/** Composición de un snapshot IGF. No es delta M9. */
function isIgfCompositionQuestion(question) {
  const q = normalizeQ(question);
  if (!q) return false;
  if (
    (/\b(como\s+cambi|delta|variacion)\b/.test(q) || /\bcomo\s+cambi/.test(q)) &&
    /\b(venta|descuento|ingreso)\b/.test(q)
  ) {
    return false;
  }
  if (/\bcomposicion\b/.test(q)) return true;
  if (/\bse\s+compone\b/.test(q)) return true;
  if (/\bpartidas?\b/.test(q) && /\b(igf|compromiso|utilidad|resultado)\b/.test(q)) return true;
  return false;
}

function isArrForecastQuestion(question) {
  return ARR_SIGNAL_RE.test(String(question || ""));
}

function isDeltaClientesIgfQuestion(question) {
  return DELTA_CLIENTES_SIGNAL_RE.test(String(question || ""));
}

/**
 * KPI financiero de planta (margen, rentabilidad, etc.) → IGF/ARR, no Bitácora/DICF.
 * @param {string} question
 */
function isPlantFinancialKpiQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (isExplicitBitacoraOrDicfHistoryOverride(q)) return false;
  if (PLANT_FINANCIAL_KPI_RE.test(q)) return true;
  if (isIgfForecastQuestion(q) || isArrForecastQuestion(q)) return true;
  return false;
}

/** Evita que «margen» robe preguntas de historial/visita. */
function isExplicitBitacoraOrDicfHistoryOverride(question) {
  return (
    /\b(visita|bit[aá]cora|plaud|qu[eé]\s+pas[oó]\s+con|resultado\s+de\s+cierre|historial\s+dicf)\b/i.test(
      String(question || "")
    )
  );
}

/**
 * ¿Adjuntar anexo IGF/ARR?
 */
function shouldAttachIgfArrAnnex(question) {
  const q = String(question || "");
  if (!q.trim()) return false;
  if (isPlantFinancialKpiQuestion(q)) return true;
  if (isIgfCompositionQuestion(q)) return true;
  if (isIgfForecastQuestion(q) || isArrForecastQuestion(q)) return true;
  if (isDeltaClientesIgfQuestion(q)) return true;
  if (/\bmargen\b/i.test(q)) return true;
  if (/\bdescuento(?:s)?\b/i.test(q) && /\b(mes|mensual|cliente|arr|vs|contra|compar)\b/i.test(q)) {
    return true;
  }
  return false;
}

/**
 * @param {string} question
 * @param {{ year: number, month: number }} fallback
 */
function resolveYearMonthFromQuestion(question, fallback = currentYearMonthCdmx()) {
  const q = normalizeQ(question);
  let { year, month } = fallback;

  const ym = q.match(/\b(20\d{2})[-\/](0?[1-9]|1[0-2])\b/);
  if (ym) {
    year = parseInt(ym[1], 10);
    month = parseInt(ym[2], 10);
    return { year, month };
  }

  const yOnly = q.match(/\b(20\d{2})\b/);
  if (yOnly) year = parseInt(yOnly[1], 10);

  for (let i = 0; i < MESES_ES.length; i++) {
    const re = new RegExp(`\\b${MESES_ES[i]}\\b`, "i");
    if (re.test(q)) {
      month = i + 1;
      break;
    }
  }
  return { year, month };
}

function prevYearMonth(year, month) {
  if (month <= 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function fmtNum(n, digits = 2) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtMoney(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `$${Number(n).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

async function resolvePlantaNombre(client, plantaId) {
  const r = await client.query(`SELECT nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  const row = r.rows && r.rows[0];
  if (!row) return null;
  return String(row.nombre || row.clave || "").trim() || null;
}

function findIgfRowForPlant(rows, plantCode, plantaNombre) {
  const want = normalizeQ(plantCode || plantaNombre || "");
  if (!want) return null;
  let best = null;
  let bestScore = -1;
  for (const r of rows || []) {
    const emp = normalizeQ(r.empresa);
    if (!emp || /^totales?$/.test(emp)) continue;
    let score = -1;
    if (emp === want) score = 10000;
    else if (emp.includes(want) || want.includes(emp)) score = 5000 - Math.abs(emp.length - want.length);
    else {
      const strip = (x) => x.replace(/^(gtm|gt)\s+/, "").trim();
      const a = strip(emp);
      const b = strip(want);
      if (a && b && (a === b || a.includes(b) || b.includes(a))) score = 4000;
    }
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore >= 500 ? best : null;
}

function compositionDigits(unit) {
  if (unit === "ton") return 1;
  if (unit === "MXN") return 0;
  return 2;
}

function formatCompositionValue(value, unit) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return fmtNum(value, compositionDigits(unit));
}

function formulaRolePhrase(role, key) {
  if (key === "gasto_kg") {
    return "aparece en el snapshot; no entra a la fórmula de utilidad/resultado";
  }
  if (role === "add") return "entra en la composición con +";
  if (role === "subtract") return "entra en la composición con −";
  if (role === "stored_subtotal") return "subtotal almacenado; no recalculado";
  if (role === "stored_total") return "total almacenado; no recalculado";
  if (role === "stored_importe") return "importe almacenado; no recalculado";
  if (key === "venta_ton") return "aparece en el snapshot; no entra a la suma $/kg";
  if (key === "hg_pct") return "aparece en el snapshot; no entra a la fórmula";
  return "aparece en el snapshot";
}

/**
 * Composición observada de UNA fila de compromiso_lines.
 * No ejecuta recálculo. No invierte signos. Null se omite (null != 0).
 */
function extractIgfComposition(row, meta = {}) {
  if (!row || typeof row !== "object") {
    return {
      ok: false,
      cardinality: 0,
      source: IGF_COMPOSITION_SOURCE,
      lines: [],
      omitted_null_keys: [],
      magnitude_usd_per_kg: [],
    };
  }
  const lines = [];
  const omittedNull = [];
  let usdKgEmitted = 0;
  for (const spec of IGF_COMPOSITION_CATALOG) {
    if (!Object.prototype.hasOwnProperty.call(row, spec.key)) continue;
    const raw = row[spec.key];
    if (raw == null || raw === "") {
      omittedNull.push(spec.key);
      continue;
    }
    const value = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(value)) {
      omittedNull.push(spec.key);
      continue;
    }
    if (spec.unit === "$/kg" && usdKgEmitted >= IGF_COMPOSITION_MAX_USD_KG) continue;
    if (spec.unit === "$/kg") usdKgEmitted += 1;
    lines.push({
      line_key: spec.key,
      line_label: spec.label,
      value,
      unit: spec.unit,
      formula_role: spec.formula_role,
      order: spec.order,
      source: IGF_COMPOSITION_SOURCE,
    });
  }
  const magnitude = lines
    .filter((l) => l.unit === "$/kg" && (l.formula_role === "add" || l.formula_role === "subtract"))
    .map((l) => ({ line_key: l.line_key, abs: Math.abs(Number(l.value)) }))
    .sort((a, b) => b.abs - a.abs || a.line_key.localeCompare(b.line_key))
    .slice(0, 3);
  return {
    ok: true,
    cardinality: 1,
    empresa: row.empresa != null ? String(row.empresa) : null,
    source: IGF_COMPOSITION_SOURCE,
    snapshot: true,
    trend: false,
    year: meta.year != null ? meta.year : null,
    month: meta.month != null ? meta.month : null,
    version_id: meta.version_id != null ? meta.version_id : null,
    version_number: meta.version_number != null ? meta.version_number : null,
    lines,
    omitted_null_keys: omittedNull,
    magnitude_usd_per_kg: magnitude,
  };
}

function formatIgfCompositionBlock(composition) {
  if (!composition || composition.ok !== true || !composition.lines.length) {
    return [
      "COMPOSICIÓN IGF (snapshot, no tendencia): no hay líneas observadas en la fila resuelta.",
      "Fuente igf.compromiso_lines. COMPOSICIÓN != CAUSALIDAD. No es delta (M9).",
      "",
    ];
  }
  const out = [
    "COMPOSICIÓN IGF (snapshot, no tendencia). Una fila. Fuente igf.compromiso_lines.",
    "Hechos observados. COMPOSICIÓN != CAUSALIDAD. Magnitud != problema. Línea != responsable. No es tendencia (M9).",
  ];
  for (const line of composition.lines) {
    const shown = formatCompositionValue(line.value, line.unit);
    const role = formulaRolePhrase(line.formula_role, line.line_key);
    out.push(
      `- ${line.line_key} (${line.line_label}, ${line.unit}): ${role}. Valor almacenado: ${shown} ${line.unit}.`
    );
  }
  if (composition.magnitude_usd_per_kg.length >= 2) {
    const names = composition.magnitude_usd_per_kg.map((m) => m.line_key).join(", ");
    out.push(
      `Dentro de la misma unidad ($/kg), estas son las de mayor magnitud (no implica problema ni causa): ${names}.`
    );
  }
  out.push("");
  return out;
}

async function loadIgfCommitSnapshot(client, year, month, plantCode, plantaNombre) {
  const ver = await client.query(
    `SELECT id, version_number FROM igf.versions
     WHERE plant_code = 'GLOBAL' AND year = $1::int AND month = $2::int
     ORDER BY version_number DESC LIMIT 1`,
    [year, month]
  );
  const versionId = ver.rows?.[0]?.id != null ? Number(ver.rows[0].id) : null;
  if (versionId == null) {
    return { version_id: null, version_number: null, row: null };
  }
  const versionNumber = ver.rows[0].version_number;
  const r = await client.query(
    `SELECT * FROM igf.compromiso_lines WHERE version_id = $1::int ORDER BY empresa`,
    [versionId]
  );
  const toNum = (v) => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  const rows = (r.rows || []).map((row) => {
    const obj = { empresa: (row.empresa || "").trim() };
    for (const [k, v] of Object.entries(row)) {
      if (k === "empresa" || k === "version_id" || k === "id") continue;
      obj[k] = typeof v === "number" ? v : toNum(v);
    }
    return obj;
  });
  return {
    version_id: versionId,
    version_number: versionNumber,
    row: findIgfRowForPlant(rows, plantCode, plantaNombre),
  };
}

async function loadArrProyForPlant(client, year, month, plantCode) {
  const proyByPlant = await dashboardArrForecast.computePronosticoProyByPlant(client, year, month, {
    fechaCorte: "",
  });
  const proy = dashboardArrForecast.resolveProyFromPlantMap(proyByPlant, plantCode);
  return {
    venta_ton: proy && Number.isFinite(Number(proy.proy_venta_ton)) ? Number(proy.proy_venta_ton) : null,
    desc_kg: proy && Number.isFinite(Number(proy.proy_desc_kg)) ? Number(proy.proy_desc_kg) : null,
  };
}

function formatCommercialTotalsBlock(data) {
  const lines = ["ESTADO COMERCIAL (motor DICF — totales categoría):"];
  for (const key of ["dejaron", "disminuyeron", "aumentaron", "nuevos"]) {
    const g = data?.[key];
    const meta = CATEGORY_META[key];
    if (!g) {
      lines.push(`- ${meta.label}: (sin datos)`);
      continue;
    }
    const n = Array.isArray(g.clientes) ? g.clientes.length : Number(g.count) || 0;
    const tonStr = g.totalDeltaKgStr || (g.total_ton != null ? fmtNum(g.total_ton, 1) : "—");
    const ingStr = g.totalDeltaIngresoStr || (g.total_ingreso != null ? fmtMoney(g.total_ingreso) : "—");
    lines.push(`- ${meta.label}: ${n} clientes | Δ ton ${tonStr} | Δ ingreso ${ingStr}`);
  }
  return lines;
}

/**
 * Top clientes ARR del mes (descuento / kg), opcional.
 */
async function loadTopClientesDescBrief(client, year, month, plantCode, limit = 8) {
  try {
    const resp = await dashboardArrForecast.computeClientesDescuentoMes(client, year, month, plantCode, {
      historico: false,
    });
    const list = Array.isArray(resp?.rows) ? resp.rows : [];
    const sorted = [...list].sort((a, b) => {
      const da = Math.abs(Number(a.descKg) || 0);
      const db = Math.abs(Number(b.descKg) || 0);
      return db - da;
    });
    return sorted.slice(0, limit).map((c) => ({
      cliente: c.cliente || "—",
      kg: c.kg != null ? Number(c.kg) : null,
      desc_kg: c.descKg != null ? Number(c.descKg) : null,
      estatus: c.estatus || null,
    }));
  } catch (e) {
    console.warn("[director-ia-igf-arr] clientes desc:", e.message || e);
    return [];
  }
}

/**
 * @param {import("pg").Pool} pool
 * @param {number} plantaId
 * @param {import("express").Request} req
 * @param {string} question
 */
async function loadIgfArrAnnexForChat(pool, plantaId, req, question) {
  if (!pool) {
    return { ok: false, error: "Pool no configurado", status: 500 };
  }
  if (!deps.getPlantCodeArrFromPlantaNombre || !deps.getMargenKgPorPeriodo) {
    return { ok: false, error: "IGF/ARR chat no configurado en servidor", status: 500 };
  }

  const auth = req?.dashboardAuth;
  if (dashboardAuthRoleNorm(auth) === "GA") {
    return { ok: false, error: "GA no tiene acceso a KPIs financieros.", status: 403 };
  }

  const { year, month } = resolveYearMonthFromQuestion(question);
  const prev = prevYearMonth(year, month);
  const wantMargen = /\bmargen\b/i.test(question) || isPlantFinancialKpiQuestion(question);
  const wantIgf = isIgfForecastQuestion(question) || wantMargen;
  const wantArr =
    isArrForecastQuestion(question) ||
    /\bdescuento/i.test(question) ||
    isDeltaClientesIgfQuestion(question) ||
    wantMargen;
  const wantCommercial =
    isDeltaClientesIgfQuestion(question) ||
    (isIgfForecastQuestion(question) && !wantMargen) ||
    (/\b(cliente|venta|ingreso|delta)\b/i.test(question) && !/\bmargen\b/i.test(question));

  const client = await pool.connect();
  try {
    const plantaNombre = await resolvePlantaNombre(client, plantaId);
    if (!plantaNombre) return { ok: false, error: "Planta no encontrada", status: 400 };

    if (deps.assertGVPlantaNombreAccess) {
      const gvChk = await deps.assertGVPlantaNombreAccess(client, auth, plantaNombre);
      if (!gvChk.ok) {
        return { ok: false, error: gvChk.error || "Sin acceso a esta planta", status: gvChk.status || 403 };
      }
    }

    const plantCode = await deps.getPlantCodeArrFromPlantaNombre(client, plantaNombre);
    const lines = [
      "---",
      "ANEXO — IGF / ARR (KPIs de planta — misma lógica que IGF Forecast ARR)",
      `Planta: ${plantaNombre} | Código ARR: ${plantCode || "—"}`,
      `Mes consultado: ${String(month).padStart(2, "0")}/${year} | Mes previo: ${String(prev.month).padStart(2, "0")}/${prev.year}`,
      "",
    ];

    // Bloque principal que espera Presidencia al preguntar «margen» (pantalla COMPARACION).
    if (wantMargen || wantIgf) {
      let margenCurr = null;
      let margenPrev = null;
      try {
        margenCurr = await deps.getMargenKgPorPeriodo(client, plantaNombre, year, month);
        margenPrev = await deps.getMargenKgPorPeriodo(client, plantaNombre, prev.year, prev.month);
      } catch (e) {
        console.warn("[director-ia-igf-arr] margen:", e.message || e);
      }
      lines.push("COMPARACION MARGEN $/kg (fuente IGF — misma columna MARGEN del IGF Forecast ARR):");
      lines.push(
        `- ${MESES_ES[prev.month - 1]} ${prev.year}: ${fmtNum(margenPrev, 2)} $/kg`
      );
      lines.push(`- ${MESES_ES[month - 1]} ${year}: ${fmtNum(margenCurr, 2)} $/kg`);
      if (margenCurr != null && margenPrev != null && Number.isFinite(Number(margenCurr)) && Number.isFinite(Number(margenPrev))) {
        const delta = Number(margenCurr) - Number(margenPrev);
        const sign = delta > 0 ? "+" : "";
        lines.push(`- COMPARACION (${MESES_ES[month - 1]} − ${MESES_ES[prev.month - 1]}): ${sign}${fmtNum(delta, 2)} $/kg`);
      } else {
        lines.push("- COMPARACION: no hay margen en ambos meses para calcular delta");
      }
      lines.push("");
      lines.push(
        "INSTRUCCIÓN: Si la pregunta es sobre margen, responde primero con estos tres renglones (mes previo, mes actual, delta). No uses Bitácora ni Action Register para inventar el margen."
      );
      lines.push("");
    }
    if (wantCommercial) {
      const commercial = await loadCommercialStateForChat(pool, plantaId, req);
      if (commercial.ok && commercial.data) {
        lines.push(...formatCommercialTotalsBlock(commercial.data));
        const periodo = commercial.data.periodoMes || commercial.data.periodo_mes || null;
        if (periodo) lines.push(`Periodo DICF de referencia: ${periodo}`);
        lines.push("");
      } else if (!commercial.ok && commercial.status === 403) {
        return commercial;
      } else {
        lines.push("ESTADO COMERCIAL: no disponible para esta consulta.");
        lines.push("");
      }
    }

    let composition = null;
    let arrCurr = { venta_ton: null, desc_kg: null };
    let arrPrev = { venta_ton: null, desc_kg: null };
    if (wantArr || wantIgf) {
      try {
        arrCurr = await loadArrProyForPlant(client, year, month, plantCode);
        arrPrev = await loadArrProyForPlant(client, prev.year, prev.month, plantCode);
      } catch (e) {
        console.warn("[director-ia-igf-arr] ARR proy:", e.message || e);
      }

      lines.push("ARR — VENTA / DESCUENTO (proyección o real según corte):");
      lines.push(
        `- ${MESES_ES[month - 1]} ${year}: venta ${fmtNum(arrCurr.venta_ton, 1)} ton | desc ${fmtNum(arrCurr.desc_kg, 2)} $/kg`
      );
      lines.push(
        `- ${MESES_ES[prev.month - 1]} ${prev.year}: venta ${fmtNum(arrPrev.venta_ton, 1)} ton | desc ${fmtNum(arrPrev.desc_kg, 2)} $/kg`
      );
      if (arrCurr.venta_ton != null && arrPrev.venta_ton != null) {
        lines.push(`- Δ venta vs mes previo: ${fmtNum(arrCurr.venta_ton - arrPrev.venta_ton, 1)} ton`);
      }
      if (arrCurr.desc_kg != null && arrPrev.desc_kg != null) {
        lines.push(`- Δ desc $/kg vs mes previo: ${fmtNum(arrCurr.desc_kg - arrPrev.desc_kg, 2)}`);
      }
      lines.push("");
    }

    if (wantIgf || wantArr) {
      const igf = await loadIgfCommitSnapshot(client, year, month, plantCode, plantaNombre);
      let margenDb = null;
      try {
        margenDb = await deps.getMargenKgPorPeriodo(client, plantaNombre, year, month);
      } catch {
        /* ignore */
      }

      lines.push("IGF — COMPROMISO / MARGEN (versión más reciente del mes):");
      if (!igf.version_id) {
        lines.push(`- Sin versión IGF para ${String(month).padStart(2, "0")}/${year}`);
      } else {
        lines.push(`- Versión IGF: v${igf.version_number} (id ${igf.version_id})`);
        const row = igf.row;
        if (!row) {
          lines.push("- Sin fila IGF coincidente para esta planta");
        } else {
          const ventaIgf = row.venta_ton;
          const margen = row.margen_kg != null ? row.margen_kg : margenDb;
          const comDesc = row.com_desc_kg;
          const hgKg = row.hg_kg;
          const ventaArr = arrCurr.venta_ton != null ? arrCurr.venta_ton : ventaIgf;
          const descArr = arrCurr.desc_kg != null ? arrCurr.desc_kg : comDesc;
          lines.push(`- Compromiso venta IGF: ${fmtNum(ventaIgf, 1)} ton`);
          lines.push(`- Margen $/kg: ${fmtNum(margen, 2)}`);
          lines.push(`- Com. y Desc. $/kg (IGF): ${fmtNum(comDesc, 2)} | ARR desc $/kg: ${fmtNum(descArr, 2)}`);
          lines.push(`- HG $/kg: ${fmtNum(hgKg, 2)}`);
          if (ventaArr != null && margen != null) {
            const ingresoApprox = Math.round((Number(margen) + Number(descArr || 0) - Number(hgKg || 0)) * Number(ventaArr) * 1000);
            lines.push(`- Ingreso aprox. (margen+desc−HG)×ton×1000: ${fmtMoney(ingresoApprox)}`);
          }
          if (wantIgf) {
            composition = extractIgfComposition(row, {
              year,
              month,
              version_id: igf.version_id,
              version_number: igf.version_number,
            });
            lines.push("");
            lines.push(...formatIgfCompositionBlock(composition));
          }
        }
      }
      if (margenDb != null && Number.isFinite(Number(margenDb))) {
        lines.push(`- Margen DB periodo (getMargenKgPorPeriodo): ${fmtNum(margenDb, 2)} $/kg`);
      }
      lines.push("");
    }

    if (wantArr && /\bdescuento|cliente/i.test(question)) {
      const top = await loadTopClientesDescBrief(client, year, month, plantCode, 8);
      if (top.length > 0) {
        lines.push(`TOP CLIENTES — DESCUENTO ${MESES_ES[month - 1].toUpperCase()} ${year} (ARR):`);
        for (const c of top) {
          lines.push(
            `- ${c.cliente}: desc ${fmtNum(c.desc_kg, 2)} $/kg${c.kg != null ? ` | ${fmtNum(c.kg / 1000, 1)} ton` : ""}${c.estatus ? ` | ${c.estatus}` : ""}`
          );
        }
        lines.push("");
      }
    }

    lines.push(
      "Notas: cifras al motor IGF/ARR/DICF del servidor. No inventar. Si un bloque falta, indícalo. Listas detalladas de clientes → también commercial_state cuando la pregunta es de listas."
    );

    return {
      ok: true,
      text: lines.join("\n").trimEnd(),
      meta: {
        mode: "igf_arr_annex",
        focus: "igf_arr",
        year,
        month,
        planta_id: plantaId,
        plant_code: plantCode,
        wantIgf,
        wantArr,
        wantCommercial,
        composition,
      },
    };
  } catch (e) {
    console.error("[director-ia-igf-arr]", e);
    return { ok: false, error: e.message || "Error al cargar anexo IGF/ARR", status: 500 };
  } finally {
    client.release();
  }
}

module.exports = {
  configureDirectorIaIgfArr,
  shouldAttachIgfArrAnnex,
  isIgfForecastQuestion,
  isIgfCompositionQuestion,
  isArrForecastQuestion,
  isDeltaClientesIgfQuestion,
  isPlantFinancialKpiQuestion,
  resolveYearMonthFromQuestion,
  extractIgfComposition,
  formatIgfCompositionBlock,
  loadIgfArrAnnexForChat,
  IGF_ARR_ANNEX_SYSTEM_ADDENDUM,
  IGF_SIGNAL_RE,
  ARR_SIGNAL_RE,
  PLANT_FINANCIAL_KPI_RE,
  IGF_COMPOSITION_SOURCE,
  IGF_COMPOSITION_CATALOG,
  IGF_COMPOSITION_MAX_USD_KG,
};
