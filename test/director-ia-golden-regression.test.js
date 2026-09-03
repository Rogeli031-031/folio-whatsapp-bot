"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { CASES, RUNTIME_CASES } = require("./fixtures/director-ia-golden-cases");
const { runGoldenSet, BOUNDARIES, firstBadBoundary } = require("./helpers/director-ia-golden-harness");
const {
  runRuntimeSet,
  BOUNDARIES: RUNTIME_BOUNDARIES,
} = require("./helpers/director-ia-runtime-golden-harness");

describe("director-ia golden regression harness", () => {
  it("REPORT MODE ejecuta todos los casos y no etiqueta FAIL de producto como HARNESS", async () => {
    const summary = await runGoldenSet(CASES);
    assert.equal(summary.total, CASES.length);
    assert.equal(summary.rows.length, CASES.length);
    const ids = summary.rows.map((r) => r.id).sort();
    assert.deepEqual(ids, CASES.map((c) => c.id).sort());
    assert.equal(summary.harnessFail, 0);
    for (const row of summary.rows) {
      assert.ok(row.result === "PASS" || row.result === "FAIL", row.id);
      if (row.result === "FAIL") {
        assert.equal(row.failure_class, "PRODUCT_GOLDEN_FAILURE", row.id);
        assert.ok(BOUNDARIES.includes(row.first_bad_boundary), `${row.id} ${row.first_bad_boundary}`);
      } else {
        assert.equal(row.first_bad_boundary, null, row.id);
      }
    }
  });

  it("un FAIL de producto expone FIRST_BAD_BOUNDARY y no es HARNESS_FAILURE", async () => {
    const summary = await runGoldenSet(CASES);
    const fails = summary.rows.filter((r) => r.result === "FAIL");
    if (!fails.length) {
      const synthetic = {
        INPUT: { status: "PASS", detail: null },
        CONTEXT: { status: "PASS", detail: null },
        PLANNER: { status: "FAIL", detail: "synthetic" },
        ENTITY_EXTRACTION: { status: "NOT_REACHED", detail: null },
      };
      assert.equal(firstBadBoundary(synthetic), "PLANNER");
      return;
    }
    for (const row of fails) {
      assert.notEqual(row.failure_class, "HARNESS_FAILURE", row.id);
      assert.ok(row.first_bad_boundary, row.id);
    }
  });
});

describe("director-ia runtime golden harness", () => {
  it("ejecuta los 4 RUNTIME por handlePostChat y no etiqueta FAIL de producto como HARNESS", async () => {
    const summary = await runRuntimeSet(RUNTIME_CASES);
    assert.equal(summary.total, RUNTIME_CASES.length);
    assert.equal(summary.rows.length, 4);
    assert.deepEqual(
      summary.rows.map((r) => r.id),
      RUNTIME_CASES.map((c) => c.id)
    );
    assert.equal(summary.harnessFail, 0);
    for (const row of summary.rows) {
      assert.ok(row.result === "PASS" || row.result === "FAIL", row.id);
      assert.ok(row.turn_trace && row.turn_trace.length, row.id);
      for (const t of row.turn_trace) {
        assert.equal(t.executed, "handlePostChat → askDirectorIa", row.id);
      }
      if (row.result === "FAIL") {
        assert.equal(row.failure_class, "PRODUCT_GOLDEN_FAILURE", row.id);
        assert.ok(RUNTIME_BOUNDARIES.includes(row.first_bad_boundary), `${row.id} ${row.first_bad_boundary}`);
      }
    }
  });

  it("TIER 1 CASES no incluye los RUNTIME (expectations TIER 1 intactas)", () => {
    const ids = CASES.map((c) => c.id);
    assert.equal(ids.length, 8);
    assert.ok(!ids.some((id) => String(id).startsWith("R-RUNTIME-")));
  });
});
