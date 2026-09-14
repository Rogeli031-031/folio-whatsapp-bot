"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  NEED_TYPES,
  resolveExecutiveNeed,
  shouldHandleExecutiveStatus,
} = require("../lib/director-ia-conversational-executive-layer");
const {
  isMonthCloseQuestion,
  isSalesTargetPerformanceQuestion,
  isMonthCloseFollowUp,
  assembleMonthClosePack,
  loadMonthCloseResultForChat,
  resolveCloseMonth,
} = require("../lib/director-ia-month-close-result");
const { isDailyExecutiveBriefQuestion } = require("../lib/director-ia-daily-executive-brief");
const { findIgfRowForPlant } = require("../lib/director-ia-igf-arr");

const ROOT = path.join(__dirname, "..");
const MONTH_CLOSE_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-month-close-result.js"), "utf8");
const PLANNER_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-planner.js"), "utf8");

const EXPLICIT_SALES_TARGET = [
  "¿Estamos cumpliendo la meta de venta?",
  "¿Cómo vamos contra la meta de venta?",
  "¿Qué porcentaje de la meta de venta llevamos?",
  "¿Vamos arriba o abajo de la meta?",
  "¿Cuánto nos falta para cumplir la meta de venta?",
  "¿Superamos la meta de venta?",
  "¿Cómo cerramos contra la meta?",
  "¿Cuál es el cumplimiento de venta del mes?",
];

function salesRow(month, cliente, kg, canal = "Casa") {
  return { month, cliente_norm: cliente, canal, subcanal: "", kg };
}

function packOpts(over = {}) {
  return {
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "PUE" },
    planta_id: 1,
    year: 2026,
    month: 6,
    period_status: "COMPLETE",
    generated_at: "2026-08-24T00:00:00.000Z",
    salesRows: [salesRow("2026-06", "ACME", 8000, "Casa"), salesRow("2026-06", "BETA", 2000, "Comisionista")],
    priorSalesRows: [salesRow("2026-05", "ACME", 5000, "Casa")],
    discountRows: [{ month: "2026-06", cliente_norm: "ACME", canal: "Casa", subcanal: "", monto: -2000 }],
    target: {
      version_id: 9,
      version_number: 2,
      empresa: "Puebla",
      venta_ton: 12,
      row: { empresa: "Puebla", venta_ton: 12 },
    },
    forecast: {
      version_id: 3,
      version_number: 1,
      row: { empresa: "Puebla", venta_ton: 99 },
    },
    actions: { ok: true, summary: { open: 1, closed: 0, overdue: 0 }, top_overdue: [] },
    comments: [],
    limitations: [],
    ...over,
  };
}

function route(q) {
  const plan = planDirectorIaQuestion(q);
  const need = resolveExecutiveNeed(q);
  return {
    planner: plan.intent,
    monthClose: isMonthCloseQuestion(q),
    performance: isSalesTargetPerformanceQuestion(q),
    cel: shouldHandleExecutiveStatus(need, {}, plan.intent) === true,
    need: need.need_type || null,
  };
}

