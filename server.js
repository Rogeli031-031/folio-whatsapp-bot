// server.js
// WhatsApp (Twilio) + PostgreSQL (Render) + S3 (AWS) + (opcional) OpenAI
// Comandos:
// - crear folio <concepto> [urgente]
// - estatus F-YYYYMM-XXX
// - aprobar F-YYYYMM-XXX        (solo ZP)
// - adjuntar F-YYYYMM-XXX       (enviar PDF adjunto en el mensaje)
// Catálogo:
// - Categoría por menú numérico
// - Subcategoría por menú numérico (solo Gastos/Inversiones)
// - Taller NO tiene subcategoría, pero exige Unidad AT-xx/C-xx
// - DyO NO tiene subcategoría
// Regla: si ZP o CDMX crean folio, deben indicar Planta: ACAPULCO/PUEBLA/...

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

// =========================
// DB + Clients
// =========================
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
  // Twilio WhatsApp -> "whatsapp:+521..."
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

function normText(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

// =========================
// 1) Schema (crea/ajusta sin borrar)
// =========================
async function ensureSchema() {
  // Plantas / Roles / Usuarios / counters / folios / historial / comentarios
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS folios (
      id SERIAL PRIMARY KEY,
      numero_folio VARCHAR(50) UNIQUE,
      planta VARCHAR(50) NOT NULL,
      descripcion TEXT,
      monto NUMERIC(12,2),
      estatus VARCHAR(50),
      creado_por VARCHAR(120),
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // columnas extra folios
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS prioridad VARCHAR(60);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS beneficiario VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS categoria VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS unidad VARCHAR(50);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS cotizacion_url TEXT;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS aprobado_por VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS aprobado_en TIMESTAMP;`);

  // ✅ IDs catálogo (guardar ambos)
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS categoria_id INT;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS subcategoria_id INT;`);

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

  // Catálogos (si no existen)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categorias (
      id SERIAL PRIMARY KEY,
      clave VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(120) NOT NULL,
      activo BOOLEAN DEFAULT TRUE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subcategorias (
      id SERIAL PRIMARY KEY,
      categoria_id INT NOT NULL REFERENCES categorias(id),
      clave VARCHAR(50) NOT NULL,
      nombre VARCHAR(120) NOT NULL,
      activo BOOLEAN DEFAULT TRUE,
      UNIQUE (categoria_id, clave)
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
      u.email AS email,
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

// =========================
// 3) Catálogos
// =========================
async function listCategorias() {
  const r = await pool.query(`
    SELECT id, clave, nombre
    FROM categorias
    WHERE activo=TRUE
    ORDER BY
      CASE clave
        WHEN 'GASTOS' THEN 1
        WHEN 'INVERSIONES' THEN 2
        WHEN 'DYO' THEN 3
        WHEN 'TALLER' THEN 4
        ELSE 99
      END
  `);
  return r.rows;
}

async function listSubcategorias(categoriaId) {
  const r = await pool.query(
    `
    SELECT id, clave, nombre
    FROM subcategorias
    WHERE activo=TRUE AND categoria_id=$1
    ORDER BY id
    `,
    [categoriaId]
  );
  return r.rows;
}

async function findCategoriaByText(text) {
  const cats = await listCategorias();
  const t = normText(text);
  return cats.find(c => normText(c.nombre) === t || normText(c.clave) === t) || null;
}

async function findSubcategoriaByText(categoriaId, text) {
  const subs = await listSubcategorias(categoriaId);
  const t = normText(text);
  return subs.find(s => normText(s.nombre) === t || normText(s.clave) === t) || null;
}

// =========================
// 4) Consecutivo mensual persistente (DB)
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
      await client.query("INSERT INTO folio_counters (yyyymm, last_seq) VALUES ($1, $2)", [yyyymm, 1]);
      nextSeq = 1;
    } else {
      nextSeq = r.rows[0].last_seq + 1;
      await client.query("UPDATE folio_counters SET last_seq=$2 WHERE yyyymm=$1", [yyyymm, nextSeq]);
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
// 5) Folios DB
// =========================
async function crearFolioDB(payload) {
  const sql = `
    INSERT INTO folios
    (numero_folio, planta, descripcion, monto, estatus, creado_por, prioridad,
     beneficiario, categoria_id, categoria, subcategoria_id, subcategoria, unidad)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *;
  `;
  const p = [
    payload.numero_folio,
    payload.planta,
    payload.descripcion,
    payload.monto,
    payload.estatus,
    payload.creado_por,
    payload.prioridad || null,
    payload.beneficiario || null,
    payload.categoria_id || null,
    payload.categoria || null,
    payload.subcategoria_id || null,
    payload.subcategoria || null,
    payload.unidad || null
  ];
  const r = await pool.query(sql, p);
  return r.rows[0];
}

async function obtenerFolioDB(numero_folio) {
  const r = await pool.query(
    `SELECT * FROM folios WHERE numero_folio=$1 ORDER BY id DESC LIMIT 1`,
    [numero_folio]
  );
  return r.rows[0] || null;
}

async function actualizarFolioDB(numero_folio, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;

  const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(", ");
  const values = keys.map((k) => fields[k]);

  await pool.query(`UPDATE folios SET ${sets} WHERE numero_folio=$1`, [numero_folio, ...values]);
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
      actor?.rol || null
    ]
  );
}

// =========================
// 6) S3: subir cotización
// =========================
async function uploadPdfToS3({ numero_folio, mediaBuffer, contentType }) {
  if (!s3) throw new Error("S3 no configurado");

  const key = `cotizaciones/${numero_folio}/${Date.now()}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: mediaBuffer,
      ContentType: contentType || "application/pdf"
    })
  );

  // por ahora guardamos ruta interna; luego hacemos presigned URL si bucket privado
  return `s3://${S3_BUCKET}/${key}`;
}

// =========================
// 7) Drafts (captura guiada + menús)
// =========================
const drafts = {}; // drafts[tel] = { ...estado, options... }

function parseKeyValueLines(text) {
  const out = {};
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const l of lines) {
    const m = l.match(/^([a-záéíóúñ\s]+)\s*:\s*(.+)$/i);
    if (!m) continue;
    const key = normText(m[1]);
    const val = m[2].trim();

    if (key.includes("planta")) out.planta = val.toUpperCase();
    if (key.includes("benefici")) out.beneficiario = val;
    if (key.includes("import") || key.includes("costo")) out.importe = val;
    if (key.includes("unidad")) out.unidad = val.toUpperCase();
    if (key.includes("concept")) out.concepto = val;
    if (key.includes("categori")) out.categoria_text = val;
    if (key.includes("subcategori")) out.subcategoria_text = val;
  }
  return out;
}

