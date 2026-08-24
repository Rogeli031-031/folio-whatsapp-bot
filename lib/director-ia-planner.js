"use strict";

/**
 * Director IA v2 — Fase 2: Planner determinístico.
 * No consulta DB ni OpenAI. No gobierna el routing del chat (solo planifica).
 */

const {
  getDirectorIaCapability,
  isDirectorIaDomainReadable,
  detectUnsupportedDirectorIaDomain,
  isM4ClasificacionQuery,
  isM5TallerAtQuery,
  normalizeQuestionForCapabilities,
} = require("./director-ia-capabilities");
const { isExpedienteComercialQuestion } = require("./director-ia-m11-commercial-dossier");
const { ACCION_TOKEN_RE, hasProperPersonSpan } = require("./director-ia-action-person");
const { isIgfReviewableSupportsQuestion } = require("./director-ia-igf-reviewable-supports");
const { isDailyExecutiveBriefQuestion } = require("./director-ia-daily-executive-brief");
const { isCommercialTrendQuestion } = require("./director-ia-commercial-trend");

const PLAN_VERSION = "1.0";

/** @type {Record<string, string>} */
const INTENT_LABELS = Object.freeze({
  smalltalk: "Saludo / conversación breve",
  help: "Ayuda / qué puede hacer",
  action_status: "Estado de acciones (Action Register)",
  overdue_actions: "Acciones vencidas",
  responsible_lookup: "Responsable de acción / tema",
  revision_notes: "Notas de revisión Action Register",
  plant_diagnosis: "Diagnóstico de planta",
  commercial_state: "Estado comercial (listas DICF)",
  expediente_comercial: "Expediente comercial factual",
  client_analysis: "Análisis de cliente",
  arr_status: "Estado ARR",
  igf_status: "Estado IGF",
  financial_diagnosis: "Diagnóstico financiero",
  daily_sales_deviation: "Desviación diaria de venta",
  daily_discount_deviation: "Desviación diaria de descuento/kg",
  daily_executive_brief: "Brief ejecutivo diario",
  commercial_trend: "Tendencia comercial 30/90 CASA/COMISIONISTA",
  bitacora_lookup: "Consulta de bitácora",
  mejora_continua: "Mejora Continua",
  folio_status: "Etapa / estatus de folio",
  folio_history: "Historial de folio",
  folio_documents: "Documentos de folio",
  folio_financial_status: "Cheque / depósito / póliza de folio",
  budget_status: "Presupuesto semanal",
  project_status: "Proyectos",
  dashboard_kpis: "KPIs de dashboard",
  expense_analysis: "Gastos de folios",
  investment_analysis: "Inversiones de folios",
  clasificacion_apoyos_query: "Clasificación de apoyos (comparativo)",
  igf_reviewable_supports: "Apoyos reviewable / contrafactual IGF",
  taller_at: "Taller por AT",
  delta_sales: "Delta venta",
  delta_discount: "Delta descuento",
  delta_income: "Delta ingreso",
  duplicate_folios: "Folios duplicados",
  user_permissions: "Usuarios y permisos",
  unknown: "Intención no determinada",
});

/** Mapeo intent → dominios (catálogo capabilities). */
const INTENT_DOMAIN_MAP = Object.freeze({
  smalltalk: [],
  help: [],
  action_status: ["action_register"],
  overdue_actions: ["action_register"],
  responsible_lookup: ["action_register"],
  revision_notes: ["revision_notes"],
  plant_diagnosis: ["action_register", "dicf", "bitacora", "arr", "igf", "commercial_state"],
  commercial_state: ["commercial_state", "dicf", "entidades_comerciales"],
  expediente_comercial: ["commercial_dossier"],
  client_analysis: ["dicf", "cliente_comentarios", "bitacora", "entidades_comerciales", "arr"],
  arr_status: ["arr"],
  igf_status: ["igf"],
  financial_diagnosis: ["arr", "igf", "delta_venta", "delta_descuento", "delta_ingreso"],
  daily_sales_deviation: ["arr", "dicf", "cliente_comentarios"],
  daily_discount_deviation: ["arr", "dicf", "cliente_comentarios"],
  daily_executive_brief: ["arr", "dicf", "cliente_comentarios"],
  commercial_trend: ["arr"],
  bitacora_lookup: ["bitacora"],
  mejora_continua: ["mejora_continua", "action_register"],
  folio_status: ["folios", "kanban"],
  folio_history: ["folio_historial", "folios"],
  folio_documents: ["documentos", "folios"],
  folio_financial_status: ["folios", "cheques", "polizas"],
  budget_status: ["presupuestos", "folios"],
  project_status: ["proyectos", "action_register"],
  dashboard_kpis: ["dashboard_kpis"],
  expense_analysis: ["gastos", "folios"],
  investment_analysis: ["inversiones", "folios"],
  clasificacion_apoyos_query: ["clasificacion_apoyos"],
  igf_reviewable_supports: ["folios", "igf"],
  taller_at: ["taller_at"],
  delta_sales: ["delta_venta"],
  delta_discount: ["delta_descuento"],
  delta_income: ["delta_ingreso"],
  duplicate_folios: ["duplicados", "folios"],
  user_permissions: ["usuarios_admin"],
  unknown: [],
});

