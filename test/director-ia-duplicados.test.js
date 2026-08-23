"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { findDuplicatePairs } = require("../lib/folio-duplicados");
const {
  detectUnsupportedDirectorIaDomain,
  isDirectorIaDomainReadable,
  SOURCE_NOT_INTEGRATED,
  SOURCE_ERROR,
  SOURCE_RESTRICTED,
} = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  getDirectorIaTool,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
} = require("../lib/director-ia-tools");
const { buildDirectorIaToolPlan } = require("../lib/director-ia-tool-orchestrator");
const {
  loadDuplicateFoliosForChat,
  buildDuplicateFoliosChatResult,
  buildDuplicateFoliosAnswer,
  assertDuplicateFoliosAccess,
  DUPLICATE_SEMANTIC_CLASS,
  DUPLICATE_UMBRAL,
} = require("../lib/director-ia-duplicados");

const LIB_DIR = path.join(__dirname, "..", "lib");

function fixturePairRows() {
  return [
    {
      id: 10,
      numero_folio: "F-10",
      folio_codigo: "F-10",
      importe: 1500,
      descripcion: "Pago renta oficina enero",
      estatus: "ABIERTO",
      mes_cargo: "202601",
      creado_en: "2026-01-10T00:00:00Z",
    },
    {
      id: 11,
      numero_folio: "F-11",
      folio_codigo: "F-11",
      importe: 1500,
      concepto: "pago renta oficina enero",
      estatus: "PENDIENTE",
      mes_cargo: "202601",
      creado_en: "2026-01-11T00:00:00Z",
    },
    {
      id: 12,
      numero_folio: "F-12",
      folio_codigo: "F-12",
      importe: 80,
      descripcion: "compra tornillos distintos xyzabc",
      estatus: "ABIERTO",
      creado_en: "2026-01-12T00:00:00Z",
    },
  ];
}

function makePool(folioRows, { throwOnFolios = false, plantFound = true } = {}) {
  return {
    connect: async () => ({
      query: async (sql) => {
        if (/FROM public\.plantas/.test(sql)) {
          return { rows: plantFound ? [{ id: 1, nombre: "Puebla" }] : [] };
        }
        if (/FROM public\.folios/.test(sql)) {
          if (throwOnFolios) throw new Error("db down");
          return { rows: folioRows };
        }
        throw new Error(`unexpected sql: ${sql}`);
      },
      release() {},
    }),
  };
}

function assertPossibleSemantics(text) {
  assert.match(text, /posible/i);
  assert.doesNotMatch(text, /duplicado confirmado|duplicados confirmados/i);
  assert.doesNotMatch(text, /fraude/i);
  assert.doesNotMatch(text, /debe cancelarse|cancelar autom/i);
}

describe("M16 findDuplicatePairs reuse", () => {
  it("detecta pares heurísticos por importe + concepto similar", () => {
    const result = findDuplicatePairs(fixturePairRows(), { umbral: DUPLICATE_UMBRAL, maxPairs: 200 });
    assert.ok(result.pairs.length >= 1);
    const pair = result.pairs.find(
      (p) =>
        (p.a.id === 10 && p.b.id === 11) || (p.a.id === 11 && p.b.id === 10)
    );
    assert.ok(pair, "par 10-11");
    assert.equal(pair.importe, 1500);
    assert.ok(pair.score >= DUPLICATE_UMBRAL);
  });

  it("empty: importes distintos no generan pares", () => {
    const result = findDuplicatePairs(
      [
        { id: 1, importe: 10, descripcion: "alpha uno" },
        { id: 2, importe: 99, descripcion: "alpha uno" },
      ],
      { umbral: DUPLICATE_UMBRAL }
    );
    assert.equal(result.pairs.length, 0);
  });
});

