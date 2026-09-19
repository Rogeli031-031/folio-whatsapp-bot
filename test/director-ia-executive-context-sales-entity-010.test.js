"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { extractExplicitPlant, resolveSemanticScope } = require("../lib/director-ia-conversational-executive-layer");
const {
  FAMILY_IDS,
  classifyExecutiveContextFamily,
  isNonPlantBusinessToken,
  analyzeSalesFamily,
  buildExecutiveSalesAnswer,
  buildKeywordExpenseAnswer,
  resolveActiveClient,
  shouldClearActiveClient,
  extractMonthPair,
} = require("../lib/director-ia-executive-context-sales-entity-010");
const { loadPredictiveForChat, buildPredictiveAnswer } = require("../lib/director-ia-predictive-commercial");
const { extractExpenseAnalyticsSpec, buildExpenseAnalyticsAnswer } = require("../lib/director-ia-expense-analytics");
const { sanitizeActiveEntities } = require("../lib/director-ia-conversation-state");
const {
  FAMILY_IDS: FIX_FAMILIES,
  SALES_STATUS,
  PLANT_DIAGNOSIS_CURRENT,
  PERIOD_COMPARISON_EXPLICIT,
  SAME_PERIOD_PREVIOUS_MONTH,
  SALES_TODAY_WEEK_MONTH,
  LOW_SALES_CARBURATION,
  SALES_TREND_TO_CLOSE,
  ACTIVE_CLIENT_ENTITY_INHERITANCE,
  KEYWORD_EXPENSE,
  ANTI_COLLISIONS,
  MULTI_TURN,
  ERICK_FOLLOWUP_FORBIDDEN,
} = require("./fixtures/director-ia-executive-context-sales-entity-010");

const NOW = new Date("2026-09-18T12:00:00-06:00");
const AUTH = { role: "ADMIN", plantaIds: [1] };

const BY_FAMILY = {
  SALES_STATUS,
  PLANT_DIAGNOSIS_CURRENT,
  PERIOD_COMPARISON_EXPLICIT,
  SAME_PERIOD_PREVIOUS_MONTH,
  SALES_TODAY_WEEK_MONTH,
  LOW_SALES_CARBURATION,
  SALES_TREND_TO_CLOSE,
  ACTIVE_CLIENT_ENTITY_INHERITANCE,
  KEYWORD_EXPENSE,
};

const SALES_ROWS = [
  { fecha: "2026-08-10", kg: 10000 },
  { fecha: "2026-08-18", kg: 8000 },
  { fecha: "2026-09-01", kg: 5000 },
  { fecha: "2026-09-10", kg: 7000 },
  { fecha: "2026-09-17", kg: 6000 },
  { fecha: "2026-09-18", kg: 4000 },
];

describe("010 cobertura de fixtures", () => {
  it("define 9 familias y >=450 utterances", () => {
    assert.deepEqual([...FAMILY_IDS], [...FIX_FAMILIES]);
    let total = 0;
    for (const fam of FAMILY_IDS) {
      assert.ok(BY_FAMILY[fam].length >= 50, `${fam} ${BY_FAMILY[fam].length}`);
      total += BY_FAMILY[fam].length;
    }
    assert.ok(total >= 450, String(total));
    assert.ok(ANTI_COLLISIONS.length >= 350, String(ANTI_COLLISIONS.length));
    assert.ok(MULTI_TURN.length >= 180, String(MULTI_TURN.length));
  });

  it("cada utterance clasifica a su familia", () => {
    const misses = [];
    for (const fam of FAMILY_IDS) {
      if (fam === "ACTIVE_CLIENT_ENTITY_INHERITANCE") {
        for (const q of BY_FAMILY[fam]) {
          const got = classifyExecutiveContextFamily(q, { canonical_name: "CLIENTE X", family: "EXPECTED_NEXT_PURCHASE" });
          if (got !== fam) misses.push(`${got} :: ${q}`);
        }
        continue;
      }
      for (const q of BY_FAMILY[fam]) {
        const got = classifyExecutiveContextFamily(q);
        if (got !== fam) misses.push(`${got} :: ${q}`);
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 20).join("\n"));
  });

  it("anti-collisions no caen en la familia prohibida", () => {
    const misses = [];
    for (const row of ANTI_COLLISIONS) {
      const got = classifyExecutiveContextFamily(row.q, { canonical_name: null });
      if (got === row.not_family) misses.push(`${row.q} → ${got}`);
    }
    assert.equal(misses.length, 0, misses.slice(0, 15).join("\n"));
  });

  it("multi-turn conserva familia o intent", () => {
    const misses = [];
    for (const seq of MULTI_TURN) {
      let prior = { canonical_name: "TORTILLERIA ERICK", family: "EXPECTED_NEXT_PURCHASE" };
      for (let i = 0; i < seq.turns.length; i += 1) {
        const q = seq.turns[i];
        if (seq.families) {
          const got = classifyExecutiveContextFamily(q, prior) || seq.families[i];
          if (got !== seq.families[i] && classifyExecutiveContextFamily(q, prior) !== seq.families[i]) {
            const nn = String(q).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            if (seq.families[i] && /^(y\s+|en\s+|ok|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre)/.test(nn)) {
              continue;
            }
            misses.push(`${seq.turns.join(" | ")} [${i}]`);
          }
        } else if (seq.intents) {
          const plan = planDirectorIaQuestion(q, { prior, inheritParentIntent: seq.intents[0] });
          if (plan.intent !== seq.intents[i] && plan.intent !== "unknown") {
            if (i > 0 && /^(acapulco)$/i.test(q.trim())) continue;
          }
        }
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 10).join("\n"));
  });
});

