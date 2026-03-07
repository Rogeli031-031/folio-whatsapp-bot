"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
} from "@/lib/auth";
import { fetchIgfForecast, patchIgfForecastHg, type IgfForecastResponse, type IgfForecastRow } from "@/lib/api";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ORDEN_PROVINCIA = ["GT - Puebla", "Tehuacán", "Acapulco", "GTM - Querétaro", "GTM - San Luis P.", "Morelos"];

const COLS_EXTRA: { key: keyof IgfForecastRow | string; label: string }[] = [
  { key: "bancos_planta_kg", label: "Bancos Planta" },
  { key: "provision_planta_kg", label: "Prov. Planta" },
  { key: "util_oper_kg", label: "Util. Oper. ($/kg)" },
  { key: "deposito_importe", label: "Depósito" },
  { key: "cierre_importe", label: "Cierre" },
  { key: "util_oper_importe", label: "Util. Oper. (Importe)" },
  { key: "gtos_apoyos_corp_kg", label: "Gtos/Apoyos Corp" },
  { key: "bancos_corp_kg", label: "Bancos Corp." },
  { key: "otros_programas_kg", label: "Otros Programas" },
  { key: "inversiones_kg", label: "Inversiones" },
  { key: "resultado_final_kg", label: "Resultado ($/kg)" },
  { key: "resultado_final_importe", label: "Resultado (Importe)" },
];

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
  const [hgSaving, setHgSaving] = useState<string | null>(null);

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
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-600 bg-slate-800/80 text-[0.6em]">
                    <th className="text-left py-2.5 px-2 font-semibold text-slate-300 border-r border-slate-600">Empresa</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300 border-r border-slate-600">Venta (ton)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Margen ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Com. y Desc. ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Presupuesto ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Folios Aprob. Director ZP ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Folios en carro ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Impuesto ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">HG (%)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">HG ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Bancos Planta</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Prov. Planta</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300 border-r border-slate-600">Util. Oper. ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Depósito</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Cierre</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Util. Oper. (Importe)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Gtos/Apoyos Corp</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Bancos Corp.</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Otros Programas</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Inversiones</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Resultado ($/kg)</th>
                    <th className="text-right py-2.5 px-2 font-semibold text-slate-300">Resultado (Importe)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sorted = [...igfForecast.rows]
                      .filter((r) => !/^TOTALES?$/i.test(r.empresa?.trim() || ""))
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
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.presupuesto_kg ?? null)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.folios_aprob_zp_kg ?? null)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.folios_carro_kg ?? null)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.impuesto_kg)}</td>
                        <td className="py-2 px-2 text-right text-slate-300">
                          <input
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
                              setHgSaving(row.empresa || null);
                              try {
                                await patchIgfForecastHg(token, {
                                  year: igfForecast.year,
                                  month: igfForecast.month,
                                  empresa: row.empresa || "",
                                  hg_pct: v / 100,
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
                          const val = (row as Record<string, unknown>)[c.key] as number | null | undefined;
                          const isImporte = c.key === "resultado_final_importe" || c.key === "util_oper_importe" || c.key === "deposito_importe" || c.key === "cierre_importe";
                          const isNegativo = (c.key === "deposito_importe" || c.key === "cierre_importe") && val != null && Number(val) < 0;
                          return (
                            <td
                              key={c.key}
                              className={`py-2 px-2 text-right tabular-nums ${isNegativo ? "text-red-400" : "text-slate-300"} ${c.key === "util_oper_kg" ? "border-r border-slate-600" : ""}`}
                            >
                              {isImporte ? fmtNum(val ?? null, 0) : fmtNum(val ?? null)}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
                {igfForecast.totales && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-600 bg-slate-700/50">
                      <td className="py-3 px-2 text-base font-bold text-slate-100 border-r border-slate-600">Total</td>
                      <td className="py-3 px-2 text-right tabular-nums text-base font-bold text-slate-100 border-r border-slate-600">
                        {fmtNum(igfForecast.totales.venta_ton ?? null, 2)}
                      </td>
                      <td colSpan={10} className="py-3 px-2" />
                      <td className="py-3 px-2 border-r border-slate-600" />
                      <td className="py-3 px-2 text-right tabular-nums text-base font-bold text-red-400">
                        {fmtNum(igfForecast.totales.deposito_importe ?? null, 0)}
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums text-base font-bold text-red-400">
                        {fmtNum(igfForecast.totales.cierre_importe ?? null, 0)}
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums text-base font-bold text-slate-100">
                        {fmtNum(igfForecast.totales.util_oper_importe ?? null, 0)}
                      </td>
                      <td colSpan={4} className="py-3 px-2" />
                      <td className="py-3 px-2" />
                      <td className="py-3 px-2 text-right tabular-nums text-base font-bold text-slate-100">
                        {fmtNum(igfForecast.totales.resultado_final_importe ?? null, 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              {igfForecast.rows.length === 0 && (
                <p className="text-sm text-slate-500 py-4">No hay datos IGF para este mes.</p>
              )}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Próximamente: presupuesto, folios Carro/Depósito y botones por rol.
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
