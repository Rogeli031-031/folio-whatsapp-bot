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
const BOT_VERSION = "2.0.0";

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.usuarios (
        id SERIAL PRIMARY KEY,
        telefono VARCHAR(50) NOT NULL,
        rol_id INT REFERENCES public.roles(id),
        planta_id INT REFERENCES public.plantas(id)
      );
    `).catch(() => {});
    await client.query(`ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);

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

    return;
  } finally {
    client.release();
  }
}

/* ==================== REPOS / DB ==================== */

/** Devuelve actor { id, telefono, rol_nombre, planta_id, planta_nombre } o null. */
async function getActorByPhone(client, phone) {
  const norm = normalizePhone(phone);
  const alt = phoneAltForDb(norm);
  const q = `
    SELECT u.id, u.telefono, u.planta_id, r.nombre AS rol_nombre, p.nombre AS planta_nombre
    FROM public.usuarios u
    LEFT JOIN public.roles r ON r.id = u.rol_id
    LEFT JOIN public.plantas p ON p.id = u.planta_id
    WHERE u.telefono = $1::TEXT OR ($2::TEXT IS NOT NULL AND u.telefono = $2::TEXT)
    LIMIT 1
  `;
  const r = await client.query(q, [norm, alt]);
  return r.rows[0] || null;
}

async function getPlantas(client) {
  const r = await client.query(`SELECT id, nombre FROM public.plantas ORDER BY nombre`);
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
    `SELECT id, numero_folio, folio_codigo, planta_id, beneficiario, concepto, importe,
            categoria, subcategoria, unidad, prioridad, estatus, cotizacion_url, cotizacion_s3key,
            aprobado_por, aprobado_en, creado_en
     FROM public.folios WHERE numero_folio = $1`,
    [numero]
  );
  return r.rows[0] || null;
}

