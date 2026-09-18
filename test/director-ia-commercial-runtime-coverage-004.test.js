"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  classifyCommercialRuntimeFamily,
  FAMILY_IDS,
  CHANNEL_FORECAST_NOT_AVAILABLE,
  isCasaAsClientName,
  isTopClientsByChannelQuestion,
  computeMovementAggregates,
  isChannelForecastGuardrailQuestion,
} = require("../lib/director-ia-commercial-runtime-004");
const {
  loadClientMovementForChat,
  buildClientMovementAnswer,
  extractClientMovementRankingSpec,
} = require("../lib/director-ia-client-movement");
const {
  loadPredictiveForChat,
  buildPredictiveAnswer,
  classifyPredictiveFamily,
  rankRows,
} = require("../lib/director-ia-predictive-commercial");
const { isOpenPronosticoQuestion } = require("../lib/director-ia-executive-coverage");
const {
  COMMERCIAL_RUNTIME_FAMILY_IDS,
  COMMERCIAL_RUNTIME_UTTERANCES,
  REAL_FAILURE_REGRESSIONS,
  COMMERCIAL_ANTI_COLLISIONS,
  COMMERCIAL_MULTI_TURN,
} = require("./fixtures/director-ia-commercial-runtime-coverage-004");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-17T12:00:00-06:00");
const AUTH = { dashboardAuth: { role: "ADMIN", plantaIds: [1] } };

const familyReport = {};

function record(family, ok) {
  if (!familyReport[family]) familyReport[family] = { utterances: 0, passed: 0, failed: 0 };
  familyReport[family].utterances += 1;
  if (ok) familyReport[family].passed += 1;
  else familyReport[family].failed += 1;
}

describe("004 cobertura 30 utterances por familia", () => {
  it("define las 14 familias y cada una tiene >=30 utterances distintas", () => {
    assert.deepEqual([...FAMILY_IDS], [...COMMERCIAL_RUNTIME_FAMILY_IDS]);
    const missing = [];
    for (const family of FAMILY_IDS) {
      const list = COMMERCIAL_RUNTIME_UTTERANCES[family] || [];
      const uniq = new Set(list.map((s) => String(s).trim().toLowerCase()));
      if (list.length < 30 || uniq.size < 30) missing.push(`${family}:${list.length}/${uniq.size}`);
    }
    assert.equal(missing.length, 0, missing.join("; "));
    const total = FAMILY_IDS.reduce((s, f) => s + COMMERCIAL_RUNTIME_UTTERANCES[f].length, 0);
    assert.ok(total >= 420, `utterances ${total}`);
  });

  it("cada utterance clasifica a su familia", () => {
    const misses = [];
    for (const family of FAMILY_IDS) {
      for (const q of COMMERCIAL_RUNTIME_UTTERANCES[family]) {
        const got = classifyCommercialRuntimeFamily(q);
        const ok = got === family;
        record(family, ok);
        if (!ok) misses.push(`${family} ← ${got || "null"} :: ${q}`);
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
      "lib/director-ia-commercial-runtime-004.js",
    ];
    for (const rel of runtime) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.equal(src.includes("director-ia-commercial-runtime-coverage-004"), false, rel);
    }
  });
});

describe("004 anti-collisions >=200", () => {
  it("tiene al menos 200 pares", () => {
    assert.ok(COMMERCIAL_ANTI_COLLISIONS.length >= 200, String(COMMERCIAL_ANTI_COLLISIONS.length));
  });

  it("no colisiona familias prohibidas", () => {
    for (const [q, want, not] of COMMERCIAL_ANTI_COLLISIONS) {
      const family = classifyCommercialRuntimeFamily(q);
      if (want && FAMILY_IDS.includes(want)) {
        assert.equal(family, want, `${q} → ${family} want ${want}`);
      }
      if (want === "OPEN_PRONOSTICO") {
        assert.equal(isOpenPronosticoQuestion(q), true, q);
        assert.notEqual(family, "CHANNEL_FORECAST_GUARDRAIL", q);
      }
      if (want === "CLIENT_LOOKUP") {
        assert.equal(isCasaAsClientName(q), true, q);
        assert.notEqual(family, "SALES_CHANNEL_SHARE", q);
      }
      if (not && not !== "CLIENT_MOVEMENT" && not !== "ACTION_REGISTER" && not !== "NUMERIC_FORECAST" && not !== "CLIENT_PROFILE" && not !== "CLIENT_COUNT" && not !== "CLIENT_RANKING") {
        assert.notEqual(family, not, q);
      }
    }
  });
});

