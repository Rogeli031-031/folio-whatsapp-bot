"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  INHERITABLE_INTENTS,
  resolveConversationTurn,
  sanitizeActiveEntities,
} = require("../lib/director-ia-conversation-state");
const mem = require("../lib/director-ia-persistent-memory");
const {
  resolveActionPersonFocus,
  hasProperPersonSpan,
  loadActionPersonBoardForChat,
  ACTION_PERSON_SYSTEM_PROMPT,
} = require("../lib/director-ia-action-person");

const ROOT = path.join(__dirname, "..");
const LIB_DIR = path.join(ROOT, "lib");

const HOLDOUT_PHRASES = [
  "¿Qué ocurrió con lo que trae Julio Pérez?",
  "¿Cómo va lo pendiente de Julio?",
  "¿Tiene algo fuera de fecha?",
  "¿Hay novedades de esa acción?",
  "¿Y la que sigue abierta?",
];

const PRODUCTION_ROUTING_FILES = [
  "director-ia-planner.js",
  "director-ia-chat.js",
  "director-ia-conversation-state.js",
  "director-ia-action-person.js",
  "director-ia-persistent-memory.js",
  "director-ia-tools.js",
];

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
    dicf: true,
    dicf_id: 900,
    dicf_resultado_cierre: "Entregado en sitio",
    historial: [{ at: "2026-07-02", tipo: "cierre", titulo: "Cerrada" }],
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
  if (over.empty) return [];
  if (over.onlyMaria) return [maria];
  if (over.twoJulios) {
    return [
      julioOpen,
      { ...julioOpen, id: 13, responsable: "Julio García", responsable_usuario_id: 77, title: "Otra" },
    ];
  }
  if (over.single) return [julioOpen];
  return [julioOpen, julioClosed, maria];
}

describe("planner action-person (estrategia C)", () => {
  it("cubre accion singular y acciones plural", () => {
    assert.equal(detectDirectorIaIntent("¿Qué pasó con la acción de Julio Pérez?").intent, "action_status");
    assert.equal(detectDirectorIaIntent("¿Qué acciones tiene Julio Pérez?").intent, "action_status");
    assert.equal(detectDirectorIaIntent("¿Hay una acción de Julio Pérez?").intent, "action_status");
    assert.equal(detectDirectorIaIntent("¿Cómo va la acción de Julio Pérez?").intent, "action_status");
  });

  it("acción + responsable rutea a action_status y preserva intents AR existentes", () => {
    assert.equal(planDirectorIaQuestion("¿Qué pasó con la acción de Julio Pérez?").intent, "action_status");
    assert.equal(detectDirectorIaIntent("¿Quién es el responsable de Oficinas?").intent, "responsible_lookup");
    assert.equal(detectDirectorIaIntent("¿Qué acciones están vencidas?").intent, "overdue_actions");
    assert.equal(detectDirectorIaIntent("¿Cómo va mantenimiento?").intent, "action_status");
    assert.equal(detectDirectorIaIntent("¿Qué acciones tiene AT-15?").intent, "action_status");
  });

  it("vencido con nombre propio rutea a action_status, no al listado de planta", () => {
    assert.equal(detectDirectorIaIntent("¿Julio Pérez tiene algo vencido?").intent, "action_status");
  });

  it("qué pasó con Arturo sigue unknown (memoria, no AR)", () => {
    assert.equal(detectDirectorIaIntent("¿Qué pasó con Arturo?").intent, "unknown");
    assert.equal(mem.classifyPersistentMemoryTurn("¿Qué pasó con Arturo?").kind, "resume");
  });

  it("action_status es inheritable", () => {
    assert.ok(INHERITABLE_INTENTS.includes("action_status"));
    const turn = resolveConversationTurn({
      question: "¿Está vencida?",
      plantaId: 1,
      detectIntent: detectDirectorIaIntent,
      echoedState: {
        parent_intent: "action_status",
        planta_id: 1,
        last_evidence_bundle_type: "action_status",
        active_entities: [{ kind: "ar_responsable", display: "Julio Pérez", usuario_id: 44, name_key: "julio perez" }],
      },
    });
    assert.equal(turn.inherit, true);
    assert.equal(turn.inherit_parent_intent, "action_status");
    assert.equal(turn.standalone, false);
  });
});

