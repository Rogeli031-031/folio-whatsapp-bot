"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  fetchPlanMaestro,
  fetchPlanMaestroFileBlob,
  planMaestroFileUrl,
  postPlanMaestroChat,
  postPlanMaestroNota,
  uploadPlanMaestroFile,
  type PlanMaestroChatMessage,
  type PlanMaestroDocument,
  type PlanMaestroNote,
} from "@/lib/api";

type Props = {
  open: boolean;
  token: string;
  onClose: () => void;
};

type MobilePane = "hojas" | "chat" | "notas";

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> };
};

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (opts: { scale: number }) => { width: number; height: number };
    render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => {
      promise: Promise<void>;
    };
    getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
  }>;
};

function loadPdfJs(): Promise<PdfJsLib> {
  if (typeof window === "undefined") return Promise.reject(new Error("sin ventana"));
  const w = window as Window & { pdfjsLib?: PdfJsLib };
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-plan-maestro-pdfjs]");
    const finish = () => {
      if (w.pdfjsLib) {
        w.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
        resolve(w.pdfjsLib);
      } else {
        reject(new Error("pdf.js no cargó"));
      }
    };
    if (existing) {
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () => reject(new Error("pdf.js no cargó")));
      if (w.pdfjsLib) finish();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js";
    s.async = true;
    s.dataset.planMaestroPdfjs = "1";
    s.onload = finish;
    s.onerror = () => reject(new Error("pdf.js no cargó"));
    document.body.appendChild(s);
  });
}

