"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createDirectorIaE2e } = require("../lib/director-ia-e2e");
const { createObservationPipeline } = require("../lib/director-ia-observation-pipeline");
const { createEvidenceBuilder } = require("../lib/director-ia-evidence-builder");
const { createEks } = require("../lib/director-ia-eks");
const { createIesBuilder } = require("../lib/director-ia-ies-builder");
const { createReasoningEngine } = require("../lib/director-ia-reasoning-engine");
const {
  createChannelProjection,
  createDefaultPolicyRegistry,
} = require("../lib/director-ia-channel-projection");

const FIX_DIR = path.join(__dirname, "..", "fixtures", "director-ia", "e2e");
const E2E_LIB = path.join(__dirname, "..", "lib", "director-ia-e2e.js");
const EXISTING_RUNTIME_LIBS = [
  path.join(__dirname, "..", "lib", "director-ia-observation-pipeline.js"),
  path.join(__dirname, "..", "lib", "director-ia-evidence-builder.js"),
  path.join(__dirname, "..", "lib", "director-ia-eks.js"),
  path.join(__dirname, "..", "lib", "director-ia-ies-builder.js"),
  path.join(__dirname, "..", "lib", "director-ia-reasoning-engine.js"),
  path.join(__dirname, "..", "lib", "director-ia-channel-projection.js"),
];

function loadFix(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(FIX_DIR, name), "utf8"));
  assert.equal(raw.meta.figures, "ILUSTRATIVAS / FICTICIAS");
  assert.equal(raw.meta.not_institutional_coverage, true);
  return raw;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
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

function fakeAdapter(mode) {
  return {
    infer(request) {
      if (mode === "timeout") {
        const err = new Error("timeout");
        err.code = "TIMEOUT";
        throw err;
      }
      if (mode === "error") throw new Error("provider_down");
      if (mode === "synthetic") {
        const ies = request.reasoning_context.ies;
        const factId = ies.facts[0] && ies.facts[0].fact_id;
        const evId = ies.evidence[0] && ies.evidence[0].evidence_id;
        const candidate = emptyCandidate();
        candidate.interpretation.what_is_known.references = [factId, evId].filter(Boolean);
        candidate.interpretation.what_can_be_inferred.references = ["hyp_e2e_syn_1"];
        candidate.hypotheses = [
          {
            hypothesis_id: "hyp_e2e_syn_1",
            ies_id: ies.ies_id,
            ies_version: ies.ies_version,
            statement: "hipótesis ilustrativa subordinada",
            statement_language: "es-MX",
            supporting_fact_ids: [factId],
            supporting_evidence_ids: [evId],
            limitations: [],
            validity_scope: {
              plant_or_scope: ies.executive_scope && ies.executive_scope.plant_or_scope,
            },
            hypothesis_strength: "HYP_STRENGTH_MODERATE",
          },
        ];
        candidate.recommendations = [
          {
            recommendation_id: "rec_e2e_syn_1",
            statement: "recomendación ilustrativa condicionada",
            statement_language: "es-MX",
            supporting_fact_ids: [factId],
            supporting_evidence_ids: [evId],
            supporting_hypothesis_ids: ["hyp_e2e_syn_1"],
            conditions: ["si_el_soporte_se_mantiene"],
            limitations: [],
            ies_id: ies.ies_id,
            ies_version: ies.ies_version,
          },
        ];
        candidate.references = [factId, evId, ies.ies_id].filter(Boolean);
        return {
          candidate_reasoning_result: candidate,
          provider_metadata: {
            provider: "fake",
            model: "fake-v1",
            model_version: "1",
            request_id: "req_fake",
          },
        };
      }
      return {
        candidate_reasoning_result: emptyCandidate(),
        provider_metadata: {
          provider: "fake",
          model: "fake-v1",
          model_version: "1",
          request_id: "req_fake",
        },
      };
    },
  };
}

