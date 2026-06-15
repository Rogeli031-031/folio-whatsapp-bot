"use strict";

const { isDirectorIaEnabled } = require("./director-ia");

const ALIAS_TIPOS = Object.freeze(["operativo", "contacto", "razon_social", "apodo"]);
const ALIAS_FUENTES = Object.freeze(["manual", "bitacora", "dicf", "arr", "ia_sugerido"]);
const DEFAULT_LIST_LIMIT = 100;

/** @type {{ pool?: import("pg").Pool, assertPlantaAccess?: (req: object, plantaId: number) => boolean }} */
let deps = {};

function configureComercialEntidad(injected) {
  deps = { ...deps, ...injected };
}

/**
 * Normaliza nombres comerciales para búsqueda (sin acentos, minúsculas).
 * @param {string} raw
 */
function normalizeCommercialName(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeAliasTipo(raw) {
  const v = String(raw || "").trim().toLowerCase();
  return ALIAS_TIPOS.includes(v) ? v : null;
}

function normalizeAliasFuente(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (ALIAS_FUENTES.includes(v)) return v;
  return "manual";
}

async function ensureComercialEntidadTables(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS arr;`).catch(() => {});
  await client.query(`
    CREATE TABLE IF NOT EXISTS arr.comercial_entidad (
      id SERIAL PRIMARY KEY,
      planta_id INT NOT NULL REFERENCES public.plantas(id),
      nombre_canonico VARCHAR(200) NOT NULL,
      notas TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      is_active BOOLEAN NOT NULL DEFAULT true
    );
  `).catch(() => {});
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_comercial_entidad_planta_active
      ON arr.comercial_entidad (planta_id, nombre_canonico)
      WHERE is_active = true;
  `).catch(() => {});
  await client.query(`
    CREATE TABLE IF NOT EXISTS arr.comercial_entidad_alias (
      id SERIAL PRIMARY KEY,
      entidad_id INT NOT NULL REFERENCES arr.comercial_entidad(id) ON DELETE CASCADE,
      alias_nombre VARCHAR(200) NOT NULL,
      alias_tipo VARCHAR(32) NOT NULL,
      fuente VARCHAR(32) NOT NULL DEFAULT 'manual',
      verificado BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT comercial_entidad_alias_tipo_chk CHECK (alias_tipo IN (
        'operativo', 'contacto', 'razon_social', 'apodo'
      )),
      CONSTRAINT comercial_entidad_alias_fuente_chk CHECK (fuente IN (
        'manual', 'bitacora', 'dicf', 'arr', 'ia_sugerido'
      ))
    );
  `).catch(() => {});
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_comercial_entidad_alias_entidad
      ON arr.comercial_entidad_alias (entidad_id);
  `).catch(() => {});
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_comercial_entidad_alias_nombre
      ON arr.comercial_entidad_alias (alias_nombre);
  `).catch(() => {});
}

function mapAliasRow(row) {
  return {
    id: Number(row.id),
    entidad_id: Number(row.entidad_id),
    alias_nombre: String(row.alias_nombre || "").trim(),
    alias_tipo: String(row.alias_tipo || ""),
    fuente: String(row.fuente || "manual"),
    verificado: Boolean(row.verificado),
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ""),
  };
}

function mapEntidadRow(row, aliases = []) {
  return {
    id: Number(row.id),
    planta_id: Number(row.planta_id),
    planta_nombre: row.planta_nombre != null ? String(row.planta_nombre) : null,
    nombre_canonico: String(row.nombre_canonico || "").trim(),
    notas: row.notas != null ? String(row.notas) : null,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ""),
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ""),
    aliases: aliases.map(mapAliasRow),
  };
}

/**
 * Busca alias y entidades por texto (integración futura chat).
 * @param {import("pg").PoolClient} client
 * @param {number} planta_id
 * @param {string} [query]
 * @param {{ verificadoOnly?: boolean, limit?: number }} [opts]
 */
