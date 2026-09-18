"use strict";

/**
 * CLIENT_MOVEMENT — reutiliza computeClientesDescuentoMes (estatus ARR Clientes por mes).
 * DEJARON: kg actual <= 0 y kg previo > 0. No es ranking VENTA_TON.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { extractNamedPlant } = require("./director-ia-historical-margin");
const { extractPlantLabel, assertSehPlantaAccess } = require("./director-ia-seh-operation-status");
const { extractClientMovementSpec } = require("./director-ia-executive-backlog");
const { extractRankingPeriod, formatMonthLabel, hasPeriod } = require("./director-ia-client-ranking");
const { resolveArrClientesMesPlantCode, computeClientesDescuentoMes } = require("./dashboard-arr-forecast");

const SEMANTIC_CLASS = "client_movement";

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

function kgToTon(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n / 1000) * 10) / 10;
}

function classifyEstatus(kgA, kgB) {
  const a = Number(kgA) || 0;
  const b = Number(kgB) || 0;
  if (b <= 0 && a > 0) return "DEJARON_DE_COMPRAR";
  if (b > 0 && a <= 0) return "NUEVOS";
  if (b > 0 && a > 0 && b < a) return "DISMINUYERON";
  if (b > 0 && a > 0 && b > a) return "AUMENTARON";
  return null;
}

function movementLabel(code) {
  if (code === "DEJARON_DE_COMPRAR") return "dejaron de comprar";
  if (code === "DISMINUYERON") return "disminuyeron";
  if (code === "AUMENTARON") return "aumentaron";
  if (code === "NUEVOS") return "nuevos";
  if (code === "REACTIVADOS") return "se reactivaron";
  return "cambiaron";
}

function countMovements(rows) {
  const counts = { DEJARON_DE_COMPRAR: 0, DISMINUYERON: 0, AUMENTARON: 0, NUEVOS: 0 };
  for (const r of rows || []) {
    if (r && Object.prototype.hasOwnProperty.call(counts, r.movement)) counts[r.movement] += 1;
  }
  return counts;
}

function rowMatchesCanal(categoria, channel) {
  const n = String(categoria || "Casa").toLowerCase();
  if (channel === "CASA") return !n.includes("comisionista");
  if (channel === "COMISIONISTA") return n.includes("comisionista");
  return true;
}

function extractLimit(n, fallback = 10) {
  const digit = n.match(/\btop\s+(\d{1,2})\b/) || n.match(/\blos\s+(\d{1,2})\b/);
  if (digit) {
    const v = Number(digit[1]);
    if (v >= 1 && v <= 20) return v;
  }
  return fallback;
}

function extractClientMovementRankingSpec(question, prior, opts = {}) {
  const disc = extractClientMovementSpec(question, prior);
  const n = normalizeText(question);
  const usable = prior && prior.ok ? prior : disc.ok ? disc : null;
  const periodFrame = extractRankingPeriod(n, opts.now, usable, opts.selectedPeriod);
  const movement = (disc.ok && disc.movement) || (usable && usable.movement) || "DEJARON_DE_COMPRAR";
  const incomeAsked = /\bingreso\b/.test(n);
  return {
    ok: disc.ok || Boolean(usable && usable.movement),
    family: "CLIENT_MOVEMENT",
    domain: "ARR",
    operation: "RANK",
    entity_type: "CLIENT",
    movement,
    metric: incomeAsked ? "LOST_INCOME" : movement === "DEJARON_DE_COMPRAR" ? "LOST_VOLUME" : "VOLUME_DELTA",
    ranking_direction: "TOP",
    direction: movement === "AUMENTARON" ? "MOST_POSITIVE" : movement === "DISMINUYERON" ? "MOST_NEGATIVE" : "HIGH",
    limit: extractLimit(n, (usable && usable.limit) || 10),
    plant_label: extractNamedPlant(question) || extractPlantLabel(question) || (usable && (usable.plant_label || usable.plant)) || null,
    customer_segment: disc.channel && disc.channel !== "ALL" ? disc.channel : (usable && usable.customer_segment) || "ALL",
    period: periodFrame.period || (usable && usable.period) || null,
    period_kind: periodFrame.period_kind || (periodFrame.period ? "SINGLE" : usable && usable.period_kind) || null,
    period_start: periodFrame.period_start || null,
    period_end: periodFrame.period_end || null,
    invalid_range: Boolean(periodFrame.invalid_range),
    channel: disc.channel || (usable && usable.channel) || "ALL",
    subcategory: (usable && usable.subcategory) || null,
  };
}

function rankMovement(rows, spec) {
  const wanted = spec.movement;
  if (wanted === "SUMMARY") {
    const groups = { DEJARON_DE_COMPRAR: [], DISMINUYERON: [], AUMENTARON: [], NUEVOS: [] };
    for (const r of rows || []) {
      if (r && groups[r.movement]) groups[r.movement].push(r);
    }
    const limit = Math.min(spec.limit || 5, 5);
    const out = [];
    for (const [movement, list] of Object.entries(groups)) {
      list.sort((a, b) => Math.abs(Number(b.delta_kg) || 0) - Math.abs(Number(a.delta_kg) || 0));
      out.push(...list.slice(0, limit));
    }
    return out;
  }
  const list = (rows || []).filter((r) => r && r.movement === wanted);
  const income = spec.metric === "LOST_INCOME";
  list.sort((a, b) => {
    if (income) return Math.abs(Number(b.delta_ingreso) || 0) - Math.abs(Number(a.delta_ingreso) || 0);
    if (wanted === "AUMENTARON") return (Number(b.delta_kg) || 0) - (Number(a.delta_kg) || 0);
    return Math.abs(Number(b.delta_kg) || 0) - Math.abs(Number(a.delta_kg) || 0);
  });
  return list.slice(0, spec.limit || 10);
}

function classifyPair(a, b, channel) {
  if (!rowMatchesCanal(b.categoria || a.categoria, channel)) return null;
  const kgA = Number(a.kg) || 0;
  const kgB = Number(b.kg) || 0;
  const movement = classifyEstatus(kgA, kgB);
  if (!movement) return null;
  return {
    cliente: b.cliente || a.cliente,
    categoria: b.categoria || a.categoria || "Casa",
    subcategoria: b.subcategoria || a.subcategoria || "",
    kg_a: kgA,
    kg_b: kgB,
    delta_kg: kgB - kgA,
    delta_ingreso: (Number(b.ingreso) || 0) - (Number(a.ingreso) || 0),
    movement,
  };
}

async function loadClientMovementForChat(pool, plantaId, req, opts = {}) {
  const now = opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();
  const question = opts.question || "";
  const prior = opts.priorSpec && opts.priorSpec.ok ? opts.priorSpec : null;
  const spec = extractClientMovementRankingSpec(question, prior, {
    now,
    selectedPeriod: opts.selectedPeriod,
  });
  if (!spec.ok) {
    return { ok: false, error: "No pude determinar el movimiento de clientes.", spec, now };
  }
  if (spec.movement === "INACTIVOS") {
    return {
      ok: true,
      limitation:
        "El ARR de movimiento mensual clasifica Dejaron / Disminuyeron / Aumentaron / Nuevos. Activo, Latente e Inactivo viven en DICF; si no cargo esa lectura, no invento el umbral.",
      spec,
      now,
      ranked: [],
      question,
    };
  }
  if (!hasPeriod(spec)) {
    return {
      ok: true,
      clarification: "¿De qué mes o periodo quieres el movimiento de clientes?",
      spec,
      now,
      ranked: [],
      question,
    };
  }
  const selectedId = Number(plantaId);
  const plantIdToUse = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null;
  if (!plantIdToUse) {
    return { ok: true, clarification: "¿De qué planta quieres el movimiento de clientes?", spec, now, ranked: [] };
  }
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const denied = assertSehPlantaAccess(auth, plantIdToUse);
  if (!denied.ok) return { ...denied, spec, now };

  if (Array.isArray(opts.movementRows)) {
    const ranked = rankMovement(opts.movementRows, spec);
    return {
      ok: true,
      spec,
      ranked,
      counts: countMovements(opts.movementRows),
      now,
      planta_id: plantIdToUse,
      data_semantics: ranked.length ? "OBSERVED_CLOSED" : "NO_ROWS_OBSERVED",
      compare_period: previousYearMonth(spec.period),
    };
  }

  const plantLabel = spec.plant_label || opts.plant_label;
  const db = opts.db || pool;
  let plantCode = opts.arrPlantCode;
  if (!plantCode && db && typeof db.query === "function") {
    plantCode = await resolveArrClientesMesPlantCode(db, plantLabel);
  }
  if (!plantCode) {
    return {
      ok: false,
      status: 400,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      error: "No pude resolver el código ARR de la planta. No invento clientes.",
      spec,
      now,
    };
  }
  const periodB = spec.period;
  const periodA = previousYearMonth(periodB);
  const [yB, mB] = periodB.split("-").map(Number);
  const [yA, mA] = periodA.split("-").map(Number);
  const compute = opts.computeClientesDescuentoMes || computeClientesDescuentoMes;
  const [packA, packB] = await Promise.all([
    compute(db, yA, mA, plantCode, { historico: true }),
    compute(db, yB, mB, plantCode, { historico: true }),
  ]);
  const mapA = new Map();
  for (const r of (packA && packA.rows) || []) {
    const name = String(r.cliente || "").trim();
    if (name) mapA.set(name, r);
  }
  const mapB = new Map();
  for (const r of (packB && packB.rows) || []) {
    const name = String(r.cliente || "").trim();
    if (name) mapB.set(name, r);
  }
  const names = new Set([...mapA.keys(), ...mapB.keys()]);
  const classified = [];
  for (const name of names) {
    const a = mapA.get(name) || { cliente: name, kg: 0, categoria: "Casa" };
    const b = mapB.get(name) || { cliente: name, kg: 0, categoria: a.categoria };
    const row = classifyPair(a, b, spec.customer_segment);
    if (row) classified.push(row);
  }
  const ranked = rankMovement(classified, spec);
  return {
    ok: true,
    spec,
    ranked,
    counts: countMovements(classified),
    now,
    planta_id: plantIdToUse,
    data_semantics: ranked.length ? "OBSERVED_CLOSED" : "NO_ROWS_OBSERVED",
    compare_period: periodA,
    source: "dashboard-arr-forecast.computeClientesDescuentoMes",
  };
}

function buildClientMovementAnswer(payload) {
  if (!payload) return "No pude consultar el movimiento de clientes.";
  if (payload.clarification) return payload.clarification;
  if (payload.limitation) return payload.limitation;
  if (payload.ok === false) return payload.error || "No pude consultar el movimiento de clientes.";
  const spec = payload.spec || {};
  const ranked = payload.ranked || [];
  const label = movementLabel(spec.movement);
  if (!ranked.length) {
    return `No tengo comparación de movimiento de clientes (${label}) para ${formatMonthLabel(spec.period)}.`;
  }
  const prev = formatMonthLabel(payload.compare_period || previousYearMonth(spec.period));
  if (spec.movement === "SUMMARY") {
    const counts = payload.counts || {};
    const lines = [
      `Movimiento de clientes en ${formatMonthLabel(spec.period)} vs ${prev} (ARR Clientes por mes):`,
      `Dejaron de comprar: ${counts.DEJARON_DE_COMPRAR || 0}`,
      `Disminuyeron: ${counts.DISMINUYERON || 0}`,
      `Aumentaron: ${counts.AUMENTARON || 0}`,
      `Nuevos: ${counts.NUEVOS || 0}`,
    ];
    for (const row of ranked) {
      lines.push(`${movementLabel(row.movement)} — ${row.cliente} (${kgToTon(row.delta_kg).toFixed(1)} ton)`);
    }
    return lines.join("\n");
  }
  const title =
    spec.movement === "DEJARON_DE_COMPRAR"
      ? `En ${formatMonthLabel(spec.period)}, los clientes que dejaron de comprar respecto de ${prev}, ordenados por volumen perdido:`
      : spec.metric === "LOST_INCOME"
        ? `En ${formatMonthLabel(spec.period)}, mayor pérdida de ingreso por ${label} respecto de ${prev}:`
      : `En ${formatMonthLabel(spec.period)}, los clientes que ${label} respecto de ${prev}:`;
  const lines = ranked.map((row, i) => {
    const deltaTon = kgToTon(row.delta_kg);
    const sign = deltaTon > 0 ? "+" : "";
    return `${i + 1}. ${row.cliente} — ${sign}${deltaTon.toFixed(1)} ton`;
  });
  return [title, ...lines].join("\n");
}

function priorMovementFromState(state) {
  const entities = state && Array.isArray(state.active_entities) ? state.active_entities : [];
  const hit = entities.find((e) => e && (e.kind === "client_movement" || e.movement));
  if (!hit && !(state && state.parent_intent === "client_movement")) return null;
  const gap = state && state.pending_information_gap && state.pending_information_gap.frame;
  return {
    ok: true,
    movement: (hit && hit.movement) || (gap && gap.movement) || null,
    metric: (hit && hit.metric) || (gap && gap.metric) || null,
    direction: (hit && hit.direction) || (gap && gap.direction) || null,
    limit: (hit && hit.limit) || (gap && gap.limit) || 10,
    period: (hit && hit.period) || (gap && (gap.period_month || gap.period)) || null,
    plant: (gap && (gap.plant_label || gap.plant)) || null,
    channel: (hit && hit.channel) || (gap && gap.channel) || "ALL",
    subcategory: (gap && gap.subcategory) || null,
    ranked_names: (hit && hit.ranked_names) || [],
  };
}

function buildClientMovementChatResult(payload, opts = {}) {
  const answer = buildClientMovementAnswer(payload);
  const spec = payload && payload.spec;
  const plantaId = payload && payload.planta_id != null ? payload.planta_id : opts.planta_id;
  const pending =
    payload && payload.clarification && spec && !hasPeriod(spec)
      ? {
          kind: "dimension_completion",
          parent_intent: "client_movement",
          missing_fields: ["period"],
          frame: {
            domain: "ARR",
            operation: "RANK",
            entity_type: "CLIENT",
            movement: spec.movement,
            metric: spec.metric,
            direction: spec.direction,
            limit: spec.limit,
            plant_label: spec.plant_label,
            customer_segment: spec.customer_segment,
            channel: spec.channel,
            subcategory: spec.subcategory || null,
          },
          original_question: payload.question || null,
          why_blocks: "Falta periodo del movimiento. No invento el mes.",
        }
      : null;
  return {
    ok: true,
    answer,
    sources: payload && payload.ok !== false ? ["arr.ventas_diarias_cliente"] : [],
    context_meta: {
      mode: SEMANTIC_CLASS,
      openai_called: false,
      veracity: DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
      semantic_class: SEMANTIC_CLASS,
      planta_id: plantaId,
      conversation_state: {
        parent_intent: "client_movement",
        planta_id: plantaId,
        active_subtopic: "client_movement",
        active_entities: [
          {
            kind: "client_movement",
            movement: spec && spec.movement,
            metric: spec && spec.metric,
            limit: spec && spec.limit,
            period: spec && spec.period,
            ranked_names: ((payload && payload.ranked) || []).map((r) => r.cliente).slice(0, 20),
          },
        ],
        pending_information_gap: pending,
      },
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  classifyEstatus,
  extractClientMovementRankingSpec,
  rankMovement,
  loadClientMovementForChat,
  buildClientMovementAnswer,
  buildClientMovementChatResult,
  priorMovementFromState,
  previousYearMonth,
};
