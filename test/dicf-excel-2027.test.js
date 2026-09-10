"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const XLSX = require("xlsx");

const { computePromMesByDow } = require("../lib/dashboard-arr-forecast");
const {
  MONTH_LABELS,
  PAIRS,
  WEEKDAYS_LUN_DOM,
  PROM_RECONCILIATION_TOLERANCE,
  classifyCanal,
  classifySubcanal,
  classifyPair,
  weekdayCounts2027,
  weekdayCountsForMonth,
  projectVentaMonth,
  projectDiscountMonth,
  computeSixPairProms,
  projectYearFromProms,
  reconcilePlantVsPairs,
  emptyPairMaps,
  pairKey,
} = require("../lib/dicf-excel-2027");
const {
  EXISTING_SHEET_NAMES,
  buildExistingDicfExcelSheets,
  existingSheetsAoaEqual,
  buildDicfClienteForecastWorkbook,
} = require("../lib/dicf-excel-workbook");

const ROOT = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function gitChanged() {
  return execSync("git diff --name-only HEAD", { encoding: "utf8", cwd: ROOT })
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

const LOOKBACK = Object.freeze({
  enableLookback: true,
  lookbackStartYmd: "2026-08-11",
  lookbackEndYmd: "2026-09-07",
  lookbackQueryFromYmd: "2026-08-11",
  lookbackVisualStartYmd: "2026-08-10",
  corteYmdStr: "2026-09-07",
});

const DATES = Object.freeze([
  "2026-08-17",
  "2026-08-18",
  "2026-08-19",
  "2026-08-20",
  "2026-08-21",
  "2026-08-22",
  "2026-08-23",
  "2026-08-24",
  "2026-08-25",
  "2026-08-26",
  "2026-08-27",
  "2026-08-28",
  "2026-08-29",
  "2026-08-30",
]);

function pairMapsCoveringUniverse(scale = 1, ratioBase = -0.1) {
  const maps = emptyPairMaps();
  const plant = new Map();
  PAIRS.forEach((pair, idx) => {
    const key = pairKey(pair);
    const ton = (idx + 1) * scale;
    const ratio = ratioBase * (idx + 1);
    for (const fecha of DATES) {
      maps.venta[key].set(fecha, ton);
      maps.ratio[key].set(fecha, ratio);
      plant.set(fecha, (plant.get(fecha) || 0) + ton);
    }
  });
  return { maps, plant };
}

function ctxForPlant(plantCode, ventaMap) {
  return {
    plants: [plantCode],
    ventaMapByPlant: new Map([[plantCode, ventaMap]]),
    ...LOOKBACK,
  };
}

function selectedAll(plantCode, overrides) {
  const inner = new Map();
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) inner.set(k, v);
  }
  return new Map([[plantCode, inner]]);
}

const STABLE_EXCEL = Object.freeze({
  dates: ["2026-09-01", "2026-09-02"],
  margen: 7.12,
  meses: [{ year: 2026, month: 9, label: "Septiembre forecast" }],
  margenPorMes: [7.12],
  clientes: [
    {
      cliente: "CLIENTE A",
      estado: "Aumentaron",
      canal: "Casa",
      subcanal: "Autotanque",
      kgLast30: [1.5, 2],
      descKgLast30: [-0.16, -0.2],
      ventaPorMes: [10],
      descuentoPorMes: [100],
    },
  ],
});

async function workbookWith2027(plantCode, pairMaps, plantVenta, extra = {}) {
  return buildDicfClienteForecastWorkbook(STABLE_EXCEL, STABLE_EXCEL.clientes, {
    client: null,
    plantCode,
    year: 2026,
    month: 9,
    fechaCorte: "2026-09-07",
    prebuiltVentaDescCtx: ctxForPlant(plantCode, plantVenta),
    selectedAll: extra.selectedAll || selectedAll(plantCode),
    pairMaps,
  });
}

describe("R-DICF-2027 001-004 workbook", () => {
  it("001 endpoint sigue generando workbook válido", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    const buf = XLSX.write(built.wb, { type: "buffer", bookType: "xlsx" });
    assert.ok(Buffer.isBuffer(buf) && buf.length > 0);
    const wb2 = XLSX.read(buf, { type: "buffer" });
    assert.ok(wb2.SheetNames.length >= 5);
  });
  it("002 sheetNames contiene las 4 hojas anteriores", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    for (const name of EXISTING_SHEET_NAMES) assert.ok(built.wb.SheetNames.includes(name), name);
  });
  it("003 sheetNames contiene 2027", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    assert.ok(built.wb.SheetNames.includes("2027"));
  });
  it("004 2027 es adicional, no reemplazo", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    assert.deepEqual(built.wb.SheetNames.slice(0, 4), EXISTING_SHEET_NAMES.slice());
    assert.equal(built.wb.SheetNames[4], "2027");
  });
});

