/**
 * Reasoning Engine — runtime mínimo N5 (05 v1.0, ARCH-REASONING-PHYSICAL-DECISIONS-002 D1–D16).
 * Provider-neutral, fail-closed, in-memory. No tools, DB, networking ni persistencia.
 */
"use strict";

const OUTPUT_SCHEMA_VERSION = "STRUCTURED_REASONING_RESULT_V1";
const ENGINE_VERSION = "reasoning-engine-physical-v1";
const DEFAULT_LANGUAGE = "es-MX";
const DEFAULT_POLICY_VERSION = "05-v1.0-physical-d1-d16";

const CONSUMABLE = Object.freeze(["VALIDATED", "PARTIAL", "CONFLICTED", "NO_KNOWLEDGE"]);
const REJECT_STATUS = Object.freeze(["BUILDING", "EXPIRED", "SUPERSEDED", "INVALID"]);
const STRENGTH = Object.freeze(["HYP_STRENGTH_WEAK", "HYP_STRENGTH_MODERATE", "HYP_STRENGTH_STRONG"]);
const SESSION_FIELDS = Object.freeze([
  "analysis_mode",
  "canonical_reasoning_language",
  "channel_hint",
  "maximum_semantic_depth",
]);

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function structuralError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function indexIes(ies) {
  const facts = new Set(asArray(ies.facts).map((x) => x && x.fact_id).filter(Boolean));
  const evidence = new Set(asArray(ies.evidence).map((x) => x && x.evidence_id).filter(Boolean));
  const diagnoses = new Set(asArray(ies.diagnoses).map((x) => x && x.diagnosis_id).filter(Boolean));
  const conflicts = new Set(asArray(ies.conflicts).map((x) => x && x.conflict_id).filter(Boolean));
  const openQuestions = new Set(
    asArray(ies.open_questions).map((x) => x && x.open_question_id).filter(Boolean)
  );
  const limitations = new Set(
    asArray(ies.limitations).map((x) => x && x.limitation_id).filter(Boolean)
  );
  const all = new Set(
    [ies.ies_id, ...facts, ...evidence, ...diagnoses, ...conflicts, ...openQuestions, ...limitations].filter(
      Boolean
    )
  );
  return { facts, evidence, diagnoses, conflicts, openQuestions, limitations, all };
}

function typeEConflicts(ies) {
  return asArray(ies.conflicts).filter((c) => {
    if (!c) return false;
    if (c.primary_type === "CONF_TYPE_E_GOVERNANCE") return true;
    return asArray(c.secondary_types).includes("CONF_TYPE_E_GOVERNANCE");
  });
}

function openConflicts(ies) {
  return asArray(ies.conflicts).filter(
    (c) => c && (c.resolution_status === "OPEN" || c.resolution_status === "UNDER_REVIEW")
  );
}

function blockingLimitationIds(ies) {
  const fromCoverage = asArray(ies.knowledge_coverage && ies.knowledge_coverage.blocking_limitations);
  return new Set(fromCoverage.filter(Boolean));
}

function normalizeSession(session) {
  const src = isPlainObject(session) ? session : {};
  return {
    analysis_mode: src.analysis_mode === undefined ? null : src.analysis_mode,
    canonical_reasoning_language: src.canonical_reasoning_language || DEFAULT_LANGUAGE,
    channel_hint: src.channel_hint === undefined ? null : src.channel_hint,
    maximum_semantic_depth: src.maximum_semantic_depth === undefined ? null : src.maximum_semantic_depth,
  };
}

function emptyArrays() {
  return {
    hypotheses: [],
    recommendations: [],
    next_verifications: [],
    decision_options: [],
    abstentions: [],
    clarification_requests: [],
  };
}

function idsExist(list, set) {
  for (const id of asArray(list)) {
    if (!set.has(id)) return false;
  }
  return true;
}

function conflictTensionsClaim(hyp, ies) {
  const factSet = new Set(asArray(hyp.supporting_fact_ids));
  const cited = new Set(asArray(hyp.conflict_ids));
  for (const c of openConflicts(ies)) {
    if (cited.has(c.conflict_id)) return true;
    if (asArray(c.facts_in_tension).some((id) => factSet.has(id))) return true;
  }
  return false;
}

