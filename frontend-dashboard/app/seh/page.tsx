"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
  putSehBoard,
  type SehItem,
  type SehUltimaEdicion,
} from "@/lib/api";

const SEH_CATEGORIAS = [
  "EXTINTOR",
  "VALVULAS PLANTA",
  "VALVULAS ESTACIONES",
  "VALVULAS PIPAS",
  "SISTEMA CONTRA INCENDIO",
] as const;

const CLAVES_CODIGO_PLANTA = ["E7", "E8", "E9", "E10", "E11", "E12", "E13", "E15"];
const ROWS_MIN = 12;
const CAT_PIPAS = "VALVULAS PIPAS";

type DraftRow = { key: string; autotanque: string; nombre: string; vence: string };

function emptyRows(n: number): DraftRow[] {
  return Array.from({ length: n }, (_, i) => ({
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`,
    autotanque: "",
    nombre: "",
    vence: "",
  }));
}

function itemsToDraft(items: SehItem[], categoria: string): DraftRow[] {
  const rows = items
    .filter((it) => String(it.categoria || "").toUpperCase() === categoria)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.id || 0) - (b.id || 0))
    .map((it, i) => ({
      key: `id-${it.id ?? i}`,
      autotanque: it.autotanque || "",
      nombre: it.nombre || "",
      vence: it.vence || "",
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

function SehContent() {
  const searchParams = useSearchParams();
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
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    fetchPlantas(token)
      .then((d) => {
        const list = (d.plantas || []).filter(
          (p) =>
            !CLAVES_CODIGO_PLANTA.includes((p.nombre || "").trim().toUpperCase()) &&
            !/^E\d+$/.test((p.nombre || "").trim())
        );
        setPlantas(list);
      })
      .catch((e) => {
        if (String(e?.message || "").includes("401") || String(e?.message || "").includes("Token")) {
          setUnauthorized(true);
        }
      });
  }, [token]);

  const loadBoard = useCallback(async (plantaId: number) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setSavedAt(null);
    try {
      const data = await fetchSehBoard(token, plantaId);
      const next: Record<string, DraftRow[]> = {};
      for (const cat of SEH_CATEGORIAS) {
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
  }, [token]);

  useEffect(() => {
    if (selectedPlantaId == null) {
      setDraftByCat({});
      setDirty(false);
      return;
    }
    loadBoard(selectedPlantaId);
  }, [selectedPlantaId, loadBoard]);

  const updateCell = (
    categoria: string,
    rowKey: string,
    field: "autotanque" | "nombre" | "vence",
    value: string
  ) => {
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
      for (const cat of SEH_CATEGORIAS) {
        const rows = draftByCat[cat] || [];
        rows.forEach((row, i) => {
          const nombre = row.nombre.trim();
          const vence = row.vence.trim();
          const autotanque = cat === CAT_PIPAS ? row.autotanque.trim() : "";
          if (!nombre && !vence && !autotanque) return;
          items.push({
            categoria: cat,
            autotanque,
            nombre,
            vence: vence || null,
            sort_order: i,
          });
        });
      }
      const data = await putSehBoard(token, selectedPlantaId, items);
      const next: Record<string, DraftRow[]> = {};
      for (const cat of SEH_CATEGORIAS) {
        next[cat] = itemsToDraft(data.items || [], cat);
      }
      setDraftByCat(next);
      setUltimaEdicion(data.ultima_edicion || null);
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
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
          {!sehOnly && (
            <Link
              href={token ? `/dashboard?t=${encodeURIComponent(token)}` : "/dashboard"}
              className="rounded border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
            >
              Folios
            </Link>
          )}
          <h1 className="text-base font-semibold text-white">SEH · Seguridad e Higiene</h1>
          {sehOnly && (
            <span className="rounded border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[11px] text-amber-200">
              Acceso exclusivo SEH
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-300">Cambios sin guardar</span>}
          {savedAt && !dirty && <span className="text-xs text-emerald-400">Guardado {savedAt}</span>}
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
        <div className="flex flex-wrap items-center gap-2">
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
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {selectedPlantaId == null && (
          <p className="text-sm text-slate-400">
            Selecciona una planta para capturar nombres y fechas de vencimiento de equipos SEH.
          </p>
        )}

        {selectedPlantaId != null && (
          <>
            <p className="text-sm text-slate-300">
              Planta: <strong className="text-white">{selectedNombre}</strong>
              {" · "}
              Captura manual por casilla. Rojo = vencido · Ámbar = vence en ≤ 30 días.
            </p>
            {ultimaEdicion?.updated_by ? (
              <p className="text-xs text-slate-400">
                Última edición:{" "}
                <span className="text-slate-200">{ultimaEdicion.updated_by}</span>
                {ultimaEdicion.updated_at_local
                  ? ` · ${ultimaEdicion.updated_at_local}`
                  : ""}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Aún no hay ediciones registradas en esta planta.</p>
            )}
            {loading ? (
              <p className="text-sm text-slate-400">Cargando…</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 min-h-[60vh]">
                {SEH_CATEGORIAS.map((cat) => {
                  const rows = draftByCat[cat] || emptyRows(ROWS_MIN);
                  const isPipas = cat === CAT_PIPAS;
                  return (
                    <div
                      key={cat}
                      className={`flex flex-shrink-0 flex-col rounded-lg border border-slate-700 bg-slate-900/55 ${
                        isPipas ? "w-[24rem]" : "w-[17.5rem]"
                      }`}
                    >
                      <div className="border-b border-slate-700 bg-amber-950/30 px-2 py-2 text-center">
                        <div className="text-xs font-semibold tracking-wide text-amber-100">{cat}</div>
                      </div>
                      <div
                        className={`grid border-b border-slate-700 text-[10px] font-medium uppercase tracking-wide text-slate-400 ${
                          isPipas ? "grid-cols-3" : "grid-cols-2"
                        }`}
                      >
                        {isPipas && (
                          <div className="border-r border-slate-700 px-1.5 py-1.5 text-center">Autotanque</div>
                        )}
                        <div className="border-r border-slate-700 px-2 py-1.5 text-center">Nombre</div>
                        <div className="px-2 py-1.5 text-center">Vence</div>
                      </div>
                      <div className="max-h-[70vh] overflow-y-auto">
                        {rows.map((row) => (
                          <div
                            key={row.key}
                            className={`grid border-b border-slate-800/80 ${
                              isPipas ? "grid-cols-3" : "grid-cols-2"
                            }`}
                          >
                            {isPipas && (
                              <input
                                type="text"
                                value={row.autotanque}
                                disabled={!canEdit}
                                onChange={(e) => updateCell(cat, row.key, "autotanque", e.target.value)}
                                placeholder="Autotanque"
                                className="border-r border-slate-800 bg-transparent px-1.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:bg-slate-800/60 focus:outline-none disabled:opacity-60"
                              />
                            )}
                            <input
                              type="text"
                              value={row.nombre}
                              disabled={!canEdit}
                              onChange={(e) => updateCell(cat, row.key, "nombre", e.target.value)}
                              placeholder="Ej. ANDEN 1"
                              className="border-r border-slate-800 bg-transparent px-1.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:bg-slate-800/60 focus:outline-none disabled:opacity-60"
                            />
                            <input
                              type="date"
                              value={row.vence}
                              disabled={!canEdit}
                              onChange={(e) => updateCell(cat, row.key, "vence", e.target.value)}
                              className={`px-1 py-1.5 text-[11px] focus:outline-none disabled:opacity-60 ${venceTone(row.vence)}`}
                            />
                          </div>
                        ))}
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

export default function SehPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-slate-400">Cargando SEH…</p>
        </div>
      }
    >
      <SehContent />
    </Suspense>
  );
}
