"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const ROOT = path.join(__dirname, "..");
const layout = require("../lib/igf-diario-expense-layout");
const desglose = require("../lib/igf-diario-gastos-desglose");
const igf = require("../lib/igf-diario-puebla");
const forecast = require("../lib/dashboard-arr-forecast");
const dist = require("../lib/igf-diario-gastos-distribucion");

const LIB = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-gastos-desglose.js"), "utf8");
const EXCEL = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-expense-excel.js"), "utf8");
const PUEBLA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-puebla.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const UI_LAYOUT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "igf-expense-layout.ts"), "utf8");
const FORECAST = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");

function formulaOf(cell) {
  const value = cell && cell.value;
  return value && typeof value === "object" && value.formula ? value.formula : "";
}

function rowByDate(ws, year, month, day) {
  for (let r = 1; r <= Math.max(ws.rowCount || 0, 80); r += 1) {
    const value = ws.getCell(r, 1).value;
    if (value instanceof Date && value.getUTCFullYear() === year && value.getUTCMonth() + 1 === month && value.getUTCDate() === day) {
      return r;
    }
  }
  return null;
}

function rowByLabel(ws, label) {
  for (let r = 1; r <= Math.max(ws.rowCount || 0, 80); r += 1) {
    if (ws.getCell(r, 1).value === label) return r;
  }
  return null;
}

function fillPlant(year, month, extra) {
  const wb = new ExcelJS.Workbook();
  const name = (extra && extra.sheetLabel) || "Morelos";
  igf.fillIgfDiarioPuebla(wb, {
    year,
    month,
    sheetLabel: name,
    humanName: name,
    corteYmd: `${year}-${String(month).padStart(2, "0")}-05`,
    ...extra,
  });
  return wb.getWorksheet(`IGF Diario ${name}`);
}

function corpBody(extra) {
  return {
    year: 2026,
    month: 10,
    plant_code: "Morelos",
    group: "corporativos",
    gasto_corporativo: 10.1,
    inversiones: 20.2,
    impuestos_federales: 30.3,
    ...extra,
  };
}

function operBody(extra) {
  return {
    year: 2026,
    month: 10,
    plant_code: "Morelos",
    group: "operativos",
    presupuesto_nomina_gastos: 1,
    presupuesto_imss_sua: 2,
    extraordinarios: 3,
    provisiones_planta: 4,
    ...extra,
  };
}

function txClient(options) {
  const opts = options || {};
  const state = { desglose: [], manual: [] };
  let snapshot = null;
  return {
    state,
    async query(sql, params = []) {
      const text = String(sql).trim();
      if (text === "BEGIN") {
        snapshot = JSON.parse(JSON.stringify(state));
        return { rows: [] };
      }
      if (text === "ROLLBACK") {
        state.desglose = snapshot ? snapshot.desglose : [];
        state.manual = snapshot ? snapshot.manual : [];
        return { rows: [] };
      }
      if (text === "COMMIT") {
        snapshot = null;
        return { rows: [] };
      }
      if (text.startsWith("CREATE TABLE")) return { rows: [] };
      if (opts.failManual && text.includes("INSERT INTO arr.igf_diario_gastos_manual")) {
        throw new Error("fallo de sync");
      }
      if (text.startsWith("INSERT INTO arr.igf_diario_gastos_desglose")) {
        const plant = params[0];
        const year = params[1];
        const month = params[2];
        let row = state.desglose.find((item) => item.plant_code === plant && item.year === year && item.month === month);
        if (!row) {
          row = { plant_code: plant, year, month, updated_by: null };
          state.desglose.push(row);
        }
        if (text.includes("gasto_corporativo, inversiones, impuestos_federales, updated_at")) {
          row.gasto_corporativo = params[3];
          row.inversiones = params[4];
          row.impuestos_federales = params[5];
          row.updated_by = params[6];
        } else {
          row.presupuesto_nomina_gastos = params[3];
          row.presupuesto_imss_sua = params[4];
          row.extraordinarios = params[5];
          row.provisiones_planta = params[6];
          row.updated_by = params[7];
        }
        return { rows: [{ ...row }] };
      }
      if (text.includes("FROM arr.igf_diario_gastos_manual") && text.includes("plant_code = $1")) {
        const hit = state.manual.find((item) => item.plant_code === params[0] && item.year === params[1] && item.month === params[2]);
        return { rows: hit ? [{ ...hit }] : [] };
      }
      if (text.includes("FROM arr.igf_diario_gastos_desglose") && text.includes("WHERE year = $1")) {
        return {
          rows: state.desglose.filter((item) => item.year === params[0] && item.month === params[1]).map((item) => ({ ...item })),
        };
      }
      if (text.includes("arr.igf_diario_gastos_distribucion_manual")) return { rows: [] };
      if (text.startsWith("INSERT INTO arr.igf_diario_gastos_manual")) {
        const next = {
          plant_code: params[0],
          year: params[1],
          month: params[2],
          operativos: params[3],
          corporativos: params[4],
          updated_by: params[5],
        };
        const idx = state.manual.findIndex((item) => item.plant_code === next.plant_code && item.year === next.year && item.month === next.month);
        if (idx >= 0) state.manual[idx] = next;
        else state.manual.push(next);
        return { rows: [{ ...next }] };
      }
      throw new Error(`SQL no simulada: ${text}`);
    },
  };
}

