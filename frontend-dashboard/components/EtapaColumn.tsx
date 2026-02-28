"use client";

import PlantaSection from "./PlantaSection";
import type { KanbanBoard } from "@/lib/api";

interface Props {
  column: KanbanBoard["board"][0];
  onOpenFolio: (id: number) => void;
  role: string;
}

const ETAPA_LABELS: Record<string, string> = {
  GENERADO: "Generado",
  PENDIENTE_APROB_PLANTA: "Pend. aprob. planta",
  APROB_PLANTA: "Aprob. planta",
  PENDIENTE_APROB_ZP: "Pend. aprob. ZP",
  APROBADO_ZP: "Aprobado ZP",
  LISTO_PARA_PROGRAMACION: "Listo programación",
  SELECCIONADO_SEMANA: "Seleccionado semana",
  SOLICITANDO_PAGO: "Solicitando pago",
  PAGADO: "Pagado",
  CERRADO: "Cerrado",
  CANCELACION_SOLICITADA: "Cancelación solicitada",
  CANCELADO: "Cancelado",
};

export default function EtapaColumn({ column, onOpenFolio, role }: Props) {
  const label = ETAPA_LABELS[column.etapa] || column.etapa;
  const fmtMxn = (n: number | null) =>
    n != null && !isNaN(n) ? `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "—";

  return (
    <div className="flex-shrink-0 w-80 rounded-lg border border-slate-700 bg-slate-900/50">
      <div className="border-b border-slate-700 p-2">
        <div className="font-medium text-slate-200">{label}</div>
        <div className="mt-1 flex gap-2 text-xs text-slate-400">
          <span>{column.stats.count} folios</span>
          {column.stats.total_mxn != null && <span>{fmtMxn(column.stats.total_mxn)}</span>}
          {column.stats.avg_aging != null && <span>{column.stats.avg_aging}d prom</span>}
        </div>
      </div>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-2">
        {column.plantas.map((planta) => (
          <PlantaSection
            key={planta.planta_id}
            planta_id={planta.planta_id}
            planta_nombre={planta.planta_nombre}
            stats={planta.stats}
            porCategoria={planta.porCategoria}
            onOpenFolio={onOpenFolio}
            role={role}
          />
        ))}
      </div>
    </div>
  );
}
