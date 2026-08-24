"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { DIRECTOR_IA_VERACITY } = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { buildDirectorIaToolPlan } = require("../lib/director-ia-tool-orchestrator");
const {
  classifyTurnKind,
  resolveConversationTurn,
  INHERITABLE_INTENTS,
} = require("../lib/director-ia-conversation-state");
const {
  BUSINESS_TZ,
  REFERENCE_WINDOW_DAYS,
  DAILY_DISCOUNT_READINESS,
  DAILY_SALES_DEVIATION_SYSTEM_ADDENDUM,
  computeDailySalesDeviationFromRows,
  assembleDailySalesDeviationEvidence,
  loadDailySalesDeviationForChat,
  buildDailySalesDeviationPrompt,
  assertDailySalesAccess,
  yesterdayYmd,
  isoDowFromYmd,
  addDaysYmd,
} = require("../lib/director-ia-daily-deviation");

const ROOT = path.join(__dirname, "..");
const LIB_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-daily-deviation.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");
const PLANNER_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-planner.js"), "utf8");

function row(fecha, cliente, canal, kg, subcanal = "") {
  return { fecha, cliente_norm: cliente, canal, subcanal, kg };
}

/** target 2026-08-19 (miércoles); today 2026-08-20. Ventana 14d: 05–18. Miércoles: 05 y 12. */
function sampleRows() {
  return [
    row("2026-08-19", "ARTURO", "Casa", 100),
    row("2026-08-19", "BETA", "Casa", 50),
    row("2026-08-19", "GAMMA", "Comisionista", 30),
    row("2026-08-12", "ARTURO", "Casa", 200),
    row("2026-08-12", "BETA", "Casa", 50),
    row("2026-08-12", "GAMMA", "Comisionista", 30),
    row("2026-08-05", "ARTURO", "Casa", 200),
    row("2026-08-05", "BETA", "Casa", 40),
    row("2026-08-05", "GAMMA", "Comisionista", 20),
    row("2026-08-18", "ARTURO", "Casa", 999),
  ];
}

function assembledFixture(over = {}) {
  const computed = computeDailySalesDeviationFromRows(sampleRows(), {
    todayYmd: "2026-08-20",
    targetDate: "2026-08-19",
  });
  return assembleDailySalesDeviationEvidence({
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    planta_id: 1,
    computed,
    comments: over.comments || [],
    actions: over.actions || [],
    ...over,
  });
}

describe("daily_sales_deviation planner", () => {
  it("gana sobre financial_diagnosis y delta_sales mensuales", () => {
    assert.equal(planDirectorIaQuestion("¿Por qué bajó la venta ayer?").intent, "daily_sales_deviation");
    assert.equal(planDirectorIaQuestion("¿Qué pasó ayer con la venta?").intent, "daily_sales_deviation");
    assert.equal(planDirectorIaQuestion("¿Por qué vendimos menos ayer?").intent, "daily_sales_deviation");
    assert.equal(planDirectorIaQuestion("¿Cómo estuvo la venta ayer?").intent, "daily_sales_deviation");
    assert.equal(planDirectorIaQuestion("¿Dónde cayó la venta ayer?").intent, "daily_sales_deviation");
    assert.equal(planDirectorIaQuestion("por qué cayó el ingreso").intent, "financial_diagnosis");
    assert.equal(planDirectorIaQuestion("cómo cambió la venta").intent, "delta_sales");
  });

  it("no rutea descuento/kg diario", () => {
    assert.notEqual(planDirectorIaQuestion("¿Por qué subió el descuento ayer?").intent, "daily_sales_deviation");
  });

  it("dominios existentes y sin delta_venta mensual", () => {
    const plan = planDirectorIaQuestion("¿Por qué bajó la venta ayer?");
    assert.deepEqual(plan.domains, ["arr", "dicf", "cliente_comentarios"]);
    const tools = buildDirectorIaToolPlan(plan, { planta_id: 1, question: "¿Por qué bajó la venta ayer?" });
    assert.equal(tools.tools.some((t) => t.tool_id === "get_delta_sales"), false);
  });
});

