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

function normalizeEmpresa(s: string): string {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findRowByPlanta(rows: IgfForecastRow[], planta: string): IgfForecastRow | undefined {
  const norm = normalizeEmpresa(planta);
  const exact = rows.find((r) => (r.empresa?.trim() || "") === planta);
  if (exact) return exact;
  const normMatch = rows.find((r) => normalizeEmpresa(r.empresa || "") === norm);
  if (normMatch) return normMatch;
  const suffix = (planta.split(" - ").pop() || planta).trim();
  const normSuffix = normalizeEmpresa(suffix);
  if (!normSuffix) return undefined;
  const bySuffix = rows.find((r) => normalizeEmpresa(r.empresa || "") === normSuffix);
  if (bySuffix) return bySuffix;
  const byContains = rows.find((r) => {
    const rn = normalizeEmpresa(r.empresa || "");
    return rn.indexOf(normSuffix) >= 0 || normSuffix.indexOf(rn) >= 0;
  });
  if (byContains) return byContains;
  if (normSuffix.indexOf("san luis") >= 0) {
    return rows.find((r) => {
      const rn = normalizeEmpresa(r.empresa || "");
      return rn.indexOf("san luis") >= 0;
    });
  }
  return undefined;
}

function KpiContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [igfForecast, setIgfForecast] = useState<IgfForecastResponse | null>(null);
  const [igfLoading, setIgfLoading] = useState(false);
  const [igfError, setIgfError] = useState<string | null>(null);
  const [hgSaving, setHgSaving] = useState<string | null>(null);
  const [plantaFilter, setPlantaFilter] = useState<string>("");
  const [igfMesAnterior, setIgfMesAnterior] = useState<IgfForecastResponse | null>(null);
  const [igfMesAnteriorLoading, setIgfMesAnteriorLoading] = useState(false);

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

    let cancelled = false;
    let fetching = false;

    const load = async () => {
      if (fetching || !token || cancelled) return;
      fetching = true;
      if (!igfForecast) setIgfLoading(true);
      setIgfError(null);
      try {
        const data = await fetchIgfForecast(token);
        if (!cancelled) {
          setIgfForecast(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setIgfError(e?.message || "Error al cargar IGF Forecast");
        }
      } finally {
        fetching = false;
        if (!cancelled && !igfForecast) {
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
  }, [token]);

  useEffect(() => {
    if (!token || !igfForecast || !plantaFilter) {
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
  }, [token, plantaFilter, igfForecast?.year, igfForecast?.month]);

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
                          <td className={`py-2 px-2 text-right tabular-nums ${row.gasto_kg != null && Number(row.gasto_kg) < 0 ? "text-red-400" : "text-slate-300"}`}>
                            {fmtNum(row.gasto_kg ?? null)}
                          </td>
                        ) : (
                          <>
                            <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.presupuesto_kg ?? null)}</td>
                            <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.folios_aprob_zp_kg ?? null)}</td>
                            <td className="py-2 px-2 text-right tabular-nums text-slate-300">{fmtNum(row.folios_carro_kg ?? null)}</td>
                            <td className={`py-2 px-2 text-right tabular-nums ${row.deposito_cierre_kg != null && Number(row.deposito_cierre_kg) < 0 ? "text-red-400" : "text-slate-300"}`}>
                              {fmtNum(row.deposito_cierre_kg ?? null)}
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
                          const val = (row as Record<string, unknown>)[c.key] as number | null | undefined;
                          const isImporte = c.key === "resultado_final_importe" || c.key === "util_oper_importe";
                          return (
                            <td
                              key={c.key}
                              className={`py-2 px-2 text-right tabular-nums text-slate-300 ${c.key === "util_oper_kg" ? "border-r border-slate-600" : ""}`}
                            >
                              {isImporte ? fmtNum(val ?? null, 0) : fmtNum(val ?? null)}
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
              const n = (v: number | null | undefined) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : 0);
              const delta = (a: number | null | undefined, b: number | null | undefined) => n(a) - n(b);
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
              // Util. Oper. ($/kg) = suma de las 7 líneas (Margen, Com.Desc, Gasto, Impuesto, HG $/kg, Bancos Planta, Prov. Planta). HG% no se suma.
              const calcUtilOperKg = (row: IgfForecastRow | undefined): number => {
                if (!row) return 0;
                const r = row as Record<string, unknown>;
                const num = (x: unknown) => n(x as number | null | undefined);
                return num(r.margen_kg) + num(r.com_desc_kg) + num(r.gasto_kg) + num(r.impuesto_kg) + num(r.hg_kg) + num(r.bancos_planta_kg) + num(r.provision_planta_kg);
              };
              const cellVal = (row: IgfForecastRow | undefined, c: Col) => {
                if (!row) return "—";
                if (c.key === "empresa") return row.empresa ?? "—";
                if (row === rowA && (c.key === "util_oper_kg" || c.key === "util_oper_importe")) {
                  const utilKg = calcUtilOperKg(row);
                  if (c.key === "util_oper_kg") return fmtNum(utilKg);
                  return fmtNum(utilKg * n((row as Record<string, unknown>).venta_ton as number | null | undefined) * 1000, 0);
                }
                const v = (row as Record<string, unknown>)[c.key];
                if (c.isPct && v != null) return (Number(v) * 100).toFixed(1);
                return fmtNum(v as number | null ?? null, c.key.includes("importe") || c.key === "util_oper_importe" || c.key === "resultado_final_importe" ? 0 : 2);
              };
              const utilOperKgA = rowA ? calcUtilOperKg(rowA) : 0;
              const utilOperImporteA = rowA ? utilOperKgA * n((rowA as Record<string, unknown>).venta_ton as number | null | undefined) * 1000 : 0;
              const cellDeltaNum = (c: Col): number | null => {
                if (c.key === "empresa" || !rowA) return null;
                const vF = (rowF as Record<string, unknown>)[c.key] as number | null | undefined;
                const vA = c.key === "util_oper_kg" ? utilOperKgA : c.key === "util_oper_importe" ? utilOperImporteA : (rowA as Record<string, unknown>)[c.key] as number | null | undefined;
                return c.isPct ? (n(vF) - n(vA)) * 100 : delta(vF, vA);
              };
              const ventaKgA = rowA ? n((rowA as Record<string, unknown>).venta_ton as number | null | undefined) * 1000 : 0;
              const ventaKgF = n((rowF as Record<string, unknown>).venta_ton as number | null | undefined) * 1000;
              // Impacto (Importe): fórmula Excel (COL_fila2*$B$2)-(COL_fila3*$B$3) = (valor_forecast*venta_kg_forecast) - (valor_mes_anterior*venta_kg_mes_anterior) para Gtos/Apoyos Corp, Bancos Corp., Otros Programas, Inversiones.
              const cellImpacto = (c: Col): number | null => {
                if (c.key === "empresa" || !rowA) return null;
                if (c.key === "hg_pct") return null;
                if (c.key === "util_oper_kg") return null;
                const vF = (rowF as Record<string, unknown>)[c.key] as number | null | undefined;
                const vA = (rowA as Record<string, unknown>)[c.key] as number | null | undefined;
                if (c.key === "venta_ton") {
                  const utilOperF = n((rowF as Record<string, unknown>).util_oper_kg as number | null | undefined);
                  return (ventaKgF - ventaKgA) * utilOperF;
                }
                if (c.key === "com_desc_kg") return (n(vF) - n(vA)) * ventaKgA;
                if (c.key === "gasto_kg") return (n(vF) - n(vA)) * ventaKgA;
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
                        {cols.map((c) => (
                          <th key={c.key} className={c.key === "empresa" ? "text-left py-2 px-2 font-semibold text-slate-300 border-r border-slate-600" : "text-right py-2 px-2 font-semibold text-slate-300"}>
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-600 bg-slate-800/40">
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-amber-200 border-r border-slate-600">IGF Forecast</td>
                        {cols.slice(1).map((c) => (
                          <td key={c.key} className="py-2 px-2 text-right tabular-nums text-slate-300">
                            {cellVal(rowF, c)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-600 bg-slate-800/40">
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-slate-300 border-r border-slate-600">IGF mes anterior</td>
                        {cols.slice(1).map((c) => (
                          <td key={c.key} className="py-2 px-2 text-right tabular-nums text-slate-300">
                            {cellVal(rowA, c)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-t-2 border-slate-500 bg-slate-700/50">
                        <td className="py-2 px-2 text-[0.6em] font-semibold text-slate-200 border-r border-slate-600">Cambio</td>
                        {cols.slice(1).map((c) => {
                          const d = cellDeltaNum(c);
                          const hasDelta = d !== null;
                          return (
                            <td key={c.key} className={`py-2 px-2 text-right tabular-nums ${hasDelta && d! > 0 ? "text-green-400" : hasDelta && d! < 0 ? "text-red-400" : "text-slate-400"}`}>
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
                          return (
                            <td key={c.key} className={`py-2 px-2 text-right tabular-nums ${hasImp && imp! > 0 ? "text-green-400" : hasImp && imp! < 0 ? "text-red-400" : "text-slate-400"}`}>
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
        <div className="mt-4 flex flex-wrap gap-3 flex-shrink-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Ver dashboard de folios
          </Link>
        </div>
        {plantaFilter ? <div className="flex-1 min-h-[35vh] mt-6" aria-hidden /> : null}
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
