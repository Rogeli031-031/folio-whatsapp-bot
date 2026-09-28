"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const insights = require("../lib/igf-diario-daily-insights");
const igf = require("../lib/igf-diario-puebla");
const { normNombre } = require("../lib/cliente-contacto");
const { computeDailySalesDeviationFromRows } = require("../lib/director-ia-daily-deviation");
const { computeDailyDiscountDeviationFromRows } = require("../lib/director-ia-daily-discount");

const TODAY = "2026-09-28";
const CORTE = "2026-09-28";
const ROOT = path.join(__dirname, "..");

function sale(fecha, cliente, kg) {
  return { fecha, cliente_norm: cliente, canal: "CASA", subcanal: "", kg };
}

function discount(fecha, cliente, monto) {
  return { fecha, cliente_norm: cliente, monto };
}

function contactMap(plantaId, cliente, fields) {
  const map = new Map();
  map.set(`${plantaId}\t${normNombre(cliente)}`, {
    nombre_contacto: fields.nombre_contacto || "",
    telefono: fields.telefono || "",
    correo: fields.correo || "",
  });
  return map;
}

function plantBundle(over) {
  return {
    plantaId: over.plantaId,
    plantaNombre: over.plantLabel,
    plantLabel: over.plantLabel,
    salesRows: over.salesRows || [],
    discountRows: over.discountRows || [],
    contactsByNorm: over.contactsByNorm || new Map(),
    queryCount: 0,
  };
}

function baseOpts(over) {
  return {
    year: 2026,
    month: 9,
    corteYmd: CORTE,
    todayYmd: TODAY,
    ...over,
  };
}

function totalsDataset() {
  const salesRows = [];
  const discountRows = [];
  for (const fecha of ["2026-09-13", "2026-09-20"]) {
    salesRows.push(sale(fecha, "PLANTA", 30000));
    discountRows.push(discount(fecha, "PLANTA", 19500));
  }
  salesRows.push(sale("2026-09-27", "PLANTA", 25000));
  discountRows.push(discount("2026-09-27", "PLANTA", 17750));
  return { salesRows, discountRows };
}

function clientDataset() {
  const salesRows = [];
  for (const fecha of ["2026-09-13", "2026-09-20"]) {
    salesRows.push(sale(fecha, "ESTABLE", 10000));
    salesRows.push(sale(fecha, "TORTILLERIA ERICK", 1800));
    salesRows.push(sale(fecha, "CLIENTE X", 2000));
  }
  salesRows.push(sale("2026-09-27", "ESTABLE", 10000));
  salesRows.push(sale("2026-09-27", "CLIENTE X", 800));
  return salesRows;
}

function rowFor(ws, ymd) {
  for (let r = 6; r < 80; r += 1) {
    const value = ws.getCell(r, 1).value;
    if (value instanceof Date && value.toISOString().slice(0, 10) === ymd) return r;
  }
  return null;
}

function textAt(ws, ymd, col) {
  const row = rowFor(ws, ymd);
  assert.ok(row, ymd);
  const value = ws.getCell(row, col).value;
  return value == null ? "" : String(value);
}

test("fecha 27 queda en su fila y 28 queda vacío con corte 28", () => {
  const data = totalsDataset();
  const map = insights.buildPlantInsightMap(plantBundle({
    plantaId: 1,
    plantLabel: "Puebla",
    salesRows: data.salesRows,
    discountRows: data.discountRows,
  }), baseOpts());
  assert.equal(map.eligibleEnd, "2026-09-27");
  assert.ok(map.byDate["2026-09-27"].comentario);
  assert.equal(map.byDate["2026-09-28"], undefined);
  const wb = new ExcelJS.Workbook();
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: CORTE,
    sheetLabel: "Puebla",
    humanName: "Puebla",
    dailyInsights: map,
  });
  assert.match(textAt(ws, "2026-09-27", 34), /Venta:/);
  assert.equal(textAt(ws, "2026-09-28", 34), "");
  assert.equal(textAt(ws, "2026-09-28", 35), "");
  for (let r = 6; r < 80; r += 1) {
    const label = ws.getCell(r, 1).value;
    if (label === "TOTAL MES" || (typeof label === "string" && label.startsWith("Semana"))) {
      assert.equal(ws.getCell(r, 34).value || "", "");
      assert.equal(ws.getCell(r, 35).value || "", "");
    }
  }
});