async function findCommercialAliases(client, planta_id, query, opts = {}) {
  const pid = Number(planta_id);
  if (!Number.isFinite(pid) || pid <= 0) return [];

  await ensureComercialEntidadTables(client);

  const limit =
    opts.limit != null && Number.isFinite(Number(opts.limit))
      ? Math.min(Math.max(Number(opts.limit), 1), 200)
      : 50;
  const qNorm = normalizeCommercialName(query);
  const params = [pid];
  let sql = `
    SELECT a.id, a.entidad_id, a.alias_nombre, a.alias_tipo, a.fuente, a.verificado, a.created_at,
           e.nombre_canonico, e.planta_id, p.nombre AS planta_nombre
    FROM arr.comercial_entidad_alias a
    JOIN arr.comercial_entidad e ON e.id = a.entidad_id AND e.is_active = true
    JOIN public.plantas p ON p.id = e.planta_id
    WHERE e.planta_id = $1`;

  if (opts.verificadoOnly) {
    sql += ` AND a.verificado = true`;
  }

  if (qNorm) {
    params.push(limit * 5);
    sql += ` ORDER BY a.verificado DESC, a.created_at DESC LIMIT $${params.length}`;
    const r = await client.query(sql, params);
    const needle = qNorm;
    return (r.rows || [])
      .filter((row) => {
        const aliasNorm = normalizeCommercialName(row.alias_nombre);
        const canonNorm = normalizeCommercialName(row.nombre_canonico);
        return aliasNorm.includes(needle) || canonNorm.includes(needle) || needle.includes(aliasNorm);
      })
      .slice(0, limit)
      .map((row) => ({
        ...mapAliasRow(row),
        nombre_canonico: String(row.nombre_canonico || "").trim(),
        planta_id: Number(row.planta_id),
        planta_nombre: row.planta_nombre != null ? String(row.planta_nombre) : null,
      }));
  }

  params.push(limit);
  sql += ` ORDER BY a.verificado DESC, a.created_at DESC LIMIT $${params.length}`;

  const r = await client.query(sql, params);
  return (r.rows || []).map((row) => ({
    ...mapAliasRow(row),
    nombre_canonico: String(row.nombre_canonico || "").trim(),
    planta_id: Number(row.planta_id),
    planta_nombre: row.planta_nombre != null ? String(row.planta_nombre) : null,
  }));
}

/**
 * Resuelve un nombre o alias a la entidad canónica (integración futura chat).
 * @param {import("pg").PoolClient} client
 * @param {number} planta_id
 * @param {string} nameOrAlias
 * @param {{ verificadoOnly?: boolean }} [opts]
 */
async function resolveCommercialEntity(client, planta_id, nameOrAlias, opts = {}) {
  const pid = Number(planta_id);
  const needle = normalizeCommercialName(nameOrAlias);
  if (!Number.isFinite(pid) || pid <= 0 || !needle) return null;

  await ensureComercialEntidadTables(client);

  const verificadoClause = opts.verificadoOnly ? ` AND a.verificado = true` : "";

  const canonicalRows = await client.query(
    `SELECT e.*, p.nombre AS planta_nombre
     FROM arr.comercial_entidad e
     JOIN public.plantas p ON p.id = e.planta_id
     WHERE e.planta_id = $1 AND e.is_active = true`,
    [pid]
  );
  const canonicalHit = (canonicalRows.rows || []).find(
    (row) => normalizeCommercialName(row.nombre_canonico) === needle
  );
  if (canonicalHit) {
    const aliases = await client.query(
      `SELECT * FROM arr.comercial_entidad_alias a
       WHERE a.entidad_id = $1${verificadoClause}
       ORDER BY a.verificado DESC, a.created_at DESC`,
      [canonicalHit.id]
    );
    return mapEntidadRow(canonicalHit, aliases.rows || []);
  }

  const aliasRows = await client.query(
    `SELECT e.*, p.nombre AS planta_nombre, a.id AS matched_alias_id, a.alias_nombre AS matched_alias
     FROM arr.comercial_entidad_alias a
     JOIN arr.comercial_entidad e ON e.id = a.entidad_id AND e.is_active = true
     JOIN public.plantas p ON p.id = e.planta_id
     WHERE e.planta_id = $1${verificadoClause}
     ORDER BY a.verificado DESC, a.created_at DESC`,
    [pid]
  );
  const aliasHit = (aliasRows.rows || []).find(
    (row) => normalizeCommercialName(row.matched_alias) === needle
  );
  if (!aliasHit) return null;

  const aliases = await client.query(
    `SELECT * FROM arr.comercial_entidad_alias a
     WHERE a.entidad_id = $1${verificadoClause}
     ORDER BY a.verificado DESC, a.created_at DESC`,
    [aliasHit.id]
  );
  const mapped = mapEntidadRow(aliasHit, aliases.rows || []);
  mapped.matched_alias_id = Number(aliasHit.matched_alias_id);
  mapped.matched_alias = String(aliasHit.matched_alias || "").trim();
  return mapped;
}

