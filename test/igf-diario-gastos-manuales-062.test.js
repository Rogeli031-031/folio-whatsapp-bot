"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const ROOT = path.join(__dirname, "..");
const gastos = require("../lib/igf-diario-gastos-manuales");
const igf = require("../lib/igf-diario-puebla");
const forecast = require("../lib/dashboard-arr-forecast");

const LIB = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-gastos-manuales.js"), "utf8");
const PUEBLA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-puebla.js"), "utf8");
const FORECAST = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");

function row(extra) {
  return {
    empresa: "Puebla",
    plant_code: "Puebla",
    ventaTon: 10,
    margen: 6.29,
    comDesc: 0.2,
    impuestos: 0.1,
    hgKg: -1.1,
    ingreso: 5000,
    operativos: 1000,
    corporativos: 400,
    gasto: 1400,
    utilOperImporte: 4000,
    resultadoFinalImporte: 3600,
    ...extra,
  };
}

function mini(rows) {
  const ready = rows || [row()];
  return {
    ok: true,
    year: 2026,
    month: 10,
    upload_day: "2026-10-03",
    rows: ready,
    zona: {
      empresa: "Zona Provincia",
      plant_code: null,
      ventaTon: 10,
      margen: 6.29,
      comDesc: 0.2,
      impuestos: 0.1,
      hgKg: -1.1,
      ingreso: 5000,
      operativos: 1000,
      corporativos: 400,
      gasto: 1400,
      utilOperImporte: 4000,
      resultadoFinalImporte: 3600,
    },
  };
}

function snapshot(value) {
  return JSON.parse(JSON.stringify(value));
}

function memoryClient() {
  const table = [];
  return {
    table,
    async query(sql, params = []) {
      const text = String(sql).trim();
      if (text.startsWith("CREATE TABLE")) return { rows: [] };
      if (text.startsWith("DELETE")) {
        const [plant, year, month] = params;
        for (let i = table.length - 1; i >= 0; i -= 1) {
          const item = table[i];
          if (item.plant_code === plant && Number(item.year) === Number(year) && Number(item.month) === Number(month)) {
            table.splice(i, 1);
          }
        }
        return { rows: [] };
      }
      if (text.startsWith("INSERT")) {
        const [plant, year, month, operativos, corporativos, updatedBy] = params;
        const next = {
          plant_code: plant,
          year,
          month,
          operativos,
          corporativos,
          updated_at: "2026-10-03T00:00:00.000Z",
          updated_by: updatedBy,
        };
        const idx = table.findIndex((item) => item.plant_code === plant && Number(item.year) === Number(year) && Number(item.month) === Number(month));
        if (idx >= 0) table[idx] = next;
        else table.push(next);
        return { rows: [{ ...next }] };
      }
      if (text.includes("plant_code = $1 AND year = $2 AND month = $3")) {
        const [plant, year, month] = params;
        const hit = table.find((item) => item.plant_code === plant && Number(item.year) === Number(year) && Number(item.month) === Number(month));
        return { rows: hit ? [{ ...hit }] : [] };
      }
      if (text.includes("WHERE year = $1 AND month = $2")) {
        const [year, month] = params;
        return {
          rows: table
            .filter((item) => Number(item.year) === Number(year) && Number(item.month) === Number(month))
            .map((item) => ({ ...item })),
        };
      }
      throw new Error(`SQL no simulada: ${text}`);
    },
  };
}

