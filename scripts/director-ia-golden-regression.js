#!/usr/bin/env node
"use strict";

/**
 * Comando único del Golden Regression Set (TIER 1).
 * REPORT (default): exit 0 salvo HARNESS FAILURE.
 * GATE (--gate): exit 1 si hay PRODUCT GOLDEN FAILURE.
 */

const { runGoldenSet, formatReport, CASES } = require("../test/helpers/director-ia-golden-harness");

async function main() {
  const gate = process.argv.includes("--gate");
  const summary = await runGoldenSet(CASES);
  console.log(formatReport(summary));
  console.log("");
  for (const row of summary.rows) {
    console.log(`--- ${row.id} ---`);
    console.log(`question: ${row.question}`);
    console.log(`result: ${row.result}`);
    console.log(`failure_class: ${row.failure_class || "none"}`);
    console.log(`first_bad_boundary: ${row.first_bad_boundary || "none"}`);
    console.log(`actual_intent: ${row.actual_intent || "none"}`);
    if (row.result === "FAIL") {
      const b = row.boundaries[row.first_bad_boundary];
      console.log(`detail: ${b && b.detail ? b.detail : ""}`);
    }
  }
  if (summary.harnessFail > 0) {
    process.exitCode = 1;
    return;
  }
  if (gate && summary.productFail > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("HARNESS FAILURE", err);
  process.exitCode = 1;
});
