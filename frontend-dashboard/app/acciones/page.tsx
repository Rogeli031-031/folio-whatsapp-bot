"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
} from "@/lib/auth";
import {
  fetchPlantas,
  fetchActionRegisterBoard,
  createActionRegisterRevision,
  createActionRegisterItem,
  addActionRegisterEntry,
  patchActionRegisterItem,
  getActionRegisterExportUrl,
  type ActionRegisterBoardResponse,
  type ActionRegisterItem,
  type ActionRegisterTema,
} from "@/lib/api";

function ymdToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toYmd(value: string | null | undefined): string {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  return s;
}

function fmtDMY(value: string | null | undefined): string {
  const ymd = toYmd(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

function buildTree(items: ActionRegisterItem[]): {
  roots: ActionRegisterItem[];
  children: Record<number, ActionRegisterItem[]>;
} {
  const children: Record<number, ActionRegisterItem[]> = {};
  const roots: ActionRegisterItem[] = [];
  const sorted = [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
  for (const it of sorted) {
    const pid = it.parent_id;
    if (pid == null) roots.push(it);
    else {
      if (!children[pid]) children[pid] = [];
      children[pid].push(it);
    }
  }
  return { roots, children };
}

function ActionRegisterContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const [plantas, setPlantas] = useState<{ id: number; nombre: string }[]>([]);
  const [plantaId, setPlantaId] = useState<number | null>(null);

  const [board, setBoard] = useState<ActionRegisterBoardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newRevisionDate, setNewRevisionDate] = useState<string>(ymdToday());

  const [draftByCell, setDraftByCell] = useState<Record<string, { title: string; responsable: string; due_date: string }>>({});
  const [draftSubByItem, setDraftSubByItem] = useState<Record<string, { title: string; responsable: string; due_date: string }>>({});
  const [pickExistingByCell, setPickExistingByCell] = useState<Record<string, number | "">>({});

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

  const loadPlantas = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetchPlantas(token);
      const CLAVES_CODIGO_PLANTA = ["E7", "E8", "E9", "E10", "E11", "E12", "E13", "E15"];
      const filtered = (r.plantas || []).filter((p) => {
        const nombre = (p.nombre || "").trim();
        const upper = nombre.toUpperCase();
        if (CLAVES_CODIGO_PLANTA.includes(upper)) return false;
        if (/^E\d+$/.test(nombre)) return false;
        const norm = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        if (norm === "MEXICO") return false;
        return true;
      });
      setPlantas(filtered);
      if (!plantaId && filtered.length) setPlantaId(filtered[0].id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("401") || msg.toLowerCase().includes("token")) setUnauthorized(true);
    }
  }, [token, plantaId]);

  useEffect(() => {
    void loadPlantas();
  }, [loadPlantas]);

  const loadBoard = useCallback(async () => {
    if (!token || !plantaId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActionRegisterBoard(token, plantaId);
      setBoard(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("401") || msg.toLowerCase().includes("token")) setUnauthorized(true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, plantaId]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const temas = board?.temas || (["Contrataciones", "Mantenimiento", "General", "Clientes", "Apoyos", "Licencias", "Taller"] as ActionRegisterTema[]);
  const revisions = board?.revisions || [];
  const cells = board?.cells || {};

  const allItemsByTema = useMemo(() => {
    const map = new Map<ActionRegisterTema, Map<number, ActionRegisterItem>>();
    for (const tema of temas) map.set(tema, new Map());
    for (const rid of Object.keys(cells)) {
      const byTema = cells[rid] || {};
      for (const tema of Object.keys(byTema)) {
        const t = tema as ActionRegisterTema;
        if (!map.has(t)) map.set(t, new Map());
        for (const it of (byTema[tema] || []) as ActionRegisterItem[]) {
          map.get(t)!.set(it.id, it);
        }
      }
    }
    return map;
  }, [cells, temas]);

  const revisionIdToDate = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of revisions) m.set(r.id, r.revision_date);
    return m;
  }, [revisions]);

  const handleCreateRevision = useCallback(async () => {
    if (!token || !plantaId) return;
    setError(null);
    try {
      await createActionRegisterRevision(token, plantaId, newRevisionDate);
      await loadBoard();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [token, plantaId, newRevisionDate, loadBoard]);

  const handleAddItem = useCallback(
    async (revision_id: number, tema: ActionRegisterTema) => {
      if (!token || !plantaId) return;
      const key = `${revision_id}|${tema}`;
      const d = draftByCell[key] || { title: "", responsable: "", due_date: "" };
      if (!d.title.trim()) return;
      setError(null);
      try {
        await createActionRegisterItem(token, {
          planta_id: plantaId,
          revision_id,
          tema,
          title: d.title,
          responsable: d.responsable,
          due_date: d.due_date || null,
        });
        setDraftByCell((prev) => ({ ...prev, [key]: { title: "", responsable: "", due_date: "" } }));
        await loadBoard();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      }
    },
    [token, plantaId, draftByCell, loadBoard]
  );

  const handleAddSub = useCallback(
    async (revision_id: number, tema: ActionRegisterTema, parent_id: number) => {
      if (!token || !plantaId) return;
      const key = `${revision_id}|${parent_id}`;
      const d = draftSubByItem[key] || { title: "", responsable: "", due_date: "" };
      if (!d.title.trim()) return;
      setError(null);
      try {
        await createActionRegisterItem(token, {
          planta_id: plantaId,
          revision_id,
          tema,
          parent_id,
          title: d.title,
          responsable: d.responsable,
          due_date: d.due_date || null,
        });
        setDraftSubByItem((prev) => ({ ...prev, [key]: { title: "", responsable: "", due_date: "" } }));
        await loadBoard();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      }
    },
    [token, plantaId, draftSubByItem, loadBoard]
  );

  const handleToggleClosed = useCallback(
    async (itemId: number, next: boolean) => {
      if (!token) return;
      setError(null);
      try {
        await patchActionRegisterItem(token, itemId, { closed: next });
        await loadBoard();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      }
    },
    [token, loadBoard]
  );

  const handleAddExisting = useCallback(
    async (revision_id: number, tema: ActionRegisterTema) => {
      if (!token) return;
      const key = `${revision_id}|${tema}`;
      const chosen = pickExistingByCell[key];
      if (chosen === "" || chosen == null) return;
      setError(null);
      try {
        await addActionRegisterEntry(token, revision_id, Number(chosen));
        setPickExistingByCell((p) => ({ ...p, [key]: "" }));
        await loadBoard();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      }
    },
    [token, pickExistingByCell, loadBoard]
  );

  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Acceso no autorizado</h1>
          <p className="mt-2 text-sm text-slate-400">Abre el enlace que recibiste por WhatsApp (válido 20 horas).</p>
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
      <div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-white">Action Register</h1>
          <span className="text-xs text-slate-400">(seguimiento de acciones)</span>
        </div>
        <Link href={`/igf-forecast?t=${encodeURIComponent(token)}`} className="text-sm text-amber-300 hover:text-amber-200 underline">
          ← IGF Forecast
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-700/80 bg-slate-800/30">
        <label className="inline-flex items-center gap-2 text-sm text-slate-200">
          <span className="text-slate-400">Planta:</span>
          <select
            value={plantaId ?? ""}
            onChange={(e) => setPlantaId(e.target.value ? Number(e.target.value) : null)}
            className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200"
          >
            {plantas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <span className="text-slate-400">Nueva fecha de revisión:</span>
            <input
              type="date"
              value={newRevisionDate}
              onChange={(e) => setNewRevisionDate(e.target.value)}
              className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleCreateRevision()}
            className="inline-flex items-center gap-2 rounded bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            Crear columna (fecha)
          </button>
        </div>

        {plantaId && (
          <a
            href={getActionRegisterExportUrl(token, plantaId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Exportar historial a Excel
          </a>
        )}

        {loading && <span className="text-sm text-slate-400">Cargando…</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
        {!loading && revisions.length === 0 && <span className="text-sm text-slate-400">Aún no hay fechas de revisión para esta planta.</span>}
      </div>

      <main className="flex-1 p-4 overflow-auto">
        <div className="min-w-[900px]">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `240px repeat(${revisions.length || 1}, minmax(320px, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-20 bg-slate-950/70 backdrop-blur border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200">
              Tema
            </div>
            {(revisions.length ? revisions : [{ id: -1, revision_date: "—" } as any]).map((r) => (
              <div
                key={r.id}
                className="border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-200"
              >
                {r.revision_date && r.revision_date !== "—" ? fmtDMY(r.revision_date) : "Fecha"}
                {r.id !== -1 && (
                  <div className="mt-1 text-[11px] text-slate-400">
                    {revisionIdToDate.get(r.id) ? `Revisión: ${revisionIdToDate.get(r.id)}` : ""}
                  </div>
                )}
              </div>
            ))}

            {temas.map((tema) => (
              <div key={tema} className="contents">
                <div className="sticky left-0 z-10 border border-slate-700 bg-slate-900/60 px-3 py-3 text-sm font-medium text-slate-200">
                  {tema}
                </div>

                {(revisions.length ? revisions : [{ id: -1, revision_date: "—" } as any]).map((rev) => {
                  const rid = String(rev.id);
                  const items = (cells[rid] && (cells[rid][tema] as ActionRegisterItem[])) || [];
                  const { roots, children } = buildTree(items);
                  const cellKey = `${rev.id}|${tema}`;
                  const draft = draftByCell[cellKey] || { title: "", responsable: "", due_date: "" };
                  const existingKey = cellKey;
                  const chosenExisting = pickExistingByCell[existingKey] ?? "";
                  const currentIds = new Set(items.map((x) => x.id));
                  const existingOptions = Array.from(allItemsByTema.get(tema)?.values() || [])
                    .filter((x) => !currentIds.has(x.id))
                    .sort((a, b) => a.title.localeCompare(b.title));

                  const renderItem = (it: ActionRegisterItem, n: string, depth: number) => {
                    const sub = (children[it.id] || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
                    const subDraftKey = `${rev.id}|${it.id}`;
                    const subDraft = draftSubByItem[subDraftKey] || { title: "", responsable: "", due_date: "" };
                    const closedCls = it.closed ? "line-through text-slate-500" : "text-slate-100";
                    return (
                      <div key={it.id} className={`rounded border border-slate-700 bg-slate-900/50 p-2 ${depth ? "ml-4" : ""}`}>
                        <div className="flex items-start gap-2">
                          <div className="text-xs text-slate-400 mt-0.5 w-10 flex-shrink-0">{n}</div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm ${closedCls}`}>{it.title}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                              <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">
                                Resp: <span className="text-amber-200">{it.responsable || "—"}</span>
                              </span>
                              <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">
                                Compromiso: <span className="text-emerald-200">{it.due_date ? fmtDMY(it.due_date) : "—"}</span>
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleToggleClosed(it.id, !it.closed)}
                            className={`text-xs rounded px-2 py-1 border ${
                              it.closed ? "border-slate-600 text-slate-300 hover:bg-slate-800" : "border-emerald-700 text-emerald-200 hover:bg-emerald-900/20"
                            }`}
                          >
                            {it.closed ? "Reabrir" : "Cerrar"}
                          </button>
                        </div>

                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2">
                            <input
                              value={subDraft.title}
                              onChange={(e) =>
                                setDraftSubByItem((p) => ({ ...p, [subDraftKey]: { ...subDraft, title: e.target.value } }))
                              }
                              placeholder="Subacción…"
                              className="flex-1 min-w-[180px] rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                            />
                            <input
                              value={subDraft.responsable}
                              onChange={(e) =>
                                setDraftSubByItem((p) => ({ ...p, [subDraftKey]: { ...subDraft, responsable: e.target.value } }))
                              }
                              placeholder="Responsable"
                              className="w-36 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                            />
                            <input
                              type="date"
                              value={subDraft.due_date}
                              onChange={(e) =>
                                setDraftSubByItem((p) => ({ ...p, [subDraftKey]: { ...subDraft, due_date: e.target.value } }))
                              }
                              className="w-36 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => void handleAddSub(rev.id, tema, it.id)}
                              className="rounded bg-slate-700 px-3 py-1 text-xs font-medium text-white hover:bg-slate-600"
                            >
                              Agregar subacción
                            </button>
                          </div>
                        </div>

                        {sub.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {sub.map((s, idx) => renderItem(s, `${n}.${idx + 1}`, depth + 1))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div key={`${tema}-${rev.id}`} className="border border-slate-700 bg-slate-950/20 p-3">
                      {rev.id === -1 ? (
                        <div className="text-sm text-slate-500">Crea una fecha de revisión para empezar.</div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <input
                              value={draft.title}
                              onChange={(e) => setDraftByCell((p) => ({ ...p, [cellKey]: { ...draft, title: e.target.value } }))}
                              placeholder="Acción principal…"
                              className="flex-1 min-w-[200px] rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                            />
                            <input
                              value={draft.responsable}
                              onChange={(e) =>
                                setDraftByCell((p) => ({ ...p, [cellKey]: { ...draft, responsable: e.target.value } }))
                              }
                              placeholder="Responsable"
                              className="w-36 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                            />
                            <input
                              type="date"
                              value={draft.due_date}
                              onChange={(e) => setDraftByCell((p) => ({ ...p, [cellKey]: { ...draft, due_date: e.target.value } }))}
                              className="w-36 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => void handleAddItem(rev.id, tema)}
                              className="rounded bg-indigo-700 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-600"
                            >
                              Agregar acción
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3 items-center">
                            <select
                              value={chosenExisting}
                              onChange={(e) => setPickExistingByCell((p) => ({ ...p, [existingKey]: e.target.value ? Number(e.target.value) : "" }))}
                              className="flex-1 min-w-[260px] rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                            >
                              <option value="">Seleccionar acción de fecha anterior…</option>
                              {existingOptions.map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.title}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!chosenExisting}
                              onClick={() => void handleAddExisting(rev.id, tema)}
                              className="rounded bg-slate-700 px-3 py-1 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-50"
                            >
                              Agregar existente
                            </button>
                            <span className="text-[11px] text-slate-500">Copia una acción previa a esta fecha.</span>
                          </div>

                          {roots.length === 0 ? (
                            <div className="text-xs text-slate-500">Sin acciones en esta fecha.</div>
                          ) : (
                            <div className="space-y-2">
                              {roots.map((it, idx) => renderItem(it, String(idx + 1), 0))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AccionesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-slate-400">Cargando…</p>
        </div>
      }
    >
      <ActionRegisterContent />
    </Suspense>
  );
}

