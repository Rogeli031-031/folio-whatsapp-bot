"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  FAMILY_IDS,
  classifyRegulationFamily,
  isRegulationStatusQuestion,
  isTallerExpenseQuestion,
  scoreSehOperacion,
  loadSehRegulationForChat,
  buildSehRegulationAnswer,
  buildLegalDetailAnswer,
  matchExpectedClients,
  buildExpectedNextAnswer,
  enrichExpensePeriod,
} = require("../lib/director-ia-seh-taller-purchase-evidence-008");
const { extractExpenseAnalyticsSpec, loadExpenseAnalyticsForChat, buildExpenseAnalyticsAnswer } = require("../lib/director-ia-expense-analytics");
const { isPredictiveCommercialQuestion, loadPredictiveForChat, buildPredictiveAnswer } = require("../lib/director-ia-predictive-commercial");
const { extractExplicitPlant, isExecutiveStatusQuestion } = require("../lib/director-ia-conversational-executive-layer");
const {
  FAMILY_IDS: FIX_FAMILIES,
  REGULATION_STATUS_UTTERANCES,
  REGULATION_PLANT_DETAIL_UTTERANCES,
  TALLER_EXPENSE_UTTERANCES,
  TALLER_PERIOD_MATRIX,
  EXPECTED_NEXT_PURCHASE_UTTERANCES,
  LITERAL_REGRESSIONS,
  ANTI_COLLISIONS,
  MULTI_TURN,
  SAMPLE_EQUIPOS,
  SAMPLE_CARPETAS,
  SAMPLE_TALLER_FOLIOS,
  SAMPLE_DICF_ROWS,
} = require("./fixtures/director-ia-seh-taller-purchase-evidence-008");

const NOW = new Date("2026-09-17T12:00:00-06:00");
const AUTH = { role: "ADMIN", plantaIds: [1] };

function allUtterances() {
  return [
    ...REGULATION_STATUS_UTTERANCES,
    ...REGULATION_PLANT_DETAIL_UTTERANCES,
    ...TALLER_EXPENSE_UTTERANCES,
    ...EXPECTED_NEXT_PURCHASE_UTTERANCES,
  ];
}

function queryPublicFolios(_client, _plantaId, mesCargo) {
  return SAMPLE_TALLER_FOLIOS.filter((row) => row.mes_cargo === mesCargo);
}

describe("008 cobertura de fixtures", () => {
  it("define 4 familias y >=90 utterances nuevas", () => {
    assert.deepEqual([...FAMILY_IDS], [...FIX_FAMILIES]);
    const all = allUtterances();
    const uniq = new Set(all.map((s) => String(s).trim().toLowerCase()));
    assert.ok(REGULATION_STATUS_UTTERANCES.length >= 30, "REGULATION_STATUS");
    assert.ok(REGULATION_PLANT_DETAIL_UTTERANCES.length >= 30, "REGULATION_PLANT_DETAIL");
    assert.ok(TALLER_EXPENSE_UTTERANCES.length >= 30, "TALLER_EXPENSE");
    assert.ok(EXPECTED_NEXT_PURCHASE_UTTERANCES.length >= 30, "EXPECTED_NEXT_PURCHASE");
    assert.ok(all.length >= 90, `utterances ${all.length}`);
    assert.ok(uniq.size >= 90, `uniq ${uniq.size}`);
  });

  it(">=120 anti-collisions y >=60 multi-turn", () => {
    assert.ok(ANTI_COLLISIONS.length >= 120, `anti ${ANTI_COLLISIONS.length}`);
    assert.ok(MULTI_TURN.length >= 60, `multi ${MULTI_TURN.length}`);
  });

  it("30 formas REGULATION_STATUS clasifican a su familia", () => {
    const misses = [];
    for (const q of REGULATION_STATUS_UTTERANCES) {
      const got = classifyRegulationFamily(q);
      if (got !== "REGULATION_STATUS") misses.push(`${got} :: ${q}`);
    }
    assert.equal(misses.length, 0, misses.slice(0, 20).join("\n"));
  });

  it("detalle documental clasifica REGULATION_PLANT_DETAIL", () => {
    const misses = [];
    for (const q of REGULATION_PLANT_DETAIL_UTTERANCES) {
      const got = classifyRegulationFamily(q);
      if (got !== "REGULATION_PLANT_DETAIL") misses.push(`${got} :: ${q}`);
    }
    assert.equal(misses.length, 0, misses.slice(0, 20).join("\n"));
  });

  it("30 formas TALLER_EXPENSE no caen en predictive", () => {
    const misses = [];
    for (const q of TALLER_EXPENSE_UTTERANCES) {
      if (!isTallerExpenseQuestion(q)) misses.push(`no-taller :: ${q}`);
      if (isPredictiveCommercialQuestion(q)) misses.push(`predictive :: ${q}`);
      const intent = planDirectorIaQuestion(q).intent;
      if (intent !== "expense_analytics") misses.push(`${intent} :: ${q}`);
    }
    assert.equal(misses.length, 0, misses.slice(0, 20).join("\n"));
  });
});

