/**
 * Evidence Builder — runtime mínimo (02 v2.1, D1–D15).
 * Puro y determinista. Sin LLM, DB, red, tools, reloj ambiental ni EKS.
 * No persiste Snapshots. No calibra G8.
 */
"use strict";

const RULESET_VERSION = "evidence-builder-2.1-physical-v1";

const RULE_REGISTRY = Object.freeze({
  evidence_rules: Object.freeze([]),
  absence_rules: Object.freeze([]),
  resolution_rules: Object.freeze([]),
  causal_rules: Object.freeze([]),
  materiality_rules: Object.freeze([]),
  ruleset_version: RULESET_VERSION,
});

const TRANSPORTABLE_STATUS = Object.freeze(["ACQUIRED_OK", "ACQUIRED_EMPTY"]);
const COVERAGE = Object.freeze([
  "CONOZCO",
  "CONOZCO_PARCIALMENTE",
  "EXISTE_CONFLICTO",
  "NO_CONOZCO",
]);
const RESOLUTION = Object.freeze(["OPEN", "UNDER_REVIEW", "RESOLVED", "SUPERSEDED"]);

const UNCALIBRATED_CONFIDENCE = Object.freeze({
  Fs: null,
  R: null,
  Cb: null,
  Cs: null,
  Cb_ov: null,
});

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function defaultIdFactory(traceId) {
  const counts = Object.create(null);
  return (prefix) => {
    counts[prefix] = (counts[prefix] || 0) + 1;
    return `${prefix}_${traceId}_${counts[prefix]}`;
  };
}

function statusOf(statuses, record) {
  const toolId = record && record.source && record.source.tool_id;
  const domain = (record && record.source && record.source.domain) || (record && record.domain);
  return (statuses || []).find((s) => {
    if (toolId && s.tool_id === toolId) return true;
    if (domain && s.domain === domain) return true;
    return false;
  });
}

function isTransportable(status) {
  if (!status) return true;
  return TRANSPORTABLE_STATUS.includes(status.status);
}

function resolutionState(record) {
  if (record.entity_resolution && record.entity_resolution.state) {
    return record.entity_resolution.state;
  }
  return null;
}

function n1Entity(record) {
  const state = resolutionState(record);
  const subject = record.subject || {};
  if (state === "RESOLVED") {
    return {
      entity_type: subject.entity_type || null,
      entity_id: subject.entity_id || null,
      entity_label: subject.entity_label || null,
      resolution: "RESOLVED",
    };
  }
  if (state === "AMBIGUOUS" || state === "UNRESOLVED") {
    return {
      original_value:
        (record.entity_resolution && record.entity_resolution.original_value) ||
        subject.entity_label ||
        null,
      resolution: state,
      candidates: (record.entity_resolution && record.entity_resolution.candidates) || [],
    };
  }
  if (subject.entity_id || subject.entity_type || subject.entity_label) {
    return {
      entity_type: subject.entity_type || null,
      entity_id: subject.entity_id || null,
      entity_label: subject.entity_label || null,
    };
  }
  return null;
}

