"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  NEED_TYPES,
  AVAILABILITY,
  CHANNEL_REGISTRY,
  CAPABILITY_INTEGRATION_LEDGER,
  PERIOD_STRATEGY,
  CEL_SHIP_DEPENDENCY,
  ISOLATED_CEL_SHIP,
  CEL_OVERRIDABLE_PLANNER_INTENTS,
  normalizeExecutiveText,
  resolveExecutiveNeed,
  resolveSemanticScope,
  extractExplicitPlant,
  isExecutiveStatusQuestion,
  isSpecializedStandaloneQuestion,
  isUnequivocalDailyBriefQuestion,
  isSteeringReadQuestion,
  plannerIntentYieldsToExecutiveStatus,
  buildExecutiveStatusPack,
  projectExecutiveTrendChannels,
  buildExecutiveStatusPrompt,
  applyExecutiveLanguageGuard,
  buildNeutralGreeting,
  shouldHandleExecutiveStatus,
} = require("../lib/director-ia-conversational-executive-layer");
const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");
const { isPreCloseQuestion } = require("../lib/director-ia-executive-cycle-composer");
const { isMonthCloseQuestion } = require("../lib/director-ia-month-close-result");

const ROOT = path.join(__dirname, "..");
const CEL_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-conversational-executive-layer.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");
const PLANNER_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-planner.js"), "utf8");

const CATALOG = [
  { planta_id: 1, nombre: "Acapulco", clave: "E3" },
  { planta_id: 2, nombre: "Puebla", clave: "E7" },
];

const STATUS_VARIANTS = [
  "¿Cómo vamos?",
  "como vamos",
  "cómo vamos",
  "Cómo andamos",
  "¿cómo estamos?",
  "qué está pasando",
  "¿Cómo se ve la planta?",
  "cuál es el estado de la planta",
];