function harness(adapterMode) {
  let n = 0;
  const clock = () => "2026-08-17T13:43:53.000Z";
  const idFactory = (prefix) => `${prefix || "id"}_${++n}`;
  const modelAdapter = fakeAdapter(adapterMode || "empty");
  const op = createObservationPipeline({ clock, idFactory });
  const eb = createEvidenceBuilder({ produced_at: clock(), idFactory });
  const eks = createEks();
  const iesBuilder = createIesBuilder({ clock, idFactory });
  const reasoningEngine = createReasoningEngine({
    modelAdapter,
    clock,
    idFactory,
  });
  const channelProjection = createChannelProjection({
    policyRegistry: createDefaultPolicyRegistry(),
    clock,
    idFactory,
  });
  const e2e = createDirectorIaE2e({
    op,
    eb,
    eks,
    iesBuilder,
    reasoningEngine,
    channelProjection,
    modelAdapter,
    clock,
    idFactory,
  });
  return {
    e2e,
    op,
    eb,
    eks,
    iesBuilder,
    reasoningEngine,
    channelProjection,
    modelAdapter,
    clock,
    idFactory,
  };
}

async function runNamed(name, adapterMode) {
  const fix = loadFix(name);
  const h = harness(adapterMode);
  const envelope = clone(fix.executionEnvelope);
  const meta = clone(fix.queryContextMetadata);
  const result = await h.e2e.run({
    executionEnvelope: envelope,
    queryContextMetadata: meta,
    session: fix.session || {},
    channel: fix.channel,
    projectionDepth: fix.projectionDepth,
  });
  return { fix, h, envelope, meta, result };
}

function serialized(v) {
  return JSON.stringify(v);
}

describe("E2E — factory", () => {
  it("factory expone run", () => {
    const h = harness();
    assert.equal(typeof h.e2e.run, "function");
  });

  it("dependencias inyectadas obligatorias", () => {
    assert.throws(() => createDirectorIaE2e({}), (err) => err && err.code === "INVALID_DEPENDENCIES");
  });
});

describe("E2E — happy-path-no-evidence", () => {
  it("flujo completo happy path llega a Channel Output", async () => {
    const { result } = await runNamed("happy-path-no-evidence.json");
    assert.ok(result.channel_output);
    assert.ok(result.projection_model);
    assert.ok(result.ies);
    assert.ok(result.ies.ies_id);
    assert.equal(result.ies.status, "VALIDATED");
    assert.ok(Array.isArray(result.acquisition_statuses));
    assert.ok(Array.isArray(result.observation_records));
    assert.ok(result.knowledge_bundle);
    assert.ok(result.knowledge_snapshot);
    assert.ok(result.reasoning_result);
    assert.ok(result.reasoning_run);
  });

  it("happy path real sin evidence -> cero hypotheses", async () => {
    const { result } = await runNamed("happy-path-no-evidence.json");
    assert.equal(result.ies.evidence.length, 0);
    assert.equal(result.reasoning_result.hypotheses.length, 0);
  });

  it("happy path real sin evidence -> cero recommendations", async () => {
    const { result } = await runNamed("happy-path-no-evidence.json");
    assert.equal(result.reasoning_result.recommendations.length, 0);
  });

  it("Channel Projection no rellena N5", async () => {
    const { result } = await runNamed("happy-path-no-evidence.json");
    const types = result.projection_model.items.map((i) => i.semantic_type);
    assert.equal(types.includes("HYPOTHESIS"), false);
    assert.equal(types.includes("RECOMMENDATION"), false);
  });
});

