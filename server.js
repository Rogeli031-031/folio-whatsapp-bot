// server.js
// WhatsApp (Twilio) + PostgreSQL (Render) + S3 + SendGrid
// - Subir cotización PDF desde WhatsApp -> S3 -> DB
// - ZP al aprobar notifica GA+GG+CDMX (y advierte si falta cotización)
// - 🚨 en todas las notificaciones si folio es urgente
// - Presupuesto semanal + selección semanal por Contralor CDMX
// - Envío por correo (SendGrid) de folios seleccionados esta semana (resumen + PDFs)

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { Pool } = require("pg");
const sgMail = require("@sendgrid/mail");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { Readable } = require("stream");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// =========================
// ENV
// =========================
const DATABASE_URL = process.env.DATABASE_URL || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || ""; // "whatsapp:+1415..."

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "";
const S3_BUCKET = process.env.S3_BUCKET || "";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "";

if (!DATABASE_URL) console.error("❌ Falta DATABASE_URL");
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) console.warn("⚠️ Faltan credenciales Twilio (descarga media + notificaciones).");
if (!TWILIO_WHATSAPP_NUMBER) console.warn("⚠️ Falta TWILIO_WHATSAPP_NUMBER (notificaciones).");
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !S3_BUCKET) console.warn("⚠️ Faltan variables AWS S3.");
if (!SENDGRID_API_KEY || !FROM_EMAIL) console.warn("⚠️ Faltan variables SendGrid (correo).");

if (SENDGRID_API_KEY) sgMail.setApiKey(SENDGRID_API_KEY);

// =========================
// DB
// =========================
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =========================
// S3
// =========================
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  } : undefined
});