test("AH usa la venta y el descuento del motor, sin recalcular la referencia", () => {
  const data = totalsDataset();
  const map = insights.buildPlantInsightMap(plantBundle({
    plantaId: 1,
    plantLabel: "Puebla",
    salesRows: data.salesRows,
    discountRows: data.discountRows,
  }), baseOpts());
  const sales = computeDailySalesDeviationFromRows(data.salesRows, { todayYmd: TODAY, targetDate: "2026-09-27" });
  const discountComputed = computeDailyDiscountDeviationFromRows(data.discountRows, data.salesRows, {
    todayYmd: TODAY,
    targetDate: "2026-09-27",
  });
  const text = map.byDate["2026-09-27"].comentario;
  assert.equal(sales.detection.target_sales_kg, 25000);
  assert.equal(sales.detection.reference_sales_kg, 30000);
  assert.equal(sales.detection.deviation_kg, -5000);
  assert.equal(discountComputed.detection.target_ratio, 0.71);
  assert.equal(discountComputed.detection.reference_ratio, 0.65);
  assert.equal(discountComputed.detection.delta_ratio, 0.06);
  assert.match(text, /Venta: 25,000 kg vs ref 30,000 kg \(-5,000 kg;/);
  assert.match(text, /Desc\.: \$0\.71\/kg vs ref \$0\.65\/kg \(\+\$0\.06\)\./);
});

test("clientes negativos, contacto completo, parcial y no capturado", () => {
  const contacts = contactMap(1, "TORTILLERIA ERICK", {
    nombre_contacto: "Jesús Laynes Pérez",
    telefono: "2231126169",
    correo: "rafael@example.com",
  });
  contacts.set(`1\t${normNombre("SOLO TEL")}`, { nombre_contacto: "", telefono: "2220001111", correo: "" });
  const salesRows = clientDataset();
  salesRows.push(sale("2026-09-13", "SOLO TEL", 900));
  salesRows.push(sale("2026-09-20", "SOLO TEL", 900));
  const map = insights.buildPlantInsightMap(plantBundle({
    plantaId: 1,
    plantLabel: "Puebla",
    salesRows,
    contactsByNorm: contacts,
  }), baseOpts());
  const text = map.byDate["2026-09-27"].comentario;
  assert.match(text, /TORTILLERIA ERICK: dejó de comprar \(0 vs 1,800 kg ref\)\. Llamar y recuperar\. Contacto: Jesús Laynes Pérez \| 2231126169 \| rafael@example\.com/);
  assert.match(text, /CLIENTE X: bajó 1,200 kg \(800 vs 2,000 kg ref\)\. Llamar y recuperar\. Contacto: no capturado\./);
  assert.match(text, /SOLO TEL: dejó de comprar \(0 vs 900 kg ref\)\. Llamar y recuperar\. Contacto: 2220001111/);
  assert.doesNotMatch(text, /SOLO TEL:.*\|/);
});

test("cliente nuevo solo en su primera fecha, y no si el mes anterior tuvo kg", () => {
  const salesRows = [
    sale("2026-09-17", "TORTILLERIA ERICK", 500),
    sale("2026-09-17", "TORTILLERIA ERICK", 350),
    sale("2026-09-20", "TORTILLERIA ERICK", 400),
    sale("2026-08-04", "RESTAURANTE VIEJO", 100),
    sale("2026-09-17", "RESTAURANTE VIEJO", 850),
  ];
  const map = insights.buildPlantInsightMap(plantBundle({
    plantaId: 1,
    plantLabel: "Puebla",
    salesRows,
  }), baseOpts());
  assert.equal(map.byDate["2026-09-17"].ventas, "NUEVO: TORTILLERIA ERICK — 850 kg");
  assert.equal((map.byDate["2026-09-20"] && map.byDate["2026-09-20"].ventas) || "", "");
  for (const cell of Object.values(map.byDate)) {
    assert.doesNotMatch(cell.ventas || "", /RESTAURANTE VIEJO/);
  }
});

test("cruce enero toma diciembre anterior y no repite compras posteriores", () => {
  const salesRows = [
    sale("2026-01-03", "CLIENTE ENERO", 500),
    sale("2026-01-10", "CLIENTE ENERO", 200),
  ];
  const map = insights.buildPlantInsightMap(plantBundle({
    plantaId: 1,
    plantLabel: "Puebla",
    salesRows,
  }), { year: 2026, month: 1, todayYmd: TODAY, corteYmd: "" });
  assert.equal(map.byDate["2026-01-03"].ventas, "NUEVO: CLIENTE ENERO — 500 kg");
  assert.equal((map.byDate["2026-01-10"] && map.byDate["2026-01-10"].ventas) || "", "");
});

test("Provincia no fusiona homónimos y une clientes nuevos por planta", () => {
  const pueblaSales = [
    sale("2026-08-12", "CLIENTE UNO", 100),
  ];
  const acapulcoSales = [
    sale("2026-08-12", "CLIENTE UNO", 100),
  ];
  for (const fecha of ["2026-09-13", "2026-09-20"]) {
    pueblaSales.push(sale(fecha, "CLIENTE UNO", 1000));
    acapulcoSales.push(sale(fecha, "CLIENTE UNO", 2000));
  }
  pueblaSales.push(sale("2026-09-17", "TORTILLERIA NUEVA", 1850));
  acapulcoSales.push(sale("2026-09-17", "RESTAURANTE XYZ", 620));
  acapulcoSales.push(sale("2026-09-27", "CLIENTE UNO", 500));
  const tehuacanSales = [sale("2026-09-17", "CLIENTE B", 400)];
  const pueblaContacts = contactMap(1, "CLIENTE UNO", {
    nombre_contacto: "Contacto Puebla",
    telefono: "111",
    correo: "puebla@example.com",
  });
  const acapulcoContacts = contactMap(2, "CLIENTE UNO", {
    nombre_contacto: "Contacto Acapulco",
    telefono: "222",
    correo: "acapulco@example.com",
  });
  const bundles = [
    plantBundle({ plantaId: 1, plantLabel: "Puebla", salesRows: pueblaSales, contactsByNorm: pueblaContacts }),
    plantBundle({ plantaId: 2, plantLabel: "Acapulco", salesRows: acapulcoSales, contactsByNorm: acapulcoContacts }),
    plantBundle({ plantaId: 3, plantLabel: "Tehuacán", salesRows: tehuacanSales }),
  ];
  const map = insights.buildProvinceInsightMap(bundles, baseOpts());
  const comment = map.byDate["2026-09-27"].comentario;
  assert.match(comment, /Puebla · CLIENTE UNO: dejó de comprar \(0 vs 1,000 kg ref\)\. Llamar y recuperar\. Contacto: Contacto Puebla \| 111 \| puebla@example\.com/);
  assert.match(comment, /Acapulco · CLIENTE UNO: bajó 1,500 kg \(500 vs 2,000 kg ref\)\. Llamar y recuperar\. Contacto: Contacto Acapulco \| 222 \| acapulco@example\.com/);
  assert.equal((comment.match(/CLIENTE UNO/g) || []).length, 2);
  const ventas = map.byDate["2026-09-17"].ventas.split("\n");
  assert.deepEqual(ventas, [
    "Acapulco · RESTAURANTE XYZ — 620 kg",
    "Puebla · TORTILLERIA NUEVA — 1,850 kg",
    "Tehuacán · CLIENTE B — 400 kg",
  ]);
});

test("AH y AI visibles, AJ y AK ocultas, y el carry amarillo usa AJ/AK", () => {
  const wb = new ExcelJS.Workbook();
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.getCell(1, 8).value = "Puebla\nCASA";
  venta.getCell(1, 9).value = "Puebla\nCOMISIONISTA";
  wb.addWorksheet("Provincia Comisiones");
  const precio = wb.addWorksheet("PRECIO");
  const compras = wb.addWorksheet("CONTROL DE COMPRAS");
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  compras.getCell(4, 36).value = "CONSOLIDADO";
  compras.getCell(5, 36).value = "TARIFA";
  for (let day = 1; day <= 30; day += 1) {
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 8).value = 1;
    venta.getCell(day + 1, 9).value = 1;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    precio.getCell(day + 1, 2).value = 19;
    const row = day + 5;
    compras.getCell(row, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    if (day === 18) {
      compras.getCell(row, 15).value = 12;
      compras.getCell(row, 36).value = 1;
    }
  }
  const data = totalsDataset();
  const map = insights.buildPlantInsightMap(plantBundle({
    plantaId: 1,
    plantLabel: "Puebla",
    salesRows: data.salesRows,
    discountRows: data.discountRows,
  }), baseOpts());
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: CORTE,
    dailyInsights: map,
  });
  assert.equal(ws.getCell(5, 34).value, "COMENTARIO DEL DIA");
  assert.equal(ws.getCell(5, 35).value, "VENTAS");
  assert.equal(ws.getColumn(34).hidden, false);
  assert.equal(ws.getColumn(35).hidden, false);
  assert.equal(ws.getColumn(36).hidden, true);
  assert.equal(ws.getColumn(37).hidden, true);
  const commentRow = rowFor(ws, "2026-09-27");
  const comment = ws.getCell(commentRow, 34);
  assert.equal(comment.alignment.wrapText, true);
  assert.equal(comment.alignment.vertical, "top");
  assert.ok(ws.getRow(commentRow).height <= 140);
  assert.equal(ws.getCell(commentRow, 35).value || "", "");
  assert.notEqual(ws.getCell(commentRow, 35).value, 0);
  assert.notEqual(ws.getCell(commentRow, 35).value, 1);
  const helperRow = 28;
  const costoHelper = ws.getCell(helperRow, 36).value;
  const fleteHelper = ws.getCell(helperRow, 37).value;
  assert.match(String(costoHelper && costoHelper.formula), /CONTROL DE COMPRAS/);
  assert.match(String(fleteHelper && fleteHelper.formula), /CONTROL DE COMPRAS/);
  assert.equal((ws.getCell(helperRow, 35).value && ws.getCell(helperRow, 35).value.formula) || "", "");
  const rules = ws.conditionalFormattings || [];
  assert.equal(rules.find((item) => item.ref === "F28").rules[0].formulae[0], "AND(ISNUMBER(F28),AJ28=1)");
  assert.equal(rules.find((item) => item.ref === "G28").rules[0].formulae[0], "AND(ISNUMBER(G28),AK28=1)");
});

