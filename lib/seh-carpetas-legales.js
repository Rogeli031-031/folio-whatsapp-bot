/**
 * SEH · Carpetas legales por planta: estatus, comentarios, archivo y vencimiento.
 */

const crypto = require("crypto");

const ESTATUS_VALUES = new Set(["vigente", "en_tramite", "na"]);

async function ensureSehCarpetasLegalesTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.seh_carpetas_legales (
      id SERIAL PRIMARY KEY,
      planta_id INT NOT NULL REFERENCES public.plantas(id) ON DELETE CASCADE,
      doc_no VARCHAR(20) NOT NULL,
      estatus VARCHAR(20),
      comentario TEXT NOT NULL DEFAULT '',
      vencimiento DATE,
      vencimiento_na BOOLEAN NOT NULL DEFAULT false,
      file_name VARCHAR(255),
      content_type VARCHAR(120),
      file_size_bytes INT,
      s3_key TEXT,
      s3_url TEXT,
      data BYTEA,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by TEXT,
      UNIQUE (planta_id, doc_no)
    );
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_seh_carpetas_legales_planta
    ON public.seh_carpetas_legales(planta_id, doc_no);
  `).catch(() => {});
}

function normalizeDocNo(raw) {
  const s = String(raw || "").trim();
  if (!/^\d{1,2}\.\d{1,2}$/.test(s)) return null;
  return s;
}

function normalizeEstatus(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, "_");
  const mapped =
    s === "en tramite" || s === "en_trámite" || s === "en-tramite"
      ? "en_tramite"
      : s === "n/a" || s === "n_a" || s === "na"
        ? "na"
        : s;
  if (!ESTATUS_VALUES.has(mapped)) return undefined;
  return mapped;
}

function parseVencimientoDate(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Alineado con SEH equipos: formato con / se interpreta como MM/DD/YYYY.
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const mm = String(parseInt(mdy[1], 10)).padStart(2, "0");
    const dd = String(parseInt(mdy[2], 10)).padStart(2, "0");
    return `${mdy[3]}-${mm}-${dd}`;
  }
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const dd = String(parseInt(dmy[1], 10)).padStart(2, "0");
    const mm = String(parseInt(dmy[2], 10)).padStart(2, "0");
    return `${dmy[3]}-${mm}-${dd}`;
  }
  return null;
}

function mapRow(row) {
  if (!row) return null;
  return {
    planta_id: row.planta_id,
    doc_no: row.doc_no,
    estatus: row.estatus || null,
    comentario: row.comentario || "",
    vencimiento: row.vencimiento || null,
    vencimiento_na: Boolean(row.vencimiento_na),
    has_archivo: Boolean(row.file_name),
    file_name: row.file_name || null,
    content_type: row.content_type || null,
    file_size_bytes: row.file_size_bytes != null ? Number(row.file_size_bytes) : null,
    updated_at: row.updated_at || null,
    updated_by: row.updated_by || null,
  };
}

const SELECT_META_SQL = `
  SELECT planta_id, doc_no, estatus, comentario,
         to_char(vencimiento, 'YYYY-MM-DD') AS vencimiento,
         vencimiento_na, file_name, content_type, file_size_bytes,
         updated_at, updated_by
  FROM public.seh_carpetas_legales
  WHERE planta_id = $1
  ORDER BY doc_no
