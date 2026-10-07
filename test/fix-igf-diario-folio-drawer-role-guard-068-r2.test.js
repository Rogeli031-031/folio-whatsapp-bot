"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const UI = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioFoliosDepositoMatrix.tsx"), "utf8");
const DRAWER = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "FolioDrawer.tsx"), "utf8");

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `${start} .. ${end}`);
  return source.slice(from, to);
}

test("un rol conocido abre FolioDrawer con ese rol y uno vacío no lo abre", () => {
  const handler = between(UI, "const handleOpenFolio", "return (");
  assert.match(handler, /if \(!resolvedRole\)/);
  assert.match(handler, /setOpenFolioId\(null\)/);
  assert.match(handler, /No se pudo validar el rol para abrir el folio\./);
  assert.match(handler, /return;/);
  assert.match(handler, /setOpenFolioId\(id\)/);
  assert.doesNotMatch(handler, /setSelected\(null\)/);
  assert.ok(handler.indexOf("if (!resolvedRole)") < handler.indexOf("setOpenFolioId(id)"));

  const mount = between(UI, "{openFolioId != null && resolvedRole", "</section>");
  assert.match(mount, /<FolioDrawer/);
  assert.match(mount, /role=\{resolvedRole\}/);
  assert.match(mount, /onClose=\{\(\) => setOpenFolioId\(null\)\}/);
  assert.doesNotMatch(mount, /role=""|role=\{""\}|role=\{dashboardRole \|\| ""\}/);
  assert.doesNotMatch(UI, /role="GG"|role="AD"|role="ZP"|role=\{"GG"\}|role=\{"AD"\}|role=\{"ZP"\}/);
  assert.doesNotMatch(handler, /["']GG["']|["']AD["']|["']ZP["']/);
});

test("la tarjeta conserva el click, el botón y el modal detrás del drawer", () => {
  const card = between(UI, "function FolioCard", "function CellLines");
  assert.match(card, /onClick=\{open\}/);
  assert.match(card, /Abrir folio →/);
  assert.match(card, /onOpen\(folio\.id\)/);
  assert.match(card, /line-clamp-3/);
  assert.match(UI, /<FolioCard key=\{folio\.id\} folio=\{folio\} onOpen=\{handleOpenFolio\}/);
  const dialog = between(UI, 'aria-label="Detalle de folios"', "{openFolioId != null && resolvedRole");
  assert.match(dialog, /role="status"/);
  assert.match(dialog, /\{roleNotice\}/);
  assert.doesNotMatch(dialog, /<table|<th/);
  assert.match(UI, /z-30/);
  assert.match(DRAWER, /z-40/);
  assert.match(DRAWER, /z-50/);
  assert.match(UI, /Depósito y cierre/);
  assert.doesNotMatch(UI, /role=\{dashboardRole \|\| ""\}/);
});
