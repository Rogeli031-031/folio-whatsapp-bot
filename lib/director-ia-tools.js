"use strict";

/**
 * Director IA v2 — Fase 3: Tool Registry declarativo.
 * No ejecuta herramientas. No importa funciones de negocio.
 * Reutiliza el catálogo de capabilities (no lo duplica).
 */

const { getDirectorIaCapability } = require("./director-ia-capabilities");

/** Lista única de inputs permitidos (registry + orchestrator). */
const KNOWN_INPUT_KEYS = Object.freeze([
  "planta_id",
  "question",
  "year",
  "month",
  "user",
  "permissions",
  "folio_id",
  "entity",
]);

const KNOWN_INPUT_SET = new Set(KNOWN_INPUT_KEYS);

const TOOL_STATUS = Object.freeze({
  available: "available",
  available_on_demand: "available_on_demand",
  declared_not_integrated: "declared_not_integrated",
  restricted: "restricted",
  unknown: "unknown",
});

const TOOL_ACCESS_MODE = Object.freeze({
  always: "always",
  on_demand: "on_demand",
  related_data_only: "related_data_only",
  not_integrated: "not_integrated",
  restricted: "restricted",
});

/**
 * @param {string} key
 * @returns {boolean}
 */
function isKnownDirectorIaInputKey(key) {
  return KNOWN_INPUT_SET.has(String(key || ""));
}

/**
 * @param {string} toolId
 * @param {string[]} inputs
 * @returns {string[]} errores `required_input_unknown:<tool_id>:<input>`
 */
function validateKnownRequiredInputs(toolId, inputs) {
  const errors = [];
  const list = Array.isArray(inputs) ? inputs : [];
  const id = toolId || "unknown_tool";
  for (const input of list) {
    if (!isKnownDirectorIaInputKey(input)) {
      errors.push(`required_input_unknown:${id}:${input}`);
    }
  }
  return errors;
}

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   domain: string,
 *   status: string,
 *   accessMode: string,
 *   readOnly: boolean,
 *   executor: string | null,
 *   sourceFiles: string[],
 *   limitations: string,
 *   requiredInputs: string[],
 * }} DirectorIaTool
 */

