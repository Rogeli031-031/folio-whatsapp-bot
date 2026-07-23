"use client";

import { useMemo, useState } from "react";
import { downloadTallerAtExcel } from "@/lib/api";

interface Props {
  open: boolean;
  token: string;
  selectedPlantaId?: number | null;
  selectedPlantaNombre?: string | null;
  onClose: () => void;
}

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

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

function splitYyyyMm(value: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(String(value || "").trim());
  if (!m) {
    const d = mesActualYAnteriorMx().actual;
    const [y, mo] = d.split("-").map(Number);
    return { year: y, month: mo };
  }
  return { year: Number(m[1]), month: Number(m[2]) };
}

function joinYyyyMm(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function yearOptionsAround(currentYear: number): number[] {
  const out: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 2; y--) out.push(y);
  return out;
}

function MesPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (yyyyMm: string) => void;
}) {
  const { year, month } = splitYyyyMm(value);
  const { actual } = mesActualYAnteriorMx();
  const currentYear = splitYyyyMm(actual).year;
  const years = yearOptionsAround(currentYear);

  return (
    <div className="rounded border border-slate-700 bg-slate-800/40 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{label}</span>
        <select
          value={year}
          onChange={(e) => onChange(joinYyyyMm(Number(e.target.value), month))}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          aria-label={`${label} año`}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {MESES_CORTOS.map((nombre, idx) => {
          const m = idx + 1;
          const selected = m === month;
          return (
            <button
              key={nombre}
              type="button"
              onClick={() => onChange(joinYyyyMm(year, m))}
              className={`rounded px-1.5 py-1.5 text-xs font-medium transition ${
                selected
                  ? "bg-amber-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {nombre}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500">
        {MESES_CORTOS[month - 1]} {year}
      </p>
    </div>
  );
}

export default function TallerAtExportModal({
  open,
  token,
  selectedPlantaId,
  selectedPlantaNombre,
  onClose,
}: Props) {
  const defaults = useMemo(() => mesActualYAnteriorMx(), []);
  const [mesDesde, setMesDesde] = useState(defaults.anterior);
  const [mesHasta, setMesHasta] = useState(defaults.actual);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleExport = async () => {
    setError(null);
    setExporting(true);
    try {
      await downloadTallerAtExcel(token, mesDesde, mesHasta, selectedPlantaId ?? null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-600 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Taller por AT</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Exporta gasto de taller por unidad (AT) en la ventana de meses.
              {selectedPlantaNombre ? ` Planta: ${selectedPlantaNombre}.` : " Todas las plantas visibles."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 px-4 py-4">
          <p className="text-xs text-slate-500">
            Solo folios TALLER con póliza o en Depósito y cierre / Comprobaciones / Evidencias.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MesPicker label="Desde" value={mesDesde} onChange={setMesDesde} />
            <MesPicker label="Hasta" value={mesHasta} onChange={setMesHasta} />
          </div>
          {error && (
            <p className="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-700 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {exporting ? "Exportando…" : "Aceptar y exportar"}
          </button>
        </div>
      </div>
    </div>
  );
}