function formatBytes(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "";
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function formatWhen(raw: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlanMaestroModal({ open, token, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<PlanMaestroDocument[]>([]);
  const [notes, setNotes] = useState<PlanMaestroNote[]>([]);
  const [chat, setChat] = useState<PlanMaestroChatMessage[]>([]);
  const [canUpload, setCanUpload] = useState(false);
  const [me, setMe] = useState("");
  const [activeSlug, setActiveSlug] = useState<string>("corporativo_2026");
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageText, setPageText] = useState("");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("hojas");
  const [maximized, setMaximized] = useState(false);
  const [viewerWidth, setViewerWidth] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerBoxRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<PdfDoc | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const activeDoc = useMemo(() => docs.find((d) => d.slug === activeSlug) || docs[0] || null, [docs, activeSlug]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlanMaestro(token);
      setDocs(data.documents || []);
      setNotes(data.notes || []);
      setChat(data.chat || []);
      setCanUpload(Boolean(data.can_upload));
      setMe(data.me || "");
      if (!activeSlug && data.documents[0]) setActiveSlug(data.documents[0].slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar Plan Maestro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setMobilePane("hojas");
    setMaximized(false);
    void reload();
  }, [open, token]);

  useEffect(() => {
    const el = viewerBoxRef.current;
    if (!el || !open) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width || 0;
      if (w > 0) setViewerWidth(w);
    });
    ro.observe(el);
    if (el.clientWidth > 0) setViewerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [open, maximized, mobilePane, activeDoc?.uploaded]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [chat, open]);

  useEffect(() => {
    return () => {
      if (fallbackUrl) URL.revokeObjectURL(fallbackUrl);
    };
  }, [fallbackUrl]);

  useEffect(() => {
    if (!open || !activeDoc?.uploaded) {
      pdfRef.current = null;
      setPageCount(0);
      setPageText("");
      setFallbackUrl(null);
      return;
    }
    let cancelled = false;
    setViewerLoading(true);
    setViewerError(null);
    setPage(1);
    (async () => {
      try {
        const blob = await fetchPlanMaestroFileBlob(token, activeDoc.slug);
        if (cancelled) return;
        const buf = await blob.arrayBuffer();
        try {
          const pdfjs = await loadPdfJs();
          const pdf = await pdfjs.getDocument({ data: buf }).promise;
          if (cancelled) return;
          pdfRef.current = pdf;
          setPageCount(pdf.numPages);
          setFallbackUrl(null);
        } catch {
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          setFallbackUrl(url);
          pdfRef.current = null;
        }
      } catch (e) {
        if (!cancelled) setViewerError(e instanceof Error ? e.message : "No se pudo abrir el PDF");
      } finally {
        if (!cancelled) setViewerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, token, activeDoc?.slug, activeDoc?.uploaded, activeDoc?.uploaded_at]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || !open) return;
    let cancelled = false;
    (async () => {
      try {
        const pg = await pdf.getPage(page);
        if (cancelled) return;
        const base = pg.getViewport({ scale: 1 });
        const desktop = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
        const avail = viewerBoxRef.current?.clientWidth || viewerWidth;
        const scale =
          !desktop && avail > 0 ? Math.min(2, Math.max(0.4, (avail - 16) / base.width)) : 1.25;
        const viewport = pg.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        if (desktop) {
          canvas.style.width = "";
          canvas.style.height = "";
        } else {
          canvas.style.width = "100%";
          canvas.style.height = "auto";
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await pg.render({ canvasContext: ctx, viewport }).promise;
        const text = await pg.getTextContent();
        if (cancelled) return;
        setPageText(
          (text.items || [])
            .map((it) => it.str || "")
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 12000)
        );
      } catch {
        if (!cancelled) setPageText("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageCount, open, viewerLoading, maximized, viewerWidth]);

  async function handleUpload(slug: string, file: File | undefined) {
    if (!file) return;
    setUploadingSlug(slug);
    setError(null);
    try {
      await uploadPlanMaestroFile(token, slug, file);
      await reload();
      setActiveSlug(slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo");
    } finally {
      setUploadingSlug(null);
    }
  }

  async function handleNote() {
    if (!noteDraft.trim()) return;
    setNoteSaving(true);
    setError(null);
    try {
      const res = await postPlanMaestroNota(token, noteDraft.trim());
      setNotes((prev) => [res.note, ...prev]);
      setNoteDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la nota");
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleChat() {
    if (!question.trim()) return;
    setChatBusy(true);
    setError(null);
    const pending: PlanMaestroChatMessage = {
      id: Date.now(),
      usuario_nombre: me || "Tú",
      role: "user",
      message: question.trim(),
      created_at: new Date().toISOString(),
    };
    setChat((prev) => [...prev, pending]);
    const q = question.trim();
    setQuestion("");
    try {
      const res = await postPlanMaestroChat(token, {
        question: q,
        slug: activeDoc?.slug,
        page: pageCount ? page : null,
        page_text: pageText || null,
      });
      setChat((prev) => [...prev.filter((m) => m.id !== pending.id), pending, res.message]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo preguntar");
    } finally {
      setChatBusy(false);
    }
  }

  function goPrevPage() {
    setPage((p) => Math.max(1, p - 1));
  }

  function goNextPage() {
    setPage((p) => (pageCount ? Math.min(pageCount, p + 1) : p + 1));
  }

  function onPageInput(raw: string) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) setPage(pageCount ? Math.min(pageCount, n) : n);
  }

  function pageControls(extra?: ReactNode) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-3 py-2 text-sm">
        <span className="text-slate-300">{activeDoc?.title || "Documento"}</span>
        {pageCount > 0 && (
          <span className="text-xs text-slate-500">
            Hoja {page} de {pageCount}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={goPrevPage}
            className="rounded border border-slate-600 px-2 py-1 text-xs disabled:opacity-40"
          >
            Anterior
          </button>
          <input
            type="number"
            min={1}
            max={pageCount || undefined}
            value={page}
            onChange={(e) => onPageInput(e.target.value)}
            className="w-16 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-center text-xs"
          />
          <button
            type="button"
            disabled={pageCount > 0 && page >= pageCount}
            onClick={goNextPage}
            className="rounded border border-slate-600 px-2 py-1 text-xs disabled:opacity-40"
          >
            Siguiente
          </button>
          {extra}
        </div>
      </div>
    );
  }

  function renderViewerBody() {
    return (
      <div ref={viewerBoxRef} className="min-h-0 flex-1 overflow-auto bg-slate-950 p-2">
        {viewerLoading && <p className="p-4 text-sm text-slate-400">Abriendo PDF…</p>}
        {viewerError && <p className="p-4 text-sm text-red-400">{viewerError}</p>}
        {!activeDoc?.uploaded && !viewerLoading && (
          <p className="p-4 text-sm text-slate-400">Todavía no hay archivo. Quien corresponda puede subirlo aquí.</p>
        )}
        {fallbackUrl && (
          <iframe
            title={activeDoc?.title || "PDF"}
            src={`${fallbackUrl}#page=${page}&view=FitH`}
            className={`h-full w-full rounded border border-slate-800 bg-white ${
              maximized ? "min-h-[70vh]" : "min-h-[50vh] lg:min-h-[420px]"
            }`}
          />
        )}
        {!fallbackUrl && activeDoc?.uploaded && (
          <canvas ref={canvasRef} className="mx-auto max-w-full bg-white shadow" />
        )}
      </div>
    );
  }

  if (!open) return null;

  const hojasClass =
    mobilePane === "hojas" ? "flex min-h-0 flex-1 flex-col gap-3" : "hidden lg:flex min-h-0 flex-col gap-3";
  const asideClass =
    mobilePane === "hojas" ? "hidden lg:flex min-h-0 flex-col gap-3" : "flex min-h-0 flex-1 flex-col gap-3 lg:flex";
  const chatClass =
    mobilePane === "chat"
      ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
      : "hidden lg:flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900";
  const notesClass =
    mobilePane === "notas"
      ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
      : "hidden lg:flex max-h-[42%] min-h-[180px] flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-2 sm:p-4" role="dialog" aria-modal="true">
      <div className="flex h-[94vh] w-[96vw] max-w-[1600px] flex-col overflow-hidden rounded-xl border border-cyan-800/50 bg-slate-950 text-slate-100 shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-cyan-100">PLAN MAESTRO</h2>
            <p className="text-xs text-slate-400">
              Consulta hoja por hoja, descarga, pregunta y deja notas. {me ? `Sesión: ${me}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Cerrar
          </button>
        </header>

        {error && <p className="px-4 pt-2 text-sm text-red-400">{error}</p>}
        {loading && <p className="px-4 pt-2 text-sm text-slate-400">Cargando…</p>}

        <nav className="flex shrink-0 gap-1 border-b border-slate-800 px-3 py-2 lg:hidden" aria-label="Secciones Plan Maestro">
          {(
            [
              ["hojas", "Hojas"],
              ["chat", "Chat"],
              ["notas", "Notas"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMobilePane(id);
                setMaximized(false);
              }}
              className={`flex-1 rounded px-2 py-2 text-sm font-medium ${
                mobilePane === id ? "bg-cyan-800 text-white" : "bg-slate-800 text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <section className={hojasClass}>
            <div className="grid max-h-[28vh] shrink-0 gap-2 overflow-auto md:max-h-none md:grid-cols-3">
              {docs.map((doc) => (
                <article
                  key={doc.slug}
                  className={`rounded-lg border p-3 ${
                    activeDoc?.slug === doc.slug ? "border-cyan-500 bg-cyan-950/30" : "border-slate-700 bg-slate-900/70"
                  }`}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      setActiveSlug(doc.slug);
                      setMobilePane("hojas");
                    }}
                  >
                    <h3 className="text-sm font-semibold text-slate-100">{doc.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {doc.uploaded
                        ? `${doc.file_name || "PDF"} · ${formatBytes(doc.file_size_bytes)}${
                            doc.uploaded_by ? ` · ${doc.uploaded_by}` : ""
                          }`
                        : `Aún no cargado · peso esperado ${doc.expected_size_label}`}
                    </p>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {doc.uploaded && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSlug(doc.slug);
                            setMobilePane("hojas");
                          }}
                          className="rounded bg-cyan-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-cyan-700"
                        >
                          Ver hojas
                        </button>
                        <a
                          href={planMaestroFileUrl(token, doc.slug, "attachment")}
                          className="rounded bg-slate-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-600"
                        >
                          Descargar
                        </a>
                      </>
                    )}
                    {canUpload && (
                      <>
                        <input
                          ref={(el) => {
                            fileRefs.current[doc.slug] = el;
                          }}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            void handleUpload(doc.slug, f);
                          }}
                        />
                        <button
                          type="button"
                          disabled={uploadingSlug === doc.slug}
                          onClick={() => fileRefs.current[doc.slug]?.click()}
                          className="rounded border border-amber-600/70 px-2.5 py-1 text-xs font-medium text-amber-100 hover:bg-amber-950/50 disabled:opacity-50"
                        >
                          {uploadingSlug === doc.slug ? "Subiendo…" : doc.uploaded ? "Reemplazar PDF" : "Subir PDF"}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="flex min-h-[50vh] flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900 lg:min-h-0">
              {pageControls(
                <button
                  type="button"
                  onClick={() => setMaximized(true)}
                  className="rounded bg-cyan-800 px-2 py-1 text-xs font-medium text-white hover:bg-cyan-700 lg:hidden"
                >
                  Maximizar
                </button>
              )}
              {!maximized && renderViewerBody()}
            </div>
          </section>

          <aside className={asideClass}>
            <div className={chatClass}>
              <h3 className="border-b border-slate-800 px-3 py-2 text-sm font-semibold text-cyan-100">
                Chat sobre los archivos
              </h3>
              <div className="min-h-0 flex-1 space-y-2 overflow-auto px-3 py-2 text-sm">
                {chat.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Pregunta sobre la hoja visible. El chat usa el texto de esa página y no inventa el resto del libro.
                  </p>
                )}
                {chat.map((m) => (
                  <div
                    key={`${m.role}-${m.id}-${m.created_at}`}
                    className={`rounded px-2 py-1.5 ${
                      m.role === "assistant" ? "bg-cyan-950/40 text-cyan-50" : "bg-slate-800 text-slate-100"
                    }`}
                  >
                    <div className="text-[11px] text-slate-400">
                      {m.usuario_nombre} · {formatWhen(m.created_at)}
                    </div>
                    <div className="whitespace-pre-wrap">{m.message}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form
                className="border-t border-slate-800 p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleChat();
                }}
              >
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                  placeholder="Pregunta sobre la hoja actual…"
                  className="w-full resize-none rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={chatBusy || !question.trim()}
                  className="mt-2 w-full rounded bg-cyan-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {chatBusy ? "Consultando…" : "Preguntar"}
                </button>
              </form>
            </div>

            <div className={notesClass}>
              <h3 className="border-b border-slate-800 px-3 py-2 text-sm font-semibold text-amber-100">
                Notas y comentarios
              </h3>
              <div className="min-h-0 flex-1 space-y-2 overflow-auto px-3 py-2 text-sm">
                {notes.length === 0 && <p className="text-xs text-slate-500">Aún no hay notas guardadas.</p>}
                {notes.map((n) => (
                  <article key={n.id} className="rounded border border-slate-800 bg-slate-950/70 px-2 py-1.5">
                    <div className="text-[11px] text-slate-400">
                      {n.usuario_nombre} · {formatWhen(n.created_at)}
                    </div>
                    <p className="whitespace-pre-wrap text-slate-100">{n.comentario}</p>
                  </article>
                ))}
              </div>
              <form
                className="border-t border-slate-800 p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleNote();
                }}
              >
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={2}
                  placeholder="Escribe una nota para futuras sesiones…"
                  className="w-full resize-none rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={noteSaving || !noteDraft.trim()}
                  className="mt-2 w-full rounded bg-amber-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {noteSaving ? "Guardando…" : "Guardar nota"}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>

      {maximized && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100" role="dialog" aria-label="Visor maximizado">
          {pageControls(
            <>
              {activeDoc?.uploaded && (
                <a
                  href={planMaestroFileUrl(token, activeDoc.slug, "attachment")}
                  className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-white hover:bg-slate-600"
                >
                  Descargar
                </a>
              )}
              <button
                type="button"
                onClick={() => setMaximized(false)}
                className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
              >
                Volver
              </button>
            </>
          )}
          {renderViewerBody()}
        </div>
      )}
    </div>
  );
}
