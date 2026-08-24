"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { DIRECTOR_IA_VERACITY, detectUnsupportedDirectorIaDomain } = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { buildDirectorIaToolPlan } = require("../lib/director-ia-tool-orchestrator");
const {
  classifyTurnKind,
  resolveConversationTurn,
  INHERITABLE_INTENTS,
} = require("../lib/director-ia-conversation-state");
const { assertDailySalesAccess } = require("../lib/director-ia-daily-deviation");
const {
  BUSINESS_TZ,
  REFERENCE_WINDOW_DAYS,
  REFERENCE_TYPE,
  RECONCILE_TOLERANCE,
  DAILY_DISCOUNT_DEVIATION_SYSTEM_ADDENDUM,
  computeDailyDiscountDeviationFromRows,
  assembleDailyDiscountDeviationEvidence,
  loadDailyDiscountDeviationForChat,
  buildDailyDiscountDeviationPrompt,
} = require("../lib/director-ia-daily-discount");

const ROOT = path.join(__dirname, "..");
const LIB_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-daily-discount.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");
const PLANNER_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-planner.js"), "utf8");
const M9_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-m9-deltas.js"), "utf8");

function dRow(fecha, cliente, monto) {
  return { fecha, cliente_norm: cliente, monto };
}

function kRow(fecha, cliente, kg, canal = "Casa", subcanal = "") {
  return { fecha, cliente_norm: cliente, kg, canal, subcanal };
}

/**
 * target 2026-08-19 (miércoles); today 2026-08-20.
 * Ventana 14d: 05–18. Miércoles: 05 y 12.
 * SMALL: ratio alto, poco kg. BIG: mueve el ponderado.
 */
function sampleDiscountRows() {
  return [
    dRow("2026-08-19", "SMALL", -10),
    dRow("2026-08-19", "BIG", -200),
    dRow("2026-08-12", "SMALL", -4),
    dRow("2026-08-12", "BIG", -36),
    dRow("2026-08-05", "SMALL", -4),
    dRow("2026-08-05", "BIG", -14),
    dRow("2026-08-18", "SMALL", -999),
  ];
}

function sampleKgRows() {
  return [
    kRow("2026-08-19", "SMALL", 2),
    kRow("2026-08-19", "BIG", 998),
    kRow("2026-08-12", "SMALL", 1),
    kRow("2026-08-12", "BIG", 100),
    kRow("2026-08-05", "SMALL", 1),
    kRow("2026-08-05", "BIG", 700),
    kRow("2026-08-18", "SMALL", 50),
  ];
}

function assembledFixture(over = {}) {
  const computed = computeDailyDiscountDeviationFromRows(sampleDiscountRows(), sampleKgRows(), {
    todayYmd: "2026-08-20",
    targetDate: "2026-08-19",
  });
  return assembleDailyDiscountDeviationEvidence({
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    planta_id: 1,
    computed,
    comments: over.comments || [],
    actions: over.actions || [],
    ...over,
  });
}

describe("daily_discount_deviation planner", () => {
  it("gana sobre delta_discount y financial_diagnosis mensuales", () => {
    assert.equal(planDirectorIaQuestion("¿Por qué subió el descuento/kg ayer?").intent, "daily_discount_deviation");
    assert.equal(planDirectorIaQuestion("¿Cómo estuvo el descuento por kg ayer?").intent, "daily_discount_deviation");
    assert.equal(planDirectorIaQuestion("¿Qué pasó ayer con el descuento?").intent, "daily_discount_deviation");
    assert.equal(planDirectorIaQuestion("¿Quién movió más el descuento/kg ayer?").intent, "daily_discount_deviation");
    assert.equal(planDirectorIaQuestion("cómo cambió el descuento").intent, "delta_discount");
    assert.equal(planDirectorIaQuestion("por qué cayó el ingreso").intent, "financial_diagnosis");
  });

  it("no fusiona venta+descuento; preserva daily sales y M9 mensual", () => {
    assert.equal(planDirectorIaQuestion("¿Por qué bajó la venta ayer?").intent, "daily_sales_deviation");
    assert.equal(planDirectorIaQuestion("¿Por qué bajó la venta y subió el descuento ayer?").intent, "daily_sales_deviation");
    assert.equal(planDirectorIaQuestion("cómo cambió la venta").intent, "delta_sales");
  });

  it("dominios existentes y sin delta_descuento mensual", () => {
    const plan = planDirectorIaQuestion("¿Por qué subió el descuento/kg ayer?");
    assert.deepEqual(plan.domains, ["arr", "dicf", "cliente_comentarios"]);
    const tools = buildDirectorIaToolPlan(plan, { planta_id: 1, question: "¿Por qué subió el descuento/kg ayer?" });
    assert.equal(tools.tools.some((t) => t.tool_id === "get_delta_discount"), false);
    assert.equal(detectUnsupportedDirectorIaDomain("¿Por qué subió el descuento/kg ayer?"), null);
  });
});

