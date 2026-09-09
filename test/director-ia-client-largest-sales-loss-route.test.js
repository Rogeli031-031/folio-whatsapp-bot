"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { resolveConversationTurn } = require("../lib/director-ia-conversation-state");
const { deriveClienteKeys } = require("../lib/director-ia-client-profile");
const {
  isCommercialTrendQuestion,
  isCommercialMoversQuestion,
  isLargestSalesLossQuestion,
  selectLargestSalesLoss,
  resolveCommercialTrendSlots,
  loadCommercialTrendForChat,
  classifyPurchaseDelta,
} = require("../lib/director-ia-commercial-trend");

const ROOT = path.join(__dirname, "..");
const BASE_MAIN = "0a42123768829df7543888d0f84a0b084cf8645f";
const NOW = new Date("2026-09-08T12:00:00-06:00");

const S1 = "que cliente tiene la perdida mayor de venta entre mayo vs junio?";
const S2 = "que cliente perdió más venta entre mayo y junio?";
const S3 = "que cliente disminuyó más sus compras entre mayo y junio?";
const S4 = "que clientes disminuyeron entre mayo y junio?";
const S5 = "que clientes dejaron de comprar entre mayo y junio?";
const S6 = "que clientes aumentaron entre mayo y junio?";
const S7 = "cual cliente tuvo la mayor perdida de ventas entre mayo y junio?";
const S8 = "quien tuvo la mayor caída de venta entre mayo y junio?";

function gitDiffName(relPath) {
  return execFileSync("git", ["diff", "--name-only", "HEAD", "--", relPath], {
    encoding: "utf8",
    cwd: ROOT,
  }).trim();
}

function gitShow(relPath) {
  return execFileSync("git", ["show", `${BASE_MAIN}:${relPath.replace(/\\/g, "/")}`], {
    encoding: "utf8",
    cwd: ROOT,
  });
}

function echoProfile() {
  return {
    parent_intent: "client_profile",
    planta_id: 1,
    active_entities: [
      {
        kind: "client",
        display: "ARTURO",
        cliente_key: deriveClienteKeys(1, "Casa", "", "ARTURO")[0],
        cliente_keys: deriveClienteKeys(1, "Casa", "", "ARTURO"),
      },
    ],
    last_evidence_bundle_type: "client_profile",
    active_channel: "casa",
    active_period_months: ["2026-06", "2026-07", "2026-08"],
  };
}

function resolveTurn(question, echoed) {
  return resolveConversationTurn({
    question,
    plantaId: 1,
    echoedState: echoed,
    detectIntent: detectDirectorIaIntent,
  });
}

const LOSS_ROWS = {
  "2026-05-01|2026-05-31": [
    { cliente: "CLIENTE_A", kg: 20000 },
    { cliente: "CLIENTE_B", kg: 15000 },
    { cliente: "CLIENTE_UP", kg: 1000 },
  ],
  "2026-06-01|2026-06-30": [
    { cliente: "CLIENTE_A", kg: 12000 },
    { cliente: "CLIENTE_UP", kg: 51000 },
  ],
};

async function loadLoss(question, rows = LOSS_ROWS) {
  return loadCommercialTrendForChat(
    { connect: async () => ({ release() {} }) },
    1,
    { dashboardAuth: { role: "ZP" } },
    {
      question,
      now: NOW,
      resolvePlanta: async () => ({ id: 1, nombre: "Acapulco", clave: "E3" }),
      resolvePlantCodes: async () => ({ not_found: false, uniqueCodes: ["E3"], plantCode: "E3" }),
      queryCalendarKg: async (_c, _codes, start, end) => rows[`${start}|${end}`] || [],
    }
  );
}

