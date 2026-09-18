"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isClientRankingQuestion } = require("../lib/director-ia-client-ranking");
const {
  FAMILY_IDS,
  FAMILY_STATUS,
  classifyPredictiveFamily,
  isPredictiveCommercialQuestion,
  isSalesChannelShareQuestion,
  buildFrame,
  loadPredictiveForChat,
  buildPredictiveAnswer,
  sumByChannel,
  rankRows,
  paretoCut,
  pct,
} = require("../lib/director-ia-predictive-commercial");
const {
  PREDICTIVE_UTTERANCE_COVERAGE,
  PREDICTIVE_ANTI_COLLISIONS,
  PREDICTIVE_E2E_CONVERSATIONS,
} = require("./fixtures/director-ia-predictive-commercial-coverage");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-17T12:00:00-06:00");
const AUTH = { dashboardAuth: { role: "ADMIN", plantaIds: [1] } };

describe("cobertura 30/30 por familia predictiva", () => {
  it("cada familia requerida tiene >=30 utterances distintas", () => {
    const missing = [];
    for (const family of FAMILY_IDS) {
      const list = PREDICTIVE_UTTERANCE_COVERAGE[family] || [];
      const uniq = new Set(list.map((s) => String(s).trim().toLowerCase()));
      if (list.length < 30 || uniq.size < 30) missing.push(`${family}:${list.length}/${uniq.size}`);
    }
    assert.equal(missing.length, 0, missing.join("; "));
  });

  it("cada utterance clasifica a su familia", () => {
    const misses = [];
    for (const family of FAMILY_IDS) {
      for (const q of PREDICTIVE_UTTERANCE_COVERAGE[family]) {
        const got = classifyPredictiveFamily(q);
        if (got !== family) misses.push(`${family} ← ${got || "null"} :: ${q}`);
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 20).join("\n"));
  });

  it("el fixture no se importa desde runtime", () => {
    const runtime = [
      "lib/director-ia-planner.js",
      "lib/director-ia-chat.js",
      "lib/director-ia-predictive-commercial.js",
    ];
    for (const rel of runtime) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.equal(src.includes("director-ia-predictive-commercial-coverage"), false, rel);
    }
  });
});

describe("anti-collisions predictivas >=100", () => {
  it("tiene al menos 100 pares", () => {
    assert.ok(PREDICTIVE_ANTI_COLLISIONS.length >= 100, String(PREDICTIVE_ANTI_COLLISIONS.length));
  });

  it("no colisiona familias prohibidas", () => {
    for (const [q, want, not] of PREDICTIVE_ANTI_COLLISIONS) {
      const family = classifyPredictiveFamily(q);
      if (want && FAMILY_IDS.includes(want)) {
        assert.equal(family, want, `${q} → ${family} want ${want}`);
      }
      assert.notEqual(family, not, q);
    }
  });

  it("anti-collisions críticas de routing", () => {
    assert.equal(planDirectorIaQuestion("qué porcentaje de la venta es Comisionista").intent, "predictive_commercial");
    assert.equal(planDirectorIaQuestion("top 10 Comisionistas que más compran").intent, "client_ranking");
    assert.equal(isClientRankingQuestion("top 10 Comisionistas y porcentaje del forecast"), false);
    assert.equal(planDirectorIaQuestion("top 10 Comisionistas y porcentaje del forecast").intent, "predictive_commercial");
    assert.equal(classifyPredictiveFamily("qué porcentaje representan juntos los top 10"), "TOP_CLIENTS_PROJECTED_CONCENTRATION");
    assert.equal(isSalesChannelShareQuestion("cuánto vendió Comisionista"), false);
    assert.equal(isSalesChannelShareQuestion("qué porcentaje de clientes son Comisionistas"), false);
    assert.equal(isPredictiveCommercialQuestion("qué canal creció más"), false);
  });
});