describe("daily_discount_deviation fechas y referencia", () => {
  it("ayer es calendario CDMX y hoy no entra", () => {
    assert.equal(BUSINESS_TZ, "America/Mexico_City");
    assert.equal(REFERENCE_WINDOW_DAYS, 14);
    assert.equal(REFERENCE_TYPE, "same_weekday_14d_pooled");
    const computed = computeDailyDiscountDeviationFromRows(sampleDiscountRows(), sampleKgRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-20",
    });
    assert.equal(computed.detection.target_date, "2026-08-19");
    assert.ok(computed.limitations.some((l) => /hoy_no_es_dia_completo/.test(l)));
  });

  it("día sin filas != 0", () => {
    const computed = computeDailyDiscountDeviationFromRows([], [], {
      todayYmd: "2026-08-22",
      targetDate: "2026-08-21",
    });
    assert.equal(computed.detection.target_ratio, null);
    assert.equal(computed.detection.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.ok(computed.limitations.some((l) => /target_day_without_rows/.test(l)));
  });

  it("referencia same-weekday 14 días pooled, no día anterior", () => {
    const computed = computeDailyDiscountDeviationFromRows(sampleDiscountRows(), sampleKgRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-19",
    });
    assert.equal(computed.detection.reference_observation_count, 2);
    assert.deepEqual(computed.detection.reference_dates, ["2026-08-05", "2026-08-12"]);
    assert.ok(!computed.detection.reference_dates.includes("2026-08-18"));
    assert.match(computed.detection.reference_label, /no es el día anterior/);
    assert.equal(computed.detection.reference_type, "same_weekday_14d_pooled");
  });

  it("referencia ausente no inventa ceros", () => {
    const computed = computeDailyDiscountDeviationFromRows(
      [dRow("2026-08-19", "SMALL", -10)],
      [kRow("2026-08-19", "SMALL", 2)],
      { todayYmd: "2026-08-20", targetDate: "2026-08-19" }
    );
    assert.equal(computed.detection.reference_observation_count, 0);
    assert.equal(computed.detection.reference_ratio, null);
    assert.equal(computed.detection.delta_ratio, null);
  });
});

