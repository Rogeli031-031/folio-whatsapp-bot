"use client";

import type { Kpis } from "@/lib/api";

export default function KPIHeader({ kpis }: { kpis: Kpis | null }) {
  if (!kpis) {
    return (
      <header className="border-b border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-4 text-sm text-slate-400">Cargando KPIs…</div>
      </header>
    );
  }

  const fmtMxn = (n: number | null) =>
    n != null && !isNaN(n) ? `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A";

  return (
    <header className="border-b border-slate-700 bg-slate-900/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div>
          <span className="text-slate-400">Folios activos</span>
          <span className="ml-2 font-semibold text-white">{kpis.total_activos}</span>
        </div>
        <div>
          <span className="text-slate-400">$ Comprometido</span>
          <span className="ml-2 font-semibold text-white">{fmtMxn(kpis.total_mxn)}</span>
        </div>
        <div>
          <span className="text-slate-400">Pend. aprob. ZP</span>
          <span className="ml-2 font-semibold text-amber-400">{kpis.pendientes_zp}</span>
        </div>
        <div>
          <span className="text-slate-400">Aging promedio (días)</span>
          <span className="ml-2 font-semibold text-white">{kpis.avg_aging ?? "N/A"}</span>
        </div>
        {kpis.oldest && (
          <div>
            <span className="text-slate-400">Más antiguo</span>
            <span className="ml-2 font-medium text-slate-200">
              {kpis.oldest.folio_codigo} ({kpis.oldest.aging} d)
            </span>
          </div>
        )}
        {kpis.top_planta && (
          <div>
            <span className="text-slate-400">Top planta</span>
            <span className="ml-2 font-medium text-slate-200">
              {kpis.top_planta.nombre} ({kpis.top_planta.count})
            </span>
          </div>
        )}
        {kpis.top_categoria && (
          <div>
            <span className="text-slate-400">Top categoría</span>
            <span className="ml-2 font-medium text-slate-200">
              {kpis.top_categoria.nombre} ({kpis.top_categoria.count})
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
