// server.js
// Bot de folios por WhatsApp (Twilio) + PostgreSQL (Render) + S3 (AWS)

const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const axios = require("axios");
const crypto = require("crypto");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// ========= ENV =========
const PORT = process.env.PORT || 10000;

const DATABASE_URL = process.env.DATABASE_URL;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET;

// ========= VALIDACIONES MINIMAS =========
function envOk() {
  const missing = [];
  if (!DATABASE_URL) missing.push("DATABASE_URL");
  // Twilio y AWS pueden faltar en modo prueba (el bot responde pero no sube pdf / notifica)
  return { ok: missing.length === 0, missing };
}

// ========= DB =========
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

// ========= S3 =========
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

// ========= APP =========
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (_req, res) => {
  const e = envOk();
  res.status(200).json({
    ok: true,
    service: "folio-whatsapp-bot",
    env_db_ok: e.ok,
    missing: e.missing,
    time: new Date().toISOString(),
  });
});

// ========= UTIL: TWIML =========
function xmlEscape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(message) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${xmlEscape(message)}</Message>
</Response>`;
}

function renderMenu(title, items) {
  // items: [{key:"1", label:"Gastos"}, ...]
  const lines = items.map((x) => `${x.key}) ${x.label}`).join("\n");
  return `${title}\n${lines}\n\nResponde con el número.`;
}

// ========= CAT / SUBCAT =========
const CATEGORIAS = [
  { key: "1", label: "Gastos", clave: "GASTOS" },
  { key: "2", label: "Inversiones", clave: "INVERSIONES" },
  { key: "3", label: "Derechos y obligaciones", clave: "DYO" },
  { key: "4", label: "Taller", clave: "TALLER" },
];

const SUB_GASTOS = [
  { key: "1", label: "Contractuales", clave: "CONTRACTUALES" },
  { key: "2", label: "Equipo planta", clave: "EQUIPO_PLANTA" },
  { key: "3", label: "Estaciones", clave: "ESTACIONES" },
  { key: "4", label: "Jurídicos", clave: "JURIDICOS" },
  { key: "5", label: "Liquidaciones laborales", clave: "LIQUIDACIONES_LABORALES" },
  { key: "6", label: "Pasivos meses anteriores", clave: "PASIVOS_MESES_ANTERIORES" },
  { key: "7", label: "Rentas", clave: "RENTAS" },
  { key: "8", label: "Trámites vehiculares", clave: "TRAMITES_VEHICULARES" },
  { key: "9", label: "Varios", clave: "VARIOS" },
];

// OJO: el usuario dijo “No hay quinta categoría en inversiones” => dejamos 4
const SUB_INVERSIONES = [
  { key: "1", label: "Equipo para la planta", clave: "EQUIPO_PARA_LA_PLANTA" },
  { key: "2", label: "Instalaciones a clientes", clave: "INSTALACIONES_A_CLIENTES" },
  { key: "3", label: "Publicidad", clave: "PUBLICIDAD" },
  { key: "4", label: "Tanques y cilindros", clave: "TANQUES_Y_CILINDROS" },
];

// ========= UNIDAD (AT / C) =========
// Acepta: AT-15, AT 15, AT15, C-3, C003, etc.
// Rango: 1..1000
function parseUnidad(inputRaw) {
  const raw = String(inputRaw || "").toUpperCase().trim();
  if (!raw) return null;

  // quitar espacios
  const s = raw.replace(/\s+/g, "");

  // AT-15 / AT15 / C-15 / C15
  const m = s.match(/^(AT|C)[-]?(\d{1,4})$/);
  if (!m) return null;

  const pref = m[1];
  const num = parseInt(m[2], 10);
  if (!Number.isFinite(num) || num < 1 || num > 1000) return null;

  // Normalizamos SIN ceros a la izquierda
  return `${pref}-${num}`;
}

// ========= SESIONES EN MEMORIA =========
// En producción, luego lo movemos a Redis/DB si quieres.
// key = whatsapp From
const sessions = new Map();

function getSession(from) {
  if (!sessions.has(from)) {
    sessions.set(from, {
      estado: "IDLE",
      draft: {},
      lastTouched: Date.now(),
    });
  }
  const s = sessions.get(from);
  s.lastTouched = Date.now();
  return s;
}

function resetSession(from) {
  sessions.set(from, { estado: "IDLE", draft: {}, lastTouched: Date.now() });
}

// ========= FOLIO: GENERADOR SECUENCIAL POR MES =========
// Usa tabla folio_counters (yyyymm, last_seq)
async function nextFolioNumero(client) {
  const now = new Date();
  const yyyymm =
    now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, "0"); // 202602

  await client.query("BEGIN");

  // lock row
  const r = await client.query(
    "SELECT last_seq FROM folio_counters WHERE yyyymm = $1 FOR UPDATE",
    [yyyymm]
  );

  let nextSeq = 1;

  if (r.rows.length === 0) {
    await client.query("INSERT INTO folio_counters (yyyymm, last_seq) VALUES ($1, $2)", [
      yyyymm,
      1,
    ]);
    nextSeq = 1;
  } else {
    nextSeq = Number(r.rows[0].last_seq) + 1;
    await client.query("UPDATE folio_counters SET last_seq = $2 WHERE yyyymm = $1", [
      yyyymm,
      nextSeq,
    ]);
  }

  await client.query("COMMIT");

  const seq3 = String(nextSeq).padStart(3, "0");
  return `F-${yyyymm}-${seq3}`;
}

// ========= DB HELPERS =========
async function createFolioInDb(d) {
  const client = await pool.connect();
  try {
    const numero_folio = await nextFolioNumero(client);
    const folio_codigo = numero_folio; // simple y seguro (NOT NULL + UNIQUE)

    // Insert en folios (tabla: public.folios)
    const insert = await client.query(
      `INSERT INTO public.folios
      (folio_codigo, numero_folio, beneficiario, concepto, importe, categoria, subcategoria, unidad, estatus, creado_por, descripcion, monto)
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id, folio_codigo, numero_folio`,
      [
        folio_codigo,
        numero_folio,
        d.beneficiario || null,
        d.concepto || null,
        d.importe != null ? d.importe : null,
        d.categoria || null,
        d.subcategoria || null,
        d.unidad || null,
        "Generado",
        d.creado_por || null,
        d.concepto || null,
        d.importe != null ? d.importe : null,
      ]
    );

    const folio_id = insert.rows[0].id;

    // Insert historial (si quieres llevar trazabilidad)
    await client.query(
      `INSERT INTO public.folio_historial
      (numero_folio, estatus, comentario, actor_telefono, actor_rol, folio_codigo, folio_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        numero_folio,
        "Generado",
        "Creación de folio",
        d.actor_telefono || null,
        d.actor_rol || null,
        folio_codigo,
        folio_id,
      ]
    );

    return { id: folio_id, folio_codigo, numero_folio };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

