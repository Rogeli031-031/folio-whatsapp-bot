"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
  getRoleFromDashboardToken,
  isSehOnlyToken,
} from "@/lib/auth";
import {
  fetchPlantas,
  fetchSehBoard,
  getSehEquipoFotoUrl,
  putSehBoard,
  type SehItem,
  type SehUltimaEdicion,
} from "@/lib/api";
import { SEH_COMPONENTES, filterPlantasSeh, type SehAmbitoConfig } from "@/lib/seh-ambitos";

const CAT_SCI = "SISTEMA CONTRA INCENDIO";
const ROWS_MIN = 12;
const FOTO_MAX_BYTES = 3 * 1024 * 1024;

type DraftRow = {
  key: string;
  id?: number;
  locacion: string;
  descripcion: string;
  componente: string;
  nombre: string;
  vence: string;
  venceOriginal: string;
  hasFoto: boolean;
  fotoFileName: string | null;
  pendingFotoBase64: string | null;
  pendingFotoName: string | null;
  pendingFotoType: string | null;
  pendingFotoPreview: string | null;
};

type DraftField = "locacion" | "descripcion" | "componente" | "nombre" | "vence";

function isSci(categoria: string): boolean {
  return categoria === CAT_SCI;
}

function emptyRows(n: number): DraftRow[] {
  return Array.from({ length: n }, (_, i) => ({
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`,
    locacion: "",
    descripcion: "",
    componente: "",
    nombre: "",
    vence: "",
    venceOriginal: "",
    hasFoto: false,
    fotoFileName: null,
    pendingFotoBase64: null,
    pendingFotoName: null,
    pendingFotoType: null,
    pendingFotoPreview: null,
  }));
}

function itemsToDraft(items: SehItem[], categoria: string): DraftRow[] {
  const rows = items
    .filter((it) => String(it.categoria || "").toUpperCase() === categoria)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.id || 0) - (b.id || 0))
    .map((it, i) => ({
      key: `id-${it.id ?? i}`,
      id: it.id,
      locacion: it.locacion || "",
      descripcion: it.descripcion || "",
      componente: it.componente || "",
      nombre: it.nombre || "",
      vence: it.vence || "",
      venceOriginal: it.vence || "",
      hasFoto: Boolean(it.has_foto),
      fotoFileName: it.foto_file_name || null,
      pendingFotoBase64: null,
      pendingFotoName: null,
      pendingFotoType: null,
      pendingFotoPreview: null,
    }));
  if (rows.length < ROWS_MIN) {
    return [...rows, ...emptyRows(ROWS_MIN - rows.length)];
  }
  return rows;
}

function venceTone(vence: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vence)) return "border-slate-600 bg-slate-900 text-slate-200";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = vence.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const diffDays = Math.round((dt.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "border-red-700 bg-red-950/50 text-red-100";
  if (diffDays <= 30) return "border-amber-600 bg-amber-950/40 text-amber-100";
  return "border-slate-600 bg-slate-900 text-slate-200";
}

/** Foto recomendada (no bloquea el guardado) cuando hay VENCE nuevo/cambiado. */
function rowFotoRecommended(row: DraftRow): boolean {
  const vence = row.vence.trim();
  if (!vence) return false;
  if (vence !== (row.venceOriginal || "").trim()) return true;
  if (!row.id) return true;
  return false;
}

function rowHasFotoReady(row: DraftRow): boolean {
  if (row.pendingFotoBase64) return true;
  if (row.hasFoto) return true;
  return false;
}

function readFileAsBase64(file: File): Promise<{ base64: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve({ base64, preview: result });
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

export default function SehOperacionBoard({ ambito }: { ambito: SehAmbitoConfig }) {
  const searchParams = useSearchParams();
  const categorias = ambito.categorias;
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [plantas, setPlantas] = useState<{ id: number; nombre: string }[]>([]);
  const [selectedPlantaId, setSelectedPlantaId] = useState<number | undefined>(undefined);
  const [draftByCat, setDraftByCat] = useState<Record<string, DraftRow[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [ultimaEdicion, setUltimaEdicion] = useState<SehUltimaEdicion | null>(null);

  useEffect(() => {
    const t = parseTokenFromQuery(searchParams) || getTokenFromStorage();
    if (t) {
      setTokenInStorage(t);
      setToken(t);
      setUnauthorized(false);
    } else {
      setToken(null);
      setUnauthorized(true);
    }
    const pid = parseInt(String(searchParams.get("planta_id") || ""), 10);
    if (Number.isFinite(pid)) setSelectedPlantaId(pid);
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    fetchPlantas(token)
      .then((d) => setPlantas(filterPlantasSeh(d.plantas || [])))
      .catch((e) => {
        if (String(e?.message || "").includes("401") || String(e?.message || "").includes("Token")) {
          setUnauthorized(true);
        }
      });
  }, [token]);

  const loadBoard = useCallback(
    async (plantaId: number) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      setSavedAt(null);
      try {
        const data = await fetchSehBoard(token, plantaId);
        const next: Record<string, DraftRow[]> = {};
        for (const cat of categorias) {
          next[cat] = itemsToDraft(data.items || [], cat);
        }
        setDraftByCat(next);
        setUltimaEdicion(data.ultima_edicion || null);
        setDirty(false);
      } catch (e) {
        setError((e as Error).message || "Error al cargar SEH");
        setDraftByCat({});
        setUltimaEdicion(null);
      } finally {
        setLoading(false);
      }
    },
    [token, categorias]
  );

  useEffect(() => {
    if (selectedPlantaId == null) {
      setDraftByCat({});
      setDirty(false);
      return;
    }
    loadBoard(selectedPlantaId);
  }, [selectedPlantaId, loadBoard]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const updateCell = (categoria: string, rowKey: string, field: DraftField, value: string) => {
    setDraftByCat((prev) => {
      const rows = [...(prev[categoria] || [])];
      const idx = rows.findIndex((r) => r.key === rowKey);
      if (idx < 0) return prev;
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...prev, [categoria]: rows };
    });
    setDirty(true);
    setSavedAt(null);
  };

  const setPendingFoto = async (categoria: string, rowKey: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes en FOTO.");
      return;
    }
    if (file.size > FOTO_MAX_BYTES) {
      setError(`La foto no debe superar ${Math.floor(FOTO_MAX_BYTES / 1024 / 1024)}MB.`);
      return;
    }
    try {
      const { base64, preview } = await readFileAsBase64(file);
      setDraftByCat((prev) => {
        const rows = [...(prev[categoria] || [])];
        const idx = rows.findIndex((r) => r.key === rowKey);
        if (idx < 0) return prev;
        rows[idx] = {
          ...rows[idx],
          pendingFotoBase64: base64,
          pendingFotoName: file.name,
          pendingFotoType: file.type || "image/jpeg",
          pendingFotoPreview: preview,
        };
        return { ...prev, [categoria]: rows };
      });
      setDirty(true);
      setSavedAt(null);
      setError(null);
    } catch (e) {
      setError((e as Error).message || "Error al leer la foto");
    }
  };

  const addRow = (categoria: string) => {
    setDraftByCat((prev) => ({
      ...prev,
      [categoria]: [...(prev[categoria] || []), ...emptyRows(1)],
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!token || selectedPlantaId == null) return;
    setSaving(true);
    setError(null);
    try {
      const items: SehItem[] = [];
      let missingFotoCount = 0;
      for (const cat of categorias) {
        const rows = draftByCat[cat] || [];
        rows.forEach((row, i) => {
          const vence = row.vence.trim();
          const filledSci = Boolean(row.nombre.trim() || vence);
          const filledStd = Boolean(
            row.locacion.trim() || row.descripcion.trim() || row.componente.trim() || vence
          );
          if (isSci(cat) ? !filledSci : !filledStd) return;
          if (rowFotoRecommended(row) && !row.pendingFotoBase64 && !row.hasFoto) {
            missingFotoCount += 1;
          }
          const base: SehItem = {
            id: row.id,
            categoria: cat,
            vence: vence || null,
            sort_order: i,
            ...(row.pendingFotoBase64
              ? {
                  foto_base64: row.pendingFotoBase64,
                  foto_file_name_upload: row.pendingFotoName || "foto.jpg",
                  foto_content_type: row.pendingFotoType || "image/jpeg",
                }
              : {}),
          };
          if (isSci(cat)) {
            items.push({ ...base, nombre: row.nombre.trim() });
          } else {
            items.push({
              ...base,
              locacion: row.locacion.trim(),
              descripcion: row.descripcion.trim(),
              componente: row.componente.trim().toUpperCase(),
            });
          }
        });
      }
      if (!items.length) {
        setError("No hay filas con datos para guardar.");
        setSaving(false);
        return;
      }
      const data = await putSehBoard(token, selectedPlantaId, items, [...categorias]);
      const next: Record<string, DraftRow[]> = {};
      for (const cat of categorias) {
        next[cat] = itemsToDraft(data.items || [], cat);
      }
      setDraftByCat(next);
      setUltimaEdicion(data.ultima_edicion || null);
      setDirty(false);
      const time = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      const fotoNote =
        missingFotoCount > 0
          ? ` · ${missingFotoCount} fila(s) sin foto (opcional)`
          : "";
      setSavedAt(`${time}${fotoNote}`);
    } catch (e) {
      setError((e as Error).message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const selectedNombre = useMemo(
    () => plantas.find((p) => p.id === selectedPlantaId)?.nombre || null,
    [plantas, selectedPlantaId]
  );

  const role = token ? getRoleFromDashboardToken(token) : null;
  const canEdit = role !== "GA";
  const sehOnly = token ? isSehOnlyToken(token) : false;
  const qToken = token ? `t=${encodeURIComponent(token)}` : "";
  const homeHref = token ? `/seh?${qToken}` : "/seh";

  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Acceso no autorizado</h1>
          <p className="mt-2 text-sm text-slate-400">
            Escribe &quot;SEH&quot; en WhatsApp para obtener un enlace de acceso.
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-900/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <Link
            href={homeHref}
            className="rounded border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
          >
            ← SEH
          </Link>
          {!sehOnly && (
            <Link
              href={`/dashboard?${qToken}`}
              className="rounded border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
            >
              Folios
            </Link>
          )}
          <h1 className="text-base font-semibold text-white">SEH · {ambito.cardTitle}</h1>
          <span className="rounded border border-emerald-700/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] text-emerald-200">
            OPERACIÓN
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-300">Cambios sin guardar — pulsa Guardar</span>}
          {savedAt && !dirty && (
            <span className="text-xs text-emerald-400">Guardado {savedAt} · visible para todos</span>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || selectedPlantaId == null || !dirty}
              className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-700 bg-slate-900/60 p-1">
          <button
            type="button"
            onClick={() => setSelectedPlantaId(undefined)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedPlantaId == null ? "bg-amber-600 text-white" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Todas
          </button>
          {plantas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlantaId(p.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedPlantaId === p.id ? "bg-amber-600 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {selectedPlantaId == null && (
          <p className="text-sm text-slate-400">Selecciona una planta para capturar operación SEH.</p>
        )}

        {selectedPlantaId != null && (
          <>
            <p className="text-sm text-slate-300">
              Planta: <strong className="text-white">{selectedNombre}</strong>
              {" · "}
              Rojo = vencido · Ámbar = ≤ 30 días · La foto es opcional (recomendable al capturar VENCE).
              {" · "}
              Usa <strong className="text-white">Guardar</strong> para que quede grabado y lo vean los demás.
            </p>
            {ultimaEdicion?.updated_by ? (
              <p className="text-xs text-slate-400">
                Última edición: <span className="text-slate-200">{ultimaEdicion.updated_by}</span>
                {ultimaEdicion.updated_at_local ? ` · ${ultimaEdicion.updated_at_local}` : ""}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Aún no hay ediciones registradas en esta planta.</p>
            )}
            {loading ? (
              <p className="text-sm text-slate-400">Cargando…</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 min-h-[60vh]">
                {categorias.map((cat) => {
                  const rows = draftByCat[cat] || emptyRows(ROWS_MIN);
                  const sci = isSci(cat);
                  return (
                    <div
                      key={cat}
                      className={`flex flex-shrink-0 flex-col rounded-lg border border-slate-700 bg-slate-900/55 ${
                        sci ? "w-[24rem]" : "w-[40rem]"
                      }`}
                    >
                      <div className="border-b border-slate-700 bg-amber-950/30 px-2 py-2 text-center">
                        <div className="text-xs font-semibold tracking-wide text-amber-100">{cat}</div>
                      </div>
                      <div
                        className={`grid border-b border-slate-700 text-[10px] font-medium uppercase tracking-wide text-slate-400 ${
                          sci ? "grid-cols-[1.2fr_1fr_0.9fr]" : "grid-cols-[1.1fr_1.1fr_0.9fr_0.95fr_0.85fr]"
                        }`}
                      >
                        {sci ? (
                          <>
                            <div className="border-r border-slate-700 px-2 py-1.5 text-center">Nombre</div>
                            <div className="border-r border-slate-700 px-2 py-1.5 text-center">Vence</div>
                            <div className="px-2 py-1.5 text-center">Foto</div>
                          </>
                        ) : (
                          <>
                            <div className="border-r border-slate-700 px-1.5 py-1.5 text-center">Locación</div>
                            <div className="border-r border-slate-700 px-1.5 py-1.5 text-center">Descripción</div>
                            <div className="border-r border-slate-700 px-1.5 py-1.5 text-center">Componente</div>
                            <div className="border-r border-slate-700 px-1.5 py-1.5 text-center">Vence</div>
                            <div className="px-1.5 py-1.5 text-center">Foto</div>
                          </>
                        )}
                      </div>
                      <div className="max-h-[70vh] overflow-y-auto">
                        {rows.map((row) => {
                          const fotoRecommended = rowFotoRecommended(row);
                          const fotoOk = rowHasFotoReady(row);
                          const inputKey = `${cat}:${row.key}`;
                          return (
                            <div
                              key={row.key}
                              className={`grid border-b border-slate-800/80 ${
                                sci ? "grid-cols-[1.2fr_1fr_0.9fr]" : "grid-cols-[1.1fr_1.1fr_0.9fr_0.95fr_0.85fr]"
                              }`}
                            >
                              {sci ? (
                                <>
                                  <input
                                    type="text"
                                    value={row.nombre}
                                    disabled={!canEdit}
                                    onChange={(e) => updateCell(cat, row.key, "nombre", e.target.value)}
                                    placeholder="Ej. BOMBA 1"
                                    className="border-r border-slate-800 bg-transparent px-1.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:bg-slate-800/60 focus:outline-none disabled:opacity-60"
                                  />
                                  <input
                                    type="date"
                                    value={row.vence}
                                    disabled={!canEdit}
                                    onChange={(e) => updateCell(cat, row.key, "vence", e.target.value)}
                                    className={`border-r border-slate-800 px-1 py-1.5 text-[11px] focus:outline-none disabled:opacity-60 ${venceTone(row.vence)}`}
                                  />
                                </>
                              ) : (
                                <>
                                  <input
                                    type="text"
                                    value={row.locacion}
                                    disabled={!canEdit}
                                    onChange={(e) => updateCell(cat, row.key, "locacion", e.target.value)}
                                    placeholder="Locación"
                                    className="border-r border-slate-800 bg-transparent px-1.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:bg-slate-800/60 focus:outline-none disabled:opacity-60"
                                  />
                                  <input
                                    type="text"
                                    value={row.descripcion}
                                    disabled={!canEdit}
                                    onChange={(e) => updateCell(cat, row.key, "descripcion", e.target.value)}
                                    placeholder="Ej. Extintor 1"
                                    className="border-r border-slate-800 bg-transparent px-1.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:bg-slate-800/60 focus:outline-none disabled:opacity-60"
                                  />
                                  <select
                                    value={row.componente}
                                    disabled={!canEdit}
                                    onChange={(e) => updateCell(cat, row.key, "componente", e.target.value)}
                                    className="border-r border-slate-800 bg-slate-900 px-1 py-1.5 text-[11px] text-slate-200 focus:bg-slate-800 focus:outline-none disabled:opacity-60"
                                  >
                                    <option value="">—</option>
                                    {SEH_COMPONENTES.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="date"
                                    value={row.vence}
                                    disabled={!canEdit}
                                    onChange={(e) => updateCell(cat, row.key, "vence", e.target.value)}
                                    className={`border-r border-slate-800 px-1 py-1.5 text-[11px] focus:outline-none disabled:opacity-60 ${venceTone(row.vence)}`}
                                  />
                                </>
                              )}
                              <div
                                className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1 ${
                                  fotoRecommended && !fotoOk ? "bg-amber-950/30" : ""
                                }`}
                              >
                                <input
                                  ref={(el) => {
                                    fileInputRefs.current[inputKey] = el;
                                  }}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={!canEdit}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0] || null;
                                    void setPendingFoto(cat, row.key, f);
                                    e.target.value = "";
                                  }}
                                />
                                {row.pendingFotoPreview ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={row.pendingFotoPreview}
                                    alt="Nueva foto"
                                    className="h-8 w-8 rounded object-cover border border-emerald-600"
                                  />
                                ) : row.id && row.hasFoto && token ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={getSehEquipoFotoUrl(token, row.id)}
                                    alt={row.fotoFileName || "Foto"}
                                    className="h-8 w-8 rounded object-cover border border-slate-600"
                                  />
                                ) : null}
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => fileInputRefs.current[inputKey]?.click()}
                                    className={`text-[10px] ${
                                      fotoRecommended && !fotoOk
                                        ? "font-semibold text-amber-300"
                                        : "text-sky-300 hover:text-sky-200"
                                    }`}
                                  >
                                    {row.pendingFotoBase64 || row.hasFoto ? "Cambiar" : "Subir"}
                                  </button>
                                )}
                                {fotoRecommended && !fotoOk && (
                                  <span className="text-[9px] text-amber-300">Opcional</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => addRow(cat)}
                          className="border-t border-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        >
                          + Fila
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
