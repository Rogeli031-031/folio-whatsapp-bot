// server.js
// WhatsApp (Twilio) + PostgreSQL (Render) + S3 (AWS) + (opcional) OpenAI
// Comandos:
// - crear folio <concepto> [urgente]
// - estatus F-YYYYMM-XXX
// - aprobar F-YYYYMM-XXX        (solo ZP)
// - adjuntar F-YYYYMM-XXX       (enviar PDF adjunto en el mensaje)
// Nota: Si ZP o CDMX crean folio, deben indicar Planta: ACAPULCO / PUEBLA / etc.

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { Pool } = require("pg");
const twilio = require("twilio");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || ""; // "whatsapp:+14155238886"

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "";
const S3_BUCKET = process.env.S3_BUCKET || "";

if (!DATABASE_URL) console.error("❌ Falta DATABASE_URL en Render.");
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
  console.warn("⚠️ Falta Twilio vars (no podrá notificar).");
}
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !S3_BUCKET) {
  console.warn("⚠️ Falta AWS/S3 vars (no podrá subir cotizaciones).");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT current_database() AS db")
  .then(r => console.log("✅ BD CONECTADA:", r.rows[0].db))
  .catch(e => console.error("❌ Error BD:", e));

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

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
  let tel = String(from || "").trim();
  tel = tel.replace(/^whatsapp:/i, "").trim();
  tel = tel.replace(/^\+521/, "+52"); // MX: +521 -> +52
  tel = tel.replace(/\s+/g, "");
  return tel;
}

