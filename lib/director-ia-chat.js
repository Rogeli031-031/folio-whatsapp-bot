"use strict";

const axios = require("axios");
const { isDirectorIaEnabled } = require("./director-ia");
const { buildDirectorIaContextPayload } = require("./director-ia-context");
const {
  AREAS_MEJORA_CONTINUA,
  loadMejoraContinuaForChat,
  currentYearMonthCdmx,
} = require("./director-ia-mejora-continua");
const { ACTION_REGISTER_TEMAS } = require("./action-register-temas");
const {
  resolveCommercialEntitiesForQuestionFromPool,
} = require("./comercial-entidad");
const {
  configureDirectorIaCommercialState,
  isCommercialStateListQuestion,
  isDicfActionQuestion,
  resolveCommercialStateCategory,
  loadCommercialStateForChat,
  buildCommercialStateFocusedContext,
} = require("./director-ia-commercial-state");
const {
  shouldAttachIgfArrAnnex,
  loadIgfArrAnnexForChat,
  IGF_ARR_ANNEX_SYSTEM_ADDENDUM,
  isIgfForecastQuestion,
  isArrForecastQuestion,
  isPlantFinancialKpiQuestion,
} = require("./director-ia-igf-arr");
const { extractBitacoraExcerptForSearch } = require("./director-ia-bitacora");
const { buildComentariosAnnexText } = require("./cliente-comentarios");
const {
  detectUnsupportedDirectorIaDomain,
  buildUnsupportedDomainChatResult,
  getDirectorIaCapability,
} = require("./director-ia-capabilities");
const { planDirectorIaQuestion, detectDirectorIaIntent } = require("./director-ia-planner");
const {
  resolveConversationTurn,
  resolveUniqueEntity,
  collectEntityCandidatesFromEvidence,
  derivePendingInformationGap,
  buildConversationState,
  buildUnknownClarificationResult,
  buildEntityClarificationResult,
  prependHiloToUserContent,
  emptyConversationState,
  sanitizeForecastRun,
  carryActiveEntities,
  sanitizeActiveEntities,
  resolveOutgoingPreviousFrame,
  sanitizePreviousFrame,
  preserveFramesOnClarify,
  parkCurrentAndClear,
} = require("./director-ia-conversation-state");
const persistentMemory = require("./director-ia-persistent-memory");
const { buildDirectorIaToolPlan } = require("./director-ia-tool-orchestrator");
const {
  loadDuplicateFoliosForChat,
  buildDuplicateFoliosChatResult,
} = require("./director-ia-duplicados");
const {
  loadDashboardKpisForChat,
  loadProyectosForChat,
  buildDashboardKpisChatResult,
  buildProyectosChatResult,
  buildProjectStatusClarificationChatResult,
} = require("./director-ia-m3-plantas-kpis-proyectos");
const {
  loadDeltaVentaForChat,
  loadDeltaDescuentoForChat,
  loadDeltaIngresoForChat,
  buildDeltaVentaChatResult,
  buildDeltaDescuentoChatResult,
  buildDeltaIngresoChatResult,
} = require("./director-ia-m9-deltas");
const {
  loadFinancialDiagnosisForChat,
  buildFinancialDiagnosisPrompt,
  buildFinancialDiagnosisChatResult,
} = require("./director-ia-financial-diagnosis");
const {
  loadPlantDiagnosisForChat,
  buildPlantDiagnosisPrompt,
  buildPlantDiagnosisChatResult,
} = require("./director-ia-plant-diagnosis");
const {
  resolveExecutiveNeed,
  resolveSemanticScope,
  shouldHandleExecutiveStatus,
  loadPlantCatalog,
  buildExecutiveStatusPack,
  buildExecutiveStatusPrompt,
  applyExecutiveLanguageGuard,
  buildExecutiveStatusChatResult,
  buildScopeClarificationResult,
  buildSteeringFrontierResult,
  buildNeutralGreeting,
  isSteeringReadQuestion,
  formatForecastCutoffDateEs,
} = require("./director-ia-conversational-executive-layer");
const {
  loadDailySalesDeviationForChat,
  buildDailySalesDeviationPrompt,
  buildDailySalesDeviationChatResult,
} = require("./director-ia-daily-deviation");
const {
  loadDailyDiscountDeviationForChat,
  buildDailyDiscountDeviationPrompt,
  buildDailyDiscountDeviationChatResult,
} = require("./director-ia-daily-discount");
const {
  loadDailyExecutiveBriefForChat,
  buildDailyExecutiveBriefPrompt,
  buildDailyExecutiveBriefChatResult,
  deriveBriefPendingInformationGap,
} = require("./director-ia-daily-executive-brief");
const {
  loadCommercialTrendForChat,
  buildCommercialTrendPrompt,
  buildCommercialTrendChatResult,
  wantsFirstMover,
} = require("./director-ia-commercial-trend");
const {
  loadClientProfileForChat,
  buildClientProfilePrompt,
  buildClientProfileChatResult,
  deriveClientProfileGap,
} = require("./director-ia-client-profile");
const {
  loadTallerMayorForChat,
  buildTallerMayorPrompt,
  buildTallerMayorChatResult,
  deriveTallerMayorGap,
} = require("./director-ia-taller-mayor");
const {
  loadPreMeetingBriefForChat,
  buildPreMeetingPrompt,
  buildPreMeetingChatResult,
  derivePendingInformationGap: derivePreMeetingPendingGap,
} = require("./director-ia-pre-meeting");
const {
  isPreCloseQuestion,
  composeExecutiveCycle,
  buildPreClosePrompt,
  buildPreCloseChatResult,
} = require("./director-ia-executive-cycle-composer");
const {
  loadMonthCloseResultForChat,
  buildMonthClosePrompt,
  buildMonthCloseChatResult,
  deriveMonthCloseGap,
  wantsFirstMover: wantsMonthCloseFirstMover,
} = require("./director-ia-month-close-result");
const {
  loadFolioStatusForChat,
  buildFolioStatusChatResult,
} = require("./director-ia-m2-folio-status");
const {
  loadFolioHistoryForChat,
  buildFolioHistoryChatResult,
} = require("./director-ia-m2-history");
const {
  loadFolioDocumentsMetadataForChat,
  buildFolioDocumentsMetadataChatResult,
} = require("./director-ia-m2-documents-metadata");
const {
  loadGastosInversionesForChat,
  buildGastosInversionesChatResult,
} = require("./director-ia-m6-gastos-inversiones");
const {
  loadClasificacionApoyosForChat,
  buildClasificacionApoyosChatResult,
} = require("./director-ia-m4-clasificacion-query");
const {
  loadPresupuestoSemanalForChat,
  buildPresupuestoSemanalChatResult,
} = require("./director-ia-m18-presupuesto-semanal");
const {
  loadActionRegisterRevisionNotesForChat,
  buildRevisionNotesChatResult,
} = require("./director-ia-m12-revision-notes");
const {
  loadCommercialDossierForChat,
  buildCommercialDossierChatResult,
} = require("./director-ia-m11-commercial-dossier");
const {
  loadTallerAtForChat,
  buildTallerAtChatResult,
} = require("./director-ia-m5-taller-at");
const {
  isIgfReviewableSupportsQuestion,
  loadIgfReviewableSupportsForChat,
  buildIgfReviewableSupportsPrompt,
  buildIgfReviewableSupportsChatResult,
} = require("./director-ia-igf-reviewable-supports");
const {
  loadActionPersonBoardForChat,
  resolveActionPersonFocus,
  attachDicfHistorialFromPool,
  limitationsForRows,
  buildActionPersonPrompt,
  activeEntitiesFromFocus,
  pendingGapFromFocus,
  hasProperPersonSpan,
  hasAccionToken,
  hasVencidToken,
} = require("./director-ia-action-person");

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const MAX_ACTIONS_FOR_NARRATIVE = 10;

function isDirectorIaDebug() {
  return process.env.DIRECTOR_IA_DEBUG === "true" || process.env.DIRECTOR_IA_DEBUG === "1";
}

let chatDeps = { pool: null };

function configureDirectorIaChat(injected) {
  chatDeps = { ...chatDeps, ...injected };
}

function resolveDirectorIaPlantCode(assembled) {
  const raw = assembled && assembled.plant && assembled.plant.plant_code;
  const code = raw != null ? String(raw).trim() : "";
  return code || null;
}

function parseExplicitCutoffFromQuestion(question) {
  const { parseCutoffYmd } = require("./director-ia-dashboard-forecast-adapter");
  const q = String(question || "");
  const iso = q.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return parseCutoffYmd(iso[1]);
  const dmy = q.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  if (!dmy) return null;
  const dd = String(dmy[1]).padStart(2, "0");
  const mm = String(dmy[2]).padStart(2, "0");
  return parseCutoffYmd(`${dmy[3]}-${mm}-${dd}`);
}

function resolveDirectorIaEffectiveCutoff(input) {
  const { parseCutoffYmd } = require("./director-ia-dashboard-forecast-adapter");
  const fromQuestion = parseExplicitCutoffFromQuestion(input && input.question);
  if (fromQuestion) {
    return { cutoff: fromQuestion, source: "question.explicit_cutoff" };
  }
  const body = (input && input.body) || {};
  const fromBody = parseCutoffYmd(body.upload_day || body.cutoff_date || null);
  if (fromBody) {
    return { cutoff: fromBody, source: "req.body.upload_day" };
  }
  const last = input && input.lastUpload;
  const fromPlant = parseCutoffYmd(last && (last.upload_day || last.uploaded_day));
  if (fromPlant) {
    return { cutoff: fromPlant, source: "arr.upload_log.plant" };
  }
  return { cutoff: null, source: null };
}

function mapCutoffSourceToOrigin(source) {
  if (source === "question.explicit_cutoff") return "EXPLICIT_QUESTION";
  if (source === "req.body.upload_day") return "REQUEST_UPLOAD_DAY";
  if (source === "arr.upload_log.plant") return "PLANT_LAST_UPLOAD";
  return "UNAVAILABLE";
}

function resolveCorteDayForRun(year, month, cutoff) {
  if (!cutoff || !Number.isFinite(Number(year)) || !Number.isFinite(Number(month))) return null;
  const { getPronosticoCorteYmdStr } = require("./dashboard-arr-forecast");
  return getPronosticoCorteYmdStr(year, month, cutoff);
}

function buildForecastRunIdentity(input) {
  const cutoff = (input && input.cutoff) || null;
  const year = input && Number.isFinite(Number(input.year)) ? Number(input.year) : null;
  const month = input && Number.isFinite(Number(input.month)) ? Number(input.month) : null;
  return {
    plant_code: input && input.plant_code ? String(input.plant_code).trim() : null,
    year,
    month,
    upload_day: (input && input.upload_day) || cutoff || null,
    effective_cutoff_date: cutoff,
    corte_day: cutoff ? resolveCorteDayForRun(year, month, cutoff) : null,
    cutoff_origin: mapCutoffSourceToOrigin(input && input.source),
  };
}

function isCutoffExplainQuestion(question) {
  const t = String(question || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!t) return false;
  if (/\bcomo\s+(vamos|va|andan|andamos|estamos)\b/.test(t) && !/\b(fecha de corte|que corte usaste)\b/.test(t)) {
    return false;
  }
  return (
    /fecha de corte usaste/.test(t) ||
    /que fecha de corte/.test(t) ||
    /que corte usaste/.test(t) ||
    /con que corte/.test(t) ||
    /de que fecha es esa proyec/.test(t) ||
    /que fecha estas usando para el forecast/.test(t) ||
    /que fecha usaste/.test(t) ||
    /que fecha estas usando/.test(t) ||
    /con que corte calculaste/.test(t)
  );
}

async function queryArrLastUploadDayPlantAware(poolOrClient, year, month, plantCode) {
  const code = plantCode != null ? String(plantCode).trim() : "";
  const y = Number(year);
  const m = Number(month);
  if (!code || !Number.isFinite(y) || !Number.isFinite(m)) {
    return { ok: true, year: y || year, month: m || month, plant_code: code || null, upload_day: null };
  }
  let client = null;
  let release = false;
  if (poolOrClient && typeof poolOrClient.connect === "function") {
    client = await poolOrClient.connect();
    release = true;
  } else {
    client = poolOrClient;
  }
  if (!client || typeof client.query !== "function") {
    return { ok: true, year: y, month: m, plant_code: code, upload_day: null };
  }
  try {
    const r = await client.query(
      `SELECT plant_code, uploaded_day, uploaded_at, uploaded_by
         FROM arr.upload_log
        WHERE year = $1::int AND month = $2::int
          AND UPPER(TRIM(plant_code)) = UPPER(TRIM($3::text))
        ORDER BY uploaded_at DESC
        LIMIT 1`,
      [y, m, code]
    );
    const row = r.rows && r.rows[0] ? r.rows[0] : null;
    if (!row) return { ok: true, year: y, month: m, plant_code: code, upload_day: null };
    const { parseCutoffYmd } = require("./director-ia-dashboard-forecast-adapter");
    const uploadDay = parseCutoffYmd(
      typeof row.uploaded_day === "string" ? row.uploaded_day : row.uploaded_day && row.uploaded_day.toISOString
        ? row.uploaded_day.toISOString().slice(0, 10)
        : row.uploaded_day
    );
    return { ok: true, year: y, month: m, plant_code: code, upload_day: uploadDay };
  } finally {
    if (release && client && typeof client.release === "function") client.release();
  }
}

const COMMERCIAL_ENTITY_SYSTEM_ADDENDUM = `Cuando el contexto incluya ENTIDADES COMERCIALES RELACIONADAS:
- Usa el nombre canónico para datos DICF y Action Register.
- Si un alias verificado difiere del canónico, indica explícitamente: "El cliente mencionado como [alias] corresponde a la entidad comercial [canónico]."
- No asumas equivalencias que no aparezcan en ENTIDADES COMERCIALES RELACIONADAS con alias verificados.`;

function directorIaDebug(...args) {
  if (isDirectorIaDebug()) console.log(...args);
}

/** Alias de CANONICAL_TEMAS para compatibilidad con tests/consumidores previos. */
const CANONICAL_TEMAS = ACTION_REGISTER_TEMAS;

const TEMA_QUERY_ALIASES = [
  { re: /\bimagen\s+corporativa\b/i, tema: "Imagen Corporativa" },
  { re: /\bsistema\s+vs\.?\s+incendio\b/i, tema: "Sistema vs Incendio" },
  { re: /\bsistema\s+contra\s+incendio\b/i, tema: "Sistema vs Incendio" },
  { re: /\bcontra\s+incendio\b/i, tema: "Sistema vs Incendio" },
  { re: /\bextintores?\b/i, tema: "Sistema vs Incendio" },
  { re: /\baspersores?\b/i, tema: "Sistema vs Incendio" },
  { re: /\bincendio\b/i, tema: "Sistema vs Incendio" },
  { re: /\boficinas?\b/i, tema: "Oficinas" },
  { re: /\berp\b/i, tema: "ERP" },
  { re: /\brotulaci[oó]n\b/i, tema: "Imagen Corporativa" },
  { re: /\bse[nñ]alizaci[oó]n\b/i, tema: "Imagen Corporativa" },
  { re: /\blogotipo\b/i, tema: "Imagen Corporativa" },
  { re: /\bfachada\b/i, tema: "Imagen Corporativa" },
  { re: /\bimagen\b/i, tema: "Imagen Corporativa" },
  { re: /\bsistema\b/i, tema: "ERP" },
  { re: /\bmantenimiento\b/i, tema: "Mantenimiento" },
  { re: /\bclientes?\b/i, tema: "Clientes" },
  { re: /\bcontrataciones?\b/i, tema: "Contrataciones" },
  { re: /\btaller\b/i, tema: "Taller" },
  { re: /\blicencias?\b/i, tema: "Licencias" },
  { re: /\bapoyos?\b/i, tema: "Apoyos" },
  { re: /\bgeneral\b/i, tema: "General" },
  { re: /\bseguridad\b/i, tema: null, keyword: "seguridad" },
];

const NARRATIVE_SIGNAL_RE =
  /\b(mantenimiento|seguridad|clientes?|taller|contrataciones?|licencias?|apoyos?|oficinas?|erp|incendio|imagen|corporativa|fachada|se[nñ]alizaci[oó]n|logotipo|rotulaci[oó]n|extintores?|aspersores?|mejoras?|evidencias?|proyectos?|avances?|actividades?|trabajando|trabaja|trabajan|haciendo|pendiente|pendientes|estatus|objetivos?|general|responsable|responsables|atiende|atienden|seguimiento|lidera|liderando|c[oó]mo\s+vamos)\b|acciones\s+de\s+|qué\s+acciones\s+tiene|qué\s+est[aá]\s+haciendo|qué\s+lleva\s+actualmente|qué\s+proyectos?\s+lleva|qué\s+tiene\s+pendiente|en\s+qué\s+trabaja|quién\s+est[aá]\s+dando\s+seguimiento/i;

const AGGREGATE_SIGNAL_RE =
  /\b(riesgos?|vencid|presidencia|resumen\s+ejecutivo|estado\s+general|principal\s+riesgo|m[aá]s\s+vencidas|mas\s+vencidas|qui[eé]n\s+tiene\s+m[aá]s|concentra\s+m[aá]s\s+retraso|concentra\s+m[aá]s\s+riesgo|top\s+acciones|hallazgos?)\b/i;

/** Preguntas de diagnóstico / situación general de planta (Sprint 2B.2). */
const PLANT_DIAGNOSTIC_SIGNAL_RE =
  /\b(qu[eé]\s+(est[aá]|pasa(\s+en)?)|est[aá]\s+pasando|situaci[oó]n\s+general|diagn[oó]stico|estado\s+general|resumen\s+ejecutivo|principal(es)?\s+riesgos?|riesgos?\s+m[aá]s\s+importantes?|top\s+riesgos?|qu[eé]\s+deber[ií]a\s+hacer|esta\s+semana)\b/i;

/** Plan Maestro / Mejora Continua Presidencial v0.8.1 — prioridad sobre action_register en chat. */
const MEJORA_CONTINUA_KEYWORD_RE =
  /\b(plan\s+maestro|mejora\s+continua|cumplimiento|oficinas?|taller|erp|sistema\s+vs\.?\s+incendio|imagen\s+corporativa)\b/i;

const MEJORA_CONTINUA_AREA_ALIASES = [
  { re: /\bimagen\s+corporativa\b/i, area: "Imagen Corporativa" },
  { re: /\bsistema\s+vs\.?\s+incendio\b/i, area: "Sistema vs Incendio" },
  { re: /\bsistema\s+contra\s+incendio\b/i, area: "Sistema vs Incendio" },
  { re: /\boficinas?\b/i, area: "Oficinas" },
  { re: /\berp\b/i, area: "ERP" },
  { re: /\btaller\b/i, area: "Taller" },
];

/**
 * Preguntas comerciales/ventas/clientes → dicf_details (historial + cierre) cuando existan.
 * DICF representa Delta Ingreso Cliente Forecast y debe considerarse sinónimo operativo de ventas/clientes/demanda comercial.
 */
const DICF_CONTEXT_SIGNAL_RE =
  /\b(ventas?|clientes?|cartera|demanda|ca[ií]da|baj[aó]|disminuci[oó]n|recuperaci[oó]n|comisionista|casa|autotanque|port[aá]til|carburaci[oó]n|predieros|mercado|competencia|precios?|descuentos?|margen|huachicol|gas\s+ilegal|dicf|cierre|cerrad|resultado|historial|concluy|conclusi[oó]n|aprendimos|dejaron\s+de\s+comprar|dej[oó]\s+de\s+comprar|dejaron\s+de\s+consumir|dej[oó]\s+de\s+consumir|qu[eé]\s+pas[oó]|estacional|estructural)\b/i;

/** Bitácora IA — conocimiento de campo (Plaud, visitas, juntas). Sprint 2B. */
const BITACORA_SIGNAL_RE =
  /\b(visita|reuni[oó]n|junta|gerente|coment[oó]|mencion[oó]|oportunidad(?:es)?|riesgo(?:s)?|contexto|conversaci[oó]n|seguimiento|planta|consejo|plaud|campo)\b/i;

const BITACORA_FIELD_NARRATIVE_RE =
  /\b(visita|reuni[oó]n|junta|gerente|coment[oó]|mencion[oó]|oportunidad(?:es)?|conversaci[oó]n|consejo|plaud|coapan)\b/i;

/** Ventana de contexto y respuesta por mes (más reciente → 3 meses atrás). */
const BITACORA_CHAT_MONTH_WINDOW = 3;

const MESES_ES_LABEL = Object.freeze([
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]);

const BITACORA_MONTHLY_RESPONSE_RULE = `Estructura tu respuesta por mes, del más reciente al más antiguo (máximo ${BITACORA_CHAT_MONTH_WINDOW} meses del contexto).
Formato obligatorio, un bloque por mes:
**Resumen [Mes Año]:** ...
No mezcles hechos de distintos meses en el mismo párrafo. Si un mes no tiene información en el contexto, indícalo brevemente en su bloque.`;

const DICF_MONTHLY_RESPONSE_RULE = `Cuando el contexto esté organizado por mes, responde con el mismo criterio: **Resumen [Mes Año]:** del más reciente al más antiguo (máximo ${BITACORA_CHAT_MONTH_WINDOW} meses). No mezcles información de distintos meses.`;

const MONTHLY_INTEGRATED_RESPONSE_RULE = `${BITACORA_MONTHLY_RESPONSE_RULE}
En cada mes integra TODAS las fuentes del contexto (Bitácora IA, DICF/clientes y Action Register). No digas «sin sesiones» ni «sin información» si ese mes tiene DICF u otra fuente aunque no tenga bitácora.`;

const CLIENT_NAME_LOOKUP_RESPONSE_RULE = `Consulta por cliente específico:
1. Inicia con **Resumen [mes más reciente]** usando la BITÁCORA IA (situación ACTUAL: toneladas, dejó de comprar, crédito rechazado, causa de baja).
2. Los cierres DICF de meses anteriores son solo ANTECEDENTE histórico — no los presentes como situación vigente si la bitácora posterior indica otra causa o que ya no compra.
3. Orden: causa actual (bitácora) → luego historial DICF si aporta contexto.`;

const DIRECTOR_IA_SYSTEM_PROMPT = `Eres un Gerente General que informa al Director General o a Presidencia sobre el Action Register de una planta.
Tu tono es ejecutivo, claro y orientado a decisiones. No eres un chatbot genérico.

Reglas obligatorias:
- NO inventes datos, proyectos, avances ni responsables.
- NO asumas objetivos o estatus que no estén en el contexto.
- Si no existe evidencia suficiente, responde exactamente:
  "No existe evidencia suficiente en Action Register para responder esa pregunta."
- Utiliza únicamente la información del contexto entregado en este mensaje.
- No menciones bases de datos, JSON, APIs ni estructuras técnicas.
- Las acciones vencidas en métricas excluyen fechas inválidas.
- Los resultados de cierre DICF representan conocimiento validado de negocio y deben considerarse evidencia relevante para responder preguntas históricas.
- No asumas que una acción cerrada perdió relevancia; si existe resultado_cierre o historial DICF en el contexto, úsalo.

Cuando el contexto esté en formato focalizado (TEMA CONSULTADO / ACCIONES ABIERTAS):
- DEBES citar al menos dos títulos literales de la sección ACCIONES ABIERTAS si existen.
- NO respondas únicamente con cifras de MÉTRICAS; eso se considera incorrecto.
- Orden recomendado: situación → actividades (títulos) → responsables → riesgos → recomendación.
- Si aparece RESUMEN GLOBAL DE PLANTA, úsalo para afirmaciones a nivel planta (totales abiertas/cerradas/vencidas).
- NUNCA digas que no hay acciones abiertas si RESUMEN GLOBAL DE PLANTA muestra acciones abiertas > 0.
- NUNCA digas que no hay acciones vencidas si RESUMEN GLOBAL DE PLANTA muestra acciones vencidas > 0.
- Si un filtro no lista acciones pero el resumen global sí tiene datos, indica que no hay coincidencias para esa consulta específica, no que la planta esté vacía.

Cuando el contexto sea agregado (JSON completo), usa summary, executive_summary, temas, responsables, top_overdue, tema_details y dicf_details según corresponda.

${COMMERCIAL_ENTITY_SYSTEM_ADDENDUM}`;

/**
 * Acciones DICF (arr.dicf_acciones) — excluye listas commercial_state.
 * @param {string} question
 */
function isDicfActionQuestionForChat(question) {
  return isDicfActionQuestion(question, isDicfContextQuestion);
}

/** Preguntas de identidad / «qué sabemos de» un cliente (entidades + DICF). */
function isCommercialIdentityQuestion(question) {
  return /\b(quien|qui[eé]n)\s+es\b|\bqu[eé]\s+sabemos\s+de\b/i.test(String(question || ""));
}

/**
 * ¿Usar dicf_focused? Incluye identidad con entidad comercial o nombre en DICF.
 * @param {string} question
 * @param {ReturnType<typeof extractChatContextFromPayload> | null} chatContext
 * @param {{ entidades?: unknown[]; search_tokens?: string[] } | null} [commercialResolution]
 */
function shouldUseDicfFocusedChat(question, chatContext, commercialResolution = null) {
  if (!chatContext?.dicf_details?.length) return false;
  if (isCommercialStateListQuestion(question)) return false;
  if (isPlantFinancialKpiQuestion(question)) return false;
  if (isClientNameLookupQuestion(question) && (chatContext?.bitacora || []).length > 0) return false;
  if (isDicfActionQuestionForChat(question)) return true;

  const filtered = filterDicfDetailsByQuestion(
    chatContext.dicf_details,
    question,
    commercialResolution?.entidades?.length ? commercialResolution : null
  );
  if (filtered.length === 0) return false;
  if (commercialResolution?.entidades?.length > 0) return true;
  if (isCommercialIdentityQuestion(question)) return true;
  return false;
}

const DIRECTOR_IA_SYSTEM_PROMPT_COMMERCIAL_STATE = `${DIRECTOR_IA_SYSTEM_PROMPT}

Tu función es responder preguntas sobre el ESTADO COMERCIAL ACTUAL de la planta (listas Delta Ingreso Cliente Forecast).

Reglas ESTADO COMERCIAL:
1. Usa únicamente la lista de clientes del bloque ESTADO COMERCIAL ACTUAL entregado en este mensaje.
2. Responde con una lista ejecutiva de clientes (nombres literales del contexto), no con un solo caso histórico.
3. Incluye totales de la categoría cuando ayude (conteo y total de ingreso/ton del encabezado).
4. Si un cliente tiene Acciones DICF abiertas > 0, menciónalo brevemente; no sustituyas la lista por historial de cierre.
5. No confundas esta lista con acciones DICF cerradas ni resultados de cierre de meses anteriores.
6. Si ENTIDADES COMERCIALES RELACIONADAS vincula alias con canónico, usa el canónico al listar clientes coincidentes.

Si la categoría no tiene clientes en el contexto, indícalo claramente sin inventar nombres.

${COMMERCIAL_ENTITY_SYSTEM_ADDENDUM}`;

