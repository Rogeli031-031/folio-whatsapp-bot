"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  createIesBuilder,
  canonicalJson,
  contentFingerprint,
  CANONICAL_JSON_V1,
} = require("../lib/director-ia-ies-builder");

const FIX_DIR = path.join(__dirname, "..", "fixtures", "director-ia", "ies");
const LIB_PATH = path.join(__dirname, "..", "lib", "director-ia-ies-builder.js");

function loadSnapshot(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(FIX_DIR, name), "utf8"));
  assert.equal(raw.meta.figures, "ILUSTRATIVAS / FICTICIAS");
  assert.equal(raw.meta.not_institutional_coverage, true);
  return raw.snapshot;
}

function builder(clockValue) {
  let n = 0;
  return createIesBuilder({
    clock: () => clockValue || "2026-08-17T12:00:00.000Z",
    idFactory: (prefix) => `${prefix || "ies"}_${++n}`,
  });
}

function buildNamed(name) {
  return builder().build(loadSnapshot(name));
}

describe("IES Builder — factory y entrada", () => {
  it("factory expone build", () => {
    const iesb = builder();
    assert.equal(typeof iesb.build, "function");
    assert.equal(typeof iesb.validate, "function");
  });

  it("build acepta únicamente Knowledge Snapshot", () => {
    const iesb = builder();
    assert.throws(() => iesb.build(null), (err) => err && err.code === "INVALID_SNAPSHOT");
    assert.throws(() => iesb.build([]), (err) => err && err.code === "INVALID_SNAPSHOT");
    assert.throws(
      () => iesb.build({ snapshot_id: "x", version: 1 }),
      (err) => err && err.code === "INVALID_SNAPSHOT"
    );
  });

  it("Snapshot sin query_context_metadata obligatorio falla controladamente", () => {
    const snap = loadSnapshot("official-no-knowledge.json");
    delete snap.query_context_metadata;
    assert.throws(
      () => builder().build(snap),
      (err) => err && err.code === "MISSING_QUERY_CONTEXT_METADATA"
    );
  });

  it("query_context se proyecta sin segunda entrada", () => {
    const ies = buildNamed("official-no-knowledge.json");
    assert.equal(ies.query_context.executive_query_id, "eq_ies_nok");
    assert.equal(ies.query_context.trace_id, "tr_ies_nok");
    assert.equal(ies.query_context.channel, "dashboard");
    assert.equal(ies.query_context.requesting_user_id, "user_ilustrativo");
    assert.equal(ies.query_context.intent, "folio_status");
  });
});

describe("IES Builder — contrato raíz OFFICIAL", () => {
  it("OFFICIAL + alternative_context null", () => {
    const ies = buildNamed("official-full-minimal.json");
    assert.equal(ies.ies_type, "OFFICIAL");
    assert.equal(ies.alternative_context, null);
  });

  it("schema_version 1.0", () => {
    assert.equal(buildNamed("official-full-minimal.json").schema_version, "1.0");
  });

  it("ies_version 1", () => {
    assert.equal(buildNamed("official-full-minimal.json").ies_version, 1);
  });

  it("expires_at null", () => {
    assert.equal(buildNamed("official-full-minimal.json").expires_at, null);
  });

  it("coverage CONOZCO -> VALIDATED", () => {
    const ies = buildNamed("official-full-minimal.json");
    assert.equal(ies.knowledge_coverage.coverage_state, "CONOZCO");
    assert.equal(ies.knowledge_coverage.coverage_token, "COV_FULL_KNOWLEDGE");
    assert.equal(ies.status, "VALIDATED");
  });

  it("coverage CONOZCO_PARCIALMENTE -> PARTIAL", () => {
    const ies = buildNamed("official-partial.json");
    assert.equal(ies.knowledge_coverage.coverage_token, "COV_PARTIAL_KNOWLEDGE");
    assert.equal(ies.status, "PARTIAL");
  });

  it("coverage EXISTE_CONFLICTO -> CONFLICTED", () => {
    const ies = buildNamed("official-conflicted-type-e.json");
    assert.equal(ies.knowledge_coverage.coverage_token, "COV_DATA_CONFLICT");
    assert.equal(ies.status, "CONFLICTED");
  });

  it("coverage NO_CONOZCO -> NO_KNOWLEDGE", () => {
    const ies = buildNamed("official-no-knowledge.json");
    assert.equal(ies.knowledge_coverage.coverage_token, "COV_NO_KNOWLEDGE");
    assert.equal(ies.status, "NO_KNOWLEDGE");
  });

  it("NO_KNOWLEDGE permite bancos vacíos", () => {
    const ies = buildNamed("official-no-knowledge.json");
    assert.deepEqual(ies.facts, []);
    assert.deepEqual(ies.evidence, []);
    assert.deepEqual(ies.diagnoses, []);
    const check = builder().validate(ies);
    assert.equal(check.ok, true, check.errors.join(","));
  });
});

