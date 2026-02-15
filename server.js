// server.js
// WhatsApp (Twilio) + PostgreSQL (Render) + S3 (AWS opcional)
// Comandos:
// - crear folio <concepto> [urgente]
// - estatus F-YYYYMM-XXX
// - aprobar F-YYYYMM-XXX        (solo ZP)
// - adjuntar F-YYYYMM-XXX       (enviar PDF en el mismo mensaje)

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

if (!DATABASE_URL) console.error("❌ Falta DATABASE_URL en Render.");
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
  console.warn("⚠️ Falta Twilio vars (no podrá notificar).");
}
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !S3_BUCKET) {
  console.warn("⚠️ Falta AWS/S3 vars (no podrá subir cotizaciones).");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool
  .query("SELECT current_database()")
  .then((r) => console.log("BD CONECTADA:", r.rows[0].current_database))
  .catch((e) => console.error("Error BD:", e));

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

const s3 =
  AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION
    ? new S3Client({
        region: AWS_REGION,
        credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
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
    body: text,
  });
}

// =========================
// Schema (alineado a tu BD)
// =========================
async function ensureSchema() {
  // Plantas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plantas (
      id SERIAL PRIMARY KEY,
      clave VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(120) NOT NULL
    );
  `);

  // Roles
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      clave VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(120) NOT NULL
    );
  `);
  await pool.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS nivel INT NOT NULL DEFAULT 0;`);

  // Usuarios
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

  // Idempotencia (anti duplicados por reintentos Twilio)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      message_sid VARCHAR(64) PRIMARY KEY,
      from_tel VARCHAR(30),
      recibido_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Consecutivo mensual
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_counters (
      yyyymm VARCHAR(6) PRIMARY KEY,
      last_seq INT NOT NULL
    );
  `);

  // Folios (⚠️ tu BD: folio_codigo, planta_id, creado_por_id, etc.)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folios (
      id SERIAL PRIMARY KEY,
      folio_codigo VARCHAR(50) UNIQUE NOT NULL,
      planta_id INT NOT NULL REFERENCES plantas(id),
      creado_por_id INT NOT NULL REFERENCES usuarios(id),
      beneficiario VARCHAR(150),
      concepto TEXT,
      importe NUMERIC(12,2),
      categoria VARCHAR(100),
      subcategoria VARCHAR(100),
      unidad VARCHAR(50),
      prioridad VARCHAR(60),
      estatus VARCHAR(60) DEFAULT 'Generado',
      cotizacion_url TEXT,
      aprobado_por_id INT NULL REFERENCES usuarios(id),
      aprobado_en TIMESTAMP NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Historial (alineado a folio_codigo)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_historial (
      id SERIAL PRIMARY KEY,
      folio_codigo VARCHAR(50) NOT NULL,
      estatus VARCHAR(60) NOT NULL,
      comentario TEXT,
      actor_id INT NULL REFERENCES usuarios(id),
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Comentarios (alineado a folio_codigo)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id SERIAL PRIMARY KEY,
      folio_codigo VARCHAR(50) NOT NULL,
      comentario TEXT NOT NULL,
      actor_id INT NULL REFERENCES usuarios(id),
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
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
    UPDATE roles SET nivel=10 WHERE clave='GA' AND (nivel IS NULL OR nivel=0);
    UPDATE roles SET nivel=20 WHERE clave='GG' AND (nivel IS NULL OR nivel=0);
    UPDATE roles SET nivel=30 WHERE clave='ZP' AND (nivel IS NULL OR nivel=0);
    UPDATE roles SET nivel=40 WHERE clave='CDMX' AND (nivel IS NULL OR nivel=0);
  `);

  console.log("✅ Schema verificado (alineado a tu BD).");
}

// =========================
// Identidad / catálogo
// =========================
async function getActorByPhone(fromRaw) {
  const tel = normalizeFrom(fromRaw);
  const r = await pool.query(
    `
    SELECT
      u.id AS usuario_id,
      u.telefono,
      u.nombre AS usuario_nombre,
      u.email,
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
    `,
    [tel]
  );
  return r.rows[0] || null;
}

async function getPlantaIdByClave(plantaClave) {
  const p = String(plantaClave || "").trim().toUpperCase();
  if (!p) return null;
  const r = await pool.query(`SELECT id FROM plantas WHERE clave=$1 LIMIT 1`, [p]);
  return r.rows[0]?.id || null;
}

async function getUsersByRoleAndPlanta(rolClave, plantaId) {
  const r = await pool.query(
    `
    SELECT u.telefono, u.nombre, r.clave AS rol
    FROM usuarios u
    JOIN roles r ON r.id=u.rol_id
    WHERE u.activo=TRUE AND r.clave=$1 AND u.planta_id=$2
    `,
    [rolClave, plantaId]
  );
  return r.rows || [];
}

async function getUsersByRole(rolClave) {
  const r = await pool.query(
    `
    SELECT u.telefono, u.nombre, r.clave AS rol
    FROM usuarios u
    JOIN roles r ON r.id=u.rol_id
    WHERE u.activo=TRUE AND r.clave=$1
    `,
    [rolClave]
  );
  return r.rows || [];
}

// =========================
// Folio consecutivo mensual
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
      await client.query("INSERT INTO folio_counters (yyyymm, last_seq) VALUES ($1, $2)", [
        yyyymm,
        1,
      ]);
      nextSeq = 1;
    } else {
      nextSeq = r.rows[0].last_seq + 1;
      await client.query("UPDATE folio_counters SET last_seq=$2 WHERE yyyymm=$1", [yyyymm, nextSeq]);
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
// DB actions
// =========================
async function crearFolioDB(payload) {
  const r = await pool.query(
    `
    INSERT INTO folios
    (folio_codigo, planta_id, creado_por_id, beneficiario, concepto, importe, categoria, subcategoria, unidad, prioridad, estatus)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *;
    `,
    [
      payload.folio_codigo,
      payload.planta_id,
      payload.creado_por_id,
      payload.beneficiario || null,
      payload.concepto || null,
      payload.importe || null,
      payload.categoria || null,
      payload.subcategoria || null,
      payload.unidad || null,
      payload.prioridad || null,
      payload.estatus || "Generado",
    ]
  );
  return r.rows[0];
}

async function obtenerFolioDB(folioCodigo) {
  const r = await pool.query(`SELECT * FROM folios WHERE folio_codigo=$1 LIMIT 1`, [folioCodigo]);
  return r.rows[0] || null;
}

async function actualizarFolioDB(folioCodigo, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;

  const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(", ");
  const values = keys.map((k) => fields[k]);

  await pool.query(`UPDATE folios SET ${sets} WHERE folio_codigo=$1`, [folioCodigo, ...values]);
}

async function logHistorial({ folio_codigo, estatus, comentario, actor_id }) {
  await pool.query(
    `
    INSERT INTO folio_historial (folio_codigo, estatus, comentario, actor_id)
    VALUES ($1,$2,$3,$4)
    `,
    [folio_codigo, estatus, comentario || null, actor_id || null]
  );
}

// =========================
// S3 upload (opcional)
// =========================
async function uploadPdfToS3({ folioCodigo, mediaBuffer, contentType }) {
  if (!s3) throw new Error("S3 no configurado");
  const key = `cotizaciones/${folioCodigo}/${Date.now()}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: mediaBuffer,
      ContentType: contentType || "application/pdf",
    })
  );
  return `s3://${S3_BUCKET}/${key}`;
}