test("schema idempotente sin valores iniciales", () => {
  assert.match(gastos.ENSURE_SQL, /CREATE TABLE IF NOT EXISTS arr\.igf_diario_gastos_manual/);
  assert.match(gastos.ENSURE_SQL, /plant_code VARCHAR\(40\) NOT NULL/);
  assert.match(gastos.ENSURE_SQL, /year SMALLINT NOT NULL/);
  assert.match(gastos.ENSURE_SQL, /month SMALLINT NOT NULL/);
  assert.match(gastos.ENSURE_SQL, /operativos NUMERIC\(18,2\) NULL/);
  assert.match(gastos.ENSURE_SQL, /corporativos NUMERIC\(18,2\) NULL/);
  assert.match(gastos.ENSURE_SQL, /updated_at TIMESTAMPTZ NOT NULL DEFAULT now\(\)/);
  assert.match(gastos.ENSURE_SQL, /updated_by TEXT NULL/);
  assert.match(gastos.ENSURE_SQL, /PRIMARY KEY \(plant_code, year, month\)/);
  assert.doesNotMatch(gastos.ENSURE_SQL, /REFERENCES/);
  assert.doesNotMatch(LIB, /INSERT INTO arr\.igf_diario_gastos_manual[^;]*VALUES \(\s*'Puebla'/);
});

test("sin override la salida queda igual al automático", () => {
  const source = mini();
  const before = snapshot(source);
  const out = gastos.applyManualGastosToMini(source, []);
  assert.deepEqual(source, before);
  const got = out.rows[0];
  assert.equal(got.operativos, 1000);
  assert.equal(got.corporativos, 400);
  assert.equal(got.gasto, 1400);
  assert.equal(got.utilOperImporte, 4000);
  assert.equal(got.resultadoFinalImporte, 3600);
  assert.equal(got.ingreso, 5000);
  assert.equal(got.ventaTon, 10);
  assert.equal(got.margen, 6.29);
  assert.equal(got.comDesc, 0.2);
  assert.equal(got.impuestos, 0.1);
  assert.equal(got.hgKg, -1.1);
  assert.equal(got.operativosManual, false);
  assert.equal(got.corporativosManual, false);
});

test("operativos manual cambia gasto util y resultado sin tocar ingreso ni corporativos", () => {
  const out = gastos.applyManualGastosToMini(mini(), [{
    plant_code: "Puebla", year: 2026, month: 10, operativos: 2500, corporativos: null,
  }]);
  const got = out.rows[0];
  assert.equal(got.operativos, 2500);
  assert.equal(got.corporativos, 400);
  assert.equal(got.gasto, 2900);
  assert.equal(got.utilOperImporte, 2500);
  assert.equal(got.resultadoFinalImporte, 2100);
  assert.equal(got.ingreso, 5000);
  assert.equal(got.ventaTon, 10);
  assert.equal(got.margen, 6.29);
  assert.equal(out.zona.operativos, 2500);
  assert.equal(out.zona.ingreso, 5000);
});

test("corporativos manual cambia gasto y resultado sin cambiar ingreso ni utilidad operativa", () => {
  const out = gastos.applyManualGastosToMini(mini(), [{
    plant_code: "Puebla", year: 2026, month: 10, operativos: null, corporativos: 900,
  }]);
  const got = out.rows[0];
  assert.equal(got.corporativos, 900);
  assert.equal(got.operativos, 1000);
  assert.equal(got.gasto, 1900);
  assert.equal(got.utilOperImporte, 4000);
  assert.equal(got.resultadoFinalImporte, 3100);
  assert.equal(got.ingreso, 5000);
});

test("ambos campos manuales se aplican juntos", () => {
  const out = gastos.applyManualGastosToMini(mini(), [{
    plant_code: "Puebla", year: 2026, month: 10, operativos: 10, corporativos: 20,
  }]);
  const got = out.rows[0];
  assert.equal(got.operativos, 10);
  assert.equal(got.corporativos, 20);
  assert.equal(got.gasto, 30);
  assert.equal(got.utilOperImporte, 4990);
  assert.equal(got.resultadoFinalImporte, 4970);
  assert.equal(got.ingreso, 5000);
});

test("el cero manual se conserva", async () => {
  const client = memoryClient();
  const parsed = gastos.parsePatch({ year: 2026, month: 10, plant_code: "Puebla", operativos: 0 });
  const saved = await gastos.patchManual(client, parsed, "Dashboard:1");
  assert.equal(saved.row.operativos, 0);
  assert.equal(saved.row.corporativos, null);
  const listed = await gastos.listMonth(client, 2026, 10);
  assert.equal(listed[0].operativos, 0);
  const out = gastos.applyManualGastosToMini(mini(), listed);
  assert.equal(out.rows[0].operativos, 0);
  assert.equal(out.rows[0].corporativos, 400);
  assert.equal(out.rows[0].gasto, 400);
  assert.equal(gastos.effectiveExpense(0, 1000), 0);
  assert.doesNotMatch(LIB, /operativos \|\|/);
  assert.doesNotMatch(LIB, /corporativos \|\|/);
});

test("null restaura el automático y un campo no borra el otro", async () => {
  const client = memoryClient();
  await gastos.patchManual(client, gastos.parsePatch({
    year: 2026, month: 10, plant_code: "Puebla", operativos: 80, corporativos: 90,
  }), "Dashboard:1");
  const restored = await gastos.patchManual(client, gastos.parsePatch({
    year: 2026, month: 10, plant_code: "Puebla", operativos: null,
  }), "Dashboard:1");
  assert.equal(restored.deleted, false);
  assert.equal(restored.row.operativos, null);
  assert.equal(restored.row.corporativos, 90);
  const out = gastos.applyManualGastosToMini(mini(), [restored.row]);
  assert.equal(out.rows[0].operativos, 1000);
  assert.equal(out.rows[0].corporativos, 90);
  const cleared = await gastos.patchManual(client, gastos.parsePatch({
    year: 2026, month: 10, plant_code: "Puebla", corporativos: null,
  }), "Dashboard:1");
  assert.equal(cleared.deleted, true);
  assert.equal((await gastos.listMonth(client, 2026, 10)).length, 0);
});

test("el override depende de year y month, no del corte", async () => {
  const client = memoryClient();
  await gastos.patchManual(client, gastos.parsePatch({
    year: 2026, month: 10, plant_code: "Puebla", operativos: 70,
  }), "Dashboard:1");
  assert.equal(gastos.SELECT_MONTH_SQL.includes("upload_day"), false);
  assert.equal(gastos.SELECT_ONE_SQL.includes("corte"), false);
  const corteA = await gastos.listMonth(client, 2026, 10);
  const corteB = await gastos.listMonth(client, 2026, 10);
  assert.equal(corteA[0].operativos, 70);
  assert.equal(corteB[0].operativos, 70);
  assert.equal((await gastos.listMonth(client, 2026, 11)).length, 0);
  await gastos.patchManual(client, gastos.parsePatch({
    year: 2026, month: 11, plant_code: "Puebla", operativos: 5,
  }), "Dashboard:1");
  assert.equal((await gastos.listMonth(client, 2026, 10))[0].operativos, 70);
  assert.equal((await gastos.listMonth(client, 2026, 11))[0].operativos, 5);
});

test("Forecast no consume overrides y permanece igual", () => {
  const source = mini();
  const before = snapshot(source);
  const applied = forecast.applyIgfDiarioAcumuladoMini(source, {});
  assert.equal(applied.rows[0].operativos, 1000);
  assert.equal(applied.rows[0].ingreso, before.rows[0].ingreso);
  const diario = gastos.applyManualGastosToMini(source, [{
    plant_code: "Puebla", year: 2026, month: 10, operativos: 1, corporativos: 2,
  }]);
  assert.deepEqual(source, before);
  assert.equal(diario.rows[0].operativos, 1);
  const fnStart = FORECAST.indexOf("function applyIgfDiarioAcumuladoMini");
  const fn = FORECAST.slice(fnStart, FORECAST.indexOf("module.exports"));
  assert.doesNotMatch(fn, /igf_diario_gastos_manual/);
  const routeStart = SERVER.indexOf('app.get("/api/dashboard/igf-forecast"');
  const routeEnd = SERVER.indexOf('app.get("/api/dashboard/igf-forecast-mini"');
  assert.doesNotMatch(SERVER.slice(routeStart, routeEnd), /igfDiarioGastosManuales|igf_diario_gastos_manual/);
  assert.match(CLIENT, /applyManualGastosToAcumulado\(applyIgfDiarioAcumuladoMini/);
  assert.match(CLIENT, /: igfMini;/);
  const manualFn = CLIENT.slice(CLIENT.indexOf("function manualAmount"), CLIENT.indexOf("function applyManualGastosToAcumulado"));
  assert.match(manualFn, /manual != null/);
  assert.doesNotMatch(manualFn, /manual \|\|/);
});

test("Excel individual escribe M3 y T3 con el valor manual, incluido 0", () => {
  const pair = gastos.effectivePair(
    { operativos: 111, corporativos: 222 },
    [{ plant_code: "Puebla", year: 2026, month: 10, operativos: 0, corporativos: 333 }],
    ["Puebla"]
  );
  assert.equal(pair.operativos, 0);
  assert.equal(pair.corporativos, 333);
  const wb = new ExcelJS.Workbook();
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 10,
    sheetLabel: "Puebla",
    humanName: "Puebla",
    corporativos: pair.corporativos,
    operativos: pair.operativos,
    corteYmd: "2026-10-03",
  });
  const ws = wb.getWorksheet("IGF Diario Puebla");
  assert.equal(ws.getCell(3, 13).value, 333);
  assert.equal(ws.getCell(3, 21).value, 0);
  const chrome = PUEBLA.slice(PUEBLA.indexOf("function paintIgfChrome"), PUEBLA.indexOf("function fillIgfDiarioPuebla"));
  assert.match(chrome, /\[13, opts && opts\.corporativos\], \[20, opts && opts\.operativos\]/);
});

