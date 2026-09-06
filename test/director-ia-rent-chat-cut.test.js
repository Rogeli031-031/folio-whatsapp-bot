"use strict";

/**
 * R-RENT-CHAT-CUT: frontera askDirectorIa → assembleRentabilidadDeterioroSnapshot.
 * Cruza askDirectorIa. No invoca el snapshot a mano con deps.upload_day.
 * Fixture de fechas: test/fixtures/director-ia-rent-cut.js (no cifras LIVE).
 */

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const fx = require("./fixtures/director-ia-rent-cut");

const Q = "¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?";
const OTHER_MONTH_CUT = `${fx.YEAR_A}-${String(fx.MONTH_A).padStart(2, "0")}-15`;
const CHAT_SRC = fs.readFileSync(path.join(__dirname, "..", "lib", "director-ia-chat.js"), "utf8");

function snapshotAssembleBlock() {
  const start = CHAT_SRC.indexOf("assembleRentabilidadDeterioroSnapshot({");
  if (start < 0) return "";
  return CHAT_SRC.slice(start, start + 700);
}

function deltaRows() {
  return {
    planta: fx.PLANT,
    periodoA: `${fx.YEAR_A}-${String(fx.MONTH_A).padStart(2, "0")}`,
    periodoB: `${fx.YEAR_B}-${String(fx.MONTH_B).padStart(2, "0")}`,
    margenA: 8,
    margenB: 7.5,
    rows: [{ cliente: "CLIENTE_N1", deltaIngreso: -250000, kgA: 10000, kgB: 4000 }],
    source_helper: "computeDeltaIngresoClientesPorMes",
    physical_source: "dashboard-arr-forecast.computeClientesDescuentoMes",
  };
}

function emptyLogPool() {
  const query = async () => ({ rows: [] });
  return {
    query,
    connect: async () => ({
      query,
      release() {},
    }),
  };
}

