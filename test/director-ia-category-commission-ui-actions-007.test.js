"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { FAMILY_IDS: FAMILY_IDS_004 } = require("../lib/director-ia-commercial-runtime-004");
const { FAMILY_IDS: FAMILY_IDS_005 } = require("../lib/director-ia-commercial-runtime-hardening-005");
const {
  FAMILY_IDS: FAMILY_IDS_006,
  isIgfDirectMetricQuestion,
  isIgfCommissionQuestion,
  buildIgfDirectMetricAnswer,
  extractIgfDirectMetric,
} = require("../lib/director-ia-direct-metrics-context-hardening-006");
const {
  FAMILY_IDS,
  classifyCategoryCommissionFamily,
  classify007Family,
  isCategoryCommissionQuestion,
  isOpenCategoryMovementQuestion,
  isUiConfirmQuestion,
  isImperativeDailySalesOpen,
  buildCategoryCommissionFromRows,
  buildCategoryCommissionAnswer,
  extractCategoryFromQuestion,
  extractSubcategoryHint,
  UI_ACTIONS,
} = require("../lib/director-ia-category-commission-007");
const { loadPredictiveForChat, buildPredictiveAnswer } = require("../lib/director-ia-predictive-commercial");
const { neverEmptyPredictiveAnswer } = require("../lib/director-ia-direct-metrics-context-hardening-006");
const { buildConversationState } = require("../lib/director-ia-conversation-state");
const {
  CATEGORY_COMMISSION_FAMILY_IDS,
  CASA_PHYSICAL_SUBS,
  CATEGORY_COMMISSION_UTTERANCES,
  OPEN_CATEGORY_COMMANDS,
  DIRECT_PRONOSTICO_COMMANDS,
  CATEGORY_COMMISSION_ANTI_COLLISIONS,
  CATEGORY_COMMISSION_MULTI_TURN,
  CATEGORY_COMMISSION_REGRESSIONS,
  SAMPLE_CATEGORY_ROWS,
  expandTemplates,
} = require("./fixtures/director-ia-category-commission-ui-actions-007");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-17T12:00:00-06:00");
const AUTH = { dashboardAuth: { role: "ADMIN", plantaIds: [1] } };

function priorFromFamily(family, extra) {
  if (family === "CASA_CATEGORY_COMMISSION" || family === "CASA_SUBCATEGORY_COMMISSION") {
    return {
      category: "CASA",
      parent_intent: "category_commission",
      pending_ui_action: { type: UI_ACTIONS.OPEN_CATEGORY_MOVEMENT, category: "CASA" },
      ...extra,
    };
  }
  if (family === "COMISIONISTA_CATEGORY_COMMISSION" || family === "COMISIONISTA_SUBCATEGORY_COMMISSION") {
    return {
      category: "COMISIONISTA",
      parent_intent: "category_commission",
      pending_ui_action: { type: UI_ACTIONS.OPEN_CATEGORY_MOVEMENT, category: "COMISIONISTA" },
      ...extra,
    };
  }
  if (family === "SOFT_DAILY_SALES_OFFER") {
    return {
      parent_intent: "open_daily_sales_view",
      pending_ui_action: { type: UI_ACTIONS.OPEN_IGF_PRONOSTICO_MODAL },
      ...extra,
    };
  }
  if (family === "IGF_COMMISSION_OR_DISCOUNT") {
    return { metric: "COMMISSION", parent_intent: "igf_direct_metric", pending_ui_action: null, ...extra };
  }
  return extra || null;
}