describe("source-first Casa/Comisionista y top proyectado", () => {
  const salesRows = [
    { cliente_norm: "CLIENTE A", canal: "Comisionista", subcanal: "Autotanque", kg: 42100 },
    { cliente_norm: "CLIENTE B", canal: "Comisionista", subcanal: "Autotanque", kg: 35400 },
    { cliente_norm: "CLIENTE C", canal: "Casa", subcanal: "Carburación", kg: 80000 },
  ];
  const priorRows = [
    { cliente_norm: "CLIENTE A", canal: "Comisionista", kg: 40000 },
    { cliente_norm: "CLIENTE C", canal: "Casa", kg: 50000 },
  ];

  it("share observada usa casa/(casa+comi) y muestra toneladas", async () => {
    const pack = await loadPredictiveForChat(null, 1, AUTH, {
      question: "qué porcentaje de la venta fue Casa y qué porcentaje Comisionista",
      now: NOW,
      priorSpec: { ok: true, family: "SALES_CHANNEL_SHARE", period: "2026-01" },
      salesRows,
    });
    assert.equal(pack.family, "SALES_CHANNEL_SHARE");
    assert.equal(pack.data_semantics, "OBSERVED");
    const ch = sumByChannel(salesRows);
    assert.equal(pack.channels.casa_pct, pct(ch.casa_kg, ch.total_kg));
    const answer = buildPredictiveAnswer(pack);
    assert.match(answer, /Casa:/);
    assert.match(answer, /Comisionista:/);
    assert.match(answer, /ton/);
  });

  it("forecast por canal no se inventa", async () => {
    const pack = await loadPredictiveForChat(null, 1, AUTH, {
      question: "qué porcentaje proyectado es Casa y Comisionista",
      now: NOW,
      priorSpec: { ok: true, family: "SALES_CHANNEL_SHARE", period: "2026-01" },
    });
    assert.equal(pack.family, "SALES_CHANNEL_SHARE");
    assert.match(pack.limitation, /No hay forecast contractual por canal/i);
    assert.equal(pack.channels, undefined);
  });

  it("top proyectado usa venta observada / forecast planta y no llama proyección del cliente", async () => {
    const pack = await loadPredictiveForChat(null, 1, AUTH, {
      question: "top 10 clientes comisionistas que más compran y qué porcentaje representan del total proyectado",
      now: NOW,
      priorSpec: { ok: true, period: "2026-09", channel: "COMISIONISTA", limit: 10 },
      salesRows,
      plantForecastKg: 1400000,
    });
    assert.equal(pack.numerator, "OBSERVED_CLIENT_KG");
    assert.equal(pack.denominator, "PROJECTED_TOTAL_PLANT_SALES");
    assert.equal(pack.ranked[0].cliente, "CLIENTE A");
    const answer = buildPredictiveAnswer(pack);
    assert.match(answer, /venta observada/i);
    assert.match(answer, /cierre proyectado total de la planta/i);
    assert.match(answer, /No es proyección del cliente/i);
  });

  it("concentración acumulada y cambio de share en puntos porcentuales", async () => {
    const conc = await loadPredictiveForChat(null, 1, AUTH, {
      question: "qué porcentaje del forecast representan los top 10 juntos",
      now: NOW,
      priorSpec: { ok: true, period: "2026-09", channel: "COMISIONISTA", limit: 10 },
      salesRows,
      plantForecastKg: 1400000,
    });
    assert.equal(conc.family, "TOP_CLIENTS_PROJECTED_CONCENTRATION");
    assert.ok(conc.accumulated_pct != null);
    const change = await loadPredictiveForChat(null, 1, AUTH, {
      question: "cuántos puntos ganó Casa",
      now: NOW,
      priorSpec: { ok: true, period: "2026-09" },
      salesRows,
      priorRows,
    });
    const answer = buildPredictiveAnswer(change);
    assert.match(answer, /puntos porcentuales/);
    assert.match(answer, / pp/);
  });

  it("churn rate usa denominador kg previo > 0 y retención NEW_IN_PERIOD", async () => {
    const churn = await loadPredictiveForChat(null, 1, AUTH, {
      question: "cuál es el churn",
      now: NOW,
      priorSpec: { ok: true, period: "2026-09" },
      movementPack: {
        packB: {
          rows: [
            { cliente: "A", prevKg: 10, kg: 0 },
            { cliente: "B", prevKg: 10, kg: 8 },
            { cliente: "C", prevKg: 0, kg: 5 },
          ],
        },
      },
    });
    assert.equal(churn.churn.denominator, 2);
    assert.equal(churn.churn.numerator, 1);
    const ret = await loadPredictiveForChat(null, 1, AUTH, {
      question: "cuántos clientes nuevos siguen comprando",
      now: NOW,
      priorSpec: { ok: true, period: "2026-09" },
      movementPack: {
        packA: {
          rows: [
            { cliente: "NUEVO1", prevKg: 0, kg: 12, estatus: "Nuevo" },
            { cliente: "NUEVO2", prevKg: 0, kg: 9, estatus: "Nuevo" },
          ],
        },
        packB: {
          rows: [
            { cliente: "NUEVO1", kg: 7 },
            { cliente: "NUEVO2", kg: 0 },
          ],
        },
      },
    });
    assert.equal(ret.retention.new_in_prior, 2);
    assert.equal(ret.retention.retained, 1);
    assert.match(buildPredictiveAnswer(ret), /NEW_IN_PERIOD/);
  });

  it("anomalías CONTRACT_MISSING y accuracy SOURCE_MISSING y frescura usa MAX(fecha)", async () => {
    const anom = await loadPredictiveForChat(null, 1, AUTH, {
      question: "hay movimientos atípicos",
      now: NOW,
    });
    assert.match(anom.limitation, /criterio contractual/i);
    const acc = await loadPredictiveForChat(null, 1, AUTH, {
      question: "qué tan preciso fue el forecast",
      now: NOW,
    });
    assert.match(acc.limitation, /snapshot histórico/i);
    const fresh = await loadPredictiveForChat(null, 1, AUTH, {
      question: "con qué corte respondes",
      now: NOW,
      maxFecha: "2026-09-12",
      plantCodes: ["ACA"],
    });
    const answer = buildPredictiveAnswer(fresh);
    assert.match(answer, /2026-09-12/);
    assert.doesNotMatch(answer, /2026-09-17/);
  });

  it("helpers de ranking y pareto no inventan etiquetas estratégicas", () => {
    const ranked = rankRows(salesRows, 10, "COMISIONISTA");
    assert.equal(ranked[0].cliente, "CLIENTE A");
    const cut = paretoCut(
      rankRows(salesRows, 99, "ALL"),
      80,
      salesRows.reduce((s, r) => s + r.kg, 0)
    );
    assert.ok(cut.length >= 1);
  });
});

