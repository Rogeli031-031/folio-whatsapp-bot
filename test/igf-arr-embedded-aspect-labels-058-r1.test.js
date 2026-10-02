"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const IGF = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
const ARR = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ArrVentaGraficaModal.tsx"), "utf8");
const VIEW = ARR.slice(ARR.indexOf("export function ArrVentaSerieView"));

test("la geometría embedded baja el viewBox sin estirar el SVG", () => {
  assert.match(VIEW, /const W = 980/);
  assert.match(VIEW, /const H = embedded \? 330 : 460/);
  assert.match(VIEW, /\}, \[series, range, isCliente, embedded\]\)/);
});

test("el SVG conserva la proporción y no fija 240px", () => {
  assert.match(VIEW, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(VIEW, /className="h-auto w-full"/);
  assert.doesNotMatch(VIEW, /preserveAspectRatio=\{embedded \? "none"/);
  assert.doesNotMatch(VIEW, /h-\[240px\]/);
});

test("Prev y Actual muestran prefijo hasta el mismo breakpoint del header", () => {
  assert.match(VIEW, /className="xl:hidden">Prev /);
  assert.match(VIEW, /className="xl:hidden">Actual /);
  assert.doesNotMatch(VIEW, /className="md:hidden">Prev /);
  assert.doesNotMatch(VIEW, /className="md:hidden">Actual /);
  assert.match(VIEW, /xl:grid xl:grid-cols-\[28px_minmax\(140px,1\.8fr\)/);
});

test("el layout 058 y el Top 6 de siete columnas siguen", () => {
  assert.match(IGF, /xl:grid-cols-\[minmax\(0,44fr\)_minmax\(0,56fr\)\]/);
  assert.match(IGF, /2xl:grid-cols-\[minmax\(0,46fr\)_minmax\(0,54fr\)\]/);
  assert.match(
    VIEW,
    /xl:grid-cols-\[28px_minmax\(140px,1\.8fr\)_minmax\(72px,0\.7fr\)_minmax\(78px,0\.7fr\)_minmax\(56px,0\.55fr\)_minmax\(56px,0\.55fr\)_minmax\(150px,1\.8fr\)\]/
  );
});
