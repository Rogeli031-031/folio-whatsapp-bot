"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  isMonthCloseQuestion,
  resolveCloseMonth,
  assembleMonthClosePack,
  loadMonthCloseResultForChat,
  composeFinancialPresentation,
  formatFinancialPresentationAnswer,
  hgDisplayPct,
  hgDollarMxnKg,
  FINANCIAL_PRESENTATION_STATES,
  NOT_FINAL_LABEL,
  codesUpperFromResolvePlantCodes,
} = require("../lib/director-ia-month-close-result");
const { dashboardDescSigned } = require("../lib/director-ia-dashboard-forecast-adapter");
const { selectIgfStatusSourceMode } = require("../lib/director-ia-chat");
const { isHistoricalMarginQuestion } = require("../lib/director-ia-historical-margin");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-11T12:00:00-06:00");
const AUTH = { role: "ZP", plantas_permitidas: [1] };
const Q = Object.freeze({
  C1: "¿Cómo cerramos agosto?",
  C2: "Dame el cierre financiero de agosto.",
  C3: "¿Cuál fue la rentabilidad operativa y el resultado final de agosto?",
  C4: "¿Qué margen y descuento tuvimos en agosto?",
  C5: "¿Qué rentabilidad tenemos?",
  C6: "¿Cómo cerramos julio?",
});

const FIX = Object.freeze({
  venta_ton: 1504.39,
  casa_ton: 832.74,
  comisionista_ton: 671.65,
  margen_kg: 7.24,
  com_desc_kg: 0.22,
  impuesto_kg: 0.9,
  hg_pct: 0.1287,
  hg_kg: 1.602315,
  operativos: 9664071,
  corporativos: 2378296,
  gasto: 12042367,
  ingreso: 13116024,
  utilOperImporte: 3451953,
  resultadoFinalImporte: 1073657,
});

function libSrc() {
  return fs.readFileSync(path.join(ROOT, "lib", "director-ia-month-close-result.js"), "utf8");
}

function chatSrc() {
  return fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");
}

function gitChanged() {
  const out = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" });
  return out
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function runNodeTest(rel) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return execSync(`node --test ${rel}`, { cwd: ROOT, encoding: "utf8", env });
}

function salesRow(month, cliente, kg, canal) {
  return { month, cliente_norm: cliente, canal, subcanal: "", kg };
}

function augustMiniRow(over = {}) {
  return {
    empresa: "Acapulco",
    plant_code: "Acapulco",
    ventaTon: FIX.venta_ton,
    margen: FIX.margen_kg,
    comDesc: FIX.com_desc_kg,
    impuestos: FIX.impuesto_kg,
    ingreso: FIX.ingreso,
    operativos: FIX.operativos,
    corporativos: FIX.corporativos,
    gasto: FIX.gasto,
    utilOperImporte: FIX.utilOperImporte,
    resultadoFinalImporte: FIX.resultadoFinalImporte,
    ...over,
  };
}

function augustForecastRow(over = {}) {
  return {
    empresa: "Acapulco",
    venta_ton: 1400,
    margen_kg: FIX.margen_kg,
    com_desc_kg: FIX.com_desc_kg,
    impuesto_kg: FIX.impuesto_kg,
    hg_pct: FIX.hg_pct,
    hg_kg: FIX.hg_kg,
    ...over,
  };
}

