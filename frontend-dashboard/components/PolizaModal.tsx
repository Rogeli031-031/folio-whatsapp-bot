"use client";

import { useState, useEffect } from "react";
import { fetchFolio, postFolioPoliza, fetchDocumentoPolizaPdf } from "@/lib/api";

interface Props {
  folioId: number;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

/** Opciones de mes de cargo: solo Enero 2026 a Diciembre 2026. */
function getMesesOpciones(): { value: string; label: string }[] {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const out: { value: string; label: string }[] = [];
  const y = 2026;
  for (let m = 1; m <= 12; m++) {
    out.push({
      value: `${y}-${String(m).padStart(2, "0")}`,
      label: `${meses[m - 1]} ${y}`,
    });
  }
  return out;
}

export default function PolizaModal({ folioId, token, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [mesCargo, setMesCargo] = useState("");
  const [numeroFolio, setNumeroFolio] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !folioId) return;
    fetchFolio(token, folioId)
      .then((f) => {
        const mc = (f.mes_cargo as string) || "";
        if (mc && /^\d{4}-\d{2}$/.test(mc)) setMesCargo(mc);
        setNumeroFolio((f.numero_folio as string) || "");
      })
      .catch(() => {});
  }, [token, folioId]);

  const opciones = getMesesOpciones();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setError(null);
    if (!f) {
      setFile(null);
      setFileBase64(null);
      return;
    }
    if (!f.type.includes("pdf")) {
      setError("Solo se acepta PDF.");
      setFile(null);
      setFileBase64(null);
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const base64 = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
      setFileBase64(base64 || null);
    };
    reader.readAsDataURL(f);
  };

  const handleDescargarFormato = async () => {
    setError(null);
    setLoadingPdf(true);
    console.log("[poliza/front] abriendo póliza", { folioId });
    try {
      const blob = await fetchDocumentoPolizaPdf(token, folioId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Poliza-Cheque-${(numeroFolio || String(folioId)).replace(/\s/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[poliza/front] error abriendo póliza", e);
      setError((e as Error).message || "Error al descargar el formato.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleAbrirEnPestana = async () => {
    setError(null);
    setLoadingPdf(true);
    console.log("[poliza/front] abriendo póliza en pestaña", { folioId });
    try {
      const blob = await fetchDocumentoPolizaPdf(token, folioId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error("[poliza/front] error abriendo póliza", e);
      setError((e as Error).message || "Error al abrir el PDF.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileBase64) {
      setError("Selecciona el PDF de la póliza.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await postFolioPoliza(token, folioId, {
        fileBase64,
        fileName: file?.name || "poliza.pdf",
        mes_cargo: mesCargo || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la póliza.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
          <h2 className="text-lg font-medium text-slate-200">Subir póliza / comprobante de depósito</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-400">Folio ID: {folioId}. El folio pasará a Depósito y cierre.</p>
        {error && <p className="mb-2 rounded bg-red-900/40 px-2 py-1 text-sm text-red-200">{error}</p>}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDescargarFormato}
            disabled={loadingPdf}
            className="rounded bg-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-500 disabled:opacity-50"
          >
            {loadingPdf ? "…" : "Descargar formato Póliza"}
          </button>
          <button
            type="button"
            onClick={handleAbrirEnPestana}
            disabled={loadingPdf}
            className="rounded bg-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-500 disabled:opacity-50"
          >
            {loadingPdf ? "…" : "Abrir PDF en nueva pestaña"}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400">PDF (póliza o comprobante de depósito)</label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={onFileChange}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 file:mr-2 file:rounded file:border-0 file:bg-blue-600 file:px-2 file:py-1 file:text-white file:hover:bg-blue-500"
            />
            {file && <span className="mt-1 block text-xs text-slate-500">{file.name}</span>}
          </div>
          <div>
            <label className="block text-xs text-slate-400">Mes de cargo (opcional; si no eliges, se usa el del folio o el actual)</label>
            <select
              value={mesCargo}
              onChange={(e) => setMesCargo(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200"
            >
              <option value="">— Usar mes del folio / actual —</option>
              {opciones.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !fileBase64}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "…" : "Subir póliza"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
