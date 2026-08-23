"use strict";

/**
 * Director IA v2 Fase 3 — Tool Registry + Orchestrator.
 * node scripts/test-director-ia-tool-orchestrator.js
 *
 * No llama OpenAI ni DB.
 */

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  getDirectorIaTool,
  listDirectorIaTools,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
  validateKnownRequiredInputs,
  KNOWN_INPUT_KEYS,
  TOOL_STATUS,
} = require("../lib/director-ia-tools");
const {
  buildDirectorIaToolPlan,
  validateDirectorIaToolPlan,
  buildDirectorIaToolPlanSummary,
  KNOWN_INPUT_KEYS: ORCH_KNOWN_INPUT_KEYS,
} = require("../lib/director-ia-tool-orchestrator");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function toolIds(toolPlan) {
  return toolPlan.tools.map((t) => t.tool_id);
}

function hasTool(toolPlan, id) {
  return toolIds(toolPlan).includes(id);
}

function getTool(toolPlan, id) {
  return toolPlan.tools.find((t) => t.tool_id === id);
}

function planTools(question, options = {}) {
  const plan = planDirectorIaQuestion(question);
  const toolPlan = buildDirectorIaToolPlan(plan, options);
  const v = validateDirectorIaToolPlan(toolPlan);
  assert(v.ok, `"${question}" toolPlan inválido: ${v.errors.join(", ")}`);
  assert(new Set(toolIds(toolPlan)).size === toolIds(toolPlan).length, "no duplicate tools");
  for (const t of toolPlan.tools) {
    assert(getDirectorIaTool(t.tool_id), `tool exists ${t.tool_id}`);
  }
  assert(typeof buildDirectorIaToolPlanSummary(toolPlan) === "string", "summary");
  return { plan, toolPlan };
}