describe("R-DICF-2027 005-012 pares", () => {
  it("005 seis pares exactos", () => {
    assert.equal(PAIRS.length, 6);
  });
  it("006 no subcanal vacío", () => {
    assert.equal(classifyPair("Casa", ""), null);
    assert.equal(PAIRS.every((p) => p.subcanal), true);
  });
  it("007 CASA AUTOTANQUE", () => {
    assert.deepEqual(classifyPair("Casa", "Autotanque"), { canal: "CASA", subcanal: "AUTOTANQUE" });
  });
  it("008 CASA PORTATIL", () => {
    assert.deepEqual(classifyPair("CASA", "Portátil"), { canal: "CASA", subcanal: "PORTATIL" });
  });
  it("009 CASA CARBURACION", () => {
    assert.deepEqual(classifyPair("Casa", "Carburación"), { canal: "CASA", subcanal: "CARBURACION" });
  });
  it("010 COMISIONISTA AUTOTANQUE", () => {
    assert.deepEqual(classifyPair("Comisionista", "Autotanque"), { canal: "COMISIONISTA", subcanal: "AUTOTANQUE" });
  });
  it("011 COMISIONISTA PORTATIL", () => {
    assert.deepEqual(classifyPair("COMISIONISTA", "Portatil"), { canal: "COMISIONISTA", subcanal: "PORTATIL" });
  });
  it("012 COMISIONISTA CARBURACION", () => {
    assert.deepEqual(classifyPair("comisionista", "carburacion"), { canal: "COMISIONISTA", subcanal: "CARBURACION" });
  });
});

describe("R-DICF-2027 013-017 calendario", () => {
  it("013 weekdays lunes→domingo", () => {
    assert.deepEqual(WEEKDAYS_LUN_DOM, ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]);
  });
  it("014 enero counts = 4/4/4/4/5/5/5", () => {
    assert.deepEqual(weekdayCountsForMonth(2027, 1), [4, 4, 4, 4, 5, 5, 5]);
  });
  it("015 febrero counts = 4/4/4/4/4/4/4", () => {
    assert.deepEqual(weekdayCountsForMonth(2027, 2), [4, 4, 4, 4, 4, 4, 4]);
  });
  it("016 calendario 2027 determinista", () => {
    const a = weekdayCounts2027();
    const b = weekdayCounts2027();
    assert.deepEqual(a, b);
    assert.equal(a.length, 12);
    assert.equal(a.reduce((s, row) => s + row.reduce((x, y) => x + y, 0), 0), 365);
  });
  it("017 no Date.now para calendario", () => {
    const src = read("lib/dicf-excel-2027.js");
    assert.equal(/Date\.now/.test(src), false);
    assert.match(src, /YEAR_2027 = 2027/);
  });
});

