"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createDirectorIaBitacoraEntry,
  deleteDirectorIaBitacoraEntry,
  fetchDirectorIaBitacoraDetail,
  fetchDirectorIaBitacoraList,
  type DirectorIaBitacoraEntry,
  type DirectorIaBitacoraFuente,
  type DirectorIaBitacoraTipo,
} from "@/modules/director-ia/lib/api";

const TIPOS: { value: DirectorIaBitacoraTipo; label: string }[] = [
  { value: "junta_consejo", label: "Junta Consejo" },
  { value: "seguimiento_gerente", label: "Seguimiento Gerente" },
  { value: "visita_planta", label: "Visita Planta" },
  { value: "comercial", label: "Comercial" },
  { value: "operaciones", label: "Operaciones" },
  { value: "cliente", label: "Cliente" },
  { value: "otro", label: "Otro" },
];

const FUENTES: { value: DirectorIaBitacoraFuente; label: string }[] = [
  { value: "plaud", label: "Plaud" },
  { value: "texto_pegado", label: "Texto pegado" },
  { value: "pdf", label: "PDF" },
  { value: "word", label: "Word" },
  { value: "otro", label: "Otro" },
];

function todayYmdCdmx() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatTipoLabel(tipo: string) {
  return TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

function formatFuenteLabel(fuente: string) {
  return FUENTES.find((f) => f.value === fuente)?.label ?? fuente;
}

export function DirectorIaBitacoraPanel({
  token,
  plantaId,
}: {
  token: string;
  plantaId: string;
}) {
  const [fecha, setFecha] = useState(todayYmdCdmx());
  const [tipo, setTipo] = useState<DirectorIaBitacoraTipo>("visita_planta");
  const [empresa, setEmpresa] = useState("");
  const [titulo, setTitulo] = useState("");
  const [fuente, setFuente] = useState<DirectorIaBitacoraFuente>("plaud");
  const [contenido, setContenido] = useState("");
  const [sessions, setSessions] = useState<DirectorIaBitacoraEntry[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewEntry, setViewEntry] = useState<DirectorIaBitacoraEntry | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const cargarListado = useCallback(async () => {
    const pid = parseInt(plantaId.trim(), 10);
    if (!Number.isFinite(pid) || pid <= 0) {
      setSessions([]);
      return;
    }
    setListLoading(true);
    setError(null);
    try {
      const res = await fetchDirectorIaBitacoraList(token, pid);
      if ("enabled" in res && res.enabled === false) {
        setError("Director IA deshabilitado en el servidor.");
        setSessions([]);
        return;
      }
      if (!("ok" in res) || !res.ok) {
        setError("error" in res ? res.error : "Error al cargar bitácoras");
        setSessions([]);
        return;
      }
      setSessions(res.sessions || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar bitácoras");
      setSessions([]);
    } finally {
      setListLoading(false);
    }
  }, [token, plantaId]);

  useEffect(() => {
    void cargarListado();
  }, [cargarListado]);

  const guardar = useCallback(async () => {
    const pid = parseInt(plantaId.trim(), 10);
    if (!Number.isFinite(pid) || pid <= 0) {
      setError("Indica un ID de planta válido arriba.");
      return;
    }
    if (!contenido.trim()) {
      setError("El contenido es obligatorio.");
      return;
    }
    setSaveLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await createDirectorIaBitacoraEntry(token, {
        planta_id: pid,
        empresa: empresa.trim() || undefined,
        fecha,
        tipo,
        titulo: titulo.trim() || undefined,
        fuente,
        contenido: contenido.trim(),
      });
      if ("enabled" in res && res.enabled === false) {
        setError("Director IA deshabilitado en el servidor.");
        return;
      }
      if (!("ok" in res) || !res.ok) {
        setError("error" in res ? res.error : "Error al guardar");
        return;
      }
      setSuccess("Bitácora guardada.");
      setContenido("");
      setTitulo("");
      await cargarListado();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaveLoading(false);
    }
  }, [token, plantaId, empresa, fecha, tipo, titulo, fuente, contenido, cargarListado]);

  const verDetalle = useCallback(
    async (id: number) => {
      setViewLoading(true);
      setError(null);
      try {
        const res = await fetchDirectorIaBitacoraDetail(token, id);
        if ("enabled" in res && res.enabled === false) {
          setError("Director IA deshabilitado en el servidor.");
          return;
        }
        if (!("ok" in res) || !res.ok) {
          setError("error" in res ? res.error : "Error al cargar detalle");
          return;
        }
        setViewEntry(res.entry);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al cargar detalle");
      } finally {
        setViewLoading(false);
      }
    },
    [token]
  );

  const eliminar = useCallback(
    async (id: number) => {
      if (!window.confirm("¿Eliminar esta bitácora? (baja lógica)")) return;
      setError(null);
      setSuccess(null);
      try {
        const res = await deleteDirectorIaBitacoraEntry(token, id);
        if ("enabled" in res && res.enabled === false) {
          setError("Director IA deshabilitado en el servidor.");
          return;
        }
        if (!res.ok) {
          setError("error" in res ? res.error : "Error al eliminar");
          return;
        }
        setSuccess("Bitácora eliminada.");
        if (viewEntry?.id === id) setViewEntry(null);
        await cargarListado();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al eliminar");
      }
    },
    [token, cargarListado, viewEntry?.id]
  );

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        Contexto de campo (Plaud, visitas, juntas). Solo almacenamiento; aún no se usa en el chat.
      </p>

      <div className="rounded-lg border border-slate-600 bg-slate-900/50 p-4 space-y-4">
        <p className="text-sm font-medium text-slate-200">Nueva bitácora</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Tipo</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as DirectorIaBitacoraTipo)}
              className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Empresa</span>
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ej. Tehuacán"
              className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Fuente</span>
            <select
              value={fuente}
              onChange={(e) => setFuente(e.target.value as DirectorIaBitacoraFuente)}
              className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            >
              {FUENTES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-slate-400">Título</span>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Visita Tehuacán — seguimiento gerencial"
              className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 w-full"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-slate-400">Contenido / resumen</span>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={6}
              placeholder="Pega aquí el resumen Plaud o notas de la reunión…"
              className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 w-full resize-y min-h-[8rem]"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={saveLoading}
          className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {saveLoading ? "Guardando…" : "Guardar Bitácora"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-300/90">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300/90">{success}</p> : null}

      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-sm font-medium text-slate-200">Bitácoras de la planta</p>
          <button
            type="button"
            onClick={() => void cargarListado()}
            disabled={listLoading}
            className="text-xs text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
          >
            {listLoading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        {listLoading && sessions.length === 0 ? (
          <p className="text-sm text-slate-400">Cargando bitácoras…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500">Sin bitácoras para esta planta.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-800/80 text-slate-400 text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Título</th>
                  <th className="px-3 py-2 font-medium">Fuente</th>
                  <th className="px-3 py-2 font-medium">Vista previa</th>
                  <th className="px-3 py-2 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t border-slate-700/80">
                    <td className="px-3 py-2 font-mono text-slate-300 whitespace-nowrap">{s.fecha}</td>
                    <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{formatTipoLabel(s.tipo)}</td>
                    <td className="px-3 py-2 text-slate-200 max-w-[12rem] truncate" title={s.titulo || ""}>
                      {s.titulo || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{formatFuenteLabel(s.fuente)}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs max-w-md truncate" title={s.resumen_ia}>
                      {s.preview || s.resumen_ia || "—"}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => void verDetalle(s.id)}
                        className="text-xs text-cyan-300 hover:text-cyan-100"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => void eliminar(s.id)}
                        className="text-xs text-red-300 hover:text-red-200"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewEntry ? (
        <div className="rounded-lg border border-cyan-800/40 bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-cyan-100">{viewEntry.titulo || `Bitácora #${viewEntry.id}`}</p>
            <button
              type="button"
              onClick={() => setViewEntry(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cerrar
            </button>
          </div>
          <dl className="grid gap-1 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Fecha</dt>
              <dd className="text-slate-200 font-mono">{viewEntry.fecha}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tipo</dt>
              <dd className="text-slate-200">{formatTipoLabel(viewEntry.tipo)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Fuente</dt>
              <dd className="text-slate-200">{formatFuenteLabel(viewEntry.fuente)}</dd>
            </div>
            {viewEntry.empresa ? (
              <div>
                <dt className="text-slate-500">Empresa</dt>
                <dd className="text-slate-200">{viewEntry.empresa}</dd>
              </div>
            ) : null}
          </dl>
          {viewEntry.resumen_ia ? (
            <div>
              <p className="text-xs text-slate-500 mb-1">Resumen IA</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{viewEntry.resumen_ia}</p>
            </div>
          ) : null}
          {viewEntry.contenido ? (
            <div>
              <p className="text-xs text-slate-500 mb-1">Contenido completo</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap max-h-64 overflow-y-auto">{viewEntry.contenido}</p>
            </div>
          ) : null}
        </div>
      ) : viewLoading ? (
        <p className="text-sm text-slate-400">Cargando detalle…</p>
      ) : null}
    </div>
  );
}
