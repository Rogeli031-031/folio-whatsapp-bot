/**
 * folio-whatsapp-bot - server.js
 * Stack: Express + Twilio WhatsApp Webhook + PostgreSQL (pg) + AWS S3 (aws-sdk v3)
 *
 * Variables de entorno necesarias:
 * - DATABASE_URL (obligatorio)
 * - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (obligatorios)
 * - TWILIO_WHATSAPP_NUMBER (opcional; notificaciones salientes)
 * - S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (opcionales; PDFs en S3)
 * - OPENAI_API_KEY (opcional)
 * - DEBUG (opcional; "true" o "1" habilita GET /debug/actor y log from normalizado)
 * - DATABASE_SSL (opcional; "false" desactiva SSL para pg)
 *
 * Render: node server.js | Port: process.env.PORT
 */

"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const twilio = require("twilio");
const axios = require("axios");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/* ==================== ENV & FLAGS ==================== */

const PORT = process.env.PORT || 10000;
const DEBUG = process.env.DEBUG === "true" || process.env.DEBUG === "1";

/** Feature flags: nunca borrar comandos; si algo se apaga, sigue en ayuda como (desactivado). */
const FLAGS = {
  APPROVALS: true,
  ATTACHMENTS: true,
  OPENAI_FALLBACK: false,
  HISTORIAL: true,
  ESTATUS: true,
};
const BOT_VERSION = "3.0.0";

/** Estados de folio (tabla folios.estatus). No se brinca proceso. */
const ESTADOS = {
  GENERADO: "GENERADO",
  PENDIENTE_APROB_PLANTA: "PENDIENTE_APROB_PLANTA",
  APROB_PLANTA: "APROB_PLANTA",
  PENDIENTE_APROB_ZP: "PENDIENTE_APROB_ZP",
  APROBADO_ZP: "APROBADO_ZP",
  LISTO_PARA_PROGRAMACION: "LISTO_PARA_PROGRAMACION",
  SELECCIONADO_SEMANA: "SELECCIONADO_SEMANA",
  SOLICITANDO_PAGO: "SOLICITANDO_PAGO",
  PAGADO: "PAGADO",
  CERRADO: "CERRADO",
  CANCELACION_SOLICITADA: "CANCELACION_SOLICITADA",
  CANCELADO: "CANCELADO",
};

const REQUIRED_ENVS = ["DATABASE_URL", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"];
for (const k of REQUIRED_ENVS) {
  if (!process.env[k]) console.warn(`⚠️ Falta ENV ${k}. El bot puede fallar.`);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_NUMBER || null;

const s3Enabled =
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.AWS_REGION &&
  !!process.env.S3_BUCKET;

const s3 = s3Enabled
  ? new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

/* ==================== HELPERS ==================== */

function normalizeText(t) {
  return String(t || "").trim();
}

/** Normalización de teléfono para identificación: quitar whatsapp:, espacios; +521 -> +52. */
function normalizePhone(phone) {
  let s = String(phone || "").trim().toLowerCase().replace(/^whatsapp:/, "").replace(/\s/g, "");
  if (s.startsWith("+521") && s.length >= 13) s = "+52" + s.slice(3);
  return s;
}

/** Variante +521 para búsqueda en DB cuando está guardado con 1. */
function phoneAltForDb(normalized) {
  if (!normalized || !normalized.startsWith("+52") || normalized.length !== 12) return null;
  return "+521" + normalized.slice(3);
}

/** Últimos 10 dígitos del teléfono (México) para cruce sin depender de +52 vs +521. */
function phoneLast10(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return null;
}

/** Normaliza teléfono para envío WhatsApp outbound: +521... -> +52..., limpia espacios; devuelve "whatsapp:+52..." o null si inválido. */
function normalizePhoneForWhatsApp(phone) {
  if (!phone) return null;
  let s = String(phone).trim().replace(/\s/g, "").replace(/-/g, "");
  s = s.replace(/^whatsapp:/i, "");
  if (s.startsWith("+521") && s.length >= 13) s = "+52" + s.slice(3);
  else if (s.startsWith("521") && s.length >= 12) s = "+52" + s.slice(2);
  else if (s.startsWith("52") && !s.startsWith("521") && s.length >= 12) s = "+" + s;
  else if (/^\d{10}$/.test(s)) s = "+52" + s;
  else if (s.startsWith("+52") && s.length === 12) { /* ok */ }
  else return null;
  if (!/^\+52\d{10}$/.test(s)) return null;
  return `whatsapp:${s}`;
}

function twimlMessage(text) {
  const r = new twilio.twiml.MessagingResponse();
  r.message(text);
  return r.toString();
}

function renderMenu(titulo, opciones) {
  const lines = [titulo];
  opciones.forEach((o, i) => lines.push(`${i + 1}) ${o}`));
  lines.push("", "Responde con el número.");
  return lines.join("\n");
}

function pickByNumber(text, arr) {
  const n = parseInt(String(text).trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > arr.length) return null;
  return arr[n - 1];
}

function isMoney(text) {
  const s = String(text).trim().replace(/,/g, "");
  return /^(\d+)(\.\d{1,2})?$/.test(s);
}

function parseMoney(text) {
  const s = String(text).trim().replace(/,/g, "");
  const v = Number(s);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}

function normalizeUnidad(input) {
  const raw = String(input || "").trim().toUpperCase().replace(/\s+/g, "");
  const m = raw.match(/^(AT|C)\-?(\d{1,4})$/);
  if (!m) return null;
  const num = parseInt(m[2], 10);
  if (!Number.isFinite(num) || num < 1 || num > 1000) return null;
  return `${m[1]}-${num}`;
}

/** Parsea "crear folio <concepto> [urgente]" -> { concepto, urgente }. */
function parseCrearFolioCommand(body) {
  const lower = (body || "").toLowerCase();
  if (!lower.includes("crear folio")) return null;
  const rest = body.replace(/crear\s+folio\s+/i, "").trim();
  const urgente = /\burgente\b/i.test(rest);
  const concepto = rest.replace(/\burgente\b/gi, "").trim().replace(/\s+/g, " ") || null;
  return { concepto: concepto || null, urgente };
}

/** Formato de fecha/hora en horario México Zona Centro. */
const ZONA_MEXICO = "America/Mexico_City";
function formatMexicoCentral(dateOrString) {
  if (dateOrString == null) return "";
  const d = typeof dateOrString === "string" ? new Date(dateOrString) : dateOrString;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("es-MX", { timeZone: ZONA_MEXICO, dateStyle: "short", timeStyle: "short" });
}

/* ==================== SCHEMA (idempotente) ==================== */

async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.plantas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.roles (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE
      );
    `);
    await client.query(`ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS nivel INT DEFAULT 0;`);
    await client.query(`ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS clave VARCHAR(50);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.usuarios (
        id SERIAL PRIMARY KEY,
        telefono VARCHAR(50) NOT NULL,
        rol_id INT REFERENCES public.roles(id),
        planta_id INT REFERENCES public.plantas(id)
      );
    `).catch(() => {});
    await client.query(`ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
    await client.query(`ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS nombre VARCHAR(100);`);
    await client.query(`ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.folio_counters (
        yyyymm VARCHAR(6) PRIMARY KEY,
        last_seq INT NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.folios (
        id SERIAL PRIMARY KEY,
        folio_codigo VARCHAR(50) NOT NULL,
        numero_folio VARCHAR(50) NOT NULL,
        planta_id INT REFERENCES public.plantas(id),
        beneficiario VARCHAR(255),
        concepto TEXT,
        importe DECIMAL(18,2),
        categoria VARCHAR(255),
        subcategoria VARCHAR(255),
        unidad VARCHAR(100),
        prioridad VARCHAR(100),
        estatus VARCHAR(100) NOT NULL DEFAULT 'Generado',
        cotizacion_url TEXT,
        cotizacion_s3key VARCHAR(512),
        aprobado_por VARCHAR(255),
        aprobado_en TIMESTAMPTZ,
        creado_en TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS prioridad VARCHAR(255);`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS beneficiario VARCHAR(255);`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS categoria VARCHAR(255);`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(255);`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS unidad VARCHAR(100);`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS cotizacion_url TEXT;`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS cotizacion_s3key VARCHAR(512);`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS aprobado_por VARCHAR(255);`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS aprobado_en TIMESTAMPTZ;`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS planta_id INT;`).catch(() => {});
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS nivel_aprobado INT DEFAULT 1;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.folio_historial (
        id SERIAL PRIMARY KEY,
        folio_id INT,
        numero_folio VARCHAR(50),
        folio_codigo VARCHAR(50),
        estatus VARCHAR(100),
        comentario TEXT,
        actor_telefono VARCHAR(50),
        actor_rol VARCHAR(100),
        creado_en TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.notificaciones_log (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        folio_codigo VARCHAR(50),
        planta_id INT,
        evento VARCHAR(50),
        to_phone VARCHAR(50),
        status VARCHAR(20),
        error_message TEXT
      );
    `).catch(() => {});

    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS estatus_anterior VARCHAR(50);`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS override_planta BOOLEAN DEFAULT false;`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS override_motivo TEXT;`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS creado_por VARCHAR(255);`);
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS descripcion TEXT;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.comentarios (
        id SERIAL PRIMARY KEY,
        folio_id INT,
        numero_folio VARCHAR(50),
        comentario TEXT,
        actor_telefono VARCHAR(50),
        actor_rol VARCHAR(100),
        creado_en TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    return;
  } finally {
    client.release();
  }
}

/* ==================== REPOS / DB ==================== */

