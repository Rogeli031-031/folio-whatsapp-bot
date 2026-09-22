"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  assemblePoints,
  assembleCommercialTrend,
  selectClientMovement,
  selectTopMovers,
  resolveRangeWindow,
  computeTrendFromPoints,
  loadCommercialTrend,
  toVentaSerieHttpBody,
  normalizeClienteNorm,
} = require("../lib/commercial-trend-engine");

const ROOT = path.join(__dirname, "..");
const ENGINE = fs.readFileSync(path.join(ROOT, "lib", "commercial-trend-engine.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const API = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "api.ts"), "utf8");
const GRAFICA = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "components", "ArrVentaGraficaModal.tsx"),
  "utf8"
);
const DELTA = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "components", "DeltaIngresoClienteForecastModal.tsx"),
  "utf8"
);
const ARR_CLIENT = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "app", "arr", "ArrClient.tsx"),
  "utf8"
);

const RANGOS = ["1d", "5d", "1m", "3m", "ytd", "1a", "5a", "todo"];
const CLIENTE_A = "HORACIO PINEDA RENTERIA";
const CLIENTE_B = "OTRO CLIENTE SA";

function fmtDescKg(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}/kg`;
}

function trendFromFixture(over = {}) {
  return assembleCommercialTrend({
    plant_code: "SAN LUIS",
    plant_codes: ["SAN LUIS"],
    range: "1m",
    canal: "ambos",
    fecha_desde: "2026-08-10",
    fecha_hasta: "2026-09-08",
    fecha_prev_desde: "2026-07-11",
    fecha_prev_hasta: "2026-08-09",
    salesRows: [
      { fecha: "2026-09-08", venta_ton: 13.95 },
      { fecha: "2026-09-01", venta_ton: 10 },
    ],
    discountRows: [{ fecha: "2026-09-08", descuento_mxn: 82666.7 }],
    cliCurRows: [{ cliente: CLIENTE_A, venta_ton: 23.95 }],
    cliPrevRows: [{ cliente: CLIENTE_A, venta_ton: 18 }],
    cliente_norm: CLIENTE_A,
    ...over,
  });
}

describe("IMPL-CLIENT-SALES-GRAPH-018 A–C botón y universo", () => {
  it("A) GRAFICA visible en Delta Ingreso cliente", () => {
    assert.match(DELTA, /GRAFICA/);
    assert.match(DELTA, /setShowClienteGrafica\(true\)/);
    assert.match(DELTA, /deltaClienteSel\.cliente\.cliente/);
  });

  it("B) abre el cliente canónico abierto", () => {
    assert.match(DELTA, /mode="cliente"/);
    assert.match(DELTA, /clienteNorm=\{clienteNormGrafica\}/);
    assert.match(
      DELTA,
      /deltaClienteSel\?\.cliente\?\.cliente[\s\S]{0,80}clienteNombre/
    );
    assert.match(GRAFICA, /cliente_norm: isCliente && clienteLabel \? clienteLabel : undefined/);
    assert.match(API, /if \(params\.cliente_norm\) q\.cliente_norm = params\.cliente_norm/);
    assert.equal(normalizeClienteNorm(`  ${CLIENTE_A}  `), CLIENTE_A);
  });

  it("C) planta/empresa del modal padre", () => {
    assert.match(DELTA, /empresa=\{planta\}/);
    assert.match(SERVER, /cliente_norm: clienteNorm \|\| null/);
  });
});

describe("IMPL-CLIENT-SALES-GRAPH-018 D aislamiento de cliente", () => {
  it("D) cliente A no incluye ventas de cliente B", async () => {
    assert.match(ENGINE, /LOWER\(TRIM\(\$\{alias\}\.cliente_norm\)\) = LOWER\(TRIM\(\$4\)\)/);
    assert.doesNotMatch(ENGINE, /cliente_norm\) LIKE/);
    const seen = [];
    const result = await loadCommercialTrend(
      { query() {} },
      {
        empresa: "GTM San Luis",
        range: "1m",
        canal: "ambos",
        cliente_norm: CLIENTE_A,
        resolvePlantCodes: async () => ({
          not_found: false,
          uniqueCodes: ["SAN LUIS"],
          plantCode: "SAN LUIS",
        }),
        queryBounds: async () => ({ rows: [{ min_f: "2025-01-01", max_f: "2026-09-08" }] }),
        querySalesSeries: async (_c, _codes, _a, _b, _canal, cliente) => {
          seen.push(["sales", cliente]);
          assert.equal(cliente, CLIENTE_A);
          return { rows: [{ fecha: "2026-09-08", venta_ton: 13.95 }] };
        },
        queryDiscountSeries: async (_c, _codes, _a, _b, _canal, cliente) => {
          seen.push(["disc", cliente]);
          assert.equal(cliente, CLIENTE_A);
          return { rows: [{ fecha: "2026-09-08", descuento_mxn: 82666.7 }] };
        },
        queryClientTons: async (_c, _codes, _a, _b, _canal, cliente) => {
          seen.push(["cli", cliente]);
          assert.equal(cliente, CLIENTE_A);
          return { rows: [{ cliente: CLIENTE_A, venta_ton: 13.95 }] };
        },
      }
    );
    assert.ok(seen.length >= 4);
    assert.ok(seen.every(([, c]) => c === CLIENTE_A));
    assert.equal(result.points.length, 1);
    assert.equal(result.points[0].venta_ton, 13.95);
    assert.equal(result.cliente_norm, CLIENTE_A);
    assert.equal(result.clientes_top.length, 1);
    assert.equal(result.clientes_top[0].cliente, CLIENTE_A);
    assert.equal(
      result.clientes_top.some((c) => c.cliente === CLIENTE_B),
      false
    );
  });
});

describe("IMPL-CLIENT-SALES-GRAPH-018 E–L mismas ventanas", () => {
  it("E–L) 1D 5D 1M 3M YTD 1A 5A Todo reutilizan resolveRangeWindow", () => {
    for (const id of RANGOS) {
      assert.match(GRAFICA, new RegExp(`id: "${id}"`));
    }
    const maxF = "2026-09-08";
    const minF = "2020-01-15";
    const w1d = resolveRangeWindow(minF, maxF, "1d");
    assert.equal(w1d.fecha_desde, "2026-09-08");
    assert.equal(w1d.fecha_hasta, "2026-09-08");
    const w5d = resolveRangeWindow(minF, maxF, "5d");
    assert.equal(w5d.fecha_desde, "2026-09-04");
    const w1m = resolveRangeWindow(minF, maxF, "1m");
    assert.equal(w1m.span_days, 30);
    const w3m = resolveRangeWindow(minF, maxF, "3m");
    assert.equal(w3m.span_days, 90);
    const wytd = resolveRangeWindow(minF, maxF, "ytd");
    assert.equal(wytd.fecha_desde, "2026-01-01");
    const w1a = resolveRangeWindow(minF, maxF, "1a");
    assert.equal(w1a.fecha_desde, "2025-09-09");
    const w5a = resolveRangeWindow(minF, maxF, "5a");
    assert.equal(w5a.fecha_desde, "2021-09-08");
    const wtodo = resolveRangeWindow(minF, maxF, "todo");
    assert.equal(wtodo.fecha_desde, "2020-01-15");
    assert.match(ENGINE, /queryFechaBounds[\s\S]*arr\.ventas_diarias_cliente/);
    assert.doesNotMatch(ENGINE, /historyLast4Weeks/);
    assert.doesNotMatch(DELTA, /historyLast4Weeks[\s\S]{0,80}ArrVentaGraficaModal/);
  });
});

describe("IMPL-CLIENT-SALES-GRAPH-018 M–P tooltip y tendencia", () => {
  it("M) tooltip toneladas del cliente", () => {
    const pts = assemblePoints([{ fecha: "2026-09-08", venta_ton: 13.95 }], []);
    assert.equal(pts[0].venta_ton, 13.95);
    assert.match(GRAFICA, /fmtTon\(active\.ton\)/);
    assert.match(GRAFICA, /Venta del día ·[\s\S]*isCliente \? clienteLabel/);
  });

  it("N) tooltip descuento del cliente \$/kg", () => {
    const pts = assemblePoints(
      [{ fecha: "2026-09-08", venta_ton: 13.95 }],
      [{ fecha: "2026-09-08", descuento_mxn: 82666.7 }]
    );
    assert.equal(pts[0].descuento_kg, 5.926);
    assert.equal(fmtDescKg(pts[0].descuento_kg), "$5.926/kg");
    assert.match(GRAFICA, /function fmtDescKg/);
    assert.match(GRAFICA, /isCliente \? fmtDescKg\(active\.descuentoKg\)/);
    assert.match(ENGINE, /Math\.abs\(descuento_mxn\) \/ kg/);
  });

  it("O) descuento inexistente → \"—\"", () => {
    const pts = assemblePoints([{ fecha: "2026-09-08", venta_ton: 13.95 }], []);
    assert.equal(pts[0].descuento_kg, null);
    assert.equal(fmtDescKg(pts[0].descuento_kg), "—");
    assert.match(GRAFICA, /if \(n == null \|\| !Number\.isFinite\(n\)\) return "—"/);
  });

  it("P) tendencia solo con la serie del cliente", () => {
    const client = trendFromFixture();
    const mixed = assembleCommercialTrend({
      plant_code: "SAN LUIS",
      range: "1m",
      canal: "ambos",
      fecha_desde: "2026-08-10",
      fecha_hasta: "2026-09-08",
      salesRows: [
        { fecha: "2026-09-08", venta_ton: 13.95 },
        { fecha: "2026-09-08", venta_ton: 80 },
      ],
      discountRows: [],
      cliCurRows: [],
      cliPrevRows: [],
    });
    const onlyClient = computeTrendFromPoints(client.points);
    assert.equal(client.trend.slope, onlyClient.slope);
    assert.notEqual(client.trend.slope, mixed.trend.slope);
    assert.match(GRAFICA, /const trend = linearTrend\(vals\)/);
    assert.match(GRAFICA, />\s*Tendencia\s*</);
    assert.doesNotMatch(GRAFICA, /Línea de forecast|forecast de venta/i);
  });
});

describe("IMPL-CLIENT-SALES-GRAPH-018 Q–U panel, comentarios, nav, empty", () => {
  it("Q) movimiento compara periodos del mismo cliente", () => {
    const mov = selectClientMovement(
      [
        { cliente: CLIENTE_A, venta_ton: 20 },
        { cliente: CLIENTE_B, venta_ton: 99 },
      ],
      [
        { cliente: CLIENTE_A, venta_ton: 12 },
        { cliente: CLIENTE_B, venta_ton: 1 },
      ],
      CLIENTE_A
    );
    assert.equal(mov.length, 1);
    assert.equal(mov[0].cliente, CLIENTE_A);
    assert.equal(mov[0].venta_ton_actual, 20);
    assert.equal(mov[0].venta_ton_prev, 12);
    assert.equal(mov[0].delta_ton, 8);
    assert.equal(mov[0].tipo, "aumento");
    assert.equal(selectClientMovement([{ cliente: CLIENTE_A, venta_ton: 5 }], [{ cliente: CLIENTE_A, venta_ton: 5 }], CLIENTE_A)[0].tipo, "sin_cambio");
    assert.equal(selectClientMovement([{ cliente: CLIENTE_A, venta_ton: 4 }], [{ cliente: CLIENTE_A, venta_ton: 9 }], CLIENTE_A)[0].tipo, "disminucion");
    assert.equal(selectClientMovement([], [{ cliente: CLIENTE_A, venta_ton: 9 }], CLIENTE_A)[0].tipo, "perdido");
    assert.equal(selectClientMovement([{ cliente: CLIENTE_A, venta_ton: 3 }], [], CLIENTE_A)[0].tipo, "nuevo");
    assert.match(GRAFICA, /MOVIMIENTO DEL CLIENTE/);
    assert.match(GRAFICA, /Sin cambio/);
  });

  it("R) comentarios corresponden al cliente", () => {
    assert.match(SERVER, /arr\.cliente_comentarios/);
    assert.match(SERVER, /lower\(trim\(cliente_nombre\)\) = ANY\(\$2::text\[\]\)/);
    assert.match(SERVER, /nombres = clientes_top\.map/);
    const body = toVentaSerieHttpBody(trendFromFixture(), "GTM San Luis");
    assert.equal(body.clientes_top.length, 1);
    assert.equal(body.clientes_top[0].cliente, CLIENTE_A);
    assert.match(GRAFICA, /ÚLTIMOS COMENTARIOS/);
    assert.match(DELTA, /ClienteComentariosPanel/);
  });

  it("S) cerrar gráfica conserva el modal padre", () => {
    assert.match(DELTA, /onClose=\{\(\) => setShowClienteGrafica\(false\)\}/);
    assert.doesNotMatch(
      DELTA,
      /ArrVentaGraficaModal[\s\S]{0,200}onClose=\{\(\) => \{[\s\S]{0,80}onClose\(/
    );
    assert.match(GRAFICA, /isCliente \? "z-\[60\]" : "z-50"/);
    assert.match(DELTA, /showClienteGrafica && clienteNormGrafica/);
  });

  it("T) no aparece selector CASA/COMISIONISTA en modo cliente", () => {
    assert.match(GRAFICA, /mode\?: "canal" \| "cliente"/);
    assert.match(GRAFICA, /!isCliente && \(/);
    assert.match(GRAFICA, /Venta CASA/);
    assert.match(GRAFICA, /Venta COMISIONISTA/);
    const selectorBlock = GRAFICA.slice(
      GRAFICA.indexOf("{!isCliente && ("),
      GRAFICA.indexOf("Línea de tendencia")
    );
    assert.match(selectorBlock, /Venta CASA/);
    assert.match(selectorBlock, /Venta COMISIONISTA/);
  });

  it("U) sin datos → estado vacío explícito", () => {
    const empty = assembleCommercialTrend({
      plant_code: "SAN LUIS",
      range: "1d",
      canal: "ambos",
      cliente_norm: CLIENTE_A,
      fecha_desde: "2026-09-08",
      fecha_hasta: "2026-09-08",
      salesRows: [],
      discountRows: [],
      cliCurRows: [],
      cliPrevRows: [],
    });
    assert.equal(empty.points.length, 0);
    assert.match(GRAFICA, /Sin ventas del cliente en este periodo\./);
    assert.doesNotMatch(GRAFICA, /forecast inventado|línea falsa/i);
  });
});

describe("IMPL-CLIENT-SALES-GRAPH-018 V–W CASA/COMISIONISTA intacta", () => {
  it("V) gráfica CASA existente sigue en modo canal", () => {
    assert.match(ARR_CLIENT, /<ArrVentaGraficaModal[\s\S]*empresa=\{empresa\.trim\(\)\}[\s\S]*onClose=/);
    assert.doesNotMatch(ARR_CLIENT, /mode="cliente"/);
    const casa = assembleCommercialTrend({
      plant_code: "PUEBLA",
      range: "1m",
      canal: "casa",
      fecha_desde: "2026-08-10",
      fecha_hasta: "2026-09-08",
      salesRows: [{ fecha: "2026-09-08", venta_ton: 4 }],
      discountRows: [{ fecha: "2026-09-08", descuento_mxn: 100 }],
      cliCurRows: [
        { cliente: CLIENTE_A, venta_ton: 20 },
        { cliente: CLIENTE_B, venta_ton: 5 },
      ],
      cliPrevRows: [
        { cliente: CLIENTE_A, venta_ton: 10 },
        { cliente: CLIENTE_B, venta_ton: 12 },
      ],
    });
    assert.equal(casa.cliente_norm, null);
    assert.ok(casa.clientes_top.length >= 2);
    assert.equal(casa.points[0].descuento_mxn, 100);
    assert.match(GRAFICA, /fmtMoney\(active\.descuento\)/);
    assert.match(GRAFICA, /Top 6 clientes/);
  });

  it("W) gráfica COMISIONISTA existente no se reemplaza", () => {
    assert.match(GRAFICA, /mode = "canal"/);
    assert.match(GRAFICA, /canal === "comisionista"/);
    const top = selectTopMovers(
      [{ cliente: CLIENTE_B, venta_ton: 8 }],
      [{ cliente: CLIENTE_B, venta_ton: 2 }]
    );
    assert.equal(top[0].tipo, "aumento");
    assert.match(API, /canal: params\.canal \|\| "ambos"/);
  });
});

describe("IMPL-CLIENT-SALES-GRAPH-018 no duplicar motor / performance / out of scope", () => {
  it("un solo componente gráfico y fetch solo al abrir GRAFICA", () => {
    const extraCharts = [
      "ClienteVentaGraficaModal",
      "ClientSalesGraphModal",
      "DicfVentaGraficaModal",
    ];
    for (const name of extraCharts) {
      assert.equal(fs.existsSync(path.join(ROOT, "frontend-dashboard", "components", `${name}.tsx`)), false);
    }
    assert.match(DELTA, /import ArrVentaGraficaModal from "@\/components\/ArrVentaGraficaModal"/);
    assert.match(DELTA, /\{showClienteGrafica && clienteNormGrafica && \(/);
    assert.doesNotMatch(DELTA, /fetchArrVentaSerie/);
  });

  it("no muta Director IA ni fórmulas Delta / Compras", () => {
    assert.doesNotMatch(DELTA, /ingresoA\s*=/);
    assert.doesNotMatch(ENGINE, /historyLast4Weeks/);
    assert.match(SERVER, /GET \/api\/arr\/venta-serie/);
  });
});