function plant() {
  return { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" };
}

function assembleOk(over = {}) {
  return assemblePlantDiagnosisEvidence({
    plant: plant(),
    year: 2026,
    month: 8,
    actionRegisterRaw: {
      period: { kind: "snapshot", as_of: "2026-08-23" },
      payload: { summary: { open: 3, closed: 1, overdue: 1 }, top_overdue: [], responsables: [] },
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
    ...over,
  });
}

describe("CEL semantic need — no phrase patch", () => {
  it("variantes de estado ejecutivo resuelven EXECUTIVE_STATUS", () => {
    for (const q of STATUS_VARIANTS) {
      const need = resolveExecutiveNeed(q);
      assert.equal(need.need_type, NEED_TYPES.EXECUTIVE_STATUS, q);
      assert.equal(need.implemented, true, q);
      assert.equal(isExecutiveStatusQuestion(q), true, q);
    }
  });

  it("no es igualdad de frase: normalize quita puntuación y acentos", () => {
    assert.equal(normalizeExecutiveText("¿Cómo vamos?"), "como vamos");
    assert.notEqual(STATUS_VARIANTS[0], "como vamos");
    assert.doesNotMatch(CEL_SRC, /if\s*\(\s*text\s*===\s*["']como vamos["']/);
    assert.doesNotMatch(CHAT_SRC, /if\s*\(\s*(q|text|raw)\s*===\s*["']como vamos["']/);
    assert.doesNotMatch(PLANNER_SRC, /if\s*\(\s*(q|text)\s*===\s*["']como vamos["']/);
  });

  it("needs posteriores no se implementan en este slice", () => {
    assert.equal(resolveExecutiveNeed("¿Qué te preocupa?").need_type, NEED_TYPES.RISK_FOCUS);
    assert.equal(resolveExecutiveNeed("¿Qué te preocupa?").implemented, false);
    assert.equal(resolveExecutiveNeed("¿Por qué?").need_type, NEED_TYPES.CAUSE_EXPLANATION);
    assert.equal(resolveExecutiveNeed("¿Qué harías?").need_type, NEED_TYPES.RECOMMENDATION);
    assert.equal(resolveExecutiveNeed("Compáralas").need_type, NEED_TYPES.COMPARISON);
  });

  it("modos especializados no caen en EXECUTIVE_STATUS", () => {
    assert.equal(isSpecializedStandaloneQuestion("Cómo va IGF"), true);
    assert.equal(resolveExecutiveNeed("Cómo va IGF").specialized, true);
    assert.equal(isSpecializedStandaloneQuestion("prepárame para el pre-cierre"), true);
    assert.equal(isSpecializedStandaloneQuestion("cómo cerramos julio"), true);
    assert.equal(isSpecializedStandaloneQuestion("cómo vamos en casa"), true);
    assert.equal(isExecutiveStatusQuestion("cómo va mantenimiento"), false);
  });

  it("cues casuales no disparan EXECUTIVE_STATUS", () => {
    for (const q of ["vamos", "estamos", "vamos a ver", "andamos bien"]) {
      assert.equal(resolveExecutiveNeed(q).need_type, null, q);
      assert.equal(isExecutiveStatusQuestion(q), false, q);
    }
  });
});

describe("CEL M1 daily vs executive status", () => {
  const STATUS_WITH_TODAY = [
    "¿Cómo vamos hoy?",
    "cómo andamos hoy",
    "cómo se ve la planta hoy",
    "¿Cómo está Acapulco?",
    "cómo estamos hoy",
  ];
  const REAL_DAILY = [
    "Dame el resumen de hoy",
    "quiero el brief diario",
    "reporte diario de ayer",
    "¿Cómo nos fue ayer?",
    "¿Qué tal estuvo el día?",
    "¿Qué pasó ayer?",
  ];

  it("estado + hoy no es phrase patch y gana al planner daily", () => {
    for (const q of STATUS_WITH_TODAY) {
      const need = resolveExecutiveNeed(q);
      assert.equal(need.need_type, NEED_TYPES.EXECUTIVE_STATUS, q);
      assert.equal(isUnequivocalDailyBriefQuestion(q), false, q);
      const planned = planDirectorIaQuestion(q).intent;
      assert.equal(
        shouldHandleExecutiveStatus(need, {}, planned),
        true,
        `${q} planner=${planned}`
      );
    }
    assert.doesNotMatch(CEL_SRC, /if\s*\(\s*(q|text|raw)\s*===\s*["']¿Cómo vamos hoy\?["']/);
    assert.doesNotMatch(CHAT_SRC, /como vamos hoy/);
  });

  it("brief/resumen/reporte diario inequívoco se preserva", () => {
    for (const q of REAL_DAILY) {
      assert.equal(isUnequivocalDailyBriefQuestion(q), true, q);
      assert.notEqual(resolveExecutiveNeed(q).need_type, NEED_TYPES.EXECUTIVE_STATUS, q);
      assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed(q), {}, "daily_executive_brief"), false, q);
    }
    assert.equal(plannerIntentYieldsToExecutiveStatus("daily_executive_brief"), true);
    assert.equal(plannerIntentYieldsToExecutiveStatus("pre_meeting_brief"), false);
    assert.deepEqual([...CEL_OVERRIDABLE_PLANNER_INTENTS], [
      "unknown",
      "plant_diagnosis",
      "daily_executive_brief",
    ]);
  });
});

describe("CEL UI plant anchor + explicit override", () => {
  it("cómo vamos + UI Acapulco → scope Acapulco", () => {
    const scope = resolveSemanticScope("¿Cómo vamos?", {
      ui_planta_id: 1,
      ui_plant_label: "Acapulco",
      plant_catalog: CATALOG,
      auth: { role: "ZP" },
    });
    assert.equal(scope.action, "RESOLVED");
    assert.equal(scope.scope_source, "ui_plant_anchor");
    assert.equal(scope.planta_id, 1);
    assert.equal(scope.plant_name, "Acapulco");
  });

  it("cómo va Puebla + UI Acapulco → Puebla gana", () => {
    const explicit = extractExplicitPlant("¿Cómo va Puebla?", CATALOG);
    assert.equal(explicit.planta_id, 2);
    const scope = resolveSemanticScope("¿Cómo va Puebla?", {
      ui_planta_id: 1,
      ui_plant_label: "Acapulco",
      plant_catalog: CATALOG,
      auth: { role: "ZP" },
    });
    assert.equal(scope.scope_source, "explicit_plant");
    assert.equal(scope.planta_id, 2);
    assert.equal(scope.plant_name, "Puebla");
  });

  it("Puebla explícita + AUTHZ fail-closed", () => {
    const scope = resolveSemanticScope("¿Cómo va Puebla?", {
      ui_planta_id: 1,
      ui_plant_label: "Acapulco",
      plant_catalog: CATALOG,
      auth: { role: "GA", plantas_permitidas: [1] },
    });
    assert.equal(scope.action, "NOT_AUTHORIZED");
    assert.equal(scope.planta_id, 2);
    assert.equal(scope.status, 403);
  });

  it("sin plant anchor usable → clarificación", () => {
    const scope = resolveSemanticScope("¿Cómo vamos?", {
      ui_planta_id: 1,
      ui_plant_label: "Acapulco",
      plant_catalog: CATALOG,
      auth: { role: "ZP" },
      ui_plant_anchor: false,
    });
    assert.equal(scope.action, "ASK_CLARIFICATION");
    assert.match(scope.clarification, /planta/i);
  });

  it("explícita no resoluble no cae a la UI", () => {
    const scope = resolveSemanticScope("¿Cómo va Puebla?", {
      ui_planta_id: 1,
      ui_plant_label: "Acapulco",
      plant_catalog: [],
      auth: { role: "ZP" },
    });
    assert.equal(scope.action, "ASK_CLARIFICATION");
    assert.notEqual(scope.scope_source, "ui_plant_anchor");
    assert.notEqual(scope.planta_id, 1);
    assert.match(scope.clarification, /Puebla/i);
  });

  it("explícita fuera de catálogo no usa Acapulco", () => {
    const scope = resolveSemanticScope("¿Cómo va Veracruz?", {
      ui_planta_id: 1,
      ui_plant_label: "Acapulco",
      plant_catalog: CATALOG,
      auth: { role: "ZP" },
    });
    assert.equal(scope.action, "ASK_CLARIFICATION");
    assert.notEqual(scope.planta_id, 1);
  });
});

describe("CEL pack + composer", () => {
  it("pack declara availability, periodos y no fusiona", () => {
    const assembled = assembleOk();
    const pack = buildExecutiveStatusPack({
      assembled,
      trend: { ok: false },
      scope: { scope_source: "ui_plant_anchor", planta_id: 1, plant_name: "Acapulco" },
    });
    assert.equal(pack.periods.strategy, PERIOD_STRATEGY);
    assert.equal(pack.periods.fuse, false);
    assert.ok(pack.periods.distinct_periods.length >= 2);
    assert.match(pack.periods.user_note, /periodos distintos/);
    assert.equal(pack.channels.PORTATIL.availability, "NOT_AVAILABLE");
    assert.equal(pack.channels.CARBURACION.availability, "NOT_AVAILABLE");
    assert.equal(pack.channels.CASA.availability, "PARTIAL");
    assert.equal(pack.demand.actual_financial, AVAILABILITY.NOT_APPLICABLE);
    assert.equal(pack.demand.steering_recorded, AVAILABILITY.NOT_APPLICABLE);
    const forecast = pack.items.find((i) => i.payload && i.payload.metric === "forecast_venta_desc");
    assert.equal(forecast.truth_semantics, "FORECAST_PROJECTION");
    assert.equal(forecast.availability, AVAILABILITY.UNAVAILABLE);
    assert.equal(forecast.payload.venta_ton, null);
    const missing = buildExecutiveStatusPack({
      assembled: assembleOk({ arrRaw: { venta_ton: null } }),
      trend: null,
      scope: { planta_id: 1, plant_name: "Acapulco" },
    });
    const missingForecast = missing.items.find((i) => i.payload && i.payload.metric === "forecast_venta_desc");
    assert.notEqual(missingForecast.payload && missingForecast.payload.venta_ton, 0);
    assert.match(missingForecast.summary, /UNAVAILABLE|no es cero/i);
  });

  it("composer no es source dump ni materialidad-first", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembleOk(),
      trend: { ok: true, range_start: "2026-07-24", range_end: "2026-08-23", ols: { direction: "DOWN" } },
      scope: { scope_source: "explicit_plant", planta_id: 1, plant_name: "Acapulco" },
    });
    const prompt = buildExecutiveStatusPrompt(pack, "¿Cómo va Acapulco?");
    assert.match(prompt.userContent, /PACK EJECUTIVO/);
    assert.match(prompt.userContent, /orden de fuentes no es el orden/);
    assert.doesNotMatch(prompt.userContent, /señala primero los clientes/);
    assert.doesNotMatch(prompt.userContent, /MATERIALIDAD COMERCIAL \(kg homogéneos/);
    assert.match(prompt.userContent, /No encontré una acción DICF asociada/);
    assert.match(prompt.userContent, /No se han tomado medidas/);
    assert.match(prompt.systemPrompt, /NO_DICF_ACTION no es NO_MEASURES_TAKEN/);
  });

  it("guard de lenguaje corrige DICF y jerga", () => {
    const guarded = applyExecutiveLanguageGuard(
      "No se han tomado medidas. Hay period mismatch y null no es cero.",
      { dicf_measures_supported: false }
    );
    assert.match(guarded, /No encontré una acción DICF asociada/);
    assert.doesNotMatch(guarded, /no se han tomado medidas/i);
    assert.doesNotMatch(guarded, /period mismatch/i);
    assert.doesNotMatch(guarded, /null no es cero/i);
  });

  it("guard DICF cubre variantes de sobreafirmación", () => {
    for (const raw of [
      "No se tomaron medidas ni hay seguimiento.",
      "No se hizo nada.",
      "Nadie actuó.",
    ]) {
      const guarded = applyExecutiveLanguageGuard(raw, { dicf_measures_supported: false });
      assert.match(guarded, /No encontré una acción DICF asociada/, raw);
      assert.doesNotMatch(guarded, /no se tomaron medidas/i, raw);
      assert.doesNotMatch(guarded, /no se hizo nada/i, raw);
      assert.doesNotMatch(guarded, /nadie actu/i, raw);
    }
  });

  it("period labels no usan kind tokens como calendario", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembleOk(),
      trend: { ok: true, range_start: "2026-07-24", range_end: "2026-08-23" },
      scope: { scope_source: "ui_plant_anchor", planta_id: 1, plant_name: "Acapulco" },
    });
    assert.equal(pack.periods.labels.some((l) => l.period === "snapshot"), false);
    assert.equal(pack.periods.labels.some((l) => l.period === "bitacora_window"), false);
    assert.ok(pack.periods.distinct_periods.every((p) => !["snapshot", "bitacora_window"].includes(p)));
  });

  it("TREND no emite tendencia combinada CASA/comisionista desde ols suelto", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembleOk(),
      trend: { ok: true, range_start: "2026-07-24", range_end: "2026-08-23", ols: { direction: "DOWN" }, compare: true },
      scope: { planta_id: 1, plant_name: "Acapulco" },
    });
    const trend = pack.items.find((i) => i.slot === "TREND");
    assert.equal(trend.truth_semantics, "OLS_PER_CHANNEL");
    assert.equal(trend.payload.direction, undefined);
    assert.equal(trend.payload.casa.direction, null);
    assert.equal(trend.payload.comisionista.direction, null);
    const prompt = buildExecutiveStatusPrompt(pack, "¿Cómo vamos?");
    assert.doesNotMatch(prompt.userContent, /CASA\/comisionista/);
    assert.doesNotMatch(prompt.userContent, /tendencia_ols=DOWN/);
    assert.match(prompt.userContent, /CASA availability=/);
    assert.match(prompt.userContent, /COMISIONISTA availability=/);
  });
});

describe("CEL TREND channel independence", () => {
  function channelBlock(key, direction, over = {}) {
    const missing = direction == null;
    return {
      channel: key,
      range_start: over.range_start || "2026-07-24",
      range_end: over.range_end || "2026-08-23",
      ols: { direction: missing ? "INSUFFICIENT_DATA" : direction },
      limitations: missing ? ["insufficient_observations"] : [],
      provenance: { source: "commercial-trend-engine", canal: key },
    };
  }

  function trendBoth(casaDir, comiDir, over = {}) {
    const casa = casaDir === "NOT_AVAILABLE" ? null : channelBlock("casa", casaDir === "UNKNOWN" ? null : casaDir, {
      range_start: over.casaFrom,
      range_end: over.casaTo,
    });
    const comi =
      comiDir === "NOT_AVAILABLE"
        ? null
        : channelBlock("comisionista", comiDir === "UNKNOWN" ? null : comiDir, {
            range_start: over.comiFrom,
            range_end: over.comiTo,
          });
    return {
      ok: true,
      compare: true,
      channel: "both",
      ols: null,
      range_start: over.casaFrom || "2026-07-24",
      range_end: over.casaTo || "2026-08-23",
      channels: { casa, comisionista: comi },
    };
  }

  function trendItem(casaDir, comiDir, over) {
    const pack = buildExecutiveStatusPack({
      assembled: assembleOk(),
      trend: trendBoth(casaDir, comiDir, over),
      scope: { planta_id: 1, plant_name: "Acapulco" },
    });
    return pack.items.find((i) => i.slot === "TREND");
  }

  it("A CASA DOWN + COMISIONISTA UP llegan separados y divergen", () => {
    const item = trendItem("DOWN", "UP");
    assert.equal(item.payload.casa.direction, "DOWN");
    assert.equal(item.payload.comisionista.direction, "UP");
    assert.equal(item.payload.diverge, true);
    assert.match(item.summary, /Divergen/);
    assert.doesNotMatch(item.summary, /CASA\/comisionista/);
    const projected = projectExecutiveTrendChannels(trendBoth("DOWN", "UP"));
    assert.equal(projected.casa.direction, "DOWN");
    assert.equal(projected.comisionista.direction, "UP");
  });

  it("B CASA UP + COMISIONISTA DOWN llegan separados", () => {
    const item = trendItem("UP", "DOWN");
    assert.equal(item.payload.casa.direction, "UP");
    assert.equal(item.payload.comisionista.direction, "DOWN");
    assert.equal(item.payload.diverge, true);
  });

  it("C ambos DOWN conservan identidad", () => {
    const item = trendItem("DOWN", "DOWN");
    assert.equal(item.payload.casa.direction, "DOWN");
    assert.equal(item.payload.comisionista.direction, "DOWN");
    assert.equal(item.payload.diverge, false);
    assert.match(item.summary, /CASA=DOWN/);
    assert.match(item.summary, /Comisionista=DOWN/);
    assert.match(item.summary, /no es una serie agregada/i);
  });

  it("D CASA UNKNOWN no se infiere si Comisionista UP", () => {
    const item = trendItem("UNKNOWN", "UP");
    assert.equal(item.payload.casa.direction, null);
    assert.equal(item.payload.casa.availability, AVAILABILITY.UNAVAILABLE);
    assert.equal(item.payload.comisionista.direction, "UP");
    assert.equal(item.payload.diverge, false);
    assert.match(item.summary, /CASA=UNAVAILABLE/);
  });

  it("E CASA DOWN + Comisionista NOT_AVAILABLE no inventa Comisionista", () => {
    const item = trendItem("DOWN", "NOT_AVAILABLE");
    assert.equal(item.payload.casa.direction, "DOWN");
    assert.equal(item.payload.comisionista.direction, null);
    assert.equal(item.payload.comisionista.availability, AVAILABILITY.UNAVAILABLE);
    assert.doesNotMatch(item.summary, /Comisionista=DOWN|Comisionista=UP|Comisionista=FLAT/);
  });

  it("F periodos distintos de canal no se fusionan", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembleOk(),
      trend: trendBoth("DOWN", "UP", {
        casaFrom: "2026-07-01",
        casaTo: "2026-07-31",
        comiFrom: "2026-08-01",
        comiTo: "2026-08-23",
      }),
      scope: { planta_id: 1, plant_name: "Acapulco" },
    });
    assert.equal(pack.periods.fuse, false);
    assert.equal(pack.periods.strategy, PERIOD_STRATEGY);
    const casaLabel = pack.periods.labels.find((l) => l.source === "commercial_trend.casa");
    const comiLabel = pack.periods.labels.find((l) => l.source === "commercial_trend.comisionista");
    assert.equal(casaLabel.period, "2026-07-01→2026-07-31");
    assert.equal(comiLabel.period, "2026-08-01→2026-08-23");
    assert.ok(pack.periods.distinct_periods.includes("2026-07-01→2026-07-31"));
    assert.ok(pack.periods.distinct_periods.includes("2026-08-01→2026-08-23"));
    const trend = pack.items.find((i) => i.slot === "TREND");
    assert.match(trend.period, /2026-07-01→2026-07-31/);
    assert.match(trend.period, /2026-08-01→2026-08-23/);
  });

  it("G prompt no contiene CASA/comisionista ni tendencia_ols de primary=casa", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembleOk(),
      trend: trendBoth("DOWN", "UP"),
      scope: { planta_id: 1, plant_name: "Acapulco" },
    });
    const prompt = buildExecutiveStatusPrompt(pack, "¿Cómo vamos?");
    assert.doesNotMatch(prompt.userContent, /CASA\/comisionista/);
    assert.doesNotMatch(prompt.userContent, /tendencia_ols=/);
    assert.match(prompt.userContent, /CASA availability=REQUIRED direction=DOWN/);
    assert.match(prompt.userContent, /COMISIONISTA availability=REQUIRED direction=UP/);
    assert.match(prompt.userContent, /diverge=true/);
    assert.match(prompt.systemPrompt, /tendencias independientes/);
  });

  it("H need EXECUTIVE_STATUS se conserva en variantes abiertas", () => {
    for (const q of [
      "¿Cómo vamos?",
      "¿Cómo estamos?",
      "¿Cómo va Acapulco?",
      "¿Cómo vamos hoy?",
      "¿Cómo va Puebla?",
    ]) {
      assert.equal(resolveExecutiveNeed(q).need_type, NEED_TYPES.EXECUTIVE_STATUS, q);
    }
  });

  it("I specialized modes no los secuestra EXECUTIVE_STATUS", () => {
    assert.equal(isUnequivocalDailyBriefQuestion("Dame el resumen diario"), true);
    assert.equal(resolveExecutiveNeed("Dame el resumen diario").specialized, true);
    assert.equal(isPreCloseQuestion("Prepárame para el pre-cierre"), true);
    assert.equal(resolveExecutiveNeed("Prepárame para el pre-cierre").specialized, true);
    assert.equal(resolveExecutiveNeed("Cómo va IGF").specialized, true);
  });

  it("J AUTHZ de trend no inventa canales", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembleOk(),
      trend: { ok: false, abort: true, code: "SOURCE_RESTRICTED" },
      scope: { planta_id: 1, plant_name: "Acapulco" },
    });
    const trend = pack.items.find((i) => i.slot === "TREND");
    assert.equal(trend.availability, AVAILABILITY.NOT_AUTHORIZED);
    assert.equal(trend.payload.casa.availability, AVAILABILITY.NOT_AUTHORIZED);
    assert.equal(trend.payload.comisionista.availability, AVAILABILITY.NOT_AUTHORIZED);
    assert.equal(trend.payload.casa.direction, null);
    assert.equal(trend.payload.comisionista.direction, null);
  });

  it("K missing/null de canal no es 0 ni DOWN inventado", () => {
    const item = trendItem("UNKNOWN", "UNKNOWN");
    assert.equal(item.payload.casa.direction, null);
    assert.equal(item.payload.comisionista.direction, null);
    assert.notEqual(item.payload.casa.direction, 0);
    assert.match(item.summary, /Ausencia no es cero/);
  });

  it("ledger refleja proyección per-channel sin inventar SEH/FA", () => {
    const trend = CAPABILITY_INTEGRATION_LEDGER.find((r) => r.capability === "commercial_trend");
    assert.equal(trend.first_slice_bridge, "PER_CHANNEL_OLS");
    assert.ok(CAPABILITY_INTEGRATION_LEDGER.some((r) => r.capability === "commercial_trend.casa"));
    assert.ok(CAPABILITY_INTEGRATION_LEDGER.some((r) => r.capability === "commercial_trend.comisionista"));
    assert.equal(
      CAPABILITY_INTEGRATION_LEDGER.find((r) => r.capability === "ACTUAL_FINANCIAL").first_slice_bridge,
      "NOT_APPLICABLE"
    );
    assert.equal(CHANNEL_REGISTRY.CASA.independent, true);
    assert.equal(CHANNEL_REGISTRY.COMISIONISTA.independent, true);
  });

  it("guard elimina el token fusionado CASA/comisionista", () => {
    const guarded = applyExecutiveLanguageGuard(
      "El motor CASA/comisionista muestra descenso.",
      { dicf_measures_supported: false }
    );
    assert.doesNotMatch(guarded, /CASA\/comisionista/i);
    assert.match(guarded, /CASA y Comisionista/);
  });
});