test("Puebla individual y Puebla dentro de Todas escriben el mismo AH y AI", () => {
  const data = totalsDataset();
  const bundle = plantBundle({
    plantaId: 1,
    plantLabel: "Puebla",
    salesRows: data.salesRows,
    discountRows: data.discountRows,
  });
  const once = insights.buildPlantInsightMap(bundle, baseOpts());
  const twice = insights.buildPlantInsightMap(bundle, baseOpts());
  assert.deepEqual(once.byDate, twice.byDate);
  const left = igf.fillIgfDiarioPuebla(new ExcelJS.Workbook(), {
    year: 2026,
    month: 9,
    corteYmd: CORTE,
    sheetLabel: "Puebla",
    humanName: "Puebla",
    dailyInsights: once,
  });
  const right = igf.fillIgfDiarioPuebla(new ExcelJS.Workbook(), {
    year: 2026,
    month: 9,
    corteYmd: CORTE,
    sheetLabel: "Puebla",
    humanName: "Puebla",
    dailyInsights: twice,
  });
  for (let day = 1; day <= 30; day += 1) {
    const ymd = `2026-09-${String(day).padStart(2, "0")}`;
    assert.equal(textAt(left, ymd, 34), textAt(right, ymd, 34), ymd);
    assert.equal(textAt(left, ymd, 35), textAt(right, ymd, 35), ymd);
  }
});

