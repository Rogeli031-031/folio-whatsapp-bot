/**
 * Misma regla que `lib/director-ia.js` en la raíz del repo (backend).
 * Mantener sincronizado al cambiar ENABLE_DIRECTOR_IA.
 */
export function isDirectorIaEnabled(): boolean {
  const raw = process.env.ENABLE_DIRECTOR_IA;
  if (raw == null || String(raw).trim() === "") {
    return false;
  }
  const v = String(raw).trim().toLowerCase();
  return v === "true" || v === "1";
}
