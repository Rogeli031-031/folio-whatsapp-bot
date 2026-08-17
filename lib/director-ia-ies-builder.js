/**
 * IES Builder — runtime mínimo OFFICIAL in-memory (04 v1.0, ARCH-IES-PHYSICAL-DECISIONS-002).
 * Puro y determinista. Entrada única: Knowledge Snapshot.
 * No consulta OP/EB/EKS/Planner/chat/fuentes. No calibra G8. No firma digital.
 */
"use strict";

const crypto = require("crypto");

const SCHEMA_VERSION = "1.0";
const CANONICAL_JSON_V1 = "CANONICAL_JSON_V1";
const ENGINE_VERSION = "ies-builder-physical-v1";
const DIGEST_ALG = "sha256";
const DIGEST_PREFIX = "sha256:";

const COVERAGE_MAP = Object.freeze({
  CONOZCO: { coverage_token: "COV_FULL_KNOWLEDGE", status: "VALIDATED" },
  CONOZCO_PARCIALMENTE: { coverage_token: "COV_PARTIAL_KNOWLEDGE", status: "PARTIAL" },
  EXISTE_CONFLICTO: { coverage_token: "COV_DATA_CONFLICT", status: "CONFLICTED" },
  NO_CONOZCO: { coverage_token: "COV_NO_KNOWLEDGE", status: "NO_KNOWLEDGE" },
});

const SOURCE_HEALTH_MAP = Object.freeze({
  ACQUIRED_OK: "DATA_AVAILABLE",
  ACQUIRED_EMPTY: "DATA_NOT_FOUND",
  SOURCE_NOT_INTEGRATED: "SOURCE_NOT_INTEGRATED",
  SOURCE_RESTRICTED: "SOURCE_RESTRICTED",
  TOOL_ERROR: "TOOL_ERROR",
  QUERY_SCOPE_INCOMPLETE: "QUERY_SCOPE_INCOMPLETE",
  ENTITY_UNRESOLVED: "ENTITY_UNRESOLVED",
});

const CONFLICT_TYPE_MAP = Object.freeze({
  A: "CONF_TYPE_A_DATA",
  B: "CONF_TYPE_B_TEMPORAL",
  C: "CONF_TYPE_C_INTERPRETATION",
  D: "CONF_TYPE_D_COVERAGE",
  E: "CONF_TYPE_E_GOVERNANCE",
  CONF_TYPE_A_DATA: "CONF_TYPE_A_DATA",
  CONF_TYPE_B_TEMPORAL: "CONF_TYPE_B_TEMPORAL",
  CONF_TYPE_C_INTERPRETATION: "CONF_TYPE_C_INTERPRETATION",
  CONF_TYPE_D_COVERAGE: "CONF_TYPE_D_COVERAGE",
  CONF_TYPE_E_GOVERNANCE: "CONF_TYPE_E_GOVERNANCE",
});

const LIMITATION_STATUSES = Object.freeze([
  "SOURCE_NOT_INTEGRATED",
  "SOURCE_RESTRICTED",
  "TOOL_ERROR",
  "ENTITY_UNRESOLVED",
]);

const MAT_RANK = Object.freeze({
  MAT_LOW: 1,
  MAT_MEDIUM: 2,
  MAT_HIGH: 3,
  MAT_CRITICAL: 4,
});

const QUERY_REQUIRED = Object.freeze([
  "executive_query_id",
  "trace_id",
  "original_question",
  "intent",
  "requesting_user_id",
  "requesting_role",
  "channel",
  "resolved_entities",
  "permission_restrictions",
  "knowledge_effective_date",
]);

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function structuralError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

function canonicalJson(value) {
  if (value === undefined) {
    throw structuralError("CANONICAL_UNDEFINED", "undefined_forbidden");
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw structuralError("CANONICAL_NONFINITE", "nan_infinity_forbidden");
    }
    return JSON.stringify(value);
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  throw structuralError("CANONICAL_TYPE", "unsupported_type");
}

