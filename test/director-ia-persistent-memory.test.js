"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const mem = require("../lib/director-ia-persistent-memory");
const { extractEntityHint } = require("../lib/director-ia-conversation-state");

const ROOT = path.join(__dirname, "..");
const SQL = fs.readFileSync(path.join(ROOT, "sql", "017_director_ia_pending_work_items.sql"), "utf8");
const MEM_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-persistent-memory.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");

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
  const latest = over.latest_action !== undefined ? over.latest_action : null;
  const coverage = over.coverage_status || "coverage_unknown";
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
    limitations: over.limitations !== undefined ? over.limitations : ["sin causa observada en fuentes"],
    commercial_materiality: {
      categories: [
        {
          top_clients: [
            {
              cliente_display: "Arturo Lopez",
              cliente_keys: ["puebla|arturo"],
              coverage_status: coverage,
              has_dicf_action: Boolean(latest),
              latest_action: latest,
            },
          ],
        },
      ],
    },
    sources: {
      action_register: srcBlock("arr.action_register_revisions", {
        payload: { summary: { open: over.arOpen == null ? 1 : over.arOpen, closed: over.arClosed || 0 } },
      }),
      dicf: srcBlock("arr.dicf_acciones", { payload: { actions: [] } }),
      commercial_state: srcBlock("arr.dicf_cliente_mes", { payload: {} }),
      bitacora: srcBlock("arr.director_ia_bitacora", { payload: { sessions: [] } }),
      arr: srcBlock("arr.proyeccion_planta", { payload: { venta_ton: 1, desc_kg: 0.1 } }),
      igf: srcBlock("igf.compromiso_lines", { payload: { composition: { ok: true, lines: [] } } }),
    },
  };
}

