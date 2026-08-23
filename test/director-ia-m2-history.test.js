"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  detectUnsupportedDirectorIaDomain,
  isDirectorIaDomainReadable,
  SOURCE_NOT_INTEGRATED,
  SOURCE_RESTRICTED,
  DATA_NOT_FOUND,
} = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  getDirectorIaTool,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
} = require("../lib/director-ia-tools");
const { ESTADOS, ETAPA_VISUAL } = require("../lib/director-ia-m2-folio-status");
const {
  FOLIO_HISTORY_SEMANTIC_CLASS,
  SOURCE,
  eventEtapaFromEstatus,
  loadFolioHistoryForChat,
  buildFolioHistoryChatResult,
} = require("../lib/director-ia-m2-history");

const LIB_DIR = path.join(__dirname, "..", "lib");
const HISTORY_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-m2-history.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");

function baseFolio(over = {}) {
  return {
    id: 123,
    numero_folio: "F-202601-001",
    folio_codigo: "F-202601-001",
    planta_id: 1,
    planta_nombre: "Puebla",
    estatus: ESTADOS.COMPROBACIONES,
    creado_por_rol_clave: "ZP",
    solo_zp_ad: false,
    ...over,
  };
}

function folioByNumero(over = {}) {
  return baseFolio({
    id: 456,
    numero_folio: "F-202601-002",
    folio_codigo: "F-202601-002",
    estatus: ESTADOS.EVIDENCIAS,
    ...over,
  });
}

function histEvent(over = {}) {
  return {
    id: 10,
    folio_id: 123,
    numero_folio: "F-202601-001",
    folio_codigo: "F-202601-001",
    estatus: ESTADOS.EVIDENCIAS,
    comentario: "Comentario: evidencia cargada",
    actor_telefono: "5511111111",
    actor_rol: "ZP",
    creado_en: "2026-01-10T10:00:00.000Z",
    ...over,
  };
}

function injectOpts(folioRows, historyRows, extras = {}) {
  const rows = folioRows || [];
  const idMap = new Map(rows.map((r) => [Number(r.id), r]));
  const numMap = new Map(rows.map((r) => [String(r.numero_folio), r]));
  let historyCalls = 0;
  let folioCalls = 0;
  const opts = {
    resolveEquivalentIds: extras.resolveEquivalentIds || ((id) => [Number(id)]),
    getFolioById:
      extras.getFolioById ||
      (async (_c, id) => {
        folioCalls += 1;
        return idMap.get(Number(id)) || null;
      }),
    getFolioByNumero:
      extras.getFolioByNumero ||
      (async (_c, num) => {
        folioCalls += 1;
        return numMap.get(String(num).trim()) || null;
      }),
    listHistorialForFolio:
      extras.listHistorialForFolio ||
      (async () => {
        historyCalls += 1;
        return {
          rows: extras.historyRows || historyRows || [],
          truncated: !!extras.truncated,
          limit: extras.limit || 80,
        };
      }),
    question: extras.question,
    auth: extras.auth,
    limit: extras.limit,
  };
  opts._calls = () => ({ historyCalls, folioCalls });
  return opts;
}

function zpReq() {
  return { dashboardAuth: { role: "ZP" } };
}