async function insertFolio(client, dd) {
  const numero_folio = await nextFolioNumber(client);
  const folio_codigo = numero_folio;
  const prioridad = dd.urgente ? "Urgente no programado" : (dd.prioridad || null);

  const ins = await client.query(
    `INSERT INTO public.folios (
      folio_codigo, numero_folio, planta_id, beneficiario, concepto, importe,
      categoria, subcategoria, unidad, prioridad, estatus, creado_en
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Generado', NOW())
    RETURNING id, numero_folio, folio_codigo`,
    [
      folio_codigo, numero_folio, dd.planta_id || null, dd.beneficiario || null, dd.concepto || null,
      dd.importe || null, dd.categoria_nombre || null, dd.subcategoria_nombre || null,
      dd.unidad || null, prioridad,
    ]
  );
  const row = ins.rows[0];

  try {
    await client.query(
      `INSERT INTO public.folio_historial(
        numero_folio, estatus, comentario, actor_telefono, actor_rol, creado_en, folio_codigo, folio_id
      ) VALUES ($1,'Generado',$2,$3,$4,NOW(),$5,$6)`,
      [
        row.numero_folio, "Folio creado por WhatsApp",
        dd.actor_telefono || null, dd.actor_rol || null, row.folio_codigo, row.id,
      ]
    );
  } catch (e) {
    console.warn("Historial no insertado (folio creado):", e.message);
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

async function updateFolioAprobado(client, folioId, aprobadoPor) {
  await client.query(
    `UPDATE public.folios SET estatus = 'Aprobado', aprobado_por = $1, aprobado_en = NOW() WHERE id = $2`,
    [aprobadoPor, folioId]
  );
}

async function updateFolioCancelado(client, folioId) {
  await client.query(`UPDATE public.folios SET estatus = 'Cancelado' WHERE id = $1`, [folioId]);
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

/** Folios urgentes (no cancelados): numero_folio, importe, creado_en. */
async function getFoliosUrgentes(client, limit = 20) {
  const r = await client.query(
    `SELECT numero_folio, importe, creado_en
     FROM public.folios
     WHERE prioridad = 'Urgente no programado' AND estatus != 'Cancelado'
     ORDER BY creado_en ASC`,
    []
  );
  return (r.rows || []).slice(0, limit);
}

/** Usuarios a notificar al aprobar: GA y GG de la planta del folio + todos CDMX. */
async function getUsersToNotifyOnApprove(client, plantaId) {
  const gaGG = await client.query(
    `SELECT u.telefono FROM public.usuarios u
     INNER JOIN public.roles r ON r.id = u.rol_id
     WHERE u.planta_id = $1 AND r.nombre IN ('GA','GG')`,
    [plantaId]
  );
  const cdmx = await client.query(
    `SELECT u.telefono FROM public.usuarios u
     INNER JOIN public.roles r ON r.id = u.rol_id
     WHERE r.nombre = 'CDMX'`
  );
  const phones = new Set();
  gaGG.rows.forEach((row) => phones.add(row.telefono));
  cdmx.rows.forEach((row) => phones.add(row.telefono));
  return Array.from(phones);
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

function buildHelpMessage() {
  const lines = [
    "Comandos:",
    "• crear folio [concepto] [urgente]",
    `• estatus F-YYYYMM-XXX${FLAGS.ESTATUS ? "" : " (desactivado)"}`,
    `• historial F-YYYYMM-XXX${FLAGS.HISTORIAL ? "" : " (desactivado)"}`,
    FLAGS.APPROVALS ? "• aprobar F-YYYYMM-XXX (solo ZP)" : "• aprobar ... (desactivado)",
    FLAGS.APPROVALS ? "• cancelar F-YYYYMM-XXX <motivo> (ZP/CDMX)" : "• cancelar ... (desactivado)",
    FLAGS.ATTACHMENTS ? "• adjuntar F-YYYYMM-XXX (luego envía el PDF)" : "• adjuntar ... (desactivado)",
    "• version",
    "• ayuda / menu",
  ];
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

async function sendWhatsApp(toPhone, body) {
  if (!twilioClient || !twilioWhatsAppFrom) return false;
  const to = toPhone.startsWith("whatsapp:") ? toPhone : `whatsapp:${toPhone}`;
  const from = twilioWhatsAppFrom.startsWith("whatsapp:") ? twilioWhatsAppFrom : `whatsapp:${twilioWhatsAppFrom}`;
  try {
    await twilioClient.messages.create({ body, from, to });
    return true;
  } catch (e) {
    console.warn("Twilio send error:", e.message);
    return false;
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

    if (["ayuda", "help", "menu"].includes(lower)) {
      return safeReply(buildHelpMessage());
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

      if (FLAGS.ESTATUS && /^estatus\s+F-\d{6}-\d{3}\s*$/i.test(body)) {
        const numero = body.replace(/^estatus\s+/i, "").trim();
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        const urg = folio.prioridad === "Urgente no programado" ? " 🔴💡 URGENTE" : "";
        let txt = `Folio ${folio.numero_folio}${urg}\nEstatus: ${folio.estatus}\n`;
        txt += `Importe: $${Number(folio.importe) != null && !isNaN(Number(folio.importe)) ? Number(folio.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-"}\n`;
        if (folio.estatus === "Aprobado" && folio.aprobado_por) {
          txt += `Aprobado por: ${folio.aprobado_por}\n`;
        } else if (folio.estatus !== "Cancelado" && folio.estatus !== "Aprobado") {
          txt += `Faltan por aprobar: Director ZP\n`;
        }
        txt += `Cotización: ${folio.cotizacion_url ? "Sí" : "No"}\n`;

        const urgentes = await getFoliosUrgentes(client, 15);
        if (urgentes.length > 0) {
          txt += "\n🔴 Folios urgentes (días | importe):\n";
          const now = Date.now();
          urgentes.forEach((f) => {
            const creado = f.creado_en ? new Date(f.creado_en).getTime() : now;
            const dias = Math.floor((now - creado) / (24 * 60 * 60 * 1000));
            const imp = f.importe != null && !isNaN(Number(f.importe)) ? Number(f.importe).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-";
            txt += `${f.numero_folio} | ${dias} día(s) | $${imp}\n`;
          });
        }
        return safeReply(txt.trim());
      }

      if (FLAGS.HISTORIAL && /^historial\s+F-\d{6}-\d{3}\s*$/i.test(body)) {
        const numero = body.replace(/^historial\s+/i, "").trim();
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        const rows = await getHistorial(client, numero, 10);
        if (rows.length === 0) return safeReply(`Sin historial para ${numero}.`);
        const lines = rows.map((r) => `${r.creado_en ? new Date(r.creado_en).toLocaleString() : ""} | ${r.estatus} | ${r.comentario || ""}`);
        return safeReply("Historial (últimos 10):\n" + lines.join("\n"));
      }

      if (FLAGS.APPROVALS && /^aprobar\s+F-\d{6}-\d{3}\s*$/i.test(body)) {
        const numero = body.replace(/^aprobar\s+/i, "").trim();
        if (!actor || actor.rol_nombre !== "ZP") {
          return safeReply("No autorizado. Solo Director ZP puede aprobar.");
        }
        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        if (folio.estatus === "Aprobado") return safeReply("Ese folio ya está aprobado.");
        if (folio.estatus === "Cancelado") return safeReply("Ese folio está cancelado.");

        await client.query("BEGIN");
        try {
          await updateFolioAprobado(client, folio.id, fromNorm);
          await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, "Aprobado", "Aprobado por ZP vía WhatsApp", fromNorm, actor.rol_nombre);
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

        if (!twilioClient || !twilioWhatsAppFrom) {
          return safeReply("Folio aprobado. No pude enviar notificaciones (Twilio no configurado).");
        }
        return safeReply(`Folio ${numero} aprobado. Notificaciones enviadas a GA, GG y CDMX.`);
      }

      if (FLAGS.APPROVALS && /^cancelar\s+F-\d{6}-\d{3}/i.test(body)) {
        const match = body.trim().match(/^cancelar\s+(F-\d{6}-\d{3})\s*(.*)$/i);
        const numero = (match && match[1]) ? match[1].trim() : "";
        const motivo = (match && match[2]) ? match[2].trim() : "Sin motivo";
        if (!numero) return safeReply("Formato: cancelar F-YYYYMM-XXX <motivo>");

        const canCancel = actor && ["ZP", "CDMX", "GG"].includes(actor.rol_nombre);
        if (!canCancel) {
          return safeReply("No autorizado para cancelar. Solo ZP, CDMX o GG.");
        }

        const folio = await getFolioByNumero(client, numero);
        if (!folio) return safeReply(`No existe el folio ${numero}.`);
        if (folio.estatus === "Cancelado") return safeReply("Ese folio ya está cancelado.");

        await client.query("BEGIN");
        try {
          await updateFolioCancelado(client, folio.id);
          await insertHistorial(client, folio.id, folio.numero_folio, folio.folio_codigo, "Cancelado", `Cancelado: ${motivo}`, fromNorm, actor.rol_nombre);
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        }
        return safeReply(`Folio ${numero} cancelado. Motivo: ${motivo}`);
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
