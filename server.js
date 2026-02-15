// server.js
// Bot WhatsApp (Twilio) + PostgreSQL (Render) + (opcional) OpenAI
// - Identifica PLANTA y ROL por teléfono (tabla usuarios)
// - Crea folio con consecutivo mensual (tabla folio_counters)
// - Guarda folio en tabla folios
// - Notifica al siguiente rol por WhatsApp (Twilio REST API)
//   Flujo sugerido:
//     GA (planta) -> GG (misma planta)
//     GG (planta) -> ZP (corporativo)
//     ZP -> CDMX
//     CDMX -> (fin / no siguiente)

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { Pool } = require("pg");

let twilioClient = null;
try {
  const twilio = require("twilio");
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
} catch (e) {
  // Si no está instalado "twilio", el bot seguirá respondiendo al webhook,
  // pero NO podrá notificar al siguiente rol.
  twilioClient = null;
}

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Soporta ambos por si en Render lo guardaste como DATABASE_URL o DATABASE_URL
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.DATABASE_URL || // (extra safety)
  "";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Twilio WhatsApp sender (tu número sandbox o número aprobado)
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || ""; // ej: "whatsapp:+14155238886"

if (!DATABASE_URL) console.error("❌ Falta DATABASE_URL (o DATABASE_URL) en Render.");
if (!TWILIO_WHATSAPP_NUMBER) console.error("❌ Falta TWILIO_WHATSAPP_NUMBER en Render.");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
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
  // "whatsapp:+521..." o "whatsapp:+52..."
  return String(from || "").replace(/^whatsapp:/i, "").trim();
}

function toWhatsApp(toE164) {
  // convierte "+52..." => "whatsapp:+52..."
  const clean = String(toE164 || "").trim();
  if (!clean) return "";
  return clean.toLowerCase().startsWith("whatsapp:") ? clean : `whatsapp:${clean}`;
}

