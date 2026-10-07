"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const matrix = require("../lib/igf-diario-folios-deposito-matrix");
const etapa = require("../lib/folio-etapa-visual");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const LIB = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-folios-deposito-matrix.js"), "utf8");
const API = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "api.ts"), "utf8");

const PLANTS = [
  { empresa: "GT - Puebla", plant_code: "GT - Puebla", planta_ids: [11] },
  { empresa: "Tehuacán", plant_code: "Tehuacán", planta_ids: [12] },
  { empresa: "Acapulco", plant_code: "Acapulco", planta_ids: [13, 14] },
  { empresa: "GTM - Querétaro", plant_code: "GTM - Querétaro", planta_ids: [15] },
  { empresa: "GTM - San Luis P.", plant_code: "GTM - San Luis P.", planta_ids: [16] },
  { empresa: "Morelos", plant_code: "Morelos", planta_ids: [17] },
];

function row(extra) {
  return {
    id: 1,
    numero_folio: "F-1",
    folio_codigo: "F-1",
    planta_id: 12,
    importe: 80000,
    descripcion_display: "Reparación compresor",
    evento_estatus: "PAGADO",
    historial_id: 1,
    evento_en: "2026-10-08T15:00:00.000Z",
    fecha_cdmx: "2026-10-08",
    creado_en: "2026-10-02T12:00:00.000Z",
    monto_facturas: 999999,
    ...extra,
  };
}

function pack(rows, corte) {
  return matrix.assemble({ plants: PLANTS, corteYmd: corte || "2026-10-06", rows });
}

function cell(payload, empresa, fecha) {
  const plant = payload.plants.find((item) => item.empresa === empresa);
  return plant && plant.days[fecha] ? plant.days[fecha] : null;
}

function sumAmount(list) {
  return list.reduce((sum, item) => {
    if (item == null || item.amount_total == null) return sum;
    return sum + item.amount_total;
  }, 0);
}

test("el mapeo canónico lleva PAGADO y CERRADO a depósito y deja atrás el cheque", () => {
  assert.equal(etapa.estatusToEtapaVisual("PAGADO"), "DEPOSITO_CIERRE");
  assert.equal(etapa.estatusToEtapaVisual("CERRADO"), "DEPOSITO_CIERRE");
  assert.equal(etapa.estatusToEtapaVisual("COMPROBACIONES"), "COMPROBACIONES");
  assert.equal(etapa.estatusToEtapaVisual("EVIDENCIAS"), "EVIDENCIAS");
  assert.equal(etapa.estatusToEtapaVisual("CHEQUE_GENERADO"), "CHEQUE_GENERADO");
  assert.equal(etapa.estatusToEtapaVisual("CANCELADO"), "CANCELADO");
  assert.equal(SERVER.includes("return folioEtapaVisual.estatusToEtapaVisual(estatus);"), true);
  assert.deepEqual(etapa.etapaVisualToEstatusTecnicos("DEPOSITO_CIERRE"), ["PAGADO", "CERRADO"]);
});