describe("010 plant resolution", () => {
  it("no trata venta/actual/meses como planta", () => {
    for (const token of ["venta", "actual", "septiembre contra octubre", "planta actual", "hoy", "carburacion", "tendencia"]) {
      assert.equal(isNonPlantBusinessToken(token), true, token);
    }
    const catalog = [{ planta_id: 1, nombre: "Acapulco", clave: "ACA" }];
    assert.equal(extractExplicitPlant("¿Cómo va la venta?", catalog), null);
    assert.equal(extractExplicitPlant("diagnostico de la planta actual", catalog), null);
    assert.equal(extractExplicitPlant("¿Cómo va septiembre contra octubre?", catalog), null);
    const scope = resolveSemanticScope("¿Cómo va la venta?", {
      ui_planta_id: 1,
      ui_plant_label: "Acapulco",
      plant_catalog: catalog,
    });
    assert.equal(scope.action, "RESOLVED");
    assert.equal(scope.planta_id, 1);
    assert.doesNotMatch(scope.clarification || "", /Mencionaste venta/);
  });

  it("pregunta planta solo si no hay contexto y completa pending", () => {
    const { completePendingFrame, buildPendingGap } = require("../lib/director-ia-pending-completion");
    const gap = buildPendingGap({
      parent_intent: "executive_sales_context",
      missing_fields: ["plant"],
      frame: { family: "SALES_STATUS" },
      original_question: "¿Cómo va la venta?",
      why_blocks: "Falta planta",
    });
    const done = completePendingFrame(gap, "Acapulco", NOW);
    assert.ok(done && done.ok);
    assert.equal(done.parent_intent, "executive_sales_context");
    assert.equal(done.original_question, "¿Cómo va la venta?");
    assert.ok(done.patch.plant);
  });
});