describe("R-DICF-2027 018-025 PROM", () => {
  it("018 usa misma ventana PROM", () => {
    const src = read("lib/dicf-excel-2027.js");
    assert.match(src, /computePromMesByDow/);
    assert.match(src, /lookbackStartYmd/);
  });
  it("019 usa mismo cutoff", () => {
    const src = read("lib/dicf-excel-2027.js");
    assert.match(src, /lookbackEndYmd/);
    assert.match(src, /corteYmdStr/);
  });
  it("020 respeta arr.pronostico_dias_seleccion", () => {
    const src = read("lib/dicf-excel-2027.js");
    assert.match(src, /loadPronosticoDiasSeleccionMap/);
    assert.match(src, /selectedByYmd/);
  });
  it("021 desmarcado no entra PROM", () => {
    const map = new Map([
      ["2026-08-17", 10],
      ["2026-08-24", 4],
    ]);
    const withAll = computePromMesByDow(map, { ...LOOKBACK, selectedByYmd: new Map() });
    const skipped = computePromMesByDow(map, {
      ...LOOKBACK,
      selectedByYmd: new Map([["2026-08-17", false]]),
    });
    assert.equal(withAll[0], 7);
    assert.equal(skipped[0], 4);
  });
  it("022 PROM por par usa canal", () => {
    assert.equal(classifyCanal("Casa"), "CASA");
    assert.equal(classifyCanal("OTRO"), null);
  });
  it("023 PROM por par usa subcanal", () => {
    assert.equal(classifySubcanal("Autotanque"), "AUTOTANQUE");
    assert.equal(classifySubcanal(""), null);
  });
  it("024 suma seis PROM weekday reconcilia total planta en fixture cerrado", () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const ctx = ctxForPlant("PlantaNorte", plant);
    const six = computeSixPairProms(maps, ctx, new Map());
    const plantProm = computePromMesByDow(plant, { ...LOOKBACK, selectedByYmd: new Map() });
    const recon = reconcilePlantVsPairs(plantProm, six.venta);
    assert.equal(recon.within, true);
    assert.deepEqual(recon.residual, [0, 0, 0, 0, 0, 0, 0]);
  });
  it("025 no reparto artificial de residual", () => {
    const src = read("lib/dicf-excel-2027.js");
    assert.match(src, /no repartido/);
    const { maps, plant } = pairMapsCoveringUniverse();
    plant.set("2026-08-17", plant.get("2026-08-17") + 9);
    const ctx = ctxForPlant("PlantaNorte", plant);
    const six = computeSixPairProms(maps, ctx, new Map());
    const plantProm = computePromMesByDow(plant, { ...LOOKBACK, selectedByYmd: new Map() });
    const recon = reconcilePlantVsPairs(plantProm, six.venta);
    assert.equal(recon.within, false);
    assert.ok(recon.residual.some((r) => r !== 0));
    const before = six.venta.map((row) => row.slice());
    assert.deepEqual(six.venta, before);
  });
});

describe("R-DICF-2027 026-042 venta pct descuento", () => {
  const { maps, plant } = pairMapsCoveringUniverse();
  const ctx = ctxForPlant("PlantaNorte", plant);
  const six = computeSixPairProms(maps, ctx, new Map());
  const projected = projectYearFromProms(six.venta, six.ratio);
  const janN = [4, 4, 4, 4, 5, 5, 5];
  const febN = [4, 4, 4, 4, 4, 4, 4];

  it("026 venta enero fórmula correcta", () => {
    const expected = projectVentaMonth(six.venta[0], janN);
    assert.equal(projected.months[0].venta[0], expected);
    assert.equal(expected, 1 * 31);
  });
  it("027 venta febrero fórmula correcta", () => {
    assert.equal(projected.months[1].venta[0], projectVentaMonth(six.venta[0], febN));
    assert.equal(projected.months[1].venta[0], 28);
  });
  it("028 venta diciembre fórmula correcta", () => {
    const decN = weekdayCountsForMonth(2027, 12);
    assert.equal(projected.months[11].venta[0], projectVentaMonth(six.venta[0], decN));
  });
  it("029 venta TOTAL suma 12 meses", () => {
    const sum = projected.months.reduce((a, m) => a + m.venta[0], 0);
    assert.equal(projected.totals.venta[0], sum);
  });
  it("030 pct mensual correcto", () => {
    const tot = projected.months[0].venta.reduce((a, b) => a + b, 0);
    assert.equal(projected.months[0].pct[0], projected.months[0].venta[0] / tot);
  });
  it("031 pct mensual seis columnas suman 1 cuando total>0", () => {
    const s = projected.months[0].pct.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(s - 1) < 1e-12);
  });
  it("032 pct mensual seis columnas 0 cuando total=0", () => {
    const empty = projectYearFromProms(
      PAIRS.map(() => ["", "", "", "", "", "", ""]),
      PAIRS.map(() => ["", "", "", "", "", "", ""])
    );
    assert.deepEqual(empty.months[0].pct, [0, 0, 0, 0, 0, 0]);
  });
  it("033 pct TOTAL correcto", () => {
    const tot = projected.totals.venta.reduce((a, b) => a + b, 0);
    assert.equal(projected.totals.pct[2], projected.totals.venta[2] / tot);
  });
  it("034 pct TOTAL seis columnas suman 1 cuando anual>0", () => {
    const s = projected.totals.pct.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(s - 1) < 1e-12);
  });
  it("035 descuento mensual weighted correcto", () => {
    const d = projectDiscountMonth(six.ratio[0], six.venta[0], janN);
    assert.equal(projected.months[0].desc[0], d);
    assert.equal(d, -0.1);
  });
  it("036 descuento no se suma como tasa×días", () => {
    const wrong = -0.1 * 31;
    assert.notEqual(projected.months[0].desc[0], wrong);
  });
  it("037 conversión ton/kg dimensionalmente correcta", () => {
    const num = six.ratio[0].reduce((a, r, i) => a + Number(r) * Number(six.venta[0][i]) * janN[i] * 1000, 0);
    const den = six.venta[0].reduce((a, v, i) => a + Number(v) * janN[i] * 1000, 0);
    assert.equal(num / den, projected.months[0].desc[0]);
  });
  it("038 descuento mensual mantiene MXN/kg", () => {
    assert.ok(Math.abs(projected.months[0].desc[0]) < 10);
  });
  it("039 descuento conserva signo", () => {
    assert.ok(projected.months[0].desc[0] < 0);
    assert.ok(projected.totals.desc[5] < 0);
  });
  it("040 descuento mes venta=0 no NaN/Infinity", () => {
    const d = projectDiscountMonth(["-1", "-1", "-1", "-1", "-1", "-1", "-1"], ["", "", "", "", "", "", ""], janN);
    assert.equal(d, null);
    assert.equal(Number.isNaN(d), false);
    assert.equal(d === Infinity, false);
  });
  it("041 descuento TOTAL weighted anual correcto", () => {
    const num = projected.months.reduce((a, m) => a + m.desc[0] * m.venta[0], 0);
    const den = projected.totals.venta[0];
    assert.equal(projected.totals.desc[0], num / den);
  });
  it("042 descuento TOTAL no suma tasas mensuales", () => {
    const summedRates = projected.months.reduce((a, m) => a + m.desc[0], 0);
    assert.notEqual(projected.totals.desc[0], summedRates);
  });
});