/** Devuelve actor { id, telefono, rol_nombre, rol_nivel, rol_clave, planta_id, planta_nombre } o null. */
async function getActorByPhone(client, phone) {
  const norm = normalizePhone(phone);
  const alt = phoneAltForDb(norm);
  const last10 = phoneLast10(phone) || phoneLast10(norm);

  const q = `
    SELECT u.id, u.telefono, u.planta_id, r.nombre AS rol_nombre, r.nivel AS rol_nivel, r.clave AS rol_clave, p.nombre AS planta_nombre
    FROM public.usuarios u
    LEFT JOIN public.roles r ON r.id = u.rol_id
    LEFT JOIN public.plantas p ON p.id = u.planta_id
    WHERE u.telefono = $1::TEXT OR ($2::TEXT IS NOT NULL AND u.telefono = $2::TEXT)
    LIMIT 1
  `;
  let r = await client.query(q, [norm, alt]);
  let row = r.rows[0] || null;

  if (!row && last10) {
    const qLast10 = `
      SELECT u.id, u.telefono, u.planta_id, r.nombre AS rol_nombre, r.nivel AS rol_nivel, r.clave AS rol_clave, p.nombre AS planta_nombre
      FROM public.usuarios u
      LEFT JOIN public.roles r ON r.id = u.rol_id
      LEFT JOIN public.plantas p ON p.id = u.planta_id
      WHERE LENGTH(REGEXP_REPLACE(u.telefono, '\\D', '', 'g')) >= 10
        AND RIGHT(REGEXP_REPLACE(u.telefono, '\\D', '', 'g'), 10) = $1
      LIMIT 1
    `;
    r = await client.query(qLast10, [last10]);
    row = r.rows[0] || null;
  }

  if (row && row.rol_nivel != null) row.rol_nivel = parseInt(row.rol_nivel, 10);
  return row;
}

async function getPlantas(client) {
  const r = await client.query(`SELECT id, nombre FROM public.plantas ORDER BY id ASC`);
  return r.rows;
}

async function nextFolioNumber(client) {
  const now = new Date();
  const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  await client.query(
    `INSERT INTO public.folio_counters(yyyymm, last_seq) VALUES ($1, 0) ON CONFLICT (yyyymm) DO NOTHING`,
    [yyyymm]
  );
  const r = await client.query(
    `UPDATE public.folio_counters SET last_seq = last_seq + 1 WHERE yyyymm = $1 RETURNING last_seq`,
    [yyyymm]
  );
  const seq3 = String(r.rows[0].last_seq).padStart(3, "0");
  return `F-${yyyymm}-${seq3}`;
}

async function getFolioByNumero(client, numero) {
  const r = await client.query(
    `SELECT f.id, f.numero_folio, f.folio_codigo, f.planta_id, f.beneficiario, f.concepto, f.importe,
            f.categoria, f.subcategoria, f.unidad, f.prioridad, f.estatus, f.cotizacion_url, f.cotizacion_s3key,
            f.aprobado_por, f.aprobado_en, f.creado_en, f.nivel_aprobado, f.estatus_anterior, f.override_planta, f.override_motivo, f.creado_por,
            COALESCE(f.descripcion, f.concepto) AS descripcion,
            p.nombre AS planta_nombre
     FROM public.folios f
     LEFT JOIN public.plantas p ON p.id = f.planta_id
     WHERE f.numero_folio = $1`,
    [numero]
  );
  const row = r.rows[0] || null;
  if (row && row.nivel_aprobado != null) row.nivel_aprobado = parseInt(row.nivel_aprobado, 10);
  return row;
}

async function insertFolio(client, dd) {
  const numero_folio = await nextFolioNumber(client);
  const folio_codigo = numero_folio;
  const prioridad = dd.urgente ? "Urgente no programado" : (dd.prioridad || null);
  const plantaId = dd.planta_id || dd.actor_planta_id || null;

  const rolClave = dd.actor_clave ? String(dd.actor_clave).toUpperCase() : "";
  const rolNombre = dd.actor_rol ? String(dd.actor_rol) : "";
  const esZP = rolClave === "ZP" || (/director/i.test(rolNombre) && /zp/i.test(rolNombre));
  const esCDMX = rolClave === "CDMX" || (rolNombre && rolNombre.toUpperCase().includes("CDMX"));
  const estatusInicial = esZP ? ESTADOS.LISTO_PARA_PROGRAMACION : ESTADOS.PENDIENTE_APROB_PLANTA;

  const ins = await client.query(
    `INSERT INTO public.folios (
      folio_codigo, numero_folio, planta_id, beneficiario, concepto, importe,
      categoria, subcategoria, unidad, prioridad, estatus, creado_en, nivel_aprobado, creado_por
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13)
    RETURNING id, numero_folio, folio_codigo, planta_id`,
    [
      folio_codigo, numero_folio, plantaId, dd.beneficiario || null, dd.concepto || null,
      dd.importe || null, dd.categoria_nombre || null, dd.subcategoria_nombre || null,
      dd.unidad || null, prioridad, estatusInicial, esZP ? 3 : 1, dd.actor_telefono || null,
    ]
  );
  const row = ins.rows[0];

  if (esZP) {
    await client.query(
      `UPDATE public.folios SET aprobado_por = $1, aprobado_en = NOW() WHERE id = $2`,
      [dd.actor_telefono || null, row.id]
    );
  }

  try {
    await client.query(
      `INSERT INTO public.folio_historial(
        numero_folio, estatus, comentario, actor_telefono, actor_rol, creado_en, folio_codigo, folio_id
      ) VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7)`,
      [
        row.numero_folio, estatusInicial, "Folio creado por WhatsApp",
        dd.actor_telefono || null, dd.actor_rol || null, row.folio_codigo, row.id,
      ]
    );
  } catch (e) {
    console.warn("Historial no insertado (folio creado):", e.message);
  }

  if (esZP) {
    try {
      await client.query(
        `INSERT INTO public.folio_historial(
          folio_id, numero_folio, folio_codigo, estatus, comentario, actor_telefono, actor_rol, creado_en
        ) VALUES ($1,$2,$3,$4,'Folio creado por Director ZP (auto-aprobado)',$5,$6,NOW())`,
        [row.id, row.numero_folio, row.folio_codigo, ESTADOS.APROBADO_ZP, dd.actor_telefono || null, dd.actor_rol || null]
      );
    } catch (e) {
      console.warn("Historial ZP no insertado:", e.message);
    }
    try {
      const folioConPlanta = { ...row, planta_id: row.planta_id, concepto: dd.concepto, importe: dd.importe, prioridad };
      await notifyOnApprove(folioConPlanta, dd.actor_telefono || "");
    } catch (e) {
      console.warn("Notificaciones no enviadas (ZP creó):", e.message);
    }
  } else {
    try {
      const folioConDetalle = { ...row, concepto: dd.concepto, importe: dd.importe };
      await notifyDirectorZPNewFolio(folioConDetalle, dd.actor_rol || "Solicitante");
    } catch (e) {
      console.warn("Notificación a Director ZP (nuevo folio) no enviada:", e.message);
    }
  }

  return row;
}

