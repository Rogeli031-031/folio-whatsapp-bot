"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createComercialEntidad,
  createComercialEntidadAlias,
  deleteComercialEntidad,
  deleteComercialEntidadAlias,
  fetchComercialEntidades,
  updateComercialEntidadAlias,
  type ComercialEntidad,
  type ComercialEntidadAlias,
  type ComercialEntidadAliasFuente,
  type ComercialEntidadAliasTipo,
} from "@/modules/director-ia/lib/api";

const ALIAS_TIPOS: { value: ComercialEntidadAliasTipo; label: string }[] = [
  { value: "operativo", label: "Operativo" },
  { value: "contacto", label: "Contacto" },
  { value: "razon_social", label: "Razón social" },
  { value: "apodo", label: "Apodo" },
];

const ALIAS_FUENTES: { value: ComercialEntidadAliasFuente; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "bitacora", label: "Bitácora" },
  { value: "dicf", label: "DICF" },
  { value: "arr", label: "ARR" },
  { value: "ia_sugerido", label: "IA sugerido" },
];

function tipoLabel(t: string) {
  return ALIAS_TIPOS.find((x) => x.value === t)?.label ?? t;
}

function fuenteLabel(f: string) {
  return ALIAS_FUENTES.find((x) => x.value === f)?.label ?? f;
}

