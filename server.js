/**
 * server.js - Folio WhatsApp Bot (Twilio) + PostgreSQL (Render)
 * Enfoque: creación y consulta de folios + adjunto PDF cotización + historial
 *
 * Requiere variables ENV:
 * - DATABASE_URL
 * - TWILIO_ACCOUNT_SID (opcional pero recomendado si vas a bajar MediaUrl)
 * - TWILIO_AUTH_TOKEN   (opcional pero recomendado si vas a bajar MediaUrl)
 * - AWS_ACCESS_KEY_ID (opcional)
 * - AWS_SECRET_ACCESS_KEY (opcional)
 * - AWS_REGION (opcional)
 * - S3_BUCKET (opcional)
 */

"use strict";

const express = require("express");
const { Pool } = require("pg");
const { twiml } = require("twilio");
const crypto = require("crypto");

const app = express();

// Twilio manda x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// -------- DB --------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("render.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

// -------- Helpers texto / menús --------
function normText(s = "") {
  return String(s).trim();
}

function upper(s = "") {
  return normText(s).toUpperCase();
}

function onlyDigits(s = "") {
  return String(s).replace(/\D+/g, "");
}

function renderMenu(title, options) {
  // options: [{key:'TALLER', label:'Taller'}, ...]
  const lines = options.map((o, i) => `${i + 1}) ${o.label}`).join("\n");
  return `${title}\n${lines}\n\nResponde con el número.`;
}

function parseMenuChoice(body, options) {
  const t = normText(body);
  const n = parseInt(t, 10);
  if (!Number.isFinite(n)) return null;
  const idx = n - 1;
  if (idx < 0 || idx >= options.length) return null;
  return options[idx];
}

// -------- Validación / Normalización de Unidad (AT-## o C-##) --------
function normalizeUnidad(inputRaw) {
  let s = upper(inputRaw);

  // Permitir "AT 15", "AT15", "AT-15", "C 3", etc.
  s = s.replace(/\s+/g, ""); // quita espacios

  // Si viene "AT-15" ya ok; si viene "AT15" insertar guion
  const m1 = s.match(/^(AT|C)-?(\d{1,3})$/);
  if (!m1) return null;

  const pref = m1[1];
  let num = parseInt(m1[2], 10);
  if (!Number.isFinite(num) || num <= 0 || num > 999) return null;

  // Formato 2 dígitos si es <=99, si es 3 dígitos lo dejamos (por si algún día lo ocupas)
  const numStr = num <= 99 ? String(num).padStart(2, "0") : String(num);
  return `${pref}-${numStr}`;
}

function isValidUnidad(inputRaw) {
  return normalizeUnidad(inputRaw) !== null;
}

// -------- Folio consecutivo (por mes) --------
// Usa public.folio_counters (yyyymm, last_seq) [oai_citation:7‡folio_counters.txt](sediment://file_00000000982c71f8b8f82b0f52e717fb)
async function nextFolioSequence(client, yyyymm) {
  // UPSERT con RETURNING para obtener nuevo last_seq
  // Si no existe -> crea con 1
  const q = `
    INSERT INTO public.folio_counters(yyyymm, last_seq)
    VALUES ($1, 1)
    ON CONFLICT (yyyymm)
    DO UPDATE SET last_seq = public.folio_counters.last_seq + 1
    RETURNING last_seq;
  `;
  const r = await client.query(q, [yyyymm]);
  return r.rows[0].last_seq;
}

function yyyymmNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

function buildNumeroFolio(yyyymm, seq) {
  // Ej: F-202602-001
  const seqStr = String(seq).padStart(3, "0");
  return `F-${yyyymm}-${seqStr}`;
}

function buildFolioCodigo(yyyymm, seq) {
  // folio_codigo debe ser NOT NULL y UNIQUE [oai_citation:8‡folios.txt](sediment://file_00000000b11c71f88e9535a8bad76d2d)
  // Lo hacemos estable y corto:
  const seqStr = String(seq).padStart(3, "0");
  return `FC-${yyyymm}-${seqStr}`;
}