function moneyToNumber(v) {
  // "$ 12,345.67" -> 12345.67
  const s = String(v || "").replace(/,/g, "").replace(/[^0-9.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// =========================
// 1) Schema (auto-crea)
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
      clave VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(100) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      telefono VARCHAR(30) UNIQUE NOT NULL, -- "+52..."
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
      creado_por VARCHAR(150),
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Extra (opcional): guardar más datos sin romper lo actual
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS beneficiario VARCHAR(150);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS categoria VARCHAR(80);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(120);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS unidad VARCHAR(50);`);
  await pool.query(`ALTER TABLE folios ADD COLUMN IF NOT EXISTS prioridad VARCHAR(50);`);

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
// 2) Actor por teléfono
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
// 4) Folios DB
// =========================
async function crearFolioDB({
  numero_folio,
  planta,
  descripcion,
  monto,
  estatus,
  creado_por,
  beneficiario,
  categoria,
  subcategoria,
  unidad,
  prioridad,
}) {
  const sql = `
    INSERT INTO folios
      (numero_folio, planta, descripcion, monto, estatus, creado_por, beneficiario, categoria, subcategoria, unidad, prioridad)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *;
  `;
  const params = [
    numero_folio,
    planta,
    descripcion,
    monto,
    estatus,
    creado_por,
    beneficiario || null,
    categoria || null,
    subcategoria || null,
    unidad || null,
    prioridad || null,
  ];
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

async function logHistorial({ numero_folio, estatus, comentario, actor }) {
  await pool.query(
    `INSERT INTO folio_historial (numero_folio, estatus, comentario, actor_telefono, actor_rol)
     VALUES ($1,$2,$3,$4,$5)`,
    [numero_folio, estatus, comentario || null, actor?.telefono || null, actor?.rol || null]
  );
}

// =========================
// 5) “Siguiente rol” + Notificación
// =========================
function nextRolClave(currentRol) {
  const r = String(currentRol || "").toUpperCase();
  if (r === "GA") return "GG";
  if (r === "GG") return "ZP";
  if (r === "ZP") return "CDMX";
  return null;
}

async function getNextApprover(actor) {
  const nextRol = nextRolClave(actor?.rol);
  if (!nextRol) return null;

  // Si el siguiente es GG, debe ser de la MISMA planta.
  // Si el siguiente es ZP o CDMX, normalmente sin planta (NULL).
  if (nextRol === "GG") {
    if (!actor?.planta_id) return null;
    const r = await pool.query(
      `
      SELECT u.telefono, u.nombre AS usuario_nombre, r.clave AS rol, p.clave AS planta_clave
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      LEFT JOIN plantas p ON p.id = u.planta_id
      WHERE u.activo = TRUE
        AND r.clave = 'GG'
        AND u.planta_id = $1
      LIMIT 1;
      `,
      [actor.planta_id]
    );
    return r.rows[0] || null;
  }

  // ZP / CDMX (corporativo)
  const r = await pool.query(
    `
    SELECT u.telefono, u.nombre AS usuario_nombre, r.clave AS rol
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.activo = TRUE
      AND r.clave = $1
    ORDER BY u.id ASC
    LIMIT 1;
    `,
    [nextRol]
  );
  return r.rows[0] || null;
}

async function sendWhatsApp(toE164, message) {
  if (!twilioClient) return { ok: false, error: "twilio_client_missing" };
  if (!TWILIO_WHATSAPP_NUMBER) return { ok: false, error: "TWILIO_WHATSAPP_NUMBER_missing" };

  const to = toWhatsApp(toE164);
  if (!to) return { ok: false, error: "to_empty" };

  const r = await twilioClient.messages.create({
    from: TWILIO_WHATSAPP_NUMBER, // ej: "whatsapp:+14155238886"
    to,
    body: message,
  });

  return { ok: true, sid: r.sid };
}

async function notifyNextRole({ actor, folio }) {
  const next = await getNextApprover(actor);
  if (!next) return { ok: false, reason: "no_next_role_found" };

  const msg =
    `📌 Nuevo folio para tu revisión\n\n` +
    `Folio: ${folio.numero_folio}\n` +
    `Planta: ${folio.planta}\n` +
    `Monto: ${folio.monto}\n` +
    `Prioridad: ${folio.prioridad || "Normal"}\n` +
    `Beneficiario: ${folio.beneficiario || "-"}\n` +
    `Categoría: ${folio.categoria || "-"} / ${folio.subcategoria || "-"}\n` +
    (folio.unidad ? `Unidad: ${folio.unidad}\n` : "") +
    `Descripción: ${folio.descripcion}\n\n` +
    `Acción sugerida: responde "estatus ${folio.numero_folio}"`;

  const sent = await sendWhatsApp(next.telefono, msg);

  // dejamos rastro en historial
  await logHistorial({
    numero_folio: folio.numero_folio,
    estatus: folio.estatus,
    comentario: `Notificación enviada a siguiente rol: ${next.rol} (${next.usuario_nombre || ""}) tel:${next.telefono} => ${sent.ok ? "OK" : "FAIL:" + sent.error}`,
    actor,
  });

  return { ok: true, next, sent };
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

// Útil para depurar match de teléfono
// Ejemplo: /debug-actor?from=whatsapp:+527443835403
app.get("/debug-actor", async (req, res) => {
  try {
    const from = req.query.from || "";
    const actor = await getActorByPhone(from);
    res.json({ ok: true, from, normalized: normalizeFrom(from), actor });
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
  const fromRaw = req.body.From || "unknown"; // "whatsapp:+52...."
  const from = normalizeFrom(fromRaw);        // "+52...."
  const message = incomingMsg.toLowerCase();

  try {
    // 8.1 Identificar usuario
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

    // 8.3 Crear folio
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

      const folioId = await buildMonthlyFolioIdDB();
      const d = drafts[from];
      const monto = moneyToNumber(d.importe);

      const guardado = await crearFolioDB({
        numero_folio: folioId,
        planta: plantaDetectada,
        descripcion: d.concepto,
        monto,
        estatus: "Generado",
        creado_por: `${actor.usuario_nombre} (${actor.rol})`,
        beneficiario: d.beneficiario,
        categoria: d.categoria,
        subcategoria: d.subcategoria,
        unidad: d.unidad,
        prioridad: d.prioridad,
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: "Generado",
        comentario:
          `Creado desde WhatsApp. ` +
          `Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. ` +
          `Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor,
      });

      delete drafts[from];

      // ✅ Notificar siguiente rol
      const notif = await notifyNextRole({ actor, folio: guardado });

      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `✅ Folio ${guardado.numero_folio} creado y guardado.\n\n` +
            `Planta: ${guardado.planta}\n` +
            `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
            `Concepto: ${guardado.descripcion}\n` +
            `Beneficiario: ${guardado.beneficiario || "-"}\n` +
            `Monto: ${guardado.monto}\n` +
            `Categoría: ${guardado.categoria || "-"}\n` +
            `Subcategoría: ${guardado.subcategoria || "-"}\n` +
            (guardado.unidad ? `Unidad: ${guardado.unidad}\n` : "") +
            `Prioridad: ${guardado.prioridad || "Normal"}\n\n` +
            `Notificación siguiente rol: ${notif.ok ? "✅ Enviada" : "⚠️ No enviada"}\n` +
            `Para consultar: escribe "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // 8.4 Completar borrador
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
        creado_por: `${actor.usuario_nombre} (${actor.rol})`,
        beneficiario: d.beneficiario,
        categoria: d.categoria,
        subcategoria:ưl: d.subcategoria,
        unidad: d.unidad,
        prioridad: d.prioridad,
      });

      await logHistorial({
        numero_folio: folioId,
        estatus: "Generado",
        comentario:
          `Creado desde borrador. ` +
          `Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. ` +
          `Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor,
      });

      delete drafts[from];

      // ✅ Notificar siguiente rol
      const notif = await notifyNextRole({ actor, folio: guardado });

      return res.send(
        twiml(
          `✅ Folio ${guardado.numero_folio} creado y guardado.\n\n` +
            `Planta: ${guardado.planta}\n` +
            `Creado por: ${actor.usuario_nombre} (${actor.rol})\n` +
            `Concepto: ${guardado.descripcion}\n` +
            `Beneficiario: ${guardado.beneficiario || "-"}\n` +
            `Monto: ${guardado.monto}\n` +
            `Categoría: ${guardado.categoria || "-"}\n` +
            `Subcategoría: ${guardado.subcategoria || "-"}\n` +
            (guardado.unidad ? `Unidad: ${guardado.unidad}\n` : "") +
            `Prioridad: ${guardado.prioridad || "Normal"}\n\n` +
            `Notificación siguiente rol: ${notif.ok ? "✅ Enviada" : "⚠️ No enviada"}\n` +
            `Para consultar: escribe "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // 8.5 OpenAI opcional
    if (!OPENAI_API_KEY) {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          "Comandos disponibles:\n" +
            "- crear folio <concepto>\n" +
            "- estatus <F-YYYYMM-XXX>\n\n" +
            "Si necesitas respuesta conversacional, agrega OPENAI_API_KEY en Render."
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