const AR_TEMAS_RE =
  /\b(mantenimiento|seguridad|calidad|taller|mejora\s+continua|medio\s+ambiente|ambiente|produccion|logistica)\b/i;

function namesDailySalesMetric(q) {
  return /\bventas?\b/.test(q) || /\bvendimos\b/.test(q) || /\bvendio\b/.test(q) || /\bvendi\b/.test(q);
}

function namesDailyDiscountMetric(q) {
  return /\bdescuentos?\b/.test(q);
}

function isDailySalesDeviationQuestion(q) {
  if (!/\bayer\b/.test(q)) return false;
  if (namesDailyDiscountMetric(q) && !namesDailySalesMetric(q)) return false;
  return namesDailySalesMetric(q);
}

function isDailyDiscountDeviationQuestion(q) {
  if (!/\bayer\b/.test(q)) return false;
  if (!namesDailyDiscountMetric(q)) return false;
  if (isDailySalesDeviationQuestion(q)) return false;
  return true;
}

/**
 * @typedef {{ type: "rule", value: string }} PlanEvidence
 * @typedef {{
 *   intent: string,
 *   intent_label: string,
 *   confidence: number,
 *   evidence: PlanEvidence[],
 *   requires_clarification?: boolean,
 *   clarification_reason?: string | null,
 *   domain_override?: string[] | null,
 * }} DetectedIntent
 */