function fingerprintMaterial(ies) {
  const integrity = ies.integrity || {};
  return {
    ies_id: ies.ies_id,
    ies_type: ies.ies_type,
    schema_version: ies.schema_version,
    ies_version: ies.ies_version,
    status: ies.status,
    generated_at: ies.generated_at,
    valid_at: ies.valid_at,
    expires_at: ies.expires_at,
    snapshot_reference: ies.snapshot_reference,
    knowledge_snapshot_version: ies.knowledge_snapshot_version,
    query_context: ies.query_context,
    executive_scope: ies.executive_scope,
    knowledge_coverage: ies.knowledge_coverage,
    executive_summary_facts: ies.executive_summary_facts,
    facts: ies.facts,
    evidence: ies.evidence,
    diagnoses: ies.diagnoses,
    conflicts: ies.conflicts,
    open_questions: ies.open_questions,
    source_health: ies.source_health,
    limitations: ies.limitations,
    audit: ies.audit,
    alternative_context: ies.alternative_context,
    integrity: {
      snapshot_reference: integrity.snapshot_reference,
      signature_status: integrity.signature_status,
    },
  };
}

function contentFingerprint(ies) {
  const canonical = canonicalJson(fingerprintMaterial(ies));
  const digest = crypto.createHash(DIGEST_ALG).update(canonical, "utf8").digest("hex");
  return `${DIGEST_PREFIX}${digest}`;
}

function projectQueryContext(meta) {
  if (!isPlainObject(meta)) {
    throw structuralError("MISSING_QUERY_CONTEXT_METADATA", "query_context_metadata_required");
  }
  for (const field of QUERY_REQUIRED) {
    if (!Object.prototype.hasOwnProperty.call(meta, field) || meta[field] === undefined) {
      throw structuralError("MISSING_QUERY_CONTEXT_FIELD", field);
    }
  }
  const out = {
    executive_query_id: meta.executive_query_id,
    trace_id: meta.trace_id,
    original_question: meta.original_question,
    intent: meta.intent,
    requesting_user_id: meta.requesting_user_id,
    requesting_role: meta.requesting_role,
    channel: meta.channel,
    resolved_entities: Array.isArray(meta.resolved_entities) ? cloneJson(meta.resolved_entities) : [],
    permission_restrictions: Array.isArray(meta.permission_restrictions)
      ? cloneJson(meta.permission_restrictions)
      : [],
    knowledge_effective_date: meta.knowledge_effective_date,
  };
  if (Object.prototype.hasOwnProperty.call(meta, "query_fingerprint")) {
    out.query_fingerprint = meta.query_fingerprint;
  }
  if (Object.prototype.hasOwnProperty.call(meta, "plant_or_scope")) {
    out.plant_or_scope = meta.plant_or_scope;
  }
  if (Object.prototype.hasOwnProperty.call(meta, "period")) {
    out.period = meta.period;
  }
  return out;
}

function projectExecutiveScope(meta, bundle) {
  const scope = {};
  if (meta && Object.prototype.hasOwnProperty.call(meta, "plant_or_scope")) {
    scope.plant_or_scope = meta.plant_or_scope;
  }
  if (meta && Object.prototype.hasOwnProperty.call(meta, "period")) {
    scope.period = meta.period;
  }
  if (meta && Object.prototype.hasOwnProperty.call(meta, "intent")) {
    scope.intent = meta.intent;
  }
  if (meta && Array.isArray(meta.resolved_entities)) {
    scope.resolved_entities = cloneJson(meta.resolved_entities);
  }
  if (bundle && bundle.traceability && bundle.traceability.plan && bundle.traceability.plan.domains) {
    scope.domains = cloneJson(bundle.traceability.plan.domains);
  }
  return scope;
}

function mapConflictType(raw) {
  if (isNonEmptyString(raw) && CONFLICT_TYPE_MAP[raw]) return CONFLICT_TYPE_MAP[raw];
  return raw;
}

function isTypeE(conflict) {
  const primary = mapConflictType(conflict.primary_type);
  const secondary = Array.isArray(conflict.secondary_types)
    ? conflict.secondary_types.map(mapConflictType)
    : [];
  return primary === "CONF_TYPE_E_GOVERNANCE" || secondary.includes("CONF_TYPE_E_GOVERNANCE");
}

