"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { FAMILY_IDS: FAMILY_IDS_004 } = require("../lib/director-ia-commercial-runtime-004");
const { FAMILY_IDS: FAMILY_IDS_005 } = require("../lib/director-ia-commercial-runtime-hardening-005");
const {
  FAMILY_IDS,
  classifyDirectMetricsFamily,
  isIgfDirectMetricQuestion,
  isIgfCommissionQuestion,
  isComisionistaChannelQuestion,
  isResultSetPronounReference,
  neverConvertDejaronToDisminuyeron,
  extractIgfDirectMetric,
  buildIgfDirectMetricAnswer,
  IGF_HG_FIELD_CONTRACT,
  persistResultSet,
  filterRowsByResultSet,
  neverEmptyPredictiveAnswer,
} = require("../lib/director-ia-direct-metrics-context-hardening-006");
const {
  loadClientMovementForChat,
  buildClientMovementAnswer,
  extractClientMovementRankingSpec,
  buildClientMovementChatResult,
  priorMovementFromState,
} = require("../lib/director-ia-client-movement");
const { loadPredictiveForChat, buildPredictiveAnswer } = require("../lib/director-ia-predictive-commercial");
const { completePendingFrame } = require("../lib/director-ia-pending-completion");
const { buildConversationState, sanitizeEchoedState } = require("../lib/director-ia-conversation-state");
const { normalize } = require("../lib/director-ia-executive-backlog");
const {
  DIRECT_METRICS_FAMILY_IDS,
  DIRECT_METRICS_UTTERANCES,
  DIRECT_METRICS_ANTI_COLLISIONS,
  DIRECT_METRICS_MULTI_TURN,
  DIRECT_METRICS_REGRESSIONS,
} = require("./fixtures/director-ia-direct-metrics-context-hardening-006");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-17T12:00:00-06:00");
const AUTH = { dashboardAuth: { role: "ADMIN", plantaIds: [1] } };

describe("006 cobertura 13 familias × 30", () => {
  it("define las 13 familias y cada una tiene >=30 utterances distintas", () => {
    assert.deepEqual([...FAMILY_IDS], [...DIRECT_METRICS_FAMILY_IDS]);
    const missing = [];
    for (const family of FAMILY_IDS) {
      const list = DIRECT_METRICS_UTTERANCES[family] || [];
      const uniq = new Set(list.map((s) => String(s).trim().toLowerCase()));
      if (list.length < 30 || uniq.size < 30) missing.push(`${family}:${list.length}/${uniq.size}`);
    }
    assert.equal(missing.length, 0, missing.join("; "));
    const total = FAMILY_IDS.reduce((s, f) => s + DIRECT_METRICS_UTTERANCES[f].length, 0);
    assert.ok(total >= 390, `utterances ${total}`);
  });

  it("cada utterance clasifica a su familia", () => {
    const misses = [];
    for (const family of FAMILY_IDS) {
      for (const q of DIRECT_METRICS_UTTERANCES[family]) {
        const got = classifyDirectMetricsFamily(q);
        if (got !== family) misses.push(`${family} ← ${got || "null"} :: ${q}`);
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 40).join("\n"));
  });

  it("el fixture no se importa desde runtime de producción", () => {
    const runtime = [
      "lib/director-ia-planner.js",
      "lib/director-ia-chat.js",
      "lib/director-ia-predictive-commercial.js",
      "lib/director-ia-client-movement.js",
      "lib/director-ia-direct-metrics-context-hardening-006.js",
    ];
    for (const rel of runtime) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.equal(src.includes("test/fixtures/director-ia-direct-metrics-context-hardening-006"), false, rel);
    }
  });
});

describe("006 anti-collisions >=180", () => {
  it("tiene al menos 180 pares", () => {
    assert.ok(DIRECT_METRICS_ANTI_COLLISIONS.length >= 180, String(DIRECT_METRICS_ANTI_COLLISIONS.length));
  });

  it("no colisiona familias prohibidas", () => {
    for (const [q, want, not] of DIRECT_METRICS_ANTI_COLLISIONS) {
      const family = classifyDirectMetricsFamily(q);
      if (want && FAMILY_IDS.includes(want)) {
        assert.equal(family, want, `${q} → ${family} want ${want}`);
      }
      if (not && FAMILY_IDS.includes(not)) {
        assert.notEqual(family, not, q);
      }
    }
  });
});

