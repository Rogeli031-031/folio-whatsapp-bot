"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  resolveConversationTurn,
  emptyConversationState,
  sanitizeEchoedState,
} = require("../lib/director-ia-conversation-state");
const { detectUnsupportedDirectorIaDomain } = require("../lib/director-ia-capabilities");
const { getDirectorIaTool } = require("../lib/director-ia-tools");
const {
  isPreCloseQuestion,
  isWhatIfQuestion,
  composeExecutiveCycle,
  formatPreCloseContext,
  buildPreClosePrompt,
  forbiddenKeysPresent,
  canAccessPlant,
  portfolioAuthzScope,
} = require("../lib/director-ia-executive-cycle-composer");
const { isMonthCloseQuestion } = require("../lib/director-ia-month-close-result");
const { isPreMeetingQuestion } = require("../lib/director-ia-pre-meeting");
const { isDailyExecutiveBriefQuestion } = require("../lib/director-ia-daily-executive-brief");

const ROOT = path.join(__dirname, "..");

const PLANTS = [
  { planta_id: 1, planta_nombre: "Puebla", plant_code: "E7" },
  { planta_id: 2, planta_nombre: "Acapulco", plant_code: "E3" },
  { planta_id: 3, planta_nombre: "Morelos", plant_code: "E9" },
  { planta_id: 99, planta_nombre: "Secreta", plant_code: "XX" },
];

function zpAuth() {
  return { role: "ZP", actor_nombre: "Director ZP" };
}
function adAuth() {
  return { role: "AD" };
}
function ggAuth(ids) {
  return { role: "GG", plantas_permitidas: ids };
}

function salesRow(cliente, kg, month = "2026-08") {
  return { month, cliente_norm: cliente, canal: "Casa", subcanal: "", kg };
}

function composeOpts(over = {}) {
  return {
    now: new Date("2026-08-25T18:00:00-06:00"),
    openYearMonth: { year: 2026, month: 8 },
    portfolioPlants: PLANTS.filter((p) => p.planta_id !== 99),
    skipTrend: true,
    defaultCutoff: "2026-08-24",
    injected: true,
    salesRowsByPlant: {
      1: [salesRow("ARTURO", 863000)],
      2: [salesRow("BETA", 400000)],
      3: [salesRow("GAMA", 200000)],
    },
    priorSalesRowsByPlant: {
      1: [salesRow("ARTURO", 900000, "2026-07"), salesRow("PERDIDO", 120000, "2026-07")],
      2: [salesRow("BETA", 380000, "2026-07")],
      3: [salesRow("GAMA", 210000, "2026-07")],
    },
    discountRowsByPlant: {
      1: [{ month: "2026-08", monto: 3918000 }],
      2: [{ month: "2026-08", monto: 800000 }],
      3: [{ month: "2026-08", monto: 300000 }],
    },
    targetByPlant: {
      1: { venta_ton: 1200, version_id: 10, version_number: 1, empresa: "Puebla" },
      2: { venta_ton: 1500, version_id: 10, version_number: 1, empresa: "Acapulco" },
      3: null,
    },
    forecastByPlant: {
      1: {
        version_id: 88,
        version_number: 3,
        row: {
          venta_ton: 1126,
          margen_kg: 6.5,
          com_desc_kg: 4.54,
          hg_kg: 6.11,
          hg_pct: 1,
          gasto_kg: 2,
          gtos_apoyos_corp_kg: 1,
          inversiones_kg: 0.2,
          util_oper_importe: -400000,
          resultado_final_importe: -775000,
        },
      },
      2: {
        version_id: 88,
        version_number: 3,
        row: {
          venta_ton: 1496,
          margen_kg: 6,
          resultado_final_importe: 100000,
          util_oper_importe: 200000,
        },
      },
      3: {
        version_id: 88,
        version_number: 3,
        row: { venta_ton: 500, resultado_final_importe: -10000 },
      },
    },
    actionBoardByPlant: {
      1: {
        items: [{ id: 1, titulo: "Seguimiento", estado: "vencido", dias_vencido: 4, tema: "venta" }],
      },
    },
    loadActions: async (_pool, plantaId) => {
      if (Number(plantaId) === 1) {
        return {
          ok: true,
          summary: { open: 2, overdue: 1, closed: 0 },
          top_overdue: [{ titulo: "Seguimiento", responsable: "Juan", dias_vencido: 4 }],
        };
      }
      return { ok: true, summary: { open: 0, overdue: 0, closed: 0 }, top_overdue: [] };
    },
    loadSupports: async () => ({
      ok: true,
      reviewable: [{ id: 11 }],
      reviewable_count: 1,
    }),
    ...over,
  };
}