// -------- Sesiones en memoria (MVP) --------
// OJO: si Render escala a >1 instancia, esto se pierde. Para robustez: tabla sesiones.
const sessions = new Map();
// sessions.get(from) = { estado, data:{...}, lastNumeroFolio? }

const ESTADOS = {
  IDLE: "IDLE",
  ESPERANDO_BENEFICIARIO: "ESPERANDO_BENEFICIARIO",
  ESPERANDO_CONCEPTO: "ESPERANDO_CONCEPTO",
  ESPERANDO_IMPORTE: "ESPERANDO_IMPORTE",
  ESPERANDO_CATEGORIA: "ESPERANDO_CATEGORIA",
  ESPERANDO_SUBCATEGORIA: "ESPERANDO_SUBCATEGORIA",
  ESPERANDO_UNIDAD: "ESPERANDO_UNIDAD",
  CONFIRMAR: "CONFIRMAR",
  ESPERANDO_PDF: "ESPERANDO_PDF",
};

// Catálogos (de tu documento) [oai_citation:9‡Llenado del registro de folio.txt](sediment://file_00000000ce6871f599e6729138fe1af2)
const CATEGORIAS = [
  { key: "GASTOS", label: "Gastos" },
  { key: "INVERSIONES", label: "Inversiones" },
  { key: "DYO", label: "Derechos y Obligaciones" },
  { key: "TALLER", label: "Taller" },
];

const SUB_GASTOS = [
  { key: "CONTRACTUALES", label: "Contractuales" },
  { key: "EQUIPO_PLANTA", label: "Equipo planta" },
  { key: "ESTACIONES", label: "Estaciones" },
  { key: "JURIDICOS", label: "Jurídicos" },
  { key: "LIQ_LABORALES", label: "Liquidaciones laborales" },
  { key: "PASIVOS_ANT", label: "Pasivos meses anteriores" },
  { key: "RENTAS", label: "Rentas" },
  { key: "TRAMITES_VEH", label: "Trámites vehiculares" },
  { key: "VARIOS", label: "Varios" },
];

const SUB_INVERSIONES = [
  { key: "EQUIPO_PLANTA", label: "Equipo para la planta" },
  { key: "INST_CLIENTES", label: "Instalaciones a clientes" },
  { key: "PUBLICIDAD", label: "Publicidad" },
  { key: "TANQUES_CIL", label: "Tanques y cilindros" },
  // Nota: tú dijiste “No hay quinta categoría en inversiones”.
  // Tu documento menciona 5 pero lista 4; respetamos lo que confirmaste: solo 4.
];

// --------- S3 (opcional) ----------
function s3Enabled() {
  return (
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.S3_BUCKET
  );
}