describe("008 planner y anti-colisiones", () => {
  it("regresiones literales de intent", () => {
    for (const row of LITERAL_REGRESSIONS) {
      assert.equal(planDirectorIaQuestion(row.q).intent, row.intent, row.q);
    }
  });

  it("anti-collisions respetan intent/familia", () => {
    const misses = [];
    for (const row of ANTI_COLLISIONS) {
      const plan = planDirectorIaQuestion(row.q);
      if (row.not_intent && plan.intent === row.not_intent) misses.push(`${row.q} → ${plan.intent}`);
      if (row.not_family) {
        const fam = classifyRegulationFamily(row.q);
        const taller = isTallerExpenseQuestion(row.q) ? "TALLER_EXPENSE" : null;
        const pred = isPredictiveCommercialQuestion(row.q) ? "EXPECTED_NEXT_PURCHASE" : null;
        if (fam === row.not_family || taller === row.not_family || pred === row.not_family) {
          misses.push(`${row.q} family ${row.not_family}`);
        }
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 25).join("\n"));
  });

  it("multi-turn conserva intent", () => {
    const misses = [];
    for (const seq of MULTI_TURN) {
      let prior = null;
      for (let i = 0; i < seq.turns.length; i += 1) {
        const q = seq.turns[i];
        const plan = planDirectorIaQuestion(q, { prior, inheritParentIntent: prior && prior.parent_intent });
        const forced =
          prior && prior.parent_intent && plan.intent === "unknown"
            ? planDirectorIaQuestion(q, { forceIntent: prior.parent_intent })
            : plan;
        const expect = seq.expect[i];
        if (forced.intent !== expect && plan.intent !== expect) {
          if (
            expect === "expense_analytics" &&
            (isTallerExpenseQuestion(q) || /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|enero a septiembre|enero-septiembre|ano a la fecha|de enero a septiembre|del 1|este ano|acumulado)/.test(
              String(q)
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
            ))
          ) {
            prior = { parent_intent: "expense_analytics", family: "TALLER_EXPENSE" };
            continue;
          }
          if (expect === "seh_regulation" && (isRegulationStatusQuestion(q, prior) || classifyRegulationFamily(q, prior))) {
            prior = { parent_intent: "seh_regulation" };
            continue;
          }
          if (expect === "predictive_commercial" && isPredictiveCommercialQuestion(q, prior)) {
            prior = { parent_intent: "predictive_commercial", family: "EXPECTED_NEXT_PURCHASE" };
            continue;
          }
          misses.push(`${seq.turns.join(" | ")} [${i}] ${plan.intent} != ${expect}`);
        }
        prior = { parent_intent: expect, family: expect === "predictive_commercial" ? "EXPECTED_NEXT_PURCHASE" : expect };
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 20).join("\n"));
  });
});

