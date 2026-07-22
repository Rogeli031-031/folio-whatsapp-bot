"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  unlockUsuariosAdmin,
  fetchUsuariosAdminMeta,
  fetchUsuariosAdmin,
  downloadUsuariosAdminExcel,
  createUsuariosAdmin,
  patchUsuariosAdmin,
  deleteUsuariosAdmin,
  type UsuarioAdmin,
  type UsuarioAdminMeta,
  type UsuarioPermisoDef,
  type UsuariosAdminPorPlanta,
} from "@/lib/api";

const CLAVE_ESPERADA_HINT = "Clave de acceso privada";

type Props = {
  open: boolean;
  token: string;
  onClose: () => void;
};

type DraftUser = {
  id: number | null;
  telefono: string;
  email: string;
  nombre: string;
  nombre_persona: string;
  planta_id: number | null;
  rol_id: number | null;
  activo: boolean;
  permisos: Record<string, boolean>;
};

function emptyDraft(meta: UsuarioAdminMeta | null): DraftUser {
  const firstRol = meta?.roles?.[0];
  return {
    id: null,
    telefono: "",
    email: "",
    nombre: "",
    nombre_persona: "",
    planta_id: meta?.plantas?.[0]?.id ?? null,
    rol_id: firstRol?.id ?? null,
    activo: true,
    permisos: { ...(firstRol?.permisos_default || {}) },
  };
}

function userToDraft(u: UsuarioAdmin): DraftUser {
  return {
    id: u.id,
    telefono: u.telefono || "",
    email: u.email || "",
    nombre: u.nombre || "",
    nombre_persona: u.nombre_persona || "",
    planta_id: u.planta_id,
    rol_id: u.rol_id,
    activo: u.activo,
    permisos: { ...(u.permisos || {}) },
  };
}

