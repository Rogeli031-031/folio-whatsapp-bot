/**
 * Lectura semanal de descuento (LD): configuración, parser del comando WhatsApp y orden de envío.
 * Ajustar lista, hora base y destinatarios sin tocar la lógica de negocio.
 */

"use strict";

const TZ = "America/Mexico_City";

/** Normaliza para comparar alias (minúsculas, sin acentos, espacios colapsados). */
function normalizePlantKey(s) {
  if (s == null || typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s\u00a0]+/g, " ");
}

/**
 * Mapa alias → nombre canónico en public.plantas / prov_map (mismo criterio que ALIAS en server).
 * Completar aquí si agregan plantas o variantes.
 */
const LD_ALIAS_TO_CANONICAL = {
  acapulco: "Acapulco",
  tehuacan: "Tehuacán",
  tehuacán: "Tehuacán",
  "gas uribe": "Gas Uribe",
  hidrogas: "Hidrogas",
  morelos: "Morelos",
  queretaro: "Querétaro",
  querétaro: "Querétaro",
  puebla: "Puebla",
  sanluis: "San Luis",
  "san luis": "San Luis",
  "san luis p": "San Luis",
  "san luis p.": "San Luis",
};

/** Orden por defecto del envío automático (lunes, un minuto entre plantas desde la hora base). */
const DEFAULT_WEEKLY_LD_PLANT_ORDER = [
  "Acapulco",
  "Tehuacán",
  "Gas Uribe",
  "Hidrogas",
  "Morelos",
  "Querétaro",
  "Puebla",
  "San Luis",
];

function parseWeeklyLdEnvRecipients() {
  const raw = (process.env.WEEKLY_LD_DESTINATIONS_JSON || "").trim();
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
  } catch (_) {
    /* ignore */
  }
  return {};
}

/**
 * Lista ordenada de entradas para el scheduler: { plantDisplayName, minuteOffset, to }.
 * `to` puede venir de WEEKLY_LD_DESTINATIONS_JSON[plantaNombre] o WEEKLY_LD_TO_<KEY> por compatibilidad.
 */
function getWeeklyLdDispatchList() {
  const envOrder = (process.env.WEEKLY_LD_PLANT_ORDER || "").trim();
  const names = envOrder
    ? envOrder.split(",").map((s) => s.trim()).filter(Boolean)
    : [...DEFAULT_WEEKLY_LD_PLANT_ORDER];
  const recipients = parseWeeklyLdEnvRecipients();
  const out = [];
  for (let i = 0; i < names.length; i++) {
    const plantDisplayName = names[i];
    let to = recipients[plantDisplayName] || recipients[plantDisplayName.toUpperCase()] || null;
    if (!to) {
      const envKey = `WEEKLY_LD_TO_${plantDisplayName.toUpperCase().replace(/\s+/g, "_")}`;
      to = (process.env[envKey] || "").trim() || null;
    }
    out.push({ plantDisplayName, minuteOffset: i, to });
  }
  return out;
}

/** Hora base México para envío automático (HH:mm 24h). */
function getWeeklyLdBaseTime() {
  const t = (process.env.WEEKLY_LD_BASE_TIME || "08:15").trim();
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { hour: 8, minute: 15 };
  const hour = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const minute = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return { hour, minute };
}

/**
 * Parsea mensaje WhatsApp: "LD", "LD MORELOS", "ld gas uribe".
 * @returns {{ ok: true, plantDisplayName: string } | { ok: false, reason: 'need_plant' } | null}
 */
function parseLDCommand(text) {
  const raw = String(text || "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (!/^ld(\s|$)/i.test(raw)) return null;
  if (/^ld$/i.test(raw)) return { ok: false, reason: "need_plant" };
  const rest = raw.replace(/^ld\s+/i, "").trim();
  if (!rest) return { ok: false, reason: "need_plant" };
  const key = normalizePlantKey(rest);
  const canonical = LD_ALIAS_TO_CANONICAL[key];
  if (canonical) return { ok: true, plantDisplayName: canonical };
  /** Sin alias: usar texto tal cual (el resolver en BD intentará coincidir). */
  return { ok: true, plantDisplayName: rest.trim() };
}

function ymdAddDays(ymd, deltaDays) {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const jd = new Date(Date.UTC(y, m - 1, d));
  jd.setUTCDate(jd.getUTCDate() + deltaDays);
  return `${jd.getUTCFullYear()}-${String(jd.getUTCMonth() + 1).padStart(2, "0")}-${String(jd.getUTCDate()).padStart(2, "0")}`;
}

/** Ayer en calendario México (YYYY-MM-DD), para usar como corte cuando el día en curso aún no está cerrado. */
function getYesterdayMexicoYmd() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t) => (parts.find((p) => p.type === t) || {}).value || "0";
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  return ymdAddDays(today, -1);
}

module.exports = {
  TZ,
  normalizePlantKey,
  LD_ALIAS_TO_CANONICAL,
  DEFAULT_WEEKLY_LD_PLANT_ORDER,
  getWeeklyLdDispatchList,
  getWeeklyLdBaseTime,
  parseLDCommand,
  getYesterdayMexicoYmd,
};
