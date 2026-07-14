"use client";

import { useMemo, useState } from "react";
import { downloadClasificacionApoyosExcel } from "@/lib/api";

interface Props {
  open: boolean;
  token: string;
  onClose: () => void;
}

function mesActualYAnteriorMx(): { actual: string; anterior: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const actual = `${y}-${String(m).padStart(2, "0")}`;
  let py = y;
  let pm = m - 1;
  if (pm < 1) {
    pm = 12;
    py -= 1;
  }
  return { actual, anterior: `${py}-${String(pm).padStart(2, "0")}` };
}

function buildMesOptions(): { value: string; label: string }[] {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const { actual } = mesActualYAnteriorMx();
  const [y0, m0] = actual.split("-").map(Number);
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 24; i++) {
    let y = y0;
    let m = m0 - i;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    const value = `${y}-${String(m).padStart(2, "0")}`;
    out.push({ value, label: `${meses[m - 1]} ${y}` });
  }
  return out;
}

export default function ClasificacionApoyosModal({ open, token, onClose }: Props) {
  const defaults = useMemo(() => mesActualYAnteriorMx(), []);
  const options = useMemo(() => buildMesOptions(), []);
  const [mesA, setMesA] = useState(defaults.actual);
  const [mesB, setMesB] = useState(defaults.anterior);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleGenerar = async () => {
    setError(null);
    if (mesA === mesB) {
      setError("Elige dos meses distintos.");
      return;
    }
    setLoading(true);
    try {
      await downloadClasificacionApoyosExcel(token, mesA, mesB);
      onClose();
    } catch (e) {
      setError((e as Error).message || "Error al generar el Excel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-900 p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">Clasificación de apoyos</h2>
            <p className="mt-1 text-xs text-slate-400">
              Elige el mes principal (izquierda) y el mes a comparar (derecha). Se genera la hoja COMPARATIVOS.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            Mes principal
            <select
              value={mesA}
              onChange={(e) => setMesA(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
            >
              {options.map((o) => (
                <option key={`a-${o.value}`} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Mes a comparar
            <select
              value={mesB}
              onChange={(e) => setMesB(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
            >
              {options.map((o) => (
                <option key={`b-${o.value}`} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleGenerar()}
            disabled={loading}
            className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? "Generando…" : "Generar Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}