function projectConflicts(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((c) => {
    const item = {
      conflict_id: c.conflict_id,
      primary_type: mapConflictType(c.primary_type),
      facts_in_tension: Array.isArray(c.facts_in_tension) ? cloneJson(c.facts_in_tension) : [],
      resolution_status: c.resolution_status,
      interpretation_constraint:
        c.interpretation_constraint !== undefined ? c.interpretation_constraint : "undeclared",
    };
    if (Array.isArray(c.secondary_types)) {
      item.secondary_types = c.secondary_types.map(mapConflictType);
    }
    if (c.sources_in_tension !== undefined) item.sources_in_tension = cloneJson(c.sources_in_tension);
    if (c.severity !== undefined) item.severity = c.severity;
    else item.severity = "undeclared";
    if (c.impact !== undefined) item.impact = c.impact;
    else item.impact = "undeclared";
    if (c.confidence !== undefined) item.confidence = cloneJson(c.confidence);
    else item.confidence = null;
    if (c.weight_assessment !== undefined) item.weight_assessment = c.weight_assessment;
    if (c.applied_resolution_rule_id !== undefined) {
      item.applied_resolution_rule_id = c.applied_resolution_rule_id;
    }
    if (c.resolution_supporting_fact_ids !== undefined) {
      item.resolution_supporting_fact_ids = cloneJson(c.resolution_supporting_fact_ids);
    }
    if (c.resolution_supporting_evidence_ids !== undefined) {
      item.resolution_supporting_evidence_ids = cloneJson(c.resolution_supporting_evidence_ids);
    }
    if (isTypeE(item) || c.governance_escalation !== undefined) {
      item.governance_escalation = c.governance_escalation !== undefined ? c.governance_escalation : true;
    }
    if (c.governance_reason !== undefined) item.governance_reason = c.governance_reason;
    if (c.missing_resolution_evidence !== undefined) {
      item.missing_resolution_evidence = c.missing_resolution_evidence;
    }
    return item;
  });
}

function projectFacts(raw, snapshot) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((f) => {
    const dims =
      f.confidence_dimensions !== undefined
        ? cloneJson(f.confidence_dimensions)
        : isPlainObject(f.confidence) && ("Fs" in f.confidence || "R" in f.confidence)
          ? cloneJson(f.confidence)
          : { Fs: null, R: null, Cb: null, Cs: null, Cb_ov: null };
    const linguistic =
      typeof f.confidence === "string" || f.confidence === null ? f.confidence : null;
    const item = {
      fact_id: f.fact_id,
      statement_token: f.statement_token !== undefined ? f.statement_token : f.statement,
      concept: f.concept !== undefined ? f.concept : f.metric_or_event,
      confidence: linguistic,
      confidence_dimensions: dims,
      supporting_observation_ids: Array.isArray(f.supporting_observation_ids)
        ? cloneJson(f.supporting_observation_ids)
        : [],
      validity: f.validity !== undefined ? f.validity : "undeclared",
      priority: f.priority !== undefined ? f.priority : "undeclared",
      materiality: f.materiality !== undefined ? f.materiality : "MATERIALITY_NOT_ASSESSED",
      applied_materiality_rule_id:
        f.applied_materiality_rule_id !== undefined ? f.applied_materiality_rule_id : null,
      materiality_ruleset_version:
        f.materiality_ruleset_version !== undefined ? f.materiality_ruleset_version : null,
      traceability: f.traceability
        ? cloneJson(f.traceability)
        : {
            snapshot_id: snapshot.snapshot_id,
            bundle_id: snapshot.bundle_id || (snapshot.bundle && snapshot.bundle.bundle_id) || null,
            fact_id: f.fact_id,
            supporting_observation_ids: Array.isArray(f.supporting_observation_ids)
              ? cloneJson(f.supporting_observation_ids)
              : [],
          },
    };
    if (f.statement_reference !== undefined) item.statement_reference = f.statement_reference;
    if (f.entity !== undefined) item.entity = cloneJson(f.entity);
    if (f.period !== undefined) item.period = f.period;
    if (f.absence_state !== undefined) item.absence_state = f.absence_state;
    if (f.value !== undefined) item.value = f.value;
    if (f.unit !== undefined) item.unit = f.unit;
    return item;
  });
}

function projectEvidence(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((e) => cloneJson(e));
}

function projectDiagnoses(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((d) => cloneJson(d));
}

function projectOpenQuestions(raw, coverageState) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((q) => {
    const item = {
      open_question_id: q.open_question_id,
      question_token: q.question_token !== undefined ? q.question_token : q.question,
      reason_token: q.reason_token !== undefined ? q.reason_token : q.reason,
      required_data: q.required_data !== undefined ? q.required_data : null,
      impact_token: q.impact_token !== undefined ? q.impact_token : q.impact,
      priority: q.priority !== undefined ? q.priority : "undeclared",
      status: q.status !== undefined ? q.status : "OPEN",
      blocks_hypothesis:
        typeof q.blocks_hypothesis === "boolean" ? q.blocks_hypothesis : coverageState === "NO_CONOZCO",
    };
    if (q.question_reference !== undefined) item.question_reference = q.question_reference;
    if (q.expected_source !== undefined) item.expected_source = q.expected_source;
    if (q.related_fact_ids !== undefined) item.related_fact_ids = cloneJson(q.related_fact_ids);
    if (q.related_evidence_ids !== undefined) item.related_evidence_ids = cloneJson(q.related_evidence_ids);
    if (q.related_diagnosis_ids !== undefined) item.related_diagnosis_ids = cloneJson(q.related_diagnosis_ids);
    return item;
  });
}

