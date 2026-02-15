// server.js
// WhatsApp (Twilio) + PostgreSQL (Render) + S3 (cotizaciones PDF)
// Flujo actual:
// - crear folio ...
// - estatus F-YYYYMM-XXX
// - aprobar F-YYYYMM-XXX   (solo ZP) => notifica a GA, GG y CDMX
// - cotizacion F-YYYYMM-XXX (enviar PDF adjunto) => sube a S3 y liga al folio

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { Pool } = require("pg");
const twilio = require("twilio");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// =========================
// ENV
// =========================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || ""; // whatsapp:+1415...

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "";
const S3_BUCKET = process.env.S3_BUCKET || "";

if (!DATABASE_URL) console.error("❌ Falta DATABASE_URL.");
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
  console.warn("⚠️ Falta Twilio vars (no podrá notificar).");
}
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !S3_BUCKET) {
  console.warn("⚠️ Falta AWS/S3 vars (no podrá subir cotizaciones).");
}

// =========================
// DB
// =========================
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =========================
// Twilio Client
// =========================
const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

// =========================
// S3 Client
// =========================
const s3 =
  AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION
    ? new S3Client({
        region: AWS_REGION,
        credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY }
      })
    : null;

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
  // "whatsapp:+521..." -> "+521..."
  return String(from || "").replace(/^whatsapp:/i, "").trim();
}

function toWhatsAppAddress(phoneE164) {
  // "+521..." -> "whatsapp:+521..."
  const p = String(phoneE164 || "").trim();
  if (!p) return "";
  return p.toLowerCase().startsWith("whatsapp:") ? p : `whatsapp:${p}`;
}

