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
  derivePendingInformationGap,
  buildConversationState,
  formatConversationHiloForModel,
  HILO_PREAMBLE,
  sanitizeEchoedState,
} = require("../lib/director-ia-conversation-state");

const ROOT = path.join(__dirname, "..");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");
const STATE_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-conversation-state.js"), "utf8");

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

function historyFromTurns(turns) {
  const out = [];
  for (const t of turns) {
    out.push({ role: "user", content: t.q });
    if (t.a) out.push({ role: "assistant", content: t.a });
  }
  return out;
}

describe("structured_conversation_state (puro)", () => {
  it("clasifica follow-ups defendibles y no convierte any unknown", () => {
    assert.equal(classifyTurnKind("¿Qué te llama la atención?"), "attention");
    assert.equal(classifyTurnKind("¿Por qué?"), "why");
    assert.equal(classifyTurnKind("¿Y Arturo?"), "entity_intro");
    assert.equal(classifyTurnKind("¿Qué sabemos de él?"), "pronoun");
    assert.equal(classifyTurnKind("¿Tiene alguna acción?"), "action");
    assert.equal(classifyTurnKind("¿Qué falta saber?"), "gap_what");
    assert.equal(classifyTurnKind("¿Quién puede darnos esa información?"), "gap_who");
    assert.equal(classifyTurnKind("¿Para qué la necesitas?"), "gap_why_need");
    assert.equal(classifyTurnKind("Ahora Querétaro."), "plant_switch");
    assert.equal(classifyTurnKind("Volvamos a Puebla."), "topic_return");
    assert.equal(classifyTurnKind("¿Y la anterior?"), "period_switch");
    assert.equal(classifyTurnKind("xyz no es un follow-up"), "other");
  });

  it("extrae hint de Arturo y no de pronombre", () => {
    assert.equal(extractEntityHint("¿Y Arturo?"), "Arturo");
    assert.equal(extractEntityHint("¿Por qué dejó de comprar Arturo?"), "Arturo");
    assert.equal(extractEntityHint("¿Qué sabemos de él?"), null);
  });

  it("entidad única vs ambigua sin fuzzy silencioso", () => {
    const unique = resolveUniqueEntity("Arturo", [
      { display: "Arturo Lopez", cliente_keys: ["a1"] },
      { display: "NullCo", cliente_keys: ["n1"] },
    ]);
    assert.equal(unique.status, "unique");
    assert.equal(unique.entity.display, "Arturo Lopez");

    const amb = resolveUniqueEntity("Arturo", [
      { display: "Arturo Lopez", cliente_keys: ["a1"] },
      { display: "Arturo Perez", cliente_keys: ["a2"] },
    ]);
    assert.equal(amb.status, "ambiguous");

    const none = resolveUniqueEntity("Arturo", [{ display: "NullCo", cliente_keys: ["n1"] }]);
    assert.equal(none.status, "none");

    const noFuzzy = resolveUniqueEntity("Art", [{ display: "Arturo Lopez", cliente_keys: ["a1"] }]);
    assert.equal(noFuzzy.status, "none");
  });

  it("hereda parent_intent solo si el follow-up es defendible", () => {
    const hist = historyFromTurns([{ q: "¿Cómo va Puebla?", a: "Resumen." }]);
    const follow = resolveConversationTurn({
      question: "¿Qué te llama la atención?",
      history: [...hist, { role: "user", content: "¿Qué te llama la atención?" }],
      plantaId: 1,
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(follow.inherit, true);
    assert.equal(follow.inherit_parent_intent, "plant_diagnosis");

    const junk = resolveConversationTurn({
      question: "foobar sin ancla",
      history: [],
      plantaId: 1,
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(junk.inherit, false);
    assert.equal(junk.unknown_needs_clarification, true);
  });

  it("plant switch / mismatch invalida entidad y gap", () => {
    const echoed = sanitizeEchoedState(
      {
        parent_intent: "plant_diagnosis",
        planta_id: 1,
        active_entities: [{ display: "Arturo Lopez", cliente_key: "puebla|arturo" }],
        last_evidence_bundle_type: "plant_diagnosis",
        pending_information_gap: { missing_fields: ["x"], why_blocks: "y", physical_person: "Ana" },
      },
      2
    );
    assert.equal(echoed.plant_mismatch, true);
    assert.deepEqual(echoed.active_entities, []);
    assert.equal(echoed.pending_information_gap, null);

    const turn = resolveConversationTurn({
      question: "¿Y Arturo?",
      history: [],
      plantaId: 2,
      echoedState: {
        parent_intent: "plant_diagnosis",
        planta_id: 1,
        active_entities: [{ display: "Arturo Lopez", cliente_key: "puebla|arturo" }],
      },
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(turn.plant_mismatch, true);
    assert.equal(turn.invalidate_entity, true);
    assert.equal(turn.invalidate_gap, true);
    assert.equal(turn.entity_hint, "Arturo");
  });

  it("gap se deriva de evidencia fresca, no de prosa assistant", () => {
    const gap = derivePendingInformationGap(assembledArturo({ responsible: null }), {
      display: "Arturo Lopez",
    });
    assert.ok(gap.missing_fields.length);
    assert.equal(gap.physical_person, null);
    const withPerson = derivePendingInformationGap(assembledArturo({ responsible: "Ana" }), {
      display: "Arturo Lopez",
    });
    assert.equal(withPerson.physical_person, "Ana");
  });

  it("HILO declara que no es evidencia", () => {
    const state = buildConversationState({
      plantaId: 1,
      parent_intent: "plant_diagnosis",
      active_entities: [{ display: "Arturo Lopez", cliente_key: "puebla|arturo" }],
      last_evidence_bundle_type: "plant_diagnosis",
      pending_information_gap: { missing_fields: ["x"], why_blocks: "bloquea causa", physical_person: null },
    });
    const hilo = formatConversationHiloForModel(state);
    assert.match(hilo, new RegExp(HILO_PREAMBLE.replace(/[()]/g, "\\$&")));
    assert.match(hilo, /NO es evidencia/);
    assert.doesNotMatch(hilo, /INSERT INTO/);
  });
});

describe("planner continuity hooks", () => {
  it("standalone Puebla y financial se preservan", () => {
    assert.equal(planDirectorIaQuestion("¿Cómo va Puebla?").intent, "plant_diagnosis");
    assert.equal(planDirectorIaQuestion("¿Por qué bajó la venta ayer?").intent, "financial_diagnosis");
    assert.equal(planDirectorIaQuestion("¿Cómo va el presupuesto esta semana?").intent, "budget_status");
  });

  it("dejó de comprar (singular) es plant_diagnosis; plural sigue commercial_state", () => {
    assert.equal(planDirectorIaQuestion("¿Por qué dejó de comprar Arturo?").intent, "plant_diagnosis");
    assert.equal(planDirectorIaQuestion("qué clientes dejaron de comprar").intent, "commercial_state");
  });

  it("unknown no hereda salvo inheritParentIntent", () => {
    const alone = planDirectorIaQuestion("¿Por qué?");
    assert.equal(alone.intent, "unknown");
    const inherited = planDirectorIaQuestion("¿Por qué?", { inheritParentIntent: "plant_diagnosis" });
    assert.equal(inherited.intent, "plant_diagnosis");
    assert.equal(inherited.requires_clarification, false);
    assert.ok(inherited.evidence.some((e) => e.value === "inherit_parent_intent"));
  });

  it("standalone no se pisa con parent", () => {
    const plan = planDirectorIaQuestion("¿Por qué bajó la venta ayer?", {
      inheritParentIntent: "plant_diagnosis",
    });
    assert.equal(plan.intent, "financial_diagnosis");
  });
});

describe("askDirectorIa continuity", () => {
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
      resolveConversationCandidates: undefined,
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

  it("crea estado tras turno canónico y continúa parent_intent", async () => {
    let loads = 0;
    let lastUser = "";
    configureDirectorIaChat({
      pool: {},
      openaiChat: async (_sys, user) => {
        lastUser = user;
        return "Concentración observada. Sin causa.";
      },
      loadPlantDiagnosisForChat: async () => {
        loads += 1;
        return assembledArturo();
      },
    });

    const first = await runTurn("¿Cómo va Puebla?");
    assert.equal(first.ok, true);
    assert.equal(first.context_meta.mode, "plant_diagnosis");
    assert.equal(first.context_meta.conversation_state.parent_intent, "plant_diagnosis");
    assert.equal(first.context_meta.conversation_state.planta_id, 1);
    assert.equal(first.context_meta.conversation_state.last_evidence_bundle_type, "plant_diagnosis");
    assert.match(lastUser, /NO es evidencia/);
    assert.doesNotMatch(lastUser, /Concentración observada/);

    const hist = historyFromTurns([{ q: "¿Cómo va Puebla?", a: first.answer }]);
    const second = await runTurn("¿Qué te llama la atención?", {
      history: hist,
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(second.ok, true);
    assert.equal(second.context_meta.mode, "plant_diagnosis");
    assert.equal(loads, 2);

    const hist2 = [...hist, { role: "user", content: "¿Qué te llama la atención?" }, { role: "assistant", content: second.answer }];
    const third = await runTurn("¿Por qué?", {
      history: hist2,
      conversation_state: second.context_meta.conversation_state,
    });
    assert.equal(third.context_meta.mode, "plant_diagnosis");
    assert.equal(loads, 3);
    assert.doesNotMatch(lastUser, new RegExp(String(first.answer).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  it("¿Y Arturo? único vs ambiguo", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Arturo concentra kg. Sin causa.",
      loadPlantDiagnosisForChat: async () => assembledArturo(),
    });
    const first = await runTurn("¿Cómo va Puebla?");
    const hist = historyFromTurns([{ q: "¿Cómo va Puebla?", a: first.answer }]);
    const unique = await runTurn("¿Y Arturo?", {
      history: hist,
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(unique.ok, true);
    assert.equal(unique.context_meta.conversation_state.active_entities[0].display, "Arturo Lopez");

    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "no debe llamarse",
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
    assert.match(amb.answer, /Precisa el nombre/);
    assert.equal(amb.context_meta.conversation_state.active_entities.length, 0);
  });

  it("pronombre, acción y qué falta saber", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Hechos de cobertura. Sin causa.",
      loadPlantDiagnosisForChat: async () => assembledArturo({ responsible: "Ana" }),
    });
    const first = await runTurn("¿Cómo va Puebla?");
    const state = {
      ...first.context_meta.conversation_state,
      active_entities: [{ display: "Arturo Lopez", cliente_key: "puebla|arturo", cliente_keys: ["puebla|arturo"] }],
    };
    const hist = historyFromTurns([
      { q: "¿Cómo va Puebla?", a: first.answer },
      { q: "¿Y Arturo?", a: "Arturo observado." },
    ]);
    const sabemos = await runTurn("¿Qué sabemos de él?", { history: hist, conversation_state: state });
    assert.equal(sabemos.context_meta.mode, "plant_diagnosis");
    assert.equal(sabemos.context_meta.conversation_state.active_entities[0].display, "Arturo Lopez");

    const accion = await runTurn("¿Tiene alguna acción?", { history: hist, conversation_state: state });
    assert.equal(accion.context_meta.mode, "plant_diagnosis");

    const falta = await runTurn("¿Qué falta saber?", { history: hist, conversation_state: state });
    assert.match(falta.answer, /Me falta/);
    assert.ok(falta.context_meta.pending_information_gap);
    assert.equal(falta.context_meta.conversation_state.last_evidence_bundle_type, "plant_diagnosis");
  });

  it("gap: quién no inventa; con vínculo físico sí nombra", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "no",
      loadPlantDiagnosisForChat: async () => assembledArturo({ responsible: null }),
    });
    const state = buildConversationState({
      plantaId: 1,
      parent_intent: "plant_diagnosis",
      active_entities: [{ display: "Arturo Lopez", cliente_key: "puebla|arturo" }],
      last_evidence_bundle_type: "plant_diagnosis",
    });
    const hist = historyFromTurns([
      { q: "¿Por qué dejó de comprar Arturo?", a: "No hay evidencia suficiente de causa." },
    ]);
    const whoNone = await runTurn("¿Quién puede darnos esa información?", { history: hist, conversation_state: state });
    assert.match(whoNone.answer, /No hay un responsable nombrable/);
    assert.doesNotMatch(whoNone.answer, /Julio Pérez|Julio Perez/);

    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "no",
      loadPlantDiagnosisForChat: async () => assembledArturo({ responsible: "Ana" }),
    });
    const whoYes = await runTurn("¿Quién puede darnos esa información?", { history: hist, conversation_state: state });
    assert.match(whoYes.answer, /Ana/);

    const para = await runTurn("¿Para qué la necesitas?", { history: hist, conversation_state: state });
    assert.ok(para.answer.length > 10);
    const queFalta = await runTurn("¿Qué información te falta?", { history: hist, conversation_state: state });
    assert.match(queFalta.answer, /Me falta/);
  });

  it("plant switch no reutiliza Arturo/Puebla", async () => {
    let seenPlant = null;
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Diagnóstico.",
      loadPlantDiagnosisForChat: async (_pool, plantaId) => {
        seenPlant = plantaId;
        return {
          ...assembledArturo(),
          plant: { planta_id: plantaId, planta_nombre: "Querétaro", plant_code: "E8" },
          commercial_materiality: { categories: [{ top_clients: [] }] },
        };
      },
    });
    const leaked = await runTurn("¿Y Arturo?", {
      plantaId: 2,
      conversation_state: {
        parent_intent: "plant_diagnosis",
        planta_id: 1,
        active_entities: [{ display: "Arturo Lopez", cliente_key: "puebla|arturo", cliente_keys: ["puebla|arturo"] }],
        last_evidence_bundle_type: "plant_diagnosis",
        pending_information_gap: { missing_fields: ["x"], why_blocks: "old", physical_person: "Ana" },
      },
    });
    assert.equal(seenPlant, 2);
    assert.equal(leaked.context_meta.mode, "entity_clarification");
    assert.equal(leaked.context_meta.conversation_state.active_entities.length, 0);
    assert.notEqual(
      leaked.context_meta.conversation_state.pending_information_gap &&
        leaked.context_meta.conversation_state.pending_information_gap.physical_person,
      "Ana"
    );
  });

  it("SOURCE_RESTRICTED se preserva y unknown sin estado no cae a Action Register", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "no",
      loadPlantDiagnosisForChat: async () => ({
        abort: true,
        status: 403,
        code: "SOURCE_RESTRICTED",
        error: "Sin acceso a esta planta",
      }),
    });
    const restricted = await runTurn("¿Cómo va Puebla?");
    assert.equal(restricted.ok, false);
    assert.equal(restricted.code, "SOURCE_RESTRICTED");
    assert.equal(restricted.status, 403);

    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => {
        throw new Error("OpenAI no debe llamarse en unknown suelto");
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

  it("financial_diagnosis standalone se preserva", async () => {
    let plantCalled = false;
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "Financiero.",
      loadFinancialDiagnosisForChat: async () => ({
        ok: true,
        abort: false,
        plant: { planta_id: 1, planta_nombre: "Puebla" },
        requested_period: {},
        sources: {
          igf: { status: "SOURCE_AVAILABLE", source: "igf", plant: {}, period: "2026-02", payload: {} },
          arr: { status: "SOURCE_AVAILABLE", source: "arr", plant: {}, period: "2026-02", payload: {} },
          m9: { status: "SOURCE_AVAILABLE", source: "dashboard.delta", plant: {}, period: {}, payload: {} },
        },
        alignment: { status: "comparable", silently_aligned: false, note: "ok" },
        limitations: [],
      }),
      loadPlantDiagnosisForChat: async () => {
        plantCalled = true;
        throw new Error("plant_diagnosis no debe correr");
      },
    });
    const result = await runTurn("¿Por qué bajó la venta ayer?");
    assert.equal(result.context_meta.mode, "financial_diagnosis");
    assert.equal(plantCalled, false);
  });

  it("periodo/stack fuera de slice no hereda", async () => {
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => "no",
      loadPlantDiagnosisForChat: async () => assembledArturo(),
    });
    const first = await runTurn("¿Cómo va Puebla?");
    const hist = historyFromTurns([{ q: "¿Cómo va Puebla?", a: first.answer }]);
    const week = await runTurn("¿Y la anterior?", {
      history: hist,
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(week.context_meta.requires_clarification, true);
    assert.match(week.answer, /fuera del hilo|periodo|semana/i);

    const back = await runTurn("Volviendo a lo anterior, ¿quién debe responder?", {
      history: hist,
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(back.context_meta.requires_clarification, true);
  });
});

describe("invariants de archivo", () => {
  it("no hay tablas nuevas ni history crudo a OpenAI", () => {
    assert.match(STATE_SRC, /No DB/);
    assert.match(CHAT_SRC, /inheritParentIntent/);
    assert.match(CHAT_SRC, /prependHiloToUserContent/);
    assert.doesNotMatch(CHAT_SRC, /CREATE TABLE/);
    assert.doesNotMatch(STATE_SRC, /CREATE TABLE/);
  });
});
