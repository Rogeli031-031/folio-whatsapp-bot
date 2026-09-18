"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { loadPredictiveForChat, buildPredictiveAnswer, isExpectedNextPurchaseQuestion } = require("../lib/director-ia-predictive-commercial");
const {
  FAMILY_IDS,
  SOURCE_PRIORITY,
  enrichDicfClientsLastPurchase,
  classifyPurchaseEvidenceFamily,
  addDaysYmd,
  folioStatusBreakdown,
  formatTallerStatusLines,
} = require("../lib/director-ia-purchase-evidence-enrichment-009");
const { loadExpenseAnalyticsForChat, buildExpenseAnalyticsAnswer } = require("../lib/director-ia-expense-analytics");
const {
  FAMILY_IDS: FIX_FAMILIES,
  EXPECTED_NEXT_ENRICHED,
  EVIDENCE_DETAIL,
  ANTI_COLLISIONS,
  MULTI_TURN,
  INCOMPLETE_COMPUTE_DICF,
  SYNTHETIC_COMPUTE_DICF,
  TALLER_OTHER_STATUS_FOLIOS,
} = require("./fixtures/director-ia-purchase-evidence-enrichment-009");

const NOW = new Date("2026-09-17T12:00:00-06:00");
const AUTH = { role: "ADMIN", plantaIds: [1] };

describe("009 cobertura de fixtures", () => {
  it("define familias y umbrales de utterances", () => {
    assert.deepEqual([...FAMILY_IDS], [...FIX_FAMILIES]);
    assert.ok(EXPECTED_NEXT_ENRICHED.length >= 30, String(EXPECTED_NEXT_ENRICHED.length));
    assert.ok(EVIDENCE_DETAIL.length >= 20, String(EVIDENCE_DETAIL.length));
    assert.ok(ANTI_COLLISIONS.length >= 50, String(ANTI_COLLISIONS.length));
    assert.ok(MULTI_TURN.length >= 30, String(MULTI_TURN.length));
    assert.deepEqual(SOURCE_PRIORITY.lastPurchaseDate, [
      "computeDicf.lastPurchaseDate",
      "arr.dicf_cliente_mes.last_date",
      "arr.ventas_diarias_cliente.MAX(fecha)",
    ]);
  });

  it("variantes expected-next y detalle clasifican", () => {
    const misses = [];
    for (const q of EXPECTED_NEXT_ENRICHED) {
      const got = classifyPurchaseEvidenceFamily(q);
      if (got !== "EXPECTED_NEXT_PURCHASE_ENRICHED") misses.push(`${got} :: ${q}`);
    }
    for (const q of EVIDENCE_DETAIL) {
      const got = classifyPurchaseEvidenceFamily(q);
      if (!["LAST_PURCHASE", "PURCHASE_FREQUENCY", "PURCHASE_OVERDUE"].includes(got)) {
        misses.push(`${got} :: ${q}`);
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 15).join("\n"));
  });

  it("anti-collisions no caen en familias 009", () => {
    const misses = [];
    for (const row of ANTI_COLLISIONS) {
      const got = classifyPurchaseEvidenceFamily(row.q);
      if (got === row.not_family) misses.push(`${row.q} → ${got}`);
    }
    assert.equal(misses.length, 0, misses.slice(0, 15).join("\n"));
  });

  it("multi-turn conserva familia o intent", () => {
    const misses = [];
    for (const seq of MULTI_TURN) {
      let prior = null;
      for (let i = 0; i < seq.turns.length; i += 1) {
        const q = seq.turns[i];
        if (seq.families) {
          const got = classifyPurchaseEvidenceFamily(q) || (prior && prior.family);
          if (got !== seq.families[i] && classifyPurchaseEvidenceFamily(q) !== seq.families[i]) {
            if (prior && seq.families[i] && /^(y\s+)?(cual|cada|esta|cuantos)/.test(
              String(q).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            )) {
              prior = { family: seq.families[i] };
              continue;
            }
            misses.push(`${seq.turns.join(" | ")} [${i}] ${got} != ${seq.families[i]}`);
          }
          prior = { family: seq.families[i] };
        } else {
          const plan = planDirectorIaQuestion(q, { prior, inheritParentIntent: prior && prior.parent_intent });
          if (plan.intent !== seq.intents[i] && !(prior && prior.parent_intent === seq.intents[i])) {
            misses.push(`${seq.turns.join(" | ")} [${i}] ${plan.intent} != ${seq.intents[i]}`);
          }
          prior = { parent_intent: seq.intents[i], family: "TALLER_EXPENSE" };
        }
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 12).join("\n"));
  });
});

