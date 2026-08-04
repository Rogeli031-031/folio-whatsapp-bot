"use client";

import { useEffect, useState } from "react";
import { fetchAnalisisDuplicados, postCancelarFolio, type DuplicadoPair } from "@/lib/api";

interface Props {
  open: boolean;
  token: string;
  plantaId: number;
  plantaNombre: string;
  onClose: () => void;
  onOpenFolio?: (id: number) => void;
  /** Tras cancelar un folio (para refrescar kanban). */
  onCancelled?: () => void;
}

function fmtMxn(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

function pct(score: number): string {
  return `${Math.round(score * 100)}%`;
}

type FolioMini = DuplicadoPair["a"];

export default function AnalisisDuplicadosModal({
  open,
  token,
  plantaId,
  plantaNombre,
  onClose,
  onOpenFolio,
  onCancelled,
}: Props) {
  const [meses, setMeses] = useState(3);
  const [umbral, setUmbral] = useState(0.72);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<DuplicadoPair[]>([]);
  const [meta, setMeta] = useState<{ desde: string; scanned: number; truncated: boolean } | null>(null);
  const [confirmFolio, setConfirmFolio] = useState<FolioMini | null>(null);
  const [cancelling, setCancelling] = useState(false);

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
      const msg = (e as Error).message || "Error al analizar";
      // fetch() lanza esto si el servidor no responde, CORS, o timeout (análisis pesado).
      if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        setError(
          "No se pudo conectar con el servidor (timeout o red). Prueba «Últimos 3 meses» o espera a que el API termine de reiniciar y vuelve a Analizar."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setPairs([]);
    setMeta(null);
    setError(null);
    setConfirmFolio(null);
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir / cambiar planta
  }, [open, plantaId, token]);

  const handleConfirmCancel = async () => {
    if (!confirmFolio) return;
    setCancelling(true);
    setError(null);
    try {
      const numero = confirmFolio.numero_folio || confirmFolio.folio_codigo;
      await postCancelarFolio(
        token,
        confirmFolio.id,
        `Cancelado desde análisis de duplicados (${numero})`
      );
      const cancelledId = confirmFolio.id;
      setConfirmFolio(null);
      setPairs((prev) =>
        prev
          .map((p) => {
            if (p.a.id === cancelledId || p.b.id === cancelledId) return null;
            return p;
          })
          .filter((p): p is DuplicadoPair => p != null)
      );
      onCancelled?.();
    } catch (e) {
      setError((e as Error).message || "Error al cancelar");
    } finally {
      setCancelling(false);
    }
  };

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
                    <div
                      key={f.id}
                      className="relative rounded border border-slate-600/80 bg-slate-900/50 p-2 pr-8 text-left"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmFolio(f);
                        }}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded text-red-500 hover:bg-red-950/60 hover:text-red-400"
                        title="Cancelar folio"
                        aria-label={`Cancelar folio ${f.numero_folio || f.folio_codigo}`}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenFolio?.(f.id)}
                        className="w-full text-left hover:opacity-90"
                      >
                        <div className="font-mono text-xs text-amber-300">{f.numero_folio || f.folio_codigo}</div>
                        <p className="mt-1 line-clamp-3 text-xs text-slate-300">{f.concepto || "—"}</p>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {f.estatus || "—"}
                          {f.mes_cargo ? ` · cargo ${f.mes_cargo}` : ""}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {confirmFolio && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-900 p-4 shadow-xl">
            <h3 className="text-base font-semibold text-white">¿Cancelar folio?</h3>
            <p className="mt-2 text-sm text-slate-300">
              El folio{" "}
              <span className="font-mono text-amber-300">
                {confirmFolio.numero_folio || confirmFolio.folio_codigo}
              </span>{" "}
              pasará a <strong className="text-red-300">Cancelado</strong>. Esta acción no se puede deshacer desde aquí.
            </p>
            <p className="mt-2 line-clamp-3 text-xs text-slate-500">{confirmFolio.concepto || ""}</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setConfirmFolio(null)}
                className="rounded bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
              >
                No, volver
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void handleConfirmCancel()}
                className="rounded bg-red-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? "Cancelando…" : "Sí, cancelar folio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
