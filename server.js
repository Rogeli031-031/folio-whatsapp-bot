// server.js
// Bot WhatsApp (Twilio) + PostgreSQL (Render) + S3 (AWS)
// - Identifica PLANTA y ROL por teléfono (tabla usuarios)
// - Crea folio con consecutivo mensual (tabla folio_counters)
// - Guarda folio en tabla folios
// - Adjunta cotización PDF por WhatsApp -> sube a S3 y guarda URL
// - Flujo:
//    GA/GG crea folio -> notifica a ZP
//    ZP aprueba -> notifica GA, GG, CDMX (+ aviso si falta cotización)
// - Comandos:
//    "crear folio <concepto> [urgente]"
//    "estatus F-YYYYMM-001"
//    "aprobar F-YYYYMM-001"   (solo ZP)
//    "adjuntar F-YYYYMM-001"  (mandar PDF en ese mismo mensaje)

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { Pool } = require("pg");

// AWS S3 (requiere deps)
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// =========================
// ENV
// =========================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Acepta DATABASE_URL o DATABASE_URL (por tu screenshot)
const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_URL || "";
if (!DATABASE_URL) console.error("❌ Falta DATABASE_URL (o DATABASE_URL) en Render.");

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || ""; // ej: whatsapp:+14155238886

// S3
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "";
const S3_BUCKET = process.env.S3_BUCKET || "";

// =========================
// DB pool
// =========================
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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
  // Queremos "+521..."
  return String(from || "").replace(/^whatsapp:/i, "").trim();
}

function normalizeDbPhoneToCompare(dbPhone) {
  // En DB tú guardas "+52..."
  // Twilio manda +521... en MX muchas veces
  // Compararemos con reglas:
  // 1) exacto
  // 2) si Twilio trae +521 y DB trae +52, considerar equivalentes quitando el "1" después de +52.
  const p = String(dbPhone || "").trim();
  return p;
}

function equivalentMxPhone(twilioPhone, dbPhone) {
  const a = String(twilioPhone || "").trim();
  const b = String(dbPhone || "").trim();

  if (!a || !b) return false;
  if (a === b) return true;

  // Caso típico: Twilio: +521744...  DB: +52744...
  if (a.startsWith("+521") && b.startsWith("+52")) {
    const a2 = "+52" + a.slice(4); // quita el "1"
    if (a2 === b) return true;
  }
  // Inverso por si acaso
  if (b.startsWith("+521") && a.startsWith("+52")) {
    const b2 = "+52" + b.slice(4);
    if (b2 === a) return true;
  }
  return false;
}

function moneyToNumber(v) {
  const s = String(v || "").replace(/,/g, "").replace(/[^0-9.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function isUrgente(prioridad) {
  return String(prioridad || "").toLowerCase().includes("urgente");
}

function urgentIcon(prioridad) {
  return isUrgente(prioridad) ? "🔴 " : "";
}

// =========================
// Twilio REST: enviar WhatsApp
// =========================
async function sendWhatsApp({ to, body }) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.error("❌ Falta TWILIO_* env vars para notificaciones.");
    return { ok: false, error: "Missing Twilio vars" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const params = new URLSearchParams();
  params.append("From", TWILIO_WHATSAPP_NUMBER);
  params.append("To", to.startsWith("whatsapp:") ? to : `whatsapp:${to}`);
  params.append("Body", body);

  try {
    await axios.post(url, params.toString(), {
      auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN },
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return { ok: true };
  } catch (e) {
    console.error("❌ Twilio send error:", e?.response?.data || e?.message || e);
    return { ok: false, error: e?.response?.data || e?.message || String(e) };
  }
}

// =========================
// S3: subir archivo
// =========================
const s3 =
  AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION
    ? new S3Client({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY
        }
      })
    : null;

async function uploadToS3({ key, buffer, contentType }) {
  if (!s3 || !S3_BUCKET) throw new Error("S3 no configurado (AWS_* / S3_BUCKET).");

  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType || "application/octet-stream"
    // Recomendado: bucket privado. Para descargar luego, se usa presigned URL (fase 2)
  });

  await s3.send(cmd);

  // URL “directa” (si bucket es público). Si es privado, guárdala como referencia y luego usas presigned.
  const url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  return url;
}

async function downloadTwilioMedia(mediaUrl) {
  // Twilio MediaUrl requiere Auth Basic con AccountSID/AuthToken
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) throw new Error("Falta TWILIO creds para bajar MediaUrl.");

  const r = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN }
  });

  return {
    buffer: Buffer.from(r.data),
    contentType: r.headers["content-type"] || "application/octet-stream"
  };
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
      nombre VARCHAR(100) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      telefono VARCHAR(30) UNIQUE NOT NULL,
      nombre VARCHAR(120) NOT NULL,
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

  // folios base
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

  await pool.query(`
    INSERT INTO roles (clave, nombre) VALUES
      ('GA','Gerente Administrativo'),
      ('GG','Gerente General'),
      ('ZP','Director ZP'),
      ('CDMX','Contralor CDMX')
    ON CONFLICT (clave) DO NOTHING;
  `);

  console.log("✅ Schema verificado (tablas listas).");
}