test("precarga tres consultas por planta y Provincia reutiliza los datasets", async () => {
  const sqls = [];
  const client = {
    async query(sql) {
      sqls.push(String(sql));
      if (String(sql).includes("cliente_contactos")) {
        throw new Error("relation arr.cliente_contactos does not exist");
      }
      return { rows: [] };
    },
  };
  const opts = baseOpts();
  const puebla = await insights.loadPlantDailyInsights(client, {
    ...opts,
    plantaId: 1,
    plantaNombre: "Puebla",
    plantLabel: "Puebla",
  });
  const acapulco = await insights.loadPlantDailyInsights(client, {
    ...opts,
    plantaId: 2,
    plantaNombre: "Acapulco",
    plantLabel: "Acapulco",
  });
  assert.equal(puebla.queryCount, insights.QUERIES_PER_PLANT);
  assert.equal(acapulco.queryCount, insights.QUERIES_PER_PLANT);
  assert.equal(sqls.length, 6);
  assert.equal(sqls.filter((sql) => sql.includes("arr.ventas_diarias_cliente")).length, 2);
  assert.equal(sqls.filter((sql) => sql.includes("arr.descuentos_diarios_cliente")).length, 2);
  assert.equal(sqls.filter((sql) => sql.includes("arr.cliente_contactos")).length, 2);
  assert.ok(sqls.every((sql) => sql.includes("prov_map") || sql.includes("cliente_contactos")));
  const before = sqls.length;
  const province = insights.buildProvinceInsightMap([puebla, acapulco], opts);
  assert.equal(sqls.length, before);
  assert.equal(province.queryCount, 0);
  assert.equal(puebla.byDate["2026-09-27"], undefined);
});

