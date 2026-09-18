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

function hasRankingCue(n) {
  return Boolean(
    /\btop\b/.test(n) ||
      /\bbottom\b/.test(n) ||
      /\branking\b/.test(n) ||
      /\bprincipales?\b/.test(n) ||
      /\bmayores?\b/.test(n) ||
      /\bmejores?\b/.test(n) ||
      /\blideran\b/.test(n) ||
      /\blidera\b/.test(n) ||
      /\blider\b/.test(n) ||
      /\bcompradores?\b/.test(n) ||
      /\bmayor\s+comprador\b/.test(n) ||
      /\blider\s+de\s+cada\s+canal\b/.test(n) ||
      /\bquien\s+vendio\s+mas\b/.test(n) ||
      /\bpor\s+canal\b/.test(n) ||
      /\bquien(es)?\s+compr[oó]\s+mas\b/.test(n) ||
      /\bquien(es)?\s+compro\s+menos\b/.test(n) ||
      /\bcompr[oó]\s+menos\b/.test(n) ||
      /\bvendio\s+menos\b/.test(n) ||
      /\bquien\s+compro\s+mas\b/.test(n) ||
      /\bcliente\s+compro\s+mas\b/.test(n) ||
      /\bcompro\s+mas\b/.test(n) ||
      /\bquien\s+compra\s+mas\b/.test(n) ||
      /\bcompra\s+mas\b/.test(n) ||
      /\bcompran\s+mas\b/.test(n) ||
      /\bquienes\s+compran\s+mas\b/.test(n) ||
      /\bquienes\s+mas\s+compran\b/.test(n) ||
      /\bmas\s+compran\b/.test(n) ||
      /\bvenden\s+mas\b/.test(n) ||
      /\bmas\s+compraron\b/.test(n) ||
      /\bcompraron\s+mas\b/.test(n) ||
      /\bmas\s+compra\b/.test(n) ||
      /\bpor\s+compra\b/.test(n) ||
      /\bpor\s+toneladas\b/.test(n) ||
      /\blos\s+que\s+mas\s+compran\b/.test(n) ||
      /\bencabezan\b/.test(n) ||
      /\borden/.test(n) && (/\bcompra/.test(n) || /\bventa/.test(n)) ||
      /\bordenad[oa]s?\s+por\s+venta\b/.test(n) ||
      /\bmayor\s+venta\b/.test(n) ||
      /\bmas\s+venta\b/.test(n) ||
      /\bmayor\s+compra\b/.test(n) ||
      /\bmas\s+toneladas\b/.test(n) ||
      /\bordenad[oa]s?\s+por\s+toneladas\b/.test(n) ||
      /\bclientes?\s+con\s+mayor\s+venta\b/.test(n) ||
      /\bclientes?\s+con\s+mas\s+toneladas\b/.test(n) ||
      /\bnumero\s+uno\b/.test(n) ||
      /\bel\s+primero\b/.test(n) ||
      /\bdescuento/.test(n) && (/\btop\b/.test(n) || /\bmayor/.test(n) || /\bmenor/.test(n) || /\bquien/.test(n))
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
      /\bcanal(?:es)?\b/.test(n) ||
      /\bdescuento/.test(n) ||
      /\bquien(?:es)?\s+(?:compra|compran|compro|compraron)\b/.test(n) ||
      /\bquien(?:es)?\s+mas\s+(?:compra|compran|compro|compraron)\b/.test(n) ||
      /\bcomercial\b/.test(n) ||
      (/\bventa\b/.test(n) && (/\branking\b/.test(n) || /\btop\b/.test(n) || /\bmayor\b/.test(n) || /\bencabezan\b/.test(n) || /\blider/.test(n))) ||
      /\btoneladas\b/.test(n) ||
      /\bcompran\b/.test(n) ||
      /\bcompras\b/.test(n) ||
      (/\btop\b/.test(n) && !isClientRankingDomainConflict(n))
  );
}

