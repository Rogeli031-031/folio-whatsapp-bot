"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const engine = require("../lib/commercial-trend-engine");
const igf = require("../lib/igf-diario-puebla");
const grafica = require("../lib/igf-diario-grafica");

const ROOT = path.join(__dirname, "..");
const IGF = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
const PANEL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ArrVentaCanalPanel.tsx"), "utf8");
const ARR = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ArrVentaGraficaModal.tsx"), "utf8");
const DELTA = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "DeltaIngresoClienteForecastModal.tsx"), "utf8");
const API = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "api.ts"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const ENGINE = fs.readFileSync(path.join(ROOT, "lib", "commercial-trend-engine.js"), "utf8");
const GRAFICA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");

function weekGridSpan(points, week) {
  let start = -1;
  let end = -1;
  points.forEach((point, index) => {
    if (point.fecha >= week.fecha_desde && point.fecha <= week.fecha_hasta) {
      if (start < 0) start = index;
      end = index;
    }
  });
  if (start < 0 || end < 0) return null;
  return { gridColumnStart: start + 1, gridColumnEnd: end + 2 };
}

function monthPoints(year, month) {
  const last = new Date(year, month, 0).getDate();
  const points = [];
  for (let day = 1; day <= last; day += 1) {
    points.push({ fecha: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` });
  }
  return points;
}

function weekBounds(year, month) {
  return igf.weeksOf(igf.monthBusinessDays(year, month).days).map((days) => ({
    fecha_desde: days[0].fecha,
    fecha_hasta: days[days.length - 1].fecha,
    length: days.length,
  }));
}

test("tendencia IGF es amarilla sólida y el proyectado sigue punteado", () => {
  assert.match(IGF, /stroke="#facc15"/);
  assert.match(IGF, /bg-yellow-300/);
  assert.match(IGF, /Tendencia real/);
  assert.match(IGF, /stroke=\{point\.estado === "proyectado" \? "#fcd34d" : "#38bdf8"\}/);
  assert.match(IGF, /strokeDasharray=\{point\.estado === "proyectado" \? "5 4" : undefined\}/);
  assert.match(IGF, /chart\.trend\.xFirst/);
  assert.match(IGF, /chart\.trend\.xLast/);
  assert.doesNotMatch(IGF, /stroke="#ffffff"/);
});

test("semanas se alinean por fecha y una semana parcial no ocupa días ajenos", () => {
  assert.match(IGF, /point\.fecha >= week\.fecha_desde && point\.fecha <= week\.fecha_hasta/);
  assert.match(IGF, /gridColumnStart: start \+ 1, gridColumnEnd: end \+ 2/);
  assert.match(IGF, /gridTemplateColumns: `repeat\(\$\{chart\.points\.length\}, minmax\(0, 1fr\)\)`/);
  const september = monthPoints(2026, 9);
  const weeks = weekBounds(2026, 9);
  assert.equal(new Date("2026-09-01T12:00:00Z").getUTCDay(), 2);
  const first = weekGridSpan(september, weeks[0]);
  assert.equal(weeks[0].fecha_desde, "2026-09-01");
  assert.equal(weeks[0].fecha_hasta, "2026-09-06");
  assert.equal(first.gridColumnStart, 1);
  assert.equal(first.gridColumnEnd, 7);
  const last = weeks[weeks.length - 1];
  const lastSpan = weekGridSpan(september, last);
  assert.equal(last.fecha_desde, "2026-09-28");
  assert.equal(last.fecha_hasta, "2026-09-30");
  assert.equal(lastSpan.gridColumnEnd - lastSpan.gridColumnStart, last.length);
  assert.ok(last.length < 7);
  const april = monthPoints(2026, 4);
  const aprilWeeks = weekBounds(2026, 4);
  assert.equal(new Date("2026-04-01T12:00:00Z").getUTCDay(), 3);
  const aprilFirst = weekGridSpan(april, aprilWeeks[0]);
  assert.equal(aprilWeeks[0].fecha_desde, "2026-04-01");
  assert.equal(aprilWeeks[0].fecha_hasta, "2026-04-05");
  assert.equal(aprilFirst.gridColumnEnd - aprilFirst.gridColumnStart, 5);
});

test("el cierre queda fuera del grid y conserva los campos 055", () => {
  assert.match(IGF, /w-\[180px\]/);
  assert.match(IGF, /month_close\.resultado_mxn/);
  assert.match(IGF, /month_close\.resultado_per_kg/);
  assert.match(IGF, /month_close\.venta_kg/);
  assert.match(IGF, /month_close\.complete/);
  assert.match(IGF, /month_close\.has_projection/);
  assert.match(GRAFICA, /resultado_mxn \/ venta_kg|resultadoMxn \/ ventaKg/);
  assert.doesNotMatch(GRAFICA.slice(GRAFICA.indexOf("function buildMonthClose"), GRAFICA.indexOf("async function loadLiveGrafica")), /linearTrend/);
});

test("CASA y COMISIONISTA usan fetchArrVentaSerie y el Top 6 del response", () => {
  assert.match(IGF, /canal="casa"/);
  assert.match(IGF, /canal="comisionista"/);
  assert.match(IGF, /range=\{range as ArrVentaSerieRange\}/);
  assert.match(PANEL, /fetchArrVentaSerie/);
  assert.match(PANEL, /setClientesTop\(data\.clientes_top \|\| \[\]\)/);
  assert.match(PANEL, /setPoints\(data\.points \|\| \[\]\)/);
  assert.doesNotMatch(PANEL, /sort\(/);
  assert.match(PANEL, /Δ \{fmtTonSigned/);
  assert.match(PANEL, /Prev /);
  assert.match(PANEL, /Actual /);
});

test("doble clic abre el cliente y un clic no", () => {
  assert.match(PANEL, /onDoubleClick=\{\(event\) => \{/);
  assert.match(PANEL, /event\.stopPropagation\(\)/);
  assert.match(PANEL, /onClienteDoubleClick\?\.\(cliente\.cliente\)/);
  assert.match(PANEL, /title="Doble clic para abrir gráfica del cliente"/);
  assert.match(PANEL, /cursor-pointer/);
  assert.doesNotMatch(PANEL, /onClick=\{[^}]*onClienteDoubleClick/);
  assert.match(IGF, /mode="cliente"/);
  assert.match(IGF, /clienteNorm=\{arrCliente\}/);
  assert.match(IGF, /onClose=\{\(\) => setArrCliente\(null\)\}/);
  assert.match(IGF, /Gráfica · Rentabilidad IGF Diario/);
});

test("el rango compartido y el gate de Provincia quedan antes de leer datos", () => {
  const start = SERVER.indexOf('app.get("/api/arr/venta-serie"');
  const head = SERVER.slice(start, start + 1800);
  const gate = head.indexOf("igfDiarioTodasRequestBlock");
  const connect = head.indexOf("pool.connect()");
  assert.ok(gate > 0 && connect > gate);
  assert.match(head, /provincia/);
  assert.match(head, /Provincia requiere provincia=1/);
  assert.match(API, /if \(params\.provincia\) q\.provincia = "1"/);
  assert.match(IGF, /provincia=\{todas\}/);
  assert.doesNotMatch(IGF, /<span>Clientes nuevos<\/span>/);
  assert.match(GRAFICA, /function newClientsPanel/);
  assert.match(DELTA, /mode="cliente"/);
  assert.match(DELTA, /GRAFICA/);
  assert.match(ARR, /Venta CASA/);
  assert.match(ARR, /cliente_norm: isCliente && clienteLabel \? clienteLabel : undefined/);
  assert.doesNotMatch(ENGINE, /openai|INSERT INTO|CREATE TABLE|ALTER TABLE/);
});

test("Provincia suma el día, agrupa el Top 6 y reutiliza el cliente", async () => {
  const seen = [];
  const result = await engine.loadCommercialTrend({ query() { return { rows: [] }; } }, {
    empresa: "Provincia",
    range: "1m",
    canal: "casa",
    resolvePlantCodes: async () => ({
      not_found: false,
      uniqueCodes: ["Puebla", "Acapulco"],
      plantCode: "Provincia",
    }),
    queryBounds: async (_client, codes) => {
      seen.push(codes);
      return { rows: [{ min_f: "2026-09-01", max_f: "2026-09-02" }] };
    },
    querySalesSeries: async (_client, codes) => {
      seen.push(codes);
      return { rows: [
        { fecha: "2026-09-01", venta_ton: 10 },
        { fecha: "2026-09-01", venta_ton: 4 },
      ] };
    },
    queryDiscountSeries: async () => ({ rows: [] }),
    queryClientTons: async (_client, codes, _start, end, _canal, clienteNorm) => {
      seen.push({ codes, clienteNorm: clienteNorm || null });
      const actual = String(end) >= "2026-09-01";
      if (clienteNorm) return { rows: [{ cliente: clienteNorm, venta_ton: actual ? 14 : 4 }] };
      return { rows: [{ cliente: "CLIENTE UNO", venta_ton: actual ? 14 : 4 }] };
    },
  });
  assert.equal(result.points[0].venta_ton, 14);
  assert.equal(result.clientes_top.length, 1);
  assert.equal(result.clientes_top[0].cliente, "CLIENTE UNO");
  assert.ok(seen.every((item) => Array.isArray(item) ? item.includes("PUEBLA") && item.includes("ACAPULCO") : item.codes.includes("PUEBLA")));

  const client = await engine.loadCommercialTrend({ query() { return { rows: [] }; } }, {
    empresa: "Provincia",
    range: "1m",
    canal: "ambos",
    cliente_norm: "CLIENTE UNO",
    resolvePlantCodes: async () => ({ not_found: false, uniqueCodes: ["Puebla", "Acapulco"], plantCode: "Provincia" }),
    queryBounds: async () => ({ rows: [{ min_f: "2026-09-01", max_f: "2026-09-02" }] }),
    querySalesSeries: async () => ({ rows: [{ fecha: "2026-09-01", venta_ton: 9 }, { fecha: "2026-09-01", venta_ton: 5 }] }),
    queryDiscountSeries: async () => ({ rows: [] }),
    queryClientTons: async (_client, _codes, _a, _b, _canal, clienteNorm) => ({
      rows: [{ cliente: clienteNorm, venta_ton: clienteNorm === "CLIENTE UNO" ? 14 : 0 }],
    }),
  });
  assert.equal(client.cliente_norm, "CLIENTE UNO");
  assert.equal(client.points[0].venta_ton, 14);
  assert.equal(client.clientes_top[0].cliente, "CLIENTE UNO");
  assert.equal(client.clientes_top[0].venta_ton_actual, 14);
});

test("resolveAllProvinciaPlantCodes incluye las plantas de provincia y no una ajena", async () => {
  const client = {
    async query(sql) {
      const text = String(sql);
      if (text.includes("public.plantas")) {
        return { rows: [
          { prov_name: "Puebla", clave: "E1", ap_plant_code: "Puebla" },
          { prov_name: "Acapulco", clave: "E3", ap_plant_code: "Acapulco" },
        ] };
      }
      if (text.includes("ventas_diarias_cliente")) {
        return { rows: [{ plant_code: "Puebla" }, { plant_code: "Acapulco" }, { plant_code: "OTRA" }] };
      }
      return { rows: [] };
    },
  };
  const resolved = await engine.resolveAllProvinciaPlantCodes(client);
  assert.equal(resolved.not_found, false);
  assert.ok(resolved.uniqueCodes.includes("Puebla"));
  assert.ok(resolved.uniqueCodes.includes("Acapulco"));
  assert.equal(resolved.uniqueCodes.includes("OTRA"), false);
  assert.equal(resolved.plantCode, "Provincia");
  assert.equal(typeof grafica.newClientsPanel, "function");
});
