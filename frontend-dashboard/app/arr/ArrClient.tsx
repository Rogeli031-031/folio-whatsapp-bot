"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchIgfForecast,
  fetchIgfVersiones,
  fetchArrClientesMes,
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

type RowValues = {
  operativos: number | null;
  corporativos: number | null;
  gastoImporte: number | null;
  margenKg: number | null;
  hgPct: number | null;
  hgKg: number | null;
  comDescKg: number | null;
  ventaTon: number | null;
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
      ventaTon: null,
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
    ventaTon: forecastRow?.venta_ton ?? miniRow?.ventaTon ?? null,
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
  ventaTon: number | null;
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
    ventaTon: vals.ventaTon,
  };
}

function fmtDeltaMoney(d: number, decimals = 0): string {
  const sign = d < 0 ? "-" : "";
  return `${sign}$${fmtNum(Math.abs(d), decimals)}`;
}

function sumKgClientesMes(monthData: ClientesMonthData | undefined): number {
  if (!monthData) return 0;
  return monthData.rows.reduce((s, r) => s + clienteVenta(r, monthData.historico), 0);
}

function plantIngresoMini(
  periodoSel: string,
  empresa_: string,
  byKey: Record<string, IgfMonthData>
): number | null {
  const d = byKey[periodoSel];
  if (!d || !empresa_) return null;
  const m = findMiniRow(d.miniRows, empresa_);
  return m?.ingreso != null ? Number(m.ingreso) : null;
}

/** Prorrata INGRESO de planta (mini IGF) según kg del cliente en el mes. */
function ingresoClienteProporcional(
  kgCliente: number,
  ingresoPlanta: number | null,
  sumKgPlantaMes: number
): number | null {
  if (ingresoPlanta == null || !Number.isFinite(ingresoPlanta)) return null;
  if (sumKgPlantaMes <= 0 || kgCliente <= 0) return null;
  return Math.round(ingresoPlanta * (kgCliente / sumKgPlantaMes));
}