let failed = 0;
const cases = [
  () => {
    const reg = validateDirectorIaToolRegistry();
    assert(reg.ok, `registry invalid: ${reg.errors.join(", ")}`);
    assert(listDirectorIaTools().length >= 20, "tools count");
  },

  // 1. Acciones vencidas
  () => {
    const { toolPlan } = planTools("¿Qué acciones están vencidas?", { planta_id: 1, question: "¿Qué acciones están vencidas?" });
    assert(hasTool(toolPlan, "get_action_register_context"), "AR tool");
    const t = getTool(toolPlan, "get_action_register_context");
    assert(t.executable === true, "AR executable");
    assert(t.required_inputs.includes("planta_id"), "planta_id required");
    assert(toolPlan.can_execute === true, "can_execute");
    const missing = planTools("¿Qué acciones están vencidas?", { question: "x" });
    assert(
      getTool(missing.toolPlan, "get_action_register_context").missing_inputs.includes("planta_id"),
      "missing planta_id"
    );
  },

  // 2. Diagnóstico planta
  () => {
    const { toolPlan } = planTools("¿Cómo va Puebla?", {
      planta_id: 1,
      question: "¿Cómo va Puebla?",
    });
    const expected = [
      "get_action_register_context",
      "get_dicf_context",
      "get_bitacora_context",
      "get_arr_snapshot",
      "get_igf_snapshot",
      "get_commercial_state",
    ];
    for (const id of expected) {
      assert(hasTool(toolPlan, id), `plant diagnosis has ${id}`);
    }
    assert(toolIds(toolPlan).length === new Set(toolIds(toolPlan)).size, "no dups");
    assert(toolPlan.can_execute === true, "plant can_execute");
    assert(toolPlan.can_execute_all === true, "plant can_execute_all with full inputs");
  },

  // 3. ARR
  () => {
    const { toolPlan } = planTools("¿Cómo va ARR?", { planta_id: 1, question: "¿Cómo va ARR?" });
    const t = getTool(toolPlan, "get_arr_snapshot");
    assert(t, "arr tool");
    assert(t.status === TOOL_STATUS.available_on_demand, "arr on_demand");
    assert(t.executable === true, "arr executable");
  },

  // 4. IGF
  () => {
    const { toolPlan } = planTools("¿Cómo va IGF?", { planta_id: 1, question: "¿Cómo va IGF?" });
    const t = getTool(toolPlan, "get_igf_snapshot");
    assert(t, "igf tool");
    assert(t.status === TOOL_STATUS.available_on_demand, "igf on_demand");
  },

  // 5. Clientes dejaron de comprar
  () => {
    const { toolPlan } = planTools("¿Qué clientes dejaron de comprar?", {
      planta_id: 1,
      question: "¿Qué clientes dejaron de comprar?",
    });
    assert(hasTool(toolPlan, "get_commercial_state"), "commercial_state");
    assert(hasTool(toolPlan, "get_dicf_context"), "dicf");
    assert(hasTool(toolPlan, "resolve_entidades_comerciales"), "entidades");
  },

  // 6. Comentarios folio
  () => {
    const { toolPlan } = planTools("¿Qué comentarios hay del folio?", { planta_id: 1 });
    assert(hasTool(toolPlan, "get_folio_comentarios"), "folio comentarios");
    assert(!hasTool(toolPlan, "get_folio_status"), "no folio status");
  },

  // 7. Etapa folio
  () => {
    const { toolPlan } = planTools("¿En qué etapa está el folio 123?", { planta_id: 1 });
    const t = getTool(toolPlan, "get_folio_status");
    assert(t, "folio status");
    assert(t.status === TOOL_STATUS.declared_not_integrated, "not integrated");
    assert(t.missing_inputs.includes("folio_id"), "missing folio_id");
    assert(toolPlan.can_execute === false, "cannot execute");
  },

  // 8. Historial
  () => {
    const { toolPlan } = planTools("¿Cuál fue el último movimiento del folio 123?", { planta_id: 1 });
    const t = getTool(toolPlan, "get_folio_history");
    assert(t && t.status === TOOL_STATUS.declared_not_integrated, "history not integrated");
  },

  // 9. Documentos
  () => {
    const { toolPlan } = planTools("¿Qué documentos faltan del folio?", { planta_id: 1 });
    const t = getTool(toolPlan, "get_folio_documents");
    assert(t && t.status === TOOL_STATUS.declared_not_integrated, "docs not integrated");
  },

  // 10. Cheque/póliza
  () => {
    const { toolPlan } = planTools("¿Tiene cheque o póliza?", { planta_id: 1 });
    const t = getTool(toolPlan, "get_folio_financial_status");
    assert(t && t.status === TOOL_STATUS.declared_not_integrated, "financial folio not integrated");
  },

  // 11. Presupuesto
  () => {
    const { toolPlan } = planTools("¿Cómo va el presupuesto semanal?", { planta_id: 1 });
    const t = getTool(toolPlan, "get_budget_status");
    assert(t && t.status === TOOL_STATUS.declared_not_integrated, "budget not integrated");
  },

  // 12. Duplicados
  () => {
    const { toolPlan } = planTools("¿Hay folios duplicados?", { planta_id: 1 });
    const t = getTool(toolPlan, "get_duplicate_folios");
    assert(t && t.status === TOOL_STATUS.available_on_demand, "duplicados on demand");
    assert(t.executable === true, "duplicados executable");
    assert(isDirectorIaToolExecutable("get_duplicate_folios") === true, "get_duplicate_folios exec");
  },

  () => {
    const { toolPlan } = planTools("¿Qué proyectos están retrasados?", { planta_id: 1 });
    const t = getTool(toolPlan, "get_project_status");
    assert(t && t.status === TOOL_STATUS.available_on_demand, "proyectos on demand");
    assert(t.executable === true, "proyectos executable");
    assert(isDirectorIaToolExecutable("get_project_status") === true, "get_project_status exec");
  },

  () => {
    const { toolPlan } = planTools("¿Cuáles son los kpis del dashboard?", { planta_id: 1 });
    const t = getTool(toolPlan, "get_dashboard_kpis");
    assert(t && t.status === TOOL_STATUS.available_on_demand, "kpis on demand");
    assert(t.executable === true, "kpis executable");
    assert(isDirectorIaToolExecutable("get_dashboard_kpis") === true, "get_dashboard_kpis exec");
  },

  () => {
    const { toolPlan } = planTools("¿Cómo cambió la venta?", { planta_id: 1, question: "¿Cómo cambió la venta?" });
    const t = getTool(toolPlan, "get_delta_sales");
    assert(t && t.status === TOOL_STATUS.available_on_demand, "delta venta on demand");
    assert(t.executable === true, "delta venta executable");
    assert(isDirectorIaToolExecutable("get_delta_sales") === true, "get_delta_sales exec");
  },

  () => {
    const { toolPlan } = planTools("¿Cómo cambió el descuento?", { planta_id: 1, question: "¿Cómo cambió el descuento?" });
    const t = getTool(toolPlan, "get_delta_discount");
    assert(t && t.status === TOOL_STATUS.available_on_demand, "delta descuento on demand");
    assert(t.executable === true, "delta descuento executable");
  },

  () => {
    const { toolPlan } = planTools("¿Cómo cambió el ingreso?", { planta_id: 1, question: "¿Cómo cambió el ingreso?" });
    const t = getTool(toolPlan, "get_delta_income");
    assert(t && t.status === TOOL_STATUS.available_on_demand, "delta ingreso on demand");
    assert(t.executable === true, "delta ingreso executable");
  },

  // 13. Usuario permisos
  () => {
    const { toolPlan } = planTools("¿Qué permisos tiene el usuario?", {});
    const t = getTool(toolPlan, "get_user_permissions");
    assert(t, "user permissions tool");
    assert(
      t.status === TOOL_STATUS.declared_not_integrated || t.status === TOOL_STATUS.restricted,
      `status ${t.status}`
    );
    assert(
      t.missing_inputs.includes("user") || t.missing_inputs.includes("permissions"),
      "missing user/permissions"
    );
  },

  // 14. Ambiguo
  () => {
    const { plan, toolPlan } = planTools("¿Cómo van los proyectos de mantenimiento?", {
      planta_id: 1,
      question: "¿Cómo van los proyectos de mantenimiento?",
    });
    assert(plan.requires_clarification === true, "plan clarification");
    assert(toolPlan.requires_clarification === true, "toolPlan clarification");
    assert(toolPlan.can_execute === false, "can_execute false on clarification");
  },

  // 15. Unknown
  () => {
    const { plan, toolPlan } = planTools("asdf qwerty zxcvbnm 999", {});
    assert(plan.intent === "unknown", `intent unknown got ${plan.intent}`);
    assert(toolPlan.tools.length === 0, "no tools");
    assert(toolPlan.can_execute === false, "cannot execute");
  },

  // Executable helpers
  () => {
    assert(isDirectorIaToolExecutable("get_action_register_context") === true, "AR exec");
    assert(isDirectorIaToolExecutable("get_folio_status") === false, "folio not exec");
    assert(isDirectorIaToolExecutable("get_arr_snapshot") === true, "arr exec");
  },

  // Ejecución parcial: tool lista + otra con input faltante
  () => {
    const { toolPlan } = planTools("¿Cómo va Puebla?", { planta_id: 1 });
    assert(toolPlan.can_execute === true, "partial can_execute true");
    assert(toolPlan.can_execute_all === false, "partial can_execute_all false");
    assert(toolPlan.executable_tools.includes("get_action_register_context"), "AR ready");
    assert(toolPlan.missing_inputs.includes("question"), "question missing for on-demand");
    const arr = getTool(toolPlan, "get_arr_snapshot");
    assert(arr && arr.executable === false, "ARR not executable without question");
    assert(arr.missing_inputs.includes("question"), "ARR missing question");
  },

  // requiredInput desconocido falla validación
  () => {
    assert(
      JSON.stringify(KNOWN_INPUT_KEYS) === JSON.stringify(ORCH_KNOWN_INPUT_KEYS),
      "KNOWN_INPUT_KEYS compartida registry/orchestrator"
    );
    const unknownErrs = validateKnownRequiredInputs("get_action_register_context", [
      "planta_id",
      "not_a_real_input",
    ]);
    assert(
      unknownErrs.includes("required_input_unknown:get_action_register_context:not_a_real_input"),
      `expected unknown input error, got ${unknownErrs.join(",")}`
    );

    const badPlan = {
      version: "1.0",
      planner_version: "1.0",
      intent: "action_status",
      requested_domains: ["action_register"],
      tools: [
        {
          tool_id: "get_action_register_context",
          domain: "action_register",
          status: TOOL_STATUS.available,
          executable: true,
          required_inputs: ["planta_id", "foo_unknown"],
          missing_inputs: ["bar_unknown"],
          reason: "available",
        },
      ],
      executable_tools: ["get_action_register_context"],
      unavailable_tools: [],
      restricted_tools: [],
      missing_inputs: ["bar_unknown"],
      can_execute: true,
      can_execute_all: false,
      requires_clarification: false,
      clarification_reason: null,
    };
    const v = validateDirectorIaToolPlan(badPlan);
    assert(v.ok === false, "bad plan must fail validation");
    assert(
      v.errors.some((e) => e.includes("required_input_unknown:get_action_register_context:foo_unknown")),
      `errors should include foo_unknown, got ${v.errors.join(",")}`
    );
    assert(
      v.errors.some((e) => e.includes("required_input_unknown:get_action_register_context:bar_unknown")),
      `errors should include bar_unknown, got ${v.errors.join(",")}`
    );
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
