"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { DIRECTOR_IA_VERACITY } = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { buildDirectorIaToolPlan } = require("../lib/director-ia-tool-orchestrator");
const {
  assemblePlantDiagnosisEvidence,
  loadPlantDiagnosisForChat,
  formatPlantDiagnosisContext,
  buildPlantDiagnosisPrompt,
  buildPlantDiagnosisChatResult,
  PLANT_DIAGNOSIS_SYSTEM_ADDENDUM,
  AR_SOURCE,
  DICF_SOURCE,
  BITACORA_SOURCE,
  ARR_SOURCE,
  IGF_SOURCE,
  CS_SOURCE,
} = require("../lib/director-ia-plant-diagnosis");

const ROOT = path.join(__dirname, "..");
const LIB_DIR = path.join(ROOT, "lib");
const PD_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-plant-diagnosis.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");
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

function arAvailable() {
  return {
    period: { kind: "snapshot", as_of: "2026-08-23", latest_revision_date: "2026-08-20" },
    payload: {
      summary: { open: 4, closed: 1, overdue: 2 },
      top_overdue: [{ titulo: "Fuga tanque", tema: "Seguridad", dias_vencido: 12, responsable: "Ana" }],
      responsables: [{ name: "Ana", open_count: 2, overdue_count: 1 }],
      notes_excluded: true,
    },
  };
}

function dicfAvailable() {
  return {
    period: { kind: "action_dates" },
    payload: {
      actions: [
        {
          public_code: "D-1",
          cliente_nombre: "Acme",
          descripcion: "Seguimiento",
          estado: "pendiente",
          responsable: "Luis",
        },
      ],
      limit: 8,
      historial_omitted: true,
    },
  };
}

function bitacoraAvailable() {
  return {
    period: { kind: "bitacora_window", months: 3 },
    payload: { sessions: [{ fecha: "2026-08-01", tipo: "visita_planta", titulo: "Visita", resumen_ia: "Hay retraso" }] },
  };
}

function csAvailable() {
  return {
    period: { kind: "materialized_cache", yyyy_mm: "2026-02", year: 2026, month: 2, plant_code: "E7" },
    payload: {
      materialized: true,
      live_compute: false,
      counts: { dejaron: 2 },
      clients_shown: [{ category: "dejaron", cliente: "Acme", estado: "Dejaron de comprar" }],
      row_count: 2,
    },
  };
}

function assembleOk(over = {}) {
  return assemblePlantDiagnosisEvidence({
    plant: plant(),
    year: 2026,
    month: 2,
    actionRegisterRaw: arAvailable(),
    dicfRaw: dicfAvailable(),
    bitacoraRaw: bitacoraAvailable(),
    arrRaw: arrAvailable(),
    igfRaw: igfAvailable(),
    commercialStateRaw: csAvailable(),
    ...over,
  });
}

function loadOpts(over = {}) {
  return {
    question: "cómo va la planta",
    loadActionRegister: async () => arAvailable(),
    loadDicf: async () => dicfAvailable(),
    loadBitacora: async () => bitacoraAvailable(),
    loadCommercialStateSelect: async () => csAvailable(),
    loadIgfArrBlocks: async () => ({
      ok: true,
      year: 2026,
      month: 2,
      plant: plant(),
      igf: igfAvailable(),
      arr: arrAvailable(),
    }),
    ...over,
  };
}