function moneyToNumber(v) {
  const s = String(v || "").replace(/,/g, "").replace(/[^0-9.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function urgentPrefix(prioridad) {
  const p = String(prioridad || "").toLowerCase();
  return p.includes("urgente") ? "🔴💡 URGENTE | " : "";
}

async function sendWhatsApp(toWhatsApp, text) {
  if (!twilioClient) return;
  await twilioClient.messages.create({
    from: TWILIO_WHATSAPP_NUMBER,
    to: toWhatsApp,
    body: text
  });
}

async function tableHasColumn(table, column) {
  const r = await pool.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1 AND column_name=$2
    LIMIT 1
    `,
    [table, column]
  );
  return r.rowCount > 0;
}

async function ensureColumn(table, column, ddl) {
  const exists = await tableHasColumn(table, column);
  if (!exists) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl};`);
  }
}

// =========================
// 1) Schema (crea/ajusta sin borrar) + COMPATIBILIDAD columnas
// =========================
async function ensureSchema() {
  // plantas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plantas (
      id SERIAL PRIMARY KEY,
      clave VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(100) NOT NULL
    );
  `);

  // roles
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      clave VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(100) NOT NULL
    );
  `);
  await ensureColumn("roles", "nivel", "nivel INT NOT NULL DEFAULT 0");

  // usuarios
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
  await ensureColumn("usuarios", "email", "email VARCHAR(160)");

  // folio_counters
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_counters (
      yyyymm VARCHAR(6) PRIMARY KEY,
      last_seq INT NOT NULL
    );
  `);

  // folios (tu BD puede traer folio_codigo en vez de numero_folio)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folios (
      id SERIAL PRIMARY KEY
    );
  `);

  // Columnas base compatibles
  await ensureColumn("folios", "folio_codigo", "folio_codigo VARCHAR(50) UNIQUE");
  await ensureColumn("folios", "numero_folio", "numero_folio VARCHAR(50) UNIQUE");

  // Reglas planta: vamos a soportar planta_id + planta texto (compat)
  await ensureColumn("folios", "planta_id", "planta_id INT NULL REFERENCES plantas(id)");
  await ensureColumn("folios", "planta", "planta VARCHAR(50) NULL"); // compat (texto)
  await ensureColumn("folios", "creado_por_id", "creado_por_id INT NULL REFERENCES usuarios(id)");
  await ensureColumn("folios", "creado_por", "creado_por VARCHAR(120) NULL"); // compat (texto)

  await ensureColumn("folios", "concepto", "concepto TEXT NULL");
  await ensureColumn("folios", "descripcion", "descripcion TEXT NULL"); // compat
  await ensureColumn("folios", "importe", "importe NUMERIC(12,2) NULL");
  await ensureColumn("folios", "monto", "monto NUMERIC(12,2) NULL"); // compat

  await ensureColumn("folios", "estatus", "estatus VARCHAR(50) NULL");
  await ensureColumn("folios", "prioridad", "prioridad VARCHAR(60) NULL");
  await ensureColumn("folios", "beneficiario", "beneficiario VARCHAR(120) NULL");
  await ensureColumn("folios", "categoria", "categoria VARCHAR(120) NULL");
  await ensureColumn("folios", "subcategoria", "subcategoria VARCHAR(120) NULL");
  await ensureColumn("folios", "unidad", "unidad VARCHAR(50) NULL");
  await ensureColumn("folios", "cotizacion_url", "cotizacion_url TEXT NULL");
  await ensureColumn("folios", "aprobado_por", "aprobado_por VARCHAR(120) NULL");
  await ensureColumn("folios", "aprobado_en", "aprobado_en TIMESTAMP NULL");
  await ensureColumn("folios", "fecha_creacion", "fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await ensureColumn("folios", "creado_en", "creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  // Sincroniza folio_codigo <-> numero_folio si uno existe y el otro no tiene dato
  await pool.query(`
    UPDATE folios
    SET numero_folio = folio_codigo
    WHERE numero_folio IS NULL AND folio_codigo IS NOT NULL;
  `);
  await pool.query(`
    UPDATE folios
    SET folio_codigo = numero_folio
    WHERE folio_codigo IS NULL AND numero_folio IS NOT NULL;
  `);

  // folio_historial
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_historial (
      id SERIAL PRIMARY KEY,
      estatus VARCHAR(50) NOT NULL,
      comentario TEXT,
      actor_telefono VARCHAR(30),
      actor_rol VARCHAR(50),
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await ensureColumn("folio_historial", "folio_codigo", "folio_codigo VARCHAR(50) NULL");
  await ensureColumn("folio_historial", "numero_folio", "numero_folio VARCHAR(50) NULL");

  await pool.query(`
    UPDATE folio_historial
    SET numero_folio = folio_codigo
    WHERE numero_folio IS NULL AND folio_codigo IS NOT NULL;
  `);
  await pool.query(`
    UPDATE folio_historial
    SET folio_codigo = numero_folio
    WHERE folio_codigo IS NULL AND numero_folio IS NOT NULL;
  `);

  // comentarios
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id SERIAL PRIMARY KEY,
      comentario TEXT NOT NULL,
      actor_telefono VARCHAR(30),
      actor_rol VARCHAR(50),
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await ensureColumn("comentarios", "folio_codigo", "folio_codigo VARCHAR(50) NULL");
  await ensureColumn("comentarios", "numero_folio", "numero_folio VARCHAR(50) NULL");

  await pool.query(`
    UPDATE comentarios
    SET numero_folio = folio_codigo
    WHERE numero_folio IS NULL AND folio_codigo IS NOT NULL;
  `);
  await pool.query(`
    UPDATE comentarios
    SET folio_codigo = numero_folio
    WHERE folio_codigo IS NULL AND numero_folio IS NOT NULL;
  `);

  // Roles base
  await pool.query(`
    INSERT INTO roles (clave, nombre, nivel) VALUES
      ('GA','Gerente Administrativo', 10),
      ('GG','Gerente General',        20),
      ('ZP','Director ZP',            30),
      ('CDMX','Contralor CDMX',       40)
    ON CONFLICT (clave) DO NOTHING;
  `);

  await pool.query(`
    UPDATE roles SET nivel = 10 WHERE clave='GA' AND (nivel IS NULL OR nivel=0);
    UPDATE roles SET nivel = 20 WHERE clave='GG' AND (nivel IS NULL OR nivel=0);
    UPDATE roles SET nivel = 30 WHERE clave='ZP' AND (nivel IS NULL OR nivel=0);
    UPDATE roles SET nivel = 40 WHERE clave='CDMX' AND (nivel IS NULL OR nivel=0);
  `);

  console.log("✅ Schema verificado (alineado a tu BD).");
}

// =========================
// 2) Identidad por teléfono (DB)
// =========================
async function getActorByPhone(fromRaw) {
  const tel = normalizeFrom(fromRaw);

  const sql = `
    SELECT
      u.id AS usuario_id,
      u.telefono,
      u.nombre AS usuario_nombre,
      u.email,
      u.activo,
      u.planta_id,
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

async function getUsersByRoleAndPlanta(rolClave, plantaClave) {
  const r = await pool.query(
    `
    SELECT u.telefono, u.nombre, u.email, r.clave AS rol, p.clave AS planta
    FROM usuarios u
    JOIN roles r ON r.id=u.rol_id
    LEFT JOIN plantas p ON p.id=u.planta_id
    WHERE u.activo=TRUE AND r.clave=$1 AND p.clave=$2
    `,
    [rolClave, plantaClave]
  );
  return r.rows || [];
}

async function getUsersByRole(rolClave) {
  const r = await pool.query(
    `
    SELECT u.telefono, u.nombre, u.email, r.clave AS rol
    FROM usuarios u
    JOIN roles r ON r.id=u.rol_id
    WHERE u.activo=TRUE AND r.clave=$1
    `,
    [rolClave]
  );
  return r.rows || [];
}

async function resolvePlantaClaveToId(plantaClave) {
  if (!plantaClave) return null;
  const clave = String(plantaClave).trim().toUpperCase();

  const r = await pool.query(`SELECT id FROM plantas WHERE clave=$1 LIMIT 1`, [clave]);
  if (r.rowCount) return r.rows[0].id;

  // si no existe, la creamos con nombre=clave
  const ins = await pool.query(
    `INSERT INTO plantas (clave, nombre) VALUES ($1, $2) RETURNING id`,
    [clave, clave]
  );
  return ins.rows[0].id;
}

async function resolvePlantaIdToClave(plantaId) {
  if (!plantaId) return null;
  const r = await pool.query(`SELECT clave FROM plantas WHERE id=$1 LIMIT 1`, [plantaId]);
  return r.rowCount ? r.rows[0].clave : null;
}

// =========================
// 3) Consecutivo mensual persistente (DB)
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
// 4) Folios DB (compat columnas)
// =========================
async function crearFolioDB(payload) {
  // Insertamos en ambas columnas para evitar errores futuros
  const sql = `
    INSERT INTO folios
    (folio_codigo, numero_folio, planta_id, planta, creado_por_id, creado_por,
     concepto, descripcion, importe, monto, estatus, prioridad, beneficiario, categoria, subcategoria, unidad)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING *;
  `;

  const r = await pool.query(sql, [
    payload.folio_codigo,
    payload.folio_codigo,                   // numero_folio espejo
    payload.planta_id || null,
    payload.planta_clave || null,           // compat texto
    payload.creado_por_id || null,
    payload.creado_por || null,             // compat texto
    payload.concepto || null,
    payload.concepto || null,               // descripcion espejo
    payload.importe ?? null,
    payload.importe ?? null,                // monto espejo
    payload.estatus || null,
    payload.prioridad || null,
    payload.beneficiario || null,
    payload.categoria || null,
    payload.subcategoria || null,
    payload.unidad || null
  ]);

  return r.rows[0];
}

async function obtenerFolioDB(folioCode) {
  const code = String(folioCode || "").trim();
  const r = await pool.query(
    `
    SELECT *
    FROM folios
    WHERE folio_codigo=$1 OR numero_folio=$1
    ORDER BY id DESC
    LIMIT 1
    `,
    [code]
  );
  return r.rows[0] || null;
}

async function actualizarFolioDB(folioCode, fields) {
  const code = String(folioCode || "").trim();
  const keys = Object.keys(fields || {});
  if (!keys.length) return;

  const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(", ");
  const values = keys.map(k => fields[k]);

  await pool.query(
    `
    UPDATE folios
    SET ${sets}
    WHERE folio_codigo=$1 OR numero_folio=$1
    `,
    [code, ...values]
  );
}

async function logHistorial({ folio_codigo, estatus, comentario, actor }) {
  await pool.query(
    `
    INSERT INTO folio_historial (folio_codigo, numero_folio, estatus, comentario, actor_telefono, actor_rol)
    VALUES ($1,$2,$3,$4,$5,$6)
    `,
    [
      folio_codigo,
      folio_codigo, // espejo
      estatus,
      comentario || null,
      actor?.telefono || null,
      actor?.rol || null
    ]
  );
}

// =========================
// 5) S3: subir cotización
// =========================
async function uploadPdfToS3({ folio_codigo, mediaBuffer, contentType }) {
  if (!s3) throw new Error("S3 no configurado");

  const key = `cotizaciones/${folio_codigo}/${Date.now()}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: mediaBuffer,
      ContentType: contentType || "application/pdf"
    })
  );

  return `s3://${S3_BUCKET}/${key}`;
}

