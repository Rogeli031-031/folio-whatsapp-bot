"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const PUEBLA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-puebla.js"), "utf8");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const { totalMesMarginAndHg } = require("../lib/igf-diario-puebla");
const forecast = require("../lib/dashboard-arr-forecast");

test("Y negativo produce HG negativo y no se vuelve a invertir", () => {
  const fn = PUEBLA.slice(PUEBLA.indexOf("function totalMesMarginAndHg"), PUEBLA.indexOf("module.exports"));
  assert.match(fn, /return \{ margen, y, hg: y \}/);
  assert.doesNotMatch(fn, /Math\.abs/);
  assert.doesNotMatch(fn, /-y/);
  const out = totalMesMarginAndHg([
    { ventaKg: 4000, margen: 6.1, hgKg: -1.4 },
    { ventaKg: 6000, margen: 6.4, hgKg: -0.9 },
  ]);
  assert.ok(out.y < 0);
  assert.equal(out.hg, out.y);
  const mini = {
    rows: [{
      empresa: "Querétaro",
      plant_code: "Queretaro",
      ventaTon: 20,
      margen: 1.1,
      comDesc: 0.15,
      impuestos: 0.05,
      hgKg: 0.33,
      ingreso: 18400,
      operativos: 4000,
      corporativos: 1500,
      gasto: 5500,
      utilOperImporte: 14400,
      resultadoFinalImporte: 12900,
    }],
    zona: { empresa: "Zona Provincia", margen: 1.1, hgKg: 0.33 },
  };
  const next = forecast.applyIgfDiarioAcumuladoMini(mini, {
    Queretaro: { margen: out.margen, hg: out.hg },
  });
  assert.equal(next.rows[0].hgKg, out.hg);
  assert.ok(next.rows[0].hgKg < 0);
  assert.equal(next.rows[0].ingreso, Math.round((out.margen + 0.15 - out.hg) * 20 * 1000));
  assert.match(CLIENT, /const hgKg = hit\.hg;/);
  assert.match(CLIENT, /\(margen \+ com - hgKg\) \* venta \* 1000/);
});

test("Forecast original queda idéntico si no se aplica el acumulado", () => {
  const row = {
    empresa: "GT Puebla",
    plant_code: "Puebla",
    ventaTon: 1198.48,
    margen: 4.5,
    comDesc: 0.2,
    impuestos: 0.1,
    hgKg: 0.4,
    ingreso: 5153464,
    operativos: 5000000,
    corporativos: 2599800,
    gasto: 7599800,
    utilOperImporte: 153464,
    resultadoFinalImporte: -2446336,
  };
  const mini = { rows: [{ ...row }], zona: { empresa: "Zona Provincia", margen: row.margen, hgKg: row.hgKg } };
  const next = forecast.applyIgfDiarioAcumuladoMini(mini, {});
  assert.deepEqual(next.rows[0], row);
  assert.equal(mini.rows[0].hgKg, 0.4);
  assert.equal(mini.rows[0].resultadoFinalImporte, row.resultadoFinalImporte);
});

test("un caso tipo Puebla con Y negativo deja el resultado final entre 1.28 y 1.29 millones", () => {
  const ventaTon = 1198.48;
  const margen = 6.29;
  const comDesc = 0;
  const operativos = 5000000;
  const corporativos = 2599800;
  const out = totalMesMarginAndHg([
    { ventaKg: ventaTon * 1000, margen, hgKg: -1.1257 },
  ]);
  assert.ok(out.y < 0);
  assert.equal(out.hg, out.y);
  const mini = {
    rows: [{
      empresa: "GT Puebla",
      plant_code: "Puebla",
      ventaTon,
      margen: 4.5,
      comDesc,
      impuestos: 0.1,
      hgKg: 1.1257,
      ingreso: 1,
      operativos,
      corporativos,
      gasto: operativos + corporativos,
      utilOperImporte: 1,
      resultadoFinalImporte: 1,
    }],
    zona: { empresa: "Zona Provincia" },
  };
  const next = forecast.applyIgfDiarioAcumuladoMini(mini, {
    Puebla: { margen: out.margen, hg: out.hg },
  });
  assert.equal(next.rows[0].hgKg, out.hg);
  assert.equal(next.rows[0].operativos, operativos);
  assert.equal(next.rows[0].corporativos, corporativos);
  assert.equal(
    next.rows[0].resultadoFinalImporte,
    Math.round((out.margen + comDesc - out.hg) * ventaTon * 1000) - operativos - corporativos
  );
  assert.ok(next.rows[0].resultadoFinalImporte > 1280000);
  assert.ok(next.rows[0].resultadoFinalImporte < 1290000);
});
