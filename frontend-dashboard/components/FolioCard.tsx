"use client";

import type { FolioCard as FolioCardType } from "@/lib/api";

interface Props {
  card: FolioCardType;
  onOpen: (id: number) => void;
  role: string;
}

function etapaColor(estatus: string | null): string {
  if (!estatus) return "bg-slate-600";
  const e = (estatus || "").toUpperCase();
  if (e.includes("PENDIENTE") || e.includes("CANCELACION")) return "border-l-amber-500";
  if (e.includes("APROB") || e.includes("LISTO")) return "border-l-blue-500";
  if (e.includes("PAGO") || e.includes("PAGADO") || e.includes("CERRADO")) return "border-l-green-600";
  if (e.includes("CANCELADO")) return "border-l-red-900";
  return "border-l-slate-500";
}

export default function FolioCard({ card, onOpen, role }: Props) {
  const mxn = card.importe != null && !isNaN(card.importe)
    ? `$${card.importe.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`
    : null;

  return (
    <div
      className={`rounded border border-slate-700 bg-slate-800/80 p-2.5 border-l-4 ${etapaColor(card.estatus)} cursor-pointer hover:bg-slate-700/80 transition-colors`}
      onClick={() => onOpen(card.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(card.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-medium text-slate-200">{card.folio_codigo}</span>
        {mxn && <span className="text-xs text-slate-400">{mxn}</span>}
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{card.descripcion || "—"}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {card.categoria && (
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">{card.categoria}</span>
        )}
        {(card.subcategoria || card.unidad) && (
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">
            {card.subcategoria || card.unidad}
          </span>
        )}
        {card.aging != null && (
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">{card.aging}d</span>
        )}
      </div>
    </div>
  );
}