describe("daily_sales_deviation fechas y referencia", () => {
  it("ayer es calendario CDMX y hoy no entra", () => {
    assert.equal(BUSINESS_TZ, "America/Mexico_City");
    assert.equal(REFERENCE_WINDOW_DAYS, 14);
    assert.equal(yesterdayYmd("2026-08-20"), "2026-08-19");
    const computed = computeDailySalesDeviationFromRows(sampleRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-20",
    });
    assert.equal(computed.detection.target_date, "2026-08-19");
    assert.ok(computed.limitations.some((l) => /hoy_no_es_dia_completo/.test(l)));
  });

  it("día sin filas != 0", () => {
    const computed = computeDailySalesDeviationFromRows(sampleRows(), {
      todayYmd: "2026-08-22",
      targetDate: "2026-08-21",
    });
    assert.equal(computed.detection.target_sales_kg, null);
    assert.equal(computed.detection.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.ok(computed.limitations.some((l) => /target_day_without_rows/.test(l)));
  });

  it("referencia same-weekday 14 días con N observaciones, no día anterior", () => {
    const computed = computeDailySalesDeviationFromRows(sampleRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-19",
    });
    assert.equal(isoDowFromYmd("2026-08-19"), 3);
    assert.equal(computed.detection.reference_observation_count, 2);
    assert.deepEqual(computed.detection.reference_dates, ["2026-08-05", "2026-08-12"]);
    assert.equal(computed.detection.target_sales_kg, 180);
    assert.equal(computed.detection.reference_sales_kg, 270);
    assert.equal(computed.detection.deviation_kg, -90);
    assert.match(computed.detection.reference_label, /no es el día anterior/);
    assert.equal(computed.detection.reference_type, "same_weekday_recent_average");
    const tue = addDaysYmd("2026-08-19", -1);
    assert.equal(tue, "2026-08-18");
    assert.ok(!computed.detection.reference_dates.includes(tue));
  });

  it("referencia ausente no inventa ceros", () => {
    const computed = computeDailySalesDeviationFromRows(
      [row("2026-08-19", "ARTURO", "Casa", 10)],
      { todayYmd: "2026-08-20", targetDate: "2026-08-19" }
    );
    assert.equal(computed.detection.reference_observation_count, 0);
    assert.equal(computed.detection.reference_sales_kg, null);
    assert.equal(computed.detection.deviation_kg, null);
  });
});

describe("daily_sales_deviation matemática", () => {
  it("reconcilia cliente y canal con el delta", () => {
    const computed = computeDailySalesDeviationFromRows(sampleRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-19",
    });
    const arturo = computed.customers.find((c) => c.cliente_norm === "ARTURO");
    assert.equal(arturo.contribution_kg, -100);
    assert.equal(computed.reconcile.customers.ok, true);
    assert.equal(computed.reconcile.channels.ok, true);
    const casa = computed.channels.find((c) => c.canal === "Casa");
    const comi = computed.channels.find((c) => c.canal === "Comisionista");
    assert.ok(casa);
    assert.ok(comi);
    assert.equal(casa.contribution_kg + comi.contribution_kg, computed.detection.deviation_kg);
  });
});