async function listEntidades(client, req, query) {
  const planta_id = query.planta_id != null ? parseInt(String(query.planta_id), 10) : null;
  const q = query.q != null ? String(query.q).trim() : "";
  const limitRaw = query.limit != null ? parseInt(String(query.limit), 10) : DEFAULT_LIST_LIMIT;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : DEFAULT_LIST_LIMIT;

  if (!planta_id || !Number.isFinite(planta_id)) {
    return { ok: false, error: "planta_id requerido", status: 400 };
  }
  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return { ok: false, error: "Sin acceso a esta planta", status: 403 };
  }

  await ensureComercialEntidadTables(client);

  if (q) {
    const matches = await findCommercialAliases(client, planta_id, q, { limit });
    const entidadIds = [...new Set(matches.map((m) => m.entidad_id))];
    if (entidadIds.length === 0) {
      return { ok: true, entidades: [], search_matches: matches };
    }
    const r = await client.query(
      `SELECT e.*, p.nombre AS planta_nombre
       FROM arr.comercial_entidad e
       JOIN public.plantas p ON p.id = e.planta_id
       WHERE e.id = ANY($1::int[]) AND e.is_active = true
       ORDER BY e.nombre_canonico ASC`,
      [entidadIds]
    );
    const aliasRows = await client.query(
      `SELECT * FROM arr.comercial_entidad_alias WHERE entidad_id = ANY($1::int[]) ORDER BY verificado DESC, created_at DESC`,
      [entidadIds]
    );
    const aliasByEntidad = new Map();
    for (const row of aliasRows.rows || []) {
      const eid = Number(row.entidad_id);
      if (!aliasByEntidad.has(eid)) aliasByEntidad.set(eid, []);
      aliasByEntidad.get(eid).push(row);
    }
    return {
      ok: true,
      entidades: (r.rows || []).map((row) => mapEntidadRow(row, aliasByEntidad.get(Number(row.id)) || [])),
      search_matches: matches,
    };
  }

  const r = await client.query(
    `SELECT e.*, p.nombre AS planta_nombre
     FROM arr.comercial_entidad e
     JOIN public.plantas p ON p.id = e.planta_id
     WHERE e.planta_id = $1 AND e.is_active = true
     ORDER BY e.nombre_canonico ASC
     LIMIT $2`,
    [planta_id, limit]
  );
  const ids = (r.rows || []).map((row) => Number(row.id));
  let aliasByEntidad = new Map();
  if (ids.length > 0) {
    const aliasRows = await client.query(
      `SELECT * FROM arr.comercial_entidad_alias WHERE entidad_id = ANY($1::int[]) ORDER BY verificado DESC, created_at DESC`,
      [ids]
    );
    for (const row of aliasRows.rows || []) {
      const eid = Number(row.entidad_id);
      if (!aliasByEntidad.has(eid)) aliasByEntidad.set(eid, []);
      aliasByEntidad.get(eid).push(row);
    }
  }

  return {
    ok: true,
    entidades: (r.rows || []).map((row) => mapEntidadRow(row, aliasByEntidad.get(Number(row.id)) || [])),
  };
}

