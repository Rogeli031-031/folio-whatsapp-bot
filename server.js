/**
 * server.js — WhatsApp Bot (Twilio) + Postgres
 * - Crear folio guiado (menús para categoría/subcategoría)
 * - Taller: pide UNIDAD con formato AT-03 / C-03 (acepta también AT03, AT 03, pipa 11, cilindrera 3)
 * - Siempre genera folio_codigo y numero_folio (mismo valor) para evitar NULLs en historial
 * - Consulta gasto por unidad y rango de fechas: "gasto pipa 11 últimos 2 meses" / "gasto AT-11 2026-01-01 2026-02-28"
 *
 * Requisitos:
 *   npm i express twilio pg
 *
 * ENV:
 *   DATABASE_URL=postgres://...
 *   PORT=10000
 */

"use strict";

const express = require("express");
const twilio = require("twilio");
const { Pool } = require("pg");

const app = express();
app.use(express.urlencoded({ extended: false }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

// -----------------------------
// Config (catálogos)
// -----------------------------
const CATEGORIAS = [
  { clave: "GASTOS", nombre: "Gastos" },
  { clave: "INVERSIONES", nombre: "Inversiones" },
  { clave: "DYO", nombre: "Derechos y Obligaciones" },
  { clave: "TALLER", nombre: "Taller" },
];

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
  // OJO: El usuario dijo que NO hay quinta categoría; entonces dejamos 4.
  INVERSIONES: ["Equipo para la planta", "Instalaciones a clientes", "Publicidad", "Tanques y cilindros"],
  DYO: [], // sin subcategoría
  TALLER: [], // sin subcategoría (solo unidad)
};

const PRIORIDADES = ["Normal", "Alta", "Urgente"];

// -----------------------------
// Sesiones en memoria (simple)
// En prod conviene Redis/DB, pero esto sirve.
// -----------------------------
const sessions = new Map(); // key: telefono -> draft

function getDraft(from) {
  if (!sessions.has(from)) {
    sessions.set(from, {
      estado: "IDLE",
      planta_id: null,
      planta_nombre: null,
      creado_por_id: null,
      creado_por_nombre: null,
      beneficiario: null,
      concepto: null,
      importe: null,
      categoria_clave: null,
      categoria_nombre: null,
      subcategoria_nombre: null,
      unidad: null,
      prioridad: "Normal",
    });
  }
  return sessions.get(from);
}

function resetDraft(from) {
  sessions.delete(from);
  return getDraft(from);
}

// -----------------------------
// Utilidades texto / parseos
// -----------------------------
function clean(s) {
  return (s || "").toString().trim();
}

function normalizeUpper(s) {
  return clean(s).toUpperCase();
}

function twiml(msg) {
  const MessagingResponse = twilio.twiml.MessagingResponse;
  const resp = new MessagingResponse();
  resp.message(msg);
  return resp.toString();
}

function renderMenu(title, items) {
  const lines = [];
  lines.push(title);
  lines.push("");
  items.forEach((it, idx) => {
    const label = typeof it === "string" ? it : it.nombre;
    lines.push(`${idx + 1}) ${label}`);
  });
  lines.push("");
  lines.push("Responde con el NÚMERO.");
  return lines.join("\n");
}

function parseMenuSelection(body, max) {
  const n = parseInt(clean(body), 10);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > max) return null;
  return n;
}

