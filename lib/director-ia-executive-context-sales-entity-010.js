"use strict";

/**
 * 010 — Contexto ejecutivo: planta, ventas, comparativos, entidad activa y gasto por concepto.
 * Las 450 formas viven en fixtures de test. No hay phrasebook de producción.
 */

const FAMILY_IDS = Object.freeze([
  "SALES_STATUS",
  "PLANT_DIAGNOSIS_CURRENT",
  "PERIOD_COMPARISON_EXPLICIT",
  "SAME_PERIOD_PREVIOUS_MONTH",
  "SALES_TODAY_WEEK_MONTH",
  "LOW_SALES_CARBURATION",
  "SALES_TREND_TO_CLOSE",
  "ACTIVE_CLIENT_ENTITY_INHERITANCE",
  "KEYWORD_EXPENSE",
]);

const MONTHS_ES = Object.freeze({
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
});

const NON_PLANT_BUSINESS_TOKENS = Object.freeze([
  "venta",
  "ventas",
  "vendido",
  "vendiendo",
  "volumen",
  "actual",
  "actualmente",
  "hoy",
  "semana",
  "mes",
  "planta",
  "esta",
  "este",
  "esta planta",
  "este planta",
  "planta actual",
  "la planta",
  "septiembre",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre contra octubre",
  "octubre contra septiembre",
  "mismo periodo",
  "mes anterior",
  "carburacion",
  "estacion",
  "estaciones",
  "tendencia",
  "cierre",
  "diagnostico",
  "panorama",
  "situacion",
  "resumen",
  "lectura",
  "estado",
  "general",
  "riesgos",
  "desviaciones",
  "forecast",
  "meta",
  "llanta",
  "llantas",
  "neumatico",
  "neumaticos",
]);

const CLIENT_PRONOUN_RE =
  /\b(su|sus|el|ella|ese|esa|este|esta|el mismo|la misma|ese cliente|esa cliente|este cliente|esta cliente)\b/;

const DOMAIN_INVALIDATES_CLIENT = Object.freeze([
  "expense_analytics",
  "folio_search",
  "seh_operation_status",
  "seh_regulation",
  "taller_mayor",
  "category_commission",
]);

function nq(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nclient(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isNonPlantBusinessToken(token) {
  const t = nq(token);
  if (!t) return true;
  if (NON_PLANT_BUSINESS_TOKENS.includes(t)) return true;
  const parts = t.split(" ").filter(Boolean);
  if (!parts.length) return true;
  if (parts.every((p) => NON_PLANT_BUSINESS_TOKENS.includes(p))) return true;
  if (/\b(contra|vs|versus|frente|respecto|entre)\b/.test(t) && hasMonthName(t)) return true;
  if (hasMonthName(t) && parts.length <= 6) return true;
  return false;
}

function hasMonthName(n) {
  return Object.keys(MONTHS_ES).some((m) => new RegExp(`\\b${m}\\b`).test(n));
}

function extractMonthPair(question, now) {
  const n = nq(question);
  const names = Object.keys(MONTHS_ES);
  const found = [];
  for (const name of names) {
    if (new RegExp(`\\b${name}\\b`).test(n) && !found.includes(name)) found.push(name);
  }
  if (found.length < 2) return null;
  const year =
    now instanceof Date && !Number.isNaN(now.getTime()) ? now.getFullYear() : new Date().getFullYear();
  const a = found[0];
  const b = found[1];
  return {
    month_a: `${year}-${String(MONTHS_ES[a]).padStart(2, "0")}`,
    month_b: `${year}-${String(MONTHS_ES[b]).padStart(2, "0")}`,
    label_a: a,
    label_b: b,
  };
}

function isKeywordExpenseQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\btaller\b/.test(n) && !/\b(llantas?|neumatic)/.test(n)) return false;
  if (!/\b(llantas?|neumatic)/.test(n)) return false;
  if (/\bexactamente\b/.test(n) || /\bexclusiv/.test(n)) return false;
  const spend = /\b(gaste|gastamos|gastado|gasto|pagado|pagamos|suman|suma|importe|total|dinero|asociado|llevamos|registrado|cuanto)\b/.test(
    n
  );
  const listOnly =
    !spend &&
    (/\b(que\s+folios|contienen|lista|listar|tenemos|fueron|hay)\b/.test(n) ||
      /\bcuantos\s+folios\b/.test(n));
  if (listOnly) return false;
  return spend || hasMonthName(n);
}

function isSalesStatusQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isKeywordExpenseQuestion(question)) return false;
  if (isTodayWeekMonthQuestion(question) || isLowSalesCarburationQuestion(question)) return false;
  if (isTrendToCloseQuestion(question) || isSamePeriodPreviousQuestion(question)) return false;
  if (isPeriodComparisonQuestion(question)) return false;
  if (
    /\b(llantas?|taller|regulacion|seh|comision|forecast\s+por\s+cliente|abre\s+la\s+venta|mezcla|mix|share|participacion|canal|comisionista|casa|autotanque|portatil|clientes?|nuevos|dejaron|disminuyeron|churn|retencion)\b/.test(
      n
    )
  ) {
    return false;
  }
  if (/\b(hoy|esta semana|este mes)\b/.test(n) && /\b(vendio|vendimos|venta)\b/.test(n) && /\b(y|,)\b/.test(n)) {
    return false;
  }
  const sale = /\bventas?\b/.test(n) || /\bvendiendo\b/.test(n) || /\bvendido\b/.test(n) || /\bvolumen\b/.test(n);
  if (!sale && !/\bcomo\s+llevamos\s+el\s+mes\b/.test(n)) return false;
  return Boolean(
    /\bcomo\b/.test(n) ||
      /\bestado\b/.test(n) ||
      /\bresumen\b/.test(n) ||
      /\blectura\b/.test(n) ||
      /\bpanorama\b/.test(n) ||
      /\bdime\b/.test(n) ||
      /\bdame\b/.test(n) ||
      /\btal\b/.test(n) ||
      /\bandamos\b/.test(n) ||
      /\bvenimos\b/.test(n) ||
      /\bse ve\b/.test(n) ||
      /\bpinta\b/.test(n) ||
      /\bmarcha\b/.test(n) ||
      /\bllevamos\b/.test(n) ||
      /\bpasando\b/.test(n) ||
      /\bactual\b/.test(n) ||
      /\bplanta\b/.test(n)
  );
}

function isPlantDiagnosisCurrentQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isSalesStatusQuestion(question) || isKeywordExpenseQuestion(question)) return false;
  if (
    /\bfinanciero\b/.test(n) ||
    /\btaller\b/.test(n) ||
    /\bregulacion\b/.test(n) ||
    /\bregulator/.test(n) ||
    /\bventas?\b/.test(n) ||
    /\bseh\b/.test(n) ||
    /\bclientes?\b/.test(n) ||
    /\bdejar\s+de\s+comprar\b/.test(n) ||
    /\b(diario|brief|ayer|reporte)\b/.test(n)
  ) {
    return false;
  }
  return Boolean(
    /\bdiagnostico\b/.test(n) ||
      /\bsituacion\b/.test(n) ||
      /\bpanorama\b/.test(n) ||
      /\blectura\b/.test(n) ||
      /\bresumen\b/.test(n) ||
      /\ben\s+general\b/.test(n) ||
      /\briesgos?\b/.test(n) ||
      /\bdesviaciones?\b/.test(n) ||
      /\b(debo|deberia)\s+revisar\b/.test(n) ||
      /\bestado\s+general\b/.test(n) ||
      /\boperando\b/.test(n) ||
      (/\bplanta\b/.test(n) &&
        (/\bcomo\b/.test(n) ||
          /\bfuncion\b/.test(n) ||
          /\boperando\b/.test(n) ||
          /\bdebe\b/.test(n) ||
          /\bencuentra\b/.test(n) ||
          /\bestamos\b/.test(n) ||
          /\bandamos\b/.test(n) ||
          /\bactual\b/.test(n)))
  );
}

function isPeriodComparisonQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isKeywordExpenseQuestion(question) || /\btaller\b/.test(n) || /\binvertimos\b/.test(n) || /\bgastamos\b/.test(n)) {
    return false;
  }
  const pair = extractMonthPair(question, null);
  if (!pair) return false;
  if (/\bde\s+\w+\s+a\s+\w+\b/.test(n) && !/\b(contra|vs|versus|frente|compar|delta|diferenc|mejor)\b/.test(n)) {
    return false;
  }
  if (n.split(" ").filter(Boolean).length <= 3) return true;
  return Boolean(
    /\b(contra|vs|versus|frente|respecto|entre|compar|delta|diferenc|variacion|contraste|mejor)/.test(n)
  );
}

function isSamePeriodPreviousQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  return Boolean(
    /\bmismo\s+(periodo|corte|lapso|tramo|intervalo|numero)\b/.test(n) ||
      /\bmes\s+(anterior|pasado|previo)\b/.test(n) ||
      /\bequivalente\s+del\s+mes\b/.test(n) ||
      /\bacumulado\s+vs\s+mes\b/.test(n)
  );
}

function isTodayWeekMonthQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\b(seh|extintor|regulacion)\b/.test(n)) return false;
  const hasSale = /\b(vendio|vendimos|venta|vendido|vendidos|llevamos|lleva|cuanto|horizontes|cortes|reporte|lectura|ventanas|corte)\b/.test(n);
  const horizons = [/\b(hoy|diario)\b/.test(n), /\bsemanal?\b/.test(n), /\b(mes|mensual)\b/.test(n)].filter(Boolean).length;
  return horizons >= 2 && (hasSale || horizons === 3);
}

function isLowSalesCarburationQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\b(extintor|vencid|seh|permiso|regulacion)\b/.test(n)) return false;
  return Boolean(
    /\b(estacion(?:es)?|carburacion|punto)\b/.test(n) &&
      /\b(venta|vend|baja|bajo|menor|peor|caida|poco|debil|volumen)/.test(n)
  );
}

function isTrendToCloseQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\bforecast\s+por\s+cliente\b/.test(n)) return false;
  return Boolean(
    (/\btendencia\b/.test(n) && /\b(venta|cierre|mes|finales|mejor|comercial)\b/.test(n)) ||
      /\britmo\b/.test(n) && /\b(venta|cierre|mejora)\b/.test(n) ||
      /\bescenario\b/.test(n) && /\b(cierre|venta|lineal)\b/.test(n) ||
      /\b(mejorara|mejore|mejorar|mejora)\b/.test(n) && /\b(venta|cierre|tendencia|ritmo|forecast)\b/.test(n) ||
      /\bpara\s+finales\s+de\s+mes\b/.test(n) ||
      /\ba\s+fin(?:ales)?\s+de\s+mes\b/.test(n) && /\bventa\b/.test(n)
  );
}

function isActiveClientFollowUpQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\b(taller|llantas?|regulacion|venta\s+de\s+la\s+planta)\b/.test(n)) return false;
  const purchase =
    /\bultima\s+compra\b/.test(n) ||
    /\bcada\s+cuanto/.test(n) ||
    /\bfrecuencia\b/.test(n) ||
    /\batrasad/.test(n) ||
    /\bdias\s+lleva/.test(n) ||
    /\bdias\s+(lleva\s+)?sin\s+comprar\b/.test(n) ||
    /\bcuando\s+(vuelve|esperamos|deberia|le\s+toca)\b/.test(n) ||
    /\ble\s+toca\b/.test(n) ||
    /\bciclo\s+de\s+compra\b/.test(n) ||
    /\bexpected\s+next\b/.test(n) ||
    /\by\s+cuando\s+vuelve\b/.test(n) ||
    /\by\s+su\s+/.test(n);
  if (!purchase) return false;
  return Boolean(CLIENT_PRONOUN_RE.test(n) || /^(y\s+)/.test(n) || n.length < 48);
}

