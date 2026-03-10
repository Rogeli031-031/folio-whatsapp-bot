"use strict";

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.DASHBOARD_JWT_SECRET || process.env.JWT_SECRET || "folio-dashboard-secret-change-in-production";
const JWT_EXPIRES_IN = "5h";

/**
 * Crea un token JWT para acceso al dashboard.
 * @param {Object} payload - { role: "ZP"|"GG", actor_id, plantas_permitidas: number[], default_filters?: {} }
 * @returns {string} JWT
 */
function createDashboardToken(payload) {
  return jwt.sign(
    {
      role: payload.role,
      actor_id: payload.actor_id,
      plantas_permitidas: payload.plantas_permitidas || [],
      default_filters: payload.default_filters || {},
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verifica el token y devuelve el payload o null.
 * @param {string} token
 * @returns {{ role, actor_id, plantas_permitidas, default_filters } | null}
 */
function verifyDashboardToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const decoded = jwt.verify(token.trim(), JWT_SECRET);
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
  if (!token || typeof token !== "string") return null;
  try {
    const decoded = jwt.verify(token.trim(), JWT_SECRET);
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
  verifyDashboardToken,
  dashboardAuthMiddleware,
  createIgfComoCambioToken,
  verifyIgfComoCambioToken,
};
