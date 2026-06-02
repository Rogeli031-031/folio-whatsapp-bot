"use strict";

const { isDirectorIaEnabled } = require("./director-ia");

/** Fuentes previstas; en fase 1 todas permanecen en false (sin agregar módulos). */
const EMPTY_SOURCES = Object.freeze({
  igf: false,
  arr: false,
  dicf: false,
  action_register: false,
});

/**
 * Payload de contexto Director IA (solo lectura, sin datos de módulos en fase 1).
 * @returns {{ enabled: true, timestamp: string, sources: typeof EMPTY_SOURCES }}
 */
function buildDirectorIaContextPayload() {
  return {
    enabled: true,
    timestamp: new Date().toISOString(),
    sources: { ...EMPTY_SOURCES },
  };
}

/**
 * GET /api/director-ia/context
 * Requiere dashboardAuthMiddleware antes de invocar.
 */
function handleGetContext(req, res) {
  if (!isDirectorIaEnabled()) {
    return res.status(200).json({ enabled: false });
  }
  try {
    return res.status(200).json(buildDirectorIaContextPayload());
  } catch (e) {
    console.error("[Director IA context]", e);
    return res.status(500).json({ error: e.message || "Error al construir contexto" });
  }
}

module.exports = {
  buildDirectorIaContextPayload,
  handleGetContext,
  EMPTY_SOURCES,
};
