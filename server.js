// server.js
// Bot WhatsApp (Twilio) + PostgreSQL (Render) + (opcional) OpenAI
// - Identifica PLANTA y ROL por teléfono (tabla usuarios)
// - Crea folio con consecutivo mensual (tabla folio_counters)
// - Guarda folio en tabla folios
// - Notifica por WhatsApp al siguiente rol en el flujo

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// =========================
// ENV
// =========================
// OJO: en tu Render la variable se ve como DATABASE_URL (en tu foto aparece DATABASE_URL),
// pero por si alguien puso DATABASE_URL, tomamos ambas.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_URL || "";

// Twilio (para mandar notificaciones al siguiente rol)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || ""; // ej: "whatsapp:+14155238886"

if (!DATABASE_URL) console.error("❌ Falta DATABASE_URL en variables de entorno.");
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
  console.warn("⚠️ Twilio vars incompletas. Notificaciones salientes NO funcionarán.");
}

// =========================
// DB
// =========================
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
  // Twilio WhatsApp From típicos:
  // "whatsapp:+521744..." o "whatsapp:+52744..." o con espacios
  let s = String(from || "").trim();
  s = s.replace(/^whatsapp:/i, "");     // quita prefijo
  s = s.replace(/\s+/g, "");           // quita espacios
  // Normaliza México: +521XXXXXXXXXX -> +52XXXXXXXXXX (para que haga match con tu DB)
  if (s.startsWith("+521")) s = "+52" + s.slice(4);
  return s;
}

function toTwilioWhatsapp(toPhoneE164) {
  // Convierte "+52..." -> "whatsapp:+52..."
  const tel = String(toPhoneE164 || "").trim().replace(/\s+/g, "");
  if (!tel) return "";
  return tel.toLowerCase().startsWith("whatsapp:") ? tel : `whatsapp:${tel}`;
}