test("gate 2026-09 legacy y 2026-10 / 2027-01 nuevo", () => {
  assert.equal(layout.usesDetailedExpenseLayout(2026, 9), false);
  assert.equal(layout.usesDetailedExpenseLayout(2026, 10), true);
  assert.equal(layout.usesDetailedExpenseLayout(2027, 1), true);
  assert.equal(desglose.usesDetailedExpenseLayout(2026, 9), false);
  assert.match(UI_LAYOUT, /year > 2026 \|\| \(year === 2026 && month >= 10\)/);
  assert.equal(CLIENT.split("month >= 10").length, 1);
});

test("DDL idempotente y sin datos iniciales", () => {
  assert.match(desglose.ENSURE_SQL, /CREATE TABLE IF NOT EXISTS arr\.igf_diario_gastos_desglose/);
  assert.match(desglose.ENSURE_SQL, /gasto_corporativo NUMERIC\(18,2\) NULL/);
  assert.match(desglose.ENSURE_SQL, /provisiones_planta NUMERIC\(18,2\) NULL/);
  assert.match(desglose.ENSURE_SQL, /PRIMARY KEY \(plant_code, year, month\)/);
  assert.doesNotMatch(desglose.ENSURE_SQL, /INSERT INTO/);
  assert.equal(LIB.split("CREATE TABLE IF NOT EXISTS").length, 2);
});

test("guardado corporativo completo suma en centavos y sincroniza 062", async () => {
  const client = txClient();
  const patch = desglose.parsePatch(corpBody());
  assert.equal(patch.ok, true);
  assert.equal(patch.total, 60.6);
  const saved = await desglose.patchDesglose(client, patch, "Dashboard:1");
  assert.equal(saved.row.corporativos_desglosados, true);
  assert.equal(saved.row.corporativos_total_desglose, 60.6);
  assert.equal(saved.row.operativos_desglosados, false);
  assert.equal(client.state.manual[0].corporativos, 60.6);
  assert.equal(client.state.manual[0].operativos, null);
});

test("guardado operativo completo sincroniza el total", async () => {
  const client = txClient();
  const patch = desglose.parsePatch(operBody());
  const saved = await desglose.patchDesglose(client, patch, "Dashboard:1");
  assert.equal(saved.row.operativos_desglosados, true);
  assert.equal(saved.row.operativos_total_desglose, 10);
  assert.equal(client.state.manual[0].operativos, 10);
  assert.equal(client.state.manual[0].corporativos, null);
});

