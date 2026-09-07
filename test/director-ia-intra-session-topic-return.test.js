"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const mem = require("../lib/director-ia-persistent-memory");
const {
  classifyTurnKind,
  resolveConversationTurn,
  snapshotCurrentFrame,
  sanitizePreviousFrame,
  shouldCapturePrevious,
  resolveOutgoingPreviousFrame,
  reconstructFromUserHistory,
} = require("../lib/director-ia-conversation-state");
const { computeDailySalesDeviationFromRows, assembleDailySalesDeviationEvidence } = require("../lib/director-ia-daily-deviation");
const {
  computeDailyDiscountDeviationFromRows,
  assembleDailyDiscountDeviationEvidence,
} = require("../lib/director-ia-daily-discount");

const ROOT = path.join(__dirname, "..");
const STATE_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-conversation-state.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");

const FRAME_ALLOWED = new Set([
  "parent_intent",
  "planta_id",
  "active_entities",
  "last_evidence_bundle_type",
  "pending_information_gap",
  "active_date",
  "active_range_days",
  "active_channel",
  "active_period_months",
  "meeting_type",
  "active_subtopic",
]);

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
  const clients = over.clients || [
    {
      cliente_display: "Arturo Lopez",
      cliente_keys: ["puebla|arturo"],
      coverage_status: "coverage_unknown",
      has_dicf_action: false,
      latest_action: null,
    },
    ...(over.extraClients || []),
  ];
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
      categories: [{ top_clients: clients }],
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
        payload: { composition: { ok: true, lines: [] } },
      }),
    },
    ...over.assembled,
  };
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

function boardItems(over = {}) {
  const julioOpen = {
    id: 11,
    title: "Cerrar evidencia de Oficinas",
    tema: "Oficinas",
    responsable: "Julio Pérez",
    responsable_usuario_id: 44,
    due_date: "2026-08-01",
    closed: false,
  };
  const julioClosed = {
    id: 12,
    title: "Rotulación patio",
    tema: "Imagen Corporativa",
    responsable: "Julio Pérez",
    responsable_usuario_id: 44,
    due_date: "2026-07-01",
    closed: true,
  };
  const maria = {
    id: 21,
    title: "ERP fase 2",
    tema: "ERP",
    responsable: "María García",
    responsable_usuario_id: 55,
    due_date: "2026-09-01",
    closed: false,
  };
  if (over.single) return [julioOpen];
  if (over.many) return [julioOpen, julioClosed, maria];
  return [julioOpen, julioClosed, maria];
}

function budgetPayload() {
  return {
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
  };
}

function assertFrameShape(frame, label) {
  if (frame == null) return;
  assert.equal(typeof frame, "object", label);
  for (const key of Object.keys(frame)) {
    assert.ok(FRAME_ALLOWED.has(key), `${label} campo prohibido: ${key}`);
  }
  assert.equal(frame.evidence, undefined, label);
  assert.equal(frame.rows, undefined, label);
  assert.equal(frame.payload, undefined, label);
  assert.equal(frame.authz, undefined, label);
  assert.equal(frame.history, undefined, label);
  assert.equal(frame.topic_stack, undefined, label);
}

function historyFromTurns(turns) {
  const out = [];
  for (const t of turns) {
    out.push({ role: "user", content: t.q });
    if (t.a) out.push({ role: "assistant", content: t.a });
  }
  return out;
}