/** @type {DirectorIaTool[]} */
const TOOLS = [
  {
    id: "get_action_register_context",
    label: "Contexto Action Register",
    domain: "action_register",
    status: TOOL_STATUS.available,
    accessMode: TOOL_ACCESS_MODE.always,
    readOnly: true,
    executor: "buildDirectorIaContextPayload",
    sourceFiles: ["lib/director-ia-context.js", "lib/director-ia-action-register.js", "lib/action-register-board.js"],
    limitations: "Resumen/top N; notas de revisión excluidas del context.",
    requiredInputs: ["planta_id"],
  },
  {
    id: "get_dicf_context",
    label: "Contexto DICF",
    domain: "dicf",
    status: TOOL_STATUS.available,
    accessMode: TOOL_ACCESS_MODE.always,
    readOnly: true,
    executor: "summarizeDicfContext",
    sourceFiles: ["lib/director-ia-action-register.js", "lib/dicf-acciones.js"],
    limitations: "Detalle limitado (~40); sin attachments.",
    requiredInputs: ["planta_id"],
  },
  {
    id: "get_bitacora_context",
    label: "Contexto Bitácora IA",
    domain: "bitacora",
    status: TOOL_STATUS.available,
    accessMode: TOOL_ACCESS_MODE.always,
    readOnly: true,
    executor: "loadBitacoraForChat",
    sourceFiles: ["lib/director-ia-bitacora.js", "lib/director-ia-context.js"],
    limitations: "Límite de sesiones en chat.",
    requiredInputs: ["planta_id"],
  },
  {
    id: "get_mejora_continua_context",
    label: "Contexto Mejora Continua",
    domain: "mejora_continua",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadMejoraContinuaForChat",
    sourceFiles: ["lib/director-ia-mejora-continua.js"],
    limitations: "Requiere year/month; activación por pregunta.",
    requiredInputs: ["planta_id", "year", "month"],
  },
  {
    id: "get_cliente_comentarios",
    label: "Comentarios de cliente",
    domain: "cliente_comentarios",
    status: TOOL_STATUS.available,
    accessMode: TOOL_ACCESS_MODE.always,
    readOnly: true,
    executor: "loadClienteComentariosForDirectorIa",
    sourceFiles: ["lib/cliente-comentarios.js"],
    limitations: "Últimos N comentarios.",
    requiredInputs: ["planta_id"],
  },
  {
    id: "get_folio_comentarios",
    label: "Comentarios de folio",
    domain: "folio_comentarios",
    status: TOOL_STATUS.available,
    accessMode: TOOL_ACCESS_MODE.always,
    readOnly: true,
    executor: "loadFolioComentariosForDirectorIa",
    sourceFiles: ["lib/cliente-comentarios.js"],
    limitations: "No incluye etapa ni historial operativo del folio.",
    requiredInputs: ["planta_id"],
  },
  {
    id: "resolve_entidades_comerciales",
    label: "Resolver entidades comerciales",
    domain: "entidades_comerciales",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "resolveCommercialEntitiesForQuestionFromPool",
    sourceFiles: ["lib/comercial-entidad.js"],
    limitations: "Depende del catálogo y del wording de la pregunta.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_arr_snapshot",
    label: "Snapshot ARR",
    domain: "arr",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadIgfArrAnnexForChat",
    sourceFiles: ["lib/director-ia-igf-arr.js", "lib/dashboard-arr-forecast.js"],
    limitations: "Anexo on-demand; no es la UI ARR completa.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_igf_snapshot",
    label: "Snapshot IGF",
    domain: "igf",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadIgfArrAnnexForChat",
    sourceFiles: ["lib/director-ia-igf-arr.js"],
    limitations: "Anexo on-demand; sources.igf no se marca en GET context.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_commercial_state",
    label: "Estado comercial",
    domain: "commercial_state",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadCommercialStateForChat",
    sourceFiles: ["lib/director-ia-commercial-state.js", "lib/dicf.js"],
    limitations: "On-demand; límite de clientes; GA restringido en runtime.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_folio_status",
    label: "Estado / etapa de folio",
    domain: "folios",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadFolioStatusForChat",
    sourceFiles: ["lib/director-ia-m2-folio-status.js"],
    limitations:
      "Read-only estatus/etapa; no historial, documentos ni autoavance; no usa GET /kanban ni GET /folios/:id.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_folio_history",
    label: "Historial de folio",
    domain: "folio_historial",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadFolioHistoryForChat",
    sourceFiles: ["lib/director-ia-m2-history.js"],
    limitations:
      "Read-only eventos de public.folio_historial; no documents, financial, autoavance ni dedupe; no usa GET /timeline.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_folio_documents",
    label: "Documentos de folio",
    domain: "documentos",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadFolioDocumentsMetadataForChat",
    sourceFiles: ["lib/director-ia-m2-documents-metadata.js"],
    limitations:
      "Solo metadata de registros existentes; no contenido, PDF, S3 ni URLs; no afirma documentos obligatorios.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_folio_financial_status",
    label: "Cheque / depósito / póliza",
    domain: "cheques",
    status: TOOL_STATUS.declared_not_integrated,
    accessMode: TOOL_ACCESS_MODE.not_integrated,
    readOnly: true,
    executor: null,
    sourceFiles: ["server.js"],
    limitations: "Datos operativos de folio no integrados.",
    requiredInputs: ["planta_id", "folio_id"],
  },
  {
    id: "get_budget_status",
    label: "Presupuesto semanal",
    domain: "presupuestos",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadPresupuestoSemanalForChat",
    sourceFiles: ["lib/director-ia-m18-presupuesto-semanal.js", "server.js"],
    limitations:
      "Query JSON del carro semanal; no writes; no cheques; no WhatsApp; no presupuesto_asignacion_detalle.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_project_status",
    label: "Estado de proyectos",
    domain: "proyectos",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadProyectosForChat",
    sourceFiles: ["lib/director-ia-m3-plantas-kpis-proyectos.js", "server.js"],
    limitations:
      "Listado read-only de public.proyectos por planta; no crea proyectos; no es Action Register.",
    requiredInputs: ["planta_id"],
  },
  {
    id: "get_dashboard_kpis",
    label: "KPIs de dashboard",
    domain: "dashboard_kpis",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadDashboardKpisForChat",
    sourceFiles: ["lib/director-ia-m3-plantas-kpis-proyectos.js", "server.js"],
    limitations:
      "Agregados de folios; no IGF/ARR; no afirma salud; GA/GV bloqueados.",
    requiredInputs: ["planta_id"],
  },
  {
    id: "get_expense_analysis",
    label: "Consulta de gastos de folios",
    domain: "gastos",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadGastosInversionesForChat",
    sourceFiles: ["lib/director-ia-m6-gastos-inversiones.js", "lib/categoria-rango-excel.js"],
    limitations:
      "Query JSON GASTOS; periodo YYYY-MM obligatorio; no Excel/Export; no Taller AT; no IGF.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_taller_at_analysis",
    label: "Análisis de Taller por AT",
    domain: "taller_at",
    status: TOOL_STATUS.declared_not_integrated,
    accessMode: TOOL_ACCESS_MODE.not_integrated,
    readOnly: true,
    executor: null,
    sourceFiles: ["lib/taller-at-excel.js"],
    limitations: "Excel Taller AT no integrado. Distinto de GASTOS de folios.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_investment_analysis",
    label: "Consulta de inversiones de folios",
    domain: "inversiones",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadGastosInversionesForChat",
    sourceFiles: ["lib/director-ia-m6-gastos-inversiones.js", "lib/categoria-rango-excel.js"],
    limitations: "Query JSON INVERSIONES; periodo YYYY-MM obligatorio; no Excel/Export; no IGF.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_clasificacion_apoyos_query",
    label: "Comparativo de clasificación de apoyos",
    domain: "clasificacion_apoyos",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadClasificacionApoyosForChat",
    sourceFiles: ["lib/director-ia-m4-clasificacion-query.js", "lib/clasificacion-apoyos-excel.js"],
    limitations:
      "Query JSON mes_a vs mes_b; no COMPARAR; no Excel/xlsx; no fallback global; no writes.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_delta_sales",
    label: "Delta Venta",
    domain: "delta_venta",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadDeltaVentaForChat",
    sourceFiles: ["lib/director-ia-m9-deltas.js", "server.js"],
    limitations:
      "Comparación kg de dos YYYY-MM; corte 80/20 de esta muestra; no es descuento ni ingreso; no IGF/ARR snapshot.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_delta_discount",
    label: "Delta Descuento",
    domain: "delta_descuento",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadDeltaDescuentoForChat",
    sourceFiles: ["lib/director-ia-m9-deltas.js", "server.js"],
    limitations:
      "Comparación $/kg de dos YYYY-MM; kg=0 → ratio 0 en la fuente; no es weekly LD ni venta.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_delta_income",
    label: "Delta Ingreso",
    domain: "delta_ingreso",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadDeltaIngresoForChat",
    sourceFiles: ["lib/director-ia-m9-deltas.js", "server.js"],
    limitations:
      "Modal de periodos reales; margen IGF solo como insumo de fórmula; no forecast con escritura; no M19.",
    requiredInputs: ["planta_id", "question"],
  },
  {
    id: "get_duplicate_folios",
    label: "Duplicados de folios",
    domain: "duplicados",
    status: TOOL_STATUS.available_on_demand,
    accessMode: TOOL_ACCESS_MODE.on_demand,
    readOnly: true,
    executor: "loadDuplicateFoliosForChat",
    sourceFiles: ["lib/director-ia-duplicados.js", "lib/folio-duplicados.js", "lib/folio-duplicados-load.js"],
    limitations: "Análisis heurístico de posibles pares; no confirma duplicados; no cancela.",
    requiredInputs: ["planta_id"],
  },
  {
    id: "get_user_permissions",
    label: "Usuarios y permisos admin",
    domain: "usuarios_admin",
    status: TOOL_STATUS.declared_not_integrated,
    accessMode: TOOL_ACCESS_MODE.not_integrated,
    readOnly: true,
    executor: null,
    sourceFiles: ["lib/usuario-permisos.js", "server.js"],
    limitations: "Administración de usuarios no integrada.",
    requiredInputs: ["user", "permissions"],
  },
];

