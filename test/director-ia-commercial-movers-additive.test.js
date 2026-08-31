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
            comments: [{ body: "POR FALTA DE PIPAS" }],
          }),
          mover({
            cliente: "GRUPO MOVE EMPRESARIAL",
            tipo: "perdido",
            delta_ton: -161.08,
            prev: 161.08,
            actual: 0,
            comments: [{ body: "COMPRA DIARIAMENTE" }],
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
    "¿Qué clientes tienen una tendencia negativa en ventas y qué comentarios tienen?",
    "¿Qué clientes disminuyeron?",
    "¿Quién dejó de comprar?",
    "¿Quién aumentó?",
    "¿Qué clientes son nuevos?",
    "¿Cuáles son los que más bajaron?",
    "¿Qué comentarios tienen los clientes que disminuyeron?",
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
    assert.match(movers.summary, /TORTILLERIA ERICK: Disminuyó/);
    assert.match(movers.summary, /GRUPO MOVE EMPRESARIAL: Dejó de comprar/);
    assert.match(movers.summary, /NUEVA WAL MART DE MEXICO: Aumentó/);
    assert.match(movers.summary, /HOTELES ROMANO: Nuevo/);
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
    assert.match(prompt.userContent, /Comentario registrado: POR FALTA DE PIPAS/);
    assert.match(prompt.userContent, /Sin comentario reciente/);
    assert.match(prompt.userContent, /Comentario registrado: COMPRA DIARIAMENTE/);
    assert.match(prompt.userContent, /GRUPO MOVE EMPRESARIAL: Dejó de comprar, Δ -161\.08 t/);
    assert.match(prompt.userContent, /Comentario registrado ≠ causa|no es causa/i);
    assert.equal(formatRegisteredComments([]), "Sin comentario reciente.");
    assert.equal(formatRegisteredComments([{ body: "X" }]), "Comentario registrado: X");
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
