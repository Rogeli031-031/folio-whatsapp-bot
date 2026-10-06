"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const margen = require("../lib/igf-diario-margen-manual");
const grafica = require("../lib/igf-diario-grafica");
const igf = require("../lib/igf-diario-puebla");
const forecast = require("../lib/dashboard-arr-forecast");
const dist = require("../lib/igf-diario-gastos-distribucion");

const ROOT = path.join(__dirname, "..");
const LIB = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-margen-manual.js"), "utf8");
const GRAFICA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");

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

function fillPlant(name, extra) {
  const wb = new ExcelJS.Workbook();
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 10,
    sheetLabel: name,
    humanName: name,
    corteYmd: "2026-10-05",
    ...extra,
  });
  return wb.getWorksheet(`IGF Diario ${name}`);
}

function memoryClient(seed) {
  const state = { rows: (seed && seed.rows) ? seed.rows.map((row) => ({ ...row })) : [], creates: 0, failAt: seed && seed.failAt };
  let snapshot = null;
  let writes = 0;
  return {
    state,
    async query(sql, params = []) {
      const text = String(sql).trim();
      if (text === "BEGIN") {
        snapshot = JSON.parse(JSON.stringify(state.rows));
        return { rows: [] };
      }
      if (text === "ROLLBACK") {
        state.rows = snapshot || [];
        return { rows: [] };
      }
      if (text === "COMMIT") {
        snapshot = null;
        return { rows: [] };
      }
      if (text.startsWith("CREATE TABLE")) {
        state.creates += 1;
        return { rows: [] };
      }
      if (text.startsWith("DELETE FROM arr.igf_diario_margen_manual")) {
        state.rows = state.rows.filter((row) => !(row.plant_code === params[0] && row.year === params[1] && row.month === params[2] && row.fecha === params[3]));
        return { rows: [] };
      }
      if (text.startsWith("SELECT") && text.includes("FROM arr.igf_diario_margen_manual")) {
        return { rows: state.rows.filter((row) => row.year === params[0] && row.month === params[1]).map((row) => ({ ...row })) };
      }
      if (text.startsWith("INSERT INTO arr.igf_diario_margen_manual")) {
        writes += 1;
        if (state.failAt && writes >= state.failAt) throw new Error("fallo de escritura");
        const next = {
          plant_code: params[0], year: params[1], month: params[2], fecha: params[3],
          costo_kg: params[4], flete_kg: params[5], updated_by: params[6],
        };
        const idx = state.rows.findIndex((row) => row.plant_code === next.plant_code && row.fecha === next.fecha && row.year === next.year && row.month === next.month);
        if (idx >= 0) state.rows[idx] = next;
        else state.rows.push(next);
        return { rows: [] };
      }
      throw new Error(`SQL no simulada: ${text.slice(0, 80)}`);
    },
  };
}

function basePatch(changes) {
  return margen.parsePatch({
    year: 2026,
    month: 10,
    plant_code: "Morelos",
    upload_day: "2026-10-05",
    changes,
  });
}

test("DDL idempotente y sin seed", async () => {
  assert.match(margen.ENSURE_SQL, /CREATE TABLE IF NOT EXISTS arr\.igf_diario_margen_manual/);
  assert.match(margen.ENSURE_SQL, /costo_kg NUMERIC\(18,6\) NULL/);
  assert.match(margen.ENSURE_SQL, /flete_kg NUMERIC\(18,6\) NULL/);
  assert.match(margen.ENSURE_SQL, /PRIMARY KEY \(plant_code, year, month, fecha\)/);
  assert.doesNotMatch(margen.ENSURE_SQL, /INSERT INTO/);
  assert.doesNotMatch(LIB, /20\.06|12\.60/);
  const client = memoryClient();
  await margen.ensureTable(client);
  await margen.ensureTable(client);
  assert.equal(client.state.creates, 2);
  assert.equal(client.state.rows.length, 0);
});

