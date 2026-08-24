"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  resolveConversationTurn,
  INHERITABLE_INTENTS,
  classifyTurnKind,
} = require("../lib/director-ia-conversation-state");
const {
  computeDailySalesDeviationFromRows,
  assembleDailySalesDeviationEvidence,
} = require("../lib/director-ia-daily-deviation");
const {
  computeDailyDiscountDeviationFromRows,
  assembleDailyDiscountDeviationEvidence,
} = require("../lib/director-ia-daily-discount");
const {
  isDailyExecutiveBriefQuestion,
  loadDailyExecutiveBriefForChat,
  buildDailyExecutiveBriefPrompt,
  DAILY_EXECUTIVE_BRIEF_SYSTEM_ADDENDUM,
} = require("../lib/director-ia-daily-executive-brief");
const { getDirectorIaTool } = require("../lib/director-ia-tools");

const ROOT = path.join(__dirname, "..");
const LIB_DIR = path.join(ROOT, "lib");
const PRODUCTION_ROUTING_FILES = [
  "director-ia-daily-executive-brief.js",
  "director-ia-planner.js",
  "director-ia-conversation-state.js",
  "director-ia-chat.js",
  "director-ia-tools.js",
];

const CANONICAL_OVERVIEW = [
  "¿Cómo nos fue ayer?",
  "¿Qué tal estuvo ayer?",
  "Dame el resumen de ayer.",
  "¿Cómo cerramos el día?",
  "¿Qué pasó ayer?",
  "¿Algo importante de ayer?",
  "¿Qué debo saber de ayer?",
];
const HOLDOUTS = [
  "Cuéntame cómo estuvo el día de ayer.",
  "¿Qué panorama tuvimos ayer?",
  "¿Hay algo de ayer que deba revisar?",
];
const PHRASEBOOK_FORBIDDEN = [...CANONICAL_OVERVIEW, ...HOLDOUTS];

function salesAssembled(over = {}) {
  const computed = computeDailySalesDeviationFromRows(
    over.rows || [
      { fecha: "2026-08-19", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 400 },
      { fecha: "2026-08-19", cliente_norm: "BETA", canal: "Casa", subcanal: "", kg: 50 },
      { fecha: "2026-08-12", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 200 },
      { fecha: "2026-08-12", cliente_norm: "BETA", canal: "Casa", subcanal: "", kg: 50 },
      { fecha: "2026-08-05", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 200 },
      { fecha: "2026-08-05", cliente_norm: "BETA", canal: "Casa", subcanal: "", kg: 40 },
    ],
    { todayYmd: over.todayYmd || "2026-08-20", targetDate: over.targetDate || "2026-08-19" }
  );
  return assembleDailySalesDeviationEvidence({
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    planta_id: 1,
    computed,
    comments: [],
    actions: [],
  });
}

function discountAssembled(over = {}) {
  const computed = computeDailyDiscountDeviationFromRows(
    over.discountRows || [
      { fecha: "2026-08-19", cliente_norm: "BIG", monto: -200 },
      { fecha: "2026-08-12", cliente_norm: "BIG", monto: -36 },
      { fecha: "2026-08-05", cliente_norm: "BIG", monto: -14 },
    ],
    over.kgRows || [
      { fecha: "2026-08-19", cliente_norm: "BIG", kg: 998, canal: "Casa", subcanal: "" },
      { fecha: "2026-08-12", cliente_norm: "BIG", kg: 100, canal: "Casa", subcanal: "" },
      { fecha: "2026-08-05", cliente_norm: "BIG", kg: 700, canal: "Casa", subcanal: "" },
    ],
    { todayYmd: over.todayYmd || "2026-08-20", targetDate: over.targetDate || "2026-08-19" }
  );
  return assembleDailyDiscountDeviationEvidence({
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    planta_id: 1,
    computed,
    comments: [],
    actions: [],
  });
}

