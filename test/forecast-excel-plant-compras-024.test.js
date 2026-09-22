"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const forecast = require("../lib/dashboard-arr-forecast");
const compras = require("../lib/compras-dashboard");
const { buildComprasWorkbook, appendComprasWorksheet } = require("../lib/compras-excel");
const ExcelJS = require("exceljs");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const API = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "api.ts"), "utf8");
const PAGE = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "app", "page.tsx"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const LIB = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const EXCEL = fs.readFileSync(path.join(ROOT, "lib", "compras-excel.js"), "utf8");

const FMT3 = "#,##0.000";

function text(cell) {
  const v = cell && cell.value;
  if (v == null) return "";
  if (typeof v === "object" && v.richText) return v.richText.map((x) => x.text || "").join("");
  if (typeof v === "object" && v.formula != null) return String(v.formula);
  return String(v);
}

function sheetText(ws) {
  const bits = [];
  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      bits.push(text(cell));
    });
  });
  return bits.join("\n");
}

function findLabelRow(ws, label) {
  for (let r = 1; r <= 80; r++) {
    if (ws.getCell(r, 1).value === label) return r;
  }
  return null;
}

function asPgDate(value) {
  const y = value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10);
  return new Date(`${y}T00:00:00.000Z`);
}

function fechaYmd(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10);
}

class MemClient {
  constructor() {
    this.providers = [];
    this.purchases = [];
    this.hg = [];
    this.fleteTarifas = [];
    this.seq = 1;
  }
  nextId() {
    return this.seq++;
  }
  async query(sql, params = []) {
    const q = String(sql).replace(/\s+/g, " ").trim().toLowerCase();
    if (q.startsWith("create ") || q.startsWith("create schema")) return { rows: [] };
    if (q.includes("from public.plantas") && q.includes("nombre") && !q.includes("clave")) {
      return { rows: [{ nombre: "Puebla" }] };
    }
    if (q.includes("from public.plantas")) {
      return {
        rows: [
          { id: 1, nombre: "Puebla", clave: "PUE" },
          { id: 2, nombre: "Acapulco", clave: "ACA" },
          { id: 3, nombre: "Querétaro", clave: "QRO" },
        ],
      };
    }
    if (q.includes("from arr.provincia_plants")) {
      return { rows: [{ plant_code: "Puebla" }, { plant_code: "Acapulco" }, { plant_code: "Querétaro" }] };
    }
    if (q.includes("from arr.compras_proveedores") && q.startsWith("select")) {
      let rows = this.providers.filter((p) => p.planta_id === Number(params[0]));
      if (q.includes("activo = true")) rows = rows.filter((p) => p.activo);
      rows.sort((a, b) => a.orden - b.orden || a.id - b.id);
      return { rows };
    }
    if (q.startsWith("insert into arr.compras_proveedores")) {
      const row = {
        id: this.nextId(),
        planta_id: Number(params[0]),
        nombre: params[1],
        activo: true,
        orden: Number(params[2]) || 0,
      };
      this.providers.push(row);
      return { rows: [row] };
    }
    if (q.includes("from arr.compras_hg") && q.startsWith("select")) {
      const planta = Number(params[0]);
      const start = String(params[1] || "").slice(0, 10);
      const end = String(params[2] || "").slice(0, 10);
      return {
        rows: this.hg.filter((h) => h.planta_id === planta && fechaYmd(h.fecha) >= start && fechaYmd(h.fecha) <= end),
      };
    }
    if (q.startsWith("insert into arr.compras_hg")) {
      const row = {
        id: this.nextId(),
        planta_id: Number(params[0]),
        fecha: asPgDate(params[1]),
        hg_kilos: Number(params[2]),
      };
      const prev = this.hg.find((h) => h.planta_id === row.planta_id && fechaYmd(h.fecha) === fechaYmd(row.fecha));
      if (prev) {
        prev.hg_kilos = row.hg_kilos;
        return { rows: [prev] };
      }
      this.hg.push(row);
      return { rows: [row] };
    }
    if (q.includes("from arr.compras_flete_tarifas") && q.startsWith("select")) {
      return {
        rows: this.fleteTarifas.filter(
          (t) => t.planta_id === Number(params[0]) && t.year === Number(params[1]) && t.month === Number(params[2])
        ),
      };
    }
    if (q.startsWith("insert into arr.compras_flete_tarifas")) {
      const row = {
        id: this.nextId(),
        planta_id: Number(params[0]),
        proveedor_id: Number(params[1]),
        year: Number(params[2]),
        month: Number(params[3]),
        tarifa: Number(params[4]),
      };
      const prev = this.fleteTarifas.find(
        (t) =>
          t.planta_id === row.planta_id &&
          t.proveedor_id === row.proveedor_id &&
          t.year === row.year &&
          t.month === row.month
      );
      if (prev) {
        prev.tarifa = row.tarifa;
        return { rows: [prev] };
      }
      this.fleteTarifas.push(row);
      return { rows: [row] };
    }
    if (q.includes("from arr.compras") && q.startsWith("select") && !q.includes("compras_")) {
      return {
        rows: this.purchases.filter(
          (p) =>
            p.planta_id === Number(params[0]) &&
            fechaYmd(p.fecha) >= String(params[1]).slice(0, 10) &&
            fechaYmd(p.fecha) <= String(params[2]).slice(0, 10)
        ),
      };
    }
    if (q.startsWith("insert into arr.compras ")) {
      const row = {
        id: this.nextId(),
        planta_id: Number(params[0]),
        proveedor_id: Number(params[1]),
        fecha: asPgDate(params[2]),
        kg: Number(params[3]),
        importe: Number(params[4]),
      };
      this.purchases.push(row);
      return { rows: [row] };
    }
    return { rows: [] };
  }
}