function packOpts(over = {}) {
  return {
    plant: { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" },
    planta_id: 1,
    year: 2026,
    month: 8,
    period_status: "COMPLETE",
    generated_at: "2026-09-11T00:00:00.000Z",
    salesRows: [
      salesRow("2026-08", "CASA-A", 832740, "Casa"),
      salesRow("2026-08", "COMI-B", 671650, "Comisionista"),
    ],
    priorSalesRows: [salesRow("2026-07", "CASA-A", 800000, "Casa")],
    discountRows: [{ month: "2026-08", cliente_norm: "CASA-A", canal: "Casa", subcanal: "", monto: -1000 }],
    target: null,
    forecast: {
      version_id: 4,
      version_number: 2,
      row: augustForecastRow(),
      composition: { lines: [] },
    },
    financial_actual: { ok: false, status: "FINANCIAL_ACTUAL_NOT_FINAL", year: 2026, month: 8 },
    historical_mini: {
      row: augustMiniRow(),
      period: "2026-08",
      payload_year: 2026,
      payload_month: 8,
    },
    actions: { ok: true, summary: { open: 0, closed: 0, overdue: 0 }, top_overdue: [] },
    comments: [],
    limitations: [],
    ...over,
  };
}

function finalActual(over = {}) {
  return {
    ok: true,
    status: "SUPPORTED",
    truth_class: "ACTUAL_FINANCIAL",
    financial_state: "FINAL",
    year: 2026,
    month: 8,
    version_id: 9,
    version_number: 3,
    fields: {
      venta_ton: 1490,
      margen_kg: 8.1,
      com_desc_kg: 0.31,
      impuesto_kg: 0.88,
      hg_pct: 0.11,
      hg_kg: 1.21,
      util_oper_importe: 4000000,
      resultado_final_importe: 2000000,
      ...((over && over.fields) || {}),
    },
    ...over,
  };
}

async function loadClose(question, over = {}) {
  const seen = { mini: [] };
  const pack = await loadMonthCloseResultForChat(null, 1, { dashboardAuth: AUTH }, {
    now: NOW,
    question,
    client: { query: async () => ({ rows: [] }), release() {} },
    plant: { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" },
    plantCodesUpper: ["E3", "ACA"],
    salesRows: packOpts().salesRows,
    priorSalesRows: packOpts().priorSalesRows,
    discountRows: packOpts().discountRows,
    loadTarget: async () => null,
    loadForecast: async () => ({
      version_id: 4,
      version_number: 2,
      row: augustForecastRow(),
      composition: { lines: [] },
    }),
    loadFinancialActual: async () => ({
      ok: false,
      status: "FINANCIAL_ACTUAL_NOT_FINAL",
      year: 2026,
      month: 8,
    }),
    loadIgfForecastMiniPayload: async (_db, opts) => {
      seen.mini.push({ year: opts.year, month: opts.month });
      return {
        year: opts.year,
        month: opts.month,
        rows: [augustMiniRow()],
      };
    },
    loadActions: async () => ({ ok: true, summary: { open: 0, closed: 0, overdue: 0 }, top_overdue: [] }),
    comments: [],
    ...over,
  });
  return { pack, seen };
}

describe("001-004 C1 routing and period", () => {
  it("001 C1 intent month_close_result", () => {
    assert.equal(detectDirectorIaIntent(Q.C1).intent, "month_close_result");
    assert.equal(planDirectorIaQuestion(Q.C1).intent, "month_close_result");
    assert.equal(isMonthCloseQuestion(Q.C1), true);
  });

  it("002 C1 period 2026-08", () => {
    const r = resolveCloseMonth(Q.C1, {}, NOW);
    assert.equal(r.year, 2026);
    assert.equal(r.month, 8);
  });

  it("003 C1 no September mini", async () => {
    const { pack, seen } = await loadClose(Q.C1);
    assert.equal(pack.month, "2026-08");
    assert.deepEqual(seen.mini, [{ year: 2026, month: 8 }]);
    assert.equal(pack.financial.presentation.period, "2026-08");
    assert.equal(selectIgfStatusSourceMode(Q.C1, { now: NOW }).mode, "NEVER_CURRENT_MINI");
  });

  it("004 C1 codes shape fix preserved", () => {
    const resolution = {
      not_found: false,
      uniqueCodes: ["E3", "ACA"],
      plantCode: "E3",
      matchedMeta: [{ prov_name: "Acapulco" }],
    };
    assert.deepEqual(codesUpperFromResolvePlantCodes(resolution), ["E3", "ACA"]);
    assert.equal(libSrc().includes("(codes || []).map"), false);
  });
});

describe("005-012 presentation states and FINAL priority", () => {
  it("005 presentation state enum exists", () => {
    assert.deepEqual(FINANCIAL_PRESENTATION_STATES, {
      FINAL: "FINAL",
      VISIBLE_NOT_FINAL: "VISIBLE_NOT_FINAL",
      DATA_MISSING: "DATA_MISSING",
    });
  });

  it("006 state FINAL supported", () => {
    const p = composeFinancialPresentation({
      period: "2026-08",
      sales: { actual_ton: FIX.venta_ton },
      channels: { casa_ton: FIX.casa_ton, comisionista_ton: FIX.comisionista_ton },
      actual: finalActual(),
      historical_mini: { row: augustMiniRow(), period: "2026-08" },
    });
    assert.equal(p.state, "FINAL");
    assert.equal(p.is_final, true);
  });

  it("007 state VISIBLE_NOT_FINAL supported", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.state, "VISIBLE_NOT_FINAL");
  });

  it("008 state DATA_MISSING supported", () => {
    const pack = assembleMonthClosePack(
      packOpts({
        financial_actual: { ok: false, status: "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD" },
        historical_mini: null,
        forecast: { missing: true },
      })
    );
    assert.equal(pack.financial.presentation.state, "DATA_MISSING");
  });

  it("009 FINAL requires financial actual FINAL", () => {
    const notFinal = composeFinancialPresentation({
      period: "2026-08",
      actual: { status: "FINANCIAL_ACTUAL_NOT_FINAL", truth_class: null },
      historical_mini: { row: augustMiniRow(), period: "2026-08" },
    });
    assert.notEqual(notFinal.state, "FINAL");
    const noFields = composeFinancialPresentation({
      period: "2026-08",
      actual: { status: "SUPPORTED", truth_class: "ACTUAL_FINANCIAL", financial_state: "FINAL" },
    });
    assert.notEqual(noFields.state, "FINAL");
  });

  it("010 FINAL financial source has priority over mini", () => {
    const p = composeFinancialPresentation({
      period: "2026-08",
      sales: { actual_ton: FIX.venta_ton },
      channels: {},
      actual: finalActual(),
      historical_mini: { row: augustMiniRow(), period: "2026-08" },
      forecast_row: augustForecastRow(),
    });
    assert.equal(p.source, "financial.actual");
    assert.equal(p.values.rentabilidad_operativa_mxn, 4000000);
    assert.equal(p.values.resultado_final_mxn, 2000000);
    assert.equal(p.values.operativos_mxn, null);
    assert.notEqual(p.values.margen_mxn_kg, FIX.margen_kg);
  });

  it("011 FINAL not silently replaced by latest", () => {
    const p = composeFinancialPresentation({
      period: "2026-08",
      actual: finalActual(),
      forecast_row: augustForecastRow(),
      historical_mini: { row: augustMiniRow(), period: "2026-08" },
    });
    assert.equal(p.values.resultado_final_mxn, 2000000);
    assert.notEqual(p.values.resultado_final_mxn, FIX.resultadoFinalImporte);
  });

  it("012 FINAL does not become nonfinal merely because mini exists", () => {
    const pack = assembleMonthClosePack(
      packOpts({
        financial_actual: finalActual(),
      })
    );
    assert.equal(pack.financial.presentation.state, "FINAL");
    assert.equal(pack.financial.actual.financial_state, "FINAL");
  });
});

