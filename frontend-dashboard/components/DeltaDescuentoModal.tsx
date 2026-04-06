"use client";

import { useEffect, useState } from "react";
import {
  fetchDeltaDescuentoPeriodos,
  postDeltaDescuentoDatos,
  postWeeklyDiscountLectura,
  type DeltaDescuentoDatosResult,
  type WeeklyDiscountLecturaResult,
} from "@/lib/api";

interface Props {
  token: string;
  plantas: { id: number; nombre: string }[];
  onClose: () => void;
}

type Step = "planta" | "periodos" | "resultado";

export default function DeltaDescuentoModal({ token, plantas, onClose }: Props) {
  const [step, setStep] = useState<Step>("planta");
  const [planta, setPlanta] = useState("");
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodosLoading, setPeriodosLoading] = useState(false);
  const [periodoA, setPeriodoA] = useState("");
  const [periodoB, setPeriodoB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeltaDescuentoDatosResult | null>(null);
  const [lecturaLoading, setLecturaLoading] = useState(false);
  const [lectura, setLectura] = useState<WeeklyDiscountLecturaResult | null>(null);

  useEffect(() => {
    setLectura(null);
  }, [planta]);

  useEffect(() => {
    if (step !== "periodos" || !planta.trim()) return;
    setPeriodosLoading(true);
    setPeriodos([]);
    setPeriodoA("");
    setPeriodoB("");
    setError(null);
    fetchDeltaDescuentoPeriodos(token, planta.trim())
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
    postDeltaDescuentoDatos(token, { planta: planta.trim(), periodoA, periodoB })
      .then((r) => {
        setResult(r);
        setStep("resultado");
      })
      .catch((e) => setError(e.message || "Error al obtener Delta Descuento"))
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`w-full rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl ${result || lectura ? "max-w-6xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
          <h2 className="text-lg font-medium text-slate-200">Delta Descuento</h2>
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
            <div className="mt-4 rounded border border-slate-700 bg-slate-800/40 p-3">
              <p className="mb-2 text-xs font-medium text-slate-300">Lectura semanal de descuento (LD)</p>
              <p className="mb-2 text-xs text-slate-400">Vista previa del mensaje tipo WhatsApp (misma lógica que el comando LD y el envío automático los lunes).</p>
              <button
                type="button"
                disabled={!planta.trim() || lecturaLoading}
                onClick={() => {
                  if (!planta.trim()) return;
                  setError(null);
                  setLecturaLoading(true);
                  setLectura(null);
                  postWeeklyDiscountLectura(token, { planta: planta.trim() })
                    .then(setLectura)
                    .catch((e) => setError(e.message || "Error al generar lectura"))
                    .finally(() => setLecturaLoading(false));
                }}
                className="rounded bg-emerald-700 px-3 py-1.5 text-sm text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {lecturaLoading ? "Generando…" : "Generar lectura semanal"}
              </button>
              {lectura && (
                <div className="mt-3 space-y-2 text-xs">
                  <p className="text-slate-400">Corte: {lectura.fecha_corte}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded border border-slate-600/80 bg-slate-900/80 p-2">
                      <p className="text-slate-500">$/kg mes anterior</p>
                      <p className="tabular-nums text-slate-200">
                        {lectura.descuento_kg_mes_anterior != null ? `${lectura.descuento_kg_mes_anterior.toFixed(2)}` : "—"}
                      </p>
                    </div>
                    <div className="rounded border border-slate-600/80 bg-slate-900/80 p-2">
                      <p className="text-slate-500">$/kg acumulado</p>
                      <p className="tabular-nums text-slate-200">
                        {lectura.descuento_kg_actual != null ? `${lectura.descuento_kg_actual.toFixed(2)}` : "—"}
                      </p>
                    </div>
                    <div className="rounded border border-slate-600/80 bg-slate-900/80 p-2">
                      <p className="text-slate-500">$/kg proyectado</p>
                      <p className="tabular-nums text-slate-200">
                        {lectura.descuento_kg_proyectado != null ? `${lectura.descuento_kg_proyectado.toFixed(2)}` : "—"}
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-400">
                    Impacto negativo:{" "}
                    <span className="text-slate-200">{lectura.cliente_mayor_impacto_negativo?.cliente || "—"}</span>
                  </p>
                  <p className="text-slate-400">
                    Impacto positivo:{" "}
                    <span className="text-slate-200">{lectura.cliente_mayor_impacto_positivo?.cliente || "—"}</span>
                  </p>
                  {lectura.factores_principales && lectura.factores_principales.length > 0 && (
                    <ul className="list-inside list-disc text-slate-400">
                      {lectura.factores_principales.slice(0, 3).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                  <label className="block text-slate-500">Vista previa WhatsApp</label>
                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded border border-slate-600 bg-slate-950 p-2 text-slate-200">{lectura.narrativa_whatsapp}</pre>
                </div>
              )}
            </div>
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
                  <button type="submit" disabled={loading || !periodoA || !periodoB || periodoA === periodoB} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50">{loading ? "…" : "Ver Delta Descuento"}</button>
                </div>
              </form>
            )}
            {!periodosLoading && periodos.length === 0 && !error && <p className="text-sm text-slate-400">No hay periodos de descuento para esta planta.</p>}
          </div>
        )}

        {step === "resultado" && result && (
          <div className="space-y-3">
            <p className="border-b border-slate-700 pb-2 text-sm font-medium text-slate-200">Delta Descuento ($/kg) – {result.planta} · {result.periodoA} → {result.periodoB}</p>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto">
              <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
                <p className="mb-1.5 text-xs font-medium text-slate-300">Clientes que dejaron de tener descuento · Promedio A: {result.dejaron.totalDeltaRatioStr}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[24rem] text-left text-xs">
                    <thead><tr className="border-b border-slate-600 text-slate-400"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">Cliente</th><th className="py-1 pr-2 text-right">A ($/kg)</th><th className="py-1 text-right">B ($/kg)</th></tr></thead>
                    <tbody className="text-slate-300">
                      {result.dejaron.clientes.map((c, i) => (
                        <tr key={i} className="border-b border-slate-700/50"><td className="py-1 pr-2">{i + 1}</td><td className="py-1 pr-2">{c.cliente}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ratioAStr}</td><td className="py-1 text-right tabular-nums">0.00 $/kg</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
                <p className="mb-1.5 text-xs font-medium text-slate-300">Clientes con más descuento por kg en B · Promedio delta: {result.mas.totalDeltaRatioStr}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-left text-xs">
                    <thead><tr className="border-b border-slate-600 text-slate-400"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">Cliente</th><th className="py-1 pr-2 text-right">A ($/kg)</th><th className="py-1 pr-2 text-right">B ($/kg)</th><th className="py-1 text-right">Delta ($/kg)</th></tr></thead>
                    <tbody className="text-slate-300">
                      {result.mas.clientes.map((c, i) => (
                        <tr key={i} className="border-b border-slate-700/50"><td className="py-1 pr-2">{i + 1}</td><td className="py-1 pr-2">{c.cliente}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ratioAStr}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ratioBStr}</td><td className="py-1 text-right tabular-nums text-emerald-400/90">{c.deltaRatioStr}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
                <p className="mb-1.5 text-xs font-medium text-slate-300">Clientes que disminuyeron descuento por kg · Promedio delta: {result.disminuyeron.totalDeltaRatioStr}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-left text-xs">
                    <thead><tr className="border-b border-slate-600 text-slate-400"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">Cliente</th><th className="py-1 pr-2 text-right">A ($/kg)</th><th className="py-1 pr-2 text-right">B ($/kg)</th><th className="py-1 text-right">Delta ($/kg)</th></tr></thead>
                    <tbody className="text-slate-300">
                      {result.disminuyeron.clientes.map((c, i) => (
                        <tr key={i} className="border-b border-slate-700/50"><td className="py-1 pr-2">{i + 1}</td><td className="py-1 pr-2">{c.cliente}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ratioAStr}</td><td className="py-1 pr-2 text-right tabular-nums">{c.ratioBStr}</td><td className="py-1 text-right tabular-nums text-red-400/90">{c.deltaRatioStr}</td></tr>
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
