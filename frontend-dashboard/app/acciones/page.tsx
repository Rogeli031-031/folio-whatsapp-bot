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
  fetchActionRegisterAttachments,
  uploadActionRegisterAttachment,
  deleteActionRegisterAttachment,
  getActionRegisterAttachmentUrl,
  createActionRegisterRevisionNote,
  deleteActionRegisterRevisionNote,
  type ActionRegisterAttachment,
  type ActionRegisterBoardResponse,
  type ActionRegisterItem,
  type ActionRegisterRevisionNote,
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

  const [photosByItem, setPhotosByItem] = useState<Record<number, ActionRegisterAttachment[]>>({});
  const [photosOpenByItem, setPhotosOpenByItem] = useState<Record<number, boolean>>({});
  const [photoUploadingByItem, setPhotoUploadingByItem] = useState<Record<number, boolean>>({});
  const [photoPreview, setPhotoPreview] = useState<{ itemId: number; index: number } | null>(null);

  const [noteDraftByRev, setNoteDraftByRev] = useState<Record<number, string>>({});
  const [noteSavingByRev, setNoteSavingByRev] = useState<Record<number, boolean>>({});

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

  const handleAddNote = useCallback(
    async (revisionId: number) => {
      if (!token) return;
      const draft = (noteDraftByRev[revisionId] || "").trim();
      if (!draft) return;
      setNoteSavingByRev((s) => ({ ...s, [revisionId]: true }));
      try {
        await createActionRegisterRevisionNote(token, revisionId, draft);
        setNoteDraftByRev((s) => ({ ...s, [revisionId]: "" }));
        await loadBoard();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error";
        alert("No se pudo guardar el comentario: " + msg);
      } finally {
        setNoteSavingByRev((s) => ({ ...s, [revisionId]: false }));
      }
    },
    [token, noteDraftByRev, loadBoard]
  );

  const handleDeleteNote = useCallback(
    async (noteId: number) => {
      if (!token) return;
      if (!confirm("¿Eliminar este comentario?")) return;
      try {
        await deleteActionRegisterRevisionNote(token, noteId);
        await loadBoard();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error";
        alert("No se pudo eliminar: " + msg);
      }
    },
    [token, loadBoard]
  );

  const temas = board?.temas || (["Contrataciones", "Mantenimiento", "General", "Clientes", "Apoyos", "Licencias", "Taller"] as ActionRegisterTema[]);
  const revisions = board?.revisions || [];
  const cells = board?.cells || {};
  const notesByRev: Record<string, ActionRegisterRevisionNote[]> = board?.notes || {};

  const allItemsByTema = useMemo(() => {
    const map = new Map<ActionRegisterTema, Map<number, ActionRegisterItem>>();
    for (const tema of temas) map.set(tema, new Map());
    for (const rid of Object.keys(cells)) {
      const byTema = cells[rid] || {};
      for (const tema of Object.keys(byTema)) {
        const t = tema as ActionRegisterTema;
        if (!map.has(t)) map.set(t, new Map());
        for (const it of (byTema[tema] || []) as ActionRegisterItem[]) {
          // Los items DICF son virtuales y solo lectura: no se deben poder
          // reutilizar como "acciones de fecha anterior" en otras columnas.
          if (it.dicf) continue;
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

  const loadPhotos = useCallback(
    async (itemId: number) => {
      if (!token) return;
      try {
        const r = await fetchActionRegisterAttachments(token, itemId);
        setPhotosByItem((prev) => ({ ...prev, [itemId]: r.attachments || [] }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error";
        if (msg.includes("401") || msg.toLowerCase().includes("token")) setUnauthorized(true);
        setError(msg);
      }
    },
    [token]
  );

  const togglePhotos = useCallback(
    async (itemId: number) => {
      const wasOpen = photosOpenByItem[itemId] === true;
      setPhotosOpenByItem((p) => ({ ...p, [itemId]: !wasOpen }));
      if (!wasOpen && !photosByItem[itemId]) {
        await loadPhotos(itemId);
      }
    },
    [photosOpenByItem, photosByItem, loadPhotos]
  );

  const handleUploadPhoto = useCallback(
    async (itemId: number, file: File) => {
      if (!token) return;
      if (!file.type.startsWith("image/")) {
        setError("Solo se admiten imágenes (JPG, PNG, WEBP, GIF).");
        return;
      }
      const MAX_BYTES = 8 * 1024 * 1024;
      if (file.size > MAX_BYTES) {
        setError(`La imagen es demasiado grande (máx ${Math.floor(MAX_BYTES / 1024 / 1024)}MB).`);
        return;
      }
      setPhotoUploadingByItem((p) => ({ ...p, [itemId]: true }));
      setError(null);
      try {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
          reader.readAsDataURL(file);
        });
        const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        await uploadActionRegisterAttachment(token, itemId, {
          fileBase64: base64,
          fileName: file.name || "foto.jpg",
          contentType: file.type || "image/jpeg",
        });
        setPhotosOpenByItem((p) => ({ ...p, [itemId]: true }));
        await loadPhotos(itemId);
        await loadBoard();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setPhotoUploadingByItem((p) => ({ ...p, [itemId]: false }));
      }
    },
    [token, loadPhotos, loadBoard]
  );

  const handleDeletePhoto = useCallback(
    async (itemId: number, attachmentId: number) => {
      if (!token) return;
      if (!window.confirm("¿Eliminar esta foto de evidencia?")) return;
      setError(null);
      try {
        await deleteActionRegisterAttachment(token, attachmentId);
        await loadPhotos(itemId);
        await loadBoard();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      }
    },
    [token, loadPhotos, loadBoard]
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
        {searchParams.get("back") === "1" && (
          <Link href={`/igf-forecast?t=${encodeURIComponent(token)}`} className="text-sm text-amber-300 hover:text-amber-200 underline">
            ← IGF Forecast
          </Link>
        )}
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

      {photoPreview && token && (() => {
        const list = photosByItem[photoPreview.itemId] || [];
        const att = list[photoPreview.index];
        if (!att) return null;
        const url = getActionRegisterAttachmentUrl(token, att.id);
        const canPrev = photoPreview.index > 0;
        const canNext = photoPreview.index < list.length - 1;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPhotoPreview(null)}
          >
            <div className="relative max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={att.file_name} className="max-h-[85vh] max-w-full rounded border border-slate-600" />
              <div className="mt-2 flex items-center justify-between gap-2 text-sm text-slate-200">
                <span className="truncate">
                  {att.file_name}
                  <span className="ml-2 text-xs text-slate-400">
                    {photoPreview.index + 1} / {list.length}
                  </span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canPrev}
                    onClick={() => setPhotoPreview((p) => (p ? { ...p, index: Math.max(0, p.index - 1) } : p))}
                    className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    disabled={!canNext}
                    onClick={() => setPhotoPreview((p) => (p ? { ...p, index: Math.min(list.length - 1, p.index + 1) } : p))}
                    className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                  >
                    Siguiente →
                  </button>
                  <a
                    href={url}
                    download={att.file_name}
                    className="rounded bg-emerald-700 px-3 py-1 text-xs text-white hover:bg-emerald-600"
                  >
                    Descargar
                  </a>
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="rounded bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-600"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

            {/* Fila de "Comentarios del día" — una celda por revisión, con lista + textarea para agregar. */}
            <div className="sticky left-0 z-10 border border-slate-700 bg-amber-950/30 px-3 py-3 text-sm font-medium text-amber-200">
              Comentarios del día
              <div className="mt-1 text-[11px] font-normal text-amber-200/60">
                Problemas, operativos, eventos
              </div>
            </div>
            {(revisions.length ? revisions : [{ id: -1, revision_date: "—" } as any]).map((rev) => {
              if (rev.id === -1) {
                return (
                  <div key={`notes-${rev.id}`} className="border border-slate-700 bg-amber-950/10 px-3 py-3 text-xs text-slate-500 italic">
                    Crea una columna de fecha para registrar comentarios.
                  </div>
                );
              }
              const ridKey = String(rev.id);
              const revNotes = notesByRev[ridKey] || [];
              const draft = noteDraftByRev[rev.id] || "";
              const saving = noteSavingByRev[rev.id] === true;
              return (
                <div key={`notes-${rev.id}`} className="border border-slate-700 bg-amber-950/10 px-3 py-3 space-y-2">
                  {revNotes.length === 0 && (
                    <div className="text-xs text-slate-500 italic">Sin comentarios.</div>
                  )}
                  {revNotes.map((n) => {
                    const dt = n.created_at ? new Date(n.created_at) : null;
                    const hora = dt && !isNaN(dt.getTime())
                      ? dt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })
                      : "";
                    return (
                      <div key={n.id} className="group relative rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 text-xs">
                        <div className="whitespace-pre-wrap text-amber-50">{n.body}</div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-amber-200/60">
                          <span>
                            {n.author_name || "—"}
                            {hora ? ` · ${hora}` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleDeleteNote(n.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-200 transition-opacity"
                            title="Eliminar comentario"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <textarea
                    placeholder="Agregar comentario del día..."
                    value={draft}
                    onChange={(e) => setNoteDraftByRev((s) => ({ ...s, [rev.id]: e.target.value }))}
                    rows={2}
                    className="w-full rounded border border-slate-600 bg-slate-900/60 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none resize-y"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddNote(rev.id)}
                    disabled={saving || draft.trim().length === 0}
                    className="text-xs rounded bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 px-3 py-1 text-white font-medium"
                  >
                    {saving ? "Guardando..." : "Agregar comentario"}
                  </button>
                </div>
              );
            })}

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
                    const photoInputId = `photo-input-${rev.id}-${it.id}`;
                    const photosOpen = photosOpenByItem[it.id] === true;
                    const photosList = photosByItem[it.id] || [];
                    const uploading = photoUploadingByItem[it.id] === true;
                    const countFromBoard = it.attachments_count || 0;
                    const photoCount = photosList.length > 0 ? photosList.length : countFromBoard;

                    // --- Render especial para acciones DICF (solo lectura) ---
                    if (it.dicf) {
                      const estado = (it.dicf_estado || "").toLowerCase();
                      const estadoLabel =
                        estado === "hecho"
                          ? "Cerrada"
                          : estado === "vencido"
                          ? "Vencida"
                          : estado === "compromiso_atrasado"
                          ? "Compromiso atrasado"
                          : estado === "pendiente"
                          ? "Pendiente"
                          : estado === "sin_compromiso"
                          ? "Sin compromiso"
                          : estado || "—";
                      const estadoCls =
                        estado === "hecho"
                          ? "bg-emerald-900/40 text-emerald-200 border-emerald-700/60"
                          : estado === "vencido" || estado === "compromiso_atrasado"
                          ? "bg-red-900/40 text-red-200 border-red-700/60"
                          : estado === "pendiente"
                          ? "bg-amber-900/40 text-amber-200 border-amber-700/60"
                          : "bg-slate-800/60 text-slate-300 border-slate-600";
                      const dicfHref =
                        token && it.dicf_public_code
                          ? `/dicf-accion?codigo=${encodeURIComponent(it.dicf_public_code)}&t=${encodeURIComponent(token)}`
                          : token
                          ? `/igf-forecast?t=${encodeURIComponent(token)}`
                          : "#";
                      return (
                        <div
                          key={it.id}
                          className={`rounded border border-blue-800/60 bg-blue-950/30 p-2 ${depth ? "ml-4" : ""}`}
                          title={it.dicf_resultado_cierre ? `Cierre: ${it.dicf_resultado_cierre}` : undefined}
                        >
                          <div className="flex items-start gap-2">
                            <div className="text-xs text-blue-300 mt-0.5 w-10 flex-shrink-0">{n}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1 mb-1">
                                <span className="rounded bg-blue-700/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">DICF</span>
                                {it.dicf_public_code && (
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
                                    {it.dicf_public_code}
                                  </span>
                                )}
                                <span className={`rounded border px-1.5 py-0.5 text-[10px] ${estadoCls}`}>
                                  {estadoLabel}
                                </span>
                                {it.dicf_compromiso_tarde && (
                                  <span className="rounded bg-red-900/40 border border-red-700/60 px-1.5 py-0.5 text-[10px] text-red-200">
                                    Compromiso tardío
                                  </span>
                                )}
                                {(it.dicf_canal || it.dicf_subcanal) && (
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                                    {[it.dicf_canal, it.dicf_subcanal].filter(Boolean).join(" · ")}
                                  </span>
                                )}
                              </div>
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
                            <a
                              href={dicfHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs rounded px-2 py-1 border border-blue-700 text-blue-200 hover:bg-blue-900/20 whitespace-nowrap"
                              title="Abrir panel DICF para editar compromiso, cerrar acción, etc."
                            >
                              Ver en DICF ↗
                            </a>
                          </div>
                        </div>
                      );
                    }

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
                              {photoCount > 0 && (
                                <span className="rounded bg-blue-900/40 px-2 py-0.5 text-blue-200 border border-blue-700/50">
                                  📷 {photoCount} foto{photoCount === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor={photoInputId}
                              className={`cursor-pointer text-xs rounded px-2 py-1 border border-blue-700 text-blue-200 hover:bg-blue-900/20 text-center ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                              title="Adjuntar foto como evidencia"
                            >
                              {uploading ? "Subiendo…" : "+ Foto"}
                            </label>
                            <input
                              id={photoInputId}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files && e.target.files[0];
                                if (f) void handleUploadPhoto(it.id, f);
                                e.currentTarget.value = "";
                              }}
                            />
                            {photoCount > 0 && (
                              <button
                                type="button"
                                onClick={() => void togglePhotos(it.id)}
                                className="text-xs rounded px-2 py-1 border border-slate-600 text-slate-200 hover:bg-slate-800"
                              >
                                {photosOpen ? "Ocultar" : "Ver fotos"}
                              </button>
                            )}
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
                        </div>

                        {photosOpen && photosList.length > 0 && token && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {photosList.map((att, idx) => {
                              const url = getActionRegisterAttachmentUrl(token, att.id);
                              return (
                                <div key={att.id} className="relative group">
                                  <button
                                    type="button"
                                    onClick={() => setPhotoPreview({ itemId: it.id, index: idx })}
                                    className="block h-20 w-20 overflow-hidden rounded border border-slate-600 bg-slate-950 hover:border-blue-400"
                                    title={att.file_name}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={att.file_name} className="h-full w-full object-cover" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeletePhoto(it.id, att.id)}
                                    className="absolute -top-1 -right-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-700 text-white text-[10px] border border-red-900"
                                    title="Eliminar foto"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

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

