"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  classifyExecutiveFamily,
  FAMILY_IDS,
  isOpenPronosticoQuestion,
  FAMILY_STATUS,
} = require("../lib/director-ia-executive-coverage");
const {
  extractClientMovementRankingSpec,
  loadClientMovementForChat,
  buildClientMovementAnswer,
  classifyEstatus,
} = require("../lib/director-ia-client-movement");
const { completePendingFrame } = require("../lib/director-ia-pending-completion");
const { isClientRankingQuestion } = require("../lib/director-ia-client-ranking");
const {
  EXECUTIVE_UTTERANCE_COVERAGE,
  EXECUTIVE_ANTI_COLLISIONS,
  EXECUTIVE_E2E_CONVERSATIONS,
} = require("./fixtures/director-ia-executive-utterance-coverage");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-17T12:00:00-06:00");

describe("cobertura 30/30 por familia", () => {
  it("cada familia crítica tiene >=30 utterances físicas", () => {
    const missing = [];
    for (const family of FAMILY_IDS) {
      const list = EXECUTIVE_UTTERANCE_COVERAGE[family] || [];
      const uniq = new Set(list.map((s) => String(s).trim().toLowerCase()));
      if (list.length < 30 || uniq.size < 30) {
        missing.push(`${family}:${list.length}/${uniq.size}`);
      }
    }
    assert.equal(missing.length, 0, missing.join("; "));
    for (const family of FAMILY_IDS) {
      assert.ok(EXECUTIVE_UTTERANCE_COVERAGE[family].length >= 30, family);
    }
  });

  it("el fixture no se importa desde runtime", () => {
    const runtime = [
      "lib/director-ia-planner.js",
      "lib/director-ia-chat.js",
      "lib/director-ia-executive-coverage.js",
      "lib/director-ia-client-movement.js",
    ];
    for (const rel of runtime) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.equal(src.includes("director-ia-executive-utterance-coverage"), false, rel);
    }
  });
});

describe("anti-collisions", () => {
  it("tiene al menos 150 pares", () => {
    assert.ok(EXECUTIVE_ANTI_COLLISIONS.length >= 150, String(EXECUTIVE_ANTI_COLLISIONS.length));
  });

  it("no colisiona familias prohibidas", () => {
    for (const [q, want, not] of EXECUTIVE_ANTI_COLLISIONS) {
      const family = classifyExecutiveFamily(q);
      if (want) {
        if (family) assert.notEqual(family, not, `${q} → ${family}`);
      } else {
        assert.notEqual(family, not, q);
      }
    }
  });

  it("dejaron vs más compran y abrir vs preguntar pronóstico", () => {
    assert.equal(planDirectorIaQuestion("top 10 clientes que dejaron de comprar").intent, "client_movement");
    assert.equal(planDirectorIaQuestion("top 10 clientes que más compran").intent, "client_ranking");
    assert.equal(isClientRankingQuestion("top 10 clientes que dejaron de comprar"), false);
    assert.equal(isOpenPronosticoQuestion("abre el pronóstico"), true);
    assert.equal(isOpenPronosticoQuestion("cuál es el pronóstico"), false);
    assert.equal(planDirectorIaQuestion("abre el pronóstico").intent, "open_pronostico");
    assert.notEqual(planDirectorIaQuestion("cuál es el pronóstico").intent, "open_pronostico");
  });
});

describe("pending DEJARON no se convierte en ranking", () => {
  it("septiembre solo completa PERIOD", async () => {
    const first = planDirectorIaQuestion("top 10 clientes que dejaron de comprar?");
    assert.equal(first.intent, "client_movement");
    const spec0 = extractClientMovementRankingSpec("top 10 clientes que dejaron de comprar?", null, { now: NOW });
    assert.equal(spec0.movement, "DEJARON_DE_COMPRAR");
    assert.equal(spec0.metric, "LOST_VOLUME");
    assert.equal(spec0.limit, 10);
    assert.equal(spec0.period, null);
    const gap = {
      kind: "dimension_completion",
      parent_intent: "client_movement",
      missing_fields: ["period"],
      frame: {
        domain: "ARR",
        operation: "RANK",
        entity_type: "CLIENT",
        movement: "DEJARON_DE_COMPRAR",
        metric: "LOST_VOLUME",
        direction: "HIGH",
        limit: 10,
        plant: null,
        channel: "ALL",
        subcategory: null,
      },
    };
    const done = completePendingFrame(gap, "septiembre", NOW);
    assert.ok(done && done.ok);
    assert.equal(done.parent_intent, "client_movement");
    assert.equal(done.frame.movement, "DEJARON_DE_COMPRAR");
    assert.equal(done.frame.metric, "LOST_VOLUME");
    assert.equal(done.frame.period_month, "2026-09");
    const spec1 = extractClientMovementRankingSpec("septiembre", { ok: true, ...done.frame }, { now: NOW });
    assert.equal(spec1.movement, "DEJARON_DE_COMPRAR");
    assert.equal(spec1.metric, "LOST_VOLUME");
    assert.equal(spec1.period, "2026-09");
    assert.notEqual(planDirectorIaQuestion("septiembre", { forceIntent: "client_movement" }).intent, "client_ranking");
  });

  it("ordena dejaron por volumen perdido, no por compra actual", async () => {
    const rows = [
      { cliente: "A", movement: "DEJARON_DE_COMPRAR", delta_kg: -1000, delta_ingreso: -100, categoria: "Casa" },
      { cliente: "B", movement: "DEJARON_DE_COMPRAR", delta_kg: -9000, delta_ingreso: -50, categoria: "Casa" },
      { cliente: "C", movement: "DISMINUYERON", delta_kg: -20000, delta_ingreso: -500, categoria: "Casa" },
    ];
    const pack = await loadClientMovementForChat(null, 1, { dashboardAuth: { role: "ADMIN", plantaIds: [1] } }, {
      question: "top 10 clientes que dejaron de comprar",
      now: NOW,
      priorSpec: { ok: true, movement: "DEJARON_DE_COMPRAR", period: "2026-09", metric: "LOST_VOLUME", limit: 10, channel: "ALL" },
      movementRows: rows,
    });
    assert.equal(pack.ranked[0].cliente, "B");
    assert.equal(pack.spec.movement, "DEJARON_DE_COMPRAR");
    const answer = buildClientMovementAnswer(pack);
    assert.match(answer, /dejaron de comprar/i);
    assert.doesNotMatch(answer, /compra observada/i);
  });
});