describe("007 cobertura 4 familias × 50", () => {
  it("define las 4 familias y cada una tiene >=50 utterances distintas", () => {
    assert.deepEqual([...FAMILY_IDS], [...CATEGORY_COMMISSION_FAMILY_IDS]);
    const missing = [];
    let total = 0;
    for (const family of FAMILY_IDS) {
      const list = CATEGORY_COMMISSION_UTTERANCES[family] || [];
      const uniq = new Set(list.map((s) => String(s).trim().toLowerCase()));
      total += list.length;
      if (list.length < 50 || uniq.size < 50) missing.push(`${family}:${list.length}/${uniq.size}`);
    }
    assert.equal(missing.length, 0, missing.join("; "));
    assert.ok(total >= 200, `utterances ${total}`);
  });

  it("cada utterance de categoría clasifica a su familia", () => {
    const misses = [];
    for (const family of ["CASA_CATEGORY_COMMISSION", "COMISIONISTA_CATEGORY_COMMISSION"]) {
      for (const q of CATEGORY_COMMISSION_UTTERANCES[family]) {
        const got = classifyCategoryCommissionFamily(q);
        if (got !== family) misses.push(`${family} ← ${got || "null"} :: ${q}`);
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 40).join("\n"));
  });

  it("50 formas de subcategoría se parametrizan sobre subcategorías físicas", () => {
    const misses = [];
    for (const sub of CASA_PHYSICAL_SUBS) {
      for (const q of expandTemplates(CATEGORY_COMMISSION_UTTERANCES.CASA_SUBCATEGORY_COMMISSION, [sub])) {
        const got = classifyCategoryCommissionFamily(q);
        if (got !== "CASA_SUBCATEGORY_COMMISSION") misses.push(`${sub} ← ${got || "null"} :: ${q}`);
      }
    }
    const discovered = buildCategoryCommissionFromRows(SAMPLE_CATEGORY_ROWS, { category: "COMISIONISTA" })
      .subcategories_discovered;
    assert.ok(discovered.length > 0, "debe descubrir subcategorías físicas de Comisionista");
    assert.equal(discovered.includes("Autotanque Inventado"), false);
    for (const sub of discovered) {
      for (const q of expandTemplates(CATEGORY_COMMISSION_UTTERANCES.COMISIONISTA_SUBCATEGORY_COMMISSION, [sub])) {
        const got = classifyCategoryCommissionFamily(q);
        if (got !== "COMISIONISTA_SUBCATEGORY_COMMISSION") misses.push(`COM ${sub} ← ${got || "null"} :: ${q}`);
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 40).join("\n"));
  });

  it("el fixture no se importa desde runtime de producción", () => {
    const runtime = [
      "lib/director-ia-planner.js",
      "lib/director-ia-chat.js",
      "lib/director-ia-category-commission-007.js",
      "lib/director-ia-direct-metrics-context-hardening-006.js",
    ];
    for (const rel of runtime) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.equal(src.includes("test/fixtures/director-ia-category-commission-ui-actions-007"), false, rel);
    }
  });
});

describe("007 anti-collisions >=150", () => {
  it("tiene al menos 150 pares", () => {
    assert.ok(CATEGORY_COMMISSION_ANTI_COLLISIONS.length >= 150, String(CATEGORY_COMMISSION_ANTI_COLLISIONS.length));
  });

  it("no colisiona familias prohibidas", () => {
    for (const [q, want, not] of CATEGORY_COMMISSION_ANTI_COLLISIONS) {
      const family = classify007Family(q);
      const plan = planDirectorIaQuestion(q);
      if (want && FAMILY_IDS.includes(want)) {
        assert.equal(family, want, `${q} → ${family} want ${want}`);
      }
      if (want === "OPEN_CATEGORY_MOVEMENT") {
        assert.equal(family, "OPEN_CATEGORY_MOVEMENT", q);
        assert.equal(plan.intent, "open_category_movement", q);
      }
      if (want === "OPEN_IGF_PRONOSTICO_MODAL") {
        assert.equal(isImperativeDailySalesOpen(q), true, q);
      }
      if (want === "IGF_COMMISSION_OR_DISCOUNT") {
        assert.equal(isCategoryCommissionQuestion(q), false, q);
        assert.equal(isIgfDirectMetricQuestion(q) || isIgfCommissionQuestion(q), true, q);
      }
      if (want === "OPEN_PRONOSTICO") {
        assert.equal(plan.intent, "open_pronostico", q);
      }
      if (not && (FAMILY_IDS.includes(not) || not === "OPEN_CATEGORY_MOVEMENT" || not === "OPEN_IGF_PRONOSTICO_MODAL")) {
        assert.notEqual(family, not, q);
      }
      if (not === "IGF_COMMISSION_CURRENT") {
        assert.equal(isIgfCommissionQuestion(q), false, q);
      }
    }
  });
});

