"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchClienteComentarios,
  postClienteComentario,
  postDicfAccionesClienteKey,
  type ClienteComentario,
  type DeltaIngresoForecastCliente,
} from "@/lib/api";

function mapGrupoToTipo(grupoLower: string): string {
  if (grupoLower.includes("dejaron")) return "Dejaron de comprar";
  if (grupoLower.includes("nuevos")) return "Nuevo";
  if (grupoLower.includes("aument")) return "Aumentaron";
  if (grupoLower.includes("dismin")) return "Disminuyeron";
  return grupoLower;
}

export function ClienteComentariosPanel(props: {
  token: string;
  planta: string;
  grupoLabel: string;
  cliente: DeltaIngresoForecastCliente;
  canUse: boolean;
}) {
  const { token, planta, grupoLabel, cliente, canUse } = props;
  const grupoLower = (grupoLabel || "").toLowerCase();
  const grupoTipo = (cliente.estado && String(cliente.estado).trim()) || mapGrupoToTipo(grupoLower);
  const canal = (cliente.canal || "").trim();
  const subcanal = (cliente.subcanal || "").trim();
  const clienteNombre = (cliente.cliente || "").trim();

  const [clienteKey, setClienteKey] = useState<string | null>(null);
  const [items, setItems] = useState<ClienteComentario[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!planta || !clienteNombre) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetchClienteComentarios(token, {
        planta,
        cliente_key: clienteKey || undefined,
        cliente_nombre: clienteNombre,
        canal,
        subcanal,
      });
      setItems(r.comentarios || []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error al cargar comentarios");
    } finally {
      setLoading(false);
    }
  }, [token, planta, clienteKey, clienteNombre, canal, subcanal]);

  useEffect(() => {
    if (!canUse || !planta || !clienteNombre) return;
    let cancelled = false;
    (async () => {
      try {
        const k = await postDicfAccionesClienteKey(token, {
          planta,
          grupo_tipo: grupoTipo,
          canal,
          subcanal,
          cliente_nombre: clienteNombre,
        });
        if (!cancelled) setClienteKey(k.cliente_key || null);
      } catch {
        if (!cancelled) setClienteKey(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canUse, token, planta, grupoTipo, canal, subcanal, clienteNombre]);

  useEffect(() => {
    if (!canUse) return;
    void reload();
  }, [canUse, reload]);

  const handleSave = async () => {
    const body = draft.trim();
    if (!body) return;
    setSaving(true);
    setErr(null);
    try {
      await postClienteComentario(token, {
        planta,
        cliente_key: clienteKey,
        grupo_tipo: grupoTipo,
        canal,
        subcanal,
        cliente_nombre: clienteNombre,
        body,
      });
      setDraft("");
      await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error al guardar comentario");
    } finally {
      setSaving(false);
    }
  };

  if (!canUse) return null;

  return (
    <div className="mt-4 rounded border border-slate-700 bg-slate-950/40 p-3">
      <h4 className="text-sm font-semibold text-sky-200">Comentarios del cliente</h4>
      <p className="mt-1 text-xs text-slate-500">
        Notas libres de seguimiento. También las consulta el Director IA (adicionales a DICF / acciones).
      </p>
      <label className="mt-3 block text-xs text-slate-400">
        Nuevo comentario
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Escribe un comentario sobre este cliente…"
          className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !draft.trim()}
          className="rounded bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar comentario"}
        </button>
        {loading && <span className="text-xs text-slate-500">Cargando…</span>}
      </div>
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
      <ul className="mt-3 max-h-56 space-y-2 overflow-auto text-sm">
        {items.length === 0 && !loading ? (
          <li className="text-xs text-slate-500">Aún no hay comentarios.</li>
        ) : (
          items.map((c) => (
            <li key={c.id} className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1.5">
              <div className="text-[0.7rem] text-slate-500">
                {c.created_at ? new Date(c.created_at).toLocaleString("es-MX") : "—"}
                {c.author_name ? ` · ${c.author_name}` : ""}
              </div>
              <p className="whitespace-pre-wrap text-slate-200">{c.body}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
