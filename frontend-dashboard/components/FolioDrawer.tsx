"use client";

import { useEffect, useState } from "react";
import {
  fetchFolio,
  fetchTimeline,
  fetchMedia,
  fetchFinanzas,
  fetchMediaUrl,
} from "@/lib/api";

interface Props {
  folioId: number | null;
  token: string | null;
  onClose: () => void;
}

export default function FolioDrawer({ folioId, token, onClose }: Props) {
  const [folio, setFolio] = useState<Record<string, unknown> | null>(null);
  const [timeline, setTimeline] = useState<{ estatus: string; comentario: string; actor_rol: string | null; creado_en: string }[]>([]);
  const [media, setMedia] = useState<{ id: number; tipo: string; file_name: string | null }[]>([]);
  const [finanzas, setFinanzas] = useState<{ status: string; monto_mxn?: number | null } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!folioId || !token) {
      setFolio(null);
      setTimeline([]);
      setMedia([]);
      setFinanzas(null);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchFolio(token, folioId),
      fetchTimeline(token, folioId),
      fetchMedia(token, folioId),
      fetchFinanzas(token, folioId),
    ])
      .then(([f, t, m, fin]) => {
        setFolio(f as Record<string, unknown>);
        setTimeline((t as { events: typeof timeline }).events || []);
        setMedia((m as { items: typeof media }).items || []);
        setFinanzas(fin as { status: string; monto_mxn?: number | null });
      })
      .catch(() => {
        setFolio(null);
      })
      .finally(() => setLoading(false));
  }, [folioId, token]);

  if (folioId == null) return null;

  const openMediaUrl = async (mediaId: number) => {
    if (!token) return;
    try {
      const { url } = await fetchMediaUrl(token, folioId, mediaId);
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto border-l border-slate-700 bg-slate-900 shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
          <h2 className="font-semibold text-white">
            {folio ? (folio.folio_codigo as string) : `Folio #${folioId}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4">
          {loading && <p className="text-slate-400">Cargando…</p>}
          {folio && !loading && (
            <>
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-400">Datos</h3>
                <dl className="space-y-1 text-sm">
                  <div><dt className="text-slate-500">Planta</dt><dd className="text-slate-200">{String(folio.planta_nombre ?? "—")}</dd></div>
                  <div><dt className="text-slate-500">Estatus</dt><dd className="text-slate-200">{String(folio.estatus ?? "—")}</dd></div>
                  <div><dt className="text-slate-500">Importe</dt><dd className="text-slate-200">{folio.importe != null ? `$${Number(folio.importe).toLocaleString("es-MX")}` : "N/A"}</dd></div>
                  <div><dt className="text-slate-500">Concepto</dt><dd className="text-slate-200">{String(folio.descripcion_display ?? folio.concepto ?? "—")}</dd></div>
                </dl>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-400">Timeline</h3>
                <ul className="space-y-2 text-sm">
                  {timeline.map((ev, i) => (
                    <li key={i} className="border-l-2 border-slate-600 pl-2">
                      <span className="text-slate-500">{new Date(ev.creado_en).toLocaleString("es-MX")}</span>
                      <span className="ml-2 text-slate-300">{ev.estatus || "—"}</span>
                      {ev.comentario && <p className="text-slate-400">{ev.comentario}</p>}
                      {ev.actor_rol && <span className="text-xs text-slate-500">{ev.actor_rol}</span>}
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-400">Adjuntos</h3>
                {media.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin adjuntos</p>
                ) : (
                  <ul className="space-y-1">
                    {media.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => openMediaUrl(m.id)}
                          className="text-sm text-blue-400 hover:underline"
                        >
                          {m.tipo} {m.file_name || `#${m.id}`}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-400">Finanzas</h3>
                {finanzas?.status === "PENDIENTE_INTEGRACION" ? (
                  <p className="text-sm text-slate-500">
                    Pendiente de integración.
                    {finanzas.monto_mxn != null && ` Monto: $${Number(finanzas.monto_mxn).toLocaleString("es-MX")}`}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">N/A</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
