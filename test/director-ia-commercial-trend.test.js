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
  linearTrend,
  computeTrendFromPoints,
  resolveRangeWindow,
  assembleCommercialTrend,
  toVentaSerieHttpBody,
  selectTopMovers,
  rangeDaysToToken,
  normalizeCanalFilter,
  canalSqlFor,
} = require("../lib/commercial-trend-engine");
const {
  isCommercialTrendQuestion,
  resolveCommercialTrendSlots,
  loadCommercialTrendForChat,
  buildCommercialTrendPrompt,
  COMMERCIAL_TREND_SYSTEM_ADDENDUM,
} = require("../lib/director-ia-commercial-trend");
const { getDirectorIaTool } = require("../lib/director-ia-tools");

const ROOT = path.join(__dirname, "..");
const LIB_DIR = path.join(ROOT, "lib");
const PRODUCTION_ROUTING_FILES = [
  "director-ia-commercial-trend.js",
  "director-ia-planner.js",
  "director-ia-conversation-state.js",
  "director-ia-chat.js",
  "director-ia-tools.js",
];

const CANONICAL = [
  "¿Cómo vamos en el último mes?",
  "¿Cómo vamos en los últimos 3 meses?",
  "¿Cómo vamos en CASA?",
  "¿Cómo van los COMISIONISTAS?",
  "¿Qué tendencia trae CASA?",
  "¿Cómo se ha comportado COMISIONISTAS?",
];
const HOLDOUTS = [
  "¿Venimos subiendo o bajando?",
  "¿Qué pasó con CASA estos meses?",
];
const PHRASEBOOK_FORBIDDEN = [...CANONICAL, ...HOLDOUTS];

function feLinearTrend(values) {
  const n = values.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}

function fixtureRows() {
  const salesRows = [
    { fecha: "2026-05-27", venta_ton: 10.1 },
    { fecha: "2026-06-01", venta_ton: 11.2 },
    { fecha: "2026-06-10", venta_ton: 12 },
    { fecha: "2026-07-01", venta_ton: 9.5 },
    { fecha: "2026-08-15", venta_ton: 8.2 },
    { fecha: "2026-08-24", venta_ton: 7.4 },
  ];
  const discountRows = [{ fecha: "2026-08-24", descuento_mxn: 100 }];
  const cliCurRows = [
    { cliente: "ACME", venta_ton: 20 },
    { cliente: "BETA", venta_ton: 5 },
    { cliente: "GAMA", venta_ton: 1 },
  ];
  const cliPrevRows = [
    { cliente: "ACME", venta_ton: 10 },
    { cliente: "BETA", venta_ton: 12 },
    { cliente: "DELTA", venta_ton: 4 },
  ];
  return { salesRows, discountRows, cliCurRows, cliPrevRows };
}

function engineFromFixture(over = {}) {
  const rows = fixtureRows();
  return assembleCommercialTrend({
    plant_code: "PUEBLA",
    plant_codes: ["PUEBLA"],
    range: over.range || "3m",
    canal: over.canal || "casa",
    fecha_desde: over.fecha_desde || "2026-05-27",
    fecha_hasta: over.fecha_hasta || "2026-08-24",
    fecha_prev_desde: "2026-02-26",
    fecha_prev_hasta: "2026-05-26",
    ...rows,
    ...over,
  });
}

