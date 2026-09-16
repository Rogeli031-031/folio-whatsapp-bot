"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  resolveActorIdFromAuth,
  sanitizeNombrePersona,
  stripLeadingHonorific,
  nombrePersonaForGreeting,
  classifyGreetingKind,
  buildIdentityGreeting,
  loadNombrePersonaByActorId,
  resolveGreetingIdentity,
} = require("../lib/director-ia-authenticated-user");
const {
  classifyConversationalIntent,
  buildConversationalAnswer,
} = require("../lib/director-ia-chat");
const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isExpenseAnalyticsQuestion } = require("../lib/director-ia-expense-analytics");
const {
  NEED_TYPES,
  resolveExecutiveNeed,
  isExecutiveStatusQuestion,
  isDiagnosisObservationRiskQuestion,
} = require("../lib/director-ia-conversational-executive-layer");
const mem = require("../lib/director-ia-persistent-memory");

const ROOT = path.join(__dirname, "..");
const AUTH_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-authenticated-user.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");

function usersPool(byId) {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      const id = Number(params && params[0]);
      const row = byId[id];
      if (row === undefined) return { rows: [] };
      return { rows: [row] };
    },
  };
}

describe("identidad de saludo — helper", () => {
  it("actor_id solo sale de dashboardAuth, no de body ni user suelto", () => {
    assert.equal(resolveActorIdFromAuth({ dashboardAuth: { actor_id: 12 } }), 12);
    assert.equal(resolveActorIdFromAuth({ dashboardAuth: { actor_id: "0" } }), null);
    assert.equal(resolveActorIdFromAuth({ body: { actor_id: 99 }, user: { actor_id: 88 } }), null);
    assert.equal(resolveActorIdFromAuth({ dashboardUser: { id: 7 } }), null);
  });

  it("nombre_persona se recorta; vacío o corto no sirve", () => {
    assert.equal(sanitizeNombrePersona("  Luis Zaragoza  "), "Luis Zaragoza");
    assert.equal(sanitizeNombrePersona("Ing. Luis Rogelio Zaragoza"), "Ing. Luis Rogelio Zaragoza");
    assert.equal(sanitizeNombrePersona(""), null);
    assert.equal(sanitizeNombrePersona(" "), null);
    assert.equal(sanitizeNombrePersona("A"), null);
    assert.equal(sanitizeNombrePersona(null), null);
  });

  it("vocativo quita honorífico solo al inicio; no toca el persistido", () => {
    assert.equal(stripLeadingHonorific("Ing. Luis Rogelio Zaragoza"), "Luis Rogelio Zaragoza");
    assert.equal(stripLeadingHonorific("Ing Luis Rogelio Zaragoza"), "Luis Rogelio Zaragoza");
    assert.equal(stripLeadingHonorific("Ingeniero Luis Rogelio Zaragoza"), "Luis Rogelio Zaragoza");
    assert.equal(stripLeadingHonorific("Lic. Ana Pérez"), "Ana Pérez");
    assert.equal(stripLeadingHonorific("Lic Ana Pérez"), "Ana Pérez");
    assert.equal(stripLeadingHonorific("Licenciado Ana Pérez"), "Ana Pérez");
    assert.equal(stripLeadingHonorific("Dr. Carlos Ruiz"), "Carlos Ruiz");
    assert.equal(stripLeadingHonorific("Dr Carlos Ruiz"), "Carlos Ruiz");
    assert.equal(stripLeadingHonorific("Doctor Carlos Ruiz"), "Carlos Ruiz");
    assert.equal(stripLeadingHonorific("Dra. María Soto"), "María Soto");
    assert.equal(stripLeadingHonorific("Dra María Soto"), "María Soto");
    assert.equal(stripLeadingHonorific("Doctora María Soto"), "María Soto");
    assert.equal(stripLeadingHonorific("Arq. Elena Díaz"), "Elena Díaz");
    assert.equal(stripLeadingHonorific("Arq Elena Díaz"), "Elena Díaz");
    assert.equal(stripLeadingHonorific("Arquitecto Elena Díaz"), "Elena Díaz");
    assert.equal(stripLeadingHonorific("Arquitecta Elena Díaz"), "Elena Díaz");
    assert.equal(stripLeadingHonorific("Luis Rogelio Zaragoza"), "Luis Rogelio Zaragoza");
    assert.equal(stripLeadingHonorific("Ingrid Garcia"), "Ingrid Garcia");
    assert.equal(stripLeadingHonorific("Draco Perez"), "Draco Perez");
    assert.equal(nombrePersonaForGreeting("Ing. Luis Rogelio Zaragoza"), "Luis Rogelio Zaragoza");
    assert.equal(sanitizeNombrePersona("Ing. Luis Rogelio Zaragoza"), "Ing. Luis Rogelio Zaragoza");
  });

  it("SQL de lookup pide solo nombre_persona por id", () => {
    assert.match(AUTH_SRC, /SELECT nombre_persona FROM public\.usuarios WHERE id = \$1 LIMIT 1/);
    assert.doesNotMatch(AUTH_SRC, /SELECT[\s\S]*\bnombre\b[\s\S]*FROM public\.usuarios/);
    assert.match(CHAT_SRC, /resolveGreetingIdentity/);
  });
});