function emptySalesAssembled() {
  const computed = computeDailySalesDeviationFromRows(
    [
      { fecha: "2026-08-12", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 200 },
      { fecha: "2026-08-05", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 200 },
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

function briefEcho(over = {}) {
  return {
    parent_intent: "daily_executive_brief",
    planta_id: 1,
    active_entities: [],
    last_evidence_bundle_type: "daily_executive_brief",
    pending_information_gap: { missing_fields: ["sales:gap"], why_blocks: "brief gap" },
    active_date: "2026-08-19",
    previous_frame: null,
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

describe("daily_executive_brief planner", () => {
  it("overview genérico → daily_executive_brief y no sobrecarga plant_diagnosis", () => {
    for (const q of CANONICAL_OVERVIEW) {
      const plan = planDirectorIaQuestion(q);
      assert.equal(plan.intent, "daily_executive_brief", q);
      assert.equal(plan.requires_clarification, false, q);
    }
    assert.equal(planDirectorIaQuestion("cómo va la planta").intent, "plant_diagnosis");
  });

  it("venta explícita y descuento explícito conservan precedencia", () => {
    assert.equal(planDirectorIaQuestion("¿Cómo estuvo la venta ayer?").intent, "daily_sales_deviation");
    assert.equal(
      planDirectorIaQuestion("¿Cómo estuvo el descuento/kg ayer?").intent,
      "daily_discount_deviation"
    );
  });

  it("hold-outs semánticos llegan al brief", () => {
    for (const q of HOLDOUTS) {
      assert.equal(isDailyExecutiveBriefQuestion(q), true, q);
      assert.equal(planDirectorIaQuestion(q).intent, "daily_executive_brief", q);
    }
  });
});

describe("daily_executive_brief no phrasebook", () => {
  it("frases canónicas y hold-outs no están hardcodeadas en routing", () => {
    for (const file of PRODUCTION_ROUTING_FILES) {
      const src = fs.readFileSync(path.join(LIB_DIR, file), "utf8");
      for (const phrase of PHRASEBOOK_FORBIDDEN) {
        assert.equal(src.includes(phrase), false, `${file} no debe contener ${phrase}`);
      }
      assert.equal(src.includes("panorama"), false, `${file} no debe contener panorama`);
    }
  });
});

describe("daily_executive_brief pack", () => {
  it("compone venta + descuento misma planta y fecha, provenance/gaps separados", async () => {
    const seen = { sales: null, discount: null };
    const pack = await loadDailyExecutiveBriefForChat({}, 1, { dashboardAuth: { role: "ZP" } }, {
      targetDate: "2026-08-19",
      todayYmd: "2026-08-20",
      loadSales: async (_p, _i, _r, args) => {
        seen.sales = args.targetDate;
        return salesAssembled();
      },
      loadDiscount: async (_p, _i, _r, args) => {
        seen.discount = args.targetDate;
        return discountAssembled();
      },
    });
    assert.equal(pack.ok, true);
    assert.equal(pack.semantic_class, "daily_executive_brief");
    assert.equal(pack.target_date, "2026-08-19");
    assert.equal(seen.sales, "2026-08-19");
    assert.equal(seen.discount, "2026-08-19");
    assert.equal(pack.plant.planta_id, 1);
    assert.equal(pack.sales.available, true);
    assert.equal(pack.discount.available, true);
    assert.equal(pack.partial, false);
    assert.ok(pack.provenance.sales);
    assert.ok(pack.provenance.discount);
    assert.notEqual(pack.provenance.sales, pack.provenance.discount);
    assert.ok(Array.isArray(pack.information_gaps.sales));
    assert.ok(Array.isArray(pack.information_gaps.discount));
    assert.ok(pack.sales.assembled.detection.target_sales_kg > pack.sales.assembled.detection.reference_sales_kg);
    assert.ok(pack.sales.assembled.detection.target_sales_kg !== 0 || pack.sales.assembled.detection.target_sales_kg == null);
  });

  it("0 filas de venta != 0", async () => {
    const empty = emptySalesAssembled();
    assert.equal(empty.detection.target_sales_kg, null);
    assert.notEqual(empty.detection.target_sales_kg, 0);
    const pack = await loadDailyExecutiveBriefForChat({}, 1, {}, {
      targetDate: "2026-08-19",
      todayYmd: "2026-08-20",
      loadSales: async () => empty,
      loadDiscount: async () => discountAssembled(),
    });
    assert.equal(pack.sales.available, true);
    assert.equal(pack.sales.assembled.detection.target_sales_kg, null);
    assert.ok(pack.sales.limitations.some((l) => /without_rows/.test(l)));
  });

  it("fecha explícita gana y hoy no se trata como cerrado", async () => {
    const seen = { sales: null };
    const explicit = await loadDailyExecutiveBriefForChat({}, 1, {}, {
      targetDate: "2026-08-12",
      todayYmd: "2026-08-20",
      loadSales: async (_p, _i, _r, args) => {
        seen.sales = args.targetDate;
        return salesAssembled({ targetDate: "2026-08-12", todayYmd: "2026-08-20" });
      },
      loadDiscount: async () => discountAssembled({ targetDate: "2026-08-12", todayYmd: "2026-08-20" }),
    });
    assert.equal(explicit.target_date, "2026-08-12");
    assert.equal(seen.sales, "2026-08-12");

    const today = await loadDailyExecutiveBriefForChat({}, 1, {}, {
      targetDate: "2026-08-20",
      todayYmd: "2026-08-20",
      loadSales: async (_p, _i, _r, args) => {
        seen.today = args.targetDate;
        return salesAssembled();
      },
      loadDiscount: async () => discountAssembled(),
    });
    assert.equal(today.target_date, "2026-08-19");
    assert.equal(seen.today, "2026-08-19");
    assert.ok(today.brief_limitations.some((l) => /hoy_no_es_dia_completo/.test(l)));
  });
});

describe("daily_executive_brief partial data", () => {
  it("sales OK + discount missing responde venta + limitation", async () => {
    const pack = await loadDailyExecutiveBriefForChat({}, 1, {}, {
      targetDate: "2026-08-19",
      todayYmd: "2026-08-20",
      loadSales: async () => salesAssembled(),
      loadDiscount: async () => ({ ok: false, error: "TOOL_ERROR" }),
    });
    assert.equal(pack.sales.available, true);
    assert.equal(pack.discount.available, false);
    assert.equal(pack.discount.missing, true);
    assert.equal(pack.partial, true);
    assert.equal(pack.assembly_status, "partial");
    assert.ok(pack.brief_limitations.includes("discount_unavailable"));
    assert.notEqual(pack.sales.assembled.detection.target_sales_kg, 0);
  });

  it("discount OK + sales missing responde descuento + limitation", async () => {
    const pack = await loadDailyExecutiveBriefForChat({}, 1, {}, {
      targetDate: "2026-08-19",
      todayYmd: "2026-08-20",
      loadSales: async () => {
        throw new Error("SOURCE_ERROR");
      },
      loadDiscount: async () => discountAssembled(),
    });
    assert.equal(pack.discount.available, true);
    assert.equal(pack.sales.available, false);
    assert.equal(pack.sales.missing, true);
    assert.equal(pack.assembly_status, "partial");
    assert.ok(pack.brief_limitations.includes("sales_unavailable"));
  });

  it("ambas missing no inventan valores", async () => {
    const pack = await loadDailyExecutiveBriefForChat({}, 1, {}, {
      targetDate: "2026-08-19",
      todayYmd: "2026-08-20",
      loadSales: async () => ({ ok: false, error: "SOURCE_ERROR" }),
      loadDiscount: async () => ({ ok: false, error: "SOURCE_ERROR" }),
    });
    assert.equal(pack.sales.available, false);
    assert.equal(pack.discount.available, false);
    assert.equal(pack.assembly_status, "unavailable");
    assert.ok(pack.brief_limitations.some((l) => /both_metrics_unavailable/.test(l)));
    assert.equal(pack.sales.assembled, null);
    assert.equal(pack.discount.assembled, null);
  });
});

describe("daily_executive_brief conversation state", () => {
  it("INHERITABLE incluye brief y open followups heredan", () => {
    assert.ok(INHERITABLE_INTENTS.includes("daily_executive_brief"));
    assert.equal(classifyTurnKind("¿Qué te llama la atención?"), "attention");
    assert.equal(classifyTurnKind("¿Qué más ves?"), "attention");
    assert.equal(classifyTurnKind("¿Qué debería revisar?"), "attention");
    assert.equal(classifyTurnKind("¿Qué sigue sin explicación?"), "gap_what");
    const t = resolve("¿Qué te llama la atención?", briefEcho());
    assert.equal(t.inherit, true);
    assert.equal(t.inherit_parent_intent, "daily_executive_brief");
    assert.equal(t.active_date, "2026-08-19");
  });

  it("¿Y la venta? / ¿Y el descuento? cambian métrica y conservan fecha", () => {
    const toSales = resolve("¿Y la venta?", briefEcho());
    assert.equal(toSales.cross_metric_switch, true);
    assert.equal(toSales.inherit_parent_intent, "daily_sales_deviation");
    assert.equal(toSales.active_date, "2026-08-19");
    const toDiscount = resolve("¿Y el descuento?", briefEcho());
    assert.equal(toDiscount.cross_metric_switch, true);
    assert.equal(toDiscount.inherit_parent_intent, "daily_discount_deviation");
    assert.equal(toDiscount.active_date, "2026-08-19");
  });
});

describe("daily_executive_brief reasoning boundary", () => {
  it("addendum no programa buen/mal día ni causalidad", () => {
    assert.match(DAILY_EXECUTIVE_BRIEF_SYSTEM_ADDENDUM, /no clasifiques el día como buen día o mal día/i);
    assert.match(DAILY_EXECUTIVE_BRIEF_SYSTEM_ADDENDUM, /no atribuyas causalidad/i);
    assert.match(DAILY_EXECUTIVE_BRIEF_SYSTEM_ADDENDUM, /no inventes valores/i);
    assert.match(DAILY_EXECUTIVE_BRIEF_SYSTEM_ADDENDUM, /coincidencia de movimientos no es causa/i);
    assert.doesNotMatch(DAILY_EXECUTIVE_BRIEF_SYSTEM_ADDENDUM, /gracias al descuento/i);
    const prompt = buildDailyExecutiveBriefPrompt(
      {
        plant: { planta_id: 1, planta_nombre: "Puebla" },
        target_date: "2026-08-19",
        today_ymd: "2026-08-20",
        timezone: "America/Mexico_City",
        partial: false,
        assembly_status: "complete",
        sales: { available: true, assembled: salesAssembled(), limitations: [], provenance: { sales: "arr.ventas_diarias_cliente" } },
        discount: {
          available: true,
          assembled: discountAssembled(),
          limitations: [],
          provenance: { discount: "arr.descuentos_diarios_cliente" },
        },
        information_gaps: { sales: [], discount: [] },
        brief_limitations: [],
      },
      "¿Cómo nos fue ayer?"
    );
    assert.match(prompt.systemPrompt, /tensión|qué destaca|sin explicación/i);
    assert.match(prompt.userContent, /PROVENANCE SEPARADO/);
    assert.match(prompt.userContent, /No mezclar causalidad/);
  });
});

describe("daily_executive_brief tool registry", () => {
  it("declara tool read-only sin ingreso diario", () => {
    const tool = getDirectorIaTool("get_daily_executive_brief");
    assert.ok(tool);
    assert.equal(tool.readOnly, true);
    assert.match(tool.limitations, /no ingreso diario/i);
    assert.equal(tool.executor, "loadDailyExecutiveBriefForChat");
  });
});

describe("askDirectorIa daily_executive_brief", () => {
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
      loadDailyExecutiveBriefForChat: undefined,
      loadDailySalesDeviationForChat: undefined,
      loadDailyDiscountDeviationForChat: undefined,
      loadPlantDiagnosisForChat: undefined,
      loadFinancialDiagnosisForChat: undefined,
    });
  });

  function wire(over = {}) {
    const counts = {
      sales: 0,
      discount: 0,
      openai: 0,
      lastSalesDate: null,
      lastDiscountDate: null,
      lastSys: "",
      lastUser: "",
    };
    configureDirectorIaChat({
      pool: {},
      dailyTodayYmd: "2026-08-20",
      openaiChat: async (sys, user) => {
        counts.openai += 1;
        counts.lastSys = sys;
        counts.lastUser = user;
        return over.openaiText || "Panorama del día con pack fresco. Sin causa inventada.";
      },
      loadDailySalesDeviationForChat: async (_p, _i, _r, args) => {
        counts.sales += 1;
        counts.lastSalesDate = args && args.targetDate;
        return salesAssembled();
      },
      loadDailyDiscountDeviationForChat: async (_p, _i, _r, args) => {
        counts.discount += 1;
        counts.lastDiscountDate = args && args.targetDate;
        return discountAssembled();
      },
      loadPlantDiagnosisForChat: async () => {
        throw new Error("plant_diagnosis no debe correr");
      },
      loadFinancialDiagnosisForChat: async () => {
        throw new Error("financial_diagnosis no debe correr");
      },
    });
    return counts;
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

  it("conversación obligatoria: brief → atención → venta → descuento → quién → por qué → hueco", async () => {
    const counts = wire();
    const t1 = await runTurn("¿Cómo nos fue ayer?");
    assert.equal(t1.ok, true);
    assert.equal(t1.context_meta.mode, "daily_executive_brief");
    assert.equal(t1.context_meta.conversation_state.parent_intent, "daily_executive_brief");
    assert.equal(t1.context_meta.conversation_state.active_date, "2026-08-19");
    assert.equal(t1.context_meta.conversation_state.last_evidence_bundle_type, "daily_executive_brief");
    assert.equal(t1.context_meta.planta_id, 1);
    assert.equal(counts.sales, 1);
    assert.equal(counts.discount, 1);
    assert.equal(counts.lastSalesDate, "2026-08-19");
    assert.equal(counts.lastDiscountDate, "2026-08-19");
    assert.equal(counts.openai, 1);
    assert.match(counts.lastSys, /no atribuyas causalidad/i);
    assert.match(counts.lastUser, /HILO/);
    assert.equal(t1.context_meta.daily_income_implemented, false);

    const t2 = await runTurn("¿Qué te llama la atención?", {
      conversation_state: t1.context_meta.conversation_state,
    });
    assert.equal(t2.context_meta.mode, "daily_executive_brief");
    assert.equal(t2.context_meta.conversation_state.active_date, "2026-08-19");
    assert.equal(counts.sales, 2);
    assert.equal(counts.discount, 2);
    assert.equal(counts.openai, 2);

    const t3 = await runTurn("¿Y la venta?", {
      conversation_state: t2.context_meta.conversation_state,
    });
    assert.equal(t3.context_meta.mode, "daily_sales_deviation");
    assert.equal(t3.context_meta.conversation_state.active_date, "2026-08-19");
    assert.equal(t3.context_meta.conversation_state.previous_frame.parent_intent, "daily_executive_brief");
    assert.equal(counts.sales, 3);
    assert.equal(counts.discount, 2);

    const t4 = await runTurn("¿Y el descuento?", {
      conversation_state: t3.context_meta.conversation_state,
    });
    assert.equal(t4.context_meta.mode, "daily_discount_deviation");
    assert.equal(t4.context_meta.conversation_state.active_date, "2026-08-19");
    assert.equal(t4.context_meta.conversation_state.previous_frame.parent_intent, "daily_executive_brief");
    assert.equal(counts.discount, 3);

    const t5 = await runTurn("¿Quién lo movió más?", {
      conversation_state: t4.context_meta.conversation_state,
    });
    assert.equal(t5.context_meta.mode, "daily_discount_deviation");
    const t6 = await runTurn("¿Sabemos por qué?", {
      conversation_state: t5.context_meta.conversation_state,
    });
    assert.equal(t6.context_meta.mode, "daily_discount_deviation");
    const t7 = await runTurn("¿Qué sigue sin explicación?", {
      conversation_state: t6.context_meta.conversation_state,
    });
    assert.equal(t7.context_meta.mode, "daily_discount_deviation");
    assert.equal(t7.context_meta.openai_called, true);
    assert.equal(counts.openai, 7);
  });

  it("open followups se quedan en el brief", async () => {
    const counts = wire();
    const t1 = await runTurn("¿Cómo nos fue ayer?");
    for (const q of ["¿Qué más ves?", "¿Qué debería revisar?", "¿Qué sigue sin explicación?"]) {
      const t = await runTurn(q, { conversation_state: t1.context_meta.conversation_state });
      assert.equal(t.context_meta.mode, "daily_executive_brief", q);
      assert.equal(t.context_meta.conversation_state.active_date, "2026-08-19", q);
      assert.equal(t.context_meta.openai_called, true, q);
    }
    assert.equal(counts.sales, 4);
    assert.equal(counts.discount, 4);
  });

  it("hold-out no copiado llega a GPT con brief", async () => {
    const counts = wire();
    const t = await runTurn("¿Qué panorama tuvimos ayer?");
    assert.equal(t.context_meta.mode, "daily_executive_brief");
    assert.equal(counts.openai, 1);
    assert.match(counts.lastUser, /BRIEF EJECUTIVO DIARIO/);
  });

  it("partial sales-only llega a GPT con limitation de descuento", async () => {
    const counts = { openai: 0, lastUser: "" };
    configureDirectorIaChat({
      pool: {},
      dailyTodayYmd: "2026-08-20",
      openaiChat: async (_sys, user) => {
        counts.openai += 1;
        counts.lastUser = user;
        return "Venta disponible; descuento no establecido.";
      },
      loadDailySalesDeviationForChat: async () => salesAssembled(),
      loadDailyDiscountDeviationForChat: async () => ({ ok: false, error: "TOOL_ERROR" }),
    });
    const t = await runTurn("¿Cómo nos fue ayer?");
    assert.equal(t.ok, true);
    assert.equal(t.context_meta.mode, "daily_executive_brief");
    assert.equal(t.context_meta.partial, true);
    assert.match(counts.lastUser, /descuento\/kg no establecido/);
    assert.equal(counts.openai, 1);
  });
});
