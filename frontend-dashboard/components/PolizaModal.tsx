"use client";

import { useState } from "react";
import { postFolioPoliza } from "@/lib/api";

interface Props {
  folioId: number;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

function getMesesOpciones(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const value = `${y}-${String(m).padStart(2, "0")}`;
    const label = `${meses[m - 1]} ${y}`;
    out.push({ value, label });
  }
  return out;
}

export default function PolizaModal({ folioId, token, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [mesCargo, setMesCargo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileBase64 || !mesCargo) {
      setError("Selecciona el PDF y el mes al que corresponde el pago.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await postFolioPoliza(token, folioId, {
        fileBase64,
        fileName: file?.name || "poliza.pdf",
        mes_cargo: mesCargo,
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
            <label className="block text-xs text-slate-400">¿A qué mes corresponde el pago?</label>
            <select
              value={mesCargo}
              onChange={(e) => setMesCargo(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200"
              required
            >
              <option value="">— Elegir mes —</option>
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
              disabled={loading || !fileBase64 || !mesCargo}
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
