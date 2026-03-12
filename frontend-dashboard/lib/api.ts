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

/** URL para descargar el Excel del Forecast (mes actual) que envía la segunda liga del comando dashboard. */
export function getDashboardExcelDownloadUrl(token: string, year: number, month: number): string {
  const base = getApiUrl("/api/arr/dashboard-excel");
  return `${base}?year=${year}&month=${month}&t=${encodeURIComponent(token)}`;
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
  por_recuperar?: boolean;
  prioridad?: string | null;
  mes_cargo?: string | null;
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
  mes?: string;
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
  if (filters.mes) params.mes = filters.mes;
  return apiFetch<KanbanBoard>("/api/dashboard/kanban", { token, params });
}

export function fetchPlantas(token: string): Promise<{ plantas: { id: number; nombre: string }[] }> {
  return apiFetch<{ plantas: { id: number; nombre: string }[] }>("/api/dashboard/plantas", { token });
}

export interface IgfForecastRow {
  empresa: string;
  venta_ton: number | null;
  margen_kg: number | null;
  com_desc_kg: number | null;
  gasto_kg: number | null;
  impuesto_kg: number | null;
  presupuesto_kg?: number | null;
  folios_aprob_zp_kg?: number | null;
  folios_carro_kg?: number | null;
  hg_pct?: number | null;
  hg_kg?: number | null;
  bancos_planta_kg?: number | null;
  provision_planta_kg?: number | null;
  deposito_cierre_kg?: number | null;
  util_oper_kg?: number | null;
  util_oper_importe?: number | null;
  gtos_apoyos_corp_kg?: number | null;
  bancos_corp_kg?: number | null;
  otros_programas_kg?: number | null;
  inversiones_kg?: number | null;
  resultado_final_kg?: number | null;
  resultado_final_importe?: number | null;
  [k: string]: string | number | null | undefined;
}

export interface IgfForecastResponse {
  year: number;
  month: number;
  version_id: number | null;
  version_number: number | null;
  rows: IgfForecastRow[];
  totales: Record<string, number | null> | null;
}

export function fetchIgfForecast(
  token: string,
  params?: { year?: number; month?: number }
): Promise<IgfForecastResponse> {
  const p: Record<string, string> = {};
  if (params?.year != null) p.year = String(params.year);
  if (params?.month != null) p.month = String(params.month);
  return apiFetch<IgfForecastResponse>("/api/dashboard/igf-forecast", {
    token,
    params: Object.keys(p).length ? p : undefined,
    cache: "no-store",
  });
}

