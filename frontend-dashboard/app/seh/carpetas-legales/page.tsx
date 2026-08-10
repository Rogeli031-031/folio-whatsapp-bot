"use client";

import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
} from "@/lib/auth";
import { CARPETAS_LEGALES_SECTIONS } from "@/lib/seh-carpetas-legales-catalog";
import {
  fetchSehCarpetasLegales,
  getSehCarpetasLegalesArchivoUrl,
  putSehCarpetasLegalesEstatus,
  putSehCarpetasLegalesVencimiento,
  uploadSehCarpetasLegalesArchivo,
  type SehCarpetasLegalesEstatus,
  type SehCarpetasLegalesRowState,
} from "@/lib/api";

const HEADER_BG = "#1F4E79";
const SECTION_BG = "#D6E3F0";
const SECTION_TEXT = "#1F4E79";
const BORDER = "#8FAADC";
const GRID = "#B4C6E7";
const DOC_WITH_FILE = "#0B6E4F";
/** Máximo de subida en botones «Subir» (debe coincidir con server.js). */
const ARCHIVO_MAX_BYTES = 80000 * 1024; // 80,000 KB

const ESTATUS_OPTIONS: { value: SehCarpetasLegalesEstatus; label: string }[] = [
  { value: "vigente", label: "Vigente" },
  { value: "en_tramite", label: "En trámite" },
  { value: "na", label: "N/A" },
];

function emptyState(docNo: string, plantaId: number): SehCarpetasLegalesRowState {
  return {
    planta_id: plantaId,
    doc_no: docNo,
    estatus: null,
    comentario: "",
    vencimiento: null,
    vencimiento_na: false,
    has_archivo: false,
    file_name: null,
    content_type: null,
    file_size_bytes: null,
  };
}

function estatusLabel(estatus: SehCarpetasLegalesEstatus | null | undefined): string {
  if (estatus === "vigente") return "Vigente";
  if (estatus === "en_tramite") return "En trámite";
  if (estatus === "na") return "N/A";
  return "";
}