describe("daily_discount_deviation matemática", () => {
  it("usa SUM(monto)/SUM(kg) y no average-of-averages", () => {
    const computed = computeDailyDiscountDeviationFromRows(sampleDiscountRows(), sampleKgRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-19",
    });
    assert.equal(computed.detection.target_monto, -210);
    assert.equal(computed.detection.target_kg, 1000);
    assert.equal(computed.detection.target_ratio, -0.21);
    assert.equal(computed.detection.reference_monto, -58);
    assert.equal(computed.detection.reference_kg, 802);
    const pooled = -58 / 802;
    assert.ok(Math.abs(computed.detection.reference_ratio - pooled) < 1e-10);
    const avgDaily = computed.detection.reference_avg_of_daily_ratios;
    assert.ok(avgDaily != null);
    assert.notEqual(computed.detection.reference_ratio, avgDaily);
    assert.equal(computed.detection.average_of_averages, false);
    assert.equal(computed.detection.plant_formula, "SUM(monto)/SUM(kg)");
  });

  it("kg=0 deja el ratio indefinido, no 0", () => {
    const computed = computeDailyDiscountDeviationFromRows(
      [dRow("2026-08-19", "SMALL", -10)],
      [],
      { todayYmd: "2026-08-20", targetDate: "2026-08-19" }
    );
    assert.equal(computed.detection.target_ratio, null);
    assert.notEqual(computed.detection.target_ratio, 0);
    assert.ok(computed.limitations.some((l) => /kg_target=0/.test(l)));
  });

  it("día con kg y sin descuento es 0 real, distinto de null", () => {
    const computed = computeDailyDiscountDeviationFromRows(
      [],
      [kRow("2026-08-19", "BIG", 100)],
      { todayYmd: "2026-08-20", targetDate: "2026-08-19" }
    );
    assert.equal(computed.detection.target_kg, 100);
    assert.equal(computed.detection.target_monto, 0);
    assert.equal(computed.detection.target_ratio, 0);
    assert.notEqual(computed.detection.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
  });

  it("reconcilia SUM(contrib_i) con R_target - R_ref", () => {
    const computed = computeDailyDiscountDeviationFromRows(sampleDiscountRows(), sampleKgRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-19",
    });
    const delta = computed.detection.target_ratio - computed.detection.reference_ratio;
    assert.ok(Math.abs(computed.detection.delta_ratio - delta) < 1e-10);
    assert.equal(computed.reconcile.customers.ok, true);
    assert.ok(computed.reconcile.customers.abs_diff <= RECONCILE_TOLERANCE);
    const sum = computed.customers.reduce((a, c) => a + c.contribution_to_plant_delta, 0);
    assert.ok(Math.abs(sum - computed.detection.delta_ratio) <= RECONCILE_TOLERANCE);
  });

  it("cliente con ratio más alto != mayor mover", () => {
    const computed = computeDailyDiscountDeviationFromRows(sampleDiscountRows(), sampleKgRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-19",
    });
    const small = computed.customers.find((c) => c.cliente_norm === "SMALL");
    const big = computed.customers.find((c) => c.cliente_norm === "BIG");
    assert.ok(Math.abs(small.ratio_target) > Math.abs(big.ratio_target));
    assert.ok(Math.abs(big.contribution_to_plant_delta) > Math.abs(small.contribution_to_plant_delta));
    assert.equal(computed.customers[0].cliente_norm, "BIG");
  });
});

