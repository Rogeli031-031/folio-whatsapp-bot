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
const { createIesBuilder } = require("../lib/director-ia-ies-builder");
const { createReasoningEngine } = require("../lib/director-ia-reasoning-engine");
const {
  createChannelProjection,
  createDefaultPolicyRegistry,
} = require("../lib/director-ia-channel-projection");

const FIX_DIR = path.join(__dirname, "..", "fixtures", "director-ia", "evidence-builder");
const N3_DIR = path.join(__dirname, "..", "fixtures", "director-ia", "evidence-n3");
const LIB_PATH = path.join(__dirname, "..", "lib", "director-ia-evidence-builder.js");

const N3_RULE_ID = "N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE";
const N3_RULE_VERSION = "1.0";
const FORBIDDEN_STATEMENT = /caus[oó]|debido|provoca|probablemente|fraude|error humano|mala gesti[oó]n|valor verdadero|tiene raz[oó]n/i;

function loadInput(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(FIX_DIR, name), "utf8"));
  assert.equal(raw.meta.figures, "ILUSTRATIVAS / FICTICIAS");
  assert.equal(raw.meta.not_institutional_coverage, true);
  return raw.input;
}

function loadN3Input(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(N3_DIR, name), "utf8"));
  assert.equal(raw.meta.figures, "ILUSTRATIVAS / FICTICIAS");
  assert.equal(raw.meta.not_institutional_coverage, true);
  return raw.input;
}

