/**
 * server.js - Bot WhatsApp (Twilio) para Folios
 *
 * Requiere:
 *   npm i express pg twilio axios dotenv
 *   (opcional S3) npm i aws-sdk
 *
 * ENV:
 *   PORT=10000
 *   DATABASE_URL=postgres://...
 *
 *   TWILIO_ACCOUNT_SID=AC...
 *   TWILIO_AUTH_TOKEN=...
 *
 *   (opcional S3)
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   AWS_REGION=us-east-1
 *   S3_BUCKET=...
 *
 * Notas de tu esquema:
 * - public.folios: folio_codigo NOT NULL, numero_folio UNIQUE【folios.txt L10, L35】
 * - public.folio_historial: numero_folio NOT NULL, estatus NOT NULL【folio_historial.txt L9-L10】
 * - public.folio_counters: yyyymm PK, last_seq int【folio_counters.txt】
 */

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");
const twilio = require("twilio");

let AWS, s3;
const hasS3 =
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_REGION &&
  process.env.S3_BUCKET;

if (hasS3) {
  AWS = require("aws-sdk");
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  s3 = new AWS.S3();
}

const app = express();
// Twilio manda application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Si usas Render + Postgres con SSL, normalmente:
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

const MessagingResponse = twilio.twiml.MessagingResponse;

// -------------------------
// Config de negocio (cat/subcat)
// -------------------------
const CATS = [
  { key: "GASTOS", label: "Gastos" },
  { key: "INVERSIONES", label: "Inversiones" },
  { key: "DYO", label: "Derechos y Obligaciones" },
  { key: "TALLER", label: "Taller" },
];

// Subcategorías según tu documento (sin “quinta” adicional en Inversiones)
// Taller NO tiene subcategoría; pide unidad AT-## o C-##【Llenado... L7-L13】
const SUBCATS = {
  GASTOS: [
    "Contractuales",
    "Equipo planta",
    "Estaciones",
    "Jurídicos",
    "Liquidaciones laborales",
    "Pasivos meses anteriores",
    "Rentas",
    "Trámites vehiculares",
    "Varios",
  ],
  INVERSIONES: ["Equipo para la planta", "Instalaciones a clientes", "Publicidad", "Tanques y cilindros"],
  DYO: [], // sin subcategoría
  TALLER: [], // sin subcategoría; se usa UNIDAD
};

// -------------------------
// Estado de conversación en memoria (por teléfono)
// (Si luego quieres, lo pasamos a DB)
// -------------------------
/**
 * dd = {
 *   estado: 'IDLE' | 'ESPERANDO_PLANTA' | 'ESPERANDO_BENEFICIARIO' | 'ESPERANDO_CONCEPTO' | 'ESPERANDO_IMPORTE'
 *           | 'ESPERANDO_CATEGORIA' | 'ESPERANDO_SUBCATEGORIA' | 'ESPERANDO_UNIDAD'
 *           | 'ESPERANDO_PDF_COTIZACION'
 *   draft: { planta, beneficiario, concepto, monto, categoria, subcategoria, unidad }
 *   currentFolio: { id, folio_codigo, numero_folio }
 * }
 */
const sessions = new Map();

function getSession(from) {
  if (!sessions.has(from)) {
    sessions.set(from, { estado: "IDLE", draft: null, currentFolio: null });
  }
  return sessions.get(from);
}

function resetSession(from) {
  sessions.set(from, { estado: "IDLE", draft: null, currentFolio: null });
}