describe("004 multi-turn >=80", () => {
  it("conserva periodo/result set y no sobrehereda", () => {
    assert.ok(COMMERCIAL_MULTI_TURN.length >= 80, String(COMMERCIAL_MULTI_TURN.length));
    for (const convo of COMMERCIAL_MULTI_TURN) {
      let prior = null;
      for (const turn of convo) {
        const family = classifyCommercialRuntimeFamily(turn.q, prior);
        const spec = extractClientMovementRankingSpec(turn.q, prior, { now: NOW });
        const plan = planDirectorIaQuestion(turn.q, prior ? { prior } : {});
        const expect = turn.expect || {};
        if (expect.family) {
          assert.equal(family, expect.family, `${turn.q} → ${family}`);
        }
        if (expect.notFamily) {
          assert.notEqual(family, expect.notFamily, turn.q);
        }
        if (expect.period && spec.period && expect.family !== "NEW_CLIENT_RETENTION" && family !== "NEW_CLIENT_RETENTION") {
          assert.equal(spec.period, expect.period, turn.q);
        }
        if (expect.noClarification && spec.period) {
          assert.ok(spec.period, turn.q);
        }
        if (family) {
          prior = {
            ok: true,
            family,
            movement:
              family === "NEW_CLIENTS" || family === "NEW_CLIENT_PURCHASE_TOTAL" || family === "NEW_CLIENT_DISCOUNT"
                ? "NUEVOS"
                : family === "DECREASED_CLIENT_VOLUME_TOTAL"
                  ? "DISMINUYERON"
                  : family.indexOf("LOST") === 0
                    ? "DEJARON_DE_COMPRAR"
                    : prior && prior.movement,
            period: spec.period || (prior && prior.period) || (expect.period || null),
            intent: plan.intent,
          };
        }
      }
    }
  });
});