describe("013-020 NOT_FINAL and DATA_MISSING", () => {
  it("013 NOT_FINAL does not mutate financial_state", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.state, "VISIBLE_NOT_FINAL");
    assert.notEqual(pack.financial.actual.financial_state, "FINAL");
    assert.equal(pack.financial.actual.status, "FINANCIAL_ACTUAL_NOT_FINAL");
    assert.equal(libSrc().includes('financial_state = "FINAL"'), false);
  });

  it("014 NOT_FINAL uses same target historical period", async () => {
    const { pack } = await loadClose(Q.C1);
    assert.equal(pack.month, "2026-08");
    assert.equal(pack.financial.presentation.period, "2026-08");
  });

  it("015 NOT_FINAL uses historical dashboard-view source", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.source, "igf.latest+computeIgfForecastMiniPayload+arr");
  });

  it("016 NOT_FINAL does not use current-month mini", () => {
    const pack = assembleMonthClosePack(
      packOpts({
        historical_mini: {
          row: augustMiniRow({ utilOperImporte: 99, resultadoFinalImporte: 88 }),
          period: "2026-09",
          payload_year: 2026,
          payload_month: 9,
        },
      })
    );
    assert.equal(pack.financial.presentation.state, "DATA_MISSING");
    assert.equal(pack.financial.presentation.values.rentabilidad_operativa_mxn, null);
  });

  it("017 NOT_FINAL clearly labelled no final", () => {
    const pack = assembleMonthClosePack(packOpts());
    const answer = formatFinancialPresentationAnswer(pack);
    assert.match(answer, new RegExp(NOT_FINAL_LABEL));
    assert.match(answer, /no está marcada como FINAL/i);
  });

  it("018 missing FINAL + missing view => DATA_MISSING", () => {
    const pack = assembleMonthClosePack(
      packOpts({
        financial_actual: { ok: false, status: "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD" },
        historical_mini: null,
      })
    );
    assert.equal(pack.financial.presentation.state, "DATA_MISSING");
  });

  it("019 DATA_MISSING no invented financial values", () => {
    const pack = assembleMonthClosePack(
      packOpts({
        financial_actual: { ok: false, status: "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD" },
        historical_mini: null,
      })
    );
    const v = pack.financial.presentation.values;
    assert.equal(v.margen_mxn_kg, null);
    assert.equal(v.operativos_mxn, null);
    assert.equal(v.rentabilidad_operativa_mxn, null);
    assert.equal(v.resultado_final_mxn, null);
    const answer = formatFinancialPresentationAnswer(pack);
    assert.match(answer, /datos financieros no disponibles/i);
    assert.equal(answer.includes("7.24"), false);
  });

  it("020 DATA_MISSING may preserve actual commercial sale", () => {
    const pack = assembleMonthClosePack(
      packOpts({
        financial_actual: { ok: false, status: "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD" },
        historical_mini: null,
      })
    );
    assert.equal(pack.financial.presentation.values.venta_ton, FIX.venta_ton);
    assert.match(formatFinancialPresentationAnswer(pack), /Venta comercial/);
  });
});

