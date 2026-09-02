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
  fetchActionRegisterResponsables,
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
  patchActionRegisterRevisionNote,
  deleteActionRegisterRevisionNote,
  fetchDicfAttachments,
  uploadDicfAttachment,
  deleteDicfAttachment,
  getDicfAttachmentUrl,
  fetchActionRegisterNoteAttachments,
  uploadActionRegisterNoteAttachment,
  deleteActionRegisterNoteAttachment,
  getActionRegisterNoteAttachmentUrl,
  getActionRegisterDailyPdfUrl,
  type ActionRegisterAttachment,
  type ActionRegisterBoardResponse,
  type ActionRegisterItem,
  type ActionRegisterNoteAttachment,
  type ActionRegisterRevisionNote,
  type ActionRegisterTema,
  ACTION_REGISTER_TEMAS,
  type DicfAttachment,
} from "@/lib/api";
import { DirectorIaChatModal } from "@/modules/director-ia/components/DirectorIaChatModal";

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

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOf(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  const dow = d.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDaysYmd(ymd, delta);
}

function weekRangeLabel(monday: string): string {
  const sunday = addDaysYmd(monday, 6);
  const a = fmtDMY(monday);
  const b = fmtDMY(sunday);
  return `Semana ${a.slice(0, 5)} – ${b.slice(0, 5)}`;
}

