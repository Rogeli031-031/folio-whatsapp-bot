"use strict";

/**
 * Comentarios libres por cliente (ARR / Delta Ingreso Forecast).
 * Independientes de las acciones DICF; se usan también en Director IA.
 */

async function ensureClienteComentariosTable(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS arr;`).catch(() => {});
  await client.query(`
    CREATE TABLE IF NOT EXISTS arr.cliente_comentarios (
      id SERIAL PRIMARY KEY,
      planta_id INT NOT NULL REFERENCES public.plantas(id),
      cliente_key TEXT NULL,
      cliente_nombre TEXT NOT NULL,
      canal TEXT NOT NULL DEFAULT '',
      subcanal TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      author_name TEXT NOT NULL DEFAULT '',
      created_by_usuario_id INT NULL REFERENCES public.usuarios(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      is_active BOOLEAN NOT NULL DEFAULT true
    );
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_cliente_comentarios_planta_key
      ON arr.cliente_comentarios (planta_id, cliente_key, created_at DESC)
      WHERE is_active = true;
  `).catch(() => {});
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_cliente_comentarios_planta_nombre
      ON arr.cliente_comentarios (planta_id, lower(cliente_nombre), created_at DESC)
      WHERE is_active = true;
  `).catch(() => {});
}

function mapRow(row) {
  return {
    id: row.id,
    planta_id: row.planta_id != null ? Number(row.planta_id) : null,
    cliente_key: row.cliente_key || null,
    cliente_nombre: row.cliente_nombre || "",
    canal: row.canal || "",
    subcanal: row.subcanal || "",
    body: row.body || "",
    author_name: row.author_name || "",
    created_by_usuario_id: row.created_by_usuario_id != null ? Number(row.created_by_usuario_id) : null,
    created_at: row.created_at,
  };
}

/**
 * Lista comentarios de un cliente. Prefiere cliente_key; si no, nombre (+ canal/subcanal opcionales).
 */
async function listClienteComentarios(client, opts = {}) {
  await ensureClienteComentariosTable(client);
  const plantaId = opts.planta_id != null ? Number(opts.planta_id) : null;
  if (!plantaId || !Number.isFinite(plantaId)) return { error: "planta_id requerido" };
  const limit = Math.min(Math.max(parseInt(String(opts.limit || 50), 10) || 50, 1), 200);
  const clienteKey = opts.cliente_key != null ? String(opts.cliente_key).trim() : "";
  const clienteNombre = opts.cliente_nombre != null ? String(opts.cliente_nombre).trim() : "";
  const canal = opts.canal != null ? String(opts.canal).trim() : "";
  const subcanal = opts.subcanal != null ? String(opts.subcanal).trim() : "";

  let r;
  if (clienteKey) {
    r = await client.query(
      `SELECT id, planta_id, cliente_key, cliente_nombre, canal, subcanal, body, author_name,
              created_by_usuario_id, created_at
       FROM arr.cliente_comentarios
       WHERE planta_id = $1 AND is_active = true AND cliente_key = $2
       ORDER BY created_at DESC, id DESC
       LIMIT $3`,
      [plantaId, clienteKey, limit]
    );
  } else if (clienteNombre) {
    r = await client.query(
      `SELECT id, planta_id, cliente_key, cliente_nombre, canal, subcanal, body, author_name,
              created_by_usuario_id, created_at
       FROM arr.cliente_comentarios
       WHERE planta_id = $1 AND is_active = true
         AND lower(trim(cliente_nombre)) = lower(trim($2::text))
         AND ($3::text = '' OR lower(trim(canal)) = lower(trim($3::text)))
         AND ($4::text = '' OR lower(trim(subcanal)) = lower(trim($4::text)))
       ORDER BY created_at DESC, id DESC
       LIMIT $5`,
      [plantaId, clienteNombre, canal, subcanal, limit]
    );
  } else {
    return { error: "cliente_key o cliente_nombre requerido" };
  }
  return { comentarios: (r.rows || []).map(mapRow) };
}

async function createClienteComentario(client, opts = {}) {
  await ensureClienteComentariosTable(client);
  const plantaId = opts.planta_id != null ? Number(opts.planta_id) : null;
  if (!plantaId || !Number.isFinite(plantaId)) return { error: "planta_id requerido" };
  const body = opts.body != null ? String(opts.body).trim() : "";
  if (!body) return { error: "El comentario no puede estar vacío" };
  if (body.length > 4000) return { error: "Comentario demasiado largo (máx 4000 caracteres)" };
  const clienteNombre = opts.cliente_nombre != null ? String(opts.cliente_nombre).trim() : "";
  if (!clienteNombre) return { error: "cliente_nombre requerido" };
  const clienteKey = opts.cliente_key != null ? String(opts.cliente_key).trim() || null : null;
  const canal = opts.canal != null ? String(opts.canal).trim() : "";
  const subcanal = opts.subcanal != null ? String(opts.subcanal).trim() : "";
  const authorName = opts.author_name != null ? String(opts.author_name).trim() : "";
  const actorId =
    opts.created_by_usuario_id != null && Number.isFinite(Number(opts.created_by_usuario_id))
      ? Number(opts.created_by_usuario_id)
      : null;

  const ins = await client.query(
    `INSERT INTO arr.cliente_comentarios
       (planta_id, cliente_key, cliente_nombre, canal, subcanal, body, author_name, created_by_usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, planta_id, cliente_key, cliente_nombre, canal, subcanal, body, author_name,
               created_by_usuario_id, created_at`,
    [plantaId, clienteKey, clienteNombre, canal, subcanal, body, authorName, actorId]
  );
  return { comentario: mapRow(ins.rows[0]) };
}

