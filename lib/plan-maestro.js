"use strict";

const axios = require("axios");

const DOCUMENTS = Object.freeze([
  {
    slug: "corporativo_2026",
    title: "PLAN MAESTRO CORPORATIVO 2026 TOMZA",
    expected_size_label: "29.2 MB",
  },
  {
    slug: "tomza_en_accion",
    title: "TOMZA EN ACCION LIBRO COMPLETO",
    expected_size_label: "63.9 MB",
  },
  {
    slug: "eslabones_venta",
    title: "LOS 14 ESLABONES DE LA VENTA EFECTIVA TOMZA",
    expected_size_label: "80 KB",
  },
]);

const MAX_UPLOAD_BYTES = 80 * 1024 * 1024;
const NOTE_MAX = 4000;
const CHAT_MAX = 4000;
const PAGE_TEXT_MAX = 12000;
const UPLOAD_ROLES = Object.freeze(["ZP", "AD", "GG"]);

function documentBySlug(slug) {
  const s = String(slug || "").trim();
  return DOCUMENTS.find((d) => d.slug === s) || null;
}

function canUpload(auth) {
  const role = String((auth && auth.role) || "").trim().toUpperCase();
  return UPLOAD_ROLES.includes(role);
}

function actorLabel(auth) {
  const a = auth || {};
  const nombre = String(a.actor_nombre || "").trim();
  const tel = String(a.actor_telefono || "").trim();
  if (nombre && tel) return `${nombre} (${tel})`;
  if (nombre) return nombre;
  if (tel) return tel;
  if (a.actor_id != null) return `Usuario #${a.actor_id}`;
  return String(a.role || "Dashboard");
}

