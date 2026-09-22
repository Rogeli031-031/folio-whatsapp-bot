"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  assemblePoints,
  resolveRangeWindow,
  computeTrendFromPoints,
} = require("../lib/commercial-trend-engine");

const ROOT = path.join(__dirname, "..");
const GRAFICA = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "components", "ArrVentaGraficaModal.tsx"),
  "utf8"
);
const ENGINE = fs.readFileSync(path.join(ROOT, "lib", "commercial-trend-engine.js"), "utf8");
const DELTA = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "components", "DeltaIngresoClienteForecastModal.tsx"),
  "utf8"
);
const PAGE = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "app", "page.tsx"), "utf8");
const ARR_CLIENT = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "app", "arr", "ArrClient.tsx"),
  "utf8"
);

const RANGOS = ["1d", "5d", "1m", "3m", "ytd", "1a", "5a", "todo"];

function discountGraphValue(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Math.abs(Number(n));
}

function fmtDescKg(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${Math.abs(n).toLocaleString("es-MX", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}/kg`;
}

function buildGappedPath(points) {
  let d = "";
  let penDown = false;
  for (const p of points) {
    if (p.y == null || !Number.isFinite(p.y)) {
      penDown = false;
      continue;
    }
    d += penDown ? ` L ${p.x} ${p.y}` : ` M ${p.x} ${p.y}`;
    penDown = true;
  }
  return d;
}

describe("IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019 A–C series y fechas", () => {
  it("A) modo cliente muestra Venta + Descuento", () => {
    assert.match(GRAFICA, /isCliente && \(/);
    assert.match(GRAFICA, /Venta \(Ton\)/);
    assert.match(GRAFICA, /Descuento \(\$\/kg\)/);
    assert.match(GRAFICA, /descPath/);
    assert.match(GRAFICA, /buildGappedPath/);
  });

  it("B) modo canal sigue igual", () => {
    assert.match(GRAFICA, /mode = "canal"/);
    assert.match(GRAFICA, /Venta CASA/);
    assert.match(GRAFICA, /Venta COMISIONISTA/);
    assert.match(GRAFICA, /const descPath = isCliente/);
    assert.doesNotMatch(ARR_CLIENT, /mode="cliente"/);
  });

  it("C) mismas fechas para venta/descuento", () => {
    assert.match(GRAFICA, /chart\.pts\.map\(\(p\) => \(\{ x: p\.x, y: p\.yDesc \}\)\)/);
    assert.match(GRAFICA, /yDesc: desc == null \? null : yOfDesc\(desc\)/);
    assert.doesNotMatch(GRAFICA, /fechas artificiales|syntheticDates/);
    const pts = assemblePoints(
      [
        { fecha: "2026-09-01", venta_ton: 13.4 },
        { fecha: "2026-09-02", venta_ton: 15.2 },
        { fecha: "2026-09-03", venta_ton: 11.8 },
      ],
      [
        { fecha: "2026-09-01", descuento_mxn: 79408.4 },
        { fecha: "2026-09-03", descuento_mxn: 71980 },
      ]
    );
    assert.deepEqual(
      pts.map((p) => p.fecha),
      ["2026-09-01", "2026-09-02", "2026-09-03"]
    );
    assert.equal(pts[0].descuento_kg, 5.926);
    assert.equal(pts[1].descuento_kg, null);
    assert.equal(pts[2].descuento_kg, 6.1);
    const path = buildGappedPath([
      { x: 1, y: 10 },
      { x: 2, y: null },
      { x: 3, y: 12 },
    ]);
    assert.equal(path, " M 1 10 M 3 12");
  });
});

describe("IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019 D–K mismas ventanas", () => {
  it("D–K) 1D 5D 1M 3M YTD 1A 5A Todo sin lógica temporal nueva", () => {
    for (const id of RANGOS) {
      assert.match(GRAFICA, new RegExp(`id: "${id}"`));
    }
    const w = resolveRangeWindow("2020-01-15", "2026-09-08", "1m");
    assert.equal(w.span_days, 30);
    assert.doesNotMatch(GRAFICA, /resolveRangeWindowDesc|discountRange/);
    assert.match(GRAFICA, /setRange\(r\.id\)/);
  });
});

describe("IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019 L–O ABS / null / 0", () => {
  it("L) descuento -5.926 → gráfica +5.926", () => {
    assert.equal(discountGraphValue(-5.926), 5.926);
    assert.match(GRAFICA, /function discountGraphValue/);
    assert.match(GRAFICA, /return Math\.abs\(Number\(n\)\)/);
  });

  it("M) descuento +5.926 → gráfica +5.926", () => {
    assert.equal(discountGraphValue(5.926), 5.926);
  });

  it("N) descuento null no se convierte a 0", () => {
    assert.equal(discountGraphValue(null), null);
    assert.equal(discountGraphValue(undefined), null);
    const pts = assemblePoints([{ fecha: "2026-09-08", venta_ton: 13.95 }], []);
    assert.equal(pts[0].descuento_kg, null);
    assert.notEqual(pts[0].descuento_kg, 0);
    assert.match(GRAFICA, /yDesc == null \? null/);
    assert.match(GRAFICA, /p\.yDesc == null \? null/);
  });

  it("O) descuento real 0 permanece 0", () => {
    assert.equal(discountGraphValue(0), 0);
    const pts = assemblePoints(
      [{ fecha: "2026-09-08", venta_ton: 10 }],
      [{ fecha: "2026-09-08", descuento_mxn: 0 }]
    );
    assert.equal(pts[0].descuento_kg, 0);
    assert.match(ENGINE, /p\.has_descuento && kg > 0/);
  });
});

describe("IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019 P–U ejes, tooltip, tendencia", () => {
  it("P) eje izquierdo toneladas", () => {
    assert.match(GRAFICA, /{fmtTon\(t\.v\)}/);
    assert.match(GRAFICA, /Venta \(Ton\)/);
  });

  it("Q) eje derecho $/kg solo con descuentos", () => {
    assert.match(GRAFICA, /\$\/kg/);
    assert.match(GRAFICA, /yTicksDesc/);
    assert.match(GRAFICA, /hasDescAxis/);
    assert.match(GRAFICA, /minimumFractionDigits: 3/);
  });

  it("R) escalas independientes", () => {
    assert.match(GRAFICA, /const yOf = \(ton: number\)/);
    assert.match(GRAFICA, /const yOfDesc = \(v: number\)/);
    assert.match(GRAFICA, /const dMin = 0/);
    assert.notEqual(GRAFICA.includes("yOfDesc(s.ton)"), true);
  });

  it("S) tooltip descuento positivo", () => {
    assert.equal(fmtDescKg(-5.926), "$5.926/kg");
    assert.equal(fmtDescKg(5.926), "$5.926/kg");
    assert.match(GRAFICA, /Math\.abs\(n\)\.toLocaleString\("es-MX"/);
    assert.match(GRAFICA, /isCliente \? fmtDescKg\(active\.descuentoKg\)/);
  });

  it("T) tooltip null → \"—\"", () => {
    assert.equal(fmtDescKg(null), "—");
    assert.match(GRAFICA, /if \(n == null \|\| !Number\.isFinite\(n\)\) return "—"/);
  });

  it("U) trendline sigue siendo solo venta", () => {
    const trend = computeTrendFromPoints([
      { fecha: "2026-09-01", venta_ton: 10 },
      { fecha: "2026-09-02", venta_ton: 12 },
    ]);
    assert.ok(trend.slope != null);
    assert.match(GRAFICA, /const vals = series\.map\(\(s\) => s\.ton\)/);
    assert.match(GRAFICA, /const trend = linearTrend\(vals\)/);
    assert.match(GRAFICA, /Línea de tendencia\{isCliente \? " · venta" : ""\}/);
    assert.doesNotMatch(GRAFICA, /linearTrend\(desc/);
  });
});

describe("IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019 V–X no afectación", () => {
  it("V) tabla mensual no cambia", () => {
    assert.match(DELTA, /Venta y descuento por mes \(Enero → Forecast\)/);
    assert.match(PAGE, /Venta y descuento por mes \(Enero → Forecast\)/);
    assert.equal(DELTA.includes("discountGraphValue"), false);
    assert.equal(PAGE.includes("discountGraphValue"), false);
  });

  it("W) CASA no cambia", () => {
    assert.match(GRAFICA, /canal === "casa" \? "#ca8a04"/);
    assert.match(ARR_CLIENT, /<ArrVentaGraficaModal/);
    assert.doesNotMatch(ARR_CLIENT, /mode="cliente"/);
  });

  it("X) COMISIONISTA no cambia", () => {
    assert.match(GRAFICA, /canal === "comisionista"/);
    assert.match(GRAFICA, /Venta COMISIONISTA/);
    const canalBlock = GRAFICA.slice(0, GRAFICA.indexOf("const descPath"));
    assert.match(canalBlock, /mode = "canal"/);
  });
});

describe("IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019 contrato de dato", () => {
  it("reutiliza descuento_kg del motor, sin segundo gráfico ni persistir ABS", () => {
    assert.match(ENGINE, /Math\.abs\(descuento_mxn\) \/ kg/);
    assert.match(GRAFICA, /discountGraphValue\(p\.descuento_kg\)/);
    assert.equal(
      fs.existsSync(path.join(ROOT, "frontend-dashboard", "components", "ClienteDescuentoGraficaModal.tsx")),
      false
    );
    assert.doesNotMatch(ENGINE, /UPDATE arr\.descuentos_diarios_cliente/);
  });
});