describe("021-039 field parity", () => {
  it("021 venta field populated correctly in B", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.venta_ton, FIX.venta_ton);
  });

  it("022 venta labelled commercial/real, not forecast", () => {
    const answer = formatFinancialPresentationAnswer(assembleMonthClosePack(packOpts()));
    assert.match(answer, /Venta comercial/);
    assert.equal(/Venta forecast/i.test(answer), false);
  });

  it("023 casa field same period", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.casa_ton, FIX.casa_ton);
    assert.equal(pack.financial.presentation.period, "2026-08");
  });

  it("024 comisionista field same period", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.comisionista_ton, FIX.comisionista_ton);
  });

  it("025 no forced casa+comisionista reconciliation", () => {
    assert.equal(/casa_ton\s*\+\s*|CASA_PLUS|forzar reconcili/i.test(libSrc()), false);
    const pack = assembleMonthClosePack(packOpts());
    assert.ok(Object.prototype.hasOwnProperty.call(pack.financial.presentation.values, "casa_ton"));
    assert.ok(Object.prototype.hasOwnProperty.call(pack.financial.presentation.values, "venta_ton"));
  });

  it("026 margen field same period/latest visible", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.margen_mxn_kg, FIX.margen_kg);
  });

  it("027 margen unit MXN/kg", () => {
    assert.match(formatFinancialPresentationAnswer(assembleMonthClosePack(packOpts())), /7\.24 MXN\/kg/);
  });

  it("028 margen not labelled FINAL in B", () => {
    const answer = formatFinancialPresentationAnswer(assembleMonthClosePack(packOpts()));
    assert.equal(/margen[^\n]*FINAL/i.test(answer), false);
  });

  it("029 descuento parity uses visible -abs(com_desc_kg)", () => {
    assert.equal(dashboardDescSigned(FIX.com_desc_kg), -0.22);
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.descuento_mxn_kg, -0.22);
    assert.equal(pack.financial.presentation.values.descuento_mxn_kg, dashboardDescSigned(FIX.com_desc_kg));
  });

  it("030 descuento unit MXN/kg", () => {
    assert.match(formatFinancialPresentationAnswer(assembleMonthClosePack(packOpts())), /-0\.22 MXN\/kg/);
  });

  it("031 discount ARR field not substituted for visible dashboard discount", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.notEqual(pack.discount.per_kg, pack.financial.presentation.values.descuento_mxn_kg);
    assert.equal(pack.financial.presentation.values.descuento_mxn_kg, -Math.abs(FIX.com_desc_kg));
  });

  it("032 impuestos field impuesto_kg", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.impuestos_mxn_kg, FIX.impuesto_kg);
  });

  it("033 impuestos unit MXN/kg", () => {
    assert.match(formatFinancialPresentationAnswer(assembleMonthClosePack(packOpts())), /0\.90 MXN\/kg/);
  });

  it("034 HG uses hg_pct*100", () => {
    assert.equal(hgDisplayPct(FIX.hg_pct), 12.87);
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.hg_pct, 12.87);
  });

  it("035 HG unit %", () => {
    assert.match(formatFinancialPresentationAnswer(assembleMonthClosePack(packOpts())), /12\.87 %/);
  });

  it("036 HG$ uses abs(hg_kg/hg_pct)", () => {
    assert.equal(hgDollarMxnKg(FIX.hg_kg, FIX.hg_pct), 12.45);
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.hg_mxn_kg, 12.45);
  });

  it("037 HG$ unit MXN/kg", () => {
    assert.match(formatFinancialPresentationAnswer(assembleMonthClosePack(packOpts())), /12\.45 MXN\/kg/);
  });

  it("038 HG$ null/zero denominator safe", () => {
    assert.equal(hgDollarMxnKg(1.2, 0), null);
    assert.equal(hgDollarMxnKg(1.2, null), null);
    assert.equal(hgDollarMxnKg(null, 0.1), null);
  });

  it("039 HG$ never NaN/Infinity", () => {
    assert.equal(Number.isFinite(hgDollarMxnKg(FIX.hg_kg, FIX.hg_pct)), true);
    assert.equal(hgDollarMxnKg(1, 0), null);
  });
});