describe("008 SEH / regulación física", () => {
  it("no trata regulaciones como planta y no pide Acapulco si ya está", async () => {
    assert.equal(extractExplicitPlant("¿Cómo estamos en regulaciones?", [{ id: 1, nombre: "Acapulco" }]), null);
    assert.equal(isExecutiveStatusQuestion("¿Cómo estamos en regulaciones?"), false);
    const pack = await loadSehRegulationForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      question: "¿Cómo estamos en regulaciones?",
      equipoRows: SAMPLE_EQUIPOS,
      carpetaRows: SAMPLE_CARPETAS,
      plant_label: "Acapulco",
    });
    assert.equal(pack.ok, true);
    assert.equal(pack.clarification, undefined);
    assert.equal(pack.plant_label, "Acapulco");
    const answer = buildSehRegulationAnswer(pack);
    assert.match(answer, /Acapulco — cumplimiento SEH/);
    assert.match(answer, /PLANTA/);
    assert.match(answer, /ESTACIÓN/);
    assert.match(answer, /AUTOTANQUE/);
    assert.doesNotMatch(answer, /Mencionaste regulaciones/);
    assert.doesNotMatch(answer, /70%/);
    const planta = pack.ambitos.planta;
    assert.equal(planta.complying, planta.complying);
    assert.ok(planta.total > 0);
  });

  it("agrega con la misma regla que /seh/cumplimiento", async () => {
    const today = "2026-09-17";
    const opPlanta = scoreSehOperacion(SAMPLE_EQUIPOS, ["PLANTA", "SISTEMA CONTRA INCENDIO"], today);
    const opEst = scoreSehOperacion(SAMPLE_EQUIPOS, ["ESTACIONES"], today);
    const opAuto = scoreSehOperacion(SAMPLE_EQUIPOS, ["PIPAS"], today);
    assert.equal(opEst.total, 1);
    assert.equal(opEst.complying, 1);
    assert.equal(opAuto.total, 1);
    assert.equal(opAuto.complying, 1);
    assert.ok(opPlanta.total >= 2);
    const pack = await loadSehRegulationForChat(null, 1, { body: { planta_nombre: "Acapulco" } }, {
      question: "¿Cómo estamos en regulaciones?",
      equipoRows: SAMPLE_EQUIPOS,
      carpetaRows: SAMPLE_CARPETAS,
      plant_label: "Acapulco",
    });
    assert.equal(pack.ambitos.estacion.complying, opEst.complying);
    assert.equal(pack.ambitos.estacion.total, opEst.total);
    assert.equal(pack.ambitos.autotanque.complying, opAuto.complying);
    const answer = buildSehRegulationAnswer(pack);
    assert.match(answer, new RegExp(`${pack.ambitos.planta.complying} de ${pack.ambitos.planta.total}`));
  });

  it("regulación de planta baja a detalle físico y no inventa estados", () => {
    const answer = buildLegalDetailAnswer(SAMPLE_CARPETAS, "¿Qué tenemos sin estado?", "Acapulco");
    assert.match(answer, /Sin estado|sin estado/i);
    assert.match(answer, /1\.2/);
    assert.doesNotMatch(answer, /invent/);
    const vencidos = buildLegalDetailAnswer(SAMPLE_CARPETAS, "¿Qué permisos están vencidos?", "Acapulco");
    assert.match(vencidos, /3\.1/);
    const vigentes = buildLegalDetailAnswer(SAMPLE_CARPETAS, "¿Qué documentos están vigentes?", "Acapulco");
    assert.match(vigentes, /1\.1/);
  });
});

describe("008 Taller SUM", () => {
  it("matriz de periodos resuelve el mismo rango físico", () => {
    const enero = extractExpenseAnalyticsSpec("¿Cuánto gastamos en taller en enero?", { now: NOW });
    assert.equal(enero.ok, true);
    assert.equal(enero.domain, "TALLER");
    assert.equal(enero.metric, "SUM");
    assert.deepEqual(enero.months, ["2026-01"]);
    const agosto = extractExpenseAnalyticsSpec("¿Cuánto gastamos en taller en agosto?", { now: NOW });
    assert.deepEqual(agosto.months, ["2026-08"]);
    const range = extractExpenseAnalyticsSpec("¿Cuánto gastamos en taller de enero a septiembre?", { now: NOW });
    assert.equal(range.period_start, "2026-01");
    assert.equal(range.period_end, "2026-09");
    assert.ok(range.months.includes("2026-01") && range.months.includes("2026-09"));
    const hyphen = enrichExpensePeriod("acumulado enero-septiembre", {}, NOW);
    assert.equal(hyphen.period_start, "2026-01");
    assert.equal(hyphen.period_end, "2026-09");
    const ytd = enrichExpensePeriod("año a la fecha", {}, NOW);
    assert.equal(ytd.period_start, "2026-01");
    assert.equal(ytd.period_end, "2026-09");
    const formal = enrichExpensePeriod("del 1 de enero al 30 de septiembre", {}, NOW);
    assert.equal(formal.period_start, "2026-01");
    assert.equal(formal.period_end, "2026-09");
    const hasta = enrichExpensePeriod("este año hasta septiembre", {}, NOW);
    assert.equal(hasta.period_end, "2026-09");
    assert.ok(TALLER_PERIOD_MATRIX.length === 4);
  });

  it("suma folios Taller del rango y no inventa IGF", async () => {
    const payload = await loadExpenseAnalyticsForChat(null, 1, { dashboardAuth: AUTH }, {
      question: "¿Cuánto gastamos en taller de enero a septiembre?",
      now: NOW,
      queryPublicFolios,
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.spec.domain, "TALLER");
    assert.equal(payload.spec.metric, "SUM");
    assert.equal(payload.analysis.sum, 9000);
    const answer = buildExpenseAnalyticsAnswer(payload);
    assert.match(answer, /se gastaron/);
    assert.match(answer, /Taller/);
    assert.doesNotMatch(answer, /venta observada/);
    assert.doesNotMatch(answer, /forecast/i);
  });

  it("sin periodo pide mes y enero conserva TALLER+SUM", async () => {
    const missing = await loadExpenseAnalyticsForChat(null, 1, { dashboardAuth: AUTH }, {
      question: "¿Cuánto gastamos en taller?",
      now: NOW,
      queryPublicFolios,
    });
    assert.equal(missing.missing_period, true);
    assert.match(missing.clarification, /mes o periodo/i);
    const january = extractExpenseAnalyticsSpec("¿Cuánto gastamos en taller? enero", {
      now: NOW,
      inheritedDomain: "TALLER",
      inheritedMetric: "SUM",
    });
    assert.equal(january.ok, true);
    assert.equal(january.domain, "TALLER");
    assert.equal(january.metric, "SUM");
    assert.deepEqual(january.months, ["2026-01"]);
  });
});

describe("008 próxima compra física", () => {
  it("TORTILLERIA ERICK resuelve canónico y ERICK ambiguo se aclara", () => {
    const exact = matchExpectedClients(SAMPLE_DICF_ROWS, "TORTILLERIA ERICK");
    assert.equal(exact.status, "unique");
    assert.equal(exact.rows[0].cliente, "TORTILLERIA ERICK");
    const variant = matchExpectedClients(SAMPLE_DICF_ROWS, "Tortillería Erick");
    assert.equal(variant.status, "unique");
    const lower = matchExpectedClients(SAMPLE_DICF_ROWS, "tortilleria erick");
    assert.equal(lower.status, "unique");
    const ambi = matchExpectedClients(SAMPLE_DICF_ROWS, "ERICK");
    assert.equal(ambi.status, "ambiguous");
  });

  it("expected = last + freqDays y no Invalid time value", async () => {
    const payload = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      dicfRows: SAMPLE_DICF_ROWS,
      plantCodes: ["ACA"],
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.family, "EXPECTED_NEXT_PURCHASE");
    assert.ok(payload.expected && payload.expected.length === 1);
    assert.equal(payload.expected[0].cliente, "TORTILLERIA ERICK");
    assert.equal(payload.expected[0].expected_next, "2026-09-17");
    const answer = buildPredictiveAnswer(payload);
    assert.doesNotMatch(answer, /Invalid time/i);
    assert.doesNotMatch(answer, /falta last_purchase_date/);
    assert.match(answer, /10\/09\/2026|2026-09-10|10\/09/);
    assert.match(answer, /estimación basada en frecuencia histórica/i);
    assert.match(answer, /no un compromiso ni forecast contractual/i);
    const built = buildExpectedNextAnswer(payload.expected[0]);
    assert.match(built, /cada 7 días/);
  });

  it("INSUFFICIENT_EVIDENCE solo si falta evidencia física real", async () => {
    const missingLast = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      dicfRows: [{ cliente: "TORTILLERIA ERICK", freqDays: 7, lastPurchaseDate: null }],
      plantCodes: ["ACA"],
    });
    assert.match(buildPredictiveAnswer(missingLast), /INSUFFICIENT_EVIDENCE/);
    const missingFreq = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      dicfRows: [{ cliente: "TORTILLERIA ERICK", freqDays: null, lastPurchaseDate: "2026-09-10" }],
      plantCodes: ["ACA"],
    });
    assert.match(buildPredictiveAnswer(missingFreq), /INSUFFICIENT_EVIDENCE/);
  });
});

