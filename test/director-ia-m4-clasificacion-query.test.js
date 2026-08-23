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
const { buildClasificacionMatrix } = require("../lib/clasificacion-apoyos-excel");
const {
  CLASIFICACION_SEMANTIC_CLASS,
  SOURCE,
  FAMILIES,
  resolveComparePeriods,
  findComparativoGroup,
  percentChange,
  loadClasificacionApoyosForChat,
  buildClasificacionApoyosChatResult,
} = require("../lib/director-ia-m4-clasificacion-query");

const LIB_DIR = path.join(__dirname, "..", "lib");
const M4_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-m4-clasificacion-query.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");

function folioRow(over = {}) {
  return {
    planta_id: 1,
    categoria: "GASTOS",
    importe: 100,
    mes_cargo: "2026-01",
    estatus: "PAGADO",
    ...over,
  };
}

function injectOpts(rows, extras = {}) {
  const captured = extras.captured || {};
  return {
    resolvePlanta: extras.resolvePlanta || (async () => ({ id: 1, nombre: "Acapulco", clave: "ACA" })),
    queryClasificacionFolios:
      extras.queryClasificacionFolios ||
      (async (_c, mesA, mesB, ids) => {
        captured.ids = ids;
        captured.mesA = mesA;
        captured.mesB = mesB;
        captured.called = (captured.called || 0) + 1;
        return (rows || []).filter((r) => {
          const mes = String(r.mes_cargo || "");
          return (mes === mesA || mes === mesB) && (ids || []).includes(Number(r.planta_id));
        });
      }),
    buildClasificacionMatrix: extras.buildClasificacionMatrix || buildClasificacionMatrix,
    question: extras.question,
    auth: extras.auth,
    mes_a: extras.mes_a,
    mes_b: extras.mes_b,
    captured,
  };
}

function zpReq() {
  return { dashboardAuth: { role: "ZP" } };
}

function gaReq(plantas = [1, 11, 12]) {
  return { dashboardAuth: { role: "GA", plantas_permitidas: plantas } };
}

function gvReq() {
  return { dashboardAuth: { role: "GV", plantas_permitidas: [1] } };
}

function ggReq(plantas) {
  return { dashboardAuth: { role: "GG", plantas_permitidas: plantas } };
}

describe("M4 intent, capability y tools", () => {
  it("query de clasificación deja de ser SOURCE_NOT_INTEGRATED", () => {
    assert.equal(
      planDirectorIaQuestion("clasificación de apoyos 2026-01 2026-02").intent,
      "clasificacion_apoyos_query"
    );
    assert.equal(
      planDirectorIaQuestion("comparativo de clasificación 2026-01 vs 2026-02").intent,
      "clasificacion_apoyos_query"
    );
    assert.equal(detectUnsupportedDirectorIaDomain("clasificación de apoyos 2026-01 2026-02"), null);
    assert.equal(isDirectorIaDomainReadable("clasificacion_apoyos"), true);
  });

  it("no colisiona con M6 GASTOS/INVERSIONES ni Taller AT", () => {
    assert.equal(planDirectorIaQuestion("¿Qué gastos de folios existen?").intent, "expense_analysis");
    assert.equal(planDirectorIaQuestion("qué inversiones hay 2026-01").intent, "investment_analysis");
    const taller = detectUnsupportedDirectorIaDomain("taller por AT");
    assert.ok(taller);
    assert.equal(taller.id, "taller_at");
    assert.notEqual(planDirectorIaQuestion("clasificación de apoyos 2026-01 2026-02").intent, "expense_analysis");
  });

  it("Excel y COMPARAR write siguen bloqueados", () => {
    const excel = detectUnsupportedDirectorIaDomain("exportar excel de clasificación de apoyos");
    assert.ok(excel);
    assert.equal(excel.id, "clasificacion_apoyos");
    const compararExcel = detectUnsupportedDirectorIaDomain("comparar clasificación contra excel");
    assert.ok(compararExcel);
    assert.equal(compararExcel.id, "clasificacion_apoyos");
  });

  it("tool tiene executor read-only", () => {
    const t = getDirectorIaTool("get_clasificacion_apoyos_query");
    assert.equal(t.executor, "loadClasificacionApoyosForChat");
    assert.equal(t.readOnly, true);
    assert.equal(t.status, "available_on_demand");
    assert.equal(isDirectorIaToolExecutable("get_clasificacion_apoyos_query"), true);
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });
});