async function uploadPdfToS3(buffer, key, contentType = "application/pdf") {
  if (!s3Enabled()) return null;

  // Import dinámico para evitar MODULE_NOT_FOUND si no está instalado
  let S3Client, PutObjectCommand;
  try {
    ({ S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3"));
  } catch (e) {
    console.error("Falta @aws-sdk/client-s3. Instálalo o desactiva S3.", e);
    return null;
  }

  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // URL “directa” (si el bucket es privado, luego harás signed URLs)
  return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(
    key
  )}`;
}

// --------- Descargar media de Twilio (opcional) ----------
async function downloadTwilioMedia(url) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const resp = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!resp.ok) {
    console.error("No pude bajar media Twilio:", resp.status, await resp.text());
    return null;
  }
  const arr = await resp.arrayBuffer();
  return Buffer.from(arr);
}

// -------- Historial / Comentarios --------
async function addHistorial(client, { folioId, numeroFolio, folioCodigo, estatus, comentario, actorTelefono, actorRol, actorId }) {
  const q = `
    INSERT INTO public.folio_historial
      (folio_id, numero_folio, folio_codigo, estatus, comentario, actor_telefono, actor_rol, actor_id)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8);
  `;
  await client.query(q, [
    folioId || null,
    numeroFolio || null,
    folioCodigo || null,
    estatus,
    comentario || null,
    actorTelefono || null,
    actorRol || null,
    actorId || null,
  ]);
}

// -------- Creación de folio --------
async function createFolioInDb(data, actorTelefono) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const yyyymm = yyyymmNow();
    const seq = await nextFolioSequence(client, yyyymm);
    const numero_folio = buildNumeroFolio(yyyymm, seq);
    const folio_codigo = buildFolioCodigo(yyyymm, seq);

    // Insert base en public.folios [oai_citation:10‡folios.txt](sediment://file_00000000b11c71f88e9535a8bad76d2d)
    const q = `
      INSERT INTO public.folios
        (folio_codigo, numero_folio, beneficiario, concepto, importe, categoria, subcategoria, unidad, prioridad, estatus,
         planta_id, creado_por_id, planta, creado_por, descripcion, monto)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Generado',
         $10,$11,$12,$13,$14,$15)
      RETURNING id;
    `;

    const values = [
      folio_codigo,
      numero_folio,
      data.beneficiario || null,
      data.concepto || null,
      data.importe ?? null,
      data.categoria || null,
      data.subcategoria || null,
      data.unidad || null,
      data.prioridad || null,

      data.planta_id || null,
      data.creado_por_id || null,
      data.planta || null,
      data.creado_por || null,

      // duplicamos a descripcion/monto por compatibilidad con tu tabla
      data.concepto || null,
      data.importe ?? null,
    ];

    const r = await client.query(q, values);
    const folioId = r.rows[0].id;

    await addHistorial(client, {
      folioId,
      numeroFolio: numero_folio,
      folioCodigo: folio_codigo,
      estatus: "Generado",
      comentario: "Registro creado por WhatsApp",
      actorTelefono,
      actorRol: data.actor_rol || "DESCONOCIDO",
      actorId: data.creado_por_id || null,
    });

    await client.query("COMMIT");
    return { folioId, numero_folio, folio_codigo };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// -------- Adjuntar PDF a folio --------
async function attachPdfToFolio({ numeroFolio, folioCodigo, mediaUrl, contentType, actorTelefono }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) ubicar folio
    const fr = await client.query(
      `SELECT id, numero_folio, folio_codigo FROM public.folios WHERE numero_folio=$1 OR folio_codigo=$2 LIMIT 1;`,
      [numeroFolio || null, folioCodigo || null]
    );
    if (fr.rowCount === 0) {
      await client.query("ROLLBACK");
      return { ok: false, msg: "No encontré el folio. Pásame el número de folio (ej: F-202602-001)." };
    }

    const folio = fr.rows[0];

    // 2) descargar media (si tenemos creds) y subir a S3 (si aplica)
    let finalUrl = mediaUrl;
    let s3key = null;

    const buf = await downloadTwilioMedia(mediaUrl);
    if (buf && s3Enabled()) {
      s3key = `cotizaciones/${folio.numero_folio}/${Date.now()}-${crypto.randomUUID()}.pdf`;
      const s3url = await uploadPdfToS3(buf, s3key, contentType || "application/pdf");
      if (s3url) finalUrl = s3url;
    }

    // 3) guardar
    await client.query(
      `UPDATE public.folios
       SET cotizacion_url=$1, cotizacion_s3key=$2, estatus=CASE WHEN estatus='Generado' THEN 'ConCotizacion' ELSE estatus END
       WHERE id=$3;`,
      [finalUrl, s3key, folio.id]
    );

    await addHistorial(client, {
      folioId: folio.id,
      numeroFolio: folio.numero_folio,
      folioCodigo: folio.folio_codigo,
      estatus: "CotizacionAdjunta",
      comentario: "Se adjuntó cotización PDF",
      actorTelefono,
      actorRol: "WHATSAPP",
      actorId: null,
    });

    await client.query("COMMIT");

    return {
      ok: true,
      msg: `✅ Cotización guardada para ${folio.numero_folio}.`,
      url: finalUrl,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// -------- Consultas de gasto por unidad + rango (simple) --------
function parseDateDMYorYMD(s) {
  const t = normText(s);
  // YYYY-MM-DD
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  // DD/MM/YYYY
  m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`);
  return null;
}