function actorId(auth) {
  const n = Number(auth && auth.actor_id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sanitizeComment(raw, max) {
  const s = String(raw || "").trim().replace(/\0/g, "");
  if (!s) return null;
  return s.slice(0, max);
}

function buildS3Key(slug, fileName) {
  const safe = String(fileName || "documento.pdf")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 120);
  return `plan-maestro/${slug}/${Date.now()}-${safe}`;
}

async function ensurePlanMaestroTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.plan_maestro_documentos (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      file_name TEXT,
      content_type TEXT,
      file_size_bytes BIGINT,
      s3_key TEXT,
      s3_url TEXT,
      data BYTEA,
      uploaded_by TEXT,
      uploaded_at TIMESTAMPTZ
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.plan_maestro_notas (
      id SERIAL PRIMARY KEY,
      usuario_nombre TEXT NOT NULL,
      usuario_id INT,
      comentario TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_plan_maestro_notas_created
    ON public.plan_maestro_notas (created_at DESC);
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.plan_maestro_chat (
      id SERIAL PRIMARY KEY,
      usuario_nombre TEXT NOT NULL,
      usuario_id INT,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_plan_maestro_chat_created
    ON public.plan_maestro_chat (created_at ASC);
  `);
}

function mapDocRow(def, row) {
  return {
    slug: def.slug,
    title: def.title,
    expected_size_label: def.expected_size_label,
    uploaded: Boolean(row && (row.s3_key || row.file_name)),
    file_name: row && row.file_name ? String(row.file_name) : null,
    content_type: row && row.content_type ? String(row.content_type) : null,
    file_size_bytes: row && row.file_size_bytes != null ? Number(row.file_size_bytes) : null,
    uploaded_by: row && row.uploaded_by ? String(row.uploaded_by) : null,
    uploaded_at: row && row.uploaded_at ? row.uploaded_at : null,
  };
}

async function listDocuments(client) {
  const r = await client.query(
    `SELECT slug, title, file_name, content_type, file_size_bytes, s3_key, uploaded_by, uploaded_at
     FROM public.plan_maestro_documentos`
  );
  const bySlug = new Map((r.rows || []).map((row) => [row.slug, row]));
  return DOCUMENTS.map((def) => mapDocRow(def, bySlug.get(def.slug)));
}

async function saveDocument(client, opts) {
  const def = documentBySlug(opts.slug);
  if (!def) {
    const err = new Error("Documento no reconocido");
    err.status = 400;
    throw err;
  }
  await client.query(
    `INSERT INTO public.plan_maestro_documentos
      (slug, title, file_name, content_type, file_size_bytes, s3_key, s3_url, data, uploaded_by, uploaded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW())
     ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      file_name = EXCLUDED.file_name,
      content_type = EXCLUDED.content_type,
      file_size_bytes = EXCLUDED.file_size_bytes,
      s3_key = EXCLUDED.s3_key,
      s3_url = EXCLUDED.s3_url,
      data = EXCLUDED.data,
      uploaded_by = EXCLUDED.uploaded_by,
      uploaded_at = NOW()`,
    [
      def.slug,
      def.title,
      opts.fileName,
      opts.contentType || "application/pdf",
      opts.fileSizeBytes,
      opts.s3Key || null,
      opts.s3Url || null,
      opts.data || null,
      opts.uploadedBy,
    ]
  );
  return mapDocRow(def, {
    file_name: opts.fileName,
    content_type: opts.contentType,
    file_size_bytes: opts.fileSizeBytes,
    s3_key: opts.s3Key,
    uploaded_by: opts.uploadedBy,
    uploaded_at: new Date().toISOString(),
  });
}

async function getDocumentRow(client, slug) {
  const def = documentBySlug(slug);
  if (!def) return null;
  const r = await client.query(
    `SELECT slug, title, file_name, content_type, file_size_bytes, s3_key, s3_url, data, uploaded_by, uploaded_at
     FROM public.plan_maestro_documentos WHERE slug = $1`,
    [def.slug]
  );
  return r.rows[0] || null;
}

function mapNote(row) {
  return {
    id: Number(row.id),
    usuario_nombre: String(row.usuario_nombre || ""),
    comentario: String(row.comentario || ""),
    created_at: row.created_at,
  };
}

async function listNotes(client, limit) {
  const cap = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const r = await client.query(
    `SELECT id, usuario_nombre, comentario, created_at
     FROM public.plan_maestro_notas
     ORDER BY created_at DESC
     LIMIT $1`,
    [cap]
  );
  return (r.rows || []).map(mapNote);
}

async function addNote(client, opts) {
  const comentario = sanitizeComment(opts.comentario, NOTE_MAX);
  if (!comentario) {
    const err = new Error("Escribe un comentario");
    err.status = 400;
    throw err;
  }
  const r = await client.query(
    `INSERT INTO public.plan_maestro_notas (usuario_nombre, usuario_id, comentario)
     VALUES ($1, $2, $3)
     RETURNING id, usuario_nombre, comentario, created_at`,
    [opts.usuarioNombre, opts.usuarioId, comentario]
  );
  return mapNote(r.rows[0]);
}

function mapChat(row) {
  return {
    id: Number(row.id),
    usuario_nombre: String(row.usuario_nombre || ""),
    role: String(row.role || ""),
    message: String(row.message || ""),
    created_at: row.created_at,
  };
}

async function listChat(client, limit) {
  const cap = Math.min(Math.max(Number(limit) || 80, 1), 200);
  const r = await client.query(
    `SELECT id, usuario_nombre, role, message, created_at
     FROM public.plan_maestro_chat
     ORDER BY created_at ASC
     LIMIT $1`,
    [cap]
  );
  return (r.rows || []).map(mapChat);
}

async function addChatMessage(client, opts) {
  const message = sanitizeComment(opts.message, CHAT_MAX * 4);
  if (!message) {
    const err = new Error("Mensaje vacío");
    err.status = 400;
    throw err;
  }
  const role = opts.role === "assistant" ? "assistant" : "user";
  const r = await client.query(
    `INSERT INTO public.plan_maestro_chat (usuario_nombre, usuario_id, role, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id, usuario_nombre, role, message, created_at`,
    [opts.usuarioNombre, opts.usuarioId, role, message]
  );
  return mapChat(r.rows[0]);
}

async function askAboutDocuments(opts) {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) {
    return {
      ok: false,
      status: 503,
      error: "El chat de Plan Maestro no está disponible: falta OPENAI_API_KEY.",
    };
  }
  const question = sanitizeComment(opts.question, CHAT_MAX);
  if (!question) {
    return { ok: false, status: 400, error: "Escribe una pregunta" };
  }
  const docTitle = opts.docTitle ? String(opts.docTitle) : "ambos documentos";
  const page = opts.page != null ? Number(opts.page) : null;
  const pageText = sanitizeComment(opts.pageText, PAGE_TEXT_MAX) || "";
  const notes = Array.isArray(opts.notes)
    ? opts.notes
        .slice(0, 8)
        .map((n) => `- ${n.usuario_nombre}: ${String(n.comentario || "").slice(0, 240)}`)
        .join("\n")
    : "";
  const system = [
    "Eres un asistente de consulta del PLAN MAESTRO de TOMZA.",
    "Documentos: PLAN MAESTRO CORPORATIVO 2026 TOMZA, TOMZA EN ACCION LIBRO COMPLETO y LOS 14 ESLABONES DE LA VENTA EFECTIVA TOMZA.",
    "Responde en español, breve y factual.",
    "Usa solo el extracto de página y las notas que te pasen. Si no alcanza para responder, dilo y no inventes cifras ni políticas.",
  ].join(" ");
  const user = [
    `Documento en pantalla: ${docTitle}`,
    page ? `Hoja: ${page}` : "",
    pageText ? `Extracto de la hoja:\n${pageText}` : "No hay extracto de hoja en este turno.",
    notes ? `Notas recientes de usuarios:\n${notes}` : "",
    `Pregunta: ${question}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const resp = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: process.env.PLAN_MAESTRO_CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    {
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      timeout: 45000,
    }
  );
  const answer =
    resp.data &&
    resp.data.choices &&
    resp.data.choices[0] &&
    resp.data.choices[0].message &&
    resp.data.choices[0].message.content
      ? String(resp.data.choices[0].message.content).trim()
      : "";
  if (!answer) {
    return { ok: false, status: 502, error: "No recibí respuesta del modelo. Intenta de nuevo." };
  }
  return { ok: true, answer };
}

module.exports = {
  DOCUMENTS,
  MAX_UPLOAD_BYTES,
  NOTE_MAX,
  documentBySlug,
  canUpload,
  actorLabel,
  actorId,
  sanitizeComment,
  buildS3Key,
  ensurePlanMaestroTables,
  listDocuments,
  saveDocument,
  getDocumentRow,
  listNotes,
  addNote,
  listChat,
  addChatMessage,
  askAboutDocuments,
};
