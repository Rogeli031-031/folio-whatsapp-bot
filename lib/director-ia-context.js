"use strict";

const { isDirectorIaEnabled } = require("./director-ia");
const { buildActionRegisterBoardPayload } = require("./action-register-board");
const {
  summarizeActionRegisterBoard,
  summarizeActionRegisterResponsables,
  summarizeActionRegisterTemas,
} = require("./director-ia-action-register");

/** Fuentes previstas; módulos no conectados permanecen en false. */
const EMPTY_SOURCES = Object.freeze({
  igf: false,
  arr: false,
  dicf: false,
  action_register: false,
});

/** @type {{ pool?: import("pg").Pool, assertPlantaAccess?: (req: object, plantaId: number) => boolean, ensureActionRegisterTables?: (client: import("pg").PoolClient) => Promise<void> }} */
let deps = {};

function configureDirectorIaContext(injected) {
  deps = { ...deps, ...injected };
}

/**
 * @param {import("express").Request} req
 * @returns {Promise<{ enabled: true, timestamp: string, sources: typeof EMPTY_SOURCES, action_register: object }>}
 */
async function buildDirectorIaContextPayload(req) {
  const sources = { ...EMPTY_SOURCES };
  const base = {
    enabled: true,
    timestamp: new Date().toISOString(),
    sources,
  };

  const planta_id =
    req.query && req.query.planta_id != null ? parseInt(String(req.query.planta_id), 10) : null;

  if (!planta_id || !Number.isFinite(planta_id)) {
    return {
      ...base,
      action_register: { ok: false, error: "planta_id requerido" },
    };
  }

  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return {
      ...base,
      action_register: { ok: false, error: "Sin acceso a esta planta" },
    };
  }

  if (!deps.pool || !deps.ensureActionRegisterTables) {
    return {
      ...base,
      action_register: { ok: false, error: "Contexto Director IA no configurado" },
    };
  }

  const client = await deps.pool.connect();
  try {
    const board = await buildActionRegisterBoardPayload(client, planta_id, {
      ensureActionRegisterTables: deps.ensureActionRegisterTables,
      includeDicf: true,
      includeNotes: false,
    });
    const summary = summarizeActionRegisterBoard(board);
    const responsables = summarizeActionRegisterResponsables(board);
    const temas = summarizeActionRegisterTemas(board);
    sources.action_register = true;
    return {
      ...base,
      sources,
      action_register: {
        ok: true,
        summary,
        responsables,
        temas,
      },
    };
  } catch (e) {
    console.error("[Director IA action_register]", e);
    return {
      ...base,
      action_register: {
        ok: false,
        error: e.message || "Error al cargar Action Register",
      },
    };
  } finally {
    client.release();
  }
}

/**
 * GET /api/director-ia/context
 * Requiere dashboardAuthMiddleware antes de invocar.
 */
async function handleGetContext(req, res) {
  if (!isDirectorIaEnabled()) {
    return res.status(200).json({ enabled: false });
  }
  try {
    const payload = await buildDirectorIaContextPayload(req);
    return res.status(200).json(payload);
  } catch (e) {
    console.error("[Director IA context]", e);
    return res.status(500).json({ error: e.message || "Error al construir contexto" });
  }
}

module.exports = {
  configureDirectorIaContext,
  buildDirectorIaContextPayload,
  handleGetContext,
  EMPTY_SOURCES,
};