/** Venta del cliente para el mes: kg proyectado (mes en curso) o kg real (mes histórico). */
function clienteVenta(row: ArrClienteMesRow, historico: boolean): number {
  if (!historico && row.kg_proyectado != null) return row.kg_proyectado;
  return row.kg_real;
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

export default function ArrClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("t") ?? "";
  const empresa = searchParams?.get("empresa") ?? "";
  const backHref = token ? `/igf-forecast?t=${encodeURIComponent(token)}` : "/igf-forecast";

  const [periodos, setPeriodos] = useState<IgfPeriodo[]>([]);
  const [periodosError, setPeriodosError] = useState<string | null>(null);
  const [selA, setSelA] = useState<string>("");
  const [selB, setSelB] = useState<string>("");
  const [dataByKey, setDataByKey] = useState<Record<string, IgfMonthData>>({});
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [errorByKey, setErrorByKey] = useState<Record<string, string>>({});

  // Clientes por (empresa, mes) — clave: `${empresa}|${year-month}`
  const [clientesByKey, setClientesByKey] = useState<Record<string, ClientesMonthData>>({});
  const [clientesLoadingKeys, setClientesLoadingKeys] = useState<Set<string>>(new Set());
  const [clientesErrorByKey, setClientesErrorByKey] = useState<Record<string, string>>({});

  const handleEmpresaChange = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (next) {
        params.set("empresa", next);
      } else {
        params.delete("empresa");
      }
      const qs = params.toString();
      router.replace(qs ? `/arr?${qs}` : "/arr");
    },
    [router, searchParams]
  );

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
        if (sorted.length >= 2 && !selA && !selB) {
          setSelA(periodoKey(sorted[sorted.length - 2].year, sorted[sorted.length - 2].month));
          setSelB(periodoKey(sorted[sorted.length - 1].year, sorted[sorted.length - 1].month));
        } else if (sorted.length === 1 && !selA) {
          setSelA(periodoKey(sorted[0].year, sorted[0].month));
        }
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

  // Carga IGF Forecast (con mini) para una clave year-month si aún no está cacheada.
  const ensureMonthLoaded = useCallback(
    async (key: string) => {
      if (!token || !key) return;
      if (dataByKey[key] || loadingKeys.has(key)) return;
      const [yStr, mStr] = key.split("-");
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      if (!Number.isFinite(year) || !Number.isFinite(month)) return;
      setLoadingKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      try {
        const resp = await fetchIgfForecast(token, { year, month, include_mini: true });
        const miniRows = resp.mini?.rows ?? [];
        setDataByKey((prev) => ({
          ...prev,
          [key]: { rows: resp.rows ?? [], miniRows },
        }));
        setErrorByKey((prev) => {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } catch (e) {
        setErrorByKey((prev) => ({
          ...prev,
          [key]: e instanceof Error ? e.message : String(e),
        }));
      } finally {
        setLoadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [token, dataByKey, loadingKeys]
  );

  useEffect(() => {
    if (selA) void ensureMonthLoaded(selA);
  }, [selA, ensureMonthLoaded]);
  useEffect(() => {
    if (selB) void ensureMonthLoaded(selB);
  }, [selB, ensureMonthLoaded]);

  // Carga lista de clientes para (empresa, mes) si aún no está cacheada.
  const ensureClientesLoaded = useCallback(
    async (empresaLabel: string, periodo: string) => {
      if (!token || !empresaLabel || !periodo) return;
      const cacheKey = `${empresaLabel}|${periodo}`;
      if (clientesByKey[cacheKey] || clientesLoadingKeys.has(cacheKey)) return;
      const [yStr, mStr] = periodo.split("-");
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      if (!Number.isFinite(year) || !Number.isFinite(month)) return;
      setClientesLoadingKeys((prev) => {
        const next = new Set(prev);
        next.add(cacheKey);
        return next;
      });
      try {
        const resp = await fetchArrClientesMes(token, { year, month, empresa: empresaLabel });
        setClientesByKey((prev) => ({
          ...prev,
          [cacheKey]: { historico: resp.historico, rows: resp.rows || [] },
        }));
        setClientesErrorByKey((prev) => {
          if (!prev[cacheKey]) return prev;
          const next = { ...prev };
          delete next[cacheKey];
          return next;
        });
      } catch (e) {
        setClientesErrorByKey((prev) => ({
          ...prev,
          [cacheKey]: e instanceof Error ? e.message : String(e),
        }));
      } finally {
        setClientesLoadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(cacheKey);
          return next;
        });
      }
    },
    [token, clientesByKey, clientesLoadingKeys]
  );

  useEffect(() => {
    if (empresa && selA) void ensureClientesLoaded(empresa, selA);
  }, [empresa, selA, ensureClientesLoaded]);
  useEffect(() => {
    if (empresa && selB) void ensureClientesLoaded(empresa, selB);
  }, [empresa, selB, ensureClientesLoaded]);

  const rowA = useMemo(() => computeRowValues(dataByKey[selA], empresa), [dataByKey, selA, empresa]);
  const rowB = useMemo(() => computeRowValues(dataByKey[selB], empresa), [dataByKey, selB, empresa]);

  const clientesKeyA = empresa && selA ? `${empresa}|${selA}` : "";
  const clientesKeyB = empresa && selB ? `${empresa}|${selB}` : "";
  const clientesA = clientesKeyA ? clientesByKey[clientesKeyA] : undefined;
  const clientesB = clientesKeyB ? clientesByKey[clientesKeyB] : undefined;

  /** Primero: clientes del mes A; después (con separador): solo mes B sin estar en A. */
  const { filasClientesMesPrimero, filasClientesSoloMesSegundo } = useMemo(() => {
    const vacío = { filasClientesMesPrimero: [] as ClienteTablaRow[], filasClientesSoloMesSegundo: [] as ClienteTablaRow[] };
    if (!empresa || !clientesA) return vacío;

    const piA = plantIngresoMini(selA, empresa, dataByKey);
    const piB = plantIngresoMini(selB, empresa, dataByKey);
    const sumKgA = sumKgClientesMes(clientesA);
    const sumKgB = sumKgClientesMes(clientesB);

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
      const ingresoAAlloc = ingresoClienteProporcional(ventaA, piA, sumKgA);
      const ingresoBAlloc =
        ventaB != null ? ingresoClienteProporcional(ventaB, piB, sumKgB) : null;
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
        const ingresoBCliente = ingresoClienteProporcional(ventaB, piB, sumKgB);
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

  const puedeComparar =
    Boolean(empresa && selA && selB) &&
    Boolean(dataByKey[selA] && dataByKey[selB]) &&
    !errorByKey[selA] &&
    !errorByKey[selB] &&
    !loadingKeys.has(selA) &&
    !loadingKeys.has(selB);

  const G = {
    costos: "bg-rose-950/30 border-l-2 border-rose-500/50",
    margen: "bg-fuchsia-950/25 border-l-2 border-fuchsia-400/45",
    hg: "bg-violet-950/30 border-l-2 border-violet-400/50",
    desc: "bg-sky-950/25 border-l-2 border-sky-500/45",
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

  const totalFilasCliente =
    filasClientesMesPrimero.length + filasClientesSoloMesSegundo.length;

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
          <h1 className="text-lg font-semibold text-slate-100">ARR</h1>
        </div>

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
                <th colSpan={3} className={`px-2 py-2 text-center ${G.costos}`}>
                  Operación
                </th>
                <th colSpan={1} className={`px-2 py-2 text-center ${G.margen}`}>
                  Margen
                </th>
                <th colSpan={2} className={`px-2 py-2 text-center ${G.hg}`}>
                  HG
                </th>
                <th colSpan={1} className={`px-2 py-2 text-center ${G.desc}`}>
                  Desc.
                </th>
                <th colSpan={1} className={`px-2 py-2 text-center ${G.venta}`}>
                  Venta
                </th>
                <th colSpan={2} className={`px-2 py-2 text-center ${G.mov}`}>
                  Clientes
                </th>
                <th colSpan={1} className={`px-2 py-2 text-center ${G.rent}`}>
                  Rentab.
                </th>
              </tr>
              <tr className="bg-slate-700/60 text-slate-200">
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.costos}`}>
                  Operativos
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.costos}`}>
                  Corporativos
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.costos}`}>
                  Gasto
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.margen}`}>
                  Margen
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.hg}`}>
                  HG
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.hg}`}>
                  HG$
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.desc}`}>
                  Descuento
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.venta}`}>
                  Venta
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.mov}`}>
                  Nuevos
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.mov}`}>
                  Previos
                </th>
                <th className={`px-3 py-2 text-center font-semibold uppercase tracking-wide ${G.rent}`}>
                  Rentabilidad
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { sel: selA, set: setSelA, vals: rowA, key: "A" as const },
                { sel: selB, set: setSelB, vals: rowB, key: "B" as const },
              ].map(({ sel, set, vals, key }) => {
                const m = resumenMesMetrics(vals);
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
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {renderValueCell(sel, m.operativos, (v) => fmtNum(v, 0), true)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {renderValueCell(sel, m.corporativos, (v) => fmtNum(v, 0), true)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {renderValueCell(sel, m.gastoImporte, (v) => fmtNum(v, 0), true)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.margen}`}>
                      {renderValueCell(sel, m.margenKg, (v) => fmtNum(v, 2), false)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.hg}`}>
                      {renderValueCell(sel, m.hgDisplay, (v) => fmtNum(v, 2), false)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.hg}`}>
                      {renderValueCell(sel, m.hgDinero, (v) => fmtNum(v, 2), true)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.desc}`}>
                      {renderValueCell(sel, m.descuentoSigned, (v) => fmtNum(v, 2), false)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.venta}`}>
                      {renderValueCell(sel, m.ventaTon, (v) => fmtNum(v, 0), false)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums text-slate-500 ${G.mov}`}>—</td>
                    <td className={`px-3 py-2 text-center tabular-nums text-slate-500 ${G.mov}`}>—</td>
                    <td className={`px-3 py-2 text-center tabular-nums text-slate-500 ${G.rent}`}>—</td>
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
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {cellDeltaMoney(metricA.operativos, metricB.operativos)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {cellDeltaMoney(metricA.corporativos, metricB.corporativos)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.costos}`}>
                      {cellDeltaMoney(metricA.gastoImporte, metricB.gastoImporte)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.margen}`}>
                      {cellDeltaNum(metricA.margenKg, metricB.margenKg, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.hg}`}>
                      {cellDeltaNum(metricA.hgDisplay, metricB.hgDisplay, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.hg}`}>
                      {cellDeltaMoney(metricA.hgDinero, metricB.hgDinero, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.desc}`}>
                      {cellDeltaNum(metricA.descuentoSigned, metricB.descuentoSigned, 2)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums ${G.venta}`}>
                      {cellDeltaNum(metricA.ventaTon, metricB.ventaTon, 0)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums text-slate-500 ${G.mov}`}>—</td>
                    <td className={`px-3 py-2 text-center tabular-nums text-slate-500 ${G.mov}`}>—</td>
                    <td className={`px-3 py-2 text-center tabular-nums text-slate-500 ${G.rent}`}>—</td>
                  </>
                ) : (
                  <>
                    {Array.from({ length: 11 }).map((_, i) => (
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
                <th rowSpan={2} className="align-bottom px-3 py-2 text-center text-slate-200">
                  Cliente
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
                <th className={`px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${GC.ingreso} ${GC.deltaTh}`}>
                  Delta ingreso
                </th>
              </tr>
            </thead>
            <tbody>
              {!empresa && (
                <tr>
                  <td colSpan={10} className="px-3 py-3 text-center text-xs text-slate-500">
                    Selecciona una empresa para ver los clientes.
                  </td>
                </tr>
              )}
              {empresa && totalFilasCliente === 0 && !clientesLoading && (
                <tr>
                  <td colSpan={10} className="px-3 py-3 text-center text-xs text-slate-500">
                    Sin clientes para mostrar.
                  </td>
                </tr>
              )}
              {filasClientesMesPrimero.map((row) => (
                <tr key={row.cliente} className="border-t border-slate-700/80">
                  <td className="px-3 py-2 text-center text-slate-100">{row.cliente}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta}`}>{fmtNum(row.ventaA ?? 0, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta}`}>
                    {row.ventaB != null ? fmtNum(row.ventaB, 0) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta} ${GC.deltaCell}`}>{fmtNum(row.deltaVenta, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc}`}>
                    {row.descA != null ? fmtNum(row.descA, 2) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc}`}>
                    {row.descB != null ? fmtNum(row.descB, 2) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc} ${GC.deltaCell}`}>{fmtNum(row.deltaDesc, 2)}</td>
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
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.ingreso} ${GC.deltaCell}`}>${fmtNum(row.deltaIngreso, 0)}</td>
                </tr>
              ))}
              {filasClientesSoloMesSegundo.length > 0 && (
                <tr aria-hidden className="border-t border-slate-700/80">
                  <td colSpan={10} className="h-4 bg-slate-950/40 py-2" />
                </tr>
              )}
              {filasClientesSoloMesSegundo.map((row) => (
                <tr key={`nuevo-${row.cliente}`} className="border-t border-slate-700/80 bg-slate-900/25">
                  <td className="px-3 py-2 text-center text-slate-100">{row.cliente}</td>
                  <td className={`px-3 py-2 text-center tabular-nums text-slate-400 ${GC.venta}`}>{fmtNum(0, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta}`}>{fmtNum(row.ventaB ?? 0, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.venta} ${GC.deltaCell}`}>{fmtNum(row.deltaVenta, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums text-slate-400 ${GC.desc}`}>{fmtNum(0, 2)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc}`}>
                    {row.descB != null ? fmtNum(row.descB, 2) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.desc} ${GC.deltaCell}`}>{fmtNum(row.deltaDesc, 2)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums text-slate-400 ${GC.ingreso}`}>${fmtNum(0, 0)}</td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.ingreso}`}>
                    {row.ingresoB != null ? `$${fmtNum(row.ingresoB, 0)}` : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${GC.ingreso} ${GC.deltaCell}`}>${fmtNum(row.deltaIngreso, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
