"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const margen = require("../lib/igf-diario-margen-manual");
const grafica = require("../lib/igf-diario-grafica");
const igf = require("../lib/igf-diario-puebla");
const rangos = require("../frontend-dashboard/lib/igf-margen-rangos");
const dist = require("../lib/igf-diario-gastos-distribucion");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const GRAFICA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");
const LIB = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-margen-manual.js"), "utf8");

function formulaOf(cell) {
  const value = cell && cell.value;
  return value && typeof value === "object" && value.formula ? value.formula : "";
}

function rowByDate(ws, year, month, day) {
  for (let r = 1; r <= Math.max(ws.rowCount || 0, 80); r += 1) {
    const value = ws.getCell(r, 1).value;
    if (value instanceof Date && value.getUTCFullYear() === year && value.getUTCMonth() + 1 === month && value.getUTCDate() === day) return r;
  }
  return null;
}

function memoryClient(seed) {
  const state = { rows: (seed && seed.rows) ? seed.rows.map((row) => ({ ...row })) : [], sql: [] };
  let snapshot = null;
  let writes = 0;
  return {
    state,
    async query(sql, params = []) {
      const text = String(sql).trim();
      state.sql.push(text);
      if (text === "BEGIN") {
        snapshot = JSON.parse(JSON.stringify(state.rows));
        return { rows: [] };
      }
      if (text === "ROLLBACK") {
        state.rows = snapshot || [];
        return { rows: [] };
      }
      if (text === "COMMIT") return { rows: [] };
      if (text.startsWith("CREATE TABLE") || text.startsWith("ALTER TABLE")) return { rows: [] };
      if (text.startsWith("DELETE FROM arr.igf_diario_margen_manual")) {
        state.rows = state.rows.filter((row) => !(row.plant_code === params[0] && row.year === params[1] && row.month === params[2] && row.fecha === params[3]));
        return { rows: [] };
      }
      if (text.startsWith("SELECT")) {
        return { rows: state.rows.filter((row) => row.year === params[0] && row.month === params[1]).map((row) => ({ ...row })) };
      }
      if (text.startsWith("INSERT")) {
        writes += 1;
        if (seed && seed.failAt && writes >= seed.failAt) throw new Error("fallo de escritura");
        const next = {
          plant_code: params[0], year: params[1], month: params[2], fecha: params[3],
          costo_kg: params[4], flete_kg: params[5], precio: params[7], updated_by: params[6],
        };
        const idx = state.rows.findIndex((row) => row.plant_code === next.plant_code && row.fecha === next.fecha);
        if (idx >= 0) state.rows[idx] = next;
        else state.rows.push(next);
        return { rows: [] };
      }
      throw new Error(text.slice(0, 40));
    },
  };
}

function patch(changes) {
  return margen.parsePatch({ year: 2026, month: 10, plant_code: "Morelos", upload_day: "2026-10-05", changes });
}

function octoberDays() {
  return Array.from({ length: 31 }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return {
      fecha: `2026-10-${day}`,
      editable: index + 1 >= 5,
      precio: 20,
      costo: 12,
      flete: 1,
      precioAutomatico: 20,
      costoAutomatico: 12,
      fleteAutomatico: 1,
      precioRestore: false,
      costoRestore: false,
      fleteRestore: false,
      precioText: "20.00",
      costoText: "12.00",
      fleteText: "1.00",
    };
  });
}

function at(days, fecha) {
  return days.find((day) => day.fecha === fecha);
}

test("DDL agrega precio sin tocar filas y el CREATE nuevo lo incluye", async () => {
  assert.match(margen.ENSURE_SQL, /precio NUMERIC\(18,6\) NULL/);
  assert.match(margen.ALTER_PRECIO_SQL, /ADD COLUMN IF NOT EXISTS precio NUMERIC\(18,6\) NULL/);
  assert.doesNotMatch(margen.ENSURE_SQL, /INSERT INTO/);
  assert.doesNotMatch(margen.ALTER_PRECIO_SQL, /UPDATE |INSERT /);
  const existing = { plant_code: "Morelos", year: 2026, month: 10, fecha: "2026-10-05", costo_kg: 12.6, flete_kg: 1.23, precio: null };
  const client = memoryClient({ rows: [existing] });
  await margen.ensureTable(client);
  await margen.ensureTable(client);
  assert.equal(client.state.sql.filter((sql) => sql.startsWith("CREATE TABLE")).length, 2);
  assert.equal(client.state.sql.filter((sql) => sql.startsWith("ALTER TABLE")).length, 2);
  assert.deepEqual(client.state.rows[0], existing);
});

