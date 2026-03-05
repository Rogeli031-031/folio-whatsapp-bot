"use strict";

const axios = require("axios");
const aiDb = require("./delta-ingreso-ai-db");
const deltaIngresoCommands = require("./delta-ingreso-commands");

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const PERIODO_A = (process.env.DELTA_INGRESO_AI_PERIODO_A || "2026-01").trim();
const PERIODO_B = (process.env.DELTA_INGRESO_AI_PERIODO_B || "2026-02").trim();
const WHY_TAGS = ["PRECIO", "COMPETENCIA", "CREDITO", "SERVICIO", "LOGISTICA", "CARTERA", "MIX_CANAL", "OTRO"];

async function openaiChat(systemPrompt, userContent) {
  const AI_ENABLED = process.env.AI_ENABLED === "true" || process.env.AI_ENABLED === "1";
if (!AI_ENABLED) return null;

  if (process.env.AI_ENABLED !== "true" && process.env.AI_ENABLED !== "1") {
    return null;
  }
  
  
  
  if (!OPENAI_API_KEY) {
    console.warn("[delta-ingreso-ai] OPENAI_API_KEY no configurada");
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
        max_tokens: 2000,
        temperature: 0.3,
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" }, timeout: 30000 }
    );
    const text = r.data?.choices?.[0]?.message?.content;
    return text || null;
  } catch (e) {
    console.error("[delta-ingreso-ai] OpenAI error:", e.response?.data || e.message);
    return null;
  }
}

/**
 * Construye un brief por planta a partir del resultado de Delta Ingreso (misma forma que la API).
 * Top 3 "No compran" + Top 3 "-Ingreso" (disminuyeron).
 */
function buildBrief(planta, deltaResult) {
  if (!deltaResult || !deltaResult.dejaron || !deltaResult.disminuyeron) {
    return { planta, topNoCompran: [], topMenosIngreso: [], periodoA: deltaResult?.periodoA, periodoB: deltaResult?.periodoB };
  }
  const topNoCompran = (deltaResult.dejaron.clientes || []).slice(0, 3).map((c) => ({
    cliente: c.cliente,
    ingresoAStr: c.ingresoAStr,
    kgAStr: c.kgAStr,
    kgBStr: c.kgBStr || "0.0",
  }));
  const topMenosIngreso = (deltaResult.disminuyeron.clientes || []).slice(0, 3).map((c) => ({
    cliente: c.cliente,
    ingresoAStr: c.ingresoAStr,
    ingresoBStr: c.ingresoBStr,
    deltaIngresoStr: c.deltaIngresoStr,
    kgAStr: c.kgAStr,
    kgBStr: c.kgBStr,
  }));
  return {
    planta,
    periodoA: deltaResult.periodoA,
    periodoB: deltaResult.periodoB,
    topNoCompran,
    topMenosIngreso,
    totalNegativoStr: deltaResult.dejaron.totalDeltaIngresoStr && deltaResult.disminuyeron.totalDeltaIngresoStr
      ? `No compran: ${deltaResult.dejaron.totalDeltaIngresoStr} · −Ingreso: ${deltaResult.disminuyeron.totalDeltaIngresoStr}` : "",
  };
}

/**
 * Redacta mensaje WhatsApp para gerente: asertivo, analítico, con datos y petición 5W2H por cliente.
 */
async function composeManagerQuestion(brief, openActionsByClient) {
  const systemPrompt = `Eres un asistente que escribe mensajes cortos para WhatsApp a gerentes de planta. Tono: asertivo, claro, respetuoso, analítico. Usa datos concretos (no inventes). Pide planes 5W2H POR CLIENTE. OBLIGATORIO: indicar explícitamente que deben ESCRIBIR y ENVIAR el plan por este mismo chat (respondiendo a este mensaje). Incluir que para cerrar un plan respondan: "CERRADO: <cliente> + breve evidencia". Formato: bullets breves.`;
  const userContent = `Planta: ${brief.planta}. Periodos: ${brief.periodoA} vs ${brief.periodoB}.

Top negativos (No compran): ${JSON.stringify(brief.topNoCompran)}
Top negativos (−Ingreso): ${JSON.stringify(brief.topMenosIngreso)}

Acciones ya abiertas (no repetir plan, pedir actualización): ${JSON.stringify(openActionsByClient || [])}

Genera UN solo mensaje WhatsApp (máx 950 caracteres) que:
1) Muestre los datos de cada cliente listado (cliente, ton A/B o delta según aplique).
2) Pida plan 5W2H por cada cliente listado (mínimo los más críticos).
3) Indique CLARAMENTE: "Escriban y envíen por este mismo chat (respondiendo aquí) el plan 5W2H para cada cliente, con WHAT, WHY, WHEN, WHO, HOW, HOW MUCH."
4) Indique que para cerrar respondan: CERRADO: <cliente> + evidencia.
5) Sea directo y con bullets.`;
  const text = await openaiChat(systemPrompt, userContent);
  if (text) return text.trim();
  return buildFallbackManagerMessage(brief, openActionsByClient);
}