async function getFolioByNumero(numero) {
  const r = await pool.query(
    `SELECT id, folio_codigo, numero_folio, beneficiario, concepto, importe, categoria, subcategoria, unidad,
            estatus, creado_en, cotizacion_url, cotizacion_s3key
     FROM public.folios
     WHERE numero_folio = $1
     LIMIT 1`,
    [numero]
  );
  return r.rows[0] || null;
}

async function setCotizacionForFolio(folio_id, url, s3key) {
  await pool.query(
    `UPDATE public.folios
     SET cotizacion_url = $2, cotizacion_s3key = $3, estatus = $4
     WHERE id = $1`,
    [folio_id, url, s3key, "Con cotización"]
  );

  await pool.query(
    `INSERT INTO public.folio_historial
    (numero_folio, estatus, comentario, folio_codigo, folio_id)
    SELECT numero_folio, $2, $3, folio_codigo, id
    FROM public.folios WHERE id = $1`,
    [folio_id, "Con cotización", "Cotización PDF adjunta"]
  );
}

// ========= MEDIA (Twilio -> S3) =========
async function downloadTwilioMedia(mediaUrl) {
  // Twilio media requiere Basic Auth con AccountSid:AuthToken
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Faltan TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN para descargar media.");
  }

  const resp = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    auth: {
      username: TWILIO_ACCOUNT_SID,
      password: TWILIO_AUTH_TOKEN,
    },
    timeout: 15000,
  });

  const contentType = resp.headers["content-type"] || "application/octet-stream";
  return { bytes: Buffer.from(resp.data), contentType };
}