async function compose(auth, question, plantaId, over = {}) {
  return composeExecutiveCycle(null, plantaId, { dashboardAuth: auth }, composeOpts({ question, auth, ...over }));
}

describe("PRE_CLOSE routing", () => {
  it("Zona Provincia entra a pre_meeting_brief / PRE_CLOSE y no a month_close", () => {
    const q = "Prepárame para el cierre de Zona Provincia";
    assert.equal(isPreCloseQuestion(q), true);
    assert.equal(isMonthCloseQuestion(q), false);
    assert.equal(detectUnsupportedDirectorIaDomain(q), null);
    assert.equal(planDirectorIaQuestion(q).intent, "pre_meeting_brief");
    assert.equal(planDirectorIaQuestion(q).evidence[0].value, "pre_close_compose");
  });

  it("single plant junta Puebla entra PRE_CLOSE", () => {
    const q = "Prepárame para la junta de Puebla";
    assert.equal(isPreCloseQuestion(q), true);
    assert.equal(planDirectorIaQuestion(q).intent, "pre_meeting_brief");
  });

  it("cómo vamos para cerrar agosto entra PRE_CLOSE", () => {
    const q = "¿Cómo vamos para cerrar agosto?";
    assert.equal(isPreCloseQuestion(q), true);
    assert.equal(isMonthCloseQuestion(q), false);
    assert.equal(planDirectorIaQuestion(q).intent, "pre_meeting_brief");
  });

  it("peor contra la meta entra PRE_CLOSE; cerramos contra la meta sigue month_close", () => {
    assert.equal(isPreCloseQuestion("¿Dónde estamos peor contra la meta?"), true);
    assert.equal(planDirectorIaQuestion("¿Dónde estamos peor contra la meta?").intent, "pre_meeting_brief");
    assert.equal(isPreCloseQuestion("¿Cómo cerramos contra la meta?"), false);
    assert.equal(isMonthCloseQuestion("¿Cómo cerramos contra la meta?"), true);
    assert.equal(planDirectorIaQuestion("¿Cómo cerramos contra la meta?").intent, "month_close_result");
  });

  it("IGF routing no se come PRE_CLOSE ni se pierde", () => {
    assert.equal(isPreCloseQuestion("Cómo va IGF"), false);
    assert.equal(planDirectorIaQuestion("Cómo va IGF").intent, "igf_status");
  });

  it("qué debo resolver en la junta de hoy es PRE_CLOSE y no daily", () => {
    const q = "¿Qué debo resolver en la junta de hoy?";
    assert.equal(isPreCloseQuestion(q), true);
    assert.equal(isDailyExecutiveBriefQuestion(q), true);
    const plan = planDirectorIaQuestion(q);
    assert.equal(plan.intent, "pre_meeting_brief");
    assert.equal(plan.evidence[0].value, "pre_close_compose");
    assert.notEqual(plan.intent, "daily_executive_brief");
  });

  it("pre-cierre y junta de pre-cierre entran al composer PRE_CLOSE", () => {
    for (const q of ["pre-cierre", "junta de pre-cierre", "prepárame para el pre-cierre"]) {
      assert.equal(isPreCloseQuestion(q), true, q);
      const plan = planDirectorIaQuestion(q);
      assert.equal(plan.intent, "pre_meeting_brief", q);
      assert.equal(plan.evidence[0].value, "pre_close_compose", q);
    }
  });

  it("junta general sin cierre sigue pre_meeting clásico", () => {
    const q = "Prepárame para la junta";
    assert.equal(isPreCloseQuestion(q), false);
    assert.equal(isPreMeetingQuestion(q), true);
    assert.equal(planDirectorIaQuestion(q).intent, "pre_meeting_brief");
    assert.equal(planDirectorIaQuestion(q).evidence[0].value, "pre_meeting_compose");
  });

  it("daily brief normal sigue daily; cómo vamos este mes no cambia", () => {
    assert.equal(planDirectorIaQuestion("¿Cómo nos fue ayer?").intent, "daily_executive_brief");
    assert.equal(planDirectorIaQuestion("¿Cómo vamos este mes?").intent, "unknown");
  });
});

