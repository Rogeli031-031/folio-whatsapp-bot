"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  assemble,
  to_n1,
  to_n2,
  to_n3,
  to_n4,
  emit_bundle,
  createEvidenceBuilder,
  RULE_REGISTRY,
} = require("../lib/director-ia-evidence-builder");
const { validate_structure } = require("../lib/director-ia-eks");

const FIX_DIR = path.join(__dirname, "..", "fixtures", "director-ia", "evidence-builder");
const LIB_PATH = path.join(__dirname, "..", "lib", "director-ia-evidence-builder.js");

function loadInput(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(FIX_DIR, name), "utf8"));
  assert.equal(raw.meta.figures, "ILUSTRATIVAS / FICTICIAS");
  assert.equal(raw.meta.not_institutional_coverage, true);
  return raw.input;
}

describe("Evidence Builder — separación de entrada y N1", () => {
  it("assemble conserva separación acquisition_statuses / observation_records", () => {
    const input = loadInput("case-a-input-03a.json");
    const snapshot = structuredClone(input);
    const bundle = assemble(input);
    assert.ok(Array.isArray(input.acquisition_statuses));
    assert.ok(Array.isArray(input.observation_records));
    assert.equal(bundle.observations.some((o) => o.status === "ACQUIRED_OK"), false);
    assert.equal(bundle.observations.some((o) => o.status === "SOURCE_NOT_INTEGRATED"), false);
    assert.deepEqual(input.acquisition_statuses, snapshot.acquisition_statuses);
    assert.equal(bundle.source_health.deltas, "SOURCE_NOT_INTEGRATED");
    assert.equal(bundle.source_health.arr, "ACQUIRED_OK");
  });

  it("03A ObservationRecord -> N1 preserva procedencia y lineage", () => {
    const input = loadInput("case-a-input-03a.json");
    const rec = input.observation_records[0];
    const n1 = to_n1(input);
    const obs = n1.find((o) => o.observation_id === rec.observation_id);
    assert.ok(obs);
    assert.equal(obs.observation_id, rec.observation_id);
    assert.equal(obs.traceability.trace_id, rec.trace_id);
    assert.equal(obs.source.system, rec.source.system);
    assert.equal(obs.source.content_author_id, rec.source.content_author_id);
    assert.equal(obs.source.source_family, rec.source.source_family);
    assert.equal(obs.source.source_instance_id, rec.source.source_instance_id);
    assert.equal(obs.extracted_by, rec.extracted_by);
    assert.equal(obs.triggered_by, rec.triggered_by);
    assert.equal(obs.raw_payload_reference, rec.raw_payload_reference);
    assert.equal(obs.raw_result_ref, rec.raw_payload_reference);
    assert.equal(obs.lineage.content_author_id, rec.source.content_author_id);
    assert.equal(obs.lineage.extracted_by, rec.extracted_by);
    assert.equal(obs.lineage.triggered_by, rec.triggered_by);
  });

  it("content_author_id null permanece null", () => {
    const input = loadInput("acquired-empty.json");
    const n1 = to_n1(input);
    assert.equal(n1[0].source.content_author_id, null);
    assert.equal(n1[0].lineage.content_author_id, null);
  });

  it("extracted_by nunca se convierte en autor", () => {
    const input = loadInput("case-a-input-03a.json");
    const rec = input.observation_records[0];
    const obs = to_n1(input)[0];
    assert.equal(obs.extracted_by, rec.extracted_by);
    assert.notEqual(obs.source.content_author_id, obs.extracted_by);
    assert.notEqual(obs.lineage.content_author_id, obs.extracted_by);
  });

  it("triggered_by nunca se convierte en fuente de afirmación", () => {
    const input = loadInput("case-a-input-03a.json");
    const obs = to_n1(input)[0];
    assert.notEqual(obs.triggered_by, obs.source.system);
    assert.notEqual(obs.triggered_by, obs.source.content_author_id);
    assert.notEqual(obs.lineage.triggered_by, obs.lineage.system);
  });

  it("N1 no muta ObservationRecord de entrada", () => {
    const input = loadInput("case-a-input-03a.json");
    const before = structuredClone(input.observation_records);
    to_n1(input);
    assemble(input);
    assert.deepEqual(input.observation_records, before);
  });

  it("AcquisitionStatus no se convierte por sí solo en Observación N1", () => {
    const input = loadInput("case-b-input-03a.json");
    const n1 = to_n1(input);
    assert.deepEqual(n1, []);
    const bundle = assemble(input);
    assert.deepEqual(bundle.observations, []);
    assert.equal(bundle.source_health.folios, "SOURCE_NOT_INTEGRATED");
  });
});

