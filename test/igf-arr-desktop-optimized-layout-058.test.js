"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const IGF = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
const ARR = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ArrVentaGraficaModal.tsx"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const VIEW = ARR.slice(ARR.indexOf("export function ArrVentaSerieView"));

test("el modal IGF da más ancho a la derecha desde xl", () => {
  assert.doesNotMatch(IGF, /1\.4fr/);
  assert.match(IGF, /xl:grid-cols-\[minmax\(0,44fr\)_minmax\(0,56fr\)\]/);
  assert.match(IGF, /2xl:grid-cols-\[minmax\(0,46fr\)_minmax\(0,54fr\)\]/);
  assert.ok(56 >= 52 && 54 >= 52);
  assert.match(IGF, /stroke="#facc15"/);
  assert.match(IGF, /w-\[180px\]/);
});

test("embedded sigue vertical, la gráfica va antes del Top 6 y no tiene scroll interno", () => {
  assert.match(VIEW, /embedded \? "flex flex-col gap-3"/);
  assert.match(VIEW, /embedded \? "h-\[240px\] w-full"/);
  assert.match(VIEW, /preserveAspectRatio=\{embedded \? "none"/);
  assert.match(VIEW, /const W = 980/);
  assert.match(VIEW, /const H = 460/);
  assert.ok(VIEW.indexOf('h-[240px] w-full') < VIEW.indexOf("Top 6 clientes"));
  assert.equal(VIEW.split("clientesTop.map").length - 1, 1);
  assert.match(VIEW, /whitespace-normal break-words/);
  assert.doesNotMatch(VIEW, /max-h-\[320px\]|overflow-auto/);
  assert.doesNotMatch(VIEW, /lg:w-\[240px\]/);
});

test("el modal normal y el doble clic siguen, y Provincia no se toca", () => {
  assert.match(VIEW, /lg:flex-row lg:items-stretch/);
  assert.match(VIEW, /lg:w-\[640px\]/);
  assert.match(VIEW, /onDoubleClick=\{\(event\) => \{/);
  assert.match(VIEW, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(VIEW, /onClienteDoubleClick\?\.\(cliente\.cliente\)/);
  const start = SERVER.indexOf('app.get("/api/arr/venta-serie"');
  const head = SERVER.slice(start, start + 1800);
  assert.ok(head.indexOf("igfDiarioTodasRequestBlock") < head.indexOf("pool.connect()"));
  assert.match(IGF, /provincia=\{todas\}/);
});