describe("persistent memory — store + policies", () => {
  it("SQL es arr operativo, sin history/transcript/EKS", () => {
    assert.match(SQL, /arr\.director_ia_pending_work_items/);
    assert.match(SQL, /CREATE TABLE IF NOT EXISTS/);
    assert.match(SQL, /user_scope_key/);
    assert.match(SQL, /pending_information_gap/);
    assert.doesNotMatch(SQL, /\b(raw_history|assistant_answer|evidence_payload|authorization_snapshot)\b/i);
    assert.doesNotMatch(SQL, /CREATE SCHEMA IF NOT EXISTS eks/);
    assert.doesNotMatch(SQL, /eks\./);
  });

  it("módulo no persiste history ni claims", () => {
    assert.match(MEM_SRC, /MEMORY = contexto/);
    assert.doesNotMatch(MEM_SRC, /raw_history:/);
    assert.match(CHAT_SRC, /persistentMemoryStore/);
    assert.doesNotMatch(CHAT_SRC, /CREATE TABLE/);
  });

  it("clasifica resume / remember / dismiss", () => {
    assert.equal(mem.classifyPersistentMemoryTurn("¿Qué pasó con Arturo?").kind, "resume");
    assert.equal(mem.classifyPersistentMemoryTurn("¿Qué pasó con Arturo?").entity_hint, "Arturo");
    assert.equal(mem.classifyPersistentMemoryTurn("¿En qué quedó lo de Arturo?").kind, "resume");
    assert.equal(mem.classifyPersistentMemoryTurn("seguimos con Arturo").kind, "resume");
    assert.equal(mem.classifyPersistentMemoryTurn("¿Qué quedó pendiente?").kind, "resume");
    assert.equal(mem.classifyPersistentMemoryTurn("recuérdame que estábamos revisando Arturo").kind, "remember");
    assert.equal(mem.classifyPersistentMemoryTurn("olvida lo de Arturo").kind, "dismiss");
    assert.equal(mem.classifyPersistentMemoryTurn("¿Cómo va Puebla?").kind, "none");
    assert.equal(extractEntityHint("¿Qué pasó con Arturo?"), "Arturo");
  });

  it("create + dedupe active equivalente", async () => {
    const store = mem.createInMemoryStore();
    const gap = {
      missing_fields: ["hecho_que_explique_el_movimiento_comercial"],
      why_blocks: "Falta motivo documentado",
    };
    const raw = {
      user_scope_key: "usuario:9",
      planta_id: 1,
      entity_key: "puebla|arturo",
      entity_display: "Arturo Lopez",
      parent_intent: "plant_diagnosis",
      pending_information_gap: gap,
    };
    const a = await mem.upsertActiveWorkItem(store, raw);
    const b = await mem.upsertActiveWorkItem(store, raw);
    assert.equal(a.id, b.id);
    assert.equal(store._rows.filter((r) => r.status === "active").length, 1);
    assert.equal(mem.forbiddenPersistKeys(a).length, 0);
    assert.equal(a.history, undefined);
    assert.equal(a.assistant_answer, undefined);
    assert.equal(a.evidence_payload, undefined);
  });

  it("retrieve max 3 active y filtra por user/planta", async () => {
    const store = mem.createInMemoryStore();
    for (let i = 0; i < 5; i += 1) {
      await mem.upsertActiveWorkItem(store, {
        user_scope_key: "usuario:9",
        planta_id: 1,
        entity_key: `puebla|c${i}`,
        entity_display: `Cliente ${i}`,
        parent_intent: "plant_diagnosis",
        pending_information_gap: { missing_fields: [`gap_${i}`], why_blocks: "x" },
      });
    }
    await mem.upsertActiveWorkItem(store, {
      user_scope_key: "usuario:10",
      planta_id: 1,
      entity_key: "puebla|arturo",
      entity_display: "Arturo Lopez",
      parent_intent: "plant_diagnosis",
      pending_information_gap: { missing_fields: ["otro"], why_blocks: "x" },
    });
    const mine = await mem.retrieveActiveWorkItems(store, { userScopeKey: "usuario:9", plantaId: 1 });
    assert.equal(mine.length, 3);
    assert.ok(mine.every((x) => x.user_scope_key === "usuario:9"));
    const otherPlant = await mem.retrieveActiveWorkItems(store, { userScopeKey: "usuario:9", plantaId: 2 });
    assert.equal(otherPlant.length, 0);
  });

  it("lifecycle resolve / supersede / stale / dismiss", async () => {
    const store = mem.createInMemoryStore();
    const item = await mem.upsertActiveWorkItem(store, {
      user_scope_key: "usuario:9",
      planta_id: 1,
      entity_key: "puebla|arturo",
      entity_display: "Arturo Lopez",
      parent_intent: "plant_diagnosis",
      pending_information_gap: { missing_fields: ["hecho_que_explique_el_movimiento_comercial"], why_blocks: "x" },
    });
    assert.equal((await mem.updateWorkItemStatus(store, item.id, "resolved")).status, "resolved");
    const item2 = await mem.upsertActiveWorkItem(store, {
      user_scope_key: "usuario:9",
      planta_id: 1,
      entity_key: "puebla|arturo",
      entity_display: "Arturo Lopez",
      parent_intent: "plant_diagnosis",
      pending_information_gap: { missing_fields: ["hecho_que_explique_el_movimiento_comercial"], why_blocks: "x" },
    });
    assert.equal((await mem.updateWorkItemStatus(store, item2.id, "superseded")).status, "superseded");
    const item3 = await mem.upsertActiveWorkItem(store, {
      user_scope_key: "usuario:9",
      planta_id: 1,
      entity_key: "puebla|arturo",
      entity_display: "Arturo Lopez",
      parent_intent: "plant_diagnosis",
      pending_information_gap: { missing_fields: ["otro_gap"], why_blocks: "x" },
    });
    assert.equal((await mem.updateWorkItemStatus(store, item3.id, "stale")).status, "stale");
    const item4 = await mem.upsertActiveWorkItem(store, {
      user_scope_key: "usuario:9",
      planta_id: 1,
      entity_key: "puebla|otro",
      entity_display: "Otro",
      parent_intent: "plant_diagnosis",
      pending_information_gap: { missing_fields: ["z"], why_blocks: "x" },
    });
    const dismissed = await mem.dismissMatching(store, { userScopeKey: "usuario:9", plantaId: 1 });
    assert.equal(dismissed.length, 1);
    assert.equal(dismissed[0].id, item4.id);
    assert.equal(dismissed[0].status, "dismissed");
  });

  it("no crea si falta entidad única / gap / authz", () => {
    const gap = { missing_fields: ["hecho_que_explique_el_movimiento_comercial"], why_blocks: "x" };
    assert.equal(
      mem.shouldAutoCreate({
        parent_intent: "plant_diagnosis",
        plantaAuthorized: true,
        userScopeKey: "usuario:9",
        entity: { display: "Arturo", cliente_key: "puebla|arturo" },
        entityResolutionStatus: "unique",
        gap,
      }),
      true
    );
    assert.equal(
      mem.shouldAutoCreate({
        parent_intent: "plant_diagnosis",
        plantaAuthorized: true,
        userScopeKey: "usuario:9",
        entity: { display: "Arturo" },
        entityResolutionStatus: "ambiguous",
        gap,
      }),
      false
    );
    assert.equal(
      mem.shouldAutoCreate({
        parent_intent: "budget_status",
        plantaAuthorized: true,
        userScopeKey: "usuario:9",
        entity: { display: "Arturo", cliente_key: "k" },
        entityResolutionStatus: "unique",
        gap,
      }),
      false
    );
    assert.equal(mem.isObjectiveGap({ missing_fields: ["dicf:SOURCE_RESTRICTED"] }), false);
  });

  it("authz: memory no concede acceso", () => {
    assert.equal(mem.resolveUserScopeKey({ dashboardAuth: { actor_id: 9 } }, null), "usuario:9");
    assert.equal(mem.isPlantCurrentlyAuthorized({ dashboardAuth: { role: "ZP", actor_id: 9 } }, 1), true);
    assert.equal(
      mem.isPlantCurrentlyAuthorized({ dashboardAuth: { role: "GA", actor_id: 9, plantas_permitidas: [2] } }, 1),
      false
    );
    assert.equal(mem.isPlantCurrentlyAuthorized({ dashboardAuth: { role: "GA", plantas_permitidas: [1] } }, 1), true);
    assert.equal(mem.isPlantCurrentlyAuthorized({}, 1), false);
  });
});

