"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createObservationPipeline } = require("../lib/director-ia-observation-pipeline");
const { createEvidenceBuilder } = require("../lib/director-ia-evidence-builder");
const { createEks, validate_structure } = require("../lib/director-ia-eks");
const { run_op_eb_eks } = require("../lib/director-ia-op-eb-eks-integration");

const FIX_DIR = path.join(__dirname, "..", "fixtures", "director-ia", "op-eb-eks-integration");
const OP_LIB = path.join(__dirname, "..", "lib", "director-ia-observation-pipeline.js");
const EB_LIB = path.join(__dirname, "..", "lib", "director-ia-evidence-builder.js");
const HELPER_LIB = path.join(__dirname, "..", "lib", "director-ia-op-eb-eks-integration.js");

const FORBIDDEN_MATERIALITY = ["MAT_LOW", "MAT_MEDIUM", "MAT_HIGH", "MAT_CRITICAL"];

function loadFixture(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(FIX_DIR, name), "utf8"));
  assert.equal(raw.meta.figures, "ILUSTRATIVAS / FICTICIAS");
  assert.equal(raw.meta.not_institutional_coverage, true);
  return raw;
}

function deps(eks) {
  return {
    observation_pipeline: createObservationPipeline({
      clock: () => "2026-08-16T00:00:00.000Z",
    }),
    evidence_builder: createEvidenceBuilder({ produced_at: "2026-08-16T00:00:00.000Z" }),
    eks: eks || createEks(),
  };
}

async function runNamed(name, injected) {
  const fixture = loadFixture(name);
  return {
    fixture,
    result: await run_op_eb_eks(fixture.input, injected || deps()),
  };
}

function serialized(value) {
  return JSON.stringify(value);
}

function assertNoInventedMateriality(text) {
  for (const code of FORBIDDEN_MATERIALITY) {
    assert.equal(text.includes(code), false, code);
  }
}

describe("Integración OP → EB → EKS — happy-path", () => {
  it("flujo OP -> EB -> EKS completo funciona con fixture happy-path", async () => {
    const { result } = await runNamed("happy-path.json");
    assert.equal(result.acquisition_statuses.length, 1);
    assert.equal(result.acquisition_statuses[0].status, "ACQUIRED_OK");
    assert.equal(result.observation_records.length, 1);
    assert.equal(result.bundle.producer, "evidence_builder");
    assert.ok(result.bundle.observations.length > 0);
    assert.ok(result.bundle.facts.length > 0);
    assert.equal(result.snapshot.version, 1);
    assert.equal(result.snapshot.trace_id, "tr_int_ok");
    assert.equal(result.validation.ok, true);
  });

  it("procedencia 03A permanece en bundle.observations", async () => {
    const { result } = await runNamed("happy-path.json");
    const obs = result.bundle.observations[0];
    assert.equal(obs.source.content_author_id, "arr_origin_ilustrativo");
    assert.equal(obs.extracted_by, "get_arr_snapshot");
    assert.equal(obs.triggered_by, "usuario_ilustrativo");
    assert.equal(obs.source.system, "arr");
    assert.equal(obs.raw_payload_reference, "raw://tr_int_ok/get_arr_snapshot/ex_int_ok_1/0");
    assert.equal(obs.lineage.content_author_id, "arr_origin_ilustrativo");
    assert.equal(obs.lineage.extracted_by, "get_arr_snapshot");
    assert.equal(obs.lineage.triggered_by, "usuario_ilustrativo");
    assert.equal(obs.lineage.observation_id, result.observation_records[0].observation_id);
    assert.equal(obs.lineage.trace_id, "tr_int_ok");
  });

  it("procedencia permanece después de persistencia EKS", async () => {
    const eks = createEks();
    const { result } = await runNamed("happy-path.json", deps(eks));
    const stored = await eks.get_snapshot({ snapshot_id: result.snapshot.snapshot_id });
    const obs = stored.bundle.observations[0];
    assert.equal(obs.source.content_author_id, "arr_origin_ilustrativo");
    assert.equal(obs.extracted_by, "get_arr_snapshot");
    assert.equal(obs.triggered_by, "usuario_ilustrativo");
    assert.equal(obs.lineage.raw_payload_reference, result.observation_records[0].raw_payload_reference);
    assert.deepEqual(stored.bundle, result.bundle);
  });

  it("AcquisitionStatus no aparece en bundle.observations", async () => {
    const { result } = await runNamed("happy-path.json");
    assert.equal(
      result.bundle.observations.some((o) => Object.prototype.hasOwnProperty.call(o, "status")),
      false
    );
    assert.equal(serialized(result.bundle.observations).includes("ACQUIRED_OK"), false);
    assert.equal(result.bundle.traceability.acquisition[0].status, "ACQUIRED_OK");
  });

  it("Bundle pasa validate_structure", async () => {
    const { result } = await runNamed("happy-path.json");
    const check = validate_structure(result.bundle);
    assert.equal(check.ok, true, check.errors.join(","));
    assert.equal(result.validation.ok, true);
  });

  it("append_snapshot recibe exclusivamente Knowledge Bundle válido", async () => {
    const { result } = await runNamed("happy-path.json");
    assert.equal(result.snapshot.bundle.producer, "evidence_builder");
    assert.equal(Array.isArray(result.snapshot.bundle.observations), true);
    assert.equal(Array.isArray(result.snapshot.bundle.facts), true);
    assert.equal(Array.isArray(result.snapshot.bundle.evidence), true);
    assert.equal(Array.isArray(result.snapshot.bundle.diagnoses), true);
    assert.ok(result.snapshot.bundle_id);
    assert.ok(result.snapshot.integrity);
  });

  it("Snapshot preserva Bundle sin reinterpretación", async () => {
    const { result } = await runNamed("happy-path.json");
    assert.deepEqual(result.snapshot.bundle, result.bundle);
    assert.equal(result.snapshot.bundle.knowledge_coverage, result.bundle.knowledge_coverage);
    assert.deepEqual(result.snapshot.bundle.facts, result.bundle.facts);
  });
});