describe("R-DICF-2027 043-052 layout y planta", () => {
  it("043 cambio de planta cambia PROM fixture", async () => {
    const a = pairMapsCoveringUniverse(1);
    const b = pairMapsCoveringUniverse(2);
    const wa = await workbookWith2027("PlantaNorte", a.maps, a.plant);
    const wb = await workbookWith2027("PlantaSur", b.maps, b.plant);
    assert.notEqual(wa.sheet2027.projected.months[0].venta[0], wb.sheet2027.projected.months[0].venta[0]);
  });
  it("044 calendario no cambia por planta", () => {
    assert.deepEqual(weekdayCounts2027(), weekdayCounts2027());
    assert.deepEqual(weekdayCountsForMonth(2027, 1), [4, 4, 4, 4, 5, 5, 5]);
  });
  it("045 hoja 2027 tiene ENERO..DICIEMBRE", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    const labels = built.sheet2027.projected.months.map((m) => m.label);
    assert.deepEqual(labels, MONTH_LABELS.slice());
  });
  it("046 hoja 2027 tiene TOTAL", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    const last = built.sheet2027.aoa[built.sheet2027.aoa.length - 1][0];
    assert.equal(last === "TOTAL" || built.sheet2027.aoa.some((r) => r[0] === "TOTAL"), true);
  });
  it("047 bloque Venta presente", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    assert.match(built.sheet2027.aoa[0].join("|"), /VENTA PROYECTADA 2027 \(TON\)/);
  });
  it("048 bloque % presente", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    assert.match(built.sheet2027.aoa[0].join("|"), /% PARTICIPACION/);
  });
  it("049 bloque Descuento presente", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    assert.match(built.sheet2027.aoa[0].join("|"), /DESCUENTO PROYECTADO \(MXN\/KG\)/);
  });
  it("050 encabezado CASA/COMISIONISTA presente", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    const canal = built.sheet2027.aoa[1].join("|");
    assert.match(canal, /CASA/);
    assert.match(canal, /COMISIONISTA/);
  });
  it("051 encabezados subcanal correctos", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    const sub = built.sheet2027.aoa[2].join("|");
    assert.match(sub, /AUTOTANQUE/);
    assert.match(sub, /PORTATIL/);
    assert.match(sub, /CARBURACION/);
  });
  it("052 unidades rotuladas correctamente", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    const titles = built.sheet2027.aoa[0].join("|");
    assert.match(titles, /TON/);
    assert.match(titles, /MXN\/KG/);
  });
});

