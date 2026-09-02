"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion, detectDirectorIaIntent } = require("../lib/director-ia-planner");
const { DIRECTOR_IA_VERACITY, isDirectorIaDomainReadable } = require("../lib/director-ia-capabilities");
const { getDirectorIaTool, validateDirectorIaToolRegistry } = require("../lib/director-ia-tools");
const { INHERITABLE_INTENTS, resolveConversationTurn, buildConversationState } = require("../lib/director-ia-conversation-state");
const {
  isHistoricalMarginQuestion,
  resolveHistoricalMarginRequest,
  classifyPeriodKind,
  annualCandidateMonths,
  extractNamedPlant,
  findUniquePlantRow,
  isValidStoredMargin,
  formatMarginKg,
  cdmxTodayParts,
  loadHistoricalMarginForChat,
  buildHistoricalMarginChatResult,
} = require("../lib/director-ia-historical-margin");

const NOW = new Date("2026-09-01T12:00:00-06:00");
const LIB = path.join(__dirname, "..", "lib");

const Q = {
  P1: "¿Cuál fue el margen en mayo?",
  P2: "¿Cuál fue el margen de abril y el de mayo?",
  P3: "¿Cuál es el mejor margen del año?",
  P4: "¿Cuál fue el menor margen del año?",
  P5: "¿Cuál fue el margen de mayo 2025?",
  P6: "¿Cuál fue el margen de mayo de 2026 en Acapulco?",
  P7: "¿Cuál fue el mejor margen de 2026 en Acapulco?",
  P8: "¿Cuál fue el menor margen de 2026 en Acapulco?",
  P9: "¿Cuál es el margen de septiembre?",
  P10: "¿Cuál será el margen de octubre?",
};

const G = {
  G1: "¿Cómo vamos?",
  G2: "¿Cómo cerramos?",
  G3: "¿Cómo quedamos contra la meta?",
  G4: "¿Cómo va la tendencia de CASA los últimos 30 días?",
  G5: "¿Cómo van los comisionistas?",
  G6: "¿Qué clientes nuevos entraron en agosto?",
  G7: "¿Qué sabemos de TORTILLERIA ERICK?",
  G8: "Dame los kg comprados y el descuento por cada mes de TORTILLERIA ERICK desde enero a la fecha.",
  G9: "¿Y GRUPO MOVE?",
  G10: "¿Y Arturo?",
  G11: "¿Cómo cambió el descuento de abril a mayo?",
  G12: "¿Cómo va el margen de la planta?",
};

const C = {
  C1: "¿Cómo va el margen de la planta?",
  C2: "¿Cómo cambió el descuento de abril a mayo?",
  C3: "¿Cómo va la tendencia de CASA los últimos 30 días?",
  C4: "¿Qué clientes nuevos entraron en agosto?",
  C5: "¿Cuál fue la venta de mayo?",
};

function closedFinal(year, month, margenKg, empresa = "Acapulco") {
  return {
    versions: [{ id: year * 100 + month, version_number: 2, financial_state: "FINAL" }],
    lines: { [year * 100 + month]: [{ empresa, margen_kg: margenKg }] },
  };
}

function makeSource(map) {
  let queried = [];
  return {
    queried: () => queried,
    reset() {
      queried = [];
    },
    queryVersions: async (_c, year, month) => {
      queried.push({ kind: "versions", year, month });
      const pack = map[`${year}-${month}`];
      if (!pack) return [];
      if (pack.throw) throw new Error("db boom");
      return pack.versions || [];
    },
    queryLatestVersion: async (_c, year, month) => {
      queried.push({ kind: "latest", year, month });
      const pack = map[`${year}-${month}`];
      if (!pack) return null;
      if (pack.throw) throw new Error("db boom");
      const list = pack.versions || [];
      return list[0] || null;
    },
    queryLines: async (_c, versionId) => {
      queried.push({ kind: "lines", versionId });
      for (const pack of Object.values(map)) {
        if (pack.lines && pack.lines[versionId]) return pack.lines[versionId];
      }
      return [];
    },
  };
}

function loadOpts(source, extra = {}) {
  return {
    now: NOW,
    question: extra.question || Q.P1,
    resolvePlanta: async () => ({ id: 1, nombre: extra.sessionNombre || "Acapulco", clave: "AC" }),
    resolvePlantByNombre: async (_c, nombre) => {
      if (String(nombre).toLowerCase() === "acapulco") return { id: 7, nombre: "Acapulco", clave: "AC" };
      return null;
    },
    queryVersions: source.queryVersions,
    queryLatestVersion: source.queryLatestVersion,
    queryLines: source.queryLines,
    ...extra,
  };
}

