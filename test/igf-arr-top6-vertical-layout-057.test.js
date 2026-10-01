"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const ARR = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ArrVentaGraficaModal.tsx"), "utf8");
const VIEW = ARR.slice(ARR.indexOf("export function ArrVentaSerieView"));
const embeddedRows = VIEW.slice(VIEW.indexOf("whitespace-normal break-words text-xs"), VIEW.indexOf("truncate text-xs"));

test("embedded es vertical y no limita la altura", () => {
  assert.match(VIEW, /embedded \? "flex flex-col gap-3" : "flex flex-col gap-3 lg:flex-row lg:items-stretch"/);
  assert.match(VIEW, /embedded \? "relative w-full"/);
  assert.match(VIEW, /className="h-auto w-full"/);
  assert.match(VIEW, /embedded \? "w-full rounded-lg border border-slate-200 bg-white p-3"/);
  assert.match(VIEW, /lg:w-\[640px\]/);
  assert.doesNotMatch(VIEW, /max-h-\[320px\]/);
  assert.doesNotMatch(VIEW, /lg:w-\[240px\]/);
  assert.match(VIEW, /const W = 980/);
  assert.match(VIEW, /const H = 460/);
  assert.equal(VIEW.split("function linearTrend").length, 1);
});

test("el Top 6 embedded es un renglón por cliente a todo el ancho", () => {
  assert.equal(VIEW.split("clientesTop.map").length - 1, 1);
  assert.match(VIEW, /grid w-full grid-cols-1/);
  assert.match(VIEW, /md:grid-cols-\[minmax\(0,2fr\)_minmax\(72px,100px\)_minmax\(64px,90px\)_minmax\(64px,90px\)_minmax\(64px,90px\)_minmax\(0,2fr\)\]/);
  assert.match(embeddedRows, /\{idx \+ 1\}\. \{cliente\.cliente\}/);
  assert.match(embeddedRows, /tipoLabel\(String\(cliente\.tipo\)\)/);
  assert.match(embeddedRows, /fmtTonSigned\(cliente\.delta_ton\)/);
  assert.match(embeddedRows, /cliente\.venta_ton_prev/);
  assert.match(embeddedRows, /cliente\.venta_ton_actual/);
  assert.match(VIEW, /cliente\.comentarios\.slice\(0, 2\)/);
  assert.doesNotMatch(VIEW, /clientesTop\.sort|clientesTop\.slice/);
});

test("el nombre embedded no se trunca y el normal sí puede", () => {
  assert.match(embeddedRows, /whitespace-normal break-words/);
  assert.doesNotMatch(embeddedRows, /truncate/);
  assert.match(VIEW, /className="truncate text-xs font-semibold text-slate-800"/);
});

test("el doble clic sigue en la fila y el clic simple no abre", () => {
  assert.match(VIEW, /title=\{onClienteDoubleClick \? "Doble clic para abrir gráfica del cliente" : undefined\}/);
  assert.match(VIEW, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(VIEW, /onDoubleClick=\{\(event\) => \{/);
  assert.match(VIEW, /onClienteDoubleClick\?\.\(cliente\.cliente\)/);
  assert.doesNotMatch(VIEW, /onClick=\{[^}]*onClienteDoubleClick/);
});

test("el modal normal conserva gráfica a la izquierda y aside ancho", () => {
  assert.match(VIEW, /lg:flex-row lg:items-stretch/);
  assert.match(VIEW, /lg:w-\[640px\]/);
  assert.match(VIEW, /MOVIMIENTO DEL CLIENTE/);
  assert.match(VIEW, /ÚLTIMOS COMENTARIOS/);
  assert.match(VIEW, /Prev: /);
  assert.match(VIEW, /Actual: /);
});