const DIRECTOR_IA_SYSTEM_PROMPT_DICF = `${DIRECTOR_IA_SYSTEM_PROMPT}

Tu función es responder preguntas sobre acciones DICF (clientes / Delta Ingreso Cliente Forecast).

Reglas DICF:
1. Prioriza resultado_cierre e historial (creada → fecha_compromiso → cerrada) cuando la pregunta sea histórica o sobre conclusiones.
2. Cita textualmente el resultado de cierre cuando exista; es evidencia validada de negocio.
3. Incluye acciones cerradas y abiertas según el contexto DICF entregado.
4. Si preguntan por un cliente por nombre, responde solo con las acciones de ese cliente en el contexto.
5. Orden recomendado: conclusión o situación → resultado de cierre → hitos del historial → pendientes si aplica.
6. Si ENTIDADES COMERCIALES RELACIONADAS vincula un alias con el canónico, menciona la equivalencia al inicio cuando el alias aparezca en la pregunta.
7. Si el ANEXO — BITÁCORA IA tiene sesiones con fecha más reciente que los cierres DICF, prioriza la bitácora para el estado actual de clientes y situación comercial; usa DICF solo como antecedente histórico.
8. ${DICF_MONTHLY_RESPONSE_RULE}

No inicies la respuesta con conteos genéricos si hay un resultado de cierre concreto disponible.

${COMMERCIAL_ENTITY_SYSTEM_ADDENDUM}`;

const DIRECTOR_IA_SYSTEM_PROMPT_NARRATIVE = `${DIRECTOR_IA_SYSTEM_PROMPT}

Tu función es responder como un gerente de planta explicando el trabajo que se está realizando.

Cuando existan acciones abiertas en el contexto focalizado:
1. Menciona primero las actividades reales (títulos de ACCIONES ABIERTAS MÁS RELEVANTES).
2. Después menciona responsables y roles.
3. Después menciona riesgos o retrasos si aplican.
4. Finalmente menciona métricas.

No inicies la respuesta con conteos.

Incorrecto: "Mantenimiento tiene 34 acciones abiertas..."
Correcto: "Actualmente mantenimiento trabaja en actividades como pintura de barda perimetral, iluminación exterior del patio norte y..."

La narrativa debe parecer una conversación ejecutiva, no un dashboard.
Debes citar al menos dos títulos literales de acciones cuando existan en el contexto.`;

const DIRECTOR_IA_SYSTEM_PROMPT_MEJORA_CONTINUA = `Eres un Gerente General que informa al Director General o a Presidencia sobre la Mejora Continua del Plan Maestro de una planta.
Tu tono es ejecutivo, claro y orientado a decisiones. No eres un chatbot genérico.

Reglas obligatorias:
- NO inventes datos, evidencias, cumplimiento ni responsables.
- Utiliza únicamente la información del contexto de MEJORA CONTINUA entregado en este mensaje.
- Las 5 áreas estratégicas son: Oficinas, Taller, Sistema vs Incendio, ERP e Imagen Corporativa.
- El semáforo es VERDE (evidencia fotográfica en el mes), AMARILLO (acciones abiertas sin evidencia en el mes) o ROJO (sin evidencia y sin acciones abiertas).
- Si no existe evidencia suficiente en el contexto, responde exactamente:
  "No existe evidencia suficiente en Action Register para responder esa pregunta."
- No menciones bases de datos, JSON, APIs ni estructuras técnicas.
- Responde con nombres de área, estatus del semáforo, cumplimiento X/5, porcentaje y responsables cuando aplique.`;

const DIRECTOR_IA_SYSTEM_PROMPT_BITACORA = `Eres un Gerente General que informa al Director General o a Presidencia usando la Bitácora IA de una planta.
Tu tono es ejecutivo, claro y orientado a decisiones. No eres un chatbot genérico.

La Bitácora IA representa conocimiento de campo obtenido en visitas, reuniones y conversaciones.
Debe utilizarse para responder preguntas narrativas o de contexto.

Reglas obligatorias:
- NO inventes datos, comentarios, oportunidades ni riesgos que no estén en los resúmenes de bitácora.
- Usa Bitácora IA como contexto de campo complementario. No debe sustituir Action Register, DICF ni Mejora Continua.
- No convertir notas de Plaud en acciones formales del Action Register.
- No asumir que Action Items o TBD son compromisos ejecutables.
- Si no existe evidencia suficiente en la bitácora, indícalo sin invalidar otras fuentes del contexto.
- No menciones bases de datos, JSON, APIs ni estructuras técnicas.
- Responde con fecha, tipo y título de la sesión cuando ayude a ubicar la información.
- ${BITACORA_MONTHLY_RESPONSE_RULE}`;

const BITACORA_ANNEX_SYSTEM_ADDENDUM =
  "Cuando el mensaje incluya un ANEXO — BITÁCORA IA, úsalo como contexto de campo complementario. Si la bitácora es más reciente que cierres DICF históricos, prioriza su información para el estado actual de clientes y situación comercial. Si el anexo está organizado por mes, responde con bloques **Resumen [Mes Año]:** del más reciente al más antiguo.";

const COMENTARIOS_ANNEX_SYSTEM_ADDENDUM =
  "Cuando el mensaje incluya un ANEXO — COMENTARIOS (clientes ARR/DICF + folios dashboard), úsalo como capa cualitativa adicional. No sustituye DICF, Action Register, bitácora ni IGF/ARR: intégralo junto con esas fuentes cuando aporte contexto de seguimiento, decisiones o pendientes.";

const BITACORA_RECENT_PRIORITY_ADDENDUM =
  "La bitácora cargada es más reciente que los cierres DICF históricos de la planta. Prioriza las sesiones de bitácora para responder sobre clientes, visitas y situación comercial actual. Usa DICF solo como antecedente si la pregunta lo requiere explícitamente.";

const DIRECTOR_IA_SYSTEM_PROMPT_MONTHLY_INTEGRATED = `${DIRECTOR_IA_SYSTEM_PROMPT}

Tu función es sintetizar por mes la información de BITÁCORA IA, DICF (clientes/ventas) y Action Register de una planta.

Reglas obligatorias:
1. ${MONTHLY_INTEGRATED_RESPONSE_RULE}
2. Prioriza Bitácora IA para situación de campo reciente; usa DICF para cierres e historial validado del mes.
3. Usa el bloque RESUMEN GLOBAL DE PLANTA para totales actuales cuando la pregunta lo requiera.
4. No inventes datos ni mezcles meses en un mismo párrafo.
5. Si un mes solo tiene DICF (sin bitácora), responde con los clientes/acciones DICF de ese mes.
6. ${CLIENT_NAME_LOOKUP_RESPONSE_RULE}`;

/**
 * @param {string} question
 */
function isMejoraContinuaQuestion(question) {
  const q = String(question || "");
  if (MEJORA_CONTINUA_KEYWORD_RE.test(q)) return true;
  if (/\bplan\s+maestro\b/i.test(q)) return true;
  if (/\b(no\s+tienen|sin)\s+evidencias?\b/i.test(q)) return true;
  if (/\bevidencias?\b/i.test(q) && /\b(áreas?|areas?|sem[aá]foro|mensual|mes)\b/i.test(q)) return true;
  return false;
}

/**
 * @param {string} question
 */
function isDicfContextQuestion(question) {
  const q = String(question || "");
  // Seguimiento por cliente (DICF acciones/historial). El \b final del RE principal falla tras ó/é en JS.
  if (/\bqu[eé]\s+pas[oó]\s+con\b/i.test(q)) return true;
  return DICF_CONTEXT_SIGNAL_RE.test(q);
}

/**
 * Preguntas de conocimiento de campo → Bitácora IA (prioridad 4, debajo de MC/DICF/AR).
 * @param {string} question
 */
function isBitacoraQuestion(question) {
  const q = String(question || "");
  if (!BITACORA_SIGNAL_RE.test(q)) return false;
  if (isMejoraContinuaQuestion(q)) return false;

  const hasFieldNarrative = BITACORA_FIELD_NARRATIVE_RE.test(q);

  if (isNarrativeQuestion(q) && !hasFieldNarrative) {
    return false;
  }

  if (isAggregateQuestion(q) && !hasFieldNarrative && /\briesgo(?:s)?\b/i.test(q) && !/\bvisita\b/i.test(q)) {
    return false;
  }

  if (isDicfActionQuestionForChat(q) && !hasFieldNarrative && !/\b(contexto|conversaci[oó]n|visita|reuni[oó]n|junta)\b/i.test(q)) {
    return false;
  }

  return true;
}

/**
 * Anexo Bitácora IA: complementario, nunca sustituto de AR/DICF/MC.
 * Incluye preguntas de diagnóstico/riesgos con planta explícita aunque isBitacoraQuestion sea false.
 * @param {string} question
 * @param {ReturnType<typeof extractChatContextFromPayload> | null} chatContext
 */
function shouldAttachBitacoraAnnex(question, chatContext) {
  const sessions = chatContext?.bitacora || [];
  if (sessions.length === 0) return false;
  if (isMejoraContinuaQuestion(question)) return false;
  if (isBitacoraQuestion(question)) return true;

  // La bitácora del chat ya viene filtrada por planta_id; adjuntar si es más reciente que DICF.
  if (
    bitacoraIsNewerThanDicf(chatContext) &&
    isDicfActionQuestionForChat(question) &&
    !isExplicitDicfHistoryQuestion(question)
  ) {
    return true;
  }

  const matched = filterBitacoraByQuestion(sessions, question);
  if (matched.length === 0) return false;

  const qNorm = normalizeDicfSearchText(question);
  const hasPlantaMatch = sessions.some((s) => {
    const n = normalizeDicfSearchText(s.planta_nombre || "");
    return n.length >= 4 && qNorm.includes(n);
  });

  if (hasPlantaMatch && (isPlantDiagnosticQuestion(question) || isAggregateQuestion(question))) {
    return true;
  }
  if (hasPlantaMatch && /\b(oportunidad(?:es)?|riesgo(?:s)?)\b/i.test(question)) {
    return true;
  }
  if (BITACORA_FIELD_NARRATIVE_RE.test(question)) {
    return true;
  }

  return false;
}

function normalizeDicfSearchText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** @param {string | null | undefined} raw */
function sliceIsoDate(raw) {
  const m = String(raw || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/** @param {string} yearMonth YYYY-MM */
function formatMonthHeading(yearMonth) {
  const [y, m] = String(yearMonth || "").split("-");
  const idx = parseInt(m, 10) - 1;
  if (!y || idx < 0 || idx > 11) return String(yearMonth || "");
  return `${MESES_ES_LABEL[idx]} ${y}`;
}

/**
 * @param {string} anchorDate YYYY-MM-DD
 * @param {number} count
 * @returns {string[]}
 */
function getRecentMonthKeysFromAnchor(anchorDate, count = BITACORA_CHAT_MONTH_WINDOW) {
  const ym = String(anchorDate || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ym)) return [];
  let [year, month] = ym.split("-").map(Number);
  const keys = [];
  for (let i = 0; i < count; i++) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return keys;
}

/**
 * @param {{ fecha?: string, created_at?: string }} session
 */
function getSessionEffectiveDate(session) {
  return sliceIsoDate(session?.fecha) || sliceIsoDate(session?.created_at);
}

/**
 * @param {Array<{ fecha?: string, created_at?: string }>} sessions
 * @param {number} [months]
 */
function filterBitacoraToMonthWindow(sessions, months = BITACORA_CHAT_MONTH_WINDOW) {
  const anchor = getLatestBitacoraDate(sessions);
  if (!anchor) return sessions || [];
  const allowed = new Set(getRecentMonthKeysFromAnchor(anchor, months));
  return (sessions || []).filter((s) => {
    const d = getSessionEffectiveDate(s);
    return d && allowed.has(d.slice(0, 7));
  });
}

/**
 * @param {Array<{ fecha?: string, created_at?: string }>} sessions
 * @param {string[]} monthKeys
 */
function groupSessionsByMonthKeys(sessions, monthKeys) {
  const byMonth = new Map(monthKeys.map((k) => [k, []]));
  for (const s of sessions || []) {
    const d = getSessionEffectiveDate(s);
    const key = d?.slice(0, 7);
    if (key && byMonth.has(key)) byMonth.get(key).push(s);
  }
  for (const list of byMonth.values()) {
    list.sort((a, b) => String(getSessionEffectiveDate(b)).localeCompare(String(getSessionEffectiveDate(a))));
  }
  return monthKeys.map((monthKey) => ({ monthKey, sessions: byMonth.get(monthKey) || [] }));
}

/**
 * Detecta nombres de cliente en la pregunta (mayúsculas o nombre propio 3+ palabras).
 * @param {string} question
 */
function extractLikelyClientNameTokensFromQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return [];
  const tokens = new Set();

  const capsMatches = q.match(/\b([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){2,})\b/g);
  for (const m of capsMatches || []) {
    if (!/^(QUE|POR|LOS|LAS|DEL|CON|ESTE|ESA|RESUMEN)\b/.test(m)) tokens.add(m.trim());
  }

  const titleMatches = q.match(
    /\b((?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+|[A-ZÁÉÍÓÚÑ]{2,})(?:\s+(?:[A-ZÁÉÍÓÚÑ][a-záéíóñü]+|[A-ZÁÉÍÓÚÑ]{2,})){2,})\b/g
  );
  for (const m of titleMatches || []) {
    if (!/^(se habla|Visita Planta|Action Register)\b/i.test(m)) tokens.add(m.trim());
  }

  return [...tokens].filter((t) => t.length >= 10);
}

/**
 * Pregunta centrada en un nombre de cliente (ej. solo «SAUL JONATAN CARMONA HERNANDEZ»).
 * @param {string} question
 */
function isClientNameLookupQuestion(question) {
  const names = extractLikelyClientNameTokensFromQuestion(question);
  if (names.length === 0) return false;
  if (isExplicitDicfHistoryQuestion(question)) return false;
  const q = normalizeDicfSearchText(question);
  return names.some((name) => {
    const n = normalizeDicfSearchText(name);
    return n.length >= 8 && q.includes(n);
  });
}

/**
 * @param {Array<{ resumen_ia?: string, contenido?: string }>} sessions
 * @param {string[]} searchTexts
 */
function hasBitacoraMentionForClient(sessions, searchTexts) {
  if (!searchTexts?.length) return false;
  return (sessions || []).some((s) =>
    textMatchesCommercialTokens(`${s.resumen_ia || ""} ${s.contenido || ""}`, searchTexts)
  );
}

const CHAT_PRONOUN_FOLLOWUP_RE =
  /\b(se\s+habla|mencion|hablaron|comentar|dijeron|este\s+cliente|ese\s+cliente|el\s+cliente|ella?\s+en|de\s+el\b|de\s+él\b)\b/i;

/**
 * Expande preguntas con pronombres usando el historial del chat (último cliente mencionado).
 * @param {string} question
 * @param {Array<{ role?: string, content?: string }>} [history]
 */
function expandQuestionFromChatHistory(question, history) {
  const q = String(question || "").trim();
  if (!q || !CHAT_PRONOUN_FOLLOWUP_RE.test(q)) return q;
  const msgs = [...(history || [])].reverse();
  for (const msg of msgs) {
    if (msg?.role !== "user") continue;
    const names = extractLikelyClientNameTokensFromQuestion(msg.content || "");
    if (names.length > 0) {
      return `${q} (cliente: ${names[0]})`;
    }
  }
  return q;
}

/**
 * @param {string} question
 * @param {{ search_tokens?: string[] } | null | undefined} [commercialResolution]
 */
function resolveBitacoraSearchTexts(question, commercialResolution = null) {
  const tokens = [...(commercialResolution?.search_tokens || [])];
  tokens.push(...extractLikelyClientNameTokensFromQuestion(question));
  return [...new Set(tokens.map((t) => String(t).trim()).filter(Boolean))];
}

/**
 * @param {{ fecha: string, tipo: string, titulo: string | null, resumen_ia: string, contenido?: string, planta_nombre?: string | null }} session
 * @param {string[]} [searchTexts]
 */
function formatBitacoraSessionLines(session, searchTexts = []) {
  const lines = [
    `Fecha: ${session.fecha} | Tipo: ${session.tipo}${session.titulo ? ` | Título: ${session.titulo}` : ""}`,
  ];
  if (session.planta_nombre) lines.push(`Planta: ${session.planta_nombre}`);
  lines.push(`Resumen: ${session.resumen_ia || "(sin resumen)"}`);

  if (session.contenido && searchTexts.length > 0) {
    const excerpt = extractBitacoraExcerptForSearch(session.contenido, searchTexts);
    if (excerpt) {
      const resumenNorm = normalizeDicfSearchText(session.resumen_ia || "");
      const alreadyInResumen = searchTexts.some((tok) => resumenNorm.includes(normalizeDicfSearchText(tok)));
      if (!alreadyInResumen) {
        lines.push("Extracto transcripción (cliente consultado):");
        lines.push(excerpt);
      }
    }
  }
  return lines;
}

/**
 * @param {Array<{ fecha: string, tipo: string, titulo: string | null, resumen_ia: string, planta_nombre?: string | null, created_at?: string }>} matched
 * @param {{ prioritizeRecent?: boolean, anchorSessions?: Array, searchTexts?: string[] }} [opts]
 */
function formatBitacoraMonthlyBlocks(matched, opts = {}) {
  const searchTexts = opts.searchTexts || [];
  const anchor = getLatestBitacoraDate(opts.anchorSessions || matched);
  const monthKeys = anchor
    ? getRecentMonthKeysFromAnchor(anchor, BITACORA_CHAT_MONTH_WINDOW)
    : [];
  const grouped = monthKeys.length > 0 ? groupSessionsByMonthKeys(matched, monthKeys) : [];

  const lines = [
    `ÚLTIMOS ${BITACORA_CHAT_MONTH_WINDOW} MESES (más reciente primero):`,
    "",
  ];

  if (grouped.length === 0) {
    lines.push("(sin sesiones de bitácora en la ventana de 3 meses)");
    return lines;
  }

  for (const { monthKey, sessions } of grouped) {
    lines.push(`--- ${formatMonthHeading(monthKey).toUpperCase()} ---`);
    if (sessions.length === 0) {
      lines.push("(sin sesiones en este mes)");
    } else {
      for (const s of sessions) {
        lines.push(...formatBitacoraSessionLines(s, searchTexts));
        lines.push("");
      }
    }
    lines.push("");
  }

  return lines;
}

/**
 * @param {Record<string, unknown>} detail
 */
function getDicfActivityDate(detail) {
  let max = null;
  for (const raw of [detail.cerrado_at, detail.fecha_compromiso, detail.created_at]) {
    const date = sliceIsoDate(raw);
    if (date && (!max || date > max)) max = date;
  }
  for (const h of detail.historial || []) {
    const date = sliceIsoDate(h.creado_en);
    if (date && (!max || date > max)) max = date;
  }
  return max;
}

/**
 * @param {Array<Record<string, unknown>>} details
 * @param {number} [months]
 */
function filterDicfToMonthWindow(details, months = BITACORA_CHAT_MONTH_WINDOW, anchorDate = null) {
  const anchor = anchorDate || getLatestDicfActivityDate(details);
  if (!anchor) return details || [];
  const allowed = new Set(getRecentMonthKeysFromAnchor(anchor, months));
  return (details || []).filter((d) => {
    const date = getDicfActivityDate(d);
    return date && allowed.has(date.slice(0, 7));
  });
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload> | null} chatContext
 */
