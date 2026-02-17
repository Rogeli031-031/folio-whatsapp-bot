'use strict';

/**
 * server.js - Folio WhatsApp Bot (Twilio + PostgreSQL + opcional S3)
 * Node 18+ (Node 22 OK)
 */

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { Pool } = require('pg');

// Twilio (solo para generar TwiML)
let twilio;
try {
  twilio = require('twilio');
} catch (e) {
  // Si no está instalado, no rompemos. Render responderá con XML simple.
  twilio = null;
}

// =====================
// ENV
// =====================
const PORT = process.env.PORT || 10000;

const DATABASE_URL = process.env.DATABASE_URL; // Render suele proveerla
if (!DATABASE_URL) {
  console.error('Falta DATABASE_URL');
}

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const VALIDATE_TWILIO_SIGNATURE = (process.env.VALIDATE_TWILIO_SIGNATURE || 'false').toLowerCase() === 'true';

// Para envíos proactivos (notificaciones) — opcional
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || ''; // ej: "whatsapp:+14155238886"

// S3 (opcional)
const AWS_REGION = process.env.AWS_REGION || '';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || '';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';

// =====================
// PostgreSQL Pool
// =====================
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL && DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : undefined,
});

// =====================
// In-memory sesión por teléfono
// (Luego lo movemos a DB si quieres persistencia)
// =====================
/**
 * dd = {
 *   estado: 'IDLE' | 'ESPERANDO_BENEFICIARIO' | 'ESPERANDO_CONCEPTO' | 'ESPERANDO_IMPORTE' |
 *           'ESPERANDO_CATEGORIA' | 'ESPERANDO_SUBCATEGORIA' | 'ESPERANDO_UNIDAD' |
 *           'ESPERANDO_COTIZACION',
 *   folio_id, folio_codigo, numero_folio,
 *   planta, planta_id, creado_por_id, creado_por,
 *   beneficiario, concepto, importe,
 *   categoria, subcategoria, unidad
 * }
 */
const sessions = new Map();

// =====================
// Catálogos
// =====================
const CATEGORIAS = [
  { clave: 'GASTOS', nombre: 'Gastos' },
  { clave: 'INVERSIONES', nombre: 'Inversiones' },
  { clave: 'DYO', nombre: 'Derechos y Obligaciones' },
  { clave: 'TALLER', nombre: 'Taller' },
];

// OJO: “No hay quinta categoría en inversiones” -> aquí van 4 subcats
const SUBCATS = {
  GASTOS: [
    'Contractuales',
    'Equipo planta',
    'Estaciones',
    'Jurídicos',
    'Liquidaciones laborales',
    'Pasivos meses anteriores',
    'Rentas',
    'Trámites vehiculares',
    'Varios',
  ],
  INVERSIONES: [
    'Equipo para la planta',
    'Instalaciones a clientes',
    'Publicidad',
    'Tanques y cilindros',
  ],
  DYO: [],     // sin subcategoría
  TALLER: [],  // sin subcategoría (solo unidad)
};