function moneyToNumber(v) {
  const s = String(v || "").replace(/,/g, "").replace(/[^0-9.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function extractFolioId(text) {
  const t = String(text || "").toUpperCase();
  const m = t.match(/F-\d{6}-\d{3}/);
  return m ? m[0] : "";
}

function urgentPrefix(prioridad) {
  const p = String(prioridad || "").toLowerCase();
  return p.includes("urg") ? "🔴 URGENTE " : "";
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
      planta_id INT NULL REFERENCES plantas(id),
      rol_id INT NOT NULL REFERENCES roles(id),
      email VARCHAR(180),
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
      planta VARCHAR(50),
      descripcion TEXT,
      monto NUMERIC(12,2),
      estatus VARCHAR(50),
      creado_por VARCHAR(120),
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // columnas nuevas
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

  // Roles base con nivel (solo si no existen)
  await pool.query(`
    INSERT INTO roles (clave, nombre, nivel) VALUES
      ('GA','Gerente Administrativo', 10),
      ('GG','Gerente General', 20),
      ('ZP','Director ZP', 30),
      ('CDMX','Contralor CDMX', 40)
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
      u.email,
      u.activo,
      r.clave AS rol,
      r.nombre AS rol_nombre,
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

async function getNotifyRecipientsAfterZPApproval(plantaClave) {
  // GA y GG de la planta, más CDMX (corporativo)
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
// 3) Consecutivo mensual persistente
// =========================
async function buildMonthlyFolioIdDB() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const yyyymm = `${year}${month}`;

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
      (numero_folio, planta, descripcion, monto, estatus, creado_por, prioridad, beneficiario, categoria, subcategoria, unidad)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *;
  `;
  const params = [
    numero_folio,
    planta,
    descripcion,
    monto,
    estatus,
    creado_por,
    prioridad || null,
    beneficiario || null,
    categoria || null,
    subcategoria || null,
    unidad || null
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

async function aprobarFolioDB(numero_folio, actor) {
  const aprobado_por = `${actor.usuario_nombre} (${actor.rol})`;
  const r = await pool.query(
    `
    UPDATE folios
    SET estatus='Aprobado',
        aprobado_por=$2,
        aprobado_en=NOW()
    WHERE numero_folio=$1
    RETURNING *;
  `,
    [numero_folio, aprobado_por]
  );
  return r.rows[0] || null;
}

async function setCotizacionUrlDB(numero_folio, url) {
  const r = await pool.query(
    `UPDATE folios SET cotizacion_url=$2 WHERE numero_folio=$1 RETURNING *;`,
    [numero_folio, url]
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
// 5) Twilio outbound notify
// =========================
async function sendWhatsAppMessage(toE164, text) {
  if (!twilioClient) return;
  const to = toWhatsAppAddress(toE164);
  if (!to) return;

  await twilioClient.messages.create({
    from: TWILIO_WHATSAPP_NUMBER,
    to,
    body: text
  });
}

// =========================
// 6) S3 Upload (PDF from Twilio MediaUrl)
// =========================
async function uploadPdfFromTwilioMediaToS3({ mediaUrl, folioId }) {
  if (!s3) throw new Error("S3 no configurado.");
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) throw new Error("Twilio auth no configurado.");

  // Descargar binario desde Twilio con Basic Auth
  const resp = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN }
  });

  const key = `cotizaciones/${folioId}/${Date.now()}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: Buffer.from(resp.data),
      ContentType: "application/pdf"
      // Recomendación: bucket privado. Para compartir, generamos URL firmada.
    })
  );

  // URL firmada (7 días) para consulta/descarga
  const signed = await getSignedUrl(
    s3,
    new (require("@aws-sdk/client-s3").GetObjectCommand)({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 }
  );

  return { key, signedUrl: signed };
}

// =========================
// 7) Captura guiada (RAM)
// =========================
const drafts = {}; // drafts[telefono] = { ... }

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
// Endpoints
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
// Webhook Twilio WhatsApp
// =========================
app.post("/webhook", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const fromRaw = req.body.From || "unknown";
  const from = normalizeFrom(fromRaw);
  const message = incomingMsg.toLowerCase();

  // Adjuntos Twilio
  const numMedia = Number(req.body.NumMedia || 0);
  const mediaUrl0 = req.body.MediaUrl0 || "";
  const mediaType0 = req.body.MediaContentType0 || "";

  try {
    // 1) Identificar usuario
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

    // 2) ESTATUS
    if (message.startsWith("estatus")) {
      const num = incomingMsg.replace(/estatus/i, "").trim();
      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          folio
            ? `${urgentPrefix(folio.prioridad)}Folio: ${folio.numero_folio}\nPlanta: ${folio.planta}\nEstatus: ${folio.estatus}\nMonto: ${folio.monto}\nDescripción: ${folio.descripcion}\nCotización: ${folio.cotizacion_url ? "✅ Adjunta" : "❌ Sin adjunto"}\nFecha: ${folio.fecha_creacion}`
            : `No encontré el folio ${num}`
        )
      );
    }

    // 3) COTIZACION (PDF adjunto) => "cotizacion F-202602-001"
    if (message.startsWith("cotizacion") || message.startsWith("cotización")) {
      const folioId = extractFolioId(incomingMsg);

      res.set("Content-Type", "text/xml");

      if (!folioId) return res.send(twiml("Indica el folio así: cotizacion F-YYYYMM-XXX y adjunta el PDF."));
      if (!numMedia || !mediaUrl0) return res.send(twiml("No veo el archivo. Reintenta enviando el PDF adjunto."));
      if (!String(mediaType0).toLowerCase().includes("pdf")) {
        return res.send(twiml("El archivo debe ser PDF (cotización)."));
      }

      const folio = await obtenerFolioDB(folioId);
      if (!folio) return res.send(twiml(`No existe el folio ${folioId}.`));

      // Subir a S3
      const up = await uploadPdfFromTwilioMediaToS3({ mediaUrl: mediaUrl0, folioId });
      await setCotizacionUrlDB(folioId, up.signedUrl);

      await logHistorial({
        numero_folio: folioId,
        estatus: folio.estatus || "Actualizado",
        comentario: `Se adjuntó cotización PDF a S3. Key: ${up.key}`,
        actor
      });

      return res.send(twiml(`✅ Cotización cargada y ligada al folio ${folioId}.\nURL (7 días): ${up.signedUrl}`));
    }

    // 4) APROBAR (solo ZP) => notifica GA, GG y CDMX
    if (message.startsWith("aprobar")) {
      res.set("Content-Type", "text/xml");

      if (actor.rol !== "ZP") {
        return res.send(twiml("Solo Director ZP puede aprobar. (Comando: aprobar F-YYYYMM-XXX)"));
      }

      const folioId = extractFolioId(incomingMsg);
      if (!folioId) return res.send(twiml("Usa: aprobar F-YYYYMM-XXX"));

      const folioAntes = await obtenerFolioDB(folioId);
      if (!folioAntes) return res.send(twiml(`No existe el folio ${folioId}.`));

      const folio = await aprobarFolioDB(folioId, actor);

      await logHistorial({
        numero_folio: folioId,
        estatus: "Aprobado",
        comentario: "Aprobado por Director ZP desde WhatsApp.",
        actor
      });

      const faltaCot = !folio.cotizacion_url;
      const urg = urgentPrefix(folio.prioridad);

      // Notificar a GA, GG planta + CDMX
      const recips = await getNotifyRecipientsAfterZPApproval(folio.planta);

      const notaCot = faltaCot ? "\n⚠️ Aún no tiene la cotización adjunta." : "\n✅ Cotización adjunta.";
      const msgNotify =
        `${urg}FOLIO APROBADO\n` +
        `Folio: ${folio.numero_folio}\n` +
        `Planta: ${folio.planta}\n` +
        `Monto: ${folio.monto}\n` +
        `Descripción: ${folio.descripcion}\n` +
        `Aprobó: ${folio.aprobado_por}\n` +
        `Estatus: ${folio.estatus}` +
        notaCot +
        `\n\nComandos:\n- estatus ${folio.numero_folio}\n- cotizacion ${folio.numero_folio} (adjunta PDF)`;

      // Enviar notificaciones
      for (const r of recips) {
        // Evitar enviarse a sí mismo por si coincide
        if (normalizeFrom(toWhatsAppAddress(r.telefono)) === from) continue;
        await sendWhatsAppMessage(r.telefono, msgNotify);
      }

      // Respuesta al ZP
      return res.send(
        twiml(
          `✅ Aprobado ${folio.numero_folio}.\n` +
            `Notifiqué a GA, GG y Contralor CDMX.` +
            (faltaCot ? `\n⚠️ Aún no tiene la cotización adjunta.\nEnvía: cotizacion ${folio.numero_folio} + PDF` : "")
        )
      );
    }

    // 5) CREAR FOLIO
    if (message.includes("crear folio")) {
      drafts[from] = drafts[from] || {};

      drafts[from].prioridad = message.includes("urgente") ? "Urgente no programado" : "Normal";

      const concepto = incomingMsg.replace(/crear folio/i, "").trim();
      if (concepto) drafts[from].concepto = concepto;

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
              `(Concepto y prioridad ya los tomé)\n` +
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
        comentario: `Creado desde WhatsApp. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor
      });

      delete drafts[from];

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `${urgentPrefix(d.prioridad)}✅ Folio ${guardado.numero_folio} creado y guardado.\n\n` +
            `Planta: ${guardado.planta}\n` +
            `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
            `Concepto: ${d.concepto}\n` +
            `Beneficiario: ${d.beneficiario}\n` +
            `Monto: ${monto}\n` +
            `Categoría: ${d.categoria}\n` +
            `Subcategoría: ${d.subcategoria}\n` +
            (d.unidad ? `Unidad: ${d.unidad}\n` : "") +
            `Prioridad: ${d.prioridad}\n\n` +
            `Para consultar: estatus ${guardado.numero_folio}\n` +
            `Para adjuntar cotización: cotizacion ${guardado.numero_folio} + PDF\n` +
            `Para aprobar (ZP): aprobar ${guardado.numero_folio}`
        )
      );
    }

    // 6) Continuación de borrador
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
        comentario: `Creado desde borrador. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor
      });

      delete drafts[from];

      return res.send(
        twiml(
          `${urgentPrefix(d.prioridad)}✅ Folio ${guardado.numero_folio} creado y guardado.\n\n` +
            `Planta: ${guardado.planta}\n` +
            `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
            `Concepto: ${d.concepto}\n` +
            `Beneficiario: ${d.beneficiario}\n` +
            `Monto: ${monto}\n` +
            `Categoría: ${d.categoria}\n` +
            `Subcategoría: ${d.subcategoria}\n` +
            (d.unidad ? `Unidad: ${d.unidad}\n` : "") +
            `Prioridad: ${d.prioridad || "Normal"}\n\n` +
            `Para consultar: estatus ${guardado.numero_folio}\n` +
            `Para adjuntar cotización: cotizacion ${guardado.numero_folio} + PDF\n` +
            `Para aprobar (ZP): aprobar ${guardado.numero_folio}`
        )
      );
    }

    // 7) Ayuda
    res.set("Content-Type", "text/xml");
    return res.send(
      twiml(
        "Comandos disponibles:\n" +
          "- crear folio <concepto> [urgente]\n" +
          "- estatus F-YYYYMM-XXX\n" +
          "- cotizacion F-YYYYMM-XXX + (adjunta PDF)\n" +
          "- aprobar F-YYYYMM-XXX (solo ZP)\n"
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

