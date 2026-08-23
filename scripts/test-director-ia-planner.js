"use strict";

/**
 * Director IA v2 Fase 2 — Planner determinístico.
 * node scripts/test-director-ia-planner.js
 *
 * No llama OpenAI ni DB.
 */

const {
  planDirectorIaQuestion,
  detectDirectorIaIntent,
  validateDirectorIaPlan,
  buildDirectorIaPlanSummary,
  INTENT_DOMAIN_MAP,
} = require("../lib/director-ia-planner");
const { getDirectorIaCapability } = require("../lib/director-ia-capabilities");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertPlanShape(plan, question) {
  const v = validateDirectorIaPlan(plan);
  assert(v.ok, `"${question}" plan inválido: ${v.errors.join(", ")}`);
  assert(plan.version === "1.0", "version");
  assert(plan.confidence >= 0 && plan.confidence <= 1, "confidence range");
  assert(new Set(plan.domains).size === plan.domains.length, "no duplicate domains");
  for (const d of plan.domains) {
    assert(getDirectorIaCapability(d), `domain exists: ${d}`);
  }
  for (const d of plan.available_domains) {
    const cap = getDirectorIaCapability(d);
    assert(cap && cap.canRead === true, `available canRead: ${d}`);
  }
  for (const d of plan.unavailable_domains) {
    const cap = getDirectorIaCapability(d);
    assert(
      cap && (cap.coverage === "none" || cap.accessMode === "not_integrated"),
      `unavailable coherence: ${d}`
    );
  }
  for (const d of plan.partial_domains) {
    const cap = getDirectorIaCapability(d);
    assert(cap && cap.coverage === "partial", `partial coherence: ${d}`);
  }
  assert(Array.isArray(plan.evidence) && plan.evidence.every((e) => e.type === "rule"), "evidence");
  assert(typeof buildDirectorIaPlanSummary(plan) === "string", "summary");
}

/**
 * @param {string} question
 * @param {string | string[]} intentOrList
 * @param {{ requireDomain?: string, clarification?: boolean }} [opts]
 */
function expectIntent(question, intentOrList, opts = {}) {
  const allowed = Array.isArray(intentOrList) ? intentOrList : [intentOrList];
  const plan = planDirectorIaQuestion(question);
  assertPlanShape(plan, question);
  assert(
    allowed.includes(plan.intent),
    `"${question}" → intent ${allowed.join("|")}, got ${plan.intent}`
  );
  if (opts.requireDomain) {
    assert(
      plan.domains.includes(opts.requireDomain),
      `"${question}" debe incluir dominio ${opts.requireDomain}, got [${plan.domains.join(",")}]`
    );
  }
  if (opts.clarification === true) {
    assert(plan.requires_clarification === true, `"${question}" debe pedir clarificación`);
  }
  return plan;
}