async function insertHistorial(client, folioId, numeroFolio, folioCodigo, estatus, comentario, actorTelefono, actorRol) {
  await client.query(
    `INSERT INTO public.folio_historial(
      folio_id, numero_folio, folio_codigo, estatus, comentario, actor_telefono, actor_rol, creado_en
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [folioId, numeroFolio, folioCodigo, estatus, comentario, actorTelefono || null, actorRol || null]
  );
}

async function updateFolioEstatus(client, folioId, estatus, extra = {}) {
  const parts = ["estatus = $1"];
  const params = [estatus];
  let n = 2;
  if (extra.aprobado_por != null) {
    parts.push(`aprobado_por = $${n}`);
    params.push(extra.aprobado_por);
    n++;
  }
  if (extra.aprobado_en) parts.push("aprobado_en = NOW()");
  if (extra.estatus_anterior != null) {
    parts.push(`estatus_anterior = $${n}`);
    params.push(extra.estatus_anterior);
    n++;
  }
  if (extra.override_planta != null) {
    parts.push(`override_planta = $${n}`);
    params.push(extra.override_planta);
    n++;
  }
  if (extra.override_motivo != null) {
    parts.push(`override_motivo = $${n}`);
    params.push(extra.override_motivo);
    n++;
  }
  params.push(folioId);
  await client.query(`UPDATE public.folios SET ${parts.join(", ")} WHERE id = $${params.length}`, params);
}

async function updateFolioAprobado(client, folioId, aprobadoPor) {
  await client.query(
    `UPDATE public.folios SET estatus = $1, aprobado_por = $2, aprobado_en = NOW() WHERE id = $3`,
    [ESTADOS.APROBADO_ZP, aprobadoPor, folioId]
  );
}

async function updateFolioCancelado(client, folioId) {
  await client.query(`UPDATE public.folios SET estatus = $1 WHERE id = $2`, [ESTADOS.CANCELADO, folioId]);
}

async function attachCotizacionToFolio(client, folioId, s3Key, publicUrl, actorTelefono) {
  const r = await client.query(
    `UPDATE public.folios
     SET cotizacion_s3key = $1, cotizacion_url = $2, estatus = COALESCE(NULLIF(estatus,'Generado'),'Con cotización')
     WHERE id = $3
     RETURNING id, numero_folio, folio_codigo`,
    [s3Key, publicUrl, folioId]
  );
  const row = r.rows[0];
  try {
    await insertHistorial(client, row.id, row.numero_folio, row.folio_codigo,
      "Con cotización", "Cotización PDF adjunta", actorTelefono, null);
  } catch (e) {
    console.warn("Historial no insertado (cotización):", e.message);
  }
  return row;
}

/** Guardar solo URL temporal cuando no hay S3. */
async function attachCotizacionUrlOnly(client, folioId, url, actorTelefono) {
  const r = await client.query(
    `UPDATE public.folios SET cotizacion_url = $1, estatus = COALESCE(NULLIF(estatus,'Generado'),'Con cotización') WHERE id = $2 RETURNING id, numero_folio, folio_codigo`,
    [url, folioId]
  );
  const row = r.rows[0];
  try {
    await insertHistorial(client, row.id, row.numero_folio, row.folio_codigo,
      "Con cotización", "Cotización (URL temporal Twilio)", actorTelefono, null);
  } catch (e) {
    console.warn("Historial no insertado (cotización url):", e.message);
  }
  return row;
}

async function getHistorial(client, numeroFolio, limit = 10) {
  const r = await client.query(
    `SELECT estatus, comentario, actor_telefono, actor_rol, creado_en
     FROM public.folio_historial WHERE numero_folio = $1 ORDER BY creado_en DESC LIMIT $2`,
    [numeroFolio, limit]
  );
  return r.rows;
}

async function insertComentario(client, numeroFolio, texto, actorTelefono, actorRol) {
  const folio = await getFolioByNumero(client, numeroFolio);
  if (!folio) return null;
  await client.query(
    `INSERT INTO public.comentarios (folio_id, numero_folio, comentario, actor_telefono, actor_rol) VALUES ($1,$2,$3,$4,$5)`,
    [folio.id, numeroFolio, texto, actorTelefono || null, actorRol || null]
  );
  await insertHistorial(client, folio.id, numeroFolio, folio.folio_codigo, folio.estatus, `Comentario: ${texto.substring(0, 200)}${texto.length > 200 ? "…" : ""}`, actorTelefono, actorRol);
  return folio;
}

/** Mapa telefono (cualquier variante +52 / +521 / 10 dígitos) -> nombre. */
async function getNombresByTelefonos(client, _telefonos) {
  let r;
  try {
    r = await client.query(`SELECT telefono, nombre FROM public.usuarios`);
  } catch (e) {
    try {
      r = await client.query(`SELECT telefono, name AS nombre FROM public.usuarios`);
    } catch (e2) {
      return new Map();
    }
  }
  const map = new Map();
  (r.rows || []).forEach((row) => {
    const t = row.telefono != null ? String(row.telefono).trim().replace(/\s/g, "") : "";
    const nom = row.nombre != null ? String(row.nombre).trim() : null;
    if (!t || !nom) return;
    const norm = normalizePhone(t);
    const alt = norm && norm.length === 12 ? "+521" + norm.slice(3) : null;
    const last10 = phoneLast10(t);
    map.set(t, nom);
    if (norm) map.set(norm, nom);
    if (alt) map.set(alt, nom);
    if (last10) map.set(last10, nom);
    if (t.startsWith("+521") && t.length >= 13) map.set("+52" + t.slice(3), nom);
    if (t.startsWith("+52") && !t.startsWith("+521") && t.length >= 12) map.set("+521" + t.slice(2), nom);
  });
  return map;
}

/** Folios urgentes (no cancelados): numero_folio, importe, creado_en, concepto. */
async function getFoliosUrgentes(client, limit = 20) {
  const r = await client.query(
    `SELECT numero_folio, importe, creado_en, concepto
     FROM public.folios
     WHERE prioridad = 'Urgente no programado' AND estatus != $1
     ORDER BY creado_en ASC`,
    [ESTADOS.CANCELADO]
  );
  return (r.rows || []).slice(0, limit);
}

/** Últimos N folios de una planta (recientes primero). Muestra todos los folios no cancelados. soloUrgentes: solo filas con prioridad ILIKE '%urgente%'. Retorna { rows, totalGeneral, totalUrgentes, countUrgentes }. */
async function getFoliosByPlanta(client, plantaId, limit = 50, soloUrgentes = false) {
  const params = [plantaId, limit];
  const whereEstatus = " AND (f.estatus IS NULL OR UPPER(TRIM(f.estatus)) <> 'CANCELADO')";
  const whereUrg = soloUrgentes ? " AND f.prioridad ILIKE '%urgente%'" : "";
  let r;
  try {
    r = await client.query(
      `SELECT f.numero_folio, f.estatus, f.importe, f.prioridad, COALESCE(f.descripcion, f.concepto) AS concepto
       FROM public.folios f
       WHERE f.planta_id = $1 ${whereEstatus} ${whereUrg}
       ORDER BY f.creado_en DESC NULLS LAST LIMIT $2`,
      params
    );
  } catch (e) {
    if (e.message && /descripcion|column/.test(e.message)) {
      r = await client.query(
        `SELECT f.numero_folio, f.estatus, f.importe, f.prioridad, f.concepto AS concepto
         FROM public.folios f
         WHERE f.planta_id = $1 ${whereEstatus} ${whereUrg}
         ORDER BY f.creado_en DESC NULLS LAST LIMIT $2`,
        params
      );
    } else throw e;
  }
  const rows = (r && r.rows) || [];
  let totalGeneral = 0;
  let totalUrgentes = 0;
  let countUrgentes = 0;
  rows.forEach((f) => {
    const m = f.importe != null ? Number(f.importe) : 0;
    totalGeneral += m;
    if (f.prioridad && String(f.prioridad).toLowerCase().includes("urgente")) {
      totalUrgentes += m;
      countUrgentes++;
    }
  });
  return { rows, totalGeneral, totalUrgentes, countUrgentes };
}

/** Usuarios por rol y planta (GA/GG). Solo activos con teléfono. rolClave: 'GA' | 'GG'. */
async function getUsersByRoleAndPlanta(client, rolClave, plantaId) {
  const q = `
    SELECT u.telefono, u.nombre FROM public.usuarios u
    INNER JOIN public.roles r ON r.id = u.rol_id
    WHERE u.planta_id = $1 AND (r.clave = $2 OR r.nombre = $2)
      AND TRIM(COALESCE(u.telefono,'')) <> ''
      AND (u.activo IS NULL OR u.activo = true)
  `;
  const r = await client.query(q, [plantaId, rolClave]);
  return (r.rows || []).map((row) => ({ telefono: row.telefono, nombre: row.nombre }));
}

/** Usuarios corporativos por rol (ZP, CDMX). Sin planta. Solo activos con teléfono. */
async function getUsersByRole(client, rolClave) {
  const q = `
    SELECT u.telefono, u.nombre FROM public.usuarios u
    INNER JOIN public.roles r ON r.id = u.rol_id
    WHERE (r.clave = $1 OR r.nombre = $1)
      AND TRIM(COALESCE(u.telefono,'')) <> ''
      AND (u.activo IS NULL OR u.activo = true)
  `;
  const r = await client.query(q, [rolClave]);
  return (r.rows || []).map((row) => ({ telefono: row.telefono, nombre: row.nombre }));
}

/** "Notificar a todos": GA + GG de la planta del folio + CDMX + ZP. Solo activos. */
async function getTodosParaNotificacion(client, plantaId) {
  const phones = new Set();
  const ga = await getUsersByRoleAndPlanta(client, "GA", plantaId);
  const gg = await getUsersByRoleAndPlanta(client, "GG", plantaId);
  const cdmx = await getUsersByRole(client, "CDMX");
  const zp = await getUsersByRole(client, "ZP");
  [ga, gg, cdmx, zp].forEach((arr) => arr.forEach((u) => u.telefono && phones.add(u.telefono)));
  return Array.from(phones);
}

/** Usuarios a notificar al aprobar: GA y GG de la planta del folio + todos CDMX. */
async function getUsersToNotifyOnApprove(client, plantaId) {
  const gaGG = await client.query(
    `SELECT u.telefono FROM public.usuarios u
     INNER JOIN public.roles r ON r.id = u.rol_id
     WHERE u.planta_id = $1 AND (r.clave IN ('GA','GG') OR r.nombre IN ('GA','GG'))
       AND (u.activo IS NULL OR u.activo = true)`,
    [plantaId]
  );
  const cdmx = await client.query(
    `SELECT u.telefono FROM public.usuarios u
     INNER JOIN public.roles r ON r.id = u.rol_id
     WHERE (r.clave = 'CDMX' OR r.nombre = 'CDMX') AND (u.activo IS NULL OR u.activo = true)`
  );
  const phones = new Set();
  gaGG.rows.forEach((row) => phones.add(row.telefono));
  cdmx.rows.forEach((row) => phones.add(row.telefono));
  return Array.from(phones);
}

/** Teléfonos de Directores ZP (para notificar solicitudes de cancelación y nuevos folios). */
async function getDirectoresZP(client) {
  const r = await client.query(
    `SELECT u.telefono FROM public.usuarios u
     INNER JOIN public.roles r ON r.id = u.rol_id
     WHERE r.clave = 'ZP' OR r.nombre ILIKE '%ZP%' OR r.nombre ILIKE '%Director%'`
  );
  return (r.rows || []).map((row) => row.telefono).filter(Boolean);
}

/** Notificar a Director ZP que hay un folio nuevo pendiente de su aprobación (creado por GA o GG). */
async function notifyDirectorZPNewFolio(folioRow, creadorRol) {
  const client = await pool.connect();
  try {
    const directoresZP = await getDirectoresZP(client);
    const concepto = folioRow.concepto || "-";
    const importe = folioRow.importe != null ? `$${Number(folioRow.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "-";
    let msg = `📋 Nuevo folio pendiente de tu aprobación\n`;
    msg += `Folio: ${folioRow.numero_folio}\n`;
    msg += `Creado por: ${creadorRol || "GA/GG"}\n`;
    msg += `Concepto: ${concepto}\n`;
    msg += `Importe: ${importe}\n\n`;
    msg += `Responde: aprobar ${folioRow.numero_folio}`;
    for (const tel of directoresZP) {
      if (tel) await sendWhatsApp(tel, msg);
    }
  } finally {
    client.release();
  }
}

/** Notificar a GA, GG y CDMX cuando un folio es cancelado por Director ZP. */
async function notifyOnCancel(folio, canceladoPor, motivo) {
  if (!folio.planta_id) return;
  const client = await pool.connect();
  try {
    const phones = await getUsersToNotifyOnApprove(client, folio.planta_id);
    let msg = `📋 Folio ${folio.numero_folio} fue cancelado por ${canceladoPor}.\n`;
    msg += `Motivo: ${motivo || "Sin motivo indicado"}\n`;
    msg += `Concepto del folio: ${folio.concepto || "-"}`;
    for (const phone of phones) {
      if (phone && normalizePhone(phone) !== normalizePhone(canceladoPor)) {
        await sendWhatsApp(phone, msg);
      }
    }
  } finally {
    client.release();
  }
}

/* ==================== NOTIFICACIONES POR PLANTA ==================== */

/** Obtiene destinatarios de la planta del folio. opts: { roles?: string[] } para filtrar por rol (ej. ['CDMX','FINANZAS']). Excluye inactivos y sin teléfono. */
async function getRecipientsByFolio(client, folioCodigo, opts = {}) {
  const folioRow = await client.query(
    `SELECT f.id, f.numero_folio, f.folio_codigo, f.planta_id FROM public.folios f WHERE f.numero_folio = $1 OR f.folio_codigo = $1 LIMIT 1`,
    [folioCodigo]
  );
  const folio = folioRow.rows[0] || null;
  if (!folio || folio.planta_id == null) return { folio: null, recipients: [] };

  let q = `
    SELECT u.id AS user_id, COALESCE(u.nombre, '') AS nombre, u.telefono AS telefono_whatsapp, r.nombre AS rol
    FROM public.usuarios u
    LEFT JOIN public.roles r ON r.id = u.rol_id
    WHERE u.planta_id = $1 AND TRIM(COALESCE(u.telefono,'')) <> ''
  `;
  const params = [folio.planta_id];
  try {
    const activoCol = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name='activo'
    `);
    if (activoCol.rows.length > 0) {
      q += ` AND (u.activo IS NULL OR u.activo = true)`;
    }
  } catch (_) {}
  if (opts.roles && Array.isArray(opts.roles) && opts.roles.length > 0) {
    q += ` AND r.nombre = ANY($2::TEXT[])`;
    params.push(opts.roles);
  }
  q += ` ORDER BY u.id`;
  const r = await client.query(q, params);
  const recipients = (r.rows || []).map((row) => ({
    user_id: row.user_id,
    nombre: row.nombre || "",
    telefono_whatsapp: row.telefono_whatsapp,
    rol: row.rol || "",
  }));
  return { folio, recipients };
}

/** Registra un intento de notificación en notificaciones_log. */
async function logNotification(client, data) {
  const { folio_codigo, planta_id, evento, to_phone, status, error_message } = data;
  await client.query(
    `INSERT INTO public.notificaciones_log (folio_codigo, planta_id, evento, to_phone, status, error_message) VALUES ($1,$2,$3,$4,$5,$6)`,
    [folio_codigo || null, planta_id ?? null, evento || null, to_phone || null, status || null, error_message || null]
  );
}

/** Envía notificación por WhatsApp solo a miembros de la planta del folio. evento: CREADO|APROBADO|CANCELADO|ADJUNTO. extra: { roles?, excludePhone?, motivo?, concepto?, importe?, prioridad? }. Retorna { sent, failed, failures }. */
async function notifyPlantByFolio(poolInstance, folioCodigo, evento, extra = {}) {
  const client = await poolInstance.connect();
  let sent = 0;
  let failed = 0;
  const failures = [];
  try {
    const folio = await getFolioByNumero(client, folioCodigo);
    if (!folio) return { sent: 0, failed: 0, failures: [] };
    if (folio.planta_id == null) return { sent: 0, failed: 0, failures: [] };

    const message = buildPlantNotificationMessage(evento, folio, { ...extra, folioCodigo });
    const { folio: _f, recipients } = await getRecipientsByFolio(client, folioCodigo, extra.roles ? { roles: extra.roles } : {});
    if (!recipients || recipients.length === 0) return { sent: 0, failed: 0, failures: [] };

    const plantaId = folio.planta_id;
    const excludeNorm = extra.excludePhone ? normalizePhone(extra.excludePhone) : null;

    for (const rec of recipients) {
      const toPhone = rec.telefono_whatsapp;
      if (!toPhone) continue;
      if (excludeNorm && normalizePhone(toPhone) === excludeNorm) continue;

      const result = await sendWhatsApp(toPhone, message);
      try {
        await logNotification(client, {
          folio_codigo: folio.numero_folio || folioCodigo,
          planta_id: plantaId,
          evento,
          to_phone: toPhone,
          status: result.ok ? "SENT" : "FAILED",
          error_message: result.error || null,
        });
      } catch (e) {
        console.warn("logNotification error:", e.message);
      }
      if (result.ok) sent++;
      else {
        failed++;
        failures.push({ to: toPhone, error: result.error || "unknown" });
      }
    }
    return { sent, failed, failures };
  } catch (e) {
    console.warn("notifyPlantByFolio error:", e.message);
    return { sent, failed, failures };
  } finally {
    client.release();
  }
}

/** Construye mensaje por evento para notificación por planta. */
function buildPlantNotificationMessage(evento, folio, extra = {}) {
  const num = (folio && (folio.numero_folio || folio.folio_codigo)) || extra.folioCodigo || "?";
  const urg = (folio && folio.prioridad === "Urgente no programado") ? " 🔴 URGENTE" : "";
  switch (String(evento).toUpperCase()) {
    case "CREADO":
      return (
        `📋 Se creó folio ${num}${urg}.\n` +
        `Concepto: ${(folio && folio.concepto) || extra.concepto || "-"}\n` +
        `Importe: $${folio && folio.importe != null ? Number(folio.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : (extra.importe != null ? Number(extra.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-")}\n` +
        `Prioridad: ${(folio && folio.prioridad) || extra.prioridad || "-"}`
      );
    case "APROBADO":
      return `✅ Folio aprobado: ${num}${urg}\nConcepto: ${(folio && folio.concepto) || "-"}\nImporte: $${folio && folio.importe != null ? Number(folio.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-"}`;
    case "CANCELADO":
      return `📋 Folio cancelado: ${num}\nMotivo: ${extra.motivo || "N/A"}`;
    case "ADJUNTO":
      return `📎 Cotización adjunta al folio ${num}.`;
    default:
      return `Folio ${num}: actualización.`;
  }
}

/* ==================== S3 / MEDIA ==================== */

async function downloadTwilioMediaAsBuffer(mediaUrl) {
  const resp = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    auth: {
      username: process.env.TWILIO_ACCOUNT_SID,
      password: process.env.TWILIO_AUTH_TOKEN,
    },
    timeout: 15000,
  });
  return Buffer.from(resp.data);
}

function buildS3PublicUrl(bucket, region, key) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
}

async function uploadPdfToS3(buffer, key) {
  if (!s3Enabled) throw new Error("S3 no configurado");
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;
  await s3.send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: buffer, ContentType: "application/pdf",
  }));
  return buildS3PublicUrl(bucket, region, key);
}