// =========================
// 2) Identidad por teléfono (DB)
// =========================
async function getActorByPhone(fromRaw) {
  const tel = normalizeFrom(fromRaw);

  const sql = `
    SELECT
      u.telefono,
      u.nombre AS usuario_nombre,
      u.activo,
      r.clave AS rol,
      p.clave AS planta_clave
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    LEFT JOIN plantas p ON p.id = u.planta_id
    WHERE u.activo = TRUE
  `;
  const r = await pool.query(sql);

  // Comparación tolerante +52 vs +521
  for (const row of r.rows) {
    if (equivalentMxPhone(tel, row.telefono)) return row;
  }
  return null;
}

async function getRecipientsForApproval({ plantaClave }) {
  // GA+GG de planta + CDMX (corporativo)
  const sql = `
    SELECT
      u.telefono,
      u.nombre AS usuario_nombre,
      r.clave AS rol,
      p.clave AS planta_clave
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    LEFT JOIN plantas p ON p.id = u.planta_id
    WHERE u.activo = TRUE
      AND (
        (r.clave IN ('GA','GG') AND p.clave = $1)
        OR (r.clave = 'CDMX')
      )
  `;
  const r = await pool.query(sql, [plantaClave]);
  return r.rows || [];
}

async function getAllZpUsers() {
  const sql = `
    SELECT u.telefono, u.nombre AS usuario_nombre
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.activo = TRUE AND r.clave = 'ZP'
  `;
  const r = await pool.query(sql);
  return r.rows || [];
}

// =========================
// 3) Consecutivo mensual persistente (DB)
// =========================
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

    const correlativo = String(nextSeq).padStart(3, "0");
    return `F-${yyyymm}-${correlativo}`;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// =========================
