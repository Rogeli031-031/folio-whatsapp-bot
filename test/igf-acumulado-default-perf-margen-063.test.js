"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const PUEBLA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-puebla.js"), "utf8");
const GRAFICA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const GASTOS = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-gastos-manuales.js"), "utf8");
const { finiteMetric, totalMesMarginAndHg } = require("../lib/igf-diario-puebla");
const grafica = require("../lib/igf-diario-grafica");
const gastos = require("../lib/igf-diario-gastos-manuales");

const effect = CLIENT.slice(
  CLIENT.indexOf('if (igfTableMode !== "igf_diario"'),
  CLIENT.indexOf("}, [igfTableMode, token, igfForecast, igfMini, uploadDay, versionAsOfCorte]")
);
const loader = GRAFICA.slice(
  GRAFICA.indexOf("async function loadIgfDiarioAcumulado"),
  GRAFICA.indexOf("\nmodule.exports")
);
const routeStart = SERVER.indexOf('app.get("/api/dashboard/igf-diario-acumulado"');
const route = SERVER.slice(routeStart, SERVER.indexOf('app.get("/api/dashboard/igf-diario-grafica"'));

function dilutedByNullAsZero(days) {
  let num = 0;
  let den = 0;
  for (const day of days) {
    const venta = Number(day.ventaKg);
    const margen = Number(day.margen);
    if (!Number.isFinite(venta) || !Number.isFinite(margen)) continue;
    num += margen * venta;
    den += venta;
  }
  return den !== 0 ? num / den : null;
}

test("finiteMetric distingue vacío de cero", () => {
  assert.equal(finiteMetric(null), null);
  assert.equal(finiteMetric(undefined), null);
  assert.equal(finiteMetric(""), null);
  assert.equal(finiteMetric("   "), null);
  assert.equal(finiteMetric(0), 0);
  assert.equal(finiteMetric("0"), 0);
  assert.equal(finiteMetric(8.2), 8.2);
  assert.equal(finiteMetric("8.2"), 8.2);
  assert.equal(finiteMetric(Number.NaN), null);
  assert.equal(finiteMetric(Number.POSITIVE_INFINITY), null);
  assert.equal(finiteMetric("no-num"), null);
});

test("totalMesMarginAndHg ignora métricas vacías y conserva el cero numérico", () => {
  const skipped = totalMesMarginAndHg([
    { ventaKg: 100, margen: 8, hgKg: -2 },
    { ventaKg: 900, margen: null, hgKg: null },
  ]);
  assert.equal(skipped.margen, 8);
  assert.equal(skipped.hg, -2);
  assert.equal(skipped.y, skipped.hg);
  const withZero = totalMesMarginAndHg([
    { ventaKg: 100, margen: 0, hgKg: 0 },
    { ventaKg: 100, margen: 10, hgKg: -4 },
  ]);
  assert.equal(withZero.margen, 5);
  assert.equal(withZero.hg, -2);
});

test("fixture tipo San Luis no diluye días con margen vacío", () => {
  const days = [
    { ventaKg: 1000, margen: 8.2, hgKg: -1 },
    { ventaKg: 1000, margen: 8.2, hgKg: -1 },
    { ventaKg: 1000, margen: 8.2, hgKg: -1 },
  ];
  for (let i = 0; i < 24; i += 1) days.push({ ventaKg: 1000, margen: null, hgKg: null });
  const out = totalMesMarginAndHg(days);
  const old = dilutedByNullAsZero(days);
  assert.ok(Math.abs(out.margen - 8.2) < 1e-9);
  assert.ok(old < 1);
  assert.ok(Math.abs(old - 0.911111) < 0.02);
  assert.equal(out.hg, -1);
  assert.doesNotMatch(PUEBLA.slice(PUEBLA.indexOf("function totalMesMarginAndHg"), PUEBLA.indexOf("module.exports")), /hg: -y|Math\.abs|San Luis|Morelos/);
});

test("la tabla abre en IGF Diario y pide el acumulado una sola vez", () => {
  assert.match(CLIENT, /useState<"forecast" \| "igf_diario">\("igf_diario"\)/);
  assert.match(CLIENT, /setIgfTableMode\("forecast"\)/);
  assert.match(effect, /fetchIgfDiarioAcumulado\(/);
  assert.equal(effect.split("fetchIgfDiarioAcumulado(").length - 1, 1);
  assert.doesNotMatch(effect, /fetchIgfDiarioGrafica/);
  assert.doesNotMatch(effect, /Promise\.all/);
  assert.match(effect, /igfForecast\.year/);
  assert.match(effect, /igfForecast\.month/);
  assert.match(effect, /uploadDay/);
  assert.match(effect, /versionAsOfCorte/);
  assert.match(effect, /cacheKey/);
  assert.match(CLIENT, /: igfMini;/);
  assert.match(CLIENT, /applyManualGastosToAcumulado\(applyIgfDiarioAcumuladoMini/);
});

test("el endpoint ligero es de solo lectura y no arma la gráfica", async () => {
  assert.match(route, /dashboardAuthMiddleware/);
  assert.match(route, /dashboardBlockGAFinancialKpis/);
  assert.match(route, /dashboardBlockGVForbidden/);
  assert.match(route, /overrideVisible/);
  assert.doesNotMatch(route, /INSERT |UPDATE |DELETE /);
  assert.doesNotMatch(loader, /newClientsPanel|buildMonthClose|loadCdMonthIndex|gastosForMonth|descuentos_diarios|INSERT |UPDATE |DELETE /);
  assert.match(loader, /loadSalesRows/);
  assert.match(loader, /loadComprasDayMap/);
  assert.match(loader, /corporativos: null/);
  assert.match(loader, /operativos: null/);
  assert.match(PUEBLA, /AND\(ISNUMBER\(\$\{col\}\$\{row\}\),ISNUMBER\(B\$\{row\}\)\)/);
  const sqls = [];
  const payload = await grafica.loadIgfDiarioAcumulado({
    async query(sql) {
      sqls.push(String(sql));
      return { rows: [] };
    },
  }, {
    year: 2026,
    month: 10,
    uploadDay: "2026-10-03",
    versionAsOfCorte: true,
    plants: [{ nombre: "San Luis", canon: "San Luis", provinciaPlantCode: "San Luis", plantaId: null }],
    loadPrecio: async () => [],
  });
  assert.equal(payload.rows.length, 1);
  assert.equal(payload.rows[0].plant_code, "San Luis");
  assert.equal(payload.query_count, 2);
  assert.ok(sqls.some((sql) => sql.includes("ventas_diarias_cliente")));
  assert.ok(sqls.every((sql) => !sql.includes("descuentos_diarios_cliente")));
  assert.equal(payload.new_clients_chart, undefined);
  assert.equal(payload.month_close, undefined);
  assert.equal(payload.points, undefined);
  assert.equal(payload.weeks, undefined);
  assert.equal(gastos.overrideVisible({ role: "GG", plantas_permitidas: [4] }, 4), true);
  assert.equal(gastos.overrideVisible({ role: "GG", plantas_permitidas: [4] }, 9), false);
  assert.match(GASTOS, /manual != null/);
  assert.doesNotMatch(GASTOS, /operativos \|\|/);
  const pair = gastos.effectivePair(
    { operativos: 10, corporativos: 20 },
    [{ plant_code: "Puebla", operativos: 0, corporativos: null }],
    ["Puebla"]
  );
  assert.equal(pair.operativos, 0);
  assert.equal(pair.corporativos, 20);
});
