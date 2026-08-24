"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  detectUnsupportedDirectorIaDomain,
  isDirectorIaDomainReadable,
  isM5TallerAtQuery,
  SOURCE_RESTRICTED,
} = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  getDirectorIaTool,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
} = require("../lib/director-ia-tools");
const { expandTallerRows } = require("../lib/taller-at-excel");
const {
  TALLER_AT_SEMANTIC_CLASS,
  SOURCE,
  ZERO_ROWS_ANSWER,
  resolvePeriodRange,
  parseUnidadFilter,
  derivedTotal,
  loadTallerAtForChat,
  buildTallerAtChatResult,
} = require("../lib/director-ia-m5-taller-at");

const LIB_DIR = path.join(__dirname, "..", "lib");
const M5_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-m5-taller-at.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");

function tallerRow(over = {}) {
  return {
    id: 10,
    numero_folio: "F-T-010",
    planta_id: 1,
    planta_nombre: "Puebla",
    planta_clave: "E7",
    unidad: "AT-15",
    subcategoria: "PREVENTIVO",
    concepto: "Servicio AT-15",
    importe: 200,
    detalle_lineas: null,
    mes_cargo: "2026-08",
    estatus: "PAGADO",
    categoria: "TALLER",
    ...over,
  };
}

function ptRow(over = {}) {
  return tallerRow({
    id: 11,
    numero_folio: "F-T-011",
    unidad: "PT-03",
    concepto: "Servicio PT-03",
    importe: 80,
    ...over,
  });
}

function gastoRow(over = {}) {
  return tallerRow({
    id: 99,
    numero_folio: "F-G-099",
    unidad: null,
    categoria: "GASTOS",
    concepto: "Diesel",
    importe: 50,
    ...over,
  });
}

function injectOpts(rows, extras = {}) {
  return {
    resolveEquivalentIds: extras.resolveEquivalentIds || ((id) => [Number(id)]),
    resolvePlanta: extras.resolvePlanta || (async () => ({ id: 1, nombre: "Puebla", clave: "E7" })),
    queryTallerFolios:
      extras.queryTallerFolios ||
      (async () => (rows || []).filter((r) => /TALLER/i.test(String(r.categoria || "")))),
    expandTallerRows: extras.expandTallerRows || expandTallerRows,
    question: extras.question,
    auth: extras.auth,
    unidad: extras.unidad,
  };
}

function zpReq() {
  return { dashboardAuth: { role: "ZP" } };
}

function gaReq(plantas = [1]) {
  return { dashboardAuth: { role: "GA", plantas_permitidas: plantas } };
}

function gvReq() {
  return { dashboardAuth: { role: "GV", plantas_permitidas: [1] } };
}

function ggReq(plantas) {
  return { dashboardAuth: { role: "GG", plantas_permitidas: plantas } };
}

describe("M5 intent, capability y tools", () => {
  it("intent taller_at y tool get_taller_at executable", () => {
    const plan = planDirectorIaQuestion("Muéstrame Taller de AT-15 en 2026-08");
    assert.equal(plan.intent, "taller_at");
    assert.ok(plan.domains.includes("taller_at"));
    assert.equal(detectUnsupportedDirectorIaDomain("Muéstrame Taller de AT-15 en 2026-08"), null);
    assert.equal(isDirectorIaDomainReadable("taller_at"), true);
    const tool = getDirectorIaTool("get_taller_at");
    assert.equal(tool.executor, "loadTallerAtForChat");
    assert.equal(tool.readOnly, true);
    assert.equal(isDirectorIaToolExecutable("get_taller_at"), true);
    assert.equal(isDirectorIaToolExecutable("get_taller_at_analysis"), false);
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });

  it("PT y AT-15 activan M5; frase Excel y taller por AT desnudo no", () => {
    assert.equal(planDirectorIaQuestion("¿Cuánto hay de Taller en PT-03 en 2026-07?").intent, "taller_at");
    assert.equal(isM5TallerAtQuery("taller de AT-15 2026-08"), true);
    assert.equal(isM5TallerAtQuery("taller por AT"), false);
    const excel = detectUnsupportedDirectorIaDomain("exportar excel taller AT-15");
    assert.ok(excel);
    assert.equal(excel.id, "taller_at");
    const bare = detectUnsupportedDirectorIaDomain("taller por AT");
    assert.ok(bare);
    assert.equal(bare.id, "taller_at");
  });

  it("no absorbe GASTOS, INVERSIONES, M4 ni Action Register", () => {
    assert.equal(planDirectorIaQuestion("¿Qué gastos hay este mes?").intent !== "taller_at", true);
    assert.equal(planDirectorIaQuestion("¿Qué gastos de folios existen?").intent, "expense_analysis");
    assert.equal(planDirectorIaQuestion("¿Qué inversiones hay?").intent, "investment_analysis");
    assert.equal(
      planDirectorIaQuestion("clasificación de apoyos 2026-01 2026-02").intent,
      "clasificacion_apoyos_query"
    );
    assert.notEqual(planDirectorIaQuestion("Compara Taller contra el mes pasado").intent, "taller_at");
    const ar = planDirectorIaQuestion("¿Qué acciones tiene AT-15?");
    assert.equal(ar.intent, "action_status");
    assert.ok(ar.domains.includes("action_register"));
    assert.ok(!ar.domains.includes("taller_at"));
    assert.equal(planDirectorIaQuestion("¿Cómo va Taller?").intent, "action_status");
  });
});

