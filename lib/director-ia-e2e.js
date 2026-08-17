/**
 * Orquestador E2E in-memory Director IA.
 * No es capa semántica. Delega a OP → EB → EKS → IES → RE → CP.
 * No ejecuta tools, no usa red, no fabrica N1–N5 ni N6.
 */
"use strict";

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

function createDirectorIaE2e(options) {
  const opts = options || {};
  if (typeof opts.clock !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "clock_required");
  }
  if (typeof opts.idFactory !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "idFactory_required");
  }
  requireFn(opts.op, "op", "process");
  requireFn(opts.eb, "eb", "assemble");
  requireFn(opts.eks, "eks", "validate_structure");
  requireFn(opts.eks, "eks", "append_snapshot");
  requireFn(opts.iesBuilder, "iesBuilder", "build");
  requireFn(opts.reasoningEngine, "reasoningEngine", "reason");
  requireFn(opts.channelProjection, "channelProjection", "project");
  if (!opts.modelAdapter || typeof opts.modelAdapter.infer !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "modelAdapter.infer_required");
  }

  async function run(input) {
    const args = isPlainObject(input) ? input : {};
    if (!isPlainObject(args.executionEnvelope)) {
      throw structuralError("INVALID_INPUT", "executionEnvelope_required");
    }
    if (!isPlainObject(args.queryContextMetadata)) {
      throw structuralError("INVALID_INPUT", "queryContextMetadata_required");
    }
    if (!args.channel) {
      throw structuralError("INVALID_INPUT", "channel_required");
    }
    if (!args.projectionDepth) {
      throw structuralError("INVALID_INPUT", "projectionDepth_required");
    }

    const envelope = cloneJson(args.executionEnvelope);
    const queryContextMetadata = cloneJson(args.queryContextMetadata);
    const session = args.session === undefined ? {} : cloneJson(args.session);

    const execution_results = Array.isArray(envelope.execution_results)
      ? envelope.execution_results
      : envelope.execution_results;
    const opOut = opts.op.process(execution_results);

    const bundle = opts.eb.assemble({
      trace_id: envelope.trace_id,
      bundle_id: envelope.bundle_id,
      produced_at: envelope.produced_at,
      question: envelope.question,
      plan: envelope.plan,
      tool_plan: envelope.tool_plan,
      acquisition_statuses: opOut.acquisition_statuses,
      observation_records: opOut.observation_records,
    });

    const validation = opts.eks.validate_structure(bundle);
    if (!validation.ok) {
      const err = structuralError("INVALID_BUNDLE", "bundle_failed_validate_structure");
      err.errors = validation.errors;
      throw err;
    }

    const knowledge_snapshot = await opts.eks.append_snapshot(bundle);
    const snapshotForIes = cloneJson(knowledge_snapshot);
    snapshotForIes.query_context_metadata = queryContextMetadata;

    const ies = opts.iesBuilder.build(snapshotForIes);

    const reasoned = opts.reasoningEngine.reason(ies, session);
    const reasoning_result = reasoned.reasoning_result;
    const reasoning_run = reasoned.reasoning_run;

    const projected = opts.channelProjection.project({
      ies,
      reasoningResult: reasoning_result,
      reasoningRunId: reasoning_run && reasoning_run.run_id,
      channel: args.channel,
      projectionDepth: args.projectionDepth,
    });

    return {
      trace_id: envelope.trace_id,
      acquisition_statuses: opOut.acquisition_statuses,
      observation_records: opOut.observation_records,
      knowledge_bundle: bundle,
      knowledge_snapshot,
      ies,
      reasoning_result,
      reasoning_run,
      projection_model: projected.projection_model,
      channel_output: projected.channel_output,
    };
  }

  return { run };
}

module.exports = {
  createDirectorIaE2e,
};
