"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const forecast = require("../lib/dashboard-arr-forecast");
const grafica = require("../lib/igf-diario-grafica");
const gastos = require("../lib/igf-diario-gastos-manuales");
const igf = require("../lib/igf-diario-puebla");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const PUEBLA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-puebla.js"), "utf8");
const GASTOS = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-gastos-manuales.js"), "utf8");

const effect = CLIENT.slice(
  CLIENT.indexOf('if (igfTableMode !== "igf_diario"'),
  CLIENT.indexOf("}, [igfTableMode, token, igfForecast, igfMini, uploadDay, versionAsOfCorte]")
);
const applyFn = CLIENT.slice(
  CLIENT.indexOf("function applyIgfDiarioAcumuladoMini"),
  CLIENT.indexOf("function foldPlantKey")
);
const route = SERVER.slice(
  SERVER.indexOf('app.get("/api/dashboard/igf-diario-acumulado"'),
  SERVER.indexOf('app.get("/api/dashboard/igf-diario-grafica"')
);

function venta(plantCode) {
  return [
    { plant_code: plantCode, fecha: "2026-10-01", canal: "CASA", kg: 1000 },
    { plant_code: plantCode, fecha: "2026-10-01", canal: "COMISIONISTA", kg: 0 },
  ];
}

function precio(plantCode, value) {
  return { plant_code: plantCode, fecha: "2026-10-01", precio: value };
}

const SALES = [
  ...venta("Tehuacan"),
  ...venta("Querétaro"),
  ...venta("San Luis"),
  ...venta("Morelos"),
  ...venta("Puebla"),
];

const PRECIOS = [
  precio("Tehuacán", 20),
  precio("Querétaro", 18),
  precio("San Luis", 23.2),
  precio("Morelos", 10),
];

const COMPRA = {
  2: { kg: 100, importe: 1300, tarifa: 2 },
  3: { kg: 100, importe: 1300, tarifa: 2 },
  4: { kg: 100, importe: 1300, tarifa: 2 },
  5: { kg: 100, importe: 1300, tarifa: 2 },
  6: { kg: 100, importe: 400, tarifa: 1 },
};

function clientFor() {
  const sqls = [];
  const client = {
    async query(sql, params) {
      const text = String(sql);
      const args = params || [];
      sqls.push(text);
      if (/INSERT |UPDATE |DELETE /i.test(text)) throw new Error("escritura no permitida");
      if (text.includes("ventas_diarias_cliente")) {
        if (text.includes("pm.prov_name = $1")) return { rows: [] };
        return { rows: SALES };
      }
      if (text.includes("precio_diario")) {
        const codes = Array.isArray(args[0]) ? args[0] : [args[0], args[3]].filter((value) => value != null);
        return { rows: PRECIOS.filter((row) => codes.includes(row.plant_code)) };
      }
      if (text.includes("compras_proveedores")) {
        return { rows: [{ id: 1, planta_id: args[0], nombre: "GAS", activo: true, orden: 1 }] };
      }
      if (/FROM arr\.compras\s/.test(text) && text.includes("fecha < $2")) return { rows: [] };
      if (/FROM arr\.compras\s/.test(text)) {
        const spec = COMPRA[Number(args[0])];
        if (!spec) return { rows: [] };
        return { rows: [{ id: 10, planta_id: args[0], proveedor_id: 1, fecha: "2026-10-01", kg: spec.kg, importe: spec.importe }] };
      }
      if (text.includes("compras_hg")) {
        return { rows: [{ id: 1, planta_id: args[0], fecha: "2026-10-01", hg_kilos: 10 }] };
      }
      if (text.includes("compras_flete_tarifas") && text.includes("year")) {
        const spec = COMPRA[Number(args[0])];
        if (!spec) return { rows: [] };
        return { rows: [{ id: 1, planta_id: args[0], proveedor_id: 1, year: 2026, month: 10, tarifa: spec.tarifa }] };
      }
      return { rows: [] };
    },
  };
  return { client, sqls };
}