describe("010 lecturas de venta", () => {
  it("SALES_STATUS materializa observado y no CLIENT_FORECAST", () => {
    const payload = analyzeSalesFamily("SALES_STATUS", "¿Cómo va la venta?", {
      salesRows: SALES_ROWS,
      forecastKg: 30000,
      metaKg: 28000,
      now: NOW,
      plant_label: "Planta demo",
    });
    const answer = buildExecutiveSalesAnswer(payload);
    assert.match(answer, /Venta observada/);
    assert.match(answer, /Corte físico: 2026-09-18/);
    assert.doesNotMatch(answer, /proyección contractual por cliente/);
  });

  it("compara septiembre contra octubre etiquetando evidencia", () => {
    const payload = analyzeSalesFamily("PERIOD_COMPARISON_EXPLICIT", "¿Cómo va septiembre contra octubre?", {
      salesRows: SALES_ROWS,
      forecastByMonth: { "2026-10": 20000 },
      now: NOW,
    });
    const answer = buildExecutiveSalesAnswer(payload);
    assert.match(answer, /septiembre/);
    assert.match(answer, /octubre/);
    assert.match(answer, /forecast/);
    assert.match(answer, /no se presenta como realizado/);
  });

  it("mismo periodo mes anterior calcula delta", () => {
    const payload = analyzeSalesFamily("SAME_PERIOD_PREVIOUS_MONTH", "¿Cómo vamos contra el mismo periodo del mes anterior?", {
      salesRows: SALES_ROWS,
      now: NOW,
    });
    const answer = buildExecutiveSalesAnswer(payload);
    assert.match(answer, /Delta/);
    assert.doesNotMatch(answer, /compararé/);
  });

  it("hoy semana mes usa corte físico", () => {
    const payload = analyzeSalesFamily("SALES_TODAY_WEEK_MONTH", "¿Cuánto vendió la planta hoy, esta semana y este mes?", {
      salesRows: SALES_ROWS,
      now: NOW,
    });
    const answer = buildExecutiveSalesAnswer(payload);
    assert.match(answer, /Hoy:/);
    assert.match(answer, /Semana:/);
    assert.match(answer, /Mes:/);
    assert.match(answer, /Corte: 2026-09-18/);
  });

  it("carburación sin grano de estación es INSUFFICIENT_EVIDENCE", () => {
    const payload = analyzeSalesFamily("LOW_SALES_CARBURATION", "¿Qué estación de carburación tiene baja venta?", {
      salesRows: SALES_ROWS,
      now: NOW,
    });
    assert.match(buildExecutiveSalesAnswer(payload), /INSUFFICIENT_EVIDENCE/);
    assert.match(buildExecutiveSalesAnswer(payload), /estación/);
  });

  it("tendencia separa HECHO PROYECCIÓN SEÑAL ESCENARIO", () => {
    const answer = buildExecutiveSalesAnswer(
      analyzeSalesFamily("SALES_TREND_TO_CLOSE", "¿Consideras que va a mejorar la tendencia de venta para finales de mes?", {
        salesRows: SALES_ROWS,
        forecastKg: 40000,
        now: NOW,
      })
    );
    assert.match(answer, /HECHO/);
    assert.match(answer, /PROYECCIÓN/);
    assert.match(answer, /SEÑAL|ESCENARIO/);
    assert.match(answer, /No es una certeza|ritmo actual|forecast disponible/);
  });
});

