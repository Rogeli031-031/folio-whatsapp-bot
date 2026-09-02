"use strict";

/**
 * TIER 1 Golden harness. Observes planner / conversation-state / loaders existentes.
 * No modifica runtime. No LIVE_DB. No prosa LLM.
 */

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../../lib/director-ia-planner");
const {
  resolveConversationTurn,
  buildConversationState,
  extractEntityHint,
} = require("../../lib/director-ia-conversation-state");
const {
  isClientProfileQuestion,
  extractEmbeddedClientHintCandidates,
  loadClientProfileForChat,
  resolveClientProfileSlots,
  parseExplicitPeriod,
  defaultThreeMonths,
} = require("../../lib/director-ia-client-profile");
const {
  isHistoricalNewClientsQuestion,
  resolveRequestedCalendarMonth,
} = require("../../lib/director-ia-new-clients");
const { isCommercialMoversQuestion, isCommercialTrendQuestion } = require("../../lib/director-ia-commercial-trend");
const { isHistoricalMarginQuestion, resolveHistoricalMarginRequest } = require("../../lib/director-ia-historical-margin");
const { getDirectorIaTool } = require("../../lib/director-ia-tools");
const { CASES, NOW_ISO } = require("../fixtures/director-ia-golden-cases");

const BOUNDARIES = Object.freeze([
  "INPUT",
  "CONTEXT",
  "PLANNER",
  "ENTITY_EXTRACTION",
  "CANONICAL_RESOLUTION",
  "METRIC_RESOLUTION",
  "PERIOD_RESOLUTION",
  "TOOL_ORCHESTRATOR_ROUTE",
  "EVIDENCE",
  "USER_VISIBLE_OUTCOME",
]);

const NOW = new Date(NOW_ISO);