function assertNoInventedTransitionFields(event) {
  assert.equal(Object.prototype.hasOwnProperty.call(event, "event_type"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(event, "estatus_anterior"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(event, "estatus_nuevo"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(event, "previous_status"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(event, "new_status"), false);
}

describe("M2 history intent, capability y tool", () => {
  it("folio_history es intent y ya no es SOURCE_NOT_INTEGRATED", () => {
    assert.equal(planDirectorIaQuestion("¿Cuál fue el último movimiento del folio 123?").intent, "folio_history");
    assert.equal(planDirectorIaQuestion("historial del folio 123").intent, "folio_history");
    assert.equal(planDirectorIaQuestion("¿Quién movió el folio 123?").intent, "folio_history");
    assert.equal(planDirectorIaQuestion("¿Quién aprobó el folio 123?").intent, "folio_history");
    assert.equal(detectUnsupportedDirectorIaDomain("¿Cuál fue el último movimiento del folio 123?"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("historial del folio F-202601-001"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("¿Quién movió el folio 123?"), null);
    assert.equal(isDirectorIaDomainReadable("folio_historial"), true);
  });

  it("folio_documents y financial surfaces siguen bloqueados", () => {
    const docs = detectUnsupportedDirectorIaDomain("¿Qué documentos le faltan?");
    assert.ok(docs);
    assert.equal(docs.id, "documentos");
    assert.equal(planDirectorIaQuestion("¿Qué documentos faltan del folio?").intent, "folio_documents");
    const cheque = detectUnsupportedDirectorIaDomain("¿Tiene cheque o depósito?");
    assert.ok(cheque);
    assert.equal(cheque.id, "cheques");
    const poliza = detectUnsupportedDirectorIaDomain("¿Ya tiene póliza?");
    assert.ok(poliza);
    assert.equal(poliza.id, "polizas");
    const budget = detectUnsupportedDirectorIaDomain("¿Cómo va el presupuesto semanal?");
    assert.ok(budget);
    assert.equal(budget.id, "presupuestos");
    assert.equal(isDirectorIaToolExecutable("get_folio_documents"), true);
    assert.equal(isDirectorIaToolExecutable("get_folio_financial_status"), false);
    assert.equal(isDirectorIaToolExecutable("get_budget_status"), false);
  });

  it("no redirige a Action Register ni a M3", () => {
    const plan = planDirectorIaQuestion("¿Cuál fue el último movimiento del folio 123?");
    assert.equal(plan.intent, "folio_history");
    assert.ok(plan.domains.includes("folio_historial"));
    assert.equal(plan.domains.includes("action_register"), false);
    assert.equal(plan.domains.includes("dashboard_kpis"), false);
    assert.notEqual(planDirectorIaQuestion("¿Qué acciones están vencidas?").intent, "folio_history");
    assert.equal(planDirectorIaQuestion("¿Cuáles son los kpis del dashboard?").intent, "dashboard_kpis");
  });

  it("get_folio_history tiene executor read-only", () => {
    const t = getDirectorIaTool("get_folio_history");
    assert.equal(t.executor, "loadFolioHistoryForChat");
    assert.equal(t.readOnly, true);
    assert.equal(t.status, "available_on_demand");
    assert.equal(isDirectorIaToolExecutable("get_folio_history"), true);
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });
});

describe("M2 history semántica observada vs derivada", () => {
  it("estatus mapeable deriva etapa; estatus null no deriva", () => {
    const mapped = eventEtapaFromEstatus(ESTADOS.COMPROBACIONES);
    assert.equal(mapped.estatus, ESTADOS.COMPROBACIONES);
    assert.equal(mapped.etapa, ETAPA_VISUAL.COMPROBACIONES);
    assert.equal(mapped.etapa_derived, true);
    const empty = eventEtapaFromEstatus(null);
    assert.equal(empty.estatus, null);
    assert.equal(empty.etapa, null);
    assert.equal(empty.etapa_derived, false);
    const unknown = eventEtapaFromEstatus("XYZ_UNKNOWN");
    assert.equal(unknown.estatus, "XYZ_UNKNOWN");
    assert.equal(unknown.etapa, null);
    assert.equal(unknown.etapa_derived, false);
  });
});

describe("M2 history loaders", () => {
  it("history por folio id", async () => {
    const folio = baseFolio();
    const ev = histEvent();
    const payload = await loadFolioHistoryForChat(null, 1, zpReq(), {
      ...injectOpts([folio], [ev], { question: "¿Cuál fue el último movimiento del folio 123?" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.lookup, "id");
    assert.equal(payload.folio_id, 123);
    assert.equal(payload.numero_folio, "F-202601-001");
    assert.equal(payload.source, SOURCE);
    assert.equal(payload.semantic_class, FOLIO_HISTORY_SEMANTIC_CLASS);
    assert.equal(payload.count, 1);
    assert.equal(payload.events[0].estatus, ESTADOS.EVIDENCIAS);
    assert.equal(payload.events[0].etapa, ETAPA_VISUAL.EVIDENCIAS);
    assert.equal(payload.events[0].etapa_derived, true);
    assert.equal(payload.events[0].comentario, "Comentario: evidencia cargada");
    assert.equal(payload.events[0].actor_telefono, "5511111111");
    assert.equal(payload.events[0].actor_rol, "ZP");
    assert.equal(payload.events[0].creado_en, "2026-01-10T10:00:00.000Z");
    assertNoInventedTransitionFields(payload.events[0]);
    const chat = buildFolioHistoryChatResult(payload, { planta_id: 1 });
    assert.equal(chat.context_meta.mode, "folio_history");
    assert.equal(chat.context_meta.openai_called, false);
    assert.match(chat.answer, /No es estatus actual, Action Register ni KPIs/i);
    assert.match(chat.answer, /no se interpreta como sistema/i);
    assert.doesNotMatch(chat.answer, /actor del sistema|movido por el sistema/i);
  });

  it("history por numero_folio", async () => {
    const folio = folioByNumero();
    const ev = histEvent({
      folio_id: 456,
      numero_folio: "F-202601-002",
      estatus: ESTADOS.COMPROBACIONES,
    });
    const payload = await loadFolioHistoryForChat(null, 1, zpReq(), {
      ...injectOpts([folio], [ev], { question: "historial del folio F-202601-002" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.lookup, "numero_folio");
    assert.equal(payload.folio_id, 456);
    assert.equal(payload.events[0].estatus, ESTADOS.COMPROBACIONES);
    assert.equal(payload.events[0].etapa, ETAPA_VISUAL.COMPROBACIONES);
    assert.equal(payload.events[0].etapa_derived, true);
  });

  it("múltiples eventos, orden ASC y misma etapa no se deduplica", async () => {
    const folio = baseFolio();
    const events = [
      histEvent({
        id: 31,
        estatus: ESTADOS.EVIDENCIAS,
        creado_en: "2026-01-12T12:00:00.000Z",
        comentario: "tercero",
      }),
      histEvent({
        id: 11,
        estatus: ESTADOS.EVIDENCIAS,
        creado_en: "2026-01-10T10:00:00.000Z",
        comentario: "primero",
      }),
      histEvent({
        id: 21,
        estatus: ESTADOS.EVIDENCIAS,
        creado_en: "2026-01-11T11:00:00.000Z",
        comentario: "segundo",
      }),
    ];
    const payload = await loadFolioHistoryForChat(null, 1, zpReq(), {
      ...injectOpts([folio], events, { question: "historial del folio 123" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 3);
    assert.equal(payload.events[0].comentario, "primero");
    assert.equal(payload.events[1].comentario, "segundo");
    assert.equal(payload.events[2].comentario, "tercero");
    assert.equal(payload.events[0].etapa, ETAPA_VISUAL.EVIDENCIAS);
    assert.equal(payload.events[1].etapa, ETAPA_VISUAL.EVIDENCIAS);
    assert.equal(payload.events[2].etapa, ETAPA_VISUAL.EVIDENCIAS);
    assert.equal(payload.events[0].event_index, 0);
    assert.equal(payload.events[2].event_index, 2);
  });

  it("evento con estatus null se preserva sin etapa derivada", async () => {
    const folio = baseFolio();
    const ev = histEvent({
      estatus: null,
      comentario: "nota sin estatus",
      actor_telefono: null,
      actor_rol: null,
    });
    const payload = await loadFolioHistoryForChat(null, 1, zpReq(), {
      ...injectOpts([folio], [ev], { question: "historial del folio 123" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 1);
    assert.equal(payload.events[0].estatus, null);
    assert.equal(payload.events[0].etapa, null);
    assert.equal(payload.events[0].etapa_derived, false);
    assert.equal(payload.events[0].comentario, "nota sin estatus");
    assert.equal(payload.events[0].actor_telefono, null);
    assert.equal(payload.events[0].actor_rol, null);
    const chat = buildFolioHistoryChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /no se interpreta como sistema/i);
    assert.doesNotMatch(chat.answer, /actor del sistema|movido por el sistema/i);
    assert.doesNotMatch(chat.answer, /estatus_anterior|event_type/i);
    assert.match(chat.answer, /actor no registrado|estatus no registrado/i);
  });

  it("estatus no mapeable no afirma etapa", async () => {
    const folio = baseFolio();
    const ev = histEvent({ estatus: "XYZ_UNKNOWN" });
    const payload = await loadFolioHistoryForChat(null, 1, zpReq(), {
      ...injectOpts([folio], [ev], { question: "historial del folio 123" }),
    });
    assert.equal(payload.events[0].estatus, "XYZ_UNKNOWN");
    assert.equal(payload.events[0].etapa, null);
    assert.equal(payload.events[0].etapa_derived, false);
  });

  it("historial vacío de folio autorizado no es 404", async () => {
    const folio = baseFolio();
    const payload = await loadFolioHistoryForChat(null, 1, zpReq(), {
      ...injectOpts([folio], [], { question: "historial del folio 123" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 0);
    assert.deepEqual(payload.events, []);
    const chat = buildFolioHistoryChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /no hay eventos/i);
    assert.doesNotMatch(chat.answer, /todavía no está integrado/i);
  });

  it("folio inexistente es 404 y no consulta historial", async () => {
    let historyCalls = 0;
    const payload = await loadFolioHistoryForChat(null, 1, zpReq(), {
      ...injectOpts([], [], {
        question: "historial del folio 999",
        listHistorialForFolio: async () => {
          historyCalls += 1;
          throw new Error("no debe consultar historial");
        },
      }),
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 404);
    assert.equal(payload.code, DATA_NOT_FOUND);
    assert.equal(historyCalls, 0);
    const chat = buildFolioHistoryChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /No encontré|no invento/i);
    assert.equal(chat.folio_history, null);
  });

  it("planta no autorizada no resuelve folio ni historial", async () => {
    let folioCalled = false;
    let historyCalled = false;
    const payload = await loadFolioHistoryForChat(
      null,
      2,
      { dashboardAuth: { role: "GG", plantas_permitidas: [1] } },
      {
        ...injectOpts([], [], {
          question: "historial del folio 123",
          getFolioById: async () => {
            folioCalled = true;
            throw new Error("no debe resolver folio");
          },
          listHistorialForFolio: async () => {
            historyCalled = true;
            throw new Error("no debe consultar historial");
          },
        }),
      }
    );
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 403);
    assert.equal(payload.code, SOURCE_RESTRICTED);
    assert.equal(folioCalled, false);
    assert.equal(historyCalled, false);
  });

  it("folio de otra planta es 403 y no consulta historial", async () => {
    let historyCalls = 0;
    const other = baseFolio({ planta_id: 9 });
    const payload = await loadFolioHistoryForChat(null, 1, zpReq(), {
      ...injectOpts([other], [histEvent()], {
        question: "historial del folio 123",
        listHistorialForFolio: async () => {
          historyCalls += 1;
          throw new Error("no debe consultar historial");
        },
      }),
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 403);
    assert.equal(payload.code, SOURCE_RESTRICTED);
    assert.equal(historyCalls, 0);
  });

  it("GA consulta history en planta autorizada; plantas_permitidas se respeta", async () => {
    const ok = await loadFolioHistoryForChat(
      null,
      1,
      { dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      { ...injectOpts([baseFolio()], [histEvent()], { question: "historial del folio 123" }) }
    );
    assert.equal(ok.ok, true);
    assert.equal(ok.count, 1);
    const denied = await loadFolioHistoryForChat(
      null,
      2,
      { dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      { ...injectOpts([baseFolio({ planta_id: 2 })], [histEvent()], { question: "historial del folio 123" }) }
    );
    assert.equal(denied.status, 403);
  });

  it("GV no llega a folio ni historial", async () => {
    let folioCalled = false;
    let historyCalled = false;
    const payload = await loadFolioHistoryForChat(
      null,
      1,
      { dashboardAuth: { role: "GV", plantas_permitidas: [1] } },
      {
        ...injectOpts([], [], {
          question: "historial del folio 123",
          getFolioById: async () => {
            folioCalled = true;
            return baseFolio();
          },
          listHistorialForFolio: async () => {
            historyCalled = true;
            return { rows: [], truncated: false, limit: 80 };
          },
        }),
      }
    );
    assert.equal(payload.status, 403);
    assert.equal(folioCalled, false);
    assert.equal(historyCalled, false);
  });
});

describe("M2 history no mutación / no HTTP / no autoavance / no dedupe", () => {
  it("el módulo history no escribe, no llama HTTP, no autoavanza y no deduplica", () => {
    assert.doesNotMatch(HISTORY_SRC, /\b(INSERT|UPDATE|DELETE)\b/);
    assert.doesNotMatch(HISTORY_SRC, /\bfetch\s*\(/);
    assert.doesNotMatch(HISTORY_SRC, /axios\./);
    assert.doesNotMatch(HISTORY_SRC, /maybeAdvanceFolioToComprobaciones/);
    assert.doesNotMatch(HISTORY_SRC, /dedupeHistorialByStage/);
    assert.doesNotMatch(HISTORY_SRC, /\/api\/dashboard\/kanban/);
    assert.doesNotMatch(HISTORY_SRC, /\/api\/folios\/:id/);
    assert.doesNotMatch(HISTORY_SRC, /\/timeline/);
    assert.doesNotMatch(HISTORY_SRC, /director-ia-real-cycle/);
    assert.doesNotMatch(HISTORY_SRC, /require\(["']\.\/server["']\)/);
  });

  it("el chat cablea folio_history in-process y no usa timeline HTTP", () => {
    assert.match(CHAT_SRC, /intent === "folio_history"/);
    assert.match(CHAT_SRC, /loadFolioHistoryForChat/);
    assert.doesNotMatch(CHAT_SRC, /maybeAdvanceFolioToComprobaciones/);
    assert.doesNotMatch(CHAT_SRC, /\/api\/folios\/:id\/timeline/);
    assert.doesNotMatch(CHAT_SRC, /\/api\/dashboard\/kanban/);
    assert.doesNotMatch(CHAT_SRC, /dedupeHistorialByStage/);
  });
});

describe("M2 history chat end-to-end in-process", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  function poolWith(folioRows, historyRows) {
    const rows = folioRows || [baseFolio()];
    const events = historyRows || [histEvent()];
    return {
      connect: async () => ({
        query: async (sql, params) => {
          if (/FROM public\.plantas/.test(sql)) {
            return { rows: [{ id: 1, nombre: "Puebla", clave: "E7" }] };
          }
          if (/FROM public\.folios/.test(sql) && /f\.id = \$1/.test(sql)) {
            return { rows: rows.filter((r) => Number(r.id) === Number(params[0])) };
          }
          if (/FROM public\.folios/.test(sql) && /numero_folio = \$1/.test(sql)) {
            return { rows: rows.filter((r) => r.numero_folio === params[0]) };
          }
          if (/FROM public\.folio_historial/.test(sql)) {
            return { rows: events };
          }
          return { rows: [] };
        },
        release() {},
      }),
    };
  }

  it("pregunta de historial llega al executor y no a SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cuál fue el último movimiento del folio 123?"
    );
    assert.equal(result.ok, true);
    assert.notEqual(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.mode, "folio_history");
    assert.equal(result.context_meta.openai_called, false);
    assert.equal(result.context_meta.semantic_class, FOLIO_HISTORY_SEMANTIC_CLASS);
    assert.ok(result.folio_history);
    assert.equal(result.folio_history.folio_id, 123);
    assert.equal(result.folio_history.count, 1);
    assert.equal(result.folio_history.events[0].estatus, ESTADOS.EVIDENCIAS);
    assert.doesNotMatch(result.answer, /todavía no está integrado/i);
    assert.match(result.answer, /No es estatus actual, Action Register ni KPIs/i);
    assert.match(result.answer, /no se interpreta como sistema/i);
    assert.doesNotMatch(result.answer, /actor del sistema|movido por el sistema/i);
  });

  it("historial por numero_folio no cae a M3 ni AR", async () => {
    configureDirectorIaChat({
      pool: poolWith([folioByNumero()], [histEvent({ folio_id: 456, numero_folio: "F-202601-002" })]),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "historial del folio F-202601-002"
    );
    assert.equal(result.context_meta.mode, "folio_history");
    assert.notEqual(result.context_meta.mode, "dashboard_kpis");
    assert.notEqual(result.context_meta.mode, "duplicate_folios");
    assert.equal(result.folio_history.numero_folio, "F-202601-002");
    assert.equal(result.context_meta.openai_called, false);
  });

  it("documentos siguen SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Qué documentos le faltan?"
    );
    assert.equal(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.requested_domain, "documentos");
  });

  it("cheque y presupuesto siguen SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const cheque = await askDirectorIa({ body: {}, dashboardAuth: { role: "ZP" } }, 1, "¿Tiene cheque o depósito?");
    assert.equal(cheque.limitation && cheque.limitation.code, SOURCE_NOT_INTEGRATED);
    const budget = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo va el presupuesto semanal?"
    );
    assert.equal(budget.limitation && budget.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(budget.context_meta.requested_domain, "presupuestos");
  });
});