function getIntegratedContextAnchor(chatContext) {
  const bit = getLatestBitacoraDate(chatContext?.bitacora || []);
  const dicf = getLatestDicfActivityDate(chatContext?.dicf_details || []);
  if (bit && dicf) return bit > dicf ? bit : dicf;
  return bit || dicf || null;
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 */
function buildArClientesSnapshot(chatContext) {
  const lines = [];
  const temaDetail = (chatContext?.tema_details || []).find((t) => /^clientes$/i.test(String(t.tema || "")));
  if (temaDetail?.open_actions?.length) {
    lines.push("Acciones abiertas tema Clientes:");
    for (const a of temaDetail.open_actions.slice(0, 8)) {
      lines.push(`  · ${a.title || "(sin título)"}${a.responsable ? ` — ${a.responsable}` : ""}`);
    }
  }
  const temasRow = (chatContext?.temas || []).find((t) => /^clientes$/i.test(String(t.name || "")));
  if (temasRow) {
    lines.push(
      `Métricas tema Clientes: ${temasRow.open_count} abiertas, ${temasRow.closed_count} cerradas, ${temasRow.overdue_count} vencidas`
    );
  }
  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * Contexto mensual integrando Bitácora IA + DICF + Action Register.
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 * @param {string} question
 * @param {{ search_tokens?: string[] } | null | undefined} [commercialResolution]
 */
function buildMonthlyIntegratedContext(chatContext, question, commercialResolution = null) {
  const sessions = chatContext?.bitacora || [];
  const allDicf = chatContext?.dicf_details || [];
  const searchTexts = resolveBitacoraSearchTexts(question, commercialResolution);
  const matchedBitacora = filterBitacoraByQuestion(sessions, question, commercialResolution);
  const matchedDicf = filterDicfDetailsByQuestion(allDicf, question, commercialResolution);
  const clientLookup = isClientNameLookupQuestion(question);

  const anchor = getIntegratedContextAnchor(chatContext);
  const monthKeys = anchor ? getRecentMonthKeysFromAnchor(anchor, BITACORA_CHAT_MONTH_WINDOW) : [];

  const lines = [
    `CONTEXTO INTEGRADO — ÚLTIMOS ${BITACORA_CHAT_MONTH_WINDOW} MESES (más reciente primero)`,
    "Fuentes por mes: Bitácora IA (campo), DICF/clientes (cierres e historial), Action Register (complemento).",
    "Integra todas las fuentes disponibles en cada mes; no omitas DICF si no hay bitácora.",
  ];
  if (clientLookup && searchTexts.length > 0) {
    lines.push("");
    lines.push(`CONSULTA POR CLIENTE: ${searchTexts[0]}`);
    lines.push(
      "PRIORIDAD: La bitácora del mes más reciente define la situación ACTUAL del cliente (causa de baja, toneladas, crédito). Los cierres DICF de meses anteriores son antecedente — no sustituyen la bitácora si esta indica que ya no compra o cambió la causa."
    );
  }
  lines.push("");

  if (monthKeys.length === 0) {
    lines.push("(sin datos fechados en la ventana de 3 meses)");
  } else {
    for (const monthKey of monthKeys) {
      lines.push(`--- ${formatMonthHeading(monthKey).toUpperCase()} ---`);

      const monthSessions = matchedBitacora.filter(
        (s) => getSessionEffectiveDate(s)?.slice(0, 7) === monthKey
      );
      lines.push("BITÁCORA IA:");
      if (monthSessions.length === 0) {
        lines.push("(sin sesiones de bitácora en este mes)");
      } else {
        for (const s of monthSessions) {
          lines.push(...formatBitacoraSessionLines(s, searchTexts));
          lines.push("");
        }
      }

      const monthDicf = matchedDicf.filter((d) => getDicfActivityDate(d)?.slice(0, 7) === monthKey);
      lines.push("DICF / CLIENTES:");
      if (monthDicf.length === 0) {
        lines.push("(sin acciones DICF en este mes)");
      } else {
        for (const d of monthDicf) {
          lines.push(...formatDicfDetailLines(d));
          lines.push("");
        }
      }
      lines.push("");
    }
  }

  lines.push("--- COMPLEMENTO — ACTION REGISTER (estado actual) ---");
  lines.push(buildPlantSummaryBlock(chatContext));
  const clientesAr = buildArClientesSnapshot(chatContext);
  if (clientesAr) {
    lines.push("");
    lines.push(clientesAr);
  }

  const inWindowDicf = monthKeys.length
    ? matchedDicf.filter((d) => {
        const date = getDicfActivityDate(d);
        return date && monthKeys.includes(date.slice(0, 7));
      })
    : matchedDicf;
  const inWindowBitacora = monthKeys.length
    ? matchedBitacora.filter((s) => {
        const date = getSessionEffectiveDate(s);
        return date && monthKeys.includes(date.slice(0, 7));
      })
    : matchedBitacora;

  return {
    text: lines.join("\n").trimEnd(),
    meta: {
      mode: "monthly_integrated",
      focus: "integrated_monthly",
      focus_type: "integrated_monthly",
      matched_bitacora: inWindowBitacora.length,
      matched_dicf: inWindowDicf.length,
      month_keys: monthKeys,
      client_lookup: clientLookup,
    },
  };
}

/**
 * @param {Record<string, unknown>} detail
 */
function formatDicfDetailLines(detail) {
  const lines = [
    `Código: ${detail.public_code} | Cliente: ${detail.cliente_nombre} | Estado: ${detail.estado}${detail.cerrada ? " (CERRADA)" : ""}`,
  ];
  if (detail.planta_label) lines.push(`Planta: ${detail.planta_label}`);
  lines.push(`Descripción: ${detail.descripcion}`);
  if (detail.responsable) lines.push(`Responsable: ${detail.responsable}`);
  if (detail.fecha_compromiso) lines.push(`Fecha compromiso: ${detail.fecha_compromiso}`);
  if (detail.resultado_cierre) lines.push(`Resultado de cierre: ${detail.resultado_cierre}`);
  if (detail.historial && detail.historial.length > 0) {
    lines.push("Historial (creada → fecha_compromiso → cerrada):");
    lines.push(formatDicfHistorialCompact(detail.historial));
  }
  return lines;
}

/**
 * @param {Array<{ fecha?: string, created_at?: string }>} sessions
 */
function getLatestBitacoraDate(sessions) {
  let max = null;
  for (const s of sessions || []) {
    for (const raw of [s.fecha, s.created_at]) {
      const d = sliceIsoDate(raw);
      if (d && (!max || d > max)) max = d;
    }
  }
  return max;
}

/**
 * @param {Array<Record<string, unknown>>} details
 */
function getLatestDicfActivityDate(details) {
  let max = null;
  for (const d of details || []) {
    for (const raw of [d.cerrado_at, d.fecha_compromiso, d.created_at]) {
      const date = sliceIsoDate(raw);
      if (date && (!max || date > max)) max = date;
    }
    for (const h of d.historial || []) {
      const date = sliceIsoDate(h.creado_en);
      if (date && (!max || date > max)) max = date;
    }
  }
  return max;
}

/**
 * @param {Array<{ fecha?: string, created_at?: string }>} sessions
 * @param {number} [maxAgeDays]
 */
function bitacoraHasRecentFieldKnowledge(sessions, maxAgeDays = 90) {
  const now = Date.now();
  for (const s of sessions || []) {
    for (const raw of [s.fecha, s.created_at]) {
      const d = sliceIsoDate(raw);
      if (!d) continue;
      const ageDays = (now - Date.parse(`${d}T12:00:00.000Z`)) / 86400000;
      if (ageDays >= 0 && ageDays <= maxAgeDays) return true;
    }
  }
  return false;
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload> | null} chatContext
 */
function bitacoraIsNewerThanDicf(chatContext) {
  const sessions = chatContext?.bitacora || [];
  if (sessions.length === 0) return false;

  const latestBit = getLatestBitacoraDate(sessions);
  const latestDicf = getLatestDicfActivityDate(chatContext?.dicf_details || []);

  if (latestBit && latestDicf && latestBit > latestDicf) return true;
  if (!latestDicf && latestBit) return true;
  if (bitacoraHasRecentFieldKnowledge(sessions, 60)) return true;
  return false;
}

/** Pregunta que pide explícitamente historial/cierre DICF (no estado actual de campo). */
function isExplicitDicfHistoryQuestion(question) {
  const q = String(question || "");
  return /\b(resultado\s+de\s+cierre|cierre\s+dicf|historial\s+dicf|qu[eé]\s+pas[oó]\s+con|cerrad[ao]s?\s+en|conclusi[oó]n\s+de|cierre\s+de\s+la\s+acci[oó]n|aprendimos\s+del|dicf\s+cerrad)\b/i.test(
    q
  );
}

/**
 * Bitácora + DICF/AR → contexto integrado por mes (no exclusivo bitácora).
 * @param {string} question
 * @param {ReturnType<typeof extractChatContextFromPayload> | null} chatContext
 */
function shouldUseMonthlyIntegratedChat(question, chatContext) {
  const sessions = chatContext?.bitacora || [];
  if (sessions.length === 0) return false;

  const hasDicf = (chatContext?.dicf_details || []).length > 0;
  const hasAr = hasRelevantActionRegisterContext(chatContext, question);
  if (!hasDicf && !hasAr) return false;

  if (isMejoraContinuaQuestion(question)) return false;
  if (isCommercialStateListQuestion(question)) return false;
  if (isPlantFinancialKpiQuestion(question)) return false;
  if (isExplicitDicfHistoryQuestion(question) && !isBitacoraQuestion(question)) return false;

  const q = String(question || "");
  if (isBitacoraQuestion(q)) return true;
  if (PLANT_DIAGNOSTIC_SIGNAL_RE.test(q)) return true;
  if (/\briesgos?\b/i.test(q) && /\bplanta\b/i.test(q)) return true;
  if (isNarrativeQuestion(q) && /\bclientes?\b/i.test(q)) return true;
  if (isDicfActionQuestionForChat(q)) return true;
  if (/\b(actual|reciente|hoy|esta\s+semana|visita|julio|junio|mes|resumen)\b/i.test(q)) return true;
  if (isClientNameLookupQuestion(q)) return true;
  return false;
}

/**
 * @deprecated Usar shouldUseMonthlyIntegratedChat. Conservado para tests de prioridad bitácora.
 */
function shouldPrioritizeBitacoraOverDicf(question, chatContext) {
  return shouldUseMonthlyIntegratedChat(question, chatContext) && bitacoraIsNewerThanDicf(chatContext);
}

/**
 * @param {string} text
 * @param {string[]} searchTokens
 */
function textMatchesCommercialTokens(text, searchTokens) {
  if (!searchTokens || searchTokens.length === 0) return false;
  const norm = normalizeDicfSearchText(text);
  if (!norm) return false;
  return searchTokens.some((tok) => {
    const t = normalizeDicfSearchText(tok);
    if (!t) return false;
    if (norm.includes(t) || t.includes(norm)) return true;
    const parts = t.split(" ").filter((p) => p.length > 2);
    if (parts.length >= 2) {
      const hits = parts.filter((p) => norm.includes(p)).length;
      return hits >= Math.min(2, parts.length);
    }
    return parts.some((p) => norm.includes(p));
  });
}

/**
 * @param {Array<Record<string, unknown>>} details
 * @param {string} question
 * @param {{ search_tokens?: string[] } | null | undefined} [commercialResolution]
 */
function filterDicfDetailsByQuestion(details, question, commercialResolution = null) {
  const qNorm = normalizeDicfSearchText(question);
  let pool = [...(details || [])];

  if (/\bcerrad|\bcerradas?\b|\bcerraron\b|cierre/i.test(question) || /cerradas?\s+recient/i.test(question)) {
    const closed = pool.filter((d) => d.cerrada);
    if (closed.length > 0) {
      pool = closed.sort((a, b) =>
        String(b.cerrado_at || "").localeCompare(String(a.cerrado_at || ""))
      );
    }
  }

  if (/tehuac[aá]n/i.test(question)) {
    const byPlanta = pool.filter((d) => normalizeDicfSearchText(d.planta_label).includes("tehuacan"));
    if (byPlanta.length > 0) pool = byPlanta;
  }

  const commercialTokens = commercialResolution?.search_tokens || [];
  if (commercialTokens.length > 0) {
    const byCommercial = pool.filter(
      (d) =>
        textMatchesCommercialTokens(d.cliente_nombre, commercialTokens) ||
        textMatchesCommercialTokens(d.descripcion, commercialTokens) ||
        textMatchesCommercialTokens(d.resultado_cierre, commercialTokens)
    );
    if (byCommercial.length > 0) pool = byCommercial;
  } else {
    const byCliente = pool.filter((d) => {
      const cliente = normalizeDicfSearchText(d.cliente_nombre);
      if (!cliente) return false;
      if (qNorm.includes(cliente)) return true;
      const parts = cliente.split(" ").filter((p) => p.length > 2);
      if (parts.length >= 2) {
        const hits = parts.filter((p) => qNorm.includes(p)).length;
        return hits >= Math.min(2, parts.length);
      }
      return parts.some((p) => qNorm.includes(p));
    });
    if (byCliente.length > 0) pool = byCliente;
  }

  if (/dejaron\s+de\s+comprar|dej[oó]\s+de\s+comprar|aprendimos/i.test(question)) {
    const withClosure = pool.filter((d) => d.resultado_cierre);
    if (withClosure.length > 0) pool = withClosure;
  }

  return pool.slice(0, 15);
}

/**
 * @param {Array<{ evento: string, creado_en: string, actor_nombre?: string | null, detalle?: unknown }>} historial
 */
function formatDicfHistorialCompact(historial) {
  return (historial || [])
    .map((h) => {
      const parts = [`  · ${h.creado_en} — ${h.evento}`];
      if (h.actor_nombre) parts.push(`(${h.actor_nombre})`);
      if (h.evento === "fecha_compromiso" && h.detalle && typeof h.detalle === "object" && h.detalle.fecha) {
        parts.push(`→ fecha ${h.detalle.fecha}`);
      }
      if (h.evento === "cerrada") {
        const det = h.detalle && typeof h.detalle === "object" ? h.detalle.resultado_cierre : null;
        if (det) parts.push(`→ ${String(det).slice(0, 240)}`);
      }
      if (h.evento === "creada" && h.detalle && typeof h.detalle === "object" && h.detalle.descripcion) {
        parts.push(`→ ${String(h.detalle.descripcion).slice(0, 120)}`);
      }
      return parts.join(" ");
    })
    .join("\n");
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 * @param {string} question
 * @param {{ search_tokens?: string[] } | null | undefined} [commercialResolution]
 */
function buildFocusedDicfContext(chatContext, question, commercialResolution = null) {
  const all = chatContext.dicf_details || [];
  const filtered = filterDicfDetailsByQuestion(all, question, commercialResolution);
  const anchor = getIntegratedContextAnchor(chatContext);
  const matched = filterDicfToMonthWindow(filtered, BITACORA_CHAT_MONTH_WINDOW, anchor);
  const monthKeys = anchor ? getRecentMonthKeysFromAnchor(anchor, BITACORA_CHAT_MONTH_WINDOW) : [];
  const grouped =
    monthKeys.length > 0
      ? monthKeys.map((monthKey) => ({
          monthKey,
          details: matched.filter((d) => {
            const date = getDicfActivityDate(d);
            return date && date.slice(0, 7) === monthKey;
          }),
        }))
      : [{ monthKey: null, details: matched }];

  const lines = [
    "CONTEXTO DICF — CLIENTES (Delta Ingreso Cliente Forecast)",
    `Ventana: últimos ${BITACORA_CHAT_MONTH_WINDOW} meses (más reciente primero).`,
    "Incluye acciones abiertas y cerradas. Los resultados de cierre son evidencia validada.",
    "",
  ];

  if (/\bcerrad|\bcerradas?\b|\bcerraron\b|cierre/i.test(question)) {
    lines.push("ACCIONES DICF CERRADAS (relevantes):");
  } else if (/historial/i.test(question)) {
    lines.push("ACCIONES DICF CON HISTORIAL:");
  } else {
    lines.push("ACCIONES DICF (abiertas y cerradas):");
  }
  lines.push("");

  if (matched.length === 0) {
    lines.push("(sin acciones DICF coincidentes en la ventana de 3 meses)");
  } else {
    for (const { monthKey, details } of grouped) {
      if (monthKey) {
        lines.push(`--- ${formatMonthHeading(monthKey).toUpperCase()} ---`);
      }
      if (details.length === 0) {
        lines.push("(sin acciones DICF en este mes)");
        lines.push("");
        continue;
      }
      for (const d of details) {
        lines.push(...formatDicfDetailLines(d));
        lines.push("");
      }
    }
  }

  return {
    text: lines.join("\n").trimEnd(),
    meta: {
      mode: "focused",
      focus: "dicf",
      matched_count: matched.length,
      total_dicf: all.length,
    },
  };
}

/**
 * @param {Array<{ fecha: string, tipo: string, titulo: string | null, resumen_ia: string, planta_nombre?: string | null }>} sessions
 * @param {string} question
 * @param {{ search_tokens?: string[] } | null | undefined} [commercialResolution]
 */
function filterBitacoraByQuestion(sessions, question, commercialResolution = null) {
  let pool = filterBitacoraToMonthWindow([...(sessions || [])], BITACORA_CHAT_MONTH_WINDOW);
  const qNorm = normalizeDicfSearchText(question);
  const commercialTokens = commercialResolution?.search_tokens || [];
  const nameTokens = extractLikelyClientNameTokensFromQuestion(question);
  const searchTokens = [...new Set([...commercialTokens, ...nameTokens])];

  if (searchTokens.length > 0) {
    const byCommercial = pool.filter((s) =>
      textMatchesCommercialTokens(
        `${s.titulo || ""} ${s.resumen_ia || ""} ${s.contenido || ""}`,
        searchTokens
      )
    );
    if (byCommercial.length > 0) pool = byCommercial;
  }

  for (const name of [...new Set(pool.map((s) => s.planta_nombre).filter(Boolean))]) {
    const nNorm = normalizeDicfSearchText(name);
    if (nNorm.length >= 4 && qNorm.includes(nNorm)) {
      const byPlanta = pool.filter((s) => normalizeDicfSearchText(s.planta_nombre) === nNorm);
      if (byPlanta.length > 0) pool = byPlanta;
      break;
    }
  }

  if (/tehuac[aá]n/i.test(question)) {
    const byPlanta = pool.filter((s) => normalizeDicfSearchText(s.planta_nombre || "").includes("tehuacan"));
    if (byPlanta.length > 0) pool = byPlanta;
  }

  if (/coapan/i.test(question)) {
    const byKeyword = pool.filter((s) =>
      normalizeDicfSearchText(`${s.titulo || ""} ${s.resumen_ia || ""}`).includes("coapan")
    );
    if (byKeyword.length > 0) pool = byKeyword;
  }

  if (/\bgerente\b|\bcoment[oó]\b|\bmencion[oó]\b/i.test(question)) {
    const byGerente = pool.filter((s) =>
      /\bgerente\b|\bcoment|\bmencion/i.test(`${s.titulo || ""} ${s.resumen_ia || ""}`)
    );
    if (byGerente.length > 0) pool = byGerente;
  }

  if (/\boportunidad(?:es)?\b/i.test(question)) {
    const byOpp = pool.filter((s) => /oportunidad/i.test(`${s.titulo || ""} ${s.resumen_ia || ""}`));
    if (byOpp.length > 0) pool = byOpp;
  }

  if (/\briesgo(?:s)?\b/i.test(question)) {
    const byRisk = pool.filter((s) => /riesgo/i.test(`${s.titulo || ""} ${s.resumen_ia || ""}`));
    if (byRisk.length > 0) pool = byRisk;
  }

  pool.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
  return pool.slice(0, 10);
}

/**
 * @param {Array<{ fecha: string, tipo: string, titulo: string | null, resumen_ia: string, planta_nombre?: string | null }>} sessions
 * @param {string} question
 * @param {{ search_tokens?: string[] } | null | undefined} [commercialResolution]
 */
function buildBitacoraAnnex(sessions, question, commercialResolution = null, opts = {}) {
  const matched = filterBitacoraByQuestion(sessions, question, commercialResolution);
  const searchTexts = resolveBitacoraSearchTexts(question, commercialResolution);
  const prioritizeRecent = Boolean(opts.prioritizeRecent);
  const lines = [
    "---",
    prioritizeRecent
      ? "ANEXO — BITÁCORA IA (información de campo más reciente — priorizar sobre DICF histórico)"
      : "ANEXO — BITÁCORA IA (contexto de campo complementario)",
    prioritizeRecent
      ? "Prioriza estas sesiones para el estado actual de clientes y situación comercial. DICF histórico es solo antecedente."
      : "Usa Bitácora IA como contexto de campo complementario. No debe sustituir Action Register, DICF ni Mejora Continua.",
    "Solo resumen_ia. No convertir notas Plaud en acciones ni compromisos.",
    "",
    ...formatBitacoraMonthlyBlocks(matched, { anchorSessions: sessions, searchTexts }),
  ];

  return {
    text: lines.join("\n").trimEnd(),
    meta: {
      mode: "bitacora_annex",
      focus: "bitacora_ia",
      matched_count: matched.length,
      total_bitacora: (sessions || []).length,
    },
  };
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 * @param {string} question
 */
function hasRelevantActionRegisterContext(chatContext, question) {
  if (!chatContext) return false;
  if (isNarrativeQuestion(question) || isAggregateQuestion(question)) return true;

  const summary = chatContext.summary || {};
  if ((summary.open || 0) + (summary.closed || 0) + (summary.overdue || 0) > 0) return true;
  if ((chatContext.tema_details || []).length > 0) return true;
  if ((chatContext.temas || []).length > 0) return true;
  if ((chatContext.executive_summary?.findings || []).length > 0) return true;
  if ((chatContext.top_overdue || []).length > 0) return true;
  if ((chatContext.responsables || []).length > 0) return true;
  return false;
}

/**
 * @param {Array<{ fecha: string, tipo: string, titulo: string | null, resumen_ia: string, planta_nombre?: string | null }>} sessions
 * @param {string} question
 * @deprecated Usar buildBitacoraAnnex; conservado para fallback bitacora_focused.
 */
function buildFocusedBitacoraContext(sessions, question, opts = {}) {
  const annex = buildBitacoraAnnex(sessions, question, null, {
    prioritizeRecent: Boolean(opts.prioritizeRecent),
  });
  const lines = [
    "BITÁCORA IA — CONOCIMIENTO DE CAMPO",
    annex.text.replace(/^---\nANEXO — BITÁCORA IA \([^)]+\)\n[\s\S]*?\n\n/, ""),
  ];
  return {
    text: lines.join("\n").trimEnd(),
    meta: {
      mode: "bitacora_focused",
      focus: "bitacora_ia",
      matched_count: annex.meta.matched_count,
      total_bitacora: annex.meta.total_bitacora,
    },
  };
}

/**
 * @param {string} question
 */
function resolveMejoraContinuaAreaFocus(question) {
  const q = String(question || "");
  for (const alias of MEJORA_CONTINUA_AREA_ALIASES) {
    if (alias.re.test(q)) return alias.area;
  }
  return null;
}

/**
 * @param {Awaited<ReturnType<typeof loadMejoraContinuaForChat>> & { ok: true }} mejoraPayload
 * @param {string} question
 */
function buildFocusedMejoraContinuaContext(mejoraPayload, question) {
  const q = String(question || "");
  const { resumen, areas, year, month } = mejoraPayload;
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const areaFocus = resolveMejoraContinuaAreaFocus(q);
  const lines = [];

  lines.push(`MEJORA CONTINUA PRESIDENCIAL — Plan Maestro (${period})`);
  lines.push("");

  if (/cumplimiento/i.test(q) || /c[oó]mo\s+vamos/i.test(q)) {
    lines.push("RESUMEN DE CUMPLIMIENTO:");
    lines.push(`- Cumplimiento: ${resumen.cumplimiento}`);
    lines.push(`- Porcentaje: ${resumen.cumplimiento_pct}%`);
    lines.push(`- Verdes: ${resumen.verdes} | Amarillas: ${resumen.amarillas} | Rojas: ${resumen.rojas}`);
    lines.push("");
  }

  if (/riesgo|en\s+riesgo/i.test(q) || (/\bplan\s+maestro\b/i.test(q) && /\b(áreas?|areas?)\b/i.test(q))) {
    const enRiesgo = areas.filter((a) => a.estatus === "AMARILLO" || a.estatus === "ROJO");
    lines.push("ÁREAS EN RIESGO (AMARILLO o ROJO):");
    if (enRiesgo.length === 0) {
      lines.push("- Ninguna; las 5 áreas están en VERDE.");
    } else {
      for (const a of enRiesgo) {
        lines.push(
          `- ${a.area}: ${a.estatus} | evidencias en el mes: ${a.evidencias_mes} | abiertas: ${a.acciones_abiertas} | vencidas: ${a.acciones_vencidas}`
        );
      }
    }
    lines.push("");
  }

  if (/\b(no\s+tienen|sin)\s+evidencias?\b/i.test(q) || /\bevidencias?\b/i.test(q)) {
    const sinEvidencia = areas.filter((a) => a.evidencias_mes === 0);
    lines.push("ÁREAS SIN EVIDENCIA FOTOGRÁFICA EN EL MES:");
    if (sinEvidencia.length === 0) {
      lines.push("- Todas las áreas registraron al menos una evidencia en el mes.");
    } else {
      for (const a of sinEvidencia) {
        lines.push(`- ${a.area}: ${a.estatus} | abiertas: ${a.acciones_abiertas}`);
      }
    }
    lines.push("");
  }

  if (areaFocus) {
    const areaRow = areas.find((a) => a.area === areaFocus);
    lines.push(`ÁREA CONSULTADA: ${areaFocus.toUpperCase()}`);
    if (areaRow) {
      lines.push(`- Estatus: ${areaRow.estatus}`);
      lines.push(`- Evidencias en el mes: ${areaRow.evidencias_mes}`);
      lines.push(`- Acciones abiertas: ${areaRow.acciones_abiertas}`);
      lines.push(`- Acciones vencidas: ${areaRow.acciones_vencidas}`);
      lines.push(`- Cumple meta mensual: ${areaRow.cumple_meta_mensual ? "Sí" : "No"}`);
      if (areaRow.ultima_evidencia) lines.push(`- Última evidencia: ${areaRow.ultima_evidencia}`);
      if (areaRow.responsables.length > 0) {
        lines.push(`- Responsables: ${areaRow.responsables.join(", ")}`);
      }
      if (areaRow.acciones_destacadas.length > 0) {
        lines.push("- Acciones destacadas:");
        areaRow.acciones_destacadas.forEach((c, i) => {
          lines.push(
            `  ${i + 1}. ${c.title} (${c.responsable || "sin responsable"}) — evidencias mes: ${c.evidencias_mes}${c.vencida ? " — VENCIDA" : ""}`
          );
        });
      }
    } else {
      lines.push("- (área no encontrada en el payload)");
    }
    lines.push("");
  }

  lines.push("SEMÁFORO — 5 ÁREAS ESTRATÉGICAS:");
  for (const a of areas) {
    lines.push(
      `- ${a.area}: ${a.estatus} | evidencias mes: ${a.evidencias_mes} | abiertas: ${a.acciones_abiertas} | vencidas: ${a.acciones_vencidas}`
    );
    if (a.responsables.length > 0) {
      lines.push(`  Responsables: ${a.responsables.join(", ")}`);
    }
  }

  return {
    text: lines.join("\n"),
    meta: {
      mode: "mejora_continua",
      period,
      area: areaFocus,
      focus:
        areaFocus != null
          ? "area"
          : /cumplimiento/i.test(q)
            ? "resumen"
            : /riesgo/i.test(q)
              ? "riesgo"
              : /evidencias?/i.test(q)
                ? "evidencias"
                : "general",
    },
  };
}

/**
 * @param {Awaited<ReturnType<typeof loadMejoraContinuaForChat>> & { ok: true }} mejoraPayload
 * @param {string} question
 * @param {{ area?: string | null, focus?: string }} [meta]
 */
function inferMejoraContinuaSources(mejoraPayload, question, meta = {}) {
  const sources = new Set(["mejora_continua.resumen"]);
  const q = String(question || "").toLowerCase();

  if (/riesgo|áreas|areas|sem[aá]foro|evidencias?|plan\s+maestro|mejora\s+continua|c[oó]mo\s+vamos/.test(q)) {
    sources.add("mejora_continua.areas");
  }
  if (/cumplimiento/i.test(q)) {
    sources.add("mejora_continua.resumen");
  }
  const area = meta.area || resolveMejoraContinuaAreaFocus(question);
  if (area && mejoraPayload.areas.some((a) => a.area === area)) {
    sources.add(`mejora_continua.area.${area}`);
  }

  return [...sources].sort();
}

/**
 * @param {string} question
 */
function isAggregateQuestion(question) {
  return AGGREGATE_SIGNAL_RE.test(String(question || ""));
}

/**
 * Diagnóstico / riesgos / situación general de planta → contexto global, no subconjunto aislado.
 * @param {string} question
 */
function isPlantDiagnosticQuestion(question) {
  const q = String(question || "");
  if (isMejoraContinuaQuestion(q)) return false;
  if (isAggregateQuestion(q)) return true;
  if (PLANT_DIAGNOSTIC_SIGNAL_RE.test(q)) return true;
  if (/\briesgos?\b/i.test(q) && /\bplanta\b/i.test(q)) return true;
  if (/\bgerente\s+general\b/i.test(q) && /\b(deber[ií]a|esta\s+semana|prioridad|riesgo|hacer)\b/i.test(q)) {
    return true;
  }
  return false;
}

/**
 * @param {string} question
 */
function isNarrativeQuestion(question) {
  const q = String(question || "");
  if (isAggregateQuestion(q)) return false;
  return NARRATIVE_SIGNAL_RE.test(q);
}

function normalizePersonKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * @param {string} raw
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 */
function resolvePersonDisplayName(raw, chatContext) {
  const needle = normalizePersonKey(raw);
  if (!needle) return raw;
  let best = null;
  for (const r of chatContext.responsables || []) {
    const key = normalizePersonKey(r.name);
    if (key === needle || key.includes(needle) || needle.includes(key)) {
      if (!best || key.length < normalizePersonKey(best).length) best = r.name;
    }
  }
  if (best) return best;
  const first = needle.split(" ")[0];
  for (const r of chatContext.responsables || []) {
    const key = normalizePersonKey(r.name);
    if (key.startsWith(first) || key.includes(first)) return r.name;
  }
  return String(raw).trim();
}

/**
 * @param {string} question
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 * @returns {{ type: "tema", tema: string } | { type: "keyword", keyword: string } | { type: "person", name: string } | null}
 */
function resolveNarrativeFocus(question, chatContext) {
  const q = String(question || "");

  const personPatterns = [
    /acciones\s+de\s+([^\?\.]+)/i,
    /qué\s+acciones\s+tiene\s+([^\?\.]+)/i,
    /qué\s+est[aá]\s+haciendo\s+([^\?\.]+)/i,
    /qué\s+lleva\s+actualmente\s+([^\?\.]+)/i,
    /qué\s+proyectos?\s+lleva\s+actualmente\s+([^\?\.]+)/i,
    /qué\s+proyectos?\s+lleva\s+([^\?\.]+)/i,
  ];
  for (const re of personPatterns) {
    const m = q.match(re);
    if (m && m[1]) {
      const raw = m[1].trim().replace(/\s+(en|del|de|la|el)\s*$/i, "");
      if (raw.length >= 2 && !TEMA_QUERY_ALIASES.some((a) => a.tema && a.re.test(raw))) {
        return { type: "person", name: resolvePersonDisplayName(raw, chatContext) };
      }
    }
  }

  if (/quién\s+est[aá]\s+dando\s+seguimiento\s+a\s+(\w+)/i.test(q)) {
    const kw = q.match(/seguimiento\s+a\s+([^\?\.]+)/i);
    if (kw) return { type: "keyword", keyword: kw[1].trim().toLowerCase() };
  }

  if (/\bqué\s+tiene\s+pendiente\s+/i.test(q)) {
    for (const alias of TEMA_QUERY_ALIASES) {
      if (alias.tema && alias.re.test(q)) return { type: "tema", tema: alias.tema };
    }
  }

  for (const alias of TEMA_QUERY_ALIASES) {
    if (alias.re.test(q)) {
      if (alias.tema === "General" && /\bgerente\s+general\b/i.test(q)) continue;
      if (alias.keyword) return { type: "keyword", keyword: alias.keyword };
      if (alias.tema) return { type: "tema", tema: alias.tema };
    }
  }
  if (/\bproyectos?\b/i.test(q) && !/\bproyectos?\s+lleva\b/i.test(q)) {
    return { type: "keyword", keyword: "proyecto" };
  }
  return null;
}

function normalizeTemaKey(tema) {
  return String(tema || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 * @param {string} temaName
 */
function findTemaDetail(chatContext, temaName) {
  const key = normalizeTemaKey(temaName);
  return (chatContext.tema_details || []).find((t) => normalizeTemaKey(t.tema) === key) || null;
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 * @param {string} keyword
 */
function collectActionsByKeyword(chatContext, keyword) {
  const kw = String(keyword || "").toLowerCase();
  const rows = [];
  for (const td of chatContext.tema_details || []) {
    for (const a of td.open_actions || []) {
      const title = String(a.title || "").toLowerCase();
      const tema = String(td.tema || "").toLowerCase();
      if (title.includes(kw) || tema.includes(kw)) {
        rows.push({ ...a, tema: td.tema });
      }
    }
  }
  return rows;
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 * @param {string} personName
 */
function collectActionsByPerson(chatContext, personName) {
  const needle = personName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const rows = [];
  for (const td of chatContext.tema_details || []) {
    for (const a of td.open_actions || []) {
      const resp = String(a.responsable || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
      if (resp.includes(needle) || needle.includes(resp)) {
        rows.push({ ...a, tema: td.tema });
      }
    }
  }
  return rows;
}

/**
 * vencidas primero → dias_vencido DESC → abiertas por antigüedad
 * @param {Array<Record<string, unknown>>} actions
 */
function sortActionsForNarrative(actions) {
  return [...(actions || [])].sort((a, b) => {
    const av = Number(a.dias_vencido) > 0 ? 1 : 0;
    const bv = Number(b.dias_vencido) > 0 ? 1 : 0;
    if (bv !== av) return bv - av;
    if (bv && av && b.dias_vencido !== a.dias_vencido) return b.dias_vencido - a.dias_vencido;
    const da = a.dias_abierta ?? -1;
    const db = b.dias_abierta ?? -1;
    if (db !== da) return db - da;
    return String(a.title || "").localeCompare(String(b.title || ""), "es");
  });
}

/**
 * @param {number} index 1-based
 * @param {Record<string, unknown>} a
 * @param {{ includeTema?: boolean }} [opts]
 */
function formatActionExecutive(index, a, opts = {}) {
  const rol = a.role_name || "—";
  const resp = a.responsable || "—";
  const vencida = Number(a.dias_vencido) > 0;
  const lines = [
    `${index}. ${a.title}`,
    `   Responsable: ${resp}`,
    `   Rol: ${rol}`,
    `   Estado: ${vencida ? "Vencida" : "Abierta"}`,
  ];
  if (vencida) {
    lines.push(`   Días vencido: ${a.dias_vencido}`);
    if (a.prioridad) lines.push(`   Prioridad: ${a.prioridad}`);
  } else {
    if (a.created_at) lines.push(`   Fecha inicio: ${a.created_at}`);
    if (a.due_date) lines.push(`   Fecha compromiso: ${a.due_date}`);
    if (a.dias_abierta != null) lines.push(`   Días abierta: ${a.dias_abierta}`);
  }
  if (opts.includeTema && a.tema) lines.push(`   Tema: ${a.tema}`);
  return lines.join("\n");
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 */
function getPlantSummaryMetrics(chatContext) {
  const s = chatContext?.summary || {};
  return {
    open: Number(s.open) || 0,
    closed: Number(s.closed) || 0,
    overdue: Number(s.overdue) || 0,
  };
}

/**
 * Bloque mínimo de resumen global — obligatorio en modo focused (Sprint 2B.2).
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 */
function buildPlantSummaryBlock(chatContext) {
  const { open, closed, overdue } = getPlantSummaryMetrics(chatContext);
  const es = chatContext?.executive_summary;
  const lines = [
    "RESUMEN GLOBAL DE PLANTA (Action Register):",
    `- Acciones abiertas: ${open}`,
    `- Acciones cerradas: ${closed}`,
    `- Acciones vencidas (válidas): ${overdue}`,
  ];
  if (es?.risk_level) {
    lines.push(`- Nivel de riesgo ejecutivo: ${es.risk_level}`);
  }
  if (Array.isArray(es?.findings) && es.findings.length > 0) {
    lines.push("- Hallazgos ejecutivos:");
    for (const f of es.findings.slice(0, 5)) {
      lines.push(`  • ${f}`);
    }
  }
  lines.push("");
  lines.push(
    "IMPORTANTE: Un filtro sin coincidencias NO significa planta sin acciones. Para totales de planta usa siempre este resumen global."
  );
  return lines.join("\n");
}

/**
 * Prefijo enriquecido para preguntas de diagnóstico de planta.
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 */
function buildPlantDiagnosticUserPrefix(chatContext) {
  const lines = [buildPlantSummaryBlock(chatContext), ""];
  const top = chatContext?.top_overdue || [];
  if (top.length > 0) {
    lines.push("TOP ACCIONES VENCIDAS (referencia para riesgos):");
    top.slice(0, 5).forEach((a, i) => {
      lines.push(
        `${i + 1}. ${a.titulo || "(sin título)"} | Tema: ${a.tema || "—"} | Días vencido: ${a.dias_vencido ?? "—"} | Prioridad: ${a.prioridad || "—"}`
      );
    });
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/**
 * @param {Array<Record<string, unknown>>} actions
 * @param {{ includeTema?: boolean, titleOnly?: boolean, filterLabel?: string }} [opts]
 */
function formatActionsExecutiveSection(actions, opts = {}) {
  const sorted = sortActionsForNarrative(actions).slice(0, MAX_ACTIONS_FOR_NARRATIVE);
  const lines = ["ACCIONES ABIERTAS MÁS RELEVANTES", ""];
  if (sorted.length === 0) {
    const scope = opts.filterLabel ? ` (${opts.filterLabel})` : "";
    lines.push(`(No hay acciones coincidentes con esta consulta específica${scope})`);
    return lines.join("\n");
  }
  if (opts.titleOnly) {
    sorted.forEach((a, i) => lines.push(`${i + 1}. ${a.title}`));
  } else {
    sorted.forEach((a, i) => {
      lines.push(formatActionExecutive(i + 1, a, opts));
      lines.push("");
    });
  }
  return lines.join("\n").trimEnd();
}

function formatResponsablesList(responsables) {
  if (!responsables || responsables.length === 0) return "- (sin responsable asignado)";
  return responsables
    .map((r) => {
      const rol = r.role_name || r.role_key || "—";
      return `- ${r.name} (${rol})`;
    })
    .join("\n");
}

/**
 * @param {Array<Record<string, unknown>>} actions
 * @param {{ search_tokens?: string[] } | null | undefined} commercialResolution
 */
function filterActionsByCommercialTokens(actions, commercialResolution) {
  if (!commercialResolution?.search_tokens?.length) return actions;
  const filtered = (actions || []).filter(
    (a) =>
      textMatchesCommercialTokens(a.title, commercialResolution.search_tokens) ||
      textMatchesCommercialTokens(a.tema, commercialResolution.search_tokens)
  );
  return filtered.length > 0 ? filtered : actions;
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 * @param {string} question
 * @param {{ search_tokens?: string[] } | null | undefined} [commercialResolution]
 * @returns {{ text: string, meta: object }}
 */
function buildFocusedNarrativeContext(chatContext, question, commercialResolution = null) {
  const focus = resolveNarrativeFocus(question, chatContext);
  const lines = [buildPlantSummaryBlock(chatContext), ""];

  if (!focus) {
    lines.push("CONTEXTO FOCALIZADO: sin tema o responsable detectado en la pregunta.");
    const fallbackActions = [];
    for (const td of (chatContext.tema_details || []).slice(0, 2)) {
      fallbackActions.push(...(td.open_actions || []).map((a) => ({ ...a, tema: td.tema })));
    }
    lines.push("");
    lines.push(formatActionsExecutiveSection(fallbackActions, { includeTema: true, filterLabel: "sin filtro de tema" }));
    return {
      text: lines.join("\n"),
      meta: { mode: "focused", focus: "fallback", focus_type: "fallback", tema: null },
    };
  }

  if (focus.type === "person") {
    const actions = filterActionsByCommercialTokens(
      collectActionsByPerson(chatContext, focus.name),
      commercialResolution
    );
    const displayName = focus.name;
    lines.push(`RESPONSABLE CONSULTADO: ${displayName.toUpperCase()}`);
    lines.push("");
    lines.push(
      formatActionsExecutiveSection(actions, {
        includeTema: true,
        filterLabel: `responsable ${displayName}`,
      })
    );
    const resp = (chatContext.responsables || []).find(
      (r) => normalizePersonKey(r.name) === normalizePersonKey(displayName)
    );
    lines.push("");
    lines.push("MÉTRICAS DEL RESPONSABLE (referencia al final de la respuesta):");
    if (resp) {
      lines.push(`- Acciones abiertas: ${resp.open_count}`);
      lines.push(`- Vencidas válidas: ${resp.overdue_count}`);
      if (resp.role_name) lines.push(`- Rol: ${resp.role_name}`);
    } else {
      lines.push(`- Acciones listadas arriba: ${Math.min(actions.length, MAX_ACTIONS_FOR_NARRATIVE)}`);
    }
    return {
      text: lines.join("\n"),
      meta: {
        mode: "focused",
        focus: "person",
        focus_type: "person",
        name: displayName,
        action_count: actions.length,
      },
    };
  }

  if (focus.type === "keyword") {
    const actions = filterActionsByCommercialTokens(
      collectActionsByKeyword(chatContext, focus.keyword),
      commercialResolution
    );
    lines.push(`TEMA / BÚSQUEDA CONSULTADA: ${focus.keyword.toUpperCase()}`);
    lines.push("");
    lines.push(
      formatActionsExecutiveSection(actions, {
        includeTema: true,
        filterLabel: `búsqueda ${focus.keyword}`,
      })
    );
    lines.push("");
    lines.push("MÉTRICAS (referencia al final de la respuesta):");
    lines.push(`- Acciones encontradas con evidencia: ${actions.length}`);
    return {
      text: lines.join("\n"),
      meta: {
        mode: "focused",
        focus: "keyword",
        focus_type: "keyword",
        keyword: focus.keyword,
        action_count: actions.length,
      },
    };
  }

  const td = findTemaDetail(chatContext, focus.tema);
  const temaRow = (chatContext.temas || []).find(
    (t) => normalizeTemaKey(t.name) === normalizeTemaKey(focus.tema)
  );

  lines.push(`TEMA CONSULTADO: ${String(focus.tema).toUpperCase()}`);
  lines.push("");
  lines.push(
    formatActionsExecutiveSection(
      filterActionsByCommercialTokens(td?.open_actions || [], commercialResolution),
      {
        filterLabel: `tema ${focus.tema}`,
      }
    )
  );
  lines.push("");
  lines.push("RESPONSABLES PRINCIPALES:");
  lines.push(formatResponsablesList(td?.responsables || []));
  lines.push("");
  lines.push("MÉTRICAS (referencia al final de la respuesta):");
  if (td) {
    lines.push(`- Acciones abiertas: ${td.open_count}`);
    lines.push(`- Vencidas válidas: ${td.overdue_count}`);
  } else if (temaRow) {
    lines.push(`- Acciones abiertas (tema): ${temaRow.open_count}`);
    lines.push(`- Vencidas válidas (tema): ${temaRow.overdue_count}`);
  }
  if (temaRow) {
    lines.push(`- Avance del tema: ${temaRow.progress_percent}%`);
    lines.push(`- Cerradas en el tema: ${temaRow.closed_count}`);
  }
  if (chatContext.invalid_overdue?.count > 0) {
    lines.push(
      `- Nota: ${chatContext.invalid_overdue.count} vencidas con fecha inválida excluidas del análisis ejecutivo`
    );
  }

  return {
    text: lines.join("\n"),
    meta: {
      mode: "focused",
      focus: "tema",
      focus_type: "tema",
      tema: focus.tema,
      open_actions: (td?.open_actions || []).length,
    },
  };
}

/**
 * Extrae el subconjunto de contexto enviado al modelo (sin board ni celdas).
 * @param {Awaited<ReturnType<typeof buildDirectorIaContextPayload>>} fullPayload
 */
function extractChatContextFromPayload(fullPayload) {
  const ar = fullPayload?.action_register;
  if (!ar || !ar.ok) return null;
  return {
    summary: ar.summary,
    executive_summary: ar.executive_summary,
    temas: ar.temas,
    responsables: ar.responsables,
    top_overdue: ar.top_overdue,
    invalid_overdue: ar.invalid_overdue,
    tema_details: ar.tema_details || [],
    dicf_details: ar.dicf_details || [],
    bitacora: fullPayload?.bitacora || [],
    cliente_comentarios: fullPayload?.cliente_comentarios || [],
    folio_comentarios: fullPayload?.folio_comentarios || [],
  };
}

function prependCommercialEntitiesBlock(userContent, opts) {
  if (!opts.commercialEntitiesBlock) return userContent;
  return `${opts.commercialEntitiesBlock}\n\n${userContent}`;
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} context
 * @param {string} question
 * @param {{ useFocused?: boolean, focusedText?: string, commercialEntitiesBlock?: string, commercialResolution?: object }} [opts]
 */
function buildDirectorIaChatPrompt(context, question, opts = {}) {
  const q = String(question || "").trim();
  let userContent;
  let systemPrompt = DIRECTOR_IA_SYSTEM_PROMPT;
  let promptMode = "full";

  if (opts.mejoraContinua && opts.useFocused && opts.focusedText) {
    promptMode = "mejora_continua";
    systemPrompt = DIRECTOR_IA_SYSTEM_PROMPT_MEJORA_CONTINUA;
    userContent = [
      "Contexto de Mejora Continua Presidencial (única fuente de verdad para esta respuesta):",
      opts.focusedText,
      "",
      "Pregunta del ejecutivo:",
      q,
      "",
      "Responde usando el semáforo, cumplimiento y responsables del contexto. No uses datos fuera de este bloque.",
    ].join("\n");
  } else if (opts.igfArrFocused && opts.useFocused && opts.focusedText) {
    promptMode = "igf_arr_focused";
    systemPrompt = `${DIRECTOR_IA_SYSTEM_PROMPT}\n\n${IGF_ARR_ANNEX_SYSTEM_ADDENDUM}`;
    userContent = [
      "Contexto financiero IGF Forecast ARR (fuente principal para esta respuesta):",
      opts.focusedText,
      "",
      "Pregunta del ejecutivo:",
      q,
      "",
      "Si la pregunta es de margen, responde primero con COMPARACION MARGEN $/kg (mes previo, mes actual y delta). Sé breve y ejecutivo. No inventes cifras fuera de este bloque.",
    ].join("\n");
  } else if (opts.monthlyIntegrated && opts.useFocused && opts.focusedText) {
    promptMode = "monthly_integrated";
    systemPrompt = DIRECTOR_IA_SYSTEM_PROMPT_MONTHLY_INTEGRATED;
    userContent = [
      "Contexto integrado por mes (Bitácora IA + DICF + Action Register):",
      opts.focusedText,
      "",
      "Pregunta del ejecutivo:",
      q,
      "",
      MONTHLY_INTEGRATED_RESPONSE_RULE,
      opts.clientNameLookup ? CLIENT_NAME_LOOKUP_RESPONSE_RULE : "",
    ]
      .filter(Boolean)
      .join("\n");
  } else if (opts.bitacoraOnlyFallback && opts.bitacoraAnnexText) {
    promptMode = "bitacora_focused";
    systemPrompt = opts.bitacoraPrioritized
      ? `${DIRECTOR_IA_SYSTEM_PROMPT_BITACORA}\n\n${BITACORA_RECENT_PRIORITY_ADDENDUM}`
      : DIRECTOR_IA_SYSTEM_PROMPT_BITACORA;
    const intro = opts.bitacoraPrioritized
      ? "Contexto principal — Bitácora IA (información de campo más reciente que cierres DICF históricos):"
      : "Nota: No se encontró contexto suficiente en Action Register/DICF; se responde con Bitácora IA.";
    userContent = [
      intro,
      "",
      opts.bitacoraAnnexText.replace(/^---\nANEXO — BITÁCORA IA \([^)]+\)\n/, "CONTEXTO BITÁCORA IA:\n"),
      "",
      "Pregunta del ejecutivo:",
      q,
      "",
      opts.bitacoraPrioritized
        ? `Responde priorizando las sesiones de bitácora más recientes. ${BITACORA_MONTHLY_RESPONSE_RULE} No conviertas notas en acciones ni compromisos.`
        : `Responde con base en las sesiones de bitácora. ${BITACORA_MONTHLY_RESPONSE_RULE} No conviertas notas en acciones ni compromisos.`,
    ].join("\n");
  } else if (opts.commercialStateFocused && opts.useFocused && opts.focusedText) {
    promptMode = "commercial_state";
    systemPrompt = DIRECTOR_IA_SYSTEM_PROMPT_COMMERCIAL_STATE;
    userContent = [
      opts.focusedText,
      "",
      "Pregunta del ejecutivo:",
      q,
      "",
      "Responde listando los clientes de la categoría indicada. Usa solo nombres presentes en ESTADO COMERCIAL ACTUAL.",
    ].join("\n");
  } else if (opts.dicfFocused && opts.useFocused && opts.focusedText) {
    promptMode = "dicf_focused";
    systemPrompt = DIRECTOR_IA_SYSTEM_PROMPT_DICF;
    userContent = [
      "Contexto DICF / Ventas / Clientes (incluye historial y resultados de cierre):",
      opts.focusedText,
      "",
      "Pregunta del ejecutivo:",
      q,
      "",
      "Usa resultado_cierre e historial cuando respondas. Cita el resultado de cierre literalmente si existe.",
      DICF_MONTHLY_RESPONSE_RULE,
    ].join("\n");
  } else if (opts.useFocused && opts.focusedText) {
    promptMode = "focused";
    systemPrompt = DIRECTOR_IA_SYSTEM_PROMPT_NARRATIVE;
    userContent = [
      "Contexto focalizado (incluye resumen global de planta + detalle consultado):",
      opts.focusedText,
      "",
      "Pregunta del ejecutivo:",
      q,
      "",
      "Recuerda: inicia con las actividades (títulos en ACCIONES ABIERTAS MÁS RELEVANTES) cuando existan. Usa RESUMEN GLOBAL DE PLANTA para totales. Métricas al final.",
    ].join("\n");
  } else {
    const contextJson = JSON.stringify(context, null, 2);
    const prefixParts = [];
    if (opts.plantDiagnosticPrefix) {
      prefixParts.push(opts.plantDiagnosticPrefix);
    } else if (opts.includePlantSummaryPrefix) {
      prefixParts.push(buildPlantSummaryBlock(context));
    }
    const prefix = prefixParts.length ? `${prefixParts.join("\n\n")}\n\n` : "";
    userContent = [
      prefix,
      opts.plantDiagnosticPrefix
        ? "Contexto operativo agregado de la planta (diagnóstico / riesgos):"
        : "Contexto operativo agregado de la planta:",
      contextJson,
      "",
      "Pregunta del ejecutivo:",
      q,
    ].join("\n");
  }

  const hasBitacoraAnnex = Boolean(
    opts.bitacoraAnnexText &&
      !opts.bitacoraOnlyFallback &&
      !opts.monthlyIntegrated &&
      promptMode !== "mejora_continua"
  );
  if (hasBitacoraAnnex) {
    userContent = `${userContent}\n\n${opts.bitacoraAnnexText}`;
    if (!systemPrompt.includes("Bitácora IA")) {
      systemPrompt = `${systemPrompt}\n\n${BITACORA_ANNEX_SYSTEM_ADDENDUM}`;
    }
  }

  const hasComentariosAnnex = Boolean(
    opts.comentariosAnnexText && promptMode !== "mejora_continua" && !opts.igfArrFocused
  );
  if (hasComentariosAnnex) {
    userContent = `${userContent}\n\n${opts.comentariosAnnexText}`;
    if (!systemPrompt.includes("ANEXO — COMENTARIOS")) {
      systemPrompt = `${systemPrompt}\n\n${COMENTARIOS_ANNEX_SYSTEM_ADDENDUM}`;
    }
  }

  const hasIgfArrAnnex = Boolean(
    opts.igfArrAnnexText && !opts.igfArrFocused && promptMode !== "mejora_continua"
  );
  if (hasIgfArrAnnex) {
    userContent = `${userContent}\n\n${opts.igfArrAnnexText}`;
    if (!systemPrompt.includes("ANEXO — IGF") && !systemPrompt.includes("IGF / ARR")) {
      systemPrompt = `${systemPrompt}\n\n${IGF_ARR_ANNEX_SYSTEM_ADDENDUM}`;
    }
  }

  if (opts.commercialEntitiesBlock && promptMode !== "mejora_continua") {
    userContent = prependCommercialEntitiesBlock(userContent, opts);
    if (!systemPrompt.includes("ENTIDADES COMERCIALES")) {
      systemPrompt = `${systemPrompt}\n\n${COMMERCIAL_ENTITY_SYSTEM_ADDENDUM}`;
    }
  }

  return {
    systemPrompt,
    userContent,
    promptMode,
    hasBitacoraAnnex,
    hasIgfArrAnnex,
  };
}

function isAiEnabled() {
  return process.env.AI_ENABLED === "true" || process.env.AI_ENABLED === "1";
}

/** Evita clasificar como smalltalk preguntas de negocio aunque empiecen con saludo corto. */
const SMALLTALK_BLOCK_RE =
  /\b(mantenimiento|seguridad|clientes?|acciones?|vencid|riesgos?|dicf|ventas?|demanda|gerente|bitacora|visita|reuni[oó]n|plan\s+maestro|mejora\s+continua|c[oó]mo\s+va|qu[eé]\s+pas[oó]|dejaron\s+de\s+comprar|dejo\s+de\s+comprar|responsable|taller|contrataciones?|oportunidades?|evidencia|presidencia)\b/i;

function normalizeSmalltalkText(question) {
  return String(question || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¡!?.,"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSmalltalkBlockSignal(question) {
  return SMALLTALK_BLOCK_RE.test(String(question || ""));
}

/**
 * Saludos, ayuda y cierres breves — sin OpenAI ni contexto Action Register.
 * @returns {{ mode: "smalltalk" | "help" | "thanks" } | null}
 */
function classifyConversationalIntent(question) {
  const raw = String(question || "").trim();
  if (!raw) return null;
  if (hasSmalltalkBlockSignal(raw)) return null;

  const t = normalizeSmalltalkText(raw);

  const helpPatterns = [
    /^ayuda$/,
    /^que puedes hacer$/,
    /^que puedo preguntarte$/,
    /^como me puedes ayudar$/,
    /^como puedes ayudarme$/,
    /^en que me puedes ayudar$/,
    /^que haces$/,
    /^para que sirves$/,
  ];
  if (helpPatterns.some((re) => re.test(t))) {
    return { mode: "help" };
  }

  const thanksPatterns = [
    /^(gracias|muchas gracias|ok|okey|okay|entendido|vale|perfecto|de acuerdo|listo|muy bien)$/,
  ];
  if (thanksPatterns.some((re) => re.test(t))) {
    return { mode: "thanks" };
  }

  const greetingPatterns = [
    /^(hola|hola director|hola director ia|buenos dias|buen dia|buenas tardes|buenas noches|que tal|saludos)$/,
  ];
  if (greetingPatterns.some((re) => re.test(t))) {
    return { mode: "smalltalk" };
  }

  return null;
}

function buildConversationalAnswer(mode, plantLabel) {
  const plant = (plantLabel && String(plantLabel).trim()) || "";
  if (mode === "help") {
    const helpPlant = plant || "la planta";
    return `Puedo ayudarte a revisar el estado ejecutivo de ${helpPlant}. Algunos ejemplos de preguntas útiles:

- ¿Cómo va mantenimiento?
- ¿Qué acciones están vencidas?
- ¿Qué riesgos tiene la planta?
- ¿Qué clientes dejaron de comprar?
- ¿Qué oportunidades se identificaron en la última visita?
- ¿Qué debe hacer el gerente esta semana?`;
  }
  if (mode === "thanks") {
    return "Con gusto. Cuando necesites, puedo ayudarte a revisar el estado de la planta.";
  }
  return buildNeutralGreeting(plant);
}

function conversationalPromptMode(mode) {
  if (mode === "help") return "help";
  return "smalltalk";
}

/**
 * @param {number} plantaId
 * @param {import("express").Request} [req]
 */
async function resolvePlantaLabelForChat(plantaId, req) {
  const bodyName = req?.body?.planta_nombre;
  if (bodyName && String(bodyName).trim()) {
    return String(bodyName).trim();
  }
  const pool = chatDeps.pool;
  if (pool) {
    try {
      const r = await pool.query(
        `SELECT nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`,
        [plantaId]
      );
      const row = r.rows && r.rows[0];
      if (row) {
        return String(row.nombre || row.clave || `Planta ${plantaId}`).trim();
      }
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] resolvePlantaLabelForChat:", e.message);
    }
  }
  return `Planta ${plantaId}`;
}

/**
 * @param {string} systemPrompt
 * @param {string} userContent
 * @returns {Promise<string | null>}
 */
async function openaiDirectorIaChat(systemPrompt, userContent) {
  if (typeof chatDeps.openaiChat === "function") {
    try {
      const text = await chatDeps.openaiChat(systemPrompt, userContent);
      return text ? String(text).trim() : null;
    } catch (e) {
      console.error("[director-ia-chat] OpenAI inject error:", e && e.message);
      return null;
    }
  }
  if (!isAiEnabled()) return null;
  if (!OPENAI_API_KEY) {
    console.warn("[director-ia-chat] OPENAI_API_KEY no configurada");
    return null;
  }
  try {
    const r = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 1000,
        temperature: 0.2,
      },
      {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        timeout: 45000,
      }
    );
    const text = r.data?.choices?.[0]?.message?.content;
    return text ? String(text).trim() : null;
  } catch (e) {
    console.error("[director-ia-chat] OpenAI error:", e.response?.data || e.message);
    return null;
  }
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} context
 * @param {string} question
 * @param {string} answer
 * @param {{ promptMode?: string }} [opts]
 * @returns {string[]}
 */
function inferSourcesFromChat(context, question, answer, opts = {}) {
  let sources;

  if (opts.promptMode === "bitacora_focused" && opts.bitacoraOnlyFallback) {
    sources = ["bitacora_ia.sessions", "bitacora_ia.context"];
  } else if (opts.promptMode === "igf_arr_focused") {
    sources = ["igf.forecast", "arr.forecast", "igf_arr.annex"];
  } else if (opts.promptMode === "monthly_integrated") {
    sources = [
      "bitacora_ia.sessions",
      "bitacora_ia.context",
      "action_register.dicf_details",
      "dicf.historial",
      "action_register.summary",
      "action_register.tema_details",
    ];
    if (opts.commercialResolution?.entidades?.length) {
      sources.push("comercial_entidades.canonico");
    }
    sources = [...new Set(sources)].sort();
  } else if (opts.promptMode === "commercial_state") {
    const cat = opts.commercialCategory || "dejaron";
    sources = ["commercial_state.dicf_compute", `commercial_state.${cat}`];
    if (opts.commercialResolution?.entidades?.length) {
      sources.push("comercial_entidades.canonico");
      if (opts.commercialResolution.entidades.some((e) => e.match_type === "alias")) {
        sources.push("comercial_entidades.alias");
      }
    }
    sources = [...new Set(sources)].sort();
  } else if (opts.promptMode === "dicf_focused") {
    sources = ["action_register.dicf_details", "dicf.historial"];
  } else {
    const sourceSet = new Set();
    const q = String(question || "").toLowerCase();
    const a = String(answer || "").toLowerCase();
    const blob = `${q} ${a}`;

    sourceSet.add("action_register.summary");

    if (opts.promptMode === "focused" || isNarrativeQuestion(question)) {
      sourceSet.add("action_register.tema_details");
    }

    if (isDicfActionQuestionForChat(question)) {
      sourceSet.add("action_register.dicf_details");
      sourceSet.add("dicf.historial");
    }

    if (
      /responsab|vencid|abiert|retraso|concentra|quién|quien/.test(blob) ||
      /más vencidas|mas vencidas/.test(q)
    ) {
      sourceSet.add("action_register.responsables");
    }
    if (/tema|mantenimiento|clientes|seguridad|operaci|avance|progreso/.test(blob)) {
      sourceSet.add("action_register.temas");
    }
    if (/riesgo|hallazgo|presidencia|resumen|situaci|estado actual|ejecutivo/.test(blob)) {
      sourceSet.add("action_register.executive_summary");
    }
    if (/atrasad|crític|critica|prioridad|acción|accion|vencid/.test(blob)) {
      sourceSet.add("action_register.top_overdue");
    }
    if (
      (context?.invalid_overdue?.count > 0 && /inválid|invalid|calidad|exclu/.test(blob)) ||
      /fecha inválid/.test(blob)
    ) {
      sourceSet.add("action_register.invalid_overdue");
    }

    if (isAggregateQuestion(question)) {
      sourceSet.add("action_register.executive_summary");
      if (/vencid/.test(q)) sourceSet.add("action_register.top_overdue");
    }

    sources = [...sourceSet].sort();
  }

  if (opts.hasBitacoraAnnex) {
    const merged = new Set(sources);
    merged.add("bitacora_ia.context");
    merged.add("bitacora_ia.sessions");
    sources = [...merged].sort();
  }

  if (opts.hasIgfArrAnnex) {
    const merged = new Set(sources);
    if (isIgfForecastQuestion(question) || /\bmargen\b/i.test(String(question || ""))) {
      merged.add("igf.forecast");
    }
    if (isArrForecastQuestion(question) || /\bdescuento|venta|arr\b/i.test(String(question || ""))) {
      merged.add("arr.forecast");
    }
    if (/\bdejaron|aumentaron|disminuyeron|nuevos|delta\b/i.test(String(question || ""))) {
      merged.add("commercial_state.dicf_compute");
    }
    merged.add("igf_arr.annex");
    sources = [...merged].sort();
  }

  if (opts.commercialResolution?.entidades?.length) {
    const merged = new Set(sources);
    merged.add("comercial_entidades.canonico");
    if (opts.commercialResolution.entidades.some((e) => e.match_type === "alias")) {
      merged.add("comercial_entidades.alias");
    }
    sources = [...merged].sort();
  }

  return sources;
}

/**
 * Resuelve el modo de chat sin llamar a OpenAI (pruebas de routing Sprint 2B).
 * @param {string} question
 * @param {ReturnType<typeof extractChatContextFromPayload> | null} chatContext
 */
function resolveDirectorIaChatRouting(question, chatContext) {
  const q = String(question || "").trim();
  if (isMejoraContinuaQuestion(q)) {
    return { promptMode: "mejora_continua", mejoraContinua: true };
  }
  if (!chatContext) {
    return { promptMode: "full", error: "no_context" };
  }

  const hasBitacoraData = shouldAttachBitacoraAnnex(q, chatContext);
  const wantCommercialState = isCommercialStateListQuestion(q);
  const wantFinancialKpi = isPlantFinancialKpiQuestion(q);
  const wantMonthlyIntegrated =
    !wantFinancialKpi && shouldUseMonthlyIntegratedChat(q, chatContext);
  const wantDicf =
    !wantCommercialState &&
    !wantFinancialKpi &&
    !wantMonthlyIntegrated &&
    shouldUseDicfFocusedChat(q, chatContext);
  const hasAr = hasRelevantActionRegisterContext(chatContext, q);

  if (wantCommercialState) {
    return {
      promptMode: "commercial_state",
      commercialState: true,
      commercialCategory: resolveCommercialStateCategory(q) || "dejaron",
      hasBitacoraAnnex: hasBitacoraData,
      hasIgfArrAnnex: shouldAttachIgfArrAnnex(q),
    };
  }
  if (wantFinancialKpi) {
    return { promptMode: "igf_arr_focused", igfArrFocused: true };
  }
  if (wantMonthlyIntegrated) {
    return { promptMode: "monthly_integrated", monthlyIntegrated: true };
  }
  if (wantDicf) {
    return {
      promptMode: "dicf_focused",
      dicfFocused: true,
      hasBitacoraAnnex: hasBitacoraData,
    };
  }
  if (isPlantDiagnosticQuestion(q)) {
    return {
      promptMode: "full",
      plantDiagnostic: true,
      hasBitacoraAnnex: hasBitacoraData,
      aggregate: true,
    };
  }
  if (isNarrativeQuestion(q)) {
    return {
      promptMode: "focused",
      narrative: true,
      hasBitacoraAnnex: hasBitacoraData,
    };
  }
  if (hasBitacoraData && !hasAr && !isAggregateQuestion(q)) {
    return { promptMode: "bitacora_focused", bitacoraOnlyFallback: true };
  }
  return {
    promptMode: "full",
    hasBitacoraAnnex: hasBitacoraData,
    aggregate: isAggregateQuestion(q),
  };
}

function continuityNeedsUniqueEntity(turn) {
  if (!turn) return false;
  if (turn.cross_metric_switch) return false;
  if (turn.restore_previous && String(turn.entity_hint || "").trim()) return true;
  if (turn.kind === "pronoun" || turn.kind === "action") return true;
  if (turn.kind === "entity_intro" && String(turn.entity_hint || "").trim()) return true;
  return false;
}

function keepDailyPreviousFrame(continuityTurn, echoedState) {
  return (
    Boolean(continuityTurn && continuityTurn.cross_metric_switch) &&
    Boolean(
      echoedState &&
        (echoedState.parent_intent === "daily_sales_deviation" ||
          echoedState.parent_intent === "daily_discount_deviation")
    )
  );
}

function conversationStateForIntent(opts, incoming, newIntent, restorePrevious) {
  const previous_frame =
    opts && opts.keepIncomingPreviousFrame
      ? sanitizePreviousFrame(incoming && incoming.previous_frame, opts.plantaId)
      : resolveOutgoingPreviousFrame(incoming, newIntent, restorePrevious);
  const forecast_run =
    opts && Object.prototype.hasOwnProperty.call(opts, "forecast_run")
      ? opts.forecast_run
      : incoming && incoming.forecast_run;
  return buildConversationState({
    ...opts,
    previous_frame,
    forecast_run,
  });
}

function resolveEntityAgainstAssembled(turn, assembled) {
  const hint = turn && turn.entity_hint;
  if (!hint) return { status: "none" };
  const extra =
    typeof chatDeps.resolveConversationCandidates === "function"
      ? chatDeps.resolveConversationCandidates() || []
      : [];
  const candidates = [...collectEntityCandidatesFromEvidence(assembled), ...extra];
  return resolveUniqueEntity(hint, candidates);
}

function getPersistentMemoryStore() {
  return chatDeps.persistentMemoryStore || null;
}

async function persistPendingWorkItemSafe(opts) {
  const store = getPersistentMemoryStore();
  if (!store) return null;
  if (
    !persistentMemory.shouldAutoCreate({
      parent_intent: opts.parent_intent,
      plantaAuthorized: opts.plantaAuthorized,
      userScopeKey: opts.userScopeKey,
      entity: opts.entity,
      entityResolutionStatus: "unique",
      gap: opts.gap,
    }) &&
    !opts.forceSameShape
  ) {
    return null;
  }
  const built = persistentMemory.buildWorkItemFromEntity({
    userScopeKey: opts.userScopeKey,
    plantaId: opts.plantaId,
    parent_intent: opts.parent_intent,
    entity: opts.entity,
    gap: opts.gap,
  });
  if (!built) return null;
  return persistentMemory.upsertActiveWorkItem(store, built);
}

async function revalidateRetrievedItem(store, item, assembled, entityResolution) {
  if (!item) return { item: null, status: null };
  const entity = entityResolution && entityResolution.status === "unique" ? entityResolution.entity : null;
  const freshGap = derivePendingInformationGap(assembled, entity);
  const closed = persistentMemory.freshGapClosesStored(item.pending_information_gap, freshGap, entity);
  const actionClosed = persistentMemory.actionLooksClosed(entity);
  const decision = persistentMemory.revalidateWorkItem(item, {
    entityResolutionStatus: entityResolution ? entityResolution.status : "none",
    freshGapClosed: closed,
    currentActionClosed: actionClosed,
  });
  let updated = item;
  if (decision.next_status !== "active") {
    updated = (await persistentMemory.updateWorkItemStatus(store, item.id, decision.next_status)) || item;
  } else {
    updated = (await persistentMemory.markRevalidated(store, item.id)) || item;
  }
  return { item: updated, status: decision.next_status, freshGap, reason: decision.reason };
}

function buildActionPersonChatResult(opts) {
  const planta_id = opts.planta_id;
  const focus = opts.focus;
  const state = conversationStateForIntent(
    {
      plantaId: planta_id,
      parent_intent: "action_status",
      active_entities: opts.active_entities || [],
      last_evidence_bundle_type: "action_status",
      pending_information_gap: opts.pending_information_gap || null,
    },
    opts.incomingState,
    "action_status",
    Boolean(opts.restorePrevious)
  );
  return {
    ok: true,
    answer: opts.answer,
    sources: opts.sources || focus.provenance || ["arr.action_register_items"],
    context_meta: {
      mode: "action_status",
      prompt_mode: opts.prompt_mode || "action_person",
      openai_called: Boolean(opts.openai_called),
      requires_clarification: Boolean(opts.requires_clarification),
      planta_id,
      timestamp: new Date().toISOString(),
      conversation_state: state,
      pending_information_gap: opts.pending_information_gap || null,
      action_person: {
        mode: focus.mode,
        action_count: (focus.rows || []).length,
        responsible: focus.responsable ? focus.responsable.display : null,
      },
    },
  };
}

async function handleActionStatusPersonChat({
  req,
  planta_id,
  question,
  continuityTurn,
  echoedState,
}) {
  const restoreEntities =
    continuityTurn && continuityTurn.restore_previous
      ? (continuityTurn.previous_frame && continuityTurn.previous_frame.active_entities) || []
      : (echoedState && echoedState.active_entities) || [];
  const echoedEntity = sanitizeActiveEntities(
    continuityTurn.plant_mismatch ? [] : restoreEntities
  )[0] || null;
  const tryPerson =
    Boolean(echoedEntity && (echoedEntity.kind === "ar_responsable" || echoedEntity.kind === "ar_action")) ||
    hasProperPersonSpan(question) ||
    hasAccionToken(question) ||
    hasVencidToken(question);
  if (!tryPerson) return null;

  const loadFn = chatDeps.loadActionPersonBoardForChat || loadActionPersonBoardForChat;
  let loaded;
  try {
    loaded = await loadFn(chatDeps.pool, planta_id, req, {
      ensureActionRegisterTables: chatDeps.ensureActionRegisterTables,
    });
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: (e && e.message) || "No se pudo cargar Action Register",
    };
  }
  if (loaded && loaded.ok === false) {
    return {
      ok: false,
      status: loaded.status || 500,
      code: loaded.code || "TOOL_ERROR",
      error: loaded.error || "No se pudo cargar Action Register",
    };
  }
  const items = (loaded && loaded.items) || [];
  let focus = resolveActionPersonFocus({
    items,
    question,
    echoedEntity,
  });
  if (focus.mode === "none") return null;

  if (focus.rows && focus.rows.some((r) => r.dicf_id) && chatDeps.pool) {
    focus.rows = await attachDicfHistorialFromPool(chatDeps.pool, focus.rows);
    focus.limitations = limitationsForRows(focus.rows);
    if (focus.mode === "many_actions") {
      focus.limitations = [...focus.limitations, "multiples_acciones_no_elegir_en_silencio"];
    }
    if (focus.rows.length === 1) focus.action = focus.rows[0];
  }

  if (focus.mode === "ambiguous_people") {
    const names = focus.people.map((p) => p.display).join(", ");
    return buildActionPersonChatResult({
      planta_id,
      focus,
      answer:
        `Hay más de un responsable registrado que coincide (${names}). Precisa el nombre. No elijo en silencio.`,
      openai_called: false,
      requires_clarification: true,
      prompt_mode: "action_person_clarify",
      active_entities: [],
      incomingState: echoedState,
      restorePrevious: Boolean(continuityTurn && continuityTurn.restore_previous),
    });
  }

  if (focus.mode === "no_responsible" || focus.mode === "zero_actions") {
    const who = focus.responsable ? ` de ${focus.responsable.display}` : "";
    return buildActionPersonChatResult({
      planta_id,
      focus,
      answer:
        `No encontré acciones asociadas${who} en el Action Register de esta planta. ` +
        "Eso no prueba incumplimiento; es ausencia en el registro consultado.",
      openai_called: false,
      prompt_mode: "action_person_absence",
      active_entities: focus.responsable ? activeEntitiesFromFocus(focus) : [],
      incomingState: echoedState,
      restorePrevious: Boolean(continuityTurn && continuityTurn.restore_previous),
    });
  }

  const hasInjectedOpenAi = typeof chatDeps.openaiChat === "function";
  if (!hasInjectedOpenAi && !isAiEnabled()) {
    return { ok: false, error: "Chat IA no disponible (AI_ENABLED)", status: 503 };
  }
  if (!hasInjectedOpenAi && !OPENAI_API_KEY) {
    return { ok: false, error: "Chat IA no disponible (clave)", status: 503 };
  }

  const pendingGap = pendingGapFromFocus(focus);
  const state = conversationStateForIntent(
    {
      plantaId: planta_id,
      parent_intent: "action_status",
      active_entities: activeEntitiesFromFocus(focus),
      last_evidence_bundle_type: "action_status",
      pending_information_gap: pendingGap,
    },
    echoedState,
    "action_status",
    Boolean(continuityTurn && continuityTurn.restore_previous)
  );
  const prompt = buildActionPersonPrompt(focus, question);
  const userContent = prependHiloToUserContent(prompt.userContent, state);
  const answer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
  if (!answer) {
    return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
  }
  return buildActionPersonChatResult({
    planta_id,
    focus,
    answer,
    openai_called: true,
    pending_information_gap: pendingGap,
    active_entities: activeEntitiesFromFocus(focus),
    sources: [...new Set((focus.rows || []).flatMap((r) => r.provenance || []))],
    incomingState: echoedState,
    restorePrevious: Boolean(continuityTurn && continuityTurn.restore_previous),
  });
}

async function handleExecutiveStatusForChat(opts) {
  const {
    req,
    uiPlantaId,
    question,
    continuityTurn,
    echoedState,
  } = opts;
  const auth = (req && req.dashboardAuth) || {};
  const plantLabel =
    (req && req.body && req.body.planta_nombre) ||
    (await resolvePlantaLabelForChat(uiPlantaId, req));
  const catalog = await loadPlantCatalog(chatDeps.pool, chatDeps.plantCatalog);
  const scope = resolveSemanticScope(question, {
    ui_planta_id: uiPlantaId,
    ui_plant_label: plantLabel,
    plant_catalog: catalog,
    auth,
    ui_plant_anchor: req && req.body && req.body.ui_plant_anchor,
  });
  if (scope.action === "ASK_CLARIFICATION") {
    return buildScopeClarificationResult({
      clarification: scope.clarification,
      planta_id: uiPlantaId,
      scope_source: scope.scope_source,
    });
  }
  if (scope.action === "NOT_AUTHORIZED") {
    return {
      ok: false,
      status: scope.status || 403,
      code: scope.code || "SOURCE_RESTRICTED",
      error: scope.error || "Sin acceso a esta planta",
    };
  }

  const targetPlantId = scope.planta_id;
  const loadFn = chatDeps.loadPlantDiagnosisForChat || loadPlantDiagnosisForChat;
  let assembled;
  try {
    assembled = await loadFn(chatDeps.pool, targetPlantId, req, {
      question,
      loadIgfArrBlocks: chatDeps.loadIgfArrBlocks,
      loadActionRegister: chatDeps.loadActionRegister,
      loadDicf: chatDeps.loadDicf,
      loadBitacora: chatDeps.loadBitacora,
      loadCommercialStateSelect: chatDeps.loadCommercialStateSelect,
      ensureActionRegisterTables: chatDeps.ensureActionRegisterTables,
    });
  } catch (e) {
    directorIaDebug("[DIRECTOR_IA] executive_status load error:", e && e.message);
    return {
      ok: false,
      status: 500,
      error: (e && e.message) || "No se pudo ensamblar evidencia de planta",
    };
  }
  if (assembled && assembled.abort) {
    return {
      ok: false,
      status: assembled.status || 403,
      code: assembled.code || "SOURCE_RESTRICTED",
      error: assembled.error || "Sin acceso a esta planta",
    };
  }
  if (!assembled || assembled.ok === false) {
    return {
      ok: false,
      status: (assembled && assembled.status) || 500,
      error: (assembled && assembled.error) || "No se pudo ensamblar evidencia de planta",
    };
  }

  let trend = null;
  const trendFn = chatDeps.loadCommercialTrendForChat || loadCommercialTrendForChat;
  try {
    trend = await trendFn(chatDeps.pool, targetPlantId, req, {
      question,
      channel: "both",
      range_days: 30,
      compare: true,
    });
    if (trend && trend.abort) {
      trend = { ok: false, abort: true, code: trend.code, availability: "NOT_AUTHORIZED" };
    }
  } catch (e) {
    directorIaDebug("[DIRECTOR_IA] executive_status trend:", e && e.message);
    trend = { ok: false, availability: "UNAVAILABLE" };
  }

  let forecastParity = null;
  const { parseCutoffYmd, parseYearMonth } = require("./director-ia-dashboard-forecast-adapter");
  const plantCode = resolveDirectorIaPlantCode(assembled);
  let lastUpload = null;
  const preResolved = resolveDirectorIaEffectiveCutoff({
    question,
    body: req && req.body,
    lastUpload: null,
  });
  if (!preResolved.cutoff && plantCode) {
    const ymAssembled = parseYearMonth(assembled);
    const loadLast = chatDeps.loadArrLastUploadDay;
    if (typeof loadLast === "function" && chatDeps.pool && ymAssembled) {
      try {
        lastUpload = await loadLast(chatDeps.pool, ymAssembled.year, ymAssembled.month, {
          plant_code: plantCode,
        });
      } catch (e) {
        directorIaDebug("[DIRECTOR_IA] last-upload-day:", e && e.message);
      }
    }
  }
  const cutoffResolution = resolveDirectorIaEffectiveCutoff({
    question,
    body: req && req.body,
    lastUpload,
  });
  let resolvedCutoff = cutoffResolution.cutoff;
  let cutoffSource = cutoffResolution.source;
  try {
    const adapter = require("./director-ia-dashboard-forecast-adapter");
    const loadParity = chatDeps.loadDashboardForecastParity || adapter.loadDashboardForecastParity;
    forecastParity = await loadParity(chatDeps.pool, {
      assembled,
      upload_day: resolvedCutoff,
      cutoff_date: resolvedCutoff,
    });
  } catch (e) {
    directorIaDebug("[DIRECTOR_IA] executive_status forecast parity:", e && e.message);
    forecastParity = { ok: true, reachable: false };
  }
  const loadMini = chatDeps.loadIgfForecastMiniPayload;
  let miniLoaded = false;
  if (typeof loadMini === "function" && chatDeps.pool && resolvedCutoff) {
    try {
      const { readIgfForecastMiniAuthoritative } = require("./director-ia-dashboard-forecast-adapter");
      const ym = (forecastParity && forecastParity.period) || parseYearMonth(assembled) || {};
      const plantName = (assembled.plant && assembled.plant.planta_nombre) || plantLabel;
      const miniPayload = await loadMini(chatDeps.pool, {
        year: ym.year,
        month: ym.month,
        plantName,
        upload_day: resolvedCutoff,
      });
      miniLoaded = true;
      if (!forecastParity || typeof forecastParity !== "object") {
        forecastParity = { ok: true, reachable: false };
      }
      forecastParity.mini = readIgfForecastMiniAuthoritative(miniPayload, plantName, plantCode);
      const mini = forecastParity.mini || {};
      mini.cutoff_date = resolvedCutoff;
      if (forecastParity.period) {
        forecastParity.period.cutoff_date = resolvedCutoff;
        forecastParity.period.cutoff_source = cutoffSource;
      }
      if (forecastParity.actual_to_date) {
        forecastParity.actual_to_date.cutoff_date = resolvedCutoff;
      }
      if (mini.venta_ton != null || mini.desc_kg != null) {
        const prev = forecastParity.forecast || {};
        forecastParity.forecast = {
          venta_ton: mini.venta_ton != null ? mini.venta_ton : prev.venta_ton,
          desc_kg: mini.desc_kg != null ? mini.desc_kg : prev.desc_kg,
          cutoff_date: resolvedCutoff,
          source: mini.source,
          truth_semantics: "FORECAST_PROJECTION",
          governed_by: "computeIgfForecastMiniPayload",
        };
      }
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] executive_status mini payload:", e && e.message);
    }
  }

  const pack = buildExecutiveStatusPack({
    assembled,
    trend,
    scope: { ...scope, plant_name: scope.plant_name || plantLabel },
    forecastParity,
  });
  const hasInjectedOpenAi = typeof chatDeps.openaiChat === "function";
  if (!hasInjectedOpenAi && !isAiEnabled()) {
    return { ok: false, error: "Director IA CEL: AI_ENABLED=false", status: 503 };
  }
  if (!hasInjectedOpenAi && !OPENAI_API_KEY) {
    return { ok: false, error: "OPENAI_API_KEY ausente para CEL", status: 503 };
  }
  const prompt = buildExecutiveStatusPrompt(pack, question);
  const ymForRun = (forecastParity && forecastParity.period) || parseYearMonth(assembled) || {};
  const requestedUploadDay = parseCutoffYmd(
    (req && req.body && (req.body.upload_day || req.body.cutoff_date)) || null
  );
  const forecastRun = buildForecastRunIdentity({
    plant_code: plantCode,
    year: ymForRun.year,
    month: ymForRun.month,
    upload_day: requestedUploadDay || resolvedCutoff,
    cutoff: resolvedCutoff,
    source: cutoffSource,
  });
  const state = conversationStateForIntent(
    {
      plantaId: targetPlantId,
      parent_intent: "plant_diagnosis",
      active_entities: [],
      last_evidence_bundle_type: "plant_diagnosis",
      forecast_run: forecastRun,
    },
    echoedState,
    "plant_diagnosis",
    Boolean(continuityTurn && continuityTurn.restore_previous)
  );
  let userContent = prependHiloToUserContent(prompt.userContent, state);
  const rawAnswer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
  if (!rawAnswer) {
    return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
  }
  const answer = applyExecutiveLanguageGuard(rawAnswer, pack);
  const result = buildExecutiveStatusChatResult(assembled, pack, {
    answer,
    planta_id: targetPlantId,
    openai_called: true,
  });
  if (result && result.context_meta) {
    result.context_meta.conversation_state = state;
    const mini = forecastParity && forecastParity.mini;
    const miniAvailable = Boolean(
      mini && (mini.venta_ton != null || mini.desc_kg != null || mini.util_oper_importe != null)
    );
    result.context_meta.requested_upload_day = requestedUploadDay;
    result.context_meta.effective_cutoff_date = resolvedCutoff;
    result.context_meta.cutoff_source = cutoffSource;
    result.context_meta.cutoff_origin = forecastRun.cutoff_origin;
    result.context_meta.corte_day = forecastRun.corte_day;
    result.context_meta.forecast_run = forecastRun;
    result.context_meta.authoritative_mini_available = miniAvailable;
    result.context_meta.authoritative_source = miniAvailable
      ? "computeIgfForecastMiniPayload"
      : null;
    result.context_meta.fallback_used = !miniAvailable;
    result.context_meta.mini_loader_invoked = miniLoaded;
    result.context_meta.plant_code = plantCode;
    result.context_meta.question_explicit_cutoff = parseExplicitCutoffFromQuestion(question);
  }
  return result;
}

function handleCutoffExplainForChat({ req, planta_id, echoedState, question }) {
  const previousRun = sanitizeForecastRun(echoedState && echoedState.forecast_run);
  let run = previousRun && previousRun.effective_cutoff_date ? previousRun : null;
  if (!run) {
    const current = resolveDirectorIaEffectiveCutoff({
      question,
      body: req && req.body,
      lastUpload: null,
    });
    if (current.cutoff) {
      run = buildForecastRunIdentity({
        plant_code: previousRun && previousRun.plant_code,
        year: previousRun && previousRun.year,
        month: previousRun && previousRun.month,
        upload_day: current.cutoff,
        cutoff: current.cutoff,
        source: current.source,
      });
    } else {
      run = previousRun || buildForecastRunIdentity({ cutoff: null, source: null });
    }
  }
  const dateEs = run && run.effective_cutoff_date ? formatForecastCutoffDateEs(run.effective_cutoff_date) : null;
  const state = conversationStateForIntent(
    {
      plantaId: planta_id,
      parent_intent: (echoedState && echoedState.parent_intent) || "plant_diagnosis",
      active_entities: (echoedState && echoedState.active_entities) || [],
      last_evidence_bundle_type: (echoedState && echoedState.last_evidence_bundle_type) || "plant_diagnosis",
      forecast_run: run,
    },
    echoedState,
    (echoedState && echoedState.parent_intent) || "plant_diagnosis",
    false
  );
  const answer = dateEs
    ? `Usé el corte del ${dateEs}.`
    : "No tengo un corte de corrida anterior en este hilo. Sin cutoff explícito, upload_day ni last-upload de esta planta, el forecast PROM no está disponible. No adivino la fecha a partir de un número.";
  return {
    ok: true,
    answer,
    sources: dateEs ? ["forecast_run"] : [],
    context_meta: {
      mode: "cutoff_explain",
      prompt_mode: "cutoff_explain",
      openai_called: false,
      requires_clarification: false,
      planta_id,
      timestamp: new Date().toISOString(),
      conversation_state: state,
      forecast_run: run,
      effective_cutoff_date: (run && run.effective_cutoff_date) || null,
      cutoff_origin: (run && run.cutoff_origin) || "UNAVAILABLE",
      corte_day: (run && run.corte_day) || null,
    },
  };
}

/**
 * @param {import("express").Request} req
 * @param {number} plantaId
 * @param {string} question
 * @param {object} [_user] identidad opcional; scope de memoria usa dashboardAuth.actor_id
 */
async function askDirectorIa(req, plantaId, question, _user) {
  if (!isDirectorIaEnabled()) {
    return { enabled: false };
  }

  const rawQuestion = String(question || "").trim();
  const chatHistory = Array.isArray(req.body?.history) ? req.body.history : [];
  const q = expandQuestionFromChatHistory(rawQuestion, chatHistory);
  if (!q) {
    return { ok: false, error: "question requerido", status: 400 };
  }

  const planta_id = Number(plantaId);
  if (!Number.isFinite(planta_id) || planta_id <= 0) {
    return { ok: false, error: "planta_id inválido", status: 400 };
  }

  const echoedState =
    req.body && req.body.conversation_state && typeof req.body.conversation_state === "object"
      ? req.body.conversation_state
      : null;
  const continuityTurn = resolveConversationTurn({
    question: rawQuestion,
    history: chatHistory,
    plantaId: planta_id,
    echoedState,
    detectIntent: detectDirectorIaIntent,
  });

  const memoryTurn = persistentMemory.classifyPersistentMemoryTurn(rawQuestion);
  const userScopeKey = persistentMemory.resolveUserScopeKey(req, _user);
  const plantaAuthorized = persistentMemory.isPlantCurrentlyAuthorized(req, planta_id);
  const memoryStore = getPersistentMemoryStore();
  let resumeItems = [];
  let resumeItem = null;

  if (memoryStore && userScopeKey && plantaAuthorized && memoryTurn.kind === "dismiss") {
    const dismissed = await persistentMemory.dismissMatching(memoryStore, {
      userScopeKey,
      plantaId: planta_id,
      entityHint: memoryTurn.entity_hint || continuityTurn.entity_hint,
    });
    return {
      ok: true,
      answer: dismissed.length
        ? "Descarté el pendiente de trabajo. Eso no borra evidencia de negocio ni concede acceso."
        : "No encontré un pendiente activo para descartar en esta planta.",
      sources: [],
      context_meta: {
        mode: "persistent_memory_dismiss",
        openai_called: false,
        planta_id,
        timestamp: new Date().toISOString(),
        conversation_state: emptyConversationState(planta_id),
        work_item_memory: {
          retrieved: false,
          dismissed: dismissed.map((d) => d.id),
          memory_is_not_evidence: true,
        },
      },
    };
  }

  if (
    memoryStore &&
    userScopeKey &&
    plantaAuthorized &&
    memoryTurn.kind === "resume" &&
    !continuityTurn.standalone &&
    !continuityTurn.restore_previous
  ) {
    resumeItems = await persistentMemory.retrieveActiveWorkItems(memoryStore, {
      userScopeKey,
      plantaId: planta_id,
      entityHint: memoryTurn.entity_hint || continuityTurn.entity_hint,
      limit: 3,
    });
    if (resumeItems.length > 1 && !memoryTurn.entity_hint && !continuityTurn.entity_hint) {
      const names = resumeItems.map((it) => it.entity_display).join(", ");
      return {
        ok: true,
        answer:
          `Hay más de un pendiente de trabajo en esta planta (${names}). ` +
          "Precisa de cuál hablamos. Eso es contexto de trabajo, no el estado actual del cliente.",
        sources: [],
        context_meta: {
          mode: "persistent_memory_clarify",
          openai_called: false,
          requires_clarification: true,
          planta_id,
          timestamp: new Date().toISOString(),
          conversation_state: emptyConversationState(planta_id),
          work_item_memory: { retrieved: true, count: resumeItems.length, memory_is_not_evidence: true },
        },
      };
    }
    resumeItem = resumeItems[0] || null;
    if (resumeItem && !continuityTurn.entity_hint) {
      continuityTurn.entity_hint = memoryTurn.entity_hint || resumeItem.entity_display;
    }
  }

  const convo = classifyConversationalIntent(q);
  if (convo) {
    const plantLabel = await resolvePlantaLabelForChat(planta_id, req);
    directorIaDebug("[DIRECTOR_IA] conversational_intent:", convo.mode, plantLabel);
    return {
      ok: true,
      answer: buildConversationalAnswer(convo.mode, plantLabel),
      sources: [],
      context_meta: {
        planta_id,
        timestamp: new Date().toISOString(),
        prompt_mode: conversationalPromptMode(convo.mode),
        focus_type: convo.mode,
        conversational: true,
        bitacora_annex: false,
        planta_open: 0,
        planta_closed: 0,
        planta_overdue: 0,
        focus: { mode: convo.mode, conversational: true },
        comercial_entidades: [],
      },
    };
  }

  // Fase 1 veracidad: dominios no integrados → respuesta honesta sin OpenAI ni contexto.
  // Excepción mínima: este slice usa “depósito/cierre” como estatus de folio, no cheques.
  const unsupportedCap = detectUnsupportedDirectorIaDomain(q);
  const reviewableSupportsTurn =
    isIgfReviewableSupportsQuestion(q) ||
    (continuityTurn.inherit && continuityTurn.inherit_parent_intent === "igf_reviewable_supports");
  if (unsupportedCap && !(reviewableSupportsTurn && unsupportedCap.id === "cheques")) {
    directorIaDebug("[DIRECTOR_IA] capability_limitation:", unsupportedCap.id);
    return buildUnsupportedDomainChatResult(unsupportedCap, { planta_id });
  }

  // Fase 2/3: planner + tool plan. duplicate_folios / M3 / M9 se ejecutan in-process;
  // el resto de tools no se despacha de forma genérica.
  const planOptions = {};
  if (continuityTurn.inherit && continuityTurn.inherit_parent_intent) {
    if (continuityTurn.inherit_parent_intent === "daily_sales_deviation") {
      planOptions.forceIntent = "daily_sales_deviation";
    } else if (continuityTurn.inherit_parent_intent === "daily_discount_deviation") {
      planOptions.forceIntent = "daily_discount_deviation";
    } else if (continuityTurn.inherit_parent_intent === "client_profile") {
      planOptions.forceIntent = "client_profile";
    } else if (continuityTurn.inherit_parent_intent === "taller_mayor") {
      planOptions.forceIntent = "taller_mayor";
    } else if (continuityTurn.inherit_parent_intent === "pre_meeting_brief") {
      planOptions.forceIntent = "pre_meeting_brief";
    } else if (continuityTurn.inherit_parent_intent === "month_close_result") {
      planOptions.forceIntent = "month_close_result";
    } else {
      planOptions.inheritParentIntent = continuityTurn.inherit_parent_intent;
    }
  } else if (resumeItem && resumeItem.parent_intent && !continuityTurn.standalone) {
    planOptions.inheritParentIntent = resumeItem.parent_intent;
  } else if (memoryTurn.kind === "remember") {
    const supported = ["plant_diagnosis", "expediente_comercial"].includes(continuityTurn.parent_intent)
      ? continuityTurn.parent_intent
      : "plant_diagnosis";
    const echoedEntity =
      echoedState && echoedState.active_entities && echoedState.active_entities[0]
        ? echoedState.active_entities[0].display
        : null;
    if (memoryTurn.entity_hint || echoedEntity) {
      planOptions.inheritParentIntent = supported;
      if (!continuityTurn.entity_hint) {
        continuityTurn.entity_hint = memoryTurn.entity_hint || echoedEntity;
      }
    }
  }
  const directorIaPlan = planDirectorIaQuestion(q, planOptions);
  const executiveNeed = resolveExecutiveNeed(q);
  if (executiveNeed.steering_frontier || isSteeringReadQuestion(q)) {
    directorIaDebug("[DIRECTOR_IA] steering frontier (chat read PENDING)");
    return buildSteeringFrontierResult({ planta_id });
  }
  if (shouldHandleExecutiveStatus(executiveNeed, continuityTurn, directorIaPlan.intent)) {
    directorIaDebug("[DIRECTOR_IA] executive_status CEL slice C");
    return handleExecutiveStatusForChat({
      req,
      uiPlantaId: planta_id,
      question: q,
      continuityTurn,
      echoedState,
    });
  }
  if (isCutoffExplainQuestion(rawQuestion)) {
    directorIaDebug("[DIRECTOR_IA] cutoff_explain from forecast_run metadata");
    return handleCutoffExplainForChat({
      req,
      planta_id,
      echoedState,
      question: rawQuestion,
    });
  }
  if (continuityTurn.out_of_slice_clarify) {
    directorIaDebug("[DIRECTOR_IA] continuity out_of_slice:", continuityTurn.kind);
    return buildUnknownClarificationResult({
      planta_id,
      reason:
        "Ese cambio de periodo o de tema anterior está fuera del hilo actual. No heredo semana, ayer ni un tema apilado.",
      conversation_state: preserveFramesOnClarify(echoedState, planta_id),
    });
  }
  if (directorIaPlan.intent === "unknown" && !continuityTurn.inherit) {
    directorIaDebug("[DIRECTOR_IA] unknown without valid continuity");
    return buildUnknownClarificationResult({
      planta_id,
      reason: directorIaPlan.clarification_reason || null,
      conversation_state:
        continuityTurn.kind === "plant_switch"
          ? parkCurrentAndClear(echoedState, planta_id)
          : preserveFramesOnClarify(echoedState, planta_id),
    });
  }
  const directorIaToolPlan = buildDirectorIaToolPlan(directorIaPlan, {
    planta_id,
    question: q,
    user: _user,
  });
  directorIaDebug("[DIRECTOR_IA] planner:", directorIaPlan);
  directorIaDebug("[DIRECTOR_IA] tool_plan:", directorIaToolPlan);

  if (directorIaPlan.intent === "dashboard_kpis") {
    directorIaDebug("[DIRECTOR_IA] dashboard_kpis in-process");
    const kpisPayload = await loadDashboardKpisForChat(chatDeps.pool, planta_id, req);
    return buildDashboardKpisChatResult(kpisPayload, { planta_id });
  }

  if (directorIaPlan.intent === "project_status") {
    if (directorIaPlan.requires_clarification) {
      directorIaDebug("[DIRECTOR_IA] project_status clarification");
      return buildProjectStatusClarificationChatResult({
        planta_id,
        clarification_reason: directorIaPlan.clarification_reason,
      });
    }
    directorIaDebug("[DIRECTOR_IA] project_status in-process");
    const proyectosPayload = await loadProyectosForChat(chatDeps.pool, planta_id, req);
    return buildProyectosChatResult(proyectosPayload, { planta_id });
  }

  if (directorIaPlan.intent === "folio_status") {
    directorIaDebug("[DIRECTOR_IA] folio_status in-process");
    const folioStatusPayload = await loadFolioStatusForChat(chatDeps.pool, planta_id, req, { question: q });
    return buildFolioStatusChatResult(folioStatusPayload, { planta_id });
  }

  if (directorIaPlan.intent === "folio_history") {
    directorIaDebug("[DIRECTOR_IA] folio_history in-process");
    const folioHistoryPayload = await loadFolioHistoryForChat(chatDeps.pool, planta_id, req, { question: q });
    return buildFolioHistoryChatResult(folioHistoryPayload, { planta_id });
  }

  if (directorIaPlan.intent === "folio_documents") {
    directorIaDebug("[DIRECTOR_IA] folio_documents metadata in-process");
    const folioDocsPayload = await loadFolioDocumentsMetadataForChat(chatDeps.pool, planta_id, req, { question: q });
    return buildFolioDocumentsMetadataChatResult(folioDocsPayload, { planta_id });
  }

  if (directorIaPlan.intent === "igf_reviewable_supports") {
    directorIaDebug("[DIRECTOR_IA] igf_reviewable_supports in-process");
    const loadFn = chatDeps.loadIgfReviewableSupportsForChat || loadIgfReviewableSupportsForChat;
    const supportsPayload = await loadFn(chatDeps.pool, planta_id, req, {
      question: q,
      activeDate: continuityTurn.active_date || undefined,
    });
    if (supportsPayload && supportsPayload.ok === false && supportsPayload.status) {
      return {
        ok: false,
        status: supportsPayload.status,
        code: supportsPayload.code,
        error: supportsPayload.error || "No se pudo consultar apoyos reviewable",
      };
    }
    const mes = supportsPayload && supportsPayload.periodo && supportsPayload.periodo.mes_cargo;
    const state = conversationStateForIntent(
      {
        plantaId: planta_id,
        parent_intent: "igf_reviewable_supports",
        last_evidence_bundle_type: "igf_reviewable_supports",
        active_date: mes ? `${mes}-01` : continuityTurn.active_date || null,
      },
      echoedState,
      "igf_reviewable_supports",
      false
    );
    let answer = null;
    let openaiCalled = false;
    const hasInjectedOpenAi = typeof chatDeps.openaiChat === "function";
    if (supportsPayload && supportsPayload.ok === true && (hasInjectedOpenAi || isAiEnabled())) {
      const prompt = buildIgfReviewableSupportsPrompt(supportsPayload, q);
      const gptAnswer = await openaiDirectorIaChat(prompt.systemPrompt, prompt.userContent);
      if (gptAnswer) {
        answer = gptAnswer;
        openaiCalled = true;
      }
    }
    const result = buildIgfReviewableSupportsChatResult(supportsPayload, {
      planta_id,
      question: q,
      answer: answer || undefined,
      openai_called: openaiCalled,
    });
    if (result && result.context_meta) {
      result.context_meta.conversation_state = state;
    }
    return result;
  }

  if (directorIaPlan.intent === "clasificacion_apoyos_query") {
    directorIaDebug("[DIRECTOR_IA] clasificacion_apoyos_query in-process");
    const clasificacionPayload = await loadClasificacionApoyosForChat(chatDeps.pool, planta_id, req, {
      question: q,
    });
    return buildClasificacionApoyosChatResult(clasificacionPayload, { planta_id });
  }

  if (directorIaPlan.intent === "budget_status") {
    directorIaDebug("[DIRECTOR_IA] budget_status in-process");
    const loadPresupuesto = chatDeps.loadPresupuestoSemanalForChat || loadPresupuestoSemanalForChat;
    const presupuestoPayload = await loadPresupuesto(chatDeps.pool, planta_id, req, {
      question: q,
    });
    const presupuestoResult = buildPresupuestoSemanalChatResult(presupuestoPayload, { planta_id });
    if (presupuestoResult && presupuestoResult.context_meta) {
      presupuestoResult.context_meta.conversation_state = conversationStateForIntent(
        { plantaId: planta_id, parent_intent: null },
        echoedState,
        "budget_status",
        false
      );
    }
    return presupuestoResult;
  }

  if (directorIaPlan.intent === "revision_notes") {
    directorIaDebug("[DIRECTOR_IA] revision_notes in-process");
    const notesPayload = await loadActionRegisterRevisionNotesForChat(chatDeps.pool, planta_id, req, {
      question: q,
    });
    return buildRevisionNotesChatResult(notesPayload, { planta_id });
  }

  if (directorIaPlan.intent === "expediente_comercial") {
    directorIaDebug("[DIRECTOR_IA] expediente_comercial in-process");
    const dossierQuestion =
      continuityTurn.entity_hint && !/\bexpediente\b/i.test(q)
        ? `expediente comercial de ${continuityTurn.entity_hint}`
        : q;
    const dossierPayload = await loadCommercialDossierForChat(chatDeps.pool, planta_id, req, {
      question: dossierQuestion,
    });
    const result = buildCommercialDossierChatResult(dossierPayload, { planta_id });
    const entity =
      dossierPayload && dossierPayload.ok && dossierPayload.client_identity
        ? [
            {
              kind: "client",
              display: dossierPayload.client_identity.cliente_nombre,
              cliente_key: (dossierPayload.client_identity.cliente_keys || [])[0] || null,
              cliente_keys: dossierPayload.client_identity.cliente_keys || [],
            },
          ]
        : [];
    const state = conversationStateForIntent(
      {
        plantaId: planta_id,
        parent_intent: "expediente_comercial",
        active_entities: entity,
        last_evidence_bundle_type: "expediente_comercial",
        pending_information_gap: null,
      },
      echoedState,
      "expediente_comercial",
      Boolean(continuityTurn.restore_previous)
    );
    const restricted =
      (dossierPayload && dossierPayload.abort) ||
      (result && result.context_meta && result.context_meta.veracity === "SOURCE_RESTRICTED");
    if (result && result.context_meta) {
      result.context_meta.conversation_state = state;
      result.context_meta.work_item_memory = { retrieved: Boolean(resumeItem), memory_is_not_evidence: true };
    }
    if (restricted) {
      if (result && result.context_meta) {
        result.context_meta.work_item_memory = { retrieved: false, memory_is_not_evidence: true };
      }
      return result;
    }
    if (resumeItem && memoryStore) {
      if (!entity.length) {
        await persistentMemory.updateWorkItemStatus(memoryStore, resumeItem.id, "stale");
        if (result.context_meta) {
          result.context_meta.work_item_memory = {
            retrieved: true,
            id: resumeItem.id,
            status: "stale",
            memory_is_not_evidence: true,
          };
        }
      } else {
        await persistentMemory.markRevalidated(memoryStore, resumeItem.id);
        const prefix = persistentMemory.formatWorkItemHiloForModel(resumeItem);
        result.answer = `${prefix}\n\n${result.answer || ""}`;
        if (result.context_meta) {
          result.context_meta.work_item_memory = {
            retrieved: true,
            id: resumeItem.id,
            status: "active",
            memory_is_not_evidence: true,
          };
        }
      }
    }
    return result;
  }

  if (directorIaPlan.intent === "taller_at") {
    directorIaDebug("[DIRECTOR_IA] taller_at in-process");
    const loadTaller = chatDeps.loadTallerAtForChat || loadTallerAtForChat;
    const tallerPayload = await loadTaller(chatDeps.pool, planta_id, req, {
      question: q,
    });
    const tallerResult = buildTallerAtChatResult(tallerPayload, { planta_id });
    if (tallerResult && tallerResult.context_meta) {
      tallerResult.context_meta.conversation_state = conversationStateForIntent(
        { plantaId: planta_id, parent_intent: null },
        echoedState,
        "taller_at",
        false
      );
    }
    return tallerResult;
  }

  if (directorIaPlan.intent === "expense_analysis") {
    if ((directorIaPlan.domains || []).includes("taller_at")) {
      directorIaDebug("[DIRECTOR_IA] taller_at remains unsupported");
      return buildUnsupportedDomainChatResult(getDirectorIaCapability("taller_at"), { planta_id });
    }
    directorIaDebug("[DIRECTOR_IA] expense_analysis in-process");
    const gastosPayload = await loadGastosInversionesForChat(chatDeps.pool, planta_id, req, {
      question: q,
      category: "GASTOS",
    });
    return buildGastosInversionesChatResult(gastosPayload, { planta_id, category: "GASTOS" });
  }

  if (directorIaPlan.intent === "investment_analysis") {
    directorIaDebug("[DIRECTOR_IA] investment_analysis in-process");
    const invPayload = await loadGastosInversionesForChat(chatDeps.pool, planta_id, req, {
      question: q,
      category: "INVERSIONES",
    });
    return buildGastosInversionesChatResult(invPayload, { planta_id, category: "INVERSIONES" });
  }

  if (directorIaPlan.intent === "duplicate_folios") {
    directorIaDebug("[DIRECTOR_IA] duplicate_folios in-process");
    const duplicatePayload = await loadDuplicateFoliosForChat(chatDeps.pool, planta_id, req);
    return buildDuplicateFoliosChatResult(duplicatePayload, { planta_id });
  }

  if (directorIaPlan.intent === "daily_executive_brief") {
    directorIaDebug("[DIRECTOR_IA] daily_executive_brief in-process");
    const loadFn = chatDeps.loadDailyExecutiveBriefForChat || loadDailyExecutiveBriefForChat;
    let assembled;
    try {
      assembled = await loadFn(chatDeps.pool, planta_id, req, {
        question: q,
        targetDate: continuityTurn.active_date || undefined,
        todayYmd: chatDeps.dailyTodayYmd || undefined,
        now: chatDeps.dailyNow || undefined,
        loadSales: chatDeps.loadDailySalesDeviationForChat,
        loadDiscount: chatDeps.loadDailyDiscountDeviationForChat,
        resolvePlanta: chatDeps.resolveDailyPlanta,
        resolveSalesPlanta: chatDeps.resolveDailyPlanta,
        resolveDiscountPlanta: chatDeps.resolveDailyDiscountPlanta,
        querySalesRows: chatDeps.queryDailySalesRows,
        queryComments: chatDeps.queryDailyComments,
        queryActions: chatDeps.queryDailyActions,
        queryDiscountRows: chatDeps.queryDailyDiscountRows,
        queryKgRows: chatDeps.queryDailyDiscountKgRows,
        queryDiscountComments: chatDeps.queryDailyDiscountComments,
        queryDiscountActions: chatDeps.queryDailyDiscountActions,
      });
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] daily_executive_brief load error:", e && e.message);
      return {
        ok: false,
        status: 500,
        error: (e && e.message) || "No se pudo ensamblar el brief ejecutivo diario",
      };
    }
    if (assembled && assembled.abort) {
      return {
        ok: false,
        status: assembled.status || 403,
        code: assembled.code || "SOURCE_RESTRICTED",
        error: assembled.error || "Sin acceso al brief diario",
      };
    }
    if (!assembled || assembled.ok === false) {
      return {
        ok: false,
        status: (assembled && assembled.status) || 500,
        error: (assembled && assembled.error) || "No se pudo ensamblar el brief ejecutivo diario",
      };
    }
    const hasInjectedOpenAiBrief = typeof chatDeps.openaiChat === "function";
    if (!hasInjectedOpenAiBrief && !isAiEnabled()) {
      return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
    }
    if (!hasInjectedOpenAiBrief && !OPENAI_API_KEY) {
      return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
    }
    const prompt = buildDailyExecutiveBriefPrompt(assembled, q);
    const pendingGap =
      assembled.pending_information_gap || deriveBriefPendingInformationGap(assembled);
    const state = conversationStateForIntent(
      {
        plantaId: planta_id,
        parent_intent: "daily_executive_brief",
        active_entities: carryActiveEntities(continuityTurn, echoedState, { status: "none" }),
        last_evidence_bundle_type: "daily_executive_brief",
        pending_information_gap: pendingGap,
        active_date: assembled.target_date,
        keepIncomingPreviousFrame: keepDailyPreviousFrame(continuityTurn, echoedState),
      },
      echoedState,
      "daily_executive_brief",
      Boolean(continuityTurn.restore_previous)
    );
    const userContent = prependHiloToUserContent(prompt.userContent, state);
    const answer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
    if (!answer) {
      return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
    }
    const result = buildDailyExecutiveBriefChatResult(assembled, {
      answer,
      planta_id,
      openai_called: true,
    });
    if (result && result.context_meta) {
      result.context_meta.conversation_state = state;
      result.context_meta.pending_information_gap = pendingGap;
      result.context_meta.work_item_memory = {
        retrieved: false,
        memory_is_not_evidence: true,
        daily_not_persisted: true,
      };
    }
    return result;
  }

  if (directorIaPlan.intent === "pre_meeting_brief") {
    const usePreClose =
      typeof isPreCloseQuestion === "function" &&
      (isPreCloseQuestion(q) ||
        (echoedState && echoedState.cycle_mode === "PRE_CLOSE" && continuityTurn.inherit_parent_intent === "pre_meeting_brief"));
    if (usePreClose) {
      directorIaDebug("[DIRECTOR_IA] pre_close composer in-process");
      const loadFn = chatDeps.composeExecutiveCycle || composeExecutiveCycle;
      let assembled;
      try {
        assembled = await loadFn(chatDeps.pool, planta_id, req, {
          question: q,
          now: chatDeps.preMeetingNow || chatDeps.dailyNow || undefined,
          openYearMonth: chatDeps.preMeetingOpenYearMonth,
          auth: req && req.dashboardAuth,
          forcePortfolio:
            Boolean(echoedState && echoedState.portfolio_scope === "PORTFOLIO") &&
            echoedState.cycle_mode === "PRE_CLOSE" &&
            continuityTurn.inherit_parent_intent === "pre_meeting_brief",
          listPortfolioPlants: chatDeps.listPreClosePortfolioPlants,
          portfolioPlants: chatDeps.preClosePortfolioPlants,
          salesRowsByPlant: chatDeps.preCloseSalesRowsByPlant,
          priorSalesRowsByPlant: chatDeps.preClosePriorSalesRowsByPlant,
          discountRowsByPlant: chatDeps.preCloseDiscountRowsByPlant,
          cutoffByPlant: chatDeps.preCloseCutoffByPlant,
          defaultCutoff: chatDeps.preCloseDefaultCutoff,
          targetByPlant: chatDeps.preCloseTargetByPlant,
          forecastByPlant: chatDeps.preCloseForecastByPlant,
          loadTarget: chatDeps.loadPreCloseTarget,
          loadForecast: chatDeps.loadPreCloseForecast,
          loadActions: chatDeps.loadPreCloseActions || chatDeps.loadPreMeetingActions,
          loadSupports: chatDeps.loadIgfReviewableSupportsForChat,
          loadTrend: chatDeps.loadCommercialTrendForChat,
          skipTrend: chatDeps.preCloseSkipTrend,
          actionBoardByPlant: chatDeps.preCloseActionBoardByPlant,
          queryMonthlySales: chatDeps.queryMonthCloseSales,
          queryMonthlyDiscount: chatDeps.queryMonthCloseDiscount,
          resolvePlanta: chatDeps.resolveDailyPlanta,
          injected: Boolean(chatDeps.composeExecutiveCycle || chatDeps.preClosePortfolioPlants),
        });
      } catch (e) {
        directorIaDebug("[DIRECTOR_IA] pre_close load error:", e && e.message);
        return {
          ok: false,
          status: 500,
          error: (e && e.message) || "No se pudo ensamblar PRE_CLOSE",
        };
      }
      if (assembled && assembled.abort) {
        return {
          ok: false,
          status: assembled.status || 403,
          code: assembled.code || "SOURCE_RESTRICTED",
          error: assembled.error || "Sin acceso a PRE_CLOSE",
        };
      }
      if (!assembled || assembled.ok === false) {
        return {
          ok: false,
          status: (assembled && assembled.status) || 500,
          error: (assembled && assembled.error) || "No se pudo ensamblar PRE_CLOSE",
        };
      }
      const hasInjectedOpenAiPreClose = typeof chatDeps.openaiChat === "function";
      if (!hasInjectedOpenAiPreClose && !isAiEnabled()) {
        return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
      }
      if (!hasInjectedOpenAiPreClose && !OPENAI_API_KEY) {
        return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
      }
      const prompt = buildPreClosePrompt(assembled, q);
      const pendingGap = assembled.pending_information_gap || null;
      const state = conversationStateForIntent(
        {
          plantaId: planta_id,
          parent_intent: "pre_meeting_brief",
          active_entities: [],
          last_evidence_bundle_type: "pre_meeting_brief",
          pending_information_gap: pendingGap,
          active_period_months: assembled.period ? [assembled.period] : [],
          meeting_type: "monthly_close",
          cycle_mode: "PRE_CLOSE",
          portfolio_scope: assembled.portfolio_scope || null,
          keepIncomingPreviousFrame: keepDailyPreviousFrame(continuityTurn, echoedState),
        },
        echoedState,
        "pre_meeting_brief",
        Boolean(continuityTurn.restore_previous)
      );
      const userContent = prependHiloToUserContent(prompt.userContent, state);
      const answer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
      if (!answer) {
        return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
      }
      const result = buildPreCloseChatResult(assembled, {
        answer,
        planta_id,
        openai_called: true,
      });
      if (result && result.context_meta) {
        result.context_meta.conversation_state = state;
        result.context_meta.pending_information_gap = pendingGap;
        result.context_meta.work_item_memory = {
          retrieved: false,
          memory_is_not_evidence: true,
          meeting_pack_not_persisted: true,
        };
      }
      return result;
    }
    directorIaDebug("[DIRECTOR_IA] pre_meeting_brief in-process");
    const loadFn = chatDeps.loadPreMeetingBriefForChat || loadPreMeetingBriefForChat;
    let assembled;
    try {
      assembled = await loadFn(chatDeps.pool, planta_id, req, {
        question: q,
        now: chatDeps.preMeetingNow || chatDeps.dailyNow || undefined,
        openYearMonth: chatDeps.preMeetingOpenYearMonth,
        todayYmd: chatDeps.dailyTodayYmd || undefined,
        auth: req && req.dashboardAuth,
        loadDailyBrief: chatDeps.loadDailyExecutiveBriefForChat,
        loadTrend: chatDeps.loadCommercialTrendForChat,
        loadProfile: chatDeps.loadClientProfileForChat,
        loadIgf: chatDeps.loadIgfArrSourceBlocksForChat,
        loadSupports: chatDeps.loadIgfReviewableSupportsForChat,
        loadActions: chatDeps.loadPreMeetingActions,
        resolvePlanta: chatDeps.resolveDailyPlanta,
        actionBoard: chatDeps.preMeetingActionBoard,
      });
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] pre_meeting_brief load error:", e && e.message);
      return {
        ok: false,
        status: 500,
        error: (e && e.message) || "No se pudo ensamblar la preparación de junta",
      };
    }
    if (assembled && assembled.abort) {
      return {
        ok: false,
        status: assembled.status || 403,
        code: assembled.code || "SOURCE_RESTRICTED",
        error: assembled.error || "Sin acceso a preparación de junta",
      };
    }
    if (!assembled || assembled.ok === false) {
      return {
        ok: false,
        status: (assembled && assembled.status) || 500,
        error: (assembled && assembled.error) || "No se pudo ensamblar la preparación de junta",
      };
    }
    const hasInjectedOpenAiPre = typeof chatDeps.openaiChat === "function";
    if (!hasInjectedOpenAiPre && !isAiEnabled()) {
      return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
    }
    if (!hasInjectedOpenAiPre && !OPENAI_API_KEY) {
      return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
    }
    const prompt = buildPreMeetingPrompt(assembled, q);
    const pendingGap = assembled.pending_information_gap || derivePreMeetingPendingGap(assembled);
    const state = conversationStateForIntent(
      {
        plantaId: planta_id,
        parent_intent: "pre_meeting_brief",
        active_entities: [],
        last_evidence_bundle_type: "pre_meeting_brief",
        pending_information_gap: pendingGap,
        active_period_months: assembled.meeting_period ? [assembled.meeting_period] : [],
        meeting_type: assembled.meeting_type || "monthly_close",
        cycle_mode: null,
        keepIncomingPreviousFrame: keepDailyPreviousFrame(continuityTurn, echoedState),
      },
      echoedState,
      "pre_meeting_brief",
      Boolean(continuityTurn.restore_previous)
    );
    const userContent = prependHiloToUserContent(prompt.userContent, state);
    const answer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
    if (!answer) {
      return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
    }
    const result = buildPreMeetingChatResult(assembled, {
      answer,
      planta_id,
      openai_called: true,
    });
    if (result && result.context_meta) {
      result.context_meta.conversation_state = state;
      result.context_meta.pending_information_gap = pendingGap;
      result.context_meta.work_item_memory = {
        retrieved: false,
        memory_is_not_evidence: true,
        meeting_pack_not_persisted: true,
      };
    }
    return result;
  }

  if (directorIaPlan.intent === "month_close_result") {
    directorIaDebug("[DIRECTOR_IA] month_close_result in-process");
    const loadFn = chatDeps.loadMonthCloseResultForChat || loadMonthCloseResultForChat;
    const reuseMonth =
      Boolean(echoedState && echoedState.parent_intent === "month_close_result") &&
      !(continuityTurn.month_close_handoff_from_pre_meeting);
    let assembled;
    try {
      assembled = await loadFn(chatDeps.pool, planta_id, req, {
        question: q,
        now: chatDeps.monthCloseNow || chatDeps.preMeetingNow || chatDeps.dailyNow || undefined,
        auth: req && req.dashboardAuth,
        active_period_months: (echoedState && echoedState.active_period_months) || [],
        reuse_inherited_month: reuseMonth,
        resolvePlanta: chatDeps.resolveDailyPlanta || chatDeps.resolveMonthClosePlanta,
        loadTarget: chatDeps.loadMonthCloseTarget,
        loadForecast: chatDeps.loadMonthCloseForecast,
        loadActions: chatDeps.loadMonthCloseActions,
        queryMonthlySales: chatDeps.queryMonthCloseSales,
        queryMonthlyDiscount: chatDeps.queryMonthCloseDiscount,
        actionBoard: chatDeps.monthCloseActionBoard,
      });
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] month_close_result load error:", e && e.message);
      return {
        ok: false,
        status: 500,
        error: (e && e.message) || "No se pudo ensamblar el resultado mensual",
      };
    }
    if (assembled && assembled.abort) {
      return {
        ok: false,
        status: assembled.status || 403,
        code: assembled.code || "SOURCE_RESTRICTED",
        error: assembled.error || "Sin acceso al resultado mensual",
      };
    }
    if (!assembled || assembled.ok === false) {
      return {
        ok: false,
        status: (assembled && assembled.status) || 500,
        error: (assembled && assembled.error) || "No se pudo ensamblar el resultado mensual",
      };
    }
    const hasInjectedOpenAiClose = typeof chatDeps.openaiChat === "function";
    if (!hasInjectedOpenAiClose && !isAiEnabled()) {
      return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
    }
    if (!hasInjectedOpenAiClose && !OPENAI_API_KEY) {
      return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
    }
    const prompt = buildMonthClosePrompt(assembled, q);
    const pendingGap = assembled.pending_information_gap || deriveMonthCloseGap(assembled);
    let activeEntities = [];
    if (wantsMonthCloseFirstMover(q) && assembled.first_mover) {
      activeEntities = [
        {
          kind: "client",
          display: assembled.first_mover.cliente_norm,
          cliente_key: assembled.first_mover.cliente_key || null,
          cliente_keys: assembled.first_mover.cliente_keys || [],
        },
      ];
    }
    const state = conversationStateForIntent(
      {
        plantaId: planta_id,
        parent_intent: "month_close_result",
        active_entities: activeEntities,
        last_evidence_bundle_type: "month_close_result",
        pending_information_gap: pendingGap,
        active_period_months: assembled.month ? [assembled.month] : [],
        meeting_type: "monthly_close",
        keepIncomingPreviousFrame: keepDailyPreviousFrame(continuityTurn, echoedState),
      },
      echoedState,
      "month_close_result",
      Boolean(continuityTurn.restore_previous)
    );
    const userContent = prependHiloToUserContent(prompt.userContent, state);
    const answer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
    if (!answer) {
      return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
    }
    const result = buildMonthCloseChatResult(assembled, {
      answer,
      planta_id,
      openai_called: true,
    });
    if (result && result.context_meta) {
      result.context_meta.conversation_state = state;
      result.context_meta.pending_information_gap = pendingGap;
      result.context_meta.work_item_memory = {
        retrieved: false,
        memory_is_not_evidence: true,
        month_close_not_persisted: true,
      };
    }
    return result;
  }

  if (directorIaPlan.intent === "commercial_trend") {
    directorIaDebug("[DIRECTOR_IA] commercial_trend in-process");
    const loadFn = chatDeps.loadCommercialTrendForChat || loadCommercialTrendForChat;
    let assembled;
    try {
      assembled = await loadFn(chatDeps.pool, planta_id, req, {
        question: q,
        range_days: continuityTurn.active_range_days || (echoedState && echoedState.active_range_days) || undefined,
        channel: continuityTurn.active_channel || (echoedState && echoedState.active_channel) || undefined,
        active_range_days: (echoedState && echoedState.active_range_days) || undefined,
        active_channel: (echoedState && echoedState.active_channel) || undefined,
        resolvePlanta: chatDeps.resolveCommercialTrendPlanta,
        loadCommercialTrend: chatDeps.loadCommercialTrendEngine,
        resolvePlantCodes: chatDeps.resolveCommercialTrendPlantCodes,
        queryBounds: chatDeps.queryCommercialTrendBounds,
        querySalesSeries: chatDeps.queryCommercialTrendSales,
        queryDiscountSeries: chatDeps.queryCommercialTrendDiscount,
        queryClientTons: chatDeps.queryCommercialTrendClients,
        client: chatDeps.commercialTrendClient,
      });
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] commercial_trend load error:", e && e.message);
      return {
        ok: false,
        status: 500,
        error: (e && e.message) || "No se pudo ensamblar la tendencia comercial",
      };
    }
    if (assembled && assembled.abort) {
      return {
        ok: false,
        status: assembled.status || 403,
        code: assembled.code || "SOURCE_RESTRICTED",
        error: assembled.error || "Sin acceso a tendencia comercial",
      };
    }
    if (!assembled || assembled.ok === false) {
      return {
        ok: false,
        status: (assembled && assembled.status) || 500,
        error: (assembled && assembled.error) || "No se pudo ensamblar la tendencia comercial",
      };
    }
    const hasInjectedOpenAiTrend = typeof chatDeps.openaiChat === "function";
    if (!hasInjectedOpenAiTrend && !isAiEnabled()) {
      return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
    }
    if (!hasInjectedOpenAiTrend && !OPENAI_API_KEY) {
      return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
    }
    const prompt = buildCommercialTrendPrompt(assembled, q);
    let entityResolution = resolveEntityAgainstAssembled(continuityTurn, assembled);
    if (wantsFirstMover(q) && assembled.first_mover && entityResolution.status !== "unique") {
      entityResolution = {
        status: "unique",
        entity: {
          kind: "client",
          display: assembled.first_mover.cliente || assembled.first_mover.cliente_norm,
          cliente_key: assembled.first_mover.cliente_key || null,
          cliente_keys: assembled.first_mover.cliente_keys || [],
        },
      };
    }
    const pendingGap = assembled.pending_information_gap || null;
    const state = conversationStateForIntent(
      {
        plantaId: planta_id,
        parent_intent: "commercial_trend",
        active_entities: carryActiveEntities(continuityTurn, echoedState, entityResolution),
        last_evidence_bundle_type: "commercial_trend",
        pending_information_gap: pendingGap,
        active_range_days: assembled.range_days,
        active_channel: assembled.channel,
        keepIncomingPreviousFrame: keepDailyPreviousFrame(continuityTurn, echoedState),
      },
      echoedState,
      "commercial_trend",
      Boolean(continuityTurn.restore_previous)
    );
    const userContent = prependHiloToUserContent(prompt.userContent, state);
    const answer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
    if (!answer) {
      return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
    }
    const result = buildCommercialTrendChatResult(assembled, {
      answer,
      planta_id,
      openai_called: true,
    });
    if (result && result.context_meta) {
      result.context_meta.conversation_state = state;
      result.context_meta.pending_information_gap = pendingGap;
    }
    return result;
  }

  if (directorIaPlan.intent === "client_profile") {
    directorIaDebug("[DIRECTOR_IA] client_profile in-process");
    const loadFn = chatDeps.loadClientProfileForChat || loadClientProfileForChat;
    const carried = carryActiveEntities(continuityTurn, echoedState, { status: "none" });
    const active = carried[0] || null;
    let assembled;
    try {
      assembled = await loadFn(chatDeps.pool, planta_id, req, {
        question: q,
        entity_hint: continuityTurn.entity_hint || (active && active.display) || null,
        display_name: active && active.display,
        cliente_key: active && active.cliente_key,
        cliente_keys: active && active.cliente_keys,
        cliente_norm: active && active.display,
        identity_canal:
          (echoedState && echoedState.active_channel === "comisionista" && "Comisionista") ||
          (echoedState && echoedState.active_channel === "casa" && "Casa") ||
          undefined,
        active_period_months: (echoedState && echoedState.active_period_months) || undefined,
        active_channel: (echoedState && echoedState.active_channel) || undefined,
        channel: (echoedState && echoedState.active_channel) || undefined,
        resolvePlanta: chatDeps.resolveClientProfilePlanta,
        resolvePlantCodes: chatDeps.resolveClientProfilePlantCodes,
        queryMonthlySales: chatDeps.queryClientProfileSales,
        queryMonthlyDiscount: chatDeps.queryClientProfileDiscount,
        queryCommentsByKeys: chatDeps.queryClientProfileComments,
        queryActionsByKeys: chatDeps.queryClientProfileActions,
        queryHistorialForActions: chatDeps.queryClientProfileHistorial,
        client: chatDeps.clientProfileClient,
        now: chatDeps.clientProfileNow,
      });
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] client_profile load error:", e && e.message);
      return {
        ok: false,
        status: 500,
        error: (e && e.message) || "No se pudo ensamblar el perfil de cliente",
      };
    }
    if (assembled && assembled.abort) {
      return {
        ok: false,
        status: assembled.status || 403,
        code: assembled.code || "SOURCE_RESTRICTED",
        error: assembled.error || "Sin acceso al perfil de cliente",
      };
    }
    if (assembled && assembled.needs_clarification) {
      return buildEntityClarificationResult({
        planta_id,
        hint: (assembled.clarification && assembled.clarification.hint) || continuityTurn.entity_hint,
        status: (assembled.clarification && assembled.clarification.status) || "ambiguous",
        conversation_state: preserveFramesOnClarify(echoedState, planta_id),
      });
    }
    if (!assembled || assembled.ok === false) {
      if (assembled && assembled.needs_identity) {
        return buildUnknownClarificationResult({
          planta_id,
          reason: "Necesito un cliente canónico (cliente_key) para armar el perfil. No invento identidad.",
          conversation_state: preserveFramesOnClarify(echoedState, planta_id),
        });
      }
      return {
        ok: false,
        status: (assembled && assembled.status) || 500,
        error: (assembled && assembled.error) || "No se pudo ensamblar el perfil de cliente",
      };
    }
    const hasInjectedOpenAiProfile = typeof chatDeps.openaiChat === "function";
    if (!hasInjectedOpenAiProfile && !isAiEnabled()) {
      return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
    }
    if (!hasInjectedOpenAiProfile && !OPENAI_API_KEY) {
      return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
    }
    const prompt = buildClientProfilePrompt(assembled, q);
    const id = assembled.identity || {};
    const entityResolution = {
      status: id.cliente_key ? "unique" : "none",
      entity: id.cliente_key
        ? {
            kind: "client",
            display: id.display_name,
            cliente_key: id.cliente_key,
            cliente_keys: id.cliente_keys || [],
          }
        : null,
    };
    const pendingGap = deriveClientProfileGap(assembled);
    const state = conversationStateForIntent(
      {
        plantaId: planta_id,
        parent_intent: "client_profile",
        active_entities: carryActiveEntities(continuityTurn, echoedState, entityResolution),
        last_evidence_bundle_type: "client_profile",
        pending_information_gap: pendingGap,
        active_channel: (echoedState && echoedState.active_channel) || undefined,
        active_period_months: (assembled.period && assembled.period.months) || [],
        keepIncomingPreviousFrame: keepDailyPreviousFrame(continuityTurn, echoedState),
      },
      echoedState,
      "client_profile",
      Boolean(continuityTurn.restore_previous)
    );
    const userContent = prependHiloToUserContent(prompt.userContent, state);
    const answer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
    if (!answer) {
      return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
    }
    const result = buildClientProfileChatResult(assembled, {
      answer,
      planta_id,
      openai_called: true,
    });
    if (result && result.context_meta) {
      result.context_meta.conversation_state = state;
      result.context_meta.pending_information_gap = pendingGap;
    }
    return result;
  }

  if (directorIaPlan.intent === "taller_mayor") {
    directorIaDebug("[DIRECTOR_IA] taller_mayor in-process");
    const loadFn = chatDeps.loadTallerMayorForChat || loadTallerMayorForChat;
    const carried = carryActiveEntities(continuityTurn, echoedState, { status: "none" });
    const active = carried[0] || null;
    let assembled;
    try {
      assembled = await loadFn(chatDeps.pool, planta_id, req, {
        question: q,
        active_unit: (active && active.unit_token) || null,
        active_folio_id: active && active.folio_id != null ? active.folio_id : null,
        active_period_months: (echoedState && echoedState.active_period_months) || undefined,
        now: chatDeps.tallerMayorNow,
        queryTallerFolios: chatDeps.queryTallerMayorFolios,
        resolvePlanta: chatDeps.resolveTallerMayorPlanta,
        expandTallerRows: chatDeps.expandTallerMayorRows,
        igfBaseFields: chatDeps.tallerMayorIgfBaseFields,
        plantMathRows: chatDeps.tallerMayorPlantMathRows,
        plantCount: chatDeps.tallerMayorPlantCount,
      });
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] taller_mayor load error:", e && e.message);
      return {
        ok: false,
        status: 500,
        error: (e && e.message) || "No se pudo ensamblar Taller Mayor",
      };
    }
    if (assembled && assembled.abort) {
      return {
        ok: false,
        status: assembled.status || 403,
        code: assembled.code || "SOURCE_RESTRICTED",
        error: assembled.error || "Sin acceso a Taller Mayor",
      };
    }
    if (!assembled || assembled.ok === false) {
      return {
        ok: false,
        status: (assembled && assembled.status) || 500,
        error: (assembled && assembled.error) || "No se pudo ensamblar Taller Mayor",
      };
    }
    const hasInjectedOpenAiTaller = typeof chatDeps.openaiChat === "function";
    if (!hasInjectedOpenAiTaller && !isAiEnabled()) {
      return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
    }
    if (!hasInjectedOpenAiTaller && !OPENAI_API_KEY) {
      return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
    }
    const prompt = buildTallerMayorPrompt(assembled, q);
    const pendingGap = deriveTallerMayorGap(assembled);
    const state = conversationStateForIntent(
      {
        plantaId: planta_id,
        parent_intent: "taller_mayor",
        active_entities:
          assembled.active_entities && assembled.active_entities.length
            ? assembled.active_entities
            : carryActiveEntities(continuityTurn, echoedState, { status: "none" }),
        last_evidence_bundle_type: "taller_mayor",
        pending_information_gap: pendingGap,
        active_period_months: assembled.period && assembled.period.yyyymm ? [assembled.period.yyyymm] : [],
        keepIncomingPreviousFrame: keepDailyPreviousFrame(continuityTurn, echoedState),
      },
      echoedState,
      "taller_mayor",
      Boolean(continuityTurn.restore_previous)
    );
    const userContent = prependHiloToUserContent(prompt.userContent, state);
    const answer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
    if (!answer) {
      return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
    }
    const result = buildTallerMayorChatResult(assembled, {
      answer,
      planta_id,
      openai_called: true,
    });
    if (result && result.context_meta) {
      result.context_meta.conversation_state = state;
      result.context_meta.pending_information_gap = pendingGap;
    }
    return result;
  }

  if (directorIaPlan.intent === "daily_sales_deviation") {
    directorIaDebug("[DIRECTOR_IA] daily_sales_deviation in-process");
    const loadFn = chatDeps.loadDailySalesDeviationForChat || loadDailySalesDeviationForChat;
    let assembled;
    try {
      assembled = await loadFn(chatDeps.pool, planta_id, req, {
        question: q,
        targetDate: continuityTurn.active_date || undefined,
        todayYmd: chatDeps.dailyTodayYmd || undefined,
        now: chatDeps.dailyNow || undefined,
        resolvePlanta: chatDeps.resolveDailyPlanta,
        querySalesRows: chatDeps.queryDailySalesRows,
        queryComments: chatDeps.queryDailyComments,
        queryActions: chatDeps.queryDailyActions,
      });
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] daily_sales_deviation load error:", e && e.message);
      return {
        ok: false,
        status: 500,
        error: (e && e.message) || "No se pudo ensamblar evidencia diaria de venta",
      };
    }
    if (assembled && assembled.abort) {
      return {
        ok: false,
        status: assembled.status || 403,
        code: assembled.code || "SOURCE_RESTRICTED",
        error: assembled.error || "Sin acceso a venta diaria",
      };
    }
    if (!assembled || assembled.ok === false) {
      return {
        ok: false,
        status: (assembled && assembled.status) || 500,
        error: (assembled && assembled.error) || "No se pudo ensamblar evidencia diaria de venta",
      };
    }
    const hasInjectedOpenAi = typeof chatDeps.openaiChat === "function";
    if (!hasInjectedOpenAi && !isAiEnabled()) {
      return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
    }
    if (!hasInjectedOpenAi && !OPENAI_API_KEY) {
      return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
    }
    const prompt = buildDailySalesDeviationPrompt(assembled, q);
    const entityResolution = resolveEntityAgainstAssembled(continuityTurn, assembled);
    if (continuityNeedsUniqueEntity(continuityTurn) && entityResolution.status !== "unique") {
      const pendingGap = derivePendingInformationGap(assembled, null);
      const state = conversationStateForIntent(
        {
          plantaId: planta_id,
          parent_intent: "daily_sales_deviation",
          active_entities: [],
          last_evidence_bundle_type: "daily_sales_deviation",
          pending_information_gap: pendingGap,
          active_date: assembled.detection && assembled.detection.target_date,
          keepIncomingPreviousFrame: keepDailyPreviousFrame(continuityTurn, echoedState),
        },
        echoedState,
        "daily_sales_deviation",
        Boolean(continuityTurn.restore_previous)
      );
      return buildEntityClarificationResult({
        planta_id,
        hint: continuityTurn.entity_hint,
        status: entityResolution.status,
        conversation_state: state,
      });
    }
    const activeEntities = carryActiveEntities(continuityTurn, echoedState, entityResolution);
    const pendingGap = derivePendingInformationGap(assembled, activeEntities[0] || null);
    const state = conversationStateForIntent(
      {
        plantaId: planta_id,
        parent_intent: "daily_sales_deviation",
        active_entities: activeEntities,
        last_evidence_bundle_type: "daily_sales_deviation",
        pending_information_gap: pendingGap,
        active_date: assembled.detection && assembled.detection.target_date,
        keepIncomingPreviousFrame: keepDailyPreviousFrame(continuityTurn, echoedState),
      },
      echoedState,
      "daily_sales_deviation",
      Boolean(continuityTurn.restore_previous)
    );
    const userContent = prependHiloToUserContent(prompt.userContent, state);
    const answer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
    if (!answer) {
      return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
    }
    const result = buildDailySalesDeviationChatResult(assembled, {
      answer,
      planta_id,
      openai_called: true,
    });
    if (result && result.context_meta) {
      result.context_meta.conversation_state = state;
      result.context_meta.pending_information_gap = pendingGap;
      result.context_meta.work_item_memory = {
        retrieved: false,
        memory_is_not_evidence: true,
        daily_not_persisted: true,
      };
    }
    return result;
  }

  if (directorIaPlan.intent === "daily_discount_deviation") {
    directorIaDebug("[DIRECTOR_IA] daily_discount_deviation in-process");
    const loadFn = chatDeps.loadDailyDiscountDeviationForChat || loadDailyDiscountDeviationForChat;
    let assembled;
    try {
      assembled = await loadFn(chatDeps.pool, planta_id, req, {
        question: q,
        targetDate: continuityTurn.active_date || undefined,
        todayYmd: chatDeps.dailyTodayYmd || undefined,
        now: chatDeps.dailyNow || undefined,
        resolvePlanta: chatDeps.resolveDailyDiscountPlanta,
        queryDiscountRows: chatDeps.queryDailyDiscountRows,
        queryKgRows: chatDeps.queryDailyDiscountKgRows,
        queryComments: chatDeps.queryDailyDiscountComments,
        queryActions: chatDeps.queryDailyDiscountActions,
      });
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] daily_discount_deviation load error:", e && e.message);
      return {
        ok: false,
        status: 500,
        error: (e && e.message) || "No se pudo ensamblar evidencia diaria de descuento/kg",
      };
    }
    if (assembled && assembled.abort) {
      return {
        ok: false,
        status: assembled.status || 403,
        code: assembled.code || "SOURCE_RESTRICTED",
        error: assembled.error || "Sin acceso a descuento/kg diario",
      };
    }
    if (!assembled || assembled.ok === false) {
      return {
        ok: false,
        status: (assembled && assembled.status) || 500,
        error: (assembled && assembled.error) || "No se pudo ensamblar evidencia diaria de descuento/kg",
      };
    }
    const hasInjectedOpenAiDiscount = typeof chatDeps.openaiChat === "function";
    if (!hasInjectedOpenAiDiscount && !isAiEnabled()) {
      return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
    }
    if (!hasInjectedOpenAiDiscount && !OPENAI_API_KEY) {
      return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
    }
    const prompt = buildDailyDiscountDeviationPrompt(assembled, q);
    const entityResolution = resolveEntityAgainstAssembled(continuityTurn, assembled);
    if (continuityNeedsUniqueEntity(continuityTurn) && entityResolution.status !== "unique") {
      const pendingGap = derivePendingInformationGap(assembled, null);
      const state = conversationStateForIntent(
        {
          plantaId: planta_id,
          parent_intent: "daily_discount_deviation",
          active_entities: [],
          last_evidence_bundle_type: "daily_discount_deviation",
          pending_information_gap: pendingGap,
          active_date: assembled.detection && assembled.detection.target_date,
          keepIncomingPreviousFrame: keepDailyPreviousFrame(continuityTurn, echoedState),
        },
        echoedState,
        "daily_discount_deviation",
        Boolean(continuityTurn.restore_previous)
      );
      return buildEntityClarificationResult({
        planta_id,
        hint: continuityTurn.entity_hint,
        status: entityResolution.status,
        conversation_state: state,
      });
    }
    const activeEntities = carryActiveEntities(continuityTurn, echoedState, entityResolution);
    const pendingGap = derivePendingInformationGap(assembled, activeEntities[0] || null);
    const state = conversationStateForIntent(
      {
        plantaId: planta_id,
        parent_intent: "daily_discount_deviation",
        active_entities: activeEntities,
        last_evidence_bundle_type: "daily_discount_deviation",
        pending_information_gap: pendingGap,
        active_date: assembled.detection && assembled.detection.target_date,
        keepIncomingPreviousFrame: keepDailyPreviousFrame(continuityTurn, echoedState),
      },
      echoedState,
      "daily_discount_deviation",
      Boolean(continuityTurn.restore_previous)
    );
    const userContent = prependHiloToUserContent(prompt.userContent, state);
    const answer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
    if (!answer) {
      return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
    }
    const result = buildDailyDiscountDeviationChatResult(assembled, {
      answer,
      planta_id,
      openai_called: true,
    });
    if (result && result.context_meta) {
      result.context_meta.conversation_state = state;
      result.context_meta.pending_information_gap = pendingGap;
      result.context_meta.work_item_memory = {
        retrieved: false,
        memory_is_not_evidence: true,
        daily_not_persisted: true,
      };
    }
    return result;
  }

  if (directorIaPlan.intent === "financial_diagnosis") {
    directorIaDebug("[DIRECTOR_IA] financial_diagnosis in-process");
    const loadFn = chatDeps.loadFinancialDiagnosisForChat || loadFinancialDiagnosisForChat;
    let assembled;
    try {
      assembled = await loadFn(chatDeps.pool, planta_id, req, {
        question: q,
        loadIgfArrBlocks: chatDeps.loadIgfArrBlocks,
        loadDeltaVenta: chatDeps.loadDeltaVenta,
        loadDeltaDescuento: chatDeps.loadDeltaDescuento,
        loadDeltaIngreso: chatDeps.loadDeltaIngreso,
      });
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] financial_diagnosis load error:", e && e.message);
      return {
        ok: false,
        status: 500,
        error: (e && e.message) || "No se pudo ensamblar evidencia financiera",
      };
    }
    if (assembled && assembled.abort) {
      return {
        ok: false,
        status: assembled.status || 403,
        code: assembled.code || "SOURCE_RESTRICTED",
        error: assembled.error || "Sin acceso a KPIs financieros",
      };
    }
    if (!assembled || assembled.ok === false) {
      return {
        ok: false,
        status: (assembled && assembled.status) || 500,
        error: (assembled && assembled.error) || "No se pudo ensamblar evidencia financiera",
      };
    }
    const hasInjectedOpenAi = typeof chatDeps.openaiChat === "function";
    if (!hasInjectedOpenAi && !isAiEnabled()) {
      return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
    }
    if (!hasInjectedOpenAi && !OPENAI_API_KEY) {
      return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
    }
    const prompt = buildFinancialDiagnosisPrompt(assembled, q);
    const answer = await openaiDirectorIaChat(prompt.systemPrompt, prompt.userContent);
    if (!answer) {
      return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
    }
    const financialResult = buildFinancialDiagnosisChatResult(assembled, {
      answer,
      planta_id,
      openai_called: true,
    });
    if (financialResult && financialResult.context_meta) {
      financialResult.context_meta.conversation_state = conversationStateForIntent(
        { plantaId: planta_id, parent_intent: null },
        echoedState,
        "financial_diagnosis",
        false
      );
    }
    return financialResult;
  }

  if (directorIaPlan.intent === "plant_diagnosis") {
    directorIaDebug("[DIRECTOR_IA] plant_diagnosis in-process");
    const loadFn = chatDeps.loadPlantDiagnosisForChat || loadPlantDiagnosisForChat;
    let assembled;
    try {
      assembled = await loadFn(chatDeps.pool, planta_id, req, {
        question: q,
        loadIgfArrBlocks: chatDeps.loadIgfArrBlocks,
        loadActionRegister: chatDeps.loadActionRegister,
        loadDicf: chatDeps.loadDicf,
        loadBitacora: chatDeps.loadBitacora,
        loadCommercialStateSelect: chatDeps.loadCommercialStateSelect,
        ensureActionRegisterTables: chatDeps.ensureActionRegisterTables,
      });
    } catch (e) {
      directorIaDebug("[DIRECTOR_IA] plant_diagnosis load error:", e && e.message);
      return {
        ok: false,
        status: 500,
        error: (e && e.message) || "No se pudo ensamblar evidencia de planta",
      };
    }
    if (assembled && assembled.abort) {
      return {
        ok: false,
        status: assembled.status || 403,
        code: assembled.code || "SOURCE_RESTRICTED",
        error: assembled.error || "Sin acceso a esta planta",
      };
    }
    if (!assembled || assembled.ok === false) {
      return {
        ok: false,
        status: (assembled && assembled.status) || 500,
        error: (assembled && assembled.error) || "No se pudo ensamblar evidencia de planta",
      };
    }
    const hasInjectedOpenAi = typeof chatDeps.openaiChat === "function";
    if (!hasInjectedOpenAi && !isAiEnabled()) {
      return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
    }
    if (!hasInjectedOpenAi && !OPENAI_API_KEY) {
      return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
    }
    const prompt = buildPlantDiagnosisPrompt(assembled, q);
    const entityResolution = resolveEntityAgainstAssembled(continuityTurn, assembled);
    if (
      (continuityNeedsUniqueEntity(continuityTurn) || (resumeItem && continuityTurn.entity_hint)) &&
      entityResolution.status !== "unique"
    ) {
      if (resumeItem && memoryStore) {
        await persistentMemory.updateWorkItemStatus(memoryStore, resumeItem.id, "stale");
      }
      const state = conversationStateForIntent(
        {
          plantaId: planta_id,
          parent_intent: "plant_diagnosis",
          active_entities: [],
          last_evidence_bundle_type: "plant_diagnosis",
          pending_information_gap: derivePendingInformationGap(assembled, null),
        },
        echoedState,
        "plant_diagnosis",
        Boolean(continuityTurn.restore_previous)
      );
      return buildEntityClarificationResult({
        planta_id,
        hint: continuityTurn.entity_hint,
        status: entityResolution.status,
        conversation_state: state,
      });
    }

    const activeEntities = carryActiveEntities(continuityTurn, echoedState, entityResolution);
    const pendingGap = derivePendingInformationGap(assembled, activeEntities[0] || null);
    const state = conversationStateForIntent(
      {
        plantaId: planta_id,
        parent_intent: "plant_diagnosis",
        active_entities: activeEntities,
        last_evidence_bundle_type: "plant_diagnosis",
        pending_information_gap: pendingGap,
      },
      echoedState,
      "plant_diagnosis",
      Boolean(continuityTurn.restore_previous)
    );

    let workItemMemory = { retrieved: false, memory_is_not_evidence: true };
    if (resumeItem && memoryStore) {
      const validated = await revalidateRetrievedItem(memoryStore, resumeItem, assembled, entityResolution);
      resumeItem = validated.item;
      workItemMemory = {
        retrieved: true,
        id: resumeItem && resumeItem.id,
        status: validated.status,
        reason: validated.reason,
        memory_is_not_evidence: true,
      };
    }

    const persistEntity = activeEntities[0] || null;
    const rememberRequested = memoryTurn.kind === "remember";
    const skipPersistAfterClose =
      workItemMemory.retrieved && workItemMemory.status && workItemMemory.status !== "active";
    if (
      persistEntity &&
      userScopeKey &&
      plantaAuthorized &&
      !skipPersistAfterClose &&
      !continuityTurn.restore_previous
    ) {
      const created = await persistPendingWorkItemSafe({
        userScopeKey,
        plantaId: planta_id,
        parent_intent: "plant_diagnosis",
        entity: persistEntity,
        gap: rememberRequested
          ? pendingGap || {
              missing_fields: ["seguimiento_de_trabajo"],
              why_blocks: "El usuario pidió recordar este pendiente.",
            }
          : pendingGap,
        plantaAuthorized,
        forceSameShape: rememberRequested,
      });
      if (created) {
        workItemMemory = {
          ...workItemMemory,
          created: true,
          id: created.id,
          status: created.status,
          memory_is_not_evidence: true,
        };
      }
    }

    const attachMemoryMeta = (meta) => {
      if (!meta) return meta;
      meta.work_item_memory = workItemMemory;
      return meta;
    };

    let userContent = prependHiloToUserContent(prompt.userContent, state);
    if (resumeItem && workItemMemory.retrieved) {
      userContent = persistentMemory.prependWorkItemToUserContent(userContent, resumeItem);
    }
    const answer = await openaiDirectorIaChat(prompt.systemPrompt, userContent);
    if (!answer) {
      return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
    }
    const result = buildPlantDiagnosisChatResult(assembled, {
      answer,
      planta_id,
      openai_called: true,
    });
    if (result && result.context_meta) {
      result.context_meta.conversation_state = state;
      result.context_meta.pending_information_gap = pendingGap;
      attachMemoryMeta(result.context_meta);
    }
    return result;
  }

  if (directorIaPlan.intent === "action_status") {
    directorIaDebug("[DIRECTOR_IA] action_status person-routing");
    const personResult = await handleActionStatusPersonChat({
      req,
      planta_id,
      question: rawQuestion,
      continuityTurn,
      echoedState,
    });
    if (personResult) return personResult;
  }

  if (directorIaPlan.intent === "delta_sales") {
    directorIaDebug("[DIRECTOR_IA] delta_sales in-process");
    const payload = await loadDeltaVentaForChat(chatDeps.pool, planta_id, req, { question: q });
    return buildDeltaVentaChatResult(payload, { planta_id });
  }

  if (directorIaPlan.intent === "delta_discount") {
    directorIaDebug("[DIRECTOR_IA] delta_discount in-process");
    const payload = await loadDeltaDescuentoForChat(chatDeps.pool, planta_id, req, { question: q });
    return buildDeltaDescuentoChatResult(payload, { planta_id });
  }

  if (directorIaPlan.intent === "delta_income") {
    directorIaDebug("[DIRECTOR_IA] delta_income in-process");
    const payload = await loadDeltaIngresoForChat(chatDeps.pool, planta_id, req, { question: q });
    return buildDeltaIngresoChatResult(payload, { planta_id });
  }

  if (!isAiEnabled()) {
    return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
  }
  if (!OPENAI_API_KEY) {
    return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
  }

  const mejoraContinua = isMejoraContinuaQuestion(q);
  let focused = null;
  let promptOpts = {};
  let chatContext = null;
  let fullPayload = null;
  let mejoraPayload = null;
  let commercialResolution = { entidades: [], search_tokens: [], block: "" };

  if (mejoraContinua) {
    const body = req.body || {};
    let year =
      body.year != null ? parseInt(String(body.year), 10) : currentYearMonthCdmx().year;
    let month =
      body.month != null ? parseInt(String(body.month), 10) : currentYearMonthCdmx().month;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      ({ year, month } = currentYearMonthCdmx());
    }

    mejoraPayload = await loadMejoraContinuaForChat(req, planta_id, year, month);
    if (!mejoraPayload.ok) {
      const err = mejoraPayload.error || "No se pudo cargar mejora continua para esta planta";
      const status = err.includes("Sin acceso") ? 403 : 500;
      return { ok: false, error: err, status };
    }

    focused = buildFocusedMejoraContinuaContext(mejoraPayload, q);
    promptOpts = { useFocused: true, focusedText: focused.text, mejoraContinua: true };
  } else {
    const contextReq = {
      ...req,
      query: { ...(req.query || {}), planta_id: String(planta_id) },
    };

    fullPayload = await buildDirectorIaContextPayload(contextReq);
    chatContext = extractChatContextFromPayload(fullPayload);

    if (!chatContext) {
      const err =
        fullPayload?.action_register?.error ||
        "No se pudo cargar el contexto de Action Register para esta planta";
      const status = err.includes("Sin acceso") ? 403 : 400;
      return { ok: false, error: err, status };
    }

    const pool = chatDeps.pool;
    commercialResolution = await resolveCommercialEntitiesForQuestionFromPool(pool, planta_id, q);
    directorIaDebug("[DIRECTOR_IA] comercial_entidades:", {
      count: commercialResolution.entidades.length,
      tokens: commercialResolution.search_tokens,
      entidades: commercialResolution.entidades.map((e) => ({
        mencion: e.matched_mention,
        canonico: e.nombre_canonico,
        match_type: e.match_type,
      })),
    });

    const bitacoraSessions = chatContext.bitacora || [];
    const bitacoraRecentOverDicf = bitacoraIsNewerThanDicf(chatContext);
    const wantCommercialState = isCommercialStateListQuestion(q);
    const wantFinancialKpi = isPlantFinancialKpiQuestion(q);
    const wantMonthlyIntegrated =
      !wantFinancialKpi && shouldUseMonthlyIntegratedChat(q, chatContext);
    const wantDicf =
      !wantCommercialState &&
      !wantFinancialKpi &&
      !wantMonthlyIntegrated &&
      shouldUseDicfFocusedChat(q, chatContext, commercialResolution);
    const wantCommercialIdentity =
      !wantCommercialState &&
      !wantDicf &&
      !wantMonthlyIntegrated &&
      !wantFinancialKpi &&
      commercialResolution.entidades.length > 0 &&
      isCommercialIdentityQuestion(q);
    const hasAr = hasRelevantActionRegisterContext(chatContext, q);

    let bitacoraAnnex = null;
    if (!wantFinancialKpi && shouldAttachBitacoraAnnex(q, chatContext)) {
      bitacoraAnnex = buildBitacoraAnnex(bitacoraSessions, q, commercialResolution, {
        prioritizeRecent: bitacoraRecentOverDicf,
      });
    }

    const comentariosAnnexText =
      !wantFinancialKpi &&
      ((chatContext.cliente_comentarios && chatContext.cliente_comentarios.length) ||
        (chatContext.folio_comentarios && chatContext.folio_comentarios.length))
        ? buildComentariosAnnexText(chatContext.cliente_comentarios, chatContext.folio_comentarios)
        : null;

    const commercialPrompt = {
      commercialEntitiesBlock: commercialResolution.block || null,
      commercialResolution,
    };

    if (wantFinancialKpi) {
      const igfArr = await loadIgfArrAnnexForChat(pool, planta_id, req, q);
      if (!igfArr.ok) {
        const status = igfArr.status || 500;
        return { ok: false, error: igfArr.error || "No se pudo cargar IGF/ARR", status };
      }
      focused = {
        text: igfArr.text,
        meta: { ...(igfArr.meta || {}), mode: "igf_arr_focused", focus: "igf_arr", focus_type: "igf_arr" },
      };
      promptOpts = {
        useFocused: true,
        focusedText: igfArr.text,
        igfArrFocused: true,
        ...commercialPrompt,
      };
      directorIaDebug("[DIRECTOR_IA] igf_arr_focused:", igfArr.meta || null);
    } else if (wantMonthlyIntegrated) {
      const clientLookup = isClientNameLookupQuestion(q);
      focused = buildMonthlyIntegratedContext(chatContext, q, commercialResolution);
      promptOpts = {
        useFocused: true,
        focusedText: focused.text,
        monthlyIntegrated: true,
        clientNameLookup: clientLookup,
        ...commercialPrompt,
      };
      directorIaDebug("[DIRECTOR_IA] monthly_integrated:", {
        latest_bitacora: getLatestBitacoraDate(bitacoraSessions),
        latest_dicf: getLatestDicfActivityDate(chatContext.dicf_details || []),
        month_keys: focused.meta?.month_keys,
        matched_bitacora: focused.meta?.matched_bitacora,
        matched_dicf: focused.meta?.matched_dicf,
      });
    } else if (wantCommercialState) {
      const commercialCategory = resolveCommercialStateCategory(q) || "dejaron";
      const commercialStatePayload = await loadCommercialStateForChat(pool, planta_id, req);
      if (!commercialStatePayload.ok) {
        const err = commercialStatePayload.error || "No se pudo cargar el estado comercial de la planta";
        const status = commercialStatePayload.status || (err.includes("Sin acceso") || err.includes("403") ? 403 : 500);
        return { ok: false, error: err, status };
      }
      focused = buildCommercialStateFocusedContext(
        commercialStatePayload,
        q,
        commercialCategory,
        commercialResolution
      );
      promptOpts = {
        useFocused: true,
        focusedText: focused.text,
        commercialStateFocused: true,
        commercialCategory,
        bitacoraAnnexText: bitacoraAnnex?.text || null,
        ...commercialPrompt,
      };
      directorIaDebug("[DIRECTOR_IA] commercial_state:", {
        category: commercialCategory,
        client_count: focused.meta?.client_count,
        periodoMes: focused.meta?.periodoMes,
      });
    } else if (wantDicf) {
      focused = buildFocusedDicfContext(chatContext, q, commercialResolution);
      promptOpts = {
        useFocused: true,
        focusedText: focused.text,
        dicfFocused: true,
        bitacoraAnnexText: bitacoraAnnex?.text || null,
        ...commercialPrompt,
      };
    } else if (wantCommercialIdentity) {
      focused = {
        text: [
          commercialResolution.block,
          "",
          "(Sin acciones DICF coincidentes en el contexto actual; responde con la equivalencia verificada alias → canónico y las notas de la entidad si aplican.)",
        ].join("\n"),
        meta: {
          mode: "commercial_entity",
          focus: "identity",
          focus_type: "commercial_entity",
        },
      };
      promptOpts = {
        useFocused: true,
        focusedText: focused.text,
        dicfFocused: true,
        bitacoraAnnexText: bitacoraAnnex?.text || null,
        ...commercialPrompt,
      };
    } else if (isPlantDiagnosticQuestion(q)) {
      focused = { meta: { mode: "full", focus: "plant_diagnostic", focus_type: "plant_diagnostic" } };
      promptOpts = {
        plantDiagnostic: true,
        plantDiagnosticPrefix: buildPlantDiagnosticUserPrefix(chatContext),
        bitacoraAnnexText: bitacoraAnnex?.text || null,
        ...commercialPrompt,
      };
    } else if (isNarrativeQuestion(q)) {
      focused = buildFocusedNarrativeContext(chatContext, q, commercialResolution);
      promptOpts = {
        useFocused: true,
        focusedText: focused.text,
        bitacoraAnnexText: bitacoraAnnex?.text || null,
        ...commercialPrompt,
      };
    } else if (bitacoraAnnex && !hasAr && !isAggregateQuestion(q)) {
      focused = bitacoraAnnex;
      promptOpts = {
        bitacoraOnlyFallback: true,
        bitacoraAnnexText: bitacoraAnnex.text,
        ...commercialPrompt,
      };
    } else {
      promptOpts = {
        bitacoraAnnexText: bitacoraAnnex?.text || null,
        includePlantSummaryPrefix: true,
        ...commercialPrompt,
      };
      if (bitacoraAnnex) {
        focused = { meta: bitacoraAnnex.meta };
      }
    }

    if (shouldAttachIgfArrAnnex(q) && !promptOpts.igfArrFocused) {
      const igfArr = await loadIgfArrAnnexForChat(pool, planta_id, req, q);
      if (igfArr.ok && igfArr.text) {
        promptOpts.igfArrAnnexText = igfArr.text;
        directorIaDebug("[DIRECTOR_IA] igf_arr_annex:", igfArr.meta || null);
      } else if (!igfArr.ok && igfArr.status === 403) {
        return { ok: false, error: igfArr.error || "Sin acceso a KPIs financieros", status: 403 };
      } else if (!igfArr.ok) {
        directorIaDebug("[DIRECTOR_IA] igf_arr_annex_skip:", igfArr.error || null);
      }
    }

    if (comentariosAnnexText) {
      promptOpts.comentariosAnnexText = comentariosAnnexText;
    }
  }

  const plantMetrics = chatContext ? getPlantSummaryMetrics(chatContext) : { open: 0, closed: 0, overdue: 0 };
  const focusType =
    focused?.meta?.focus_type ||
    focused?.meta?.focus ||
    (mejoraContinua ? "mejora_continua" : promptOpts.plantDiagnostic ? "plant_diagnostic" : null);

  const narrative =
    mejoraContinua
      ? false
      : isNarrativeQuestion(q) &&
        !promptOpts.dicfFocused &&
        !promptOpts.commercialStateFocused &&
        !promptOpts.plantDiagnostic;
  const aggregate = mejoraContinua ? false : isAggregateQuestion(q) || Boolean(promptOpts.plantDiagnostic);

  const { systemPrompt, userContent, promptMode, hasBitacoraAnnex, hasIgfArrAnnex } = buildDirectorIaChatPrompt(
    chatContext,
    q,
    promptOpts
  );

  directorIaDebug("[DIRECTOR_IA] question_class:", {
    mejoraContinua,
    narrative,
    aggregate,
    plantDiagnostic: Boolean(promptOpts.plantDiagnostic),
    promptMode,
    hasBitacoraAnnex,
    hasIgfArrAnnex,
    planta_open: plantMetrics.open,
    focus_type: focusType,
    focus_meta: focused?.meta || null,
  });
  if (promptMode === "focused") {
    directorIaDebug("[DIRECTOR_IA] focused_context_sent:\n" + (focused?.text || ""));
  } else if (promptMode === "monthly_integrated") {
    directorIaDebug("[DIRECTOR_IA] context_mode: monthly_integrated");
    directorIaDebug("[DIRECTOR_IA] monthly_integrated_sent:\n" + (focused?.text || ""));
  } else if (promptMode === "bitacora_focused") {
    directorIaDebug("[DIRECTOR_IA] context_mode: bitacora_focused");
    directorIaDebug("[DIRECTOR_IA] bitacora_context_sent:\n" + (focused?.text || ""));
  } else if (promptMode === "commercial_state") {
    directorIaDebug("[DIRECTOR_IA] context_mode: commercial_state");
    directorIaDebug("[DIRECTOR_IA] commercial_state_sent:\n" + (focused?.text || ""));
  } else if (promptMode === "dicf_focused") {
    directorIaDebug("[DIRECTOR_IA] context_mode: dicf_focused");
    directorIaDebug("[DIRECTOR_IA] dicf_context_sent:\n" + (focused?.text || ""));
  } else if (promptMode === "mejora_continua") {
    directorIaDebug("[DIRECTOR_IA] context_mode: mejora_continua");
    directorIaDebug("[DIRECTOR_IA] mejora_continua focus:", focused?.meta || null);
  } else {
    directorIaDebug("[DIRECTOR_IA] context_mode: full_aggregated");
    directorIaDebug("[DIRECTOR_IA] tema_details temas:", chatContext?.tema_details?.length || 0);
  }

  const answer = await openaiDirectorIaChat(systemPrompt, userContent);
  directorIaDebug("[DIRECTOR_IA] answer preview:", answer ? String(answer).slice(0, 500) : null);

  if (!answer) {
    return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
  }

  const sources = mejoraContinua
    ? inferMejoraContinuaSources(mejoraPayload, q, focused?.meta || {})
    : inferSourcesFromChat(chatContext, q, answer, {
        promptMode,
        hasBitacoraAnnex,
        hasIgfArrAnnex,
        bitacoraOnlyFallback: Boolean(promptOpts.bitacoraOnlyFallback),
        commercialResolution,
        commercialCategory: promptOpts.commercialCategory,
      });

  return {
    ok: true,
    answer,
    sources,
    context_meta: {
      planta_id,
      timestamp: fullPayload?.timestamp || new Date().toISOString(),
      prompt_mode: promptMode,
      bitacora_annex: hasBitacoraAnnex,
      igf_arr_annex: Boolean(hasIgfArrAnnex),
      planta_open: plantMetrics.open,
      planta_closed: plantMetrics.closed,
      planta_overdue: plantMetrics.overdue,
      focus_type: focusType || (promptMode === "full" ? "full" : promptMode),
      focus: focused?.meta || { mode: mejoraContinua ? "mejora_continua" : "full" },
      comercial_entidades: commercialResolution.entidades.map((e) => ({
        entidad_id: e.entidad_id,
        mencion_detectada: e.matched_mention,
        match_type: e.match_type,
        nombre_canonico: e.nombre_canonico,
        alias_verificados: (e.aliases_verificados || []).map((a) => a.alias_nombre),
        search_tokens: e.search_tokens,
      })),
      ...(mejoraContinua && mejoraPayload
        ? { year: mejoraPayload.year, month: mejoraPayload.month }
        : {}),
    },
  };
}