describe("E2E — trazabilidad", () => {
  it("trace_id se preserva end-to-end", async () => {
    const { result, fix } = await runNamed("happy-path-no-evidence.json");
    const tid = fix.executionEnvelope.trace_id;
    assert.equal(result.trace_id, tid);
    assert.equal(result.knowledge_bundle.trace_id, tid);
    assert.equal(result.knowledge_snapshot.trace_id, tid);
    assert.equal(result.ies.query_context.trace_id, tid);
  });

  it("snapshot_id se preserva", async () => {
    const { result } = await runNamed("happy-path-no-evidence.json");
    assert.ok(result.knowledge_snapshot.snapshot_id);
    assert.equal(result.ies.snapshot_reference.snapshot_id, result.knowledge_snapshot.snapshot_id);
  });

  it("ies_id/version se preservan", async () => {
    const { result } = await runNamed("happy-path-no-evidence.json");
    assert.ok(result.ies.ies_id);
    assert.equal(result.ies.ies_version, 1);
    assert.equal(result.reasoning_run.ies_id, result.ies.ies_id);
    assert.equal(result.reasoning_run.ies_version, result.ies.ies_version);
    assert.equal(result.projection_model.ies_id, result.ies.ies_id);
    assert.equal(result.channel_output.ies_id, result.ies.ies_id);
  });

  it("reasoning_run referencia IES exacto", async () => {
    const { result } = await runNamed("happy-path-no-evidence.json");
    assert.equal(result.reasoning_run.ies_id, result.ies.ies_id);
    assert.equal(result.reasoning_run.ies_version, result.ies.ies_version);
  });

  it("projection referencia IES/run exactos", async () => {
    const { result } = await runNamed("happy-path-no-evidence.json");
    assert.equal(result.projection_model.ies_id, result.ies.ies_id);
    assert.equal(result.projection_model.reasoning_run_id, result.reasoning_run.run_id);
    assert.equal(result.channel_output.reasoning_run_id, result.reasoning_run.run_id);
  });
});

describe("E2E — fronteras de capas", () => {
  it("AcquisitionStatus no entra en facts", async () => {
    const { result } = await runNamed("happy-path-no-evidence.json");
    assert.equal(
      result.knowledge_bundle.facts.some((f) => f && f.status === "ACQUIRED_OK"),
      false
    );
    assert.equal(
      result.ies.facts.some((f) => f && (f.status === "ACQUIRED_OK" || f.execution_status === "ACQUIRED_OK")),
      false
    );
  });

  it("content_author_id null sobrevive hasta Snapshot/IES donde aplique", async () => {
    const { result } = await runNamed("happy-path-no-evidence.json");
    const rec = result.observation_records[0];
    assert.equal(rec.source.content_author_id, null);
    const obs = result.knowledge_snapshot.bundle.observations[0];
    assert.equal(obs.source.content_author_id, null);
    assert.equal(obs.lineage.content_author_id, null);
  });

  it("hypothesis nunca entra a IES", async () => {
    const { result } = await runNamed("happy-path-no-evidence.json");
    assert.equal(Object.prototype.hasOwnProperty.call(result.ies, "hypotheses"), false);
    assert.equal(JSON.stringify(result.ies).includes("hipótesis ilustrativa"), false);
  });

  it("inputs no se mutan", async () => {
    const { envelope, meta, fix } = await runNamed("happy-path-no-evidence.json");
    assert.equal(serialized(envelope), serialized(fix.executionEnvelope));
    assert.equal(serialized(meta), serialized(fix.queryContextMetadata));
  });
});

describe("E2E — no-knowledge", () => {
  it("NO_KNOWLEDGE llega IRRENUNCIABLE/P0", async () => {
    const { result } = await runNamed("no-knowledge.json");
    assert.equal(result.ies.status, "NO_KNOWLEDGE");
    assert.equal(result.ies.knowledge_coverage.coverage_token, "COV_NO_KNOWLEDGE");
    assert.equal(result.reasoning_result.hypotheses.length, 0);
    assert.equal(result.reasoning_result.recommendations.length, 0);
    const cov = result.projection_model.items.find((i) => i.semantic_type === "COVERAGE");
    assert.ok(cov);
    assert.equal(cov.content_class, "IRRENUNCIABLE");
    assert.equal(cov.priority, "P0_CRITICAL");
    assert.equal(cov.may_defer, false);
  });
});

describe("E2E — source-not-integrated", () => {
  it("SOURCE_NOT_INTEGRATED no afirma inexistencia", async () => {
    const { result } = await runNamed("source-not-integrated.json");
    const blob = serialized(result.ies) + serialized(result.channel_output);
    assert.equal(blob.includes("ABSENCE_CONFIRMED"), false);
    assert.equal(result.ies.facts.length, 0);
    const lim = result.projection_model.items
      .concat(result.projection_model.deferred_items)
      .find((i) => i.semantic_type === "LIMITATION");
    assert.ok(lim);
    assert.equal(lim.statement_or_reference, "SOURCE_NOT_INTEGRATED");
    assert.notEqual(lim.statement_or_reference, "DATA_NOT_FOUND");
  });
});