const PLANTS = [
  { plantaId: 3, nombre: "Tehuacán", clave: "TEHUACAN", canon: "Tehuacan", provinciaPlantCode: "Tehuacan" },
  { plantaId: 4, nombre: "Querétaro", clave: "QUERETARO", canon: "Queretaro", provinciaPlantCode: "GTM Queretaro" },
  { plantaId: 5, nombre: "San Luis", clave: "SANLUIS", canon: "San Luis", provinciaPlantCode: "San Luis" },
  { plantaId: 6, nombre: "Morelos", clave: "MORELOS", canon: "Morelos", provinciaPlantCode: "Morelos" },
  { plantaId: 2, nombre: "Puebla", clave: "PUEBLA", canon: "Puebla", provinciaPlantCode: "Puebla" },
];

async function load() {
  const { client, sqls } = clientFor();
  const payload = await grafica.loadIgfDiarioAcumulado(client, {
    year: 2026,
    month: 10,
    uploadDay: "2026-10-05",
    corteYmd: "2026-10-05",
    plants: PLANTS,
    loadPrecio: (code, year, month) => forecast.loadPrecioDiario(client, code, year, month),
  });
  return { payload, sqls };
}

function rowOf(payload, nombre) {
  return payload.rows.find((row) => row.empresa === nombre);
}

test("Tehuacán usa la venta del código sin acento y el precio del par", async () => {
  assert.equal(forecast.plantsEquivalent("Tehuacan", "Tehuacán"), true);
  const { payload, sqls } = await load();
  const row = rowOf(payload, "Tehuacán");
  assert.equal(row.canon, "Tehuacan");
  assert.equal(row.igf_label, "Tehuacan");
  assert.ok(Math.abs(row.margen - 5) < 1e-9);
  assert.ok(row.hg < 0);
  assert.deepEqual(row.missing, []);
  assert.equal(sqls.filter((sql) => sql.includes("ventas_diarias_cliente")).length, 1);
  assert.equal(sqls.some((sql) => sql.includes("pm.prov_name = $1")), false);
});

test("GTM Queretaro lee el precio Querétaro y la misma venta canónica", async () => {
  assert.equal(forecast.plantsEquivalent("GTM Queretaro", "Querétaro"), true);
  const loaded = await forecast.loadPrecioDiario({
    async query(sql, params) {
      assert.match(String(sql), /plant_code = ANY\(\$1::text\[\]\)/);
      assert.ok(params[0].includes("Querétaro"));
      assert.ok(params[0].includes("Queretaro"));
      return { rows: [precio("Querétaro", 18)] };
    },
  }, "GTM Queretaro", 2026, 10);
  assert.equal(loaded[0].precio, 18);
  const { payload } = await load();
  const row = rowOf(payload, "Querétaro");
  assert.equal(row.plant_code, "GTM Queretaro");
  assert.equal(row.igf_label, "GTM Queretaro");
  assert.ok(Math.abs(row.margen - 3) < 1e-9);
  assert.ok(row.hg < 0);
  assert.deepEqual(row.missing, []);
});

test("San Luis conserva 8.20 cuando el margen null no entra y Morelos sigue la misma ponderación", async () => {
  const days = [];
  for (let day = 1; day <= 27; day += 1) {
    days.push({ ventaKg: 1000, margen: day <= 3 ? 8.2 : null, hgKg: day <= 3 ? -1 : null });
  }
  const weighted = igf.totalMesMarginAndHg(days);
  assert.ok(Math.abs(weighted.margen - 8.2) < 1e-9);
  assert.equal(weighted.hg, weighted.y);
  assert.ok(weighted.hg < 0);
  let num = 0;
  let den = 0;
  for (const day of days) {
    num += (day.margen == null ? 0 : day.margen) * day.ventaKg;
    den += day.ventaKg;
  }
  assert.ok(Math.abs(num / den - 0.911111) < 0.02);

  const { payload } = await load();
  const sanLuis = rowOf(payload, "San Luis");
  const morelos = rowOf(payload, "Morelos");
  assert.ok(Math.abs(sanLuis.margen - 8.2) < 1e-9);
  assert.ok(sanLuis.hg < 0);
  assert.equal(sanLuis.hg, sanLuis.hg);
  const morelosMargen = 10 - (400 / 100) - 1;
  assert.ok(Math.abs(morelos.margen - morelosMargen) < 1e-9);
  assert.ok(morelos.hg < 0);
  assert.deepEqual(sanLuis.missing, []);
  assert.deepEqual(morelos.missing, []);
});