describe("M16 intent y gate", () => {
  it("duplicate_folios se detecta como antes", () => {
    const plan = planDirectorIaQuestion("¿Hay folios duplicados?");
    assert.equal(plan.intent, "duplicate_folios");
  });

  it("duplicate_folios ya no es SOURCE_NOT_INTEGRATED", () => {
    assert.equal(detectUnsupportedDirectorIaDomain("¿Existen folios duplicados?"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("¿Hay folios duplicados?"), null);
    assert.equal(isDirectorIaDomainReadable("duplicados"), true);
  });

  it("otros dominios no integrados siguen bloqueados", () => {
    assert.equal(detectUnsupportedDirectorIaDomain("¿En qué etapa está el folio 123?"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("¿Cuál fue el último movimiento del folio 123?"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("¿Cómo va el presupuesto semanal?"), null);
    const taller = detectUnsupportedDirectorIaDomain("taller por AT");
    assert.ok(taller);
    assert.equal(taller.id, "taller_at");
  });
});

describe("M16 registry", () => {
  it("get_duplicate_folios tiene executor real y el registry acepta el tool", () => {
    const tool = getDirectorIaTool("get_duplicate_folios");
    assert.equal(tool.executor, "loadDuplicateFoliosForChat");
    assert.equal(tool.readOnly, true);
    assert.equal(tool.status, "available_on_demand");
    assert.equal(isDirectorIaToolExecutable("get_duplicate_folios"), true);
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });

  it("tools no integrados siguen sin executor", () => {
    assert.equal(isDirectorIaToolExecutable("get_folio_status"), true);
    assert.equal(isDirectorIaToolExecutable("get_folio_history"), true);
    assert.equal(getDirectorIaTool("get_taller_at_analysis").executor, null);
    const plan = buildDirectorIaToolPlan(planDirectorIaQuestion("taller por AT"), {
      planta_id: 1,
    });
    const taller = plan.tools.find((t) => t.tool_id === "get_taller_at_analysis");
    assert.ok(taller);
    assert.equal(taller.status, "declared_not_integrated");
    assert.equal(taller.executable, false);
  });
});

describe("M16 executor happy / empty / error", () => {
  it("happy: reutiliza findDuplicatePairs y evidencia de posible duplicidad", async () => {
    const payload = await loadDuplicateFoliosForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla" }),
      loadFolios: async () => fixturePairRows(),
      findDuplicatePairs,
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.semantic_class, DUPLICATE_SEMANTIC_CLASS);
    assert.ok(payload.pairs_count >= 1);
    assert.ok(payload.pairs[0].a.id);
    assert.ok(payload.pairs[0].b.id);
    assert.equal(typeof payload.pairs[0].score, "number");
    assert.match(payload.criterio, /importe/);
    const chat = buildDuplicateFoliosChatResult(payload, { planta_id: 1 });
    assertPossibleSemantics(chat.answer);
    assert.equal(chat.context_meta.openai_called, false);
    assert.equal(chat.duplicate_folios.pairs_count, payload.pairs_count);
  });

  it("empty: no es error ni certeza de ausencia absoluta", async () => {
    const payload = await loadDuplicateFoliosForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla" }),
      loadFolios: async () => [],
      findDuplicatePairs,
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.pairs_count, 0);
    const answer = buildDuplicateFoliosAnswer(payload);
    assert.match(answer, /no se encontraron candidatos/i);
    assert.match(answer, /bajo los criterios aplicados/i);
    assert.doesNotMatch(answer, /es imposible/);
    assertPossibleSemantics(answer);
  });

  it("error de fuente es fail-safe y no se convierte en empty", async () => {
    const payload = await loadDuplicateFoliosForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla" }),
      loadFolios: async () => {
        throw new Error("db down");
      },
      findDuplicatePairs,
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.code, SOURCE_ERROR);
    assert.equal(payload.pairs_count, undefined);
    const chat = buildDuplicateFoliosChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /error de fuente/i);
    assert.doesNotMatch(chat.answer, /no se encontraron candidatos/i);
    assert.doesNotMatch(chat.answer, /0 pares|cero candidatos/i);
    assert.equal(chat.context_meta.veracity, SOURCE_ERROR);
    assert.equal(chat.duplicate_folios, null);
  });
});

describe("M16 authz/scope", () => {
  it("GV no consulta folios", () => {
    const denied = assertDuplicateFoliosAccess({ role: "GV" }, 1);
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
    assert.equal(denied.code, SOURCE_RESTRICTED);
  });

  it("GG/GA/AD no cruzan plantas_permitidas", async () => {
    const payload = await loadDuplicateFoliosForChat(
      makePool(fixturePairRows()),
      1,
      { dashboardAuth: { role: "GG", plantas_permitidas: [2] } }
    );
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 403);
    assert.equal(payload.code, SOURCE_RESTRICTED);
  });

  it("scope de planta se transmite al resultado", async () => {
    const payload = await loadDuplicateFoliosForChat(null, 5, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async (_c, plantaId) => ({ id: plantaId, nombre: "Planta 5" }),
      loadFolios: async (_c, plantaId) => {
        assert.equal(plantaId, 5);
        return [];
      },
      findDuplicatePairs,
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.planta_id, 5);
  });
});

describe("M16 semántica", () => {
  it("no afirma duplicado confirmado ni fraude", async () => {
    const payload = await loadDuplicateFoliosForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "Puebla" }),
      loadFolios: async () => fixturePairRows(),
      findDuplicatePairs,
    });
    const chat = buildDuplicateFoliosChatResult(payload, { planta_id: 1 });
    assertPossibleSemantics(chat.answer);
    assert.equal(chat.duplicate_folios.semantic_class, DUPLICATE_SEMANTIC_CLASS);
  });
});

describe("M16 no mutación / no HTTP interno / no cycle", () => {
  it("el executor y el loader no mutan ni llaman HTTP de análisis", () => {
    const files = [
      path.join(LIB_DIR, "director-ia-duplicados.js"),
      path.join(LIB_DIR, "folio-duplicados-load.js"),
    ];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(src, /\b(INSERT|UPDATE|DELETE)\b/);
      assert.doesNotMatch(src, /cancelar/i);
      assert.doesNotMatch(src, /\bfetch\s*\(/);
      assert.doesNotMatch(src, /axios\./);
      assert.doesNotMatch(src, /director-ia-real-cycle/);
    }
  });
});

describe("M16 chat end-to-end in-process", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  it("pregunta de duplicados llega al executor y no a SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({ pool: makePool(fixturePairRows()) });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Hay folios duplicados?"
    );
    assert.equal(result.ok, true);
    assert.notEqual(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.mode, "duplicate_folios");
    assert.equal(result.context_meta.openai_called, false);
    assertPossibleSemantics(result.answer);
    assert.ok(result.duplicate_folios.pairs_count >= 1);
  });

  it("error de pool no se presenta como empty", async () => {
    configureDirectorIaChat({ pool: makePool([], { throwOnFolios: true }) });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Existen folios duplicados?"
    );
    assert.equal(result.context_meta.veracity, SOURCE_ERROR);
    assert.doesNotMatch(result.answer, /no se encontraron candidatos/i);
  });
});