function isClientRankingDomainConflict(n) {
  return Boolean(
    (/\babre\b/.test(n) && !/\bclientes?\b/.test(n) && !/\bcomprador/.test(n)) ||
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
  return hasRankingCue(n) && hasClientSalesCue(n);
}

function isClientRankingFollowUp(question) {
  const n = normalizeText(question);
  if (!n) return false;
  if (require("./director-ia-executive-backlog").isIndividualDiscountLookupQuestion(question)) return false;
  if (isClientRankingDomainConflict(n) && !/\b(acciones?|comentarios?)\b/.test(n)) return false;
  return Boolean(
    /\bcuanto\s+compro\s+el\s+(primero|segundo|tercero)\b/.test(n) ||
      /\by\s+el\s+(segundo|tercero|primero)\b/.test(n) ||
      /\bquien\s+fue\s+el\s+numero\s+uno\b/.test(n) ||
      /\bahora\s+dame\s+top\b/.test(n) ||
      /\by\s+solo\s+los\s+de\b/.test(n) ||
      /\by\s+comisionistas?\b/.test(n) ||
      /\bcual\s+vendio\s+menos\b/.test(n) ||
      /\bque\s+descuento\s+tuvo\b/.test(n) ||
      /\bcontra\s+el\s+mes\s+pasado\b/.test(n) ||
      /\bquien\s+quedo\s+tercero\b/.test(n) ||
      /\bquien\s+quedo\s+segundo\b/.test(n) ||
      /\bquedo\s+(primero|segundo|tercero)\b/.test(n) ||
      /\bel\s+primero\b/.test(n) ||
      /\bnumero\s+uno\b/.test(n) ||
      /\bcuanto\s+disminuy/.test(n) ||
      /\bcompraban\b/.test(n) ||
      /\bcomparalos\b/.test(n) ||
      /\bcompar/.test(n) ||
      /\bcual\s+cayo\s+mas\b/.test(n) ||
      /\bbajaron\b/.test(n) ||
      /\bdescuento/.test(n) ||
      /\bcomentarios?\b/.test(n) ||
      /\bacciones?\b/.test(n) ||
      require("./director-ia-pending-completion").isPeriodOnlyAnswer(question) ||
      /\bsolo\s+casa\b/.test(n) ||
      /\bsolo\s+los\s+de\s+(casa|comisionistas?)\b/.test(n) ||
      /\bsolo\s+comisionistas?\b/.test(n) ||
      /\bahora\s+(los\s+de\s+)?comisionistas?\b/.test(n) ||
      /\bahora\s+top\s+\d+\b/.test(n) ||
      /\btop\s+\d+\b/.test(n) ||
      /\bcompara\b/.test(n) ||
      /\bcontra\s+(agosto|septiembre|el\s+mes\s+pasado)\b/.test(n) ||
      /\b(y\s+en|ahora)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(n) ||
      /\b(este mes|mes actual|mes pasado)\b/.test(n)
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
  if (/\bmenos\b/.test(n) || /\bbottom\b/.test(n) || /\bpeores\b/.test(n)) return "BOTTOM";
  if (hasRankingCue(n) || !prior) return "TOP";
  return prior.ranking_direction || "TOP";
}

function extractSegment(n, prior) {
  const hasCasa = /\bcasa\b/.test(n) || /\bventa\s+casa\b/.test(n);
  const hasCom = /\bcomisionistas?\b/.test(n) || /\bventa\s+comisionista\b/.test(n);
  if (hasCasa && hasCom) return "DUAL";
  if (hasCom) return "COMISIONISTA";
  if (hasCasa) return "CASA";
  if (prior && prior.customer_segment) return prior.customer_segment;
  return "ALL";
}

function isOpenCalendarMonth(period, now) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return false;
  const cur = resolveNow(now);
  return period === `${cur.year}-${pad2(cur.month)}`;
}

function previousYearMonth(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return null;
  let year = Number(period.slice(0, 4));
  let month = Number(period.slice(5, 7)) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${pad2(month)}`;
}

function walkBackYearMonths(period, maxSteps = 12) {
  const out = [];
  let cur = period;
  for (let i = 0; i < maxSteps; i += 1) {
    cur = previousYearMonth(cur);
    if (!cur) break;
    out.push(cur);
  }
  return out;
}

const MONTH_LABELS_ES = Object.freeze({
  "01": "enero",
  "02": "febrero",
  "03": "marzo",
  "04": "abril",
  "05": "mayo",
  "06": "junio",
  "07": "julio",
  "08": "agosto",
  "09": "septiembre",
  "10": "octubre",
  "11": "noviembre",
  "12": "diciembre",
});

function formatMonthLabel(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period || "ese periodo";
  const name = MONTH_LABELS_ES[period.slice(5, 7)];
  return name ? `${name} de ${period.slice(0, 4)}` : period;
}

function periodBounds(period) {
  const [y, m] = String(period || "").split("-").map(Number);
  if (!y || !m) return null;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { startStr: `${period}-01`, endStr: `${period}-${pad2(lastDay)}` };
}

function extractPeriodYm(n, now, prior, selectedPeriod) {
  for (const [name, mm] of Object.entries(MONTHS_ES)) {
    if (new RegExp(`\\b${name}\\b`).test(n)) {
      const yearM = n.match(/\b(20\d{2})\b/);
      const year = yearM ? yearM[1] : String(resolveNow(now).year);
      return `${year}-${mm}`;
    }
  }
  if (/\b(este mes|mes actual)\b/.test(n)) {
    const cur = resolveNow(now);
    return `${cur.year}-${pad2(cur.month)}`;
  }
  if (/\bmes\s+pasado\b/.test(n) && !/\bcontra\b/.test(n)) {
    const cur = resolveNow(now);
    return previousYearMonth(`${cur.year}-${pad2(cur.month)}`);
  }
  if (prior && prior.period) return prior.period;
  if (selectedPeriod && /^\d{4}-\d{2}$/.test(selectedPeriod)) return selectedPeriod;
  return null;
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
  const period = extractPeriodYm(n, opts.now, usable, opts.selectedPeriod);
  return {
    ok: true,
    semantic_class: SEMANTIC_CLASS,
    ranking_direction: extractDirection(n, usable),
    limit: extractLimit(n, usable),
    customer_segment: extractSegment(n, usable),
    metric:
      /\bdescuento/.test(n)
        ? "DISCOUNT"
        : usable && usable.metric === "DISCOUNT" && !/\b(compra|venta|tonelada)/.test(n)
          ? "DISCOUNT"
          : "VENTA_TON",
    plant_label,
    period,
    ordinal: extractOrdinalIndex(n),
    wants_discount: /\bdescuento\b/.test(n),
    wants_prior_month: /\bmes\s+pasado\b/.test(n),
    follow,
  };
}

function canalFilterForSegment(segment) {
  if (segment === "CASA") return "casa";
  if (segment === "COMISIONISTA") return "comisionista";
  return "ambos";
}

function rankByDiscount(rows, spec) {
  const map = new Map();
  for (const row of rows || []) {
    const name = String((row && row.cliente_norm) || "").trim();
    if (!name) continue;
    const monto = Number(row.monto);
    if (!Number.isFinite(monto)) continue;
    const prev = map.get(name) || { cliente: name, monto: 0, canal: row.canal || null };
    prev.monto += monto;
    map.set(name, prev);
  }
  const list = [...map.values()].map((item) => ({
    cliente: item.cliente,
    monto: item.monto,
    venta_ton: 0,
    canal: item.canal,
  }));
  list.sort((a, b) => (spec.ranking_direction === "BOTTOM" || spec.direction === "LOW" ? a.monto - b.monto : b.monto - a.monto));
  return list.slice(0, spec.limit || 5);
}

function rankClients(rows, spec) {
  const map = new Map();
  for (const row of rows || []) {
    const name = String((row && row.cliente_norm) || "").trim();
    if (!name) continue;
    const kg = Number(row.kg);
    if (!Number.isFinite(kg)) continue;
    const prev = map.get(name) || { cliente: name, kg: 0, canal: row.canal || null };
    prev.kg += kg;
    map.set(name, prev);
  }
  const list = [...map.values()].map((item) => ({
    cliente: item.cliente,
    kg: item.kg,
    venta_ton: kgToTon(item.kg),
    canal: item.canal,
  }));
  list.sort((a, b) => (spec.ranking_direction === "BOTTOM" ? a.kg - b.kg : b.kg - a.kg));
  return list.slice(0, spec.limit || 5);
}

function buildClientRankingAnswer(payload) {
  if (!payload) return "No pude consultar el ranking de clientes.";
  if (payload.clarification) return payload.clarification;
  if (payload.ok === false) return payload.error || "No pude consultar el ranking de clientes.";
  const spec = payload.spec || {};
  const ranked = payload.ranked || [];
  const aggregateDiscount = spec.metric === "DISCOUNT";
  if (spec.wants_discount && !aggregateDiscount && spec.ordinal && payload.discount_available !== true) {
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
  if (payload.data_semantics === "LAST_SAFE_CUT" && ranked.length) {
    const asked = payload.asked_period || spec.period;
    const lines = ranked.map((row, i) =>
      spec.metric === "DISCOUNT"
        ? `${i + 1}. ${row.cliente} — descuento total observado ${Number(row.monto).toLocaleString("es-MX")}`
        : `${i + 1}. ${row.cliente} — ${formatTon(row.venta_ton)}`
    );
    return [
      `No tengo datos observados por cliente cargados para ${formatMonthLabel(asked)}.`,
      `El último ranking disponible es ${formatMonthLabel(spec.period)}:`,
      ...lines,
    ].join("\n");
  }
  if (!ranked.length) {
    return `No tengo datos observados por cliente cargados para ${formatMonthLabel(spec.period)}. El ARR visible puede mostrar una proyección de planta, pero no tengo una proyección contractual distribuida por cliente.`;
  }
  const open = isOpenCalendarMonth(spec.period, payload.now);
  const title = aggregateDiscount
    ? `En ${formatMonthLabel(spec.period)}, los clientes con ${spec.ranking_direction === "BOTTOM" ? "menor" : "mayor"} descuento total observado (MXN, no $/kg)${open ? " — mes aún abierto, no es cierre" : ""}:`
    : `Top ${ranked.length} clientes por compra observada en ${formatMonthLabel(spec.period)}${open ? " (mes aún abierto; no es el cierre)" : ""}:`;
  const factor = Number(payload.uniform_projection_factor);
  const uniformNote =
    open && !aggregateDiscount && Number.isFinite(factor) && factor > 0
      ? "El orden del ranking observado no cambia si se aplica el mismo factor de proyección de planta a todos los clientes."
      : null;
  const lines = ranked.map((row, i) => {
    if (aggregateDiscount) {
      return `${i + 1}. ${row.cliente} — ${Number(row.monto).toLocaleString("es-MX")}`;
    }
    const projected =
      uniformNote && Number.isFinite(Number(row.venta_ton))
        ? `; estimación proyectada ${formatTon(Math.round(row.venta_ton * factor * 10) / 10)}`
        : "";
    return `${i + 1}. ${row.cliente} — ${formatTon(row.venta_ton)}${projected}`;
  });
  return [title, uniformNote, ...lines].filter(Boolean).join("\n");
}

async function loadClientRankingForChat(pool, plantaId, req, opts = {}) {
  const now = opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();
  const question = opts.question || "";
  const prior = opts.priorSpec && opts.priorSpec.ok ? opts.priorSpec : null;
  let spec = extractClientRankingSpec(question, prior, {
    now,
    selectedPeriod: opts.selectedPeriod,
  });
  const nQuestion = normalizeText(question);
  const purchaseFollow =
    /\b(compro|compran|compra|venta|toneladas)\b/.test(nQuestion) && !/\bdescuento/.test(nQuestion);
  if ((opts.forceDiscount || (prior && prior.metric === "DISCOUNT")) && !purchaseFollow) {
    const backlog = require("./director-ia-executive-backlog");
    const disc = backlog.extractClientDiscountRankingSpec(question, prior);
    if (disc.ok || spec.ok) {
      spec = {
        ok: true,
        ranking_direction:
          disc.ok && disc.direction === "LOW" ? "BOTTOM" : spec.ok ? spec.ranking_direction : "TOP",
        limit: disc.ok ? disc.limit : spec.limit || 5,
        customer_segment: spec.ok ? spec.customer_segment : disc.channel || "ALL",
        metric: "DISCOUNT",
        plant_label: (spec && spec.plant_label) || (disc && disc.plant) || (prior && prior.plant_label) || null,
        period: spec.ok && spec.period ? spec.period : extractPeriodYm(nQuestion, now, prior, opts.selectedPeriod),
        wants_discount: false,
        plant_id: spec.plant_id || (prior && prior.plant_id) || null,
      };
    }
  }
  if (!spec.ok) {
    return { ok: false, error: "No pude determinar el ranking de clientes.", spec, now };
  }
  if (!spec.period) {
    return {
      ok: true,
      clarification:
        spec.metric === "DISCOUNT"
          ? "¿De qué mes o periodo quieres comparar los descuentos?"
          : "¿De qué mes o periodo quieres el ranking?",
      spec,
      now,
      ranked: [],
      question,
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
    if (spec.metric === "DISCOUNT" && Array.isArray(opts.discountRows)) {
      rows = opts.discountRows;
    } else if (Array.isArray(opts.salesRows) && spec.metric !== "DISCOUNT") {
      rows = opts.salesRows;
    } else {
      const resolveCodes = opts.resolvePlantCodes || resolvePlantCodes;
      const qSales = opts.queryMonthlySales || queryMonthlySales;
      const qDisc = opts.queryMonthlyDiscount || queryMonthlyDiscount;
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
      const result =
        spec.metric === "DISCOUNT"
          ? await qDisc(opts.db || pool, codes, startStr, endStr, canalFilter)
          : await qSales(opts.db || pool, codes, startStr, endStr, canalFilter);
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

  let ranked = spec.metric === "DISCOUNT" ? rankByDiscount(rows, spec) : rankClients(rows, spec);
  let data_semantics = isOpenCalendarMonth(spec.period, now)
    ? ranked.length
      ? "OBSERVED_PARTIAL"
      : "NO_ROWS_OBSERVED"
    : ranked.length
      ? "OBSERVED_CLOSED"
      : "NO_ROWS_OBSERVED";
  const asked_period = spec.period;
  if (!ranked.length) {
    const byPeriod = spec.metric === "DISCOUNT"
      ? (opts.lastSafeCutDiscountRowsByPeriod && typeof opts.lastSafeCutDiscountRowsByPeriod === "object"
        ? opts.lastSafeCutDiscountRowsByPeriod
        : null)
      : (opts.lastSafeCutSalesRowsByPeriod && typeof opts.lastSafeCutSalesRowsByPeriod === "object"
        ? opts.lastSafeCutSalesRowsByPeriod
        : null);
    const injectedRows = spec.metric === "DISCOUNT" ? opts.lastSafeCutDiscountRows : opts.lastSafeCutSalesRows;
    const injectedPeriod = spec.metric === "DISCOUNT" ? opts.lastSafeCutPeriod : opts.lastSafeCutPeriod;
    const injectedPrimary = spec.metric === "DISCOUNT" ? opts.discountRows : opts.salesRows;
    const liveQuery = spec.metric === "DISCOUNT"
      ? (opts.queryMonthlyDiscount || queryMonthlyDiscount)
      : (opts.queryMonthlySales || queryMonthlySales);
    for (const ym of walkBackYearMonths(asked_period, 12)) {
      let fallbackRows = null;
      if (byPeriod && Array.isArray(byPeriod[ym])) {
        fallbackRows = byPeriod[ym];
      } else if (!byPeriod && Array.isArray(injectedRows) && injectedPeriod === ym) {
        fallbackRows = injectedRows;
      } else if (!byPeriod && Array.isArray(injectedRows) && !injectedPeriod && ym === previousYearMonth(asked_period)) {
        fallbackRows = injectedRows;
      } else if (!Array.isArray(injectedPrimary)) {
        const bounds = periodBounds(ym);
        const resolveCodes = opts.resolvePlantCodes || resolvePlantCodes;
        let codes = opts.plantCodes;
        if (!codes) {
          const resolved = await resolveCodes(opts.db || pool, plantLabel || spec.plant_label);
          codes = resolved && resolved.uniqueCodes;
        }
        if (bounds && codes && codes.length) {
          const result = await liveQuery(opts.db || pool, codes, bounds.startStr, bounds.endStr, canalFilter);
          fallbackRows = (result && result.rows) || result || [];
        }
      }
      if (fallbackRows && fallbackRows.length) {
        const fallbackRanked = spec.metric === "DISCOUNT" ? rankByDiscount(fallbackRows, spec) : rankClients(fallbackRows, spec);
        if (fallbackRanked.length) {
          ranked = fallbackRanked;
          spec = { ...spec, period: ym };
          data_semantics = "LAST_SAFE_CUT";
          break;
        }
      }
    }
  }
  let discount_available = false;
  let discount_label = null;
  if (spec.wants_discount) {
    if (opts.discountByClient && spec.ordinal && ranked[spec.ordinal - 1]) {
      const name = ranked[spec.ordinal - 1].cliente;
      if (Object.prototype.hasOwnProperty.call(opts.discountByClient, name)) {
        discount_available = true;
        discount_label = opts.discountByClient[name];
      }
    } else if (typeof opts.queryMonthlyDiscount === "function" || queryMonthlyDiscount) {
      discount_available = false;
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
    data_semantics,
    asked_period,
    uniform_projection_factor:
      data_semantics === "OBSERVED_PARTIAL" && Number(opts.uniformProjectionFactor) > 0
        ? Number(opts.uniformProjectionFactor)
        : null,
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
    metric: spec.metric,
    plant_label: spec.plant_label,
    plant_id: spec.plant_id,
    period: spec.period,
    ranked_names: (ranked || []).map((row) => row.cliente).slice(0, 20),
  };
}

function priorRankingFromState(state) {
  if (!state || (state.parent_intent !== "client_ranking" && state.parent_intent !== "client_discount_ranking")) {
    return null;
  }
  const ent = Array.isArray(state.active_entities) ? state.active_entities[0] : null;
  if (!ent) return null;
  const names =
    Array.isArray(ent.ranked_names) && ent.ranked_names.length
      ? ent.ranked_names
      : Array.isArray(ent.names)
        ? ent.names
        : [];
  return {
    ok: true,
    ranking_direction: ent.ranking_direction || "TOP",
    limit: Number(ent.limit) || 5,
    customer_segment: ent.customer_segment || "ALL",
    metric: ent.metric === "DISCOUNT" ? "DISCOUNT" : "VENTA_TON",
    plant_label: ent.plant_label || null,
    plant_id: ent.plant_id || null,
    period: ent.period || ent.key || null,
    ranked_names: names,
  };
}

function buildEntitySetFollowUpAnswer(names, question) {
  const list = (names || []).filter(Boolean);
  if (!list.length) return null;
  const n = String(question || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return [
    `Me refiero solo al conjunto previo: ${list.join(" y ")}.`,
    n.includes("disminuy") || n.includes("bajaron") || n.includes("cayo")
      ? "Calculo la variación de ESOS clientes, no del universo global DISMINUYERON."
      : n.includes("descuento")
        ? "Consultaré el descuento observado de esos clientes. No invento el valor."
        : n.includes("comentario")
          ? "Los comentarios son declaraciones/evidencia, no causa demostrada."
          : n.includes("accion")
            ? "Solo asocio acciones cuando la relación cliente↔acción es defendible."
            : "Conservo las entidades del turno anterior y reemplazo solo la dimensión pedida.",
    "Si no hay venta previa/actual de alguno, lo declaro. No salto a otra lista DICF.",
  ].join(" ");
}

function buildClientRankingChatResult(payload, opts = {}) {
  const answer = buildClientRankingAnswer(payload);
  const spec = payload && payload.spec;
  const entity = encodeRankingPrior(spec, payload && payload.ranked);
  const plantaId = payload && payload.planta_id != null ? payload.planta_id : opts.planta_id;
  const parentIntent = spec && spec.metric === "DISCOUNT" ? "client_discount_ranking" : "client_ranking";
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
      data_semantics: payload && payload.data_semantics ? payload.data_semantics : null,
      conversation_state: {
        parent_intent: parentIntent,
        planta_id: plantaId,
        active_subtopic: parentIntent,
        active_entities: entity ? [entity] : [],
        pending_information_gap:
          payload && payload.clarification && spec && !spec.period
            ? {
                kind: "dimension_completion",
                parent_intent: parentIntent,
                missing_fields: ["period"],
                frame: {
                  ranking_direction: spec.ranking_direction,
                  limit: spec.limit,
                  customer_segment: spec.customer_segment,
                  metric: spec.metric,
                  plant_label: spec.plant_label,
                  plant_id: spec.plant_id,
                },
                original_question: payload.question || null,
                why_blocks: "Falta periodo del ranking. No invento el mes.",
              }
            : null,
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
  previousYearMonth,
  walkBackYearMonths,
  formatMonthLabel,
  isOpenCalendarMonth,
  rankClients,
  loadClientRankingForChat,
  buildClientRankingAnswer,
  buildClientRankingChatResult,
  priorRankingFromState,
  rankByDiscount,
  buildEntitySetFollowUpAnswer,
};