/** Dominio del plan → tool ids (declarativo). */
const DOMAIN_TO_TOOLS = Object.freeze({
  action_register: ["get_action_register_context"],
  dicf: ["get_dicf_context"],
  bitacora: ["get_bitacora_context"],
  mejora_continua: ["get_mejora_continua_context"],
  cliente_comentarios: ["get_cliente_comentarios"],
  folio_comentarios: ["get_folio_comentarios"],
  entidades_comerciales: ["resolve_entidades_comerciales"],
  arr: ["get_arr_snapshot"],
  igf: ["get_igf_snapshot"],
  commercial_state: ["get_commercial_state"],
  folios: ["get_folio_status"],
  kanban: ["get_folio_status"],
  folio_historial: ["get_folio_history"],
  documentos: ["get_folio_documents"],
  cheques: ["get_folio_financial_status"],
  polizas: ["get_folio_financial_status"],
  presupuestos: ["get_budget_status"],
  proyectos: ["get_project_status"],
  dashboard_kpis: ["get_dashboard_kpis"],
  gastos: ["get_expense_analysis"],
  taller_at: ["get_taller_at_analysis"],
  inversiones: ["get_investment_analysis"],
  clasificacion_apoyos: ["get_clasificacion_apoyos_query"],
  delta_venta: ["get_delta_sales"],
  delta_descuento: ["get_delta_discount"],
  delta_ingreso: ["get_delta_income"],
  duplicados: ["get_duplicate_folios"],
  usuarios_admin: ["get_user_permissions"],
});

