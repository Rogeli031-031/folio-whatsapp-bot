"use strict";

/**
 * FOLIOS_DOMAIN: profundidad de rentabilidad contra parent + active_subtopic.
 * No es un recognizer global. Sin parent/subtopic no interpreta "corporativos".
 */

const PROFITABILITY_PARENT = "profitability_deterioro_snapshot";

function normalizeSubtopicQuestion(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isExpenseToken(token) {
  const s = String(token || "");
  return s === "expense" || s.startsWith("expense.");
}

function focusFromToken(token) {
  if (token === "expense.corporate") return "corporate";
  if (token === "expense.operational") return "operational";
  if (token === "expense") return "expense";
  return null;
}

function isExpenseOpenCue(q) {
  return /^(el |la |los |las )?gastos?$/.test(q) || /^y (el |la |los |las )?gastos?$/.test(q);
}

function isCorporateChildCue(q) {
  return /^(y )?(el |la |los |las )?corporativos?$/.test(q);
}

function isOperationalChildCue(q) {
  return /^(y )?(el |la |los |las )?operativos?$/.test(q);
}

function isMagnitudeProbeCue(q) {
  return (
    /^cuanto(s)? (subieron|bajaron|pesaron)?$/.test(q) ||
    /^cuanto subieron$/.test(q) ||
    /^cual pesa mas$/.test(q)
  );
}

function expenseFieldFromFocus(focus) {
  if (focus === "corporate") return "corporativos";
  if (focus === "operational") return "operativos";
  return "gasto";
}

function expenseBranchLabel(field) {
  if (field === "corporativos") return "gasto corporativo";
  if (field === "operativos") return "gasto operativo";
  return "gasto total";
}

function expenseVariationLabel(field) {
  if (field === "corporativos") return "variación de gasto corporativo";
  if (field === "operativos") return "variación de gasto operativo";
  return "variación de gasto total";
}

function formatExpenseMxn(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "n/d";
  const abs = Math.abs(Math.round(n)).toLocaleString("es-MX");
  return n < 0 ? `-$${abs}` : `$${abs}`;
}

function buildExpenseCompare(kpiA, kpiB, focus) {
  const field = expenseFieldFromFocus(focus);
  const a = Number.isFinite(Number(kpiA && kpiA[field])) ? Number(kpiA[field]) : null;
  const b = Number.isFinite(Number(kpiB && kpiB[field])) ? Number(kpiB[field]) : null;
  if (a == null || b == null) return null;
  return {
    field,
    a,
    b,
    delta: b - a,
    source: `rows.${field}`,
  };
}

function inheritedPeriodPhrase(months) {
  const list = Array.isArray(months)
    ? months.map((m) => String(m || "").trim()).filter((m) => /^\d{4}-\d{2}$/.test(m))
    : [];
  if (list.length >= 2) return `${list[0]} vs ${list[1]}`;
  if (list.length === 1) return list[0];
  return null;
}

/**
 * @returns {{ handled: boolean, next_subtopic?: string|null, focus?: string|null, kind?: string, reason?: string }}
 */
function resolveProfitabilitySubtopicTurn(opts) {
  const parent = opts && opts.parent_intent;
  const incoming = opts && opts.active_subtopic ? String(opts.active_subtopic) : null;
  const q = normalizeSubtopicQuestion(opts && opts.question);
  if (parent !== PROFITABILITY_PARENT) {
    return { handled: false, reason: "no_profitability_parent" };
  }
  if (!q) return { handled: false, reason: "empty" };

  if (!incoming) {
    if (isExpenseOpenCue(q)) {
      return { handled: true, next_subtopic: "expense", focus: "expense", kind: "open_branch" };
    }
    return { handled: false, reason: "no_active_subtopic" };
  }
  if (!isExpenseToken(incoming)) {
    return { handled: false, reason: "foreign_subtopic" };
  }

  if (isExpenseOpenCue(q)) {
    return {
      handled: true,
      next_subtopic: incoming,
      focus: focusFromToken(incoming) || "expense",
      kind: "stay",
    };
  }
  if (isCorporateChildCue(q)) {
    return { handled: true, next_subtopic: "expense.corporate", focus: "corporate", kind: "child" };
  }
  if (isOperationalChildCue(q)) {
    return { handled: true, next_subtopic: "expense.operational", focus: "operational", kind: "child" };
  }
  if (isMagnitudeProbeCue(q)) {
    return {
      handled: true,
      next_subtopic: incoming,
      focus: focusFromToken(incoming) || "expense",
      kind: "probe_unavailable",
    };
  }
  return {
    handled: true,
    next_subtopic: incoming,
    focus: focusFromToken(incoming) || "expense",
    kind: "unrecognized_in_thread",
  };
}

function buildProfitabilitySubtopicFollowUpAnswer(opts) {
  const plant = String((opts && opts.planta_nombre) || "").trim() || "esta planta";
  const period = inheritedPeriodPhrase(opts && opts.active_period_months);
  const periodBit = period ? ` (${period})` : "";
  const kind = opts && opts.kind;
  const focus = opts && opts.focus;
  if (kind === "open_branch" || (kind === "stay" && focus === "expense")) {
    return [
      `Sí, seguimos con el deterioro de rentabilidad de ${plant}${periodBit}.`,
      "Sobre gasto, todavía no existe un Delta Gastos reconciliado con esa rentabilidad, así que no le atribuyo una parte exacta de la caída.",
      "Si quieres, el siguiente paso puede ser precisar una rama de gasto o seguir por la presión comercial ya observada, sin inventar causalidad.",
    ].join(" ");
  }
  if (kind === "child" && focus === "corporate") {
    return [
      `Sí, seguimos dentro de gasto de ${plant}${periodBit}.`,
      "Corporativos es la rama que estás abriendo.",
      "Todavía no tengo ese comparativo corporativo conectado a este análisis, así que no le atribuyo una parte exacta de la caída.",
    ].join(" ");
  }
  if (kind === "child" && focus === "operational") {
    return [
      `Sí, seguimos dentro de gasto de ${plant}${periodBit}.`,
      "Operativos es la rama que estás abriendo.",
      "Todavía no tengo ese comparativo operativo conectado a este análisis, así que no le atribuyo una parte exacta de la caída.",
    ].join(" ");
  }
  if (kind === "probe_compare") {
    const cmp = opts && opts.expense_compare;
    const field = (cmp && cmp.field) || expenseFieldFromFocus(focus);
    const rama = expenseBranchLabel(field);
    return [
      `Seguimos en el análisis de rentabilidad, dentro de ${rama}${periodBit}.`,
      `A: ${formatExpenseMxn(cmp && cmp.a)}.`,
      `B: ${formatExpenseMxn(cmp && cmp.b)}.`,
      `${expenseVariationLabel(field)}: ${formatExpenseMxn(cmp && cmp.delta)}.`,
      "No le asigno causalidad.",
    ].join(" ");
  }
  if (kind === "probe_unavailable") {
    const rama = focus === "corporate" ? "corporativos" : focus === "operational" ? "operativos" : "gasto";
    return [
      `Seguimos en el análisis de rentabilidad, dentro de ${rama}${periodBit}.`,
      "Todavía no está conectado un comparativo que permita decir cuánto se movió esa rama.",
      "No invento la cifra ni cambio de tema.",
    ].join(" ");
  }
  return [
    `Seguimos en el análisis de rentabilidad de ${plant}, dentro de gasto${periodBit}.`,
    "No pude anclar esa frase a una rama de gasto con evidencia conectada.",
    "No salgo del hilo ni consulto otro dominio.",
  ].join(" ");
}

function buildProfitabilitySubtopicFollowUpChatResult(opts = {}) {
  const planta_id = opts.planta_id;
  return {
    ok: true,
    answer: buildProfitabilitySubtopicFollowUpAnswer(opts),
    sources: [],
    context_meta: {
      mode: "profitability_subtopic_followup",
      requested_domain: "profitability_deterioro_snapshot",
      inherit: true,
      inherit_parent_intent: PROFITABILITY_PARENT,
      active_subtopic: opts.next_subtopic || opts.active_subtopic || null,
      subtopic_focus: opts.focus || null,
      subtopic_kind: opts.kind || null,
      expense_compare: opts.expense_compare || null,
      openai_called: false,
      planta_id,
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = {
  PROFITABILITY_PARENT,
  resolveProfitabilitySubtopicTurn,
  buildExpenseCompare,
  expenseFieldFromFocus,
  buildProfitabilitySubtopicFollowUpAnswer,
  buildProfitabilitySubtopicFollowUpChatResult,
};