function projectSourceHealth(bundle) {
  const acquisition = bundle && bundle.traceability && Array.isArray(bundle.traceability.acquisition)
    ? bundle.traceability.acquisition
    : null;
  if (acquisition && acquisition.length > 0 && isPlainObject(acquisition[0])) {
    return acquisition.map((a) => {
      const status = a.status;
      const item = {
        tool_id: a.tool_id,
        domain: a.domain,
        execution_status: SOURCE_HEALTH_MAP[status] || status,
      };
      if (a.scope_complete !== undefined) item.scope_complete = a.scope_complete;
      if (a.error !== undefined && a.error && a.error.code) item.error_code = a.error.code;
      return item;
    });
  }
  const map = bundle && isPlainObject(bundle.source_health) ? bundle.source_health : {};
  return Object.keys(map).map((key) => {
    const status = map[key];
    return {
      tool_id: key,
      domain: key,
      execution_status: SOURCE_HEALTH_MAP[status] || status,
    };
  });
}

function projectLimitations(sourceHealth) {
  const limitations = [];
  for (const item of sourceHealth) {
    const exec = item.execution_status;
    if (!LIMITATION_STATUSES.includes(exec)) continue;
    limitations.push({
      limitation_id: `lim_${item.tool_id || item.domain}_${exec}`,
      statement_token: exec,
      statement_reference: item.tool_id || item.domain,
      scope: item.domain || item.tool_id || null,
    });
  }
  return limitations;
}

function projectSummary(conflicts, limitations) {
  const summary = [];
  for (const c of conflicts) {
    if (!isTypeE(c)) continue;
    summary.push({
      statement_token: "CONF_TYPE_E_GOVERNANCE",
      statement_reference: c.conflict_id,
      supporting_fact_ids: Array.isArray(c.facts_in_tension) ? cloneJson(c.facts_in_tension) : [],
      supporting_evidence_ids: [],
    });
  }
  for (const lim of limitations) {
    summary.push({
      statement_token: lim.statement_token,
      statement_reference: lim.limitation_id,
      supporting_fact_ids: [],
      supporting_evidence_ids: [],
    });
  }
  return summary;
}

function collectMateriality(facts, evidence, diagnoses) {
  let best = null;
  let bestRank = 0;
  const scan = (list) => {
    for (const item of list || []) {
      const m = item && item.materiality;
      if (!m || m === "MATERIALITY_NOT_ASSESSED") continue;
      const rank = MAT_RANK[m];
      if (rank && rank > bestRank) {
        bestRank = rank;
        best = m;
      }
    }
  };
  scan(facts);
  scan(evidence);
  scan(diagnoses);
  return best || "MATERIALITY_NOT_ASSESSED";
}

function coverageLists(sourceHealth, queryContext, limitations) {
  const covered_domains = [];
  const partial_domains = [];
  const unavailable_domains = [];
  const restricted_domains = [];
  const failed_tools = [];
  const unresolved_entities = [];
  const incomplete_scopes = [];
  for (const item of sourceHealth) {
    const st = item.execution_status;
    const domain = item.domain;
    if (st === "DATA_AVAILABLE" && domain) covered_domains.push(domain);
    else if (st === "DATA_NOT_FOUND" && domain) partial_domains.push(domain);
    else if (st === "SOURCE_NOT_INTEGRATED" && domain) unavailable_domains.push(domain);
    else if (st === "SOURCE_RESTRICTED" && domain) restricted_domains.push(domain);
    else if (st === "TOOL_ERROR") failed_tools.push(item.tool_id || domain);
    else if (st === "ENTITY_UNRESOLVED") unresolved_entities.push(domain || item.tool_id);
    else if (st === "QUERY_SCOPE_INCOMPLETE" && domain) incomplete_scopes.push(domain);
  }
  const resolved = (queryContext && queryContext.resolved_entities) || [];
  for (const ent of resolved) {
    if (ent && (ent.resolution_state === "UNRESOLVED" || ent.resolution_state === "AMBIGUOUS")) {
      const label = ent.entity_id || ent.original_value || ent.entity_type;
      if (label && !unresolved_entities.includes(label)) unresolved_entities.push(label);
    }
  }
  return {
    covered_domains,
    partial_domains,
    unavailable_domains,
    restricted_domains,
    failed_tools,
    unresolved_entities,
    incomplete_scopes,
    blocking_limitations: limitations.map((l) => l.limitation_id),
  };
}

