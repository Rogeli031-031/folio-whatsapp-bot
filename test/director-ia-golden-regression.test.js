"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { CASES } = require("./fixtures/director-ia-golden-cases");
const { runGoldenSet, BOUNDARIES, firstBadBoundary } = require("./helpers/director-ia-golden-harness");

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