// =========================
// Helpers
// =========================
function twiml(msg) {
  const safe = String(msg || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<Response><Message>${safe}</Message></Response>`;
}

function normalizeFrom(from) {
  // "whatsapp:+521..." -> "+52..."
  let s = String(from || "").trim();
  s = s.replace(/^whatsapp:/i, "");
  s = s.replace(/\s+/g, "");
  if (s.startsWith("+521")) s = "+52" + s.slice(4);
  return s;
}

function toTwilioWhatsapp(toPhoneE164) {
  const tel = String(toPhoneE164 || "").trim().replace(/\s+/g, "");
  if (!tel) return "";
  return tel.toLowerCase().startsWith("whatsapp:") ? tel : `whatsapp:${tel}`;
}

function moneyToNumber(v) {
  const s = String(v || "").replace(/,/g, "").replace(/[^0-9.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function urgentBadge(folioOrDraft) {
  const urgente =
    folioOrDraft?.urgente === true ||
    String(folioOrDraft?.prioridad || "").toLowerCase().includes("urgente");
  return urgente ? "🚨 " : "";
}

function isoWeekKeyCDMX(date = new Date()) {
  // ISO week (aprox) sin librerías externas; suficiente para “semana actual”
  // NOTA: si quieres exactitud absoluta con TZ CDMX, después metemos luxon.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const year = d.getUTCFullYear();
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

function parseFolioId(text) {
  const m = String(text || "").match(/F-\d{6}-\d{3}/i);
  return m ? m[0].toUpperCase() : "";
}

function parseKeyValueLines(text) {
  const out = {};
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const l of lines) {
    const m = l.match(/^([a-záéíóúñ\s]+)\s*:\s*(.+)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();

    if (key.includes("benefici")) out.beneficiario = val;
    if (key.includes("import") || key.includes("costo")) out.importe = val;
    if (key.includes("categor")) out.categoria = val;
    if (key.includes("sub")) out.subcategoria = val;
    if (key.includes("unidad")) out.unidad = val;
    if (key.includes("concept")) out.concepto = val;
  }
  return out;
}

function missingFields(d) {
  const miss = [];
  if (!d.concepto) miss.push("Concepto");
  if (!d.beneficiario) miss.push("Beneficiario");
  if (!d.importe) miss.push("Importe (o Costo)");
  if (!d.categoria) miss.push("Categoría");
  if (!d.subcategoria) miss.push("Subcategoría");
  if (String(d.categoria || "").toLowerCase().includes("taller") && !d.unidad) {
    miss.push("Unidad (AT-03 / C-03)");
  }
  return miss;
}

// =========================
// Schema + tablas extra para semana/presupuesto + emails
// =========================
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plantas (
      id SERIAL PRIMARY KEY,
      clave VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(100) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      clave VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(100) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      telefono VARCHAR(30) UNIQUE NOT NULL,
      nombre VARCHAR(120) NOT NULL,
      email VARCHAR(200),
      planta_id INT NULL REFERENCES plantas(id),
      rol_id INT NOT NULL REFERENCES roles(id),
      activo BOOLEAN DEFAULT TRUE,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_counters (
      yyyymm VARCHAR(6) PRIMARY KEY,
      last_seq INT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS folios (
      id SERIAL PRIMARY KEY,
      numero_folio VARCHAR(50) UNIQUE,
      planta VARCHAR(100),
      descripcion TEXT,
      monto NUMERIC(12,2),
      estatus VARCHAR(60),
      creado_por VARCHAR(150),
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      prioridad VARCHAR(50),
      urgente BOOLEAN DEFAULT FALSE,
      beneficiario VARCHAR(150),
      categoria VARCHAR(80),
      subcategoria VARCHAR(120),
      unidad VARCHAR(50),
      cotizacion_url TEXT,
      cotizacion_adjunta BOOLEAN DEFAULT FALSE,
      cotizacion_nombre TEXT,
      cotizacion_subida_por VARCHAR(150),
      cotizacion_subida_en TIMESTAMP,
      listo_para_depositar BOOLEAN DEFAULT FALSE,
      seleccionado_semana BOOLEAN DEFAULT FALSE,
      semana_seleccion VARCHAR(20)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_historial (
      id SERIAL PRIMARY KEY,
      numero_folio VARCHAR(50) NOT NULL,
      estatus VARCHAR(60) NOT NULL,
      comentario TEXT,
      actor_telefono VARCHAR(30),
      actor_rol VARCHAR(50),
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS presupuesto_semanal (
      semana VARCHAR(20) PRIMARY KEY,
      monto NUMERIC(14,2) NOT NULL,
      actualizado_por VARCHAR(150),
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    INSERT INTO roles (clave, nombre) VALUES
      ('GA','Gerente Administrativo'),
      ('GG','Gerente General'),
      ('ZP','Director ZP'),
      ('CDMX','Contralor CDMX')
    ON CONFLICT (clave) DO NOTHING;
  `);

  console.log("✅ Schema verificado.");
}

// =========================
// DB helpers
// =========================
async function getActorByPhone(fromRaw) {
  const tel = normalizeFrom(fromRaw);

  const sql = `
    SELECT
      u.telefono,
      u.nombre AS usuario_nombre,
      u.email AS email,
      u.activo,
      r.clave AS rol,
      r.nombre AS rol_nombre,
      p.id AS planta_id,
      p.clave AS planta_clave,
      p.nombre AS planta_nombre
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    LEFT JOIN plantas p ON p.id = u.planta_id
    WHERE u.telefono = $1 AND u.activo = TRUE
    LIMIT 1;
  `;
  const r = await pool.query(sql, [tel]);
  return r.rows[0] || null;
}