test("precio manual, corte, cero, null, omitido y borrado de los tres", async () => {
  const client = memoryClient({ rows: [{ plant_code: "Morelos", year: 2026, month: 10, fecha: "2026-10-05", costo_kg: 12.6, flete_kg: 1.23, precio: null }] });
  assert.equal(patch([{ fecha: "2026-10-04", precio: 20 }]).ok, false);
  await margen.patchMarginOverrides(client, patch([{ fecha: "2026-10-05", precio: 20.1 }]), "Morelos", "Dashboard:1");
  assert.equal(client.state.rows[0].precio, 20.1);
  assert.equal(client.state.rows[0].costo_kg, 12.6);
  assert.equal(client.state.rows[0].flete_kg, 1.23);
  await margen.patchMarginOverrides(client, patch([{ fecha: "2026-10-06", precio: 0 }]), "Morelos", "Dashboard:1");
  assert.equal(client.state.rows.find((row) => row.fecha === "2026-10-06").precio, 0);
  await margen.patchMarginOverrides(client, patch([{ fecha: "2026-10-05", precio: null }]), "Morelos", "Dashboard:1");
  const restored = client.state.rows.find((row) => row.fecha === "2026-10-05");
  assert.equal(restored.precio, null);
  assert.equal(restored.costo_kg, 12.6);
  await margen.patchMarginOverrides(client, patch([{ fecha: "2026-10-05", costo_kg: 11 }]), "Morelos", "Dashboard:1");
  assert.equal(client.state.rows.find((row) => row.fecha === "2026-10-05").precio, null);
  assert.equal(client.state.rows.find((row) => row.fecha === "2026-10-05").costo_kg, 11);
  await margen.patchMarginOverrides(client, patch([{ fecha: "2026-10-05", costo_kg: null, flete_kg: null }]), "Morelos", "Dashboard:1");
  assert.equal(client.state.rows.some((row) => row.fecha === "2026-10-05"), false);
  const ignored = margen.applyMarginOverrides(
    [{ fecha: "2026-10-05", precio: 18, costoKg: 10, fleteKg: 1 }],
    { "2026-10-05": { precio: 20.1 } },
    "2026-10-06",
    2026,
    10
  );
  assert.equal(ignored[0].precio, 18);
  assert.equal(ignored[0].precio_manual, false);
});

test("GET y PATCH de precio, lote y margen efectivo", async () => {
  const applied = margen.applyMarginOverrides(
    [{ fecha: "2026-10-08", precio: 19, costoKg: 12, fleteKg: 1 }],
    { "2026-10-08": { precio: 20.1, costo_kg: 12.55, flete_kg: 1.27 } },
    "2026-10-05",
    2026,
    10
  );
  const view = margen.detailFromDays(applied, "2026-10-05", 2026, 10)[0];
  assert.equal(view.precio, 20.1);
  assert.equal(view.precio_automatico, 19);
  assert.equal(view.precio_manual, true);
  assert.equal(Math.round(view.margen_bruto * 100) / 100, 6.28);
  assert.equal(margen.margenBruto(null, 0, 1), null);
  const parsed = patch([
    { fecha: "2026-10-08", precio: 20.1 },
    { fecha: "2026-10-09", costo_kg: 12.55, flete_kg: 1.27 },
  ]);
  assert.equal(parsed.ok, true);
  const ok = memoryClient();
  await margen.patchMarginOverrides(ok, parsed, "Morelos", "Dashboard:1");
  assert.equal(ok.state.rows.length, 2);
  const bad = memoryClient({ failAt: 2 });
  await assert.rejects(() => margen.patchMarginOverrides(bad, parsed, "Morelos", "Dashboard:1"));
  assert.equal(bad.state.rows.length, 0);
});

