/**
 * folio-whatsapp-bot - server.js
 * Stack: Express + Twilio WhatsApp Webhook + PostgreSQL (pg) + AWS S3 (aws-sdk v3)
 *
 * ENV requeridas:
 * - DATABASE_URL
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_WHATSAPP_NUMBER (opcional, solo para enviar salientes)
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION
 * - S3_BUCKET
 *
 * Render:
 * - Start command: node server.js
 * - Port: usa process.env.PORT
 */

"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const twilio = require("twilio");
const axios = require("axios");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
app.use(bodyParser.urlencoded({ extended: false })); // Twilio manda form-urlencoded
app.use(bodyParser.json());

/* ----------------------------- Config ----------------------------- */

const PORT = process.env.PORT || 10000;

const REQUIRED_ENVS = [
  "DATABASE_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
];

for (const k of REQUIRED_ENVS) {
  if (!process.env[k]) {
    console.warn(`⚠️ Falta ENV ${k}. El bot puede fallar.`);
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres suele requerir SSL. Si tu Render DB ya lo trae, esto ayuda.
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

const s3Enabled =
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.AWS_REGION &&
  !!process.env.S3_BUCKET;

const s3 = s3Enabled
  ? new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

/* ----------------------------- Catálogo ----------------------------- */
/**
 * Según tu definición:
 * Categorías: Gastos, Inversiones, Derechos y Obligaciones, Taller
 * - Taller: sin subcategoría, requiere unidad: AT/C con número 1..1000
 * - Gastos: 9 subcategorías
 * - Inversiones: 4 subcategorías (sin quinta)
 * - DyO: sin subcategoría
 */
const CATEGORIAS = [
  { clave: "GASTOS", nombre: "Gastos" },
  { clave: "INVERSIONES", nombre: "Inversiones" },
  { clave: "DYO", nombre: "Derechos y Obligaciones" },
  { clave: "TALLER", nombre: "Taller" },
];

const SUBCATEGORIAS = {
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
  INVERSIONES: [
    "Equipo para la planta",
    "Instalaciones a clientes",
    "Publicidad",
    "Tanques y cilindros",
  ],
  DYO: [],
  TALLER: [],
};

const PRIORIDADES = ["Alta", "Media", "Baja"];

/* ----------------------------- Sesiones en memoria ----------------------------- */
/**
 * OJO: en Render, si reinicias el servicio, se pierde RAM. Para producción real
 * lo ideal es guardar estado en DB, pero por ahora sirve para el flujo.
 */
const sessions = new Map();

function getSession(from) {
  if (!sessions.has(from)) {
    sessions.set(from, {
      estado: "IDLE",
      dd: {},
      lastFolioNumero: null,
      lastFolioId: null,
    });
  }
  return sessions.get(from);
}

function resetSession(sess) {
  sess.estado = "IDLE";
  sess.dd = {};
}

/* ----------------------------- Helpers TwiML ----------------------------- */

function twimlMessage(text) {
  const r = new twilio.twiml.MessagingResponse();
  r.message(text);
  return r.toString();
}

function renderMenu(titulo, opciones) {
  const lines = [];
  lines.push(titulo);
  for (let i = 0; i < opciones.length; i++) {
    lines.push(`${i + 1}) ${opciones[i]}`);
  }
  lines.push("");
  lines.push("Responde con el número.");
  return lines.join("\n");
}

function pickByNumber(text, arr) {
  const n = parseInt(String(text).trim(), 10);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > arr.length) return null;
  return arr[n - 1];
}

/* ----------------------------- Normalización unidad Taller ----------------------------- */
/**
 * Acepta:
 * - AT-03, AT 03, AT03, at-3, AT-15, AT 15, AT15
 * - C-03, C03, c 10, etc.
 * Regla: prefijo AT o C, número 1..1000.
 * Normaliza a: AT-<n> o C-<n>
 */
function normalizeUnidad(input) {
  const raw = String(input || "").trim().toUpperCase();
  // quita espacios
  const compact = raw.replace(/\s+/g, "");
  // permite AT-15, AT15, C-15, C15
  const m = compact.match(/^(AT|C)\-?(\d{1,4})$/);
  if (!m) return null;

  const pref = m[1];
  const num = parseInt(m[2], 10);
  if (!Number.isFinite(num) || num < 1 || num > 1000) return null;

  return `${pref}-${num}`;
}

/* ----------------------------- DB helpers ----------------------------- */

async function nextFolioNumber(client) {
  // Formato: F-YYYYMM-### (3 dígitos)
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const yyyymm = `${yyyy}${mm}`;

  // Asegura contador
  await client.query(
    `INSERT INTO public.folio_counters(yyyymm, last_seq)
     VALUES ($1, 0)
     ON CONFLICT (yyyymm) DO NOTHING`,
    [yyyymm]
  );

  // Sube contador y regresa
  const r = await client.query(
    `UPDATE public.folio_counters
     SET last_seq = last_seq + 1
     WHERE yyyymm = $1
     RETURNING last_seq`,
    [yyyymm]
  );

  const seq = r.rows[0].last_seq;
  const seq3 = String(seq).padStart(3, "0");
  return `F-${yyyymm}-${seq3}`;
}

async function insertFolio(client, dd) {
  // folio_codigo NOT NULL => lo igualamos al numero_folio
  const numero_folio = await nextFolioNumber(client);
  const folio_codigo = numero_folio;

  const insert = await client.query(
    `INSERT INTO public.folios (
      folio_codigo,
      numero_folio,
      beneficiario,
      concepto,
      importe,
      categoria,
      subcategoria,
      unidad,
      prioridad,
      estatus,
      creado_en
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,'Generado', NOW()
    )
    RETURNING id, numero_folio, folio_codigo`,
    [
      folio_codigo,
      numero_folio,
      dd.beneficiario || null,
      dd.concepto || null,
      dd.importe || null,
      dd.categoria_nombre || null,
      dd.subcategoria_nombre || null,
      dd.unidad || null,
      dd.prioridad || null,
    ]
  );

  const row = insert.rows[0];

  // historial (si existe la tabla)
  try {
    await client.query(
      `INSERT INTO public.folio_historial(
        numero_folio, estatus, comentario, actor_telefono, actor_rol, creado_en, folio_codigo, folio_id
      ) VALUES ($1,'Generado',$2,$3,$4,NOW(),$5,$6)`,
      [
        row.numero_folio,
        "Folio creado por WhatsApp",
        dd.actor_telefono || null,
        dd.actor_rol || null,
        row.folio_codigo,
        row.id,
      ]
    );
  } catch (e) {
    // no tronamos si historial no está amarrado todavía
    console.warn("Historial no insertado:", e.message);
  }

  return row;
}

async function getFolioByNumero(client, numero) {
  const r = await client.query(
    `SELECT id, numero_folio, folio_codigo, cotizacion_url, cotizacion_s3key
     FROM public.folios
     WHERE numero_folio = $1`,
    [numero]
  );
  return r.rows[0] || null;
}

async function attachCotizacionToFolio(client, folioId, s3Key, publicUrl, actorTelefono) {
  const r = await client.query(
    `UPDATE public.folios
     SET cotizacion_s3key = $1,
         cotizacion_url = $2,
         estatus = 'Con cotización'
     WHERE id = $3
     RETURNING id, numero_folio, folio_codigo`,
    [s3Key, publicUrl, folioId]
  );

  const row = r.rows[0];

  // historial
  try {
    await client.query(
      `INSERT INTO public.folio_historial(
        numero_folio, estatus, comentario, actor_telefono, creado_en, folio_codigo, folio_id
      ) VALUES ($1,'Con cotización',$2,$3,NOW(),$4,$5)`,
      [
        row.numero_folio,
        "Cotización PDF adjunta",
        actorTelefono || null,
        row.folio_codigo,
        row.id,
      ]
    );
  } catch (e) {
    console.warn("Historial no insertado (cotización):", e.message);
  }

  return row;
}

/* ----------------------------- S3 helpers ----------------------------- */

async function downloadTwilioMediaAsBuffer(mediaUrl) {
  // Twilio MediaUrl requiere auth
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  const resp = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    auth: { username: sid, password: token },
    timeout: 15000,
  });

  return Buffer.from(resp.data);
}