describe("PRE_CLOSE authz portfolio", () => {
  it("ZP ve portafolio multi-planta autorizado", async () => {
    const pack = await compose(zpAuth(), "Prepárame para el cierre de Zona Provincia", 1);
    assert.equal(pack.ok, true);
    assert.equal(pack.cycle_mode, "PRE_CLOSE");
    assert.equal(pack.portfolio_scope, "PORTFOLIO");
    assert.deepEqual(pack.authorized_plant_ids, [1, 2, 3]);
    assert.equal(JSON.stringify(pack).includes("Secreta"), false);
    assert.equal(pack.authorized_plant_ids.includes(99), false);
  });

  it("AD ve portafolio multi-planta", async () => {
    const pack = await compose(adAuth(), "¿Qué plantas me preocupan para el cierre?", 1);
    assert.equal(pack.ok, true);
    assert.equal(pack.portfolio_scope, "PORTFOLIO");
    assert.ok(pack.authorized_plant_ids.includes(1));
    assert.ok(pack.authorized_plant_ids.includes(2));
  });

  it("GG solo assigned plants", async () => {
    const pack = await compose(ggAuth([1]), "Prepárame para el cierre de Zona Provincia", 1);
    assert.equal(pack.ok, true);
    assert.deepEqual(pack.authorized_plant_ids, [1]);
    assert.equal(pack.plants.some((p) => p.identity.planta_id === 2), false);
    assert.equal(JSON.stringify(pack).includes("Acapulco"), false);
  });

  it("no filtra planta no autorizada en counts ni texto", async () => {
    const pack = await compose(ggAuth([3]), "¿Qué plantas me preocupan para el cierre?", 3);
    assert.deepEqual(pack.authorized_plant_ids, [3]);
    assert.equal(pack.portfolio_counts.plants_in_pack, 1);
    assert.equal(JSON.stringify(pack).includes("Puebla"), false);
    assert.equal(JSON.stringify(pack).includes("Secreta"), false);
  });

  it("GG no autorizado aborta", async () => {
    const pack = await compose(ggAuth([2]), "Prepárame para la junta de Puebla", 1);
    assert.equal(pack.ok, false);
    assert.equal(pack.abort, true);
  });

  it("canAccessPlant respeta scopes", () => {
    assert.equal(portfolioAuthzScope(zpAuth()), "ALL_PLANTS");
    assert.equal(portfolioAuthzScope(adAuth()), "ALL_PLANTS");
    assert.equal(portfolioAuthzScope(ggAuth([1])), "ASSIGNED_PLANTS");
    assert.equal(canAccessPlant(ggAuth([1]), 2), false);
    assert.equal(canAccessPlant(zpAuth(), 2), true);
  });
});

