"use strict";

/**
 * Comisión por categoría/subcategoría + UI actions 007.
 * Fixtures de 50 formas viven en test/fixtures. No es phrasebook de producción.
 *
 * Comisión general (sin Casa/Comisionista) sigue en 006 → com_desc_kg IGF.
 * Comisión en Casa/Comisionista usa la misma agregación que Movimiento por categoría:
 * kg × |descKg| por subcategoría física descubierta (no hardcodeada).
 */

const FAMILY_IDS = Object.freeze([
  "CASA_CATEGORY_COMMISSION",
  "CASA_SUBCATEGORY_COMMISSION",
  "COMISIONISTA_CATEGORY_COMMISSION",
  "COMISIONISTA_SUBCATEGORY_COMMISSION",
]);

const UI_ACTIONS = Object.freeze({
  OPEN_CATEGORY_MOVEMENT: "OPEN_CATEGORY_MOVEMENT",
  OPEN_IGF_PRONOSTICO_MODAL: "OPEN_IGF_PRONOSTICO_MODAL",
  OPEN_PRONOSTICO: "OPEN_PRONOSTICO",
  OPEN_CLIENT_DELTA_FORECAST: "OPEN_CLIENT_DELTA_FORECAST",
});

const MONTH_NAMES = Object.freeze({
  "01": "enero",
  "02": "febrero",
  "03": "marzo",
  "04": "abril",
  "05": "mayo",
  "06": "junio",
  "07": "julio",
  "08": "agosto",
  "09": "septiembre",
  10: "octubre",
  11: "noviembre",
  12: "diciembre",
});

function nq(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRankingOrClientsQuestion(n) {
  return Boolean(
    /\btop\b/.test(n) ||
      /\branking\b/.test(n) ||
      /\bmas\s+compraron\b/.test(n) ||
      (/\bclientes?\b/.test(n) && !/\bcategoria\b/.test(n) && !/\bcomision\b/.test(n) && !/\bdescuento/.test(n))
  );
}

function isCasaCue(n) {
  return /\bcasa\b/.test(n);
}

function isComisionistaCue(n) {
  return /\bcomisionistas?\b/.test(n);
}

function isCommissionOrDiscountCue(n) {
  return /\bcomision(?:es)?\b/.test(n) || /\bdescuento/.test(n) || /\bdesc\b/.test(n);
}

function isCategoryCommissionQuestion(question, prior) {
  const n = nq(question);
  if (!n) return false;
  if (/\btop\b/.test(n) || /\branking\b/.test(n) || /\bmas\s+compraron\b/.test(n)) return false;
  if (/\bclientes?\b/.test(n) && !isCommissionOrDiscountCue(n)) return false;
  const hasCat = isCasaCue(n) || isComisionistaCue(n);
  const leftover = extractSubcategoryHint(question);
  const hasKnownSub = Boolean(knownSubcategoryHint(n));
  const hasSub = hasKnownSub || (hasCat && Boolean(leftover));
  const cue = isCommissionOrDiscountCue(n);
  if (isCasaCue(n) && isComisionistaCue(n) && !cue) return false;
  if (hasCat && (cue || hasSub)) return true;
  if (hasKnownSub && cue && !isComisionistaCue(n)) return true;
  if (
    prior &&
    (prior.category || prior.parent_intent === "category_commission" || prior.metric === "COMMISSION") &&
    (hasCat || hasSub || cue)
  ) {
    return true;
  }
  return false;
}

function knownSubcategoryHint(n) {
  if (/\bautotanque/.test(n)) return "Autotanque";
  if (/\bcarburacion/.test(n)) return "Carburación";
  if (/\bportatil/.test(n)) return "Portátil";
  if (/\bsin\s+subcategoria/.test(n) || /\bsin\s+sub\b/.test(n)) return "Sin subcategoría";
  return null;
}

function extractSubcategoryHint(question) {
  const n = nq(question);
  const known = knownSubcategoryHint(n);
  if (known) return known;
  const stripped = n
    .replace(/\b(cual|que|cuanto|cuanta|cuantos|cuantas|dame|desglosame|desglosa|abre|abrir|abrela|muestra|muestrame|la|el|los|las|de|del|en|para|dentro|categoria|comision|comisiones|descuento|descuentos|proyectad[oa]s?|proyectamos|proyecta|estima|cerrara|cerramos|cierra|total|detalle|resumen|kilo|kg|por|tenemos|trae|traemos|lleva|llevamos|esta|estan|suma|paga|valor|completa|cuadro|genera|marca|viene|mensual|como|vamos|subcategorias?|casa|comisionistas?|y|e|a|un|una|al|con|su|sus|me|te|se|hay|hoy|actual|completa|completo|tiene|tienen|compone|componen|representa|representan|se|igf|arr|global|venta|ventas|canal|mezcla|ranking|top|lista|quienes|participacion|clientes?|filtra|ahora|cambia)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped || stripped.length < 3) return null;
  if (/^(casa|comisionista)$/.test(stripped)) return null;
  return stripped;
}

function classifyCategoryCommissionFamily(question, prior) {
  const n = nq(question);
  if (!isCategoryCommissionQuestion(question, prior)) return null;
  const category = extractCategoryFromQuestion(question, prior);
  const known = knownSubcategoryHint(n);
  const leftover = extractSubcategoryHint(question);
  const hasConcreteSub = Boolean(known || (leftover && leftover.length > 2 && !/^(casa|comisionista)$/.test(leftover)));
  if (category === "COMISIONISTA") {
    return hasConcreteSub ? "COMISIONISTA_SUBCATEGORY_COMMISSION" : "COMISIONISTA_CATEGORY_COMMISSION";
  }
  if (category === "CASA" || known) {
    return hasConcreteSub ? "CASA_SUBCATEGORY_COMMISSION" : "CASA_CATEGORY_COMMISSION";
  }
  return null;
}

function isOpenCategoryMovementQuestion(question, prior) {
  const n = nq(question);
  if (!n) return false;
  if (/\bventa\s+diaria\b/.test(n) || /\bpronostico\b/.test(n)) return false;
  const nav = /\babre\b/.test(n) || /\babrela\b/.test(n) || /\babrir\b/.test(n) || /\bmuestra/.test(n);
  if (!nav) return false;
  if (/\bmovimiento\s+por\s+categoria\b/.test(n)) return true;
  if (/\bmovimiento\s+de\s+(casa|comisionista)\b/.test(n)) return true;
  if (/\bcomisiones?\s+de\s+(casa|comisionista)\b/.test(n)) return true;
  if (/\bcomision\s+de\s+comisionista\b/.test(n)) return true;
  if (/\btabla\b/.test(n) && (/\bcasa\b/.test(n) || /\bcomisionista/.test(n) || /\bcomision/.test(n) || /\bcategoria\b/.test(n))) {
    return true;
  }
  if (
    prior &&
    (prior.category || prior.parent_intent === "category_commission") &&
    (/\btabla\b/.test(n) || /\babrela\b/.test(n))
  ) {
    return true;
  }
  return false;
}

function isUiConfirmQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  return /^(si|si abrela|si abre la tabla|si por favor|adelante|abrela|abre la tabla|ok|va|ok va|va abrela|adelante abrela|abrela por favor)$/.test(n);
}