async function queryGastoUnidad({ unidadRaw, d1, d2 }) {
  const unidad = normalizeUnidad(unidadRaw);
  if (!unidad) return { ok: false, msg: "Unidad inválida. Usa AT-03 o C-03 (también acepto AT 3 / AT3 / AT-03)." };

  const start = parseDateDMYorYMD(d1);
  const end = parseDateDMYorYMD(d2);
  if (!start || !end) return { ok: false, msg: "Fechas inválidas. Ejemplo: 2026-02-01 a 2026-03-31 (o 01/02/2026 a 31/03/2026)." };

  // end inclusive -> le sumamos 1 día y usamos < endPlus
  const endPlus = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  const q = `
    SELECT
      unidad,
      COUNT(*) AS folios,
      COALESCE(SUM(COALESCE(monto, importe)),0) AS total
    FROM public.folios
    WHERE unidad = $1
      AND fecha_creacion >= $2
      AND fecha_creacion <  $3
    GROUP BY unidad;
  `;

  const r = await pool.query(q, [unidad, start.toISOString(), endPlus.toISOString()]);
  if (r.rowCount === 0) {
    return { ok: true, msg: `No encontré gastos para ${unidad} en ese rango.` };
  }

  const row = r.rows[0];
  const total = Number(row.total).toFixed(2);
  return { ok: true, msg: `Total ${unidad} en el rango: $${total} MXN (folios: ${row.folios}).` };
}

