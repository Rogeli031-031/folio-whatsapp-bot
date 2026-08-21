/**
 * Director IA — transporte dashboard no epistémico del ciclo real.
 * Autenticación/autorización ocurren en el handler Express (helpers existentes).
 * Este módulo mapea request autorizado → createDirectorIaRealCycle → HTTP product-safe.
 * No es OP, EB, EKS, IES, RE, CP, ARR, chat ni N1–N5.
 */
"use strict";

const crypto = require("crypto");
const { isDirectorIaEnabled } = require("./director-ia");
const { createDirectorIaRealCycle } = require("./director-ia-real-cycle");
const { createDirectorIaArrInput } = require("./director-ia-real-input-arr");
const { createObservationPipeline } = require("./director-ia-observation-pipeline");
const { createEvidenceBuilder } = require("./director-ia-evidence-builder");
const { createEks } = require("./director-ia-eks");
const { createIesBuilder } = require("./director-ia-ies-builder");
const { createReasoningEngine } = require("./director-ia-reasoning-engine");
const {
  createChannelProjection,
  createDefaultPolicyRegistry,
} = require("./director-ia-channel-projection");

const SLICE_INTENT = "arr_venta_ton";
const SLICE_QUESTION = "venta_ton";
const SLICE_CHANNEL = "dashboard";
const SLICE_TOOL = "get_arr_snapshot";
const PROJECTION_DEPTH = "L1_EXECUTIVE";
const TRIGGERED_BY = "dashboard_auth";
const EXECUTIVE_QUERY_ID = "eq_dashboard_arr_venta_ton";
const TRACE_PLACEHOLDER = "pending_arr_trace";
const ROUTE_PATH = "/api/director-ia/cycle";

const COVERAGE_KEYS = Object.freeze([
  "coverage_token",
  "partial_domains",
  "failed_tools",
  "unresolved_entities",
  "incomplete_scopes",
]);

const SUCCESS_ACQUISITION = Object.freeze({
  ACQUIRED_OK: true,
  ACQUIRED_EMPTY: true,
  DATA_NOT_FOUND: true,
  ENTITY_UNRESOLVED: true,
  QUERY_SCOPE_INCOMPLETE: true,
});

/** @type {Record<string, unknown>} */
let deps = {};

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function parsePlantaId(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

function parseOptionalYear(raw) {
  if (raw === undefined || raw === null || raw === "") return { present: false, value: null, invalid: false };
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    return { present: true, value: null, invalid: true };
  }
  return { present: true, value: n, invalid: false };
}

function parseOptionalMonth(raw) {
  if (raw === undefined || raw === null || raw === "") return { present: false, value: null, invalid: false };
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 12) {
    return { present: true, value: null, invalid: true };
  }
  return { present: true, value: n, invalid: false };
}