describe("precedencia standalone vs topic_return", () => {
  it("Volvamos a la venta de ayer es daily_sales_deviation 0.92 y no se descarta", () => {
    const detected = detectDirectorIaIntent("Volvamos a la venta de ayer.");
    assert.equal(detected.intent, "daily_sales_deviation");
    assert.equal(detected.confidence, 0.92);
    const turn = resolveConversationTurn({
      question: "Volvamos a la venta de ayer.",
      plantaId: 1,
      echoedState: {
        parent_intent: "plant_diagnosis",
        planta_id: 1,
        last_evidence_bundle_type: "plant_diagnosis",
      },
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(turn.kind, "topic_return");
    assert.equal(turn.standalone, true);
    assert.equal(turn.out_of_slice_clarify, false);
    assert.equal(turn.restore_previous, false);
  });

  it("presupuesto, descuento/kg y acción standalone se preservan con lenguaje de retorno", () => {
    const cases = [
      ["¿Cómo va el presupuesto esta semana?", "budget_status"],
      ["¿Por qué subió el descuento/kg ayer?", "daily_discount_deviation"],
      ["Retomemos la acción de Julio Pérez.", "action_status"],
    ];
    for (const [question, intent] of cases) {
      assert.equal(planDirectorIaQuestion(question).intent, intent, question);
      const turn = resolveConversationTurn({
        question,
        plantaId: 1,
        echoedState: {
          parent_intent: "plant_diagnosis",
          planta_id: 1,
          last_evidence_bundle_type: "plant_diagnosis",
        },
        detectIntent: detectDirectorIaIntent,
      });
      assert.equal(turn.standalone, true, question);
      assert.equal(turn.out_of_slice_clarify, false, question);
    }
  });
});

describe("un previous_frame — captura, reemplazo, sin stack", () => {
  it("captura current al cambiar de standalone y no en inherit", () => {
    const plant = {
      parent_intent: "plant_diagnosis",
      planta_id: 1,
      active_entities: [{ kind: "client", display: "Arturo Lopez", cliente_key: "puebla|arturo" }],
      last_evidence_bundle_type: "plant_diagnosis",
      pending_information_gap: { missing_fields: ["hecho"], why_blocks: "sin causa" },
    };
    assert.equal(shouldCapturePrevious(plant, "daily_sales_deviation"), true);
    assert.equal(shouldCapturePrevious(plant, "plant_diagnosis"), false);
    const outgoing = resolveOutgoingPreviousFrame(plant, "daily_sales_deviation", false);
    assert.equal(outgoing.parent_intent, "plant_diagnosis");
    assert.equal(outgoing.active_entities[0].display, "Arturo Lopez");
    assertFrameShape(outgoing, "capture");
    assert.equal(outgoing.rows, undefined);
  });

  it("cada switch reemplaza el único previous_frame", () => {
    const plant = snapshotCurrentFrame({
      parent_intent: "plant_diagnosis",
      planta_id: 1,
      active_entities: [],
      last_evidence_bundle_type: "plant_diagnosis",
    });
    const incoming = {
      parent_intent: "daily_sales_deviation",
      planta_id: 1,
      last_evidence_bundle_type: "daily_sales_deviation",
      active_date: "2026-08-19",
      previous_frame: plant,
    };
    const replaced = resolveOutgoingPreviousFrame(incoming, "action_status", false);
    assert.equal(replaced.parent_intent, "daily_sales_deviation");
    assert.notEqual(replaced.parent_intent, "plant_diagnosis");
    assert.equal(Array.isArray(replaced), false);
  });

  it("planta incompatible anula previous_frame", () => {
    const frame = {
      parent_intent: "plant_diagnosis",
      planta_id: 2,
      active_entities: [{ display: "Arturo Lopez", cliente_key: "x" }],
      last_evidence_bundle_type: "plant_diagnosis",
    };
    assert.equal(sanitizePreviousFrame(frame, 1), null);
  });

  it("history ahora/volvamos no borra parent reconstruible", () => {
    const reconstructed = reconstructFromUserHistory(
      [
        { role: "user", content: "¿Cómo va Puebla?" },
        { role: "assistant", content: "ok" },
        { role: "user", content: "Ahora dime el descuento/kg." },
      ],
      detectDirectorIaIntent
    );
    assert.equal(reconstructed.parent_intent, "plant_diagnosis");
  });

  it("sin previous seguro clarifica; Hablemos de no restaura", () => {
    const lonely = resolveConversationTurn({
      question: "Volvamos a Arturo.",
      plantaId: 1,
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(lonely.restore_previous, false);
    assert.equal(lonely.out_of_slice_clarify, true);

    const switchVerb = resolveConversationTurn({
      question: "Hablemos de mantenimiento",
      plantaId: 1,
      echoedState: {
        parent_intent: "plant_diagnosis",
        planta_id: 1,
        last_evidence_bundle_type: "plant_diagnosis",
        previous_frame: {
          parent_intent: "action_status",
          planta_id: 1,
          last_evidence_bundle_type: "action_status",
        },
      },
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(switchVerb.kind, "topic_return");
    assert.equal(switchVerb.inherit, false);
    assert.equal(switchVerb.restore_previous, false);
  });

  it("runtime no declara topic stack ni evidencia cruda en el frame", () => {
    assert.doesNotMatch(STATE_SRC, /topic_stack/);
    assert.doesNotMatch(CHAT_SRC, /topic_stack/);
    assert.doesNotMatch(STATE_SRC, /previous_frames\s*=/);
    assert.match(STATE_SRC, /previous_frame/);
  });
});

describe("askDirectorIa first slice B — conversaciones de producto", () => {
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
      loadDailyDiscountDeviationForChat: undefined,
      loadPresupuestoSemanalForChat: undefined,
      loadActionPersonBoardForChat: undefined,
      persistentMemoryStore: null,
      plantCatalog: PUEBLA_CATALOG,
    });
  });

  async function runTurn(question, opts = {}) {
    const history = opts.history || [];
    return askDirectorIa(
      {
        body: {
          history: [...history, { role: "user", content: question }],
          conversation_state: opts.conversation_state,
        },
        dashboardAuth: opts.dashboardAuth || { role: "ZP", actor_id: 9, plantas_permitidas: [1] },
      },
      opts.plantaId == null ? 1 : opts.plantaId,
      question
    );
  }

  function wire(over = {}) {
    const counts = {
      plant: 0,
      sales: 0,
      discount: 0,
      budget: 0,
      action: 0,
      openai: 0,
    };
    let lastUser = "";
    configureDirectorIaChat({
      pool: {},
      openaiChat: async (_sys, user) => {
        counts.openai += 1;
        lastUser = user;
        return over.openaiText || "Lectura con evidencia fresca. Sin causa inventada.";
      },
      loadPlantDiagnosisForChat: async (_pool, plantaId) => {
        counts.plant += 1;
        if (over.plantAbort) {
          return { abort: true, status: 403, code: "SOURCE_RESTRICTED", error: "Sin acceso" };
        }
        return assembledArturo(over.arturo || {});
      },
      loadDailySalesDeviationForChat: async (_pool, _id, _req, args) => {
        counts.sales += 1;
        counts.lastSalesTarget = args && args.targetDate;
        counts.lastSalesQuestion = args && args.question;
        return dailySalesAssembled();
      },
      loadDailyDiscountDeviationForChat: async () => {
        counts.discount += 1;
        return dailyDiscountAssembled();
      },
      loadPresupuestoSemanalForChat: async () => {
        counts.budget += 1;
        return budgetPayload();
      },
      loadActionPersonBoardForChat: async () => {
        counts.action += 1;
        return { ok: true, items: over.board || boardItems({ single: true }) };
      },
      loadFinancialDiagnosisForChat: async () => {
        throw new Error("financial_diagnosis no debe correr");
      },
      persistentMemoryStore: over.store || null,
    });
    return {
      counts,
      get lastUser() {
        return lastUser;
      },
    };
  }

  it("1) venta ayer → descuento/kg → volver venta ayer → quién explicó más", async () => {
    const ctx = wire();
    const t1 = await runTurn("¿Por qué bajó la venta ayer?");
    assert.equal(t1.context_meta.mode, "daily_sales_deviation");
    assert.equal(t1.context_meta.conversation_state.active_date, "2026-08-19");
    assertFrameShape(t1.context_meta.conversation_state.previous_frame, "t1");

    const t2 = await runTurn("Ahora dime el descuento/kg.", {
      history: historyFromTurns([{ q: "¿Por qué bajó la venta ayer?", a: t1.answer }]),
      conversation_state: t1.context_meta.conversation_state,
    });
    assert.equal(t2.context_meta.requires_clarification, true);
    assert.equal(t2.context_meta.conversation_state.previous_frame.parent_intent, "daily_sales_deviation");
    assert.equal(ctx.counts.discount, 0);

    const t3 = await runTurn("Volvamos a la venta de ayer.", {
      history: historyFromTurns([
        { q: "¿Por qué bajó la venta ayer?", a: t1.answer },
        { q: "Ahora dime el descuento/kg.", a: t2.answer },
      ]),
      conversation_state: t2.context_meta.conversation_state,
    });
    assert.equal(t3.ok, true);
    assert.equal(t3.context_meta.mode, "daily_sales_deviation");
    assert.equal(t3.context_meta.openai_called, true);
    assert.equal(t3.context_meta.requires_clarification, undefined);
    assert.equal(ctx.counts.sales, 2);
    assert.equal(t3.context_meta.conversation_state.active_date, "2026-08-19");
    assert.match(ctx.lastUser, /HILO/);
    assert.doesNotMatch(JSON.stringify(t3.context_meta.conversation_state), /kg:\s*100/);

    const t4 = await runTurn("¿Quién explicó más?", {
      history: historyFromTurns([
        { q: "¿Por qué bajó la venta ayer?", a: t1.answer },
        { q: "Volvamos a la venta de ayer.", a: t3.answer },
      ]),
      conversation_state: t3.context_meta.conversation_state,
    });
    assert.equal(t4.context_meta.mode, "daily_sales_deviation");
    assert.equal(t4.context_meta.openai_called, true);
    assert.equal(ctx.counts.sales, 3);
  });

  it("2) Puebla → Arturo → venta ayer → volver Arturo → qué faltaba", async () => {
    const ctx = wire();
    const t1 = await runTurn("¿Cómo va Puebla?");
    assert.equal(t1.context_meta.mode, "plant_diagnosis");
    assert.equal(t1.context_meta.conversation_state.previous_frame, null);

    const t2 = await runTurn("¿Y Arturo?", {
      history: historyFromTurns([{ q: "¿Cómo va Puebla?", a: t1.answer }]),
      conversation_state: t1.context_meta.conversation_state,
    });
    assert.equal(t2.context_meta.mode, "plant_diagnosis");
    assert.equal(t2.context_meta.conversation_state.active_entities[0].display, "Arturo Lopez");
    assert.equal(t2.context_meta.conversation_state.previous_frame, null);
    assert.equal(ctx.counts.plant, 2);

    const t3 = await runTurn("¿Cómo estuvo la venta ayer?", {
      history: historyFromTurns([
        { q: "¿Cómo va Puebla?", a: t1.answer },
        { q: "¿Y Arturo?", a: t2.answer },
      ]),
      conversation_state: t2.context_meta.conversation_state,
    });
    assert.equal(t3.context_meta.mode, "daily_sales_deviation");
    assert.equal(t3.context_meta.conversation_state.previous_frame.parent_intent, "plant_diagnosis");
    assert.equal(t3.context_meta.conversation_state.previous_frame.active_entities[0].display, "Arturo Lopez");
    assert.equal((t3.context_meta.conversation_state.active_entities || []).length, 0);

    const t4 = await runTurn("Volvamos a Arturo.", {
      history: historyFromTurns([
        { q: "¿Y Arturo?", a: t2.answer },
        { q: "¿Cómo estuvo la venta ayer?", a: t3.answer },
      ]),
      conversation_state: t3.context_meta.conversation_state,
    });
    assert.equal(t4.context_meta.mode, "plant_diagnosis");
    assert.equal(t4.context_meta.openai_called, true);
    assert.equal(t4.context_meta.conversation_state.active_entities[0].display, "Arturo Lopez");
    assert.equal(t4.context_meta.conversation_state.previous_frame.parent_intent, "daily_sales_deviation");
    assert.equal(ctx.counts.plant, 3);
    assert.match(ctx.lastUser, /HILO/);
    assert.match(ctx.lastUser, /previous_parent_intent=daily_sales_deviation/);

    const t5 = await runTurn("¿Qué faltaba saber?", {
      history: historyFromTurns([{ q: "Volvamos a Arturo.", a: t4.answer }]),
      conversation_state: t4.context_meta.conversation_state,
    });
    assert.equal(t5.context_meta.mode, "plant_diagnosis");
    assert.equal(t5.context_meta.openai_called, true);
    assert.equal(ctx.counts.plant, 4);
  });

  it("3) acción Julio → Puebla → retomar acción → por qué seguía abierta", async () => {
    const ctx = wire({ board: boardItems({ single: true }) });
    const t1 = await runTurn("¿Qué pasó con la acción de Julio Pérez?");
    assert.equal(t1.context_meta.mode, "action_status");
    assert.equal(t1.context_meta.action_person.action_count, 1);

    const t2 = await runTurn("Ahora dime Puebla.", {
      history: historyFromTurns([{ q: "¿Qué pasó con la acción de Julio Pérez?", a: t1.answer }]),
      conversation_state: t1.context_meta.conversation_state,
    });
    assert.equal(t2.context_meta.requires_clarification, true);
    assert.equal(t2.context_meta.conversation_state.parent_intent, null);
    assert.equal(t2.context_meta.conversation_state.previous_frame.parent_intent, "action_status");
    assert.equal(ctx.counts.plant, 0);

    const t3 = await runTurn("Retomemos la acción.", {
      history: historyFromTurns([
        { q: "¿Qué pasó con la acción de Julio Pérez?", a: t1.answer },
        { q: "Ahora dime Puebla.", a: t2.answer },
      ]),
      conversation_state: t2.context_meta.conversation_state,
    });
    assert.equal(t3.context_meta.mode, "action_status");
    assert.equal(t3.context_meta.openai_called, true);
    assert.equal(ctx.counts.action, 2);
    assert.doesNotMatch(t3.answer, /no la cerró porque/i);

    const t4 = await runTurn("¿Por qué seguía abierta?", {
      history: historyFromTurns([{ q: "Retomemos la acción.", a: t3.answer }]),
      conversation_state: t3.context_meta.conversation_state,
    });
    assert.equal(t4.context_meta.mode, "action_status");
    assert.equal(t4.context_meta.openai_called, true);
    assert.equal(ctx.counts.action, 3);
  });

  it("4) Puebla → presupuesto → y eso → volver Puebla → qué más", async () => {
    const ctx = wire();
    const t1 = await runTurn("¿Cómo va Puebla?");
    const t2 = await runTurn("Ahora dime el presupuesto.", {
      history: historyFromTurns([{ q: "¿Cómo va Puebla?", a: t1.answer }]),
      conversation_state: t1.context_meta.conversation_state,
    });
    assert.equal(t2.context_meta.requires_clarification, true);
    assert.equal(ctx.counts.budget, 0);
    assert.equal(t2.context_meta.conversation_state.previous_frame.parent_intent, "plant_diagnosis");

    const t3 = await runTurn("¿Y eso?", {
      history: historyFromTurns([
        { q: "¿Cómo va Puebla?", a: t1.answer },
        { q: "Ahora dime el presupuesto.", a: t2.answer },
      ]),
      conversation_state: t2.context_meta.conversation_state,
    });
    assert.equal(t3.context_meta.requires_clarification, true);

    const t4 = await runTurn("Volvamos a Puebla.", {
      history: historyFromTurns([
        { q: "Ahora dime el presupuesto.", a: t2.answer },
        { q: "¿Y eso?", a: t3.answer },
      ]),
      conversation_state: t3.context_meta.conversation_state,
    });
    assert.equal(t4.context_meta.mode, "plant_diagnosis");
    assert.equal(t4.context_meta.openai_called, true);
    assert.equal(ctx.counts.plant, 2);

    const t5 = await runTurn("¿Qué más?", {
      history: historyFromTurns([{ q: "Volvamos a Puebla.", a: t4.answer }]),
      conversation_state: t4.context_meta.conversation_state,
    });
    assert.equal(t5.context_meta.mode, "plant_diagnosis");
    assert.equal(t5.context_meta.openai_called, true);
    assert.equal(ctx.counts.plant, 3);
  });

  it("presupuesto standalone gana y Volvamos a Puebla restaura el prior", async () => {
    const ctx = wire();
    const plant = await runTurn("¿Cómo va Puebla?");
    const budget = await runTurn("¿Cómo va el presupuesto esta semana?", {
      conversation_state: plant.context_meta.conversation_state,
    });
    assert.equal(budget.context_meta.mode, "presupuesto_semanal");
    assert.equal(budget.context_meta.conversation_state.parent_intent, null);
    assert.equal(budget.context_meta.conversation_state.previous_frame.parent_intent, "plant_diagnosis");
    assert.equal(ctx.counts.budget, 1);

    const back = await runTurn("Volvamos a Puebla.", {
      conversation_state: budget.context_meta.conversation_state,
    });
    assert.equal(back.context_meta.mode, "plant_diagnosis");
    assert.equal(ctx.counts.plant, 2);
  });

  it("5) no recupera en silencio un tema más antiguo que previous_frame", async () => {
    const ctx = wire({ board: boardItems({ single: true }) });
    const action = await runTurn("¿Qué pasó con la acción de Julio Pérez?");
    const plant = await runTurn("¿Cómo va Puebla?", {
      conversation_state: action.context_meta.conversation_state,
    });
    assert.equal(plant.context_meta.conversation_state.previous_frame.parent_intent, "action_status");
    const sales = await runTurn("¿Por qué bajó la venta ayer?", {
      conversation_state: plant.context_meta.conversation_state,
    });
    assert.equal(sales.context_meta.mode, "daily_sales_deviation");
    assert.equal(sales.context_meta.conversation_state.previous_frame.parent_intent, "plant_diagnosis");
    assert.notEqual(sales.context_meta.conversation_state.previous_frame.parent_intent, "action_status");

    const older = await runTurn("Retomemos la acción.", {
      conversation_state: sales.context_meta.conversation_state,
    });
    assert.notEqual(older.context_meta.mode, "action_status");
    assert.equal(older.context_meta.requires_clarification, true);
    assert.equal(ctx.counts.action, 1);
    assert.equal(older.context_meta.conversation_state.previous_frame.parent_intent, "plant_diagnosis");
  });

  it("entidad ambigua al restaurar clarifica; no restaura hechos", async () => {
    const ctx = wire({
      arturo: {
        extraClients: [{ cliente_display: "Arturo Perez", cliente_keys: ["puebla|arturo2"] }],
      },
    });
    const plant = await runTurn("¿Cómo va Puebla?");
    const sales = await runTurn("¿Cómo estuvo la venta ayer?", {
      conversation_state: {
        ...plant.context_meta.conversation_state,
        active_entities: [{ kind: "client", display: "Arturo", cliente_key: "puebla|arturo" }],
      },
    });
    const back = await runTurn("Volvamos a Arturo.", {
      conversation_state: sales.context_meta.conversation_state,
    });
    assert.equal(back.context_meta.requires_clarification, true);
    assert.equal((back.context_meta.conversation_state.active_entities || []).length, 0);
    assert.ok(ctx.counts.plant >= 2);
  });

  it("acción N no elige en silencio al restaurar", async () => {
    const ctx = wire({ board: boardItems({ many: true }) });
    const first = await runTurn("¿Qué acciones tiene Julio Pérez?");
    assert.equal(first.context_meta.action_person.action_count, 2);
    assert.equal(first.context_meta.conversation_state.active_entities[0].action_id, null);
    const plant = await runTurn("¿Cómo va Puebla?", {
      conversation_state: first.context_meta.conversation_state,
    });
    const back = await runTurn("Retomemos la acción.", {
      conversation_state: plant.context_meta.conversation_state,
    });
    assert.equal(back.context_meta.mode, "action_status");
    assert.equal(back.context_meta.action_person.action_count, 2);
    assert.equal(back.context_meta.conversation_state.active_entities[0].action_id, null);
    assert.equal(ctx.counts.action, 2);
  });

  it("memoria persistente no navega volvamos; strategy B sigue tras restore", async () => {
    const store = mem.createInMemoryStore();
    await mem.upsertActiveWorkItem(store, {
      user_scope_key: "usuario:9",
      planta_id: 1,
      entity_key: "puebla|arturo",
      entity_display: "Arturo Lopez",
      parent_intent: "plant_diagnosis",
      pending_information_gap: { missing_fields: ["hecho"], why_blocks: "pendiente" },
    });
    const ctx = wire({ store });
    assert.equal(mem.classifyPersistentMemoryTurn("Volvamos a Arturo.").kind, "none");
    const plant = await runTurn("¿Cómo va Puebla?");
    const named = await runTurn("¿Y Arturo?", {
      conversation_state: plant.context_meta.conversation_state,
    });
    const sales = await runTurn("¿Cómo estuvo la venta ayer?", {
      conversation_state: named.context_meta.conversation_state,
    });
    const back = await runTurn("Volvamos a Arturo.", {
      conversation_state: sales.context_meta.conversation_state,
    });
    assert.equal(back.context_meta.mode, "plant_diagnosis");
    assert.equal(back.context_meta.work_item_memory.retrieved, false);
    assert.equal(back.context_meta.work_item_memory.memory_is_not_evidence, true);

    const follow = await runTurn("foobar contexto abierto", {
      conversation_state: back.context_meta.conversation_state,
    });
    assert.equal(follow.context_meta.mode, "plant_diagnosis");
    assert.equal(follow.context_meta.openai_called, true);
    assert.equal(ctx.counts.plant, 4);
  });

  it("cross-plant no restaura previous_frame ajeno", async () => {
    wire();
    const sales = await runTurn("¿Por qué bajó la venta ayer?");
    const tainted = {
      ...sales.context_meta.conversation_state,
      previous_frame: {
        parent_intent: "plant_diagnosis",
        planta_id: 2,
        active_entities: [{ display: "ClienteOtra", cliente_key: "otra|x" }],
        last_evidence_bundle_type: "plant_diagnosis",
      },
    };
    const back = await runTurn("Volvamos a Arturo.", { conversation_state: tainted });
    assert.equal(back.context_meta.requires_clarification, true);
    assert.notEqual(back.context_meta.mode, "plant_diagnosis");
    assert.equal((back.context_meta.conversation_state.active_entities || []).length, 0);
  });

  it("descuento/kg standalone con ayer no se tira por ahora dime", async () => {
    const ctx = wire();
    const first = await runTurn("¿Por qué bajó la venta ayer?");
    const discount = await runTurn("Ahora dime el descuento/kg ayer.", {
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(discount.context_meta.mode, "daily_discount_deviation");
    assert.equal(ctx.counts.discount, 1);
    assert.equal(discount.context_meta.conversation_state.previous_frame.parent_intent, "daily_sales_deviation");
  });
});
