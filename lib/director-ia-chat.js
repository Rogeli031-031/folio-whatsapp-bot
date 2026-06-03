"use strict";

const axios = require("axios");
const { isDirectorIaEnabled } = require("./director-ia");
const { buildDirectorIaContextPayload } = require("./director-ia-context");

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();

const DIRECTOR_IA_SYSTEM_PROMPT = `Eres el Director Ejecutivo de Operaciones de una organización industrial.
Respondes preguntas de un Director General o Presidente sobre el estado de acciones y compromisos de una planta.

Reglas obligatorias:
- NO inventes datos.
- NO supongas acciones, personas o proyectos que no aparezcan en el contexto.
- Si no existe información suficiente para responder, indica claramente que no existe evidencia en la información disponible.
- Utiliza únicamente la información proporcionada en el contexto.
- No menciones bases de datos, JSON, APIs ni estructuras técnicas.
- Redacta en español, de forma clara, ejecutiva y concisa.
- Cuando cites cifras, usa los valores exactos del contexto.
- Las acciones vencidas en métricas ejecutivas excluyen fechas inválidas; si preguntan por ellas, menciona invalid_overdue.count si aplica.
- Los "temas" son categorías operativas (Mantenimiento, Clientes, etc.), no confundir con proyectos estratégicos salvo que el título de una acción lo indique en top_overdue.`;

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
  };
}

/**
 * @param {ReturnType<typeof extractChatContextFromPayload>} context
 * @param {string} question
 */
function buildDirectorIaChatPrompt(context, question) {
  const contextJson = JSON.stringify(context, null, 2);
  const userContent = [
    "Contexto operativo de la planta (única fuente de verdad):",
    contextJson,
    "",
    "Pregunta del ejecutivo:",
    String(question || "").trim(),
  ].join("\n");
  return {
    systemPrompt: DIRECTOR_IA_SYSTEM_PROMPT,
    userContent,
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
 * Inferencia heurística de fuentes citadas (auditoría).
 * @param {ReturnType<typeof extractChatContextFromPayload>} context
 * @param {string} question
 * @param {string} answer
 * @returns {string[]}
 */
function inferSourcesFromChat(context, question, answer) {
  const sources = new Set();
  const q = String(question || "").toLowerCase();
  const a = String(answer || "").toLowerCase();
  const blob = `${q} ${a}`;

  sources.add("action_register.summary");

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

  if (/riesgo/.test(q)) {
    sources.add("action_register.executive_summary");
    sources.add("action_register.temas");
  }
  if (/presidencia|resume|resumen/.test(q)) {
    sources.add("action_register.executive_summary");
    sources.add("action_register.summary");
  }
  if (/proyecto|seguridad/.test(q) && !sources.has("action_register.top_overdue")) {
    sources.add("action_register.temas");
    sources.add("action_register.top_overdue");
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

  const { systemPrompt, userContent } = buildDirectorIaChatPrompt(chatContext, q);
  const answer = await openaiDirectorIaChat(systemPrompt, userContent);

  if (!answer) {
    return { ok: false, error: "No se pudo obtener respuesta del modelo", status: 502 };
  }

  const sources = inferSourcesFromChat(chatContext, q, answer);

  return {
    ok: true,
    answer,
    sources,
    context_meta: {
      planta_id,
      timestamp: fullPayload.timestamp || new Date().toISOString(),
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
  extractChatContextFromPayload,
  inferSourcesFromChat,
  askDirectorIa,
  handlePostChat,
  DIRECTOR_IA_SYSTEM_PROMPT,
};
