"use strict";

/**
 * PROCUREMENT_BY_CONCEPT — gasto/proveedores/beneficiarios/costo unitario
 * sobre Folios coincidentes. Concepto libre. Sin whitelist.
 * beneficiario != proveedor por defecto.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { extractFolioSearchFilters, textMatchesSearch, classifyImporte } = require("./director-ia-folio-search");

const SEMANTIC_CLASS = "procurement_by_concept";
const SOURCE_FOLIOS = "public.folios";

const OPS = Object.freeze({
  SPEND: "SPEND",
  SUPPLIERS: "SUPPLIERS",
  BENEFICIARIES: "BENEFICIARIES",
  COUNT: "COUNT",
  LIST: "LIST",
  LATEST: "LATEST",
  SUM: "SUM",
  UNIT_COST: "UNIT_COST",
  RANK_BY_FOLIOS: "RANK_BY_FOLIOS",
  RANK_BY_AMOUNT: "RANK_BY_AMOUNT",
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

function isProcurementDomainConflict(n) {
  return Boolean(/\bestaciones?\b/.test(n) && !/\b(folios?|costo|precio|proveedor|beneficiar)\b/.test(n));
}

function hasSupplierCue(n) {
  return Boolean(
    /\bproveedor(?:es)?\b/.test(n) ||
      /\bnos\s+vende/.test(n) ||
      /\bnos\s+surte/.test(n) ||
      /\bcon\s+quien\s+compramos\b/.test(n) ||
      /\busamos\s+mas\b/.test(n) ||
      /\bempresas?\s+(aparecen|nos\s+surten)\b/.test(n)
  );
}

function hasBeneficiaryCue(n) {
  return Boolean(
    /\bbeneficiarios?\b/.test(n) ||
      /\ba\s+nombre\s+de\s+quien\b/.test(n) ||
      /\bquien\s+recibio\s+pagos?\b/.test(n) ||
      /\ble\s+hemos\s+pagado\b/.test(n) ||
      /\baparece\s+mas\b/.test(n) ||
      /\baparece\s+en\s+folios\b/.test(n) ||
      /\bconcentra\b/.test(n)
  );
}

function hasUnitCostCue(n) {
  return Boolean(
    /\bcosto\s+unitario\b/.test(n) ||
      /\bprecio\s+promedio\b/.test(n) ||
      /\bcuanto\s+cuesta\s+(en\s+promedio\s+)?(cada|una|un)\b/.test(n) ||
      /\bcuanto\s+estamos\s+pagando\s+por\b/.test(n) ||
      /\bcuanto\s+pagamos\s+por\b/.test(n) ||
      /\bpagamos\s+por\s+(cada|una|un)\b/.test(n) ||
      /\ben\s+cuanto\s+nos\s+sale\s+cada\b/.test(n) ||
      /\bcuanto\s+cuesta\s+cada\b/.test(n) ||
      /\bunit\s+cost\b/.test(n) ||
      /\bprecio\s+unitario\b/.test(n) ||
      /\bprecio\s+por\b/.test(n) ||
      /\bcosto\s+promedio\b/.test(n) ||
      /\bcosto\s+por\b/.test(n) ||
      /\bpromedio\s+por\b/.test(n) ||
      /\bmenor\s+costo\b/.test(n) ||
      /\bmayor\s+costo\b/.test(n) ||
      /\bsale\s+cada\b/.test(n)
  );
}

function hasSpendCue(n) {
  return Boolean(
    /\bgast(e|amos|ado|o|os)\b/.test(n) ||
      /\bimporte\b/.test(n) ||
      /\bmonto\b/.test(n) ||
      /\bsuman\b/.test(n) ||
      /\bregistrado\b/.test(n) ||
      /\bllevamos\b/.test(n) ||
      /\bcompras?\s+relacionadas\b/.test(n)
  );
}

function hasInventoryCue(n) {
  return Boolean(/\bcuantas?\b/.test(n) && !/\bfolios?\b/.test(n) && !/\bbeneficiarios?\b/.test(n) && !hasSpendCue(n));
}

function isProcurementByConceptQuestion(question) {
  const n = normalizeText(question);
  if (!n || isProcurementDomainConflict(n)) return false;
  if (hasInventoryCue(n) && !hasSpendCue(n) && !hasSupplierCue(n) && !hasBeneficiaryCue(n) && !hasUnitCostCue(n)) {
    return false;
  }
  return hasSupplierCue(n) || hasBeneficiaryCue(n) || hasUnitCostCue(n) || hasSpendCue(n);
}

function isProcurementFollowUp(question) {
  const n = normalizeText(question);
  if (!n) return false;
  if (isProcurementDomainConflict(n) || /\b(clientes?|estaciones?|extintor)\b/.test(n)) return false;
  return (
    /\bcuanto\s+le\s+hemos\s+pagado\b/.test(n) ||
    /\bquien\s+tiene\s+mas\s+folios\b/.test(n) ||
    /\bcual\s+concentra\b/.test(n) ||
    /\bcual\s+fue\s+el\s+ultimo\b/.test(n) ||
    /\bcuanto\s+suman\b/.test(n) ||
    /\bcuales\s+son\b/.test(n) ||
    n.split(/\s+/).length <= 6
  );
}

function resolveOperation(n) {
  if (hasUnitCostCue(n)) return OPS.UNIT_COST;
  if (hasSupplierCue(n)) return OPS.SUPPLIERS;
  if (hasBeneficiaryCue(n)) return OPS.BENEFICIARIES;
  if (/\bcuantos\s+folios\b/.test(n)) return OPS.COUNT;
  if (hasSpendCue(n)) return OPS.SPEND;
  return OPS.LIST;
}

function extractConcept(question, filters) {
  if (filters && filters.concept_query) return filters.concept_query;
  const n = normalizeText(question);
  const m = n.match(
    /\b(?:en|de|por)\s+([a-z0-9ñ]+(?:\s+[a-z0-9ñ]+){0,3})(?:\s+(?:de|en|desde|hasta|este|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre).*)?$/
  );
  if (m && m[1] && !/^(folios?|apoyos?|promedio|cada)$/.test(m[1])) return m[1].trim();
  return null;
}

function extractProcurementSpec(question, prior, opts = {}) {
  const n = normalizeText(question);
  const usable = prior && prior.ok ? prior : null;
  const follow = Boolean(usable && isProcurementFollowUp(question));
  if (!isProcurementByConceptQuestion(question) && !follow) return { ok: false };
  const filters = extractFolioSearchFilters(question, { now: opts.now });
  const concept = extractConcept(question, filters) || (usable && usable.concept) || null;
  return {
    ok: true,
    semantic_class: SEMANTIC_CLASS,
    operation: resolveOperation(n) || (usable && usable.operation) || OPS.SPEND,
    concept,
    period_mode: filters.period_mode,
    period_month: filters.period_month || (usable && usable.period_month) || null,
    period_start: filters.period_start || (usable && usable.period_start) || null,
    period_end: filters.period_end || (usable && usable.period_end) || null,
    plant_label: usable && usable.plant_label,
    follow,
    supplier_field_present: false,
  };
}

function rowMatchesConcept(row, concept) {
  if (!concept) return true;
  return textMatchesSearch(
    [row && row.concepto, row && row.descripcion, row && row.subcategoria, row && row.beneficiario]
      .filter(Boolean)
      .join(" "),
    concept
  );
}

function extractAttributableQuantity(row, concept) {
  if (!row || !concept) return null;
  const text = String(row.concepto || row.descripcion || "");
  const n = normalizeText(text);
  const c = normalizeText(concept);
  const mixed = /\b(servicio|servicios|alineacion|mano\s+de\s+obra|otras?\s+piezas|refacciones|aceite|filtro)\b/.test(n);
  const m = n.match(new RegExp(`(?:compra de |adquisicion de )?(\\d{1,4})\\s+${c.replace(/s$/, "s?")}`));
  if (!m) return null;
  if (mixed) return null;
  const amount = classifyImporte(row.importe);
  if (amount.kind !== "KNOWN") return null;
  return { quantity: Number(m[1]), amount: amount.amount };
}

function aggregateBeneficiaries(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const name = String((row && row.beneficiario) || "").trim() || "beneficiario no registrado";
    const prev = map.get(name) || { name, folios: 0, amount: 0, latest: null };
    prev.folios += 1;
    const amount = classifyImporte(row.importe);
    if (amount.kind === "KNOWN") prev.amount += amount.amount;
    const stamp = row.mes_cargo || row.periodo || "";
    if (!prev.latest || String(stamp) > String(prev.latest)) prev.latest = stamp;
    map.set(name, prev);
  }
  return [...map.values()];
}

function formatMxn(n) {
  return `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildProcurementAnswer(payload) {
  if (!payload) return "No pude consultar compras por concepto.";
  if (payload.clarification) return payload.clarification;
  if (payload.ok === false) return payload.error || "No pude consultar compras por concepto.";
  const spec = payload.spec || {};
  const concept = spec.concept || "ese concepto";
  const count = payload.match_count || 0;
  if (spec.operation === OPS.UNIT_COST) {
    if (payload.unit_cost_status === "NOT_DETERMINABLE") {
      return (
        payload.unit_cost_reason ||
        `No puedo determinar costo unitario con exactitud para ${concept}. Falta una cantidad atribuible segura junto con un importe atribuible al mismo concepto.`
      );
    }
    return `Costo unitario observado de ${concept}: ${formatMxn(payload.unit_cost)} (importe atribuible / cantidad atribuible). Fuente: ${SOURCE_FOLIOS}.`;
  }
  if (spec.operation === OPS.SUPPLIERS) {
    if (!payload.supplier_field_present) {
      const benef = payload.beneficiaries || [];
      const names = benef.map((b) => b.name).slice(0, 12);
      return (
        `La fuente permite identificar beneficiarios relacionados con ${concept}, ` +
        `pero no puedo afirmar que todos sean proveedores. Esta fuente no tiene un campo real de proveedor.\n` +
        (names.length ? `Beneficiarios observados: ${names.join("; ")}.` : "No encontré beneficiarios relacionados.")
      );
    }
    return `Proveedores relacionados con ${concept}: ${(payload.suppliers || []).map((s) => s.name).join("; ") || "ninguno"}.`;
  }
  if (spec.operation === OPS.BENEFICIARIES || spec.operation === OPS.RANK_BY_AMOUNT || spec.operation === OPS.RANK_BY_FOLIOS) {
    const list = payload.beneficiaries || [];
    if (!list.length) return `No encontré beneficiarios relacionados con ${concept}.`;
    const lines = list.slice(0, 12).map((b, i) => `${i + 1}. ${b.name} — ${b.folios} folio(s) — ${formatMxn(b.amount)}`);
    return [`Beneficiarios relacionados con ${concept}:`, ...lines].join("\n");
  }
  if (!count) return `No encontré folios relacionados con ${concept} en el periodo consultado.`;
  return (
    `Encontré ${count} folio(s) relacionados con ${concept}` +
    `${payload.period_label ? ` entre ${payload.period_label}` : ""}, ` +
    `con un importe registrado total de ${formatMxn(payload.total_amount)}. ` +
    `Ese importe corresponde al total de los folios coincidentes y no necesariamente exclusivamente a ${concept}.`
  );
}

function computeUnitCost(rows, concept) {
  const attributed = [];
  for (const row of rows || []) {
    const hit = extractAttributableQuantity(row, concept);
    if (!hit) continue;
    attributed.push(hit);
  }
  if (!attributed.length) {
    return {
      status: "NOT_DETERMINABLE",
      reason:
        "No puedo determinar costo unitario con exactitud. Falta una cantidad atribuible inequívocamente asociada al concepto, o el folio mezcla otros conceptos materiales sin desglose.",
    };
  }
  const qty = attributed.reduce((s, x) => s + x.quantity, 0);
  const amount = attributed.reduce((s, x) => s + x.amount, 0);
  if (!qty || !amount) {
    return { status: "NOT_DETERMINABLE", reason: "No puedo determinar costo unitario con exactitud. Falta cantidad o importe atribuible." };
  }
  return { status: "OK", unit_cost: amount / qty, quantity: qty, amount };
}

async function loadProcurementForChat(pool, plantaId, req, opts = {}) {
  const question = opts.question || "";
  const spec = extractProcurementSpec(question, opts.priorSpec, { now: opts.now });
  if (!spec.ok) return { ok: false, error: "No pude determinar la consulta de compras.", spec };
  if (!spec.concept) {
    return { ok: true, clarification: "Precisa el concepto de compra. No uso un catálogo cerrado ni invento el rubro.", spec };
  }
  const rows = Array.isArray(opts.folioItems)
    ? opts.folioItems.filter((row) => rowMatchesConcept(row, spec.concept))
    : [];
  const known = rows
    .map((row) => classifyImporte(row.importe))
    .filter((x) => x.kind === "KNOWN")
    .reduce((s, x) => s + x.amount, 0);
  const beneficiaries = aggregateBeneficiaries(rows);
  let unit = { status: null };
  if (spec.operation === OPS.UNIT_COST) unit = computeUnitCost(rows, spec.concept);
  const period_label =
    spec.period_mode === "RANGE" && spec.period_start && spec.period_end
      ? `${spec.period_start} a ${spec.period_end}`
      : spec.period_month || null;
  return {
    ok: true,
    spec,
    match_count: rows.length,
    total_amount: known,
    beneficiaries,
    suppliers: [],
    supplier_field_present: false,
    unit_cost_status: unit.status,
    unit_cost: unit.unit_cost,
    unit_cost_reason: unit.reason,
    records: rows,
    period_label,
    planta_id: Number(plantaId) || null,
    source: SOURCE_FOLIOS,
  };
}

function buildProcurementChatResult(payload, opts = {}) {
  const answer = buildProcurementAnswer(payload);
  const plantaId = payload && payload.planta_id != null ? payload.planta_id : opts.planta_id;
  const spec = payload && payload.spec;
  return {
    ok: true,
    answer,
    sources: payload && payload.ok !== false ? [SOURCE_FOLIOS] : [],
    context_meta: {
      mode: SEMANTIC_CLASS,
      openai_called: false,
      veracity: DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
      semantic_class: SEMANTIC_CLASS,
      planta_id: plantaId,
      conversation_state: {
        parent_intent: "procurement_by_concept",
        planta_id: plantaId,
        active_subtopic: spec && spec.operation ? String(spec.operation).toLowerCase() : "procurement",
        folio_search_spec: spec
          ? {
              version: 1,
              planta_id: plantaId,
              scope: "ALL_PUBLIC_FOLIOS",
              period_mode: spec.period_mode || "SINGLE",
              period_month: spec.period_month,
              period_start: spec.period_start,
              period_end: spec.period_end,
              period_field: "mes_cargo",
              concept_mode: spec.concept ? "SINGLE" : "NONE",
              concept_query: spec.concept,
              concept_alternatives: [],
              operation: "keyword_search",
            }
          : null,
      },
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SOURCE_FOLIOS,
  OPS,
  isProcurementByConceptQuestion,
  isProcurementFollowUp,
  extractProcurementSpec,
  extractAttributableQuantity,
  computeUnitCost,
  loadProcurementForChat,
  buildProcurementAnswer,
  buildProcurementChatResult,
  rowMatchesConcept,
};
