"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const nav = require("../frontend-dashboard/lib/igf-gastos-month-nav");
const datos = require("../lib/igf-diario-datos-planta");
const forecast = require("../lib/dashboard-arr-forecast");
const weekly = require("../lib/igf-diario-weekly-plant");
const layout = require("../lib/igf-diario-expense-layout");

const CLIENT = fs.readFileSync(path.join(__dirname, "..", "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const FIELDS = [
  { key: "gasto_corporativo" },
  { key: "inversiones" },
  { key: "impuestos_federales" },
];

function modal(overrides) {
  return {
    plant: "Acapulco",
    plantLabel: "Acapulco",
    group: "operativos",
    year: 2026,
    month: 10,
    requestId: 1,
    drafts: { a: "10" },
    baseline: { a: "10" },
    loading: false,
    loadError: null,
    contractOk: true,
    ...overrides,
  };
}

test("la navegación cruza diciembre y enero sin tocar otro periodo", () => {
  assert.deepEqual(nav.shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(nav.shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  assert.equal(nav.monthLabel(2026, 10), "octubre 2026");
  assert.equal(nav.monthLabel(2027, 1), "enero 2027");
  assert.equal(nav.samePeriod(2026, 11, 2026, 10), false);
  assert.equal(nav.samePeriod(2026, 10, 2026, 10), true);
});

test("un mes sin desglose no fabrica ceros y el guardado queda cerrado", () => {
  const empty = nav.draftsForGroup(null, "operativos", FIELDS);
  assert.deepEqual(empty.drafts, {
    gasto_corporativo: "",
    inversiones: "",
    impuestos_federales: "",
  });
  assert.equal(empty.hasBreakdown, false);
  const capturedZero = nav.draftsForGroup({
    operativos_desglosados: true,
    componentes: { gasto_corporativo: 0, inversiones: 4, impuestos_federales: null },
  }, "operativos", FIELDS);
  assert.equal(capturedZero.drafts.gasto_corporativo, "0");
  assert.equal(capturedZero.drafts.impuestos_federales, "");
  assert.equal(nav.canSaveDesglose(modal({ contractOk: false }), false), false);
  assert.equal(nav.canSaveDesglose(modal({ loading: true }), false), false);
  assert.equal(nav.canSaveDesglose(modal({ loadError: "falló" }), false), false);
  assert.equal(nav.canSaveDesglose(modal(), true), false);
  assert.equal(nav.canSaveDesglose(modal(), false), true);
  assert.equal(layout.usesDetailedExpenseLayout(2026, 9), false);
  assert.equal(layout.usesDetailedExpenseLayout(2026, 10), true);
  assert.equal(layout.usesDetailedExpenseLayout(2027, 1), true);
});

test("cambios sin guardar, respuesta tardía y periodos distintos no se mezclan", () => {
  assert.equal(nav.draftsDirty({ a: "10" }, { a: "10" }), false);
  assert.equal(nav.draftsDirty({ a: "11" }, { a: "10" }), true);
  const current = modal({ requestId: 4, year: 2026, month: 11 });
  assert.equal(nav.acceptPeriodLoad(current, { ...current, requestId: 3 }), false);
  assert.equal(nav.acceptPeriodLoad(current, { ...current, month: 10 }), false);
  assert.equal(nav.acceptPeriodLoad(current, { ...current, plant: "Morelos" }), false);
  assert.equal(nav.acceptPeriodLoad(current, current), true);
});

test("el modal usa su periodo visible en lectura, guardado y distribución", () => {
  const loadStart = CLIENT.indexOf("const loadDesglosePeriod");
  const saveStart = CLIENT.indexOf("const saveDesglose");
  const distStart = CLIENT.indexOf("const openDistribucion");
  const changeStart = CLIENT.indexOf("const changeDesgloseMonth");
  const closeStart = CLIENT.indexOf("const closeDesglose");
  const load = CLIENT.slice(loadStart, saveStart);
  const save = CLIENT.slice(saveStart, CLIENT.indexOf("const openMargenDiario"));
  const dist = CLIENT.slice(distStart, CLIENT.indexOf("const saveDistribucionDia"));
  const change = CLIENT.slice(changeStart, closeStart);
  assert.match(load, /fetchIgfDiarioGastosDesglose\(\{ token, year: next\.year, month: next\.month \}\)/);
  assert.match(save, /year: periodYear/);
  assert.match(save, /month: periodMonth/);
  assert.match(save, /samePeriod\(periodYear, periodMonth, igfForecast\.year, igfForecast\.month\)/);
  assert.match(dist, /const year = desgloseModal\.year/);
  assert.match(dist, /const month = desgloseModal\.month/);
  assert.match(CLIENT, /year,\s*month,\s*plant_code: distribucionModal\.plant/);
  assert.doesNotMatch(change, /setUploadDay/);
  assert.match(CLIENT, /aria-label="Mes anterior"/);
  assert.match(CLIENT, /aria-label="Mes siguiente"/);
  assert.match(CLIENT, /monthLabel\(desgloseModal\.year, desgloseModal\.month\)/);
  assert.match(CLIENT, /desgloseModal\.plantLabel/);
  assert.match(CLIENT, /Hay cambios sin guardar/);
  assert.match(CLIENT, /disabled=\{!canSaveDesglose\(desgloseModal, gastoSaving\)\}/);
  assert.match(CLIENT, /monthLabel\(distribucionModal\.year, distribucionModal\.month\)/);
});

test("HG ausente deja el resultado vacío y un cero explícito no se borra", () => {
  const expenses = {
    gasto_corporativo: 1,
    inversiones: 1,
    impuestos_federales: 1,
    presupuesto_nomina_gastos: 1,
    presupuesto_imss_sua: 1,
    extraordinarios: 1,
    provisiones_planta: 1,
  };
  const missing = weekly.dayMetrics({
    ventaKg: 100,
    precio: 10,
    costoKg: 8,
    fleteKg: 1,
    hgImporte: null,
    cdKg: -1,
    expenses,
  });
  assert.equal(missing.metrics.hg_mxn, null);
  assert.equal(missing.metrics.resultado_mxn, null);
  const explicitZero = weekly.dayMetrics({
    ventaKg: 100,
    precio: 10,
    costoKg: 8,
    fleteKg: 1,
    hgImporte: 0,
    cdKg: -1,
    expenses,
  });
  assert.equal(explicitZero.metrics.hg_mxn, 0);
  assert.equal(typeof explicitZero.metrics.resultado_mxn, "number");
});

test("M referencia PRECIO por fecha y no inventa un precio ausente", () => {
  const wb = new ExcelJS.Workbook();
  const precio = wb.addWorksheet("PRECIO");
  precio.getCell(1, 1).value = "Fecha";
  precio.getCell(1, 2).value = "PRECIO";
  precio.getCell(10, 1).value = new Date(Date.UTC(2026, 9, 4));
  precio.getCell(10, 2).value = 12.5;
  precio.getCell(11, 1).value = new Date(Date.UTC(2026, 9, 11));
  precio.getCell(11, 2).value = 12.5;
  const sheet = datos.ensureSheet(wb);
  datos.fillDatosPlanta(sheet, { year: 2026, month: 10, salesRows: [], comprasPayload: null });
  const october4 = sheet.getCell(6, 13);
  assert.equal(october4.value.formula, "PRECIO!B10");
  assert.equal(october4.value.result, 12.5);
  assert.equal(sheet.getCell(13, 13).value.formula, "PRECIO!B11");
  assert.equal(sheet.getCell(3, 13).value, null);
  assert.notEqual(sheet.getCell(6, 13).value.formula, "PRECIO!B5");
});

test("AF y AG conservan pesos, signo, cero y ausencia", async () => {
  const rows = [
    { plant_code: "San Luis", fecha: "2026-10-04", canal: "Casa", monto: -10.5 },
    { plant_code: "San Luis", fecha: "2026-10-04", canal: "Casa", monto: -5 },
    { plant_code: "San Luis", fecha: "2026-10-04", canal: "Comisionista", monto: 0 },
    { plant_code: "San Luis", fecha: "2026-10-04", canal: "Predio", monto: -99 },
    { plant_code: "San Luis", fecha: "2026-10-05", canal: "Casa", monto: null },
    { plant_code: "Morelos", fecha: "2026-10-04", canal: "Casa", monto: -1000 },
  ];
  const classified = forecast.aggregateDescuentoDiarioPorCanal([], rows, ["San Luis"]);
  const slot = classified.byFecha.get("2026-10-04")["San Luis"];
  assert.equal(slot.CASA.monto, -15.5);
  assert.equal(slot.CASA.montoCaptured, true);
  assert.equal(slot.COMISIONISTA.monto, 0);
  assert.equal(slot.COMISIONISTA.montoCaptured, true);
  assert.equal(classified.unclassifiedMonto, -99);
  assert.equal(classified.byFecha.get("2026-10-05")["San Luis"].CASA.montoCaptured, false);
  const client = {
    async query(sql) {
      assert.match(String(sql), /arr\.descuentos_diarios_cliente/);
      assert.match(String(sql), /arr\.cliente_categoria_mes/);
      return { rows };
    },
  };
  const loaded = await forecast.getDescuentoImporteClasificado(client, 2026, 10, "San Luis");
  assert.equal(loaded.byFecha.get("2026-10-04").casa, -15.5);
  assert.equal(loaded.byFecha.get("2026-10-04").comisionista, 0);
  assert.equal(loaded.byFecha.get("2026-10-05").casa, null);
  assert.equal(loaded.unclassifiedTotal, -99);
  assert.equal(loaded.byFecha.has("2026-10-02"), false);
  const wb = new ExcelJS.Workbook();
  const sheet = datos.ensureSheet(wb);
  datos.fillDatosPlanta(sheet, {
    year: 2026,
    month: 10,
    salesRows: [],
    comprasPayload: null,
    discountByFecha: loaded.byFecha,
  });
  assert.equal(sheet.getCell(1, 32).value, "DESCUENTOS");
  assert.equal(sheet.getCell(2, 32).value, "Descuento CASA ($)");
  assert.equal(sheet.getCell(2, 33).value, "Descuento COMISIONISTA ($)");
  assert.equal(sheet.getCell(6, 32).value, -15.5);
  assert.equal(sheet.getCell(6, 33).value, 0);
  assert.equal(sheet.getCell(6, 32).value + sheet.getCell(6, 33).value, -15.5);
  assert.equal(sheet.getCell(7, 32).value, null);
  assert.equal(sheet.getCell(7, 33).value, null);
  assert.equal(sheet.getCell(6, 14).value, null);
  assert.equal(sheet.getCell(6, 18).value, null);
  assert.equal(sheet.getCell(6, 12).value, null);
  const target = path.join(__dirname, "..", "docs", "dev-loop", "reports", "evidence-083", "san-luis-discounts.xlsx");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await wb.xlsx.writeFile(target);
  const opened = new ExcelJS.Workbook();
  await opened.xlsx.readFile(target);
  assert.equal(opened.getWorksheet("DatosPlanta").getCell(6, 32).value, -15.5);
  assert.equal(opened.worksheets.some((item) => item.name === "DatosPlanta" && opened.worksheets.filter((sheetItem) => sheetItem.name === "DatosPlanta").length === 1), true);
});
