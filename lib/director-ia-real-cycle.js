/**
 * Director IA — composición mínima del ciclo real:
 * ARR facade → EKS snapshot → query_context_metadata → IES → RE → CP(DASHBOARD).
 * No es OP, EB, EKS, IES, RE ni CP. No duplica su lógica. No fabrica N1–N5.
 */
"use strict";

const DASHBOARD_CHANNEL = "DASHBOARD";

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

function requireFn(obj, name, method) {
  if (!obj || typeof obj[method] !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", `${name}.${method}_required`);
  }
}

function arrPayloadFrom(original) {
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
  if (isPlainObject(original.query_context_metadata)) {
    copy.query_context_metadata = cloneJson(original.query_context_metadata);
  } else if (isPlainObject(original.queryContextMetadata)) {
    copy.query_context_metadata = cloneJson(original.queryContextMetadata);
  }
  if (Object.prototype.hasOwnProperty.call(original, "client")) {
    copy.client = original.client;
  }
  return copy;
}

function metadataFrom(original) {
  if (isPlainObject(original.query_context_metadata)) {
    return cloneJson(original.query_context_metadata);
  }
  if (isPlainObject(original.queryContextMetadata)) {
    return cloneJson(original.queryContextMetadata);
  }
  throw structuralError("INVALID_INPUT", "query_context_metadata_required");
}

function projectionDepthFrom(original) {
  if (original.projection_depth !== undefined) return original.projection_depth;
  if (original.projectionDepth !== undefined) return original.projectionDepth;
  throw structuralError("INVALID_INPUT", "projectionDepth_required");
}

function createDirectorIaRealCycle(options) {
  const opts = options || {};
  if (typeof opts.clock !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "clock_required");
  }
  if (typeof opts.idFactory !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "idFactory_required");
  }
  requireFn(opts.arrInput, "arrInput", "run");
  requireFn(opts.iesBuilder, "iesBuilder", "build");
  requireFn(opts.reasoningEngine, "reasoningEngine", "reason");
  requireFn(opts.channelProjection, "channelProjection", "project");

  async function run(input) {
    const original = isPlainObject(input) ? input : {};
    const metadata = metadataFrom(original);
    void metadata;
    const projectionDepth = projectionDepthFrom(original);
    const session = original.session === undefined ? {} : cloneJson(original.session);

    const arr_cycle = await opts.arrInput.run(arrPayloadFrom(original));
    const traceId = arr_cycle && arr_cycle.trace_id;
    if (typeof traceId !== "string" || !traceId.trim()) {
      throw structuralError("INVALID_ARR_CYCLE", "trace_id_required");
    }

    const snapshotForIes = cloneJson(arr_cycle.snapshot);
    const persistedMeta = snapshotForIes && snapshotForIes.query_context_metadata;
    if (!isPlainObject(persistedMeta)) {
      throw structuralError("MISSING_QUERY_CONTEXT_METADATA", "persisted_query_context_metadata_required");
    }

    const ies = opts.iesBuilder.build(snapshotForIes);
    const reasoned = opts.reasoningEngine.reason(ies, session);
    const projected = opts.channelProjection.project({
      ies,
      reasoningResult: reasoned.reasoning_result,
      reasoningRunId: reasoned.reasoning_run && reasoned.reasoning_run.run_id,
      channel: DASHBOARD_CHANNEL,
      projectionDepth,
    });

    return {
      trace_id: traceId,
      arr_cycle,
      query_context_metadata: cloneJson(persistedMeta),
      ies,
      reasoning_result: reasoned.reasoning_result,
      reasoning_run: reasoned.reasoning_run,
      projection_model: projected.projection_model,
      channel_output: projected.channel_output,
    };
  }

  return { run };
}

module.exports = {
  createDirectorIaRealCycle,
  DASHBOARD_CHANNEL,
};