function parseMoney(body) {
  // acepta: 10000, 10,000, $10,000.50
  let s = clean(body);
  if (!s) return null;
  s = s.replace(/\$/g, "").replace(/,/g, "");
  const v = Number(s);
  if (!Number.isFinite(v) || v <= 0) return null;
  // a 2 decimales
  return Math.round(v * 100) / 100;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function normalizeUnidad(input) {
  // Acepta: AT-16, AT16, AT 16, at-016, pipa 11, cilindrera 3, C3, C-3
  const raw = normalizeUpper(input);

  // pipa 11 => AT-11
  let m = raw.match(/\bPIPA\s*(\d{1,3})\b/);
  if (m) return `AT-${pad2(parseInt(m[1], 10))}`;

  // cilindrera 3 => C-03
  m = raw.match(/\bCILINDRERA\s*(\d{1,3})\b/);
  if (m) return `C-${pad2(parseInt(m[1], 10))}`;

  // AT16 / AT-16 / AT 16 / AT-016
  m = raw.match(/\b(AT|C)\s*[- ]?\s*(\d{1,3})\b/);
  if (!m) return null;

  const pref = m[1];
  const num = parseInt(m[2], 10);
  if (!Number.isFinite(num) || num <= 0 || num > 999) return null;

  return `${pref}-${pad2(num)}`;
}

function isValidUnidad(u) {
  // Reglas: AT-01..AT-999 o C-01..C-999 (ajusta si quieres máximo 99)
  if (!u) return false;
  return /^(AT|C)-\d{2,3}$/.test(u);
}

// -----------------------------
// Fechas / rangos para consultas
// -----------------------------
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseISODate(s) {
  // yyyy-mm-dd
  const m = clean(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDMY(s) {
  // dd/mm/yyyy
  const m = clean(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = pad2(parseInt(m[1], 10));
  const mm = pad2(parseInt(m[2], 10));
  const yyyy = m[3];
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDateRangeFromText(text) {
  // Soporta:
  // - "últimos 2 meses" => hoy-2 meses a hoy
  // - "últimos 60 dias" => hoy-60 días a hoy
  // - "del 2026-01-01 al 2026-02-28"
  // - "del 01/01/2026 al 28/02/2026"
  const t = normalizeUpper(text);

  // del X al Y
  let m = t.match(/\bDEL\s+([0-9\/-]{8,10})\s+AL\s+([0-9\/-]{8,10})\b/);
  if (m) {
    const a = parseISODate(m[1]) || parseDMY(m[1]);
    const b = parseISODate(m[2]) || parseDMY(m[2]);
    if (a && b) return { from: startOfDay(a), to: endOfDay(b) };
  }

  // últimos N meses
  m = t.match(/\bULTIMOS?\s+(\d{1,3})\s+MESES\b/);
  if (m) {
    const n = parseInt(m[1], 10);
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - n);
    return { from: startOfDay(from), to: endOfDay(to) };
  }

  // últimos N días
  m = t.match(/\bULTIMOS?\s+(\d{1,3})\s+DIAS\b/);
  if (m) {
    const n = parseInt(m[1], 10);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - n);
    return { from: startOfDay(from), to: endOfDay(to) };
  }

  // “últimos 2 meses” sin número (por si acaso)
  if (t.includes("ULTIMOS DOS MESES") || t.includes("ÚLTIMOS DOS MESES")) {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 2);
    return { from: startOfDay(from), to: endOfDay(to) };
  }

  // default: últimos 60 días si no especifica
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 60);
  return { from: startOfDay(from), to: endOfDay(to) };
}

function formatMoney(n) {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
  } catch {
    return `$${Number(n || 0).toFixed(2)}`;
  }
}

