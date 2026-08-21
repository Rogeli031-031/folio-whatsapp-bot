/**
 * Director IA — vertical slice ARR → MINIMAL_EXECUTION_ENVELOPE → OP → EB → EKS.
 * Fachada + adapter. No es OP, EB, EKS, IES, RE, CP ni chat.
 * No ejecuta SQL. Invoca únicamente la abstracción ARR inyectada
 * (forma física de loadArrProyForPlant: { venta_ton, desc_kg }).
 */
"use strict";

const TOOL_ID = "get_arr_snapshot";
const DOMAIN = "arr";
const SOURCE_SYSTEM = "arr";
const SOURCE_FAMILY = "arr_snapshot";
const METRIC = "venta_ton";
const UNIT = "t";

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

function parsePlantaId(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

function parsePlantCode(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

function parseYearMonth(input) {
  const yearRaw = input && input.year;
  const monthRaw = input && input.month;
  const year = yearRaw === undefined || yearRaw === null || yearRaw === "" ? null : parseInt(String(yearRaw), 10);
  const month =
    monthRaw === undefined || monthRaw === null || monthRaw === "" ? null : parseInt(String(monthRaw), 10);
  const yearOk = Number.isFinite(year) && year > 0;
  const monthOk = Number.isFinite(month) && month >= 1 && month <= 12;
  return {
    year: yearOk ? year : null,
    month: monthOk ? month : null,
    complete: yearOk && monthOk,
  };
}

function periodToken(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function isTransportableVenta(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function requireFn(obj, name, method) {
  if (!obj || typeof obj[method] !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", `${name}.${method}_required`);
  }
}

function invokeArrSource(arrSource, query) {
  if (typeof arrSource.execute === "function") {
    return arrSource.execute(query);
  }
  if (typeof arrSource === "function") {
    return arrSource(query.client, query.year, query.month, query.plant_code);
  }
  throw structuralError("INVALID_DEPENDENCIES", "arrSource.execute_required");
}

function isArrSourceTimeout(err) {
  if (!err) return false;
  const code = err.code != null ? String(err.code) : "";
  if (code === "57014" || code === "ARR_TIMEOUT" || code === "QUERY_CANCELED") return true;
  const msg = String(err.message || "").toLowerCase();
  return (
    msg.includes("statement timeout") ||
    msg.includes("query canceled") ||
    msg.includes("canceling statement")
  );
}

function baseEnvelope(ctx, status, extras) {
  const envelope = {
    trace_id: ctx.trace_id,
    tool_id: TOOL_ID,
    domain: DOMAIN,
    status,
    technical_state: status,
    execution_id: ctx.execution_id,
    extracted_by: TOOL_ID,
    triggered_by: ctx.triggered_by,
    extracted_at: ctx.extracted_at,
    scope_complete: extras.scope_complete !== undefined ? extras.scope_complete : status !== "QUERY_SCOPE_INCOMPLETE",
    source: {
      system: SOURCE_SYSTEM,
      source_family: SOURCE_FAMILY,
      source_instance_id: ctx.source_instance_id,
      content_author_id: null,
    },
    raw_payload_reference: ctx.raw_payload_reference,
  };
  if (extras.subject !== undefined) envelope.subject = extras.subject;
  if (extras.entity_resolution !== undefined) envelope.entity_resolution = extras.entity_resolution;
  if (extras.payload !== undefined) envelope.payload = extras.payload;
  if (extras.error !== undefined) envelope.error = extras.error;
  if (Object.prototype.hasOwnProperty.call(extras, "metric_or_event")) {
    envelope.metric_or_event = extras.metric_or_event;
  }
  if (Object.prototype.hasOwnProperty.call(extras, "period")) envelope.period = extras.period;
  if (Object.prototype.hasOwnProperty.call(extras, "unit")) envelope.unit = extras.unit;
  return envelope;
}

function resolvedSubject(plantCode, input) {
  const subject = { entity_type: "planta", entity_id: plantCode };
  if (isNonEmptyString(input.plant_label)) subject.entity_label = input.plant_label;
  else subject.entity_label = plantCode;
  return subject;
}

function collectRows(result) {
  if (result === undefined || result === null) return [];
  if (Array.isArray(result)) return result.filter((row) => isPlainObject(row));
  if (!isPlainObject(result)) return null;
  if (Array.isArray(result.rows)) return result.rows.filter((row) => isPlainObject(row));
  return [result];
}

function mapOkPayload(rows, defaultPeriod) {
  const payloadRows = [];
  for (const row of rows) {
    if (!isTransportableVenta(row.venta_ton)) continue;
    const item = {
      metric_or_event: METRIC,
      value: Number(row.venta_ton),
      unit: UNIT,
    };
    if (isNonEmptyString(row.period)) item.period = row.period;
    else if (defaultPeriod) item.period = defaultPeriod;
    payloadRows.push(item);
  }
  return payloadRows;
}

function buildArrEnvelopes(ctx, input, arrResult) {
  const plantCode = String(input.plant_code).trim();
  const ym = parseYearMonth(input);
  const period = ym.complete ? periodToken(ym.year, ym.month) : null;
  const subject = resolvedSubject(plantCode, input);
  const entity_resolution = {
    state: "RESOLVED",
    original_value: String(input.planta_id),
    candidates: [],
  };

  const rows = collectRows(arrResult);
  if (rows === null) {
    return [
      baseEnvelope(ctx, "TOOL_ERROR", {
        subject,
        entity_resolution,
        error: { code: "UNUSABLE_ARR_RESULT" },
        scope_complete: true,
      }),
    ];
  }

  const payloadRows = mapOkPayload(rows, period);
  if (payloadRows.length === 0) {
    return [
      baseEnvelope(ctx, "ACQUIRED_EMPTY", {
        subject,
        entity_resolution,
        metric_or_event: METRIC,
        period,
        unit: UNIT,
        payload: {},
        scope_complete: true,
      }),
    ];
  }

  const payload = payloadRows.length === 1 ? payloadRows[0] : { rows: payloadRows };
  const extras = {
    subject,
    entity_resolution,
    payload,
    metric_or_event: METRIC,
    unit: UNIT,
    scope_complete: true,
  };
  if (period) extras.period = period;
  return [baseEnvelope(ctx, "ACQUIRED_OK", extras)];
}

async function adaptArr(arrSource, ctx, input, client) {
  const plantCode = String(input.plant_code).trim();
  const ym = parseYearMonth(input);
  try {
    const result = await invokeArrSource(arrSource, {
      client,
      year: ym.year,
      month: ym.month,
      plant_code: plantCode,
    });
    return buildArrEnvelopes(ctx, input, result);
  } catch (err) {
    if (isArrSourceTimeout(err)) {
      const wrapped = new Error("arr_timeout");
      wrapped.code = "ARR_TIMEOUT";
      throw wrapped;
    }
    const code = err && err.code ? String(err.code) : "TOOL_ERROR";
    return [
      baseEnvelope(ctx, "TOOL_ERROR", {
        subject: resolvedSubject(plantCode, input),
        entity_resolution: {
          state: "RESOLVED",
          original_value: String(input.planta_id),
          candidates: [],
        },
        error: { code },
        scope_complete: true,
      }),
    ];
  }
}

function createDirectorIaArrInput(options) {
  const opts = options || {};
  if (typeof opts.clock !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "clock_required");
  }
  if (typeof opts.idFactory !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "idFactory_required");
  }
  if (!opts.arrSource || (typeof opts.arrSource !== "function" && typeof opts.arrSource.execute !== "function")) {
    throw structuralError("INVALID_DEPENDENCIES", "arrSource.execute_required");
  }
  requireFn(opts.observationPipeline, "observationPipeline", "process");
  requireFn(opts.evidenceBuilder, "evidenceBuilder", "assemble");
  requireFn(opts.eks, "eks", "validate_structure");
  requireFn(opts.eks, "eks", "append_snapshot");

  async function run(input) {
    const original = isPlainObject(input) ? input : {};
    const copy = cloneJson({
      planta_id: original.planta_id,
      plant_code: original.plant_code,
      plant_label: original.plant_label,
      year: original.year,
      month: original.month,
      triggered_by: original.triggered_by,
      question: original.question,
      plan: original.plan,
      tool_plan: original.tool_plan,
    });

    const plantaId = parsePlantaId(copy.planta_id);
    if (plantaId === null) {
      throw structuralError("INVALID_INPUT", "planta_id_required");
    }
    copy.planta_id = plantaId;

    const traceId = opts.idFactory("trace");
    const executionId = opts.idFactory("execution");
    const extractedAt = opts.clock();
    const triggeredBy = isNonEmptyString(copy.triggered_by) ? copy.triggered_by : "undeclared";
    const plantCode = parsePlantCode(copy.plant_code);
    if (plantCode) copy.plant_code = plantCode;
    const sourceInstanceId = `arr:${plantCode || plantaId}:${executionId}`;
    const rawRef = `raw://${traceId}/${TOOL_ID}/${executionId}/0`;
    const ctx = {
      trace_id: traceId,
      execution_id: executionId,
      extracted_at: extractedAt,
      triggered_by: triggeredBy,
      source_instance_id: sourceInstanceId,
      raw_payload_reference: rawRef,
    };

    let envelopes;
    const ym = parseYearMonth(copy);

    if (!plantCode) {
      envelopes = [
        baseEnvelope(ctx, "ENTITY_UNRESOLVED", {
          subject: { entity_type: "planta", entity_label: String(plantaId) },
          entity_resolution: {
            state: "UNRESOLVED",
            original_value: String(plantaId),
            candidates: [],
          },
          scope_complete: ym.complete,
        }),
      ];
    } else if (!ym.complete) {
      envelopes = [
        baseEnvelope(ctx, "QUERY_SCOPE_INCOMPLETE", {
          subject: resolvedSubject(plantCode, copy),
          entity_resolution: {
            state: "RESOLVED",
            original_value: String(plantaId),
            candidates: [],
          },
          metric_or_event: METRIC,
          unit: UNIT,
          scope_complete: false,
        }),
      ];
    } else {
      envelopes = await adaptArr(opts.arrSource, ctx, copy, original.client);
    }

    const opOut = opts.observationPipeline.process(envelopes);
    const bundle = opts.evidenceBuilder.assemble({
      trace_id: traceId,
      bundle_id: `kb_${traceId}`,
      produced_at: extractedAt,
      question: copy.question,
      plan: copy.plan,
      tool_plan: copy.tool_plan || { tools: [TOOL_ID] },
      acquisition_statuses: opOut.acquisition_statuses,
      observation_records: opOut.observation_records,
    });

    const validation = opts.eks.validate_structure(bundle);
    if (!validation.ok) {
      const err = structuralError("INVALID_BUNDLE", "bundle_failed_validate_structure");
      err.errors = validation.errors;
      throw err;
    }

    const snapshot = await opts.eks.append_snapshot(bundle);
    return {
      trace_id: traceId,
      envelopes,
      acquisition_statuses: opOut.acquisition_statuses,
      observation_records: opOut.observation_records,
      bundle,
      validation,
      snapshot,
    };
  }

  return { run };
}

module.exports = {
  createDirectorIaArrInput,
  TOOL_ID,
  DOMAIN,
  METRIC,
};