test("listado vertical, tres rangos y overlaps", () => {
  const headers = CLIENT.slice(CLIENT.indexOf('["FECHA", "PRECIO", "COSTO KG", "FLETE KG", "MARGEN BRUTO"]'));
  assert.match(headers, /\["FECHA", "PRECIO", "COSTO KG", "FLETE KG", "MARGEN BRUTO"\]/);
  assert.match(CLIENT, /overflow-y-auto/);
  assert.match(CLIENT, /ranges: emptyMargenRanges\(\)/);
  assert.equal(CLIENT.split("Aplicar al rango").length - 1, 1);
  assert.match(CLIENT, /PRECIO \(C\)/);
  assert.match(CLIENT, /COSTO KG \(F\)/);
  assert.match(CLIENT, /FLETE KG \(G\)/);
  assert.doesNotMatch(LIB, /20\.10|12\.55|6\.28/);
  const spec = { corte: "2026-10-05", year: 2026, month: 10 };
  let days = octoberDays();
  const precio = rangos.applyDraftField(days, { ...spec, field: "precio", desde: "2026-10-05", hasta: "2026-10-10", value: 20.1 });
  const costo = rangos.applyDraftField(precio.days, { ...spec, field: "costo_kg", desde: "2026-10-08", hasta: "2026-10-15", value: 12.55 });
  const flete = rangos.applyDraftField(costo.days, { ...spec, field: "flete_kg", desde: "2026-10-05", hasta: "2026-10-31", value: 1.27 });
  days = flete.days;
  assert.deepEqual(precio.fechas, ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"]);
  assert.equal(at(days, "2026-10-08").precio, 20.1);
  assert.equal(at(days, "2026-10-08").costo, 12.55);
  assert.equal(at(days, "2026-10-08").flete, 1.27);
  assert.equal(Math.round((20.1 - 12.55 - 1.27) * 100) / 100, 6.28);
  assert.equal(at(days, "2026-10-11").precio, 20);
  assert.equal(at(days, "2026-10-11").costo, 12.55);
  assert.equal(at(days, "2026-10-11").flete, 1.27);
  assert.equal(rangos.validateMargenRange({ ...spec, desde: "2026-10-04", hasta: "2026-10-10" }).ok, false);
  assert.equal(rangos.validateMargenRange({ ...spec, desde: "2026-10-12", hasta: "2026-10-10" }).ok, false);
  assert.equal(rangos.validateMargenRange({ ...spec, desde: "2026-11-01", hasta: "2026-11-02" }).ok, false);
  assert.ok(rangos.calendarDates("2026-10-10", "2026-10-12").includes("2026-10-11"));
  const first = rangos.applyDraftField(octoberDays(), { ...spec, field: "costo_kg", desde: "2026-10-05", hasta: "2026-10-20", value: 12.5 });
  const second = rangos.applyDraftField(first.days, { ...spec, field: "costo_kg", desde: "2026-10-10", hasta: "2026-10-12", value: 12.8 });
  assert.equal(at(second.days, "2026-10-09").costo, 12.5);
  assert.equal(at(second.days, "2026-10-10").costo, 12.8);
  assert.equal(at(second.days, "2026-10-13").costo, 12.5);
  assert.equal(at(second.days, "2026-10-10").precio, 20);
  const manual = second.days.map((day) => day.fecha === "2026-10-10" ? { ...day, costo: 9, costoRestore: false } : day);
  assert.equal(at(manual, "2026-10-10").costo, 9);
  const again = rangos.applyDraftField(manual, { ...spec, field: "costo_kg", desde: "2026-10-10", hasta: "2026-10-10", value: 12.8 });
  assert.equal(at(again.days, "2026-10-10").costo, 12.8);
  const restored = rangos.applyDraftField(days, { ...spec, field: "precio", desde: "2026-10-05", hasta: "2026-10-10", restore: true });
  assert.equal(at(restored.days, "2026-10-08").precioRestore, true);
  assert.equal(at(restored.days, "2026-10-08").precio, 20);
  assert.equal(at(restored.days, "2026-10-08").costo, 12.55);
  assert.equal(at(restored.days, "2026-10-08").flete, 1.27);
  const restoredCosto = rangos.applyDraftField(days, { ...spec, field: "costo_kg", desde: "2026-10-08", hasta: "2026-10-08", restore: true });
  assert.equal(at(restoredCosto.days, "2026-10-08").costo, 12);
  assert.equal(at(restoredCosto.days, "2026-10-08").precio, 20.1);
  assert.equal(at(restoredCosto.days, "2026-10-08").flete, 1.27);
  const restoredFlete = rangos.applyDraftField(days, { ...spec, field: "flete_kg", desde: "2026-10-08", hasta: "2026-10-08", restore: true });
  assert.equal(at(restoredFlete.days, "2026-10-08").flete, 1);
  assert.equal(at(restoredFlete.days, "2026-10-08").precio, 20.1);
  assert.equal(at(restoredFlete.days, "2026-10-08").costo, 12.55);
  assert.equal(rangos.formatManualDisplay(12.2902229).split(".")[1].length <= 6, true);
  assert.equal(rangos.formatManualDisplay(12.5), "12.50");
});

test("Excel C manual, F/G de 065, H fórmula, Todas y Provincia", () => {
  const wb = new ExcelJS.Workbook();
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026, month: 10, sheetLabel: "Morelos", humanName: "Morelos", corteYmd: "2026-10-05",
    marginOverrides: { "2026-10-04": { precio: 99 }, "2026-10-05": { precio: 20.1, costo_kg: 12.55, flete_kg: 1.27 } },
  });
  const ws = wb.getWorksheet("IGF Diario Morelos");
  const before = rowByDate(ws, 2026, 10, 4);
  const atRow = rowByDate(ws, 2026, 10, 5);
  assert.notEqual(ws.getCell(before, 3).value, 99);
  assert.equal(ws.getCell(atRow, 3).value, 20.1);
  assert.equal(ws.getCell(atRow, 6).value, 12.55);
  assert.equal(ws.getCell(atRow, 7).value, 1.27);
  assert.match(formulaOf(ws.getCell(atRow, 8)), /C\d+-F\d+-G\d+/);
  assert.equal(typeof ws.getCell(atRow, 8).value, "object");
  const otherBook = new ExcelJS.Workbook();
  igf.fillIgfDiarioPuebla(otherBook, {
    year: 2026, month: 10, sheetLabel: "Queretaro", humanName: "Queretaro", corteYmd: "2026-10-05",
    marginOverrides: { "2026-10-05": { precio: 18 } },
  });
  const other = otherBook.getWorksheet("IGF Diario Queretaro");
  assert.equal(other.getCell(rowByDate(other, 2026, 10, 5), 3).value, 18);
  const provinceBook = new ExcelJS.Workbook();
  igf.fillIgfDiarioProvincia(provinceBook, {
    year: 2026, month: 10, plantSheets: ["IGF Diario Morelos", "IGF Diario Queretaro"], corteYmd: "2026-10-05",
  });
  const provincia = provinceBook.getWorksheet("IGF Diario Provincia");
  const prow = rowByDate(provincia, 2026, 10, 5);
  assert.match(formulaOf(provincia.getCell(prow, 4)), /IGF Diario Morelos/);
  assert.match(formulaOf(provincia.getCell(prow, 3)), /D\d+\/B\d+/);
  assert.match(formulaOf(provincia.getCell(prow, 6)), /IGF Diario Queretaro/);
  assert.match(formulaOf(provincia.getCell(prow, 7)), /IGF Diario Morelos/);
  assert.match(formulaOf(provincia.getCell(prow, 8)), /C\d+-F\d+-G\d+/);
  assert.notEqual(provincia.getCell(prow, 3).value, 20.1);
});