/* ==================== COMANDOS: TEXTO AYUDA / VERSION ==================== */

function buildHelpMessage(actor) {
  const clave = (actor && actor.rol_clave) ? String(actor.rol_clave).toUpperCase() : "";
  const lines = ["Comandos:"];
  lines.push("• crear folio [concepto] [urgente]");
  lines.push(`• estatus F-YYYYMM-XXX${FLAGS.ESTATUS ? "" : " (desactivado)"}`);
  lines.push(`• historial F-YYYYMM-XXX${FLAGS.HISTORIAL ? "" : " (desactivado)"}`);
  lines.push("• folios de planta");
  lines.push("• folios urgentes de planta");
  lines.push("• comentario F-YYYYMM-XXX: <texto>");
  if (FLAGS.ATTACHMENTS) lines.push("• adjuntar F-YYYYMM-XXX (luego envía el PDF)");
  if (FLAGS.APPROVALS) {
    if (clave === "GG") lines.push("• aprobar F-YYYYMM-XXX (aprobación planta)");
    if (clave === "ZP") {
      lines.push("• aprobar F-YYYYMM-XXX (aprobación dirección)");
      lines.push("• aprobar_override F-YYYYMM-XXX motivo: <texto>");
      lines.push("• autorizar cancelacion F-YYYYMM-XXX");
      lines.push("• rechazar cancelacion F-YYYYMM-XXX motivo: <texto>");
    }
    if (clave === "CDMX") lines.push("• seleccionar F-YYYYMM-XXX (selección para semana)");
    if (["GA", "GG", "CDMX"].includes(clave)) lines.push("• cancelar F-YYYYMM-XXX motivo: <texto>");
  }
  lines.push("• version");
  lines.push("• ayuda / menu");
  return lines.join("\n");
}

function buildVersionMessage() {
  const parts = [
    `Bot Folios v${BOT_VERSION}`,
    "Módulos:",
    `- Aprobaciones: ${FLAGS.APPROVALS ? "activo" : "desactivado"}`,
    `- Adjuntos: ${FLAGS.ATTACHMENTS ? "activo" : "desactivado"}`,
    `- Estatus: ${FLAGS.ESTATUS ? "activo" : "desactivado"}`,
    `- Historial: ${FLAGS.HISTORIAL ? "activo" : "desactivado"}`,
    `- OpenAI fallback: ${FLAGS.OPENAI_FALLBACK ? "activo" : "desactivado"}`,
  ];
  return parts.join("\n");
}

/* ==================== CATÁLOGOS ==================== */

const CATEGORIAS = [
  { clave: "GASTOS", nombre: "Gastos" },
  { clave: "INVERSIONES", nombre: "Inversiones" },
  { clave: "DYO", nombre: "Derechos y Obligaciones" },
  { clave: "TALLER", nombre: "Taller" },
];

