"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { buildClienteKey, getCanonicalPlantaId } = require("../lib/dicf-acciones");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  detectUnsupportedDirectorIaDomain,
  isDirectorIaDomainReadable,
  SOURCE_RESTRICTED,
  SOURCE_ERROR,
} = require("../lib/director-ia-capabilities");
const {
  getDirectorIaTool,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
} = require("../lib/director-ia-tools");
const {
  SEMANTIC_CLASS,
  SOURCE_STATE,
  SOURCE_COMMENTS,
  SOURCE_ACTIONS,
  SOURCE_HISTORY,
  COMMENT_LIMIT,
  COMMENT_BODY_MAX_CHARS,
  ACTION_LIMIT,
  HISTORY_LIMIT,
  assertCommercialDossierAccess,
  isExpedienteComercialQuestion,
  extractClientHint,
  deriveClienteKeys,
  truncateBody,
  loadCommercialDossierForChat,
  buildCommercialDossierAnswer,
  buildCommercialDossierChatResult,
} = require("../lib/director-ia-m11-commercial-dossier");

const LIB_DIR = path.join(__dirname, "..", "lib");
const M11_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-m11-commercial-dossier.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");
const PLANNER_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-planner.js"), "utf8");

function zpReq() {
  return { dashboardAuth: { role: "ZP" } };
}
function gaReq(plantas = [1]) {
  return { dashboardAuth: { role: "GA", plantas_permitidas: plantas } };
}
function gvReq(plantas = [1]) {
  return { dashboardAuth: { role: "GV", plantas_permitidas: plantas } };
}
function ggReq(plantas) {
  return { dashboardAuth: { role: "GG", plantas_permitidas: plantas } };
}

function stateRow(over = {}) {
  return {
    plant_code: "Puebla",
    year: 2026,
    month: 8,
    cliente_norm: "Acme",
    canal: "Portatil",
    subcanal: "",
    estado: "Activo",
    last_date: "2026-08-20",
    kg_mes_real: 10,
    kg_mes_forecast: 12,
    ingreso_forecast: 100,
    es_nuevo: false,
    ...over,
  };
}

function commentRow(over = {}) {
  return {
    id: 1,
    planta_id: 1,
    cliente_key: "k1",
    cliente_nombre: "Acme",
    canal: "Portatil",
    subcanal: "",
    body: "Visita programada",
    author_name: "Ana",
    created_at: "2026-08-18T12:00:00.000Z",
    ...over,
  };
}

function actionRow(over = {}) {
  return {
    id: 50,
    public_code: "ABCDEF1234",
    planta_id: 1,
    cliente_key: "k1",
    cliente_nombre: "Acme",
    canal: "Portatil",
    subcanal: "",
    grupo_tipo: "Disminuyeron",
    descripcion: "Seguimiento comercial",
    estado: "pendiente",
    fecha_compromiso: "2026-08-25",
    resultado_cierre: null,
    cerrado_at: null,
    created_at: "2026-08-10T10:00:00.000Z",
    responsable: "Luis",
    ...over,
  };
}

function histRow(over = {}) {
  return {
    accion_id: 50,
    evento: "fecha_compromiso",
    detalle: null,
    creado_en: "2026-08-11T10:00:00.000Z",
    actor_nombre: "Luis",
    ...over,
  };
}

function derivedKeys(row) {
  return deriveClienteKeys(1, row.canal, row.subcanal, row.cliente_norm, row.estado);
}

function inject(over = {}) {
  const row = over.stateRow !== undefined ? over.stateRow : stateRow();
  const keys = row ? derivedKeys(row) : over.keys || [];
  let commentsCalled = false;
  let actionsCalled = false;
  let stateCalled = false;
  const comments = over.comments !== undefined ? over.comments : [commentRow({ cliente_key: keys[0] })];
  const actions = over.actions !== undefined ? over.actions : [actionRow({ cliente_key: keys[0] })];
  const history = over.history !== undefined ? over.history : [histRow()];
  return {
    flags: { commentsCalled, actionsCalled, stateCalled, get comments() { return commentsCalled; }, get actions() { return actionsCalled; }, get state() { return stateCalled; } },
    opts: {
      question: over.question || "Dame el expediente comercial de Acme",
      auth: over.auth,
      resolvePlanta: over.resolvePlanta || (async () => ({ id: 1, nombre: "Puebla", clave: "E7" })),
      queryPlantCode: over.queryPlantCode || (async () => "Puebla"),
      queryEntities: over.queryEntities || (async () => over.entities || []),
      queryCommercialStateRows: async () => {
        stateCalled = true;
        return over.stateRows !== undefined ? over.stateRows : row ? [row] : [];
      },
      queryCommentsByKeys: async (_c, _p, k) => {
        commentsCalled = true;
        assert.ok(Array.isArray(k));
        return comments;
      },
      queryActionsByKeys: async (_c, _ids, k) => {
        actionsCalled = true;
        assert.ok(Array.isArray(k));
        return actions;
      },
      queryActionKeysByNombre: over.queryActionKeysByNombre || (async () => over.actionNameRows || []),
      queryHistorialForActions: over.queryHistorialForActions || (async () => {
        const map = new Map();
        for (const h of history) {
          const id = Number(h.accion_id);
          if (!map.has(id)) map.set(id, []);
          map.get(id).push(h);
        }
        return map;
      }),
    },
    keys,
  };
}

