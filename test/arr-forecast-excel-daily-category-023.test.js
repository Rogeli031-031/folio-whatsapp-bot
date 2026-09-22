"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const forecast = require("../lib/dashboard-arr-forecast");

const SRC = fs.readFileSync(path.join(__dirname, "..", "lib", "dashboard-arr-forecast.js"), "utf8");
const PLANTS = ["ACAPULCO", "MORELOS", "PUEBLA", "QUERETARO", "SAN LUIS", "TEHUACAN"];

function ymd(day) {
  return `2026-09-${String(day).padStart(2, "0")}`;
}

function ventaTonGrid(cutoffDay, dayValues) {
  const lastDay = 30;
  const byDate = [];
  for (let d = 1; d <= lastDay; d++) {
    const byPlant = {};
    for (const p of PLANTS) byPlant[p] = dayValues && dayValues(p, d) != null ? dayValues(p, d) : 0;
    byDate.push({ day: d, fecha: ymd(d), byPlant, tot: 0 });
  }
  return { plants: PLANTS, byDate, forecastByPlant: new Map(PLANTS.map((p) => [p, 10])), cutoffDay };
}

function ventaCanal(cutoffDay, spec) {
  const byDate = [];
  for (let d = 1; d <= 30; d++) {
    const byPlant = {};
    for (const p of PLANTS) {
      const hit = spec && spec(p, d);
      byPlant[p] = { CASA: hit ? hit.casa : 0, COMISIONISTA: hit ? hit.com : 0 };
    }
    byDate.push({ day: d, fecha: ymd(d), byPlant });
  }
  return { plants: PLANTS, byDate, cutoffDay, unclassifiedKg: 0 };
}

function descGrid() {
  const byDate = [];
  for (let d = 1; d <= 30; d++) {
    const byPlant = {};
    for (const p of PLANTS) byPlant[p] = 1.5;
    byDate.push({ day: d, fecha: ymd(d), byPlant });
  }
  return { plants: PLANTS, byDate, cutoffDay: 31 };
}

function descCanal(spec, cutoffDay) {
  const byDate = [];
  for (let d = 1; d <= 30; d++) {
    const byPlant = {};
    for (const p of PLANTS) {
      const hit = spec(p, d) || {};
      byPlant[p] = {
        CASA: { kg: hit.casaKg || 0, monto: hit.casaMonto || 0 },
        COMISIONISTA: { kg: hit.comKg || 0, monto: hit.comMonto || 0 },
      };
    }
    byDate.push({ day: d, fecha: ymd(d), byPlant });
  }
  return { plants: PLANTS, byDate, cutoffDay: cutoffDay || 31 };
}

function sheets(opts) {
  return forecast.renderProvinciaDiariaSheets({
    year: 2026,
    month: 9,
    compTotalKg: 1000,
    ventaTonGrid: opts.ventaTonGrid,
    descuentoGrid: opts.descuentoGrid,
    ventaCanal: opts.ventaCanal,
    descuentoCanal: opts.descuentoCanal,
  });
}

function text(cell) {
  const v = cell.value;
  if (v && typeof v === "object" && Array.isArray(v.richText)) return v.richText.map((x) => x.text || "").join("");
  return v == null ? "" : String(v);
}