test("Excel Todas usa overrides independientes y Provincia suma las hojas", () => {
  const overrides = [
    { plant_code: "Puebla", year: 2026, month: 10, operativos: 7, corporativos: 9 },
  ];
  const puebla = gastos.effectivePair({ operativos: 10, corporativos: 20 }, overrides, ["Puebla", "GT Puebla"]);
  const acapulco = gastos.effectivePair({ operativos: 3, corporativos: 4 }, overrides, ["Acapulco"]);
  assert.deepEqual(puebla, { operativos: 7, corporativos: 9 });
  assert.deepEqual(acapulco, { operativos: 3, corporativos: 4 });
  const wb = new ExcelJS.Workbook();
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026, month: 10, sheetLabel: "Puebla", humanName: "Puebla",
    corporativos: puebla.corporativos, operativos: puebla.operativos, corteYmd: "2026-10-03",
  });
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026, month: 10, sheetLabel: "Acapulco", humanName: "Acapulco",
    corporativos: acapulco.corporativos, operativos: acapulco.operativos, corteYmd: "2026-10-03",
  });
  const sheets = ["IGF Diario Puebla", "IGF Diario Acapulco"];
  igf.fillIgfDiarioProvincia(wb, { year: 2026, month: 10, plantSheets: sheets, corteYmd: "2026-10-03" });
  assert.equal(wb.getWorksheet(sheets[0]).getCell(3, 13).value, 9);
  assert.equal(wb.getWorksheet(sheets[0]).getCell(3, 21).value, 7);
  assert.equal(wb.getWorksheet(sheets[1]).getCell(3, 13).value, 4);
  assert.equal(wb.getWorksheet(sheets[1]).getCell(3, 21).value, 3);
  const provincia = wb.getWorksheet("IGF Diario Provincia");
  const corporativos = provincia.getCell(3, 13).value.formula;
  const operativos = provincia.getCell(3, 21).value.formula;
  assert.match(corporativos, /IGF Diario Puebla'!M3/);
  assert.match(corporativos, /IGF Diario Acapulco'!M3/);
  assert.match(operativos, /IGF Diario Puebla'!U3/);
  assert.match(operativos, /IGF Diario Acapulco'!U3/);
});

test("API usa la auth financiera y el alcance de planta existente", () => {
  assert.match(SERVER, /app\.get\("\/api\/dashboard\/igf-diario-gastos-manuales", dashboardAuthMiddleware/);
  assert.match(SERVER, /app\.patch\("\/api\/dashboard\/igf-diario-gastos-manuales", dashboardAuthMiddleware/);
  const start = SERVER.indexOf('app.get("/api/dashboard/igf-diario-gastos-manuales"');
  const end = SERVER.indexOf("/** Detalle hoja Pronóstico");
  const block = SERVER.slice(start, end);
  assert.match(block, /dashboardBlockGAFinancialKpis/);
  assert.match(block, /dashboardBlockGVForbidden/);
  assert.match(block, /assertPlantaPermitidaDashboard/);
  assert.match(block, /filterIgfDiarioGastosManuales/);
  assert.equal(gastos.overrideVisible({ role: "ZP", plantas_permitidas: [] }, null), true);
  assert.equal(gastos.overrideVisible({ role: "GG", plantas_permitidas: [4] }, 4), true);
  assert.equal(gastos.overrideVisible({ role: "GG", plantas_permitidas: [4] }, 9), false);
  assert.equal(gastos.overrideVisible({ role: "GG", plantas_permitidas: [4] }, null), false);
  assert.match(CLIENT, /igfTableMode === "igf_diario" && !isZona && gastoField/);
  assert.match(CLIENT, />\s*Manual\s*</);
  assert.match(CLIENT, />\s*Auto\s*</);
  assert.match(CLIENT, />\s*Guardar\s*</);
  assert.match(SERVER, /igfDiarioGastosManuales\.effectivePair/);
});
