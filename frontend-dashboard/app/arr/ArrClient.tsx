"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRoleFromDashboardToken } from "@/lib/auth";
import DeltaIngresoClienteForecastModal from "@/components/DeltaIngresoClienteForecastModal";
import ArrDicfCategoriaBucketsModal, {
  type ArrForecastSubcategoriaResumenRow,
} from "@/components/ArrDicfCategoriaBucketsModal";
import ArrSimularIngresoModal from "@/components/ArrSimularIngresoModal";
import ArrNuevoClientePlanModal from "@/components/ArrNuevoClientePlanModal";
import { categoriaEsComisionista, dicfClienteEsComisionista } from "@/lib/arr-categoria";
import {
  fetchIgfForecast,
  fetchIgfVersiones,
  fetchArrClientesMes,
  fetchArrLastUploadDay,
  fetchPlantas,
  fetchActionRegisterResponsables,
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
  presupuestoGendKey,
} from "@/lib/igf-kpi-ui";
import { descKgPlanConSigno, downloadArrDashboardExcelDual } from "@/lib/arr-export-excel";

function planPersistKey(token: string, empresa: string, selB: string): string {
  return `arrPlanPersist:v1:${token.slice(0, 12)}:${empresa}:${selB}`;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Empresa IGF (ej. "GTM San Luis") → id de `plantas` (ej. "San Luis"). */
function resolvePlantaIdFromEmpresaLabel(
  empresaLabel: string,
  plantas: { id: number; nombre: string }[]
): number | null {
  const list = plantas || [];
  if (!empresaLabel || !list.length) return null;
  const norm = normalizeEmpresa(empresaLabel);
  const direct = list.find((p) => normalizeEmpresa(p.nombre) === norm);
  if (direct) return Number(direct.id);
  const gkey = presupuestoGendKey(empresaLabel);
  if (gkey) {
    const byKey = list.find((p) => {
      const pn = normalizeEmpresa(p.nombre);
      return pn.includes(gkey) || gkey.includes(pn);
    });
    if (byKey) return Number(byKey.id);
  }
  for (const p of list) {
    const pn = normalizeEmpresa(p.nombre);
    if (norm.includes(pn) || pn.includes(norm)) return Number(p.id);
  }
  return null;
}

function normalizeNuevoClientePlanRow(raw: unknown): NuevoClientePlanRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim();
  const nombre = String(o.nombre ?? "").trim();
  if (!id || !nombre) return null;
  const kg = Number(o.kg);
  if (!Number.isFinite(kg) || kg <= 0) return null;
  const descKg = Number(o.descKg);
  const gastoMxn = Number(o.gastoMxn);
  const categoria: "CASA" | "COMISIONISTA" =
    o.categoria === "COMISIONISTA" ? "COMISIONISTA" : "CASA";
  const subcategoria = String(o.subcategoria ?? "").trim();
  const responsable = String(o.responsable ?? "").trim();
  const rid = o.responsableId;
  const responsableId =
    typeof rid === "number" && Number.isFinite(rid) ? rid : null;
  const hgRaw = o.hgCliente;
  const hgCliente =
    typeof hgRaw === "number" && Number.isFinite(hgRaw) ? hgRaw : null;
  const hgCompraRaw = o.hgCompra;
  const hgCompra =
    typeof hgCompraRaw === "number" && Number.isFinite(hgCompraRaw)
      ? hgCompraRaw
      : null;
  const comentarios = String(o.comentarios ?? "").trim().slice(0, 2000);
  const idStr = String(id);
  let origen: PlanRowOrigen | undefined;
  const or = o.origen;
  if (
    or === "sin_venta" ||
    or === "con_venta" ||
    or === "manual" ||
    or === "arr_quita" ||
    or === "edicion_forecast" ||
    or === "venta_editada"
  )
    origen = or === "venta_editada" ? "edicion_forecast" : or;
  else if (idStr.startsWith("plan-sin-venta:")) origen = "sin_venta";
  else if (idStr.startsWith("plan-con-venta:")) origen = "con_venta";
  else if (idStr.startsWith("plan-arr-quita:")) origen = "arr_quita";
  else if (idStr.startsWith("plan-venta-editada:")) origen = "edicion_forecast";
  const incluirEnForecastMes = o.incluirEnForecastMes === false ? false : true;
  return {
    id,
    nombre,
    kg: Math.round(kg),
    descKg: Number.isFinite(descKg) ? descKg : 0,
    gastoMxn: Number.isFinite(gastoMxn) ? gastoMxn : 0,
    responsable,
    responsableId,
    categoria,
    subcategoria,
    hgCliente,
    hgCompra,
    comentarios,
    origen,
    incluirEnForecastMes,
  };
}

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

export type PlanRowOrigen =
  | "manual"
  | "sin_venta"
  | "con_venta"
  /** Resta en D6 el kg/desc ARR del cliente (como Sin venta), sin casilla «Sin venta». */
  | "arr_quita"
  /** Suma en D6 los kg/desc editados (como Nuevo cliente manual), sin duplicar kg en totales. */
  | "edicion_forecast";

export type NuevoClientePlanRow = {
  id: string;
  nombre: string;
  kg: number;
  /** Mismo convenio que `descuentoSigned` (típicamente negativo). */
  descKg: number;
  gastoMxn: number;
  /** Nombre mostrado (p. ej. `nombre_persona` desde `usuarios`). */
  responsable: string;
  /** Id de `usuarios` cuando se elige del listado por planta. */
  responsableId?: number | null;
  categoria: "CASA" | "COMISIONISTA";
  subcategoria: string;
  /** Si no es null, sustituye al HG del mes en `kg × HG × HG$ / 100`. */
  hgCliente: number | null;
  /** Si no es null, sustituye a HG$ (dinero) del mes en el mismo término. */
  hgCompra: number | null;
  /** Notas libres (persistencia local ARR Plan). */
  comentarios: string;
  /**
   * `manual`: alta en plan (suma kg al forecast).
   * `sin_venta` / `con_venta`: listado vinculado a casillas de la tabla.
   * `arr_quita` + `edicion_forecast`: par al editar venta/desc. forecast (D6 sin venta + nuevo).
   */
  origen?: PlanRowOrigen;
  /**
   * Si `false`, el registro queda solo como plan futuro (no suma kg/desc/gasto/HG/renta al mes B forecast actual).
   * Omisión o `true` = cuenta en la proyección del mes seleccionado.
   */
  incluirEnForecastMes?: boolean;
};

/** Filas de plan que entran en toneladas, descuento ponderado, HG y rentabilidad del mes B forecast. */
function nuevaFilaCuentaEnForecastMes(n: Pick<NuevoClientePlanRow, "incluirEnForecastMes">): boolean {
  return n.incluirEnForecastMes !== false;
}

const PLAN_ID_SIN_VENTA = "plan-sin-venta:";
const PLAN_ID_CON_VENTA = "plan-con-venta:";
const PLAN_ID_ARR_QUITA = "plan-arr-quita:";
const PLAN_ID_EDICION_FORECAST = "plan-venta-editada:";

function esNuevoKgPlanManual(n: Pick<NuevoClientePlanRow, "origen">): boolean {
  return !n.origen || n.origen === "manual";
}

function idPlanRowSinVenta(cliente: string): string {
  return `${PLAN_ID_SIN_VENTA}${encodeURIComponent(cliente.trim())}`;
}

function idPlanRowConVenta(cliente: string): string {
  return `${PLAN_ID_CON_VENTA}${encodeURIComponent(cliente.trim())}`;
}

function idPlanRowArrQuita(cliente: string): string {
  return `${PLAN_ID_ARR_QUITA}${encodeURIComponent(cliente.trim())}`;
}

function idPlanRowEdicionForecast(cliente: string): string {
  return `${PLAN_ID_EDICION_FORECAST}${encodeURIComponent(cliente.trim())}`;
}

/** Filas que entran en fórmulas Excel D6/H6 (incluye arr_quita y edicion_forecast). */
function filaPlanEntraEnFormulaD6(n: Pick<NuevoClientePlanRow, "origen" | "incluirEnForecastMes">): boolean {
  if (!nuevaFilaCuentaEnForecastMes(n)) return false;
  const o = n.origen;
  return (
    o === "manual" ||
    o === "sin_venta" ||
    o === "con_venta" ||
    o === "arr_quita" ||
    o === "edicion_forecast"
  );
}

function clienteConEdicionForecastEnPlan(
  nuevos: NuevoClientePlanRow[],
  cliente: string
): boolean {
  const k = cliente.trim();
  return nuevos.some(
    (n) => n.id === idPlanRowEdicionForecast(k) || n.id === idPlanRowArrQuita(k)
  );
}

function quitarFilasEdicionForecastDePlan(
  nuevos: NuevoClientePlanRow[],
  cliente: string
): NuevoClientePlanRow[] {
  const k = cliente.trim();
  return nuevos.filter(
    (n) => n.id !== idPlanRowEdicionForecast(k) && n.id !== idPlanRowArrQuita(k)
  );
}

function clienteDesdePlanForecastId(id: string, prefix: string): string | null {
  if (!id.startsWith(prefix)) return null;
  try {
    return decodeURIComponent(id.slice(prefix.length));
  } catch {
    return null;
  }
}

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
  /**
   * Clientes inactivos en forecast (sin kg proyectado): al activar «Con venta» se suma kg y desc.
   * (inverso lógico de excluir volumen con «Sin venta»).
   */
  clientesConVentaForecastSim: Record<string, { kg: number; descKg: number | null }>;
  /**
   * Simulación de descuento $/kg en mes forecast por cliente (override del valor proyectado).
   * Permite ver afectación financiera (ingreso, descuento ponderado y rentabilidad) al cambiar el desc. forecast.
   */
  clientesDescForecastSim: Record<string, number>;
  /** Override de kg proyectados en mes forecast (ARR Plan); aparece en «Nuevos clientes (plan)». */
  clientesVentaForecastSim: Record<string, number>;
  /** Solo en ARR Plan: clientes sintéticos (kg, desc $/kg, gasto) que ajustan resumen mes B. */
  nuevosClientesPlan: NuevoClientePlanRow[];
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
    clientesConVentaForecastSim: {},
    clientesDescForecastSim: {},
    clientesVentaForecastSim: {},
    nuevosClientesPlan: [],
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
  m: ResumenMesMetrics,
  /** Opcional: reemplaza solo el factor HG del mes en el término `kg×HG×HG$/100`. */
  hgCliente?: number | null,
  /** Opcional: reemplaza HG$ (dinero) del mes en el mismo término. */
  hgCompra?: number | null
): number | null {
  if (kg <= 0) return null;
  const margen = m.margenKg;
  const hgMes = m.hgDisplay;
  const hgDinMes = m.hgDinero;
  if (margen == null) return null;
  const hg =
    hgCliente != null && Number.isFinite(hgCliente) ? hgCliente : hgMes;
  const hgDin =
    hgCompra != null && Number.isFinite(hgCompra) ? hgCompra : hgDinMes;
  if (hg == null || hgDin == null) return null;
  const d = descKg ?? 0;
  const dMag = Number.isFinite(d) ? Math.abs(d) : 0;
  const raw = kg * (margen - dMag) + (hg * kg * hgDin) / 100;
  return Math.round(raw);
}

/** Ingreso marginal fila «Nuevos clientes» (ARR Plan): (E×(C6+F))+((H+I)×E×I6/100); «Sin venta» invierte signo. I6 = HG$ hoja ARR. */
function ingresoMarginalPlanNuevoRow(
  kg: number,
  descKg: number,
  margenMes: number | null,
  i6Arr: number | null,
  hgCliente: number | null,
  hgCompra: number | null,
  arrHDisplay: number | null,
  arrHgDinero: number | null,
  origen?: PlanRowOrigen
): number | null {
  if (kg <= 0 || margenMes == null || i6Arr == null || !Number.isFinite(i6Arr)) return null;
  const h =
    hgCliente != null && Number.isFinite(hgCliente) ? hgCliente : arrHDisplay;
  const ip =
    hgCompra != null && Number.isFinite(hgCompra) ? hgCompra : arrHgDinero;
  if (h == null || !Number.isFinite(h) || ip == null || !Number.isFinite(ip)) return null;
  const d = descKgPlanConSigno(descKg, origen);
  const raw = kg * (margenMes + d) + (h + ip) * kg * (i6Arr / 100);
  const sign =
    origen === "sin_venta" || origen === "arr_quita" ? -1 : 1;
  return Math.round(sign * raw);
}

/** HG / HG$ resumen mes B en ARR Plan (forecast): HG$ = hoja ARR (I6); HG = fórmula Excel con filas nuevos (kg > 0). */
function hgPlanForecastMesBRuta(
  metricBarr: ResumenMesMetrics,
  metricPlanB: ResumenMesMetrics,
  nuevosMan: Array<{
    kg: number;
    descKg: number;
    origen?: PlanRowOrigen;
    hgCliente: number | null;
    hgCompra: number | null;
  }>,
  aplicarReglasPlanForecast: boolean
): Pick<ResumenMesMetrics, "hgDisplay" | "hgDinero"> {
  const arrI = metricBarr.hgDinero;
  const arrH = metricBarr.hgDisplay;
  const arrB = metricBarr.ventaTon;
  const planB = metricPlanB.ventaTon;
  if (!aplicarReglasPlanForecast) {
    return { hgDisplay: metricPlanB.hgDisplay, hgDinero: metricPlanB.hgDinero };
  }
  const hgDinero =
    arrI != null && Number.isFinite(arrI) ? arrI : metricPlanB.hgDinero;
  if (
    nuevosMan.length === 0 ||
    arrH == null ||
    !Number.isFinite(arrH) ||
    arrB == null ||
    !Number.isFinite(arrB) ||
    arrI == null ||
    !Number.isFinite(arrI) ||
    planB == null ||
    !Number.isFinite(planB) ||
    planB <= 0
  ) {
    return { hgDisplay: metricPlanB.hgDisplay, hgDinero };
  }
  let extra = 0;
  for (const n of nuevosMan) {
    const kg = Number(n.kg);
    if (!Number.isFinite(kg) || kg <= 0) continue;
    const h = n.hgCliente != null && Number.isFinite(n.hgCliente) ? n.hgCliente : arrH;
    const ip = n.hgCompra != null && Number.isFinite(n.hgCompra) ? n.hgCompra : arrI;
    const sign =
      n.origen === "sin_venta" || n.origen === "arr_quita" ? -1 : 1;
    extra += sign * ((h + ip) * kg) / 100;
  }
  const baseNum = (arrH * arrB * 1000) / 100;
  const hgDisplay = (baseNum + extra) / (planB * 10);
  return { hgDisplay, hgDinero };
}

function ventaBMesBConSimMap(
  row: ClienteTablaRow,
  conVenta: Record<string, { kg: number; descKg: number | null }>,
  ventaSim?: Record<string, number>
): number | null {
  const vs = ventaSim?.[row.cliente];
  if (vs != null && Number.isFinite(vs) && vs > 0) return Math.round(vs);
  const s = conVenta[row.cliente];
  if (s && s.kg > 0) return s.kg;
  return row.ventaB;
}

/**
 * Descuento mes B en ARR Plan (forecast), misma lógica que Excel:
 * ((ARR!D6*ARR!B6)+Σ(sign×F×E/1000))/B6 — ARR = métricas sin exclusiones/simulación del plan; B6 = venta (t) plan.
 */
function descuentoPlanForecastSegunArrYB6(
  metricBarr: ResumenMesMetrics,
  ventaTonPlanB: number | null,
  nuevosMan: Array<{ kg: number; descKg: number; origen?: PlanRowOrigen }>,
  mesBForecast: boolean
): number | null {
  if (!mesBForecast) return null;
  const arrB = metricBarr.ventaTon;
  const arrD = metricBarr.descuentoSigned;
  const planB = ventaTonPlanB;
  if (arrB == null || !Number.isFinite(arrB) || arrD == null || !Number.isFinite(arrD)) return null;
  if (planB == null || !Number.isFinite(planB) || planB <= 0) return null;
  let extra = 0;
  for (const n of nuevosMan) {
    const kg = Number(n.kg);
    if (!Number.isFinite(kg) || kg <= 0) continue;
    const origenD6 =
      n.origen === "arr_quita" ? ("sin_venta" as const) : n.origen;
    const F = descKgPlanConSigno(n.descKg, origenD6);
    const term = (F * kg) / 1000;
    // D6: sin venta / arr_quita `-(F*E/1000)`; manual / con venta / edicion_forecast `+(F*E/1000)`.
    const resta =
      n.origen === "sin_venta" || n.origen === "arr_quita";
    extra += resta ? -term : term;
  }
  return (arrD * arrB + extra) / planB;
}

/**
 * Rentabilidad mes B en ARR Plan solo si el mes es forecast/proyección (no histórico).
 * Misma celda M6 Excel: ((C6+D6)*B6*1000)+((H6*B6*1000/100)*I6)-G6
 * = ((Margen+Descuento)*Venta*1000)+((HG*Venta*1000/100)*HG$)-Gasto (Venta en t; Desc firmado; I=HG$ hoja ARR; H=HG plan vía hgPlanForecastMesBRuta).
 */