function wrapN1(record, input, matchingStatus) {
  const sourceIn = record.source || {};
  const contentAuthor =
    Object.prototype.hasOwnProperty.call(sourceIn, "content_author_id")
      ? sourceIn.content_author_id
      : null;

  const source = {
    tool_id: sourceIn.tool_id,
    domain: sourceIn.domain || record.domain,
    system: sourceIn.system,
    source_family: sourceIn.source_family,
    source_instance_id: sourceIn.source_instance_id,
    content_author_id: contentAuthor,
  };
  if (sourceIn.author_role !== undefined) source.author_role = sourceIn.author_role;
  if (sourceIn.author_id !== undefined) source.author_id = sourceIn.author_id;
  if (sourceIn.origin_event_id !== undefined) source.origin_event_id = sourceIn.origin_event_id;
  if (sourceIn.derived_from !== undefined) source.derived_from = sourceIn.derived_from;
  if (sourceIn.channel !== undefined) source.channel = sourceIn.channel;

  const rawRef = record.raw_payload_reference;
  const absenceState =
    matchingStatus && matchingStatus.status === "ACQUIRED_EMPTY" ? "DATA_NOT_FOUND" : undefined;

  const observation = {
    observation_id: record.observation_id,
    domain: source.domain,
    source,
    extracted_by: record.extracted_by,
    triggered_by: record.triggered_by,
    metric_or_event: Object.prototype.hasOwnProperty.call(record, "metric_or_event")
      ? record.metric_or_event
      : null,
    value: Object.prototype.hasOwnProperty.call(record, "value") ? record.value : null,
    timestamp: record.timestamp || record.extracted_at,
    scope: {
      complete: record.scope_complete,
    },
    quality: record.validation_state || "UNDECLARED",
    raw_result_ref: rawRef,
    raw_payload_reference: rawRef,
    lineage: {
      tool_id: source.tool_id,
      system: source.system,
      content_author_id: contentAuthor,
      extracted_by: record.extracted_by,
      triggered_by: record.triggered_by,
      source_family: source.source_family,
      source_instance_id: source.source_instance_id,
      trace_id: record.trace_id || input.trace_id,
      observation_id: record.observation_id,
      raw_payload_reference: rawRef,
    },
    traceability: {
      trace_id: record.trace_id || input.trace_id,
      plan: input.plan,
      tool_plan: input.tool_plan,
    },
  };

  if (record.unit !== undefined) observation.unit = record.unit;
  if (record.period !== undefined) observation.period = record.period;
  else if (record.effective_period !== undefined) observation.period = record.effective_period;

  const entity = n1Entity(record);
  if (entity) observation.entity = entity;
  if (absenceState) observation.absence_state = absenceState;

  return observation;
}

function to_n1(input) {
  const src = input || {};
  const statuses = Array.isArray(src.acquisition_statuses) ? src.acquisition_statuses : [];
  const records = Array.isArray(src.observation_records) ? src.observation_records : [];
  const observations = [];
  for (const record of records) {
    if (!record || !isNonEmptyString(record.observation_id)) continue;
    const matching = statusOf(statuses, record);
    if (matching && !isTransportable(matching)) continue;
    observations.push(wrapN1(record, src, matching));
  }
  return observations;
}

function factKey(fact) {
  const entityId = fact.entity && (fact.entity.entity_id || fact.entity.original_value);
  return `${entityId || ""}|${fact.metric_or_event || ""}|${fact.period || ""}`;
}

function to_n2(n1, context) {
  const observations = Array.isArray(n1) ? n1 : [];
  const statuses = (context && context.acquisition_statuses) || [];
  const facts = [];
  for (const obs of observations) {
    if (obs.absence_state === "DATA_NOT_FOUND") continue;
    const matching = statusOf(statuses, { source: obs.source, domain: obs.domain });
    if (matching && matching.status !== "ACQUIRED_OK") continue;
    if (obs.entity && (obs.entity.resolution === "UNRESOLVED" || obs.entity.resolution === "AMBIGUOUS")) {
      continue;
    }
    facts.push({
      fact_id: `fact_${obs.observation_id}`,
      statement: "restated_observation",
      metric_or_event: obs.metric_or_event,
      value: obs.value,
      unit: obs.unit,
      period: obs.period,
      entity: obs.entity || null,
      supporting_observation_ids: [obs.observation_id],
      absence_state: null,
      confidence: cloneJson(UNCALIBRATED_CONFIDENCE),
      materiality: "MATERIALITY_NOT_ASSESSED",
      applied_materiality_rule_id: null,
    });
  }
  return facts;
}

function to_n3(n2) {
  if (!Array.isArray(n2) || n2.length === 0) return [];
  if (RULE_REGISTRY.evidence_rules.length === 0) return [];
  return [];
}

function to_n4(n3, context) {
  const facts = (context && context.facts) || [];
  if ((!Array.isArray(n3) || n3.length === 0) && facts.length === 0) return [];
  if (RULE_REGISTRY.evidence_rules.length === 0) return [];
  return [];
}

function tipifyConflicts(facts, idFactory) {
  const conflicts = [];
  const groups = new Map();
  for (const fact of facts) {
    const key = factKey(fact);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(fact);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const values = group.map((f) => JSON.stringify(f.value));
    const distinct = new Set(values);
    if (distinct.size < 2) continue;
    conflicts.push({
      conflict_id: idFactory("conflict"),
      primary_type: "A",
      secondary_types: [],
      weight_assessment: null,
      resolution_status: "OPEN",
      applied_resolution_rule_id: null,
      resolution_supporting_fact_ids: [],
      resolution_supporting_evidence_ids: [],
      facts_in_tension: group.map((f) => f.fact_id),
      interpretation_constraint: "no_resolve_by_weight",
      governance_escalation: false,
    });
  }
  return conflicts;
}