async function buildMonthlyFolioIdDB() {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const r = await client.query(
      "SELECT last_seq FROM folio_counters WHERE yyyymm=$1 FOR UPDATE",
      [yyyymm]
    );

    let nextSeq = 1;
    if (r.rowCount === 0) {
      await client.query(
        "INSERT INTO folio_counters (yyyymm, last_seq) VALUES ($1, $2)",
        [yyyymm, 1]
      );
      nextSeq = 1;
    } else {
      nextSeq = r.rows[0].last_seq + 1;
      await client.query(
        "UPDATE folio_counters SET last_seq=$2 WHERE yyyymm=$1",
        [yyyymm, nextSeq]
      );
    }

    await client.query("COMMIT");

    return `F-${yyyymm}-${String(nextSeq).padStart(3, "0")}`;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function crearFolioDB(payload) {
  const sql = `
    INSERT INTO folios
      (numero_folio, planta, descripcion, monto, estatus, creado_por, prioridad, urgente,
       beneficiario, categoria, subcategoria, unidad, cotizacion_adjunta, listo_para_depositar)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *;
  `;
  const params = [
    payload.numero_folio,
    payload.planta,
    payload.descripcion,
    payload.monto,
    payload.estatus,
    payload.creado_por,
    payload.prioridad || null,
    !!payload.urgente,
    payload.beneficiario || null,
    payload.categoria || null,
    payload.subcategoria || null,
    payload.unidad || null,
    !!payload.cotizacion_adjunta,
    !!payload.listo_para_depositar
  ];
  const r = await pool.query(sql, params);
  return r.rows[0];
}

async function obtenerFolioDB(numero_folio) {
  const r = await pool.query(
    `SELECT * FROM folios WHERE numero_folio = $1 ORDER BY id DESC LIMIT 1`,
    [numero_folio]
  );
  return r.rows[0] || null;
}

async function actualizarFolioDB(numero_folio, fields) {
  const keys = Object.keys(fields || {});
  if (!keys.length) return await obtenerFolioDB(numero_folio);

  const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(", ");
  const vals = keys.map((k) => fields[k]);

  const sql = `UPDATE folios SET ${sets} WHERE numero_folio=$1 RETURNING *`;
  const r = await pool.query(sql, [numero_folio, ...vals]);
  return r.rows[0] || null;
}

async function logHistorial({ numero_folio, estatus, comentario, actor }) {
  await pool.query(
    `INSERT INTO folio_historial (numero_folio, estatus, comentario, actor_telefono, actor_rol)
     VALUES ($1,$2,$3,$4,$5)`,
    [numero_folio, estatus, comentario || null, actor?.telefono || null, actor?.rol || null]
  );
}

// =========================
// Notificaciones WhatsApp salientes (Twilio REST)
// =========================
async function sendWhatsApp({ to, body }) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    return { ok: false, error: "twilio_vars_missing" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const data = new URLSearchParams();
  data.append("From", TWILIO_WHATSAPP_NUMBER);
  data.append("To", toTwilioWhatsapp(to));
  data.append("Body", body);

  const auth = { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN };
  const r = await axios.post(url, data, { auth });
  return { ok: true, sid: r.data.sid };
}

async function getRecipientsByRole({ roleClave, plantaClave }) {
  const role = String(roleClave || "").toUpperCase();

  let sql = `
    SELECT u.telefono, u.nombre, u.email, r.clave AS rol, p.clave AS planta_clave
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    LEFT JOIN plantas p ON p.id = u.planta_id
    WHERE u.activo=TRUE AND r.clave=$1
  `;
  const params = [role];

  if (role === "GA" || role === "GG") {
    sql += ` AND p.clave = $2`;
    params.push(String(plantaClave || "").toUpperCase());
  } else {
    sql += ` AND u.planta_id IS NULL`;
  }

  const r = await pool.query(sql, params);
  return r.rows || [];
}

// Regla ZP: al aprobar, notificar GA + GG de la planta del folio y CDMX corporativo.
async function notifyOnZPApproval({ folio, actor }) {
  const plantaClave = String(folio?.planta || "").trim().toUpperCase();
  const [gaList, ggList, cdmxList] = await Promise.all([
    getRecipientsByRole({ roleClave: "GA", plantaClave }),
    getRecipientsByRole({ roleClave: "GG", plantaClave }),
    getRecipientsByRole({ roleClave: "CDMX", plantaClave: null })
  ]);

  const recipients = [...gaList, ...ggList, ...cdmxList];
  if (!recipients.length) return { ok: false, error: "no_recipients" };

  const faltaCotizacion = !(folio?.cotizacion_adjunta === true) && !String(folio?.cotizacion_url || "").trim();
  const warningCot = faltaCotizacion ? "⚠️ Aún no tiene la cotización adjunta (PDF).\n" : "";
  const badge = urgentBadge(folio);

  const body =
    `${badge}✅ Folio APROBADO por Director ZP\n` +
    warningCot +
    `Folio: ${folio.numero_folio}\n` +
    `Planta: ${folio.planta}\n` +
    `Monto: ${folio.monto}\n` +
    `Estatus: ${folio.estatus}\n` +
    `Descripción: ${folio.descripcion}\n` +
    `Aprobó: ${actor.usuario_nombre} (ZP)\n\n` +
    `Consulta: estatus ${folio.numero_folio}`;

  for (const u of recipients) {
    await sendWhatsApp({ to: u.telefono, body });
  }

  await logHistorial({
    numero_folio: folio.numero_folio,
    estatus: folio.estatus,
    comentario: `Notificación ZP->GA/GG/CDMX. Falta cotización: ${faltaCotizacion ? "SI" : "NO"}`,
    actor
  });

  return { ok: true };
}

// =========================
// Twilio Media (descargar PDF) -> S3
// =========================
async function downloadTwilioMediaAsBuffer(mediaUrl) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio creds missing for media download");
  }
  const r = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN }
  });
  return Buffer.from(r.data);
}