describe("007 multi-turn >=80", () => {
  it("conserva categoría, tab y pending", () => {
    assert.ok(CATEGORY_COMMISSION_MULTI_TURN.length >= 80, String(CATEGORY_COMMISSION_MULTI_TURN.length));
    for (const convo of CATEGORY_COMMISSION_MULTI_TURN) {
      let prior = null;
      for (const turn of convo) {
        const family = classify007Family(turn.q, prior);
        const expect = turn.expect || {};
        if (expect.family && expect.family !== "IGF_COMMISSION_OR_DISCOUNT") {
          if (expect.family === "OPEN_CATEGORY_MOVEMENT" && family === "UI_CONFIRM") {
            /* confirm de tabla ofrecida también abre el modal */
          } else {
            assert.equal(family, expect.family, `${turn.q} → ${family}`);
          }
        }
        if (expect.family === "IGF_COMMISSION_OR_DISCOUNT") {
          assert.equal(isIgfDirectMetricQuestion(turn.q) || isIgfCommissionQuestion(turn.q), true, turn.q);
        }
        if (expect.no_stale_ui) {
          assert.notEqual(family, "UI_CONFIRM", turn.q);
        }
        if (expect.category && (family === "UI_CONFIRM" || family === "OPEN_CATEGORY_MOVEMENT")) {
          const cat = extractCategoryFromQuestion(turn.q, prior);
          assert.equal(cat || (prior && prior.category), expect.category, turn.q);
        }
        if (expect.stale_confirm === false) {
          prior = { parent_intent: "igf_direct_metric", metric: "HG", pending_ui_action: null };
        } else {
          prior = priorFromFamily(expect.family || family, expect.category ? { category: expect.category } : null);
        }
      }
    }
  });
});

describe("007 evidencia física Casa/Comisionista", () => {
  it("Casa no usa -0.13 global y lista subcategorías descubiertas", () => {
    const pack = buildCategoryCommissionFromRows(SAMPLE_CATEGORY_ROWS, { category: "CASA" });
    assert.deepEqual(pack.subcategories_discovered, ["Autotanque", "Carburación", "Portátil", "Sin subcategoría"]);
    const answer = buildCategoryCommissionAnswer(pack, { period: "2026-09", period_label: "septiembre de 2026" });
    assert.match(answer, /CASA/);
    assert.match(answer, /Autotanque/);
    assert.match(answer, /Carburación/);
    assert.match(answer, /Portátil/);
    assert.match(answer, /Sin subcategoría/);
    assert.match(answer, /TOTAL/);
    assert.match(answer, /¿Quieres abrir la tabla de Movimiento por categoría\?/);
    assert.doesNotMatch(answer, /-0\.13/);
    assert.match(answer, /Venta total/);
    assert.match(answer, /Comisión total/);
  });

  it("Comisionista descubre subcategorías físicas y no inventa nombres", () => {
    const pack = buildCategoryCommissionFromRows(SAMPLE_CATEGORY_ROWS, { category: "COMISIONISTA" });
    assert.ok(pack.subcategories_discovered.includes("Estacionario"));
    assert.ok(pack.subcategories_discovered.includes("Carburación"));
    assert.equal(pack.subcategories_discovered.includes("Autotanque Inventado"), false);
    const answer = buildCategoryCommissionAnswer(pack, { period: "2026-09" });
    assert.match(answer, /COMISIONISTA/);
    assert.match(answer, /Estacionario/);
    assert.doesNotMatch(answer, /-0\.13/);
  });

  it("subcategoría Casa Autotanque devuelve solo esa fila", () => {
    const pack = buildCategoryCommissionFromRows(SAMPLE_CATEGORY_ROWS, { category: "CASA" });
    const answer = buildCategoryCommissionAnswer(pack, {
      subcategory: "Autotanque",
      period: "2026-09",
      period_label: "septiembre de 2026",
    });
    assert.match(answer, /CASA \/ Autotanque/);
    assert.match(answer, /Venta:/);
    assert.match(answer, /\/kg/);
    assert.doesNotMatch(answer, /Carburación/);
    assert.doesNotMatch(answer, /-0\.13/);
  });
});

