"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const chart = require("../frontend-dashboard/lib/igf-diario-weekly-executive-chart");
const { CONCEPTS } = require("../lib/igf-diario-gastos-distribucion");

const ROOT = path.join(__dirname, "..");
const MODAL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyExecutiveModal.tsx"), "utf8");
const RENDER = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "igf-diario-weekly-executive-chart.js"), "utf8");

function metrics(extra) {
  return {
    venta_kg: 100,
    precio_kg: 10,
    margen_kg: 4,
    costo_kg: 5,
    flete_kg: 1,
    hg_mxn: 20,
    com_desc_kg: -3,
    resultado_mxn: 100,
    gasto_corporativo_kg: 1,
    inversiones_kg: 1,
    impuestos_federales_kg: 1,
    presupuesto_nomina_gastos_kg: 1,
    presupuesto_imss_sua_kg: 1,
    extraordinarios_kg: 1,
    provisiones_planta_kg: 1,
    ...extra,
  };
}

function daysOf(start, rate) {
  const days = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < 7; i += 1) {
    days.push({
      fecha: cursor.toISOString().slice(0, 10),
      metrics: metrics({ precio_kg: rate(i) }),
      venta_casa_kg: 10,
      venta_comisionista_kg: 4,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function week(id, number, desde, hasta, rate) {
  return {
    id,
    week_number: number,
    fecha_desde: desde,
    fecha_hasta: hasta,
    metrics: metrics({ precio_kg: rate(0), com_desc_kg: -3 }),
    days: daysOf(desde, rate),
  };
}

function viewOf(scope, plant, selected) {
  const weeks = [
    week("a", 42, "2026-10-11", "2026-10-17", (i) => 10 + i),
    week("b", 43, "2026-10-18", "2026-10-24", (i) => 20 + i),
    week("c", 44, "2026-10-25", "2026-10-31", (i) => 30 + i),
    week("d", 45, "2026-11-01", "2026-11-07", (i) => 40 + i),
  ];
  return chart.buildExecutiveView({
    scope,
    plant,
    weeks,
    selectedIds: selected,
  });
}

function blocks(svg, attr) {
  return svg.split(`<g ${attr}`).slice(1);
}

test("cada semana tiene su mini-gráfica y el eje es domingo-sábado", () => {
  const svg = chart.renderExecutiveSvg(viewOf("plant", "San Luis", ["a", "b", "c"]));
  const charts = blocks(svg, 'data-week-chart="');
  assert.equal(charts.length, 12 * 3);
  const precio = charts.filter((block) => block.startsWith("42") || block.startsWith("43") || block.startsWith("44"));
  assert.ok(precio.length >= 3);
  const one = charts.find((block) => block.startsWith("42"));
  assert.match(one, /data-day="Dom"/);
  assert.ok(one.indexOf('data-day="Dom"') < one.indexOf('data-day="Lun"'));
  assert.ok(one.indexOf('data-day="Lun"') < one.indexOf('data-day="Sáb"'));
  assert.equal((one.match(/data-day="/g) || []).length, 7);
  assert.doesNotMatch(one, /data-week-chart="43"/);
  assert.match(svg, /Semana 42/);
  assert.match(svg, /11\/10\/2026–17\/10\/2026/);
  assert.match(svg, /Acumulado:/);
});

test("el delta queda entre semanas y la primera no tiene delta anterior", () => {
  const svg = chart.renderExecutiveSvg(viewOf("plant", "San Luis", ["a", "b", "c"]));
  const header = svg.slice(0, svg.indexOf('data-indicator="precio"'));
  const cols = [...header.matchAll(/data-col="(week|delta)"/g)].map((item) => item[1]);
  assert.deepEqual(cols, ["week", "delta", "week", "delta", "week"]);
  assert.equal((header.match(/Δ vs\. S42/g) || []).length, 1);
  assert.equal((header.match(/Δ vs\. S43/g) || []).length, 1);
  assert.equal((header.match(/Δ vs\. S41/g) || []).length, 0);
  const precio = svg.slice(svg.indexOf('data-indicator="precio"'), svg.indexOf('data-indicator="gasto"'));
  const weekX = [...precio.matchAll(/data-week-chart="(\d+)" data-x="([^"]+)"/g)];
  const deltaX = [...precio.matchAll(/data-delta-column="(\d+)" data-vs-week="(\d+)" data-x="([^"]+)"/g)];
  assert.equal(deltaX.length, 2);
  assert.equal(deltaX[0][2], "42");
  assert.equal(deltaX[1][2], "43");
  assert.ok(Number(weekX[0][2]) < Number(deltaX[0][3]));
  assert.ok(Number(deltaX[0][3]) < Number(weekX[1][2]));
  assert.match(precio, /data-tone="(good|bad|neutral)"/);
});

test("tres semanas ocupan el ancho y más semanas crecen para el scroll", () => {
  const three = chart.renderExecutiveSvg(viewOf("all", "Todas", ["a", "b", "c"]));
  const five = chart.renderExecutiveSvg(viewOf("all", "Todas", ["a", "b", "c", "d"]));
  const widthOf = (svg) => Number(svg.match(/width="([0-9.]+)"/)[1]);
  assert.ok(widthOf(three) >= 1680);
  assert.match(three, /data-full-width="1"/);
  assert.ok(widthOf(five) > widthOf(three));
  assert.match(five, /data-full-width="0"/);
  assert.match(MODAL, /data-grid-scroll="1"/);
  assert.match(MODAL, /w-full flex-1 overflow-auto/);
  assert.doesNotMatch(MODAL, /min-w-\[720px\]/);
});

test("el layout no cambia el contrato de GASTO, Pendiente, planta, TODAS ni el PNG", () => {
  assert.deepEqual(chart.GASTO_COMPONENTS, CONCEPTS.map((key) => `${key}_kg`));
  assert.equal(chart.EXCLUDED_FROM_GASTO.includes("costo_kg"), true);
  assert.doesNotMatch(RENDER, /GASTO \(Costo del Gas LP\)/);
  const plant = chart.renderExecutiveSvg(viewOf("plant", "San Luis", ["a", "b", "c"]));
  const todas = chart.renderExecutiveSvg(viewOf("all", "Todas", ["a", "b", "c"]));
  assert.match(plant, /IGF Diario semanal · San Luis/);
  assert.match(todas, /IGF Diario semanal · Todas/);
  assert.match(plant, /data-indicator="descuento_compra"[\s\S]*Pendiente/);
  assert.doesNotMatch(plant.slice(plant.indexOf('data-indicator="descuento_compra"'), plant.indexOf('data-indicator="venta_casa"')), /<polyline/);
  assert.match(MODAL, /image\/png/);
  assert.match(MODAL, /toBlob/);
  assert.match(chart.downloadName({ title: "IGF Diario semanal · San Luis" }), /\.png$/);
  const cd = chart.INDICATORS.find((item) => item.id === "com_desc");
  assert.equal(chart.deltaTone(cd, -4 - -3), "bad");
  assert.equal(chart.deltaTone(cd, -2.5 - -3), "good");
});
