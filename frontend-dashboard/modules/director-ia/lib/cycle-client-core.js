/**
 * Cliente dashboard del ciclo Director IA — lógica pura de request/response.
 * No es OP/EB/EKS/IES/RE/CP. No llama chat. No reintenta.
 */
"use strict";

const CYCLE_PATH = "/api/director-ia/cycle";
const CHAT_PATH = "/api/director-ia/chat";

const TRANSPORT = Object.freeze({
  idle: "idle",
  loading: "loading",
  completed: "completed",
  transport_error: "transport_error",
});

const FORBIDDEN_REQUEST_KEYS = Object.freeze([
  "plant_code",
  "trace_id",
  "query_context_metadata",
  "source",
  "raw_payload_reference",
  "content_author_id",
  "ies",
  "reasoning_result",
  "arr_cycle",
  "channel_output",
  "projectionDepth",
  "plan",
  "tool_plan",
]);

const EMPTY_FORBIDDEN_PHRASES = Object.freeze([
  "0 ventas",
  "sin ventas",
  "ausencia confirmada",
  "ABSENCE_CONFIRMED",
  "venta_ton = 0",
  '"venta_ton":0',
]);

function parsePositiveInt(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

function parseMonth(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 12) return null;
  return n;
}

function buildDirectorIaCycleRequestBody(input) {
  const src = input && typeof input === "object" ? input : {};
  const body = {};
  const plantaId = parsePositiveInt(src.planta_id);
  if (plantaId != null) body.planta_id = plantaId;
  const year = parsePositiveInt(src.year);
  if (year != null && src.year !== undefined && src.year !== null && src.year !== "") {
    body.year = year;
  }
  const month = parseMonth(src.month);
  if (month != null && src.month !== undefined && src.month !== null && src.month !== "") {
    body.month = month;
  }
  return body;
}

function pickSafeChannelOutput(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const blocks = Array.isArray(raw.content_blocks) ? raw.content_blocks : [];
  return {
    channel: raw.channel != null ? raw.channel : null,
    content_blocks: blocks.map((block) => ({
      sequence: block && block.sequence,
      block_kind: block && block.block_kind,
      semantic_type: block && block.semantic_type,
      content_class: block && block.content_class,
      statement_or_reference: block && block.statement_or_reference,
    })),
  };
}

function classifyOutcome(body) {
  const acquisition = body && body.acquisition_status ? String(body.acquisition_status) : null;
  const ies = body && body.ies_status ? String(body.ies_status) : null;
  const reasoning = body && body.reasoning_status ? String(body.reasoning_status) : null;
  const health = body && Array.isArray(body.source_health) ? body.source_health : [];
  const healthStatus = health[0] && health[0].execution_status ? String(health[0].execution_status) : null;

  if (acquisition === "TOOL_ERROR") return "TOOL_ERROR";
  if (acquisition === "ACQUIRED_EMPTY" || healthStatus === "DATA_NOT_FOUND") return "ACQUIRED_EMPTY";
  if (acquisition === "ENTITY_UNRESOLVED") return "ENTITY_UNRESOLVED";
  if (acquisition === "QUERY_SCOPE_INCOMPLETE") return "QUERY_SCOPE_INCOMPLETE";
  if (ies === "NO_KNOWLEDGE") return "NO_KNOWLEDGE";
  if (reasoning === "ABSTAIN") return "ABSTAIN";
  if (acquisition === "ACQUIRED_OK") return "ACQUIRED_OK";
  if (acquisition) return acquisition;
  return null;
}

function outcomeHeadline(kind) {
  switch (kind) {
    case "ACQUIRED_OK":
      return "Ciclo completado";
    case "ACQUIRED_EMPTY":
      return "Datos no encontrados para el alcance solicitado";
    case "ENTITY_UNRESOLVED":
      return "Entidad no resuelta";
    case "QUERY_SCOPE_INCOMPLETE":
      return "Alcance incompleto o parcial";
    case "ABSTAIN":
    case "NO_KNOWLEDGE":
      return "Abstención / sin conocimiento (resultado válido)";
    case "TOOL_ERROR":
      return "Fallo de servicio o fuente";
    case "INVALID_INPUT":
      return "La solicitud no es válida";
    case "AUTHORIZATION_FAILURE":
      return "Sin autorización";
    case "AUTHENTICATION_FAILURE":
      return "Sesión no válida";
    case "INTERNAL_ERROR":
      return "No se pudo completar la consulta";
    default:
      return "Resultado del ciclo";
  }
}

function outcomeDetail(kind) {
  switch (kind) {
    case "ACQUIRED_EMPTY":
      return "El ciclo terminó sin datos transportables para el alcance pedido. No confirma que no haya actividad.";
    case "ENTITY_UNRESOLVED":
      return "La planta solicitada no se resolvió en la fuente. No es un recurso inexistente de interfaz.";
    case "QUERY_SCOPE_INCOMPLETE":
      return "El ciclo se completó con alcance parcial o incompleto.";
    case "ABSTAIN":
    case "NO_KNOWLEDGE":
      return "El motor se abstuvo o no hay conocimiento suficiente. Es un resultado válido, no un error de red.";
    case "TOOL_ERROR":
      return "La fuente o un servicio upstream no respondió de forma usable.";
    default:
      return null;
  }
}

