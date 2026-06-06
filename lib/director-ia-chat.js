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

const DIRECTOR_IA_SYSTEM_PROMPT_DICF = `${DIRECTOR_IA_SYSTEM_PROMPT}

Tu función es responder preguntas sobre acciones DICF (clientes / Delta Ingreso Cliente Forecast).

Reglas DICF:
1. Prioriza resultado_cierre e historial (creada → fecha_compromiso → cerrada) cuando la pregunta sea histórica o sobre conclusiones.
2. Cita textualmente el resultado de cierre cuando exista; es evidencia validada de negocio.
3. Incluye acciones cerradas y abiertas según el contexto DICF entregado.
4. Si preguntan por un cliente por nombre, responde solo con las acciones de ese cliente en el contexto.
5. Orden recomendado: conclusión o situación → resultado de cierre → hitos del historial → pendientes si aplica.
6. Si ENTIDADES COMERCIALES RELACIONADAS vincula un alias con el canónico, menciona la equivalencia al inicio cuando el alias aparezca en la pregunta.

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
- Responde con fecha, tipo y título de la sesión cuando ayude a ubicar la información.`;

const BITACORA_ANNEX_SYSTEM_ADDENDUM =
  "Cuando el mensaje incluya un ANEXO — BITÁCORA IA, úsalo como contexto de campo complementario. No debe sustituir Action Register, DICF ni Mejora Continua.";

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
  return DICF_CONTEXT_SIGNAL_RE.test(String(question || ""));
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

  if (isDicfContextQuestion(q) && !hasFieldNarrative && !/\b(contexto|conversaci[oó]n|visita|reuni[oó]n|junta)\b/i.test(q)) {
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
  const matched = filterDicfDetailsByQuestion(all, question, commercialResolution);
  const lines = [
    "CONTEXTO DICF — CLIENTES (Delta Ingreso Cliente Forecast)",
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
    lines.push("(sin acciones DICF coincidentes en el contexto de la planta)");
  }

  for (const d of matched) {
    lines.push(`Código: ${d.public_code} | Cliente: ${d.cliente_nombre} | Estado: ${d.estado}${d.cerrada ? " (CERRADA)" : ""}`);
    if (d.planta_label) lines.push(`Planta: ${d.planta_label}`);
    lines.push(`Descripción: ${d.descripcion}`);
    if (d.responsable) lines.push(`Responsable: ${d.responsable}`);
    if (d.fecha_compromiso) lines.push(`Fecha compromiso: ${d.fecha_compromiso}`);
    if (d.resultado_cierre) lines.push(`Resultado de cierre: ${d.resultado_cierre}`);
    if (d.historial && d.historial.length > 0) {
      lines.push("Historial (creada → fecha_compromiso → cerrada):");
      lines.push(formatDicfHistorialCompact(d.historial));
    }
    lines.push("");
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
  let pool = [...(sessions || [])];
  const qNorm = normalizeDicfSearchText(question);
  const commercialTokens = commercialResolution?.search_tokens || [];

  if (commercialTokens.length > 0) {
    const byCommercial = pool.filter((s) =>
      textMatchesCommercialTokens(`${s.titulo || ""} ${s.resumen_ia || ""}`, commercialTokens)
    );
    if (byCommercial.length > 0) return byCommercial.slice(0, 10);
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

  return pool.slice(0, 10);
}

/**
 * @param {Array<{ fecha: string, tipo: string, titulo: string | null, resumen_ia: string, planta_nombre?: string | null }>} sessions
 * @param {string} question
 * @param {{ search_tokens?: string[] } | null | undefined} [commercialResolution]
 */
function buildBitacoraAnnex(sessions, question, commercialResolution = null) {
  const matched = filterBitacoraByQuestion(sessions, question, commercialResolution);
  const lines = [
    "---",
    "ANEXO — BITÁCORA IA (contexto de campo complementario)",
    "Usa Bitácora IA como contexto de campo complementario. No debe sustituir Action Register, DICF ni Mejora Continua.",
    "Solo resumen_ia. No convertir notas Plaud en acciones ni compromisos.",
    "",
    "SESIONES RELEVANTES:",
    "",
  ];

  if (matched.length === 0) {
    lines.push("(sin sesiones de bitácora coincidentes para esta consulta)");
  }

  for (const s of matched) {
    lines.push(`Fecha: ${s.fecha} | Tipo: ${s.tipo}${s.titulo ? ` | Título: ${s.titulo}` : ""}`);
    if (s.planta_nombre) lines.push(`Planta: ${s.planta_nombre}`);
    lines.push(`Resumen: ${s.resumen_ia || "(sin resumen)"}`);
    lines.push("");
  }

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
function buildFocusedBitacoraContext(sessions, question) {
  const annex = buildBitacoraAnnex(sessions, question);
  const lines = [
    "BITÁCORA IA — CONOCIMIENTO DE CAMPO",
    annex.text.replace(/^---\nANEXO — BITÁCORA IA \(contexto de campo complementario\)\n/, ""),
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
  } else if (opts.bitacoraOnlyFallback && opts.bitacoraAnnexText) {
    promptMode = "bitacora_focused";
    systemPrompt = DIRECTOR_IA_SYSTEM_PROMPT_BITACORA;
    userContent = [
      "Nota: No se encontró contexto suficiente en Action Register/DICF; se responde con Bitácora IA.",
      "",
      opts.bitacoraAnnexText.replace(
        /^---\nANEXO — BITÁCORA IA \(contexto de campo complementario\)\n/,
        "CONTEXTO BITÁCORA IA:\n"
      ),
      "",
      "Pregunta del ejecutivo:",
      q,
      "",
      "Responde con base en las sesiones de bitácora. No conviertas notas en acciones ni compromisos.",
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

  const hasBitacoraAnnex = Boolean(opts.bitacoraAnnexText && !opts.bitacoraOnlyFallback && promptMode !== "mejora_continua");
  if (hasBitacoraAnnex) {
    userContent = `${userContent}\n\n${opts.bitacoraAnnexText}`;
    if (!systemPrompt.includes("Bitácora IA")) {
      systemPrompt = `${systemPrompt}\n\n${BITACORA_ANNEX_SYSTEM_ADDENDUM}`;
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
  };
}

function isAiEnabled() {
  return process.env.AI_ENABLED === "true" || process.env.AI_ENABLED === "1";
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

    if (isDicfContextQuestion(question)) {
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
  const wantDicf = isDicfContextQuestion(q) && chatContext.dicf_details?.length > 0;
  const hasAr = hasRelevantActionRegisterContext(chatContext, q);

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
  if (!isAiEnabled()) {
    return { ok: false, error: "Asistente IA deshabilitado (AI_ENABLED)", status: 503 };
  }
  if (!OPENAI_API_KEY) {
    return { ok: false, error: "OPENAI_API_KEY no configurada", status: 503 };
  }

  const q = String(question || "").trim();
  if (!q) {
    return { ok: false, error: "question requerido", status: 400 };
  }

  const planta_id = Number(plantaId);
  if (!Number.isFinite(planta_id) || planta_id <= 0) {
    return { ok: false, error: "planta_id inválido", status: 400 };
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

    const dicfQuestion = isDicfContextQuestion(q);
    const bitacoraSessions = chatContext.bitacora || [];
    const wantDicf = dicfQuestion && chatContext.dicf_details?.length > 0;
    const hasAr = hasRelevantActionRegisterContext(chatContext, q);

    let bitacoraAnnex = null;
    if (shouldAttachBitacoraAnnex(q, chatContext)) {
      bitacoraAnnex = buildBitacoraAnnex(bitacoraSessions, q, commercialResolution);
    }

    const commercialPrompt = {
      commercialEntitiesBlock: commercialResolution.block || null,
      commercialResolution,
    };

    if (wantDicf) {
      focused = buildFocusedDicfContext(chatContext, q, commercialResolution);
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
  }

  const plantMetrics = chatContext ? getPlantSummaryMetrics(chatContext) : { open: 0, closed: 0, overdue: 0 };
  const focusType =
    focused?.meta?.focus_type ||
    focused?.meta?.focus ||
    (mejoraContinua ? "mejora_continua" : promptOpts.plantDiagnostic ? "plant_diagnostic" : null);

  const narrative =
    mejoraContinua ? false : isNarrativeQuestion(q) && !promptOpts.dicfFocused && !promptOpts.plantDiagnostic;
  const aggregate = mejoraContinua ? false : isAggregateQuestion(q) || Boolean(promptOpts.plantDiagnostic);

  const { systemPrompt, userContent, promptMode, hasBitacoraAnnex } = buildDirectorIaChatPrompt(
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
    planta_open: plantMetrics.open,
    focus_type: focusType,
    focus_meta: focused?.meta || null,
  });
  if (promptMode === "focused") {
    directorIaDebug("[DIRECTOR_IA] focused_context_sent:\n" + (focused?.text || ""));
  } else if (promptMode === "bitacora_focused") {
    directorIaDebug("[DIRECTOR_IA] context_mode: bitacora_focused");
    directorIaDebug("[DIRECTOR_IA] bitacora_context_sent:\n" + (focused?.text || ""));
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
        bitacoraOnlyFallback: Boolean(promptOpts.bitacoraOnlyFallback),
        commercialResolution,
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
  isBitacoraQuestion,
  shouldAttachBitacoraAnnex,
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
  DIRECTOR_IA_SYSTEM_PROMPT_DICF,
  DIRECTOR_IA_SYSTEM_PROMPT_BITACORA,
  BITACORA_ANNEX_SYSTEM_ADDENDUM,
  DIRECTOR_IA_SYSTEM_PROMPT_MEJORA_CONTINUA,
  COMMERCIAL_ENTITY_SYSTEM_ADDENDUM,
  CANONICAL_TEMAS,
  MEJORA_CONTINUA_KEYWORD_RE,
  DICF_CONTEXT_SIGNAL_RE,
  BITACORA_SIGNAL_RE,
};
