"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRoleFromDashboardToken } from "@/lib/auth";
import DeltaIngresoClienteForecastModal from "@/components/DeltaIngresoClienteForecastModal";
import ArrSimularIngresoModal from "@/components/ArrSimularIngresoModal";
import {
  fetchIgfForecast,
  fetchIgfVersiones,
  fetchArrClientesMes,
  fetchArrLastUploadDay,
  type IgfForecastRow,
  type IgfForecastMiniRow,
  type IgfPeriodo,
  type ArrClienteMesRow,
} from "@/lib/api";
import {
  IGF_MINI_RESUMEN_LABELS,
  MESES,
  fmtNum,
  findRowByPlanta,
  normalizeEmpresa,
} from "@/lib/igf-kpi-ui";
import { downloadArrDashboardExcel } from "@/lib/arr-export-excel";

const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

type IgfMonthData = {
  rows: IgfForecastRow[];
  miniRows: IgfForecastMiniRow[];
};

type ClientesMonthData = {
  historico: boolean;
  rows: ArrClienteMesRow[];
};

/** Query `?arr_plan=1`: misma UI que ARR con caches independientes para escenarios manuales. */
const ARR_PLAN_QUERY = "arr_plan";

type ArrWorkspaceId = "base" | "plan";

type ArrWorkspaceSlice = {
  selA: string;
  selB: string;
  dataByKey: Record<string, IgfMonthData>;
  loadingKeys: Set<string>;
  errorByKey: Record<string, string>;
  clientesByKey: Record<string, ClientesMonthData>;
  clientesLoadingKeys: Set<string>;
  clientesErrorByKey: Record<string, string>;
  /** Clientes marcados: sin venta en el mes forecast (columna B); restan kg al total y recalculan desc. ponderado. */
  clientesExcluirVentaForecast: Record<string, true>;
};

function emptyArrWorkspaceSlice(): ArrWorkspaceSlice {
  return {
    selA: "",
    selB: "",
    dataByKey: {},
    loadingKeys: new Set(),
    errorByKey: {},
    clientesByKey: {},
    clientesLoadingKeys: new Set(),
    clientesErrorByKey: {},
    clientesExcluirVentaForecast: {},
  };
}

/** Inicializa selectores de mes cuando aún no hay selección (ARR y ARR Plan por separado). */
function pickInitialSels(
  sorted: IgfPeriodo[],
  selA: string,
  selB: string
): { selA: string; selB: string } | null {
  if (sorted.length >= 2 && !selA && !selB) {
    return {
      selA: periodoKey(sorted[sorted.length - 2].year, sorted[sorted.length - 2].month),
      selB: periodoKey(sorted[sorted.length - 1].year, sorted[sorted.length - 1].month),
    };
  }
  if (sorted.length === 1 && !selA) {
    return { selA: periodoKey(sorted[0].year, sorted[0].month), selB };
  }
  return null;
}

type RowValues = {
  operativos: number | null;
  corporativos: number | null;
  gastoImporte: number | null;
  margenKg: number | null;
  hgPct: number | null;
  hgKg: number | null;
  comDescKg: number | null;
  /** Impuestos $/kg (IGF / mini resumen). */
  impuestoKg: number | null;
  ventaTon: number | null;
  /** Resultado Final - Importe (Excel hoja IGF). */
  rentabilidadImporte: number | null;
};

function periodoKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function findMiniRow(
  miniRows: IgfForecastMiniRow[],
  empresaLabel: string
): IgfForecastMiniRow | undefined {
  if (!empresaLabel) return undefined;
  const target = normalizeEmpresa(empresaLabel);
  return miniRows.find((r) => normalizeEmpresa(r.empresa || "") === target);
}

function computeRowValues(
  data: IgfMonthData | undefined,
  empresaLabel: string
): RowValues {
  if (!data || !empresaLabel) {
    return {
      operativos: null,
      corporativos: null,
      gastoImporte: null,
      margenKg: null,
      hgPct: null,
      hgKg: null,
      comDescKg: null,
      impuestoKg: null,
      ventaTon: null,
      rentabilidadImporte: null,
    };
  }
  const forecastRow = findRowByPlanta(data.rows, empresaLabel);
  const miniRow = findMiniRow(data.miniRows, empresaLabel);
  return {
    operativos: miniRow?.operativos ?? null,
    corporativos: miniRow?.corporativos ?? null,
    gastoImporte: miniRow?.gasto ?? null,
    margenKg: forecastRow?.margen_kg ?? null,
    hgPct: forecastRow?.hg_pct ?? null,
    hgKg: forecastRow?.hg_kg ?? null,
    comDescKg: forecastRow?.com_desc_kg ?? null,
    impuestoKg: forecastRow?.impuesto_kg ?? miniRow?.impuestos ?? null,
    /** Misma «Venta» que la tabla mini IGF (pronóstico PROY), no solo venta_ton del compromiso. */
    ventaTon: miniRow?.ventaTon ?? forecastRow?.venta_ton ?? null,
    /** Misma columna «Resultado Final − Importe» que la tabla mini IGF (no solo fila compromiso). */
    rentabilidadImporte:
      miniRow?.resultadoFinalImporte ?? forecastRow?.resultado_final_importe ?? null,
  };
}

function periodoLabel(key: string): string {
  if (!key) return "";
  const [yStr, mStr] = key.split("-");
  const m = parseInt(mStr, 10);
  return `${NOMBRES_MES[m - 1] ?? MESES[m - 1] ?? ""} ${yStr}`;
}

function periodoMesNombre(key: string): string {
  if (!key) return "";
  const m = parseInt(key.split("-")[1] ?? "", 10);
  return NOMBRES_MES[m - 1] ?? MESES[m - 1] ?? "";
}

/** Métricas mostradas en la tabla resumen (una fila por mes). */
type ResumenMesMetrics = {
  operativos: number | null;
  corporativos: number | null;
  gastoImporte: number | null;
  margenKg: number | null;
  hgDisplay: number | null;
  hgDinero: number | null;
  descuentoSigned: number | null;
  impuestoKg: number | null;
  ventaTon: number | null;
  rentabilidadImporte: number | null;
};

function resumenMesMetrics(vals: RowValues): ResumenMesMetrics {
  const hgDisplay = vals.hgPct != null ? vals.hgPct * 100 : null;
  const hgDinero =
    vals.hgKg != null && vals.hgPct != null && vals.hgPct !== 0
      ? Math.abs(vals.hgKg / vals.hgPct)
      : null;
  const descuentoSigned =
    vals.comDescKg != null ? -Math.abs(vals.comDescKg) : null;
  return {
    operativos: vals.operativos,
    corporativos: vals.corporativos,
    gastoImporte: vals.gastoImporte,
    margenKg: vals.margenKg,
    hgDisplay,
    hgDinero,
    descuentoSigned,
    impuestoKg: vals.impuestoKg,
    ventaTon: vals.ventaTon,
    rentabilidadImporte: vals.rentabilidadImporte,
  };
}

function fmtDeltaMoney(d: number, decimals = 0): string {
  const sign = d < 0 ? "-" : "";
  return `${sign}$${fmtNum(Math.abs(d), decimals)}`;
}

function mesHistorico(year: number, month: number): boolean {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  return year < cy || (year === cy && month < cm);
}

/** true si el mes del selector YYYY-MM ya terminó (rentabilidad = Σ clientes − Gasto). */
function mesHistoricoDesdeSelector(sel: string): boolean {
  const [yStr, mStr] = sel.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return true;
  return mesHistorico(y, m);
}

/**
 * Rentabilidad mostrada: Resultado Final − Importe (mini IGF / cierre), alineado al Excel IGF.
 * Si no hay dato IGF, cae a Σ ingreso clientes − Gasto (ARR).
 */
