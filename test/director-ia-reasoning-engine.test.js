"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  createReasoningEngine,
  OUTPUT_SCHEMA_VERSION,
  DEFAULT_LANGUAGE,
  STRENGTH,
} = require("../lib/director-ia-reasoning-engine");
const { createIesBuilder } = require("../lib/director-ia-ies-builder");

const FIX_DIR = path.join(__dirname, "..", "fixtures", "director-ia", "reasoning");
const IES_FIX = path.join(__dirname, "..", "fixtures", "director-ia", "ies");
const LIB_PATH = path.join(__dirname, "..", "lib", "director-ia-reasoning-engine.js");

function loadIes(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(FIX_DIR, name), "utf8"));
  assert.equal(raw.meta.figures, "ILUSTRATIVAS / FICTICIAS");
  assert.equal(raw.meta.not_institutional_coverage, true);
  return raw.ies;
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

function fakeAdapter(behavior, capture) {
  return {
    infer(request) {
      if (capture) capture.lastRequest = request;
      if (behavior === "throws_timeout") {
        const err = new Error("timeout");
        err.code = "TIMEOUT";
        throw err;
      }
      if (behavior === "throws_error") throw new Error("provider_down");
      if (behavior === "returns_malformed_output") return { not_a_candidate: true };
      if (typeof behavior === "function") return behavior(request);
      return {
        candidate_reasoning_result: emptyCandidate(),
        provider_metadata: { provider: "fake", model: "fake-v1", model_version: "1", request_id: "req_fake" },
      };
    },
  };
}

function engine(adapter, clockValue) {
  let n = 0;
  return createReasoningEngine({
    modelAdapter: adapter,
    clock: () => clockValue || "2026-08-17T12:00:00.000Z",
    idFactory: (prefix) => `${prefix || "id"}_${++n}`,
    policy: { reasoning_policy_version: "05-v1.0-physical-d1-d16" },
  });
}

function assertEnvelope(result) {
  for (const key of [
    "interpretation",
    "hypotheses",
    "recommendations",
    "next_verifications",
    "decision_options",
    "abstentions",
    "clarification_requests",
    "reasoning_limits",
    "references",
  ]) {
    assert.ok(Object.prototype.hasOwnProperty.call(result, key), key);
  }
  assert.ok(Array.isArray(result.hypotheses));
  assert.ok(Array.isArray(result.recommendations));
  assert.ok(Array.isArray(result.next_verifications));
  assert.ok(Array.isArray(result.decision_options));
  assert.ok(Array.isArray(result.abstentions));
  assert.ok(Array.isArray(result.clarification_requests));
  assert.ok(result.interpretation.what_is_known);
  assert.ok(result.interpretation.what_can_be_inferred);
  assert.ok(result.interpretation.what_cannot_be_concluded);
}

function validHyp(ies, extras) {
  return Object.assign(
    {
      hypothesis_id: "hyp_syn_1",
      ies_id: ies.ies_id,
      ies_version: ies.ies_version,
      statement: "hipótesis ilustrativa subordinada",
      statement_language: "es-MX",
      supporting_fact_ids: [ies.facts[0].fact_id],
      supporting_evidence_ids: [ies.evidence[0].evidence_id],
      limitations: [],
      validity_scope: { plant_or_scope: ies.executive_scope && ies.executive_scope.plant_or_scope },
      hypothesis_strength: "HYP_STRENGTH_MODERATE",
      is_primary_candidate: true,
    },
    extras || {}
  );
}

describe("RE — factory y sesión", () => {
  it("factory expone reason", () => {
    const re = engine(fakeAdapter("returns_valid_empty_result"));
    assert.equal(typeof re.reason, "function");
  });

  it("dependencias inyectadas obligatorias", () => {
    assert.throws(() => createReasoningEngine({}), (err) => err && err.code === "INVALID_DEPENDENCIES");
  });

  it("session default canonical_reasoning_language es-MX", () => {
    const capture = {};
    const ies = loadIes("validated-no-evidence.json");
    engine(fakeAdapter("returns_valid_empty_result", capture)).reason(ies, {});
    assert.equal(capture.lastRequest.session.canonical_reasoning_language, DEFAULT_LANGUAGE);
    assert.equal(DEFAULT_LANGUAGE, "es-MX");
  });
});

