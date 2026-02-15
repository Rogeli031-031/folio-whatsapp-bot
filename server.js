// server.js
// WhatsApp (Twilio) + PostgreSQL (Render) + S3 (AWS)
// Comandos:
// - crear folio <concepto> [urgente]
// - estatus F-YYYYMM-XXX
// - aprobar F-YYYYMM-XXX        (solo ZP)
// - adjuntar F-YYYYMM-XXX       (manda PDF en el mismo mensaje)
//
// Regla: No existen folios "corporativo". TODOS pertenecen a una planta.
// Si ZP o CDMX crean folio: deben indicar Planta: ACAPULCO / PUEBLA / etc.

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
  // Twilio WhatsApp -> "whatsapp:+521..."
  let tel = String(from || "").trim();
  tel = tel.replace(/^whatsapp:/i, "").trim();
  // normaliza MX: +521XXXXXXXXXX -> +52XXXXXXXXXX
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
// 1) Schema (solo agrega lo que falte, no rompe lo existente)
// =========================
async function ensureSchema() {
  // roles: asegurar nivel
  await pool.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS nivel INT NOT NULL DEFAULT 0;`);

  // usuarios: asegurar email
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(160);`);

  // folio_counters (para consecutivo mensual)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_counters (
      yyyymm VARCHAR(6) PRIMARY KEY,
      last_seq INT NOT NULL
    );
  `);

  // folios: asegurar campos que usa el bot (alineados a tu BD)
  // TU BD usa: folio_codigo, planta_id, creado_por_id, concepto, importe, categoria, subcategoria, unidad, prioridad, estatus
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS cotizacion_url TEXT;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS aprobado_por_id INT;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS aprobado_en TIMESTAMP;`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  // folio_historial (TU BD debe usar folio_codigo)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_historial (
      id SERIAL PRIMARY KEY,
      folio_codigo VARCHAR(50) NOT NULL,
      estatus VARCHAR(50) NOT NULL,
      comentario TEXT,
      actor_telefono VARCHAR(30),
      actor_rol VARCHAR(50),
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // comentarios (opcional)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id SERIAL PRIMARY KEY,
      folio_codigo VARCHAR(50) NOT NULL,
      comentario TEXT NOT NULL,
      actor_telefono VARCHAR(30),
      actor_rol VARCHAR(50),
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // roles base + niveles (si faltan)
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
    JOIN plantas p ON p.id=u.planta_id
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
// 3) Consecutivo mensual (DB)
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
// 4) Folios DB (ALINEADO A TU BD)
// =========================
async function crearFolioDB(payload) {
  // TU BD: folio_codigo, planta_id, creado_por_id, beneficiario, concepto, importe, categoria, subcategoria, unidad, prioridad, estatus
  const sql = `
    INSERT INTO folios
      (folio_codigo, planta_id, creado_por_id, beneficiario, concepto, importe, categoria, subcategoria, unidad, prioridad, estatus)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *;
  `;
  const r = await pool.query(sql, [
    payload.folio_codigo,
    payload.planta_id,
    payload.creado_por_id,
    payload.beneficiario || null,
    payload.concepto || null,
    payload.importe || 0,
    payload.categoria || null,
    payload.subcategoria || null,
    payload.unidad || null,
    payload.prioridad || null,
    payload.estatus || "Generado",
  ]);
  return r.rows[0];
}

async function obtenerFolioDB(folio_codigo) {
  const r = await pool.query(
    `
    SELECT
      f.*,
      p.clave AS planta_clave,
      p.nombre AS planta_nombre
    FROM folios f
    JOIN plantas p ON p.id = f.planta_id
    WHERE f.folio_codigo=$1
    ORDER BY f.id DESC
    LIMIT 1
    `,
    [folio_codigo]
  );
  return r.rows[0] || null;
}

async function actualizarFolioDB(folio_codigo, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;

  const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(", ");
  const values = keys.map((k) => fields[k]);

  await pool.query(`UPDATE folios SET ${sets} WHERE folio_codigo=$1`, [folio_codigo, ...values]);
}

