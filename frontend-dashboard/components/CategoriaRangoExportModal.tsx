"use client";

import { useMemo, useState } from "react";
import { downloadCategoriaRangoExcel, type CategoriaRangoExcel } from "@/lib/api";

interface Props {
  open: boolean;
  token: string;
  categoria: CategoriaRangoExcel;
  selectedPlantaId?: number | null;
  selectedPlantaNombre?: string | null;
  onClose: () => void;
}

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const THEME: Record<
  CategoriaRangoExcel,
  { title: string; accentBtn: string; accentSelected: string; blurb: string }
> = {
  GASTOS: {
    title: "GASTOS",
    accentBtn: "bg-blue-800 hover:bg-blue-700",
    accentSelected: "bg-blue-600 text-white",
    blurb: "Exporta gastos por subcategoría en la ventana de meses (Resumen + detalle + duplicados).",
  },
  INVERSIONES: {
    title: "INVERSIONES",
    accentBtn: "bg-red-700 hover:bg-red-600",
    accentSelected: "bg-red-600 text-white",
    blurb: "Exporta inversiones por subcategoría en la ventana de meses (Resumen + detalle + duplicados).",
  },
};

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
  selectedClass,
}: {
  label: string;
  value: string;
  onChange: (yyyyMm: string) => void;
  selectedClass: string;
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
                selected ? selectedClass : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
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

export default function CategoriaRangoExportModal({
  open,
  token,
  categoria,
  selectedPlantaId,
  selectedPlantaNombre,
  onClose,
}: Props) {
  const theme = THEME[categoria];
  const defaults = useMemo(() => mesActualYAnteriorMx(), []);
  const [mesDesde, setMesDesde] = useState(defaults.anterior);
  const [mesHasta, setMesHasta] = useState(defaults.actual);
  const [privClave, setPrivClave] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleExport = async () => {
    setError(null);
    setExporting(true);
    try {
      await downloadCategoriaRangoExcel(
        token,
        categoria,
        mesDesde,
        mesHasta,
        selectedPlantaId ?? null,
        privClave
      );
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
            <h2 className="text-lg font-semibold text-white">{theme.title}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {theme.blurb}
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
            Folios {theme.title} no cancelados. Elige el rango de mes de cargo.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MesPicker
              label="Desde"
              value={mesDesde}
              onChange={setMesDesde}
              selectedClass={theme.accentSelected}
            />
            <MesPicker
              label="Hasta"
              value={mesHasta}
              onChange={setMesHasta}
              selectedClass={theme.accentSelected}
            />
          </div>
          <label className="block text-xs text-slate-400">
            Clave folios privados (Solo ZP / AD)
            <input
              type="password"
              value={privClave}
              onChange={(e) => setPrivClave(e.target.value)}
              autoComplete="off"
              placeholder="Vacío = sin privados"
              className="mt-1 block w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              Vacío: Excel sin folios privados. Con clave: incluye Solo ZP y AD.
            </span>
          </label>
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
            className={`rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${theme.accentBtn}`}
          >
            {exporting ? "Exportando…" : "Aceptar y exportar"}
          </button>
        </div>
      </div>
    </div>
  );
}