async function uploadToS3(buffer, contentType, key) {
  if (!s3 || !S3_BUCKET) throw new Error("S3 no está configurado (AWS_* y S3_BUCKET).");

  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3.send(cmd);

  // URL “simple”: si tu bucket no es público, luego generamos presigned url.
  // Por ahora guardamos el “s3://bucket/key” como referencia consistente.
  return `s3://${S3_BUCKET}/${key}`;
}

function isPdfContentType(ct = "") {
  const s = String(ct).toLowerCase();
  return s.includes("pdf") || s === "application/octet-stream";
}

// ========= PARSER COMANDOS =========
function normalizeText(t) {
  return String(t || "").trim();
}

function extractNumeroFolio(text) {
  const s = String(text || "").toUpperCase();
  const m = s.match(/F-\d{6}-\d{3}/);
  return m ? m[0] : null;
}

// ========= FLUJO CREAR FOLIO =========
function startCrearFolio(session, from) {
  session.estado = "ESPERANDO_CATEGORIA";
  session.draft = {
    actor_telefono: from,
    creado_por: from,
    actor_rol: null,
    categoria: null,
    subcategoria: null,
    unidad: null,
    beneficiario: null,
    concepto: null,
    importe: null,
  };
  return renderMenu("Elige Categoría:", CATEGORIAS);
}

function handleCategoria(session, body) {
  const opt = String(body || "").trim();
  const cat = CATEGORIAS.find((c) => c.key === opt);
  if (!cat) return renderMenu("Opción inválida. Elige Categoría:", CATEGORIAS);

  session.draft.categoria = cat.label;

  if (cat.clave === "TALLER") {
    session.estado = "ESPERANDO_UNIDAD";
    // Taller no tiene subcategoría
    session.draft.subcategoria = null;
    return "Taller seleccionado. Indica Unidad (AT-15 o C-15).";
  }

  if (cat.clave === "DYO") {
    // DyO sin subcategoría
    session.draft.subcategoria = null;
    session.estado = "ESPERANDO_BENEFICIARIO";
    return "Derechos y obligaciones seleccionado.\nIndica Beneficiario (a quién se le pagará).";
  }

  // Gastos / Inversiones
  session.estado = "ESPERANDO_SUBCATEGORIA";
  if (cat.clave === "GASTOS") return renderMenu("Elige Subcategoría (Gastos):", SUB_GASTOS);
  if (cat.clave === "INVERSIONES") return renderMenu("Elige Subcategoría (Inversiones):", SUB_INVERSIONES);

  return renderMenu("Elige Categoría:", CATEGORIAS);
}

function handleSubcategoria(session, body) {
  const opt = String(body || "").trim();
  const cat = session.draft.categoria;

  let list = null;
  if (cat === "Gastos") list = SUB_GASTOS;
  if (cat === "Inversiones") list = SUB_INVERSIONES;

  if (!list) {
    session.estado = "ESPERANDO_CATEGORIA";
    return renderMenu("No pude determinar categoría. Elige Categoría:", CATEGORIAS);
  }

  const sc = list.find((x) => x.key === opt);
  if (!sc) return renderMenu("Opción inválida. Elige Subcategoría:", list);

  session.draft.subcategoria = sc.label;
  session.estado = "ESPERANDO_BENEFICIARIO";
  return "Indica Beneficiario (a quién se le pagará).";
}

function handleUnidad(session, body) {
  const u = parseUnidad(body);
  if (!u) {
    return "Unidad inválida. Usa AT-15 o C-15 (número 1 a 1000).";
  }
  session.draft.unidad = u;
  session.estado = "ESPERANDO_BENEFICIARIO";
  return "Indica Beneficiario (a quién se le pagará).";
}

function handleBeneficiario(session, body) {
  const t = normalizeText(body);
  if (t.length < 3) return "Beneficiario muy corto. Escribe el nombre completo.";
  session.draft.beneficiario = t;
  session.estado = "ESPERANDO_CONCEPTO";
  return "Indica Concepto (razón del pago).";
}

function handleConcepto(session, body) {
  const t = normalizeText(body);
  if (t.length < 3) return "Concepto muy corto. Describe mejor el pago.";
  session.draft.concepto = t;
  session.estado = "ESPERANDO_IMPORTE";
  return "Indica Importe en pesos (ej: 12500.50).";
}