function limitationBlocksClaim(hyp, ies) {
  const blocking = blockingLimitationIds(ies);
  for (const item of asArray(hyp.limitations)) {
    const id = typeof item === "string" ? item : item && item.limitation_id;
    if (id && blocking.has(id)) return true;
  }
  return false;
}

function incompleteScopeRelevant(hyp, ies) {
  const incomplete = asArray(ies.knowledge_coverage && ies.knowledge_coverage.incomplete_scopes);
  if (incomplete.length === 0) return false;
  const scope = hyp.validity_scope;
  if (typeof scope === "string") return incomplete.includes(scope);
  if (isPlainObject(scope) && scope.domain) return incomplete.includes(scope.domain);
  return isPlainObject(scope) && scope.requires_incomplete_scope === true;
}

function unresolvedEntityRequired(hyp, ies) {
  const unresolved = asArray(ies.knowledge_coverage && ies.knowledge_coverage.unresolved_entities);
  if (unresolved.length === 0) return false;
  const scope = hyp.validity_scope;
  const needle = isPlainObject(scope) && (scope.entity_id || scope.entity || scope.plant_or_scope);
  if (!needle) return false;
  return unresolved.includes(needle);
}

function blockingOpenQuestion(hyp, ies) {
  const cited = asArray(hyp.open_question_ids);
  for (const q of asArray(ies.open_questions)) {
    if (q && q.blocks_hypothesis === true && cited.includes(q.open_question_id)) return true;
  }
  return false;
}

function validityExceeds(hyp, ies) {
  const scope = hyp.validity_scope;
  if (scope === undefined || scope === null) return true;
  const exec = ies.executive_scope || {};
  if (typeof scope === "string") return false;
  if (!isPlainObject(scope)) return true;
  if (scope.plant_or_scope && exec.plant_or_scope && scope.plant_or_scope !== exec.plant_or_scope) {
    return true;
  }
  if (scope.period && exec.period && scope.period !== exec.period) return true;
  return false;
}

function hasMaterialityInvention(obj) {
  return isPlainObject(obj) && Object.prototype.hasOwnProperty.call(obj, "materiality");
}

function buildInterpretation(ies, acceptedHyps, abstentions) {
  const known = [];
  for (const f of asArray(ies.facts)) if (f && f.fact_id) known.push(f.fact_id);
  for (const e of asArray(ies.evidence)) if (e && e.evidence_id) known.push(e.evidence_id);
  for (const d of asArray(ies.diagnoses)) if (d && d.diagnosis_id) known.push(d.diagnosis_id);
  for (const c of asArray(ies.conflicts)) if (c && c.conflict_id) known.push(c.conflict_id);
  const inferred = acceptedHyps.map((h) => h.hypothesis_id).filter(Boolean);
  const notConcluded = [];
  for (const l of asArray(ies.limitations)) if (l && l.limitation_id) notConcluded.push(l.limitation_id);
  for (const q of asArray(ies.open_questions)) {
    if (q && q.open_question_id) notConcluded.push(q.open_question_id);
  }
  for (const a of abstentions) if (a && a.abstention_id) notConcluded.push(a.abstention_id);
  return {
    what_is_known: { references: known },
    what_can_be_inferred: { references: inferred },
    what_cannot_be_concluded: { references: notConcluded },
  };
}

function collectReferences(result, ies) {
  const refs = new Set();
  const addAll = (arr) => {
    for (const id of asArray(arr)) if (id) refs.add(id);
  };
  addAll(result.interpretation.what_is_known.references);
  addAll(result.interpretation.what_can_be_inferred.references);
  addAll(result.interpretation.what_cannot_be_concluded.references);
  for (const h of result.hypotheses) {
    addAll(h.supporting_fact_ids);
    addAll(h.supporting_evidence_ids);
    addAll(h.supporting_diagnosis_ids);
    addAll(h.conflict_ids);
    addAll(h.open_question_ids);
  }
  for (const r of result.recommendations) {
    addAll(r.supporting_fact_ids);
    addAll(r.supporting_evidence_ids);
  }
  for (const v of result.next_verifications) {
    addAll(v.related_open_question_ids);
    addAll(v.related_ies_ids);
  }
  for (const c of result.clarification_requests) {
    addAll(c.related_open_question_ids);
    addAll(c.related_limitation_ids);
  }
  for (const te of typeEConflicts(ies)) if (te.conflict_id) refs.add(te.conflict_id);
  if (ies.ies_id) refs.add(ies.ies_id);
  return Array.from(refs);
}

