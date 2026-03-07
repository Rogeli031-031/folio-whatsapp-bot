"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
} from "@/lib/auth";
import { fetchIgfForecast, type IgfForecastResponse, type IgfForecastRow } from "@/lib/api";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function fmtNum(v: number | null, decimals = 2): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function KpiContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [igfForecast, setIgfForecast] = useState<IgfForecastResponse | null>(null);
  const [igfLoading, setIgfLoading] = useState(false);
  const [igfError, setIgfError] = useState<string | null>(null);

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
    if (!token) return;
    setIgfLoading(true);
    setIgfError(null);
    fetchIgfForecast(token)
      .then(setIgfForecast)
      .catch((e) => setIgfError(e.message || "Error al cargar IGF Forecast"))
      .finally(() => setIgfLoading(false));
  }, [token]);

  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Acceso no autorizado</h1>
          <p className="mt-2 text-sm text-slate-400">
            Abre el enlace que recibiste por WhatsApp (válido 20 min) o escribe &quot;dashboard&quot; en el bot.
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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3">
        <h1 className="text-xl font-semibold text-white">KPI Financieros</h1>
        <p className="mt-1 text-sm text-slate-400">IGF Forecast y métricas por planta / provincia</p>
      </div>
      <main className="flex-1 p-4">
        <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-medium text-slate-200">IGF Forecast</h2>
            {igfForecast && (
              <span className="text-xs text-slate-500">
                {MESES[igfForecast.month - 1]} {igfForecast.year}
                {igfForecast.version_number != null && ` · v${igfForecast.version_number}`}
              </span>
            )}
          </div>
          {igfLoading && <p className="text-sm text-slate-400">Cargando datos…</p>}
          {igfError && <p className="text-sm text-red-400">{igfError}</p>}
          {!igfLoading && !igfError && igfForecast && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-2 px-2 font-medium text-slate-400">Empresa</th>
                    <th className="text-right py-2 px-2 font-medium text-slate-400">Venta (ton)</th>
                    <th className="text-right py-2 px-2 font-medium text-slate-400">Margen ($/kg)</th>
                    <th className="text-right py-2 px-2 font-medium text-slate-400">Com. y Desc. ($/kg)</th>
                    <th className="text-right py-2 px-2 font-medium text-slate-400">Gasto ($/kg)</th>
                    <th className="text-right py-2 px-2 font-medium text-slate-400">Impuesto ($/kg)</th>
                    <th className="text-right py-2 px-2 font-medium text-slate-400">HG (%)</th>
                    <th className="text-right py-2 px-2 font-medium text-slate-400">HG ($/kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {igfForecast.rows.map((row: IgfForecastRow, i: number) => (
                    <tr
                      key={row.empresa ? row.empresa : `row-${i}`}
                      className={`border-b border-slate-700/80 ${/^TOTALES?$/i.test(row.empresa) ? "bg-slate-700/40 font-medium" : ""}`}
                    >
                      <td className="py-1.5 px-2 text-slate-200">{row.empresa || "—"}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{fmtNum(row.venta_ton, 2)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{fmtNum(row.margen_kg)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{fmtNum(row.com_desc_kg)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{fmtNum(row.gasto_kg)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{fmtNum(row.impuesto_kg)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{row.hg_pct != null ? `${(Number(row.hg_pct) * 100).toFixed(1)}%` : "—"}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{fmtNum(row.hg_kg ?? null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {igfForecast.rows.length === 0 && (
                <p className="text-sm text-slate-500 py-4">No hay datos IGF para este mes.</p>
              )}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Próximamente: presupuesto, folios Carro/Depósito, Util. Operación, Resultado final y botones por rol.
          </p>
        </section>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Ver dashboard de folios
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4"><p className="text-slate-400">Cargando…</p></div>}>
      <KpiContent />
    </Suspense>
  );
}