function parseImporte(body) {
  const raw = String(body || "").trim().replace(/,/g, "");
  const m = raw.match(/^\d+(\.\d{1,2})?$/);
  if (!m) return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.round(v * 100) / 100;
}

function handleImporte(session, body) {
  const v = parseImporte(body);
  if (v == null) return "Importe inválido. Ejemplos: 12500 o 12500.50";
  session.draft.importe = v;
  session.estado = "ESPERANDO_CONFIRMACION";

  const d = session.draft;
  const resumen =
    `Confirma folio:\n` +
    `Categoría: ${d.categoria}\n` +
    `Subcategoría: ${d.subcategoria || "(sin)"}\n` +
    `Unidad: ${d.unidad || "(no aplica)"}\n` +
    `Beneficiario: ${d.beneficiario}\n` +
    `Concepto: ${d.concepto}\n` +
    `Importe: $${d.importe}\n\n` +
    `Responde: SI para guardar / NO para cancelar.`;

  return resumen;
}

// ========= WEBHOOK WHATSAPP =========
app.post("/whatsapp", async (req, res) => {
  // SIEMPRE responder TwiML rápido para evitar 11200
  // Aun con errores, devolvemos un mensaje corto.
  try {
    const from = req.body.From || "";
    const body = (req.body.Body || "").trim();
    const numMedia = parseInt(req.body.NumMedia || "0", 10);

    if (!from) {
      res.set("Content-Type", "text/xml");
      return res.send(twiml("Falta el campo From."));
    }

    const session = getSession(from);

    // ====== COMANDOS GLOBALES ======
    const bodyLower = body.toLowerCase();

    if (bodyLower === "cancelar" || bodyLower === "reiniciar") {
      resetSession(from);
      res.set("Content-Type", "text/xml");
      return res.send(twiml("Listo. Sesión reiniciada.\nEscribe: Crear folio"));
    }

    // Estatus folio
    if (bodyLower.startsWith("estatus")) {
      const nf = extractNumeroFolio(body);
      if (!nf) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Escribe: estatus F-202602-001"));
      }

      const folio = await getFolioByNumero(nf);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${nf}.`));
      }

      const faltaPdf = !folio.cotizacion_url;
      const msg =
        `Folio ${folio.numero_folio}\n` +
        `Estatus: ${folio.estatus}\n` +
        `Categoría: ${folio.categoria || "-"}\n` +
        `Subcategoría: ${folio.subcategoria || "-"}\n` +
        `Unidad: ${folio.unidad || "-"}\n` +
        `Importe: $${folio.importe != null ? folio.importe : "-"}\n` +
        `Beneficiario: ${folio.beneficiario || "-"}\n` +
        `Concepto: ${folio.concepto || "-"}\n` +
        (faltaPdf
          ? `\n⚠️ Aún NO tiene cotización PDF.\nPara adjuntar: escribe "subir cotizacion ${folio.numero_folio}" y luego manda el PDF.`
          : `\n✅ Cotización: ${folio.cotizacion_url}`);

      res.set("Content-Type", "text/xml");
      return res.send(twiml(msg));
    }

    // Iniciar “subir cotizacion”
    if (bodyLower.startsWith("subir cotizacion")) {
      const nf = extractNumeroFolio(body);
      if (!nf) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Escribe: subir cotizacion F-202602-001"));
      }

      const folio = await getFolioByNumero(nf);
      if (!folio) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml(`No encontré el folio ${nf}.`));
      }

      session.estado = "ESPERANDO_COTIZACION_PDF";
      session.draft = { numero_folio: nf, folio_id: folio.id };

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(`Listo. Ahora manda el PDF de cotización para el folio ${nf}.`)
      );
    }

    // ====== SI LLEGA MEDIA (PDF) ======
    if (numMedia > 0) {
      // Si estamos esperando cotización
      if (session.estado === "ESPERANDO_COTIZACION_PDF") {
        const mediaUrl = req.body.MediaUrl0;
        const contentType = req.body.MediaContentType0 || "";

        if (!mediaUrl) {
          res.set("Content-Type", "text/xml");
          return res.send(twiml("No recibí MediaUrl0. Intenta reenviar el PDF."));
        }

        if (!isPdfContentType(contentType)) {
          res.set("Content-Type", "text/xml");
          return res.send(twiml("Por favor envía un PDF (cotización)."));
        }

        // Descargar de Twilio y subir a S3
        const { numero_folio, folio_id } = session.draft || {};
        if (!numero_folio || !folio_id) {
          res.set("Content-Type", "text/xml");
          return res.send(
            twiml("No tengo folio asociado. Escribe: subir cotizacion F-202602-001")
          );
        }

        try {
          const media = await downloadTwilioMedia(mediaUrl);

          // key S3
          const ext = "pdf";
          const rand = crypto.randomBytes(6).toString("hex");
          const key = `cotizaciones/${numero_folio}/${Date.now()}_${rand}.${ext}`;

          const url = await uploadToS3(media.bytes, media.contentType, key);

          await setCotizacionForFolio(folio_id, url, key);

          session.estado = "IDLE";
          session.draft = {};

          res.set("Content-Type", "text/xml");
          return res.send(
            twiml(
              `✅ Cotización guardada para ${numero_folio}.\nEstatus actualizado a "Con cotización".`
            )
          );
        } catch (err) {
          console.error("ERROR PDF:", err?.message || err);
          res.set("Content-Type", "text/xml");
          return res.send(
            twiml("Error guardando el PDF. Reintenta o revisa AWS/Twilio vars.")
          );
        }
      }

      // Si mandan PDF sin contexto
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          'Recibí un archivo, pero no sé a qué folio corresponde.\nEscribe: "subir cotizacion F-202602-001" y luego vuelve a mandar el PDF.'
        )
      );
    }

    // ====== CREAR FOLIO ======
    if (bodyLower.startsWith("crear folio")) {
      const msg = startCrearFolio(session, from);
      res.set("Content-Type", "text/xml");
      return res.send(twiml(msg));
    }

    // ====== FLUJO POR ESTADO ======
    let reply = null;

    if (session.estado === "ESPERANDO_CATEGORIA") {
      reply = handleCategoria(session, body);
    } else if (session.estado === "ESPERANDO_SUBCATEGORIA") {
      reply = handleSubcategoria(session, body);
    } else if (session.estado === "ESPERANDO_UNIDAD") {
      reply = handleUnidad(session, body);
    } else if (session.estado === "ESPERANDO_BENEFICIARIO") {
      reply = handleBeneficiario(session, body);
    } else if (session.estado === "ESPERANDO_CONCEPTO") {
      reply = handleConcepto(session, body);
    } else if (session.estado === "ESPERANDO_IMPORTE") {
      reply = handleImporte(session, body);
    } else if (session.estado === "ESPERANDO_CONFIRMACION") {
      const ans = bodyLower;
      if (ans === "si" || ans === "sí") {
        try {
          const created = await createFolioInDb(session.draft);
          session.estado = "IDLE";
          session.draft = {};

          reply =
            `✅ Folio creado: ${created.numero_folio}\n` +
            `Estatus: Generado\n\n` +
            `Siguiente paso: adjunta cotización PDF.\n` +
            `Escribe: subir cotizacion ${created.numero_folio}`;
        } catch (err) {
          console.error("ERROR crear folio:", err?.message || err);
          reply =
            "Error creando folio (DB). Revisa logs de Render y que DATABASE_URL esté bien.";
        }
      } else if (ans === "no") {
        resetSession(from);
        reply = "Cancelado. Escribe: Crear folio";
      } else {
        reply = "Responde SI para guardar / NO para cancelar.";
      }
    } else {
      // IDLE
      reply =
        "Hola. Comandos:\n" +
        "- Crear folio\n" +
        "- estatus F-202602-001\n" +
        "- subir cotizacion F-202602-001\n" +
        "- reiniciar";
    }

    res.set("Content-Type", "text/xml");
    return res.send(twiml(reply));
  } catch (err) {
    console.error("WEBHOOK ERROR:", err?.message || err);
    res.set("Content-Type", "text/xml");
    return res.send(twiml("Error procesando solicitud. Intenta de nuevo."));
  }
});

// ========= START =========
app.listen(PORT, async () => {
  try {
    // DB ping
    if (DATABASE_URL) {
      await pool.query("SELECT 1;");
      console.log("✅ BD CONECTADA");
    } else {
      console.log("⚠️ Sin DATABASE_URL (modo limitado).");
    }
  } catch (e) {
    console.log("❌ Error conectando a BD:", e?.message || e);
  }

  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