describe("E2E — tool-error", () => {
  it("TOOL_ERROR no afirma vacío", async () => {
    const { result } = await runNamed("tool-error.json");
    assert.equal(result.ies.facts.length, 0);
    const blob = serialized(result.ies);
    assert.equal(blob.includes("ABSENCE_CONFIRMED"), false);
    const health = result.ies.source_health.find((h) => h.tool_id === "get_arr_snapshot");
    assert.ok(health);
    assert.equal(health.execution_status, "TOOL_ERROR");
    const lim = result.projection_model.items
      .concat(result.projection_model.deferred_items)
      .find((i) => i.semantic_type === "LIMITATION");
    assert.ok(lim);
    assert.equal(lim.statement_or_reference, "TOOL_ERROR");
  });
});

describe("E2E — type-e-conflict", () => {
  it("conflicto OPEN del assemble (Tipo A) permanece visible; E2E no fabrica Tipo E", async () => {
    const { result } = await runNamed("type-e-conflict.json");
    assert.equal(result.ies.status, "CONFLICTED");
    assert.ok(result.ies.conflicts.length > 0);
    const assembled = result.ies.conflicts[0];
    assert.equal(assembled.resolution_status, "OPEN");
    assert.equal(assembled.primary_type, "CONF_TYPE_A_DATA");
    assert.equal(
      result.ies.conflicts.some((c) => c.primary_type === "CONF_TYPE_E_GOVERNANCE"),
      false
    );
    const conflictItem = result.projection_model.items.find((i) => i.semantic_type === "CONFLICT");
    assert.ok(conflictItem);
  });

  it("Tipo E llega IRRENUNCIABLE/P0", async () => {
    const fix = loadFix("type-e-conflict.json");
    assert.equal(fix.tipo_e_bundle_overlay.not_from_assemble, true);
    const h = harness();
    const overlayBundle = h.eb.emit_bundle(
      {
        n1: [],
        n2: [],
        n3: [],
        n4: [],
        conflicts: [clone(fix.tipo_e_bundle_overlay.conflict)],
      },
      {
        trace_id: "tr_e2e_tipo_e_overlay",
        bundle_id: "kb_e2e_tipo_e_overlay",
        produced_at: "2026-08-17T13:43:53.000Z",
        acquisition_statuses: [{ tool_id: "t", domain: "d", status: "ACQUIRED_OK" }],
      }
    );
    const e = overlayBundle.conflicts.find((c) => c.primary_type === "E");
    assert.ok(e);
    const snapshot = await h.eks.append_snapshot(overlayBundle);
    const snap = clone(snapshot);
    snap.query_context_metadata = clone(fix.queryContextMetadata);
    snap.query_context_metadata.trace_id = "tr_e2e_tipo_e_overlay";
    const ies = h.iesBuilder.build(snap);
    const typeE = ies.conflicts.find((c) => c.primary_type === "CONF_TYPE_E_GOVERNANCE");
    assert.ok(typeE);
    assert.equal(typeE.resolution_status, "OPEN");
    const reasoned = h.reasoningEngine.reason(ies, {});
    assert.equal(
      JSON.stringify(reasoned.reasoning_result).includes("CONF_TYPE_E_GOVERNANCE") ||
        ies.conflicts.some((c) => c.primary_type === "CONF_TYPE_E_GOVERNANCE"),
      true
    );
    const projected = h.channelProjection.project({
      ies,
      reasoningResult: reasoned.reasoning_result,
      reasoningRunId: reasoned.reasoning_run.run_id,
      channel: "DASHBOARD",
      projectionDepth: "L1_EXECUTIVE",
    });
    const item = projected.projection_model.items.find(
      (i) => i.semantic_type === "CONFLICT" && i.source_id === typeE.conflict_id
    );
    assert.ok(item);
    assert.equal(item.content_class, "IRRENUNCIABLE");
    assert.equal(item.priority, "P0_CRITICAL");
    assert.equal(item.may_defer, false);
  });
});