function rentabilidadResumenPorMes(
  sel: string,
  rentabilidadArr: number | null,
  rentabilidadIgf: number | null
): number | null {
  if (!sel) return null;
  const [yStr, mStr] = sel.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  return rentabilidadIgf ?? rentabilidadArr;
}

function targetKgDesdeIgfTon(
  data: IgfMonthData | undefined,
  empresaLabel: string,
  historico: boolean
): number | undefined {
  if (historico || !data || !empresaLabel) return undefined;
  const rv = computeRowValues(data, empresaLabel);
  const ton = rv.ventaTon;
  if (ton == null || !Number.isFinite(ton) || ton <= 0) return undefined;
  return Math.round(ton * 1000 * 100) / 100;
}

function clientesCacheKey(
  empresaLabel: string,
  periodo: string,
  data: IgfMonthData | undefined
): string {
  const [y, m] = periodo.split("-").map((s) => parseInt(s, 10));
  const hist = mesHistorico(y, m);
  const tg = targetKgDesdeIgfTon(data, empresaLabel, hist);
  const part = tg != null && tg > 0 ? String(Math.round(tg)) : "db";
  return `${empresaLabel}|${periodo}|tg:${part}`;
}

/** Ingreso cliente (pesos): misma expresión que el Excel exportado (margen y HG del mes). */
function ingresoClienteMarginal(
  kg: number,
  descKg: number | null,
  m: ResumenMesMetrics
): number | null {
  if (kg <= 0) return null;
  const margen = m.margenKg;
  const hg = m.hgDisplay;
  const hgDin = m.hgDinero;
  if (margen == null || hg == null || hgDin == null) return null;
  const d = descKg ?? 0;
  const raw = kg * (margen - d) + (hg * kg * hgDin) / 100;
  return Math.round(raw);
}

/** Venta del cliente para el mes: kg proyectado (mes en curso) o kg real (mes histórico). */
function clienteVenta(row: ArrClienteMesRow, historico: boolean): number {
  if (!historico && row.kg_proyectado != null) return row.kg_proyectado;
  return row.kg_real;
}