// -------------------------
// Helpers texto / parsing
// -------------------------
function normalizeText(s) {
  return (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function parseMoney(text) {
  if (!text) return null;
  // acepta: 12000, 12,000, 12,000.50, $12,000
  const cleaned = text.replace(/\$/g, "").replace(/,/g, "").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Normaliza unidad:
 *   "AT 15" -> "AT-15"
 *   "AT-3"  -> "AT-03"
 *   "C 03"  -> "C-03"
 *   "c-7"   -> "C-07"
 */
function normalizeUnidad(input) {
  const t = normalizeText(input).replace(/\s+/g, "");
  const m = t.match(/^(AT|C)[-]?(\d{1,2})$/);
  if (!m) return null;
  const tipo = m[1];
  const num = m[2].padStart(2, "0");
  return `${tipo}-${num}`;
}

function isValidUnidad(u) {
  return !!normalizeUnidad(u);
}

function isCommand(text, cmd) {
  const t = normalizeText(text);
  return t === cmd || t.startsWith(cmd + " ");
}

function extractAfterCommand(text, cmd) {
  const t = (text || "").trim();
  const re = new RegExp("^" + cmd + "\\s+", "i");
  return t.replace(re, "").trim();
}

function renderMenu(title, items) {
  // WhatsApp por Twilio: texto simple con numeritos
  let msg = `${title}\n`;
  items.forEach((it, idx) => {
    msg += `\n${idx + 1}) ${it}`;
  });
  msg += `\n\nResponde con el número (ej: 1).`;
  return msg;
}

function safeFolioLine(f) {
  // Resumen de folio para WhatsApp
  const parts = [];
  parts.push(`Folio: ${f.numero_folio || f.folio_codigo || "(sin folio)"}`);
  if (f.planta) parts.push(`Planta: ${f.planta}`);
  if (f.categoria) parts.push(`Categoría: ${f.categoria}`);
  if (f.subcategoria) parts.push(`Subcategoría: ${f.subcategoria}`);
  if (f.unidad) parts.push(`Unidad: ${f.unidad}`);
  if (f.beneficiario) parts.push(`Beneficiario: ${f.beneficiario}`);
  if (f.concepto) parts.push(`Concepto: ${f.concepto}`);
  if (f.monto != null) parts.push(`Monto: $${Number(f.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
  if (f.estatus) parts.push(`Estatus: ${f.estatus}`);
  return parts.join("\n");
}

// -------------------------
// DB helpers
// -------------------------
async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await fn(client);
    await client.query("COMMIT");
    return res;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

function yyyymmNow() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}${mm}`;
}

async function nextFolioCodigo(client) {
  const yyyymm = yyyymmNow();

  // Bloquea contador del mes
  const row = await client.query(
    `SELECT yyyymm, last_seq
       FROM public.folio_counters
      WHERE yyyymm = $1
      FOR UPDATE`,
    [yyyymm]
  );

  let nextSeq;
  if (row.rowCount === 0) {
    nextSeq = 1;
    await client.query(`INSERT INTO public.folio_counters (yyyymm, last_seq) VALUES ($1, $2)`, [yyyymm, nextSeq]);
  } else {
    nextSeq = Number(row.rows[0].last_seq) + 1;
    await client.query(`UPDATE public.folio_counters SET last_seq = $2 WHERE yyyymm = $1`, [yyyymm, nextSeq]);
  }

  const seq3 = String(nextSeq).padStart(3, "0");
  const folio = `F-${yyyymm}-${seq3}`;

  // En tu esquema existen los dos campos (folio_codigo y numero_folio) con UNIQUE,
  // aquí los igualamos para simplificar y evitar desfaces.
  return { folio_codigo: folio, numero_folio: folio, yyyymm, nextSeq };
}

async function insertFolioAndHistorial({
  actorTelefono,
  actorRol,
  // actorId opcional (puede ser null)
  actorId = null,
  // Datos del folio
  planta = null,
  plantaId = null,
  creadoPor = null,
  creadoPorId = null,
  beneficiario,
  concepto,
  monto,
  categoria,
  subcategoria,
  unidad,
}) {
  return await withTx(async (client) => {
    const { folio_codigo, numero_folio } = await nextFolioCodigo(client);

    // Insert folio
    const ins = await client.query(
      `INSERT INTO public.folios
        (folio_codigo, numero_folio, planta_id, planta, creado_por_id, creado_por,
         beneficiario, concepto, monto, categoria, subcategoria, unidad, estatus)
       VALUES
        ($1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11, $12, 'Generado')
       RETURNING id, folio_codigo, numero_folio, planta, creado_por, estatus, cotizacion_url, cotizacion_s3key`,
      [
        folio_codigo,
        numero_folio,
        plantaId,
        planta,
        creadoPorId,
        creadoPor,
        beneficiario || null,
        concepto || null,
        monto || null,
        categoria || null,
        subcategoria || null,
        unidad || null,
      ]
    );

    const folio = ins.rows[0];

    // Insert historial (registro del evento)
    await client.query(
      `INSERT INTO public.folio_historial
        (numero_folio, estatus, comentario, actor_telefono, actor_rol, folio_codigo, actor_id, folio_id)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        folio.numero_folio,
        folio.estatus || "Generado",
        "Registro inicial",
        actorTelefono || null,
        actorRol || null,
        folio.folio_codigo,
        actorId,
        folio.id,
      ]
    );

    return folio;
  });
}

async function insertComentario({ folioId, numeroFolio, folioCodigo, actorTelefono, actorRol, usuarioId = null, comentario }) {
  await pool.query(
    `INSERT INTO public.comentarios
      (folio_id, usuario_id, comentario, folio_codigo, numero_folio, actor_telefono, actor_rol)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7)`,
    [folioId, usuarioId, comentario, folioCodigo, numeroFolio, actorTelefono, actorRol]
  );
}

async function findFolioByCodigoOrNumero(code) {
  const q = await pool.query(
    `SELECT id, folio_codigo, numero_folio, planta, creado_por, beneficiario, concepto, monto, categoria, subcategoria, unidad,
            estatus, cotizacion_url, cotizacion_s3key, fecha_creacion
       FROM public.folios
      WHERE folio_codigo = $1 OR numero_folio = $1
      LIMIT 1`,
    [code]
  );
  return q.rowCount ? q.rows[0] : null;
}

async function attachCotizacionToFolio({ folioId, cotizacionUrl, cotizacionS3Key = null }) {
  const q = await pool.query(
    `UPDATE public.folios
        SET cotizacion_url = $2,
            cotizacion_s3key = COALESCE($3, cotizacion_s3key)
      WHERE id = $1
      RETURNING id, folio_codigo, numero_folio, estatus, cotizacion_url, cotizacion_s3key`,
    [folioId, cotizacionUrl, cotizacionS3Key]
  );
  return q.rowCount ? q.rows[0] : null;
}

// -------------------------
// Twilio Media -> descargar (requiere auth)
// -------------------------
async function downloadTwilioMedia(mediaUrl) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  const resp = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    auth: { username: sid, password: token },
  });

  return Buffer.from(resp.data);
}

async function uploadToS3({ buffer, contentType, key }) {
  if (!hasS3) return null;
  await s3
    .putObject({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    })
    .promise();

  return key;
}

// -------------------------
// Intenciones y comandos
// -------------------------
function helpText() {
  return (
    "Comandos:\n\n" +
    "1) Crear folio\n" +
    "   - Escribe: Crear folio\n\n" +
    "2) Ver folio\n" +
    "   - Escribe: Ver F-YYYYMM-###\n\n" +
    "3) Adjuntar cotización PDF\n" +
    "   - Escribe: Adjuntar F-YYYYMM-###\n" +
    "   - Luego manda el PDF en el chat\n\n" +
    "4) Comentar en folio\n" +
    "   - Escribe: Comentar F-YYYYMM-### tu comentario\n\n" +
    "Tip: en Taller la unidad debe ser AT-## o C-## (ej: AT-03, C-03)."
  );
}

async function handleMessage({ from, body, numMedia, mediaUrl0, mediaContentType0 }) {
  const dd = getSession(from);

  // Datos actor (por ahora, básico; si quieres lo amarramos a usuarios.id después)
  const actorTelefono = from;
  const actorRol = "Usuario"; // luego lo conectamos a tu tabla usuarios
  const creadoPor = "WhatsApp"; // o el nombre real

  const textRaw = body || "";
  const text = normalizeText(textRaw);

  // 0) Si estamos esperando PDF
  if (dd.estado === "ESPERANDO_PDF_COTIZACION") {
    if (!dd.currentFolio?.id) {
      dd.estado = "IDLE";
      return "No tengo un folio activo para adjuntar. Usa: Adjuntar F-YYYYMM-###";
    }

    if (!numMedia || Number(numMedia) < 1) {
      return "Aún no recibo el PDF. Por favor manda el archivo PDF aquí en el chat.";
    }

    const ct = (mediaContentType0 || "").toLowerCase();
    if (!ct.includes("pdf")) {
      return "Recibí un archivo, pero no parece PDF. Por favor manda la cotización en PDF.";
    }

    // Guardamos al menos la URL de Twilio (para poder recuperarla luego)
    // Opcional: descargar y subir a S3 si está configurado.
    let s3key = null;
    try {
      if (hasS3) {
        const buf = await downloadTwilioMedia(mediaUrl0);
        const key = `cotizaciones/${dd.currentFolio.numero_folio || dd.currentFolio.folio_codigo}.pdf`;
        s3key = await uploadToS3({ buffer: buf, contentType: ct, key });
      }

      const updated = await attachCotizacionToFolio({
        folioId: dd.currentFolio.id,
        cotizacionUrl: mediaUrl0,
        cotizacionS3Key: s3key,
      });

      // Historial + comentario
      await insertComentario({
        folioId: dd.currentFolio.id,
        numeroFolio: dd.currentFolio.numero_folio,
        folioCodigo: dd.currentFolio.folio_codigo,
        actorTelefono,
        actorRol,
        comentario: `Cotización PDF adjunta (${hasS3 && s3key ? "guardada en S3" : "guardada como URL Twilio"})`,
      });

      dd.estado = "IDLE";
      return (
        `Listo. Cotización adjunta al folio ${updated.numero_folio}.\n\n` +
        (updated.cotizacion_s3key || updated.cotizacion_url ? "✅ Ya tiene PDF." : "⚠️ Aún sin PDF (raro).")
      );
    } catch (e) {
      dd.estado = "IDLE";
      console.error("Error adjuntando PDF:", e?.message || e);
      return "Error adjuntando el PDF. Intenta de nuevo en 1 minuto.";
    }
  }

  // 1) Help
  if (text === "AYUDA" || text === "HELP" || text === "MENU") {
    return helpText();
  }

  // 2) Ver folio
  if (isCommand(textRaw, "Ver")) {
    const code = extractAfterCommand(textRaw, "Ver");
    if (!code) return "Formato: Ver F-YYYYMM-###";
    const folio = await findFolioByCodigoOrNumero(code.trim());
    if (!folio) return `No encontré el folio: ${code}`;

    // Mensaje “aún no tiene adjunto PDF”
    const faltaPdf = !folio.cotizacion_url && !folio.cotizacion_s3key;

    return (
      safeFolioLine(folio) +
      (faltaPdf ? "\n\n⚠️ Aún no tiene cotización PDF adjunta." : "\n\n✅ Ya tiene cotización PDF adjunta.")
    );
  }

  // 3) Adjuntar PDF
  if (isCommand(textRaw, "Adjuntar")) {
    const code = extractAfterCommand(textRaw, "Adjuntar");
    if (!code) return "Formato: Adjuntar F-YYYYMM-###";
    const folio = await findFolioByCodigoOrNumero(code.trim());
    if (!folio) return `No encontré el folio: ${code}`;

    dd.currentFolio = { id: folio.id, folio_codigo: folio.folio_codigo, numero_folio: folio.numero_folio };
    dd.estado = "ESPERANDO_PDF_COTIZACION";
    return `Ok. Manda aquí el PDF de la cotización para el folio ${folio.numero_folio}.`;
  }

  // 4) Comentar
  if (isCommand(textRaw, "Comentar")) {
    const rest = extractAfterCommand(textRaw, "Comentar");
    const m = rest.match(/^(F-\d{6}-\d{3})\s+(.+)$/i);
    if (!m) return "Formato: Comentar F-YYYYMM-### tu comentario";
    const code = m[1].toUpperCase();
    const comentario = m[2].trim();

    const folio = await findFolioByCodigoOrNumero(code);
    if (!folio) return `No encontré el folio: ${code}`;

    await insertComentario({
      folioId: folio.id,
      numeroFolio: folio.numero_folio,
      folioCodigo: folio.folio_codigo,
      actorTelefono,
      actorRol,
      comentario,
    });

    return `Comentario guardado en ${folio.numero_folio}.`;
  }

  // 5) Crear folio
  if (text === "CREAR FOLIO" || text.startsWith("CREAR FOLIO")) {
    dd.draft = {
      planta: null,
      plantaId: null,
      beneficiario: null,
      concepto: null,
      monto: null,
      categoria: null,
      subcategoria: null,
      unidad: null,
    };
    dd.currentFolio = null;

    // (si luego quieres, aquí podemos listar plantas desde DB)
    dd.estado = "ESPERANDO_PLANTA";
    return "Indica la planta (ej: ACAPULCO, QUERÉTARO, PUEBLA, etc.).";
  }

  // -------------------------
  // Flujo guiado (draft)
  // -------------------------
  if (dd.estado === "ESPERANDO_PLANTA") {
    dd.draft.planta = textRaw.trim();
    dd.estado = "ESPERANDO_BENEFICIARIO";
    return "Indica Beneficiario (a quién se le depositará el cheque).";
  }

  if (dd.estado === "ESPERANDO_BENEFICIARIO") {
    dd.draft.beneficiario = textRaw.trim();
    dd.estado = "ESPERANDO_CONCEPTO";
    return "Indica Concepto (razón del pago).";
  }

  if (dd.estado === "ESPERANDO_CONCEPTO") {
    dd.draft.concepto = textRaw.trim();
    dd.estado = "ESPERANDO_IMPORTE";
    return "Indica Monto en MXN (ej: 12500 o 12,500).";
  }

  if (dd.estado === "ESPERANDO_IMPORTE") {
    const m = parseMoney(textRaw);
    if (m == null) return "Monto inválido. Ejemplos: 12500  |  12,500  |  12500.50";
    dd.draft.monto = m;
    dd.estado = "ESPERANDO_CATEGORIA";
    return renderMenu("Elige Categoría:", CATS.map((c) => c.label));
  }

  if (dd.estado === "ESPERANDO_CATEGORIA") {
    const idx = Number(textRaw.trim());
    if (!Number.isInteger(idx) || idx < 1 || idx > CATS.length) {
      return "Responde con un número de la lista (ej: 1).";
    }
    const cat = CATS[idx - 1];
    dd.draft.categoria = cat.label;
    dd.draft.categoria_clave = cat.key;

    // Taller pide unidad
    if (cat.key === "TALLER") {
      dd.estado = "ESPERANDO_UNIDAD";
      return "Taller seleccionado. Indica Unidad (ej: AT-03 o C-03).";
    }

    const subs = SUBCATS[cat.key] || [];
    if (!subs.length) {
      dd.draft.subcategoria = null;
      dd.estado = "CONFIRMAR_Y_GUARDAR";
      // Guardar directo
      const folio = await insertFolioAndHistorial({
        actorTelefono,
        actorRol,
        creadoPor,
        planta: dd.draft.planta,
        beneficiario: dd.draft.beneficiario,
        concepto: dd.draft.concepto,
        monto: dd.draft.monto,
        categoria: dd.draft.categoria,
        subcategoria: null,
        unidad: null,
      });

      dd.currentFolio = { id: folio.id, folio_codigo: folio.folio_codigo, numero_folio: folio.numero_folio };
      dd.estado = "IDLE";

      const faltaPdf = !folio.cotizacion_url && !folio.cotizacion_s3key;
      return (
        `✅ Folio creado.\n${safeFolioLine(folio)}\n\n` +
        (faltaPdf ? "⚠️ Aún no tiene cotización PDF adjunta.\nUsa: Adjuntar " + folio.numero_folio : "✅ Ya tiene PDF.")
      );
    }

    dd.estado = "ESPERANDO_SUBCATEGORIA";
    return renderMenu(`Elige Subcategoría (${cat.label}):`, subs);
  }

  if (dd.estado === "ESPERANDO_SUBCATEGORIA") {
    const subs = SUBCATS[dd.draft.categoria_clave] || [];
    const idx = Number(textRaw.trim());
    if (!Number.isInteger(idx) || idx < 1 || idx > subs.length) {
      return "Responde con un número válido de la lista.";
    }
    dd.draft.subcategoria = subs[idx - 1];

    // Guardar
    const folio = await insertFolioAndHistorial({
      actorTelefono,
      actorRol,
      creadoPor,
      planta: dd.draft.planta,
      beneficiario: dd.draft.beneficiario,
      concepto: dd.draft.concepto,
      monto: dd.draft.monto,
      categoria: dd.draft.categoria,
      subcategoria: dd.draft.subcategoria,
      unidad: null,
    });

    dd.currentFolio = { id: folio.id, folio_codigo: folio.folio_codigo, numero_folio: folio.numero_folio };
    dd.estado = "IDLE";

    const faltaPdf = !folio.cotizacion_url && !folio.cotizacion_s3key;
    return (
      `✅ Folio creado.\n${safeFolioLine(folio)}\n\n` +
      (faltaPdf ? "⚠️ Aún no tiene cotización PDF adjunta.\nUsa: Adjuntar " + folio.numero_folio : "✅ Ya tiene PDF.")
    );
  }

  if (dd.estado === "ESPERANDO_UNIDAD") {
    const u = normalizeUnidad(textRaw);
    if (!u) {
      return "Unidad inválida. Formato: AT-03 o C-03 (también acepto AT 3, AT-3, C 03).";
    }
    dd.draft.unidad = u;

    // Taller: subcategoria debe ser null
    dd.draft.subcategoria = null;

    // Guardar
    const folio = await insertFolioAndHistorial({
      actorTelefono,
      actorRol,
      creadoPor,
      planta: dd.draft.planta,
      beneficiario: dd.draft.beneficiario,
      concepto: dd.draft.concepto,
      monto: dd.draft.monto,
      categoria: dd.draft.categoria,
      subcategoria: null,
      unidad: dd.draft.unidad,
    });

    dd.currentFolio = { id: folio.id, folio_codigo: folio.folio_codigo, numero_folio: folio.numero_folio };
    dd.estado = "IDLE";

    const faltaPdf = !folio.cotizacion_url && !folio.cotizacion_s3key;
    return (
      `✅ Folio creado.\n${safeFolioLine(folio)}\n\n` +
      (faltaPdf ? "⚠️ Aún no tiene cotización PDF adjunta.\nUsa: Adjuntar " + folio.numero_folio : "✅ Ya tiene PDF.")
    );
  }

  // Si no coincide con nada:
  return "No entendí. Escribe: Ayuda\n\nO bien: Crear folio";
}

// -------------------------
// Webhook Twilio
// -------------------------
app.post("/whatsapp", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From || ""; // "whatsapp:+521..."
    const body = req.body.Body || "";
    const numMedia = req.body.NumMedia || "0";
    const mediaUrl0 = req.body.MediaUrl0 || null;
    const mediaContentType0 = req.body.MediaContentType0 || null;

    const reply = await handleMessage({ from, body, numMedia, mediaUrl0, mediaContentType0 });
    twiml.message(reply);
  } catch (e) {
    console.error("Webhook error:", e?.message || e);
    twiml.message("Error procesando solicitud. Intenta de nuevo en 1 minuto.");
  }

  res.type("text/xml").send(twiml.toString());
});

// Healthcheck
app.get("/", (_, res) => res.status(200).send("OK"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`S3: ${hasS3 ? "ON" : "OFF (cotizaciones se guardan como URL Twilio)"}`);
});
