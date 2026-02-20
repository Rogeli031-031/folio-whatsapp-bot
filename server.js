/**
 * folio-whatsapp-bot - server.js
 * Stack: Express + Twilio WhatsApp Webhook + PostgreSQL (pg) + AWS S3 (aws-sdk v3)
 *
 * Variables de entorno necesarias:
 * - DATABASE_URL (obligatorio)
 * - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (obligatorios)
 * - TWILIO_WHATSAPP_NUMBER (opcional; notificaciones salientes)
 * - S3_BUCKET_NAME o S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (opcionales; PDFs en S3)
 * - OPENAI_API_KEY (opcional)
 * - DEBUG (opcional; "true" o "1" habilita GET /debug/actor y log from normalizado)
 * - DATABASE_SSL (opcional; "false" desactiva SSL para pg)
 *
 * Render: node server.js | Port: process.env.PORT
 */

"use strict";

const crypto = require("crypto");
const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const twilio = require("twilio");
const axios = require("axios");
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const twilioNotify = require("./notifications/twilioClient");

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

/** Límite de caracteres para cuerpo de mensaje WhatsApp (Twilio ~1600; dejar margen por emojis). */
const MAX_WHATSAPP_BODY = 1550;

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

/** Estados de proyecto (tabla proyectos.estatus). */
const ESTADOS_PROYECTO = {
  EN_CURSO: "EN_CURSO",
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

const twilioWhatsAppFrom = (process.env.TWILIO_WHATSAPP_NUMBER || "").trim() || null;

(function logTwilioStartup() {
  const debug = twilioNotify.getTwilioDebugInfo();
  if (!debug.clientOk || !twilioWhatsAppFrom) {
    console.warn("⚠️ Notificaciones salientes desactivadas:", debug.message);
    if (debug.missing && debug.missing.length) console.warn("   Faltan ENV:", debug.missing.join(", "));
  }
})();

const s3BucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || "";
const s3Enabled =
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.AWS_REGION &&
  !!s3BucketName;

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

/** Forma canónica para comparar si dos números son el mismo (México: últimos 10 dígitos). */
function samePhone(a, b) {
  const la = phoneLast10(a);
  const lb = phoneLast10(b);
  if (!la || !lb) return false;
  return la === lb;
}

/** Normaliza teléfono para envío WhatsApp outbound. Acepta +52 o +521; devuelve "whatsapp:+521..." para coincidir con Twilio Sandbox (participants usan +521). México: +52 + 10 dígitos. */
function normalizePhoneForWhatsApp(phone) {
  if (!phone) return null;
  let s = String(phone).trim().replace(/\s/g, "").replace(/-/g, "");
  s = s.replace(/^whatsapp:/i, "");
  if (s.startsWith("+521") && s.length >= 13) s = "+52" + s.slice(3);
  else if (s.startsWith("521") && s.length >= 12) s = "+52" + s.slice(2);
  else if (s.startsWith("52") && !s.startsWith("521") && s.length >= 12) s = "+" + s;
  else if (/^\d{10}$/.test(s)) s = "+52" + s;
  else if (s.startsWith("+52") && /^\+52\d{10}$/.test(s)) { /* ok: +52 y 10 dígitos (México) */ }
  else return null;
  if (!/^\+52\d{10}$/.test(s)) return null;
  return `whatsapp:+521${s.slice(3)}`;
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
  if (!raw) return null;
  // Solo dígitos => AT-{num} por defecto
  if (/^\d{1,4}$/.test(raw)) {
    const num = parseInt(raw, 10);
    if (!Number.isFinite(num) || num < 1 || num > 1000) return null;
    return `AT-${num}`;
  }
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
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS estacion VARCHAR(120);`);
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
    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;`);

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

    await client.query(`ALTER TABLE public.plantas ADD COLUMN IF NOT EXISTS clave VARCHAR(50);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.proyecto_counters (
        yyyymm VARCHAR(6) PRIMARY KEY,
        last_seq INT NOT NULL DEFAULT 0
      );
    `).catch(() => {});

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.proyectos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        planta_id INT REFERENCES public.plantas(id),
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        fecha_inicio DATE NOT NULL,
        fecha_cierre_estimada DATE,
        fecha_cierre_real TIMESTAMPTZ,
        estatus VARCHAR(30) NOT NULL DEFAULT 'EN_CURSO',
        aprobado_zp BOOLEAN NOT NULL DEFAULT FALSE,
        aprobado_por VARCHAR(120),
        aprobado_en TIMESTAMPTZ,
        creado_por VARCHAR(120) NOT NULL,
        creado_en TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.proyecto_archivos (
        id SERIAL PRIMARY KEY,
        proyecto_id INT REFERENCES public.proyectos(id),
        tipo VARCHAR(30) NOT NULL,
        url TEXT NOT NULL,
        subido_por VARCHAR(120),
        subido_en TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.proyecto_historial (
        id SERIAL PRIMARY KEY,
        proyecto_id INT REFERENCES public.proyectos(id),
        evento VARCHAR(50) NOT NULL,
        detalle TEXT,
        actor_telefono VARCHAR(30),
        actor_rol VARCHAR(50),
        creado_en TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS proyecto_id INT REFERENCES public.proyectos(id);`).catch(() => {});

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.folio_archivos (
        id SERIAL PRIMARY KEY,
        folio_id INT REFERENCES public.folios(id) ON DELETE CASCADE,
        numero_folio VARCHAR(50) NOT NULL,
        tipo VARCHAR(30) NOT NULL,
        s3_key TEXT NOT NULL,
        url TEXT,
        file_name TEXT,
        file_size_bytes BIGINT,
        mime_type TEXT DEFAULT 'application/pdf',
        sha256 TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
        replace_of_id INT REFERENCES public.folio_archivos(id),
        replaced_by_id INT REFERENCES public.folio_archivos(id),
        subido_por TEXT,
        subido_en TIMESTAMPTZ DEFAULT NOW(),
        aprobado_por TEXT,
        aprobado_en TIMESTAMPTZ,
        rechazado_por TEXT,
        rechazado_en TIMESTAMPTZ,
        rechazado_motivo TEXT
      );
    `).catch(() => {});

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_folio_sha
      ON public.folio_archivos(folio_id, sha256)
      WHERE sha256 IS NOT NULL;
    `).catch(() => {});

    await client.query(`ALTER TABLE public.folios ADD COLUMN IF NOT EXISTS cotizacion_archivo_id INT REFERENCES public.folio_archivos(id);`).catch(() => {});

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

/** YYYYMM actual del servidor (mismo criterio que el contador mensual de folios). */
function getCurrentYYYYMM() {
  const now = new Date();
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Normaliza un token a número de folio completo "F-YYYYMM-XXX".
 * - Si token es "F-YYYYMM-XXX" → se devuelve tal cual (normalizado).
 * - Si token es 1-3 dígitos → se rellena a 3 y se usa yyyymmFallback → "F-YYYYMM-XXX".
 * - Si token es 4+ dígitos → null (formato inválido).
 */
function normalizeFolioToken(token, yyyymmFallback) {
  const t = String(token || "").trim();
  const fullMatch = t.match(/^F-(\d{6})-(\d{3})$/i);
  if (fullMatch) return `F-${fullMatch[1]}-${fullMatch[2]}`;
  if (/^\d{1,3}$/.test(t)) return `F-${yyyymmFallback}-${t.padStart(3, "0")}`;
  if (/^\d{4,}$/.test(t)) return null;
  return null;
}

/**
 * Extrae folios del texto después de "aprobar" o "estatus".
 * Si hay al menos un folio completo F-YYYYMM-XXX, los consecutivos sueltos (1-3 dígitos) usan ese YYYYMM.
 * Si no hay folio completo, se usa YYYYMM actual.
 * Retorna { folios: string[] (orden de primera aparición, sin duplicados), invalidTokens: string[] }.
 */
function parseFolioTokensFromText(text) {
  const raw = String(text || "").trim();
  const parts = raw.split(/[\s,\n]+|\s+y\s+/gi).map((p) => p.trim()).filter((p) => p && p.toLowerCase() !== "y");
  const fullFolios = [];
  const shortTokens = [];
  const invalidTokens = [];
  for (const p of parts) {
    const m = p.match(/^F-(\d{6})-(\d{3})$/i);
    if (m) fullFolios.push(`F-${m[1]}-${m[2]}`);
    else if (/^\d{1,3}$/.test(p)) shortTokens.push(p);
    else if (/^\d{4,}$/.test(p)) invalidTokens.push(p);
  }
  const yyyymm = fullFolios.length > 0 ? fullFolios[0].slice(2, 8) : getCurrentYYYYMM();
  const seen = new Set();
  const folios = [];
  function add(num) {
    if (!seen.has(num)) {
      seen.add(num);
      folios.push(num);
    }
  }
  fullFolios.forEach(add);
  shortTokens.forEach((s) => {
    const n = normalizeFolioToken(s, yyyymm);
    if (n) add(n);
  });
  return { folios, invalidTokens: [...new Set(invalidTokens)] };
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
            f.categoria, f.subcategoria, f.estacion, f.unidad, f.prioridad, f.estatus, f.cotizacion_url, f.cotizacion_s3key,
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

/** Consulta varios folios por numero_folio. Retorna array en el mismo orden que numeros: { numero, folio } con folio null si no existe. */
async function getManyFoliosStatus(client, numeros) {
  if (!numeros || numeros.length === 0) return [];
  const uniq = [...new Set(numeros)];
  const r = await client.query(
    `SELECT f.id, f.numero_folio, f.folio_codigo, f.planta_id, f.beneficiario, f.concepto, f.importe,
            f.categoria, f.subcategoria, f.estacion, f.unidad, f.prioridad, f.estatus, f.cotizacion_url, f.cotizacion_s3key,
            f.aprobado_por, f.aprobado_en, f.creado_en, f.nivel_aprobado, f.estatus_anterior, f.override_planta, f.override_motivo, f.creado_por,
            COALESCE(f.descripcion, f.concepto) AS descripcion,
            p.nombre AS planta_nombre
     FROM public.folios f
     LEFT JOIN public.plantas p ON p.id = f.planta_id
     WHERE f.numero_folio = ANY($1::text[])`,
    [uniq]
  );
  const map = new Map();
  (r.rows || []).forEach((row) => {
    if (row && row.nivel_aprobado != null) row.nivel_aprobado = parseInt(row.nivel_aprobado, 10);
    map.set(row.numero_folio, row);
  });
  return numeros.map((numero) => ({ numero, folio: map.get(numero) || null }));
}

/* ==================== PROYECTOS (DB) ==================== */

async function nextProyectoCodigo(client) {
  const yyyymm = getCurrentYYYYMM();
  await client.query(
    `INSERT INTO public.proyecto_counters(yyyymm, last_seq) VALUES ($1, 0) ON CONFLICT (yyyymm) DO NOTHING`,
    [yyyymm]
  );
  const r = await client.query(
    `UPDATE public.proyecto_counters SET last_seq = last_seq + 1 WHERE yyyymm = $1 RETURNING last_seq`,
    [yyyymm]
  );
  const seq3 = String(r.rows[0].last_seq).padStart(3, "0");
  return `PRJ-${yyyymm}-${seq3}`;
}

async function crearProyecto(client, data) {
  const codigo = await nextProyectoCodigo(client);
  const r = await client.query(
    `INSERT INTO public.proyectos (codigo, planta_id, nombre, descripcion, fecha_inicio, fecha_cierre_estimada, estatus, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,'EN_CURSO',$7)
     RETURNING id, codigo, planta_id, nombre, estatus, creado_en`,
    [
      codigo,
      data.planta_id,
      data.nombre,
      data.descripcion || null,
      data.fecha_inicio,
      data.fecha_cierre_estimada || null,
      data.creado_por,
    ]
  );
  const row = r.rows[0];
  await insertProyectoHistorial(client, row.id, "CREADO", `Proyecto creado: ${row.nombre}`, data.creado_por, data.actor_rol || null);
  return row;
}

async function getProyectoByCodigo(client, codigo) {
  const r = await client.query(
    `SELECT p.id, p.codigo, p.planta_id, p.nombre, p.descripcion, p.fecha_inicio, p.fecha_cierre_estimada, p.fecha_cierre_real,
            p.estatus, p.aprobado_zp, p.aprobado_por, p.aprobado_en, p.creado_por, p.creado_en,
            pl.nombre AS planta_nombre
     FROM public.proyectos p
     LEFT JOIN public.plantas pl ON pl.id = p.planta_id
     WHERE p.codigo = $1`,
    [codigo]
  );
  return r.rows[0] || null;
}

async function getProyectoById(client, id) {
  const r = await client.query(
    `SELECT p.id, p.codigo, p.planta_id, p.nombre, p.descripcion, p.fecha_inicio, p.fecha_cierre_estimada, p.fecha_cierre_real,
            p.estatus, p.aprobado_zp, p.aprobado_por, p.aprobado_en, p.creado_por, p.creado_en,
            pl.nombre AS planta_nombre
     FROM public.proyectos p
     LEFT JOIN public.plantas pl ON pl.id = p.planta_id
     WHERE p.id = $1`,
    [id]
  );
  return r.rows[0] || null;
}

/** Proyectos EN_CURSO de una planta (para listados y para asociar folio). */
async function listarProyectosPorPlanta(client, plantaId, soloEnCurso = true) {
  let q = `SELECT p.id, p.codigo, p.nombre, p.fecha_inicio, p.fecha_cierre_estimada, p.estatus, p.aprobado_zp
           FROM public.proyectos p WHERE p.planta_id = $1`;
  if (soloEnCurso) q += " AND p.estatus = 'EN_CURSO'";
  q += " ORDER BY p.creado_en DESC";
  const r = await client.query(q, [plantaId]);
  return r.rows || [];
}

/** Con totales de folios y montos por proyecto. */
async function listarProyectosPorPlantaConTotales(client, plantaId) {
  const proyectos = await listarProyectosPorPlanta(client, plantaId, true);
  const out = [];
  for (const p of proyectos) {
    const tot = await client.query(
      `SELECT COUNT(*) AS cnt,
              COALESCE(SUM(CASE WHEN f.estatus IS NULL OR UPPER(TRIM(f.estatus)) <> 'CANCELADO' THEN f.importe ELSE NULL END), 0) AS total,
              COALESCE(SUM(CASE WHEN f.prioridad ILIKE '%urgente%' AND (f.estatus IS NULL OR UPPER(TRIM(f.estatus)) <> 'CANCELADO') THEN f.importe ELSE NULL END), 0) AS urgentes
       FROM public.folios f WHERE f.proyecto_id = $1`,
      [p.id]
    );
    const row = tot.rows[0];
    out.push({
      ...p,
      total_folios: parseInt(row.cnt, 10) || 0,
      total_monto: Number(row.total) || 0,
      total_urgentes: Number(row.urgentes) || 0,
    });
  }
  return out;
}

async function insertProyectoHistorial(client, proyectoId, evento, detalle, actorTelefono, actorRol) {
  await client.query(
    `INSERT INTO public.proyecto_historial (proyecto_id, evento, detalle, actor_telefono, actor_rol, creado_en)
     VALUES ($1,$2,$3,$4,$5,NOW())`,
    [proyectoId, evento, detalle || null, actorTelefono || null, actorRol || null]
  );
}

async function agregarArchivoProyecto(client, proyectoId, tipo, url, subidoPor) {
  const r = await client.query(
    `INSERT INTO public.proyecto_archivos (proyecto_id, tipo, url, subido_por, subido_en)
     VALUES ($1,$2,$3,$4,NOW())
     RETURNING id, tipo, url, subido_en`,
    [proyectoId, tipo, url, subidoPor]
  );
  return r.rows[0];
}

async function getArchivosProyecto(client, proyectoId) {
  const r = await client.query(
    `SELECT id, tipo, url, subido_por, subido_en FROM public.proyecto_archivos WHERE proyecto_id = $1 ORDER BY subido_en DESC`,
    [proyectoId]
  );
  return r.rows || [];
}

async function getFoliosByProyecto(client, proyectoId, limit = 5) {
  const r = await client.query(
    `SELECT numero_folio, estatus, importe FROM public.folios WHERE proyecto_id = $1 ORDER BY creado_en DESC LIMIT $2`,
    [proyectoId, limit]
  );
  return r.rows || [];
}

async function getTotalesFoliosProyecto(client, proyectoId) {
  const r = await client.query(
    `SELECT COUNT(*) AS cnt, COALESCE(SUM(importe), 0) AS total
     FROM public.folios WHERE proyecto_id = $1 AND (estatus IS NULL OR UPPER(TRIM(estatus)) <> 'CANCELADO')`,
    [proyectoId]
  );
  const row = r.rows[0];
  return { cantidad: parseInt(row.cnt, 10) || 0, total: Number(row.total) || 0 };
}

async function updateProyectoAprobadoZP(client, proyectoId, aprobadoPor) {
  await client.query(
    `UPDATE public.proyectos SET aprobado_zp = TRUE, aprobado_por = $1, aprobado_en = NOW() WHERE id = $2`,
    [aprobadoPor, proyectoId]
  );
}

async function updateProyectoCerrado(client, proyectoId) {
  await client.query(
    `UPDATE public.proyectos SET estatus = 'CERRADO', fecha_cierre_real = NOW() WHERE id = $1`,
    [proyectoId]
  );
}

async function updateProyectoCancelacionSolicitada(client, proyectoId) {
  await client.query(
    `UPDATE public.proyectos SET estatus = 'CANCELACION_SOLICITADA' WHERE id = $1`,
    [proyectoId]
  );
}

async function updateProyectoCancelado(client, proyectoId) {
  await client.query(
    `UPDATE public.proyectos SET estatus = 'CANCELADO' WHERE id = $1`,
    [proyectoId]
  );
}

/** Resuelve código corto (ej. "001") a PRJ-YYYYMM-001 usando YYYYMM actual o el primero encontrado. */
async function resolveProyectoCodigo(client, input) {
  const t = String(input || "").trim();
  if (/^PRJ-\d{6}-\d{3}$/i.test(t)) return t.toUpperCase();
  if (/^\d{1,3}$/.test(t)) {
    const yyyymm = getCurrentYYYYMM();
    return `PRJ-${yyyymm}-${t.padStart(3, "0")}`;
  }
  return null;
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
      folio_codigo, numero_folio, planta_id, proyecto_id, beneficiario, concepto, importe,
      categoria, subcategoria, estacion, unidad, prioridad, estatus, creado_en, nivel_aprobado, creado_por
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),$14,$15)
    RETURNING id, numero_folio, folio_codigo, planta_id`,
    [
      folio_codigo, numero_folio, plantaId, dd.proyecto_id || null, dd.beneficiario || null, dd.concepto || null,
      dd.importe || null, dd.categoria_nombre || null, dd.subcategoria_nombre || null,
      dd.estacion || null, dd.unidad || null, prioridad, estatusInicial, esZP ? 3 : 1, dd.actor_telefono || null,
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
    const comentarioHistorial = dd.estacion ? `Folio creado por WhatsApp. Estación: ${dd.estacion}` : "Folio creado por WhatsApp";
    await client.query(
      `INSERT INTO public.folio_historial(
        numero_folio, estatus, comentario, actor_telefono, actor_rol, creado_en, folio_codigo, folio_id
      ) VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7)`,
      [
        row.numero_folio, estatusInicial, comentarioHistorial,
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

/* ==================== FOLIO_ARCHIVOS (PDF auditable) ==================== */

/** Busca archivo existente por folio_id y sha256 (anti-duplicado). */
async function findFolioArchivoByHash(client, folioId, sha256) {
  if (!sha256) return null;
  const r = await client.query(
    `SELECT id, status, subido_en, subido_por FROM public.folio_archivos WHERE folio_id = $1 AND sha256 = $2 LIMIT 1`,
    [folioId, sha256]
  );
  return r.rows[0] || null;
}

/** Inserta registro en folio_archivos (status PENDIENTE). */
async function insertFolioArchivo(client, data) {
  const r = await client.query(
    `INSERT INTO public.folio_archivos (
      folio_id, numero_folio, tipo, s3_key, url, file_name, file_size_bytes, mime_type, sha256, status,
      replace_of_id, subido_por
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDIENTE',$10,$11)
    RETURNING id, folio_id, numero_folio, tipo, status, subido_en, replace_of_id`,
    [
      data.folio_id, data.numero_folio, data.tipo, data.s3_key, data.url || null,
      data.file_name || null, data.file_size_bytes || null, data.mime_type || "application/pdf",
      data.sha256 || null, data.replace_of_id || null, data.subido_por || null,
    ]
  );
  return r.rows[0];
}

/** Lista últimos N archivos del folio (por numero_folio). */
async function listFolioArchivos(client, numeroFolio, limit = 10) {
  const r = await client.query(
    `SELECT fa.id, fa.tipo, fa.status, fa.file_name, fa.file_size_bytes, fa.subido_por, fa.subido_en, fa.replace_of_id
     FROM public.folio_archivos fa
     INNER JOIN public.folios f ON f.id = fa.folio_id
     WHERE f.numero_folio = $1
     ORDER BY fa.subido_en DESC
     LIMIT $2`,
    [numeroFolio, limit]
  );
  return r.rows || [];
}

/** Última cotización APROBADA del folio (por numero_folio). */
async function getUltimaCotizacionAprobada(client, numeroFolio) {
  const r = await client.query(
    `SELECT fa.id, fa.s3_key, fa.url, fa.file_name, fa.subido_en, fa.aprobado_por, fa.aprobado_en, fa.status
     FROM public.folio_archivos fa
     INNER JOIN public.folios f ON f.id = fa.folio_id
     WHERE f.numero_folio = $1 AND fa.tipo = 'COTIZACION' AND fa.status = 'APROBADO'
     ORDER BY fa.aprobado_en DESC NULLS LAST
     LIMIT 1`,
    [numeroFolio]
  );
  return r.rows[0] || null;
}

/** Última cotización del folio (cualquier estado: PENDIENTE, APROBADO, etc.) para poder verla aunque CDMX no haya aprobado. */
async function getUltimaCotizacionCualquiera(client, numeroFolio) {
  const r = await client.query(
    `SELECT fa.id, fa.s3_key, fa.url, fa.file_name, fa.subido_en, fa.subido_por, fa.aprobado_por, fa.aprobado_en, fa.status
     FROM public.folio_archivos fa
     INNER JOIN public.folios f ON f.id = fa.folio_id
     WHERE f.numero_folio = $1 AND fa.tipo = 'COTIZACION'
     ORDER BY fa.subido_en DESC
     LIMIT 1`,
    [numeroFolio]
  );
  return r.rows[0] || null;
}

/** Archivo por id (para aprobar/rechazar/ver). */
async function getFolioArchivoById(client, id) {
  const r = await client.query(
    `SELECT fa.id, fa.folio_id, fa.numero_folio, fa.tipo, fa.s3_key, fa.url, fa.status, fa.replace_of_id, fa.sha256,
            fa.subido_por, fa.subido_en, f.concepto, f.importe, f.prioridad, p.nombre AS planta_nombre
     FROM public.folio_archivos fa
     INNER JOIN public.folios f ON f.id = fa.folio_id
     LEFT JOIN public.plantas p ON p.id = f.planta_id
     WHERE fa.id = $1`,
    [id]
  );
  return r.rows[0] || null;
}

/** Cotizaciones APROBADAS del folio (para reemplazo: usuario elige ID). */
async function getCotizacionesAprobadasByFolioId(client, folioId) {
  const r = await client.query(
    `SELECT id, file_name, subido_en, aprobado_por FROM public.folio_archivos
     WHERE folio_id = $1 AND tipo = 'COTIZACION' AND status = 'APROBADO'
     ORDER BY aprobado_en DESC`,
    [folioId]
  );
  return r.rows || [];
}

/** Marca archivo APROBADO; actualiza folios.cotizacion_* y opcionalmente reemplazado. */
async function aprobarFolioArchivoCDMX(client, archivoId, aprobadoPor) {
  const arch = await getFolioArchivoById(client, archivoId);
  if (!arch || arch.status !== "PENDIENTE") return null;
  await client.query(
    `UPDATE public.folio_archivos SET status = 'APROBADO', aprobado_por = $1, aprobado_en = NOW() WHERE id = $2`,
    [aprobadoPor, archivoId]
  );
  const url = arch.url || (arch.s3_key ? await getSignedDownloadUrl(arch.s3_key, 60 * 60 * 24 * 7).catch(() => null) : null);
  await client.query(
    `UPDATE public.folios SET cotizacion_url = $1, cotizacion_s3key = $2, cotizacion_archivo_id = $3,
      estatus = COALESCE(NULLIF(estatus,'Generado'),'Con cotización')
     WHERE id = $4`,
    [url, arch.s3_key, archivoId, arch.folio_id]
  );
  if (arch.replace_of_id) {
    await client.query(
      `UPDATE public.folio_archivos SET status = 'REEMPLAZADO', replaced_by_id = $1 WHERE id = $2`,
      [archivoId, arch.replace_of_id]
    );
  }
  return arch;
}

/** Marca archivo RECHAZADO. */
async function rechazarFolioArchivoCDMX(client, archivoId, rechazadoPor, motivo) {
  const r = await client.query(
    `UPDATE public.folio_archivos SET status = 'RECHAZADO', rechazado_por = $1, rechazado_en = NOW(), rechazado_motivo = $2 WHERE id = $3 AND status = 'PENDIENTE' RETURNING id, folio_id, numero_folio`,
    [rechazadoPor, motivo || null, archivoId]
  );
  return r.rows[0] || null;
}

/**
 * Única fuente del timeline: public.folio_historial.
 * Devuelve los últimos `limit` eventos en orden cronológico ASC (más antiguo primero).
 */
async function getHistorial(client, numeroFolio, limit = 80) {
  const r = await client.query(
    `SELECT estatus, comentario, actor_telefono, actor_rol, creado_en
     FROM (
       SELECT estatus, comentario, actor_telefono, actor_rol, creado_en
       FROM public.folio_historial
       WHERE numero_folio = $1
       ORDER BY creado_en DESC
       LIMIT $2
     ) sub
     ORDER BY creado_en ASC`,
    [numeroFolio, limit]
  );
  return r.rows;
}

/** Normaliza texto para comparación case-insensitive y sin acentos. */
function normalizeForIcon(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "");
}

/**
 * Mapea evento a una etapa lógica para deduplicación (misma etapa = una sola fila).
 * evento: { estatus, comentario, creado_en }. Los comentarios de usuario (Comentario: ...) no se fusionan.
 */
function normalizeStageKey(evento) {
  const estatus = typeof evento === "string" ? evento : (evento && evento.estatus);
  const comentario = evento && evento.comentario;
  const creado_en = evento && evento.creado_en;
  const s = String(estatus || "").trim().toUpperCase();
  if ((comentario || "").trim().toLowerCase().startsWith("comentario:")) {
    return "COMENTARIO_" + (creado_en ? new Date(creado_en).getTime() : Math.random());
  }
  if (!s) return "_VACIO_";
  if (/CANCELADO|CANCELACION_SOLICITADA/.test(s)) return "CANCELACION";
  if (/PENDIENTE_APROB_ZP|APROBADO_ZP|RECHAZADO_ZP/.test(s)) return "DIRECCION_ZP";
  if (/(CONTRALOR|CDMX).*(PENDIENTE|APROBADO|RECHAZADO)|(PENDIENTE|APROBADO|RECHAZADO).*(CONTRALOR|CDMX)/.test(s)) return "CONTRALOR_CDMX";
  if (/PENDIENTE_TESORERIA|PAGADO_TESORERIA|RECHAZADO_TESORERIA/.test(s)) return "TESORERIA";
  if (/PENDIENTE_APROB_PLANTA|APROB_PLANTA|APROBADO_PLANTA/.test(s)) return "PLANTA";
  if (/LISTO_PARA_PROGRAMACION|SELECCIONADO_SEMANA|SOLICITANDO_PAGO|PAGADO|CERRADO/.test(s)) return "PROGRAMACION";
  if (/GENERADO|CREADO|REGISTRADO|CAPTURADO/.test(s)) return "CREACION";
  return s;
}

/** true si el estado es final (aprobado/rechazado/cancelado/pagado/cerrado). */
function isFinalStatus(estatus) {
  const s = String(estatus || "").trim().toUpperCase();
  return /^APROBADO_|^APROB_|^RECHAZADO_|^CANCELADO|^PAGADO|^CERRADO|^COMPLETADO|^FINALIZADO|^LIBERADO|^ENVIADO/.test(s) || s === "PAGADO" || s === "CERRADO" || s === "CANCELADO";
}

/** Prioridad para desempate: mayor = más definitivo. Transitorios 0, aprobados 1, rechazados 2, cancelado 3. */
function statusPriority(estatus) {
  const s = String(estatus || "").trim().toUpperCase();
  if (/^CANCELADO/.test(s)) return 3;
  if (/^RECHAZADO/.test(s)) return 2;
  if (/^APROBADO|^APROB_|^PAGADO|^CERRADO|^COMPLETADO|^FINALIZADO/.test(s) || s === "PAGADO" || s === "CERRADO") return 1;
  return 0;
}

/**
 * Deduplica eventos del historial por etapa: una sola fila por stage_key (la más definitiva y reciente).
 * Si el evento elegido no tiene comentario, arrastra el comentario más reciente no vacío del mismo stage.
 * Retorna array ordenado por creado_en ASC.
 */
function dedupeHistorialByStage(histRows) {
  if (!histRows || histRows.length === 0) return [];
  const byStage = new Map();
  for (const r of histRows) {
    const key = normalizeStageKey(r);
    if (!byStage.has(key)) byStage.set(key, []);
    byStage.get(key).push({ ...r, _stageKey: key, _isFinal: isFinalStatus(r.estatus), _priority: statusPriority(r.estatus) });
  }
  const result = [];
  for (const [stageKey, events] of byStage) {
    const before = events.length;
    const finals = events.filter((e) => e._isFinal);
    const transitorios = events.filter((e) => !e._isFinal);
    let chosen;
    if (finals.length > 0) {
      chosen = finals.sort((a, b) => {
        const pa = a._priority;
        const pb = b._priority;
        if (pa !== pb) return pb - pa;
        const ta = new Date(a.creado_en || 0).getTime();
        const tb = new Date(b.creado_en || 0).getTime();
        return tb - ta;
      })[0];
    } else {
      chosen = transitorios.sort((a, b) => new Date(b.creado_en || 0).getTime() - new Date(a.creado_en || 0).getTime())[0];
    }
    const comentarioMasReciente = [...events].sort((a, b) => new Date(b.creado_en || 0).getTime() - new Date(a.creado_en || 0).getTime()).find((e) => (e.comentario || "").trim().length > 0);
    if ((!chosen.comentario || !String(chosen.comentario).trim()) && comentarioMasReciente && comentarioMasReciente.comentario) {
      chosen = { ...chosen, comentario: comentarioMasReciente.comentario };
    }
    result.push(chosen);
    if (before > 1) console.log(`[HIST] stage=${stageKey} before=${before} after=1 chosen=${chosen.estatus || "-"}`);
  }
  result.sort((a, b) => new Date(a.creado_en || 0).getTime() - new Date(b.creado_en || 0).getTime());
  return result;
}

/**
 * Icono para una fila del historial: completado (✅🟢), rechazado/cancelado (❌🔴), en proceso (🟡).
 */
function getStepIcon(histRow, _context) {
  const estatus = (histRow.estatus || "").trim();
  const comentario = (histRow.comentario || "").trim();
  const text = normalizeForIcon(estatus + " " + comentario);
  if (!text) return "✅🟢 ";

  const rechazadoCancelado = ["rechazado", "cancelado"];
  for (const k of rechazadoCancelado) {
    if (text.includes(k)) return "❌🔴 ";
  }
  const cerrados = ["aprobado", "autorizado", "pagado", "cerrado", "completado", "finalizado", "liberado", "enviado", "seleccionado_semana", "aprob_planta"];
  const pendientes = ["pendiente", "en proceso", "espera", "por aprobar", "requiere", "revision", "validacion", "solicitado", "cancelacion_solicitada", "listo_para_programacion"];

  for (const k of cerrados) {
    if (text.includes(k)) return "✅🟢 ";
  }
  for (const k of pendientes) {
    if (text.includes(k)) return "🟡 ";
  }
  return "✅🟢 ";
}

/**
 * Formatea filas de folio_historial en texto de timeline con iconos.
 * Aplica deduplicación por etapa (una fila por etapa lógica) antes de formatear.
 * histRows: array de { creado_en, estatus, comentario, ... }
 * opts: { formatFecha, resolveComentario(row), dedupe = true }
 */
function formatTimeline(histRows, opts = {}) {
  const dedupe = opts.dedupe !== false;
  const rows = dedupe ? dedupeHistorialByStage(histRows) : histRows;
  const formatFecha = opts.formatFecha || formatMexicoCentral;
  const resolveComentario = opts.resolveComentario;
  let out = "";
  for (const r of rows) {
    const icon = getStepIcon(r, opts.context);
    const fecha = formatFecha(r.creado_en);
    const estatus = (r.estatus || "").trim() || "-";
    let comentario = resolveComentario ? resolveComentario(r) : (r.comentario || "").trim();
    if (comentario === "") comentario = "-";
    out += `${icon}${fecha} | ${estatus} | ${comentario}\n`;
  }
  return out;
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

/**
 * Folios por unidad (pipa) con filtro opcional de planta y tipo.
 * opts: { plantaId?: number | null, soloCancelados: boolean, limit?: number }
 */
async function getFoliosByUnidad(client, unidad, opts = {}) {
  const plantaId = opts.plantaId != null ? opts.plantaId : null;
  const soloCancelados = !!opts.soloCancelados;
  const limit = Math.min(Math.max(1, opts.limit || 50), 100);
  const unidadNorm = String(unidad || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!unidadNorm) return { rows: [] };

  let r;
  try {
    r = await client.query(
      `SELECT f.id, f.numero_folio, f.folio_codigo, f.planta_id, p.nombre AS planta_nombre,
              f.unidad, f.estatus, f.importe, f.prioridad, COALESCE(f.descripcion, f.concepto) AS concepto,
              f.creado_en, f.updated_at
       FROM public.folios f
       LEFT JOIN public.plantas p ON p.id = f.planta_id
       WHERE UPPER(REPLACE(REPLACE(COALESCE(f.unidad,''),' ',''),'-','')) = UPPER(REPLACE(REPLACE($1,' ',''),'-',''))
         AND ($2::INT IS NULL OR f.planta_id = $2)
         AND (
           ($3::BOOL = TRUE  AND UPPER(TRIM(COALESCE(f.estatus,''))) = 'CANCELADO')
           OR
           ($3::BOOL = FALSE AND (f.estatus IS NULL OR UPPER(TRIM(f.estatus)) <> 'CANCELADO'))
         )
       ORDER BY COALESCE(f.updated_at, f.creado_en) DESC NULLS LAST, f.id DESC
       LIMIT $4`,
      [unidadNorm, plantaId, soloCancelados, limit]
    );
  } catch (e) {
    if (e.message && /unidad|column/.test(e.message)) return { rows: [] };
    throw e;
  }
  return { rows: (r && r.rows) || [] };
}

/**
 * Pendientes "en mi cancha" para el usuario identificado por teléfono.
 * Reutiliza reglas de aprobación por etapa: GG/GA = PENDIENTE_APROB_PLANTA (su planta); ZP = PENDIENTE_APROB_ZP + CANCELACION_SOLICITADA; CDMX = LISTO_PARA_PROGRAMACION.
 * FIFO por fecha base: COALESCE(updated_at, creado_en) ASC (más antiguos primero).
 * opts.corporativo: si true y rol ZP/CDMX, devuelve todas las filas con planta_nombre (sin paginar, límite 500).
 * @returns {Promise<{ plantaInfo: { nombre }, urgentesCount, normalesCount, totalCount, urgentesSum, normalesSum, totalSum, rows, totalPages } | null>} null si usuario no existe.
 */
async function getPendientesForUser(client, fromNumber, page = 1, pageSize = 20, opts = {}) {
  const actor = await getActorByPhone(client, fromNumber);
  if (!actor) return null;

  let rolClave = (actor.rol_clave && String(actor.rol_clave).toUpperCase()) || "";
  if (!rolClave && actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre)) rolClave = "ZP";
  const plantaId = actor.planta_id != null ? actor.planta_id : null;
  const plantaNombre = actor.planta_nombre || (plantaId ? null : "Corporativo");
  const corporativo = !!(opts && opts.corporativo && (rolClave === "ZP" || rolClave === "CDMX"));

  let whereClause = "";
  const params = [];

  if (rolClave === "GG" || rolClave === "GA") {
    if (plantaId == null) return { plantaInfo: { nombre: "Corporativo" }, urgentesCount: 0, normalesCount: 0, totalCount: 0, urgentesSum: 0, normalesSum: 0, totalSum: 0, rows: [], totalPages: 0 };
    whereClause = " AND f.planta_id = $1 AND f.estatus = $2";
    params.push(plantaId, ESTADOS.PENDIENTE_APROB_PLANTA);
  } else if (rolClave === "ZP") {
    whereClause = " AND f.estatus = ANY($1::TEXT[])";
    params.push([ESTADOS.PENDIENTE_APROB_ZP, ESTADOS.CANCELACION_SOLICITADA]);
  } else if (rolClave === "CDMX") {
    whereClause = " AND f.estatus = $1";
    params.push(ESTADOS.LISTO_PARA_PROGRAMACION);
  } else {
    return { plantaInfo: { nombre: plantaNombre || "—" }, urgentesCount: 0, normalesCount: 0, totalCount: 0, urgentesSum: 0, normalesSum: 0, totalSum: 0, rows: [], totalPages: 0 };
  }

  const baseWhere = ` WHERE (f.estatus IS NULL OR UPPER(TRIM(f.estatus)) <> 'CANCELADO') ${whereClause}`;
  const orderBy = " ORDER BY (CASE WHEN f.prioridad ILIKE '%urgente%' OR f.prioridad ILIKE '%alta%' THEN 0 ELSE 1 END), COALESCE(f.updated_at, f.creado_en) ASC NULLS LAST, f.id ASC";

  const countRes = await client.query(
    `SELECT
       COUNT(*)::INT AS total_count,
       COUNT(*) FILTER (WHERE f.prioridad ILIKE '%urgente%')::INT AS urgentes_count,
       COUNT(*) FILTER (WHERE (f.prioridad IS NULL OR f.prioridad NOT ILIKE '%urgente%'))::INT AS normales_count,
       COALESCE(SUM(f.importe) FILTER (WHERE f.prioridad ILIKE '%urgente%'), 0)::NUMERIC AS urgentes_sum,
       COALESCE(SUM(f.importe) FILTER (WHERE (f.prioridad IS NULL OR f.prioridad NOT ILIKE '%urgente%')), 0)::NUMERIC AS normales_sum
     FROM public.folios f ${baseWhere}`,
    params
  );
  const countRow = countRes.rows[0] || {};
  const totalCount = parseInt(countRow.total_count, 10) || 0;
  const urgentesCount = parseInt(countRow.urgentes_count, 10) || 0;
  const normalesCount = parseInt(countRow.normales_count, 10) || 0;
  const urgentesSum = Number(countRow.urgentes_sum) || 0;
  const normalesSum = Number(countRow.normales_sum) || 0;
  const totalSum = urgentesSum + normalesSum;

  let rows = [];
  if (corporativo) {
    const rowsRes = await client.query(
      `SELECT f.numero_folio, f.folio_codigo, f.estatus, f.importe, f.prioridad,
              COALESCE(f.descripcion, f.concepto) AS concepto,
              COALESCE(f.updated_at, f.creado_en) AS fecha_base,
              COALESCE(p.nombre, 'Sin planta') AS planta_nombre
       FROM public.folios f
       LEFT JOIN public.plantas p ON p.id = f.planta_id
       ${baseWhere} ${orderBy}
       LIMIT 500`,
      params
    );
    rows = rowsRes.rows || [];
  } else {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const offset = (Math.max(1, page) - 1) * pageSize;
    const rowsParams = [...params, offset, pageSize];
    const rowsRes = await client.query(
      `SELECT f.numero_folio, f.folio_codigo, f.estatus, f.importe, f.prioridad,
              COALESCE(f.descripcion, f.concepto) AS concepto,
              COALESCE(f.updated_at, f.creado_en) AS fecha_base
       FROM public.folios f ${baseWhere} ${orderBy}
       OFFSET $${params.length + 1} LIMIT $${params.length + 2}`,
      rowsParams
    );
    rows = rowsRes.rows || [];
  }

  const totalPages = corporativo ? 1 : Math.max(1, Math.ceil(totalCount / pageSize));
  const plantaNombreRes = plantaNombre || (plantaId ? null : "Corporativo");
  let pNombre = plantaNombreRes;
  if (!pNombre && plantaId) {
    const p = await client.query("SELECT nombre FROM public.plantas WHERE id = $1", [plantaId]);
    pNombre = (p.rows[0] && p.rows[0].nombre) || "Planta";
  }
  if (!pNombre) pNombre = "Corporativo";

  return {
    plantaInfo: { nombre: pNombre },
    urgentesCount,
    normalesCount,
    totalCount,
    urgentesSum,
    normalesSum,
    totalSum,
    rows,
    totalPages,
    corporativo,
    rolClave,
  };
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
  let activoFilter = "";
  try {
    const col = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name='activo'`
    );
    if (col.rows && col.rows.length > 0) activoFilter = " AND (u.activo IS NULL OR u.activo = true)";
  } catch (_) {}
  const gaGG = await client.query(
    `SELECT u.telefono FROM public.usuarios u
     INNER JOIN public.roles r ON r.id = u.rol_id
     WHERE u.planta_id = $1 AND (r.clave IN ('GA','GG') OR r.nombre IN ('GA','GG'))${activoFilter}`,
    [plantaId]
  );
  const cdmx = await client.query(
    `SELECT u.telefono FROM public.usuarios u
     INNER JOIN public.roles r ON r.id = u.rol_id
     WHERE (r.clave = 'CDMX' OR r.nombre = 'CDMX')${activoFilter}`
  );
  const phones = new Set();
  (gaGG.rows || []).forEach((row) => row.telefono && phones.add(row.telefono));
  (cdmx.rows || []).forEach((row) => row.telefono && phones.add(row.telefono));
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
      if (phone && !samePhone(phone, canceladoPor)) {
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
  const urg = (folio && folio.prioridad && String(folio.prioridad).toLowerCase().includes("urgente")) ? " 🔴💡 URGENTE" : "";
  switch (String(evento).toUpperCase()) {
    case "CREADO":
      return (
        `📋 Se creó folio ${num}${urg}.\n` +
        `Concepto: ${(folio && folio.concepto) || extra.concepto || "-"}\n` +
        `Importe: $${folio && folio.importe != null ? Number(folio.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : (extra.importe != null ? Number(extra.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-")}\n` +
        `Prioridad: ${(folio && folio.prioridad) || extra.prioridad || "-"}`
      );
    case "APROBADO": {
      let aprobado = `✅ Folio aprobado: ${num}${urg}\nConcepto: ${(folio && folio.concepto) || "-"}\nImporte: $${folio && folio.importe != null ? Number(folio.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-"}`;
      if (folio && !folio.cotizacion_url) aprobado += "\n⚠️ Aún no tiene cotización adjunta.";
      return aprobado;
    }
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
  const bucket = s3BucketName;
  const region = process.env.AWS_REGION;
  await s3.send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: buffer, ContentType: "application/pdf",
  }));
  return buildS3PublicUrl(bucket, region, key);
}

/** URL firmada S3 para descarga (expira en segundos). */
async function getSignedDownloadUrl(s3Key, expiresInSeconds = 600) {
  if (!s3Enabled || !s3) throw new Error("S3 no configurado");
  const command = new GetObjectCommand({ Bucket: s3BucketName, Key: s3Key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/** Busca en S3 el objeto más reciente bajo cotizaciones/<numero_folio>/ (fallback cuando el folio no tiene cotizacion_s3key en BD). */
async function findLatestCotizacionKeyInS3(numeroFolio) {
  if (!s3Enabled || !s3) return null;
  const prefix = `cotizaciones/${numeroFolio}/`;
  try {
    const list = await s3.send(new ListObjectsV2Command({
      Bucket: s3BucketName,
      Prefix: prefix,
      MaxKeys: 10,
    }));
    const contents = (list.Contents || []).filter((o) => o.Key && !o.Key.endsWith("/"));
    if (contents.length === 0) return null;
    contents.sort((a, b) => (b.LastModified || 0) - (a.LastModified || 0));
    return contents[0].Key;
  } catch (e) {
    console.warn("findLatestCotizacionKeyInS3:", e.message);
    return null;
  }
}

/** Hash SHA-256 del buffer en hex (obligatorio para anti-duplicado). */
function sha256Hex(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/* ==================== COMANDOS: TEXTO AYUDA / VERSION ==================== */

function buildHelpMessage(actor) {
  const clave = (actor && actor.rol_clave) ? String(actor.rol_clave).toUpperCase() : "";
  const lines = ["Comandos:"];
  lines.push("• crear folio [concepto] [urgente]");
  lines.push(`• estatus 001 002 o F-YYYYMM-XXX (varios en un mensaje)${FLAGS.ESTATUS ? "" : " (desactivado)"}`);
  lines.push(`• historial F-YYYYMM-XXX${FLAGS.HISTORIAL ? "" : " (desactivado)"}`);
  lines.push("• folios de planta");
  lines.push("• folios urgentes de planta");
  lines.push("• folios de pipa");
  lines.push("• mis pendientes / pendientes [página]");
  lines.push("• comentario F-YYYYMM-XXX: <texto>");
  if (FLAGS.ATTACHMENTS) {
    lines.push("• adjuntar F-YYYYMM-XXX (luego envía el PDF)");
    lines.push("• archivos 045 / F-YYYYMM-XXX (lista archivos del folio)");
    lines.push("• ver cotizacion 045 (última aprobada)");
    lines.push("• ver archivo <id> (URL firmada 10 min)");
    lines.push("• reemplazar cotizacion 045 (reemplazo controlado)");
  }
  if (FLAGS.APPROVALS) {
    if (clave === "GG") lines.push("• aprobar F-YYYYMM-XXX (aprobación planta)");
    if (clave === "ZP") {
      lines.push("• aprobar 001 002 o F-YYYYMM-XXX (ZP; varios en un mensaje)");
      lines.push("• aprobar_override F-YYYYMM-XXX motivo: <texto>");
      lines.push("• autorizar cancelacion F-YYYYMM-XXX");
      lines.push("• rechazar cancelacion F-YYYYMM-XXX motivo: <texto>");
    }
    if (clave === "CDMX") {
      lines.push("• seleccionar F-YYYYMM-XXX (selección para semana)");
      lines.push("• aprobar cotizacion <id>");
      lines.push("• rechazar cotizacion <id> motivo: <texto>");
    }
    if (["GA", "GG", "CDMX"].includes(clave)) lines.push("• cancelar F-YYYYMM-XXX motivo: <texto>");
  }
  lines.push("• crear proyecto");
  lines.push("• proyectos de planta");
  lines.push("• estatus proyecto PRJ-YYYYMM-XXX");
  lines.push("• adjuntar proyecto PRJ-... (luego envía PDF)");
  if (clave === "ZP") {
    lines.push("• aprobar proyecto PRJ-...");
    lines.push("• cerrar proyecto PRJ-...");
    lines.push("• confirmar cancelacion proyecto PRJ-...");
  }
  lines.push("• cancelar proyecto PRJ-... (solicitar)");
  if (clave === "ZP") {
    lines.push("• debug twilio (diagnóstico outbound)");
    lines.push("• probar notificacion (envío de prueba)");
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

/**
 * Catálogo de estaciones por planta (nombre "bonito" para mostrar; guardar en DB normalizado).
 * Pruebas manuales sugeridas:
 * 1) GA crea folio → planta Puebla → categoría GASTOS → subcategoría Estaciones → pedir estación (lista Puebla) → elegir 2 → prioridad → confirmar → DB tiene estacion.
 * 2) ZP crea folio → planta Acapulco → subcategoría Estaciones → pedir estación (lista grande) → elegir X.
 * 3) Planta sin catálogo → permitir manual con doble confirmación (SI/NO).
 * 4) Subcategoría distinta de Estaciones → no aparece paso estación.
 */
const ESTACIONES_POR_PLANTA = {
  Puebla: ["NANACAMILPA", "CHACHAPA", "MAGDALENA", "METEPEC"],
  Morelos: ["IGUALA", "YAUTEPEC", "COATETELCO"],
  Querétaro: ["5 DE FEBRERO", "OPALOS", "LOBO", "PEDRO ESCOBEDO"],
  "San Luis Potosí": ["VILLA ARISTA", "VILLA HIDALGO", "RAYÓN"],
  Tehuacan: ["TEOTITLÁN"],
  Acapulco: [
    "ORGANOS", "OMETEPEC", "PETAQUILLAS", "PIE DE LA CUESTA", "PINOS", "RACELGAS", "SABANA", "TEXCA", "VACACIONAL", "ZAPATA",
    "20 DE NOVIEMBRE", "BOULEVARD", "CRUZ GRANDE", "LIBERTAD", "LIBERTADORES", "MANGOS", "PEDREGOSO", "RETORNO", "SAN AGUSTIN",
    "SAN LUIS ACATLAN", "SAN MARCOS", "TECOANAPA", "TOLVA", "VENTA", "COLOSO", "COLOSIO", "CNC", "RENACIMIENTO", "COLOSIO 2",
    "CONSTITUYENTES", "PALMAR", "BONFIL", "LLANO LARGO", "RUIZ CORTINEZ", "ZAPAGAS",
  ],
};

/** Normaliza nombre de estación para guardar en DB: uppercase, trim, colapsar espacios. */
function normalizeEstacionNombre(text) {
  return String(text || "").trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Devuelve lista de estaciones para una planta (por nombre de planta desde sess/DB).
 * Mapea nombre de planta a llave del catálogo (case-insensitive, sin acentos opcional).
 */
function getEstacionesByPlanta(plantaNombre) {
  if (!plantaNombre) return null;
  const name = String(plantaNombre).trim();
  const keys = Object.keys(ESTACIONES_POR_PLANTA);
  const nameNorm = name.toLowerCase().normalize("NFD").replace(/\u0300-\u036f/g, "");
  for (const key of keys) {
    const keyNorm = key.toLowerCase().normalize("NFD").replace(/\u0300-\u036f/g, "");
    if (keyNorm === nameNorm || key.toLowerCase() === name.toLowerCase()) return ESTACIONES_POR_PLANTA[key];
    if (keyNorm.includes(nameNorm) || nameNorm.includes(keyNorm)) return ESTACIONES_POR_PLANTA[key];
  }
  return null;
}

/* ==================== SESIONES ==================== */

const sessions = new Map();

function getSession(from) {
  if (!sessions.has(from)) {
    sessions.set(from, {
      estado: "IDLE",
      dd: {},
      lastFolioNumero: null,
      lastFolioId: null,
      draftProyecto: {},
      estadoProyecto: null,
      pendingProjectAttach: null,
      pendingCotizacion: null,
      pendingReemplazo: null,
    });
  }
  const s = sessions.get(from);
  if (s.draftProyecto === undefined) s.draftProyecto = {};
  if (s.estadoProyecto === undefined) s.estadoProyecto = null;
  if (s.pendingProjectAttach === undefined) s.pendingProjectAttach = null;
  if (s.pendingCotizacion === undefined) s.pendingCotizacion = null;
  if (s.pendingReemplazo === undefined) s.pendingReemplazo = null;
  return s;
}

function resetSession(sess) {
  sess.estado = "IDLE";
  sess.dd = {};
  sess.draftProyecto = {};
  sess.estadoProyecto = null;
  sess.pendingProjectAttach = null;
  sess.pendingCotizacion = null;
  sess.pendingReemplazo = null;
}

/* ==================== NOTIFICACIONES WHATSAPP ==================== */

/** Envío outbound WhatsApp. Usa módulo notifications/twilioClient con logs y resultado estructurado. Retorna { ok, error?, sid?, status? }. */
async function sendWhatsApp(toPhone, body, meta = {}) {
  const debug = twilioNotify.getTwilioDebugInfo();
  if (!twilioClient || !twilioWhatsAppFrom) {
    const detail = debug.missing && debug.missing.length ? ` Faltan: ${debug.missing.join(", ")}.` : "";
    console.warn("[NOTIFY] Twilio no configurado." + detail);
    return { ok: false, error: "Twilio no configurado." + detail };
  }
  const to = normalizePhoneForWhatsApp(toPhone);
  if (!to) {
    return { ok: false, error: "Teléfono inválido o no normalizable" };
  }
  const from = twilioWhatsAppFrom.startsWith("whatsapp:") ? twilioWhatsAppFrom : `whatsapp:${twilioWhatsAppFrom}`;
  const result = await twilioNotify.sendWhatsApp({
    client: twilioClient,
    from,
    to,
    body,
    meta: { correlationId: meta.correlationId || twilioNotify.shortId(), event: meta.event },
  });
  if (result.ok) return { ok: true, sid: result.sid, status: result.status };
  return { ok: false, error: result.errorMessage || result.errorCode || "Error desconocido" };
}

async function notifyOnApprove(folio, aprobadoPor) {
  console.log(`[notifyOnApprove] ENTRADA folio=${folio && folio.numero_folio} planta_id=${folio && folio.planta_id}`);
  if (!folio || !folio.planta_id) {
    console.warn("[notifyOnApprove] Sin planta_id en folio, no se notifica.");
    return;
  }
  const client = await pool.connect();
  try {
    const phones = await getUsersToNotifyOnApprove(client, folio.planta_id);
    const toNotify = phones.filter((p) => p && !samePhone(p, aprobadoPor));
    console.log(`[notifyOnApprove] Folio ${folio.numero_folio} planta_id=${folio.planta_id} → ${phones.length} teléfonos, ${toNotify.length} a notificar (excl. aprobador por últimos 10 dígitos).`);
    if (toNotify.length === 0) return;

    const urgPrefix = (folio.prioridad === "Urgente no programado") ? "🔴💡 URGENTE | " : "";
    let msg = `${urgPrefix}Folio ${folio.numero_folio} aprobado por ${aprobadoPor}.\n`;
    msg += `Concepto: ${folio.concepto || "-"}\nImporte: $${folio.importe || "-"}`;
    if (!folio.cotizacion_url) msg += "\n⚠️ Aún no tiene la cotización adjunta.";

    for (const phone of toNotify) {
      const result = await sendWhatsApp(phone, msg, { event: "notifyOnApprove" });
      const last4 = (phone && String(phone).replace(/\D/g, "").slice(-4)) || "????";
      const telMask = `***${last4}`;
      if (result.ok) {
        console.log(`[notifyOnApprove] Enviado a ${telMask} → ok sid=${result.sid || "-"} status=${result.status || "-"}`);
      } else {
        console.warn(`[notifyOnApprove] Enviado a ${telMask} → ERROR: ${result.error || "unknown"}`);
      }
    }
  } catch (e) {
    console.warn("notifyOnApprove error:", e.message);
    throw e;
  } finally {
    client.release();
  }
}

/** Notifica a todos los CDMX que hay una cotización PENDIENTE de aprobación. prioridad con "urgente" o "alta" → encabezado urgente. */
async function notifyCDMXPendienteCotizacion(client, folio, archivoId, subidoPor, esReemplazo = false) {
  const cdmxList = await getUsersByRole(client, "CDMX");
  if (!cdmxList || cdmxList.length === 0) {
    console.warn("[CDMX NOTIFY] No hay usuarios CDMX para notificar.");
    return;
  }
  const prioridad = String(folio.prioridad || "").toLowerCase();
  const urgente = prioridad.includes("urgente") || prioridad.includes("alta");
  let msg = urgente ? "🚨 URGENTE / PRIORIDAD ALTA — APROBACIÓN REQUERIDA CDMX\n\n" : "";
  msg += `Folio: ${folio.numero_folio}\n`;
  msg += `Planta: ${folio.planta_nombre || "-"}\n`;
  msg += `Concepto: ${folio.concepto || "-"}\n`;
  msg += `Importe: $${folio.importe != null ? Number(folio.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-"}\n`;
  msg += `ArchivoID: ${archivoId}\n`;
  msg += `Subido por: ${subidoPor || "-"}\n`;
  if (esReemplazo) msg += `(Reemplazo de cotización anterior)\n`;
  msg += `\nComandos:\naprobar cotizacion ${archivoId}\nrechazar cotizacion ${archivoId} motivo: ...`;
  console.log("[CDMX NOTIFY] Enviando a", cdmxList.length, "CDMX. ArchivoID:", archivoId);
  for (const u of cdmxList) {
    if (u && u.telefono) await sendWhatsApp(u.telefono, msg, { event: "cdmx_cotizacion_pendiente" });
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

app.get("/health-proyectos", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT estatus, COUNT(*) AS cnt FROM public.proyectos GROUP BY estatus ORDER BY estatus`
    );
    const porEstatus = (r.rows || []).reduce((acc, row) => {
      acc[row.estatus] = parseInt(row.cnt, 10);
      return acc;
    }, {});
    res.json({ ok: true, proyectos_por_estatus: porEstatus, hora: new Date().toISOString() });
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

      if (/^CONFIRMO\s+/i.test(body.trim())) {
        const hasCotizacion = sess.pendingCotizacion && sess.pendingCotizacion.waitingConfirm;
        const hasReemplazo = sess.pendingReemplazo && sess.pendingReemplazo.waitingConfirm;
        if (!hasCotizacion && !hasReemplazo) {
          console.log("[CONFIRMACION] Sin proceso pendiente.");
          return safeReply("No hay proceso pendiente.");
        }
      }

      if (sess.pendingCotizacion && sess.pendingCotizacion.waitingImporte) {
        const pend = sess.pendingCotizacion;
        const folioImporte = pend.folio && pend.folio.importe != null ? Number(pend.folio.importe) : null;
        const capturado = parseMoney(body);
        if (capturado == null) {
          return safeReply("Escribe solo el importe numérico (ej: 1500 o 1,500.50).");
        }
        const diff = folioImporte != null ? Math.abs(capturado - folioImporte) : 0;
        if (folioImporte == null || diff > 0.01) {
          try {
            await insertHistorial(client, pend.folio_id, pend.numero_folio, pend.numero_folio, pend.folio.estatus || "", "Intento de cotización con importe incorrecto", fromNorm, actor ? actor.rol_nombre : null);
          } catch (e) {
            console.warn("Historial importe incorrecto:", e.message);
          }
          console.log("[VALIDACION] Importe no coincide. Folio:", folioImporte, "Capturado:", capturado);
          const msg = `❌ El importe no coincide.\nFolio: $${folioImporte != null ? folioImporte.toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-"}\nCapturado: $${capturado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\nOperación cancelada.`;
          sess.pendingCotizacion = null;
          return safeReply(msg);
        }
        pend.waitingImporte = false;
        pend.waitingConfirm = true;
        pend.importeValidado = capturado;
        console.log("[VALIDACION] Importe OK:", capturado);
        let resumen = "Resumen:\n";
        resumen += `Folio: ${pend.numero_folio}\n`;
        resumen += `Importe validado: $${capturado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
        resumen += `Archivo: ${pend.file_name || "PDF"}\n`;
        resumen += `Tamaño: ${pend.file_size_bytes != null ? (pend.file_size_bytes / 1024).toFixed(1) + " KB" : "-"}\n`;
        resumen += `Tipo: COTIZACION\n\n`;
        resumen += "Responde exactamente: CONFIRMO COTIZACION";
        return safeReply(resumen);
      }

      if (sess.pendingReemplazo && sess.pendingReemplazo.waitingImporte) {
        const pend = sess.pendingReemplazo;
        const folioImporte = pend.folio && pend.folio.importe != null ? Number(pend.folio.importe) : null;
        const capturado = parseMoney(body);
        if (capturado == null) {
          return safeReply("Escribe solo el importe numérico (ej: 1500 o 1,500.50).");
        }
        const diff = folioImporte != null ? Math.abs(capturado - folioImporte) : 0;
        if (folioImporte == null || diff > 0.01) {
          try {
            await insertHistorial(client, pend.folio_id, pend.numero_folio, pend.numero_folio, pend.folio.estatus || "", "Intento de cotización con importe incorrecto (reemplazo)", fromNorm, actor ? actor.rol_nombre : null);
          } catch (e) {
            console.warn("Historial importe incorrecto:", e.message);
          }
          console.log("[VALIDACION] Reemplazo importe no coincide.");
          const msg = `❌ El importe no coincide.\nFolio: $${folioImporte != null ? folioImporte.toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-"}\nCapturado: $${capturado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\nOperación cancelada.`;
          sess.pendingReemplazo = null;
          return safeReply(msg);
        }
        pend.waitingImporte = false;
        pend.waitingConfirm = true;
        pend.importeValidado = capturado;
        console.log("[VALIDACION] Reemplazo importe OK:", capturado);
        let resumen = "Resumen (reemplazo):\n";
        resumen += `Folio: ${pend.numero_folio}\n`;
        resumen += `Importe validado: $${capturado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
        resumen += `Archivo: ${pend.file_name || "PDF"}\n`;
        resumen += `Reemplaza ID: ${pend.replace_of_id}\n\n`;
        resumen += "Responde exactamente: CONFIRMO REEMPLAZO";
        return safeReply(resumen);
      }

      if (sess.pendingCotizacion && sess.pendingCotizacion.waitingConfirm && body.trim() === "CONFIRMO COTIZACION") {
        const pend = sess.pendingCotizacion;
        try {
          const row = await insertFolioArchivo(client, {
            folio_id: pend.folio_id,
            numero_folio: pend.numero_folio,
            tipo: "COTIZACION",
            s3_key: pend.s3_key,
            url: pend.url,
            file_name: pend.file_name,
            file_size_bytes: pend.file_size_bytes,
            sha256: pend.sha256,
            subido_por: pend.subido_por || fromNorm,
          });
          await insertHistorial(client, pend.folio_id, pend.numero_folio, pend.numero_folio, pend.folio.estatus || "", "Cotización PDF registrada (pendiente aprobación CDMX)", fromNorm, actor ? actor.rol_nombre : null);
          console.log("[CONFIRMACION] Cotización registrada. ArchivoID:", row.id);
          const folioConPlanta = { ...pend.folio, planta_nombre: pend.folio.planta_nombre };
          setImmediate(() => {
            pool.connect().then((c) => {
              notifyCDMXPendienteCotizacion(c, folioConPlanta, row.id, pend.subido_por || fromNorm, false).finally(() => c.release());
            }).catch((e) => console.warn("notifyCDMXPendienteCotizacion:", e.message));
          });
          sess.pendingCotizacion = null;
          return safeReply(`✅ Cotización registrada (ArchivoID: ${row.id}). Pendiente de aprobación CDMX.`);
        } catch (e) {
          console.error("insertFolioArchivo:", e);
          return safeReply("Error al registrar. Intenta de nuevo.");
        }
      }

      if (sess.pendingReemplazo && sess.pendingReemplazo.waitingConfirm && body.trim() === "CONFIRMO REEMPLAZO") {
        const pend = sess.pendingReemplazo;
        try {
          const row = await insertFolioArchivo(client, {
            folio_id: pend.folio_id,
            numero_folio: pend.numero_folio,
            tipo: "COTIZACION",
            s3_key: pend.s3_key,
            url: pend.url,
            file_name: pend.file_name,
            file_size_bytes: pend.file_size_bytes,
            sha256: pend.sha256,
            replace_of_id: pend.replace_of_id,
            subido_por: pend.subido_por || fromNorm,
          });
          await insertHistorial(client, pend.folio_id, pend.numero_folio, pend.numero_folio, pend.folio.estatus || "", "Reemplazo de cotización registrado (pendiente aprobación CDMX)", fromNorm, actor ? actor.rol_nombre : null);
          console.log("[REEMPLAZO] Registrado. ArchivoID:", row.id);
          const folioConPlanta = { ...pend.folio, planta_nombre: pend.folio.planta_nombre };
          setImmediate(() => {
            pool.connect().then((c) => {
              notifyCDMXPendienteCotizacion(c, folioConPlanta, row.id, pend.subido_por || fromNorm, true).finally(() => c.release());
            }).catch((e) => console.warn("notifyCDMXPendienteCotizacion:", e.message));
          });
          sess.pendingReemplazo = null;
          return safeReply(`✅ Reemplazo registrado (ArchivoID: ${row.id}). Pendiente de aprobación CDMX.`);
        } catch (e) {
          console.error("insertFolioArchivo reemplazo:", e);
          return safeReply("Error al registrar. Intenta de nuevo.");
        }
      }

      const rolClave = (actor && actor.rol_clave) ? String(actor.rol_clave).toUpperCase() : "";
      const esZP = rolClave === "ZP" || (actor && actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre));

      if (/^(debug\s+twilio|debug twilio)$/i.test(body.trim())) {
        if (!esZP) return safeReply("Solo Director ZP puede usar: debug twilio");
        const info = twilioNotify.getTwilioDebugInfo();
        let msg = "DEBUG TWILIO (sin secretos)\n";
        msg += `Account SID: ${info.hasAccountSid ? "✓ definido" : "✗ falta"}\n`;
        msg += `Auth Token: ${info.hasAuthToken ? "✓ definido" : "✗ falta"}\n`;
        msg += `FROM (TWILIO_WHATSAPP_NUMBER): ${info.fromDisplay}\n`;
        msg += `Cliente OK: ${info.clientOk ? "Sí" : "No"}\n`;
        msg += `— ${info.message}`;
        console.log("[debug twilio]", JSON.stringify({ hasAccountSid: info.hasAccountSid, hasAuthToken: info.hasAuthToken, fromDisplay: info.fromDisplay }));
        return safeReply(msg);
      }

      if (/^(probar\s+notificacion|probar notificacion|test\s+notify|test notify)$/i.test(body.trim())) {
        if (!esZP) return safeReply("Solo Director ZP puede usar: probar notificacion");
        const debug = twilioNotify.getTwilioDebugInfo();
        if (!debug.clientOk || !twilioWhatsAppFrom) {
          return safeReply(`No se puede probar: ${debug.message}`);
        }
        const r = await client.query(
          `SELECT u.telefono, u.nombre, r.nombre AS rol FROM public.usuarios u LEFT JOIN public.roles r ON r.id = u.rol_id WHERE TRIM(COALESCE(u.telefono,'')) <> '' ORDER BY u.id LIMIT 5`
        );
        const recipients = (r.rows || []).map((row) => ({ telefono: row.telefono, nombre: row.nombre || "-", rol: row.rol || "-" }));
        if (recipients.length === 0) return safeReply("No hay destinatarios en DB (usuarios con teléfono). Agrega al menos uno para probar.");
        const testBody = `[Prueba notificación] ${new Date().toISOString()} — Si recibes esto, el outbound funciona.`;
        const lines = [];
        for (const rec of recipients) {
          const result = await sendWhatsApp(rec.telefono, testBody, { event: "test_notify" });
          const toDisplay = rec.telefono.replace(/\d{4}$/, "****");
          if (result.ok) lines.push(`${toDisplay} (${rec.nombre}) → OK sid=${result.sid || "-"} status=${result.status || "-"}`);
          else lines.push(`${toDisplay} (${rec.nombre}) → ERROR ${result.error || "unknown"}`);
        }
        return safeReply("REPORTE PRUEBA NOTIFICACIÓN\n\n" + lines.join("\n"));
      }

      const matchPendientes = body.trim().match(/^(mis\s+pendientes|pendientes)(\s+(\d+))?$/i);
      if (matchPendientes) {
        if (!actor) {
          return safeReply("No estás dado de alta. Contacta al administrador para registrar tu número en el sistema.");
        }
        const page = matchPendientes[3] ? parseInt(matchPendientes[3], 10) : 1;
        const pageSize = 20;
        const rolClave = (actor.rol_clave && String(actor.rol_clave).toUpperCase()) || "";
        const esCorporativo = rolClave === "ZP" || rolClave === "CDMX" || (actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre));
        try {
          const data = esCorporativo
            ? await getPendientesForUser(client, from, 1, 500, { corporativo: true })
            : await getPendientesForUser(client, from, page, pageSize);
          if (!data) {
            return safeReply("No estás dado de alta. Contacta al administrador para registrar tu número.");
          }
          console.log(`[Pendientes] Actor: ${actor.rol_nombre || rolClave || "?"} (${fromNorm})`);
          console.log(`[Pendientes] Total encontrados: ${data.totalCount}`);
          if (data.totalCount === 0) {
            return safeReply("✅ No tienes pendientes.");
          }
          const fmtMxn = (n) => (Number(n) != null && !isNaN(Number(n)) ? Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00");
          const truncConcepto = (s, max = 70) => {
            const t = String(s || "").trim();
            if (!t) return "";
            if (t.length <= max) return t;
            const cut = t.substring(0, max);
            const lastSpace = cut.lastIndexOf(" ");
            const pos = lastSpace > 40 ? lastSpace : max;
            return t.substring(0, pos).trim() + "…";
          };
          const fmtFecha = (d) => {
            if (!d) return "";
            const dt = new Date(d);
            const day = dt.getDate();
            const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            return `${day} ${months[dt.getMonth()]}`;
          };
          const esUrgente = (r) => r.prioridad && (String(r.prioridad).toLowerCase().includes("urgente") || String(r.prioridad).toLowerCase().includes("alta"));
          const shortNum = (r) => (r.numero_folio || "").replace(/^F-\d{6}-/, "") || (r.numero_folio || "");

          let out = "📌 MIS PENDIENTES\n\n";
          if (data.corporativo && data.rows.length > 0) {
            const byPlanta = {};
            for (const r of data.rows) {
              const p = (r.planta_nombre || "Sin planta").trim();
              if (!byPlanta[p]) byPlanta[p] = [];
              byPlanta[p].push(r);
            }
            const plantasOrden = Object.keys(byPlanta).sort();
            console.log(`[Pendientes] Plantas involucradas: ${plantasOrden.join(", ")}`);
            for (const nombrePlanta of plantasOrden) {
              const filas = byPlanta[nombrePlanta];
              out += `🏭 ${nombrePlanta}\n`;
              out += "-------------------\n";
              for (const r of filas) {
                const urg = esUrgente(r) ? "🔴 " : "⚪ ";
                out += `${urg}${shortNum(r)} | $${fmtMxn(r.importe)}\n`;
                out += `Concepto: ${truncConcepto(r.concepto, 60)}\n`;
                out += `Estado: ${r.estatus || "—"}\n`;
                out += `Fecha: ${fmtFecha(r.fecha_base)}\n\n`;
              }
              out += `Total ${nombrePlanta}: ${filas.length} folio${filas.length !== 1 ? "s" : ""}\n\n`;
            }
          } else {
            for (const r of data.rows) {
              const urg = esUrgente(r) ? "🔴 " : "⚪ ";
              const plantaNombreRow = data.plantaInfo.nombre || "—";
              out += `${urg}${shortNum(r)} | ${plantaNombreRow} | $${fmtMxn(r.importe)}\n`;
              out += `Concepto: ${truncConcepto(r.concepto, 60)}\n`;
              out += `Estado: ${r.estatus || "—"}\n`;
              out += `Fecha: ${fmtFecha(r.fecha_base)}\n\n`;
            }
            if (page < data.totalPages) out += `Página ${page}/${data.totalPages}. Responde "mis pendientes ${page + 1}" para ver más.\n\n`;
          }

          out += "-------------------\n";
          out += `Total urgentes: ${data.urgentesCount}\n`;
          out += `Total pendientes: ${data.totalCount}`;

          if (out.length > 3500) {
            out = out.substring(0, 3400) + "\n\n... (mensaje recortado por límite de WhatsApp)";
          }
          console.log(`[Pendientes] chars=${out.length}`);
          return safeReply(out);
        } catch (e) {
          console.warn("getPendientesForUser error:", e.message);
          return safeReply("Error al cargar pendientes. Intenta más tarde.");
        }
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

      if (lower === "folios de pipa") {
        const rolClave = (actor && actor.rol_clave) ? String(actor.rol_clave).toUpperCase() : "";
        const rolNombre = (actor && actor.rol_nombre) ? String(actor.rol_nombre).toUpperCase() : "";
        const needsPlanta = ["CDMX", "ZP"].includes(rolClave) || /CDMX|ZP|ASISTENTE/.test(rolNombre);
        console.log(`[PIPA] start from=${fromNorm} role=${rolNombre || rolClave} needsPlanta=${needsPlanta}`);
        sess.dd.intent = "PIPA_FOLIOS";
        if (needsPlanta) {
          const plantas = await getPlantas(client);
          sess.dd.step = "PLANTA";
          sess.dd._plantasList = plantas;
          if (!plantas.length) return safeReply("No hay plantas en catálogo.");
          const list = plantas.map((p, i) => `${i + 1}) ${p.nombre}`).join("\n");
          return safeReply("¿De qué planta?\n" + list + "\n\nResponde con el número o nombre.");
        }
        const plantaId = actor && actor.planta_id != null ? actor.planta_id : null;
        if (!actor) return safeReply("No estás dado de alta. Contacta al administrador.");
        sess.dd.planta_id = plantaId;
        sess.dd.step = "OPCION";
        sess.dd._plantasList = null;
        return safeReply(
          "FOLIOS DE PIPA\n\n1) Folios en proceso\n2) Folios cancelados\n\nResponde con el número."
        );
      }

      if (lower === "crear proyecto") {
        sess.estadoProyecto = "CREAR_PROYECTO_PLANTA";
        sess.draftProyecto = { actor_telefono: fromNorm, actor_rol: actor ? actor.rol_nombre : null };
        const plantas = await getPlantas(client);
        sess.draftProyecto._plantasList = plantas;
        if (!plantas.length) return safeReply("No hay plantas en catálogo. Indica el nombre de la planta.");
        const list = plantas.map((p, i) => `${i + 1}) ${p.nombre}`).join("\n");
        return safeReply("Crear proyecto.\n1) Indica PLANTA (responde con el número):\n" + list);
      }

      if (sess.estadoProyecto && sess.estadoProyecto.startsWith("CREAR_PROYECTO")) {
        const dp = sess.draftProyecto || {};
        const plantas = dp._plantasList || [];

        if (sess.estadoProyecto === "CREAR_PROYECTO_PLANTA") {
          const num = parseInt(body.trim(), 10);
          let plantaId = null;
          let plantaNombre = "";
          if (Number.isFinite(num) && num >= 1 && num <= plantas.length) {
            plantaId = plantas[num - 1].id;
            plantaNombre = plantas[num - 1].nombre;
          } else {
            const byName = plantas.find((p) => (p.nombre || "").toLowerCase() === body.trim().toLowerCase());
            if (byName) {
              plantaId = byName.id;
              plantaNombre = byName.nombre;
            }
          }
          if (!plantaId) return safeReply("Responde con el número o nombre de planta.");
          dp.planta_id = plantaId;
          dp.planta_nombre = plantaNombre;
          sess.estadoProyecto = "CREAR_PROYECTO_NOMBRE";
          return safeReply("2) Indica NOMBRE del proyecto.");
        }

        if (sess.estadoProyecto === "CREAR_PROYECTO_NOMBRE") {
          if (body.length < 2) return safeReply("Nombre muy corto. Indica el nombre del proyecto.");
          dp.nombre = body.trim();
          sess.estadoProyecto = "CREAR_PROYECTO_DESCRIPCION";
          return safeReply("3) Descripción breve (opcional). Responde con el texto o escribe - para omitir.");
        }

        if (sess.estadoProyecto === "CREAR_PROYECTO_DESCRIPCION") {
          dp.descripcion = body.trim() === "-" || body.trim() === "" ? null : body.trim();
          sess.estadoProyecto = "CREAR_PROYECTO_FECHA_INICIO";
          return safeReply("4) Fecha de inicio (DD/MM/AAAA) o escribe HOY para usar hoy.");
        }

        if (sess.estadoProyecto === "CREAR_PROYECTO_FECHA_INICIO") {
          let fechaInicio = null;
          if (/^hoy$/i.test(body.trim())) {
            const now = new Date();
            fechaInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          } else {
            const m = body.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (m) fechaInicio = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
          }
          if (!fechaInicio) return safeReply("Formato: DD/MM/AAAA o escribe HOY.");
          dp.fecha_inicio = fechaInicio;
          sess.estadoProyecto = "CREAR_PROYECTO_FECHA_CIERRE";
          return safeReply("5) Fecha de cierre estimada (DD/MM/AAAA) o - para omitir.");
        }

        if (sess.estadoProyecto === "CREAR_PROYECTO_FECHA_CIERRE") {
          if (body.trim() !== "-") {
            const m = body.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (m) dp.fecha_cierre_estimada = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
          }
          sess.estadoProyecto = "CREAR_PROYECTO_PDFS";
          return safeReply("6) ¿Tienen PDFs para adjuntar (planos/cotizaciones)? 1) Sí 2) No");
        }

        if (sess.estadoProyecto === "CREAR_PROYECTO_PDFS") {
          const tienePdfs = /^1$|^s[ií]$|^si$/i.test(body.trim());
          dp.tiene_pdfs = tienePdfs;
          try {
            const proy = await crearProyecto(client, {
              planta_id: dp.planta_id,
              nombre: dp.nombre,
              descripcion: dp.descripcion,
              fecha_inicio: dp.fecha_inicio,
              fecha_cierre_estimada: dp.fecha_cierre_estimada || null,
              creado_por: dp.actor_telefono || fromNorm,
              actor_rol: dp.actor_rol,
            });
            sess.estadoProyecto = null;
            sess.draftProyecto = {};
            const msg = `✅ Proyecto creado: ${proy.codigo}\nPlanta: ${dp.planta_nombre}\nNombre: ${proy.nombre}\n\nPendiente de autorización por Dirección ZP.`;
            try {
              const zpList = await getUsersByRole(client, "ZP");
              const notif = `📋 Nuevo proyecto pendiente de autorizar.\nCódigo: ${proy.codigo}\nPlanta: ${dp.planta_nombre}\nNombre: ${proy.nombre}\n${tienePdfs ? "Tiene PDFs por adjuntar." : "Sin PDFs indicados."}\n\nResponde: aprobar proyecto ${proy.codigo}`;
              for (const u of zpList) {
                if (u.telefono) await sendWhatsApp(u.telefono, notif);
              }
            } catch (e) {
              console.warn("Notif ZP proyecto:", e.message);
            }
            return safeReply(msg);
          } catch (e) {
            console.error("Error crear proyecto:", e);
            return safeReply("Error al guardar el proyecto. Intenta de nuevo.");
          }
        }
      }

      if (lower === "proyectos de planta") {
        const plantas = await getPlantas(client);
        sess.dd.intent = "LISTA_PROYECTOS_PLANTA";
        sess.dd.esperando = "PLANTA";
        sess.dd._plantasList = plantas;
        if (!plantas.length) return safeReply("No hay plantas en catálogo.");
        const list = plantas.map((p, i) => `${i + 1}) ${p.nombre}`).join("\n");
        return safeReply("¿Qué planta?\n" + list + "\n\nResponde con el número o nombre.");
      }

      if (sess.dd.intent === "LISTA_PROYECTOS_PLANTA" && sess.dd.esperando === "PLANTA") {
        const plantas = sess.dd._plantasList || [];
        let plantaId = null;
        let plantaNombre = "";
        const num = parseInt(body.trim(), 10);
        if (Number.isFinite(num) && num >= 1 && num <= plantas.length) {
          plantaId = plantas[num - 1].id;
          plantaNombre = plantas[num - 1].nombre;
        } else {
          const byName = plantas.find((p) => (p.nombre || "").toLowerCase() === body.trim().toLowerCase());
          if (byName) {
            plantaId = byName.id;
            plantaNombre = byName.nombre;
          }
        }
        sess.dd.intent = null;
        sess.dd.esperando = null;
        sess.dd._plantasList = null;
        if (!plantaId) return safeReply("Planta no reconocida. Escribe: proyectos de planta");
        const proyectos = await listarProyectosPorPlantaConTotales(client, plantaId);
        if (!proyectos.length) return safeReply(`No hay proyectos EN_CURSO en ${plantaNombre}.`);
        let txt = `PROYECTOS - ${plantaNombre.toUpperCase()}\n`;
        let totalMonto = 0;
        let totalUrgentes = 0;
        proyectos.forEach((p, i) => {
          const fecIni = p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-MX") : "-";
          const fecCierre = p.fecha_cierre_estimada ? new Date(p.fecha_cierre_estimada).toLocaleDateString("es-MX") : "-";
          const monto = Number(p.total_monto) || 0;
          totalMonto += monto;
          totalUrgentes += Number(p.total_urgentes) || 0;
          txt += `${i + 1}) ${p.codigo} | ${p.nombre} | ${fecIni} | cierre est. ${fecCierre}\n   Folios: ${p.total_folios} | $${monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
        });
        txt += `\nTotal proyectos: ${proyectos.length}\nTotal monto: $${totalMonto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\nTotal urgentes: $${totalUrgentes.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
        if (txt.length > MAX_WHATSAPP_BODY) txt = txt.substring(0, MAX_WHATSAPP_BODY - 20) + "\n...(recortado)";
        return safeReply(txt.trim());
      }

      if (/^estatus\s+proyecto\s+/i.test(body)) {
        const rest = body.replace(/^estatus\s+proyecto\s+/i, "").trim();
        if (!rest) return safeReply("Indica el código. Ejemplo: estatus proyecto PRJ-202602-001");
        const codigo = await resolveProyectoCodigo(client, rest);
        if (!codigo) return safeReply("Código de proyecto inválido. Use PRJ-YYYYMM-XXX o número corto (ej. 001).");
        const proy = await getProyectoByCodigo(client, codigo);
        if (!proy) return safeReply(`No existe el proyecto ${codigo}.`);
        const archivos = await getArchivosProyecto(client, proy.id);
        const totales = await getTotalesFoliosProyecto(client, proy.id);
        const foliosRecientes = await getFoliosByProyecto(client, proy.id, 5);
        const fecIni = proy.fecha_inicio ? new Date(proy.fecha_inicio).toLocaleDateString("es-MX") : "-";
        const fecCierreEst = proy.fecha_cierre_estimada ? new Date(proy.fecha_cierre_estimada).toLocaleDateString("es-MX") : "-";
        const fecCierreReal = proy.fecha_cierre_real ? formatMexicoCentral(proy.fecha_cierre_real) : "-";
        let txt = `PROYECTO ${proy.codigo}\nPlanta: ${proy.planta_nombre || "-"}\nNombre: ${proy.nombre}\nEstatus: ${proy.estatus}\n`;
        txt += `Inicio: ${fecIni} | Cierre est.: ${fecCierreEst} | Cierre real: ${fecCierreReal}\n`;
        txt += `Aprobado ZP: ${proy.aprobado_zp ? "Sí" : "No"}${proy.aprobado_por ? " por " + proy.aprobado_por : ""}\n`;
        txt += `Creado por: ${proy.creado_por || "-"} | ${formatMexicoCentral(proy.creado_en)}\n`;
        if (archivos.length) {
          txt += "\nPDFs:\n";
          archivos.slice(0, 10).forEach((a) => {
            txt += `  ${a.tipo} | ${formatMexicoCentral(a.subido_en)}\n`;
          });
        }
        txt += `\nFolios ligados: ${totales.cantidad} | Suma: $${totales.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
        if (foliosRecientes.length) {
          txt += "\nÚltimos: " + foliosRecientes.map((f) => f.numero_folio).join(", ");
        }
        if (txt.length > MAX_WHATSAPP_BODY) txt = txt.substring(0, MAX_WHATSAPP_BODY - 20) + "\n...(recortado)";
        return safeReply(txt.trim());
      }

      if (/^adjuntar\s+proyecto\s+/i.test(body)) {
        const codigo = body.replace(/^adjuntar\s+proyecto\s+/i, "").trim();
        const codigoNorm = await resolveProyectoCodigo(client, codigo);
        if (!codigoNorm) return safeReply("Formato: adjuntar proyecto PRJ-YYYYMM-XXX. Luego envía el PDF.");
        const proy = await getProyectoByCodigo(client, codigoNorm);
        if (!proy) return safeReply(`No existe el proyecto ${codigoNorm}.`);
        if (proy.estatus !== ESTADOS_PROYECTO.EN_CURSO) return safeReply("Solo se pueden adjuntar PDFs a proyectos EN_CURSO.");
        sess.pendingProjectAttach = { codigo: codigoNorm, proyecto_id: proy.id };
        return safeReply(`Ok. Envía el PDF para el proyecto ${codigoNorm}. Después indicarás si es Plano, Cotización u Otro.`);
      }

      if (/^aprobar\s+proyecto\s+/i.test(body)) {
        const codigo = body.replace(/^aprobar\s+proyecto\s+/i, "").trim();
        const codigoNorm = await resolveProyectoCodigo(client, codigo);
        if (!codigoNorm) return safeReply("Formato: aprobar proyecto PRJ-YYYYMM-XXX");
        const rolClave = (actor && actor.rol_clave) ? String(actor.rol_clave).toUpperCase() : "";
        const esZP = rolClave === "ZP" || (actor && actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre));
        if (!esZP) return safeReply("Solo el Director ZP puede aprobar proyectos.");
        const proy = await getProyectoByCodigo(client, codigoNorm);
        if (!proy) return safeReply(`No existe el proyecto ${codigoNorm}.`);
        if (proy.aprobado_zp) return safeReply(`El proyecto ${codigoNorm} ya estaba aprobado por ZP.`);
        if (proy.estatus !== ESTADOS_PROYECTO.EN_CURSO) return safeReply("Solo se pueden aprobar proyectos EN_CURSO.");
        await updateProyectoAprobadoZP(client, proy.id, fromNorm);
        await insertProyectoHistorial(client, proy.id, "APROBADO_ZP", `Aprobado por ZP: ${fromNorm}`, fromNorm, actor ? actor.rol_nombre : null);
        const archivos = await getArchivosProyecto(client, proy.id);
        const tienePdfs = archivos.length > 0;
        const msg = `✅ Proyecto ${codigoNorm} aprobado por Dirección ZP.${tienePdfs ? " Tiene PDFs adjuntos." : " ⚠️ Sin PDFs adjuntos."}`;
        try {
          const gaGG = await getUsersByRoleAndPlanta(client, "GA", proy.planta_id).catch(() => []);
          const gaGG2 = await getUsersByRoleAndPlanta(client, "GG", proy.planta_id).catch(() => []);
          const cdmx = await getUsersByRole(client, "CDMX").catch(() => []);
          const notif = `Proyecto ${codigoNorm} (${proy.nombre}) aprobado por ZP. Planta: ${proy.planta_nombre}.${tienePdfs ? "" : " Sin PDFs adjuntos."}`;
          for (const u of [...gaGG, ...gaGG2]) {
            if (u && u.telefono) await sendWhatsApp(u.telefono, notif);
          }
          for (const u of cdmx) {
            if (u && u.telefono) await sendWhatsApp(u.telefono, notif);
          }
        } catch (e) {
          console.warn("Notif aprob proyecto:", e.message);
        }
        return safeReply(msg);
      }

      if (/^cerrar\s+proyecto\s+/i.test(body)) {
        const codigo = body.replace(/^cerrar\s+proyecto\s+/i, "").trim();
        const codigoNorm = await resolveProyectoCodigo(client, codigo);
        if (!codigoNorm) return safeReply("Formato: cerrar proyecto PRJ-YYYYMM-XXX");
        const rolClave = (actor && actor.rol_clave) ? String(actor.rol_clave).toUpperCase() : "";
        const esZP = rolClave === "ZP" || (actor && actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre));
        if (!esZP) return safeReply("Solo el Director ZP puede cerrar proyectos.");
        const proy = await getProyectoByCodigo(client, codigoNorm);
        if (!proy) return safeReply(`No existe el proyecto ${codigoNorm}.`);
        if (proy.estatus !== ESTADOS_PROYECTO.EN_CURSO) return safeReply("Solo se pueden cerrar proyectos EN_CURSO.");
        const totales = await getTotalesFoliosProyecto(client, proy.id);
        const foliosNoFinales = await client.query(
          `SELECT COUNT(*) AS c FROM public.folios WHERE proyecto_id = $1 AND (estatus IS NULL OR (UPPER(TRIM(estatus)) NOT IN ('PAGADO','CERRADO','CANCELADO')))`,
          [proy.id]
        );
        const noFinal = parseInt(foliosNoFinales.rows[0].c, 10) || 0;
        if (noFinal > 0) {
          sess.dd.pendingCierreProyecto = { codigo: codigoNorm, proyecto_id: proy.id, proyecto_nombre: proy.nombre };
          return safeReply(`El proyecto tiene ${noFinal} folio(s) que no están PAGADO/CERRADO. ¿Cerrar de todos modos? Responde SÍ o NO.`);
        }
        await updateProyectoCerrado(client, proy.id);
        await insertProyectoHistorial(client, proy.id, "CERRADO", "Proyecto cerrado por ZP", fromNorm, actor ? actor.rol_nombre : null);
        sess.dd.pendingCierreProyecto = null;
        try {
          const gaGG = await getUsersByRoleAndPlanta(client, "GA", proy.planta_id).catch(() => []);
          const gaGG2 = await getUsersByRoleAndPlanta(client, "GG", proy.planta_id).catch(() => []);
          const cdmx = await getUsersByRole(client, "CDMX").catch(() => []);
          const notif = `Proyecto ${codigoNorm} (${proy.nombre}) cerrado. Planta: ${proy.planta_nombre}.`;
          for (const u of [...gaGG, ...gaGG2]) {
            if (u && u.telefono) await sendWhatsApp(u.telefono, notif);
          }
          for (const u of cdmx) {
            if (u && u.telefono) await sendWhatsApp(u.telefono, notif);
          }
        } catch (e) {
          console.warn("Notif cierre proyecto:", e.message);
        }
        return safeReply(`✅ Proyecto ${codigoNorm} cerrado.`);
      }

      if (sess.dd.pendingCierreProyecto && /^(s[ií]|si|no)$/i.test(body.trim())) {
        const pend = sess.dd.pendingCierreProyecto;
        const si = /^s[ií]|si$/i.test(body.trim());
        sess.dd.pendingCierreProyecto = null;
        if (!si) return safeReply("No se cerró el proyecto. Escribe: cerrar proyecto " + pend.codigo + " para intentar de nuevo.");
        const proy = await getProyectoById(client, pend.proyecto_id);
        if (!proy || proy.estatus !== ESTADOS_PROYECTO.EN_CURSO) return safeReply("El proyecto ya no está EN_CURSO.");
        const rolClave = (actor && actor.rol_clave) ? String(actor.rol_clave).toUpperCase() : "";
        const esZP = rolClave === "ZP" || (actor && actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre));
        if (!esZP) return safeReply("Solo ZP puede confirmar el cierre.");
        await updateProyectoCerrado(client, proy.id);
        await insertProyectoHistorial(client, proy.id, "CERRADO", "Proyecto cerrado por ZP (confirmado)", fromNorm, actor ? actor.rol_nombre : null);
        try {
          const gaGG = await getUsersByRoleAndPlanta(client, "GA", proy.planta_id).catch(() => []);
          const gaGG2 = await getUsersByRoleAndPlanta(client, "GG", proy.planta_id).catch(() => []);
          const cdmx = await getUsersByRole(client, "CDMX").catch(() => []);
          const notif = `Proyecto ${proy.codigo} (${proy.nombre}) cerrado. Planta: ${proy.planta_nombre}.`;
          for (const u of [...gaGG, ...gaGG2]) {
            if (u && u.telefono) await sendWhatsApp(u.telefono, notif);
          }
          for (const u of cdmx) {
            if (u && u.telefono) await sendWhatsApp(u.telefono, notif);
          }
        } catch (e) {
          console.warn("Notif cierre proyecto:", e.message);
        }
        return safeReply(`✅ Proyecto ${proy.codigo} cerrado.`);
      }

      if (/^cancelar\s+proyecto\s+/i.test(body)) {
        const codigo = body.replace(/^cancelar\s+proyecto\s+/i, "").trim();
        const codigoNorm = await resolveProyectoCodigo(client, codigo);
        if (!codigoNorm) return safeReply("Formato: cancelar proyecto PRJ-YYYYMM-XXX");
        const proy = await getProyectoByCodigo(client, codigoNorm);
        if (!proy) return safeReply(`No existe el proyecto ${codigoNorm}.`);
        if (proy.estatus === ESTADOS_PROYECTO.CANCELADO) return safeReply("El proyecto ya está cancelado.");
        if (proy.estatus === ESTADOS_PROYECTO.CANCELACION_SOLICITADA) return safeReply("Ya hay solicitud de cancelación. ZP debe confirmar.");
        if (proy.estatus !== ESTADOS_PROYECTO.EN_CURSO && proy.estatus !== ESTADOS_PROYECTO.CERRADO) return safeReply("No se puede cancelar en el estado actual.");
        await updateProyectoCancelacionSolicitada(client, proy.id);
        await insertProyectoHistorial(client, proy.id, "CANCELACION_SOLICITADA", `Solicitud de cancelación por ${fromNorm}`, fromNorm, actor ? actor.rol_nombre : null);
        try {
          const todos = await getTodosParaNotificacion(client, proy.planta_id);
          const notif = `Solicitud de cancelación del proyecto ${codigoNorm} (${proy.nombre}). ZP debe confirmar: confirmar cancelacion proyecto ${codigoNorm}`;
          for (const tel of todos) {
            if (tel) await sendWhatsApp(tel, notif);
          }
        } catch (e) {
          console.warn("Notif cancel proyecto:", e.message);
        }
        return safeReply(`Solicitud de cancelación registrada para ${codigoNorm}. ZP debe responder: confirmar cancelacion proyecto ${codigoNorm}`);
      }

      if (/^confirmar\s+cancelacion\s+proyecto\s+/i.test(body)) {
        const codigo = body.replace(/^confirmar\s+cancelacion\s+proyecto\s+/i, "").trim();
        const codigoNorm = await resolveProyectoCodigo(client, codigo);
        if (!codigoNorm) return safeReply("Formato: confirmar cancelacion proyecto PRJ-YYYYMM-XXX");
        const rolClave = (actor && actor.rol_clave) ? String(actor.rol_clave).toUpperCase() : "";
        const esZP = rolClave === "ZP" || (actor && actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre));
        if (!esZP) return safeReply("Solo el Director ZP puede confirmar la cancelación del proyecto.");
        const proy = await getProyectoByCodigo(client, codigoNorm);
        if (!proy) return safeReply(`No existe el proyecto ${codigoNorm}.`);
        if (proy.estatus !== ESTADOS_PROYECTO.CANCELACION_SOLICITADA) return safeReply("El proyecto debe estar en CANCELACION_SOLICITADA.");
        await updateProyectoCancelado(client, proy.id);
        await insertProyectoHistorial(client, proy.id, "CANCELADO", "Cancelación confirmada por ZP", fromNorm, actor ? actor.rol_nombre : null);
        try {
          const todos = await getTodosParaNotificacion(client, proy.planta_id);
          const notif = `Proyecto ${codigoNorm} (${proy.nombre}) cancelado por ZP.`;
          for (const tel of todos) {
            if (tel) await sendWhatsApp(tel, notif);
          }
        } catch (e) {
          console.warn("Notif cancel proyecto:", e.message);
        }
        return safeReply(`✅ Proyecto ${codigoNorm} cancelado.`);
      }

      if (sess.pendingProjectAttach && sess.pendingProjectAttach.waitingTipo) {
        const num = parseInt(body.trim(), 10);
        const tipoMap = { 1: "PLANO", 2: "COTIZACION", 3: "OTRO" };
        const tipo = tipoMap[num] || null;
        if (!tipo) return safeReply("Responde 1) Plano 2) Cotización 3) Otro");
        const pend = sess.pendingProjectAttach;
        try {
          await agregarArchivoProyecto(client, pend.proyecto_id, tipo, pend.url, fromNorm);
          await insertProyectoHistorial(client, pend.proyecto_id, "ARCHIVO_AGREGADO", `PDF ${tipo} adjunto`, fromNorm, actor ? actor.rol_nombre : null);
        } catch (e) {
          console.warn("Error agregar archivo proyecto:", e.message);
          return safeReply("Error al registrar el archivo. Intenta de nuevo.");
        }
        sess.pendingProjectAttach = null;
        return safeReply(`✅ PDF (${tipo}) guardado en proyecto ${pend.codigo}.`);
      }

      function truncConcepto(s, maxLen = 60) {
        const t = String(s || "").trim();
        if (!t) return "-";
        if (t.length <= maxLen) return t;
        return t.substring(0, maxLen) + "…";
      }

      /** Formatea una línea de folio (índice 1-based). */
      function formatFolioLine(f, index) {
        const urg = (f.prioridad && String(f.prioridad).toLowerCase().includes("urgente")) ? "🔴💡 " : "";
        const imp = f.importe != null ? Number(f.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "0.00";
        const concepto = truncConcepto(f.concepto, 60);
        return `${index}) ${urg}${f.numero_folio} | ${f.estatus || "-"} | $${imp} | ${concepto}\n`;
      }

      /**
       * Parte el listado de folios en varios mensajes, cada uno <= MAX_WHATSAPP_BODY.
       * Retorna array de strings; el último incluye totales (y opcional cantidad urgentes).
       */
      function buildFoliosListChunks(rows, plantaNombre, totalGeneral, totalUrgentes, soloUrgentes, countUrgentes) {
        const maxPerChunk = MAX_WHATSAPP_BODY - 120;
        const header = `FOLIOS - ${plantaNombre.toUpperCase()}\n`;
        const totalsBlock = `\nTotal urgentes: $${totalUrgentes.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\nTotal general: $${totalGeneral.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n` + (soloUrgentes ? `Cantidad folios urgentes: ${countUrgentes || 0}\n` : "");
        const chunks = [];
        let current = "";
        let currentLen = 0;
        let partNum = 1;
        for (let i = 0; i < rows.length; i++) {
          const line = formatFolioLine(rows[i], i + 1);
          if (currentLen + line.length > maxPerChunk && current.length > 0) {
            chunks.push(current.trim());
            partNum++;
            current = `— Parte ${partNum} —\n`;
            currentLen = current.length;
          }
          if (currentLen === 0 && chunks.length === 0) {
            current = header;
            currentLen = header.length;
          }
          current += line;
          currentLen += line.length;
        }
        if (current.length > 0) {
          const withTotals = current + totalsBlock + (rows.length >= 50 ? "\nMostrando últimos 50." : "");
          if (withTotals.length <= MAX_WHATSAPP_BODY) {
            chunks.push(withTotals.trim());
          } else {
            chunks.push(current.trim());
            chunks.push((totalsBlock + (rows.length >= 50 ? "Mostrando últimos 50." : "")).trim());
          }
        }
        return chunks.length ? chunks : [header.trim() + "\nSin folios."];
      }

      function formatFoliosList(rows, plantaNombre, totalGeneral, totalUrgentes, soloUrgentes, maxRows) {
        const maxShow = maxRows != null ? Math.min(rows.length, maxRows) : rows.length;
        let txt = `FOLIOS - ${plantaNombre.toUpperCase()}\n`;
        for (let i = 0; i < maxShow; i++) {
          txt += formatFolioLine(rows[i], i + 1);
        }
        txt += `\nTotal urgentes: $${totalUrgentes.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
        txt += `Total general: $${totalGeneral.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
        if (rows.length > maxShow) txt += `\nMostrando ${maxShow} de ${rows.length} folios.`;
        else if (rows.length >= 50) txt += "\nMostrando últimos 50.";
        if (txt.length > MAX_WHATSAPP_BODY) txt = txt.substring(0, MAX_WHATSAPP_BODY - 20) + "\n...(mensaje recortado)";
        return txt.trim();
      }

      if (sess.dd.intent === "PIPA_FOLIOS") {
        const step = sess.dd.step;
        if (step === "PLANTA") {
          const plantas = sess.dd._plantasList || [];
          let plantaId = null;
          const bodyNorm = body.trim().toLowerCase().normalize("NFD").replace(/\u0300/g, "");
          const num = parseInt(body.trim(), 10);
          if (Number.isFinite(num) && num >= 1 && num <= plantas.length) {
            plantaId = plantas[num - 1].id;
          } else {
            const byName = plantas.find((p) => (p.nombre || "").toLowerCase().normalize("NFD").replace(/\u0300/g, "") === bodyNorm || (p.nombre || "").toLowerCase() === body.trim().toLowerCase());
            if (byName) plantaId = byName.id;
          }
          if (!plantaId) return safeReply("Planta no reconocida. Responde con el número o nombre.");
          sess.dd.planta_id = plantaId;
          sess.dd.step = "OPCION";
          sess.dd._plantasList = null;
          return safeReply("FOLIOS DE PIPA\n\n1) Folios en proceso\n2) Folios cancelados\n\nResponde con el número.");
        }
        if (step === "OPCION") {
          const n = parseInt(body.trim(), 10);
          if (n !== 1 && n !== 2) return safeReply("Responde 1 o 2.");
          sess.dd.pipa_opcion = n;
          sess.dd.step = "UNIDAD";
          return safeReply("Indica número de unidad (ej: AT-03, AT03, AT3, 3).");
        }
        if (step === "UNIDAD") {
          let unidadNorm = normalizeUnidad(body);
          if (!unidadNorm) return safeReply("Unidad inválida. Ej: AT-15, C-3, 3");
          sess.dd.unidad_normalizada = unidadNorm;
          const plantaId = sess.dd.planta_id != null ? sess.dd.planta_id : null;
          const soloCancelados = sess.dd.pipa_opcion === 2;
          const limit = soloCancelados ? 20 : 50;
          const { rows } = await getFoliosByUnidad(client, unidadNorm, { plantaId, soloCancelados, limit });
          console.log(`[PIPA] planta=${plantaId} opcion=${sess.dd.pipa_opcion} unidad=${unidadNorm}`);
          console.log(`[PIPA] folios encontrados=${rows.length}`);

          const fmtMxn = (n) => (Number(n) != null && !isNaN(Number(n)) ? Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00");
          const titulo = `FOLIOS DE PIPA — ${unidadNorm}\n`;

          if (rows.length === 0) {
            sess.dd.intent = null;
            sess.dd.step = null;
            sess.dd.planta_id = null;
            sess.dd.pipa_opcion = null;
            sess.dd.unidad_normalizada = null;
            return safeReply(titulo + (soloCancelados ? "No hay folios cancelados para esta unidad." : "No hay folios en proceso para esta unidad."));
          }

          let gastado = 0;
          let porGastarse = 0;
          const PAGADO_CERRADO = [ESTADOS.PAGADO, ESTADOS.CERRADO];
          rows.forEach((f) => {
            const m = Number(f.importe) || 0;
            const est = (f.estatus || "").toUpperCase().trim();
            if (est === ESTADOS.CANCELADO) return;
            if (PAGADO_CERRADO.includes(est)) gastado += m;
            else if (est) porGastarse += m;
          });
          const totalCancelado = rows.reduce((s, f) => s + ((f.estatus || "").toUpperCase().trim() === ESTADOS.CANCELADO ? Number(f.importe) || 0 : 0), 0);

          if (soloCancelados) {
            let txt = titulo + "\n";
            const maxShow = Math.min(rows.length, 20);
            for (let i = 0; i < maxShow; i++) {
              const f = rows[i];
              txt += `${f.numero_folio} | $${fmtMxn(f.importe)} | ${(f.concepto || "").toString().trim().slice(0, 50)}${(f.concepto || "").length > 50 ? "…" : ""}\n`;
            }
            txt += "\n---\nResumen unidad " + unidadNorm + "\n❌ Cancelado: $" + fmtMxn(totalCancelado) + "\n📌 Folios cancelados: " + rows.length;
            if (txt.length > MAX_WHATSAPP_BODY) txt = txt.substring(0, MAX_WHATSAPP_BODY - 35) + "\n\n... (recortado por límite de WhatsApp)";
            sess.dd.intent = null;
            sess.dd.step = null;
            sess.dd.planta_id = null;
            sess.dd.pipa_opcion = null;
            sess.dd.unidad_normalizada = null;
            return safeReply(txt.trim());
          }

          const maxFoliosConTimeline = 3;
          const foliosParaMostrar = rows.slice(0, maxFoliosConTimeline);
          const telefonosHistorial = new Set();
          const historialesPorFolio = [];
          for (const f of foliosParaMostrar) {
            const hist = await getHistorial(client, f.numero_folio, 25);
            historialesPorFolio.push({ folio: f, rows: hist });
            hist.forEach((h) => { if (h.actor_telefono) telefonosHistorial.add(h.actor_telefono); });
          }
          const nombresMap = await getNombresByTelefonos(client, [...telefonosHistorial]);

          function resolveActorHistorial(r) {
            if (!r.actor_telefono && !r.actor_rol) return "Sistema";
            const tel = String(r.actor_telefono || "").trim().replace(/\s/g, "");
            if (tel) {
              const norm = normalizePhone(tel);
              const alt = phoneAltForDb(norm);
              const last10 = phoneLast10(tel);
              const nombre = nombresMap.get(tel) || nombresMap.get(norm) || (alt && nombresMap.get(alt)) || (last10 && nombresMap.get(last10)) || null;
              const rol = r.actor_rol ? (String(r.actor_rol).toUpperCase().includes("ZP") ? "Director ZP" : r.actor_rol) : null;
              return nombre ? (rol ? `${rol} - ${nombre}` : nombre) : (rol ? `${rol} - ${tel}` : tel);
            }
            return r.actor_rol || "Sistema";
          }

          let txt = titulo + "\n";
          for (const { folio: f, rows: histRows } of historialesPorFolio) {
            txt += `\n--- ${f.numero_folio} | ${f.estatus || "-"} | $${fmtMxn(f.importe)} | ${(f.planta_nombre || "").slice(0, 20)}\n`;
            txt += `Concepto: ${(f.concepto || "").toString().trim().slice(0, 60)}${(f.concepto || "").length > 60 ? "…" : ""}\n`;
            txt += formatTimeline(histRows, {
              formatFecha: formatMexicoCentral,
              resolveComentario: (r) => {
                let c = (r.comentario || "").trim();
                if (c === "Folio creado por WhatsApp") c = "Folio creado por " + resolveActorHistorial(r);
                return c || "-";
              },
            });
          }
          txt += "\n---\nResumen unidad " + unidadNorm + "\n✅ Gastado: $" + fmtMxn(gastado) + "\n🕒 Por gastarse: $" + fmtMxn(porGastarse) + "\n📌 Folios (no cancelados): " + rows.length;
          if (txt.length > MAX_WHATSAPP_BODY) txt = txt.substring(0, MAX_WHATSAPP_BODY - 35) + "\n\n... (recortado por límite de WhatsApp)";
          const chunks = [];
          let pos = 0;
          const maxChunk = MAX_WHATSAPP_BODY - 50;
          while (pos < txt.length) {
            chunks.push(txt.slice(pos, pos + maxChunk));
            pos += maxChunk;
          }
          if (chunks.length > 1) {
            console.log(`[PIPA] chunks=${chunks.length}`);
            const userFrom = req.body.From;
            setImmediate(() => {
              (async () => {
                for (let i = 1; i < chunks.length; i++) {
                  await new Promise((r) => setTimeout(r, 900));
                  await sendWhatsApp(userFrom, chunks[i]);
                }
              })().catch((e) => console.warn("Envío PIPA partes:", e.message));
            });
          }
          sess.dd.intent = null;
          sess.dd.step = null;
          sess.dd.planta_id = null;
          sess.dd.pipa_opcion = null;
          sess.dd.unidad_normalizada = null;
          return safeReply(chunks[0] || txt.trim());
        }
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
        if (DEBUG || rows.length === 0) console.log("[foliosByPlanta] plantaId=" + plantaId + " plantaNombre=" + (plantaNombre || "") + " rows=" + rows.length);
        if (soloUrgentes && rows.length === 0) {
          return safeReply(`No hay folios urgentes en ${plantaNombre}.`);
        }
        if (!soloUrgentes && rows.length === 0) {
          return safeReply(`No hay folios (no cancelados) en ${plantaNombre}. Revisa en la DB que los folios tengan planta_id = ${plantaId}.`);
        }
        const chunks = buildFoliosListChunks(rows, plantaNombre, totalGeneral, totalUrgentes, soloUrgentes, countUrgentes);
        if (chunks.length === 1) {
          return safeReply(chunks[0]);
        }
        const userFrom = req.body.From;
        setImmediate(() => {
          (async () => {
            for (let i = 1; i < chunks.length; i++) {
              await new Promise((r) => setTimeout(r, 900));
              await sendWhatsApp(userFrom, chunks[i]);
            }
          })().catch((e) => console.warn("Envío folios partes:", e.message));
        });
        return safeReply(chunks[0]);
      }

      if (FLAGS.ESTATUS && /^estatus\s+/i.test(body)) {
        const rest = body.replace(/^estatus\s+/i, "").trim();
        if (!rest) return safeReply("Indica al menos un folio. Ejemplo: estatus 045 044 o estatus F-202602-001");
        const { folios, invalidTokens } = parseFolioTokensFromText(rest);
        if (folios.length === 0 && invalidTokens.length === 0) return safeReply("Indica al menos un folio. Ejemplo: estatus 045 044 o estatus F-202602-001");
        const results = await getManyFoliosStatus(client, folios);
        const noEncontrados = results.filter((r) => !r.folio).map((r) => r.numero);

        function formatEstatusCompacto(folio) {
          const urg = (folio.prioridad && String(folio.prioridad).toLowerCase().includes("urgente")) ? "🔴💡 URGENTE | " : "";
          const concepto = (folio.descripcion || folio.concepto || "-").toString().trim();
          const conceptoShort = concepto.length > 60 ? concepto.substring(0, 60) + "…" : concepto;
          const imp = Number(folio.importe) != null && !isNaN(Number(folio.importe)) ? Number(folio.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
          const cotiz = folio.cotizacion_url ? "✅ Adjunta" : "⚠️ No adjunta";
          return `${urg}${folio.numero_folio} | ${folio.planta_nombre || "-"} | ${folio.estatus || "-"} | $${imp}\n  Concepto: ${conceptoShort}\n  Cotización: ${cotiz}`;
        }
        function formatEstatusBonito(folio) {
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
          txt += `Estación: ${folio.estacion || "-"}\n`;
          txt += `Urgente: ${(folio.prioridad && String(folio.prioridad).toLowerCase().includes("urgente")) ? "Sí" : "No"}\n`;
          txt += `Cotización adjunta: ${folio.cotizacion_url ? "Sí" : "No"}\n`;
          txt += `Fecha: ${fecha}\n`;
          if (folio.aprobado_por) txt += `Aprobado por: ${folio.aprobado_por}\n`;
          return txt.trim();
        }

        let txt = "";
        if (results.length === 1 && results[0].folio) {
          txt = formatEstatusBonito(results[0].folio);
        } else {
          const blocks = [];
          results.forEach((r, i) => {
            if (r.folio) blocks.push(formatEstatusCompacto(r.folio));
          });
          txt = blocks.join("\n\n");
        }
        if (noEncontrados.length) txt += (txt ? "\n\n" : "") + `❌ No encontrados: ${noEncontrados.join(", ")}`;
        if (invalidTokens.length) txt += (txt ? "\n" : "") + `⚠️ Formato inválido: ${invalidTokens.join(", ")}`;
        return safeReply(txt.trim());
      }

      if (FLAGS.HISTORIAL && /^historial\s+F-\d{6}-\d{3}\s*$/i.test(body)) {
        const numero = body.replace(/^historial\s+/i, "").trim();
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        let rows = await getHistorial(client, numero, 80);
        if (rows.length === 0) return safeReply(`Sin historial para ${numero}.`);
        rows = dedupeHistorialByStage(rows);

        console.log(`[Historial] Folio: ${numero}`);
        console.log(`[Historial] Eventos: ${rows.length}`);

        const telefonos = [...new Set(rows.map((r) => r.actor_telefono).filter(Boolean))];
        const nombresMap = await getNombresByTelefonos(client, telefonos);

        function resolveActor(r) {
          if (r.actor_rol || r.actor_telefono) {
            const tel = String(r.actor_telefono || "").trim().replace(/\s/g, "");
            if (tel) {
              const norm = normalizePhone(tel);
              const alt = phoneAltForDb(norm);
              const last10 = phoneLast10(tel);
              const nombre = nombresMap.get(tel) || nombresMap.get(norm) || (alt && nombresMap.get(alt)) || (last10 && nombresMap.get(last10)) || null;
              const rol = r.actor_rol ? (String(r.actor_rol).toUpperCase().includes("ZP") ? "Director ZP" : r.actor_rol) : null;
              return nombre ? (rol ? `${rol} - ${nombre}` : nombre) : (rol ? `${rol} - ${tel}` : tel);
            }
            return r.actor_rol || null;
          }
          return null;
        }

        const COMMENT_PREFIX = "comentario:";
        const normalized = rows.map((r) => {
          const rawComment = (r.comentario || "").trim();
          const isCommentEvent = rawComment.toLowerCase().startsWith(COMMENT_PREFIX);
          const event_type = isCommentEvent ? "COMENTARIO" : null;
          let comment_text = null;
          if (isCommentEvent) {
            comment_text = rawComment.slice(COMMENT_PREFIX.length).trim();
          }
          return {
            created_at: r.creado_en,
            actor: resolveActor(r),
            event_type,
            comment_text,
            estatus: r.estatus,
            comentario: r.comentario,
            actor_telefono: r.actor_telefono,
            actor_rol: r.actor_rol,
          };
        });

        const esDirectorZP = actor && (String(actor.rol_nombre || "").toUpperCase().includes("ZP") || String(actor.rol_nombre || "").includes("Director"));
        let txt = "Historial (cronológico):\n";
        if (esDirectorZP && folio.planta_nombre) txt += `Planta: ${folio.planta_nombre}\n\n`;

        let comentariosRenderizados = 0;
        normalized.forEach((ev) => {
          const fecha = formatMexicoCentral(ev.created_at);
          const icon = getStepIcon(ev);
          if (ev.event_type === "COMENTARIO") {
            const text = (ev.comment_text || "").trim();
            if (!text) return;
            comentariosRenderizados += 1;
            const displayActor = ev.actor || "Sistema";
            let displayText = text;
            if (displayText.length > 700) {
              displayText = displayText.substring(0, 680) + "… (recortado)";
            }
            txt += `${icon}💬 Comentario — ${displayActor}\n"${displayText}"\n${fecha}\n\n`;
          } else {
            let comentario = ev.comentario || "";
            if (comentario.trim() === "Folio creado por WhatsApp") {
              comentario = `Folio creado por ${ev.actor || "Sistema"}`;
            }
            txt += `${icon}${fecha} | ${ev.estatus} | ${comentario}\n`;
          }
        });

        console.log(`[Historial] Comentarios renderizados: ${comentariosRenderizados}`);

        txt = txt.trim();
        if (txt.length > 3500) {
          txt = txt.substring(0, 3400) + "\n\n... (historial recortado por límite de WhatsApp)";
        }
        return safeReply(txt);
      }

      if (FLAGS.APPROVALS && /^aprobar\s+/i.test(body)) {
        const rest = body.replace(/^aprobar\s+/i, "").trim();
        const { folios, invalidTokens } = parseFolioTokensFromText(rest);
        if (!actor) return safeReply("No autorizado. No se pudo identificar tu usuario.");
        const rolClave = (actor.rol_clave || "").toUpperCase();
        const esGG = rolClave === "GG" || (actor.rol_nombre && String(actor.rol_nombre).toUpperCase().includes("GG"));
        const esZP = rolClave === "ZP" || (actor.rol_nombre && /director/i.test(actor.rol_nombre) && /zp/i.test(actor.rol_nombre));

        if (folios.length === 0 && invalidTokens.length === 0) return safeReply("Indica al menos un folio. Ejemplo: aprobar 001 002 o aprobar F-202602-001");

        if (esZP) {
          const aprobados = [];
          const yaAprobados = [];
          const noEncontrados = [];
          const cancelados = [];
          const noPendientesZP = [];
          const sinCotizacion = [];
          for (const numero of folios) {
            const folio = await getFolioByNumero(client, numero);
            if (!folio) {
              noEncontrados.push(numero);
              continue;
            }
            const estatus = String(folio.estatus || "").toUpperCase();
            if (estatus === ESTADOS.CANCELADO || estatus === "CANCELADO") {
              cancelados.push(numero);
              continue;
            }
            if ([ESTADOS.APROBADO_ZP, ESTADOS.LISTO_PARA_PROGRAMACION, ESTADOS.SELECCIONADO_SEMANA, ESTADOS.PAGADO, ESTADOS.CERRADO].includes(estatus)) {
              yaAprobados.push(numero);
              continue;
            }
            if (estatus === ESTADOS.PENDIENTE_APROB_PLANTA) {
              try {
                await client.query("BEGIN");
                await client.query(`UPDATE public.folios SET estatus = $1 WHERE id = $2`, [ESTADOS.APROB_PLANTA, folio.id]);
                await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, ESTADOS.APROB_PLANTA, "Aprobado por GG (planta)", fromNorm, actor.rol_nombre);
                await client.query(`UPDATE public.folios SET estatus = $1 WHERE id = $2`, [ESTADOS.PENDIENTE_APROB_ZP, folio.id]);
                await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, ESTADOS.PENDIENTE_APROB_ZP, "Pendiente aprobación Director ZP", fromNorm, actor.rol_nombre);
                await updateFolioEstatus(client, folio.id, ESTADOS.LISTO_PARA_PROGRAMACION, { aprobado_por: fromNorm, aprobado_en: true });
                await client.query(`UPDATE public.folios SET nivel_aprobado = 3 WHERE id = $1`, [folio.id]);
                await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, ESTADOS.APROBADO_ZP, "Aprobado por Director ZP vía WhatsApp", fromNorm, actor.rol_nombre);
                await client.query("COMMIT");
              } catch (e) {
                await client.query("ROLLBACK");
                noEncontrados.push(numero);
                continue;
              }
              console.log("[aprobar ZP] Llamando notifyOnApprove (rama PENDIENTE_APROB_PLANTA) folio=" + numero);
              try {
                await notifyOnApprove(folio, fromNorm);
              } catch (e) {
                console.warn("Notif aprobar:", e.message);
              }
              aprobados.push(numero);
              if (!folio.cotizacion_url) sinCotizacion.push(numero);
              continue;
            }
            if (estatus !== ESTADOS.PENDIENTE_APROB_ZP) {
              noPendientesZP.push(numero);
              continue;
            }
            try {
              await client.query("BEGIN");
              await updateFolioEstatus(client, folio.id, ESTADOS.LISTO_PARA_PROGRAMACION, { aprobado_por: fromNorm, aprobado_en: true });
              await client.query(`UPDATE public.folios SET nivel_aprobado = 3 WHERE id = $1`, [folio.id]);
              await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, ESTADOS.APROBADO_ZP, "Aprobado por Director ZP vía WhatsApp", fromNorm, actor.rol_nombre);
              await client.query("COMMIT");
            } catch (e) {
              await client.query("ROLLBACK");
              noEncontrados.push(numero);
              continue;
            }
            console.log("[aprobar ZP] Llamando notifyOnApprove (rama PENDIENTE_APROB_ZP) folio=" + numero);
            try {
              await notifyOnApprove(folio, fromNorm);
            } catch (e) {
              console.warn("Notif aprobar:", e.message);
            }
            aprobados.push(numero);
            if (!folio.cotizacion_url) sinCotizacion.push(numero);
          }
          let msg = "";
          if (aprobados.length) msg += `✅ Aprobados: ${aprobados.join(", ")}\n`;
          if (yaAprobados.length) msg += `⚠️ Ya aprobados: ${yaAprobados.join(", ")}\n`;
          if (noPendientesZP.length) msg += `⚠️ No pendientes de aprobación ZP: ${noPendientesZP.join(", ")}\n`;
          if (cancelados.length) msg += `❌ Cancelados: ${cancelados.join(", ")}\n`;
          if (noEncontrados.length) msg += `❌ No encontrados: ${noEncontrados.join(", ")}\n`;
          if (invalidTokens.length) msg += `❌ Formato inválido: ${invalidTokens.join(", ")}\n`;
          if (sinCotizacion.length) msg += `⚠️ Sin cotización: ${sinCotizacion.join(", ")}\n`;
          return safeReply(msg.trim() || "Nada que aprobar.");
        }

        if (esGG && folios.length === 1 && invalidTokens.length === 0) {
          const numero = folios[0];
          const folio = await getFolioByNumero(client, numero);
          if (!folio) return safeReply(`No existe el folio ${numero}.`);
          const estatus = String(folio.estatus || "").toUpperCase();
          if (estatus === ESTADOS.CANCELADO || estatus === "CANCELADO") return safeReply("Ese folio está cancelado.");
          if ([ESTADOS.APROBADO_ZP, ESTADOS.LISTO_PARA_PROGRAMACION, ESTADOS.SELECCIONADO_SEMANA, ESTADOS.PAGADO, ESTADOS.CERRADO].includes(estatus)) {
            return safeReply("Ese folio ya está aprobado o en etapa posterior.");
          }
          if (estatus === ESTADOS.PENDIENTE_APROB_PLANTA) {
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
        }

        return safeReply("Solo el Director ZP puede aprobar folios.");
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

      if (/^aprobar\s+cotizacion\s+\d+\s*$/i.test(body.trim())) {
        const idStr = body.trim().replace(/^aprobar\s+cotizacion\s+/i, "").trim();
        const archivoId = parseInt(idStr, 10);
        if (!Number.isFinite(archivoId)) return safeReply("Formato: aprobar cotizacion <id>");
        const rolClave = (actor && actor.rol_clave) ? String(actor.rol_clave).toUpperCase() : "";
        const esCDMX = rolClave === "CDMX" || (actor && actor.rol_nombre && String(actor.rol_nombre).toUpperCase().includes("CDMX"));
        if (!esCDMX) return safeReply("Solo CDMX (Contralor Financiero) puede aprobar cotizaciones.");
        const arch = await getFolioArchivoById(client, archivoId);
        if (!arch) return safeReply(`No existe el archivo ${archivoId}.`);
        if (arch.status !== "PENDIENTE") return safeReply(`El archivo ${archivoId} no está pendiente (estado: ${arch.status}).`);
        await client.query("BEGIN");
        try {
          const aprobado = await aprobarFolioArchivoCDMX(client, archivoId, fromNorm);
          if (!aprobado) throw new Error("aprobarFolioArchivoCDMX");
          await insertHistorial(client, arch.folio_id, arch.numero_folio, arch.numero_folio, "", "Cotización aprobada por CDMX", fromNorm, actor ? actor.rol_nombre : null);
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          console.error("aprobar cotizacion:", e);
          return safeReply("Error al aprobar. Intenta de nuevo.");
        }
        console.log("[APROBADO] ArchivoID:", archivoId, "por", fromNorm);
        try {
          const folio = await getFolioByNumero(client, arch.numero_folio);
          if (folio && folio.planta_id) await notifyOnApprove(folio, fromNorm);
        } catch (e) {
          console.warn("notifyOnApprove después aprobar cotizacion:", e.message);
        }
        return safeReply(`✅ Cotización ${archivoId} aprobada. Se notificó a GA y GG de la planta.`);
      }

      if (/^rechazar\s+cotizacion\s+\d+/i.test(body.trim())) {
        const match = body.trim().match(/^rechazar\s+cotizacion\s+(\d+)\s*(?:motivo:)?\s*(.*)$/i);
        const idStr = match ? match[1].trim() : "";
        const motivo = match && match[2] ? match[2].trim() : "";
        const archivoId = parseInt(idStr, 10);
        if (!Number.isFinite(archivoId)) return safeReply("Formato: rechazar cotizacion <id> motivo: <texto>");
        const rolClave = (actor && actor.rol_clave) ? String(actor.rol_clave).toUpperCase() : "";
        const esCDMX = rolClave === "CDMX" || (actor && actor.rol_nombre && String(actor.rol_nombre).toUpperCase().includes("CDMX"));
        if (!esCDMX) return safeReply("Solo CDMX puede rechazar cotizaciones.");
        const rechazado = await rechazarFolioArchivoCDMX(client, archivoId, fromNorm, motivo);
        if (!rechazado) return safeReply(`No se pudo rechazar (archivo ${archivoId} no existe o no está PENDIENTE).`);
        console.log("[RECHAZADO] ArchivoID:", archivoId);
        return safeReply(`Cotización ${archivoId} rechazada. Motivo registrado.`);
      }

      if (/^archivos\s+(F-\d{6}-\d{3}|\d{1,3})\s*$/i.test(body.trim())) {
        const token = body.trim().replace(/^archivos\s+/i, "").trim();
        const numero = normalizeFolioToken(token, getCurrentYYYYMM());
        if (!numero) return safeReply("Formato: archivos 045 o archivos F-YYYYMM-XXX");
        const lista = await listFolioArchivos(client, numero, 10);
        if (lista.length === 0) return safeReply(`No hay archivos registrados para ${numero}.`);
        let msg = `Archivos folio ${numero} (últimos ${lista.length}):\n`;
        lista.forEach((a) => {
          msg += `ID ${a.id} | ${a.tipo} | ${a.status} | ${a.file_name || "-"} | ${formatMexicoCentral(a.subido_en)}\n`;
        });
        return safeReply(msg);
      }

      if (/^ver\s+cotizacion\s+(F-\d{6}-\d{3}|\d{1,3})\s*$/i.test(body.trim())) {
        const token = body.trim().replace(/^ver\s+cotizacion\s+/i, "").trim();
        const numero = normalizeFolioToken(token, getCurrentYYYYMM());
        if (!numero) return safeReply("Formato: ver cotizacion 045 o ver cotizacion F-YYYYMM-XXX");
        let ultima = await getUltimaCotizacionAprobada(client, numero);
        let url = null;
        let msg = "";
        if (ultima) {
          url = ultima.url;
          if (ultima.s3_key && s3Enabled) {
            try {
              url = await getSignedDownloadUrl(ultima.s3_key, 600);
            } catch (e) {
              console.warn("getSignedDownloadUrl:", e.message);
            }
          }
          msg = `Cotización aprobada ${numero}\nArchivoID: ${ultima.id}\nSubido: ${formatMexicoCentral(ultima.subido_en)}\nAprobado por: ${ultima.aprobado_por || "-"}\n`;
        } else {
          const ultimaCualquiera = await getUltimaCotizacionCualquiera(client, numero);
          if (ultimaCualquiera) {
            url = ultimaCualquiera.url;
            if (ultimaCualquiera.s3_key && s3Enabled) {
              try {
                url = await getSignedDownloadUrl(ultimaCualquiera.s3_key, 600);
              } catch (e) {
                console.warn("getSignedDownloadUrl:", e.message);
              }
            }
            const estado = (ultimaCualquiera.status || "").toUpperCase();
            const estadoTexto = estado === "PENDIENTE" ? "Pendiente de aprobación CDMX" : estado;
            msg = `Cotización ${numero}\nArchivoID: ${ultimaCualquiera.id}\nSubido: ${formatMexicoCentral(ultimaCualquiera.subido_en)} por ${ultimaCualquiera.subido_por || "-"}\nEstado: ${estadoTexto}\n`;
          } else {
            const folio = await getFolioByNumero(client, numero);
            if (folio) {
              if (folio.cotizacion_s3key && s3Enabled) {
                try {
                  url = await getSignedDownloadUrl(folio.cotizacion_s3key, 600);
                } catch (e) {
                  console.warn("getSignedDownloadUrl (folio legacy):", e.message);
                }
              } else if (folio.cotizacion_url && !folio.cotizacion_url.startsWith("TWILIO:")) {
                url = folio.cotizacion_url;
              }
              if (!url && s3Enabled) {
                const keyFromS3 = await findLatestCotizacionKeyInS3(numero);
                if (keyFromS3) {
                  try {
                    url = await getSignedDownloadUrl(keyFromS3, 600);
                  } catch (e) {
                    console.warn("getSignedDownloadUrl (S3 fallback):", e.message);
                  }
                }
              }
              if (url) msg = `Cotización folio ${numero}\n(Enlace de descarga)\n`;
            }
          }
        }
        if (!url) return safeReply(msg ? `No hay URL disponible para ${numero}.` : `No hay cotización para ${numero}.`);
        msg += `Ver (10 min): ${url}`;
        return safeReply(msg);
      }

      if (/^ver\s+archivo\s+\d+\s*$/i.test(body.trim())) {
        const idStr = body.trim().replace(/^ver\s+archivo\s+/i, "").trim();
        const archivoId = parseInt(idStr, 10);
        if (!Number.isFinite(archivoId)) return safeReply("Formato: ver archivo <id>");
        const arch = await getFolioArchivoById(client, archivoId);
        if (!arch) return safeReply(`No existe el archivo ${archivoId}.`);
        let url = arch.url;
        if (arch.s3_key && s3Enabled) {
          try {
            url = await getSignedDownloadUrl(arch.s3_key, 600);
          } catch (e) {
            console.warn("getSignedDownloadUrl:", e.message);
          }
        }
        if (!url) return safeReply("No hay URL disponible para este archivo.");
        return safeReply(`Archivo ${archivoId} (${arch.numero_folio}) — URL válida 10 min:\n${url}`);
      }

      if (/^reemplazar\s+cotizacion\s+(F-\d{6}-\d{3}|\d{1,3})\s*$/i.test(body.trim())) {
        const token = body.trim().replace(/^reemplazar\s+cotizacion\s+/i, "").trim();
        const numero = normalizeFolioToken(token, getCurrentYYYYMM());
        if (!numero) return safeReply("Formato: reemplazar cotizacion 045 o reemplazar cotizacion F-YYYYMM-XXX");
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        const aprobadas = await getCotizacionesAprobadasByFolioId(client, folio.id);
        if (aprobadas.length === 0) return safeReply(`No hay cotizaciones aprobadas para reemplazar en ${numero}.`);
        let listMsg = "Cotizaciones APROBADAS (responde con el número de ID):\n";
        aprobadas.forEach((a, i) => {
          listMsg += `${i + 1}) ID ${a.id} — ${a.file_name || "PDF"} — ${formatMexicoCentral(a.subido_en)}\n`;
        });
        sess.pendingReemplazo = { paso: "elegir_id", folio_id: folio.id, numero_folio: numero, folio: { ...folio, planta_nombre: folio.planta_nombre }, aprobadas };
        return safeReply(listMsg);
      }

      if (sess.pendingReemplazo && sess.pendingReemplazo.paso === "elegir_id") {
        const aprobadas = sess.pendingReemplazo.aprobadas || [];
        const n = parseInt(body.trim(), 10);
        if (!Number.isFinite(n) || n < 1 || n > aprobadas.length) {
          return safeReply("Responde con el número de la lista (1, 2, ...).");
        }
        const elegida = aprobadas[n - 1];
        sess.pendingReemplazo = { ...sess.pendingReemplazo, paso: "enviar_pdf", replace_of_id: elegida.id, replace_file_name: elegida.file_name };
        sess.pendingReemplazo.aprobadas = null;
        return safeReply(`Ok. Envía el nuevo PDF que reemplazará la cotización ID ${elegida.id}.`);
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

      if (sess.pendingReemplazo && sess.pendingReemplazo.paso === "enviar_pdf" && s3Enabled) {
        const clientReemp = await pool.connect();
        try {
          const pend = sess.pendingReemplazo;
          const buffer = await downloadTwilioMediaAsBuffer(mediaUrl);
          const hash = sha256Hex(buffer);
          console.log("[HASH] sha256=" + hash);
          const rReemp = await clientReemp.query(`SELECT sha256 FROM public.folio_archivos WHERE id = $1`, [pend.replace_of_id]);
          const sha256Anterior = rReemp.rows[0] && rReemp.rows[0].sha256 ? rReemp.rows[0].sha256 : null;
          if (sha256Anterior && hash === sha256Anterior) {
            console.log("[REEMPLAZO] Mismo archivo (hash igual).");
            sess.pendingReemplazo = null;
            return safeReply("No es necesario reemplazar. Es el mismo archivo.");
          }
          const dup = await findFolioArchivoByHash(clientReemp, pend.folio_id, hash);
          if (dup) {
            console.log("[DUPLICATE] reemplazo folio_id=" + pend.folio_id);
            await insertHistorial(clientReemp, pend.folio_id, pend.numero_folio, pend.numero_folio, "", "Intento de PDF duplicado detectado (reemplazo)", fromNorm, null);
            sess.pendingReemplazo = null;
            return safeReply(`⚠️ Este archivo ya fue subido antes. ArchivoID: ${dup.id}. Operación cancelada.`);
          }
          const s3Key = `cotizaciones/${pend.numero_folio}/${Date.now()}.pdf`;
          const publicUrl = await uploadPdfToS3(buffer, s3Key);
          const fileSize = Buffer.isBuffer(buffer) ? buffer.length : 0;
          sess.pendingReemplazo = {
            ...pend,
            paso: null,
            s3_key: s3Key,
            url: publicUrl,
            file_name: (req.body.MediaUrl0 || "").split("/").pop() || "documento.pdf",
            file_size_bytes: fileSize,
            sha256: hash,
            subido_por: fromNorm,
            waitingImporte: true,
            waitingConfirm: false,
          };
          const importeFolio = pend.folio && pend.folio.importe != null ? Number(pend.folio.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
          return safeReply(`Escribe el IMPORTE TOTAL que aparece en el PDF.\nDebe coincidir exactamente con el importe del folio: $${importeFolio}`);
        } finally {
          clientReemp.release();
        }
      }

      if (sess.pendingProjectAttach && !sess.pendingProjectAttach.waitingTipo) {
        const pend = sess.pendingProjectAttach;
        const client = await pool.connect();
        try {
          let publicUrl;
          if (s3Enabled) {
            const buffer = await downloadTwilioMediaAsBuffer(mediaUrl);
            const s3Key = `proyectos/${pend.codigo}/${Date.now()}.pdf`;
            publicUrl = await uploadPdfToS3(buffer, s3Key);
          } else {
            publicUrl = `TWILIO:${mediaUrl}`;
          }
          pend.url = publicUrl;
          pend.waitingTipo = true;
          return safeReply("PDF recibido. ¿Es 1) Plano 2) Cotización 3) Otro? Responde con el número.");
        } catch (e) {
          console.warn("Error subir PDF proyecto:", e.message);
          return safeReply("Error al subir el PDF. Intenta de nuevo.");
        } finally {
          client.release();
        }
      }

      const client = await pool.connect();
      try {
        let targetNumero = sess.dd.attachNumero || sess.lastFolioNumero;
        if (!targetNumero) {
          return safeReply("Indica a qué folio: Adjuntar F-YYYYMM-XXX y luego envía el PDF.");
        }
        const folio = await getFolioByNumero(client, targetNumero);
        if (!folio) return safeReply(`No encuentro el folio ${targetNumero}.`);

        if (s3Enabled) {
          console.log("[PDF] Descargando");
          const buffer = await downloadTwilioMediaAsBuffer(mediaUrl);
          const hash = sha256Hex(buffer);
          console.log("[HASH] sha256=" + hash);
          const dup = await findFolioArchivoByHash(client, folio.id, hash);
          if (dup) {
            console.log("[DUPLICATE] folio_id=" + folio.id + " sha256=" + hash);
            try {
              await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, folio.estatus || "", "Intento de PDF duplicado detectado", fromNorm, null);
            } catch (e) {
              console.warn("Historial duplicado:", e.message);
            }
            const fecha = dup.subido_en ? formatMexicoCentral(dup.subido_en) : "-";
            sess.dd.attachNumero = null;
            return safeReply(`⚠️ Este archivo ya fue subido antes.\nArchivoID: ${dup.id}\nEstado: ${dup.status}\nSubido: ${fecha} por ${dup.subido_por || "-"}`);
          }
          const s3Key = `cotizaciones/${folio.numero_folio}/${Date.now()}.pdf`;
          const publicUrl = await uploadPdfToS3(buffer, s3Key);
          const fileSize = Buffer.isBuffer(buffer) ? buffer.length : 0;
          sess.pendingCotizacion = {
            folio_id: folio.id,
            numero_folio: folio.numero_folio,
            folio: { ...folio, planta_nombre: folio.planta_nombre },
            s3_key: s3Key,
            url: publicUrl,
            file_name: (req.body.MediaUrl0 || "").split("/").pop() || "documento.pdf",
            file_size_bytes: fileSize,
            sha256: hash,
            subido_por: fromNorm,
            waitingImporte: true,
            tipo: "COTIZACION",
          };
          sess.dd.attachNumero = null;
          const importeFolio = folio.importe != null ? Number(folio.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
          return safeReply(`Escribe el IMPORTE TOTAL que aparece en el PDF.\nDebe coincidir exactamente con el importe del folio: $${importeFolio}`);
        } else {
          const tempUrl = `TWILIO:${mediaUrl}`;
          await attachCotizacionUrlOnly(client, folio.id, tempUrl, fromNorm);
          sess.dd.attachNumero = null;
          const folioCodigoAdjunto = folio.numero_folio;
          setImmediate(() => {
            notifyPlantByFolio(pool, folioCodigoAdjunto, "ADJUNTO").catch((e) => console.warn("Notif ADJUNTO:", e.message));
          });
          return safeReply(`✅ Cotización guardada en el folio ${folio.numero_folio}.`);
        }
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
      sess.estado = "ESPERANDO_PROYECTO_SN";
      return safeReply("¿Este folio pertenece a un proyecto? 1) Sí 2) No");
    }

    if (sess.estado === "ESPERANDO_PROYECTO_SN") {
      const sn = body.trim().toLowerCase();
      if (/^2$|^no$/i.test(sn)) {
        sess.dd.proyecto_id = null;
        sess.estado = "ESPERANDO_BENEFICIARIO";
        return safeReply("2) Indica BENEFICIARIO (a quién se le paga).");
      }
      if (/^1$|^s[ií]$|^si$/i.test(sn)) {
        const client = await pool.connect();
        try {
          const proyectos = await listarProyectosPorPlanta(client, sess.dd.planta_id, true);
          if (!proyectos.length) {
            sess.dd.proyecto_id = null;
            sess.estado = "ESPERANDO_BENEFICIARIO";
            return safeReply("No hay proyectos EN_CURSO en esta planta. Continuamos sin proyecto.\n2) Indica BENEFICIARIO (a quién se le paga).");
          }
          sess.dd._proyectosList = proyectos;
          sess.estado = "ESPERANDO_PROYECTO_PICK";
          const list = proyectos.map((p, i) => `${i + 1}) ${p.codigo} - ${p.nombre}`).join("\n");
          return safeReply("Selecciona el proyecto (número):\n" + list);
        } finally {
          client.release();
        }
      }
      return safeReply("Responde 1) Sí o 2) No.");
    }

    if (sess.estado === "ESPERANDO_PROYECTO_PICK") {
      const proyectos = sess.dd._proyectosList || [];
      const picked = pickByNumber(body, proyectos);
      if (!picked) return safeReply("Responde con el número del proyecto.");
      sess.dd.proyecto_id = picked.id;
      sess.dd._proyectosList = null;
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
      const esEstaciones = (picked || "").trim().toLowerCase() === "estaciones";
      if (esEstaciones) {
        sess.dd.estacion = null;
        const plantaNombre = sess.dd.planta_nombre || "";
        const estacionesList = getEstacionesByPlanta(plantaNombre);
        sess.dd._estacionesList = estacionesList || [];
        if (!estacionesList || estacionesList.length === 0) {
          sess.estado = "ESPERANDO_ESTACION_MANUAL";
          return safeReply(
            "No hay estaciones configuradas para esta planta. Escribe el nombre de la estación (mín. 3 caracteres) o responde CANCELAR para salir."
          );
        }
        sess.estado = "ESPERANDO_ESTACION";
        return safeReply("Selecciona la estación (responde con número):\n\n" + estacionesList.map((o, i) => `${i + 1}) ${o}`).join("\n") + "\n\n0) Escribir estación manual\n\nResponde con el número.");
      }
      sess.estado = "ESPERANDO_PRIORIDAD";
      return safeReply(renderMenu("7) Elige PRIORIDAD:", sess.dd.urgente ? ["Urgente no programado", ...PRIORIDADES] : PRIORIDADES));
    }

    if (sess.estado === "ESPERANDO_ESTACION") {
      const list = sess.dd._estacionesList || [];
      const bodyTrim = body.trim();
      const n = parseInt(bodyTrim, 10);
      if (n === 0) {
        sess.estado = "ESPERANDO_ESTACION_MANUAL";
        return safeReply("Escribe el nombre de la estación (mín. 3 caracteres).");
      }
      if (Number.isFinite(n) && n >= 1 && n <= list.length) {
        sess.dd.estacion = normalizeEstacionNombre(list[n - 1]);
        sess.dd._estacionesList = null;
        sess.estado = "ESPERANDO_PRIORIDAD";
        return safeReply(renderMenu("7) Elige PRIORIDAD:", sess.dd.urgente ? ["Urgente no programado", ...PRIORIDADES] : PRIORIDADES));
      }
      return safeReply("Opción inválida. Responde con el número de la estación o 0 para escribir manual.");
    }

    if (sess.estado === "ESPERANDO_ESTACION_MANUAL") {
      if (/^cancelar$/i.test(body.trim())) {
        sess.dd._estacionDraft = null;
        sess.dd.estacion = null;
        sess.estado = "ESPERANDO_PRIORIDAD";
        return safeReply("Sin estación. " + renderMenu("7) Elige PRIORIDAD:", sess.dd.urgente ? ["Urgente no programado", ...PRIORIDADES] : PRIORIDADES));
      }
      const texto = body.trim();
      if (texto.length < 3) return safeReply("Escribe al menos 3 caracteres para la estación.");
      sess.dd._estacionDraft = normalizeEstacionNombre(texto);
      sess.estado = "CONFIRMAR_ESTACION_MANUAL";
      return safeReply(`Vas a guardar estación: "${sess.dd._estacionDraft}". Responde SI para confirmar o NO para volver a escribir.`);
    }

    if (sess.estado === "CONFIRMAR_ESTACION_MANUAL") {
      const resp = body.trim().toLowerCase();
      if (resp === "no" || resp === "n") {
        sess.estado = "ESPERANDO_ESTACION_MANUAL";
        return safeReply("Escribe de nuevo el nombre de la estación (mín. 3 caracteres).");
      }
      if (resp === "si" || resp === "sí" || resp === "s") {
        sess.dd.estacion = sess.dd._estacionDraft || null;
        sess.dd._estacionDraft = null;
        sess.estado = "ESPERANDO_PRIORIDAD";
        return safeReply(renderMenu("7) Elige PRIORIDAD:", sess.dd.urgente ? ["Urgente no programado", ...PRIORIDADES] : PRIORIDADES));
      }
      return safeReply("Responde SI para confirmar o NO para volver a escribir.");
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
        `Estación: ${sess.dd.estacion || "(N/A)"}`,
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
