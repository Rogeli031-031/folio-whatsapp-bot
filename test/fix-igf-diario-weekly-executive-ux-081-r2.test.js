"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const chart = require("../frontend-dashboard/lib/igf-diario-weekly-executive-chart");
const { CORP_KEYS, OPER_KEYS } = require("../lib/igf-diario-gastos-distribucion");
const weekly = require("../lib/igf-diario-weekly-plant");

const ROOT = path.join(__dirname, "..");
const MODAL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyExecutiveModal.tsx"), "utf8");
const WEEKLY_SRC = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-weekly-plant.js"), "utf8");

function money(partial) {
  const row = {};
  for (const key of [...CORP_KEYS, ...OPER_KEYS]) row[key] = 1;
  return { ...row, ...partial };
}

function day(fecha, extra) {
  return {
    fecha,
    ventaKg: 1000,
    casaKg: 10,
    comKg: 4,
    precio: 12.55,
    costoKg: 12.55,
    fleteKg: 1,
    hgImporte: -102526.45,
    cdKg: -3,
    expenses: money({}),
    ...extra,
  };
}

test("gasto corporativo y operativo son importes en pesos y el faltante no pasa a cero", () => {
  const complete = weekly.weekDayRecords([day("2026-10-12", {
    expenses: money({
      gasto_corporativo: 10,
      inversiones: 20,
      impuestos_federales: 30,
      presupuesto_nomina_gastos: 4,
      presupuesto_imss_sua: 6,
      extraordinarios: 8,
      provisiones_planta: 2,
    }),
  })], "2026-10-20")[0];
  assert.equal(complete.gasto_corporativo_mxn, 60);
  assert.equal(complete.gasto_operativo_mxn, 20);
  assert.equal(complete.metrics.gasto_corporativo_kg, 10 / 1000);
  assert.notEqual(complete.gasto_corporativo_mxn, complete.metrics.gasto_corporativo_kg);

  const missing = weekly.weekDayRecords([day("2026-10-13", {
    expenses: money({ inversiones: null }),
  })], "2026-10-20")[0];
  assert.equal(missing.gasto_corporativo_mxn, null);
  assert.notEqual(missing.gasto_corporativo_mxn, 0);
  assert.equal(missing.gasto_operativo_mxn, 4);

  const zero = weekly.weekDayRecords([day("2026-10-14", {
    expenses: money({
      gasto_corporativo: 0,
      inversiones: 0,
      impuestos_federales: 0,
    }),
  })], "2026-10-20")[0];
  assert.equal(zero.gasto_corporativo_mxn, 0);

  const absent = weekly.weekDayRecords([day("2026-10-15", { expenses: null })], "2026-10-20")[0];
  assert.equal(absent.gasto_corporativo_mxn, null);
  assert.equal(absent.gasto_operativo_mxn, null);
  assert.match(WEEKLY_SRC, /gasto_corporativo_mxn: sumSibling/);
  assert.match(WEEKLY_SRC, /gasto_operativo_mxn: sumSibling/);
});

test("el acumulado semanal suma solo los importes diarios válidos", () => {
  const days = ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"].map((fecha, index) => ({
    fecha,
    metrics: { costo_kg: 12.55, hg_mxn: -102526.45, resultado_mxn: 10 },
    gasto_corporativo_mxn: index === 1 ? null : (index === 0 ? 10 : 5),
    gasto_operativo_mxn: index === 2 ? null : 2,
    venta_casa_kg: index === 0 ? 7850 : 0,
  }));
  const view = chart.buildExecutiveView({
    scope: "plant",
    plant: "San Luis",
    weeks: [{
      id: "a",
      week_number: 42,
      fecha_desde: "2026-10-11",
      fecha_hasta: "2026-10-17",
      metrics: { costo_kg: 12.55, hg_mxn: -102526.45, resultado_mxn: 70 },
      days,
    }],
    selectedIds: ["a"],
  });
  const corporativo = view.indicators.find((item) => item.id === "gasto_corporativo");
  const operativo = view.indicators.find((item) => item.id === "gasto_operativo");
  assert.equal(corporativo.unit, "$");
  assert.equal(operativo.unit, "$");
  assert.equal(corporativo.columns[0].value, 10 + 5 * 5);
  assert.equal(corporativo.columns[0].points[1].value, null);
  assert.equal(operativo.columns[0].value, 2 * 6);
  assert.equal(view.indicators.find((item) => item.id === "gasto"), undefined);
  const empty = chart.buildExecutiveView({
    scope: "plant",
    plant: "San Luis",
    weeks: [{
      id: "z",
      week_number: 41,
      fecha_desde: "2026-10-04",
      fecha_hasta: "2026-10-10",
      metrics: {},
      days: [{ fecha: "2026-10-04", gasto_corporativo_mxn: null, gasto_operativo_mxn: null, metrics: {} }],
    }],
    selectedIds: ["z"],
  });
  assert.equal(empty.indicators.find((item) => item.id === "gasto_corporativo").columns[0].value, null);
});