function safePublicFields(body) {
  const src = body && typeof body === "object" ? body : {};
  const coverage = src.knowledge_coverage && typeof src.knowledge_coverage === "object"
    ? {
        coverage_token: src.knowledge_coverage.coverage_token,
        partial_domains: src.knowledge_coverage.partial_domains,
        failed_tools: src.knowledge_coverage.failed_tools,
        unresolved_entities: src.knowledge_coverage.unresolved_entities,
        incomplete_scopes: src.knowledge_coverage.incomplete_scopes,
      }
    : null;
  const health = Array.isArray(src.source_health)
    ? src.source_health.map((row) => ({
        execution_status: row && row.execution_status,
        tool_id: row && row.tool_id,
      }))
    : null;
  return {
    acquisition_status: src.acquisition_status || null,
    ies_status: src.ies_status || null,
    reasoning_status: src.reasoning_status || null,
    knowledge_coverage: coverage,
    source_health: health,
    code: src.code || null,
  };
}

function interpretDirectorIaCycleResponse(httpStatus, json) {
  const body = json && typeof json === "object" && !Array.isArray(json) ? json : {};
  const publicFields = safePublicFields(body);
  const traceId = typeof body.trace_id === "string" && body.trace_id.trim() ? body.trace_id : null;
  const base = {
    httpStatus,
    trace_id: traceId,
    enabled: body.enabled,
    authFailure: false,
    authorizationFailure: false,
    channel_output: pickSafeChannelOutput(body.channel_output),
    ...publicFields,
  };

  if (httpStatus === 401) {
    return {
      ...base,
      transportState: TRANSPORT.transport_error,
      outcomeKind: "AUTHENTICATION_FAILURE",
      authFailure: true,
      headline: outcomeHeadline("AUTHENTICATION_FAILURE"),
      detail: typeof body.error === "string" ? body.error : "Token inválido o expirado",
    };
  }
  if (httpStatus === 403) {
    return {
      ...base,
      transportState: TRANSPORT.transport_error,
      outcomeKind: "AUTHORIZATION_FAILURE",
      authorizationFailure: true,
      headline: outcomeHeadline("AUTHORIZATION_FAILURE"),
      detail: typeof body.error === "string" ? body.error : "Sin acceso a esta planta",
    };
  }
  if (httpStatus === 400 || body.code === "INVALID_INPUT") {
    return {
      ...base,
      transportState: TRANSPORT.transport_error,
      outcomeKind: "INVALID_INPUT",
      headline: outcomeHeadline("INVALID_INPUT"),
      detail: typeof body.error === "string" ? body.error : "planta_id requerido",
    };
  }
  if (httpStatus === 502 || publicFields.acquisition_status === "TOOL_ERROR" || body.code === "TOOL_ERROR") {
    return {
      ...base,
      transportState: TRANSPORT.transport_error,
      outcomeKind: "TOOL_ERROR",
      headline: outcomeHeadline("TOOL_ERROR"),
      detail: outcomeDetail("TOOL_ERROR"),
    };
  }
  if (httpStatus >= 500) {
    return {
      ...base,
      transportState: TRANSPORT.transport_error,
      outcomeKind: "INTERNAL_ERROR",
      headline: outcomeHeadline("INTERNAL_ERROR"),
      detail: typeof body.error === "string" ? body.error : "Error interno",
    };
  }

  const outcomeKind = classifyOutcome(body);
  return {
    ...base,
    transportState: TRANSPORT.completed,
    outcomeKind,
    headline: outcomeHeadline(outcomeKind),
    detail: outcomeDetail(outcomeKind),
  };
}

async function executeDirectorIaCycleRequest(options) {
  const opts = options || {};
  const fetchImpl = opts.fetchImpl;
  if (typeof fetchImpl !== "function") {
    throw new Error("fetchImpl_required");
  }
  const token = opts.token != null ? String(opts.token) : "";
  const body = buildDirectorIaCycleRequestBody(opts.input);
  const url = opts.apiUrl || CYCLE_PATH;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  let json = {};
  try {
    json = await res.json();
  } catch (_err) {
    json = {};
  }
  return interpretDirectorIaCycleResponse(res.status, json);
}

function createDirectorIaCycleUiSession() {
  let transportState = TRANSPORT.idle;
  let inFlight = false;
  let interpreted = null;
  return {
    getSnapshot() {
      return { transportState, inFlight, interpreted };
    },
    canSubmit() {
      return !inFlight;
    },
    beginRequest() {
      if (inFlight) return false;
      inFlight = true;
      transportState = TRANSPORT.loading;
      return true;
    },
    finishRequest(result) {
      inFlight = false;
      interpreted = result || null;
      transportState = result && result.transportState ? result.transportState : TRANSPORT.transport_error;
    },
  };
}

module.exports = {
  CYCLE_PATH,
  CHAT_PATH,
  TRANSPORT,
  FORBIDDEN_REQUEST_KEYS,
  EMPTY_FORBIDDEN_PHRASES,
  buildDirectorIaCycleRequestBody,
  interpretDirectorIaCycleResponse,
  executeDirectorIaCycleRequest,
  createDirectorIaCycleUiSession,
  pickSafeChannelOutput,
  outcomeHeadline,
  outcomeDetail,
  classifyOutcome,
};
module.exports.default = module.exports;
