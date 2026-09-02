"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  syncDetalleLineasPrincipalBeneficiario,
} = require("../lib/folio-detalle-lineas-principal-beneficiario");

const ROOT = path.join(__dirname, "..");
const SERVER_SRC = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const HELPER_SRC = fs.readFileSync(
  path.join(ROOT, "lib", "folio-detalle-lineas-principal-beneficiario.js"),
  "utf8"
);

describe("syncDetalleLineasPrincipalBeneficiario", () => {
  it("caso A: sin detalle_lineas no fabrica JSON", () => {
    assert.deepEqual(syncDetalleLineasPrincipalBeneficiario(null, "B"), {
      synced: false,
      detalle_lineas: null,
    });
    assert.deepEqual(syncDetalleLineasPrincipalBeneficiario([], "B"), {
      synced: false,
      detalle_lineas: null,
    });
    assert.deepEqual(syncDetalleLineasPrincipalBeneficiario("not-json", "B"), {
      synced: false,
      detalle_lineas: null,
    });
  });

  it("caso B: una línea A → B", () => {
    const raw = [{ beneficiario: "A", concepto: "Diesel", importe: 10, extra: "keep" }];
    const out = syncDetalleLineasPrincipalBeneficiario(raw, "B");
    assert.equal(out.synced, true);
    assert.equal(out.detalle_lineas.length, 1);
    assert.equal(out.detalle_lineas[0].beneficiario, "B");
    assert.equal(out.detalle_lineas[0].concepto, "Diesel");
    assert.equal(out.detalle_lineas[0].importe, 10);
    assert.equal(out.detalle_lineas[0].extra, "keep");
    assert.equal(raw[0].beneficiario, "A");
  });

  it("caso C: múltiples líneas no toca 1..N", () => {
    const line1 = { beneficiario: "X", concepto: "Dos", importe: 2 };
    const line2 = { beneficiario: "Y", concepto: "Tres", importe: 3 };
    const raw = [{ beneficiario: "A", concepto: "Uno", importe: 1 }, line1, line2];
    const out = syncDetalleLineasPrincipalBeneficiario(JSON.stringify(raw), "B");
    assert.equal(out.synced, true);
    assert.equal(out.detalle_lineas[0].beneficiario, "B");
    assert.deepEqual(out.detalle_lineas[1], { beneficiario: "X", concepto: "Dos", importe: 2 });
    assert.deepEqual(out.detalle_lineas[2], { beneficiario: "Y", concepto: "Tres", importe: 3 });
  });
});

describe("PATCH /api/folios/:id/editar persistencia", () => {
  it("usa el helper en el mismo UPDATE y no reescribe getFolioLineasFromRow", () => {
    const editar = SERVER_SRC.slice(
      SERVER_SRC.indexOf('app.patch("/api/folios/:id/editar"'),
      SERVER_SRC.indexOf('app.post("/api/folios/:id/solicitar-por-recuperar"')
    );
    assert.match(editar, /syncDetalleLineasPrincipalBeneficiario/);
    assert.match(editar, /detalle_lineas = \$\$\{\s*idx\s*\}::jsonb/);
    assert.match(editar, /Edición AD: \$\{cambiosTxt\}/);
    assert.match(editar, /insertHistorial\(/);
    assert.doesNotMatch(editar, /Edición AD:.*detalle_lineas/);
    const reader = SERVER_SRC.slice(
      SERVER_SRC.indexOf("function getFolioLineasFromRow"),
      SERVER_SRC.indexOf("async function insertFolio")
    );
    assert.match(
      reader,
      /if \(Array\.isArray\(parsed\) && parsed\.length\) \{\s*const lineas = parsed/
    );
    assert.doesNotMatch(HELPER_SRC, /concepto:/);
    assert.doesNotMatch(HELPER_SRC, /importe:/);
  });

  it("documentos siguen leyendo JSON por línea y póliza la columna", () => {
    const folioDoc = SERVER_SRC.slice(
      SERVER_SRC.indexOf('app.get("/api/folios/:id/documento-folio"'),
      SERVER_SRC.indexOf('app.get("/api/folios/:id/documento-completo"')
    );
    const gastosDoc = SERVER_SRC.slice(
      SERVER_SRC.indexOf('app.get("/api/folios/:id/documento-gastos"'),
      SERVER_SRC.indexOf('app.get("/api/folios/:id/documento-folio"')
    );
    const completoDoc = SERVER_SRC.slice(
      SERVER_SRC.indexOf('app.get("/api/folios/:id/documento-completo"'),
      SERVER_SRC.indexOf('app.patch("/api/folios/:id"')
    );
    const polizaFn = SERVER_SRC.slice(
      SERVER_SRC.indexOf("async function generatePolizaPdfBytes"),
      SERVER_SRC.indexOf('app.get("/api/folios/:id/poliza/documento"')
    );
    assert.match(folioDoc, /getFolioLineasFromRow/);
    assert.match(gastosDoc, /getFolioLineasFromRow/);
    assert.match(completoDoc, /getFolioLineasFromRow/);
    assert.match(completoDoc, /generatePolizaPdfBytes\(folio/);
    assert.match(polizaFn, /const beneficiario = \(folio\.beneficiario \|\| ""\)\.trim\(\)/);
  });
});
