"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  resolveConversationTurn,
  shouldCapturePrevious,
  resolveOutgoingPreviousFrame,
  namedDailyMetricSignal,
  snapshotCurrentFrame,
} = require("../lib/director-ia-conversation-state");
const {
  computeDailySalesDeviationFromRows,
  assembleDailySalesDeviationEvidence,
} = require("../lib/director-ia-daily-deviation");
const {
  computeDailyDiscountDeviationFromRows,
  assembleDailyDiscountDeviationEvidence,
} = require("../lib/director-ia-daily-discount");

const ROOT = path.join(__dirname, "..");
const LIB_DIR = path.join(ROOT, "lib");

const HOLDOUT_SWITCH_TO_DISCOUNT = [
  "¿Qué pasó con el descuento?",
  "¿Y en descuento cómo quedó?",
  "¿Y el descuento por kilo?",
];
const HOLDOUT_SWITCH_TO_SALES = ["¿Qué tal las ventas?", "¿Cómo salió la venta?"];
const HOLDOUT_SAME_METRIC = ["¿Y eso?", "¿Qué más?", "¿Y cómo estuvo?", "¿Y margen?", "¿Y lo otro?"];
const PHRASEBOOK_FORBIDDEN = ["¿Y el descuento?", "¿Y la venta?"];
const PRODUCTION_ROUTING_FILES = [
  "director-ia-conversation-state.js",
  "director-ia-chat.js",
  "director-ia-planner.js",
  "director-ia-daily-deviation.js",
  "director-ia-daily-discount.js",
];

function srcBlock(name, extra = {}) {
  return {
    status: extra.status || "SOURCE_AVAILABLE",
    source: extra.source || name,
    period: extra.period || { kind: "snapshot", as_of: "2026-08-23" },
    payload: extra.payload != null ? extra.payload : {},
    plant: extra.plant,
    error: extra.error,
  };
}

function assembledArturo() {
  return {
    ok: true,
    abort: false,
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    alignment: {
      status: "comparable",
      note: "ok",
      igf_period: "2026-02",
      arr_period: "2026-02",
      commercial_state_period: "2026-02",
    },
    assembly_status: "complete",
    limitations: ["sin causa observada en fuentes"],
    commercial_materiality: {
      categories: [
        {
          top_clients: [
            {
              cliente_display: "Arturo Lopez",
              cliente_keys: ["puebla|arturo"],
              coverage_status: "coverage_unknown",
              has_dicf_action: false,
              latest_action: null,
            },
          ],
        },
      ],
    },
    sources: {
      action_register: srcBlock("arr.action_register_revisions", {
        payload: { summary: { open: 1, closed: 0, overdue: 0 }, top_overdue: [], responsables: [] },
      }),
      dicf: srcBlock("arr.dicf_acciones", { payload: { actions: [] } }),
      commercial_state: srcBlock("arr.dicf_cliente_mes", { payload: {} }),
      bitacora: srcBlock("arr.director_ia_bitacora", { payload: { sessions: [] } }),
      arr: srcBlock("arr.proyeccion_planta", { payload: { venta_ton: 1, desc_kg: 0.1 } }),
      igf: srcBlock("igf.compromiso_lines", { payload: { composition: { ok: true, lines: [] } } }),
    },
  };
}

function dailySalesEcho(over = {}) {
  return {
    parent_intent: "daily_sales_deviation",
    planta_id: 1,
    active_entities: [],
    last_evidence_bundle_type: "daily_sales_deviation",
    pending_information_gap: { missing_fields: ["gap_of_sales"], why_blocks: "sales gap" },
    active_date: "2026-08-19",
    previous_frame: {
      parent_intent: "plant_diagnosis",
      planta_id: 1,
      active_entities: [{ kind: "client", display: "Arturo Lopez", cliente_key: "puebla|arturo" }],
      last_evidence_bundle_type: "plant_diagnosis",
    },
    ...over,
  };
}

function dailyDiscountEcho(over = {}) {
  return {
    ...dailySalesEcho(),
    parent_intent: "daily_discount_deviation",
    last_evidence_bundle_type: "daily_discount_deviation",
    pending_information_gap: { missing_fields: ["gap_of_discount"], why_blocks: "discount gap" },
    ...over,
  };
}