let failed = 0;
const cases = [
  () => expectIntent("¿Qué acciones están vencidas?", "overdue_actions", { requireDomain: "action_register" }),
  () =>
    expectIntent("¿Quién es responsable de mantenimiento?", ["responsible_lookup", "action_status"], {
      requireDomain: "action_register",
    }),
  () => expectIntent("¿Cómo va Puebla?", "plant_diagnosis"),
  () => expectIntent("¿Por qué cayó el ingreso?", "financial_diagnosis"),
  () => expectIntent("¿Cómo va ARR?", "arr_status", { requireDomain: "arr" }),
  () => expectIntent("¿Cómo va IGF?", "igf_status", { requireDomain: "igf" }),
  () => expectIntent("¿Qué clientes dejaron de comprar?", "commercial_state"),
  () =>
    expectIntent("¿Qué dice la bitácora del cliente X?", ["client_analysis", "bitacora_lookup"], {
      requireDomain: "bitacora",
    }),
  () => expectIntent("¿En qué etapa está el folio 123?", "folio_status"),
  () => expectIntent("listar folios de la planta", "folio_status"),
  () => expectIntent("folios en evidencias", "folio_status"),
  () => expectIntent("¿Cuál fue el último movimiento del folio 123?", "folio_history"),
  () => expectIntent("¿Quién movió el folio 123?", "folio_history"),
  () => expectIntent("listar documentos del folio 123", "folio_documents"),
  () => expectIntent("qué documentos tiene el folio 123", "folio_documents"),
  () => expectIntent("registros documentales del folio 123", "folio_documents"),
  () => expectIntent("¿Qué documentos faltan del folio?", "folio_documents"),
  () => expectIntent("¿Tiene cheque o póliza?", "folio_financial_status"),
  () => expectIntent("¿Cómo va el presupuesto semanal?", "budget_status"),
  () => expectIntent("¿Qué proyectos están retrasados?", "project_status", { requireDomain: "proyectos" }),
  () => expectIntent("¿Cuáles son los kpis del dashboard?", "dashboard_kpis", { requireDomain: "dashboard_kpis" }),
  () => expectIntent("¿Cuántos folios activos hay?", "dashboard_kpis", { requireDomain: "dashboard_kpis" }),
  () => expectIntent("¿Qué gastos de folios existen?", "expense_analysis"),
  () => expectIntent("¿Qué inversiones están pendientes?", "investment_analysis"),
  () => expectIntent("¿Cómo cambió la venta?", "delta_sales", { requireDomain: "delta_venta" }),
  () => expectIntent("¿Cómo cambió el descuento?", "delta_discount", { requireDomain: "delta_descuento" }),
  () => expectIntent("¿Cómo cambió el ingreso?", "delta_income", { requireDomain: "delta_ingreso" }),
  () => expectIntent("¿Hay folios duplicados?", "duplicate_folios"),
  () => expectIntent("¿Qué permisos tiene el usuario?", "user_permissions"),
  () => expectIntent("Hola", "smalltalk"),
  () => expectIntent("Ayuda", "help"),
  () => {
    const plan = planDirectorIaQuestion("estado");
    assertPlanShape(plan, "estado");
    assert(
      plan.intent === "unknown" || plan.requires_clarification === true,
      `"estado" → unknown o clarification, got ${plan.intent} clar=${plan.requires_clarification}`
    );
  },
  () => {
    // Comentarios de folio no deben ser folio_status
    const plan = expectIntent("¿Qué comentarios hay del folio?", "client_analysis", {
      requireDomain: "folio_comentarios",
    });
    assert(!plan.domains.includes("kanban"), "comentarios folio no incluye kanban");
  },
  () => {
    // Cómo va Taller → AR, no taller_at
    const plan = expectIntent("¿Cómo va Taller?", "action_status", { requireDomain: "action_register" });
    assert(!plan.domains.includes("taller_at"), "taller tema AR no usa taller_at");
  },
  () => {
    const plan = planDirectorIaQuestion("¿Cómo van los proyectos de mantenimiento?");
    assertPlanShape(plan, "proyectos mantenimiento");
    assert(plan.requires_clarification === true, "proyectos+mantenimiento requiere clarificación");
    assert(plan.intent === "project_status", `got ${plan.intent}`);
  },
  () => {
    // Todos los intents del mapa tienen labels y domains arrays
    for (const intent of Object.keys(INTENT_DOMAIN_MAP)) {
      const d = detectDirectorIaIntent(
        intent === "smalltalk" ? "hola" : intent === "help" ? "ayuda" : "___no_match___"
      );
      assert(typeof d.intent === "string", "detect returns intent");
      for (const domain of INTENT_DOMAIN_MAP[intent]) {
        assert(getDirectorIaCapability(domain), `map domain ${domain} for ${intent}`);
      }
    }
  },
];

for (let i = 0; i < cases.length; i++) {
  try {
    cases[i]();
    console.log(`OK  ${i + 1}/${cases.length}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${i + 1}/${cases.length}: ${e.message}`);
  }
}

if (failed > 0) {
  console.error(`\nFallaron ${failed} caso(s).`);
  process.exit(1);
}
console.log(`\nTodos los ${cases.length} casos pasaron.`);
process.exit(0);