describe("daily_sales_deviation evidencia y huecos", () => {
  it("join por cliente_key; comentario y acción no son causa; gap explícito", () => {
    const computed = computeDailySalesDeviationFromRows(sampleRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-19",
    });
    const assembled = assembleDailySalesDeviationEvidence({
      plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
      computed,
      comments: [],
      actions: [
        {
          cliente_key: "no-match",
          public_code: "D-9",
          descripcion: "otra cosa",
          responsable: "Luis",
        },
      ],
    });
    assert.equal(assembled.provenance.name_join, false);
    assert.equal(assembled.provenance.join, "cliente_key");
    const arturoGap = assembled.information_gaps.find((g) => g.cliente_norm === "ARTURO");
    assert.ok(arturoGap);
    assert.equal(arturoGap.explanation_gap, true);
    assert.equal(arturoGap.has_related_comment, false);
    assert.equal(arturoGap.has_related_action, false);
    const prompt = buildDailySalesDeviationPrompt(assembled, "¿Por qué bajó la venta ayer?");
    assert.match(prompt.systemPrompt, /contribución matemática != causa/);
    assert.match(prompt.systemPrompt, /declaración, no prueba causal/);
    assert.match(prompt.userContent, /comparado contra/);
    assert.doesNotMatch(prompt.systemPrompt, /ARTURO causó/);
  });

  it("responsable solo con vínculo físico a acción", () => {
    const computed = computeDailySalesDeviationFromRows(sampleRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-19",
    });
    const withKeys = assembleDailySalesDeviationEvidence({
      plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
      computed,
      comments: [],
      actions: [],
    });
    const keys = (withKeys.customer_contributors.find((c) => c.cliente_norm === "ARTURO") || {}).cliente_keys || [];
    const assembled = assembleDailySalesDeviationEvidence({
      plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
      computed: { ...computed, customers: withKeys.customer_contributors },
      comments: [],
      actions: keys.length
        ? [
            {
              cliente_key: keys[0],
              public_code: "D-1",
              descripcion: "Seguimiento",
              responsable: "Luis",
              estado: "pendiente",
              created_at: "2026-08-18T15:00:00Z",
            },
          ]
        : [],
    });
    const ev = assembled.business_evidence.find((e) => e.cliente_norm === "ARTURO");
    if (keys.length) {
      assert.equal(ev.has_related_action, true);
      assert.equal(ev.action_not_cause, true);
      const gap = assembled.information_gaps.find((g) => g.cliente_norm === "ARTURO");
      assert.equal(gap.physical_person, "Luis");
    }
  });
});