test("0 es válido en cualquier concepto", async () => {
  const client = txClient();
  const patch = desglose.parsePatch(corpBody({ gasto_corporativo: 0, inversiones: 0, impuestos_federales: 0 }));
  assert.equal(patch.ok, true);
  assert.equal(patch.total, 0);
  const saved = await desglose.patchDesglose(client, patch, "Dashboard:1");
  assert.equal(saved.row.corporativos_desglosados, true);
  assert.equal(saved.row.corporativos_total_desglose, 0);
  assert.equal(client.state.manual[0].corporativos, 0);
});

test("rechaza grupos parciales, null y omitidos", () => {
  const body = corpBody();
  delete body.inversiones;
  assert.equal(desglose.parsePatch(body).ok, false);
  assert.equal(desglose.parsePatch(corpBody({ inversiones: null })).ok, false);
  assert.equal(desglose.parsePatch(operBody({ extraordinarios: "" })).ok, false);
  assert.equal(desglose.parsePatch(corpBody({ month: 9 })).ok, false);
});

test("transacción hace rollback si falla el sync", async () => {
  const client = txClient({ failManual: true });
  await assert.rejects(() => desglose.patchDesglose(client, desglose.parsePatch(corpBody()), "Dashboard:1"));
  assert.equal(client.state.desglose.length, 0);
  assert.equal(client.state.manual.length, 0);
});

test("guardar corporativos preserva operativos", async () => {
  const client = txClient();
  await desglose.patchDesglose(client, desglose.parsePatch(operBody()), "Dashboard:1");
  await desglose.patchDesglose(client, desglose.parsePatch(corpBody()), "Dashboard:2");
  const row = client.state.desglose[0];
  assert.equal(row.presupuesto_nomina_gastos, 1);
  assert.equal(row.provisiones_planta, 4);
  assert.equal(row.gasto_corporativo, 10.1);
  assert.equal(client.state.manual[0].operativos, 10);
  assert.equal(client.state.manual[0].corporativos, 60.6);
});

test("guardar operativos preserva corporativos", async () => {
  const client = txClient();
  await desglose.patchDesglose(client, desglose.parsePatch(corpBody()), "Dashboard:1");
  await desglose.patchDesglose(client, desglose.parsePatch(operBody({ presupuesto_nomina_gastos: 0 })), "Dashboard:2");
  const row = client.state.desglose[0];
  assert.equal(row.gasto_corporativo, 10.1);
  assert.equal(row.impuestos_federales, 30.3);
  assert.equal(row.presupuesto_nomina_gastos, 0);
  assert.equal(client.state.manual[0].corporativos, 60.6);
  assert.equal(client.state.manual[0].operativos, 9);
});

test("fallback agregado sin desglose no inventa componentes", () => {
  const packet = desglose.excelPacket(2026, 10, { corporativos: 1334241, operativos: 50 }, null);
  assert.equal(packet.corporativos, 1334241);
  assert.equal(packet.operativos, 50);
  assert.equal(packet.desglose.corporativos_desglosados, false);
  assert.equal(packet.desglose.componentes.gasto_corporativo, null);
  const ws = fillPlant(2026, 10, { corporativos: 1334241, operativos: 50, desglose: packet.desglose });
  assert.equal(ws.getCell(3, 10).value, null);
  assert.equal(ws.getCell(3, 11).value, null);
  assert.equal(ws.getCell(3, 12).value, null);
  assert.equal(ws.getCell(3, 13).value, 1334241);
  assert.equal(ws.getCell(3, 17).value, null);
  assert.equal(ws.getCell(3, 21).value, 50);
  assert.match(CLIENT, /Total actual sin desglose/);
});