describe("006 multi-turn >=80", () => {
  it("conserva COUNT, DEJARON y métricas directas", () => {
    assert.ok(DIRECT_METRICS_MULTI_TURN.length >= 80, String(DIRECT_METRICS_MULTI_TURN.length));
    for (const convo of DIRECT_METRICS_MULTI_TURN) {
      let prior = null;
      for (const turn of convo) {
        const family = classifyDirectMetricsFamily(turn.q, prior);
        const spec = extractClientMovementRankingSpec(turn.q, prior, { now: NOW });
        const expect = turn.expect || {};
        if (expect.family && FAMILY_IDS.includes(expect.family)) {
          assert.equal(family, expect.family, `${turn.q} → ${family}`);
        }
        if (expect.period) {
          assert.equal(spec.period || (prior && prior.period), expect.period, turn.q);
        }
        if (expect.movement) {
          assert.equal(spec.movement, expect.movement, turn.q);
        }
        if (expect.pending_operation) {
          assert.equal(spec.pending_operation, expect.pending_operation, turn.q);
        }
        if (spec.ok) {
          prior = {
            ok: true,
            ...spec,
            family: family || (prior && prior.family),
            movement: spec.movement,
            want_count: spec.want_count,
            pending_operation: spec.pending_operation,
            result_set_family: spec.movement,
            result_set_period: spec.period,
            result_set_ids: spec.result_set_ids || ["A", "B"],
          };
        } else if (family) {
          prior = { ...(prior || {}), family, period: (prior && prior.period) || null };
        }
      }
    }
  });
});