describe("RE — gate de IES", () => {
  it("IES consumible pasa gate", () => {
    const ies = loadIes("validated-no-evidence.json");
    const out = engine(fakeAdapter("returns_valid_empty_result")).reason(ies, {});
    assert.notEqual(out.reasoning_run.validation_result.errors.includes("ies_not_consumable"), true);
    assert.equal(out.reasoning_run.audit.model_called, true);
  });

  for (const status of ["BUILDING", "EXPIRED", "SUPERSEDED", "INVALID"]) {
    it(`IES ${status} se rechaza`, () => {
      const ies = loadIes("validated-no-evidence.json");
      ies.status = status;
      const capture = {};
      const out = engine(fakeAdapter("returns_valid_empty_result", capture)).reason(ies, {});
      assert.equal(out.reasoning_run.status, "REJECT");
      assert.equal(out.reasoning_run.audit.model_called, false);
      assert.equal(capture.lastRequest, undefined);
      assert.equal(out.reasoning_result.hypotheses.length, 0);
    });
  }
});

describe("RE — fail-closed evidence / NO_KNOWLEDGE", () => {
  it("NO_KNOWLEDGE no llama hipótesis sustantiva", () => {
    const ies = loadIes("no-knowledge.json");
    const out = engine(fakeAdapter("returns_valid_empty_result")).reason(ies, {});
    assert.equal(out.reasoning_result.hypotheses.length, 0);
    assert.equal(out.reasoning_result.recommendations.length, 0);
    assert.ok(out.reasoning_result.abstentions.some((a) => a.abstention_kind === "NO_KNOWLEDGE"));
  });

  it("evidence[] vacío produce cero hypotheses", () => {
    for (const name of [
      "validated-no-evidence.json",
      "partial-no-evidence.json",
      "conflicted-no-evidence.json",
    ]) {
      const out = engine(fakeAdapter("returns_valid_empty_result")).reason(loadIes(name), {});
      assert.equal(out.reasoning_result.hypotheses.length, 0, name);
    }
  });

  it("evidence[] vacío produce cero recommendations", () => {
    const ies = loadIes("validated-no-evidence.json");
    const out = engine(fakeAdapter("returns_valid_empty_result")).reason(ies, {});
    assert.equal(out.reasoning_result.recommendations.length, 0);
  });

  it("NO_KNOWLEDGE candidate con hypothesis -> reject/abstain", () => {
    const ies = loadIes("no-knowledge.json");
    const adapter = fakeAdapter((req) => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), {
        hypotheses: [
          {
            hypothesis_id: "hyp_bad",
            ies_id: ies.ies_id,
            ies_version: ies.ies_version,
            statement: "no debe pasar",
            statement_language: "es-MX",
            supporting_fact_ids: ["missing"],
            supporting_evidence_ids: ["missing"],
            limitations: [],
            validity_scope: {},
            hypothesis_strength: "HYP_STRENGTH_STRONG",
          },
        ],
      }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.hypotheses.length, 0);
    assert.ok(["REJECT", "ABSTAIN"].includes(out.reasoning_run.status));
  });
});

describe("RE — adapter y envelope", () => {
  it("fake adapter no recibe DB/tools/raw sources", () => {
    const capture = {};
    const ies = loadIes("validated-no-evidence.json");
    engine(fakeAdapter("returns_valid_empty_result", capture)).reason(ies, { analysis_mode: "diagnostico" });
    const req = capture.lastRequest;
    assert.equal(req.output_schema_version, OUTPUT_SCHEMA_VERSION);
    assert.ok(req.reasoning_context.ies);
    assert.equal(req.reasoning_context.ies.ies_id, ies.ies_id);
    assert.equal(req.tools, undefined);
    assert.equal(req.db, undefined);
    assert.equal(req.sql, undefined);
    assert.equal(req.raw_payload, undefined);
    assert.equal(req.reasoning_context.tools, undefined);
  });

  it("candidate result arrays siempre presentes", () => {
    const out = engine(fakeAdapter("returns_valid_empty_result")).reason(loadIes("validated-no-evidence.json"), {});
    assertEnvelope(out.reasoning_result);
  });

  it("interpretation usa tres partes", () => {
    const out = engine(fakeAdapter("returns_valid_empty_result")).reason(loadIes("partial-no-evidence.json"), {});
    const i = out.reasoning_result.interpretation;
    assert.ok(Array.isArray(i.what_is_known.references));
    assert.ok(Array.isArray(i.what_can_be_inferred.references));
    assert.ok(Array.isArray(i.what_cannot_be_concluded.references));
    assert.equal(i.what_can_be_inferred.references.length, 0);
  });
});

