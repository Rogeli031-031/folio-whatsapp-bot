"use strict";

const axios = require("axios");
const aiDb = require("./delta-ingreso-ai-db");

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const PERIODO_A = (process.env.DELTA_INGRESO_AI_PERIODO_A || "2026-01").trim();
const PERIODO_B = (process.env.DELTA_INGRESO_AI_PERIODO_B || "2026-02").trim();
const WHY_TAGS = ["PRECIO", "COMPETENCIA", "CREDITO", "SERVICIO", "LOGISTICA", "CARTERA", "MIX_CANAL", "OTRO"];

async function openaiChat(systemPrompt, userContent) {
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
  const systemPrompt = `Eres un asistente que escribe mensajes cortos para WhatsApp a gerentes de planta. Tono: asertivo, claro, respetuoso, analítico. Usa datos concretos (no inventes). Pide planes 5W2H POR CLIENTE. Formato: bullets breves. Incluye instrucción: para cerrar un plan el gerente debe responder "CERRADO: <cliente> + breve evidencia".`;
  const userContent = `Planta: ${brief.planta}. Periodos: ${brief.periodoA} vs ${brief.periodoB}.

Top negativos (No compran): ${JSON.stringify(brief.topNoCompran)}
Top negativos (−Ingreso): ${JSON.stringify(brief.topMenosIngreso)}

Acciones ya abiertas (no repetir plan, pedir actualización): ${JSON.stringify(openActionsByClient || [])}

Genera UN solo mensaje WhatsApp (máx 900 caracteres) que:
1) Muestre los datos de cada cliente listado (cliente, ton A/B o delta según aplique).
2) Pida plan 5W2H por cada cliente listado (mínimo los 3 más críticos).
3) Indique que para cerrar debe responder: CERRADO: <cliente> + evidencia.
4) Sea directo y con bullets.`;
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
  msg += "\nNecesito tu plan 5W2H por cada cliente (WHAT, WHY, WHEN, WHO, HOW, HOW MUCH). Para cerrar responde: CERRADO: <cliente> + evidencia.";
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

module.exports = {
  buildBrief,
  composeManagerQuestion,
  parsePlansByClient,
  followupRules,
  composeZPSummary,
  detectCierres,
  handleIncoming,
  answerDeltaIngresoQuestion,
  PERIODO_A,
  PERIODO_B,
};