describe("daily_discount_deviation evidencia y huecos", () => {
  it("une comments/DICF solo por cliente_key canónico, no por nombre", () => {
    const computed = computeDailyDiscountDeviationFromRows(sampleDiscountRows(), sampleKgRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-19",
    });
    const withKeys = assembleDailyDiscountDeviationEvidence({
      plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
      computed,
      comments: [
        { cliente_key: "NO-MATCH-KEY", cliente_nombre: "BIG", body: "competencia bajó precio" },
      ],
      actions: [],
    });
    const bigEv = withKeys.business_evidence.find((e) => e.cliente_norm === "BIG");
    assert.ok(bigEv);
    assert.equal(bigEv.has_related_comment, false);
    assert.equal(bigEv.comment_not_cause, true);
    const gap = withKeys.information_gaps.find((g) => g.cliente_norm === "BIG");
    assert.equal(gap.explanation_gap, true);
    assert.equal(withKeys.provenance.name_join, false);
    assert.equal(withKeys.provenance.join, "cliente_key");
    assert.equal(withKeys.provenance.channel_contribution, false);
    assert.ok(!("channel_contributors" in withKeys));
  });

  it("comentario y acción ligados por key no son causa", () => {
    const computed = computeDailyDiscountDeviationFromRows(sampleDiscountRows(), sampleKgRows(), {
      todayYmd: "2026-08-20",
      targetDate: "2026-08-19",
    });
    const assembledKeys = assembleDailyDiscountDeviationEvidence({
      plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
      computed,
      comments: [],
      actions: [],
    });
    const big = assembledKeys.customer_contributors.find((c) => c.cliente_norm === "BIG");
    assert.ok(big.cliente_key);
    const withEv = assembleDailyDiscountDeviationEvidence({
      plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
      computed: { ...computed, customers: assembledKeys.customer_contributors },
      comments: [{ cliente_key: big.cliente_key, body: "pidió más descuento", created_at: "2026-08-19T12:00:00Z" }],
      actions: [
        {
          cliente_key: big.cliente_key,
          public_code: "DICF-1",
          descripcion: "revisar precio",
          responsable: "Ana",
          created_at: "2026-08-18T12:00:00Z",
        },
      ],
    });
    const ev = withEv.business_evidence.find((e) => e.cliente_norm === "BIG");
    assert.equal(ev.has_related_comment, true);
    assert.equal(ev.has_related_action, true);
    assert.equal(ev.comment_not_cause, true);
    assert.equal(ev.action_not_cause, true);
    assert.equal(ev.responsible_not_cause, true);
    const gap = withEv.information_gaps.find((g) => g.cliente_norm === "BIG");
    assert.equal(gap.explanation_gap, false);
    assert.equal(gap.linked_responsible, "Ana");
  });

  it("pack tiene las secciones requeridas y no canal", () => {
    const assembled = assembledFixture();
    assert.ok(assembled.summary);
    assert.ok(assembled.reference);
    assert.ok(Array.isArray(assembled.customer_contributors));
    assert.ok(Array.isArray(assembled.business_evidence));
    assert.ok(Array.isArray(assembled.information_gaps));
    assert.ok(Array.isArray(assembled.limitations));
    assert.ok(assembled.provenance);
    assert.equal(assembled.provenance.channel_contribution, false);
    assert.equal(assembled.reference.pooled, true);
    assert.equal(assembled.reference.average_of_daily_ratios, false);
  });
});