async function uploadPdfToS3({ buffer, key, contentType = "application/pdf" }) {
  if (!S3_BUCKET || !AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error("S3 vars missing");
  }
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  await s3.send(cmd);

  // Guardamos un “s3://” estable. (Luego, si quieres links públicos/presigned, lo hacemos.)
  return `s3://${S3_BUCKET}/${key}`;
}

async function getS3ObjectAsBuffer(s3Url) {
  // s3://bucket/key
  const m = String(s3Url || "").match(/^s3:\/\/([^/]+)\/(.+)$/i);
  if (!m) throw new Error("Invalid s3 url");
  const Bucket = m[1];
  const Key = m[2];

  const cmd = new GetObjectCommand({ Bucket, Key });
  const resp = await s3.send(cmd);

  // resp.Body es stream
  const stream = resp.Body;
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// =========================
// Email (SendGrid)
// =========================
function buildResumenText(folios, semanaKey) {
  const lines = [];
  lines.push(`RESUMEN DE FOLIOS - ${semanaKey}`);
  lines.push(`Total: ${folios.length}`);
  lines.push("====================================");
  for (const f of folios) {
    lines.push(`${urgentBadge(f)}${f.numero_folio} | Planta:${f.planta} | $${f.monto} | ${f.estatus}`);
    lines.push(`  ${f.descripcion}`);
    lines.push(`  Cotización: ${f.cotizacion_adjunta ? "SI" : "NO"}`);
    lines.push("----");
  }
  return lines.join("\n");
}

async function sendWeeklyEmailWithPdfs({ toEmail, actor, semanaKey }) {
  if (!SENDGRID_API_KEY || !FROM_EMAIL) throw new Error("SendGrid not configured");
  if (!toEmail) throw new Error("No email for user");

  const r = await pool.query(
    `SELECT * FROM folios
     WHERE seleccionado_semana = TRUE AND semana_seleccion = $1
     ORDER BY urgente DESC, monto DESC, id ASC`,
    [semanaKey]
  );
  const folios = r.rows || [];

  if (!folios.length) {
    return { ok: false, reason: "no_folios" };
  }

  // “Resumen imprimible” en texto simple (rápido y estable).
  // Si luego quieres PDF bonito, lo cambiamos a PDFKit/HTML->PDF.
  const resumenTxt = buildResumenText(folios, semanaKey);
  const resumenAttachment = {
    content: Buffer.from(resumenTxt, "utf-8").toString("base64"),
    filename: `Resumen_${semanaKey}.txt`,
    type: "text/plain",
    disposition: "attachment"
  };

  // Adjuntar cotizaciones PDF
  const pdfAttachments = [];
  for (const f of folios) {
    if (f.cotizacion_adjunta && f.cotizacion_url) {
      try {
        const pdfBuf = await getS3ObjectAsBuffer(f.cotizacion_url);
        pdfAttachments.push({
          content: pdfBuf.toString("base64"),
          filename: `${f.numero_folio}_Cotizacion.pdf`,
          type: "application/pdf",
          disposition: "attachment"
        });
      } catch (e) {
        // Si falla un PDF, no reventamos todo; lo registramos
        await logHistorial({
          numero_folio: f.numero_folio,
          estatus: f.estatus,
          comentario: `ERROR adjunto PDF al correo: ${String(e?.message || e)}`,
          actor
        });
      }
    }
  }

  const msg = {
    to: toEmail,
    from: FROM_EMAIL,
    subject: `Folios seleccionados para pago - ${semanaKey}`,
    text:
      `Hola ${actor.usuario_nombre},\n\n` +
      `Adjunto resumen y cotizaciones PDF de los folios seleccionados para pago (${semanaKey}).\n\n` +
      `Total folios: ${folios.length}\n` +
      `\nSaludos.`,
    attachments: [resumenAttachment, ...pdfAttachments]
  };

  await sgMail.send(msg);

  return { ok: true, total: folios.length, pdfs: pdfAttachments.length };
}

// =========================
// Captura guiada (RAM)
// =========================
const drafts = {}; // drafts[telefono] = { concepto, prioridad, beneficiario, importe, categoria, subcategoria, unidad }

// =========================
// Endpoints básicos
// =========================
app.get("/", (req, res) => res.send("Bot de folios activo 🚀"));

app.get("/health-db", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() as ahora");
    res.json({ ok: true, ahora: r.rows[0].ahora });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get("/folio/:numero", async (req, res) => {
  try {
    const folio = await obtenerFolioDB(req.params.numero);
    if (!folio) return res.status(404).json({ ok: false, error: "No existe" });
    res.json({ ok: true, folio });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// =========================
// Webhook WhatsApp
// =========================
app.post("/webhook", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const fromRaw = req.body.From || "unknown";
  const from = normalizeFrom(fromRaw);
  const message = incomingMsg.toLowerCase();

  try {
    const actor = await getActorByPhone(fromRaw);
    if (!actor) {
      res.set("Content-Type", "text/xml");
      return res.send(twiml(`Tu número no está registrado. Tel detectado: ${from}`));
    }

    // ==========================================
    // 1) Manejo de PDF entrante (cotización)
    // ==========================================
    const numMedia = Number(req.body.NumMedia || 0);
    if (numMedia > 0) {
      const ct = String(req.body.MediaContentType0 || "").toLowerCase();
      const mediaUrl = String(req.body.MediaUrl0 || "");
      const folioId = parseFolioId(incomingMsg); // Requiere caption "cotizacion F-xxxx"

      if (!folioId) {
        res.set("Content-Type", "text/xml");
        return res.send(
          twiml(
            "Recibí un archivo, pero necesito que lo mandes con el folio.\n" +
            "Ejemplo: cotizacion F-202602-001\n" +
            "(en el texto/caption del mensaje)"
          )
        );
      }

      if (ct !== "application/pdf") {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Por ahora solo acepto PDF para cotización."));
      }

      const folio = await obtenerFolioDB(folioId);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${folioId}.`));
      }

      // descargar PDF desde Twilio y subir a S3
      const pdfBuf = await downloadTwilioMediaAsBuffer(mediaUrl);
      const s3Key = `cotizaciones/${folioId}/${Date.now()}_cotizacion.pdf`;
      const s3Url = await uploadPdfToS3({ buffer: pdfBuf, key: s3Key });

      // marcar cotización adjunta
      const updated = await actualizarFolioDB(folioId, {
        cotizacion_url: s3Url,
        cotizacion_adjunta: true,
        cotizacion_nombre: "cotizacion.pdf",
        cotizacion_subida_por: `${actor.usuario_nombre} (${actor.rol})`,
        cotizacion_subida_en: new Date(),
        // Listo para depositar si ya estaba aprobado (criterio mínimo)
        listo_para_depositar: String(folio.estatus || "").toLowerCase().includes("aprobado") ? true : folio.listo_para_depositar
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: updated.estatus,
        comentario: `Cotización PDF adjunta. S3: ${s3Url}`,
        actor
      });

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `${urgentBadge(updated)}✅ Cotización adjuntada al folio ${folioId}.\n` +
          `Estado: ${updated.estatus}\n` +
          `Listo para depositar: ${updated.listo_para_depositar ? "SI" : "NO"}`
        )
      );
    }

    // ==========================================
    // 2) estatus
    // ==========================================
    if (message.startsWith("estatus")) {
      const folioId = parseFolioId(incomingMsg) || incomingMsg.replace(/estatus/i, "").trim().toUpperCase();
      const folio = await obtenerFolioDB(folioId);
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          folio
            ? `${urgentBadge(folio)}Folio: ${folio.numero_folio}\nPlanta: ${folio.planta}\nEstatus: ${folio.estatus}\nMonto: ${folio.monto}\nCotización: ${folio.cotizacion_adjunta ? "SI" : "NO"}\nSeleccionado semana: ${folio.seleccionado_semana ? folio.semana_seleccion : "NO"}\nDesc: ${folio.descripcion}`
            : `No encontré el folio ${folioId}`
        )
      );
    }

    // ==========================================
    // 3) Crear folio (captura guiada)
    // ==========================================
    if (message.includes("crear folio")) {
      drafts[from] = drafts[from] || {};
      drafts[from].prioridad = message.includes("urgente") ? "Urgente no programado" : "Normal";

      const concepto = incomingMsg.replace(/crear folio/i, "").trim();
      if (concepto) drafts[from].concepto = concepto;

      Object.assign(drafts[from], parseKeyValueLines(incomingMsg));

      const miss = missingFields(drafts[from]);
      const plantaDetectada = actor.planta_clave || "CORPORATIVO";

      if (miss.length) {
        res.set("Content-Type", "text/xml");
        return res.send(
          twiml(
            `Ok. Para crear el folio me falta: ${miss.join(", ")}.\n` +
            `Respóndeme en líneas:\n` +
            `Beneficiario: ____\nImporte: ____\nCategoría: ____\nSubcategoría: ____\n` +
            (String(drafts[from].categoria || "").toLowerCase().includes("taller") ? `Unidad: AT-03 o C-03\n` : "") +
            `Planta detectada: ${plantaDetectada} | Rol: ${actor.rol}`
          )
        );
      }

      const d = drafts[from];
      const folioId = await buildMonthlyFolioIdDB();
      const monto = moneyToNumber(d.importe);
      const prioridad = d.prioridad || "Normal";
      const urgente = prioridad.toLowerCase().includes("urgente");

      const guardado = await crearFolioDB({
        numero_folio: folioId,
        planta: plantaDetectada,
        descripcion: d.concepto,
        monto,
        estatus: "Generado",
        creado_por: `${actor.usuario_nombre} (${actor.rol})`,
        prioridad,
        urgente,
        beneficiario: d.beneficiario,
        categoria: d.categoria,
        subcategoria: d.subcategoria,
        unidad: d.unidad,
        cotizacion_adjunta: false,
        listo_para_depositar: false
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: "Generado",
        comentario: `Creado. Prioridad:${prioridad}. Cotización: NO.`,
        actor
      });

      delete drafts[from];

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `${urgentBadge(guardado)}✅ Folio ${guardado.numero_folio} creado.\n` +
          `Planta: ${guardado.planta}\nMonto: ${guardado.monto}\n` +
          `Cotización: NO (manda PDF con: cotizacion ${guardado.numero_folio})\n` +
          `Para consultar: estatus ${guardado.numero_folio}`
        )
      );
    }

    // Continuación de borrador
    if (drafts[from]) {
      Object.assign(drafts[from], parseKeyValueLines(incomingMsg));
      const miss = missingFields(drafts[from]);
      const plantaDetectada = actor.planta_clave || "CORPORATIVO";

      res.set("Content-Type", "text/xml");
      if (miss.length) {
        return res.send(twiml(`Me falta: ${miss.join(", ")}. Planta: ${plantaDetectada}`));
      }

      const d = drafts[from];
      const folioId = await buildMonthlyFolioIdDB();
      const monto = moneyToNumber(d.importe);
      const prioridad = d.prioridad || "Normal";
      const urgente = prioridad.toLowerCase().includes("urgente");

      const guardado = await crearFolioDB({
        numero_folio: folioId,
        planta: plantaDetectada,
        descripcion: d.concepto,
        monto,
        estatus: "Generado",
        creado_por: `${actor.usuario_nombre} (${actor.rol})`,
        prioridad,
        urgente,
        beneficiario: d.beneficiario,
        categoria: d.categoria,
        subcategoria: d.subcategoria,
        unidad: d.unidad,
        cotizacion_adjunta: false,
        listo_para_depositar: false
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: "Generado",
        comentario: `Creado desde borrador. Prioridad:${prioridad}.`,
        actor
      });

      delete drafts[from];

      return res.send(twiml(`${urgentBadge(guardado)}✅ Folio ${guardado.numero_folio} creado. Cotización: NO.`));
    }

    // ==========================================
    // 4) Aprobar (ZP notifica GA+GG+CDMX)
    // ==========================================
    if (message.startsWith("aprobar")) {
      const folioId = parseFolioId(incomingMsg) || incomingMsg.replace(/aprobar/i, "").trim().toUpperCase();
      const folio = await obtenerFolioDB(folioId);

      res.set("Content-Type", "text/xml");
      if (!folio) return res.send(twiml(`No encontré el folio ${folioId}`));

      const nuevoEstatus = `Aprobado ${actor.rol}`;
      const listo = folio.cotizacion_adjunta === true; // listo si ya tiene cotización

      const updated = await actualizarFolioDB(folioId, {
        estatus: nuevoEstatus,
        listo_para_depositar: listo
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: nuevoEstatus,
        comentario: `Aprobado por ${actor.usuario_nombre} (${actor.rol}).`,
        actor
      });

      if (String(actor.rol).toUpperCase() === "ZP") {
        await notifyOnZPApproval({ folio: updated, actor });
      }

      const faltaCot = !(updated.cotizacion_adjunta === true);
      const aviso = faltaCot ? "\n⚠️ Aún no tiene cotización PDF adjunta." : "\n✅ Ya tiene cotización PDF adjunta.";

      return res.send(
        twiml(
          `${urgentBadge(updated)}✅ Folio ${folioId} aprobado.\nEstatus: ${nuevoEstatus}${aviso}\n` +
          `Listo para depositar: ${updated.listo_para_depositar ? "SI" : "NO"}`
        )
      );
    }

    // ==========================================
    // 5) Contralor CDMX: presupuesto semanal
    //    "presupuesto 250000"
    // ==========================================
    if (message.startsWith("presupuesto")) {
      if (String(actor.rol).toUpperCase() !== "CDMX") {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Solo el Contralor CDMX puede definir el presupuesto semanal."));
      }

      const amount = moneyToNumber(incomingMsg.replace(/presupuesto/i, ""));
      const semanaKey = isoWeekKeyCDMX();

      await pool.query(
        `INSERT INTO presupuesto_semanal (semana, monto, actualizado_por)
         VALUES ($1,$2,$3)
         ON CONFLICT (semana) DO UPDATE SET monto=$2, actualizado_por=$3, actualizado_en=NOW()`,
        [semanaKey, amount, `${actor.usuario_nombre} (CDMX)`]
      );

      res.set("Content-Type", "text/xml");
      return res.send(twiml(`✅ Presupuesto semanal definido: $${amount} para ${semanaKey}`));
    }

    // ==========================================
    // 6) Contralor CDMX: seleccionar folio para pagar esta semana
    //    "seleccionar F-202602-001"
    // ==========================================
    if (message.startsWith("seleccionar")) {
      if (String(actor.rol).toUpperCase() !== "CDMX") {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Solo el Contralor CDMX puede seleccionar folios para pago semanal."));
      }

      const folioId = parseFolioId(incomingMsg) || incomingMsg.replace(/seleccionar/i, "").trim().toUpperCase();
      const folio = await obtenerFolioDB(folioId);

      res.set("Content-Type", "text/xml");
      if (!folio) return res.send(twiml(`No encontré el folio ${folioId}`));

      if (!folio.listo_para_depositar) {
        return res.send(
          twiml(
            `⚠️ El folio ${folioId} aún NO está listo para depositar.\n` +
            `Requisitos: aprobado + cotización adjunta.\n` +
            `Cotización: ${folio.cotizacion_adjunta ? "SI" : "NO"} | Estatus: ${folio.estatus}`
          )
        );
      }

      const semanaKey = isoWeekKeyCDMX();
      const updated = await actualizarFolioDB(folioId, {
        seleccionado_semana: true,
        semana_seleccion: semanaKey,
        estatus: "Seleccionado para pago semanal"
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: updated.estatus,
        comentario: `Seleccionado para pagar en ${semanaKey}.`,
        actor
      });

      return res.send(twiml(`${urgentBadge(updated)}✅ Folio ${folioId} seleccionado para pago en ${semanaKey}.`));
    }

    // ==========================================
    // 7) Enviar correo con folios seleccionados esta semana
    //    "correo semana"
    // ==========================================
    if (message.startsWith("correo")) {
      const semanaKey = isoWeekKeyCDMX();
      const toEmail = actor.email;

      res.set("Content-Type", "text/xml");
      if (!toEmail) {
        return res.send(twiml("No tengo tu email en la base de datos. Pide a IT que lo capture en usuarios.email."));
      }

      const result = await sendWeeklyEmailWithPdfs({ toEmail, actor, semanaKey });

      if (!result.ok && result.reason === "no_folios") {
        return res.send(twiml(`No hay folios seleccionados para pago en ${semanaKey}.`));
      }

      return res.send(
        twiml(
          `✅ Listo. Envié a tu correo (${toEmail}) los folios seleccionados de ${semanaKey}.\n` +
          `Folios: ${result.total} | PDFs adjuntos: ${result.pdfs}`
        )
      );
    }

    // ==========================================
    // 8) Fallback: comandos disponibles
    // ==========================================
    res.set("Content-Type", "text/xml");
    return res.send(
      twiml(
        "Comandos:\n" +
        "- crear folio <concepto> (y luego campos)\n" +
        "- estatus F-YYYYMM-XXX\n" +
        "- aprobar F-YYYYMM-XXX\n" +
        "- (PDF) manda cotización con texto: cotizacion F-YYYYMM-XXX\n" +
        "- (CDMX) presupuesto 250000\n" +
        "- (CDMX) seleccionar F-YYYYMM-XXX\n" +
        "- correo semana\n"
      )
    );
  } catch (error) {
    console.error("❌ Error webhook:", error?.response?.data || error?.message || error);
    res.set("Content-Type", "text/xml");
    return res.send(twiml("Error procesando solicitud. Intenta de nuevo en 1 minuto."));
  }
});

// =========================
// Startup
// =========================
(async () => {
  try {
    await ensureSchema();
  } catch (e) {
    console.error("❌ Error ensureSchema:", e?.message || e);
  }
})();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Servidor corriendo en puerto " + PORT));