describe("Integración OP → EB → EKS — fail-closed", () => {
  it("content_author_id null permanece null end-to-end", async () => {
    const eks = createEks();
    const { result } = await runNamed("acquired-empty.json", deps(eks));
    assert.equal(result.observation_records[0].source.content_author_id, null);
    assert.equal(result.bundle.observations[0].source.content_author_id, null);
    assert.equal(result.bundle.observations[0].lineage.content_author_id, null);
    const stored = await eks.get_snapshot({ trace_id: "tr_int_empty" });
    assert.equal(stored.bundle.observations[0].source.content_author_id, null);
    assert.equal(stored.bundle.observations[0].extracted_by, "get_action_register");
    assert.equal(stored.bundle.observations[0].extracted_by === stored.bundle.observations[0].source.content_author_id, false);
  });

  it("SOURCE_NOT_INTEGRATED produce NO_CONOZCO sin facts", async () => {
    const { result } = await runNamed("source-not-integrated.json");
    assert.equal(result.acquisition_statuses[0].status, "SOURCE_NOT_INTEGRATED");
    assert.equal(result.observation_records.length, 0);
    assert.equal(result.bundle.knowledge_coverage, "NO_CONOZCO");
    assert.deepEqual(result.bundle.facts, []);
    assert.deepEqual(result.bundle.evidence, []);
    assert.deepEqual(result.bundle.diagnoses, []);
    assert.deepEqual(result.bundle.observations, []);
    assert.equal(result.snapshot.bundle.knowledge_coverage, "NO_CONOZCO");
    assert.equal(validate_structure(result.bundle).ok, true);
  });

  it("TOOL_ERROR no produce facts", async () => {
    const { result } = await runNamed("tool-error.json");
    assert.equal(result.acquisition_statuses[0].status, "TOOL_ERROR");
    assert.equal(result.observation_records.length, 0);
    assert.deepEqual(result.bundle.observations, []);
    assert.deepEqual(result.bundle.facts, []);
    assert.equal(result.bundle.source_health.arr, "TOOL_ERROR");
    assert.equal(result.snapshot.bundle.source_health.arr, "TOOL_ERROR");
    assert.equal(serialized(result.snapshot.bundle).includes("ABSENCE_CONFIRMED"), false);
    assert.equal(validate_structure(result.bundle).ok, true);
  });

  it("ACQUIRED_EMPTY no produce ABSENCE_CONFIRMED", async () => {
    const { result } = await runNamed("acquired-empty.json");
    assert.equal(result.acquisition_statuses[0].status, "ACQUIRED_EMPTY");
    assert.equal(serialized(result.bundle).includes("ABSENCE_CONFIRMED"), false);
    assert.equal(serialized(result.snapshot.bundle).includes("ABSENCE_CONFIRMED"), false);
    assert.deepEqual(result.bundle.facts, []);
    assert.equal(result.bundle.observations[0].absence_state, "DATA_NOT_FOUND");
    assert.equal(validate_structure(result.bundle).ok, true);
  });

  it("sin G8 no aparece MAT_LOW/MAT_MEDIUM/MAT_HIGH/MAT_CRITICAL inventado", async () => {
    const names = ["happy-path.json", "source-not-integrated.json", "acquired-empty.json", "tool-error.json"];
    for (const name of names) {
      const { result } = await runNamed(name);
      assertNoInventedMateriality(serialized(result.bundle));
      assertNoInventedMateriality(serialized(result.snapshot.bundle));
      for (const fact of result.bundle.facts) {
        assert.equal(fact.materiality, "MATERIALITY_NOT_ASSESSED");
      }
    }
  });

  it("sin ruleset no aparece RESOLVED inventado", async () => {
    const names = ["happy-path.json", "source-not-integrated.json", "acquired-empty.json", "tool-error.json"];
    for (const name of names) {
      const { result } = await runNamed(name);
      for (const conflict of result.bundle.conflicts) {
        assert.notEqual(conflict.resolution_status, "RESOLVED");
      }
    }
  });
});

