"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  ANSWER_HIERARCHY,
  buildExecutiveStatusPack,
  buildExecutiveStatusPrompt,
  classifyForecastMagnitudeFollowUp,
  projectChannelMoversVerbal,
} = require("../lib/director-ia-conversational-executive-layer");
const {
  isCommercialTrendQuestion,
  isCommercialMoversQuestion,
  formatMoverTipoLabel,
  formatRegisteredComments,
  enrichMoversWithRegisteredComments,
  MOVER_TIPO_LABEL,
} = require("../lib/director-ia-commercial-trend");
const { selectTopMovers } = require("../lib/commercial-trend-engine");
const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");

const ROOT = path.join(__dirname, "..");
const CEL_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-conversational-executive-layer.js"), "utf8");
const TREND_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-commercial-trend.js"), "utf8");
const ENGINE_SRC = fs.readFileSync(path.join(ROOT, "lib", "commercial-trend-engine.js"), "utf8");
const CHAT_REQ_CANDIDATES = [
  path.join(ROOT, "frontend-dashboard", "lib", "chat-request.js"),
  path.join(ROOT, "frontend-dashboard", "lib", "director-ia-chat-request.ts"),
];

function plant() {
  return { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" };
}

function assembleOk() {
  return assemblePlantDiagnosisEvidence({
    plant: plant(),
    year: 2026,
    month: 8,
    actionRegisterRaw: {
      period: { kind: "snapshot", as_of: "2026-08-23" },
      payload: { summary: { open: 3, closed: 1, overdue: 17 }, top_overdue: [], responsables: [] },
    },
    dicfRaw: {
      period: { kind: "action_dates" },
      payload: { actions: [], limit: 8 },
    },
    bitacoraRaw: {
      period: { kind: "bitacora_window", months: 3, from: "2026-06" },
      payload: { sessions: [{ fecha: "2026-06-12", tipo: "visita_planta", titulo: "Visita" }] },
    },
    arrRaw: { venta_ton: 1212, load_error: null },
    igfRaw: {
      version_id: 12,
      composition: { ok: true, lines: [{ line_key: "venta_ton", line_label: "Venta", value: 1536.54, unit: "ton" }] },
    },
    commercialStateRaw: {
      period: { kind: "materialized_cache", yyyy_mm: "2026-07", year: 2026, month: 7 },
      payload: {
        materialized: true,
        counts: { dejaron: 1 },
        clients_shown: [{ category: "dejaron", cliente: "Acme", estado: "Dejaron de comprar" }],
        commercial_materiality: {
          enabled: true,
          current_period: "2026-07",
          prior_period: "2026-06",
          magnitude_field: "kg_mes_real",
          unit: "kg",
          categories: [
            {
              category: "dejaron",
              period: "2026-06",
              top_clients: [
                {
                  cliente_display: "Acme",
                  coverage_status: "material_without_action",
                  has_dicf_action: false,
                },
              ],
            },
          ],
        },
      },
    },
  });
}

function mover(over) {
  return {
    cliente: over.cliente,
    tipo: over.tipo,
    delta_ton: over.delta_ton,
    venta_ton_prev: over.prev,
    venta_ton_actual: over.actual,
    registered_comments: over.comments || [],
  };
}

function trendWithMovers() {
  return {
    ok: true,
    compare: true,
    channel: "both",
    range_days: 30,
    range_start: "2026-08-02",
    range_end: "2026-08-31",
    channels: {
      casa: {
        channel: "casa",
        range_start: "2026-08-02",
        range_end: "2026-08-31",
        ols: { direction: "DOWN" },
        limitations: [],
        top_movers: [
          mover({
            cliente: "TORTILLERIA ERICK",
            tipo: "disminucion",
            delta_ton: -4.41,
            prev: 4.71,
            actual: 0.31,
            comments: [{ body: "POR FALTA DE PIPAS", created_at: "2026-08-10" }],
          }),
          mover({
            cliente: "GRUPO MOVE EMPRESARIAL",
            tipo: "perdido",
            delta_ton: -161.08,
            prev: 161.08,
            actual: 0,
            comments: [{ body: "COMPRA DIARIAMENTE", created_at: "2026-07-01" }],
          }),
        ],
      },
      comisionista: {
        channel: "comisionista",
        range_start: "2026-08-02",
        range_end: "2026-08-31",
        ols: { direction: "UP" },
        limitations: [],
        top_movers: [
          mover({
            cliente: "NUEVA WAL MART DE MEXICO",
            tipo: "aumento",
            delta_ton: 10.15,
            prev: 47.68,
            actual: 57.83,
          }),
          mover({
            cliente: "HOTELES ROMANO",
            tipo: "nuevo",
            delta_ton: 9.14,
            prev: 0,
            actual: 9.14,
          }),
        ],
      },
    },
  };
}

function packWithMovers() {
  return buildExecutiveStatusPack({
    assembled: assembleOk(),
    trend: trendWithMovers(),
    scope: { planta_id: 1, plant_name: "Acapulco", scope_source: "ui_plant_anchor" },
  });
}

describe("commercial movers — routing", () => {
  const commercialQs = [
    "¿Qué clientes tienen tendencia negativa en ventas?",
    "¿Qué clientes tienen una tendencia negativa en ventas y qué comentarios tienen?",
    "¿Qué clientes disminuyeron?",
    "¿Quién dejó de comprar?",
    "¿Quién aumentó?",
    "¿Qué clientes son nuevos?",
    "¿Cuáles son los que más bajaron?",
    "¿Qué comentarios tienen los clientes que disminuyeron?",
    "¿Qué comentarios tienen los clientes que dejaron de comprar?",
    "¿Qué comentarios tienen?",
  ];

  it("preguntas inequívocas de movers → commercial_trend, no plant_diagnosis/bitácora/DICF/AR", () => {
    for (const q of commercialQs) {
      assert.equal(isCommercialMoversQuestion(q), true, q);
      assert.equal(isCommercialTrendQuestion(q), true, q);
      const plan = planDirectorIaQuestion(q);
      assert.equal(plan.intent, "commercial_trend", q);
      assert.notEqual(plan.intent, "plant_diagnosis", q);
      assert.notEqual(plan.intent, "commercial_state", q);
      assert.notEqual(plan.intent, "bitacora_lookup", q);
      assert.notEqual(plan.intent, "overdue_actions", q);
    }
  });

  it("cómo vamos y CASA/rango existentes no se degradan", () => {
    assert.equal(isCommercialMoversQuestion("¿Cómo vamos?"), false);
    assert.equal(isCommercialTrendQuestion("¿Cómo vamos en CASA?"), true);
    assert.equal(planDirectorIaQuestion("¿Cómo vamos en CASA?").intent, "commercial_trend");
    assert.equal(planDirectorIaQuestion("¿Por qué dejó de comprar Arturo?").intent, "plant_diagnosis");
  });

  it("comentario de cliente nombrado no secuestra a movers", () => {
    assert.equal(isCommercialMoversQuestion("¿Qué comentarios tiene Tortillería Erick?"), false);
  });
});

describe("commercial movers — Estado Ejecutivo aditivo", () => {
  it("jerarquía inserta COMMERCIAL_MOVERS entre TREND y RISKS sin quitar DRIVERS", () => {
    const trendIdx = ANSWER_HIERARCHY.indexOf("TREND");
    const moversIdx = ANSWER_HIERARCHY.indexOf("COMMERCIAL_MOVERS");
    const driversIdx = ANSWER_HIERARCHY.indexOf("DRIVERS");
    const risksIdx = ANSWER_HIERARCHY.indexOf("RISKS");
    assert.ok(trendIdx >= 0 && moversIdx === trendIdx + 1);
    assert.ok(moversIdx < driversIdx && driversIdx < risksIdx);
    assert.ok(ANSWER_HIERARCHY.includes("TARGET_COMMITMENT"));
    assert.ok(ANSWER_HIERARCHY.includes("EXECUTION"));
    assert.ok(ANSWER_HIERARCHY.includes("NEXT_DECISION"));
  });

  it("el bloque aparece después de Tendencias y antes de Riesgos; DRIVERS permanece", () => {
    const pack = packWithMovers();
    const slots = pack.items.map((i) => i.slot);
    const trendIdx = slots.indexOf("TREND");
    const moversIdx = slots.indexOf("COMMERCIAL_MOVERS");
    const driversIdx = slots.indexOf("DRIVERS");
    const risksIdx = slots.indexOf("RISKS");
    assert.ok(trendIdx >= 0 && moversIdx === trendIdx + 1);
    assert.ok(moversIdx < risksIdx);
    assert.equal(pack.items[driversIdx].source, "arr.dicf_cliente_mes");
    assert.equal(pack.items[risksIdx].source, "arr.action_register_revisions");
    assert.match(pack.items[risksIdx].summary, /17 acciones vencidas/);
    assert.ok(pack.items.find((i) => i.slot === "EXECUTION"));
    assert.ok(pack.items.find((i) => i.slot === "NEXT_DECISION"));
  });

  it("conserva magnitudes Forecast y semántica TREND; no recalcula delta", () => {
    const pack = packWithMovers();
    const magnitudes = pack.items.filter((i) => i.slot === "MAGNITUDE");
    assert.ok(magnitudes.length >= 4);
    const trend = pack.items.find((i) => i.slot === "TREND");
    assert.equal(trend.source, "commercial-trend-engine");
    assert.equal(trend.payload.casa.direction, "DOWN");
    assert.equal(trend.payload.comisionista.direction, "UP");
    const movers = pack.items.find((i) => i.slot === "COMMERCIAL_MOVERS");
    assert.equal(movers.source, "commercial-trend-engine");
    assert.equal(movers.truth_semantics, "TOP_MOVERS_ABS_DELTA");
    assert.doesNotMatch(CEL_SRC, /function selectTopMovers/);
    assert.match(ENGINE_SRC, /function selectTopMovers/);
    assert.equal(TREND_SRC.includes("selectTopMovers("), false);
  });

  it("verbaliza Disminuyó / Dejó de comprar / Aumentó / Nuevo y no mezcla canales", () => {
    assert.equal(formatMoverTipoLabel("disminucion"), "Disminuyó");
    assert.equal(formatMoverTipoLabel("perdido"), "Dejó de comprar");
    assert.equal(formatMoverTipoLabel("aumento"), "Aumentó");
    assert.equal(formatMoverTipoLabel("nuevo"), "Nuevo");
    assert.deepEqual(Object.keys(MOVER_TIPO_LABEL).sort(), ["aumento", "disminucion", "nuevo", "perdido"]);
    const pack = packWithMovers();
    const movers = pack.items.find((i) => i.slot === "COMMERCIAL_MOVERS");
    assert.equal(
      movers.payload.casa.every((m) => m.channel === "CASA"),
      true
    );
    assert.equal(
      movers.payload.comisionista.every((m) => m.channel === "COMISIONISTA"),
      true
    );
    assert.match(movers.summary, /TORTILLERIA ERICK: disminuyó/);
    assert.match(movers.summary, /GRUPO MOVE EMPRESARIAL: dejó de comprar/);
    assert.match(movers.summary, /NUEVA WAL MART DE MEXICO: aumentó/);
    assert.match(movers.summary, /HOTELES ROMANO: nuevo/);
    assert.equal(
      movers.payload.casa.some((m) => m.cliente === "NUEVA WAL MART DE MEXICO"),
      false
    );
    assert.equal(
      movers.payload.comisionista.some((m) => m.cliente === "TORTILLERIA ERICK"),
      false
    );
  });

  it("comentario existente es registrado; ausencia no inventa; contradicción no cambia el delta", () => {
    const pack = packWithMovers();
    const prompt = buildExecutiveStatusPrompt(pack, "¿Cómo vamos?");
    assert.match(prompt.userContent, /Comentario registrado \[2026-08-10\]: «POR FALTA DE PIPAS»/);
    assert.match(prompt.userContent, /Sin comentario reciente/);
    assert.match(prompt.userContent, /Comentario registrado \[2026-07-01\]: «COMPRA DIARIAMENTE»/);
    assert.match(prompt.userContent, /GRUPO MOVE EMPRESARIAL: dejó de comprar -161\.08 t/);
    assert.match(prompt.userContent, /El comentario no es la causa|Comentario registrado ≠ causa|no es causa/i);
    assert.match(prompt.userContent, /Si una línea de esa proyección incluye «Comentario registrado», cópiala completa/);
    assert.match(prompt.userContent, /No la omitas/);
    assert.match(prompt.userContent, /Prohibido: «disminuyó porque/);
    assert.doesNotMatch(prompt.userContent, /dejó de comprar porque COMPRA DIARIAMENTE|disminuyó porque POR FALTA DE PIPAS/i);
    assert.equal(formatRegisteredComments([]), "Sin comentario reciente.");
    assert.equal(formatRegisteredComments([{ body: "X" }]), "Comentario registrado: X");
    assert.equal(
      formatRegisteredComments([{ body: "X", created_at: "2026-08-15T12:00:00.000Z" }]),
      "Comentario registrado [2026-08-15]: X"
    );
    assert.equal(formatRegisteredComments([{ body: "X", created_at: null }]), "Comentario registrado: X");
    assert.equal(formatRegisteredComments([{ body: "X", created_at: "" }]), "Comentario registrado: X");
    assert.equal(formatRegisteredComments([{ body: "X", created_at: "ayer" }]), "Comentario registrado: X");
  });

  it("prompt de cómo vamos pide el bloque entre Tendencias y Riesgos", () => {
    const pack = packWithMovers();
    const prompt = buildExecutiveStatusPrompt(pack, "¿Cómo vamos?");
    assert.match(prompt.userContent, /Movimientos comerciales relevantes/);
    assert.match(prompt.userContent, /DESPUÉS de Tendencias y ANTES de Riesgos/);
    assert.match(prompt.userContent, /COMMERCIAL_MOVERS → TARGET\/COMMITMENT → DRIVERS → RISKS/);
    const included = pack.included_slots;
    const t = included.indexOf("TREND");
    const m = included.indexOf("COMMERCIAL_MOVERS");
    const r = included.indexOf("RISKS");
    assert.ok(t >= 0 && m > t && r > m);
  });
});

describe("commercial movers — motor y no-duplicación", () => {
  it("top movers siguen siendo selectTopMovers del engine", () => {
    const top = selectTopMovers(
      [
        { cliente: "ACME", venta_ton: 20 },
        { cliente: "BETA", venta_ton: 5 },
        { cliente: "NUEVO", venta_ton: 3 },
      ],
      [
        { cliente: "ACME", venta_ton: 10 },
        { cliente: "BETA", venta_ton: 12 },
        { cliente: "VIEJO", venta_ton: 4 },
      ]
    );
    assert.equal(top.find((x) => x.cliente === "BETA").tipo, "disminucion");
    assert.equal(top.find((x) => x.cliente === "VIEJO").tipo, "perdido");
    assert.equal(top.find((x) => x.cliente === "ACME").tipo, "aumento");
    assert.equal(top.find((x) => x.cliente === "NUEVO").tipo, "nuevo");
  });

  it("enriquecimiento de comentarios no inventa y no pisa el delta", async () => {
    const movers = [
      { cliente: "MOVE", tipo: "perdido", delta_ton: -161.08, venta_ton_prev: 161.08, venta_ton_actual: 0 },
    ];
    const byNombre = new Map();
    byNombre.set("move", [{ body: "COMPRA DIARIAMENTE" }]);
    const out = await enrichMoversWithRegisteredComments({ query: async () => ({ rows: [] }) }, 1, movers, {
      loadRecentComments: async () => byNombre,
    });
    assert.equal(out[0].delta_ton, -161.08);
    assert.equal(out[0].tipo, "perdido");
    assert.equal(out[0].registered_comments[0].body, "COMPRA DIARIAMENTE");
    const empty = await enrichMoversWithRegisteredComments(null, 1, movers, { skipComments: true });
    assert.deepEqual(empty[0].registered_comments, []);
  });

  it("no transporta 1M/3M ni canal de gráfica en el chat request", () => {
    for (const p of CHAT_REQ_CANDIDATES) {
      if (!fs.existsSync(p)) continue;
      const src = fs.readFileSync(p, "utf8");
      assert.doesNotMatch(src, /active_range_days/);
      assert.doesNotMatch(src, /range:\s*["']1m["']/);
    }
    const panel = path.join(ROOT, "frontend-dashboard", "components", "DirectorIaChatPanel.tsx");
    if (fs.existsSync(panel)) {
      const src = fs.readFileSync(panel, "utf8");
      assert.doesNotMatch(src, /range=\{range\}/);
      assert.doesNotMatch(src, /canal=\{canal\}/);
    }
  });
});

describe("commercial movers — follow-up Forecast intacto", () => {
  it("follow-up de descuento forecast no se reinterpreta como movers", () => {
    assert.equal(isCommercialMoversQuestion("¿Y el descuento?"), false);
    const fu = classifyForecastMagnitudeFollowUp("¿Y el descuento?", {
      has_authoritative_run: true,
      executive_hilo: true,
    });
    assert.equal(fu && fu.kind, "descuento");
  });
});

describe("HUMAN REVIEW — preservación de Magnitudes + compactación verbal", () => {
  const FIX = {
    actual: 1188,
    forecastVenta: 1777.25,
    forecastDesc: -0.19,
    storedVenta: 1888.75,
    storedDesc: 0.31,
    utilidad: 2777000,
    resultado: 644400,
  };

  function sixEngineMovers() {
    return [
      mover({ cliente: "NEG-A", tipo: "perdido", delta_ton: -40, prev: 40, actual: 0 }),
      mover({ cliente: "NEG-B", tipo: "disminucion", delta_ton: -30, prev: 50, actual: 20 }),
      mover({ cliente: "NEG-C", tipo: "disminucion", delta_ton: -20, prev: 25, actual: 5 }),
      mover({ cliente: "POS-A", tipo: "aumento", delta_ton: 18, prev: 10, actual: 28 }),
      mover({ cliente: "POS-B", tipo: "nuevo", delta_ton: 12, prev: 0, actual: 12 }),
      mover({ cliente: "POS-C", tipo: "aumento", delta_ton: 8, prev: 4, actual: 12 }),
    ];
  }

  function assembledPreservation() {
    return assemblePlantDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 8,
      actionRegisterRaw: {
        period: { kind: "snapshot", as_of: "2026-08-31" },
        payload: { summary: { open: 2, closed: 1, overdue: 9 }, top_overdue: [], responsables: [] },
      },
      dicfRaw: { period: { kind: "action_dates" }, payload: { actions: [], limit: 8 } },
      bitacoraRaw: {
        period: { kind: "bitacora_window", months: 3, from: "2026-06" },
        payload: { sessions: [{ fecha: "2026-07-01", tipo: "visita_planta", titulo: "Visita" }] },
      },
      arrRaw: { venta_ton: 9999, load_error: null },
      igfRaw: {
        version_id: 44,
        version_number: 3,
        row: { empresa: "E4", venta_ton: FIX.storedVenta },
        composition: {
          ok: true,
          lines: [
            { line_key: "venta_ton", line_label: "Venta", value: FIX.storedVenta, unit: "ton" },
            { line_key: "com_desc_kg", line_label: "Com. y Desc.", value: FIX.storedDesc, unit: "$/kg" },
          ],
        },
      },
      commercialStateRaw: {
        period: { kind: "materialized_cache", yyyy_mm: "2026-08", year: 2026, month: 8 },
        payload: {
          materialized: true,
          commercial_materiality: {
            enabled: true,
            current_period: "2026-08",
            categories: [
              {
                category: "dejaron",
                period: "2026-07",
                top_clients: [{ cliente_display: "Acme", coverage_status: "material_without_action", has_dicf_action: false }],
              },
            ],
          },
        },
      },
    });
  }

  function preservationPack() {
    const casa = sixEngineMovers().map((m) => ({ ...m, channel: "CASA", cliente: `CASA-${m.cliente}` }));
    const comi = sixEngineMovers().map((m) => ({ ...m, channel: "COMISIONISTA", cliente: `COMI-${m.cliente}` }));
    return buildExecutiveStatusPack({
      assembled: assembledPreservation(),
      trend: {
        ok: true,
        compare: true,
        channel: "both",
        range_days: 30,
        range_start: "2026-08-02",
        range_end: "2026-08-31",
        channels: {
          casa: {
            channel: "casa",
            range_start: "2026-08-02",
            range_end: "2026-08-31",
            ols: { direction: "DOWN" },
            limitations: [],
            top_movers: casa,
          },
          comisionista: {
            channel: "comisionista",
            range_start: "2026-08-02",
            range_end: "2026-08-31",
            ols: { direction: "UP" },
            limitations: [],
            top_movers: comi,
          },
        },
      },
      scope: { planta_id: 1, plant_name: "Zihuatanejo", scope_source: "ui_plant_anchor" },
      forecastParity: {
        ok: true,
        reachable: true,
        period: { year: 2026, month: 8, yyyy_mm: "2026-08", cutoff_date: "2026-08-31" },
        actual_to_date: { venta_ton: FIX.actual, cutoff_date: "2026-08-31", truth_semantics: "ACTUAL_TO_DATE" },
        mini: {
          venta_ton: FIX.forecastVenta,
          desc_kg: FIX.forecastDesc,
          util_oper_importe: FIX.utilidad,
          resultado_final_importe: FIX.resultado,
          cutoff_date: "2026-08-31",
          source: "computeIgfForecastMiniPayload",
        },
      },
    });
  }

  function itemByMetric(pack, metric) {
    return (pack.items || []).find((i) => i.payload && i.payload.metric === metric);
  }

  it("pack+prompt conservan simultáneamente las 7 magnitudes, tendencias, movers, riesgos, ejecución y próxima decisión", () => {
    const pack = preservationPack();
    const prompt = buildExecutiveStatusPrompt(pack, "¿Cómo vamos?");
    const actual = itemByMetric(pack, "venta_ton");
    const forecast = itemByMetric(pack, "forecast_venta_desc");
    const forecastDesc = itemByMetric(pack, "forecast_desc_kg");
    const storedVenta = (pack.items || []).find(
      (i) => i.truth_semantics === "FORECAST_STORED" && i.payload && i.payload.metric === "venta_ton"
    );
    const storedDesc = itemByMetric(pack, "com_desc_kg");
    const util = itemByMetric(pack, "util_oper_importe");
    const resultado = itemByMetric(pack, "resultado_final_importe");
    const trend = pack.items.find((i) => i.slot === "TREND");
    const movers = pack.items.find((i) => i.slot === "COMMERCIAL_MOVERS");
    const risks = pack.items.find((i) => i.slot === "RISKS");
    const exec = pack.items.find((i) => i.slot === "EXECUTION");
    const next = pack.items.find((i) => i.slot === "NEXT_DECISION");

    assert.equal(actual.truth_semantics, "ACTUAL_TO_DATE");
    assert.equal(actual.payload.venta_ton, FIX.actual);
    assert.equal(forecast.truth_semantics, "FORECAST_PROJECTION");
    assert.equal(forecast.payload.venta_ton, FIX.forecastVenta);
    assert.equal(forecastDesc.payload.desc_kg, FIX.forecastDesc);
    assert.equal(storedVenta.payload.venta_ton, FIX.storedVenta);
    assert.equal(storedDesc.payload.com_desc_kg, FIX.storedDesc);
    assert.equal(storedDesc.truth_semantics, "FORECAST_STORED");
    assert.equal(util.payload.util_oper_importe, FIX.utilidad);
    assert.equal(resultado.payload.resultado_final_importe, FIX.resultado);
    assert.equal(trend.payload.casa.direction, "DOWN");
    assert.equal(trend.payload.comisionista.direction, "UP");
    assert.ok(movers && risks && exec && next);

    assert.match(prompt.userContent, /IGF almacenado/);
    assert.match(prompt.userContent, /IGF descuento almacenado/);
    assert.match(prompt.userContent, /Descuento \(Forecast\)/);
    assert.match(prompt.userContent, /incluye «IGF almacenado/);
    assert.match(prompt.userContent, /No las omitas para dejar espacio a COMMERCIAL_MOVERS/);
    assert.match(prompt.userContent, /FORECAST_STORED, cuando AVAILABLE, COEXISTE/);
    assert.match(prompt.userContent, /Movimientos comerciales relevantes/);
    assert.doesNotMatch(prompt.userContent, /1261|1491\.5|1536\.5405/);
  });

  it("orden estructural Magnitudes < Tendencias < Movers < Riesgos y ninguna sección previa desaparece", () => {
    const pack = preservationPack();
    const slots = pack.items.map((i) => i.slot);
    const firstMag = slots.indexOf("MAGNITUDE");
    const trend = slots.indexOf("TREND");
    const movers = slots.indexOf("COMMERCIAL_MOVERS");
    const risks = slots.indexOf("RISKS");
    assert.ok(firstMag >= 0 && firstMag < trend && trend < movers && movers < risks);
    for (const slot of ["SITUATION", "MAGNITUDE", "TREND", "COMMERCIAL_MOVERS", "DRIVERS", "RISKS", "EXECUTION", "NEXT_DECISION"]) {
      assert.ok(slots.includes(slot), slot);
    }
    const hier = ANSWER_HIERARCHY;
    assert.ok(hier.indexOf("MAGNITUDE") < hier.indexOf("TREND"));
    assert.ok(hier.indexOf("TREND") < hier.indexOf("COMMERCIAL_MOVERS"));
    assert.ok(hier.indexOf("COMMERCIAL_MOVERS") < hier.indexOf("RISKS"));
  });

  it("Forecast descuento y stored descuento coexisten con valores y signos distintos", () => {
    const pack = preservationPack();
    const forecastDesc = itemByMetric(pack, "forecast_desc_kg");
    const storedDesc = itemByMetric(pack, "com_desc_kg");
    assert.equal(forecastDesc.truth_semantics, "FORECAST_PROJECTION");
    assert.equal(storedDesc.truth_semantics, "FORECAST_STORED");
    assert.notEqual(forecastDesc.payload.desc_kg, storedDesc.payload.desc_kg);
    assert.ok(forecastDesc.payload.desc_kg < 0);
    assert.ok(storedDesc.payload.desc_kg > 0);
    const storedVenta = (pack.items || []).find(
      (i) => i.truth_semantics === "FORECAST_STORED" && i.payload && i.payload.metric === "venta_ton"
    );
    const forecast = itemByMetric(pack, "forecast_venta_desc");
    assert.doesNotMatch(storedVenta.summary, /Forecast al corte/);
    assert.doesNotMatch(forecast.summary, /IGF almacenado/);
  });

  it("proyección verbal compacta no cambia el Top 6 del motor ni mezcla canales", () => {
    const pack = preservationPack();
    const movers = pack.items.find((i) => i.slot === "COMMERCIAL_MOVERS");
    assert.equal(movers.payload.casa.length, 6);
    assert.equal(movers.payload.comisionista.length, 6);
    assert.equal(movers.payload.verbal_projection.casa.length, 4);
    assert.equal(movers.payload.verbal_projection.comisionista.length, 4);
    assert.equal(movers.payload.verbal_projection.engine_top_n_unchanged, true);
    const verbalCasa = projectChannelMoversVerbal(movers.payload.casa);
    assert.deepEqual(
      verbalCasa.map((m) => m.cliente),
      ["CASA-NEG-A", "CASA-NEG-B", "CASA-POS-A", "CASA-POS-B"]
    );
    assert.equal(movers.payload.casa.some((m) => m.cliente === "CASA-NEG-C"), true);
    assert.match(movers.summary, /CASA-NEG-A/);
    assert.doesNotMatch(movers.summary, /CASA-NEG-C/);
    assert.equal(
      movers.payload.casa.every((m) => m.channel === "CASA"),
      true
    );
    assert.equal(
      movers.payload.comisionista.every((m) => m.channel === "COMISIONISTA"),
      true
    );
    const prompt = buildExecutiveStatusPrompt(pack, "¿Cómo vamos?");
    assert.match(prompt.userContent, /CASA-NEG-A: dejó de comprar/);
    assert.doesNotMatch(prompt.userContent, /CASA-NEG-C/);
    assert.doesNotMatch(prompt.userContent, /\(falta de pipas\)|\(compra diaria\)/i);
  });

  it("comentario contradictorio no altera el delta del motor", () => {
    const pack = packWithMovers();
    const move = pack.items
      .find((i) => i.slot === "COMMERCIAL_MOVERS")
      .payload.casa.find((m) => m.cliente === "GRUPO MOVE EMPRESARIAL");
    assert.equal(move.tipo, "perdido");
    assert.equal(move.delta_ton, -161.08);
    assert.equal(move.registered_comments[0].body, "COMPRA DIARIAMENTE");
    const prompt = buildExecutiveStatusPrompt(pack, "¿Cómo vamos?");
    assert.match(prompt.userContent, /dejó de comprar -161\.08 t/);
    assert.match(prompt.userContent, /Comentario registrado \[2026-07-01\]: «COMPRA DIARIAMENTE»/);
    assert.match(prompt.userContent, /El comentario no es la causa/);
    assert.doesNotMatch(prompt.userContent, /porque COMPRA DIARIAMENTE/i);
  });
});

describe("commercial movers — comentarios obligatorios y no-causa", () => {
  it("dos comentarios se verbalizan en el orden del payload; created_at inválido no inventa fecha", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembleOk(),
      trend: {
        ...trendWithMovers(),
        channels: {
          casa: {
            ...trendWithMovers().channels.casa,
            top_movers: [
              mover({
                cliente: "TORTILLERIA ERICK",
                tipo: "disminucion",
                delta_ton: -4.41,
                prev: 4.71,
                actual: 0.31,
                comments: [
                  { body: "POR FALTA DE PIPAS", created_at: "2026-08-10" },
                  { body: "segunda nota", created_at: "2026-08-01T09:00:00Z" },
                ],
              }),
            ],
          },
          comisionista: trendWithMovers().channels.comisionista,
        },
      },
      scope: { planta_id: 1, plant_name: "Acapulco", scope_source: "ui_plant_anchor" },
    });
    const prompt = buildExecutiveStatusPrompt(pack, "¿Cómo vamos?");
    const erick = prompt.userContent.match(/TORTILLERIA ERICK:[^\n]+/);
    assert.ok(erick);
    assert.match(erick[0], /Comentario registrado \[2026-08-10\]: «POR FALTA DE PIPAS»/);
    assert.match(erick[0], /Comentario registrado \[2026-08-01\]: «segunda nota»/);
    assert.ok(erick[0].indexOf("POR FALTA DE PIPAS") < erick[0].indexOf("segunda nota"));
    assert.doesNotMatch(erick[0], /porque POR FALTA DE PIPAS/i);
    assert.equal(
      formatRegisteredComments([
        { body: "A", created_at: "2026-08-10" },
        { body: "B", created_at: null },
      ]),
      "Comentario registrado [2026-08-10]: A Comentario registrado: B"
    );
  });

  it("comentario en Top 6 fuera de 2+2 no entra al prompt; no cambia ranking", () => {
    const casa = [
      mover({ cliente: "NEG-A", tipo: "perdido", delta_ton: -40, prev: 40, actual: 0 }),
      mover({ cliente: "NEG-B", tipo: "disminucion", delta_ton: -30, prev: 50, actual: 20 }),
      mover({
        cliente: "NEG-C",
        tipo: "disminucion",
        delta_ton: -20,
        prev: 25,
        actual: 5,
        comments: [{ body: "COMENTARIO OCULTO 2+2", created_at: "2026-08-20" }],
      }),
      mover({ cliente: "POS-A", tipo: "aumento", delta_ton: 18, prev: 10, actual: 28 }),
      mover({ cliente: "POS-B", tipo: "nuevo", delta_ton: 12, prev: 0, actual: 12 }),
      mover({ cliente: "POS-C", tipo: "aumento", delta_ton: 8, prev: 4, actual: 12 }),
    ];
    const pack = buildExecutiveStatusPack({
      assembled: assembleOk(),
      trend: {
        ok: true,
        compare: true,
        channel: "both",
        range_days: 30,
        range_start: "2026-08-02",
        range_end: "2026-08-31",
        channels: {
          casa: {
            channel: "casa",
            range_start: "2026-08-02",
            range_end: "2026-08-31",
            ols: { direction: "DOWN" },
            limitations: [],
            top_movers: casa,
          },
          comisionista: { channel: "comisionista", ols: { direction: "UP" }, limitations: [], top_movers: [] },
        },
      },
      scope: { planta_id: 1, plant_name: "Acapulco", scope_source: "ui_plant_anchor" },
    });
    const movers = pack.items.find((i) => i.slot === "COMMERCIAL_MOVERS");
    assert.equal(movers.payload.casa.length, 6);
    assert.deepEqual(
      projectChannelMoversVerbal(movers.payload.casa).map((m) => m.cliente),
      ["NEG-A", "NEG-B", "POS-A", "POS-B"]
    );
    const prompt = buildExecutiveStatusPrompt(pack, "¿Cómo vamos?");
    assert.match(prompt.userContent, /NEG-A:/);
    assert.doesNotMatch(prompt.userContent, /NEG-C/);
    assert.doesNotMatch(prompt.userContent, /COMENTARIO OCULTO 2\+2/);
    assert.equal(movers.payload.casa.find((m) => m.cliente === "NEG-C").delta_ton, -20);
  });

  it("aislamiento de planta: comentarios de un pack no aparecen en el otro", () => {
    const acapulco = packWithMovers();
    const pueblaTrend = trendWithMovers();
    pueblaTrend.channels.casa.top_movers = [
      mover({
        cliente: "TORTILLERIA ERICK",
        tipo: "disminucion",
        delta_ton: -4.41,
        prev: 4.71,
        actual: 0.31,
        comments: [{ body: "COMENTARIO PUEBLA", created_at: "2026-08-12" }],
      }),
    ];
    const puebla = buildExecutiveStatusPack({
      assembled: assemblePlantDiagnosisEvidence({
        plant: { planta_id: 2, planta_nombre: "Puebla", plant_code: "E4" },
        year: 2026,
        month: 8,
        actionRegisterRaw: {
          period: { kind: "snapshot", as_of: "2026-08-23" },
          payload: { summary: { open: 1, closed: 0, overdue: 2 }, top_overdue: [], responsables: [] },
        },
        dicfRaw: { period: { kind: "action_dates" }, payload: { actions: [], limit: 8 } },
        bitacoraRaw: {
          period: { kind: "bitacora_window", months: 3, from: "2026-06" },
          payload: { sessions: [] },
        },
        arrRaw: { venta_ton: 100, load_error: null },
        igfRaw: { version_id: 1, composition: { ok: true, lines: [] } },
        commercialStateRaw: {
          period: { kind: "materialized_cache", yyyy_mm: "2026-07", year: 2026, month: 7 },
          payload: { materialized: true, commercial_materiality: { enabled: false } },
        },
      }),
      trend: pueblaTrend,
      scope: { planta_id: 2, plant_name: "Puebla", scope_source: "ui_plant_anchor" },
    });
    const acapulcoPrompt = buildExecutiveStatusPrompt(acapulco, "¿Cómo vamos?");
    const pueblaPrompt = buildExecutiveStatusPrompt(puebla, "¿Cómo vamos?");
    assert.match(acapulcoPrompt.userContent, /POR FALTA DE PIPAS/);
    assert.doesNotMatch(acapulcoPrompt.userContent, /COMENTARIO PUEBLA/);
    assert.match(pueblaPrompt.userContent, /COMENTARIO PUEBLA/);
    assert.doesNotMatch(pueblaPrompt.userContent, /POR FALTA DE PIPAS/);
    assert.match(acapulcoPrompt.userContent, /planta=Acapulco id=1/);
    assert.match(pueblaPrompt.userContent, /planta=Puebla id=2/);
  });

  it("negativo/negativa/negativos/negativas + preguntas directas → commercial_trend; por qué no se implementa aquí", () => {
    const morph = [
      "¿Qué clientes tienen tendencia negativa en ventas?",
      "¿Qué clientes tienen tendencia negativo en ventas?",
      "¿Qué clientes tienen tendencia negativos en ventas?",
      "¿Qué clientes tienen tendencia negativas en ventas?",
    ];
    for (const q of morph) {
      assert.equal(isCommercialMoversQuestion(q), true, q);
      assert.equal(isCommercialTrendQuestion(q), true, q);
      assert.equal(planDirectorIaQuestion(q).intent, "commercial_trend", q);
    }
    assert.equal(
      planDirectorIaQuestion("¿Qué clientes tienen tendencia negativa en ventas y qué comentarios tienen?").intent,
      "commercial_trend"
    );
    assert.equal(planDirectorIaQuestion("¿Qué comentarios tienen los clientes que disminuyeron?").intent, "commercial_trend");
    assert.equal(
      planDirectorIaQuestion("¿Qué comentarios tienen los clientes que dejaron de comprar?").intent,
      "commercial_trend"
    );
    assert.equal(isCommercialMoversQuestion("¿Por qué cayó Grupo Move?"), false);
    assert.notEqual(planDirectorIaQuestion("¿Por qué cayó Grupo Move?").intent, "commercial_trend");
  });

  it("enriquecer comentarios no reordena ni cambia delta; join no empeora homónimo (mismo nombre → mismo bucket)", async () => {
    const movers = [
      { cliente: "ACME", tipo: "disminucion", delta_ton: -9, venta_ton_prev: 10, venta_ton_actual: 1 },
      { cliente: "BETA", tipo: "aumento", delta_ton: 4, venta_ton_prev: 1, venta_ton_actual: 5 },
    ];
    const byNombre = new Map();
    byNombre.set("acme", [{ body: "nota acme", created_at: "2026-08-11" }]);
    const out = await enrichMoversWithRegisteredComments({ query: async () => ({ rows: [] }) }, 1, movers, {
      loadRecentComments: async () => byNombre,
    });
    assert.deepEqual(
      out.map((m) => m.cliente),
      ["ACME", "BETA"]
    );
    assert.equal(out[0].delta_ton, -9);
    assert.equal(out[1].delta_ton, 4);
    assert.equal(out[0].registered_comments[0].body, "nota acme");
    assert.deepEqual(out[1].registered_comments, []);
  });
});
