/**
 * server.js – Bot WhatsApp (Twilio) + Postgres (Render)
 * Enfoque: Folios (registro + historial + adjuntar PDF cotización + consultas de gasto por unidad/fecha)
 */

"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const Twilio = require("twilio");

// Node 18+ trae fetch global. Si tu runtime no lo trae, instala node-fetch.
const crypto = require("crypto");

// =========================
// ENV
// =========================
const PORT = process.env.PORT || 10000;
const DATABASE_URL = process.env.DATABASE_URL;

// Twilio (para responder y para bajar media cuando adjuntan PDF)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";

// S3 opcional (si no está configurado, guardamos la URL de Twilio y listo)
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || "";

// Si quieres “notificar” (luego lo robustecemos con tabla usuarios/roles)
const NOTIFY_NUMBERS = (process.env.NOTIFY_NUMBERS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// =========================
// DB
// =========================
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  // Render Postgres normalmente requiere SSL
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
});

// =========================
// Helpers: TwiML
// =========================
function twiml(message) {
  const MessagingResponse = Twilio.twiml.MessagingResponse;
  const r = new MessagingResponse();
  r.message(message);
  return r.toString();
}

// =========================
// Helpers: texto / parsing
// =========================
function cleanText(s) {
  return (s || "").toString().trim();
}

function upperNoAccents(s) {
  return cleanText(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function isProbablyGreeting(t) {
  const x = upperNoAccents(t);
  return ["HOLA", "BUENAS", "BUEN DIA", "BUENOS DIAS", "BUENAS TARDES", "BUENAS NOCHES"].some(k => x.startsWith(k));
}

// =========================
// Catálogo (menús)
/// Nota: Inversiones NO tiene “quinta categoría” (quedan 4 subcats)
// =========================
const CATS = [
  { key: "GASTOS", label: "Gastos" },
  { key: "INVERSIONES", label: "Inversiones" },
  { key: "DYO", label: "Derechos y Obligaciones" },
  { key: "TALLER", label: "Taller" },
];

// Subcategorías por categoría (según tu documento)
const SUBCATS = {
  GASTOS: [
    "Contractuales",
    "Equipo planta",
    "Estaciones",
    "Juridicos",
    "Liquidaciones laborales",
    "Pasivos meses anteriores",
    "Rentas",
    "Tramites vehiculares",
    "Varios",
  ],
  INVERSIONES: [
    "Equipo para la planta",
    "Instalaciones a clientes",
    "Publicidad",
    "Tanques y cilindros",
  ],
  DYO: [],     // sin subcat
  TALLER: [],  // sin subcat (aquí pides UNIDAD)
};

function renderMenu(title, items) {
  // Menú simple por texto (1..N)
  let out = `${title}\n`;
  items.forEach((it, idx) => {
    out += `${idx + 1}) ${it}\n`;
  });
  out += `\nResponde con el número.`;
  return out;
}

function parseChoiceNumber(text, max) {
  const m = cleanText(text).match(/^(\d{1,2})$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 1 || n > max) return null;
  return n;
}

// =========================
// Unidad (AT / C) – Normalización y validación
// Acepta: AT-03, AT03, AT 3, at 15, C-11, C11, etc.
// Normaliza a: AT-03 / C-03 (2 dígitos)
// =========================
function normalizeUnidad(input) {
  const raw = upperNoAccents(input);
  // quita espacios
  const s = raw.replace(/\s+/g, "");
  // soporta AT-03, AT03, AT-3, AT3
  const m = s.match(/^(AT|C)-?(\d{1,2})$/);
  if (!m) return null;
  const prefix = m[1];
  const num = parseInt(m[2], 10);
  if (Number.isNaN(num) || num < 1 || num > 99) return null;
  const two = num.toString().padStart(2, "0");
  return `${prefix}-${two}`;
}

function isValidUnidad(input) {
  return normalizeUnidad(input) !== null;
}

// “pipa 11” => AT-11, “cilindrera 11” => C-11
function unidadFromNatural(text) {
  const x = upperNoAccents(text);

  // detecta tipo
  let prefix = null;
  if (x.includes("CILINDR")) prefix = "C";
  if (x.includes("PIPA") || x.includes("AUTOTANQUE") || x.includes("AT")) prefix = prefix || "AT";

  // número
  const nm = x.match(/(?:PIPA|CILINDRERA|CILINDRO|AT|AUTOTANQUE)\s*-?\s*(\d{1,2})/);
  const n2 = nm ? nm[1] : null;

  if (prefix && n2) return normalizeUnidad(`${prefix}${n2}`);
  return null;
}

// =========================
// Fechas: rangos
// Soporta:
// - “ultimos 2 meses”
// - “del 2025-01-01 al 2025-02-29”
// - “del 01/01/2025 al 29/02/2025”
// =========================
function parseDateYMD(s) {
  const t = cleanText(s);
  // YYYY-MM-DD
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  // DD/MM/YYYY
  m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return null;
}

function startOfDayUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addMonthsUTC(d, months) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const nd = new Date(Date.UTC(y, m + months, 1));
  // clamp day
  const lastDay = new Date(Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth() + 1, 0)).getUTCDate();
  nd.setUTCDate(Math.min(day, lastDay));
  return nd;
}

