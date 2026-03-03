"use client";

import { useEffect, useState } from "react";
import { fetchIgfVersiones, postIgfComoCambioDatos, postPresupuestoComparar, type IgfPeriodo, type IgfDeltaItem, type PresupuestoCompararResult } from "@/lib/api";

interface Props {
  token: string;
  plantas: { id: number; nombre: string }[];
  onClose: () => void;
}

interface Resultado {
  cabecera: string | null;
  deltas: IgfDeltaItem[];
  deltaCargo: number | null;
  deltaCorp: number | null;
  sinDatos: boolean;
  url: string;
  versionALabel?: string;
  versionBLabel?: string;
}

const MES_LABELS: Record<number, string> = {
  1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic",
};

export default function ComoCambioModal({ token, plantas, onClose }: Props) {
  const [periodos, setPeriodos] = useState<IgfPeriodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [presupuestoResultado, setPresupuestoResultado] = useState<PresupuestoCompararResult | null>(null);
  const [presupuestoLoading, setPresupuestoLoading] = useState(false);
  const [presupuestoError, setPresupuestoError] = useState<string | null>(null);

  const [planta, setPlanta] = useState("");
  const [yearA, setYearA] = useState<number | "">("");
  const [monthA, setMonthA] = useState<number | "">("");
  const [versionA, setVersionA] = useState<number | "">("");
  const [yearB, setYearB] = useState<number | "">("");
  const [monthB, setMonthB] = useState<number | "">("");
  const [versionB, setVersionB] = useState<number | "">("");

  useEffect(() => {
    fetchIgfVersiones(token)
      .then((r) => setPeriodos(r.periodos || []))
      .catch((e) => setError(e.message || "Error al cargar versiones"))
      .finally(() => setLoading(false));
  }, [token]);

  const versionesA = periodos.find((p) => p.year === yearA && p.month === monthA)?.versiones ?? [];
  const versionesB = periodos.find((p) => p.year === yearB && p.month === monthB)?.versiones ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = planta.trim();
    if (!p) {
      setError("Elige una planta");
      return;
    }
    const yA = Number(yearA); const mA = Number(monthA); const vA = Number(versionA);
    const yB = Number(yearB); const mB = Number(monthB); const vB = Number(versionB);
    if (!Number.isFinite(yA) || !Number.isFinite(mA) || !Number.isFinite(vA) ||
        !Number.isFinite(yB) || !Number.isFinite(mB) || !Number.isFinite(vB)) {
      setError("Elige mes y versión para A y B");
      return;
    }
    setError(null);
    setSubmitting(true);
    postIgfComoCambioDatos(token, {
      planta: p,
      yearA: yA, monthA: mA, versionA: vA,
      yearB: yB, monthB: mB, versionB: vB,
    })
      .then((r) => setResultado(r))
      .catch((e) => setError(e.message || "Error al obtener datos"))
      .finally(() => setSubmitting(false));
  };

  const handleCompararPresupuesto = () => {
    const p = planta.trim();
    if (!p || yearA === "" || monthA === "" || yearB === "" || monthB === "") return;
    const periodoA = `${yearA}-${String(monthA).padStart(2, "0")}`;
    const periodoB = `${yearB}-${String(monthB).padStart(2, "0")}`;
    setPresupuestoError(null);
    setPresupuestoResultado(null);
    setPresupuestoLoading(true);
    postPresupuestoComparar(token, { planta: p, periodoA, periodoB })
      .then(setPresupuestoResultado)
      .catch((e) => setPresupuestoError(e.message || "Error al comparar presupuesto"))
      .finally(() => setPresupuestoLoading(false));
  };

  const fmtMxn = (n: number) => (n != null && !isNaN(n) ? n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`w-full rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl ${resultado != null ? "max-w-6xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
          <h2 className="text-lg font-medium text-slate-200">Cómo cambió (IGF)</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {loading && <p className="py-4 text-center text-sm text-slate-400">Cargando versiones…</p>}
        {error && <p className="mb-2 rounded bg-red-900/40 px-2 py-1 text-sm text-red-200">{error}</p>}

        {resultado != null && (
          <div className="space-y-3">
            {resultado.sinDatos ? (
              <p className="rounded bg-amber-900/30 px-2 py-2 text-sm text-amber-200">No hay datos para esta comparación. Revisa planta y versiones.</p>
            ) : (
              <>
                {resultado.cabecera && (
                  <p className="whitespace-pre-line border-b border-slate-700 pb-2 text-sm font-medium text-slate-200">{resultado.cabecera}</p>
                )}
                <div className="max-h-80 overflow-y-auto overflow-x-auto rounded border border-slate-700 bg-slate-800/50 p-2">
                  <table className="w-full min-w-[32rem] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-600 text-slate-400">
                        <th className="py-1.5 pr-3">Concepto</th>
                        <th className="py-1.5 pr-3 whitespace-nowrap">{resultado.versionALabel ?? "Versión A"}</th>
                        <th className="py-1.5 pr-3 whitespace-nowrap">{resultado.versionBLabel ?? "Versión B"}</th>
                        <th className="py-1.5 pr-3">Dirección</th>
                        <th className="py-1.5">Delta / MXN</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {resultado.deltas.map((d, i) => (
                        <tr key={i} className="border-b border-slate-700/50">
                          <td className="py-1 pr-3">{d.label != null ? `Delta ${d.label}` : "—"}</td>
                          <td className="py-1 pr-3">{d.valorA ?? "—"}</td>
                          <td className="py-1 pr-3">{d.valorB ?? "—"}</td>
                          <td className="py-1 pr-3">{d.dir ?? "—"}</td>
                          <td className="py-1">{d.deltaStr ?? ""}{d.deltaMxn != null && d.deltaMxn !== "" ? ` (${d.deltaMxn} MXN)` : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {presupuestoError && (
              <p className="rounded bg-red-900/40 px-2 py-1 text-sm text-red-200">{presupuestoError}</p>
            )}
            {presupuestoResultado != null && (
              <div className="rounded border border-slate-600 bg-slate-800/50 p-3 text-sm">
                <p className="mb-2 font-medium text-slate-200">Comparar Presupuesto – {planta}</p>
                <div className="overflow-x-auto rounded border border-slate-700">
                  <table className="w-full min-w-[28rem] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-600 bg-slate-800/80 text-slate-400">
                        <th className="py-2 pr-3 pl-1 font-medium">Categoría</th>
                        <th className="py-2 pr-3 text-right font-medium">Periodo A</th>
                        <th className="py-2 pr-3 text-right font-medium">Periodo B</th>
                        <th className="py-2 pr-2 text-right font-medium">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {presupuestoResultado.porCategoria && presupuestoResultado.porCategoria.map((c, i) => (
                        <tr key={i} className="border-b border-slate-700/50">
                          <td className="py-1.5 pr-3 pl-1">{c.categoria}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">${fmtMxn(c.montoA)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">${fmtMxn(c.montoB)}</td>
                          <td className={`py-1.5 pr-2 text-right tabular-nums ${c.delta >= 0 ? "text-emerald-400/90" : "text-red-400/90"}`}>
                            {c.delta >= 0 ? "+" : ""}${fmtMxn(c.delta)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-600 bg-slate-800/60 font-medium text-slate-200">
                        <td className="py-2 pr-3 pl-1">TOTAL</td>
                        <td className="py-2 pr-3 text-right tabular-nums">${fmtMxn(presupuestoResultado.totalA)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">${fmtMxn(presupuestoResultado.totalB)}</td>
                        <td className={`py-2 pr-2 text-right tabular-nums ${presupuestoResultado.delta >= 0 ? "text-emerald-400/90" : "text-red-400/90"}`}>
                          {presupuestoResultado.delta >= 0 ? "+" : ""}${fmtMxn(presupuestoResultado.delta)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {resultado.url && (
                <a
                  href={resultado.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-green-700/80 px-3 py-1.5 text-sm text-white hover:bg-green-600"
                >
                  Descargar Excel
                </a>
              )}
              <button
                type="button"
                onClick={handleCompararPresupuesto}
                disabled={presupuestoLoading || !planta.trim()}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {presupuestoLoading ? "…" : "Comparar Presupuesto"}
              </button>
              <button
                type="button"
                onClick={() => { setResultado(null); setPresupuestoResultado(null); setPresupuestoError(null); }}
                className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
              >
                Nueva comparación
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded bg-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {!loading && resultado == null && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400">Planta</label>
              <select
                value={planta}
                onChange={(e) => setPlanta(e.target.value)}
                className="mt-0.5 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200"
              >
                <option value="">— Elegir planta —</option>
                {plantas.map((p) => (
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-400">Versión A (base)</label>
                <div className="mt-0.5 flex gap-1">
                  <select
                    value={yearA && monthA ? `${yearA}-${monthA}` : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) {
                        const [y, m] = v.split("-").map(Number);
                        setYearA(y); setMonthA(m); setVersionA("");
                      } else {
                        setYearA(""); setMonthA(""); setVersionA("");
                      }
                    }}
                    className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200"
                  >
                    <option value="">Mes</option>
                    {periodos.map((per) => (
                      <option key={`${per.year}-${per.month}`} value={`${per.year}-${per.month}`}>
                        {per.year} {MES_LABELS[per.month] ?? per.month}
                      </option>
                    ))}
                  </select>
                  <select
                    value={versionA}
                    onChange={(e) => setVersionA(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-16 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200"
                    title="Versión"
                  >
                    <option value="">v</option>
                    {versionesA.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400">Versión B (a comparar)</label>
                <div className="mt-0.5 flex gap-1">
                  <select
                    value={yearB && monthB ? `${yearB}-${monthB}` : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) {
                        const [y, m] = v.split("-").map(Number);
                        setYearB(y); setMonthB(m); setVersionB("");
                      } else {
                        setYearB(""); setMonthB(""); setVersionB("");
                      }
                    }}
                    className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200"
                  >
                    <option value="">Mes</option>
                    {periodos.map((per) => (
                      <option key={`${per.year}-${per.month}`} value={`${per.year}-${per.month}`}>
                        {per.year} {MES_LABELS[per.month] ?? per.month}
                      </option>
                    ))}
                  </select>
                  <select
                    value={versionB}
                    onChange={(e) => setVersionB(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-16 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200"
                    title="Versión"
                  >
                    <option value="">v</option>
                    {versionesB.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Los deltas se muestran aquí y puedes descargar el Excel.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {submitting ? "…" : "Ver deltas"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