describe("IMPL performance sales target — routing", () => {
  it("preguntas explícitas de venta vs meta van a month_close_result, no a CEL", () => {
    for (const q of EXPLICIT_SALES_TARGET) {
      const r = route(q);
      assert.equal(r.planner, "month_close_result", q);
      assert.equal(r.monthClose, true, q);
      assert.equal(r.cel, false, q);
      assert.notEqual(r.need, NEED_TYPES.EXECUTIVE_STATUS, q);
    }
  });

  it("no crea intención planner paralela ni phrasebook", () => {
    assert.equal(/sales_target_performance|executive_performance/.test(PLANNER_SRC), false);
    assert.doesNotMatch(MONTH_CLOSE_SRC, /Superamos la meta de venta/);
    assert.doesNotMatch(MONTH_CLOSE_SRC, /arriba o abajo de la meta/);
  });

  it("¿Estamos cumpliendo? y ¿Vamos bien? no asumen venta", () => {
    for (const q of ["¿Estamos cumpliendo?", "¿Vamos bien?"]) {
      const r = route(q);
      assert.equal(r.monthClose, false, q);
      assert.equal(r.performance, false, q);
      assert.equal(r.planner, "unknown", q);
      assert.equal(r.cel, false, q);
    }
  });

  it("forecast, presupuesto e histórico no autorizan cumplimiento", () => {
    assert.equal(route("¿Estamos cumpliendo el forecast?").monthClose, false);
    assert.equal(route("¿Estamos dentro del presupuesto?").monthClose, false);
    assert.equal(route("¿Vamos mejor que el mes pasado?").monthClose, false);
    assert.equal(isSalesTargetPerformanceQuestion("¿Estamos cumpliendo el forecast?"), false);
    assert.equal(isSalesTargetPerformanceQuestion("¿Estamos dentro del presupuesto?"), false);
    assert.equal(isSalesTargetPerformanceQuestion("¿Vamos mejor que el mes pasado?"), false);
  });

  it("follow-ups de porcentaje/faltante heredan month_close", () => {
    assert.equal(isMonthCloseFollowUp("¿Qué porcentaje llevamos?"), true);
    assert.equal(isMonthCloseFollowUp("¿Cuánto nos falta?"), true);
    assert.equal(isMonthCloseFollowUp("¿Por qué?", "why"), true);
  });
});

describe("IMPL performance sales target — fórmula", () => {
  it("venta debajo de meta: % , faltante y vs_target=below", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.sales.actual_ton, 10);
    assert.equal(pack.sales.target_ton, 12);
    assert.equal(pack.sales.target_class, "TARGET_COMMITMENT");
    assert.equal(pack.sales.delta_ton, -2);
    assert.ok(Math.abs(pack.sales.attainment_pct - (10 / 12) * 100) < 1e-9);
    assert.equal(pack.sales.remaining_ton, 2);
    assert.equal(pack.sales.over_target_ton, 0);
    assert.equal(pack.sales.vs_target, "below");
    assert.equal(pack.provenance.target, "igf_meta.meta_lines");
    assert.notEqual(pack.sales.target_ton, 99);
  });

  it("venta exactamente en meta", () => {
    const pack = assembleMonthClosePack(
      packOpts({
        salesRows: [salesRow("2026-06", "ACME", 12000)],
        target: { version_id: 1, version_number: 1, empresa: "Puebla", venta_ton: 12, row: { venta_ton: 12 } },
      })
    );
    assert.equal(pack.sales.actual_ton, 12);
    assert.equal(pack.sales.attainment_pct, 100);
    assert.equal(pack.sales.remaining_ton, 0);
    assert.equal(pack.sales.over_target_ton, 0);
    assert.equal(pack.sales.vs_target, "at");
    assert.equal(pack.sales.delta_ton, 0);
  });

  it("venta por arriba de meta: exceso", () => {
    const pack = assembleMonthClosePack(
      packOpts({
        salesRows: [salesRow("2026-06", "ACME", 15000)],
        target: { version_id: 1, version_number: 1, empresa: "Puebla", venta_ton: 12, row: { venta_ton: 12 } },
      })
    );
    assert.equal(pack.sales.actual_ton, 15);
    assert.equal(pack.sales.attainment_pct, 125);
    assert.equal(pack.sales.remaining_ton, 0);
    assert.equal(pack.sales.over_target_ton, 3);
    assert.equal(pack.sales.vs_target, "above");
    assert.equal(pack.sales.delta_ton, 3);
  });

  it("TARGET_MISSING_FOR_PERIOD no afirma % ni cumplimiento", () => {
    const pack = assembleMonthClosePack(packOpts({ target: null }));
    assert.equal(pack.sales.target_status, "TARGET_MISSING_FOR_PERIOD");
    assert.equal(pack.sales.target_ton, null);
    assert.equal(pack.sales.attainment_pct, null);
    assert.equal(pack.sales.delta_ton, null);
    assert.equal(pack.sales.remaining_ton, null);
    assert.equal(pack.sales.over_target_ton, null);
    assert.equal(pack.sales.vs_target, null);
    assert.ok(pack.information_gaps.some((g) => g.kind === "TARGET_MISSING_FOR_PERIOD"));
    assert.equal(pack.sales.actual_ton, 10);
  });

  it("forecast del pack no se usa como meta", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.sales.target_ton, 12);
    assert.equal(pack.sales.target_class, "TARGET_COMMITMENT");
    assert.equal(pack.financial.forecast.truth_class, "FORECAST");
    assert.notEqual(pack.sales.target_ton, 99);
    assert.equal(pack.provenance.target, "igf_meta.meta_lines");
    assert.equal(pack.provenance.forecast, "igf.compromiso_lines");
  });
});