describe("CEL pack + composer extra", () => {
  it("saludo neutral + planta, sin lista STALE", () => {
    const text = buildNeutralGreeting("Acapulco");
    assert.match(text, /Acapulco/);
    assert.doesNotMatch(text, /Action Register|DICF|bitácoras/);
    assert.match(CHAT_SRC, /buildNeutralGreeting/);
    assert.doesNotMatch(
      CHAT_SRC,
      /Puedo ayudarte a revisar acciones abiertas, vencidas, responsables, riesgos, clientes, DICF y bitácoras/
    );
  });
});

describe("CEL chat E2E first slice", () => {
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
      loadCommercialTrendForChat: undefined,
      plantCatalog: undefined,
      loadFinancialDiagnosisForChat: undefined,
    });
  });

  function wire(over = {}) {
    let lastPrompt = null;
    let loadedPlantId = null;
    configureDirectorIaChat({
      pool: {},
      plantCatalog: CATALOG,
      openaiChat: async (sys, user) => {
        lastPrompt = { sys, user };
        return over.answer || "Acapulco va con proyección distinta al cache de julio. Sin causa inventada.";
      },
      loadPlantDiagnosisForChat: async (_pool, plantaId) => {
        loadedPlantId = plantaId;
        if (over.denyPlant && Number(plantaId) === Number(over.denyPlant)) {
          return {
            ok: false,
            abort: true,
            status: 403,
            code: "SOURCE_RESTRICTED",
            error: "Sin acceso a esta planta",
          };
        }
        return over.assembled || assembleOk();
      },
      loadCommercialTrendForChat: async () =>
        over.trend === undefined
          ? { ok: true, range_start: "2026-07-24", range_end: "2026-08-23", ols: { direction: "DOWN" }, compare: true }
          : over.trend,
    });
    return {
      get lastPrompt() {
        return lastPrompt;
      },
      get loadedPlantId() {
        return loadedPlantId;
      },
    };
  }

  it("1 UI Acapulco + cómo vamos → EXECUTIVE_STATUS Acapulco, no unknown", async () => {
    const ctx = wire();
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo vamos?"
    );
    assert.equal(result.ok, true);
    assert.equal(detectDirectorIaIntent("¿Cómo vamos?").intent, "unknown");
    assert.equal(result.context_meta.semantic_need, "EXECUTIVE_STATUS");
    assert.equal(result.context_meta.scope_source, "ui_plant_anchor");
    assert.equal(ctx.loadedPlantId, 1);
    assert.equal(result.context_meta.executive_composer, true);
  });

  it("1b UI Acapulco + cómo vamos con CASA↓ COMISIONISTA↑ no fusiona en el prompt", async () => {
    const ctx = wire({
      trend: {
        ok: true,
        compare: true,
        channel: "both",
        ols: null,
        range_start: "2026-07-24",
        range_end: "2026-08-23",
        channels: {
          casa: {
            channel: "casa",
            range_start: "2026-07-24",
            range_end: "2026-08-23",
            ols: { direction: "DOWN" },
            limitations: [],
            provenance: { source: "commercial-trend-engine", canal: "casa" },
          },
          comisionista: {
            channel: "comisionista",
            range_start: "2026-07-24",
            range_end: "2026-08-23",
            ols: { direction: "UP" },
            limitations: [],
            provenance: { source: "commercial-trend-engine", canal: "comisionista" },
          },
        },
      },
    });
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo vamos?"
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.semantic_need, "EXECUTIVE_STATUS");
    assert.doesNotMatch(ctx.lastPrompt.user, /CASA\/comisionista/);
    assert.doesNotMatch(ctx.lastPrompt.user, /tendencia_ols=/);
    assert.match(ctx.lastPrompt.user, /CASA availability=REQUIRED direction=DOWN/);
    assert.match(ctx.lastPrompt.user, /COMISIONISTA availability=REQUIRED direction=UP/);
  });

  it("2 variantes semánticas usan el mismo need", async () => {
    const ctx = wire();
    for (const q of ["cómo andamos", "qué está pasando", "cómo se ve la planta"]) {
      const result = await askDirectorIa(
        { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
        1,
        q
      );
      assert.equal(result.context_meta.semantic_need, "EXECUTIVE_STATUS", q);
      assert.equal(result.context_meta.executive_composer, true, q);
    }
    assert.ok(ctx.lastPrompt.user.includes("PACK EJECUTIVO"));
  });

  it("3 cómo va Acapulco → composer, no source dump", async () => {
    const ctx = wire();
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo va Acapulco?"
    );
    assert.equal(result.context_meta.semantic_need, "EXECUTIVE_STATUS");
    assert.equal(result.context_meta.executive_composer, true);
    assert.doesNotMatch(ctx.lastPrompt.user, /señala primero los clientes/);
    assert.match(ctx.lastPrompt.user, /PACK EJECUTIVO/);
    assert.equal(result.executive_status.need_type, "EXECUTIVE_STATUS");
  });

  it("4 UI Acapulco + cómo va Puebla → Puebla + AUTHZ", async () => {
    const ctx = wire();
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo va Puebla?"
    );
    assert.equal(ctx.loadedPlantId, 2);
    assert.equal(result.context_meta.scope_source, "explicit_plant");
    assert.equal(result.context_meta.planta_id, 2);
  });

  it("5 sin anchor usable → clarificación", async () => {
    wire();
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", ui_plant_anchor: false }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo vamos?"
    );
    assert.equal(result.context_meta.requires_clarification, true);
    assert.match(result.answer, /planta/i);
    assert.equal(result.context_meta.openai_called, false);
  });

  it("6 no cross-plant leakage", async () => {
    wire({ denyPlant: 2 });
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      1,
      "¿Cómo va Puebla?"
    );
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
    assert.equal(result.code, "SOURCE_RESTRICTED");
  });

  it("7 DICF sin acción no afirma medidas no tomadas", async () => {
    const ctx = wire({
      answer: "No se han tomado medidas con Acme.",
    });
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo va Acapulco?"
    );
    assert.doesNotMatch(result.answer, /no se han tomado medidas/i);
    assert.match(result.answer, /acción DICF asociada/i);
    assert.match(ctx.lastPrompt.user, /NO_MEASURES_TAKEN|No se han tomado medidas/);
  });

  it("8 periodos distintos etiquetados", async () => {
    const ctx = wire();
    await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo vamos?"
    );
    assert.match(ctx.lastPrompt.user, /COMPARE_WITH_LABELS|periodos distintos/);
    assert.doesNotMatch(ctx.lastPrompt.user, /fusión silenciosa/);
  });

  it("9 missing numeric no se vuelve cero en el pack", async () => {
    const ctx = wire({
      assembled: assembleOk({ arrRaw: { venta_ton: null } }),
    });
    await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo vamos?"
    );
    assert.match(ctx.lastPrompt.user, /no escribas 0|no es cero/i);
    assert.doesNotMatch(ctx.lastPrompt.user, /cifra=0/);
  });

  it("10 CASA partial no inventa Portátil/Carburación", async () => {
    const ctx = wire();
    await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo vamos?"
    );
    assert.match(ctx.lastPrompt.user, /PORTATIL=NOT_AVAILABLE/);
    assert.match(ctx.lastPrompt.user, /CARBURACION=NOT_AVAILABLE/);
    assert.match(ctx.lastPrompt.user, /CASA=PARTIAL/);
  });

  it("11 Hola → saludo contextual no STALE", async () => {
    configureDirectorIaChat({ pool: {}, openaiChat: async () => "no" });
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "Hola"
    );
    assert.match(result.answer, /Acapulco/);
    assert.doesNotMatch(result.answer, /Action Register|DICF|bitácoras de seguimiento/);
    assert.equal(result.context_meta.openai_called, undefined);
  });

  it("12 IGF especializado se preserva", async () => {
    const plan = planDirectorIaQuestion("Cómo va IGF");
    assert.equal(plan.intent, "igf_status");
    assert.equal(resolveExecutiveNeed("Cómo va IGF").specialized, true);
    assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed("Cómo va IGF"), {}), false);
  });

  it("13 PRE_CLOSE se preserva", async () => {
    assert.equal(isPreCloseQuestion("prepárame para el pre-cierre"), true);
    assert.equal(planDirectorIaQuestion("prepárame para el pre-cierre").intent, "pre_meeting_brief");
    assert.equal(resolveExecutiveNeed("prepárame para el pre-cierre").specialized, true);
  });

  it("14 month_close_result se preserva", async () => {
    assert.equal(isMonthCloseQuestion("cómo cerramos julio"), true);
    assert.equal(planDirectorIaQuestion("cómo cerramos julio").intent, "month_close_result");
    assert.equal(resolveExecutiveNeed("cómo cerramos julio").specialized, true);
  });

  it("15 ACTUAL_FINANCIAL no entra a EXECUTIVE_STATUS", async () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembleOk(),
      trend: null,
      scope: { planta_id: 1, plant_name: "Acapulco" },
    });
    assert.equal(pack.demand.actual_financial, "NOT_APPLICABLE");
    assert.equal(isMonthCloseQuestion("cómo cerramos julio"), true);
  });

  it("M1 UI Acapulco + cómo vamos hoy → CEL no daily", async () => {
    const ctx = wire();
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo vamos hoy?"
    );
    assert.equal(detectDirectorIaIntent("¿Cómo vamos hoy?").intent, "daily_executive_brief");
    assert.equal(result.context_meta.semantic_need, "EXECUTIVE_STATUS");
    assert.equal(result.context_meta.executive_composer, true);
    assert.equal(result.context_meta.scope_source, "ui_plant_anchor");
    assert.equal(ctx.loadedPlantId, 1);
    assert.notEqual(result.context_meta.mode, "daily_executive_brief");
  });

  it("M1 brief diario inequívoco no lo secuestra CEL", async () => {
    let dailyCalled = 0;
    configureDirectorIaChat({
      pool: {},
      plantCatalog: CATALOG,
      openaiChat: async () => "Brief del día.",
      loadDailySalesDeviationForChat: async () => {
        dailyCalled += 1;
        return { ok: true, computed: { target_date: "2026-08-19" }, plant: plant() };
      },
      loadDailyDiscountDeviationForChat: async () => ({
        ok: true,
        computed: { target_date: "2026-08-19" },
        plant: plant(),
      }),
    });
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "Dame el resumen de hoy"
    );
    assert.notEqual(result.context_meta && result.context_meta.semantic_need, "EXECUTIVE_STATUS");
    assert.notEqual(result.context_meta && result.context_meta.executive_composer, true);
  });

  it("M2 sin catálogo + Puebla explícita no usa Acapulco", async () => {
    let loadedPlantId = null;
    configureDirectorIaChat({
      pool: {},
      plantCatalog: [],
      openaiChat: async () => "no debería componer",
      loadPlantDiagnosisForChat: async (_pool, plantaId) => {
        loadedPlantId = plantaId;
        return assembleOk();
      },
    });
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo va Puebla?"
    );
    assert.equal(result.context_meta.requires_clarification, true);
    assert.notEqual(loadedPlantId, 1);
    assert.equal(loadedPlantId, null);
    assert.match(result.answer, /Puebla/i);
    assert.notEqual(result.context_meta.scope_source, "ui_plant_anchor");
  });

  it("16 Steering query no finge integración", async () => {
    assert.equal(isSteeringReadQuestion("qué decidimos en la junta"), true);
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "qué decidimos en la junta"
    );
    assert.match(result.answer, /no leo compromisos/i);
    assert.equal(result.context_meta.steering_chat, "PENDING");
    assert.equal(result.context_meta.post_capture_read, "PENDING");
    assert.doesNotMatch(result.answer, /steering event|RECORDED/);
  });
});