function makeAbstention(idFactory, ies, kind, anchorType, anchorRef, message) {
  return {
    abstention_id: idFactory("abs"),
    ies_id: ies.ies_id,
    scope: (ies.executive_scope && (ies.executive_scope.intent || ies.executive_scope.plant_or_scope)) || null,
    primary_anchor_type: anchorType,
    primary_anchor_ref: anchorRef,
    secondary_anchors: [],
    abstention_kind: kind,
    message_semantic: message,
  };
}

function reasoningLimits(ies) {
  return {
    coverage_token: ies.knowledge_coverage && ies.knowledge_coverage.coverage_token,
    status: ies.status,
    limitations: asArray(ies.limitations).map((l) => l.limitation_id).filter(Boolean),
    type_e_conflict_ids: typeEConflicts(ies).map((c) => c.conflict_id).filter(Boolean),
  };
}

function emptyResult(ies, abstentions) {
  const arrays = emptyArrays();
  arrays.abstentions = abstentions || [];
  const interpretation = buildInterpretation(ies, [], arrays.abstentions);
  const result = {
    interpretation,
    ...arrays,
    reasoning_limits: reasoningLimits(ies),
    references: [],
  };
  const idx = indexIes(ies);
  result.references = collectReferences(result, ies).filter((id) => idx.all.has(id));
  return result;
}

function applyStrengthBounds(hyp, ies) {
  const out = hyp;
  const adverse = conflictTensionsClaim(out, ies);
  const blocked = limitationBlocksClaim(out, ies);
  const incomplete = incompleteScopeRelevant(out, ies);
  if (adverse || blocked || incomplete) {
    if (out.hypothesis_strength === "HYP_STRENGTH_STRONG") {
      out.hypothesis_strength = "HYP_STRENGTH_WEAK";
    } else if (adverse && out.hypothesis_strength === "HYP_STRENGTH_MODERATE") {
      out.hypothesis_strength = "HYP_STRENGTH_WEAK";
    }
  }
  return out;
}

function validateHypothesis(hyp, ies, session, idx) {
  const errors = [];
  if (!isPlainObject(hyp)) return { ok: false, errors: ["hypothesis_not_object"] };
  if (ies.status === "NO_KNOWLEDGE") errors.push("no_knowledge_hypothesis");
  if (asArray(ies.evidence).length === 0) errors.push("empty_evidence_bank");
  if (!Array.isArray(hyp.supporting_fact_ids) || hyp.supporting_fact_ids.length === 0) {
    errors.push("missing_supporting_fact_ids");
  }
  if (!Array.isArray(hyp.supporting_evidence_ids) || hyp.supporting_evidence_ids.length === 0) {
    errors.push("missing_supporting_evidence_ids");
  }
  if (hyp.ies_id !== ies.ies_id) errors.push("ies_id_mismatch");
  if (hyp.ies_version !== ies.ies_version) errors.push("ies_version_mismatch");
  if (!idsExist(hyp.supporting_fact_ids, idx.facts)) errors.push("fact_ref");
  if (!idsExist(hyp.supporting_evidence_ids, idx.evidence)) errors.push("evidence_ref");
  if (!idsExist(hyp.supporting_diagnosis_ids, idx.diagnoses)) errors.push("diagnosis_ref");
  if (!idsExist(hyp.conflict_ids, idx.conflicts)) errors.push("conflict_ref");
  if (!idsExist(hyp.open_question_ids, idx.openQuestions)) errors.push("oq_ref");
  if (!STRENGTH.includes(hyp.hypothesis_strength)) errors.push("strength_enum");
  if (hyp.statement_language !== session.canonical_reasoning_language) errors.push("statement_language");
  if (validityExceeds(hyp, ies)) errors.push("validity_scope");
  if (hasMaterialityInvention(hyp)) errors.push("materiality_invented");
  if (blockingOpenQuestion(hyp, ies)) errors.push("blocks_hypothesis");
  if (unresolvedEntityRequired(hyp, ies)) errors.push("unresolved_entity");
  if (typeof hyp.statement !== "string" || !hyp.statement.trim()) errors.push("statement");
  if (hyp.limitations === undefined) errors.push("limitations");
  if (hyp.validity_scope === undefined) errors.push("validity_scope_missing");
  if (errors.length) return { ok: false, errors };
  const out = cloneJson(hyp);
  out.is_primary_candidate = false;
  applyStrengthBounds(out, ies);
  return { ok: true, errors: [], hyp: out };
}