describe("Evidence Builder — barreras N2/N3/N4 y fail-closed", () => {
  it("ningún N2 sin N1", () => {
    const input = loadInput("case-a-input-03a.json");
    const n1 = to_n1(input);
    const n2 = to_n2(n1, input);
    const ids = new Set(n1.map((o) => o.observation_id));
    for (const fact of n2) {
      assert.ok(fact.supporting_observation_ids.length > 0);
      for (const oid of fact.supporting_observation_ids) {
        assert.ok(ids.has(oid));
      }
    }
    assert.deepEqual(to_n2([], input), []);
  });

  it("ningún N3 sin N2", () => {
    assert.deepEqual(to_n3([], {}), []);
    const input = loadInput("case-a-input-03a.json");
    const n2 = to_n2(to_n1(input), input);
    const n3 = to_n3(n2, input);
    assert.deepEqual(n3, []);
    assert.equal(RULE_REGISTRY.evidence_rules.length, 0);
  });

  it("ningún N4 sin regla y soporte", () => {
    assert.deepEqual(to_n4([], { facts: [] }), []);
    const input = loadInput("case-a-input-03a.json");
    const n2 = to_n2(to_n1(input), input);
    assert.deepEqual(to_n4([], { facts: n2 }), []);
  });

  it("ACQUIRED_EMPTY no produce ABSENCE_CONFIRMED", () => {
    const bundle = assemble(loadInput("acquired-empty.json"));
    assert.equal(bundle.observations[0].absence_state, "DATA_NOT_FOUND");
    assert.equal(
      JSON.stringify(bundle).includes("ABSENCE_CONFIRMED"),
      false
    );
    assert.deepEqual(bundle.facts, []);
  });

  it("TOOL_ERROR no se convierte en vacío de negocio", () => {
    const bundle = assemble(loadInput("tool-error.json"));
    assert.equal(bundle.source_health.arr, "TOOL_ERROR");
    assert.deepEqual(bundle.observations, []);
    assert.deepEqual(bundle.facts, []);
    assert.equal(JSON.stringify(bundle).includes("ABSENCE_CONFIRMED"), false);
    assert.equal(JSON.stringify(bundle).includes("DATA_NOT_FOUND"), false);
    assert.equal(bundle.knowledge_coverage, "CONOZCO_PARCIALMENTE");
  });

  it("SOURCE_RESTRICTED no produce hecho", () => {
    const bundle = assemble(loadInput("source-restricted.json"));
    assert.deepEqual(bundle.facts, []);
    assert.deepEqual(bundle.observations, []);
    assert.equal(bundle.source_health.restricted_domain, "SOURCE_RESTRICTED");
    assert.equal(bundle.knowledge_coverage, "NO_CONOZCO");
  });

  it("ENTITY_UNRESOLVED no inventa entidad canónica", () => {
    const bundle = assemble(loadInput("entity-unresolved.json"));
    assert.deepEqual(bundle.observations, []);
    assert.deepEqual(bundle.facts, []);
    assert.equal(
      bundle.facts.some((f) => f.entity && f.entity.entity_id),
      false
    );
    assert.equal(bundle.source_health.entity, "ENTITY_UNRESOLVED");
  });

  it("sin G8 se emite MATERIALITY_NOT_ASSESSED donde corresponda", () => {
    const bundle = assemble(loadInput("case-a-input-03a.json"));
    assert.ok(bundle.facts.length > 0);
    for (const fact of bundle.facts) {
      assert.equal(fact.materiality, "MATERIALITY_NOT_ASSESSED");
      assert.equal(fact.applied_materiality_rule_id, null);
      assert.notEqual(fact.materiality, "MAT_LOW");
    }
    const emptyBanks = assemble(loadInput("case-b-input-03a.json"));
    assert.deepEqual(emptyBanks.facts, []);
    assert.equal(JSON.stringify(emptyBanks).includes("MAT_"), false);
  });

  it("sin reglas de resolución no se emite RESOLVED", () => {
    const bundle = assemble(loadInput("conflict-open.json"));
    assert.ok(bundle.conflicts.length > 0);
    for (const c of bundle.conflicts) {
      assert.notEqual(c.resolution_status, "RESOLVED");
      assert.equal(c.resolution_status, "OPEN");
      assert.equal(c.applied_resolution_rule_id, null);
    }
    const forced = emit_bundle(
      {
        n1: [],
        n2: [],
        n3: [],
        n4: [],
        conflicts: [
          {
            conflict_id: "c1",
            primary_type: "A",
            resolution_status: "RESOLVED",
            applied_resolution_rule_id: null,
          },
        ],
      },
      { trace_id: "tr_forced", acquisition_statuses: [] }
    );
    assert.equal(forced.conflicts[0].resolution_status, "OPEN");
  });

  it("Tipo E no se suaviza ni oculta", () => {
    const bundle = emit_bundle(
      {
        n1: [],
        n2: [],
        n3: [],
        n4: [],
        conflicts: [
          {
            conflict_id: "c_e",
            primary_type: "E",
            resolution_status: "OPEN",
            governance_escalation: true,
          },
        ],
      },
      {
        trace_id: "tr_tipo_e",
        acquisition_statuses: [{ tool_id: "t", domain: "d", status: "ACQUIRED_OK" }],
      }
    );
    const e = bundle.conflicts.find((c) => c.primary_type === "E");
    assert.ok(e);
    assert.equal(e.resolution_status, "OPEN");
    assert.equal(e.governance_escalation, true);
  });
});