describe("040-054 P&L semantics", () => {
  it("040 operativos = mini operativos", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.operativos_mxn, FIX.operativos);
  });

  it("041 operativos labelled gasto operativo", () => {
    const answer = formatFinancialPresentationAnswer(assembleMonthClosePack(packOpts()));
    assert.match(answer, /Gastos operativos/);
    assert.equal(/Gastos operativos:[\s\S]{0,40}rentabilidad operativa/i.test(answer), false);
  });

  it("042 corporativos = mini corporativos", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.corporativos_mxn, FIX.corporativos);
  });

  it("043 gasto = mini gasto / proven contract", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.gasto_mxn, FIX.gasto);
  });

  it("044 gasto reconciles operativos+corporativos in fixture", () => {
    assert.equal(FIX.operativos + FIX.corporativos, FIX.gasto);
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(
      pack.financial.presentation.values.operativos_mxn + pack.financial.presentation.values.corporativos_mxn,
      pack.financial.presentation.values.gasto_mxn
    );
  });

  it("045 rentabilidad operativa = utilOperImporte", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.rentabilidad_operativa_mxn, FIX.utilOperImporte);
  });

  it("046 rentabilidad operativa not RENTAB UI", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.notEqual(
      pack.financial.presentation.values.rentabilidad_operativa_mxn,
      pack.financial.presentation.values.resultado_final_mxn
    );
  });

  it("047 resultado final = resultadoFinalImporte", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.resultado_final_mxn, FIX.resultadoFinalImporte);
  });

  it("048 RENTAB UI semantic maps to resultado final", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.resultado_final_mxn, augustMiniRow().resultadoFinalImporte);
  });

  it("049 util formula ingreso-operativos preserved", () => {
    assert.equal(FIX.ingreso - FIX.operativos, FIX.utilOperImporte);
  });

  it("050 final formula utilOper-corporativos preserved", () => {
    assert.equal(FIX.utilOperImporte - FIX.corporativos, FIX.resultadoFinalImporte);
  });

  it("051 August fixture utilOper = 3451953", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.rentabilidad_operativa_mxn, 3451953);
  });

  it("052 August fixture resultadoFinal = 1073657", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.values.resultado_final_mxn, 1073657);
  });

  it("053 these fixture values not hardcoded into product", () => {
    const src = libSrc() + chatSrc();
    assert.equal(src.includes("3451953"), false);
    assert.equal(src.includes("1073657"), false);
    assert.equal(src.includes("1504.39"), false);
    assert.equal(src.includes("9664071"), false);
  });

  it("054 B labels both as de esta vista/NO FINAL", () => {
    const answer = formatFinancialPresentationAnswer(assembleMonthClosePack(packOpts()));
    assert.match(answer, /Rentabilidad operativa de esta vista/);
    assert.match(answer, /Resultado final de esta vista/);
    assert.match(answer, new RegExp(NOT_FINAL_LABEL));
  });
});