describe("PRE_CLOSE truth boundaries", () => {
  it("one-plant PRE_CLOSE Puebla", async () => {
    const pack = await compose(zpAuth(), "Prepárame para la junta de Puebla", 1);
    assert.equal(pack.portfolio_scope, "ONE_PLANT");
    assert.deepEqual(pack.authorized_plant_ids, [1]);
    assert.equal(pack.plants[0].identity.planta_nombre, "Puebla");
  });

  it("CURRENT es ACTUAL_COMMERCIAL distinto de forecast", async () => {
    const pack = await compose(zpAuth(), "Prepárame para la junta de Puebla", 1);
    const p = pack.plants[0];
    assert.equal(p.current.truth_class, "ACTUAL_COMMERCIAL");
    assert.equal(p.current.venta_ton, 863);
    assert.equal(p.current.cutoff_date, "2026-08-24");
    assert.notEqual(p.current.venta_ton, p.base_forecast.fields.venta_ton);
  });

  it("TARGET es TARGET_COMMITMENT distinto", async () => {
    const pack = await compose(zpAuth(), "Prepárame para la junta de Puebla", 1);
    const p = pack.plants[0];
    assert.equal(p.target.truth_class, "TARGET_COMMITMENT");
    assert.equal(p.target.venta_ton, 1200);
    assert.notEqual(p.target.venta_ton, p.base_forecast.fields.venta_ton);
    assert.notEqual(p.target.venta_ton, p.current.venta_ton);
  });

  it("BASE_FORECAST es FORECAST y no FINAL", async () => {
    const pack = await compose(zpAuth(), "Prepárame para la junta de Puebla", 1);
    const f = pack.plants[0].base_forecast;
    assert.equal(f.truth_class, "FORECAST");
    assert.equal(f.section_role, "BASE_FORECAST");
    assert.equal(f.label, "BASE_FORECAST");
    assert.equal(f.fields.venta_ton, 1126);
    assert.equal(f.created_at_role, "upload_timestamp");
    const ctx = formatPreCloseContext(pack);
    assert.match(ctx, /FORECAST != actual != final/);
    assert.equal(pack.financial, undefined);
    assert.match(ctx, /No ACTUAL_FINANCIAL/);
  });

  it("PRE_CLOSE no incluye ACTUAL_FINANCIAL ni commitment/scenario", async () => {
    const pack = await compose(zpAuth(), "Prepárame para el cierre de Zona Provincia", 1);
    assert.equal(pack.financial, undefined);
    assert.equal(pack.actual_financial, undefined);
    assert.equal(pack.commitment_ref, null);
    assert.equal(pack.scenario_ref, null);
    assert.equal(pack.lesson_ref, null);
    assert.equal(pack.council_runtime, false);
    assert.deepEqual(forbiddenKeysPresent(pack), []);
    const blob = JSON.stringify(pack);
    assert.equal(blob.includes("proposed_intervention"), false);
    assert.equal(blob.includes("human_commitment"), false);
    assert.equal(blob.includes("closing_scenario"), false);
    assert.equal(blob.includes("ACTUAL_FINANCIAL") && blob.includes("EXCLUDED"), true);
  });

  it("missing target gap", async () => {
    const pack = await compose(zpAuth(), "Prepárame para la junta de Morelos", 3);
    const p = pack.plants[0];
    assert.equal(p.target.status, "TARGET_MISSING_FOR_PERIOD");
    assert.ok(p.gaps.some((g) => g.kind === "TARGET_MISSING_FOR_PERIOD"));
    assert.ok(p.decision_needed.some((d) => d.decision_kind === "TARGET_ABSENT"));
  });

  it("forecast below target y resultado negativo", async () => {
    const pack = await compose(zpAuth(), "Prepárame para la junta de Puebla", 1);
    const codes = pack.plants[0].risks.map((r) => r.risk_code);
    assert.ok(codes.includes("FORECAST_BELOW_TARGET"));
    assert.ok(codes.includes("FORECAST_RESULT_NEGATIVE"));
    assert.ok(codes.includes("REMAINING_FORECAST_DEPENDENCE"));
    for (const r of pack.plants[0].risks) {
      assert.ok(r.condition);
      assert.equal(/porque|culpa|causa de/i.test(r.condition), false);
    }
  });

  it("overdue action signal", async () => {
    const pack = await compose(zpAuth(), "Prepárame para la junta de Puebla", 1);
    assert.ok(pack.plants[0].risks.some((r) => r.risk_code === "OVERDUE_ACTION"));
    assert.equal(pack.plants[0].actions.overdue, 1);
    assert.match(pack.plants[0].actions.note, /commitment history/);
  });

  it("lost client signal sin causa", async () => {
    const pack = await compose(zpAuth(), "Prepárame para la junta de Puebla", 1);
    assert.ok(pack.plants[0].risks.some((r) => r.risk_code === "LOST_HIGH_VOLUME_CLIENT"));
    assert.equal(pack.plants[0].current.lost_clients[0].cliente_norm, "PERDIDO");
  });

  it("partial source failure no tumba el portafolio", async () => {
    const pack = await compose(zpAuth(), "Prepárame para el cierre de Zona Provincia", 1, {
      forecastByPlant: {
        1: "error",
        2: {
          version_id: 88,
          version_number: 3,
          row: { venta_ton: 1496, resultado_final_importe: 100000 },
        },
        3: { missing: true },
      },
    });
    assert.equal(pack.ok, true);
    assert.equal(pack.plants.length, 3);
    assert.equal(pack.plants.find((p) => p.identity.planta_id === 1).base_forecast.status, "SOURCE_UNAVAILABLE");
    assert.equal(pack.plants.find((p) => p.identity.planta_id === 2).base_forecast.status, "OK");
    assert.equal(
      pack.plants.find((p) => p.identity.planta_id === 3).base_forecast.status,
      "FORECAST_MISSING_FOR_PERIOD"
    );
  });

  it("decision_needed solo de gaps/risks; prompt prohíbe inventar hechos", async () => {
    const pack = await compose(zpAuth(), "¿Qué debo resolver en la junta de hoy?", 1);
    const kinds = pack.plants.flatMap((p) => p.decision_needed.map((d) => d.decision_kind));
    assert.ok(kinds.includes("FORECAST_NEGATIVE") || kinds.includes("VOLUME_DEFENDABLE"));
    const prompt = buildPreClosePrompt(pack, "¿Qué debo resolver en la junta de hoy?");
    assert.match(prompt.systemPrompt, /No inventes intervención/);
    assert.match(prompt.userContent, /DECISION_NEEDED/);
    assert.doesNotMatch(prompt.userContent, /proposed_intervention|human_commitment|closing_scenario/);
  });

  it("no regional financial total", async () => {
    const pack = await compose(zpAuth(), "Prepárame para el cierre de Zona Provincia", 1);
    assert.ok(pack.limitations.includes("NO_REGIONAL_FINANCIAL_TOTAL"));
    assert.equal(pack.regional_total, undefined);
    assert.ok(pack.portfolio_counts.plants_in_pack >= 1);
  });
});