function parseRangeFromText(text) {
  const x = upperNoAccents(text);

  // últimos N meses
  let m = x.match(/ULTIMOS?\s+(\d{1,2})\s+MESES?/);
  if (m) {
    const n = parseInt(m[1], 10);
    const now = new Date();
    const end = startOfDayUTC(now);
    const start = startOfDayUTC(addMonthsUTC(end, -n));
    return { start, end, label: `últimos ${n} meses` };
  }

  // del AAAA-MM-DD al AAAA-MM-DD
  m = x.match(/DEL\s+(\d{4}-\d{2}-\d{2})\s+AL\s+(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const d1 = parseDateYMD(m[1]);
    const d2 = parseDateYMD(m[2]);
    if (d1 && d2) return { start: startOfDayUTC(d1), end: startOfDayUTC(d2), label: `${m[1]} a ${m[2]}` };
  }

  // del DD/MM/YYYY al DD/MM/YYYY
  m = x.match(/DEL\s+(\d{2}\/\d{2}\/\d{4})\s+AL\s+(\d{2}\/\d{2}\/\d{4})/);
  if (m) {
    const d1 = parseDateYMD(m[1]);
    const d2 = parseDateYMD(m[2]);
    if (d1 && d2) return { start: startOfDayUTC(d1), end: startOfDayUTC(d2), label: `${m[1]} a ${m[2]}` };
  }

  // default: últimos 2 meses si pide "ultimos meses" sin número
  if (x.includes("ULTIMOS") && x.includes("MESES")) {
    const now = new Date();
    const end = startOfDayUTC(now);
    const start = startOfDayUTC(addMonthsUTC(end, -2));
    return { start, end, label: "últimos 2 meses" };
  }

  return null;
}

// =========================
// Detección: intención (crear folio / consulta gasto)
// =========================
function isCreateIntent(text) {
  const x = upperNoAccents(text);
  return (
    x.includes("CREAR FOLIO") ||
    x.startsWith("CREAR") ||
    x.includes("NUEVO FOLIO") ||
    x.includes("REGISTRAR FOLIO")
  );
}

function isGastoConsultaIntent(text) {
  const x = upperNoAccents(text);
  return (
    x.includes("CUANTO") && x.includes("GAST") ||
    x.includes("GASTADO") ||
    x.includes("GASTOS") && (x.includes("PIPA") || x.includes("CILINDR") || x.includes("AT") || x.includes("UNIDAD"))
  );
}

// =========================
// Dialogo: persistencia en DB (dialogo_estado)
// =========================
async function ensureSchema() {
  // tabla dialogo_estado para persistir estado por teléfono
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.dialogo_estado (
      telefono character varying(50) PRIMARY KEY,
      data jsonb NOT NULL,
      actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getDialog(telefono) {
  const r = await pool.query(`SELECT data FROM public.dialogo_estado WHERE telefono=$1`, [telefono]);
  if (r.rowCount === 0) return null;
  return r.rows[0].data;
}

async function saveDialog(telefono, data) {
  await pool.query(
    `
    INSERT INTO public.dialogo_estado (telefono, data, actualizado_en)
    VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
    ON CONFLICT (telefono)
    DO UPDATE SET data = EXCLUDED.data, actualizado_en = CURRENT_TIMESTAMP
    `,
    [telefono, JSON.stringify(data)]
  );
}

async function clearDialog(telefono) {
  await pool.query(`DELETE FROM public.dialogo_estado WHERE telefono=$1`, [telefono]);
}

// =========================
// Folio: generar folio_codigo y crear registro
// folio_codigo: F-YYYYMM-### (ej F-202602-001)
// numero_folio: igual que folio_codigo (para consistencia / futuros FK)
// usa tabla folio_counters (ya existe)
// =========================
async function nextFolioCodigo(client) {
  const now = new Date();
  const yyyy = now.getUTCFullYear().toString();
  const mm = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const yyyymm = `${yyyy}${mm}`;

  // Lock row
  const sel = await client.query(
    `SELECT last_seq FROM public.folio_counters WHERE yyyymm=$1 FOR UPDATE`,
    [yyyymm]
  );

  let seq = 1;
  if (sel.rowCount === 0) {
    await client.query(
      `INSERT INTO public.folio_counters (yyyymm, last_seq) VALUES ($1, $2)`,
      [yyyymm, 1]
    );
    seq = 1;
  } else {
    seq = sel.rows[0].last_seq + 1;
    await client.query(`UPDATE public.folio_counters SET last_seq=$2 WHERE yyyymm=$1`, [yyyymm, seq]);
  }

  const s3 = seq.toString().padStart(3, "0");
  return `F-${yyyymm}-${s3}`;
}

async function insertFolio(dd) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const folio_codigo = await nextFolioCodigo(client);
    const numero_folio = folio_codigo;

    // Inserta folio
    const ins = await client.query(
      `
      INSERT INTO public.folios
      (folio_codigo, numero_folio, planta, creado_por, beneficiario, concepto, importe, monto, categoria, subcategoria, unidad, estatus)
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11)
      RETURNING id
      `,
      [
        folio_codigo,
        numero_folio,
        dd.planta || null,
        dd.creado_por || null,
        dd.beneficiario || null,
        dd.concepto || null,
        dd.importe || null,
        dd.categoria || null,
        dd.subcategoria || null,
        dd.unidad || null,
        dd.estatus || "Generado",
      ]
    );

    const folio_id = ins.rows[0].id;

    // Historial (tabla: folio_historial)
    await client.query(
      `
      INSERT INTO public.folio_historial (numero_folio, estatus, comentario, actor_telefono, actor_rol, folio_codigo, folio_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        numero_folio,
        dd.estatus || "Generado",
        "Folio creado",
        dd.actor_telefono || null,
        dd.actor_rol || null,
        folio_codigo,
        folio_id,
      ]
    );

    await client.query("COMMIT");
    return { folio_id, folio_codigo, numero_folio };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// =========================
// PDF: guardar cotización en folios
// - Si hay S3 config, subimos a S3; si no, guardamos URL Twilio.
// =========================
async function fetchTwilioMedia(mediaUrl) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Faltan TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN para descargar media.");
  }
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`No se pudo descargar media: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "";
  return { buf, contentType: ct };
}

async function maybeUploadToS3(buffer, contentType, key) {
  if (!AWS_S3_BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return null; // no S3
  }
  // Carga simple sin AWS SDK (para no meter más deps). Recomendado: usar aws-sdk v3.
  // Aquí lo dejamos como “pendiente” de robustecer; por ahora regresamos null y guardamos Twilio URL.
  // Si quieres, te lo integro con @aws-sdk/client-s3 en la siguiente iteración.
  return null;
}

async function setCotizacionForFolio(folioCodigo, twilioMediaUrl) {
  // descarga
  const { buf, contentType } = await fetchTwilioMedia(twilioMediaUrl);

  if (!contentType.includes("pdf") && !contentType.includes("application/octet-stream")) {
    // Twilio a veces manda octet-stream; permitimos, pero si viene algo raro lo rechazamos.
    // Si quieres, aquí validamos por “%PDF-” en bytes.
    const head = buf.slice(0, 5).toString("utf8");
    if (head !== "%PDF-") {
      throw new Error("El archivo adjunto no parece ser PDF.");
    }
  }

  const s3key = `cotizaciones/${folioCodigo}/${crypto.randomUUID()}.pdf`;
  const uploaded = await maybeUploadToS3(buf, "application/pdf", s3key);

  // actualiza folio
  await pool.query(
    `
    UPDATE public.folios
    SET cotizacion_url = $2,
        cotizacion_s3key = $3,
        estatus = CASE WHEN estatus IS NULL OR estatus='Generado' THEN 'Cotizacion adjunta' ELSE estatus END
    WHERE folio_codigo = $1
       OR numero_folio = $1
    `,
    [folioCodigo, uploaded?.url || twilioMediaUrl, uploaded?.key || (AWS_S3_BUCKET ? s3key : null)]
  );

  // historial
  await pool.query(
    `
    INSERT INTO public.folio_historial (numero_folio, estatus, comentario, creado_en, folio_codigo)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $1)
    `,
    [folioCodigo, "Cotizacion adjunta", "Cotización PDF adjunta al folio"]
  );
}

// =========================
// Consultas: gasto por unidad y rango
// - usa folios.unidad = AT-xx / C-xx
// - suma folios.importe o folios.monto
// - filtra por fecha_creacion (existe en tu tabla) o creado_en
// =========================
async function queryGastoUnidad(unidadNorm, range) {
  const start = range?.start || startOfDayUTC(addMonthsUTC(new Date(), -2));
  const end = range?.end || startOfDayUTC(new Date());

  // end inclusive -> convertimos a end+1 día para BETWEEN semiabierto
  const endPlus = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  const r = await pool.query(
    `
    SELECT
      COUNT(*)::int AS folios_count,
      COALESCE(SUM(COALESCE(importe, monto, 0)), 0)::numeric AS total
    FROM public.folios
    WHERE unidad = $1
      AND COALESCE(fecha_creacion, creado_en) >= $2
      AND COALESCE(fecha_creacion, creado_en) <  $3
      AND (estatus IS NULL OR estatus <> 'Cancelado')
    `,
    [unidadNorm, start.toISOString().slice(0, 10), endPlus.toISOString().slice(0, 10)]
  );

  return {
    unidad: unidadNorm,
    folios_count: r.rows[0].folios_count,
    total: r.rows[0].total,
    label: range?.label || "últimos 2 meses",
  };
}

// =========================
// App / Webhook
// =========================
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => res.status(200).send("OK"));

app.post("/whatsapp", async (req, res) => {
  try {
    const from = cleanText(req.body.From);  // whatsapp:+521...
    const body = cleanText(req.body.Body);
    const numMedia = parseInt(req.body.NumMedia || "0", 10);
    const mediaUrl0 = cleanText(req.body.MediaUrl0);
    const mediaType0 = cleanText(req.body.MediaContentType0);

    const telefono = from || "unknown";
    const texto = body;

    let dd = (await getDialog(telefono)) || {
      estado: "IDLE",
      actor_telefono: telefono,
      actor_rol: null,
      // folio fields
      planta: null,
      creado_por: null,
      beneficiario: null,
      concepto: null,
      importe: null,
      categoria: null,
      subcategoria: null,
      unidad: null,
      estatus: "Generado",
      // para adjuntar
      folio_codigo_creado: null,
    };

    // comandos rápidos
    const tUpper = upperNoAccents(texto);
    if (tUpper === "CANCELAR" || tUpper === "SALIR" || tUpper === "RESET") {
      await clearDialog(telefono);
      res.set("Content-Type", "text/xml");
      return res.send(twiml("Listo. Se canceló el proceso. Escribe: *Crear folio* para iniciar de nuevo."));
    }

    // Si llegó media y estamos esperando PDF
    if (dd.estado === "ESPERANDO_PDF") {
      if (numMedia > 0 && mediaUrl0) {
        // validar que sea pdf
        if (mediaType0 && !mediaType0.includes("pdf") && !mediaType0.includes("octet-stream")) {
          res.set("Content-Type", "text/xml");
          return res.send(twiml("Recibí un archivo, pero no parece PDF. Por favor adjunta la *cotización en PDF*."));
        }
        await setCotizacionForFolio(dd.folio_codigo_creado, mediaUrl0);
        dd.estado = "IDLE";
        const folio = dd.folio_codigo_creado;
        dd.folio_codigo_creado = null;
        await saveDialog(telefono, dd);

        res.set("Content-Type", "text/xml");
        return res.send(twiml(`✅ Cotización adjunta al folio *${folio}*.\n\nPuedes:\n- Escribir *Crear folio* para registrar otro\n- O preguntar: *¿Cuánto he gastado en la pipa 11 en los últimos 2 meses?*`));
      } else {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Aún no recibo el PDF. Por favor adjunta la *cotización en PDF* en este chat."));
      }
    }

    // Intención: consulta de gasto (sin afectar flujo)
    if (isGastoConsultaIntent(texto)) {
      const u = unidadFromNatural(texto) || normalizeUnidad(texto);
      const range = parseRangeFromText(texto);

      if (!u) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Para consultar, dime la unidad así:\n- *Pipa 11* (o *AT-11*)\n- *Cilindrera 3* (o *C-03*)\n\nEj: *¿Cuánto he gastado en la pipa 11 en los últimos 2 meses?*"));
      }

      const ans = await queryGastoUnidad(u, range);
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `📌 Gasto en *${ans.unidad}* (${ans.label}):\n` +
          `- Folios: *${ans.folios_count}*\n` +
          `- Total: *$${Number(ans.total).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`
        )
      );
    }

    // Si saluda, ayuda
    if (dd.estado === "IDLE" && (isProbablyGreeting(texto) || tUpper === "AYUDA" || tUpper === "MENU")) {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `Hola 👋\n` +
          `Comandos:\n` +
          `1) *Crear folio*\n` +
          `2) Consulta: *¿Cuánto he gastado en la pipa 11 en los últimos 2 meses?*\n` +
          `3) *Reset* para cancelar cualquier captura`
        )
      );
    }

    // Intención: crear folio
    if (dd.estado === "IDLE" && isCreateIntent(texto)) {
      dd.estado = "ESPERANDO_BENEFICIARIO";
      await saveDialog(telefono, dd);
      res.set("Content-Type", "text/xml");
      return res.send(twiml("✅ Vamos a crear un folio.\n\n1/6) Escribe el *Beneficiario* (a nombre de quién será el cheque)."));
    }

    // =========================
    // Flujo creación folio
    // =========================
    if (dd.estado === "ESPERANDO_BENEFICIARIO") {
      dd.beneficiario = cleanText(texto);
      dd.estado = "ESPERANDO_CONCEPTO";
      await saveDialog(telefono, dd);
      res.set("Content-Type", "text/xml");
      return res.send(twiml("2/6) Escribe el *Concepto* (razón del pago)."));
    }

    if (dd.estado === "ESPERANDO_CONCEPTO") {
      dd.concepto = cleanText(texto);
      dd.estado = "ESPERANDO_IMPORTE";
      await saveDialog(telefono, dd);
      res.set("Content-Type", "text/xml");
      return res.send(twiml("3/6) Escribe el *Importe* en pesos (ej: 13500.50)."));
    }

    if (dd.estado === "ESPERANDO_IMPORTE") {
      const val = cleanText(texto).replace(/,/g, "");
      const n = Number(val);
      if (!Number.isFinite(n) || n <= 0) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Importe inválido. Ejemplos válidos: *13500* o *13500.50*"));
      }
      dd.importe = n;
      dd.estado = "ESPERANDO_CATEGORIA";

      // menú categorías
      await saveDialog(telefono, dd);
      res.set("Content-Type", "text/xml");
      return res.send(twiml(renderMenu("4/6) Elige *Categoría*:", CATS.map(c => c.label))));
    }

    if (dd.estado === "ESPERANDO_CATEGORIA") {
      const choice = parseChoiceNumber(texto, CATS.length);
      if (!choice) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`Elige un número del 1 al ${CATS.length}.\n\n${renderMenu("Categoría:", CATS.map(c => c.label))}`));
      }
      const cat = CATS[choice - 1];
      dd.categoria = cat.label;

      // Según categoría, pedimos subcat o unidad o nada
      if (cat.key === "TALLER") {
        dd.subcategoria = null; // taller no subcat
        dd.estado = "ESPERANDO_UNIDAD";
        await saveDialog(telefono, dd);
        res.set("Content-Type", "text/xml");
        return res.send(twiml("5/6) Taller seleccionado.\nIndica la *Unidad* (ej: *AT-03* o *C-03*)."));
      }

      const subs = SUBCATS[cat.key] || [];
      if (subs.length === 0) {
        dd.subcategoria = null;
        dd.unidad = null;
        dd.estado = "CONFIRMAR_FOLIO";
        await saveDialog(telefono, dd);
        res.set("Content-Type", "text/xml");
        return res.send(twiml(buildConfirm(dd)));
      }

      dd.estado = "ESPERANDO_SUBCATEGORIA";
      dd._subcat_key = cat.key; // interno para saber qué lista
      await saveDialog(telefono, dd);

      res.set("Content-Type", "text/xml");
      return res.send(twiml(renderMenu("5/6) Elige *Subcategoría*:", subs)));
    }

    if (dd.estado === "ESPERANDO_SUBCATEGORIA") {
      const key = dd._subcat_key;
      const subs = SUBCATS[key] || [];
      const choice = parseChoiceNumber(texto, subs.length);
      if (!choice) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`Elige un número del 1 al ${subs.length}.\n\n${renderMenu("Subcategoría:", subs)}`));
      }
      dd.subcategoria = subs[choice - 1];
      dd.unidad = null;
      dd.estado = "CONFIRMAR_FOLIO";
      dd._subcat_key = null;
      await saveDialog(telefono, dd);

      res.set("Content-Type", "text/xml");
      return res.send(twiml(buildConfirm(dd)));
    }

    if (dd.estado === "ESPERANDO_UNIDAD") {
      const norm = normalizeUnidad(texto);
      if (!norm) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Unidad inválida. Ejemplos: *AT-03*, *AT 3*, *AT03*, *C-11*.\n\nVuelve a escribir la unidad."));
      }
      dd.unidad = norm;
      dd.estado = "CONFIRMAR_FOLIO";
      await saveDialog(telefono, dd);

      res.set("Content-Type", "text/xml");
      return res.send(twiml(buildConfirm(dd)));
    }

    if (dd.estado === "CONFIRMAR_FOLIO") {
      const x = upperNoAccents(texto);
      if (x === "SI" || x === "S" || x === "CONFIRMAR" || x === "OK") {
        // Crear folio en DB
        const created = await insertFolio(dd);

        // Se queda esperando PDF
        dd.estado = "ESPERANDO_PDF";
        dd.folio_codigo_creado = created.folio_codigo;
        await saveDialog(telefono, dd);

        res.set("Content-Type", "text/xml");
        return res.send(
          twiml(
            `✅ Folio creado: *${created.folio_codigo}*\n` +
            `Estatus: *Generado*\n\n` +
            `📎 Falta adjuntar la *cotización en PDF*.\n` +
            `Por favor *adjunta el PDF aquí en el chat*.\n\n` +
            `Tip: si quieres cancelar: escribe *Reset*`
          )
        );
      }

      if (x === "NO" || x === "N" || x === "EDITAR") {
        // reinicia captura
        dd.estado = "ESPERANDO_BENEFICIARIO";
        dd.beneficiario = null;
        dd.concepto = null;
        dd.importe = null;
        dd.categoria = null;
        dd.subcategoria = null;
        dd.unidad = null;
        await saveDialog(telefono, dd);
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Perfecto, reiniciamos.\n\n1/6) Escribe el *Beneficiario*:"));
      }

      res.set("Content-Type", "text/xml");
      return res.send(twiml("Responde *SI* para confirmar y crear el folio, o *NO* para reiniciar."));
    }

    // Si llega aquí, no entendimos
    res.set("Content-Type", "text/xml");
    return res.send(
      twiml(
        `No te entendí.\n\n` +
        `Opciones:\n` +
        `- Escribe *Crear folio*\n` +
        `- O consulta: *¿Cuánto he gastado en la pipa 11 en los últimos 2 meses?*\n` +
        `- *Reset* para cancelar`
      )
    );
  } catch (err) {
    console.error("Error webhook:", err);
    // No rompemos el chat: respuesta amigable
    res.set("Content-Type", "text/xml");
    return res.send(twiml("Error procesando solicitud. Intenta de nuevo en 1 minuto."));
  }
});

function buildConfirm(dd) {
  const lines = [];
  lines.push("6/6) Confirma la información:");
  lines.push(`- Beneficiario: ${dd.beneficiario || "(vacío)"}`);
  lines.push(`- Concepto: ${dd.concepto || "(vacío)"}`);
  lines.push(`- Importe: $${Number(dd.importe || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`- Categoría: ${dd.categoria || "(vacío)"}`);
  if (dd.subcategoria) lines.push(`- Subcategoría: ${dd.subcategoria}`);
  if (dd.unidad) lines.push(`- Unidad: ${dd.unidad}`);
  lines.push("");
  lines.push("Responde *SI* para crear el folio o *NO* para reiniciar.");
  return lines.join("\n");
}

// =========================
// Start
// =========================
(async () => {
  try {
    await ensureSchema();
    console.log("Schema verificado (dialogo_estado listo).");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (e) {
    console.error("Fallo al iniciar:", e);
    process.exit(1);
  }
})();
