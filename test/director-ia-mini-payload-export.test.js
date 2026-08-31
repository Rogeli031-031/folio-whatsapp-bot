"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  readIgfForecastMiniAuthoritative,
  aggregateCasaComiFromClientesMes,
  dashboardDescSigned,
} = require("../lib/director-ia-dashboard-forecast-adapter");
const { buildExecutiveStatusPack } = require("../lib/director-ia-conversational-executive-layer");
const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");

const ROOT = path.join(__dirname, "..");
const SERVER_SRC = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");
const ADAPTER_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-dashboard-forecast-adapter.js"), "utf8");

const AUTH = {
  venta_ton: 1488,
  desc_kg: -0.11,
  util_oper_importe: 3169502,
  resultado_final_importe: 803537,
  casa_ton: 839.36,
  comisionista_ton: 648.64,
};

describe("SPRINT1 mini payload export — frontera mínima", () => {
  it("computeIgfForecastMiniPayload sigue definido una sola vez en server.js", () => {
    const matches = SERVER_SRC.match(/async function computeIgfForecastMiniPayload/g) || [];
    assert.equal(matches.length, 1);
    assert.match(SERVER_SRC, /const utilOperImporte = ingreso - operativos;/);
    assert.match(SERVER_SRC, /const resultadoFinalImporte = utilOperImporte - corporativos;/);
  });

  it("endpoint mini sigue llamando la misma función; no hay ruta HTTP nueva", () => {
    const miniEp = SERVER_SRC.slice(
      SERVER_SRC.indexOf('app.get("/api/dashboard/igf-forecast-mini"'),
      SERVER_SRC.indexOf("app.get(\"/api/dashboard/igf-forecast-mini\"") + 2500
    );
    assert.match(miniEp, /const mini = await computeIgfForecastMiniPayload\(client, igf, year, month, uploadDay\)/);
    assert.equal((SERVER_SRC.match(/app\.get\("\/api\/dashboard\/igf-forecast-mini"/g) || []).length, 1);
    assert.doesNotMatch(SERVER_SRC, /app\.get\("\/api\/director-ia\/igf-forecast-mini"/);
  });

  it("Director IA inyecta la misma función, no una copia", () => {
    assert.match(SERVER_SRC, /loadIgfForecastMiniPayload:/);
    assert.match(SERVER_SRC, /return computeIgfForecastMiniPayload\(client, igf, year, month, uploadDay\)/);
    assert.match(CHAT_SRC, /chatDeps\.loadIgfForecastMiniPayload/);
    assert.doesNotMatch(ADAPTER_SRC, /const utilOperImporte = ingreso - operativos/);
    assert.doesNotMatch(CHAT_SRC, /async function computeIgfForecastMiniPayload/);
  });

  it("las 6 cifras autoritativas salen del mini + CASA/COMI ARR", () => {
    const mini = readIgfForecastMiniAuthoritative(
      {
        rows: [
          {
            empresa: "Acapulco",
            ventaTon: 1488,
            comDesc: 0.11,
            utilOperImporte: 3169502,
            resultadoFinalImporte: 803537,
          },
        ],
      },
      "Acapulco"
    );
    const channels = aggregateCasaComiFromClientesMes({
      historico: false,
      rows: [
        { categoria: "Casa", kg: 1, kgProy: 839360 },
        { categoria: "Comisionista", kg: 1, kgProy: 648640 },
      ],
    });
    const got = {
      venta_ton: mini.venta_ton,
      desc_kg: mini.desc_kg,
      util_oper_importe: mini.util_oper_importe,
      resultado_final_importe: mini.resultado_final_importe,
      casa_ton: channels.casa_ton,
      comisionista_ton: channels.comisionista_ton,
    };
    assert.deepEqual(got, AUTH);
    assert.equal(dashboardDescSigned(0.11), -0.11);
    assert.equal(got.casa_ton + got.comisionista_ton, got.venta_ton);
  });

  it("pack CEL consume mini inyectado, no stored ni recálculo", () => {
    const assembled = assemblePlantDiagnosisEvidence({
      plant: { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" },
      year: 2026,
      month: 8,
      actionRegisterRaw: { period: { kind: "snapshot", as_of: "2026-08-23" }, payload: { summary: { overdue: 0 } } },
      dicfRaw: { period: { kind: "action_dates" }, payload: { actions: [] } },
      bitacoraRaw: { period: { kind: "bitacora_window", months: 3, from: "2026-06" }, payload: { sessions: [] } },
      arrRaw: { venta_ton: 1260, desc_kg: 0.12, load_error: null },
      igfRaw: {
        version_id: 12,
        row: { empresa: "E3", venta_ton: 1536.54 },
        composition: { ok: true, lines: [{ line_key: "venta_ton", value: 1536.54, unit: "ton" }] },
      },
      commercialStateRaw: {
        period: { kind: "materialized_cache", yyyy_mm: "2026-07" },
        payload: { materialized: true, counts: {}, clients_shown: [] },
      },
    });
    const pack = buildExecutiveStatusPack({
      assembled,
      trend: { ok: false },
      scope: { scope_source: "explicit_plant", planta_id: 1, plant_name: "Acapulco" },
      forecastParity: {
        reachable: true,
        period: { year: 2026, month: 8, yyyy_mm: "2026-08" },
        forecast: { venta_ton: AUTH.venta_ton, desc_kg: AUTH.desc_kg },
        actual_to_date: { venta_ton: 1258.81 },
        mini: {
          venta_ton: AUTH.venta_ton,
          desc_kg: AUTH.desc_kg,
          util_oper_importe: AUTH.util_oper_importe,
          resultado_final_importe: AUTH.resultado_final_importe,
          source: "computeIgfForecastMiniPayload",
        },
      },
    });
    const forecast = pack.items.find((i) => i.source === "arr.proyeccion_planta");
    const actual = pack.items.find((i) => i.truth_semantics === "ACTUAL_TO_DATE");
    const util = pack.items.find((i) => i.payload && i.payload.metric === "util_oper_importe");
    const resultado = pack.items.find((i) => i.payload && i.payload.metric === "resultado_final_importe");
    assert.equal(forecast.payload.venta_ton, 1488);
    assert.equal(forecast.payload.desc_kg, -0.11);
    assert.equal(actual.payload.venta_ton, 1258.81);
    assert.notEqual(forecast.payload.venta_ton, 1260);
    assert.notEqual(forecast.payload.venta_ton, 1536.54);
    assert.equal(util.payload.util_oper_importe, 3169502);
    assert.equal(resultado.payload.resultado_final_importe, 803537);
    assert.equal(util.source, "igf-forecast-mini.utilOperImporte");
  });
});