async function logHistorial({ folio_codigo, estatus, comentario, actor }) {
  await pool.query(
    `
    INSERT INTO folio_historial (folio_codigo, estatus, comentario, actor_telefono, actor_rol)
    VALUES ($1,$2,$3,$4,$5)
    `,
    [folio_codigo, estatus, comentario || null, actor?.telefono || null, actor?.rol || null]
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
      ContentType: contentType || "application/pdf",
    })
  );

  // Si el bucket es privado, luego hacemos presigned URLs.
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

  // ZP / CDMX: Planta obligatoria siempre
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

async function getPlantaByClave(plantaClave) {
  const r = await pool.query(`SELECT id, clave, nombre FROM plantas WHERE clave=$1 LIMIT 1`, [
    String(plantaClave || "").toUpperCase(),
  ]);
  return r.rows[0] || null;
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
      const folioCode = incomingMsg.replace(/estatus/i, "").trim();
      const folio = await obtenerFolioDB(folioCode);

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          folio
            ? `${urgentPrefix(folio.prioridad)}Folio: ${folio.folio_codigo}\n` +
                `Planta: ${folio.planta_clave}\n` +
                `Estatus: ${folio.estatus}\n` +
                `Importe: ${folio.importe}\n` +
                `Concepto: ${folio.concepto}\n` +
                `Beneficiario: ${folio.beneficiario || "-"}\n` +
                `Categoría: ${folio.categoria || "-"} / ${folio.subcategoria || "-"}\n` +
                (folio.unidad ? `Unidad: ${folio.unidad}\n` : "") +
                `Cotización: ${folio.cotizacion_url ? "✅ Adjunta" : "⚠️ No adjunta"}\n`
            : `No encontré el folio ${folioCode}`
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

      const folioCode = incomingMsg.replace(/aprobar/i, "").trim();
      const folio = await obtenerFolioDB(folioCode);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${folioCode}`));
      }

      await actualizarFolioDB(folioCode, {
        estatus: "Aprobado",
        aprobado_por_id: actor.usuario_id,
        aprobado_en: new Date(),
      });

      await logHistorial({
        folio_codigo: folioCode,
        estatus: "Aprobado",
        comentario: "Aprobado por Director ZP.",
        actor,
      });

      // Notificar GA + GG de la planta + CDMX
      const gaList = await getUsersByRoleAndPlanta("GA", folio.planta_clave);
      const ggList = await getUsersByRoleAndPlanta("GG", folio.planta_clave);
      const cdmxList = await getUsersByRole("CDMX");

      const warnCot = folio.cotizacion_url ? "" : "\n⚠️ Aún no tiene la cotización adjunta.";

      const msgToSend =
        `${urgentPrefix(folio.prioridad)}Folio APROBADO: ${folio.folio_codigo}\n` +
        `Planta: ${folio.planta_clave}\n` +
        `Importe: ${folio.importe}\n` +
        `Concepto: ${folio.concepto}\n` +
        `Beneficiario: ${folio.beneficiario || "-"}\n` +
        `Categoría: ${folio.categoria || "-"} / ${folio.subcategoria || "-"}\n` +
        (folio.unidad ? `Unidad: ${folio.unidad}\n` : "") +
        `Estatus: Aprobado` +
        warnCot +
        `\n\nComandos:\n- estatus ${folio.folio_codigo}\n- adjuntar ${folio.folio_codigo} (mandando PDF)`;

      const recipients = [...gaList, ...ggList, ...cdmxList]
        .map((u) => u.telefono)
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
    // C) ADJUNTAR (mandar PDF en el mismo mensaje)
    // =========================
    if (message.startsWith("adjuntar")) {
      const folioCode = incomingMsg.replace(/adjuntar/i, "").trim();

      if (!folioCode) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Usa: adjuntar F-YYYYMM-XXX y manda el PDF en el mismo mensaje."));
      }

      const folio = await obtenerFolioDB(folioCode);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${folioCode}`));
      }

      if (!numMedia || !mediaUrl0) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Manda el comando adjuntar + el PDF como archivo en el mismo mensaje."));
      }

      // Descargar el PDF desde Twilio (requiere Basic Auth)
      const mediaResp = await axios.get(mediaUrl0, {
        responseType: "arraybuffer",
        auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN },
      });

      const buffer = Buffer.from(mediaResp.data);
      const ct = mediaType0 || "application/pdf";

      const s3url = await uploadPdfToS3({
        folio_codigo: folioCode,
        mediaBuffer: buffer,
        contentType: ct,
      });

      await actualizarFolioDB(folioCode, { cotizacion_url: s3url });

      await logHistorial({
        folio_codigo: folioCode,
        estatus: folio.estatus || "Actualizado",
        comentario: `Cotización adjunta subida a S3: ${s3url}`,
        actor,
      });

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(`✅ Cotización adjunta al folio ${folioCode}.\nGuardé en S3.\nEstatus: ${folio.estatus}`)
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

      // Si actor trae planta (GA/GG) la tomamos; si ZP/CDMX no, debe escribirla
      if (actor.planta_clave) drafts[fromTel].planta = actor.planta_clave;

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

      const d = drafts[fromTel];

      if (!d.planta) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Falta Planta. Escribe por ejemplo: Planta: ACAPULCO"));
      }

      const plantaRow = await getPlantaByClave(d.planta);
      if (!plantaRow) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`La planta "${d.planta}" no existe en el catálogo. Revísala.`));
      }

      const folioId = await buildMonthlyFolioIdDB();
      const importe = moneyToNumber(d.importe);

      const guardado = await crearFolioDB({
        folio_codigo: folioId,
        planta_id: plantaRow.id,
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
        folio_codigo: folioId,
        estatus: "Generado",
        comentario: `Creado desde WhatsApp. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor,
      });

      delete drafts[fromTel];

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Folio ${guardado.folio_codigo} creado y guardado.\n\n` +
            `${urgentPrefix(d.prioridad)}Planta: ${plantaRow.clave}\n` +
            `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
            `Concepto: ${d.concepto}\n` +
            `Beneficiario: ${d.beneficiario}\n` +
            `Importe: ${importe}\n` +
            `Categoría: ${d.categoria}\n` +
            `Subcategoría: ${d.subcategoria}\n` +
            (d.unidad ? `Unidad: ${d.unidad}\n` : "") +
            `Prioridad: ${d.prioridad}\n\n` +
            `Para adjuntar cotización: "adjuntar ${guardado.folio_codigo}" + manda el PDF.\n` +
            `Para consultar: "estatus ${guardado.folio_codigo}"`
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
          twiml(`Me falta: ${miss.join(", ")}.\nRespóndeme solo esos campos (ej: "Importe: 25000").`)
        );
      }

      const d = drafts[fromTel];

      if (!d.planta) {
        return res.send(twiml("Falta Planta. Escribe por ejemplo: Planta: ACAPULCO"));
      }

      const plantaRow = await getPlantaByClave(d.planta);
      if (!plantaRow) return res.send(twiml(`La planta "${d.planta}" no existe en el catálogo.`));

      const folioId = await buildMonthlyFolioIdDB();
      const importe = moneyToNumber(d.importe);

      const guardado = await crearFolioDB({
        folio_codigo: folioId,
        planta_id: plantaRow.id,
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
        folio_codigo: folioId,
        estatus: "Generado",
        comentario: `Creado desde borrador. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor,
      });

      delete drafts[fromTel];

      return res.send(
        twiml(
          `✅ Folio ${guardado.folio_codigo} creado.\n` +
            `${urgentPrefix(d.prioridad)}Planta: ${plantaRow.clave}\n` +
            `Para adjuntar cotización: "adjuntar ${guardado.folio_codigo}" + manda el PDF.`
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