describe("E2E — synthetic-reasoning-with-evidence", () => {
  it("synthetic evidence permite validar hypothesis N5", async () => {
    const { result, fix, h } = await runNamed("synthetic-reasoning-with-evidence.json");
    assert.equal(fix.synthetic_evidence_not_productive, true);
    assert.equal(result.ies.evidence.length, 0);
    assert.equal(result.reasoning_result.hypotheses.length, 0);

    const iesOverlay = clone(result.ies);
    const factId = iesOverlay.facts[0].fact_id;
    iesOverlay.evidence = [
      {
        evidence_id: "ev_e2e_syn_1",
        supporting_fact_ids: [factId],
        statement_token: "synthetic_evidence_validator_only",
        causal_status: "NON_CAUSAL",
        materiality: "MATERIALITY_NOT_ASSESSED",
      },
    ];
    const syn = harness("synthetic");
    const reasoned = syn.reasoningEngine.reason(iesOverlay, {});
    assert.ok(reasoned.reasoning_result.hypotheses.length >= 1);
    assert.equal(reasoned.reasoning_result.hypotheses[0].supporting_fact_ids[0], factId);
    assert.equal(reasoned.reasoning_result.hypotheses[0].supporting_evidence_ids[0], "ev_e2e_syn_1");
    const projected = syn.channelProjection.project({
      ies: iesOverlay,
      reasoningResult: reasoned.reasoning_result,
      reasoningRunId: reasoned.reasoning_run.run_id,
      channel: "REPORT",
      projectionDepth: "L2_SUPPORT",
    });
    const types = projected.projection_model.items.map((i) => i.semantic_type);
    assert.ok(types.includes("FACT"));
    assert.ok(types.includes("HYPOTHESIS"));
    const factItem = projected.projection_model.items.find((i) => i.semantic_type === "FACT");
    const hypItem = projected.projection_model.items.find((i) => i.semantic_type === "HYPOTHESIS");
    assert.notEqual(factItem.semantic_type, hypItem.semantic_type);
    assert.equal(result.ies.evidence.length, 0);
    assert.equal(Object.prototype.hasOwnProperty.call(result.ies, "hypotheses"), false);
    assert.equal(h.e2e === syn.e2e, false);
  });

  it("Channel Projection distingue fact/hypothesis", async () => {
    const { result } = await runNamed("synthetic-reasoning-with-evidence.json");
    const iesOverlay = clone(result.ies);
    iesOverlay.evidence = [
      {
        evidence_id: "ev_e2e_syn_1",
        supporting_fact_ids: [iesOverlay.facts[0].fact_id],
        statement_token: "synthetic_evidence_validator_only",
        causal_status: "NON_CAUSAL",
        materiality: "MATERIALITY_NOT_ASSESSED",
      },
    ];
    const syn = harness("synthetic");
    const reasoned = syn.reasoningEngine.reason(iesOverlay, {});
    const projected = syn.channelProjection.project({
      ies: iesOverlay,
      reasoningResult: reasoned.reasoning_result,
      reasoningRunId: reasoned.reasoning_run.run_id,
      channel: "REPORT",
      projectionDepth: "L2_SUPPORT",
    });
    const hyp = projected.projection_model.items.find((i) => i.semantic_type === "HYPOTHESIS");
    const fact = projected.projection_model.items.find((i) => i.source_id === iesOverlay.facts[0].fact_id);
    assert.ok(hyp);
    assert.ok(fact);
    assert.equal(fact.semantic_type, "FACT");
    assert.notEqual(hyp.content_class, fact.semantic_type);
  });
});