function echoTrend(over = {}) {
  return {
    parent_intent: "commercial_trend",
    planta_id: 1,
    active_entities: [],
    last_evidence_bundle_type: "commercial_trend",
    pending_information_gap: null,
    active_date: null,
    active_range_days: 90,
    active_channel: "casa",
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

describe("commercial_trend planner", () => {
  it("preguntas de tendencia/rango/canal → commercial_trend y no daily brief", () => {
    for (const q of CANONICAL) {
      const plan = planDirectorIaQuestion(q);
      assert.equal(plan.intent, "commercial_trend", q);
      assert.ok(plan.confidence >= 0.9, q);
    }
    assert.equal(planDirectorIaQuestion("¿Cómo nos fue ayer?").intent, "daily_executive_brief");
    assert.equal(planDirectorIaQuestion("¿Cómo estuvo la venta ayer?").intent, "daily_sales_deviation");
  });

  it("hold-outs semánticos también caen a commercial_trend", () => {
    for (const q of HOLDOUTS) {
      assert.equal(detectDirectorIaIntent(q).intent, "commercial_trend", q);
    }
  });
});

describe("commercial_trend no phrasebook", () => {
  it("no copia frases canónicas como switch de producto", () => {
    for (const file of PRODUCTION_ROUTING_FILES) {
      const src = fs.readFileSync(path.join(LIB_DIR, file), "utf8");
      for (const phrase of PHRASEBOOK_FORBIDDEN) {
        assert.equal(src.includes(phrase), false, `${file} contiene phrasebook: ${phrase}`);
      }
    }
  });
});

describe("shared engine OLS + range + channel + movers", () => {
  it("OLS es idéntico a linearTrend del frontend", () => {
    const values = [10.1, 11.2, 12, 9.5, 8.2, 7.4];
    const fe = feLinearTrend(values);
    const be = linearTrend(values);
    assert.ok(fe && be);
    assert.ok(Math.abs(fe.a - be.a) < 1e-12);
    assert.ok(Math.abs(fe.b - be.b) < 1e-12);
    const trend = computeTrendFromPoints(values.map((v, i) => ({ fecha: `2026-08-0${i + 1}`, venta_ton: v })));
    assert.equal(trend.observation_count, 6);
    assert.equal(trend.direction, "DOWN");
    assert.equal(trend.slope, be.b);
  });

  it("n<2 → INSUFFICIENT_DATA; no first-vs-last", () => {
    const one = computeTrendFromPoints([{ fecha: "2026-08-01", venta_ton: 9 }]);
    assert.equal(one.direction, "INSUFFICIENT_DATA");
    assert.equal(one.slope, null);
    const src = fs.readFileSync(path.join(LIB_DIR, "commercial-trend-engine.js"), "utf8");
    assert.equal(/first.*last|points\[0\].*points\[points.length/.test(src), false);
  });

  it("1m=30d y 3m=90d anclados a MAX(fecha), inclusive", () => {
    const w1 = resolveRangeWindow("2025-01-01", "2026-08-24", "1m");
    assert.equal(w1.fecha_hasta, "2026-08-24");
    assert.equal(w1.fecha_desde, "2026-07-26");
    assert.equal(w1.span_days, 30);
    const w3 = resolveRangeWindow("2025-01-01", "2026-08-24", "3m");
    assert.equal(w3.fecha_hasta, "2026-08-24");
    assert.equal(w3.fecha_desde, "2026-05-27");
    assert.equal(w3.span_days, 90);
    assert.equal(rangeDaysToToken(90), "3m");
    assert.equal(rangeDaysToToken(30), "1m");
  });

  it("canal LIKE %comisionista% y alias COMISIONISTAS", () => {
    assert.equal(normalizeCanalFilter("COMISIONISTAS"), "ambos");
    assert.equal(normalizeCanalFilter("comisionista"), "comisionista");
    assert.match(canalSqlFor("comisionista", "sales"), /LIKE '%comisionista%'/);
    assert.match(canalSqlFor("casa", "sales"), /NOT LIKE '%comisionista%'/);
    const slots = resolveCommercialTrendSlots("¿Y COMISIONISTAS?", { active_range_days: 90, active_channel: "casa" });
    assert.equal(slots.channel, "comisionista");
    assert.equal(slots.range_days, 90);
  });

  it("top-6 por |delta| con los mismos tipos que el dashboard", () => {
    const top = selectTopMovers(
      [
        { cliente: "ACME", venta_ton: 20 },
        { cliente: "BETA", venta_ton: 5 },
        { cliente: "NUEVO", venta_ton: 3 },
      ],
      [
        { cliente: "ACME", venta_ton: 10 },
        { cliente: "BETA", venta_ton: 12 },
        { cliente: "VIEJO", venta_ton: 4 },
      ]
    );
    assert.equal(top.length, 4);
    assert.equal(top[0].cliente, "ACME");
    assert.equal(top[0].tipo, "aumento");
    assert.equal(top.find((x) => x.cliente === "BETA").tipo, "disminucion");
    assert.equal(top.find((x) => x.cliente === "NUEVO").tipo, "nuevo");
    assert.equal(top.find((x) => x.cliente === "VIEJO").tipo, "perdido");
  });
});

describe("parity engine / dashboard adapter / Director IA pack", () => {
  it("mismo fixture/rango/canal coincide en fechas, venta_ton, slope, top-6 y n", async () => {
    const engine = engineFromFixture({ range: "3m", canal: "casa" });
    const dash = toVentaSerieHttpBody(engine, "Puebla");
    const pack = await loadCommercialTrendForChat(
      { connect: async () => ({ release() {} }) },
      1,
      { dashboardAuth: { role: "ZP" } },
      {
        question: "¿Cómo vamos en CASA los últimos 3 meses?",
        resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "PUE" }),
        loadCommercialTrend: async () => engine,
      }
    );

    assert.equal(dash.fecha_desde, engine.fecha_desde);
    assert.equal(dash.fecha_hasta, engine.fecha_hasta);
    assert.deepEqual(
      dash.points.map((p) => p.fecha),
      engine.points.map((p) => p.fecha)
    );
    assert.deepEqual(
      dash.points.map((p) => p.venta_ton),
      engine.points.map((p) => p.venta_ton)
    );
    assert.equal(dash.trend.slope, engine.trend.slope);
    assert.equal(dash.trend.observation_count, engine.observation_count);
    assert.deepEqual(
      (dash.clientes_top || []).map((c) => ({ c: c.cliente, d: c.delta_ton, t: c.tipo })),
      engine.clientes_top.map((c) => ({ c: c.cliente, d: c.delta_ton, t: c.tipo }))
    );

    assert.equal(pack.ok, true);
    assert.equal(pack.range_days, 90);
    assert.equal(pack.channel, "casa");
    assert.equal(pack.range_start, engine.fecha_desde);
    assert.equal(pack.range_end, engine.fecha_hasta);
    assert.deepEqual(
      pack.daily_series.map((p) => p.fecha),
      engine.points.map((p) => p.fecha)
    );
    assert.deepEqual(
      pack.daily_series.map((p) => p.venta_ton),
      engine.points.map((p) => p.venta_ton)
    );
    assert.equal(pack.ols.slope, engine.trend.slope);
    assert.equal(pack.observation_count, engine.observation_count);
    assert.deepEqual(
      pack.top_movers.map((c) => ({ c: c.cliente, d: c.delta_ton })),
      engine.clientes_top.map((c) => ({ c: c.cliente, d: c.delta_ton }))
    );
    assert.equal(pack.provenance.comments_included, false);
    assert.equal(JSON.stringify(engine).includes("cliente_nombre"), false);
  });
});

describe("commercial_trend conversation", () => {
  it("es inheritable y CASA 90d → COMISIONISTAS hereda rango", () => {
    assert.ok(INHERITABLE_INTENTS.includes("commercial_trend"));
    const t1 = resolve("¿Cómo vamos en CASA los últimos 3 meses?", emptyLike());
    assert.equal(t1.detected_intent, "commercial_trend");
    const slots1 = resolveCommercialTrendSlots("¿Cómo vamos en CASA los últimos 3 meses?");
    assert.equal(slots1.range_days, 90);
    assert.equal(slots1.channel, "casa");

    const t2 = resolve("¿Y COMISIONISTAS?", echoTrend());
    assert.equal(t2.inherit, true);
    assert.equal(t2.inherit_parent_intent, "commercial_trend");
    const slots2 = resolveCommercialTrendSlots("¿Y COMISIONISTAS?", {
      active_range_days: 90,
      active_channel: "casa",
    });
    assert.equal(slots2.range_days, 90);
    assert.equal(slots2.channel, "comisionista");
    assert.equal(classifyTurnKind("¿Y COMISIONISTAS?"), "channel_switch");
  });

  it("Compáralos pide ambos canales mismo rango; movers no son causa", () => {
    const t3 = resolve("Compáralos.", echoTrend({ active_channel: "comisionista" }));
    assert.equal(t3.inherit, true);
    const slots = resolveCommercialTrendSlots("Compáralos.", {
      active_range_days: 90,
      active_channel: "comisionista",
    });
    assert.equal(slots.range_days, 90);
    assert.equal(slots.channel, "both");
    assert.equal(slots.compare, true);
    assert.match(COMMERCIAL_TREND_SYSTEM_ADDENDUM, /Mover != causa/);
    assert.match(COMMERCIAL_TREND_SYSTEM_ADDENDUM, /contribuye al movimiento/);
  });

  it("quién explica / háblame del primero heredan el hilo", () => {
    const t4 = resolve("¿Quién explica más la caída?", echoTrend());
    assert.equal(t4.inherit, true);
    const t5 = resolve("Háblame del primero.", echoTrend());
    assert.equal(t5.inherit, true);
  });
});

function emptyLike() {
  return {
    parent_intent: null,
    planta_id: 1,
    active_entities: [],
    last_evidence_bundle_type: null,
    active_range_days: null,
    active_channel: null,
  };
}

describe("commercial_trend partial + tool + endpoint delegation", () => {
  it("0 filas no se convierte en cero de tendencia", async () => {
    const empty = assembleCommercialTrend({
      plant_code: "X",
      range: "1m",
      canal: "casa",
      fecha_desde: "2026-07-26",
      fecha_hasta: "2026-08-24",
      salesRows: [],
      discountRows: [],
      cliCurRows: [],
      cliPrevRows: [],
    });
    assert.equal(empty.points.length, 0);
    assert.equal(empty.trend.direction, "INSUFFICIENT_DATA");
    assert.equal(empty.period_total, 0);
  });

  it("declara tool read-only sin comments", () => {
    const tool = getDirectorIaTool("get_commercial_trend");
    assert.ok(tool);
    assert.equal(tool.readOnly, true);
    assert.match(tool.limitations, /sin comments/i);
    assert.equal(tool.executor, "loadCommercialTrendForChat");
  });

  it("server.js delega GET /api/arr/venta-serie al motor compartido", () => {
    const src = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
    assert.match(src, /commercialTrendEngine\.loadCommercialTrend/);
    assert.match(src, /toVentaSerieHttpBody/);
    assert.match(src, /lib\/commercial-trend-engine/);
  });

  it("prompt prohíbe causalidad y first-vs-last", () => {
    const p = buildCommercialTrendPrompt(engineFromFixture(), "¿Quién explica más la caída?");
    assert.match(p.systemPrompt, /no demuestra la causa|Mover != causa/);
    assert.match(p.systemPrompt, /No uses first vs last/);
  });
});

describe("askDirectorIa commercial_trend", () => {
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
      loadCommercialTrendForChat: undefined,
      loadDailyExecutiveBriefForChat: undefined,
      loadPlantDiagnosisForChat: undefined,
      loadFinancialDiagnosisForChat: undefined,
    });
  });

  it("CASA 90d → COMISIONISTAS requery → compare; GPT ve movers != causa", async () => {
    const engineCasa = engineFromFixture({ canal: "casa" });
    const engineComi = engineFromFixture({
      canal: "comisionista",
      salesRows: [
        { fecha: "2026-05-27", venta_ton: 3 },
        { fecha: "2026-08-24", venta_ton: 4 },
      ],
      cliCurRows: [{ cliente: "ZETA", venta_ton: 8 }],
      cliPrevRows: [{ cliente: "ZETA", venta_ton: 1 }],
    });
    let loads = 0;
    const reqs = [];
    configureDirectorIaChat({
      pool: { connect: async () => ({ release() {} }) },
      openaiChat: async (sys, user) => {
        reqs.push({ sys, user });
        return "CASA baja por pendiente OLS. El mayor mover contribuye; no es la causa.";
      },
      loadCommercialTrendForChat: async (_p, _id, _req, opts) => {
        loads += 1;
        return loadCommercialTrendForChat(
          { connect: async () => ({ release() {} }) },
          1,
          { dashboardAuth: { role: "ZP" } },
          {
            ...opts,
            resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "PUE" }),
            loadCommercialTrend: async (_c, args) =>
              args.canal === "comisionista" ? engineComi : engineCasa,
          }
        );
      },
      loadPlantDiagnosisForChat: async () => {
        throw new Error("plant_diagnosis no debe correr");
      },
      loadFinancialDiagnosisForChat: async () => {
        throw new Error("financial_diagnosis no debe correr");
      },
    });

    const req = { dashboardAuth: { role: "ZP" }, body: {} };
    const t1 = await askDirectorIa(req, 1, "¿Cómo vamos en CASA los últimos 3 meses?");
    assert.equal(t1.ok, true);
    assert.equal(t1.context_meta.mode, "commercial_trend");
    assert.equal(t1.context_meta.conversation_state.parent_intent, "commercial_trend");
    assert.equal(t1.context_meta.conversation_state.active_range_days, 90);
    assert.equal(t1.context_meta.conversation_state.active_channel, "casa");
    assert.equal(t1.commercial_trend.ols.slope, engineCasa.trend.slope);

    const t2 = await askDirectorIa(
      { ...req, body: { conversation_state: t1.context_meta.conversation_state } },
      1,
      "¿Y COMISIONISTAS?"
    );
    assert.equal(t2.ok, true);
    assert.equal(t2.context_meta.mode, "commercial_trend");
    assert.equal(t2.context_meta.conversation_state.active_range_days, 90);
    assert.equal(t2.context_meta.conversation_state.active_channel, "comisionista");

    const t3 = await askDirectorIa(
      { ...req, body: { conversation_state: t2.context_meta.conversation_state } },
      1,
      "Compáralos."
    );
    assert.equal(t3.ok, true);
    assert.equal(t3.commercial_trend.compare, true);
    assert.ok(t3.commercial_trend.channels.casa);
    assert.ok(t3.commercial_trend.channels.comisionista);
    assert.equal(t3.commercial_trend.channels.casa.range_start, engineCasa.fecha_desde);
    assert.equal(t3.commercial_trend.channels.comisionista.range_start, engineComi.fecha_desde);

    const t4 = await askDirectorIa(
      { ...req, body: { conversation_state: t3.context_meta.conversation_state } },
      1,
      "¿Quién explica más la caída?"
    );
    assert.equal(t4.ok, true);
    assert.equal(t4.context_meta.mode, "commercial_trend");

    const t5 = await askDirectorIa(
      { ...req, body: { conversation_state: t4.context_meta.conversation_state } },
      1,
      "Háblame del primero."
    );
    assert.equal(t5.ok, true);
    assert.ok(t5.context_meta.conversation_state.active_entities[0]);
    assert.ok(loads >= 5);
    assert.match(reqs[0].sys, /Mover != causa|contribuye al movimiento/);
  });

  it("preserva daily executive brief", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Brief diario intacto.",
      loadDailyExecutiveBriefForChat: async () => ({
        ok: true,
        plant: { planta_id: 1, planta_nombre: "Puebla" },
        target_date: "2026-08-19",
        today_ymd: "2026-08-20",
        sales: { available: true, assembled: { detection: { target_date: "2026-08-19" } }, limitations: [] },
        discount: { available: true, assembled: { detection: { target_date: "2026-08-19" } }, limitations: [] },
        brief_limitations: [],
        information_gaps: { sales: [], discount: [] },
        provenance: {},
        partial: false,
        assembly_status: "ok",
      }),
      loadCommercialTrendForChat: async () => {
        throw new Error("commercial_trend no debe correr en brief");
      },
    });
    const t = await askDirectorIa({ dashboardAuth: { role: "ZP" }, body: {} }, 1, "¿Cómo nos fue ayer?");
    assert.equal(t.ok, true);
    assert.equal(t.context_meta.mode, "daily_executive_brief");
  });
});
