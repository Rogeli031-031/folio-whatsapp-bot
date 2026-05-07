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

/** Mes calendario siguiente a (year, month), para la hoja "Proy cat/sub mes" en el mismo Excel. */
function nextCalendarMonth(year: number, month: number): { y: number; m: number } {
  if (month === 12) return { y: year + 1, m: 1 };
  return { y: year, m: month + 1 };
}

/**
 * URL para descargar el Excel del Forecast (Provincia Venta/Comisiones + IGF + proyección siguiente mes por cat/sub).
 * Incluye proyeccion_anio/mes = mes siguiente al seleccionado (ej. marzo 2026 → abril 2026).
 */
export function getDashboardExcelDownloadUrl(token: string, year: number, month: number, uploadDay?: string | null): string {
  const base = getApiUrl("/api/arr/dashboard-excel");
  const next = nextCalendarMonth(year, month);
  const up = (uploadDay || "").trim();
  const isYmd = up && /^\d{4}-\d{2}-\d{2}$/.test(up);
  const hasta = isYmd ? `&proyeccion_hasta=${encodeURIComponent(up)}` : "";
  const upload = isYmd ? `&upload_day=${encodeURIComponent(up)}` : "";
  return `${base}?year=${year}&month=${month}&proyeccion_anio=${next.y}&proyeccion_mes=${next.m}${hasta}${upload}&t=${encodeURIComponent(token)}`;
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

// ===========================
// Action Register (Acciones)
// ===========================

export type ActionRegisterTema = "Contrataciones" | "Mantenimiento" | "General" | "Clientes" | "Apoyos" | "Licencias" | "Taller";

export interface ActionRegisterRevision {
  id: number;
  revision_date: string; // YYYY-MM-DD
}

export interface ActionRegisterItem {
  id: number;
  tema: ActionRegisterTema;
  parent_id: number | null;
  title: string;
  responsable: string;
  responsable_usuario_id?: number | null;
  due_date: string | null; // YYYY-MM-DD
  closed: boolean;
  position: number;
  attachments_count?: number;
  /** Indica que este item es una acción DICF inyectada (solo lectura). */
  dicf?: boolean;
  dicf_id?: number;
  dicf_public_code?: string;
  /** sin_compromiso | pendiente | vencido | compromiso_atrasado | hecho */
  dicf_estado?: string;
  dicf_grupo_tipo?: string;
  dicf_canal?: string;
  dicf_subcanal?: string;
  dicf_cliente_nombre?: string;
  dicf_planta_label?: string;
  dicf_compromiso_tarde?: boolean;
  dicf_resultado_cierre?: string | null;
}

export interface ActionRegisterAttachment {
  id: number;
  item_id: number;
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  created_at: string;
}

export interface ActionRegisterRevisionNote {
  id: number;
  revision_id: number;
  body: string;
  author_name: string;
  created_at: string;
  attachments_count?: number;
}

export interface ActionRegisterNoteAttachment {
  id: number;
  note_id: number;
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  created_at: string;
}

export interface ActionRegisterBoardResponse {
  temas: ActionRegisterTema[];
  revisions: ActionRegisterRevision[];
  /** cells[revisionId][tema] = items (incluye subacciones con parent_id) */
  cells: Record<string, Record<string, ActionRegisterItem[]>>;
  /** notes[revisionId] = comentarios del día de esa revisión */
  notes?: Record<string, ActionRegisterRevisionNote[]>;
}

export function fetchActionRegisterResponsables(
  token: string,
  planta_id: number
): Promise<{ usuarios: { id: number; nombre: string; puesto_nombre?: string | null; nombre_persona?: string | null; telefono?: string | null; rol_clave?: string; planta_id?: number | null }[] }> {
  return apiFetch("/api/action-register/responsables", { token, params: { planta_id: String(planta_id) } });
}

export function getActionRegisterExportUrl(token: string, planta_id: number): string {
  const base = getApiUrl("/api/action-register/export");
  return `${base}?planta_id=${encodeURIComponent(String(planta_id))}&t=${encodeURIComponent(token)}`;
}

export function getActionRegisterDailyPdfUrl(token: string, planta_id: number, revision_id: number): string {
  const base = getApiUrl("/api/action-register/export-day-pdf");
  return `${base}?planta_id=${encodeURIComponent(String(planta_id))}&revision_id=${encodeURIComponent(String(revision_id))}&t=${encodeURIComponent(token)}`;
}

export function fetchActionRegisterBoard(token: string, planta_id: number): Promise<ActionRegisterBoardResponse> {
  return apiFetch<ActionRegisterBoardResponse>("/api/action-register/board", { token, params: { planta_id: String(planta_id) } });
}

export function fetchActionRegisterRevisions(token: string, planta_id: number): Promise<{ revisions: ActionRegisterRevision[] }> {
  return apiFetch<{ revisions: ActionRegisterRevision[] }>("/api/action-register/revisions", { token, params: { planta_id: String(planta_id) } });
}

export function createActionRegisterRevision(token: string, planta_id: number, revision_date: string): Promise<{ revision: ActionRegisterRevision }> {
  return apiFetch<{ revision: ActionRegisterRevision }>("/api/action-register/revisions", {
    token,
    method: "POST",
    body: JSON.stringify({ planta_id, revision_date }),
  });
}

export function createActionRegisterItem(
  token: string,
  input: {
    planta_id: number;
    revision_id: number;
    tema: ActionRegisterTema;
    parent_id?: number | null;
    title: string;
    responsable?: string;
    responsable_usuario_id?: number | null;
    due_date?: string | null;
  }
): Promise<{ item: ActionRegisterItem; notificacion?: { ok: boolean; error?: string } | null }> {
  return apiFetch<{ item: ActionRegisterItem; notificacion?: { ok: boolean; error?: string } | null }>("/api/action-register/items", {
    token,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function addActionRegisterEntry(token: string, revision_id: number, item_id: number): Promise<{ ok: true; position: number }> {
  return apiFetch<{ ok: true; position: number }>("/api/action-register/entries", {
    token,
    method: "POST",
    body: JSON.stringify({ revision_id, item_id }),
  });
}

export function patchActionRegisterItem(
  token: string,
  id: number,
  patch: Partial<Pick<ActionRegisterItem, "title" | "responsable" | "responsable_usuario_id" | "due_date" | "closed">>
): Promise<{ item: Omit<ActionRegisterItem, "position"> & { position?: number } }> {
  return apiFetch<{ item: Omit<ActionRegisterItem, "position"> & { position?: number } }>(`/api/action-register/items/${id}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function fetchActionRegisterAttachments(
  token: string,
  itemId: number
): Promise<{ attachments: ActionRegisterAttachment[] }> {
  return apiFetch<{ attachments: ActionRegisterAttachment[] }>(`/api/action-register/items/${itemId}/attachments`, { token });
}

export function uploadActionRegisterAttachment(
  token: string,
  itemId: number,
  body: { fileBase64: string; fileName: string; contentType: string }
): Promise<{ attachment: ActionRegisterAttachment }> {
  return apiFetch<{ attachment: ActionRegisterAttachment }>(`/api/action-register/items/${itemId}/attachments`, {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteActionRegisterAttachment(
  token: string,
  attachmentId: number
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/action-register/attachments/${attachmentId}`, {
    token,
    method: "DELETE",
  });
}

export function getActionRegisterAttachmentUrl(token: string, attachmentId: number): string {
  const base = getApiUrl(`/api/action-register/attachments/${attachmentId}`);
  return `${base}?t=${encodeURIComponent(token)}`;
}

export function fetchActionRegisterRevisionNotes(
  token: string,
  revisionId: number
): Promise<{ notes: ActionRegisterRevisionNote[] }> {
  return apiFetch<{ notes: ActionRegisterRevisionNote[] }>(`/api/action-register/revisions/${revisionId}/notes`, { token });
}

export function createActionRegisterRevisionNote(
  token: string,
  revisionId: number,
  body: string
): Promise<{ note: ActionRegisterRevisionNote }> {
  return apiFetch<{ note: ActionRegisterRevisionNote }>(`/api/action-register/revisions/${revisionId}/notes`, {
    token,
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function deleteActionRegisterRevisionNote(
  token: string,
  noteId: number
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/action-register/notes/${noteId}`, {
    token,
    method: "DELETE",
  });
}

export function patchActionRegisterRevisionNote(
  token: string,
  noteId: number,
  body: string
): Promise<{ note: ActionRegisterRevisionNote }> {
  return apiFetch<{ note: ActionRegisterRevisionNote }>(`/api/action-register/notes/${noteId}`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
}

// ===========================
// Fotos de acciones DICF
// ===========================

export interface DicfAttachment {
  id: number;
  dicf_accion_id: number;
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  created_at: string;
}

export function fetchDicfAttachments(
  token: string,
  dicfAccionId: number
): Promise<{ attachments: DicfAttachment[] }> {
  return apiFetch<{ attachments: DicfAttachment[] }>(`/api/dicf-acciones/${dicfAccionId}/attachments`, { token });
}

export function uploadDicfAttachment(
  token: string,
  dicfAccionId: number,
  body: { fileBase64: string; fileName: string; contentType: string }
): Promise<{ attachment: DicfAttachment }> {
  return apiFetch<{ attachment: DicfAttachment }>(`/api/dicf-acciones/${dicfAccionId}/attachments`, {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteDicfAttachment(
  token: string,
  attachmentId: number
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/dicf-attachments/${attachmentId}`, {
    token,
    method: "DELETE",
  });
}

export function getDicfAttachmentUrl(token: string, attachmentId: number): string {
  const base = getApiUrl(`/api/dicf-attachments/${attachmentId}`);
  return `${base}?t=${encodeURIComponent(token)}`;
}

// ===========================
// Fotos de comentarios del día (notas por revisión)
// ===========================

export function fetchActionRegisterNoteAttachments(
  token: string,
  noteId: number
): Promise<{ attachments: ActionRegisterNoteAttachment[] }> {
  return apiFetch<{ attachments: ActionRegisterNoteAttachment[] }>(`/api/action-register/notes/${noteId}/attachments`, { token });
}

export function uploadActionRegisterNoteAttachment(
  token: string,
  noteId: number,
  body: { fileBase64: string; fileName: string; contentType: string }
): Promise<{ attachment: ActionRegisterNoteAttachment }> {
  return apiFetch<{ attachment: ActionRegisterNoteAttachment }>(`/api/action-register/notes/${noteId}/attachments`, {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteActionRegisterNoteAttachment(
  token: string,
  attachmentId: number
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/action-register/note-attachments/${attachmentId}`, {
    token,
    method: "DELETE",
  });
}

export function getActionRegisterNoteAttachmentUrl(token: string, attachmentId: number): string {
  const base = getApiUrl(`/api/action-register/note-attachments/${attachmentId}`);
  return `${base}?t=${encodeURIComponent(token)}`;
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
  beneficiario?: string | null;
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
  proyecto_id?: number | null;
  proyecto_codigo?: string | null;
  proyecto_nombre?: string | null;
  prestamo_a_planta?: string | null;
  /** Etapa visual del kanban (ej. "Pendiente aprobación planta"). Solo en datos aplanados del resumen. */
  etapa_label?: string | null;
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
  /** Valores IGF crudos (última versión cargada) antes del recálculo en servidor; usados en comparación "mes anterior". */
  util_oper_kg_igf?: number | null;
  util_oper_importe_igf?: number | null;
  resultado_final_kg_igf?: number | null;
  resultado_final_importe_igf?: number | null;
  gasto_kg_igf?: number | null;
  [k: string]: string | number | null | undefined;
}

export interface IgfForecastResponse {
  year: number;
  month: number;
  version_id: number | null;
  version_number: number | null;
  rows: IgfForecastRow[];
  totales: Record<string, number | null> | null;
  /** Si se pidió `include_mini=1` en GET /api/dashboard/igf-forecast (evita segunda petición al mini). */
  mini?: IgfForecastMiniResponse;
}

export interface PresupuestoDetalleItem {
  categoria: string;
  subcategoria: string;
  monto_aprobado: number;
}

export interface PresupuestoDetalleResponse {
  planta: string;
  periodo: string;
  detalle: PresupuestoDetalleItem[];
}

export function fetchPresupuestoDetalle(
  token: string,
  planta: string,
  periodo: string
): Promise<PresupuestoDetalleResponse> {
  return apiFetch<PresupuestoDetalleResponse>("/api/dashboard/presupuesto-detalle", {
    token,
    params: { planta, periodo },
  });
}

export type IgfFolioDetalleTipo = "aprob_zp" | "carro" | "deposito_cierre" | "inversiones";

export interface IgfFolioDetalleItem {
  id: number;
  numero_folio: string | null;
  folio_codigo: string | null;
  planta_id: number | null;
  planta_nombre: string | null;
  importe: number | null;
  estatus: string | null;
  categoria: string | null;
  subcategoria: string | null;
  descripcion: string;
  mes_cargo: string | null;
}

export interface IgfFolioDetalleResponse {
  empresa: string;
  periodo: string;
  tipo: IgfFolioDetalleTipo;
  folios: IgfFolioDetalleItem[];
}

export interface IgfForecastMiniRow {
  empresa: string;
  /** Código provincia (hoja Pronostico); null en fila Zona. */
  plant_code?: string | null;
  ventaTon: number;
  margen: number;
  comDesc: number;
  impuestos: number;
  hgKg: number;
  ingreso: number;
  operativos: number;
  corporativos: number;
  gasto: number;
  utilOperImporte: number;
  resultadoFinalImporte: number;
}

export interface IgfForecastMiniResponse {
  ok: boolean;
  year: number;
  month: number;
  upload_day: string | null;
  rows: IgfForecastMiniRow[];
  zona: IgfForecastMiniRow;
}

export interface PronosticoDetalleDay {
  fecha: string;
  venta_ton: number | null;
  desc_ratio: number | null;
  selected: boolean;
}

/** Misma forma que la tabla «venta (ton)» de la hoja Pronostico en Excel. */
export interface PronosticoVentaSheetWeek {
  label: string;
  dow: (number | string | null)[];
  total_semana: number | string | null;
  /** Por columna DOW: hist | lookback | pending | "" (misma semántica que Excel amarillo/azul). */
  cell_bg?: ("hist" | "lookback" | "pending" | "")[];
  /** Días que entran en el cálculo del PROM (borde rojo). */
  prom_highlight?: boolean[];
  /** YYYY-MM-DD por columna (para clic = alternar inclusión en PROM). */
  cell_fecha?: (string | "")[];
}

export interface PronosticoVentaSheet {
  title: string;
  year_month: string;
  columns: string[];
  weeks: PronosticoVentaSheetWeek[];
  prom_mes_dow: (number | string)[];
  prom_mes_total: number;
  total_mes_dow: number[];
  total_mes_sum: number;
  por_comprar_dow: (number | string)[];
  por_comprar_sum: number;
  proy_dow: number[];
  proy_total_ton: number;
}

export interface PronosticoDetalleResponse {
  ok: boolean;
  plant_code: string;
  year: number;
  month: number;
  corte_day: string;
  lookback_start: string | null;
  lookback_end: string | null;
  /** Lunes ISO de la semana del inicio del lookback (celdas amarillas desde aquí hasta lookback_end). */
  lookback_visual_start?: string | null;
  days: PronosticoDetalleDay[];
  venta_sheet?: PronosticoVentaSheet;
  proy_venta_ton: number | null;
  proy_desc_kg: number | null;
  dow_headers?: string[];
}

export function fetchPronosticoDetalle(
  token: string,
  params: { year: number; month: number; plant_code: string; upload_day?: string }
): Promise<PronosticoDetalleResponse> {
  const p: Record<string, string> = {
    year: String(params.year),
    month: String(params.month),
    plant_code: params.plant_code,
  };
  if (params.upload_day) p.upload_day = params.upload_day;
  return apiFetch<PronosticoDetalleResponse>("/api/dashboard/pronostico-detalle", {
    token,
    params: p,
    cache: "no-store",
  });
}

export function postPronosticoDias(
  token: string,
  body: {
    year: number;
    month: number;
    plant_code: string;
    upload_day?: string;
    days: { fecha: string; selected: boolean }[];
  }
): Promise<{ ok: boolean; year: number; month: number; plant_code: string; corte_day: string }> {
  return apiFetch("/api/dashboard/pronostico-dias", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchIgfFoliosDetalle(
  token: string,
  params: { year: number; month: number; empresa: string; tipo: IgfFolioDetalleTipo }
): Promise<IgfFolioDetalleResponse> {
  return apiFetch<IgfFolioDetalleResponse>("/api/dashboard/igf-folios-detalle", {
    token,
    params: {
      year: String(params.year),
      month: String(params.month),
      empresa: params.empresa,
      tipo: params.tipo,
    },
    cache: "no-store",
  });
}

export function fetchIgfForecast(
  token: string,
  params?: { year?: number; month?: number; upload_day?: string; include_mini?: boolean }
): Promise<IgfForecastResponse> {
  const p: Record<string, string> = {};
  if (params?.year != null) p.year = String(params.year);
  if (params?.month != null) p.month = String(params.month);
  if (params?.upload_day) p.upload_day = params.upload_day;
  if (params?.include_mini) p.include_mini = "1";
  return apiFetch<IgfForecastResponse>("/api/dashboard/igf-forecast", {
    token,
    params: Object.keys(p).length ? p : undefined,
    cache: "no-store",
  });
}

export function fetchIgfForecastMini(
  token: string,
  params?: { year?: number; month?: number; upload_day?: string },
  init?: { signal?: AbortSignal }
): Promise<IgfForecastMiniResponse> {
  const p: Record<string, string> = {};
  if (params?.year != null) p.year = String(params.year);
  if (params?.month != null) p.month = String(params.month);
  if (params?.upload_day) p.upload_day = params.upload_day;
  return apiFetch<IgfForecastMiniResponse>("/api/dashboard/igf-forecast-mini", {
    token,
    params: Object.keys(p).length ? p : undefined,
    cache: "no-store",
    signal: init?.signal,
  });
}

export function fetchArrLastUploadDay(
  token: string,
  params: { year: number; month: number }
): Promise<{ ok: boolean; year: number; month: number; upload_day: string | null }> {
  return apiFetch("/api/arr/last-upload-day", {
    token,
    params: { year: String(params.year), month: String(params.month) },
    cache: "no-store",
  });
}

export interface ArrClienteMesRow {
  planta: string;
  cliente: string;
  categoria: string;
  subcategoria: string;
  kg_real: number;
  kg_proyectado: number | null;
  descuento_mxn: number;
  descuento_kg: number | null;
  estatus: string;
}

export interface ArrClientesMesResponse {
  ok: boolean;
  year: number;
  month: number;
  empresa: string;
  planta: string;
  historico: boolean;
  rows: ArrClienteMesRow[];
}

/** Lista de clientes (kg, descuento, estatus) para una empresa/mes — fuente: hoja "Clientes desc mes" del Excel ARR Forecast. */
export function fetchArrClientesMes(
  token: string,
  params: { year: number; month: number; empresa: string; target_kg?: number },
  init?: { signal?: AbortSignal }
): Promise<ArrClientesMesResponse> {
  const q: Record<string, string> = {
    year: String(params.year),
    month: String(params.month),
    empresa: params.empresa,
  };
  if (params.target_kg != null && Number.isFinite(params.target_kg) && params.target_kg > 0) {
    q.target_kg = String(params.target_kg);
  }
  return apiFetch<ArrClientesMesResponse>("/api/dashboard/arr-clientes-mes", {
    token,
    params: q,
    cache: "no-store",
    signal: init?.signal,
  });
}

/** Escribe arr.forecast_mensual para todas las plantas provincia (mismo mes). Luego vuelve a cargar IGF con fetchIgfForecast. */
export function postForecastProvincia(
  token: string,
  payload: { year: number; month: number }
): Promise<{
  ok: boolean;
  year: number;
  month: number;
  plants: number;
  results: Array<{ plant_code: string; ok: boolean; error?: string }>;
}> {
  return apiFetch("/api/arr/forecast-provincia", {
    token,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function patchIgfForecastHg(
  token: string,
  payload: {
    year: number;
    month: number;
    empresa: string;
    hg_pct?: number | null;
    hg_kg?: number | null;
    /** Mismo corte que GET / recalcular ARR; sin esto el servidor recalcula util con otro contexto de venta. */
    upload_day?: string | null;
  }
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
  /** Si true, el folio solo es visible para Director ZP y Asistente de Dirección; no se envían notificaciones Twilio excepto a ZP. */
  solo_zp_ad?: boolean;
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

export interface WeeklyDiscountImpactCliente {
  cliente: string | null;
  impacto_estimado: number | null;
  razon: string | null;
}

export interface WeeklyDiscountLecturaResult {
  planta: string;
  fecha_corte: string;
  mes_anterior?: string;
  mes_actual?: string;
  error?: string;
  insuficiente_datos?: boolean;
  descuento_kg_mes_anterior?: number | null;
  descuento_kg_actual?: number | null;
  descuento_kg_proyectado?: number | null;
  descuento_total_mes_anterior?: number;
  descuento_total_actual?: number;
  descuento_total_proyectado?: number;
  venta_kg_mes_anterior?: number;
  venta_kg_actual?: number;
  venta_kg_proyectada?: number;
  cliente_mayor_impacto_negativo?: WeeklyDiscountImpactCliente;
  cliente_mayor_impacto_positivo?: WeeklyDiscountImpactCliente;
  factores_principales?: string[];
  detalle_clientes_relevantes?: Array<Record<string, unknown>>;
  narrativa_whatsapp: string;
}

export function postWeeklyDiscountLectura(
  token: string,
  body: { planta: string; fecha_corte?: string }
): Promise<WeeklyDiscountLecturaResult> {
  return apiFetch<WeeklyDiscountLecturaResult>("/api/dashboard/weekly-discount-lectura", {
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
  acciones_abiertas?: number;
  freqDays?: number;
  daysSinceLast?: number;
  lastPurchaseDate?: string | null;
  daysSinceLastReal?: number | null;
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
  excelData?: {
    dates: string[];
    margen: number;
    clientes: {
      cliente: string;
      estado?: string;
      canal?: string;
      subcanal?: string;
      kgLast30?: number[];
      descKgLast30?: (number | null)[];
      ventaPorMes?: number[];
      descuentoPorMes?: number[];
      kg_mes_real?: number;
      kg_mes_forecast?: number;
      desc_kg_hist?: number;
    }[];
    meses?: { year: number; month: number; label: string }[];
    margenPorMes?: number[];
  };
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

/** URL para descargar Excel de Delta Ingreso Cliente Forecast (3 hojas: venta Ton, desc $/kg, margen). Si se pasa filter, el Excel solo incluye clientes de ese canal/subcanal/tipo. */
export function getDicfExcelUrl(
  token: string,
  planta: string,
  filter?: { tipo: "dejaron" | "nuevos" | "aumentaron" | "disminuyeron"; canal: string; subcanal: string } | null
): string {
  const base = getApiUrl("/api/dashboard/dicf-excel");
  let url = `${base}?planta=${encodeURIComponent(planta)}&t=${encodeURIComponent(token)}`;
  if (filter?.canal != null && filter?.subcanal != null && filter?.tipo) {
    url += `&canal=${encodeURIComponent(filter.canal)}&subcanal=${encodeURIComponent(filter.subcanal)}&tipo=${encodeURIComponent(filter.tipo)}`;
  }
  return url;
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

/** Registro de acciones DICF (ZP / GG / GV). */
export interface DicfAccionRow {
  id: number;
  public_code: string;
  planta_id: number;
  planta_label: string;
  grupo_tipo: string;
  canal: string;
  subcanal: string;
  cliente_nombre: string;
  cliente_key: string;
  descripcion: string;
  responsable_usuario_id: number;
  creado_por_usuario_id: number;
  estado: string;
  compromiso_deadline_at: string;
  fecha_compromiso: string | null;
  compromiso_tarde: boolean;
  cerrado_at: string | null;
  resultado_cierre?: string | null;
  responsable_nombre?: string | null;
  creador_nombre?: string | null;
  cerrado_por_nombre?: string | null;
  created_at?: string;
}

export function postDicfAccionesClienteKey(
  token: string,
  body: { planta: string; grupo_tipo: string; canal?: string; subcanal?: string; cliente_nombre: string }
): Promise<{ cliente_key: string }> {
  return apiFetch("/api/dashboard/dicf-acciones/cliente-key", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchDicfAccionesAsignables(
  token: string,
  planta: string
): Promise<{ usuarios: { id: number; nombre: string; nombre_persona?: string | null; puesto_nombre?: string | null; telefono?: string; rol_clave: string }[] }> {
  return apiFetch("/api/dashboard/dicf-acciones/asignables", { token, params: { planta } });
}

export function fetchDicfAccionLookup(
  token: string,
  publicCode: string
): Promise<{ accion: DicfAccionRow }> {
  return apiFetch("/api/dashboard/dicf-acciones/lookup", {
    token,
    params: { public_code: publicCode.trim() },
  });
}

export function fetchDicfAccionesList(
  token: string,
  params: { planta?: string; cliente_key?: string }
): Promise<{ acciones: DicfAccionRow[] }> {
  const p: Record<string, string> = {};
  if (params.planta) p.planta = params.planta;
  if (params.cliente_key) p.cliente_key = params.cliente_key;
  return apiFetch("/api/dashboard/dicf-acciones", { token, params: p });
}

export function postDicfAccionCreate(
  token: string,
  body: {
    planta: string;
    grupo_tipo: string;
    canal?: string;
    subcanal?: string;
    cliente_nombre: string;
    descripcion: string;
    responsable_usuario_id: number;
  }
): Promise<{ accion: DicfAccionRow; notificacion?: { ok: boolean; error?: string } }> {
  return apiFetch("/api/dashboard/dicf-acciones", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchDicfAccionHistorial(
  token: string,
  accionId: number
): Promise<{ historial: { id: number; evento: string; detalle: unknown; creado_en: string; actor_nombre?: string }[] }> {
  return apiFetch(`/api/dashboard/dicf-acciones/${accionId}/historial`, { token });
}

export function patchDicfAccionCompromiso(
  token: string,
  accionId: number,
  fecha_compromiso: string
): Promise<{ ok?: boolean; accion?: DicfAccionRow; error?: string }> {
  return apiFetch(`/api/dashboard/dicf-acciones/${accionId}/compromiso`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ fecha_compromiso }),
  });
}

export function patchDicfAccionCerrar(
  token: string,
  accionId: number,
  resultado: string
): Promise<{ ok?: boolean; error?: string; accion?: DicfAccionRow }> {
  return apiFetch(`/api/dashboard/dicf-acciones/${accionId}/cerrar`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ resultado: resultado.trim() }),
  });
}

export function getDicfAccionesExcelUrl(token: string, planta?: string): string {
  const base = getApiUrl("/api/dashboard/dicf-acciones-excel");
  let url = `${base}?t=${encodeURIComponent(token)}`;
  if (planta) url += `&planta=${encodeURIComponent(planta)}`;
  return url;
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

export function postFolioFactura(
  token: string,
  folioId: number,
  body: { fileBase64: string; fileName?: string }
): Promise<{ ok: boolean }> {
  return apiFetch(`/api/folios/${folioId}/factura`, {
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

/** Descarga solo la cotización adjunta del folio (PDF). */
export async function fetchCotizacionPdf(token: string, folioId: number): Promise<Blob> {
  const url = getApiUrl(`/api/folios/${folioId}/cotizacion`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.blob();
}

/** Descarga el PDF "Solo formato del folio" (usa plantilla S3 FOLIO_TEMPLATE_S3_KEY si está configurada). */
export async function fetchDocumentoFolioPdf(token: string, folioId: number): Promise<Blob> {
  const url = getApiUrl(`/api/folios/${folioId}/documento-folio`);
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
