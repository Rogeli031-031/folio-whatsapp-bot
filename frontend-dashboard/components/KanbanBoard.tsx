"use client";

import PlantTable, { type StageData } from "./PlantTable";
import type { KanbanBoard as KanbanBoardType } from "@/lib/api";

interface Props {
  data: KanbanBoardType | null;
  selectedPlantaId?: number;
  searchTerm?: string;
  onOpenFolio: (id: number) => void;
  onSubirPoliza?: (id: number) => void;
  onImprimirGastos?: (id: number, numeroFolio: string, etapa?: string) => void;
  onCrearFolio?: (plantaId: number, plantaNombre: string) => void;
  onCrearFolioUrgente?: (plantaId: number, plantaNombre: string) => void;
  onCrearProyecto?: (plantaId: number, plantaNombre: string) => void;
}

const EMPTY_POR_CAT = { GASTOS: [], INVERSIONES: [], DYO: [], TALLER: [] };

export default function KanbanBoard({ data, selectedPlantaId, searchTerm, onOpenFolio, onSubirPoliza, onImprimirGastos, onCrearFolio, onCrearFolioUrgente, onCrearProyecto }: Props) {
  if (!data) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">Cargando tablero…</div>
    );
  }

  const role = data.meta?.role || "GG";

  const plants = data.board[0]?.plantas ?? [];
  const plantsFiltered = selectedPlantaId
    ? plants.filter((p) => p.planta_id === selectedPlantaId)
    : plants;

  const stagesDataByPlant = plantsFiltered.map((plant) => ({
    planta_id: plant.planta_id,
    planta_nombre: plant.planta_nombre,
    stagesData: data.board.map((col): StageData => {
      const p = col.plantas.find((x) => x.planta_id === plant.planta_id);
      return {
        etapa: col.etapa,
        etapa_label: col.etapa_label,
        porCategoria: p?.porCategoria ?? EMPTY_POR_CAT,
      };
    }),
  }));

  return (
    <div className="overflow-visible pb-4">
      <div className="space-y-4 p-4">
        {stagesDataByPlant.map(({ planta_id, planta_nombre, stagesData }) => (
          <PlantTable
            key={planta_id}
            planta_id={planta_id}
            planta_nombre={planta_nombre}
            stagesData={stagesData}
            searchTerm={searchTerm}
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
