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
  SOURCE_ERROR,
} = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  getDirectorIaTool,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
} = require("../lib/director-ia-tools");
const { shouldAttachIgfArrAnnex, PLANT_FINANCIAL_KPI_RE } = require("../lib/director-ia-igf-arr");
const { expandCategoriaRows } = require("../lib/categoria-rango-excel");
const {
  GASTOS_INVERSIONES_SEMANTIC_CLASS,
  SOURCE,
  resolvePeriodRange,
  parsePartidaFilter,
  derivedTotal,
  loadGastosInversionesForChat,
  buildGastosInversionesChatResult,
} = require("../lib/director-ia-m6-gastos-inversiones");

const LIB_DIR = path.join(__dirname, "..", "lib");
const M6_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-m6-gastos-inversiones.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");
const IGF_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-igf-arr.js"), "utf8");

function folioRow(over = {}) {
  return {
    id: 10,
    numero_folio: "F-202601-010",
    planta_id: 1,
    planta_nombre: "Puebla",
    planta_clave: "E7",
    beneficiario: "Proveedor A",
    subcategoria: "COMBUSTIBLE",
    concepto: "Diesel",
    importe: 150.5,
    detalle_lineas: null,
    mes_cargo: "2026-01",
    estatus: "PAGADO",
    categoria: "GASTOS",
    ...over,
  };
}

function inversionRow(over = {}) {
  return folioRow({
    id: 20,
    numero_folio: "F-202601-020",
    subcategoria: "OBRA",
    concepto: "Ampliación",
    importe: 800,
    categoria: "INVERSIONES",
    ...over,
  });
}