describe("contrato de texto de saludo", () => {
  it("hola / buenos días / tardes / noches con y sin nombre", () => {
    assert.equal(
      buildIdentityGreeting("hola", "Luis Zaragoza"),
      "Hola, Luis Zaragoza. ¿En qué te ayudo?"
    );
    assert.equal(
      buildIdentityGreeting("buenos_dias", "Luis Zaragoza"),
      "Buenos días, Luis Zaragoza. ¿En qué te ayudo?"
    );
    assert.equal(
      buildIdentityGreeting("buenas_tardes", "Luis Zaragoza"),
      "Buenas tardes, Luis Zaragoza. ¿En qué te ayudo?"
    );
    assert.equal(
      buildIdentityGreeting("buenas_noches", "Luis Zaragoza"),
      "Buenas noches, Luis Zaragoza. ¿En qué te ayudo?"
    );
    assert.equal(
      buildIdentityGreeting("hola", "Ing. Luis Rogelio Zaragoza"),
      "Hola, Luis Rogelio Zaragoza. ¿En qué te ayudo?"
    );
    assert.equal(buildIdentityGreeting("hola", null), "Hola. ¿En qué te ayudo?");
    assert.equal(buildIdentityGreeting("buenos_dias", ""), "Buenos días. ¿En qué te ayudo?");
    assert.equal(buildIdentityGreeting("buen_dia", "Ana"), "Buen día, Ana. ¿En qué te ayudo?");
  });

  it("utterance decide el eco; no hay Date/clock en el helper", () => {
    assert.equal(classifyGreetingKind("buenos dias"), "buenos_dias");
    assert.equal(classifyGreetingKind("buenas tardes"), "buenas_tardes");
    assert.equal(classifyGreetingKind("hola"), "hola");
    assert.equal(classifyGreetingKind("que tal"), "hola");
    assert.doesNotMatch(AUTH_SRC, /\bnew Date\b|\bgetHours\b|\bDate\.now\b/);
  });

  it("classifyConversationalIntent expone greeting_kind", () => {
    assert.equal(classifyConversationalIntent("hola").greeting_kind, "hola");
    assert.equal(classifyConversationalIntent("Buenos días").greeting_kind, "buenos_dias");
    assert.equal(classifyConversationalIntent("buenas tardes").greeting_kind, "buenas_tardes");
    assert.equal(classifyConversationalIntent("buenas noches").greeting_kind, "buenas_noches");
    assert.equal(classifyConversationalIntent("qué tal").mode, "smalltalk");
  });
});