function yearMap(valuesByMonth, empresa = "Acapulco") {
  const map = {};
  for (const [month, margen] of Object.entries(valuesByMonth)) {
    const m = Number(month);
    Object.assign(map, { [`2026-${m}`]: closedFinal(2026, m, margen, empresa) });
    map[`2026-${m}`] = closedFinal(2026, m, margen, empresa);
  }
  return map;
}

describe("A. detector / period", () => {
  it("P1-P10 son historical_margin", () => {
    for (const [id, q] of Object.entries(Q)) {
      assert.equal(isHistoricalMarginQuestion(q), true, id);
      assert.equal(planDirectorIaQuestion(q).intent, "historical_margin", id);
    }
  });

  it("hold-outs C1-C5 no son historical_margin", () => {
    assert.equal(isHistoricalMarginQuestion(C.C1), false);
    assert.equal(planDirectorIaQuestion(C.C1).intent, "financial_diagnosis");
    assert.equal(planDirectorIaQuestion(C.C2).intent, "delta_discount");
    assert.equal(planDirectorIaQuestion(C.C3).intent, "commercial_trend");
    assert.equal(planDirectorIaQuestion(C.C4).intent, "historical_new_clients");
    assert.equal(isHistoricalMarginQuestion(C.C5), false);
    assert.equal(planDirectorIaQuestion(C.C5).intent, "unknown");
  });

  it("periodos CDMX 2026-09-01 sin rollover a 2025", () => {
    const today = cdmxTodayParts(NOW);
    assert.deepEqual({ year: today.year, month: today.month }, { year: 2026, month: 9 });
    const p1 = resolveHistoricalMarginRequest(Q.P1, NOW);
    assert.equal(p1.operation, "single_month");
    assert.deepEqual(p1.periods[0], { year: 2026, month: 5, kind: "closed_month" });
    const p2 = resolveHistoricalMarginRequest(Q.P2, NOW);
    assert.equal(p2.operation, "compare_months");
    assert.equal(p2.periods[0].month, 4);
    assert.equal(p2.periods[1].month, 5);
    const p5 = resolveHistoricalMarginRequest(Q.P5, NOW);
    assert.deepEqual({ year: p5.periods[0].year, month: p5.periods[0].month }, { year: 2025, month: 5 });
    const p9 = resolveHistoricalMarginRequest(Q.P9, NOW);
    assert.equal(p9.periods[0].kind, "open_current_month");
    const p10 = resolveHistoricalMarginRequest(Q.P10, NOW);
    assert.equal(p10.periods[0].kind, "future_month");
    assert.equal(p10.periods[0].year, 2026);
    assert.equal(p10.periods[0].month, 10);
    assert.equal(classifyPeriodKind(2026, 10, today), "future_month");
    const p3 = resolveHistoricalMarginRequest(Q.P3, NOW);
    assert.equal(p3.operation, "year_max");
    assert.deepEqual(
      p3.periods.map((p) => p.month),
      [1, 2, 3, 4, 5, 6, 7, 8]
    );
    const past = annualCandidateMonths(2025, today);
    assert.equal(past.length, 12);
    assert.equal(annualCandidateMonths(2027, today).length, 0);
    assert.equal(extractNamedPlant(Q.P6), "Acapulco");
  });

  it("setiembre y YYYY-MM", () => {
    const a = resolveHistoricalMarginRequest("margen en setiembre 2025", NOW);
    assert.equal(a.periods[0].month, 9);
    assert.equal(a.periods[0].year, 2025);
    const b = resolveHistoricalMarginRequest("margen 2026-04", NOW);
    assert.equal(b.period_source, "yyyy_mm");
    assert.equal(b.periods[0].month, 4);
  });
});