function applyCoverage(statuses, facts, conflicts) {
  const openConflict = conflicts.some(
    (c) => c.resolution_status === "OPEN" || c.resolution_status === "UNDER_REVIEW"
  );
  if (openConflict) return "EXISTE_CONFLICTO";

  const usefulFacts = facts.length > 0;
  const codes = statuses.map((s) => s.status);
  const unknown = codes.some((s) => s === "SOURCE_NOT_INTEGRATED" || s === "SOURCE_RESTRICTED");
  const degraded = codes.some(
    (s) =>
      s === "TOOL_ERROR" ||
      s === "ACQUIRED_EMPTY" ||
      s === "ENTITY_UNRESOLVED" ||
      s === "QUERY_SCOPE_INCOMPLETE" ||
      s === "SOURCE_NOT_INTEGRATED" ||
      s === "SOURCE_RESTRICTED"
  );
  const allOk = codes.length > 0 && codes.every((s) => s === "ACQUIRED_OK");

  if (!usefulFacts && unknown) return "NO_CONOZCO";
  if (usefulFacts && degraded) return "CONOZCO_PARCIALMENTE";
  if (usefulFacts && allOk) return "CONOZCO";
  if (!usefulFacts) return codes.some((s) => s === "SOURCE_RESTRICTED" || s === "SOURCE_NOT_INTEGRATED")
    ? "NO_CONOZCO"
    : "CONOZCO_PARCIALMENTE";
  return "CONOZCO_PARCIALMENTE";
}

function openQuestions(statuses, coverage, idFactory) {
  const questions = [];
  for (const status of statuses) {
    if (status.status === "ACQUIRED_OK") continue;
    let question = "¿Hay una fuente integrada y accesible para el alcance consultado?";
    let reason = status.status;
    if (status.status === "SOURCE_NOT_INTEGRATED") {
      question = "¿Fuente integrada para el dominio o tool requerido?";
      reason = "SOURCE_NOT_INTEGRATED";
    } else if (status.status === "SOURCE_RESTRICTED") {
      question = "¿Hay acceso autorizado a la fuente requerida?";
      reason = "SOURCE_RESTRICTED";
    } else if (status.status === "TOOL_ERROR") {
      question = "¿La tool requerida puede adquirirse sin error técnico?";
      reason = "TOOL_ERROR";
    } else if (status.status === "ACQUIRED_EMPTY") {
      question = "¿El vacío técnico corresponde a un fenómeno comprobable bajo contrato de tool?";
      reason = "DATA_NOT_FOUND";
    } else if (status.status === "ENTITY_UNRESOLVED") {
      question = "¿La entidad consultada puede resolverse de forma canónica?";
      reason = "ENTITY_UNRESOLVED";
    } else if (status.status === "QUERY_SCOPE_INCOMPLETE") {
      question = "¿El alcance de consulta está completo?";
      reason = "QUERY_SCOPE_INCOMPLETE";
    }
    questions.push({
      open_question_id: idFactory("oq"),
      question,
      reason,
      required_data: status.domain || status.tool_id || null,
      expected_source: status.tool_id || status.domain || null,
      impact: coverage === "NO_CONOZCO" ? "0.00" : "undeclared",
      priority: "undeclared",
      status: "OPEN",
    });
  }
  return questions;
}

function sourceHealth(statuses) {
  const health = {};
  for (const status of statuses) {
    const key = status.domain || status.tool_id;
    if (!key) continue;
    health[key] = status.status;
  }
  return health;
}