describe("RE — hipótesis y strength", () => {
  it("hypothesis references deben existir; supporting_evidence_ids y supporting_fact_ids obligatorios", () => {
    const ies = loadIes("synthetic-with-evidence-for-validator.json");
    const adapter = fakeAdapter(() => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), { hypotheses: [validHyp(ies)] }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.hypotheses.length, 1);
    assert.ok(out.reasoning_result.hypotheses[0].supporting_evidence_ids.length >= 1);
    assert.ok(out.reasoning_result.hypotheses[0].supporting_fact_ids.length >= 1);
  });

  it("invalid refs -> reject/abstain", () => {
    const ies = loadIes("synthetic-with-evidence-for-validator.json");
    const hyp = validHyp(ies, { supporting_evidence_ids: ["ev_no_existe"] });
    const adapter = fakeAdapter(() => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), { hypotheses: [hyp] }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.hypotheses.length, 0);
    assert.equal(out.reasoning_run.status, "REJECT");
  });

  it("strength enum validado", () => {
    const ies = loadIes("synthetic-with-evidence-for-validator.json");
    const hyp = validHyp(ies, { hypothesis_strength: "HYP_STRENGTH_99" });
    const adapter = fakeAdapter(() => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), { hypotheses: [hyp] }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.hypotheses.length, 0);
    STRENGTH.forEach((t) => assert.ok(t.startsWith("HYP_STRENGTH_")));
  });

  it("STRONG se rechaza/degrada bajo blocking limitation", () => {
    const ies = loadIes("synthetic-type-e.json");
    const hyp = validHyp(ies, {
      supporting_fact_ids: ["fact_syn_e_1"],
      supporting_evidence_ids: ["ev_syn_e_1"],
      hypothesis_strength: "HYP_STRENGTH_STRONG",
      limitations: ["lim_restricted_SOURCE_RESTRICTED"],
      validity_scope: {},
    });
    const adapter = fakeAdapter(() => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), { hypotheses: [hyp] }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.hypotheses.length, 1);
    assert.notEqual(out.reasoning_result.hypotheses[0].hypothesis_strength, "HYP_STRENGTH_STRONG");
    assert.equal(out.reasoning_result.hypotheses[0].hypothesis_strength, "HYP_STRENGTH_WEAK");
  });

  it("STRONG se rechaza/degrada bajo adverse conflict", () => {
    const ies = loadIes("synthetic-type-e.json");
    const hyp = validHyp(ies, {
      supporting_fact_ids: ["fact_syn_e_1"],
      supporting_evidence_ids: ["ev_syn_e_1"],
      conflict_ids: ["c_re_syn_e"],
      hypothesis_strength: "HYP_STRENGTH_STRONG",
      limitations: [],
      validity_scope: {},
    });
    const adapter = fakeAdapter(() => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), { hypotheses: [hyp] }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.hypotheses.length, 1);
    assert.equal(out.reasoning_result.hypotheses[0].hypothesis_strength, "HYP_STRENGTH_WEAK");
  });

  it("rivals no se auto-rankean; is_primary_candidate false por defecto", () => {
    const ies = loadIes("synthetic-with-evidence-for-validator.json");
    const h1 = validHyp(ies, {
      hypothesis_id: "hyp_a",
      rival_group_id: "rg1",
      is_primary_candidate: true,
      hypothesis_strength: "HYP_STRENGTH_STRONG",
    });
    const h2 = validHyp(ies, {
      hypothesis_id: "hyp_b",
      rival_group_id: "rg1",
      is_primary_candidate: false,
      hypothesis_strength: "HYP_STRENGTH_WEAK",
    });
    const adapter = fakeAdapter(() => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), { hypotheses: [h2, h1] }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.hypotheses.length, 2);
    assert.equal(out.reasoning_result.hypotheses[0].hypothesis_id, "hyp_b");
    assert.equal(out.reasoning_result.hypotheses[1].hypothesis_id, "hyp_a");
    assert.equal(out.reasoning_result.hypotheses.every((h) => h.is_primary_candidate === false), true);
  });
});