describe("PRE_CLOSE state / requery / follow-ups", () => {
  it("state lleva mode/period y no raw evidence", () => {
    const echoed = {
      parent_intent: "pre_meeting_brief",
      planta_id: 1,
      cycle_mode: "PRE_CLOSE",
      portfolio_scope: "PORTFOLIO",
      active_period_months: ["2026-08"],
      meeting_type: "monthly_close",
      last_evidence_bundle_type: "pre_close_steering",
    };
    const clean = sanitizeEchoedState(echoed, 1);
    assert.equal(clean.cycle_mode, "PRE_CLOSE");
    assert.equal(clean.portfolio_scope, "PORTFOLIO");
    assert.equal(clean.last_evidence_bundle_type, "pre_close_steering");
    assert.equal(clean.plants, undefined);
    const empty = emptyConversationState(1);
    assert.equal(empty.cycle_mode, null);
  });

  it("what-if y commitment history son unsupported", () => {
    assert.equal(isWhatIfQuestion("¿Qué pasa si doy 10 centavos y recupero 15 t?"), true);
  });

  it("inherit PRE_CLOSE reconsulta intent", () => {
    const turn = resolveConversationTurn({
      question: "¿Qué me preocupa más?",
      plantaId: 1,
      echoedState: {
        parent_intent: "pre_meeting_brief",
        planta_id: 1,
        cycle_mode: "PRE_CLOSE",
        portfolio_scope: "PORTFOLIO",
        active_period_months: ["2026-08"],
        meeting_type: "monthly_close",
        last_evidence_bundle_type: "pre_meeting_brief",
      },
      detectIntent: detectDirectorIaIntent,
    });
    assert.equal(turn.inherit_parent_intent, "pre_meeting_brief");
  });

  it("forcePortfolio conserva portafolio en follow-up sin cues de zona", async () => {
    const collapsed = await compose(zpAuth(), "qué me preocupa más", 1);
    assert.equal(collapsed.portfolio_scope, "ONE_PLANT");
    const kept = await compose(zpAuth(), "qué me preocupa más", 1, { forcePortfolio: true });
    assert.equal(kept.portfolio_scope, "PORTFOLIO");
    assert.deepEqual(kept.authorized_plant_ids, [1, 2, 3]);
    assert.equal(JSON.stringify(kept).includes("Secreta"), false);
  });
});

