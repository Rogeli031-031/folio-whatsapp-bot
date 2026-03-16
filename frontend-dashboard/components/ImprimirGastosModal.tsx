"use client";

import { useState } from "react";
import { fetchDocumentoFolioPdf, fetchDocumentoGastosHtml, fetchDocumentoGastosPdf, fetchDocumentoCompletoPdf } from "@/lib/api";

type ModoImpresion = "solo_folio" | "folio_cotizacion" | "poliza_folio_cotizacion";

interface Props {
  folioId: number;
  numeroFolio: string;
  token: string;
  etapa?: string;
  onClose: () => void;
}

export default function ImprimirGastosModal({ folioId, numeroFolio, token, etapa, onClose }: Props) {
  const [modo, setModo] = useState<ModoImpresion>("solo_folio");
  const [cuenta, setCuenta] = useState("");
  const [numeroCheque, setNumeroCheque] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mostrarOpcionPolizaCompleta = etapa === "APROB_DIRECTOR_ZP";
  const requiereDatosCheque = modo === "poliza_folio_cotizacion";
  const datosChequeOk = cuenta.trim() !== "" && numeroCheque.trim() !== "";
  const deshabilitarAcciones = requiereDatosCheque && !datosChequeOk;

  const handleImprimir = async () => {
    setError(null);
    setLoading(true);
    try {
      if (modo === "poliza_folio_cotizacion") {
        const blob = await fetchDocumentoCompletoPdf(token, folioId, { cuenta: cuenta.trim(), numero_cheque: numeroCheque.trim() });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, "_blank");
        if (w) w.focus();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        onClose();
      } else if (modo === "solo_folio") {
        const blob = await fetchDocumentoFolioPdf(token, folioId);
        const url = URL.createObjectURL(blob);
        const w = window.open(url, "_blank");
        if (w) w.focus();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        onClose();
      } else {
        const html = await fetchDocumentoGastosHtml(token, folioId);
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          w.focus();
        }
        onClose();
      }
    } catch (e) {
      setError((e as Error).message || "Error al cargar el documento.");
    } finally {
      setLoading(false);
    }
  };

  const handleDescargar = async () => {
    setError(null);
    setLoading(true);
    try {
      let blob: Blob;
      let filename: string;
      if (modo === "poliza_folio_cotizacion") {
        blob = await fetchDocumentoCompletoPdf(token, folioId, { cuenta: cuenta.trim(), numero_cheque: numeroCheque.trim() });
        filename = `Documento-Completo-${numeroFolio.replace(/\s/g, "-")}.pdf`;
      } else if (modo === "solo_folio") {
        blob = await fetchDocumentoFolioPdf(token, folioId);
        filename = `Formato-Folio-${numeroFolio.replace(/\s/g, "-")}.pdf`;
      } else {
        blob = await fetchDocumentoGastosPdf(token, folioId, modo === "folio_cotizacion");
        filename = `Gastos-Extraordinarios-${numeroFolio.replace(/\s/g, "-")}.pdf`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      setError((e as Error).message || "Error al descargar el PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
          <h2 className="text-lg font-medium text-slate-200">Imprimir / Descargar</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-400">Folio {numeroFolio}. ¿Qué incluir?</p>
        {error && <p className="mb-2 rounded bg-red-900/40 px-2 py-1 text-sm text-red-200">{error}</p>}
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="incluir"
              checked={modo === "solo_folio"}
              onChange={() => setModo("solo_folio")}
              className="rounded border-slate-600"
            />
            <span className="text-sm text-slate-300">Solo formato del folio</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="incluir"
              checked={modo === "folio_cotizacion"}
              onChange={() => setModo("folio_cotizacion")}
              className="rounded border-slate-600"
            />
            <span className="text-sm text-slate-300">Folio + cotización</span>
          </label>
          {mostrarOpcionPolizaCompleta && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="incluir"
                checked={modo === "poliza_folio_cotizacion"}
                onChange={() => setModo("poliza_folio_cotizacion")}
                className="rounded border-slate-600"
              />
              <span className="text-sm text-slate-300">Póliza con datos + folio + cotización</span>
            </label>
          )}
        </div>
        {requiereDatosCheque && (
          <div className="mb-4 space-y-2 rounded border border-slate-600 bg-slate-800/50 p-3">
            <p className="text-xs font-medium text-slate-400">Datos para la póliza</p>
            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Cuenta</label>
              <input
                type="text"
                value={cuenta}
                onChange={(e) => setCuenta(e.target.value)}
                placeholder="Cuenta"
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Número de cheque</label>
              <input
                type="text"
                value={numeroCheque}
                onChange={(e) => setNumeroCheque(e.target.value)}
                placeholder="Número de cheque"
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-500"
              />
            </div>
            {!datosChequeOk && <p className="text-xs text-amber-400">Complete cuenta y número de cheque para habilitar Imprimir / Descargar.</p>}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleImprimir}
            disabled={loading || deshabilitarAcciones}
            className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {loading ? "…" : "Imprimir"}
          </button>
          <button
            type="button"
            onClick={handleDescargar}
            disabled={loading || deshabilitarAcciones}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "…" : "Descargar PDF"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