describe("009 enriquecimiento de última compra", () => {
  it("prioridad A computeDicf.lastPurchaseDate no se pisa", async () => {
    const rows = await enrichDicfClientsLastPurchase(
      [{ cliente: "CLIENTE TEST", freqDays: 14, lastPurchaseDate: "2026-08-01" }],
      {
        dicfCacheRows: [{ cliente: "CLIENTE TEST", lastPurchaseDate: "2026-09-01", freqDays: 99 }],
        ventasMaxByClient: { "cliente test": "2026-09-10" },
      }
    );
    assert.equal(rows[0].lastPurchaseDate, "2026-08-01");
    assert.equal(rows[0].freqDays, 14);
    assert.equal(rows[0].last_source, "computeDicf.lastPurchaseDate");
    assert.equal(rows[0].freq_source, "computeDicf.freqDays");
  });

  it("prioridad B usa cache last_date si computeDicf viene null", async () => {
    const rows = await enrichDicfClientsLastPurchase(
      [{ cliente: "CLIENTE TEST", freqDays: 14, lastPurchaseDate: null }],
      {
        dicfCacheRows: [{ cliente: "CLIENTE TEST", lastPurchaseDate: "2026-09-01", freqDays: 99 }],
        ventasMaxByClient: { "cliente test": "2026-09-10" },
      }
    );
    assert.equal(rows[0].lastPurchaseDate, "2026-09-01");
    assert.equal(rows[0].freqDays, 14);
    assert.equal(rows[0].last_source, "arr.dicf_cliente_mes.last_date");
  });

  it("fixture sintético: cache null y MAX(fecha) 2026-09-10 → expected 2026-09-24", async () => {
    const incomplete = SYNTHETIC_COMPUTE_DICF.disminuyeron.clientes;
    assert.equal(incomplete[0].lastPurchaseDate, null);
    const rows = await enrichDicfClientsLastPurchase(incomplete, {
      dicfCacheRows: [{ cliente: "CLIENTE TEST", lastPurchaseDate: null, freqDays: 14 }],
      ventasMaxByClient: { "cliente test": "2026-09-10" },
    });
    assert.equal(rows[0].lastPurchaseDate, "2026-09-10");
    assert.equal(rows[0].freqDays, 14);
    assert.equal(rows[0].last_source, "arr.ventas_diarias_cliente.MAX(fecha)");
    assert.equal(addDaysYmd(rows[0].lastPurchaseDate, rows[0].freqDays), "2026-09-24");
    const payload = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      question: "¿Cuándo esperamos que vuelva a comprar CLIENTE TEST?",
      now: NOW,
      computeDicf: async () => SYNTHETIC_COMPUTE_DICF,
      dicfCacheRows: [{ cliente: "CLIENTE TEST", lastPurchaseDate: null, freqDays: 14 }],
      ventasMaxByClient: { "cliente test": "2026-09-10" },
      plantCodes: ["ACA"],
    });
    assert.equal(payload.family, "EXPECTED_NEXT_PURCHASE");
    assert.equal(payload.expected[0].lastPurchaseDate, "2026-09-10");
    assert.equal(payload.expected[0].historical_frequency, 14);
    assert.equal(payload.expected[0].expected_next, "2026-09-24");
    assert.doesNotMatch(buildPredictiveAnswer(payload), /INSUFFICIENT_EVIDENCE/);
  });

  it("regresión literal TORTILLERIA ERICK sin lastPurchaseDate inyectado", async () => {
    assert.equal(INCOMPLETE_COMPUTE_DICF.aumentaron.clientes[0].lastPurchaseDate, null);
    const payload = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      computeDicf: async () => INCOMPLETE_COMPUTE_DICF,
      dicfCacheRows: [{ cliente: "TORTILLERIA ERICK", lastPurchaseDate: null, freqDays: 7 }],
      ventasMaxByClient: { "tortilleria erick": "2026-09-10" },
      plantCodes: ["ACA"],
    });
    assert.equal(payload.ok, true);
    assert.ok(payload.expected && payload.expected.length === 1);
    assert.equal(payload.expected[0].cliente, "TORTILLERIA ERICK");
    assert.equal(payload.expected[0].lastPurchaseDate, "2026-09-10");
    assert.equal(payload.expected[0].historical_frequency, 7);
    assert.equal(payload.expected[0].expected_next, "2026-09-17");
    const answer = buildPredictiveAnswer(payload);
    assert.doesNotMatch(answer, /INSUFFICIENT_EVIDENCE/);
    assert.doesNotMatch(answer, /Invalid time/i);
    assert.match(answer, /10\/09\/2026/);
    assert.match(answer, /estimación basada en frecuencia histórica/i);
  });

  it("variantes canónicas reconcilian cliente_norm", async () => {
    for (const name of ["TORTILLERIA ERICK", "Tortillería Erick", "tortilleria erick"]) {
      const rows = await enrichDicfClientsLastPurchase(
        [{ cliente: name, freqDays: 7, lastPurchaseDate: null }],
        { ventasMaxByClient: { "tortilleria erick": "2026-09-10" } }
      );
      assert.equal(rows[0].lastPurchaseDate, "2026-09-10", name);
    }
  });

  it("preguntas derivadas usan la misma evidencia enriquecida", async () => {
    const opts = {
      now: NOW,
      computeDicf: async () => INCOMPLETE_COMPUTE_DICF,
      dicfCacheRows: [{ cliente: "TORTILLERIA ERICK", lastPurchaseDate: null, freqDays: 7 }],
      ventasMaxByClient: { "tortilleria erick": "2026-09-10" },
      plantCodes: ["ACA"],
    };
    const last = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      ...opts,
      question: "¿Cuál fue la última compra de TORTILLERIA ERICK?",
    });
    assert.match(buildPredictiveAnswer(last), /10\/09\/2026/);
    const freq = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      ...opts,
      question: "¿Cada cuántos días compra TORTILLERIA ERICK?",
    });
    assert.match(buildPredictiveAnswer(freq), /cada 7 días/);
    const overdue = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      ...opts,
      question: "¿Está atrasada TORTILLERIA ERICK?",
    });
    const overdueAns = buildPredictiveAnswer(overdue);
    assert.match(overdueAns, /días sin comprar|atrasad/i);
    const days = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      ...opts,
      question: "¿Cuántos días lleva sin comprar TORTILLERIA ERICK?",
    });
    assert.match(buildPredictiveAnswer(days), /días sin comprar/);
    const should = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      ...opts,
      question: "¿Cuándo debería haber comprado otra vez TORTILLERIA ERICK?",
    });
    assert.match(buildPredictiveAnswer(should), /17\/09\/2026|2026-09-17/);
    assert.equal(isExpectedNextPurchaseQuestion("¿Está atrasada TORTILLERIA ERICK?"), true);
  });
});