function gridPair() {
  const plants = ["Puebla", "Acapulco"];
  const ventaTonGrid = {
    plants,
    cutoffDay: 99,
    forecastByPlant: new Map([
      ["Puebla", 64.1234],
      ["Acapulco", 99],
    ]),
    byDate: [
      { day: 1, fecha: "2026-09-01", byPlant: { Puebla: 45, Acapulco: 7 }, tot: 52 },
      { day: 2, fecha: "2026-09-02", byPlant: { Puebla: 51.2, Acapulco: 8 }, tot: 59.2 },
    ],
  };
  const ventaCanal = {
    plants,
    cutoffDay: 99,
    byDate: [
      {
        day: 1,
        fecha: "2026-09-01",
        byPlant: {
          Puebla: { CASA: 45, COMISIONISTA: 12 },
          Acapulco: { CASA: 7, COMISIONISTA: 1 },
        },
      },
      {
        day: 2,
        fecha: "2026-09-02",
        byPlant: {
          Puebla: { CASA: 51.2, COMISIONISTA: 3 },
          Acapulco: { CASA: 3, COMISIONISTA: 4 },
        },
      },
    ],
  };
  const descuentoGrid = {
    plants,
    cutoffDay: 99,
    byDate: [
      { day: 1, fecha: "2026-09-01", byPlant: { Puebla: 1.5, Acapulco: 9 } },
      { day: 2, fecha: "2026-09-02", byPlant: { Puebla: 2, Acapulco: 8 } },
    ],
  };
  const descuentoCanal = {
    plants,
    cutoffDay: 99,
    byDate: [
      {
        day: 1,
        fecha: "2026-09-01",
        byPlant: {
          Puebla: { CASA: { kg: 1000, monto: -500 }, COMISIONISTA: { kg: 200, monto: -40 } },
          Acapulco: { CASA: { kg: 100, monto: -900 }, COMISIONISTA: { kg: 50, monto: -10 } },
        },
      },
      {
        day: 2,
        fecha: "2026-09-02",
        byPlant: {
          Puebla: { CASA: { kg: 800, monto: -400 }, COMISIONISTA: { kg: 100, monto: -10 } },
          Acapulco: { CASA: { kg: 10, monto: -1 }, COMISIONISTA: { kg: 10, monto: -1 } },
        },
      },
    ],
  };
  return { ventaTonGrid, ventaCanal, descuentoGrid, descuentoCanal };
}

function scopedWorkbook() {
  const g = gridPair();
  const venta = forecast.scopeProvinciaGrid(g.ventaTonGrid, "Puebla");
  const desc = forecast.scopeProvinciaGrid(g.descuentoGrid, "Puebla");
  const ventaCanal = forecast.scopeProvinciaGrid(g.ventaCanal, "Puebla");
  const descCanal = forecast.scopeProvinciaGrid(g.descuentoCanal, "Puebla");
  return forecast.renderProvinciaDiariaSheets({
    year: 2026,
    month: 9,
    compTotalKg: 3000,
    ventaTonGrid: venta,
    descuentoGrid: desc,
    ventaCanal,
    descuentoCanal: descCanal,
  });
}