test("modal corporativos muestra 3 conceptos y operativos 4", () => {
  assert.match(CLIENT, /Gasto Corporativo/);
  assert.match(CLIENT, /Inversiones/);
  assert.match(CLIENT, /Impuestos Federales/);
  assert.match(CLIENT, /Presupuesto Nómina\/Gastos/);
  assert.match(CLIENT, /Presupuesto IMSS\/SUA/);
  assert.match(CLIENT, /Extraordinarios/);
  assert.match(CLIENT, /Provisiones de la Planta/);
  assert.match(CLIENT, /TOTAL =/);
  assert.match(CLIENT, />\s*Guardar\s*</);
  assert.match(CLIENT, />\s*Cancelar\s*</);
  assert.equal(CLIENT.includes("role=\"dialog\""), true);
});

test("octubre no muestra Manual/Auto y septiembre sí conserva la edición 062", () => {
  assert.match(CLIENT, /const legacyGasto = editableGasto && !detailedLayout/);
  assert.match(CLIENT, /const detailedGasto = editableGasto && detailedLayout/);
  assert.match(CLIENT, />\s*Manual\s*</);
  assert.match(CLIENT, />\s*Auto\s*</);
  assert.match(CLIENT, /legacyGasto && gastoField/);
  assert.doesNotMatch(CLIENT.slice(CLIENT.indexOf("detailedGasto && gastoField"), CLIENT.indexOf("legacyGasto && gastoField")), /Manual|Auto/);
});

test("J K L M y Q R S T U de octubre", () => {
  const view = desglose.publicRow({
    plant_code: "Morelos",
    year: 2026,
    month: 10,
    gasto_corporativo: 100,
    inversiones: 0,
    impuestos_federales: 40,
    presupuesto_nomina_gastos: 10,
    presupuesto_imss_sua: 20,
    extraordinarios: 30,
    provisiones_planta: 40,
  }, 2026, 10);
  const ws = fillPlant(2026, 10, { corporativos: 140, operativos: 100, desglose: view });
  assert.equal(ws.getCell(5, 10).value, "Gasto Corporativo");
  assert.equal(ws.getCell(5, 11).value, "Inversiones");
  assert.equal(ws.getCell(5, 12).value, "Impuestos Federales");
  assert.equal(ws.getCell(5, 13).value, "IMPORTE");
  assert.equal(ws.getCell(5, 17).value, "Presupuesto Nómina/Gastos");
  assert.equal(ws.getCell(5, 18).value, "Presupuesto IMSS/SUA");
  assert.equal(ws.getCell(5, 19).value, "Extraordinarios");
  assert.equal(ws.getCell(5, 20).value, "Provisiones de la Planta");
  assert.equal(ws.getCell(5, 21).value, "IMPORTE");
  assert.equal(ws.getCell(3, 10).value, 100);
  assert.equal(ws.getCell(3, 11).value, 0);
  assert.equal(ws.getCell(3, 18).value, 20);
  assert.equal(formulaOf(ws.getCell(3, 13)), "J3+K3+L3");
  assert.equal(formulaOf(ws.getCell(3, 21)), "Q3+R3+S3+T3");
});

test("la nueva R desplaza HG, resultado, comentario, ventas y carry", () => {
  const ws = fillPlant(2026, 10, { corporativos: 1, operativos: 2 });
  assert.equal(ws.getCell(5, 25).value, "IMPORTE HG");
  assert.equal(ws.getCell(5, 26).value, "IMPORTE HG POR KG");
  assert.equal(ws.getCell(5, 28).value, "SOBRANTE OPERACIÓN");
  assert.equal(ws.getCell(5, 30).value, "C&D");
  assert.equal(ws.getCell(5, 32).value, "RESULTADO POR KG");
  assert.equal(ws.getCell(5, 33).value, "RESULTADO");
  assert.equal(ws.getCell(5, 35).value, "COMENTARIO DEL DIA");
  assert.equal(ws.getCell(5, 36).value, "VENTAS");
  assert.equal(ws.getCell(5, 37).value, "DESCUENTOS");
  assert.equal(ws.getColumn(37).hidden, false);
  assert.equal(ws.getColumn(38).hidden, true);
  assert.equal(ws.getColumn(39).hidden, true);
  assert.equal(ws.getCell(5, 24).value, null);
});