function validateRecommendation(rec, ies, session, idx, acceptedHypIds) {
  const errors = [];
  if (!isPlainObject(rec)) return { ok: false, errors: ["rec_not_object"] };
  if (ies.status === "NO_KNOWLEDGE") errors.push("no_knowledge_recommendation");
  if (asArray(ies.evidence).length === 0) errors.push("empty_evidence_bank");
  if (!Array.isArray(rec.supporting_evidence_ids) || rec.supporting_evidence_ids.length === 0) {
    errors.push("missing_evidence");
  }
  if (rec.ies_id !== ies.ies_id) errors.push("ies_id_mismatch");
  if (rec.ies_version !== ies.ies_version) errors.push("ies_version_mismatch");
  if (!idsExist(rec.supporting_fact_ids, idx.facts)) errors.push("fact_ref");
  if (!idsExist(rec.supporting_evidence_ids, idx.evidence)) errors.push("evidence_ref");
  for (const id of asArray(rec.supporting_hypothesis_ids)) {
    if (!acceptedHypIds.has(id)) errors.push("hypothesis_ref");
  }
  if (rec.statement_language !== session.canonical_reasoning_language) errors.push("statement_language");
  if (typeof rec.statement !== "string" || !rec.statement.trim()) errors.push("statement");
  if (rec.conditions === undefined) errors.push("conditions");
  if (rec.limitations === undefined) errors.push("limitations");
  if (hasMaterialityInvention(rec)) errors.push("materiality_invented");
  if (errors.length) return { ok: false, errors };
  return { ok: true, rec: cloneJson(rec) };
}

function validateNextVerification(item, ies, idx) {
  if (!isPlainObject(item)) return { ok: false };
  const allowed = new Set([
    "verification_id",
    "question_or_check",
    "reason",
    "required_data",
    "expected_source_if_known",
    "related_ies_ids",
    "related_open_question_ids",
    "priority",
  ]);
  for (const key of Object.keys(item)) {
    if (!allowed.has(key)) return { ok: false };
  }
  if (typeof item.question_or_check !== "string" || !item.question_or_check.trim()) return { ok: false };
  if (item.reason === undefined || item.required_data === undefined) return { ok: false };
  if (item.expected_source_if_known === undefined || item.priority === undefined) return { ok: false };
  if (!idsExist(item.related_open_question_ids, idx.openQuestions)) return { ok: false };
  if (asArray(item.related_ies_ids).some((id) => id !== ies.ies_id)) return { ok: false };
  return { ok: true, item: cloneJson(item) };
}

function validateDecisionOption(item) {
  if (!isPlainObject(item)) return { ok: false };
  if (typeof item.statement !== "string" || !item.statement.trim()) return { ok: false };
  if (item.conditions === undefined || item.expected_tradeoffs === undefined) return { ok: false };
  if (item.supporting_references === undefined || item.limitations === undefined) return { ok: false };
  if (item.execution_status && item.execution_status !== "NOT_EXECUTED") return { ok: false };
  const out = cloneJson(item);
  out.execution_status = "NOT_EXECUTED";
  return { ok: true, item: out };
}

function validateClarification(item, ies, idx) {
  if (!isPlainObject(item)) return { ok: false };
  if (typeof item.question !== "string" || !item.question.trim()) return { ok: false };
  if (item.reason === undefined) return { ok: false };
  if (!idsExist(item.related_open_question_ids, idx.openQuestions)) return { ok: false };
  if (!idsExist(item.related_limitation_ids, idx.limitations)) return { ok: false };
  const unresolved = new Set(
    asArray(ies.knowledge_coverage && ies.knowledge_coverage.unresolved_entities)
  );
  for (const ent of asArray(ies.query_context && ies.query_context.resolved_entities)) {
    if (ent && (ent.resolution_state === "UNRESOLVED" || ent.resolution_state === "AMBIGUOUS")) {
      unresolved.add(ent.entity_id || ent.original_value);
    }
  }
  for (const ent of asArray(item.related_unresolved_entities)) {
    if (ent && unresolved.size > 0 && !unresolved.has(ent)) return { ok: false };
  }
  return { ok: true, item: cloneJson(item) };
}

