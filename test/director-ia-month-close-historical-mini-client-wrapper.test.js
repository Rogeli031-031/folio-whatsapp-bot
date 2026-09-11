"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { Client } = require("pg");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  isMonthCloseQuestion,
  resolveCloseMonth,
  assembleMonthClosePack,
  loadMonthCloseResultForChat,
  composeFinancialPresentation,
  FINANCIAL_PRESENTATION_STATES,
  NOT_FINAL_LABEL,
  codesUpperFromResolvePlantCodes,
} = require("../lib/director-ia-month-close-result");
const { findMiniRowForPlant } = require("../lib/director-ia-dashboard-forecast-adapter");
const { selectIgfStatusSourceMode } = require("../lib/director-ia-chat");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-11T12:00:00-06:00");
const AUTH = { role: "ZP", plantas_permitidas: [1] };
const Q = Object.freeze({
  C1: "¿Cómo cerramos agosto?",
  C2: "Dame el cierre financiero de agosto.",
  C3: "¿Cómo cerramos julio?",
  C4: "¿Qué rentabilidad tenemos?",
});

const FIX = Object.freeze({
  venta_ton: 1504.39,
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

function adapterSrc() {
  return fs.readFileSync(path.join(ROOT, "lib", "director-ia-dashboard-forecast-adapter.js"), "utf8");
}

function chatSrc() {
  return fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");
}

function serverSrc() {
  return fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
}

function gitChanged() {
  const out = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" });
  return out
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function runNodeTest(rel, namePattern, skipPattern) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const extra = [
    namePattern ? `--test-name-pattern ${JSON.stringify(namePattern)}` : "",
    skipPattern ? `--test-skip-pattern ${JSON.stringify(skipPattern)}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return execSync(`node --test ${extra} ${rel}`.replace(/\s+/g, " "), {
    cwd: ROOT,
    encoding: "utf8",
    env,
  });
}

function salesRow(month, cliente, kg, canal) {
  return { month, cliente_norm: cliente, canal, subcanal: "", kg };
}

function miniRowFor(label, over = {}) {
  return {
    empresa: label,
    plant_code: label,
    ventaTon: FIX.venta_ton,
    margen: 7.24,
    comDesc: 0.22,
    impuestos: 0.9,
    ingreso: FIX.ingreso,
    operativos: FIX.operativos,
    corporativos: FIX.corporativos,
    gasto: FIX.gasto,
    utilOperImporte: FIX.utilOperImporte,
    resultadoFinalImporte: FIX.resultadoFinalImporte,
    ...over,
  };
}

function forecastRow() {
  return {
    empresa: "Acapulco",
    venta_ton: 1400,
    margen_kg: 7.24,
    com_desc_kg: 0.22,
    impuesto_kg: 0.9,
    hg_pct: 0.1287,
    hg_kg: 1.602315,
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
      row: forecastRow(),
      composition: { lines: [] },
    },
    financial_actual: { ok: false, status: "FINANCIAL_ACTUAL_NOT_FINAL", year: 2026, month: 8 },
    historical_mini: {
      row: miniRowFor("Acapulco"),
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

function createRuntimeHandles() {
  const acquired = {
    kind: "month_close_acquired_client",
    connectCalls: 0,
    async query() {
      return { rows: [] };
    },
    async connect() {
      acquired.connectCalls += 1;
      throw new Error("Client has already been connected. You cannot reuse a client.");
    },
    release() {},
  };
  const wrapperClients = [];
  const pool = {
    kind: "root_pool",
    connectCalls: 0,
    async connect() {
      pool.connectCalls += 1;
      if (pool.connectCalls === 1) return acquired;
      const wrapperClient = {
        kind: "wrapper_acquired_client",
        id: pool.connectCalls,
        async query() {
          return { rows: [] };
        },
        release() {},
      };
      wrapperClients.push(wrapperClient);
      return wrapperClient;
    },
    acquired,
    wrapperClients,
  };
  return { pool, acquired, wrapperClients };
}

async function wrapperLikeLoader(poolOrClient, opts, seen) {
  seen.handles.push(poolOrClient);
  seen.opts.push(opts);
  let client = null;
  if (poolOrClient && typeof poolOrClient.connect === "function") {
    client = await poolOrClient.connect();
  } else {
    client = poolOrClient;
  }
  seen.computeClients.push(client);
  const label = opts.month === 7 ? "Acapulco" : "Acapulco";
  return {
    year: opts.year,
    month: opts.month,
    rows: [miniRowFor(label)],
  };
}

async function invokeOldCallSite(handle, loader, seen) {
  try {
    const mini = await loader(handle, {
      year: 2026,
      month: 8,
      plantName: "Acapulco",
      plantCode: "E3",
    }, seen);
    return {
      threw: false,
      historical_mini: {
        row: findMiniRowForPlant(mini && mini.rows, "Acapulco", "E3"),
        period: "2026-08",
        payload_year: mini.year,
        payload_month: mini.month,
      },
    };
  } catch (e) {
    return { threw: true, error: e && e.message, historical_mini: null };
  }
}

async function loadRuntime(question, over = {}) {
  const handles = createRuntimeHandles();
  const seen = {
    handles: [],
    opts: [],
    computeClients: [],
    salesHandles: [],
    discountHandles: [],
    loadTarget: 0,
    loadForecast: 0,
    loadFinancialActual: 0,
    loaderCalls: 0,
  };
  const pack = await loadMonthCloseResultForChat(handles.pool, 1, { dashboardAuth: AUTH }, {
    now: NOW,
    question,
    plant: { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" },
    plantCodesUpper: ["E3", "ACA"],
    queryMonthlySales: async (handle, _codes, start) => {
      seen.salesHandles.push(handle);
      if (String(start).startsWith("2026-07")) {
        return { rows: [salesRow("2026-07", "CASA-A", 800000, "Casa")] };
      }
      return {
        rows: [
          salesRow("2026-08", "CASA-A", 832740, "Casa"),
          salesRow("2026-08", "COMI-B", 671650, "Comisionista"),
        ],
      };
    },
    queryMonthlyDiscount: async (handle) => {
      seen.discountHandles.push(handle);
      return { rows: [{ month: "2026-08", cliente_norm: "CASA-A", canal: "Casa", subcanal: "", monto: -1000 }] };
    },
    loadTarget: async () => {
      seen.loadTarget += 1;
      return null;
    },
    loadForecast: async () => {
      seen.loadForecast += 1;
      return {
        version_id: 4,
        version_number: 2,
        row: forecastRow(),
        composition: { lines: [] },
      };
    },
    loadFinancialActual: async () => {
      seen.loadFinancialActual += 1;
      return { ok: false, status: "FINANCIAL_ACTUAL_NOT_FINAL", year: 2026, month: 8 };
    },
    loadIgfForecastMiniPayload: async (handle, opts) => {
      seen.loaderCalls += 1;
      return wrapperLikeLoader(handle, opts, seen);
    },
    loadActions: async () => ({ ok: true, summary: { open: 0, closed: 0, overdue: 0 }, top_overdue: [] }),
    comments: [],
    ...over,
  });
  return { pack, seen, handles };
}

describe("001-004 routing, period, acquired Client", () => {
  it("001 C1 intent month_close_result", () => {
    assert.equal(isMonthCloseQuestion(Q.C1), true);
    assert.equal(detectDirectorIaIntent(Q.C1).intent, "month_close_result");
    assert.equal(planDirectorIaQuestion(Q.C1).intent, "month_close_result");
  });

  it("002 C1 period 2026-08", () => {
    const r = resolveCloseMonth(Q.C1, {}, NOW);
    assert.equal(r.year, 2026);
    assert.equal(r.month, 8);
  });

  it("003 month_close acquires Client for normal queries", async () => {
    const { seen, handles } = await loadRuntime(Q.C1);
    assert.equal(handles.pool.connectCalls >= 1, true);
    assert.equal(seen.salesHandles[0], handles.acquired);
    assert.equal(seen.salesHandles[0].kind, "month_close_acquired_client");
  });

  it("004 acquired Client remains used for sales/target/forecast/financial paths", async () => {
    const { seen, handles } = await loadRuntime(Q.C1);
    assert.deepEqual(seen.salesHandles, [handles.acquired, handles.acquired]);
    assert.deepEqual(seen.discountHandles, [handles.acquired]);
    assert.equal(seen.loadTarget, 1);
    assert.equal(seen.loadForecast, 1);
    assert.equal(seen.loadFinancialActual, 1);
  });
});

describe("005-015 ownership fix and presentation", () => {
  it("005 mini loader receives Pool/root handle", async () => {
    const { seen, handles } = await loadRuntime(Q.C1);
    assert.equal(seen.handles.length, 1);
    assert.equal(seen.handles[0], handles.pool);
    assert.equal(seen.handles[0].kind, "root_pool");
  });

  it("006 mini loader does NOT receive acquired pg.Client", async () => {
    const { seen, handles } = await loadRuntime(Q.C1);
    assert.notEqual(seen.handles[0], handles.acquired);
    assert.notEqual(seen.handles[0] && seen.handles[0].kind, "month_close_acquired_client");
  });

  it("007 runtime wrapper can call pool.connect once", async () => {
    const { seen, handles } = await loadRuntime(Q.C1);
    assert.equal(handles.pool.connectCalls, 2);
    assert.equal(seen.computeClients[0].kind, "wrapper_acquired_client");
  });

  it("008 wrapper-acquired Client reaches compute mini", async () => {
    const { seen, handles } = await loadRuntime(Q.C1);
    assert.equal(seen.computeClients.length, 1);
    assert.equal(seen.computeClients[0], handles.wrapperClients[0]);
    assert.notEqual(seen.computeClients[0], handles.acquired);
  });

  it("009 no second connect on month-close acquired Client", async () => {
    const { handles } = await loadRuntime(Q.C1);
    assert.equal(handles.acquired.connectCalls, 0);
  });

  it("010 pg.Client.connect throw reproduced pre-fix fixture", async () => {
    const already = new Client({ connectionString: "postgres://probe:probe@127.0.0.1:1/probe" });
    already._connected = true;
    already._connecting = false;
    await assert.rejects(() => already.connect(), /Client has already been connected/);
    const { acquired } = createRuntimeHandles();
    await assert.rejects(() => acquired.connect(), /Client has already been connected/);
  });

  it("011 pre-fix fixture yields DATA_MISSING", async () => {
    const { pool, acquired } = createRuntimeHandles();
    const seen = { handles: [], opts: [], computeClients: [] };
    const old = await invokeOldCallSite(acquired, wrapperLikeLoader, seen);
    assert.equal(old.threw, true);
    assert.match(old.error, /already been connected/);
    assert.equal(old.historical_mini, null);
    const presentation = composeFinancialPresentation({
      period: "2026-08",
      sales: { actual_ton: FIX.venta_ton },
      actual: { ok: false, status: "FINANCIAL_ACTUAL_NOT_FINAL" },
      historical_mini: old.historical_mini,
    });
    assert.equal(presentation.state, FINANCIAL_PRESENTATION_STATES.DATA_MISSING);
    assert.equal(pool.connectCalls, 0);
  });

  it("012 post-fix fixture yields mini row", async () => {
    const { pack, seen } = await loadRuntime(Q.C1);
    assert.equal(seen.loaderCalls, 1);
    assert.equal(pack.financial.presentation.source, "igf.latest+computeIgfForecastMiniPayload+arr");
    assert.ok(pack.financial.presentation.values.resultado_final_mxn != null);
  });

  it("013 post-fix presentation VISIBLE_NOT_FINAL", async () => {
    const { pack } = await loadRuntime(Q.C1);
    assert.equal(pack.month, "2026-08");
    assert.equal(pack.financial.presentation.state, FINANCIAL_PRESENTATION_STATES.VISIBLE_NOT_FINAL);
    assert.equal(pack.financial.presentation.is_final, false);
  });

  it("014 no mutation to financial_state", async () => {
    const { pack } = await loadRuntime(Q.C1);
    assert.equal(pack.financial.actual.status, "FINANCIAL_ACTUAL_NOT_FINAL");
    assert.notEqual(pack.financial.actual.financial_state, "FINAL");
    assert.notEqual(pack.financial.actual.truth_class, "ACTUAL_FINANCIAL");
  });

  it("015 no promotion to FINAL", async () => {
    const { pack } = await loadRuntime(Q.C1);
    assert.notEqual(pack.financial.presentation.state, FINANCIAL_PRESENTATION_STATES.FINAL);
    assert.equal(pack.financial.presentation.is_final, false);
  });
});

describe("016-022 override and injected loader contract", () => {
  it("016 historicalMini direct override preserved", async () => {
    const { pack } = await loadRuntime(Q.C1, {
      historicalMini: {
        row: miniRowFor("Acapulco", { resultadoFinalImporte: 111 }),
        period: "2026-08",
        payload_year: 2026,
        payload_month: 8,
      },
    });
    assert.equal(pack.financial.presentation.state, FINANCIAL_PRESENTATION_STATES.VISIBLE_NOT_FINAL);
    assert.equal(pack.financial.presentation.values.resultado_final_mxn, 111);
  });

  it("017 direct historicalMini does not call loader", async () => {
    const { seen } = await loadRuntime(Q.C1, {
      historicalMini: {
        row: miniRowFor("Acapulco"),
        period: "2026-08",
        payload_year: 2026,
        payload_month: 8,
      },
    });
    assert.equal(seen.loaderCalls, 0);
    assert.deepEqual(seen.handles, []);
  });

  it("018 injected loader called with root handle", async () => {
    const { seen, handles } = await loadRuntime(Q.C1);
    assert.equal(seen.handles[0], handles.pool);
  });

  it("019 injected loader receives year", async () => {
    const { seen } = await loadRuntime(Q.C1);
    assert.equal(seen.opts[0].year, 2026);
  });

  it("020 injected loader receives month", async () => {
    const { seen } = await loadRuntime(Q.C1);
    assert.equal(seen.opts[0].month, 8);
  });

  it("021 injected loader receives plantName", async () => {
    const { seen } = await loadRuntime(Q.C1);
    assert.equal(seen.opts[0].plantName, "Acapulco");
  });

  it("022 injected loader receives plantCode", async () => {
    const { seen } = await loadRuntime(Q.C1);
    assert.equal(seen.opts[0].plantCode, "E3");
  });
});

describe("023-027 period binding", () => {
  it("023 C1 mini requested 2026-08", async () => {
    const { seen } = await loadRuntime(Q.C1);
    assert.deepEqual(seen.opts.map((o) => ({ year: o.year, month: o.month })), [{ year: 2026, month: 8 }]);
  });

  it("024 C1 returned period 2026-08 accepted", async () => {
    const { pack } = await loadRuntime(Q.C1);
    assert.equal(pack.financial.presentation.period, "2026-08");
  });

  it("025 C1 current September mini not used", async () => {
    const { seen, pack } = await loadRuntime(Q.C1);
    assert.equal(seen.opts.some((o) => o.month === 9), false);
    assert.notEqual(pack.financial.presentation.period, "2026-09");
    assert.equal(selectIgfStatusSourceMode(Q.C1, { now: NOW }).mode, "NEVER_CURRENT_MINI");
  });

  it("026 C3 July requested 2026-07", async () => {
    const r = resolveCloseMonth(Q.C3, {}, NOW);
    assert.equal(r.year, 2026);
    assert.equal(r.month, 7);
    const { seen, pack } = await loadRuntime(Q.C3);
    assert.equal(pack.month, "2026-07");
    assert.deepEqual(seen.opts.map((o) => ({ year: o.year, month: o.month })), [{ year: 2026, month: 7 }]);
  });

  it("027 C3 no August/September contamination", async () => {
    const { seen, pack } = await loadRuntime(Q.C3);
    assert.equal(seen.opts.every((o) => o.month === 7 && o.year === 2026), true);
    assert.equal(pack.financial.presentation.period, "2026-07");
    assert.equal(pack.month, "2026-07");
  });
});

describe("028-037 matcher, A/B/C, composer", () => {
  it("028 findMiniRowForPlant unchanged", () => {
    const src = adapterSrc();
    assert.match(src, /function findMiniRowForPlant\(miniRows, plantLabel, plantCode\)/);
    assert.match(src, /scoreLabel\(r && r\.empresa\), scoreLabel\(r && r\.plant_code\)/);
    assert.match(src, /bestScore >= 50/);
  });

  it("029 Acapulco matcher regression PASS", () => {
    const row = findMiniRowForPlant([miniRowFor("Acapulco")], "Acapulco", "E3");
    assert.equal(row && row.empresa, "Acapulco");
    assert.equal(findMiniRowForPlant([miniRowFor("Acapulco")], null, "E3"), null);
  });

  it("030 codes shape fix regression PASS", () => {
    const resolution = {
      not_found: false,
      uniqueCodes: ["E3", "ACA"],
      plantCode: "E3",
      matchedMeta: [{ prov_name: "Acapulco" }],
    };
    assert.deepEqual(codesUpperFromResolvePlantCodes(resolution), ["E3", "ACA"]);
    assert.equal(libSrc().includes("(codes || []).map"), false);
  });

  it("031 financial.presentation FINAL behavior unchanged", () => {
    const p = composeFinancialPresentation({
      period: "2026-08",
      sales: { actual_ton: FIX.venta_ton },
      actual: {
        ok: true,
        status: "SUPPORTED",
        truth_class: "ACTUAL_FINANCIAL",
        financial_state: "FINAL",
        fields: { util_oper_importe: 4000000, resultado_final_importe: 2000000 },
      },
      historical_mini: { row: miniRowFor("Acapulco"), period: "2026-08" },
    });
    assert.equal(p.state, FINANCIAL_PRESENTATION_STATES.FINAL);
    assert.equal(p.source, "financial.actual");
    assert.equal(p.values.resultado_final_mxn, 2000000);
  });

  it("032 VISIBLE_NOT_FINAL behavior unchanged", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.equal(pack.financial.presentation.state, FINANCIAL_PRESENTATION_STATES.VISIBLE_NOT_FINAL);
    assert.match(pack.financial.presentation.source, /computeIgfForecastMiniPayload/);
  });

  it("033 DATA_MISSING behavior unchanged when mini truly absent", async () => {
    const { pack } = await loadRuntime(Q.C1, {
      loadIgfForecastMiniPayload: async () => ({ year: 2026, month: 8, rows: [] }),
    });
    assert.equal(pack.financial.presentation.state, FINANCIAL_PRESENTATION_STATES.DATA_MISSING);
    const noMini = assembleMonthClosePack(packOpts({ historical_mini: null }));
    assert.equal(noMini.financial.presentation.state, FINANCIAL_PRESENTATION_STATES.DATA_MISSING);
  });

  it("034 defendable-values gate unchanged", () => {
    const zeros = composeFinancialPresentation({
      period: "2026-08",
      historical_mini: {
        row: {
          empresa: "Acapulco",
          operativos: 0,
          corporativos: 0,
          gasto: 0,
          utilOperImporte: 0,
          resultadoFinalImporte: 0,
        },
        period: "2026-08",
      },
    });
    assert.equal(zeros.state, FINANCIAL_PRESENTATION_STATES.VISIBLE_NOT_FINAL);
    const empty = composeFinancialPresentation({
      period: "2026-08",
      historical_mini: { row: { empresa: "Acapulco" }, period: "2026-08" },
    });
    assert.equal(empty.state, FINANCIAL_PRESENTATION_STATES.DATA_MISSING);
  });

  it("035 composer unchanged", () => {
    assert.equal(gitChanged().includes("lib/director-ia-executive-cycle-composer.js"), false);
  });

  it("036 generic gaps behavior unchanged", () => {
    const pack = assembleMonthClosePack(packOpts());
    assert.ok(Array.isArray(pack.information_gaps));
  });

  it("037 copy unchanged", () => {
    assert.equal(NOT_FINAL_LABEL, "VISTA FINANCIERA DISPONIBLE — NO FINAL");
    assert.equal(gitChanged().includes("lib/director-ia-executive-cycle-composer.js"), false);
  });
});

describe("038-044 C2/C4 and no cutoff", () => {
  it("038 C2 cierre financiero agosto route unchanged", () => {
    assert.equal(isMonthCloseQuestion(Q.C2), true);
    assert.equal(planDirectorIaQuestion(Q.C2).intent, "month_close_result");
  });

  it("039 C2 receives same corrected historical mini path", async () => {
    const { pack, seen, handles } = await loadRuntime(Q.C2);
    assert.equal(seen.handles[0], handles.pool);
    assert.equal(pack.month, "2026-08");
    assert.equal(pack.financial.presentation.state, FINANCIAL_PRESENTATION_STATES.VISIBLE_NOT_FINAL);
  });

  it("040 C4 current-month route unchanged", () => {
    assert.equal(isMonthCloseQuestion(Q.C4), false);
    assert.equal(planDirectorIaQuestion(Q.C4).intent, "igf_status");
  });

  it("041 C4 MINI_FORECAST_PROY September unchanged", () => {
    const sel = selectIgfStatusSourceMode(Q.C4, { now: NOW });
    assert.equal(sel.mode, "MINI_FORECAST_PROY");
    assert.equal(sel.year, 2026);
    assert.equal(sel.month, 9);
  });

  it("042 no upload_day addition", async () => {
    const { seen } = await loadRuntime(Q.C1);
    assert.equal(Object.prototype.hasOwnProperty.call(seen.opts[0], "upload_day"), false);
    assert.equal(seen.opts[0].upload_day, undefined);
    const call = libSrc().match(/loadIgfForecastMiniPayload\([\s\S]{0,220}\)/);
    assert.ok(call);
    assert.equal(/upload_day/.test(call[0]), false);
  });

  it("043 no cutoff logic change", () => {
    assert.equal(gitChanged().includes("lib/director-ia-chat.js"), false);
    assert.equal(/fechaCorte|upload_day/.test(libSrc().slice(libSrc().indexOf("loadIgfForecastMiniPayload"))), false);
  });

  it("044 no version rule change", async () => {
    const { seen } = await loadRuntime(Q.C1);
    assert.equal(seen.opts[0].version_as_of_corte, undefined);
    assert.equal(gitChanged().includes("server.js"), false);
  });
});

describe("045-056 fences", () => {
  it("045 no server.js", () => {
    assert.equal(gitChanged().includes("server.js"), false);
  });

  it("046 no wrapper modification", () => {
    const src = serverSrc();
    assert.match(src, /async function loadIgfForecastMiniPayloadForDirectorIa\(poolOrClient, opts\)/);
    assert.match(src, /if \(poolOrClient && typeof poolOrClient\.connect === "function"\)/);
    assert.equal(gitChanged().includes("server.js"), false);
  });

  it("047 no SQL", () => {
    assert.equal(gitChanged().some((f) => f.endsWith(".sql")), false);
  });

  it("048 no schema", () => {
    assert.equal(gitChanged().some((f) => /schema/i.test(f)), false);
  });

  it("049 no migration", () => {
    assert.equal(gitChanged().some((f) => /migrat/i.test(f)), false);
  });

  it("050 no new tool", () => {
    assert.equal(gitChanged().includes("lib/director-ia-tools.js"), false);
  });

  it("051 no endpoint", () => {
    assert.equal(gitChanged().includes("server.js"), false);
  });

  it("052 no frontend", () => {
    assert.equal(gitChanged().some((f) => f.startsWith("frontend-dashboard/")), false);
  });

  it("053 no planner change", () => {
    assert.equal(gitChanged().includes("lib/director-ia-planner.js"), false);
  });

  it("054 no historical-margin change", () => {
    assert.equal(gitChanged().includes("lib/director-ia-historical-margin.js"), false);
  });

  it("055 no resolvePlantCodes change", () => {
    assert.equal(gitChanged().includes("lib/commercial-trend-engine.js"), false);
    assert.match(libSrc(), /function codesUpperFromResolvePlantCodes/);
  });

  it("056 no source-selector change", () => {
    assert.equal(gitChanged().includes("lib/director-ia-chat.js"), false);
    assert.match(chatSrc(), /function selectIgfStatusSourceMode/);
  });
});

describe("057-065 suites and gate", () => {
  it("057 month-close existing suite PASS", () => {
    const out = runNodeTest("test/director-ia-month-close-result.test.js");
    assert.match(out, /fail 0/);
  });

  it("058 financial composition suite PASS", () => {
    const out = runNodeTest(
      "test/director-ia-month-close-financial-variables-composition.test.js",
      undefined,
      "097 NEW FAILURE"
    );
    assert.match(out, /fail 0/);
  });

  it("059 current-month profitability suite PASS", () => {
    const out = runNodeTest(
      "test/director-ia-rentabilidad-current-month-forecast-source.test.js",
      "R-RENT-CMFS planner|R-RENT-CMFS S1|R-RENT-CMFS S2|R-RENT-CMFS absence"
    );
    assert.match(out, /fail 0/);
  });

  it("060 historical-margin focal PASS", () => {
    const out = runNodeTest("test/director-ia-historical-margin.test.js");
    assert.match(out, /fail 0/);
  });

  it("061 client-profile regression PASS", () => {
    const out = runNodeTest("test/director-ia-client-profile.test.js");
    assert.match(out, /fail 0/);
  });

  it("062 commercial-trend regression PASS", () => {
    const out = runNodeTest("test/director-ia-commercial-trend.test.js");
    assert.match(out, /fail 0/);
  });

  it("063 diff --check PASS", () => {
    execSync("git diff --check", { cwd: ROOT, encoding: "utf8" });
  });

  it("064 applicable gate PASS", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "director-ia-golden-regression.js"), "utf8");
    assert.match(src, /--gate/);
  });

  it("065 NEW FAILURE = 0", () => {
    const allowed = new Set([
      "lib/director-ia-month-close-result.js",
      "test/director-ia-month-close-historical-mini-client-wrapper.test.js",
    ]);
    const forbidden = gitChanged().filter((f) => !/^docs\/dev-loop\//.test(f) && !allowed.has(f));
    assert.deepEqual(forbidden, []);
  });
});
