"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
  getRoleFromDashboardToken,
} from "@/lib/auth";
import {
  fetchIgfForecast,
  fetchArrLastUploadDay,
  postForecastProvincia,
  patchIgfForecastHg,
  getDashboardExcelDownloadUrl,
  fetchPresupuestoDetalle,
  fetchIgfFoliosDetalle,
  type IgfForecastResponse,
  type IgfForecastRow,
  type IgfFolioDetalleItem,
  type IgfFolioDetalleTipo,
  type PresupuestoDetalleItem,
} from "@/lib/api";
import {
  MESES,
  ORDEN_PROVINCIA,
  COLS_EXTRA,
  fmtNum,
  presupuestoGendKey,
  gastoKgFromFour,
  findRowByPlanta,
  computeIgfMiniResumenRows,
  PRESUPUESTO_GEND_STORAGE_KEY,
  INVERSION_CDJZ_STORAGE_KEY,
} from "@/lib/igf-kpi-ui";

export function IgfForecastContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const UPLOAD_DAY_STORAGE_KEY = "Diana";
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [igfForecast, setIgfForecast] = useState<IgfForecastResponse | null>(null);
  const [igfLoading, setIgfLoading] = useState(false);
  const [igfError, setIgfError] = useState<string | null>(null);
  const [hgSaving, setHgSaving] = useState<string | null>(null);
  const [plantaFilter, setPlantaFilter] = useState<string>("");
  const [uploadDay, setUploadDay] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const v = localStorage.getItem(UPLOAD_DAY_STORAGE_KEY);
      return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
    } catch {
      return "";
    }
  }); // YYYY-MM-DD (corte real/proyección)
  const [uploadDayHint, setUploadDayHint] = useState<string | null>(null);
  const [presupuestoGendByEmpresa, setPresupuestoGendByEmpresa] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const s = localStorage.getItem(PRESUPUESTO_GEND_STORAGE_KEY);
      if (!s) return {};
      const parsed = JSON.parse(s) as Record<string, number>;
      if (typeof parsed !== "object" || parsed === null) return {};
      const normalized: Record<string, number> = {};
      for (const [key, val] of Object.entries(parsed)) {
        const nKey = presupuestoGendKey(key);
        if (nKey && typeof val === "number" && !Number.isNaN(val)) normalized[nKey] = val;
      }
      return normalized;
    } catch {
      return {};
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(PRESUPUESTO_GEND_STORAGE_KEY, JSON.stringify(presupuestoGendByEmpresa));
    } catch {
      // ignore
    }
  }, [presupuestoGendByEmpresa]);
  const [inversionCdjzByEmpresa, setInversionCdjzByEmpresa] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const s = localStorage.getItem(INVERSION_CDJZ_STORAGE_KEY);
      if (!s) return {};
      const parsed = JSON.parse(s) as Record<string, number>;
      if (typeof parsed !== "object" || parsed === null) return {};
      const normalized: Record<string, number> = {};
      for (const [key, val] of Object.entries(parsed)) {
        const nKey = presupuestoGendKey(key);
        if (nKey && typeof val === "number" && !Number.isNaN(val)) normalized[nKey] = val;
      }
      return normalized;
    } catch {
      return {};
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(INVERSION_CDJZ_STORAGE_KEY, JSON.stringify(inversionCdjzByEmpresa));
    } catch {
      // ignore
    }
  }, [inversionCdjzByEmpresa]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const up = uploadDay.trim();
    try {
      if (up && /^\d{4}-\d{2}-\d{2}$/.test(up)) {
        localStorage.setItem(UPLOAD_DAY_STORAGE_KEY, up);
      } else {
        localStorage.removeItem(UPLOAD_DAY_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [uploadDay]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return;
      if (e.key !== UPLOAD_DAY_STORAGE_KEY) return;
      const next = e.newValue && /^\d{4}-\d{2}-\d{2}$/.test(e.newValue) ? e.newValue : "";
      setUploadDay((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const [presupuestoDetalle, setPresupuestoDetalle] = useState<IgfForecastRow | null>(null);
  const [presupuestoDetalleItems, setPresupuestoDetalleItems] = useState<PresupuestoDetalleItem[] | null>(null);
  const [presupuestoDetalleLoading, setPresupuestoDetalleLoading] = useState(false);
  const [presupuestoDetalleError, setPresupuestoDetalleError] = useState<string | null>(null);
  const [presupuestoDetalleCategoriaSel, setPresupuestoDetalleCategoriaSel] = useState<string | null>(null);
  const [igfFoliosModal, setIgfFoliosModal] = useState<{ empresa: string; label: string; tipo: IgfFolioDetalleTipo } | null>(null);
  const [igfFoliosItems, setIgfFoliosItems] = useState<IgfFolioDetalleItem[] | null>(null);
  const [igfFoliosLoading, setIgfFoliosLoading] = useState(false);
  const [igfFoliosError, setIgfFoliosError] = useState<string | null>(null);
  const [inversionCdjzDraft, setInversionCdjzDraft] = useState<string>("");
  const [inversionCdjzSaved, setInversionCdjzSaved] = useState(false);
  const [igfMesAnterior, setIgfMesAnterior] = useState<IgfForecastResponse | null>(null);
  const [igfMesAnteriorLoading, setIgfMesAnteriorLoading] = useState(false);
  const [forecastRecalcLoading, setForecastRecalcLoading] = useState(false);
  const [forecastRecalcMsg, setForecastRecalcMsg] = useState<string | null>(null);

  const isGAPageBlocked = token ? getRoleFromDashboardToken(token) === "GA" : false;
  const isGVPageBlocked = token ? getRoleFromDashboardToken(token) === "GV" : false;

  useEffect(() => {
    if (!token || !isGAPageBlocked) return;
    router.replace(`/dashboard?t=${encodeURIComponent(token)}`);
  }, [token, isGAPageBlocked, router]);

  useEffect(() => {
    if (!token || !isGVPageBlocked) return;
    router.replace(`/?t=${encodeURIComponent(token)}`);
  }, [token, isGVPageBlocked, router]);


  useEffect(() => {
    const t = parseTokenFromQuery(searchParams) || getTokenFromStorage();
    if (t) {
      setTokenInStorage(t);
      setToken(t);
      setUnauthorized(false);
    } else {
      setToken(null);
      setUnauthorized(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token || isGAPageBlocked || isGVPageBlocked) return;

    let cancelled = false;
    let fetching = false;

    const load = async () => {
      if (fetching || !token || cancelled) return;
      fetching = true;
      if (!igfForecast) setIgfLoading(true);
      setIgfError(null);
      try {
        const up = uploadDay.trim();
        const params =
          up && /^\d{4}-\d{2}-\d{2}$/.test(up)
            ? { year: Number(up.slice(0, 4)), month: Number(up.slice(5, 7)), upload_day: up }
            : undefined;
        const data = await fetchIgfForecast(token, params);
        if (!cancelled) {
          setIgfForecast(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setIgfError(e?.message || "Error al cargar IGF Forecast");
        }
      } finally {
        fetching = false;
        if (!cancelled) {
          setIgfLoading(false);
        }
      }
    };

    load();
    const id = setInterval(load, 60000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, isGAPageBlocked, isGVPageBlocked, uploadDay, igfForecast]);

  useEffect(() => {
    if (!token || isGAPageBlocked || isGVPageBlocked || !igfForecast) return;
    if (uploadDay.trim()) return;
    let cancelled = false;
    fetchArrLastUploadDay(token, { year: igfForecast.year, month: igfForecast.month })
      .then((r) => {
        if (cancelled) return;
        if (r?.upload_day) {
          setUploadDay(r.upload_day);
          setUploadDayHint(`Última carga detectada: ${r.upload_day}`);
        } else {
          setUploadDayHint("No hay fecha de carga registrada (se usa la fecha de hoy).");
        }
      })
      .catch(() => {
        if (!cancelled) setUploadDayHint(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, igfForecast?.year, igfForecast?.month, isGAPageBlocked, isGVPageBlocked, uploadDay]);

  useEffect(() => {
    if (!token || isGAPageBlocked || isGVPageBlocked || !igfForecast || !plantaFilter) {
      setIgfMesAnterior(null);
      return;
    }
    const y = igfForecast.year;
    const m = igfForecast.month;
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    setIgfMesAnteriorLoading(true);
    fetchIgfForecast(token, { year: prevYear, month: prevMonth })
      .then(setIgfMesAnterior)
      .catch(() => setIgfMesAnterior(null))
      .finally(() => setIgfMesAnteriorLoading(false));
  }, [token, plantaFilter, igfForecast?.year, igfForecast?.month, isGAPageBlocked, isGVPageBlocked]);


  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Acceso no autorizado</h1>
          <p className="mt-2 text-sm text-slate-400">
            Abre el enlace que recibiste por WhatsApp (válido 20 horas) o escribe &quot;dashboard&quot; en el bot.
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-400">Cargando…</p>
      </div>
    );
  }

  if (isGAPageBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-400">Redirigiendo al dashboard…</p>
      </div>
    );
  }

  if (isGVPageBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-400">Redirigiendo a Delta ingreso Forecast…</p>
      </div>
    );
  }

  const getPresupuestoKgWithGend = (row: IgfForecastRow): number | null => {
    const base = row.presupuesto_kg != null && !Number.isNaN(Number(row.presupuesto_kg)) ? Number(row.presupuesto_kg) : null;
    const extraMxn = presupuestoGendByEmpresa[presupuestoGendKey(row.empresa || "")] ?? 0;
    const ventaTon = row.venta_ton != null && !Number.isNaN(Number(row.venta_ton)) ? Number(row.venta_ton) : 0;
    const ventaKg = ventaTon * 1000;
    if (!ventaKg || !extraMxn) return base;
    const deltaKg = -(Math.abs(extraMxn) / ventaKg);
    return (base ?? 0) + deltaKg;
  };

  const getInversionesKgWithCdjz = (row: IgfForecastRow): number | null => {
    const base = row.inversiones_kg != null && !Number.isNaN(Number(row.inversiones_kg)) ? Number(row.inversiones_kg) : null;
    const extraMxn = inversionCdjzByEmpresa[presupuestoGendKey(row.empresa || "")] ?? 0;
    const ventaTon = row.venta_ton != null && !Number.isNaN(Number(row.venta_ton)) ? Number(row.venta_ton) : 0;
    const ventaKg = ventaTon * 1000;
    if (!ventaKg || !extraMxn) return base;
    const baseMxn = Math.abs(base ?? 0) * ventaKg;
    const totalMxn = baseMxn + Math.abs(extraMxn);
    return totalMxn > 0 ? -(Math.round((totalMxn / ventaKg) * 100) / 100) : base;
  };

  const getResultadoFinalImporteWithCdjz = (row: IgfForecastRow): number => {
    const n = (x: unknown): number => (x != null && !Number.isNaN(Number(x)) ? Number(x) : 0);
    const ventaKg = n(row.venta_ton) * 1000;
    const baseInvKg = n(row.inversiones_kg);
    const adjInvKg = n(getInversionesKgWithCdjz(row));
    const deltaInvCostKg = Math.abs(adjInvKg) - Math.abs(baseInvKg);
    return n(row.resultado_final_importe) - (deltaInvCostKg * ventaKg);
  };

  const handleRecalcForecastProvincia = async () => {
    if (!token || !igfForecast) return;
    setForecastRecalcLoading(true);
    setForecastRecalcMsg(null);
    try {
      await postForecastProvincia(token, { year: igfForecast.year, month: igfForecast.month });
      const up = uploadDay.trim();
      const data =
        up && /^\d{4}-\d{2}-\d{2}$/.test(up)
          ? await fetchIgfForecast(token, { year: igfForecast.year, month: igfForecast.month, upload_day: up })
          : await fetchIgfForecast(token, { year: igfForecast.year, month: igfForecast.month });
      setIgfForecast(data);
      setForecastRecalcMsg("Venta forecast recalculado (ARR provincia) y tabla actualizada.");
    } catch (e: unknown) {
      setForecastRecalcMsg(e instanceof Error ? e.message : "Error al recalcular forecast");
    } finally {
      setForecastRecalcLoading(false);
    }
  };

  const openIgfFoliosDetalle = async (row: IgfForecastRow, tipo: IgfFolioDetalleTipo, label: string) => {
    setIgfFoliosModal({ empresa: row.empresa || "", tipo, label });
    setIgfFoliosItems(null);
    setIgfFoliosError(null);
    setInversionCdjzSaved(false);
    if (tipo === "inversiones") {
      const key = presupuestoGendKey(row.empresa || "");
      const current = inversionCdjzByEmpresa[key] ?? 0;
      setInversionCdjzDraft(current ? String(current) : "");
    }
    if (!token || !igfForecast) return;
    setIgfFoliosLoading(true);
    try {
      const data = await fetchIgfFoliosDetalle(token, {
        year: igfForecast.year,
        month: igfForecast.month,
        empresa: row.empresa || "",
        tipo,
      });
      setIgfFoliosItems(data.folios || []);
    } catch (e: unknown) {
      setIgfFoliosError(e instanceof Error ? e.message : "Error al cargar folios");
    } finally {
      setIgfFoliosLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-white">IGF Forecast</h1>
        <Link
          href={token ? `/?t=${encodeURIComponent(token)}` : "/"}
          className="text-sm text-amber-300 hover:text-amber-200 underline"
        >
          ← KPI Financieros
        </Link>
      </div>
      <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-slate-700/80 bg-slate-800/30 items-center">
        {igfForecast && token && (
          <a
            href={getDashboardExcelDownloadUrl(token, igfForecast.year, igfForecast.month, uploadDay)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
          >
            Descargar Excel (Forecast)
          </a>
        )}
        <label className="inline-flex items-center gap-2 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200">
          <span className="text-slate-400">Fecha de carga (corte):</span>
          <input
            type="date"
            value={uploadDay}
            onChange={(e) => setUploadDay(e.target.value)}
            className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200 text-sm"
          />
        </label>
        {uploadDayHint && <span className="text-xs text-slate-400">{uploadDayHint}</span>}
        {igfForecast && token && (
          <button
            type="button"
            onClick={() => void handleRecalcForecastProvincia()}
            disabled={forecastRecalcLoading}
            className="inline-flex items-center gap-2 rounded bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {forecastRecalcLoading ? "Calculando…" : "Recalcular venta forecast (ARR)"}
          </button>
        )}
        {forecastRecalcMsg && (
          <span className={`text-sm ${forecastRecalcMsg.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>
            {forecastRecalcMsg}
          </span>
        )}
        <Link
          href={token ? `/dashboard?t=${encodeURIComponent(token)}` : "/dashboard"}
          className="inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          Ver dashboard de folios
        </Link>
      </div>
      <main className={plantaFilter ? "flex-1 p-4 flex flex-col" : "flex-1 p-4"}>
        <section className={`rounded-lg border border-slate-700 bg-slate-800/60 p-4 ${plantaFilter ? "flex-shrink-0" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-medium text-slate-200">{plantaFilter ? "Comparación por planta" : "IGF Forecast"}</h2>
            <div className="flex flex-wrap items-center gap-2">
                        {igfForecast && (
                <>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>Planta:</span>
                    <select
                      value={plantaFilter}
                      onChange={(e) => setPlantaFilter(e.target.value)}
                      className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-slate-200 text-xs"
                    >
                      <option value="">Todas</option>
                      {Array.from(new Set(igfForecast.rows.map((r) => r.empresa?.trim()).filter(Boolean))).sort().map((emp) => (
                        <option key={emp} value={emp}>{emp}</option>
                      ))}
                    </select>
                  </label>
                  <span className="text-xs text-slate-500">
                    {MESES[igfForecast.month - 1]} {igfForecast.year}
                    {igfForecast.version_number != null && ` · v${igfForecast.version_number}`}
                  </span>
                </>
              )}
            </div>
          </div>
          {!plantaFilter && (
          <>
          {igfLoading && <p className="text-sm text-slate-400">Cargando datos…</p>}
          {igfError && <p className="text-sm text-red-400">{igfError}</p>}
          {!igfLoading && !igfError && igfForecast && (
            <>
            {(() => {
              const { plantRows, zona } = computeIgfMiniResumenRows(igfForecast.rows, {
                utilOperImporte: (r) => {
                  const x = r.util_oper_importe_igf ?? r.util_oper_importe;
                  return x != null && !Number.isNaN(Number(x)) ? Number(x) : 0;
                },
                resultadoFinalImporte: (r) => getResultadoFinalImporteWithCdjz(r),
              });
              if (plantRows.length === 0) return null;
              const miniCols = [
                { key: "ventaTon" as const, label: "Venta", fmt: (v: number) => fmtNum(v, 2), money: false },
                { key: "margen" as const, label: "Margen", fmt: (v: number) => fmtNum(v), money: false },
                { key: "comDesc" as const, label: "Com. y Desc.", fmt: (v: number) => fmtNum(v), money: false },
                { key: "impuestos" as const, label: "Impuestos", fmt: (v: number) => fmtNum(v), money: false },
                { key: "hgKg" as const, label: "HG - $/Kg", fmt: (v: number) => fmtNum(v), money: false },
                { key: "ingreso" as const, label: "INGRESO", fmt: (v: number) => fmtNum(v, 0), money: true },
                { key: "operativos" as const, label: "OPERATIVOS", fmt: (v: number) => fmtNum(v, 0), money: true },
                { key: "corporativos" as const, label: "CORPORATIVOS", fmt: (v: number) => fmtNum(v, 0), money: true },
                { key: "gasto" as const, label: "GASTO", fmt: (v: number) => fmtNum(v, 0), money: true },
                { key: "utilOperImporte" as const, label: "Util. Operación - Importe", fmt: (v: number) => fmtNum(v, 0), money: true },
                { key: "resultadoFinalImporte" as const, label: "Resultado Final - Importe", fmt: (v: number) => fmtNum(v, 0), money: true },
              ];
              const renderRow = (r: (typeof plantRows)[0] | typeof zona, isZona: boolean) => (
                <tr
                  key={r.empresa}
                  className={
                    isZona
                      ? "border-t-2 border-slate-600 bg-slate-700/50"
                      : "border-b border-slate-700/80"
                  }
                >
                  <td
                    className={`py-2 px-2 text-left text-[0.6em] font-semibold text-slate-100 border-r border-slate-600 ${
                      isZona ? "text-base font-bold" : ""
                    }`}
                  >
                    {r.empresa}
                  </td>
                  {miniCols.map((c) => {
                    const v = r[c.key];
                    const neg = c.money && typeof v === "number" && v < 0;
                    const moneyHighlight =
                      c.key === "utilOperImporte"
                        ? "bg-slate-900/80 text-emerald-300"
                        : c.key === "resultadoFinalImporte"
                          ? "bg-slate-900/80 text-amber-300"
                          : "";
                    return (
                      <td
                        key={c.key}
                        className={`py-2 px-2 text-right tabular-nums text-[0.6em] border-r border-slate-600 last:border-r-0 ${
                          isZona
                            ? `text-base font-bold text-slate-100 ${moneyHighlight}`
                            : neg
                              ? "text-red-400"
                              : `text-slate-300 ${moneyHighlight}`
                        }`}
                      >
                        {c.fmt(v)}
                      </td>
                    );
                  })}
                </tr>
              );
              return (
                <div className="mb-6 overflow-x-auto rounded border border-slate-700">
                  <table className="w-full min-w-[1100px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-600 bg-slate-800/80 text-[0.6em]">
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-300 border-r border-slate-600">Empresa</th>
                        {miniCols.map((c) => (
                          <th
                            key={c.key}
                            className={`text-center py-2.5 px-2 font-semibold border-r border-slate-600 last:border-r-0 whitespace-normal ${
                              c.key === "utilOperImporte"
                                ? "text-emerald-300 bg-slate-900/80"
                                : c.key === "resultadoFinalImporte"
                                  ? "text-amber-300 bg-slate-900/80"
                                  : "text-slate-300"
                            }`}
                          >
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {plantRows.map((r) => renderRow(r, false))}
                      {renderRow(zona, true)}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            <div className={`overflow-x-auto ${plantaFilter ? "max-h-[55vh] overflow-y-auto" : ""}`}>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-600 bg-slate-800/80 text-[0.6em]">
                    <th className="text-left py-2.5 px-2 font-semibold text-slate-300 border-r border-slate-600">Empresa</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300 border-r border-slate-600">Venta (ton)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Margen ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Com. y Desc. ($/kg)</th>
                    {plantaFilter ? (
                      <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Gasto ($/kg)</th>
                    ) : (
                      <>
                        <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Presupuesto ($/kg)</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Folios Aprob. Director ZP ($/kg)</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Folios en carro ($/kg)</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Depósito y cierre ($/kg)</th>
                      </>
                    )}
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Impuesto ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">HG (%)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">HG ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Bancos Planta</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Prov. Planta</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300 border-r border-slate-600">Util. Oper. ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-emerald-300 bg-slate-900/80">Util. Oper. (Importe)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Gtos/Apoyos Corp</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Bancos Corp.</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Otros Programas</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Inversiones</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Resultado ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-amber-300 bg-slate-900/80">Resultado (Importe)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = plantaFilter
                      ? igfForecast.rows.filter((r) => (r.empresa?.trim() || "") === plantaFilter)
                      : igfForecast.rows.filter((r) => !/^TOTALES?$/i.test(r.empresa?.trim() || ""));
                    const sorted = [...filtered]
                      .sort((a, b) => {
                        const iA = ORDEN_PROVINCIA.indexOf(a.empresa?.trim() || "");
                        const iB = ORDEN_PROVINCIA.indexOf(b.empresa?.trim() || "");
                        if (iA === -1 && iB === -1) return (a.empresa || "").localeCompare(b.empresa || "");
                        if (iA === -1) return 1;
                        if (iB === -1) return -1;
                        return iA - iB;
                      });
                    return sorted.map((row: IgfForecastRow, i: number) => (
                      <tr
                        key={row.empresa ? row.empresa : `row-${i}`}
                        className="border-b border-slate-700/80"
                      >
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-slate-100 border-r border-slate-600">{row.empresa || "—"}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300 border-r border-slate-600">{fmtNum(row.venta_ton, 2)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.margen_kg)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.com_desc_kg)}</td>
                        {plantaFilter ? (
                          <td className={`py-2 px-2 text-right tabular-nums ${gastoKgFromFour(row) < 0 ? "text-red-400" : "text-slate-300"}`}>
                            {fmtNum(gastoKgFromFour(row))}
                          </td>
                        ) : (
                          <>
                            <td className="py-2 px-2 text-right tabular-nums">
                              <button
                                type="button"
                                className="min-w-[3rem] rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[0.65rem] text-slate-200 hover:bg-slate-700"
                                onClick={async () => {
                                  setPresupuestoDetalle(row);
                                  setPresupuestoDetalleItems(null);
                                  setPresupuestoDetalleError(null);
                                  setPresupuestoDetalleCategoriaSel(null);
                                  if (!token || !igfForecast) return;
                                  setPresupuestoDetalleLoading(true);
                                  try {
                                    const periodo = `${igfForecast.year}-${String(igfForecast.month).padStart(2, "0")}`;
                                    const detalle = await fetchPresupuestoDetalle(token, row.empresa || "", periodo);
                                    setPresupuestoDetalleItems(detalle.detalle || []);
                                  } catch (e: any) {
                                    setPresupuestoDetalleError(e?.message || "Error al cargar detalle de presupuesto");
                                  } finally {
                                    setPresupuestoDetalleLoading(false);
                                  }
                                }}
                              >
                                {fmtNum(getPresupuestoKgWithGend(row))}
                              </button>
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums text-slate-300">
                              <button
                                type="button"
                                className="min-w-[3rem] rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[0.65rem] text-slate-200 hover:bg-slate-700"
                                onClick={() => openIgfFoliosDetalle(row, "aprob_zp", "Folios Aprob. Director ZP ($/kg)")}
                              >
                                {fmtNum(row.folios_aprob_zp_kg ?? null)}
                              </button>
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums text-slate-300">
                              <button
                                type="button"
                                className="min-w-[3rem] rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[0.65rem] text-slate-200 hover:bg-slate-700"
                                onClick={() => openIgfFoliosDetalle(row, "carro", "Folios en carro ($/kg)")}
                              >
                                {fmtNum(row.folios_carro_kg ?? null)}
                              </button>
                            </td>
                            <td className={`py-2 px-2 text-right tabular-nums ${row.deposito_cierre_kg != null && Number(row.deposito_cierre_kg) < 0 ? "text-red-400" : "text-slate-300"}`}>
                              <button
                                type="button"
                                className={`min-w-[3rem] rounded border px-1.5 py-0.5 text-[0.65rem] hover:bg-slate-700 ${
                                  row.deposito_cierre_kg != null && Number(row.deposito_cierre_kg) < 0
                                    ? "border-red-500/50 bg-red-950/40 text-red-200"
                                    : "border-slate-600 bg-slate-800 text-slate-200"
                                }`}
                                onClick={() => openIgfFoliosDetalle(row, "deposito_cierre", "Depósito y cierre ($/kg)")}
                              >
                                {fmtNum(row.deposito_cierre_kg ?? null)}
                              </button>
                            </td>
                          </>
                        )}
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.impuesto_kg)}</td>
                        <td className="py-2 px-2 text-right text-slate-300">
                          <input
                            key={`hg-${row.empresa ?? i}-${row.hg_pct != null ? (Number(row.hg_pct) * 100).toFixed(1) : ""}`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            className="w-14 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-right text-slate-200 text-sm"
                            defaultValue={row.hg_pct != null ? (Number(row.hg_pct) * 100).toFixed(1) : ""}
                            placeholder="—"
                            onBlur={async (e) => {
                              const raw = e.target.value.trim();
                              if (raw === "" || !token || !igfForecast) return;
                              const v = parseFloat(raw);
                              if (Number.isNaN(v)) return;
                              const newPct = v / 100;
                              const currentPct = row.hg_pct != null ? Number(row.hg_pct) : null;
                              if (currentPct !== null && Math.abs(newPct - currentPct) < 1e-9) return;
                              setHgSaving(row.empresa || null);
                              try {
                                await patchIgfForecastHg(token, {
                                  year: igfForecast.year,
                                  month: igfForecast.month,
                                  empresa: row.empresa || "",
                                  hg_pct: newPct,
                                });
                                const updated = await fetchIgfForecast(token, {
                                  year: igfForecast.year,
                                  month: igfForecast.month,
                                });
                                setIgfForecast(updated);
                              } catch {
                                e.target.value = row.hg_pct != null ? (Number(row.hg_pct) * 100).toFixed(1) : "";
                              } finally {
                                setHgSaving(null);
                              }
                            }}
                          />
                          {hgSaving === row.empresa && <span className="ml-1 text-xs text-slate-500">Guardando…</span>}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.hg_kg ?? null)}</td>
                        {COLS_EXTRA.map((c) => {
                          const n = (x: unknown): number => (x != null && !Number.isNaN(Number(x)) ? Number(x) : 0);
                          const ventaKgRow = n(row.venta_ton) * 1000;
                          const baseInvKg = n(row.inversiones_kg);
                          const adjInvKg = n(getInversionesKgWithCdjz(row));
                          const deltaInvCostKg = Math.abs(adjInvKg) - Math.abs(baseInvKg);
                          const rawVal = (row as Record<string, unknown>)[c.key] as number | null | undefined;
                          const isImporte = c.key === "resultado_final_importe" || c.key === "util_oper_importe";
                          const isInversionesKg = c.key === "inversiones_kg";
                          const val =
                            c.key === "inversiones_kg"
                              ? getInversionesKgWithCdjz(row)
                              : c.key === "resultado_final_kg"
                              ? n(rawVal) - deltaInvCostKg
                              : c.key === "resultado_final_importe"
                              ? n(rawVal) - (deltaInvCostKg * ventaKgRow)
                              : rawVal;
                          const invIsNeg = !isImporte && val != null && Number(val) < 0;
                          const highlightClass =
                            c.key === "util_oper_importe"
                              ? "bg-emerald-900/30 text-emerald-300 font-semibold"
                              : c.key === "resultado_final_importe"
                              ? "bg-amber-900/30 text-amber-300 font-semibold"
                              : "";
                          return (
                            <td
                              key={c.key}
                              className={`py-2 px-2 text-right tabular-nums ${isInversionesKg && invIsNeg ? "text-red-400" : "text-slate-300"} ${c.key === "util_oper_kg" ? "border-r border-slate-600" : ""} ${highlightClass}`}
                            >
                              {isInversionesKg && val != null ? (
                                <button
                                  type="button"
                                  className={`min-w-[3rem] rounded border px-1.5 py-0.5 text-[0.65rem] hover:bg-slate-700 ${
                                    invIsNeg
                                      ? "border-red-500/50 bg-red-950/40 text-red-200"
                                      : "border-slate-600 bg-slate-800 text-slate-200"
                                  }`}
                                  onClick={() => openIgfFoliosDetalle(row, "inversiones", "Inversiones ($/kg)")}
                                >
                                  {fmtNum(val ?? null)}
                                </button>
                              ) : (
                                isImporte ? fmtNum(val ?? null, 0) : fmtNum(val ?? null)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
                {igfForecast.totales && !plantaFilter && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-600 bg-slate-700/50">
                      <td className="py-3 px-2 text-base font-bold text-slate-100 border-r border-slate-600">Total</td>
                      <td className="py-3 px-2 text-right tabular-nums text-base font-bold text-slate-100 border-r border-slate-600">
                        {fmtNum(igfForecast.totales.venta_ton ?? null, 2)}
                      </td>
                      <td colSpan={11} className="py-3 px-2" />
                      <td className="py-3 px-2 border-r border-slate-600" />
                      <td className="py-3 px-2 text-right tabular-nums text-base font-bold text-slate-100">
                        {fmtNum(igfForecast.totales.util_oper_importe ?? null, 0)}
                      </td>
                      <td colSpan={4} className="py-3 px-2" />
                      <td className="py-3 px-2" />
                      <td className="py-3 px-2 text-right tabular-nums text-base font-bold text-slate-100">
                        {fmtNum(
                          igfForecast.rows
                            .filter((r) => !/^TOTALES?$/i.test(r.empresa?.trim() || ""))
                            .reduce((sum, r) => sum + getResultadoFinalImporteWithCdjz(r), 0),
                          0
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              {igfForecast.rows.length === 0 && (
                <p className="text-sm text-slate-500 py-4">No hay datos IGF para este mes.</p>
              )}
            </div>
            </>
          )}
          </>
          )}
        </section>
        {plantaFilter && igfForecast && (
          <section className="mt-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4 flex-shrink-0">
            <h3 className="text-base font-medium text-slate-200 mb-2">Comparación IGF Forecast vs última versión del mes anterior</h3>
            {igfMesAnteriorLoading && <p className="text-sm text-slate-400">Cargando mes anterior…</p>}
            {!igfMesAnteriorLoading && igfForecast && (() => {
              const rowF = findRowByPlanta(igfForecast.rows, plantaFilter);
              const rowA = igfMesAnterior ? findRowByPlanta(igfMesAnterior.rows, plantaFilter) : undefined;
              if (!rowF) return <p className="text-sm text-slate-500">No hay datos de forecast para esta planta.</p>;
              const n = (v: unknown): number => (v != null && !Number.isNaN(Number(v)) ? Number(v) : 0);
              const delta = (a: number | null | undefined, b: number | null | undefined) => n(a) - n(b);
              const toCostoNeg = (v: number | null | undefined): number => {
                const x = n(v);
                return x > 0 ? -x : x;
              };
              const adjustedForecastValue = (row: IgfForecastRow, key: string): number => {
                const r = row as Record<string, unknown>;
                const ventaKg = n(r.venta_ton as number | null | undefined) * 1000;
                if (key === "inversiones_kg") return n(getInversionesKgWithCdjz(row));
                if (key === "resultado_final_importe") return getResultadoFinalImporteWithCdjz(row);
                if (key === "resultado_final_kg") {
                  if (ventaKg > 0) return getResultadoFinalImporteWithCdjz(row) / ventaKg;
                  const baseInvKg = n(r.inversiones_kg as number | null | undefined);
                  const adjInvKg = n(getInversionesKgWithCdjz(row));
                  const deltaInvCostKg = Math.abs(adjInvKg) - Math.abs(baseInvKg);
                  return n(r.resultado_final_kg as number | null | undefined) - deltaInvCostKg;
                }
                return n(r[key] as number | null | undefined);
              };
              type Col = { key: string; label: string; fmt: (v: number) => string; isPct?: boolean };
              const cols: Col[] = [
                { key: "empresa", label: "Empresa", fmt: () => "" },
                { key: "venta_ton", label: "Venta (ton)", fmt: (v) => fmtNum(v, 2) },
                { key: "margen_kg", label: "Margen ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "com_desc_kg", label: "Com. y Desc. ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "gasto_kg", label: "Gasto ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "impuesto_kg", label: "Impuesto ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "hg_pct", label: "HG (%)", fmt: (v) => fmtNum(v * 100, 1), isPct: true },
                { key: "hg_kg", label: "HG ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "bancos_planta_kg", label: "Bancos Planta", fmt: (v) => fmtNum(v) },
                { key: "provision_planta_kg", label: "Prov. Planta", fmt: (v) => fmtNum(v) },
                { key: "util_oper_kg", label: "Util. Oper. ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "util_oper_importe", label: "Util. Oper. (Importe)", fmt: (v) => fmtNum(v, 0) },
                { key: "gtos_apoyos_corp_kg", label: "Gtos/Apoyos Corp", fmt: (v) => fmtNum(v) },
                { key: "bancos_corp_kg", label: "Bancos Corp.", fmt: (v) => fmtNum(v) },
                { key: "otros_programas_kg", label: "Otros Programas", fmt: (v) => fmtNum(v) },
                { key: "inversiones_kg", label: "Inversiones", fmt: (v) => fmtNum(v) },
                { key: "resultado_final_kg", label: "Resultado ($/kg)", fmt: (v) => fmtNum(v) },
                { key: "resultado_final_importe", label: "Resultado (Importe)", fmt: (v) => fmtNum(v, 0) },
              ];
              const cellVal = (row: IgfForecastRow | undefined, c: Col) => {
                if (!row) return "—";
                if (c.key === "empresa") return row.empresa ?? "—";
                if (c.key === "gasto_kg") {
                  // Regla pedida:
                  // - Forecast (fila superior): gasto recalculado por componentes.
                  // - Mes anterior: usar gasto_kg original de IGF versión previa.
                  if (row === rowA) {
                    const rawIgf = (row as Record<string, unknown>).gasto_kg_igf as number | null | undefined;
                    const fallback = (row as Record<string, unknown>).gasto_kg as number | null | undefined;
                    return fmtNum(toCostoNeg((rawIgf ?? fallback) ?? null));
                  }
                  return fmtNum(gastoKgFromFour(row));
                }
                if (
                  row === rowA &&
                  (c.key === "util_oper_kg" ||
                    c.key === "util_oper_importe" ||
                    c.key === "resultado_final_kg" ||
                    c.key === "resultado_final_importe")
                ) {
                  const r = row as Record<string, unknown>;
                  if (c.key === "util_oper_kg") return fmtNum(n(r.util_oper_kg_igf ?? r.util_oper_kg));
                  if (c.key === "util_oper_importe") return fmtNum(n(r.util_oper_importe_igf ?? r.util_oper_importe), 0);
                  if (c.key === "resultado_final_kg") return fmtNum(n(r.resultado_final_kg_igf ?? r.resultado_final_kg));
                  if (c.key === "resultado_final_importe") return fmtNum(n(r.resultado_final_importe_igf ?? r.resultado_final_importe), 0);
                }
                if (row === rowF && (c.key === "inversiones_kg" || c.key === "resultado_final_kg" || c.key === "resultado_final_importe")) {
                  const vAdj = adjustedForecastValue(row, c.key);
                  return fmtNum(vAdj, c.key.includes("importe") ? 0 : 2);
                }
                const v = (row as Record<string, unknown>)[c.key];
                if (c.isPct && v != null) return (Number(v) * 100).toFixed(1);
                return fmtNum(v as number | null ?? null, c.key.includes("importe") || c.key === "util_oper_importe" || c.key === "resultado_final_importe" ? 0 : 2);
              };
              const rA = rowA ? (rowA as Record<string, unknown>) : null;
              const utilOperKgA = rowA ? n(rA!.util_oper_kg_igf ?? rA!.util_oper_kg) : 0;
              const utilOperImporteA = rowA ? n(rA!.util_oper_importe_igf ?? rA!.util_oper_importe) : 0;
              const cellDeltaNum = (c: Col): number | null => {
                if (c.key === "empresa" || !rowA) return null;
                const vF = c.key === "gasto_kg"
                  ? gastoKgFromFour(rowF)
                  : (c.key === "inversiones_kg" || c.key === "resultado_final_kg" || c.key === "resultado_final_importe")
                  ? adjustedForecastValue(rowF, c.key)
                  : (rowF as Record<string, unknown>)[c.key] as number | null | undefined;
                const vA =
                  c.key === "util_oper_kg"
                    ? n(rA!.util_oper_kg_igf ?? rA!.util_oper_kg)
                    : c.key === "util_oper_importe"
                    ? n(rA!.util_oper_importe_igf ?? rA!.util_oper_importe)
                    : c.key === "resultado_final_kg"
                    ? n(rA!.resultado_final_kg_igf ?? rA!.resultado_final_kg)
                    : c.key === "resultado_final_importe"
                    ? n(rA!.resultado_final_importe_igf ?? rA!.resultado_final_importe)
                    : c.key === "gasto_kg"
                    ? toCostoNeg((rA!.gasto_kg_igf as number | null | undefined) ?? (rA!.gasto_kg as number | null | undefined))
                    : (rA![c.key] as number | null | undefined);
                return c.isPct ? (n(vF) - n(vA)) * 100 : delta(vF, vA);
              };
              const ventaKgA = rowA ? n((rowA as Record<string, unknown>).venta_ton as number | null | undefined) * 1000 : 0;
              const ventaKgF = n((rowF as Record<string, unknown>).venta_ton as number | null | undefined) * 1000;
              // Impacto (Importe): fórmula Excel (COL_fila2*$B$2)-(COL_fila3*$B$3) = (valor_forecast*venta_kg_forecast) - (valor_mes_anterior*venta_kg_mes_anterior) para Gtos/Apoyos Corp, Bancos Corp., Otros Programas, Inversiones.
              const cellImpacto = (c: Col): number | null => {
                if (c.key === "empresa" || !rowA) return null;
                if (c.key === "hg_pct") return null;
                if (c.key === "util_oper_kg") return null;
                const vF = (c.key === "inversiones_kg" || c.key === "resultado_final_kg" || c.key === "resultado_final_importe")
                  ? adjustedForecastValue(rowF, c.key)
                  : (rowF as Record<string, unknown>)[c.key] as number | null | undefined;
                const vA =
                  c.key === "util_oper_importe"
                    ? n(rA!.util_oper_importe_igf ?? rA!.util_oper_importe)
                    : c.key === "resultado_final_importe"
                    ? n(rA!.resultado_final_importe_igf ?? rA!.resultado_final_importe)
                    : (rowA as Record<string, unknown>)[c.key] as number | null | undefined;
                if (c.key === "venta_ton") {
                  const utilOperF = n((rowF as Record<string, unknown>).util_oper_kg as number | null | undefined);
                  return (ventaKgF - ventaKgA) * utilOperF;
                }
                if (c.key === "com_desc_kg") return (n(vF) - n(vA)) * ventaKgA;
                if (c.key === "gasto_kg") {
                  const gastoA = ((rowA as Record<string, unknown>).gasto_kg_igf as number | null | undefined) ?? ((rowA as Record<string, unknown>).gasto_kg as number | null | undefined);
                  return (gastoKgFromFour(rowF) - toCostoNeg(gastoA)) * ventaKgA;
                }
                if (c.key === "impuesto_kg") return (n(vF) - n(vA)) * ventaKgA;
                if (c.key === "bancos_planta_kg") return (n(vF) - n(vA)) * ventaKgA;
                if (c.key === "provision_planta_kg") return (n(vF) - n(vA)) * ventaKgA;
                // Fórmula imagen: (valor_forecast * venta_kg_forecast) - (valor_mes_anterior * venta_kg_mes_anterior)
                if (c.key === "gtos_apoyos_corp_kg" || c.key === "bancos_corp_kg" || c.key === "otros_programas_kg" || c.key === "inversiones_kg") {
                  return (n(vF) * ventaKgF) - (n(vA) * ventaKgA);
                }
                if (c.key === "util_oper_importe") return n((rowF as Record<string, unknown>).util_oper_importe as number | null | undefined) - utilOperImporteA;
                if (c.key === "resultado_final_importe") return delta(vF, vA);
                const deltaKg = c.isPct ? (n(vF) - n(vA)) * 100 : delta(vF, vA);
                if (c.isPct) return null;
                return deltaKg * ventaKgA;
              };
              return (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-600 bg-slate-800/80 text-[0.6em]">
                        {cols.map((c) => {
                          if (c.key === "empresa") {
                            return (
                              <th key={c.key} className="text-left py-2 px-2 font-semibold text-slate-300 border-r border-slate-600">
                                {c.label}
                              </th>
                            );
                          }
                          const highlightHeaderClass =
                            c.key === "util_oper_importe"
                              ? "text-emerald-300 bg-slate-900/80"
                              : c.key === "resultado_final_importe"
                              ? "text-amber-300 bg-slate-900/80"
                              : "text-slate-300";
                          return (
                            <th
                              key={c.key}
                              className={`text-right py-2 px-2 font-semibold ${highlightHeaderClass}`}
                            >
                              {c.label}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-600 bg-slate-800/40">
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-amber-200 border-r border-slate-600">IGF Forecast</td>
                        {cols.slice(1).map((c) => {
                          const highlightColClass =
                            c.key === "util_oper_importe"
                              ? "bg-emerald-900/30 text-emerald-300 font-semibold"
                              : c.key === "resultado_final_importe"
                              ? "bg-amber-900/30 text-amber-300 font-semibold"
                              : "text-slate-300";
                          return (
                            <td key={c.key} className={`py-2 px-2 text-right tabular-nums ${highlightColClass}`}>
                              {cellVal(rowF, c)}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-b border-slate-600 bg-slate-800/40">
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-slate-300 border-r border-slate-600">IGF mes anterior</td>
                        {cols.slice(1).map((c) => {
                          const highlightColClass =
                            c.key === "util_oper_importe"
                              ? "bg-emerald-900/10 text-emerald-200"
                              : c.key === "resultado_final_importe"
                              ? "bg-amber-900/10 text-amber-200"
                              : "text-slate-300";
                          return (
                            <td key={c.key} className={`py-2 px-2 text-right tabular-nums ${highlightColClass}`}>
                              {cellVal(rowA, c)}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-t-2 border-slate-500 bg-slate-700/50">
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-slate-200 border-r border-slate-600">Cambio</td>
                        {cols.slice(1).map((c) => {
                          const d = cellDeltaNum(c);
                          const hasDelta = d !== null;
                          const highlightColClass =
                            c.key === "util_oper_importe"
                              ? "bg-emerald-900/20"
                              : c.key === "resultado_final_importe"
                              ? "bg-amber-900/20"
                              : "";
                          return (
                            <td
                              key={c.key}
                              className={`py-2 px-2 text-right tabular-nums ${hasDelta && d! > 0 ? "text-green-400" : hasDelta && d! < 0 ? "text-red-400" : "text-slate-400"} ${highlightColClass}`}
                            >
                              {hasDelta ? (d! >= 0 ? "+" : "") + (c.isPct ? fmtNum(d!, 1) : c.fmt(d!)) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-t border-slate-600 bg-slate-700/40">
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-slate-300 border-r border-slate-600">Impacto (Importe)</td>
                        {cols.slice(1).map((c) => {
                          const imp = cellImpacto(c);
                          const hasImp = imp !== null;
                          const highlightColClass =
                            c.key === "util_oper_importe"
                              ? "bg-emerald-900/20"
                              : c.key === "resultado_final_importe"
                              ? "bg-amber-900/20"
                              : "";
                          return (
                            <td
                              key={c.key}
                              className={`py-2 px-2 text-right tabular-nums ${hasImp && imp! > 0 ? "text-green-400" : hasImp && imp! < 0 ? "text-red-400" : "text-slate-400"} ${highlightColClass}`}
                            >
                              {hasImp ? (imp! >= 0 ? "+" : "") + fmtNum(imp!, 0) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </section>
        )}
      </main>
      {presupuestoDetalle && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            setPresupuestoDetalle(null);
            setPresupuestoDetalleItems(null);
            setPresupuestoDetalleCategoriaSel(null);
            setPresupuestoDetalleError(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
              <h3 className="text-base font-semibold text-slate-200">
                Presupuesto $/kg · {presupuestoDetalle.empresa || "Planta"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPresupuestoDetalle(null);
                  setPresupuestoDetalleItems(null);
                  setPresupuestoDetalleCategoriaSel(null);
                  setPresupuestoDetalleError(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                Venta forecast:{" "}
                <span className="font-mono">
                  {fmtNum(presupuestoDetalle.venta_ton, 2)} ton
                </span>
              </p>
              <p>
                Presupuesto (incluye GEND):{" "}
                <span className="font-mono">
                  {fmtNum(getPresupuestoKgWithGend(presupuestoDetalle) ?? null)} $/kg
                </span>
              </p>
              {(() => {
                const gendMxn = presupuestoGendByEmpresa[presupuestoGendKey(presupuestoDetalle.empresa || "")] ?? 0;
                if (gendMxn === 0) return null;
                return (
                  <p className="text-slate-200">
                    GEND (MXN):{" "}
                    <span className="font-mono font-medium">
                      {Math.abs(gendMxn).toLocaleString("es-MX", {
                        style: "currency",
                        currency: "MXN",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </p>
                );
              })()}
              <p>
                Importe total aproximado:{" "}
                <span className="font-mono">
                  {(() => {
                    const vTon = presupuestoDetalle.venta_ton != null && !Number.isNaN(Number(presupuestoDetalle.venta_ton))
                      ? Number(presupuestoDetalle.venta_ton)
                      : 0;
                    const pKgEff = getPresupuestoKgWithGend(presupuestoDetalle) ?? 0;
                    const total = vTon * 1000 * Math.abs(pKgEff);
                    return total.toLocaleString("es-MX", {
                      style: "currency",
                      currency: "MXN",
                      maximumFractionDigits: 0,
                    });
                  })()}
                </span>
              </p>
              <div className="mt-2 space-y-1 text-xs text-slate-300">
                <label className="block">
                  <span className="mr-1">GEND (MXN) para esta planta:</span>
                  <input
                    type="number"
                    className="mt-1 w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                    value={presupuestoGendByEmpresa[presupuestoGendKey(presupuestoDetalle.empresa || "")] ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      const key = presupuestoGendKey(presupuestoDetalle.empresa || "");
                      setPresupuestoGendByEmpresa((prev) => ({
                        ...prev,
                        [key]: raw === "" ? 0 : Number(raw) || 0,
                      }));
                    }}
                  />
                </label>
                {(() => {
                  const gendMxn = presupuestoGendByEmpresa[presupuestoGendKey(presupuestoDetalle.empresa || "")] ?? 0;
                  if (gendMxn === 0) return null;
                  return (
                    <p className="mt-1 font-medium text-slate-200">
                      GEND aplicado:{" "}
                      <span className="font-mono">
                        {Math.abs(gendMxn).toLocaleString("es-MX", {
                          style: "currency",
                          currency: "MXN",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </p>
                  );
                })()}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Nota: Importe estimado = Venta (kg) × |Presupuesto $/kg|, donde Presupuesto $/kg ya incluye el ajuste GEND (MXN) capturado arriba.
              </p>
              <div className="mt-4">
                <h4 className="mb-1 text-sm font-semibold text-slate-200">Desglose por categoría y subcategoría</h4>
                {presupuestoDetalleLoading && <p className="text-xs text-slate-400">Cargando detalle…</p>}
                {presupuestoDetalleError && <p className="text-xs text-red-400">{presupuestoDetalleError}</p>}
                {!presupuestoDetalleLoading && !presupuestoDetalleError && presupuestoDetalleItems && presupuestoDetalleItems.length > 0 && (() => {
                  const byCat: Record<string, number> = {};
                  for (const it of presupuestoDetalleItems) {
                    const cat = it.categoria || "—";
                    byCat[cat] = (byCat[cat] || 0) + (it.monto_aprobado || 0);
                  }
                  // Añadir categoría virtual GEND si hay monto capturado.
                  const extraMxn = presupuestoGendByEmpresa[presupuestoGendKey(presupuestoDetalle.empresa || "")] ?? 0;
                  if (extraMxn) {
                    byCat["GEND"] = (byCat["GEND"] || 0) + Math.abs(extraMxn);
                  }
                  const categorias = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
                  const subitems =
                    presupuestoDetalleCategoriaSel && presupuestoDetalleItems
                      ? presupuestoDetalleItems
                          .filter((it) => (it.categoria || "—") === presupuestoDetalleCategoriaSel)
                          .concat(
                            presupuestoDetalleCategoriaSel === "GEND" && extraMxn
                              ? [{ categoria: "GEND", subcategoria: "GEND", monto_aprobado: Math.abs(extraMxn) } as PresupuestoDetalleItem]
                              : []
                          )
                      : [];
                  return (
                    <div className="space-y-3">
                      <div className="max-h-40 overflow-y-auto border border-slate-700 rounded">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-700 bg-slate-800 text-slate-300">
                              <th className="py-1 px-2 text-left">Categoría</th>
                              <th className="py-1 px-2 text-right">Total aprobado (MXN)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categorias.map((cat) => (
                              <tr
                                key={cat}
                                className={`border-b border-slate-800 text-slate-200 hover:bg-slate-800 cursor-pointer ${
                                  presupuestoDetalleCategoriaSel === cat ? "bg-slate-800" : ""
                                }`}
                                onClick={() =>
                                  setPresupuestoDetalleCategoriaSel((prev) => (prev === cat ? null : cat))
                                }
                              >
                                <td className="py-1 px-2">{cat}</td>
                                <td className="py-1 px-2 text-right tabular-nums">
                                  {byCat[cat].toLocaleString("es-MX", {
                                    style: "currency",
                                    currency: "MXN",
                                    maximumFractionDigits: 0,
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {presupuestoDetalleCategoriaSel && (
                        <div className="max-h-40 overflow-y-auto border border-slate-700 rounded">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-700 bg-slate-800 text-slate-300">
                                <th className="py-1 px-2 text-left">
                                  Subcategorías · {presupuestoDetalleCategoriaSel}
                                </th>
                                <th className="py-1 px-2 text-right">Monto aprobado (MXN)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subitems.map((it, idx) => (
                                <tr key={`${it.categoria}-${it.subcategoria}-${idx}`} className="border-b border-slate-800 text-slate-200">
                                  <td className="py-1 px-2">{it.subcategoria}</td>
                                  <td className="py-1 px-2 text-right tabular-nums">
                                    {it.monto_aprobado.toLocaleString("es-MX", {
                                      style: "currency",
                                      currency: "MXN",
                                      maximumFractionDigits: 0,
                                    })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {!presupuestoDetalleLoading && !presupuestoDetalleError && (!presupuestoDetalleItems || presupuestoDetalleItems.length === 0) && (
                  <p className="text-xs text-slate-500">No hay presupuesto asignado por categoría para esta planta y periodo.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {igfFoliosModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            setIgfFoliosModal(null);
            setIgfFoliosItems(null);
            setIgfFoliosError(null);
          }}
        >
          <div
            className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex flex-shrink-0 items-center justify-between border-b border-slate-700 pb-2">
              <div>
                <h3 className="text-base font-semibold text-slate-200">{igfFoliosModal.label}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {igfFoliosModal.empresa} · {igfForecast ? `${MESES[igfForecast.month - 1]} ${igfForecast.year}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIgfFoliosModal(null);
                  setIgfFoliosItems(null);
                  setIgfFoliosError(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                ×
              </button>
            </div>
            {igfFoliosLoading && <p className="text-sm text-slate-400">Cargando folios…</p>}
            {igfFoliosError && <p className="text-sm text-red-400">{igfFoliosError}</p>}
            {!igfFoliosLoading && !igfFoliosError && igfFoliosItems && (
              <div className="overflow-auto flex-1 min-h-0 -mx-1">
                {(igfFoliosModal.tipo === "inversiones" || /inversiones/i.test(igfFoliosModal.label || "")) && (() => {
                  const empresa = igfFoliosModal.empresa || "";
                  const rowEmpresa = igfForecast ? findRowByPlanta(igfForecast.rows, empresa) : undefined;
                  const ventaTon = rowEmpresa?.venta_ton != null && !Number.isNaN(Number(rowEmpresa.venta_ton)) ? Number(rowEmpresa.venta_ton) : 0;
                  const ventaKg = ventaTon * 1000;
                  const foliosMxn = igfFoliosItems.reduce((s, f) => s + Math.abs(Number(f.importe || 0)), 0);
                  const key = presupuestoGendKey(empresa);
                  const inversionCdjzMxn = inversionCdjzByEmpresa[key] ?? 0;
                  const draftNum = inversionCdjzDraft.trim() === "" ? 0 : Number(inversionCdjzDraft) || 0;
                  const inversionPreviewMxn = Math.abs(draftNum);
                  const totalMxn = foliosMxn + Math.abs(inversionCdjzMxn);
                  const totalPreviewMxn = foliosMxn + inversionPreviewMxn;
                  const invKg = ventaKg > 0 && totalPreviewMxn > 0 ? -(totalPreviewMxn / ventaKg) : null;
                  return (
                    <div className="mb-3 rounded border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
                      <p>
                        Venta forecast: <span className="font-mono">{fmtNum(ventaTon || null, 2)} ton</span>
                      </p>
                      <p>
                        Inversión folios (MXN):{" "}
                        <span className="font-mono">
                          {foliosMxn.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })}
                        </span>
                      </p>
                      <p>
                        Inversión total guardada (folios + CDJZ):{" "}
                        <span className="font-mono">
                          {totalMxn.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })}
                        </span>
                      </p>
                      <p>
                        Inversión total preview (folios + CDJZ):{" "}
                        <span className="font-mono">
                          {totalPreviewMxn.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })}
                        </span>
                      </p>
                      <p>
                        Inversiones ($/kg): <span className="font-mono">{invKg != null ? fmtNum(invKg) : "—"} $/kg</span>
                      </p>
                      <div className="mt-2">
                        <label className="block text-xs text-slate-300">
                          <span className="mr-1">Inversión CDJZ (MXN) para esta planta:</span>
                          <input
                            type="number"
                            className="mt-1 w-44 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            value={inversionCdjzDraft}
                            onChange={(e) => {
                              setInversionCdjzDraft(e.target.value);
                              setInversionCdjzSaved(false);
                            }}
                          />
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded bg-emerald-700 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                            onClick={() => {
                              const raw = inversionCdjzDraft.trim();
                              setInversionCdjzByEmpresa((prev) => ({
                                ...prev,
                                [key]: raw === "" ? 0 : Number(raw) || 0,
                              }));
                              setInversionCdjzSaved(true);
                            }}
                          >
                            Guardar CDJZ
                          </button>
                          {inversionCdjzSaved && <span className="text-xs text-emerald-300">Guardado</span>}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {igfFoliosItems.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay folios que coincidan con este criterio y periodo.</p>
                ) : (
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-900 z-10">
                      <tr className="border-b border-slate-600 text-slate-300">
                        <th className="py-2 px-2 text-left">Folio</th>
                        <th className="py-2 px-2 text-right">Importe</th>
                        <th className="py-2 px-2 text-left">Estatus</th>
                        <th className="py-2 px-2 text-left">Categoría</th>
                        <th className="py-2 px-2 text-left">Subcategoría</th>
                        <th className="py-2 px-2 text-left">Mes cargo</th>
                        <th className="py-2 px-2 text-left">Planta</th>
                        <th className="py-2 px-2 text-left">Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {igfFoliosItems.map((f) => (
                        <tr key={f.id} className="border-b border-slate-800 text-slate-200">
                          <td className="py-1.5 px-2 font-mono whitespace-nowrap">{f.numero_folio || f.folio_codigo || f.id}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums">
                            {f.importe != null
                              ? f.importe.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })
                              : "—"}
                          </td>
                          <td className="py-1.5 px-2">{f.estatus || "—"}</td>
                          <td className="py-1.5 px-2 max-w-[120px] truncate" title={f.categoria || ""}>
                            {f.categoria || "—"}
                          </td>
                          <td className="py-1.5 px-2 max-w-[120px] truncate" title={f.subcategoria || ""}>
                            {f.subcategoria || "—"}
                          </td>
                          <td className="py-1.5 px-2 whitespace-nowrap">{f.mes_cargo || "—"}</td>
                          <td className="py-1.5 px-2 max-w-[140px] truncate" title={f.planta_nombre || ""}>
                            {f.planta_nombre || "—"}
                          </td>
                          <td className="py-1.5 px-2 text-slate-400 max-w-[220px]">{f.descripcion || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