describe("ARR estatus físico", () => {
  it("clasifica Dejó / Nuevo / Disminuyó / Aumentó como el mes ARR", () => {
    assert.equal(classifyEstatus(100, 0), "DEJARON_DE_COMPRAR");
    assert.equal(classifyEstatus(0, 80), "NUEVOS");
    assert.equal(classifyEstatus(100, 40), "DISMINUYERON");
    assert.equal(classifyEstatus(40, 90), "AUMENTARON");
    assert.equal(classifyEstatus(0, 0), null);
  });
});

describe("E2E multi-turn >=100", () => {
  it("conserva semántica en conversaciones", () => {
    assert.ok(EXECUTIVE_E2E_CONVERSATIONS.length >= 100, String(EXECUTIVE_E2E_CONVERSATIONS.length));
    let prior = null;
    for (const convo of EXECUTIVE_E2E_CONVERSATIONS) {
      prior = null;
      for (const turn of convo) {
        const plan = planDirectorIaQuestion(turn.q, prior && prior.intent ? { forceIntent: prior.intent } : {});
        const spec = extractClientMovementRankingSpec(turn.q, prior, { now: NOW });
        const family = classifyExecutiveFamily(turn.q);
        const expect = turn.expect || {};
        if (expect.intent) assert.equal(plan.intent, expect.intent, turn.q);
        if (expect.not_intent) assert.notEqual(plan.intent, expect.not_intent, turn.q);
        if (expect.movement && spec.ok) assert.equal(spec.movement, expect.movement, turn.q);
        if (expect.period) assert.equal(spec.period, expect.period, turn.q);
        if (expect.channel && spec.ok) assert.equal(spec.channel, expect.channel, turn.q);
        if (expect.limit && spec.ok) assert.equal(spec.limit, expect.limit, turn.q);
        if (expect.family) assert.equal(family, expect.family, turn.q);
        if (spec.ok) prior = spec;
        else if (plan.intent === "client_movement" || plan.intent === "open_pronostico") {
          prior = { ok: true, intent: plan.intent, movement: spec.movement };
        }
      }
    }
  });
});

const SUPPORTED_CANONICAL = Object.freeze({
  CLIENTS_STOPPED_BUYING: "qué clientes dejaron de comprar",
  CLIENTS_DECREASED: "qué clientes disminuyeron",
  CLIENTS_INCREASED: "qué clientes aumentaron",
  CLIENTS_NEW: "qué clientes nuevos entraron",
  LOST_INCOME: "cuánto ingreso perdimos por los que dejaron de comprar",
  MOVEMENT_SUMMARY: "dame movimiento de clientes",
  CLIENT_RANKING: "top 10 clientes que más compran",
  DISCOUNT_RANKING: "clientes con mayor descuento",
  DAILY_SALES: "cuánto vendimos hoy",
  FORECAST_CLOSE: "cuál es el pronóstico",
  OPEN_PRONOSTICO: "abre el pronóstico",
  PROFITABILITY_STATUS: "rentabilidad general",
  EXPENSE_RANKING: "cuál es el mayor rubro de gasto",
  OVERDUE_ACTIONS: "qué acciones están vencidas",
  ACTIONS_BY_RESPONSIBLE: "qué responsable tiene más pendientes",
  EXPIRED_EQUIPMENT: "qué equipos están vencidos",
  EQUIPMENT_DUE: "qué equipos vencen",
  EXTINGUISHER_ATTENTION: "qué extintores requieren atención",
  EXECUTIVE_STATUS: "cómo vamos",
});

describe("matriz de estado", () => {
  it("toda familia tiene estado y las SUPPORTED canónicas no caen a unknown", () => {
    for (const family of FAMILY_IDS) {
      assert.ok(FAMILY_STATUS[family], family);
    }
    for (const [family, sample] of Object.entries(SUPPORTED_CANONICAL)) {
      assert.equal(FAMILY_STATUS[family], "SUPPORTED", family);
      const plan = planDirectorIaQuestion(sample);
      assert.notEqual(plan.intent, "unknown", `${family} ${sample} → ${plan.intent}`);
    }
  });
});