test("el export no llama OpenAI, no hace HTTP de Director IA y no escribe en BD", () => {
  const source = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-daily-insights.js"), "utf8");
  const server = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
  const start = server.indexOf('app.get("/api/arr/dashboard-excel"');
  const handler = server.slice(start, server.indexOf('app.get("/api/dashboard/igf-versiones"'));
  assert.doesNotMatch(source, /openaiDirectorIaChat|\/director-ia\/chat|ensureClienteContactosTable|\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE)\b/);
  assert.doesNotMatch(handler, /openaiDirectorIaChat|\/director-ia\/chat|ensureClienteContactosTable/);
  const gate = handler.indexOf("igfDiarioTodasRequestBlock(req)");
  const connect = handler.indexOf("pool.connect()");
  const permission = handler.indexOf("assertPlantaPermitidaDashboard");
  const firstLoad = handler.indexOf("loadPlantDailyInsights");
  const plantList = handler.indexOf("listIgfDiarioProvinciaPlants");
  const secondLoad = handler.indexOf("loadPlantDailyInsights", firstLoad + 1);
  assert.ok(gate >= 0 && gate < connect);
  assert.ok(connect < permission && permission < firstLoad);
  assert.ok(plantList < secondLoad);
  assert.match(handler, /if \(requirePlant\)/);
  assert.match(handler, /if \(!requirePlant && igfDiarioTodas\)/);
  assert.match(source, /computeDailySalesDeviationFromRows/);
  assert.match(source, /computeDailyDiscountDeviationFromRows/);
});