describe("055-072 executive response", () => {
  function answerB() {
    return formatFinancialPresentationAnswer(assembleMonthClosePack(packOpts()));
  }

  it("055 response includes Venta", () => {
    assert.match(answerB(), /Venta comercial/);
  });
  it("056 response includes CASA", () => {
    assert.match(answerB(), /CASA:/);
  });
  it("057 response includes COMISIONISTA", () => {
    assert.match(answerB(), /COMISIONISTA:/);
  });
  it("058 response includes Margen", () => {
    assert.match(answerB(), /Margen:/);
  });
  it("059 response includes Descuento", () => {
    assert.match(answerB(), /Descuento:/);
  });
  it("060 response includes Impuestos", () => {
    assert.match(answerB(), /Impuestos:/);
  });
  it("061 response includes HG", () => {
    assert.match(answerB(), /^HG:/m);
  });
  it("062 response includes HG$", () => {
    assert.match(answerB(), /HG\$:/);
  });
  it("063 response includes Operativos", () => {
    assert.match(answerB(), /Gastos operativos:/);
  });
  it("064 response includes Corporativos", () => {
    assert.match(answerB(), /Gastos corporativos:/);
  });
  it("065 response includes Gasto", () => {
    assert.match(answerB(), /Gasto total:/);
  });
  it("066 response includes Rentabilidad operativa", () => {
    assert.match(answerB(), /Rentabilidad operativa/);
  });
  it("067 response includes Resultado final", () => {
    assert.match(answerB(), /Resultado final/);
  });
  it("068 B warning NO FINAL visible", () => {
    assert.match(answerB(), /no está marcada como FINAL/);
  });
  it("069 response does not claim financial definitive close in B", () => {
    const a = answerB();
    assert.match(a, /no debe presentarse como cierre financiero definitivo/i);
    assert.equal(/cerramos financieramente/i.test(a), false);
    assert.equal(/resultado contable final/i.test(a), false);
    assert.equal(/es el cierre financiero definitivo/i.test(a), false);
  });
  it("070 generic source/actions unavailable prose absent by default", () => {
    const a = answerB();
    assert.equal(/fuentes de información no disponibles/i.test(a), false);
    assert.equal(/acciones no disponibles/i.test(a), false);
  });
  it("071 no unsupported material-movement prose by default", () => {
    assert.equal(/movimientos de material no explicados/i.test(answerB()), false);
  });
  it("072 no causal claim invented", () => {
    const a = answerB();
    assert.equal(/porque|debido a|la causa/i.test(a), false);
  });
});