function classifyExecutiveContextFamily(question, prior) {
  if (isKeywordExpenseQuestion(question)) return "KEYWORD_EXPENSE";
  if (isLowSalesCarburationQuestion(question)) return "LOW_SALES_CARBURATION";
  if (isTodayWeekMonthQuestion(question)) return "SALES_TODAY_WEEK_MONTH";
  if (isPeriodComparisonQuestion(question)) return "PERIOD_COMPARISON_EXPLICIT";
  if (isSamePeriodPreviousQuestion(question)) return "SAME_PERIOD_PREVIOUS_MONTH";
  if (isTrendToCloseQuestion(question)) return "SALES_TREND_TO_CLOSE";
  if (isSalesStatusQuestion(question)) return "SALES_STATUS";
  if (isPlantDiagnosisCurrentQuestion(question)) return "PLANT_DIAGNOSIS_CURRENT";
  if (
    isActiveClientFollowUpQuestion(question) &&
    prior &&
    (prior.active_client || prior.canonical_name || prior.family === "EXPECTED_NEXT_PURCHASE")
  ) {
    return "ACTIVE_CLIENT_ENTITY_INHERITANCE";
  }
  return null;
}

function isSalesContextFamily(family) {
  return [
    "SALES_STATUS",
    "PERIOD_COMPARISON_EXPLICIT",
    "SAME_PERIOD_PREVIOUS_MONTH",
    "SALES_TODAY_WEEK_MONTH",
    "LOW_SALES_CARBURATION",
    "SALES_TREND_TO_CLOSE",
  ].includes(family);
}

function normalizeKeywordConcept(raw) {
  const n = nq(raw);
  if (/\bneumatic/.test(n) || /\bllantas?\b/.test(n)) return "llanta";
  return n;
}

function keywordAliases(concept) {
  if (concept === "llanta") return ["llanta", "llantas", "neumatico", "neumaticos"];
  return [concept].filter(Boolean);
}

function rowMatchesKeywordConcept(row, concept) {
  const aliases = keywordAliases(concept);
  const blob = nq(
    [row && row.concepto, row && row.descripcion, row && row.subcategoria, row && row.beneficiario]
      .filter(Boolean)
      .join(" ")
  );
  return aliases.some((a) => new RegExp(`\\b${a}\\b`).test(blob));
}