test("inhabil escribe 0 en los 7 componentes y hábil divide monto/habiles/B", () => {
  const cal = igf.monthBusinessDays(2026, 10);
  const habil = cal.days.find((day) => !day.inhabil);
  const inhabil = cal.days.find((day) => day.inhabil);
  const view = desglose.publicRow({
    plant_code: "Morelos", year: 2026, month: 10,
    gasto_corporativo: 270, inversiones: 0, impuestos_federales: 0,
    presupuesto_nomina_gastos: 540, presupuesto_imss_sua: 0, extraordinarios: 0, provisiones_planta: 0,
  }, 2026, 10);
  const ws = fillPlant(2026, 10, { desglose: view, corporativos: 270, operativos: 540 });
  const hRow = rowByDate(ws, 2026, 10, habil.day);
  const iRow = rowByDate(ws, 2026, 10, inhabil.day);
  for (const col of [10, 11, 12, 17, 18, 19, 20]) assert.equal(ws.getCell(iRow, col).value, 0);
  const corpDay = dist.buildExpenseDailySchedule({ monthlyAmount: 270, days: cal.days, overrides: {} });
  const operDay = dist.buildExpenseDailySchedule({ monthlyAmount: 540, days: cal.days, overrides: {} });
  const corpMoney = corpDay.byFecha[habil.fecha].toFixed(2).replace(".", "\\.");
  const operMoney = operDay.byFecha[habil.fecha].toFixed(2).replace(".", "\\.");
  assert.match(formulaOf(ws.getCell(hRow, 10)), new RegExp(`${corpMoney}/B${hRow}`));
  assert.match(formulaOf(ws.getCell(hRow, 10)), /B\d+<>0/);
  assert.doesNotMatch(formulaOf(ws.getCell(hRow, 10)), /\$J\$3/);
  assert.match(formulaOf(ws.getCell(hRow, 17)), new RegExp(`${operMoney}/B${hRow}`));
  assert.equal(formulaOf(ws.getCell(hRow, 13)), `J${hRow}+K${hRow}+L${hRow}`);
  assert.equal(formulaOf(ws.getCell(hRow, 21)), `Q${hRow}+R${hRow}+S${hRow}+T${hRow}`);
});

