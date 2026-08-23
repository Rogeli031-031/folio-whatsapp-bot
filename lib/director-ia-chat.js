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
const { planDirectorIaQuestion } = require("./director-ia-planner");
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

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const MAX_ACTIONS_FOR_NARRATIVE = 10;

function isDirectorIaDebug() {
  return process.env.DIRECTOR_IA_DEBUG === "true" || process.env.DIRECTOR_IA_DEBUG === "1";
}

let chatDeps = { pool: null };

function configureDirectorIaChat(injected) {
  chatDeps = { ...chatDeps, ...injected };
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
  const plant = (plantLabel && String(plantLabel).trim()) || "esta planta";
  if (mode === "help") {
    return `Puedo ayudarte a revisar el estado ejecutivo de ${plant}. Algunos ejemplos de preguntas útiles:

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
  return `Hola, soy Director IA para la planta ${plant}. Puedo ayudarte a revisar acciones abiertas, vencidas, responsables, riesgos, clientes, DICF y bitácoras de seguimiento.`;
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

/**
 * @param {import("express").Request} req
 * @param {number} plantaId
 * @param {string} question
 * @param {object} [_user] reservado para auditoría futura
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
  const unsupportedCap = detectUnsupportedDirectorIaDomain(q);
  if (unsupportedCap) {
    directorIaDebug("[DIRECTOR_IA] capability_limitation:", unsupportedCap.id);
    return buildUnsupportedDomainChatResult(unsupportedCap, { planta_id });
  }

  // Fase 2/3: planner + tool plan. duplicate_folios / M3 / M9 se ejecutan in-process;
  // el resto de tools no se despacha de forma genérica.
  const directorIaPlan = planDirectorIaQuestion(q);
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
  normalizeSmalltalkText,
  hasSmalltalkBlockSignal,
  resolvePlantaLabelForChat,
};
