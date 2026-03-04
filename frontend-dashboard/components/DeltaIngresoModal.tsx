"use client";

import { useEffect, useState } from "react";
import { fetchDeltaIngresoPeriodos, postDeltaIngresoDatos, type DeltaIngresoDatosResult } from "@/lib/api";

interface Props {
  token: string;
  plantas: { id: number; nombre: string }[];
  onClose: () => void;
}

type Step = "planta" | "periodos" | "resultado";

export default function DeltaIngresoModal({ token, plantas, onClose }: Props) {
  const [step, setStep] = useState<Step>("planta");
  const [planta, setPlanta] = useState("");
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodosLoading, setPeriodosLoading] = useState(false);
  const [periodoA, setPeriodoA] = useState("");
  const [periodoB, setPeriodoB] = useState("");
  const [sinRegla8020, setSinRegla8020] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeltaIngresoDatosResult | null>(null);

  useEffect(() => {
    if (step !== "periodos" || !planta.trim()) return;
    setPeriodosLoading(true);
    setPeriodos([]);
    setPeriodoA("");
    setPeriodoB("");
    setError(null);
    fetchDeltaIngresoPeriodos(token, planta.trim())
      .then((r) => setPeriodos(r.periodos || []))
      .catch((e) => setError(e.message || "Error al cargar periodos"))
      .finally(() => setPeriodosLoading(false));
  }, [token, planta, step]);

  const handlePlantaNext = () => {
    if (!planta.trim()) return;
    setError(null);
    setStep("periodos");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planta.trim() || !periodoA || !periodoB || periodoA === periodoB) return;
    setError(null);
    setLoading(true);
    postDeltaIngresoDatos(token, { planta: planta.trim(), periodoA, periodoB, sinRegla8020 })
      .then((r) => {
        setResult(r);
        setStep("resultado");
      })
      .catch((e) => setError(e.message || "Error al obtener Delta Ingreso"))
      .finally(() => setLoading(false));
  };

  const handleToggleRegla = () => {
    if (!planta.trim() || !periodoA || !periodoB || periodoA === periodoB || !token) return;
    const next = !sinRegla8020;
    setSinRegla8020(next);
    setError(null);
    setLoading(true);
    postDeltaIngresoDatos(token, { planta: planta.trim(), periodoA, periodoB, sinRegla8020: next })
      .then((r) => {
        setResult(r);
        setStep("resultado");
      })
      .catch((e) => setError(e.message || "Error al obtener Delta Ingreso"))
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`w-full rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl ${result ? "max-w-6xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
          <h2 className="text-lg font-medium text-slate-200">Delta Ingreso</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {error && <p className="mb-2 rounded bg-red-900/40 px-2 py-1 text-sm text-red-200">{error}</p>}

        {step === "planta" && (
          <div className="space-y-3">
            <label className="block text-xs text-slate-400">Planta</label>
            <select
              value={planta}
              onChange={(e) => setPlanta(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200"
            >
              <option value="">— Elegir planta —</option>
              {plantas.map((p) => (
                <option key={p.id} value={p.nombre}>{p.nombre}</option>
              ))}
            </select>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">Cancelar</button>
              <button type="button" onClick={handlePlantaNext} disabled={!planta.trim()} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        )}

        {step === "periodos" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">Planta: <strong>{planta}</strong>. Elige periodos.</p>
            {periodosLoading && <p className="text-sm text-slate-400">Cargando periodos…</p>}
            {!periodosLoading && periodos.length > 0 && (
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400">Periodo referencia (A)</label>
                    <select
                      value={periodoA}
                      onChange={(e) => setPeriodoA(e.target.value)}
                      className="mt-0.5 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200"
                    >
                      <option value="">— Elegir —</option>
                      {periodos.map((per) => (
                        <option key={per} value={per}>{per}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400">Periodo a comparar (B)</label>
                    <select
                      value={periodoB}
                      onChange={(e) => setPeriodoB(e.target.value)}
                      className="mt-0.5 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200"
                    >
                      <option value="">— Elegir —</option>
                      {periodos.filter((p) => p !== periodoA).map((per) => (
                        <option key={per} value={per}>{per}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setStep("planta")} className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">Volver</button>
                  <button type="submit" disabled={loading || !periodoA || !periodoB || periodoA === periodoB} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50">{loading ? "…" : "Ver Delta Ingreso"}</button>
                </div>
              </form>
            )}
            {!periodosLoading && periodos.length === 0 && !error && <p className="text-sm text-slate-400">No hay periodos de venta para esta planta.</p>}
          </div>
        )}

        {step === "resultado" && result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <p className="text-sm font-medium text-slate-200">Delta Ingreso – {result.planta} · {result.periodoA} → {result.periodoB}{result.margenAStr && result.margenBStr ? ` · Margen A: ${result.margenAStr} · Margen B: ${result.margenBStr}` : ""}</p>
              <button
                type="button"
                onClick={handleToggleRegla}
                disabled={loading}
                className="rounded border border-slate-500 px-2.5 py-1 text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-50"
              >
                {sinRegla8020 ? "Ver top 20% (80/20)" : "Ver todos los clientes"}
              </button>
            </div>
            {result.totalTonAGeneralStr != null && result.totalTonBGeneralStr != null && (
              <p className="rounded bg-slate-800/80 px-2 py-1.5 text-sm font-medium text-slate-200">Total general (ton): A = {result.totalTonAGeneralStr} · B = {result.totalTonBGeneralStr}</p>
            )}
            <div className="max-h-[70vh] space-y-4 overflow-y-auto">
              <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
                <p className="mb-1.5 text-xs font-medium text-slate-300">Clientes que dejaron de generar ingreso · Total A: {result.dejaron.totalDeltaIngresoStr}{result.dejaron.totalTonAStr != null ? ` · Suma ton: A = ${result.dejaron.totalTonAStr} · B = ${result.dejaron.totalTonBStr}` : ""}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[48rem] text-left text-xs">
                    <thead><tr className="border-b border-slate-600 text-slate-400"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">Cliente</th><th className="py-1 pr-2 text-right">A (MXN)</th><th className="py-1 pr-2 text-right">A venta (ton)</th><th className="py-1 pr-2 text-right">A margen $/kg</th><th className="py-1 pr-2 text-right">A desc $/kg</th><th className="py-1 text-right">B (MXN)</th></tr></thead>
                    <tbody className="text-slate-300">
                      {result.dejaron.clientes.map((c, i) => (
                        <tr key={i} className="border-b border-slate-700/50"><td className="py-1 pr-2">{i + 1}</td><td className="py-1 pr-2">{c.cliente}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ingresoAStr}</td><td className="py-1 pr-2 text-right tabular-nums">{c.kgAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.margenAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.descKgAStr ?? "—"}</td><td className="py-1 text-right tabular-nums">$0</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
                <p className="mb-1.5 text-xs font-medium text-slate-300">Clientes con más ingreso en B · Delta total: +{result.mas.totalDeltaIngresoStr}{result.mas.totalTonAStr != null ? ` · Suma ton: A = ${result.mas.totalTonAStr} · B = ${result.mas.totalTonBStr}` : ""}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[56rem] text-left text-xs">
                    <thead><tr className="border-b border-slate-600 text-slate-400"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">Cliente</th><th className="py-1 pr-2 text-right">A (MXN)</th><th className="py-1 pr-2 text-right">A venta (ton)</th><th className="py-1 pr-2 text-right">A margen</th><th className="py-1 pr-2 text-right">A desc $/kg</th><th className="py-1 pr-2 text-right">B (MXN)</th><th className="py-1 pr-2 text-right">B venta (ton)</th><th className="py-1 pr-2 text-right">B margen</th><th className="py-1 pr-2 text-right">B desc $/kg</th><th className="py-1 text-right">Delta (MXN)</th></tr></thead>
                    <tbody className="text-slate-300">
                      {result.mas.clientes.map((c, i) => (
                        <tr key={i} className="border-b border-slate-700/50"><td className="py-1 pr-2">{i + 1}</td><td className="py-1 pr-2">{c.cliente}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ingresoAStr}</td><td className="py-1 pr-2 text-right tabular-nums">{c.kgAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.margenAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.descKgAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ingresoBStr}</td><td className="py-1 pr-2 text-right tabular-nums">{c.kgBStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.margenBStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.descKgBStr ?? "—"}</td><td className="py-1 text-right tabular-nums text-emerald-400/90">+{c.deltaIngresoStr}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
                <p className="mb-1.5 text-xs font-medium text-slate-300">Clientes que disminuyeron su ingreso · Delta total: -{result.disminuyeron.totalDeltaIngresoStr}{result.disminuyeron.totalTonAStr != null ? ` · Suma ton: A = ${result.disminuyeron.totalTonAStr} · B = ${result.disminuyeron.totalTonBStr}` : ""}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[56rem] text-left text-xs">
                    <thead><tr className="border-b border-slate-600 text-slate-400"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">Cliente</th><th className="py-1 pr-2 text-right">A (MXN)</th><th className="py-1 pr-2 text-right">A venta (ton)</th><th className="py-1 pr-2 text-right">A margen</th><th className="py-1 pr-2 text-right">A desc $/kg</th><th className="py-1 pr-2 text-right">B (MXN)</th><th className="py-1 pr-2 text-right">B venta (ton)</th><th className="py-1 pr-2 text-right">B margen</th><th className="py-1 pr-2 text-right">B desc $/kg</th><th className="py-1 text-right">Delta (MXN)</th></tr></thead>
                    <tbody className="text-slate-300">
                      {result.disminuyeron.clientes.map((c, i) => (
                        <tr key={i} className="border-b border-slate-700/50"><td className="py-1 pr-2">{i + 1}</td><td className="py-1 pr-2">{c.cliente}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ingresoAStr}</td><td className="py-1 pr-2 text-right tabular-nums">{c.kgAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.margenAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.descKgAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ingresoBStr}</td><td className="py-1 pr-2 text-right tabular-nums">{c.kgBStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.margenBStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.descKgBStr ?? "—"}</td><td className="py-1 text-right tabular-nums text-red-400/90">{c.deltaIngresoStr}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
                <p className="mb-1.5 text-xs font-medium text-slate-300">Clientes nuevos (compraron en B, no en A) · Total B: +{result.clientesNuevos.totalDeltaIngresoStr}{result.clientesNuevos.totalTonAStr != null ? ` · Suma ton: A = ${result.clientesNuevos.totalTonAStr} · B = ${result.clientesNuevos.totalTonBStr}` : ""}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[56rem] text-left text-xs">
                    <thead><tr className="border-b border-slate-600 text-slate-400"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">Cliente</th><th className="py-1 pr-2 text-right">A (MXN)</th><th className="py-1 pr-2 text-right">A venta (ton)</th><th className="py-1 pr-2 text-right">A margen</th><th className="py-1 pr-2 text-right">A desc $/kg</th><th className="py-1 pr-2 text-right">B (MXN)</th><th className="py-1 pr-2 text-right">B venta (ton)</th><th className="py-1 pr-2 text-right">B margen</th><th className="py-1 pr-2 text-right">B desc $/kg</th><th className="py-1 text-right">Delta (MXN)</th></tr></thead>
                    <tbody className="text-slate-300">
                      {result.clientesNuevos.clientes.map((c, i) => (
                        <tr key={i} className="border-b border-slate-700/50"><td className="py-1 pr-2">{i + 1}</td><td className="py-1 pr-2">{c.cliente}</td><td className="py-1 pr-2 text-right tabular-nums">$0</td><td className="py-1 pr-2 text-right tabular-nums">0.0</td><td className="py-1 pr-2 text-right tabular-nums">{c.margenAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">—</td><td className="py-1 pr-2 text-right tabular-nums">{c.ingresoBStr}</td><td className="py-1 pr-2 text-right tabular-nums">{c.kgBStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.margenBStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.descKgBStr ?? "—"}</td><td className="py-1 text-right tabular-nums text-emerald-400/90">+{c.deltaIngresoStr}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
                <p className="mb-1.5 text-xs font-medium text-slate-300">Otros clientes (resto; suma de las 5 listas = total) · Delta: {result.otrosClientes.totalDeltaIngresoStr}{result.otrosClientes.totalTonAStr != null ? ` · Suma ton: A = ${result.otrosClientes.totalTonAStr} · B = ${result.otrosClientes.totalTonBStr}` : ""}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[56rem] text-left text-xs">
                    <thead><tr className="border-b border-slate-600 text-slate-400"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">Cliente</th><th className="py-1 pr-2 text-right">A (MXN)</th><th className="py-1 pr-2 text-right">A venta (ton)</th><th className="py-1 pr-2 text-right">A margen</th><th className="py-1 pr-2 text-right">A desc $/kg</th><th className="py-1 pr-2 text-right">B (MXN)</th><th className="py-1 pr-2 text-right">B venta (ton)</th><th className="py-1 pr-2 text-right">B margen</th><th className="py-1 pr-2 text-right">B desc $/kg</th><th className="py-1 text-right">Delta (MXN)</th></tr></thead>
                    <tbody className="text-slate-300">
                      {result.otrosClientes.clientes.map((c, i) => (
                        <tr key={i} className="border-b border-slate-700/50"><td className="py-1 pr-2">{i + 1}</td><td className="py-1 pr-2">{c.cliente}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ingresoAStr}</td><td className="py-1 pr-2 text-right tabular-nums">{c.kgAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.margenAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.descKgAStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ingresoBStr}</td><td className="py-1 pr-2 text-right tabular-nums">{c.kgBStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.margenBStr ?? "—"}</td><td className="py-1 pr-2 text-right tabular-nums">{c.descKgBStr ?? "—"}</td><td className="py-1 text-right tabular-nums">{c.deltaIngresoStr}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <button type="button" onClick={() => { setStep("periodos"); setResult(null); }} className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 mr-2">Otra comparación</button>
              <button type="button" onClick={onClose} className="rounded bg-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-500">Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
