"use strict";

/**
 * R-FOLIO-LOCATOR — regresiones congeladas de locator + inmutabilidad léxica.
 * Vocabulario de negocio solo en este archivo de tests.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { extractFolioSearchFilters, SCOPE_SUPPORT_FAMILIES } = require("../lib/director-ia-folio-search");

const NOW = new Date("2026-09-07T12:00:00-06:00");

function filters(q) {
  return extractFolioSearchFilters(q, { now: NOW });
}

describe("R-FOLIO-LOCATOR leftover y concepto inmutable", () => {
  it("R-FOLIO-LOCATOR tenemos/hay/existen y dame", () => {
    assert.equal(filters("Qué apoyos de llantas tenemos en septiembre?").concept_query, "llantas");
    assert.equal(filters("Qué folios de llantas tenemos en agosto?").concept_query, "llantas");
    assert.equal(filters("Dame los folios de agosto de llantas").concept_query, "llantas");
    assert.equal(filters("Qué apoyos tenemos en agosto?").concept_query, null);
    assert.equal(filters("Dame los folios de agosto").concept_query, null);
    assert.equal(filters("Qué apoyos hay en agosto?").concept_query, null);
  });

  it("R-FOLIO-LOCATOR inmutabilidad léxica", () => {
    assert.equal(filters("que folios de agosto fueron de RENTA DEL MES?").concept_query, "renta del mes");
    assert.equal(filters("que folios de agosto fueron de PAGO DEL MES?").concept_query, "pago del mes");
    assert.equal(filters("que folios de agosto fueron de SALDO ACTUAL?").concept_query, "saldo actual");
    assert.equal(filters("que folios de agosto fueron de MATERIAL PARA?").concept_query, "material para");
    assert.equal(filters("que folios de agosto fueron de CURSO?").concept_query, "curso");
    assert.equal(filters("que folios de agosto fueron de SERVICIO EN?").concept_query, "servicio en");
  });

  it("R-FOLIO-LOCATOR TOTAL PLAY y North Star", () => {
    const list = filters("dame los folios de agosto de TOTAL PLAY");
    assert.equal(list.analysis_mode, "LIST");
    assert.equal(list.concept_query, "total play");
    const agg = filters("cuanto suman los folios de agosto de TOTAL PLAY");
    assert.equal(agg.analysis_mode, "AGGREGATE");
    assert.equal(agg.concept_query, "total play");
    const ns = filters(
      "cuanto hemos gastado en apoyos en REMODELACION DE TALLER de enero a agosto? suma los montos en un acumulado por mes"
    );
    assert.equal(ns.scope, SCOPE_SUPPORT_FAMILIES);
    assert.equal(ns.concept_query, "remodelacion de taller");
    assert.equal(ns.analysis_mode, "AGGREGATE");
    assert.equal(ns.group_by, "MONTH");
    assert.equal(ns.cumulative, "YES");
  });
});