describe("IES Builder — source_health, materiality, conflictos", () => {
  it("source_health mapping exacto", () => {
    const ies = buildNamed("official-partial.json");
    const byTool = Object.fromEntries(ies.source_health.map((s) => [s.tool_id, s.execution_status]));
    assert.equal(byTool.get_arr_snapshot, "DATA_AVAILABLE");
    assert.equal(byTool.get_folio_status, "SOURCE_NOT_INTEGRATED");
  });

  it("DATA_NOT_FOUND no se convierte en ABSENCE_CONFIRMED", () => {
    const snap = loadSnapshot("official-no-knowledge.json");
    snap.bundle.knowledge_coverage = "CONOZCO_PARCIALMENTE";
    snap.bundle.source_health = { action_register: "ACQUIRED_EMPTY" };
    snap.bundle.traceability.acquisition = [
      { tool_id: "get_action_register", "domain": "action_register", status: "ACQUIRED_EMPTY" },
    ];
    const ies = builder().build(snap);
    assert.equal(ies.source_health[0].execution_status, "DATA_NOT_FOUND");
    assert.equal(JSON.stringify(ies).includes("ABSENCE_CONFIRMED"), false);
  });

  it("materiality no se recalcula", () => {
    const ies = buildNamed("official-full-minimal.json");
    assert.equal(ies.facts[0].materiality, "MATERIALITY_NOT_ASSESSED");
    assert.equal(ies.facts[0].applied_materiality_rule_id, null);
  });

  it("highest_materiality_detected fail-closed", () => {
    const ies = buildNamed("official-full-minimal.json");
    assert.equal(ies.knowledge_coverage.highest_materiality_detected, "MATERIALITY_NOT_ASSESSED");
  });

  it("Tipo E permanece visible", () => {
    const ies = buildNamed("official-conflicted-type-e.json");
    assert.equal(ies.conflicts[0].primary_type, "CONF_TYPE_E_GOVERNANCE");
    assert.equal(ies.conflicts[0].resolution_status, "OPEN");
    assert.ok(
      ies.executive_summary_facts.some(
        (s) => s.statement_token === "CONF_TYPE_E_GOVERNANCE" && s.statement_reference === "c_e_1"
      )
    );
  });

  it("resolution_status no cambia", () => {
    const snap = loadSnapshot("official-conflicted-type-e.json");
    const before = snap.bundle.conflicts[0].resolution_status;
    const ies = builder().build(snap);
    assert.equal(ies.conflicts[0].resolution_status, before);
    assert.equal(ies.conflicts[0].resolution_status, "OPEN");
  });

  it("summary no inventa narrativa/ranking", () => {
    const ies = buildNamed("official-full-minimal.json");
    assert.equal(
      ies.executive_summary_facts.some((s) => String(s.statement_token || "").startsWith("SUM_")),
      false
    );
    const typeE = buildNamed("official-conflicted-type-e.json");
    for (const s of typeE.executive_summary_facts) {
      assert.equal(Object.prototype.hasOwnProperty.call(s, "prose"), false);
      assert.ok(s.statement_token);
      assert.ok(s.statement_reference);
    }
  });

  it("limitaciones no inventan prosa", () => {
    const ies = buildNamed("official-no-knowledge.json");
    assert.ok(ies.limitations.length > 0);
    for (const lim of ies.limitations) {
      assert.equal(lim.statement_token, "SOURCE_NOT_INTEGRATED");
      assert.equal(typeof lim.statement_token, "string");
      assert.equal(JSON.stringify(lim).includes("LIM_"), false);
    }
  });
});

describe("IES Builder — integridad CANONICAL_JSON_V1", () => {
  it("canonical JSON estable ante orden distinto de claves", () => {
    assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));
  });

  it("arrays conservan orden", () => {
    assert.notEqual(canonicalJson([1, 2]), canonicalJson([2, 1]));
  });

  it("NaN/Infinity/undefined rechazados", () => {
    assert.throws(() => canonicalJson(NaN), (err) => err && err.code === "CANONICAL_NONFINITE");
    assert.throws(() => canonicalJson(Infinity), (err) => err && err.code === "CANONICAL_NONFINITE");
    assert.throws(() => canonicalJson(undefined), (err) => err && err.code === "CANONICAL_UNDEFINED");
  });

  it("fingerprint estable para misma semántica", () => {
    const a = buildNamed("official-full-minimal.json");
    const b = buildNamed("official-full-minimal.json");
    assert.equal(a.integrity.content_fingerprint, b.integrity.content_fingerprint);
    assert.equal(a.integrity.canonical_representation, CANONICAL_JSON_V1);
  });

  it("fingerprint cambia al mutar contenido incluido", () => {
    const ies = buildNamed("official-full-minimal.json");
    const original = ies.integrity.content_fingerprint;
    ies.facts[0].value = 0;
    assert.notEqual(contentFingerprint(ies), original);
  });

  it("fingerprint ignora sus campos excluidos según contrato", () => {
    const ies = buildNamed("official-full-minimal.json");
    const original = ies.integrity.content_fingerprint;
    ies.integrity.canonical_representation = "TAMPER";
    ies.integrity.signature = "not-a-signature";
    assert.equal(contentFingerprint(ies), original);
    ies.integrity.content_fingerprint = "sha256:dead";
    assert.equal(contentFingerprint(ies), original);
  });

  it("signature null", () => {
    assert.equal(buildNamed("official-full-minimal.json").integrity.signature, null);
  });

  it("signature_status NOT_IMPLEMENTED", () => {
    assert.equal(
      buildNamed("official-full-minimal.json").integrity.signature_status,
      "NOT_IMPLEMENTED"
    );
  });

  it("digest no se etiqueta como firma", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(src.includes("firma digital implementada"), false);
    const ies = buildNamed("official-full-minimal.json");
    assert.ok(ies.integrity.content_fingerprint.startsWith("sha256:"));
    assert.equal(ies.integrity.signature, null);
  });

  it("input Snapshot no se muta", () => {
    const snap = loadSnapshot("official-full-minimal.json");
    const original = JSON.parse(JSON.stringify(snap));
    builder().build(snap);
    assert.deepEqual(snap, original);
  });

  it("validate acepta IES emitido y fingerprint recomputable", () => {
    const iesb = builder();
    const ies = iesb.build(loadSnapshot("official-no-knowledge.json"));
    const check = iesb.validate(ies);
    assert.equal(check.ok, true, check.errors.join(","));
  });
});