describe("IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024 selector", () => {
  it("A) Todas bloquea la descarga", () => {
    assert.match(CLIENT, /if \(!plantaFilter\)/);
    assert.match(CLIENT, /Selecciona una planta para descargar el Excel Forecast\./);
    assert.match(CLIENT, /setForecastExcelMsg\("Selecciona una planta para descargar el Excel Forecast\."\)/);
  });

  it("B) Puebla envía plant_code y require_plant", () => {
    assert.match(API, /plant_code=\$\{encodeURIComponent\(plant\)\}/);
    assert.match(API, /requirePlant \? "&require_plant=1" : ""/);
    assert.match(CLIENT, /getDashboardExcelDownloadUrl\([\s\S]*plantaFilter,\s*true/);
    const plant = "GT Puebla";
    assert.match(`&plant_code=${encodeURIComponent(plant)}&require_plant=1`, /plant_code=GT%20Puebla&require_plant=1/);
  });

  it("C) Acapulco envía plant_code", () => {
    const plant = "Acapulco";
    assert.match(`&plant_code=${encodeURIComponent(plant)}`, /plant_code=Acapulco/);
    assert.match(API, /plantCode\?: string \| null/);
  });

  it("D) un solo selector Planta", () => {
    assert.equal((CLIENT.match(/<select/g) || []).length, 1);
    assert.equal((CLIENT.match(/Planta:/g) || []).length, 1);
    assert.doesNotMatch(CLIENT, /plantaExport|plantExportFilter|segundo selector/i);
  });
});

describe("IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024 filtro", () => {
  const wb = scopedWorkbook();
  const venta = wb.getWorksheet("Provincia Venta Diaria");
  const com = wb.getWorksheet("Provincia Comisiones");

  it("E) Provincia Venta Diaria solo planta seleccionada", () => {
    assert.equal(venta.getCell(1, 2).value, "Puebla");
    assert.equal(venta.getCell(1, 3).value, "Tot Provincia");
    assert.equal(venta.getCell(2, 2).value, 45);
    assert.doesNotMatch(sheetText(venta), /Acapulco/i);
  });

  it("F) Provincia Comisiones solo planta seleccionada", () => {
    assert.equal(com.getCell(1, 2).value, "Puebla");
    assert.equal(com.getCell(1, 3).value, null);
    assert.doesNotMatch(sheetText(com), /Acapulco/i);
  });

  it("G) CASA/COMISIONISTA solo planta seleccionada", () => {
    assert.equal(text(venta.getCell(1, 10)), "Puebla\nCASA");
    assert.equal(text(venta.getCell(1, 11)), "Puebla\nCOMISIONISTA");
    assert.equal(venta.getCell(1, 12).value, null);
    assert.equal(text(com.getCell(1, 10)), "Puebla\nCASA");
    assert.doesNotMatch(sheetText(venta) + sheetText(com), /Acapulco/i);
  });

  it("negativo cross-plant: fixture Puebla+Acapulco no deja Acapulco", () => {
    for (const ws of [venta, com]) {
      assert.equal(sheetText(ws).includes("Acapulco"), false);
    }
  });

  it("H–K) IGF, Pronóstico, cat-sub y demás hojas se scopean en el generador", () => {
    assert.match(LIB, /empresaMatchesForecastPlant\(r && r\.empresa, exportPlant\)/);
    assert.match(LIB, /plantsEquivalent\(p, opts\.plantCode\)/);
    assert.match(LIB, /plantCodeFilter: plantCode \|\| ""/);
    assert.match(LIB, /appendHojaClientesDescuentoMes\(client, wb, year, month, plantCode/);
    assert.match(LIB, /if \(!exportPlant \|\| plantsEquivalent\(exportPlant, "Puebla"\)\) appendHojaPueblaConsolidada/);
    assert.equal(forecast.empresaMatchesForecastPlant("GT Puebla", "Puebla"), true);
    assert.equal(forecast.empresaMatchesForecastPlant("Acapulco", "Puebla"), false);
    assert.equal(forecast.igfLabelForForecastPlant("Puebla"), "GT Puebla");
    assert.equal(forecast.igfLabelForForecastPlant("GTM Querétaro"), "GTM Queretaro");
    assert.equal(forecast.canonicalForecastPlantKey("GTM San Luis"), "San Luis");
    assert.equal(forecast.canonicalForecastPlantKey("Todas"), "");
  });
});

describe("IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024 decimales", () => {
  const wb = scopedWorkbook();
  const ws = wb.getWorksheet("Provincia Venta Diaria");

  it("L) 45 conserva valor y numFmt de 3 decimales", () => {
    const cell = ws.getCell(2, 2);
    assert.equal(cell.value, 45);
    assert.equal(cell.numFmt, FMT3);
  });

  it("M) 51.2 conserva valor y numFmt de 3 decimales", () => {
    const cell = ws.getCell(3, 2);
    assert.equal(cell.value, 51.2);
    assert.equal(cell.numFmt, FMT3);
  });

  it("N) el formato no altera el valor subyacente", () => {
    const scoped = forecast.scopeProvinciaGrid(
      {
        plants: ["Puebla", "Acapulco"],
        cutoffDay: 99,
        forecastByPlant: new Map([["Puebla", 10]]),
        byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { Puebla: 64.1234, Acapulco: 1 }, tot: 65.1234 }],
      },
      "Puebla"
    );
    const local = forecast.renderProvinciaDiariaSheets({
      year: 2026,
      month: 9,
      ventaTonGrid: scoped,
      descuentoGrid: { plants: ["Puebla"], cutoffDay: 99, byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { Puebla: 0 } }] },
    });
    const cell = local.getWorksheet("Provincia Venta Diaria").getCell(2, 2);
    assert.equal(cell.value, 64.1234);
    assert.equal(cell.numFmt, FMT3);
  });

  it("O–Q) ACUM PROM PROY y Comp en toneladas usan 3 decimales", () => {
    const acum = findLabelRow(ws, "ACUM");
    const prom = findLabelRow(ws, "PROM");
    const proy = findLabelRow(ws, "PROY");
    const comp = findLabelRow(ws, "Comp");
    assert.equal(ws.getCell(acum, 2).value, 45 + 51.2);
    assert.equal(ws.getCell(acum, 2).numFmt, FMT3);
    assert.equal(ws.getCell(prom, 2).numFmt, FMT3);
    assert.equal(typeof ws.getCell(prom, 2).value, "number");
    assert.equal(ws.getCell(proy, 2).value, 64.1234);
    assert.equal(ws.getCell(proy, 2).numFmt, FMT3);
    assert.equal(ws.getCell(comp, 3).value, 3);
    assert.equal(ws.getCell(comp, 3).numFmt, FMT3);
    assert.equal(ws.getCell(2, 10).numFmt, FMT3);
  });
});

