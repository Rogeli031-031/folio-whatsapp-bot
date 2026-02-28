"use client";

import FolioCard from "./FolioCard";
import type { FolioCard as FolioCardType } from "@/lib/api";

interface Props {
  planta_id: number;
  planta_nombre: string;
  stats: { count: number; total_mxn: number; avg_aging: number | null };
  porCategoria: Record<string, FolioCardType[]>;
  onOpenFolio: (id: number) => void;
  role: string;
}

const CAT_ORDER = ["GASTOS", "INVERSIONES", "DYO", "TALLER"];

export default function PlantaSection({ planta_nombre, stats, porCategoria, onOpenFolio, role }: Props) {
  const fmtMxn = (n: number) =>
    n != null && !isNaN(n) ? `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "N/A";

  return (
    <div className="rounded border border-slate-700 bg-slate-800/40 p-3">
      <div className="mb-2 flex items-center justify-between border-b border-slate-600 pb-2">
        <span className="font-medium text-slate-200">{planta_nombre}</span>
        <span className="text-xs text-slate-400">
          {stats.count} folios · {fmtMxn(stats.total_mxn)}
          {stats.avg_aging != null && ` · ${stats.avg_aging}d prom`}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {CAT_ORDER.map((cat) => {
          const cards = porCategoria[cat] || [];
          if (cards.length === 0) return null;
          return (
            <div key={cat} className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">{cat}</span>
              <div className="space-y-1.5">
                {cards.map((c) => (
                  <FolioCard key={c.id} card={c} onOpen={onOpenFolio} role={role} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
