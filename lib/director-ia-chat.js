"use strict";

const axios = require("axios");
const { isDirectorIaEnabled } = require("./director-ia");
const { buildDirectorIaContextPayload } = require("./director-ia-context");

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const MAX_ACTIONS_FOR_NARRATIVE = 10;

function isDirectorIaDebug() {
  return process.env.DIRECTOR_IA_DEBUG === "true" || process.env.DIRECTOR_IA_DEBUG === "1";
}

function directorIaDebug(...args) {
  if (isDirectorIaDebug()) console.log(...args);
}

/** Temas canónicos Action Register (alineado con action-register-board). */
const CANONICAL_TEMAS = [
  "Contrataciones",
  "Mantenimiento",
  "General",
  "Clientes",
  "Apoyos",
  "Licencias",
  "Taller",
];

const TEMA_QUERY_ALIASES = [
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
  /\b(mantenimiento|seguridad|clientes?|taller|contrataciones?|licencias?|apoyos?|proyectos?|avances?|actividades?|trabajando|trabaja|trabajan|haciendo|pendiente|pendientes|estatus|objetivos?|general|responsable|responsables|atiende|atienden|seguimiento|lidera|liderando)\b|acciones\s+de\s+|qué\s+acciones\s+tiene|qué\s+est[aá]\s+haciendo|qué\s+lleva\s+actualmente|qué\s+proyectos?\s+lleva|qué\s+tiene\s+pendiente|en\s+qué\s+trabaja|quién\s+est[aá]\s+dando\s+seguimiento/i;

const AGGREGATE_SIGNAL_RE =
  /\b(riesgo|vencid|presidencia|resumen\s+ejecutivo|estado\s+general|principal\s+riesgo|más\s+vencidas|mas\s+vencidas|quién\s+tiene\s+más|quien\s+tiene\s+más|concentra\s+más\s+retraso|concentra\s+más\s+riesgo|top\s+acciones|hallazgos?)\b/i;

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

Cuando el contexto esté en formato focalizado (TEMA CONSULTADO / ACCIONES ABIERTAS):
- DEBES citar al menos dos títulos literales de la sección ACCIONES ABIERTAS si existen.
- NO respondas únicamente con cifras de MÉTRICAS; eso se considera incorrecto.
- Orden recomendado: situación → actividades (títulos) → responsables → riesgos → recomendación.

Cuando el contexto sea agregado (JSON completo), usa summary, executive_summary, temas, responsables, top_overdue y tema_details según corresponda.`;

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

/**
 * @param {string} question
 */
function isAggregateQuestion(question) {
  return AGGREGATE_SIGNAL_RE.test(String(question || ""));
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
 * @param {Array<Record<string, unknown>>} actions
 * @param {{ includeTema?: boolean, titleOnly?: boolean }} [opts]
 */
function formatActionsExecutiveSection(actions, opts = {}) {
  const sorted = sortActionsForNarrative(actions).slice(0, MAX_ACTIONS_FOR_NARRATIVE);
  const lines = ["ACCIONES ABIERTAS MÁS RELEVANTES", ""];
  if (sorted.length === 0) {
    lines.push("(ninguna acción abierta registrada)");
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
 * @param {ReturnType<typeof extractChatContextFromPayload>} chatContext
 * @param {string} question
 * @returns {{ text: string, meta: object }}
 */
function buildFocusedNarrativeContext(chatContext, question) {
  const focus = resolveNarrativeFocus(question, chatContext);
  const lines = [];

  if (!focus) {
    lines.push("CONTEXTO FOCALIZADO: sin tema o responsable detectado en la pregunta.");
    const fallbackActions = [];
    for (const td of (chatContext.tema_details || []).slice(0, 2)) {
      fallbackActions.push(...(td.open_actions || []).map((a) => ({ ...a, tema: td.tema })));
    }
    lines.push("");
    lines.push(formatActionsExecutiveSection(fallbackActions, { includeTema: true }));
    return {
      text: lines.join("\n"),
      meta: { mode: "focused", focus: "fallback", tema: null },
    };
  }

  if (focus.type === "person") {
    const actions = collectActionsByPerson(chatContext, focus.name);
    const displayName = focus.name;
    lines.push(`RESPONSABLE CONSULTADO: ${displayName.toUpperCase()}`);
    lines.push("");
    lines.push(formatActionsExecutiveSection(actions, { includeTema: true }));
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
      meta: { mode: "focused", focus: "person", name: displayName, action_count: actions.length },
    };
  }

  if (focus.type === "keyword") {
    const actions = collectActionsByKeyword(chatContext, focus.keyword);
    lines.push(`TEMA / BÚSQUEDA CONSULTADA: ${focus.keyword.toUpperCase()}`);
    lines.push("");
    lines.push(formatActionsExecutiveSection(actions, { includeTema: true }));
    lines.push("");
    lines.push("MÉTRICAS (referencia al final de la respuesta):");
    lines.push(`- Acciones encontradas con evidencia: ${actions.length}`);
    return {
      text: lines.join("\n"),
      meta: { mode: "focused", focus: "keyword", keyword: focus.keyword, action_count: actions.length },
    };
  }

  const td = findTemaDetail(chatContext, focus.tema);
  const temaRow = (chatContext.temas || []).find(
    (t) => normalizeTemaKey(t.name) === normalizeTemaKey(focus.tema)
  );

  lines.push(`TEMA CONSULTADO: ${String(focus.tema).toUpperCase()}`);
  lines.push("");
  lines.push(formatActionsExecutiveSection(td?.open_actions || []));
  lines.push("");
  lines.push("RESPONSABLES PRINCIPALES:");
  lines.push(formatResponsablesList(td?.responsables || []));
  lines.push("");
  lines.push("MÉTRICAS (referencia al final de la respuesta):");
  if (td) {
    lines.push(`- Acciones abiertas: ${td.open_count}`);
    lines.push(`- Vencidas válidas: ${td.overdue_count}`);
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
  };
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} context
 * @param {string} question
 * @param {{ useFocused?: boolean, focusedText?: string }} [opts]
 */
function buildDirectorIaChatPrompt(context, question, opts = {}) {
  const q = String(question || "").trim();
  let userContent;
  let systemPrompt = DIRECTOR_IA_SYSTEM_PROMPT;
  let promptMode = "full";

  if (opts.useFocused && opts.focusedText) {
    promptMode = "focused";
    systemPrompt = DIRECTOR_IA_SYSTEM_PROMPT_NARRATIVE;
    userContent = [
      "Contexto focalizado (única fuente de verdad para esta respuesta):",
      opts.focusedText,
      "",
      "Pregunta del ejecutivo:",
      q,
      "",
      "Recuerda: inicia con las actividades (títulos en ACCIONES ABIERTAS MÁS RELEVANTES), no con conteos. Métricas al final.",
    ].join("\n");
  } else {
    const contextJson = JSON.stringify(context, null, 2);
    userContent = [
      "Contexto operativo agregado de la planta (única fuente de verdad):",
      contextJson,
      "",
      "Pregunta del ejecutivo:",
      q,
    ].join("\n");
  }

  return {
    systemPrompt,
    userContent,
    promptMode,
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
  const sources = new Set();
  const q = String(question || "").toLowerCase();
  const a = String(answer || "").toLowerCase();
  const blob = `${q} ${a}`;

  sources.add("action_register.summary");

  if (opts.promptMode === "focused" || isNarrativeQuestion(question)) {
    sources.add("action_register.tema_details");
  }

  if (
    /responsab|vencid|abiert|retraso|concentra|quién|quien/.test(blob) ||
    /más vencidas|mas vencidas/.test(q)
  ) {
    sources.add("action_register.responsables");
  }
  if (/tema|mantenimiento|clientes|seguridad|operaci|avance|progreso/.test(blob)) {
    sources.add("action_register.temas");
  }
  if (/riesgo|hallazgo|presidencia|resumen|situaci|estado actual|ejecutivo/.test(blob)) {
    sources.add("action_register.executive_summary");
  }
  if (/atrasad|crític|critica|prioridad|acción|accion|vencid/.test(blob)) {
    sources.add("action_register.top_overdue");
  }
  if (
    (context?.invalid_overdue?.count > 0 && /inválid|invalid|calidad|exclu/.test(blob)) ||
    /fecha inválid/.test(blob)
  ) {
    sources.add("action_register.invalid_overdue");
  }

  if (isAggregateQuestion(question)) {
    sources.add("action_register.executive_summary");
    if (/vencid/.test(q)) sources.add("action_register.top_overdue");
  }

  return [...sources].sort();
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

  const contextReq = {
    ...req,
    query: { ...(req.query || {}), planta_id: String(planta_id) },
  };

  const fullPayload = await buildDirectorIaContextPayload(contextReq);
  const chatContext = extractChatContextFromPayload(fullPayload);

  if (!chatContext) {
    const err =
      fullPayload?.action_register?.error ||
      "No se pudo cargar el contexto de Action Register para esta planta";
    const status = err.includes("Sin acceso") ? 403 : 400;
    return { ok: false, error: err, status };
  }

  const narrative = isNarrativeQuestion(q);
  const aggregate = isAggregateQuestion(q);
  let focused = null;
  let promptOpts = {};

  if (narrative) {
    focused = buildFocusedNarrativeContext(chatContext, q);
    promptOpts = { useFocused: true, focusedText: focused.text };
  }

  const { systemPrompt, userContent, promptMode } = buildDirectorIaChatPrompt(
    chatContext,
    q,
    promptOpts
  );

  directorIaDebug("[DIRECTOR_IA] question_class:", {
    narrative,
    aggregate,
    promptMode,
    focus_meta: focused?.meta || null,
  });
  if (promptMode === "focused") {
    directorIaDebug("[DIRECTOR_IA] focused_context_sent:\n" + (focused?.text || ""));
  } else {
    directorIaDebug("[DIRECTOR_IA] context_mode: full_aggregated");
    directorIaDebug("[DIRECTOR_IA] tema_details temas:", chatContext.tema_details?.length || 0);
  }

  const answer = await openaiDirectorIaChat(systemPrompt, userContent);
  directorIaDebug("[DIRECTOR_IA] answer preview:", answer ? String(answer).slice(0, 500) : null);

  if (!answer) {
    return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
  }

  const sources = inferSourcesFromChat(chatContext, q, answer, { promptMode });

  return {
    ok: true,
    answer,
    sources,
    context_meta: {
      planta_id,
      timestamp: fullPayload.timestamp || new Date().toISOString(),
      prompt_mode: promptMode,
      focus: focused?.meta || { mode: "full" },
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
  buildDirectorIaChatPrompt,
  buildFocusedNarrativeContext,
  extractChatContextFromPayload,
  inferSourcesFromChat,
  isNarrativeQuestion,
  isAggregateQuestion,
  resolveNarrativeFocus,
  sortActionsForNarrative,
  formatActionsExecutiveSection,
  MAX_ACTIONS_FOR_NARRATIVE,
  directorIaDebug,
  askDirectorIa,
  handlePostChat,
  DIRECTOR_IA_SYSTEM_PROMPT,
  CANONICAL_TEMAS,
};