async function createEntidad(client, req, body) {
  const planta_id = body.planta_id != null ? parseInt(String(body.planta_id), 10) : null;
  const nombre_canonico = String(body.nombre_canonico || "").trim().slice(0, 200);
  const notas = body.notas != null ? String(body.notas).trim() : null;

  if (!planta_id || !Number.isFinite(planta_id)) {
    return { ok: false, error: "planta_id requerido", status: 400 };
  }
  if (!nombre_canonico) {
    return { ok: false, error: "nombre_canonico requerido", status: 400 };
  }
  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return { ok: false, error: "Sin acceso a esta planta", status: 403 };
  }

  await ensureComercialEntidadTables(client);

  const plantaRow = await client.query(`SELECT id FROM public.plantas WHERE id = $1`, [planta_id]);
  if (!plantaRow.rows[0]) {
    return { ok: false, error: "planta_id no encontrado", status: 400 };
  }

  const ins = await client.query(
    `INSERT INTO arr.comercial_entidad (planta_id, nombre_canonico, notas)
     VALUES ($1, $2, $3)
     RETURNING *,
       (SELECT nombre FROM public.plantas WHERE id = $1) AS planta_nombre`,
    [planta_id, nombre_canonico, notas || null]
  );

  return { ok: true, entidad: mapEntidadRow(ins.rows[0], []) };
}

async function getEntidad(client, req, id) {
  const entidadId = Number(id);
  if (!Number.isFinite(entidadId) || entidadId <= 0) {
    return { ok: false, error: "id inválido", status: 400 };
  }

  await ensureComercialEntidadTables(client);

  const r = await client.query(
    `SELECT e.*, p.nombre AS planta_nombre
     FROM arr.comercial_entidad e
     JOIN public.plantas p ON p.id = e.planta_id
     WHERE e.id = $1 AND e.is_active = true`,
    [entidadId]
  );
  if (!r.rows[0]) return { ok: false, error: "Entidad no encontrada", status: 404 };

  const planta_id = Number(r.rows[0].planta_id);
  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return { ok: false, error: "Sin acceso a esta planta", status: 403 };
  }

  const aliases = await client.query(
    `SELECT * FROM arr.comercial_entidad_alias WHERE entidad_id = $1 ORDER BY verificado DESC, created_at DESC`,
    [entidadId]
  );

  return { ok: true, entidad: mapEntidadRow(r.rows[0], aliases.rows || []) };
}

async function updateEntidad(client, req, id, body) {
  const entidadId = Number(id);
  if (!Number.isFinite(entidadId) || entidadId <= 0) {
    return { ok: false, error: "id inválido", status: 400 };
  }

  const existing = await getEntidad(client, req, entidadId);
  if (!existing.ok) return existing;

  const fields = [];
  const params = [];
  if (body.nombre_canonico != null) {
    const v = String(body.nombre_canonico).trim().slice(0, 200);
    if (!v) return { ok: false, error: "nombre_canonico no puede estar vacío", status: 400 };
    params.push(v);
    fields.push(`nombre_canonico = $${params.length}`);
  }
  if (body.notas !== undefined) {
    params.push(body.notas != null ? String(body.notas).trim() : null);
    fields.push(`notas = $${params.length}`);
  }
  if (fields.length === 0) {
    return { ok: false, error: "Sin campos para actualizar", status: 400 };
  }

  params.push(entidadId);
  await client.query(
    `UPDATE arr.comercial_entidad SET ${fields.join(", ")}, updated_at = now() WHERE id = $${params.length}`,
    params
  );

  return getEntidad(client, req, entidadId);
}

async function softDeleteEntidad(client, req, id) {
  const entidadId = Number(id);
  if (!Number.isFinite(entidadId) || entidadId <= 0) {
    return { ok: false, error: "id inválido", status: 400 };
  }

  const existing = await getEntidad(client, req, entidadId);
  if (!existing.ok) return existing;

  await client.query(
    `UPDATE arr.comercial_entidad SET is_active = false, updated_at = now() WHERE id = $1`,
    [entidadId]
  );
  return { ok: true, id: entidadId };
}

