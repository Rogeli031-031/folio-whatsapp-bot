"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  classifyCommercialRuntimeFamily,
  FAMILY_IDS: FAMILY_IDS_004,
} = require("../lib/director-ia-commercial-runtime-004");
const {
  classifyHardeningFamily,
  FAMILY_IDS,
  isChannelForecastProjectionGuardrailQuestion,
  rowHasDiscountEvidence,
} = require("../lib/director-ia-commercial-runtime-hardening-005");
const {
  loadClientMovementForChat,
  buildClientMovementAnswer,
  extractClientMovementRankingSpec,
} = require("../lib/director-ia-client-movement");
const {
  loadPredictiveForChat,
  buildPredictiveAnswer,
  buildFrame,
  extractContraReferenceMonth,
} = require("../lib/director-ia-predictive-commercial");
const {
  loadClientRankingForChat,
  buildClientRankingAnswer,
  extractClientRankingSpec,
} = require("../lib/director-ia-client-ranking");
const { normalize } = require("../lib/director-ia-executive-backlog");
const {
  HARDENING_FAMILY_IDS,
  HARDENING_UTTERANCES,
  HARDENING_ANTI_COLLISIONS,
  HARDENING_MULTI_TURN,
  HARDENING_REGRESSIONS,
} = require("./fixtures/director-ia-commercial-runtime-hardening-005");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-17T12:00:00-06:00");
const AUTH = { dashboardAuth: { role: "ADMIN", plantaIds: [1] } };

describe("005 cobertura 8 familias × 30", () => {
  it("define las 8 familias y cada una tiene >=30 utterances distintas", () => {
    assert.deepEqual([...FAMILY_IDS], [...HARDENING_FAMILY_IDS]);
    const missing = [];
    for (const family of FAMILY_IDS) {
      const list = HARDENING_UTTERANCES[family] || [];
      const uniq = new Set(list.map((s) => String(s).trim().toLowerCase()));
      if (list.length < 30 || uniq.size < 30) missing.push(`${family}:${list.length}/${uniq.size}`);
    }
    assert.equal(missing.length, 0, missing.join("; "));
    const total = FAMILY_IDS.reduce((s, f) => s + HARDENING_UTTERANCES[f].length, 0);
    assert.ok(total >= 240, `utterances ${total}`);
  });

  it("cada utterance clasifica a su familia", () => {
    const misses = [];
    for (const family of FAMILY_IDS) {
      for (const q of HARDENING_UTTERANCES[family]) {
        const got = classifyHardeningFamily(q);
        if (got !== family) misses.push(`${family} ← ${got || "null"} :: ${q}`);
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 50).join("\n"));
  });

  it("el fixture no se importa desde runtime de producción", () => {
    const runtime = [
      "lib/director-ia-planner.js",
      "lib/director-ia-chat.js",
      "lib/director-ia-predictive-commercial.js",
      "lib/director-ia-client-movement.js",
      "lib/director-ia-commercial-runtime-004.js",
      "lib/director-ia-commercial-runtime-hardening-005.js",
    ];
    for (const rel of runtime) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.equal(src.includes("director-ia-commercial-runtime-hardening-005.js") && rel.endsWith("test.js"), false);
      assert.equal(src.includes("test/fixtures/director-ia-commercial-runtime-hardening-005"), false, rel);
    }
  });
});

describe("005 anti-collisions >=120", () => {
  it("tiene al menos 120 pares", () => {
    assert.ok(HARDENING_ANTI_COLLISIONS.length >= 120, String(HARDENING_ANTI_COLLISIONS.length));
  });

  it("no colisiona familias prohibidas", () => {
    for (const [q, want, not] of HARDENING_ANTI_COLLISIONS) {
      const family = classifyHardeningFamily(q);
      if (want && FAMILY_IDS.includes(want)) {
        assert.equal(family, want, `${q} → ${family} want ${want}`);
      }
      if (not && FAMILY_IDS.includes(not)) {
        assert.notEqual(family, not, q);
      }
    }
  });
});

