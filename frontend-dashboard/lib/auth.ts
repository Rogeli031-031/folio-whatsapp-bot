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