describe("IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024 CONTROL DE COMPRAS", () => {
  let payload;
  let comprasWb;
  let forecastWb;

  it("prepara el mismo payload de Compras", async () => {
    const db = new MemClient();
    const month0 = await compras.loadMonth(db, 1, 2026, 9);
    const pemex = month0.providers.find((p) => p.nombre === "PEMEX TUXPAN");
    await compras.createPurchase(db, 1, { proveedor_id: pemex.id, fecha: "2026-09-01", kg: 1000, importe: 11095 }, 1);
    await compras.upsertFleteTarifa(db, 1, { proveedor_id: pemex.id, year: 2026, month: 9, tarifa: 1.23 }, 1);
    await compras.upsertHg(db, 1, { fecha: "2026-09-01", hg_kilos: -100 }, 1);
    payload = await compras.loadMonth(db, 1, 2026, 9);
    assert.equal(payload.year, 2026);
    assert.equal(payload.month, 9);
    comprasWb = await buildComprasWorkbook(payload, { plantName: "Puebla" });
    const g = gridPair();
    forecastWb = forecast.renderProvinciaDiariaSheets({
      year: 2026,
      month: 9,
      ventaTonGrid: forecast.scopeProvinciaGrid(g.ventaTonGrid, "Puebla"),
      descuentoGrid: forecast.scopeProvinciaGrid(g.descuentoGrid, "Puebla"),
      comprasPayload: payload,
      comprasPlantName: "Puebla",
    });
  });

  it("R–S) tercera hoja CONTROL DE COMPRAS en ese orden", () => {
    assert.equal(forecastWb.worksheets[0].name, "Provincia Venta Diaria");
    assert.equal(forecastWb.worksheets[1].name, "Provincia Comisiones");
    assert.equal(forecastWb.worksheets[2].name, "CONTROL DE COMPRAS");
  });

  it("T–Y) planta, año, mes, proveedor, HG y flete", () => {
    const ws = forecastWb.getWorksheet("CONTROL DE COMPRAS");
    assert.match(String(ws.getCell(2, 1).value), /PLANTA PUEBLA/);
    assert.equal(ws.getCell(1, 1).value, "CONTROL DE COMPRAS");
    let yearCell = null;
    let monthCell = null;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value === 2026) yearCell = cell.value;
        if (cell.value === "SEPTIEMBRE") monthCell = cell.value;
        if (cell.value === "TOTAL MES") monthCell = monthCell;
      });
    });
    assert.equal(yearCell, 2026);
    assert.equal(monthCell, "SEPTIEMBRE");
    assert.match(sheetText(ws), /PEMEX TUXPAN/);
    assert.match(sheetText(ws), /HG EN KILOS/);
    assert.match(sheetText(ws), /VALOR DEL FLETE SEGÚN ORIGEN/);
    assert.match(sheetText(ws), /TOTAL MES/);
  });

  it("Z–AA) fórmulas HG válidas y TOTAL MES", () => {
    const ws = forecastWb.getWorksheet("CONTROL DE COMPRAS");
    let costo = null;
    let importe = null;
    let total = false;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const f = cell.value && cell.value.formula ? String(cell.value.formula) : "";
        if (f.includes("+") && f.includes("*") === false && /[A-Z]+\d+/.test(f) && cell.row > 5) {
          if (!costo && f.includes("+")) costo = f;
        }
        if (/\*-1/.test(f)) importe = f;
        if (cell.value === "TOTAL MES") total = true;
        const raw = String(f || cell.value || "");
        assert.doesNotMatch(raw, /#DIV\/0|#REF|#VALUE/);
      });
    });
    assert.ok(costo);
    assert.match(importe, /\*-1/);
    assert.equal(total, true);
  });

  it("AB) la hoja Forecast equivale a la de Compras", () => {
    const a = comprasWb.getWorksheet("CONTROL DE COMPRAS");
    const b = forecastWb.getWorksheet("CONTROL DE COMPRAS");
    assert.equal(a.name, b.name);
    const maxRow = Math.max(a.rowCount, b.rowCount);
    const maxCol = Math.max(a.columnCount, b.columnCount);
    for (let r = 1; r <= maxRow; r++) {
      for (let c = 1; c <= maxCol; c++) {
        const ca = a.getCell(r, c);
        const cb = b.getCell(r, c);
        assert.deepEqual(ca.value, cb.value);
        assert.equal(ca.numFmt || "", cb.numFmt || "");
      }
    }
    assert.match(EXCEL, /async function appendComprasWorksheet/);
    assert.match(EXCEL, /await appendComprasWorksheet\(wb, payload, opts\)/);
    assert.match(LIB, /await appendComprasWorksheet\(wb, options\.comprasPayload/);
  });
});

