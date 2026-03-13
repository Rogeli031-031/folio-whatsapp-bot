"use client";

import EtapaColumn from "./EtapaColumn";
import type { KanbanBoard as KanbanBoardType } from "@/lib/api";

interface Props {
  data: KanbanBoardType | null;
  selectedPlantaId?: number;
  onOpenFolio: (id: number) => void;
  onSubirPoliza?: (id: number) => void;
  onImprimirGastos?: (id: number, numeroFolio: string, etapa?: string) => void;
  onCrearFolio?: (plantaId: number, plantaNombre: string) => void;
  onCrearFolioUrgente?: (plantaId: number, plantaNombre: string) => void;
  onCrearProyecto?: (plantaId: number, plantaNombre: string) => void;
}

export default function KanbanBoard({ data, selectedPlantaId, onOpenFolio, onSubirPoliza, onImprimirGastos, onCrearFolio, onCrearFolioUrgente, onCrearProyecto }: Props) {
  if (!data) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">Cargando tablero…</div>
    );
  }

  const role = data.meta?.role || "GG";

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 p-4">
        {data.board.map((col) => (
          <EtapaColumn
            key={col.etapa}
            column={col}
            selectedPlantaId={selectedPlantaId}
            onOpenFolio={onOpenFolio}
            role={role}
            onSubirPoliza={onSubirPoliza}
            onImprimirGastos={onImprimirGastos}
            onCrearFolio={onCrearFolio}
            onCrearFolioUrgente={onCrearFolioUrgente}
            onCrearProyecto={onCrearProyecto}
          />
        ))}
      </div>
    </div>
  );
}