// =====================
// Helpers (TwiML)
// =====================
function twimlMessage(text) {
  if (twilio?.twiml?.MessagingResponse) {
    const resp = new twilio.twiml.MessagingResponse();
    resp.message(text);
    return resp.toString();
  }
  // Fallback XML simple
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(text)}</Message></Response>`;
}

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderMenu(title, items) {
  // items: array {key,label}
  let out = `${title}\n`;
  for (const it of items) {
    out += `${it.key}) ${it.label}\n`;
  }
  out += `\nResponde con el número.`;
  return out.trim();
}

// =====================
// Helpers (validaciones)
// =====================
function normalizeUnidad(raw) {
  // Acepta: "AT-3", "AT 03", "at03", "C-12", "c 1", etc.
  const s = String(raw || '').trim().toUpperCase();
  // extrae prefijo AT o C y número 1-99
  const m = s.match(/^(AT|C)\s*[- ]?\s*(\d{1,2})$/i);
  if (!m) return null;

  const pref = m[1].toUpperCase();
  const num = parseInt(m[2], 10);
  if (!Number.isFinite(num) || num <= 0 || num > 99) return null;

  const num2 = String(num).padStart(2, '0');
  return `${pref}-${num2}`; // guardado canónico
}

function isMoney(raw) {
  const s = String(raw || '').trim().replace(/,/g, '');
  return /^(\d+)(\.\d{1,2})?$/.test(s);
}

function parseMoney(raw) {
  const s = String(raw || '').trim().replace(/,/g, '');
  return Number(s);
}

function getSession(phone) {
  if (!sessions.has(phone)) sessions.set(phone, { estado: 'IDLE' });
  return sessions.get(phone);
}

function resetSession(phone) {
  sessions.set(phone, { estado: 'IDLE' });
}

// =====================
// Helpers (DB)
// =====================
async function dbOne(sql, params) {
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

async function dbMany(sql, params) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

// Genera folio: F-YYYYMM-### usando tabla folio_counters
async function generarFolioCodigo(client) {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  // lock row (si existe) o crea
  await client.query('BEGIN');
  try {
    const row = await client.query(
      `SELECT yyyymm, last_seq FROM public.folio_counters WHERE yyyymm=$1 FOR UPDATE`,
      [yyyymm]
    );

    let nextSeq = 1;

    if (row.rows.length === 0) {
      await client.query(
        `INSERT INTO public.folio_counters(yyyymm, last_seq) VALUES($1, $2)`,
        [yyyymm, 1]
      );
      nextSeq = 1;
    } else {
      nextSeq = Number(row.rows[0].last_seq) + 1;
      await client.query(
        `UPDATE public.folio_counters SET last_seq=$2 WHERE yyyymm=$1`,
        [yyyymm, nextSeq]
      );
    }

    await client.query('COMMIT');

    const seq3 = String(nextSeq).padStart(3, '0');
    return `F-${yyyymm}-${seq3}`;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}

async function insertarHistorial({ folio_id, folio_codigo, numero_folio, estatus, comentario, actor_telefono, actor_rol, actor_id }) {
  await pool.query(
    `INSERT INTO public.folio_historial
      (folio_id, folio_codigo, numero_folio, estatus, comentario, actor_telefono, actor_rol, actor_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      folio_id || null,
      folio_codigo || null,
      numero_folio || null,
      estatus || 'Generado',
      comentario || null,
      actor_telefono || null,
      actor_rol || null,
      actor_id || null,
    ]
  );
}

// =====================
// (Opcional) S3 Upload
// =====================
async function tryLoadS3() {
  // Evitar “MODULE_NOT_FOUND” en deploy si no instalaste aws sdk v3
  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    return { S3Client, PutObjectCommand };
  } catch (e) {
    return null;
  }
}

async function uploadPdfToS3({ buffer, contentType, key }) {
  if (!AWS_REGION || !AWS_S3_BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return null;
  }
  const s3sdk = await tryLoadS3();
  if (!s3sdk) return null;

  const { S3Client, PutObjectCommand } = s3sdk;

  const s3 = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  await s3.send(new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/pdf',
  }));

  // URL “directa” (si tu bucket es público) — si es privado, luego ponemos presigned URLs
  const url = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
  return { url, s3key: key };
}

// =====================
// Twilio signature validation (opcional)
// =====================
function validateTwilioSignature(req) {
  if (!VALIDATE_TWILIO_SIGNATURE) return true;
  if (!TWILIO_AUTH_TOKEN) return false;

  const signature = req.headers['x-twilio-signature'];
  if (!signature) return false;

  // Twilio signature base string: full URL + sorted params
  // En Render, a veces cambia el host/forwarded proto. Si falla, desactiva VALIDATE_TWILIO_SIGNATURE.
  const url = (req.protocol + '://' + req.get('host') + req.originalUrl);

  const params = req.body || {};
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];

  const expected = crypto
    .createHmac('sha1', TWILIO_AUTH_TOKEN)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');

  return expected === signature;
}