describe("daily_sales_deviation authz y descuento diferido", () => {
  it("GA y GV fail-closed; no amplía M9", () => {
    assert.equal(assertDailySalesAccess({ role: "GA" }, 1).ok, false);
    assert.equal(assertDailySalesAccess({ role: "GV" }, 1).code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.equal(assertDailySalesAccess({ role: "ZP" }, 1).ok, true);
  });

  it("load aborta para GA", async () => {
    const result = await loadDailySalesDeviationForChat(
      {},
      1,
      { dashboardAuth: { role: "GA" } },
      {}
    );
    assert.equal(result.abort, true);
    assert.equal(result.status, 403);
  });

  it("descuento/kg no implementado", () => {
    assert.equal(DAILY_DISCOUNT_READINESS.implemented, false);
    assert.equal(DAILY_DISCOUNT_READINESS.formula, "SUM(monto) / SUM(kg)");
    assert.equal(DAILY_DISCOUNT_READINESS.average_of_averages, false);
    assert.equal(DAILY_DISCOUNT_READINESS.channel_available, false);
    assert.doesNotMatch(LIB_SRC, /descuentos_diarios_cliente/);
    assert.match(LIB_SRC, /SUM\(monto\) \/ SUM\(kg\)/);
  });
});

describe("daily_sales_deviation conversación", () => {
  it("follow-ups diarios se clasifican para heredar", () => {
    assert.equal(classifyTurnKind("¿Contra qué la comparas?"), "reference_probe");
    assert.equal(classifyTurnKind("¿Qué clientes explican más?"), "contributors");
    assert.equal(classifyTurnKind("¿Y por canal?"), "channel_probe");
    assert.equal(classifyTurnKind("¿Sabemos por qué?"), "why_know");
    assert.equal(classifyTurnKind("¿Qué falta investigar?"), "gap_what");
    assert.equal(classifyTurnKind("¿Quién puede aclararlo?"), "gap_who");
    assert.ok(INHERITABLE_INTENTS.includes("daily_sales_deviation"));
    const turn = resolveConversationTurn({
      question: "¿Qué clientes explican más?",
      plantaId: 1,
      echoedState: {
        parent_intent: "daily_sales_deviation",
        planta_id: 1,
        active_date: "2026-08-19",
      },
      detectIntent: planDirectorIaQuestion,
    });
    assert.equal(turn.inherit, true);
    assert.equal(turn.inherit_parent_intent, "daily_sales_deviation");
    assert.equal(turn.active_date, "2026-08-19");
  });
});

describe("daily_sales_deviation chat wiring", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({
      pool: null,
      openaiChat: undefined,
      loadDailySalesDeviationForChat: undefined,
      loadFinancialDiagnosisForChat: undefined,
      loadPlantDiagnosisForChat: undefined,
    });
  });

  it("una sola llamada OpenAI, pack diario, hilo completo y sin causalidad rígida", async () => {
    let openaiCalls = 0;
    let lastPrompt = null;
    const assembled = assembledFixture();
    configureDirectorIaChat({
      pool: {},
      openaiChat: async (sys, user) => {
        openaiCalls += 1;
        lastPrompt = { sys, user };
        return "Ayer la venta quedó por debajo de la referencia same-weekday. Contribución matemática, no causa.";
      },
      loadDailySalesDeviationForChat: async () => assembled,
      loadFinancialDiagnosisForChat: async () => {
        throw new Error("financial_diagnosis no debe correr");
      },
    });
    const first = await askDirectorIa(
      { body: { history: [] }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Por qué bajó la venta ayer?"
    );
    assert.equal(first.ok, true);
    assert.equal(first.context_meta.mode, "daily_sales_deviation");
    assert.equal(first.context_meta.openai_call_count, 1);
    assert.equal(first.context_meta.m9_included, false);
    assert.equal(first.context_meta.discount_kg_implemented, false);
    assert.equal(first.context_meta.conversation_state.parent_intent, "daily_sales_deviation");
    assert.equal(first.context_meta.conversation_state.active_date, "2026-08-19");
    assert.match(lastPrompt.sys, /contribución matemática != causa/);
    assert.match(lastPrompt.user, /HILO/);
    assert.match(lastPrompt.user, /comparado contra/);
    assert.equal(openaiCalls, 1);

    const followUps = [
      "¿Contra qué la comparas?",
      "¿Qué clientes explican más?",
      "¿Y por canal?",
      "¿Sabemos por qué?",
      "¿Qué falta investigar?",
      "¿Quién puede aclararlo?",
    ];
    let prev = first;
    for (const q of followUps) {
      const result = await askDirectorIa(
        {
          body: {
            history: [
              { role: "user", content: "¿Por qué bajó la venta ayer?" },
              { role: "assistant", content: prev.answer },
              { role: "user", content: q },
            ],
            conversation_state: prev.context_meta.conversation_state,
          },
          dashboardAuth: { role: "ZP" },
        },
        1,
        q
      );
      assert.equal(result.context_meta.mode, "daily_sales_deviation", q);
      assert.equal(result.context_meta.conversation_state.active_date, "2026-08-19", q);
      assert.equal(result.context_meta.openai_called, true, q);
      prev = result;
    }
    assert.equal(openaiCalls, 1 + followUps.length);
  });
});

describe("daily_sales_deviation no toca contratos ni descuento SQL", () => {
  it("chat llama al loader diario y el planner detecta ayer antes de financial", () => {
    assert.match(CHAT_SRC, /intent === "daily_sales_deviation"/);
    assert.match(PLANNER_SRC, /isDailySalesDeviationQuestion/);
    const dailyIdx = PLANNER_SRC.indexOf("isDailySalesDeviationQuestion");
    const finIdx = PLANNER_SRC.indexOf("caida_ingreso_financiera");
    assert.ok(dailyIdx > 0 && dailyIdx < finIdx);
  });
});
