"use client";

import { useEffect, useState } from "react";
import { fetchAnalisisDuplicados, type DuplicadoPair } from "@/lib/api";

interface Props {
  open: boolean;
  token: string;
  plantaId: number;
  plantaNombre: string;
  onClose: () => void;
  onOpenFolio?: (id: number) => void;
}

function fmtMxn(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

function pct(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export default function AnalisisDuplicadosModal({
  open,
  token,
  plantaId,
  plantaNombre,
  onClose,
  onOpenFolio,
}: Props) {
  const [meses, setMeses] = useState(6);
  const [umbral, setUmbral] = useState(0.72);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<DuplicadoPair[]>([]);
  const [meta, setMeta] = useState<{ desde: string; scanned: number; truncated: boolean } | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAnalisisDuplicados(token, {
        planta_id: plantaId,
        meses,
        umbral,
      });
      setPairs(res.pairs || []);
      setMeta({ desde: res.desde, scanned: res.scanned, truncated: !!res.truncated });
    } catch (e) {
      setPairs([]);
      setMeta(null);
      setError((e as Error).message || "Error al analizar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setPairs([]);
    setMeta(null);
    setError(null);
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir / cambiar planta
  }, [open, plantaId, token]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-slate-600 bg-slate-900 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-700 p-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Análisis de duplicados</h2>
            <p className="mt-0.5 text-sm text-slate-400">{plantaNombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Cerrar
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-700 p-4">
          <label className="text-xs text-slate-400">
            Desde (creación)
            <select
              value={meses}
              onChange={(e) => setMeses(parseInt(e.target.value, 10))}
              className="mt-1 block rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
            >
              <option value={3}>Últimos 3 meses</option>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Últimos 12 meses</option>
              <option value={24}>Últimos 24 meses</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Similitud mínima
            <select
              value={String(umbral)}
              onChange={(e) => setUmbral(parseFloat(e.target.value))}
              className="mt-1 block rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
            >
              <option value="0.65">65% (más permisivo)</option>
              <option value="0.72">72% (recomendado)</option>
              <option value="0.8">80% (estricto)</option>
              <option value="0.9">90% (muy estricto)</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="rounded bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? "Analizando…" : "Analizar"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          {meta && (
            <p className="mb-3 text-xs text-slate-500">
              Folios revisados: {meta.scanned} (creados desde {meta.desde}). Parejas: {pairs.length}.
              {meta.truncated ? " (resultado truncado a 200 parejas)" : ""}
            </p>
          )}
          {!loading && !error && pairs.length === 0 && meta && (
            <p className="text-sm text-slate-400">No se encontraron posibles duplicados con estos criterios.</p>
          )}
          <ul className="space-y-3">
            {pairs.map((p, i) => (
              <li key={`${p.a.id}-${p.b.id}-${i}`} className="rounded border border-slate-700 bg-slate-800/60 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-amber-900/60 px-2 py-0.5 font-medium text-amber-200">
                    Similitud {pct(p.score)}
                  </span>
                  <span className="text-slate-300">{fmtMxn(p.importe)}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[p.a, p.b].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onOpenFolio?.(f.id)}
                      className="rounded border border-slate-600/80 bg-slate-900/50 p-2 text-left hover:border-amber-600/50"
                    >
                      <div className="font-mono text-xs text-amber-300">{f.numero_folio || f.folio_codigo}</div>
                      <p className="mt-1 line-clamp-3 text-xs text-slate-300">{f.concepto || "—"}</p>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {f.estatus || "—"}
                        {f.mes_cargo ? ` · cargo ${f.mes_cargo}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