function acceptCandidate(candidate, ies, session, idx, idFactory) {
  const errors = [];
  const arrays = emptyArrays();
  const src = isPlainObject(candidate) ? candidate : {};
  const acceptedHypIds = new Set();

  for (const hyp of asArray(src.hypotheses)) {
    const v = validateHypothesis(hyp, ies, session, idx);
    if (!v.ok) {
      errors.push(...v.errors);
      continue;
    }
    arrays.hypotheses.push(v.hyp);
    acceptedHypIds.add(v.hyp.hypothesis_id);
  }
  for (const rec of asArray(src.recommendations)) {
    const v = validateRecommendation(rec, ies, session, idx, acceptedHypIds);
    if (!v.ok) errors.push(...v.errors);
    else arrays.recommendations.push(v.rec);
  }
  for (const nv of asArray(src.next_verifications)) {
    const v = validateNextVerification(nv, ies, idx);
    if (v.ok) arrays.next_verifications.push(v.item);
    else errors.push("next_verification_invalid");
  }
  for (const opt of asArray(src.decision_options)) {
    const v = validateDecisionOption(opt);
    if (v.ok) arrays.decision_options.push(v.item);
    else errors.push("decision_option_invalid");
  }
  for (const cl of asArray(src.clarification_requests)) {
    const v = validateClarification(cl, ies, idx);
    if (v.ok) arrays.clarification_requests.push(v.item);
    else errors.push("clarification_invalid");
  }

  if (ies.status === "NO_KNOWLEDGE" || asArray(ies.evidence).length === 0) {
    if (arrays.hypotheses.length) {
      errors.push("fail_closed_stripped_hypotheses");
      arrays.hypotheses = [];
    }
    if (arrays.recommendations.length) {
      errors.push("fail_closed_stripped_recommendations");
      arrays.recommendations = [];
    }
  }

  const abstentions = [];
  if (ies.status === "NO_KNOWLEDGE") {
    abstentions.push(
      makeAbstention(
        idFactory,
        ies,
        "NO_KNOWLEDGE",
        "coverage_token",
        (ies.knowledge_coverage && ies.knowledge_coverage.coverage_token) || "COV_NO_KNOWLEDGE",
        "NO_KNOWLEDGE: sin hipótesis sustantiva"
      )
    );
  } else if (asArray(ies.evidence).length === 0) {
    abstentions.push(
      makeAbstention(
        idFactory,
        ies,
        "INSUFFICIENT_EVIDENCE",
        "coverage_token",
        (ies.knowledge_coverage && ies.knowledge_coverage.coverage_token) || null,
        "evidence[] vacío: cero hipótesis y cero recommendations sustantivas"
      )
    );
  } else if (asArray(src.hypotheses).length > 0 && arrays.hypotheses.length === 0) {
    abstentions.push(
      makeAbstention(
        idFactory,
        ies,
        "INSUFFICIENT_EVIDENCE",
        "coverage_token",
        (ies.knowledge_coverage && ies.knowledge_coverage.coverage_token) || null,
        "candidato inválido: REJECT_OR_ABSTAIN sin inventar soporte"
      )
    );
  }
  arrays.abstentions = abstentions;

  const interpretation = buildInterpretation(ies, arrays.hypotheses, arrays.abstentions);
  const result = {
    interpretation,
    ...arrays,
    reasoning_limits: reasoningLimits(ies),
    references: [],
  };
  result.references = collectReferences(result, ies).filter((id) => idx.all.has(id));

  let outcome = "ACCEPTED";
  if (asArray(src.hypotheses).length > 0 && arrays.hypotheses.length === 0) outcome = "REJECT";
  else if (ies.status === "NO_KNOWLEDGE" || asArray(ies.evidence).length === 0) outcome = "ABSTAIN";

  return { result, errors, outcome };
}

function providerFailResult(ies, idFactory, message) {
  return emptyResult(
    ies,
    [
      makeAbstention(
        idFactory,
        ies,
        "INSUFFICIENT_EVIDENCE",
        "coverage_token",
        (ies.knowledge_coverage && ies.knowledge_coverage.coverage_token) || null,
        message
      ),
    ]
  );
}