describe("R-RENT-CHAT-CUT askDirectorIa → snapshot deps.upload_day", () => {
  let askDirectorIa;
  let configureDirectorIaChat;
  let miniCalls;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({
      pool: null,
      now: undefined,
      openaiChat: undefined,
      loadIgfForecastMiniPayload: undefined,
      loadRentabilidadKpis: undefined,
      resolveDeltaIngresoForecastPlanta: undefined,
      computeDeltaIngresoClientesPorMes: undefined,
      loadRecentCommentsByClienteNombres: undefined,
      plantCatalog: undefined,
    });
  });

  function wire() {
    miniCalls = [];
    configureDirectorIaChat({
      now: fx.NOW,
      pool: emptyLogPool(),
      plantCatalog: [{ planta_id: 7, nombre: fx.PLANT, clave: "E3" }],
      loadRentabilidadKpis: undefined,
      resolveDeltaIngresoForecastPlanta: async () => ({
        id: 7,
        nombre: fx.PLANT,
        clave: "E3",
      }),
      computeDeltaIngresoClientesPorMes: async () => deltaRows(),
      loadRecentCommentsByClienteNombres: async () => new Map(),
      loadIgfForecastMiniPayload: async (_client, opts) => {
        const call = {
          year: opts && opts.year,
          month: opts && opts.month,
          upload_day: (opts && opts.upload_day) || null,
        };
        miniCalls.push(call);
        return fx.computeRentCutMiniPayload({
          year: call.year,
          month: call.month,
          upload_day: call.upload_day,
          now: fx.NOW,
        });
      },
    });
  }

  function reqOf(body) {
    return { body: body || {}, dashboardAuth: { role: "ZP" } };
  }

  function callB() {
    return miniCalls.find((c) => Number(c.year) === fx.YEAR_B && Number(c.month) === fx.MONTH_B);
  }

  function callA() {
    return miniCalls.find((c) => Number(c.year) === fx.YEAR_A && Number(c.month) === fx.MONTH_A);
  }

  it("R-RENT-CHAT-CUT-001: request upload_day llega al snapshot", async () => {
    wire();
    const result = await askDirectorIa(
      reqOf({
        planta_id: 7,
        planta_nombre: fx.PLANT,
        upload_day: fx.UPLOAD_DAY_B,
      }),
      7,
      Q
    );
    assert.equal(result.ok, true, result.error || "askDirectorIa no ok");
    assert.equal(result.context_meta && result.context_meta.mode, "profitability_deterioro_snapshot");
    const b = callB();
    assert.ok(b, "mini B no fue llamado vía askDirectorIa → snapshot");
    assert.equal(
      b.upload_day,
      fx.UPLOAD_DAY_B,
      `explicit cut no llegó al snapshot/mini; got=${b.upload_day}`
    );
    const block = snapshotAssembleBlock();
    assert.match(block, /req\.body\.upload_day/);
    assert.doesNotMatch(block, /cutoff_date/);
  });

  it("R-RENT-CHAT-CUT-002: B abierto entrega el mismo YMD al mini", async () => {
    wire();
    await askDirectorIa(reqOf({ upload_day: fx.UPLOAD_DAY_B }), 7, Q);
    const b = callB();
    assert.ok(b, "mini B ausente");
    assert.equal(b.upload_day, fx.UPLOAD_DAY_B);
    assert.equal(Number(b.year), fx.YEAR_B);
    assert.equal(Number(b.month), fx.MONTH_B);
  });

  it("R-RENT-CHAT-CUT-003: con explicit cut B usa forecast y no MTD", async () => {
    wire();
    const result = await askDirectorIa(reqOf({ upload_day: fx.UPLOAD_DAY_B }), 7, Q);
    const pack = result.profitability_deterioro_snapshot;
    assert.ok(pack, "pack de snapshot ausente");
    assert.equal(pack.rentabilidad_operativa.b, fx.EXPECTED_B_DASHBOARD.utilOperImporte);
    assert.equal(pack.rentabilidad_final.b, fx.EXPECTED_B_DASHBOARD.resultadoFinalImporte);
    assert.notEqual(pack.rentabilidad_final.b, fx.EXPECTED_B_MTD.resultadoFinalImporte);
    assert.notEqual(pack.rentabilidad_operativa.b, fx.EXPECTED_B_MTD.utilOperImporte);
  });

  it("R-RENT-CHAT-CUT-004: sin upload_day conserva fallback (log vacío → null → MTD)", async () => {
    wire();
    const result = await askDirectorIa(reqOf({}), 7, Q);
    const b = callB();
    assert.ok(b, "mini B ausente");
    assert.equal(b.upload_day, null);
    const pack = result.profitability_deterioro_snapshot;
    assert.equal(pack.rentabilidad_final.b, fx.EXPECTED_B_MTD.resultadoFinalImporte);
    assert.equal(pack.rentabilidad_operativa.b, fx.EXPECTED_B_MTD.utilOperImporte);
  });

  it("R-RENT-CHAT-CUT-005: invalid/mismatched upload_day usa semántica canónica", async () => {
    wire();
    const invalid = await askDirectorIa(reqOf({ upload_day: "no-es-ymd" }), 7, Q);
    const bInvalid = callB();
    assert.ok(bInvalid, "mini B ausente (inválido)");
    assert.equal(bInvalid.upload_day, null);
    assert.equal(
      invalid.profitability_deterioro_snapshot.rentabilidad_final.b,
      fx.EXPECTED_B_MTD.resultadoFinalImporte
    );

    wire();
    const mismatched = await askDirectorIa(reqOf({ upload_day: OTHER_MONTH_CUT }), 7, Q);
    const bMis = callB();
    assert.ok(bMis, "mini B ausente (otro mes)");
    assert.notEqual(bMis.upload_day, OTHER_MONTH_CUT);
    assert.equal(bMis.upload_day, null);
    assert.equal(
      mismatched.profitability_deterioro_snapshot.rentabilidad_final.b,
      fx.EXPECTED_B_MTD.resultadoFinalImporte
    );
  });

  it("R-RENT-CHAT-CUT-006: A cerrado permanece real", async () => {
    wire();
    const result = await askDirectorIa(reqOf({ upload_day: fx.UPLOAD_DAY_B }), 7, Q);
    const a = callA();
    assert.ok(a, "mini A ausente");
    assert.equal(a.upload_day, null);
    const pack = result.profitability_deterioro_snapshot;
    assert.equal(pack.rentabilidad_final.a, fx.EXPECTED_A.resultadoFinalImporte);
    assert.equal(pack.rentabilidad_operativa.a, fx.EXPECTED_A.utilOperImporte);
  });
});
