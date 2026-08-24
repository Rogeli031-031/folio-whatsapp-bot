"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { DIRECTOR_IA_VERACITY } = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { buildDirectorIaToolPlan } = require("../lib/director-ia-tool-orchestrator");
const {
  assembleFinancialDiagnosisEvidence,
  loadFinancialDiagnosisForChat,
  formatFinancialDiagnosisContext,
  buildFinancialDiagnosisPrompt,
  buildFinancialDiagnosisChatResult,
  FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM,
  IGF_SOURCE,
  ARR_SOURCE,
  M9_SOURCE,
} = require("../lib/director-ia-financial-diagnosis");

const ROOT = path.join(__dirname, "..");
const LIB_DIR = path.join(ROOT, "lib");
const FD_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-financial-diagnosis.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");
const IGF_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-igf-arr.js"), "utf8");
const IES_STD = fs.readFileSync(path.join(ROOT, "docs/director-ia/04-IES-STANDARD.md"), "utf8");
const RE_STD = fs.readFileSync(path.join(ROOT, "docs/director-ia/05-REASONING-ENGINE.md"), "utf8");

function plant() {
  return { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" };
}

function igfAvailable(over = {}) {
  return {
    version_id: 12,
    version_number: 3,
    row: { empresa: "Puebla", venta_ton: 10, margen_kg: 2.5 },
    composition: {
      ok: true,
      lines: [
        { line_key: "venta_ton", line_label: "Venta", value: 10, unit: "ton" },
        { line_key: "margen_kg", line_label: "Margen", value: 2.5, unit: "$/kg" },
      ],
      omitted_null_keys: [],
    },
    load_error: null,
    ...over,
  };
}

function arrAvailable(over = {}) {
  return { venta_ton: 11.5, desc_kg: 1.2, load_error: null, ...over };
}

function m9Ok(family, over = {}) {
  return {
    ok: true,
    semantic_class: `delta_${family}_period_compare`,
    family: `delta_${family}`,
    unit: family === "ingreso" ? "MXN" : family === "descuento" ? "$/kg" : "kg",
    planta_id: 1,
    planta_nombre: "Puebla",
    planta_clave: "E7",
    periodoA: "2026-01",
    periodoB: "2026-02",
    period_source: "default_latest_two",
    percent_change_not_computed: true,
    source_coercion: "coercion de fuente",
    not: ["igf_annex", "arr_snapshot"],
    datos: {
      planta: "Puebla",
      periodoA: "2026-01",
      periodoB: "2026-02",
      dejaron: { clientes: [{ cliente: "A" }] },
      mas: { clientes: [] },
      disminuyeron: { clientes: [] },
    },
    ...over,
  };
}

function assembleOk(over = {}) {
  return assembleFinancialDiagnosisEvidence({
    plant: plant(),
    year: 2026,
    month: 2,
    igfRaw: igfAvailable(),
    arrRaw: arrAvailable(),
    m9Venta: m9Ok("venta"),
    m9Descuento: m9Ok("descuento"),
    m9Ingreso: m9Ok("ingreso"),
    ...over,
  });
}

describe("financial_diagnosis planner y tools", () => {
  it("por qué cayó el ingreso es financial_diagnosis con IGF+ARR+M9", () => {
    const plan = planDirectorIaQuestion("por qué cayó el ingreso");
    assert.equal(plan.intent, "financial_diagnosis");
    const toolPlan = buildDirectorIaToolPlan(plan, { planta_id: 1, question: "por qué cayó el ingreso" });
    const ids = (toolPlan.tools || []).map((t) => t.tool_id);
    assert.ok(ids.includes("get_igf_snapshot") || ids.some((id) => /igf/.test(id)));
    assert.ok(ids.includes("get_arr_snapshot") || ids.some((id) => /arr/.test(id)));
    assert.ok(ids.some((id) => /delta/.test(id)));
  });

  it("delta_* e igf_status/arr_status/M6/M11/M12/M18 se preservan en planner", () => {
    assert.equal(planDirectorIaQuestion("cómo cambió la venta").intent, "delta_sales");
    assert.equal(planDirectorIaQuestion("cómo cambió el descuento").intent, "delta_discount");
    assert.equal(planDirectorIaQuestion("cómo cambió el ingreso").intent, "delta_income");
    assert.equal(planDirectorIaQuestion("cómo va IGF").intent, "igf_status");
    assert.equal(planDirectorIaQuestion("cómo va ARR").intent, "arr_status");
    assert.equal(planDirectorIaQuestion("qué gastos de folios existen 2026-08").intent, "expense_analysis");
    assert.equal(planDirectorIaQuestion("Dame el expediente comercial de Acme").intent, "expediente_comercial");
    assert.equal(planDirectorIaQuestion("notas de revisión 2026-08-20").intent, "revision_notes");
    assert.equal(planDirectorIaQuestion("¿Cómo va el presupuesto semanal?").intent, "budget_status");
    assert.equal(planDirectorIaQuestion("taller de AT-15 2026-08").intent, "taller_at");
  });
});

describe("assembleFinancialDiagnosisEvidence", () => {
  it("junta IGF+ARR+M9 con provenance separada", () => {
    const assembled = assembleOk();
    assert.equal(assembled.ok, true);
    assert.ok(assembled.sources.igf);
    assert.ok(assembled.sources.arr);
    assert.ok(assembled.sources.m9);
    assert.equal(assembled.sources.igf.source, IGF_SOURCE);
    assert.equal(assembled.sources.arr.source, ARR_SOURCE);
    assert.equal(assembled.sources.m9.source, M9_SOURCE);
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.arr.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.m9.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.igf.period, "2026-02");
    assert.equal(assembled.sources.arr.period, "2026-02");
    assert.equal(assembled.sources.m9.period.period_a, "2026-01");
    assert.equal(assembled.sources.m9.period.period_b, "2026-02");
    assert.equal(assembled.alignment.status, "comparable");
    assert.equal(assembled.alignment.silently_aligned, false);
    assert.equal(assembled.sources.igf.plant.planta_nombre, "Puebla");
    assert.equal(assembled.sources.arr.payload.venta_ton, 11.5);
    assert.ok(assembled.sources.m9.payload.venta);
    assert.ok(assembled.sources.m9.payload.descuento);
    assert.ok(assembled.sources.m9.payload.ingreso);
  });

  it("periodos desalineados quedan mismatch visibles", () => {
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 3,
      igfRaw: igfAvailable(),
      arrRaw: arrAvailable(),
      m9Venta: m9Ok("venta"),
      m9Descuento: m9Ok("descuento"),
      m9Ingreso: m9Ok("ingreso"),
    });
    assert.equal(assembled.sources.igf.period, "2026-03");
    assert.equal(assembled.sources.arr.period, "2026-03");
    assert.equal(assembled.sources.m9.period.period_a, "2026-01");
    assert.equal(assembled.alignment.status, "mismatch");
    assert.ok(assembled.limitations.includes("period_mismatch"));
    const ctx = formatFinancialDiagnosisContext(assembled);
    assert.match(ctx, /mismatch/);
    assert.match(ctx, /No se alinearon en silencio/);
  });

  it("IGF missing no se rellena con ARR", () => {
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: { version_id: null, version_number: null, row: null, composition: null },
      arrRaw: arrAvailable(),
      m9Venta: m9Ok("venta"),
      m9Descuento: m9Ok("descuento"),
      m9Ingreso: m9Ok("ingreso"),
    });
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.sources.igf.absence, "DATA_NOT_FOUND");
    assert.equal(assembled.sources.igf.error, null);
    assert.equal(assembled.sources.arr.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.notEqual(assembled.sources.igf.payload && assembled.sources.igf.payload.venta_ton, 11.5);
    assert.ok(assembled.limitations.includes("igf_DATA_NOT_FOUND"));
  });

  it("ARR missing no se rellena con IGF", () => {
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: igfAvailable(),
      arrRaw: { venta_ton: null, desc_kg: null },
      m9Venta: m9Ok("venta"),
      m9Descuento: m9Ok("descuento"),
      m9Ingreso: m9Ok("ingreso"),
    });
    assert.equal(assembled.sources.arr.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.sources.arr.payload.venta_ton, null);
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.ok(assembled.limitations.includes("arr_DATA_NOT_FOUND"));
  });

  it("M9 missing y M9 tool error se distinguen", () => {
    const missing = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: igfAvailable(),
      arrRaw: arrAvailable(),
      m9Venta: { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "sin periodos" },
      m9Descuento: { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "sin periodos" },
      m9Ingreso: { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "sin periodos" },
    });
    assert.equal(missing.sources.m9.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(missing.sources.m9.absence, "DATA_NOT_FOUND");
    assert.equal(missing.sources.m9.error, null);

    const errored = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: igfAvailable(),
      arrRaw: arrAvailable(),
      m9Venta: { ok: false, code: DIRECTOR_IA_VERACITY.SOURCE_ERROR, error: "falló query" },
      m9Descuento: { ok: false, code: DIRECTOR_IA_VERACITY.SOURCE_ERROR, error: "falló query" },
      m9Ingreso: { ok: false, code: DIRECTOR_IA_VERACITY.SOURCE_ERROR, error: "falló query" },
    });
    assert.equal(errored.sources.m9.status, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(errored.sources.m9.absence, null);
    assert.equal(errored.sources.m9.error, "falló query");
    assert.equal(errored.sources.m9.payload.venta.status, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(errored.sources.m9.payload.venta.error_kind, "TOOL_ERROR");
    assert.equal(errored.sources.m9.payload.venta.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
  });

  it("partial success conserva fuentes OK y marca limitation", () => {
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: igfAvailable(),
      arrRaw: { venta_ton: null, desc_kg: null },
      m9Venta: m9Ok("venta"),
      m9Descuento: { ok: false, code: DIRECTOR_IA_VERACITY.SOURCE_ERROR, error: "timeout" },
      m9Ingreso: m9Ok("ingreso"),
    });
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.arr.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.sources.m9.status, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
    assert.equal(assembled.sources.m9.payload.venta.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.m9.payload.descuento.status, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.ok(assembled.limitations.some((l) => l.startsWith("arr_") || l.startsWith("m9_")));
  });

  it("null != 0 y absence != 0", () => {
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: igfAvailable({
        composition: {
          ok: true,
          lines: [{ line_key: "venta_ton", line_label: "Venta", value: 0, unit: "ton" }],
          omitted_null_keys: ["margen_kg"],
        },
      }),
      arrRaw: { venta_ton: null, desc_kg: 0 },
      m9Venta: m9Ok("venta"),
      m9Descuento: m9Ok("descuento"),
      m9Ingreso: m9Ok("ingreso"),
    });
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
    assert.ok(assembled.sources.igf.payload.omitted_null_keys.includes("margen_kg"));
    assert.equal(assembled.sources.igf.payload.composition.lines[0].value, 0);
    assert.equal(assembled.sources.arr.status, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
    assert.equal(assembled.sources.arr.payload.venta_ton, null);
    assert.equal(assembled.sources.arr.payload.desc_kg, 0);
    assert.notEqual(assembled.sources.arr.payload.venta_ton, 0);
    assert.notEqual(assembled.sources.igf.absence, 0);
  });

  it("error != absence y una fuente no reemplaza otra", () => {
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: { load_error: "boom IGF" },
      arrRaw: arrAvailable(),
      m9Venta: { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "missing" },
      m9Descuento: { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "missing" },
      m9Ingreso: { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "missing" },
    });
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(assembled.sources.igf.absence, null);
    assert.equal(assembled.sources.igf.error_kind, "TOOL_ERROR");
    assert.equal(assembled.sources.m9.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.sources.m9.absence, "DATA_NOT_FOUND");
    assert.equal(assembled.sources.m9.error, null);
    assert.equal(assembled.sources.arr.payload.venta_ton, 11.5);
    assert.equal(assembled.sources.igf.payload, null);
  });

  it("prompt prohíbe causalidad y no reutiliza causa operativa del annex", () => {
    const assembled = assembleOk();
    const prompt = buildFinancialDiagnosisPrompt(assembled, "por qué cayó el ingreso");
    assert.match(prompt.systemPrompt, /Prohibido: causalidad/);
    assert.match(prompt.systemPrompt, /IGF causó ARR/);
    assert.doesNotMatch(prompt.systemPrompt, /causa operativa/);
    assert.match(FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM, /No formules hipótesis N5/);
    const result = buildFinancialDiagnosisChatResult(assembled, { answer: "Hechos. Sin causa.", planta_id: 1 });
    assert.equal(result.context_meta.openai_call_count, 1);
    assert.equal(result.context_meta.ies_runtime, false);
    assert.equal(result.context_meta.reasoning_engine, false);
    assert.deepEqual(result.sources.slice(0, 3), [IGF_SOURCE, ARR_SOURCE, M9_SOURCE]);
  });
});

