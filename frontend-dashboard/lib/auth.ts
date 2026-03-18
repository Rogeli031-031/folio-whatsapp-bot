/**
 * Parsea el token JWT del query ?t= y devuelve el payload o null.
 * No verifica firma aquí (el backend valida); solo decodifica base64 para leer role/plantas.
 */
export function parseTokenFromQuery(searchParams: URLSearchParams): string | null {
  const t = searchParams.get("t");
  if (!t || typeof t !== "string") return null;
  return t.trim() || null;
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
  const parts = token.split(".");
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