test("octubre habilitado, septiembre bloqueado y corte", () => {
  assert.equal(margen.captureEnabled(2026, 10), true);
  assert.equal(margen.captureEnabled(2026, 9), false);
  assert.equal(margen.parsePatch({ year: 2026, month: 9, plant_code: "Morelos", upload_day: "2026-09-05", changes: [{ fecha: "2026-09-05", costo_kg: 1 }] }).ok, false);
  const days = [
    { fecha: "2026-10-04", precio: 20, costoKg: 10, fleteKg: 1 },
    { fecha: "2026-10-05", precio: 20, costoKg: 10, fleteKg: 1 },
    { fecha: "2026-10-06", precio: 20, costoKg: 10, fleteKg: 1 },
  ];
  const view = margen.detailFromDays(
    margen.applyMarginOverrides(days, { "2026-10-04": { costo_kg: 99 }, "2026-10-05": { costo_kg: 11 } }, "2026-10-05", 2026, 10),
    "2026-10-05",
    2026,
    10
  );
  assert.equal(view[0].editable, false);
  assert.equal(view[0].costo_kg, 10);
  assert.equal(view[0].costo_manual, false);
  assert.equal(view[1].editable, true);
  assert.equal(view[1].costo_kg, 11);
  assert.equal(view[2].editable, true);
  assert.equal(basePatch([{ fecha: "2026-10-04", costo_kg: 1 }]).ok, false);
  assert.equal(basePatch([{ fecha: "2026-11-01", costo_kg: 1 }]).ok, false);
  assert.equal(basePatch([{ fecha: "2026-10-05", costo_kg: Number.NaN }]).ok, false);
  assert.equal(basePatch([{ fecha: "2026-10-05", costo_kg: Number.POSITIVE_INFINITY }]).ok, false);
});

test("costo y flete independientes, cero, null, omitido y borrado", async () => {
  const client = memoryClient();
  const first = basePatch([{ fecha: "2026-10-05", costo_kg: 12.6 }]);
  await margen.patchMarginOverrides(client, first, "Morelos", "Dashboard:1");
  assert.equal(client.state.rows[0].costo_kg, 12.6);
  assert.equal(client.state.rows[0].flete_kg, null);
  const second = basePatch([{ fecha: "2026-10-05", flete_kg: 0 }]);
  await margen.patchMarginOverrides(client, second, "Morelos", "Dashboard:1");
  assert.equal(client.state.rows[0].costo_kg, 12.6);
  assert.equal(client.state.rows[0].flete_kg, 0);
  const zero = basePatch([{ fecha: "2026-10-06", costo_kg: 0 }]);
  await margen.patchMarginOverrides(client, zero, "Morelos", "Dashboard:1");
  assert.equal(client.state.rows.find((row) => row.fecha === "2026-10-06").costo_kg, 0);
  const restored = basePatch([{ fecha: "2026-10-05", costo_kg: null }]);
  await margen.patchMarginOverrides(client, restored, "Morelos", "Dashboard:1");
  const kept = client.state.rows.find((row) => row.fecha === "2026-10-05");
  assert.equal(kept.costo_kg, null);
  assert.equal(kept.flete_kg, 0);
  await margen.patchMarginOverrides(client, basePatch([{ fecha: "2026-10-05", flete_kg: null }]), "Morelos", "Dashboard:1");
  assert.equal(client.state.rows.some((row) => row.fecha === "2026-10-05"), false);
});

test("lote atómico y rollback", async () => {
  const ok = memoryClient();
  const batch = basePatch([
    { fecha: "2026-10-05", costo_kg: 1 },
    { fecha: "2026-10-06", flete_kg: 2 },
  ]);
  await margen.patchMarginOverrides(ok, batch, "Morelos", "Dashboard:1");
  assert.equal(ok.state.rows.length, 2);
  const bad = memoryClient({ failAt: 2 });
  await assert.rejects(() => margen.patchMarginOverrides(bad, batch, "Morelos", "Dashboard:1"));
  assert.equal(bad.state.rows.length, 0);
  const early = memoryClient({ rows: [{ plant_code: "Morelos", year: 2026, month: 10, fecha: "2026-10-05", costo_kg: 4, flete_kg: 1 }] });
  assert.equal(basePatch([{ fecha: "2026-10-04", costo_kg: 9 }, { fecha: "2026-10-05", costo_kg: 8 }]).ok, false);
  assert.equal(early.state.rows[0].costo_kg, 4);
});