describe("Integración OP → EB → EKS — versionado e inmutabilidad", () => {
  it("dos snapshots mismo trace_id incrementan version; v1 inmutable; latest e historial", async () => {
    const eks = createEks();
    const injected = deps(eks);
    const first = await run_op_eb_eks(loadFixture("same-trace-v1.json").input, injected);
    const second = await run_op_eb_eks(loadFixture("same-trace-v2.json").input, injected);

    assert.equal(first.snapshot.version, 1);
    assert.equal(second.snapshot.version, 2);
    assert.equal(first.snapshot.trace_id, "tr_int_versioned");
    assert.equal(second.snapshot.trace_id, "tr_int_versioned");
    assert.notEqual(first.snapshot.integrity, second.snapshot.integrity);

    const v1Again = await eks.get_snapshot({ snapshot_id: first.snapshot.snapshot_id });
    assert.deepEqual(v1Again.bundle, first.snapshot.bundle);
    assert.equal(v1Again.bundle.facts[0].value, 95);
    assert.equal(v1Again.version, 1);

    const latest = await eks.get_snapshot({ trace_id: "tr_int_versioned" });
    assert.equal(latest.version, 2);
    assert.equal(latest.snapshot_id, second.snapshot.snapshot_id);
    assert.equal(latest.bundle.facts[0].value, 80);

    const versions = await eks.list_versions("tr_int_versioned");
    assert.equal(versions.length, 2);
    assert.deepEqual(
      versions.map((v) => v.version),
      [1, 2]
    );
    assert.equal(versions[0].snapshot_id, first.snapshot.snapshot_id);
    assert.equal(versions[1].snapshot_id, second.snapshot.snapshot_id);
  });

  it("input original no se muta", async () => {
    const fixture = loadFixture("happy-path.json");
    const original = JSON.parse(JSON.stringify(fixture.input));
    await run_op_eb_eks(fixture.input, deps());
    assert.deepEqual(fixture.input, original);
  });
});

describe("Integración OP → EB → EKS — frontera de capas", () => {
  it("OP no llama EKS; EB no llama append_snapshot; helper solo orquesta", () => {
    const opSrc = fs.readFileSync(OP_LIB, "utf8");
    const ebSrc = fs.readFileSync(EB_LIB, "utf8");
    const helperSrc = fs.readFileSync(HELPER_LIB, "utf8");
    assert.equal(opSrc.includes("append_snapshot"), false);
    assert.equal(opSrc.includes("director-ia-eks"), false);
    assert.equal(ebSrc.includes("append_snapshot"), false);
    assert.equal(helperSrc.includes("observation_pipeline.process"), true);
    assert.equal(helperSrc.includes("evidence_builder.assemble"), true);
    assert.equal(helperSrc.includes("eks.validate_structure"), true);
    assert.equal(helperSrc.includes("eks.append_snapshot"), true);
  });
});