describe("IMPL performance sales target — aislamiento planta/periodo", () => {
  it("no cruza meta de otra planta", () => {
    const row = findIgfRowForPlant(
      [
        { empresa: "Acapulco", venta_ton: 40 },
        { empresa: "Puebla", venta_ton: 12 },
      ],
      "PUE",
      "Puebla"
    );
    assert.equal(row.empresa, "Puebla");
    assert.equal(row.venta_ton, 12);
  });

  it("loadTarget usa el YYYY-MM de la pregunta, no otro mes", async () => {
    const months = [];
    await loadMonthCloseResultForChat(
      {},
      1,
      { dashboardAuth: { role: "ZP" } },
      {
        now: new Date("2026-08-24T18:00:00-06:00"),
        question: "¿Estamos cumpliendo la meta de venta de 2026-06?",
        plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "PUE" },
        plantCodesUpper: ["PUE"],
        salesRows: [salesRow("2026-06", "ACME", 1000)],
        priorSalesRows: [],
        discountRows: [],
        loadTarget: async ({ year, month }) => {
          months.push(`${year}-${String(month).padStart(2, "0")}`);
          return {
            version_id: 1,
            version_number: 1,
            empresa: "Puebla",
            venta_ton: 12,
            row: { venta_ton: 12 },
          };
        },
        loadForecast: async () => ({ missing: true }),
        loadFinancialActual: async () => ({ ok: false, status: "UNSUPPORTED_METRIC" }),
        actions: { ok: true, summary: { open: 0, closed: 0, overdue: 0 }, top_overdue: [] },
      }
    );
    assert.deepEqual(months, ["2026-06"]);
  });

  it("junio no se compara contra meta de julio", () => {
    const now = new Date("2026-08-24T18:00:00-06:00");
    const june = resolveCloseMonth("¿Estamos cumpliendo la meta de venta de 2026-06?", {}, now);
    const july = resolveCloseMonth("¿Estamos cumpliendo la meta de venta de julio?", {}, now);
    assert.equal(june.month, 6);
    assert.equal(july.month, 7);
    assert.notEqual(`${june.year}-${june.month}`, `${july.year}-${july.month}`);
  });
});

describe("IMPL performance sales target — regresiones", () => {
  it("EXECUTIVE_STATUS de cómo vamos se conserva", () => {
    const r = route("¿Cómo vamos?");
    assert.equal(r.need, NEED_TYPES.EXECUTIVE_STATUS);
    assert.equal(r.cel, true);
    assert.equal(r.planner, "unknown");
  });

  it("daily_executive_brief de día nombrado se conserva", () => {
    assert.equal(isDailyExecutiveBriefQuestion("¿Cómo va el día de hoy?"), true);
    assert.equal(planDirectorIaQuestion("Dame el resumen de hoy").intent, "daily_executive_brief");
    assert.equal(isMonthCloseQuestion("Dame el resumen de hoy"), false);
  });

  it("month_close canónico no se rompe", () => {
    assert.equal(planDirectorIaQuestion("¿Cómo cerramos julio?").intent, "month_close_result");
    assert.equal(planDirectorIaQuestion("¿Cómo quedamos contra la meta?").intent, "month_close_result");
    assert.equal(planDirectorIaQuestion("¿Qué porcentaje cumplimos?").intent, "month_close_result");
  });
});