// =====================
// Main App
// =====================
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Health
app.get('/', async (req, res) => {
  res.status(200).send('OK - folio whatsapp bot');
});

// Webhook Twilio
app.post('/twilio', async (req, res) => {
  try {
    // Validación firma (opcional)
    if (!validateTwilioSignature(req)) {
      res.set('Content-Type', 'text/xml');
      return res.status(403).send(twimlMessage('Firma inválida (Twilio).'));
    }

    const from = (req.body.From || '').trim();  // ej: "whatsapp:+521..."
    const body = (req.body.Body || '').trim();
    const numMedia = parseInt(req.body.NumMedia || '0', 10);

    const phone = from; // guardamos “whatsapp:+...”
    const dd = getSession(phone);

    // Detecta si viene PDF
    const media = [];
    if (numMedia > 0) {
      for (let i = 0; i < numMedia; i++) {
        const url = req.body[`MediaUrl${i}`];
        const ctype = req.body[`MediaContentType${i}`];
        if (url) media.push({ url, ctype });
      }
    }

    // =========================
    // Comandos globales
    // =========================
    const upper = body.toUpperCase();

    if (upper === 'CANCELAR' || upper === 'SALIR' || upper === 'RESET') {
      resetSession(phone);
      res.set('Content-Type', 'text/xml');
      return res.send(twimlMessage('Listo. Sesión reiniciada. Escribe: "Crear folio" para iniciar.'));
    }

    // ESTATUS F-YYYYMM-###
    if (upper.startsWith('ESTATUS ')) {
      const fol = body.split(/\s+/).slice(1).join(' ').trim();
      const row = await dbOne(
        `SELECT folio_codigo, numero_folio, estatus, beneficiario, concepto, monto, categoria, subcategoria, unidad, cotizacion_url
         FROM public.folios
         WHERE folio_codigo=$1 OR numero_folio=$1
         LIMIT 1`,
        [fol]
      );

      res.set('Content-Type', 'text/xml');
      if (!row) return res.send(twimlMessage(`No encontré el folio "${fol}".`));

      const faltaPdf = row.cotizacion_url ? 'NO' : 'SÍ';
      return res.send(twimlMessage(
        `Folio: ${row.folio_codigo}\nEstatus: ${row.estatus}\nMonto: ${row.monto ?? row.importe ?? 'N/D'}\nCategoría: ${row.categoria ?? 'N/D'}\nSubcat: ${row.subcategoria ?? 'N/D'}\nUnidad: ${row.unidad ?? 'N/A'}\nFalta PDF: ${faltaPdf}`
      ));
    }

    if (upper.startsWith('VER PDF ')) {
      const fol = body.split(/\s+/).slice(2).join(' ').trim();
      const row = await dbOne(
        `SELECT folio_codigo, cotizacion_url FROM public.folios WHERE folio_codigo=$1 OR numero_folio=$1 LIMIT 1`,
        [fol]
      );
      res.set('Content-Type', 'text/xml');
      if (!row) return res.send(twimlMessage(`No encontré el folio "${fol}".`));
      if (!row.cotizacion_url) return res.send(twimlMessage(`El folio ${row.folio_codigo} aún no tiene PDF adjunto.`));
      return res.send(twimlMessage(`PDF del folio ${row.folio_codigo}:\n${row.cotizacion_url}`));
    }

    if (upper === 'FALTA PDF') {
      const rows = await dbMany(
        `SELECT folio_codigo, monto, categoria, unidad
         FROM public.folios
         WHERE cotizacion_url IS NULL
         ORDER BY fecha_creacion DESC
         LIMIT 10`,
        []
      );
      res.set('Content-Type', 'text/xml');
      if (rows.length === 0) return res.send(twimlMessage('No hay folios sin PDF (o no encontré ninguno).'));

      let msg = 'Folios sin PDF (últimos 10):\n';
      for (const r of rows) {
        msg += `- ${r.folio_codigo} | ${r.categoria ?? 'N/D'} | ${r.unidad ?? 'N/A'} | $${r.monto ?? 'N/D'}\n`;
      }
      msg += '\nUsa: VER PDF F-YYYYMM-###';
      return res.send(twimlMessage(msg.trim()));
    }

    // Si llega PDF y estamos esperando cotización
    const hasPdf = media.some(m => String(m.ctype || '').toLowerCase().includes('pdf'));
    if (hasPdf) {
      // si hay un folio en sesión, adjuntamos ahí; si no, intentamos inferir por último folio creado por ese teléfono
      let targetFolioCodigo = dd.folio_codigo;

      if (!targetFolioCodigo) {
        const last = await dbOne(
          `SELECT folio_codigo FROM public.folios
           WHERE creado_por=$1 OR creado_por_id IS NOT NULL
           ORDER BY fecha_creacion DESC
           LIMIT 1`,
          [phone]
        );
        targetFolioCodigo = last?.folio_codigo || null;
      }

      if (!targetFolioCodigo) {
        res.set('Content-Type', 'text/xml');
        return res.send(twimlMessage('Recibí un PDF, pero no tengo identificado a qué folio adjuntarlo. Escribe: "ESTATUS F-YYYYMM-###".'));
      }

      const pdf = media.find(m => String(m.ctype || '').toLowerCase().includes('pdf'));
      const pdfUrl = pdf.url;

      // Descargar el PDF desde Twilio y opcionalmente subirlo a S3
      let finalUrl = pdfUrl;
      let s3key = null;

      try {
        const r = await fetch(pdfUrl);
        const buf = Buffer.from(await r.arrayBuffer());
        const key = `cotizaciones/${targetFolioCodigo}/${Date.now()}.pdf`;

        const up = await uploadPdfToS3({ buffer: buf, contentType: pdf.ctype, key });
        if (up?.url) {
          finalUrl = up.url;
          s3key = up.s3key;
        }
      } catch (e) {
        // si falla descarga o s3, seguimos con url twilio
      }

      await pool.query(
        `UPDATE public.folios
         SET cotizacion_url=$2, cotizacion_s3key=COALESCE($3, cotizacion_s3key),
             estatus=CASE WHEN estatus='Generado' THEN 'Con cotización' ELSE estatus END
         WHERE folio_codigo=$1 OR numero_folio=$1`,
        [targetFolioCodigo, finalUrl, s3key]
      );

      await insertarHistorial({
        folio_codigo: targetFolioCodigo,
        numero_folio: targetFolioCodigo,
        estatus: 'Cotización adjunta',
        comentario: 'Se adjuntó PDF de cotización',
        actor_telefono: phone,
        actor_rol: dd.actor_rol || null,
      });

      // mantener sesión, pero ya no “esperar”
      if (dd.estado === 'ESPERANDO_COTIZACION') dd.estado = 'IDLE';

      res.set('Content-Type', 'text/xml');
      return res.send(twimlMessage(`✅ PDF guardado en el folio ${targetFolioCodigo}.\nUsa: VER PDF ${targetFolioCodigo}`));
    }

    // =========================
    // Iniciar “Crear folio”
    // =========================
    if (dd.estado === 'IDLE') {
      if (/^CREAR\s+FOLIO/i.test(body) || /^CREAR$/i.test(body) || /^FOLIO$/i.test(body)) {
        dd.estado = 'ESPERANDO_BENEFICIARIO';
        res.set('Content-Type', 'text/xml');
        return res.send(twimlMessage('Vamos a crear un folio.\n1) Indica BENEFICIARIO (nombre completo).'));
      }

      res.set('Content-Type', 'text/xml');
      return res.send(twimlMessage(
        'Comandos:\n- Crear folio\n- Estatus F-YYYYMM-###\n- Falta PDF\n- Ver PDF F-YYYYMM-###\n\nEscribe "Crear folio" para iniciar.'
      ));
    }

    // =========================
    // Flujo conversacional
    // =========================
    if (dd.estado === 'ESPERANDO_BENEFICIARIO') {
      dd.beneficiario = body;
      dd.estado = 'ESPERANDO_CONCEPTO';
      res.set('Content-Type', 'text/xml');
      return res.send(twimlMessage('2) Indica CONCEPTO (razón del pago).'));
    }

    if (dd.estado === 'ESPERANDO_CONCEPTO') {
      dd.concepto = body;
      dd.estado = 'ESPERANDO_IMPORTE';
      res.set('Content-Type', 'text/xml');
      return res.send(twimlMessage('3) Indica IMPORTE (MXN). Ej: 13500 o 13500.50'));
    }

    if (dd.estado === 'ESPERANDO_IMPORTE') {
      if (!isMoney(body)) {
        res.set('Content-Type', 'text/xml');
        return res.send(twimlMessage('Importe inválido. Ej: 13500 o 13500.50'));
      }
      dd.importe = parseMoney(body);
      dd.estado = 'ESPERANDO_CATEGORIA';

      const cats = CATEGORIAS.map((c, idx) => ({ key: String(idx + 1), label: c.nombre }));
      res.set('Content-Type', 'text/xml');
      return res.send(twimlMessage(renderMenu('4) Elige CATEGORÍA:', cats)));
    }

    if (dd.estado === 'ESPERANDO_CATEGORIA') {
      const n = parseInt(body, 10);
      if (!Number.isFinite(n) || n < 1 || n > CATEGORIAS.length) {
        const cats = CATEGORIAS.map((c, idx) => ({ key: String(idx + 1), label: c.nombre }));
        res.set('Content-Type', 'text/xml');
        return res.send(twimlMessage(renderMenu('Opción inválida. Elige CATEGORÍA:', cats)));
      }

      const cat = CATEGORIAS[n - 1];
      dd.categoria = cat.nombre;
      dd.categoria_clave = cat.clave;

      // Taller -> pide unidad
      if (dd.categoria_clave === 'TALLER') {
        dd.estado = 'ESPERANDO_UNIDAD';
        res.set('Content-Type', 'text/xml');
        return res.send(twimlMessage('Taller seleccionado. Indica Unidad válida (ej: AT-03 o C-03).'));
      }

      // DyO -> sin subcategoría
      if (dd.categoria_clave === 'DYO') {
        dd.subcategoria = null;
        dd.estado = 'CONFIRMAR_Y_CREAR';
      } else {
        dd.estado = 'ESPERANDO_SUBCATEGORIA';
      }

      // si requiere subcategoría
      if (dd.estado === 'ESPERANDO_SUBCATEGORIA') {
        const subs = (SUBCATS[dd.categoria_clave] || []).map((s, idx) => ({ key: String(idx + 1), label: s }));
        res.set('Content-Type', 'text/xml');
        return res.send(twimlMessage(renderMenu('5) Elige SUBCATEGORÍA:', subs)));
      }

      // confirmar (DYO)
      dd.estado = 'CONFIRMAR_Y_CREAR';
    }

    if (dd.estado === 'ESPERANDO_SUBCATEGORIA') {
      const subs = SUBCATS[dd.categoria_clave] || [];
      const n = parseInt(body, 10);
      if (!Number.isFinite(n) || n < 1 || n > subs.length) {
        const menu = subs.map((s, idx) => ({ key: String(idx + 1), label: s }));
        res.set('Content-Type', 'text/xml');
        return res.send(twimlMessage(renderMenu('Opción inválida. Elige SUBCATEGORÍA:', menu)));
      }
      dd.subcategoria = subs[n - 1];
      dd.estado = 'CONFIRMAR_Y_CREAR';
    }

    if (dd.estado === 'ESPERANDO_UNIDAD') {
      const unidad = normalizeUnidad(body);

      if (!unidad) {
        res.set('Content-Type', 'text/xml');
        return res.send(twimlMessage('Unidad inválida. Usa formato: AT-03 o C-03 (acepta AT 3 / AT-3 / C03).'));
      }

      dd.unidad = unidad;
      // Taller: subcategoría debe ir NULL
      dd.subcategoria = null;

      dd.estado = 'CONFIRMAR_Y_CREAR';
    }

    if (dd.estado === 'CONFIRMAR_Y_CREAR') {
      // Crear registro en DB
      const client = await pool.connect();
      try {
        const folioCodigo = await generarFolioCodigo(client);

        // Para evitar el error NULL, llenamos SIEMPRE folio_codigo y numero_folio
        // Por simplicidad: numero_folio = folio_codigo (puedes separarlos después)
        const numeroFolio = folioCodigo;

        // Inserta
        const ins = await client.query(
          `INSERT INTO public.folios
            (folio_codigo, numero_folio, beneficiario, concepto, importe, categoria, subcategoria, unidad, estatus, fecha_creacion, monto, descripcion, creado_por)
           VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,'Generado',CURRENT_TIMESTAMP,$5,$4,$9)
           RETURNING id`,
          [
            folioCodigo,
            numeroFolio,
            dd.beneficiario || null,
            dd.concepto || null,
            dd.importe || null,
            dd.categoria || null,
            dd.subcategoria || null,
            dd.unidad || null,
            phone,
          ]
        );

        const folioId = ins.rows[0].id;

        // historial
        await insertarHistorial({
          folio_id: folioId,
          folio_codigo: folioCodigo,
          numero_folio: numeroFolio,
          estatus: 'Generado',
          comentario: `Folio creado por WhatsApp`,
          actor_telefono: phone,
          actor_rol: dd.actor_rol || null,
          actor_id: dd.actor_id || null,
        });

        dd.folio_id = folioId;
        dd.folio_codigo = folioCodigo;
        dd.numero_folio = numeroFolio;

        // siguiente: pedir PDF
        dd.estado = 'ESPERANDO_COTIZACION';

        res.set('Content-Type', 'text/xml');
        return res.send(twimlMessage(
          `✅ Folio creado: ${folioCodigo}\n` +
          `Beneficiario: ${dd.beneficiario}\n` +
          `Concepto: ${dd.concepto}\n` +
          `Monto: $${dd.importe}\n` +
          `Categoría: ${dd.categoria}\n` +
          `Subcat: ${dd.subcategoria ?? 'N/A'}\n` +
          `Unidad: ${dd.unidad ?? 'N/A'}\n\n` +
          `📎 Falta adjuntar la cotización en PDF.\nEnvíame el PDF aquí mismo para guardarlo.`
        ));
      } finally {
        client.release();
      }
    }

    // Si llega aquí, algo raro
    res.set('Content-Type', 'text/xml');
    return res.send(twimlMessage('No entendí. Escribe "Crear folio" o "RESET".'));

  } catch (err) {
    console.error('Error /twilio:', err);
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twimlMessage('Error procesando solicitud. Intenta de nuevo en 1 minuto.'));
  }
});

// =====================
// Start
// =====================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`DB ${DATABASE_URL ? 'configurada' : 'NO configurada'}`);
  if (!TWILIO_AUTH_TOKEN) console.log('⚠️ Falta TWILIO_AUTH_TOKEN (si VALIDATE_TWILIO_SIGNATURE=true, fallará).');
  if (!TWILIO_ACCOUNT_SID || !TWILIO_WHATSAPP_FROM) console.log('⚠️ Twilio vars incompletas (no podrá notificar proactivo).');
  if (!AWS_S3_BUCKET) console.log('ℹ️ S3 no configurado (guardará URL de Twilio como cotización).');
});