test("semana usa dinero asignado y TOTAL MES divide el monto entre B", () => {
  const cal = igf.monthBusinessDays(2026, 10);
  const weeks = igf.weeksOf(cal.days);
  const weekHabiles = weeks[0].filter((day) => !day.inhabil).length;
  const view = desglose.publicRow({
    plant_code: "San Luis", year: 2026, month: 10,
    gasto_corporativo: 100, inversiones: 20, impuestos_federales: 30,
    presupuesto_nomina_gastos: 40, presupuesto_imss_sua: 10, extraordinarios: 5, provisiones_planta: 5,
  }, 2026, 10);
  const ws = fillPlant(2026, 10, { sheetLabel: "San Luis", humanName: "San Luis", desglose: view });
  const week = rowByLabel(ws, "Semana 1");
  const total = rowByLabel(ws, "TOTAL MES");
  const weekJ = formulaOf(ws.getCell(week, 10));
  const weekMoney = dist.sumAssignedForWeek(
    dist.buildExpenseDailySchedule({ monthlyAmount: 100, days: cal.days, overrides: {} }),
    weeks[0]
  ).toFixed(2).replace(".", "\\.");
  assert.match(weekJ, new RegExp(`${weekMoney}/B${week}`));
  assert.doesNotMatch(weekJ, new RegExp(`\\*${weekHabiles}/`));
  assert.doesNotMatch(weekJ, /AVERAGE|J6/);
  assert.equal(formulaOf(ws.getCell(week, 13)), `J${week}+K${week}+L${week}`);
  assert.equal(formulaOf(ws.getCell(week, 21)), `Q${week}+R${week}+S${week}+T${week}`);
  assert.equal(formulaOf(ws.getCell(total, 10)), `IF(OR(NOT(ISNUMBER($J$3)),NOT(ISNUMBER(B${total})),B${total}<=0),"",$J$3/B${total})`);
  assert.equal(formulaOf(ws.getCell(total, 13)), `J${total}+K${total}+L${total}`);
  assert.equal(formulaOf(ws.getCell(total, 21)), `Q${total}+R${total}+S${total}+T${total}`);
  assert.doesNotMatch(PUEBLA, /getCell\(48,/);
});

test("fórmulas desplazadas O W Z AB AF AG y comentarios", () => {
  const cal = igf.monthBusinessDays(2026, 10);
  const habil = cal.days.find((day) => !day.inhabil);
  const view = desglose.publicRow({
    plant_code: "Morelos", year: 2026, month: 10,
    gasto_corporativo: 1, inversiones: 1, impuestos_federales: 1,
    presupuesto_nomina_gastos: 1, presupuesto_imss_sua: 1, extraordinarios: 1, provisiones_planta: 1,
  }, 2026, 10);
  const ws = fillPlant(2026, 10, {
    desglose: view,
    dailyInsights: { "2026-10-05": { comentario: "nota del dia", ventas: "venta casa" } },
  });
  const row = rowByDate(ws, 2026, 10, habil.day);
  assert.match(formulaOf(ws.getCell(row, 15)), new RegExp(`H${row}-M${row}`));
  assert.match(formulaOf(ws.getCell(row, 23)), new RegExp(`O${row}-U${row}`));
  assert.match(formulaOf(ws.getCell(row, 26)), new RegExp(`Y${row}\\/B${row}`));
  assert.match(formulaOf(ws.getCell(row, 28)), new RegExp(`W${row}-Z${row}`));
  assert.match(formulaOf(ws.getCell(row, 32)), new RegExp(`AB${row}\\+AD${row}`));
  assert.match(formulaOf(ws.getCell(row, 33)), new RegExp(`AF${row}\\*B${row}`));
  const insight = rowByDate(ws, 2026, 10, 5);
  assert.equal(ws.getCell(insight, 35).value, "nota del dia");
  assert.equal(ws.getCell(insight, 36).value, "venta casa");
  assert.equal(ws.getColumn(37).hidden, false);
  assert.equal(ws.getColumn(38).hidden, true);
  assert.equal(ws.getColumn(39).hidden, true);
});

test("Provincia, individual y Todas usan el layout nuevo sin hardcode de planta", () => {
  const wb = new ExcelJS.Workbook();
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026, month: 10, sheetLabel: "Queretaro", humanName: "Queretaro",
    corporativos: 3, operativos: 4, corteYmd: "2026-10-05",
  });
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026, month: 10, sheetLabel: "Acapulco", humanName: "Acapulco",
    corporativos: 5, operativos: 6, corteYmd: "2026-10-05",
  });
  igf.fillIgfDiarioProvincia(wb, {
    year: 2026, month: 10, plantSheets: ["IGF Diario Queretaro", "IGF Diario Acapulco"], corteYmd: "2026-10-05",
  });
  const provincia = wb.getWorksheet("IGF Diario Provincia");
  assert.equal(provincia.getCell(5, 18).value, "Presupuesto IMSS/SUA");
  assert.match(formulaOf(provincia.getCell(3, 10)), /IGF Diario Queretaro'!J3/);
  assert.match(formulaOf(provincia.getCell(3, 10)), /IGF Diario Acapulco'!J3/);
  assert.match(formulaOf(provincia.getCell(3, 13)), /IGF Diario Queretaro'!M3/);
  assert.match(formulaOf(provincia.getCell(3, 21)), /IGF Diario Acapulco'!U3/);
  assert.match(FORECAST, /desglose: packet\.desglose/);
  assert.match(FORECAST, /desglose: gastos && gastos\.desglose/);
  assert.match(SERVER, /excelPacket/);
  assert.doesNotMatch(EXCEL, /sheetLabel === "Puebla"|humanName === "Puebla"/);
  const miniFn = FORECAST.slice(FORECAST.indexOf("function applyIgfDiarioAcumuladoMini"), FORECAST.indexOf("module.exports"));
  assert.doesNotMatch(miniFn, /gasto_corporativo|igf_diario_gastos_desglose/);
});

test("septiembre 2026 conserva el layout legacy completo", () => {
  const ws = fillPlant(2026, 9, { sheetLabel: "Queretaro", humanName: "Queretaro", corporativos: 11, operativos: 22 });
  assert.equal(ws.getCell(3, 13).value, 11);
  assert.equal(ws.getCell(3, 20).value, 22);
  assert.equal(ws.getCell(5, 13).value, "IMPORTE");
  assert.equal(ws.getCell(4, 13).value, "GASTOS CORPORATIVOS");
  assert.equal(ws.getCell(5, 20).value, "IMPORTE");
  assert.equal(ws.getCell(4, 20).value, "GASTOS OPERATIVOS");
  assert.equal(ws.getCell(5, 18).value, null);
  assert.equal(ws.getCell(5, 24).value, "IMPORTE HG");
  assert.equal(ws.getCell(5, 25).value, "IMPORTE HG POR KG");
  assert.equal(ws.getCell(5, 27).value, "SOBRANTE OPERACIÓN");
  assert.equal(ws.getCell(5, 29).value, "C&D");
  assert.equal(ws.getCell(5, 31).value, "RESULTADO POR KG");
  assert.equal(ws.getCell(5, 32).value, "RESULTADO");
  assert.equal(ws.getCell(5, 34).value, "COMENTARIO DEL DIA");
  assert.equal(ws.getCell(5, 35).value, "VENTAS");
  assert.equal(ws.getCell(5, 37).value, "DESCUENTOS");
  assert.equal(ws.getColumn(36).hidden, true);
  assert.equal(ws.getColumn(37).hidden, false);
  assert.equal(ws.getColumn(38).hidden, true);
  assert.equal(ws.getCell(5, 36).value, null);
  const cal = igf.monthBusinessDays(2026, 9);
  const habil = cal.days.find((day) => !day.inhabil);
  const row = rowByDate(ws, 2026, 9, habil.day);
  assert.match(formulaOf(ws.getCell(row, 13)), /\$M\$3/);
  assert.match(formulaOf(ws.getCell(row, 20)), /\$T\$3/);
  assert.doesNotMatch(formulaOf(ws.getCell(row, 13)), /\$J\$3/);
});

test("API exige auth financiera y no amplia permisos", () => {
  assert.match(SERVER, /app\.get\("\/api\/dashboard\/igf-diario-gastos-desglose", dashboardAuthMiddleware/);
  assert.match(SERVER, /app\.patch\("\/api\/dashboard\/igf-diario-gastos-desglose", dashboardAuthMiddleware/);
  const start = SERVER.indexOf('app.get("/api/dashboard/igf-diario-gastos-desglose"');
  const end = SERVER.indexOf("/** Detalle hoja Pronóstico");
  const block = SERVER.slice(start, end);
  assert.match(block, /dashboardBlockGAFinancialKpis/);
  assert.match(block, /dashboardBlockGVForbidden/);
  assert.match(block, /assertPlantaPermitidaDashboard/);
  assert.doesNotMatch(block, /INSERT INTO|UPDATE |DELETE FROM/);
});

test("0.1 + 0.2 + 0.3 no deja un residuo de punto flotante", () => {
  assert.equal(desglose.sumMoney([0.1, 0.2, 0.3]), 0.6);
});
