"use strict";

/**
 * Director IA — CLIENT_RANKING.
 * Ranking comercial TOP/BOTTOM por VENTA_TON sobre arr.ventas_diarias_cliente.
 * Reutiliza queryMonthlySales / canalSqlFor / resolvePlantCodes. Solo lectura.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { queryMonthlySales, queryMonthlyDiscount } = require("./director-ia-client-profile");
const { resolvePlantCodes, canalSqlFor } = require("./commercial-trend-engine");
const { extractNamedPlant } = require("./director-ia-historical-margin");
const { extractPlantLabel, assertSehPlantaAccess } = require("./director-ia-seh-operation-status");

const SEMANTIC_CLASS = "client_ranking";
const SOURCE_TABLE = "arr.ventas_diarias_cliente";

const MONTHS_ES = Object.freeze({
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
});

const NUMBER_WORDS = Object.freeze({
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
});

function normalizeText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function resolveNow(now) {
  const d = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function kgToTon(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return null;
  return Math.round((n / 1000) * 10) / 10;
}

function formatTon(ton) {
  if (ton == null) return "sin toneladas observadas";
  return `${ton.toFixed(1)} ton`;
}

function hasDiscountRankingCue(n) {
  return Boolean(
    /\bdescuento/.test(n) &&
      (/\btop\b/.test(n) ||
        /\bbottom\b/.test(n) ||
        /\branking\b/.test(n) ||
        /\bmayor(es)?\b/.test(n) ||
        /\bmenor(es)?\b/.test(n) ||
        /\bmas\s+descuento\b/.test(n) ||
        /\bencabeza\b/.test(n) ||
        /\ba\s+quien\s+le\s+damos\b/.test(n) ||
        /\bquien\s+tiene\b/.test(n) ||
        /\bpor\s+kg\b/.test(n) ||
        /\bdescuento\s+mas\s+(alto|bajo)\b/.test(n) ||
        /\bmas\s+alto\b/.test(n) ||
        /\bmas\s+bajo\b/.test(n) ||
        /\brecibe\s+mas\s+descuento\b/.test(n) ||
        /\bordenad[oa]s?\s+por\s+descuento\b/.test(n))
  );
}

function hasRankingCue(n) {
  return Boolean(
    hasDiscountRankingCue(n) ||
      /\btop\b/.test(n) ||
      /\bbottom\b/.test(n) ||
      /\branking\b/.test(n) ||
      /\bprincipales?\b/.test(n) ||
      /\bmayores?\b/.test(n) ||
      /\bmejores?\b/.test(n) ||
      /\blideran\b/.test(n) ||
      /\bcompradores?\b/.test(n) ||
      /\bquien(es)?\s+compr[oó]\s+mas\b/.test(n) ||
      /\bquien(es)?\s+compro\s+menos\b/.test(n) ||
      /\bcompr[oó]\s+menos\b/.test(n) ||
      /\bvendio\s+menos\b/.test(n) ||
      /\bquien\s+compro\s+mas\b/.test(n) ||
      /\bmas\s+compraron\b/.test(n) ||
      /\bmayor\s+venta\b/.test(n) ||
      /\bmas\s+toneladas\b/.test(n) ||
      /\bordenad[oa]s?\s+por\s+toneladas\b/.test(n) ||
      /\bclientes?\s+con\s+mayor\s+venta\b/.test(n) ||
      /\bclientes?\s+con\s+mas\s+toneladas\b/.test(n) ||
      /\bnumero\s+uno\b/.test(n) ||
      /\bel\s+primero\b/.test(n) ||
      /\bcompra\s+mas\b/.test(n) ||
      /\bcual\s+cliente\s+(es\s+el\s+que\s+)?me\s+compra\b/.test(n) ||
      /\bdame\s+los\s+\d+\s+de\s+casa\b/.test(n) ||
      /\btop\s+venta\s+casa\b/.test(n) ||
      /\branking\s+(comercial\s+)?de\s+clientes\b/.test(n) ||
      /\bclientes\s+lideres\b/.test(n)
  );
}

function hasClientSalesCue(n) {
  return Boolean(
    /\bclientes?\b/.test(n) ||
      /\bcomprador(?:es)?\b/.test(n) ||
      /\bventa\s+casa\b/.test(n) ||
      /\bventa\s+comisionista\b/.test(n) ||
      /\bcomisionistas?\b/.test(n) ||
      /\bcasa\b/.test(n) ||
      hasDiscountRankingCue(n)
  );
}

function isClientRankingDomainConflict(n) {
  return Boolean(
    /\b(folios?|apoyos?)\b/.test(n) ||
      /\b(gasto|gastos|gaste|gastamos|gastado)\b/.test(n) ||
      /\bacciones?\b/.test(n) ||
      /\bbitacora\b/.test(n) ||
      /\bcomo\s+vamos\b/.test(n) ||
      /\bestaciones?\b/.test(n) ||
      /\bextintor/.test(n)
  );
}

function isClientRankingQuestion(question) {
  const n = normalizeText(question);
  if (!n || isClientRankingDomainConflict(n)) return false;
  if (/\bcomo\s+vamos\s+con\s+clientes\b/.test(n) && !hasRankingCue(n)) return false;
  if (/\bcuanto\s+vendimos\b/.test(n) && !hasRankingCue(n)) return false;
  if (hasDiscountRankingCue(n) && (/\bdisminuy|\baument|\bdelta\b|\banterior\b|\bantes\b|\bcambio\b|\breduc|\balzas?\b|\bbajas?\b/.test(n))) {
    return false;
  }
  return hasRankingCue(n) && hasClientSalesCue(n);
}

function isClientRankingFollowUp(question) {
  const n = normalizeText(question);
  if (!n || isClientRankingDomainConflict(n)) return false;
  return Boolean(
    /\bcuanto\s+compro\s+el\s+(primero|segundo|tercero)\b/.test(n) ||
      /\by\s+el\s+(segundo|tercero|primero)\b/.test(n) ||
      /\bquien\s+fue\s+el\s+numero\s+uno\b/.test(n) ||
      /\bahora\s+dame\s+top\b/.test(n) ||
      /\by\s+solo\s+(los\s+de\s+)?casa\b/.test(n) ||
      /\by\s+solo\s+[a-z]/.test(n) ||
      /\by\s+en\s+[a-z]/.test(n) ||
      /\by\s+solo\s+los\s+de\b/.test(n) ||
      /\bahora\s+dame\s+top\b/.test(n) ||
      /\bahora\s+top\b/.test(n) ||
      /\bdame\s+el\s+bottom\b/.test(n) ||
      /\bcompara\s+contra\b/.test(n) ||
      /\bcual\s+es\s+el\s+delta\b/.test(n) ||
      /\by\s+comisionistas?\b/.test(n) ||
      /\bcual\s+vendio\s+menos\b/.test(n) ||
      /\bque\s+descuento\s+tuvo\b/.test(n) ||
      /\bcontra\s+el\s+mes\s+pasado\b/.test(n) ||
      /\bquien\s+quedo\s+tercero\b/.test(n) ||
      /\bel\s+(primero|segundo|tercero|cuarto|quinto)\b/.test(n) ||
      /\bnumero\s+uno\b/.test(n) ||
      /\bdame\s+bottom\b/.test(n) ||
      /\bbottom\s+\d+\b/.test(n)
  );
}

function extractLimit(n, prior) {
  const digit = n.match(/\btop\s+(\d{1,2})\b/) || n.match(/\blos\s+(\d{1,2})\s+clientes\b/) || n.match(/\b(\d{1,2})\s+clientes\b/);
  if (digit) {
    const v = Number(digit[1]);
    if (v >= 1 && v <= 20) return v;
  }
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\s+clientes\\b`).test(n) || new RegExp(`\\btop\\s+${word}\\b`).test(n)) {
      return value;
    }
  }
  if (/\bnumero\s+uno\b/.test(n) || /\bel\s+primero\b/.test(n) && !/\btop\b/.test(n)) return prior && prior.limit ? prior.limit : 1;
  return prior && prior.limit ? prior.limit : 5;
}

function extractDirection(n, prior) {
  if (/\bmenos\b/.test(n) || /\bbottom\b/.test(n) || /\bpeores\b/.test(n) || /\bmenor(es)?\s+descuento/.test(n) || /\bdescuento\s+mas\s+bajo\b/.test(n)) {
    return "BOTTOM";
  }
  if (hasRankingCue(n) || !prior) return "TOP";
  return prior.ranking_direction || "TOP";
}

function extractMetric(n, prior) {
  if (hasDiscountRankingCue(n)) return "DESCUENTO_POR_KG";
  if (/\b(venta|toneladas?|compraron|compr[oó]|volumen)\b/.test(n)) return "VENTA_TON";
  if (prior && prior.metric) return prior.metric;
  return "VENTA_TON";
}

function isDualSegmentRanking(n) {
  return /\bcasa\b/.test(n) && /\bcomisionistas?\b/.test(n);
}

function extractSegment(n, prior) {
  if (/\bcomisionistas?\b/.test(n) || /\bventa\s+comisionista\b/.test(n)) return "COMISIONISTA";
  if (/\bcasa\b/.test(n) || /\bventa\s+casa\b/.test(n)) return "CASA";
  if (prior && prior.customer_segment) return prior.customer_segment;
  return "ALL";
}

function extractPeriodYm(n, now, prior, selectedPeriod, latestArrPeriod) {
  for (const [name, mm] of Object.entries(MONTHS_ES)) {
    if (new RegExp(`\\b${name}\\b`).test(n)) {
      const yearM = n.match(/\b(20\d{2})\b/);
      const year = yearM ? yearM[1] : String(resolveNow(now).year);
      return { period: `${year}-${mm}`, origin: "explicit" };
    }
  }
  if (/\b(este mes|mes actual)\b/.test(n)) {
    const cur = resolveNow(now);
    return { period: `${cur.year}-${pad2(cur.month)}`, origin: "explicit" };
  }
  if (prior && prior.period) return { period: prior.period, origin: "conversation" };
  if (selectedPeriod && /^\d{4}-\d{2}$/.test(selectedPeriod)) {
    return { period: selectedPeriod, origin: "arr_selected" };
  }
  if (latestArrPeriod && /^\d{4}-\d{2}$/.test(latestArrPeriod)) {
    return { period: latestArrPeriod, origin: "latest_arr" };
  }
  return { period: null, origin: null };
}

function extractOrdinalIndex(n) {
  if (/\b(primero|numero\s+uno|1)\b/.test(n) && !/\btop\s+1\b/.test(n) || /\bel\s+primero\b/.test(n) || /\bnumero\s+uno\b/.test(n)) {
    if (/\bsegundo\b/.test(n)) return 2;
    if (/\btercero\b/.test(n)) return 3;
    return 1;
  }
  if (/\bsegundo\b/.test(n)) return 2;
  if (/\btercero\b/.test(n)) return 3;
  return null;
}

function extractClientRankingSpec(question, prior, opts = {}) {
  const n = normalizeText(question);
  const usable = prior && prior.ok ? prior : null;
  const follow = Boolean(usable && isClientRankingFollowUp(question));
  if (!isClientRankingQuestion(question) && !follow) return { ok: false };
  const plant_label = extractNamedPlant(question) || extractPlantLabel(question) || (follow && usable ? usable.plant_label : null);
  const resolvedPeriod = extractPeriodYm(n, opts.now, usable, opts.selectedPeriod, opts.latestArrPeriod);
  return {
    ok: true,
    semantic_class: SEMANTIC_CLASS,
    ranking_direction: extractDirection(n, usable),
    limit: extractLimit(n, usable),
    customer_segment: isDualSegmentRanking(n) ? "DUAL" : extractSegment(n, usable),
    metric: extractMetric(n, usable),
    plant_label,
    period: resolvedPeriod.period,
    period_origin: resolvedPeriod.origin,
    ordinal: extractOrdinalIndex(n),
    wants_discount: /\bdescuento\b/.test(n) || extractMetric(n, usable) === "DESCUENTO_POR_KG",
    wants_prior_month: /\bmes\s+pasado\b/.test(n),
    follow,
  };
}

function canalFilterForSegment(segment) {
  if (segment === "CASA") return "casa";
  if (segment === "COMISIONISTA") return "comisionista";
  return "ambos";
}

function rankDualSegment(rows, spec, discountRows, previousDiscountRows) {
  const casa = rankClients(
    (rows || []).filter((row) => /casa/i.test(String(row.canal || ""))),
    { ...spec, customer_segment: "CASA", limit: 1 },
    discountRows,
    previousDiscountRows
  );
  const comi = rankClients(
    (rows || []).filter((row) => /comision/i.test(String(row.canal || ""))),
    { ...spec, customer_segment: "COMISIONISTA", limit: 1 },
    discountRows,
    previousDiscountRows
  );
  return [...casa.map((row) => ({ ...row, canal: "Casa" })), ...comi.map((row) => ({ ...row, canal: "Comisionista" }))];
}

function rankClients(rows, spec, discountRows, previousDiscountRows) {
  const map = new Map();
  for (const row of rows || []) {
    const name = String((row && row.cliente_norm) || "").trim();
    if (!name) continue;
    const kg = Number(row.kg);
    if (!Number.isFinite(kg)) continue;
    const prev = map.get(name) || { cliente: name, kg: 0, canal: row.canal || null, monto: 0, hasDiscount: false };
    prev.kg += kg;
    map.set(name, prev);
  }
  for (const row of discountRows || []) {
    const name = String((row && row.cliente_norm) || "").trim();
    if (!name) continue;
    const prev = map.get(name) || { cliente: name, kg: 0, canal: row.canal || null, monto: 0, hasDiscount: false };
    prev.monto = (prev.monto || 0) + Number(row.monto || 0);
    prev.hasDiscount = true;
    map.set(name, prev);
  }
  const prevDisc = new Map();
  for (const row of previousDiscountRows || []) {
    const name = String((row && row.cliente_norm) || "").trim();
    if (!name) continue;
    const prev = prevDisc.get(name) || { monto: 0, kg: 0 };
    prev.monto += Number(row.monto || 0);
    prevDisc.set(name, prev);
  }
  const list = [...map.values()].map((item) => {
    const discount_actual =
      item.hasDiscount && item.kg > 0 && Number.isFinite(item.monto) ? item.monto / item.kg : null;
    const prev = prevDisc.get(item.cliente);
    const discount_anterior = prev && item.kg > 0 && prev.monto != null ? null : prev && prev.kg > 0 ? prev.monto / prev.kg : null;
    const prevDiscount =
      prev && Number.isFinite(prev.monto) && item.kg > 0
        ? null
        : prev && Number.isFinite(prev.monto) && Number(prev.kg) > 0
          ? prev.monto / prev.kg
          : null;
    void discount_anterior;
    return {
      cliente: item.cliente,
      kg: item.kg,
      venta_ton: kgToTon(item.kg),
      venta_ton_raw: item.kg / 1000,
      canal: item.canal,
      descuento_actual: discount_actual,
      descuento_anterior: prevDiscount,
      delta_descuento:
        discount_actual != null && prevDiscount != null ? discount_actual - prevDiscount : null,
    };
  });
  if (spec.metric === "DESCUENTO_POR_KG") {
    const withDiscount = list.filter((item) => item.descuento_actual != null);
    withDiscount.sort((a, b) =>
      spec.ranking_direction === "BOTTOM" ? a.descuento_actual - b.descuento_actual : b.descuento_actual - a.descuento_actual
    );
    return withDiscount.slice(0, spec.limit || 5);
  }
  list.sort((a, b) => (spec.ranking_direction === "BOTTOM" ? a.kg - b.kg : b.kg - a.kg));
  return list.slice(0, spec.limit || 5);
}

function buildClientRankingAnswer(payload) {
  if (!payload) return "No pude consultar el ranking de clientes.";
  if (payload.clarification) return payload.clarification;
  if (payload.ok === false) return payload.error || "No pude consultar el ranking de clientes.";
  const spec = payload.spec || {};
  const ranked = payload.ranked || [];
  if (spec.wants_discount && payload.discount_available !== true) {
    return "No tengo evidencia de descuento para ese cliente en el periodo consultado. No invento el valor.";
  }
  if (spec.ordinal) {
    const hit = ranked[spec.ordinal - 1];
    if (!hit) return `No hay un cliente en la posición ${spec.ordinal} del ranking actual.`;
    if (spec.wants_discount) {
      return `${hit.cliente} tuvo descuento observado de ${payload.discount_label}.`;
    }
    return `${spec.ordinal === 1 ? "El primero" : spec.ordinal === 2 ? "El segundo" : "El tercero"} es ${hit.cliente} con ${formatTon(hit.venta_ton)}.`;
  }
  if (!ranked.length) {
    return `No encontré clientes con venta observada para ${spec.customer_segment} en ${spec.plant_label || "la planta"} (${spec.period || "periodo no determinado"}).`;
  }
  const periodBit =
    spec.period_origin === "latest_arr"
      ? `Tomando ${spec.period}, último periodo disponible en ARR`
      : spec.period;
  const metricBit = spec.metric === "DESCUENTO_POR_KG" ? "descuento $/kg" : spec.customer_segment === "ALL" ? "venta" : spec.customer_segment === "CASA" ? "Venta Casa" : spec.customer_segment === "DUAL" ? "casa y comisionista" : "Venta Comisionista";
  const title = `${spec.ranking_direction === "BOTTOM" ? "Bottom" : "Top"} ${ranked.length} clientes de ${metricBit} — ${spec.plant_label || "planta"} — ${periodBit}`;
  const lines = ranked.map((row, i) => {
    if (spec.metric === "DESCUENTO_POR_KG") {
      const current = row.descuento_actual != null ? `${row.descuento_actual.toFixed(3)} $/kg` : "sin descuento observado";
      const prev = row.descuento_anterior != null ? ` | anterior ${row.descuento_anterior.toFixed(3)} $/kg` : "";
      const delta = row.delta_descuento != null ? ` | delta ${row.delta_descuento.toFixed(3)} $/kg` : "";
      return `${i + 1}. ${row.cliente} — ${current}${prev}${delta} — ${spec.period} — ${spec.customer_segment} — ${spec.plant_label || "planta"}`;
    }
    return `${i + 1}. ${row.cliente} — ${formatTon(row.venta_ton)}`;
  });
  return [title, "", ...lines].join("\n");
}

async function loadClientRankingForChat(pool, plantaId, req, opts = {}) {
  const now = opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();
  const question = opts.question || "";
  const prior = opts.priorSpec && opts.priorSpec.ok ? opts.priorSpec : null;
  const spec = extractClientRankingSpec(question, prior, {
    now,
    selectedPeriod: opts.selectedPeriod,
    latestArrPeriod: opts.latestArrPeriod,
  });
  if (!spec.ok) {
    return { ok: false, error: "No pude determinar el ranking de clientes.", spec, now };
  }
  if (!spec.period && !opts.latestArrPeriod && typeof opts.queryLatestArrPeriod === "function") {
    try {
      const latest = await opts.queryLatestArrPeriod(opts.db || pool, opts.plantCodes || null);
      if (latest && /^\d{4}-\d{2}$/.test(latest)) {
        spec.period = latest;
        spec.period_origin = "latest_arr";
      }
    } catch (_e) {
      /* fail closed to clarification */
    }
  } else if (!spec.period && opts.latestArrPeriod && /^\d{4}-\d{2}$/.test(opts.latestArrPeriod)) {
    spec.period = opts.latestArrPeriod;
    spec.period_origin = "latest_arr";
  }
  if (!spec.period) {
    return {
      ok: true,
      clarification: "Indica el mes del ranking. No invento el periodo.",
      spec,
      now,
      ranked: [],
    };
  }
  const selectedId = Number(plantaId);
  let plantIdToUse = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null;
  let plantLabel = spec.plant_label || opts.plant_label || null;
  if (spec.plant_label && typeof opts.resolvePlantByNombre === "function") {
    const row = await opts.resolvePlantByNombre(opts.db || pool, spec.plant_label);
    if (!row || !Number(row.id)) {
      return {
        ok: true,
        clarification: `No pude resolver la planta "${spec.plant_label}". No consulto otra planta.`,
        spec,
        now,
        ranked: [],
      };
    }
    plantIdToUse = Number(row.id);
    plantLabel = row.nombre || spec.plant_label;
  } else if (spec.plant_label && opts.plantCatalog) {
    const n = normalizeText(spec.plant_label);
    const row = (opts.plantCatalog || []).find(
      (p) => normalizeText(p.nombre || p.label) === n || (p.keys || []).map(normalizeText).includes(n)
    );
    if (!row) {
      return {
        ok: true,
        clarification: `No pude resolver la planta "${spec.plant_label}". No consulto otra planta.`,
        spec,
        now,
        ranked: [],
      };
    }
    plantIdToUse = Number(row.id);
    plantLabel = row.nombre || row.label || spec.plant_label;
  }
  if (!plantIdToUse) {
    return {
      ok: true,
      clarification: "¿De qué planta quieres el ranking de clientes?",
      spec,
      now,
      ranked: [],
    };
  }
  spec.plant_id = plantIdToUse;
  spec.plant_label = plantLabel;
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const denied = assertSehPlantaAccess(auth, plantIdToUse);
  if (!denied.ok) return { ...denied, spec, now };

  const [y, m] = spec.period.split("-").map(Number);
  const startStr = `${spec.period}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const endStr = `${spec.period}-${pad2(lastDay)}`;
  const canalFilter = canalFilterForSegment(spec.customer_segment);

  let rows = [];
  try {
    if (Array.isArray(opts.salesRows)) {
      rows = opts.salesRows;
    } else {
      const resolveCodes = opts.resolvePlantCodes || resolvePlantCodes;
      const qSales = opts.queryMonthlySales || queryMonthlySales;
      let codes = opts.plantCodes;
      if (!codes) {
        const plantName = plantLabel || spec.plant_label;
        const resolved = await resolveCodes(opts.db || pool, plantName);
        codes = resolved && resolved.uniqueCodes;
      }
      if (!codes || !codes.length) {
        return {
          ok: false,
          status: 400,
          code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
          error: "No pude resolver el código ARR de la planta. No invento clientes.",
          spec,
          now,
        };
      }
      const result = await qSales(opts.db || pool, codes, startStr, endStr, canalFilter);
      rows = (result && result.rows) || result || [];
    }
  } catch (e) {
    return {
      ok: false,
      status: 500,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      error: e && e.message ? e.message : "No se pudo leer arr.ventas_diarias_cliente",
      spec,
      now,
    };
  }

  let discountRows = Array.isArray(opts.discountRows) ? opts.discountRows : null;
  let previousDiscountRows = Array.isArray(opts.previousDiscountRows) ? opts.previousDiscountRows : [];
  if ((spec.metric === "DESCUENTO_POR_KG" || spec.wants_discount) && !discountRows) {
    if (opts.discountByClient) {
      discountRows = Object.entries(opts.discountByClient).map(([cliente_norm, label]) => {
        const n = Number(String(label).replace(/[^\d.-]/g, ""));
        return { cliente_norm, monto: Number.isFinite(n) ? n : 0 };
      });
    } else {
      try {
        const qDisc = opts.queryMonthlyDiscount || queryMonthlyDiscount;
        const result = await qDisc(opts.db || pool, opts.plantCodes || [], startStr, endStr, canalFilter);
        discountRows = (result && result.rows) || result || [];
      } catch (_e) {
        discountRows = [];
      }
    }
  }
  const ranked =
    spec.customer_segment === "DUAL"
      ? rankDualSegment(rows, spec, discountRows, previousDiscountRows)
      : rankClients(rows, spec, discountRows, previousDiscountRows);
  let discount_available = ranked.some((row) => row.descuento_actual != null);
  let discount_label = null;
  if (spec.wants_discount && spec.ordinal && ranked[spec.ordinal - 1] && ranked[spec.ordinal - 1].descuento_actual != null) {
    discount_available = true;
    discount_label = `${ranked[spec.ordinal - 1].descuento_actual.toFixed(3)} $/kg`;
  } else if (spec.wants_discount && spec.metric !== "DESCUENTO_POR_KG" && !discount_available) {
    if (opts.discountByClient && spec.ordinal && ranked[spec.ordinal - 1]) {
      const name = ranked[spec.ordinal - 1].cliente;
      if (Object.prototype.hasOwnProperty.call(opts.discountByClient, name)) {
        discount_available = true;
        discount_label = opts.discountByClient[name];
      }
    }
  }
  return {
    ok: true,
    spec,
    ranked,
    now,
    planta_id: plantIdToUse,
    discount_available,
    discount_label,
    source: SOURCE_TABLE,
    canal_sql_helper: typeof canalSqlFor === "function",
  };
}

function encodeRankingPrior(spec, ranked) {
  if (!spec || !spec.ok) return null;
  return {
    kind: "client_ranking",
    key: spec.period || "",
    display: spec.plant_label || "CLIENT_RANKING",
    ranking_direction: spec.ranking_direction,
    limit: spec.limit,
    customer_segment: spec.customer_segment,
    metric: spec.metric || "VENTA_TON",
    plant_label: spec.plant_label,
    plant_id: spec.plant_id,
    period: spec.period,
    ranked_names: (ranked || []).map((row) => row.cliente).slice(0, 20),
    entity_names: (ranked || []).map((row) => row.cliente).slice(0, 20),
    entities: (ranked || []).slice(0, 20).map((row) => ({ display: row.cliente, key: row.cliente, canal: row.canal })),
  };
}

function priorRankingFromState(state) {
  if (!state || state.parent_intent !== "client_ranking") return null;
  const ent = Array.isArray(state.active_entities) ? state.active_entities[0] : null;
  if (!ent) return null;
  return {
    ok: true,
    ranking_direction: ent.ranking_direction || "TOP",
    limit: Number(ent.limit) || 5,
    customer_segment: ent.customer_segment || "ALL",
    metric: ent.metric === "DESCUENTO_POR_KG" ? "DESCUENTO_POR_KG" : "VENTA_TON",
    plant_label: ent.plant_label || null,
    plant_id: ent.plant_id || null,
    period: ent.period || ent.key || null,
    entity_names: Array.isArray(ent.entity_names)
      ? ent.entity_names
      : Array.isArray(ent.ranked_names)
        ? ent.ranked_names
        : [],
  };
}

function buildClientRankingChatResult(payload, opts = {}) {
  const answer = buildClientRankingAnswer(payload);
  const spec = payload && payload.spec;
  const entity = encodeRankingPrior(spec, payload && payload.ranked);
  const plantaId = payload && payload.planta_id != null ? payload.planta_id : opts.planta_id;
  return {
    ok: true,
    answer,
    sources: payload && payload.ok !== false ? [SOURCE_TABLE] : [],
    context_meta: {
      mode: SEMANTIC_CLASS,
      openai_called: false,
      veracity:
        payload && payload.ok === false
          ? payload.code || DIRECTOR_IA_VERACITY.SOURCE_ERROR
          : DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
      semantic_class: SEMANTIC_CLASS,
      planta_id: plantaId,
      conversation_state: {
        parent_intent: "client_ranking",
        planta_id: plantaId,
        active_subtopic: "client_ranking",
        active_entities: entity ? [entity] : [],
      },
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SOURCE_TABLE,
  isClientRankingQuestion,
  isClientRankingFollowUp,
  extractClientRankingSpec,
  rankClients,
  rankDualSegment,
  hasDiscountRankingCue,
  loadClientRankingForChat,
  buildClientRankingAnswer,
  buildClientRankingChatResult,
  priorRankingFromState,
};
