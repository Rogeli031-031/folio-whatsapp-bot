"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const dist = require("../lib/igf-diario-gastos-distribucion");
const desglose = require("../lib/igf-diario-gastos-desglose");
const igf = require("../lib/igf-diario-puebla");

const ROOT = path.join(__dirname, "..");
const LIB = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-gastos-distribucion.js"), "utf8");
const EXCEL = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-expense-excel.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const PUEBLA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-puebla.js"), "utf8");

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
  for (let r = 1; r <= Math.max(ws.rowCount || 0, 90); r += 1) {
    if (ws.getCell(r, 1).value === label) return r;
  }
  return null;
}

function syntheticDays(count) {
  return Array.from({ length: count }, (_, index) => ({
    day: index + 1,
    fecha: `2026-10-${String(index + 1).padStart(2, "0")}`,
    inhabil: false,
  }));
}

function fillPlant(extra) {
  const wb = new ExcelJS.Workbook();
  const name = (extra && extra.sheetLabel) || "Morelos";
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

function activeRow(extra) {
  return desglose.publicRow({
    plant_code: "Morelos",
    year: 2026,
    month: 10,
    gasto_corporativo: 270,
    inversiones: 0,
    impuestos_federales: 0,
    presupuesto_nomina_gastos: 540,
    presupuesto_imss_sua: 0,
    extraordinarios: 0,
    provisiones_planta: 0,
    ...extra,
  }, 2026, 10);
}

function memoryClient(seed) {
  const state = {
    rows: (seed && seed.rows) || [],
    desglose: (seed && seed.desglose) || [],
    manual: [],
    creates: 0,
  };
  return {
    state,
    async query(sql, params = []) {
      const text = String(sql).trim();
      if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") return { rows: [] };
      if (text.startsWith("CREATE TABLE")) {
        state.creates += 1;
        return { rows: [] };
      }
      if (text.startsWith("INSERT INTO arr.igf_diario_gastos_distribucion_manual")) {
        const next = {
          plant_code: params[0], year: params[1], month: params[2], concepto: params[3],
          fecha: params[4], importe: params[5], updated_by: params[6],
        };
        const idx = state.rows.findIndex((row) => row.plant_code === next.plant_code && row.year === next.year && row.month === next.month && row.concepto === next.concepto && row.fecha === next.fecha);
        if (idx >= 0) state.rows[idx] = next;
        else state.rows.push(next);
        return { rows: [] };
      }
      if (text.startsWith("DELETE FROM arr.igf_diario_gastos_distribucion_manual")) {
        state.rows = state.rows.filter((row) => !(row.plant_code === params[0] && row.year === params[1] && row.month === params[2] && row.concepto === params[3] && row.fecha === params[4]));
        return { rows: [] };
      }
      if (text.includes("FROM arr.igf_diario_gastos_distribucion_manual")) {
        return {
          rows: state.rows.filter((row) => row.plant_code === params[0] && row.year === params[1] && row.month === params[2]).map((row) => ({ ...row })),
        };
      }
      if (text.includes("FROM arr.igf_diario_gastos_desglose") && text.includes("plant_code = $1")) {
        const hit = state.desglose.find((row) => row.plant_code === params[0] && row.year === params[1] && row.month === params[2]);
        return { rows: hit ? [{ ...hit }] : [] };
      }
      if (text.startsWith("INSERT INTO arr.igf_diario_gastos_desglose")) {
        let row = state.desglose.find((item) => item.plant_code === params[0] && item.year === params[1] && item.month === params[2]);
        if (!row) {
          row = { plant_code: params[0], year: params[1], month: params[2] };
          state.desglose.push(row);
        }
        if (text.includes("gasto_corporativo, inversiones, impuestos_federales, updated_at")) {
          row.gasto_corporativo = params[3];
          row.inversiones = params[4];
          row.impuestos_federales = params[5];
        } else {
          row.presupuesto_nomina_gastos = params[3];
          row.presupuesto_imss_sua = params[4];
          row.extraordinarios = params[5];
          row.provisiones_planta = params[6];
        }
        return { rows: [{ ...row }] };
      }
      if (text.includes("FROM arr.igf_diario_gastos_manual")) return { rows: [] };
      if (text.startsWith("INSERT INTO arr.igf_diario_gastos_manual")) {
        state.manual.push({ plant_code: params[0], corporativos: params[4], operativos: params[3] });
        return { rows: [{ plant_code: params[0] }] };
      }
      throw new Error(`SQL no simulada: ${text.slice(0, 120)}`);
    },
  };
}

test("gate octubre y septiembre legado", () => {
  assert.equal(dist.parseQuery({ year: 2026, month: 9, plant_code: "Morelos", concepto: "gasto_corporativo" }).ok, false);
  assert.equal(dist.parseQuery({ year: 2026, month: 10, plant_code: "Morelos", concepto: "gasto_corporativo" }).ok, true);
  const wb = new ExcelJS.Workbook();
  igf.fillIgfDiarioPuebla(wb, { year: 2026, month: 9, sheetLabel: "Morelos", humanName: "Morelos", corteYmd: "2026-09-05" });
  const ws = wb.getWorksheet("IGF Diario Morelos");
  const cal = igf.monthBusinessDays(2026, 9);
  const habil = cal.days.find((day) => !day.inhabil);
  const row = rowByDate(ws, 2026, 9, habil.day);
  assert.match(formulaOf(ws.getCell(row, 13)), /\$M\$3/);
  assert.doesNotMatch(formulaOf(ws.getCell(row, 13)), /gasto_corporativo/);
});

test("DDL idempotente sin datos iniciales ni filas previas a octubre", async () => {
  assert.match(dist.ENSURE_SQL, /CREATE TABLE IF NOT EXISTS arr\.igf_diario_gastos_distribucion_manual/);
  assert.match(dist.ENSURE_SQL, /importe NUMERIC\(18,2\) NOT NULL/);
  assert.match(dist.ENSURE_SQL, /PRIMARY KEY \(plant_code, year, month, concepto, fecha\)/);
  assert.doesNotMatch(dist.ENSURE_SQL, /INSERT INTO/);
  assert.doesNotMatch(LIB, /953777|37412\.69/);
  const client = memoryClient();
  await dist.ensureTable(client);
  await dist.ensureTable(client);
  assert.equal(client.state.creates, 2);
  assert.equal(client.state.rows.length, 0);
});

test("concepto inválido, inhábil, cero y null", async () => {
  assert.equal(dist.parsePatch({
    year: 2026, month: 10, plant_code: "Morelos", concepto: "otro", fecha: "2026-10-01", importe: 1,
  }).ok, false);
  const cal = igf.monthBusinessDays(2026, 10);
  const habil = cal.days.find((day) => !day.inhabil);
  const inhabil = cal.days.find((day) => day.inhabil);
  const outside = dist.parsePatch({
    year: 2026, month: 10, plant_code: "Morelos", concepto: "gasto_corporativo", fecha: "2026-11-01", importe: 1,
  });
  assert.equal(outside.ok, false);
  assert.equal(dist.parsePatch({
    year: 2026, month: 10, plant_code: "Morelos", concepto: "gasto_corporativo", fecha: habil.fecha, importe: Number.NaN,
  }).ok, false);
  assert.equal(dist.parsePatch({
    year: 2026, month: 10, plant_code: "Morelos", concepto: "gasto_corporativo", fecha: habil.fecha, importe: Number.POSITIVE_INFINITY,
  }).ok, false);
  assert.equal(dist.parsePatch({
    year: 2026, month: 10, plant_code: "Morelos", concepto: "gasto_corporativo", fecha: habil.fecha, importe: -1,
  }).ok, false);
  const client = memoryClient({
    desglose: [{
      plant_code: "Morelos", year: 2026, month: 10,
      gasto_corporativo: 1000, inversiones: 0, impuestos_federales: 0,
    }],
  });
  const zero = dist.parsePatch({
    year: 2026, month: 10, plant_code: "Morelos", concepto: "gasto_corporativo", fecha: habil.fecha, importe: 0,
  });
  const saved = await dist.patchDistribucion(client, zero, "Dashboard:1");
  assert.equal(saved.ok, true);
  assert.equal(client.state.rows[0].importe, 0);
  assert.equal(saved.days.find((day) => day.fecha === habil.fecha).manual, true);
  const restored = await dist.patchDistribucion(client, { ...zero, restore: true, importe: null }, "Dashboard:1");
  assert.equal(restored.days.find((day) => day.fecha === habil.fecha).manual, false);
  assert.equal(client.state.rows.length, 0);
  const blocked = dist.parsePatch({
    year: 2026, month: 10, plant_code: "Morelos", concepto: "gasto_corporativo", fecha: inhabil.fecha, importe: 1,
  });
  assert.equal(blocked.ok, true);
  await assert.rejects(() => dist.patchDistribucion(client, blocked, "Dashboard:1"), /no es hábil/);
  assert.equal(client.state.rows.length, 0);
});

test("un override futuro no cambia los automáticos anteriores", () => {
  const days = syntheticDays(5);
  const plain = dist.buildExpenseDailySchedule({ monthlyAmount: 100, days, overrides: {} });
  const moved = dist.buildExpenseDailySchedule({
    monthlyAmount: 100,
    days,
    overrides: { "2026-10-03": 40 },
  });
  assert.equal(moved.days[0].importe_asignado, plain.days[0].importe_asignado);
  assert.equal(moved.days[1].importe_asignado, plain.days[1].importe_asignado);
  assert.equal(moved.days[2].importe_asignado, 40);
  assert.notEqual(moved.days[3].importe_asignado, plain.days[3].importe_asignado);
});

test("subir un fijo baja el promedio posterior y bajarlo lo sube", () => {
  const days = syntheticDays(5);
  const plain = dist.buildExpenseDailySchedule({ monthlyAmount: 100, days, overrides: {} });
  const higher = dist.buildExpenseDailySchedule({ monthlyAmount: 100, days, overrides: { "2026-10-03": 40 } });
  const lower = dist.buildExpenseDailySchedule({ monthlyAmount: 100, days, overrides: { "2026-10-03": 10 } });
  assert.ok(higher.days[3].importe_asignado < plain.days[3].importe_asignado);
  assert.ok(lower.days[3].importe_asignado > plain.days[3].importe_asignado);
  assert.equal(higher.days[2].manual, true);
  assert.equal(higher.days[2].importe_asignado, 40);
});

test("fixture 953777.33 en 27 hábiles con tres días fijos", () => {
  const days = syntheticDays(27);
  const overrides = {
    "2026-10-01": 37412.69,
    "2026-10-02": 37412.69,
    "2026-10-03": 37412.69,
  };
  const built = dist.buildExpenseDailySchedule({ monthlyAmount: 953777.33, days, overrides });
  assert.equal(built.ok, true);
  assert.equal(built.initial_average, 35325.09);
  assert.equal(built.manual_assigned, 112238.07);
  assert.equal(built.remaining_amount, 841539.26);
  assert.equal(built.remaining_business_days, 24);
  assert.equal(built.remaining_average, 35064.14);
  assert.equal(built.days[0].importe_asignado, 37412.69);
  assert.equal(built.days[3].importe_asignado, 35064.14);
  const sum = built.days.reduce((acc, day) => acc + dist.toCents(day.importe_asignado), 0);
  assert.equal(sum, dist.toCents(953777.33));
  assert.equal(built.days[26].importe_asignado, dist.fromCents(dist.toCents(953777.33) - built.days.slice(0, 26).reduce((acc, day) => acc + dist.toCents(day.importe_asignado), 0)));
  assert.ok(built.days.every((day) => day.importe_asignado >= 0));
  const before = dist.buildExpenseDailySchedule({ monthlyAmount: 953777.33, days, overrides: {} });
  const later = dist.buildExpenseDailySchedule({
    monthlyAmount: 953777.33,
    days,
    overrides: { "2026-10-10": 50000 },
  });
  assert.equal(later.days[0].importe_asignado, before.days[0].importe_asignado);
  assert.equal(later.days[8].importe_asignado, before.days[8].importe_asignado);
});

test("día final manual incompatible y automático negativo se rechazan", () => {
  const days = syntheticDays(2);
  const closed = dist.validateExpenseDailySchedule({
    monthlyAmount: 10,
    days,
    overrides: { "2026-10-02": 5 },
  });
  assert.equal(closed.ok, true);
  const open = dist.validateExpenseDailySchedule({
    monthlyAmount: 10,
    days,
    overrides: { "2026-10-02": 1 },
  });
  assert.equal(open.ok, false);
  assert.equal(open.error, dist.IMPOSSIBLE);
  const negative = dist.buildExpenseDailySchedule({
    monthlyAmount: 10,
    days,
    overrides: { "2026-10-01": 20 },
  });
  assert.equal(negative.ok, false);
  assert.equal(negative.error, dist.IMPOSSIBLE);
  assert.ok(negative.days.some((day) => day.importe_asignado < 0) || negative.days.reduce((acc, day) => acc + dist.toCents(day.importe_asignado), 0) !== dist.toCents(10));
});

test("restaurar recalcula y el cambio de monto mensual conserva o rechaza", async () => {
  const days = syntheticDays(4);
  const fixed = dist.buildExpenseDailySchedule({ monthlyAmount: 100, days, overrides: { "2026-10-01": 40 } });
  const restored = dist.buildExpenseDailySchedule({ monthlyAmount: 100, days, overrides: {} });
  assert.notEqual(fixed.days[1].importe_asignado, restored.days[1].importe_asignado);
  assert.equal(restored.days[0].manual, false);
  const cal = igf.monthBusinessDays(2026, 10);
  const habil = cal.days.find((day) => !day.inhabil);
  const kept = memoryClient({
    desglose: [{
      plant_code: "Morelos", year: 2026, month: 10,
      gasto_corporativo: 1000, inversiones: 0, impuestos_federales: 0,
    }],
    rows: [{ plant_code: "Morelos", year: 2026, month: 10, concepto: "gasto_corporativo", fecha: habil.fecha, importe: 10 }],
  });
  const patch = desglose.parsePatch({
    year: 2026, month: 10, plant_code: "Morelos", group: "corporativos",
    gasto_corporativo: 800, inversiones: 0, impuestos_federales: 0,
  });
  const saved = await desglose.patchDesglose(kept, patch, "Dashboard:1");
  assert.equal(saved.ok, true);
  assert.equal(kept.state.rows.length, 1);
  assert.equal(kept.state.rows[0].importe, 10);
  const rejected = memoryClient({
    desglose: [{
      plant_code: "Morelos", year: 2026, month: 10,
      gasto_corporativo: 1000, inversiones: 0, impuestos_federales: 0,
    }],
    rows: [{ plant_code: "Morelos", year: 2026, month: 10, concepto: "gasto_corporativo", fecha: habil.fecha, importe: 5000 }],
  });
  await assert.rejects(() => desglose.patchDesglose(rejected, desglose.parsePatch({
    year: 2026, month: 10, plant_code: "Morelos", group: "corporativos",
    gasto_corporativo: 10, inversiones: 0, impuestos_federales: 0,
  }), "Dashboard:1"), /Ajusta o restaura los días fijos/);
  assert.equal(rejected.state.desglose[0].gasto_corporativo, 1000);
  assert.equal(rejected.state.rows[0].importe, 5000);
});

test("Excel diario usa el asignado entre B y la semana suma ese dinero", () => {
  const cal = igf.monthBusinessDays(2026, 10);
  const habiles = cal.days.filter((day) => !day.inhabil);
  const first = habiles[0];
  const later = habiles[3];
  const weeks = igf.weeksOf(cal.days);
  const week = weeks.find((item) => item.some((day) => day.fecha === first.fecha));
  const built = dist.buildExpenseDailySchedule({
    monthlyAmount: 270,
    days: cal.days,
    overrides: { [later.fecha]: 40 },
  });
  const plain = dist.buildExpenseDailySchedule({ monthlyAmount: 270, days: cal.days, overrides: {} });
  assert.equal(built.byFecha[first.fecha], plain.byFecha[first.fecha]);
  const ws = fillPlant({
    desglose: activeRow(),
    distribucionOverrides: { gasto_corporativo: { [later.fecha]: 40 } },
  });
  const row = rowByDate(ws, 2026, 10, first.day);
  const laterRow = rowByDate(ws, 2026, 10, later.day);
  const inhabil = cal.days.find((day) => day.inhabil);
  const inhabilRow = rowByDate(ws, 2026, 10, inhabil.day);
  assert.match(formulaOf(ws.getCell(row, 10)), new RegExp(`${built.byFecha[first.fecha].toFixed(2).replace(".", "\\.")}/B${row}`));
  assert.match(formulaOf(ws.getCell(row, 10)), /B\d+<>0/);
  assert.match(formulaOf(ws.getCell(laterRow, 10)), /40\.00\/B/);
  assert.equal(ws.getCell(inhabilRow, 10).value, 0);
  const weekRow = rowByLabel(ws, "Semana 1");
  const weekMoney = dist.sumAssignedForWeek(built, weeks[0]).toFixed(2).replace(".", "\\.");
  const weekFormula = formulaOf(ws.getCell(weekRow, 10));
  assert.match(weekFormula, new RegExp(`${weekMoney}/B${weekRow}`));
  assert.doesNotMatch(weekFormula, /AVERAGE|\$J\$3/);
  assert.ok(week.some((day) => !day.inhabil));
  const total = rowByLabel(ws, "TOTAL MES");
  assert.equal(formulaOf(ws.getCell(total, 10)), `IF(OR(NOT(ISNUMBER($J$3)),NOT(ISNUMBER(B${total})),B${total}<=0),"",$J$3/B${total})`);
  assert.equal(formulaOf(ws.getCell(row, 13)), `J${row}+K${row}+L${row}`);
  assert.equal(formulaOf(ws.getCell(row, 21)), `Q${row}+R${row}+S${row}+T${row}`);
});

test("Provincia semanal refleja las hojas y Todas conserva horarios propios", () => {
  const wb = new ExcelJS.Workbook();
  igf.fillIgfDiarioProvincia(wb, {
    year: 2026,
    month: 10,
    plantSheets: ["IGF Diario Queretaro", "IGF Diario Acapulco"],
    corteYmd: "2026-10-05",
  });
  const provincia = wb.getWorksheet("IGF Diario Provincia");
  const week = rowByLabel(provincia, "Semana 1");
  const total = rowByLabel(provincia, "TOTAL MES");
  const weekJ = formulaOf(provincia.getCell(week, 10));
  assert.match(weekJ, /IGF Diario Queretaro/);
  assert.match(weekJ, /IGF Diario Acapulco/);
  assert.doesNotMatch(weekJ, /\$J\$3\//);
  assert.match(formulaOf(provincia.getCell(total, 10)), /\$J\$3\/B/);
  const a = dist.buildExpenseDailySchedule({
    monthlyAmount: 300,
    days: syntheticDays(4),
    overrides: { "2026-10-02": 100 },
  });
  const b = dist.buildExpenseDailySchedule({
    monthlyAmount: 300,
    days: syntheticDays(4),
    overrides: { "2026-10-02": 20 },
  });
  assert.notEqual(a.days[2].importe_asignado, b.days[2].importe_asignado);
  assert.match(SERVER, /overridesForPlant/);
  assert.equal(EXCEL.includes("weightedAcross"), true);
});

test("caída 064, layout, 063-R1 y Forecast siguen", () => {
  const ws = fillPlant({});
  const cal = igf.monthBusinessDays(2026, 10);
  const habil = cal.days.find((day) => !day.inhabil);
  const row = rowByDate(ws, 2026, 10, habil.day);
  assert.equal(ws.getCell(row, 10).value, null);
  assert.match(CLIENT, /Total actual sin desglose/);
  assert.match(CLIENT, /Distribución diaria/);
  assert.match(CLIENT, /Editar importe/);
  assert.match(CLIENT, /Restaurar promedio/);
  assert.match(CLIENT, /Saldo pendiente/);
  assert.match(CLIENT, /Promedio restante/);
  assert.match(CLIENT, /fetchPronosticoDetalle/);
  assert.match(CLIENT, /postPronosticoDias/);
  assert.equal(PUEBLA.includes("function finiteMetric"), true);
  assert.equal(PUEBLA.includes("function totalMesMarginAndHg"), true);
  assert.equal(igf.finiteMetric(null), null);
  assert.equal(igf.finiteMetric(0), 0);
  assert.deepEqual(igf.totalMesMarginAndHg([{ ventaKg: 10, margen: 2, hgKg: 3 }]), { margen: 2, y: 3, hg: 3 });
  assert.match(SERVER, /\/api\/dashboard\/igf-diario-gastos-distribucion/);
  assert.match(SERVER, /dashboardBlockGAFinancialKpis/);
  assert.match(SERVER, /assertPlantaPermitidaDashboard/);
  assert.equal(dist.findManualOverride({ "2026-10-01": 12.5 }, "2026-10-01"), 1250);
  assert.equal(dist.findManualOverride({}, "2026-10-01"), null);
});
