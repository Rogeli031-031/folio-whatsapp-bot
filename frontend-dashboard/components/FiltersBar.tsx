"use client";

import { useMemo, useState } from "react";
import type { DashboardFilters } from "@/lib/api";

interface Props {
  filters: DashboardFilters;
  onFiltersChange: (f: DashboardFilters) => void;
  plantas?: { id: number; nombre: string }[];
  /** Texto libre para buscar folios (beneficiario, descripción, importe, etc.). */
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
}

function mesLabel(ym: string): string {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return ym;
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const idx = parseInt(m[2], 10) - 1;
  return `${meses[idx] || m[2]} ${m[1]}`;
}

function parseMesesExtra(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}$/.test(s));
}

function mesActualYAnteriorMx(): { actual: string; anterior: string } {
  const now = new Date();
  // Aprox. CDMX: offset -6; suficiente para etiquetas UI (el backend usa America/Mexico_City).
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(now);
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

export default function FiltersBar({ filters, onFiltersChange, plantas = [], searchTerm = "", onSearchTermChange }: Props) {
  const toggle = (key: keyof DashboardFilters, value: string) => {
    const current = filters[key];
    onFiltersChange({ ...filters, [key]: current === value ? undefined : value });
  };

  const { actual: mesActual, anterior: mesAnterior } = useMemo(() => mesActualYAnteriorMx(), []);
  const mesesExtra = parseMesesExtra(filters.meses_extra);
  const [mesParaAgregar, setMesParaAgregar] = useState("");
  const ventanaOn = filters.ventana !== "0";

  const addMesExtra = () => {
    const ym = (mesParaAgregar || "").trim();
    if (!/^\d{4}-\d{2}$/.test(ym)) return;
    if (ym === mesActual || ym === mesAnterior) return;
    if (mesesExtra.includes(ym)) return;
    const next = [...mesesExtra, ym].sort();
    onFiltersChange({ ...filters, meses_extra: next.join(","), ventana: "1" });
    setMesParaAgregar("");
  };

  const removeMesExtra = (ym: string) => {
    const next = mesesExtra.filter((m) => m !== ym);
    onFiltersChange({
      ...filters,
      meses_extra: next.length ? next.join(",") : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-2 border-b border-slate-700 bg-slate-900/30 px-4 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-slate-400">Filtros:</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={ventanaOn}
            onChange={() =>
              onFiltersChange({
                ...filters,
                ventana: ventanaOn ? "0" : "1",
                ...(ventanaOn ? {} : { mes: undefined }),
              })
            }
            className="rounded border-slate-600 bg-slate-800 text-amber-500"
          />
          <span className="text-slate-300" title="Mes de cargo actual + creados del mes actual y el pasado">
            Ventana reciente
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.solo_activos === "1"}
            onChange={() => toggle("solo_activos", "1")}
            className="rounded border-slate-600 bg-slate-800 text-amber-500"
          />
          <span className="text-slate-300">Solo activos</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.mi_semana === "1"}
            onChange={() => toggle("mi_semana", "1")}
            className="rounded border-slate-600 bg-slate-800 text-amber-500"
          />
          <span className="text-slate-300">Mi semana</span>
        </label>
        {plantas.length > 0 && (
          <select
            value={filters.plantas || ""}
            onChange={(e) => onFiltersChange({ ...filters, plantas: e.target.value || undefined })}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200"
          >
            <option value="">Todas las plantas</option>
            {plantas.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
        {onSearchTermChange && (
          <div className="ml-auto flex items-center gap-1">
            <span className="text-slate-400 text-xs">Buscar folio:</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder="Beneficiario, cheque, descripción, importe…"
              className="w-64 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500"
            />
          </div>
        )}
      </div>

      {ventanaOn && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>
            Muestra: mes cargo <strong className="text-slate-300">{mesLabel(mesAnterior)}</strong>–
            <strong className="text-slate-300">{mesLabel(mesActual)}</strong> + futuros con folios + creados{" "}
            <strong className="text-slate-300">{mesLabel(mesAnterior)}</strong>/
            <strong className="text-slate-300">{mesLabel(mesActual)}</strong>
          </span>
          {mesesExtra.map((ym) => (
            <button
              key={ym}
              type="button"
              onClick={() => removeMesExtra(ym)}
              className="rounded-full border border-amber-700/60 bg-amber-900/30 px-2 py-0.5 text-amber-200 hover:bg-amber-800/40"
              title="Quitar mes"
            >
              +{mesLabel(ym)} ×
            </button>
          ))}
          <label className="flex items-center gap-1">
            <span>Agregar mes:</span>
            <input
              type="month"
              value={mesParaAgregar}
              onChange={(e) => setMesParaAgregar(e.target.value)}
              className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-slate-200"
            />
            <button
              type="button"
              onClick={addMesExtra}
              disabled={!mesParaAgregar}
              className="rounded bg-slate-700 px-2 py-0.5 text-slate-200 hover:bg-slate-600 disabled:opacity-40"
            >
              Añadir
            </button>
          </label>
        </div>
      )}

      {!ventanaOn && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Ventana reciente off — puedes filtrar por mes de cargo:</span>
          <input
            type="month"
            value={filters.mes || ""}
            onChange={(e) => onFiltersChange({ ...filters, mes: e.target.value || undefined })}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-400">Creado:</span>
        <input
          type="date"
          value={filters.fecha_desde || ""}
          onChange={(e) => onFiltersChange({ ...filters, fecha_desde: e.target.value || undefined })}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200"
          title="Fecha creación desde"
        />
        <span className="text-slate-500">→</span>
        <input
          type="date"
          value={filters.fecha_hasta || ""}
          onChange={(e) => onFiltersChange({ ...filters, fecha_hasta: e.target.value || undefined })}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200"
          title="Fecha creación hasta"
        />
        <span className="ml-2 text-slate-400">Aprobado:</span>
        <input
          type="date"
          value={filters.fecha_aprob_desde || ""}
          onChange={(e) => onFiltersChange({ ...filters, fecha_aprob_desde: e.target.value || undefined })}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200"
          title="Fecha aprobación desde"
        />
        <span className="text-slate-500">→</span>
        <input
          type="date"
          value={filters.fecha_aprob_hasta || ""}
          onChange={(e) => onFiltersChange({ ...filters, fecha_aprob_hasta: e.target.value || undefined })}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200"
          title="Fecha aprobación hasta"
        />
      </div>
    </div>
  );
}