function createReasoningEngine(options) {
  const opts = options || {};
  if (!opts.modelAdapter || typeof opts.modelAdapter.infer !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "modelAdapter.infer_required");
  }
  if (typeof opts.clock !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "clock_required");
  }
  if (typeof opts.idFactory !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "idFactory_required");
  }
  const policy = isPlainObject(opts.policy) ? opts.policy : {};
  const outputSchema = policy.output_schema_version || OUTPUT_SCHEMA_VERSION;
  const policyVersion = policy.reasoning_policy_version || DEFAULT_POLICY_VERSION;

  function reason(iesInput, sessionInput) {
    if (!isPlainObject(iesInput)) {
      throw structuralError("INVALID_IES", "ies_not_object");
    }
    const ies = cloneJson(iesInput);
    const session = normalizeSession(sessionInput);
    const started_at = opts.clock();
    const run_id = opts.idFactory("run");
    const idx = indexIes(ies);

    function finish(result, patch) {
      const run = {
        run_id,
        ies_id: ies.ies_id,
        ies_version: ies.ies_version,
        started_at,
        completed_at: opts.clock(),
        status: patch.status,
        session: cloneJson(session),
        provider_metadata: patch.provider_metadata !== undefined ? patch.provider_metadata : null,
        reasoning_result: result,
        validation_result: patch.validation_result,
        audit: {
          engine_version: ENGINE_VERSION,
          reasoning_policy_version: policyVersion,
          output_schema_version: outputSchema,
          model_called: Boolean(patch.model_called),
          bitwise_replay_promised: false,
          provider_error: patch.provider_error || null,
        },
      };
      return { reasoning_result: result, reasoning_run: run };
    }

    if (!ies.ies_id || ies.ies_version === undefined) {
      return finish(emptyResult(ies, []), {
        status: "REJECT",
        model_called: false,
        validation_result: { outcome: "REJECT", accepted: false, errors: ["ies_identity"] },
      });
    }

    if (REJECT_STATUS.includes(ies.status) || !CONSUMABLE.includes(ies.status)) {
      return finish(emptyResult(ies, []), {
        status: "REJECT",
        model_called: false,
        validation_result: { outcome: "REJECT", accepted: false, errors: ["ies_not_consumable"] },
      });
    }

    const request = {
      reasoning_context: { ies: cloneJson(ies) },
      session: cloneJson(session),
      output_schema_version: outputSchema,
    };

    let inferred;
    try {
      inferred = opts.modelAdapter.infer(request);
    } catch (err) {
      const kind = err && err.code === "TIMEOUT" ? "TIMEOUT" : "ERROR";
      return finish(providerFailResult(ies, opts.idFactory, kind === "TIMEOUT" ? "provider_timeout" : "provider_error"), {
        status: kind,
        model_called: true,
        provider_error: { kind, message: kind === "TIMEOUT" ? "timeout" : "error" },
        validation_result: { outcome: kind, accepted: false, errors: [kind.toLowerCase()] },
      });
    }

    if (!isPlainObject(inferred) || !isPlainObject(inferred.candidate_reasoning_result)) {
      return finish(providerFailResult(ies, opts.idFactory, "malformed_output"), {
        status: "MALFORMED",
        model_called: true,
        provider_metadata: inferred && inferred.provider_metadata ? cloneJson(inferred.provider_metadata) : null,
        provider_error: { kind: "MALFORMED", message: "malformed_output" },
        validation_result: { outcome: "MALFORMED", accepted: false, errors: ["malformed"] },
      });
    }

    const meta = isPlainObject(inferred.provider_metadata) ? cloneJson(inferred.provider_metadata) : {};
    const accepted = acceptCandidate(inferred.candidate_reasoning_result, ies, session, idx, opts.idFactory);
    return finish(accepted.result, {
      status: accepted.outcome,
      model_called: true,
      provider_metadata: {
        provider: meta.provider !== undefined ? meta.provider : null,
        model: meta.model !== undefined ? meta.model : null,
        model_version: meta.model_version !== undefined ? meta.model_version : null,
        request_id: meta.request_id !== undefined ? meta.request_id : null,
      },
      validation_result: {
        outcome: accepted.outcome,
        accepted: accepted.outcome === "ACCEPTED",
        errors: accepted.errors,
      },
    });
  }

  return { reason };
}

module.exports = {
  createReasoningEngine,
  OUTPUT_SCHEMA_VERSION,
  ENGINE_VERSION,
  DEFAULT_LANGUAGE,
  CONSUMABLE,
  REJECT_STATUS,
  STRENGTH,
  SESSION_FIELDS,
};