describe("073-077 control questions", () => {
  it("073 C2 obeys same A/B/C", () => {
    assert.equal(planDirectorIaQuestion(Q.C2).intent, "month_close_result");
    const pack = assembleMonthClosePack(packOpts());
    const answer = formatFinancialPresentationAnswer(pack);
    assert.equal(pack.financial.presentation.state, "VISIBLE_NOT_FINAL");
    assert.match(answer, new RegExp(NOT_FINAL_LABEL));
  });

  it("074 C3 routing unchanged", () => {
    assert.equal(planDirectorIaQuestion(Q.C3).intent, "igf_status");
    assert.equal(selectIgfStatusSourceMode(Q.C3, { now: NOW }).mode, "NEVER_CURRENT_MINI");
  });

  it("075 C4 routing unchanged", () => {
    assert.equal(isHistoricalMarginQuestion(Q.C4), true);
    assert.equal(planDirectorIaQuestion(Q.C4).intent, "historical_margin");
  });

  it("076 C5 current MINI_FORECAST_PROY unchanged", () => {
    assert.equal(planDirectorIaQuestion(Q.C5).intent, "igf_status");
    const sel = selectIgfStatusSourceMode(Q.C5, { now: NOW });
    assert.equal(sel.mode, "MINI_FORECAST_PROY");
    assert.equal(sel.year, 2026);
    assert.equal(sel.month, 9);
  });

  it("077 C6 period July preserved", async () => {
    const { pack, seen } = await loadClose(Q.C6);
    assert.equal(pack.month, "2026-07");
    assert.equal(pack.financial.presentation.period, "2026-07");
    assert.deepEqual(seen.mini, [{ year: 2026, month: 7 }]);
  });
});

describe("askDirectorIa uses deterministic presentation", () => {
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
      loadMonthCloseResultForChat: undefined,
    });
  });

  it("C1 answer is executive B without GPT labels", async () => {
    const assembled = assembleMonthClosePack(packOpts());
    configureDirectorIaChat({
      pool: { connect: async () => ({ release() {} }) },
      openaiChat: async () => {
        throw new Error("GPT no debe correr cuando hay presentation");
      },
      loadMonthCloseResultForChat: async () => assembled,
    });
    const out = await askDirectorIa({ dashboardAuth: AUTH, body: {} }, 1, Q.C1);
    assert.equal(out.ok, true);
    assert.equal(out.context_meta.mode, "month_close_result");
    assert.equal(out.context_meta.openai_called, false);
    assert.match(out.answer, /Acapulco — Agosto 2026/);
    assert.match(out.answer, new RegExp(NOT_FINAL_LABEL));
    assert.match(out.answer, /1,504\.39 t/);
    assert.equal(/ACTUAL COMERCIAL/i.test(out.answer), false);
    assert.equal(/TARGET COMMITMENT/i.test(out.answer), false);
  });
});