export function patchIgfForecastHg(
  token: string,
  payload: { year: number; month: number; empresa: string; hg_pct?: number | null; hg_kg?: number | null }
): Promise<{ ok: boolean; empresa: string; year: number; month: number }> {
  return apiFetch<{ ok: boolean; empresa: string; year: number; month: number }>("/api/dashboard/igf-forecast", {
    token,
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface CrearFolioPayload {
  planta_id: number;
  proyecto_id?: number | null;
  beneficiario?: string;
  concepto: string;
  importe: number;
  categoria: string;
  subcategoria?: string;
  prioridad?: string;
  unidad?: string;
  estacion?: string;
  banco?: string;
  cuenta_bancaria?: string;
}

export function fetchProyectosPorPlanta(token: string, plantaId: number): Promise<{ proyectos: { id: number; codigo: string; nombre: string }[] }> {
  return apiFetch<{ proyectos: { id: number; codigo: string; nombre: string }[] }>("/api/dashboard/proyectos", {
    token,
    params: { planta_id: String(plantaId) },
  });
}

export interface CrearProyectoPayload {
  planta_id: number;
  nombre: string;
  descripcion?: string;
  fecha_inicio?: string;
  fecha_cierre_estimada?: string;
}

export function postCrearProyecto(token: string, payload: CrearProyectoPayload): Promise<{ id: number; codigo: string; planta_id: number; nombre: string }> {
  return apiFetch<{ id: number; codigo: string; planta_id: number; nombre: string }>("/api/proyectos", {
    token,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postCrearFolio(token: string, payload: CrearFolioPayload): Promise<{ id: number; numero_folio: string; folio_codigo: string; planta_id: number }> {
  return apiFetch<{ id: number; numero_folio: string; folio_codigo: string; planta_id: number }>("/api/folios", {
    token,
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export function fetchIgfEmpresas(token: string): Promise<{ empresas: string[] }> {
  return apiFetch<{ empresas: string[] }>("/api/dashboard/igf-empresas", { token });
}

export function patchFolioPrestamoAPlanta(
  token: string,
  folioId: number,
  prestamoAPlanta: string | null
): Promise<{ ok: boolean; prestamo_a_planta: string | null }> {
  return apiFetch<{ ok: boolean; prestamo_a_planta: string | null }>(`/api/folios/${folioId}/prestamo-a-planta`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ prestamo_a_planta: prestamoAPlanta }),
  });
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

export interface DeltaIngresoForecastCliente extends DeltaIngresoCliente {
  canal?: string;
  subcanal?: string;
  estado?: string;
  freqDays?: number;
  daysSinceLast?: number;
  historyLast4Weeks?: { fecha: string; kg: number }[];
  kgAStr?: string;
  kgBStr?: string;
  deltaKgStr?: string;
}

export interface DeltaIngresoForecastCategoria {
  canal: string;
  subcanal: string;
  dejaron: { count: number; totalDeltaIngresoStr: string; totalDeltaKgStr?: string };
  nuevos: { count: number; totalDeltaIngresoStr: string; totalDeltaKgStr?: string };
  aumentaron: { count: number; totalDeltaIngresoStr: string; totalDeltaKgStr?: string };
  disminuyeron: { count: number; totalDeltaIngresoStr: string; totalDeltaKgStr?: string };
}

export interface DeltaIngresoForecastResult {
  planta: string;
  periodoA: string;
  periodoB: string;
  margenAStr?: string;
  margenBStr?: string;
  dejaron: { totalDeltaIngresoStr: string; clientes: DeltaIngresoForecastCliente[] };
  nuevos: { totalDeltaIngresoStr: string; clientes: DeltaIngresoForecastCliente[] };
  aumentaron: { totalDeltaIngresoStr: string; clientes: DeltaIngresoForecastCliente[] };
  disminuyeron: { totalDeltaIngresoStr: string; clientes: DeltaIngresoForecastCliente[] };
  byCategoria: DeltaIngresoForecastCategoria[];
}

export function postDeltaIngresoForecastDatos(
  token: string,
  body: { planta: string; periodoA: string; periodoB: string }
): Promise<DeltaIngresoForecastResult> {
  return apiFetch<DeltaIngresoForecastResult>("/api/dashboard/delta-ingreso-forecast-datos", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getDeltaIngresoForecastExcelUrl(
  token: string,
  planta: string,
  periodoA: string,
  periodoB: string
): string {
  const base = getApiUrl("/api/dashboard/delta-ingreso-forecast-excel");
  return `${base}?planta=${encodeURIComponent(planta)}&periodoA=${encodeURIComponent(periodoA)}&periodoB=${encodeURIComponent(periodoB)}&t=${encodeURIComponent(token)}`;
}

/** Delta Ingreso Cliente Forecast: solo planta, 60 días historial, proyección a cierre del mes (sin periodo A/B). */
export interface DicfResult {
  planta: string;
  last_date: string | null;
  window_days: number;
  periodoMes: string | null;
  margenStr?: string;
  dejaron: { totalDeltaIngresoStr: string; totalDeltaKgStr?: string; clientes: DeltaIngresoForecastCliente[] };
  nuevos: { totalDeltaIngresoStr: string; totalDeltaKgStr?: string; clientes: DeltaIngresoForecastCliente[] };
  aumentaron: { totalDeltaIngresoStr: string; totalDeltaKgStr?: string; clientes: DeltaIngresoForecastCliente[] };
  disminuyeron: { totalDeltaIngresoStr: string; totalDeltaKgStr?: string; clientes: DeltaIngresoForecastCliente[] };
  byCategoria: DeltaIngresoForecastCategoria[];
}

export function postDicfDatos(
  token: string,
  body: { planta: string }
): Promise<DicfResult> {
  return apiFetch<DicfResult>("/api/dashboard/dicf-datos", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface DicfConfig {
  planta: string;
  year: number;
  month: number;
  window_days: number;
  tolerancia_dias: number;
  umbral_mxn: number;
  umbral_pct_neg: number;
  umbral_pct_pos: number;
  min_kg_hist: number;
}

export function fetchDicfConfig(
  token: string,
  planta: string,
  year: number,
  month: number
): Promise<DicfConfig> {
  return apiFetch<DicfConfig>("/api/dashboard/dicf-config", {
    token,
    params: { planta, year: String(year), month: String(month) },
  });
}

export function postDicfConfig(
  token: string,
  body: { planta: string; year: number; month: number; window_days?: number; tolerancia_dias?: number; umbral_mxn?: number; umbral_pct_neg?: number; umbral_pct_pos?: number; min_kg_hist?: number }
): Promise<{ ok: boolean; planta: string; year: number; month: number; window_days: number }> {
  return apiFetch("/api/dashboard/dicf-config", {
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

export function postFolioCotizacion(
  token: string,
  folioId: number,
  body: { fileBase64: string; fileName?: string }
): Promise<{ ok: boolean }> {
  return apiFetch(`/api/folios/${folioId}/cotizacion`, {
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

export function patchFolioPrioridad(
  token: string,
  folioId: number,
  prioridad: string | null
): Promise<{ ok: boolean; prioridad: string | null }> {
  return apiFetch(`/api/folios/${folioId}/prioridad`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ prioridad }),
  });
}

export function patchFolioPorRecuperar(
  token: string,
  folioId: number,
  por_recuperar: boolean
): Promise<{ ok: boolean; por_recuperar: boolean }> {
  return apiFetch(`/api/folios/${folioId}/por-recuperar`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ por_recuperar }),
  });
}

export function patchFolioEditar(
  token: string,
  folioId: number,
  payload: {
    beneficiario?: string | null;
    concepto?: string | null;
    descripcion?: string | null;
    importe?: number | null;
    categoria?: string | null;
    subcategoria?: string | null;
    estacion?: string | null;
    unidad?: string | null;
    prioridad?: string | null;
    mes_cargo?: string | null;
    banco?: string | null;
    cuenta_bancaria?: string | null;
    proyecto_id?: number | null;
  }
): Promise<{ ok: boolean; changed?: boolean }> {
  return apiFetch(`/api/folios/${folioId}/editar`, {
    token,
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function postSolicitarPorRecuperar(token: string, folioId: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/folios/${folioId}/solicitar-por-recuperar`, {
    token,
    method: "POST",
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

/** Descarga el PDF del documento Póliza Cheque (formato oficial con datos del folio). */
export async function fetchDocumentoPolizaPdf(token: string, folioId: number): Promise<Blob> {
  const url = getApiUrl(`/api/folios/${folioId}/poliza/documento?format=pdf`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.blob();
}

/** Descarga el PDF documento completo: Póliza (con datos) + Folio (gastos) + Cotización. cuenta y numero_cheque opcionales (para póliza en etapa Director ZP). */
export async function fetchDocumentoCompletoPdf(
  token: string,
  folioId: number,
  opts?: { cuenta?: string; numero_cheque?: string }
): Promise<Blob> {
  let url = getApiUrl(`/api/folios/${folioId}/documento-completo?format=pdf`);
  if (opts?.cuenta?.trim()) url += `&cuenta=${encodeURIComponent(opts.cuenta.trim())}`;
  if (opts?.numero_cheque?.trim()) url += `&numero_cheque=${encodeURIComponent(opts.numero_cheque.trim())}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.blob();
}
