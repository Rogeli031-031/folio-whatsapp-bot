// server.js
// WhatsApp (Twilio) + PostgreSQL (Render) + S3 (cotizaciones) + OpenAI (opcional)
//
// Comandos:
// - crear folio <concepto> [urgente]
// - estatus F-YYYYMM-001
// - aprobar F-YYYYMM-001              (solo ZP)
// - cotizacion F-YYYYMM-001           (mandar PDF/archivo en el mismo mensaje o inmediatamente después)
// - ayuda

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { Pool } = require("pg");

// Twilio + AWS S3
let twilioClient = null;
let S3Client = null;
let PutObjectCommand = null;
let GetObjectCommand = null;
let getSignedUrl = null;

try {
  const twilio = require("twilio");
  const { S3Client: _S3Client, PutObjectCommand: _Put, GetObjectCommand: _Get } = require("@aws-sdk/client-s3");
  const { getSignedUrl: _getSignedUrl } = require("@aws-sdk/s3-request-presigner");
  S3Client = _S3Client;
  PutObjectCommand = _Put;
  GetObjectCommand = _Get;
  getSignedUrl = _getSignedUrl;

  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  if (sid && token) twilioClient = twilio(sid, token);
} catch (e) {
  // Si no está instalado aún, el deploy falla. Por eso package.json debe incluir dependencias.
}

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || ""; // "whatsapp:+14155238886"
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "";
const S3_BUCKET = process.env.S3_BUCKET || "";

if (!DATABASE_URL) console.error("❌ Falta DATABASE_URL en Render.");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
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
  // Twilio WhatsApp -> "whatsapp:+521..."
  return String(from || "").replace(/^whatsapp:/i, "").trim();
}

function isPdfLike(contentType, filename) {
  const ct = String(contentType || "").toLowerCase();
  const fn = String(filename || "").toLowerCase();
  return ct.includes("pdf") || fn.endsWith(".pdf");
}