// =========================
// 6) Drafts (captura guiada)
// =========================
const drafts = {}; // drafts[tel] = {...}

function parseKeyValueLines(text) {
  const out = {};
  const lines = String(text || "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  for (const l of lines) {
    const m = l.match(/^([a-záéíóúñ\s]+)\s*:\s*(.+)$/i);
    if (!m) continue;

    const key = m[1].toLowerCase();
    const val = m[2].trim();

    if (key.includes("planta")) out.planta = val.toUpperCase();
    if (key.includes("benefici")) out.beneficiario = val;
    if (key.includes("import") || key.includes("costo")) out.importe = val;
    if (key.includes("categor")) out.categoria = val;
    if (key.includes("sub")) out.subcategoria = val;
    if (key.includes("unidad")) out.unidad = val;
    if (key.includes("concept")) out.concepto = val;
  }
  return out;
}

function missingFields(d, actor) {
  const miss = [];
  const rol = actor?.rol || "";

  // Regla: TODOS deben tener planta; ZP/CDMX siempre la deben indicar (si no tienen planta_id)
  if (!d.planta && !actor?.planta_clave) miss.push("Planta");

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
// 7) Endpoints
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
// 8) Webhook Twilio WhatsApp
// =========================
app.post("/webhook", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const fromRaw = req.body.From || "unknown";
  const fromTel = normalizeFrom(fromRaw);
  const message = incomingMsg.toLowerCase();

  const numMedia = Number(req.body.NumMedia || 0);
  const mediaUrl0 = req.body.MediaUrl0;
  const mediaType0 = req.body.MediaContentType0;

  try {
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

    // =========================
    // A) ESTATUS
    // =========================
    if (message.startsWith("estatus")) {
      const code = incomingMsg.replace(/estatus/i, "").trim();
      const folio = await obtenerFolioDB(code);

      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${code}`));
      }

      const folioCode = folio.folio_codigo || folio.numero_folio;
      const planta = folio.planta || (folio.planta_id ? await resolvePlantaIdToClave(folio.planta_id) : "-");
      const monto = folio.importe ?? folio.monto ?? "-";
      const concepto = folio.concepto || folio.descripcion || "-";
      const fecha = folio.fecha_creacion || folio.creado_en || "-";

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `${urgentPrefix(folio.prioridad)}Folio: ${folioCode}\n` +
          `Planta: ${planta}\n` +
          `Estatus: ${folio.estatus || "-"}\n` +
          `Monto: ${monto}\n` +
          `Concepto: ${concepto}\n` +
          `Cotización: ${folio.cotizacion_url ? "✅ Adjunta" : "⚠️ No adjunta"}\n` +
          `Fecha: ${fecha}`
        )
      );
    }

    // =========================
    // B) APROBAR (solo ZP)
    // =========================
    if (message.startsWith("aprobar")) {
      if (actor.rol !== "ZP") {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Solo el Director ZP puede aprobar folios."));
      }

      const code = incomingMsg.replace(/aprobar/i, "").trim();
      const folio = await obtenerFolioDB(code);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${code}`));
      }

      const folioCode = folio.folio_codigo || folio.numero_folio;
      const plantaClave = folio.planta || (folio.planta_id ? await resolvePlantaIdToClave(folio.planta_id) : null);

      await actualizarFolioDB(folioCode, {
        estatus: "Aprobado",
        aprobado_por: `${actor.usuario_nombre} (ZP)`,
        aprobado_en: new Date()
      });

      await logHistorial({
        folio_codigo: folioCode,
        estatus: "Aprobado",
        comentario: "Aprobado por Director ZP.",
        actor
      });

      // Notificar GA + GG de la planta + CDMX
      const gaList = plantaClave ? await getUsersByRoleAndPlanta("GA", plantaClave) : [];
      const ggList = plantaClave ? await getUsersByRoleAndPlanta("GG", plantaClave) : [];
      const cdmxList = await getUsersByRole("CDMX");

      const warnCot = folio.cotizacion_url ? "" : "\n⚠️ Aún no tiene la cotización adjunta.";
      const msgToSend =
        `${urgentPrefix(folio.prioridad)}Folio APROBADO: ${folioCode}\n` +
        `Planta: ${plantaClave || "-"}\n` +
        `Monto: ${folio.importe ?? folio.monto ?? "-"}\n` +
        `Concepto: ${folio.concepto || folio.descripcion || "-"}\n` +
        `Beneficiario: ${folio.beneficiario || "-"}\n` +
        `Categoría: ${folio.categoria || "-"} / ${folio.subcategoria || "-"}\n` +
        (folio.unidad ? `Unidad: ${folio.unidad}\n` : "") +
        `Estatus: Aprobado\n` +
        warnCot +
        `\n\nComandos:\n- estatus ${folioCode}\n- adjuntar ${folioCode} (mandando PDF)`;

      const recipients = [...gaList, ...ggList, ...cdmxList]
        .map(u => u.telefono)
        .filter(Boolean);

      for (const tel of recipients) {
        await sendWhatsApp(`whatsapp:${tel}`, msgToSend);
      }

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Folio ${folioCode} aprobado.\n` +
          `Notifiqué a GA, GG y Contralor CDMX.\n` +
          (folio.cotizacion_url ? "" : "⚠️ Nota: aún no tiene cotización adjunta.\n")
        )
      );
    }

    // =========================
    // C) ADJUNTAR (mandar PDF en el mensaje)
    // =========================
    if (message.startsWith("adjuntar")) {
      const code = incomingMsg.replace(/adjuntar/i, "").trim();

      if (!code) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Usa: adjuntar F-YYYYMM-XXX y manda el PDF en el mismo mensaje."));
      }

      const folio = await obtenerFolioDB(code);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${code}`));
      }

      const folioCode = folio.folio_codigo || folio.numero_folio;

      if (!numMedia || !mediaUrl0) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Manda el comando adjuntar + el PDF como archivo en el mismo mensaje."));
      }

      const mediaResp = await axios.get(mediaUrl0, {
        responseType: "arraybuffer",
        auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN }
      });

      const buffer = Buffer.from(mediaResp.data);
      const ct = mediaType0 || "application/pdf";

      const s3url = await uploadPdfToS3({
        folio_codigo: folioCode,
        mediaBuffer: buffer,
        contentType: ct
      });

      await actualizarFolioDB(folioCode, { cotizacion_url: s3url });

      await logHistorial({
        folio_codigo: folioCode,
        estatus: folio.estatus || "Actualizado",
        comentario: `Cotización adjunta subida a S3: ${s3url}`,
        actor
      });

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Cotización adjunta al folio ${folioCode}.\n` +
          `Guardé en S3.\n` +
          `Estatus actual: ${folio.estatus || "-"}`
        )
      );
    }

    // =========================
    // D) CREAR FOLIO (captura guiada)
    // =========================
    if (message.includes("crear folio")) {
      drafts[fromTel] = drafts[fromTel] || {};

      drafts[fromTel].prioridad = message.includes("urgente") ? "Urgente no programado" : "Normal";

      const concepto = incomingMsg.replace(/crear folio/i, "").trim();
      if (concepto) drafts[fromTel].concepto = concepto;

      Object.assign(drafts[fromTel], parseKeyValueLines(incomingMsg));

      // Si el actor trae planta, se toma por default, pero SIEMPRE puede override con Planta:
      if (!drafts[fromTel].planta && actor.planta_clave) drafts[fromTel].planta = actor.planta_clave;

      const miss = missingFields(drafts[fromTel], actor);
      if (miss.length) {
        res.set("Content-Type", "text/xml");
        return res.send(
          twiml(
            `Ok. Para crear el folio me falta: ${miss.join(", ")}.\n` +
            `Respóndeme en líneas así:\n` +
            `Planta: ACAPULCO / PUEBLA / TEHUACAN / ...\n` +
            `Beneficiario: ____\n` +
            `Importe: ____\n` +
            `Categoría: Gastos / Inversiones / Derechos y Obligaciones / Taller\n` +
            `Subcategoría: ____\n` +
            (String(drafts[fromTel].categoria || "").toLowerCase().includes("taller") ? `Unidad: AT-03 o C-03\n` : "") +
            `(Concepto y prioridad ya los tomé)\n` +
            `Rol: ${actor.rol}`
          )
        );
      }

      const d = drafts[fromTel];

      if (!d.planta) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Falta Planta. Escribe por ejemplo: Planta: ACAPULCO"));
      }

      const plantaClave = String(d.planta).trim().toUpperCase();
      const plantaId = await resolvePlantaClaveToId(plantaClave);

      const folioCode = await buildMonthlyFolioIdDB();
      const importe = moneyToNumber(d.importe);

      const guardado = await crearFolioDB({
        folio_codigo: folioCode,
        planta_id: plantaId,
        planta_clave: plantaClave,
        creado_por_id: actor.usuario_id,
        creado_por: `${actor.usuario_nombre} (${actor.rol})`,
        concepto: d.concepto,
        importe,
        estatus: "Generado",
        prioridad: d.prioridad,
        beneficiario: d.beneficiario,
        categoria: d.categoria,
        subcategoria: d.subcategoria,
        unidad: d.unidad
      });

      await logHistorial({
        folio_codigo: folioCode,
        estatus: "Generado",
        comentario: `Creado desde WhatsApp. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor
      });

      delete drafts[fromTel];

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Folio ${folioCode} creado y guardado.\n\n` +
          `${urgentPrefix(d.prioridad)}Planta: ${plantaClave}\n` +
          `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
          `Concepto: ${d.concepto}\n` +
          `Beneficiario: ${d.beneficiario}\n` +
          `Importe: ${importe}\n` +
          `Categoría: ${d.categoria}\n` +
          `Subcategoría: ${d.subcategoria}\n` +
          (d.unidad ? `Unidad: ${d.unidad}\n` : "") +
          `Prioridad: ${d.prioridad}\n\n` +
          `Para adjuntar cotización: "adjuntar ${folioCode}" + manda el PDF.\n` +
          `Para consultar: "estatus ${folioCode}"`
        )
      );
    }

    // =========================
    // E) Completar borrador
    // =========================
    if (drafts[fromTel]) {
      Object.assign(drafts[fromTel], parseKeyValueLines(incomingMsg));
      if (!drafts[fromTel].planta && actor.planta_clave) drafts[fromTel].planta = actor.planta_clave;

      const miss = missingFields(drafts[fromTel], actor);

      res.set("Content-Type", "text/xml");
      if (miss.length) {
        return res.send(
          twiml(
            `Me falta: ${miss.join(", ")}.\n` +
            `Respóndeme solo esos campos (ej: "Importe: 25000").`
          )
        );
      }

      const d = drafts[fromTel];

      if (!d.planta) {
        return res.send(twiml("Falta Planta. Escribe por ejemplo: Planta: ACAPULCO"));
      }

      const plantaClave = String(d.planta).trim().toUpperCase();
      const plantaId = await resolvePlantaClaveToId(plantaClave);

      const folioCode = await buildMonthlyFolioIdDB();
      const importe = moneyToNumber(d.importe);

      await crearFolioDB({
        folio_codigo: folioCode,
        planta_id: plantaId,
        planta_clave: plantaClave,
        creado_por_id: actor.usuario_id,
        creado_por: `${actor.usuario_nombre} (${actor.rol})`,
        concepto: d.concepto,
        importe,
        estatus: "Generado",
        prioridad: d.prioridad,
        beneficiario: d.beneficiario,
        categoria: d.categoria,
        subcategoria: d.subcategoria,
        unidad: d.unidad
      });

      await logHistorial({
        folio_codigo: folioCode,
        estatus: "Generado",
        comentario: `Creado desde borrador. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor
      });

      delete drafts[fromTel];

      return res.send(
        twiml(
          `✅ Folio ${folioCode} creado.\n` +
          `${urgentPrefix(d.prioridad)}Planta: ${plantaClave}\n` +
          `Para adjuntar cotización: "adjuntar ${folioCode}" + manda el PDF.`
        )
      );
    }

    // =========================
    // F) Fallback
    // =========================
    res.set("Content-Type", "text/xml");
    return res.send(
      twiml(
        "Comandos disponibles:\n" +
        "- crear folio <concepto> [urgente]\n" +
        "- estatus <F-YYYYMM-XXX>\n" +
        "- aprobar <F-YYYYMM-XXX> (solo ZP)\n" +
        "- adjuntar <F-YYYYMM-XXX> (enviar PDF)\n"
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