function assertEvidenceSchema(ev, traceId) {
  assert.ok(ev.evidence_id);
  assert.equal(ev.evidence_type, "CONTRADICTION");
  assert.equal(typeof ev.statement, "string");
  assert.ok(Array.isArray(ev.supporting_fact_ids));
  assert.ok(ev.supporting_fact_ids.length >= 2);
  assert.equal(ev.applied_rule.rule_id, N3_RULE_ID);
  assert.equal(ev.applied_rule.rule_version, N3_RULE_VERSION);
  assert.equal(ev.materiality, "MATERIALITY_NOT_ASSESSED");
  assert.equal(ev.causal_status, "NON_CAUSAL");
  assert.equal(ev.traceability.trace_id, traceId);
  assert.equal(ev.traceability.rule_id, N3_RULE_ID);
  assert.equal(ev.traceability.rule_version, N3_RULE_VERSION);
  assert.equal(Object.prototype.hasOwnProperty.call(ev, "severity"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(ev, "probability"), false);
  assert.equal(FORBIDDEN_STATEMENT.test(ev.statement), false);
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

describe("Evidence Builder — registry N3 v1", () => {
  it("registry contiene exactamente una evidence rule ACTIVE", () => {
    assert.equal(RULE_REGISTRY.evidence_rules.length, 1);
    const rule = RULE_REGISTRY.evidence_rules[0];
    assert.equal(rule.rule_id, N3_RULE_ID);
    assert.equal(rule.rule_version, N3_RULE_VERSION);
    assert.equal(rule.rule_category, "CONTRADICTION");
    assert.equal(rule.causal, false);
    assert.equal(rule.status, "ACTIVE");
    assert.equal(rule.input_contract, "FACT_COMPARABILITY_KEY_V1");
    assert.equal(rule.output_contract, "EVIDENCE_N3_PHYSICAL_V1");
  });

  it("absence/resolution/causal/materiality permanecen vacíos", () => {
    assert.equal(RULE_REGISTRY.absence_rules.length, 0);
    assert.equal(RULE_REGISTRY.resolution_rules.length, 0);
    assert.equal(RULE_REGISTRY.causal_rules.length, 0);
    assert.equal(RULE_REGISTRY.materiality_rules.length, 0);
  });
});

describe("Evidence Builder — N3 CONTRADICTION", () => {
  it("dos facts comparables con values distintos -> exactamente una Evidence", () => {
    const input = loadN3Input("contradiction-two-values.json");
    const bundle = assemble(input);
    assert.equal(bundle.evidence.length, 1);
    assertEvidenceSchema(bundle.evidence[0], input.trace_id);
    assert.deepEqual(bundle.evidence[0].supporting_fact_ids, ["fact_obs_n3_a", "fact_obs_n3_b"]);
    assert.equal(validate_structure(bundle).ok, true);
  });

  it("tres facts comparables con values distintos -> support determinístico", () => {
    const input = loadN3Input("contradiction-three-facts.json");
    const bundle = assemble(input);
    assert.equal(bundle.evidence.length, 1);
    assertEvidenceSchema(bundle.evidence[0], input.trace_id);
    assert.deepEqual(bundle.evidence[0].supporting_fact_ids, [
      "fact_obs_n3_t1",
      "fact_obs_n3_t2",
      "fact_obs_n3_t3",
    ]);
  });

  it("mismo value comparable -> cero Evidence", () => {
    const bundle = assemble(loadN3Input("same-value-no-contradiction.json"));
    assert.deepEqual(bundle.evidence, []);
  });

  it("menos de 2 facts -> cero Evidence", () => {
    assert.deepEqual(to_n3([], {}), []);
    assert.deepEqual(to_n3([{ fact_id: "fact_only", value: 1, metric_or_event: "venta_t", period: "p" }], {}), []);
  });

  it("periodo distinto -> cero CONTRADICTION", () => {
    assert.deepEqual(assemble(loadN3Input("different-period-no-contradiction.json")).evidence, []);
  });

  it("métrica distinta -> cero CONTRADICTION", () => {
    assert.deepEqual(assemble(loadN3Input("different-metric-no-contradiction.json")).evidence, []);
  });

  it("entidad distinta -> cero CONTRADICTION", () => {
    assert.deepEqual(assemble(loadN3Input("different-entity-no-contradiction.json")).evidence, []);
  });

  it("AMBIGUOUS -> cero CONTRADICTION", () => {
    const bundle = assemble(loadN3Input("ambiguous-entity-no-contradiction.json"));
    assert.deepEqual(bundle.facts, []);
    assert.deepEqual(bundle.evidence, []);
  });

  it("UNRESOLVED inyectado en to_n3 -> cero CONTRADICTION", () => {
    const facts = [
      {
        fact_id: "fact_u1",
        metric_or_event: "venta_t",
        period: "mes_B_ilustrativo",
        value: 95,
        entity: { resolution: "UNRESOLVED", original_value: "Puebla" },
      },
      {
        fact_id: "fact_u2",
        metric_or_event: "venta_t",
        period: "mes_B_ilustrativo",
        value: 120,
        entity: { resolution: "UNRESOLVED", original_value: "Puebla" },
      },
    ];
    assert.deepEqual(to_n3(facts, { trace_id: "tr_unresolved" }), []);
  });

  it("AMBIGUOUS inyectado en to_n3 -> cero CONTRADICTION", () => {
    const facts = [
      {
        fact_id: "fact_a1",
        metric_or_event: "venta_t",
        period: "mes_B_ilustrativo",
        value: 95,
        entity: { resolution: "AMBIGUOUS", original_value: "Puebla" },
      },
      {
        fact_id: "fact_a2",
        metric_or_event: "venta_t",
        period: "mes_B_ilustrativo",
        value: 120,
        entity: { resolution: "AMBIGUOUS", original_value: "Puebla" },
      },
    ];
    assert.deepEqual(to_n3(facts, { trace_id: "tr_amb_direct" }), []);
  });

  it("scope sin entidad válido produce CONTRADICTION", () => {
    const facts = [
      { fact_id: "fact_el_1", metric_or_event: "venta_t", period: "mes_B_ilustrativo", value: 10, entity: null },
      { fact_id: "fact_el_2", metric_or_event: "venta_t", period: "mes_B_ilustrativo", value: 20, entity: null },
    ];
    const n3 = to_n3(facts, { trace_id: "tr_entityless" });
    assert.equal(n3.length, 1);
    assertEvidenceSchema(n3[0], "tr_entityless");
  });

  it("statement no causal y no selecciona valor verdadero ni fuentes", () => {
    const ev = assemble(loadN3Input("contradiction-two-values.json")).evidence[0];
    assert.equal(ev.statement, "facts report distinct values for the same comparison scope");
    assert.equal(FORBIDDEN_STATEMENT.test(ev.statement), false);
    assert.equal(ev.statement.includes("95"), false);
    assert.equal(ev.statement.includes("120"), false);
  });

  it("orden invertido de facts produce la misma Evidence lógica", () => {
    const input = loadN3Input("contradiction-two-values.json");
    const n2 = to_n2(to_n1(input), input);
    const reversed = n2.slice().reverse();
    const a = to_n3(n2, { trace_id: input.trace_id });
    const b = to_n3(reversed, { trace_id: input.trace_id });
    assert.equal(a.length, 1);
    assert.equal(b.length, 1);
    assert.deepEqual(a[0].supporting_fact_ids, b[0].supporting_fact_ids);
    assert.equal(a[0].statement, b[0].statement);
    assert.deepEqual(a[0].applied_rule, b[0].applied_rule);
    const sorted = a[0].supporting_fact_ids.slice().sort();
    assert.deepEqual(a[0].supporting_fact_ids, sorted);
  });

  it("no muta facts ni observations de entrada", () => {
    const input = loadN3Input("contradiction-two-values.json");
    const beforeInput = structuredClone(input);
    const n1 = to_n1(input);
    const beforeN1 = structuredClone(n1);
    const n2 = to_n2(n1, input);
    const beforeN2 = structuredClone(n2);
    to_n3(n2, input);
    assemble(input);
    assert.deepEqual(input, beforeInput);
    assert.deepEqual(n1, beforeN1);
    assert.deepEqual(n2, beforeN2);
  });
});

describe("Evidence Builder — frontera conflicto y N4", () => {
  it("contradicción simple permanece Tipo A OPEN", () => {
    const bundle = assemble(loadN3Input("contradiction-two-values.json"));
    assert.equal(bundle.evidence.length, 1);
    assert.ok(bundle.conflicts.length > 0);
    for (const c of bundle.conflicts) {
      assert.equal(c.primary_type, "A");
      assert.equal(c.resolution_status, "OPEN");
      assert.deepEqual(c.secondary_types, []);
      assert.equal(c.governance_escalation, false);
      assert.equal(Object.prototype.hasOwnProperty.call(c, "severity"), false);
      assert.notEqual(c.primary_type, "E");
    }
  });

  it("N3 no crea Tipo E ni resuelve", () => {
    const bundle = assemble(loadN3Input("contradiction-two-values.json"));
    assert.equal(bundle.conflicts.some((c) => c.primary_type === "E"), false);
    assert.equal(bundle.conflicts.some((c) => c.resolution_status === "RESOLVED"), false);
    assert.equal(JSON.stringify(bundle).includes("CONF_TYPE_E"), false);
  });

  it("presencia de N3 no produce N4", () => {
    const input = loadN3Input("contradiction-two-values.json");
    const bundle = assemble(input);
    assert.ok(bundle.evidence.length > 0);
    assert.deepEqual(bundle.diagnoses, []);
    const n2 = to_n2(to_n1(input), input);
    const n3 = to_n3(n2, input);
    assert.deepEqual(to_n4(n3, { facts: n2 }), []);
  });
});

describe("Evidence Builder — N3 downstream EKS/IES/RE/CP", () => {
  function snapshotFromBundle(bundle) {
    return {
      snapshot_id: "snap_n3_downstream",
      bundle_id: bundle.bundle_id,
      trace_id: bundle.trace_id,
      version: 1,
      persisted_at: "2026-08-17T16:25:13.000Z",
      integrity: "sha256:n3_downstream",
      query_context_metadata: {
        executive_query_id: "eq_n3_downstream",
        query_fingerprint: "qfp_n3_downstream",
        trace_id: bundle.trace_id,
        original_question: "¿Hay contradicción ilustrativa?",
        intent: "n3_contradiction",
        requesting_user_id: "user_ilustrativo",
        requesting_role: "director",
        channel: "dashboard",
        resolved_entities: [],
        permission_restrictions: [],
        knowledge_effective_date: "2026-08-17T00:00:00.000Z",
      },
      bundle,
    };
  }

  function emptyCandidate() {
    return {
      interpretation: {
        what_is_known: { references: [] },
        what_can_be_inferred: { references: [] },
        what_cannot_be_concluded: { references: [] },
      },
      hypotheses: [],
      recommendations: [],
      next_verifications: [],
      decision_options: [],
      abstentions: [],
      clarification_requests: [],
      reasoning_limits: {},
      references: [],
    };
  }

  it("EKS validate_structure acepta Bundle con N3", () => {
    const bundle = assemble(loadN3Input("contradiction-two-values.json"));
    const check = validate_structure(bundle);
    assert.equal(check.ok, true, check.errors.join(","));
  });

  it("IES preserva Evidence N3", () => {
    const bundle = assemble(loadN3Input("contradiction-two-values.json"));
    let n = 0;
    const ies = createIesBuilder({
      clock: () => "2026-08-17T16:25:13.000Z",
      idFactory: (prefix) => `${prefix || "ies"}_${++n}`,
    }).build(snapshotFromBundle(bundle));
    assert.equal(ies.evidence.length, 1);
    assert.equal(ies.evidence[0].evidence_id, bundle.evidence[0].evidence_id);
    assert.equal(ies.evidence[0].evidence_type, "CONTRADICTION");
    assert.deepEqual(ies.evidence[0].supporting_fact_ids, bundle.evidence[0].supporting_fact_ids);
    const v = createIesBuilder({
      clock: () => "2026-08-17T16:25:13.000Z",
      idFactory: (prefix) => `${prefix || "ies"}_${++n}`,
    }).validate(ies);
    assert.equal(v.ok, true, v.errors.join(","));
  });

  it("RE consume IES con N3 sin bypass y conserva gates", () => {
    const bundle = assemble(loadN3Input("contradiction-two-values.json"));
    let n = 0;
    const ies = createIesBuilder({
      clock: () => "2026-08-17T16:25:13.000Z",
      idFactory: (prefix) => `${prefix || "ies"}_${++n}`,
    }).build(snapshotFromBundle(bundle));
    assert.ok(ies.evidence.length > 0);

    const emptyEngine = createReasoningEngine({
      modelAdapter: {
        infer() {
          return {
            candidate_reasoning_result: emptyCandidate(),
            provider_metadata: { provider: "fake", model: "fake-v1", model_version: "1", request_id: "req_n3" },
          };
        },
      },
      clock: () => "2026-08-17T16:25:13.000Z",
      idFactory: (prefix) => `${prefix || "id"}_${++n}`,
      policy: { reasoning_policy_version: "05-v1.0-physical-d1-d16" },
    });
    const emptyOut = emptyEngine.reason(ies, {});
    assert.notEqual(emptyOut.reasoning_run.status, "REJECT");
    assert.equal(emptyOut.reasoning_result.hypotheses.length, 0);
    assert.equal(emptyOut.reasoning_result.recommendations.length, 0);

    const gatedEngine = createReasoningEngine({
      modelAdapter: {
        infer(request) {
          const candidate = emptyCandidate();
          candidate.hypotheses = [
            {
              hypothesis_id: "hyp_n3_missing_ev",
              ies_id: request.reasoning_context.ies.ies_id,
              ies_version: request.reasoning_context.ies.ies_version,
              statement: "hipótesis ilustrativa",
              statement_language: "es-MX",
              supporting_fact_ids: [request.reasoning_context.ies.facts[0].fact_id],
              supporting_evidence_ids: [],
              limitations: [],
              hypothesis_strength: "HYP_STRENGTH_MODERATE",
            },
          ];
          return {
            candidate_reasoning_result: candidate,
            provider_metadata: { provider: "fake", model: "fake-v1", model_version: "1", request_id: "req_n3_gate" },
          };
        },
      },
      clock: () => "2026-08-17T16:25:13.000Z",
      idFactory: (prefix) => `${prefix || "id"}_${++n}`,
      policy: { reasoning_policy_version: "05-v1.0-physical-d1-d16" },
    });
    const gated = gatedEngine.reason(ies, {});
    assert.equal(gated.reasoning_result.hypotheses.length, 0);
    assert.ok(gated.reasoning_run);
  });

  it("Channel Projection separa Fact / Evidence / Hypothesis", () => {
    const bundle = assemble(loadN3Input("contradiction-two-values.json"));
    let n = 0;
    const ies = createIesBuilder({
      clock: () => "2026-08-17T16:25:13.000Z",
      idFactory: (prefix) => `${prefix || "ies"}_${++n}`,
    }).build(snapshotFromBundle(bundle));
    const cp = createChannelProjection({
      policyRegistry: createDefaultPolicyRegistry(),
      clock: () => "2026-08-17T16:25:13.000Z",
      idFactory: (prefix) => `${prefix || "cp"}_${++n}`,
    });
    const out = cp.project({
      ies,
      channel: "DASHBOARD",
      projectionDepth: "L2_SUPPORT",
    });
    const types = out.projection_model.items
      .concat(out.projection_model.deferred_items)
      .map((item) => item.semantic_type);
    assert.ok(types.includes("FACT"));
    assert.ok(types.includes("EVIDENCE"));
    assert.equal(types.includes("HYPOTHESIS"), false);
  });
});