const TOOLS_BY_ID = Object.freeze(
  TOOLS.reduce((acc, t) => {
    acc[t.id] = Object.freeze({ ...t, sourceFiles: [...t.sourceFiles], requiredInputs: [...t.requiredInputs] });
    return acc;
  }, /** @type {Record<string, DirectorIaTool>} */ ({}))
);

/**
 * @param {string} toolId
 * @returns {DirectorIaTool | null}
 */
function getDirectorIaTool(toolId) {
  if (!toolId) return null;
  return TOOLS_BY_ID[String(toolId)] || null;
}

/**
 * @returns {DirectorIaTool[]}
 */
function listDirectorIaTools() {
  return TOOLS.map((t) => ({
    ...t,
    sourceFiles: [...t.sourceFiles],
    requiredInputs: [...t.requiredInputs],
  }));
}

/**
 * @param {string} domainId
 * @returns {DirectorIaTool[]}
 */
function listToolsForDomain(domainId) {
  const ids = DOMAIN_TO_TOOLS[domainId] || [];
  return ids.map((id) => getDirectorIaTool(id)).filter(Boolean);
}

/**
 * Ejecutable en el sentido del registry (declarativo): status usable + executor nombrado + readOnly.
 * No implica que se vaya a invocar en esta fase.
 * @param {string} toolId
 * @returns {boolean}
 */
function isDirectorIaToolExecutable(toolId) {
  const tool = getDirectorIaTool(toolId);
  if (!tool) return false;
  if (!tool.readOnly) return false;
  if (tool.executor == null || String(tool.executor).trim() === "") return false;
  return (
    tool.status === TOOL_STATUS.available || tool.status === TOOL_STATUS.available_on_demand
  );
}

/**
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateDirectorIaToolRegistry() {
  const errors = [];
  const seen = new Set();
  for (const tool of TOOLS) {
    if (seen.has(tool.id)) errors.push(`duplicate_tool:${tool.id}`);
    seen.add(tool.id);
    if (!TOOL_STATUS[tool.status] && !Object.values(TOOL_STATUS).includes(tool.status)) {
      errors.push(`status_invalid:${tool.id}`);
    }
    if (!Object.values(TOOL_ACCESS_MODE).includes(tool.accessMode)) {
      errors.push(`accessMode_invalid:${tool.id}`);
    }
    if (!getDirectorIaCapability(tool.domain)) {
      // get_folio_status uses domain "folios" but also covers kanban via mapping;
      // domain field must exist in capabilities.
      errors.push(`domain_unknown:${tool.id}:${tool.domain}`);
    }
    if (!Array.isArray(tool.requiredInputs)) errors.push(`requiredInputs_invalid:${tool.id}`);
    else errors.push(...validateKnownRequiredInputs(tool.id, tool.requiredInputs));
    if (!Array.isArray(tool.sourceFiles)) errors.push(`sourceFiles_invalid:${tool.id}`);
    if (typeof tool.readOnly !== "boolean") errors.push(`readOnly_invalid:${tool.id}`);
    if (tool.executor != null && typeof tool.executor !== "string") {
      errors.push(`executor_invalid:${tool.id}`);
    }
    if (
      (tool.status === TOOL_STATUS.available || tool.status === TOOL_STATUS.available_on_demand) &&
      !tool.executor
    ) {
      errors.push(`executor_missing_for_available:${tool.id}`);
    }
    if (tool.status === TOOL_STATUS.declared_not_integrated && tool.executor != null) {
      errors.push(`executor_unexpected_for_not_integrated:${tool.id}`);
    }
  }
  for (const [domain, toolIds] of Object.entries(DOMAIN_TO_TOOLS)) {
    if (!getDirectorIaCapability(domain)) {
      errors.push(`map_domain_unknown:${domain}`);
    }
    for (const id of toolIds) {
      if (!getDirectorIaTool(id)) errors.push(`map_tool_unknown:${domain}:${id}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

module.exports = {
  KNOWN_INPUT_KEYS,
  TOOL_STATUS,
  TOOL_ACCESS_MODE,
  DOMAIN_TO_TOOLS,
  isKnownDirectorIaInputKey,
  validateKnownRequiredInputs,
  getDirectorIaTool,
  listDirectorIaTools,
  listToolsForDomain,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
};
