"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fx = require("./fixtures/delta-ingreso-clientes-por-mes-parity");
const { computeClientesDescuentoMes } = require("../lib/dashboard-arr-forecast");
const { computeDeltaIngresoClientesPorMes } = require("../lib/delta-ingreso-clientes-por-mes");
const { ingresoClienteMarginal } = require("../lib/ingreso-cliente-marginal");

function fakeClientForCdm() {
  return {
    async query(sql, params) {
      const text = String(sql || "");
      const start = params && params[0];
      if (text.includes("cliente_categoria_mes")) {
        return {
          rows: fx.CLIENTS.map((c) => ({
            planta: fx.PLANTA,
            cliente: c.cliente,
            categoria: "Casa",
            subcategoria: "",
          })),
        };
      }
      if (text.includes("forecast_mensual")) {
        return { rows: [{ plant_code: fx.PLANTA, kg_forecast: fx.TARGET_KG_B }] };
      }
      const isSept = start === "2026-09-01";
      const isAug = start === "2026-08-01";
      if (text.includes("ventas_diarias_cliente") || text.includes("FROM ventas")) {
        const rows = fx.CLIENTS.map((c) => ({
          planta: fx.PLANTA,
          cliente: c.cliente,
          kg: isSept ? c.mtdB : isAug ? c.kgA : 0,
          monto: 0,
        }));
        return { rows };
      }
      if (text.includes("descuentos_diarios_cliente") || text.includes("FROM descs") || text.includes("FULL OUTER")) {
        const rows = fx.CLIENTS.map((c) => ({
          planta: fx.PLANTA,
          cliente: c.cliente,
          kg: isSept ? c.mtdB : isAug ? c.kgA : 0,
          monto: (isSept ? c.mtdB : isAug ? c.kgA : 0) * fx.DESC_KG_PERSISTIDO,
        }));
        return { rows };
      }
      return { rows: [] };
    },
  };
}

describe("R-DELTA-PARITY fixture / Clientes por mes source-of-truth", () => {
  it("reproduces FIRST_BAD_BOUNDARY = FORECAST_PROJECTION on SCALE_UP", () => {
    assert.equal(fx.SCALE_UP.kgB, 100000);
    assert.equal(fx.SCALE_UP.olsKgB, 60000);
    assert.ok(fx.SCALE_UP.delta > 0);
    assert.ok(fx.SCALE_UP.deltaOls < 0);
    assert.notEqual(Math.sign(fx.SCALE_UP.delta), Math.sign(fx.SCALE_UP.deltaOls));
  });

  it("HG changes ingreso materially", () => {
    assert.ok(fx.SCALE_UP.hgChangesIngresoA);
    assert.equal(fx.SCALE_UP.ingresoA - fx.SCALE_UP.ingresoANoHg, 12800);
  });

  it("shared ingresoClienteMarginal matches Clientes por mes oracle", () => {
    assert.equal(ingresoClienteMarginal(fx.SCALE_UP.kgA, fx.DESC_KG_PERSISTIDO, fx.METRICS_A), fx.SCALE_UP.ingresoA);
    assert.equal(ingresoClienteMarginal(fx.SCALE_UP.kgB, fx.DESC_KG_PERSISTIDO, fx.METRICS_B), fx.SCALE_UP.ingresoB);
  });

  it("computeDeltaIngresoClientesPorMes uses CDM + HG and keeps SCALE_UP positive", async () => {
    const out = await computeDeltaIngresoClientesPorMes(null, fx.PLANTA, fx.YEAR_A, fx.MONTH_A, fx.YEAR_B, fx.MONTH_B, {
      now: new Date("2026-09-01T12:00:00-06:00"),
      loadIgfPlantMetrics: async (_c, _p, year, month) =>
        year === fx.YEAR_B && month === fx.MONTH_B
          ? { ...fx.METRICS_B, targetKg: fx.TARGET_KG_B, financial_state: "FORECAST", version_number: 8 }
          : { ...fx.METRICS_A, financial_state: "FINAL", version_number: 2 },
      computeClientesDescuentoMes: async (_c, year, month) => ({
        rows: fx.clientesDescuentoMesRows(month === fx.MONTH_B ? "B" : "A"),
      }),
    });
    const byName = new Map((out.rows || []).map((r) => [r.cliente, r]));
    const scale = byName.get("SCALE_UP");
    assert.equal(out.source_helper, "computeDeltaIngresoClientesPorMes");
    assert.equal(scale.kgB, fx.SCALE_UP.kgB);
    assert.equal(scale.deltaIngreso, fx.SCALE_UP.delta);
    assert.ok(scale.deltaIngreso > 0);
    const deep = byName.get("NEG_DEEP");
    assert.equal(deep.deltaIngreso, fx.BY_NAME.NEG_DEEP.delta);
  });

  it("computeClientesDescuentoMes projects kg B with plant target factor", async () => {
    const out = await computeClientesDescuentoMes(fakeClientForCdm(), fx.YEAR_B, fx.MONTH_B, fx.PLANTA, {
      historico: false,
      targetKgOverride: fx.TARGET_KG_B,
      forecastKgByPlant: { [fx.PLANTA]: fx.TARGET_KG_B },
    });
    const byName = new Map((out.rows || []).map((r) => [r.cliente, r]));
    for (const c of fx.CLIENTS) {
      const row = byName.get(c.cliente);
      assert.ok(row, c.cliente);
      assert.equal(row.kg, c.mtdB);
      assert.equal(row.kgProy, c.kgB);
    }
  });
});