describe("loadFinancialDiagnosisForChat", () => {
  it("carga IGF+ARR+M9 en una corrida", async () => {
    const counts = { igfArr: 0, venta: 0, desc: 0, ing: 0 };
    const assembled = await loadFinancialDiagnosisForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "por qué cayó el ingreso",
      loadIgfArrBlocks: async () => {
        counts.igfArr += 1;
        return { ok: true, year: 2026, month: 2, plant: plant(), igf: igfAvailable(), arr: arrAvailable() };
      },
      loadDeltaVenta: async () => {
        counts.venta += 1;
        return m9Ok("venta");
      },
      loadDeltaDescuento: async () => {
        counts.desc += 1;
        return m9Ok("descuento");
      },
      loadDeltaIngreso: async () => {
        counts.ing += 1;
        return m9Ok("ingreso");
      },
    });
    assert.deepEqual(counts, { igfArr: 1, venta: 1, desc: 1, ing: 1 });
    assert.equal(assembled.ok, true);
    assert.equal(assembled.abort, false);
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.arr.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.m9.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
  });

  it("GA aborta sin ensamblar respuesta", async () => {
    const result = await loadFinancialDiagnosisForChat(null, 1, { dashboardAuth: { role: "GA" } }, {
      question: "por qué cayó el ingreso",
      loadIgfArrBlocks: async () => ({
        ok: false,
        abort: true,
        status: 403,
        code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
        error: "GA no tiene acceso a KPIs financieros.",
      }),
      loadDeltaVenta: async () => {
        throw new Error("M9 no debe ejecutarse tras abort GA");
      },
      loadDeltaDescuento: async () => {
        throw new Error("M9 no debe ejecutarse tras abort GA");
      },
      loadDeltaIngreso: async () => {
        throw new Error("M9 no debe ejecutarse tras abort GA");
      },
    });
    assert.equal(result.abort, true);
    assert.equal(result.status, 403);
    assert.equal(result.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
  });

  it("GV limita M9 y no aborta IGF/ARR", async () => {
    const restricted = {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Tu rol (GV) solo tiene acceso a Delta ingreso Forecast y acciones DICF en tu planta.",
    };
    const assembled = await loadFinancialDiagnosisForChat(null, 1, { dashboardAuth: { role: "GV" } }, {
      question: "por qué cayó el ingreso",
      loadIgfArrBlocks: async () => ({
        ok: true,
        year: 2026,
        month: 2,
        plant: plant(),
        igf: igfAvailable(),
        arr: arrAvailable(),
      }),
      loadDeltaVenta: async () => restricted,
      loadDeltaDescuento: async () => restricted,
      loadDeltaIngreso: async () => restricted,
    });
    assert.equal(assembled.abort, false);
    assert.equal(assembled.ok, true);
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.m9.status, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.ok(assembled.limitations.includes("m9_SOURCE_RESTRICTED"));
  });

  it("cross-planta GG aborta", async () => {
    const restricted = {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin permiso para esta planta",
    };
    const result = await loadFinancialDiagnosisForChat(
      null,
      1,
      { dashboardAuth: { role: "GG", plantas_permitidas: [99] } },
      {
        question: "por qué cayó el ingreso",
        loadIgfArrBlocks: async () => ({
          ok: true,
          year: 2026,
          month: 2,
          plant: plant(),
          igf: igfAvailable(),
          arr: arrAvailable(),
        }),
        loadDeltaVenta: async () => restricted,
        loadDeltaDescuento: async () => restricted,
        loadDeltaIngreso: async () => restricted,
      }
    );
    assert.equal(result.abort, true);
    assert.equal(result.status, 403);
  });
});

