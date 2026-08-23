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
const {
  FOLIO_STATUS_SEMANTIC_CLASS,
  SOURCE,
  ESTADOS,
  ETAPA_VISUAL,
  estatusToEtapaVisual,
  etapaVisualToEstatusTecnicos,
  assertFolioStatusAccess,
  projectFolioCard,
  parseFolioRefs,
  parseEtapaFromQuestion,
  loadFolioStatusForChat,
  buildFolioStatusChatResult,
} = require("../lib/director-ia-m2-folio-status");

const LIB_DIR = path.join(__dirname, "..", "lib");
const M2_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-m2-folio-status.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");

function baseFolio(over = {}) {
  return {
    id: 123,
    numero_folio: "F-202601-001",
    folio_codigo: "F-202601-001",
    planta_id: 1,
    planta_nombre: "Puebla",
    estatus: ESTADOS.COMPROBACIONES,
    categoria: "MANTENIMIENTO",
    importe: 1500,
    creado_en: "2026-01-15T00:00:00.000Z",
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

function injectOpts(rowsById, rowsByNumero, extras = {}) {
  const idMap = new Map((rowsById || []).map((r) => [Number(r.id), r]));
  const numMap = new Map((rowsByNumero || []).map((r) => [String(r.numero_folio), r]));
  return {
    resolvePlanta: extras.resolvePlanta || (async () => ({ id: 1, nombre: "Puebla", clave: "E7" })),
    resolveEquivalentIds: extras.resolveEquivalentIds || ((id) => [Number(id)]),
    getFolioById: extras.getFolioById || (async (_c, id) => idMap.get(Number(id)) || null),
    getFolioByNumero: extras.getFolioByNumero || (async (_c, num) => numMap.get(String(num).trim()) || null),
    getManyFoliosStatus:
      extras.getManyFoliosStatus ||
      (async (_c, numeros) =>
        (numeros || []).map((numero) => ({
          numero,
          folio: numMap.get(String(numero).trim()) || null,
        }))),
    listFoliosByPlanta:
      extras.listFoliosByPlanta ||
      (async () => ({
        rows: extras.listRows || [],
        truncated: !!extras.truncated,
        limit: 40,
      })),
    question: extras.question,
    auth: extras.auth,
    limit: extras.limit,
  };
}

function zpReq() {
  return { dashboardAuth: { role: "ZP" } };
}

describe("M2 intent, capability y tool", () => {
  it("folio_status es intent y ya no es SOURCE_NOT_INTEGRATED", () => {
    assert.equal(planDirectorIaQuestion("¿En qué etapa está el folio 123?").intent, "folio_status");
    assert.equal(planDirectorIaQuestion("¿Cuál es el estatus del folio 123?").intent, "folio_status");
    assert.equal(planDirectorIaQuestion("listar folios de la planta").intent, "folio_status");
    assert.equal(planDirectorIaQuestion("folios en evidencias").intent, "folio_status");
    assert.equal(detectUnsupportedDirectorIaDomain("¿En qué etapa está el folio 123?"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("listar folios de la planta"), null);
    assert.equal(isDirectorIaDomainReadable("folios"), true);
    assert.equal(isDirectorIaDomainReadable("kanban"), true);
  });

  it("history ya es consultable; documents siguen no integrados", () => {
    assert.equal(detectUnsupportedDirectorIaDomain("¿Cuál fue el último movimiento del folio 123?"), null);
    assert.equal(planDirectorIaQuestion("¿Cuál fue el último movimiento del folio 123?").intent, "folio_history");
    const docs = detectUnsupportedDirectorIaDomain("¿Qué documentos le faltan?");
    assert.ok(docs);
    assert.equal(docs.id, "documentos");
    assert.equal(planDirectorIaQuestion("¿Qué documentos faltan del folio?").intent, "folio_documents");
    assert.equal(isDirectorIaToolExecutable("get_folio_history"), true);
    assert.equal(isDirectorIaToolExecutable("get_folio_documents"), true);
  });

  it("no redirige a Action Register ni a M3", () => {
    const plan = planDirectorIaQuestion("¿En qué etapa está el folio 123?");
    assert.equal(plan.intent, "folio_status");
    assert.ok(plan.domains.includes("folios") || plan.domains.includes("kanban"));
    assert.equal(plan.domains.includes("action_register"), false);
    assert.equal(plan.domains.includes("dashboard_kpis"), false);
    assert.equal(planDirectorIaQuestion("¿Cuáles son los kpis del dashboard?").intent, "dashboard_kpis");
    assert.notEqual(planDirectorIaQuestion("¿Qué acciones están vencidas?").intent, "folio_status");
  });

  it("get_folio_status tiene executor read-only", () => {
    const t = getDirectorIaTool("get_folio_status");
    assert.equal(t.executor, "loadFolioStatusForChat");
    assert.equal(t.readOnly, true);
    assert.equal(t.status, "available_on_demand");
    assert.equal(isDirectorIaToolExecutable("get_folio_status"), true);
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });
});

describe("M2 semántica estatus vs etapa", () => {
  it("estatus observado y etapa derivada no son la misma cosa", () => {
    assert.equal(estatusToEtapaVisual(ESTADOS.COMPROBACIONES), ETAPA_VISUAL.COMPROBACIONES);
    assert.equal(estatusToEtapaVisual(ESTADOS.APROBADO_ZP), ETAPA_VISUAL.CARRO_COMPRA);
    assert.equal(estatusToEtapaVisual(ESTADOS.PAGADO), ETAPA_VISUAL.DEPOSITO_CIERRE);
    const card = projectFolioCard(baseFolio({ estatus: ESTADOS.APROBADO_ZP }));
    assert.equal(card.estatus, ESTADOS.APROBADO_ZP);
    assert.equal(card.etapa, ETAPA_VISUAL.CARRO_COMPRA);
    assert.equal(card.etapa_defaulted, false);
    assert.notEqual(card.estatus, card.etapa);
  });

  it("null/vacío no inventa estatus; etapa default se declara", () => {
    const card = projectFolioCard(baseFolio({ estatus: null }));
    assert.equal(card.estatus, null);
    assert.equal(card.etapa, ETAPA_VISUAL.PENDIENTE_APROB_PLANTA);
    assert.equal(card.etapa_defaulted, true);
  });

  it("estatus unknown se observa y no se inventa otro valor", () => {
    const card = projectFolioCard(baseFolio({ estatus: "XYZ_UNKNOWN" }));
    assert.equal(card.estatus, "XYZ_UNKNOWN");
    assert.equal(card.etapa, estatusToEtapaVisual("XYZ_UNKNOWN"));
    assert.equal(card.etapa_defaulted, false);
  });

  it("filtro de etapa usa mapper existente", () => {
    const tecnicos = etapaVisualToEstatusTecnicos(ETAPA_VISUAL.EVIDENCIAS);
    assert.deepEqual(tecnicos, [ESTADOS.EVIDENCIAS]);
    assert.equal(parseEtapaFromQuestion("folios en evidencias"), ETAPA_VISUAL.EVIDENCIAS);
    assert.equal(parseEtapaFromQuestion("folios en carro"), ETAPA_VISUAL.CARRO_COMPRA);
    assert.equal(parseEtapaFromQuestion("folios en comprobaciones"), ETAPA_VISUAL.COMPROBACIONES);
  });
});

describe("M2 parseo de identificadores", () => {
  it("detecta id, numero_folio y varios", () => {
    assert.deepEqual(parseFolioRefs("¿En qué etapa está el folio 123?").ids, [123]);
    assert.deepEqual(parseFolioRefs("estatus de F-202601-001").numeros, ["F-202601-001"]);
    assert.deepEqual(parseFolioRefs("folio 123 y folio 456").ids, [123, 456]);
    assert.deepEqual(parseFolioRefs("folios 123 y 456").ids, [123, 456]);
    assert.deepEqual(parseFolioRefs("F-202601-001 y F-202601-002").numeros, [
      "F-202601-001",
      "F-202601-002",
    ]);
  });
});

describe("M2 authz", () => {
  it("GV queda bloqueado; GA permitido en planta autorizada", () => {
    const gv = assertFolioStatusAccess({ role: "GV", plantas_permitidas: [1] }, 1);
    assert.equal(gv.ok, false);
    assert.equal(gv.status, 403);
    assert.equal(gv.code, SOURCE_RESTRICTED);
    const gaOk = assertFolioStatusAccess({ role: "GA", plantas_permitidas: [1] }, 1);
    assert.equal(gaOk.ok, true);
    const gaDenied = assertFolioStatusAccess({ role: "GA", plantas_permitidas: [1] }, 2);
    assert.equal(gaDenied.ok, false);
    assert.equal(gaDenied.status, 403);
  });

  it("plantas_permitidas fail-closed para GG", () => {
    const denied = assertFolioStatusAccess({ role: "GG", plantas_permitidas: [1] }, 2);
    assert.equal(denied.ok, false);
    assert.equal(denied.code, SOURCE_RESTRICTED);
  });
});

describe("M2 loaders SELECT-only", () => {
  it("folio por id", async () => {
    const payload = await loadFolioStatusForChat(null, 1, zpReq(), {
      ...injectOpts([baseFolio()], [baseFolio()], {
        question: "¿En qué etapa está el folio 123?",
      }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.mode, "single");
    assert.equal(payload.lookup, "id");
    assert.equal(payload.folio.folio_id, 123);
    assert.equal(payload.folio.estatus, ESTADOS.COMPROBACIONES);
    assert.equal(payload.folio.etapa, ETAPA_VISUAL.COMPROBACIONES);
    assert.equal(payload.source, SOURCE);
    assert.ok(payload.retrieved_at);
    const chat = buildFolioStatusChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /COMPROBACIONES|Comprobaciones/);
    assert.match(chat.answer, /estatus observado/i);
    assert.doesNotMatch(chat.answer, /Action Register|IGF|KPI/i);
    assert.equal(chat.context_meta.mode, "folio_status");
    assert.equal(chat.context_meta.openai_called, false);
    assert.equal(chat.folio_status.folio.folio_id, 123);
  });

  it("folio por numero_folio", async () => {
    const row = folioByNumero();
    const payload = await loadFolioStatusForChat(null, 1, zpReq(), {
      ...injectOpts([row], [row], { question: "estatus de F-202601-002" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.lookup, "numero_folio");
    assert.equal(payload.folio.numero_folio, "F-202601-002");
    assert.equal(payload.folio.estatus, ESTADOS.EVIDENCIAS);
    assert.equal(payload.folio.etapa, ETAPA_VISUAL.EVIDENCIAS);
  });

  it("varios folios por numero", async () => {
    const a = baseFolio();
    const b = folioByNumero();
    const payload = await loadFolioStatusForChat(null, 1, zpReq(), {
      ...injectOpts([a, b], [a, b], { question: "F-202601-001 y F-202601-002" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.mode, "many");
    assert.equal(payload.count, 2);
    assert.equal(payload.folios[0].estatus, ESTADOS.COMPROBACIONES);
    assert.equal(payload.folios[1].estatus, ESTADOS.EVIDENCIAS);
  });

  it("varios folios por id", async () => {
    const a = baseFolio();
    const b = folioByNumero({ id: 456, planta_id: 1 });
    const payload = await loadFolioStatusForChat(null, 1, zpReq(), {
      ...injectOpts([a, b], [a, b], { question: "folio 123 y folio 456" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.mode, "many");
    assert.equal(payload.count, 2);
  });

  it("listado por planta", async () => {
    const payload = await loadFolioStatusForChat(null, 1, zpReq(), {
      ...injectOpts([], [], {
        question: "listar folios de la planta",
        listRows: [baseFolio(), folioByNumero()],
      }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.mode, "list");
    assert.equal(payload.count, 2);
    assert.equal(payload.etapa_filter, null);
    assert.ok(payload.counts_by_etapa[ETAPA_VISUAL.COMPROBACIONES] >= 1);
  });

  it("filtro por etapa", async () => {
    let seenEtapa = null;
    const payload = await loadFolioStatusForChat(null, 1, zpReq(), {
      ...injectOpts([], [], {
        question: "folios en evidencias",
        listFoliosByPlanta: async (_c, _auth, _plantaId, etapa) => {
          seenEtapa = etapa;
          return { rows: [folioByNumero()], truncated: false, limit: 40 };
        },
      }),
    });
    assert.equal(seenEtapa, ETAPA_VISUAL.EVIDENCIAS);
    assert.equal(payload.ok, true);
    assert.equal(payload.etapa_filter, ETAPA_VISUAL.EVIDENCIAS);
    assert.equal(payload.folios[0].etapa, ETAPA_VISUAL.EVIDENCIAS);
  });

  it("folio inexistente es 404, no empty success", async () => {
    const payload = await loadFolioStatusForChat(null, 1, zpReq(), {
      ...injectOpts([], [], { question: "¿En qué etapa está el folio 999?" }),
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 404);
    assert.equal(payload.code, DATA_NOT_FOUND);
    const chat = buildFolioStatusChatResult(payload, { planta_id: 1 });
    assert.doesNotMatch(chat.answer, /estatus observado GENERADO|tablero completo/i);
    assert.match(chat.answer, /No encontré|no invento/i);
    assert.equal(chat.folio_status, null);
  });

  it("planta no autorizada no consulta la fuente", async () => {
    let called = false;
    const payload = await loadFolioStatusForChat(
      null,
      2,
      { dashboardAuth: { role: "GG", plantas_permitidas: [1] } },
      {
        ...injectOpts([], [], {
          question: "¿En qué etapa está el folio 123?",
          getFolioById: async () => {
            called = true;
            throw new Error("no debe consultar folio");
          },
        }),
      }
    );
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 403);
    assert.equal(payload.code, SOURCE_RESTRICTED);
    assert.equal(called, false);
  });

  it("folio de otra planta es 403, no empty success", async () => {
    const other = baseFolio({ planta_id: 9 });
    const payload = await loadFolioStatusForChat(null, 1, zpReq(), {
      ...injectOpts([other], [other], { question: "¿En qué etapa está el folio 123?" }),
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 403);
    assert.equal(payload.code, SOURCE_RESTRICTED);
    const chat = buildFolioStatusChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /Sin permiso/i);
    assert.equal(chat.folio_status, null);
  });

  it("GA consulta folio de planta permitida", async () => {
    const payload = await loadFolioStatusForChat(
      null,
      1,
      { dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      {
        ...injectOpts([baseFolio()], [baseFolio()], {
          question: "¿En qué etapa está el folio 123?",
        }),
      }
    );
    assert.equal(payload.ok, true);
    assert.equal(payload.folio.folio_id, 123);
  });

  it("GV no llega a la fuente", async () => {
    let called = false;
    const payload = await loadFolioStatusForChat(
      null,
      1,
      { dashboardAuth: { role: "GV", plantas_permitidas: [1] } },
      {
        ...injectOpts([], [], {
          question: "¿En qué etapa está el folio 123?",
          getFolioById: async () => {
            called = true;
            return baseFolio();
          },
        }),
      }
    );
    assert.equal(payload.status, 403);
    assert.equal(called, false);
  });
});

describe("M2 no mutación / no HTTP / no autoavance / no fallback", () => {
  it("el módulo M2 no escribe, no llama HTTP, no autoavanza y no usa handlers mutantes", () => {
    assert.doesNotMatch(M2_SRC, /\b(INSERT|UPDATE|DELETE)\b/);
    assert.doesNotMatch(M2_SRC, /\bfetch\s*\(/);
    assert.doesNotMatch(M2_SRC, /axios\./);
    assert.doesNotMatch(M2_SRC, /maybeAdvanceFolioToComprobaciones/);
    assert.doesNotMatch(M2_SRC, /\/api\/dashboard\/kanban/);
    assert.doesNotMatch(M2_SRC, /\/api\/folios\/:id/);
    assert.doesNotMatch(M2_SRC, /director-ia-real-cycle/);
    assert.doesNotMatch(M2_SRC, /director-ia-duplicados/);
    assert.doesNotMatch(M2_SRC, /loadDashboardKpisForChat/);
    assert.doesNotMatch(M2_SRC, /require\(["']\.\/server["']\)/);
  });

  it("el chat no importa handlers mutantes ni llama maybeAdvance", () => {
    assert.doesNotMatch(CHAT_SRC, /maybeAdvanceFolioToComprobaciones/);
    assert.doesNotMatch(CHAT_SRC, /\/api\/dashboard\/kanban/);
    assert.match(CHAT_SRC, /intent === "folio_status"/);
    assert.match(CHAT_SRC, /loadFolioStatusForChat/);
  });
});

describe("M2 chat end-to-end in-process", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  function poolWith(folioRows) {
    const rows = folioRows || [baseFolio()];
    return {
      connect: async () => ({
        query: async (sql, params) => {
          if (/FROM public\.plantas/.test(sql)) {
            return { rows: [{ id: 1, nombre: "Puebla", clave: "E7" }] };
          }
          if (/FROM public\.folios/.test(sql) && /f\.id = \$1/.test(sql)) {
            const found = rows.filter((r) => Number(r.id) === Number(params[0]));
            return { rows: found };
          }
          if (/FROM public\.folios/.test(sql) && /numero_folio = \$1/.test(sql)) {
            const found = rows.filter((r) => r.numero_folio === params[0]);
            return { rows: found };
          }
          if (/FROM public\.folios/.test(sql) && /numero_folio = ANY/.test(sql)) {
            const wanted = new Set(params[0] || []);
            return { rows: rows.filter((r) => wanted.has(r.numero_folio)) };
          }
          if (/FROM public\.folios/.test(sql)) {
            return { rows };
          }
          return { rows: [] };
        },
        release() {},
      }),
    };
  }

  it("pregunta de etapa llega al executor y no a SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿En qué etapa está el folio 123?"
    );
    assert.equal(result.ok, true);
    assert.notEqual(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.mode, "folio_status");
    assert.equal(result.context_meta.openai_called, false);
    assert.equal(result.context_meta.semantic_class, FOLIO_STATUS_SEMANTIC_CLASS);
    assert.ok(result.folio_status);
    assert.equal(result.folio_status.folio.folio_id, 123);
    assert.doesNotMatch(result.answer, /todavía no está integrado/i);
    assert.doesNotMatch(result.answer, /Action Register/i);
    assert.doesNotMatch(result.answer, /\bKPI/i);
  });

  it("listado por planta no cae a M3 ni AR", async () => {
    configureDirectorIaChat({ pool: poolWith([baseFolio(), folioByNumero()]) });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "listar folios de la planta"
    );
    assert.equal(result.context_meta.mode, "folio_status");
    assert.notEqual(result.context_meta.mode, "dashboard_kpis");
    assert.notEqual(result.context_meta.mode, "duplicate_folios");
    assert.equal(result.folio_status.mode, "list");
    assert.ok(result.folio_status.count >= 1);
    assert.match(result.answer, /No es Action Register ni KPIs agregados/i);
    assert.equal(result.context_meta.openai_called, false);
  });

  it("historial ya no es SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cuál fue el último movimiento del folio 123?"
    );
    assert.notEqual(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.mode, "folio_history");
    assert.equal(result.folio_status, undefined);
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
});
