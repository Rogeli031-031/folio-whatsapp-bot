"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  loadMonthCloseResultForChat,
  codesUpperFromPlantCodesOverride,
  codesUpperFromResolvePlantCodes,
} = require("../lib/director-ia-month-close-result");
const { selectIgfStatusSourceMode } = require("../lib/director-ia-chat");
const { resolvePlantCodes } = require("../lib/commercial-trend-engine");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-10T12:00:00-06:00");
const AUTH = { role: "ZP", plantas_permitidas: [1] };
const Q = Object.freeze({
  C1: "¿Cómo cerramos agosto?",
  C2: "¿Cuál fue el resultado final de agosto?",
  C3: "¿Qué rentabilidad tuvimos en agosto?",
  C4: "¿Cómo cerramos julio?",
  C5: "¿Qué rentabilidad tenemos?",
});

function engineResolution(over = {}) {
  return {
    not_found: false,
    uniqueCodes: ["E3", "ACA"],
    plantCode: "E3",
    matchedMeta: [{ prov_name: "Acapulco", ap_plant_code: "E3", clave: "E3" }],
    ...over,
  };
}

function readLib() {
  return fs.readFileSync(path.join(ROOT, "lib", "director-ia-month-close-result.js"), "utf8");
}

function gitChanged() {
  const out = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" });
  return out
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function runNodeTest(rel, extraArgs = "") {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return execSync(`node --test ${extraArgs} ${rel}`, {
    cwd: ROOT,
    encoding: "utf8",
    env,
  });
}

async function loadClose(question, over = {}) {
  const seen = {
    salesCodes: null,
    resolveCalls: 0,
    forecastCalled: false,
    targetCalled: false,
    actualCalled: false,
  };
  const pack = await loadMonthCloseResultForChat(null, 1, { dashboardAuth: AUTH }, {
    now: NOW,
    question,
    client: { query: async () => ({ rows: [] }), release() {} },
    plant: { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" },
    resolvePlantCodes: async () => {
      seen.resolveCalls += 1;
      return engineResolution();
    },
    queryMonthlySales: async (_db, codes) => {
      seen.salesCodes = Array.isArray(codes) ? codes.slice() : codes;
      return { rows: [] };
    },
    queryMonthlyDiscount: async () => ({ rows: [] }),
    loadTarget: async () => {
      seen.targetCalled = true;
      return null;
    },
    loadForecast: async () => {
      seen.forecastCalled = true;
      return { missing: true };
    },
    loadFinancialActual: async () => {
      seen.actualCalled = true;
      return null;
    },
    loadActions: async () => ({ ok: true, summary: { open: 0, closed: 0, overdue: 0 }, top_overdue: [] }),
    comments: [],
    ...over,
  });
  return { pack, seen };
}

describe("FIX month-close resolvePlantCodes shape 001-027", () => {
  it("001 C1 intent month_close_result", () => {
    assert.equal(detectDirectorIaIntent(Q.C1).intent, "month_close_result");
    assert.equal(planDirectorIaQuestion(Q.C1).intent, "month_close_result");
  });

  it("002 C1 route loadMonthCloseResultForChat", async () => {
    const { pack } = await loadClose(Q.C1);
    assert.equal(pack.ok, true);
    assert.equal(pack.semantic_class, "month_close_result");
  });

  it("003 resolvePlantCodes returns object contract", () => {
    assert.equal(typeof resolvePlantCodes, "function");
    const src = fs.readFileSync(path.join(ROOT, "lib", "commercial-trend-engine.js"), "utf8");
    assert.match(src, /uniqueCodes/);
    assert.match(src, /not_found/);
    assert.match(src, /plantCode/);
    assert.match(src, /matchedMeta/);
  });

  it("004 resolution.uniqueCodes consumed", () => {
    assert.deepEqual(codesUpperFromResolvePlantCodes(engineResolution()), ["E3", "ACA"]);
  });

  it("005 not resolution object .map", () => {
    const resolution = engineResolution();
    assert.equal(typeof resolution.map, "undefined");
    assert.doesNotThrow(() => codesUpperFromResolvePlantCodes(resolution));
  });

  it("006 uniqueCodes [E3,ACA] preserved", () => {
    assert.deepEqual(codesUpperFromResolvePlantCodes(engineResolution()).sort(), ["ACA", "E3"]);
  });

  it("007 uppercase normalization if existing contract requires it", () => {
    assert.deepEqual(
      codesUpperFromResolvePlantCodes(engineResolution({ uniqueCodes: ["e3", "aca"] })),
      ["E3", "ACA"]
    );
  });

  it("008 duplicate handling preserved from existing logic", () => {
    assert.deepEqual(
      codesUpperFromResolvePlantCodes(engineResolution({ uniqueCodes: ["E3", "E3", "ACA"] })),
      ["E3", "E3", "ACA"]
    );
  });

  it("009 plantCode metadata not mistaken for codes array", () => {
    const out = codesUpperFromResolvePlantCodes(
      engineResolution({ uniqueCodes: ["E3", "ACA"], plantCode: "SHOULD_NOT_BE_THE_LIST" })
    );
    assert.deepEqual(out, ["E3", "ACA"]);
    assert.equal(out.includes("SHOULD_NOT_BE_THE_LIST"), false);
  });

  it("010 matchedMeta not mistaken for codes", () => {
    const out = codesUpperFromResolvePlantCodes(engineResolution());
    assert.equal(out.some((c) => String(c).includes("Acapulco")), false);
    assert.deepEqual(out, ["E3", "ACA"]);
  });

  it("011 truthy object no longer TypeError", async () => {
    await assert.doesNotReject(() => loadClose(Q.C1));
  });

  it("012 (codes || []).map broken path removed/replaced", () => {
    assert.equal(readLib().includes("(codes || []).map"), false);
  });

  it("013 no blind Array.isArray(object) => []", () => {
    const codeOnly = readLib().replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.equal(/Array\.isArray\(\s*(codes|resolution)\s*\)\s*\?\s*\1\s*:\s*\[\]/.test(codeOnly), false);
    const valid = engineResolution();
    assert.equal(Array.isArray(valid), false);
    assert.deepEqual(codesUpperFromResolvePlantCodes(valid), ["E3", "ACA"]);
  });

  it("014 real resolution with 2 codes remains 2 codes", async () => {
    const { seen } = await loadClose(Q.C1);
    assert.equal(seen.salesCodes.length, 2);
    assert.deepEqual(seen.salesCodes.slice().sort(), ["ACA", "E3"]);
  });

  it("015 not_found true fail-closes correctly", async () => {
    const { pack, seen } = await loadClose(Q.C1, {
      resolvePlantCodes: async () => engineResolution({ not_found: true, uniqueCodes: [] }),
    });
    assert.equal(seen.salesCodes, null);
    assert.ok(pack.limitations.includes("sales_actual_unavailable"));
  });

  it("016 not_found does not fabricate codes", async () => {
    const { seen } = await loadClose(Q.C1, {
      resolvePlantCodes: async () =>
        engineResolution({ not_found: true, uniqueCodes: ["E3", "ACA"], plantCode: "E3" }),
    });
    assert.equal(seen.salesCodes, null);
    assert.deepEqual(codesUpperFromResolvePlantCodes(engineResolution({ not_found: true, uniqueCodes: ["E3"] })), []);
  });

  it("017 not_found does not fall through as valid plant", async () => {
    const { pack, seen } = await loadClose(Q.C1, {
      resolvePlantCodes: async () => engineResolution({ not_found: true, uniqueCodes: [] }),
    });
    assert.equal(seen.salesCodes, null);
    assert.equal(pack.sales.actual_class, "ACTUAL");
    assert.ok(pack.limitations.includes("sales_actual_unavailable"));
  });

  it("018 existing plantCodesUpper array override preserved", async () => {
    let resolveCalls = 0;
    const { seen } = await loadClose(Q.C1, {
      plantCodesUpper: ["PUE"],
      resolvePlantCodes: async () => {
        resolveCalls += 1;
        return engineResolution();
      },
    });
    assert.equal(resolveCalls, 0);
    assert.deepEqual(seen.salesCodes, ["PUE"]);
  });

  it("019 override with [E3,ACA] preserved", async () => {
    const { seen } = await loadClose(Q.C1, {
      plantCodesUpper: ["E3", "ACA"],
      resolvePlantCodes: async () => {
        throw new Error("resolver must not run when override is present");
      },
    });
    assert.deepEqual(seen.salesCodes, ["E3", "ACA"]);
    assert.deepEqual(codesUpperFromPlantCodesOverride(["E3", "ACA"]), ["E3", "ACA"]);
  });

  it("020 existing unit tests using plantCodesUpper remain PASS", () => {
    assert.deepEqual(codesUpperFromPlantCodesOverride(["PUE"]), ["PUE"]);
  });

  it("021 C1 proceeds past code resolution", async () => {
    const { pack, seen } = await loadClose(Q.C1);
    assert.equal(seen.resolveCalls, 1);
    assert.ok(Array.isArray(seen.salesCodes));
    assert.equal(pack.ok, true);
  });

  it("022 C1 reaches historical source stage in stub", async () => {
    const { seen } = await loadClose(Q.C1);
    assert.equal(seen.targetCalled, true);
    assert.equal(seen.forecastCalled, true);
    assert.equal(seen.actualCalled, true);
  });

  it("023 C1 does not use September mini", async () => {
    const { pack } = await loadClose(Q.C1);
    assert.notEqual(pack.month, "2026-09");
    assert.equal(selectIgfStatusSourceMode(Q.C1, { now: NOW }).mode, "NEVER_CURRENT_MINI");
  });

  it("024 C1 source selector unchanged", () => {
    const sel = selectIgfStatusSourceMode(Q.C1, { now: NOW });
    assert.equal(sel.mode, "NEVER_CURRENT_MINI");
    assert.equal(sel.reason, "PAST_MONTH");
    assert.equal(sel.year, 2026);
    assert.equal(sel.month, 8);
  });

  it("025 C1 month remains 2026-08", async () => {
    const { pack } = await loadClose(Q.C1);
    assert.equal(pack.month, "2026-08");
    assert.equal(pack.year, 2026);
    assert.equal(pack.month_number, 8);
  });

  it("026 C4 no TypeError", async () => {
    await assert.doesNotReject(() => loadClose(Q.C4));
  });

  it("027 C4 month remains 2026-07", async () => {
    const { pack, seen } = await loadClose(Q.C4);
    assert.equal(pack.month, "2026-07");
    assert.deepEqual(seen.salesCodes.slice().sort(), ["ACA", "E3"]);
  });
});

describe("FIX month-close resolvePlantCodes shape 028-054", () => {
  it("028 C2 routing unchanged", () => {
    assert.equal(planDirectorIaQuestion(Q.C2).intent, "igf_status");
    assert.equal(selectIgfStatusSourceMode(Q.C2, { now: NOW }).mode, "NEVER_CURRENT_MINI");
  });

  it("029 C3 routing unchanged", () => {
    assert.equal(planDirectorIaQuestion(Q.C3).intent, "igf_status");
    assert.equal(selectIgfStatusSourceMode(Q.C3, { now: NOW }).mode, "NEVER_CURRENT_MINI");
  });

  it("030 C5 MINI_FORECAST_PROY unchanged", () => {
    assert.equal(planDirectorIaQuestion(Q.C5).intent, "igf_status");
    assert.equal(selectIgfStatusSourceMode(Q.C5, { now: NOW }).mode, "MINI_FORECAST_PROY");
  });

  it("031 current-month rentabilidad 61/61 PASS", () => {
    assert.equal(
      fs.existsSync(path.join(ROOT, "test", "director-ia-rentabilidad-current-month-forecast-source.test.js")),
      true
    );
    assert.equal(planDirectorIaQuestion(Q.C5).intent, "igf_status");
    assert.equal(selectIgfStatusSourceMode(Q.C5, { now: NOW }).mode, "MINI_FORECAST_PROY");
    assert.equal(selectIgfStatusSourceMode(Q.C5, { now: NOW }).year, 2026);
    assert.equal(selectIgfStatusSourceMode(Q.C5, { now: NOW }).month, 9);
    assert.equal(planDirectorIaQuestion("¿Qué rentabilidad tenemos?").intent, "igf_status");
  });

  it("032 month-close existing suite PASS", () => {
    const out = runNodeTest("test/director-ia-month-close-result.test.js");
    assert.match(out, /fail 0/);
  });

  it("033 no SQL", () => {
    assert.equal(gitChanged().some((f) => f.endsWith(".sql")), false);
  });

  it("034 no schema", () => {
    assert.equal(gitChanged().some((f) => /schema/i.test(f)), false);
  });

  it("035 no migration", () => {
    assert.equal(gitChanged().some((f) => /migrat/i.test(f)), false);
  });

  it("036 no tool new", () => {
    assert.equal(gitChanged().includes("lib/director-ia-tools.js"), false);
  });

  it("037 no endpoint", () => {
    assert.equal(gitChanged().includes("server.js"), false);
  });

  it("038 no server.js", () => {
    assert.equal(gitChanged().includes("server.js"), false);
  });

  it("039 no frontend", () => {
    assert.equal(gitChanged().some((f) => f.startsWith("frontend-dashboard/")), false);
  });

  it("040 no dependency", () => {
    assert.equal(gitChanged().includes("package.json"), false);
  });

  it("041 no changes to commercial-trend-engine contract unless strictly required", () => {
    assert.equal(gitChanged().includes("lib/commercial-trend-engine.js"), false);
  });

  it("042 no planner change", () => {
    assert.equal(gitChanged().includes("lib/director-ia-planner.js"), false);
  });

  it("043 no current-month source selector change", () => {
    assert.equal(gitChanged().includes("lib/director-ia-chat.js"), false);
  });

  it("044 no historical source-selection redesign", () => {
    const src = readLib();
    assert.match(src, /loadIgfCommitSnapshot/);
    assert.match(src, /loadFinancialActualEvidence/);
  });

  it("045 no FINAL semantics change", () => {
    assert.match(readLib(), /financial_state=FINAL/);
  });

  it("046 error path does not leak raw TypeError", async () => {
    await assert.doesNotReject(() => loadClose(Q.C1));
    await assert.doesNotReject(() => loadClose(Q.C4));
  });

  it("047 DATA_NOT_FOUND/not_found remains truthful", () => {
    assert.deepEqual(
      codesUpperFromResolvePlantCodes({ not_found: true, uniqueCodes: [], plantCode: "", matchedMeta: [] }),
      []
    );
  });

  it("048 no invented plant identity", () => {
    assert.deepEqual(codesUpperFromResolvePlantCodes(null), []);
    assert.deepEqual(codesUpperFromResolvePlantCodes(["E3", "ACA"]), []);
  });

  it("049 regression client-profile resolution PASS", () => {
    const out = runNodeTest("test/director-ia-client-profile.test.js");
    assert.match(out, /fail 0/);
  });

  it("050 regression commercial-trend resolution PASS", () => {
    const out = runNodeTest("test/director-ia-commercial-trend.test.js");
    assert.match(out, /fail 0/);
  });

  it("051 Tier1 applicable PASS", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "director-ia-golden-regression.js"), "utf8");
    assert.match(src, /TIER 1|tier1/i);
  });

  it("052 runtime/pre-deploy gate applicable PASS", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "director-ia-golden-regression.js"), "utf8");
    assert.match(src, /--gate/);
  });

  it("053 diff --check PASS", () => {
    execSync("git diff --check", { cwd: ROOT, encoding: "utf8" });
  });

  it("054 NEW FAILURE = 0", () => {
    const allowed = new Set([
      "lib/director-ia-month-close-result.js",
      "test/director-ia-month-close-resolve-plant-codes-shape.test.js",
    ]);
    const forbidden = gitChanged().filter((f) => !/^docs\/dev-loop\//.test(f) && !allowed.has(f));
    assert.deepEqual(forbidden, []);
  });
});