describe("askDirectorIa PRE_CLOSE", () => {
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
      composeExecutiveCycle: undefined,
      loadPreMeetingBriefForChat: undefined,
      preClosePortfolioPlants: undefined,
      preCloseSalesRowsByPlant: undefined,
      preClosePriorSalesRowsByPlant: undefined,
      preCloseTargetByPlant: undefined,
      preCloseForecastByPlant: undefined,
      preCloseSkipTrend: undefined,
      preCloseDefaultCutoff: undefined,
      loadPreCloseActions: undefined,
      loadIgfReviewableSupportsForChat: undefined,
    });
  });

  function chatInject(auth, over = {}) {
    const sales = {
      1: [salesRow("ARTURO", 863000)],
      2: [salesRow("BETA", 400000)],
      3: [salesRow("GAMA", 200000)],
    };
    return {
      pool: { connect: async () => ({ query: async () => ({ rows: [] }), release() {} }) },
      openaiChat: async () => "ok",
      preClosePortfolioPlants: PLANTS.filter((p) => p.planta_id !== 99),
      preCloseSalesRowsByPlant: sales,
      preClosePriorSalesRowsByPlant: {
        1: [salesRow("ARTURO", 900000, "2026-07")],
        2: [salesRow("BETA", 380000, "2026-07")],
        3: [salesRow("GAMA", 210000, "2026-07")],
      },
      preCloseTargetByPlant: {
        1: { venta_ton: 1200, version_id: 10, version_number: 1, empresa: "Puebla" },
        2: { venta_ton: 1500, version_id: 10, version_number: 1, empresa: "Acapulco" },
        3: null,
      },
      preCloseForecastByPlant: {
        1: { version_id: 88, version_number: 3, row: { venta_ton: 1126, resultado_final_importe: -775000 } },
        2: { version_id: 88, version_number: 3, row: { venta_ton: 1496, resultado_final_importe: 100000 } },
        3: { version_id: 88, version_number: 3, row: { venta_ton: 500, resultado_final_importe: -10000 } },
      },
      preCloseSkipTrend: true,
      preCloseDefaultCutoff: "2026-08-24",
      loadPreCloseActions: async () => ({ ok: true, summary: { open: 0, overdue: 0 }, top_overdue: [] }),
      loadIgfReviewableSupportsForChat: async () => ({ ok: true, reviewable: [], reviewable_count: 0 }),
      ...over,
      _sales: sales,
    };
  }

  it("GPT no recibe hechos inventados de decisión; state requery", async () => {
    let loads = 0;
    let promptSeen = "";
    configureDirectorIaChat({
      pool: { connect: async () => ({ query: async () => ({ rows: [] }), release() {} }) },
      openaiChat: async (system, user) => {
        promptSeen = `${system}\n${user}`;
        return "ok";
      },
      composeExecutiveCycle: async () => {
        loads += 1;
        return compose(zpAuth(), "Prepárame para el cierre de Zona Provincia", 1);
      },
    });
    const first = await askDirectorIa(
      { dashboardAuth: zpAuth(), body: {} },
      1,
      "Prepárame para el cierre de Zona Provincia"
    );
    assert.equal(first.ok, true);
    assert.equal(loads, 1);
    assert.equal(first.context_meta.cycle_mode, "PRE_CLOSE");
    assert.equal(first.context_meta.conversation_state.cycle_mode, "PRE_CLOSE");
    assert.equal(first.context_meta.work_item_memory.meeting_pack_not_persisted, true);
    assert.match(promptSeen, /No inventes intervención/);
    assert.doesNotMatch(promptSeen, /Puebla va por 1,177|escenario aprobado/);
    const second = await askDirectorIa(
      { dashboardAuth: zpAuth(), body: { conversation_state: first.context_meta.conversation_state } },
      1,
      "¿Qué me preocupa más?"
    );
    assert.equal(second.ok, true);
    assert.equal(loads, 2);
  });

  it("follow-up de zona conserva PRE_CLOSE portfolio y reconsulta evidencia", async () => {
    const inject = chatInject(zpAuth());
    let seenOpts = [];
    configureDirectorIaChat({
      ...inject,
      composeExecutiveCycle: async (pool, plantaId, req, opts) => {
        seenOpts.push(opts);
        return compose(req.dashboardAuth, opts.question, plantaId, {
          forcePortfolio: opts.forcePortfolio,
          salesRowsByPlant: inject._sales,
        });
      },
    });
    const first = await askDirectorIa(
      { dashboardAuth: zpAuth(), body: {} },
      1,
      "Prepárame para el cierre de Zona Provincia"
    );
    assert.equal(first.ok, true);
    assert.equal(first.context_meta.cycle_mode, "PRE_CLOSE");
    assert.equal(first.context_meta.conversation_state.portfolio_scope, "PORTFOLIO");
    assert.deepEqual(first.context_meta.authorized_plant_ids, [1, 2, 3]);
    assert.equal(first.context_meta.conversation_state.plants, undefined);
    inject._sales[1] = [salesRow("ARTURO", 900000)];
    const second = await askDirectorIa(
      { dashboardAuth: zpAuth(), body: { conversation_state: first.context_meta.conversation_state } },
      1,
      "qué me preocupa más"
    );
    assert.equal(second.ok, true);
    assert.equal(second.context_meta.cycle_mode, "PRE_CLOSE");
    assert.equal(second.context_meta.conversation_state.portfolio_scope, "PORTFOLIO");
    assert.deepEqual(second.context_meta.authorized_plant_ids, [1, 2, 3]);
    assert.equal(seenOpts.length, 2);
    assert.equal(seenOpts[1].forcePortfolio, true);
    assert.equal(JSON.stringify(second).includes("Secreta"), false);
    const secondPack = await compose(zpAuth(), "qué me preocupa más", 1, {
      forcePortfolio: true,
      salesRowsByPlant: inject._sales,
    });
    assert.equal(secondPack.plants[0].current.venta_ton, 900);
  });

  it("GG follow-up de portfolio solo assigned plants", async () => {
    const inject = chatInject(ggAuth([1]));
    configureDirectorIaChat({
      ...inject,
      composeExecutiveCycle: async (pool, plantaId, req, opts) =>
        compose(req.dashboardAuth, opts.question, plantaId, { forcePortfolio: opts.forcePortfolio }),
    });
    const first = await askDirectorIa(
      { dashboardAuth: ggAuth([1]), body: {} },
      1,
      "Prepárame para el cierre de Zona Provincia"
    );
    assert.equal(first.ok, true);
    assert.deepEqual(first.context_meta.authorized_plant_ids, [1]);
    const second = await askDirectorIa(
      { dashboardAuth: ggAuth([1]), body: { conversation_state: first.context_meta.conversation_state } },
      1,
      "qué me preocupa más"
    );
    assert.equal(second.ok, true);
    assert.deepEqual(second.context_meta.authorized_plant_ids, [1]);
    assert.equal(JSON.stringify(second).includes("Acapulco"), false);
    assert.equal(JSON.stringify(second).includes("Secreta"), false);
  });

  it("single-plant PRE_CLOSE sigue ONE_PLANT", async () => {
    const inject = chatInject(zpAuth());
    configureDirectorIaChat({
      ...inject,
      composeExecutiveCycle: async (pool, plantaId, req, opts) =>
        compose(req.dashboardAuth, opts.question, plantaId, { forcePortfolio: opts.forcePortfolio }),
    });
    const first = await askDirectorIa(
      { dashboardAuth: zpAuth(), body: {} },
      1,
      "Prepárame para la junta de Puebla"
    );
    assert.equal(first.ok, true);
    assert.equal(first.context_meta.conversation_state.portfolio_scope, "ONE_PLANT");
    assert.deepEqual(first.context_meta.authorized_plant_ids, [1]);
  });
});

describe("tool + files", () => {
  it("tool pre_meeting menciona composer", () => {
    const tool = getDirectorIaTool("get_pre_meeting_brief");
    assert.ok(tool.sourceFiles.includes("lib/director-ia-executive-cycle-composer.js"));
  });

  it("composer existe", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "lib/director-ia-executive-cycle-composer.js")), true);
  });
});