describe("007 planner y comandos UI", () => {
  it("comisión general sigue en igf_direct_metric", () => {
    assert.equal(planDirectorIaQuestion("¿Qué comisión tenemos?").intent, "igf_direct_metric");
    const spec = extractIgfDirectMetric("¿Qué comisión tenemos?", { now: NOW });
    const ans = buildIgfDirectMetricAnswer(spec, { com_desc_kg: -0.13 });
    assert.match(ans, /comisión de septiembre de 2026 es -0\.13 MXN\/kg/i);
  });

  it("comisión Casa/Comisionista no es métrica global", () => {
    assert.equal(planDirectorIaQuestion("¿Qué comisión tenemos en Casa?").intent, "category_commission");
    assert.equal(planDirectorIaQuestion("¿Qué comisión tenemos en Comisionista?").intent, "category_commission");
    assert.equal(isIgfCommissionQuestion("¿Qué comisión tenemos en Casa?"), false);
    assert.equal(isIgfCommissionQuestion("¿Qué comisión tenemos en Comisionista?"), false);
  });

  it("comandos directos abren movimiento o pronóstico", () => {
    for (const q of OPEN_CATEGORY_COMMANDS) {
      assert.equal(isOpenCategoryMovementQuestion(q), true, q);
      assert.equal(planDirectorIaQuestion(q).intent, "open_category_movement", q);
    }
    for (const q of DIRECT_PRONOSTICO_COMMANDS) {
      assert.equal(isImperativeDailySalesOpen(q), true, q);
    }
  });
});

describe("007 askDirectorIa UI_ACTION", () => {
  it("Casa + sí abre tab CASA; Comisionista + sí ábrela abre COMISIONISTA", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      categoryCommissionRows: SAMPLE_CATEGORY_ROWS,
    });
    const casa = await askDirectorIa(
      { body: { planta_nombre: "Morelos" }, dashboardAuth: AUTH.dashboardAuth },
      1,
      "¿Qué comisión tenemos en Casa?"
    );
    assert.equal(casa.ok, true);
    assert.match(casa.answer, /CASA/);
    assert.match(casa.answer, /¿Quieres abrir la tabla de Movimiento por categoría\?/);
    assert.doesNotMatch(casa.answer, /-0\.13/);
    const pending = casa.context_meta.conversation_state.pending_ui_action;
    assert.equal(pending.type, "OPEN_CATEGORY_MOVEMENT");
    assert.equal(pending.category, "CASA");
    const confirm = await askDirectorIa(
      {
        body: { planta_nombre: "Morelos", conversation_state: casa.context_meta.conversation_state },
        dashboardAuth: AUTH.dashboardAuth,
      },
      1,
      "sí"
    );
    assert.equal(confirm.ui_action.type, "OPEN_CATEGORY_MOVEMENT");
    assert.equal(confirm.ui_action.category, "CASA");
    assert.match(confirm.answer, /Abro el modal Movimiento por categoría/);

    const comi = await askDirectorIa(
      { body: { planta_nombre: "Morelos" }, dashboardAuth: AUTH.dashboardAuth },
      1,
      "¿Qué comisión tenemos en Comisionista?"
    );
    assert.match(comi.answer, /COMISIONISTA/);
    assert.match(comi.answer, /Estacionario/);
    const confirmComi = await askDirectorIa(
      {
        body: { planta_nombre: "Morelos", conversation_state: comi.context_meta.conversation_state },
        dashboardAuth: AUTH.dashboardAuth,
      },
      1,
      "sí ábrela"
    );
    assert.equal(confirmComi.ui_action.category, "COMISIONISTA");

    const daily = await askDirectorIa(
      { body: { planta_nombre: "Morelos" }, dashboardAuth: AUTH.dashboardAuth },
      1,
      "abre la venta diaria"
    );
    assert.equal(daily.ui_action.type, "OPEN_IGF_PRONOSTICO_MODAL");
    assert.match(daily.answer, /Abro el modal Pronóstico/);
    assert.doesNotMatch(daily.answer, /No finjo que la pantalla ya se abrió/);

    const soft = await askDirectorIa(
      { body: { planta_nombre: "Morelos" }, dashboardAuth: AUTH.dashboardAuth },
      1,
      "Quiero ver la venta diaria."
    );
    assert.equal(soft.ui_action, undefined);
    assert.match(soft.answer, /¿Quieres abrir la tabla de Pronóstico\?/);
    const softYes = await askDirectorIa(
      {
        body: { planta_nombre: "Morelos", conversation_state: soft.context_meta.conversation_state },
        dashboardAuth: AUTH.dashboardAuth,
      },
      1,
      "sí"
    );
    assert.ok(
      softYes.ui_action &&
        (softYes.ui_action.type === "OPEN_IGF_PRONOSTICO_MODAL" || softYes.ui_action.type === "OPEN_PRONOSTICO")
    );

    const openPron = await askDirectorIa(
      { body: { planta_nombre: "Morelos" }, dashboardAuth: AUTH.dashboardAuth },
      1,
      "abre el pronóstico"
    );
    assert.ok(openPron.ui_action);
    assert.ok(
      openPron.ui_action.type === "OPEN_PRONOSTICO" || openPron.ui_action.type === "OPEN_IGF_PRONOSTICO_MODAL"
    );
  });

  it("sí no reabre una acción vieja si el contexto cambió", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      categoryCommissionRows: SAMPLE_CATEGORY_ROWS,
    });
    const casa = await askDirectorIa(
      { body: { planta_nombre: "Morelos" }, dashboardAuth: AUTH.dashboardAuth },
      1,
      "¿Qué comisión tenemos en Casa?"
    );
    const hg = await askDirectorIa(
      {
        body: { planta_nombre: "Morelos", conversation_state: casa.context_meta.conversation_state },
        dashboardAuth: AUTH.dashboardAuth,
      },
      1,
      "¿Qué HG tenemos?"
    );
    assert.equal((hg.context_meta.conversation_state.pending_ui_action || null), null);
    const stale = await askDirectorIa(
      {
        body: { planta_nombre: "Morelos", conversation_state: hg.context_meta.conversation_state },
        dashboardAuth: AUTH.dashboardAuth,
      },
      1,
      "sí"
    );
    assert.equal(stale.ui_action, undefined);
  });
});

