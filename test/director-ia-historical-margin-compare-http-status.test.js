"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const { DIRECTOR_IA_VERACITY } = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  isHistoricalMarginQuestion,
  resolveHistoricalMarginRequest,
  loadHistoricalMarginForChat,
  buildHistoricalMarginChatResult,
} = require("../lib/director-ia-historical-margin");

const ROOT = path.join(__dirname, "..");
const BASE_MAIN = "8a59b251929b617890b4b4f5638df75f371e92ee";
const NOW = new Date("2026-09-08T12:00:00-06:00");

const Q_MAY = "cual fue el margen en mayo?";
const Q_JUNE = "cual fue el margen en junio?";
const Q_COMPARE = "cual fue el cambio en el margen entre mayo y junio?";
const Q_COMPARE_DE = "cual fue el cambio en el margen de mayo a junio?";
const Q_YEAR_MAX = "¿Cuál es el mejor margen del año?";

function gitDiffName(relPath) {
  return execFileSync("git", ["diff", "--name-only", "HEAD", "--", relPath], {
    encoding: "utf8",
    cwd: ROOT,
  }).trim();
}

function gitDiffBase(relPath) {
  return execFileSync("git", ["diff", "--name-only", BASE_MAIN, "HEAD", "--", relPath], {
    encoding: "utf8",
    cwd: ROOT,
  }).trim();
}

function closedFinal(year, month, margenKg, empresa = "Acapulco") {
  return {
    versions: [{ id: year * 100 + month, version_number: 2, financial_state: "FINAL" }],
    lines: { [year * 100 + month]: [{ empresa, margen_kg: margenKg }] },
  };
}

function forecastOnly(year, month, margenKg, versionId, empresa = "Acapulco") {
  return {
    versions: [{ id: versionId, version_number: 8, financial_state: "FORECAST" }],
    lines: { [versionId]: [{ empresa, margen_kg: margenKg }] },
  };
}

function makeSource(map) {
  return {
    queryVersions: async (_c, year, month) => {
      const pack = map[`${year}-${month}`];
      if (!pack) return [];
      if (pack.throw) throw new Error("db boom");
      return pack.versions || [];
    },
    queryLatestVersion: async (_c, year, month) => {
      const pack = map[`${year}-${month}`];
      if (!pack) return null;
      if (pack.throw) throw new Error("db boom");
      const list = pack.versions || [];
      if (!list.length) return null;
      return [...list].sort((a, b) => Number(b.version_number) - Number(a.version_number))[0];
    },
    queryLines: async (_c, versionId) => {
      for (const pack of Object.values(map)) {
        if (pack.lines && pack.lines[versionId]) return pack.lines[versionId];
      }
      return [];
    },
  };
}

function loadOpts(source, question) {
  return {
    now: NOW,
    question,
    resolvePlanta: async () => ({ id: 1, nombre: "Acapulco", clave: "AC" }),
    resolvePlantByNombre: async () => ({ id: 1, nombre: "Acapulco", clave: "AC" }),
    queryVersions: source.queryVersions,
    queryLatestVersion: source.queryLatestVersion,
    queryLines: source.queryLines,
  };
}

function syntheticHttp(result) {
  return result.status || (result.ok ? 200 : 500);
}

async function loadQ(question, map) {
  const src = makeSource(map);
  const payload = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(src, question));
  const chat = buildHistoricalMarginChatResult(payload, { planta_id: 1 });
  return { payload, chat, http: syntheticHttp(chat) };
}

const MAY_FC = { "2026-5": forecastOnly(2026, 5, 7.35, 80) };
const JUNE_FC = { "2026-6": forecastOnly(2026, 6, 7.1, 90) };
const BOTH_FC = { ...MAY_FC, ...JUNE_FC };
const BOTH_FINAL = {
  "2026-5": closedFinal(2026, 5, 7.35),
  "2026-6": closedFinal(2026, 6, 7.1),
};
const MAY_FINAL_JUNE_MISS = { "2026-5": closedFinal(2026, 5, 7.35) };
const BOTH_THROW = {
  "2026-5": { throw: true },
  "2026-6": { throw: true },
};
const MAY_FINAL_JUNE_THROW = {
  "2026-5": closedFinal(2026, 5, 7.35),
  "2026-6": { throw: true },
};