function estatusCellStyle(estatus: SehCarpetasLegalesEstatus | null | undefined): {
  background: string;
  color: string;
} {
  if (estatus === "vigente" || estatus === "na") {
    return { background: "#C6EFCE", color: "#006100" };
  }
  if (estatus === "en_tramite") {
    return { background: "#FFEB9C", color: "#9C5700" };
  }
  return { background: "#FFC7CE", color: "#9C0006" };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function CarpetasLegalesContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [stateByDoc, setStateByDoc] = useState<Record<string, SehCarpetasLegalesRowState>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);

  const [estatusOpenFor, setEstatusOpenFor] = useState<string | null>(null);
  const [draftEstatus, setDraftEstatus] = useState<SehCarpetasLegalesEstatus | null>(null);
  const [draftComentario, setDraftComentario] = useState("");

  const [venceOpenFor, setVenceOpenFor] = useState<string | null>(null);
  const [draftVence, setDraftVence] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadDocNo, setUploadDocNo] = useState<string | null>(null);

  useEffect(() => {
    const t = parseTokenFromQuery(searchParams) || getTokenFromStorage();
    if (t) {
      setTokenInStorage(t);
      setToken(t);
    } else {
      setToken(null);
    }
  }, [searchParams]);

  const plantaId = useMemo(() => {
    const n = parseInt(String(searchParams.get("planta_id") || ""), 10);
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);

  const backParts = [
    token ? `t=${encodeURIComponent(token)}` : "",
    plantaId != null ? `planta_id=${encodeURIComponent(String(plantaId))}` : "",
  ].filter(Boolean);
  const backHref = `/seh${backParts.length ? `?${backParts.join("&")}` : ""}`;

  const loadState = useCallback(async () => {
    if (!token || plantaId == null) {
      setStateByDoc({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSehCarpetasLegales(token, plantaId);
      const map: Record<string, SehCarpetasLegalesRowState> = {};
      for (const row of data.rows || []) {
        map[row.doc_no] = row;
      }
      setStateByDoc(map);
    } catch (e) {
      setError((e as Error).message || "Error al cargar carpetas legales");
      setStateByDoc({});
    } finally {
      setLoading(false);
    }
  }, [token, plantaId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const getRow = (docNo: string): SehCarpetasLegalesRowState => {
    if (stateByDoc[docNo]) return stateByDoc[docNo];
    return emptyState(docNo, plantaId ?? 0);
  };

  const applyRow = (row: SehCarpetasLegalesRowState) => {
    setStateByDoc((prev) => ({ ...prev, [row.doc_no]: row }));
  };

  const openEstatus = (docNo: string) => {
    const row = getRow(docNo);
    setEstatusOpenFor(docNo);
    setDraftEstatus(row.estatus);
    setDraftComentario(row.comentario || "");
  };

  const saveEstatus = async () => {
    if (!token || plantaId == null || !estatusOpenFor) return;
    setBusyDoc(estatusOpenFor);
    setError(null);
    try {
      const { row } = await putSehCarpetasLegalesEstatus(token, {
        planta_id: plantaId,
        doc_no: estatusOpenFor,
        estatus: draftEstatus,
        comentario: draftComentario,
      });
      applyRow(row);
      setEstatusOpenFor(null);
    } catch (e) {
      setError((e as Error).message || "No se pudo guardar el estatus");
    } finally {
      setBusyDoc(null);
    }
  };

  const openVence = (docNo: string) => {
    const row = getRow(docNo);
    setVenceOpenFor(docNo);
    setDraftVence(row.vencimiento_na ? "" : row.vencimiento || "");
  };

  const saveVence = async (asNa: boolean) => {
    if (!token || plantaId == null || !venceOpenFor) return;
    if (!asNa && !/^\d{4}-\d{2}-\d{2}$/.test(draftVence)) {
      setError("Selecciona una fecha de vencimiento o marca N/A");
      return;
    }
    setBusyDoc(venceOpenFor);
    setError(null);
    try {
      const { row } = await putSehCarpetasLegalesVencimiento(token, {
        planta_id: plantaId,
        doc_no: venceOpenFor,
        vencimiento: asNa ? null : draftVence,
        vencimiento_na: asNa,
      });
      applyRow(row);
      setVenceOpenFor(null);
    } catch (e) {
      setError((e as Error).message || "No se pudo guardar el vencimiento");
    } finally {
      setBusyDoc(null);
    }
  };

  const triggerUpload = (docNo: string) => {
    if (!token || plantaId == null) {
      setError("Selecciona una planta desde SEH para subir archivos");
      return;
    }
    setUploadDocNo(docNo);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const onFileSelected = async (file: File | null) => {
    if (!file || !token || plantaId == null || !uploadDocNo) return;
    if (file.size > ARCHIVO_MAX_BYTES) {
      setError(`El archivo excede el máximo de ${Math.floor(ARCHIVO_MAX_BYTES / 1024)}KB`);
      setUploadDocNo(null);
      return;
    }
    setBusyDoc(uploadDocNo);
    setError(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const { row } = await uploadSehCarpetasLegalesArchivo(token, {
        planta_id: plantaId,
        doc_no: uploadDocNo,
        fileBase64,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });
      applyRow(row);
    } catch (e) {
      setError((e as Error).message || "No se pudo subir el archivo");
    } finally {
      setBusyDoc(null);
      setUploadDocNo(null);
    }
  };

  const onDocumentoClick = (docNo: string, documento: string) => {
    const row = getRow(docNo);
    if (!row.has_archivo || !token || plantaId == null) return;
    const ok = window.confirm(
      `¿Desea descargar el documento?\n\n${documento}${row.file_name ? `\n(${row.file_name})` : ""}`
    );
    if (!ok) return;
    const url = getSehCarpetasLegalesArchivoUrl(token, plantaId, docNo);
    const a = document.createElement("a");
    a.href = url;
    a.download = row.file_name || documento;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const canEdit = token != null && plantaId != null;

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            className="rounded border border-slate-400 bg-slate-100 px-2.5 py-1.5 text-sm text-slate-800 hover:bg-slate-200"
          >
            ← Volver a SEH
          </Link>
          <span className="rounded border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900">
            REGULACIÓN · PLANTA
          </span>
        </div>
        <span className="text-xs text-slate-500">Índice de carpetas legales por planta</span>
      </div>

      <div className="mx-auto max-w-[1400px] p-4">
        {!plantaId ? (
          <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Abre esta pantalla desde SEH eligiendo una planta para guardar estatus, archivos y vencimientos.
          </div>
        ) : null}
        {loading ? (
          <p className="mb-2 text-sm text-slate-600">Cargando datos guardados…</p>
        ) : null}
        {error ? (
          <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => void onFileSelected(e.target.files?.[0] || null)}
        />

        <div
          className="overflow-x-auto rounded-sm bg-white shadow-sm"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <table className="w-full min-w-[1100px] border-collapse text-[12px] leading-snug">
            <thead>
              <tr>
                <th
                  colSpan={7}
                  className="px-3 py-3 text-center text-[15px] font-bold tracking-wide text-white"
                  style={{ background: HEADER_BG, border: `1px solid ${HEADER_BG}` }}
                >
                  ÍNDICE - CARPETAS LEGALES PLANTAS
                </th>
              </tr>
              <tr className="text-white">
                {(
                  [
                    ["w-[6%]", "No. / Bloque"],
                    ["w-[22%]", "Categoría / Documento Requerido"],
                    ["w-[24%]", "Especificación / Norma / Detalle"],
                    ["w-[12%]", "Estatus (Vigente / En Trámite / N/A)"],
                    ["w-[16%]", "Observaciones / Notas"],
                    ["w-[8%]", "Subir"],
                    ["w-[12%]", "Vencimiento"],
                  ] as const
                ).map(([w, label]) => (
                  <th
                    key={label}
                    className={`${w} px-2 py-2 text-center font-bold`}
                    style={{ background: HEADER_BG, border: `1px solid ${BORDER}` }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CARPETAS_LEGALES_SECTIONS.map((section) => (
                <Fragment key={section.id}>
                  <tr>
                    <td
                      className="px-2 py-2 text-center text-[11px] font-bold whitespace-nowrap"
                      style={{
                        background: HEADER_BG,
                        color: "#fff",
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      {section.labelLeft}
                    </td>
                    <td
                      colSpan={6}
                      className="px-2 py-2 text-center text-[12px] font-bold"
                      style={{
                        background: SECTION_BG,
                        color: SECTION_TEXT,
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      {section.title}
                    </td>
                  </tr>
                  {section.rows.map((row) => {
                    const st = getRow(row.no);
                    const tone = estatusCellStyle(st.estatus);
                    const busy = busyDoc === row.no;
                    return (
                      <tr key={row.no} className="bg-white">
                        <td
                          className="px-2 py-1.5 text-center font-medium"
                          style={{ border: `1px solid ${GRID}` }}
                        >
                          {row.no}
                        </td>
                        <td className="px-2 py-1.5" style={{ border: `1px solid ${GRID}` }}>
                          {st.has_archivo ? (
                            <button
                              type="button"
                              onClick={() => onDocumentoClick(row.no, row.documento)}
                              className="text-left font-semibold underline-offset-2 hover:underline"
                              style={{ color: DOC_WITH_FILE }}
                              title={st.file_name || "Descargar documento"}
                            >
                              {row.documento}
                            </button>
                          ) : (
                            <span>{row.documento}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5" style={{ border: `1px solid ${GRID}` }}>
                          {row.especificacion}
                        </td>
                        <td
                          className="px-1 py-1 text-center align-middle"
                          style={{ border: `1px solid ${GRID}`, background: tone.background }}
                        >
                          <button
                            type="button"
                            disabled={!canEdit || busy}
                            onClick={() => openEstatus(row.no)}
                            className="min-h-[2rem] w-full rounded px-1 py-1 text-[11px] font-semibold disabled:cursor-not-allowed"
                            style={{ color: tone.color }}
                            title="Clic para estatus y comentarios"
                          >
                            {estatusLabel(st.estatus) || "Sin estado"}
                          </button>
                        </td>
                        <td className="px-2 py-1.5" style={{ border: `1px solid ${GRID}` }}>
                          <div>{row.observaciones}</div>
                          {st.comentario ? (
                            <div className="mt-1 text-[11px] text-slate-600 italic">
                              Comentario: {st.comentario}
                            </div>
                          ) : null}
                        </td>
                        <td
                          className="px-1 py-1 text-center align-middle"
                          style={{ border: `1px solid ${GRID}` }}
                        >
                          <button
                            type="button"
                            disabled={!canEdit || busy}
                            onClick={() => triggerUpload(row.no)}
                            className="rounded border border-slate-400 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                          >
                            {busy && uploadDocNo === row.no ? "…" : "Subir"}
                          </button>
                        </td>
                        <td
                          className="px-1 py-1 text-center align-middle"
                          style={{ border: `1px solid ${GRID}` }}
                        >
                          <button
                            type="button"
                            disabled={!canEdit || busy}
                            onClick={() => openVence(row.no)}
                            className="min-h-[2rem] w-full rounded px-1 py-1 text-[11px] font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                            title="Clic para elegir fecha de vencimiento"
                          >
                            {st.vencimiento_na
                              ? "N/A"
                              : st.vencimiento
                                ? st.vencimiento
                                : "Elegir fecha"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {estatusOpenFor ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-md bg-white shadow-lg"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <div
              className="px-4 py-2 text-sm font-bold text-white"
              style={{ background: HEADER_BG }}
            >
              Estatus y comentarios · {estatusOpenFor}
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-700">Estado</p>
                <div className="flex flex-wrap gap-2">
                  {ESTATUS_OPTIONS.map((opt) => {
                    const selected = draftEstatus === opt.value;
                    const tone = estatusCellStyle(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraftEstatus(opt.value)}
                        className="rounded border px-2.5 py-1.5 text-xs font-semibold"
                        style={{
                          background: selected ? tone.background : "#fff",
                          color: tone.color,
                          borderColor: selected ? tone.color : "#cbd5e1",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setDraftEstatus(null)}
                    className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                    style={{ background: draftEstatus == null ? "#FFC7CE" : "#fff" }}
                  >
                    Sin estado
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="cl-comentario">
                  Comentarios
                </label>
                <textarea
                  id="cl-comentario"
                  value={draftComentario}
                  onChange={(e) => setDraftComentario(e.target.value)}
                  rows={4}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-sky-500"
                  placeholder="Escribe comentarios sobre este documento…"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEstatusOpenFor(null)}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busyDoc === estatusOpenFor}
                  onClick={() => void saveEstatus()}
                  className="rounded px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: HEADER_BG }}
                >
                  {busyDoc === estatusOpenFor ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {venceOpenFor ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-sm rounded-md bg-white shadow-lg"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <div
              className="px-4 py-2 text-sm font-bold text-white"
              style={{ background: HEADER_BG }}
            >
              Vencimiento · {venceOpenFor}
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="cl-vence">
                  Fecha de vencimiento
                </label>
                <input
                  id="cl-vence"
                  type="date"
                  value={draftVence}
                  onChange={(e) => setDraftVence(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setVenceOpenFor(null)}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busyDoc === venceOpenFor}
                  onClick={() => void saveVence(true)}
                  className="rounded border border-slate-400 bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-60"
                >
                  N/A
                </button>
                <button
                  type="button"
                  disabled={busyDoc === venceOpenFor}
                  onClick={() => void saveVence(false)}
                  className="rounded px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: HEADER_BG }}
                >
                  {busyDoc === venceOpenFor ? "Guardando…" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CarpetasLegalesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] p-4">
          <p className="text-slate-600">Cargando índice…</p>
        </div>
      }
    >
      <CarpetasLegalesContent />
    </Suspense>
  );
}