describe("RE — recommendation / verification / option / clarification", () => {
  it("Recommendation requiere soporte", () => {
    const ies = loadIes("synthetic-with-evidence-for-validator.json");
    const adapter = fakeAdapter(() => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), {
        recommendations: [
          {
            recommendation_id: "rec_1",
            statement: "acción ilustrativa",
            statement_language: "es-MX",
            supporting_fact_ids: [],
            supporting_evidence_ids: [],
            supporting_hypothesis_ids: [],
            conditions: [],
            limitations: [],
            ies_id: ies.ies_id,
            ies_version: ies.ies_version,
          },
        ],
      }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.recommendations.length, 0);
  });

  it("Next Verification no ejecuta tool", () => {
    const ies = loadIes("no-knowledge.json");
    const adapter = fakeAdapter(() => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), {
        next_verifications: [
          {
            verification_id: "ver_1",
            question_or_check: "Integrar fuente de folio",
            reason: "SOURCE_NOT_INTEGRATED",
            required_data: "folios",
            expected_source_if_known: "get_folio_status",
            related_ies_ids: [ies.ies_id],
            related_open_question_ids: ["oq_re_nok_1"],
            priority: "undeclared",
            tool_call: { name: "get_folio_status" },
          },
        ],
      }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.next_verifications.length, 0);
  });

  it("Next Verification válida se describe sin ejecutar", () => {
    const ies = loadIes("no-knowledge.json");
    const adapter = fakeAdapter(() => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), {
        next_verifications: [
          {
            verification_id: "ver_ok",
            question_or_check: "Integrar fuente de folio",
            reason: "SOURCE_NOT_INTEGRATED",
            required_data: "folios",
            expected_source_if_known: "get_folio_status",
            related_ies_ids: [ies.ies_id],
            related_open_question_ids: ["oq_re_nok_1"],
            priority: "undeclared",
          },
        ],
      }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.next_verifications.length, 1);
    assert.equal(out.reasoning_result.next_verifications[0].tool_call, undefined);
  });

  it("Decision Option execution_status NOT_EXECUTED", () => {
    const ies = loadIes("synthetic-with-evidence-for-validator.json");
    const adapter = fakeAdapter(() => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), {
        decision_options: [
          {
            decision_option_id: "opt_1",
            statement: "alternativa ilustrativa",
            conditions: [],
            expected_tradeoffs: [],
            supporting_references: ["fact_syn_1"],
            limitations: [],
          },
        ],
      }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.decision_options.length, 1);
    assert.equal(out.reasoning_result.decision_options[0].execution_status, "NOT_EXECUTED");
  });

  it("Clarification anclada al IES", () => {
    const ies = loadIes("no-knowledge.json");
    const adapter = fakeAdapter(() => ({
      candidate_reasoning_result: Object.assign(emptyCandidate(), {
        clarification_requests: [
          {
            clarification_id: "cl_1",
            question: "¿Cuál es el alcance exacto del folio ilustrativo?",
            reason: "QUERY_SCOPE_INCOMPLETE",
            related_open_question_ids: ["oq_re_nok_1"],
            related_limitation_ids: ["lim_get_folio_status_SOURCE_NOT_INTEGRATED"],
            related_unresolved_entities: [],
          },
        ],
      }),
      provider_metadata: { provider: "fake", model: "fake-v1" },
    }));
    const out = engine(adapter).reason(ies, {});
    assert.equal(out.reasoning_result.clarification_requests.length, 1);
  });
});