function periodToken(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function emitLog(logger, event, fields) {
  try {
    if (!logger) return;
    const payload = { event, ...fields };
    if (typeof logger === "function") {
      logger(payload);
      return;
    }
    if (typeof logger.info === "function") {
      logger.info(payload);
      return;
    }
    if (typeof logger.log === "function") {
      logger.log(payload);
    }
  } catch (_err) {
    /* logging must not mutate cognitive/transport result */
  }
}

function failClosedModelAdapter() {
  return {
    infer(request) {
      const ies = request && request.reasoning_context && request.reasoning_context.ies;
      const iesId = ies && ies.ies_id ? ies.ies_id : null;
      return {
        candidate_reasoning_result: {
          interpretation: {
            what_is_known: { references: [] },
            what_can_be_inferred: { references: [] },
            what_cannot_be_concluded: { references: [] },
          },
          hypotheses: [],
          recommendations: [],
          next_verifications: [],
          decision_options: [],
          abstentions: [],
          clarification_requests: [],
          reasoning_limits: {},
          references: iesId ? [iesId] : [],
        },
        provider_metadata: {
          provider: "none",
          model: "fail_closed",
          model_version: "1",
          request_id: "none",
        },
      };
    },
  };
}

function createDefaultIdFactory() {
  let n = 0;
  return function idFactory(prefix) {
    n += 1;
    return `${String(prefix || "id")}_${n}_${crypto.randomUUID()}`;
  };
}

function defaultClock() {
  return new Date().toISOString();
}

function composeDirectorIaDashboardRealCycle(options) {
  const opts = options || {};
  if (!opts.arrSource || (typeof opts.arrSource !== "function" && typeof opts.arrSource.execute !== "function")) {
    const err = new Error("arrSource_required");
    err.code = "INVALID_DEPENDENCIES";
    throw err;
  }
  const clock = typeof opts.clock === "function" ? opts.clock : defaultClock;
  const idFactory = typeof opts.idFactory === "function" ? opts.idFactory : createDefaultIdFactory();
  const eks = opts.eks || createEks();
  const arrInput = createDirectorIaArrInput({
    arrSource: opts.arrSource,
    observationPipeline: createObservationPipeline({ clock, idFactory }),
    evidenceBuilder: createEvidenceBuilder({ produced_at: clock(), idFactory }),
    eks,
    clock,
    idFactory,
  });
  return createDirectorIaRealCycle({
    arrInput,
    iesBuilder: createIesBuilder({ clock, idFactory }),
    reasoningEngine: createReasoningEngine({
      modelAdapter: opts.modelAdapter || failClosedModelAdapter(),
      clock,
      idFactory,
    }),
    channelProjection: createChannelProjection({
      policyRegistry: createDefaultPolicyRegistry(),
      clock,
      idFactory,
    }),
    clock,
    idFactory,
  });
}

function createFailClosedPlantResolver(getPlantCodeArrFromPlantaNombre) {
  return async function resolvePlant(client, plantaId) {
    const r = await client.query(`SELECT nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
    const row = r.rows && r.rows[0];
    const plant_label = row ? String(row.nombre || row.clave || "").trim() || null : null;
    if (!plant_label || typeof getPlantCodeArrFromPlantaNombre !== "function") {
      return { plant_code: null, plant_label };
    }
    const mapped = await getPlantCodeArrFromPlantaNombre(client, plant_label);
    const code = mapped != null ? String(mapped).trim() : "";
    if (!code) return { plant_code: null, plant_label };
    const verify = await client.query(
      `SELECT plant_code FROM arr.provincia_plants WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1)) LIMIT 1`,
      [code]
    );
    const verified = verify.rows && verify.rows[0] && verify.rows[0].plant_code
      ? String(verify.rows[0].plant_code)
      : null;
    return { plant_code: verified, plant_label };
  };
}

function safeCoverage(ies) {
  const src = ies && isPlainObject(ies.knowledge_coverage) ? ies.knowledge_coverage : null;
  if (!src) return undefined;
  const out = {};
  for (const key of COVERAGE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(src, key)) out[key] = cloneJson(src[key]);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function safeSourceHealth(ies) {
  const list = ies && Array.isArray(ies.source_health) ? ies.source_health : null;
  if (!list) return undefined;
  return list.map((item) => {
    const row = {};
    if (item && item.execution_status != null) row.execution_status = item.execution_status;
    if (item && item.tool_id != null) row.tool_id = item.tool_id;
    return row;
  });
}

function acquisitionStatusOf(result) {
  const envelopes = result && result.arr_cycle && Array.isArray(result.arr_cycle.envelopes)
    ? result.arr_cycle.envelopes
    : [];
  const first = envelopes[0];
  return first && first.status ? String(first.status) : null;
}

function httpStatusForAcquisition(status) {
  if (status === "TOOL_ERROR") return 502;
  if (status && SUCCESS_ACQUISITION[status]) return 200;
  if (status === "INVALID_INPUT") return 400;
  return 200;
}

function productSafeBody(result, extras) {
  const acquisition_status = acquisitionStatusOf(result);
  const ies = result && result.ies;
  const body = {
    ok: extras.httpStatus < 400,
    enabled: true,
    trace_id: result && result.trace_id ? result.trace_id : null,
    acquisition_status,
    ies_status: ies && ies.status ? ies.status : null,
    reasoning_status: result && result.reasoning_run && result.reasoning_run.status
      ? result.reasoning_run.status
      : null,
    channel_output: result && result.channel_output ? cloneJson(result.channel_output) : null,
  };
  const coverage = safeCoverage(ies);
  if (coverage) body.knowledge_coverage = coverage;
  const health = safeSourceHealth(ies);
  if (health) body.source_health = health;
  if (extras.code) body.code = extras.code;
  return body;
}

function invalidInputResult(message) {
  return {
    httpStatus: 400,
    body: {
      ok: false,
      enabled: true,
      code: "INVALID_INPUT",
      error: message,
    },
    invokedCycle: false,
  };
}

function buildCycleInput(original, clock) {
  const plantaId = original.planta_id;
  const plantCode = isNonEmptyString(original.plant_code) ? String(original.plant_code).trim() : null;
  const plantLabel = isNonEmptyString(original.plant_label) ? String(original.plant_label).trim() : null;
  const year = original.year;
  const month = original.month;
  const resolvedState = plantCode ? "RESOLVED" : "UNRESOLVED";
  const entity = {
    entity_type: "planta",
    original_value: String(plantaId),
    resolution_state: resolvedState,
    candidates: [],
  };
  if (plantCode) entity.entity_id = plantCode;

  const metadata = {
    executive_query_id: EXECUTIVE_QUERY_ID,
    trace_id: TRACE_PLACEHOLDER,
    original_question: SLICE_QUESTION,
    intent: SLICE_INTENT,
    requesting_user_id: isNonEmptyString(original.requesting_user_id)
      ? String(original.requesting_user_id)
      : "dashboard_user",
    requesting_role: isNonEmptyString(original.requesting_role)
      ? String(original.requesting_role)
      : "unknown",
    channel: SLICE_CHANNEL,
    resolved_entities: [entity],
    permission_restrictions: [],
    knowledge_effective_date: clock(),
  };
  if (plantCode) metadata.plant_or_scope = plantCode;
  if (year != null && month != null) metadata.period = periodToken(year, month);

  const cycleInput = {
    planta_id: plantaId,
    year,
    month,
    triggered_by: TRIGGERED_BY,
    question: SLICE_QUESTION,
    plan: { intent: SLICE_INTENT, domains: ["arr"] },
    tool_plan: { tools: [SLICE_TOOL] },
    query_context_metadata: metadata,
    projectionDepth: PROJECTION_DEPTH,
    session: {},
  };
  if (plantCode) cycleInput.plant_code = plantCode;
  if (plantLabel) cycleInput.plant_label = plantLabel;
  if (Object.prototype.hasOwnProperty.call(original, "client")) {
    cycleInput.client = original.client;
  }
  return cycleInput;
}

function createDirectorIaDashboardCycleTransport(options) {
  const opts = options || {};
  if (!opts.realCycle || typeof opts.realCycle.run !== "function") {
    const err = new Error("realCycle.run_required");
    err.code = "INVALID_DEPENDENCIES";
    throw err;
  }
  const clock = typeof opts.clock === "function" ? opts.clock : defaultClock;
  const logger = opts.logger || null;

  async function handle(input) {
    const startedMs = Date.now();
    const original = isPlainObject(input) ? input : {};
    const plantaId = parsePlantaId(original.planta_id);
    const yearInfo = parseOptionalYear(original.year);
    const monthInfo = parseOptionalMonth(original.month);
    const requestId = crypto.randomUUID();

    emitLog(logger, "cycle_request_started", {
      request_id: requestId,
      trace_id: null,
      planta_id: plantaId,
    });

    if (plantaId === null) {
      const mapped = invalidInputResult("planta_id requerido");
      emitLog(logger, "cycle_request_failed", {
        request_id: requestId,
        trace_id: null,
        planta_id: plantaId,
        duration_ms: Date.now() - startedMs,
        http_status: 400,
        code: "INVALID_INPUT",
      });
      return mapped;
    }
    if (yearInfo.invalid || monthInfo.invalid) {
      const mapped = invalidInputResult("year o month inválido");
      emitLog(logger, "cycle_request_failed", {
        request_id: requestId,
        trace_id: null,
        planta_id: plantaId,
        duration_ms: Date.now() - startedMs,
        http_status: 400,
        code: "INVALID_INPUT",
      });
      return mapped;
    }

    const mappedInput = {
      planta_id: plantaId,
      requesting_user_id: original.requesting_user_id,
      requesting_role: original.requesting_role,
    };
    if (yearInfo.present) mappedInput.year = yearInfo.value;
    if (monthInfo.present) mappedInput.month = monthInfo.value;
    if (isNonEmptyString(original.plant_code)) mappedInput.plant_code = String(original.plant_code).trim();
    if (isNonEmptyString(original.plant_label)) mappedInput.plant_label = String(original.plant_label).trim();
    if (Object.prototype.hasOwnProperty.call(original, "client")) mappedInput.client = original.client;

    const cycleInput = buildCycleInput(mappedInput, clock);

    let result;
    try {
      result = await opts.realCycle.run(cycleInput);
    } catch (err) {
      const code = err && err.code ? String(err.code) : "INTERNAL_ERROR";
      const duration_ms = Date.now() - startedMs;
      if (code === "INVALID_INPUT") {
        emitLog(logger, "cycle_request_failed", {
          request_id: requestId,
          planta_id: plantaId,
          duration_ms,
          http_status: 400,
          code,
        });
        return invalidInputResult("petición inválida");
      }
      emitLog(logger, "cycle_request_failed", {
        request_id: requestId,
        planta_id: plantaId,
        duration_ms,
        http_status: 500,
        code: "INTERNAL_ERROR",
      });
      return {
        httpStatus: 500,
        body: { ok: false, enabled: true, error: "Error interno" },
        invokedCycle: true,
      };
    }

    const acquisition_status = acquisitionStatusOf(result);
    const httpStatus = httpStatusForAcquisition(acquisition_status);
    const extras = { httpStatus };
    if (acquisition_status === "TOOL_ERROR") extras.code = "TOOL_ERROR";
    if (acquisition_status === "INVALID_INPUT") extras.code = "INVALID_INPUT";
    const body = productSafeBody(result, extras);
    const duration_ms = Date.now() - startedMs;
    const logFields = {
      request_id: requestId,
      trace_id: result && result.trace_id ? result.trace_id : null,
      planta_id: plantaId,
      duration_ms,
      http_status: httpStatus,
      acquisition_status,
      ies_status: body.ies_status,
      reasoning_status: body.reasoning_status,
    };
    if (httpStatus >= 500) {
      emitLog(logger, "cycle_request_failed", { ...logFields, code: extras.code || "INTERNAL_ERROR" });
    } else {
      emitLog(logger, "cycle_request_completed", logFields);
    }
    return { httpStatus, body, invokedCycle: true };
  }

  return { handle };
}

function configureDirectorIaDashboardCycle(injected) {
  deps = { ...deps, ...injected };
  if (deps.realCycle && typeof deps.realCycle.run === "function") {
    deps.transport = createDirectorIaDashboardCycleTransport({
      realCycle: deps.realCycle,
      logger: deps.logger,
      clock: deps.clock,
    });
    return;
  }
  if (deps.arrSource) {
    deps.realCycle = composeDirectorIaDashboardRealCycle({
      arrSource: deps.arrSource,
      eks: deps.eks,
      clock: deps.clock,
      idFactory: deps.idFactory,
      modelAdapter: deps.modelAdapter,
    });
    deps.transport = createDirectorIaDashboardCycleTransport({
      realCycle: deps.realCycle,
      logger: deps.logger,
      clock: deps.clock,
    });
  }
  if (typeof deps.getPlantCodeArrFromPlantaNombre === "function" && typeof deps.resolvePlant !== "function") {
    deps.resolvePlant = createFailClosedPlantResolver(deps.getPlantCodeArrFromPlantaNombre);
  }
}

function resetDirectorIaDashboardCycleForTests() {
  deps = {};
}

async function handlePostDashboardCycle(req, res) {
  const isEnabled = typeof deps.isEnabled === "function" ? deps.isEnabled : isDirectorIaEnabled;
  if (!isEnabled()) {
    return res.status(200).json({ enabled: false });
  }

  const body = isPlainObject(req.body) ? req.body : {};
  const plantaId = parsePlantaId(body.planta_id);
  const yearInfo = parseOptionalYear(body.year);
  const monthInfo = parseOptionalMonth(body.month);

  if (plantaId === null) {
    return res.status(400).json({
      ok: false,
      enabled: true,
      code: "INVALID_INPUT",
      error: "planta_id requerido",
    });
  }
  if (yearInfo.invalid || monthInfo.invalid) {
    return res.status(400).json({
      ok: false,
      enabled: true,
      code: "INVALID_INPUT",
      error: "year o month inválido",
    });
  }

  if (typeof deps.blockGAFinancialKpis === "function") {
    if (deps.blockGAFinancialKpis(req, res)) return;
  }
  if (typeof deps.assertPlantaAccess === "function") {
    if (!deps.assertPlantaAccess(req, plantaId)) {
      return res.status(403).json({ error: "Sin acceso a esta planta" });
    }
  }

  if (!deps.transport || typeof deps.transport.handle !== "function") {
    return res.status(503).json({ ok: false, enabled: true, error: "Servicio no disponible" });
  }

  const auth = req.dashboardAuth || {};
  const mapped = {
    planta_id: plantaId,
    requesting_user_id: auth.actor_id != null ? String(auth.actor_id) : "dashboard_user",
    requesting_role: auth.role != null ? String(auth.role) : "unknown",
  };
  if (yearInfo.present) mapped.year = yearInfo.value;
  if (monthInfo.present) mapped.month = monthInfo.value;

  let client;
  try {
    if (typeof deps.resolvePlant === "function" || deps.pool) {
      if (!deps.pool || typeof deps.pool.connect !== "function") {
        return res.status(503).json({ ok: false, enabled: true, error: "Servicio no disponible" });
      }
      client = await deps.pool.connect();
      if (typeof deps.resolvePlant === "function") {
        const plant = await deps.resolvePlant(client, plantaId);
        if (plant && isNonEmptyString(plant.plant_code)) mapped.plant_code = String(plant.plant_code).trim();
        if (plant && isNonEmptyString(plant.plant_label)) mapped.plant_label = String(plant.plant_label).trim();
      }
      mapped.client = client;
    }

    const out = await deps.transport.handle(mapped);
    return res.status(out.httpStatus).json(out.body);
  } catch (_err) {
    return res.status(500).json({ ok: false, enabled: true, error: "Error interno" });
  } finally {
    if (client && typeof client.release === "function") client.release();
  }
}

module.exports = {
  createDirectorIaDashboardCycleTransport,
  composeDirectorIaDashboardRealCycle,
  createFailClosedPlantResolver,
  configureDirectorIaDashboardCycle,
  handlePostDashboardCycle,
  resetDirectorIaDashboardCycleForTests,
  ROUTE_PATH,
  SLICE_INTENT,
  SLICE_QUESTION,
  PROJECTION_DEPTH,
};
