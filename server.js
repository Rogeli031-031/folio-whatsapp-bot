// server.js
// WhatsApp (Twilio) + PostgreSQL (Render) + (opcional) OpenAI
// ✅ Identifica usuario por teléfono (robusto +52 / +521)
// ✅ Crea folio con consecutivo mensual persistente
// ✅ Guarda folio + historial
// ✅ Comandos:
//    - crear folio <concepto>
//    - estatus <F-YYYYMM-XXX>
//    - aprobar <F-YYYYMM-XXX>
//    - rechazar <F-YYYYMM-XXX> motivo: ...
//    - pagar <F-YYYYMM-XXX> (solo CDMX)
// ✅ Notifica automáticamente al siguiente rol:
//    Generado -> notifica GG (de esa planta)
//    Aprobado Planta -> notifica ZP
//    Aprobado Dirección -> notifica CDMX
//    Pagado/Rechazado -> notifica al creador

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ===== ENV =====
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
// Ejemplo sandbox: "whatsapp:+14155238886"
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || "";

if (!DATABASE_URL) console.error("❌ Falta DATABASE_URL en variables de entorno.");
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
  console.warn("⚠️ Twilio saliente NO configurado (no habrá notificaciones automáticas).");
  console.warn("   Requiere: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =========================
// 0) Helpers
// =========================
function twiml(msg) {
  const safe = String(msg || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<Response><Message>${safe}</Message></Response>`;
}

function stripWhatsappPrefix(from) {
  return String(from || "").replace(/^whatsapp:/i, "").trim();
}

function sanitizePhone(p) {
  return String(p || "").trim().replace(/[^\d+]/g, "");
}

/**
 * Devuelve variantes para matching:
 * - raw: lo que venga sin whatsapp:
 * - tel52: versión +52XXXXXXXXXX (sin "1")
 * - tel521: versión +521XXXXXXXXXX (con "1")
 */
function normalizePhoneVariants(fromRaw) {
  const noPrefix = stripWhatsappPrefix(fromRaw);
  const raw = sanitizePhone(noPrefix); // ej +521744...

  let tel52 = raw;
  let tel521 = raw;

  // Si viene +521 -> tel52 quitando el 1
  if (raw.startsWith("+521") && raw.length >= 5) {
    tel52 = "+52" + raw.slice(4);
    tel521 = raw;
  }

  // Si viene +52 -> tel521 agregando 1
  if (raw.startsWith("+52") && !raw.startsWith("+521")) {
    tel52 = raw;
    tel521 = "+521" + raw.slice(3);
  }

  // Limpia espacios raros ya sanitizado; fallback: si no tiene +, lo deja igual
  return { raw, tel52, tel521 };
}

// Número canónico recomendado para usar como key de drafts: tel52 si existe
function canonicalPhone(fromRaw) {
  const v = normalizePhoneVariants(fromRaw);
  return v.tel52 || v.raw || "unknown";
}

function moneyToNumber(v) {
  const s = String(v || "").replace(/,/g, "").replace(/[^0-9.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// =========================
// Twilio send (WhatsApp) - REST API
// =========================
async function sendWhatsApp(toE164, message) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.warn("⚠️ Twilio saliente no configurado. No se envió a:", toE164);
    return;
  }

  const to = `whatsapp:${sanitizePhone(toE164)}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const body = new URLSearchParams({
    To: to,
    From: TWILIO_WHATSAPP_NUMBER,
    Body: String(message || "")
  });

  try {
    await axios.post(url, body, {
      auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN },
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
  } catch (err) {
    console.error("❌ Error enviando WhatsApp:", err?.response?.data || err?.message || err);
  }
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
      telefono VARCHAR(30) UNIQUE NOT NULL, -- +52... o +521...
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
  const { raw, tel52, tel521 } = normalizePhoneVariants(fromRaw);

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
    WHERE u.activo = TRUE
      AND u.telefono IN ($1,$2,$3)
    LIMIT 1;
  `;

  const r = await pool.query(sql, [raw, tel52, tel521]);
  return r.rows[0] || null;
}

async function getUsersByRoleAndPlant(roleClave, plantaClave) {
  const sql = `
    SELECT u.telefono, u.nombre
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    JOIN plantas p ON p.id = u.planta_id
    WHERE u.activo = TRUE
      AND r.clave = $1
      AND p.clave = $2
    ORDER BY u.id ASC;
  `;
  const r = await pool.query(sql, [roleClave, plantaClave]);
  return r.rows || [];
}

async function getUsersByRole(roleClave) {
  const sql = `
    SELECT u.telefono, u.nombre
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.activo = TRUE
      AND r.clave = $1
    ORDER BY u.id ASC;
  `;
  const r = await pool.query(sql, [roleClave]);
  return r.rows || [];
}

// Cadena de notificación por estatus (reglas base)
function nextRoleForStatus(status) {
  if (status === "Generado") return "GG";                 // para aprobar planta
  if (status === "Aprobado Planta") return "ZP";          // para aprobar dirección
  if (status === "Aprobado Dirección") return "CDMX";     // para aprobar finanzas
  return null;
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
// 4) Guardar / Consultar folio + Historial
// =========================
async function crearFolioDB({ numero_folio, planta, descripcion, monto, estatus, creado_por }) {
  const sql = `
    INSERT INTO folios (numero_folio, planta, descripcion, monto, estatus, creado_por)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *;
  `;
  const r = await pool.query(sql, [numero_folio, planta, descripcion, monto, estatus, creado_por]);
  return r.rows[0];
}

async function obtenerFolioDB(numero_folio) {
  const r = await pool.query(
    `SELECT * FROM folios WHERE numero_folio = $1 ORDER BY id DESC LIMIT 1`,
    [numero_folio]
  );
  return r.rows[0] || null;
}

async function actualizarEstatusDB(numero_folio, nuevoEstatus) {
  const r = await pool.query(
    `UPDATE folios SET estatus=$2 WHERE numero_folio=$1 RETURNING *`,
    [numero_folio, nuevoEstatus]
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

async function getCreatorPhone(numero_folio) {
  const r = await pool.query(
    `SELECT actor_telefono
     FROM folio_historial
     WHERE numero_folio=$1
     ORDER BY creado_en ASC
     LIMIT 1`,
    [numero_folio]
  );
  return r.rows[0]?.actor_telefono || null;
}

// =========================
// 5) Captura guiada (RAM)
// =========================
const drafts = {}; // drafts[canonicalPhone] = { concepto, prioridad, beneficiario, importe, categoria, subcategoria, unidad }

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
// 6) Reglas de aprobación (simple base)
// =========================
function canApprove(rol, estatusActual) {
  if (estatusActual === "Generado" && rol === "GG") return { ok: true, nuevo: "Aprobado Planta" };
  if (estatusActual === "Aprobado Planta" && rol === "ZP") return { ok: true, nuevo: "Aprobado Dirección" };
  if (estatusActual === "Aprobado Dirección" && rol === "CDMX") return { ok: true, nuevo: "Aprobado Finanzas" };
  return { ok: false };
}

function canReject(rol, estatusActual) {
  if (estatusActual === "Generado" && rol === "GG") return true;
  if (estatusActual === "Aprobado Planta" && rol === "ZP") return true;
  if (estatusActual === "Aprobado Dirección" && rol === "CDMX") return true;
  if (estatusActual === "Aprobado Finanzas" && rol === "CDMX") return true;
  return false;
}

function canPay(rol, estatusActual) {
  return rol === "CDMX" && estatusActual === "Aprobado Finanzas";
}

// =========================
// 7) Notificación al siguiente rol
// =========================
async function notifyNextRoleForFolio(folioRow, actor, plantaClave) {
  const nextRole = nextRoleForStatus(folioRow.estatus);
  if (!nextRole) return;

  // GG depende de planta; ZP y CDMX son corporativo (sin planta)
  let recipients = [];
  if (nextRole === "GG") {
    recipients = await getUsersByRoleAndPlant("GG", plantaClave);
  } else {
    recipients = await getUsersByRole(nextRole);
  }

  const msg =
    `🔔 Folio pendiente de tu acción\n\n` +
    `Folio: ${folioRow.numero_folio}\n` +
    `Planta: ${folioRow.planta}\n` +
    `Estatus: ${folioRow.estatus}\n` +
    `Monto: ${folioRow.monto}\n` +
    `Concepto: ${folioRow.descripcion}\n` +
    `Creado por: ${folioRow.creado_por}\n\n` +
    `Comandos:\n` +
    `aprobar ${folioRow.numero_folio}\n` +
    `rechazar ${folioRow.numero_folio} motivo: ...\n` +
    (nextRole === "CDMX" ? `\n(Después: pagar ${folioRow.numero_folio})` : "");

  for (const r of recipients) {
    await sendWhatsApp(r.telefono, msg);
  }
}

// =========================
// 8) Endpoints de prueba
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
// 9) Webhook Twilio WhatsApp
// =========================
app.post("/webhook", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const fromRaw = req.body.From || "unknown";
  const message = incomingMsg.toLowerCase();

  const variants = normalizePhoneVariants(fromRaw);
  const keyPhone = canonicalPhone(fromRaw);

  console.log("📩 INCOMING:", { fromRaw, variants, body: incomingMsg });

  try {
    // 9.1 Identificar usuario
    const actor = await getActorByPhone(fromRaw);
    if (!actor) {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          "Tu número no está registrado en el sistema.\n" +
            "Pide a IT que te dé de alta con: Planta + Rol + Nombre + Teléfono.\n" +
            "Roles: GA, GG, ZP, CDMX.\n\n" +
            `Tel recibido: ${variants.raw}\n` +
            `Alt 52: ${variants.tel52}\n` +
            `Alt 521: ${variants.tel521}`
        )
      );
    }

    const plantaClave = actor.planta_clave || "CORPORATIVO";
    const plantaDetectada = actor.planta_clave || "CORPORATIVO";

    // 9.2 ESTATUS
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

    // 9.3 APROBAR
    if (message.startsWith("aprobar")) {
      const num = incomingMsg.replace(/aprobar/i, "").trim();
      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      if (!folio) return res.send(twiml(`No encontré el folio ${num}`));

      const perm = canApprove(actor.rol, folio.estatus);
      if (!perm.ok) {
        return res.send(
          twiml(
            `No puedes aprobar en este paso.\n` +
              `Tu rol: ${actor.rol}\n` +
              `Estatus actual: ${folio.estatus}\n\n` +
              `Flujo:\nGenerado(GG) -> Aprobado Planta(ZP) -> Aprobado Dirección(CDMX) -> Aprobado Finanzas(CDMX) -> Pagado`
          )
        );
      }

      const updated = await actualizarEstatusDB(num, perm.nuevo);
      await logHistorial({ numero_folio: num, estatus: perm.nuevo, comentario: "Aprobado", actor });

      // notifica al siguiente rol según el NUEVO estatus
      await notifyNextRoleForFolio(updated, actor, updated.planta);

      return res.send(twiml(`✅ Aprobado.\nFolio: ${num}\nNuevo estatus: ${perm.nuevo}`));
    }

    // 9.4 RECHAZAR
    if (message.startsWith("rechazar")) {
      const rest = incomingMsg.replace(/rechazar/i, "").trim();
      const parts = rest.split(/\s+motivo\s*:\s*/i);
      const num = (parts[0] || "").trim();
      const motivo = (parts[1] || "").trim() || "Sin motivo";

      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      if (!folio) return res.send(twiml(`No encontré el folio ${num}`));

      if (!canReject(actor.rol, folio.estatus)) {
        return res.send(twiml(`No puedes rechazar en este paso.\nTu rol: ${actor.rol}\nEstatus actual: ${folio.estatus}`));
      }

      const updated = await actualizarEstatusDB(num, "Rechazado");
      await logHistorial({ numero_folio: num, estatus: "Rechazado", comentario: `Motivo: ${motivo}`, actor });

      // notificar al creador
      const creatorPhone = await getCreatorPhone(num);
      if (creatorPhone) {
        await sendWhatsApp(
          creatorPhone,
          `❌ Folio RECHAZADO\n\nFolio: ${num}\nPor: ${actor.usuario_nombre} (${actor.rol})\nMotivo: ${motivo}\n\nPlanta: ${updated.planta}\nMonto: ${updated.monto}\nConcepto: ${updated.descripcion}`
        );
      }

      return res.send(twiml(`❌ Rechazado.\nFolio: ${num}\nMotivo: ${motivo}`));
    }

    // 9.5 PAGAR
    if (message.startsWith("pagar")) {
      const num = incomingMsg.replace(/pagar/i, "").trim();
      const folio = await obtenerFolioDB(num);

      res.set("Content-Type", "text/xml");
      if (!folio) return res.send(twiml(`No encontré el folio ${num}`));

      if (!canPay(actor.rol, folio.estatus)) {
        return res.send(
          twiml(
            `No puedes pagar en este paso.\n` +
              `Tu rol: ${actor.rol}\n` +
              `Estatus actual: ${folio.estatus}\n\n` +
              `Para pagar debe estar en: Aprobado Finanzas`
          )
        );
      }

      const updated = await actualizarEstatusDB(num, "Pagado");
      await logHistorial({ numero_folio: num, estatus: "Pagado", comentario: "Pago confirmado", actor });

      // notificar al creador
      const creatorPhone = await getCreatorPhone(num);
      if (creatorPhone) {
        await sendWhatsApp(
          creatorPhone,
          `✅ Folio PAGADO\n\nFolio: ${num}\nPlanta: ${updated.planta}\nMonto: ${updated.monto}\nConcepto: ${updated.descripcion}`
        );
      }

      return res.send(twiml(`✅ Pagado.\nFolio: ${num}\nNuevo estatus: Pagado`));
    }

    // 9.6 CREAR FOLIO (captura guiada)
    if (message.includes("crear folio")) {
      drafts[keyPhone] = drafts[keyPhone] || {};

      drafts[keyPhone].prioridad = message.includes("urgente") ? "Urgente no programado" : "Normal";

      const concepto = incomingMsg.replace(/crear folio/i, "").trim();
      if (concepto) drafts[keyPhone].concepto = concepto;

      Object.assign(drafts[keyPhone], parseKeyValueLines(incomingMsg));

      const miss = missingFields(drafts[keyPhone]);
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
              (String(drafts[keyPhone].categoria || "").toLowerCase().includes("taller") ? `Unidad: AT-03 o C-03\n` : "") +
              `(Concepto y prioridad ya los tomé)\n` +
              `Planta detectada: ${plantaDetectada}\nRol: ${actor.rol}`
          )
        );
      }

      const folioId = await buildMonthlyFolioIdDB();
      const d = drafts[keyPhone];
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

      // ✅ Notificar al siguiente rol (GG de esa planta)
      await notifyNextRoleForFolio(guardado, actor, plantaClave);

      delete drafts[keyPhone];

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
            `📲 Notificación enviada al siguiente aprobador.\n` +
            `Para consultar: escribe "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // 9.7 Continuación de borrador
    if (drafts[keyPhone]) {
      Object.assign(drafts[keyPhone], parseKeyValueLines(incomingMsg));
      const miss = missingFields(drafts[keyPhone]);

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
      const d = drafts[keyPhone];
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

      await notifyNextRoleForFolio(guardado, actor, plantaClave);

      delete drafts[keyPhone];

      return res.send(
        twiml(
          `✅ Folio ${guardado.numero_folio} creado y guardado.\n` +
            `📲 Notificación enviada al siguiente aprobador.\n\n` +
            `Para consultar: escribe "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // 9.8 Fallback conversacional (opcional)
    if (!OPENAI_API_KEY) {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          "Comandos disponibles:\n" +
            "- crear folio <concepto>\n" +
            "- estatus <F-YYYYMM-XXX>\n" +
            "- aprobar <F-YYYYMM-XXX>\n" +
            "- rechazar <F-YYYYMM-XXX> motivo: ...\n" +
            "- pagar <F-YYYYMM-XXX>\n"
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
// 10) Startup
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

/*
========================================
IMPORTANTES (Render ENV VARS)
========================================
DATABASE_URL=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
OPENAI_API_KEY=... (opcional)

========================================
ALTA DE USUARIOS (ejemplos)
========================================
- Guarda teléfonos como +52XXXXXXXXXX o +521XXXXXXXXXX (este server matchea ambos)

Plantas:
INSERT INTO plantas (clave, nombre) VALUES
('ACAPULCO','Acapulco')
ON CONFLICT (clave) DO NOTHING;

Usuarios:
-- GA Acapulco
INSERT INTO usuarios (telefono, nombre, planta_id, rol_id)
VALUES (
  '+527443835403',
  'GA Acapulco',
  (SELECT id FROM plantas WHERE clave='ACAPULCO'),
  (SELECT id FROM roles WHERE clave='GA')
);

-- GG Acapulco
INSERT INTO usuarios (telefono, nombre, planta_id, rol_id)
VALUES (
  '+52XXXXXXXXXX',
  'GG Acapulco',
  (SELECT id FROM plantas WHERE clave='ACAPULCO'),
  (SELECT id FROM roles WHERE clave='GG')
);

-- Director ZP (sin planta)
INSERT INTO usuarios (telefono, nombre, planta_id, rol_id)
VALUES (
  '+52YYYYYYYYYY',
  'Director ZP',
  NULL,
  (SELECT id FROM roles WHERE clave='ZP')
);

-- Contralor CDMX (sin planta)
INSERT INTO usuarios (telefono, nombre, planta_id, rol_id)
VALUES (
  '+52ZZZZZZZZZZ',
  'Contralor CDMX',
  NULL,
  (SELECT id FROM roles WHERE clave='CDMX')
);
*/