describe("resolución física de responsable y 0/1/N", () => {
  it("único responsable + una acción", () => {
    const focus = resolveActionPersonFocus({
      items: boardItems({ single: true }),
      question: "¿Qué pasó con la acción de Julio Pérez?",
      todayYmd: "2026-08-24",
    });
    assert.equal(focus.mode, "one_action");
    assert.equal(focus.action.id, 11);
    assert.equal(focus.action.overdue, true);
    assert.equal(focus.responsable.display, "Julio Pérez");
  });

  it("N acciones no elige en silencio", () => {
    const focus = resolveActionPersonFocus({
      items: boardItems(),
      question: "¿Qué acciones tiene Julio Pérez?",
      todayYmd: "2026-08-24",
    });
    assert.equal(focus.mode, "many_actions");
    assert.equal(focus.action, null);
    assert.equal(focus.rows.length, 2);
    assert.ok(focus.limitations.includes("multiples_acciones_no_elegir_en_silencio"));
  });

  it("0 acciones del responsable", () => {
    const focus = resolveActionPersonFocus({
      items: boardItems({ onlyMaria: true }),
      question: "¿Qué pasó con la acción de Julio Pérez?",
      todayYmd: "2026-08-24",
    });
    assert.equal(focus.mode, "no_responsible");
  });

  it("homónimo aclara; no fuzzy silencioso", () => {
    const focus = resolveActionPersonFocus({
      items: boardItems({ twoJulios: true }),
      question: "¿Qué acciones tiene Julio?",
      todayYmd: "2026-08-24",
    });
    assert.equal(focus.mode, "ambiguous_people");
    assert.equal(focus.people.length, 2);
  });

  it("resultado_cierre e historial solo si el ítem los trae", () => {
    const focus = resolveActionPersonFocus({
      items: boardItems({ single: true }),
      question: "¿Qué pasó con la acción de Julio Pérez?",
      todayYmd: "2026-08-24",
    });
    assert.equal(focus.action.resultado_cierre, null);
    assert.deepEqual(focus.action.historial, []);
    assert.ok(focus.limitations.includes("sin_explicacion_registrada_del_retraso"));
  });

  it("consulta genérica de AR no se trata como persona", () => {
    const focus = resolveActionPersonFocus({
      items: boardItems(),
      question: "¿Cómo va mantenimiento?",
      todayYmd: "2026-08-24",
    });
    assert.equal(focus.mode, "none");
  });
});