/**
 * POST /api/director-ia/chat
 * Requiere dashboardAuthMiddleware antes de invocar.
 */
async function handlePostChat(req, res) {
  if (!isDirectorIaEnabled()) {
    return res.status(200).json({ enabled: false });
  }
  try {
    const planta_id =
      req.body && req.body.planta_id != null ? parseInt(String(req.body.planta_id), 10) : null;
    const question = req.body && req.body.question != null ? String(req.body.question).trim() : "";

    if (!planta_id || !Number.isFinite(planta_id)) {
      return res.status(400).json({ ok: false, error: "planta_id requerido" });
    }
    if (!question) {
      return res.status(400).json({ ok: false, error: "question requerido" });
    }

    const user = req.dashboardUser || req.user || null;
    const result = await askDirectorIa(req, planta_id, question, user);

    if (result.enabled === false) {
      return res.status(200).json({ enabled: false });
    }

    const status = result.status || (result.ok ? 200 : 500);
    return res.status(status).json(result);
  } catch (e) {
    console.error("[Director IA chat]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error en chat Director IA" });
  }
}

module.exports = {
  configureDirectorIaChat,
  buildDirectorIaChatPrompt,
  buildFocusedNarrativeContext,
  buildFocusedDicfContext,
  buildBitacoraAnnex,
  buildFocusedBitacoraContext,
  buildPlantSummaryBlock,
  buildPlantDiagnosticUserPrefix,
  getPlantSummaryMetrics,
  filterBitacoraByQuestion,
  filterActionsByCommercialTokens,
  textMatchesCommercialTokens,
  hasRelevantActionRegisterContext,
  buildFocusedMejoraContinuaContext,
  extractChatContextFromPayload,
  inferSourcesFromChat,
  inferMejoraContinuaSources,
  isMejoraContinuaQuestion,
  isDicfContextQuestion,
  isDicfActionQuestionForChat,
  isCommercialIdentityQuestion,
  shouldUseDicfFocusedChat,
  isCommercialStateListQuestion,
  resolveCommercialStateCategory,
  isBitacoraQuestion,
  shouldAttachBitacoraAnnex,
  shouldUseMonthlyIntegratedChat,
  shouldPrioritizeBitacoraOverDicf,
  extractLikelyClientNameTokensFromQuestion,
  isClientNameLookupQuestion,
  hasBitacoraMentionForClient,
  CLIENT_NAME_LOOKUP_RESPONSE_RULE,
  expandQuestionFromChatHistory,
  resolveBitacoraSearchTexts,
  buildMonthlyIntegratedContext,
  getIntegratedContextAnchor,
  bitacoraIsNewerThanDicf,
  getLatestBitacoraDate,
  getLatestDicfActivityDate,
  isExplicitDicfHistoryQuestion,
  isPlantDiagnosticQuestion,
  filterDicfDetailsByQuestion,
  isNarrativeQuestion,
  isAggregateQuestion,
  PLANT_DIAGNOSTIC_SIGNAL_RE,
  resolveNarrativeFocus,
  resolveMejoraContinuaAreaFocus,
  resolveDirectorIaChatRouting,
  sortActionsForNarrative,
  formatActionsExecutiveSection,
  MAX_ACTIONS_FOR_NARRATIVE,
  directorIaDebug,
  askDirectorIa,
  handlePostChat,
  DIRECTOR_IA_SYSTEM_PROMPT,
  DIRECTOR_IA_SYSTEM_PROMPT_COMMERCIAL_STATE,
  DIRECTOR_IA_SYSTEM_PROMPT_DICF,
  DIRECTOR_IA_SYSTEM_PROMPT_BITACORA,
  BITACORA_ANNEX_SYSTEM_ADDENDUM,
  IGF_ARR_ANNEX_SYSTEM_ADDENDUM,
  shouldAttachIgfArrAnnex,
  isIgfForecastQuestion,
  isArrForecastQuestion,
  isPlantFinancialKpiQuestion,
  DIRECTOR_IA_SYSTEM_PROMPT_MONTHLY_INTEGRATED,
  MONTHLY_INTEGRATED_RESPONSE_RULE,
  BITACORA_RECENT_PRIORITY_ADDENDUM,
  BITACORA_CHAT_MONTH_WINDOW,
  BITACORA_MONTHLY_RESPONSE_RULE,
  DICF_MONTHLY_RESPONSE_RULE,
  formatBitacoraMonthlyBlocks,
  filterBitacoraToMonthWindow,
  formatMonthHeading,
  getRecentMonthKeysFromAnchor,
  DIRECTOR_IA_SYSTEM_PROMPT_MEJORA_CONTINUA,
  COMMERCIAL_ENTITY_SYSTEM_ADDENDUM,
  CANONICAL_TEMAS,
  MEJORA_CONTINUA_KEYWORD_RE,
  DICF_CONTEXT_SIGNAL_RE,
  BITACORA_SIGNAL_RE,
  classifyConversationalIntent,
  buildConversationalAnswer,
  conversationalPromptMode,
  resolveExecutiveNeed,
  normalizeSmalltalkText,
  hasSmalltalkBlockSignal,
  resolvePlantaLabelForChat,
  resolveDirectorIaPlantCode,
  parseExplicitCutoffFromQuestion,
  resolveDirectorIaEffectiveCutoff,
  queryArrLastUploadDayPlantAware,
  mapCutoffSourceToOrigin,
  buildForecastRunIdentity,
  isCutoffExplainQuestion,
};