// 4) Folios DB
// =========================
async function crearFolioDB({
  numero_folio,
  planta,
  descripcion,
  monto,
  estatus,
  creado_por,
  prioridad,
  beneficiario,
  categoria,
  subcategoria,
  unidad
}) {
  const sql = `
    INSERT INTO folios
      (numero_folio, planta, descripcion, monto, estatus, creado_por,
       prioridad, beneficiario, categoria, subcategoria, unidad)
    VALUES
      ($1,$2,$3,$4,$5,$6,
       $7,$8,$9,$10,$11)
    RETURNING *;
  `;
  const params = [
    numero_folio, planta, descripcion, monto, estatus, creado_por,
    prioridad || null, beneficiario || null, categoria || null, subcategoria || null, unidad || null
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

async function aprobarFolioDB({ numero_folio, aprobado_por }) {
  const r = await pool.query(
    `UPDATE folios
     SET estatus='Aprobado ZP', aprobado_por=$2, aprobado_en=NOW()
     WHERE numero_folio=$1
     RETURNING *`,
    [numero_folio, aprobado_por]
  );
  return r.rows[0] || null;
}

async function setCotizacionUrlDB({ numero_folio, cotizacion_url }) {
  const r = await pool.query(
    `UPDATE folios
     SET cotizacion_url=$2
     WHERE numero_folio=$1
     RETURNING *`,
    [numero_folio, cotizacion_url]
  );
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
// 5) Captura guiada (RAM)
// =========================
const drafts = {}; // drafts[telefono] = { concepto, prioridad, beneficiario, importe, categoria, subcategoria, unidad }

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
// 6) Endpoints prueba
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
// 7) Webhook Twilio WhatsApp
// =========================
app.post("/webhook", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const fromRaw = req.body.From || "unknown";
  const from = normalizeFrom(fromRaw);
  const message = incomingMsg.toLowerCase();

  // Media (PDF)
  const numMedia = Number(req.body.NumMedia || 0);
  const mediaUrl0 = req.body.MediaUrl0;
  const mediaType0 = req.body.MediaContentType0;

  try {
    // Identificar usuario/rol/planta por teléfono
    const actor = await getActorByPhone(fromRaw);
    if (!actor) {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          "Tu número no está registrado en el sistema.\n" +
            "Pide a IT que te dé de alta con: Planta + Rol + Nombre + Teléfono.\n" +
            "Ejemplo roles: GA, GG, ZP, CDMX.\n\n" +
            "Nota: en México, Twilio suele mandar +521..., asegúrate que en DB esté +52... o +521... (este bot ya lo compara)."
        )
      );
    }

    const plantaDetectada = actor.planta_clave || "CORPORATIVO";

    // =========================
    // A) estatus
    // =========================
    if (message.startsWith("estatus")) {
      const num = incomingMsg.replace(/estatus/i, "").trim();
      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          folio
            ? `${urgentIcon(folio.prioridad)}Folio: ${folio.numero_folio}\nPlanta: ${folio.planta}\nEstatus: ${folio.estatus}\nMonto: ${folio.monto}\nDescripción: ${folio.descripcion}\nCotización: ${folio.cotizacion_url ? "✅ Adjunta" : "❌ No adjunta"}\nFecha: ${folio.fecha_creacion}`
            : `No encontré el folio ${num}`
        )
      );
    }

    // =========================
    // B) adjuntar <folio> + PDF (mismo mensaje)
    // =========================
    if (message.startsWith("adjuntar")) {
      const folioNum = incomingMsg.replace(/adjuntar/i, "").trim();

      if (!folioNum) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Escribe: adjuntar F-YYYYMM-XXX y manda el PDF en el mismo mensaje."));
      }

      if (numMedia <= 0 || !mediaUrl0) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Me faltó el archivo. Repite: adjuntar F-YYYYMM-XXX y adjunta el PDF."));
      }

      // Validar folio existe
      const folio = await obtenerFolioDB(folioNum);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No existe el folio ${folioNum}`));
      }

      // validar tipo
      const isPdf = String(mediaType0 || "").toLowerCase().includes("pdf");
      if (!isPdf) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Por ahora solo acepto PDF. Adjunta la cotización en PDF."));
      }

      if (!s3 || !S3_BUCKET) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("S3 no está configurado en Render (AWS_* / S3_BUCKET)."));
      }

      // bajar de Twilio y subir a S3
      const dl = await downloadTwilioMedia(mediaUrl0);

      const key = `folios/${folioNum}/cotizacion_${Date.now()}.pdf`;
      const urlS3 = await uploadToS3({ key, buffer: dl.buffer, contentType: dl.contentType });

      const updated = await setCotizacionUrlDB({ numero_folio: folioNum, cotizacion_url: urlS3 });

      await logHistorial({
        numero_folio: folioNum,
        estatus: updated.estatus || "Actualizado",
        comentario: `Cotización adjunta por WhatsApp. S3 key: ${key}`,
        actor
      });

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Cotización adjunta al folio ${folioNum}.\n` +
            `Archivo en nube: ${urlS3}\n\n` +
            `Tip: si ya está Aprobado ZP, el Contralor CDMX podrá tomarlo para programación/pago.`
        )
      );
    }

    // =========================
    // C) aprobar <folio> (solo ZP)
    // =========================
    if (message.startsWith("aprobar")) {
      if (actor.rol !== "ZP") {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Solo el Director ZP puede aprobar folios (comando: aprobar F-YYYYMM-XXX)."));
      }

      const folioNum = incomingMsg.replace(/aprobar/i, "").trim();
      if (!folioNum) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Escribe: aprobar F-YYYYMM-XXX"));
      }

      const folio = await obtenerFolioDB(folioNum);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No existe el folio ${folioNum}`));
      }

      const aprobado = await aprobarFolioDB({
        numero_folio: folioNum,
        aprobado_por: `${actor.usuario_nombre} (ZP)`
      });

      await logHistorial({
        numero_folio: folioNum,
        estatus: "Aprobado ZP",
        comentario: "Aprobado por Director ZP desde WhatsApp.",
        actor
      });

      // Notificar GA+GG+CDMX
      const recipients = await getRecipientsForApproval({ plantaClave: aprobado.planta });

      const faltaCot = !aprobado.cotizacion_url;
      const msgNotif =
        `${urgentIcon(aprobado.prioridad)}✅ Folio APROBADO por ZP\n` +
        `Folio: ${aprobado.numero_folio}\n` +
        `Planta: ${aprobado.planta}\n` +
        `Monto: ${aprobado.monto}\n` +
        `Concepto: ${aprobado.descripcion}\n` +
        `Prioridad: ${aprobado.prioridad || "Normal"}\n` +
        `Cotización: ${aprobado.cotizacion_url ? "✅ Adjunta" : "❌ No adjunta"}\n` +
        (faltaCot ? `⚠️ Aún no tiene la cotización adjunta.\n` : "") +
        `\nAcciones:\n` +
        `- Para adjuntar PDF: "adjuntar ${aprobado.numero_folio}" (con PDF)\n` +
        `- Para consultar: "estatus ${aprobado.numero_folio}"`;

      for (const u of recipients) {
        await sendWhatsApp({ to: u.telefono, body: msgNotif });
      }

      // Responder a ZP
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Aprobado: ${aprobado.numero_folio}\n\n` +
          `Notifiqué a: GA + GG de ${aprobado.planta} + Contralor CDMX.\n` +
          (faltaCot ? "⚠️ Falta cotización PDF. Pide que la adjunten.\n" : "")
        )
      );
    }

    // =========================
    // D) crear folio (captura guiada)
    // =========================
    if (message.includes("crear folio")) {
      drafts[from] = drafts[from] || {};

      drafts[from].prioridad = message.includes("urgente") ? "Urgente no programado" : "Normal";

      // Concepto: todo lo que venga después de "crear folio"
      const concepto = incomingMsg.replace(/crear folio/i, "").trim();
      if (concepto) drafts[from].concepto = concepto;

      // Por si ya mandó datos en el mismo mensaje
      Object.assign(drafts[from], parseKeyValueLines(incomingMsg));

      const miss = missingFields(drafts[from]);
      if (miss.length) {
        res.set("Content-Type", "text/xml");
        return res.send(
          twiml(
            `${urgentIcon(drafts[from].prioridad)}Ok. Para crear el folio me falta: ${miss.join(", ")}.\n` +
              `Respóndeme en líneas así:\n` +
              `Beneficiario: ____\n` +
              `Importe: ____\n` +
              `Categoría: Gastos / Inversiones / Derechos y Obligaciones / Taller\n` +
              `Subcategoría: ____\n` +
              (String(drafts[from].categoria || "").toLowerCase().includes("taller") ? `Unidad: AT-03 o C-03\n` : "") +
              `(Concepto y prioridad ya los tomé)\n` +
              `Planta detectada: ${plantaDetectada}\nRol: ${actor.rol}`
          )
        );
      }

      // Completo -> generar folio y guardar en DB
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
        comentario: `Creado desde WhatsApp. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor
      });

      delete drafts[from];

      // Notificar a ZP (siguiente rol)
      const zps = await getAllZpUsers();
      const msgZP =
        `${urgentIcon(guardado.prioridad)}🆕 Folio NUEVO para aprobación ZP\n` +
        `Folio: ${guardado.numero_folio}\n` +
        `Planta: ${guardado.planta}\n` +
        `Monto: ${guardado.monto}\n` +
        `Concepto: ${guardado.descripcion}\n` +
        `Creado por: ${guardado.creado_por}\n` +
        `Prioridad: ${guardado.prioridad || "Normal"}\n` +
        `Cotización: ${guardado.cotizacion_url ? "✅ Adjunta" : "❌ No adjunta"}\n\n` +
        `Para aprobar: "aprobar ${guardado.numero_folio}"\n` +
        `Para consultar: "estatus ${guardado.numero_folio}"`;

      for (const u of zps) {
        await sendWhatsApp({ to: u.telefono, body: msgZP });
      }

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `${urgentIcon(guardado.prioridad)}✅ Folio ${guardado.numero_folio} creado y guardado.\n\n` +
            `Planta: ${guardado.planta}\n` +
            `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
            `Concepto: ${d.concepto}\n` +
            `Beneficiario: ${d.beneficiario}\n` +
            `Monto: ${monto}\n` +
            `Categoría: ${d.categoria}\n` +
            `Subcategoría: ${d.subcategoria}\n` +
            (d.unidad ? `Unidad: ${d.unidad}\n` : "") +
            `Prioridad: ${d.prioridad}\n\n` +
            `✅ Notifiqué al Director ZP para aprobación.\n` +
            `Para adjuntar PDF: "adjuntar ${guardado.numero_folio}" (con PDF)\n` +
            `Para consultar: "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // =========================
    // E) completar borrador
    // =========================
    if (drafts[from]) {
      Object.assign(drafts[from], parseKeyValueLines(incomingMsg));
      const miss = missingFields(drafts[from]);

      res.set("Content-Type", "text/xml");
      if (miss.length) {
        return res.send(
          twiml(
            `${urgentIcon(drafts[from].prioridad)}Me falta: ${miss.join(", ")}.\n` +
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
        comentario: `Creado desde borrador. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor
      });

      delete drafts[from];

      // Notificar a ZP
      const zps = await getAllZpUsers();
      const msgZP =
        `${urgentIcon(guardado.prioridad)}🆕 Folio NUEVO para aprobación ZP\n` +
        `Folio: ${guardado.numero_folio}\n` +
        `Planta: ${guardado.planta}\n` +
        `Monto: ${guardado.monto}\n` +
        `Concepto: ${guardado.descripcion}\n` +
        `Creado por: ${guardado.creado_por}\n` +
        `Prioridad: ${guardado.prioridad || "Normal"}\n` +
        `Cotización: ${guardado.cotizacion_url ? "✅ Adjunta" : "❌ No adjunta"}\n\n` +
        `Para aprobar: "aprobar ${guardado.numero_folio}"`;

      for (const u of zps) {
        await sendWhatsApp({ to: u.telefono, body: msgZP });
      }

      return res.send(
        twiml(
          `${urgentIcon(guardado.prioridad)}✅ Folio ${guardado.numero_folio} creado y guardado.\n\n` +
            `Planta: ${guardado.planta}\n` +
            `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
            `Concepto: ${d.concepto}\n` +
            `Beneficiario: ${d.beneficiario}\n` +
            `Monto: ${monto}\n` +
            `Categoría: ${d.categoria}\n` +
            `Subcategoría: ${d.subcategoria}\n` +
            (d.unidad ? `Unidad: ${d.unidad}\n` : "") +
            `Prioridad: ${d.prioridad}\n\n` +
            `✅ Notifiqué al Director ZP para aprobación.\n` +
            `Para adjuntar PDF: "adjuntar ${guardado.numero_folio}" (con PDF)\n` +
            `Para consultar: "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // =========================
    // F) fallback
    // =========================
    res.set("Content-Type", "text/xml");
    return res.send(
      twiml(
        "Comandos disponibles:\n" +
          "- crear folio <concepto> [urgente]\n" +
          "- estatus <F-YYYYMM-XXX>\n" +
          "- adjuntar <F-YYYYMM-XXX> (con PDF)\n" +
          "- aprobar <F-YYYYMM-XXX> (solo ZP)\n"
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