function emit_bundle(stages, context) {
  const ctx = context || {};
  const n1 = Array.isArray(stages && stages.n1) ? stages.n1 : [];
  const n2 = Array.isArray(stages && stages.n2) ? stages.n2 : [];
  const n3 = Array.isArray(stages && stages.n3) ? stages.n3 : [];
  const n4 = Array.isArray(stages && stages.n4) ? stages.n4 : [];
  const incomingConflicts = Array.isArray(stages && stages.conflicts) ? cloneJson(stages.conflicts) : [];

  for (const c of incomingConflicts) {
    if (!RESOLUTION.includes(c.resolution_status)) {
      c.resolution_status = "OPEN";
    }
    if (c.resolution_status === "RESOLVED" && !c.applied_resolution_rule_id) {
      c.resolution_status = "OPEN";
    }
    if (RULE_REGISTRY.resolution_rules.length === 0 && c.resolution_status === "RESOLVED") {
      c.resolution_status = "OPEN";
    }
  }

  const visible = incomingConflicts.filter((c) => {
    if (c.primary_type === "E" || (c.secondary_types || []).includes("E")) return true;
    return true;
  });

  const statuses = Array.isArray(ctx.acquisition_statuses) ? ctx.acquisition_statuses : [];
  const coverage = applyCoverage(statuses, n2, visible);
  if (!COVERAGE.includes(coverage)) {
    throw new Error("invalid_coverage");
  }

  const idFactory = ctx.idFactory || defaultIdFactory(ctx.trace_id || "trace");
  const questions = Array.isArray(stages && stages.open_questions)
    ? cloneJson(stages.open_questions)
    : openQuestions(statuses, coverage, idFactory);

  return {
    bundle_id: ctx.bundle_id || `kb_${ctx.trace_id}`,
    trace_id: ctx.trace_id,
    produced_at: ctx.produced_at || "unclocked",
    producer: "evidence_builder",
    observations: cloneJson(n1),
    facts: cloneJson(n2),
    evidence: cloneJson(n3),
    diagnoses: cloneJson(n4),
    conflicts: visible,
    open_questions: questions,
    knowledge_coverage: coverage,
    source_health: sourceHealth(statuses),
    ruleset_versions: {
      evidence_builder: "2.1",
      physical: RULESET_VERSION,
      absence_rules: "empty",
      resolution_rules: "empty",
      causal_rules: "empty",
      materiality_rules: "empty",
    },
    traceability: {
      question: ctx.question || (ctx.plan && ctx.plan.question) || null,
      plan: ctx.plan,
      tool_plan: ctx.tool_plan,
      acquisition: statuses.map((s) => ({ tool_id: s.tool_id, domain: s.domain, status: s.status })),
      observations: n1.map((o) => o.observation_id),
    },
  };
}

function assemble(input) {
  const original = input || {};
  const copy = cloneJson(original);
  if (!isNonEmptyString(copy.trace_id)) {
    const err = new Error("invalid_input");
    err.code = "INVALID_INPUT";
    throw err;
  }
  if (!Array.isArray(copy.acquisition_statuses)) copy.acquisition_statuses = [];
  if (!Array.isArray(copy.observation_records)) copy.observation_records = [];

  const idFactory = original.idFactory || defaultIdFactory(copy.trace_id);
  const context = {
    trace_id: copy.trace_id,
    plan: copy.plan,
    tool_plan: copy.tool_plan,
    question: copy.question,
    acquisition_statuses: copy.acquisition_statuses,
    produced_at: copy.produced_at,
    bundle_id: copy.bundle_id,
    idFactory,
  };

  const n1 = to_n1(copy);
  const n2 = to_n2(n1, context);
  context.facts = n2;
  const n3 = to_n3(n2, context);
  const n4 = to_n4(n3, context);
  const conflicts = tipifyConflicts(n2, idFactory);
  return emit_bundle({ n1, n2, n3, n4, conflicts }, context);
}

function createEvidenceBuilder(options) {
  const opts = options || {};
  return {
    to_n1,
    to_n2,
    to_n3,
    to_n4,
    emit_bundle,
    assemble(input) {
      const next = cloneJson(input || {});
      if (opts.idFactory) next.idFactory = opts.idFactory;
      if (opts.produced_at && !next.produced_at) next.produced_at = opts.produced_at;
      return assemble(next);
    },
    registry: RULE_REGISTRY,
  };
}

module.exports = {
  createEvidenceBuilder,
  assemble,
  to_n1,
  to_n2,
  to_n3,
  to_n4,
  emit_bundle,
  RULE_REGISTRY,
  RULESET_VERSION,
};