describe("askDirectorIa — saludo por actor_id", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({ pool: null, persistentMemoryStore: null, openaiChat: undefined });
  });

  function reqFor(actorId, over = {}) {
    return {
      body: { planta_nombre: over.planta_nombre || "Acapulco", ...(over.body || {}) },
      dashboardAuth: {
        role: over.role || "ZP",
        actor_id: actorId,
        actor_nombre: over.actor_nombre,
      },
    };
  }

  it("hola quita Ing. del vocativo y no cambia el persistido", async () => {
    configureDirectorIaChat({
      pool: usersPool({ 10: { nombre_persona: "Ing. Luis Rogelio Zaragoza" } }),
    });
    const result = await askDirectorIa(reqFor(10), 1, "hola");
    assert.equal(result.answer, "Hola, Luis Rogelio Zaragoza. ¿En qué te ayudo?");
    assert.doesNotMatch(result.answer, /\bIng\.?\b|Ingeniero/);
    const persisted = await loadNombrePersonaByActorId(
      usersPool({ 10: { nombre_persona: "Ing. Luis Rogelio Zaragoza" } }),
      10
    );
    assert.equal(persisted, "Ing. Luis Rogelio Zaragoza");
  });

  it("1 hola + nombre_persona", async () => {
    configureDirectorIaChat({
      pool: usersPool({ 10: { nombre_persona: "Luis Zaragoza" } }),
    });
    const result = await askDirectorIa(reqFor(10), 1, "hola");
    assert.equal(result.ok, true);
    assert.equal(result.answer, "Hola, Luis Zaragoza. ¿En qué te ayudo?");
  });

  it("2 buenos días + nombre", async () => {
    configureDirectorIaChat({
      pool: usersPool({ 10: { nombre_persona: "Luis Zaragoza" } }),
    });
    const result = await askDirectorIa(reqFor(10), 1, "Buenos días");
    assert.equal(result.answer, "Buenos días, Luis Zaragoza. ¿En qué te ayudo?");
  });

  it("3 buenas tardes + nombre", async () => {
    configureDirectorIaChat({
      pool: usersPool({ 10: { nombre_persona: "Luis Zaragoza" } }),
    });
    const result = await askDirectorIa(reqFor(10), 1, "buenas tardes");
    assert.equal(result.answer, "Buenas tardes, Luis Zaragoza. ¿En qué te ayudo?");
  });

  it("4 buenas noches + nombre", async () => {
    configureDirectorIaChat({
      pool: usersPool({ 10: { nombre_persona: "Luis Zaragoza" } }),
    });
    const result = await askDirectorIa(reqFor(10), 1, "buenas noches");
    assert.equal(result.answer, "Buenas noches, Luis Zaragoza. ¿En qué te ayudo?");
  });

  it("5 usuario sin nombre", async () => {
    configureDirectorIaChat({
      pool: usersPool({ 11: { nombre_persona: null } }),
    });
    const result = await askDirectorIa(reqFor(11), 1, "hola");
    assert.equal(result.answer, "Hola. ¿En qué te ayudo?");
  });

  it("6 lookup fallido no rompe el chat", async () => {
    configureDirectorIaChat({
      pool: {
        query: async () => {
          throw new Error("db down");
        },
      },
    });
    const result = await askDirectorIa(reqFor(10), 1, "hola");
    assert.equal(result.ok, true);
    assert.equal(result.answer, "Hola. ¿En qué te ayudo?");
  });

  it("7 dos usuarios distintos no se cruzan", async () => {
    const pool = usersPool({
      10: { nombre_persona: "Ana Pérez" },
      20: { nombre_persona: "Carlos Ruiz" },
    });
    configureDirectorIaChat({ pool });
    const a = await askDirectorIa(reqFor(10), 1, "hola");
    const b = await askDirectorIa(reqFor(20), 1, "hola");
    assert.equal(a.answer, "Hola, Ana Pérez. ¿En qué te ayudo?");
    assert.equal(b.answer, "Hola, Carlos Ruiz. ¿En qué te ayudo?");
    assert.doesNotMatch(a.answer, /Carlos/);
    assert.doesNotMatch(b.answer, /Ana/);
    assert.equal(Number(pool.calls[0].params[0]), 10);
    assert.equal(Number(pool.calls[1].params[0]), 20);
  });

  it("8 memoria no reemplaza identidad autenticada", async () => {
    const store = mem.createInMemoryStore();
    const gap = { missing_fields: ["x"], why_blocks: "gap" };
    await store.upsertActive({
      user_scope_key: "usuario:99",
      planta_id: 1,
      entity_key: "name:otro",
      entity_display: "Usuario B Inventado",
      parent_intent: "client_profile",
      pending_information_gap: gap,
      gap_fingerprint: mem.gapFingerprint(gap),
    });
    configureDirectorIaChat({
      pool: usersPool({ 10: { nombre_persona: "Luis Zaragoza" } }),
      persistentMemoryStore: store,
    });
    const result = await askDirectorIa(reqFor(10, { role: "ZP" }), 1, "hola");
    assert.equal(result.answer, "Hola, Luis Zaragoza. ¿En qué te ayudo?");
    assert.doesNotMatch(result.answer, /Usuario B Inventado/);
    assert.equal(mem.classifyPersistentMemoryTurn("hola").kind, "none");
  });

  it("9 planta no aparece en hola", async () => {
    configureDirectorIaChat({
      pool: usersPool({ 10: { nombre_persona: "Luis Zaragoza" } }),
    });
    const result = await askDirectorIa(reqFor(10, { planta_nombre: "Acapulco" }), 1, "hola");
    assert.doesNotMatch(result.answer, /Acapulco/);
    assert.doesNotMatch(result.answer, /Estoy en/);
  });

  it("10 role no aparece como tratamiento", async () => {
    configureDirectorIaChat({
      pool: usersPool({ 10: { nombre_persona: "Luis Zaragoza" } }),
    });
    const result = await askDirectorIa(reqFor(10, { role: "ZP", actor_nombre: "Director ZP" }), 1, "hola");
    assert.doesNotMatch(result.answer, /\bZP\b|Director|Ingeniero|Gerente/);
    assert.equal(result.answer, "Hola, Luis Zaragoza. ¿En qué te ayudo?");
  });

  it("11 puesto / JWT actor_nombre no sustituyen nombre_persona", async () => {
    const pool = {
      query: async (_sql, params) => {
        assert.equal(Number(params[0]), 10);
        return { rows: [{ nombre_persona: "", nombre: "Gerente Operaciones" }] };
      },
    };
    configureDirectorIaChat({ pool });
    const result = await askDirectorIa(
      reqFor(10, { actor_nombre: "Gerente Operaciones" }),
      1,
      "hola"
    );
    assert.equal(result.answer, "Hola. ¿En qué te ayudo?");
    assert.doesNotMatch(result.answer, /Gerente|puesto|Ingeniero/);
  });

  it("12 smalltalk help/thanks sin regresión de modo", async () => {
    configureDirectorIaChat({
      pool: {
        query: async (sql) => {
          if (/FROM public\.plantas/i.test(String(sql))) {
            return { rows: [{ nombre: "Acapulco", clave: "E3" }] };
          }
          return { rows: [{ nombre_persona: "Luis Zaragoza" }] };
        },
      },
    });
    const help = await askDirectorIa(reqFor(10), 1, "ayuda");
    assert.match(help.answer, /¿Cómo va mantenimiento\?/);
    assert.match(help.answer, /Acapulco/);
    const thanks = await askDirectorIa(reqFor(10), 1, "gracias");
    assert.match(thanks.answer, /Con gusto/);
    assert.doesNotMatch(thanks.answer, /Estoy en/);
  });

  it("13 consulta operativa no es saludo; planta sigue en el body", async () => {
    assert.equal(classifyConversationalIntent("cómo va mantenimiento"), null);
    assert.equal(classifyConversationalIntent("hola, cómo va mantenimiento"), null);
    const req = reqFor(10, { planta_nombre: "Acapulco" });
    assert.equal(req.body.planta_nombre, "Acapulco");
  });
});