describe("IMPL-ARR-FORECAST-EXCEL-DAILY-CATEGORY-023 venta", () => {
  const wb = sheets({
    ventaTonGrid: ventaTonGrid(2, (p, d) => (p === "ACAPULCO" && d === 1 ? 165.35 : 0)),
    ventaCanal: ventaCanal(2, (p, d) => {
      if (d === 1 && p === "ACAPULCO") return { casa: 45, com: 120.35 };
      if (d === 1 && p === "MORELOS") return { casa: 7, com: 8 };
      if (d === 2 && p === "ACAPULCO") return { casa: 99, com: 88 };
      return null;
    }),
    descuentoGrid: descGrid(),
    descuentoCanal: descCanal(() => ({})),
  });
  const ws = wb.getWorksheet("Provincia Venta Diaria");

  it("A) A-H Provincia Venta Diaria siguen intactas", () => {
    assert.equal(ws.getCell(1, 1).value, "DÍA");
    assert.equal(ws.getCell(1, 2).value, "ACAPULCO");
    assert.equal(ws.getCell(1, 7).value, "TEHUACAN");
    assert.equal(ws.getCell(1, 8).value, "Tot Provincia");
    assert.equal(ws.getCell(2, 1).value, 1);
    assert.equal(ws.getCell(2, 2).value, 165.35);
    assert.equal(ws.getCell(2, 8).value, 165.35);
  });

  it("B) I vacía", () => {
    assert.equal(ws.getCell(1, 9).value, null);
    assert.equal(ws.getCell(2, 9).value, null);
    assert.equal(ws.getColumn(9).width, 4);
  });

  it("C) J+ inicia desglose", () => {
    assert.equal(text(ws.getCell(1, 10)), "ACAPULCO\nCASA");
    assert.equal(text(ws.getCell(1, 11)), "ACAPULCO\nCOMISIONISTA");
  });

  it("D) cada planta tiene CASA + COMISIONISTA", () => {
    PLANTS.forEach((p, i) => {
      assert.equal(text(ws.getCell(1, 10 + i * 2)), `${p}\nCASA`);
      assert.equal(text(ws.getCell(1, 11 + i * 2)), `${p}\nCOMISIONISTA`);
    });
  });

  it("E) Acapulco CASA diario correcto", () => {
    assert.equal(ws.getCell(2, 10).value, 45);
  });

  it("F) Acapulco COMISIONISTA diario correcto", () => {
    assert.equal(ws.getCell(2, 11).value, 120.35);
  });

  it("G) otra planta CASA correcta", () => {
    assert.equal(ws.getCell(2, 12).value, 7);
  });

  it("H) otra planta COMISIONISTA correcta", () => {
    assert.equal(ws.getCell(2, 13).value, 8);
  });

  it("K) día posterior al corte no expone dato real", () => {
    assert.equal(ws.getCell(3, 10).value, 0);
    assert.equal(ws.getCell(3, 11).value, 0);
  });

  it("L) ACUM CASA correcto", () => {
    let acumRow = null;
    for (let r = 1; r <= 40; r++) if (ws.getCell(r, 1).value === "ACUM") acumRow = r;
    assert.equal(ws.getCell(acumRow, 10).value, 45);
  });

  it("M) ACUM COMISIONISTA correcto", () => {
    let acumRow = null;
    for (let r = 1; r <= 40; r++) if (ws.getCell(r, 1).value === "ACUM") acumRow = r;
    assert.equal(ws.getCell(acumRow, 11).value, 120.35);
  });

  it("N) orden de plantas igual al bloque actual", () => {
    PLANTS.forEach((p, i) => {
      assert.equal(ws.getCell(1, 2 + i).value, p);
      assert.equal(text(ws.getCell(1, 10 + i * 2)).startsWith(p), true);
    });
  });

  it("PROY / Comp / Dif Comp del bloque nuevo quedan vacíos", () => {
    for (const label of ["PROY", "Comp", "Dif Comp"]) {
      let row = null;
      for (let r = 1; r <= 45; r++) if (ws.getCell(r, 1).value === label) row = r;
      assert.ok(row);
      assert.equal(ws.getCell(row, 10).value, null);
      assert.equal(ws.getCell(row, 11).value, null);
    }
  });
});

describe("IMPL-ARR-FORECAST-EXCEL-DAILY-CATEGORY-023 toneladas y canal", () => {
  it("I) kg / 1000 = toneladas", async () => {
    const client = {
      async query() {
        return { rows: [{ plant_code: "ACAPULCO", fecha: "2026-09-01", canal: "Casa", kg: 45000 }] };
      },
    };
    const grid = await forecast.getVentaDiariaPorCanalGrid(client, 2026, 9, "", PLANTS, 31);
    assert.equal(grid.byDate[0].byPlant.ACAPULCO.CASA, 45);
  });

  it("J) canal desconocido no se asigna a CASA", () => {
    const out = forecast.aggregateVentaDiariaPorCanal(
      [
        { plant_code: "ACAPULCO", fecha: "2026-09-01", canal: "Casa", kg: 1000 },
        { plant_code: "ACAPULCO", fecha: "2026-09-01", canal: "OTRO", kg: 5000 },
        { plant_code: "ACAPULCO", fecha: "2026-09-01", canal: null, kg: 700 },
      ],
      PLANTS
    );
    assert.equal(out.byFecha.get("2026-09-01").ACAPULCO.CASA, 1000);
    assert.equal(out.byFecha.get("2026-09-01").ACAPULCO.COMISIONISTA, 0);
    assert.equal(out.unclassifiedKg, 5700);
  });

  it("canonicaliza solo CASA y COMISIONISTA", () => {
    assert.equal(forecast.canonicalArrCanal(" casa "), "CASA");
    assert.equal(forecast.canonicalArrCanal("Comisionista"), "COMISIONISTA");
    assert.equal(forecast.canonicalArrCanal("COMISIÓNISTA"), "COMISIONISTA");
    assert.equal(forecast.canonicalArrCanal("CASA NORTE"), null);
  });
});

