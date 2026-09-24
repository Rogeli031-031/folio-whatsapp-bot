"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const ExcelJS = require("exceljs");

const forecast = require("../lib/dashboard-arr-forecast");

const START = "2026-09-01";
const NEXT = "2026-10-01";

function storeClient(rows) {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params: params.slice() });
      const codes = new Set();
      if (String(sql).includes("plant_code IN")) {
        codes.add(params[0]);
        codes.add(params[3]);
      } else {
        codes.add(params[0]);
      }
      return { rows: rows.filter((row) => codes.has(row.plant_code)) };
    },
  };
  return { client, calls };
}

function dayRows(code, from, to, price) {
  const rows = [];
  for (let day = from; day <= to; day += 1) {
    const fecha = `2026-09-${String(day).padStart(2, "0")}`;
    rows.push({ plant_code: code, fecha, precio: price(day) });
  }
  return rows;
}

test("código sin acento lee solo el par con acento de la misma planta", async () => {
  const rows = [
    ...dayRows("Querétaro", 1, 23, (day) => String(10 + day / 100)),
    ...dayRows("Tehuacán", 1, 23, () => "77.1"),
    ...dayRows("Puebla", 1, 23, () => "1.5"),
  ];
  const q = storeClient(rows);
  const loaded = await forecast.loadPrecioDiario(q.client, "Queretaro", 2026, 9);
  assert.equal(loaded.length, 23);
  assert.equal(loaded[0].fecha, "2026-09-01");
  assert.equal(loaded[0].precio, 10.01);
  assert.equal(loaded[22].precio, 10.23);
  assert.equal(loaded.some((row) => row.precio === 77.1), false);
  assert.deepEqual(q.calls[0].params, ["Queretaro", START, NEXT, "Querétaro"]);
  assert.match(q.calls[0].sql, /plant_code IN \(\$1, \$4\)/);
  assert.match(q.calls[0].sql, /fecha >= \$2::date/);
  assert.match(q.calls[0].sql, /fecha < \$3::date/);
  assert.equal(q.calls[0].sql.includes("LIKE"), false);
  assert.equal(q.calls[0].sql.includes("unaccent"), false);

  const t = storeClient(rows);
  const tehuacan = await forecast.loadPrecioDiario(t.client, "Tehuacan", 2026, 9);
  assert.equal(tehuacan.length, 23);
  assert.equal(tehuacan[0].precio, 77.1);
  assert.equal(tehuacan.some((row) => row.precio === 10.01), false);
  assert.deepEqual(t.calls[0].params, ["Tehuacan", START, NEXT, "Tehuacán"]);
});

test("el código exacto con datos no toma el otro par", async () => {
  const rows = dayRows("Queretaro", 1, 3, () => "4.5");
  const { client, calls } = storeClient(rows);
  const loaded = await forecast.loadPrecioDiario(client, "Queretaro", 2026, 9);
  assert.deepEqual(loaded.map((row) => row.precio), [4.5, 4.5, 4.5]);
  assert.deepEqual(calls[0].params, ["Queretaro", START, NEXT, "Querétaro"]);

  const accented = storeClient(dayRows("Tehuacán", 8, 8, () => "8.25"));
  const one = await forecast.loadPrecioDiario(accented.client, "Tehuacán", 2026, 9);
  assert.deepEqual(one, [{ fecha: "2026-09-08", precio: 8.25 }]);
  assert.deepEqual(accented.calls[0].params, ["Tehuacán", START, NEXT, "Tehuacan"]);
});

test("si coexisten, gana el precio válido del código exacto y no se duplica la fecha", async () => {
  const rows = [
    { plant_code: "Queretaro", fecha: "2026-09-02", precio: "11.1" },
    { plant_code: "Querétaro", fecha: "2026-09-02", precio: "22.2" },
    { plant_code: "Querétaro", fecha: "2026-09-03", precio: "33.3" },
    { plant_code: "Queretaro", fecha: "2026-09-04", precio: "0" },
    { plant_code: "Querétaro", fecha: "2026-09-04", precio: "44.4" },
    { plant_code: "Tehuacán", fecha: "2026-09-02", precio: "99" },
  ];
  const { client } = storeClient(rows);
  const loaded = await forecast.loadPrecioDiario(client, "Queretaro", 2026, 9);
  assert.deepEqual(loaded, [
    { fecha: "2026-09-02", precio: 11.1 },
    { fecha: "2026-09-03", precio: 33.3 },
    { fecha: "2026-09-04", precio: 44.4 },
  ]);

  const reverse = storeClient(rows);
  const fromAccent = await forecast.loadPrecioDiario(reverse.client, "Querétaro", 2026, 9);
  assert.equal(fromAccent.find((row) => row.fecha === "2026-09-02").precio, 22.2);
});

test("sin registros de ninguno de los dos códigos el resultado queda vacío", async () => {
  const { client, calls } = storeClient(dayRows("Puebla", 1, 5, () => "1"));
  const loaded = await forecast.loadPrecioDiario(client, "Tehuacan", 2026, 9);
  assert.deepEqual(loaded, []);
  assert.deepEqual(calls[0].params, ["Tehuacan", START, NEXT, "Tehuacán"]);
});

test("Puebla y una cuarta planta conservan la consulta de un solo código", async () => {
  const rows = [
    ...dayRows("Puebla", 1, 2, () => "1.25"),
    ...dayRows("Acapulco", 1, 1, () => "9.5"),
    ...dayRows("Querétaro", 1, 23, () => "10"),
    ...dayRows("Tehuacán", 1, 23, () => "20"),
  ];
  const puebla = storeClient(rows);
  const pueblaRows = await forecast.loadPrecioDiario(puebla.client, "Puebla", 2026, 9);
  assert.deepEqual(pueblaRows.map((row) => row.precio), [1.25, 1.25]);
  assert.match(puebla.calls[0].sql, /plant_code = \$1/);
  assert.equal(puebla.calls[0].sql.includes("IN"), false);
  assert.deepEqual(puebla.calls[0].params, ["Puebla", START, NEXT]);

  const toluca = storeClient(rows);
  const tolucaRows = await forecast.loadPrecioDiario(toluca.client, "Toluca", 2026, 9);
  assert.deepEqual(tolucaRows, []);
  assert.match(toluca.calls[0].sql, /plant_code = \$1/);
  assert.deepEqual(toluca.calls[0].params, ["Toluca", START, NEXT]);
});

test("la hoja arrastra huecos posteriores y deja vacíos los días previos", async () => {
  const rows = [
    { plant_code: "Querétaro", fecha: "2026-09-08", precio: "12.34567891" },
    { plant_code: "Querétaro", fecha: "2026-09-10", precio: null },
    { plant_code: "Querétaro", fecha: "2026-09-12", precio: "13.5" },
  ];
  const { client } = storeClient(rows);
  const loaded = await forecast.loadPrecioDiario(client, "Queretaro", 2026, 9);
  const wb = forecast.appendPrecioWorksheet(new ExcelJS.Workbook(), 2026, 9, loaded);
  assert.equal(wb.getCell(2, 2).value, null);
  assert.equal(wb.getCell(8, 2).value, null);
  assert.equal(wb.getCell(9, 2).value, 12.34567891);
  assert.equal(wb.getCell(9, 2).numFmt, "0.00000000");
  assert.equal(wb.getCell(11, 2).value, 12.34567891);
  assert.equal(wb.getCell(13, 2).value, 13.5);
  assert.equal(wb.getCell(31, 2).value, 13.5);
  assert.equal(wb.name, "PRECIO");
});