function classify007Family(question, prior) {
  if (isUiConfirmQuestion(question) && prior && prior.pending_ui_action) return "UI_CONFIRM";
  if (isOpenCategoryMovementQuestion(question, prior)) return "OPEN_CATEGORY_MOVEMENT";
  if (isImperativeDailySalesOpen(question)) return "OPEN_IGF_PRONOSTICO_MODAL";
  if (isSoftDailySalesAsk(question)) return "SOFT_DAILY_SALES_OFFER";
  return classifyCategoryCommissionFamily(question, prior);
}

function isImperativeDailySalesOpen(question) {
  const n = nq(question);
  return (/\babre\b/.test(n) || /\babrela\b/.test(n) || /\babrir\b/.test(n) || /\bmuestrame\b/.test(n)) &&
    (/\bventa\s+diaria\b/.test(n) || /\bventas\s+diarias\b/.test(n));
}

function isSoftDailySalesAsk(question) {
  const n = nq(question);
  return /\bquiero\s+ver\b/.test(n) && (/\bventa\s+diaria\b/.test(n) || /\bpronostico\b/.test(n));
}

function extractCategoryFromQuestion(question, prior) {
  const n = nq(question);
  if (isComisionistaCue(n)) return "COMISIONISTA";
  if (isCasaCue(n)) return "CASA";
  if (prior && (prior.category === "CASA" || prior.category === "COMISIONISTA")) return prior.category;
  return null;
}

