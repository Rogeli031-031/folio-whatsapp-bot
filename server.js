// server.js
// WhatsApp (Twilio) + PostgreSQL (Render) + S3 (AWS)
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
const DATABASE_URL = process.env.DATABASE_URL || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || ""; // "whatsapp:+14155238886"

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "";
const S3_BUCKET = process.env.S3_BUCKET || "";

const DEBUG_INCOMING = String(process.env.DEBUG_INCOMING || "1") === "1";

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

pool.query("SELECT current_database()")
  .then(r => console.log("BD CONECTADA:", r.rows[0].current_database))
  .catch(e => console.error("Error BD:", e));

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
  // normaliza MX: +521XXXXXXXXXX -> +52XXXXXXXXXX
  tel = tel.replace(/^\+521/, "+52");
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

function normalizePlantaKey(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/Á/g, "A")
    .replace(/É/g, "E")
    .replace(/Í/g, "I")
    .replace(/Ó/g, "O")
    .replace(/Ú/g, "U");
}

// =========================
// Schema / Introspection
// =========================
let COLMAP = null;

async function colExists(table, col) {
  const r = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2
     LIMIT 1`,
    [table, col]
  );
  return r.rowCount > 0;
}

async function computeColumnMap() {
  // folios: folio_codigo vs numero_folio
  const folioCol =
    (await colExists("folios", "folio_codigo")) ? "folio_codigo" :
    (await colExists("folios", "numero_folio")) ? "numero_folio" :
    null;

  // folio_historial: folio_codigo vs numero_folio
  const histFolioCol =
    (await colExists("folio_historial", "folio_codigo")) ? "folio_codigo" :
    (await colExists("folio_historial", "numero_folio")) ? "numero_folio" :
    null;

  // historial actor: actor_id vs actor_telefono/actor_rol
  const histHasActorId = await colExists("folio_historial", "actor_id");
  const histHasActorTel = await colExists("folio_historial", "actor_telefono");
  const histHasActorRol = await colExists("folio_historial", "actor_rol");

  // folios model: relational (planta_id/creado_por_id) vs text fields
  const foliosHasPlantaId = await colExists("folios", "planta_id");
  const foliosHasPlantaText = await colExists("folios", "planta");
  const foliosHasCreadoPorId = await colExists("folios", "creado_por_id");
  const foliosHasCreadoPorText = await colExists("folios", "creado_por");

  // conceptos/montos
  const foliosHasConcepto = await colExists("folios", "concepto");
  const foliosHasDescripcion = await colExists("folios", "descripcion");
  const foliosHasImporte = await colExists("folios", "importe");
  const foliosHasMonto = await colExists("folios", "monto");
  const foliosHasCreadoEn = await colExists("folios", "creado_en");
  const foliosHasFechaCreacion = await colExists("folios", "fecha_creacion");

  return {
    folioCol,
    histFolioCol,
    histHasActorId,
    histHasActorTel,
    histHasActorRol,
    foliosHasPlantaId,
    foliosHasPlantaText,
    foliosHasCreadoPorId,
    foliosHasCreadoPorText,
    foliosHasConcepto,
    foliosHasDescripcion,
    foliosHasImporte,
    foliosHasMonto,
    foliosHasCreadoEn,
    foliosHasFechaCreacion
  };
}

// =========================
// 1) ensureSchema (crea/ajusta sin borrar)
// =========================
async function ensureSchema() {
  // Catálogos
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

  // Consecutivo
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_counters (
      yyyymm VARCHAR(6) PRIMARY KEY,
      last_seq INT NOT NULL
    );
  `);

  // folios (intentamos soportar AMBOS modelos)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folios (
      id SERIAL PRIMARY KEY
    );
  `);

  // Columna folio id (soporta folio_codigo o numero_folio)
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS folio_codigo VARCHAR(50) UNIQUE;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS numero_folio VARCHAR(50) UNIQUE;`);

  // Planta (soporta planta_id o planta texto)
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS planta_id INT REFERENCES plantas(id);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS planta VARCHAR(50);`);

  // Creador (soporta creado_por_id o creado_por texto)
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS creado_por_id INT REFERENCES usuarios(id);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS creado_por VARCHAR(120);`);

  // Campos de negocio (soporta concepto/descripcion, importe/monto)
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS concepto TEXT;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS descripcion TEXT;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS importe NUMERIC(12,2);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS monto NUMERIC(12,2);`);

  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS estatus VARCHAR(50);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS prioridad VARCHAR(60);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS beneficiario VARCHAR(150);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS categoria VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS unidad VARCHAR(50);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS cotizacion_url TEXT;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS aprobado_por VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS aprobado_en TIMESTAMP;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  // historial
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_historial (
      id SERIAL PRIMARY KEY
    );
  `);

  // Soporta historial por folio_codigo o numero_folio
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS folio_codigo VARCHAR(50);`);
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS numero_folio VARCHAR(50);`);

  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS estatus VARCHAR(50);`);
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS comentario TEXT;`);
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  // Actor (soporta actor_id o actor_telefono/actor_rol)
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS actor_id INT REFERENCES usuarios(id);`);
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS actor_telefono VARCHAR(30);`);
  await pool.query(`ALTER TABLE folio_historial ADD COLUMN IF NOT EXISTS actor_rol VARCHAR(50);`);

  // comentarios (opcional)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id SERIAL PRIMARY KEY,
      folio_codigo VARCHAR(50),
      numero_folio VARCHAR(50),
      comentario TEXT NOT NULL,
      actor_id INT NULL REFERENCES usuarios(id),
      actor_telefono VARCHAR(30),
      actor_rol VARCHAR(50),
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

  COLMAP = await computeColumnMap();
  console.log("✅ Schema verificado (alineado a tu BD).", COLMAP);
}