const SUBCATEGORIAS = {
  GASTOS: ["Contractuales", "Equipo planta", "Estaciones", "Jurídicos", "Liquidaciones laborales", "Pasivos meses anteriores", "Rentas", "Trámites vehiculares", "Varios"],
  INVERSIONES: ["Equipo para la planta", "Instalaciones a clientes", "Publicidad", "Tanques y cilindros"],
  DYO: [],
  TALLER: [],
};

const PRIORIDADES = ["Alta", "Media", "Baja"];

/* ==================== SESIONES ==================== */

const sessions = new Map();

function getSession(from) {
  if (!sessions.has(from)) {
    sessions.set(from, { estado: "IDLE", dd: {}, lastFolioNumero: null, lastFolioId: null });
  }
  return sessions.get(from);
}

function resetSession(sess) {
  sess.estado = "IDLE";
  sess.dd = {};
}

/* ==================== NOTIFICACIONES WHATSAPP ==================== */

/** Envío outbound WhatsApp. Usa TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER. Normaliza "to" a whatsapp:+52... Retorna { ok, error? }. */
async function sendWhatsApp(toPhone, body) {
  if (!twilioClient || !twilioWhatsAppFrom) {
    return { ok: false, error: "Twilio no configurado (TWILIO_ACCOUNT_SID/AUTH_TOKEN/WHATSAPP_NUMBER)" };
  }
  const to = normalizePhoneForWhatsApp(toPhone);
  if (!to) {
    return { ok: false, error: "Teléfono inválido o no normalizable" };
  }
  const from = twilioWhatsAppFrom.startsWith("whatsapp:") ? twilioWhatsAppFrom : `whatsapp:${twilioWhatsAppFrom}`;
  try {
    await twilioClient.messages.create({ body, from, to });
    return { ok: true };
  } catch (e) {
    console.warn("Twilio send error:", e.message);
    return { ok: false, error: e.message || String(e) };
  }
}

async function notifyOnApprove(folio, aprobadoPor) {
  if (!folio.planta_id) return;
  const client = await pool.connect();
  try {
    const phones = await getUsersToNotifyOnApprove(client, folio.planta_id);
    const urgPrefix = (folio.prioridad === "Urgente no programado") ? "🔴💡 URGENTE | " : "";
    let msg = `${urgPrefix}Folio ${folio.numero_folio} aprobado por ${aprobadoPor}.\n`;
    msg += `Concepto: ${folio.concepto || "-"}\nImporte: $${folio.importe || "-"}`;
    if (!folio.cotizacion_url) msg += "\n⚠️ Aún no tiene la cotización adjunta.";

    for (const phone of phones) {
      if (phone && normalizePhone(phone) !== aprobadoPor) await sendWhatsApp(phone, msg);
    }
  } finally {
    client.release();
  }
}

/* ==================== RUTAS HTTP ==================== */

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/health-db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, hora: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, hora: new Date().toISOString() });
  }
});

if (DEBUG) {
  app.get("/debug/actor", async (req, res) => {
    const from = req.query.from || "";
    const norm = normalizePhone(from);
    const alt = phoneAltForDb(norm);
    const client = await pool.connect();
    try {
      const actor = await getActorByPhone(client, from);
      res.json({ from, normalized: norm, alt, actor: actor || null });
    } finally {
      client.release();
    }
  });
}

/* ==================== WEBHOOK WHATSAPP ==================== */