describe("regresión EXECUTIVE_STATUS / DIAGNOSIS / PERFORMANCE", () => {
  it("14 EXECUTIVE_STATUS: cómo vamos no es smalltalk", () => {
    assert.equal(classifyConversationalIntent("¿Cómo vamos?"), null);
    assert.equal(isExecutiveStatusQuestion("¿Cómo vamos?"), true);
    assert.equal(resolveExecutiveNeed("¿Cómo vamos?").need_type, NEED_TYPES.EXECUTIVE_STATUS);
  });

  it("15 DIAGNOSIS: preocupación no es smalltalk", () => {
    const q = "qué está fallando";
    assert.equal(classifyConversationalIntent(q), null);
    assert.equal(isDiagnosisObservationRiskQuestion(q), true);
    assert.equal(resolveExecutiveNeed(q).need_type, NEED_TYPES.DIAGNOSIS_OBSERVATION_RISK);
    assert.notEqual(resolveExecutiveNeed(q).greeting, true);
  });

  it("16 PERFORMANCE: venta/meta no es smalltalk", () => {
    const q = "cómo va la venta contra la meta";
    assert.equal(classifyConversationalIntent(q), null);
    const plan = planDirectorIaQuestion(q);
    assert.ok(plan && plan.intent);
    assert.ok(detectDirectorIaIntent(q));
  });

  it("Expense Analytics no es smalltalk", () => {
    const q = "¿Cuánto gasté en Taller en agosto?";
    assert.equal(classifyConversationalIntent(q), null);
    assert.equal(isExpenseAnalyticsQuestion(q), true);
    assert.equal(planDirectorIaQuestion(q).intent, "expense_analytics");
  });

  it("buildConversationalAnswer smalltalk ignora planta", () => {
    const text = buildConversationalAnswer("smalltalk", "Acapulco", {
      greeting_kind: "hola",
      nombre_persona: "Luis Zaragoza",
    });
    assert.equal(text, "Hola, Luis Zaragoza. ¿En qué te ayudo?");
    assert.doesNotMatch(text, /Acapulco|Ingeniero|Estoy en/);
  });
});