/** Clasifica categoría ARR (Casa vs Comisionista), sin acentos. */
function categoriaEsComisionista(categoria: string): boolean {
  const n = String(categoria || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return n.includes("comisionista");
}

/** Toneladas reales y proyectadas (planta) desde filas `/arr-clientes-mes`. */
function ventaTonRealYProyectadaDesdeClientes(
  clientes: ClientesMonthData | undefined,
  excluirForecast: Record<string, true> | undefined
): { realTon: number | null; proyTon: number | null } {
  if (!clientes?.rows?.length) return { realTon: null, proyTon: null };
  let realKg = 0;
  let proyKg = 0;
  for (const r of clientes.rows) {
    realKg += Number(r.kg_real) || 0;
    if (!clientes.historico) {
      const ex = excluirForecast?.[r.cliente.trim()];
      if (!ex && r.kg_proyectado != null) proyKg += Number(r.kg_proyectado) || 0;
    }
  }
  return {
    realTon: Math.round((realKg / 1000) * 100) / 100,
    proyTon: clientes.historico ? null : Math.round((proyKg / 1000) * 100) / 100,
  };
}

/** Toneladas por categoría: mes cerrado = real; mes forecast = proyectado (respeta exclusiones). */
function toneladasCategoriaDesdeClientes(
  clientes: ClientesMonthData | undefined,
  excluirForecast: Record<string, true> | undefined
): { casa: number | null; comisionista: number | null } {
  if (!clientes?.rows?.length) return { casa: null, comisionista: null };
  let casaKg = 0;
  let comiKg = 0;
  const hist = clientes.historico;
  for (const r of clientes.rows) {
    const comi = categoriaEsComisionista(r.categoria);
    const kg = hist
      ? Number(r.kg_real) || 0
      : (() => {
          const ex = excluirForecast?.[r.cliente.trim()];
          if (ex) return 0;
          return r.kg_proyectado != null ? Number(r.kg_proyectado) || 0 : 0;
        })();
    if (comi) comiKg += kg;
    else casaKg += kg;
  }
  const toT = (kg: number) => Math.round((kg / 1000) * 100) / 100;
  return { casa: toT(casaKg), comisionista: toT(comiKg) };
}

type ClienteTablaRow = {
  cliente: string;
  ventaA: number | null;
  ventaB: number | null;
  descA: number | null;
  descB: number | null;
  deltaVenta: number;
  deltaDesc: number;
  ingresoA: number | null;
  ingresoB: number | null;
  deltaIngreso: number;
  /** Solo aparecen abajo: están en mes B y no en mes A */
  soloNuevo: boolean;
};

/** Ajuste venta (t) y descuento $/kg del mes forecast al excluir clientes (ponderado por kg). */
function applyExclusionsToMetricB(
  metricB: ResumenMesMetrics,
  clientesB: ClientesMonthData | undefined,
  filasPrimero: ClienteTablaRow[],
  filasSolo: ClienteTablaRow[],
  excluir: Record<string, true> | undefined
): ResumenMesMetrics {
  if (!clientesB || clientesB.historico || !excluir || Object.keys(excluir).length === 0) {
    return metricB;
  }
  const ton = metricB.ventaTon;
  const descSigned = metricB.descuentoSigned;
  if (ton == null || !Number.isFinite(ton) || descSigned == null || !Number.isFinite(descSigned)) {
    return metricB;
  }
  let sumKg = 0;
  let sumDescKg = 0;
  for (const row of [...filasPrimero, ...filasSolo]) {
    if (!excluir[row.cliente]) continue;
    const kg = row.ventaB;
    if (kg == null || !Number.isFinite(kg) || kg <= 0) continue;
    sumKg += kg;
    const d = row.descB;
    if (d != null && Number.isFinite(d)) sumDescKg += d * kg;
  }
  if (sumKg <= 0) return metricB;
  const totalKg0 = ton * 1000;
  const newKg = totalKg0 - sumKg;
  if (!Number.isFinite(newKg) || newKg <= 0) return metricB;
  const numer = descSigned * totalKg0 + sumDescKg;
  const newDesc = numer / newKg;
  return {
    ...metricB,
    ventaTon: newKg / 1000,
    descuentoSigned: newDesc,
  };
}

/** Rentabilidad ARR (como Excel L5/L6): Σ ingreso por cliente − Gasto (mini). */
function rentabilidadArrDesdeFilas(
  filasPrimero: ClienteTablaRow[],
  filasSoloMesB: ClienteTablaRow[],
  gastoImporte: number | null,
  mes: "A" | "B"
): number | null {
  if (gastoImporte == null || !Number.isFinite(gastoImporte)) return null;
  let sumIng = 0;
  if (mes === "A") {
    for (const r of filasPrimero) sumIng += r.ingresoA ?? 0;
    for (const r of filasSoloMesB) sumIng += r.ingresoA ?? 0;
  } else {
    for (const r of filasPrimero) sumIng += r.ingresoB ?? 0;
    for (const r of filasSoloMesB) sumIng += r.ingresoB ?? 0;
  }
  return Math.round(sumIng - gastoImporte);
}

export default function ArrClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("t") ?? "";
  const empresa = searchParams?.get("empresa") ?? "";
  const dashboardRole = useMemo(() => (token ? getRoleFromDashboardToken(token) : null), [token]);
  const canDicfAcciones =
    dashboardRole === "ZP" ||
    dashboardRole === "GG" ||
    dashboardRole === "GV" ||
    dashboardRole === "AD";
  const uploadDayFromUrl = (searchParams?.get("upload_day") ?? "").trim().slice(0, 10);
  const backHref = token ? `/igf-forecast?t=${encodeURIComponent(token)}` : "/igf-forecast";
  const isArrPlanRoute = (searchParams?.get(ARR_PLAN_QUERY) ?? "") === "1";

  const lastUploadByYmRef = useRef<Record<string, string>>({});

  const [periodos, setPeriodos] = useState<IgfPeriodo[]>([]);
  const [periodosError, setPeriodosError] = useState<string | null>(null);
  const [wsBase, setWsBase] = useState<ArrWorkspaceSlice>(() => emptyArrWorkspaceSlice());
  const [wsPlan, setWsPlan] = useState<ArrWorkspaceSlice>(() => emptyArrWorkspaceSlice());
  const [dicfModalCliente, setDicfModalCliente] = useState<string | null>(null);
  const [showSimular, setShowSimular] = useState(false);

  const ws = isArrPlanRoute ? wsPlan : wsBase;
  const dataByKey = ws.dataByKey;
  const loadingKeys = ws.loadingKeys;
  const errorByKey = ws.errorByKey;
  const selA = ws.selA;
  const selB = ws.selB;
  const clientesByKey = ws.clientesByKey;
  const clientesLoadingKeys = ws.clientesLoadingKeys;
  const clientesErrorByKey = ws.clientesErrorByKey;
  const clientesExcluirVentaForecast = ws.clientesExcluirVentaForecast;

  const setSelAUi = useCallback(
    (v: string) => {
      if (isArrPlanRoute) setWsPlan((s) => ({ ...s, selA: v }));
      else setWsBase((s) => ({ ...s, selA: v }));
    },
    [isArrPlanRoute]
  );
  const setSelBUi = useCallback(
    (v: string) => {
      const patch = (s: ArrWorkspaceSlice) => ({
        ...s,
        selB: v,
        ...(v !== s.selB ? { clientesExcluirVentaForecast: {} } : {}),
      });
      if (isArrPlanRoute) setWsPlan(patch);
      else setWsBase(patch);
    },
    [isArrPlanRoute]
  );

  const toggleClienteExcluirForecast = useCallback(
    (clienteNombre: string) => {
      const k = clienteNombre.trim();
      if (!k) return;
      const patch = (s: ArrWorkspaceSlice) => {
        const next = { ...s.clientesExcluirVentaForecast };
        if (next[k]) delete next[k];
        else next[k] = true;
        return { ...s, clientesExcluirVentaForecast: next };
      };
      if (isArrPlanRoute) setWsPlan(patch);
      else setWsBase(patch);
    },
    [isArrPlanRoute]
  );

  const toggleArrPlanHref = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (isArrPlanRoute) params.delete(ARR_PLAN_QUERY);
    else params.set(ARR_PLAN_QUERY, "1");
    const qs = params.toString();
    return qs ? `/arr?${qs}` : "/arr";
  }, [searchParams, isArrPlanRoute]);

  const handleEmpresaChange = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (next) {
        params.set("empresa", next);
      } else {
        params.delete("empresa");
      }
      if (isArrPlanRoute) setWsPlan((s) => ({ ...s, clientesExcluirVentaForecast: {} }));
      else setWsBase((s) => ({ ...s, clientesExcluirVentaForecast: {} }));
      const qs = params.toString();
      router.replace(qs ? `/arr?${qs}` : "/arr");
    },
    [router, searchParams, isArrPlanRoute]
  );

  /** Misma fecha de corte que IGF: query opcional o última carga del mes (fetchArrLastUploadDay). */
  const resolveUploadDayForMonth = useCallback(
    async (year: number, month: number): Promise<string | undefined> => {
      if (uploadDayFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(uploadDayFromUrl)) {
        const uy = parseInt(uploadDayFromUrl.slice(0, 4), 10);
        const um = parseInt(uploadDayFromUrl.slice(5, 7), 10);
        if (uy === year && um === month) return uploadDayFromUrl;
      }
      const ym = `${year}-${String(month).padStart(2, "0")}`;
      const cached = lastUploadByYmRef.current[ym];
      if (cached && /^\d{4}-\d{2}-\d{2}$/.test(cached)) return cached;
      try {
        const r = await fetchArrLastUploadDay(token, { year, month });
        const u = (r?.upload_day ?? "").trim().slice(0, 10);
        if (u && /^\d{4}-\d{2}-\d{2}$/.test(u)) {
          lastUploadByYmRef.current[ym] = u;
          return u;
        }
      } catch {
        /* vacío: el backend usa fin de mes como corte */
      }
      return undefined;
    },
    [token, uploadDayFromUrl]
  );

  useEffect(() => {
    if (!token) return;
    setWsBase(emptyArrWorkspaceSlice());
    setWsPlan(emptyArrWorkspaceSlice());
    lastUploadByYmRef.current = {};
  }, [token, uploadDayFromUrl]);

  // Cargar periodos disponibles para los selectores de mes.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchIgfVersiones(token);
        if (cancelled) return;
        const sorted = [...(r.periodos || [])].sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        });
        setPeriodos(sorted);
        setWsBase((s) => {
          const n = pickInitialSels(sorted, s.selA, s.selB);
          return n ? { ...s, ...n } : s;
        });
        setWsPlan((s) => {
          const n = pickInitialSels(sorted, s.selA, s.selB);
          return n ? { ...s, ...n } : s;
        });
      } catch (e) {
        if (cancelled) return;
        setPeriodosError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Carga IGF Forecast (con mini) para una clave year-month si aún no está cacheada (por espacio ARR / ARR Plan).
  const ensureMonthLoaded = useCallback(
    async (key: string, target: ArrWorkspaceId) => {
      if (!token || !key) return;
      const slice = target === "plan" ? wsPlan : wsBase;
      if (slice.dataByKey[key] || slice.loadingKeys.has(key)) return;
      const setSlice = target === "plan" ? setWsPlan : setWsBase;
      const [yStr, mStr] = key.split("-");
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      if (!Number.isFinite(year) || !Number.isFinite(month)) return;
      setSlice((prev) => {
        const next = new Set(prev.loadingKeys);
        next.add(key);
        return { ...prev, loadingKeys: next };
      });
      try {
        const uploadDay = await resolveUploadDayForMonth(year, month);
        const resp = await fetchIgfForecast(token, {
          year,
          month,
          include_mini: true,
          ...(uploadDay ? { upload_day: uploadDay } : {}),
        });
        const miniRows = resp.mini?.rows ?? [];
        setSlice((prev) => ({
          ...prev,
          dataByKey: {
            ...prev.dataByKey,
            [key]: { rows: resp.rows ?? [], miniRows },
          },
          errorByKey: (() => {
            if (!prev.errorByKey[key]) return prev.errorByKey;
            const next = { ...prev.errorByKey };
            delete next[key];
            return next;
          })(),
        }));
      } catch (e) {
        setSlice((prev) => ({
          ...prev,
          errorByKey: {
            ...prev.errorByKey,
            [key]: e instanceof Error ? e.message : String(e),
          },
        }));
      } finally {
        setSlice((prev) => {
          const next = new Set(prev.loadingKeys);
          next.delete(key);
          return { ...prev, loadingKeys: next };
        });
      }
    },
    [token, wsBase, wsPlan, resolveUploadDayForMonth]
  );

  useEffect(() => {
    if (wsBase.selA) void ensureMonthLoaded(wsBase.selA, "base");
  }, [wsBase.selA, ensureMonthLoaded]);
  useEffect(() => {
    if (wsBase.selB) void ensureMonthLoaded(wsBase.selB, "base");
  }, [wsBase.selB, ensureMonthLoaded]);
  useEffect(() => {
    if (wsPlan.selA) void ensureMonthLoaded(wsPlan.selA, "plan");
  }, [wsPlan.selA, ensureMonthLoaded]);
  useEffect(() => {
    if (wsPlan.selB) void ensureMonthLoaded(wsPlan.selB, "plan");
  }, [wsPlan.selB, ensureMonthLoaded]);

  // Carga lista de clientes para (empresa, mes) si aún no está cacheada (por espacio ARR / ARR Plan).
  const ensureClientesLoaded = useCallback(
    async (
      empresaLabel: string,
      periodo: string,
      data: IgfMonthData | undefined,
      target: ArrWorkspaceId
    ) => {
      if (!token || !empresaLabel || !periodo) return;
      const slice = target === "plan" ? wsPlan : wsBase;
      const cacheKey = clientesCacheKey(empresaLabel, periodo, data);
      if (slice.clientesByKey[cacheKey] || slice.clientesLoadingKeys.has(cacheKey)) return;
      const setSlice = target === "plan" ? setWsPlan : setWsBase;
      const [yStr, mStr] = periodo.split("-");
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      if (!Number.isFinite(year) || !Number.isFinite(month)) return;
      const hist = mesHistorico(year, month);
      const targetKg = targetKgDesdeIgfTon(data, empresaLabel, hist);
      setSlice((prev) => {
        const next = new Set(prev.clientesLoadingKeys);
        next.add(cacheKey);
        return { ...prev, clientesLoadingKeys: next };
      });
      try {
        const resp = await fetchArrClientesMes(token, {
          year,
          month,
          empresa: empresaLabel,
          ...(targetKg != null && targetKg > 0 ? { target_kg: targetKg } : {}),
        });
        setSlice((prev) => ({
          ...prev,
          clientesByKey: {
            ...prev.clientesByKey,
            [cacheKey]: { historico: resp.historico, rows: resp.rows || [] },
          },
          clientesErrorByKey: (() => {
            if (!prev.clientesErrorByKey[cacheKey]) return prev.clientesErrorByKey;
            const next = { ...prev.clientesErrorByKey };
            delete next[cacheKey];
            return next;
          })(),
        }));
      } catch (e) {
        setSlice((prev) => ({
          ...prev,
          clientesErrorByKey: {
            ...prev.clientesErrorByKey,
            [cacheKey]: e instanceof Error ? e.message : String(e),
          },
        }));
      } finally {
        setSlice((prev) => {
          const next = new Set(prev.clientesLoadingKeys);
          next.delete(cacheKey);
          return { ...prev, clientesLoadingKeys: next };
        });
      }
    },
    [token, wsBase, wsPlan]
  );

  useEffect(() => {
    if (empresa && wsBase.selA)
      void ensureClientesLoaded(empresa, wsBase.selA, wsBase.dataByKey[wsBase.selA], "base");
  }, [empresa, wsBase.selA, wsBase.dataByKey[wsBase.selA], ensureClientesLoaded]);
  useEffect(() => {
    if (empresa && wsBase.selB)
      void ensureClientesLoaded(empresa, wsBase.selB, wsBase.dataByKey[wsBase.selB], "base");
  }, [empresa, wsBase.selB, wsBase.dataByKey[wsBase.selB], ensureClientesLoaded]);
  useEffect(() => {
    if (empresa && wsPlan.selA)
      void ensureClientesLoaded(empresa, wsPlan.selA, wsPlan.dataByKey[wsPlan.selA], "plan");
  }, [empresa, wsPlan.selA, wsPlan.dataByKey[wsPlan.selA], ensureClientesLoaded]);
  useEffect(() => {
    if (empresa && wsPlan.selB)
      void ensureClientesLoaded(empresa, wsPlan.selB, wsPlan.dataByKey[wsPlan.selB], "plan");
  }, [empresa, wsPlan.selB, wsPlan.dataByKey[wsPlan.selB], ensureClientesLoaded]);

  const rowA = useMemo(() => computeRowValues(dataByKey[selA], empresa), [dataByKey, selA, empresa]);
  const rowB = useMemo(() => computeRowValues(dataByKey[selB], empresa), [dataByKey, selB, empresa]);

  const clientesKeyA =
    empresa && selA ? clientesCacheKey(empresa, selA, dataByKey[selA]) : "";
  const clientesKeyB =
    empresa && selB ? clientesCacheKey(empresa, selB, dataByKey[selB]) : "";
  const clientesA = clientesKeyA ? clientesByKey[clientesKeyA] : undefined;
  const clientesB = clientesKeyB ? clientesByKey[clientesKeyB] : undefined;

  /** Primero: clientes del mes A; después (con separador): solo mes B sin estar en A. */
  const { filasClientesMesPrimero, filasClientesSoloMesSegundo } = useMemo(() => {
    const vacío = { filasClientesMesPrimero: [] as ClienteTablaRow[], filasClientesSoloMesSegundo: [] as ClienteTablaRow[] };
    if (!empresa || !clientesA) return vacío;

    const metA = resumenMesMetrics(computeRowValues(dataByKey[selA], empresa));
    const metB = resumenMesMetrics(computeRowValues(dataByKey[selB], empresa));

    const mapA = new Map<string, ArrClienteMesRow>();
    for (const r of clientesA.rows) {
      const k = r.cliente.trim();
      if (k) mapA.set(k, r);
    }
    const mapB = new Map<string, ArrClienteMesRow>();
    if (clientesB) {
      for (const r of clientesB.rows) {
        const k = r.cliente.trim();
        if (k) mapB.set(k, r);
      }
    }

    const primero: ClienteTablaRow[] = [];
    const clientesMesPrimero = Array.from(mapA.keys()).sort((a, b) => {
      const va = clienteVenta(mapA.get(a)!, clientesA.historico);
      const vb = clienteVenta(mapA.get(b)!, clientesA.historico);
      if (vb !== va) return vb - va;
      return a.localeCompare(b, "es");
    });

    for (const cliente of clientesMesPrimero) {
      const rA = mapA.get(cliente)!;
      const rB = mapB.get(cliente);
      const ventaA = clienteVenta(rA, clientesA.historico);
      const ventaB = rB != null && clientesB ? clienteVenta(rB, clientesB.historico) : null;
      const descA = rA.descuento_kg;
      const descB = rB?.descuento_kg ?? null;
      const vBNum = ventaB ?? 0;
      const dANum = descA ?? 0;
      const dBNum = descB ?? 0;
      const ingresoAAlloc = ingresoClienteMarginal(ventaA, descA, metA);
      const ingresoBAlloc =
        ventaB != null ? ingresoClienteMarginal(ventaB, descB, metB) : null;
      primero.push({
        cliente,
        ventaA,
        ventaB,
        descA,
        descB,
        deltaVenta: vBNum - ventaA,
        deltaDesc: dBNum - dANum,
        ingresoA: ingresoAAlloc,
        ingresoB: ingresoBAlloc,
        deltaIngreso: (ingresoBAlloc ?? 0) - (ingresoAAlloc ?? 0),
        soloNuevo: false,
      });
    }

    const soloSegundo: ClienteTablaRow[] = [];
    if (clientesB) {
      for (const cliente of Array.from(mapB.keys())) {
        if (mapA.has(cliente)) continue;
        const rB = mapB.get(cliente)!;
        const ventaB = clienteVenta(rB, clientesB.historico);
        const descB = rB.descuento_kg;
        const ingresoBCliente = ingresoClienteMarginal(ventaB, descB, metB);
        soloSegundo.push({
          cliente,
          ventaA: 0,
          ventaB,
          descA: 0,
          descB,
          deltaVenta: ventaB,
          deltaDesc: (descB ?? 0) - 0,
          ingresoA: 0,
          ingresoB: ingresoBCliente,
          deltaIngreso: (ingresoBCliente ?? 0) - 0,
          soloNuevo: true,
        });
      }
      soloSegundo.sort((x, y) => {
        const vb = x.ventaB ?? 0;
        const vy = y.ventaB ?? 0;
        if (vy !== vb) return vy - vb;
        return x.cliente.localeCompare(y.cliente, "es");
      });
    }

    return { filasClientesMesPrimero: primero, filasClientesSoloMesSegundo: soloSegundo };
  }, [empresa, clientesA, clientesB, selA, selB, dataByKey]);

  const clientesLoading =
    (!!clientesKeyA && clientesLoadingKeys.has(clientesKeyA)) ||
    (!!clientesKeyB && clientesLoadingKeys.has(clientesKeyB));
  const clientesErrors = [
    clientesKeyA ? clientesErrorByKey[clientesKeyA] : null,
    clientesKeyB ? clientesErrorByKey[clientesKeyB] : null,
  ].filter(Boolean) as string[];

  const loadingClientesParaA = Boolean(
    empresa && selA && clientesKeyA && clientesLoadingKeys.has(clientesKeyA)
  );
  const loadingClientesParaB = Boolean(
    empresa && selB && clientesKeyB && clientesLoadingKeys.has(clientesKeyB)
  );

  const ventaClienteA = useMemo(
    () => ventaTonRealYProyectadaDesdeClientes(clientesA, undefined),
    [clientesA]
  );
  const ventaClienteB = useMemo(
    () => ventaTonRealYProyectadaDesdeClientes(clientesB, clientesExcluirVentaForecast),
    [clientesB, clientesExcluirVentaForecast]
  );
  const catTonA = useMemo(
    () => toneladasCategoriaDesdeClientes(clientesA, undefined),
    [clientesA]
  );
  const catTonB = useMemo(
    () => toneladasCategoriaDesdeClientes(clientesB, clientesExcluirVentaForecast),
    [clientesB, clientesExcluirVentaForecast]
  );

  const renderMesOption = (p: IgfPeriodo) => {
    const key = periodoKey(p.year, p.month);
    const label = periodoLabel(key);
    return (
      <option key={key} value={key}>
        {label}
      </option>
    );
  };

  const renderValueCell = (
    sel: string,
    val: number | null,
    formatter: (v: number) => string,
    money: boolean
  ) => {
    if (!sel) return <span className="text-slate-500">—</span>;
    if (loadingKeys.has(sel) && !dataByKey[sel]) {
      return <span className="text-slate-500">…</span>;
    }
    if (errorByKey[sel]) {
      return <span className="text-red-400">Error</span>;
    }
    if (!empresa) return <span className="text-slate-500">—</span>;
    if (val == null || Number.isNaN(val)) return <span className="text-slate-500">—</span>;
    return (
      <span>
        {money ? "$" : ""}
        {formatter(val)}
      </span>
    );
  };

  const headerVentaA = selA ? `Venta ${periodoMesNombre(selA)}` : "Venta —";
  const headerVentaB = selB ? `Venta ${periodoMesNombre(selB)}` : "Venta —";
  const headerDescA = selA ? `Descuento ${periodoMesNombre(selA)}` : "Descuento —";
  const headerDescB = selB ? `Descuento ${periodoMesNombre(selB)}` : "Descuento —";
  const headerIngresoA = selA ? `Ingreso ${periodoMesNombre(selA)}` : "Ingreso —";
  const headerIngresoB = selB ? `Ingreso ${periodoMesNombre(selB)}` : "Ingreso —";

  const comparacionLabel =
    selA && selB
      ? `${periodoMesNombre(selB)} − ${periodoMesNombre(selA)}`
      : "";

  const metricA = useMemo(() => resumenMesMetrics(rowA), [rowA]);
  const metricB = useMemo(() => resumenMesMetrics(rowB), [rowB]);

  const metricBResumen = useMemo(
    () =>
      applyExclusionsToMetricB(
        metricB,
        clientesB,
        filasClientesMesPrimero,
        filasClientesSoloMesSegundo,
        clientesExcluirVentaForecast
      ),
    [
      metricB,
      clientesB,
      filasClientesMesPrimero,
      filasClientesSoloMesSegundo,
      clientesExcluirVentaForecast,
    ]
  );

  const showExcluirForecastCheckbox = Boolean(empresa && clientesB && !clientesB.historico);

  /** Misma definición que Excel L5/L6: SUM(ingresos clientes) − Gasto. */
  const rentabilidadArrA = useMemo(() => {
    if (!clientesA) return null;
    return rentabilidadArrDesdeFilas(
      filasClientesMesPrimero,
      filasClientesSoloMesSegundo,
      metricA.gastoImporte,
      "A"
    );
  }, [
    clientesA,
    filasClientesMesPrimero,
    filasClientesSoloMesSegundo,
    metricA.gastoImporte,
  ]);

  const rentabilidadArrB = useMemo(() => {
    if (!clientesB) return null;
    return rentabilidadArrDesdeFilas(
      filasClientesMesPrimero,
      filasClientesSoloMesSegundo,
      metricB.gastoImporte,
      "B"
    );
  }, [
    clientesB,
    filasClientesMesPrimero,
    filasClientesSoloMesSegundo,
    metricB.gastoImporte,
  ]);

  const rentabilidadMostradaA = useMemo(
    () => rentabilidadResumenPorMes(selA, rentabilidadArrA, metricA.rentabilidadImporte),
    [selA, rentabilidadArrA, metricA.rentabilidadImporte]
  );
  const rentabilidadMostradaB = useMemo(
    () => rentabilidadResumenPorMes(selB, rentabilidadArrB, metricB.rentabilidadImporte),
    [selB, rentabilidadArrB, metricB.rentabilidadImporte]
  );

  const simularClientesOpciones = useMemo(() => {
    const out: {
      cliente: string;
      ventaKg: number;
      descKg: number | null;
      ingresoTabla: number | null;
      soloNuevo: boolean;
    }[] = [];
    for (const r of filasClientesMesPrimero) {
      out.push({
        cliente: r.cliente,
        ventaKg: r.ventaB ?? 0,
        descKg: r.descB,
        ingresoTabla: r.ingresoB,
        soloNuevo: false,
      });
    }
    for (const r of filasClientesSoloMesSegundo) {
      out.push({
        cliente: r.cliente,
        ventaKg: r.ventaB ?? 0,
        descKg: r.descB,
        ingresoTabla: r.ingresoB,
        soloNuevo: true,
      });
    }
    return out;
  }, [filasClientesMesPrimero, filasClientesSoloMesSegundo]);

  const puedeSimular = Boolean(empresa && selB);
  const dClass = (d: number) =>
    d > 0 ? "text-emerald-400" : d < 0 ? "text-red-400" : "text-slate-300";

  const cellDeltaMoney = (a: number | null, b: number | null, decimals = 0) => {
    if (a == null && b == null) return <span className="text-slate-500">—</span>;
    const d = (b ?? 0) - (a ?? 0);
    return <span className={dClass(d)}>{fmtDeltaMoney(d, decimals)}</span>;
  };
  const cellDeltaNum = (a: number | null, b: number | null, decimals: number) => {
    if (a == null && b == null) return <span className="text-slate-500">—</span>;
    const d = (b ?? 0) - (a ?? 0);
    return <span className={dClass(d)}>{fmtNum(d, decimals)}</span>;
  };

  const cellDeltaTonNullable = (a: number | null, b: number | null, decimals: number) => {
    if (a == null && b == null) return <span className="text-slate-500">—</span>;
    if (a == null || b == null) return <span className="text-slate-500">—</span>;
    const d = b - a;
    return <span className={dClass(d)}>{fmtNum(d, decimals)}</span>;
  };

  const tonResumenCell = (
    sel: string,
    v: number | null,
    loadingCli: boolean,
    decimals: number
  ) => {
    if (!sel) return <span className="text-slate-500">—</span>;
    if (loadingKeys.has(sel) && !dataByKey[sel]) {
      return <span className="text-slate-500">…</span>;
    }
    if (errorByKey[sel]) return <span className="text-red-400">Error</span>;
    if (!empresa) return <span className="text-slate-500">—</span>;
    if (loadingCli) return <span className="text-slate-500">…</span>;
    if (v == null || Number.isNaN(v)) return <span className="text-slate-500">—</span>;
    return <span className="tabular-nums">{fmtNum(v, decimals)}</span>;
  };

  const puedeComparar =
    Boolean(empresa && selA && selB) &&
    Boolean(dataByKey[selA] && dataByKey[selB]) &&
    !errorByKey[selA] &&
    !errorByKey[selB] &&
    !loadingKeys.has(selA) &&
    !loadingKeys.has(selB);

  const puedeExportar = puedeComparar;

  const handleExportExcel = useCallback(() => {
    if (!puedeExportar || !empresa) return;
    void (async () => {
      try {
        await downloadArrDashboardExcel({
          empresa,
          selA,
          selB,
          labelMesA: periodoLabel(selA),
          labelMesB: periodoLabel(selB),
          comparacionLabel,
          mA: { ...metricA, rentabilidadImporte: rentabilidadMostradaA },
          mB: { ...metricBResumen, rentabilidadImporte: rentabilidadMostradaB },
          resumenExtrasA: {
            ventaRealTon: ventaClienteA.realTon,
            ventaForecastTon: ventaClienteA.proyTon,
            casaTon: catTonA.casa,
            comisionistaTon: catTonA.comisionista,
          },
          resumenExtrasB: {
            ventaRealTon: ventaClienteB.realTon,
            ventaForecastTon: ventaClienteB.proyTon,
            casaTon: catTonB.casa,
            comisionistaTon: catTonB.comisionista,
          },
          rentabilidadMesAFormulaClientes: selA ? mesHistoricoDesdeSelector(selA) : true,
          rentabilidadMesBFormulaClientes: selB ? mesHistoricoDesdeSelector(selB) : true,
          headerVentaA,
          headerVentaB,
          headerDescA,
          headerDescB,
          headerIngresoA,
          headerIngresoB,
          filasClientesMesPrimero: filasClientesMesPrimero.map((r) => ({
            cliente: r.cliente,
            ventaA: r.ventaA,
            ventaB: r.ventaB,
            descA: r.descA,
            descB: r.descB,
          })),
          filasClientesSoloMesSegundo: filasClientesSoloMesSegundo.map((r) => ({
            cliente: r.cliente,
            ventaA: r.ventaA,
            ventaB: r.ventaB,
            descA: r.descA,
            descB: r.descB,
          })),
          usarFormulasComparacion: puedeComparar,
        });
      } catch (e) {
        console.error("Export ARR Excel:", e);
      }
    })();
  }, [
    puedeExportar,
    puedeComparar,
    empresa,
    selA,
    selB,
    comparacionLabel,
    metricA,
    metricBResumen,
    headerVentaA,
    headerVentaB,
    headerDescA,
    headerDescB,
    headerIngresoA,
    headerIngresoB,
    filasClientesMesPrimero,
    filasClientesSoloMesSegundo,
    rentabilidadMostradaA,
    rentabilidadMostradaB,
    ventaClienteA,
    ventaClienteB,
    catTonA,
    catTonB,
  ]);

  const G = {
    costos: "bg-rose-950/30 border-l-2 border-rose-500/50",
    margen: "bg-fuchsia-950/25 border-l-2 border-fuchsia-400/45",
    hg: "bg-violet-950/30 border-l-2 border-violet-400/50",
    desc: "bg-sky-950/25 border-l-2 border-sky-500/45",
    imp: "bg-teal-950/25 border-l-2 border-teal-400/45",
    venta: "bg-slate-600/25 border-l-2 border-slate-400/40",
    mov: "bg-amber-950/25 border-l-2 border-amber-500/45",
    rent: "bg-emerald-950/30 border-l-2 border-emerald-500/50",
  } as const;

  /** Tabla clientes: grupos + resaltado columnas Delta (como Excel). */
  const GC = {
    venta: "bg-amber-950/35 border-l-2 border-amber-500/50",
    desc: "bg-orange-950/30 border-l-2 border-orange-500/45",
    ingreso: "bg-yellow-950/25 border-l-2 border-yellow-500/40",
    deltaCell: "bg-yellow-500/20",
    deltaTh: "bg-yellow-500/25",
  } as const;

  const deltaValorCajaRoja = "inline-block rounded-sm border-2 border-red-500 px-1.5 py-0.5";

  const [clienteFiltro, setClienteFiltro] = useState("");
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const { filasClientesMesPrimeroFiltradas, filasClientesSoloMesSegundoFiltradas } =
    useMemo(() => {
      const q = norm(clienteFiltro);
      if (!q) {
        return {
          filasClientesMesPrimeroFiltradas: filasClientesMesPrimero,
          filasClientesSoloMesSegundoFiltradas: filasClientesSoloMesSegundo,
        };
      }
      return {
        filasClientesMesPrimeroFiltradas: filasClientesMesPrimero.filter((r) =>
          norm(r.cliente).includes(q)
        ),
        filasClientesSoloMesSegundoFiltradas: filasClientesSoloMesSegundo.filter((r) =>
          norm(r.cliente).includes(q)
        ),
      };
    }, [clienteFiltro, filasClientesMesPrimero, filasClientesSoloMesSegundo]);

  const totalFilasCliente =
    filasClientesMesPrimeroFiltradas.length + filasClientesSoloMesSegundoFiltradas.length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 bg-slate-900/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="text-sm text-amber-400 hover:text-amber-300"
          >
            ← IGF Forecast
          </Link>
          <h1 className="text-lg font-semibold text-slate-100">
            IGF Forecast ARR{isArrPlanRoute ? " · Plan" : ""}
          </h1>
          <Link
            href={toggleArrPlanHref}
            className={`rounded border px-3 py-1.5 text-xs font-medium ${
              isArrPlanRoute
                ? "border-amber-500/70 bg-amber-950/40 text-amber-100 hover:bg-amber-900/35"
                : "border-violet-500/60 bg-violet-950/35 text-violet-100 hover:bg-violet-900/35"
            }`}
          >
            {isArrPlanRoute ? "Volver a ARR" : "ARR Plan"}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSimular(true)}
            disabled={!puedeSimular}
            title={
              puedeSimular
                ? "Simular ingreso en el mes forecast (margen / HG del IGF de ese mes)"
                : "Selecciona empresa y el mes forecast (columna B)"
            }
            className="rounded border border-sky-600/90 bg-sky-950/50 px-3 py-2 text-sm font-medium text-sky-100 shadow-sm hover:bg-sky-900/45 disabled:cursor-not-allowed disabled:opacity-40"
          >
            SIMULAR
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!puedeExportar}
            title={
              puedeExportar
                ? "Descargar resumen y clientes en .xlsx (deltas como fórmulas)"
                : "Selecciona empresa y dos meses con datos cargados"
            }
            className="rounded border border-emerald-700/90 bg-emerald-950/55 px-3 py-2 text-sm font-medium text-emerald-100 shadow-sm hover:bg-emerald-900/45 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Exportar Excel
          </button>
          <label className="inline-flex items-center gap-2 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200">
            <span className="text-slate-400">Empresa:</span>
            <select
              value={empresa}
              onChange={(e) => handleEmpresaChange(e.target.value)}
              className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 text-sm"
            >
              <option value="">Seleccionar…</option>
              {IGF_MINI_RESUMEN_LABELS.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <main className="flex-1 p-6">
        {periodosError && (
          <p className="mb-3 text-sm text-red-400">
            Error al cargar los periodos disponibles: {periodosError}
          </p>
        )}

        <section className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/60">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-700/50 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-300">
                <th rowSpan={2} className="align-bottom px-3 py-2 text-center text-slate-200">
                  Mes
                </th>
                <th colSpan={2} className={`px-2 py-2 text-center ${G.venta}`}>
                  Venta
                </th>
                <th colSpan={1} className={`px-2 py-2 text-center ${G.margen}`}>
                  Margen
                </th>
                <th colSpan={1} className={`px-2 py-2 text-center ${G.desc}`}>
                  Desc.
                </th>
                <th colSpan={3} className={`px-2 py-2 text-center ${G.costos}`}>
                  Operación
                </th>
                <th colSpan={2} className={`px-2 py-2 text-center ${G.hg}`}>
                  HG
                </th>
                <th colSpan={1} className={`px-2 py-2 text-center ${G.imp}`}>
                  Impuestos
                </th>
                <th colSpan={2} className={`px-2 py-2 text-center ${G.mov}`}>
                  Categoría
                </th>
                <th colSpan={1} className={`px-2 py-2 text-center ${G.rent}`}>
                  Rentab.
                </th>
              </tr>
              <tr className="bg-slate-700/60 text-slate-200">
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.venta}`}>
                  Real (t)
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.venta}`}>
                  Forecast (t)
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.margen}`}>
                  Margen
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.desc}`}>
                  Descuento
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.costos}`}>
                  Operativos
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.costos}`}>
                  Corporativos
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.costos}`}>
                  Gasto
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.hg}`}>
                  HG
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.hg}`}>
                  HG$
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.imp}`}>
                  Impuestos
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.mov}`}>
                  CASA
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.mov}`}>
                  COMISIONISTA
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.rent}`}>
                  Rentabilidad
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { sel: selA, set: setSelAUi, vals: rowA, key: "A" as const },
                { sel: selB, set: setSelBUi, vals: rowB, key: "B" as const },
              ].map(({ sel, set, vals, key }) => {
                const mRaw = resumenMesMetrics(vals);
                const m =
                  key === "B"
                    ? {
                        ...mRaw,
                        ventaTon: metricBResumen.ventaTon,
                        descuentoSigned: metricBResumen.descuentoSigned,
                      }
                    : mRaw;
                const rentabUi =
                  key === "A" ? rentabilidadMostradaA : rentabilidadMostradaB;
                const ventaCli = key === "A" ? ventaClienteA : ventaClienteB;
                const catTon = key === "A" ? catTonA : catTonB;
                const loadingCli = key === "A" ? loadingClientesParaA : loadingClientesParaB;
                return (
                  <tr key={key} className="border-t border-slate-700/80">
                    <td className="px-3 py-2 bg-slate-800/40 text-center">
                      <div className="flex justify-center">
                        <select
                          value={sel}
                          onChange={(e) => set(e.target.value)}
                          className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 text-sm"
                        >
                          <option value="">Seleccionar mes…</option>
                          {periodos.map(renderMesOption)}
                        </select>
                      </div>
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.venta}`}>
                      {tonResumenCell(sel, ventaCli.realTon, loadingCli, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.venta}`}>
                      {tonResumenCell(sel, ventaCli.proyTon, loadingCli, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.margen}`}>
                      {renderValueCell(sel, m.margenKg, (v) => fmtNum(v, 2), false)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.desc}`}>
                      {renderValueCell(sel, m.descuentoSigned, (v) => fmtNum(v, 2), false)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {renderValueCell(sel, m.operativos, (v) => fmtNum(v, 0), true)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {renderValueCell(sel, m.corporativos, (v) => fmtNum(v, 0), true)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {renderValueCell(sel, m.gastoImporte, (v) => fmtNum(v, 0), true)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.hg}`}>
                      {renderValueCell(sel, m.hgDisplay, (v) => fmtNum(v, 2), false)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.hg}`}>
                      {renderValueCell(sel, m.hgDinero, (v) => fmtNum(v, 2), true)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.imp}`}>
                      {renderValueCell(sel, m.impuestoKg, (v) => fmtNum(v, 2), false)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.mov}`}>
                      {tonResumenCell(sel, catTon.casa, loadingCli, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.mov}`}>
                      {tonResumenCell(sel, catTon.comisionista, loadingCli, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.rent}`}>
                      {renderValueCell(sel, rentabUi, (v) => fmtNum(v, 0), true)}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-amber-500/45 bg-amber-950/20">
                <td className="px-3 py-2 align-top text-center font-semibold text-amber-100">
                  <div className="tracking-wide">COMPARACION</div>
                  {comparacionLabel ? (
                    <div className="mt-0.5 text-[0.65rem] font-normal text-amber-200/75 normal-case">
                      {comparacionLabel}
                    </div>
                  ) : null}
                </td>
                {puedeComparar ? (
                  <>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.venta}`}>
                      {cellDeltaTonNullable(ventaClienteA.realTon, ventaClienteB.realTon, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.venta}`}>
                      {cellDeltaTonNullable(ventaClienteA.proyTon, ventaClienteB.proyTon, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.margen}`}>
                      {cellDeltaNum(metricA.margenKg, metricB.margenKg, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.desc}`}>
                      {cellDeltaNum(metricA.descuentoSigned, metricBResumen.descuentoSigned, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {cellDeltaMoney(metricA.operativos, metricB.operativos)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {cellDeltaMoney(metricA.corporativos, metricB.corporativos)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {cellDeltaMoney(metricA.gastoImporte, metricB.gastoImporte)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.hg}`}>
                      {cellDeltaNum(metricA.hgDisplay, metricB.hgDisplay, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.hg}`}>
                      {cellDeltaMoney(metricA.hgDinero, metricB.hgDinero, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.imp}`}>
                      {cellDeltaNum(metricA.impuestoKg, metricB.impuestoKg, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.mov}`}>
                      {cellDeltaTonNullable(catTonA.casa, catTonB.casa, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.mov}`}>
                      {cellDeltaTonNullable(catTonA.comisionista, catTonB.comisionista, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.rent}`}>
                      {rentabilidadMostradaA != null && rentabilidadMostradaB != null ? (
                        cellDeltaMoney(rentabilidadMostradaA, rentabilidadMostradaB)
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </>
                ) : (
                  <>
                    {Array.from({ length: 13 }).map((_, i) => (
                      <td
                        key={`comp-ph-${i}`}
                        className="px-3 py-2 text-center text-slate-500"
                      >
                        —
                      </td>
                    ))}
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </section>

        {!empresa && (
          <p className="mt-3 text-xs text-slate-400">
            Selecciona una empresa en la parte superior para ver los valores.
          </p>
        )}

        {/* Tabla de clientes por mes */}
        <section className="mt-8 overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/60">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 px-4 py-2">
            <h2 className="text-sm font-semibold text-slate-200">Clientes por mes</h2>
            {empresa && (
              <span className="text-xs text-slate-400">
                {empresa}
                {clientesLoading ? " · cargando…" : ""}
              </span>
            )}
          </div>
          {clientesErrors.length > 0 && (
            <p className="px-4 py-2 text-xs text-red-400">
              {clientesErrors.join(" · ")}
            </p>
          )}
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-700/50 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-300">
                <th
                  rowSpan={2}
                  className="align-middle w-11 min-w-[2.75rem] px-1 py-2 text-center text-slate-400 text-[0.6rem] font-normal normal-case border-r border-slate-600/80"
                  title="Marcar clientes sin venta en el mes forecast: restan su volumen (kg) del total en toneladas y recalculan el descuento $/kg ponderado en el resumen superior."
                >
                  Sin venta
                </th>
                <th rowSpan={2} className="align-bottom px-3 py-2 text-center text-slate-200">
                  <div className="flex flex-col items-center gap-1">
                    <span>Cliente</span>
                    <input
                      value={clienteFiltro}
                      onChange={(e) => setClienteFiltro(e.target.value)}
                      placeholder="Buscar…"
                      disabled={!empresa}
                      className="w-44 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[0.7rem] font-normal normal-case text-slate-200 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </th>
                <th colSpan={3} className={`px-2 py-2 text-center ${GC.venta}`}>
                  Venta
                </th>
                <th colSpan={3} className={`px-2 py-2 text-center ${GC.desc}`}>
                  Descuento
                </th>
                <th colSpan={3} className={`px-2 py-2 text-center ${GC.ingreso}`}>
                  Ingreso
                </th>
              </tr>
              <tr className="bg-slate-700/60 text-slate-200">
                <th className={`px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${GC.venta}`}>
                  {headerVentaA}
                </th>
                <th className={`px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${GC.venta}`}>
                  {headerVentaB}
                </th>
                <th className={`px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${GC.venta} ${GC.deltaTh}`}>
                  Delta venta
                </th>
                <th className={`px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${GC.desc}`}>
                  {headerDescA}
                </th>
                <th className={`px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${GC.desc}`}>
                  {headerDescB}
                </th>
                <th className={`px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${GC.desc} ${GC.deltaTh}`}>
                  Delta descuento
                </th>
                <th className={`px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${GC.ingreso}`}>
                  {headerIngresoA}
                </th>
                <th className={`px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${GC.ingreso}`}>
                  {headerIngresoB}
                </th>
                <th className={`px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${GC.desc} ${GC.deltaTh}`}>
                  Delta ingreso
                </th>
              </tr>
            </thead>
            <tbody>
              {!empresa && (
                <tr>
                  <td colSpan={11} className="px-3 py-3 text-center text-xs text-slate-500">
                    Selecciona una empresa para ver los clientes.
                  </td>
                </tr>
              )}
              {empresa && totalFilasCliente === 0 && !clientesLoading && (
                <tr>
                  <td colSpan={11} className="px-3 py-3 text-center text-xs text-slate-500">
                    Sin clientes para mostrar.
                  </td>
                </tr>
              )}
              {filasClientesMesPrimeroFiltradas.map((row) => (
                <tr key={row.cliente} className="border-t border-slate-700/80">
                  <td className="px-1 py-2 text-center align-middle border-r border-slate-600/60">
                    <input
                      type="checkbox"
                      checked={Boolean(clientesExcluirVentaForecast[row.cliente])}
                      disabled={!showExcluirForecastCheckbox || row.ventaB == null || row.ventaB <= 0}
                      onChange={() => toggleClienteExcluirForecast(row.cliente)}
                      title={
                        showExcluirForecastCheckbox
                          ? "Sin venta en forecast: resta este volumen del total superior y recalcula descuento"
                          : "Solo aplica al mes forecast (columna de venta proyectada)"
                      }
                      className="h-4 w-4 cursor-pointer accent-rose-500 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Sin venta forecast ${row.cliente}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-slate-100">
                    <button
                      type="button"
                      onClick={() => empresa && setDicfModalCliente(row.cliente)}
                      className="mx-auto block max-w-full cursor-pointer text-center text-sky-300 hover:text-sky-200 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!empresa || !token}
                      title="Ver Delta Ingreso Cliente Forecast"
                    >
                      {row.cliente}
                    </button>
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta}`}>{fmtNum(row.ventaA ?? 0, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta}`}>
                    {row.ventaB != null ? fmtNum(row.ventaB, 0) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta} ${GC.deltaCell}`}>
                    <span className={row.deltaVenta < 0 ? deltaValorCajaRoja : undefined}>
                      {fmtNum(row.deltaVenta, 0)}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc}`}>
                    {row.descA != null ? fmtNum(row.descA, 2) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc}`}>
                    {row.descB != null ? fmtNum(row.descB, 2) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc} ${GC.deltaCell}`}>
                    <span className={row.deltaDesc > 0 ? deltaValorCajaRoja : undefined}>
                      {fmtNum(row.deltaDesc, 2)}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.ingreso}`}>
                    {row.ingresoA != null ? `$${fmtNum(row.ingresoA, 0)}` : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.ingreso}`}>
                    {row.ingresoB != null ? `$${fmtNum(row.ingresoB, 0)}` : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc} ${GC.deltaCell}`}>
                    <span className={row.deltaIngreso < 0 ? deltaValorCajaRoja : undefined}>
                      ${fmtNum(row.deltaIngreso, 0)}
                    </span>
                  </td>
                </tr>
              ))}
              {filasClientesSoloMesSegundoFiltradas.length > 0 && (
                <tr aria-hidden className="border-t border-slate-700/80">
                  <td colSpan={11} className="h-4 bg-slate-950/40 py-2" />
                </tr>
              )}
              {filasClientesSoloMesSegundoFiltradas.map((row) => (
                <tr key={`nuevo-${row.cliente}`} className="border-t border-slate-700/80 bg-slate-900/25">
                  <td className="px-1 py-2 text-center align-middle border-r border-slate-600/60">
                    <input
                      type="checkbox"
                      checked={Boolean(clientesExcluirVentaForecast[row.cliente])}
                      disabled={!showExcluirForecastCheckbox || row.ventaB == null || row.ventaB <= 0}
                      onChange={() => toggleClienteExcluirForecast(row.cliente)}
                      title={
                        showExcluirForecastCheckbox
                          ? "Sin venta en forecast: resta este volumen del total superior y recalcula descuento"
                          : "Solo aplica al mes forecast (columna de venta proyectada)"
                      }
                      className="h-4 w-4 cursor-pointer accent-rose-500 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Sin venta forecast ${row.cliente}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-slate-100">
                    <button
                      type="button"
                      onClick={() => empresa && setDicfModalCliente(row.cliente)}
                      className="mx-auto block max-w-full cursor-pointer text-center text-sky-300 hover:text-sky-200 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!empresa || !token}
                      title="Ver Delta Ingreso Cliente Forecast"
                    >
                      {row.cliente}
                    </button>
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums text-slate-400 ${GC.venta}`}>{fmtNum(0, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta}`}>{fmtNum(row.ventaB ?? 0, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta} ${GC.deltaCell}`}>
                    <span className={row.deltaVenta < 0 ? deltaValorCajaRoja : undefined}>
                      {fmtNum(row.deltaVenta, 0)}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums text-slate-400 ${GC.desc}`}>{fmtNum(0, 2)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc}`}>
                    {row.descB != null ? fmtNum(row.descB, 2) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc} ${GC.deltaCell}`}>
                    <span className={row.deltaDesc > 0 ? deltaValorCajaRoja : undefined}>
                      {fmtNum(row.deltaDesc, 2)}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums text-slate-400 ${GC.ingreso}`}>${fmtNum(0, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.ingreso}`}>
                    {row.ingresoB != null ? `$${fmtNum(row.ingresoB, 0)}` : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc} ${GC.deltaCell}`}>
                    <span className={row.deltaIngreso < 0 ? deltaValorCajaRoja : undefined}>
                      ${fmtNum(row.deltaIngreso, 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
      <DeltaIngresoClienteForecastModal
        token={token}
        planta={empresa}
        clienteNombre={dicfModalCliente}
        onClose={() => setDicfModalCliente(null)}
        canDicfAcciones={canDicfAcciones}
      />
      {showSimular && (
        <ArrSimularIngresoModal
          onClose={() => setShowSimular(false)}
          empresa={empresa}
          mesForecastLabel={selB ? periodoLabel(selB) : ""}
          metricas={{
            margenKg: metricB.margenKg,
            hgDisplay: metricB.hgDisplay,
            hgDinero: metricB.hgDinero,
          }}
          clientes={simularClientesOpciones}
        />
      )}
    </div>
  );
}