// =========================
// 2) Identidad por teléfono (DB)
// =========================
async function getActorByPhone(fromRaw) {
  const tel = normalizeFrom(fromRaw);

  const sql = `
    SELECT
      u.id,
      u.telefono,
      u.nombre AS usuario_nombre,
      u.email,
      u.activo,
      r.clave AS rol,
      r.nombre AS rol_nombre,
      r.nivel AS rol_nivel,
      u.planta_id,
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

async function getPlantaByClaveOrNombre(input) {
  const key = normalizePlantaKey(input);

  // intentamos por clave exacta
  let r = await pool.query(
    `SELECT id, clave, nombre FROM plantas WHERE UPPER(clave)=$1 LIMIT 1`,
    [key]
  );
  if (r.rowCount) return r.rows[0];

  // intentamos por nombre
  r = await pool.query(
    `SELECT id, clave, nombre FROM plantas WHERE UPPER(nombre)=$1 LIMIT 1`,
    [key]
  );
  if (r.rowCount) return r.rows[0];

  // intento "contiene" (por si escriben "Puebla" y en BD está "PUEBLA PLANTA")
  r = await pool.query(
    `SELECT id, clave, nombre FROM plantas WHERE UPPER(nombre) LIKE $1 OR UPPER(clave) LIKE $1 LIMIT 1`,
    [`%${key}%`]
  );
  if (r.rowCount) return r.rows[0];

  return null;
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
// 4) Folios DB (adaptable)
// =========================
function getFolioIdColumn() {
  if (!COLMAP?.folioCol) {
    // fallback
    return "folio_codigo";
  }
  return COLMAP.folioCol;
}

function getHistFolioIdColumn() {
  if (!COLMAP?.histFolioCol) {
    return "folio_codigo";
  }
  return COLMAP.histFolioCol;
}

async function crearFolioDB(payload) {
  const folioIdCol = getFolioIdColumn();

  // define columnas existentes
  const cols = [];
  const vals = [];
  const params = [];
  let idx = 1;

  // folio id
  cols.push(folioIdCol);
  vals.push(payload.folio_id);
  params.push(`$${idx++}`);

  // planta (preferir planta_id si existe)
  if (COLMAP.foliosHasPlantaId) {
    cols.push("planta_id");
    vals.push(payload.planta_id);
    params.push(`$${idx++}`);
  } else if (COLMAP.foliosHasPlantaText) {
    cols.push("planta");
    vals.push(payload.planta_clave || payload.planta_text || "");
    params.push(`$${idx++}`);
  }

  // creador
  if (COLMAP.foliosHasCreadoPorId) {
    cols.push("creado_por_id");
    vals.push(payload.creado_por_id);
    params.push(`$${idx++}`);
  } else if (COLMAP.foliosHasCreadoPorText) {
    cols.push("creado_por");
    vals.push(payload.creado_por_text || "");
    params.push(`$${idx++}`);
  }

  // concepto/descripcion
  if (COLMAP.foliosHasConcepto) {
    cols.push("concepto");
    vals.push(payload.concepto || "");
    params.push(`$${idx++}`);
  } else if (COLMAP.foliosHasDescripcion) {
    cols.push("descripcion");
    vals.push(payload.concepto || "");
    params.push(`$${idx++}`);
  }

  // importe/monto
  if (COLMAP.foliosHasImporte) {
    cols.push("importe");
    vals.push(payload.importe || 0);
    params.push(`$${idx++}`);
  } else if (COLMAP.foliosHasMonto) {
    cols.push("monto");
    vals.push(payload.importe || 0);
    params.push(`$${idx++}`);
  }

  cols.push("estatus");       vals.push(payload.estatus || "Generado"); params.push(`$${idx++}`);
  cols.push("prioridad");     vals.push(payload.prioridad || null);     params.push(`$${idx++}`);
  cols.push("beneficiario");  vals.push(payload.beneficiario || null);  params.push(`$${idx++}`);
  cols.push("categoria");     vals.push(payload.categoria || null);     params.push(`$${idx++}`);
  cols.push("subcategoria");  vals.push(payload.subcategoria || null);  params.push(`$${idx++}`);
  cols.push("unidad");        vals.push(payload.unidad || null);        params.push(`$${idx++}`);

  const sql = `
    INSERT INTO folios (${cols.join(", ")})
    VALUES (${params.join(", ")})
    RETURNING *;
  `;

  const r = await pool.query(sql, vals);
  return r.rows[0];
}

async function obtenerFolioDB(folioId) {
  const folioIdCol = getFolioIdColumn();
  const r = await pool.query(
    `SELECT * FROM folios WHERE ${folioIdCol}=$1 ORDER BY id DESC LIMIT 1`,
    [folioId]
  );
  return r.rows[0] || null;
}

async function actualizarFolioDB(folioId, fields) {
  const folioIdCol = getFolioIdColumn();
  const keys = Object.keys(fields);
  if (!keys.length) return;

  const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(", ");
  const values = keys.map((k) => fields[k]);

  await pool.query(
    `UPDATE folios SET ${sets} WHERE ${folioIdCol}=$1`,
    [folioId, ...values]
  );
}

async function logHistorial({ folio_id, estatus, comentario, actor }) {
  const histFolioCol = getHistFolioIdColumn();

  const cols = [histFolioCol, "estatus", "comentario"];
  const vals = [folio_id, estatus || null, comentario || null];
  const params = ["$1", "$2", "$3"];
  let idx = 4;

  if (COLMAP.histHasActorId) {
    cols.push("actor_id");
    vals.push(actor?.id || null);
    params.push(`$${idx++}`);
  }
  if (COLMAP.histHasActorTel) {
    cols.push("actor_telefono");
    vals.push(actor?.telefono || null);
    params.push(`$${idx++}`);
  }
  if (COLMAP.histHasActorRol) {
    cols.push("actor_rol");
    vals.push(actor?.rol || null);
    params.push(`$${idx++}`);
  }

  await pool.query(
    `INSERT INTO folio_historial (${cols.join(", ")}) VALUES (${params.join(", ")})`,
    vals
  );
}

// =========================
// 5) S3: subir cotización
// =========================
async function uploadPdfToS3({ folio_id, mediaBuffer, contentType }) {
  if (!s3) throw new Error("S3 no configurado");

  const key = `cotizaciones/${folio_id}/${Date.now()}.pdf`;
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
    .map((l) => l.trim())
    .filter(Boolean);

  for (const l of lines) {
    const m = l.match(/^([a-záéíóúñ\s]+)\s*:\s*(.+)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();

    if (key.includes("planta")) out.planta = val;
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

  // Regla: ZP / CDMX deben indicar Planta SIEMPRE
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

// =========================
// 8) Webhook Twilio WhatsApp
// =========================
app.post("/webhook", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const fromRaw = req.body.From || "unknown";
  const fromTel = normalizeFrom(fromRaw);
  const message = incomingMsg.toLowerCase();

  // Media (PDF)
  const numMedia = Number(req.body.NumMedia || 0);
  const mediaUrl0 = req.body.MediaUrl0;
  const mediaType0 = req.body.MediaContentType0;

  try {
    if (DEBUG_INCOMING) {
      console.log("📩 IN:", {
        fromTel,
        messageSid: req.body.MessageSid,
        numMedia,
        body: incomingMsg.length > 400 ? incomingMsg.slice(0, 400) + "..." : incomingMsg
      });
    }

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
            ? `${urgentPrefix(folio.prioridad)}Folio: ${folio[getFolioIdColumn()]}\n` +
              `Estatus: ${folio.estatus || "-"}\n` +
              `Importe: ${folio.importe ?? folio.monto ?? "-"}\n` +
              `Concepto: ${folio.concepto ?? folio.descripcion ?? "-"}\n` +
              `Beneficiario: ${folio.beneficiario || "-"}\n` +
              `Categoría: ${folio.categoria || "-"} / ${folio.subcategoria || "-"}\n` +
              (folio.unidad ? `Unidad: ${folio.unidad}\n` : "") +
              `Cotización: ${folio.cotizacion_url ? "✅ Adjunta" : "⚠️ No adjunta"}`
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
        aprobado_en: new Date()
      });

      await logHistorial({
        folio_id: folioId,
        estatus: "Aprobado",
        comentario: "Aprobado por Director ZP.",
        actor
      });

      // Notificar GA + GG de la planta (si existe planta_clave) + CDMX
      const plantaClave = actor.planta_clave || null;
      const cdmxList = await getUsersByRole("CDMX");
      const gaList = plantaClave ? await getUsersByRoleAndPlanta("GA", plantaClave) : [];
      const ggList = plantaClave ? await getUsersByRoleAndPlanta("GG", plantaClave) : [];

      const warnCot = folio.cotizacion_url ? "" : "\n⚠️ Aún no tiene la cotización adjunta.";
      const msgToSend =
        `${urgentPrefix(folio.prioridad)}Folio APROBADO: ${folio[getFolioIdColumn()]}\n` +
        `Importe: ${folio.importe ?? folio.monto ?? "-"}\n` +
        `Concepto: ${folio.concepto ?? folio.descripcion ?? "-"}\n` +
        `Beneficiario: ${folio.beneficiario || "-"}\n` +
        `Categoría: ${folio.categoria || "-"} / ${folio.subcategoria || "-"}\n` +
        (folio.unidad ? `Unidad: ${folio.unidad}\n` : "") +
        `Estatus: Aprobado\n` +
        warnCot +
        `\n\nComandos:\n- estatus ${folio[getFolioIdColumn()]}\n- adjuntar ${folio[getFolioIdColumn()]} (mandando PDF)`;

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
        auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN }
      });

      const buffer = Buffer.from(mediaResp.data);
      const ct = mediaType0 || "application/pdf";

      const s3url = await uploadPdfToS3({
        folio_id: folioId,
        mediaBuffer: buffer,
        contentType: ct
      });

      await actualizarFolioDB(folioId, { cotizacion_url: s3url });

      await logHistorial({
        folio_id: folioId,
        estatus: folio.estatus || "Actualizado",
        comentario: `Cotización adjunta subida a S3: ${s3url}`,
        actor
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

      // Si actor tiene planta, se propone (pero ZP/CDMX igual pueden escribir Planta:)
      if (actor.planta_clave && !drafts[fromTel].planta) drafts[fromTel].planta = actor.planta_clave;

      const miss = missingFields(drafts[fromTel], actor);
      if (miss.length) {
        res.set("Content-Type", "text/xml");
        return res.send(
          twiml(
            `Ok. Para crear el folio me falta: ${miss.join(", ")}.\n` +
            `Respóndeme en líneas así:\n` +
            ((actor.rol === "ZP" || actor.rol === "CDMX") ? `Planta: ACAPULCO / PUEBLA / TEHUACAN / ...\n` : "") +
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

      // si ya tiene todo, cae a completar borrador (abajo)
    }

    // =========================
    // E) Completar borrador
    // =========================
    if (drafts[fromTel]) {
      Object.assign(drafts[fromTel], parseKeyValueLines(incomingMsg));
      if (actor.planta_clave && !drafts[fromTel].planta) drafts[fromTel].planta = actor.planta_clave;

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

      // Planta obligatoria SIEMPRE
      if (!d.planta) {
        return res.send(twiml("Falta Planta. Escribe por ejemplo: Planta: ACAPULCO"));
      }

      // Resolver planta -> planta_id
      const planta = await getPlantaByClaveOrNombre(d.planta);
      if (!planta) {
        return res.send(
          twiml(
            `No reconozco la planta "${d.planta}".\n` +
            `Verifica que exista en la tabla plantas (clave/nombre).`
          )
        );
      }

      const folioId = await buildMonthlyFolioIdDB();
      const importe = moneyToNumber(d.importe);

      const guardado = await crearFolioDB({
        folio_id: folioId,
        planta_id: planta.id,
        planta_clave: planta.clave,
        planta_text: planta.clave,
        creado_por_id: actor.id,
        creado_por_text: `${actor.usuario_nombre} (${actor.rol})`,
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
        folio_id: folioId,
        estatus: "Generado",
        comentario: `Creado desde WhatsApp. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor
      });

      delete drafts[fromTel];

      return res.send(
        twiml(
          `✅ Folio ${folioId} creado.\n` +
          `${urgentPrefix(d.prioridad)}Planta: ${planta.clave}\n` +
          `Para adjuntar cotización: "adjuntar ${folioId}" + manda el PDF.\n` +
          `Para consultar: "estatus ${folioId}"`
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