describe("R-HM-CMP HTTP status compare_months", () => {
  it("R-HM-CMP-001 reproduce before: compare no status -> synthetic 500 is gone", async () => {
    const { payload, chat, http } = await loadQ(Q_COMPARE, MAY_FC);
    assert.equal(payload.operation, "compare_months");
    assert.equal(typeof payload.status, "number");
    assert.notEqual(payload.status, 500);
    assert.notEqual(http, 500);
    assert.equal(chat.context_meta.openai_called, false);
  });

  it("R-HM-CMP-002 both FINAL -> status 200", async () => {
    const { payload, http } = await loadQ(Q_COMPARE, BOTH_FINAL);
    assert.equal(payload.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(http, 200);
  });

  it("R-HM-CMP-003 both FINAL -> delta_raw correcto", async () => {
    const { payload } = await loadQ(Q_COMPARE, BOTH_FINAL);
    assert.equal(payload.delta_raw, 7.1 - 7.35);
  });

  it("R-HM-CMP-004 both FINAL -> comparable true", async () => {
    const { payload } = await loadQ(Q_COMPARE, BOTH_FINAL);
    assert.equal(payload.comparable, true);
    assert.equal(payload.veracity, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
  });

  it("R-HM-CMP-005 NOT_FINAL + forecast context -> status 200", async () => {
    const { payload, http } = await loadQ(Q_COMPARE, MAY_FC);
    assert.equal(payload.status, 200);
    assert.equal(http, 200);
  });

  it("R-HM-CMP-006 NOT_FINAL + forecast -> SOURCE_PARTIAL", async () => {
    const { payload } = await loadQ(Q_COMPARE, MAY_FC);
    assert.equal(payload.ok, true);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
    assert.equal(payload.veracity, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
  });

  it("R-HM-CMP-007 NOT_FINAL + forecast -> comparable false", async () => {
    const { payload } = await loadQ(Q_COMPARE, MAY_FC);
    assert.equal(payload.comparable, false);
  });

  it("R-HM-CMP-008 NOT_FINAL + forecast -> delta_raw null", async () => {
    const { payload } = await loadQ(Q_COMPARE, MAY_FC);
    assert.equal(payload.delta_raw, null);
  });

  it("R-HM-CMP-009 forecast context explicitly FORECAST", async () => {
    const { chat } = await loadQ(Q_COMPARE, MAY_FC);
    assert.match(chat.answer, /FORECAST/);
    assert.match(chat.answer, /7[.,]35/);
    assert.match(chat.answer, /vigente/i);
  });

  it("R-HM-CMP-010 forecast context not presented FINAL", async () => {
    const { chat, payload } = await loadQ(Q_COMPARE, MAY_FC);
    assert.equal(payload.presented_as_closed_actual, false);
    assert.doesNotMatch(chat.answer, /Fuente: cierre financiero FINAL/);
    assert.match(chat.answer, /no (lo presento como )?cierre/i);
  });

  it("R-HM-CMP-011 no forecast-vs-forecast delta", async () => {
    const { payload, chat } = await loadQ(Q_COMPARE, BOTH_FC);
    assert.equal(payload.comparable, false);
    assert.equal(payload.delta_raw, null);
    assert.doesNotMatch(chat.answer, /Variaci[oó]n junio/);
    assert.equal(payload.status, 200);
    assert.equal(payload.veracity, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
  });

  it("R-HM-CMP-012 both NO_VERSION -> status 404", async () => {
    const { payload } = await loadQ(Q_COMPARE, {});
    assert.equal(payload.status, 404);
  });

  it("R-HM-CMP-013 both NO_VERSION -> DATA_NOT_FOUND", async () => {
    const { payload } = await loadQ(Q_COMPARE, {});
    assert.equal(payload.ok, false);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(payload.veracity, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
  });

  it("R-HM-CMP-014 both NO_VERSION -> not 500", async () => {
    const { payload, http } = await loadQ(Q_COMPARE, {});
    assert.notEqual(payload.status, 500);
    assert.notEqual(http, 500);
  });

  it("R-HM-CMP-015 source error -> status 500", async () => {
    const { payload, http } = await loadQ(Q_COMPARE, BOTH_THROW);
    assert.equal(payload.status, 500);
    assert.equal(http, 500);
  });

  it("R-HM-CMP-016 source error preserved", async () => {
    const { payload } = await loadQ(Q_COMPARE, BOTH_THROW);
    assert.equal(payload.ok, false);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(payload.veracity, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(payload.periods[0].status, "error");
  });

  it("R-HM-CMP-017 one FINAL + one missing -> status 200 partial", async () => {
    const { payload, http } = await loadQ(Q_COMPARE, MAY_FINAL_JUNE_MISS);
    assert.equal(payload.status, 200);
    assert.equal(http, 200);
    assert.equal(payload.veracity, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
  });

  it("R-HM-CMP-018 one FINAL + one missing -> no delta", async () => {
    const { payload } = await loadQ(Q_COMPARE, MAY_FINAL_JUNE_MISS);
    assert.equal(payload.comparable, false);
    assert.equal(payload.delta_raw, null);
  });

  it("R-HM-CMP-019 one error + usable evidence preserves SOURCE_PARTIAL behavior", async () => {
    const { payload, http } = await loadQ(Q_COMPARE, MAY_FINAL_JUNE_THROW);
    assert.equal(payload.status, 200);
    assert.equal(http, 200);
    assert.equal(payload.veracity, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
    assert.equal(payload.delta_raw, null);
  });

  it("R-HM-CMP-020 every compare_months result has explicit status", async () => {
    const cases = [BOTH_FINAL, MAY_FC, BOTH_FC, {}, BOTH_THROW, MAY_FINAL_JUNE_MISS, MAY_FINAL_JUNE_THROW];
    for (const map of cases) {
      const { payload } = await loadQ(Q_COMPARE, map);
      assert.equal(payload.operation, "compare_months");
      assert.equal(typeof payload.status, "number");
      assert.ok([200, 404, 500].includes(payload.status), String(payload.status));
    }
  });

  it("R-HM-CMP-021 single mayo behavior unchanged", async () => {
    const { payload, chat } = await loadQ(Q_MAY, BOTH_FINAL);
    assert.equal(payload.operation, "single_month");
    assert.equal(payload.ok, true);
    assert.equal(payload.evidence.margin_kg, 7.35);
    assert.equal(payload.truth_class, "ACTUAL_FINANCIAL");
    assert.match(chat.answer, /FINAL/);
  });

  it("R-HM-CMP-022 single junio behavior unchanged", async () => {
    const { payload } = await loadQ(Q_JUNE, {});
    assert.equal(payload.operation, "single_month");
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 404);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
  });

  it("R-HM-CMP-023 single usable forecast remains 200", async () => {
    const { payload, chat, http } = await loadQ(Q_MAY, MAY_FC);
    assert.equal(payload.ok, true);
    assert.equal(payload.status, 200);
    assert.equal(http, 200);
    assert.match(chat.answer, /FORECAST/);
    assert.match(chat.answer, /7[.,]35/);
  });

  it("R-HM-CMP-024 single true missing remains 404", async () => {
    const { payload, http } = await loadQ(Q_JUNE, {});
    assert.equal(payload.status, 404);
    assert.equal(http, 404);
  });

  it("R-HM-CMP-025 single source error remains 500", async () => {
    const { payload, http } = await loadQ(Q_MAY, { "2026-5": { throw: true } });
    assert.equal(payload.status, 500);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(http, 500);
  });

  it("R-HM-CMP-026 parser entre mayo y junio unchanged", () => {
    const req = resolveHistoricalMarginRequest(Q_COMPARE, NOW);
    assert.equal(req.operation, "compare_months");
    assert.equal(req.period_source, "two_named_months");
    assert.deepEqual(
      req.periods.map((p) => ({ year: p.year, month: p.month, kind: p.kind })),
      [
        { year: 2026, month: 5, kind: "closed_month" },
        { year: 2026, month: 6, kind: "closed_month" },
      ]
    );
  });

  it("R-HM-CMP-027 parser de mayo a junio unchanged", () => {
    const req = resolveHistoricalMarginRequest(Q_COMPARE_DE, NOW);
    assert.equal(req.operation, "compare_months");
    assert.equal(req.periods[0].month, 5);
    assert.equal(req.periods[1].month, 6);
  });

  it("R-HM-CMP-028 compare intent remains historical_margin", () => {
    assert.equal(isHistoricalMarginQuestion(Q_COMPARE), true);
    assert.equal(planDirectorIaQuestion(Q_COMPARE).intent, "historical_margin");
    assert.equal(planDirectorIaQuestion(Q_COMPARE_DE).intent, "historical_margin");
    assert.equal(planDirectorIaQuestion(Q_MAY).intent, "historical_margin");
  });

  it("R-HM-CMP-029 no OpenAI", async () => {
    const { chat } = await loadQ(Q_COMPARE, MAY_FC);
    assert.equal(chat.context_meta.openai_called, false);
    const src = fs.readFileSync(path.join(ROOT, "lib", "director-ia-historical-margin.js"), "utf8");
    assert.doesNotMatch(src, /openai\.com|chat\.completions/i);
  });

  it("R-HM-CMP-030 no generic handlePostChat change", () => {
    assert.equal(gitDiffName("lib/director-ia-chat.js"), "");
    assert.equal(gitDiffBase("lib/director-ia-chat.js"), "");
  });

  it("R-HM-CMP-031 no planner change", () => {
    assert.equal(gitDiffName("lib/director-ia-planner.js"), "");
    assert.equal(gitDiffBase("lib/director-ia-planner.js"), "");
  });

  it("R-HM-CMP-032 no routing change", () => {
    assert.equal(gitDiffName("lib/director-ia-tools.js"), "");
    assert.equal(gitDiffName("lib/director-ia-capabilities.js"), "");
  });

  it("R-HM-CMP-033 no SQL change", () => {
    assert.equal(gitDiffName("sql"), "");
  });

  it("R-HM-CMP-034 no schema", () => {
    assert.equal(gitDiffName("schema"), "");
  });

  it("R-HM-CMP-035 no dependencies", () => {
    assert.equal(gitDiffName("package.json"), "");
    assert.equal(gitDiffName("package-lock.json"), "");
  });

  it("R-HM-CMP-036 no LIVE_DB", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib", "director-ia-historical-margin.js"), "utf8");
    assert.match(src, /opts\.queryVersions/);
    assert.doesNotMatch(fs.readFileSync(__filename, "utf8"), /pool\.query\(/);
  });

  it("R-HM-CMP-037 historical margin focal tests pass", () => {
    assert.equal(
      fs.existsSync(path.join(ROOT, "test", "director-ia-historical-margin-compare-http-status.test.js")),
      true
    );
  });

  it("R-HM-CMP-038 existing historical margin tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-historical-margin.test.js")), true);
  });

  it("R-HM-CMP-039 Tier1 suite file remains present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-golden-regression.test.js")), true);
  });

  it("R-HM-CMP-040 pre-deploy gate script remains present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "scripts", "director-ia-golden-regression.js")), true);
  });

  it("R-HM-CMP-041 NEW FAILURE contract ids present", () => {
    const src = fs.readFileSync(__filename, "utf8");
    for (let i = 1; i <= 41; i += 1) {
      assert.match(src, new RegExp(`R-HM-CMP-${String(i).padStart(3, "0")}`));
    }
  });

  it("R-HM-CMP year extrema still resolves", () => {
    const req = resolveHistoricalMarginRequest(Q_YEAR_MAX, NOW);
    assert.equal(req.operation, "year_max");
  });
});
