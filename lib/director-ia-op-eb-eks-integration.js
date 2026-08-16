/**
 * Orquestación de integración OP → EB → EKS (solo tests / fixtures sintéticos).
 * No es capa epistemológica. No ejecuta tools. No usa server.js, DB productiva ni red.
 * OP no llama EKS. EB no llama append_snapshot. Esta capa solo encadena llamadas.
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

/**
 * @param {object} input MINIMAL_EXECUTION_ENVELOPE container (trace_id, plan, tool_plan, execution_results)
 * @param {{ observation_pipeline: object, evidence_builder: object, eks: object }} dependencies
 */
async function run_op_eb_eks(input, dependencies) {
  if (!isPlainObject(input)) {
    throw structuralError("INVALID_INPUT", "input_not_object");
  }
  if (!isPlainObject(dependencies)) {
    throw structuralError("INVALID_DEPENDENCIES", "dependencies_required");
  }

  const observation_pipeline = dependencies.observation_pipeline;
  const evidence_builder = dependencies.evidence_builder;
  const eks = dependencies.eks;
  if (!observation_pipeline || typeof observation_pipeline.process !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "observation_pipeline_required");
  }
  if (!evidence_builder || typeof evidence_builder.assemble !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "evidence_builder_required");
  }
  if (!eks || typeof eks.validate_structure !== "function" || typeof eks.append_snapshot !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "eks_required");
  }

  const copy = cloneJson(input);
  const execution_results = Array.isArray(copy.execution_results)
    ? copy.execution_results
    : copy.execution_results;
  const opOut = observation_pipeline.process(execution_results);

  const bundle = evidence_builder.assemble({
    trace_id: copy.trace_id,
    bundle_id: copy.bundle_id,
    produced_at: copy.produced_at,
    question: copy.question,
    plan: copy.plan,
    tool_plan: copy.tool_plan,
    acquisition_statuses: opOut.acquisition_statuses,
    observation_records: opOut.observation_records,
  });

  const validation = eks.validate_structure(bundle);
  if (!validation.ok) {
    const err = structuralError("INVALID_BUNDLE", "bundle_failed_validate_structure");
    err.errors = validation.errors;
    throw err;
  }

  const snapshot = await eks.append_snapshot(bundle);

  return {
    acquisition_statuses: opOut.acquisition_statuses,
    observation_records: opOut.observation_records,
    bundle,
    validation,
    snapshot,
  };
}

module.exports = {
  run_op_eb_eks,
};
