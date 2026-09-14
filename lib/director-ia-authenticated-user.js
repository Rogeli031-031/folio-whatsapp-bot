"use strict";

/**
 * Identidad de saludo: solo JWT actor_id → usuarios.nombre_persona.
 * No puesto, no rol, no claim de display del token, no memoria, no cache global.
 */

const GREETING_KINDS = Object.freeze({
  HOLA: "hola",
  BUENOS_DIAS: "buenos_dias",
  BUEN_DIA: "buen_dia",
  BUENAS_TARDES: "buenas_tardes",
  BUENAS_NOCHES: "buenas_noches",
});

const GREETING_OPENING = Object.freeze({
  hola: "Hola",
  buenos_dias: "Buenos días",
  buen_dia: "Buen día",
  buenas_tardes: "Buenas tardes",
  buenas_noches: "Buenas noches",
});

function resolveActorIdFromAuth(req) {
  const auth = req && req.dashboardAuth;
  const n = Number(auth && auth.actor_id);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function sanitizeNombrePersona(raw) {
  if (raw == null) return null;
  const name = String(raw)
    .replace(/\s+/g, " ")
    .trim();
  if (name.length < 2) return null;
  return name;
}

function classifyGreetingKind(normalizedText) {
  const t = String(normalizedText || "").trim();
  if (t === "buenos dias") return GREETING_KINDS.BUENOS_DIAS;
  if (t === "buen dia") return GREETING_KINDS.BUEN_DIA;
  if (t === "buenas tardes") return GREETING_KINDS.BUENAS_TARDES;
  if (t === "buenas noches") return GREETING_KINDS.BUENAS_NOCHES;
  return GREETING_KINDS.HOLA;
}

function buildIdentityGreeting(greetingKind, nombrePersona) {
  const kind = GREETING_OPENING[greetingKind] ? greetingKind : GREETING_KINDS.HOLA;
  const opening = GREETING_OPENING[kind];
  const name = sanitizeNombrePersona(nombrePersona);
  if (name) return `${opening}, ${name}. ¿En qué te ayudo?`;
  return `${opening}. ¿En qué te ayudo?`;
}

async function loadNombrePersonaByActorId(pool, actorId) {
  const id = Number(actorId);
  if (!Number.isFinite(id) || id <= 0) return null;
  if (!pool || typeof pool.query !== "function") return null;
  try {
    const r = await pool.query(
      `SELECT nombre_persona FROM public.usuarios WHERE id = $1 LIMIT 1`,
      [id]
    );
    const row = r && r.rows && r.rows[0];
    return sanitizeNombrePersona(row && row.nombre_persona);
  } catch (_err) {
    return null;
  }
}

async function resolveGreetingIdentity(req, pool) {
  const actorId = resolveActorIdFromAuth(req);
  if (!actorId) return { actor_id: null, nombre_persona: null };
  const nombre_persona = await loadNombrePersonaByActorId(pool, actorId);
  return { actor_id: actorId, nombre_persona };
}

module.exports = {
  GREETING_KINDS,
  resolveActorIdFromAuth,
  sanitizeNombrePersona,
  classifyGreetingKind,
  buildIdentityGreeting,
  loadNombrePersonaByActorId,
  resolveGreetingIdentity,
};