function rentabilidadPlanForecastDesdeCeldasPlan(
  plan: ResumenMesMetrics,
  metricBarr: ResumenMesMetrics,
  nuevosConKg: Array<{
    kg: number;
    descKg: number;
    origen?: PlanRowOrigen;
    hgCliente: number | null;
    hgCompra: number | null;
  }>
): number | null {
  const B = plan.ventaTon;
  const C = plan.margenKg;
  const D = plan.descuentoSigned;
  const G = plan.gastoImporte;
  if (
    B == null ||
    C == null ||
    D == null ||
    G == null ||
    !Number.isFinite(B) ||
    !Number.isFinite(C) ||
    !Number.isFinite(D) ||
    !Number.isFinite(G)
  ) {
    return null;
  }
  const I = metricBarr.hgDinero;
  if (I == null || !Number.isFinite(I)) return null;
  const { hgDisplay: H } = hgPlanForecastMesBRuta(metricBarr, plan, nuevosConKg, true);
  if (H == null || !Number.isFinite(H)) return null;
  return Math.round((C + D) * B * 1000 + ((H * B * 1000) / 100) * I - G);
}

function ingresoBMesBConSimMap(
  row: ClienteTablaRow,
  conVenta: Record<string, { kg: number; descKg: number | null }>,
  metricBResumen: ResumenMesMetrics,
  /** Override del descuento $/kg del cliente (mes forecast). Tiene prioridad sobre `row.descB`. */
  descSim?: Record<string, number>,
  ventaSim?: Record<string, number>
): number | null {
  const sim = descSim?.[row.cliente];
  const simDesc = sim != null && Number.isFinite(sim) ? sim : null;
  const s = conVenta[row.cliente];
  if (s && s.kg > 0) {
    const d =
      simDesc != null
        ? simDesc
        : s.descKg != null && Number.isFinite(s.descKg)
          ? s.descKg
          : row.descB != null && Number.isFinite(row.descB)
            ? row.descB
            : metricBResumen.descuentoSigned;
    return ingresoClienteMarginal(s.kg, d, metricBResumen);
  }
  const kgSim = ventaSim?.[row.cliente];
  const kg =
    kgSim != null && Number.isFinite(kgSim) && kgSim > 0
      ? Math.round(kgSim)
      : row.ventaB;
  if (kg == null || !Number.isFinite(kg) || kg <= 0) return null;
  const descParaCalc = simDesc != null ? simDesc : row.descB;
  return ingresoClienteMarginal(kg, descParaCalc, metricBResumen);
}

/** Venta del cliente para el mes: kg proyectado (mes en curso) o kg real (mes histórico). */
function clienteVenta(row: ArrClienteMesRow, historico: boolean): number {
  if (!historico && row.kg_proyectado != null) return row.kg_proyectado;
  return row.kg_real;
}

/** Toneladas por categoría: mes cerrado = real; mes forecast = proyectado (respeta exclusiones y «Con venta»). */
function toneladasCategoriaDesdeClientes(
  clientes: ClientesMonthData | undefined,
  excluirForecast: Record<string, true> | undefined,
  conVentaSim?: Record<string, { kg: number; descKg: number | null }>,
  /** Kg adicionales contados como categoría Casa (clientes plan sin fila en API). */
  extraCasaKg = 0,
  /** Kg adicionales contados como categoría Comisionista (clientes plan sin fila en API). */
  extraComiKg = 0,
  ventaSim?: Record<string, number>
): { casa: number | null; comisionista: number | null } {
  if (!clientes?.rows?.length && !(extraCasaKg > 0) && !(extraComiKg > 0))
    return { casa: null, comisionista: null };
  let casaKg = extraCasaKg > 0 ? extraCasaKg : 0;
  let comiKg = extraComiKg > 0 ? extraComiKg : 0;
  if (!clientes?.rows?.length) {
    const toT = (kg: number) => Math.round((kg / 1000) * 100) / 100;
    return { casa: toT(casaKg), comisionista: toT(comiKg) };
  }
  const hist = clientes.historico;
  for (const r of clientes.rows) {
    const comi = categoriaEsComisionista(r.categoria);
    const cli = r.cliente.trim();
    const sim = conVentaSim?.[cli];
    const kg = hist
      ? Number(r.kg_real) || 0
      : (() => {
          const ex = excluirForecast?.[cli];
          if (ex) return 0;
          const vEdit = ventaSim?.[cli];
          if (vEdit != null && Number.isFinite(vEdit) && vEdit >= 0) return Math.round(vEdit);
          const base = r.kg_proyectado != null ? Number(r.kg_proyectado) || 0 : 0;
          const add = sim != null && Number.isFinite(sim.kg) && sim.kg > 0 ? sim.kg : 0;
          return base + add;
        })();
    if (comi) comiKg += kg;
    else casaKg += kg;
  }
  const toT = (kg: number) => Math.round((kg / 1000) * 100) / 100;
  return { casa: toT(casaKg), comisionista: toT(comiKg) };
}

type SubcatAggDicf = { kg: number; comisionMxn: number };

function mapSubcatAggToRows(map: Map<string, SubcatAggDicf>): ArrForecastSubcategoriaResumenRow[] {
  const pairs = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "es"));
  if (!pairs.length) return [];
  let sumKg = 0;
  let sumMxn = 0;
  const body: ArrForecastSubcategoriaResumenRow[] = [];
  for (const [sub, a] of pairs) {
    sumKg += a.kg;
    sumMxn += a.comisionMxn;
    body.push({
      subcategoria: sub,
      ventaTon: Math.round((a.kg / 1000) * 100) / 100,
      comisionProyectadaMxn: Math.round(a.comisionMxn * 100) / 100,
    });
  }
  body.push({
    subcategoria: "TOTAL",
    ventaTon: Math.round((sumKg / 1000) * 100) / 100,
    comisionProyectadaMxn: Math.round(sumMxn * 100) / 100,
    esTotal: true,
  });
  return body;
}

/**
 * Agrega venta (kg → t) y comisión proyectada (kg × desc. $/kg) por subcategoría,
 * misma lógica de kg que `toneladasCategoriaDesdeClientes` + filas plan manual en forecast.
 */
/**
 * kg × $/kg para el resumen «Comisión proyectada» del modal DICF:
 * - Clientes API: el descuento $/kg se trata como magnitud positiva (igual que en `ingresoClienteMarginal`).
 * - Plan manual: el valor se guarda firmado (típico negativo); se invierte el signo para usar la misma magnitud que clientes.
 * - Fallback mes: valor firmado del resumen → se usa magnitud.
 * No altera el descuento ponderado del mes (`descuentoSigned` / Excel -5.10).
 */
function descKgParaComisionProyectadaModal(
  descKg: number | null,
  origen: "cliente" | "plan",
  descFallback: number | null
): number {
  if (descKg != null && Number.isFinite(descKg)) {
    return origen === "plan" ? -descKg : Math.abs(descKg);
  }
  if (descFallback != null && Number.isFinite(descFallback)) {
    return Math.abs(descFallback);
  }
  return 0;
}

function buildForecastSubcategoriaResumenDicf(
  clientesB: ClientesMonthData | undefined,
  excluirForecast: Record<string, true> | undefined,
  conVentaSim: Record<string, { kg: number; descKg: number | null }> | undefined,
  planManualNuevosRows: NuevoClientePlanRow[],
  descFallback: number | null
): {
  casa: ArrForecastSubcategoriaResumenRow[];
  comisionista: ArrForecastSubcategoriaResumenRow[];
} {
  const empty = { casa: [] as ArrForecastSubcategoriaResumenRow[], comisionista: [] as ArrForecastSubcategoriaResumenRow[] };
  if (!clientesB?.rows?.length && !planManualNuevosRows.length) return empty;
  const mapaCasa = new Map<string, SubcatAggDicf>();
  const mapaComi = new Map<string, SubcatAggDicf>();
  const fb =
    descFallback != null && Number.isFinite(descFallback) ? descFallback : null;

  const bump = (comi: boolean, subRaw: string, kg: number, descKg: number | null, origen: "cliente" | "plan") => {
    if (!Number.isFinite(kg) || kg <= 0) return;
    const d = descKgParaComisionProyectadaModal(descKg, origen, fb);
    const mxn = kg * d;
    const sub = (subRaw || "").trim() || "Sin subcategoría";
    const map = comi ? mapaComi : mapaCasa;
    const cur = map.get(sub) || { kg: 0, comisionMxn: 0 };
    cur.kg += kg;
    cur.comisionMxn += mxn;
    map.set(sub, cur);
  };

  const hist = clientesB?.historico === true;
  for (const r of clientesB?.rows || []) {
    const comi = categoriaEsComisionista(r.categoria);
    const cli = r.cliente.trim();
    const sim = conVentaSim?.[cli];
    const kg = hist
      ? Number(r.kg_real) || 0
      : (() => {
          if (excluirForecast?.[cli]) return 0;
          const base = r.kg_proyectado != null ? Number(r.kg_proyectado) || 0 : 0;
          const add = sim != null && Number.isFinite(sim.kg) && sim.kg > 0 ? sim.kg : 0;
          return base + add;
        })();
    const descKg = hist
      ? r.descuento_kg != null && Number.isFinite(r.descuento_kg)
        ? r.descuento_kg
        : null
      : sim != null && sim.descKg != null && Number.isFinite(sim.descKg)
        ? sim.descKg
        : r.descuento_kg != null && Number.isFinite(r.descuento_kg)
          ? r.descuento_kg
          : null;
    bump(comi, String(r.subcategoria ?? ""), kg, descKg, "cliente");
  }

  if (!hist) {
    for (const n of planManualNuevosRows) {
      if (!nuevaFilaCuentaEnForecastMes(n) || !esNuevoKgPlanManual(n)) continue;
      const kg = Number(n.kg);
      bump(
        n.categoria === "COMISIONISTA",
        n.subcategoria,
        kg,
        Number.isFinite(n.descKg) ? n.descKg : null,
        "plan"
      );
    }
  }

  return {
    casa: mapSubcatAggToRows(mapaCasa),
    comisionista: mapSubcatAggToRows(mapaComi),
  };
}

/** Suma kg al total forecast y recalcula descuento $/kg ponderado (misma lógica que «Con venta»). */
function applyExtraKgDescChunksToMetricB(
  base: ResumenMesMetrics,
  chunks: Array<{ kg: number; descKg: number | null }>
): ResumenMesMetrics {
  const valid = chunks.filter((c) => Number.isFinite(c.kg) && c.kg > 0);
  if (!valid.length) return base;
  const ton = base.ventaTon;
  const descSigned = base.descuentoSigned;
  if (ton == null || !Number.isFinite(ton) || descSigned == null || !Number.isFinite(descSigned)) {
    return base;
  }
  let sumKg = 0;
  let sumDescKg = 0;
  for (const s of valid) {
    sumKg += s.kg;
    const d =
      s.descKg != null && Number.isFinite(s.descKg) ? s.descKg : descSigned;
    sumDescKg += d * s.kg;
  }
  if (sumKg <= 0) return base;
  const totalKg0 = ton * 1000;
  const newKg = totalKg0 + sumKg;
  const numer = descSigned * totalKg0 + sumDescKg;
  const newDesc = numer / newKg;
  return {
    ...base,
    ventaTon: newKg / 1000,
    descuentoSigned: newDesc,
  };
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
  /** Acciones DICF abiertas (mes B si existe, si no mes A). */
  acciones_abiertas?: number;
};

function clienteTieneAccionDicfAbierta(row: ClienteTablaRow): boolean {
  const n = row.acciones_abiertas;
  return n != null && Number.isFinite(n) && n > 0;
}

/**
 * Celda editable de Desc. mes B (forecast). Permite simular un cambio en el descuento
 * para ver afectación financiera (ingreso, descuento ponderado, rentabilidad).
 */