// -------- Router principal Twilio --------
app.post("/whatsapp", async (req, res) => {
  const from = req.body.From || "unknown";
  const body = normText(req.body.Body || "");
  const numMedia = parseInt(req.body.NumMedia || "0", 10);

  const response = new twiml.MessagingResponse();

  // obtener o crear sesión
  if (!sessions.has(from)) {
    sessions.set(from, { estado: ESTADOS.IDLE, data: {} });
  }
  const s = sessions.get(from);

  try {
    // 1) Si llega PDF y estamos esperando cotización o el usuario manda “adjuntar”
    if (numMedia > 0) {
      const mediaUrl = req.body.MediaUrl0;
      const mediaType = req.body.MediaContentType0;

      if (mediaType && mediaType.includes("pdf")) {
        const numeroFolio = s.lastNumeroFolio || null;
        const folioCodigo = s.lastFolioCodigo || null;

        // si no sabemos folio, pedirlo
        if (!numeroFolio && !folioCodigo) {
          response.message("📎 Recibí un PDF. Dime a qué folio lo adjunto (ej: F-202602-001).");
          s.estado = ESTADOS.ESPERANDO_PDF;
          res.type("text/xml").send(response.toString());
          return;
        }

        const rr = await attachPdfToFolio({
          numeroFolio,
          folioCodigo,
          mediaUrl,
          contentType: mediaType,
          actorTelefono: from,
        });

        response.message(rr.msg + (rr.url ? `\n\nURL: ${rr.url}` : ""));
        s.estado = ESTADOS.IDLE;
        res.type("text/xml").send(response.toString());
        return;
      } else {
        response.message("Recibí un archivo, pero por ahora solo acepto PDF de cotización.");
        res.type("text/xml").send(response.toString());
        return;
      }
    }

    // 2) Comandos rápidos
    const low = body.toLowerCase();
    if (low === "hola" || low === "menu" || low === "ayuda") {
      response.message(
        "✅ Bot de Folios\n\n" +
          "Comandos:\n" +
          "- Crear folio\n" +
          "- Consultar unidad AT-03 2026-01-01 2026-02-29\n" +
          "- Adjuntar (manda PDF después de crear el folio)\n" +
          "- Cancelar (en desarrollo)\n"
      );
      res.type("text/xml").send(response.toString());
      return;
    }

    // 3) Consulta abierta por unidad + rango
    // Ej: "Consultar unidad AT-11 2025-12-01 2026-01-31"
    if (low.startsWith("consultar unidad")) {
      const parts = body.split(/\s+/);
      // consultar unidad <unidad> <d1> <d2>
      const unidadRaw = parts[2];
      const d1 = parts[3];
      const d2 = parts[4];
      const rr = await queryGastoUnidad({ unidadRaw, d1, d2 });
      response.message(rr.msg);
      res.type("text/xml").send(response.toString());
      return;
    }

    // 4) Iniciar creación
    if (low.startsWith("crear folio")) {
      s.data = {
        // aquí luego puedes setear planta/usuario por el número telefónico (tabla usuarios)
        actor_rol: "WHATSAPP",
      };
      s.estado = ESTADOS.ESPERANDO_BENEFICIARIO;
      response.message("Perfecto. Indica BENEFICIARIO (a quién se le depositará).");
      res.type("text/xml").send(response.toString());
      return;
    }

    // 5) Flujo por estados
    if (s.estado === ESTADOS.ESPERANDO_BENEFICIARIO) {
      s.data.beneficiario = body;
      s.estado = ESTADOS.ESPERANDO_CONCEPTO;
      response.message("Indica CONCEPTO (razón del pago).");
      res.type("text/xml").send(response.toString());
      return;
    }

    if (s.estado === ESTADOS.ESPERANDO_CONCEPTO) {
      s.data.concepto = body;
      s.estado = ESTADOS.ESPERANDO_IMPORTE;
      response.message("Indica IMPORTE en pesos (ej: 12500.50).");
      res.type("text/xml").send(response.toString());
      return;
    }

    if (s.estado === ESTADOS.ESPERANDO_IMPORTE) {
      const num = Number(String(body).replace(/,/g, ""));
      if (!Number.isFinite(num) || num <= 0) {
        response.message("Importe inválido. Ejemplo: 12500.50");
        res.type("text/xml").send(response.toString());
        return;
      }
      s.data.importe = Math.round(num * 100) / 100;
      s.estado = ESTADOS.ESPERANDO_CATEGORIA;
      response.message(renderMenu("Elige CATEGORÍA:", CATEGORIAS));
      res.type("text/xml").send(response.toString());
      return;
    }

    if (s.estado === ESTADOS.ESPERANDO_CATEGORIA) {
      const choice = parseMenuChoice(body, CATEGORIAS);
      if (!choice) {
        response.message("Opción inválida.\n\n" + renderMenu("Elige CATEGORÍA:", CATEGORIAS));
        res.type("text/xml").send(response.toString());
        return;
      }
      s.data.categoria = choice.key;

      // Reglas por categoría (tu definición) [oai_citation:11‡Llenado del registro de folio.txt](sediment://file_00000000ce6871f599e6729138fe1af2)
      if (choice.key === "TALLER") {
        s.data.subcategoria = null; // Taller no lleva subcat
        s.estado = ESTADOS.ESPERANDO_UNIDAD;
        response.message("Taller seleccionado. Indica Unidad válida (AT-03 o C-03). También acepto AT 3 / AT3 / AT-03.");
        res.type("text/xml").send(response.toString());
        return;
      }

      if (choice.key === "DYO") {
        s.data.subcategoria = null;
        s.estado = ESTADOS.CONFIRMAR;
      } else if (choice.key === "GASTOS") {
        s.estado = ESTADOS.ESPERANDO_SUBCATEGORIA;
        response.message(renderMenu("Elige SUBCATEGORÍA (Gastos):", SUB_GASTOS));
        res.type("text/xml").send(response.toString());
        return;
      } else if (choice.key === "INVERSIONES") {
        s.estado = ESTADOS.ESPERANDO_SUBCATEGORIA;
        response.message(renderMenu("Elige SUBCATEGORÍA (Inversiones):", SUB_INVERSIONES));
        res.type("text/xml").send(response.toString());
        return;
      }

      // Si cayó a CONFIRMAR
      const resumen =
        `Resumen:\n` +
        `Beneficiario: ${s.data.beneficiario}\n` +
        `Concepto: ${s.data.concepto}\n` +
        `Importe: $${Number(s.data.importe).toFixed(2)}\n` +
        `Categoría: ${s.data.categoria}\n` +
        `Subcategoría: ${s.data.subcategoria || "-"}\n` +
        `Unidad: ${s.data.unidad || "-"}\n\n` +
        `Responde: 1) Confirmar  2) Cancelar`;
      response.message(resumen);
      res.type("text/xml").send(response.toString());
      return;
    }

    if (s.estado === ESTADOS.ESPERANDO_SUBCATEGORIA) {
      const cat = s.data.categoria;

      const opts = cat === "GASTOS" ? SUB_GASTOS : SUB_INVERSIONES;
      const choice = parseMenuChoice(body, opts);
      if (!choice) {
        response.message("Opción inválida.\n\n" + renderMenu("Elige SUBCATEGORÍA:", opts));
        res.type("text/xml").send(response.toString());
        return;
      }
      s.data.subcategoria = choice.key;
      s.estado = ESTADOS.CONFIRMAR;

      const resumen =
        `Resumen:\n` +
        `Beneficiario: ${s.data.beneficiario}\n` +
        `Concepto: ${s.data.concepto}\n` +
        `Importe: $${Number(s.data.importe).toFixed(2)}\n` +
        `Categoría: ${s.data.categoria}\n` +
        `Subcategoría: ${s.data.subcategoria || "-"}\n\n` +
        `Responde: 1) Confirmar  2) Cancelar`;
      response.message(resumen);
      res.type("text/xml").send(response.toString());
      return;
    }

    if (s.estado === ESTADOS.ESPERANDO_UNIDAD) {
      const unidad = normalizeUnidad(body);
      if (!unidad) {
        response.message("Unidad inválida. Usa AT-03 o C-03 (también acepto AT 3 / AT3 / AT-03).");
        res.type("text/xml").send(response.toString());
        return;
      }
      s.data.unidad = unidad;
      s.estado = ESTADOS.CONFIRMAR;

      const resumen =
        `Resumen:\n` +
        `Beneficiario: ${s.data.beneficiario}\n` +
        `Concepto: ${s.data.concepto}\n` +
        `Importe: $${Number(s.data.importe).toFixed(2)}\n` +
        `Categoría: ${s.data.categoria}\n` +
        `Unidad: ${s.data.unidad}\n\n` +
        `Responde: 1) Confirmar  2) Cancelar`;
      response.message(resumen);
      res.type("text/xml").send(response.toString());
      return;
    }

    if (s.estado === ESTADOS.CONFIRMAR) {
      const n = parseInt(body, 10);
      if (n === 2) {
        s.estado = ESTADOS.IDLE;
        s.data = {};
        response.message("Cancelado. Si quieres iniciar otra vez escribe: Crear folio");
        res.type("text/xml").send(response.toString());
        return;
      }
      if (n !== 1) {
        response.message("Responde 1) Confirmar  2) Cancelar");
        res.type("text/xml").send(response.toString());
        return;
      }

      // Crear en DB
      const created = await createFolioInDb(s.data, from);
      s.lastNumeroFolio = created.numero_folio;
      s.lastFolioCodigo = created.folio_codigo;
      s.estado = ESTADOS.IDLE;

      response.message(
        `✅ Folio creado\n` +
          `Número: ${created.numero_folio}\n` +
          `Código: ${created.folio_codigo}\n\n` +
          `📎 Falta adjuntar la cotización PDF.\nEnvíala aquí en este chat y la guardo en el folio.`
      );
      res.type("text/xml").send(response.toString());
      return;
    }

    if (s.estado === ESTADOS.ESPERANDO_PDF) {
      // El usuario debió contestar con F-YYYYMM-###
      const token = body.split(/\s+/)[0];
      if (!token.startsWith("F-") && !token.startsWith("FC-")) {
        response.message("Pásame el número de folio (ej: F-202602-001).");
        res.type("text/xml").send(response.toString());
        return;
      }

      if (token.startsWith("F-")) s.lastNumeroFolio = token;
      if (token.startsWith("FC-")) s.lastFolioCodigo = token;

      s.estado = ESTADOS.IDLE;
      response.message("Listo. Ahora envíame el PDF y lo adjunto.");
      res.type("text/xml").send(response.toString());
      return;
    }

    // Default: si no entiende
    response.message("No entendí. Escribe: Ayuda  (o)  Crear folio  (o)  Consultar unidad AT-03 2026-02-01 2026-03-31");
    res.type("text/xml").send(response.toString());
  } catch (err) {
    console.error("ERROR webhook:", err);
    response.message("Error procesando solicitud. Intenta de nuevo en 1 minuto.");
    res.type("text/xml").send(response.toString());
  }
});

// Healthcheck (Render)
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1;");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor corriendo en puerto", PORT));