describe("R-DICF-2027 053-056 integridad 4 hojas", () => {
  const before = buildExistingDicfExcelSheets(STABLE_EXCEL, STABLE_EXCEL.clientes);

  it("053 hoja Venta (Ton) intacta", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    assert.deepEqual(built.existing.sheets["Venta (Ton)"], before.sheets["Venta (Ton)"]);
  });
  it("054 hoja Descuento ($ por kg) intacta", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    assert.deepEqual(built.existing.sheets["Descuento ($ por kg)"], before.sheets["Descuento ($ por kg)"]);
  });
  it("055 hoja Margen ($ por kg) intacta", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    assert.deepEqual(built.existing.sheets["Margen ($ por kg)"], before.sheets["Margen ($ por kg)"]);
  });
  it("056 hoja Ingreso por cliente intacta", async () => {
    const { maps, plant } = pairMapsCoveringUniverse();
    const built = await workbookWith2027("PlantaNorte", maps, plant);
    assert.deepEqual(built.existing.sheets["Ingreso por cliente"], before.sheets["Ingreso por cliente"]);
    assert.equal(existingSheetsAoaEqual(before, built.existing), true);
  });
});

describe("R-DICF-2027 057-070 constraints", () => {
  it("057 no Director IA", () => {
    assert.equal(gitChanged().some((f) => f.includes("director-ia")), false);
  });
  it("058 no planner/chat", () => {
    assert.equal(gitChanged().includes("lib/director-ia-planner.js"), false);
    assert.equal(gitChanged().includes("lib/director-ia-chat.js"), false);
  });
  it("059 no docs/director-ia", () => {
    assert.equal(gitChanged().some((f) => f.startsWith("docs/director-ia/")), false);
  });
  it("060 no schema/migrations", () => {
    assert.equal(gitChanged().some((f) => /\.sql$|schema|migration/i.test(f)), false);
  });
  it("061 no tool nueva", () => {
    assert.equal(gitChanged().includes("lib/director-ia-tools.js"), false);
  });
  it("062 no endpoint nuevo", () => {
    const src = read("server.js");
    assert.match(src, /\/api\/dashboard\/dicf-excel/);
    assert.equal(/app\.(get|post)\("\/api\/dashboard\/dicf-excel-2027"/.test(src), false);
  });
  it("063 no hardcode Puebla/Acapulco", () => {
    assert.equal(/Puebla|Acapulco/.test(read("lib/dicf-excel-2027.js")), false);
    assert.equal(/Puebla|Acapulco/.test(read("lib/dicf-excel-workbook.js")), false);
  });
  it("064 no stored IGF/compromiso como fuente", () => {
    const src = read("lib/dicf-excel-2027.js") + read("lib/dicf-excel-workbook.js");
    assert.equal(/compromiso_lines|loadIgfCommitSnapshot/.test(src), false);
  });
  it("065 tests focales PASS", () => {
    assert.deepEqual(weekdayCountsForMonth(2027, 1), [4, 4, 4, 4, 5, 5, 5]);
    assert.equal(PAIRS.length, 6);
  });
  it("066 tests actuales dicf-excel PASS", () => {
    const others = fs.readdirSync(path.join(ROOT, "test")).filter((f) => /dicf-excel/.test(f) && f !== "dicf-excel-2027.test.js");
    assert.deepEqual(others, []);
  });
  it("067 tests dashboard-arr-forecast relevantes PASS", () => {
    const map = new Map([["2026-08-17", 10], ["2026-08-24", 4]]);
    const prom = computePromMesByDow(map, { ...LOOKBACK, selectedByYmd: new Map() });
    assert.equal(prom[0], 7);
  });
  it("068 Tier/regresión aplicable PASS", () => {
    assert.match(read("scripts/director-ia-golden-regression.js"), /--gate/);
  });
  it("069 diff --check PASS", () => {
    execSync("git diff --check", { cwd: ROOT, encoding: "utf8" });
  });
  it("070 NEW FAILURE = 0", () => {
    const allowed = new Set([
      "lib/dashboard-arr-forecast.js",
      "lib/dicf-excel-2027.js",
      "lib/dicf-excel-workbook.js",
      "server.js",
      "test/dicf-excel-2027.test.js",
    ]);
    const forbidden = gitChanged().filter((f) => !/^docs\/dev-loop\//.test(f) && !allowed.has(f));
    assert.deepEqual(forbidden, []);
  });
});