describe("009 Taller otros estados", () => {
  it("muestra otros estados sin reclasificar", async () => {
    const breakdown = folioStatusBreakdown(TALLER_OTHER_STATUS_FOLIOS);
    assert.equal(breakdown.total, 3);
    assert.equal(breakdown.paid, 1);
    assert.equal(breakdown.pending, 1);
    assert.equal(breakdown.other, 1);
    assert.ok(breakdown.total !== breakdown.paid + breakdown.pending);
    const lines = formatTallerStatusLines(breakdown);
    assert.ok(lines.includes("1 en otros estados"));
    const payload = await loadExpenseAnalyticsForChat(null, 1, { dashboardAuth: AUTH }, {
      question: "¿Cuánto gastamos en taller en enero?",
      now: NOW,
      queryPublicFolios: () => TALLER_OTHER_STATUS_FOLIOS,
    });
    const answer = buildExpenseAnalyticsAnswer(payload);
    assert.match(answer, /1 pagados/);
    assert.match(answer, /1 pendientes/);
    assert.match(answer, /1 en otros estados/);
    const other = {
      ok: true,
      spec: { domain: "TALLER", metric: "SUM", question: "¿Y cuántos están en otros estados?", period_month: "2026-01" },
      analysis: { sum: 300, eligible_count: 3 },
      records: TALLER_OTHER_STATUS_FOLIOS,
    };
    assert.match(buildExpenseAnalyticsAnswer(other), /1 en otros estados/);
  });
});

describe("009 askDirectorIa E2E sin fila completa", () => {
  it("TORTILLERIA ERICK se enriquece desde ventas y no pide last_purchase_date", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      computeDicf: async () => INCOMPLETE_COMPUTE_DICF,
      dicfCacheRows: [{ cliente: "TORTILLERIA ERICK", lastPurchaseDate: null, freqDays: 7 }],
      ventasMaxByClient: { "tortilleria erick": "2026-09-10" },
      predictivePlantCodes: ["ACA"],
    });
    const next = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?"
    );
    assert.equal(next.ok, true);
    assert.doesNotMatch(next.answer, /INSUFFICIENT_EVIDENCE/);
    assert.doesNotMatch(next.answer, /falta last_purchase_date/);
    assert.match(next.answer, /TORTILLERIA ERICK/);
    assert.match(next.answer, /10\/09\/2026/);
    const last = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", conversation_state: next.context_meta.conversation_state }, dashboardAuth: AUTH },
      1,
      "¿Cuál fue su última compra?"
    );
    assert.match(last.answer, /10\/09\/2026/);
  });
});