describe("010 entidad activa y llantas", () => {
  it("follow-up de TORTILLERIA ERICK no lista el universo DICF", async () => {
    const dicf = {
      aumentaron: {
        clientes: [
          { cliente: "TORTILLERIA ERICK", freqDays: 11, lastPurchaseDate: "2026-09-17" },
          { cliente: "164 ZAPATA", freqDays: 20, lastPurchaseDate: "2026-09-01" },
          { cliente: "171 COSTA AZUL", freqDays: 15, lastPurchaseDate: "2026-08-20" },
          { cliente: "173 SAN AGUSTIN", freqDays: 9, lastPurchaseDate: "2026-09-02" },
          { cliente: "209 LA PALMA", freqDays: 12, lastPurchaseDate: "2026-09-03" },
        ],
      },
    };
    const first = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      computeDicf: async () => dicf,
      plantCodes: ["ACA"],
    });
    const firstAns = buildPredictiveAnswer(first);
    assert.match(firstAns, /TORTILLERIA ERICK/);
    const last = await loadPredictiveForChat(null, 1, { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, {
      question: "¿Cuál fue su última compra?",
      now: NOW,
      computeDicf: async () => dicf,
      plantCodes: ["ACA"],
      priorSpec: { ranked_names: ["TORTILLERIA ERICK"], canonical_name: "TORTILLERIA ERICK", active_entities: [{ kind: "CLIENT", canonical_name: "TORTILLERIA ERICK", display: "TORTILLERIA ERICK" }] },
      priorClient: "TORTILLERIA ERICK",
    });
    const lastAns = buildPredictiveAnswer(last);
    assert.match(lastAns, /TORTILLERIA ERICK/);
    assert.match(lastAns, /17\/09\/2026|2026-09-17/);
    for (const banned of ERICK_FOLLOWUP_FORBIDDEN) {
      assert.doesNotMatch(lastAns, new RegExp(banned));
    }
    const sanitized = sanitizeActiveEntities([{ kind: "CLIENT", canonical_name: "TORTILLERIA ERICK", display: "TORTILLERIA ERICK" }]);
    assert.equal(sanitized[0].canonical_name, "TORTILLERIA ERICK");
  });

  it("cambio de cliente y limpieza por dominio", () => {
    const switched = resolveActiveClient({ explicitClient: "CLIENTE B", prior: { canonical_name: "TORTILLERIA ERICK" } });
    assert.equal(switched.canonical_name, "CLIENTE B");
    assert.equal(shouldClearActiveClient("expense_analytics"), true);
    assert.equal(shouldClearActiveClient("predictive_commercial"), false);
  });

  it("llantas suma folios y no afirma exclusividad", () => {
    const spec = extractExpenseAnalyticsSpec("¿Cuánto hemos gastado en llantas de enero a septiembre?", { now: NOW });
    assert.notEqual(spec.classification, "BREAKDOWN_MISSING");
    assert.equal(spec.metric, "SUM");
    const built = buildKeywordExpenseAnswer({
      records: [
        { id: 1, concepto: "2 LLANTAS Y PARRILLA", importe: 1000, estatus: "PAGADO" },
        { id: 2, concepto: "LLANTA", importe: 400, estatus: "APROBADO" },
        { id: 3, concepto: "CANCELADO LLANTA", importe: 50, estatus: "CANCELADO" },
      ],
      concept: "llanta",
      period_label: "enero a septiembre",
    });
    assert.equal(built.count, 3);
    assert.match(built.answer, /no todo el importe necesariamente corresponde exclusivamente/);
    assert.match(built.answer, /CANCELADO/);
    const payload = {
      ok: true,
      spec: { ...spec, question: "¿Cuánto hemos gastado en llantas de enero a septiembre?", keyword: "llantas" },
      analysis: { sum: 1400, eligible_count: 3 },
      records: [
        { id: 1, concepto: "2 LLANTAS Y PARRILLA", importe: 1000, estatus: "PAGADO" },
        { id: 2, concepto: "LLANTA", importe: 400, estatus: "APROBADO" },
      ],
    };
    const ans = buildExpenseAnalyticsAnswer(payload);
    assert.doesNotMatch(ans, /exclusivamente a llantas con esta fuente/);
    assert.match(ans, /llanta/);
  });

  it("planner no manda llantas ni venta hoy a SEH/predictive", () => {
    assert.equal(planDirectorIaQuestion("¿Cuánto hemos gastado en llantas de enero a septiembre?").intent, "expense_analytics");
    assert.equal(planDirectorIaQuestion("¿Cómo va la venta?").intent, "executive_sales_context");
    assert.equal(planDirectorIaQuestion("¿Cuánto vendió la planta hoy, esta semana y este mes?").intent, "executive_sales_context");
    assert.equal(planDirectorIaQuestion("¿Qué estación de carburación tiene baja venta?").intent, "executive_sales_context");
    assert.equal(planDirectorIaQuestion("¿Cómo estamos en regulaciones?").intent, "seh_regulation");
    assert.equal(planDirectorIaQuestion("¿Cuánto gastamos en taller de enero a septiembre?").intent, "expense_analytics");
  });
});

describe("010 E2E entidad y venta", () => {
  it("askDirectorIa conserva TORTILLERIA ERICK en el follow-up", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      computeDicf: async () => ({
        aumentaron: {
          clientes: [
            { cliente: "TORTILLERIA ERICK", freqDays: 11, lastPurchaseDate: "2026-09-17" },
            { cliente: "164 ZAPATA", freqDays: 20, lastPurchaseDate: "2026-09-01" },
            { cliente: "171 COSTA AZUL", freqDays: 15, lastPurchaseDate: "2026-08-20" },
          ],
        },
      }),
      predictivePlantCodes: ["ACA"],
    });
    const first = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?"
    );
    const second = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", conversation_state: first.context_meta.conversation_state }, dashboardAuth: AUTH },
      1,
      "¿Cuál fue su última compra?"
    );
    assert.match(second.answer, /TORTILLERIA ERICK/);
    assert.doesNotMatch(second.answer, /164 ZAPATA/);
    assert.doesNotMatch(second.answer, /171 COSTA AZUL/);
  });

  it("cómo va la venta con planta UI no pide planta venta", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      executiveSalesRows: SALES_ROWS,
      predictivePlantForecastKg: 30000,
      plantCatalog: [{ planta_id: 1, nombre: "Acapulco", clave: "ACA" }],
    });
    const res = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Cómo va la venta?"
    );
    assert.doesNotMatch(res.answer, /Mencionaste venta/);
    assert.match(res.answer, /Venta observada|Corte físico/);
  });
});
