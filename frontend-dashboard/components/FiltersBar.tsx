"use client";

import type { DashboardFilters } from "@/lib/api";

interface Props {
  filters: DashboardFilters;
  onFiltersChange: (f: DashboardFilters) => void;
  plantas?: { id: number; nombre: string }[];
}

export default function FiltersBar({ filters, onFiltersChange, plantas = [] }: Props) {
  const toggle = (key: keyof DashboardFilters, value: string) => {
    const current = filters[key];
    onFiltersChange({ ...filters, [key]: current === value ? undefined : value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-700 bg-slate-900/30 px-4 py-2 text-sm">
      <span className="text-slate-400">Filtros:</span>
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
      <input
        type="date"
        value={filters.fecha_desde || ""}
        onChange={(e) => onFiltersChange({ ...filters, fecha_desde: e.target.value || undefined })}
        className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200"
      />
      <input
        type="date"
        value={filters.fecha_hasta || ""}
        onChange={(e) => onFiltersChange({ ...filters, fecha_hasta: e.target.value || undefined })}
        className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200"
      />
    </div>
  );
}