function resolve(question, echoed) {
  return resolveConversationTurn({
    question,
    plantaId: 1,
    echoedState: echoed,
    detectIntent: detectDirectorIaIntent,
  });
}

function dailySalesAssembled() {
  const computed = computeDailySalesDeviationFromRows(
    [
      { fecha: "2026-08-19", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 100 },
      { fecha: "2026-08-19", cliente_norm: "BETA", canal: "Casa", subcanal: "", kg: 50 },
      { fecha: "2026-08-12", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 200 },
      { fecha: "2026-08-12", cliente_norm: "BETA", canal: "Casa", subcanal: "", kg: 50 },
      { fecha: "2026-08-05", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 200 },
      { fecha: "2026-08-05", cliente_norm: "BETA", canal: "Casa", subcanal: "", kg: 40 },
    ],
    { todayYmd: "2026-08-20", targetDate: "2026-08-19" }
  );
  return assembleDailySalesDeviationEvidence({
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    planta_id: 1,
    computed,
    comments: [],
    actions: [],
  });
}

function dailyDiscountAssembled() {
  const computed = computeDailyDiscountDeviationFromRows(
    [
      { fecha: "2026-08-19", cliente_norm: "BIG", monto: -200 },
      { fecha: "2026-08-12", cliente_norm: "BIG", monto: -36 },
      { fecha: "2026-08-05", cliente_norm: "BIG", monto: -14 },
    ],
    [
      { fecha: "2026-08-19", cliente_norm: "BIG", kg: 998, canal: "Casa", subcanal: "" },
      { fecha: "2026-08-12", cliente_norm: "BIG", kg: 100, canal: "Casa", subcanal: "" },
      { fecha: "2026-08-05", cliente_norm: "BIG", kg: 700, canal: "Casa", subcanal: "" },
    ],
    { todayYmd: "2026-08-20", targetDate: "2026-08-19" }
  );
  return assembleDailyDiscountDeviationEvidence({
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    planta_id: 1,
    computed,
    comments: [],
    actions: [],
  });
}

describe("daily cross-metric — planner aislado intacto", () => {
  it("sigue exigiendo ayer para standalone y no inventa intent diario", () => {
    assert.equal(planDirectorIaQuestion("¿Cómo estuvo la venta ayer?").intent, "daily_sales_deviation");
    assert.equal(planDirectorIaQuestion("¿Por qué subió el descuento/kg ayer?").intent, "daily_discount_deviation");
    assert.equal(detectDirectorIaIntent("¿Y el descuento?").intent, "unknown");
    assert.equal(detectDirectorIaIntent("¿Y la venta?").intent, "unknown");
    assert.equal(namedDailyMetricSignal("¿Y el descuento?"), "daily_discount_deviation");
    assert.equal(namedDailyMetricSignal("¿Y la venta?"), "daily_sales_deviation");
    assert.equal(namedDailyMetricSignal("¿Y eso?"), null);
    assert.equal(namedDailyMetricSignal("¿Y margen?"), null);
  });
});