function moneyToNumber(v) {
  const s = String(v || "").replace(/,/g, "").replace(/[^0-9.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function urgentIcon(prioridad) {
  return String(prioridad || "").toLowerCase().includes("urgente") ? "🚨 " : "";
}

function nowYyyymm() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

// =========================
// 1) Schema (crea/ajusta sin borrar)
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
      nombre VARCHAR(100) NOT NULL,
      nivel INT NOT NULL DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      telefono VARCHAR(30) UNIQUE NOT NULL,
      nombre VARCHAR(120) NOT NULL,
      email VARCHAR(160),                           -- ✅ FIX: ahora existe
      planta_id INT NULL REFERENCES plantas(id),
      rol_id INT NOT NULL REFERENCES roles(id),
      activo BOOLEAN DEFAULT TRUE,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ✅ Si tu tabla usuarios ya existía sin email, esto la corrige:
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(160);`);

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
      planta VARCHAR(50),
      descripcion TEXT,
      monto NUMERIC(12,2),
      estatus VARCHAR(50),
      creado_por VARCHAR(120),
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // columnas nuevas (si no existen)
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS prioridad VARCHAR(60);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS beneficiario VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS categoria VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS unidad VARCHAR(50);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS cotizacion_url TEXT;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS cotizacion_s3key TEXT;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS aprobado_por VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS aprobado_en TIMESTAMP;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_historial (
      id SERIAL PRIMARY KEY,
      numero_folio VARCHAR(50) NOT NULL,
      estatus VARCHAR(50) NOT NULL,
      comentario TEXT,
      actor_telefono VARCHAR(30),
      actor_rol VARCHAR(50),
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id SERIAL PRIMARY KEY,
      numero_folio VARCHAR(50) NOT NULL,
      comentario TEXT NOT NULL,
      actor_telefono VARCHAR(30),
      actor_rol VARCHAR(50),
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Roles base (solo si no existen) ✅ incluye nivel
  await pool.query(`
    INSERT INTO roles (clave, nombre, nivel) VALUES
      ('GA','Gerente Administrativo', 10),
      ('GG','Gerente General',        20),
      ('ZP','Director ZP',            30),
      ('CDMX','Contralor CDMX',       40)
    ON CONFLICT (clave) DO NOTHING;
  `);

  console.log("✅ Schema verificado (tablas listas).");
}

// =========================
// 2) Identidad por teléfono
// =========================
async function getActorByPhone(fromRaw) {
  const tel = normalizeFrom(fromRaw);

  const sql = `
    SELECT
      u.telefono,
      u.nombre AS usuario_nombre,
      u.email AS usuario_email,
      u.activo,
      r.clave AS rol,
      r.nombre AS rol_nombre,
      r.nivel AS rol_nivel,
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

// =========================
// 3) Consecutivo mensual
// =========================
async function buildMonthlyFolioIdDB() {
  const yyyymm = nowYyyymm();

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

// =========================
// 4) CRUD folios
// =========================
async function crearFolioDB(data) {
  const sql = `
    INSERT INTO folios
      (numero_folio, planta, descripcion, monto, estatus, creado_por, prioridad, beneficiario, categoria, subcategoria, unidad)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *;
  `;
  const params = [
    data.numero_folio,
    data.planta,
    data.descripcion,
    data.monto,
    data.estatus,
    data.creado_por,
    data.prioridad || null,
    data.beneficiario || null,
    data.categoria || null,
    data.subcategoria || null,
    data.unidad || null,
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

async function aprobarFolioDB(numero_folio, aprobado_por) {
  const r = await pool.query(
    `UPDATE folios
     SET estatus='Aprobado', aprobado_por=$2, aprobado_en=NOW()
     WHERE numero_folio=$1
     RETURNING *;`,
    [numero_folio, aprobado_por]
  );
  return r.rows[0] || null;
}

async function setCotizacionDB(numero_folio, { url, s3key }) {
  const r = await pool.query(
    `UPDATE folios
     SET cotizacion_url=$2, cotizacion_s3key=$3
     WHERE numero_folio=$1
     RETURNING *;`,
    [numero_folio, url || null, s3key || null]
  );
  return r.rows[0] || null;
}

async function logHistorial({ numero_folio, estatus, comentario, actor }) {
  await pool.query(
    `INSERT INTO folio_historial (numero_folio, estatus, comentario, actor_telefono, actor_rol)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      numero_folio,
      estatus,
      comentario || null,
      actor?.telefono || null,
      actor?.rol || null,
    ]
  );
}

// =========================
// 5) Notificaciones WhatsApp (Twilio)
// =========================
function twilioReady() {
  return !!(twilioClient && TWILIO_WHATSAPP_NUMBER);
}

async function sendWhatsApp(toPhoneE164, body) {
  if (!twilioReady()) return false;
  const to = `whatsapp:${toPhoneE164}`;
  await twilioClient.messages.create({
    from: TWILIO_WHATSAPP_NUMBER,
    to,
    body,
  });
  return true;
}

// Obtiene teléfonos por rol. Para GA/GG: preferimos misma planta; para CDMX: puede venir sin planta
async function getRecipientsForAprobado(plantaClave) {
  const sql = `
    SELECT u.telefono, r.clave AS rol, p.clave AS planta
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    LEFT JOIN plantas p ON p.id = u.planta_id
    WHERE u.activo = TRUE
      AND (
        (r.clave IN ('GA','GG') AND p.clave = $1)
        OR
        (r.clave = 'CDMX')
      );
  `;
  const r = await pool.query(sql, [plantaClave]);
  return r.rows || [];
}

// =========================
// 6) S3 (subir cotización)
// =========================
function s3Ready() {
  return !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION && S3_BUCKET && S3Client);
}

function buildS3() {
  return new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
}

// Descarga media de Twilio (requiere auth)
async function downloadTwilioMedia(mediaUrl) {
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  if (!sid || !token) throw new Error("Twilio creds faltantes para descargar media");

  const r = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    auth: { username: sid, password: token },
  });

  const contentType = r.headers["content-type"] || "application/octet-stream";
  return { buffer: Buffer.from(r.data), contentType };
}

async function uploadToS3({ key, buffer, contentType }) {
  const s3 = buildS3();
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // URL firmada (1 día) para consulta/descarga si bucket no es público
  const signed = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn: 60 * 60 * 24 }
  );

  return signed;
}

// =========================
// 7) Captura guiada (RAM)
// =========================
const drafts = {};      // drafts[telefono] = { ...campos }
const pendingQuote = {}; // pendingQuote[telefono] = { folio: "F-..." }

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
// 8) Endpoints
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

// =========================
// 9) Webhook Twilio WhatsApp
// =========================
app.post("/webhook", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const fromRaw = req.body.From || "unknown";
  const from = normalizeFrom(fromRaw);
  const message = incomingMsg.toLowerCase();

  // Media (para cotizaciones)
  const numMedia = Number(req.body.NumMedia || 0);
  const mediaUrl0 = req.body.MediaUrl0;
  const mediaType0 = req.body.MediaContentType0;

  try {
    // 9.1 Identificar usuario
    const actor = await getActorByPhone(fromRaw);
    if (!actor) {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          "Tu número no está registrado en el sistema.\n" +
          "Pide a IT que te dé de alta con: Planta + Rol + Nombre + Teléfono.\n" +
          "Ejemplo roles: GA, GG, ZP, CDMX."
        )
      );
    }

    const plantaDetectada = actor.planta_clave || "CORPORATIVO";

    // Avisos de configuración (solo log)
    if (!twilioReady()) console.warn("⚠️ Falta Twilio vars (no podrá notificar).");
    if (!s3Ready()) console.warn("⚠️ Falta AWS/S3 vars (no podrá subir cotizaciones).");

    // 9.2 Si el usuario mandó un PDF y está "pendiente" de cotización
    if (numMedia > 0 && pendingQuote[from]?.folio) {
      const folioNum = pendingQuote[from].folio;
      const folio = await obtenerFolioDB(folioNum);

      res.set("Content-Type", "text/xml");

      if (!folio) {
        delete pendingQuote[from];
        return res.send(twiml(`No encontré el folio ${folioNum}.`));
      }

      if (!s3Ready()) {
        return res.send(
          twiml(
            "Recibí el archivo, pero falta configurar AWS/S3 en Render.\n" +
            "Agrega: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION y S3_BUCKET."
          )
        );
      }

      const { buffer, contentType } = await downloadTwilioMedia(mediaUrl0);

      const key = `cotizaciones/${folioNum}/${Date.now()}-${from}.pdf`;
      const signedUrl = await uploadToS3({ key, buffer, contentType });

      const updated = await setCotizacionDB(folioNum, { url: signedUrl, s3key: key });

      await logHistorial({
        numero_folio: folioNum,
        estatus: updated.estatus || "Actualizado",
        comentario: `Cotización adjunta desde WhatsApp (S3 key: ${key})`,
        actor
      });

      delete pendingQuote[from];
      return res.send(
        twiml(`✅ Cotización adjunta al folio ${folioNum}.\n(Ya quedó ligada al folio.)`)
      );
    }

    // 9.3 Comando: ayuda
    if (message === "ayuda" || message === "help") {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          "Comandos:\n" +
          "- crear folio <concepto> [urgente]\n" +
          "- estatus <F-YYYYMM-XXX>\n" +
          "- aprobar <F-YYYYMM-XXX> (solo ZP)\n" +
          "- cotizacion <F-YYYYMM-XXX> (manda PDF)\n"
        )
      );
    }

    // 9.4 Comando: estatus F-YYYYMM-001
    if (message.startsWith("estatus")) {
      const num = incomingMsg.replace(/estatus/i, "").trim();
      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          folio
            ? `${urgentIcon(folio.prioridad)}Folio: ${folio.numero_folio}\n` +
              `Planta: ${folio.planta}\nEstatus: ${folio.estatus}\nMonto: ${folio.monto}\n` +
              `Concepto: ${folio.descripcion}\n` +
              `Cotización: ${folio.cotizacion_url ? "✅ Adjunta" : "❌ No adjunta"}\n` +
              `Creado: ${folio.fecha_creacion}`
            : `No encontré el folio ${num}`
        )
      );
    }

    // 9.5 Comando: cotizacion F-XXXX (deja “pendiente” para que el siguiente mensaje sea el PDF)
    if (message.startsWith("cotizacion")) {
      const num = incomingMsg.replace(/cotizacion/i, "").trim();
      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      if (!folio) return res.send(twiml(`No encontré el folio ${num}`));

      // Si ya venía el archivo en el mismo mensaje
      if (numMedia > 0 && mediaUrl0) {
        if (!s3Ready()) {
          return res.send(
            twiml(
              "Recibí el archivo, pero falta configurar AWS/S3 en Render.\n" +
              "Agrega: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION y S3_BUCKET."
            )
          );
        }

        const { buffer, contentType } = await downloadTwilioMedia(mediaUrl0);
        const key = `cotizaciones/${num}/${Date.now()}-${from}.pdf`;
        const signedUrl = await uploadToS3({ key, buffer, contentType });

        await setCotizacionDB(num, { url: signedUrl, s3key: key });
        await logHistorial({
          numero_folio: num,
          estatus: folio.estatus || "Actualizado",
          comentario: `Cotización adjunta desde WhatsApp (S3 key: ${key})`,
          actor
        });

        return res.send(twiml(`✅ Cotización adjunta al folio ${num}.`));
      }

      pendingQuote[from] = { folio: num };
      return res.send(
        twiml(
          `Ok. Ahora mándame el PDF/archivo de la cotización para el folio ${num}.\n` +
          `(En el siguiente mensaje adjunta el documento.)`
        )
      );
    }

    // 9.6 Comando: aprobar (solo ZP)
    if (message.startsWith("aprobar")) {
      const num = incomingMsg.replace(/aprobar/i, "").trim();
      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      if (!folio) return res.send(twiml(`No encontré el folio ${num}`));

      if (actor.rol !== "ZP") {
        return res.send(twiml("Solo el Director ZP puede aprobar folios."));
      }

      const aprobadoPor = `${actor.usuario_nombre} (ZP)`;
      const updated = await aprobarFolioDB(num, aprobadoPor);

      await logHistorial({
        numero_folio: num,
        estatus: "Aprobado",
        comentario: `Aprobado por ${aprobadoPor}`,
        actor
      });

      // Notificar GA, GG, CDMX
      const recips = await getRecipientsForAprobado(updated.planta);

      const prefix = urgentIcon(updated.prioridad);
      const msgBase =
        `${prefix}✅ Folio APROBADO: ${updated.numero_folio}\n` +
        `Planta: ${updated.planta}\n` +
        `Monto: ${updated.monto}\n` +
        `Concepto: ${updated.descripcion}\n` +
        `Prioridad: ${updated.prioridad || "Normal"}\n` +
        `Cotización: ${updated.cotizacion_url ? "✅ Adjunta" : "❌ NO adjunta"}\n` +
        `Aprobó: ${updated.aprobado_por}\n`;

      // Si no tiene cotización -> incluir aviso especial
      const msgFinal = updated.cotizacion_url
        ? msgBase
        : (msgBase + "\n⚠️ Aún no tiene la cotización adjunta.");

      // Enviar notificaciones si Twilio listo
      if (twilioReady()) {
        for (const u of recips) {
          await sendWhatsApp(u.telefono, msgFinal);
        }
      }

      return res.send(
        twiml(
          `✅ Aprobado ${updated.numero_folio}.\n` +
          `Notifiqué a GA/GG de ${updated.planta} y a Contralor CDMX ` +
          `${twilioReady() ? "✅" : "(pero faltan vars de Twilio)"}.\n` +
          `${updated.cotizacion_url ? "" : "⚠️ Aún no tiene la cotización adjunta."}`
        )
      );
    }

    // 9.7 Crear folio (captura guiada)
    if (message.includes("crear folio")) {
      drafts[from] = drafts[from] || {};

      drafts[from].prioridad = message.includes("urgente")
        ? "Urgente"
        : "Normal";

      // Concepto: lo que venga después de "crear folio"
      const concepto = incomingMsg.replace(/crear folio/i, "").trim();
      if (concepto) drafts[from].concepto = concepto;

      // parse key: value
      Object.assign(drafts[from], parseKeyValueLines(incomingMsg));

      const miss = missingFields(drafts[from]);
      if (miss.length) {
        res.set("Content-Type", "text/xml");
        return res.send(
          twiml(
            `Ok. Para crear el folio me falta: ${miss.join(", ")}.\n` +
            `Respóndeme en líneas así:\n` +
            `Beneficiario: ____\n` +
            `Importe: ____\n` +
            `Categoría: Gastos / Inversiones / Derechos y Obligaciones / Taller\n` +
            `Subcategoría: ____\n` +
            (String(drafts[from].categoria || "").toLowerCase().includes("taller") ? `Unidad: AT-03 o C-03\n` : "") +
            `Planta detectada: ${plantaDetectada}\nRol: ${actor.rol}`
          )
        );
      }

      const folioId = await buildMonthlyFolioIdDB();
      const d = drafts[from];
      const monto = moneyToNumber(d.importe);

      const guardado = await crearFolioDB({
        numero_folio: folioId,
        planta: plantaDetectada,
        descripcion: d.concepto,
        monto,
        estatus: "Generado",
        creado_por: `${actor.usuario_nombre} (${actor.rol})`,
        prioridad: d.prioridad,
        beneficiario: d.beneficiario,
        categoria: d.categoria,
        subcategoria: d.subcategoria,
        unidad: d.unidad
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: "Generado",
        comentario:
          `Creado desde WhatsApp. Prioridad: ${d.prioridad}. ` +
          `Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}` +
          (d.unidad ? ` Unidad:${d.unidad}` : ""),
        actor
      });

      delete drafts[from];

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `${urgentIcon(guardado.prioridad)}✅ Folio ${guardado.numero_folio} creado.\n\n` +
          `Planta: ${guardado.planta}\n` +
          `Creado por: ${guardado.creado_por}\n` +
          `Concepto: ${guardado.descripcion}\n` +
          `Beneficiario: ${guardado.beneficiario}\n` +
          `Monto: ${guardado.monto}\n` +
          `Categoría: ${guardado.categoria}\n` +
          `Subcategoría: ${guardado.subcategoria}\n` +
          (guardado.unidad ? `Unidad: ${guardado.unidad}\n` : "") +
          `Prioridad: ${guardado.prioridad}\n\n` +
          `Adjuntar cotización: "cotizacion ${guardado.numero_folio}" y manda el PDF.\n` +
          `Consultar: "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // 9.8 Si hay borrador abierto, el usuario está completando campos
    if (drafts[from]) {
      Object.assign(drafts[from], parseKeyValueLines(incomingMsg));
      const miss = missingFields(drafts[from]);

      res.set("Content-Type", "text/xml");
      if (miss.length) {
        return res.send(
          twiml(
            `Me falta: ${miss.join(", ")}.\n` +
            `Respóndeme solo esos campos (ej: "Importe: 25000").\n` +
            `Planta detectada: ${plantaDetectada}`
          )
        );
      }

      const folioId = await buildMonthlyFolioIdDB();
      const d = drafts[from];
      const monto = moneyToNumber(d.importe);

      const guardado = await crearFolioDB({
        numero_folio: folioId,
        planta: plantaDetectada,
        descripcion: d.concepto,
        monto,
        estatus: "Generado",
        creado_por: `${actor.usuario_nombre} (${actor.rol})`,
        prioridad: d.prioridad,
        beneficiario: d.beneficiario,
        categoria: d.categoria,
        subcategoria: d.subcategoria,
        unidad: d.unidad
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: "Generado",
        comentario:
          `Creado desde borrador. Prioridad: ${d.prioridad}. ` +
          `Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}` +
          (d.unidad ? ` Unidad:${d.unidad}` : ""),
        actor
      });

      delete drafts[from];

      return res.send(
        twiml(
          `${urgentIcon(guardado.prioridad)}✅ Folio ${guardado.numero_folio} creado.\n\n` +
          `Planta: ${guardado.planta}\n` +
          `Creado por: ${guardado.creado_por}\n` +
          `Concepto: ${guardado.descripcion}\n` +
          `Beneficiario: ${guardado.beneficiario}\n` +
          `Monto: ${guardado.monto}\n` +
          `Categoría: ${guardado.categoria}\n` +
          `Subcategoría: ${guardado.subcategoria}\n` +
          (guardado.unidad ? `Unidad: ${guardado.unidad}\n` : "") +
          `Prioridad: ${guardado.prioridad || "Normal"}\n\n` +
          `Adjuntar cotización: "cotizacion ${guardado.numero_folio}" y manda el PDF.\n` +
          `Consultar: "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // 9.9 Fallback: OpenAI opcional
    if (!OPENAI_API_KEY) {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          "Comandos disponibles:\n" +
          "- crear folio <concepto> [urgente]\n" +
          "- estatus <F-YYYYMM-XXX>\n" +
          "- aprobar <F-YYYYMM-XXX> (solo ZP)\n" +
          "- cotizacion <F-YYYYMM-XXX> (manda PDF)\n"
        )
      );
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente corporativo para gestión de folios. " +
              "Responde breve, claro y profesional. Si piden estatus sugiere: 'estatus F-YYYYMM-XXX'."
          },
          { role: "user", content: incomingMsg }
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.choices?.[0]?.message?.content || "Ok.";
    res.set("Content-Type", "text/xml");
    return res.send(twiml(reply));
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