test("hay exactamente cinco marcos con las filas pedidas", () => {
  assert.deepEqual(chart.FRAMES.map((frame) => frame.id), ["resultado", "gastos", "margen", "hg", "canal"]);
  const rows = {
    resultado: ["resultado"],
    gastos: ["gasto_corporativo", "gasto_operativo"],
    margen: ["margen", "com_desc", "precio", "costo", "flete", "descuento_compra"],
    hg: ["hg", "kilos"],
    canal: ["venta_casa", "venta_comisionista"],
  };
  for (const frame of chart.FRAMES) {
    assert.deepEqual(chart.INDICATORS.filter((item) => item.frame === frame.id).map((item) => item.id), rows[frame.id]);
  }
  const svg = chart.renderExecutiveSvg(chart.buildExecutiveView({
    scope: "all",
    weeks: [42, 43, 44].map((number, index) => ({
      id: String(number),
      week_number: number,
      fecha_desde: `2026-10-${11 + index * 7}`,
      fecha_hasta: `2026-10-${17 + index * 7}`,
      metrics: { resultado_mxn: 10 },
      days: [],
    })),
    selectedIds: ["42", "43", "44"],
  }));
  assert.equal((svg.match(/data-frame="/g) || []).length, 5);
  assert.match(svg, /data-frame="resultado" data-frame-title="RESULTADO" data-frame-rows="resultado"/);
  assert.match(svg, /data-frame="gastos" data-frame-title="GASTOS" data-frame-rows="gasto_corporativo,gasto_operativo"/);
  assert.match(svg, /data-frame="margen" data-frame-title="MARGEN \/ PRECIO \/ COSTOS" data-frame-rows="margen,com_desc,precio,costo,flete,descuento_compra"/);
  assert.match(svg, /data-frame="hg" data-frame-title="HG \/ VOLUMEN" data-frame-rows="hg,kilos"/);
  assert.match(svg, /data-frame="canal" data-frame-title="VENTAS POR CANAL" data-frame-rows="venta_casa,venta_comisionista"/);
  assert.match(svg, /GASTO CORPORATIVO/);
  assert.match(svg, /GASTO OPERATIVO/);
  assert.doesNotMatch(svg, /data-indicator="gasto"/);
  assert.match(svg, /IGF Diario semanal · Todas/);
});

test("el selector abre y cierra sin perder la selección múltiple", () => {
  assert.match(MODAL, /setMenu\(\(open\) => !open\)/);
  assert.match(MODAL, /aria-expanded=\{menu\}/);
  assert.match(MODAL, /data-week-panel="1"/);
  assert.match(MODAL, /addEventListener\("mousedown", onDown\)/);
  assert.match(MODAL, /menuRef\.current\?\.contains/);
  assert.match(MODAL, /event\.key === "Escape"/);
  assert.match(MODAL, /setMenu\(false\)/);
  assert.match(MODAL, /type="checkbox"/);
  assert.match(MODAL, /current\.includes\(id\) \? current\.filter/);
});

test("el tooltip corresponde solo al punto y a la semana bajo el cursor", () => {
  assert.equal(chart.tooltipLines("2026-10-12", "Costo Gas LP", 12.55, "$/kg").join("\n"), "12/10/2026\nCosto Gas LP\n$12.55/kg");
  assert.equal(chart.tooltipLines("2026-10-12", "HG", -102526.45, "$").join("\n"), "12/10/2026\nHG\n-$102,526.45");
  assert.equal(chart.tooltipLines("2026-10-12", "Venta Casa", 7850, "kg").join("\n"), "12/10/2026\nVenta Casa\n7,850 kg");
  const weeks = [42, 43].map((number, index) => ({
    id: String(number),
    week_number: number,
    fecha_desde: index === 0 ? "2026-10-11" : "2026-10-18",
    fecha_hasta: index === 0 ? "2026-10-17" : "2026-10-24",
    metrics: { costo_kg: 12.55, hg_mxn: index === 0 ? -50000 : -100000 },
    days: [{
      fecha: index === 0 ? "2026-10-12" : "2026-10-18",
      metrics: { costo_kg: index === 0 ? 12.55 : 9, hg_mxn: index === 0 ? -102526.45 : -1 },
      venta_casa_kg: 7850,
    }],
  }));
  const view = chart.buildExecutiveView({ scope: "plant", plant: "San Luis", weeks, selectedIds: ["42", "43"] });
  const svg = chart.renderExecutiveSvg(view, {
    tooltip: { indicatorId: "costo", weekNumber: 42, fecha: "2026-10-12" },
  });
  assert.equal((svg.match(/data-tooltip="open"/g) || []).length, 1);
  assert.match(svg, /data-tooltip-week="42"/);
  assert.match(svg, /data-tooltip-indicator="costo"/);
  assert.match(svg, /12\/10\/2026/);
  assert.match(svg, /Costo Gas LP/);
  assert.match(svg, /\$12\.55\/kg/);
  assert.doesNotMatch(svg, /data-tooltip-week="43"/);
  const other = svg.match(/data-point="1" data-week="43" data-fecha="2026-10-18"[^>]*data-label="Costo Gas LP"[^>]*data-shown="([^"]+)"/);
  assert.ok(other);
  assert.notEqual(other[1], "$12.55/kg");
  assert.match(MODAL, /data-point-tooltip="1"/);
  assert.match(MODAL, /data-fecha-label/);
  assert.match(MODAL, /data-label/);
  assert.match(MODAL, /data-shown/);
  const hg = chart.INDICATORS.find((item) => item.id === "hg");
  assert.equal(chart.deltaTone(hg, -50000), "good");
  assert.equal(chart.deltaTone(hg, 50000), "bad");
  assert.equal(chart.deltaTone(chart.INDICATORS.find((item) => item.id === "gasto_operativo"), -1), "good");
  assert.equal(chart.deltaTone(chart.INDICATORS.find((item) => item.id === "resultado"), -1), "bad");
  assert.match(svg, /IGF Diario semanal · San Luis/);
  assert.match(svg, /data-indicator="descuento_compra"[\s\S]*Pendiente/);
  assert.match(MODAL, /image\/png/);
  assert.match(MODAL, /toBlob/);
  assert.match(chart.downloadName(view), /\.png$/);
});
