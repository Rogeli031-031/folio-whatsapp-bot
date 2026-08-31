"use strict";

function parseUploadDayYmd(raw) {
  const s = String(raw || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Enlace IGF Forecast → /acciones.
 * Conserva t y back. Añade upload_day solo si ya es YYYY-MM-DD vigente.
 * No inventa fecha. No consulta PROM ni cargas ARR.
 */
function buildIgfForecastAccionesHref(input) {
  const token = input && input.token != null ? String(input.token).trim() : "";
  const uploadDay = parseUploadDayYmd(input && (input.upload_day || input.uploadDay));
  if (!token) return "/acciones";
  const q = new URLSearchParams();
  q.set("t", token);
  q.set("back", "1");
  if (uploadDay) q.set("upload_day", uploadDay);
  return `/acciones?${q.toString()}`;
}

module.exports = {
  parseUploadDayYmd,
  buildIgfForecastAccionesHref,
};