describe("daily_discount_deviation authz y M9 intacto", () => {
  it("GA/GV fail-closed", () => {
    const ga = assertDailySalesAccess({ role: "GA" }, 1);
    assert.equal(ga.ok, false);
    assert.equal(ga.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    const gv = assertDailySalesAccess({ role: "GV" }, 1);
    assert.equal(gv.ok, false);
    assert.equal(gv.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
  });

  it("loader respeta SOURCE_RESTRICTED", async () => {
    const denied = await loadDailyDiscountDeviationForChat(null, 1, { dashboardAuth: { role: "GA" } });
    assert.equal(denied.abort, true);
    assert.equal(denied.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
  });

  it("no copia ni corrige la fórmula M9", () => {
    assert.match(LIB_SRC, /SUM\(monto\)\/SUM\(kg\)/);
    assert.match(LIB_SRC, /same_weekday_14d_pooled/);
    assert.doesNotMatch(LIB_SRC, /descuento_por_kilo_diario_provincia/);
    assert.doesNotMatch(LIB_SRC, /channel_contributors/);
    assert.match(M9_SRC, /buildDeltaDescuentoDatosPayload/);
    assert.match(M9_SRC, /ratio_a/);
  });
});

describe("daily_discount_deviation conversación", () => {
  it("follow-ups del producto heredan el intent diario", () => {
    assert.equal(classifyTurnKind("¿Contra qué lo estás comparando?"), "reference_probe");
    assert.equal(classifyTurnKind("¿Quién movió más el promedio?"), "contributors");
    assert.equal(classifyTurnKind("¿Fue general?"), "attention");
    assert.equal(classifyTurnKind("¿Sabemos por qué?"), "why_know");
    assert.equal(classifyTurnKind("¿Qué falta?"), "gap_what");
    assert.equal(classifyTurnKind("¿Quién puede aclararlo?"), "gap_who");
    assert.ok(INHERITABLE_INTENTS.includes("daily_discount_deviation"));
    const turn = resolveConversationTurn({
      question: "¿Quién movió más el promedio?",
      plantaId: 1,
      echoedState: {
        parent_intent: "daily_discount_deviation",
        planta_id: 1,
        active_date: "2026-08-19",
      },
      detectIntent: planDirectorIaQuestion,
    });
    assert.equal(turn.inherit, true);
    assert.equal(turn.inherit_parent_intent, "daily_discount_deviation");
    assert.equal(turn.active_date, "2026-08-19");
  });
});

describe("daily_discount_deviation chat wiring", () => {
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
      loadDailyDiscountDeviationForChat: undefined,
      loadDailySalesDeviationForChat: undefined,
      loadFinancialDiagnosisForChat: undefined,
      loadDeltaDescuentoForChat: undefined,
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
        return "Ayer el descuento/kg quedó por encima de la referencia pooled. Contribución matemática, no causa.";
      },
      loadDailyDiscountDeviationForChat: async () => assembled,
      loadDailySalesDeviationForChat: async () => {
        throw new Error("daily_sales no debe correr");
      },
      loadFinancialDiagnosisForChat: async () => {
        throw new Error("financial_diagnosis no debe correr");
      },
    });
    const first = await askDirectorIa(
      { body: { history: [] }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Por qué subió el descuento/kg ayer?"
    );
    assert.equal(first.ok, true);
    assert.equal(first.context_meta.mode, "daily_discount_deviation");
    assert.equal(first.context_meta.openai_call_count, 1);
    assert.equal(first.context_meta.m9_included, false);
    assert.equal(first.context_meta.channel_contribution, false);
    assert.equal(first.context_meta.conversation_state.parent_intent, "daily_discount_deviation");
    assert.equal(first.context_meta.conversation_state.active_date, "2026-08-19");
    assert.match(lastPrompt.sys, /contribución matemática != causa/);
    assert.match(lastPrompt.sys, /No copies la matemática mensual M9/);
    assert.doesNotMatch(lastPrompt.sys, /cliente X causó/);
    assert.match(lastPrompt.user, /HILO/);
    assert.match(lastPrompt.user, /comparado contra/);
    assert.match(lastPrompt.user, /NO APLICA/);
    assert.equal(openaiCalls, 1);

    const followUps = [
      "¿Contra qué lo estás comparando?",
      "¿Quién movió más el promedio?",
      "¿Fue general?",
      "¿Sabemos por qué?",
      "¿Qué falta?",
      "¿Quién puede aclararlo?",
    ];
    let prev = first;
    for (const q of followUps) {
      const result = await askDirectorIa(
        {
          body: {
            history: [
              { role: "user", content: "¿Por qué subió el descuento/kg ayer?" },
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
      assert.equal(result.context_meta.mode, "daily_discount_deviation", q);
      assert.equal(result.context_meta.conversation_state.active_date, "2026-08-19", q);
      assert.equal(result.context_meta.openai_called, true, q);
      prev = result;
    }
    assert.equal(openaiCalls, 1 + followUps.length);
  });
});

describe("daily_discount_deviation no toca contratos ni M9", () => {
  it("chat llama al loader diario y el planner detecta ayer antes de delta_discount", () => {
    assert.match(CHAT_SRC, /intent === "daily_discount_deviation"/);
    assert.match(PLANNER_SRC, /isDailyDiscountDeviationQuestion/);
    const dailyIdx = PLANNER_SRC.indexOf('makeIntent("daily_discount_deviation"');
    const deltaIdx = PLANNER_SRC.indexOf('makeIntent("delta_discount"');
    const finIdx = PLANNER_SRC.indexOf("caida_ingreso_financiera");
    assert.ok(dailyIdx > 0 && dailyIdx < deltaIdx);
    assert.ok(dailyIdx < finIdx);
    const prompt = buildDailyDiscountDeviationPrompt(assembledFixture(), "¿Por qué subió el descuento/kg ayer?");
    assert.match(prompt.systemPrompt, /contribución matemática != causa/);
  });
});
