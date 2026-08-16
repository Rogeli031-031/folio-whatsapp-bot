"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createObservationPipeline, ALLOWED_STATUSES } = require("../lib/director-ia-observation-pipeline");
const { assemble } = require("../lib/director-ia-evidence-builder");
const { validate_structure } = require("../lib/director-ia-eks");

const FIX_DIR = path.join(__dirname, "..", "fixtures", "director-ia", "observation-pipeline");
const LIB_PATH = path.join(__dirname, "..", "lib", "director-ia-observation-pipeline.js");

function loadEnvelopes(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(FIX_DIR, name), "utf8"));
  assert.equal(raw.meta.figures, "ILUSTRATIVAS / FICTICIAS");
  assert.equal(raw.meta.not_institutional_coverage, true);
  return raw.execution_results;
}

function processFixture(name, options) {
  const op = createObservationPipeline(options || { clock: () => "2026-08-15T00:00:00.000Z" });
  return op.process(loadEnvelopes(name));
}

describe("Observation Pipeline — factory y forma de salida", () => {
  it("factory expone process", () => {
    const op = createObservationPipeline();
    assert.equal(typeof op.process, "function");
  });

  it("process devuelve acquisition_statuses[] y observation_records[]", () => {
    const out = processFixture("acquired-ok-single.json");
    assert.ok(Array.isArray(out.acquisition_statuses));
    assert.ok(Array.isArray(out.observation_records));
    assert.equal(Object.keys(out).includes("facts"), false);
  });

  it("un envelope produce exactamente un AcquisitionStatus", () => {
    const out = processFixture("acquired-ok-multiple.json");
    assert.equal(out.acquisition_statuses.length, 1);
    assert.ok(out.observation_records.length > 1);
  });

  it("solo enum 03A es aceptado y status desconocido falla estructuralmente", () => {
    ALLOWED_STATUSES.forEach((s) => assert.ok(typeof s === "string"));
    const op = createObservationPipeline({ clock: () => "unclocked" });
    assert.throws(
      () =>
        op.process([
          {
            trace_id: "tr_x",
            tool_id: "t",
            domain: "d",
            status: "NOT_A_STATUS",
          },
        ]),
      (err) => err && err.code === "INVALID_STATUS"
    );
  });
});

describe("Observation Pipeline — transportabilidad fail-closed", () => {
  it("ACQUIRED_OK single produce ObservationRecord transportable", () => {
    const out = processFixture("acquired-ok-single.json");
    assert.equal(out.acquisition_statuses[0].status, "ACQUIRED_OK");
    assert.equal(out.observation_records.length, 1);
    assert.equal(out.observation_records[0].trace_id, "tr_op_ok_single");
    assert.ok(out.observation_records[0].observation_id);
  });

  it("ACQUIRED_OK multiple puede producir múltiples ObservationRecords", () => {
    const out = processFixture("acquired-ok-multiple.json");
    assert.equal(out.observation_records.length, 2);
    assert.equal(out.acquisition_statuses.length, 1);
  });

  it("ACQUIRED_EMPTY no produce ABSENCE_CONFIRMED", () => {
    const out = processFixture("acquired-empty.json");
    assert.equal(out.acquisition_statuses[0].status, "ACQUIRED_EMPTY");
    assert.equal(JSON.stringify(out).includes("ABSENCE_CONFIRMED"), false);
    assert.equal(out.acquisition_statuses[0].facts, undefined);
  });

  it("TOOL_ERROR no produce ObservationRecord de negocio", () => {
    const out = processFixture("tool-error.json");
    assert.equal(out.acquisition_statuses[0].status, "TOOL_ERROR");
    assert.deepEqual(out.observation_records, []);
    assert.ok(out.acquisition_statuses[0].error);
  });

  it("SOURCE_RESTRICTED no produce ObservationRecord de negocio", () => {
    const out = processFixture("source-restricted.json");
    assert.equal(out.acquisition_statuses[0].status, "SOURCE_RESTRICTED");
    assert.deepEqual(out.observation_records, []);
  });

  it("SOURCE_NOT_INTEGRATED no produce ObservationRecord de negocio", () => {
    const out = processFixture("source-not-integrated.json");
    assert.equal(out.acquisition_statuses[0].status, "SOURCE_NOT_INTEGRATED");
    assert.deepEqual(out.observation_records, []);
  });

  it("QUERY_SCOPE_INCOMPLETE no afirma cobertura completa", () => {
    const out = processFixture("query-scope-incomplete.json");
    assert.equal(out.acquisition_statuses[0].status, "QUERY_SCOPE_INCOMPLETE");
    assert.equal(out.acquisition_statuses[0].scope_complete, false);
    assert.deepEqual(out.observation_records, []);
  });

  it("ENTITY_UNRESOLVED no inventa entity_id", () => {
    const out = processFixture("entity-unresolved.json");
    assert.equal(out.acquisition_statuses[0].status, "ENTITY_UNRESOLVED");
    assert.equal(out.acquisition_statuses[0].entity_resolution_state, "UNRESOLVED");
    assert.deepEqual(out.observation_records, []);
    assert.equal(JSON.stringify(out).includes("\"entity_id\""), false);
  });

  it("RESOLVED preserva entity_id upstream", () => {
    const out = processFixture("entity-resolved.json");
    assert.equal(out.observation_records[0].subject.entity_id, "puebla");
    assert.equal(out.observation_records[0].entity_resolution.state, "RESOLVED");
  });
});