test("un caso incompleto identifica el componente y el texto sale del backend", async () => {
  const { payload } = await load();
  const row = rowOf(payload, "Puebla");
  assert.equal(row.margen, null);
  assert.ok(row.hg < 0);
  assert.deepEqual(row.missing, ["MARGEN"]);
  assert.deepEqual(row.missing_components.margen, ["PRECIO"]);
  assert.deepEqual(row.missing_components.hg, []);
  assert.match(CLIENT, /IGF Diario acumulado incompleto/);
  assert.match(CLIENT, /— falta \$\{parts\.join\(", "\)\}/);
  assert.match(CLIENT, /row\.missing_components/);
  assert.match(CLIENT, /row\.canon/);
  assert.match(CLIENT, /row\.igf_label/);
  assert.doesNotMatch(CLIENT, /Tehuacan — falta MARGEN/);
});

test("TOTAL MES se localiza por etiqueta y usa la misma ponderación que el acumulado", async () => {
  const writeTotal = PUEBLA.slice(PUEBLA.indexOf("function writeTotal"), PUEBLA.indexOf("function sheetRefs"));
  assert.match(writeTotal, /TOTAL MES/);
  assert.match(writeTotal, /weightedRows\(col, dayRows\)/);
  assert.match(PUEBLA, /IF\(AND\(ISNUMBER\(\$\{col\}\$\{row\}\),ISNUMBER\(B\$\{row\}\)\)/);
  assert.doesNotMatch(writeTotal, /getCell\(48|H48|Y48/);
  assert.match(PUEBLA, /\[13, opts && opts\.corporativos\], \[20, opts && opts\.operativos\]/);
  const { payload } = await load();
  const sanLuis = rowOf(payload, "San Luis");
  const same = igf.totalMesMarginAndHg([{ ventaKg: 1000, margen: 8.2, hgKg: sanLuis.hg }]);
  assert.ok(Math.abs(same.margen - sanLuis.margen) < 1e-9);
  assert.equal(same.hg, same.y);
});

test("una sola request, sin Forecast, gastos 062 y endpoint de solo lectura", () => {
  assert.equal(effect.split("fetchIgfDiarioAcumulado(").length - 1, 1);
  assert.doesNotMatch(effect, /fetchIgfDiarioGrafica/);
  assert.doesNotMatch(effect, /Promise\.all/);
  assert.match(applyFn, /if \(missingAcumuladoPlants\(mini\.rows \|\| \[\], byPlant\)\.length\) return null/);
  assert.doesNotMatch(applyFn, /igfMini/);
  assert.match(route, /dashboardAuthMiddleware/);
  assert.match(route, /dashboardBlockGAFinancialKpis/);
  assert.match(route, /dashboardBlockGVForbidden/);
  assert.match(route, /overrideVisible/);
  assert.doesNotMatch(route, /INSERT |UPDATE |DELETE /);
  assert.match(GASTOS, /manual != null/);
  assert.doesNotMatch(GASTOS, /operativos \|\|/);
  const pair = gastos.effectivePair(
    { operativos: 10, corporativos: 20 },
    [{ plant_code: "Puebla", operativos: 0, corporativos: null }],
    ["Puebla"]
  );
  assert.equal(pair.operativos, 0);
  assert.equal(pair.corporativos, 20);
  assert.match(PUEBLA, /\[13, opts && opts\.corporativos\], \[20, opts && opts\.operativos\]/);
});
