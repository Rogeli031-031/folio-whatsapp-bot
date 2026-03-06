const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

function getApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  if (base) return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  return `/api-backend${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string; params?: Record<string, string> } = {}
): Promise<T> {
  const { token, params, ...init } = options;
  let url = getApiUrl(path);
  const q = new URLSearchParams(params).toString();
  if (q) url += (url.includes("?") ? "&" : "?") + q;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface KanbanBoard {
  meta: { filters: unknown; role: string };
  etapas: string[];
  categorias: string[];
  board: {
    etapa: string;
    etapa_label?: string;
    etapa_icon?: string;
    stats: { count: number; total_mxn: number | null; avg_aging: number | null };
    plantas: {
      planta_id: number;
      planta_nombre: string;
      stats: { count: number; total_mxn: number; avg_aging: number | null };
      porCategoria: Record<string, FolioCard[]>;
    }[];
  }[];
}

export interface FolioCard {
  id: number;
  numero_folio: string;
  folio_codigo: string;
  planta_id: number | null;
  planta_nombre: string | null;
  categoria: string | null;
  subcategoria: string | null;
  unidad: string | null;
  importe: number | null;
  estatus: string | null;
  descripcion: string;
  creado_en: string | null;
  aging: number | null;
  tiene_cotizacion?: boolean;
  solo_zp_ad?: boolean;
}

export interface Kpis {
  total_activos: number;
  total_mxn: number | null;
  pendientes_zp: number;
  avg_aging: number | null;
  top_planta: { nombre: string; count: number; total_mxn: number | null } | null;
  top_categoria: { nombre: string; count: number; total_mxn: number | null } | null;
  oldest: { folio_codigo: string; aging: number; etapa: string; planta: string | null } | null;
}

export interface DashboardFilters {
  plantas?: string;
  categorias?: string;
  etapas?: string;
  solo_activos?: string;
  mi_semana?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export function fetchKanban(token: string, filters: DashboardFilters = {}): Promise<KanbanBoard> {
  const params: Record<string, string> = {};
  if (filters.plantas) params.planta_id = filters.plantas;
  if (filters.categorias) params.categoria = filters.categorias;
  if (filters.etapas) params.etapa = filters.etapas;
  if (filters.solo_activos === "1") params.solo_activos = "true";
  if (filters.mi_semana === "1") params.mi_semana = "true";
  if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
  if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;
  return apiFetch<KanbanBoard>("/api/dashboard/kanban", { token, params });
}

export function fetchKpis(token: string, filters: DashboardFilters = {}): Promise<Kpis> {
  const params: Record<string, string> = {};
  if (filters.plantas) params.planta_id = filters.plantas;
  if (filters.solo_activos === "1") params.solo_activos = "true";
  if (filters.mi_semana === "1") params.mi_semana = "true";
  if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
  if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;
  return apiFetch<Kpis>("/api/dashboard/kpis", { token, params });
}

export function fetchFolio(token: string, id: number): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>(`/api/folios/${id}`, { token });
}

export function postAprobarFolio(token: string, id: number): Promise<{ ok: boolean; estatus: string }> {
  return apiFetch<{ ok: boolean; estatus: string }>(`/api/folios/${id}/aprobar`, { token, method: "POST" });
}

export function postRegresarFolioAZp(token: string, id: number): Promise<{ ok: boolean; estatus: string }> {
  return apiFetch<{ ok: boolean; estatus: string }>(`/api/folios/${id}/regresar-zp`, { token, method: "POST" });
}

export function fetchTimeline(token: string, id: number): Promise<{ events: { estatus: string; comentario: string; actor_telefono: string | null; actor_rol: string | null; creado_en: string }[] }> {
  return apiFetch(`/api/folios/${id}/timeline`, { token });
}

export function fetchMedia(token: string, id: number): Promise<{ items: { id: number; tipo: string; status: string; file_name: string | null; subido_en: string }[] }> {
  return apiFetch(`/api/folios/${id}/media`, { token });
}

export function fetchMediaUrl(token: string, folioId: number, mediaId: number): Promise<{ url: string }> {
  return apiFetch(`/api/folios/${folioId}/media/${mediaId}/url`, { token });
}

export function fetchFinanzas(token: string, id: number): Promise<{ status: string; monto_mxn?: number | null }> {
  return apiFetch(`/api/folios/${id}/finanzas`, { token });
}

export interface IgfPeriodo {
  year: number;
  month: number;
  versiones: number[];
}

export function fetchIgfVersiones(token: string): Promise<{ periodos: IgfPeriodo[] }> {
  return apiFetch<{ periodos: IgfPeriodo[] }>("/api/dashboard/igf-versiones", { token });
}

export function postIgfComoCambioToken(
  token: string,
  body: { planta: string; yearA: number; monthA: number; versionA: number; yearB: number; monthB: number; versionB: number }
): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/api/dashboard/igf-como-cambio-token", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface IgfDeltaItem {
  label?: string;
  dir?: string;
  deltaStr?: string;
  deltaMxn?: string | number | null;
  tipo?: string;
  valorA?: string;
  valorB?: string;
}

export function postIgfComoCambioDatos(
  token: string,
  body: { planta: string; yearA: number; monthA: number; versionA: number; yearB: number; monthB: number; versionB: number }
): Promise<{ cabecera: string | null; deltas: IgfDeltaItem[]; deltaCargo: number | null; deltaCorp: number | null; sinDatos: boolean; url: string; versionALabel?: string; versionBLabel?: string }> {
  return apiFetch("/api/dashboard/igf-como-cambio-datos", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface PresupuestoCompararItem {
  categoria: string;
  montoA: number;
  montoB: number;
  delta: number;
}

export interface PresupuestoCompararResult {
  totalA: number;
  totalB: number;
  delta: number;
  porCategoria: PresupuestoCompararItem[];
  porSubcategoria: { categoria: string; subcategoria: string; montoA: number; montoB: number; delta: number }[];
}

export function postPresupuestoComparar(
  token: string,
  body: { planta: string; periodoA: string; periodoB: string }
): Promise<PresupuestoCompararResult> {
  return apiFetch<PresupuestoCompararResult>("/api/dashboard/presupuesto-comparar", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface DeltaVentaCliente {
  cliente: string;
  kgA: number;
  kgB: number;
  deltaKg: number;
  kgAStr: string;
  kgBStr: string;
  deltaKgStr: string;
}

export interface DeltaVentaOpcion {
  totalDeltaKg: number;
  totalDeltaKgStr: string;
  signPositive: boolean;
  clientes: DeltaVentaCliente[];
}

export interface DeltaVentaDatosResult {
  planta: string;
  periodoA: string;
  periodoB: string;
  dejaron: DeltaVentaOpcion;
  mas: DeltaVentaOpcion;
  disminuyeron: DeltaVentaOpcion;
}

export function fetchDeltaVentaPeriodos(token: string, planta: string): Promise<{ periodos: string[] }> {
  return apiFetch<{ periodos: string[] }>("/api/dashboard/delta-venta-periodos", {
    token,
    params: { planta },
  });
}

export function postDeltaVentaDatos(
  token: string,
  body: { planta: string; periodoA: string; periodoB: string }
): Promise<DeltaVentaDatosResult> {
  return apiFetch<DeltaVentaDatosResult>("/api/dashboard/delta-venta-datos", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface DeltaDescuentoCliente {
  cliente: string;
  ratioA: number;
  ratioB: number;
  deltaRatio: number;
  ratioAStr: string;
  ratioBStr: string;
  deltaRatioStr: string;
}

export interface DeltaDescuentoOpcion {
  totalDeltaRatio: number;
  totalDeltaRatioStr: string;
  signPositive: boolean;
  clientes: DeltaDescuentoCliente[];
}

export interface DeltaDescuentoDatosResult {
  planta: string;
  periodoA: string;
  periodoB: string;
  dejaron: DeltaDescuentoOpcion;
  mas: DeltaDescuentoOpcion;
  disminuyeron: DeltaDescuentoOpcion;
}

export function fetchDeltaDescuentoPeriodos(token: string, planta: string): Promise<{ periodos: string[] }> {
  return apiFetch<{ periodos: string[] }>("/api/dashboard/delta-descuento-periodos", {
    token,
    params: { planta },
  });
}

export function postDeltaDescuentoDatos(
  token: string,
  body: { planta: string; periodoA: string; periodoB: string }
): Promise<DeltaDescuentoDatosResult> {
  return apiFetch<DeltaDescuentoDatosResult>("/api/dashboard/delta-descuento-datos", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface DeltaIngresoCliente {
  cliente: string;
  ingresoA: number;
  ingresoB: number;
  deltaIngreso: number;
  ingresoAStr: string;
  ingresoBStr: string;
  deltaIngresoStr: string;
  kgA?: number;
  kgB?: number;
  kgAStr?: string;
  kgBStr?: string;
  descKgAStr?: string;
  descKgBStr?: string;
  margenAStr?: string;
  margenBStr?: string;
}

export interface DeltaIngresoOpcion {
  totalDeltaIngreso: number;
  totalDeltaIngresoStr: string;
  signPositive: boolean;
  clientes: DeltaIngresoCliente[];
  totalTonA?: number;
  totalTonB?: number;
  totalTonAStr?: string;
  totalTonBStr?: string;
}

export interface DeltaIngresoDatosResult {
  planta: string;
  periodoA: string;
  periodoB: string;
  margenAStr?: string;
  margenBStr?: string;
  totalTonAGeneralStr?: string;
  totalTonBGeneralStr?: string;
  dejaron: DeltaIngresoOpcion;
  mas: DeltaIngresoOpcion;
  disminuyeron: DeltaIngresoOpcion;
  clientesNuevos: DeltaIngresoOpcion;
  otrosClientes: DeltaIngresoOpcion;
}

export function fetchDeltaIngresoPeriodos(token: string, planta: string): Promise<{ periodos: string[] }> {
  return apiFetch<{ periodos: string[] }>("/api/dashboard/delta-ingreso-periodos", {
    token,
    params: { planta },
  });
}

export function postDeltaIngresoDatos(
  token: string,
  body: { planta: string; periodoA: string; periodoB: string; sinRegla8020?: boolean }
): Promise<DeltaIngresoDatosResult> {
  return apiFetch<DeltaIngresoDatosResult>("/api/dashboard/delta-ingreso-datos", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postFolioPoliza(
  token: string,
  folioId: number,
  body: { fileBase64: string; fileName?: string; mes_cargo?: string }
): Promise<{ ok: boolean; estatus: string; mes_cargo: string }> {
  return apiFetch(`/api/folios/${folioId}/poliza`, {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchFolioMesCargo(
  token: string,
  folioId: number,
  mes_cargo: string | null
): Promise<{ ok: boolean; mes_cargo: string | null }> {
  return apiFetch(`/api/folios/${folioId}`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ mes_cargo }),
  });
}

export function patchFolioSoloZpAd(
  token: string,
  folioId: number,
  solo_zp_ad: boolean
): Promise<{ ok: boolean; solo_zp_ad: boolean }> {
  return apiFetch(`/api/folios/${folioId}/solo-zp-ad`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ solo_zp_ad }),
  });
}

export async function fetchDocumentoGastosHtml(token: string, folioId: number): Promise<string> {
  const url = getApiUrl(`/api/folios/${folioId}/documento-gastos?format=html`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.text();
}

export async function fetchDocumentoGastosPdf(
  token: string,
  folioId: number,
  includeCotizacion: boolean
): Promise<Blob> {
  const url = getApiUrl(`/api/folios/${folioId}/documento-gastos?format=pdf&include_cotizacion=${includeCotizacion ? "1" : "0"}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.blob();
}