describe("B. source adapter", () => {
  it("closed unique FINAL + unique plant + margin valid", async () => {
    const src = makeSource({ "2026-5": closedFinal(2026, 5, 7.11) });
    const payload = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(src));
    assert.equal(payload.ok, true);
    assert.equal(payload.evidence.margin_kg, 7.11);
    assert.equal(payload.truth_class, "ACTUAL_FINANCIAL");
    assert.equal(payload.presented_as_closed_actual, true);
    assert.deepEqual(payload.sources, ["igf.versions", "igf.compromiso_lines"]);
  });

  it("0 versions → DATA_NOT_FOUND", async () => {
    const src = makeSource({});
    const payload = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(src));
    assert.equal(payload.ok, false);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(payload.evidence.reason, "NO_VERSION");
  });

  it("version exists no FINAL → DATA_NOT_FOUND NOT_FINAL", async () => {
    const src = makeSource({
      "2026-5": { versions: [{ id: 1, version_number: 3, financial_state: "FORECAST" }], lines: {} },
    });
    const payload = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(src));
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(payload.evidence.reason, "NOT_FINAL");
  });

  it("2 FINAL → SOURCE_ERROR VERSION_AMBIGUOUS", async () => {
    const src = makeSource({
      "2026-5": {
        versions: [
          { id: 1, version_number: 1, financial_state: "FINAL" },
          { id: 2, version_number: 2, financial_state: "FINAL" },
        ],
        lines: {},
      },
    });
    const payload = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(src));
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(payload.evidence.reason, "VERSION_AMBIGUOUS");
  });

  it("FINAL no plant → DATA_NOT_FOUND", async () => {
    const src = makeSource({
      "2026-5": { versions: [{ id: 50, version_number: 1, financial_state: "FINAL" }], lines: { 50: [{ empresa: "Puebla", margen_kg: 1 }] } },
    });
    const payload = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(src));
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(payload.evidence.reason, "NO_PLANT_ROW");
  });

  it("FINAL plant ambiguous → SOURCE_ERROR", async () => {
    const src = makeSource({
      "2026-5": {
        versions: [{ id: 51, version_number: 1, financial_state: "FINAL" }],
        lines: {
          51: [
            { empresa: "ACAPULCO", margen_kg: 1 },
            { empresa: "GTM ACAPULCO", margen_kg: 2 },
            { empresa: "ACAPULCO DIAMANTE", margen_kg: 3 },
          ],
        },
      },
    });
    const payload = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(src));
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(payload.plant_match_ambiguous, true);
  });

  it("margin null / 0 / NaN / Infinity", async () => {
    const mk = async (val) => {
      const src = makeSource({ "2026-5": closedFinal(2026, 5, val) });
      return loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(src));
    };
    const n = await mk(null);
    assert.equal(n.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    const z = await mk(0);
    assert.equal(z.ok, true);
    assert.equal(z.margin_kg, 0);
    const nan = await mk(Number.NaN);
    assert.equal(nan.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    const inf = await mk(Number.POSITIVE_INFINITY);
    assert.equal(inf.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(isValidStoredMargin(0), true);
    assert.equal(isValidStoredMargin(7.11), true);
    assert.equal(isValidStoredMargin(null), false);
    assert.equal(isValidStoredMargin(undefined), false);
    assert.equal(isValidStoredMargin(Number.NaN), false);
    assert.equal(isValidStoredMargin(Number.POSITIVE_INFINITY), false);
  });

  it("query throws → SOURCE_ERROR no null silencioso", async () => {
    const src = makeSource({ "2026-5": { throw: true } });
    const payload = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(src));
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
  });

  it("open latest valid / missing / ambiguous", async () => {
    const okSrc = makeSource({
      "2026-9": { versions: [{ id: 90, version_number: 4, financial_state: "FORECAST" }], lines: { 90: [{ empresa: "Acapulco", margen_kg: 7.32 }] } },
    });
    const open = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(okSrc, { question: Q.P9 })
    );
    assert.equal(open.ok, true);
    assert.equal(open.truth_class, "FORECAST");
    assert.equal(open.presented_as_closed_actual, false);
    assert.equal(open.forecast_used, true);
    const miss = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(makeSource({}), { question: Q.P9 })
    );
    assert.equal(miss.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    const amb = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(
        makeSource({
          "2026-9": {
            versions: [{ id: 91, version_number: 1, financial_state: "FORECAST" }],
            lines: {
              91: [
                { empresa: "ACAPULCO", margen_kg: 1 },
                { empresa: "GTM ACAPULCO", margen_kg: 2 },
              ],
            },
          },
        }),
        { question: Q.P9 }
      )
    );
    assert.equal(amb.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
  });

  it("future no query", async () => {
    const src = makeSource({});
    const payload = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(src, { question: Q.P10 })
    );
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.equal(payload.period_kind, "future_month");
    assert.equal(payload.facts_consulted, false);
    assert.deepEqual(payload.sources, []);
    assert.equal(src.queried().length, 0);
  });
});