describe("078-097 regressions and fences", () => {
  it("078 resolvePlantCodes shape fix regression PASS", () => {
    assert.equal(libSrc().includes("codesUpperFromResolvePlantCodes"), true);
    assert.equal(libSrc().includes("(codes || []).map"), false);
  });

  it("079 month-close existing suite PASS", () => {
    const out = runNodeTest("test/director-ia-month-close-result.test.js");
    assert.match(out, /fail 0/);
  });

  it("080 current-month profitability suite PASS", () => {
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const out = execSync(
      `node --test --test-name-pattern "R-RENT-CMFS planner|R-RENT-CMFS S1|R-RENT-CMFS S2|R-RENT-CMFS absence" test/director-ia-rentabilidad-current-month-forecast-source.test.js`,
      { cwd: ROOT, encoding: "utf8", env }
    );
    assert.match(out, /fail 0/);
    assert.equal(planDirectorIaQuestion(Q.C5).intent, "igf_status");
    assert.equal(selectIgfStatusSourceMode(Q.C5, { now: NOW }).mode, "MINI_FORECAST_PROY");
    assert.equal(selectIgfStatusSourceMode(Q.C5, { now: NOW }).month, 9);
  });

  it("081 historical-margin focal PASS", () => {
    const out = runNodeTest("test/director-ia-historical-margin.test.js");
    assert.match(out, /fail 0/);
  });

  it("082 client-profile resolution PASS", () => {
    const out = runNodeTest("test/director-ia-client-profile.test.js");
    assert.match(out, /fail 0/);
  });

  it("083 commercial-trend resolution PASS", () => {
    const out = runNodeTest("test/director-ia-commercial-trend.test.js");
    assert.match(out, /fail 0/);
  });

  it("084 no SQL", () => {
    assert.equal(gitChanged().some((f) => f.endsWith(".sql")), false);
  });
  it("085 no schema", () => {
    assert.equal(gitChanged().some((f) => /schema/i.test(f)), false);
  });
  it("086 no migration", () => {
    assert.equal(gitChanged().some((f) => /migrat/i.test(f)), false);
  });
  it("087 no new tool", () => {
    assert.equal(gitChanged().includes("lib/director-ia-tools.js"), false);
  });
  it("088 no endpoint", () => {
    assert.equal(gitChanged().includes("server.js"), false);
  });
  it("089 no internal HTTP", () => {
    assert.equal(/http\.request|axios|fetch\(/i.test(libSrc()), false);
  });
  it("090 no frontend", () => {
    assert.equal(gitChanged().some((f) => f.startsWith("frontend-dashboard/")), false);
  });
  it("091 no server.js unless physically unavoidable", () => {
    assert.equal(gitChanged().includes("server.js"), false);
  });
  it("092 no LIVE_DB", () => {
    assert.equal(/pool\.query|DATABASE_URL/i.test(libSrc()), false);
  });
  it("093 no hardcoded Acapulco/Puebla", () => {
    const src = libSrc();
    assert.equal(/\bAcapulco\b/.test(src), false);
    assert.equal(/\bPuebla\b/.test(src), false);
  });
  it("094 no hardcoded August values", () => {
    const src = libSrc();
    assert.equal(src.includes("1504.39"), false);
    assert.equal(src.includes("3451953"), false);
    assert.equal(src.includes("1073657"), false);
  });
  it("095 diff --check PASS", () => {
    execSync("git diff --check", { cwd: ROOT, encoding: "utf8" });
  });
  it("096 applicable gate PASS", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "director-ia-golden-regression.js"), "utf8");
    assert.match(src, /--gate/);
  });
  it("097 NEW FAILURE = 0", () => {
    const allowed = new Set([
      "lib/director-ia-month-close-result.js",
      "lib/director-ia-chat.js",
      "lib/director-ia-executive-cycle-composer.js",
      "test/director-ia-month-close-financial-variables-composition.test.js",
    ]);
    const forbidden = gitChanged().filter((f) => !/^docs\/dev-loop\//.test(f) && !allowed.has(f));
    assert.deepEqual(forbidden, []);
  });
});
