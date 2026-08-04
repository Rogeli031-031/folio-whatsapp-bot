"use strict";

/**
 * Director IA v2 — Fase 3: Tool Orchestrator declarativo.
 * Traduce un plan del Planner a un plan de herramientas.
 * No ejecuta tools. No consulta DB. No llama OpenAI.
 */

const {
  getDirectorIaTool,
  listToolsForDomain,
  isDirectorIaToolExecutable,
  DOMAIN_TO_TOOLS,
  TOOL_STATUS,
  KNOWN_INPUT_KEYS,
  validateKnownRequiredInputs,
} = require("./director-ia-tools");

const TOOL_PLAN_VERSION = "1.0";

/**
 * @param {object} options
 * @param {string} key
 * @returns {boolean}
 */
function hasInput(options, key) {
  if (!options || typeof options !== "object") return false;
  const v = options[key];
  if (v === undefined || v === null) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  if (typeof v === "number" && !Number.isFinite(v)) return false;
  return true;
}

/**
 * @param {string[]} requiredInputs
 * @param {object} options
 * @returns {string[]}
 */
function computeMissingInputs(requiredInputs, options) {
  const req = Array.isArray(requiredInputs) ? requiredInputs : [];
  return req.filter((k) => !hasInput(options, k));
}

/**
 * @param {object} plan planDirectorIaQuestion result
 * @param {object} [options]
 */
function buildDirectorIaToolPlan(plan, options = {}) {
  const opts = options && typeof options === "object" ? options : {};
  const intent = plan && plan.intent ? String(plan.intent) : "unknown";
  const requested_domains = Array.isArray(plan?.domains) ? [...plan.domains] : [];
  const requires_clarification = Boolean(plan?.requires_clarification);
  const clarification_reason =
    plan?.clarification_reason != null ? String(plan.clarification_reason) : null;

  /** @type {Map<string, object>} */
  const toolsById = new Map();

  for (const domain of requested_domains) {
    const mappedIds = DOMAIN_TO_TOOLS[domain] || listToolsForDomain(domain).map((t) => t.id);
    if (!mappedIds.length) {
      continue;
    }
    for (const toolId of mappedIds) {
      if (toolsById.has(toolId)) continue;
      const tool = getDirectorIaTool(toolId);
      if (!tool) continue;

      const missing = computeMissingInputs(tool.requiredInputs, opts);
      const executable = isDirectorIaToolExecutable(toolId) && missing.length === 0;

      let reason = "mapped_from_domain";
      if (tool.status === TOOL_STATUS.declared_not_integrated) {
        reason = "domain_not_integrated";
      } else if (tool.status === TOOL_STATUS.restricted) {
        reason = "tool_restricted";
      } else if (missing.length > 0) {
        reason = `missing_inputs:${missing.join(",")}`;
      } else if (tool.status === TOOL_STATUS.available_on_demand) {
        reason = "available_on_demand";
      } else if (tool.status === TOOL_STATUS.available) {
        reason = "available";
      }

      toolsById.set(toolId, {
        tool_id: tool.id,
        domain: tool.domain,
        status: tool.status,
        executable,
        required_inputs: [...tool.requiredInputs],
        missing_inputs: missing,
        reason,
      });
    }
  }

  const tools = [...toolsById.values()];
  const executable_tools = tools.filter((t) => t.executable).map((t) => t.tool_id);

  const unavailable_tools = [
    ...new Set(
      tools
        .filter(
          (t) =>
            t.status === TOOL_STATUS.declared_not_integrated ||
            t.status === TOOL_STATUS.unknown ||
            (!isDirectorIaToolExecutable(t.tool_id) && t.status !== TOOL_STATUS.restricted)
        )
        .map((t) => t.tool_id)
    ),
  ];

  const restricted_tools = tools
    .filter((t) => t.status === TOOL_STATUS.restricted)
    .map((t) => t.tool_id);

  const missing_inputs = [...new Set(tools.flatMap((t) => t.missing_inputs))];

  const registryExecutableInPlan = tools.filter((t) => isDirectorIaToolExecutable(t.tool_id));
  const registryExecutableMissingInputs = [
    ...new Set(registryExecutableInPlan.flatMap((t) => t.missing_inputs)),
  ];

  const clarificationBlocks = requires_clarification === true;

  // Ejecución parcial: basta con una tool lista.
  const can_execute = !clarificationBlocks && executable_tools.length > 0;

  // Ejecución completa del plan: todas las registry-ejecutables con inputs,
  // sin tools no integradas/restringidas pendientes en el plan.
  const can_execute_all =
    !clarificationBlocks &&
    tools.length > 0 &&
    registryExecutableInPlan.length > 0 &&
    registryExecutableMissingInputs.length === 0 &&
    unavailable_tools.length === 0 &&
    restricted_tools.length === 0;

  return {
    version: TOOL_PLAN_VERSION,
    planner_version: plan?.version != null ? String(plan.version) : null,
    intent,
    requested_domains,
    tools,
    executable_tools,
    unavailable_tools,
    restricted_tools,
    missing_inputs,
    can_execute,
    can_execute_all,
    requires_clarification,
    clarification_reason,
  };
}

