"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import type { DeltaIngresoForecastCliente } from "@/lib/api";
import {
  fetchDicfAccionesAsignables,
  fetchDicfAccionesList,
  postDicfAccionCreate,
  fetchDicfAccionHistorial,
  patchDicfAccionCompromiso,
  patchDicfAccionCerrar,
  postDicfAccionesClienteKey,
  type DicfAccionRow,
} from "@/lib/api";

const MIN_RESULTADO_CIERRE = 20;

const PLANTILLAS: { label: string; texto: string }[] = [
  { label: "Perdido: contacto recuperación", texto: "Llamar al cliente para ofrecer condiciones de reactivación y causa de baja." },
  { label: "Perdido: propuesta comercial", texto: "Enviar propuesta (precio/volumen/mix) y registrar respuesta." },
  { label: "Perdido: escalamiento crédito/cobranza", texto: "Revisar con crédito/cobranza si aplica restricción o saldo." },
  { label: "Perdido: seguimiento programado", texto: "Agendar recontacto en 30/60 días y dejar nota." },
  { label: "Disminuyó: diagnóstico caída", texto: "Validar si la caída es estacional o estructural (competencia, servicio, precio)." },
  { label: "Disminuyó: plan recuperación tonelaje", texto: "Definir meta de recuperación por mes y acciones concretas." },
  { label: "Disminuyó: visita conjunta", texto: "Coordinar visita con GV/GG según política de planta." },
  { label: "Disminuyó: seguimiento 30-60-90", texto: "Registrar hitos a 30, 60 y 90 días con resultado." },
];

function mapGrupoToTipo(grupoLower: string): string {
  if (grupoLower.includes("dejaron")) return "Dejaron de comprar";
  if (grupoLower.includes("nuevos")) return "Nuevo";
  if (grupoLower.includes("aument")) return "Aumentaron";
  if (grupoLower.includes("dismin")) return "Disminuyeron";
  return grupoLower;
}

