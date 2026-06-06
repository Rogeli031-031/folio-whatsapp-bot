"use strict";

const { isDirectorIaEnabled } = require("./director-ia");
const { buildActionRegisterBoardPayload } = require("./action-register-board");
const dicfAccionesLib = require("./dicf-acciones");
const { loadBitacoraForChat, ensureDirectorIaBitacoraTable } = require("./director-ia-bitacora");
const {
  summarizeActionRegisterBoard,
  summarizeActionRegisterResponsables,
  summarizeActionRegisterTemas,
  summarizeTopOverdueActions,
  summarizeInvalidOverdue,
  summarizeTemaDetails,
  summarizeDicfContext,
  buildExecutiveSummary,
  collectResponsableUsuarioIds,
  loadUsuarioRolesByIds,
} = require("./director-ia-action-register");

/** Fuentes previstas; módulos no conectados permanecen en false. */
const EMPTY_SOURCES = Object.freeze({
  igf: false,
  arr: false,
  dicf: false,
  action_register: false,
  bitacora_ia: false,
});

/** @type {{ pool?: import("pg").Pool, assertPlantaAccess?: (req: object, plantaId: number) => boolean, ensureActionRegisterTables?: (client: import("pg").PoolClient) => Promise<void> }} */
let deps = {};

function configureDirectorIaContext(injected) {
  deps = { ...deps, ...injected };
}

/**
 * Últimas bitácoras de la planta para chat (resumen_ia, máx. 10).
 * @param {import("pg").PoolClient} client
 * @param {number} planta_id
 */
async function loadBitacoraContextForChat(client, planta_id) {
  await ensureDirectorIaBitacoraTable(client);
  return loadBitacoraForChat(client, planta_id);
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
    await dicfAccionesLib.ensureDicfAccionesTables(client);
    const bitacora = await loadBitacoraContextForChat(client, planta_id);
    const board = await buildActionRegisterBoardPayload(client, planta_id, {
      ensureActionRegisterTables: deps.ensureActionRegisterTables,
      includeDicf: true,
      includeNotes: false,
    });
    const summary = summarizeActionRegisterBoard(board);
    const roleMap = await loadUsuarioRolesByIds(client, collectResponsableUsuarioIds(board));
    const responsables = summarizeActionRegisterResponsables(board, { roleMap });
    const temas = summarizeActionRegisterTemas(board);
    const top_overdue = summarizeTopOverdueActions(board, { roleMap });
    const invalid_overdue = summarizeInvalidOverdue(board);
    const tema_details = summarizeTemaDetails(board, { roleMap });
    const executive_summary = buildExecutiveSummary(summary, responsables, temas);
    const dicf_details = await summarizeDicfContext(client, planta_id);
    sources.action_register = true;
    if (dicf_details.length > 0) sources.dicf = true;
    if (bitacora.length > 0) sources.bitacora_ia = true;
    return {
      ...base,
      sources,
      bitacora,
      action_register: {
        ok: true,
        summary,
        responsables,
        temas,
        top_overdue,
        invalid_overdue,
        tema_details,
        executive_summary,
        dicf_details,
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
  loadBitacoraContextForChat,
  handleGetContext,
  EMPTY_SOURCES,
};
