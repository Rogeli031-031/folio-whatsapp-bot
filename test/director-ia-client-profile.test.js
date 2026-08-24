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
const { buildClienteKey, getCanonicalPlantaId } = require("../lib/dicf-acciones");
const { getDirectorIaTool, validateDirectorIaToolRegistry } = require("../lib/director-ia-tools");
const {
  isClientProfileQuestion,
  defaultThreeMonths,
  discountPerKg,
  alignMonthlyRows,
  assembleClientProfilePack,
  deriveClienteKeys,
  loadClientProfileForChat,
  buildClientProfilePrompt,
  CLIENT_PROFILE_SYSTEM_ADDENDUM,
} = require("../lib/director-ia-client-profile");

const ROOT = path.join(__dirname, "..");
const PRODUCTION_ROUTING_FILES = [
  "director-ia-client-profile.js",
  "director-ia-planner.js",
  "director-ia-conversation-state.js",
  "director-ia-chat.js",
  "director-ia-tools.js",
];

const HOLDOUTS = [
  "Cuéntame cómo viene este cliente.",
  "¿Cómo se ha movido en estos meses?",
  "¿Qué historial comercial reciente tiene?",
  "¿Qué sabemos realmente de este cliente?",
];

function echoTrend(over = {}) {
  return {
    parent_intent: "commercial_trend",
    planta_id: 1,
    active_entities: over.active_entities || [
      {
        kind: "client",
        display: "ARTURO",
        cliente_key: deriveClienteKeys(1, "Casa", "", "ARTURO")[0],
        cliente_keys: deriveClienteKeys(1, "Casa", "", "ARTURO"),
      },
    ],
    last_evidence_bundle_type: "commercial_trend",
    pending_information_gap: null,
    active_date: null,
    active_range_days: 90,
    active_channel: "casa",
    previous_frame: null,
    ...over,
  };
}

