/**
 * SEH · Carpetas legales por planta: estatus, comentarios, archivo y vencimiento.
 */

const crypto = require("crypto");

const ESTATUS_VALUES = new Set(["vigente", "en_tramite", "na"]);

/** 69 puntos del índice (alineado con frontend catalog). */
const CATALOG_DOC_NOS = [
  "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7",
  "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9",
  "2.1", "2.2", "2.3", "2.4",
  "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10",
  "3.11", "3.12", "3.13", "3.14", "3.15", "3.16", "3.17", "3.18", "3.19", "3.20",
  "3.21", "3.22", "3.23", "3.24", "3.25", "3.26", "3.27", "3.28", "3.29",
  "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7",
  "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7",
  "6.1", "6.2", "6.3", "6.4", "6.5", "6.6",
];

function todayYmdMexico() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Cumplimiento REGULACIÓN: Vigente (y no vencido) cuenta; N/A se excluye; resto no cumple.
 */
function scoreRegulacion(rows, todayYmd) {
  const today = todayYmd || todayYmdMexico();
  const byNo = {};
  for (const row of rows || []) {
    if (row && row.doc_no) byNo[String(row.doc_no)] = row;
  }
  let total = 0;
  let complying = 0;
  let na = 0;
  for (const no of CATALOG_DOC_NOS) {
    const row = byNo[no];
    const est = row && row.estatus ? String(row.estatus).toLowerCase() : "";
    if (est === "na") {
      na += 1;
      continue;
    }
    total += 1;
    if (est !== "vigente") continue;
    if (row.vencimiento_na) {
      complying += 1;
      continue;
    }
    const vence = row.vencimiento ? String(row.vencimiento).slice(0, 10) : "";
    if (!vence || vence >= today) complying += 1;
  }
  return {
    catalog_total: CATALOG_DOC_NOS.length,
    total,
    complying,
    na,
    pct: total > 0 ? Math.round((100 * complying) / total) : 0,
  };
}

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
  CATALOG_DOC_NOS,
  CATALOG_TOTAL: CATALOG_DOC_NOS.length,
  todayYmdMexico,
  scoreRegulacion,
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