describe("RE — fallos de provider", () => {
  it("provider timeout fail-closed", () => {
    const out = engine(fakeAdapter("throws_timeout")).reason(loadIes("validated-no-evidence.json"), {});
    assert.equal(out.reasoning_result.hypotheses.length, 0);
    assert.equal(out.reasoning_result.recommendations.length, 0);
    assert.equal(out.reasoning_run.status, "TIMEOUT");
    assert.equal(out.reasoning_run.audit.provider_error.kind, "TIMEOUT");
  });

  it("provider error fail-closed", () => {
    const out = engine(fakeAdapter("throws_error")).reason(loadIes("validated-no-evidence.json"), {});
    assert.equal(out.reasoning_result.hypotheses.length, 0);
    assert.equal(out.reasoning_run.status, "ERROR");
  });

  it("malformed output fail-closed", () => {
    const out = engine(fakeAdapter("returns_malformed_output")).reason(loadIes("validated-no-evidence.json"), {});
    assert.equal(out.reasoning_result.hypotheses.length, 0);
    assert.equal(out.reasoning_run.status, "MALFORMED");
  });
});

describe("RE — Reasoning Run y no-mutación", () => {
  it("Reasoning Run contiene auditoría", () => {
    const ies = loadIes("validated-no-evidence.json");
    const out = engine(fakeAdapter("returns_valid_empty_result")).reason(ies, { analysis_mode: "verificacion" });
    const run = out.reasoning_run;
    assert.ok(run.run_id);
    assert.equal(run.ies_id, ies.ies_id);
    assert.equal(run.ies_version, ies.ies_version);
    assert.ok(run.started_at);
    assert.ok(run.completed_at);
    assert.ok(run.session);
    assert.equal(run.session.analysis_mode, "verificacion");
    assert.ok(run.provider_metadata);
    assert.equal(run.provider_metadata.provider, "fake");
    assert.ok(run.reasoning_result);
    assert.ok(run.validation_result);
    assert.ok(run.audit);
    assert.equal(run.audit.output_schema_version, OUTPUT_SCHEMA_VERSION);
    assert.equal(run.audit.bitwise_replay_promised, false);
  });

  it("Reasoning Run no escribe EKS/IES", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(src.includes("director-ia-eks"), false);
    assert.equal(src.includes("createIesBuilder"), false);
    assert.equal(src.includes("append_snapshot"), false);
  });

  it("input IES no se muta", () => {
    const ies = loadIes("validated-no-evidence.json");
    const before = JSON.stringify(ies);
    engine(fakeAdapter("returns_valid_empty_result")).reason(ies, {});
    assert.equal(JSON.stringify(ies), before);
  });

  it("runtime no importa provider SDK específico ni contiene tool calls", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(/require\(["']openai["']\)/.test(src), false);
    assert.equal(/require\(["']@anthropic/.test(src), false);
    assert.equal(/https\.request/.test(src), false);
    assert.equal(src.includes("createReasoningEngine"), true);
  });

  it("Tipo E permanece visible", () => {
    const ies = loadIes("synthetic-type-e.json");
    const out = engine(fakeAdapter("returns_valid_empty_result")).reason(ies, {});
    assert.ok(out.reasoning_result.reasoning_limits.type_e_conflict_ids.includes("c_re_syn_e"));
    assert.ok(out.reasoning_result.interpretation.what_is_known.references.includes("c_re_syn_e"));
  });
});

describe("RE — IES Builder físico (evidence vacío)", () => {
  it("IES real OFFICIAL in-memory sigue fail-closed", () => {
    const snap = JSON.parse(fs.readFileSync(path.join(IES_FIX, "official-full-minimal.json"), "utf8")).snapshot;
    const ies = createIesBuilder({
      clock: () => "2026-08-17T12:00:00.000Z",
      idFactory: () => "ies_from_builder",
    }).build(snap);
    assert.equal(ies.evidence.length, 0);
    const out = engine(fakeAdapter("returns_valid_empty_result")).reason(ies, {});
    assert.equal(out.reasoning_result.hypotheses.length, 0);
    assert.equal(out.reasoning_result.recommendations.length, 0);
  });
});
