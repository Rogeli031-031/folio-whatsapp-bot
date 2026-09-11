"use strict";

/**
 * Contacto comercial por cliente (DICF / Delta Ingreso Cliente Forecast).
 * Una fila por planta + nombre de cliente (canal/subcanal solo metadata).
 */

function normNombre(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function trimMax(s, max) {
  const t = s != null ? String(s).trim() : "";
  return t.length > max ? t.slice(0, max) : t;
}

function mapRow(row) {
  if (!row) {
    return {
      id: null,
      planta_id: null,
      cliente_nombre: "",
      canal: "",
      subcanal: "",
      nombre_contacto: "",
      telefono: "",
      correo: "",
      updated_by_usuario_id: null,
      updated_at: null,
    };
  }
  return {
    id: row.id != null ? Number(row.id) : null,
    planta_id: row.planta_id != null ? Number(row.planta_id) : null,
    cliente_nombre: row.cliente_nombre || "",
    canal: row.canal || "",
    subcanal: row.subcanal || "",
    nombre_contacto: row.nombre_contacto || "",
    telefono: row.telefono || "",
    correo: row.correo || "",
    updated_by_usuario_id: row.updated_by_usuario_id != null ? Number(row.updated_by_usuario_id) : null,
    updated_at: row.updated_at || null,
  };
}

async function ensureClienteContactosTable(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS arr;`).catch(() => {});
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS arr.cliente_contactos (
        id SERIAL PRIMARY KEY,
        planta_id INT NOT NULL REFERENCES public.plantas(id),
        cliente_nombre TEXT NOT NULL,
        cliente_nombre_norm TEXT NOT NULL,
        canal TEXT NOT NULL DEFAULT '',
        subcanal TEXT NOT NULL DEFAULT '',
        nombre_contacto TEXT NOT NULL DEFAULT '',
        telefono TEXT NOT NULL DEFAULT '',
        correo TEXT NOT NULL DEFAULT '',
        updated_by_usuario_id INT NULL REFERENCES public.usuarios(id),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (planta_id, cliente_nombre_norm)
      );
    `);
  } catch (e) {
    const code = e && e.code ? String(e.code) : "";
    const msg = e && e.message ? String(e.message) : "";
    const benign = code === "42P07" || code === "42710" || /already exists/i.test(msg);
    if (!benign) throw e;
  }
  await client
    .query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_contactos_planta_nombre
         ON arr.cliente_contactos (planta_id, cliente_nombre_norm)`
    )
    .catch(() => {});
}

/**
 * Lee el contacto de un cliente. Si no hay fila, devuelve campos vacíos (no error).
 */
async function getClienteContacto(client, opts = {}) {
  await ensureClienteContactosTable(client);
  const plantaId = opts.planta_id != null ? Number(opts.planta_id) : null;
  if (!plantaId || !Number.isFinite(plantaId)) return { error: "planta_id requerido" };
  const clienteNombre = opts.cliente_nombre != null ? String(opts.cliente_nombre).trim() : "";
  if (!clienteNombre) return { error: "cliente_nombre requerido" };
  const nombreNorm = normNombre(clienteNombre);
  const r = await client.query(
    `SELECT id, planta_id, cliente_nombre, canal, subcanal,
            nombre_contacto, telefono, correo, updated_by_usuario_id, updated_at
       FROM arr.cliente_contactos
      WHERE planta_id = $1 AND cliente_nombre_norm = $2
      LIMIT 1`,
    [plantaId, nombreNorm]
  );
  return { contacto: mapRow(r.rows && r.rows[0]) };
}

function validateContactoFields(opts) {
  const nombreContacto = trimMax(opts.nombre_contacto, 200);
  const telefono = trimMax(opts.telefono, 50);
  const correo = trimMax(opts.correo, 200);
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { error: "Correo inválido" };
  }
  return { nombreContacto, telefono, correo };
}

/**
 * Crea o actualiza el contacto del cliente (upsert por planta + nombre).
 */
async function upsertClienteContacto(client, opts = {}) {
  await ensureClienteContactosTable(client);
  const plantaId = opts.planta_id != null ? Number(opts.planta_id) : null;
  if (!plantaId || !Number.isFinite(plantaId)) return { error: "planta_id requerido" };
  const clienteNombre = opts.cliente_nombre != null ? String(opts.cliente_nombre).trim() : "";
  if (!clienteNombre) return { error: "cliente_nombre requerido" };
  const fields = validateContactoFields(opts);
  if (fields.error) return { error: fields.error };
  const canal = opts.canal != null ? String(opts.canal).trim() : "";
  const subcanal = opts.subcanal != null ? String(opts.subcanal).trim() : "";
  const actorId =
    opts.updated_by_usuario_id != null && Number.isFinite(Number(opts.updated_by_usuario_id))
      ? Number(opts.updated_by_usuario_id)
      : null;
  const nombreNorm = normNombre(clienteNombre);
  const r = await client.query(
    `INSERT INTO arr.cliente_contactos (
        planta_id, cliente_nombre, cliente_nombre_norm, canal, subcanal,
        nombre_contacto, telefono, correo, updated_by_usuario_id, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
      ON CONFLICT (planta_id, cliente_nombre_norm)
      DO UPDATE SET
        cliente_nombre = EXCLUDED.cliente_nombre,
        canal = EXCLUDED.canal,
        subcanal = EXCLUDED.subcanal,
        nombre_contacto = EXCLUDED.nombre_contacto,
        telefono = EXCLUDED.telefono,
        correo = EXCLUDED.correo,
        updated_by_usuario_id = EXCLUDED.updated_by_usuario_id,
        updated_at = now()
      RETURNING id, planta_id, cliente_nombre, canal, subcanal,
                nombre_contacto, telefono, correo, updated_by_usuario_id, updated_at`,
    [
      plantaId,
      clienteNombre,
      nombreNorm,
      canal,
      subcanal,
      fields.nombreContacto,
      fields.telefono,
      fields.correo,
      actorId,
    ]
  );
  return { contacto: mapRow(r.rows[0]) };
}

module.exports = {
  ensureClienteContactosTable,
  getClienteContacto,
  upsertClienteContacto,
  normNombre,
  validateContactoFields,
};