describe("daily cross-metric — resolveConversationTurn", () => {
  it("venta ayer → descuento hereda fecha y cambia intent", () => {
    const t = resolve("¿Y el descuento?", dailySalesEcho());
    assert.equal(t.detected_intent, "unknown");
    assert.equal(t.cross_metric_switch, true);
    assert.equal(t.inherit, true);
    assert.equal(t.inherit_parent_intent, "daily_discount_deviation");
    assert.equal(t.parent_intent, "daily_discount_deviation");
    assert.equal(t.active_date, "2026-08-19");
    assert.equal(t.invalidate_gap, true);
    assert.equal(t.restore_previous, false);
    assert.equal(t.previous_frame.parent_intent, "plant_diagnosis");
  });

  it("descuento ayer → venta es simétrico", () => {
    const t = resolve("¿Y la venta?", dailyDiscountEcho());
    assert.equal(t.cross_metric_switch, true);
    assert.equal(t.inherit_parent_intent, "daily_sales_deviation");
    assert.equal(t.active_date, "2026-08-19");
    assert.equal(t.invalidate_gap, true);
  });

  it("same-metric no cambia el parent", () => {
    for (const q of ["¿Y eso?", "¿Qué más?", "¿Quién explica más?"]) {
      const t = resolve(q, dailySalesEcho());
      assert.equal(t.cross_metric_switch, false, q);
      assert.equal(t.inherit_parent_intent, "daily_sales_deviation", q);
      assert.equal(t.active_date, "2026-08-19", q);
    }
  });

  it("sin active_date no inventa ayer", () => {
    const none = resolve("¿Y el descuento?", {
      parent_intent: null,
      planta_id: 1,
      active_entities: [],
      last_evidence_bundle_type: null,
      pending_information_gap: null,
      active_date: null,
      previous_frame: null,
    });
    assert.equal(none.cross_metric_switch, false);
    assert.equal(none.inherit, false);
    assert.equal(none.active_date, null);
    assert.equal(none.unknown_needs_clarification, true);

    const plant = resolve("¿Y el descuento?", {
      parent_intent: "plant_diagnosis",
      planta_id: 1,
      last_evidence_bundle_type: "plant_diagnosis",
      active_date: null,
    });
    assert.equal(plant.cross_metric_switch, false);
    assert.equal(plant.inherit_parent_intent, "plant_diagnosis");
    assert.equal(plant.active_date, null);
  });

  it("señal mensual no hace switch diario", () => {
    const t = resolve("¿Y el descuento este mes?", dailySalesEcho());
    assert.equal(t.cross_metric_switch, false);
    assert.equal(t.inherit, false);
    assert.notEqual(t.inherit_parent_intent, "daily_discount_deviation");
  });

  it("margen y weekday no adivinan métrica ni fecha", () => {
    const margen = resolve("¿Y margen?", dailySalesEcho());
    assert.equal(margen.cross_metric_switch, false);
    assert.equal(margen.inherit_parent_intent, "daily_sales_deviation");

    const weekday = resolve("¿Y la venta del lunes?", dailyDiscountEcho());
    assert.equal(weekday.cross_metric_switch, false);
    assert.equal(weekday.inherit, false);
    assert.equal(weekday.unknown_needs_clarification, true);
  });

  it("hold-outs generalizan tokens y no son phrasebook", () => {
    for (const q of HOLDOUT_SWITCH_TO_DISCOUNT) {
      const t = resolve(q, dailySalesEcho());
      assert.equal(t.cross_metric_switch, true, q);
      assert.equal(t.inherit_parent_intent, "daily_discount_deviation", q);
      assert.equal(t.active_date, "2026-08-19", q);
    }
    for (const q of HOLDOUT_SWITCH_TO_SALES) {
      const t = resolve(q, dailyDiscountEcho());
      assert.equal(t.cross_metric_switch, true, q);
      assert.equal(t.inherit_parent_intent, "daily_sales_deviation", q);
    }
    for (const q of HOLDOUT_SAME_METRIC) {
      const t = resolve(q, dailySalesEcho());
      assert.equal(t.cross_metric_switch, false, q);
    }
  });

  it("standalone sales→discount sigue capturando previous; el switch contextual no evicta planta", () => {
    const incoming = dailySalesEcho();
    assert.equal(shouldCapturePrevious(incoming, "daily_discount_deviation"), true);
    const standaloneOutgoing = resolveOutgoingPreviousFrame(incoming, "daily_discount_deviation", false);
    assert.equal(standaloneOutgoing.parent_intent, "daily_sales_deviation");
    const t = resolve("¿Y el descuento?", incoming);
    assert.equal(t.cross_metric_switch, true);
    assert.equal(t.previous_frame.parent_intent, "plant_diagnosis");
    const plant = snapshotCurrentFrame({
      parent_intent: "plant_diagnosis",
      planta_id: 1,
      last_evidence_bundle_type: "plant_diagnosis",
    });
    assert.equal(shouldCapturePrevious(plant, "daily_sales_deviation"), true);
  });
});

describe("daily cross-metric — no phrasebook en lib/", () => {
  it("hold-outs y frases canónicas no están hardcodeadas en routing", () => {
    for (const file of PRODUCTION_ROUTING_FILES) {
      const src = fs.readFileSync(path.join(LIB_DIR, file), "utf8");
      for (const phrase of [...HOLDOUT_SWITCH_TO_DISCOUNT, ...HOLDOUT_SWITCH_TO_SALES, ...PHRASEBOOK_FORBIDDEN]) {
        assert.equal(src.includes(phrase), false, `${file} no debe contener ${phrase}`);
      }
    }
  });
});

