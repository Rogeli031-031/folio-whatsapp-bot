#!/usr/bin/env node
"use strict";

/**
 * PRE-DEPLOY Director IA: TIER 1 + RUNTIME.
 * REPORT (default): exit 0 salvo HARNESS FAILURE.
 * GATE (--gate): exit 1 si TIER 1 o RUNTIME product FAIL, o HARNESS FAILURE.
 */

const { runGoldenSet, formatReport, CASES } = require("../test/helpers/director-ia-golden-harness");
const { runRuntimeSet, formatRuntimeReport } = require("../test/helpers/director-ia-runtime-golden-harness");

function printTier1Details(summary) {
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
}

function printRuntimeDetails(summary) {
  for (const row of summary.rows) {
    console.log(`--- ${row.id} ---`);
    console.log(`question: ${row.question}`);
    console.log(`result: ${row.result}`);
    console.log(`failure_class: ${row.failure_class || "none"}`);
    console.log(`first_bad_boundary: ${row.first_bad_boundary || "none"}`);
    console.log(`http: ${row.http == null ? "none" : row.http}`);
    console.log(`pack: ${row.pack || "none"}`);
    if (row.http_500_with_available_igf) {
      console.log(`http_500_with_available_igf: ${row.http_500_with_available_igf}`);
    }
    if (row.http_500_empty_igf) {
      console.log(
        `http_500_empty_igf: http=${row.http_500_empty_igf.http} veracity=${row.http_500_empty_igf.veracity} operation=${row.http_500_empty_igf.operation}`
      );
    }
    if (row.turn_trace && row.turn_trace.length) {
      for (const t of row.turn_trace) {
        console.log(
          `turn: http=${t.http} mode=${t.mode || "none"} pack=${t.pack} executed=${t.executed}${t.error ? ` error=${t.error}` : ""}`
        );
      }
    }
    if (row.result === "FAIL") {
      const b = row.boundaries[row.first_bad_boundary];
      console.log(`detail: ${b && b.detail ? b.detail : ""}`);
    }
  }
}

async function main() {
  const gate = process.argv.includes("--gate");
  const tier1 = await runGoldenSet(CASES);
  const runtime = await runRuntimeSet();

  const predeployPass =
    tier1.fail === 0 &&
    tier1.harnessFail === 0 &&
    runtime.fail === 0 &&
    runtime.harnessFail === 0 &&
    runtime.http5xx === 0;

  console.log("PRE-DEPLOY DIRECTOR IA");
  console.log("");
  console.log("TIER 1");
  console.log(`${tier1.pass}/${tier1.total} PASS`);
  console.log("");
  console.log(formatReport(tier1));
  console.log("");
  console.log(formatRuntimeReport(runtime));
  console.log("");
  console.log(`PRE-DEPLOY GATE = ${predeployPass ? "PASS" : "FAIL"}`);
  console.log("");
  printTier1Details(tier1);
  console.log("");
  printRuntimeDetails(runtime);

  if (tier1.harnessFail > 0 || runtime.harnessFail > 0) {
    process.exitCode = 1;
    return;
  }
  if (gate && !predeployPass) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("HARNESS FAILURE", err);
  process.exitCode = 1;
});