function formatPeriodLabel(period) {
  const m = String(period || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return "el periodo vigente";
  return `${MONTH_NAMES[m[2]] || m[2]} de ${m[1]}`;
}

function yearMonthFromNow(now) {
  const d = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  return `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}`;
}

function rowIsComisionista(row) {
  const cat = String((row && (row.categoria || row.canal)) || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return cat.includes("comisionista");
}

function rowKg(row) {
  const raw = row && (row.kg_proyectado != null ? row.kg_proyectado : row.kg);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function rowDescKg(row) {
  if (row && row.descKg != null && Number.isFinite(Number(row.descKg))) return Math.abs(Number(row.descKg));
  if (row && row.descuento_kg != null && Number.isFinite(Number(row.descuento_kg))) return Math.abs(Number(row.descuento_kg));
  const kg = rowKg(row);
  const monto = row && row.monto != null ? Number(row.monto) : NaN;
  if (kg > 0 && Number.isFinite(monto)) return Math.abs(monto) / kg;
  return 0;
}

function rowSubcategory(row) {
  const raw = String((row && row.subcategoria) || "").trim();
  return raw || "Sin subcategoría";
}

function buildCategoryCommissionFromRows(rows, opts = {}) {
  const category = opts.category === "COMISIONISTA" ? "COMISIONISTA" : "CASA";
  const wantComi = category === "COMISIONISTA";
  const map = new Map();
  for (const row of rows || []) {
    if (!row) continue;
    if (rowIsComisionista(row) !== wantComi) continue;
    const kg = rowKg(row);
    if (kg <= 0) continue;
    const sub = rowSubcategory(row);
    const desc = rowDescKg(row);
    const cur = map.get(sub) || { kg: 0, mxn: 0 };
    cur.kg += kg;
    cur.mxn += kg * desc;
    map.set(sub, cur);
  }
  const names = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, "es"));
  const lines = names.map((sub) => {
    const a = map.get(sub);
    const ventaTon = Math.round((a.kg / 1000) * 100) / 100;
    const amount = Math.round(a.mxn);
    const perKg = a.kg > 0 ? a.mxn / a.kg : 0;
    return {
      subcategory: sub,
      venta_ton: ventaTon,
      commission_projected_amount: amount,
      commission_projected_per_kg: Math.round(perKg * 1000) / 1000,
    };
  });
  const totalKg = lines.reduce((s, l) => s + l.venta_ton * 1000, 0);
  const totalMxn = lines.reduce((s, l) => s + l.commission_projected_amount, 0);
  return {
    category,
    subcategories_discovered: names,
    lines,
    total: {
      subcategory: "TOTAL",
      venta_ton: Math.round((totalKg / 1000) * 100) / 100,
      commission_projected_amount: Math.round(totalMxn),
      commission_projected_per_kg: totalKg > 0 ? Math.round((totalMxn / totalKg) * 1000) / 1000 : 0,
    },
  };
}

function matchSubcategory(hint, discovered) {
  if (!hint) return null;
  const h = nq(hint);
  const list = discovered || [];
  const exact = list.find((s) => nq(s) === h);
  if (exact) return exact;
  const contains = list.find((s) => nq(s).includes(h) || h.includes(nq(s)));
  return contains || null;
}

function fmtMxn(n) {
  const v = Math.round(Number(n) || 0);
  return `$${v.toLocaleString("es-MX")}`;
}

function fmtTon(n) {
  return Number(n || 0).toFixed(2);
}

function fmtPerKg(n) {
  return `$${Number(n || 0).toFixed(3)}`;
}

function buildCategoryCommissionAnswer(pack, opts = {}) {
  const periodLabel = opts.period_label || formatPeriodLabel(opts.period);
  const category = pack && pack.category;
  const offer = "¿Quieres abrir la tabla de Movimiento por categoría?";
  if (!pack || !category) {
    return `INSUFFICIENT_EVIDENCE: no hay movimiento por categoría para reconciliar la comisión.`;
  }
  const wanted = opts.subcategory ? matchSubcategory(opts.subcategory, pack.subcategories_discovered) : null;
  if (opts.subcategory && !wanted) {
    const available = (pack.subcategories_discovered || []).join(", ") || "ninguna";
    return `INSUFFICIENT_EVIDENCE: no encuentro la subcategoría «${opts.subcategory}» en ${category}. Subcategorías físicas: ${available}.`;
  }
  if (wanted) {
    const row = pack.lines.find((l) => l.subcategory === wanted);
    if (!row) return `INSUFFICIENT_EVIDENCE: no hay fila física de ${category} / ${wanted}.`;
    return [
      `${category} / ${wanted} — ${periodLabel}`,
      `Venta: ${fmtTon(row.venta_ton)} t`,
      `Comisión proyectada: ${fmtMxn(row.commission_projected_amount)}`,
      `Comisión proyectada: ${fmtPerKg(row.commission_projected_per_kg)}/kg`,
      "",
      offer,
    ].join("\n");
  }
  const title = `${category} — ${periodLabel.replace(/^([a-záéíóú])/, (c) => c.toUpperCase())}`;
  const t0 = pack.total;
  const lines = [
    title,
    `Categoría: ${category}`,
    `Periodo: ${periodLabel}`,
    `Venta total: ${fmtTon(t0.venta_ton)} t`,
    `Comisión total $: ${fmtMxn(t0.commission_projected_amount)}`,
    `Comisión total $/kg: ${fmtPerKg(t0.commission_projected_per_kg)}`,
    "",
    "Subcategorías:",
    "Subcategoría        Venta (t)   Comisión proyectada   Comisión $/kg",
  ];
  for (const row of pack.lines) {
    lines.push(
      `${String(row.subcategory).padEnd(20)} ${fmtTon(row.venta_ton).padStart(8)}   ${fmtMxn(row.commission_projected_amount).padStart(14)}   ${fmtPerKg(row.commission_projected_per_kg)}`
    );
  }
  const t = pack.total;
  lines.push(
    `${"TOTAL".padEnd(20)} ${fmtTon(t.venta_ton).padStart(8)}   ${fmtMxn(t.commission_projected_amount).padStart(14)}   ${fmtPerKg(t.commission_projected_per_kg)}`
  );
  lines.push("", offer);
  return lines.join("\n");
}

function pendingUiAction(type, extra) {
  return {
    type,
    category: extra && extra.category ? extra.category : null,
    plant: extra && extra.plant ? extra.plant : null,
    year: extra && extra.year != null ? extra.year : null,
    month: extra && extra.month != null ? extra.month : null,
  };
}

function sanitizePendingUiAction(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = String(raw.type || "").trim();
  if (
    type !== UI_ACTIONS.OPEN_CATEGORY_MOVEMENT &&
    type !== UI_ACTIONS.OPEN_IGF_PRONOSTICO_MODAL &&
    type !== UI_ACTIONS.OPEN_PRONOSTICO &&
    type !== UI_ACTIONS.OPEN_CLIENT_DELTA_FORECAST
  ) {
    return null;
  }
  const category = raw.category === "COMISIONISTA" || raw.category === "CASA" ? raw.category : null;
  return {
    type,
    category,
    plant: raw.plant ? String(raw.plant) : null,
    year: Number.isFinite(Number(raw.year)) ? Number(raw.year) : null,
    month: Number.isFinite(Number(raw.month)) ? Number(raw.month) : null,
    client: raw.client ? String(raw.client) : null,
    plant_id: Number.isFinite(Number(raw.plant_id)) ? Number(raw.plant_id) : null,
    period: raw.period ? String(raw.period) : null,
  };
}

async function loadCategoryCommissionForChat(pool, plantaId, req, opts = {}) {
  const now = opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();
  const question = opts.question || "";
  const prior = opts.prior || null;
  const category = extractCategoryFromQuestion(question, prior) || "CASA";
  const period = opts.period || yearMonthFromNow(now);
  const subcategory = extractSubcategoryHint(question);
  const family = classifyCategoryCommissionFamily(question) ||
    (category === "COMISIONISTA" ? "COMISIONISTA_CATEGORY_COMMISSION" : "CASA_CATEGORY_COMMISSION");
  let rows = Array.isArray(opts.categoryRows) ? opts.categoryRows : null;
  if (!rows) {
    const { computeClientesDescuentoMes, resolveArrClientesMesPlantCode } = require("./dashboard-arr-forecast");
    const db = opts.db || pool;
    let plantCode = opts.arrPlantCode;
    if (!plantCode && db && typeof db.query === "function") {
      plantCode = await resolveArrClientesMesPlantCode(db, opts.plant_label);
    }
    if (plantCode && db && typeof computeClientesDescuentoMes === "function") {
      const [y, m] = String(period).split("-").map(Number);
      const pack = await computeClientesDescuentoMes(db, y, m, plantCode, { historico: false });
      rows = (pack && pack.rows) || [];
    }
  }
  const pack = buildCategoryCommissionFromRows(rows || [], { category });
  return {
    ok: true,
    family,
    category,
    subcategory,
    period,
    period_label: formatPeriodLabel(period),
    plant: opts.plant_label || null,
    pack,
    now,
    planta_id: plantaId,
  };
}

module.exports = {
  FAMILY_IDS,
  UI_ACTIONS,
  nq,
  isCategoryCommissionQuestion,
  classifyCategoryCommissionFamily,
  classify007Family,
  isOpenCategoryMovementQuestion,
  isUiConfirmQuestion,
  isImperativeDailySalesOpen,
  isSoftDailySalesAsk,
  extractCategoryFromQuestion,
  extractSubcategoryHint,
  buildCategoryCommissionFromRows,
  buildCategoryCommissionAnswer,
  matchSubcategory,
  pendingUiAction,
  sanitizePendingUiAction,
  formatPeriodLabel,
  yearMonthFromNow,
  loadCategoryCommissionForChat,
};