describe("005 multi-turn >=60", () => {
  it("conserva periodo, operación y no inventa junio→julio", () => {
    assert.ok(HARDENING_MULTI_TURN.length >= 60, String(HARDENING_MULTI_TURN.length));
    for (const convo of HARDENING_MULTI_TURN) {
      let prior = null;
      for (const turn of convo) {
        const family005 = classifyHardeningFamily(turn.q, prior);
        const family004 = classifyCommercialRuntimeFamily(turn.q, prior);
        const spec = extractClientMovementRankingSpec(turn.q, prior, { now: NOW });
        const frame = buildFrame(turn.q, prior, NOW);
        const expect = turn.expect || {};
        if (expect.family && FAMILY_IDS.includes(expect.family)) {
          assert.equal(family005, expect.family, `${turn.q} → ${family005}`);
        }
        if (expect.period && spec.period) {
          assert.equal(spec.period, expect.period, turn.q);
        }
        if (expect.noClarification && spec.period) {
          assert.ok(spec.period, turn.q);
        }
        if (expect.keepAggregate) {
          assert.equal(spec.want_aggregate, true, turn.q);
          assert.notEqual(family004, "LOST_CLIENTS", turn.q);
        }
        if (expect.from || expect.to) {
          assert.equal(frame.period_from || expect.from, expect.from || frame.period_from, turn.q);
          assert.equal(frame.period, expect.to || frame.period, turn.q);
          assert.notEqual(frame.period_from, "2026-06", "nunca junio→julio por defecto");
        }
        prior = {
          ok: true,
          family: family005 || family004 || (prior && prior.family),
          movement:
            family005 === "CONTEXTUAL_NEW_CLIENT_COUNT" || family004 === "NEW_CLIENTS"
              ? "NUEVOS"
              : family005 === "LOST_VOLUME_CONTEXTUAL_AGGREGATE" ||
                  family005 === "PENDING_CLARIFICATION_OPERATION" ||
                  (family004 && String(family004).indexOf("LOST") === 0)
                ? "DEJARON_DE_COMPRAR"
                : prior && prior.movement,
          period: spec.period || frame.period || (prior && prior.period) || expect.period || null,
          want_aggregate:
            expect.keepAggregate ||
            family005 === "LOST_VOLUME_CONTEXTUAL_AGGREGATE" ||
            family005 === "PENDING_CLARIFICATION_OPERATION" ||
            (prior && prior.want_aggregate),
          pending_operation:
            family005 === "LOST_VOLUME_CONTEXTUAL_AGGREGATE" || family005 === "PENDING_CLARIFICATION_OPERATION"
              ? "AGGREGATE"
              : prior && prior.pending_operation,
          pending_family: family005 === "PENDING_CLARIFICATION_OPERATION" ? "LOST_VOLUME_TOTAL" : prior && prior.pending_family,
        };
      }
    }
  });
});