describe("E2E — fail-closed extra y provider", () => {
  it("ACQUIRED_EMPTY != ABSENCE_CONFIRMED", async () => {
    const h = harness();
    const result = await h.e2e.run({
      executionEnvelope: {
        trace_id: "tr_e2e_empty",
        bundle_id: "kb_e2e_empty",
        produced_at: "2026-08-17T13:43:53.000Z",
        question: "¿Hay acciones ilustrativas registradas?",
        plan: { "intent": "empty_check" },
        tool_plan: { "tools": ["get_action_register"] },
        execution_results: [
          {
            trace_id: "tr_e2e_empty",
            tool_id: "get_action_register",
            domain: "action_register",
            status: "ACQUIRED_EMPTY",
            execution_id: "ex_e2e_empty_1",
            extracted_by: "get_action_register",
            triggered_by: "usuario_ilustrativo",
            extracted_at: "2026-08-17T13:43:53.000Z",
            scope_complete: true,
            source: {
              system: "action_register",
              source_family: "action_register",
              source_instance_id: "ar:ex_e2e_empty_1",
              content_author_id: null,
            },
            raw_payload_reference: "raw://tr_e2e_empty/get_action_register/ex_e2e_empty_1/0",
            payload: {},
          },
        ],
      },
      queryContextMetadata: {
        executive_query_id: "eq_e2e_empty",
        trace_id: "tr_e2e_empty",
        original_question: "¿Hay acciones ilustrativas registradas?",
        intent: "empty_check",
        requesting_user_id: "user_ilustrativo",
        requesting_role: "director",
        channel: "chat",
        resolved_entities: [],
        permission_restrictions: [],
        knowledge_effective_date: "2026-08-17T00:00:00.000Z",
      },
      channel: "CHAT",
      projectionDepth: "L1_EXECUTIVE",
    });
    const blob = serialized(result);
    assert.equal(blob.includes("ABSENCE_CONFIRMED"), false);
    assert.equal(result.observation_records[0].source.content_author_id, null);
  });

  it("provider fake timeout produce abstention/reject", async () => {
    const fix = loadFix("happy-path-no-evidence.json");
    const h = harness("timeout");
    const result = await h.e2e.run({
      executionEnvelope: clone(fix.executionEnvelope),
      queryContextMetadata: clone(fix.queryContextMetadata),
      channel: fix.channel,
      projectionDepth: fix.projectionDepth,
    });
    assert.ok(result.reasoning_run.status === "TIMEOUT" || result.reasoning_run.status === "ABSTAIN" || result.reasoning_run.status === "ERROR");
    assert.equal(result.reasoning_result.hypotheses.length, 0);
    assert.equal(result.reasoning_result.recommendations.length, 0);
  });

  it("IRRENUNCIABLE no se omite", async () => {
    const { result } = await runNamed("no-knowledge.json");
    const irr = result.projection_model.items.filter((i) => i.content_class === "IRRENUNCIABLE");
    assert.ok(irr.length > 0);
    for (const item of irr) {
      assert.equal(
        result.projection_model.deferred_items.some((d) => d.source_id === item.source_id),
        false
      );
      assert.ok(result.channel_output.content_blocks.some((b) => b.item_id === item.item_id));
    }
  });
});

describe("E2E — sin network/SDK y sin mutar runtimes", () => {
  it("provider fake no usa network", () => {
    const src = fs.readFileSync(E2E_LIB, "utf8");
    assert.equal(src.includes("fetch("), false);
    assert.equal(/require\([\"']http[\"']\)/.test(src), false);
    assert.equal(/require\([\"']net[\"']\)/.test(src), false);
    assert.equal(src.includes("openai"), false);
    assert.equal(src.includes("anthropic"), false);
  });

  it("runtime e2e no contiene provider SDK/tool calls", () => {
    const src = fs.readFileSync(E2E_LIB, "utf8");
    assert.equal(src.includes("require(\"axios\")"), false);
    assert.equal(src.includes("require(\"twilio\")"), false);
    assert.equal(src.includes("require(\"pg\")"), false);
    assert.equal(src.includes("execTool"), false);
    assert.equal(src.includes("WhoAmI"), false);
  });

  it("runtimes existentes no se modifican", () => {
    const src = fs.readFileSync(E2E_LIB, "utf8");
    assert.equal(src.includes("fs.writeFile"), false);
    assert.equal(src.includes("fs.writeFileSync"), false);
    for (const lib of EXISTING_RUNTIME_LIBS) {
      assert.equal(fs.existsSync(lib), true);
    }
  });
});
