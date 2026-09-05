"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fx = require("./fixtures/delta-ingreso-target-proy-cut");

describe("R-DELTA-CUT fixture / TARGET_PROY_SOURCE", () => {
  it("reproduces FIRST_BAD_BOUNDARY = TARGET_PROY_SOURCE", () => {
    assert.notEqual(fx.RAW_COMPROMISO_VENTA_TON, fx.EFFECTIVE_PROY_VENTA_TON);
    assert.notEqual(fx.TARGET_KG_RAW, fx.TARGET_KG_PROY);
    assert.notEqual(fx.RANK_SHIFT_PROY.kgB, fx.RANK_SHIFT_RAW.kgB);
    assert.notEqual(fx.RANK_SHIFT_PROY.ingresoB, fx.RANK_SHIFT_RAW.ingresoB);
    assert.notEqual(fx.RANK_SHIFT_PROY.delta, fx.RANK_SHIFT_RAW.delta);
    assert.ok(fx.SIGN_FLIP_PROY.delta < 0);
    assert.ok(fx.SIGN_FLIP_RAW.delta > 0);
    assert.ok(fx.TOP5_PROY.some((c) => c.cliente === "RANK_SHIFT"));
    assert.equal(
      fx.TOP5_RAW.some((c) => c.cliente === "RANK_SHIFT"),
      false
    );
  });

  it("does not reproyect closed A when B target changes", () => {
    for (const c of fx.CLIENTS_PROY) {
      assert.equal(c.kgA, fx.BY_NAME_RAW[c.cliente].kgA);
    }
  });

  it("upload_day overlay changes effective PROY", () => {
    const a = fx.effectiveForUploadDay(fx.UPLOAD_DAY_A);
    const b = fx.effectiveForUploadDay(fx.UPLOAD_DAY_B);
    assert.equal(a.ventaTon, fx.EFFECTIVE_PROY_VENTA_TON);
    assert.equal(b.ventaTon, fx.EFFECTIVE_PROY_VENTA_TON_UPLOAD_B);
    assert.notEqual(a.targetKg, b.targetKg);
  });
});