describe("financial_diagnosis chat wiring", () => {
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
      loadFinancialDiagnosisForChat: undefined,
      loadIgfArrBlocks: undefined,
      loadDeltaVenta: undefined,
      loadDeltaDescuento: undefined,
      loadDeltaIngreso: undefined,
    });
  });

  function poolWith() {
    return {
      connect: async () => ({
        query: async (sql) => {
          if (/FROM public\.plantas/.test(sql) && /id = \$1/.test(sql)) {
            return { rows: [{ id: 1, nombre: "Puebla", clave: "E7" }] };
          }
          return { rows: [] };
        },
        release() {},
      }),
    };
  }

  it("una sola llamada OpenAI con IGF+ARR+M9 y sin early-return delta", async () => {
    let openaiCalls = 0;
    let lastPrompt = null;
    configureDirectorIaChat({
      pool: {},
      openaiChat: async (sys, user) => {
        openaiCalls += 1;
        lastPrompt = { sys, user };
        return "Resumen por bloque. Coincidencias sin causalidad.";
      },
      loadIgfArrBlocks: async () => ({
        ok: true,
        year: 2026,
        month: 2,
        plant: plant(),
        igf: igfAvailable(),
        arr: arrAvailable(),
      }),
      loadDeltaVenta: async () => m9Ok("venta"),
      loadDeltaDescuento: async () => m9Ok("descuento"),
      loadDeltaIngreso: async () => m9Ok("ingreso"),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "por qué cayó el ingreso"
    );
    assert.equal(result.ok, true);
    assert.equal(openaiCalls, 1);
    assert.equal(result.context_meta.openai_called, true);
    assert.equal(result.context_meta.openai_call_count, 1);
    assert.equal(result.context_meta.mode, "financial_diagnosis");
    assert.notEqual(result.context_meta.mode, "delta_income");
    assert.ok(result.financial_diagnosis.sources.igf);
    assert.ok(result.financial_diagnosis.sources.arr);
    assert.ok(result.financial_diagnosis.sources.m9);
    assert.match(lastPrompt.user, /BLOQUE IGF/);
    assert.match(lastPrompt.user, /BLOQUE ARR/);
    assert.match(lastPrompt.user, /BLOQUE M9/);
    assert.match(lastPrompt.sys, /Prohibido: causalidad/);
    assert.equal(result.delta_venta, undefined);
    assert.equal(result.delta_ingreso, undefined);
  });

  it("GA no llama OpenAI", async () => {
    let openaiCalls = 0;
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => {
        openaiCalls += 1;
        return "no";
      },
      loadFinancialDiagnosisForChat: async () => ({
        ok: false,
        abort: true,
        status: 403,
        code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
        error: "GA no tiene acceso a KPIs financieros.",
      }),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "GA" } },
      1,
      "por qué cayó el ingreso"
    );
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
    assert.equal(openaiCalls, 0);
  });

  it("delta_sales sigue in-process sin OpenAI", async () => {
    let openaiCalls = 0;
    configureDirectorIaChat({
      pool: poolWith(),
      openaiChat: async () => {
        openaiCalls += 1;
        return "no debería";
      },
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "cómo cambió la venta"
    );
    assert.equal(result.context_meta.mode, "delta_sales");
    assert.equal(result.context_meta.openai_called, false);
    assert.equal(openaiCalls, 0);
    assert.notEqual(result.context_meta.mode, "financial_diagnosis");
    assert.equal(result.financial_diagnosis, undefined);
  });
});