describe("No-Orphan ledger preservado", () => {
  it("mantiene capabilities pendientes del ARCH", () => {
    const names = CAPABILITY_INTEGRATION_LEDGER.map((r) => r.capability);
    for (const required of [
      "commercial_trend",
      "ACTUAL_FINANCIAL",
      "PRE_CLOSE",
      "EXECUTIVE_STEERING_CAPTURE",
      "POST_CAPTURE_READ",
      "Plaud",
      "Council",
      "live_copilot",
    ]) {
      assert.ok(names.includes(required), required);
    }
    const plaud = CAPABILITY_INTEGRATION_LEDGER.find((r) => r.capability === "Plaud");
    assert.equal(plaud.conversational_status, "PENDING_INTEGRATION");
    assert.match(plaud.planned_integration_point, /POST_CAPTURE_READ/);
    const steering = CAPABILITY_INTEGRATION_LEDGER.find((r) => r.capability === "EXECUTIVE_STEERING_CAPTURE");
    assert.equal(steering.conversational_status, "PHYSICAL_INFRASTRUCTURE_ONLY");
  });

  it("M3 CEL no es ship aislable; depende del composer PRE_CLOSE", () => {
    assert.equal(CEL_SHIP_DEPENDENCY, "PRE_CLOSE_SHARED_COMPOSER");
    assert.equal(ISOLATED_CEL_SHIP, false);
    assert.match(CEL_SRC, /director-ia-executive-cycle-composer/);
    assert.match(CEL_SRC, /CEL_SHIP_DEPENDENCY=PRE_CLOSE_SHARED_COMPOSER/);
    assert.equal(typeof isPreCloseQuestion, "function");
  });
});