function rulesetVersion(bundle) {
  if (!bundle || !bundle.ruleset_versions) return "undeclared";
  if (typeof bundle.ruleset_versions === "string") return bundle.ruleset_versions;
  if (bundle.ruleset_versions.physical) return bundle.ruleset_versions.physical;
  if (bundle.ruleset_versions.evidence_builder) return String(bundle.ruleset_versions.evidence_builder);
  return "undeclared";
}

function validateIes(ies) {
  const errors = [];
  if (!isPlainObject(ies)) return { ok: false, errors: ["not_object"] };
  if (ies.schema_version !== SCHEMA_VERSION) errors.push("schema_version");
  if (ies.ies_type !== "OFFICIAL") errors.push("ies_type");
  if (ies.alternative_context !== null) errors.push("alternative_context");
  if (ies.signature !== undefined) errors.push("signature_at_root");
  if (!ies.integrity || ies.integrity.signature !== null) errors.push("signature");
  if (!ies.integrity || ies.integrity.signature_status !== "NOT_IMPLEMENTED") {
    errors.push("signature_status");
  }
  if (ies.integrity && ies.integrity.canonical_representation !== CANONICAL_JSON_V1) {
    errors.push("canonical_representation");
  }
  const mapped = COVERAGE_MAP[ies.knowledge_coverage && ies.knowledge_coverage.coverage_state];
  if (!mapped) errors.push("coverage_state");
  else {
    if (ies.knowledge_coverage.coverage_token !== mapped.coverage_token) errors.push("coverage_token");
    if (ies.status !== mapped.status) errors.push("status_mismatch");
  }
  const factIds = new Set((ies.facts || []).map((f) => f.fact_id));
  const evidenceIds = new Set((ies.evidence || []).map((e) => e.evidence_id));
  const diagnosisIds = new Set((ies.diagnoses || []).map((d) => d.diagnosis_id));
  const conflictIds = new Set((ies.conflicts || []).map((c) => c.conflict_id));
  const limitationIds = new Set((ies.limitations || []).map((l) => l.limitation_id));
  for (const e of ies.evidence || []) {
    for (const id of e.supporting_fact_ids || []) {
      if (!factIds.has(id)) errors.push(`evidence_dangling_fact:${id}`);
    }
  }
  for (const d of ies.diagnoses || []) {
    for (const id of d.supporting_fact_ids || []) {
      if (!factIds.has(id)) errors.push(`diagnosis_dangling_fact:${id}`);
    }
    for (const id of d.supporting_evidence_ids || []) {
      if (!evidenceIds.has(id)) errors.push(`diagnosis_dangling_evidence:${id}`);
    }
  }
  for (const c of ies.conflicts || []) {
    for (const id of c.facts_in_tension || []) {
      if (!factIds.has(id)) errors.push(`conflict_dangling_fact:${id}`);
    }
    if (isTypeE(c)) {
      const visible = (ies.executive_summary_facts || []).some(
        (s) => s.statement_token === "CONF_TYPE_E_GOVERNANCE" && s.statement_reference === c.conflict_id
      );
      if (!visible) errors.push(`type_e_not_in_summary:${c.conflict_id}`);
    }
  }
  for (const s of ies.executive_summary_facts || []) {
    const ref = s.statement_reference;
    const ok =
      factIds.has(ref) ||
      evidenceIds.has(ref) ||
      diagnosisIds.has(ref) ||
      conflictIds.has(ref) ||
      limitationIds.has(ref);
    if (ref && !ok) errors.push(`summary_dangling:${ref}`);
  }
  const rootSnap = ies.snapshot_reference && ies.snapshot_reference.snapshot_id;
  const intSnap =
    ies.integrity && ies.integrity.snapshot_reference && ies.integrity.snapshot_reference.snapshot_id;
  if (rootSnap !== intSnap) errors.push("snapshot_reference_mismatch");
  if (ies.integrity && ies.integrity.content_fingerprint) {
    const recomputed = contentFingerprint(ies);
    if (recomputed !== ies.integrity.content_fingerprint) errors.push("fingerprint_mismatch");
  }
  return { ok: errors.length === 0, errors };
}