describe("límites de implementación", () => {
  it("helper y chat no hacen HTTP interno ni writes", () => {
    assert.doesNotMatch(FD_SRC, /\baxios\b/);
    assert.doesNotMatch(FD_SRC, /\bfetch\s*\(/);
    assert.doesNotMatch(FD_SRC, /\bhttp\.request\b/);
    assert.doesNotMatch(FD_SRC, /\bINSERT\s+INTO\b/i);
    assert.doesNotMatch(FD_SRC, /\bUPDATE\s+\w+\s+SET\b/i);
    assert.doesNotMatch(FD_SRC, /\bDELETE\s+FROM\b/i);
    const fdBranch = CHAT_SRC.split("financial_diagnosis in-process")[1] || "";
    const untilDelta = fdBranch.split("delta_sales in-process")[0] || "";
    assert.doesNotMatch(untilDelta, /\baxios\b/);
    assert.doesNotMatch(untilDelta, /\bINSERT\s+INTO\b/i);
  });

  it("no toca IES ni Reasoning Engine", () => {
    assert.doesNotMatch(FD_SRC, /director-ia-ies/);
    assert.doesNotMatch(FD_SRC, /director-ia-reasoning/);
    assert.doesNotMatch(FD_SRC, /evidence-builder/);
    assert.match(CHAT_SRC, /intent === "financial_diagnosis"/);
    assert.match(CHAT_SRC, /intent === "delta_sales"/);
    assert.match(CHAT_SRC, /intent === "igf_status"|loadIgfArrAnnexForChat/);
    assert.match(CHAT_SRC, /expense_analysis/);
    assert.match(CHAT_SRC, /expediente_comercial/);
    assert.match(CHAT_SRC, /revision_notes/);
    assert.match(CHAT_SRC, /budget_status/);
    assert.match(CHAT_SRC, /taller_at/);
    assert.equal(IES_STD.length > 100, true);
    assert.equal(RE_STD.length > 100, true);
  });

  it("annex IGF/ARR y loader de bloques coexisten", () => {
    assert.match(IGF_SRC, /async function loadIgfArrAnnexForChat/);
    assert.match(IGF_SRC, /async function loadIgfArrSourceBlocksForChat/);
    assert.match(IGF_SRC, /No fusiona venta\/desc/);
  });
});
