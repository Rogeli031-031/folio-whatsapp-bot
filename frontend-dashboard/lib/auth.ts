/**
 * WhatsApp corta enlaces en "."; el bot envía "~" (a veces "%2E") en su lugar.
 * Devuelve el JWT estándar con puntos para verify/decode.
 */
export function normalizeDashboardToken(token: string): string {
  let t = String(token || "").trim();
  if (!t) return "";
  try {
    if (/%2E/i.test(t) || /%7E/i.test(t)) t = decodeURIComponent(t);
  } catch {
    /* ignore */
  }
  return t.replace(/~/g, ".");
}

/**
 * Parsea el token JWT del query ?t= y devuelve el JWT normalizado o null.
 * No verifica firma aquí (el backend valida); solo decodifica base64 para leer role/plantas.
 */
export function parseTokenFromQuery(searchParams: URLSearchParams): string | null {
  const t = searchParams.get("t");
  if (!t || typeof t !== "string") return null;
  const normalized = normalizeDashboardToken(t);
  return normalized || null;
}

export function getTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("dashboard_token");
}

export function setTokenInStorage(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("dashboard_token", token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("dashboard_token");
}

function base64UrlDecodeToString(input: string): string {
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return atob(s + pad);
}

export function decodeDashboardTokenPayload(token: string): Record<string, unknown> | null {
  if (!token || typeof token !== "string") return null;
  const normalized = normalizeDashboardToken(token);
  const parts = normalized.split(".");
  if (parts.length < 2) return null;
  try {
    const json = base64UrlDecodeToString(parts[1]);
    const payload = JSON.parse(json);
    return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Alcance de planta global del dashboard: ZP, AD y CF_CDMX. No usa plantas_permitidas. */
export function tokenHasGlobalPlantScope(token: string | null | undefined): boolean {
  if (!token) return false;
  const payload = decodeDashboardTokenPayload(token);
  const raw = payload && typeof payload.role === "string" ? payload.role : "";
  const role = raw.replace(/\s/g, "").toUpperCase();
  return role === "ZP" || role === "AD" || role === "CF_CDMX";
}

export function getRoleFromDashboardToken(token: string): string | null {
  if (typeof window === "undefined") return null;
  const payload = decodeDashboardTokenPayload(token);
  const role = payload?.role;
  return typeof role === "string" && role.trim() ? role.trim().toUpperCase() : null;
}

/** Permisos explícitos embebidos en el JWT (si existen). */
export function getPermisosFromDashboardToken(token: string): Record<string, boolean> | null {
  const payload = decodeDashboardTokenPayload(token);
  const p = payload?.permisos;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
    out[k] = !!v;
  }
  return out;
}

export function tokenHasPermiso(token: string | null | undefined, permisoClave: string): boolean | null {
  if (!token) return null;
  const permisos = getPermisosFromDashboardToken(token);
  if (!permisos || !Object.prototype.hasOwnProperty.call(permisos, permisoClave)) return null;
  return !!permisos[permisoClave];
}

const COMPRAS_DEFAULT_ROLES = new Set([
  "GG",
  "GO",
  "ZP",
  "AD",
  "CF_CDMX",
  "CDMX",
  "DIR_ZP",
  "DIRZP",
  "DIRECTOR_ZP",
  "DIRECTORZP",
  "DZP",
  "DIR-ZP",
]);

/** Permiso efectivo de Compras. Un token antiguo sin la clave usa el default del rol. */
export function tokenCanAccessCompras(token: string | null | undefined): boolean {
  if (!token) return false;
  const explicit = tokenHasPermiso(token, "acceso_compras");
  if (explicit != null) return explicit;
  const payload = decodeDashboardTokenPayload(token);
  const role = typeof payload?.role === "string" ? payload.role.trim().toUpperCase() : "";
  return COMPRAS_DEFAULT_ROLES.has(role);
}

/** Token del comando WhatsApp "SEH": solo permite la página /seh. */
export function isSehOnlyToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const payload = decodeDashboardTokenPayload(token);
  if (!payload) return false;
  return payload.scope === "seh" || payload.seh_only === true;
}
