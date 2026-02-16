// server.js
// WhatsApp (Twilio) + PostgreSQL (Render) + S3 (AWS) + (opcional) OpenAI
// Comandos:
// - crear folio <concepto> [urgente]
// - estatus F-YYYYMM-XXX
// - aprobar F-YYYYMM-XXX        (solo ZP)
// - adjuntar F-YYYYMM-XXX       (enviar PDF adjunto en el mensaje)

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
  console.warn("⚠️ Falta Twilio vars (solo responderá por TwiML; no podrá notificar outbound).");
}
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !S3_BUCKET) {
  console.warn("⚠️ Falta AWS/S3 vars (no podrá subir cotizaciones).");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.query("SELECT current_database()")
  .then((r) => console.log("BD CONECTADA:", r.rows[0].current_database))
  .catch((e) => console.error("Error BD:", e));

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

const s3 =
  AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION
    ? new S3Client({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
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
  tel = tel.replace(/^\+521/, "+52");
  tel = tel.replace(/\s+/g, "");
  return tel;
}

function normalizeWhatsApp(from) {
  const tel = normalizeFrom(from);
  return `whatsapp:${tel}`;
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
    body: text,
  });
}

// =========================
// DB schema detection + safe SQL builders
// =========================
async function getTableColumns(tableName) {
  const r = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1
    `,
    [tableName]
  );
  return new Set((r.rows || []).map((x) => x.column_name));
}

function pickFirstExisting(colsSet, candidates) {
  for (const c of candidates) if (colsSet.has(c)) return c;
  return null;
}

function buildInsert(table, colsSet, dataObj) {
  const keys = Object.keys(dataObj).filter((k) => colsSet.has(k) && dataObj[k] !== undefined);
  if (!keys.length) throw new Error(`No hay columnas válidas para insertar en ${table}.`);
  const cols = keys.map((k) => `"${k}"`).join(", ");
  const vals = keys.map((_, i) => `$${i + 1}`).join(", ");
  const params = keys.map((k) => dataObj[k]);
  const sql = `INSERT INTO "${table}" (${cols}) VALUES (${vals}) RETURNING *;`;
  return { sql, params };
}

function buildUpdate(table, colsSet, whereCol, whereVal, fields) {
  const keys = Object.keys(fields).filter((k) => colsSet.has(k) && fields[k] !== undefined);
  if (!keys.length) return null;
  const sets = keys.map((k, i) => `"${k}"=$${i + 2}`).join(", ");
  const params = [whereVal, ...keys.map((k) => fields[k])];
  const sql = `UPDATE "${table}" SET ${sets} WHERE "${whereCol}"=$1;`;
  return { sql, params };
}

// Global “map” de nombres reales en tu DB
const DBMAP = {
  folios: null,
  folio_historial: null,
  comentarios: null,
  usuarios: null,
  plantas: null,
  roles: null,
};

// =========================
// 1) Schema (crea/ajusta sin borrar)
// =========================
async function ensureSchema() {
  // Base tables
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

  await pool.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS nivel INT NOT NULL DEFAULT 0;`);

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

  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(160);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_counters (
      yyyymm VARCHAR(6) PRIMARY KEY,
      last_seq INT NOT NULL
    );
  `);

  // IMPORTANT: tu DB ya trae "folios" con columnas tipo folio_codigo/planta_id/creado_por_id/concepto/importe...
  // Creamos si no existe, pero SIN asumir nombres; luego agregamos columnas faltantes.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folios (
      id SERIAL PRIMARY KEY
    );
  `);

  // En tu DB real, estos campos suelen existir; agregamos los que falten.
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS folio_codigo VARCHAR(50) UNIQUE;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS numero_folio VARCHAR(50) UNIQUE;`);

  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS planta_id INT NULL REFERENCES plantas(id);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS planta VARCHAR(50);`);

  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS creado_por_id INT NULL REFERENCES usuarios(id);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS creado_por VARCHAR(120);`);

  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS concepto TEXT;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS descripcion TEXT;`);

  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS importe NUMERIC(12,2);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS monto NUMERIC(12,2);`);

  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS categoria VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS unidad VARCHAR(50);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS prioridad VARCHAR(60);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS estatus VARCHAR(50);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS beneficiario VARCHAR(150);`);

  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS cotizacion_url TEXT;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS cotizacion_s3key TEXT;`);

  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS aprobado_por VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS aprobado_en TIMESTAMP;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS aprobado_por_id INT NULL REFERENCES usuarios(id);`);

  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  // Historial (aquí estaba tronando)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_historial (
      id SERIAL PRIMARY KEY
    );
  `);

  // Agregamos TODAS las variantes que has visto en errores:
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS numero_folio VARCHAR(50);`);
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS folio_codigo VARCHAR(50);`);
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS folio_id INT;`);

  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS estatus VARCHAR(50);`);
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS comentario TEXT;`);

  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS actor_telefono VARCHAR(30);`);
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS actor_rol VARCHAR(50);`);
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS actor_id INT;`);

  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  // Comentarios
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id SERIAL PRIMARY KEY
    );
  `);
  await pool.query(`ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS numero_folio VARCHAR(50);`);
  await pool.query(`ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS folio_codigo VARCHAR(50);`);
  await pool.query(`ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS comentario TEXT;`);
  await pool.query(`ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS actor_telefono VARCHAR(30);`);
  await pool.query(`ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS actor_rol VARCHAR(50);`);
  await pool.query(`ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  // Guarda requests Twilio para depurar "cómo lo envía"
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(30) DEFAULT 'twilio',
      from_tel VARCHAR(40),
      message_sid VARCHAR(80),
      num_media INT,
      body TEXT,
      payload JSONB,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Roles base (con nivel)
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

  // Detecta columnas reales
  DBMAP.folios = await getTableColumns("folios");
  DBMAP.folio_historial = await getTableColumns("folio_historial");
  DBMAP.comentarios = await getTableColumns("comentarios");
  DBMAP.usuarios = await getTableColumns("usuarios");
  DBMAP.plantas = await getTableColumns("plantas");
  DBMAP.roles = await getTableColumns("roles");

  console.log("🧠 Columnas detectadas:");
  console.log("folios:", [...DBMAP.folios].sort().join(", "));
  console.log("folio_historial:", [...DBMAP.folio_historial].sort().join(", "));
}

// =========================
// 2) Identidad por teléfono (DB)
// =========================
async function getActorByPhone(fromRaw) {
  const tel = normalizeFrom(fromRaw);

  const sql = `
    SELECT
      u.id as usuario_id,
      u.telefono,
      u.nombre AS usuario_nombre,
      u.email AS email,
      u.activo,
      r.clave AS rol,
      r.nombre AS rol_nombre,
      r.nivel AS rol_nivel,
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

async function ensurePlantaExistsAndGetId(plantaClaveRaw) {
  const clave = String(plantaClaveRaw || "").trim().toUpperCase();
  if (!clave) return null;

  // busca
  let r = await pool.query(`SELECT id, clave FROM plantas WHERE clave=$1 LIMIT 1`, [clave]);
  if (r.rowCount) return r.rows[0].id;

  // crea si no existe
  await pool.query(
    `INSERT INTO plantas (clave, nombre) VALUES ($1,$2) ON CONFLICT (clave) DO NOTHING`,
    [clave, clave]
  );
  r = await pool.query(`SELECT id FROM plantas WHERE clave=$1 LIMIT 1`, [clave]);
  return r.rowCount ? r.rows[0].id : null;
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
      await client.query("UPDATE folio_counters SET last_seq=$2 WHERE yyyymm=$1", [
        yyyymm,
        nextSeq,
      ]);
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
// 4) Folios DB (dinámico a tu esquema)
// =========================
function folioColName() {
  // preferimos folio_codigo si existe, si no numero_folio
  return pickFirstExisting(DBMAP.folios, ["folio_codigo", "numero_folio"]);
}

function folioTextConceptCol() {
  return pickFirstExisting(DBMAP.folios, ["concepto", "descripcion"]);
}

function folioAmountCol() {
  return pickFirstExisting(DBMAP.folios, ["importe", "monto"]);
}

function folioCreatedAtCol() {
  return pickFirstExisting(DBMAP.folios, ["creado_en", "fecha_creacion"]);
}

async function crearFolioDB(payload) {
  const folioCol = folioColName();
  const conceptCol = folioTextConceptCol();
  const amountCol = folioAmountCol();
  const createdAtCol = folioCreatedAtCol();

  if (!folioCol) throw new Error("Tu tabla folios no tiene folio_codigo ni numero_folio.");

  const plantaId = payload.planta_id || null;

  const data = {
    [folioCol]: payload.folio_id,
    planta_id: plantaId,
    planta: payload.planta_clave || null,
    creado_por_id: payload.creado_por_id || null,
    creado_por: payload.creado_por || null,
    [conceptCol]: payload.concepto || null,
    [amountCol]: payload.importe ?? null,
    estatus: payload.estatus || "Generado",
    prioridad: payload.prioridad || null,
    beneficiario: payload.beneficiario || null,
    categoria: payload.categoria || null,
    subcategoria: payload.subcategoria || null,
    unidad: payload.unidad || null,
    [createdAtCol]: new Date(),
  };

  const { sql, params } = buildInsert("folios", DBMAP.folios, data);
  const r = await pool.query(sql, params);
  return r.rows[0];
}

async function obtenerFolioDB(folioId) {
  const folioCol = folioColName();
  if (!folioCol) return null;

  const r = await pool.query(
    `SELECT * FROM folios WHERE "${folioCol}"=$1 ORDER BY id DESC LIMIT 1`,
    [folioId]
  );
  return r.rows[0] || null;
}

async function actualizarFolioDB(folioId, fields) {
  const folioCol = folioColName();
  if (!folioCol) return;

  const upd = buildUpdate("folios", DBMAP.folios, folioCol, folioId, fields);
  if (!upd) return;
  await pool.query(upd.sql, upd.params);
}

async function logHistorial({ folioId, estatus, comentario, actor }) {
  // Aquí corregimos tu error actual:
  // - si folio_historial tiene NOT NULL en numero_folio => SIEMPRE mandamos numero_folio
  // - también mandamos folio_codigo si existe
  const data = {
    numero_folio: folioId,
    folio_codigo: folioId,
    estatus: estatus || null,
    comentario: comentario || null,
    actor_telefono: actor?.telefono || actor?.telefono_normalizado || actor?.telefono || null,
    actor_rol: actor?.rol || null,
    actor_id: actor?.usuario_id || null,
    creado_en: new Date(),
  };

  const { sql, params } = buildInsert("folio_historial", DBMAP.folio_historial, data);
  await pool.query(sql, params);
}

// =========================
// 5) S3: subir cotización
// =========================
async function uploadPdfToS3({ folioId, mediaBuffer, contentType }) {
  if (!s3) throw new Error("S3 no configurado");

  const key = `cotizaciones/${folioId}/${Date.now()}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: mediaBuffer,
      ContentType: contentType || "application/pdf",
    })
  );

  return { s3url: `s3://${S3_BUCKET}/${key}`, key };
}

// =========================
// 6) Drafts (captura guiada)
// =========================
const drafts = {}; // drafts[tel] = {...}

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

  if ((rol === "ZP" || rol === "CDMX") && !d.planta) miss.push("Planta");
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

// Ver último payload recibido (para validar “cómo lo envía”)
app.get("/debug-last", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, from_tel, message_sid, num_media, body, creado_en, payload
       FROM webhook_events ORDER BY id DESC LIMIT 1`
    );
    res.json({ ok: true, last: r.rows[0] || null });
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
  const messageSid = req.body.MessageSid || req.body.SmsMessageSid || "";

  // Guarda request para depuración
  try {
    await pool.query(
      `INSERT INTO webhook_events (from_tel, message_sid, num_media, body, payload)
       VALUES ($1,$2,$3,$4,$5)`,
      [fromTel, messageSid, numMedia, incomingMsg, req.body]
    );
  } catch (e) {
    console.warn("⚠️ No pude guardar webhook_events:", e?.message || e);
  }

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
      const folioId = incomingMsg.replace(/estatus/i, "").trim();
      const folio = await obtenerFolioDB(folioId);

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          folio
            ? `${urgentPrefix(folio.prioridad)}Folio: ${folio[folioColName()]}\n` +
                `Planta: ${folio.planta || "-"}\n` +
                `Estatus: ${folio.estatus || "-"}\n` +
                `Monto: ${(folio[folioAmountCol()] ?? "-")}\n` +
                `Descripción: ${(folio[folioTextConceptCol()] ?? "-")}\n` +
                `Cotización: ${folio.cotizacion_url ? "✅ Adjunta" : "⚠️ No adjunta"}\n` +
                `Fecha: ${(folio[folioCreatedAtCol()] ?? "-")}`
            : `No encontré el folio ${folioId}`
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

      const folioId = incomingMsg.replace(/aprobar/i, "").trim();
      const folio = await obtenerFolioDB(folioId);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${folioId}`));
      }

      await actualizarFolioDB(folioId, {
        estatus: "Aprobado",
        aprobado_por: `${actor.usuario_nombre} (ZP)`,
        aprobado_en: new Date(),
        aprobado_por_id: actor.usuario_id,
      });

      await logHistorial({
        folioId,
        estatus: "Aprobado",
        comentario: "Aprobado por Director ZP.",
        actor: { ...actor, telefono_normalizado: fromTel },
      });

      // Notificar GA + GG de la planta + CDMX
      const plantaClave = actor.planta_clave || folio.planta || null;
      const gaList = plantaClave ? await getUsersByRoleAndPlanta("GA", plantaClave) : [];
      const ggList = plantaClave ? await getUsersByRoleAndPlanta("GG", plantaClave) : [];
      const cdmxList = await getUsersByRole("CDMX");

      const warnCot = folio.cotizacion_url ? "" : "\n⚠️ Aún no tiene la cotización adjunta.";
      const msgToSend =
        `${urgentPrefix(folio.prioridad)}Folio APROBADO: ${folioId}\n` +
        `Planta: ${plantaClave || "-"}\n` +
        `Monto: ${folio[folioAmountCol()] ?? "-"}\n` +
        `Concepto: ${folio[folioTextConceptCol()] ?? "-"}\n` +
        `Beneficiario: ${folio.beneficiario || "-"}\n` +
        `Categoría: ${folio.categoria || "-"} / ${folio.subcategoria || "-"}\n` +
        (folio.unidad ? `Unidad: ${folio.unidad}\n` : "") +
        `Estatus: Aprobado\n` +
        warnCot +
        `\n\nComandos:\n- estatus ${folioId}\n- adjuntar ${folioId} (mandando PDF)`;

      const recipients = [...gaList, ...ggList, ...cdmxList]
        .map((u) => u.telefono)
        .filter(Boolean);

      for (const tel of recipients) {
        await sendWhatsApp(`whatsapp:${tel}`, msgToSend);
      }

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Folio ${folioId} aprobado.\n` +
            `Notifiqué a GA, GG y Contralor CDMX.\n` +
            (folio.cotizacion_url ? "" : "⚠️ Nota: aún no tiene cotización adjunta.\n")
        )
      );
    }

    // =========================
    // C) ADJUNTAR (mandar PDF en el mensaje)
    // =========================
    if (message.startsWith("adjuntar")) {
      const folioId = incomingMsg.replace(/adjuntar/i, "").trim();

      if (!folioId) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Usa: adjuntar F-YYYYMM-XXX y manda el PDF en el mismo mensaje."));
      }

      const folio = await obtenerFolioDB(folioId);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${folioId}`));
      }

      if (!numMedia || !mediaUrl0) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Manda el comando adjuntar + el PDF como archivo en el mismo mensaje."));
      }

      const mediaResp = await axios.get(mediaUrl0, {
        responseType: "arraybuffer",
        auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN },
      });

      const buffer = Buffer.from(mediaResp.data);
      const ct = mediaType0 || "application/pdf";

      const { s3url, key } = await uploadPdfToS3({
        folioId,
        mediaBuffer: buffer,
        contentType: ct,
      });

      await actualizarFolioDB(folioId, { cotizacion_url: s3url, cotizacion_s3key: key });

      await logHistorial({
        folioId,
        estatus: folio.estatus || "Actualizado",
        comentario: `Cotización adjunta subida a S3: ${s3url}`,
        actor: { ...actor, telefono_normalizado: fromTel },
      });

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Cotización adjunta al folio ${folioId}.\n` +
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

      // Si actor trae planta, la tomamos
      if (actor.planta_clave) drafts[fromTel].planta = actor.planta_clave;

      const miss = missingFields(drafts[fromTel], actor);
      if (miss.length) {
        res.set("Content-Type", "text/xml");
        return res.send(
          twiml(
            `Ok. Para crear el folio me falta: ${miss.join(", ")}.\n` +
              `Respóndeme en líneas así:\n` +
              ((actor.rol === "ZP" || actor.rol === "CDMX")
                ? `Planta: ACAPULCO / PUEBLA / TEHUACAN / ...\n`
                : "") +
              `Beneficiario: ____\n` +
              `Importe: ____\n` +
              `Categoría: Gastos / Inversiones / Derechos y Obligaciones / Taller\n` +
              `Subcategoría: ____\n` +
              (String(drafts[fromTel].categoria || "").toLowerCase().includes("taller")
                ? `Unidad: AT-03 o C-03\n`
                : "") +
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

      const folioId = await buildMonthlyFolioIdDB();
      const importe = moneyToNumber(d.importe);
      const plantaId = await ensurePlantaExistsAndGetId(d.planta);

      const guardado = await crearFolioDB({
        folio_id: folioId,
        planta_id: plantaId,
        planta_clave: d.planta,
        concepto: d.concepto,
        importe,
        estatus: "Generado",
        creado_por: `${actor.usuario_nombre} (${actor.rol})`,
        creado_por_id: actor.usuario_id,
        prioridad: d.prioridad,
        beneficiario: d.beneficiario,
        categoria: d.categoria,
        subcategoria: d.subcategoria,
        unidad: d.unidad,
      });

      await logHistorial({
        folioId,
        estatus: "Generado",
        comentario: `Creado desde WhatsApp. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor: { ...actor, telefono_normalizado: fromTel },
      });

      delete drafts[fromTel];

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Folio ${folioId} creado y guardado.\n\n` +
            `${urgentPrefix(d.prioridad)}Planta: ${d.planta}\n` +
            `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
            `Concepto: ${d.concepto}\n` +
            `Beneficiario: ${d.beneficiario}\n` +
            `Importe: ${importe}\n` +
            `Categoría: ${d.categoria}\n` +
            `Subcategoría: ${d.subcategoria}\n` +
            (d.unidad ? `Unidad: ${d.unidad}\n` : "") +
            `Prioridad: ${d.prioridad}\n\n` +
            `Para adjuntar cotización: "adjuntar ${folioId}" + manda el PDF.\n` +
            `Para consultar: "estatus ${folioId}"`
        )
      );
    }

    // =========================
    // E) Completar borrador
    // =========================
    if (drafts[fromTel]) {
      Object.assign(drafts[fromTel], parseKeyValueLines(incomingMsg));
      if (actor.planta_clave) drafts[fromTel].planta = actor.planta_clave;

      const miss = missingFields(drafts[fromTel], actor);
      res.set("Content-Type", "text/xml");

      if (miss.length) {
        return res.send(
          twiml(`Me falta: ${miss.join(", ")}.\n` + `Respóndeme solo esos campos (ej: "Importe: 25000").`)
        );
      }

      const d = drafts[fromTel];
      if (!d.planta) return res.send(twiml("Falta Planta. Escribe por ejemplo: Planta: ACAPULCO"));

      const folioId = await buildMonthlyFolioIdDB();
      const importe = moneyToNumber(d.importe);
      const plantaId = await ensurePlantaExistsAndGetId(d.planta);

      await crearFolioDB({
        folio_id: folioId,
        planta_id: plantaId,
        planta_clave: d.planta,
        concepto: d.concepto,
        importe,
        estatus: "Generado",
        creado_por: `${actor.usuario_nombre} (${actor.rol})`,
        creado_por_id: actor.usuario_id,
        prioridad: d.prioridad,
        beneficiario: d.beneficiario,
        categoria: d.categoria,
        subcategoria: d.subcategoria,
        unidad: d.unidad,
      });

      await logHistorial({
        folioId,
        estatus: "Generado",
        comentario: `Creado desde borrador. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor: { ...actor, telefono_normalizado: fromTel },
      });

      delete drafts[fromTel];
      return res.send(
        twiml(
          `✅ Folio ${folioId} creado.\n` +
            `${urgentPrefix(d.prioridad)}Planta: ${d.planta}\n` +
            `Para adjuntar cotización: "adjuntar ${folioId}" + manda el PDF.`
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("✅ Servidor corriendo en puerto " + PORT));