describe("IMPL-ARR-FORECAST-EXCEL-DAILY-CATEGORY-023 descuento", () => {
  const wb = sheets({
    ventaTonGrid: ventaTonGrid(31, () => 100),
    ventaCanal: ventaCanal(31, () => ({ casa: 0, com: 0 })),
    descuentoGrid: Object.assign(descGrid(), { cutoffDay: 3 }),
    descuentoCanal: descCanal((p, d) => {
      if (p === "ACAPULCO" && d === 1) return { casaKg: 40000, casaMonto: -200000, comKg: 60000, comMonto: -180000 };
      if (p === "MORELOS" && d === 1) return { casaKg: 10000, casaMonto: -10000 };
      if (p === "MORELOS" && d === 2) return { casaKg: 1000, casaMonto: -5000 };
      if (p === "PUEBLA" && d === 1) return { casaKg: 0, casaMonto: -100, comKg: 10, comMonto: 0 };
      if (p === "QUERETARO" && d === 3) return { casaKg: 8000, casaMonto: -4000 };
      return {};
    }, 3),
  });
  const ws = wb.getWorksheet("Provincia Comisiones");

  it("O) A-H Provincia Comisiones intactas", () => {
    assert.equal(ws.getCell(1, 1).value, "DÍA");
    assert.equal(ws.getCell(1, 2).value, "ACAPULCO");
    assert.equal(ws.getCell(1, 7).value, "TEHUACAN");
    assert.equal(ws.getCell(1, 8).value, null);
    assert.equal(ws.getCell(2, 2).value, 1.5);
  });

  it("P) I vacía", () => {
    assert.equal(ws.getCell(1, 9).value, null);
    assert.equal(ws.getCell(2, 9).value, null);
  });

  it("Q) J+ mismo orden planta/categoría", () => {
    PLANTS.forEach((p, i) => {
      assert.equal(text(ws.getCell(1, 10 + i * 2)), `${p}\nCASA`);
      assert.equal(text(ws.getCell(1, 11 + i * 2)), `${p}\nCOMISIONISTA`);
    });
  });

  it("R) CASA descuento = monto CASA / kg CASA", () => {
    assert.equal(ws.getCell(2, 10).value, 5);
  });

  it("S) COMISIONISTA descuento = monto COMISIONISTA / kg COMISIONISTA", () => {
    assert.equal(ws.getCell(2, 11).value, 3);
  });

  it("T) usa ABS para presentación", () => {
    assert.equal(forecast.descuentoCategoriaRate(40000, -200000), 5);
    assert.equal(ws.getCell(2, 10).value, 5);
  });

  it("U) no usa promedio simple", () => {
    let acumRow = null;
    for (let r = 1; r <= 40; r++) if (ws.getCell(r, 1).value === "ACUM") acumRow = r;
    const simple = (1 + 5) / 2;
    const weighted = 15000 / 11000;
    assert.ok(Math.abs(ws.getCell(acumRow, 12).value - weighted) < 1e-9);
    assert.notEqual(ws.getCell(acumRow, 12).value, simple);
  });

  it("V) kg 0 → vacío", () => {
    assert.equal(ws.getCell(2, 14).value, null);
    assert.equal(forecast.descuentoCategoriaRate(0, -100), null);
  });

  it("W) kg > 0 + monto 0 → 0 real", () => {
    assert.equal(ws.getCell(2, 15).value, 0);
  });

  it("Y) ACUM categórico ponderado correcto", () => {
    assert.equal(forecast.acumDescuentoPonderado([{ kg: 10000, monto: -10000 }, { kg: 1000, monto: -5000 }]), 15000 / 11000);
  });

  it("Z) cutoff aplicado", () => {
    assert.equal(ws.getCell(4, 16).value, 0);
  });
});

describe("IMPL-ARR-FORECAST-EXCEL-DAILY-CATEGORY-023 clasificación", () => {
  it("X) categoría desconocida no cae en CASA", () => {
    const out = forecast.aggregateDescuentoDiarioPorCanal(
      [{ plant_code: "ACAPULCO", fecha: "2026-09-01", canal: null, kg: 900 }],
      [{ plant_code: "ACAPULCO", fecha: "2026-09-01", canal: null, monto: -50 }],
      PLANTS
    );
    assert.equal(out.byFecha.has("2026-09-01"), false);
    assert.equal(out.unclassifiedKg, 900);
    assert.equal(out.unclassifiedMonto, -50);
    const fn = SRC.slice(SRC.indexOf("async function getDescuentoDiarioPorCanalGrid"), SRC.indexOf("function renderProvinciaDiariaSheets"));
    assert.match(fn, /cliente_categoria_mes/);
    assert.doesNotMatch(fn, /COALESCE\s*\(\s*c\.canal/i);
    assert.match(fn, /ventas_diarias_cliente/);
  });

  it("reconciliación planta A día 1", () => {
    const venta = forecast.aggregateVentaDiariaPorCanal(
      [
        { plant_code: "ACAPULCO", fecha: "2026-09-01", canal: "CASA", kg: 40000 },
        { plant_code: "ACAPULCO", fecha: "2026-09-01", canal: "COMISIONISTA", kg: 60000 },
      ],
      PLANTS
    );
    const rec = venta.byFecha.get("2026-09-01").ACAPULCO;
    assert.equal(rec.CASA / 1000, 40);
    assert.equal(rec.COMISIONISTA / 1000, 60);
    assert.equal(forecast.descuentoCategoriaRate(40000, -200000), 5);
    assert.equal(forecast.descuentoCategoriaRate(60000, -180000), 3);
  });
});