function normalizeQuestion(raw) {
  if (typeof normalizeQuestionForCapabilities === "function") {
    return normalizeQuestionForCapabilities(raw);
  }
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function clampConfidence(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return Math.round(x * 1000) / 1000;
}

/**
 * @param {string} intent
 * @param {PlanEvidence[]} evidence
 * @param {number} confidence
 * @param {{ requires_clarification?: boolean, clarification_reason?: string | null, domain_override?: string[] | null }} [extra]
 * @returns {DetectedIntent}
 */
function makeIntent(intent, evidence, confidence, extra = {}) {
  return {
    intent,
    intent_label: INTENT_LABELS[intent] || intent,
    confidence: clampConfidence(confidence),
    evidence: evidence.map((e) => ({ type: "rule", value: String(e.value || e) })),
    requires_clarification: Boolean(extra.requires_clarification),
    clarification_reason: extra.clarification_reason != null ? extra.clarification_reason : null,
    domain_override: extra.domain_override || null,
  };
}

/**
 * Detección determinística de intent (prioridad: específico → general).
 * @param {string} question
 * @returns {DetectedIntent}
 */
function detectDirectorIaIntent(question) {
  const q = normalizeQuestion(question);
  if (!q) {
    return makeIntent("unknown", [{ value: "empty_question" }], 0.2, {
      requires_clarification: true,
      clarification_reason: "Pregunta vacía",
    });
  }

  // 1. smalltalk / help
  if (
    /^(ayuda|que puedes hacer|que puedo preguntarte|como me puedes ayudar|como puedes ayudarme|en que me puedes ayudar|que haces|para que sirves)$/.test(
      q
    )
  ) {
    return makeIntent("help", [{ value: "help_exact" }], 0.95);
  }
  if (
    /^(hola|hola director|hola director ia|buenos dias|buen dia|buenas tardes|buenas noches|que tal|saludos)$/.test(q) ||
    /^(gracias|muchas gracias|ok|okey|okay|entendido|vale|perfecto|de acuerdo|listo|muy bien)$/.test(q)
  ) {
    return makeIntent("smalltalk", [{ value: "smalltalk_exact" }], 0.95);
  }

  // Comentarios de folio (legible) — antes de folio_status
  if (
    /\bcomentarios?\b/.test(q) &&
    /\bfolio/.test(q) &&
    !/\b(etapa|estatus|historial|movimiento|documento|poliza|cheque|deposito)\b/.test(q)
  ) {
    return makeIntent(
      "client_analysis",
      [{ value: "folio_comentarios_readable" }],
      0.88,
      { domain_override: ["folio_comentarios"] }
    );
  }

  // Comentarios de cliente
  if (/\bcomentarios?\b/.test(q) && /\bclientes?\b/.test(q)) {
    return makeIntent("client_analysis", [{ value: "cliente_comentarios" }], 0.88, {
      domain_override: ["cliente_comentarios", "entidades_comerciales"],
    });
  }

  // 2. Folio específico
  if (
    (/\b(etapa|estatus)\b/.test(q) && /\bfolio/.test(q)) ||
    /\ben\s+que\s+(etapa|estatus|estado)\s+(esta|se\s+encuentra)\b/.test(q) ||
    /\bestado\s+(del|de\s+el)\s+folio\b/.test(q)
  ) {
    return makeIntent("folio_status", [{ value: "folio_etapa_estatus" }], 0.92);
  }
  if (
    /\bfolios?\b/.test(q) &&
    (/\b(tablero|kanban|listar|listado)\b/.test(q) ||
      /\bfolios?\s+en\s+(la\s+)?(etapa|carro|comprobaciones|evidencias|aprobacion)\b/.test(q)) &&
    !/\b(kpis?|activos|aging|duplicad|comentario|historial|documentos?|cheque|poliza|presupuesto|gastos?|inversiones?)\b/.test(
      q
    )
  ) {
    return makeIntent("folio_status", [{ value: "folio_listado_etapa" }], 0.86);
  }
  if (
    (/\b(ultimo|ultimos)\s+movimientos?\b/.test(q) && (/\bfolio/.test(q) || /\bhistorial\b/.test(q))) ||
    (/\bhistorial\b/.test(q) && /\bfolio/.test(q)) ||
    /\bquien\s+(movio|aprobo|avanzo|cambio)\s+(el\s+)?folio\b/.test(q)
  ) {
    return makeIntent("folio_history", [{ value: "folio_historial" }], 0.92);
  }
  if (typeof isIgfReviewableSupportsQuestion === "function" && isIgfReviewableSupportsQuestion(question)) {
    return makeIntent("igf_reviewable_supports", [{ value: "igf_reviewable_supports" }], 0.9);
  }

  if (
    (/\bdocumentos?\b/.test(q) || /\bdocumentales?\b/.test(q)) &&
    (/\bfalt/.test(q) ||
      /\badjunt/.test(q) ||
      /\bfolio/.test(q) ||
      /\b(listar|listado|tiene|tienen|registros?)\b/.test(q) ||
      /\bcotizacion\b/.test(q) ||
      /\bfacturas?\b/.test(q))
  ) {
    return makeIntent("folio_documents", [{ value: "folio_documentos" }], 0.9);
  }
  if (
    (/\bcheque\b/.test(q) || /\bpoliza\b/.test(q) || /\bpolizas\b/.test(q)) &&
    (/\bdeposito\b/.test(q) || /\bcheque\b/.test(q) || /\bpoliza\b/.test(q) || /\bfolio/.test(q) || /\btiene\b/.test(q))
  ) {
    // cheque y/o póliza / depósito operativo
    if (/\bcheque\b/.test(q) || /\bpoliza\b/.test(q) || (/\bdeposito\b/.test(q) && /\b(tiene|folio|cheque)\b/.test(q))) {
      return makeIntent("folio_financial_status", [{ value: "folio_cheque_poliza_deposito" }], 0.9);
    }
  }

  // 3. Usuarios / permisos
  if (
    (/\busuarios?\b/.test(q) && /\b(admin|permisos?|roles?)\b/.test(q)) ||
    /\bpermisos?\s+(de\s+)?(el\s+)?usuarios?\b/.test(q) ||
    /\bque\s+permisos?\s+tiene\b/.test(q) ||
    /\bcambiar\s+permisos?\b/.test(q) ||
    /\badministracion\s+de\s+usuarios?\b/.test(q)
  ) {
    return makeIntent("user_permissions", [{ value: "usuarios_permisos" }], 0.9);
  }

  // 4. Presupuestos / proyectos / gastos / inversiones / duplicados
  if (
    /\bpresupuesto\s+semanal\b/.test(q) ||
    /\bmi\s+presupuesto\b/.test(q) ||
    (/\bpresupuesto\b/.test(q) && /\b(semana|semanal|carro|carrito)\b/.test(q))
  ) {
    return makeIntent("budget_status", [{ value: "presupuesto_semanal" }], 0.9);
  }

  if (/\bproyectos?\b/.test(q)) {
    const withArTema = AR_TEMAS_RE.test(q);
    if (
      withArTema ||
      (/\bproyectos?\b/.test(q) && /\b(de\s+)?(mantenimiento|seguridad|calidad|taller)\b/.test(q))
    ) {
      return makeIntent("project_status", [{ value: "proyectos_vs_action_register" }], 0.5, {
        requires_clarification: true,
        clarification_reason:
          "No se distingue si 'proyectos' se refiere al módulo Proyectos o a acciones/temas de Action Register",
      });
    }
    if (
      /\b(retrasad|pendient|atrasad|como\s+van|estado|avance)\b/.test(q) ||
      /\bque\s+proyectos?\b/.test(q) ||
      /\bproyectos?\s+(por|de\s+la|en)\s+planta\b/.test(q) ||
      /\blistar\s+proyectos?\b/.test(q) ||
      /\bproyectos?\s+en\s+curso\b/.test(q) ||
      /\bmodulo\s+proyectos?\b/.test(q)
    ) {
      return makeIntent("project_status", [{ value: "proyectos_modulo" }], 0.86);
    }
  }

  if (
    (/\bkpis?\b/.test(q) &&
      (/\bdashboard\b/.test(q) ||
        /\bkanban\b/.test(q) ||
        /\bheader\b/.test(q) ||
        /\bfolios?\b/.test(q) ||
        /\baging\b/.test(q) ||
        /\bactivos\b/.test(q) ||
        /\bcomprometid/.test(q))) ||
    /\bfolios?\s+activos\b/.test(q) ||
    /\bpendientes?\s+(de\s+)?(aprobacion\s+)?zp\b/.test(q) ||
    /\baging\s+promedio\b/.test(q)
  ) {
    if (!/\b(igf|arr|margen|rentabilidad|descuento|utilidad)\b/.test(q)) {
      return makeIntent("dashboard_kpis", [{ value: "dashboard_kpis_folios" }], 0.88);
    }
  }

  if (
    /\bduplicad/.test(q) &&
    (/\bfolio/.test(q) || /\bexisten\b/.test(q) || /\bhay\b/.test(q) || /\banaliz/.test(q) || /\bposible/.test(q))
  ) {
    return makeIntent("duplicate_folios", [{ value: "folios_duplicados" }], 0.9);
  }

  if (typeof isM4ClasificacionQuery === "function" && isM4ClasificacionQuery(q)) {
    return makeIntent("clasificacion_apoyos_query", [{ value: "clasificacion_matriz" }], 0.9);
  }

  if (
    !/\b(excel|xlsx|export|descarg)\b/.test(q) &&
    !/\b(igf|margen|rentabilidad)\b/.test(q) &&
    ((/\bgastos?\b/.test(q) && /\b(folio|categoria|listad|rango\s+de\s+meses)\b/.test(q)) ||
      /\bgastos?\s+(de\s+)?folios?\b/.test(q) ||
      /\bfolios?\s+de\s+gastos?\b/.test(q))
  ) {
    return makeIntent("expense_analysis", [{ value: "gastos_folios" }], 0.88);
  }

  // Gastos ambiguos (KPI IGF vs categoría folios)
  if (
    /\bgastos?\b/.test(q) &&
    !/\bfolio/.test(q) &&
    !/\bexcel\b/.test(q) &&
    !/\bcategoria\b/.test(q) &&
    (/\bcomo\s+van?\b/.test(q) || /\bde\s+la\s+planta\b/.test(q) || /\bkpi\b/.test(q) || /\brentabilidad\b/.test(q))
  ) {
    return makeIntent("financial_diagnosis", [{ value: "gastos_ambiguous_kpi_vs_folios" }], 0.48, {
      requires_clarification: true,
      clarification_reason:
        "'Gastos' puede referirse al KPI financiero (IGF/ARR) o a la categoría de folios GASTOS",
    });
  }

  if (
    !/\b(excel|xlsx|export|descarg)\b/.test(q) &&
    /\binversiones?\b/.test(q) &&
    (/\b(pendient|folio|categoria|listad|hay|existen|estan)\b/.test(q) ||
      /\bque\s+inversiones?\b/.test(q))
  ) {
    return makeIntent("investment_analysis", [{ value: "inversiones_folios" }], 0.88);
  }

  if (typeof isM5TallerAtQuery === "function" && isM5TallerAtQuery(q)) {
    return makeIntent("taller_at", [{ value: "taller_at_unidad" }], 0.9);
  }

  // 5. Mejora continua
  if (/\bmejora\s+continua\b/.test(q) || /\b\bmc\b/.test(q) && /\b(area|mes|estatus|acciones)\b/.test(q)) {
    return makeIntent("mejora_continua", [{ value: "mejora_continua" }], 0.88);
  }

  // 6. ARR / IGF / deltas
  if (isDailySalesDeviationQuestion(q)) {
    return makeIntent("daily_sales_deviation", [{ value: "venta_ayer" }], 0.92);
  }
  if (isDailyDiscountDeviationQuestion(q)) {
    return makeIntent("daily_discount_deviation", [{ value: "descuento_ayer" }], 0.92);
  }
  if (isDailyExecutiveBriefQuestion(q)) {
    return makeIntent("daily_executive_brief", [{ value: "daily_overview" }], 0.9);
  }
  if (typeof isCommercialTrendQuestion === "function" && isCommercialTrendQuestion(question)) {
    return makeIntent("commercial_trend", [{ value: "commercial_trend_range_channel" }], 0.9);
  }
  if (/\barr\b/.test(q) && !/\bduplicad/.test(q) && !/\bdelta\b/.test(q)) {
    return makeIntent("arr_status", [{ value: "arr_keyword" }], 0.9);
  }
  if (/\bigf\b/.test(q) && !/\bdelta\b/.test(q)) {
    return makeIntent("igf_status", [{ value: "igf_keyword" }], 0.9);
  }

  if (
    (/\b(cambio|cambio|cambi[oó]|vario|variacion|delta)\b/.test(q) || /\bcomo\s+cambi/.test(q)) &&
    /\bventa\b/.test(q)
  ) {
    return makeIntent("delta_sales", [{ value: "delta_venta" }], 0.85);
  }
  if (
    (/\b(cambio|cambi|vario|variacion|delta)\b/.test(q) || /\bcomo\s+cambi/.test(q)) &&
    /\bdescuento\b/.test(q)
  ) {
    return makeIntent("delta_discount", [{ value: "delta_descuento" }], 0.85);
  }
  if (
    (/\b(cambio|cambi|vario|variacion|delta)\b/.test(q) || /\bcomo\s+cambi/.test(q)) &&
    /\bingreso\b/.test(q)
  ) {
    return makeIntent("delta_income", [{ value: "delta_ingreso" }], 0.85);
  }

  if (
    /\b(por\s+que|porque)\b/.test(q) &&
    /\b(cayo|caida|bajo|baj[oó]|disminuy|caer)\b/.test(q) &&
    /\b(ingreso|venta|margen|utilidad)\b/.test(q)
  ) {
    return makeIntent("financial_diagnosis", [{ value: "caida_ingreso_financiera" }], 0.9);
  }
  if (
    /\b(caida|cayo)\s+(de\s+)?(ingreso|venta|margen)\b/.test(q) ||
    /\bdiagnostico\s+financiero\b/.test(q) ||
    (/\bmargen\b/.test(q) && /\b(planta|comport|como\s+va|como\s+se)\b/.test(q))
  ) {
    return makeIntent("financial_diagnosis", [{ value: "diagnostico_financiero" }], 0.82);
  }

  // 7. commercial_state / client_analysis / bitácora
  if (/\bdejo\s+de\s+comprar\b/.test(q) && !/\bdejaron\s+de\s+comprar\b/.test(q)) {
    return makeIntent("plant_diagnosis", [{ value: "dejo_de_comprar_named" }], 0.84);
  }
  if (
    /\bdejaron\s+de\s+comprar\b/.test(q) ||
    /\bdisminuyeron\b/.test(q) ||
    (/\baumentaron\b/.test(q) && /\bclientes?\b/.test(q)) ||
    /\bclientes?\s+nuev/.test(q) ||
    /\bnuev[oa]s?\s+clientes?\b/.test(q)
  ) {
    return makeIntent("commercial_state", [{ value: "commercial_state_list" }], 0.92);
  }

  if (/\bbitacora\b/.test(q)) {
    if (/\bclientes?\b/.test(q) || /\bdel\s+cliente\b/.test(q) || /\bde\s+[a-z0-9]/.test(q)) {
      // "bitácora del cliente X" → client_analysis
      if (/\bclientes?\b/.test(q) || /\bdel\s+cliente\b/.test(q)) {
        return makeIntent("client_analysis", [{ value: "bitacora_con_cliente" }], 0.86, {
          domain_override: ["bitacora", "dicf", "cliente_comentarios", "entidades_comerciales"],
        });
      }
    }
    return makeIntent("bitacora_lookup", [{ value: "bitacora_lookup" }], 0.88);
  }

  if (isExpedienteComercialQuestion(question)) {
    return makeIntent("expediente_comercial", [{ value: "expediente_comercial" }], 0.92);
  }

  if (
    (/\bclientes?\b/.test(q) &&
      (/\b(analisis|explica|desviacion|oportunidad|dicf|compromiso|seguimiento)\b/.test(q) ||
        /\bque\s+paso\s+con\b/.test(q))) ||
    (/\bdicf\b/.test(q) && /\b(cliente|accion|historial|cierre)\b/.test(q))
  ) {
    return makeIntent("client_analysis", [{ value: "client_analysis" }], 0.8);
  }

  // 8. Action Register
  if (
    !/\b(plaud|bitacora|transcrip)\b/.test(q) &&
    !(/\bcomentarios?\b/.test(q) && /\bfolio\b/.test(q)) &&
    ((/\bnotas?\b/.test(q) && /\brevision/.test(q)) ||
      /\bcomentarios?\s+del\s+dia\b/.test(q) ||
      (/\bque\s+se\s+(escribio|acordo)\b/.test(q) && /\brevision/.test(q)) ||
      (/\bminuta\b/.test(q) && /\b(revision|action\s+register|register)\b/.test(q)))
  ) {
    return makeIntent("revision_notes", [{ value: "revision_notes" }], 0.92);
  }
  if (ACCION_TOKEN_RE.test(q) && /\b(vencid|atrasad|overdue)/.test(q) && !hasProperPersonSpan(question)) {
    return makeIntent("overdue_actions", [{ value: "acciones_vencidas" }], 0.93);
  }
  if (ACCION_TOKEN_RE.test(q) && /\b(?:at|pt|s|c|u)[-\s]?\d{1,4}\b/.test(q) && !/\btaller\b/.test(q)) {
    return makeIntent("action_status", [{ value: "acciones_token_unidad" }], 0.86);
  }
  if (
    /\b(quien|qui[eé]n)\s+(es\s+)?(el\s+)?responsable\b/.test(q) ||
    (/\bresponsable\b/.test(q) && (/\bde\b/.test(q) || AR_TEMAS_RE.test(q) || /\baccion/.test(q)))
  ) {
    return makeIntent("responsible_lookup", [{ value: "responsable_lookup" }], 0.88);
  }
  // "Cómo va Taller/Mantenimiento" → AR (no Taller AT)
  if (
    /\bcomo\s+va\b/.test(q) &&
    AR_TEMAS_RE.test(q) &&
    !/\btaller\s+por\s+at\b/.test(q) &&
    !/\bunidad\b/.test(q)
  ) {
    return makeIntent("action_status", [{ value: "como_va_tema_ar" }], 0.86);
  }
  if (ACCION_TOKEN_RE.test(q) && hasProperPersonSpan(question)) {
    return makeIntent("action_status", [{ value: "action_status_responsable" }], 0.86);
  }
  if (
    ACCION_TOKEN_RE.test(q) &&
    /\b(abiert|pendient|estado|tema|register)\b/.test(q)
  ) {
    return makeIntent("action_status", [{ value: "action_status" }], 0.8);
  }
  if (/\b(vencid|atrasad|overdue)/.test(q) && hasProperPersonSpan(question)) {
    return makeIntent("action_status", [{ value: "action_status_responsable_vencido" }], 0.8);
  }

  // 9. Diagnóstico general de planta
  if (
    /\bcomo\s+va\s+(la\s+)?planta\b/.test(q) ||
    /\bdiagnostico\s+(de\s+)?(la\s+)?planta\b/.test(q) ||
    /\briesgos?\s+(tiene|de|en)\s+(la\s+)?planta\b/.test(q) ||
    /\bcomo\s+estamos\s+(en\s+)?(la\s+)?planta\b/.test(q) ||
    (/\bcomo\s+va\s+[a-z]{3,}\b/.test(q) &&
      !AR_TEMAS_RE.test(q) &&
      !/\b(arr|igf|presupuesto|venta|descuento|ingreso|folio|cliente|accion)\b/.test(q))
  ) {
    return makeIntent("plant_diagnosis", [{ value: "plant_diagnosis" }], 0.84);
  }

  // Estado ambiguo
  if (
    /^(estado|como\s+esta|como\s+vamos|como\s+van)$/.test(q) ||
    (/\bestado\b/.test(q) &&
      !/\b(folio|accion|cliente|planta|dicf|arr|igf)\b/.test(q) &&
      q.length < 40)
  ) {
    return makeIntent("unknown", [{ value: "estado_ambiguous" }], 0.4, {
      requires_clarification: true,
      clarification_reason:
        "'Estado' no indica si se refiere a planta, acción, cliente o folio",
    });
  }

  // 10. unknown — intentar hint de capabilities unsupported
  const unsupported = detectUnsupportedDirectorIaDomain(question);
  if (unsupported) {
    const byDomain = {
      kanban: "folio_status",
      folio_historial: "folio_history",
      documentos: "folio_documents",
      cheques: "folio_financial_status",
      polizas: "folio_financial_status",
      presupuestos: "budget_status",
      proyectos: "project_status",
      gastos: "expense_analysis",
      inversiones: "investment_analysis",
      duplicados: "duplicate_folios",
      usuarios_admin: "user_permissions",
      taller_at: "taller_at",
    };
    const mapped = byDomain[unsupported.id];
    if (mapped) {
      return makeIntent(mapped, [{ value: `capabilities_unsupported:${unsupported.id}` }], 0.75);
    }
  }

  return makeIntent("unknown", [{ value: "no_rule_matched" }], 0.35, {
    requires_clarification: true,
    clarification_reason: "No se pudo determinar una intención clara con las reglas actuales",
  });
}

/**
 * @param {string} intent
 * @param {string} [question]
 * @returns {string[]}
 */
function resolveDomainsForIntent(intent, question) {
  const detected =
    question != null && String(question).trim()
      ? detectDirectorIaIntent(question)
      : null;

  if (detected && detected.intent === intent && Array.isArray(detected.domain_override) && detected.domain_override.length) {
    return uniq(detected.domain_override);
  }

  const base = INTENT_DOMAIN_MAP[intent];
  if (!base) return [];
  return uniq(base);
}

/**
 * @param {object} plan
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateDirectorIaPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== "object") {
    return { ok: false, errors: ["plan_missing"] };
  }
  if (plan.version !== PLAN_VERSION) errors.push("version_invalid");
  if (!plan.intent || !INTENT_LABELS[plan.intent]) errors.push("intent_unknown");
  if (typeof plan.confidence !== "number" || plan.confidence < 0 || plan.confidence > 1) {
    errors.push("confidence_out_of_range");
  }
  if (!Array.isArray(plan.domains)) errors.push("domains_not_array");
  else {
    if (new Set(plan.domains).size !== plan.domains.length) errors.push("domains_duplicated");
    for (const d of plan.domains) {
      if (!getDirectorIaCapability(d)) errors.push(`domain_unknown:${d}`);
    }
  }
  for (const key of [
    "available_domains",
    "partial_domains",
    "unavailable_domains",
    "restricted_domains",
  ]) {
    if (!Array.isArray(plan[key])) errors.push(`${key}_not_array`);
  }
  if (!Array.isArray(plan.evidence)) errors.push("evidence_not_array");
  else {
    for (const e of plan.evidence) {
      if (!e || e.type !== "rule" || typeof e.value !== "string") {
        errors.push("evidence_invalid");
        break;
      }
    }
  }
  if (typeof plan.requires_clarification !== "boolean") errors.push("requires_clarification_invalid");

  // Coherencia con capabilities
  if (Array.isArray(plan.domains)) {
    for (const d of plan.domains) {
      const cap = getDirectorIaCapability(d);
      if (!cap) continue;
      if (cap.canRead && !plan.available_domains.includes(d)) {
        errors.push(`available_missing:${d}`);
      }
      if (
        (cap.coverage === "none" || cap.accessMode === "not_integrated") &&
        !plan.unavailable_domains.includes(d)
      ) {
        errors.push(`unavailable_missing:${d}`);
      }
      if (cap.coverage === "partial" && !plan.partial_domains.includes(d)) {
        errors.push(`partial_missing:${d}`);
      }
      if (cap.accessMode === "restricted" && !plan.restricted_domains.includes(d)) {
        errors.push(`restricted_missing:${d}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} plan
 * @returns {string}
 */
function buildDirectorIaPlanSummary(plan) {
  if (!plan || typeof plan !== "object") return "Plan inválido";
  const parts = [
    `intent=${plan.intent}`,
    `confidence=${plan.confidence}`,
    `domains=[${(plan.domains || []).join(", ")}]`,
    `available=[${(plan.available_domains || []).join(", ")}]`,
    `unavailable=[${(plan.unavailable_domains || []).join(", ")}]`,
  ];
  if (plan.requires_clarification) {
    parts.push(`clarification=${plan.clarification_reason || "yes"}`);
  }
  return parts.join(" | ");
}

/**
 * @param {string} question
 * @param {{ forceIntent?: string, inheritParentIntent?: string }} [options]
 */
function planDirectorIaQuestion(question, options = {}) {
  const detected = options.forceIntent
    ? makeIntent(options.forceIntent, [{ value: "forceIntent" }], 1)
    : detectDirectorIaIntent(question);

  const inheritParent =
    !options.forceIntent &&
    options.inheritParentIntent &&
    INTENT_DOMAIN_MAP[options.inheritParentIntent] &&
    detected.intent === "unknown";

  let intent = detected.intent;
  if (options.forceIntent && INTENT_DOMAIN_MAP[options.forceIntent]) {
    intent = options.forceIntent;
  } else if (inheritParent) {
    intent = options.inheritParentIntent;
  }

  let domains = resolveDomainsForIntent(intent, question);
  if (detected.domain_override && detected.domain_override.length && !options.forceIntent) {
    domains = uniq(detected.domain_override);
  }

  // Asegurar que todos existen; filtrar desconocidos
  domains = uniq(domains.filter((d) => getDirectorIaCapability(d)));

  const available_domains = [];
  const partial_domains = [];
  const unavailable_domains = [];
  const restricted_domains = [];

  for (const d of domains) {
    const cap = getDirectorIaCapability(d);
    if (!cap) continue;
    if (cap.canRead) available_domains.push(d);
    if (cap.coverage === "partial") partial_domains.push(d);
    if (cap.coverage === "none" || cap.accessMode === "not_integrated") {
      unavailable_domains.push(d);
    }
    if (cap.accessMode === "restricted") restricted_domains.push(d);
  }

  let confidence = detected.confidence;
  let requires_clarification = Boolean(detected.requires_clarification);
  let clarification_reason = detected.clarification_reason || null;

  if (inheritParent) {
    confidence = Math.max(confidence, 0.8);
    requires_clarification = false;
    clarification_reason = null;
  }

  if (confidence < 0.55) {
    requires_clarification = true;
    if (!clarification_reason) {
      clarification_reason = "Confianza del intent por debajo de 0.55";
    }
  }

  const plan = {
    version: PLAN_VERSION,
    intent,
    intent_label: INTENT_LABELS[intent] || intent,
    domains,
    available_domains: uniq(available_domains),
    partial_domains: uniq(partial_domains),
    unavailable_domains: uniq(unavailable_domains),
    restricted_domains: uniq(restricted_domains),
    requires_clarification,
    clarification_reason,
    confidence: clampConfidence(confidence),
    evidence: [
      ...(detected.evidence || []).map((e) => ({ type: "rule", value: e.value })),
      ...(inheritParent ? [{ type: "rule", value: "inherit_parent_intent" }] : []),
    ],
  };

  return plan;
}

module.exports = {
  PLAN_VERSION,
  INTENT_LABELS,
  INTENT_DOMAIN_MAP,
  planDirectorIaQuestion,
  detectDirectorIaIntent,
  namesDailySalesMetric,
  namesDailyDiscountMetric,
  isDailyExecutiveBriefQuestion,
  isCommercialTrendQuestion,
  resolveDomainsForIntent,
  validateDirectorIaPlan,
  buildDirectorIaPlanSummary,
};