function buildIes(snapshot, options) {
  if (!isPlainObject(snapshot)) {
    throw structuralError("INVALID_SNAPSHOT", "snapshot_not_object");
  }
  if (!isNonEmptyString(snapshot.snapshot_id)) {
    throw structuralError("INVALID_SNAPSHOT", "snapshot_id_required");
  }
  if (snapshot.version === undefined || snapshot.version === null) {
    throw structuralError("INVALID_SNAPSHOT", "version_required");
  }
  if (!isPlainObject(snapshot.bundle)) {
    throw structuralError("INVALID_SNAPSHOT", "bundle_required");
  }
  if (!Object.prototype.hasOwnProperty.call(snapshot, "query_context_metadata")) {
    throw structuralError("MISSING_QUERY_CONTEXT_METADATA", "query_context_metadata_required");
  }

  const copy = cloneJson(snapshot);
  const bundle = copy.bundle;
  const meta = copy.query_context_metadata;
  const query_context = projectQueryContext(meta);
  const coverageState = bundle.knowledge_coverage;
  const mapped = COVERAGE_MAP[coverageState];
  if (!mapped) {
    throw structuralError("INVALID_COVERAGE", "unknown_coverage_state");
  }

  const facts = projectFacts(bundle.facts, copy);
  const evidence = projectEvidence(bundle.evidence);
  const diagnoses = projectDiagnoses(bundle.diagnoses);
  const conflicts = projectConflicts(bundle.conflicts);
  const source_health = projectSourceHealth(bundle);
  const limitations = projectLimitations(source_health);
  const open_questions = projectOpenQuestions(bundle.open_questions, coverageState);
  const executive_summary_facts = projectSummary(conflicts, limitations);
  const lists = coverageLists(source_health, query_context, limitations);
  const generated_at = options.clock();
  const valid_at = query_context.knowledge_effective_date || generated_at;
  const snapshot_reference = { snapshot_id: copy.snapshot_id };
  const iesId = options.idFactory("ies");

  const ies = {
    ies_id: iesId,
    ies_type: "OFFICIAL",
    schema_version: SCHEMA_VERSION,
    ies_version: 1,
    status: mapped.status,
    generated_at,
    valid_at,
    expires_at: null,
    snapshot_reference,
    knowledge_snapshot_version: copy.version,
    query_context,
    executive_scope: projectExecutiveScope(meta, bundle),
    knowledge_coverage: {
      coverage_token: mapped.coverage_token,
      coverage_state: coverageState,
      coverage_score: null,
      covered_domains: lists.covered_domains,
      partial_domains: lists.partial_domains,
      unavailable_domains: lists.unavailable_domains,
      restricted_domains: lists.restricted_domains,
      failed_tools: lists.failed_tools,
      unresolved_entities: lists.unresolved_entities,
      incomplete_scopes: lists.incomplete_scopes,
      blocking_limitations: lists.blocking_limitations,
      highest_materiality_detected: collectMateriality(facts, evidence, diagnoses),
    },
    executive_summary_facts,
    facts,
    evidence,
    diagnoses,
    conflicts,
    open_questions,
    source_health,
    limitations,
    audit: {
      generated_by: "ies_builder",
      engine_version: ENGINE_VERSION,
      ruleset_version: rulesetVersion(bundle),
      source_snapshot_ids: [copy.snapshot_id],
      previous_ies_id: null,
      supersedes_ies_id: null,
    },
    integrity: {
      canonical_representation: CANONICAL_JSON_V1,
      snapshot_reference: cloneJson(snapshot_reference),
      signature: null,
      signature_status: "NOT_IMPLEMENTED",
    },
    alternative_context: null,
  };

  ies.integrity.content_fingerprint = contentFingerprint(ies);
  return ies;
}

function createIesBuilder(options) {
  const opts = options || {};
  if (typeof opts.clock !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "clock_required");
  }
  if (typeof opts.idFactory !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "idFactory_required");
  }
  return {
    build(snapshot) {
      return buildIes(snapshot, opts);
    },
    validate(ies) {
      return validateIes(ies);
    },
  };
}

module.exports = {
  createIesBuilder,
  canonicalJson,
  contentFingerprint,
  CANONICAL_JSON_V1,
  ENGINE_VERSION,
  DIGEST_ALG,
  SOURCE_HEALTH_MAP,
  COVERAGE_MAP,
};