describe("M4 period semantics", () => {
  it("mes_a vs mes_b; ausente, inválido o iguales no inventa", () => {
    assert.deepEqual(resolveComparePeriods("clasificación de apoyos 2026-01 2026-02"), {
      ok: true,
      mes_a: "2026-01",
      mes_b: "2026-02",
    });
    const missing = resolveComparePeriods("clasificación de apoyos");
    assert.equal(missing.ok, false);
    assert.equal(missing.code, "missing_period");
    const one = resolveComparePeriods("clasificación de apoyos 2026-01");
    assert.equal(one.ok, false);
    assert.equal(one.code, "missing_period");
    const same = resolveComparePeriods("clasificación 2026-01 2026-01");
    assert.equal(same.ok, false);
    assert.equal(same.code, "same_period");
    const invalid = resolveComparePeriods("clasificación 2026-13 2026-02");
    assert.equal(invalid.ok, false);
    const many = resolveComparePeriods("clasificación 2026-01 2026-02 2026-03");
    assert.equal(many.ok, false);
    const explicit = resolveComparePeriods("", { mes_a: "2026-03", mes_b: "2026-04" });
    assert.deepEqual(explicit, { ok: true, mes_a: "2026-03", mes_b: "2026-04" });
    const missingB = resolveComparePeriods("", { mes_a: "2026-03" });
    assert.equal(missingB.ok, false);
    assert.equal(missingB.code, "missing_mes_b");
  });
});