describe("plant_diagnosis planner y tools", () => {
  it("cómo va la planta es plant_diagnosis con seis dominios y sin M9", () => {
    const plan = planDirectorIaQuestion("cómo va la planta");
    assert.equal(plan.intent, "plant_diagnosis");
    assert.deepEqual(plan.domains, [
      "action_register",
      "dicf",
      "bitacora",
      "arr",
      "igf",
      "commercial_state",
    ]);
    assert.equal(plan.domains.includes("delta_venta"), false);
    const toolPlan = buildDirectorIaToolPlan(plan, { planta_id: 1, question: "cómo va la planta" });
    const ids = (toolPlan.tools || []).map((t) => t.tool_id);
    assert.ok(ids.includes("get_action_register_context"));
    assert.ok(ids.includes("get_dicf_context"));
    assert.ok(ids.includes("get_bitacora_context"));
    assert.ok(ids.includes("get_arr_snapshot"));
    assert.ok(ids.includes("get_igf_snapshot"));
    assert.ok(ids.includes("get_commercial_state"));
    assert.equal(ids.some((id) => /delta/.test(id)), false);
  });

  it("preserva financial_diagnosis, listas comerciales, AR, M5/M6/M11/M12/M18", () => {
    assert.equal(planDirectorIaQuestion("por qué cayó el ingreso").intent, "financial_diagnosis");
    assert.equal(planDirectorIaQuestion("cómo va IGF").intent, "igf_status");
    assert.equal(planDirectorIaQuestion("cómo va ARR").intent, "arr_status");
    assert.equal(planDirectorIaQuestion("quiénes dejaron de comprar").intent, "commercial_state");
    assert.equal(planDirectorIaQuestion("acciones vencidas").intent, "overdue_actions");
    assert.equal(planDirectorIaQuestion("qué gastos de folios existen 2026-08").intent, "expense_analysis");
    assert.equal(planDirectorIaQuestion("Dame el expediente comercial de Acme").intent, "expediente_comercial");
    assert.equal(planDirectorIaQuestion("notas de revisión 2026-08-20").intent, "revision_notes");
    assert.equal(planDirectorIaQuestion("¿Cómo va el presupuesto semanal?").intent, "budget_status");
    assert.equal(planDirectorIaQuestion("taller de AT-15 2026-08").intent, "taller_at");
    assert.equal(planDirectorIaQuestion("bitácora de la planta").intent, "bitacora_lookup");
  });
});