test("Todas en IGF Diario muestra la matriz y una planta conserva 067", () => {
  assert.match(CLIENT, /igfTableMode === "igf_diario" && !plantaFilter \? null/);
  assert.match(CLIENT, /!plantaFilter && igfTableMode === "igf_diario" && token && igfForecast && \([\s\S]*IgfDiarioFoliosDepositoMatrix/);
  assert.match(CLIENT, /plantaFilter && igfTableMode === "igf_diario" && token && igfForecast && \([\s\S]*IgfDiarioWeeklyPlantPanel/);
  assert.match(CLIENT, /igfTableMode === "forecast" && igfForecast/);
  assert.match(CLIENT, /Comparación IGF Forecast vs última versión del mes anterior/);
  assert.match(API, /\/api\/dashboard\/igf-diario-folios-deposito/);
});

test("el mes y los días salen del calendario de la fecha de carga", () => {
  assert.equal(matrix.calendarDays(2026, 10).length, 31);
  assert.equal(matrix.calendarDays(2026, 9).length, 30);
  assert.equal(matrix.calendarDays(2026, 2).length, 28);
  assert.equal(matrix.calendarDays(2024, 2).length, 29);
  const october = pack([], "2026-10-06");
  assert.equal(october.month, 10);
  assert.equal(october.year, 2026);
  assert.equal(october.days.length, 31);
  assert.equal(october.days[0], "2026-10-01");
  assert.equal(october.days[30], "2026-10-31");
});

test("solo entra depósito o adelante, y un evento posterior al corte no cuenta", () => {
  const payload = pack([
    row({ id: 1, evento_estatus: "PAGADO", fecha_cdmx: "2026-10-03", evento_en: "2026-10-03T12:00:00.000Z" }),
    row({ id: 2, numero_folio: "F-2", evento_estatus: "COMPROBACIONES", fecha_cdmx: "2026-10-04", evento_en: "2026-10-04T12:00:00.000Z", importe: 10 }),
    row({ id: 3, numero_folio: "F-3", evento_estatus: "EVIDENCIAS", fecha_cdmx: "2026-10-05", evento_en: "2026-10-05T12:00:00.000Z", importe: 20 }),
    row({ id: 4, numero_folio: "F-4", evento_estatus: "CHEQUE_GENERADO", fecha_cdmx: "2026-10-02", evento_en: "2026-10-02T12:00:00.000Z", importe: 500 }),
    row({ id: 5, numero_folio: "F-5", evento_estatus: "PAGADO", fecha_cdmx: "2026-10-08", evento_en: "2026-10-08T12:00:00.000Z", importe: 700 }),
  ], "2026-10-06");
  assert.ok(cell(payload, "Tehuacán", "2026-10-03"));
  assert.ok(cell(payload, "Tehuacán", "2026-10-04"));
  assert.ok(cell(payload, "Tehuacán", "2026-10-05"));
  assert.equal(cell(payload, "Tehuacán", "2026-10-02"), null);
  assert.equal(cell(payload, "Tehuacán", "2026-10-08"), null);
  assert.equal(payload.grand_total.folio_count, 3);
  assert.equal(payload.grand_total.amount_total, 80000 + 10 + 20);
});

test("la primera transición calificante fija el día y no se duplica al avanzar", () => {
  const payload = pack([
    row({ evento_estatus: "GENERADO", fecha_cdmx: "2026-10-02", evento_en: "2026-10-02T10:00:00.000Z", historial_id: 1, creado_en: "2026-10-02T10:00:00.000Z" }),
    row({ evento_estatus: "PAGADO", fecha_cdmx: "2026-10-04", evento_en: "2026-10-04T10:00:00.000Z", historial_id: 2 }),
    row({ evento_estatus: "COMPROBACIONES", fecha_cdmx: "2026-10-05", evento_en: "2026-10-05T10:00:00.000Z", historial_id: 3 }),
    row({ evento_estatus: "EVIDENCIAS", fecha_cdmx: "2026-10-06", evento_en: "2026-10-06T10:00:00.000Z", historial_id: 4 }),
  ], "2026-10-06");
  const deposit = cell(payload, "Tehuacán", "2026-10-04");
  assert.ok(deposit);
  assert.equal(deposit.folio_count, 1);
  assert.equal(deposit.folios[0].threshold_date, "2026-10-04");
  assert.equal(deposit.folios[0].estado, "EVIDENCIAS");
  assert.equal(cell(payload, "Tehuacán", "2026-10-02"), null);
  assert.equal(cell(payload, "Tehuacán", "2026-10-05"), null);
  assert.equal(cell(payload, "Tehuacán", "2026-10-06"), null);
  assert.equal(payload.grand_total.folio_count, 1);
  const jumped = pack([
    row({ id: 9, numero_folio: "F-9", evento_estatus: "EVIDENCIAS", fecha_cdmx: "2026-10-04", evento_en: "2026-10-04T18:00:00.000Z", importe: 50 }),
  ], "2026-10-06");
  assert.equal(cell(jumped, "Tehuacán", "2026-10-04").folios[0].threshold_date, "2026-10-04");
});

test("cancelado no entra y el importe es el del folio, con null y cero distintos", () => {
  const cancelled = pack([
    row({ evento_estatus: "PAGADO", fecha_cdmx: "2026-10-03", evento_en: "2026-10-03T10:00:00.000Z", historial_id: 1, importe: 400 }),
    row({ evento_estatus: "CANCELADO", fecha_cdmx: "2026-10-04", evento_en: "2026-10-04T10:00:00.000Z", historial_id: 2, importe: 400 }),
  ], "2026-10-06");
  assert.equal(cancelled.grand_total.folio_count, 0);
  assert.equal(cancelled.grand_total.amount_total, null);
  const amounts = pack([
    row({ id: 1, importe: null, descripcion_display: "Sin monto", fecha_cdmx: "2026-10-03", evento_en: "2026-10-03T10:00:00.000Z" }),
    row({ id: 2, numero_folio: "F-2", importe: 0, descripcion_display: "Cero explícito", fecha_cdmx: "2026-10-03", evento_en: "2026-10-03T11:00:00.000Z", historial_id: 2 }),
  ], "2026-10-06");
  const mixed = cell(amounts, "Tehuacán", "2026-10-03");
  assert.equal(mixed.folio_count, 2);
  assert.equal(mixed.amount_total, 0);
  assert.equal(mixed.missing_amount_count, 1);
  assert.equal(mixed.folios.find((folio) => folio.id === 1).importe, null);
});

test("la descripción usa el mayor importe, el empate el id menor, y los totales cierran", () => {
  const payload = pack([
    row({ id: 1, numero_folio: "F-1", planta_id: 12, importe: 80000, descripcion_display: "Reparación compresor", fecha_cdmx: "2026-10-03", evento_en: "2026-10-03T10:00:00.000Z", historial_id: 1 }),
    row({ id: 4, numero_folio: "F-4", planta_id: 12, importe: 250000, descripcion_display: "Mantenimiento tanque", fecha_cdmx: "2026-10-03", evento_en: "2026-10-03T11:00:00.000Z", historial_id: 2 }),
    row({ id: 3, numero_folio: "F-3", planta_id: 12, importe: 10000, descripcion_display: "Otro", fecha_cdmx: "2026-10-03", evento_en: "2026-10-03T12:00:00.000Z", historial_id: 3 }),
    row({ id: 8, numero_folio: "F-8", planta_id: 12, importe: 250000, descripcion_display: "Empate posterior", fecha_cdmx: "2026-10-03", evento_en: "2026-10-03T13:00:00.000Z", historial_id: 4 }),
    row({ id: 20, numero_folio: "F-20", planta_id: 13, importe: 5, descripcion_display: "Acapulco uno", fecha_cdmx: "2026-10-03", evento_en: "2026-10-03T10:00:00.000Z", historial_id: 5 }),
    row({ id: 21, numero_folio: "F-21", planta_id: 14, importe: 7, descripcion_display: "Acapulco dos", fecha_cdmx: "2026-10-04", evento_en: "2026-10-04T10:00:00.000Z", historial_id: 6 }),
  ], "2026-10-06");
  const tehuacan = cell(payload, "Tehuacán", "2026-10-03");
  assert.equal(tehuacan.folio_count, 4);
  assert.equal(tehuacan.amount_total, 80000 + 250000 + 10000 + 250000);
  assert.equal(tehuacan.description_short, "Mantenimiento tanque +3");
  assert.equal(tehuacan.folios[0].id, 4);
  assert.equal(tehuacan.folios[0].importe, 250000);
  assert.equal(payload.plants.find((plant) => plant.empresa === "Tehuacán").total_month.folio_count, 4);
  assert.equal(payload.plants.find((plant) => plant.empresa === "Acapulco").total_month.folio_count, 2);
  assert.equal(payload.daily_totals["2026-10-03"].folio_count, 5);
  assert.equal(payload.daily_totals["2026-10-04"].folio_count, 1);
  const plantAmount = sumAmount(payload.plants.map((plant) => plant.total_month));
  const dayAmount = sumAmount(payload.days.map((fecha) => payload.daily_totals[fecha]));
  assert.equal(plantAmount, payload.grand_total.amount_total);
  assert.equal(dayAmount, payload.grand_total.amount_total);
  assert.equal(payload.plants.reduce((sum, plant) => sum + plant.total_month.folio_count, 0), payload.grand_total.folio_count);
  assert.equal(payload.days.reduce((sum, fecha) => sum + payload.daily_totals[fecha].folio_count, 0), payload.grand_total.folio_count);
  const single = pack([
    row({ descripcion_display: "Reparación compresor", fecha_cdmx: "2026-10-03", evento_en: "2026-10-03T10:00:00.000Z" }),
  ], "2026-10-06");
  assert.equal(cell(single, "Tehuacán", "2026-10-03").description_short, "Reparación compresor");
  const blank = pack([
    row({ descripcion_display: "  ", fecha_cdmx: "2026-10-03", evento_en: "2026-10-03T10:00:00.000Z" }),
  ], "2026-10-06");
  assert.equal(cell(blank, "Tehuacán", "2026-10-03").description_short, "Sin descripción");
});

test("la consulta es un lote, reutiliza visibilidad y no hardcodea plantas ni facturas", () => {
  const sql = matrix.eventsSql(" AND (COALESCE(f.solo_zp_ad, false) = false)", 1, 2);
  assert.match(sql, /public\.folio_historial/);
  assert.match(sql, /h\.creado_en AT TIME ZONE 'America\/Mexico_City'/);
  assert.match(sql, /f\.importe/);
  assert.match(sql, /COALESCE\(f\.descripcion, f\.concepto\)/);
  assert.doesNotMatch(sql, /f\.creado_en/);
  assert.doesNotMatch(sql, /folio_archivos|monto_comprobado|mes_cargo/);
  assert.doesNotMatch(LIB, /planta_id === \d+|planta_ids:\s*\[/);
  assert.doesNotMatch(LIB, /xlsx|exceljs/);
  const load = LIB.slice(LIB.indexOf("async function loadDepositoMatrix"), LIB.indexOf("module.exports"));
  assert.equal(load.split("client.query(").length, 2);
  assert.doesNotMatch(load, /for\s*\(/);
  const route = SERVER.slice(
    SERVER.indexOf('app.get("/api/dashboard/igf-diario-folios-deposito"'),
    SERVER.indexOf('app.get("/api/arr/dashboard-excel"')
  );
  assert.match(route, /dashboardAuthMiddleware/);
  assert.match(route, /dashboardBlockGVForbidden/);
  assert.match(route, /buildDashboardWhere/);
  assert.match(route, /ventanaDefault: false/);
  assert.equal(route.split("loadIgfEmpresaPlantaResolver(").length, 2);
  assert.equal(route.split("client.query(").length, 1);
  assert.doesNotMatch(route, /for\s*\(/);
  const plants = matrix.plantsFromResolver(["GT - Puebla", "Tehuacán"], (empresa) => (empresa === "GT - Puebla" ? [7] : [8]));
  assert.deepEqual(plants.map((plant) => plant.empresa), ["GT - Puebla", "Tehuacán"]);
  assert.deepEqual(plants[0].planta_ids, [7]);
});