function buildFallbackManagerMessage(brief, openActionsByClient) {
  let msg = `📊 Delta Ingreso ${brief.planta} (${brief.periodoA} → ${brief.periodoB})\n\n`;
  if (brief.topNoCompran && brief.topNoCompran.length) {
    msg += "• No compran:\n";
    brief.topNoCompran.forEach((c) => { msg += `  - ${c.cliente}: A ${c.ingresoAStr} (${c.kgAStr} ton)\n`; });
  }
  if (brief.topMenosIngreso && brief.topMenosIngreso.length) {
    msg += "• − Ingreso:\n";
    brief.topMenosIngreso.forEach((c) => { msg += `  - ${c.cliente}: delta ${c.deltaIngresoStr}\n`; });
  }
  msg += "\nEscriban y envíen por este mismo chat el plan 5W2H por cada cliente (WHAT, WHY, WHEN, WHO, HOW, HOW MUCH). Para cerrar respondan: CERRADO: <cliente> + evidencia.";
  return msg;
}

/**
 * Parsea respuesta del gerente: extrae bloques por cliente en formato 5W2H y detecta CERRADO.
 */
async function parsePlansByClient(replyText, plantCode) {
  const sistema = `Eres un asistente que parsea respuestas de gerentes. Extrae planes 5W2H POR CLIENTE. Responde SOLO un JSON válido (array de objetos) con esta estructura por cada cliente encontrado:
[{"cliente_norm":"nombre","what":"...","why_tag":"PRECIO|COMPETENCIA|CREDITO|SERVICIO|LOGISTICA|CARTERA|MIX_CANAL|OTRO","why_detail":"...","where_text":"...","when_date":"YYYY-MM-DD","who":"...","how_steps":["paso1","paso2"],"how_much_impact_kg":null,"how_much_impact_mxn":null,"notes":"..."}]
Si el mensaje contiene "CERRADO: <cliente>", incluye en la respuesta además un campo "cierres": [{"cliente_norm":"nombre","evidencia":"..."}].
Si no hay planes ni cierres, responde: {"planes":[],"cierres":[]}.`;
  const text = await openaiChat(sistema, `Planta: ${plantCode}. Respuesta del gerente:\n\n${replyText}`);
  if (!text) return { planes: [], cierres: [] };
  try {
    const cleaned = text.replace(/```json?\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return { planes: parsed, cierres: [] };
    return { planes: parsed.planes || [], cierres: parsed.cierres || [] };
  } catch (e) {
    return { planes: [], cierres: [] };
  }
}

/**
 * Reglas de seguimiento: PENDING => recordatorio; PARTIAL => pedir campos; RISK => fecha vencida.
 */
function followupRules(actions) {
  const pending = actions.filter((a) => !a.what && !a.when_date);
  const partial = actions.filter((a) => a.what && (!a.when_date || !a.who));
  const risk = actions.filter((a) => a.when_date && new Date(a.when_date) < new Date() && a.action_status !== "DONE");
  return { pending, partial, risk };
}

/**
 * Redacta resumen ejecutivo para ZP.
 */
async function composeZPSummary(allBriefs, actions, periodos, gerentesSinRespuesta) {
  const systemPrompt = `Eres un asistente que escribe resúmenes ejecutivos breves para el Director ZP. Tono: analítico, datos concretos. Incluye totales Negativo/Positivo, top 5 negativos globales, por planta top negativos con acción (WHAT/WHEN/WHO) y status (OPEN/IN_PROGRESS/RISK/DONE), gerentes sin respuesta, riesgos (acciones vencidas o sin fecha). Nota: DONE solo con confirmación del gerente.`;
  const userContent = `Periodos: ${periodos.periodoA} vs ${periodos.periodoB}.
Briefs por planta: ${JSON.stringify(allBriefs)}
Acciones: ${JSON.stringify(actions)}
Gerentes sin respuesta: ${JSON.stringify(gerentesSinRespuesta)}

Genera resumen ejecutivo en texto (máx 1200 caracteres), con bullets.`;
  const text = await openaiChat(systemPrompt, userContent);
  if (text) return text.trim();
  return `Resumen Delta Ingreso ${periodos.periodoA} → ${periodos.periodoB}. Total acciones: ${actions.length}. Sin respuesta: ${(gerentesSinRespuesta || []).length} gerentes.`;
}

/**
 * Detecta si el mensaje es cierre: "CERRADO: <cliente> ..."
 */
function detectCierres(text) {
  const cierres = [];
  const re = /CERRADO\s*:\s*([^\n]+?)(?:\s+|\n|$)([\s\S]*?)(?=CERRADO\s*:|$)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    cierres.push({ cliente_norm: m[1].trim(), evidencia: (m[2] || "").trim().substring(0, 200) });
  }
  if (cierres.length) return cierres;
  if (/CERRADO\s*:\s*.+/.i.test(text)) {
    const one = text.replace(/^[\s\S]*?CERRADO\s*:\s*/i, "").trim().split(/\n/)[0];
    if (one) cierres.push({ cliente_norm: one, evidencia: "" });
  }
  return cierres;
}

/**
 * Procesa mensaje entrante de un gerente (GG): parsea planes o cierres, actualiza DB, devuelve respuesta para enviar por WhatsApp.
 */
async function handleIncoming(client, fromPhone, text, actor, getDeltaIngresoDatosInternal, getUsersByRoleAndPlanta) {
  if (!actor || (actor.rol_clave !== "GG" && !String(actor.rol_nombre || "").toUpperCase().includes("GG"))) return null;
  const plantCode = actor.planta_nombre || actor.planta_id;
  if (!plantCode) return null;

  await aiDb.insertInbox(client, { from_phone: fromPhone, plant_code: plantCode, text });

  const cierres = detectCierres(text);
  if (cierres.length) {
    for (const c of cierres) {
      await aiDb.markActionClosed(client, plantCode, c.cliente_norm, PERIODO_A, PERIODO_B, fromPhone);
    }
    return `✅ Cierre registrado para: ${cierres.map((x) => x.cliente_norm).join(", ")}.`;
  }

  const { planes, cierres: cierresParsed } = await parsePlansByClient(text, plantCode);
  if (cierresParsed && cierresParsed.length) {
    for (const c of cierresParsed) {
      await aiDb.markActionClosed(client, plantCode, c.cliente_norm, PERIODO_A, PERIODO_B, fromPhone);
    }
    return `✅ Cierre registrado para: ${cierresParsed.map((x) => x.cliente_norm).join(", ")}.`;
  }

  if (planes && planes.length) {
    for (const p of planes) {
      const plan = {
        plant_code: plantCode,
        cliente_norm: p.cliente_norm,
        periodo_a: PERIODO_A,
        periodo_b: PERIODO_B,
        negative_type: p.negative_type || "NO_COMPRAN",
        what: p.what,
        why_tag: p.why_tag,
        why_detail: p.why_detail,
        where_text: p.where_text,
        when_date: p.when_date,
        who: p.who,
        how_steps: p.how_steps,
        how_much_impact_kg: p.how_much_impact_kg,
        how_much_impact_mxn: p.how_much_impact_mxn,
      };
      await aiDb.upsertAction(client, plan);
    }
    const faltan = planes.filter((p) => !p.what || !p.when_date || !p.who || !(p.how_steps && p.how_steps.length));
    if (faltan.length) {
      return `Recibido. Faltan campos para: ${faltan.map((f) => f.cliente_norm).join(", ")}. Indica WHAT, WHEN, WHO y al menos un paso en HOW.`;
    }
    return `✅ Planes registrados para ${planes.length} cliente(s). Para cerrar más adelante responde: CERRADO: <cliente> + evidencia.`;
  }

  return null;
}

/**
 * Q&A: responde preguntas sobre Delta Ingreso usando solo el contexto proporcionado.
 * context = { role: 'ZP'|'GG', periodos: { periodoA, periodoB }, briefs?: [], brief?: {} }
 */
async function answerDeltaIngresoQuestion(question, context, actorRole) {
  const systemPrompt = `Eres un asistente que solo habla de Delta Ingreso (comparativa de ingresos entre dos periodos por planta/cliente).
Responde ÚNICAMENTE con la información del contexto proporcionado. No inventes datos ni hables de otros temas.
Si la pregunta no se puede responder con el contexto, di brevemente que solo tienes información de Delta Ingreso para los periodos indicados.
Responde en español, de forma breve y clara (apta para WhatsApp). Máximo ~400 caracteres.`;
  const periodos = context?.periodos ? `${context.periodos.periodoA} vs ${context.periodos.periodoB}` : "N/A";
  const contextStr = context?.briefs?.length
    ? `Contexto (todas las plantas Provincia): ${JSON.stringify(context.briefs)}`
    : context?.brief
      ? `Contexto (tu planta): ${JSON.stringify(context.brief)}`
      : "Sin datos de contexto.";
  const userContent = `Periodos: ${periodos}\n\n${contextStr}\n\nPregunta del ${actorRole === "ZP" ? "Director" : "gerente"}: ${question}`;
  const text = await openaiChat(systemPrompt, userContent);
  return text ? text.trim() : null;
}

/**
 * Parsea si ZP pide "preguntale al GG/gerente y me informas": extrae planta (o ALL) y la pregunta a reenviar.
 * Devuelve { isAskGG: true, plant_code: string, question_text: string } o { isAskGG: false }.
 */
async function parseZPAskGGIntent(text, plantCodesHint) {
  const plantsStr = (plantCodesHint && plantCodesHint.length) ? plantCodesHint.join(", ") : "Acapulco, Morelos, Puebla, Querétaro, San Luis, Tehuacán";
  const systemPrompt = `Eres un asistente que detecta si el Director ZP está pidiendo que se le pregunte algo a un gerente (GG) y se le informe la respuesta.
Si el mensaje indica algo como "preguntale al gerente", "preguntale al GG", "que me informe el gerente", "avísame cuando tengas la información", "pregunta a [planta] y me informas", extrae:
1) plant_code: nombre de la planta (uno de: ${plantsStr}) o "ALL" si no especifica planta o dice "a todos".
2) question_text: la pregunta concreta que debe hacerse al gerente (texto breve y claro).
Responde SOLO un JSON válido: {"isAskGG": true, "plant_code": "Puebla", "question_text": "¿cuándo esperan recuperar al cliente X?"}
Si no es una petición para preguntar a un gerente, responde: {"isAskGG": false}`;
  const userContent = `Mensaje del Director: ${text}`;
  const out = await openaiChat(systemPrompt, userContent);
  if (!out) return { isAskGG: false };
  try {
    const cleaned = out.replace(/```json?\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.isAskGG && parsed.question_text) {
      return {
        isAskGG: true,
        plant_code: (parsed.plant_code && String(parsed.plant_code).trim()) || "ALL",
        question_text: String(parsed.question_text).trim().substring(0, 800),
      };
    }
  } catch (e) {
    /* ignore */
  }
  return { isAskGG: false };
}

/** Solo cuando el texto es explícito "preguntar al GG". Determinístico. */
function isExplicitAskGG(text) {
  return deltaIngresoCommands.isExplicitAskGG(text);
}

/** Heurística: consulta de datos (venta/descuento/top) => responder con BD, no escalar. */
function isDataQuery(text) {
  return deltaIngresoCommands.isDataQuery(text);
}

module.exports = {
  buildBrief,
  composeManagerQuestion,
  parsePlansByClient,
  followupRules,
  composeZPSummary,
  detectCierres,
  handleIncoming,
  answerDeltaIngresoQuestion,
  parseZPAskGGIntent,
  isExplicitAskGG,
  isDataQuery,
  PERIODO_A,
  PERIODO_B,
};