describe("Evidence Builder — Bundle y frontera EKS", () => {
  it("Bundle producer = evidence_builder", () => {
    const bundle = assemble(loadInput("case-a-input-03a.json"));
    assert.equal(bundle.producer, "evidence_builder");
  });

  it("bundle.observations contiene N1 y no AcquisitionStatus", () => {
    const bundle = assemble(loadInput("case-a-input-03a.json"));
    assert.ok(bundle.observations.length > 0);
    for (const obs of bundle.observations) {
      assert.ok(obs.observation_id);
      assert.ok(obs.lineage);
      assert.ok(obs.raw_result_ref);
      assert.equal(Object.prototype.hasOwnProperty.call(obs, "status"), false);
    }
    assert.ok(Object.keys(bundle.source_health).length > 0);
  });

  it("Bundle emitido pasa EKS validate_structure (A, B y fail-closed)", () => {
    const names = [
      "case-a-input-03a.json",
      "case-b-input-03a.json",
      "acquired-empty.json",
      "tool-error.json",
      "source-restricted.json",
      "entity-unresolved.json",
      "conflict-open.json",
    ];
    for (const name of names) {
      const bundle = assemble(loadInput(name));
      const r = validate_structure(bundle);
      assert.equal(r.ok, true, `${name}: ${r.errors.join(",")}`);
    }
  });

  it("EB no llama append_snapshot", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(src.includes("append_snapshot"), false);
    assert.equal(src.includes("createEks"), false);
    assert.equal(src.includes("createEksRuntime"), false);
  });

  it("input original permanece sin mutación", () => {
    const input = loadInput("case-a-input-03a.json");
    const before = structuredClone(input);
    assemble(input);
    assert.deepEqual(input, before);
  });

  it("confidence dimensional sin producto calibrado ni wi/k", () => {
    const bundle = assemble(loadInput("case-a-input-03a.json"));
    for (const fact of bundle.facts) {
      assert.equal(fact.confidence.Fs, null);
      assert.equal(fact.confidence.R, null);
      assert.equal(fact.confidence.Cb, null);
      assert.equal(fact.confidence.Cs, null);
      assert.equal(fact.confidence.Cb_ov, null);
    }
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(/\bwi\s*=/.test(src), false);
    assert.equal(RULE_REGISTRY.absence_rules.length, 0);
    assert.equal(RULE_REGISTRY.causal_rules.length, 0);
    assert.equal(RULE_REGISTRY.materiality_rules.length, 0);
  });

  it("Caso B: NO_CONOZCO, bancos vacíos, sin hipótesis", () => {
    const bundle = assemble(loadInput("case-b-input-03a.json"));
    assert.equal(bundle.knowledge_coverage, "NO_CONOZCO");
    assert.deepEqual(bundle.observations, []);
    assert.deepEqual(bundle.facts, []);
    assert.deepEqual(bundle.evidence, []);
    assert.deepEqual(bundle.diagnoses, []);
    assert.ok(bundle.open_questions.length > 0);
    assert.equal(bundle.open_questions[0].question.includes("hipótesis"), false);
  });

  it("createEvidenceBuilder expone I2 y es determinista", () => {
    const eb = createEvidenceBuilder();
    const input = loadInput("case-a-input-03a.json");
    const a = eb.assemble(input);
    const b = eb.assemble(input);
    assert.deepEqual(a, b);
    assert.equal(typeof eb.to_n1, "function");
    assert.equal(typeof eb.to_n2, "function");
    assert.equal(typeof eb.to_n3, "function");
    assert.equal(typeof eb.to_n4, "function");
    assert.equal(typeof eb.emit_bundle, "function");
  });
});
