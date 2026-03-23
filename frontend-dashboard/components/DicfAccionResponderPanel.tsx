"use client";

import { useEffect, useState } from "react";
import {
  fetchDicfAccionHistorial,
  patchDicfAccionCompromiso,
  patchDicfAccionCerrar,
  type DicfAccionRow,
} from "@/lib/api";

const MIN_RESULTADO_CIERRE = 20;

export function DicfAccionResponderPanel(props: {
  token: string;
  accion: DicfAccionRow;
  onReload: () => Promise<void>;
}) {
  const { token, accion: initial, onReload } = props;
  const [accion, setAccion] = useState(initial);
  const [fechaComp, setFechaComp] = useState("");
  const [resultadoDraft, setResultadoDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const [hist, setHist] = useState<{ evento: string; creado_en: string; actor_nombre?: string; detalle: unknown }[]>([]);

  useEffect(() => {
    setAccion(initial);
  }, [initial]);

  useEffect(() => {
    if (!showHist) {
      setHist([]);
      return;
    }
    fetchDicfAccionHistorial(token, accion.id)
      .then((r) => setHist(r.historial || []))
      .catch(() => setHist([]));
  }, [token, accion.id, showHist]);

  return (
    <div className="rounded-lg border border-amber-700/40 bg-slate-900/70 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">Código</p>
          <p className="font-mono text-lg text-amber-200">{accion.public_code}</p>
        </div>
        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{accion.estado}</span>
      </div>
      <dl className="grid gap-1 text-sm text-slate-300">
        <div>
          <dt className="text-xs text-slate-500">Planta</dt>
          <dd>{accion.planta_label}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Cliente</dt>
          <dd>{accion.cliente_nombre}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Grupo / canal</dt>
          <dd>
            {accion.grupo_tipo}
            {(accion.canal || accion.subcanal) && (
              <>
                {" "}
                · {accion.canal || "—"} / {accion.subcanal || "—"}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Responsable</dt>
          <dd>{accion.responsable_nombre || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Acción</dt>
          <dd className="whitespace-pre-wrap text-slate-200">{accion.descripcion}</dd>
        </div>
      </dl>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <button
        type="button"
        className="text-sm text-amber-400 hover:underline"
        onClick={() => setShowHist((v) => !v)}
      >
        {showHist ? "Ocultar historial" : "Ver historial"}
      </button>
      {showHist && (
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-slate-700 p-2 text-xs text-slate-400">
          {hist.map((h) => (
            <li key={h.creado_en + h.evento}>
              {h.creado_en} · {h.actor_nombre || "?"} · {h.evento}{" "}
              {h.detalle != null ? JSON.stringify(h.detalle) : ""}
            </li>
          ))}
        </ul>
      )}

      {accion.estado !== "hecho" && (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          <div className="rounded-md border border-slate-600 bg-slate-800/50 p-3">
            <p className="mb-1 text-xs font-medium text-slate-300">1) Fecha de compromiso</p>
            {accion.fecha_compromiso ? (
              <p className="text-sm text-emerald-400">
                ✓ Registrada: <span className="font-mono">{accion.fecha_compromiso}</span>
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs text-amber-200/90">
                  Elige la fecha y pulsa <strong>Guardar compromiso</strong>. Solo elegir en el calendario no basta. También por
                  WhatsApp:{" "}
                  <code className="text-amber-200/80">COMPROMISO {accion.public_code} AAAA-MM-DD</code>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200"
                    value={fechaComp}
                    onChange={(e) => setFechaComp(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!fechaComp || busy}
                    className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                    onClick={async () => {
                      if (!fechaComp) return;
                      setBusy(true);
                      setErr(null);
                      try {
                        const r = await patchDicfAccionCompromiso(token, accion.id, fechaComp);
                        setFechaComp("");
                        if (r.accion) setAccion(r.accion as DicfAccionRow);
                        await onReload();
                      } catch (e: unknown) {
                        setErr(e instanceof Error ? e.message : "Error");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Guardar compromiso
                  </button>
                </div>
              </>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">
              2) Resultado al cerrar (mín. {MIN_RESULTADO_CIERRE} caracteres)
            </label>
            <textarea
              className="mb-2 w-full rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-200 min-h-[5rem]"
              placeholder="Ej.: Llamé al cliente; pidió cotización para el viernes. Siguiente: enviar propuesta y seguimiento lunes."
              value={resultadoDraft}
              onChange={(e) => setResultadoDraft(e.target.value)}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <button
                type="button"
                disabled={
                  busy ||
                  resultadoDraft.trim().length < MIN_RESULTADO_CIERRE ||
                  !accion.fecha_compromiso
                }
                className="rounded bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={async () => {
                  const txt = resultadoDraft.trim();
                  if (txt.length < MIN_RESULTADO_CIERRE || !accion.fecha_compromiso) return;
                  setBusy(true);
                  setErr(null);
                  try {
                    await patchDicfAccionCerrar(token, accion.id, txt);
                    setResultadoDraft("");
                    await onReload();
                  } catch (e: unknown) {
                    setErr(e instanceof Error ? e.message : "Error");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                3) Cerrar acción
              </button>
              {(!accion.fecha_compromiso || resultadoDraft.trim().length < MIN_RESULTADO_CIERRE) && (
                <span className="text-xs text-slate-500">
                  {!accion.fecha_compromiso && <>Completa el paso 1 (botón verde). </>}
                  {accion.fecha_compromiso && resultadoDraft.trim().length < MIN_RESULTADO_CIERRE && (
                    <>Escribe al menos {MIN_RESULTADO_CIERRE} caracteres.</>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {accion.estado === "hecho" && (
        <div className="border-t border-slate-700 pt-3 text-sm text-slate-400">
          <p className="text-xs text-slate-500">Acción cerrada</p>
          {(accion.resultado_cierre || "").trim() ? (
            <p className="mt-1 text-slate-300 whitespace-pre-wrap">{accion.resultado_cierre}</p>
          ) : (
            <p className="mt-1">Sin texto de resultado registrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