function echoProfile(over = {}) {
  return {
    parent_intent: "client_profile",
    planta_id: 1,
    active_entities: [
      {
        kind: "client",
        display: "ARTURO",
        cliente_key: deriveClienteKeys(1, "Casa", "", "ARTURO")[0],
        cliente_keys: deriveClienteKeys(1, "Casa", "", "ARTURO"),
      },
    ],
    last_evidence_bundle_type: "client_profile",
    active_channel: "casa",
    active_period_months: ["2026-06", "2026-07", "2026-08"],
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

function sampleMonths() {
  return [
    { year: 2026, month: 6, yyyymm: "2026-06", completeness: "COMPLETE" },
    { year: 2026, month: 7, yyyymm: "2026-07", completeness: "COMPLETE" },
    { year: 2026, month: 8, yyyymm: "2026-08", completeness: "PARTIAL" },
  ];
}

describe("client_profile planner + routing", () => {
  it("top volume y named profile van a client_profile; trend planta no se roba", () => {
    assert.equal(detectDirectorIaIntent("¿Qué cliente de Puebla es el de mayor volumen?").intent, "client_profile");
    assert.equal(detectDirectorIaIntent("¿Qué sabemos de Arturo?").intent, "client_profile");
    assert.equal(
      detectDirectorIaIntent("¿Cómo se ha comportado Arturo estos 3 meses?").intent,
      "client_profile"
    );
    assert.equal(detectDirectorIaIntent("¿Cómo vamos en CASA los últimos 3 meses?").intent, "commercial_trend");
    assert.equal(planDirectorIaQuestion("análisis del cliente Acme").intent, "client_analysis");
    assert.equal(planDirectorIaQuestion("¿Qué sabemos comercialmente de Acme?").intent, "expediente_comercial");
  });

  it("holdouts generalizan sin estar hardcodeados en routing", () => {
    for (const h of HOLDOUTS) {
      assert.equal(isClientProfileQuestion(h, { hasActiveClient: true }), true, h);
      for (const file of PRODUCTION_ROUTING_FILES) {
        const src = fs.readFileSync(path.join(ROOT, "lib", file), "utf8");
        assert.equal(src.includes(h), false, `${file} no debe contener holdout: ${h}`);
      }
    }
  });

  it("action-person no se traga", () => {
    assert.notEqual(detectDirectorIaIntent("¿Qué acciones tiene Julio Pérez?").intent, "client_profile");
  });
});

describe("client_profile identity + math + period", () => {
  it("cliente_key se deriva; no usa nombre como join", () => {
    const keys = deriveClienteKeys(1, "Casa", "", "ARTURO");
    assert.ok(keys.includes(buildClienteKey(getCanonicalPlantaId(1), "Disminuyeron", "Casa", "", "ARTURO")));
    assert.ok(keys.every((k) => k.includes("|")));
  });

  it("default 3 meses: actual CDMX + 2 previos; actual PARTIAL", () => {
    const months = defaultThreeMonths(new Date("2026-08-24T18:00:00-06:00"));
    assert.deepEqual(
      months.map((m) => m.yyyymm),
      ["2026-06", "2026-07", "2026-08"]
    );
    assert.equal(months[2].completeness, "PARTIAL");
    assert.equal(months[0].completeness, "COMPLETE");
  });

  it("descuento es SUM(monto)/SUM(kg), no average-of-averages", () => {
    assert.equal(discountPerKg(30, 10), 3);
    assert.equal(discountPerKg(10, 0), null);
    const rows = alignMonthlyRows(
      sampleMonths(),
      new Map([
        ["2026-06", { kg: 10 }],
        ["2026-07", { kg: 20 }],
        ["2026-08", { kg: 5 }],
      ]),
      new Map([
        ["2026-06", { monto: 20 }],
        ["2026-07", { monto: 20 }],
        ["2026-08", { monto: 5 }],
      ]),
      new Set(["2026-06", "2026-07", "2026-08"]),
      new Set(["2026-06", "2026-07", "2026-08"])
    );
    assert.equal(rows[0].discount_per_kg, 2);
    assert.equal(rows[1].discount_per_kg, 1);
    assert.equal(rows[2].completeness, "PARTIAL");
  });

  it("missing != zero; income unsupported", () => {
    const rows = alignMonthlyRows(
      sampleMonths(),
      new Map([["2026-07", { kg: 8 }]]),
      new Map(),
      new Set(["2026-07"]),
      new Set()
    );
    assert.equal(rows[0].kg, null);
    assert.equal(rows[0].kg_status, "DATA_NOT_FOUND");
    assert.equal(rows[1].kg, 8);
    assert.equal(rows[2].kg, null);
    assert.equal(rows[0].income_status, "UNSUPPORTED_METRIC");
    assert.equal(rows[0].income_actual, null);

    const pack = assembleClientProfilePack({
      plant: { planta_id: 1, planta_nombre: "Puebla" },
      identity: {
        display_name: "ARTURO",
        cliente_norm: "ARTURO",
        canal: "Casa",
        subcanal: "",
        cliente_keys: deriveClienteKeys(1, "Casa", "", "ARTURO"),
      },
      months: sampleMonths(),
      salesRows: [{ month: "2026-07", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 8 }],
      discountRows: [],
      comments: [],
      actions: [],
      commentsQueried: true,
      actionsQueried: true,
    });
    assert.equal(pack.income.actual_supported, false);
    assert.equal(pack.action_register.supported, false);
    assert.ok(pack.limitations.includes("income_actual_unsupported"));
    assert.ok(pack.limitations.includes("action_register_has_no_cliente_key"));
    assert.equal(pack.provenance.name_join, false);
    assert.equal(pack.provenance.aligned_before_gpt, true);
  });

  it("comments y DICF solo por cliente_key", async () => {
    const keys = deriveClienteKeys(1, "Casa", "", "ARTURO");
    const pack = await loadClientProfileForChat(
      { connect: async () => ({ release() {} }) },
      1,
      { dashboardAuth: { role: "ZP" } },
      {
        question: "¿Qué sabemos de Arturo?",
        cliente_norm: "ARTURO",
        display_name: "ARTURO",
        cliente_keys: keys,
        identity_canal: "Casa",
        now: new Date("2026-08-24T18:00:00-06:00"),
        resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "PUE" }),
        resolvePlantCodes: async () => ({ not_found: false, uniqueCodes: ["PUE"], plantCode: "PUE" }),
        queryMonthlySales: async () => ({
          rows: [
            { month: "2026-06", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 10 },
            { month: "2026-07", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 30 },
            { month: "2026-08", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 5 },
          ],
        }),
        queryMonthlyDiscount: async () => ({
          rows: [
            { month: "2026-06", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", monto: 20 },
            { month: "2026-07", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", monto: 15 },
            { month: "2026-08", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", monto: 5 },
          ],
        }),
        queryCommentsByKeys: async (_c, plantaId, ks) => {
          assert.equal(plantaId, 1);
          assert.ok(ks.includes(keys[0]));
          return [{ id: 1, cliente_key: keys[0], body: "Competencia", author_name: "GA", created_at: "2026-07-02" }];
        },
        queryActionsByKeys: async (_c, _ids, ks) => {
          assert.ok(ks.includes(keys[0]));
          return [
            {
              id: 9,
              public_code: "D1",
              cliente_key: keys[0],
              descripcion: "Seguimiento",
              estado: "abierto",
              responsable: "Ana",
            },
          ];
        },
        queryHistorialForActions: async () =>
          new Map([[9, [{ evento: "creada", detalle: "alta", creado_en: "2026-07-03" }]]]),
      }
    );
    assert.equal(pack.ok, true);
    assert.equal(pack.identity.cliente_key, keys[0]);
    assert.equal(pack.monthly_rows[1].kg, 30);
    assert.equal(pack.monthly_rows[0].discount_per_kg, 2);
    assert.equal(pack.comments[0].cliente_key, keys[0]);
    assert.equal(pack.dicf_actions[0].cliente_key, keys[0]);
    assert.equal(pack.income.actual_supported, false);
    const prompt = buildClientProfilePrompt(pack, "¿Cuánto ingreso generó?");
    assert.match(prompt.systemPrompt, /NO está disponible/);
    assert.match(prompt.userContent, /UNSUPPORTED_METRIC/);
    assert.doesNotMatch(prompt.userContent, /income=0\b/);
  });

  it("top client empate no elige en silencio; cross-plant deny GA", async () => {
    const tie = await loadClientProfileForChat({}, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "¿Qué cliente de Puebla es el de mayor volumen?",
      now: new Date("2026-08-24T18:00:00-06:00"),
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla", clave: "PUE" }),
      resolvePlantCodes: async () => ({ not_found: false, uniqueCodes: ["PUE"], plantCode: "PUE" }),
      queryMonthlySales: async () => ({
        rows: [
          { month: "2026-06", cliente_norm: "A", canal: "Casa", subcanal: "", kg: 50 },
          { month: "2026-06", cliente_norm: "B", canal: "Casa", subcanal: "", kg: 50 },
        ],
      }),
      queryMonthlyDiscount: async () => ({ rows: [] }),
    });
    assert.equal(tie.needs_clarification, true);
    assert.equal(tie.clarification.status, "ambiguous");

    const denied = await loadClientProfileForChat({}, 9, { dashboardAuth: { role: "GA" } }, {});
    assert.equal(denied.abort, true);
    assert.equal(denied.code, "SOURCE_RESTRICTED");
  });
});

describe("client_profile handoff desde commercial_trend", () => {
  it("pronoun/action con cliente_key activo ya no rehereda trend", () => {
    assert.ok(INHERITABLE_INTENTS.includes("client_profile"));
    const t1 = resolve("¿Qué sabemos de él?", echoTrend());
    assert.equal(classifyTurnKind("¿Qué sabemos de él?"), "pronoun");
    assert.equal(t1.inherit, true);
    assert.equal(t1.inherit_parent_intent, "client_profile");
    assert.equal(t1.profile_handoff_from_trend, true);
    assert.notEqual(t1.inherit_parent_intent, "commercial_trend");

    const t2 = resolve("¿Tiene acciones?", echoTrend());
    assert.equal(t2.inherit_parent_intent, "client_profile");

    const t3 = resolve("¿Cómo ha comprado estos tres meses?", echoTrend());
    assert.equal(t3.inherit_parent_intent, "client_profile");

    const stay = resolve("¿Quién explica más la caída?", echoTrend());
    assert.equal(stay.inherit_parent_intent, "commercial_trend");
  });

  it("follow-ups del perfil conservan padre y no vuelven a trend", () => {
    for (const q of [
      "¿En qué mes compró más?",
      "¿En qué mes tuvo más descuento?",
      "¿Ese mes también compró más?",
      "¿Cuánto ingreso generó?",
      "¿Qué comentarios tenemos?",
      "¿Qué pasó con esas acciones?",
    ]) {
      const t = resolve(q, echoProfile());
      assert.equal(t.inherit_parent_intent, "client_profile", q);
      assert.notEqual(t.inherit_parent_intent, "commercial_trend", q);
    }
  });
});

describe("askDirectorIa client_profile", () => {
  let askDirectorIa;
  let configureDirectorIaChat;
  let loadCount;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({
      pool: null,
      openaiChat: undefined,
      loadClientProfileForChat: undefined,
      loadCommercialTrendForChat: undefined,
      loadDailyExecutiveBriefForChat: undefined,
      loadPlantDiagnosisForChat: undefined,
    });
  });

  it("CASA 90d → primero → qué sabemos de él carga perfil fresco", async () => {
    loadCount = 0;
    const keys = deriveClienteKeys(1, "Casa", "", "ARTURO");
    configureDirectorIaChat({
      pool: { connect: async () => ({ release() {} }) },
      openaiChat: async (sys) => {
        if (/PERFIL LONGITUDINAL|ingreso mensual actual/i.test(sys) || /NO está disponible/.test(sys)) {
          return "Perfil de ARTURO en 3 meses calendario. Ingreso actual no disponible.";
        }
        return "CASA baja. El primero es ARTURO; contribuye, no causa.";
      },
      loadCommercialTrendForChat: async () => ({
        ok: true,
        plant: { planta_id: 1, planta_nombre: "Puebla" },
        range_days: 90,
        channel: "casa",
        compare: false,
        first_mover: { cliente: "ARTURO", cliente_key: keys[0], cliente_keys: keys },
        top_movers: [{ cliente: "ARTURO", cliente_key: keys[0], cliente_keys: keys, delta_ton: -2 }],
        ols: { slope: -0.1, direction: "DOWN" },
        daily_series: [],
        limitations: [],
        assembly_status: "ok",
        provenance: {},
      }),
      loadClientProfileForChat: async (_p, _id, _req, opts) => {
        loadCount += 1;
        assert.ok(opts.cliente_key || (opts.cliente_keys && opts.cliente_keys.length));
        return {
          ok: true,
          identity: {
            cliente_key: keys[0],
            cliente_keys: keys,
            display_name: "ARTURO",
            plant: { planta_id: 1, planta_nombre: "Puebla" },
          },
          period: { months: ["2026-06", "2026-07", "2026-08"], markers: [] },
          monthly_rows: [
            {
              month: "2026-06",
              completeness: "COMPLETE",
              kg: 10,
              discount_per_kg: 2,
              income_actual: null,
              income_status: "UNSUPPORTED_METRIC",
            },
          ],
          trends: { engine: "monthly_buckets_not_ols" },
          comments: [],
          dicf_actions: [],
          action_register: { supported: false },
          income: { actual_supported: false, status: "UNSUPPORTED_METRIC" },
          limitations: ["income_actual_unsupported"],
          provenance: { join: "cliente_key", name_join: false, aligned_before_gpt: true },
          assembly_status: "ok",
          partial: true,
        };
      },
      loadPlantDiagnosisForChat: async () => {
        throw new Error("plant_diagnosis no debe correr");
      },
    });

    const req = { dashboardAuth: { role: "ZP" }, body: {} };
    const t1 = await askDirectorIa(req, 1, "¿Cómo vamos en CASA los últimos 3 meses?");
    assert.equal(t1.context_meta.mode, "commercial_trend");
    const t2 = await askDirectorIa(
      { ...req, body: { conversation_state: t1.context_meta.conversation_state } },
      1,
      "Háblame del primero."
    );
    assert.ok(t2.context_meta.conversation_state.active_entities[0].cliente_key);
    const t3 = await askDirectorIa(
      { ...req, body: { conversation_state: t2.context_meta.conversation_state } },
      1,
      "¿Qué sabemos de él?"
    );
    assert.equal(t3.ok, true);
    assert.equal(t3.context_meta.mode, "client_profile");
    assert.equal(t3.context_meta.conversation_state.parent_intent, "client_profile");
    assert.equal(t3.client_profile.income.actual_supported, false);
    assert.ok(loadCount >= 1);

    const t4 = await askDirectorIa(
      { ...req, body: { conversation_state: t3.context_meta.conversation_state } },
      1,
      "¿Cómo ha comprado estos tres meses?"
    );
    assert.equal(t4.context_meta.mode, "client_profile");
    assert.ok(loadCount >= 2);
  });

  it("preserva brief diario", async () => {
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
      loadClientProfileForChat: async () => {
        throw new Error("client_profile no debe correr en brief");
      },
    });
    const t = await askDirectorIa({ dashboardAuth: { role: "ZP" }, body: {} }, 1, "¿Cómo nos fue ayer?");
    assert.equal(t.ok, true);
    assert.equal(t.context_meta.mode, "daily_executive_brief");
  });

  it("tool read-only y registry válido", () => {
    const tool = getDirectorIaTool("get_client_profile");
    assert.equal(tool.executor, "loadClientProfileForChat");
    assert.equal(tool.readOnly, true);
    assert.match(CLIENT_PROFILE_SYSTEM_ADDENDUM, /comentario = declaración/i);
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, (reg.errors || []).join(", "));
  });
});