describe("M4 loader", () => {
  it("compara mes_a vs mes_b y mantiene GASTOS/INVERSIONES/TALLER separados", async () => {
    const rows = [
      folioRow({ categoria: "GASTOS", importe: 100, mes_cargo: "2026-01" }),
      folioRow({ categoria: "GASTOS", importe: 40, mes_cargo: "2026-02" }),
      folioRow({ categoria: "INVERSIONES", importe: 200, mes_cargo: "2026-01" }),
      folioRow({ categoria: "INVERSIONES", importe: 50, mes_cargo: "2026-02" }),
      folioRow({ categoria: "TALLER", importe: 30, mes_cargo: "2026-01" }),
      folioRow({ categoria: "TALLER", importe: 10, mes_cargo: "2026-02" }),
    ];
    const payload = await loadClasificacionApoyosForChat(null, 1, zpReq(), {
      ...injectOpts(rows, { question: "clasificación de apoyos 2026-01 2026-02" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.source, SOURCE);
    assert.equal(payload.semantic_class, CLASIFICACION_SEMANTIC_CLASS);
    assert.equal(payload.mes_a, "2026-01");
    assert.equal(payload.mes_b, "2026-02");
    assert.deepEqual(payload.families, FAMILIES);
    const byCat = Object.fromEntries(payload.comparisons.map((r) => [r.categoria, r]));
    assert.equal(byCat.GASTOS.valor_a, 100);
    assert.equal(byCat.GASTOS.valor_b, 40);
    assert.equal(byCat.GASTOS.delta, 60);
    assert.equal(byCat.INVERSIONES.valor_a, 200);
    assert.equal(byCat.INVERSIONES.valor_b, 50);
    assert.equal(byCat.TALLER.valor_a, 30);
    assert.equal(byCat.TALLER.valor_b, 10);
    assert.equal(byCat.TOTAL.delta, 230);
    assert.equal(payload.matrix.plantas.length, 1);
    assert.equal(payload.matrix.plantas[0].label, "Acapulco");
  });

  it("delta positivo, negativo y base cero no inventa porcentaje", async () => {
    const pos = await loadClasificacionApoyosForChat(null, 1, zpReq(), {
      ...injectOpts(
        [
          folioRow({ importe: 80, mes_cargo: "2026-01" }),
          folioRow({ importe: 20, mes_cargo: "2026-02" }),
        ],
        { question: "clasificación de apoyos 2026-01 2026-02" }
      ),
    });
    const gastosPos = pos.comparisons.find((r) => r.categoria === "GASTOS");
    assert.ok(gastosPos.delta > 0);
    assert.equal(gastosPos.percent_change, 300);

    const neg = await loadClasificacionApoyosForChat(null, 1, zpReq(), {
      ...injectOpts(
        [
          folioRow({ importe: 10, mes_cargo: "2026-01" }),
          folioRow({ importe: 40, mes_cargo: "2026-02" }),
        ],
        { question: "clasificación de apoyos 2026-01 2026-02" }
      ),
    });
    const gastosNeg = neg.comparisons.find((r) => r.categoria === "GASTOS");
    assert.ok(gastosNeg.delta < 0);
    assert.equal(gastosNeg.percent_change, -75);

    const zero = await loadClasificacionApoyosForChat(null, 1, zpReq(), {
      ...injectOpts([folioRow({ importe: 50, mes_cargo: "2026-01" })], {
        question: "clasificación de apoyos 2026-01 2026-02",
      }),
    });
    const gastosZero = zero.comparisons.find((r) => r.categoria === "GASTOS");
    assert.equal(gastosZero.valor_b, 0);
    assert.equal(gastosZero.percent_change, null);
    assert.equal(percentChange(50, 0), null);
    const answer = buildClasificacionApoyosChatResult(zero).answer;
    assert.match(answer, /base cero|porcentaje no calculable/i);
    assert.doesNotMatch(answer, /la causa es|hay desviaci|el responsable es/i);
  });

  it("ausencia y importe null no inventan partida", async () => {
    const empty = await loadClasificacionApoyosForChat(null, 1, zpReq(), {
      ...injectOpts([], { question: "clasificación de apoyos 2026-01 2026-02" }),
    });
    assert.equal(empty.ok, true);
    const gastos = empty.comparisons.find((r) => r.categoria === "GASTOS");
    assert.equal(gastos.valor_a, 0);
    assert.equal(gastos.valor_b, 0);
    const withNull = await loadClasificacionApoyosForChat(null, 1, zpReq(), {
      ...injectOpts(
        [
          folioRow({ importe: null, mes_cargo: "2026-01" }),
          folioRow({ importe: 25, mes_cargo: "2026-01", categoria: "GASTOS" }),
        ],
        { question: "clasificación de apoyos 2026-01 2026-02" }
      ),
    });
    assert.equal(withNull.comparisons.find((r) => r.categoria === "GASTOS").valor_a, 25);
  });

  it("periodo ausente o inválido no consulta", async () => {
    const captured = {};
    const missing = await loadClasificacionApoyosForChat(null, 1, zpReq(), {
      ...injectOpts([folioRow()], { question: "clasificación de apoyos", captured }),
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.status, 400);
    assert.equal(captured.called, undefined);
    const same = await loadClasificacionApoyosForChat(null, 1, zpReq(), {
      ...injectOpts([folioRow()], { question: "clasificación de apoyos 2026-01 2026-01" }),
    });
    assert.equal(same.ok, false);
    assert.match(same.error, /distintos/);
  });

  it("GA permitido; GV 403; cross-planta 403; plantas_permitidas", async () => {
    const ga = await loadClasificacionApoyosForChat(null, 1, gaReq([1, 11, 12]), {
      ...injectOpts([folioRow()], { question: "clasificación de apoyos 2026-01 2026-02" }),
    });
    assert.equal(ga.ok, true);
    const gv = await loadClasificacionApoyosForChat(null, 1, gvReq(), {
      ...injectOpts([folioRow()], { question: "clasificación de apoyos 2026-01 2026-02" }),
    });
    assert.equal(gv.ok, false);
    assert.equal(gv.status, 403);
    assert.equal(gv.code, SOURCE_RESTRICTED);
    const cross = await loadClasificacionApoyosForChat(null, 1, ggReq([2]), {
      ...injectOpts([folioRow()], { question: "clasificación de apoyos 2026-01 2026-02" }),
    });
    assert.equal(cross.ok, false);
    assert.equal(cross.status, 403);
    const noPlant = await loadClasificacionApoyosForChat(null, null, zpReq(), {
      ...injectOpts([folioRow()], { question: "clasificación de apoyos 2026-01 2026-02" }),
    });
    assert.equal(noPlant.ok, false);
    assert.equal(noPlant.status, 400);
  });

  it("no copia fallback global ni grupo incompleto", async () => {
    const captured = {};
    const unknown = await loadClasificacionApoyosForChat(null, 7, zpReq(), {
      ...injectOpts([folioRow({ planta_id: 7 })], {
        question: "clasificación de apoyos 2026-01 2026-02",
        captured,
        resolvePlanta: async () => ({ id: 7, nombre: "Otra", clave: "X" }),
      }),
    });
    assert.equal(unknown.ok, false);
    assert.equal(unknown.code, "plant_not_in_comparativo");
    assert.equal(captured.called, undefined);
    assert.equal(findComparativoGroup(7), null);

    const incomplete = await loadClasificacionApoyosForChat(null, 1, gaReq([1]), {
      ...injectOpts([folioRow()], { question: "clasificación de apoyos 2026-01 2026-02" }),
    });
    assert.equal(incomplete.ok, false);
    assert.equal(incomplete.status, 403);
    assert.match(incomplete.error, /fuera de tu alcance|no amplio/i);

    const capturedPuebla = {};
    const puebla = await loadClasificacionApoyosForChat(null, 2, zpReq(), {
      ...injectOpts([folioRow({ planta_id: 2, importe: 15 })], {
        question: "clasificación de apoyos 2026-01 2026-02",
        captured: capturedPuebla,
        resolvePlanta: async () => ({ id: 2, nombre: "Puebla", clave: "E7" }),
      }),
    });
    assert.equal(puebla.ok, true);
    assert.deepEqual(capturedPuebla.ids.slice().sort((a, b) => a - b), [2, 14]);
    assert.equal(puebla.planta_grupo, "Puebla");
    assert.notEqual(capturedPuebla.ids.length, 6);
  });
});

describe("M4 no COMPARAR / no Excel / no HTTP / no writes", () => {
  it("el módulo no genera xlsx ni llama COMPARAR ni HTTP ni escribe", () => {
    assert.doesNotMatch(M4_SRC, /\b(INSERT|UPDATE|DELETE)\b/);
    assert.doesNotMatch(M4_SRC, /\bfetch\s*\(/);
    assert.doesNotMatch(M4_SRC, /axios\./);
    assert.doesNotMatch(M4_SRC, /insertFolio/);
    assert.doesNotMatch(M4_SRC, /UPDATE\s+public\.folios/);
    assert.doesNotMatch(M4_SRC, /SET\s+mes_cargo/);
    assert.doesNotMatch(M4_SRC, /buildClasificacionApoyosWorkbook/);
    assert.doesNotMatch(M4_SRC, /exceljs/i);
    assert.doesNotMatch(M4_SRC, /xlsx/i);
    assert.doesNotMatch(M4_SRC, /clasificacion-comparar/);
    assert.doesNotMatch(M4_SRC, /\/api\/dashboard\/clasificacion/);
    assert.doesNotMatch(M4_SRC, /require\(["']\.\/server["']\)/);
    assert.doesNotMatch(M4_SRC, /resolvePlantasComparativo/);
    assert.match(M4_SRC, /buildClasificacionMatrix/);
    assert.match(M4_SRC, /FROM public\.folios f/);
    assert.match(M4_SRC, /assertFolioStatusAccess/);
  });

  it("el chat cablea M4 in-process antes de OpenAI y no toca COMPARAR/Excel", () => {
    const idx = CHAT_SRC.indexOf('intent === "clasificacion_apoyos_query"');
    const openaiIdx = CHAT_SRC.indexOf("Asistente IA deshabilitado");
    const expenseIdx = CHAT_SRC.indexOf('intent === "expense_analysis"');
    assert.ok(idx > 0);
    assert.ok(idx < openaiIdx);
    assert.ok(idx < expenseIdx);
    assert.match(CHAT_SRC, /loadClasificacionApoyosForChat/);
    assert.doesNotMatch(CHAT_SRC, /buildClasificacionApoyosWorkbook/);
    assert.doesNotMatch(CHAT_SRC, /clasificacion-comparar/);
    assert.doesNotMatch(CHAT_SRC, /insertFolio/);
  });
});

describe("M4 chat end-to-end in-process", () => {
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
        query: async (sql, params) => {
          if (/FROM public\.plantas/.test(sql)) {
            return { rows: [{ id: 1, nombre: "Acapulco", clave: "ACA" }] };
          }
          if (/FROM public\.folios/.test(sql)) {
            const ids = (params && params[1]) || [];
            const months = (params && params[0]) || [];
            return {
              rows: data.filter(
                (r) => months.includes(String(r.mes_cargo)) && ids.includes(Number(r.planta_id))
              ),
            };
          }
          return { rows: [] };
        },
        release() {},
      }),
    };
  }

  it("pregunta de clasificación llega al executor", async () => {
    configureDirectorIaChat({
      pool: poolWith([
        folioRow({ importe: 100, mes_cargo: "2026-01" }),
        folioRow({ importe: 40, mes_cargo: "2026-02" }),
      ]),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "clasificación de apoyos 2026-01 2026-02"
    );
    assert.equal(result.ok, true);
    assert.notEqual(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.mode, "clasificacion_apoyos");
    assert.equal(result.context_meta.openai_called, false);
    assert.equal(result.clasificacion_apoyos.mes_a, "2026-01");
    assert.equal(result.clasificacion_apoyos.mes_b, "2026-02");
    const gastos = result.clasificacion_apoyos.comparisons.find((r) => r.categoria === "GASTOS");
    assert.equal(gastos.valor_a, 100);
    assert.equal(gastos.valor_b, 40);
    assert.doesNotMatch(result.answer, /todavía no está integrado/i);
    assert.doesNotMatch(result.answer, /la causa es|hay desviaci/i);
  });

  it("excel de clasificación sigue SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "exportar excel de clasificación de apoyos"
    );
    assert.equal(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.requested_domain, "clasificacion_apoyos");
    assert.equal(result.clasificacion_apoyos, undefined);
  });

  it("gastos de folios no entra a M4", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "listar gastos de folios 2026-01"
    );
    assert.notEqual(result.context_meta && result.context_meta.mode, "clasificacion_apoyos");
    assert.equal(result.clasificacion_apoyos, undefined);
  });

  it("periodo ausente aclara y no inventa mes", async () => {
    configureDirectorIaChat({ pool: poolWith([folioRow()]) });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "clasificación de apoyos"
    );
    assert.equal(result.context_meta.mode, "clasificacion_apoyos");
    assert.equal(result.context_meta.veracity, SOURCE_ERROR);
    assert.match(result.answer, /YYYY-MM/);
    assert.doesNotMatch(result.answer, /2026-01/);
  });

  it("GV no consulta M4", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(gvReq(), 1, "clasificación de apoyos 2026-01 2026-02");
    assert.equal(result.context_meta.veracity, SOURCE_RESTRICTED);
    assert.equal(result.clasificacion_apoyos == null, true);
  });
});