describe("M11 intent, capability y tools", () => {
  it("preguntas de expediente usan expediente_comercial", () => {
    assert.equal(planDirectorIaQuestion("Dame el expediente comercial de Acme").intent, "expediente_comercial");
    assert.equal(
      planDirectorIaQuestion("Muéstrame estado, comentarios y acciones de Acme").intent,
      "expediente_comercial"
    );
    assert.equal(
      planDirectorIaQuestion("¿Qué está pasando con Acme y qué acciones tenemos?").intent,
      "expediente_comercial"
    );
    assert.equal(planDirectorIaQuestion("¿Qué sabemos comercialmente de Acme?").intent, "expediente_comercial");
    assert.equal(detectUnsupportedDirectorIaDomain("Dame el expediente comercial de Acme"), null);
    assert.equal(isDirectorIaDomainReadable("commercial_dossier"), true);
    assert.equal(isExpedienteComercialQuestion("Dame el expediente comercial de Acme"), true);
  });

  it("no hijack de listas, bitácora, vencidas ni client_analysis", () => {
    assert.equal(planDirectorIaQuestion("¿Qué clientes dejaron de comprar?").intent, "commercial_state");
    assert.equal(planDirectorIaQuestion("¿Qué clientes aumentaron?").intent, "commercial_state");
    assert.equal(planDirectorIaQuestion("¿Qué acciones están vencidas?").intent, "overdue_actions");
    const bit = planDirectorIaQuestion("¿Qué dice la bitácora de Cliente X?");
    assert.notEqual(bit.intent, "expediente_comercial");
    const analysis = planDirectorIaQuestion("análisis del cliente Acme");
    assert.equal(analysis.intent, "client_analysis");
    assert.equal(isExpedienteComercialQuestion("¿Qué clientes dejaron de comprar?"), false);
  });

  it("tool get_commercial_dossier es ejecutable read-only", () => {
    const t = getDirectorIaTool("get_commercial_dossier");
    assert.equal(t.executor, "loadCommercialDossierForChat");
    assert.equal(t.readOnly, true);
    assert.equal(t.status, "available_on_demand");
    assert.equal(isDirectorIaToolExecutable("get_commercial_dossier"), true);
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });
});

describe("M11 resolución y hints", () => {
  it("extrae cliente único del wording", () => {
    assert.equal(extractClientHint("Dame el expediente comercial de Acme"), "Acme");
    assert.equal(extractClientHint('expediente comercial de "Casa Norte"'), "Casa Norte");
    assert.ok(extractClientHint("¿Qué está pasando con Acme y qué acciones tenemos?").includes("Acme"));
  });

  it("cliente_key derivado usa buildClienteKey físico", () => {
    const keys = deriveClienteKeys(1, "Portatil", "", "Acme", "Activo");
    assert.ok(keys.includes(buildClienteKey(1, "Disminuyeron", "Portatil", "", "Acme")));
    assert.ok(keys.includes(buildClienteKey(getCanonicalPlantaId(1), "Activo", "Portatil", "", "Acme")));
    assert.ok(keys.includes(buildClienteKey(1, "Dejaron de comprar", "Portatil", "", "Acme")));
  });
});