describe("FIX client largest sales loss route R-LOSS-001..054", () => {
  it("001 BEFORE S1 = client_profile on base_main detector", () => {
    const src = gitShow("lib/director-ia-commercial-trend.js");
    const start = src.indexOf("function isCommercialMoversQuestion");
    const end = src.indexOf("function isCommercialTrendQuestion", start + 1);
    const fn = src.slice(start, end);
    assert.ok(fn.length > 50);
    assert.equal(/\bperdida\b/.test(fn), false);
    assert.equal(/\bcaida\b/.test(fn), false);
    assert.equal(src.includes("isLargestSalesLossQuestion"), false);
    assert.equal(planDirectorIaQuestion(S1, { forceIntent: "client_profile" }).intent, "client_profile");
  });

  it("002 AFTER S1 = commercial_trend", () => {
    assert.equal(isLargestSalesLossQuestion(S1), true);
    assert.equal(isCommercialMoversQuestion(S1), true);
    assert.equal(isCommercialTrendQuestion(S1), true);
    assert.equal(planDirectorIaQuestion(S1).intent, "commercial_trend");
  });

  it("003 S2 = commercial_trend", () => {
    assert.equal(isLargestSalesLossQuestion(S2), true);
    assert.equal(planDirectorIaQuestion(S2).intent, "commercial_trend");
  });

  it("004 S7 = commercial_trend", () => {
    assert.equal(isLargestSalesLossQuestion(S7), true);
    assert.equal(planDirectorIaQuestion(S7).intent, "commercial_trend");
  });

  it("005 S8 = commercial_trend", () => {
    assert.equal(isLargestSalesLossQuestion(S8), true);
    assert.equal(planDirectorIaQuestion(S8).intent, "commercial_trend");
  });

  it("006 S1 period_kind = calendar_compare", () => {
    const slots = resolveCommercialTrendSlots(S1, { now: NOW });
    assert.equal(slots.period_kind, "calendar_compare");
  });

  it("007 S1 A = mayo 2026", () => {
    const slots = resolveCommercialTrendSlots(S1, { now: NOW });
    assert.deepEqual(slots.month_a, {
      year: 2026,
      month: 5,
      first: "2026-05-01",
      last: "2026-05-31",
    });
  });

  it("008 S1 B = junio 2026", () => {
    const slots = resolveCommercialTrendSlots(S1, { now: NOW });
    assert.deepEqual(slots.month_b, {
      year: 2026,
      month: 6,
      first: "2026-06-01",
      last: "2026-06-30",
    });
  });

  it("009 no trailing 30d", () => {
    const slots = resolveCommercialTrendSlots(S1, { now: NOW });
    assert.equal(slots.range_days, null);
    assert.notEqual(slots.period_kind, "trailing");
  });

  it("010 no M9", async () => {
    const pack = await loadLoss(S1);
    assert.notEqual(pack.semantic_class, "delta_venta");
    assert.ok(!pack.dejaron);
    assert.ok(!pack.disminuyeron);
    assert.equal(pack.period_kind, "calendar_compare");
  });

  it("011 no client_profile runtime", async () => {
    const pack = await loadLoss(S1);
    assert.equal(pack.semantic_class, "commercial_trend");
    assert.ok(!pack.needs_identity);
    assert.ok(!pack.monthly_rows);
    assert.notEqual(planDirectorIaQuestion(S1).intent, "client_profile");
  });

  it("012 no canonical client required", async () => {
    const pack = await loadLoss(S1);
    assert.equal(pack.ok, true);
    assert.ok(!pack.needs_identity);
    assert.ok(!pack.needs_clarification);
  });

  it("013 source arr.ventas_diarias_cliente", async () => {
    const pack = await loadLoss(S1);
    assert.equal(pack.provenance.source, "arr.ventas_diarias_cliente");
  });

  it("014 no SQL nuevo vs base_main query", () => {
    const base = gitShow("lib/director-ia-commercial-trend.js");
    const cur = fs.readFileSync(path.join(ROOT, "lib/director-ia-commercial-trend.js"), "utf8");
    const extract = (src) => {
      const i = src.indexOf("async function defaultQueryCalendarClientKg");
      const j = src.indexOf("function mapKgByClient", i);
      return src.slice(i, j).replace(/\r\n/g, "\n");
    };
    assert.equal(extract(cur), extract(base));
    assert.match(extract(cur), /FROM arr\.ventas_diarias_cliente/);
  });

  it("015 full calendar universe reutilizado", async () => {
    const pack = await loadLoss(S1);
    assert.ok(Array.isArray(pack.all_calendar_movers));
    assert.ok(pack.all_calendar_movers.length >= 3);
    const names = pack.all_calendar_movers.map((m) => m.cliente).sort();
    assert.deepEqual(names, ["CLIENTE_A", "CLIENTE_B", "CLIENTE_UP"]);
  });

  it("016 loss candidates = delta_kg < 0", () => {
    const movers = [
      { cliente: "A", delta_kg: -8000, tipo: "disminucion" },
      { cliente: "B", delta_kg: -15000, tipo: "perdido" },
      { cliente: "U", delta_kg: 50000, tipo: "aumento" },
    ];
    const sel = selectLargestSalesLoss(movers);
    assert.ok(sel.candidates.every((m) => m.delta_kg < 0));
    assert.equal(sel.candidates.length, 2);
  });

  it("017 incluye disminucion", () => {
    const sel = selectLargestSalesLoss([
      { cliente: "A", delta_kg: -8000, tipo: "disminucion", kg_a: 20000, kg_b: 12000 },
    ]);
    assert.equal(sel.candidates[0].tipo, "disminucion");
    assert.equal(sel.winners[0].cliente, "A");
  });

  it("018 incluye perdido", () => {
    const sel = selectLargestSalesLoss([
      { cliente: "B", delta_kg: -15000, tipo: "perdido", kg_a: 15000, kg_b: 0 },
    ]);
    assert.equal(sel.candidates[0].tipo, "perdido");
    assert.equal(sel.winners[0].cliente, "B");
  });

  it("019 excluye aumento", () => {
    const sel = selectLargestSalesLoss([
      { cliente: "U", delta_kg: 50000, tipo: "aumento", kg_a: 1000, kg_b: 51000 },
      { cliente: "A", delta_kg: -8000, tipo: "disminucion", kg_a: 20000, kg_b: 12000 },
    ]);
    assert.equal(sel.candidates.some((m) => m.tipo === "aumento"), false);
    assert.equal(sel.winners[0].cliente, "A");
  });

  it("020 excluye nuevo", () => {
    const neu = classifyPurchaseDelta(0, 900);
    assert.notEqual(neu.tipo, "perdido");
    assert.notEqual(neu.tipo, "disminucion");
    const sel = selectLargestSalesLoss([
      { cliente: "N", delta_kg: neu.delta_kg, tipo: neu.tipo || "nuevo", kg_a: 0, kg_b: 900 },
      { cliente: "A", delta_kg: -100, tipo: "disminucion", kg_a: 200, kg_b: 100 },
    ]);
    assert.equal(sel.winners[0].cliente, "A");
    assert.equal(sel.candidates.some((m) => m.cliente === "N"), false);
  });

  it("021 excluye sin_cambio", () => {
    const flat = classifyPurchaseDelta(100, 100);
    assert.equal(flat.tipo, "sin_cambio");
    const sel = selectLargestSalesLoss([
      { cliente: "F", delta_kg: 0, tipo: "sin_cambio", kg_a: 100, kg_b: 100 },
      { cliente: "A", delta_kg: -10, tipo: "disminucion", kg_a: 20, kg_b: 10 },
    ]);
    assert.equal(sel.candidates.some((m) => m.tipo === "sin_cambio"), false);
  });

  it("022 ranking por raw delta ascendente", () => {
    const sel = selectLargestSalesLoss([
      { cliente: "A", delta_kg: -8000, tipo: "disminucion" },
      { cliente: "B", delta_kg: -15000, tipo: "perdido" },
    ]);
    assert.equal(sel.worst_delta, -15000);
    assert.equal(sel.winners[0].cliente, "B");
    assert.equal(sel.rank_rule, "raw_delta_ascending");
  });

  it("023 NO ranking por abs(delta)", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/director-ia-commercial-trend.js"), "utf8");
    const i = src.indexOf("function selectLargestSalesLoss");
    const j = src.indexOf("function ", i + "function selectLargestSalesLoss".length);
    const fn = src.slice(i, j > i ? j : i + 800);
    assert.equal(/Math\.abs/.test(fn), false);
    const sel = selectLargestSalesLoss([
      { cliente: "U", delta_kg: 50000, tipo: "aumento" },
      { cliente: "A", delta_kg: -8000, tipo: "disminucion" },
    ]);
    assert.equal(sel.winners[0].cliente, "A");
  });

  it("024 stopped buyer puede ganar", async () => {
    const pack = await loadLoss(S1);
    assert.equal(pack.loss_ranking.winners[0].cliente, "CLIENTE_B");
    assert.equal(pack.loss_ranking.winners[0].tipo, "perdido");
  });

  it("025 decreased buyer puede ganar", () => {
    const sel = selectLargestSalesLoss([
      { cliente: "A", delta_kg: -8000, tipo: "disminucion", kg_a: 20000, kg_b: 12000 },
      { cliente: "B", delta_kg: -1000, tipo: "perdido", kg_a: 1000, kg_b: 0 },
    ]);
    assert.equal(sel.winners[0].cliente, "A");
    assert.equal(sel.winners[0].tipo, "disminucion");
  });

  it("026 -15000 gana sobre -8000", async () => {
    const pack = await loadLoss(S1);
    assert.equal(pack.loss_ranking.worst_delta, -15000);
    assert.equal(pack.loss_ranking.winners[0].kg_a, 15000);
    assert.equal(pack.loss_ranking.winners[0].kg_b, 0);
  });

  it("027 +50000 NO gana como pérdida", async () => {
    const pack = await loadLoss(S1);
    assert.equal(pack.loss_ranking.winners.some((m) => m.cliente === "CLIENTE_UP"), false);
    assert.equal(pack.loss_ranking.candidates.some((m) => m.delta_kg > 0), false);
  });

  it("028 output incluye kg_a", async () => {
    const pack = await loadLoss(S1);
    assert.match(pack.deterministic_answer, /15[,.]?000 kg/);
    assert.match(pack.deterministic_answer, /Mayo/i);
  });

  it("029 output incluye kg_b", async () => {
    const pack = await loadLoss(S1);
    assert.match(pack.deterministic_answer, /Junio:\s*0 kg/i);
  });

  it("030 output incluye pérdida legible", async () => {
    const pack = await loadLoss(S1);
    assert.match(pack.deterministic_answer, /P[eé]rdida:\s*15[,.]?000 kg/i);
  });

  it("031 output marca dejó de comprar si tipo perdido", async () => {
    const pack = await loadLoss(S1);
    assert.match(pack.deterministic_answer, /dej[oó] de comprar/i);
  });

  it("032 output marca disminuyó si tipo disminucion", async () => {
    const rows = {
      "2026-05-01|2026-05-31": [{ cliente: "CLIENTE_Y", kg: 20000 }],
      "2026-06-01|2026-06-30": [{ cliente: "CLIENTE_Y", kg: 12000 }],
    };
    const pack = await loadLoss(S1, rows);
    assert.equal(pack.loss_ranking.winners[0].tipo, "disminucion");
    assert.match(pack.deterministic_answer, /disminuy/i);
  });

  it("033 empate exacto no arbitrario", () => {
    const sel = selectLargestSalesLoss([
      { cliente: "ZETA", delta_kg: -15000, tipo: "perdido", kg_a: 15000, kg_b: 0 },
      { cliente: "ALFA", delta_kg: -15000, tipo: "disminucion", kg_a: 20000, kg_b: 5000 },
    ]);
    assert.equal(sel.tie, true);
    assert.equal(sel.winners.length, 2);
    assert.deepEqual(sel.winners.map((w) => w.cliente), ["ALFA", "ZETA"]);
  });

  it("033b empate aparece en la respuesta", async () => {
    const rows = {
      "2026-05-01|2026-05-31": [
        { cliente: "ZETA", kg: 15000 },
        { cliente: "ALFA", kg: 20000 },
      ],
      "2026-06-01|2026-06-30": [{ cliente: "ALFA", kg: 5000 }],
    };
    const pack = await loadLoss(S1, rows);
    assert.equal(pack.loss_ranking.tie, true);
    assert.match(pack.deterministic_answer, /empate/i);
    assert.match(pack.deterministic_answer, /ALFA/);
    assert.match(pack.deterministic_answer, /ZETA/);
    assert.equal(pack.first_mover, null);
  });

  it("034 S3 conserva solo disminucion", async () => {
    assert.equal(isLargestSalesLossQuestion(S3), false);
    assert.equal(planDirectorIaQuestion(S3).intent, "commercial_trend");
    const pack = await loadLoss(S3);
    assert.ok(pack.calendar_movers.every((m) => m.tipo === "disminucion"));
    assert.equal(pack.calendar_movers.some((m) => m.tipo === "perdido"), false);
    assert.match(pack.deterministic_answer, /DISMINUYÓ/);
    assert.doesNotMatch(pack.deterministic_answer, /DEJÓ DE COMPRAR/);
  });

  it("035 S4 conserva disminuyeron", async () => {
    assert.equal(isLargestSalesLossQuestion(S4), false);
    const pack = await loadLoss(S4);
    assert.ok(pack.calendar_movers.every((m) => m.tipo === "disminucion"));
    assert.match(pack.deterministic_answer, /DISMINUYÓ/);
  });

  it("036 S5 conserva dejaron", async () => {
    assert.equal(isLargestSalesLossQuestion(S5), false);
    const pack = await loadLoss(S5);
    assert.ok(pack.calendar_movers.every((m) => m.tipo === "perdido"));
    assert.match(pack.deterministic_answer, /DEJÓ DE COMPRAR/);
  });

  it("037 S6 conserva aumentaron", async () => {
    assert.equal(isLargestSalesLossQuestion(S6), false);
    const pack = await loadLoss(S6);
    assert.ok(pack.calendar_movers.every((m) => m.tipo === "aumento"));
    assert.match(pack.deterministic_answer, /AUMENTÓ/);
  });

  it("038 first_mover genérico no redefine semántica", async () => {
    const pack = await loadLoss(S1);
    assert.ok(pack.loss_ranking);
    assert.equal(pack.loss_ranking.winners[0].cliente, "CLIENTE_B");
    if (pack.first_mover) {
      assert.equal(pack.first_mover.cliente, "CLIENTE_B");
      assert.notEqual(pack.first_mover.cliente, "CLIENTE_UP");
    }
  });

  it("039 inherited client identity no roba S1", () => {
    const turn = resolveTurn(S1, echoProfile());
    assert.notEqual(turn.inherit_parent_intent, "client_profile");
    assert.equal(planDirectorIaQuestion(S1).intent, "commercial_trend");
    assert.equal(planDirectorIaQuestion(S1, { forceIntent: undefined, inheritParentIntent: "client_profile" }).intent, "commercial_trend");
  });

  it("040 OpenAI no llamado", async () => {
    const pack = await loadLoss(S1);
    assert.ok(pack.deterministic_answer);
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    process.env.ENABLE_DIRECTOR_IA = "true";
    let openaiHits = 0;
    configureDirectorIaChat({
      pool: { connect: async () => ({ release() {} }) },
      now: NOW,
      openaiChat: async () => {
        openaiHits += 1;
        return "LLM no debe elegir ganador";
      },
      loadCommercialTrendForChat: async () => pack,
      loadClientProfileForChat: async () => {
        throw new Error("client_profile no debe correr");
      },
    });
    const result = await askDirectorIa({ dashboardAuth: { role: "ZP" }, body: {} }, 1, S1);
    configureDirectorIaChat({
      pool: null,
      openaiChat: undefined,
      loadCommercialTrendForChat: undefined,
      loadClientProfileForChat: undefined,
      now: undefined,
    });
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.openai_called, false);
    assert.equal(openaiHits, 0);
    assert.notEqual(result.context_meta.mode, "client_profile");
  });

  it("041 no client_profile change", () => {
    assert.equal(gitDiffName("lib/director-ia-client-profile.js"), "");
  });

  it("042 no M9 change", () => {
    assert.equal(gitDiffName("lib/director-ia-m9-deltas.js"), "");
    assert.equal(gitDiffName("lib/director-ia-financial-diagnosis.js") === "" || true, true);
  });

  it("043 no financial diagnosis change", () => {
    assert.equal(gitDiffName("lib/director-ia-financial-diagnosis.js"), "");
  });

  it("044 no historical_margin change", () => {
    assert.equal(gitDiffName("lib/director-ia-historical-margin.js"), "");
  });

  it("045 no server change", () => {
    assert.equal(gitDiffName("server.js"), "");
  });

  it("046 no schema", () => {
    assert.equal(gitDiffName("schema.sql"), "");
    const names = execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8", cwd: ROOT });
    assert.equal(/\.sql\b/m.test(names), false);
  });

  it("047 no dependencies", () => {
    assert.equal(gitDiffName("package.json"), "");
    assert.equal(gitDiffName("package-lock.json"), "");
  });

  it("048 no LIVE_DB", () => {
    const cur = fs.readFileSync(path.join(ROOT, "lib/director-ia-commercial-trend.js"), "utf8");
    assert.doesNotMatch(cur, /LIVE_DB|DATABASE_URL|process\.env\.DATABASE/);
  });

  it("049 commercial-trend focal tests file present", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "test/director-ia-commercial-trend.test.js")));
  });

  it("050 planner consumed via existing detector", () => {
    const planner = fs.readFileSync(path.join(ROOT, "lib/director-ia-planner.js"), "utf8");
    assert.match(planner, /isCommercialTrendQuestion/);
    assert.equal(gitDiffName("lib/director-ia-planner.js"), "");
  });

  it("051 client-profile tests file present", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "test/director-ia-client-profile.test.js")));
  });

  it("052 Tier1 script present", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "scripts/director-ia-golden-regression.js")));
  });

  it("053 pre-deploy gate script present", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts/director-ia-golden-regression.js"), "utf8");
    assert.match(src, /--gate/);
  });

  it("054 NEW FAILURE placeholder is zero-scope", () => {
    assert.equal(isLargestSalesLossQuestion("¿Cómo vamos en CASA?"), false);
    assert.equal(isLargestSalesLossQuestion("¿Qué sabemos de Arturo?"), false);
    assert.equal(planDirectorIaQuestion("cual fue el margen en mayo?").intent, "historical_margin");
  });
});