/**
 * @param {object} toolPlan
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateDirectorIaToolPlan(toolPlan) {
  const errors = [];
  if (!toolPlan || typeof toolPlan !== "object") {
    return { ok: false, errors: ["tool_plan_missing"] };
  }
  if (toolPlan.version !== TOOL_PLAN_VERSION) errors.push("version_invalid");
  if (typeof toolPlan.intent !== "string") errors.push("intent_invalid");
  if (!Array.isArray(toolPlan.requested_domains)) errors.push("requested_domains_invalid");
  if (!Array.isArray(toolPlan.tools)) errors.push("tools_invalid");
  else {
    const ids = toolPlan.tools.map((t) => t.tool_id);
    if (new Set(ids).size !== ids.length) errors.push("tools_duplicated");
    for (const t of toolPlan.tools) {
      if (!getDirectorIaTool(t.tool_id)) errors.push(`tool_unknown:${t.tool_id}`);
      if (typeof t.executable !== "boolean") errors.push(`executable_invalid:${t.tool_id}`);
      if (!Array.isArray(t.required_inputs)) errors.push(`required_inputs_invalid:${t.tool_id}`);
      else errors.push(...validateKnownRequiredInputs(t.tool_id, t.required_inputs));
      if (!Array.isArray(t.missing_inputs)) errors.push(`missing_inputs_invalid:${t.tool_id}`);
      else errors.push(...validateKnownRequiredInputs(t.tool_id, t.missing_inputs));
      if (!Object.values(TOOL_STATUS).includes(t.status)) errors.push(`status_invalid:${t.tool_id}`);
    }
  }
  if (!Array.isArray(toolPlan.executable_tools)) errors.push("executable_tools_invalid");
  if (!Array.isArray(toolPlan.unavailable_tools)) errors.push("unavailable_tools_invalid");
  if (!Array.isArray(toolPlan.restricted_tools)) errors.push("restricted_tools_invalid");
  if (!Array.isArray(toolPlan.missing_inputs)) errors.push("missing_inputs_aggregate_invalid");
  else {
    for (const input of toolPlan.missing_inputs) {
      if (!KNOWN_INPUT_KEYS.includes(input)) {
        errors.push(`required_input_unknown:aggregate:${input}`);
      }
    }
  }
  if (typeof toolPlan.can_execute !== "boolean") errors.push("can_execute_invalid");
  if (toolPlan.can_execute_all !== undefined && typeof toolPlan.can_execute_all !== "boolean") {
    errors.push("can_execute_all_invalid");
  }
  if (typeof toolPlan.requires_clarification !== "boolean") {
    errors.push("requires_clarification_invalid");
  }

  // Coherence: can_execute implica al menos una tool executable y sin clarificación
  if (toolPlan.can_execute) {
    if (!toolPlan.executable_tools.length) errors.push("can_execute_without_executable_tools");
    if (toolPlan.requires_clarification) errors.push("can_execute_with_clarification");
  }

  if (toolPlan.can_execute_all === true) {
    if (!toolPlan.can_execute) errors.push("can_execute_all_without_can_execute");
    if (toolPlan.requires_clarification) errors.push("can_execute_all_with_clarification");
    if (!(toolPlan.tools || []).length) errors.push("can_execute_all_without_tools");
    if ((toolPlan.unavailable_tools || []).length) {
      errors.push("can_execute_all_with_unavailable_tools");
    }
    if ((toolPlan.restricted_tools || []).length) {
      errors.push("can_execute_all_with_restricted_tools");
    }
  }

  // executable_tools ⊆ tools where executable true
  if (Array.isArray(toolPlan.tools) && Array.isArray(toolPlan.executable_tools)) {
    const execSet = new Set(toolPlan.tools.filter((t) => t.executable).map((t) => t.tool_id));
    for (const id of toolPlan.executable_tools) {
      if (!execSet.has(id)) errors.push(`executable_tools_incoherent:${id}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} toolPlan
 * @returns {string}
 */
function buildDirectorIaToolPlanSummary(toolPlan) {
  if (!toolPlan || typeof toolPlan !== "object") return "Tool plan inválido";
  const toolIds = (toolPlan.tools || []).map((t) => t.tool_id).join(",");
  const parts = [
    `intent=${toolPlan.intent}`,
    `tools=${toolIds || "-"}`,
    `executable=${(toolPlan.executable_tools || []).join(",") || "-"}`,
    `unavailable=${(toolPlan.unavailable_tools || []).join(",") || "-"}`,
    `can_execute=${toolPlan.can_execute}`,
    `can_execute_all=${toolPlan.can_execute_all}`,
  ];
  if (toolPlan.requires_clarification) {
    parts.push(`clarification=${toolPlan.clarification_reason || "yes"}`);
  }
  if ((toolPlan.missing_inputs || []).length) {
    parts.push(`missing=${toolPlan.missing_inputs.join(",")}`);
  }
  return parts.join(" | ");
}

module.exports = {
  TOOL_PLAN_VERSION,
  KNOWN_INPUT_KEYS,
  buildDirectorIaToolPlan,
  validateDirectorIaToolPlan,
  buildDirectorIaToolPlanSummary,
};