function buildS3PublicUrl(bucket, region, key) {
  // Si tu bucket es público o tienes CloudFront, aquí puedes cambiar la URL.
  // Por default: URL pública estándar
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
}

async function uploadPdfToS3(buffer, key) {
  if (!s3Enabled) throw new Error("S3 no está configurado (faltan envs).");

  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: "application/pdf",
  });

  await s3.send(cmd);

  return buildS3PublicUrl(bucket, region, key);
}

/* ----------------------------- Parsing del mensaje ----------------------------- */

function normalizeText(t) {
  return String(t || "").trim();
}

function isMoney(text) {
  // acepta 1200, 1,200, 1200.50, 1,200.50
  const s = String(text).trim().replace(/,/g, "");
  return /^(\d+)(\.\d{1,2})?$/.test(s);
}

function parseMoney(text) {
  const s = String(text).trim().replace(/,/g, "");
  const v = Number(s);
  if (!Number.isFinite(v)) return null;
  return Math.round(v * 100) / 100;
}

/* ----------------------------- Rutas ----------------------------- */

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.post("/twilio/whatsapp", async (req, res) => {
  // IMPORTANTE: SIEMPRE responder 200 con TwiML, para evitar 11200.
  const safeReply = (msg) => {
    res.set("Content-Type", "text/xml");
    return res.status(200).send(twimlMessage(msg));
  };

  try {
    const from = req.body.From || "unknown";
    const body = normalizeText(req.body.Body);
    const numMedia = parseInt(req.body.NumMedia || "0", 10) || 0;

    const sess = getSession(from);

    // Comandos globales
    const lower = body.toLowerCase();
    if (["cancelar", "salir", "reset"].includes(lower)) {
      resetSession(sess);
      return safeReply("Listo. Cancelé el flujo. Escribe: Crear folio");
    }

    if (["ayuda", "help", "menu"].includes(lower)) {
      return safeReply(
        [
          "Comandos:",
          "- Crear folio",
          "- Adjuntar <F-YYYYMM-###> (y luego envías el PDF)",
          "",
          "Tip: si ya creaste un folio, solo envía el PDF y lo intento amarrar al último folio.",
        ].join("\n")
      );
    }

    // Si viene un archivo (media)
    if (numMedia > 0) {
      const mediaUrl = req.body.MediaUrl0;
      const mediaType = (req.body.MediaContentType0 || "").toLowerCase();

      if (!mediaUrl) {
        return safeReply("Recibí un adjunto, pero Twilio no mandó MediaUrl. Intenta de nuevo.");
      }

      if (!mediaType.includes("pdf")) {
        return safeReply("Por ahora solo acepto PDF para cotización. Envía el archivo en PDF.");
      }

      // Decide a qué folio se pega
      const client = await pool.connect();
      try {
        // 1) Si el usuario previamente mandó "Adjuntar F-....", lo guardamos en dd.attachNumero
        let targetNumero = sess.dd.attachNumero || sess.lastFolioNumero;

        if (!targetNumero) {
          return safeReply("Recibí el PDF, pero no sé a qué folio pegarlo. Responde: Adjuntar F-YYYYMM-###");
        }

        const folio = await getFolioByNumero(client, targetNumero);
        if (!folio) {
          return safeReply(`No encuentro el folio ${targetNumero}. Verifica el número y vuelve a intentar.`);
        }

        // Sube a S3
        if (!s3Enabled) {
          return safeReply("Recibí el PDF, pero falta configurar S3 (AWS envs).");
        }

        const buffer = await downloadTwilioMediaAsBuffer(mediaUrl);
        const s3Key = `cotizaciones/${folio.numero_folio}/${Date.now()}.pdf`;
        const publicUrl = await uploadPdfToS3(buffer, s3Key);

        await attachCotizacionToFolio(client, folio.id, s3Key, publicUrl, from);

        // Limpia attachNumero para no pegar futuros pdf al mismo folio por error
        sess.dd.attachNumero = null;

        return safeReply(
          `Listo ✅ Cotización guardada en el folio ${folio.numero_folio}.\n` +
            `URL: ${publicUrl}`
        );
      } finally {
        client.release();
      }
    }

    // Flujo: comando "Adjuntar ..."
    if (lower.startsWith("adjuntar")) {
      const parts = body.split(/\s+/);
      const numero = parts[1] || "";
      if (!/^F-\d{6}-\d{3}$/.test(numero)) {
        return safeReply("Formato inválido. Ejemplo: Adjuntar F-202602-001");
      }
      sess.dd.attachNumero = numero;
      return safeReply(`Ok. Ahora envía el PDF y lo adjunto al folio ${numero}.`);
    }

    // Iniciar creación
    if (sess.estado === "IDLE") {
      if (lower.includes("crear folio") || lower === "crear" || lower === "folio") {
        sess.estado = "ESPERANDO_BENEFICIARIO";
        sess.dd = { actor_telefono: from };
        return safeReply("Vamos a crear un folio.\n1) Indica BENEFICIARIO (a quién se le pagará).");
      }
      return safeReply('Escribe "Crear folio" para iniciar, o "Ayuda".');
    }

    // Paso a paso
    if (sess.estado === "ESPERANDO_BENEFICIARIO") {
      if (body.length < 3) return safeReply("Beneficiario muy corto. Intenta de nuevo.");
      sess.dd.beneficiario = body;
      sess.estado = "ESPERANDO_CONCEPTO";
      return safeReply("2) Indica CONCEPTO (razón del pago).");
    }

    if (sess.estado === "ESPERANDO_CONCEPTO") {
      if (body.length < 3) return safeReply("Concepto muy corto. Intenta de nuevo.");
      sess.dd.concepto = body;
      sess.estado = "ESPERANDO_IMPORTE";
      return safeReply("3) Indica IMPORTE en MXN (ej: 1500 o 1,500.50).");
    }

    if (sess.estado === "ESPERANDO_IMPORTE") {
      if (!isMoney(body)) return safeReply("Importe inválido. Ejemplo: 1500 o 1,500.50");
      sess.dd.importe = parseMoney(body);
      sess.estado = "ESPERANDO_CATEGORIA";
      return safeReply(renderMenu("4) Elige CATEGORÍA:", CATEGORIAS.map((c) => c.nombre)));
    }

    if (sess.estado === "ESPERANDO_CATEGORIA") {
      const picked = pickByNumber(body, CATEGORIAS);
      if (!picked) return safeReply("Opción inválida. Responde con el número.");
      sess.dd.categoria_clave = picked.clave;
      sess.dd.categoria_nombre = picked.nombre;

      // Taller => pedir unidad. DyO => sin subcat. Gastos/Inversiones => subcat
      if (picked.clave === "TALLER") {
        sess.estado = "ESPERANDO_UNIDAD";
        return safeReply("Taller seleccionado.\nIndica Unidad válida (AT o C) con número 1 a 1000.\nEj: AT-15, AT 15, AT15, C-3");
      }

      const subs = SUBCATEGORIAS[picked.clave] || [];
      if (subs.length === 0) {
        sess.dd.subcategoria_nombre = null;
        sess.estado = "ESPERANDO_PRIORIDAD";
        return safeReply(renderMenu("5) Elige PRIORIDAD:", PRIORIDADES));
      }

      sess.estado = "ESPERANDO_SUBCATEGORIA";
      return safeReply(renderMenu("5) Elige SUBCATEGORÍA:", subs));
    }

    if (sess.estado === "ESPERANDO_SUBCATEGORIA") {
      const subs = SUBCATEGORIAS[sess.dd.categoria_clave] || [];
      const picked = pickByNumber(body, subs);
      if (!picked) return safeReply("Opción inválida. Responde con el número.");
      sess.dd.subcategoria_nombre = picked;
      sess.estado = "ESPERANDO_PRIORIDAD";
      return safeReply(renderMenu("6) Elige PRIORIDAD:", PRIORIDADES));
    }

    if (sess.estado === "ESPERANDO_UNIDAD") {
      const unidad = normalizeUnidad(body);
      if (!unidad) {
        return safeReply("Unidad inválida. Usa AT o C con número 1 a 1000.\nEj: AT-15, AT 15, AT15, C-3");
      }
      sess.dd.unidad = unidad;
      // Taller: subcat null
      sess.dd.subcategoria_nombre = null;
      sess.estado = "ESPERANDO_PRIORIDAD";
      return safeReply(renderMenu("5) Elige PRIORIDAD:", PRIORIDADES));
    }

    if (sess.estado === "ESPERANDO_PRIORIDAD") {
      const picked = pickByNumber(body, PRIORIDADES);
      if (!picked) return safeReply("Opción inválida. Responde con el número.");
      sess.dd.prioridad = picked;

      sess.estado = "CONFIRMAR";
      const resumen = [
        "Confirma el folio:",
        `- Beneficiario: ${sess.dd.beneficiario}`,
        `- Concepto: ${sess.dd.concepto}`,
        `- Importe: $${sess.dd.importe}`,
        `- Categoría: ${sess.dd.categoria_nombre}`,
        `- Subcategoría: ${sess.dd.subcategoria_nombre || "(N/A)"}`,
        `- Unidad: ${sess.dd.unidad || "(N/A)"}`,
        `- Prioridad: ${sess.dd.prioridad}`,
        "",
        "Responde: SI para guardar, o NO para cancelar.",
      ].join("\n");

      return safeReply(resumen);
    }

    if (sess.estado === "CONFIRMAR") {
      if (lower === "no") {
        resetSession(sess);
        return safeReply("Cancelado. Escribe: Crear folio");
      }
      if (lower !== "si" && lower !== "sí") {
        return safeReply("Responde SI para guardar, o NO para cancelar.");
      }

      // Guardar en DB
      const client = await pool.connect();
      try {
        const folio = await insertFolio(client, sess.dd);
        sess.lastFolioNumero = folio.numero_folio;
        sess.lastFolioId = folio.id;

        resetSession(sess);

        return safeReply(
          `✅ Folio creado: ${folio.numero_folio}\n` +
            `Ahora envía la COTIZACIÓN en PDF en este chat para adjuntarla.\n` +
            `Si lo mandas después, puedes decir: Adjuntar ${folio.numero_folio}`
        );
      } finally {
        client.release();
      }
    }

    // Fallback
    return safeReply('No entendí. Escribe "Crear folio" o "Ayuda".');
  } catch (err) {
    console.error("Webhook error:", err);
    // Importante: responder 200 para Twilio sí o sí
    res.set("Content-Type", "text/xml");
    return res.status(200).send(twimlMessage("Error procesando solicitud. Intenta de nuevo en 1 minuto."));
  }
});

/* ----------------------------- Start ----------------------------- */

process.on("unhandledRejection", (r) => console.error("unhandledRejection:", r));
process.on("uncaughtException", (e) => console.error("uncaughtException:", e));

app.listen(PORT, () => {
  console.log(`✅ Bot corriendo en puerto ${PORT}`);
});