function folioIsExclusiveConcept(row, concept) {
  const blob = nq([row && row.concepto, row && row.descripcion].filter(Boolean).join(" "));
  if (!rowMatchesKeywordConcept(row, concept)) return false;
  const cleaned = blob
    .replace(/\b(llantas?|neumaticos?|compra|de|del|la|el|y|2|dos)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length < 3;
}

function resolveActiveClient(opts = {}) {
  const prior = opts.prior || opts.conversation_state || null;
  const entities = (prior && prior.active_entities) || [];
  const client = entities.find((e) => e && (e.kind === "CLIENT" || e.kind === "client" || e.kind === "predictive_commercial"));
  if (opts.explicitClient) return { canonical_name: String(opts.explicitClient).trim(), source: "explicit" };
  if (client && (client.canonical_name || client.display || (client.ranked_names && client.ranked_names[0]))) {
    return {
      canonical_name: client.canonical_name || client.display || client.ranked_names[0],
      source: "active_entity",
    };
  }
  if (prior && prior.canonical_name) return { canonical_name: prior.canonical_name, source: "prior" };
  return null;
}

function shouldClearActiveClient(newIntent) {
  return DOMAIN_INVALIDATES_CLIENT.includes(newIntent);
}

function ymdOf(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const s = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function kgToTon(kg) {
  const n = Number(kg);
  return Number.isFinite(n) ? n / 1000 : 0;
}

function sumKg(rows, pred) {
  let kg = 0;
  for (const row of rows || []) {
    if (pred && !pred(row)) continue;
    const n = Number(row.kg != null ? row.kg : row.venta_kg);
    if (Number.isFinite(n) && n > 0) kg += n;
  }
  return kg;
}

function physicalCutoff(rows, now) {
  let max = null;
  for (const row of rows || []) {
    const d = ymdOf(row.fecha);
    if (d && (!max || d > max)) max = d;
  }
  if (max) return max;
  if (now instanceof Date && !Number.isNaN(now.getTime())) return now.toISOString().slice(0, 10);
  return null;
}

function mondayOf(ymd) {
  const dt = new Date(`${ymd}T00:00:00`);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function addDays(ymd, n) {
  const dt = new Date(`${ymd}T00:00:00`);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

function monthStart(ymd) {
  return `${String(ymd).slice(0, 7)}-01`;
}

function priorMonthSameDay(ymd) {
  const [y, m, d] = String(ymd).split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 2, 1);
  const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  const day = Math.min(d, last);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTon(kg) {
  return `${kgToTon(kg).toFixed(1)} t`;
}

function pctDelta(cur, prev) {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

function carburationGranularity() {
  return {
    source_audited: "arr.ventas_diarias_cliente",
    has_station_grain: false,
    available_grain: ["plant_code", "canal", "subcanal", "cliente_norm"],
    missing: "venta observada por estación / punto de carburación",
  };
}

function buildCarburationInsufficient() {
  const audit = carburationGranularity();
  return [
    "INSUFFICIENT_EVIDENCE: no hay granularidad contractual de venta por estación de carburación.",
    `La fuente ${audit.source_audited} permite ${audit.available_grain.join(", ")}, no estación.`,
    "No uso SEH/equipos para inventar venta por estación.",
  ].join(" ");
}

function loadSalesRows(opts) {
  if (Array.isArray(opts.salesRows)) return opts.salesRows;
  return [];
}

function finishSales(family, spec, extras) {
  return {
    ok: true,
    family,
    spec,
    ...extras,
  };
}

function buildSalesStatusAnswer(payload) {
  const lines = [
    `Estado de venta de la planta (${payload.plant_label || "planta seleccionada"}).`,
    `Corte físico: ${payload.cutoff || "sin MAX(fecha)"}.`,
    `Venta observada: ${formatTon(payload.observed_kg)}.`,
  ];
  if (payload.forecast_kg != null) lines.push(`Cierre proyectado disponible: ${formatTon(payload.forecast_kg)}.`);
  if (payload.meta_kg != null) {
    lines.push(`Meta disponible: ${formatTon(payload.meta_kg)}.`);
    if (payload.observed_kg != null) {
      lines.push(`Diferencia contra meta: ${formatTon(payload.observed_kg - payload.meta_kg)}.`);
    }
  }
  if (payload.pace_note) lines.push(payload.pace_note);
  if (payload.forecast_kg == null) lines.push("No invento forecast.");
  if (payload.meta_kg == null) lines.push("No invento meta.");
  return lines.join("\n");
}

function buildPeriodComparisonAnswer(payload) {
  const aType = payload.a_kind || "observado";
  const bType = payload.b_kind || "observado";
  const lines = [
    `Comparación ${payload.label_a} (${aType}) vs ${payload.label_b} (${bType}).`,
    `${payload.label_a}: ${formatTon(payload.a_kg)}.`,
    `${payload.label_b}: ${formatTon(payload.b_kg)}.`,
    `Diferencia: ${formatTon(payload.b_kg - payload.a_kg)}.`,
  ];
  const pct = pctDelta(payload.b_kg, payload.a_kg);
  if (pct != null) lines.push(`Variación: ${pct.toFixed(1)}%.`);
  if (aType !== "observado" || bType !== "observado") {
    lines.push("El forecast no se presenta como realizado.");
  }
  return lines.join("\n");
}

function buildSamePeriodAnswer(payload) {
  if (payload.no_comparable) {
    return "INSUFFICIENT_EVIDENCE: no hay evidencia comparable del mismo corte del mes anterior.";
  }
  const pct = pctDelta(payload.current_kg, payload.prior_kg);
  return [
    `Corte actual (${payload.cutoff}): ${formatTon(payload.current_kg)}.`,
    `Mismo corte del mes anterior (${payload.prior_cutoff}): ${formatTon(payload.prior_kg)}.`,
    `Delta: ${formatTon(payload.current_kg - payload.prior_kg)}.`,
    pct == null ? "Delta %: no hay base anterior." : `Delta: ${pct.toFixed(1)}%.`,
  ].join("\n");
}

function buildTodayWeekMonthAnswer(payload) {
  return [
    `Hoy: ${formatTon(payload.today_kg)}`,
    `Semana: ${formatTon(payload.week_kg)}`,
    `Mes: ${formatTon(payload.month_kg)}`,
    `Corte: ${payload.cutoff}`,
  ].join("\n");
}

function buildTrendAnswer(payload) {
  const lines = [
    `HECHO: venta acumulada al corte ${payload.cutoff}: ${formatTon(payload.observed_kg)}.`,
  ];
  if (payload.forecast_kg != null) {
    lines.push(`PROYECCIÓN: el forecast disponible indica ${formatTon(payload.forecast_kg)}.`);
  } else {
    lines.push("PROYECCIÓN: no hay forecast contractual de planta.");
  }
  if (payload.signal) lines.push(`SEÑAL: ${payload.signal}`);
  if (payload.scenario) lines.push(`ESCENARIO: ${payload.scenario} No es una certeza.`);
  if (!payload.forecast_kg && !payload.signal) {
    lines.push("No hay evidencia suficiente para afirmar que la tendencia va a mejorar.");
  }
  return lines.join("\n");
}

function buildExecutiveSalesAnswer(payload) {
  if (!payload) return "INSUFFICIENT_EVIDENCE: no pude materializar la lectura de venta.";
  if (payload.limitation) return payload.limitation;
  if (payload.clarification) return payload.clarification;
  if (payload.family === "SALES_STATUS") return buildSalesStatusAnswer(payload);
  if (payload.family === "PERIOD_COMPARISON_EXPLICIT") return buildPeriodComparisonAnswer(payload);
  if (payload.family === "SAME_PERIOD_PREVIOUS_MONTH") return buildSamePeriodAnswer(payload);
  if (payload.family === "SALES_TODAY_WEEK_MONTH") return buildTodayWeekMonthAnswer(payload);
  if (payload.family === "LOW_SALES_CARBURATION") return payload.limitation || buildCarburationInsufficient();
  if (payload.family === "SALES_TREND_TO_CLOSE") return buildTrendAnswer(payload);
  return "INSUFFICIENT_EVIDENCE: no pude materializar la lectura de venta.";
}

function analyzeSalesFamily(family, question, opts = {}) {
  const rows = loadSalesRows(opts);
  const now = opts.now instanceof Date ? opts.now : new Date("2026-09-18T12:00:00-06:00");
  const cutoff = physicalCutoff(rows, now);
  const plant_label = opts.plant_label || null;
  const spec = { family, question, plant_label, cutoff };

  if (family === "LOW_SALES_CARBURATION") {
    return finishSales(family, spec, { limitation: buildCarburationInsufficient(), audit: carburationGranularity() });
  }

  if (!cutoff && !rows.length && family !== "SALES_STATUS") {
    return finishSales(family, spec, {
      limitation: "INSUFFICIENT_EVIDENCE: no hay venta observada en arr.ventas_diarias_cliente para esa planta.",
    });
  }

  if (family === "SALES_STATUS") {
    const month = cutoff ? cutoff.slice(0, 7) : null;
    const observed_kg = sumKg(rows, (r) => !month || String(ymdOf(r.fecha) || "").startsWith(month));
    const recent = cutoff ? sumKg(rows, (r) => ymdOf(r.fecha) >= addDays(cutoff, -6) && ymdOf(r.fecha) <= cutoff) : 0;
    const prior = cutoff ? sumKg(rows, (r) => ymdOf(r.fecha) >= addDays(cutoff, -13) && ymdOf(r.fecha) <= addDays(cutoff, -7)) : 0;
    let pace_note = null;
    if (recent && prior) {
      pace_note =
        recent > prior
          ? "Ritmo reciente (7 días) por encima de la semana previa, con evidencia de venta diaria."
          : "Ritmo reciente (7 días) por debajo o igual a la semana previa, con evidencia de venta diaria.";
    }
    return finishSales(family, spec, {
      plant_label,
      cutoff,
      observed_kg,
      forecast_kg: opts.forecastKg != null ? Number(opts.forecastKg) : null,
      meta_kg: opts.metaKg != null ? Number(opts.metaKg) : null,
      pace_note,
    });
  }

  if (family === "PERIOD_COMPARISON_EXPLICIT") {
    const pair = extractMonthPair(question, now);
    if (!pair) {
      return finishSales(family, spec, { clarification: "¿Qué meses quieres comparar?" });
    }
    const a_obs = sumKg(rows, (r) => String(ymdOf(r.fecha) || "").startsWith(pair.month_a));
    const b_obs = sumKg(rows, (r) => String(ymdOf(r.fecha) || "").startsWith(pair.month_b));
    const aHasObs = a_obs > 0;
    const bHasObs = b_obs > 0;
    let a_kg = a_obs;
    let b_kg = b_obs;
    let a_kind = "observado";
    let b_kind = "observado";
    if (!aHasObs && opts.forecastByMonth && opts.forecastByMonth[pair.month_a] != null) {
      a_kg = Number(opts.forecastByMonth[pair.month_a]);
      a_kind = "forecast";
    }
    if (!bHasObs && opts.forecastByMonth && opts.forecastByMonth[pair.month_b] != null) {
      b_kg = Number(opts.forecastByMonth[pair.month_b]);
      b_kind = "forecast";
    }
    if (!aHasObs && a_kind === "observado" && !bHasObs && b_kind === "observado") {
      return finishSales(family, spec, {
        limitation: "INSUFFICIENT_EVIDENCE: no hay observado ni forecast para esos meses.",
      });
    }
    return finishSales(family, spec, {
      ...pair,
      a_kg,
      b_kg,
      a_kind,
      b_kind,
      cutoff,
    });
  }

  if (family === "SAME_PERIOD_PREVIOUS_MONTH") {
    if (!cutoff) {
      return finishSales(family, spec, { no_comparable: true });
    }
    const start = monthStart(cutoff);
    const current_kg = sumKg(rows, (r) => {
      const d = ymdOf(r.fecha);
      return d && d >= start && d <= cutoff;
    });
    const priorEnd = priorMonthSameDay(cutoff);
    const priorStart = monthStart(priorEnd);
    const prior_kg = sumKg(rows, (r) => {
      const d = ymdOf(r.fecha);
      return d && d >= priorStart && d <= priorEnd;
    });
    if (!prior_kg) {
      return finishSales(family, spec, { no_comparable: true, cutoff, current_kg, prior_kg: 0 });
    }
    return finishSales(family, spec, {
      cutoff,
      prior_cutoff: priorEnd,
      current_kg,
      prior_kg,
    });
  }

  if (family === "SALES_TODAY_WEEK_MONTH") {
    if (!cutoff) {
      return finishSales(family, spec, {
        limitation: "INSUFFICIENT_EVIDENCE: no hay MAX(fecha) de venta para armar hoy/semana/mes.",
      });
    }
    const weekStart = mondayOf(cutoff);
    const month = monthStart(cutoff);
    return finishSales(family, spec, {
      cutoff,
      today_kg: sumKg(rows, (r) => ymdOf(r.fecha) === cutoff),
      week_kg: sumKg(rows, (r) => {
        const d = ymdOf(r.fecha);
        return d && d >= weekStart && d <= cutoff;
      }),
      month_kg: sumKg(rows, (r) => {
        const d = ymdOf(r.fecha);
        return d && d >= month && d <= cutoff;
      }),
    });
  }

  if (family === "SALES_TREND_TO_CLOSE") {
    const month = cutoff ? cutoff.slice(0, 7) : null;
    const observed_kg = sumKg(rows, (r) => !month || String(ymdOf(r.fecha) || "").startsWith(month));
    const recent = cutoff ? sumKg(rows, (r) => ymdOf(r.fecha) >= addDays(cutoff, -6) && ymdOf(r.fecha) <= cutoff) : 0;
    const prior = cutoff ? sumKg(rows, (r) => ymdOf(r.fecha) >= addDays(cutoff, -13) && ymdOf(r.fecha) <= addDays(cutoff, -7)) : 0;
    let signal = null;
    if (recent && prior) {
      signal =
        recent > prior
          ? "el ritmo de los últimos 7 días supera al de los 7 previos."
          : "el ritmo de los últimos 7 días no supera al de los 7 previos.";
    }
    const forecast_kg = opts.forecastKg != null ? Number(opts.forecastKg) : null;
    let scenario = null;
    if (cutoff && recent) {
      const day = Number(cutoff.slice(8, 10));
      const remain = Math.max(0, 30 - day);
      const pace = recent / 7;
      const implied = observed_kg + pace * remain;
      scenario = `Con el ritmo actual, un escenario lineal llegaría cerca de ${formatTon(implied)}.`;
    }
    return finishSales(family, spec, {
      cutoff,
      observed_kg,
      forecast_kg,
      signal,
      scenario,
    });
  }

  return finishSales(family, spec, { limitation: "INSUFFICIENT_EVIDENCE: familia de venta no materializada." });
}

function buildKeywordExpenseAnswer(opts) {
  const records = Array.isArray(opts.records) ? opts.records : [];
  const concept = opts.concept || "llanta";
  const period = opts.period_label || "el periodo indicado";
  const paidOnly = Boolean(opts.paidOnly);
  const usable = records.filter((r) => {
    if (!rowMatchesKeywordConcept(r, concept)) return false;
    if (paidOnly) return String(r.estatus || "").toUpperCase() === "PAGADO";
    return true;
  });
  const sum = usable.reduce((acc, r) => acc + (Number.isFinite(Number(r.importe)) ? Number(r.importe) : 0), 0);
  const exclusive = usable.filter((r) => folioIsExclusiveConcept(r, concept)).length;
  const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(sum);
  const label = paidOnly ? "Importe pagado" : "Importe total registrado";
  const lines = [
    `De ${period} encontré ${usable.length} folios cuya descripción contiene "${concept}" (y sinónimos).`,
    `${label} de esos folios: ${money}.`,
    `Los folios coincidentes suman ${money} MXN.`,
    `El total corresponde a los importes completos de los folios coincidentes y no necesariamente al gasto exclusivo en ${
      concept === "llanta" ? "llantas" : concept
    }. Algunos folios incluyen otros conceptos, por lo que no todo el importe necesariamente corresponde exclusivamente a ${
      concept === "llanta" ? "llantas" : concept
    }.`,
  ];
  if (exclusive) lines.push(`${exclusive} folio(s) parecen exclusivamente de ${concept}; no estimo un reparto del resto.`);
  if (!paidOnly) {
    const paid = usable.filter((r) => String(r.estatus || "").toUpperCase() === "PAGADO").length;
    const cancelled = usable.filter((r) => String(r.estatus || "").toUpperCase() === "CANCELADO").length;
    if (cancelled) lines.push(`Hay ${cancelled} CANCELADO(s); no los trato como pagados.`);
    if (paid) lines.push(`De ellos, ${paid} están PAGADO.`);
  }
  return {
    ok: true,
    answer: lines.join("\n"),
    count: usable.length,
    sum,
    folio_ids: usable.map((r) => r.id || r.folio_id || r.numero_folio).filter(Boolean),
    concept,
    paidOnly,
  };
}

function plantClarification() {
  return "¿De qué planta?";
}

module.exports = {
  FAMILY_IDS,
  NON_PLANT_BUSINESS_TOKENS,
  nq,
  nclient,
  isNonPlantBusinessToken,
  extractMonthPair,
  classifyExecutiveContextFamily,
  isSalesContextFamily,
  isSalesStatusQuestion,
  isPlantDiagnosisCurrentQuestion,
  isPeriodComparisonQuestion,
  isSamePeriodPreviousQuestion,
  isTodayWeekMonthQuestion,
  isLowSalesCarburationQuestion,
  isTrendToCloseQuestion,
  isActiveClientFollowUpQuestion,
  isKeywordExpenseQuestion,
  normalizeKeywordConcept,
  keywordAliases,
  rowMatchesKeywordConcept,
  folioIsExclusiveConcept,
  resolveActiveClient,
  shouldClearActiveClient,
  carburationGranularity,
  buildCarburationInsufficient,
  analyzeSalesFamily,
  buildExecutiveSalesAnswer,
  buildKeywordExpenseAnswer,
  plantClarification,
  physicalCutoff,
  kgToTon,
};
