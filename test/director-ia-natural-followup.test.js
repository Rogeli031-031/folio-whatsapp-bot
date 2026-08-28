"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion, detectDirectorIaIntent } = require("../lib/director-ia-planner");
const {
  classifyTurnKind,
  extractEntityHint,
  resolveConversationTurn,
  resolveUniqueEntity,
} = require("../lib/director-ia-conversation-state");
const { computeDailySalesDeviationFromRows, assembleDailySalesDeviationEvidence } = require("../lib/director-ia-daily-deviation");

const ROOT = path.join(__dirname, "..");
const LIB_DIR = path.join(ROOT, "lib");

const HOLDOUT_PHRASES = [
  "No te seguí",
  "¿En qué sentido?",
  "¿Me explicas mejor?",
  "¿Qué otra cosa ves?",
  "¿Y después?",
  "¿O sea?",
  "¿Qué quieres decir con eso?",
  "No me cuadró",
  "¿Y eso implica qué?",
  "Explícamelo otra vez",
];

const PRODUCTION_ROUTING_FILES = [
  "director-ia-conversation-state.js",
  "director-ia-chat.js",
  "director-ia-planner.js",
  "director-ia-tools.js",
  "director-ia-daily-deviation.js",
  "director-ia-persistent-memory.js",
  "director-ia-capabilities.js",
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

function assembledArturo(over = {}) {
  const latest =
    over.responsible === undefined
      ? null
      : over.responsible
        ? { responsable: over.responsible, public_code: "D-1" }
        : null;
  return {
    ok: true,
    abort: false,
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    alignment: { status: "comparable", note: "ok", igf_period: "2026-02", arr_period: "2026-02", commercial_state_period: "2026-02" },
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
              latest_action: latest,
            },
            ...(over.extraClients || []),
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
      igf: srcBlock("igf.compromiso_lines", {
        status: over.igfStatus || "SOURCE_AVAILABLE",
        payload: { composition: { ok: true, lines: [] } },
      }),
    },
    ...over.assembled,
  };
}

function dailyRows() {
  return [
    { fecha: "2026-08-19", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 100 },
    { fecha: "2026-08-19", cliente_norm: "BETA", canal: "Casa", subcanal: "", kg: 50 },
    { fecha: "2026-08-12", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 200 },
    { fecha: "2026-08-12", cliente_norm: "BETA", canal: "Casa", subcanal: "", kg: 50 },
    { fecha: "2026-08-05", cliente_norm: "ARTURO", canal: "Casa", subcanal: "", kg: 200 },
    { fecha: "2026-08-05", cliente_norm: "BETA", canal: "Casa", subcanal: "", kg: 40 },
  ];
}

function assembledDaily() {
  const computed = computeDailySalesDeviationFromRows(dailyRows(), {
    todayYmd: "2026-08-20",
    targetDate: "2026-08-19",
  });
  return assembleDailySalesDeviationEvidence({
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
    planta_id: 1,
    computed,
    comments: [],
    actions: [],
  });
}

function plantState(over = {}) {
  return {
    parent_intent: "plant_diagnosis",
    planta_id: 1,
    active_entities: over.active_entities || [],
    last_evidence_bundle_type: "plant_diagnosis",
    pending_information_gap: over.pending_information_gap || null,
    active_date: null,
  };
}

function historyFromTurns(turns) {
  const out = [];
  for (const t of turns) {
    out.push({ role: "user", content: t.q });
    if (t.a) out.push({ role: "assistant", content: t.a });
  }
  return out;
}