function injectOpts(rows, extras = {}) {
  return {
    resolveEquivalentIds: extras.resolveEquivalentIds || ((id) => [Number(id)]),
    resolvePlanta: extras.resolvePlanta || (async () => ({ id: 1, nombre: "Puebla", clave: "E7" })),
    queryGastosInversionesFolios:
      extras.queryGastosInversionesFolios ||
      (async (_c, _auth, _plantaId, category) =>
        (rows || []).filter((r) => {
          if (category === "INVERSIONES") {
            return /INVERSION/i.test(String(r.categoria || ""));
          }
          return /GASTO/i.test(String(r.categoria || "")) && !/TALLER/i.test(String(r.categoria || "")) && !/INVERSION/i.test(String(r.categoria || ""));
        })),
    expandCategoriaRows: extras.expandCategoriaRows || expandCategoriaRows,
    question: extras.question,
    auth: extras.auth,
    category: extras.category,
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

describe("M6 intent, capability y tools", () => {
  it("gastos de folios e inversiones dejan de ser SOURCE_NOT_INTEGRATED", () => {
    assert.equal(planDirectorIaQuestion("¿Qué gastos de folios existen?").intent, "expense_analysis");
    assert.equal(planDirectorIaQuestion("listar gastos de folios 2026-01").intent, "expense_analysis");
    assert.equal(planDirectorIaQuestion("¿Qué inversiones están pendientes?").intent, "investment_analysis");
    assert.equal(detectUnsupportedDirectorIaDomain("¿Qué gastos de folios existen?"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("listar gastos de folios 2026-01"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("¿Qué inversiones están pendientes?"), null);
    assert.equal(isDirectorIaDomainReadable("gastos"), true);
    assert.equal(isDirectorIaDomainReadable("inversiones"), true);
  });

  it("Export/xlsx y Taller AT siguen bloqueados", () => {
    const excelG = detectUnsupportedDirectorIaDomain("exportar excel de gastos de folios");
    assert.ok(excelG);
    assert.equal(excelG.id, "gastos");
    const excelI = detectUnsupportedDirectorIaDomain("exportar excel de inversiones");
    assert.ok(excelI);
    assert.equal(excelI.id, "inversiones");
    const taller = detectUnsupportedDirectorIaDomain("taller por AT");
    assert.ok(taller);
    assert.equal(taller.id, "taller_at");
  });

  it("cómo van los gastos no va a M6 y conserva IGF", () => {
    const plan = planDirectorIaQuestion("cómo van los gastos");
    assert.equal(plan.intent, "financial_diagnosis");
    assert.equal(plan.requires_clarification, true);
    assert.equal(detectUnsupportedDirectorIaDomain("cómo van los gastos"), null);
    assert.equal(shouldAttachIgfArrAnnex("cómo van los gastos"), true);
    assert.equal(PLANT_FINANCIAL_KPI_RE.test("gastos"), true);
    assert.notEqual(planDirectorIaQuestion("cómo van los gastos").intent, "expense_analysis");
  });

  it("tools tienen executor read-only y no habilitan Taller AT", () => {
    const g = getDirectorIaTool("get_expense_analysis");
    assert.equal(g.executor, "loadGastosInversionesForChat");
    assert.equal(g.readOnly, true);
    assert.equal(g.status, "available_on_demand");
    assert.equal(isDirectorIaToolExecutable("get_expense_analysis"), true);
    const i = getDirectorIaTool("get_investment_analysis");
    assert.equal(i.executor, "loadGastosInversionesForChat");
    assert.equal(isDirectorIaToolExecutable("get_investment_analysis"), true);
    assert.equal(isDirectorIaToolExecutable("get_taller_at_analysis"), false);
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });
});

describe("M6 period semantics", () => {
  it("YYYY-MM único y rango; inválido o ausente no inventa mes", () => {
    assert.deepEqual(resolvePeriodRange("listar gastos de folios 2026-01"), {
      ok: true,
      mes_desde: "2026-01",
      mes_hasta: "2026-01",
    });
    assert.deepEqual(resolvePeriodRange("gastos de folios 2026-03 2026-01"), {
      ok: true,
      mes_desde: "2026-01",
      mes_hasta: "2026-03",
    });
    const missing = resolvePeriodRange("qué gastos de folios existen");
    assert.equal(missing.ok, false);
    assert.equal(missing.code, "missing_period");
    const invalid = resolvePeriodRange("gastos de folios 2026-13");
    assert.equal(invalid.ok, false);
    assert.equal(invalid.code, "invalid_period");
    const many = resolvePeriodRange("gastos 2026-01 2026-02 2026-03");
    assert.equal(many.ok, false);
  });
});

describe("M6 loader", () => {
  it("GASTOS por planta y YYYY-MM", async () => {
    const payload = await loadGastosInversionesForChat(null, 1, zpReq(), {
      ...injectOpts([folioRow()], { question: "listar gastos de folios 2026-01", category: "GASTOS" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.categoria, "GASTOS");
    assert.equal(payload.count, 1);
    assert.equal(payload.records[0].concepto, "Diesel");
    assert.equal(payload.records[0].importe, 150.5);
    assert.equal(payload.records[0].partida, "COMBUSTIBLE");
    assert.equal(payload.total, 150.5);
    assert.equal(payload.source, SOURCE);
    assert.equal(payload.semantic_class, GASTOS_INVERSIONES_SEMANTIC_CLASS);
  });

  it("INVERSIONES por planta y YYYY-MM", async () => {
    const payload = await loadGastosInversionesForChat(null, 1, zpReq(), {
      ...injectOpts([inversionRow()], { question: "qué inversiones hay 2026-01", category: "INVERSIONES" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.categoria, "INVERSIONES");
    assert.equal(payload.records[0].concepto, "Ampliación");
    assert.equal(payload.total, 800);
  });

  it("no mezcla GASTOS e INVERSIONES", async () => {
    const rows = [folioRow(), inversionRow(), folioRow({ id: 11, categoria: "GASTOS DE TALLER", importe: 40 })];
    const gastos = await loadGastosInversionesForChat(null, 1, zpReq(), {
      ...injectOpts(rows, { question: "gastos de folios 2026-01", category: "GASTOS" }),
    });
    const inv = await loadGastosInversionesForChat(null, 1, zpReq(), {
      ...injectOpts(rows, { question: "inversiones de folios 2026-01", category: "INVERSIONES" }),
    });
    assert.equal(gastos.count, 1);
    assert.equal(gastos.categoria, "GASTOS");
    assert.equal(inv.count, 1);
    assert.equal(inv.categoria, "INVERSIONES");
    assert.equal(
      gastos.records.every((r) => r.categoria === "GASTOS"),
      true
    );
    assert.equal(
      inv.records.every((r) => r.categoria === "INVERSIONES"),
      true
    );
  });

  it("múltiples registros, 0 registros, nulls y totales", async () => {
    const many = await loadGastosInversionesForChat(null, 1, zpReq(), {
      ...injectOpts(
        [
          folioRow({ id: 1, importe: 10, concepto: "A" }),
          folioRow({ id: 2, importe: 20, concepto: "B", subcategoria: null }),
        ],
        { question: "gastos de folios 2026-01", category: "GASTOS" }
      ),
    });
    assert.equal(many.count, 2);
    assert.equal(many.total, 30);
    assert.equal(many.records[1].partida, "SIN SUBCATEGORÍA");
    const zero = await loadGastosInversionesForChat(null, 1, zpReq(), {
      ...injectOpts([], { question: "gastos de folios 2026-01", category: "GASTOS" }),
    });
    assert.equal(zero.ok, true);
    assert.equal(zero.count, 0);
    assert.equal(zero.total, 0);
    assert.match(buildGastosInversionesChatResult(zero).answer, /no hay registros de GASTOS/i);
    assert.doesNotMatch(buildGastosInversionesChatResult(zero).answer, /hay desviaci|la causa es/i);
  });

  it("filtra partida/concepto observado", async () => {
    const payload = await loadGastosInversionesForChat(null, 1, zpReq(), {
      ...injectOpts(
        [folioRow(), folioRow({ id: 12, subcategoria: "VIATICOS", concepto: "Hotel", importe: 90 })],
        { question: "gastos de folios 2026-01 partida COMBUSTIBLE", category: "GASTOS" }
      ),
    });
    assert.equal(payload.partida, "COMBUSTIBLE");
    assert.equal(payload.count, 1);
    assert.equal(payload.records[0].partida, "COMBUSTIBLE");
    assert.equal(parsePartidaFilter("gastos partida COMBUSTIBLE 2026-01"), "COMBUSTIBLE");
  });

  it("expandDetalleLineas y omite importe 0", async () => {
    const payload = await loadGastosInversionesForChat(null, 1, zpReq(), {
      ...injectOpts(
        [
          folioRow({
            importe: 999,
            detalle_lineas: JSON.stringify([
              { concepto: "Aceite", importe: 40 },
              { concepto: "Cero", importe: 0 },
            ]),
          }),
        ],
        { question: "gastos de folios 2026-01", category: "GASTOS" }
      ),
    });
    assert.equal(payload.count, 1);
    assert.equal(payload.records[0].concepto, "Aceite");
    assert.equal(payload.total, 40);
  });

  it("periodo ausente o inválido no consulta", async () => {
    const missing = await loadGastosInversionesForChat(null, 1, zpReq(), {
      ...injectOpts([folioRow()], { question: "qué gastos de folios existen", category: "GASTOS" }),
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.status, 400);
    assert.match(missing.error, /YYYY-MM/);
    const invalid = await loadGastosInversionesForChat(null, 1, zpReq(), {
      ...injectOpts([folioRow()], { question: "gastos de folios 2026-13", category: "GASTOS" }),
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.status, 400);
  });

  it("categoría inválida no mezcla", async () => {
    const payload = await loadGastosInversionesForChat(null, 1, zpReq(), {
      ...injectOpts([folioRow()], { question: "gastos de folios 2026-01", category: "TODO" }),
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 400);
  });

  it("GA permitido; GV 403; cross-planta 403; plantas_permitidas", async () => {
    const ga = await loadGastosInversionesForChat(null, 1, gaReq([1]), {
      ...injectOpts([folioRow()], { question: "gastos de folios 2026-01", category: "GASTOS" }),
    });
    assert.equal(ga.ok, true);
    const gv = await loadGastosInversionesForChat(null, 1, gvReq(), {
      ...injectOpts([folioRow()], { question: "gastos de folios 2026-01", category: "GASTOS" }),
    });
    assert.equal(gv.ok, false);
    assert.equal(gv.status, 403);
    assert.equal(gv.code, SOURCE_RESTRICTED);
    const cross = await loadGastosInversionesForChat(null, 1, ggReq([2]), {
      ...injectOpts([folioRow()], { question: "gastos de folios 2026-01", category: "GASTOS" }),
    });
    assert.equal(cross.ok, false);
    assert.equal(cross.status, 403);
    const noPlant = await loadGastosInversionesForChat(null, null, zpReq(), {
      ...injectOpts([folioRow()], { question: "gastos de folios 2026-01", category: "GASTOS" }),
    });
    assert.equal(noPlant.ok, false);
    assert.equal(noPlant.status, 400);
  });

  it("totales solo del conjunto consultado", () => {
    assert.equal(derivedTotal([{ importe: 10 }, { importe: 5.555 }, { importe: null }]), 15.56);
  });
});

describe("M6 no Excel / no HTTP / no writes", () => {
  it("el módulo no genera xlsx ni llama HTTP ni escribe", () => {
    assert.doesNotMatch(M6_SRC, /\b(INSERT|UPDATE|DELETE)\b/);
    assert.doesNotMatch(M6_SRC, /\bfetch\s*\(/);
    assert.doesNotMatch(M6_SRC, /axios\./);
    assert.doesNotMatch(M6_SRC, /buildCategoriaRangoWorkbook/);
    assert.doesNotMatch(M6_SRC, /exceljs/i);
    assert.doesNotMatch(M6_SRC, /xlsx/i);
    assert.doesNotMatch(M6_SRC, /require\(["']\.\/server["']\)/);
    assert.doesNotMatch(M6_SRC, /\/api\/dashboard\/categoria-rango-excel/);
    assert.match(M6_SRC, /expandCategoriaRows/);
    assert.match(M6_SRC, /FROM public\.folios f/);
    assert.match(M6_SRC, /assertFolioStatusAccess/);
    assert.doesNotMatch(M6_SRC, /assertM3KpisAccess/);
    assert.doesNotMatch(M6_SRC, /loadIgfArrAnnexForChat/);
  });

  it("el chat cablea M6 in-process antes de OpenAI/IGF y no toca Export", () => {
    const expenseIdx = CHAT_SRC.indexOf('intent === "expense_analysis"');
    const invIdx = CHAT_SRC.indexOf('intent === "investment_analysis"');
    const openaiIdx = CHAT_SRC.indexOf("Asistente IA deshabilitado");
    const igfIdx = CHAT_SRC.lastIndexOf("shouldAttachIgfArrAnnex(q)");
    assert.ok(expenseIdx > 0 && invIdx > 0);
    assert.ok(expenseIdx < openaiIdx && invIdx < openaiIdx);
    assert.ok(expenseIdx < igfIdx && invIdx < igfIdx);
    assert.match(CHAT_SRC, /loadGastosInversionesForChat/);
    assert.match(CHAT_SRC, /category: "GASTOS"/);
    assert.match(CHAT_SRC, /category: "INVERSIONES"/);
    assert.doesNotMatch(CHAT_SRC, /buildCategoriaRangoWorkbook/);
    assert.doesNotMatch(CHAT_SRC, /categoria-rango-excel/);
    assert.match(IGF_SRC, /gasto\(\?:s\)\?/);
  });
});

describe("M6 chat end-to-end in-process", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  function poolWith(rows) {
    const data = rows || [folioRow()];
    return {
      connect: async () => ({
        query: async (sql) => {
          if (/FROM public\.plantas/.test(sql)) {
            return { rows: [{ id: 1, nombre: "Puebla", clave: "E7" }] };
          }
          if (/FROM public\.folios/.test(sql)) {
            const wantInv = /LIKE '%INVERSION%'/.test(sql) && !/LIKE '%GASTO%'/.test(sql);
            return {
              rows: data.filter((r) =>
                wantInv
                  ? /INVERSION/i.test(String(r.categoria || ""))
                  : /GASTO/i.test(String(r.categoria || "")) && !/TALLER|INVERSION/i.test(String(r.categoria || ""))
              ),
            };
          }
          return { rows: [] };
        },
        release() {},
      }),
    };
  }

  it("pregunta gastos de folios llega a M6", async () => {
    configureDirectorIaChat({ pool: poolWith([folioRow()]) });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "listar gastos de folios 2026-01"
    );
    assert.equal(result.ok, true);
    assert.notEqual(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.mode, "gastos_inversiones");
    assert.equal(result.context_meta.openai_called, false);
    assert.equal(result.context_meta.categoria, "GASTOS");
    assert.equal(result.gastos_inversiones.count, 1);
    assert.equal(result.gastos_inversiones.records[0].importe, 150.5);
    assert.doesNotMatch(result.answer, /todavía no está integrado/i);
    assert.doesNotMatch(result.answer, /hay desviaci|la causa es/i);
  });

  it("pregunta inversiones llega a M6 y no a GASTOS", async () => {
    configureDirectorIaChat({ pool: poolWith([folioRow(), inversionRow()]) });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "qué inversiones hay 2026-01"
    );
    assert.equal(result.context_meta.mode, "gastos_inversiones");
    assert.equal(result.context_meta.categoria, "INVERSIONES");
    assert.equal(result.gastos_inversiones.count, 1);
    assert.equal(result.gastos_inversiones.records[0].categoria, "INVERSIONES");
    assert.equal(result.context_meta.openai_called, false);
  });

  it("excel de gastos sigue SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "exportar excel de gastos de folios"
    );
    assert.equal(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.requested_domain, "gastos");
    assert.equal(result.gastos_inversiones, undefined);
  });

  it("taller por AT no cae a M6", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa({ body: {}, dashboardAuth: { role: "ZP" } }, 1, "taller por AT");
    assert.equal(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.requested_domain, "taller_at");
  });

  it("cómo van los gastos no entra a M6", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa({ body: {}, dashboardAuth: { role: "ZP" } }, 1, "cómo van los gastos");
    assert.notEqual(result.context_meta && result.context_meta.mode, "gastos_inversiones");
    assert.equal(result.gastos_inversiones, undefined);
  });

  it("periodo ausente aclara y no inventa mes", async () => {
    configureDirectorIaChat({ pool: poolWith([folioRow()]) });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "qué gastos de folios existen"
    );
    assert.equal(result.context_meta.mode, "gastos_inversiones");
    assert.equal(result.context_meta.veracity, SOURCE_ERROR);
    assert.match(result.answer, /YYYY-MM/);
    assert.doesNotMatch(result.answer, /2026-01/);
  });

  it("GV no consulta M6", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(gvReq(), 1, "listar gastos de folios 2026-01");
    assert.equal(result.context_meta.veracity, SOURCE_RESTRICTED);
    assert.equal(result.gastos_inversiones == null, true);
  });
});