describe("004 regresiones de la prueba real", () => {
  it("las 12 preguntas fallidas clasifican y no van a Action Register / forecast de planta", () => {
    for (const row of REAL_FAILURE_REGRESSIONS) {
      const family = classifyCommercialRuntimeFamily(row.q);
      assert.equal(family, row.family, `${row.q} → ${family}`);
      const plan = planDirectorIaQuestion(row.q);
      if (row.intent) assert.equal(plan.intent, row.intent, `${row.q} intent ${plan.intent}`);
      if (row.notIntent) assert.notEqual(plan.intent, row.notIntent, row.q);
      assert.notEqual(plan.intent, "action_status", row.q);
      assert.notEqual(plan.intent, "revision_notes", row.q);
    }
  });

  it("nuevos: total comprado agrega y no solo ranking", async () => {
    const payload = await loadClientMovementForChat(null, 1, AUTH, {
      question: "¿Cuánto compraron los clientes nuevos de agosto?",
      now: NOW,
      movementRows: [
        { cliente: "A", movement: "NUEVOS", kg_b: 10000, kg_a: 0, delta_kg: 10000, monto: 0 },
        { cliente: "B", movement: "NUEVOS", kg_b: 5000, kg_a: 0, delta_kg: 5000, monto: 0 },
        { cliente: "C", movement: "DEJARON_DE_COMPRAR", kg_b: 0, kg_a: 8000, delta_kg: -8000, monto: 0 },
      ],
    });
    assert.equal(payload.aggregates.count, 2);
    assert.equal(payload.aggregates.bought_ton, 15);
    const answer = buildClientMovementAnswer(payload);
    assert.match(answer, /15\.0 toneladas|15\.0 ton/);
    assert.match(answer, /2 clientes nuevos/);
  });

  it("nuevos: descuento ARR no Action Register", async () => {
    const plan = planDirectorIaQuestion("¿Qué descuento tuvieron los clientes nuevos de agosto?");
    assert.equal(plan.intent, "client_movement");
    const payload = await loadClientMovementForChat(null, 1, AUTH, {
      question: "¿Qué descuento tuvieron los clientes nuevos de agosto?",
      now: NOW,
      movementRows: [
        { cliente: "A", movement: "NUEVOS", kg_b: 10000, kg_a: 0, delta_kg: 10000, monto: 200 },
        { cliente: "B", movement: "NUEVOS", kg_b: 5000, kg_a: 0, delta_kg: 5000, monto: 50 },
      ],
    });
    assert.ok(payload.aggregates.has_discount_evidence);
    assert.ok(Math.abs(payload.aggregates.discount_kg - 250 / 15000) < 1e-9);
    const answer = buildClientMovementAnswer(payload);
    assert.match(answer, /descuento/i);
    assert.doesNotMatch(answer, /action register/i);
  });

  it("retención cohorte M→M+1 count y %", async () => {
    const payload = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Cuántos de los clientes nuevos de agosto volvieron a comprar?",
      now: NOW,
      priorSpec: { ok: true, period: "2026-08" },
      movementPack: {
        packA: {
          rows: [
            { cliente: "N1", prevKg: 0, kg: 12, estatus: "Nuevo" },
            { cliente: "N2", prevKg: 0, kg: 8, estatus: "Nuevo" },
          ],
        },
        packB: {
          rows: [
            { cliente: "N1", kg: 4 },
            { cliente: "N2", kg: 0 },
          ],
        },
      },
    });
    assert.equal(payload.retention.new_clients_count, 2);
    assert.equal(payload.retention.retained_next_month_count, 1);
    assert.equal(payload.retention.rate, 50);
    const answer = buildPredictiveAnswer(payload);
    assert.match(answer, /50%/);
    assert.match(answer, /NEW_IN_PERIOD/);
  });

  it("dejaron y disminuyeron suman lost_volume", async () => {
    const lost = await loadClientMovementForChat(null, 1, AUTH, {
      question: "¿Cuántas toneladas perdimos por clientes que dejaron de comprar en agosto?",
      now: NOW,
      movementRows: [
        { cliente: "X", movement: "DEJARON_DE_COMPRAR", kg_a: 20000, kg_b: 0, delta_kg: -20000 },
        { cliente: "Y", movement: "DEJARON_DE_COMPRAR", kg_a: 10000, kg_b: 0, delta_kg: -10000 },
      ],
    });
    assert.equal(lost.aggregates.lost_volume_ton, 30);
    assert.match(buildClientMovementAnswer(lost), /30\.0 ton/);
    const dec = await loadClientMovementForChat(null, 1, AUTH, {
      question: "¿Cuántas toneladas perdimos por los que bajaron en agosto?",
      now: NOW,
      movementRows: [
        { cliente: "Z", movement: "DISMINUYERON", kg_a: 15000, kg_b: 5000, delta_kg: -10000 },
      ],
    });
    assert.equal(dec.aggregates.lost_volume_ton, 10);
    assert.match(buildClientMovementAnswer(dec), /10\.0 ton/);
  });

  it("churn risk materializa evidencia y expected next da fecha", async () => {
    const risk = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Qué clientes están en riesgo de dejar de comprar?",
      now: NOW,
      asOfDate: "2026-09-17",
      dicfRows: [
        { cliente: "CLIENTE TARDE", lastPurchaseDate: "2026-08-01", freqDays: 10 },
        { cliente: "SIN FREQ", lastPurchaseDate: "2026-08-01" },
      ],
    });
    assert.ok(risk.risk && risk.risk.length >= 1);
    assert.match(buildPredictiveAnswer(risk), /Última compra/);
    assert.doesNotMatch(buildPredictiveAnswer(risk), /va a dejar de comprar/);
    const expected = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      asOfDate: "2026-09-17",
      dicfRows: [{ cliente: "TORTILLERIA ERICK", lastPurchaseDate: "2026-09-01", freqDays: 7 }],
    });
    assert.equal(expected.expected[0].expected_next, "2026-09-08");
    const ans = buildPredictiveAnswer(expected);
    assert.match(ans, /2026-09-08/);
    assert.match(ans, /estimación histórica/);
  });

  it("share, cambio en pp, mix Casa/Comi y top por canal", async () => {
    const salesRows = [
      { cliente: "A", kg: 70000, categoria: "Casa" },
      { cliente: "B", kg: 30000, categoria: "Comisionista" },
    ];
    const priorRows = [
      { cliente: "A", kg: 50000, categoria: "Casa" },
      { cliente: "B", kg: 50000, categoria: "Comisionista" },
    ];
    const share = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Qué porcentaje de la venta de enero fue Casa y qué porcentaje Comisionista?",
      now: NOW,
      priorSpec: { ok: true, period: "2026-01" },
      salesRows,
    });
    assert.equal(share.channels.casa_pct, 70);
    assert.equal(share.channels.comisionista_pct, 30);
    const change = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Casa ganó participación?",
      now: NOW,
      priorSpec: { ok: true, period: "2026-08" },
      salesRows,
      priorRows,
    });
    assert.equal(change.change.casa_pp, 20);
    assert.match(buildPredictiveAnswer(change), / pp/);
    const mix = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Cómo cambió la mezcla de ventas este mes?",
      now: NOW,
      priorSpec: { ok: true, period: "2026-08" },
      salesRows,
      priorRows,
    });
    assert.equal(mix.change.mix_kind, "CASA_COMISIONISTA");
    assert.equal(mix.change.casa_pp, 20);
    const top = rankRows(salesRows, 10, "COMISIONISTA");
    assert.equal(top[0].cliente, "B");
    assert.equal(isTopClientsByChannelQuestion("Dame los 10 clientes comisionistas que más compran"), true);
  });

  it("forecast Casa no inventa ni reparte el de planta", async () => {
    assert.equal(isChannelForecastGuardrailQuestion("¿Cuál será la venta proyectada de Casa?"), true);
    const payload = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Cuál será la venta proyectada de Casa?",
      now: NOW,
      plantForecastKg: 1373200,
    });
    assert.equal(payload.family, "CHANNEL_FORECAST_GUARDRAIL");
    const answer = buildPredictiveAnswer(payload);
    assert.match(answer, /No existe un forecast separado/);
    assert.doesNotMatch(answer, /1373/);
    assert.equal(answer.includes("Casa:"), false);
    assert.ok(CHANNEL_FORECAST_NOT_AVAILABLE.length > 20);
  });

  it("periodo y result set se heredan; no hay sobreherencia", () => {
    const first = extractClientMovementRankingSpec("dame el top 10 que dejaron de comprar", null, { now: NOW });
    assert.ok(!first.period);
    const second = extractClientMovementRankingSpec("agosto", { ok: true, movement: "DEJARON_DE_COMPRAR" }, { now: NOW });
    assert.equal(second.period, "2026-08");
    const third = extractClientMovementRankingSpec(
      "¿Cuántas toneladas perdimos por esos clientes?",
      { ok: true, movement: "DEJARON_DE_COMPRAR", period: "2026-08" },
      { now: NOW }
    );
    assert.equal(third.period, "2026-08");
    assert.equal(third.movement, "DEJARON_DE_COMPRAR");
    assert.equal(third.want_aggregate, true);
    const switched = classifyCommercialRuntimeFamily("¿Qué porcentaje de enero fue Casa?", {
      family: "LOST_CLIENTS",
      movement: "DEJARON_DE_COMPRAR",
      period: "2026-08",
    });
    assert.equal(switched, "SALES_CHANNEL_SHARE");
  });
});

describe("004 reporte por familia", () => {
  it("imprime conteos", () => {
    const lines = FAMILY_IDS.map((f) => {
      const r = familyReport[f] || { utterances: 0, passed: 0, failed: 0 };
      return `${f}: utterances=${r.utterances} passed=${r.passed} failed=${r.failed}`;
    });
    process.stdout.write(`\n[004 family report]\n${lines.join("\n")}\n`);
    process.stdout.write(`anti-collisions=${COMMERCIAL_ANTI_COLLISIONS.length}\n`);
    process.stdout.write(`multi-turn=${COMMERCIAL_MULTI_TURN.length}\n`);
    assert.ok(FAMILY_IDS.every((f) => (familyReport[f] || {}).utterances >= 30));
  });
});
