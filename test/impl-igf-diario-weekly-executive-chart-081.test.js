"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const chart = require("../frontend-dashboard/lib/igf-diario-weekly-executive-chart");
const { CONCEPTS } = require("../lib/igf-diario-gastos-distribucion");
const weekly = require("../lib/igf-diario-weekly-plant");

const ROOT = path.join(__dirname, "..");
const PLANT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyPlantPanel.tsx"), "utf8");
const ALL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyAllPlantsPanel.tsx"), "utf8");
const MODAL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyExecutiveModal.tsx"), "utf8");
const WEEKLY_SRC = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-weekly-plant.js"), "utf8");

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

function week(id, number, desde, hasta, days, extra) {
  return {
    id,
    week_number: number,
    fecha_desde: desde,
    fecha_hasta: hasta,
    metrics: metrics(),
    days,
    ...extra,
  };
}

function sevenDays(start, dayMetrics, channels) {
  const days = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < 7; i += 1) {
    const fecha = cursor.toISOString().slice(0, 10);
    days.push({
      fecha,
      metrics: dayMetrics(i),
      venta_casa_kg: channels ? channels.casa[i] : null,
      venta_comisionista_kg: channels ? channels.com[i] : null,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

test("el botón Gráfica abre el visor de planta y de TODAS y cerrar no mueve la semana", () => {
  assert.match(PLANT, /Gráfica/);
  assert.match(PLANT, /setExecutiveOpen\(true\)/);
  assert.match(PLANT, /IgfDiarioWeeklyExecutiveModal/);
  assert.match(PLANT, /onClose=\{\(\) => setExecutiveOpen\(false\)\}/);
  assert.match(PLANT, /seriesMetric=\{selectedRow.key\}/);
  assert.match(ALL, /Gráfica/);
  assert.match(ALL, /setExecutiveOpen\(true\)/);
  assert.ok(ALL.indexOf("Semana siguiente") < ALL.indexOf("Gráfica"));
  assert.match(ALL, /onClose=\{\(\) => setExecutiveOpen\(false\)\}/);
  assert.doesNotMatch(ALL, /onClose=\{\(\) => setAnchor/);
  assert.match(MODAL, /data-executive-chart="fullscreen"/);
  assert.match(MODAL, /fixed inset-0/);
  assert.match(MODAL, /data-close="executive"/);
  assert.match(MODAL, /onClose/);
  assert.doesNotMatch(MODAL, /setAnchor/);
  assert.doesNotMatch(MODAL, /Semana 39|Semana 40|Semana 41/);
});

test("por defecto toma las últimas 3 semanas y las ordena de izquierda a derecha", () => {
  const weeks = [
    week("c", 12, "2026-03-22", "2026-03-28", []),
    week("a", 10, "2026-03-08", "2026-03-14", []),
    week("e", 14, "2026-04-05", "2026-04-11", []),
    week("b", 11, "2026-03-15", "2026-03-21", []),
    week("d", 13, "2026-03-29", "2026-04-04", []),
  ];
  assert.deepEqual(chart.defaultSelectedIds(weeks), ["c", "d", "e"]);
  const view = chart.buildExecutiveView({ scope: "plant", plant: "San Luis", weeks, selectedIds: ["e", "a", "c"] });
  assert.deepEqual(view.weeks.map((item) => item.week_number), [10, 12, 14]);
  assert.equal(view.weeks[0].range, "08/03/2026–14/03/2026");
});

test("el delta usa la semana seleccionada anterior, no el hueco desmarcado", () => {
  const low = week("a", 10, "2026-03-08", "2026-03-14", [], { metrics: metrics({ resultado_mxn: 10, com_desc_kg: -3 }) });
  const mid = week("b", 11, "2026-03-15", "2026-03-21", [], { metrics: metrics({ resultado_mxn: 1, com_desc_kg: -9 }) });
  const high = week("c", 12, "2026-03-22", "2026-03-28", [], { metrics: metrics({ resultado_mxn: 40, com_desc_kg: -4 }) });
  const view = chart.buildExecutiveView({
    scope: "plant",
    plant: "San Luis",
    weeks: [high, mid, low],
    selectedIds: ["a", "c"],
  });
  const resultado = view.indicators.find((item) => item.id === "resultado");
  assert.equal(resultado.columns[1].delta.absolute, 30);
  assert.equal(resultado.columns[1].tone, "good");
  const cd = view.indicators.find((item) => item.id === "com_desc");
  assert.equal(cd.columns[1].delta.absolute, -1);
});

test("las escalas de cada indicador son independientes", () => {
  const days = sevenDays("2026-03-08", (index) => metrics({
    precio_kg: 10 + index,
    venta_kg: 1000 + index * 100,
  }));
  days.forEach((day, i) => { day.hg_kilos = 1000 + i * 100; });
  const view = chart.buildExecutiveView({
    scope: "plant",
    plant: "San Luis",
    weeks: [week("a", 10, "2026-03-08", "2026-03-14", days, { metrics: metrics({ precio_kg: 13, venta_kg: 9100 }) })],
    selectedIds: ["a"],
  });
  const svg = chart.renderExecutiveSvg(view);
  const precio = svg.match(/data-indicator="precio" data-scale="([^"]+)"/);
  const kilos = svg.match(/data-indicator="kilos" data-scale="([^"]+)"/);
  assert.ok(precio && kilos);
  assert.notEqual(precio[1], kilos[1]);
  assert.match(precio[1], /^10,/);
  assert.match(kilos[1], /^1000,/);
});

test("GASTO suma solo los siete componentes ponderados por la venta cubierta", () => {
  assert.deepEqual(chart.GASTO_COMPONENTS, CONCEPTS.map((key) => `${key}_kg`));
  assert.equal(chart.GASTO_COMPONENTS.length, 7);
  for (const key of ["costo_kg", "flete_kg", "hg_mxn", "hg_kg"]) {
    assert.equal(chart.GASTO_COMPONENTS.includes(key), false);
  }
  const days = [
    { metrics: metrics({ venta_kg: 100, costo_kg: 99, flete_kg: 88, hg_mxn: 77 }) },
    { metrics: metrics({ venta_kg: 300, costo_kg: 99, flete_kg: 88, hg_mxn: 77, gasto_corporativo_kg: 2, inversiones_kg: 2, impuestos_federales_kg: 2, presupuesto_nomina_gastos_kg: 2, presupuesto_imss_sua_kg: 2, extraordinarios_kg: 2, provisiones_planta_kg: 2 }) },
  ];
  assert.equal(chart.weeklyGastoKg(days), (7 * 100 + 14 * 300) / 400);
  assert.notEqual(chart.weeklyGastoKg(days), 7 + 14);
  const incomplete = [{ metrics: metrics({ venta_kg: 100, extraordinarios_kg: null }) }];
  assert.equal(chart.weeklyGastoKg(incomplete), null);
  assert.equal(chart.dayGastoRate(metrics({ costo_kg: 50 })), 7);
});

test("la semántica de color no sigue solo el signo matemático", () => {
  const cd = chart.INDICATORS.find((item) => item.id === "com_desc");
  const gasto = chart.INDICATORS.find((item) => item.id === "gasto_corporativo");
  const resultado = chart.INDICATORS.find((item) => item.id === "resultado");
  assert.equal(chart.deltaTone(cd, -4 - (-3)), "bad");
  assert.equal(chart.deltaTone(cd, -2.5 - (-3)), "good");
  assert.equal(chart.deltaTone(gasto, -1), "good");
  assert.equal(chart.deltaTone(gasto, 1), "bad");
  assert.equal(chart.deltaTone(resultado, 1), "good");
  assert.equal(chart.deltaTone(resultado, -1), "bad");
  assert.equal(chart.deltaTone(resultado, 0), "neutral");
  assert.equal(chart.deltaTone(chart.INDICATORS.find((item) => item.id === "hg"), -1), "good");
  assert.equal(chart.deltaTone(chart.INDICATORS.find((item) => item.id === "costo"), 1), "bad");
  assert.equal(chart.deltaTone(chart.INDICATORS.find((item) => item.id === "flete"), -1), "good");
  assert.equal(chart.deltaTone(chart.INDICATORS.find((item) => item.id === "venta_casa"), 1), "good");
});

test("Descuento Compra queda pendiente y TODAS usa el consolidado recibido", () => {
  const consolidated = metrics({ precio_kg: 11.5, venta_kg: 500, resultado_mxn: 900 });
  const view = chart.buildExecutiveView({
    scope: "all",
    weeks: [week("a", 10, "2026-03-08", "2026-03-14", sevenDays("2026-03-08", () => metrics({ precio_kg: 1 })), { metrics: consolidated, coverage_note: "Cobertura parcial" })],
    selectedIds: ["a"],
  });
  assert.equal(view.title, "IGF Diario semanal · Todas");
  const precio = view.indicators.find((item) => item.id === "precio");
  assert.equal(precio.columns[0].value, 11.5);
  const pending = view.indicators.find((item) => item.id === "descuento_compra");
  assert.equal(pending.pending, true);
  assert.equal(pending.scale, null);
  const svg = chart.renderExecutiveSvg(view);
  assert.match(svg, /data-indicator="descuento_compra"[\s\S]*Pendiente/);
  assert.match(svg, /Cobertura parcial/);
  assert.match(MODAL, /weekFromAll/);
  assert.match(MODAL, /resumen\?\.metrics/);
  assert.match(MODAL, /resumen\?\.days/);
  assert.doesNotMatch(MODAL, /plants\.map\(\(plant\) =>/);
});

test("la descarga es PDF de la visualización y conserva la venta por canal ya resuelta", () => {
  assert.match(MODAL, /Descargar PDF/);
  assert.match(MODAL, /application\/pdf/);
  assert.doesNotMatch(MODAL, /image\/png/);
  assert.doesNotMatch(MODAL, /toBlob/);
  assert.match(MODAL, /downloadName\(snapshot\)/);
  const days = sevenDays("2026-03-08", () => metrics(), {
    casa: [10, 10, 10, 10, 10, 10, 10],
    com: [5, null, 5, 5, 5, 5, 5],
  });
  const view = chart.buildExecutiveView({
    scope: "plant",
    plant: "San Luis",
    weeks: [week("a", 10, "2026-03-08", "2026-03-14", days)],
    selectedIds: ["a"],
  });
  assert.equal(view.indicators.find((item) => item.id === "venta_casa").columns[0].value, 70);
  assert.equal(view.indicators.find((item) => item.id === "venta_comisionista").columns[0].value, 30);
  const svg = chart.renderExecutiveSvg(view, { exportedAt: "12/10/2026" });
  assert.match(svg, /IGF Diario semanal · San Luis/);
  assert.match(svg, /Exportado 12\/10\/2026/);
  assert.match(chart.downloadName(view), /\.pdf$/);
  const record = weekly.weekDayRecords([{
    fecha: "2026-03-08",
    ventaKg: 15,
    casaKg: 10,
    comKg: 5,
    precio: 10,
    costoKg: 4,
    fleteKg: 1,
    hgImporte: 2,
    cdKg: -1,
    expenses: null,
  }], "2026-03-09")[0];
  assert.equal(record.venta_casa_kg, 10);
  assert.equal(record.venta_comisionista_kg, 5);
  assert.equal(record.metrics.venta_kg, 15);
  assert.match(WEEKLY_SRC, /venta_casa_kg: sumSibling/);
  assert.match(WEEKLY_SRC, /venta_comisionista_kg: sumSibling/);
});