// =========================
// Drafts (captura guiada)
// =========================
const drafts = {}; // drafts[tel] = { ... }

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

  // regla: ZP / CDMX deben indicar planta SIEMPRE
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
  const message = incomingMsg.toLowerCase();
  const fromRaw = req.body.From || "unknown";
  const fromTel = normalizeFrom(fromRaw);

  const messageSid = req.body.MessageSid || ""; // para idempotencia
  const numMedia = Number(req.body.NumMedia || 0);
  const mediaUrl0 = req.body.MediaUrl0;
  const mediaType0 = req.body.MediaContentType0;

  // Log mínimo para depurar (sin exponer secretos)
  console.log("📩 IN:", { fromTel, messageSid, numMedia, body: incomingMsg.slice(0, 200) });

  try {
    // 0) Idempotencia: si Twilio reintenta, NO duplicar inserts
    if (messageSid) {
      const ins = await pool.query(
        `INSERT INTO webhook_events (message_sid, from_tel) VALUES ($1,$2) ON CONFLICT (message_sid) DO NOTHING RETURNING message_sid`,
        [messageSid, fromTel]
      );
      if (ins.rowCount === 0) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("✅ Recibido (reintento detectado)."));
      }
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

    // A) ESTATUS
    if (message.startsWith("estatus")) {
      const folioCodigo = incomingMsg.replace(/estatus/i, "").trim();
      const folio = await obtenerFolioDB(folioCodigo);

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          folio
            ? `${urgentPrefix(folio.prioridad)}Folio: ${folio.folio_codigo}\n` +
                `Estatus: ${folio.estatus}\n` +
                `Importe: ${folio.importe}\n` +
                `Concepto: ${folio.concepto}\n` +
                `Beneficiario: ${folio.beneficiario || "-"}\n` +
                `Cotización: ${folio.cotizacion_url ? "✅ Adjunta" : "⚠️ No adjunta"}\n` +
                `Creado: ${folio.creado_en}`
            : `No encontré el folio ${folioCodigo}`
        )
      );
    }

    // B) APROBAR (solo ZP)
    if (message.startsWith("aprobar")) {
      if (actor.rol !== "ZP") {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Solo el Director ZP puede aprobar folios."));
      }

      const folioCodigo = incomingMsg.replace(/aprobar/i, "").trim();
      const folio = await obtenerFolioDB(folioCodigo);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${folioCodigo}`));
      }

      await actualizarFolioDB(folioCodigo, {
        estatus: "Aprobado",
        aprobado_por_id: actor.usuario_id,
        aprobado_en: new Date(),
      });

      await logHistorial({
        folio_codigo: folioCodigo,
        estatus: "Aprobado",
        comentario: "Aprobado por Director ZP.",
        actor_id: actor.usuario_id,
      });

      // Notificar GA + GG de la planta + CDMX
      const gaList = await getUsersByRoleAndPlanta("GA", folio.planta_id);
      const ggList = await getUsersByRoleAndPlanta("GG", folio.planta_id);
      const cdmxList = await getUsersByRole("CDMX");

      const warnCot = folio.cotizacion_url ? "" : "\n⚠️ Aún no tiene cotización adjunta.";
      const msgToSend =
        `${urgentPrefix(folio.prioridad)}Folio APROBADO: ${folio.folio_codigo}\n` +
        `Importe: ${folio.importe}\n` +
        `Concepto: ${folio.concepto}\n` +
        `Beneficiario: ${folio.beneficiario || "-"}\n` +
        `Categoría: ${folio.categoria || "-"} / ${folio.subcategoria || "-"}\n` +
        (folio.unidad ? `Unidad: ${folio.unidad}\n` : "") +
        `Estatus: Aprobado\n` +
        warnCot +
        `\n\nComandos:\n- estatus ${folio.folio_codigo}\n- adjuntar ${folio.folio_codigo} (mandando PDF)`;

      const recipients = [...gaList, ...ggList, ...cdmxList]
        .map((u) => u.telefono)
        .filter(Boolean);

      for (const tel of recipients) {
        await sendWhatsApp(`whatsapp:${tel}`, msgToSend);
      }

      res.set("Content-Type", "text/xml");
      return res.send(twiml(`✅ Folio ${folioCodigo} aprobado. Notifiqué a GA, GG y CDMX.`));
    }

    // C) ADJUNTAR (PDF)
    if (message.startsWith("adjuntar")) {
      const folioCodigo = incomingMsg.replace(/adjuntar/i, "").trim();
      if (!folioCodigo) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Usa: adjuntar F-YYYYMM-XXX y manda el PDF en el mismo mensaje."));
      }

      const folio = await obtenerFolioDB(folioCodigo);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${folioCodigo}`));
      }

      if (!numMedia || !mediaUrl0) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Manda el comando adjuntar + el PDF como archivo en el mismo mensaje."));
      }

      if (!s3) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("⚠️ S3 no está configurado. No puedo subir cotizaciones aún."));
      }

      const mediaResp = await axios.get(mediaUrl0, {
        responseType: "arraybuffer",
        auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN },
      });

      const buffer = Buffer.from(mediaResp.data);
      const ct = mediaType0 || "application/pdf";

      const s3url = await uploadPdfToS3({ folioCodigo, mediaBuffer: buffer, contentType: ct });
      await actualizarFolioDB(folioCodigo, { cotizacion_url: s3url });

      await logHistorial({
        folio_codigo: folioCodigo,
        estatus: folio.estatus || "Actualizado",
        comentario: `Cotización adjunta subida a S3: ${s3url}`,
        actor_id: actor.usuario_id,
      });

      res.set("Content-Type", "text/xml");
      return res.send(twiml(`✅ Cotización adjunta al folio ${folioCodigo}.`));
    }

    // D) CREAR FOLIO (guiado)
    if (message.includes("crear folio")) {
      drafts[fromTel] = drafts[fromTel] || {};
      drafts[fromTel].prioridad = message.includes("urgente") ? "Urgente no programado" : "Normal";

      const concepto = incomingMsg.replace(/crear folio/i, "").trim();
      if (concepto) drafts[fromTel].concepto = concepto;

      Object.assign(drafts[fromTel], parseKeyValueLines(incomingMsg));

      // Si actor trae planta (GA/GG), se toma por default
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

      const plantaId =
        actor.planta_id || (await getPlantaIdByClave(d.planta)); // ZP/CDMX usan la línea Planta:
      if (!plantaId) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("⚠️ Planta inválida o no registrada. Ej: Planta: ACAPULCO"));
      }

      const folioCodigo = await buildMonthlyFolioIdDB();
      const importe = moneyToNumber(d.importe);

      const guardado = await crearFolioDB({
        folio_codigo: folioCodigo,
        planta_id: plantaId,
        creado_por_id: actor.usuario_id,
        beneficiario: d.beneficiario,
        concepto: d.concepto,
        importe,
        categoria: d.categoria,
        subcategoria: d.subcategoria,
        unidad: d.unidad,
        prioridad: d.prioridad,
        estatus: "Generado",
      });

      await logHistorial({
        folio_codigo: folioCodigo,
        estatus: "Generado",
        comentario: `Creado desde WhatsApp. Prioridad: ${d.prioridad}.`,
        actor_id: actor.usuario_id,
      });

      delete drafts[fromTel];

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Folio ${guardado.folio_codigo} creado.\n` +
            `${urgentPrefix(d.prioridad)}\n` +
            `Para adjuntar cotización: "adjuntar ${guardado.folio_codigo}" + manda el PDF.\n` +
            `Para consultar: "estatus ${guardado.folio_codigo}"`
        )
      );
    }

    // E) Completar borrador
    if (drafts[fromTel]) {
      Object.assign(drafts[fromTel], parseKeyValueLines(incomingMsg));
      if (actor.planta_clave) drafts[fromTel].planta = actor.planta_clave;

      const miss = missingFields(drafts[fromTel], actor);
      res.set("Content-Type", "text/xml");
      if (miss.length) {
        return res.send(twiml(`Me falta: ${miss.join(", ")}.\nRespóndeme solo esos campos.`));
      }

      const d = drafts[fromTel];
      const plantaId = actor.planta_id || (await getPlantaIdByClave(d.planta));
      if (!plantaId) return res.send(twiml("⚠️ Planta inválida o no registrada. Ej: Planta: ACAPULCO"));

      const folioCodigo = await buildMonthlyFolioIdDB();
      const importe = moneyToNumber(d.importe);

      const guardado = await crearFolioDB({
        folio_codigo: folioCodigo,
        planta_id: plantaId,
        creado_por_id: actor.usuario_id,
        beneficiario: d.beneficiario,
        concepto: d.concepto,
        importe,
        categoria: d.categoria,
        subcategoria: d.subcategoria,
        unidad: d.unidad,
        prioridad: d.prioridad,
        estatus: "Generado",
      });

      await logHistorial({
        folio_codigo: folioCodigo,
        estatus: "Generado",
        comentario: `Creado desde borrador. Prioridad: ${d.prioridad}.`,
        actor_id: actor.usuario_id,
      });

      delete drafts[fromTel];
      return res.send(
        twiml(
          `✅ Folio ${guardado.folio_codigo} creado.\n` +
            `Para adjuntar cotización: "adjuntar ${guardado.folio_codigo}" + manda el PDF.`
        )
      );
    }

    // F) Fallback
    res.set("Content-Type", "text/xml");
    return res.send(
      twiml(
        "Comandos disponibles:\n" +
          "• crear folio <concepto> [urgente]\n" +
          "• estatus <F-YYYYMM-XXX>\n" +
          "• aprobar <F-YYYYMM-XXX> (solo ZP)\n" +
          "• adjuntar <F-YYYYMM-XXX> (enviar PDF)\n"
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