function firstLine(body: string, max = 140): string {
  const line = String(body || "").replace(/\s+/g, " ").trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max).trimEnd()}…`;
}

function ownActionStatus(it: ActionRegisterItem): "Terminada" | "Vencida" | "Abierta" {
  if (it.closed) return "Terminada";
  const due = toYmd(it.due_date);
  if (due && due < ymdToday()) return "Vencida";
  return "Abierta";
}

type BoardView = "vivo" | "matriz";
type CaptureKind = "comentario" | "accion";

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
  const [responsables, setResponsables] = useState<Array<{ id: number; nombre: string; rol_clave?: string }>>([]);

  const [board, setBoard] = useState<ActionRegisterBoardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newRevisionDate, setNewRevisionDate] = useState<string>(ymdToday());

  const [draftByCell, setDraftByCell] = useState<Record<string, { title: string; responsable_id: number | ""; due_date: string }>>({});
  const [draftSubByItem, setDraftSubByItem] = useState<Record<string, { title: string; responsable_id: number | ""; due_date: string }>>({});
  const [pickExistingByCell, setPickExistingByCell] = useState<Record<string, number | "">>({});
  const [editItemById, setEditItemById] = useState<Record<number, { title: string; responsable_id: number | ""; due_date: string }>>({});
  const [itemSavingById, setItemSavingById] = useState<Record<number, boolean>>({});

  const [photosByItem, setPhotosByItem] = useState<Record<number, (ActionRegisterAttachment | DicfAttachment)[]>>({});
  const [photosOpenByItem, setPhotosOpenByItem] = useState<Record<number, boolean>>({});
  const [photoUploadingByItem, setPhotoUploadingByItem] = useState<Record<number, boolean>>({});
  const [photoPreview, setPhotoPreview] = useState<{ itemId: number; index: number } | null>(null);
  const [directorIaChatOpen, setDirectorIaChatOpen] = useState(false);
  const [boardView, setBoardView] = useState<BoardView>("vivo");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureKind, setCaptureKind] = useState<CaptureKind>("accion");
  const [captureRevisionId, setCaptureRevisionId] = useState<number | null>(null);
  const [captureTema, setCaptureTema] = useState<ActionRegisterTema>("Mantenimiento");
  const [captureParentId, setCaptureParentId] = useState<number | null>(null);
  const [emptyTemasOpen, setEmptyTemasOpen] = useState(false);
  const [expandedEmptyRevIds, setExpandedEmptyRevIds] = useState<number[]>([]);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});

  const plantaNombre = useMemo(
    () => plantas.find((p) => p.id === plantaId)?.nombre,
    [plantas, plantaId]
  );

  const [noteDraftByRev, setNoteDraftByRev] = useState<Record<number, string>>({});
  const [noteSavingByRev, setNoteSavingByRev] = useState<Record<number, boolean>>({});
  const [noteEditById, setNoteEditById] = useState<Record<number, { draft: string }>>({});
  const [noteEditingById, setNoteEditingById] = useState<Record<number, boolean>>({});
  // Fotos de comentarios del día (notas por revisión).
  const [notePhotosById, setNotePhotosById] = useState<Record<number, ActionRegisterNoteAttachment[]>>({});
  const [notePhotosOpenById, setNotePhotosOpenById] = useState<Record<number, boolean>>({});
  const [notePhotoUploadingById, setNotePhotoUploadingById] = useState<Record<number, boolean>>({});
  const [notePhotoPreview, setNotePhotoPreview] = useState<{ noteId: number; index: number } | null>(null);
  // Archivos seleccionados antes de publicar el comentario (se suben al crearlo).
  const [notePendingFilesByRev, setNotePendingFilesByRev] = useState<Record<number, File[]>>({});

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

  const loadResponsables = useCallback(async () => {
    if (!token || !plantaId) return;
    try {
      const r = await fetchActionRegisterResponsables(token, plantaId);
      setResponsables((r.usuarios || []).map((u) => ({ id: u.id, nombre: u.nombre, rol_clave: u.rol_clave })));
    } catch {
      setResponsables([]);
    }
  }, [token, plantaId]);

  useEffect(() => {
    void loadResponsables();
  }, [loadResponsables]);

  const handleAddNote = useCallback(
    async (revisionId: number) => {
      if (!token) return;
      const draft = (noteDraftByRev[revisionId] || "").trim();
      const pendingFiles = notePendingFilesByRev[revisionId] || [];
      if (!draft && pendingFiles.length === 0) return;
      // Si solo hay fotos sin texto, obliga a poner algo. Un comentario es requerido.
      if (!draft) {
        alert("Escribe un comentario antes de adjuntar fotos.");
        return;
      }
      setNoteSavingByRev((s) => ({ ...s, [revisionId]: true }));
      try {
        const res = await createActionRegisterRevisionNote(token, revisionId, draft);
        const newNoteId = res && res.note && res.note.id ? Number(res.note.id) : null;
        if (newNoteId && pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            try {
              const dataUrl: string = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
                reader.readAsDataURL(file);
              });
              const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
              await uploadActionRegisterNoteAttachment(token, newNoteId, {
                fileBase64: base64,
                fileName: file.name || "foto.jpg",
                contentType: file.type || "image/jpeg",
              });
            } catch (upErr) {
              console.error("[uploadActionRegisterNoteAttachment]", upErr);
            }
          }
        }
        setNoteDraftByRev((s) => ({ ...s, [revisionId]: "" }));
        setNotePendingFilesByRev((s) => ({ ...s, [revisionId]: [] }));
        await loadBoard();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error";
        alert("No se pudo guardar el comentario: " + msg);
      } finally {
        setNoteSavingByRev((s) => ({ ...s, [revisionId]: false }));
      }
    },
    [token, noteDraftByRev, notePendingFilesByRev, loadBoard]
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

  const handleStartEditNote = useCallback((noteId: number, currentBody: string) => {
    setNoteEditById((s) => ({ ...s, [noteId]: { draft: String(currentBody || "") } }));
  }, []);

  const handleCancelEditNote = useCallback((noteId: number) => {
    setNoteEditById((s) => {
      const next = { ...s };
      delete next[noteId];
      return next;
    });
  }, []);

  const handleSaveEditNote = useCallback(
    async (noteId: number) => {
      if (!token) return;
      const draft = (noteEditById[noteId]?.draft || "").trim();
      if (!draft) return;
      setNoteEditingById((s) => ({ ...s, [noteId]: true }));
      try {
        await patchActionRegisterRevisionNote(token, noteId, draft);
        handleCancelEditNote(noteId);
        await loadBoard();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error";
        alert("No se pudo actualizar el comentario: " + msg);
      } finally {
        setNoteEditingById((s) => ({ ...s, [noteId]: false }));
      }
    },
    [token, noteEditById, loadBoard, handleCancelEditNote]
  );

  const loadNotePhotos = useCallback(
    async (noteId: number) => {
      if (!token) return;
      try {
        const r = await fetchActionRegisterNoteAttachments(token, noteId);
        setNotePhotosById((prev) => ({ ...prev, [noteId]: r.attachments || [] }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error";
        if (msg.includes("401") || msg.toLowerCase().includes("token")) setUnauthorized(true);
        setError(msg);
      }
    },
    [token]
  );

  const toggleNotePhotos = useCallback(
    async (noteId: number) => {
      const wasOpen = notePhotosOpenById[noteId] === true;
      setNotePhotosOpenById((p) => ({ ...p, [noteId]: !wasOpen }));
      if (!wasOpen && !notePhotosById[noteId]) {
        await loadNotePhotos(noteId);
      }
    },
    [notePhotosOpenById, notePhotosById, loadNotePhotos]
  );

  const handleUploadNotePhoto = useCallback(
    async (noteId: number, file: File) => {
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
      setNotePhotoUploadingById((p) => ({ ...p, [noteId]: true }));
      setError(null);
      try {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
          reader.readAsDataURL(file);
        });
        const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        await uploadActionRegisterNoteAttachment(token, noteId, {
          fileBase64: base64,
          fileName: file.name || "foto.jpg",
          contentType: file.type || "image/jpeg",
        });
        setNotePhotosOpenById((p) => ({ ...p, [noteId]: true }));
        await loadNotePhotos(noteId);
        await loadBoard();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setNotePhotoUploadingById((p) => ({ ...p, [noteId]: false }));
      }
    },
    [token, loadNotePhotos, loadBoard]
  );

  const handleDeleteNotePhoto = useCallback(
    async (noteId: number, attachmentId: number) => {
      if (!token) return;
      if (!window.confirm("¿Eliminar esta foto?")) return;
      setError(null);
      try {
        await deleteActionRegisterNoteAttachment(token, attachmentId);
        await loadNotePhotos(noteId);
        await loadBoard();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      }
    },
    [token, loadNotePhotos, loadBoard]
  );

  const temas = board?.temas || [...ACTION_REGISTER_TEMAS];
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
      const d = draftByCell[key] || { title: "", responsable_id: "", due_date: "" };
      if (!d.title.trim() || d.responsable_id === "") return;
      setError(null);
      try {
        await createActionRegisterItem(token, {
          planta_id: plantaId,
          revision_id,
          tema,
          title: d.title,
          responsable_usuario_id: Number(d.responsable_id),
          due_date: d.due_date || null,
        });
        setDraftByCell((prev) => ({ ...prev, [key]: { title: "", responsable_id: "", due_date: "" } }));
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
      const d = draftSubByItem[key] || { title: "", responsable_id: "", due_date: "" };
      if (!d.title.trim() || d.responsable_id === "") return;
      setError(null);
      try {
        await createActionRegisterItem(token, {
          planta_id: plantaId,
          revision_id,
          tema,
          parent_id,
          title: d.title,
          responsable_usuario_id: Number(d.responsable_id),
          due_date: d.due_date || null,
        });
        setDraftSubByItem((prev) => ({ ...prev, [key]: { title: "", responsable_id: "", due_date: "" } }));
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

  const handleStartEditItem = useCallback((it: ActionRegisterItem) => {
    if (it.dicf) return; // DICF es solo lectura.
    setEditItemById((s) => ({
      ...s,
      [it.id]: {
        title: String(it.title || ""),
        responsable_id: it.responsable_usuario_id != null ? Number(it.responsable_usuario_id) : "",
        due_date: it.due_date ? String(it.due_date).slice(0, 10) : "",
      },
    }));
  }, []);

  const handleCancelEditItem = useCallback((itemId: number) => {
    setEditItemById((s) => {
      const next = { ...s };
      delete next[itemId];
      return next;
    });
  }, []);

  const handleSaveEditItem = useCallback(
    async (itemId: number) => {
      if (!token) return;
      const draft = editItemById[itemId];
      if (!draft) return;
      const title = (draft.title || "").trim();
      if (title.length < 2) return;
      if (draft.responsable_id === "") return;
      setItemSavingById((s) => ({ ...s, [itemId]: true }));
      try {
        await patchActionRegisterItem(token, itemId, {
          title,
          responsable_usuario_id: Number(draft.responsable_id),
          due_date: draft.due_date ? draft.due_date : null,
        });
        handleCancelEditItem(itemId);
        await loadBoard();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error";
        alert("No se pudo actualizar la acción: " + msg);
      } finally {
        setItemSavingById((s) => ({ ...s, [itemId]: false }));
      }
    },
    [token, editItemById, loadBoard, handleCancelEditItem]
  );

  const loadPhotos = useCallback(
    async (item: ActionRegisterItem) => {
      if (!token) return;
      try {
        const r = item.dicf && item.dicf_id
          ? await fetchDicfAttachments(token, item.dicf_id)
          : await fetchActionRegisterAttachments(token, item.id);
        setPhotosByItem((prev) => ({ ...prev, [item.id]: r.attachments || [] }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error";
        if (msg.includes("401") || msg.toLowerCase().includes("token")) setUnauthorized(true);
        setError(msg);
      }
    },
    [token]
  );

  const togglePhotos = useCallback(
    async (item: ActionRegisterItem) => {
      const wasOpen = photosOpenByItem[item.id] === true;
      setPhotosOpenByItem((p) => ({ ...p, [item.id]: !wasOpen }));
      if (!wasOpen && !photosByItem[item.id]) {
        await loadPhotos(item);
      }
    },
    [photosOpenByItem, photosByItem, loadPhotos]
  );

  const handleUploadPhoto = useCallback(
    async (item: ActionRegisterItem, file: File) => {
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
      setPhotoUploadingByItem((p) => ({ ...p, [item.id]: true }));
      setError(null);
      try {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
          reader.readAsDataURL(file);
        });
        const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        if (item.dicf && item.dicf_id) {
          await uploadDicfAttachment(token, item.dicf_id, {
            fileBase64: base64,
            fileName: file.name || "foto.jpg",
            contentType: file.type || "image/jpeg",
          });
        } else {
          await uploadActionRegisterAttachment(token, item.id, {
            fileBase64: base64,
            fileName: file.name || "foto.jpg",
            contentType: file.type || "image/jpeg",
          });
        }
        setPhotosOpenByItem((p) => ({ ...p, [item.id]: true }));
        await loadPhotos(item);
        await loadBoard();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setPhotoUploadingByItem((p) => ({ ...p, [item.id]: false }));
      }
    },
    [token, loadPhotos, loadBoard]
  );

  const handleDeletePhoto = useCallback(
    async (item: ActionRegisterItem, attachmentId: number) => {
      if (!token) return;
      if (!window.confirm("¿Eliminar esta foto de evidencia?")) return;
      setError(null);
      try {
        if (item.dicf) {
          await deleteDicfAttachment(token, attachmentId);
        } else {
          await deleteActionRegisterAttachment(token, attachmentId);
        }
        await loadPhotos(item);
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

  const openCapture = useCallback(
    (opts: {
      kind: CaptureKind;
      revisionId?: number | null;
      tema?: ActionRegisterTema;
      parentId?: number | null;
    }) => {
      setCaptureKind(opts.kind);
      setCaptureRevisionId(opts.revisionId ?? (revisions[0]?.id ?? null));
      setCaptureTema(opts.tema || temas[0] || "Mantenimiento");
      setCaptureParentId(opts.parentId ?? null);
      setCaptureOpen(true);
    },
    [revisions, temas]
  );

  const closeCapture = useCallback(() => {
    setCaptureOpen(false);
    setCaptureParentId(null);
  }, []);

  const revisionHasContent = useCallback(
    (revId: number) => {
      const notes = notesByRev[String(revId)] || [];
      if (notes.length > 0) return true;
      const byTema = cells[String(revId)] || {};
      return Object.values(byTema).some((arr) => Array.isArray(arr) && arr.length > 0);
    },
    [notesByRev, cells]
  );

  const weeks = useMemo(() => {
    const groups: { monday: string; label: string; revisions: typeof revisions }[] = [];
    const byMonday = new Map<string, typeof revisions>();
    for (const r of revisions) {
      const ymd = toYmd(r.revision_date);
      if (!ymd) continue;
      const monday = mondayOf(ymd);
      if (!byMonday.has(monday)) byMonday.set(monday, []);
      byMonday.get(monday)!.push(r);
    }
    const mondays = Array.from(byMonday.keys()).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    for (const monday of mondays) {
      groups.push({
        monday,
        label: weekRangeLabel(monday),
        revisions: byMonday.get(monday) || [],
      });
    }
    return groups;
  }, [revisions]);

  const latestMonday = weeks[0]?.monday || "";

  const temaActivity = useMemo(() => {
    const counts = new Map<ActionRegisterTema, { total: number; open: number }>();
    for (const tema of temas) counts.set(tema, { total: 0, open: 0 });
    for (const byTema of Object.values(cells)) {
      for (const tema of Object.keys(byTema || {})) {
        const t = tema as ActionRegisterTema;
        const items = (byTema[tema] || []) as ActionRegisterItem[];
        if (!counts.has(t)) counts.set(t, { total: 0, open: 0 });
        const c = counts.get(t)!;
        for (const it of items) {
          if (it.parent_id != null) continue;
          c.total += 1;
          if (!it.closed) c.open += 1;
        }
      }
    }
    return counts;
  }, [cells, temas]);

  const temasConActividad = temas.filter((t) => (temaActivity.get(t)?.total || 0) > 0);
  const temasSinAcciones = temas.filter((t) => (temaActivity.get(t)?.total || 0) === 0);

  const renderNoteCard = (n: ActionRegisterRevisionNote) => {
    const dt = n.created_at ? new Date(n.created_at) : null;
    const hora =
      dt && !isNaN(dt.getTime())
        ? dt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })
        : "";
    const notePhotoInputId = `note-photo-input-${n.id}`;
    const notePhotosOpen = notePhotosOpenById[n.id] === true;
    const notePhotosList = notePhotosById[n.id] || [];
    const noteUploading = notePhotoUploadingById[n.id] === true;
    const noteCountFromBoard = n.attachments_count || 0;
    const notePhotoCount = notePhotosList.length > 0 ? notePhotosList.length : noteCountFromBoard;
    const edit = noteEditById[n.id];
    const isEditing = !!edit;
    const savingEdit = noteEditingById[n.id] === true;
    return (
      <div key={n.id} className="group relative rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 text-xs">
        {!isEditing ? (
          <div className="whitespace-pre-wrap text-amber-50">{n.body}</div>
        ) : (
          <textarea
            value={edit.draft}
            onChange={(e) => setNoteEditById((s) => ({ ...s, [n.id]: { draft: e.target.value } }))}
            rows={3}
            className="w-full rounded border border-amber-500/30 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none resize-y"
            disabled={savingEdit}
          />
        )}
        <div className="mt-1 flex items-center justify-between text-[10px] text-amber-200/60">
          <span>
            {n.author_name || "—"}
            {hora ? ` · ${hora}` : ""}
          </span>
          <div className="flex items-center gap-1.5">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => handleStartEditNote(n.id, n.body)}
                className="opacity-0 group-hover:opacity-100 text-amber-200 hover:text-amber-100 transition-opacity"
                title="Editar comentario"
              >
                Editar
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleSaveEditNote(n.id)}
                  disabled={savingEdit || !edit.draft.trim()}
                  className="text-amber-200 hover:text-amber-100 disabled:opacity-40"
                  title="Guardar cambios"
                >
                  {savingEdit ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelEditNote(n.id)}
                  disabled={savingEdit}
                  className="text-slate-300 hover:text-white disabled:opacity-40"
                  title="Cancelar"
                >
                  Cancelar
                </button>
              </>
            )}
            <label
              htmlFor={notePhotoInputId}
              className={`cursor-pointer text-amber-200 hover:text-amber-100 ${noteUploading ? "opacity-60 pointer-events-none" : ""}`}
              title="Agregar foto"
            >
              {noteUploading ? "Subiendo…" : "+ Foto"}
            </label>
            <input
              id={notePhotoInputId}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) void handleUploadNotePhoto(n.id, f);
                e.currentTarget.value = "";
              }}
            />
            {notePhotoCount > 0 && (
              <button
                type="button"
                onClick={() => void toggleNotePhotos(n.id)}
                className="text-amber-200 hover:text-amber-100"
                title={notePhotosOpen ? "Ocultar fotos" : "Ver fotos"}
              >
                {notePhotosOpen ? "Ocultar" : `📷 ${notePhotoCount}`}
              </button>
            )}
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
        {notePhotosOpen && notePhotosList.length > 0 && token && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {notePhotosList.map((att, idx) => {
              const url = getActionRegisterNoteAttachmentUrl(token, att.id);
              return (
                <div key={att.id} className="relative group/photo">
                  <button
                    type="button"
                    onClick={() => setNotePhotoPreview({ noteId: n.id, index: idx })}
                    className="block h-16 w-16 overflow-hidden rounded border border-amber-500/40 bg-slate-950 hover:border-amber-300"
                    title={att.file_name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={att.file_name} className="h-full w-full object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteNotePhoto(n.id, att.id)}
                    className="absolute -top-1 -right-1 hidden group-hover/photo:flex h-4 w-4 items-center justify-center rounded-full bg-red-700 text-white text-[9px] border border-red-900"
                    title="Eliminar foto"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderItem = (
    it: ActionRegisterItem,
    n: string,
    depth: number,
    rev: { id: number; revision_date: string },
    tema: ActionRegisterTema,
    children: Record<number, ActionRegisterItem[]>
  ) => {
    const sub = (children[it.id] || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
    const closedCls = it.closed ? "line-through text-slate-500" : "text-slate-100";
    const photoInputId = `photo-input-${rev.id}-${it.id}`;
    const photosOpen = photosOpenByItem[it.id] === true;
    const photosList = photosByItem[it.id] || [];
    const uploading = photoUploadingByItem[it.id] === true;
    const countFromBoard = it.attachments_count || 0;
    const photoCount = photosList.length > 0 ? photosList.length : countFromBoard;
    const edit = editItemById[it.id];
    const isEditing = !!edit;
    const savingEdit = itemSavingById[it.id] === true;
    const ownStatus = ownActionStatus(it);
    const ownStatusCls =
      ownStatus === "Terminada"
        ? "bg-slate-800 text-slate-300 border-slate-600"
        : ownStatus === "Vencida"
        ? "bg-red-900/40 text-red-200 border-red-700/60"
        : "bg-slate-800 text-slate-200 border-slate-600";

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
                <span className={`rounded border px-1.5 py-0.5 text-[10px] ${estadoCls}`}>{estadoLabel}</span>
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
            <div className="flex flex-col items-end gap-1">
              <a
                href={dicfHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs rounded px-2 py-1 border border-blue-700 text-blue-200 hover:bg-blue-900/20 whitespace-nowrap"
                title="Abrir panel DICF para editar compromiso, cerrar acción, etc."
              >
                Ver en DICF ↗
              </a>
              <div className="flex items-center gap-1">
                <label
                  htmlFor={photoInputId}
                  className={`text-xs rounded px-2 py-1 border border-blue-700 text-blue-200 hover:bg-blue-900/20 cursor-pointer ${
                    uploading ? "opacity-60 pointer-events-none" : ""
                  }`}
                  title="Agregar foto de evidencia"
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
                    if (f) void handleUploadPhoto(it, f);
                    e.currentTarget.value = "";
                  }}
                />
                {photoCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void togglePhotos(it)}
                    className="text-xs rounded px-2 py-1 border border-slate-600 text-slate-200 hover:bg-slate-800 whitespace-nowrap"
                  >
                    {photosOpen ? "Ocultar" : `📷 ${photoCount}`}
                  </button>
                )}
              </div>
            </div>
          </div>
          {photosOpen && photosList.length > 0 && token && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photosList.map((att, idx) => {
                const url = getDicfAttachmentUrl(token, att.id);
                return (
                  <div key={att.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => setPhotoPreview({ itemId: it.id, index: idx })}
                      className="block h-20 w-20 overflow-hidden rounded border border-blue-700 bg-slate-950 hover:border-blue-400"
                      title={att.file_name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={att.file_name} className="h-full w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeletePhoto(it, att.id)}
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
        </div>
      );
    }

    return (
      <div key={it.id} className={`rounded border border-slate-700 bg-slate-900/50 p-2 ${depth ? "ml-4" : ""}`}>
        <div className="flex items-start gap-2">
          <div className="text-xs text-slate-400 mt-0.5 w-10 flex-shrink-0">{n}</div>
          <div className="flex-1 min-w-0">
            {!isEditing ? (
              <div className={`text-sm ${closedCls}`}>{it.title}</div>
            ) : (
              <input
                value={edit.title}
                onChange={(e) => setEditItemById((s) => ({ ...s, [it.id]: { ...edit, title: e.target.value } }))}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                disabled={savingEdit}
              />
            )}
            <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
              <span className={`rounded border px-2 py-0.5 ${ownStatusCls}`}>{ownStatus}</span>
              {!isEditing ? (
                <>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">
                    Resp: <span className="text-amber-200">{it.responsable || "—"}</span>
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">
                    Compromiso: <span className="text-emerald-200">{it.due_date ? fmtDMY(it.due_date) : "—"}</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200 inline-flex items-center gap-1">
                    Resp:
                    <select
                      value={edit.responsable_id}
                      onChange={(e) =>
                        setEditItemById((s) => ({
                          ...s,
                          [it.id]: { ...edit, responsable_id: e.target.value ? Number(e.target.value) : "" },
                        }))
                      }
                      className="ml-1 w-44 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                      disabled={savingEdit}
                    >
                      <option value="">— Elegir —</option>
                      {responsables.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre}
                          {u.rol_clave ? ` (${u.rol_clave})` : ""}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200 inline-flex items-center gap-1">
                    Compromiso:
                    <input
                      type="date"
                      value={edit.due_date}
                      onChange={(e) => setEditItemById((s) => ({ ...s, [it.id]: { ...edit, due_date: e.target.value } }))}
                      className="ml-1 w-36 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                      disabled={savingEdit}
                    />
                  </span>
                </>
              )}
              {photoCount > 0 && (
                <span className="rounded bg-blue-900/40 px-2 py-0.5 text-blue-200 border border-blue-700/50">
                  📷 {photoCount} foto{photoCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {!it.dicf && !isEditing && (
              <button
                type="button"
                onClick={() => handleStartEditItem(it)}
                className="text-xs rounded px-2 py-1 border border-slate-600 text-slate-200 hover:bg-slate-800"
                title="Editar acción"
              >
                Editar
              </button>
            )}
            {!it.dicf && isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => void handleSaveEditItem(it.id)}
                  disabled={savingEdit || !edit.title.trim()}
                  className="text-xs rounded px-2 py-1 border border-emerald-700 text-emerald-200 hover:bg-emerald-900/20 disabled:opacity-40"
                  title="Guardar cambios"
                >
                  {savingEdit ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelEditItem(it.id)}
                  disabled={savingEdit}
                  className="text-xs rounded px-2 py-1 border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                  title="Cancelar"
                >
                  Cancelar
                </button>
              </>
            )}
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
                if (f) void handleUploadPhoto(it, f);
                e.currentTarget.value = "";
              }}
            />
            {photoCount > 0 && (
              <button
                type="button"
                onClick={() => void togglePhotos(it)}
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
            {!it.dicf && (
              <button
                type="button"
                onClick={() => openCapture({ kind: "accion", revisionId: rev.id, tema, parentId: it.id })}
                className="text-xs rounded px-2 py-1 border border-slate-600 text-slate-200 hover:bg-slate-800"
                title="Agregar subacción"
              >
                + Subacción
              </button>
            )}
          </div>
        </div>

        {photosOpen && photosList.length > 0 && token && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photosList.map((att, idx) => {
              const url = it.dicf ? getDicfAttachmentUrl(token, att.id) : getActionRegisterAttachmentUrl(token, att.id);
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
                    onClick={() => void handleDeletePhoto(it, att.id)}
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

        {sub.length > 0 && (
          <div className="mt-2 space-y-2">
            {sub.map((s, idx) => renderItem(s, `${n}.${idx + 1}`, depth + 1, rev, tema, children))}
          </div>
        )}
      </div>
    );
  };

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

        {plantaId && (
          <button
            type="button"
            onClick={() => setDirectorIaChatOpen(true)}
            className="inline-flex items-center gap-2 rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 shrink-0"
            title="Preguntas ejecutivas sobre la planta seleccionada"
          >
            Chat Director IA
          </button>
        )}

        {token && (
          <a
            href={`/director-ia?t=${encodeURIComponent(token)}${plantaId ? `&planta_id=${plantaId}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 shrink-0"
            title="Bitácora, entidades comerciales, mejora continua y contexto ejecutivo"
          >
            Director IA
          </a>
        )}

        {loading && <span className="text-sm text-slate-400">Cargando…</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
        {!loading && revisions.length === 0 && <span className="text-sm text-slate-400">Aún no hay fechas de revisión para esta planta.</span>}

        <div className="flex items-center gap-2 ml-auto">
          <div className="inline-flex rounded border border-slate-600 overflow-hidden">
            <button
              type="button"
              onClick={() => setBoardView("vivo")}
              className={`px-3 py-1.5 text-xs font-medium ${
                boardView === "vivo" ? "bg-slate-100 text-slate-900" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Registro vivo
            </button>
            <button
              type="button"
              onClick={() => setBoardView("matriz")}
              className={`px-3 py-1.5 text-xs font-medium ${
                boardView === "matriz" ? "bg-slate-100 text-slate-900" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Matriz por fecha
            </button>
          </div>
          <button
            type="button"
            onClick={() => openCapture({ kind: "accion", revisionId: revisions[0]?.id ?? null })}
            className="inline-flex items-center rounded bg-indigo-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600"
          >
            + Agregar
          </button>
        </div>
      </div>

      {photoPreview && token && (() => {
        const list = photosByItem[photoPreview.itemId] || [];
        const att = list[photoPreview.index];
        if (!att) return null;
        const isDicf = photoPreview.itemId < 0;
        const url = isDicf
          ? getDicfAttachmentUrl(token, att.id)
          : getActionRegisterAttachmentUrl(token, att.id);
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

      {notePhotoPreview && token && (() => {
        const list = notePhotosById[notePhotoPreview.noteId] || [];
        const att = list[notePhotoPreview.index];
        if (!att) return null;
        const url = getActionRegisterNoteAttachmentUrl(token, att.id);
        const canPrev = notePhotoPreview.index > 0;
        const canNext = notePhotoPreview.index < list.length - 1;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setNotePhotoPreview(null)}
          >
            <div className="relative max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={att.file_name} className="max-h-[85vh] max-w-full rounded border border-amber-500/40" />
              <div className="mt-2 flex items-center justify-between gap-2 text-sm text-slate-200">
                <span className="truncate">
                  {att.file_name}
                  <span className="ml-2 text-xs text-slate-400">
                    {notePhotoPreview.index + 1} / {list.length}
                  </span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canPrev}
                    onClick={() => setNotePhotoPreview((p) => (p ? { ...p, index: Math.max(0, p.index - 1) } : p))}
                    className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    disabled={!canNext}
                    onClick={() => setNotePhotoPreview((p) => (p ? { ...p, index: Math.min(list.length - 1, p.index + 1) } : p))}
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
                    onClick={() => setNotePhotoPreview(null)}
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

      {captureOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button type="button" className="flex-1 bg-black/50" onClick={closeCapture} aria-label="Cerrar panel de captura" />
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-slate-700 bg-slate-900 p-4 shadow-none">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold text-white">
                {captureParentId != null ? "Agregar subacción" : "Agregar"}
              </h2>
              <button
                type="button"
                onClick={closeCapture}
                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
            {captureParentId == null && (
              <div className="mb-3 inline-flex rounded border border-slate-600 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCaptureKind("comentario")}
                  className={`px-3 py-1.5 text-xs ${
                    captureKind === "comentario" ? "bg-amber-700 text-white" : "bg-slate-950 text-slate-300"
                  }`}
                >
                  Comentario del día
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureKind("accion")}
                  className={`px-3 py-1.5 text-xs ${
                    captureKind === "accion" ? "bg-indigo-700 text-white" : "bg-slate-950 text-slate-300"
                  }`}
                >
                  Acción
                </button>
              </div>
            )}
            <div className="space-y-3">
              <label className="block text-xs text-slate-300">
                Fecha
                <select
                  value={captureRevisionId ?? ""}
                  onChange={(e) => setCaptureRevisionId(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                >
                  <option value="">Seleccionar fecha…</option>
                  {revisions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {fmtDMY(r.revision_date)}
                    </option>
                  ))}
                </select>
              </label>

              {captureKind === "comentario" && captureParentId == null ? (
                <>
                  <label className="block text-xs text-slate-300">
                    Comentario
                    <textarea
                      value={captureRevisionId != null ? noteDraftByRev[captureRevisionId] || "" : ""}
                      onChange={(e) => {
                        if (captureRevisionId == null) return;
                        setNoteDraftByRev((s) => ({ ...s, [captureRevisionId]: e.target.value }));
                      }}
                      rows={4}
                      placeholder="Problema, operativo o evento del día…"
                      className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
                      disabled={captureRevisionId == null || noteSavingByRev[captureRevisionId] === true}
                    />
                  </label>
                  {captureRevisionId != null && (notePendingFilesByRev[captureRevisionId] || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(notePendingFilesByRev[captureRevisionId] || []).map((f, idx) => {
                        const url = URL.createObjectURL(f);
                        return (
                          <div key={`${f.name}-${idx}`} className="relative group/pend">
                            <div className="block h-14 w-14 overflow-hidden rounded border border-amber-500/40 bg-slate-950">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={f.name}
                                className="h-full w-full object-cover"
                                onLoad={() => {
                                  try {
                                    URL.revokeObjectURL(url);
                                  } catch {
                                    /* ignore */
                                  }
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setNotePendingFilesByRev((s) => ({
                                  ...s,
                                  [captureRevisionId]: (s[captureRevisionId] || []).filter((_, i) => i !== idx),
                                }))
                              }
                              className="absolute -top-1 -right-1 hidden group-hover/pend:flex h-4 w-4 items-center justify-center rounded-full bg-red-700 text-white text-[9px] border border-red-900"
                              title="Quitar"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="capture-note-photo"
                      className="text-xs rounded border border-amber-500/40 px-2 py-1 text-amber-200 hover:bg-amber-500/10 cursor-pointer"
                    >
                      + Foto
                    </label>
                    <input
                      id="capture-note-photo"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      className="hidden"
                      disabled={captureRevisionId == null}
                      onChange={(e) => {
                        if (captureRevisionId == null) return;
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setNotePendingFilesByRev((s) => ({
                            ...s,
                            [captureRevisionId]: [...(s[captureRevisionId] || []), ...files],
                          }));
                        }
                        e.currentTarget.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={
                        captureRevisionId == null ||
                        noteSavingByRev[captureRevisionId || -1] === true ||
                        !(noteDraftByRev[captureRevisionId || -1] || "").trim()
                      }
                      onClick={() => {
                        if (captureRevisionId == null) return;
                        void handleAddNote(captureRevisionId).then(() => closeCapture());
                      }}
                      className="rounded bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      {captureRevisionId != null && noteSavingByRev[captureRevisionId]
                        ? "Guardando..."
                        : "Agregar comentario"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {captureParentId == null && (
                    <label className="block text-xs text-slate-300">
                      Tema
                      <select
                        value={captureTema}
                        onChange={(e) => setCaptureTema(e.target.value as ActionRegisterTema)}
                        className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                      >
                        {temas.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {(() => {
                    const cellKey =
                      captureRevisionId != null
                        ? captureParentId != null
                          ? `${captureRevisionId}|${captureParentId}`
                          : `${captureRevisionId}|${captureTema}`
                        : "";
                    const draft =
                      captureParentId != null
                        ? draftSubByItem[cellKey] || { title: "", responsable_id: "" as number | "", due_date: "" }
                        : draftByCell[cellKey] || { title: "", responsable_id: "" as number | "", due_date: "" };
                    const setDraft = (next: { title: string; responsable_id: number | ""; due_date: string }) => {
                      if (!cellKey) return;
                      if (captureParentId != null) setDraftSubByItem((p) => ({ ...p, [cellKey]: next }));
                      else setDraftByCell((p) => ({ ...p, [cellKey]: next }));
                    };
                    const existingKey = captureRevisionId != null ? `${captureRevisionId}|${captureTema}` : "";
                    const chosenExisting = existingKey ? pickExistingByCell[existingKey] ?? "" : "";
                    const currentIds = new Set(
                      (((cells[String(captureRevisionId || "")] || {})[captureTema] as ActionRegisterItem[]) || []).map(
                        (x) => x.id
                      )
                    );
                    const existingOptions = Array.from(allItemsByTema.get(captureTema)?.values() || [])
                      .filter((x) => !currentIds.has(x.id))
                      .sort((a, b) => a.title.localeCompare(b.title));
                    return (
                      <>
                        <label className="block text-xs text-slate-300">
                          {captureParentId != null ? "Subacción" : "Acción"}
                          <input
                            value={draft.title}
                            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                            placeholder={captureParentId != null ? "Subacción…" : "Acción principal…"}
                            className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-600"
                            disabled={!cellKey}
                          />
                        </label>
                        <label className="block text-xs text-slate-300">
                          Responsable
                          <select
                            value={draft.responsable_id}
                            onChange={(e) =>
                              setDraft({ ...draft, responsable_id: e.target.value ? Number(e.target.value) : "" })
                            }
                            className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                            disabled={!cellKey}
                          >
                            <option value="">Responsable…</option>
                            {responsables.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.nombre}
                                {u.rol_clave ? ` (${u.rol_clave})` : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-xs text-slate-300">
                          Vencimiento
                          <input
                            type="date"
                            value={draft.due_date}
                            onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
                            className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                            disabled={!cellKey}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={!cellKey || !draft.title.trim() || draft.responsable_id === ""}
                          onClick={() => {
                            if (captureRevisionId == null) return;
                            const run =
                              captureParentId != null
                                ? handleAddSub(captureRevisionId, captureTema, captureParentId)
                                : handleAddItem(captureRevisionId, captureTema);
                            void run.then(() => closeCapture());
                          }}
                          className="rounded bg-indigo-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
                        >
                          {captureParentId != null ? "Agregar subacción" : "Agregar acción"}
                        </button>
                        {captureParentId == null && (
                          <div className="pt-2 border-t border-slate-700 space-y-2">
                            <div className="text-xs text-slate-400">Copia una acción previa a esta fecha.</div>
                            <select
                              value={chosenExisting}
                              onChange={(e) =>
                                setPickExistingByCell((p) => ({
                                  ...p,
                                  [existingKey]: e.target.value ? Number(e.target.value) : "",
                                }))
                              }
                              className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                              disabled={!existingKey}
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
                              disabled={!existingKey || !chosenExisting}
                              onClick={() => {
                                if (captureRevisionId == null) return;
                                void handleAddExisting(captureRevisionId, captureTema).then(() => closeCapture());
                              }}
                              className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-50"
                            >
                              Agregar existente
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 p-4 overflow-auto">
        {boardView === "vivo" ? (
          <div className="max-w-5xl space-y-6">
            <section>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="text-sm font-semibold text-amber-200">Comentarios del día</h2>
                <button
                  type="button"
                  onClick={() => openCapture({ kind: "comentario", revisionId: revisions[0]?.id ?? null })}
                  className="text-xs rounded border border-amber-600/50 px-2 py-1 text-amber-200 hover:bg-amber-900/30"
                >
                  +
                </button>
              </div>
              {revisions.length === 0 ? (
                <div className="text-xs text-slate-500 italic">Crea una columna de fecha para registrar comentarios.</div>
              ) : (
                <div className="space-y-2">
                  {revisions.map((rev) => {
                    const notes = notesByRev[String(rev.id)] || [];
                    const summary = notes[0] ? firstLine(notes[0].body) : "Sin comentarios";
                    return (
                      <div key={rev.id} className="rounded border border-amber-900/40 bg-amber-950/10 px-3 py-2">
                        <div className="flex items-start gap-3">
                          <div className="w-16 shrink-0 text-xs font-semibold text-amber-100">{fmtDMY(rev.revision_date)}</div>
                          <div className="flex-1 min-w-0 text-xs text-amber-50/90 italic">{summary}</div>
                          <div className="flex items-center gap-1 shrink-0">
                            {plantaId && (
                              <a
                                href={getActionRegisterDailyPdfUrl(token, plantaId, rev.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-700 border border-slate-600"
                                title="Generar PDF con Resumen del día (Resumen, Comentarios, Evidencias e Historial)"
                              >
                                PDF
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => openCapture({ kind: "comentario", revisionId: rev.id })}
                              className="rounded border border-amber-700/50 px-2 py-0.5 text-[11px] text-amber-200 hover:bg-amber-900/30"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {notes.length > 0 && <div className="mt-2 space-y-1.5">{notes.map((n) => renderNoteCard(n))}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {temasConActividad.map((tema) => {
              const openCount = temaActivity.get(tema)?.open || 0;
              return (
                <section key={tema}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h2 className="text-sm font-semibold text-slate-100">
                      {tema}
                      <span className="ml-2 text-xs font-normal text-slate-400">{openCount} abiertas</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => openCapture({ kind: "accion", revisionId: revisions[0]?.id ?? null, tema })}
                      className="text-xs rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-800"
                    >
                      +
                    </button>
                  </div>
                  <div className="space-y-3">
                    {revisions.map((rev) => {
                      const items = (cells[String(rev.id)] && (cells[String(rev.id)][tema] as ActionRegisterItem[])) || [];
                      if (items.length === 0) return null;
                      const { roots, children } = buildTree(items);
                      return (
                        <div key={`${tema}-${rev.id}`}>
                          <div className="mb-1 text-[11px] text-slate-400">{fmtDMY(rev.revision_date)}</div>
                          <div className="space-y-2">
                            {roots.map((it, idx) => renderItem(it, String(idx + 1), 0, rev, tema, children))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {temasSinAcciones.length > 0 && (
              <section className="rounded border border-slate-800 bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setEmptyTemasOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-900/60"
                >
                  <span>Temas sin acciones ({temasSinAcciones.length})</span>
                  <span className="text-xs text-slate-500">{emptyTemasOpen ? "▾" : "▸"}</span>
                </button>
                {emptyTemasOpen && (
                  <div className="px-3 pb-3 space-y-1">
                    {temasSinAcciones.map((tema) => (
                      <div key={tema} className="flex items-center justify-between text-xs text-slate-400">
                        <span>{tema}</span>
                        <button
                          type="button"
                          onClick={() => openCapture({ kind: "accion", revisionId: revisions[0]?.id ?? null, tema })}
                          className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 hover:bg-slate-800"
                        >
                          +
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {weeks.length === 0 ? (
              <div className="text-sm text-slate-500">Crea una fecha de revisión para empezar.</div>
            ) : (
              weeks.map((week) => {
                const isOpen =
                  collapsedWeeks[week.monday] != null
                    ? collapsedWeeks[week.monday] !== true
                    : week.monday === latestMonday;
                const emptyRevs = week.revisions.filter((r) => !revisionHasContent(r.id) && !expandedEmptyRevIds.includes(r.id));
                const visibleRevs = week.revisions.filter((r) => revisionHasContent(r.id) || expandedEmptyRevIds.includes(r.id));
                const weekTemas = temas.filter((tema) =>
                  visibleRevs.some((rev) => {
                    const items = (cells[String(rev.id)] && (cells[String(rev.id)][tema] as ActionRegisterItem[])) || [];
                    return items.length > 0;
                  })
                );
                const weekEmptyTemas = temas.filter((t) => !weekTemas.includes(t));
                return (
                  <section key={week.monday} className="rounded border border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedWeeks((s) => ({
                          ...s,
                          [week.monday]: isOpen,
                        }))
                      }
                      className="w-full flex items-center justify-between px-3 py-2 text-left bg-slate-900/50"
                    >
                      <span className="text-sm font-semibold text-slate-100">{week.label}</span>
                      <span className="text-xs text-slate-500">{isOpen ? "▾" : "▸"}</span>
                    </button>
                    {isOpen && (
                      <div className="p-3 space-y-3">
                        {emptyRevs.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-slate-500">Sin hechos:</span>
                            {emptyRevs.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => setExpandedEmptyRevIds((ids) => (ids.includes(r.id) ? ids : [...ids, r.id]))}
                                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200"
                                title="Mostrar esta fecha"
                              >
                                {fmtDMY(r.revision_date)} vacío
                              </button>
                            ))}
                          </div>
                        )}
                        {visibleRevs.length === 0 ? (
                          <div className="text-xs text-slate-500">No hay fechas con contenido en esta semana.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <div
                              className="grid min-w-[640px]"
                              style={{
                                gridTemplateColumns: `160px repeat(${visibleRevs.length}, minmax(240px, 1fr))`,
                              }}
                            >
                              <div className="sticky left-0 z-10 border border-slate-700 bg-slate-950/80 px-2 py-2 text-xs font-semibold text-slate-300">
                                Tema
                              </div>
                              {visibleRevs.map((r) => (
                                <div key={r.id} className="border border-slate-700 bg-slate-900/40 px-2 py-2 text-xs font-semibold text-slate-200">
                                  <div className="flex items-start justify-between gap-2">
                                    <span>{fmtDMY(r.revision_date)}</span>
                                    {plantaId && (
                                      <a
                                        href={getActionRegisterDailyPdfUrl(token, plantaId, r.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700 border border-slate-600"
                                        title="Generar PDF con Resumen del día"
                                      >
                                        PDF
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}

                              <div className="sticky left-0 z-10 border border-slate-700 bg-amber-950/40 px-2 py-2 text-xs font-medium text-amber-200">
                                Comentarios del día
                              </div>
                              {visibleRevs.map((rev) => {
                                const notes = notesByRev[String(rev.id)] || [];
                                return (
                                  <div key={`notes-${rev.id}`} className="border border-slate-700 bg-amber-950/10 px-2 py-2 space-y-1.5">
                                    {notes.length === 0 ? (
                                      <div className="text-[11px] text-slate-500 italic">Sin comentarios</div>
                                    ) : (
                                      notes.map((n) => renderNoteCard(n))
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => openCapture({ kind: "comentario", revisionId: rev.id })}
                                      className="text-[11px] text-amber-200 hover:text-amber-100"
                                    >
                                      +
                                    </button>
                                  </div>
                                );
                              })}

                              {weekTemas.map((tema) => (
                                <div key={`row-${tema}`} className="contents">
                                  <div className="sticky left-0 z-10 border border-slate-700 bg-slate-900/70 px-2 py-2 text-xs font-medium text-slate-200">
                                    {tema}
                                  </div>
                                  {visibleRevs.map((rev) => {
                                    const items =
                                      (cells[String(rev.id)] && (cells[String(rev.id)][tema] as ActionRegisterItem[])) || [];
                                    const { roots, children } = buildTree(items);
                                    return (
                                      <div key={`${tema}-${rev.id}`} className="border border-slate-700 bg-slate-950/20 p-2 space-y-2">
                                        {roots.length === 0 ? (
                                          <div className="text-[11px] text-slate-600">—</div>
                                        ) : (
                                          roots.map((it, idx) => renderItem(it, String(idx + 1), 0, rev, tema, children))
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => openCapture({ kind: "accion", revisionId: rev.id, tema })}
                                          className="text-[11px] text-slate-400 hover:text-slate-200"
                                        >
                                          +
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {weekEmptyTemas.length > 0 && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                            <span>Temas sin acciones en estas fechas:</span>
                            {weekEmptyTemas.map((tema) => (
                              <button
                                key={tema}
                                type="button"
                                onClick={() =>
                                  openCapture({ kind: "accion", revisionId: visibleRevs[0]?.id ?? week.revisions[0]?.id, tema })
                                }
                                className="text-slate-400 hover:text-slate-200"
                              >
                                + {tema}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>
        )}
      </main>

      {token && plantaId ? (
        <DirectorIaChatModal
          open={directorIaChatOpen}
          onClose={() => setDirectorIaChatOpen(false)}
          token={token}
          plantaId={plantaId}
          plantaNombre={plantaNombre}
          uploadDay={(searchParams.get("upload_day") || "").trim().slice(0, 10) || null}
        />
      ) : null}
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

