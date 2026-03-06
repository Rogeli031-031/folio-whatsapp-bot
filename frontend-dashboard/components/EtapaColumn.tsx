"use client";

import PlantaSection from "./PlantaSection";
import type { KanbanBoard } from "@/lib/api";

interface Props {
  column: KanbanBoard["board"][0];
  onOpenFolio: (id: number) => void;
  role: string;
  onSubirPoliza?: (id: number) => void;
  onImprimirGastos?: (id: number, numeroFolio: string) => void;
  onCrearFolio?: (plantaId: number, plantaNombre: string) => void;
}

const ETAPA_LABELS: Record<string, string> = {
  PENDIENTE_APROB_PLANTA: "Pendiente aprobación planta",
  APROB_DIRECTOR_ZP: "Aprobación Director ZP",
  CARRO_COMPRA: "Carro de compra",
  DEPOSITO_CIERRE: "Depósito y cierre",
  CANCELADO: "Cancelado",
};

/** Ícono carrito de supermercado (etapa Carro de compra). */
function IconCarrito({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function EtapaIcon({ etapa, icon }: { etapa: string; icon?: string }) {
  if (etapa === "CARRO_COMPRA") {
    return <IconCarrito className="h-5 w-5 text-slate-300" />;
  }
  if (icon) {
    return <span className="text-lg leading-none" aria-hidden>{icon}</span>;
  }
  return null;
}

export default function EtapaColumn({ column, onOpenFolio, role, onSubirPoliza, onImprimirGastos, onCrearFolio }: Props) {
  const label = column.etapa_label ?? ETAPA_LABELS[column.etapa] ?? column.etapa;
  const fmtMxn = (n: number | null) =>
    n != null && !isNaN(n) ? `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "—";

  return (
    <div className="flex-shrink-0 w-[60rem] rounded-lg border border-slate-700 bg-slate-900/50">
      <div className="border-b border-slate-700 p-2">
        <div className="flex items-center gap-2 font-medium text-slate-200">
          <EtapaIcon etapa={column.etapa} icon={column.etapa_icon} />
          <span>{label}</span>
        </div>
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
            onSubirPoliza={onSubirPoliza}
            onImprimirGastos={onImprimirGastos}
            onCrearFolio={onCrearFolio}
          />
        ))}
      </div>
    </div>
  );
}