describe("C. calculation", () => {
  it("delta from raw before format", async () => {
    const src = makeSource({
      "2026-4": closedFinal(2026, 4, 7.114),
      "2026-5": closedFinal(2026, 5, 7.115),
    });
    const payload = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(src, { question: Q.P2 })
    );
    assert.equal(payload.delta_raw, 7.115 - 7.114);
    assert.equal(payload.comparable, true);
    const chat = buildHistoricalMarginChatResult(payload, { planta_id: 1 });
    assert.match(chat.answer, /Variación mayo/);
    assert.notEqual(payload.delta_raw, Number(formatMarginKg(7.115).replace(",", ".")) - Number(formatMarginKg(7.114).replace(",", ".")));
  });

  it("compare semantic mismatch no homogeneous delta", async () => {
    const src = makeSource({
      "2026-4": closedFinal(2026, 4, 7.1),
      "2026-9": { versions: [{ id: 90, version_number: 1, financial_state: "FORECAST" }], lines: { 90: [{ empresa: "Acapulco", margen_kg: 8 }] } },
    });
    const payload = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(src, { question: "¿Cuál fue el margen de abril y el de septiembre?" })
    );
    assert.equal(payload.comparable, false);
    assert.equal(payload.delta_raw, null);
    assert.match(payload.compare_answer, /no comparten semántica/i);
  });
});