test("acumulado ponderado con precio manual, HG, una carga y contratos", () => {
  const days = [
    { fecha: "2026-10-05", ventaKg: 100, precio: 20, costoKg: 10, fleteKg: 1, hgImporte: 10 },
    { fecha: "2026-10-06", ventaKg: 300, precio: 20, costoKg: 10, fleteKg: 1, hgImporte: 30 },
  ];
  const plain = grafica.buildPlantMonth({ year: 2026, month: 10, corteYmd: "2026-10-05", days, skipDay1Fallback: true });
  const edited = grafica.buildPlantMonth({
    year: 2026, month: 10, corteYmd: "2026-10-05", days, skipDay1Fallback: true,
    marginOverrides: { "2026-10-05": { precio: 22, costo_kg: null, flete_kg: null } },
  });
  const weighted = ((22 - 10 - 1) * 100 + (20 - 10 - 1) * 300) / 400;
  assert.equal(Math.round(edited.acumulado.margen * 10000) / 10000, Math.round(weighted * 10000) / 10000);
  assert.notEqual(edited.acumulado.margen, plain.acumulado.margen);
  assert.equal(edited.acumulado.hg, plain.acumulado.hg);
  const fn = GRAFICA.slice(GRAFICA.indexOf("async function loadIgfDiarioAcumulado"), GRAFICA.indexOf("async function loadMarginDetail"));
  assert.ok(fn.indexOf("listMonthOverrides") < fn.indexOf("for (const plant"));
  assert.equal(fn.split("listMonthOverrides").length, 2);
  assert.match(margen.SELECT_MONTH_SQL || LIB, /precio/);
  assert.match(CLIENT, /fetchPronosticoDetalle/);
  assert.equal(igf.finiteMetric(null), null);
  assert.equal(igf.finiteMetric(0), 0);
  const built = dist.buildExpenseDailySchedule({
    monthlyAmount: 953777.33,
    days: Array.from({ length: 27 }, (_, i) => ({ fecha: `2026-10-${String(i + 1).padStart(2, "0")}`, inhabil: false })),
    overrides: {},
  });
  assert.equal(built.initial_average, 35325.09);
});