async function createAlias(client, req, entidadId, body) {
  const eid = Number(entidadId);
  if (!Number.isFinite(eid) || eid <= 0) {
    return { ok: false, error: "entidad_id inválido", status: 400 };
  }

  const existing = await getEntidad(client, req, eid);
  if (!existing.ok) return existing;

  const alias_nombre = String(body.alias_nombre || "").trim().slice(0, 200);
  const alias_tipo = normalizeAliasTipo(body.alias_tipo);
  const fuente = normalizeAliasFuente(body.fuente);
  const verificado = body.verificado === true || body.verificado === "true" || body.verificado === 1;

  if (!alias_nombre) return { ok: false, error: "alias_nombre requerido", status: 400 };
  if (!alias_tipo) return { ok: false, error: "alias_tipo inválido", status: 400 };

  const ins = await client.query(
    `INSERT INTO arr.comercial_entidad_alias (entidad_id, alias_nombre, alias_tipo, fuente, verificado)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [eid, alias_nombre, alias_tipo, fuente, verificado]
  );

  return { ok: true, alias: mapAliasRow(ins.rows[0]) };
}

async function updateAlias(client, req, aliasId, body) {
  const aid = Number(aliasId);
  if (!Number.isFinite(aid) || aid <= 0) {
    return { ok: false, error: "id inválido", status: 400 };
  }

  const r = await client.query(
    `SELECT a.*, e.planta_id
     FROM arr.comercial_entidad_alias a
     JOIN arr.comercial_entidad e ON e.id = a.entidad_id AND e.is_active = true
     WHERE a.id = $1`,
    [aid]
  );
  if (!r.rows[0]) return { ok: false, error: "Alias no encontrado", status: 404 };

  const planta_id = Number(r.rows[0].planta_id);
  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return { ok: false, error: "Sin acceso a esta planta", status: 403 };
  }

  const fields = [];
  const params = [];
  if (body.alias_nombre != null) {
    const v = String(body.alias_nombre).trim().slice(0, 200);
    if (!v) return { ok: false, error: "alias_nombre no puede estar vacío", status: 400 };
    params.push(v);
    fields.push(`alias_nombre = $${params.length}`);
  }
  if (body.alias_tipo != null) {
    const t = normalizeAliasTipo(body.alias_tipo);
    if (!t) return { ok: false, error: "alias_tipo inválido", status: 400 };
    params.push(t);
    fields.push(`alias_tipo = $${params.length}`);
  }
  if (body.fuente != null) {
    params.push(normalizeAliasFuente(body.fuente));
    fields.push(`fuente = $${params.length}`);
  }
  if (body.verificado !== undefined) {
    params.push(body.verificado === true || body.verificado === "true" || body.verificado === 1);
    fields.push(`verificado = $${params.length}`);
  }
  if (fields.length === 0) {
    return { ok: false, error: "Sin campos para actualizar", status: 400 };
  }

  params.push(aid);
  const upd = await client.query(
    `UPDATE arr.comercial_entidad_alias SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params
  );

  return { ok: true, alias: mapAliasRow(upd.rows[0]) };
}

async function deleteAlias(client, req, aliasId) {
  const aid = Number(aliasId);
  if (!Number.isFinite(aid) || aid <= 0) {
    return { ok: false, error: "id inválido", status: 400 };
  }

  const r = await client.query(
    `SELECT a.id, e.planta_id
     FROM arr.comercial_entidad_alias a
     JOIN arr.comercial_entidad e ON e.id = a.entidad_id AND e.is_active = true
     WHERE a.id = $1`,
    [aid]
  );
  if (!r.rows[0]) return { ok: false, error: "Alias no encontrado", status: 404 };

  const planta_id = Number(r.rows[0].planta_id);
  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return { ok: false, error: "Sin acceso a esta planta", status: 403 };
  }

  await client.query(`DELETE FROM arr.comercial_entidad_alias WHERE id = $1`, [aid]);
  return { ok: true, id: aid };
}

