/**
 * Envío automático semanal de lecturas LD (lunes, hora base México, 1 planta/minuto).
 * Documentación: ver weekly-discount-ld-config.js (orden de plantas, destinatarios, hora).
 */

"use strict";

const weeklyDiscountLdConfig = require("./weekly-discount-ld-config");
const weeklyDiscountNarrative = require("./weekly-discount-narrative");

/**
 * Programa el tick periódico (cada 60s) que en lunes dispara dispatchWeeklyLDByPlant por cada slot.
 * @param {object} opts
 * @param {import('pg').Pool} opts.pool
 * @param {function} opts.sendWhatsApp - (to, body, meta) => Promise
 * @param {number} opts.maxBodyLength - límite de caracteres WhatsApp
 * @returns {function} cancelFn (opcional; no usada aún)
 */
function scheduleWeeklyLDDispatch(opts) {
  const { pool, sendWhatsApp, maxBodyLength = 1550 } = opts;
  const weeklyLdEnabled = String(process.env.WEEKLY_LD_ENABLED || "true").toLowerCase() !== "false";
  const lastWeeklyLdDispatch = Object.create(null);
  const mxFmtWeekly = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const mxWdWeekly = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", weekday: "short" });

  const id = setInterval(() => {
    dispatchWeeklyLDByPlant({
      pool,
      sendWhatsApp,
      maxBodyLength,
      weeklyLdEnabled,
      lastWeeklyLdDispatch,
      mxFmtWeekly,
      mxWdWeekly,
    }).catch((e) => console.warn("[Weekly LD] tick", e.message));
  }, 60000);

  return () => clearInterval(id);
}

/**
 * Un ciclo del job: si es lunes y coincide slot de alguna planta, genera narrativa y envía.
 * Exportada para pruebas unitarias puntuales.
 */
async function dispatchWeeklyLDByPlant(ctx) {
  const {
    pool,
    sendWhatsApp,
    maxBodyLength,
    weeklyLdEnabled,
    lastWeeklyLdDispatch,
    mxFmtWeekly,
    mxWdWeekly,
  } = ctx;
  if (!weeklyLdEnabled) return;
  const now = new Date();
  if (mxWdWeekly.format(now) !== "Mon") return;
  const partsW = mxFmtWeekly.formatToParts(now);
  const getW = (t) => (partsW.find((p) => p.type === t) || {}).value || "0";
  const hW = parseInt(getW("hour"), 10) || 0;
  const mW = parseInt(getW("minute"), 10) || 0;
  const slotW = `${String(hW).padStart(2, "0")}:${String(mW).padStart(2, "0")}`;
  const todayW = `${getW("year")}-${getW("month")}-${getW("day")}`;
  const base = weeklyDiscountLdConfig.getWeeklyLdBaseTime();
  const list = weeklyDiscountLdConfig.getWeeklyLdDispatchList();
  for (const entry of list) {
    const targetM = base.minute + entry.minuteOffset;
    const targetH = base.hour + Math.floor(targetM / 60);
    const targetMin = targetM % 60;
    const targetSlot = `${String(targetH).padStart(2, "0")}:${String(targetMin).padStart(2, "0")}`;
    if (slotW !== targetSlot) continue;
    const dedupeKey = `weekly-ld-${todayW}-${targetSlot}-${entry.plantDisplayName}`;
    if (lastWeeklyLdDispatch[dedupeKey]) continue;
    lastWeeklyLdDispatch[dedupeKey] = true;
    if (!entry.to) {
      console.warn("[Weekly LD] Sin destinatario para planta (configure WEEKLY_LD_DESTINATIONS_JSON o WEEKLY_LD_TO_*):", entry.plantDisplayName);
      continue;
    }
    const pg = await pool.connect();
    try {
      const fc = weeklyDiscountLdConfig.getYesterdayMexicoYmd();
      const result = await weeklyDiscountNarrative.buildWeeklyDiscountNarrative(pg, entry.plantDisplayName, fc);
      const raw = result.narrativa_whatsapp || "";
      const bodyOut = raw.length > maxBodyLength ? raw.substring(0, maxBodyLength - 25) + "\n...(recortado)" : raw;
      const sendRes = await sendWhatsApp(entry.to, bodyOut, { event: "weekly_discount_ld" });
      console.log("[Weekly LD] envío", { plant: entry.plantDisplayName, ok: sendRes.ok, err: sendRes.error || null });
    } catch (e) {
      console.warn("[Weekly LD] error", entry.plantDisplayName, e.message);
    } finally {
      pg.release();
    }
  }
}

module.exports = {
  scheduleWeeklyLDDispatch,
  dispatchWeeklyLDByPlant,
};