describe("008 askDirectorIa regresiones exactas", () => {
  it("regulaciones / taller rango / taller+enero / TORTILLERIA ERICK", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      sehEquipoRows: SAMPLE_EQUIPOS,
      sehCarpetaRows: SAMPLE_CARPETAS,
      queryPublicFolios,
      predictiveDicfRows: SAMPLE_DICF_ROWS,
      predictivePlantCodes: ["ACA"],
    });
    const seh = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Cómo estamos en regulaciones?"
    );
    assert.equal(seh.ok, true);
    assert.match(seh.answer, /Acapulco — cumplimiento SEH/);
    assert.doesNotMatch(seh.answer, /Mencionaste regulaciones/);
    assert.doesNotMatch(seh.answer, /¿De qué planta/);

    const range = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Cuánto gastamos en taller de enero a septiembre?"
    );
    assert.equal(range.ok, true);
    assert.match(range.answer, /se gastaron/);
    assert.match(range.answer, /Taller/);
    assert.doesNotMatch(range.answer, /venta observada/);

    const askPeriod = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Cuánto gastamos en taller?"
    );
    assert.match(askPeriod.answer, /mes o periodo/i);
    const enero = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: askPeriod.context_meta.conversation_state,
        },
        dashboardAuth: AUTH,
      },
      1,
      "enero"
    );
    assert.equal(enero.ok, true);
    assert.match(enero.answer, /Taller/);
    assert.match(enero.answer, /se gastaron/);
    assert.doesNotMatch(enero.answer, /venta observada/);

    const next = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?"
    );
    assert.equal(next.ok, true);
    assert.doesNotMatch(next.answer, /Invalid time/i);
    assert.doesNotMatch(next.answer, /falta last_purchase_date/);
    assert.match(next.answer, /TORTILLERIA ERICK/);
    assert.match(next.answer, /estimación basada en frecuencia histórica/i);
  });
});