export function DirectorIaComercialEntidadPanel({
  token,
  plantaId,
}: {
  token: string;
  plantaId: string;
}) {
  const pid = parseInt(plantaId.trim(), 10);
  const [entidades, setEntidades] = useState<ComercialEntidad[]>([]);
  const [search, setSearch] = useState("");
  const [canonico, setCanonico] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [aliasDraftByEntidad, setAliasDraftByEntidad] = useState<
    Record<number, { nombre: string; tipo: ComercialEntidadAliasTipo; verificado: boolean }>
  >({});
  const [editAlias, setEditAlias] = useState<ComercialEntidadAlias | null>(null);

  const cargar = useCallback(async () => {
    if (!Number.isFinite(pid) || pid <= 0) {
      setEntidades([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchComercialEntidades(token, pid, search.trim() || undefined);
      if ("enabled" in res && res.enabled === false) {
        setError("Director IA deshabilitado en el servidor.");
        setEntidades([]);
        return;
      }
      if (!("ok" in res) || !res.ok) {
        setError("error" in res ? res.error : "Error al cargar");
        return;
      }
      setEntidades(res.entidades || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [token, pid, search]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearEntidad = async () => {
    if (!Number.isFinite(pid) || pid <= 0) return;
    const nombre = canonico.trim();
    if (!nombre) {
      setError("Indica el nombre canónico (registro comercial).");
      return;
    }
    setSaveLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await createComercialEntidad(token, {
        planta_id: pid,
        nombre_canonico: nombre,
        notas: notas.trim() || null,
      });
      if ("enabled" in res && res.enabled === false) {
        setError("Director IA deshabilitado.");
        return;
      }
      if (!("ok" in res) || !res.ok) {
        setError("error" in res ? res.error : "Error al crear");
        return;
      }
      setCanonico("");
      setNotas("");
      setSuccess(`Entidad creada: ${res.entidad.nombre_canonico}`);
      await cargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setSaveLoading(false);
    }
  };

  const agregarAlias = async (entidadId: number) => {
    const draft = aliasDraftByEntidad[entidadId] || {
      nombre: "",
      tipo: "operativo" as ComercialEntidadAliasTipo,
      verificado: true,
    };
    if (!draft.nombre.trim()) {
      setError("Indica el alias.");
      return;
    }
    setSaveLoading(true);
    setError(null);
    try {
      const res = await createComercialEntidadAlias(token, entidadId, {
        alias_nombre: draft.nombre.trim(),
        alias_tipo: draft.tipo,
        fuente: "manual",
        verificado: draft.verificado,
      });
      if (!("ok" in res) || !res.ok) {
        setError("error" in res ? res.error : "Error al agregar alias");
        return;
      }
      setAliasDraftByEntidad((prev) => ({
        ...prev,
        [entidadId]: { nombre: "", tipo: "operativo", verificado: true },
      }));
      setSuccess("Alias agregado.");
      await cargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al agregar alias");
    } finally {
      setSaveLoading(false);
    }
  };

  const guardarEdicionAlias = async () => {
    if (!editAlias) return;
    setSaveLoading(true);
    setError(null);
    try {
      const res = await updateComercialEntidadAlias(token, editAlias.id, {
        alias_nombre: editAlias.alias_nombre,
        alias_tipo: editAlias.alias_tipo,
        fuente: editAlias.fuente,
        verificado: editAlias.verificado,
      });
      if (!("ok" in res) || !res.ok) {
        setError("error" in res ? res.error : "Error al actualizar alias");
        return;
      }
      setEditAlias(null);
      setSuccess("Alias actualizado.");
      await cargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setSaveLoading(false);
    }
  };

  const eliminarEntidad = async (id: number) => {
    if (!window.confirm("¿Dar de baja esta entidad y sus alias?")) return;
    setSaveLoading(true);
    try {
      await deleteComercialEntidad(token, id);
      await cargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setSaveLoading(false);
    }
  };

  const eliminarAlias = async (id: number) => {
    if (!window.confirm("¿Eliminar este alias?")) return;
    setSaveLoading(true);
    try {
      await deleteComercialEntidadAlias(token, id);
      await cargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar alias");
    } finally {
      setSaveLoading(false);
    }
  };

  if (!Number.isFinite(pid) || pid <= 0) {
    return <p className="text-sm text-slate-500">Selecciona una planta arriba para gestionar entidades.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Registra el nombre comercial canónico (como aparece en DICF) y agrega alias operativos abajo en cada
        entidad. Solo los alias marcados como <strong className="text-emerald-400/90">verificado</strong> se usan
        en el chat (las notas no sustituyen un alias).
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar alias o canónico…"
          className="flex-1 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
        />
        <button
          type="button"
          onClick={() => void cargar()}
          disabled={loading}
          className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </div>

      <div className="rounded border border-slate-700 bg-slate-900/50 p-3 space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Nueva entidad</p>
        <input
          type="text"
          value={canonico}
          onChange={(e) => setCanonico(e.target.value)}
          placeholder="Nombre canónico (ej. Tiberio González)"
          className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
        />
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Notas (opcional)"
          rows={2}
          className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
        />
        <button
          type="button"
          onClick={() => void crearEntidad()}
          disabled={saveLoading}
          className="rounded bg-amber-800/80 px-4 py-2 text-sm font-medium text-amber-50 hover:bg-amber-700/80 disabled:opacity-50"
        >
          Crear entidad
        </button>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

      {entidades.length === 0 && !loading ? (
        <p className="text-sm text-slate-500">Sin entidades para esta planta.</p>
      ) : null}

      <ul className="space-y-3">
        {entidades.map((e) => {
          const draft = aliasDraftByEntidad[e.id] || {
            nombre: "",
            tipo: "operativo" as ComercialEntidadAliasTipo,
            verificado: true,
          };
          return (
            <li key={e.id} className="rounded border border-slate-700 bg-slate-900/40 p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-100">{e.nombre_canonico}</p>
                  {e.notas ? <p className="text-xs text-slate-500 mt-1">{e.notas}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => void eliminarEntidad(e.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Dar de baja
                </button>
              </div>

              {e.aliases.length > 0 ? (
                <ul className="space-y-1 border-t border-slate-800 pt-2">
                  {e.aliases.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-2 text-sm text-slate-300"
                    >
                      <span className="font-medium text-cyan-200">{a.alias_nombre}</span>
                      <span className="text-xs text-slate-500">{tipoLabel(a.alias_tipo)}</span>
                      <span className="text-xs text-slate-600">{fuenteLabel(a.fuente)}</span>
                      {a.verificado ? (
                        <span className="text-[10px] rounded border border-emerald-700 text-emerald-400 px-1">
                          verificado
                        </span>
                      ) : (
                        <span className="text-[10px] rounded border border-amber-700 text-amber-400 px-1">
                          pendiente
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditAlias({ ...a })}
                        className="text-xs text-slate-400 hover:text-slate-200 ml-auto"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void eliminarAlias(a.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-600 border-t border-slate-800 pt-2">Sin alias.</p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 border-t border-slate-800 pt-2">
                <input
                  type="text"
                  value={draft.nombre}
                  onChange={(ev) =>
                    setAliasDraftByEntidad((prev) => ({
                      ...prev,
                      [e.id]: { ...draft, nombre: ev.target.value },
                    }))
                  }
                  placeholder="Nuevo alias (ej. Carlos Juárez)"
                  className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                />
                <select
                  value={draft.tipo}
                  onChange={(ev) =>
                    setAliasDraftByEntidad((prev) => ({
                      ...prev,
                      [e.id]: {
                        ...draft,
                        tipo: ev.target.value as ComercialEntidadAliasTipo,
                      },
                    }))
                  }
                  className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                >
                  {ALIAS_TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-1 text-xs text-slate-400 shrink-0">
                  <input
                    type="checkbox"
                    checked={draft.verificado}
                    onChange={(ev) =>
                      setAliasDraftByEntidad((prev) => ({
                        ...prev,
                        [e.id]: { ...draft, verificado: ev.target.checked },
                      }))
                    }
                  />
                  Verificado
                </label>
                <button
                  type="button"
                  onClick={() => void agregarAlias(e.id)}
                  disabled={saveLoading}
                  className="rounded border border-cyan-700/60 px-3 py-1.5 text-sm text-cyan-100 hover:bg-cyan-950/40 disabled:opacity-50 shrink-0"
                >
                  Agregar alias
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {editAlias ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-900 p-4 space-y-3">
            <h3 className="text-sm font-medium text-white">Editar alias</h3>
            <input
              type="text"
              value={editAlias.alias_nombre}
              onChange={(ev) => setEditAlias({ ...editAlias, alias_nombre: ev.target.value })}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
            <select
              value={editAlias.alias_tipo}
              onChange={(ev) =>
                setEditAlias({
                  ...editAlias,
                  alias_tipo: ev.target.value as ComercialEntidadAliasTipo,
                })
              }
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            >
              {ALIAS_TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={editAlias.fuente}
              onChange={(ev) =>
                setEditAlias({
                  ...editAlias,
                  fuente: ev.target.value as ComercialEntidadAliasFuente,
                })
              }
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            >
              {ALIAS_FUENTES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={editAlias.verificado}
                onChange={(ev) => setEditAlias({ ...editAlias, verificado: ev.target.checked })}
              />
              Verificado
            </label>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditAlias(null)}
                className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void guardarEdicionAlias()}
                disabled={saveLoading}
                className="rounded bg-amber-800/80 px-3 py-1.5 text-sm text-amber-50 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