describe("askDirectorIa daily cross-metric strategy B", () => {
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
      loadPlantDiagnosisForChat: undefined,
      loadFinancialDiagnosisForChat: undefined,
      loadDailySalesDeviationForChat: undefined,
      loadDailyDiscountDeviationForChat: undefined,
      persistentMemoryStore: null,
    });
  });

  function wire(over = {}) {
    const counts = { sales: 0, discount: 0, plant: 0, openai: 0, lastSalesDate: null, lastDiscountDate: null };
    let lastUser = "";
    configureDirectorIaChat({
      pool: {},
      openaiChat: async (_sys, user) => {
        counts.openai += 1;
        lastUser = user;
        return over.openaiText || "Lectura con pack fresco. Sin causa inventada.";
      },
      loadDailySalesDeviationForChat: async (_pool, _id, _req, args) => {
        counts.sales += 1;
        counts.lastSalesDate = args && args.targetDate;
        return dailySalesAssembled();
      },
      loadDailyDiscountDeviationForChat: async (_pool, _id, _req, args) => {
        counts.discount += 1;
        counts.lastDiscountDate = args && args.targetDate;
        return dailyDiscountAssembled();
      },
      loadPlantDiagnosisForChat: async () => {
        counts.plant += 1;
        throw new Error("plant_diagnosis no debe correr en este slice");
      },
      loadFinancialDiagnosisForChat: async () => {
        throw new Error("financial_diagnosis no debe correr");
      },
    });
    return { counts, getUser: () => lastUser };
  }

  async function runTurn(question, opts = {}) {
    return askDirectorIa(
      {
        body: {
          history: [...(opts.history || []), { role: "user", content: question }],
          conversation_state: opts.conversation_state,
        },
        dashboardAuth: { role: "ZP", actor_id: 9, plantas_permitidas: [1] },
      },
      1,
      question
    );
  }

  it("conversación 1: venta → descuento → follow-ups heredan descuento", async () => {
    const { counts, getUser } = wire();
    const t1 = await runTurn("¿Cómo estuvo la venta ayer?");
    assert.equal(t1.context_meta.mode, "daily_sales_deviation");
    assert.equal(t1.context_meta.conversation_state.active_date, "2026-08-19");
    assert.equal(counts.sales, 1);
    assert.equal(counts.discount, 0);
    const salesGap = t1.context_meta.conversation_state.pending_information_gap;

    const t2 = await runTurn("¿Y el descuento?", { conversation_state: t1.context_meta.conversation_state });
    assert.equal(t2.context_meta.mode, "daily_discount_deviation");
    assert.equal(t2.context_meta.conversation_state.parent_intent, "daily_discount_deviation");
    assert.equal(t2.context_meta.conversation_state.last_evidence_bundle_type, "daily_discount_deviation");
    assert.equal(t2.context_meta.conversation_state.active_date, "2026-08-19");
    assert.equal(counts.lastDiscountDate, "2026-08-19");
    assert.equal(counts.discount, 1);
    assert.equal(counts.sales, 1);
    assert.notDeepEqual(t2.context_meta.conversation_state.pending_information_gap, salesGap);
    assert.match(getUser(), /HILO/);
    assert.deepEqual(
      t2.context_meta.conversation_state.previous_frame,
      t1.context_meta.conversation_state.previous_frame
    );

    const t3 = await runTurn("¿Quién lo movió más?", { conversation_state: t2.context_meta.conversation_state });
    assert.equal(t3.context_meta.mode, "daily_discount_deviation");
    const t4 = await runTurn("¿Tenemos explicación?", { conversation_state: t3.context_meta.conversation_state });
    assert.equal(t4.context_meta.mode, "daily_discount_deviation");
    assert.equal(counts.discount, 3);
    assert.equal(counts.sales, 1);
  });

  it("conversación 2: descuento → venta con la misma fecha", async () => {
    const { counts } = wire();
    const t1 = await runTurn("¿Por qué subió el descuento/kg ayer?");
    assert.equal(t1.context_meta.mode, "daily_discount_deviation");
    const t2 = await runTurn("¿Y la venta?", { conversation_state: t1.context_meta.conversation_state });
    assert.equal(t2.context_meta.mode, "daily_sales_deviation");
    assert.equal(t2.context_meta.conversation_state.active_date, "2026-08-19");
    assert.equal(counts.lastSalesDate, "2026-08-19");
    assert.equal(counts.sales, 1);
    assert.equal(counts.discount, 1);
    const t3 = await runTurn("¿Quién explica más?", { conversation_state: t2.context_meta.conversation_state });
    assert.equal(t3.context_meta.mode, "daily_sales_deviation");
  });

  it("conversación 3: ¿Y eso? / ¿Qué más? siguen en venta", async () => {
    const { counts } = wire();
    const t1 = await runTurn("¿Cómo estuvo la venta ayer?");
    const t2 = await runTurn("¿Y eso?", { conversation_state: t1.context_meta.conversation_state });
    assert.equal(t2.context_meta.mode, "daily_sales_deviation");
    const t3 = await runTurn("¿Qué más?", { conversation_state: t2.context_meta.conversation_state });
    assert.equal(t3.context_meta.mode, "daily_sales_deviation");
    assert.equal(counts.discount, 0);
    assert.equal(counts.sales, 3);
  });

  it("conversación 4: sin estado diario no inventa ayer", async () => {
    const { counts } = wire();
    const t = await runTurn("¿Y el descuento?");
    assert.equal(t.ok, true);
    assert.equal(t.context_meta.requires_clarification, true);
    assert.equal(counts.discount, 0);
    assert.equal(counts.sales, 0);
    assert.equal(counts.openai, 0);
  });

  it("conversación 5: mensual no usa pack diario por herencia", async () => {
    const { counts } = wire();
    const t1 = await runTurn("¿Cómo estuvo la venta ayer?");
    const t2 = await runTurn("¿Y el descuento este mes?", {
      conversation_state: t1.context_meta.conversation_state,
    });
    assert.notEqual(t2.context_meta.mode, "daily_discount_deviation");
    assert.equal(counts.discount, 0);
    assert.equal(t2.context_meta.requires_clarification, true);
  });

  it("conversación 6: switch no corrompe previous_frame; Volvamos a Arturo restaura planta", async () => {
    const counts = { sales: 0, discount: 0 };
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "ok",
      loadDailySalesDeviationForChat: async () => {
        counts.sales += 1;
        return dailySalesAssembled();
      },
      loadDailyDiscountDeviationForChat: async (_p, _i, _r, args) => {
        counts.discount += 1;
        counts.lastDiscountDate = args && args.targetDate;
        return dailyDiscountAssembled();
      },
      loadPlantDiagnosisForChat: async () => assembledArturo(),
    });
    const sales = await runTurn("¿Cómo estuvo la venta ayer?", {
      conversation_state: {
        parent_intent: "plant_diagnosis",
        planta_id: 1,
        active_entities: [{ kind: "client", display: "Arturo Lopez", cliente_key: "puebla|arturo" }],
        last_evidence_bundle_type: "plant_diagnosis",
        previous_frame: null,
      },
    });
    assert.equal(sales.context_meta.conversation_state.previous_frame.parent_intent, "plant_diagnosis");
    const discount = await runTurn("¿Y el descuento?", {
      conversation_state: sales.context_meta.conversation_state,
    });
    assert.equal(discount.context_meta.mode, "daily_discount_deviation");
    assert.equal(discount.context_meta.conversation_state.previous_frame.parent_intent, "plant_diagnosis");
    assert.equal(
      discount.context_meta.conversation_state.previous_frame.active_entities[0].display,
      "Arturo Lopez"
    );
    const back = await runTurn("Volvamos a Arturo.", {
      conversation_state: discount.context_meta.conversation_state,
    });
    assert.equal(back.context_meta.mode, "plant_diagnosis");
    assert.equal(back.context_meta.conversation_state.parent_intent, "plant_diagnosis");
  });

  it("hold-out wording carga el pack destino", async () => {
    const { counts } = wire();
    const t1 = await runTurn("¿Cómo estuvo la venta ayer?");
    const t2 = await runTurn("¿Qué pasó con el descuento?", {
      conversation_state: t1.context_meta.conversation_state,
    });
    assert.equal(t2.context_meta.mode, "daily_discount_deviation");
    assert.equal(counts.discount, 1);
    const t3 = await runTurn("¿Qué tal las ventas?", {
      conversation_state: t2.context_meta.conversation_state,
    });
    assert.equal(t3.context_meta.mode, "daily_sales_deviation");
    assert.equal(counts.sales, 2);
  });
});
