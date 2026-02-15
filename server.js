// server.js
// Bot WhatsApp (Twilio) + PostgreSQL (Render) + (opcional) OpenAI
// - Identifica PLANTA y ROL por teléfono (tabla usuarios)
// - Crea folio con consecutivo mensual (tabla folio_counters)
// - Guarda folio en tabla folios (la que ya creaste: numero_folio, planta, descripcion, monto, estatus, creado_por, fecha_creacion)
// - Comando WhatsApp: "crear folio ..." y "estatus F-YYYYMM-001"

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

if (!DATABASE_URL) {
  console.error("❌ Falta DATABASE_URL en variables de entorno.");
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

function normalizeFrom(from) {
  // Twilio WhatsApp -> "whatsapp:+521..."
  return String(from || "").replace(/^whatsapp:/i, "").trim();
}

function moneyToNumber(v) {
  // "$ 12,345.67" -> 12345.67
  const s = String(v || "").replace(/,/g, "").replace(/[^0-9.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// =========================
// 1) Esquema mínimo (auto-crea si falta)
//    Esto te evita estar creando tablas a mano.
// =========================
async function ensureSchema() {
  // Nota: NO borra nada, solo crea si no existe
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
      telefono VARCHAR(30) UNIQUE NOT NULL, -- +521...
      nombre VARCHAR(120) NOT NULL,
      planta_id INT NULL REFERENCES plantas(id),
      rol_id INT NOT NULL REFERENCES roles(id),
      activo BOOLEAN DEFAULT TRUE,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Consecutivo mensual real (persistente)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folio_counters (
      yyyymm VARCHAR(6) PRIMARY KEY,
      last_seq INT NOT NULL
    );
  `);

  // Tabla de folios (tu estructura actual)
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

  // Historial (auditoría)
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

  // Roles base (solo si no existen)
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
// 5) Captura guiada (RAM) solo para completar campos del mensaje
//    (si Render reinicia, se pierde borrador; el folio ya guardado no se pierde)
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
// 6) Endpoints de prueba
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
// 7) Webhook Twilio WhatsApp
// =========================
app.post("/webhook", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const fromRaw = req.body.From || "unknown";
  const from = normalizeFrom(fromRaw);
  const message = incomingMsg.toLowerCase();

  try {
    // 7.1 Identificar usuario/rol/planta por teléfono
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

    // 7.2 Comando: estatus F-YYYYMM-001
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

    // 7.3 Crear folio (captura guiada)
    if (message.includes("crear folio")) {
      drafts[from] = drafts[from] || {};

      drafts[from].prioridad = message.includes("urgente") ? "Urgente no programado" : "Normal";

      // Concepto: todo lo que venga después de "crear folio"
      const concepto = incomingMsg.replace(/crear folio/i, "").trim();
      if (concepto) drafts[from].concepto = concepto;

      // Por si ya mandó datos en el mismo mensaje
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
        comentario: `Creado desde WhatsApp. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor
      });

      delete drafts[from];

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
            `Para consultar: escribe "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // 7.4 Si hay borrador abierto, el usuario está completando campos
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
        comentario: `Creado desde borrador. Prioridad: ${d.prioridad}. Beneficiario: ${d.beneficiario}. Categoria: ${d.categoria}/${d.subcategoria}${d.unidad ? ` Unidad:${d.unidad}` : ""}`,
        actor
      });

      delete drafts[from];

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
            `Para consultar: escribe "estatus ${guardado.numero_folio}"`
        )
      );
    }

    // 7.5 Si no es crear/continuar/estatus: OpenAI (opcional)
    if (!OPENAI_API_KEY) {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          "Comandos disponibles:\n" +
            "- crear folio <concepto>\n" +
            "- estatus <F-YYYYMM-XXX>\n\n" +
            "Si necesitas que responda conversacional, agrega OPENAI_API_KEY en Render."
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
// 8) Startup
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
IMPORTANTE: ALTA DE TELÉFONOS (USUARIOS)
========================================

1) En pgAdmin (Query Tool) agrega tus plantas:
INSERT INTO plantas (clave, nombre) VALUES
('ACAPULCO','Acapulco'),
('PUEBLA','Puebla'),
('TEHUACAN','Tehuacán'),
('QUERETARO','Querétaro'),
('SANLUIS','San Luis')
ON CONFLICT (clave) DO NOTHING;

2) Agrega usuarios por rol y teléfono:
-- GA Acapulco
INSERT INTO usuarios (telefono, nombre, planta_id, rol_id)
VALUES (
  '+521234567890',
  'GA Acapulco',
  (SELECT id FROM plantas WHERE clave='ACAPULCO'),
  (SELECT id FROM roles WHERE clave='GA')
);

-- GG Acapulco
INSERT INTO usuarios (telefono, nombre, planta_id, rol_id)
VALUES (
  '+521234567891',
  'GG Acapulco',
  (SELECT id FROM plantas WHERE clave='ACAPULCO'),
  (SELECT id FROM roles WHERE clave='GG')
);

-- Director ZP (sin planta)
INSERT INTO usuarios (telefono, nombre, planta_id, rol_id)
VALUES (
  '+525511112222',
  'Director ZP',
  NULL,
  (SELECT id FROM roles WHERE clave='ZP')
);

-- Contralor CDMX (sin planta)
INSERT INTO usuarios (telefono, nombre, planta_id, rol_id)
VALUES (
  '+525533334444',
  'Contralor CDMX',
  NULL,
  (SELECT id FROM roles WHERE clave='CDMX')
);

3) Prueba en WhatsApp:
- "crear folio modernizar baños urgente"
- Luego responde con líneas:
  Beneficiario: Proveedor X
  Importe: 25000
  Categoría: Inversiones
  Subcategoría: Remodelación

4) Consulta:
- "estatus F-202602-001"
*/