function DescBEditableCell({
  cliente,
  orig,
  sim,
  editable,
  onCommit,
}: {
  cliente: string;
  orig: number | null;
  sim: number | null;
  editable: boolean;
  onCommit: (cliente: string, valor: number | null) => void;
}) {
  const display = sim != null ? sim : orig;
  const valor = display != null && Number.isFinite(display) ? fmtNum(display, 2) : "";
  const [draft, setDraft] = useState<string>(valor);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(valor);
  }, [valor, focused]);

  if (!editable) {
    return display != null && Number.isFinite(display) ? (
      <span className={sim != null ? "text-amber-300" : undefined}>{fmtNum(display, 2)}</span>
    ) : (
      <span className="text-slate-500">—</span>
    );
  }

  const commit = (rawTxt: string) => {
    const txt = rawTxt.trim().replace(/,/g, "");
    if (txt === "") {
      onCommit(cliente, null);
      return;
    }
    const n = Number(txt);
    if (!Number.isFinite(n)) {
      setDraft(valor);
      return;
    }
    if (orig != null && Number.isFinite(orig) && Math.abs(n - orig) < 1e-9) {
      onCommit(cliente, null);
      return;
    }
    onCommit(cliente, n);
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onBlur={(e) => {
          setFocused(false);
          commit(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(valor);
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        placeholder={orig != null && Number.isFinite(orig) ? fmtNum(orig, 2) : "—"}
        title={
          sim != null
            ? `Simulado: ${fmtNum(sim, 2)} (original: ${
                orig != null && Number.isFinite(orig) ? fmtNum(orig, 2) : "—"
              }). Pulsa ↺ para restablecer.`
            : "Edita para simular un cambio en el descuento $/kg y ver la afectación financiera."
        }
        className={`w-20 rounded border bg-slate-900 px-1.5 py-0.5 text-center text-[0.75rem] tabular-nums ${
          sim != null ? "border-amber-500/70 text-amber-200" : "border-slate-600 text-slate-200"
        }`}
      />
      {sim != null && (
        <button
          type="button"
          onClick={() => onCommit(cliente, null)}
          title="Restablecer al valor original"
          aria-label={`Restablecer descuento forecast ${cliente}`}
          className="rounded border border-slate-600 px-1 text-[0.65rem] text-slate-300 hover:bg-slate-800"
        >
          ↺
        </button>
      )}
    </div>
  );
}

/** Celda editable de Venta mes B (forecast, ARR Plan). */
function VentaBEditableCell({
  cliente,
  orig,
  sim,
  editable,
  onCommit,
}: {
  cliente: string;
  orig: number | null;
  sim: number | null;
  editable: boolean;
  onCommit: (cliente: string, valor: number | null) => void;
}) {
  const display = sim != null ? sim : orig;
  const valor =
    display != null && Number.isFinite(display) ? fmtNum(display, 0) : "";
  const [draft, setDraft] = useState<string>(valor);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(valor);
  }, [valor, focused]);

  if (!editable) {
    return display != null && Number.isFinite(display) && display > 0 ? (
      <span className={sim != null ? "text-sky-300" : undefined}>{fmtNum(display, 0)}</span>
    ) : (
      <span className="text-slate-500">—</span>
    );
  }

  const commit = (rawTxt: string) => {
    const txt = rawTxt.trim().replace(/,/g, "");
    if (txt === "") {
      onCommit(cliente, null);
      return;
    }
    const n = Number(txt);
    if (!Number.isFinite(n) || n <= 0) {
      setDraft(valor);
      return;
    }
    const rounded = Math.round(n);
    if (
      orig != null &&
      Number.isFinite(orig) &&
      orig > 0 &&
      rounded === Math.round(orig)
    ) {
      onCommit(cliente, null);
      return;
    }
    onCommit(cliente, rounded);
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onBlur={(e) => {
          setFocused(false);
          commit(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(valor);
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        placeholder={orig != null && Number.isFinite(orig) && orig > 0 ? fmtNum(orig, 0) : "—"}
        title={
          sim != null
            ? `Editado: ${fmtNum(sim, 0)} (original: ${
                orig != null && Number.isFinite(orig) ? fmtNum(orig, 0) : "—"
              }). Pulsa ↺ para restablecer.`
            : "Edita los kg proyectados del mes forecast."
        }
        className={`w-24 rounded border bg-slate-900 px-1.5 py-0.5 text-center text-[0.75rem] tabular-nums ${
          sim != null ? "border-sky-500/70 text-sky-200" : "border-slate-600 text-slate-200"
        }`}
      />
      {sim != null && (
        <button
          type="button"
          onClick={() => onCommit(cliente, null)}
          title="Restablecer al valor original"
          aria-label={`Restablecer venta forecast ${cliente}`}
          className="rounded border border-slate-600 px-1 text-[0.65rem] text-slate-300 hover:bg-slate-800"
        >
          ↺
        </button>
      )}
    </div>
  );
}

function findClienteTablaRowInFilas(
  cliente: string,
  primero: ClienteTablaRow[],
  solo: ClienteTablaRow[]
): ClienteTablaRow | null {
  const k = cliente.trim();
  const hit =
    primero.find((r) => r.cliente.trim() === k) || solo.find((r) => r.cliente.trim() === k);
  return hit ?? null;
}

function findArrClienteMesRow(
  clientesB: ClientesMonthData | undefined,
  cliente: string
): ArrClienteMesRow | null {
  if (!clientesB?.rows?.length) return null;
  const k = cliente.trim();
  return clientesB.rows.find((r) => r.cliente.trim() === k) ?? null;
}

/** Mes B primero; si el cliente solo está en A, usa categoría/subcanal de ese mes. */
function resolveArrClienteForPlan(
  clientesA: ClientesMonthData | undefined,
  clientesB: ClientesMonthData | undefined,
  cliente: string
): ArrClienteMesRow | null {
  return (
    findArrClienteMesRow(clientesB, cliente) ?? findArrClienteMesRow(clientesA, cliente)
  );
}

function planCategoriaFromArr(arr: ArrClienteMesRow | null): {
  categoria: "CASA" | "COMISIONISTA";
  subcategoria: string;
} {
  if (!arr) return { categoria: "CASA", subcategoria: "" };
  const comi =
    categoriaEsComisionista(arr.categoria) ||
    dicfClienteEsComisionista({ canal: arr.categoria, subcanal: arr.subcategoria });
  return {
    categoria: comi ? "COMISIONISTA" : "CASA",
    subcategoria: String(arr.subcategoria ?? "").trim(),
  };
}

function buildPlanRowSinVenta(
  row: ClienteTablaRow,
  arr: ArrClienteMesRow | null
): NuevoClientePlanRow | null {
  const kg =
    row.ventaB != null && Number.isFinite(row.ventaB) && row.ventaB > 0
      ? Math.round(row.ventaB)
      : 0;
  if (kg <= 0) return null;
  const descKg =
    row.descB != null && Number.isFinite(row.descB) ? row.descB : 0;
  const { categoria, subcategoria } = planCategoriaFromArr(arr);
  return {
    id: idPlanRowSinVenta(row.cliente),
    nombre: row.cliente.trim(),
    kg,
    descKg,
    gastoMxn: 0,
    responsable: "",
    responsableId: null,
    categoria,
    subcategoria,
    hgCliente: null,
    hgCompra: null,
    comentarios: "",
    origen: "sin_venta",
    incluirEnForecastMes: true,
  };
}

/** Resta en D6 el kg/desc del cliente tal como en ARR (misma lógica que Sin venta, sin excluir volumen). */
function buildPlanRowArrQuita(
  row: ClienteTablaRow,
  arr: ArrClienteMesRow | null,
  hg?: { hgCliente: number | null; hgCompra: number | null }
): NuevoClientePlanRow | null {
  const kg =
    row.ventaB != null && Number.isFinite(row.ventaB) && row.ventaB > 0
      ? Math.round(row.ventaB)
      : 0;
  if (kg <= 0) return null;
  const descKg =
    row.descB != null && Number.isFinite(row.descB) ? row.descB : 0;
  const { categoria, subcategoria } = planCategoriaFromArr(arr);
  return {
    id: idPlanRowArrQuita(row.cliente),
    nombre: row.cliente.trim(),
    kg,
    descKg,
    gastoMxn: 0,
    responsable: "",
    responsableId: null,
    categoria,
    subcategoria,
    hgCliente: hg?.hgCliente ?? null,
    hgCompra: hg?.hgCompra ?? null,
    comentarios: "",
    origen: "arr_quita",
    incluirEnForecastMes: true,
  };
}

/** Suma en D6 los kg/desc editados (misma lógica que Nuevo cliente manual en D6). */
function buildPlanRowEdicionForecast(
  row: ClienteTablaRow,
  newKg: number,
  arr: ArrClienteMesRow | null,
  descOverride?: number,
  hg?: { hgCliente: number | null; hgCompra: number | null }
): NuevoClientePlanRow {
  const kg = Math.round(Number(newKg) || 0);
  const descKg =
    descOverride != null && Number.isFinite(descOverride)
      ? descOverride
      : row.descB != null && Number.isFinite(row.descB)
        ? row.descB
        : 0;
  const { categoria, subcategoria } = planCategoriaFromArr(arr);
  return {
    id: idPlanRowEdicionForecast(row.cliente),
    nombre: row.cliente.trim(),
    kg: kg > 0 ? kg : 1,
    descKg,
    gastoMxn: 0,
    responsable: "",
    responsableId: null,
    categoria,
    subcategoria,
    hgCliente: hg?.hgCliente ?? null,
    hgCompra: hg?.hgCompra ?? null,
    comentarios: "",
    origen: "edicion_forecast",
    incluirEnForecastMes: true,
  };
}

function upsertFilasEdicionForecastEnPlan(
  nuevos: NuevoClientePlanRow[],
  rowT: ClienteTablaRow,
  arr: ArrClienteMesRow | null,
  newKg: number,
  newDesc: number,
  hg?: { hgCliente: number | null; hgCompra: number | null }
): NuevoClientePlanRow[] {
  const k = rowT.cliente.trim();
  let out = quitarFilasEdicionForecastDePlan(nuevos, k);
  const quita = buildPlanRowArrQuita(rowT, arr, hg);
  if (quita) out = [...out, quita];
  out = [...out, buildPlanRowEdicionForecast(rowT, newKg, arr, newDesc, hg)];
  return out;
}

function hgEdicionForecastExistente(
  nuevos: NuevoClientePlanRow[],
  cliente: string
): { hgCliente: number | null; hgCompra: number | null } | undefined {
  const k = cliente.trim();
  const hit =
    nuevos.find((n) => n.id === idPlanRowEdicionForecast(k)) ??
    nuevos.find((n) => n.id === idPlanRowArrQuita(k));
  if (!hit) return undefined;
  return { hgCliente: hit.hgCliente, hgCompra: hit.hgCompra };
}

/** Persiste venta/desc. sim + par arr_quita/edicion_forecast con HG (tras modal). */
function aplicarEdicionForecastEnSlice(
  s: ArrWorkspaceSlice,
  row: ClienteTablaRow,
  newKg: number,
  newDesc: number,
  hgCliente: number,
  hgCompra: number,
  clientesA: ClientesMonthData | undefined,
  clientesB: ClientesMonthData | undefined
): ArrWorkspaceSlice {
  const k = row.cliente.trim();
  const nextVenta = { ...s.clientesVentaForecastSim };
  const nextDesc = { ...s.clientesDescForecastSim };
  let nuevos = s.nuevosClientesPlan;
  const origKg = row.ventaB;
  const origDesc = row.descB;
  const kgR = Math.round(newKg);
  const descR = newDesc;
  if (
    origKg != null &&
    Number.isFinite(origKg) &&
    origKg > 0 &&
    kgR === Math.round(origKg)
  ) {
    delete nextVenta[k];
  } else {
    nextVenta[k] = kgR;
  }
  if (origDesc != null && Number.isFinite(origDesc) && origDesc === descR) {
    delete nextDesc[k];
  } else {
    nextDesc[k] = descR;
  }
  if (!(k in nextVenta) && !(k in nextDesc)) {
    nuevos = quitarFilasEdicionForecastDePlan(nuevos, k);
  } else {
    const ar = resolveArrClienteForPlan(clientesA, clientesB, k);
    nuevos = upsertFilasEdicionForecastEnPlan(nuevos, row, ar, kgR, descR, {
      hgCliente,
      hgCompra,
    });
  }
  return {
    ...s,
    clientesVentaForecastSim: nextVenta,
    clientesDescForecastSim: nextDesc,
    nuevosClientesPlan: nuevos,
  };
}

function buildPlanRowConVenta(
  row: ClienteTablaRow,
  sim: { kg: number; descKg: number | null },
  arr: ArrClienteMesRow | null
): NuevoClientePlanRow {
  const kg = Math.round(Number(sim.kg) || 0);
  const descKg =
    sim.descKg != null && Number.isFinite(sim.descKg)
      ? sim.descKg
      : row.descA != null && Number.isFinite(row.descA)
        ? row.descA
        : 0;
  const { categoria, subcategoria } = planCategoriaFromArr(arr);
  return {
    id: idPlanRowConVenta(row.cliente),
    nombre: row.cliente.trim(),
    kg: kg > 0 ? kg : 1000,
    descKg,
    gastoMxn: 0,
    responsable: "",
    responsableId: null,
    categoria,
    subcategoria,
    hgCliente: null,
    hgCompra: null,
    comentarios: "",
    origen: "con_venta",
    incluirEnForecastMes: true,
  };
}

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

/** Ajusta venta (t) y descuento ponderado por cambio de kg proyectado por cliente (ARR Plan). */
function applyVentaSimToMetricB(
  metricB: ResumenMesMetrics,
  clientesB: ClientesMonthData | undefined,
  filasPrimero: ClienteTablaRow[],
  filasSolo: ClienteTablaRow[],
  excluir: Record<string, true> | undefined,
  ventaSim: Record<string, number> | undefined,
  descSim: Record<string, number> | undefined
): ResumenMesMetrics {
  if (!clientesB || clientesB.historico) return metricB;
  if (!ventaSim || Object.keys(ventaSim).length === 0) return metricB;
  const chunks: Array<{ deltaKg: number; descKg: number | null }> = [];
  for (const row of [...filasPrimero, ...filasSolo]) {
    if (excluir?.[row.cliente]) continue;
    const newKg = ventaSim[row.cliente];
    if (newKg == null || !Number.isFinite(newKg) || newKg <= 0) continue;
    const origKg = row.ventaB;
    if (origKg == null || !Number.isFinite(origKg) || origKg <= 0) continue;
    const delta = Math.round(newKg) - Math.round(origKg);
    if (delta === 0) continue;
    const simDesc = descSim?.[row.cliente];
    const d =
      simDesc != null && Number.isFinite(simDesc)
        ? simDesc
        : row.descB != null && Number.isFinite(row.descB)
          ? row.descB
          : null;
    chunks.push({ deltaKg: delta, descKg: d });
  }
  return applyKgDeltaChunksToMetricB(metricB, chunks);
}

function applyKgDeltaChunksToMetricB(
  base: ResumenMesMetrics,
  chunks: Array<{ deltaKg: number; descKg: number | null }>
): ResumenMesMetrics {
  if (!chunks.length) return base;
  const ton = base.ventaTon;
  const descSigned = base.descuentoSigned;
  if (ton == null || !Number.isFinite(ton) || descSigned == null || !Number.isFinite(descSigned)) {
    return base;
  }
  let sumDeltaKg = 0;
  let sumDescDelta = 0;
  for (const c of chunks) {
    if (!Number.isFinite(c.deltaKg) || c.deltaKg === 0) continue;
    sumDeltaKg += c.deltaKg;
    const d =
      c.descKg != null && Number.isFinite(c.descKg) ? c.descKg : descSigned;
    sumDescDelta += d * c.deltaKg;
  }
  if (sumDeltaKg === 0) return base;
  const totalKg0 = ton * 1000;
  const newKg = totalKg0 + sumDeltaKg;
  if (!Number.isFinite(newKg) || newKg <= 0) return base;
  const newDesc = (descSigned * totalKg0 + sumDescDelta) / newKg;
  return {
    ...base,
    ventaTon: newKg / 1000,
    descuentoSigned: newDesc,
  };
}

/**
 * Ajusta `descuentoSigned` por simulación de descuento $/kg de clientes activos en forecast.
 * El descSigned ponderado cumple aprox. `descSigned * totalKg = -Σ(descB_i × kg_i)`. Para cada
 * cliente con override `descSim`: delta_numerador = (descB_orig − descSim) × kg.
 * Aplicar después de `applyExclusionsToMetricB` y `applyVentaSimToMetricB` (los excluidos se ignoran).
 */
function applyDescuentoSimToMetricB(
  metricB: ResumenMesMetrics,
  clientesB: ClientesMonthData | undefined,
  filasPrimero: ClienteTablaRow[],
  filasSolo: ClienteTablaRow[],
  excluir: Record<string, true> | undefined,
  descSim: Record<string, number> | undefined,
  ventaSim?: Record<string, number>,
  /** Clientes con par arr_quita+edicion_forecast: el desc. ponderado va por D6, no por este delta. */
  nuevosPlan?: NuevoClientePlanRow[]
): ResumenMesMetrics {
  if (!clientesB || clientesB.historico) return metricB;
  if (!descSim || Object.keys(descSim).length === 0) return metricB;
  const ton = metricB.ventaTon;
  const descSigned = metricB.descuentoSigned;
  if (ton == null || !Number.isFinite(ton) || descSigned == null || !Number.isFinite(descSigned)) {
    return metricB;
  }
  const totalKg = ton * 1000;
  if (!Number.isFinite(totalKg) || totalKg <= 0) return metricB;
  let deltaNum = 0;
  for (const row of [...filasPrimero, ...filasSolo]) {
    if (excluir?.[row.cliente]) continue;
    if (nuevosPlan && clienteConEdicionForecastEnPlan(nuevosPlan, row.cliente)) continue;
    const sim = descSim[row.cliente];
    if (sim == null || !Number.isFinite(sim)) continue;
    const vs = ventaSim?.[row.cliente];
    const kg =
      vs != null && Number.isFinite(vs) && vs > 0
        ? Math.round(vs)
        : row.ventaB;
    if (kg == null || !Number.isFinite(kg) || kg <= 0) continue;
    const orig = row.descB != null && Number.isFinite(row.descB) ? row.descB : 0;
    deltaNum += (orig - sim) * kg;
  }
  if (deltaNum === 0) return metricB;
  return { ...metricB, descuentoSigned: descSigned + deltaNum / totalKg };
}

/** Suma kg simulados al total forecast y recalcula descuento $/kg ponderado (inverso de excluir). */
function applyConVentaSimuladaToMetricB(
  base: ResumenMesMetrics,
  conVenta: Record<string, { kg: number; descKg: number | null }> | undefined
): ResumenMesMetrics {
  if (!conVenta || Object.keys(conVenta).length === 0) return base;
  return applyExtraKgDescChunksToMetricB(base, Object.values(conVenta));
}

/** Impuestos en operativos ($) por kg nuevo cliente: Σ kg × impuesto $/kg del mes (misma J del resumen). */
function sumOperativosExtraImpuestosNuevosKg(
  nuevos: Array<{ kg: number }>,
  impuestoKg: number | null
): number {
  if (impuestoKg == null || !Number.isFinite(impuestoKg)) return 0;
  let s = 0;
  for (const n of nuevos) {
    const kg = Number(n.kg);
    if (!Number.isFinite(kg) || kg <= 0) continue;
    s += kg * impuestoKg;
  }
  return s;
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

/**
 * Mes B forecast: rentabilidad Σ ingreso − Gasto con «Sin venta» y/o «Con venta»,
 * usando `metricBResumen` (venta/desc ya ajustados en cadena).
 */
function rentabilidadForecastMesBAjustada(
  filasPrimero: ClienteTablaRow[],
  filasSoloMesB: ClienteTablaRow[],
  gastoImporte: number | null,
  metricBResumen: ResumenMesMetrics,
  excluir: Record<string, true> | undefined,
  conVenta: Record<string, { kg: number; descKg: number | null }> | undefined,
  nuevosPlan: Array<{
    kg: number;
    descKg: number;
    hgCliente?: number | null;
    hgCompra?: number | null;
  }>,
  /** Override del descuento $/kg en forecast por cliente (simulación). */
  descSim?: Record<string, number>,
  ventaSim?: Record<string, number>
): number | null {
  if (gastoImporte == null || !Number.isFinite(gastoImporte)) return null;
  const hasEx = excluir && Object.keys(excluir).length > 0;
  const hasSim = conVenta && Object.keys(conVenta).length > 0;
  const hasNuevo = nuevosPlan.some((n) => Number.isFinite(n.kg) && n.kg > 0);
  const hasDescSim = descSim != null && Object.keys(descSim).length > 0;
  const hasVentaSim = ventaSim != null && Object.keys(ventaSim).length > 0;
  if (!hasEx && !hasSim && !hasNuevo && !hasDescSim && !hasVentaSim) return null;
  const cv = conVenta ?? {};
  const ingresoFila = (r: ClienteTablaRow): number => {
    if (excluir?.[r.cliente]) return 0;
    return ingresoBMesBConSimMap(r, cv, metricBResumen, descSim, ventaSim) ?? 0;
  };
  let sumIng = 0;
  for (const r of filasPrimero) sumIng += ingresoFila(r);
  for (const r of filasSoloMesB) sumIng += ingresoFila(r);
  for (const n of nuevosPlan) {
    if (!Number.isFinite(n.kg) || n.kg <= 0) continue;
    sumIng +=
      ingresoClienteMarginal(
        n.kg,
        n.descKg,
        metricBResumen,
        n.hgCliente,
        n.hgCompra
      ) ?? 0;
  }
  return Math.round(sumIng - gastoImporte);
}

/** Pendiente al editar venta/desc. forecast: el modal HG confirma antes de persistir. */
type EdicionForecastSetupPending = {
  row: ClienteTablaRow;
  tipo: "venta" | "desc";
  newKg: number;
  newDesc: number;
};

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
  const lastPlanPersistKeyLoadedRef = useRef<string>("");

  const [periodos, setPeriodos] = useState<IgfPeriodo[]>([]);
  const [periodosError, setPeriodosError] = useState<string | null>(null);
  const [wsBase, setWsBase] = useState<ArrWorkspaceSlice>(() => emptyArrWorkspaceSlice());
  const [wsPlan, setWsPlan] = useState<ArrWorkspaceSlice>(() => emptyArrWorkspaceSlice());
  const [dicfModalCliente, setDicfModalCliente] = useState<string | null>(null);
  const [dicfCategoriaModal, setDicfCategoriaModal] = useState<"CASA" | "COMISIONISTA" | null>(
    null
  );
  const [showSimular, setShowSimular] = useState(false);
  const [showNuevoClientePlan, setShowNuevoClientePlan] = useState(false);
  const [clientePlanEditando, setClientePlanEditando] = useState<NuevoClientePlanRow | null>(null);
  /** Al marcar «Sin venta», se abre el modal HG antes de confirmar la exclusión. */
  const [sinVentaSetupRow, setSinVentaSetupRow] = useState<ClienteTablaRow | null>(null);
  const sinVentaSetupRowRef = useRef<ClienteTablaRow | null>(null);
  useEffect(() => {
    sinVentaSetupRowRef.current = sinVentaSetupRow;
  }, [sinVentaSetupRow]);
  const [edicionForecastSetup, setEdicionForecastSetup] =
    useState<EdicionForecastSetupPending | null>(null);
  const edicionForecastSetupRef = useRef<EdicionForecastSetupPending | null>(null);
  useEffect(() => {
    edicionForecastSetupRef.current = edicionForecastSetup;
  }, [edicionForecastSetup]);
  const [responsablesPlan, setResponsablesPlan] = useState<{ id: number; nombre: string }[]>([]);
  const [plantaIdPlan, setPlantaIdPlan] = useState<number | null>(null);

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
  const clientesConVentaForecastSim = ws.clientesConVentaForecastSim;
  const clientesDescForecastSim = ws.clientesDescForecastSim;
  const clientesVentaForecastSim = ws.clientesVentaForecastSim;
  const nuevosClientesPlan = ws.nuevosClientesPlan;

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
      });
      if (isArrPlanRoute) setWsPlan(patch);
      else setWsBase(patch);
    },
    [isArrPlanRoute]
  );

  const toggleClienteExcluirForecast = useCallback(
    (row: ClienteTablaRow) => {
      const k = row.cliente.trim();
      if (!k) return;
      if (isArrPlanRoute) {
        const keyB = empresa && selB ? clientesCacheKey(empresa, selB, dataByKey[selB]) : "";
        const keyA = empresa && selA ? clientesCacheKey(empresa, selA, dataByKey[selA]) : "";
        const was = !!clientesExcluirVentaForecast[k];
        if (was) {
          setSinVentaSetupRow(null);
          setWsPlan((s) => {
            const next = { ...s.clientesExcluirVentaForecast };
            delete next[k];
            const idSv = idPlanRowSinVenta(k);
            return {
              ...s,
              clientesExcluirVentaForecast: next,
              nuevosClientesPlan: s.nuevosClientesPlan.filter((n) => n.id !== idSv),
            };
          });
          return;
        }
        const ar = resolveArrClienteForPlan(
          keyA ? clientesByKey[keyA] : undefined,
          keyB ? clientesByKey[keyB] : undefined,
          k
        );
        const planRow = buildPlanRowSinVenta(row, ar);
        if (!planRow) return;
        setSinVentaSetupRow(row);
        setClientePlanEditando(planRow);
        setShowNuevoClientePlan(true);
        return;
      }
      const patch = (s: ArrWorkspaceSlice) => {
        const next = { ...s.clientesExcluirVentaForecast };
        const was = !!next[k];
        if (was) delete next[k];
        else next[k] = true;
        return { ...s, clientesExcluirVentaForecast: next };
      };
      setWsBase(patch);
    },
    [
      isArrPlanRoute,
      empresa,
      selA,
      selB,
      dataByKey,
      clientesByKey,
      clientesExcluirVentaForecast,
    ]
  );

  /** Cliente inactivo en forecast: sin kg proyectado en mes B (casilla Sin venta deshabilitada). */
  const clienteInactivoForecastB = useCallback((row: ClienteTablaRow): boolean => {
    return row.ventaB == null || !Number.isFinite(row.ventaB) || row.ventaB <= 0;
  }, []);

  const toggleClienteConVentaForecast = useCallback(
    (row: ClienteTablaRow) => {
      const k = row.cliente.trim();
      if (!k || !clienteInactivoForecastB(row)) return;
      const patch = (s: ArrWorkspaceSlice) => {
        const next = { ...s.clientesConVentaForecastSim };
        let nuevos = s.nuevosClientesPlan;
        const idCv = idPlanRowConVenta(k);
        if (next[k]) {
          delete next[k];
          if (isArrPlanRoute) nuevos = nuevos.filter((n) => n.id !== idCv);
        } else {
          const va = row.ventaA;
          const kg =
            va != null && va > 0 && Number.isFinite(va) ? Math.round(va) : 1000;
          const descKg =
            row.descA != null && Number.isFinite(row.descA) ? row.descA : null;
          next[k] = { kg, descKg };
          if (isArrPlanRoute && empresa) {
            const ca =
              s.selA && s.dataByKey[s.selA]
                ? s.clientesByKey[clientesCacheKey(empresa, s.selA, s.dataByKey[s.selA])]
                : undefined;
            const cb =
              s.selB && s.dataByKey[s.selB]
                ? s.clientesByKey[clientesCacheKey(empresa, s.selB, s.dataByKey[s.selB])]
                : undefined;
            const planRow = buildPlanRowConVenta(row, next[k], resolveArrClienteForPlan(ca, cb, k));
            nuevos = [...nuevos.filter((n) => n.id !== idCv), planRow];
          }
        }
        return { ...s, clientesConVentaForecastSim: next, nuevosClientesPlan: nuevos };
      };
      if (isArrPlanRoute) setWsPlan(patch);
      else setWsBase(patch);
    },
    [isArrPlanRoute, clienteInactivoForecastB, empresa]
  );

  const cerrarModalPlanTrasGuardar = useCallback(() => {
    setShowNuevoClientePlan(false);
    setClientePlanEditando(null);
    setSinVentaSetupRow(null);
    setEdicionForecastSetup(null);
  }, []);

  const cancelarModalPlan = useCallback(() => {
    if (sinVentaSetupRow) {
      const k = sinVentaSetupRow.cliente.trim();
      setWsPlan((s) => {
        const next = { ...s.clientesExcluirVentaForecast };
        delete next[k];
        const idSv = idPlanRowSinVenta(k);
        return {
          ...s,
          clientesExcluirVentaForecast: next,
          nuevosClientesPlan: s.nuevosClientesPlan.filter((n) => n.id !== idSv),
        };
      });
    }
    setEdicionForecastSetup(null);
    cerrarModalPlanTrasGuardar();
  }, [sinVentaSetupRow, cerrarModalPlanTrasGuardar]);

  const guardarNuevoClientePlanModal = useCallback(
    (payload: {
      id?: string;
      nombre: string;
      kg: number;
      descKg: number;
      gastoMxn: number;
      responsable: string;
      responsableId: number;
      categoria: "CASA" | "COMISIONISTA";
      subcategoria: string;
      hgCliente: number | null;
      hgCompra: number | null;
      comentarios: string;
      incluirEnForecastMes?: boolean;
    }) => {
      if (!isArrPlanRoute) return;
      const incluirMes = payload.incluirEnForecastMes !== false;

      const pendingSinVenta = sinVentaSetupRowRef.current;
      if (pendingSinVenta) {
        const k = pendingSinVenta.cliente.trim();
        const idSv = idPlanRowSinVenta(k);
        const {
          kg,
          descKg,
          gastoMxn,
          responsable,
          responsableId,
          categoria,
          subcategoria,
          hgCliente,
          hgCompra,
          comentarios,
        } = payload;
        setWsPlan((s) => ({
          ...s,
          clientesExcluirVentaForecast: { ...s.clientesExcluirVentaForecast, [k]: true },
          nuevosClientesPlan: [
            ...s.nuevosClientesPlan.filter((n) => n.id !== idSv),
            {
              id: idSv,
              nombre: k,
              kg,
              descKg,
              gastoMxn,
              responsable,
              responsableId,
              categoria,
              subcategoria,
              hgCliente,
              hgCompra,
              comentarios,
              origen: "sin_venta",
              incluirEnForecastMes: incluirMes,
            },
          ],
        }));
        cerrarModalPlanTrasGuardar();
        return;
      }

      const pendingEdicion = edicionForecastSetupRef.current;
      if (pendingEdicion) {
        const { row, newKg, newDesc } = pendingEdicion;
        const hgC = payload.hgCliente;
        const hgP = payload.hgCompra;
        if (hgC == null || !Number.isFinite(hgC) || hgP == null || !Number.isFinite(hgP)) {
          return;
        }
        setWsPlan((s) => {
          const keyA =
            empresa && s.selA && s.dataByKey[s.selA]
              ? clientesCacheKey(empresa, s.selA, s.dataByKey[s.selA])
              : "";
          const keyB =
            empresa && s.selB && s.dataByKey[s.selB]
              ? clientesCacheKey(empresa, s.selB, s.dataByKey[s.selB])
              : "";
          const ca = keyA ? s.clientesByKey[keyA] : undefined;
          const cb = keyB ? s.clientesByKey[keyB] : undefined;
          return aplicarEdicionForecastEnSlice(
            s,
            row,
            newKg,
            newDesc,
            hgC,
            hgP,
            ca,
            cb
          );
        });
        cerrarModalPlanTrasGuardar();
        return;
      }

      if (payload.id) {
        const {
          id,
          nombre,
          kg,
          descKg,
          gastoMxn,
          responsable,
          responsableId,
          categoria,
          subcategoria,
          hgCliente,
          hgCompra,
          comentarios,
        } = payload;
        setWsPlan((s) => {
          const prev = s.nuevosClientesPlan.find((x) => x.id === id);
          const origen = prev?.origen;
          const key = nombre.trim();
          let nuevos = s.nuevosClientesPlan.map((n) =>
            n.id === id
              ? {
                  id,
                  nombre,
                  kg,
                  descKg,
                  gastoMxn,
                  responsable,
                  responsableId,
                  categoria,
                  subcategoria,
                  hgCliente,
                  hgCompra,
                  comentarios,
                  origen: origen ?? "manual",
                  incluirEnForecastMes: incluirMes,
                }
              : n
          );
          if (origen === "edicion_forecast" && key) {
            nuevos = nuevos.map((n) =>
              n.id === idPlanRowArrQuita(key) || n.id === idPlanRowEdicionForecast(key)
                ? {
                    ...n,
                    hgCliente,
                    hgCompra,
                    comentarios,
                    responsable,
                    responsableId,
                    categoria,
                    subcategoria,
                  }
                : n
            );
          }
          let cv = s.clientesConVentaForecastSim;
          let ex = s.clientesExcluirVentaForecast;
          let ventaSim = s.clientesVentaForecastSim;
          let descSim = s.clientesDescForecastSim;
          if (origen === "con_venta") {
            cv = {
              ...cv,
              [key]: {
                kg: Math.round(kg),
                descKg: Number.isFinite(descKg) ? descKg : null,
              },
            };
          }
          if (origen === "sin_venta") {
            if (key) ex = { ...ex, [key]: true };
          }
          if (origen === "edicion_forecast" && key) {
            const kgR = Math.round(kg);
            ventaSim = { ...ventaSim };
            descSim = { ...descSim };
            const edPrev = prev;
            const origKgHint = edPrev?.kg;
            if (
              origKgHint != null &&
              Number.isFinite(origKgHint) &&
              kgR === Math.round(origKgHint) &&
              s.clientesVentaForecastSim[key] == null
            ) {
              delete ventaSim[key];
            } else {
              ventaSim[key] = kgR;
            }
            if (edPrev && Number.isFinite(edPrev.descKg) && descKg === edPrev.descKg) {
              if (!(key in s.clientesDescForecastSim)) delete descSim[key];
            } else {
              descSim[key] = descKg;
            }
          }
          return {
            ...s,
            nuevosClientesPlan: nuevos,
            clientesConVentaForecastSim: cv,
            clientesExcluirVentaForecast: ex,
            clientesVentaForecastSim: ventaSim,
            clientesDescForecastSim: descSim,
          };
        });
        cerrarModalPlanTrasGuardar();
        return;
      }
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `nuevo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const {
        nombre,
        kg,
        descKg,
        gastoMxn,
        responsable,
        responsableId,
        categoria,
        subcategoria,
        hgCliente,
        hgCompra,
        comentarios,
      } = payload;
      setWsPlan((s) => ({
        ...s,
        nuevosClientesPlan: [
          ...s.nuevosClientesPlan,
          {
            id,
            nombre,
            kg,
            descKg,
            gastoMxn,
            responsable,
            responsableId,
            categoria,
            subcategoria,
            hgCliente,
            hgCompra,
            comentarios,
            incluirEnForecastMes: incluirMes,
          },
        ],
      }));
      cerrarModalPlanTrasGuardar();
    },
    [isArrPlanRoute, sinVentaSetupRow, cerrarModalPlanTrasGuardar, empresa]
  );

  const setNuevoPlanIncluirEnForecastMes = useCallback((id: string, incluir: boolean) => {
    setWsPlan((s) => ({
      ...s,
      nuevosClientesPlan: s.nuevosClientesPlan.map((n) =>
        n.id === id ? { ...n, incluirEnForecastMes: incluir } : n
      ),
    }));
  }, []);

  const quitarNuevoClientePlan = useCallback((id: string) => {
    setWsPlan((s) => {
      let nuevos = s.nuevosClientesPlan;
      let ex = s.clientesExcluirVentaForecast;
      let cv = s.clientesConVentaForecastSim;
      let ventaSim = s.clientesVentaForecastSim;
      const cliSv = clienteDesdePlanForecastId(id, PLAN_ID_SIN_VENTA);
      if (cliSv) {
        const nx = { ...ex };
        delete nx[cliSv];
        ex = nx;
      }
      const cliCv = clienteDesdePlanForecastId(id, PLAN_ID_CON_VENTA);
      if (cliCv) {
        const nx = { ...cv };
        delete nx[cliCv];
        cv = nx;
      }
      const cliEq =
        clienteDesdePlanForecastId(id, PLAN_ID_EDICION_FORECAST) ??
        clienteDesdePlanForecastId(id, PLAN_ID_ARR_QUITA);
      if (cliEq) {
        const nx = { ...ventaSim };
        delete nx[cliEq];
        ventaSim = nx;
        nuevos = quitarFilasEdicionForecastDePlan(s.nuevosClientesPlan, cliEq);
      }
      return {
        ...s,
        clientesExcluirVentaForecast: ex,
        clientesConVentaForecastSim: cv,
        clientesVentaForecastSim: ventaSim,
        nuevosClientesPlan: nuevos.filter((n) => n.id !== id),
      };
    });
  }, []);

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
      if (!isArrPlanRoute)
        setWsBase((s) => ({
          ...s,
          clientesExcluirVentaForecast: {},
          clientesConVentaForecastSim: {},
        }));
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
    lastPlanPersistKeyLoadedRef.current = "";
    setResponsablesPlan([]);
    setPlantaIdPlan(null);
  }, [token, uploadDayFromUrl]);

  // Resolver planta_id desde el nombre de empresa (para responsables tipo Action Register).
  useEffect(() => {
    if (!token || !empresa) {
      setPlantaIdPlan(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchPlantas(token);
        if (cancelled) return;
        const pid = resolvePlantaIdFromEmpresaLabel(empresa, r.plantas || []);
        setPlantaIdPlan(pid);
      } catch {
        if (cancelled) return;
        setPlantaIdPlan(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, empresa]);

  useEffect(() => {
    if (!token || !plantaIdPlan) {
      setResponsablesPlan([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchActionRegisterResponsables(token, plantaIdPlan);
        if (cancelled) return;
        setResponsablesPlan((r.usuarios || []).map((u) => ({ id: u.id, nombre: u.nombre })));
      } catch {
        if (cancelled) return;
        setResponsablesPlan([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, plantaIdPlan]);

  // Persistencia local (solo ARR Plan): guarda/recupera Sin venta, Con venta y Nuevos clientes por (empresa, mes B).
  useEffect(() => {
    if (!token || !empresa || !wsPlan.selB) return;
    const key = planPersistKey(token, empresa, wsPlan.selB);
    if (lastPlanPersistKeyLoadedRef.current === key) return;
    lastPlanPersistKeyLoadedRef.current = key;
    type Persist = {
      excluir: Record<string, true>;
      conVenta: Record<string, { kg: number; descKg: number | null }>;
      descSim?: Record<string, number>;
      ventaSim?: Record<string, number>;
      nuevos: NuevoClientePlanRow[];
    };
    const parsed = safeJsonParse<Persist>(typeof window !== "undefined" ? window.localStorage.getItem(key) : null);
    if (!parsed) {
      setWsPlan((s) => ({
        ...s,
        clientesExcluirVentaForecast: {},
        clientesConVentaForecastSim: {},
        clientesDescForecastSim: {},
        clientesVentaForecastSim: {},
        nuevosClientesPlan: [],
      }));
      return;
    }
    const nuevos = (parsed.nuevos ?? [])
      .map((x) => normalizeNuevoClientePlanRow(x))
      .filter((x): x is NuevoClientePlanRow => Boolean(x));
    const descSim = (() => {
      const raw = parsed.descSim;
      if (!raw || typeof raw !== "object") return {};
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        const n = Number(v);
        if (Number.isFinite(n)) out[k] = n;
      }
      return out;
    })();
    const ventaSim = (() => {
      const raw = parsed.ventaSim;
      if (!raw || typeof raw !== "object") return {};
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) out[k] = Math.round(n);
      }
      return out;
    })();
    setWsPlan((s) => ({
      ...s,
      clientesExcluirVentaForecast: parsed.excluir ?? {},
      clientesConVentaForecastSim: parsed.conVenta ?? {},
      clientesDescForecastSim: descSim,
      clientesVentaForecastSim: ventaSim,
      nuevosClientesPlan: nuevos,
    }));
  }, [token, empresa, wsPlan.selB]);

  useEffect(() => {
    if (!token || !empresa || !wsPlan.selB) return;
    const key = planPersistKey(token, empresa, wsPlan.selB);
    const payload = {
      excluir: wsPlan.clientesExcluirVentaForecast ?? {},
      conVenta: wsPlan.clientesConVentaForecastSim ?? {},
      descSim: wsPlan.clientesDescForecastSim ?? {},
      ventaSim: wsPlan.clientesVentaForecastSim ?? {},
      nuevos: wsPlan.nuevosClientesPlan ?? [],
    };
    try {
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // si el storage está lleno o bloqueado, no interrumpimos la UI
    }
  }, [
    token,
    empresa,
    wsPlan.selB,
    wsPlan.clientesExcluirVentaForecast,
    wsPlan.clientesConVentaForecastSim,
    wsPlan.clientesDescForecastSim,
    wsPlan.clientesVentaForecastSim,
    wsPlan.nuevosClientesPlan,
  ]);

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
        acciones_abiertas: rB?.acciones_abiertas ?? rA?.acciones_abiertas ?? 0,
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
          acciones_abiertas: rB.acciones_abiertas ?? 0,
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

  const abrirModalEdicionForecast = useCallback(
    (row: ClienteTablaRow, pending: EdicionForecastSetupPending) => {
      const k = row.cliente.trim();
      const ar = resolveArrClienteForPlan(clientesA, clientesB, k);
      const hgPrev = hgEdicionForecastExistente(nuevosClientesPlan, k);
      const draft = buildPlanRowEdicionForecast(
        row,
        pending.newKg,
        ar,
        pending.newDesc,
        hgPrev
      );
      setEdicionForecastSetup(pending);
      setSinVentaSetupRow(null);
      setClientePlanEditando(draft);
      setShowNuevoClientePlan(true);
    },
    [clientesA, clientesB, nuevosClientesPlan]
  );

  /**
   * Setea (o limpia) el descuento simulado para un cliente en el mes forecast.
   * En ARR Plan abre el modal HG (como Sin venta) antes de crear arr_quita + edicion_forecast.
   */
  const setClienteDescForecastSim = useCallback(
    (cliente: string, valor: number | null) => {
      const k = cliente.trim();
      if (!k) return;
      if (!isArrPlanRoute) {
        const patch = (s: ArrWorkspaceSlice) => {
          const next = { ...s.clientesDescForecastSim };
          if (valor == null || !Number.isFinite(valor)) delete next[k];
          else next[k] = valor;
          return { ...s, clientesDescForecastSim: next };
        };
        setWsBase(patch);
        return;
      }
      const rowT = findClienteTablaRowInFilas(
        k,
        filasClientesMesPrimero,
        filasClientesSoloMesSegundo
      );
      if (!rowT || rowT.ventaB == null || rowT.ventaB <= 0) return;
      const patchClear = (s: ArrWorkspaceSlice) => {
        const next = { ...s.clientesDescForecastSim };
        if (!(k in next)) {
          if (s.clientesVentaForecastSim[k] != null) return s;
        } else {
          delete next[k];
        }
        let nuevos = s.nuevosClientesPlan;
        if (s.clientesVentaForecastSim[k] == null) {
          nuevos = quitarFilasEdicionForecastDePlan(nuevos, k);
        }
        return { ...s, clientesDescForecastSim: next, nuevosClientesPlan: nuevos };
      };
      if (valor == null || !Number.isFinite(valor)) {
        setWsPlan(patchClear);
        return;
      }
      const origDesc = rowT.descB;
      if (
        origDesc != null &&
        Number.isFinite(origDesc) &&
        valor === origDesc &&
        clientesVentaForecastSim[k] == null
      ) {
        setWsPlan(patchClear);
        return;
      }
      const kg =
        clientesVentaForecastSim[k] != null &&
        Number.isFinite(clientesVentaForecastSim[k])
          ? Math.round(clientesVentaForecastSim[k])
          : Math.round(rowT.ventaB);
      abrirModalEdicionForecast(rowT, {
        row: rowT,
        tipo: "desc",
        newKg: kg,
        newDesc: valor,
      });
    },
    [
      isArrPlanRoute,
      filasClientesMesPrimero,
      filasClientesSoloMesSegundo,
      clientesVentaForecastSim,
      abrirModalEdicionForecast,
    ]
  );

  /** Override de kg proyectados en mes forecast (solo ARR Plan); modal HG antes de persistir. */
  const setClienteVentaForecastSim = useCallback(
    (cliente: string, valor: number | null) => {
      const k = cliente.trim();
      if (!k || !isArrPlanRoute) return;
      const rowT = findClienteTablaRowInFilas(
        k,
        filasClientesMesPrimero,
        filasClientesSoloMesSegundo
      );
      if (!rowT) return;
      if (valor == null || !Number.isFinite(valor) || valor <= 0) {
        setWsPlan((s) => {
          const nextVenta = { ...s.clientesVentaForecastSim };
          if (!(k in s.clientesVentaForecastSim)) return s;
          delete nextVenta[k];
          let nuevos = s.nuevosClientesPlan;
          if (s.clientesDescForecastSim[k] == null) {
            nuevos = quitarFilasEdicionForecastDePlan(nuevos, k);
          }
          return { ...s, clientesVentaForecastSim: nextVenta, nuevosClientesPlan: nuevos };
        });
        return;
      }
      const rounded = Math.round(valor);
      const orig = rowT.ventaB;
      if (
        orig != null &&
        Number.isFinite(orig) &&
        orig > 0 &&
        rounded === Math.round(orig) &&
        clientesDescForecastSim[k] == null
      ) {
        setWsPlan((s) => {
          const nextVenta = { ...s.clientesVentaForecastSim };
          if (!(k in s.clientesVentaForecastSim)) return s;
          delete nextVenta[k];
          const nuevos = quitarFilasEdicionForecastDePlan(s.nuevosClientesPlan, k);
          return { ...s, clientesVentaForecastSim: nextVenta, nuevosClientesPlan: nuevos };
        });
        return;
      }
      const descOv =
        clientesDescForecastSim[k] != null &&
        Number.isFinite(clientesDescForecastSim[k])
          ? clientesDescForecastSim[k]
          : rowT.descB != null && Number.isFinite(rowT.descB)
            ? rowT.descB
            : 0;
      abrirModalEdicionForecast(rowT, {
        row: rowT,
        tipo: "venta",
        newKg: rounded,
        newDesc: descOv,
      });
    },
    [
      isArrPlanRoute,
      filasClientesMesPrimero,
      filasClientesSoloMesSegundo,
      clientesDescForecastSim,
      abrirModalEdicionForecast,
    ]
  );

  /** Si hay casillas Sin/Con venta guardadas sin fila en `nuevosClientesPlan` (p. ej. datos viejos), rehidratar. */
  useEffect(() => {
    if (!isArrPlanRoute) return;
    if (!clientesB || clientesB.historico) return;
    setWsPlan((s) => {
      const primero = filasClientesMesPrimero;
      const solo = filasClientesSoloMesSegundo;
      let nuevos = s.nuevosClientesPlan;
      let changed = false;
      const ensure = (cliente: string, tipo: "sin_venta" | "con_venta") => {
        const id = tipo === "sin_venta" ? idPlanRowSinVenta(cliente) : idPlanRowConVenta(cliente);
        if (nuevos.some((n) => n.id === id)) return;
        const rowT = findClienteTablaRowInFilas(cliente, primero, solo);
        if (!rowT) return;
        const ar = resolveArrClienteForPlan(clientesA, clientesB, cliente);
        if (tipo === "sin_venta") {
          const built = buildPlanRowSinVenta(rowT, ar);
          if (!built) return;
          nuevos = [...nuevos, built];
        } else {
          const sim = s.clientesConVentaForecastSim[cliente];
          if (!sim) return;
          nuevos = [...nuevos, buildPlanRowConVenta(rowT, sim, ar)];
        }
        changed = true;
      };
      const ensureEdicionForecast = (cliente: string) => {
        if (clienteConEdicionForecastEnPlan(nuevos, cliente)) return;
        const rowT = findClienteTablaRowInFilas(cliente, primero, solo);
        if (!rowT) return;
        const kgSim = s.clientesVentaForecastSim[cliente];
        const kg =
          kgSim != null && Number.isFinite(kgSim) && kgSim > 0
            ? Math.round(kgSim)
            : rowT.ventaB != null && Number.isFinite(rowT.ventaB) && rowT.ventaB > 0
              ? Math.round(rowT.ventaB)
              : 0;
        if (kg <= 0) return;
        const hasVenta = Object.prototype.hasOwnProperty.call(
          s.clientesVentaForecastSim,
          cliente
        );
        const hasDesc = Object.prototype.hasOwnProperty.call(
          s.clientesDescForecastSim,
          cliente
        );
        if (!hasVenta && !hasDesc) return;
        const ar = resolveArrClienteForPlan(clientesA, clientesB, cliente);
        const descOv =
          s.clientesDescForecastSim[cliente] != null &&
          Number.isFinite(s.clientesDescForecastSim[cliente])
            ? s.clientesDescForecastSim[cliente]
            : rowT.descB != null && Number.isFinite(rowT.descB)
              ? rowT.descB
              : 0;
        nuevos = upsertFilasEdicionForecastEnPlan(nuevos, rowT, ar, kg, descOv);
        changed = true;
      };
      for (const k of Object.keys(s.clientesExcluirVentaForecast)) ensure(k, "sin_venta");
      for (const k of Object.keys(s.clientesConVentaForecastSim)) ensure(k, "con_venta");
      const clientesEdicionForecast = [
        ...Object.keys(s.clientesVentaForecastSim),
        ...Object.keys(s.clientesDescForecastSim),
      ].filter((c, i, a) => a.indexOf(c) === i);
      for (const k of clientesEdicionForecast) ensureEdicionForecast(k);
      return changed ? { ...s, nuevosClientesPlan: nuevos } : s;
    });
  }, [
    isArrPlanRoute,
    clientesB,
    clientesA,
    filasClientesMesPrimero,
    filasClientesSoloMesSegundo,
    clientesExcluirVentaForecast,
    clientesConVentaForecastSim,
    clientesVentaForecastSim,
  ]);

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

  const catTonA = useMemo(
    () => toneladasCategoriaDesdeClientes(clientesA, undefined, undefined, 0, 0),
    [clientesA]
  );
  const nuevosKgPlanManuales = useMemo(
    () =>
      nuevosClientesPlan.filter(
        (n) => esNuevoKgPlanManual(n) && nuevaFilaCuentaEnForecastMes(n)
      ),
    [nuevosClientesPlan]
  );

  /** Con kg > 0 y que cuenten en forecast: mismas filas que Excel ARR Plan (H6, D6, K11…). */
  const nuevosFilasFormulasPlan = useMemo(
    () =>
      nuevosClientesPlan.filter(
        (n) => Number.isFinite(n.kg) && n.kg > 0 && filaPlanEntraEnFormulaD6(n)
      ),
    [nuevosClientesPlan]
  );

  const { kgNuevosPlanCasa, kgNuevosPlanComi } = useMemo(() => {
    let casa = 0;
    let comi = 0;
    for (const n of nuevosKgPlanManuales) {
      const kg = Number(n.kg);
      if (!Number.isFinite(kg) || kg <= 0) continue;
      if (n.categoria === "COMISIONISTA") comi += kg;
      else casa += kg;
    }
    return { kgNuevosPlanCasa: casa, kgNuevosPlanComi: comi };
  }, [nuevosKgPlanManuales]);
  const catTonB = useMemo(
    () =>
      toneladasCategoriaDesdeClientes(
        clientesB,
        clientesExcluirVentaForecast,
        clientesConVentaForecastSim,
        kgNuevosPlanCasa,
        kgNuevosPlanComi,
        clientesVentaForecastSim
      ),
    [
      clientesB,
      clientesExcluirVentaForecast,
      clientesConVentaForecastSim,
      kgNuevosPlanCasa,
      kgNuevosPlanComi,
      clientesVentaForecastSim,
    ]
  );

  const planNuevosDicfModal = useMemo(
    () =>
      nuevosKgPlanManuales.map((n) => ({
        nombre: n.nombre,
        categoria: n.categoria,
        kg: n.kg,
      })),
    [nuevosKgPlanManuales]
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

  const metricBTrasExclusiones = useMemo(
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

  const metricBTrasVentaSim = useMemo(
    () =>
      applyVentaSimToMetricB(
        metricBTrasExclusiones,
        clientesB,
        filasClientesMesPrimero,
        filasClientesSoloMesSegundo,
        clientesExcluirVentaForecast,
        clientesVentaForecastSim,
        clientesDescForecastSim
      ),
    [
      metricBTrasExclusiones,
      clientesB,
      filasClientesMesPrimero,
      filasClientesSoloMesSegundo,
      clientesExcluirVentaForecast,
      clientesVentaForecastSim,
      clientesDescForecastSim,
    ]
  );

  const metricBTrasDescSim = useMemo(
    () =>
      applyDescuentoSimToMetricB(
        metricBTrasVentaSim,
        clientesB,
        filasClientesMesPrimero,
        filasClientesSoloMesSegundo,
        clientesExcluirVentaForecast,
        isArrPlanRoute ? {} : clientesDescForecastSim,
        clientesVentaForecastSim,
        isArrPlanRoute ? nuevosClientesPlan : undefined
      ),
    [
      metricBTrasVentaSim,
      clientesB,
      filasClientesMesPrimero,
      filasClientesSoloMesSegundo,
      clientesExcluirVentaForecast,
      clientesDescForecastSim,
      clientesVentaForecastSim,
      isArrPlanRoute,
      nuevosClientesPlan,
    ]
  );

  const metricBTrasConVenta = useMemo(
    () => applyConVentaSimuladaToMetricB(metricBTrasDescSim, clientesConVentaForecastSim),
    [metricBTrasDescSim, clientesConVentaForecastSim]
  );

  const metricBTrasVolNuevosPlan = useMemo(
    () =>
      applyExtraKgDescChunksToMetricB(
        metricBTrasConVenta,
        nuevosKgPlanManuales.map((n) => ({ kg: n.kg, descKg: n.descKg }))
      ),
    [metricBTrasConVenta, nuevosKgPlanManuales]
  );

  /** Misma fila «ARR» export (mes B sin marcas del plan). */
  const metricBComoHojaArr = useMemo(
    () =>
      applyConVentaSimuladaToMetricB(
        applyExclusionsToMetricB(
          metricB,
          clientesB,
          filasClientesMesPrimero,
          filasClientesSoloMesSegundo,
          {}
        ),
        {}
      ),
    [metricB, clientesB, filasClientesMesPrimero, filasClientesSoloMesSegundo]
  );

  const descuentoSignedPlanPonderado = useMemo(
    () =>
      descuentoPlanForecastSegunArrYB6(
        metricBComoHojaArr,
        metricBTrasVolNuevosPlan.ventaTon,
        nuevosFilasFormulasPlan.map((n) => ({
          kg: n.kg,
          descKg: n.descKg,
          origen: n.origen,
        })),
        Boolean(clientesB && !clientesB.historico)
      ),
    [
      metricBComoHojaArr,
      metricBTrasVolNuevosPlan.ventaTon,
      nuevosFilasFormulasPlan,
      clientesB,
    ]
  );

  const hgPlanResumenMesB = useMemo(
    () =>
      hgPlanForecastMesBRuta(
        metricBComoHojaArr,
        metricBTrasVolNuevosPlan,
        nuevosFilasFormulasPlan.map((n) => ({
          kg: n.kg,
          descKg: n.descKg,
          origen: n.origen,
          hgCliente: n.hgCliente,
          hgCompra: n.hgCompra,
        })),
        Boolean(isArrPlanRoute && clientesB && !clientesB.historico)
      ),
    [
      isArrPlanRoute,
      metricBComoHojaArr,
      metricBTrasVolNuevosPlan,
      nuevosFilasFormulasPlan,
      clientesB,
    ]
  );

  /**
   * Ajuste del descuento ponderado por la simulación de descuento $/kg en mes forecast (modo Plan).
   * `descuentoSignedPlanPonderado` se calcula a partir de `metricBComoHojaArr` (ARR puro, sin sims),
   * por lo que su delta `Σ(orig-sim)·kg / (planB·1000)` se suma aparte aquí.
   */
  const descSimDeltaParaPlan = useMemo(() => {
    if (!isArrPlanRoute) return 0;
    if (!clientesB || clientesB.historico) return 0;
    const keys = Object.keys(clientesDescForecastSim);
    if (keys.length === 0) return 0;
    const planB = metricBTrasVolNuevosPlan.ventaTon;
    if (planB == null || !Number.isFinite(planB) || planB <= 0) return 0;
    let numer = 0;
    for (const row of [...filasClientesMesPrimero, ...filasClientesSoloMesSegundo]) {
      if (clientesExcluirVentaForecast[row.cliente]) continue;
      if (clienteConEdicionForecastEnPlan(nuevosClientesPlan, row.cliente)) continue;
      const sim = clientesDescForecastSim[row.cliente];
      if (sim == null || !Number.isFinite(sim)) continue;
      const vs = clientesVentaForecastSim[row.cliente];
      const kg =
        vs != null && Number.isFinite(vs) && vs > 0
          ? Math.round(vs)
          : row.ventaB;
      if (kg == null || !Number.isFinite(kg) || kg <= 0) continue;
      const orig = row.descB != null && Number.isFinite(row.descB) ? row.descB : 0;
      numer += (orig - sim) * kg;
    }
    return numer / (planB * 1000);
  }, [
    isArrPlanRoute,
    clientesB,
    clientesDescForecastSim,
    clientesVentaForecastSim,
    clientesExcluirVentaForecast,
    nuevosClientesPlan,
    filasClientesMesPrimero,
    filasClientesSoloMesSegundo,
    metricBTrasVolNuevosPlan.ventaTon,
  ]);

  const metricBResumen = useMemo(() => {
    const extraGasto = nuevosClientesPlan
      .filter(nuevaFilaCuentaEnForecastMes)
      .reduce((s, n) => s + (Number.isFinite(n.gastoMxn) ? n.gastoMxn : 0), 0);
    const baseG = metricBTrasVolNuevosPlan.gastoImporte;
    const gastoImporte =
      baseG != null && Number.isFinite(baseG) ? baseG + extraGasto : null;
    const extraOp = sumOperativosExtraImpuestosNuevosKg(
      nuevosKgPlanManuales,
      metricBTrasVolNuevosPlan.impuestoKg
    );
    const op0 = metricBTrasVolNuevosPlan.operativos;
    const operativos =
      op0 != null && Number.isFinite(op0) ? op0 + extraOp : op0;
    const descSigned =
      isArrPlanRoute && descuentoSignedPlanPonderado != null
        ? descuentoSignedPlanPonderado + descSimDeltaParaPlan
        : metricBTrasVolNuevosPlan.descuentoSigned;
    return {
      ...metricBTrasVolNuevosPlan,
      descuentoSigned: descSigned,
      gastoImporte,
      operativos,
      hgDisplay: hgPlanResumenMesB.hgDisplay,
      hgDinero: hgPlanResumenMesB.hgDinero,
    };
  }, [
    metricBTrasVolNuevosPlan,
    nuevosClientesPlan,
    nuevosKgPlanManuales,
    isArrPlanRoute,
    descuentoSignedPlanPonderado,
    descSimDeltaParaPlan,
    hgPlanResumenMesB.hgDisplay,
    hgPlanResumenMesB.hgDinero,
  ]);

  const resumenSubcategoriaForecastDicf = useMemo(
    () =>
      buildForecastSubcategoriaResumenDicf(
        clientesB,
        clientesExcluirVentaForecast,
        clientesConVentaForecastSim,
        nuevosKgPlanManuales,
        metricBResumen.descuentoSigned
      ),
    [
      clientesB,
      clientesExcluirVentaForecast,
      clientesConVentaForecastSim,
      nuevosKgPlanManuales,
      metricBResumen.descuentoSigned,
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

  const rentabilidadArrBAjustadaForecast = useMemo(() => {
    if (clientesB?.historico === true) return null;
    return rentabilidadForecastMesBAjustada(
      filasClientesMesPrimero,
      filasClientesSoloMesSegundo,
      metricBResumen.gastoImporte,
      metricBResumen,
      clientesExcluirVentaForecast,
      clientesConVentaForecastSim,
      nuevosKgPlanManuales.map((n) => ({
        kg: n.kg,
        descKg: n.descKg,
        hgCliente: n.hgCliente,
        hgCompra: n.hgCompra,
      })),
      clientesDescForecastSim,
      clientesVentaForecastSim
    );
  }, [
    clientesB?.historico,
    filasClientesMesPrimero,
    filasClientesSoloMesSegundo,
    metricBResumen,
    clientesExcluirVentaForecast,
    clientesConVentaForecastSim,
    clientesDescForecastSim,
    clientesVentaForecastSim,
    nuevosKgPlanManuales,
  ]);

  const rentabilidadMostradaA = useMemo(
    () => rentabilidadResumenPorMes(selA, rentabilidadArrA, metricA.rentabilidadImporte),
    [selA, rentabilidadArrA, metricA.rentabilidadImporte]
  );
  const rentabilidadMostradaB = useMemo(() => {
    if (!selB) return null;
    const hist = mesHistoricoDesdeSelector(selB);
    const mesBForecastUi = !hist && (clientesB ? !clientesB.historico : true);

    if (isArrPlanRoute && mesBForecastUi) {
      const rf = rentabilidadPlanForecastDesdeCeldasPlan(
        metricBResumen,
        metricBComoHojaArr,
        nuevosFilasFormulasPlan.map((n) => ({
          kg: n.kg,
          descKg: n.descKg,
          origen: n.origen,
          hgCliente: n.hgCliente,
          hgCompra: n.hgCompra,
        }))
      );
      if (rf != null && Number.isFinite(rf)) return rf;
      return rentabilidadResumenPorMes(selB, rentabilidadArrB, metricB.rentabilidadImporte);
    }

    const hayAjusteForecast =
      mesBForecastUi &&
      (Object.keys(clientesExcluirVentaForecast).length > 0 ||
        Object.keys(clientesConVentaForecastSim).length > 0 ||
        Object.keys(clientesDescForecastSim).length > 0 ||
        Object.keys(clientesVentaForecastSim).length > 0 ||
        nuevosClientesPlan.some(nuevaFilaCuentaEnForecastMes));
    if (hayAjusteForecast && rentabilidadArrBAjustadaForecast != null) {
      return rentabilidadArrBAjustadaForecast;
    }
    return rentabilidadResumenPorMes(selB, rentabilidadArrB, metricB.rentabilidadImporte);
  }, [
    selB,
    clientesB,
    clientesExcluirVentaForecast,
    clientesConVentaForecastSim,
    clientesDescForecastSim,
    clientesVentaForecastSim,
    nuevosClientesPlan,
    nuevosFilasFormulasPlan,
    rentabilidadArrBAjustadaForecast,
    rentabilidadArrB,
    metricB.rentabilidadImporte,
    isArrPlanRoute,
    metricBResumen,
    metricBComoHojaArr,
  ]);

  const simularClientesOpciones = useMemo(() => {
    const out: {
      cliente: string;
      ventaKg: number;
      descKg: number | null;
      ingresoTabla: number | null;
      soloNuevo: boolean;
    }[] = [];
    const descOverride = (cli: string, base: number | null): number | null => {
      const v = clientesDescForecastSim[cli];
      return v != null && Number.isFinite(v) ? v : base;
    };
    for (const r of filasClientesMesPrimero) {
      const vb = ventaBMesBConSimMap(r, clientesConVentaForecastSim);
      const sim = clientesConVentaForecastSim[r.cliente];
      const descBase = sim ? (sim.descKg ?? r.descB) : r.descB;
      out.push({
        cliente: r.cliente,
        ventaKg: vb ?? 0,
        descKg: descOverride(r.cliente, descBase),
        ingresoTabla: ingresoBMesBConSimMap(
          r,
          clientesConVentaForecastSim,
          metricBResumen,
          clientesDescForecastSim
        ),
        soloNuevo: false,
      });
    }
    for (const r of filasClientesSoloMesSegundo) {
      const vb = ventaBMesBConSimMap(r, clientesConVentaForecastSim);
      const sim = clientesConVentaForecastSim[r.cliente];
      const descBase = sim ? (sim.descKg ?? r.descB) : r.descB;
      out.push({
        cliente: r.cliente,
        ventaKg: vb ?? 0,
        descKg: descOverride(r.cliente, descBase),
        ingresoTabla: ingresoBMesBConSimMap(
          r,
          clientesConVentaForecastSim,
          metricBResumen,
          clientesDescForecastSim
        ),
        soloNuevo: true,
      });
    }
    return out;
  }, [
    filasClientesMesPrimero,
    filasClientesSoloMesSegundo,
    clientesConVentaForecastSim,
    clientesDescForecastSim,
    metricBResumen,
  ]);

  const puedeSimular = Boolean(empresa && selB);

  const nombresExistentesPlanModal = useMemo(() => {
    const s = new Set<string>();
    for (const r of filasClientesMesPrimero) s.add(r.cliente.trim());
    for (const r of filasClientesSoloMesSegundo) s.add(r.cliente.trim());
    for (const n of nuevosClientesPlan) s.add(n.nombre.trim());
    return Array.from(s);
  }, [filasClientesMesPrimero, filasClientesSoloMesSegundo, nuevosClientesPlan]);

  const subcategoriasPlanModal = useMemo(() => {
    const out: { categoria: "CASA" | "COMISIONISTA"; subcategoria: string }[] = [];
    const seen = new Set<string>();
    const add = (cat: "CASA" | "COMISIONISTA", sub: string | null | undefined) => {
      const s = String(sub || "").trim();
      if (!s) return;
      const key = `${cat}::${s.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ categoria: cat, subcategoria: s });
    };
    const scan = (c: ClientesMonthData | undefined) => {
      if (!c?.rows?.length) return;
      for (const r of c.rows) {
        const { categoria: cat, subcategoria: sub } = planCategoriaFromArr(r);
        add(cat, sub);
      }
    };
    scan(clientesA);
    scan(clientesB);
    out.sort((a, b) => {
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria, "es");
      return a.subcategoria.localeCompare(b.subcategoria, "es");
    });
    return out;
  }, [clientesA, clientesB]);
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

  const buildExportOptsFromSlice = useCallback(
    (slice: ArrWorkspaceSlice) => {
      const sSelA = slice.selA;
      const sSelB = slice.selB;
      const sDataByKey = slice.dataByKey;
      const sClientesByKey = slice.clientesByKey;
      const sExcluir = slice.clientesExcluirVentaForecast;
      const sConVenta = slice.clientesConVentaForecastSim;
      const sDescSim = slice.clientesDescForecastSim;
      const sVentaSim = slice.clientesVentaForecastSim;
      const sNuevos = slice.nuevosClientesPlan;
      const sNuevosMan = sNuevos.filter(
        (n) => esNuevoKgPlanManual(n) && nuevaFilaCuentaEnForecastMes(n)
      );

      const headerVentaA0 = sSelA ? `Venta ${periodoMesNombre(sSelA)}` : "Venta —";
      const headerVentaB0 = sSelB ? `Venta ${periodoMesNombre(sSelB)}` : "Venta —";
      const headerDescA0 = sSelA ? `Descuento ${periodoMesNombre(sSelA)}` : "Descuento —";
      const headerDescB0 = sSelB ? `Descuento ${periodoMesNombre(sSelB)}` : "Descuento —";
      const headerIngresoA0 = sSelA ? `Ingreso ${periodoMesNombre(sSelA)}` : "Ingreso —";
      const headerIngresoB0 = sSelB ? `Ingreso ${periodoMesNombre(sSelB)}` : "Ingreso —";
      const comparacionLabel0 =
        sSelA && sSelB ? `${periodoMesNombre(sSelB)} − ${periodoMesNombre(sSelA)}` : "";

      const metA = resumenMesMetrics(computeRowValues(sDataByKey[sSelA], empresa));
      const metB = resumenMesMetrics(computeRowValues(sDataByKey[sSelB], empresa));

      const clientesKeyA0 =
        empresa && sSelA ? clientesCacheKey(empresa, sSelA, sDataByKey[sSelA]) : "";
      const clientesKeyB0 =
        empresa && sSelB ? clientesCacheKey(empresa, sSelB, sDataByKey[sSelB]) : "";
      const clientesA0 = clientesKeyA0 ? sClientesByKey[clientesKeyA0] : undefined;
      const clientesB0 = clientesKeyB0 ? sClientesByKey[clientesKeyB0] : undefined;

      // Filas de clientes (mismo criterio que la tabla).
      const mapA = new Map<string, ArrClienteMesRow>();
      if (clientesA0) {
        for (const r of clientesA0.rows) {
          const k = r.cliente.trim();
          if (k) mapA.set(k, r);
        }
      }
      const mapB = new Map<string, ArrClienteMesRow>();
      if (clientesB0) {
        for (const r of clientesB0.rows) {
          const k = r.cliente.trim();
          if (k) mapB.set(k, r);
        }
      }

      const filasPrimero: ClienteTablaRow[] = [];
      const clientesMesPrimero = Array.from(mapA.keys()).sort((a, b) => {
        const va = clientesA0 ? clienteVenta(mapA.get(a)!, clientesA0.historico) : 0;
        const vb = clientesA0 ? clienteVenta(mapA.get(b)!, clientesA0.historico) : 0;
        if (vb !== va) return vb - va;
        return a.localeCompare(b, "es");
      });
      for (const cliente of clientesMesPrimero) {
        const rA = mapA.get(cliente)!;
        const rB = mapB.get(cliente);
        const ventaA0 = clientesA0 ? clienteVenta(rA, clientesA0.historico) : 0;
        const ventaB0 = rB != null && clientesB0 ? clienteVenta(rB, clientesB0.historico) : null;
        const descA0 = rA.descuento_kg;
        const descB0 = rB?.descuento_kg ?? null;
        const vBNum = ventaB0 ?? 0;
        const dANum = descA0 ?? 0;
        const dBNum = descB0 ?? 0;
        const ingresoAAlloc = ingresoClienteMarginal(ventaA0, descA0, metA);
        const ingresoBAlloc = ventaB0 != null ? ingresoClienteMarginal(ventaB0, descB0, metB) : null;
        filasPrimero.push({
          cliente,
          ventaA: ventaA0,
          ventaB: ventaB0,
          descA: descA0,
          descB: descB0,
          deltaVenta: vBNum - ventaA0,
          deltaDesc: dBNum - dANum,
          ingresoA: ingresoAAlloc,
          ingresoB: ingresoBAlloc,
          deltaIngreso: (ingresoBAlloc ?? 0) - (ingresoAAlloc ?? 0),
          soloNuevo: false,
        });
      }

      const filasSolo: ClienteTablaRow[] = [];
      if (clientesB0) {
        for (const cliente of Array.from(mapB.keys())) {
          if (mapA.has(cliente)) continue;
          const rB = mapB.get(cliente)!;
          const ventaB0 = clienteVenta(rB, clientesB0.historico);
          const descB0 = rB.descuento_kg;
          const ingresoBCliente = ingresoClienteMarginal(ventaB0, descB0, metB);
          filasSolo.push({
            cliente,
            ventaA: 0,
            ventaB: ventaB0,
            descA: 0,
            descB: descB0,
            deltaVenta: ventaB0,
            deltaDesc: (descB0 ?? 0) - 0,
            ingresoA: 0,
            ingresoB: ingresoBCliente,
            deltaIngreso: (ingresoBCliente ?? 0) - 0,
            soloNuevo: true,
          });
        }
        filasSolo.sort((x, y) => {
          const vb = x.ventaB ?? 0;
          const vy = y.ventaB ?? 0;
          if (vy !== vb) return vy - vb;
          return x.cliente.localeCompare(y.cliente, "es");
        });
      }

      const metricBTrasEx = applyExclusionsToMetricB(metB, clientesB0, filasPrimero, filasSolo, sExcluir);
      const metricBTrasVentaSimExport = applyVentaSimToMetricB(
        metricBTrasEx,
        clientesB0,
        filasPrimero,
        filasSolo,
        sExcluir,
        sVentaSim,
        sDescSim
      );
      const metricBTrasDescSimExport = applyDescuentoSimToMetricB(
        metricBTrasVentaSimExport,
        clientesB0,
        filasPrimero,
        filasSolo,
        sExcluir,
        slice === wsPlan ? {} : sDescSim,
        sVentaSim,
        slice === wsPlan ? sNuevos : undefined
      );
      const metricBTrasCV = applyConVentaSimuladaToMetricB(metricBTrasDescSimExport, sConVenta);
      const metricBTrasNuevos = applyExtraKgDescChunksToMetricB(
        metricBTrasCV,
        sNuevosMan.map((n) => ({ kg: n.kg, descKg: n.descKg }))
      );
      const extraGasto = sNuevos
        .filter(nuevaFilaCuentaEnForecastMes)
        .reduce((sum, n) => sum + (Number.isFinite(n.gastoMxn) ? n.gastoMxn : 0), 0);
      const gastoImporteFinal =
        metricBTrasNuevos.gastoImporte != null && Number.isFinite(metricBTrasNuevos.gastoImporte)
          ? metricBTrasNuevos.gastoImporte + extraGasto
          : null;
      const extraOp0 = sumOperativosExtraImpuestosNuevosKg(
        sNuevosMan,
        metricBTrasNuevos.impuestoKg
      );
      const opB0 = metricBTrasNuevos.operativos;
      const operativos0 =
        opB0 != null && Number.isFinite(opB0) ? opB0 + extraOp0 : opB0;
      const metricBResumen0: ResumenMesMetrics = {
        ...metricBTrasNuevos,
        gastoImporte: gastoImporteFinal,
        operativos: operativos0,
      };

      const metricBarrExport = applyConVentaSimuladaToMetricB(
        applyExclusionsToMetricB(metB, clientesB0, filasPrimero, filasSolo, {}),
        {}
      );
      const descPlanExport = descuentoPlanForecastSegunArrYB6(
        metricBarrExport,
        metricBTrasNuevos.ventaTon,
        sNuevos
          .filter((n) => Number.isFinite(n.kg) && n.kg > 0 && filaPlanEntraEnFormulaD6(n))
          .map((n) => ({
            kg: n.kg,
            descKg: n.descKg,
            origen: n.origen,
          })),
        Boolean(clientesB0 && !clientesB0.historico)
      );
      let metricBResumenFinal: ResumenMesMetrics = metricBResumen0;
      if (slice === wsPlan && descPlanExport != null) {
        // En ruta Plan, la fórmula de descuento ponderado parte de `metricBarrExport` (ARR puro),
        // por lo que añadimos manualmente el delta de la simulación de descuento por cliente.
        let descSimDelta = 0;
        const planB = metricBTrasNuevos.ventaTon;
        if (planB != null && Number.isFinite(planB) && planB > 0 && sDescSim) {
          let numer = 0;
          for (const row of [...filasPrimero, ...filasSolo]) {
            if (sExcluir[row.cliente]) continue;
            if (clienteConEdicionForecastEnPlan(sNuevos, row.cliente)) continue;
            const sim = sDescSim[row.cliente];
            if (sim == null || !Number.isFinite(sim)) continue;
            const vs = sVentaSim?.[row.cliente];
            const kg =
              vs != null && Number.isFinite(vs) && vs > 0
                ? Math.round(vs)
                : row.ventaB;
            if (kg == null || !Number.isFinite(kg) || kg <= 0) continue;
            const orig = row.descB != null && Number.isFinite(row.descB) ? row.descB : 0;
            numer += (orig - sim) * kg;
          }
          descSimDelta = numer / (planB * 1000);
        }
        metricBResumenFinal = {
          ...metricBResumenFinal,
          descuentoSigned: descPlanExport + descSimDelta,
        };
      }
      if (slice === wsPlan && clientesB0 && !clientesB0.historico) {
        const hgPlan = hgPlanForecastMesBRuta(
          metricBarrExport,
          metricBTrasNuevos,
          sNuevos
            .filter((n) => Number.isFinite(n.kg) && n.kg > 0 && filaPlanEntraEnFormulaD6(n))
            .map((n) => ({
              kg: n.kg,
              descKg: n.descKg,
              origen: n.origen,
              hgCliente: n.hgCliente,
              hgCompra: n.hgCompra,
            })),
          true
        );
        metricBResumenFinal = { ...metricBResumenFinal, ...hgPlan };
      }

      const rentArrA0 =
        clientesA0 ? rentabilidadArrDesdeFilas(filasPrimero, filasSolo, metA.gastoImporte, "A") : null;
      const rentArrB0 =
        clientesB0 ? rentabilidadArrDesdeFilas(filasPrimero, filasSolo, metB.gastoImporte, "B") : null;
      const rentAdjB0 =
        clientesB0?.historico === true
          ? null
          : rentabilidadForecastMesBAjustada(
              filasPrimero,
              filasSolo,
              metricBResumenFinal.gastoImporte,
              metricBResumenFinal,
              sExcluir,
              sConVenta,
              sNuevosMan.map((n) => ({
                kg: n.kg,
                descKg: n.descKg,
                hgCliente: n.hgCliente,
                hgCompra: n.hgCompra,
              })),
              sDescSim,
              sVentaSim
            );

      const rentMostA0 = rentabilidadResumenPorMes(sSelA, rentArrA0, metA.rentabilidadImporte);
      const rentMostB0 = (() => {
        if (!sSelB) return null;
        const hist = mesHistoricoDesdeSelector(sSelB);
        const mesBForecastUI = !hist && (clientesB0 ? !clientesB0.historico : true);
        if (slice === wsPlan && mesBForecastUI) {
          const rf = rentabilidadPlanForecastDesdeCeldasPlan(
            metricBResumenFinal,
            metricBarrExport,
            sNuevos
              .filter((n) => Number.isFinite(n.kg) && n.kg > 0 && filaPlanEntraEnFormulaD6(n))
              .map((n) => ({
                kg: n.kg,
                descKg: n.descKg,
                origen: n.origen,
                hgCliente: n.hgCliente,
                hgCompra: n.hgCompra,
              }))
          );
          if (rf != null && Number.isFinite(rf)) return rf;
          return rentabilidadResumenPorMes(sSelB, rentArrB0, metB.rentabilidadImporte);
        }
        const hayAjusteForecast =
          mesBForecastUI &&
          (Object.keys(sExcluir).length > 0 ||
            Object.keys(sConVenta).length > 0 ||
            Object.keys(sDescSim).length > 0 ||
            Object.keys(sVentaSim).length > 0 ||
            sNuevos.some(nuevaFilaCuentaEnForecastMes));
        if (hayAjusteForecast && rentAdjB0 != null) return rentAdjB0;
        return rentabilidadResumenPorMes(sSelB, rentArrB0, metB.rentabilidadImporte);
      })();

      let kgNuevosCasa = 0;
      let kgNuevosComi = 0;
      for (const n of sNuevosMan) {
        const kg = Number(n.kg);
        if (!Number.isFinite(kg) || kg <= 0) continue;
        if (n.categoria === "COMISIONISTA") kgNuevosComi += kg;
        else kgNuevosCasa += kg;
      }
      const catA0 = toneladasCategoriaDesdeClientes(clientesA0, undefined, undefined, 0, 0);
      const catB0 = toneladasCategoriaDesdeClientes(
        clientesB0,
        sExcluir,
        sConVenta,
        kgNuevosCasa,
        kgNuevosComi,
        sVentaSim
      );

      return {
        empresa,
        selA: sSelA,
        selB: sSelB,
        labelMesA: periodoLabel(sSelA),
        labelMesB: periodoLabel(sSelB),
        comparacionLabel: comparacionLabel0,
        mA: { ...metA, rentabilidadImporte: rentMostA0 },
        mB: { ...metricBResumenFinal, rentabilidadImporte: rentMostB0 },
        resumenExtrasA: { casaTon: catA0.casa, comisionistaTon: catA0.comisionista },
        resumenExtrasB: { casaTon: catB0.casa, comisionistaTon: catB0.comisionista },
        rentabilidadMesAFormulaClientes: sSelA ? mesHistoricoDesdeSelector(sSelA) : true,
        rentabilidadMesBFormulaClientes: sSelB ? mesHistoricoDesdeSelector(sSelB) : true,
        headerVentaA: headerVentaA0,
        headerVentaB: headerVentaB0,
        headerDescA: headerDescA0,
        headerDescB: headerDescB0,
        headerIngresoA: headerIngresoA0,
        headerIngresoB: headerIngresoB0,
        filasClientesMesPrimero: filasPrimero.map((r) => {
          const simDescVal = sDescSim?.[r.cliente];
          const descBExport =
            simDescVal != null && Number.isFinite(simDescVal) ? simDescVal : r.descB;
          const base = {
            cliente: r.cliente,
            ventaA: r.ventaA,
            ventaB: ventaBMesBConSimMap(r, sConVenta, sVentaSim),
            descA: r.descA,
            descB: descBExport,
            ...(slice === wsPlan
              ? {
                  sinVentaForecast: Boolean(sExcluir[r.cliente]),
                  conVentaForecastSim: Boolean(sConVenta[r.cliente]),
                }
              : {}),
          };
          if (slice !== wsPlan) return base;
          const rB = mapB.get(r.cliente.trim());
          if (!rB || !clientesB0) {
            return {
              ...base,
              exportPlanCategoria: "",
              exportPlanSubcategoria: "",
              exportPlanVentaForecastKg: null,
              exportPlanDescKg: null,
            };
          }
          const hist = clientesB0.historico === true;
          const cli = r.cliente.trim();
          const { categoria: cat, subcategoria: sub } = planCategoriaFromArr(rB);
          let vKg: number | null;
          let descKg: number | null;
          if (hist) {
            vKg = Number(rB.kg_real) || 0;
            descKg =
              rB.descuento_kg != null && Number.isFinite(rB.descuento_kg) ? rB.descuento_kg : null;
          } else {
            const vEdit = sVentaSim?.[cli];
            if (
              !sExcluir[cli] &&
              vEdit != null &&
              Number.isFinite(vEdit) &&
              vEdit >= 0
            ) {
              vKg = Math.round(vEdit);
            } else {
              vKg = sExcluir[cli]
                ? 0
                : (rB.kg_proyectado != null ? Number(rB.kg_proyectado) || 0 : 0) +
                  (() => {
                    const sim = sConVenta[cli];
                    return sim != null && Number.isFinite(sim.kg) && sim.kg > 0 ? sim.kg : 0;
                  })();
            }
            const simCV = sConVenta[cli];
            const simDesc = sDescSim?.[cli];
            descKg =
              simDesc != null && Number.isFinite(simDesc)
                ? simDesc
                : simCV != null && simCV.descKg != null && Number.isFinite(simCV.descKg)
                  ? simCV.descKg
                  : rB.descuento_kg != null && Number.isFinite(rB.descuento_kg)
                    ? rB.descuento_kg
                    : null;
          }
          return {
            ...base,
            exportPlanCategoria: cat,
            exportPlanSubcategoria: sub,
            exportPlanVentaForecastKg: vKg,
            exportPlanDescKg: descKg,
          };
        }),
        filasClientesSoloMesSegundo: filasSolo.map((r) => {
          const simDescVal = sDescSim?.[r.cliente];
          const descBExport =
            simDescVal != null && Number.isFinite(simDescVal) ? simDescVal : r.descB;
          const base = {
            cliente: r.cliente,
            ventaA: r.ventaA,
            ventaB: ventaBMesBConSimMap(r, sConVenta, sVentaSim),
            descA: r.descA,
            descB: descBExport,
            ...(slice === wsPlan
              ? {
                  sinVentaForecast: Boolean(sExcluir[r.cliente]),
                  conVentaForecastSim: Boolean(sConVenta[r.cliente]),
                }
              : {}),
          };
          if (slice !== wsPlan) return base;
          const rB = mapB.get(r.cliente.trim());
          if (!rB || !clientesB0) {
            return {
              ...base,
              exportPlanCategoria: "",
              exportPlanSubcategoria: "",
              exportPlanVentaForecastKg: null,
              exportPlanDescKg: null,
            };
          }
          const hist = clientesB0.historico === true;
          const cli = r.cliente.trim();
          const { categoria: cat, subcategoria: sub } = planCategoriaFromArr(rB);
          let vKg: number | null;
          let descKg: number | null;
          if (hist) {
            vKg = Number(rB.kg_real) || 0;
            descKg =
              rB.descuento_kg != null && Number.isFinite(rB.descuento_kg) ? rB.descuento_kg : null;
          } else {
            const vEdit = sVentaSim?.[cli];
            if (
              !sExcluir[cli] &&
              vEdit != null &&
              Number.isFinite(vEdit) &&
              vEdit >= 0
            ) {
              vKg = Math.round(vEdit);
            } else {
              vKg = sExcluir[cli]
                ? 0
                : (rB.kg_proyectado != null ? Number(rB.kg_proyectado) || 0 : 0) +
                  (() => {
                    const sim = sConVenta[cli];
                    return sim != null && Number.isFinite(sim.kg) && sim.kg > 0 ? sim.kg : 0;
                  })();
            }
            const simCV = sConVenta[cli];
            const simDesc = sDescSim?.[cli];
            descKg =
              simDesc != null && Number.isFinite(simDesc)
                ? simDesc
                : simCV != null && simCV.descKg != null && Number.isFinite(simCV.descKg)
                  ? simCV.descKg
                  : rB.descuento_kg != null && Number.isFinite(rB.descuento_kg)
                    ? rB.descuento_kg
                    : null;
          }
          return {
            ...base,
            exportPlanCategoria: cat,
            exportPlanSubcategoria: sub,
            exportPlanVentaForecastKg: vKg,
            exportPlanDescKg: descKg,
          };
        }),
        marcasForecastEnClientes: slice === wsPlan,
        usarFormulasComparacion: true,
        ...(slice === wsPlan
          ? {
              nuevosClientesPlan: sNuevos.map((n) => ({
                nombre: n.nombre,
                kg: n.kg,
                descKg: n.descKg,
                gastoMxn: n.gastoMxn,
                responsable: n.responsable,
                categoria: n.categoria,
                subcategoria: n.subcategoria,
                hgCliente: n.hgCliente,
                hgCompra: n.hgCompra,
                comentarios: n.comentarios,
                origen: n.origen,
                incluirEnForecastMes: n.incluirEnForecastMes !== false,
              })),
            }
          : {}),
      };
    },
    [empresa, wsPlan]
  );

  const handleExportExcel = useCallback(() => {
    if (!puedeExportar || !empresa) return;
    void (async () => {
      try {
        const arr = buildExportOptsFromSlice(wsBase);
        const plan = buildExportOptsFromSlice(wsPlan);
        await downloadArrDashboardExcelDual({ arr, plan });
      } catch (e) {
        console.error("Export ARR Excel:", e);
      }
    })();
  }, [puedeExportar, empresa, wsBase, wsPlan, buildExportOptsFromSlice]);

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

  function ventaBConSim(row: ClienteTablaRow): number | null {
    return ventaBMesBConSimMap(
      row,
      clientesConVentaForecastSim,
      clientesVentaForecastSim
    );
  }

  function ingresoBMesBConSim(row: ClienteTablaRow): number | null {
    return ingresoBMesBConSimMap(
      row,
      clientesConVentaForecastSim,
      metricBResumen,
      clientesDescForecastSim,
      clientesVentaForecastSim
    );
  }

  /** Descuento $/kg del mes B aplicando la simulación del usuario (o el valor original). */
  function descBConSim(row: ClienteTablaRow): number | null {
    const k = row.cliente;
    const v = clientesDescForecastSim[k];
    if (v != null && Number.isFinite(v)) return v;
    return row.descB;
  }


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
            onClick={() => {
              if (isArrPlanRoute) {
                setClientePlanEditando(null);
                setShowNuevoClientePlan(true);
              } else {
                setShowSimular(true);
              }
            }}
            disabled={!puedeSimular}
            title={
              puedeSimular
                ? isArrPlanRoute
                  ? "Agregar un cliente sintético: volumen, descuento $/kg y gasto en el mes forecast"
                  : "Simular ingreso en el mes forecast (margen / HG del IGF de ese mes)"
                : "Selecciona empresa y el mes forecast (columna B)"
            }
            className="rounded border border-sky-600/90 bg-sky-950/50 px-3 py-2 text-sm font-medium text-sky-100 shadow-sm hover:bg-sky-900/45 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isArrPlanRoute ? "NUEVO CLIENTE" : "SIMULAR"}
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
                <th colSpan={1} className={`px-2 py-2 text-center ${G.venta}`}>
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
                  Venta
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
                        gastoImporte: metricBResumen.gastoImporte,
                        operativos: metricBResumen.operativos,
                        hgDisplay: metricBResumen.hgDisplay,
                        hgDinero: metricBResumen.hgDinero,
                      }
                    : mRaw;
                const rentabUi =
                  key === "A" ? rentabilidadMostradaA : rentabilidadMostradaB;
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
                      {renderValueCell(sel, m.ventaTon, (v) => fmtNum(v, 0), false)}
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
                      {cellDeltaNum(metricA.ventaTon, metricBResumen.ventaTon, 0)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.margen}`}>
                      {cellDeltaNum(metricA.margenKg, metricB.margenKg, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.desc}`}>
                      {cellDeltaNum(metricA.descuentoSigned, metricBResumen.descuentoSigned, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {cellDeltaMoney(metricA.operativos, metricBResumen.operativos)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {cellDeltaMoney(metricA.corporativos, metricB.corporativos)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {cellDeltaMoney(metricA.gastoImporte, metricBResumen.gastoImporte)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.hg}`}>
                      {cellDeltaNum(metricA.hgDisplay, metricBResumen.hgDisplay, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.hg}`}>
                      {cellDeltaMoney(metricA.hgDinero, metricBResumen.hgDinero, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.imp}`}>
                      {cellDeltaNum(metricA.impuestoKg, metricB.impuestoKg, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.mov}`}>
                      {token ? (
                        <button
                          type="button"
                          title="Ver clientes Casa: dejaron, disminuyeron, aumentaron, nuevos (DICF)"
                          onClick={() => setDicfCategoriaModal("CASA")}
                          className="mx-auto block w-full max-w-[8rem] cursor-pointer rounded border border-transparent px-1 py-0.5 text-center hover:border-sky-600/50 hover:bg-slate-800/60 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        >
                          {cellDeltaTonNullable(catTonA.casa, catTonB.casa, 2)}
                        </button>
                      ) : (
                        cellDeltaTonNullable(catTonA.casa, catTonB.casa, 2)
                      )}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.mov}`}>
                      {token ? (
                        <button
                          type="button"
                          title="Ver clientes Comisionista: dejaron, disminuyeron, aumentaron, nuevos (DICF)"
                          onClick={() => setDicfCategoriaModal("COMISIONISTA")}
                          className="mx-auto block w-full max-w-[8rem] cursor-pointer rounded border border-transparent px-1 py-0.5 text-center hover:border-violet-600/50 hover:bg-slate-800/60 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        >
                          {cellDeltaTonNullable(catTonA.comisionista, catTonB.comisionista, 2)}
                        </button>
                      ) : (
                        cellDeltaTonNullable(catTonA.comisionista, catTonB.comisionista, 2)
                      )}
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
                    {Array.from({ length: 12 }).map((_, i) => (
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

        {isArrPlanRoute &&
          (nuevosClientesPlan.length > 0 ||
            Object.keys(clientesExcluirVentaForecast).length > 0 ||
            Object.keys(clientesConVentaForecastSim).length > 0 ||
            Object.keys(clientesVentaForecastSim).length > 0) && (
          <section className="mt-6 overflow-x-auto rounded-lg border border-sky-800/50 bg-sky-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-800/40 px-4 py-2">
              <h2 className="text-sm font-semibold text-sky-100">Nuevos clientes (plan)</h2>
              <span className="text-xs text-sky-200/80">
                Incluye altas manuales, Sin venta / Con venta y ventas editadas en forecast. Por fila: «Mes actual» suma kg al
                forecast del mes; «Solo plan (futuro)» deja el registro sin afectar venta, descuento, HG ni renta del
                mes proyectado.
              </span>
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-800/80 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-300">
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-center">Origen</th>
                  <th className="px-3 py-2 text-center">Categoría</th>
                  <th className="px-3 py-2 text-center">Subcategoría</th>
                  <th className="px-3 py-2 text-center">Responsable</th>
                  <th className="px-3 py-2 text-center">Kg</th>
                  <th className="px-3 py-2 text-center">Desc. $/kg</th>
                  <th className="px-3 py-2 text-center">Gasto</th>
                  <th className="px-3 py-2 text-center">HG cliente</th>
                  <th className="px-3 py-2 text-center">HG compra</th>
                  <th className="px-3 py-2 text-center min-w-[9rem]">Proyección</th>
                  <th className="px-3 py-2 text-left min-w-[10rem]">Comentarios</th>
                  <th className="px-3 py-2 text-center">Ingreso marginal</th>
                  <th className="px-3 py-2 text-center min-w-[9.5rem]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {nuevosClientesPlan
                  .filter((n) => n.origen !== "arr_quita")
                  .map((n) => {
                  const ing = esNuevoKgPlanManual(n)
                    ? ingresoMarginalPlanNuevoRow(
                        n.kg,
                        n.descKg,
                        metricBResumen.margenKg,
                        metricBComoHojaArr.hgDinero,
                        n.hgCliente,
                        n.hgCompra,
                        metricBComoHojaArr.hgDisplay,
                        metricBComoHojaArr.hgDinero,
                        n.origen
                      )
                    : null;
                  const origenLabel =
                    n.origen === "sin_venta"
                      ? "Sin venta"
                      : n.origen === "con_venta"
                        ? "Con venta"
                        : n.origen === "edicion_forecast"
                          ? "Venta editada"
                          : "Manual";
                  return (
                    <tr key={n.id} className="border-t border-slate-700/70">
                      <td className="px-3 py-2 text-slate-100">{n.nombre}</td>
                      <td className="px-3 py-2 text-center text-xs text-slate-300">{origenLabel}</td>
                      <td className="px-3 py-2 text-center text-slate-200">{n.categoria || "—"}</td>
                      <td className="px-3 py-2 text-center text-slate-200">{n.subcategoria || "—"}</td>
                      <td className="px-3 py-2 text-center text-slate-200">{n.responsable || "—"}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{fmtNum(n.kg, 0)}</td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {fmtNum(
                          n.origen === "sin_venta" || n.origen === "arr_quita"
                            ? -Math.abs(n.descKg)
                            : n.descKg,
                          2
                        )}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">${fmtNum(n.gastoMxn, 0)}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-slate-200">
                        {n.hgCliente != null && Number.isFinite(n.hgCliente)
                          ? fmtNum(n.hgCliente, 2)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-slate-200">
                        {n.hgCompra != null && Number.isFinite(n.hgCompra)
                          ? fmtNum(n.hgCompra, 2)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select
                          value={nuevaFilaCuentaEnForecastMes(n) ? "mes" : "futuro"}
                          onChange={(e) =>
                            setNuevoPlanIncluirEnForecastMes(n.id, e.target.value === "mes")
                          }
                          title="Mes actual: suma al forecast del mes B. Solo plan (futuro): registro sin impacto en la proyección actual."
                          className="max-w-[9.5rem] cursor-pointer rounded border border-sky-700/60 bg-slate-900 px-1.5 py-1 text-[0.7rem] text-sky-100"
                        >
                          <option value="mes">Mes actual</option>
                          <option value="futuro">Solo plan (futuro)</option>
                        </select>
                      </td>
                      <td className="max-w-[14rem] px-3 py-2 text-left text-xs text-slate-300 whitespace-pre-wrap break-words">
                        {n.comentarios?.trim() ? n.comentarios.trim() : "—"}
                      </td>
                      <td
                        className={`px-3 py-2 text-center tabular-nums ${
                          nuevaFilaCuentaEnForecastMes(n)
                            ? "text-emerald-200/90"
                            : "text-slate-400"
                        }`}
                        title={
                          nuevaFilaCuentaEnForecastMes(n)
                            ? undefined
                            : "Referencial: no entra en el resumen del mes (solo plan futuro)."
                        }
                      >
                        {ing != null ? `$${fmtNum(ing, 0)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setClientePlanEditando(n);
                              setShowNuevoClientePlan(true);
                            }}
                            className="rounded border border-sky-600/80 bg-sky-950/40 px-2 py-1 text-xs text-sky-100 hover:bg-sky-900/45"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => quitarNuevoClientePlan(n.id)}
                            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                          >
                            Quitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

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
                <th
                  rowSpan={2}
                  className="align-middle w-11 min-w-[2.75rem] px-1 py-2 text-center text-emerald-300/90 text-[0.6rem] font-normal normal-case border-r border-slate-600/80"
                  title="Clientes inactivos en forecast (sin kg proyectado): activa una venta y descuento simulados (misma lógica que excluir volumen, pero sumando kg) y recalcula rentabilidad."
                >
                  Con venta
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
                <th
                  className={`px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${GC.desc}`}
                  title={
                    showExcluirForecastCheckbox
                      ? "Descuento $/kg proyectado. Edita cada celda para simular un cambio y ver afectación financiera (ingreso, descuento ponderado y rentabilidad)."
                      : undefined
                  }
                >
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
                  <td colSpan={12} className="px-3 py-3 text-center text-xs text-slate-500">
                    Selecciona una empresa para ver los clientes.
                  </td>
                </tr>
              )}
              {empresa && totalFilasCliente === 0 && !clientesLoading && (
                <tr>
                  <td colSpan={12} className="px-3 py-3 text-center text-xs text-slate-500">
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
                      onChange={() => toggleClienteExcluirForecast(row)}
                      title={
                        showExcluirForecastCheckbox
                          ? "Sin venta en forecast: resta este volumen del total superior y recalcula descuento"
                          : "Solo aplica al mes forecast (columna de venta proyectada)"
                      }
                      className="h-4 w-4 cursor-pointer accent-rose-500 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Sin venta forecast ${row.cliente}`}
                    />
                  </td>
                  <td className="px-1 py-2 text-center align-middle border-r border-slate-600/60">
                    <input
                      type="checkbox"
                      checked={Boolean(clientesConVentaForecastSim[row.cliente])}
                      disabled={!showExcluirForecastCheckbox || !clienteInactivoForecastB(row)}
                      onChange={() => toggleClienteConVentaForecast(row)}
                      title={
                        showExcluirForecastCheckbox && clienteInactivoForecastB(row)
                          ? "Con venta: simula kg en forecast (por defecto = venta mes A o 1 t) y descuento; suma al total y recalcula rentabilidad"
                          : "Solo clientes sin kg proyectado en el mes forecast"
                      }
                      className="h-4 w-4 cursor-pointer accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Con venta forecast simulada ${row.cliente}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-slate-100">
                    <button
                      type="button"
                      onClick={() => empresa && setDicfModalCliente(row.cliente)}
                      className={`mx-auto block max-w-full cursor-pointer text-center hover:underline disabled:cursor-not-allowed disabled:opacity-50 ${
                        clienteTieneAccionDicfAbierta(row)
                          ? "text-amber-300 hover:text-amber-200"
                          : "text-sky-300 hover:text-sky-200"
                      }`}
                      disabled={!empresa || !token}
                      title={
                        clienteTieneAccionDicfAbierta(row)
                          ? `${row.acciones_abiertas} acción(es) DICF abierta(s). Ver Delta Ingreso Cliente Forecast`
                          : "Ver Delta Ingreso Cliente Forecast"
                      }
                    >
                      {row.cliente}
                    </button>
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta}`}>{fmtNum(row.ventaA ?? 0, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta}`}>
                    {isArrPlanRoute ? (
                      <VentaBEditableCell
                        cliente={row.cliente}
                        orig={row.ventaB}
                        sim={
                          clientesVentaForecastSim[row.cliente] != null &&
                          Number.isFinite(clientesVentaForecastSim[row.cliente])
                            ? clientesVentaForecastSim[row.cliente]
                            : edicionForecastSetup?.row.cliente === row.cliente &&
                                edicionForecastSetup.tipo === "venta"
                              ? edicionForecastSetup.newKg
                              : null
                        }
                        editable={
                          showExcluirForecastCheckbox &&
                          !clientesExcluirVentaForecast[row.cliente] &&
                          row.ventaB != null &&
                          row.ventaB > 0
                        }
                        onCommit={setClienteVentaForecastSim}
                      />
                    ) : (
                      (() => {
                        const vb = ventaBConSim(row);
                        const simOn = Boolean(clientesConVentaForecastSim[row.cliente]);
                        if (vb != null && vb > 0) {
                          return (
                            <span className={simOn ? "text-emerald-200" : undefined}>
                              {fmtNum(vb, 0)}
                            </span>
                          );
                        }
                        return <span className="text-slate-500">—</span>;
                      })()
                    )}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta} ${GC.deltaCell}`}>
                    <span
                      className={
                        (ventaBConSim(row) ?? 0) - (row.ventaA ?? 0) < 0
                          ? deltaValorCajaRoja
                          : undefined
                      }
                    >
                      {fmtNum((ventaBConSim(row) ?? 0) - (row.ventaA ?? 0), 0)}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc}`}>
                    {row.descA != null ? fmtNum(row.descA, 2) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc}`}>
                    <DescBEditableCell
                      cliente={row.cliente}
                      orig={row.descB}
                      sim={
                        clientesDescForecastSim[row.cliente] != null &&
                        Number.isFinite(clientesDescForecastSim[row.cliente])
                          ? clientesDescForecastSim[row.cliente]
                          : edicionForecastSetup?.row.cliente === row.cliente &&
                              edicionForecastSetup.tipo === "desc"
                            ? edicionForecastSetup.newDesc
                            : null
                      }
                      editable={
                        showExcluirForecastCheckbox &&
                        !clientesExcluirVentaForecast[row.cliente] &&
                        row.ventaB != null &&
                        row.ventaB > 0
                      }
                      onCommit={setClienteDescForecastSim}
                    />
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc} ${GC.deltaCell}`}>
                    {(() => {
                      const dB = descBConSim(row);
                      const dA = row.descA;
                      const delta = (dB ?? 0) - (dA ?? 0);
                      const simOn = clientesDescForecastSim[row.cliente] != null;
                      return (
                        <span
                          className={`${delta > 0 ? deltaValorCajaRoja : ""} ${
                            simOn ? "text-amber-300" : ""
                          }`}
                        >
                          {fmtNum(delta, 2)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.ingreso}`}>
                    {row.ingresoA != null ? `$${fmtNum(row.ingresoA, 0)}` : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.ingreso}`}>
                    {(() => {
                      const ib = ingresoBMesBConSim(row);
                      const simDesc = clientesDescForecastSim[row.cliente] != null;
                      const simVenta = clientesVentaForecastSim[row.cliente] != null;
                      const simCv = clientesConVentaForecastSim[row.cliente];
                      const cls = simDesc
                        ? "text-amber-300"
                        : simVenta
                          ? "text-sky-300"
                          : simCv
                            ? "text-emerald-200"
                            : undefined;
                      return ib != null ? (
                        <span className={cls}>${fmtNum(ib, 0)}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      );
                    })()}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc} ${GC.deltaCell}`}>
                    <span
                      className={
                        (ingresoBMesBConSim(row) ?? 0) - (row.ingresoA ?? 0) < 0
                          ? deltaValorCajaRoja
                          : undefined
                      }
                    >
                      ${fmtNum((ingresoBMesBConSim(row) ?? 0) - (row.ingresoA ?? 0), 0)}
                    </span>
                  </td>
                </tr>
              ))}
              {filasClientesSoloMesSegundoFiltradas.length > 0 && (
                <tr aria-hidden className="border-t border-slate-700/80">
                  <td colSpan={12} className="h-4 bg-slate-950/40 py-2" />
                </tr>
              )}
              {filasClientesSoloMesSegundoFiltradas.map((row) => (
                <tr key={`nuevo-${row.cliente}`} className="border-t border-slate-700/80 bg-slate-900/25">
                  <td className="px-1 py-2 text-center align-middle border-r border-slate-600/60">
                    <input
                      type="checkbox"
                      checked={Boolean(clientesExcluirVentaForecast[row.cliente])}
                      disabled={!showExcluirForecastCheckbox || row.ventaB == null || row.ventaB <= 0}
                      onChange={() => toggleClienteExcluirForecast(row)}
                      title={
                        showExcluirForecastCheckbox
                          ? "Sin venta en forecast: resta este volumen del total superior y recalcula descuento"
                          : "Solo aplica al mes forecast (columna de venta proyectada)"
                      }
                      className="h-4 w-4 cursor-pointer accent-rose-500 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Sin venta forecast ${row.cliente}`}
                    />
                  </td>
                  <td className="px-1 py-2 text-center align-middle border-r border-slate-600/60">
                    <input
                      type="checkbox"
                      checked={Boolean(clientesConVentaForecastSim[row.cliente])}
                      disabled={!showExcluirForecastCheckbox || !clienteInactivoForecastB(row)}
                      onChange={() => toggleClienteConVentaForecast(row)}
                      title={
                        showExcluirForecastCheckbox && clienteInactivoForecastB(row)
                          ? "Con venta: simula kg en forecast (por defecto = venta mes A o 1 t) y descuento; suma al total y recalcula rentabilidad"
                          : "Solo clientes sin kg proyectado en el mes forecast"
                      }
                      className="h-4 w-4 cursor-pointer accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Con venta forecast simulada ${row.cliente}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-slate-100">
                    <button
                      type="button"
                      onClick={() => empresa && setDicfModalCliente(row.cliente)}
                      className={`mx-auto block max-w-full cursor-pointer text-center hover:underline disabled:cursor-not-allowed disabled:opacity-50 ${
                        clienteTieneAccionDicfAbierta(row)
                          ? "text-amber-300 hover:text-amber-200"
                          : "text-sky-300 hover:text-sky-200"
                      }`}
                      disabled={!empresa || !token}
                      title={
                        clienteTieneAccionDicfAbierta(row)
                          ? `${row.acciones_abiertas} acción(es) DICF abierta(s). Ver Delta Ingreso Cliente Forecast`
                          : "Ver Delta Ingreso Cliente Forecast"
                      }
                    >
                      {row.cliente}
                    </button>
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums text-slate-400 ${GC.venta}`}>{fmtNum(0, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta}`}>
                    {(() => {
                      const vb = ventaBConSim(row);
                      const simOn = Boolean(clientesConVentaForecastSim[row.cliente]);
                      if (vb != null && vb > 0) {
                        return (
                          <span className={simOn ? "text-emerald-200" : undefined}>{fmtNum(vb, 0)}</span>
                        );
                      }
                      return <span className="text-slate-500">—</span>;
                    })()}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta} ${GC.deltaCell}`}>
                    <span
                      className={
                        (ventaBConSim(row) ?? 0) - 0 < 0 ? deltaValorCajaRoja : undefined
                      }
                    >
                      {fmtNum(ventaBConSim(row) ?? 0, 0)}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums text-slate-400 ${GC.desc}`}>{fmtNum(0, 2)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc}`}>
                    <DescBEditableCell
                      cliente={row.cliente}
                      orig={row.descB}
                      sim={
                        clientesDescForecastSim[row.cliente] != null &&
                        Number.isFinite(clientesDescForecastSim[row.cliente])
                          ? clientesDescForecastSim[row.cliente]
                          : edicionForecastSetup?.row.cliente === row.cliente &&
                              edicionForecastSetup.tipo === "desc"
                            ? edicionForecastSetup.newDesc
                            : null
                      }
                      editable={showExcluirForecastCheckbox && !clientesExcluirVentaForecast[row.cliente]}
                      onCommit={setClienteDescForecastSim}
                    />
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc} ${GC.deltaCell}`}>
                    {(() => {
                      const dB = descBConSim(row);
                      const delta = (dB ?? 0) - 0;
                      const simOn = clientesDescForecastSim[row.cliente] != null;
                      return (
                        <span
                          className={`${delta > 0 ? deltaValorCajaRoja : ""} ${
                            simOn ? "text-amber-300" : ""
                          }`}
                        >
                          {fmtNum(delta, 2)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums text-slate-400 ${GC.ingreso}`}>${fmtNum(0, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.ingreso}`}>
                    {(() => {
                      const ib = ingresoBMesBConSim(row);
                      const simDesc = clientesDescForecastSim[row.cliente] != null;
                      const simCv = clientesConVentaForecastSim[row.cliente];
                      const cls = simDesc
                        ? "text-amber-300"
                        : simCv
                          ? "text-emerald-200"
                          : undefined;
                      return ib != null ? (
                        <span className={cls}>${fmtNum(ib, 0)}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      );
                    })()}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc} ${GC.deltaCell}`}>
                    <span
                      className={(ingresoBMesBConSim(row) ?? 0) - 0 < 0 ? deltaValorCajaRoja : undefined}
                    >
                      ${fmtNum(ingresoBMesBConSim(row) ?? 0, 0)}
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
      <ArrDicfCategoriaBucketsModal
        open={dicfCategoriaModal != null && Boolean(empresa.trim()) && Boolean(token.trim())}
        onClose={() => setDicfCategoriaModal(null)}
        token={token}
        planta={empresa.trim()}
        initialCategoria={dicfCategoriaModal ?? "CASA"}
        planNuevos={isArrPlanRoute ? planNuevosDicfModal : undefined}
        mesForecastLabel={selB ? periodoLabel(selB) : undefined}
        resumenSubcategoriaForecast={resumenSubcategoriaForecastDicf}
        onClienteDicfClick={(nombre) => {
          const k = nombre.trim();
          if (k) setDicfModalCliente(k);
        }}
      />
      {showSimular && !isArrPlanRoute && (
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
      {showNuevoClientePlan && isArrPlanRoute && (
        <ArrNuevoClientePlanModal
          abierto={showNuevoClientePlan}
          onClose={cancelarModalPlan}
          mesForecastLabel={selB ? periodoLabel(selB) : ""}
          nombresExistentes={nombresExistentesPlanModal}
          responsables={responsablesPlan}
          subcategorias={subcategoriasPlanModal}
          clienteEditar={clientePlanEditando}
          onSave={guardarNuevoClientePlanModal}
        />
      )}
    </div>
  );
}
