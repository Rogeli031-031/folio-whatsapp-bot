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
  onSubirPoliza?: (id: number) => void;
  onImprimirGastos?: (id: number, numeroFolio: string, etapa?: string) => void;
  onCrearFolio?: (plantaId: number, plantaNombre: string) => void;
  onCrearFolioUrgente?: (plantaId: number, plantaNombre: string) => void;
  onCrearProyecto?: (plantaId: number, plantaNombre: string) => void;
   /** Texto libre para buscar folios en esta planta. */
  searchTerm?: string;
}

const CAT_ORDER = ["GASTOS", "INVERSIONES", "DYO", "TALLER"];

function matchesSearch(card: FolioCardType, term: string | undefined): boolean {
  const q = (term || "").trim().toLowerCase();
  if (!q) return true;
  const importeStr =
    card.importe != null && !isNaN(card.importe)
      ? card.importe.toLocaleString("es-MX", { maximumFractionDigits: 0 })
      : "";
  const fields = [
    card.numero_folio,
    card.folio_codigo,
    card.descripcion,
    card.categoria,
    card.subcategoria,
    importeStr,
  ];
  return fields.some((f) => (f || "").toString().toLowerCase().includes(q));
}

export default function PlantaSection({ planta_id, planta_nombre, stats, porCategoria, onOpenFolio, role, onSubirPoliza, onImprimirGastos, onCrearFolio, onCrearFolioUrgente, onCrearProyecto, searchTerm }: Props) {
  const fmtMxn = (n: number) =>
    n != null && !isNaN(n) ? `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "N/A";

  const handleCrearFolio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCrearFolio) {
      onCrearFolio(planta_id, planta_nombre);
    } else {
      const whatsappNumber = typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").trim().replace(/\D/g, "") : "";
      if (whatsappNumber) {
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("crear folio")}`, "_blank", "noopener,noreferrer");
      } else {
        navigator.clipboard.writeText("crear folio").then(() => alert("Comando copiado: crear folio. Pégalo en WhatsApp.")).catch(() => {});
      }
    }
  };

  return (
    <div className="rounded border border-slate-700 bg-slate-800/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-600 pb-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-medium text-slate-200">{planta_nombre}</span>
          {onCrearFolio && (
            <button
              type="button"
              onClick={handleCrearFolio}
              className="flex-shrink-0 rounded bg-emerald-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-600"
            >
              Crear folio
            </button>
          )}
          {onCrearFolioUrgente && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCrearFolioUrgente(planta_id, planta_nombre); }}
              className="flex-shrink-0 rounded bg-amber-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-amber-500"
            >
              Crear folio urgente
            </button>
          )}
          {onCrearProyecto && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCrearProyecto(planta_id, planta_nombre); }}
              className="flex-shrink-0 rounded bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-500"
            >
              Crear proyecto
            </button>
          )}
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {stats.count} folios · {fmtMxn(stats.total_mxn)}
          {stats.avg_aging != null && ` · ${stats.avg_aging}d prom`}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {CAT_ORDER.map((cat) => {
          const cards = (porCategoria[cat] || []).filter((c) => matchesSearch(c, searchTerm));
          if (cards.length === 0) return null;
          const totalCol = cards.reduce((s, c) => s + (Number(c.importe) || 0), 0);
          return (
            <div key={cat} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[10px] uppercase tracking-wide text-slate-500">{cat}</span>
                <span className="text-[10px] font-medium text-amber-400/90">{fmtMxn(totalCol)}</span>
              </div>
              <div className="space-y-1.5">
                {cards.map((c) => (
                  <FolioCard key={c.id} card={c} onOpen={onOpenFolio} role={role} onSubirPoliza={onSubirPoliza} onImprimirGastos={onImprimirGastos} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