export function UsuariosAdminModal({ open, token, onClose }: Props) {
  const [clave, setClave] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const [meta, setMeta] = useState<UsuarioAdminMeta | null>(null);
  const [porPlanta, setPorPlanta] = useState<UsuariosAdminPorPlanta[]>([]);
  const [catalogo, setCatalogo] = useState<UsuarioPermisoDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [includeInactivos, setIncludeInactivos] = useState(false);
  const [filterPlanta, setFilterPlanta] = useState<string>("");
  const [filterText, setFilterText] = useState("");

  const [draft, setDraft] = useState<DraftUser | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const resetSession = useCallback(() => {
    setUnlocked(false);
    setClave("");
    setUnlockError(null);
    setMeta(null);
    setPorPlanta([]);
    setCatalogo([]);
    setError(null);
    setOkMsg(null);
    setDraft(null);
    setEditorOpen(false);
  }, []);

  useEffect(() => {
    if (!open) resetSession();
  }, [open, resetSession]);

  const loadData = useCallback(
    async (adminClave: string, withInactivos: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const [metaRes, listRes] = await Promise.all([
          fetchUsuariosAdminMeta(token, adminClave),
          fetchUsuariosAdmin(token, adminClave, withInactivos),
        ]);
        setMeta(metaRes);
        setPorPlanta(listRes.por_planta || []);
        setCatalogo(listRes.catalogo_permisos || metaRes.catalogo_permisos || []);
      } catch (e) {
        setError((e as Error).message || "Error al cargar usuarios");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const handleUnlock = async () => {
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await unlockUsuariosAdmin(token, clave.trim());
      setCatalogo(res.catalogo_permisos || []);
      setUnlocked(true);
      await loadData(clave.trim(), includeInactivos);
    } catch (e) {
      setUnlockError((e as Error).message || "Clave incorrecta");
      setUnlocked(false);
    } finally {
      setUnlocking(false);
    }
  };

  useEffect(() => {
    if (!unlocked || !clave.trim()) return;
    void loadData(clave.trim(), includeInactivos);
  }, [includeInactivos]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredGroups = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return (porPlanta || [])
      .filter((g) => !filterPlanta || String(g.planta_id ?? "sin") === filterPlanta)
      .map((g) => ({
        ...g,
        usuarios: (g.usuarios || []).filter((u) => {
          if (!q) return true;
          const blob = `${u.nombre_persona} ${u.nombre} ${u.telefono} ${u.email} ${u.rol_nombre} ${u.rol_clave}`.toLowerCase();
          return blob.includes(q);
        }),
      }))
      .filter((g) => g.usuarios.length > 0);
  }, [porPlanta, filterPlanta, filterText]);

  const openCreate = () => {
    setDraft(emptyDraft(meta));
    setEditorOpen(true);
    setOkMsg(null);
    setError(null);
  };

  const openEdit = (u: UsuarioAdmin) => {
    setDraft(userToDraft(u));
    setEditorOpen(true);
    setOkMsg(null);
    setError(null);
  };

  const onRoleChange = (rolId: number | null) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const rol = meta?.roles?.find((r) => r.id === rolId);
      return {
        ...prev,
        rol_id: rolId,
        permisos: { ...(rol?.permisos_default || prev.permisos) },
      };
    });
  };

  const togglePermiso = (clavePerm: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        permisos: { ...prev.permisos, [clavePerm]: !prev.permisos[clavePerm] },
      };
    });
  };

  const handleSave = async () => {
    if (!draft || !clave.trim()) return;
    if (!draft.telefono.trim()) {
      setError("El teléfono es obligatorio");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const payload = {
        telefono: draft.telefono.trim(),
        email: draft.email.trim(),
        nombre: draft.nombre.trim(),
        nombre_persona: draft.nombre_persona.trim(),
        planta_id: draft.planta_id,
        rol_id: draft.rol_id,
        activo: draft.activo,
        permisos: draft.permisos,
      };
      if (draft.id == null) {
        await createUsuariosAdmin(token, clave.trim(), payload);
        setOkMsg("Usuario creado");
      } else {
        await patchUsuariosAdmin(token, clave.trim(), draft.id, payload);
        setOkMsg("Usuario actualizado");
      }
      setEditorOpen(false);
      setDraft(null);
      await loadData(clave.trim(), includeInactivos);
    } catch (e) {
      setError((e as Error).message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: UsuarioAdmin) => {
    if (!clave.trim()) return;
    const ok = window.confirm(
      `¿Quitar al usuario "${u.nombre_persona || u.nombre || u.telefono}"?\nSe desactivará (no se borra de la base).`
    );
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await deleteUsuariosAdmin(token, clave.trim(), u.id, false);
      setOkMsg("Usuario desactivado");
      if (draft?.id === u.id) {
        setEditorOpen(false);
        setDraft(null);
      }
      await loadData(clave.trim(), includeInactivos);
    } catch (e) {
      setError((e as Error).message || "Error al quitar usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleExcel = async () => {
    if (!clave.trim()) return;
    setExcelLoading(true);
    setError(null);
    try {
      await downloadUsuariosAdminExcel(token, clave.trim(), includeInactivos);
    } catch (e) {
      setError((e as Error).message || "Error al descargar Excel");
    } finally {
      setExcelLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-600 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Usuarios por planta</h2>
            <p className="text-xs text-slate-400">Permisos explícitos · edición y export a Excel</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unlocked && (
              <>
                <button
                  type="button"
                  onClick={() => void handleExcel()}
                  disabled={excelLoading || loading}
                  className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {excelLoading ? "Generando…" : "Descargar Excel"}
                </button>
                <button
                  type="button"
                  onClick={openCreate}
                  disabled={saving || loading}
                  className="rounded bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  + Agregar usuario
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              Cerrar
            </button>
          </div>
        </div>

        {!unlocked ? (
          <div className="p-6">
            <p className="mb-3 text-sm text-slate-300">
              Ingresa la clave de acceso para ver y administrar usuarios y permisos.
            </p>
            <label className="block text-sm">
              <span className="text-slate-400">{CLAVE_ESPERADA_HINT}</span>
              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleUnlock();
                }}
                autoFocus
                className="mt-1 w-full max-w-sm rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="••••••••"
              />
            </label>
            {unlockError && <p className="mt-2 text-sm text-red-400">{unlockError}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void handleUnlock()}
                disabled={unlocking || !clave.trim()}
                className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {unlocking ? "Validando…" : "Ingresar"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Buscar nombre, teléfono, rol…"
                className="min-w-[12rem] flex-1 rounded border border-slate-600 bg-slate-950 px-3 py-1.5 text-sm"
              />
              <select
                value={filterPlanta}
                onChange={(e) => setFilterPlanta(e.target.value)}
                className="rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
              >
                <option value="">Todas las plantas</option>
                {(meta?.plantas || []).map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.nombre}
                  </option>
                ))}
                <option value="sin">Sin planta</option>
              </select>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={includeInactivos}
                  onChange={(e) => setIncludeInactivos(e.target.checked)}
                />
                Incluir inactivos
              </label>
              {loading && <span className="text-xs text-slate-400">Cargando…</span>}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {okMsg && <p className="text-sm text-emerald-400">{okMsg}</p>}

            <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-700">
              {filteredGroups.length === 0 && !loading ? (
                <p className="p-4 text-sm text-slate-400">No hay usuarios para mostrar.</p>
              ) : (
                filteredGroups.map((g) => (
                  <div key={String(g.planta_id ?? "sin")} className="border-b border-slate-700 last:border-b-0">
                    <div className="sticky top-0 z-10 bg-slate-800/95 px-3 py-2 text-sm font-semibold text-amber-200 backdrop-blur">
                      {g.planta_nombre}{" "}
                      <span className="font-normal text-slate-400">({g.usuarios.length})</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[64rem] text-left text-xs">
                        <thead className="bg-slate-950/80 text-slate-400">
                          <tr>
                            <th className="px-2 py-1.5 font-medium">Nombre</th>
                            <th className="px-2 py-1.5 font-medium">Puesto</th>
                            <th className="px-2 py-1.5 font-medium">Teléfono</th>
                            <th className="px-2 py-1.5 font-medium">Rol</th>
                            <th className="px-2 py-1.5 font-medium">Permisos (resumen)</th>
                            <th className="px-2 py-1.5 font-medium">Estado</th>
                            <th className="px-2 py-1.5 font-medium">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.usuarios.map((u) => {
                            const activos = catalogo.filter((c) => u.permisos?.[c.clave]).map((c) => c.etiqueta);
                            return (
                              <tr key={u.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                                <td className="px-2 py-1.5 text-slate-100">{u.nombre_persona || "—"}</td>
                                <td className="px-2 py-1.5 text-slate-300">{u.nombre || "—"}</td>
                                <td className="px-2 py-1.5 font-mono text-slate-300">{u.telefono}</td>
                                <td className="px-2 py-1.5">
                                  <span className="text-slate-200">{u.rol_nombre || "—"}</span>
                                  {u.rol_clave ? (
                                    <span className="ml-1 text-slate-500">({u.rol_clave})</span>
                                  ) : null}
                                  {u.permisos_personalizados ? (
                                    <span className="ml-1 rounded border border-violet-500/50 px-1 text-[10px] text-violet-200">
                                      custom
                                    </span>
                                  ) : null}
                                </td>
                                <td className="max-w-[28rem] px-2 py-1.5 text-slate-400" title={activos.join(" · ")}>
                                  {activos.length ? activos.slice(0, 4).join(" · ") + (activos.length > 4 ? ` · +${activos.length - 4}` : "") : "Sin permisos"}
                                </td>
                                <td className="px-2 py-1.5">
                                  {u.activo ? (
                                    <span className="text-emerald-400">Activo</span>
                                  ) : (
                                    <span className="text-slate-500">Inactivo</span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(u)}
                                    className="mr-2 rounded bg-slate-700 px-2 py-1 text-slate-100 hover:bg-slate-600"
                                  >
                                    Editar
                                  </button>
                                  {u.activo && (
                                    <button
                                      type="button"
                                      onClick={() => void handleDelete(u)}
                                      className="rounded border border-rose-700/70 px-2 py-1 text-rose-200 hover:bg-rose-950/50"
                                    >
                                      Quitar
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>

            {editorOpen && draft && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3">
                <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-slate-600 bg-slate-900 p-4 shadow-xl">
                  <h3 className="text-base font-semibold text-white">
                    {draft.id == null ? "Agregar usuario" : `Editar usuario #${draft.id}`}
                  </h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="text-slate-400">Nombre persona</span>
                      <input
                        value={draft.nombre_persona}
                        onChange={(e) => setDraft({ ...draft, nombre_persona: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-400">Nombre / puesto</span>
                      <input
                        value={draft.nombre}
                        onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-400">Teléfono *</span>
                      <input
                        value={draft.telefono}
                        onChange={(e) => setDraft({ ...draft, telefono: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 font-mono text-sm"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-400">Email</span>
                      <input
                        value={draft.email}
                        onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                        className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-400">Planta</span>
                      <select
                        value={draft.planta_id ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            planta_id: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
                      >
                        <option value="">Sin planta</option>
                        {(meta?.plantas || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-400">Rol</span>
                      <select
                        value={draft.rol_id ?? ""}
                        onChange={(e) => onRoleChange(e.target.value === "" ? null : Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
                      >
                        <option value="">Sin rol</option>
                        {(meta?.roles || []).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre}
                            {r.clave ? ` (${r.clave})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={draft.activo}
                        onChange={(e) => setDraft({ ...draft, activo: e.target.checked })}
                      />
                      Usuario activo
                    </label>
                  </div>

                  <div className="mt-4">
                    <h4 className="mb-2 text-sm font-medium text-slate-200">Permisos específicos</h4>
                    <p className="mb-2 text-xs text-slate-500">
                      Marca o quita cada permiso. Al cambiar el rol se recalculan los defaults; luego puedes
                      ajustar uno a uno.
                    </p>
                    <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-auto rounded border border-slate-700 bg-slate-950/50 p-2 sm:grid-cols-2">
                      {catalogo.map((p) => (
                        <label
                          key={p.clave}
                          className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-xs hover:bg-slate-800/60"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={!!draft.permisos[p.clave]}
                            onChange={() => togglePermiso(p.clave)}
                          />
                          <span className="text-slate-200">{p.etiqueta}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditorOpen(false);
                        setDraft(null);
                      }}
                      disabled={saving}
                      className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="rounded bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
                    >
                      {saving ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