function moneyToNumber(v) {
  const s = String(v || "").replace(/,/g, "").replace(/[^0-9.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// =========================
// 1) Esquema mínimo (auto-crea si falta)
// =========================
async function ensureSchema() {
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
      clave VARCHAR(50) UNIQUE NOT NULL,   -- GA, GG, ZP, CDMX
      nombre VARCHAR(100) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      telefono VARCHAR(30) UNIQUE NOT NULL, -- +52...
      nombre VARCHAR(120) NOT NULL,
      planta_id INT NULL REFERENCES plantas(id),
      rol_id INT NOT NULL REFERENCES roles(id),
      activo BOOLEAN DEFAULT TRUE,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

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
      planta VARCHAR(100),
      descripcion TEXT,
      monto NUMERIC(12,2),
      estatus VARCHAR(50),
      creado_por VARCHAR(100),
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

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
    INSERT INTO roles (clave, nombre) VALUES
      ('GA','Gerente Administrativo'),
      ('GG','Gerente General'),
      ('ZP','Director ZP'),
      ('CDMX','Contralor CDMX')
    ON CONFLICT (clave) DO NOTHING;
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
      u.activo,
      r.clave AS rol,
      r.nombre AS rol_nombre,
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
// 4) Guardar / Consultar folio (DB)
// =========================
async function crearFolioDB({ numero_folio, planta, descripcion, monto, estatus, creado_por }) {
  const sql = `
    INSERT INTO folios (numero_folio, planta, descripcion, monto, estatus, creado_por)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *;
  `;
  const params = [numero_folio, planta, descripcion, monto, estatus, creado_por];
  const r = await pool.query(sql, params);
  return r.rows[0];
}

async function obtenerFolioDB(numero_folio) {
  const r = await pool.query(
    `SELECT * FROM folios WHERE numero_folio = $1 ORDER BY id DESC LIMIT 1`,
    [numero_folio]
  );
  return r.rows[0] || null;
}

async function actualizarEstatusFolioDB(numero_folio, estatus) {
  const r = await pool.query(
    `UPDATE folios SET estatus=$2 WHERE numero_folio=$1 RETURNING *`,
    [numero_folio, estatus]
  );
  return r.rows[0] || null;
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
// 5) Notificaciones Twilio al siguiente rol
// =========================
async function sendWhatsAppMessage({ to, body }) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.warn("⚠️ Twilio no configurado. No se envió notificación.");
    return { ok: false, error: "Twilio vars missing" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const data = new URLSearchParams();
  data.append("From", TWILIO_WHATSAPP_NUMBER);    // "whatsapp:+1415..."
  data.append("To", toTwilioWhatsapp(to));        // "whatsapp:+52..."
  data.append("Body", body);

  const auth = {
    username: TWILIO_ACCOUNT_SID,
    password: TWILIO_AUTH_TOKEN
  };

  const r = await axios.post(url, data, { auth });
  return { ok: true, sid: r.data.sid };
}

// Define “siguiente rol” según el rol actual
function nextRoleFor(role) {
  const r = String(role || "").toUpperCase();
  if (r === "GA") return "GG";
  if (r === "GG") return "CDMX";
  if (r === "CDMX") return "ZP";
  return null; // ZP o desconocido -> fin
}

async function getRecipientsByRole({ roleClave, plantaClave }) {
  // Para GG/GA -> misma planta
  // Para CDMX/ZP -> corporativo (planta NULL)
  const role = String(roleClave || "").toUpperCase();

  let sql = `
    SELECT u.telefono, u.nombre, r.clave AS rol, p.clave AS planta_clave
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    LEFT JOIN plantas p ON p.id = u.planta_id
    WHERE u.activo=TRUE AND r.clave=$1
  `;
  const params = [role];

  if (role === "GA" || role === "GG") {
    sql += ` AND p.clave = $2`;
    params.push(plantaClave);
  } else {
    // Corporativo
    sql += ` AND u.planta_id IS NULL`;
  }

  const r = await pool.query(sql, params);
  return r.rows || [];
}

async function notifyNextRole({ actor, folio, textoExtra }) {
  const nextRole = nextRoleFor(actor.rol);
  if (!nextRole) return { ok: true, skipped: true, reason: "No next role" };

  const plantaClave = actor.planta_clave || null;
  const recipients = await getRecipientsByRole({ roleClave: nextRole, plantaClave });

  if (!recipients.length) {
    console.warn(`⚠️ No hay destinatarios para rol ${nextRole} (planta ${plantaClave || "CORP"})`);
    return { ok: false, error: "No recipients" };
  }

  const body =
    `📌 Nuevo movimiento de folio\n` +
    `Folio: ${folio.numero_folio}\n` +
    `Planta: ${folio.planta}\n` +
    `Estatus: ${folio.estatus}\n` +
    `Monto: ${folio.monto}\n` +
    `Descripción: ${folio.descripcion}\n` +
    `Creado por: ${folio.creado_por}\n` +
    (textoExtra ? `\n${textoExtra}\n` : "") +
    `\nPara ver: estatus ${folio.numero_folio}\n` +
    `Para aprobar: aprobar ${folio.numero_folio}\n` +
    `Para rechazar: rechazar ${folio.numero_folio} Motivo: ____`;

  const results = [];
  for (const u of recipients) {
    try {
      const sent = await sendWhatsAppMessage({ to: u.telefono, body });
      results.push({ telefono: u.telefono, ok: true, sid: sent.sid });
    } catch (e) {
      results.push({ telefono: u.telefono, ok: false, error: String(e?.message || e) });
    }
  }

  return { ok: true, nextRole, recipients: results };
}

// =========================
// 6) Captura guiada (RAM)
// =========================
const drafts = {}; // drafts[telefono] = { concepto, prioridad, beneficiario, importe, categoria, subcategoria, unidad }

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

    if (key.includes("benefici")) out.beneficiario = val;
    if (key.includes("import") || key.includes("costo")) out.importe = val;
    if (key.includes("categor")) out.categoria = val;
    if (key.includes("sub")) out.subcategoria = val;
    if (key.includes("unidad")) out.unidad = val;
    if (key.includes("concept")) out.concepto = val;
  }
  return out;
}

function missingFields(d) {
  const miss = [];
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

app.get("/folio/:numero", async (req, res) => {
  try {
    const folio = await obtenerFolioDB(req.params.numero);
    if (!folio) return res.status(404).json({ ok: false, error: "No existe" });
    res.json({ ok: true, folio });
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
  const from = normalizeFrom(fromRaw);
  const message = incomingMsg.toLowerCase();

  try {
    // 8.1 Identificar usuario/rol/planta por teléfono
    const actor = await getActorByPhone(fromRaw);
    if (!actor) {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          "Tu número no está registrado en el sistema.\n" +
          "Pide a IT que te dé de alta con: Planta + Rol + Nombre + Teléfono.\n" +
          "Ejemplo roles: GA, GG, ZP, CDMX.\n\n" +
          `Tu teléfono detectado: ${from}`
        )
      );
    }

    const plantaDetectada = actor.planta_clave || "CORPORATIVO";

    // 8.2 Comando: estatus F-YYYYMM-001
    if (message.startsWith("estatus")) {
      const num = incomingMsg.replace(/estatus/i, "").trim();
      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          folio
            ? `Folio: ${folio.numero_folio}\nPlanta: ${folio.planta}\nEstatus: ${folio.estatus}\nMonto: ${folio.monto}\nDescripción: ${folio.descripcion}\nFecha: ${folio.fecha_creacion}`
            : `No encontré el folio ${num}`
        )
      );
    }

    // 8.3 Comando: aprobar F-XXXX
    if (message.startsWith("aprobar")) {
      const num = incomingMsg.replace(/aprobar/i, "").trim();
      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      if (!folio) return res.send(twiml(`No encontré el folio ${num}`));

      const nuevoEstatus = `Aprobado ${actor.rol}`;
      const updated = await actualizarEstatusFolioDB(num, nuevoEstatus);

      await logHistorial({
        numero_folio: num,
        estatus: nuevoEstatus,
        comentario: `Aprobación por ${actor.usuario_nombre} (${actor.rol}).`,
        actor
      });

      // Notifica siguiente rol
      await notifyNextRole({
        actor,
        folio: updated,
        textoExtra: `✅ Aprobado por ${actor.usuario_nombre} (${actor.rol}).`
      });

      return res.send(
        twiml(
          `✅ Folio ${num} aprobado.\nEstatus: ${nuevoEstatus}\n\n` +
          `Se notificó al siguiente rol (si existe).`
        )
      );
    }

    // 8.4 Comando: rechazar F-XXXX Motivo: ...
    if (message.startsWith("rechazar")) {
      const rest = incomingMsg.replace(/rechazar/i, "").trim();
      const parts = rest.split(/\s+/);
      const num = parts.shift() || "";
      const motivo = rest.replace(num, "").trim() || "Sin motivo.";

      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      if (!folio) return res.send(twiml(`No encontré el folio ${num}`));

      const nuevoEstatus = `Rechazado ${actor.rol}`;
      const updated = await actualizarEstatusFolioDB(num, nuevoEstatus);

      await logHistorial({
        numero_folio: num,
        estatus: nuevoEstatus,
        comentario: `Rechazo por ${actor.usuario_nombre} (${actor.rol}). Motivo: ${motivo}`,
        actor
      });

      // Por defecto, notificamos al “siguiente rol” del flujo actual (puedes cambiarlo a “creador” si quieres)
      await notifyNextRole({
        actor,
        folio: updated,
        textoExtra: `⛔ Rechazado por ${actor.usuario_nombre} (${actor.rol}). Motivo: ${motivo}`
      });

      return res.send(
        twiml(
          `⛔ Folio ${num} rechazado.\nEstatus: ${nuevoEstatus}\nMotivo: ${motivo}\n\n` +
          `Se notificó (si corresponde).`
        )
      );
    }

    // 8.5 Crear folio (captura guiada)
    if (message.includes("crear folio")) {
      drafts[from] = drafts[from] || {};

      drafts[from].prioridad = message.includes("urgente") ? "Urgente no programado" : "Normal";

      const concepto = incomingMsg.replace(/crear folio/i, "").trim();
      if (concepto) drafts[from].concepto = concepto;

      Object.assign(drafts[from], parseKeyValueLines(incomingMsg));

      const miss = missingFields(drafts[from]);
      if (miss.length) {
        res.set("Content-Type", "text/xml");
        return res.send(
          twiml(
            `Ok. Para crear el folio me falta: ${miss.join(", ")}.\n` +
            `Respóndeme en líneas así:\n` +
            `Beneficiario: ____\n` +
            `Importe: ____\n` +
            `Categoría: Gastos / Inversiones / Derechos y Obligaciones / Taller\n` +
            `Subcategoría: ____\n` +
            (String(drafts[from].categoria || "").toLowerCase().includes("taller") ? `Unidad: AT-03 o C-03\n` : "") +
            `(Concepto y prioridad ya los tomé)\n` +
            `Planta detectada: ${plantaDetectada}\nRol: ${actor.rol}`
          )
        );
      }

      // ✅ Completo -> generar folio y guardar en DB
      const folioId = await buildMonthlyFolioIdDB();
      const d = drafts[from];
      const monto = moneyToNumber(d.importe);

      const guardado = await crearFolioDB({
        numero_folio: folioId,
        planta: plantaDetectada,
        descripcion: d.concepto,
        monto,
        estatus: "Generado",
        creado_por: `${actor.usuario_nombre} (${actor.rol})`
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: "Generado",
        comentario:
          `Creado desde WhatsApp. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. ` +
          `Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor
      });

      delete drafts[from];

      // ✅ NOTIFICACIÓN AL SIGUIENTE ROL
      await notifyNextRole({
        actor,
        folio: guardado,
        textoExtra: `🟡 Acción requerida: revisar y aprobar.`
      });

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Folio ${guardado.numero_folio} creado y guardado.\n\n` +
          `Planta: ${guardado.planta}\n` +
          `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
          `Concepto: ${d.concepto}\n` +
          `Beneficiario: ${d.beneficiario}\n` +
          `Monto: ${monto}\n` +
          `Categoría: ${d.categoria}\n` +
          `Subcategoría: ${d.subcategoria}\n` +
          (d.unidad ? `Unidad: ${d.unidad}\n` : "") +
          `Prioridad: ${d.prioridad}\n\n` +
          `📨 Se notificó al siguiente rol.\n` +
          `Para consultar: escribe "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // 8.6 Continuación de borrador
    if (drafts[from]) {
      Object.assign(drafts[from], parseKeyValueLines(incomingMsg));
      const miss = missingFields(drafts[from]);

      res.set("Content-Type", "text/xml");
      if (miss.length) {
        return res.send(
          twiml(
            `Me falta: ${miss.join(", ")}.\n` +
            `Respóndeme solo esos campos (ej: "Importe: 25000").\n` +
            `Planta detectada: ${plantaDetectada}`
          )
        );
      }

      const folioId = await buildMonthlyFolioIdDB();
      const d = drafts[from];
      const monto = moneyToNumber(d.importe);

      const guardado = await crearFolioDB({
        numero_folio: folioId,
        planta: plantaDetectada,
        descripcion: d.concepto,
        monto,
        estatus: "Generado",
        creado_por: `${actor.usuario_nombre} (${actor.rol})`
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: "Generado",
        comentario:
          `Creado desde borrador. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. ` +
          `Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor
      });

      delete drafts[from];

      // ✅ NOTIFICACIÓN AL SIGUIENTE ROL
      await notifyNextRole({
        actor,
        folio: guardado,
        textoExtra: `🟡 Acción requerida: revisar y aprobar.`
      });

      return res.send(
        twiml(
          `✅ Folio ${guardado.numero_folio} creado y guardado.\n\n` +
          `Planta: ${guardado.planta}\n` +
          `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
          `Concepto: ${d.concepto}\n` +
          `Beneficiario: ${d.beneficiario}\n` +
          `Monto: ${monto}\n` +
          `Categoría: ${d.categoria}\n` +
          `Subcategoría: ${d.subcategoria}\n` +
          (d.unidad ? `Unidad: ${d.unidad}\n` : "") +
          `Prioridad: ${d.prioridad || "Normal"}\n\n` +
          `📨 Se notificó al siguiente rol.\n` +
          `Para consultar: escribe "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // 8.7 Fallback conversacional
    if (!OPENAI_API_KEY) {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          "Comandos disponibles:\n" +
          "- crear folio <concepto>\n" +
          "- estatus <F-YYYYMM-XXX>\n" +
          "- aprobar <F-YYYYMM-XXX>\n" +
          "- rechazar <F-YYYYMM-XXX> Motivo: ...\n"
        )
      );
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente corporativo para gestión de folios. " +
              "Si piden estatus, sugiere: 'estatus F-YYYYMM-XXX'. " +
              "Responde breve, claro y profesional."
          },
          { role: "user", content: incomingMsg }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data.choices?.[0]?.message?.content || "Ok.";
    res.set("Content-Type", "text/xml");
    return res.send(twiml(reply));
  } catch (error) {
    console.error("❌ Error webhook:", error?.response?.data || error?.message || error);
    res.set("Content-Type", "text/xml");
    return res.send(twiml("Error procesando solicitud. Intenta de nuevo en 1 minuto."));
  }
});

// =========================
// 9) Startup
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