`;

async function listByPlanta(client, plantaId) {
  const r = await client.query(SELECT_META_SQL, [plantaId]);
  return (r.rows || []).map(mapRow);
}

/**
 * Actualiza estatus y/o comentario (no toca vencimiento ni archivo).
 * estatus puede ser null explícito para limpiar cuando touchEstatus=true.
 */
async function upsertEstatusComentario(client, { plantaId, docNo, estatus, comentario, actorLabel, touchEstatus, touchComentario }) {
  const r = await client.query(
    `INSERT INTO public.seh_carpetas_legales
       (planta_id, doc_no, estatus, comentario, updated_at, updated_by)
     VALUES ($1, $2, $3, COALESCE($4, ''), NOW(), $5)
     ON CONFLICT (planta_id, doc_no) DO UPDATE SET
       estatus = CASE WHEN $6::boolean THEN EXCLUDED.estatus ELSE public.seh_carpetas_legales.estatus END,
       comentario = CASE WHEN $7::boolean THEN EXCLUDED.comentario ELSE public.seh_carpetas_legales.comentario END,
       updated_at = NOW(),
       updated_by = EXCLUDED.updated_by
     RETURNING planta_id, doc_no, estatus, comentario,
               to_char(vencimiento, 'YYYY-MM-DD') AS vencimiento,
               vencimiento_na, file_name, content_type, file_size_bytes,
               updated_at, updated_by`,
    [
      plantaId,
      docNo,
      estatus,
      comentario != null ? String(comentario) : "",
      actorLabel || null,
      Boolean(touchEstatus),
      Boolean(touchComentario),
    ]
  );
  return mapRow(r.rows[0]);
}

async function upsertVencimiento(client, { plantaId, docNo, vencimiento, vencimientoNa, actorLabel }) {
  const r = await client.query(
    `INSERT INTO public.seh_carpetas_legales
       (planta_id, doc_no, vencimiento, vencimiento_na, updated_at, updated_by)
     VALUES ($1, $2, $3::date, $4, NOW(), $5)
     ON CONFLICT (planta_id, doc_no) DO UPDATE SET
       vencimiento = EXCLUDED.vencimiento,
       vencimiento_na = EXCLUDED.vencimiento_na,
       updated_at = NOW(),
       updated_by = EXCLUDED.updated_by
     RETURNING planta_id, doc_no, estatus, comentario,
               to_char(vencimiento, 'YYYY-MM-DD') AS vencimiento,
               vencimiento_na, file_name, content_type, file_size_bytes,
               updated_at, updated_by`,
    [plantaId, docNo, vencimiento, Boolean(vencimientoNa), actorLabel || null]
  );
  return mapRow(r.rows[0]);
}

async function saveArchivo(client, {
  plantaId,
  docNo,
  fileName,
  contentType,
  buffer,
  s3Key,
  s3Url,
  actorLabel,
}) {
  const r = await client.query(
    `INSERT INTO public.seh_carpetas_legales
       (planta_id, doc_no, file_name, content_type, file_size_bytes, s3_key, s3_url, data, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
     ON CONFLICT (planta_id, doc_no) DO UPDATE SET
       file_name = EXCLUDED.file_name,
       content_type = EXCLUDED.content_type,
       file_size_bytes = EXCLUDED.file_size_bytes,
       s3_key = EXCLUDED.s3_key,
       s3_url = EXCLUDED.s3_url,
       data = EXCLUDED.data,
       updated_at = NOW(),
       updated_by = EXCLUDED.updated_by
     RETURNING planta_id, doc_no, estatus, comentario,
               to_char(vencimiento, 'YYYY-MM-DD') AS vencimiento,
               vencimiento_na, file_name, content_type, file_size_bytes,
               updated_at, updated_by`,
    [
      plantaId,
      docNo,
      fileName,
      contentType,
      buffer.length,
      s3Key || null,
      s3Url || null,
      s3Key ? null : buffer,
      actorLabel || null,
    ]
  );
  return mapRow(r.rows[0]);
}

async function getArchivoRow(client, plantaId, docNo) {
  const r = await client.query(
    `SELECT id, planta_id, doc_no, file_name, content_type, file_size_bytes, s3_key, s3_url, data
     FROM public.seh_carpetas_legales
     WHERE planta_id = $1 AND doc_no = $2`,
    [plantaId, docNo]
  );
  return r.rows[0] || null;
}

function buildArchivoS3Key(plantaId, docNo, fileName) {
  const safe = String(fileName || "archivo")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 80);
  const ext = safe.includes(".") ? safe.split(".").pop() : "bin";
  return `seh-carpetas-legales/${plantaId}/${docNo}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
}

module.exports = {
  ESTATUS_VALUES,
  ensureSehCarpetasLegalesTables,
  normalizeDocNo,
  normalizeEstatus,
  parseVencimientoDate,
  mapRow,
  listByPlanta,
  upsertEstatusComentario,
  upsertVencimiento,
  saveArchivo,
  getArchivoRow,
  buildArchivoS3Key,
};
