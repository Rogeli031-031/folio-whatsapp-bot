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