function formatDate(d) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = pad2(x.getMonth() + 1);
  const dd = pad2(x.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

// -----------------------------
// DB helpers
// -----------------------------
async function getUsuarioPorTelefono(client, telefono) {
  // Ajusta a tu tabla usuarios si el campo se llama diferente
  // Asumimos: public.usuarios( id, nombre, telefono, rol, ... )
  const q = `
    SELECT id, nombre, rol
    FROM public.usuarios
    WHERE telefono = $1
    LIMIT 1;
  `;
  const r = await client.query(q, [telefono]);
  return r.rows[0] || null;
}

async function getPlantas(client) {
  const q = `SELECT id, nombre FROM public.plantas ORDER BY nombre;`;
  const r = await client.query(q);
  return r.rows.map((x) => ({ id: x.id, nombre: x.nombre }));
}

async function nextFolioCode(client) {
  // Genera F-YYYYMM-### usando public.folio_counters (yyyymm PK, last_seq)
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${pad2(now.getMonth() + 1)}`;

  await client.query("BEGIN");

  try {
    const lock = await client.query(
      `SELECT yyyymm, last_seq FROM public.folio_counters WHERE yyyymm=$1 FOR UPDATE`,
      [yyyymm]
    );

    let nextSeq = 1;
    if (lock.rowCount === 0) {
      await client.query(`INSERT INTO public.folio_counters(yyyymm, last_seq) VALUES ($1, $2)`, [yyyymm, 1]);
      nextSeq = 1;
    } else {
      nextSeq = lock.rows[0].last_seq + 1;
      await client.query(`UPDATE public.folio_counters SET last_seq=$2 WHERE yyyymm=$1`, [yyyymm, nextSeq]);
    }

    const folio = `F-${yyyymm}-${String(nextSeq).padStart(3, "0")}`;
    await client.query("COMMIT");
    return folio;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

async function insertFolioAndHistorial(client, draft, actor) {
  // IMPORTANTE: llenamos numero_folio = folio_codigo para que historial tenga FK si luego la agregas
  const folioCodigo = await nextFolioCode(client);

  const folioInsert = `
    INSERT INTO public.folios
      (folio_codigo, numero_folio, planta_id, creado_por_id, beneficiario, concepto, importe, categoria, subcategoria, unidad, prioridad, estatus, planta, creado_por, descripcion, monto, fecha_creacion)
    VALUES
      ($1,         $2,          $3,       $4,           $5,          $6,      $7,      $8,       $9,         $10,   $11,       'Generado', $12,   $13,      $14,        $15,  CURRENT_TIMESTAMP)
    RETURNING id, folio_codigo, numero_folio;
  `;

  const plantaNombre = draft.planta_nombre || null;
  const creadoPorNombre = draft.creado_por_nombre || (actor ? `${actor.nombre} (${actor.rol || "NA"})` : null);

  const params = [
    folioCodigo,
    folioCodigo,
    draft.planta_id,
    draft.creado_por_id,
    draft.beneficiario,
    draft.concepto,
    draft.importe,
    draft.categoria_nombre,
    draft.subcategoria_nombre,
    draft.unidad,
    draft.prioridad || "Normal",
    plantaNombre,
    creadoPorNombre,
    draft.concepto || null, // descripcion
    draft.importe || null, // monto
  ];

  const fr = await client.query(folioInsert, params);
  const folio = fr.rows[0];

  const histInsert = `
    INSERT INTO public.folio_historial
      (numero_folio, estatus, comentario, actor_telefono, actor_rol, folio_codigo, actor_id, folio_id)
    VALUES
      ($1,         $2,     $3,        $4,            $5,        $6,          $7,       $8);
  `;
  await client.query(histInsert, [
    folio.numero_folio,
    "Generado",
    "Folio creado por WhatsApp",
    actor?.telefono || null,
    actor?.rol || null,
    folio.folio_codigo,
    actor?.id || null,
    folio.id,
  ]);

  return folio;
}

async function queryGastoPorUnidad(client, unidad, fromDate, toDate) {
  // usa importe y creado_en (en folios) — ambos existen
  const q = `
    SELECT
      COALESCE(SUM(COALESCE(importe, 0)), 0) AS total,
      COUNT(*)::int AS folios
    FROM public.folios
    WHERE unidad = $1
      AND creado_en >= $2
      AND creado_en <= $3
      AND COALESCE(estatus, '') <> 'Cancelado';
  `;
  const r = await client.query(q, [unidad, fromDate, toDate]);
  return r.rows[0] || { total: 0, folios: 0 };
}

// -----------------------------
// Intent detection
// -----------------------------
function looksLikeCreate(body) {
  const t = normalizeUpper(body);
  return t.startsWith("CREAR FOLIO") || t === "CREAR" || t === "NUEVO FOLIO" || t.startsWith("NUEVO");
}

function looksLikeGastoQuery(body) {
  const t = normalizeUpper(body);
  return (
    t.includes("CUANTO") && t.includes("GAST") && (t.includes("PIPA") || t.includes("CILINDR") || t.includes("AT") || t.includes(" C-") || t.includes(" C "))
  ) || t.startsWith("GASTO ");
}

function extractUnidadFromText(body) {
  // prioridad: "AT-11" "C-03" etc
  const u = normalizeUnidad(body);
  return u && isValidUnidad(u) ? u : null;
}

// -----------------------------
// Webhook principal Twilio
// -----------------------------
app.post("/whatsapp", async (req, res) => {
  const from = clean(req.body.From); // "whatsapp:+521..."
  const body = clean(req.body.Body);

  // Normaliza teléfono simple (por si guardas en usuarios sin "whatsapp:")
  const telefono = from.replace("whatsapp:", "");

  const dd = getDraft(telefono);

  const client = await pool.connect();
  try {
    // Cargar actor si existe
    const actor = (await getUsuarioPorTelefono(client, telefono)) || {
      id: null,
      nombre: "Usuario",
      rol: "NA",
      telefono,
    };

    // -------------------------
    // 1) Consulta gasto (siempre disponible, aunque estés en un flujo)
    // -------------------------
    if (looksLikeGastoQuery(body)) {
      const unidad = extractUnidadFromText(body);
      if (!unidad) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml('No identifiqué la unidad. Ejemplos: "gasto AT-11 últimos 2 meses", "gasto pipa 11 del 2026-01-01 al 2026-02-28".'));
      }

      const range = parseDateRangeFromText(body);
      const r = await queryGastoPorUnidad(client, unidad, range.from, range.to);

      const msg =
        `📊 Gasto por unidad ${unidad}\n` +
        `Rango: ${formatDate(range.from)} a ${formatDate(range.to)}\n\n` +
        `Folios: ${r.folios}\n` +
        `Total: ${formatMoney(Number(r.total))}\n\n` +
        `Tip: también puedes escribir: "gasto cilindrera 3 últimos 30 dias"`;

      res.set("Content-Type", "text/xml");
      return res.send(twiml(msg));
    }

    // -------------------------
    // 2) Comandos de control
    // -------------------------
    const t = normalizeUpper(body);
    if (t === "CANCELAR" || t === "SALIR") {
      resetDraft(telefono);
      res.set("Content-Type", "text/xml");
      return res.send(twiml("✅ Listo. Cancelé el registro en curso. Para iniciar: 'crear folio'."));
    }

    if (looksLikeCreate(body)) {
      // Arranca flujo
      dd.estado = "ESPERANDO_PLANTA";
      dd.creado_por_id = actor.id;
      dd.creado_por_nombre = `${actor.nombre}${actor.rol ? ` (${actor.rol})` : ""}`;

      const plantas = await getPlantas(client);
      dd._plantas_cache = plantas;

      res.set("Content-Type", "text/xml");
      return res.send(twiml(renderMenu("Elige Planta:", plantas.map((p) => p.nombre))));
    }

    // Si está IDLE y no fue comando
    if (dd.estado === "IDLE") {
      const help =
        `Hola 👋\n` +
        `Comandos:\n` +
        `- "crear folio" (alta guiada)\n` +
        `- "gasto pipa 11 últimos 2 meses"\n` +
        `- "gasto AT-11 del 2026-01-01 al 2026-02-28"\n\n` +
        `En cualquier momento: "cancelar"`;
      res.set("Content-Type", "text/xml");
      return res.send(twiml(help));
    }

    // -------------------------
    // 3) Flujo guiado: Crear folio
    // -------------------------
    if (dd.estado === "ESPERANDO_PLANTA") {
      const plantas = dd._plantas_cache || (await getPlantas(client));
      const sel = parseMenuSelection(body, plantas.length);
      if (!sel) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Indica el NÚMERO de la planta (ej: 1)."));
      }
      const p = plantas[sel - 1];
      dd.planta_id = p.id;
      dd.planta_nombre = p.nombre;

      dd.estado = "ESPERANDO_BENEFICIARIO";
      res.set("Content-Type", "text/xml");
      return res.send(twiml("Indica BENEFICIARIO (a quién se le depositará)."));
    }

    if (dd.estado === "ESPERANDO_BENEFICIARIO") {
      if (body.length < 2) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Beneficiario inválido. Escribe el nombre completo."));
      }
      dd.beneficiario = body;

      dd.estado = "ESPERANDO_CONCEPTO";
      res.set("Content-Type", "text/xml");
      return res.send(twiml("Indica CONCEPTO (razón del pago)."));
    }

    if (dd.estado === "ESPERANDO_CONCEPTO") {
      if (body.length < 3) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Concepto muy corto. Describe un poco más."));
      }
      dd.concepto = body;

      dd.estado = "ESPERANDO_IMPORTE";
      res.set("Content-Type", "text/xml");
      return res.send(twiml('Indica IMPORTE (MXN). Ej: 10000 o $10,000.50'));
    }

    if (dd.estado === "ESPERANDO_IMPORTE") {
      const money = parseMoney(body);
      if (money == null) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml('Importe inválido. Ej: 10000 o $10,000.50'));
      }
      dd.importe = money;

      dd.estado = "ESPERANDO_CATEGORIA";
      res.set("Content-Type", "text/xml");
      return res.send(twiml(renderMenu("Elige Categoría:", CATEGORIAS)));
    }

    if (dd.estado === "ESPERANDO_CATEGORIA") {
      const sel = parseMenuSelection(body, CATEGORIAS.length);
      if (!sel) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Indica el NÚMERO de la categoría (ej: 1)."));
      }
      const c = CATEGORIAS[sel - 1];
      dd.categoria_clave = c.clave;
      dd.categoria_nombre = c.nombre;

      // Reglas por categoría
      if (dd.categoria_clave === "TALLER") {
        dd.subcategoria_nombre = null; // Taller no tiene subcategoría
        dd.estado = "ESPERANDO_UNIDAD";
        res.set("Content-Type", "text/xml");
        return res.send(twiml('Taller seleccionado. Indica Unidad (AT-03 o C-03). También acepto "pipa 11" o "cilindrera 3".'));
      }

      const subs = SUBCATS[dd.categoria_clave] || [];
      if (subs.length === 0) {
        dd.subcategoria_nombre = null;
        dd.estado = "ESPERANDO_PRIORIDAD";
        res.set("Content-Type", "text/xml");
        return res.send(twiml(renderMenu("Elige Prioridad:", PRIORIDADES)));
      }

      dd._subcats_cache = subs;
      dd.estado = "ESPERANDO_SUBCATEGORIA";
      res.set("Content-Type", "text/xml");
      return res.send(twiml(renderMenu("Elige Subcategoría:", subs)));
    }

    if (dd.estado === "ESPERANDO_SUBCATEGORIA") {
      const subs = dd._subcats_cache || (SUBCATS[dd.categoria_clave] || []);
      const sel = parseMenuSelection(body, subs.length);
      if (!sel) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Indica el NÚMERO de la subcategoría (ej: 2)."));
      }
      dd.subcategoria_nombre = subs[sel - 1];

      dd.estado = "ESPERANDO_PRIORIDAD";
      res.set("Content-Type", "text/xml");
      return res.send(twiml(renderMenu("Elige Prioridad:", PRIORIDADES)));
    }

    if (dd.estado === "ESPERANDO_UNIDAD") {
      const u = normalizeUnidad(body);
      if (!u || !isValidUnidad(u)) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml('Unidad inválida. Formatos: AT-03 o C-03. También acepto "AT03", "pipa 11", "cilindrera 3".'));
      }
      dd.unidad = u;

      dd.estado = "ESPERANDO_PRIORIDAD";
      res.set("Content-Type", "text/xml");
      return res.send(twiml(renderMenu("Elige Prioridad:", PRIORIDADES)));
    }

    if (dd.estado === "ESPERANDO_PRIORIDAD") {
      const sel = parseMenuSelection(body, PRIORIDADES.length);
      if (!sel) {
        res.set("Content-Type", "text/xml");
        return res.send(twiml("Indica el NÚMERO de la prioridad (ej: 1)."));
      }
      dd.prioridad = PRIORIDADES[sel - 1];

      // Validación final mínima
      if (!dd.beneficiario || !dd.concepto || !dd.importe || !dd.categoria_nombre) {
        resetDraft(telefono);
        res.set("Content-Type", "text/xml");
        return res.send(twiml("❌ Faltó información. Vuelve a intentar con 'crear folio'."));
      }
      if (dd.categoria_clave === "TALLER" && !dd.unidad) {
        res.set("Content-Type", "text/xml");
        dd.estado = "ESPERANDO_UNIDAD";
        return res.send(twiml("Falta la unidad (AT-03 o C-03)."));
      }

      // Crear en DB
      const folio = await insertFolioAndHistorial(client, dd, actor);

      // Mensaje final
      const lines = [];
      lines.push("✅ Folio creado y guardado.");
      lines.push("");
      lines.push(`Folio: ${folio.folio_codigo}`);
      lines.push(`Planta: ${dd.planta_nombre || "-"}`);
      lines.push(`Creado por: ${dd.creado_por_nombre || "-"}`);
      lines.push(`Beneficiario: ${dd.beneficiario}`);
      lines.push(`Concepto: ${dd.concepto}`);
      lines.push(`Importe: ${formatMoney(dd.importe)}`);
      lines.push(`Categoría: ${dd.categoria_nombre}`);
      if (dd.subcategoria_nombre) lines.push(`Subcategoría: ${dd.subcategoria_nombre}`);
      if (dd.unidad) lines.push(`Unidad: ${dd.unidad}`);
      lines.push(`Prioridad: ${dd.prioridad}`);
      lines.push("");
      lines.push(`Para adjuntar cotización: "adjuntar ${folio.folio_codigo}" + manda el PDF.`);
      lines.push(`Para consultar: "estatus ${folio.folio_codigo}" (pendiente de implementar si aún no lo tienes).`);

      // Reset para el siguiente
      resetDraft(telefono);

      res.set("Content-Type", "text/xml");
      return res.send(twiml(lines.join("\n")));
    }

    // Si cayó en estado desconocido
    resetDraft(telefono);
    res.set("Content-Type", "text/xml");
    return res.send(twiml("Me perdí 😅. Escribe 'crear folio' para iniciar o 'gasto pipa 11 últimos 2 meses' para consultar."));
  } catch (e) {
    console.error("ERROR webhook:", e);
    res.set("Content-Type", "text/xml");
    return res.send(twiml("Error procesando solicitud. Intenta de nuevo en 1 minuto."));
  } finally {
    client.release();
  }
});

// Health
app.get("/", (req, res) => res.status(200).send("OK"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor corriendo en puerto", PORT));