async function handleListEntidades(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Entidades comerciales no configuradas" });

  const client = await deps.pool.connect();
  try {
    const result = await listEntidades(client, req, req.query || {});
    return res.status(result.status || (result.ok ? 200 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA comercial entidades list]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al listar entidades" });
  } finally {
    client.release();
  }
}

async function handleCreateEntidad(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Entidades comerciales no configuradas" });

  const client = await deps.pool.connect();
  try {
    const result = await createEntidad(client, req, req.body || {});
    return res.status(result.status || (result.ok ? 201 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA comercial entidad create]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al crear entidad" });
  } finally {
    client.release();
  }
}

async function handleGetEntidad(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Entidades comerciales no configuradas" });

  const id = parseInt(String(req.params.id || ""), 10);
  const client = await deps.pool.connect();
  try {
    const result = await getEntidad(client, req, id);
    return res.status(result.status || (result.ok ? 200 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA comercial entidad get]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al obtener entidad" });
  } finally {
    client.release();
  }
}

async function handleUpdateEntidad(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Entidades comerciales no configuradas" });

  const id = parseInt(String(req.params.id || ""), 10);
  const client = await deps.pool.connect();
  try {
    const result = await updateEntidad(client, req, id, req.body || {});
    return res.status(result.status || (result.ok ? 200 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA comercial entidad update]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al actualizar entidad" });
  } finally {
    client.release();
  }
}

async function handleDeleteEntidad(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Entidades comerciales no configuradas" });

  const id = parseInt(String(req.params.id || ""), 10);
  const client = await deps.pool.connect();
  try {
    const result = await softDeleteEntidad(client, req, id);
    return res.status(result.status || (result.ok ? 200 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA comercial entidad delete]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al eliminar entidad" });
  } finally {
    client.release();
  }
}

async function handleCreateAlias(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Entidades comerciales no configuradas" });

  const entidadId = parseInt(String(req.params.id || ""), 10);
  const client = await deps.pool.connect();
  try {
    const result = await createAlias(client, req, entidadId, req.body || {});
    return res.status(result.status || (result.ok ? 201 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA comercial alias create]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al crear alias" });
  } finally {
    client.release();
  }
}

async function handleUpdateAlias(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Entidades comerciales no configuradas" });

  const aliasId = parseInt(String(req.params.aliasId || ""), 10);
  const client = await deps.pool.connect();
  try {
    const result = await updateAlias(client, req, aliasId, req.body || {});
    return res.status(result.status || (result.ok ? 200 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA comercial alias update]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al actualizar alias" });
  } finally {
    client.release();
  }
}

async function handleDeleteAlias(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Entidades comerciales no configuradas" });

  const aliasId = parseInt(String(req.params.aliasId || ""), 10);
  const client = await deps.pool.connect();
  try {
    const result = await deleteAlias(client, req, aliasId);
    return res.status(result.status || (result.ok ? 200 : 500)).json(result);
  } catch (e) {
    console.error("[Director IA comercial alias delete]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al eliminar alias" });
  } finally {
    client.release();
  }
}

async function handleSearchAliases(req, res) {
  if (!isDirectorIaEnabled()) return res.status(200).json({ enabled: false });
  if (!deps.pool) return res.status(500).json({ ok: false, error: "Entidades comerciales no configuradas" });

  const planta_id = req.query.planta_id != null ? parseInt(String(req.query.planta_id), 10) : null;
  const q = req.query.q != null ? String(req.query.q) : "";
  if (!planta_id || !Number.isFinite(planta_id)) {
    return res.status(400).json({ ok: false, error: "planta_id requerido" });
  }
  if (!deps.assertPlantaAccess || !deps.assertPlantaAccess(req, planta_id)) {
    return res.status(403).json({ ok: false, error: "Sin acceso a esta planta" });
  }

  const client = await deps.pool.connect();
  try {
    const matches = await findCommercialAliases(client, planta_id, q);
    return res.json({ ok: true, matches });
  } catch (e) {
    console.error("[Director IA comercial alias search]", e);
    return res.status(500).json({ ok: false, error: e.message || "Error al buscar alias" });
  } finally {
    client.release();
  }
}

const EMPTY_COMMERCIAL_RESOLUTION = Object.freeze({
  entidades: [],
  search_tokens: [],
  block: "",
});

/**
 * ¿El nombre (canónico o alias) aparece en la pregunta normalizada?
 * @param {string} questionNorm
 * @param {string} name
 */
function nameMentionedInQuestion(questionNorm, name) {
  const nameNorm = normalizeCommercialName(name);
  if (!nameNorm || nameNorm.length < 3) return false;
  if (questionNorm.includes(nameNorm)) return true;
  const parts = nameNorm.split(" ").filter((p) => p.length > 2);
  if (parts.length >= 2) {
    const hits = parts.filter((p) => questionNorm.includes(p)).length;
    return hits >= Math.min(2, parts.length);
  }
  return parts.some((p) => questionNorm.includes(p));
}

/**
 * @param {import("pg").PoolClient} client
 * @param {number} planta_id
 */
async function loadEntidadesCatalog(client, planta_id) {
  await ensureComercialEntidadTables(client);
  const pid = Number(planta_id);
  const r = await client.query(
    `SELECT id, planta_id, nombre_canonico, notas
     FROM arr.comercial_entidad
     WHERE planta_id = $1 AND is_active = true
     ORDER BY nombre_canonico ASC`,
    [pid]
  );
  const entities = r.rows || [];
  if (!entities.length) return [];

  const ids = entities.map((e) => Number(e.id));
  const ar = await client.query(
    `SELECT * FROM arr.comercial_entidad_alias
     WHERE entidad_id = ANY($1::int[])
     ORDER BY verificado DESC, created_at DESC`,
    [ids]
  );
  const aliasByEntidad = new Map();
  for (const row of ar.rows || []) {
    const eid = Number(row.entidad_id);
    if (!aliasByEntidad.has(eid)) aliasByEntidad.set(eid, []);
    aliasByEntidad.get(eid).push(mapAliasRow(row));
  }

  return entities.map((e) => ({
    id: Number(e.id),
    planta_id: Number(e.planta_id),
    nombre_canonico: String(e.nombre_canonico || "").trim(),
    notas: e.notas != null ? String(e.notas) : null,
    aliases: aliasByEntidad.get(Number(e.id)) || [],
  }));
}

/**
 * Tokens de búsqueda expandidos (canónico + alias verificados).
 * @param {{ nombre_canonico: string, aliases?: Array<{ alias_nombre: string, verificado: boolean }> }} entidad
 */
function buildCommercialSearchTokens(entidad) {
  const tokens = new Set();
  if (entidad.nombre_canonico) tokens.add(String(entidad.nombre_canonico).trim());
  for (const a of entidad.aliases || []) {
    if (a.verificado && a.alias_nombre) tokens.add(String(a.alias_nombre).trim());
  }
  return [...tokens];
}

/**
 * Extrae menciones de catálogo presentes en la pregunta (sin OpenAI).
 * @param {Awaited<ReturnType<typeof loadEntidadesCatalog>>} catalog
 * @param {string} question
 */
function extractCommercialMentionsFromQuestion(catalog, question) {
  const qNorm = normalizeCommercialName(question);
  if (!qNorm) return [];

  const mentions = [];
  for (const ent of catalog) {
    const verified = (ent.aliases || []).filter((a) => a.verificado);
    let match_type = null;
    let matched_mention = null;

    if (nameMentionedInQuestion(qNorm, ent.nombre_canonico)) {
      match_type = "canonico";
      matched_mention = ent.nombre_canonico;
    }
    for (const a of verified) {
      if (nameMentionedInQuestion(qNorm, a.alias_nombre)) {
        match_type = "alias";
        matched_mention = a.alias_nombre;
        break;
      }
    }
    if (!match_type) continue;

    mentions.push({
      entidad_id: ent.id,
      nombre_canonico: ent.nombre_canonico,
      matched_mention,
      match_type,
      aliases_verificados: verified,
      search_tokens: buildCommercialSearchTokens({ ...ent, aliases: verified }),
    });
  }
  return mentions;
}

/**
 * Bloque de contexto para Director IA Chat (Sprint 2D).
 * @param {Array<{ nombre_canonico: string, matched_mention?: string, match_type?: string, aliases_verificados: Array<{ alias_nombre: string, alias_tipo: string }> }>} entidades
 */
function buildCommercialEntitiesContextBlock(entidades) {
  if (!entidades || entidades.length === 0) return "";

  const lines = ["ENTIDADES COMERCIALES RELACIONADAS", ""];

  for (const e of entidades) {
    lines.push("Entidad:");
    lines.push(e.nombre_canonico);
    lines.push("");
    lines.push("Alias verificados:");
    const verified = e.aliases_verificados || [];
    if (verified.length === 0) {
      lines.push("- (ninguno)");
    } else {
      for (const a of verified) {
        lines.push(`- ${a.alias_nombre} (${a.alias_tipo})`);
      }
    }
    lines.push("");
    if (
      e.match_type === "alias" &&
      e.matched_mention &&
      normalizeCommercialName(e.matched_mention) !== normalizeCommercialName(e.nombre_canonico)
    ) {
      lines.push(
        `Equivalencia verificada: "${e.matched_mention}" corresponde a la entidad comercial "${e.nombre_canonico}".`
      );
      lines.push("");
    }
    lines.push("Fuente:");
    lines.push("arr.comercial_entidad_alias");
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Resuelve entidades comerciales mencionadas en la pregunta (solo tablas arr.*).
 * @param {import("pg").PoolClient} client
 * @param {number} planta_id
 * @param {string} question
 */
async function resolveCommercialEntitiesForQuestion(client, planta_id, question) {
  const pid = Number(planta_id);
  if (!Number.isFinite(pid) || pid <= 0) return { ...EMPTY_COMMERCIAL_RESOLUTION };

  const catalog = await loadEntidadesCatalog(client, pid);
  const entidades = extractCommercialMentionsFromQuestion(catalog, question);
  const search_tokens = [...new Set(entidades.flatMap((e) => e.search_tokens))];
  const block = buildCommercialEntitiesContextBlock(entidades);

  return { entidades, search_tokens, block };
}

/**
 * @param {import("pg").Pool} pool
 * @param {number} planta_id
 * @param {string} question
 */
async function resolveCommercialEntitiesForQuestionFromPool(pool, planta_id, question) {
  if (!pool) return { ...EMPTY_COMMERCIAL_RESOLUTION };
  const client = await pool.connect();
  try {
    return await resolveCommercialEntitiesForQuestion(client, planta_id, question);
  } finally {
    client.release();
  }
}

module.exports = {
  ALIAS_TIPOS,
  ALIAS_FUENTES,
  configureComercialEntidad,
  ensureComercialEntidadTables,
  normalizeCommercialName,
  resolveCommercialEntity,
  findCommercialAliases,
  loadEntidadesCatalog,
  extractCommercialMentionsFromQuestion,
  buildCommercialSearchTokens,
  buildCommercialEntitiesContextBlock,
  resolveCommercialEntitiesForQuestion,
  resolveCommercialEntitiesForQuestionFromPool,
  EMPTY_COMMERCIAL_RESOLUTION,
  listEntidades,
  createEntidad,
  getEntidad,
  updateEntidad,
  softDeleteEntidad,
  createAlias,
  updateAlias,
  deleteAlias,
  handleListEntidades,
  handleCreateEntidad,
  handleGetEntidad,
  handleUpdateEntidad,
  handleDeleteEntidad,
  handleCreateAlias,
  handleUpdateAlias,
  handleDeleteAlias,
  handleSearchAliases,
};