describe("IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024 autorización", () => {
  it("resuelve GT Puebla al id de plantas y rechaza alias desconocido", async () => {
    const db = new MemClient();
    const puebla = await forecast.resolveForecastExportPlant(db, "GT Puebla");
    assert.equal(puebla.plantaId, 1);
    assert.equal(puebla.canon, "Puebla");
    assert.equal(puebla.provinciaPlantCode, "Puebla");
    const acapulco = await forecast.resolveForecastExportPlant(db, "Acapulco");
    assert.equal(acapulco.plantaId, 2);
    assert.equal(await forecast.resolveForecastExportPlant(db, "Todas"), null);
    assert.equal(await forecast.resolveForecastExportPlant(db, "Corporativo"), null);
  });

  it("el endpoint exige planta solo con require_plant, autoriza y nombra el archivo", () => {
    const start = SERVER.indexOf('app.get("/api/arr/dashboard-excel"');
    const slice = SERVER.slice(start, start + 12000);
    assert.match(slice, /if \(requirePlant && !plantCodeRaw\)/);
    assert.match(slice, /Selecciona una planta para descargar el Excel Forecast/);
    assert.match(slice, /if \(requirePlant\)/);
    assert.match(slice, /resolveForecastExportPlant/);
    assert.match(slice, /assertPlantaPermitidaDashboard\(req, resolvedPlant\.plantaId\)/);
    assert.match(slice, /status\(403\)/);
    assert.match(slice, /loadMonth\(client, resolvedPlant\.plantaId, year, month\)/);
    assert.match(slice, /Dashboard_ARR_Forecast_\$\{String\(resolvedPlant\.canon/);
    assert.match(slice, /Dashboard_ARR_Forecast_\$\{year\}_\$\{month\}\.xlsx/);
    assert.match(slice, /if \(comprasPayload && resolvedPlant\)/);
    assert.doesNotMatch(slice, /if \(!plantCodeRaw\)/);
  });
});

describe("IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024 compatibilidad KPI", () => {
  const start = SERVER.indexOf('app.get("/api/arr/dashboard-excel"');
  const slice = SERVER.slice(start, start + 12000);

  it("1) caller histórico sin plant_code no dispara el 400", () => {
    assert.match(slice, /if \(requirePlant && !plantCodeRaw\)/);
    assert.doesNotMatch(slice, /if \(!plantCodeRaw\) \{\s*return res\.status\(400\)/);
    assert.match(PAGE, /getDashboardExcelDownloadUrl\(token, igfForecast\.year, igfForecast\.month\)/);
    assert.doesNotMatch(
      PAGE.slice(PAGE.indexOf("Descargar Excel (Forecast)") - 400, PAGE.indexOf("Descargar Excel (Forecast)") + 80),
      /require_plant|plant_code/
    );
  });

  it("2) caller histórico conserva el workbook global", () => {
    assert.match(slice, /let plantCode = null/);
    assert.match(slice, /proyeccionCatSubForecast\.forecastKgByPlant = forecastKgByPlant/);
    assert.match(slice, /Dashboard_ARR_Forecast_\$\{year\}_\$\{month\}\.xlsx/);
    assert.match(slice, /generarDashboardArrForecast\(client, year, month, plantCode, forecastOpts\)/);
    const requireIdx = slice.indexOf("if (requirePlant)");
    const loadIdx = slice.indexOf("loadMonth(client, resolvedPlant.plantaId, year, month)");
    assert.ok(requireIdx >= 0 && loadIdx > requireIdx);
  });

  it("3) require_plant=1 sin planta responde 400", () => {
    assert.match(slice, /require_plant/);
    assert.match(slice, /if \(requirePlant && !plantCodeRaw\) \{\s*return res\.status\(400\)/);
  });

  it("4) require_plant con planta válida queda scoped", () => {
    assert.match(slice, /plantCode = resolvedPlant\.provinciaPlantCode \|\| resolvedPlant\.canon/);
    assert.match(slice, /plantCodeFilter = plantCode/);
    assert.match(slice, /empresaMatchesForecastPlant\(r && r\.empresa, plantCode\)/);
    assert.equal(forecast.plantsEquivalent("GT Puebla", "Puebla"), true);
  });

  it("5) CONTROL DE COMPRAS solo con planta válida", () => {
    const globalWb = scopedWorkbook();
    assert.equal(globalWb.getWorksheet("CONTROL DE COMPRAS"), undefined);
    assert.match(slice, /if \(comprasPayload && resolvedPlant\)/);
    const before = slice.indexOf("if (requirePlant)");
    const assign = slice.indexOf("comprasPayload = await comprasDashboard.loadMonth");
    assert.ok(before >= 0 && assign > before);
    assert.doesNotMatch(slice.slice(0, before), /comprasPayload = await/);
  });
});

describe("appendComprasWorksheet no duplica el renderer", () => {
  it("buildComprasWorkbook reutiliza el helper", async () => {
    const wb = new ExcelJS.Workbook();
    await appendComprasWorksheet(
      wb,
      { year: 2026, month: 9, providers: [], grid: { days: [], weeks: [], month: null } },
      { plantName: "Puebla" }
    );
    assert.equal(wb.getWorksheet("CONTROL DE COMPRAS").getCell(1, 1).value, "CONTROL DE COMPRAS");
    assert.equal((EXCEL.match(/function writeHgBlock/g) || []).length, 1);
  });
});