describe("assemblePlantDiagnosisEvidence", () => {
  it("junta seis fuentes con provenance separada y la misma planta", () => {
    const assembled = assembleOk();
    assert.equal(assembled.ok, true);
    assert.equal(assembled.assembly_status, "complete");
    const s = assembled.sources;
    assert.equal(s.action_register.source, AR_SOURCE);
    assert.equal(s.dicf.source, DICF_SOURCE);
    assert.equal(s.bitacora.source, BITACORA_SOURCE);
    assert.equal(s.arr.source, ARR_SOURCE);
    assert.equal(s.igf.source, IGF_SOURCE);
    assert.equal(s.commercial_state.source, CS_SOURCE);
    assert.equal(s.action_register.plant.planta_id, 1);
    assert.equal(s.igf.plant.planta_id, 1);
    assert.equal(s.commercial_state.plant.planta_id, 1);
    assert.equal(assembled.sources.m9, undefined);
    assert.ok(assembled.limitations.includes("no_m9"));
    assert.equal(assembled.alignment.silently_aligned, false);
  });

  it("period mismatch IGF/ARR/CS queda visible", () => {
    const assembled = assemblePlantDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 3,
      actionRegisterRaw: arAvailable(),
      dicfRaw: dicfAvailable(),
      bitacoraRaw: bitacoraAvailable(),
      arrRaw: arrAvailable(),
      igfRaw: igfAvailable(),
      commercialStateRaw: csAvailable(),
    });
    assert.equal(assembled.sources.igf.period, "2026-03");
    assert.equal(assembled.sources.arr.period, "2026-03");
    assert.equal(assembled.sources.commercial_state.period.yyyy_mm, "2026-02");
    assert.equal(assembled.alignment.status, "mismatch");
    assert.ok(assembled.limitations.includes("period_mismatch"));
    const ctx = formatPlantDiagnosisContext(assembled);
    assert.match(ctx, /mismatch/);
    assert.match(ctx, /No se alinearon en silencio/);
  });

  it("AR missing no se rellena con IGF", () => {
    const assembled = assemblePlantDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      actionRegisterRaw: { not_found: true, period: { kind: "snapshot" }, payload: null },
      dicfRaw: dicfAvailable(),
      bitacoraRaw: bitacoraAvailable(),
      arrRaw: arrAvailable(),
      igfRaw: igfAvailable(),
      commercialStateRaw: csAvailable(),
    });
    assert.equal(assembled.sources.action_register.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.sources.action_register.absence, "DATA_NOT_FOUND");
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.assembly_status, "partial");
  });

  it("DICF missing y bitácora missing se marcan aparte", () => {
    const assembled = assemblePlantDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      actionRegisterRaw: arAvailable(),
      dicfRaw: { not_found: true, payload: { actions: [] } },
      bitacoraRaw: { not_found: true, payload: { sessions: [] } },
      arrRaw: arrAvailable(),
      igfRaw: igfAvailable(),
      commercialStateRaw: csAvailable(),
    });
    assert.equal(assembled.sources.dicf.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.sources.bitacora.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.sources.action_register.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.ok(assembled.limitations.includes("dicf_DATA_NOT_FOUND"));
    assert.ok(assembled.limitations.includes("bitacora_DATA_NOT_FOUND"));
  });

  it("ARR missing no se rellena con IGF; IGF missing no se rellena con ARR", () => {
    const a = assemblePlantDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      actionRegisterRaw: arAvailable(),
      dicfRaw: dicfAvailable(),
      bitacoraRaw: bitacoraAvailable(),
      arrRaw: { venta_ton: null, desc_kg: null },
      igfRaw: igfAvailable(),
      commercialStateRaw: csAvailable(),
    });
    assert.equal(a.sources.arr.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(a.sources.arr.payload.venta_ton, null);
    assert.equal(a.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);

    const b = assemblePlantDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      actionRegisterRaw: arAvailable(),
      dicfRaw: dicfAvailable(),
      bitacoraRaw: bitacoraAvailable(),
      arrRaw: arrAvailable(),
      igfRaw: { version_id: null, version_number: null, row: null, composition: null },
      commercialStateRaw: csAvailable(),
    });
    assert.equal(b.sources.igf.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(b.sources.arr.payload.venta_ton, 11.5);
  });

  it("commercial_state missing no se sustituye con DICF", () => {
    const assembled = assemblePlantDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      actionRegisterRaw: arAvailable(),
      dicfRaw: dicfAvailable(),
      bitacoraRaw: bitacoraAvailable(),
      arrRaw: arrAvailable(),
      igfRaw: igfAvailable(),
      commercialStateRaw: { not_found: true, payload: { counts: {}, clients_shown: [] } },
    });
    assert.equal(assembled.sources.commercial_state.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.sources.dicf.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
  });

  it("TOOL_ERROR != absence y SOURCE_RESTRICTED != missing", () => {
    const assembled = assemblePlantDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      actionRegisterRaw: { load_error: "boom AR" },
      dicfRaw: dicfAvailable(),
      bitacoraRaw: bitacoraAvailable(),
      arrRaw: { restricted: true, error: "GA no tiene acceso a KPIs financieros." },
      igfRaw: { restricted: true, error: "GA no tiene acceso a KPIs financieros." },
      commercialStateRaw: { restricted: true, error: "GA no tiene acceso a KPIs financieros." },
    });
    assert.equal(assembled.sources.action_register.status, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(assembled.sources.action_register.absence, null);
    assert.equal(assembled.sources.action_register.error_kind, "TOOL_ERROR");
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.equal(assembled.sources.igf.absence, null);
    assert.equal(assembled.sources.arr.status, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.equal(assembled.sources.commercial_state.status, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.notEqual(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.assembly_status, "partial");
  });

  it("null != 0 y absence != 0", () => {
    const assembled = assemblePlantDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      actionRegisterRaw: {
        period: { kind: "snapshot", as_of: "2026-08-23" },
        payload: { summary: { open: 0, closed: 0, overdue: 0 }, top_overdue: [], responsables: [] },
      },
      dicfRaw: dicfAvailable(),
      bitacoraRaw: bitacoraAvailable(),
      arrRaw: { venta_ton: null, desc_kg: 0 },
      igfRaw: igfAvailable({
        composition: {
          ok: true,
          lines: [{ line_key: "venta_ton", line_label: "Venta", value: 0, unit: "ton" }],
          omitted_null_keys: ["margen_kg"],
        },
      }),
      commercialStateRaw: csAvailable(),
    });
    assert.equal(assembled.sources.action_register.payload.summary.open, 0);
    assert.notEqual(assembled.sources.action_register.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.sources.arr.payload.venta_ton, null);
    assert.equal(assembled.sources.arr.payload.desc_kg, 0);
    assert.notEqual(assembled.sources.arr.payload.venta_ton, 0);
    assert.ok(assembled.sources.igf.payload.omitted_null_keys.includes("margen_kg"));
    assert.notEqual(assembled.sources.igf.absence, 0);
  });

  it("partial success conserva fuentes OK", () => {
    const assembled = assemblePlantDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      actionRegisterRaw: arAvailable(),
      dicfRaw: { load_error: "timeout dicf" },
      bitacoraRaw: bitacoraAvailable(),
      arrRaw: arrAvailable(),
      igfRaw: igfAvailable(),
      commercialStateRaw: { not_found: true },
    });
    assert.equal(assembled.sources.action_register.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.dicf.status, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(assembled.sources.commercial_state.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.assembly_status, "partial");
    const ctx = formatPlantDiagnosisContext(assembled);
    assert.match(ctx, /assembly_status=partial/);
    assert.match(ctx, /no es diagnóstico completo/);
  });

  it("prompt prohíbe causalidad y no incluye M9", () => {
    const assembled = assembleOk();
    const prompt = buildPlantDiagnosisPrompt(assembled, "cómo va la planta");
    assert.match(prompt.systemPrompt, /Prohibido: causalidad/);
    assert.match(prompt.systemPrompt, /AR causó IGF/);
    assert.match(prompt.systemPrompt, /No es M9/);
    assert.doesNotMatch(prompt.userContent, /BLOQUE M9/);
    assert.match(prompt.userContent, /BLOQUE action_register/);
    assert.match(prompt.userContent, /BLOQUE igf/);
    assert.match(PLANT_DIAGNOSIS_SYSTEM_ADDENDUM, /No formules hipótesis N5/);
    const result = buildPlantDiagnosisChatResult(assembled, { answer: "Hechos. Sin causa.", planta_id: 1 });
    assert.equal(result.context_meta.openai_call_count, 1);
    assert.equal(result.context_meta.m9_included, false);
    assert.equal(result.context_meta.ies_runtime, false);
    assert.equal(result.context_meta.reasoning_engine, false);
  });
});

