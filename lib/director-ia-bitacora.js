"use strict";

const { isDirectorIaEnabled } = require("./director-ia");

const BITACORA_TIPOS = Object.freeze([
  "junta_consejo",
  "seguimiento_gerente",
  "visita_planta",
  "comercial",
  "operaciones",
  "cliente",
  "otro",
]);

const BITACORA_FUENTES = Object.freeze(["plaud", "texto_pegado", "pdf", "word", "otro"]);

const RESUMEN_IA_TRIGGER_CHARS = 1000;
const RESUMEN_IA_MAX_CHARS = 1200;
const DEFAULT_LIST_LIMIT = 30;
const CHAT_CONTEXT_LIMIT = 30;
const CHAT_CONTEXT_MONTH_WINDOW = 3;

/** @type {{ pool?: import("pg").Pool, assertPlantaAccess?: (req: object, plantaId: number) => boolean }} */
let deps = {};

function configureDirectorIaBitacora(injected) {
  deps = { ...deps, ...injected };
}

async function ensureDirectorIaBitacoraTable(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS arr;`).catch(() => {});
  await client.query(`
    CREATE TABLE IF NOT EXISTS arr.director_ia_bitacora (
      id SERIAL PRIMARY KEY,
      planta_id INT NOT NULL REFERENCES public.plantas(id),
      empresa VARCHAR(120) NULL,
      fecha DATE NOT NULL,
      tipo VARCHAR(32) NOT NULL,
      titulo VARCHAR(255) NULL,
      fuente VARCHAR(32) NOT NULL DEFAULT 'texto_pegado',
      contenido TEXT NOT NULL,
      resumen_ia TEXT NULL,
      metadata JSONB NULL,
      created_by_usuario_id INT NULL REFERENCES public.usuarios(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      is_active BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT director_ia_bitacora_tipo_chk CHECK (tipo IN (
        'junta_consejo', 'seguimiento_gerente', 'visita_planta', 'comercial',
        'operaciones', 'cliente', 'otro'
      )),
      CONSTRAINT director_ia_bitacora_fuente_chk CHECK (fuente IN (
        'plaud', 'texto_pegado', 'pdf', 'word', 'otro'
      ))
    );
  `).catch(() => {});
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_director_ia_bitacora_planta_fecha
      ON arr.director_ia_bitacora (planta_id, fecha DESC)
      WHERE is_active = true;
  `).catch(() => {});
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_director_ia_bitacora_planta_tipo
      ON arr.director_ia_bitacora (planta_id, tipo)
      WHERE is_active = true;
  `).catch(() => {});
}

/**
 * Resumen extractivo simple (sin OpenAI). Sprint 2A.
 * @param {string} contenido
 */
function buildExtractiveResumen(contenido) {
  const text = String(contenido || "").trim();
  if (!text) return "";
  if (text.length <= RESUMEN_IA_TRIGGER_CHARS) return text;

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  let out = "";
  for (const p of paragraphs) {
    const next = out ? `${out}\n\n${p}` : p;
    if (next.length > RESUMEN_IA_MAX_CHARS) {
      if (!out) return `${p.slice(0, RESUMEN_IA_MAX_CHARS).trim()}…`;
      break;
    }
    out = next;
  }
  if (!out) return `${text.slice(0, RESUMEN_IA_MAX_CHARS).trim()}…`;
  if (out.length < text.length) return `${out}…`;
  return out;
}

function normalizeTipo(raw) {
  const v = String(raw || "").trim().toLowerCase();
  return BITACORA_TIPOS.includes(v) ? v : null;
}

function normalizeFuente(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (BITACORA_FUENTES.includes(v)) return v;
  return "texto_pegado";
}

function parseFecha(raw) {
  const s = String(raw || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const y = parseInt(s.slice(0, 4), 10);
  const m = parseInt(s.slice(5, 7), 10);
  const d = parseInt(s.slice(8, 10), 10);
  const fd = new Date(Date.UTC(y, m - 1, d));
  if (fd.getUTCFullYear() !== y || fd.getUTCMonth() !== m - 1 || fd.getUTCDate() !== d) return null;
  return s;
}

function mapRowToEntry(row, { includeContenido = false } = {}) {
  const resumen = row.resumen_ia != null ? String(row.resumen_ia) : "";
  const plantaNombre =
    row.planta_nombre != null
      ? String(row.planta_nombre)
      : row.empresa != null
        ? String(row.empresa)
        : null;
  const entry = {
    id: Number(row.id),
    planta_id: Number(row.planta_id),
    planta_nombre: plantaNombre,
    empresa: row.empresa != null ? String(row.empresa) : null,
    fecha: row.fecha instanceof Date ? row.fecha.toISOString().slice(0, 10) : String(row.fecha || "").slice(0, 10),
    tipo: String(row.tipo || ""),
    titulo: row.titulo != null ? String(row.titulo) : null,
    fuente: String(row.fuente || ""),
    resumen_ia: resumen,
    preview: resumen.slice(0, 160),
    metadata: row.metadata != null ? row.metadata : null,
    created_by_usuario_id:
      row.created_by_usuario_id != null && Number.isFinite(Number(row.created_by_usuario_id))
        ? Number(row.created_by_usuario_id)
        : null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ""),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ""),
  };
  if (includeContenido) {
    entry.contenido = String(row.contenido || "");
  }
  return entry;
}

/**
 * @param {import("pg").PoolClient} client
 * @param {import("express").Request} req
 * @param {object} body
 */
async function createBitacoraEntry(client, req, body) {
  const planta_id = body.planta_id != null ? parseInt(String(body.planta_id), 10) : null;
  const fecha = parseFecha(body.fecha);
  const tipo = normalizeTipo(body.tipo);
  const fuente = normalizeFuente(body.fuente);
  const contenido = String(body.contenido || "").trim();
  const titulo = body.titulo != null ? String(body.titulo).trim().slice(0, 255) : null;
  const metadata = body.metadata != null && typeof body.metadata === "object" ? body.metadata : null;

  if (!planta_id || !Number.isFinite(planta_id)) {
    return { ok: false, error: "planta_id requerido", status: 400 };
  }
  if (!fecha) return { ok: false, error: "fecha inválida (YYYY-MM-DD)", status: 400 };
  if (!tipo) return { ok: false, error: "tipo inválido", status: 400 };
  if (!contenido) return { ok: false, error: "contenido requerido", status: 400 };

  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return { ok: false, error: "Sin acceso a esta planta", status: 403 };
  }

  const plantaRow = await client.query(
    `SELECT id, nombre FROM public.plantas WHERE id = $1`,
    [planta_id]
  );
  if (!plantaRow.rows[0]) {
    return { ok: false, error: "planta_id no encontrado", status: 400 };
  }
  const empresa = String(plantaRow.rows[0].nombre || "").trim().slice(0, 120) || null;

  const resumen_ia = buildExtractiveResumen(contenido);
  const actorId =
    req.dashboardAuth && req.dashboardAuth.actor_id != null
      ? Number(req.dashboardAuth.actor_id)
      : null;

  const ins = await client.query(
    `INSERT INTO arr.director_ia_bitacora (
       planta_id, empresa, fecha, tipo, titulo, fuente, contenido, resumen_ia, metadata, created_by_usuario_id
     ) VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *,
       (SELECT nombre FROM public.plantas WHERE id = $1) AS planta_nombre`,
    [
      planta_id,
      empresa || null,
      fecha,
      tipo,
      titulo || null,
      fuente,
      contenido,
      resumen_ia,
      metadata ? JSON.stringify(metadata) : null,
      Number.isFinite(actorId) ? actorId : null,
    ]
  );

  return { ok: true, entry: mapRowToEntry(ins.rows[0], { includeContenido: true }) };
}

/**
 * @param {import("pg").PoolClient} client
 * @param {import("express").Request} req
 * @param {{ planta_id?: string | number, limit?: string | number, tipo?: string }} query
 */
async function listBitacoraEntries(client, req, query) {
  const planta_id = query.planta_id != null ? parseInt(String(query.planta_id), 10) : null;
  const limitRaw = query.limit != null ? parseInt(String(query.limit), 10) : DEFAULT_LIST_LIMIT;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : DEFAULT_LIST_LIMIT;
  const tipo = query.tipo != null ? normalizeTipo(query.tipo) : null;

  if (!planta_id || !Number.isFinite(planta_id)) {
    return { ok: false, error: "planta_id requerido", status: 400 };
  }
  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return { ok: false, error: "Sin acceso a esta planta", status: 403 };
  }

  const params = [planta_id];
  let sql = `
    SELECT b.*, p.nombre AS planta_nombre
    FROM arr.director_ia_bitacora b
    JOIN public.plantas p ON p.id = b.planta_id
    WHERE b.planta_id = $1 AND b.is_active = true`;
  if (tipo) {
    params.push(tipo);
    sql += ` AND b.tipo = $${params.length}`;
  }
  params.push(limit);
  sql += ` ORDER BY b.fecha DESC, b.created_at DESC LIMIT $${params.length}`;

  const r = await client.query(sql, params);
  return {
    ok: true,
    sessions: (r.rows || []).map((row) => mapRowToEntry(row)),
  };
}

/**
 * @param {import("pg").PoolClient} client
 * @param {import("express").Request} req
 * @param {number} id
 */
async function getBitacoraEntry(client, req, id) {
  const entryId = Number(id);
  if (!Number.isFinite(entryId) || entryId <= 0) {
    return { ok: false, error: "id inválido", status: 400 };
  }

  const r = await client.query(
    `SELECT b.*, p.nombre AS planta_nombre
     FROM arr.director_ia_bitacora b
     JOIN public.plantas p ON p.id = b.planta_id
     WHERE b.id = $1 AND b.is_active = true`,
    [entryId]
  );
  if (!r.rows[0]) return { ok: false, error: "Bitácora no encontrada", status: 404 };

  const planta_id = Number(r.rows[0].planta_id);
  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return { ok: false, error: "Sin acceso a esta planta", status: 403 };
  }

  return { ok: true, entry: mapRowToEntry(r.rows[0], { includeContenido: true }) };
}

/**
 * @param {import("pg").PoolClient} client
 * @param {import("express").Request} req
 * @param {number} id
 */
/**
 * Carga sesiones de Bitácora IA para chat (Sprint 2B): solo resumen_ia, ventana 3 meses, máx. 30.
 * @param {import("pg").PoolClient} client
 * @param {number} planta_id
 * @param {number} [limit]
 */
async function loadBitacoraForChat(client, planta_id, limit = CHAT_CONTEXT_LIMIT) {
  const pid = Number(planta_id);
  if (!Number.isFinite(pid) || pid <= 0) return [];

  await ensureDirectorIaBitacoraTable(client);

  const lim = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), CHAT_CONTEXT_LIMIT) : CHAT_CONTEXT_LIMIT;

  const r = await client.query(
    `WITH latest AS (
       SELECT MAX(COALESCE(b.fecha, b.created_at::date)) AS max_fecha
       FROM arr.director_ia_bitacora b
       WHERE b.planta_id = $1 AND b.is_active = true
     )
     SELECT b.fecha, b.tipo, b.titulo, b.resumen_ia, b.created_at, p.nombre AS planta_nombre
     FROM arr.director_ia_bitacora b
     JOIN public.plantas p ON p.id = b.planta_id
     CROSS JOIN latest l
     WHERE b.planta_id = $1 AND b.is_active = true
       AND (
         l.max_fecha IS NULL
         OR b.fecha >= (date_trunc('month', l.max_fecha::timestamp) - (($2::int - 1) || ' months')::interval)::date
       )
     ORDER BY b.fecha DESC, b.created_at DESC
     LIMIT $3`,
    [pid, CHAT_CONTEXT_MONTH_WINDOW, lim]
  );

  return (r.rows || []).map((row) => ({
    fecha: row.fecha instanceof Date ? row.fecha.toISOString().slice(0, 10) : String(row.fecha || "").slice(0, 10),
    tipo: String(row.tipo || ""),
    titulo: row.titulo != null ? String(row.titulo) : null,
    resumen_ia: row.resumen_ia != null ? String(row.resumen_ia) : "",
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ""),
    planta_nombre: row.planta_nombre != null ? String(row.planta_nombre) : null,
  }));
}

async function softDeleteBitacoraEntry(client, req, id) {
  const entryId = Number(id);
  if (!Number.isFinite(entryId) || entryId <= 0) {
    return { ok: false, error: "id inválido", status: 400 };
  }

  const existing = await client.query(
    `SELECT id, planta_id FROM arr.director_ia_bitacora WHERE id = $1 AND is_active = true`,
    [entryId]
  );
  if (!existing.rows[0]) return { ok: false, error: "Bitácora no encontrada", status: 404 };

  const planta_id = Number(existing.rows[0].planta_id);
  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return { ok: false, error: "Sin acceso a esta planta", status: 403 };
  }

  await client.query(
    `UPDATE arr.director_ia_bitacora SET is_active = false, updated_at = now() WHERE id = $1`,
    [entryId]
  );
  return { ok: true, id: entryId };
}

async function handleListBitacora(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Bitácora IA no configurada" });

  const client = await deps.pool.connect();
  try {
    await ensureDirectorIaBitacoraTable(client);
    const result = await listBitacoraEntries(client, req, req.query || {});
    return res.status(result.status || (result.ok ? 200 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA bitacora list]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al listar bitácoras" });
  } finally {
    client.release();
  }
}

async function handleCreateBitacora(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Bitácora IA no configurada" });

  const client = await deps.pool.connect();
  try {
    await ensureDirectorIaBitacoraTable(client);
    const result = await createBitacoraEntry(client, req, req.body || {});
    return res.status(result.status || (result.ok ? 201 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA bitacora create]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al crear bitácora" });
  } finally {
    client.release();
  }
}

async function handleGetBitacora(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Bitácora IA no configurada" });

  const id = parseInt(String(req.params.id || ""), 10);
  const client = await deps.pool.connect();
  try {
    await ensureDirectorIaBitacoraTable(client);
    const result = await getBitacoraEntry(client, req, id);
    return res.status(result.status || (result.ok ? 200 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA bitacora get]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al obtener bitácora" });
  } finally {
    client.release();
  }
}

async function handleDeleteBitacora(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Bitácora IA no configurada" });

  const id = parseInt(String(req.params.id || ""), 10);
  const client = await deps.pool.connect();
  try {
    await ensureDirectorIaBitacoraTable(client);
    const result = await softDeleteBitacoraEntry(client, req, id);
    return res.status(result.status || (result.ok ? 200 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA bitacora delete]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al eliminar bitácora" });
  } finally {
    client.release();
  }
}

module.exports = {
  BITACORA_TIPOS,
  BITACORA_FUENTES,
  configureDirectorIaBitacora,
  ensureDirectorIaBitacoraTable,
  buildExtractiveResumen,
  createBitacoraEntry,
  listBitacoraEntries,
  getBitacoraEntry,
  loadBitacoraForChat,
  softDeleteBitacoraEntry,
  CHAT_CONTEXT_LIMIT,
  CHAT_CONTEXT_MONTH_WINDOW,
  handleListBitacora,
  handleCreateBitacora,
  handleGetBitacora,
  handleDeleteBitacora,
  RESUMEN_IA_TRIGGER_CHARS,
  RESUMEN_IA_MAX_CHARS,
};
