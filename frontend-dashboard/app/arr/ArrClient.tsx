"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchIgfForecast,
  fetchIgfVersiones,
  type IgfForecastRow,
  type IgfForecastMiniRow,
  type IgfPeriodo,
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
        // Pre-seleccionar los dos últimos periodos por defecto.
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

  const rowA = useMemo(() => computeRowValues(dataByKey[selA], empresa), [dataByKey, selA, empresa]);
  const rowB = useMemo(() => computeRowValues(dataByKey[selB], empresa), [dataByKey, selB, empresa]);

  const renderMesOption = (p: IgfPeriodo) => {
    const key = periodoKey(p.year, p.month);
    const label = `${NOMBRES_MES[p.month - 1] ?? MESES[p.month - 1]} ${p.year}`;
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
                      {renderValueCell(sel, vals.comDescKg, (v) => fmtNum(v, 2), false)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {renderValueCell(sel, vals.ventaTon, (v) => fmtNum(v, 0), false)}
                    </td>
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
      </main>
    </div>
  );
}