describe("askDirectorIa persistent memory — day1/day2", () => {
  let askDirectorIa;
  let configureDirectorIaChat;
  let store;
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
      persistentMemoryStore: null,
      loadActionPersonBoardForChat: undefined,
      plantCatalog: PUEBLA_CATALOG,
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
      question,
      opts.user
    );
  }

  function wire(loadFn, openaiFn) {
    store = mem.createInMemoryStore();
    let lastUser = "";
    let loads = 0;
    configureDirectorIaChat({
      pool: {},
      persistentMemoryStore: store,
      openaiChat: async (_sys, user) => {
        lastUser = user;
        return openaiFn ? openaiFn(user) : "Hay concentración observada. Sin causa documentada.";
      },
      loadPlantDiagnosisForChat: async (_pool, plantaId) => {
        loads += 1;
        return loadFn(plantaId, loads);
      },
    });
    return {
      get lastUser() {
        return lastUser;
      },
      get loads() {
        return loads;
      },
      store,
    };
  }

  it("día 1 crea pendiente; día 2 retoma, requery y memory != evidence", async () => {
    const ctx = wire(() => assembledArturo());
    const day1 = await run("¿Por qué dejó de comprar Arturo?");
    assert.equal(day1.ok, true);
    assert.equal(day1.context_meta.mode, "plant_diagnosis");
    assert.equal(day1.context_meta.work_item_memory.created, true);
    assert.equal(day1.context_meta.work_item_memory.memory_is_not_evidence, true);
    assert.equal(store._rows.length, 1);
    assert.equal(store._rows[0].status, "active");
    assert.equal(store._rows[0].entity_key, "puebla|arturo");
    assert.equal(store._rows[0].history, undefined);
    assert.equal(store._rows[0].assistant_answer, undefined);
    assert.doesNotMatch(JSON.stringify(store._rows[0]), /Hay concentración observada/);

    const day2 = await run("¿Qué pasó con Arturo?", { history: [], conversation_state: undefined });
    assert.equal(day2.ok, true);
    assert.equal(day2.context_meta.mode, "plant_diagnosis");
    assert.equal(day2.context_meta.work_item_memory.retrieved, true);
    assert.equal(day2.context_meta.work_item_memory.memory_is_not_evidence, true);
    assert.equal(ctx.loads, 2);
    assert.match(ctx.lastUser, /PENDIENTE DE TRABAJO/);
    assert.match(ctx.lastUser, /NO es evidencia/);
    assert.match(ctx.lastUser, /NO afirma el estado actual/);
    assert.doesNotMatch(ctx.lastUser, /Arturo sigue sin comprar/);
    assert.equal(day2.context_meta.conversation_state.planta_id, 1);
    assert.equal(day2.context_meta.conversation_state.parent_intent, "plant_diagnosis");
    assert.equal(day2.context_meta.conversation_state.active_entities[0].display, "Arturo Lopez");
    assert.equal(day2.context_meta.conversation_state.last_evidence_bundle_type, "plant_diagnosis");
  });

  it("dato actual prevalece: acción cerrada → superseded", async () => {
    let n = 0;
    wire((plantaId, loads) => {
      n = loads;
      if (loads === 1) return assembledArturo();
      return assembledArturo({
        latest_action: { responsable: "Ana", public_code: "D-1", estatus: "cerrada" },
        coverage_status: "coverage_unknown",
      });
    });
    await run("¿Por qué dejó de comprar Arturo?");
    const day2 = await run("¿Qué pasó con Arturo?");
    assert.equal(n, 2);
    assert.equal(day2.context_meta.work_item_memory.status, "superseded");
    assert.equal(store._rows.filter((r) => r.status === "superseded").length, 1);
  });

  it("resolved cuando la brecha ya no está en evidencia fresca", async () => {
    wire((_p, loads) => {
      if (loads === 1) return assembledArturo();
      return assembledArturo({
        limitations: [],
        coverage_status: "with_action",
        latest_action: { responsable: "Ana", public_code: "D-1", estatus: "abierta" },
      });
    });
    await run("¿Por qué dejó de comprar Arturo?");
    const day2 = await run("¿Qué pasó con Arturo?");
    assert.equal(day2.context_meta.work_item_memory.status, "resolved");
  });

  it("cross-user no filtra pendientes ajenos", async () => {
    wire(() => assembledArturo());
    await run("¿Por qué dejó de comprar Arturo?", { actor_id: 9 });
    const other = await run("¿Qué pasó con Arturo?", { actor_id: 10, history: [] });
    assert.equal(other.context_meta.work_item_memory && other.context_meta.work_item_memory.retrieved, undefined);
    assert.notEqual(other.context_meta.mode, "plant_diagnosis");
    assert.doesNotMatch(JSON.stringify(other), /hecho_que_explique_el_movimiento_comercial/);
  });

  it("cross-plant no filtra pendientes de otra planta", async () => {
    wire((plantaId) => {
      if (Number(plantaId) !== 1) {
        return {
          ok: true,
          abort: false,
          plant: { planta_id: plantaId },
          limitations: [],
          commercial_materiality: { categories: [] },
          sources: {},
          alignment: { status: "comparable" },
        };
      }
      return assembledArturo();
    });
    await run("¿Por qué dejó de comprar Arturo?", { plantaId: 1 });
    const other = await run("¿Qué pasó con Arturo?", { plantaId: 2, history: [] });
    assert.notEqual(other.context_meta && other.context_meta.work_item_memory && other.context_meta.work_item_memory.retrieved, true);
  });

  it("acceso revocado no revela el pendiente", async () => {
    wire(() => assembledArturo());
    await run("¿Por qué dejó de comprar Arturo?", { role: "GA", actor_id: 9, plantas_permitidas: [1] });
    const denied = await run("¿Qué pasó con Arturo?", {
      role: "GA",
      actor_id: 9,
      plantas_permitidas: [99],
      history: [],
    });
    assert.notEqual(denied.context_meta && denied.context_meta.work_item_memory && denied.context_meta.work_item_memory.retrieved, true);
    assert.doesNotMatch(String(denied.answer || ""), /motivo documentado|hecho_que_explique/);
  });

  it("SOURCE_RESTRICTED actual gana y no usa memoria para saltar authz", async () => {
    wire((_p, loads) => {
      if (loads === 1) return assembledArturo();
      return { abort: true, status: 403, code: "SOURCE_RESTRICTED", error: "Sin acceso a esta planta" };
    });
    await run("¿Por qué dejó de comprar Arturo?");
    const day2 = await run("¿Qué pasó con Arturo?");
    assert.equal(day2.ok, false);
    assert.equal(day2.code, "SOURCE_RESTRICTED");
    assert.equal(day2.status, 403);
    assert.doesNotMatch(JSON.stringify(day2), /Falta un hecho de cobertura/);
  });

  it("dismiss cierra el pendiente; no se retoma", async () => {
    wire(() => assembledArturo());
    await run("¿Por qué dejó de comprar Arturo?");
    const gone = await run("olvida lo de Arturo");
    assert.equal(gone.context_meta.mode, "persistent_memory_dismiss");
    assert.equal(store._rows[0].status, "dismissed");
    const day2 = await run("¿Qué pasó con Arturo?");
    assert.notEqual(day2.context_meta && day2.context_meta.work_item_memory && day2.context_meta.work_item_memory.retrieved, true);
  });

  it("stale si la entidad ya no es única", async () => {
    wire((_p, loads) => {
      const base = assembledArturo();
      if (loads === 1) return base;
      base.commercial_materiality.categories[0].top_clients.push({
        cliente_display: "Arturo Perez",
        cliente_keys: ["puebla|arturo2"],
        coverage_status: "coverage_unknown",
      });
      return base;
    });
    await run("¿Por qué dejó de comprar Arturo?");
    const day2 = await run("¿Qué pasó con Arturo?");
    assert.equal(day2.context_meta.mode, "entity_clarification");
    assert.equal(store._rows[0].status, "stale");
  });

  it("no crea memory en smalltalk ni unknown suelto", async () => {
    wire(() => assembledArturo());
    await run("hola");
    await run("frase suelta sin ancla ni intent");
    assert.equal(store._rows.length, 0);
  });

  it("continuidad efímera sigue funcionando con store inyectado", async () => {
    const ctx = wire(() => assembledArturo());
    const first = await run("¿Cómo va Puebla?");
    assert.equal(first.context_meta.conversation_state.parent_intent, "plant_diagnosis");
    const second = await run("¿Qué te llama la atención?", {
      history: [
        { role: "user", content: "¿Cómo va Puebla?" },
        { role: "assistant", content: first.answer },
      ],
      conversation_state: first.context_meta.conversation_state,
    });
    assert.equal(second.context_meta.mode, "plant_diagnosis");
    assert.equal(ctx.loads, 2);
    assert.equal(store._rows.length, 0);
  });
});