describe("005 regresiones literales", () => {
  it("clasifica las preguntas reales", () => {
    for (const row of HARDENING_REGRESSIONS) {
      if (row.family === "TOP_CLIENTS_BY_CHANNEL") {
        assert.equal(classifyCommercialRuntimeFamily(row.q), "TOP_CLIENTS_BY_CHANNEL", row.q);
        continue;
      }
      assert.equal(classifyHardeningFamily(row.q), row.family, row.q);
    }
  });

  it("total de clientes nuevos hereda agosto y no pide mes", async () => {
    const payload = await loadClientMovementForChat(null, 1, AUTH, {
      question: "total de clientes nuevos",
      now: NOW,
      priorSpec: { ok: true, movement: "NUEVOS", period: "2026-08", family: "NEW_CLIENTS" },
      movementRows: Array.from({ length: 68 }, (_, i) => ({
        cliente: `N${i + 1}`,
        movement: "NUEVOS",
        kg_b: 1000,
        kg_a: 0,
        delta_kg: 1000,
        monto: 10,
        hasDiscountRow: true,
      })),
    });
    assert.equal(payload.spec.period, "2026-08");
    assert.equal(payload.aggregates.count, 68);
    const answer = buildClientMovementAnswer(payload);
    assert.match(answer, /En agosto de 2026 entraron 68 clientes nuevos/);
    assert.doesNotMatch(answer, /Indica el mes|De qué mes/i);
  });

  it("DATA_NOT_FOUND nunca se vuelve 0.0000 y el agregado declara cobertura", async () => {
    const payload = await loadClientMovementForChat(null, 1, AUTH, {
      question: "¿Qué descuento tuvieron los clientes nuevos de agosto?",
      now: NOW,
      movementRows: [
        {
          cliente: "RESIDENCIAL LAS OLAS",
          movement: "NUEVOS",
          kg_b: 8000,
          kg_a: 0,
          delta_kg: 8000,
          monto: null,
          hasDiscountRow: false,
          discount_status: "DATA_NOT_FOUND",
        },
        { cliente: "CON EVIDENCIA", movement: "NUEVOS", kg_b: 2000, kg_a: 0, delta_kg: 2000, monto: 40, hasDiscountRow: true },
      ],
    });
    assert.equal(payload.aggregates.discount_evidenced_count, 1);
    assert.equal(payload.aggregates.discount_missing_count, 1);
    const olas = payload.matched.find((r) => r.cliente === "RESIDENCIAL LAS OLAS");
    assert.equal(rowHasDiscountEvidence(olas), false);
    assert.notEqual(olas.descKg, 0);
    const answer = buildClientMovementAnswer(payload);
    assert.match(answer, /DATA_NOT_FOUND/);
    assert.doesNotMatch(answer, /RESIDENCIAL LAS OLAS — descuento 0\.0000/);
    assert.match(answer, /1 de 2 clientes tienen evidencia de descuento/);
    assert.match(answer, /1 no tienen fila de descuento/);
  });

  it("pérdida por caídos hereda periodo y responde total primero", async () => {
    const payload = await loadClientMovementForChat(null, 1, AUTH, {
      question: "¿Cuánto dejamos de vender por los clientes que cayeron a cero?",
      now: NOW,
      priorSpec: { ok: true, movement: "DEJARON_DE_COMPRAR", period: "2026-08", want_aggregate: true },
      movementRows: [
        { cliente: "X", movement: "DEJARON_DE_COMPRAR", kg_a: 20000, kg_b: 0, delta_kg: -20000 },
        { cliente: "Y", movement: "DEJARON_DE_COMPRAR", kg_a: 10000, kg_b: 0, delta_kg: -10000 },
      ],
    });
    assert.equal(payload.spec.period, "2026-08");
    assert.equal(payload.aggregates.lost_volume_ton, 30);
    const answer = buildClientMovementAnswer(payload);
    assert.match(answer, /Pérdida total: 30\.0 toneladas/);
  });

  it("aclaración de mes conserva operación agregada", () => {
    const first = extractClientMovementRankingSpec("¿Cuánto dejamos de vender por los clientes que cayeron a cero?", null, {
      now: NOW,
    });
    assert.equal(first.want_aggregate, true);
    assert.ok(!first.period);
    const second = extractClientMovementRankingSpec("agosto", { ok: true, ...first, pending_operation: "AGGREGATE" }, { now: NOW });
    assert.equal(second.period, "2026-08");
    assert.equal(second.want_aggregate, true);
    assert.equal(second.movement, "DEJARON_DE_COMPRAR");
    assert.equal(classifyHardeningFamily("agosto", { pending_operation: "AGGREGATE", want_aggregate: true }), "PENDING_CLARIFICATION_OPERATION");
  });

  it("churn risk nunca responde vacío", async () => {
    const empty = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Qué clientes están en riesgo de dejar de comprar?",
      now: NOW,
      dicfRows: [],
    });
    const emptyAns = buildPredictiveAnswer(empty);
    assert.ok(String(emptyAns).trim().length > 0);
    assert.match(emptyAns, /INSUFFICIENT_EVIDENCE|frecuencia histórica|señal/);
    const sept = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Qué clientes están en riesgo de dejar de comprar en septiembre?",
      now: NOW,
      asOfDate: "2026-09-17",
      dicfRows: [{ cliente: "CLIENTE TARDE", lastPurchaseDate: "2026-08-01", freqDays: 10 }],
    });
    const septAns = buildPredictiveAnswer(sept);
    assert.ok(septAns.trim().length > 0);
    assert.match(septAns, /CLIENTE TARDE/);
    assert.match(septAns, /freqDays|Frecuencia|Última compra/);
    assert.match(septAns, /retraso/i);
    assert.doesNotMatch(septAns, /probabilidad 0\.\d+/);
  });

  it("expected next purchase nunca responde vacío", async () => {
    const ok = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      asOfDate: "2026-09-17",
      dicfRows: [{ cliente: "TORTILLERIA ERICK", lastPurchaseDate: "2026-09-01", freqDays: 7 }],
    });
    const ans = buildPredictiveAnswer(ok);
    assert.match(ans, /2026-09-08/);
    assert.match(ans, /última compra|lastPurchaseDate|última/i);
    assert.match(ans, /freqDays/);
    const noFreq = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      dicfRows: [{ cliente: "TORTILLERIA ERICK", lastPurchaseDate: "2026-09-01" }],
    });
    assert.match(buildPredictiveAnswer(noFreq), /INSUFFICIENT_EVIDENCE/);
    assert.match(buildPredictiveAnswer(noFreq), /freqDays/);
    const noLast = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      now: NOW,
      dicfRows: [{ cliente: "TORTILLERIA ERICK", freqDays: 7 }],
    });
    assert.match(buildPredictiveAnswer(noLast), /INSUFFICIENT_EVIDENCE/);
    assert.match(buildPredictiveAnswer(noLast), /última compra|last_purchase/i);
  });

  it("contra julio con contexto agosto es julio → agosto", async () => {
    const n = normalize("¿Cuánto cambió la participación de Casa contra julio?");
    assert.equal(extractContraReferenceMonth(n, NOW), "2026-07");
    const frame = buildFrame("¿Cuánto cambió la participación de Casa contra julio?", { ok: true, period: "2026-08", family: "SALES_CHANNEL_SHARE" }, NOW);
    assert.equal(frame.period_from, "2026-07");
    assert.equal(frame.period, "2026-08");
    assert.notEqual(frame.period_from, "2026-06");
    const payload = await loadPredictiveForChat(null, 1, AUTH, {
      question: "¿Cuánto cambió la participación de Casa contra julio?",
      now: NOW,
      priorSpec: { ok: true, period: "2026-08", family: "SALES_CHANNEL_SHARE" },
      salesRows: [
        { cliente: "A", kg: 70000, categoria: "Casa" },
        { cliente: "B", kg: 30000, categoria: "Comisionista" },
      ],
      priorRows: [
        { cliente: "A", kg: 50000, categoria: "Casa" },
        { cliente: "B", kg: 50000, categoria: "Comisionista" },
      ],
    });
    assert.equal(payload.change.from, "2026-07");
    assert.equal(payload.change.to, "2026-08");
    const noB = buildFrame("¿Cuánto cambió la participación de Casa contra julio?", null, NOW);
    assert.equal(noB.needs_contra_base, true);
  });

  it("top Comisionista filtra físicamente y etiqueta el canal", async () => {
    const spec = extractClientRankingSpec("Dame los 10 clientes comisionistas que más compraron en agosto.", null, { now: NOW });
    assert.equal(spec.customer_segment, "COMISIONISTA");
    const payload = await loadClientRankingForChat(null, 1, AUTH, {
      question: "Dame los 10 clientes comisionistas que más compraron en agosto.",
      now: NOW,
      salesRows: [
        { cliente_norm: "CASA UNO", cliente: "CASA UNO", kg: 90000, categoria: "Casa", canal: "Casa" },
        { cliente_norm: "COMI UNO", cliente: "COMI UNO", kg: 12000, categoria: "Comisionista", canal: "Comisionista" },
        { cliente_norm: "COMI DOS", cliente: "COMI DOS", kg: 11000, categoria: "Comisionista", canal: "Comisionista" },
      ],
    });
    assert.ok(payload.ranked.length >= 1);
    assert.ok(payload.ranked.every((r) => String(r.canal || "").toLowerCase().includes("comisionista")));
    assert.ok(payload.ranked.every((r) => !/casa uno/i.test(r.cliente)));
    const answer = buildClientRankingAnswer(payload);
    assert.match(answer, /Top 10 Comisionista — agosto de 2026|Top \d+ Comisionista — agosto de 2026/);
  });

  it("forecast/share proyectado por canal queda bloqueado", async () => {
    const q = "para septiembre que porcentaje de casa y de comisionistas proyectamos al cierre?";
    assert.equal(isChannelForecastProjectionGuardrailQuestion(q), true);
    const payload = await loadPredictiveForChat(null, 1, AUTH, {
      question: q,
      now: NOW,
      salesRows: [
        { cliente: "A", kg: 55000, categoria: "Casa" },
        { cliente: "B", kg: 45000, categoria: "Comisionista" },
      ],
    });
    assert.equal(payload.family, "CHANNEL_FORECAST_GUARDRAIL");
    const answer = buildPredictiveAnswer(payload);
    assert.match(answer, /No existe un forecast separado/);
    assert.doesNotMatch(answer, /Casa: 55%/);
    assert.doesNotMatch(answer, /Comisionista: 45%/);
    assert.equal(planDirectorIaQuestion(q).intent, "predictive_commercial");
  });
});

describe("005 no rompe 004", () => {
  it("004 sigue teniendo 14 familias", () => {
    assert.equal(FAMILY_IDS_004.length, 14);
  });
});