describe("Observation Pipeline — procedencia, payload, reloj e IDs", () => {
  it("content_author_id null permanece null", () => {
    const out = processFixture("acquired-empty.json");
    assert.equal(out.observation_records[0].source.content_author_id, null);
  });

  it("extracted_by no se convierte en autor", () => {
    const out = processFixture("acquired-ok-single.json");
    const rec = out.observation_records[0];
    assert.equal(rec.extracted_by, "get_arr_snapshot");
    assert.notEqual(rec.source.content_author_id, rec.extracted_by);
  });

  it("triggered_by no se convierte en autor", () => {
    const out = processFixture("acquired-ok-single.json");
    const rec = out.observation_records[0];
    assert.equal(rec.triggered_by, "usuario_ilustrativo");
    assert.notEqual(rec.triggered_by, rec.source.content_author_id);
    assert.notEqual(rec.triggered_by, rec.source.system);
  });

  it("raw_payload_reference se preserva y normalized_payload no la sustituye", () => {
    const out = processFixture("acquired-ok-single.json");
    const rec = out.observation_records[0];
    assert.equal(rec.raw_payload_reference, "raw://tr_op_ok_single/get_arr_snapshot/ex_ok_1/0");
    assert.ok(rec.normalized_payload);
    assert.notEqual(rec.normalized_payload, rec.raw_payload_reference);
  });

  it("input no se muta", () => {
    const input = loadEnvelopes("acquired-ok-single.json");
    const before = structuredClone(input);
    createObservationPipeline({ clock: () => "t" }).process(input);
    assert.deepEqual(input, before);
  });

  it("clock es inyectable y determinístico", () => {
    const out = processFixture("acquired-ok-single.json", { clock: () => "CLOCK_FIXED" });
    assert.equal(out.acquisition_statuses[0].pipeline_received_at, "CLOCK_FIXED");
    assert.equal(out.observation_records[0].pipeline_received_at, "CLOCK_FIXED");
  });

  it("observation id generator es inyectable", () => {
    let n = 0;
    const out = processFixture("acquired-ok-multiple.json", {
      clock: () => "t",
      idFactory: () => `obs_injected_${++n}`,
    });
    assert.deepEqual(
      out.observation_records.map((r) => r.observation_id),
      ["obs_injected_1", "obs_injected_2"]
    );
  });

  it("retries no se deduplican silenciosamente", () => {
    const out = processFixture("retry-pair.json");
    assert.equal(out.acquisition_statuses.length, 2);
    assert.equal(out.observation_records.length, 2);
    assert.equal(out.acquisition_statuses[0].execution_id, "ex_retry_1");
    assert.equal(out.acquisition_statuses[1].execution_id, "ex_retry_2");
  });

  it("orden de salida es estable", () => {
    const a = processFixture("retry-pair.json");
    const b = processFixture("retry-pair.json");
    assert.deepEqual(
      a.acquisition_statuses.map((s) => s.execution_id),
      b.acquisition_statuses.map((s) => s.execution_id)
    );
    assert.deepEqual(
      a.acquisition_statuses.map((s) => s.execution_id),
      ["ex_retry_1", "ex_retry_2"]
    );
  });
});

describe("Observation Pipeline — frontera EB y ausencia de EKS", () => {
  it("OP no contiene append_snapshot ni usa EKS", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(src.includes("append_snapshot"), false);
    assert.equal(src.includes("director-ia-eks"), false);
    assert.equal(src.includes("createEks"), false);
  });

  it("output OP puede alimentar EB assemble sin modificar EB; listas hermanas", () => {
    const out = processFixture("acquired-ok-single.json");
    assert.equal(out.observation_records.some((r) => r.status === "ACQUIRED_OK"), false);
    const bundle = assemble({
      trace_id: "tr_op_ok_single",
      produced_at: "unclocked",
      plan: { intent: "fixture" },
      tool_plan: { tools: ["get_arr_snapshot"] },
      acquisition_statuses: out.acquisition_statuses,
      observation_records: out.observation_records,
    });
    assert.equal(bundle.producer, "evidence_builder");
    const check = validate_structure(bundle);
    assert.equal(check.ok, true, check.errors.join(","));
    assert.ok(bundle.observations.length > 0);
    assert.equal(bundle.observations.some((o) => o.status === "ACQUIRED_OK"), false);
  });

  it("SOURCE_NOT_INTEGRATED OP -> EB NO_CONOZCO sin hechos", () => {
    const out = processFixture("source-not-integrated.json");
    const bundle = assemble({
      trace_id: "tr_op_not_integrated",
      produced_at: "unclocked",
      plan: { intent: "folio_status" },
      tool_plan: { tools: ["get_folio_status"] },
      acquisition_statuses: out.acquisition_statuses,
      observation_records: out.observation_records,
    });
    assert.equal(bundle.knowledge_coverage, "NO_CONOZCO");
    assert.deepEqual(bundle.facts, []);
    assert.equal(JSON.stringify(bundle).includes("ABSENCE_CONFIRMED"), false);
    assert.equal(validate_structure(bundle).ok, true);
  });
});