describe("D. builder", () => {
  it("single closed / open / missing copy", async () => {
    const closed = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(makeSource({ "2026-5": closedFinal(2026, 5, 8.2) }))
    );
    const a = buildHistoricalMarginChatResult(closed, { planta_id: 1 });
    assert.match(a.answer, /Mayo 2026/);
    assert.match(a.answer, /FINAL/);
    assert.doesNotMatch(a.answer, /OLS|CASA|toneladas/i);
    const open = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(
        makeSource({
          "2026-9": { versions: [{ id: 90, version_number: 1, financial_state: "FORECAST" }], lines: { 90: [{ empresa: "Acapulco", margen_kg: 7.32 }] } },
        }),
        { question: Q.P9 }
      )
    );
    const b = buildHistoricalMarginChatResult(open, { planta_id: 1 });
    assert.match(b.answer, /forecast/i);
    assert.match(b.answer, /abierto/);
    assert.match(b.answer, /no lo presento como cierre real/);
    assert.doesNotMatch(b.answer, /Fuente: cierre financiero FINAL/);
    const miss = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(makeSource({})));
    assert.match(buildHistoricalMarginChatResult(miss).answer, /No hay un margen histórico FINAL/);
  });

  it("SOURCE_ERROR no usa wording de DATA_NOT_FOUND en la respuesta final", async () => {
    const missingWording = /No hay un margen histórico FINAL|No hay un margen forecast defendible/;
    const twoFinal = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(
        makeSource({
          "2026-5": {
            versions: [
              { id: 1, version_number: 1, financial_state: "FINAL" },
              { id: 2, version_number: 2, financial_state: "FINAL" },
            ],
            lines: {},
          },
        })
      )
    );
    const twoChat = buildHistoricalMarginChatResult(twoFinal, { planta_id: 1 });
    assert.equal(twoFinal.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(twoChat.context_meta.veracity, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(twoChat.limitation.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(twoChat.context_meta.openai_called, false);
    assert.doesNotMatch(twoChat.answer, missingWording);
    assert.match(twoChat.answer, /m[uú]ltiples versiones FINAL/i);

    const amb = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(
        makeSource({
          "2026-5": {
            versions: [{ id: 51, version_number: 1, financial_state: "FINAL" }],
            lines: {
              51: [
                { empresa: "ACAPULCO", margen_kg: 1 },
                { empresa: "GTM ACAPULCO", margen_kg: 2 },
                { empresa: "ACAPULCO DIAMANTE", margen_kg: 3 },
              ],
            },
          },
        })
      )
    );
    const ambChat = buildHistoricalMarginChatResult(amb, { planta_id: 1 });
    assert.equal(amb.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(ambChat.context_meta.veracity, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(ambChat.limitation.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(ambChat.context_meta.openai_called, false);
    assert.doesNotMatch(ambChat.answer, missingWording);
    assert.match(ambChat.answer, /[uú]nica fila de planta/i);

    const boom = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(makeSource({ "2026-5": { throw: true } }))
    );
    const boomChat = buildHistoricalMarginChatResult(boom, { planta_id: 1 });
    assert.equal(boom.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(boomChat.context_meta.veracity, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(boomChat.limitation.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(boomChat.context_meta.openai_called, false);
    assert.doesNotMatch(boomChat.answer, missingWording);
    assert.match(boomChat.answer, /consultar o validar la fuente/i);
    assert.doesNotMatch(boomChat.answer, /db boom|SQL|password|token/i);

    const openErr = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(makeSource({ "2026-9": { throw: true } }), { question: Q.P9 })
    );
    const openChat = buildHistoricalMarginChatResult(openErr, { planta_id: 1 });
    assert.equal(openErr.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(openChat.context_meta.veracity, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(openChat.limitation.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.equal(openChat.context_meta.openai_called, false);
    assert.doesNotMatch(openChat.answer, missingWording);
    assert.doesNotMatch(openChat.answer, /No hay un margen forecast/i);
    assert.match(openChat.answer, /consultar o validar la fuente/i);

    const notFinal = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(
        makeSource({
          "2026-5": { versions: [{ id: 1, version_number: 3, financial_state: "FORECAST" }], lines: {} },
        })
      )
    );
    const notFinalChat = buildHistoricalMarginChatResult(notFinal, { planta_id: 1 });
    assert.equal(notFinal.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.match(notFinalChat.answer, /No hay un margen histórico FINAL defendible/);
  });
});

describe("E. planner / tool", () => {
  it("capability y registry", () => {
    assert.equal(isDirectorIaDomainReadable("historical_margin"), true);
    assert.equal(getDirectorIaTool("get_historical_margin").executor, "loadHistoricalMarginForChat");
    const v = validateDirectorIaToolRegistry();
    assert.equal(v.ok, true, (v.errors || []).join(","));
    assert.ok(INHERITABLE_INTENTS.includes("historical_margin"));
  });
});

describe("F. askDirectorIa", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  after(() => {
    configureDirectorIaChat({
      loadHistoricalMarginForChat: undefined,
      now: undefined,
    });
  });

  it("P1-P4 in-process openai_called false", async () => {
    configureDirectorIaChat({
      now: NOW,
      pool: { connect: async () => ({ release() {} }) },
      loadHistoricalMarginForChat: async (_p, _id, _r, opts) => {
        const req = resolveHistoricalMarginRequest(opts.question, NOW);
        if (req.operation === "single_month") {
          return {
            ok: true,
            operation: "single_month",
            period_kind: "closed_month",
            truth_class: "ACTUAL_FINANCIAL",
            presented_as_closed_actual: true,
            forecast_used: false,
            facts_consulted: true,
            sources: ["igf.versions", "igf.compromiso_lines"],
            evidence: {
              status: "valid",
              year: 2026,
              month: 5,
              period_kind: "closed_month",
              truth_class: "ACTUAL_FINANCIAL",
              margin_kg: 7.11,
              presented_as_closed_actual: true,
            },
            margin_kg: 7.11,
          };
        }
        if (req.operation === "compare_months") {
          return {
            ok: true,
            operation: "compare_months",
            comparable: true,
            delta_raw: 0.2,
            compare_answer: "Abril 2026: 7.00 $/kg\nMayo 2026: 7.20 $/kg\nVariación mayo − abril: +0.20 $/kg",
            presented_as_closed_actual: true,
            sources: ["igf.versions", "igf.compromiso_lines"],
          };
        }
        return {
          ok: true,
          operation: req.operation,
          year: 2026,
          included_months: [{ year: 2026, month: 5, margin_kg: 8, status: "valid", period_kind: "closed_month" }],
          excluded_months: [],
          winners: [{ year: 2026, month: 5, margin_kg: 8 }],
          coverage_complete: false,
          sources: ["igf.versions", "igf.compromiso_lines"],
        };
      },
    });
    for (const key of ["P1", "P2", "P3", "P4"]) {
      const out = await askDirectorIa({ body: {}, dashboardAuth: { role: "ZP" } }, 1, Q[key]);
      assert.equal(out.context_meta.mode, "historical_margin", key);
      assert.equal(out.context_meta.openai_called, false, key);
      assert.doesNotMatch(out.answer, /OLS|pendiente/i, key);
    }
  });
});

describe("G. continuity", () => {
  it("P1 after commercial_trend is historical_margin not inherit", () => {
    const echoed = buildConversationState({
      plantaId: 1,
      parent_intent: "commercial_trend",
      last_evidence_bundle_type: "commercial_trend",
      active_range_days: 30,
    });
    const turn = resolveConversationTurn({
      question: Q.P1,
      plantaId: 1,
      detectIntent: detectDirectorIaIntent,
      history: [{ role: "user", content: "¿Cómo va la tendencia comercial de CASA y COMISIONISTA?" }],
      echoedState: echoed,
    });
    assert.equal(turn.standalone, true);
    assert.equal(turn.inherit, false);
    const plan = planDirectorIaQuestion(Q.P1, turn.inherit ? { inheritParentIntent: turn.inherit_parent_intent } : {});
    assert.equal(plan.intent, "historical_margin");
  });

  it("historical_margin → ¿Y en mayo? hereda y resuelve mayo", () => {
    const echoed = buildConversationState({
      plantaId: 1,
      parent_intent: "historical_margin",
      last_evidence_bundle_type: "historical_margin",
    });
    const turn = resolveConversationTurn({
      question: "¿Y en mayo?",
      plantaId: 1,
      detectIntent: detectDirectorIaIntent,
      history: [{ role: "user", content: "¿Cuál fue el margen en abril?" }],
      echoedState: echoed,
    });
    assert.equal(turn.inherit, true);
    assert.equal(turn.inherit_parent_intent, "historical_margin");
    const plan = planDirectorIaQuestion("¿Y en mayo?", { inheritParentIntent: turn.inherit_parent_intent });
    assert.equal(plan.intent, "historical_margin");
    const req = resolveHistoricalMarginRequest("¿Y en mayo?", NOW);
    assert.equal(req.operation, "single_month");
    assert.equal(req.periods[0].month, 5);
  });

  it("historical_margin → ¿descuento de agosto? no hereda margen", () => {
    const echoed = buildConversationState({
      plantaId: 1,
      parent_intent: "historical_margin",
      last_evidence_bundle_type: "historical_margin",
    });
    const question = "¿descuento de agosto?";
    const turn = resolveConversationTurn({
      question,
      plantaId: 1,
      detectIntent: detectDirectorIaIntent,
      history: [{ role: "user", content: "¿Cuál fue el margen en mayo?" }],
      echoedState: echoed,
    });
    const plan = planDirectorIaQuestion(
      question,
      turn.inherit && turn.inherit_parent_intent ? { inheritParentIntent: turn.inherit_parent_intent } : {}
    );
    assert.notEqual(plan.intent, "historical_margin");
    assert.equal(detectDirectorIaIntent(question).intent, "unknown");
    assert.equal(planDirectorIaQuestion("¿Y en mayo?", { inheritParentIntent: "historical_margin" }).intent, "historical_margin");
    assert.notEqual(
      planDirectorIaQuestion("¿venta de agosto?", { inheritParentIntent: "historical_margin" }).intent,
      "historical_margin"
    );
  });

  it("¿Cómo vamos? → ¿Cuál fue el margen en abril? no hereda pack ejecutivo", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    const parentQuestion = "¿Cómo vamos?";
    const marginQuestion = "¿Cuál fue el margen en abril?";
    const executivePackAnswer = [
      "MATERIALIDAD COMERCIAL de julio: clientes de julio con DICF y Commercial State.",
      "Action Register vencido. Bitácora del trimestre. ARR e IGF almacenado.",
      "OLS toneladas. SOURCE_RESTRICTED en commercial_state. period mismatch julio vs abril.",
    ].join(" ");
    const executiveParent = buildConversationState({
      plantaId: 1,
      parent_intent: "plant_diagnosis",
      last_evidence_bundle_type: "plant_diagnosis",
      forecast_run: {
        plant_code: "AC",
        year: 2026,
        month: 7,
        upload_day: "2026-07-31",
        effective_cutoff_date: "2026-07-31",
        corte_day: "2026-07-31",
        cutoff_origin: "REQUEST_UPLOAD_DAY",
      },
    });
    assert.equal(executiveParent.parent_intent, "plant_diagnosis");
    assert.equal(isHistoricalMarginQuestion(marginQuestion), true);
    const detected = detectDirectorIaIntent(marginQuestion);
    assert.equal(detected.intent, "historical_margin");
    const turn = resolveConversationTurn({
      question: marginQuestion,
      plantaId: 1,
      detectIntent: detectDirectorIaIntent,
      history: [
        { role: "user", content: parentQuestion },
        { role: "assistant", content: executivePackAnswer },
      ],
      echoedState: executiveParent,
    });
    assert.equal(turn.standalone, true);
    assert.equal(turn.inherit, false);
    const plan = planDirectorIaQuestion(
      marginQuestion,
      turn.inherit && turn.inherit_parent_intent ? { inheritParentIntent: turn.inherit_parent_intent } : {}
    );
    assert.equal(plan.intent, "historical_margin");
    const period = resolveHistoricalMarginRequest(marginQuestion, NOW);
    assert.equal(period.operation, "single_month");
    assert.equal(period.periods[0].year, 2026);
    assert.equal(period.periods[0].month, 4);

    let seenQuestion = null;
    configureDirectorIaChat({
      now: NOW,
      pool: { connect: async () => ({ release() {} }) },
      openaiChat: async () => {
        throw new Error("OpenAI no debe correr para margen histórico");
      },
      loadPlantDiagnosisForChat: async () => {
        throw new Error("plant_diagnosis / executive pack no debe correr");
      },
      loadFinancialDiagnosisForChat: async () => {
        throw new Error("financial_diagnosis no debe correr");
      },
      loadCommercialTrendForChat: async () => {
        throw new Error("commercial_trend no debe correr");
      },
      loadHistoricalMarginForChat: async (_pool, plantaId, req, opts) => {
        seenQuestion = opts.question;
        return loadHistoricalMarginForChat(
          null,
          plantaId,
          req,
          loadOpts(makeSource({ "2026-4": closedFinal(2026, 4, 6.77) }), { question: opts.question })
        );
      },
    });
    try {
      const out = await askDirectorIa(
        {
          body: {
            history: [
              { role: "user", content: parentQuestion },
              { role: "assistant", content: executivePackAnswer },
              { role: "user", content: marginQuestion },
            ],
            conversation_state: executiveParent,
          },
          dashboardAuth: { role: "ZP", actor_id: 9, plantas_permitidas: [1] },
        },
        1,
        marginQuestion
      );
      assert.equal(seenQuestion, marginQuestion);
      assert.equal(out.context_meta.mode, "historical_margin");
      assert.equal(out.context_meta.operation, "single_month");
      assert.equal(out.context_meta.openai_called, false);
      assert.match(out.answer, /Abril 2026/);
      assert.match(out.answer, /6[.,]77/);
      assert.match(out.answer, /FINAL/);
      const contamination = [
        /MATERIALIDAD COMERCIAL/i,
        /Action Register/i,
        /\bDICF\b/,
        /Commercial State/i,
        /Bit[aá]cora/i,
        /\bARR\b/,
        /IGF almacenado/i,
        /clientes de julio/i,
        /\bOLS\b/,
        /SOURCE_RESTRICTED/,
        /period mismatch/i,
      ];
      for (const re of contamination) {
        assert.doesNotMatch(out.answer, re);
      }
    } finally {
      configureDirectorIaChat({
        loadHistoricalMarginForChat: undefined,
        loadPlantDiagnosisForChat: undefined,
        loadFinancialDiagnosisForChat: undefined,
        loadCommercialTrendForChat: undefined,
        openaiChat: undefined,
        now: undefined,
        pool: undefined,
      });
    }
  });

  it("commercial_trend + ¿Y en mayo? no se convierte en historical_margin", () => {
    const echoed = buildConversationState({
      plantaId: 1,
      parent_intent: "commercial_trend",
      last_evidence_bundle_type: "commercial_trend",
    });
    const turn = resolveConversationTurn({
      question: "¿Y en mayo?",
      plantaId: 1,
      detectIntent: detectDirectorIaIntent,
      history: [],
      echoedState: echoed,
    });
    assert.equal(isHistoricalMarginQuestion("¿Y en mayo?"), false);
    const plan = planDirectorIaQuestion(
      "¿Y en mayo?",
      turn.inherit && turn.inherit_parent_intent ? { inheritParentIntent: turn.inherit_parent_intent } : {}
    );
    assert.notEqual(plan.intent, "historical_margin");
  });
});

describe("H. regressions / auth / annual", () => {
  it("Golden G1-G12 no caen a historical_margin", () => {
    assert.notEqual(planDirectorIaQuestion(G.G1).intent, "historical_margin");
    assert.equal(planDirectorIaQuestion(G.G2).intent, "month_close_result");
    assert.equal(planDirectorIaQuestion(G.G3).intent, "month_close_result");
    assert.equal(planDirectorIaQuestion(G.G4).intent, "commercial_trend");
    assert.equal(planDirectorIaQuestion(G.G6).intent, "historical_new_clients");
    assert.equal(planDirectorIaQuestion(G.G7).intent, "client_profile");
    assert.equal(planDirectorIaQuestion(G.G8).intent, "client_profile");
    assert.equal(planDirectorIaQuestion(G.G11).intent, "delta_discount");
    assert.equal(planDirectorIaQuestion(G.G12).intent, "financial_diagnosis");
    assert.notEqual(planDirectorIaQuestion(G.G5).intent, "historical_margin");
    assert.notEqual(planDirectorIaQuestion(G.G9).intent, "historical_margin");
    assert.notEqual(planDirectorIaQuestion(G.G10).intent, "historical_margin");
  });

  it("auth current / named / denied / no query before permission", async () => {
    const src = makeSource({ "2026-5": closedFinal(2026, 5, 7) });
    const ok = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "ZP" } }, loadOpts(src));
    assert.equal(ok.ok, true);
    const named = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(src, { question: Q.P6 })
    );
    assert.equal(named.planta_id, 7);
    src.reset();
    const denied = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "GG", plantas_permitidas: [1] } },
      loadOpts(src, { question: Q.P6 })
    );
    assert.equal(denied.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.equal(src.queried().length, 0);
    const ga = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "GA" } }, loadOpts(src));
    assert.equal(ga.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    const gv = await loadHistoricalMarginForChat(null, 1, { dashboardAuth: { role: "GV" } }, loadOpts(src));
    assert.equal(gv.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
  });

  it("annual: exclude open/future, 0 participates, ties raw, SOURCE_PARTIAL, no ranking", async () => {
    const values = { 1: 5, 2: 6, 3: 0, 4: 9, 5: 9, 6: 3, 7: 4 };
    const map = yearMap(values);
    map["2026-8"] = { versions: [], lines: {} };
    const src = makeSource(map);
    const max = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(src, { question: Q.P3 })
    );
    assert.equal(max.ok, true);
    assert.equal(max.coverage_complete, false);
    assert.equal(max.winners.length, 2);
    assert.equal(max.winners[0].margin_kg, 9);
    assert.ok(max.included_months.some((m) => m.month === 3 && m.margin_kg === 0));
    assert.ok(!max.candidate_months.includes("2026-09"));
    assert.ok(!max.candidate_months.includes("2026-10"));
    const min = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(src, { question: Q.P4 })
    );
    assert.equal(min.winners[0].margin_kg, 0);
    const errMap = yearMap({ 1: 5, 2: 6 });
    errMap["2026-3"] = { throw: true };
    const partial = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(makeSource(errMap), { question: Q.P3 })
    );
    assert.equal(partial.veracity, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
    const empty = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(makeSource({}), { question: Q.P3 })
    );
    assert.equal(empty.ok, false);
    assert.equal(empty.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    const rawTie = { 4: 7.114, 5: 7.115 };
    const near = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(makeSource(yearMap(rawTie)), { question: Q.P3 })
    );
    assert.equal(near.winners.length, 1);
    assert.equal(near.winners[0].month, 5);
    const neg = await loadHistoricalMarginForChat(
      null,
      1,
      { dashboardAuth: { role: "ZP" } },
      loadOpts(makeSource(yearMap({ 1: -1.5, 2: 2 })), { question: Q.P4 })
    );
    assert.equal(neg.winners[0].margin_kg, -1.5);
  });

  it("strict matcher: unique GT prefix vs three-way ambiguous", () => {
    const three = [
      { empresa: "ACAPULCO", margen_kg: 1 },
      { empresa: "GTM ACAPULCO", margen_kg: 2 },
      { empresa: "ACAPULCO DIAMANTE", margen_kg: 3 },
    ];
    const amb = findUniquePlantRow(three, "AC", "Acapulco");
    assert.equal(amb.ambiguous, true);
    const one = findUniquePlantRow([{ empresa: "GTM ACAPULCO", margen_kg: 2 }], "AC", "Acapulco");
    assert.equal(one.ok, true);
    assert.equal(one.row.empresa, "GTM ACAPULCO");
    const exact = findUniquePlantRow([{ empresa: "Acapulco", margen_kg: 4 }], "AC", "Acapulco");
    assert.equal(exact.ok, true);
  });

  it("no latest-as-FINAL / no helper / no HTTP", () => {
    const src = fs.readFileSync(path.join(LIB, "director-ia-historical-margin.js"), "utf8");
    assert.doesNotMatch(src, /getMargenKgPorPeriodo\s*\(/);
    assert.doesNotMatch(src, /ILIKE\s+'/);
    assert.doesNotMatch(src, /axios/);
    assert.doesNotMatch(src, /\bINSERT\b|\bUPDATE\b|\bDELETE\b/);
  });
});
