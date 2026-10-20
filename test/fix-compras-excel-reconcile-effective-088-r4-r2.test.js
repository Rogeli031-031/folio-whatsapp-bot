"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const compras = require("../lib/compras-dashboard");

function row(extra) {
  return {
    id: 11,
    planta_id: 1,
    proveedor_id: 1,
    fecha: "2026-10-07",
    kg: 18750,
    importe: 189281.25,
    excel_kg: 18750,
    excel_importe: 188240.625,
    provenance: "CAPTURED",
    reconcile_action: "MATCHED_PRESERVED",
    discrepant: true,
    ...extra,
  };
}

describe("088-R4-R2 total efectivo y discrepancia viva", () => {
  it("A–E la discrepancia actual no reescribe la línea histórica", () => {
    const yellow = compras.mapPurchase(row());
    assert.equal(yellow.discrepant, true);
    assert.equal(yellow.historical_discrepant, true);
    const matched = compras.mapPurchase(row({ importe: 188240.63, discrepant: true }));
    assert.equal(matched.discrepant, false);
    assert.equal(matched.historical_discrepant, true);
    const edited = compras.mapPurchase(row({ importe: 190000, discrepant: false }));
    assert.equal(edited.discrepant, true);
    assert.equal(edited.historical_discrepant, false);
    const excelOnly = compras.mapPurchase(row({
      importe: 188240.63,
      provenance: "EXCEL_ONLY",
      reconcile_action: "INSERTED",
      discrepant: true,
    }));
    assert.equal(excelOnly.discrepant, false);
    assert.equal(excelOnly.excel_only, true);
    const src = fs.readFileSync(path.join(__dirname, "../lib/compras-dashboard.js"), "utf8");
    const patch = src.slice(src.indexOf("async function patchPurchase"), src.indexOf("async function deletePurchase"));
    assert.equal(/compras_import_lineas|compras_effective/.test(patch), false);
    assert.match(patch, /UPDATE arr\.compras/);
  });

  it("F–I el total del día usa solo valores efectivos", () => {
    const total = compras.detailDayTotal([
      { kg: 18750, importe: 189281.25, effective_kg: 18750, effective_importe: 188240.625 },
      { kg: 18290, importe: 184637.55, effective_kg: 18290, effective_importe: 184637.55 },
    ]);
    assert.equal(total.usesEffective, true);
    assert.equal(total.kg, 18750 + 18290);
    assert.equal(total.importe, 188240.625 + 184637.55);
    assert.notEqual(total.importe, 189281.25 + 184637.55);
    assert.equal(total.costo, total.importe / total.kg);
    const plain = compras.detailDayTotal([
      { kg: 10, importe: 100 },
      { kg: 5, importe: 40 },
    ]);
    assert.equal(plain.usesEffective, false);
    assert.equal(plain.kg, 15);
    assert.equal(plain.importe, 140);
    assert.equal(plain.costo, 140 / 15);
    const ui = fs.readFileSync(path.join(__dirname, "../frontend-dashboard/components/ComprasClient.tsx"), "utf8");
    assert.equal(ui.includes("p.effective_kg ?? p.kg"), true);
    assert.equal(ui.includes("p.effective_importe ?? p.importe"), true);
    assert.equal(ui.includes("TOTAL DEL DIA — USADO PARA CALCULO"), true);
    assert.equal(ui.includes("TOTAL DEL DÍA"), true);
  });

  it("J la fecha amarilla sigue la captura vigente", () => {
    const providers = [{ id: 1, nombre: "PEMEX TUXPAN" }];
    const before = compras.mapPurchase(row());
    const open = compras.aggregatePurchases([before], providers, 2026, 10);
    assert.equal(open.days.find((day) => day.ymd === "2026-10-07").fecha_discrepante, true);
    const after = compras.mapPurchase(row({ importe: 188240.63, discrepant: true }));
    const closed = compras.aggregatePurchases([after], providers, 2026, 10);
    assert.equal(closed.days.find((day) => day.ymd === "2026-10-07").fecha_discrepante, false);
    assert.equal(after.historical_discrepant, true);
    const again = compras.mapPurchase(row({ importe: 190000, discrepant: true }));
    const reopened = compras.aggregatePurchases([again], providers, 2026, 10);
    assert.equal(reopened.days.find((day) => day.ymd === "2026-10-07").fecha_discrepante, true);
  });
});
