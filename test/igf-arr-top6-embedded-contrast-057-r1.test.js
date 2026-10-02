"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ARR = fs.readFileSync(
  path.join(__dirname, "..", "frontend-dashboard", "components", "ArrVentaGraficaModal.tsx"),
  "utf8"
);
const VIEW = ARR.slice(ARR.indexOf("export function ArrVentaSerieView"));

test("el Top 6 embedded recupera fondo blanco y el normal conserva el aside ancho", () => {
  assert.match(
    VIEW,
    /embedded \? "w-full rounded-lg border border-slate-200 bg-white p-3" : "w-full shrink-0 rounded-lg border border-slate-200 bg-white p-3 lg:w-\[640px\]"/
  );
  assert.match(VIEW, /embedded \? "flex flex-col gap-3"/);
  assert.match(VIEW, /embedded \? "relative w-full"/);
  assert.match(VIEW, /className="h-auto w-full"/);
  assert.match(VIEW, /const W = 980/);
  assert.match(VIEW, /const H = embedded \? 330 : 460/);
  assert.doesNotMatch(VIEW, /max-h-\[320px\]/);
  assert.doesNotMatch(VIEW, /lg:w-\[240px\]/);
  assert.match(VIEW, /whitespace-normal break-words/);
  assert.match(VIEW, /cliente\.comentarios\.slice\(0, 2\)/);
  assert.match(VIEW, /onClienteDoubleClick\?\.\(cliente\.cliente\)/);
  assert.match(VIEW, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
});