describe("M5 period y unidad", () => {
  it("YYYY-MM obligatorio; ausente o inválido no inventa mes", () => {
    assert.deepEqual(resolvePeriodRange("Taller de AT-15 2026-08"), {
      ok: true,
      mes_desde: "2026-08",
      mes_hasta: "2026-08",
    });
    const missing = resolvePeriodRange("Taller de AT-15 este mes");
    assert.equal(missing.ok, false);
    assert.equal(missing.code, "missing_period");
    const invalid = resolvePeriodRange("Taller AT-15 2026-13");
    assert.equal(invalid.ok, false);
    assert.equal(invalid.code, "invalid_period");
  });

  it("unidad usa helper físico; no at_id", () => {
    assert.deepEqual(parseUnidadFilter("Taller de AT-15 en 2026-08"), ["AT-15"]);
    assert.deepEqual(parseUnidadFilter("Taller en PT-03"), ["PT-03"]);
  });
});

describe("M5 loader", () => {
  it("consulta AT-15 existente: folio, importe, estatus, count, total", async () => {
    const payload = await loadTallerAtForChat(null, 1, zpReq(), {
      ...injectOpts([tallerRow(), ptRow(), gastoRow()], {
        question: "Muéstrame Taller de AT-15 en 2026-08",
      }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 1);
    assert.equal(payload.records[0].unidad, "AT-15");
    assert.equal(payload.records[0].numero_folio, "F-T-010");
    assert.equal(payload.records[0].importe, 200);
    assert.equal(payload.records[0].estatus, "PAGADO");
    assert.equal(payload.total, 200);
    assert.equal(payload.source, SOURCE);
    assert.equal(payload.semantic_class, TALLER_AT_SEMANTIC_CLASS);
    assert.equal(Object.prototype.hasOwnProperty.call(payload.records[0], "at_id"), false);
  });

  it("consulta PT existente", async () => {
    const payload = await loadTallerAtForChat(null, 1, zpReq(), {
      ...injectOpts([tallerRow(), ptRow()], { question: "Taller PT-03 2026-08" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.records[0].unidad, "PT-03");
    assert.equal(payload.total, 80);
  });

  it("unidad inexistente / 0 registros", async () => {
    const payload = await loadTallerAtForChat(null, 1, zpReq(), {
      ...injectOpts([tallerRow()], { question: "Taller AT-99 2026-08" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 0);
    assert.equal(payload.total, 0);
    const chat = buildTallerAtChatResult(payload, { planta_id: 1 });
    assert.equal(chat.answer, ZERO_ROWS_ANSWER);
  });

  it("periodo ausente clarifica; inválido error", async () => {
    const missing = await loadTallerAtForChat(null, 1, zpReq(), {
      ...injectOpts([tallerRow()], { question: "Taller de AT-15 este mes" }),
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.period_code, "missing_period");
    const invalid = await loadTallerAtForChat(null, 1, zpReq(), {
      ...injectOpts([tallerRow()], { question: "Taller AT-15 2026-13" }),
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.period_code, "invalid_period");
  });

  it("TALLER separado de GASTOS e INVERSIONES", async () => {
    const payload = await loadTallerAtForChat(null, 1, zpReq(), {
      ...injectOpts([tallerRow(), gastoRow(), { ...gastoRow(), id: 98, categoria: "INVERSIONES" }], {
        question: "Taller AT-15 2026-08",
      }),
    });
    assert.equal(payload.count, 1);
    assert.equal(payload.records[0].unidad, "AT-15");
  });

  it("nulls: unidad vacía no se inventa como AT", async () => {
    const payload = await loadTallerAtForChat(null, 1, zpReq(), {
      ...injectOpts([tallerRow({ unidad: "", concepto: "Sin unidad", importe: 10 })], {
        question: "Taller AT-15 2026-08",
      }),
    });
    assert.equal(payload.count, 0);
  });

  it("conteo y total se derivan de importes observados", async () => {
    const a = tallerRow({ id: 1, importe: 10 });
    const b = tallerRow({ id: 2, numero_folio: "F-T-002", importe: 15.55 });
    const payload = await loadTallerAtForChat(null, 1, zpReq(), {
      ...injectOpts([a, b], { question: "Taller AT-15 2026-08" }),
    });
    assert.equal(payload.count, 2);
    assert.equal(payload.total, derivedTotal(payload.records));
    assert.equal(payload.total, 25.55);
  });

  it("GA autorizado en planta; GV 403; plantas_permitidas; cross-planta", async () => {
    const okGa = await loadTallerAtForChat(null, 1, gaReq([1]), {
      ...injectOpts([tallerRow()], { question: "Taller AT-15 2026-08" }),
    });
    assert.equal(okGa.ok, true);
    const gv = await loadTallerAtForChat(null, 1, gvReq(), {
      ...injectOpts([tallerRow()], { question: "Taller AT-15 2026-08" }),
    });
    assert.equal(gv.ok, false);
    assert.equal(gv.status, 403);
    assert.equal(gv.code, SOURCE_RESTRICTED);
    const other = await loadTallerAtForChat(null, 2, gaReq([1]), {
      ...injectOpts([tallerRow()], { question: "Taller AT-15 2026-08" }),
    });
    assert.equal(other.ok, false);
    assert.equal(other.status, 403);
    const gg = await loadTallerAtForChat(null, 2, ggReq([1, 3]), {
      ...injectOpts([tallerRow()], { question: "Taller AT-15 2026-08" }),
    });
    assert.equal(gg.ok, false);
    assert.equal(gg.status, 403);
  });

  it("authz ocurre antes del SELECT", async () => {
    let queried = false;
    const gv = await loadTallerAtForChat(null, 1, gvReq(), {
      ...injectOpts([tallerRow()], {
        question: "Taller AT-15 2026-08",
        queryTallerFolios: async () => {
          queried = true;
          return [];
        },
      }),
    });
    assert.equal(gv.ok, false);
    assert.equal(queried, false);
    const noPlanta = await loadTallerAtForChat(null, null, zpReq(), {
      ...injectOpts([tallerRow()], { question: "Taller AT-15 2026-08" }),
    });
    assert.equal(noPlanta.ok, false);
    assert.equal(noPlanta.status, 400);
  });
});

describe("M5 boundaries en código", () => {
  it("no Excel, workbook, duplicados, HTTP interno ni writes", () => {
    assert.equal(/buildTallerAtWorkbook/.test(M5_SRC), false);
    assert.equal(/xlsx/.test(M5_SRC), false);
    assert.equal(/findDuplicatePairs|DUP_CONCEPTO/.test(M5_SRC), false);
    assert.equal(/https?:\/\//.test(M5_SRC), false);
    assert.equal(/\b(INSERT|UPDATE|DELETE)\b/.test(M5_SRC), false);
    assert.equal(/loadTallerAtForChat/.test(CHAT_SRC), true);
    assert.equal(/intent === "taller_at"/.test(CHAT_SRC), true);
  });

  it("chat result no afirma causa ni responsable", () => {
    const chat = buildTallerAtChatResult(
      {
        ok: true,
        planta_id: 1,
        planta_nombre: "Puebla",
        unidades: ["AT-15"],
        periodo: { mes_desde: "2026-08", mes_hasta: "2026-08" },
        count: 1,
        total: 200,
        truncated: false,
        records: [
          {
            unidad: "AT-15",
            numero_folio: "F-T-010",
            concepto: "Servicio",
            importe: 200,
            periodo: "2026-08",
            estatus: "PAGADO",
          },
        ],
        source: SOURCE,
        semantic_class: TALLER_AT_SEMANTIC_CLASS,
      },
      { planta_id: 1 }
    );
    assert.match(chat.answer, /AT-15/);
    assert.match(chat.answer, /No afirmo causa/);
    assert.equal(/la causa es|el responsable es|está atrasado|es urgente/i.test(chat.answer), false);
    assert.equal(chat.context_meta.openai_called, false);
  });
});
