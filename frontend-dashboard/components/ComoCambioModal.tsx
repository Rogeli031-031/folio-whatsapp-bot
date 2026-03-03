"use client";

import { useEffect, useState } from "react";
import { fetchIgfVersiones, postIgfComoCambioToken, type IgfPeriodo } from "@/lib/api";

interface Props {
  token: string;
  plantas: { id: number; nombre: string }[];
  onClose: () => void;
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
    postIgfComoCambioToken(token, {
      planta: p,
      yearA: yA, monthA: mA, versionA: vA,
      yearB: yB, monthB: mB, versionB: vB,
    })
      .then((r) => {
        if (r.url) window.open(r.url, "_blank");
        onClose();
      })
      .catch((e) => setError(e.message || "Error al generar enlace"))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl"
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

        {!loading && (
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
              Se abrirá la descarga del Excel con los deltas (igual que el comando en WhatsApp).
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
                {submitting ? "…" : "Ver deltas / Excel"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