describe("hold-outs no están en production routing", () => {
  it("las frases hold-out no se copian a lib/", () => {
    for (const file of PRODUCTION_ROUTING_FILES) {
      const src = fs.readFileSync(path.join(LIB_DIR, file), "utf8");
      for (const phrase of HOLDOUT_PHRASES) {
        assert.doesNotMatch(src, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
    }
    assert.equal(detectDirectorIaIntent("¿Qué ocurrió con lo que trae Julio Pérez?").intent, "unknown");
    assert.equal(detectDirectorIaIntent("¿Cómo va lo pendiente de Julio?").intent, "unknown");
    assert.equal(detectDirectorIaIntent("¿Tiene algo fuera de fecha?").intent, "unknown");
    assert.equal(detectDirectorIaIntent("¿Hay novedades de esa acción?").intent, "unknown");
    assert.equal(hasProperPersonSpan("¿Hay novedades de esa acción?"), false);
  });
});

describe("askDirectorIa action-person", () => {
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
      loadActionPersonBoardForChat: undefined,
      persistentMemoryStore: null,
    });
  });

  function auth(over = {}) {
    return {
      role: over.role || "ZP",
      actor_id: over.actor_id == null ? 9 : over.actor_id,
      plantas_permitidas: over.plantas_permitidas || [1],
    };
  }

  async function run(question, opts = {}) {
    return askDirectorIa(
      {
        body: {
          history: opts.history || [],
          conversation_state: opts.conversation_state,
        },
        dashboardAuth: opts.dashboardAuth || auth(opts),
      },
      opts.plantaId == null ? 1 : opts.plantaId,
      question
    );
  }

  function wire(items, openaiText) {
    let lastUser = "";
    let loads = 0;
    configureDirectorIaChat({
      pool: {},
      openaiChat: async (_sys, user) => {
        lastUser = user;
        return openaiText || "La acción está abierta y vencida. No hay motivo registrado.";
      },
      loadActionPersonBoardForChat: async () => {
        loads += 1;
        return { ok: true, items: typeof items === "function" ? items() : items };
      },
    });
    return {
      get lastUser() {
        return lastUser;
      },
      get loads() {
        return loads;
      },
    };
  }

  it("conversación 1: acción única, hereda, requery, GPT, sin culpa", async () => {
    const ctx = wire(boardItems({ single: true }));
    const first = await run("¿Qué pasó con la acción de Julio Pérez?");
    assert.equal(first.ok, true);
    assert.equal(first.context_meta.mode, "action_status");
    assert.equal(first.context_meta.openai_called, true);
    assert.equal(first.context_meta.conversation_state.parent_intent, "action_status");
    assert.match(ctx.lastUser, /responsable_registrado=Julio Pérez/);
    assert.match(ctx.lastUser, /vencida=si/);
    assert.match(ACTION_PERSON_SYSTEM_PROMPT, /no es culpable/);
    assert.doesNotMatch(first.answer, /no la cerró porque no dio seguimiento/i);

    const followQs = [
      "¿Está vencida?",
      "¿Por qué no la cerró?",
      "¿Lo sabemos?",
      "¿Qué información falta?",
      "¿Qué necesitas de Julio?",
    ];
    let state = first.context_meta.conversation_state;
    let history = [
      { role: "user", content: "¿Qué pasó con la acción de Julio Pérez?" },
      { role: "assistant", content: first.answer },
    ];
    for (const q of followQs) {
      const turn = await run(q, { conversation_state: state, history });
      assert.equal(turn.ok, true, q);
      assert.equal(turn.context_meta.mode, "action_status", q);
      assert.equal(turn.context_meta.openai_called, true, q);
      assert.equal(turn.context_meta.conversation_state.parent_intent, "action_status", q);
      history = [...history, { role: "user", content: q }, { role: "assistant", content: turn.answer }];
      state = turn.context_meta.conversation_state;
    }
    assert.ok(ctx.loads >= 6);
  });

  it("conversación 2: N acciones no selecciona en silencio", async () => {
    const ctx = wire(boardItems());
    const first = await run("¿Qué acciones tiene Julio Pérez?");
    assert.equal(first.context_meta.action_person.action_count, 2);
    assert.equal(first.context_meta.conversation_state.active_entities[0].kind, "ar_responsable");
    assert.equal(first.context_meta.conversation_state.active_entities[0].action_id, null);
    assert.match(ctx.lastUser, /No elijas una/);

    const overdue = await run("¿Cuál está vencida?", {
      conversation_state: first.context_meta.conversation_state,
      history: [
        { role: "user", content: "¿Qué acciones tiene Julio Pérez?" },
        { role: "assistant", content: first.answer },
      ],
    });
    assert.equal(overdue.ok, true);
    assert.equal(overdue.context_meta.mode, "action_status");
    assert.equal(overdue.context_meta.openai_called, true);

    const other = await run("¿Y la otra?", {
      conversation_state: overdue.context_meta.conversation_state,
      history: [
        { role: "user", content: "¿Qué acciones tiene Julio Pérez?" },
        { role: "assistant", content: first.answer },
        { role: "user", content: "¿Cuál está vencida?" },
        { role: "assistant", content: overdue.answer },
      ],
    });
    assert.equal(other.ok, true);
    assert.equal(other.context_meta.mode, "action_status");
  });

  it("AR gana sobre resume genérico de memoria", async () => {
    const store = mem.createInMemoryStore();
    await mem.upsertActiveWorkItem(store, {
      user_scope_key: "usuario:9",
      planta_id: 1,
      entity_key: "puebla|julio",
      entity_display: "Julio Pérez",
      parent_intent: "plant_diagnosis",
      pending_information_gap: { missing_fields: ["hecho_comercial"], why_blocks: "pendiente de cliente" },
    });
    let plantLoads = 0;
    let arLoads = 0;
    configureDirectorIaChat({
      pool: {},
      persistentMemoryStore: store,
      openaiChat: async () => "Evidencia de la acción, no del pendiente de cliente.",
      loadPlantDiagnosisForChat: async () => {
        plantLoads += 1;
        return { ok: true, abort: false };
      },
      loadActionPersonBoardForChat: async () => {
        arLoads += 1;
        return { ok: true, items: boardItems({ single: true }) };
      },
    });
    const result = await run("¿Qué pasó con la acción de Julio Pérez?");
    assert.equal(result.context_meta.mode, "action_status");
    assert.equal(arLoads, 1);
    assert.equal(plantLoads, 0);
    assert.equal(mem.classifyPersistentMemoryTurn("¿Qué pasó con la acción de Julio Pérez?").kind, "resume");
  });

  it("hold-out hereda action_status sin estar en production routing", async () => {
    wire(boardItems({ single: true }));
    const first = await run("¿Qué pasó con la acción de Julio Pérez?");
    const hold = await run("¿Tiene algo fuera de fecha?", {
      conversation_state: first.context_meta.conversation_state,
      history: [
        { role: "user", content: "¿Qué pasó con la acción de Julio Pérez?" },
        { role: "assistant", content: first.answer },
      ],
    });
    assert.equal(detectDirectorIaIntent("¿Tiene algo fuera de fecha?").intent, "unknown");
    assert.equal(hold.context_meta.mode, "action_status");
    assert.equal(hold.context_meta.openai_called, true);
  });

  it("authz fail-closed y no cruza planta", async () => {
    const denied = await loadActionPersonBoardForChat(
      {},
      2,
      { dashboardAuth: { role: "GA", plantas_permitidas: [1] } }
    );
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
    assert.equal(denied.code, "SOURCE_RESTRICTED");
  });

  it("cómo va mantenimiento no usa el filtro de persona", async () => {
    let arLoads = 0;
    configureDirectorIaChat({
      pool: null,
      openaiChat: async () => {
        throw new Error("no openai");
      },
      loadActionPersonBoardForChat: async () => {
        arLoads += 1;
        return { ok: true, items: boardItems() };
      },
    });
    const result = await run("¿Cómo va mantenimiento?");
    assert.equal(arLoads, 0);
    assert.notEqual(result.context_meta && result.context_meta.mode, "action_status");
  });
});

describe("sanitize ar entities", () => {
  it("conserva responsable de acción, no como cliente", () => {
    const out = sanitizeActiveEntities([
      { kind: "ar_responsable", display: "Julio Pérez", usuario_id: 44, name_key: "julio perez" },
    ]);
    assert.equal(out[0].kind, "ar_responsable");
    assert.equal(out[0].usuario_id, 44);
    assert.equal(out[0].cliente_key, null);
  });
});