describe("007 Invalid time value", () => {
  it("TORTILLERIA ERICK con fecha inválida no lanza ni muestra Invalid time value", async () => {
    const expected = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      asOfDate: "2026-09-17",
      dicfRows: [{ cliente: "TORTILLERIA ERICK", lastPurchaseDate: "Invalid Date", freqDays: 7 }],
    });
    const ans = neverEmptyPredictiveAnswer(buildPredictiveAnswer(expected), "EXPECTED_NEXT_PURCHASE");
    assert.doesNotMatch(ans, /Invalid time value/i);
    assert.match(ans, /INSUFFICIENT_EVIDENCE|RESULT_WITH_EVIDENCE/);
    const nan = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      asOfDate: "not-a-date",
      dicfRows: [{ cliente: "TORTILLERIA ERICK", lastPurchaseDate: "2026-13-40", freqDays: 7 }],
    });
    const nanAns = neverEmptyPredictiveAnswer(buildPredictiveAnswer(nan), "EXPECTED_NEXT_PURCHASE");
    assert.doesNotMatch(nanAns, /Invalid time value/i);
  });
});

describe("007 no rompe 006/005/004", () => {
  it("006 sigue teniendo 13 familias, 005 8 y 004 14", () => {
    assert.equal(FAMILY_IDS_006.length, 13);
    assert.equal(FAMILY_IDS_005.length, 8);
    assert.equal(FAMILY_IDS_004.length, 14);
  });
});

describe("007 conversation_state pending", () => {
  it("persiste y sanitiza pending_ui_action", () => {
    const state = buildConversationState({
      plantaId: 1,
      parent_intent: "category_commission",
      pending_ui_action: { type: "OPEN_CATEGORY_MOVEMENT", category: "CASA", plant: "Morelos" },
    });
    assert.equal(state.pending_ui_action.type, "OPEN_CATEGORY_MOVEMENT");
    assert.equal(state.pending_ui_action.category, "CASA");
    const bad = buildConversationState({
      plantaId: 1,
      parent_intent: "category_commission",
      pending_ui_action: { type: "HACK", category: "CASA" },
    });
    assert.equal(bad.pending_ui_action, null);
    assert.equal(isUiConfirmQuestion("sí"), true);
    assert.equal(extractSubcategoryHint("¿Cuál es la comisión de Casa Autotanque?"), "Autotanque");
  });
});
