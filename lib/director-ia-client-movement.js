"use strict";

/**
 * Director IA — movimiento comercial de clientes (valores crudos).
 * No usa redondeo de presentación para clasificar.
 * No declara DEJO_DE_COMPRAR con forecast.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { queryMonthlySales, queryMonthlyDiscount } = require("./director-ia-client-profile");
const { resolvePlantCodes } = require("./commercial-trend-engine");
const { extractNamedPlant } = require("./director-ia-historical-margin");
const { extractPlantLabel, assertSehPlantaAccess } = require("./director-ia-seh-operation-status");
const { sanitizePlantScopeLabel } = require("./director-ia-display-sanitize");

const SEMANTIC_CLASS = "client_movement";
const SOURCE_TABLE = "arr.ventas_diarias_cliente";
const DISCOUNT_SOURCE = "arr.descuentos_diarios_cliente";

const MOVEMENT = Object.freeze({
  AUMENTO: "AUMENTO",
  DISMINUCION: "DISMINUCION",
  DEJO_DE_COMPRAR: "DEJO_DE_COMPRAR",
  NUEVO: "NUEVO",
  SIN_CAMBIO: "SIN_CAMBIO",
  INACTIVO: "INACTIVO",
});

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

const MONTH_LABELS = Object.freeze({
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

function rawNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function previousYm(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return null;
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7));
  if (m <= 1) return `${y - 1}-12`;
  return `${y}-${pad2(m - 1)}`;
}

function periodLabel(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period || "periodo no determinado";
  const mm = period.slice(5, 7);
  return `${MONTH_LABELS[mm] || mm} ${period.slice(0, 4)}`;
}

function formatTonDisplay(kg) {
  return `${(rawNumber(kg) / 1000).toFixed(3)} ton`;
}

function formatDiscountDisplay(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return `${Number(value).toFixed(3)} $/kg`;
}

function classifyRawMovement(previousConsumption, currentConsumption) {
  const previous = rawNumber(previousConsumption);
  const current = rawNumber(currentConsumption);
  if (previous > 0 && current === 0) return MOVEMENT.DEJO_DE_COMPRAR;
  if (previous > current && current > 0) return MOVEMENT.DISMINUCION;
  if (previous === 0 && current > 0) return MOVEMENT.NUEVO;
  if (current > previous && previous > 0) return MOVEMENT.AUMENTO;
  return MOVEMENT.SIN_CAMBIO;
}

function classifyDiscountMovement(previousDiscount, currentDiscount) {
  const previous = Number(previousDiscount);
  const current = Number(currentDiscount);
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return null;
  if (current > previous) return MOVEMENT.AUMENTO;
  if (current < previous) return MOVEMENT.DISMINUCION;
  return MOVEMENT.SIN_CAMBIO;
}

function isClientMovementDomainConflict(n) {
  return Boolean(
    /\b(folios?|apoyos?|extintor|estaciones?|gasto|gastos|gaste|gastamos)\b/.test(n) ||
      /\baction\s+register\b/.test(n)
  );
}

function hasStopBuyingCue(n) {
  return Boolean(
    /\bdejaron\s+de\s+(comprar|consumir)\b/.test(n) ||
      /\bdejo\s+de\s+(comprar|consumir)\b/.test(n) ||
      /\bquien(es)?\s+ya\s+no\s+(esta\s+)?(comprando|consumiendo)\b/.test(n) ||
      /\bya\s+no\s+(estan\s+)?(comprando|consumiendo)\b/.test(n) ||
      /\bse\s+(quedaron|fueron)\s+(en\s+)?cero\b/.test(n) ||
      /\bse\s+fueron\s+a\s+cero\b/.test(n) ||
      /\bcompraba\s+antes\s+y\s+ahora\s+no\b/.test(n) ||
      /\bquien\s+compraba\s+antes\s+y\s+ahora\s+no\b/.test(n) ||
      /\bdejaron?\s+completamente\s+de\s+consumir\b/.test(n) ||
      /\bquien\s+dejo\s+completamente\b/.test(n) ||
      /\bno\s+consumen\b/.test(n) ||
      /\bya\s+no\s+consume\b/.test(n) ||
      /\bcompraba\s+y\s+ahora\s+no\b/.test(n) ||
      /\bcayeron\s+a\s+cero\b/.test(n) ||
      /\bse\s+fue(ron)?\s+a\s+cero\b/.test(n) ||
      /\bperdio\s+volumen\b/.test(n)
  );
}

function hasDecreaseCue(n) {
  return Boolean(
    /\bdisminuy/.test(n) ||
      /\bbajaron\b/.test(n) ||
      /\bcaida\s+(de\s+)?(consumo|venta|clientes?)\b/.test(n) ||
      /\bperdio\s+mas\s+consumo\b/.test(n) ||
      /\bquien\s+perdio\s+mas\b/.test(n)
  );
}

function hasIncreaseCue(n) {
  return Boolean(/\baument/.test(n) && !/\bdescuento/.test(n));
}

function hasNewClientCue(n) {
  return Boolean(/\bclientes?\s+nuev/.test(n) || /\bnuev[oa]s?\s+clientes?\b/.test(n) || /\bquien(es)?\s+entraron\b/.test(n));
}

function hasInactivityCue(n) {
  return Boolean(
    /\binactiv/.test(n) ||
      /\bsin\s+consumo\s+reciente\b/.test(n) ||
      /\bsin\s+actividad\b/.test(n) ||
      /\blleva\s+\d+\s+dias\s+sin\b/.test(n) ||
      /\bno\s+ha(n)?\s+(comprado|consumido)\b/.test(n) ||
      /\bsin\s+comprar\b/.test(n) ||
      /\btiempo\s+sin\s+comprar\b/.test(n) ||
      /\bno\s+compra\s+desde\b/.test(n) ||
      /\bsin\s+consumo\b/.test(n) ||
      /\bdormidos\b/.test(n) ||
      /\bno\s+registra\s+consumo\b/.test(n)
  );
}

function hasTransitionCue(n) {
  return Boolean(
    /\bcuanto\s+(compraba|consumia)\s+antes\b/.test(n) ||
      /\bde\s+cuanto\s+paso\s+a\s+cero\b/.test(n) ||
      /\bcuando\s+dejo\s+de\s+(comprar|consumir)\b/.test(n) ||
      /\bdesde\s+cuando\s+no\s+compra\b/.test(n) ||
      /\bultimo\s+mes\s+con\s+consumo\b/.test(n) ||
      /\bultima\s+compra\b/.test(n) ||
      /\bperiodo\s+anterior\b/.test(n) ||
      /\ben\s+que\s+mes\s+(cayo|cambio)\b/.test(n) ||
      /\bvolumen\s+perdio\b/.test(n) ||
      /\bpaso\s+a\s+inactivo\b/.test(n) ||
      /\bconsumo\s+anterior\b/.test(n) ||
      /\bdesde\s+cuando\b/.test(n) ||
      /\bmes\s+previo\b/.test(n) ||
      /\bvariacion\b/.test(n) ||
      /\bhistoria\b/.test(n)
  );
}

function hasDiscountChangeRankingCue(n) {
  return Boolean(
    (/\b(mayor|menor)\s+(aumento|reduccion)\b/.test(n) ||
      /\btop\s+\d+\s+(aumentos?|reducciones?)\b/.test(n) ||
      /\branking\s+de\s+(bajas|alzas)\b/.test(n)) &&
      !/\b(consumo|toneladas?|venta)\b/.test(n)
  );
}

function hasDiscountMovementCue(n) {
  const discountWord = /\bdescuento/.test(n);
  const vsPrior =
    /\bdisminuy/.test(n) ||
    /\baument/.test(n) ||
    /\ble\s+(bajo|subio)\b/.test(n) ||
    /\b(bajo|subio)\s+(el\s+)?descuento\b/.test(n) ||
    /\bcuanto\s+(bajo|subio)\b/.test(n) ||
    /\bquien\s+(bajo|subio|cambio|redujo)\b/.test(n) ||
    /\banterior\b/.test(n) ||
    /\bantes\b/.test(n) ||
    /\bdelta\b/.test(n) ||
    /\bcambio\b/.test(n) ||
    /\bde\s+cuanto\s+a\s+cuanto\b/.test(n) ||
    /\breduc/.test(n) ||
    /\balzas?\b/.test(n) ||
    /\bbajas?\b/.test(n) ||
    /\bvs\b/.test(n) ||
    /\bcontra\b/.test(n) ||
    /\bcompara\s+(el\s+)?descuentos?\b/.test(n);
  const clientish =
    /\bclientes?\b/.test(n) ||
    /\bquien\b/.test(n) ||
    /\ba\s+quien\b/.test(n) ||
    /\btop\b/.test(n) ||
    /\branking\b/.test(n);
  const changeVerb =
    /\bdisminuy/.test(n) ||
    /\baument/.test(n) ||
    /\ble\s+(bajo|subio)\b/.test(n) ||
    /\b(bajo|subio)\s+(el\s+)?descuento\b/.test(n) ||
    /\breduc/.test(n);
  const temporalCompare =
    /\banterior\b/.test(n) ||
    /\bantes\b/.test(n) ||
    /\bdelta\b/.test(n) ||
    /\bde\s+cuanto\s+a\s+cuanto\b/.test(n) ||
    /\balzas?\b/.test(n) ||
    /\bbajas?\b/.test(n) ||
    /\bcompara\s+(el\s+)?descuentos?\b/.test(n) ||
    /\bcontra\b/.test(n);
  if (discountWord && vsPrior && (clientish || changeVerb || temporalCompare)) return true;
  if (hasDiscountChangeRankingCue(n)) return true;
  if (/\bde\s+cuanto\s+a\s+cuanto\b/.test(n) && /\bcambio\b/.test(n) && !/\b(consumo|toneladas?|venta)\b/.test(n)) {
    return true;
  }
  return false;
}

function hasEntitySetFollowUpCue(n) {
  return Boolean(
      /\bcuanto\s+(disminuyeron|bajaron|bajo|perdio|perdieron)\b/.test(n) ||
      /\bcuanto\s+bajo\s+cada\b/.test(n) ||
      /\bcuanto\s+compro?aban\s+antes\b/.test(n) ||
      /\bde\s+cuanto\s+a\s+cuanto\b/.test(n) ||
      /\bquien\s+(cayo|disminuyo)\s+mas\b/.test(n) ||
      /\bcual\s+tuvo\s+mayor\s+caida\b/.test(n) ||
      /\ben\s+porcentaje\b/.test(n) ||
      /\bque\s+descuento\s+tienen\b/.test(n) ||
      /\bcual\s+(vende|vendio)\s+mas\b/.test(n) ||
      /\bcual\s+(mejoro|empeoro)\b/.test(n) ||
      /\bque\s+(comentarios|acciones)\s+tienen\b/.test(n) ||
      /\bcomparalos\b/.test(n) ||
      /\bcompara\s+esos\b/.test(n) ||
      /\besos\s+dos\b/.test(n) ||
      /\bde\s+ambos\b/.test(n) ||
      /\blimitate\b/.test(n)
  );
}

function isClientMovementQuestion(question) {
  const n = normalizeText(question);
  if (!n || isClientMovementDomainConflict(n)) return false;
  if (hasDiscountMovementCue(n)) return true;
  if (hasStopBuyingCue(n) || hasDecreaseCue(n) || hasIncreaseCue(n) || hasNewClientCue(n)) return true;
  if (hasInactivityCue(n)) return true;
  if (hasTransitionCue(n)) return true;
  return false;
}

function isClientMovementFollowUp(question) {
  const n = normalizeText(question);
  if (!n || isClientMovementDomainConflict(n)) return false;
  if (hasTransitionCue(n) || hasEntitySetFollowUpCue(n) || hasDiscountMovementCue(n) || hasInactivityCue(n)) {
    return true;
  }
  return n.split(/\s+/).length <= 6;
}

function extractSegment(n, prior) {
  if (/\bcomisionistas?\b/.test(n) || /\bventa\s+comisionista\b/.test(n)) return "COMISIONISTA";
  if (/\bcasa\b/.test(n) || /\bventa\s+casa\b/.test(n)) return "CASA";
  if (prior && prior.customer_segment) return prior.customer_segment;
  return "ALL";
}

function extractPeriodYm(n, now, prior) {
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
  if (prior && prior.current_period) return prior.current_period;
  return null;
}

function extractInactivityWindow(raw, now) {
  const n = normalizeText(raw);
  const days = n.match(/\b(\d{1,3})\s+dias\b/);
  if (days) {
    return { kind: "DAYS", days: Number(days[1]), label: `${days[1]} días`, declared: true };
  }
  if (/\beste mes\b/.test(n) || /\bmes actual\b/.test(n)) {
    const cur = resolveNow(now);
    return { kind: "MONTH", period: `${cur.year}-${pad2(cur.month)}`, label: "este mes", declared: true };
  }
  for (const [name, mm] of Object.entries(MONTHS_ES)) {
    if (new RegExp(`\\bdesde\\s+${name}\\b`).test(n)) {
      const yearM = n.match(/\b(20\d{2})\b/);
      const year = yearM ? yearM[1] : String(resolveNow(now).year);
      return { kind: "SINCE_MONTH", period: `${year}-${mm}`, label: `desde ${name}`, declared: true };
    }
  }
  if (/\b(\d+)\s+periodos?\b/.test(n)) {
    const m = n.match(/\b(\d+)\s+periodos?\b/);
    return { kind: "PERIODS", periods: Number(m[1]), label: `${m[1]} periodos`, declared: true };
  }
  return null;
}

function resolveMovementType(n) {
  if (hasDiscountMovementCue(n)) return "DISCOUNT_MOVEMENT";
  if (hasInactivityCue(n) && !hasStopBuyingCue(n)) return MOVEMENT.INACTIVO;
  if (hasStopBuyingCue(n)) return MOVEMENT.DEJO_DE_COMPRAR;
  if (hasNewClientCue(n)) return MOVEMENT.NUEVO;
  if (hasDecreaseCue(n)) return MOVEMENT.DISMINUCION;
  if (hasIncreaseCue(n)) return MOVEMENT.AUMENTO;
  if (hasTransitionCue(n)) return "TRANSITION_HISTORY";
  return null;
}

function extractClientMovementSpec(question, prior, opts = {}) {
  const n = normalizeText(question);
  const usable = prior && prior.ok ? prior : null;
  const follow = Boolean(usable && isClientMovementFollowUp(question));
  if (!isClientMovementQuestion(question) && !follow) return { ok: false };
  const movement_type = resolveMovementType(n) || (usable && usable.movement_type) || MOVEMENT.DEJO_DE_COMPRAR;
  const now = opts.now;
  return {
    ok: true,
    semantic_class: SEMANTIC_CLASS,
    movement_type,
    customer_segment: extractSegment(n, usable),
    plant_label: extractNamedPlant(question) || extractPlantLabel(question) || (follow && usable ? usable.plant_label : null),
    current_period: extractPeriodYm(n, now, usable) || (usable && usable.current_period) || opts.selectedPeriod || opts.latestArrPeriod || null,
    previous_period: (usable && usable.previous_period) || null,
    inactivity_window: extractInactivityWindow(n, now),
    restrict_to_entities: Boolean(
      follow &&
        usable &&
        Array.isArray(usable.entity_names) &&
        usable.entity_names.length &&
        hasEntitySetFollowUpCue(n) &&
        !/\btodos\s+los\s+clientes\b/.test(n) &&
        !/\bahora\s+(dame\s+)?todos\b/.test(n)
    ),
    expand_universe: /\btodos\s+los\s+clientes\b/.test(n) || /\bahora\s+(dame\s+)?todos\b/.test(n),
    wants_transition: hasTransitionCue(n),
    wants_discount: hasDiscountMovementCue(n) || /\bdescuento/.test(n),
    ranking_direction: /\breduccion|baj|disminuy|menor\b/.test(n) ? "BOTTOM" : "TOP",
    limit: (() => {
      const m = n.match(/\btop\s+(\d{1,2})\b/);
      return m ? Number(m[1]) : 5;
    })(),
    follow,
    entity_names: usable && Array.isArray(usable.entity_names) ? usable.entity_names : [],
  };
}

function aggregateByClient(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const name = String((row && row.cliente_norm) || "").trim();
    if (!name) continue;
    const kg = rawNumber(row.kg);
    const prev = map.get(name) || { cliente: name, kg: 0, canal: row.canal || null, last_date: null };
    prev.kg += kg;
    if (row.fecha && (!prev.last_date || String(row.fecha) > String(prev.last_date))) prev.last_date = row.fecha;
    map.set(name, prev);
  }
  return map;
}

function aggregateDiscountByClient(rows, kgByClient) {
  const map = new Map();
  for (const row of rows || []) {
    const name = String((row && row.cliente_norm) || "").trim();
    if (!name) continue;
    const prev = map.get(name) || { cliente: name, monto: 0 };
    prev.monto += rawNumber(row.monto);
    map.set(name, prev);
  }
  for (const [name, item] of map.entries()) {
    const kg = kgByClient && kgByClient.get(name) ? rawNumber(kgByClient.get(name).kg) : 0;
    item.discount_per_kg = kg > 0 ? item.monto / kg : null;
  }
  return map;
}

function buildMovementRows(currentMap, previousMap, spec) {
  const names = new Set([...currentMap.keys(), ...previousMap.keys()]);
  const out = [];
  for (const name of names) {
    if (spec.restrict_to_entities && spec.entity_names.length && !spec.entity_names.includes(name)) continue;
    const current = currentMap.get(name);
    const previous = previousMap.get(name);
    const current_consumption = current ? rawNumber(current.kg) : 0;
    const previous_consumption = previous ? rawNumber(previous.kg) : 0;
    const movement_type = classifyRawMovement(previous_consumption, current_consumption);
    const delta_ton = (current_consumption - previous_consumption) / 1000;
    out.push({
      cliente: name,
      canal: (current && current.canal) || (previous && previous.canal) || null,
      previous_period: spec.previous_period,
      current_period: spec.current_period,
      previous_consumption,
      current_consumption,
      previous_consumption_display: formatTonDisplay(previous_consumption),
      current_consumption_display: formatTonDisplay(current_consumption),
      delta_ton,
      movement_type,
      last_nonzero_period: previous_consumption > 0 ? spec.previous_period : current_consumption > 0 ? spec.current_period : null,
      first_zero_period: previous_consumption > 0 && current_consumption === 0 ? spec.current_period : null,
      last_purchase_date: current && current.last_date ? current.last_date : previous && previous.last_date ? previous.last_date : null,
      source_kind: "ACTUAL",
    });
  }
  return out;
}

function monthBounds(period) {
  const [y, m] = String(period).split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${period}-01`, end: `${period}-${pad2(lastDay)}` };
}

function canalFilterForSegment(segment) {
  if (segment === "CASA") return "casa";
  if (segment === "COMISIONISTA") return "comisionista";
  return "ambos";
}

function filterByMovement(rows, movementType) {
  if (movementType === "DISCOUNT_MOVEMENT" || movementType === "TRANSITION_HISTORY") return rows;
  return rows.filter((row) => row.movement_type === movementType);
}

function buildClientMovementAnswer(payload) {
  if (!payload) return "No pude consultar el movimiento comercial.";
  if (payload.clarification) return payload.clarification;
  if (payload.ok === false) return payload.error || "No pude consultar el movimiento comercial.";
  const spec = payload.spec || {};
  const rows = payload.rows || [];
  if (spec.movement_type === MOVEMENT.INACTIVO && !spec.inactivity_window) {
    return "Para clientes inactivos necesito una ventana temporal explícita (30 días, 60 días, este mes o desde un mes). No invento la definición de inactividad ni la igualo a quienes dejaron de comprar.";
  }
  if (spec.movement_type === "DISCOUNT_MOVEMENT") {
    if (!rows.length) return "No encontré movimiento de descuento observado en ARR para esos filtros.";
    const lines = rows.slice(0, spec.limit || 5).map((row, i) => {
      return `${i + 1}. ${row.cliente} — ${periodLabel(row.previous_period)}: ${formatDiscountDisplay(row.previous_discount)} → ${periodLabel(row.current_period)}: ${formatDiscountDisplay(row.current_discount)} — Delta: ${formatDiscountDisplay(row.delta_discount)} — Fuente: ${DISCOUNT_SOURCE}`;
    });
    return [`Movimiento de descuento (${spec.customer_segment}) — ${sanitizePlantScopeLabel(spec.plant_label) || "planta"}`, "", ...lines].join("\n");
  }
  if (!rows.length) {
    return `No encontré clientes con movimiento ${spec.movement_type} en ${sanitizePlantScopeLabel(spec.plant_label) || "la planta"} (${spec.current_period || "periodo no determinado"}).`;
  }
  const header =
    spec.movement_type === MOVEMENT.INACTIVO
      ? `Clientes inactivos — ventana declarada: ${spec.inactivity_window.label}`
      : `Clientes con movimiento ${spec.movement_type}`;
  const lines = rows.slice(0, 20).map((row, i) => {
    const bits = [
      `${i + 1}. ${row.cliente}`,
      `${periodLabel(row.previous_period)}: ${row.previous_consumption_display}`,
      `${periodLabel(row.current_period)}: ${row.current_consumption_display}`,
      `Variación: ${row.delta_ton >= 0 ? "+" : ""}${row.delta_ton.toFixed(3)} ton`,
      `Movimiento: ${row.movement_type}`,
    ];
    if (row.last_nonzero_period) bits.push(`Último periodo con consumo: ${periodLabel(row.last_nonzero_period)}`);
    if (row.first_zero_period) bits.push(`Primer periodo en cero: ${periodLabel(row.first_zero_period)}`);
    if (row.last_purchase_date && /^\d{4}-\d{2}-\d{2}$/.test(String(row.last_purchase_date))) {
      bits.push(`Última compra: ${row.last_purchase_date}`);
    }
    bits.push("Fuente: ARR actual (no forecast)");
    return bits.join(" | ");
  });
  return [header, "", ...lines].join("\n");
}

async function loadClientMovementForChat(pool, plantaId, req, opts = {}) {
  const now = opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();
  const question = opts.question || "";
  const prior = opts.priorSpec && opts.priorSpec.ok ? opts.priorSpec : null;
  const spec = extractClientMovementSpec(question, prior, {
    now,
    selectedPeriod: opts.selectedPeriod,
    latestArrPeriod: opts.latestArrPeriod,
  });
  if (!spec.ok) return { ok: false, error: "No pude determinar el movimiento comercial.", spec, now };
  if (spec.movement_type === MOVEMENT.INACTIVO && !spec.inactivity_window) {
    return { ok: true, clarification: buildClientMovementAnswer({ ok: true, spec, rows: [] }), spec, now, rows: [] };
  }
  if (!spec.current_period) {
    return {
      ok: true,
      clarification: "Indica el periodo del movimiento. No invento el mes.",
      spec,
      now,
      rows: [],
    };
  }
  spec.previous_period = spec.previous_period || previousYm(spec.current_period);
  const selectedId = Number(plantaId);
  let plantIdToUse = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null;
  let plantLabel = spec.plant_label || opts.plant_label || null;
  if (spec.plant_label && typeof opts.resolvePlantByNombre === "function") {
    const row = await opts.resolvePlantByNombre(opts.db || pool, spec.plant_label);
    if (!row || !Number(row.id)) {
      return { ok: true, clarification: `No pude resolver la planta "${spec.plant_label}". No consulto otra planta.`, spec, now, rows: [] };
    }
    plantIdToUse = Number(row.id);
    plantLabel = row.nombre || spec.plant_label;
  }
  if (!plantIdToUse) {
    return { ok: true, clarification: "¿De qué planta quieres el movimiento de clientes?", spec, now, rows: [] };
  }
  spec.plant_id = plantIdToUse;
  spec.plant_label = sanitizePlantScopeLabel(plantLabel) || plantLabel;
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const denied = assertSehPlantaAccess(auth, plantIdToUse);
  if (!denied.ok) return { ...denied, spec, now };

  const canalFilter = canalFilterForSegment(spec.customer_segment);
  let currentRows = opts.currentSalesRows;
  let previousRows = opts.previousSalesRows;
  let currentDiscountRows = opts.currentDiscountRows;
  let previousDiscountRows = opts.previousDiscountRows;
  try {
    if (!Array.isArray(currentRows) || !Array.isArray(previousRows)) {
      const resolveCodes = opts.resolvePlantCodes || resolvePlantCodes;
      const qSales = opts.queryMonthlySales || queryMonthlySales;
      let codes = opts.plantCodes;
      if (!codes) {
        const resolved = await resolveCodes(opts.db || pool, spec.plant_label);
        codes = resolved && resolved.uniqueCodes;
      }
      if (!codes || !codes.length) {
        return { ok: false, status: 400, code: DIRECTOR_IA_VERACITY.SOURCE_ERROR, error: "No pude resolver el código ARR de la planta.", spec, now };
      }
      const curB = monthBounds(spec.current_period);
      const prevB = monthBounds(spec.previous_period);
      const cur = await qSales(opts.db || pool, codes, curB.start, curB.end, canalFilter);
      const prev = await qSales(opts.db || pool, codes, prevB.start, prevB.end, canalFilter);
      currentRows = (cur && cur.rows) || cur || [];
      previousRows = (prev && prev.rows) || prev || [];
      if (spec.movement_type === "DISCOUNT_MOVEMENT") {
        const qDisc = opts.queryMonthlyDiscount || queryMonthlyDiscount;
        const curD = await qDisc(opts.db || pool, codes, curB.start, curB.end, canalFilter);
        const prevD = await qDisc(opts.db || pool, codes, prevB.start, prevB.end, canalFilter);
        currentDiscountRows = (curD && curD.rows) || curD || [];
        previousDiscountRows = (prevD && prevD.rows) || prevD || [];
      }
    }
  } catch (e) {
    return {
      ok: false,
      status: 500,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      error: e && e.message ? e.message : "No se pudo leer ARR",
      spec,
      now,
    };
  }

  const currentMap = aggregateByClient(currentRows);
  const previousMap = aggregateByClient(previousRows);
  let rows = buildMovementRows(currentMap, previousMap, spec);
  if (spec.movement_type === "DISCOUNT_MOVEMENT") {
    const curDisc = aggregateDiscountByClient(currentDiscountRows, currentMap);
    const prevDisc = aggregateDiscountByClient(previousDiscountRows, previousMap);
    const names = new Set([...curDisc.keys(), ...prevDisc.keys()]);
    rows = [];
    for (const name of names) {
      if (spec.restrict_to_entities && spec.entity_names.length && !spec.entity_names.includes(name)) continue;
      const current = curDisc.get(name);
      const previous = prevDisc.get(name);
      const current_discount = current ? current.discount_per_kg : null;
      const previous_discount = previous ? previous.discount_per_kg : null;
      if (current_discount == null || previous_discount == null) continue;
      const delta_discount = current_discount - previous_discount;
      const movement_type = classifyDiscountMovement(previous_discount, current_discount);
      if (spec.ranking_direction === "BOTTOM" && movement_type !== MOVEMENT.DISMINUCION) continue;
      if (spec.ranking_direction === "TOP" && /\baument|subio|mayor\s+aumento/.test(normalizeText(question)) && movement_type !== MOVEMENT.AUMENTO) {
        if (movement_type !== MOVEMENT.AUMENTO) continue;
      }
      rows.push({
        cliente: name,
        previous_period: spec.previous_period,
        current_period: spec.current_period,
        previous_discount,
        current_discount,
        delta_discount,
        movement_type,
        source_kind: "ACTUAL",
      });
    }
    rows.sort((a, b) =>
      spec.ranking_direction === "BOTTOM" ? a.delta_discount - b.delta_discount : b.delta_discount - a.delta_discount
    );
  } else if (spec.movement_type === MOVEMENT.INACTIVO && spec.inactivity_window) {
    rows = rows.filter((row) => row.current_consumption === 0);
    rows.forEach((row) => {
      row.movement_type = MOVEMENT.INACTIVO;
      row.inactivity_window = spec.inactivity_window;
    });
  } else {
    rows = filterByMovement(rows, spec.movement_type);
  }

  return {
    ok: true,
    spec,
    rows,
    now,
    planta_id: plantIdToUse,
    source: spec.movement_type === "DISCOUNT_MOVEMENT" ? DISCOUNT_SOURCE : SOURCE_TABLE,
    source_kind: "ACTUAL",
  };
}

function encodeMovementPrior(spec, rows) {
  if (!spec || !spec.ok) return null;
  return {
    kind: "client_entity_set",
    display: spec.plant_label || "CLIENT_MOVEMENT",
    key: spec.current_period || "",
    domain: "client_movement",
    plant_label: spec.plant_label,
    plant_id: spec.plant_id,
    period: spec.current_period,
    previous_period: spec.previous_period,
    segment: spec.customer_segment,
    metric: spec.movement_type === "DISCOUNT_MOVEMENT" ? "DESCUENTO_POR_KG" : "VENTA_TON",
    movement_type: spec.movement_type,
    entity_names: (rows || []).map((row) => row.cliente).slice(0, 20),
    entities: (rows || []).slice(0, 20).map((row) => ({ display: row.cliente, key: row.cliente })),
  };
}

function priorMovementFromState(state) {
  if (!state || (state.parent_intent !== "client_movement" && state.parent_intent !== "client_ranking")) return null;
  const ent = Array.isArray(state.active_entities) ? state.active_entities[0] : null;
  if (!ent) return null;
  const names =
    Array.isArray(ent.entity_names) && ent.entity_names.length
      ? ent.entity_names
      : Array.isArray(ent.entities)
        ? ent.entities.map((e) => e.display).filter(Boolean)
        : Array.isArray(ent.ranked_names)
          ? ent.ranked_names
          : [];
  return {
    ok: true,
    movement_type: ent.movement_type || null,
    customer_segment: ent.segment || ent.customer_segment || "ALL",
    plant_label: ent.plant_label || null,
    plant_id: ent.plant_id || null,
    current_period: ent.period || ent.key || null,
    previous_period: ent.previous_period || null,
    entity_names: names,
  };
}

function buildClientMovementChatResult(payload, opts = {}) {
  const answer = buildClientMovementAnswer(payload);
  const spec = payload && payload.spec;
  const entity = encodeMovementPrior(spec, payload && payload.rows);
  const plantaId = payload && payload.planta_id != null ? payload.planta_id : opts.planta_id;
  return {
    ok: true,
    answer,
    sources: payload && payload.ok !== false ? [payload.source || SOURCE_TABLE] : [],
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
        parent_intent: "client_movement",
        planta_id: plantaId,
        active_subtopic: spec && spec.movement_type ? String(spec.movement_type).toLowerCase() : "client_movement",
        active_entities: entity ? [entity] : [],
      },
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SOURCE_TABLE,
  DISCOUNT_SOURCE,
  MOVEMENT,
  classifyRawMovement,
  classifyDiscountMovement,
  formatTonDisplay,
  formatDiscountDisplay,
  isClientMovementQuestion,
  isClientMovementFollowUp,
  extractClientMovementSpec,
  extractInactivityWindow,
  loadClientMovementForChat,
  buildClientMovementAnswer,
  buildClientMovementChatResult,
  priorMovementFromState,
  previousYm,
};
