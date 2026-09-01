"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");
const {
  buildExecutiveStatusPack,
  buildExecutiveStatusPrompt,
  applyExecutiveLanguageGuard,
  packHasNoClosedDaysYet,
} = require("../lib/director-ia-conversational-executive-layer");
const {
  deriveLastClosedDay,
  classifyActualToDateKind,
  ACTUAL_TO_DATE_KIND,
} = require("../lib/director-ia-dashboard-forecast-adapter");
const {
  PACK_STATUS,
  buildAuthoritativeForecastRunPack,
} = require("../lib/director-ia-authoritative-forecast-run-pack");

const ROOT = path.join(__dirname, "..");
const FORECAST_SRC = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");

function plant() {
  return { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" };
}

function assembleOk(year, month) {
  return assemblePlantDiagnosisEvidence({
    plant: plant(),
    year,
    month,
    actionRegisterRaw: {
      period: { kind: "snapshot", as_of: `${year}-${String(month).padStart(2, "0")}-01` },
      payload: { summary: { open: 1, closed: 0, overdue: 0 }, top_overdue: [], responsables: [] },
    },
    dicfRaw: { period: { kind: "action_dates" }, payload: { actions: [] } },
    bitacoraRaw: { period: { kind: "bitacora_window", months: 3, from: "2026-06" }, payload: { sessions: [] } },
    arrRaw: { venta_ton: 900, desc_kg: 1.2, load_error: null },
    igfRaw: {
      version_id: 9,
      version_number: 2,
      row: { empresa: "E3", venta_ton: 1536.54 },
      composition: {
        ok: true,
        lines: [
          { line_key: "venta_ton", value: 1536.54, unit: "ton" },
          { line_key: "com_desc_kg", value: 1.72, unit: "$/kg" },
          { line_key: "util_oper_importe", value: 420000, unit: "MXN" },
          { line_key: "resultado_final_importe", value: 310000, unit: "MXN" },
        ],
      },
    },
    commercialStateRaw: {
      period: { kind: "materialized_cache", yyyy_mm: "2026-08", year: 2026, month: 8 },
      payload: { materialized: true, counts: { dejaron: 0 }, clients_shown: [] },
    },
  });
}

function trendOk() {
  return {
    ok: true,
    range_start: "2026-08-02",
    range_end: "2026-08-31",
    compare: true,
    channels: {
      casa: { channel: "casa", ols: { direction: "UP" }, range_start: "2026-08-02", range_end: "2026-08-31" },
      comisionista: {
        channel: "comisionista",
        ols: { direction: "DOWN" },
        range_start: "2026-08-02",
        range_end: "2026-08-31",
      },
    },
    top_movers: [
      {
        cliente: "TORTILLERIA ERICK",
        delta_ton: -4.4,
        registered_comments: [{ body: "POR FALTA DE PIPAS", created_at: "2026-08-12" }],
      },
    ],
  };
}

function packFor(cutoff, ventaTon, over = {}) {
  const year = over.year != null ? over.year : 2026;
  const month = over.month != null ? over.month : 9;
  const auth = buildAuthoritativeForecastRunPack({
    plant_code: "E3",
    plant_label: "Acapulco",
    year,
    month,
    upload_day: cutoff,
    source_error: Boolean(over.source_error),
    miniAuth: over.miniAuth || {
      venta_ton: 1000,
      desc_kg: 1.1,
      util_oper_importe: 420000,
      resultado_final_importe: 310000,
    },
    actual_to_date: Object.prototype.hasOwnProperty.call(over, "actual")
      ? over.actual
      : { venta_ton: ventaTon, cutoff_date: cutoff },
  });
  const forecastParity = {
    ok: true,
    reachable: over.reachable !== false,
    period: { year, month, yyyy_mm: `${year}-${String(month).padStart(2, "0")}`, cutoff_date: cutoff },
    forecast: { venta_ton: 1000, desc_kg: 1.1, cutoff_date: cutoff, truth_semantics: "FORECAST_PROJECTION" },
    actual_to_date:
      over.parityActual !== undefined
        ? over.parityActual
        : { venta_ton: ventaTon, cutoff_date: cutoff, truth_semantics: "ACTUAL_TO_DATE" },
    mini: {
      venta_ton: 1000,
      desc_kg: 1.1,
      util_oper_importe: 420000,
      resultado_final_importe: 310000,
      cutoff_date: cutoff,
    },
  };
  const pack = buildExecutiveStatusPack({
    assembled: assembleOk(year, month),
    trend: over.trend || trendOk(),
    scope: { scope_source: "ui_plant", planta_id: 1, plant_name: "Acapulco" },
    question: over.question || "Como vamos?",
    forecastParity,
    authoritativeForecast: auth,
  });
  return { auth, pack, forecastParity };
}

function actualVentaItem(pack) {
  return (pack.items || []).find(
    (i) => i.truth_semantics === "ACTUAL_TO_DATE" && i.payload && i.payload.metric === "venta_ton"
  );
}

describe("SPRINT1 PERIOD-START-SEMANTICS — ventana sin recalcular TOTAL", () => {
  it("no altera la fórmula lastClosedDay / total_mes_sum del Dashboard", () => {
    assert.match(FORECAST_SRC, /lastClosedDay = ctx\.isCorteEnMes \? Math\.max\(0, corteDt\.getDate\(\) - 1\)/);
    assert.match(FORECAST_SRC, /total_mes_sum: sum\(totalMesVenta\)/);
  });

  it("deriveLastClosedDay: día 1 → 0; día 2 → 1; día 15 → 14", () => {
    assert.equal(deriveLastClosedDay(2026, 9, "2026-09-01"), 0);
    assert.equal(deriveLastClosedDay(2026, 9, "2026-09-02"), 1);
    assert.equal(deriveLastClosedDay(2026, 9, "2026-09-15"), 14);
    assert.equal(deriveLastClosedDay(2026, 9, null), null);
  });
});

describe("SPRINT1 PERIOD-START-SEMANTICS — matriz A-H", () => {
  it("A: día 1 lastClosedDay=0 → NO_CLOSED_DAYS_YET; no afirma actividad cero", () => {
    const { auth, pack } = packFor("2026-09-01", 0);
    assert.equal(auth.actual_to_date.venta, 0);
    assert.equal(auth.actual_to_date.venta_status, PACK_STATUS.AVAILABLE);
    assert.equal(auth.actual_to_date.last_closed_day, 0);
    assert.equal(auth.actual_to_date.period_start_status, ACTUAL_TO_DATE_KIND.NO_CLOSED_DAYS_YET);
    const mag = actualVentaItem(pack);
    assert.equal(mag.payload.period_start_status, ACTUAL_TO_DATE_KIND.NO_CLOSED_DAYS_YET);
    assert.match(mag.summary, /aún no hay días cerrados del mes/i);
    assert.doesNotMatch(mag.summary, /se han vendido 0/);
    const prompt = buildExecutiveStatusPrompt(pack, "Como vamos?");
    assert.match(prompt.userContent, /NO_CLOSED_DAYS_YET/);
    assert.doesNotMatch(prompt.userContent, /Al corte del 2026-09-01 se han vendido 0 t/);
    assert.match(prompt.userContent, /No afirmes «se han vendido 0 t»/);
    assert.equal(packHasNoClosedDaysYet(pack), true);
    const guarded = applyExecutiveLanguageGuard(
      "Al corte del 1 de septiembre de 2026, se han vendido 0 toneladas, lo que indica una falta de actividad comercial significativa en este periodo.",
      pack
    );
    assert.doesNotMatch(guarded, /se han vendido 0/);
    assert.doesNotMatch(guarded, /falta de actividad/);
    assert.match(guarded, /aún no hay días cerrados del mes/i);
  });

  it("B: día 2 actual > 0 → VALUE_OBSERVED", () => {
    const { auth, pack } = packFor("2026-09-02", 12.5);
    assert.equal(auth.actual_to_date.last_closed_day, 1);
    assert.equal(auth.actual_to_date.period_start_status, ACTUAL_TO_DATE_KIND.VALUE_OBSERVED);
    const mag = actualVentaItem(pack);
    assert.match(mag.summary, /se han vendido 12\.5 t/);
    assert.doesNotMatch(mag.summary, /NO_CLOSED_DAYS_YET/);
  });

  it("C: día 2 actual = 0 → ZERO_OBSERVED; no es NO_CLOSED_DAYS_YET", () => {
    const { auth, pack } = packFor("2026-09-02", 0);
    assert.equal(auth.actual_to_date.last_closed_day, 1);
    assert.equal(auth.actual_to_date.period_start_status, ACTUAL_TO_DATE_KIND.ZERO_OBSERVED);
    assert.equal(auth.actual_to_date.venta, 0);
    const mag = actualVentaItem(pack);
    assert.match(mag.summary, /se han vendido 0 t/);
    assert.doesNotMatch(mag.summary, /NO_CLOSED_DAYS_YET/);
    const prompt = buildExecutiveStatusPrompt(pack, "Como vamos?");
    assert.doesNotMatch(prompt.userContent, /period_start_status=NO_CLOSED_DAYS_YET: el periodo acaba de iniciar/);
  });

  it("D: mitad de mes actual = 0 → ZERO_OBSERVED", () => {
    const { auth, pack } = packFor("2026-09-15", 0);
    assert.equal(auth.actual_to_date.last_closed_day, 14);
    assert.equal(auth.actual_to_date.period_start_status, ACTUAL_TO_DATE_KIND.ZERO_OBSERVED);
    assert.match(actualVentaItem(pack).summary, /se han vendido 0 t/);
  });

  it("E: mitad de mes actual > 0 → VALUE_OBSERVED", () => {
    const { auth, pack } = packFor("2026-09-15", 88.4);
    assert.equal(auth.actual_to_date.period_start_status, ACTUAL_TO_DATE_KIND.VALUE_OBSERVED);
    assert.match(actualVentaItem(pack).summary, /se han vendido 88\.4 t/);
  });

  it("F: source unavailable se conserva", () => {
    const { auth, pack } = packFor(null, null, { source_error: true, actual: { venta_ton: null }, reachable: false });
    assert.equal(auth.actual_to_date.venta, null);
    assert.equal(auth.actual_to_date.venta_status, PACK_STATUS.UNAVAILABLE);
    assert.equal(auth.actual_to_date.period_start_status, ACTUAL_TO_DATE_KIND.SOURCE_UNAVAILABLE);
    assert.notEqual(auth.actual_to_date.period_start_status, ACTUAL_TO_DATE_KIND.NO_CLOSED_DAYS_YET);
    assert.notEqual(auth.actual_to_date.period_start_status, ACTUAL_TO_DATE_KIND.ZERO_OBSERVED);
    assert.match(actualVentaItem(pack).summary, /no disponible/i);
  });

  it("G: null se conserva y no es NO_CLOSED_DAYS_YET", () => {
    const { auth, pack } = packFor("2026-09-01", null);
    assert.equal(auth.actual_to_date.venta, null);
    assert.equal(auth.actual_to_date.venta_status, PACK_STATUS.UNAVAILABLE);
    assert.equal(auth.actual_to_date.period_start_status, ACTUAL_TO_DATE_KIND.NULL);
    assert.notEqual(auth.actual_to_date.period_start_status, ACTUAL_TO_DATE_KIND.NO_CLOSED_DAYS_YET);
    assert.match(actualVentaItem(pack).summary, /Ausencia no es cero/);
  });

  it("H: 0 explícito con días cerrados se conserva", () => {
    const { auth, pack } = packFor("2026-09-15", 0);
    assert.equal(auth.actual_to_date.venta, 0);
    assert.equal(auth.actual_to_date.period_start_status, ACTUAL_TO_DATE_KIND.ZERO_OBSERVED);
    assert.equal(classifyActualToDateKind(0, 14), ACTUAL_TO_DATE_KIND.ZERO_OBSERVED);
    assert.match(actualVentaItem(pack).summary, /se han vendido 0 t/);
  });
});

describe("SPRINT1 PERIOD-START-SEMANTICS — no colapso y no phrasebook general", () => {
  it("los cinco kinds permanecen distintos", () => {
    assert.equal(classifyActualToDateKind(0, 0), ACTUAL_TO_DATE_KIND.NO_CLOSED_DAYS_YET);
    assert.equal(classifyActualToDateKind(0, 1), ACTUAL_TO_DATE_KIND.ZERO_OBSERVED);
    assert.equal(classifyActualToDateKind(12, 1), ACTUAL_TO_DATE_KIND.VALUE_OBSERVED);
    assert.equal(classifyActualToDateKind(null, null, { no_cutoff: true }), ACTUAL_TO_DATE_KIND.UNAVAILABLE);
    assert.equal(classifyActualToDateKind(null, 0), ACTUAL_TO_DATE_KIND.NULL);
    assert.equal(classifyActualToDateKind(null, 0, { source_error: true }), ACTUAL_TO_DATE_KIND.SOURCE_UNAVAILABLE);
  });

  it("el guard de inferencia solo actúa con NO_CLOSED_DAYS_YET", () => {
    const { pack: zeroObserved } = packFor("2026-09-02", 0);
    const kept = applyExecutiveLanguageGuard(
      "Al corte se han vendido 0 t. No invento falta de actividad comercial.",
      zeroObserved
    );
    assert.match(kept, /se han vendido 0 t/);
    const { pack: day1 } = packFor("2026-09-01", 0);
    const stripped = applyExecutiveLanguageGuard("falta de actividad comercial significativa", day1);
    assert.doesNotMatch(stripped, /falta de actividad/);
  });
});

describe("SPRINT1 PERIOD-START-SEMANTICS — Forecast NL no se desvía", () => {
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
      loadIgfForecastMiniPayload: undefined,
      loadDashboardForecastParity: undefined,
      loadArrLastUploadDay: undefined,
      plantCatalog: undefined,
    });
  });

  it("descuento proyectado de cierre usa Forecast autoritativo, no ACTUAL_TO_DATE", async () => {
    configureDirectorIaChat({
      pool: { connect: async () => ({ release() {} }) },
      plantCatalog: [{ planta_id: 1, nombre: "Acapulco", clave: "E3" }],
      openaiChat: async (sys, user) => {
        assert.match(String(sys || "") + String(user || ""), /FORECAST|forecast|1\.1/i);
        return "Descuento (Forecast): 1.1 $/kg al corte del 1 de septiembre.";
      },
      loadPlantDiagnosisForChat: async () => assembleOk(2026, 9),
      loadCommercialTrendForChat: async () => trendOk(),
      loadDashboardForecastParity: async () => ({
        ok: true,
        reachable: true,
        period: { year: 2026, month: 9, yyyy_mm: "2026-09", cutoff_date: "2026-09-01" },
        forecast: { venta_ton: 1000, desc_kg: 1.1, cutoff_date: "2026-09-01" },
        actual_to_date: { venta_ton: 0, cutoff_date: "2026-09-01" },
        mini: {
          venta_ton: 1000,
          desc_kg: 1.1,
          util_oper_importe: 420000,
          resultado_final_importe: 310000,
          cutoff_date: "2026-09-01",
        },
      }),
      loadIgfForecastMiniPayload: async () => ({
        ok: true,
        year: 2026,
        month: 9,
        upload_day: "2026-09-01",
        rows: [
          {
            empresa: "Acapulco",
            plant_code: "E3",
            ventaTon: 1000,
            comDesc: 1.1,
            utilOperImporte: 420000,
            resultadoFinalImporte: 310000,
          },
        ],
      }),
      loadArrLastUploadDay: async () => ({ upload_day: "2026-09-01" }),
    });
    const req = { dashboardAuth: { role: "ZP" }, body: { upload_day: "2026-09-01" } };
    const a = await askDirectorIa(req, 1, "¿Qué descuento proyectamos para el cierre?");
    assert.equal(a.ok, true);
    assert.match(a.answer, /1\.1/);
    const b = await askDirectorIa(req, 1, "¿Qué descuento proyectamos para cerrar el mes?");
    assert.equal(b.ok, true);
    assert.match(b.answer, /1\.1/);
  });
});