describe("M11 authz antes de datos", () => {
  it("GA 403 y no consulta datos", async () => {
    let queried = false;
    const payload = await loadCommercialDossierForChat(null, 1, gaReq(), {
      question: "Dame el expediente comercial de Acme",
      queryCommercialStateRows: async () => {
        queried = true;
        return [];
      },
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.code, SOURCE_RESTRICTED);
    assert.equal(payload.status, 403);
    assert.equal(queried, false);
  });

  it("planta no autorizada 403", async () => {
    const denied = assertCommercialDossierAccess(ggReq([2]).dashboardAuth, 1);
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
    const payload = await loadCommercialDossierForChat(null, 1, ggReq([2]), {
      question: "Dame el expediente comercial de Acme",
      queryCommercialStateRows: async () => {
        throw new Error("no data before authz");
      },
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 403);
  });

  it("cross-planta bloqueado; ZP y GG autorizado ok", async () => {
    assert.equal(assertCommercialDossierAccess(zpReq().dashboardAuth, 1).ok, true);
    assert.equal(assertCommercialDossierAccess(ggReq([1]).dashboardAuth, 1).ok, true);
    assert.equal(assertCommercialDossierAccess(gvReq([1]).dashboardAuth, 1).ok, true);
    assert.equal(assertCommercialDossierAccess(gvReq([9]).dashboardAuth, 1).ok, false);
  });
});

describe("M11 loader factual", () => {
  it("arma expediente de cliente único con procedencia separada", async () => {
    const { opts, keys } = inject({});
    const payload = await loadCommercialDossierForChat(null, 1, zpReq(), opts);
    assert.equal(payload.ok, true);
    assert.equal(payload.client_identity.cliente_nombre, "Acme");
    assert.ok(payload.client_identity.cliente_keys.length >= 1);
    assert.ok(keys.some((k) => payload.client_identity.cliente_keys.includes(k)));
    assert.equal(payload.commercial_state.source, SOURCE_STATE);
    assert.equal(payload.comments[0].source, SOURCE_COMMENTS);
    assert.equal(payload.dicf_actions[0].source, SOURCE_ACTIONS);
    assert.equal(payload.dicf_actions[0].history[0].source, SOURCE_HISTORY);
    assert.equal(payload.semantic_class, SEMANTIC_CLASS);
    const answer = buildCommercialDossierAnswer(payload);
    assert.match(answer, /estado observado/i);
    assert.match(answer, /comentario registrado/i);
    assert.match(answer, /acci[oó]n registrada/i);
    assert.doesNotMatch(answer, /la causa fue/i);
    assert.doesNotMatch(answer, /esto provoc/i);
    assert.doesNotMatch(answer, /solucion/i);
    const chat = buildCommercialDossierChatResult(payload, { planta_id: 1 });
    assert.equal(chat.context_meta.openai_called, false);
    assert.equal(chat.context_meta.mode, "expediente_comercial");
  });

  it("ambiguo clarifica y no selecciona", async () => {
    const payload = await loadCommercialDossierForChat(null, 1, zpReq(), inject({
      stateRows: [stateRow({ canal: "A" }), stateRow({ canal: "B", subcanal: "x" })],
      comments: [],
      actions: [],
    }).opts);
    assert.equal(payload.ok, false);
    assert.equal(payload.clarification, true);
    assert.equal(payload.clarification_code, "ambiguous_client");
  });

  it("sin cliente pide clarificación", async () => {
    const payload = await loadCommercialDossierForChat(null, 1, zpReq(), inject({
      question: "Dame el expediente comercial",
      stateRows: [],
      entities: [],
      comments: [],
      actions: [],
    }).opts);
    assert.equal(payload.ok, false);
    assert.equal(payload.clarification_code, "missing_client");
  });

  it("comentario null-key no se une; no join por nombre", async () => {
    const keys = derivedKeys(stateRow());
    const { opts } = inject({
      comments: [
        commentRow({ id: 1, cliente_key: keys[0], body: "con clave" }),
        commentRow({ id: 2, cliente_key: null, cliente_nombre: "Acme", body: "sin clave mismo nombre" }),
        commentRow({ id: 3, cliente_key: "", cliente_nombre: "Acme", body: "key vacía" }),
      ],
    });
    const payload = await loadCommercialDossierForChat(null, 1, zpReq(), opts);
    assert.equal(payload.ok, true);
    assert.equal(payload.comments.length, 1);
    assert.equal(payload.comments[0].body, "con clave");
    assert.equal(M11_SRC.includes("lower(trim(cliente_nombre))"), false);
  });

  it("0 comentarios / 0 acciones / sin estado no reinterpreta", async () => {
    const payload = await loadCommercialDossierForChat(null, 1, zpReq(), inject({
      stateRow: null,
      stateRows: [],
      comments: [],
      actions: [],
      actionNameRows: [],
    }).opts);
    assert.equal(payload.ok, true);
    assert.equal(payload.commercial_state, null);
    assert.equal(payload.comments.length, 0);
    assert.equal(payload.dicf_actions.length, 0);
    const answer = buildCommercialDossierAnswer(payload);
    assert.match(answer, /no implica que el cliente est[eé] inactivo/i);
    assert.match(answer, /no significa que nadie haya comentado/i);
    assert.match(answer, /fuera de DICF/i);
  });

  it("límites 8/500/8/8 y truncation explícito", async () => {
    const keys = derivedKeys(stateRow());
    const { opts } = inject({
      comments: Array.from({ length: 9 }, (_, i) =>
        commentRow({
          id: i + 1,
          cliente_key: keys[0],
          body: i === 0 ? "x".repeat(600) : `c${i}`,
          created_at: `2026-08-${String(20 - i).padStart(2, "0")}T00:00:00.000Z`,
        })
      ),
      actions: Array.from({ length: 9 }, (_, i) => actionRow({ id: 50 + i, cliente_key: keys[0], public_code: `A${i}` })),
      history: Array.from({ length: 10 }, (_, i) =>
        histRow({ evento: `e${i}`, creado_en: `2026-08-11T${String(10 + i).padStart(2, "0")}:00:00.000Z` })
      ),
    });
    const payload = await loadCommercialDossierForChat(null, 1, zpReq(), opts);
    assert.equal(payload.comments.length, COMMENT_LIMIT);
    assert.equal(payload.comments_omitted, 1);
    assert.equal(payload.comments[0].truncated, true);
    assert.equal(payload.comments[0].body.length, COMMENT_BODY_MAX_CHARS);
    assert.equal(payload.comments[0].original_length, 600);
    assert.equal(payload.dicf_actions.length, ACTION_LIMIT);
    assert.equal(payload.actions_omitted, 1);
    assert.equal(payload.dicf_actions[0].history.length, HISTORY_LIMIT);
    assert.equal(payload.dicf_actions[0].history_omitted, 2);
    const cut = truncateBody("abcdefghij", 5);
    assert.equal(cut.text, "abcde");
    assert.equal(cut.truncated, true);
  });

  it("historial y resultado_cierre van por acción", async () => {
    const keys = derivedKeys(stateRow());
    const { opts } = inject({
      actions: [
        actionRow({
          id: 50,
          cliente_key: keys[0],
          resultado_cierre: "El cliente aceptó fecha",
          estado: "hecho",
        }),
      ],
      history: [
        histRow({ accion_id: 50, evento: "cerrada", creado_en: "2026-08-12T00:00:00.000Z" }),
        histRow({ accion_id: 99, evento: "otra", creado_en: "2026-08-01T00:00:00.000Z" }),
      ],
    });
    const payload = await loadCommercialDossierForChat(null, 1, zpReq(), opts);
    assert.equal(payload.dicf_actions[0].resultado_cierre, "El cliente aceptó fecha");
    assert.equal(payload.dicf_actions[0].history.length, 1);
    assert.equal(payload.dicf_actions[0].history[0].event, "cerrada");
    const answer = buildCommercialDossierAnswer(payload);
    assert.match(answer, /resultado de cierre registrado/i);
    assert.doesNotMatch(answer, /fue efectiva/i);
  });

  it("orden temporal de historial se preserva", async () => {
    const keys = derivedKeys(stateRow());
    const { opts } = inject({
      history: [
        histRow({ evento: "a", creado_en: "2026-08-10T00:00:00.000Z" }),
        histRow({ evento: "b", creado_en: "2026-08-11T00:00:00.000Z" }),
      ],
      actions: [actionRow({ cliente_key: keys[0] })],
    });
    const payload = await loadCommercialDossierForChat(null, 1, zpReq(), opts);
    assert.deepEqual(
      payload.dicf_actions[0].history.map((h) => h.event),
      ["a", "b"]
    );
  });
});

describe("M11 fronteras de implementación", () => {
  it("SELECT-only: no computeDicf, no cache write, no HTTP, no bitácora", () => {
    assert.equal(/loadCommercialStateForChat\s*\(/.test(M11_SRC), false);
    assert.equal(/computeDicf\s*\(/.test(M11_SRC), false);
    assert.equal(/\bINSERT\b/.test(M11_SRC), false);
    assert.equal(/\bUPDATE\b/.test(M11_SRC), false);
    assert.equal(/\bDELETE\b/.test(M11_SRC), false);
    assert.equal(/https?:\/\//.test(M11_SRC), false);
    assert.equal(/\bplaud\b/.test(M11_SRC), false);
    assert.match(M11_SRC, /FROM arr\.dicf_cliente_mes/);
  });

  it("chat y planner cablean intent dedicado", () => {
    assert.match(CHAT_SRC, /expediente_comercial/);
    assert.match(CHAT_SRC, /loadCommercialDossierForChat/);
    assert.match(PLANNER_SRC, /expediente_comercial/);
    assert.match(PLANNER_SRC, /isExpedienteComercialQuestion/);
    assert.doesNotMatch(PLANNER_SRC, /expediente_comercial: \["dicf", "cliente_comentarios", "bitacora"/);
  });

  it("planta_id obligatorio", async () => {
    const payload = await loadCommercialDossierForChat(null, null, zpReq(), {
      question: "Dame el expediente comercial de Acme",
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.code, SOURCE_ERROR);
  });
});
