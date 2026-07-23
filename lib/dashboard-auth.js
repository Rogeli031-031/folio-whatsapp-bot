"use strict";

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.DASHBOARD_JWT_SECRET || process.env.JWT_SECRET || "folio-dashboard-secret-change-in-production";
const JWT_EXPIRES_IN = "20h";

/**
 * Normaliza un token recibido por URL/WhatsApp a JWT estándar.
 * WhatsApp corta hipervínculos en "."; por eso en los mensajes se envía "~"
 * (y a veces "%2E") en lugar del punto del JWT.
 * @param {string} token
 * @returns {string}
 */
function normalizeDashboardToken(token) {
  if (!token || typeof token !== "string") return "";
  let t = token.trim();
  try {
    // Si llegó doblemente encodeado o con %2E literales.
    if (/%2E/i.test(t) || /%7E/i.test(t)) t = decodeURIComponent(t);
  } catch (_) {
    /* ignore */
  }
  return t.replace(/~/g, ".");
}

/**
 * Crea un token JWT para acceso al dashboard.
 * @param {Object} payload - { role: "ZP"|"GG", actor_id, plantas_permitidas: number[], default_filters?: {}, permisos?: object }
 * @returns {string} JWT
 */
function createDashboardToken(payload) {
  const body = {
    role: payload.role,
    actor_id: payload.actor_id,
    plantas_permitidas: payload.plantas_permitidas || [],
    default_filters: payload.default_filters || {},
  };
  if (payload.permisos && typeof payload.permisos === "object" && Object.keys(payload.permisos).length > 0) {
    body.permisos = payload.permisos;
  }
  return jwt.sign(body, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Codifica un JWT para query ?t= en mensajes de WhatsApp.
 * WhatsApp corta el hipervínculo en el primer "." del JWT
 * (header.payload.signature). "%2E" mantiene un solo enlace y el
 * navegador / Express lo decodifican a "." sin cambios en el frontend.
 * También se acepta "~" al verificar (por si llega de clientes viejos).
 * @param {string} token
 * @returns {string}
 */
function encodeDashboardTokenForWhatsAppUrl(token) {
  return encodeURIComponent(String(token || "")).replace(/\./g, "%2E");
}

/**
 * Verifica el token y devuelve el payload o null.
 * @param {string} token
 * @returns {{ role, actor_id, plantas_permitidas, default_filters } | null}
 */
function verifyDashboardToken(token) {
  const raw = normalizeDashboardToken(token);
  if (!raw) return null;
  try {
    const decoded = jwt.verify(raw, JWT_SECRET);
    return decoded;
  } catch (e) {
    return null;
  }
}

/** Token corta vida para descarga Excel "Cómo cambió" IGF (15 min). */
const IGF_EXCEL_EXPIRES = "15m";

function createIgfComoCambioToken(payload) {
  const pl = {
    igfExcel: true,
    planta: payload.planta,
    yearA: payload.yearA, monthA: payload.monthA, versionA: payload.versionA,
    yearB: payload.yearB, monthB: payload.monthB, versionB: payload.versionB,
  };
  return jwt.sign(pl, JWT_SECRET, { expiresIn: IGF_EXCEL_EXPIRES });
}

function verifyIgfComoCambioToken(token) {
  const raw = normalizeDashboardToken(token);
  if (!raw) return null;
  try {
    const decoded = jwt.verify(raw, JWT_SECRET);
    if (!decoded || decoded.igfExcel !== true) return null;
    if (decoded.yearA != null && decoded.monthA != null && decoded.versionA != null && decoded.yearB != null && decoded.monthB != null && decoded.versionB != null) {
      return decoded;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Middleware Express: extrae token de Authorization: Bearer <t> o query ?t= y valida.
 * Si es válido, req.dashboardAuth = payload. Si no, 401 JSON.
 */
function dashboardAuthMiddleware(req, res, next) {
  console.log("[dashboardAuth] auth header presente:", !!req.headers.authorization);
  const raw =
    (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, "").trim()) ||
    (req.query && req.query.t && String(req.query.t).trim()) ||
    "";
  const payload = verifyDashboardToken(raw);
  if (!payload) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
  req.dashboardAuth = payload;
  next();
}

module.exports = {
  createDashboardToken,
  encodeDashboardTokenForWhatsAppUrl,
  normalizeDashboardToken,
  verifyDashboardToken,
  dashboardAuthMiddleware,
  createIgfComoCambioToken,
  verifyIgfComoCambioToken,
};
