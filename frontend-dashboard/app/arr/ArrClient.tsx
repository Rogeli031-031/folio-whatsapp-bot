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

/** Venta del cliente para el mes: kg proyectado (mes en curso) o kg real (mes histórico). */
function clienteVenta(row: ArrClienteMesRow, historico: boolean): number {
  if (!historico && row.kg_proyectado != null) return row.kg_proyectado;
  return row.kg_real;
}

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

  // Une los clientes de los dos meses por nombre y produce filas unificadas.
  const clientesUnificados = useMemo(() => {
    if (!empresa || (!clientesA && !clientesB)) return [];
    const map = new Map<string, { cliente: string; ventaA: number | null; ventaB: number | null }>();
    if (clientesA) {
      for (const r of clientesA.rows) {
        const key = r.cliente.trim();
        if (!key) continue;
        const v = clienteVenta(r, clientesA.historico);
        const existing = map.get(key) ?? { cliente: key, ventaA: null, ventaB: null };
        existing.ventaA = v;
        map.set(key, existing);
      }
    }
    if (clientesB) {
      for (const r of clientesB.rows) {
        const key = r.cliente.trim();
        if (!key) continue;
        const v = clienteVenta(r, clientesB.historico);
        const existing = map.get(key) ?? { cliente: key, ventaA: null, ventaB: null };
        existing.ventaB = v;
        map.set(key, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const ta = (a.ventaA ?? 0) + (a.ventaB ?? 0);
      const tb = (b.ventaA ?? 0) + (b.ventaB ?? 0);
      if (tb !== ta) return tb - ta;
      return a.cliente.localeCompare(b.cliente, "es");
    });
  }, [empresa, clientesA, clientesB]);

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
              <tr className="bg-slate-700/60 text-slate-200">
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Mes</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Gasto</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Margen</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">HG</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">HG$</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Descuento</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Venta</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Nuevos</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Previos</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Rentabilidad</th>
              </tr>
            </thead>
            <tbody>
              {[
                { sel: selA, set: setSelA, vals: rowA, key: "A" as const },
                { sel: selB, set: setSelB, vals: rowB, key: "B" as const },
              ].map(({ sel, set, vals, key }) => {
                const hgDisplay = vals.hgPct != null ? vals.hgPct * 100 : null;
                const hgDinero =
                  vals.hgKg != null && vals.hgPct != null && vals.hgPct !== 0
                    ? Math.abs(vals.hgKg / vals.hgPct)
                    : null;
                // Excel siempre muestra Com. y Desc. como reducción (signo negativo).
                const descuentoSigned =
                  vals.comDescKg != null ? -Math.abs(vals.comDescKg) : null;
                return (
                  <tr key={key} className="border-t border-slate-700/80">
                    <td className="px-3 py-2">
                      <select
                        value={sel}
                        onChange={(e) => set(e.target.value)}
                        className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 text-sm"
                      >
                        <option value="">Seleccionar mes…</option>
                        {periodos.map(renderMesOption)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {renderValueCell(sel, vals.gastoImporte, (v) => fmtNum(v, 0), true)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {renderValueCell(sel, vals.margenKg, (v) => fmtNum(v, 2), false)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {renderValueCell(sel, hgDisplay, (v) => fmtNum(v, 2), false)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {renderValueCell(sel, hgDinero, (v) => fmtNum(v, 2), true)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {renderValueCell(sel, descuentoSigned, (v) => fmtNum(v, 2), false)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {renderValueCell(sel, vals.ventaTon, (v) => fmtNum(v, 0), false)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">—</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">—</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">—</td>
                  </tr>
                );
              })}
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
              <tr className="bg-slate-700/60 text-slate-200">
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Cliente</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">{headerVentaA}</th>
                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">{headerVentaB}</th>
              </tr>
            </thead>
            <tbody>
              {!empresa && (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-center text-xs text-slate-500">
                    Selecciona una empresa para ver los clientes.
                  </td>
                </tr>
              )}
              {empresa && clientesUnificados.length === 0 && !clientesLoading && (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-center text-xs text-slate-500">
                    Sin clientes para mostrar.
                  </td>
                </tr>
              )}
              {clientesUnificados.map((c) => (
                <tr key={c.cliente} className="border-t border-slate-700/80">
                  <td className="px-3 py-2 text-slate-100">{c.cliente}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {c.ventaA != null ? fmtNum(c.ventaA, 0) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {c.ventaB != null ? fmtNum(c.ventaB, 0) : <span className="text-slate-500">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