describe("E2E multi-turn >=50", () => {
  it("conserva familia, periodo, canal y semántica", () => {
    assert.ok(PREDICTIVE_E2E_CONVERSATIONS.length >= 50, String(PREDICTIVE_E2E_CONVERSATIONS.length));
    for (const convo of PREDICTIVE_E2E_CONVERSATIONS) {
      let prior = null;
      for (const turn of convo) {
        const family = classifyPredictiveFamily(turn.q, prior);
        const frame = buildFrame(turn.q, prior, NOW);
        const plan = planDirectorIaQuestion(
          turn.q,
          prior && prior.intent === "predictive_commercial" && !isPredictiveCommercialQuestion(turn.q)
            ? { forceIntent: "predictive_commercial" }
            : {}
        );
        const expect = turn.expect || {};
        if (expect.family) {
          assert.equal(family || frame.family, expect.family, turn.q);
        }
        if (expect.intent) assert.equal(plan.intent, expect.intent, `${turn.q} → ${plan.intent}`);
        if (expect.period) assert.equal(frame.period, expect.period, turn.q);
        if (expect.channel) assert.equal(frame.channel, expect.channel, turn.q);
        if (expect.limit) assert.equal(frame.limit, expect.limit, turn.q);
        if (expect.data_semantics) assert.equal(frame.data_semantics, expect.data_semantics, turn.q);
        if (frame.ok) {
          prior = { ...frame, intent: plan.intent === "unknown" && prior ? prior.intent : plan.intent };
        } else if (plan.intent === "client_ranking") {
          prior = { ok: true, family: "CLIENT_RANKING", intent: "client_ranking", channel: "COMISIONISTA", limit: 10 };
        }
      }
    }
  });
});

describe("matriz de estado", () => {
  it("toda familia tiene estado permitido", () => {
    const allowed = new Set(["SUPPORTED", "PARTIAL", "SOURCE_MISSING", "CONTRACT_MISSING", "NOT_IMPLEMENTED"]);
    for (const family of FAMILY_IDS) {
      assert.ok(allowed.has(FAMILY_STATUS[family]), family);
    }
    assert.equal(FAMILY_STATUS.COMMERCIAL_ANOMALIES, "CONTRACT_MISSING");
    assert.equal(FAMILY_STATUS.FORECAST_ACCURACY, "SOURCE_MISSING");
    assert.equal(FAMILY_STATUS.SALES_CHANNEL_SHARE, "PARTIAL");
    assert.equal(FAMILY_STATUS.TOP_CLIENTS_PROJECTED_SHARE, "SUPPORTED");
  });
});