export function DicfAccionesClientePanel(props: {
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
  const [acciones, setAcciones] = useState<DicfAccionRow[]>([]);
  const [asignables, setAsignables] = useState<{ id: number; nombre: string; rol_clave: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [respId, setRespId] = useState<number | "">("");
  const [fechaComp, setFechaComp] = useState("");
  const [histId, setHistId] = useState<number | null>(null);
  const [hist, setHist] = useState<{ evento: string; creado_en: string; actor_nombre?: string; detalle: unknown }[]>([]);
  const [resultadoCierreDraft, setResultadoCierreDraft] = useState<Record<number, string>>({});

  const reload = useCallback(async () => {
    if (!planta || !clienteKey) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetchDicfAccionesList(token, { planta, cliente_key: clienteKey });
      setAcciones(r.acciones || []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error al cargar acciones");
    } finally {
      setLoading(false);
    }
  }, [token, planta, clienteKey]);

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
        if (!cancelled) setClienteKey(k.cliente_key);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error clave cliente");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, planta, grupoTipo, canal, subcanal, clienteNombre, canUse]);

  useEffect(() => {
    if (!canUse || !planta) return;
    fetchDicfAccionesAsignables(token, planta)
      .then((r) => setAsignables(r.usuarios || []))
      .catch(() => setAsignables([]));
  }, [token, planta, canUse]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (histId == null) {
      setHist([]);
      return;
    }
    fetchDicfAccionHistorial(token, histId)
      .then((r) => setHist(r.historial || []))
      .catch(() => setHist([]));
  }, [token, histId]);

  if (!canUse) return null;

  return (
    <div className="mt-4 rounded border border-amber-700/40 bg-slate-900/60 p-4">
      <h4 className="mb-2 text-base font-semibold text-amber-200">Registro de acciones (DICF)</h4>
      <p className="text-xs text-slate-500 mb-2">
        Cada acción tiene responsable (GG/GV). Define fecha compromiso en 3h (CDMX):{" "}
        <code className="text-amber-200/90">COMPROMISO CÓDIGO AAAA-MM-DD</code>. Para cerrar hay que registrar qué pasó (llamada,
        respuesta del cliente, siguiente paso). WhatsApp:{" "}
        <code className="text-amber-200/90">DICF CERRAR CÓDIGO tu texto…</code> (mín. {MIN_RESULTADO_CIERRE} caracteres).
      </p>
      {err && <p className="text-sm text-red-400 mb-2">{err}</p>}
      {clienteKey && <p className="text-[0.65rem] text-slate-600 mb-2 font-mono break-all">Clave: {clienteKey}</p>}

      <div className="flex flex-wrap gap-2 mb-2">
        <select
          className="rounded border border-slate-600 bg-slate-800 text-xs text-slate-200 px-2 py-1 max-w-[14rem]"
          value=""
          onChange={(e) => {
            const p = PLANTILLAS.find((x) => x.label === e.target.value);
            if (p) setDesc(p.texto);
            e.target.value = "";
          }}
        >
          <option value="">Plantilla sugerida…</option>
          {PLANTILLAS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 mb-2 min-h-[4rem]"
        placeholder="Descripción de la acción (obligatorio)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <label className="flex flex-col gap-0.5 text-xs text-slate-400">
          Responsable (GG/GV)
          <select
            className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-slate-200 min-w-[12rem]"
            value={respId}
            onChange={(e) => setRespId(e.target.value ? parseInt(e.target.value, 10) : "")}
          >
            <option value="">— Elegir —</option>
            {asignables.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.rol_clave})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!desc.trim() || respId === "" || loading}
          className="rounded bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-600 disabled:opacity-50"
          onClick={async () => {
            if (respId === "") return;
            setLoading(true);
            setErr(null);
            try {
              await postDicfAccionCreate(token, {
                planta,
                grupo_tipo: grupoTipo,
                canal,
                subcanal,
                cliente_nombre: clienteNombre,
                descripcion: desc.trim(),
                responsable_usuario_id: respId as number,
              });
              setDesc("");
              setRespId("");
              await reload();
            } catch (e: unknown) {
              setErr(e instanceof Error ? e.message : "Error al crear");
            } finally {
              setLoading(false);
            }
          }}
        >
          Crear acción
        </button>
      </div>

      {loading && <p className="text-xs text-slate-500">Cargando…</p>}
      <div className="overflow-x-auto max-h-56 overflow-y-auto border border-slate-700 rounded">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-800 text-slate-400">
            <tr>
              <th className="text-left py-1 px-2">Código</th>
              <th className="text-left py-1 px-2">Estado</th>
              <th className="text-left py-1 px-2">Responsable</th>
              <th className="text-left py-1 px-2">Texto</th>
              <th className="text-left py-1 px-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {acciones.map((a) => (
              <Fragment key={a.id}>
                <tr className="border-t border-slate-800">
                  <td className="py-1 px-2 font-mono text-amber-200/90">{a.public_code}</td>
                  <td className="py-1 px-2">{a.estado}</td>
                  <td className="py-1 px-2">{a.responsable_nombre || "—"}</td>
                  <td className="py-1 px-2 max-w-[12rem] truncate" title={a.descripcion}>
                    {a.descripcion}
                  </td>
                  <td className="py-1 px-2 whitespace-nowrap align-top">
                    <button type="button" className="text-amber-400 hover:underline mr-2" onClick={() => setHistId(a.id)}>
                      Historial
                    </button>
                    {a.estado !== "hecho" && (
                      <>
                        <input
                          type="date"
                          className="rounded border border-slate-600 bg-slate-800 text-[0.65rem] w-32 mr-1"
                          value={fechaComp}
                          onChange={(e) => setFechaComp(e.target.value)}
                        />
                        <button
                          type="button"
                          className="text-emerald-400 hover:underline mr-2"
                          onClick={async () => {
                            if (!fechaComp) return;
                            try {
                              await patchDicfAccionCompromiso(token, a.id, fechaComp);
                              setFechaComp("");
                              await reload();
                            } catch (e: unknown) {
                              setErr(e instanceof Error ? e.message : "Error");
                            }
                          }}
                        >
                          Compromiso
                        </button>
                      </>
                    )}
                  </td>
                </tr>
                {a.estado !== "hecho" && (
                  <tr key={`${a.id}-res`} className="border-t border-slate-800/80 bg-slate-900/40">
                    <td colSpan={5} className="py-2 px-2">
                      <label className="block text-[0.65rem] text-slate-500 mb-1">
                        Resultado antes de cerrar (obligatorio, mín. {MIN_RESULTADO_CIERRE} caracteres): qué hiciste, qué dijo el
                        cliente, qué sigue…
                      </label>
                      <textarea
                        className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 min-h-[3.5rem] mb-1"
                        placeholder="Ej.: Llamé al contacto; acordó revisar propuesta el viernes. Siguiente: enviar cotización y llamada de seguimiento lunes."
                        value={resultadoCierreDraft[a.id] ?? ""}
                        onChange={(e) =>
                          setResultadoCierreDraft((prev) => ({ ...prev, [a.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        disabled={
                          (resultadoCierreDraft[a.id] ?? "").trim().length < MIN_RESULTADO_CIERRE || !a.fecha_compromiso
                        }
                        className="text-slate-200 text-xs rounded border border-slate-500 px-2 py-1 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={!a.fecha_compromiso ? "Primero registra fecha compromiso" : undefined}
                        onClick={async () => {
                          const txt = (resultadoCierreDraft[a.id] ?? "").trim();
                          if (txt.length < MIN_RESULTADO_CIERRE) return;
                          try {
                            await patchDicfAccionCerrar(token, a.id, txt);
                            setResultadoCierreDraft((prev) => {
                              const n = { ...prev };
                              delete n[a.id];
                              return n;
                            });
                            await reload();
                          } catch (e: unknown) {
                            setErr(e instanceof Error ? e.message : "Error");
                          }
                        }}
                      >
                        Cerrar acción
                      </button>
                    </td>
                  </tr>
                )}
                {a.estado === "hecho" && (a.resultado_cierre || "").trim() ? (
                  <tr key={`${a.id}-done`} className="border-t border-slate-800/50">
                    <td colSpan={5} className="py-1 px-2 text-[0.7rem] text-slate-400">
                      <span className="text-slate-500">Resultado registrado:</span> {a.resultado_cierre}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {histId != null && (
        <div className="mt-3 rounded border border-slate-600 p-2 text-xs">
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Historial #{histId}</span>
            <button type="button" className="text-slate-500" onClick={() => setHistId(null)}>
              Cerrar
            </button>
          </div>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {hist.map((h) => (
              <li key={h.creado_en + h.evento} className="text-slate-300">
                {h.creado_en} · {h.actor_nombre || "?"} · {h.evento}{" "}
                {h.detalle != null ? JSON.stringify(h.detalle) : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