describe("loadPlantDiagnosisForChat", () => {
  it("carga seis fuentes en una corrida sin M9", async () => {
    const counts = { ar: 0, dicf: 0, bit: 0, cs: 0, igfArr: 0, m9: 0 };
    const assembled = await loadPlantDiagnosisForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts({
        loadActionRegister: async () => {
          counts.ar += 1;
          return arAvailable();
        },
        loadDicf: async () => {
          counts.dicf += 1;
          return dicfAvailable();
        },
        loadBitacora: async () => {
          counts.bit += 1;
          return bitacoraAvailable();
        },
        loadCommercialStateSelect: async () => {
          counts.cs += 1;
          return csAvailable();
        },
        loadIgfArrBlocks: async () => {
          counts.igfArr += 1;
          return { ok: true, year: 2026, month: 2, plant: plant(), igf: igfAvailable(), arr: arrAvailable() };
        },
        loadDeltaVenta: async () => {
          counts.m9 += 1;
          throw new Error("M9 no debe llamarse");
        },
      })
    );
    assert.deepEqual(counts, { ar: 1, dicf: 1, bit: 1, cs: 1, igfArr: 1, m9: 0 });
    assert.equal(assembled.ok, true);
    assert.equal(assembled.abort, false);
    assert.equal(assembled.sources.action_register.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.m9, undefined);
  });

  it("GA conserva AR/DICF/bitácora y restringe IGF/ARR/CS sin abortar el pack", async () => {
    let igfCalled = 0;
    let csCalled = 0;
    const assembled = await loadPlantDiagnosisForChat(
      null,
      1,
      { dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      loadOpts({
        loadIgfArrBlocks: async () => {
          igfCalled += 1;
          throw new Error("IGF no debe llamarse para GA");
        },
        loadCommercialStateSelect: async () => {
          csCalled += 1;
          throw new Error("CS SELECT no debe correr para GA");
        },
      })
    );
    assert.equal(assembled.abort, false);
    assert.equal(assembled.ok, true);
    assert.equal(igfCalled, 0);
    assert.equal(csCalled, 0);
    assert.equal(assembled.sources.action_register.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.dicf.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.bitacora.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.equal(assembled.sources.arr.status, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.equal(assembled.sources.commercial_state.status, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.equal(assembled.sources.igf.absence, null);
    assert.notEqual(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(assembled.assembly_status, "partial");
  });

  it("cross-planta aborta fail-closed", async () => {
    const result = await loadPlantDiagnosisForChat(
      null,
      1,
      { dashboardAuth: { role: "GG", plantas_permitidas: [99] } },
      loadOpts({
        loadActionRegister: async () => {
          throw new Error("AR no debe correr sin planta");
        },
      })
    );
    assert.equal(result.abort, true);
    assert.equal(result.status, 403);
    assert.equal(result.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
  });

  it("IGF abort GA del loader financiero no tumba el pack", async () => {
    const assembled = await loadPlantDiagnosisForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts({
        loadIgfArrBlocks: async () => ({
          ok: false,
          abort: true,
          status: 403,
          code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
          error: "Sin acceso a KPIs financieros.",
        }),
      })
    );
    assert.equal(assembled.abort, false);
    assert.equal(assembled.sources.action_register.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.equal(assembled.sources.arr.status, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
  });
});

describe("plant_diagnosis chat wiring", () => {
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
      loadPlantDiagnosisForChat: undefined,
      loadFinancialDiagnosisForChat: undefined,
      loadIgfArrBlocks: undefined,
      loadActionRegister: undefined,
      loadDicf: undefined,
      loadBitacora: undefined,
      loadCommercialStateSelect: undefined,
    });
  });

  it("una sola llamada OpenAI con seis bloques y sin dump Action Register", async () => {
    let openaiCalls = 0;
    let lastPrompt = null;
    configureDirectorIaChat({
      pool: {},
      openaiChat: async (sys, user) => {
        openaiCalls += 1;
        lastPrompt = { sys, user };
        return "Riesgos observados. Sin causalidad.";
      },
      loadPlantDiagnosisForChat: async () => assembleOk(),
    });
    const result = await askDirectorIa({ body: {}, dashboardAuth: { role: "ZP" } }, 1, "cómo va la planta");
    assert.equal(result.ok, true);
    assert.equal(openaiCalls, 1);
    assert.equal(result.context_meta.openai_call_count, 1);
    assert.equal(result.context_meta.mode, "plant_diagnosis");
    assert.equal(result.context_meta.semantic_need, "EXECUTIVE_STATUS");
    assert.equal(result.context_meta.executive_composer, true);
    assert.equal(result.context_meta.m9_included, false);
    assert.ok(result.plant_diagnosis.sources.action_register);
    assert.ok(result.plant_diagnosis.sources.igf);
    assert.equal(result.plant_diagnosis.sources.m9, undefined);
    assert.match(lastPrompt.user, /PACK EJECUTIVO DETERMINÍSTICO/);
    assert.match(lastPrompt.user, /SLOT SITUATION/);
    assert.doesNotMatch(lastPrompt.user, /señala primero los clientes/);
    assert.doesNotMatch(lastPrompt.user, /BLOQUE M9/);
    assert.doesNotMatch(lastPrompt.user, /tema_details/);
    assert.match(lastPrompt.sys, /Ausencia no es cero/);
  });

  it("GA llama OpenAI una vez con restricciones visibles", async () => {
    let openaiCalls = 0;
    let lastUser = "";
    configureDirectorIaChat({
      pool: {},
      openaiChat: async (_sys, user) => {
        openaiCalls += 1;
        lastUser = user;
        return "AR visible. IGF restringido.";
      },
      loadPlantDiagnosisForChat: async () =>
        assemblePlantDiagnosisEvidence({
          plant: plant(),
          year: 2026,
          month: 2,
          actionRegisterRaw: arAvailable(),
          dicfRaw: dicfAvailable(),
          bitacoraRaw: bitacoraAvailable(),
          arrRaw: { restricted: true, error: "GA no tiene acceso a KPIs financieros." },
          igfRaw: { restricted: true, error: "GA no tiene acceso a KPIs financieros." },
          commercialStateRaw: { restricted: true, error: "GA no tiene acceso a KPIs financieros." },
        }),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      1,
      "cómo va la planta"
    );
    assert.equal(result.ok, true);
    assert.equal(openaiCalls, 1);
    assert.equal(result.plant_diagnosis.sources.igf.status, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.match(lastUser, /NOT_AUTHORIZED|sin permiso|restringid/i);
    assert.notEqual(result.status, 403);
  });

  it("financial_diagnosis se preserva y no entra a plant_diagnosis", async () => {
    let openaiCalls = 0;
    configureDirectorIaChat({
      pool: {},
      openaiChat: async () => {
        openaiCalls += 1;
        return "Financiero por bloque.";
      },
      loadFinancialDiagnosisForChat: async () => ({
        ok: true,
        abort: false,
        plant: plant(),
        requested_period: {},
        sources: {
          igf: { status: DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE, source: IGF_SOURCE, plant: plant(), period: "2026-02", payload: {} },
          arr: { status: DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE, source: ARR_SOURCE, plant: plant(), period: "2026-02", payload: {} },
          m9: { status: DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE, source: "dashboard.delta", plant: plant(), period: {}, payload: {} },
        },
        alignment: { status: "comparable", silently_aligned: false, note: "ok" },
        limitations: [],
      }),
      loadPlantDiagnosisForChat: async () => {
        throw new Error("plant_diagnosis no debe correr");
      },
    });
    const result = await askDirectorIa({ body: {}, dashboardAuth: { role: "ZP" } }, 1, "por qué cayó el ingreso");
    assert.equal(result.context_meta.mode, "financial_diagnosis");
    assert.equal(result.plant_diagnosis, undefined);
    assert.equal(openaiCalls, 1);
  });
});

describe("commercial_materiality_and_coverage", () => {
  const {
    buildCommercialMateriality,
    applyDicfCoverageToMateriality,
    classifyCommercialMovement,
    finiteKg,
    previousYearMonth,
    deriveClienteKeysForRow,
    MAGNITUDE_FIELD,
  } = require("../lib/director-ia-plant-diagnosis");

  it("kg_mes_real es la magnitud; null no es 0; forecast no es pérdida", () => {
    assert.equal(MAGNITUDE_FIELD, "kg_mes_real");
    assert.equal(finiteKg(null), null);
    assert.equal(finiteKg(undefined), null);
    assert.equal(finiteKg(""), null);
    assert.equal(finiteKg(0), 0);
    assert.notEqual(finiteKg(0), null);
    assert.deepEqual(previousYearMonth(2026, 1), { year: 2025, month: 12 });
    const mat = buildCommercialMateriality({
      year: 2026,
      month: 2,
      plantaId: 1,
      currentRows: [
        {
          cliente_norm: "Acme",
          canal: "Casa",
          subcanal: "",
          estado: "Activo",
          es_recuperable: true,
          kg_mes_real: 0,
          kg_mes_forecast: 900,
        },
      ],
      priorRows: [{ cliente_norm: "Acme", canal: "Casa", subcanal: "", kg_mes_real: 400 }],
    });
    const dejaron = mat.categories.find((c) => c.category === "dejaron");
    assert.equal(dejaron.period, "2026-01");
    assert.equal(dejaron.top_clients[0].observed_magnitude_kg, 400);
    assert.equal(dejaron.top_clients[0].kg_mes_forecast_not_used, 900);
    assert.equal(dejaron.top_clients[0].provenance, CS_SOURCE);
    assert.equal(dejaron.denominator_kg, 400);
    assert.equal(dejaron.top_n_share, 1);
    assert.equal(dejaron.forecast_not_used_as_loss, true);
    assert.equal(mat.unit, "kg");
    assert.equal(mat.provenance, CS_SOURCE);
  });

  it("clasifica dejaron por es_recuperable y disminuyeron solo por estado almacenado", () => {
    assert.equal(
      classifyCommercialMovement({
        es_recuperable: true,
        estado: "Activo",
        kg_mes_forecast: 10,
        kg_mes_real: 1,
      }),
      "dejaron"
    );
    assert.equal(
      classifyCommercialMovement({ estado: "Disminuyeron", kg_mes_real: 50, kg_mes_forecast: 80 }),
      "disminuyeron"
    );
    assert.equal(
      classifyCommercialMovement({
        estado: "Activo",
        es_recuperable: false,
        kg_mes_real: 10,
        kg_mes_forecast: 50,
      }),
      null
    );
  });

  it("concentración top-N con denominador explícito y empate determinístico", () => {
    const mat = buildCommercialMateriality({
      year: 2026,
      month: 3,
      plantaId: 1,
      topN: 2,
      currentRows: [
        { cliente_norm: "Beta", canal: "Casa", subcanal: "", estado: "Disminuyeron", kg_mes_real: 100 },
        { cliente_norm: "Alfa", canal: "Casa", subcanal: "", estado: "Disminuyeron", kg_mes_real: 100 },
        { cliente_norm: "Gamma", canal: "Casa", subcanal: "", estado: "Disminuyeron", kg_mes_real: 50 },
        { cliente_norm: "NullCo", canal: "Casa", subcanal: "", estado: "Disminuyeron", kg_mes_real: null },
      ],
      priorRows: [],
    });
    const cat = mat.categories.find((c) => c.category === "disminuyeron");
    assert.equal(cat.period, "2026-03");
    assert.equal(cat.denominator_kg, 250);
    assert.equal(cat.client_count_ranked, 3);
    assert.equal(cat.client_count_magnitude_unknown, 1);
    assert.equal(cat.top_clients.length, 2);
    assert.equal(cat.top_clients[0].cliente_display, "Alfa");
    assert.equal(cat.top_clients[1].cliente_display, "Beta");
    assert.equal(cat.top_clients[0].share_of_observed_magnitude, 100 / 250);
    assert.equal(cat.top_n_share, 200 / 250);
    assert.equal(cat.magnitude_unknown_clients[0].cliente_display, "NullCo");
    assert.equal(cat.magnitude_unknown_clients[0].missing_reason, "current_month_kg_mes_real_null");
  });

  it("dejaron sin mes previo no convierte null en 0 ni entra al ranking", () => {
    const mat = buildCommercialMateriality({
      year: 2026,
      month: 2,
      plantaId: 1,
      currentRows: [{ cliente_norm: "Hueco", canal: "Casa", subcanal: "", es_recuperable: true, kg_mes_real: 0 }],
      priorRows: [],
    });
    const cat = mat.categories.find((c) => c.category === "dejaron");
    assert.equal(cat.denominator_kg, 0);
    assert.equal(cat.top_clients.length, 0);
    assert.equal(cat.magnitude_unknown_clients[0].missing_reason, "prior_month_row_absent");
  });

  it("cliente_key usa patrón M11 y no join por nombre", () => {
    const keys = deriveClienteKeysForRow(1, {
      cliente_norm: "Acme",
      canal: "Casa",
      subcanal: "",
      estado: "Dejaron de comprar",
    });
    assert.ok(keys.length >= 1);
    assert.ok(keys.every((k) => String(k).startsWith("1|")));
    assert.ok(keys.some((k) => k.includes("dejaron de comprar")));
    const mat = buildCommercialMateriality({
      year: 2026,
      month: 2,
      plantaId: 1,
      currentRows: [
        { cliente_norm: "Acme", canal: "Casa", subcanal: "", es_recuperable: true, kg_mes_real: 0 },
        { cliente_norm: "Otro", canal: "Casa", subcanal: "", es_recuperable: true, kg_mes_real: 0 },
      ],
      priorRows: [
        { cliente_norm: "Acme", canal: "Casa", subcanal: "", kg_mes_real: 200 },
        { cliente_norm: "Otro", canal: "Casa", subcanal: "", kg_mes_real: 50 },
      ],
    });
    const acme = mat.categories[0].top_clients.find((c) => c.cliente_display === "Acme");
    const covered = applyDicfCoverageToMateriality(
      mat,
      [
        {
          id: 9,
          public_code: "D-9",
          cliente_key: acme.cliente_keys[0],
          estado: "pendiente",
          fecha_compromiso: "2026-01-01",
          created_at: "2026-01-02",
          responsable: "Julio Pérez",
          resultado_cierre: null,
        },
        {
          id: 10,
          public_code: "D-10",
          cliente_key: "",
          cliente_nombre: "Otro",
          estado: "pendiente",
          fecha_compromiso: "2026-01-01",
          created_at: "2026-01-03",
          responsable: "Nombre Libre",
        },
      ],
      { plantaId: 1, todayYmd: "2026-08-23" }
    );
    const acmeCov = covered.categories[0].top_clients.find((c) => c.cliente_display === "Acme");
    const otro = covered.categories[0].top_clients.find((c) => c.cliente_display === "Otro");
    assert.equal(acmeCov.has_dicf_action, true);
    assert.equal(acmeCov.coverage_status, "material_with_overdue_action");
    assert.equal(acmeCov.latest_action.responsable, "Julio Pérez");
    assert.ok(acmeCov.review_reasons.includes("dicf_action_overdue"));
    assert.equal(otro.has_dicf_action, false);
    assert.equal(otro.coverage_status, "material_without_action");
    assert.equal(otro.latest_action, null);
    assert.equal(covered.coverage_name_join, false);
    assert.equal(covered.coverage_join, "cliente_key");
  });

  it("sin cliente_key no afirma ausencia de acción", () => {
    const mat = buildCommercialMateriality({
      year: 2026,
      month: 3,
      currentRows: [{ cliente_norm: "Zeta", canal: "Casa", subcanal: "", estado: "Disminuyeron", kg_mes_real: 10 }],
      priorRows: [],
    });
    assert.deepEqual(mat.categories.find((c) => c.category === "disminuyeron").top_clients[0].cliente_keys, []);
    const covered = applyDicfCoverageToMateriality(mat, [], { plantaId: 1, todayYmd: "2026-08-23" });
    const zeta = covered.categories.find((c) => c.category === "disminuyeron").top_clients[0];
    assert.equal(zeta.coverage_status, "coverage_unknown");
    assert.equal(zeta.has_dicf_action, null);
  });

  it("assemble expone materialidad y el prompt pide revisar primero sin causalidad", () => {
    const raw = buildCommercialMateriality({
      year: 2026,
      month: 2,
      plantaId: 1,
      currentRows: [{ cliente_norm: "Acme", canal: "Casa", subcanal: "", es_recuperable: true, kg_mes_real: 0 }],
      priorRows: [{ cliente_norm: "Acme", canal: "Casa", subcanal: "", kg_mes_real: 400 }],
    });
    const assembled = assembleOk({
      commercialStateRaw: {
        ...csAvailable(),
        payload: { ...csAvailable().payload, commercial_materiality: raw },
      },
    });
    assert.equal(assembled.commercial_materiality.unit, "kg");
    assert.equal(assembled.commercial_materiality.magnitude_field, "kg_mes_real");
    assert.equal(assembled.commercial_materiality.provenance, CS_SOURCE);
    assert.equal(assembled.sources.action_register.source, AR_SOURCE);
    assert.equal(assembled.sources.igf.source, IGF_SOURCE);
    const prompt = buildPlantDiagnosisPrompt(assembled, "¿Qué clientes requieren mi atención primero?");
    assert.match(prompt.userContent, /MATERIALIDAD COMERCIAL/);
    assert.match(prompt.userContent, /denominador_kg=400/);
    assert.match(prompt.userContent, /Acme/);
    assert.match(prompt.userContent, /señala primero los clientes/);
    assert.match(prompt.systemPrompt, /No restes forecast-real/);
    assert.match(prompt.systemPrompt, /declaración almacenada/);
    assert.doesNotMatch(prompt.userContent, /BLOQUE M9/);
    const result = buildPlantDiagnosisChatResult(assembled, { answer: "Revisar Acme. Sin causa.", planta_id: 1 });
    assert.equal(result.context_meta.openai_call_count, 1);
    assert.equal(result.plant_diagnosis.commercial_materiality.magnitude_field, "kg_mes_real");
  });
});

describe("límites de implementación", () => {
  it("SELECT-only: no computeDicf, no cache writes, no HTTP, no M9", () => {
    assert.doesNotMatch(PD_SRC, /computeDicf\s*\(/);
    assert.doesNotMatch(PD_SRC, /loadCommercialStateForChat\s*\(/);
    assert.doesNotMatch(PD_SRC, /director-ia-m9-deltas/);
    assert.doesNotMatch(PD_SRC, /loadDeltaVenta/);
    assert.doesNotMatch(PD_SRC, /\baxios\b/);
    assert.doesNotMatch(PD_SRC, /\bfetch\s*\(/);
    assert.doesNotMatch(PD_SRC, /\bINSERT\s+INTO\b/i);
    assert.doesNotMatch(PD_SRC, /\bUPDATE\s+\w+\s+SET\b/i);
    assert.doesNotMatch(PD_SRC, /\bDELETE\s+FROM\b/i);
    assert.match(PD_SRC, /FROM arr\.dicf_cliente_mes/);
    assert.match(PD_SRC, /kg_mes_real/);
    assert.doesNotMatch(PD_SRC, /kg_mes_forecast\s*-\s*kg_mes_real/);
    assert.doesNotMatch(PD_SRC, /accionesAbiertasByNombre/);
    const branch = CHAT_SRC.split("plant_diagnosis in-process")[1] || "";
    const untilDelta = branch.split("delta_sales in-process")[0] || "";
    assert.doesNotMatch(untilDelta, /computeDicf/);
    assert.doesNotMatch(untilDelta, /loadCommercialStateForChat/);
    assert.doesNotMatch(untilDelta, /loadDeltaVenta/);
    assert.match(CHAT_SRC, /intent === "plant_diagnosis"/);
    assert.match(CHAT_SRC, /intent === "financial_diagnosis"/);
  });

  it("no toca IES ni Reasoning Engine", () => {
    assert.doesNotMatch(PD_SRC, /director-ia-ies/);
    assert.doesNotMatch(PD_SRC, /director-ia-reasoning/);
    assert.doesNotMatch(PD_SRC, /evidence-builder/);
    assert.match(CHAT_SRC, /intent === "delta_sales"/);
    assert.match(CHAT_SRC, /expediente_comercial/);
    assert.match(CHAT_SRC, /revision_notes/);
    assert.match(CHAT_SRC, /budget_status/);
    assert.match(CHAT_SRC, /taller_at/);
    assert.equal(IES_STD.length > 100, true);
    assert.equal(RE_STD.length > 100, true);
  });
});