test("override detrás de un corte nuevo se ignora y el margen no convierte null en cero", () => {
  const days = [{ fecha: "2026-10-05", precio: 20.06, costoKg: 12.29, fleteKg: 1.23 }];
  const ignored = margen.applyMarginOverrides(days, { "2026-10-05": { costo_kg: 12.6 } }, "2026-10-06", 2026, 10);
  assert.equal(ignored[0].costoKg, 12.29);
  assert.equal(ignored[0].costo_manual, false);
  const missing = margen.detailFromDays([{ fecha: "2026-10-05", precio: null, costoKg: 0, fleteKg: 1 }], "2026-10-05", 2026, 10);
  assert.equal(missing[0].margen_bruto, null);
  assert.equal(missing[0].costo_kg, 0);
  assert.equal(margen.margenBruto(20.06, null, 1.23), null);
  const sample = margen.margenBruto(20.06, 12.6, 1.23);
  assert.equal(Math.round(sample * 100) / 100, 6.23);
  assert.equal(Math.round(margen.margenBruto(20.06, 12.29, 1.23) * 100) / 100, 6.54);
});

test("acumulado pondera por venta, cambia con override y HG no", () => {
  const days = [
    { fecha: "2026-10-04", ventaKg: 100, precio: 20.06, costoKg: 12.29, fleteKg: 1.23, hgImporte: 10 },
    { fecha: "2026-10-05", ventaKg: 200, precio: 20.06, costoKg: 12.29, fleteKg: 1.23, hgImporte: 20 },
  ];
  const plain = grafica.buildPlantMonth({ year: 2026, month: 10, corteYmd: "2026-10-05", days, skipDay1Fallback: true });
  const edited = grafica.buildPlantMonth({
    year: 2026, month: 10, corteYmd: "2026-10-05", days, skipDay1Fallback: true,
    marginOverrides: { "2026-10-05": { costo_kg: 12.6, flete_kg: null } },
  });
  const day = edited.effective_days.find((item) => item.fecha === "2026-10-05");
  assert.equal(day.precio, 20.06);
  assert.equal(Math.round(day.margen_bruto * 100) / 100, 6.23);
  const weightedDays = ((20.06 - 12.29 - 1.23) * 100 + (20.06 - 12.6 - 1.23) * 200) / 300;
  const simpleAverage = ((20.06 - 12.29 - 1.23) + (20.06 - 12.6 - 1.23)) / 2;
  assert.equal(Math.round(edited.acumulado.margen * 10000) / 10000, Math.round(weightedDays * 10000) / 10000);
  assert.notEqual(Math.round(edited.acumulado.margen * 10000) / 10000, Math.round(simpleAverage * 10000) / 10000);
  assert.notEqual(edited.acumulado.margen, plain.acumulado.margen);
  assert.equal(edited.acumulado.hg, plain.acumulado.hg);
  const weighted = (edited.acumulado.margen * 2 + plain.acumulado.margen) / 3;
  assert.notEqual(Math.round(weighted * 10000) / 10000, Math.round(plain.acumulado.margen * 10000) / 10000);
  const other = grafica.buildPlantMonth({
    year: 2026, month: 10, corteYmd: "2026-10-05", days, skipDay1Fallback: true,
    marginOverrides: { "2026-10-05": { costo_kg: 1, flete_kg: null } },
  });
  assert.notEqual(other.acumulado.margen, edited.acumulado.margen);
});

