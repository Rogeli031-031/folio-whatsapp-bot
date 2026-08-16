/**
 * Observation Pipeline — runtime mínimo (03A v1.4, D1–D15).
 * Puro y determinista. Sin LLM, DB, red, tools, semántica N2–N5 ni EKS.
 * No calibra G8. No ejecuta tools.
 */
"use strict";

const ALLOWED_STATUSES = Object.freeze([
  "ACQUIRED_OK",
  "ACQUIRED_EMPTY",
  "SOURCE_NOT_INTEGRATED",
  "SOURCE_RESTRICTED",
  "TOOL_ERROR",
  "QUERY_SCOPE_INCOMPLETE",
  "ENTITY_UNRESOLVED",
]);

const NON_TRANSPORT = Object.freeze([
  "TOOL_ERROR",
  "SOURCE_RESTRICTED",
  "SOURCE_NOT_INTEGRATED",
  "QUERY_SCOPE_INCOMPLETE",
  "ENTITY_UNRESOLVED",
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

function defaultClock() {
  return "unclocked";
}

function defaultIdFactory() {
  let n = 0;
  return (prefix) => {
    n += 1;
    return `${prefix || "obs"}_${n}`;
  };
}

function structuralError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

function resolveStatus(envelope) {
  if (isNonEmptyString(envelope.status)) return envelope.status;
  if (isNonEmptyString(envelope.technical_state)) return envelope.technical_state;
  return null;
}

function envelopesFromInput(executionResults) {
  if (Array.isArray(executionResults)) return executionResults;
  if (isPlainObject(executionResults)) {
    if (Array.isArray(executionResults.execution_results)) return executionResults.execution_results;
    if (Array.isArray(executionResults.envelopes)) return executionResults.envelopes;
  }
  throw structuralError("INVALID_INPUT", "execution_results_not_array");
}

function payloadRows(envelope) {
  const payload = envelope.payload;
  if (payload === undefined || payload === null) return [];
  if (Array.isArray(payload)) return payload;
  if (isPlainObject(payload) && Array.isArray(payload.rows)) return payload.rows;
  if (isPlainObject(payload)) return [payload];
  return [];
}

function rawRef(envelope, index) {
  if (isNonEmptyString(envelope.raw_payload_reference)) return envelope.raw_payload_reference;
  if (isNonEmptyString(envelope.payload_reference)) return envelope.payload_reference;
  const exec = envelope.execution_id || "exec";
  return `raw://${envelope.trace_id}/${envelope.tool_id}/${exec}/${index}`;
}

function sourceFrom(envelope) {
  const src = isPlainObject(envelope.source) ? envelope.source : {};
  const contentAuthor = Object.prototype.hasOwnProperty.call(src, "content_author_id")
    ? src.content_author_id
    : Object.prototype.hasOwnProperty.call(envelope, "content_author_id")
      ? envelope.content_author_id
      : null;
  const source = {
    tool_id: envelope.tool_id,
    domain: envelope.domain,
    system: src.system || envelope.domain,
    source_family: src.source_family || envelope.tool_id,
    source_instance_id:
      src.source_instance_id || `${src.system || envelope.domain}:${envelope.execution_id || envelope.tool_id}`,
    content_author_id: contentAuthor,
  };
  if (src.author_role !== undefined) source.author_role = src.author_role;
  if (src.author_id !== undefined) source.author_id = src.author_id;
  if (src.origin_event_id !== undefined) source.origin_event_id = src.origin_event_id;
  if (src.derived_from !== undefined) source.derived_from = src.derived_from;
  if (src.channel !== undefined) source.channel = src.channel;
  return source;
}

function entityResolutionFrom(envelope) {
  const er = envelope.entity_resolution || envelope.entity || null;
  if (!er || !isPlainObject(er)) return null;
  const state = er.state || er.entity_resolution_state || null;
  if (!state) return null;
  const out = {
    state,
    original_value: er.original_value !== undefined ? er.original_value : null,
    candidates: Array.isArray(er.candidates) ? cloneJson(er.candidates) : [],
  };
  if (er.resolution_rule !== undefined) out.resolution_rule = er.resolution_rule;
  if (er.resolution_confidence !== undefined) out.resolution_confidence = er.resolution_confidence;
  return out;
}

function subjectFrom(envelope, resolution) {
  const declared = isPlainObject(envelope.subject) ? envelope.subject : {};
  const subject = {};
  if (declared.entity_type !== undefined) subject.entity_type = declared.entity_type;
  if (declared.entity_label !== undefined) subject.entity_label = declared.entity_label;
  if (resolution && resolution.state === "RESOLVED") {
    if (declared.entity_id !== undefined) subject.entity_id = declared.entity_id;
    else if (envelope.entity_id !== undefined) subject.entity_id = envelope.entity_id;
  }
  if (Object.keys(subject).length === 0) return null;
  return subject;
}

function buildStatus(envelope, status, receivedAt) {
  const item = {
    trace_id: envelope.trace_id,
    tool_id: envelope.tool_id,
    domain: envelope.domain,
    status,
    pipeline_received_at: receivedAt,
  };
  if (isNonEmptyString(envelope.execution_id)) item.execution_id = envelope.execution_id;
  if (typeof envelope.scope_complete === "boolean") item.scope_complete = envelope.scope_complete;
  if (status === "QUERY_SCOPE_INCOMPLETE") item.scope_complete = false;
  const resolution = entityResolutionFrom(envelope);
  if (resolution) item.entity_resolution_state = resolution.state;
  if (status === "ENTITY_UNRESOLVED") item.entity_resolution_state = "UNRESOLVED";
  if (envelope.error !== undefined && envelope.error !== null) {
    item.error = isPlainObject(envelope.error)
      ? { code: envelope.error.code || "TOOL_ERROR" }
      : { code: String(envelope.error) };
  }
  if (envelope.extracted_at !== undefined) item.extracted_at = envelope.extracted_at;
  if (envelope.executed_at !== undefined) item.executed_at = envelope.executed_at;
  return item;
}

function buildRecord(envelope, status, row, index, receivedAt, idFactory) {
  const source = sourceFrom(envelope);
  const resolution = entityResolutionFrom(envelope);
  const subject = subjectFrom(envelope, resolution);
  const normalized = row === undefined || row === null ? {} : cloneJson(row);
  const record = {
    observation_id: idFactory("obs"),
    trace_id: envelope.trace_id,
    source,
    extracted_by: envelope.extracted_by || envelope.tool_id,
    triggered_by: envelope.triggered_by || "undeclared",
    extracted_at: envelope.extracted_at || receivedAt,
    pipeline_received_at: receivedAt,
    normalized_payload: normalized,
    raw_payload_reference: rawRef(envelope, index),
    scope_complete: status === "QUERY_SCOPE_INCOMPLETE" ? false : envelope.scope_complete !== false,
    validation_state: envelope.validation_state || "VALID",
  };
  if (isNonEmptyString(envelope.execution_id)) record.execution_id = envelope.execution_id;
  if (envelope.effective_period !== undefined) record.effective_period = envelope.effective_period;
  if (subject) record.subject = subject;
  if (resolution) record.entity_resolution = resolution;
  if (Object.prototype.hasOwnProperty.call(envelope, "metric_or_event")) {
    record.metric_or_event = envelope.metric_or_event;
  } else if (isPlainObject(row) && Object.prototype.hasOwnProperty.call(row, "metric_or_event")) {
    record.metric_or_event = row.metric_or_event;
  }
  if (Object.prototype.hasOwnProperty.call(envelope, "value")) {
    record.value = envelope.value;
  } else if (isPlainObject(row) && Object.prototype.hasOwnProperty.call(row, "value")) {
    record.value = row.value;
  }
  if (envelope.unit !== undefined) record.unit = envelope.unit;
  else if (isPlainObject(row) && row.unit !== undefined) record.unit = row.unit;
  if (envelope.period !== undefined) record.period = envelope.period;
  else if (isPlainObject(row) && row.period !== undefined) record.period = row.period;
  return record;
}

function processEnvelopes(executionResults, options) {
  const clock = options.clock || defaultClock;
  const idFactory = options.idFactory || defaultIdFactory();
  const copy = cloneJson(executionResults);
  const list = envelopesFromInput(copy);
  const receivedAt = clock();
  const acquisition_statuses = [];
  const observation_records = [];

  for (const envelope of list) {
    if (!isPlainObject(envelope)) {
      throw structuralError("INVALID_ENVELOPE", "envelope_not_object");
    }
    if (!isNonEmptyString(envelope.trace_id) || !isNonEmptyString(envelope.tool_id) || !isNonEmptyString(envelope.domain)) {
      throw structuralError("INVALID_ENVELOPE", "missing_identity");
    }
    const status = resolveStatus(envelope);
    if (!status) {
      throw structuralError("INVALID_ENVELOPE", "missing_status");
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      throw structuralError("INVALID_STATUS", "unknown_status");
    }

    acquisition_statuses.push(buildStatus(envelope, status, receivedAt));

    if (NON_TRANSPORT.includes(status)) {
      continue;
    }

    if (status === "ACQUIRED_EMPTY") {
      observation_records.push(buildRecord(envelope, status, {}, 0, receivedAt, idFactory));
      continue;
    }

    const rows = payloadRows(envelope);
    for (let i = 0; i < rows.length; i += 1) {
      observation_records.push(buildRecord(envelope, status, rows[i], i, receivedAt, idFactory));
    }
  }

  return { acquisition_statuses, observation_records };
}

function createObservationPipeline(options) {
  const opts = options || {};
  return {
    process(executionResults) {
      return processEnvelopes(executionResults, opts);
    },
  };
}

module.exports = {
  createObservationPipeline,
  ALLOWED_STATUSES,
};