describe("006 regresiones literales y fallos reales", () => {
  it("total de clientes nuevos + agosto conserva COUNT + NUEVOS", async () => {
    assert.equal(planDirectorIaQuestion("total de clientes nuevos").intent, "client_movement");
    const first = extractClientMovementRankingSpec("total de clientes nuevos", null, { now: NOW });
    assert.equal(first.want_count, true);
    assert.equal(first.pending_operation, "COUNT");
    assert.equal(first.pending_family, "NUEVOS");
    assert.equal(first.pending_intent, "client_movement");
    assert.equal(first.movement, "NUEVOS");
    const payload1 = await loadClientMovementForChat(null, 1, AUTH, {
      question: "total de clientes nuevos",
      now: NOW,
      movementRows: [],
    });
    assert.match(String(payload1.clarification || ""), /de qué mes/i);
    const completed = completePendingFrame(
      {
        kind: "dimension_completion",
        parent_intent: "client_movement",
        missing_fields: ["period"],
        frame: {
          movement: "NUEVOS",
          want_count: true,
          pending_operation: "COUNT",
          pending_family: "NUEVOS",
          pending_intent: "client_movement",
        },
      },
      "agosto",
      NOW
    );
    assert.equal(completed.ok, true);
    const second = extractClientMovementRankingSpec("agosto", { ok: true, ...first, ...completed.frame }, { now: NOW });
    assert.equal(second.period, "2026-08");
    assert.equal(second.want_count, true);
    assert.equal(second.pending_operation, "COUNT");
    assert.equal(second.movement, "NUEVOS");
    const payload2 = await loadClientMovementForChat(null, 1, AUTH, {
      question: "agosto",
      now: NOW,
      priorSpec: { ok: true, ...second },
      movementRows: Array.from({ length: 68 }, (_, i) => ({
        cliente: `N${i}`,
        movement: "NUEVOS",
        kg_a: 0,
        kg_b: 1000,
        delta_kg: 1000,
      })),
    });
    const answer = buildClientMovementAnswer(payload2);
    assert.match(answer, /En agosto de 2026 entraron 68 clientes nuevos/);
    assert.doesNotMatch(answer, /unknown/i);
  });

  it("por ellos conserva DEJARON y no cambia a DISMINUYERON", async () => {
    const first = extractClientMovementRankingSpec("Dame los clientes que dejaron de comprar en septiembre.", null, {
      now: NOW,
    });
    assert.equal(first.movement, "DEJARON_DE_COMPRAR");
    const listed = await loadClientMovementForChat(null, 1, AUTH, {
      question: "Dame los clientes que dejaron de comprar en septiembre.",
      now: NOW,
      movementRows: [
        { cliente: "A", movement: "DEJARON_DE_COMPRAR", kg_a: 20000, kg_b: 0, delta_kg: -20000 },
        { cliente: "B", movement: "DEJARON_DE_COMPRAR", kg_a: 10000, kg_b: 0, delta_kg: -10000 },
        { cliente: "C", movement: "DISMINUYERON", kg_a: 8000, kg_b: 3000, delta_kg: -5000 },
      ],
    });
    const chat = buildClientMovementChatResult(listed);
    const state = buildConversationState({
      plantaId: 1,
      parent_intent: "client_movement",
      active_entities: chat.context_meta.conversation_state.active_entities,
    });
    const echoed = sanitizeEchoedState(state, 1);
    const prior = priorMovementFromState(echoed);
    assert.equal(prior.movement, "DEJARON_DE_COMPRAR");
    assert.ok((prior.result_set_ids || []).includes("A"));
    const follow = extractClientMovementRankingSpec("¿Cuánto dejamos de vender por ellos?", { ok: true, ...prior }, { now: NOW });
    assert.equal(follow.movement, "DEJARON_DE_COMPRAR");
    assert.notEqual(follow.movement, "DISMINUYERON");
    assert.equal(neverConvertDejaronToDisminuyeron("¿Cuánto dejamos de vender por ellos?", "DEJARON_DE_COMPRAR"), true);
    const agg = await loadClientMovementForChat(null, 1, AUTH, {
      question: "¿Cuánto dejamos de vender por ellos?",
      now: NOW,
      priorSpec: { ok: true, ...follow, result_set_ids: ["A", "B"] },
      movementRows: [
        { cliente: "A", movement: "DEJARON_DE_COMPRAR", kg_a: 20000, kg_b: 0, delta_kg: -20000 },
        { cliente: "B", movement: "DEJARON_DE_COMPRAR", kg_a: 10000, kg_b: 0, delta_kg: -10000 },
        { cliente: "C", movement: "DISMINUYERON", kg_a: 8000, kg_b: 3000, delta_kg: -5000 },
      ],
    });
    assert.equal(agg.spec.movement, "DEJARON_DE_COMPRAR");
    assert.equal(agg.aggregates.lost_volume_ton, 30);
    const answer = buildClientMovementAnswer(agg);
    assert.match(answer, /Pérdida total: 30\.0 toneladas/);
    assert.doesNotMatch(answer, /disminuyeron/i);
  });

  it("pronombres conservan result set sin nuevo dominio", () => {
    for (const q of ["ellos", "esos", "esos clientes", "los anteriores", "los que mencionaste", "los de arriba", "ese grupo", "ese conjunto"]) {
      assert.equal(isResultSetPronounReference(q), true, q);
      assert.equal(classifyDirectMetricsFamily(q), "RESULT_SET_PRONOUN_REFERENCE", q);
    }
    assert.equal(isResultSetPronounReference("y los comisionistas"), false);
  });

  it("churn risk y expected next nunca vacíos", async () => {
    const empty = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Qué clientes están en riesgo de dejar de comprar?",
      now: NOW,
      dicfRows: [],
    });
    const emptyAns = neverEmptyPredictiveAnswer(buildPredictiveAnswer(empty), "CLIENT_CHURN_RISK");
    assert.ok(String(emptyAns).trim().length > 0);
    assert.match(emptyAns, /INSUFFICIENT_EVIDENCE|RESULT_WITH_EVIDENCE|CLARIFICATION_REQUIRED/);
    const expected = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      asOfDate: "2026-09-17",
      dicfRows: [{ cliente: "TORTILLERIA ERICK", lastPurchaseDate: "2026-09-01", freqDays: 7 }],
    });
    const expAns = neverEmptyPredictiveAnswer(buildPredictiveAnswer(expected), "EXPECTED_NEXT_PURCHASE");
    assert.match(expAns, /2026-09-08/);
    assert.ok(expAns.trim().length > 0);
    assert.equal(neverEmptyPredictiveAnswer("", "CLIENT_CHURN_RISK").includes("INSUFFICIENT_EVIDENCE"), true);
    assert.equal(neverEmptyPredictiveAnswer(null, "EXPECTED_NEXT_PURCHASE").includes("INSUFFICIENT_EVIDENCE"), true);
  });

  it("métricas directas IGF cortas y comisión != Comisionista", () => {
    assert.equal(planDirectorIaQuestion("¿qué descuento tenemos?").intent, "igf_direct_metric");
    assert.equal(planDirectorIaQuestion("¿qué HG tenemos?").intent, "igf_direct_metric");
    assert.equal(planDirectorIaQuestion("¿Cuánto tenemos de comisión?").intent, "igf_direct_metric");
    assert.equal(planDirectorIaQuestion("¿Cuánto es el gasto corporativo?").intent, "igf_direct_metric");
    assert.notEqual(planDirectorIaQuestion("Dame los 10 clientes comisionistas que más compraron en agosto.").intent, "igf_direct_metric");
    assert.equal(isIgfCommissionQuestion("¿Cuánto tenemos de comisión?"), true);
    assert.equal(isComisionistaChannelQuestion("top comisionistas"), true);
    assert.equal(isIgfDirectMetricQuestion("top comisionistas"), false);
    assert.equal(IGF_HG_FIELD_CONTRACT.HG.physical_key, "hg_kg");
    assert.equal(IGF_HG_FIELD_CONTRACT["HG$"].physical_key, "hg_kg");
    assert.equal(IGF_HG_FIELD_CONTRACT.HG_PCT.physical_key, "hg_pct");
    assert.notEqual(IGF_HG_FIELD_CONTRACT.HG.physical_key, IGF_HG_FIELD_CONTRACT.HG_PCT.physical_key);
    const discount = extractIgfDirectMetric("¿qué descuento tenemos?", { now: NOW });
    const discountAns = buildIgfDirectMetricAnswer(discount, { com_desc_kg: -0.13 });
    assert.match(discountAns, /descuento de septiembre de 2026 es -0\.13 MXN\/kg/i);
    assert.doesNotMatch(discountAns, /MATERIALIDAD COMERCIAL|Action Register|Bitácora|diagnóstico completo/);
    const commission = extractIgfDirectMetric("¿Cuánto tenemos de comisión?", { now: NOW });
    const commissionAns = buildIgfDirectMetricAnswer(commission, { com_desc_kg: -0.13 });
    assert.match(commissionAns, /comisión de septiembre de 2026 es -0\.13 MXN\/kg/i);
    const hg = extractIgfDirectMetric("¿qué HG tenemos?", { now: NOW });
    assert.equal(hg.hg_physical_key, "hg_kg");
    const hgAns = buildIgfDirectMetricAnswer(hg, { hg_kg: -0.04 });
    assert.match(hgAns, /HG de septiembre de 2026/i);
    const corp = extractIgfDirectMetric("¿Cuánto es el gasto corporativo?", { now: NOW });
    corp.tense = "projected";
    const corpAns = buildIgfDirectMetricAnswer(corp, { corporativos: 125000 });
    assert.match(corpAns, /Gastos corporativos proyectados de septiembre de 2026: \$125,000/);
    const rent = extractIgfDirectMetric("¿Cuál es la rentabilidad?", { now: NOW });
    const margin = extractIgfDirectMetric("¿qué margen tenemos?", { now: NOW });
    const finalRes = extractIgfDirectMetric("¿Cuál es el resultado final?", { now: NOW });
    const oper = extractIgfDirectMetric("¿Qué utilidad operativa tenemos?", { now: NOW });
    assert.equal(rent.metric, "PROFITABILITY");
    assert.equal(margin.metric, "MARGIN");
    assert.equal(finalRes.metric, "FINAL_RESULT");
    assert.equal(oper.metric, "OPERATING_PROFIT");
    assert.notEqual(rent.metric, margin.metric);
    assert.notEqual(finalRes.metric, oper.metric);
    assert.equal(planDirectorIaQuestion("¿Cuál es la rentabilidad?").intent, "igf_status");
  });

  it("regresiones literales clasifican", () => {
    for (const row of DIRECT_METRICS_REGRESSIONS) {
      if (!row.family) continue;
      assert.equal(classifyDirectMetricsFamily(row.q), row.family, row.q);
    }
  });

  it("result set helper filtra IDs", () => {
    const persisted = persistResultSet({ movement: "DEJARON_DE_COMPRAR", period: "2026-09", pending_operation: "RANK" }, [
      { cliente: "A" },
      { cliente: "B" },
    ]);
    assert.equal(persisted.result_set_family, "DEJARON_DE_COMPRAR");
    assert.deepEqual(persisted.result_set_ids, ["A", "B"]);
    const filtered = filterRowsByResultSet(
      [
        { cliente: "A", movement: "DEJARON_DE_COMPRAR" },
        { cliente: "Z", movement: "DISMINUYERON" },
      ],
      persisted.result_set_ids
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].cliente, "A");
  });
});

describe("006 no rompe 005/004", () => {
  it("005 sigue teniendo 8 familias y 004 14", () => {
    assert.equal(FAMILY_IDS_005.length, 8);
    assert.equal(FAMILY_IDS_004.length, 14);
  });
});

describe("006 normalize helper", () => {
  it("normaliza tildes", () => {
    assert.match(normalize("¿Qué descuento tenemos?"), /que descuento tenemos/);
  });
});