app.post("/twilio/whatsapp", async (req, res) => {
  const safeReply = (msg) => {
    res.set("Content-Type", "text/xml");
    return res.status(200).send(twimlMessage(msg));
  };

  try {
    const from = req.body.From || "unknown";
    const fromNorm = normalizePhone(from);
    const body = normalizeText(req.body.Body);
    const numMedia = parseInt(req.body.NumMedia || "0", 10) || 0;
    const sess = getSession(from);
    const lower = body.toLowerCase();

    // Solo resetear flujo cuando el mensaje es exactamente cancelar/salir/reset (no "cancelar F-...")
    if (/^(cancelar|salir|reset)$/i.test(body)) {
      resetSession(sess);
      return safeReply("Listo. Cancelé el flujo. Escribe: Crear folio o Ayuda");
    }

    if (lower === "version") {
      return safeReply(buildVersionMessage());
    }

    if (DEBUG) console.log("[debug] from:", from, "| normalized:", fromNorm, "| body:", body.substring(0, 80));

    const client = await pool.connect();
    try {
      let actor = null;
      try {
        actor = await getActorByPhone(client, from);
      } catch (e) {
        console.warn("getActorByPhone error:", e.message);
      }

      if (["ayuda", "help", "menu"].includes(lower)) {
        return safeReply(buildHelpMessage(actor));
      }

      if (/^comentario\s+F-\d{6}-\d{3}\s*:/i.test(body)) {
        const match = body.trim().match(/^comentario\s+(F-\d{6}-\d{3})\s*:\s*(.+)$/is);
        const numero = match ? match[1].trim() : "";
        const texto = match && match[2] ? match[2].trim() : "";
        if (!numero || !texto) return safeReply("Formato: comentario F-YYYYMM-XXX: <texto>");
        const folio = await insertComentario(client, numero, texto, fromNorm, actor && actor.rol_nombre);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        return safeReply(`Comentario guardado en folio ${numero}.`);
      }

      if (lower === "folios de planta") {
        const plantas = await getPlantas(client);
        sess.dd.intent = "LISTA_PLANTA";
        sess.dd.esperando = "PLANTA";
        sess.dd._plantasList = plantas;
        if (!plantas.length) return safeReply("No hay plantas en catálogo.");
        const list = plantas.map((p, i) => `${i + 1}) ${p.nombre}`).join("\n");
        return safeReply("¿De qué planta?\n" + list + "\n\nResponde con el número o nombre.");
      }

      if (lower === "folios urgentes de planta") {
        const plantas = await getPlantas(client);
        sess.dd.intent = "LISTA_PLANTA_URGENTES";
        sess.dd.esperando = "PLANTA";
        sess.dd._plantasList = plantas;
        if (!plantas.length) return safeReply("No hay plantas en catálogo.");
        const list = plantas.map((p, i) => `${i + 1}) ${p.nombre}`).join("\n");
        return safeReply("¿De qué planta? Selecciona número:\n" + list + "\n\nResponde con el número o nombre.");
      }

      function truncConcepto(s, maxLen = 60) {
        const t = String(s || "").trim();
        if (!t) return "-";
        if (t.length <= maxLen) return t;
        return t.substring(0, maxLen) + "…";
      }

      function formatFoliosList(rows, plantaNombre, totalGeneral, totalUrgentes, soloUrgentes) {
        let txt = `FOLIOS - ${plantaNombre.toUpperCase()}\n`;
        rows.forEach((f, i) => {
          const urg = (f.prioridad && String(f.prioridad).toLowerCase().includes("urgente")) ? "🔴💡 " : "";
          const imp = f.importe != null ? Number(f.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "0.00";
          const concepto = truncConcepto(f.concepto, 60);
          txt += `${i + 1}) ${urg}${f.numero_folio} | ${f.estatus || "-"} | $${imp} | ${concepto}\n`;
        });
        txt += `\nTotal urgentes: $${totalUrgentes.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
        txt += `Total general: $${totalGeneral.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
        if (rows.length >= 50) txt += "\nMostrando últimos 50.";
        return txt.trim();
      }

      if ((sess.dd.intent === "LISTA_PLANTA" || sess.dd.intent === "LISTA_PLANTA_URGENTES") && sess.dd.esperando === "PLANTA") {
        const plantas = sess.dd._plantasList || [];
        const soloUrgentes = sess.dd.intent === "LISTA_PLANTA_URGENTES";
        let plantaId = null;
        let plantaNombre = "";
        const bodyNorm = body.trim().toLowerCase().normalize("NFD").replace(/\u0300/g, "");
        const num = parseInt(body.trim(), 10);
        if (Number.isFinite(num) && num >= 1 && num <= plantas.length) {
          plantaId = plantas[num - 1].id;
          plantaNombre = plantas[num - 1].nombre;
        } else {
          const byName = plantas.find((p) => (p.nombre || "").toLowerCase().normalize("NFD").replace(/\u0300/g, "") === bodyNorm || (p.nombre || "").toLowerCase() === body.trim().toLowerCase());
          if (byName) {
            plantaId = byName.id;
            plantaNombre = byName.nombre;
          }
        }
        sess.dd.intent = null;
        sess.dd.esperando = null;
        sess.dd._plantasList = null;
        if (!plantaId) return safeReply("Planta no reconocida. Responde con el número o nombre. Escribe: " + (soloUrgentes ? "folios urgentes de planta" : "folios de planta"));
        const { rows, totalGeneral, totalUrgentes, countUrgentes } = await getFoliosByPlanta(client, plantaId, 50, soloUrgentes);
        if (soloUrgentes && rows.length === 0) {
          return safeReply(`No hay folios urgentes en ${plantaNombre}.`);
        }
        const txt = formatFoliosList(rows, plantaNombre, totalGeneral, totalUrgentes, soloUrgentes);
        if (soloUrgentes) {
          const extra = `\nCantidad folios urgentes: ${countUrgentes}`;
          return safeReply(txt + extra);
        }
        return safeReply(txt);
      }

      if (FLAGS.ESTATUS && /^estatus\s+F-\d{6}-\d{3}\s*$/i.test(body)) {
        const numero = body.replace(/^estatus\s+/i, "").trim();
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        const urg = (folio.prioridad && String(folio.prioridad).toLowerCase().includes("urgente")) ? " 🔴💡 URGENTE" : "";
        const concepto = folio.descripcion || folio.concepto || "-";
        const imp = Number(folio.importe) != null && !isNaN(Number(folio.importe)) ? Number(folio.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
        const fecha = formatMexicoCentral(folio.creado_en);
        let txt = `Folio ${folio.numero_folio}${urg}\n`;
        txt += `Planta: ${folio.planta_nombre || "-"}\n`;
        txt += `Estatus: ${folio.estatus || "-"}\n`;
        txt += `Monto: $${imp}\n`;
        txt += `Concepto: ${concepto}\n`;
        txt += `Beneficiario: ${folio.beneficiario || "-"}\n`;
        txt += `Categoría: ${folio.categoria || "-"}\n`;
        txt += `Subcategoría: ${folio.subcategoria || "-"}\n`;
        txt += `Urgente: ${(folio.prioridad && String(folio.prioridad).toLowerCase().includes("urgente")) ? "Sí" : "No"}\n`;
        txt += `Cotización adjunta: ${folio.cotizacion_url ? "Sí" : "No"}\n`;
        txt += `Fecha: ${fecha}\n`;
        if (folio.aprobado_por) txt += `Aprobado por: ${folio.aprobado_por}\n`;
        return safeReply(txt.trim());
      }

      if (FLAGS.HISTORIAL && /^historial\s+F-\d{6}-\d{3}\s*$/i.test(body)) {
        const numero = body.replace(/^historial\s+/i, "").trim();
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        const rows = await getHistorial(client, numero, 10);
        if (rows.length === 0) return safeReply(`Sin historial para ${numero}.`);

        const telefonos = [...new Set(rows.map((r) => r.actor_telefono).filter(Boolean))];
        const nombresMap = await getNombresByTelefonos(client, telefonos);

        const esDirectorZP = actor && (String(actor.rol_nombre || "").toUpperCase().includes("ZP") || String(actor.rol_nombre || "").includes("Director"));
        let txt = "Historial (últimos 10):\n";
        if (esDirectorZP && folio.planta_nombre) txt += `Planta: ${folio.planta_nombre}\n\n`;

        rows.forEach((r) => {
          const fecha = formatMexicoCentral(r.creado_en);
          let comentario = r.comentario || "";
          if (comentario.trim() === "Folio creado por WhatsApp" && r.actor_telefono) {
            const tel = String(r.actor_telefono || "").trim().replace(/\s/g, "");
            const norm = normalizePhone(tel);
            const alt = phoneAltForDb(norm);
            const last10 = phoneLast10(tel);
            const nombre = nombresMap.get(tel) || nombresMap.get(norm) || (alt && nombresMap.get(alt)) || (last10 && nombresMap.get(last10)) || null;
            const rol = r.actor_rol ? (String(r.actor_rol).toUpperCase().includes("ZP") ? "Director ZP" : r.actor_rol) : null;
            const identidad = nombre ? (rol ? `${rol} - ${nombre}` : nombre) : (rol ? `${rol} - ${tel}` : tel);
            comentario = `Folio creado por ${identidad}`;
          }
          txt += `${fecha} | ${r.estatus} | ${comentario}\n`;
        });
        return safeReply(txt.trim());
      }

      if (FLAGS.APPROVALS && /^aprobar\s+F-\d{6}-\d{3}\s*$/i.test(body)) {
        const numero = body.replace(/^aprobar\s+/i, "").trim();
        if (!actor) return safeReply("No autorizado. No se pudo identificar tu usuario.");
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        const estatus = String(folio.estatus || "").toUpperCase();
        if (estatus === ESTADOS.CANCELADO || estatus === "CANCELADO") return safeReply("Ese folio está cancelado.");
        if ([ESTADOS.APROBADO_ZP, ESTADOS.LISTO_PARA_PROGRAMACION, ESTADOS.SELECCIONADO_SEMANA, ESTADOS.PAGADO, ESTADOS.CERRADO].includes(estatus)) {
          return safeReply("Ese folio ya está aprobado o en etapa posterior.");
        }

        const rolClave = (actor.rol_clave || "").toUpperCase();
        const esGG = rolClave === "GG" || (actor.rol_nombre && String(actor.rol_nombre).toUpperCase().includes("GG"));
        const esZP = rolClave === "ZP" || (actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre));

        if (estatus === ESTADOS.PENDIENTE_APROB_PLANTA && esGG) {
          await client.query("BEGIN");
          try {
            await client.query(`UPDATE public.folios SET estatus = $1 WHERE id = $2`, [ESTADOS.APROB_PLANTA, folio.id]);
            await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, ESTADOS.APROB_PLANTA, "Aprobado por GG (planta)", fromNorm, actor.rol_nombre);
            await client.query(`UPDATE public.folios SET estatus = $1 WHERE id = $2`, [ESTADOS.PENDIENTE_APROB_ZP, folio.id]);
            await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, ESTADOS.PENDIENTE_APROB_ZP, "Pendiente aprobación Director ZP", fromNorm, actor.rol_nombre);
            await client.query("COMMIT");
          } catch (e) {
            await client.query("ROLLBACK");
            throw e;
          }
          const urgPrefix = (folio.prioridad === "Urgente no programado") ? "🔴💡 URGENTE | " : "";
          let msgZP = `${urgPrefix}Nuevo folio pendiente de tu aprobación (aprobado planta por GG).\n`;
          msgZP += `Folio: ${numero}\nConcepto: ${folio.concepto || "-"}\nImporte: $${folio.importe != null ? Number(folio.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-"}\n\nResponde: aprobar ${numero}`;
          const zpList = await getUsersByRole(client, "ZP");
          for (const u of zpList) {
            if (u.telefono) await sendWhatsApp(u.telefono, msgZP);
          }
          return safeReply(`Folio ${numero} aprobado por planta (GG). Pendiente de Director ZP. Se notificó a ZP.`);
        }

        if (estatus === ESTADOS.PENDIENTE_APROB_ZP && esZP) {
          await client.query("BEGIN");
          try {
            await updateFolioEstatus(client, folio.id, ESTADOS.LISTO_PARA_PROGRAMACION, { aprobado_por: fromNorm, aprobado_en: true });
            await client.query(`UPDATE public.folios SET nivel_aprobado = 3 WHERE id = $1`, [folio.id]);
            await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, ESTADOS.APROBADO_ZP, "Aprobado por Director ZP vía WhatsApp", fromNorm, actor.rol_nombre);
            await client.query("COMMIT");
          } catch (e) {
            await client.query("ROLLBACK");
            throw e;
          }
          try {
            await notifyOnApprove(folio, fromNorm);
          } catch (e) {
            console.warn("Notificaciones no enviadas:", e.message);
          }
          setImmediate(() => {
            notifyPlantByFolio(pool, numero, "APROBADO", { excludePhone: fromNorm }).catch((e) => console.warn("Notif APROBADO:", e.message));
          });
          return safeReply(`Folio ${numero} aprobado por Director ZP. Notificaciones enviadas a GA, GG y CDMX.`);
        }

        if (estatus === ESTADOS.PENDIENTE_APROB_PLANTA && !esGG) {
          return safeReply("Le falta aprobación de GG (planta). Solo GG puede aprobar en esta etapa.");
        }
        if (estatus === ESTADOS.PENDIENTE_APROB_ZP && !esZP) {
          return safeReply("Le falta aprobación del Director ZP. Solo ZP puede aprobar en esta etapa.");
        }
        return safeReply("No puedes aprobar este folio en su estado actual.");
      }

      if (FLAGS.APPROVALS && /^aprobar_override\s+F-\d{6}-\d{3}\s+motivo:/i.test(body)) {
        const match = body.trim().match(/^aprobar_override\s+(F-\d{6}-\d{3})\s+motivo:\s*(.+)$/i);
        const numero = match ? match[1].trim() : "";
        const motivoOverride = match && match[2] ? match[2].trim() : "";
        if (!numero || !motivoOverride) return safeReply('Formato: aprobar_override F-YYYYMM-XXX motivo: <texto>');
        if (!actor) return safeReply("No autorizado.");
        const rolClave = (actor.rol_clave || "").toUpperCase();
        const esZP = rolClave === "ZP" || (actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre));
        if (!esZP) return safeReply("Solo el Director ZP puede usar aprobar_override.");
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        const estatus = String(folio.estatus || "").toUpperCase();
        if (estatus === ESTADOS.CANCELADO) return safeReply("Ese folio está cancelado.");
        await client.query("BEGIN");
        try {
          await updateFolioEstatus(client, folio.id, ESTADOS.LISTO_PARA_PROGRAMACION, {
            aprobado_por: fromNorm,
            aprobado_en: true,
            override_planta: true,
            override_motivo: motivoOverride,
          });
          await client.query(`UPDATE public.folios SET nivel_aprobado = 3 WHERE id = $1`, [folio.id]);
          await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, ESTADOS.APROBADO_ZP, `Aprobado por override ZP. Motivo: ${motivoOverride}`, fromNorm, actor.rol_nombre);
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        }
        try {
          await notifyOnApprove(folio, fromNorm);
        } catch (e) {
          console.warn("Notificaciones no enviadas:", e.message);
        }
        return safeReply(`Folio ${numero} aprobado por override (Director ZP). Motivo registrado.`);
      }

      if (FLAGS.APPROVALS && /^seleccionar\s+F-\d{6}-\d{3}\s*$/i.test(body)) {
        const numero = body.replace(/^seleccionar\s+/i, "").trim();
        if (!actor) return safeReply("No autorizado.");
        const rolClave = (actor.rol_clave || "").toUpperCase();
        const esCDMX = rolClave === "CDMX" || (actor.rol_nombre && String(actor.rol_nombre).toUpperCase().includes("CDMX"));
        if (!esCDMX) return safeReply("Solo CDMX (Contralor) puede seleccionar folios para la semana.");
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        const estatus = String(folio.estatus || "").toUpperCase();
        if (estatus !== ESTADOS.LISTO_PARA_PROGRAMACION) {
          return safeReply("Solo se puede seleccionar un folio en estatus LISTO_PARA_PROGRAMACION.");
        }
        await client.query("BEGIN");
        try {
          await client.query(`UPDATE public.folios SET estatus = $1 WHERE id = $2`, [ESTADOS.SELECCIONADO_SEMANA, folio.id]);
          await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, ESTADOS.SELECCIONADO_SEMANA, "Seleccionado para pago esta semana por CDMX", fromNorm, actor.rol_nombre);
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        }
        const urgPrefix = (folio.prioridad === "Urgente no programado") ? "🔴💡 URGENTE | " : "";
        const msgPlant = `${urgPrefix}Folio ${numero} seleccionado para pago esta semana.`;
        const gaGG = await getUsersByRoleAndPlanta(client, "GA", folio.planta_id);
        const ggList = await getUsersByRoleAndPlanta(client, "GG", folio.planta_id);
        for (const u of [...gaGG, ...ggList]) {
          if (u.telefono) await sendWhatsApp(u.telefono, msgPlant);
        }
        return safeReply(`Folio ${numero} seleccionado para esta semana. Notificación enviada a GA y GG de la planta.`);
      }

      if (FLAGS.APPROVALS && /^cancelar\s+F-\d{6}-\d{3}/i.test(body)) {
        try {
          const match = body.trim().match(/^cancelar\s+(F-\d{6}-\d{3})\s*(?:motivo:)?\s*(.*)$/i);
          const numero = (match && match[1]) ? match[1].trim() : "";
          let motivo = (match && match[2]) ? match[2].trim() : "";
          if (!numero) return safeReply("Formato: cancelar F-YYYYMM-XXX motivo: <texto>");
          const claveRol = (actor && actor.rol_clave) ? String(actor.rol_clave).toUpperCase() : "";
          const rolNombre = (actor && actor.rol_nombre) ? String(actor.rol_nombre).toUpperCase() : "";
          const puedeSolicitar = actor && ["GA", "GG", "CDMX"].some((r) => claveRol === r || (rolNombre && rolNombre.includes(r)));
          if (!actor) return safeReply("No se pudo identificar tu usuario.");
          if (!puedeSolicitar) return safeReply("Solo GA, GG y CDMX pueden solicitar cancelación. ZP autoriza o rechaza con: autorizar cancelacion / rechazar cancelacion.");
          const folio = await getFolioByNumero(client, numero);
          if (!folio) return safeReply(`No existe el folio ${numero}.`);
          const estatus = String(folio.estatus || "").toUpperCase();
          if (estatus === ESTADOS.CANCELADO) return safeReply("Ese folio ya está cancelado.");
          if (estatus === ESTADOS.PAGADO || estatus === ESTADOS.CERRADO) {
            return safeReply("No se puede cancelar folios PAGADOS o CERRADOS. Solicita ajuste por dirección.");
          }
          if (estatus === ESTADOS.CANCELACION_SOLICITADA) return safeReply("Ya hay una solicitud de cancelación pendiente. ZP debe autorizar o rechazar.");
          if (!motivo) return safeReply("Indica el motivo. Formato: cancelar " + numero + " motivo: <razón>");
          await client.query("BEGIN");
          try {
            await updateFolioEstatus(client, folio.id, ESTADOS.CANCELACION_SOLICITADA, { estatus_anterior: estatus });
            await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, ESTADOS.CANCELACION_SOLICITADA, `Solicitud de cancelación. Motivo: ${motivo}`, fromNorm, actor.rol_nombre);
            await client.query("COMMIT");
          } catch (e) {
            await client.query("ROLLBACK");
            throw e;
          }
          const urgPrefix = (folio.prioridad === "Urgente no programado") ? "🔴💡 URGENTE | " : "";
          const msgTodos = `${urgPrefix}Solicitud de cancelación\nFolio: ${numero}\nSolicitado por: ${actor.rol_nombre || "Usuario"}\nMotivo: ${motivo}\n\nZP: responde "autorizar cancelacion ${numero}" o "rechazar cancelacion ${numero} motivo: ..."`;
          const todos = await getTodosParaNotificacion(client, folio.planta_id);
          for (const tel of todos) {
            if (tel) await sendWhatsApp(tel, msgTodos);
          }
          return safeReply("Solicitud de cancelación registrada. Se notificó a GA, GG, CDMX y ZP.");
        } catch (e) {
          console.error("Error en cancelar:", e);
          return safeReply("Error al procesar. Formato: cancelar F-YYYYMM-XXX motivo: <texto>");
        }
      }

      if (FLAGS.APPROVALS && /^autorizar\s+cancelacion\s+F-\d{6}-\d{3}\s*$/i.test(body)) {
        const numero = body.replace(/^autorizar\s+cancelacion\s+/i, "").trim();
        if (!actor) return safeReply("No autorizado.");
        const rolClave = (actor.rol_clave || "").toUpperCase();
        const esZP = rolClave === "ZP" || (actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre));
        if (!esZP) return safeReply("Solo el Director ZP puede autorizar la cancelación.");
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        if (String(folio.estatus || "").toUpperCase() !== ESTADOS.CANCELACION_SOLICITADA) {
          return safeReply("El folio debe estar en CANCELACION_SOLICITADA para autorizar.");
        }
        await client.query("BEGIN");
        try {
          await updateFolioCancelado(client, folio.id);
          await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, ESTADOS.CANCELADO, "Cancelación autorizada por Director ZP", fromNorm, actor.rol_nombre);
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        }
        const urgPrefix = (folio.prioridad === "Urgente no programado") ? "🔴💡 URGENTE | " : "";
        const msgTodos = `${urgPrefix}Folio ${numero} cancelado (autorizado por Director ZP).`;
        const todos = await getTodosParaNotificacion(client, folio.planta_id);
        for (const tel of todos) {
          if (tel) await sendWhatsApp(tel, msgTodos);
        }
        return safeReply(`Folio ${numero} cancelado. Notificación enviada a todos.`);
      }

      if (FLAGS.APPROVALS && /^rechazar\s+cancelacion\s+F-\d{6}-\d{3}\s+motivo:/i.test(body)) {
        const match = body.trim().match(/^rechazar\s+cancelacion\s+(F-\d{6}-\d{3})\s+motivo:\s*(.+)$/i);
        const numero = match ? match[1].trim() : "";
        const motivoRechazo = match && match[2] ? match[2].trim() : "";
        if (!numero || !motivoRechazo) return safeReply('Formato: rechazar cancelacion F-YYYYMM-XXX motivo: <texto>');
        if (!actor) return safeReply("No autorizado.");
        const rolClave = (actor.rol_clave || "").toUpperCase();
        const esZP = rolClave === "ZP" || (actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre));
        if (!esZP) return safeReply("Solo el Director ZP puede rechazar la cancelación.");
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        if (String(folio.estatus || "").toUpperCase() !== ESTADOS.CANCELACION_SOLICITADA) {
          return safeReply("El folio debe estar en CANCELACION_SOLICITADA para rechazar.");
        }
        const estatusAnterior = folio.estatus_anterior || ESTADOS.GENERADO;
        await client.query("BEGIN");
        try {
          await client.query(`UPDATE public.folios SET estatus = $1, estatus_anterior = NULL WHERE id = $2`, [estatusAnterior, folio.id]);
          await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, estatusAnterior, `Cancelación rechazada por ZP. Motivo: ${motivoRechazo}`, fromNorm, actor.rol_nombre);
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        }
        const urgPrefix = (folio.prioridad === "Urgente no programado") ? "🔴💡 URGENTE | " : "";
        const msgTodos = `${urgPrefix}Cancelación rechazada para folio ${numero}. Motivo ZP: ${motivoRechazo}. Folio en: ${estatusAnterior}`;
        const todos = await getTodosParaNotificacion(client, folio.planta_id);
        for (const tel of todos) {
          if (tel) await sendWhatsApp(tel, msgTodos);
        }
        return safeReply(`Cancelación rechazada. Folio ${numero} restaurado a ${estatusAnterior}.`);
      }

      if (FLAGS.ATTACHMENTS && lower.startsWith("adjuntar")) {
        const parts = body.split(/\s+/);
        const numero = parts[1] || "";
        if (!/^F-\d{6}-\d{3}$/.test(numero)) {
          return safeReply("Formato: Adjuntar F-YYYYMM-XXX. Ejemplo: Adjuntar F-202602-001");
        }
        sess.dd.attachNumero = numero;
        return safeReply(`Ok. Envía el PDF y lo adjunto al folio ${numero}.`);
      }
    } finally {
      client.release();
    }

    if (numMedia > 0) {
      const mediaUrl = req.body.MediaUrl0;
      const mediaType = (req.body.MediaContentType0 || "").toLowerCase();
      if (!mediaUrl) return safeReply("Recibí un adjunto pero no tengo la URL. Intenta de nuevo.");
      if (!mediaType.includes("pdf")) return safeReply("Solo acepto PDF para cotización.");

      const client = await pool.connect();
      try {
        let targetNumero = sess.dd.attachNumero || sess.lastFolioNumero;
        if (!targetNumero) {
          return safeReply("Indica a qué folio: Adjuntar F-YYYYMM-XXX y luego envía el PDF.");
        }
        const folio = await getFolioByNumero(client, targetNumero);
        if (!folio) return safeReply(`No encuentro el folio ${targetNumero}.`);

        if (s3Enabled) {
          const buffer = await downloadTwilioMediaAsBuffer(mediaUrl);
          const s3Key = `cotizaciones/${folio.numero_folio}/${Date.now()}.pdf`;
          const publicUrl = await uploadPdfToS3(buffer, s3Key);
          await attachCotizacionToFolio(client, folio.id, s3Key, publicUrl, fromNorm);
        } else {
          const tempUrl = `TWILIO:${mediaUrl}`;
          await attachCotizacionUrlOnly(client, folio.id, tempUrl, fromNorm);
        }
        sess.dd.attachNumero = null;
        const folioCodigoAdjunto = folio.numero_folio;
        setImmediate(() => {
          notifyPlantByFolio(pool, folioCodigoAdjunto, "ADJUNTO").catch((e) => console.warn("Notif ADJUNTO:", e.message));
        });
        return safeReply(`✅ Cotización guardada en el folio ${folio.numero_folio}.`);
      } finally {
        client.release();
      }
    }

    if (sess.estado === "IDLE") {
      const crearParsed = parseCrearFolioCommand(body);
      if (crearParsed || lower.includes("crear folio") || lower === "crear" || lower === "folio") {
        const clientForActor = await pool.connect();
        let actorCreate = null;
        try {
          actorCreate = await getActorByPhone(clientForActor, from);
        } finally {
          clientForActor.release();
        }
        sess.estado = "ESPERANDO_PLANTA";
        sess.dd = { actor_telefono: fromNorm };
        if (actorCreate) {
          sess.dd.actor_rol = actorCreate.rol_nombre;
          sess.dd.actor_nivel = actorCreate.rol_nivel;
          sess.dd.actor_clave = actorCreate.rol_clave;
          sess.dd.actor_planta_id = actorCreate.planta_id;
        }
        if (crearParsed && crearParsed.concepto) sess.dd.concepto = crearParsed.concepto;
        if (crearParsed && crearParsed.urgente) sess.dd.urgente = true;

        const client = await pool.connect();
        let msg = "Vamos a crear un folio.";
        try {
          const plantas = await getPlantas(client);
          if (plantas.length > 0) {
            sess.dd._plantasList = plantas;
            msg += "\n1) Indica PLANTA (responde con el número):\n" + plantas.map((p, i) => `${i + 1}) ${p.nombre}`).join("\n");
          } else {
            sess.dd._plantasList = [];
            msg += "\n1) No hay plantas en catálogo. Indica el nombre de la planta (texto).";
            sess.estado = "ESPERANDO_PLANTA_TEXTO";
          }
        } finally {
          client.release();
        }
        if (sess.dd.concepto) msg += `\nConcepto: ${sess.dd.concepto}`;
        if (sess.dd.urgente) msg += "\n🔴 Urgente no programado.";
        return safeReply(msg);
      }
      return safeReply('Escribe "Crear folio" o "Ayuda".');
    }

    if (sess.estado === "ESPERANDO_PLANTA") {
      const client = await pool.connect();
      try {
        const plantas = sess.dd._plantasList || [];
        if (plantas.length > 0) {
          const picked = pickByNumber(body, plantas);
          if (!picked) return safeReply("Responde con el número de planta.");
          sess.dd.planta_id = picked.id;
          sess.dd.planta_nombre = picked.nombre;
        } else {
          return safeReply("Indica el nombre de la planta (texto).");
        }
      } finally {
        client.release();
      }
      sess.estado = "ESPERANDO_BENEFICIARIO";
      return safeReply("2) Indica BENEFICIARIO (a quién se le paga).");
    }

    if (sess.estado === "ESPERANDO_PLANTA_TEXTO") {
      if (body.length < 2) return safeReply("Nombre de planta muy corto.");
      sess.dd.planta_nombre = body;
      sess.dd.planta_id = null;
      sess.estado = "ESPERANDO_BENEFICIARIO";
      return safeReply("2) Indica BENEFICIARIO (a quién se le paga).");
    }

    if (sess.estado === "ESPERANDO_BENEFICIARIO") {
      if (body.length < 3) return safeReply("Beneficiario muy corto.");
      sess.dd.beneficiario = body;
      sess.estado = "ESPERANDO_CONCEPTO";
      return safeReply("3) Indica CONCEPTO (razón del pago).");
    }

    if (sess.estado === "ESPERANDO_CONCEPTO") {
      if (body.length < 3) return safeReply("Concepto muy corto.");
      sess.dd.concepto = body;
      sess.estado = "ESPERANDO_IMPORTE";
      return safeReply("4) Indica IMPORTE en MXN (ej: 1500 o 1,500.50).");
    }

    if (sess.estado === "ESPERANDO_IMPORTE") {
      if (!isMoney(body)) return safeReply("Importe inválido. Ejemplo: 1500 o 1,500.50");
      sess.dd.importe = parseMoney(body);
      sess.estado = "ESPERANDO_CATEGORIA";
      return safeReply(renderMenu("5) Elige CATEGORÍA:", CATEGORIAS.map((c) => c.nombre)));
    }

    if (sess.estado === "ESPERANDO_CATEGORIA") {
      const picked = pickByNumber(body, CATEGORIAS);
      if (!picked) return safeReply("Responde con el número.");
      sess.dd.categoria_clave = picked.clave;
      sess.dd.categoria_nombre = picked.nombre;
      if (picked.clave === "TALLER") {
        sess.estado = "ESPERANDO_UNIDAD";
        return safeReply("Taller. Indica Unidad (AT o C + número 1-1000). Ej: AT-15, C-3");
      }
      const subs = SUBCATEGORIAS[picked.clave] || [];
      if (subs.length === 0) {
        sess.dd.subcategoria_nombre = null;
        sess.estado = "ESPERANDO_PRIORIDAD";
        return safeReply(renderMenu("6) Elige PRIORIDAD:", sess.dd.urgente ? ["Urgente no programado", ...PRIORIDADES] : PRIORIDADES));
      }
      sess.estado = "ESPERANDO_SUBCATEGORIA";
      return safeReply(renderMenu("6) Elige SUBCATEGORÍA:", subs));
    }

    if (sess.estado === "ESPERANDO_SUBCATEGORIA") {
      const subs = SUBCATEGORIAS[sess.dd.categoria_clave] || [];
      const picked = pickByNumber(body, subs);
      if (!picked) return safeReply("Opción inválida.");
      sess.dd.subcategoria_nombre = picked;
      sess.estado = "ESPERANDO_PRIORIDAD";
      return safeReply(renderMenu("7) Elige PRIORIDAD:", sess.dd.urgente ? ["Urgente no programado", ...PRIORIDADES] : PRIORIDADES));
    }

    if (sess.estado === "ESPERANDO_UNIDAD") {
      const unidad = normalizeUnidad(body);
      if (!unidad) return safeReply("Unidad inválida. Ej: AT-15, C-3");
      sess.dd.unidad = unidad;
      sess.dd.subcategoria_nombre = null;
      sess.estado = "ESPERANDO_PRIORIDAD";
      return safeReply(renderMenu("6) Elige PRIORIDAD:", sess.dd.urgente ? ["Urgente no programado", ...PRIORIDADES] : PRIORIDADES));
    }

    if (sess.estado === "ESPERANDO_PRIORIDAD") {
      const opciones = sess.dd.urgente ? ["Urgente no programado", ...PRIORIDADES] : PRIORIDADES;
      const picked = pickByNumber(body, opciones);
      if (!picked) return safeReply("Opción inválida.");
      sess.dd.prioridad = picked;

      sess.estado = "CONFIRMAR";
      const resumen = [
        "Confirma el folio:",
        `Planta: ${sess.dd.planta_nombre || "(N/A)"}`,
        `Beneficiario: ${sess.dd.beneficiario}`,
        `Concepto: ${sess.dd.concepto}`,
        `Importe: $${sess.dd.importe}`,
        `Categoría: ${sess.dd.categoria_nombre}`,
        `Subcategoría: ${sess.dd.subcategoria_nombre || "(N/A)"}`,
        `Unidad: ${sess.dd.unidad || "(N/A)"}`,
        `Prioridad: ${sess.dd.prioridad}`,
        "",
        "Responde SI para guardar, NO para cancelar.",
      ].join("\n");
      return safeReply(resumen);
    }

    if (sess.estado === "CONFIRMAR") {
      if (lower === "no") {
        resetSession(sess);
        return safeReply("Cancelado. Escribe: Crear folio");
      }
      if (lower !== "si" && lower !== "sí") return safeReply("Responde SI o NO.");

      const client = await pool.connect();
      try {
        if (!sess.dd.planta_id && sess.dd.planta_nombre) {
          const plantas = await getPlantas(client);
          const byName = plantas.find((p) => p.nombre.toLowerCase() === (sess.dd.planta_nombre || "").toLowerCase());
          if (byName) sess.dd.planta_id = byName.id;
        }
        if (!sess.dd.planta_id && !sess.dd.planta_nombre) {
          return safeReply("Falta indicar la planta. Cancela y vuelve a crear el folio indicando la planta.");
        }
        const folio = await insertFolio(client, sess.dd);
        sess.lastFolioNumero = folio.numero_folio;
        sess.lastFolioId = folio.id;
        resetSession(sess);
        const folioCodigoCreacion = folio.numero_folio;
        setImmediate(() => {
          notifyPlantByFolio(pool, folioCodigoCreacion, "CREADO").catch((e) => console.warn("Notif CREADO:", e.message));
        });
        return safeReply(
          `✅ Folio creado: ${folio.numero_folio}. ` +
            "Puedes adjuntar la cotización en PDF: envía el archivo o escribe Adjuntar " + folio.numero_folio
        );
      } catch (e) {
        console.error("Error creando folio:", e);
        return safeReply("Error al guardar el folio. Revisa los datos e intenta de nuevo.");
      } finally {
        client.release();
      }
    }

    return safeReply('No entendí. Escribe "Crear folio" o "Ayuda".');
  } catch (err) {
    console.error("Webhook error:", err);
    res.set("Content-Type", "text/xml");
    return res.status(200).send(twimlMessage("Error procesando solicitud. Intenta de nuevo en 1 minuto."));
  }
});

/* ==================== START ==================== */

process.on("unhandledRejection", (r) => console.error("unhandledRejection:", r));
process.on("uncaughtException", (e) => console.error("uncaughtException:", e));

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Bot corriendo en puerto ${PORT}`));
  })
  .catch((e) => {
    console.error("ensureSchema failed:", e);
    process.exit(1);
  });