/**
 * Comentarios recientes de la planta para Director IA (anexo, no reemplaza DICF).
 * @returns {Promise<object[]>}
 */
async function loadClienteComentariosForDirectorIa(client, plantaId, limit = 80) {
  await ensureClienteComentariosTable(client);
  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 80, 1), 200);
  const r = await client.query(
    `SELECT id, planta_id, cliente_key, cliente_nombre, canal, subcanal, body, author_name,
            created_by_usuario_id, created_at
     FROM arr.cliente_comentarios
     WHERE planta_id = $1 AND is_active = true
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [plantaId, lim]
  );
  return (r.rows || []).map(mapRow);
}

/**
 * Comentarios de folios de la planta (public.comentarios) para Director IA.
 */
async function loadFolioComentariosForDirectorIa(client, plantaId, limit = 80) {
  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 80, 1), 200);
  try {
    const r = await client.query(
      `SELECT c.id, c.folio_id, c.numero_folio, c.comentario AS body, c.actor_telefono, c.actor_rol,
              c.creado_en AS created_at,
              f.planta_id, f.beneficiario, f.concepto, f.estatus, f.importe
       FROM public.comentarios c
       INNER JOIN public.folios f ON f.id = c.folio_id
       WHERE f.planta_id = $1
         AND COALESCE(c.comentario, '') <> ''
       ORDER BY c.creado_en DESC NULLS LAST, c.id DESC
       LIMIT $2`,
      [plantaId, lim]
    );
    return (r.rows || []).map((row) => ({
      id: row.id,
      folio_id: row.folio_id != null ? Number(row.folio_id) : null,
      numero_folio: row.numero_folio || "",
      body: row.body || "",
      actor_telefono: row.actor_telefono || "",
      actor_rol: row.actor_rol || "",
      created_at: row.created_at,
      planta_id: row.planta_id != null ? Number(row.planta_id) : null,
      beneficiario: row.beneficiario || "",
      concepto: row.concepto || "",
      estatus: row.estatus || "",
      importe: row.importe != null ? Number(row.importe) : null,
    }));
  } catch (e) {
    console.warn("[cliente-comentarios] loadFolioComentariosForDirectorIa:", e.message);
    return [];
  }
}

/**
 * Texto de anexo para el prompt (adicional; no sustituye DICF / AR / bitácora).
 */
function buildComentariosAnnexText(clienteComentarios, folioComentarios) {
  const lines = [];
  lines.push("---");
  lines.push("ANEXO — COMENTARIOS (clientes ARR/DICF + folios dashboard)");
  lines.push(
    "Capa adicional de contexto cualitativo. Úsala junto con DICF, Action Register, bitácora e IGF/ARR; no reemplaza esas fuentes."
  );
  lines.push("");

  const clientes = Array.isArray(clienteComentarios) ? clienteComentarios : [];
  lines.push(`Comentarios de clientes (${clientes.length}):`);
  if (!clientes.length) {
    lines.push("(sin comentarios de cliente registrados)");
  } else {
    for (const c of clientes.slice(0, 60)) {
      const when = c.created_at ? String(c.created_at).slice(0, 19).replace("T", " ") : "";
      const who = c.author_name || "—";
      const canal = [c.canal, c.subcanal].filter(Boolean).join(" / ");
      lines.push(
        `- [${when}] ${c.cliente_nombre || "Cliente"}${canal ? ` (${canal})` : ""} · ${who}: ${String(c.body || "").replace(/\s+/g, " ").trim()}`
      );
    }
  }

  lines.push("");
  const folios = Array.isArray(folioComentarios) ? folioComentarios : [];
  lines.push(`Comentarios de folios (${folios.length}):`);
  if (!folios.length) {
    lines.push("(sin comentarios de folio registrados)");
  } else {
    for (const f of folios.slice(0, 60)) {
      const when = f.created_at ? String(f.created_at).slice(0, 19).replace("T", " ") : "";
      const who = f.actor_rol || f.actor_telefono || "—";
      const concepto = String(f.concepto || "").replace(/\s+/g, " ").trim().slice(0, 80);
      lines.push(
        `- [${when}] ${f.numero_folio || `folio#${f.folio_id}`} · ${who}${concepto ? ` · ${concepto}` : ""}: ${String(f.body || "").replace(/\s+/g, " ").trim()}`
      );
    }
  }
  return lines.join("\n");
}

module.exports = {
  ensureClienteComentariosTable,
  listClienteComentarios,
  createClienteComentario,
  loadClienteComentariosForDirectorIa,
  loadFolioComentariosForDirectorIa,
  buildComentariosAnnexText,
};