function isValidUnidad(u) {
  const s = String(u || "").trim().toUpperCase();
  return /^AT-\d{2,3}$/.test(s) || /^C-\d{2,3}$/.test(s);
}

function missingFieldsBasic(d, actor) {
  const miss = [];
  const rol = actor?.rol || "";

  if ((rol === "ZP" || rol === "CDMX") && !d.planta) miss.push("Planta");

  if (!d.concepto) miss.push("Concepto");
  if (!d.beneficiario) miss.push("Beneficiario");
  if (!d.importe) miss.push("Importe (o Costo)");

  return miss;
}

function renderMenu(title, rows) {
  // rows = [{nombre}]
  const lines = rows.map((r, i) => `${i + 1}) ${r.nombre}`).join("\n");
  return `${title}\n${lines}\n\nResponde con el número.`;
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
  const tel = normalizeFrom(fromRaw);
  const msgLower = incomingMsg.toLowerCase();

  // Media (PDF)
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

    // ===================================================
    // A) ESTATUS
    // ===================================================
    if (msgLower.startsWith("estatus")) {
      const num = incomingMsg.replace(/estatus/i, "").trim();
      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          folio
            ? `${urgentPrefix(folio.prioridad)}Folio: ${folio.numero_folio}\nPlanta: ${folio.planta}\nEstatus: ${folio.estatus}\nMonto: ${folio.monto}\nDescripción: ${folio.descripcion}\nCategoría: ${folio.categoria || "-"}\nSubcategoría: ${folio.subcategoria || "-"}\nUnidad: ${folio.unidad || "-"}\nCotización: ${folio.cotizacion_url ? "✅ Adjunta" : "⚠️ No adjunta"}\nFecha: ${folio.fecha_creacion}`
            : `No encontré el folio ${num}`
        )
      );
    }

    // ===================================================
    // B) APROBAR (solo ZP)
    // ===================================================
    if (msgLower.startsWith("aprobar")) {
      if (actor.rol !== "ZP") {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Solo el Director ZP puede aprobar folios."));
      }

      const num = incomingMsg.replace(/aprobar/i, "").trim();
      const folio = await obtenerFolioDB(num);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${num}`));
      }

      await actualizarFolioDB(num, {
        estatus: "Aprobado",
        aprobado_por: `${actor.usuario_nombre} (ZP)`,
        aprobado_en: new Date()
      });

      await logHistorial({
        numero_folio: num,
        estatus: "Aprobado",
        comentario: "Aprobado por Director ZP.",
        actor
      });

      // Notificar GA + GG de la planta + CDMX
      const gaList = await getUsersByRoleAndPlanta("GA", folio.planta);
      const ggList = await getUsersByRoleAndPlanta("GG", folio.planta);
      const cdmxList = await getUsersByRole("CDMX");

      const warnCot = folio.cotizacion_url ? "" : "\n⚠️ Aún no tiene la cotización adjunta.";
      const msgToSend =
        `${urgentPrefix(folio.prioridad)}Folio APROBADO: ${folio.numero_folio}\n` +
        `Planta: ${folio.planta}\n` +
        `Monto: ${folio.monto}\n` +
        `Concepto: ${folio.descripcion}\n` +
        `Beneficiario: ${folio.beneficiario || "-"}\n` +
        `Categoría: ${folio.categoria || "-"}\n` +
        `Subcategoría: ${folio.subcategoria || "-"}\n` +
        (folio.unidad ? `Unidad: ${folio.unidad}\n` : "") +
        `Estatus: Aprobado` +
        warnCot +
        `\n\nComandos:\n- estatus ${folio.numero_folio}\n- adjuntar ${folio.numero_folio} (mandando PDF)`;

      const recipients = [...gaList, ...ggList, ...cdmxList]
        .map((u) => u.telefono)
        .filter(Boolean);

      for (const t of recipients) {
        await sendWhatsApp(`whatsapp:${t}`, msgToSend);
      }

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Folio ${num} aprobado.\n` +
          `Notifiqué a GA, GG y Contralor CDMX.\n` +
          (folio.cotizacion_url ? "" : "⚠️ Nota: aún no tiene cotización adjunta.\n")
        )
      );
    }

    // ===================================================
    // C) ADJUNTAR (mandar PDF en el mensaje)
    // ===================================================
    if (msgLower.startsWith("adjuntar")) {
      const num = incomingMsg.replace(/adjuntar/i, "").trim();

      if (!num) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Usa: adjuntar F-YYYYMM-XXX y manda el PDF en el mismo mensaje."));
      }

      const folio = await obtenerFolioDB(num);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${num}`));
      }

      if (!numMedia || !mediaUrl0) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Manda el comando adjuntar + el PDF como archivo en el mismo mensaje."));
      }

      // Descargar PDF desde Twilio (Basic Auth)
      const mediaResp = await axios.get(mediaUrl0, {
        responseType: "arraybuffer",
        auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN }
      });

      const buffer = Buffer.from(mediaResp.data);
      const ct = mediaType0 || "application/pdf";

      const s3url = await uploadPdfToS3({
        numero_folio: num,
        mediaBuffer: buffer,
        contentType: ct
      });

      await actualizarFolioDB(num, { cotizacion_url: s3url });

      await logHistorial({
        numero_folio: num,
        estatus: folio.estatus || "Actualizado",
        comentario: `Cotización adjunta subida a S3: ${s3url}`,
        actor
      });

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Cotización adjunta al folio ${num}.\n` +
          `Guardé en S3.\n` +
          `Estatus actual: ${folio.estatus}`
        )
      );
    }

    // ===================================================
    // D) FLUJO CREAR FOLIO (con menús)
    // ===================================================
    const d = drafts[tel];

    // D1) Si ya hay draft y está esperando elección de categoría/subcategoría por número
    if (d && (d.estado === "ESPERANDO_CATEGORIA" || d.estado === "ESPERANDO_SUBCATEGORIA")) {
      const n = Number(incomingMsg.trim());
      if (!Number.isFinite(n) || n < 1) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Respóndeme con el número de la opción (ej: 1, 2, 3...)."));
      }

      if (d.estado === "ESPERANDO_CATEGORIA") {
        const opt = (d.categoria_options || [])[n - 1];
        if (!opt) {
          res.set("Content-Type", "text/xml");
          return res.send(twiml("Número fuera de rango. Intenta de nuevo."));
        }

        d.categoria_id = opt.id;
        d.categoria_clave = opt.clave;
        d.categoria_nombre = opt.nombre;

        // Reglas
        if (opt.clave === "DYO") {
          d.subcategoria_id = null;
          d.subcategoria_nombre = null;
          d.subcategoria_clave = null;
          d.estado = "ESPERANDO_RESTO";
        } else if (opt.clave === "TALLER") {
          d.subcategoria_id = null;
          d.subcategoria_nombre = null;
          d.subcategoria_clave = null;
          d.estado = "ESPERANDO_UNIDAD";
          res.set("Content-Type", "text/xml");
          return res.send(twiml("Taller seleccionado. Indica Unidad (ej: AT-03 o C-03)."));
        } else {
          // Gastos o Inversiones => subcategoría por menú
          const subs = await listSubcategorias(opt.id);
          d.subcategoria_options = subs;
          d.estado = "ESPERANDO_SUBCATEGORIA";
          res.set("Content-Type", "text/xml");
          return res.send(twiml(renderMenu(`Subcategorías de ${opt.nombre}:`, subs)));
        }
      }

      if (d.estado === "ESPERANDO_SUBCATEGORIA") {
        const opt = (d.subcategoria_options || [])[n - 1];
        if (!opt) {
          res.set("Content-Type", "text/xml");
          return res.send(twiml("Número fuera de rango. Intenta de nuevo."));
        }

        d.subcategoria_id = opt.id;
        d.subcategoria_clave = opt.clave;
        d.subcategoria_nombre = opt.nombre;

        d.estado = "ESPERANDO_RESTO";
        // sigue a validar/crear al final
      }
    }

    // D2) Iniciar creación
    if (msgLower.includes("crear folio") && !drafts[tel]) {
      drafts[tel] = {
        estado: "INICIADO",
        prioridad: msgLower.includes("urgente") ? "Urgente no programado" : "Normal"
      };

      const concepto = incomingMsg.replace(/crear folio/i, "").trim();
      if (concepto) drafts[tel].concepto = concepto;

      // si el actor trae planta, la toma
      if (actor.planta_clave) drafts[tel].planta = actor.planta_clave;

      // parsea líneas si las mandó
      Object.assign(drafts[tel], parseKeyValueLines(incomingMsg));
    }

    // D3) Si hay draft (en cualquier estado), aceptar líneas adicionales y/o textos de categoría
    if (drafts[tel]) {
      const dd = drafts[tel];
      Object.assign(dd, parseKeyValueLines(incomingMsg));

      // Si actor trae planta, la fuerza (salvo ZP/CDMX que deben especificar cuando no traen)
      if (actor.planta_clave) dd.planta = actor.planta_clave;

      // Si mandó "Categoría: ..." como texto, intenta mapear al catálogo
      if (!dd.categoria_id && dd.categoria_text) {
        const cat = await findCategoriaByText(dd.categoria_text);
        if (cat) {
          dd.categoria_id = cat.id;
          dd.categoria_clave = cat.clave;
          dd.categoria_nombre = cat.nombre;
        }
      }

      // Si mandó subcategoría como texto y la categoría permite subcat
      if (dd.categoria_id && !dd.subcategoria_id && dd.subcategoria_text) {
        if (dd.categoria_clave === "GASTOS" || dd.categoria_clave === "INVERSIONES") {
          const sub = await findSubcategoriaByText(dd.categoria_id, dd.subcategoria_text);
          if (sub) {
            dd.subcategoria_id = sub.id;
            dd.subcategoria_clave = sub.clave;
            dd.subcategoria_nombre = sub.nombre;
          }
        }
      }

      // 1) Validación básica
      const missBasic = missingFieldsBasic(dd, actor);
      if (missBasic.length) {
        res.set("Content-Type", "text/xml");
        return res.send(
          twiml(
            `Información incompleta. Falta: ${missBasic.join(", ")}.\n\n` +
            `Responde en líneas así:\n` +
            ((actor.rol === "ZP" || actor.rol === "CDMX") ? `Planta: ACAPULCO / PUEBLA / TEHUACAN / ...\n` : "") +
            `Beneficiario: ____\n` +
            `Importe: ____\n` +
            `Unidad: AT-03 (solo si Taller)\n`
          )
        );
      }

      // 2) Categoría: si no está definida, mostrar menú y esperar número
      if (!dd.categoria_id) {
        const cats = await listCategorias();
        dd.categoria_options = cats;
        dd.estado = "ESPERANDO_CATEGORIA";

        res.set("Content-Type", "text/xml");
        return res.send(twiml(renderMenu("Elige Categoría:", cats)));
      }

      // 3) Reglas por categoría
      if (dd.categoria_clave === "TALLER") {
        if (!dd.unidad || !isValidUnidad(dd.unidad)) {
          dd.estado = "ESPERANDO_UNIDAD";
          res.set("Content-Type", "text/xml");
          return res.send(twiml("Taller seleccionado. Indica Unidad válida: AT-03 o C-03 (ej: AT-03)."));
        }
        // Taller: subcategoría debe quedar null
        dd.subcategoria_id = null;
        dd.subcategoria_nombre = null;
        dd.subcategoria_clave = null;
      }

      if (dd.categoria_clave === "DYO") {
        // DyO: sin subcategoría
        dd.subcategoria_id = null;
        dd.subcategoria_nombre = null;
        dd.subcategoria_clave = null;
      }

      if (dd.categoria_clave === "GASTOS" || dd.categoria_clave === "INVERSIONES") {
        if (!dd.subcategoria_id) {
          const subs = await listSubcategorias(dd.categoria_id);
          dd.subcategoria_options = subs;
          dd.estado = "ESPERANDO_SUBCATEGORIA";

          res.set("Content-Type", "text/xml");
          return res.send(twiml(renderMenu(`Subcategorías de ${dd.categoria_nombre}:`, subs)));
        }
      }

      // 4) Crear folio (ya está completo)
      const folioId = await buildMonthlyFolioIdDB();
      const monto = moneyToNumber(dd.importe);

      const guardado = await crearFolioDB({
        numero_folio: folioId,
        planta: dd.planta,
        descripcion: dd.concepto,
        monto,
        estatus: "Generado",
        creado_por: `${actor.usuario_nombre} (${actor.rol})`,
        prioridad: dd.prioridad,
        beneficiario: dd.beneficiario,

        categoria_id: dd.categoria_id,
        categoria: dd.categoria_nombre,
        subcategoria_id: dd.subcategoria_id,
        subcategoria: dd.subcategoria_nombre,

        unidad: dd.categoria_clave === "TALLER" ? dd.unidad : (dd.unidad || null)
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: "Generado",
        comentario:
          `Creado desde WhatsApp. Prioridad: ${dd.prioridad}. ` +
          `Beneficiario: ${dd.beneficiario}. ` +
          `Categoría: ${dd.categoria_nombre}` +
          (dd.subcategoria_nombre ? ` / ${dd.subcategoria_nombre}` : "") +
          (guardado.unidad ? ` | Unidad: ${guardado.unidad}` : ""),
        actor
      });

      delete drafts[tel];

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Folio ${guardado.numero_folio} creado y guardado.\n\n` +
          `${urgentPrefix(dd.prioridad)}Planta: ${guardado.planta}\n` +
          `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
          `Concepto: ${dd.concepto}\n` +
          `Beneficiario: ${dd.beneficiario}\n` +
          `Monto: ${monto}\n` +
          `Categoría: ${dd.categoria_nombre}\n` +
          `Subcategoría: ${dd.subcategoria_nombre || "-"}\n` +
          (guardado.unidad ? `Unidad: ${guardado.unidad}\n` : "") +
          `Prioridad: ${dd.prioridad}\n\n` +
          `Para adjuntar cotización: "adjuntar ${guardado.numero_folio}" + manda el PDF.\n` +
          `Para consultar: "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // ===================================================
    // Fallback
    // ===================================================
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