function catalogSales() {
  return [
    { month: "2026-01", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", kg: 10 },
    { month: "2026-08", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", kg: 40 },
    { month: "2026-08", cliente_norm: "TORTILLERIA", canal: "Casa", subcanal: "", kg: 15 },
  ];
}

function profileBase() {
  return {
    now: NOW,
    resolvePlanta: async () => ({ id: 1, nombre: "Acapulco", clave: "E3" }),
    resolvePlantCodes: async () => ({ not_found: false, uniqueCodes: ["E3"], plantCode: "E3" }),
    queryMonthlySales: async () => ({ rows: catalogSales() }),
    queryMonthlyDiscount: async () => ({ rows: [] }),
    queryActionsByKeys: async () => [],
    queryHistorialForActions: async () => new Map(),
    loadRecentCommentsByClienteNombres: async () => new Map(),
    queryCommentsByKeys: async () => [],
  };
}

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function questionHas(q, token) {
  return norm(q).includes(norm(token));
}

function toolsForIntentDomain(plan) {
  const domain = plan && plan.domains && plan.domains[0];
  if (!domain) return [];
  try {
    const { listToolsForDomain } = require("../../lib/director-ia-tools");
    return (listToolsForDomain(domain) || []).map((t) => t && t.id).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function classifyMovement(question) {
  const q = norm(question);
  if (/dejaron de comprar/.test(q)) return "DEJARON_DE_COMPRAR";
  if (/disminuy/.test(q)) return "DISMINUYERON";
  if (/aument/.test(q)) return "AUMENTARON";
  return null;
}

function detectMetrics(question) {
  const q = norm(question);
  const out = [];
  if (/\bkg\b/.test(q) || /\bcompr/.test(q)) out.push("kg");
  if (/\bdescuento/.test(q)) out.push("descuento");
  if (/\bmargen/.test(q)) out.push("margen");
  return out;
}

function mark(status, detail) {
  return { status, detail: detail == null ? null : String(detail) };
}

async function evaluateCase(goldenCase) {
  const boundaries = {};
  for (const name of BOUNDARIES) boundaries[name] = mark("NOT_REACHED");

  const turns = goldenCase.turns || [];
  const lastTurn = turns[turns.length - 1];
  const question = lastTurn && lastTurn.question;
  if (!question || !String(question).trim()) {
    boundaries.INPUT = mark("FAIL", "pregunta vacía");
    return finish(goldenCase, boundaries, null);
  }
  boundaries.INPUT = mark("PASS", "pregunta presente");

  let echoedState = null;
  let history = [];
  if (turns.length > 1) {
    const parentQ = turns[0].question;
    const parentDetected = detectDirectorIaIntent(parentQ);
    const parentTurn = resolveConversationTurn({
      question: parentQ,
      history: [],
      plantaId: 1,
      echoedState: null,
      detectIntent: detectDirectorIaIntent,
    });
    echoedState = buildConversationState({
      plantaId: 1,
      parent_intent: parentTurn.parent_intent || parentDetected.intent,
      last_evidence_bundle_type: parentDetected.intent,
      active_entities:
        parentTurn.entity_hint
          ? [{ kind: "client", display: parentTurn.entity_hint, cliente_key: null, cliente_keys: [] }]
          : [],
    });
    history = [{ role: "user", content: parentQ }];
    boundaries.CONTEXT = mark("PASS", `parent_intent=${echoedState.parent_intent}`);
  } else {
    boundaries.CONTEXT = mark("PASS", "first_turn");
  }

  const detected = detectDirectorIaIntent(question);
  const turn = resolveConversationTurn({
    question,
    history,
    plantaId: 1,
    echoedState,
    detectIntent: detectDirectorIaIntent,
  });
  const planOpts =
    turn.inherit && turn.inherit_parent_intent ? { inheritParentIntent: turn.inherit_parent_intent } : {};
  const plan = planDirectorIaQuestion(question, planOpts);

  if (goldenCase.forbidden_intent && plan.intent === goldenCase.forbidden_intent) {
    boundaries.PLANNER = mark(
      "FAIL",
      `intent=${plan.intent} inherit=${Boolean(turn.inherit)} forbidden=${goldenCase.forbidden_intent}`
    );
    return finish(goldenCase, boundaries, { detected, turn, plan });
  }
  if (goldenCase.expected_intent && plan.intent !== goldenCase.expected_intent) {
    boundaries.PLANNER = mark("FAIL", `intent=${plan.intent} expected=${goldenCase.expected_intent}`);
    return finish(goldenCase, boundaries, { detected, turn, plan });
  }
  boundaries.PLANNER = mark("PASS", `intent=${plan.intent} inherit=${Boolean(turn.inherit)}`);

  const expectedEntity = goldenCase.expected_entity;
  if (expectedEntity) {
    const hint = turn.entity_hint || extractEntityHint(question);
    const embedded = extractEmbeddedClientHintCandidates(question);
    const got = hint || (embedded && embedded.longest) || null;
    if (!got || norm(got) !== norm(expectedEntity)) {
      boundaries.ENTITY_EXTRACTION = mark("FAIL", `entity_hint=${got || "null"}`);
      return finish(goldenCase, boundaries, { detected, turn, plan });
    }
    boundaries.ENTITY_EXTRACTION = mark("PASS", `entity_hint=${got}`);
  } else {
    if (turn.entity_hint && goldenCase.expected_evidence_behavior === "aggregated_no_cliente_key") {
      boundaries.ENTITY_EXTRACTION = mark("FAIL", `unexpected entity_hint=${turn.entity_hint}`);
      return finish(goldenCase, boundaries, { detected, turn, plan });
    }
    boundaries.ENTITY_EXTRACTION = mark("PASS", "no individual entity required");
  }

  let assembled = null;
  if (expectedEntity && (plan.intent === "client_profile" || isClientProfileQuestion(question))) {
    assembled = await loadClientProfileForChat(
      { connect: async () => ({ release() {} }) },
      1,
      { dashboardAuth: { role: "ZP" } },
      {
        ...profileBase(),
        question,
        entity_hint: turn.entity_hint,
        entity_hint_candidates: turn.entity_hint_candidates,
        leading_y_requires_canonical: turn.leading_y_requires_canonical,
        embedded_client_requires_canonical: turn.embedded_client_requires_canonical,
      }
    );
    const resolved = assembled && assembled.ok && assembled.identity && assembled.identity.cliente_norm;
    if (!resolved || norm(resolved) !== norm(expectedEntity)) {
      boundaries.CANONICAL_RESOLUTION = mark(
        "FAIL",
        `resolved=${resolved || "null"} needs_clarification=${assembled && assembled.needs_clarification}`
      );
      return finish(goldenCase, boundaries, { detected, turn, plan, assembled });
    }
    if (assembled.needs_clarification && goldenCase.clarification_allowed === false) {
      boundaries.CANONICAL_RESOLUTION = mark("FAIL", "needs_clarification=true");
      return finish(goldenCase, boundaries, { detected, turn, plan, assembled });
    }
    boundaries.CANONICAL_RESOLUTION = mark("PASS", `cliente_norm=${resolved}`);
  } else if (expectedEntity) {
    boundaries.CANONICAL_RESOLUTION = mark("NOT_OBSERVABLE", "loader client_profile no alcanzado");
  } else {
    boundaries.CANONICAL_RESOLUTION = mark("PASS", "agregado: no requiere canónico individual");
  }

  const metrics = detectMetrics(question);
  const expectedMetrics = goldenCase.expected_metrics || [];
  if (expectedMetrics.length) {
    const missing = expectedMetrics.filter((m) => !metrics.includes(m));
    if (missing.length) {
      boundaries.METRIC_RESOLUTION = mark("FAIL", `missing=${missing.join(",")} observed=${metrics.join(",") || "none"}`);
      return finish(goldenCase, boundaries, { detected, turn, plan, assembled, metrics });
    }
    if (expectedMetrics.includes("descuento") && (plan.intent === "historical_margin" || isHistoricalMarginQuestion(question))) {
      boundaries.METRIC_RESOLUTION = mark("FAIL", "descuento pedido pero ruta historical_margin");
      return finish(goldenCase, boundaries, { detected, turn, plan, assembled, metrics });
    }
    boundaries.METRIC_RESOLUTION = mark("PASS", metrics.join(","));
  } else {
    boundaries.METRIC_RESOLUTION = mark("PASS", "no metric contract");
  }

  const periodExp = goldenCase.expected_period;
  if (periodExp) {
    if (plan.intent === "historical_new_clients" || isHistoricalNewClientsQuestion(question, NOW)) {
      const month = resolveRequestedCalendarMonth(question, NOW);
      const yyyymm = month ? `${month.year}-${String(month.month).padStart(2, "0")}` : null;
      if (!yyyymm || (periodExp.start && yyyymm !== periodExp.start)) {
        boundaries.PERIOD_RESOLUTION = mark("FAIL", `new_clients_month=${yyyymm || "null"}`);
        return finish(goldenCase, boundaries, { detected, turn, plan, assembled });
      }
      boundaries.PERIOD_RESOLUTION = mark("PASS", yyyymm);
    } else if (assembled && assembled.period) {
      const months = assembled.period.months || [];
      const source = assembled.period.source;
      if (periodExp.source && source !== periodExp.source) {
        boundaries.PERIOD_RESOLUTION = mark("FAIL", `source=${source} expected=${periodExp.source}`);
        return finish(goldenCase, boundaries, { detected, turn, plan, assembled });
      }
      if (periodExp.start && !months.includes(periodExp.start)) {
        boundaries.PERIOD_RESOLUTION = mark("FAIL", `months=${months.join(",")} missing ${periodExp.start}`);
        return finish(goldenCase, boundaries, { detected, turn, plan, assembled });
      }
      if (periodExp.end && !months.includes(periodExp.end)) {
        boundaries.PERIOD_RESOLUTION = mark("FAIL", `months=${months.join(",")} missing ${periodExp.end}`);
        return finish(goldenCase, boundaries, { detected, turn, plan, assembled });
      }
      boundaries.PERIOD_RESOLUTION = mark("PASS", `${source}:${months[0] || ""}..${months[months.length - 1] || ""}`);
    } else if (goldenCase.expected_intent === "client_profile" || isClientProfileQuestion(question)) {
      const parsed = parseExplicitPeriod(question, NOW);
      const slots = resolveClientProfileSlots(question, {}, NOW);
      const months = (parsed.months && parsed.months.map((m) => m.yyyymm)) || (slots.months || []);
      if (periodExp.source === "explicit" && parsed.source !== "explicit") {
        boundaries.PERIOD_RESOLUTION = mark("FAIL", `parse source=${parsed.source || "null"}`);
        return finish(goldenCase, boundaries, { detected, turn, plan });
      }
      if (periodExp.start && months.length && !months.includes(periodExp.start)) {
        boundaries.PERIOD_RESOLUTION = mark("FAIL", `slots=${months.join(",")}`);
        return finish(goldenCase, boundaries, { detected, turn, plan });
      }
      boundaries.PERIOD_RESOLUTION = mark("PASS", months.join(",") || defaultThreeMonths(NOW).map((m) => m.yyyymm).join(","));
    } else if (periodExp.start && /agosto/.test(norm(question))) {
      const hm = resolveHistoricalMarginRequest(question, NOW);
      if (goldenCase.forbidden_intent === "historical_margin" && hm && hm.operation === "single_month") {
        boundaries.PERIOD_RESOLUTION = mark(
          "FAIL",
          "resolveHistoricalMarginRequest aceptó mes sin métrica margen"
        );
        return finish(goldenCase, boundaries, { detected, turn, plan, hm });
      }
      boundaries.PERIOD_RESOLUTION = mark("PASS", periodExp.start);
    } else {
      boundaries.PERIOD_RESOLUTION = mark("NOT_OBSERVABLE", "sin loader de periodo para este intent");
    }
  } else {
    boundaries.PERIOD_RESOLUTION = mark("PASS", "no period contract");
  }

  const route = goldenCase.expected_tool_or_route;
  if (route === "get_client_profile") {
    const tool = getDirectorIaTool("get_client_profile");
    if (!tool || plan.intent !== "client_profile") {
      boundaries.TOOL_ORCHESTRATOR_ROUTE = mark("FAIL", `intent=${plan.intent} tool=${Boolean(tool)}`);
      return finish(goldenCase, boundaries, { detected, turn, plan, assembled });
    }
    boundaries.TOOL_ORCHESTRATOR_ROUTE = mark("PASS", "get_client_profile");
  } else if (route === "get_historical_new_clients") {
    if (plan.intent !== "historical_new_clients" || !isHistoricalNewClientsQuestion(question, NOW)) {
      boundaries.TOOL_ORCHESTRATOR_ROUTE = mark(
        "FAIL",
        `intent=${plan.intent} isHistoricalNewClients=${isHistoricalNewClientsQuestion(question, NOW)}`
      );
      return finish(goldenCase, boundaries, { detected, turn, plan });
    }
    boundaries.TOOL_ORCHESTRATOR_ROUTE = mark("PASS", "get_historical_new_clients");
  } else if (route === "commercial_movers") {
    const movers = isCommercialMoversQuestion(question);
    const trend = isCommercialTrendQuestion(question);
    const movement = classifyMovement(question);
    if (!movers || !trend) {
      boundaries.TOOL_ORCHESTRATOR_ROUTE = mark("FAIL", `movers=${movers} trend=${trend}`);
      return finish(goldenCase, boundaries, { detected, turn, plan });
    }
    if (goldenCase.expected_movement && movement !== goldenCase.expected_movement) {
      boundaries.TOOL_ORCHESTRATOR_ROUTE = mark("FAIL", `movement=${movement}`);
      return finish(goldenCase, boundaries, { detected, turn, plan });
    }
    if (plan.intent === "client_profile") {
      boundaries.TOOL_ORCHESTRATOR_ROUTE = mark("FAIL", "aggregated movers routed to client_profile");
      return finish(goldenCase, boundaries, { detected, turn, plan });
    }
    boundaries.TOOL_ORCHESTRATOR_ROUTE = mark("PASS", `movers/${movement || plan.intent}`);
  } else {
    boundaries.TOOL_ORCHESTRATOR_ROUTE = mark("NOT_OBSERVABLE", "sin ruta contractual");
  }

  if (assembled && assembled.ok) {
    boundaries.EVIDENCE = mark("PASS", "fixture pack assembled");
  } else if (plan.intent === "historical_new_clients" || plan.intent === "commercial_trend") {
    boundaries.EVIDENCE = mark("NOT_OBSERVABLE", "TIER1 no ejecuta LIVE_DB ni loader agregado con datos reales");
  } else {
    boundaries.EVIDENCE = mark("NOT_OBSERVABLE", "sin pack de evidencia en este caso");
  }

  const clarification =
    (assembled && assembled.needs_clarification) ||
    turn.unknown_needs_clarification ||
    plan.requires_clarification;
  if (goldenCase.clarification_allowed === false && clarification) {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", "clarification no permitida");
    return finish(goldenCase, boundaries, { detected, turn, plan, assembled });
  }
  if (goldenCase.expected_evidence_behavior === "must_not_answer_margin" && plan.intent === "historical_margin") {
    boundaries.USER_VISIBLE_OUTCOME = mark("FAIL", "respondería margen");
    return finish(goldenCase, boundaries, { detected, turn, plan });
  }
  boundaries.USER_VISIBLE_OUTCOME = mark(
    "PASS",
    clarification ? "clarification_allowed" : "no_cliente_key_prompt"
  );

  return finish(goldenCase, boundaries, { detected, turn, plan, assembled, metrics, tools: toolsForIntentDomain(plan) });
}

function firstBadBoundary(boundaries) {
  for (const name of BOUNDARIES) {
    if (boundaries[name] && boundaries[name].status === "FAIL") return name;
  }
  return null;
}

function finish(goldenCase, boundaries, observed) {
  const first = firstBadBoundary(boundaries);
  const result = first ? "FAIL" : "PASS";
  return {
    id: goldenCase.id,
    category: goldenCase.category,
    question: (goldenCase.turns[goldenCase.turns.length - 1] || {}).question,
    result,
    failure_class: result === "FAIL" ? "PRODUCT_GOLDEN_FAILURE" : null,
    first_bad_boundary: first,
    boundaries,
    expected_intent: goldenCase.expected_intent,
    actual_intent: observed && observed.plan ? observed.plan.intent : null,
    inherit: observed && observed.turn ? Boolean(observed.turn.inherit) : false,
    notes: goldenCase.notes || "",
  };
}

async function runOne(goldenCase) {
  try {
    return await evaluateCase(goldenCase);
  } catch (err) {
    const boundaries = {};
    for (const name of BOUNDARIES) boundaries[name] = mark("NOT_REACHED");
    boundaries.INPUT = mark("FAIL", `HARNESS: ${err && err.message}`);
    return {
      id: goldenCase.id,
      category: goldenCase.category,
      question: (goldenCase.turns[goldenCase.turns.length - 1] || {}).question,
      result: "FAIL",
      failure_class: "HARNESS_FAILURE",
      first_bad_boundary: "INPUT",
      boundaries,
      expected_intent: goldenCase.expected_intent,
      actual_intent: null,
      inherit: false,
      notes: String(err && err.stack ? err.stack.split("\n")[0] : err),
    };
  }
}

async function runGoldenSet(cases) {
  const list = cases || CASES;
  const rows = [];
  for (const c of list) {
    rows.push(await runOne(c));
  }
  const pass = rows.filter((r) => r.result === "PASS").length;
  const fail = rows.filter((r) => r.result === "FAIL").length;
  const harnessFail = rows.filter((r) => r.failure_class === "HARNESS_FAILURE").length;
  const productFail = rows.filter((r) => r.failure_class === "PRODUCT_GOLDEN_FAILURE").length;
  return { rows, pass, fail, harnessFail, productFail, total: rows.length };
}

function formatReport(summary) {
  const lines = [];
  lines.push("DIRECTOR IA GOLDEN REGRESSION");
  lines.push("");
  const byCat = new Map();
  for (const row of summary.rows) {
    if (!byCat.has(row.category)) byCat.set(row.category, []);
    byCat.get(row.category).push(row);
  }
  for (const [cat, rows] of byCat) {
    lines.push(cat);
    for (const row of rows) {
      lines.push(`${row.id}  ${row.result}${row.first_bad_boundary ? `  FIRST_BAD_BOUNDARY=${row.first_bad_boundary}` : ""}`);
    }
    lines.push("");
  }
  lines.push(`TOTAL`);
  lines.push(`PASS: ${summary.pass}`);
  lines.push(`FAIL: ${summary.fail}`);
  lines.push(`HARNESS FAILURE: ${summary.harnessFail}`);
  lines.push(`PRODUCT GOLDEN FAILURE: ${summary.productFail}`);
  return lines.join("\n");
}

module.exports = {
  BOUNDARIES,
  CASES,
  NOW,
  evaluateCase,
  runOne,
  runGoldenSet,
  formatReport,
  firstBadBoundary,
};