describe("strategy B — inherit unknown with valid context", () => {
  it("unknown + parent válido hereda; isolated unknown sin estado clarifica", () => {
    const inherit = resolveConversationTurn({
      question: "foobar contexto abierto",
      plantaId: 1,
      echoedState: plantState(),
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(inherit.inherit, true);
    assert.equal(inherit.inherit_parent_intent, "plant_diagnosis");
    assert.equal(inherit.unknown_needs_clarification, false);

    const lonely = resolveConversationTurn({
      question: "foobar contexto abierto",
      history: [],
      plantaId: 1,
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(lonely.inherit, false);
    assert.equal(lonely.unknown_needs_clarification, true);
  });

  it("standalone gana sobre herencia", () => {
    const cases = [
      ["¿Cómo va el presupuesto esta semana?", "budget_status"],
      ["¿Qué tiene Taller AT-15?", "taller_at"],
      ["¿Cómo va Querétaro?", "plant_diagnosis"],
      ["¿Por qué bajó la venta ayer?", "daily_sales_deviation"],
      ["¿Cómo va el IGF?", "igf_status"],
      ["¿Qué acciones están vencidas?", "overdue_actions"],
    ];
    for (const [question, intent] of cases) {
      assert.equal(planDirectorIaQuestion(question).intent, intent, question);
      const turn = resolveConversationTurn({
        question,
        plantaId: 1,
        echoedState: plantState(),
        detectIntent: detectDirectorIaIntent,
      });
      assert.equal(turn.standalone, true, question);
      assert.equal(turn.inherit, false, question);
    }
  });

  it("topic switch no hereda", () => {
    const turn = resolveConversationTurn({
      question: "Hablemos de mantenimiento",
      plantaId: 1,
      echoedState: plantState(),
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(turn.kind, "topic_return");
    assert.equal(turn.inherit, false);
  });
});

describe("entity safety — no phrasebook de follow-up", () => {
  it("demostrativos no son clientes; pronombre no inventa nombre", () => {
    assert.equal(extractEntityHint("¿Y eso?"), null);
    assert.equal(extractEntityHint("¿Y esto?"), null);
    assert.equal(extractEntityHint("¿Y aquello?"), null);
    assert.equal(extractEntityHint("¿Y él?"), null);
    assert.equal(extractEntityHint("¿Y ella?"), null);
    assert.equal(extractEntityHint("¿Y ese cliente?"), null);
    assert.equal(extractEntityHint("¿Y después?"), null);
    assert.equal(classifyTurnKind("¿Y eso?"), "other");
    assert.equal(classifyTurnKind("¿Y él?"), "pronoun");
    assert.equal(classifyTurnKind("¿Y Arturo?"), "entity_intro");
    assert.equal(extractEntityHint("¿Y Arturo?"), "Arturo");
  });

  it("pronombre con parent hereda hint de active_entity; sin ella no inventa", () => {
    const withEntity = resolveConversationTurn({
      question: "¿Y él?",
      plantaId: 1,
      echoedState: plantState({
        active_entities: [{ display: "Arturo Lopez", cliente_key: "puebla|arturo" }],
      }),
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(withEntity.inherit, true);
    assert.equal(withEntity.entity_hint, "Arturo Lopez");

    const without = resolveConversationTurn({
      question: "¿Y él?",
      plantaId: 1,
      echoedState: plantState(),
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(without.inherit, true);
    assert.equal(without.entity_hint, null);
  });

  it("nombre propio único vs ambiguo sin fuzzy", () => {
    const unique = resolveUniqueEntity("Arturo", [
      { display: "Arturo Lopez", cliente_keys: ["a1"] },
      { display: "NullCo", cliente_keys: ["n1"] },
    ]);
    assert.equal(unique.status, "unique");
    const amb = resolveUniqueEntity("Arturo", [
      { display: "Arturo Lopez", cliente_keys: ["a1"] },
      { display: "Arturo Perez", cliente_keys: ["a2"] },
    ]);
    assert.equal(amb.status, "ambiguous");
    const none = resolveUniqueEntity("Art", [{ display: "Arturo Lopez", cliente_keys: ["a1"] }]);
    assert.equal(none.status, "none");
  });
});

describe("askDirectorIa natural follow-up inherit", () => {
  let askDirectorIa;
  let configureDirectorIaChat;
  const PUEBLA_CATALOG = [{ planta_id: 1, nombre: "Puebla", clave: "E7" }];

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
    configureDirectorIaChat({ plantCatalog: PUEBLA_CATALOG });
  });

  afterEach(() => {
    configureDirectorIaChat({
      pool: null,
      openaiChat: undefined,
      loadPlantDiagnosisForChat: undefined,
      loadFinancialDiagnosisForChat: undefined,
      loadDailySalesDeviationForChat: undefined,
      loadPresupuestoSemanalForChat: undefined,
      loadTallerAtForChat: undefined,
      resolveConversationCandidates: undefined,
      persistentMemoryStore: null,
      loadActionPersonBoardForChat: undefined,
      plantCatalog: PUEBLA_CATALOG,
    });
  });

  async function runTurn(question, opts = {}) {
    const history = opts.history || [];
    const userMsg = { role: "user", content: question };
    return askDirectorIa(
      {
        body: {
          history: [...history, userMsg],
          conversation_state: opts.conversation_state || undefined,
        },
        dashboardAuth: { role: "ZP" },
      },
      opts.plantaId == null ? 1 : opts.plantaId,
      question
    );
  }

  it("unknown con estado válido hereda, requería evidencia y llama GPT", async () => {
    let loads = 0;
    let lastUser = "";
    configureDirectorIaChat({
      pool: {},
      openaiChat: async (_sys, user) => {
        lastUser = user;
        return "Lectura abierta del hilo con pack fresco.";
      },
      loadPlantDiagnosisForChat: async () => {
        loads += 1;
        return assembledArturo();
      },
    });
    const first = await runTurn("¿Cómo va Puebla?");
    assert.equal(first.context_meta.mode, "plant_diagnosis");
    const follow = await runTurn("foobar contexto abierto", {
      history: historyFromTurns([{ q: "¿Cómo va Puebla?", a: first.answer }]),
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(follow.ok, true);
    assert.equal(follow.context_meta.mode, "plant_diagnosis");
    assert.equal(follow.context_meta.openai_called, true);
    assert.equal(loads, 2);
    assert.equal(follow.answer, "Lectura abierta del hilo con pack fresco.");
    assert.match(lastUser, /HILO/);
    assert.match(lastUser, /foobar contexto abierto/);
    assert.doesNotMatch(follow.answer, /Action Register para responder esa pregunta/);
  });

  it("unknown sin estado clarifica y no cae a Action Register", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => {
        throw new Error("OpenAI no debe llamarse");
      },
      loadPlantDiagnosisForChat: async () => {
        throw new Error("plant_diagnosis no debe correr");
      },
    });
    const unknown = await runTurn("frase suelta sin ancla ni intent");
    assert.equal(unknown.ok, true);
    assert.equal(unknown.context_meta.requires_clarification, true);
    assert.doesNotMatch(unknown.answer, /Action Register para responder esa pregunta/);
  });

  it("standalone presupuesto y Taller AT ganan; follow-up posterior no hereda Puebla", async () => {
    let plantLoads = 0;
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Diagnóstico de planta.",
      loadPlantDiagnosisForChat: async () => {
        plantLoads += 1;
        return assembledArturo();
      },
      loadPresupuestoSemanalForChat: async () => ({
        ok: true,
        found: true,
        planta_id: 1,
        planta_nombre: "Puebla",
        semana_inicio: "2026-08-17",
        semana_fin: "2026-08-23",
        asignado: 1,
        seleccionado: 0,
        disponible: 1,
        folios: [],
      }),
      loadTallerAtForChat: async () => ({
        ok: true,
        planta_id: 1,
        planta_nombre: "Puebla",
        unidades: ["AT-15"],
        periodo: { mes_desde: "2026-08", mes_hasta: "2026-08" },
        count: 1,
        total: 10,
        records: [{ unidad: "AT-15", numero_folio: "F-1", concepto: "refaccion", importe: 10, estatus: "ABIERTO" }],
      }),
    });
    const plant = await runTurn("¿Cómo va Puebla?");
    const hist = historyFromTurns([{ q: "¿Cómo va Puebla?", a: plant.answer }]);
    const budget = await runTurn("¿Cómo va el presupuesto esta semana?", {
      history: hist,
      conversation_state: plant.context_meta.conversation_state,
    });
    assert.equal(budget.context_meta.mode, "presupuesto_semanal");
    assert.equal(budget.context_meta.conversation_state.parent_intent, null);
    assert.equal(plantLoads, 1);

    const afterBudget = await runTurn("¿Y eso?", {
      history: [...hist, { role: "user", content: "¿Cómo va el presupuesto esta semana?" }, { role: "assistant", content: budget.answer }],
      conversation_state: budget.context_meta.conversation_state,
    });
    assert.equal(afterBudget.context_meta.requires_clarification, true);
    assert.equal(plantLoads, 1);

    const taller = await runTurn("¿Qué tiene Taller AT-15?", {
      history: hist,
      conversation_state: plant.context_meta.conversation_state,
    });
    assert.equal(taller.context_meta.mode, "taller_at");
    assert.equal(taller.context_meta.conversation_state.parent_intent, null);
    assert.equal(plantLoads, 1);
  });

  it("¿Y eso? no crea entidad; GPT interpreta", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Síntesis del pack, no un cliente llamado eso.",
      loadPlantDiagnosisForChat: async () => assembledArturo(),
    });
    const first = await runTurn("¿Cómo va Puebla?");
    const eso = await runTurn("¿Y eso?", {
      history: historyFromTurns([{ q: "¿Cómo va Puebla?", a: first.answer }]),
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(eso.context_meta.mode, "plant_diagnosis");
    assert.equal(eso.context_meta.openai_called, true);
    assert.notEqual(eso.context_meta.mode, "entity_clarification");
    assert.equal((eso.context_meta.conversation_state.active_entities || []).length, 0);
    assert.equal(eso.answer, "Síntesis del pack, no un cliente llamado eso.");
  });

  it("¿Y él? usa active_entity; sin ella clarifica", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Hechos de Arturo Lopez en evidencia fresca.",
      loadPlantDiagnosisForChat: async () => assembledArturo(),
    });
    const first = await runTurn("¿Cómo va Puebla?");
    const hist = historyFromTurns([{ q: "¿Cómo va Puebla?", a: first.answer }]);
    const withEntity = await runTurn("¿Y él?", {
      history: hist,
      conversation_state: {
        ...first.context_meta.conversation_state,
        active_entities: [{ display: "Arturo Lopez", cliente_key: "puebla|arturo", cliente_keys: ["puebla|arturo"] }],
      },
    });
    assert.equal(withEntity.context_meta.mode, "plant_diagnosis");
    assert.equal(withEntity.context_meta.conversation_state.active_entities[0].display, "Arturo Lopez");

    const noEntity = await runTurn("¿Y él?", {
      history: hist,
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(noEntity.context_meta.mode, "entity_clarification");
    assert.equal(noEntity.context_meta.openai_called, false);
  });

  it("¿Y Arturo? único vs ambiguo", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Arturo observado.",
      loadPlantDiagnosisForChat: async () => assembledArturo(),
    });
    const first = await runTurn("¿Cómo va Puebla?");
    const hist = historyFromTurns([{ q: "¿Cómo va Puebla?", a: first.answer }]);
    const unique = await runTurn("¿Y Arturo?", {
      history: hist,
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(unique.context_meta.conversation_state.active_entities[0].display, "Arturo Lopez");

    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "no",
      loadPlantDiagnosisForChat: async () =>
        assembledArturo({
          extraClients: [
            { cliente_display: "Arturo Perez", cliente_keys: ["puebla|arturo2"], coverage_status: "coverage_unknown" },
          ],
        }),
    });
    const amb = await runTurn("¿Y Arturo?", {
      history: hist,
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(amb.context_meta.mode, "entity_clarification");
    assert.equal(amb.context_meta.conversation_state.active_entities.length, 0);
  });

  it("conversación planta hold-out: inherit + requery + GPT", async () => {
    let loads = 0;
    const seen = [];
    configureDirectorIaChat({
      pool: {},
      openaiChat: async (_sys, user) => {
        seen.push(user);
        return `GPT-${seen.length}`;
      },
      loadPlantDiagnosisForChat: async () => {
        loads += 1;
        return assembledArturo();
      },
    });
    let prev = await runTurn("¿Cómo va Puebla?");
    const plantHoldouts = ["No te seguí", "¿En qué sentido?", "¿Qué otra cosa ves?", "¿Y después?"];
    let hist = historyFromTurns([{ q: "¿Cómo va Puebla?", a: prev.answer }]);
    for (const q of plantHoldouts) {
      const result = await runTurn(q, { history: hist, conversation_state: prev.context_meta.conversation_state });
      assert.equal(result.context_meta.mode, "plant_diagnosis", q);
      assert.equal(result.context_meta.openai_called, true, q);
      assert.match(result.answer, /^GPT-/);
      hist = [...hist, { role: "user", content: q }, { role: "assistant", content: result.answer }];
      prev = result;
    }
    assert.equal(loads, 1 + plantHoldouts.length);
    const lastUser = seen[seen.length - 1];
    assert.match(lastUser, /HILO/);
    assert.match(lastUser, /Y después/);
  });

  it("conversación diaria hold-out preserva intent y fecha", async () => {
    let loads = 0;
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Desviación diaria con pack fresco.",
      loadDailySalesDeviationForChat: async () => {
        loads += 1;
        return assembledDaily();
      },
      loadPlantDiagnosisForChat: async () => {
        throw new Error("plant_diagnosis no debe correr");
      },
      loadFinancialDiagnosisForChat: async () => {
        throw new Error("financial_diagnosis no debe correr");
      },
    });
    let prev = await runTurn("¿Por qué bajó la venta ayer?");
    assert.equal(prev.context_meta.mode, "daily_sales_deviation");
    let hist = historyFromTurns([{ q: "¿Por qué bajó la venta ayer?", a: prev.answer }]);
    for (const q of ["¿O sea?", "¿Qué otra cosa ves?", "¿Y después?"]) {
      const result = await runTurn(q, { history: hist, conversation_state: prev.context_meta.conversation_state });
      assert.equal(result.context_meta.mode, "daily_sales_deviation", q);
      assert.equal(result.context_meta.conversation_state.active_date, "2026-08-19", q);
      assert.equal(result.context_meta.openai_called, true, q);
      hist = [...hist, { role: "user", content: q }, { role: "assistant", content: result.answer }];
      prev = result;
    }
    assert.equal(loads, 4);
  });

  it("conversación entidad: Arturo / él / hold-out sin inventar cliente", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Continuación sobre Arturo Lopez.",
      loadPlantDiagnosisForChat: async () => assembledArturo(),
    });
    const first = await runTurn("¿Cómo va Puebla?");
    const hist0 = historyFromTurns([{ q: "¿Cómo va Puebla?", a: first.answer }]);
    const named = await runTurn("¿Y Arturo?", {
      history: hist0,
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(named.context_meta.conversation_state.active_entities[0].display, "Arturo Lopez");
    const hist1 = [...hist0, { role: "user", content: "¿Y Arturo?" }, { role: "assistant", content: named.answer }];
    const pronoun = await runTurn("¿Y él?", {
      history: hist1,
      conversation_state: named.context_meta.conversation_state,
    });
    assert.equal(pronoun.context_meta.conversation_state.active_entities[0].display, "Arturo Lopez");
    const hold = await runTurn("No te seguí", {
      history: [...hist1, { role: "user", content: "¿Y él?" }, { role: "assistant", content: pronoun.answer }],
      conversation_state: pronoun.context_meta.conversation_state,
    });
    assert.equal(hold.context_meta.mode, "plant_diagnosis");
    assert.equal(hold.context_meta.openai_called, true);
    assert.equal(hold.context_meta.conversation_state.active_entities[0].display, "Arturo Lopez");
  });

  it("plant switch no filtra Arturo/Puebla en ¿Y él?", async () => {
    const plantsLoaded = [];
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Diagnóstico.",
      loadPlantDiagnosisForChat: async (_pool, plantaId) => {
        plantsLoaded.push(plantaId);
        if (Number(plantaId) === 2) {
          return {
            ...assembledArturo(),
            plant: { planta_id: 2, planta_nombre: "Querétaro", plant_code: "E8" },
            commercial_materiality: { categories: [{ top_clients: [] }] },
          };
        }
        return assembledArturo();
      },
    });
    const first = await runTurn("¿Cómo va Puebla?");
    const named = await runTurn("¿Y Arturo?", {
      history: historyFromTurns([{ q: "¿Cómo va Puebla?", a: first.answer }]),
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(named.context_meta.conversation_state.active_entities[0].display, "Arturo Lopez");
    const loadsAfterNamed = plantsLoaded.length;
    const switched = await runTurn("Ahora Querétaro.", {
      plantaId: 2,
      history: historyFromTurns([
        { q: "¿Cómo va Puebla?", a: first.answer },
        { q: "¿Y Arturo?", a: named.answer },
      ]),
      conversation_state: named.context_meta.conversation_state,
    });
    assert.equal(switched.context_meta.requires_clarification, true);
    const pronoun = await runTurn("¿Y él?", {
      plantaId: 2,
      history: historyFromTurns([
        { q: "¿Cómo va Puebla?", a: first.answer },
        { q: "¿Y Arturo?", a: named.answer },
        { q: "Ahora Querétaro.", a: switched.answer },
      ]),
      conversation_state: switched.context_meta.conversation_state,
    });
    assert.notEqual(pronoun.context_meta.mode, "plant_diagnosis");
    assert.equal((pronoun.context_meta.conversation_state.active_entities || []).length, 0);
    assert.equal(plantsLoaded.slice(loadsAfterNamed).includes(1), false);
  });

  it("hold-outs adicionales heredan por contexto, no por catálogo", async () => {
    let loads = 0;
    configureDirectorIaChat({
      pool: {},
      openaiChat: async (_sys, user) => `OPEN:${user.slice(0, 24)}`,
      loadPlantDiagnosisForChat: async () => {
        loads += 1;
        return assembledArturo();
      },
    });
    const first = await runTurn("¿Cómo va Puebla?");
    const extra = ["¿Me explicas mejor?", "¿Qué quieres decir con eso?", "No me cuadró", "Explícamelo otra vez"];
    let prev = first;
    let hist = historyFromTurns([{ q: "¿Cómo va Puebla?", a: first.answer }]);
    for (const q of extra) {
      const result = await runTurn(q, { history: hist, conversation_state: prev.context_meta.conversation_state });
      assert.equal(result.context_meta.mode, "plant_diagnosis", q);
      assert.equal(result.context_meta.openai_called, true, q);
      hist = [...hist, { role: "user", content: q }, { role: "assistant", content: result.answer }];
      prev = result;
    }
    assert.equal(loads, 1 + extra.length);
  });
});

describe("hold-out generalization — no están en routing de producción", () => {
  it("los textos hold-out no están codificados en lib de routing", () => {
    const blobs = PRODUCTION_ROUTING_FILES.map((name) => {
      const full = path.join(LIB_DIR, name);
      return { name, src: fs.readFileSync(full, "utf8") };
    });
    for (const phrase of HOLDOUT_PHRASES) {
      for (const file of blobs) {
        assert.equal(
          file.src.includes(phrase),
          false,
          `${phrase} aparece en ${file.name}`
        );
      }
    }
    const stateSrc = blobs.find((f) => f.name === "director-ia-conversation-state.js").src;
    assert.doesNotMatch(stateSrc, /if \(text === /);
    assert.doesNotMatch(stateSrc, /contains\('qué más'\)/);
    assert.doesNotMatch(stateSrc, /score de an[aá]fora/i);
  });
});