test("Excel F y G manuales, H fórmula, histórico ignorado, Todas y Provincia", () => {
  const ws = fillPlant("Morelos", {
    marginOverrides: {
      "2026-10-04": { costo_kg: 99, flete_kg: 99 },
      "2026-10-05": { costo_kg: 12.6, flete_kg: 1.5 },
    },
  });
  const before = rowByDate(ws, 2026, 10, 4);
  const at = rowByDate(ws, 2026, 10, 5);
  assert.notEqual(ws.getCell(before, 6).value, 99);
  assert.equal(ws.getCell(at, 6).value, 12.6);
  assert.equal(ws.getCell(at, 7).value, 1.5);
  assert.match(formulaOf(ws.getCell(at, 8)), /ISNUMBER\(C\d+\),ISNUMBER\(F\d+\),ISNUMBER\(G\d+\)/);
  assert.match(formulaOf(ws.getCell(at, 8)), /C\d+-F\d+-G\d+/);
  assert.equal(typeof ws.getCell(at, 8).value, "object");
  const other = fillPlant("Queretaro", { marginOverrides: { "2026-10-05": { costo_kg: 3, flete_kg: null } } });
  const otherRow = rowByDate(other, 2026, 10, 5);
  assert.equal(other.getCell(otherRow, 6).value, 3);
  assert.notEqual(other.getCell(otherRow, 7).value, 1.5);
  const wb = new ExcelJS.Workbook();
  igf.fillIgfDiarioProvincia(wb, {
    year: 2026,
    month: 10,
    plantSheets: ["IGF Diario Morelos", "IGF Diario Queretaro"],
    corteYmd: "2026-10-05",
  });
  const provincia = wb.getWorksheet("IGF Diario Provincia");
  const prow = rowByDate(provincia, 2026, 10, 5);
  assert.match(formulaOf(provincia.getCell(prow, 6)), /IGF Diario Morelos/);
  assert.match(formulaOf(provincia.getCell(prow, 7)), /IGF Diario Queretaro/);
  assert.match(formulaOf(provincia.getCell(prow, 8)), /C\d+-F\d+-G\d+/);
  assert.doesNotMatch(formulaOf(provincia.getCell(prow, 8)), /12\.6/);
});

test("identidad Tehuacán y Querétaro, una carga y contratos intactos", () => {
  assert.equal(forecast.plantsEquivalent("Tehuacan", "Tehuacán"), true);
  assert.equal(forecast.plantsEquivalent("GTM Queretaro", "Querétaro"), true);
  const rows = [
    { plant_code: "Tehuacán", fecha: "2026-10-05", costo_kg: 4, flete_kg: null },
    { plant_code: "GTM Querétaro", fecha: "2026-10-05", costo_kg: null, flete_kg: 2 },
  ];
  assert.equal(margen.overridesForPlant(rows, ["Tehuacan"]).get("2026-10-05").costo_kg, 4);
  assert.equal(margen.overridesForPlant(rows, ["Queretaro"]).get("2026-10-05").flete_kg, 2);
  assert.equal(margen.overridesForPlant(rows, ["Morelos"]).size, 0);
  const fn = GRAFICA.slice(GRAFICA.indexOf("async function loadIgfDiarioAcumulado"), GRAFICA.indexOf("async function loadMarginDetail"));
  const loop = fn.indexOf("for (const plant");
  const load = fn.indexOf("listMonthOverrides");
  assert.ok(load > 0 && load < loop);
  assert.equal(fn.split("listMonthOverrides").length, 2);
  assert.match(CLIENT, /fetchPronosticoDetalle/);
  assert.match(CLIENT, /Margen diario —/);
  assert.match(CLIENT, /igfTableMode === "igf_diario" && !isZona && c.key === "margen"/);
  assert.match(SERVER, /\/api\/dashboard\/igf-diario-margen-diario/);
  assert.match(SERVER, /assertPlantaPermitidaDashboard/);
  const built = dist.buildExpenseDailySchedule({
    monthlyAmount: 953777.33,
    days: Array.from({ length: 27 }, (_, i) => ({ fecha: `2026-10-${String(i + 1).padStart(2, "0")}`, inhabil: false })),
    overrides: {},
  });
  assert.equal(built.initial_average, 35325.09);
  assert.equal(igf.finiteMetric(null), null);
  assert.equal(igf.finiteMetric(0), 0);
});
