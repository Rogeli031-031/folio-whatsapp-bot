"use client";

import { useEffect, useState } from "react";
import { fetchPlantas } from "@/lib/api";
import { DirectorIaChatPanel } from "@/modules/director-ia/components/DirectorIaChatPanel";

const CLAVES_CODIGO_PLANTA = ["E7", "E8", "E9", "E10", "E11", "E12", "E13", "E15"];

function filterAuthorizedPlantas(plantas: { id: number; nombre: string }[]) {
  return (plantas || []).filter((p) => {
    const nombre = (p.nombre || "").trim();
    const upper = nombre.toUpperCase();
    if (CLAVES_CODIGO_PLANTA.includes(upper)) return false;
    if (/^E\d+$/.test(nombre)) return false;
    const norm = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    if (norm === "MEXICO") return false;
    return true;
  });
}

type PlantOption = { id: number; nombre: string };

type DirectorIaChatModalProps = {
  open: boolean;
  onClose: () => void;
  token: string;
  plantaId?: number;
  plantaNombre?: string;
  uploadDay?: string | null;
  size?: "default" | "large";
  plantMode?: "fixed" | "select";
};

export function DirectorIaChatModal({
  open,
  onClose,
  token,
  plantaId,
  plantaNombre,
  uploadDay = null,
  size = "default",
  plantMode = "fixed",
}: DirectorIaChatModalProps) {
  const [plantas, setPlantas] = useState<PlantOption[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<PlantOption | null>(null);
  const [plantasLoading, setPlantasLoading] = useState(false);
  const [plantasError, setPlantasError] = useState<string | null>(null);
  const [chatEpoch, setChatEpoch] = useState(0);

  useEffect(() => {
    if (!open) {
      setSelectedPlant(null);
      setPlantas([]);
      setPlantasError(null);
      setPlantasLoading(false);
      setChatEpoch((n) => n + 1);
      return;
    }

    if (plantMode !== "select") return;

    let cancelled = false;
    setPlantasLoading(true);
    setPlantasError(null);
    void fetchPlantas(token)
      .then((r) => {
        if (cancelled) return;
        const filtered = filterAuthorizedPlantas(r.plantas || []);
        setPlantas(filtered);
        if (filtered.length === 1) {
          setSelectedPlant(filtered[0]);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setPlantas([]);
        setSelectedPlant(null);
        setPlantasError(e instanceof Error ? e.message : "No se pudieron cargar las plantas.");
      })
      .finally(() => {
        if (!cancelled) setPlantasLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, plantMode, token]);

  if (!open) return null;

  const isLarge = size === "large";
  const authorizedSelected =
    plantMode === "select" && selectedPlant
      ? plantas.some((p) => p.id === selectedPlant.id)
        ? selectedPlant
        : null
      : null;

  const activePlant: PlantOption | null =
    plantMode === "select"
      ? authorizedSelected
      : typeof plantaId === "number" && Number.isFinite(plantaId) && plantaId > 0
        ? { id: plantaId, nombre: plantaNombre || "" }
        : null;

  const showPlantPicker = plantMode === "select" && !activePlant;
  const panelKey =
    plantMode === "select"
      ? `${activePlant?.id ?? "none"}-${chatEpoch}`
      : `${plantaId}-${open}`;

  function choosePlant(plant: PlantOption) {
    if (!plantas.some((p) => p.id === plant.id)) return;
    setSelectedPlant(plant);
    setChatEpoch((n) => n + 1);
  }

  function changePlant() {
    setSelectedPlant(null);
    setChatEpoch((n) => n + 1);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={
          isLarge
            ? "flex flex-col w-[min(1024px,calc(100vw-32px))] h-[min(780px,calc(100vh-32px))] max-w-full rounded-xl border border-cyan-800/60 bg-slate-900 shadow-xl"
            : "flex flex-col w-full max-w-lg max-h-[85vh] rounded-xl border border-cyan-800/60 bg-slate-900 shadow-xl"
        }
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="director-ia-chat-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 shrink-0">
          <div>
            <h2 id="director-ia-chat-title" className="text-base font-semibold text-white">
              Chat Director IA
            </h2>
            {activePlant?.nombre ? (
              <p className="text-xs text-slate-400 mt-0.5">Planta: {activePlant.nombre}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {plantMode === "select" && activePlant && plantas.length > 1 ? (
              <button
                type="button"
                onClick={changePlant}
                className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cambiar planta
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
              aria-label="Cerrar chat"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0 px-4 py-3 overflow-hidden">
          {showPlantPicker ? (
            <div className="flex flex-col flex-1 min-h-0">
              <p className="text-sm text-slate-200 mb-3">¿De qué planta quieres consultar?</p>
              {plantasLoading ? (
                <p className="text-sm text-slate-400">Cargando plantas…</p>
              ) : null}
              {plantasError ? <p className="text-sm text-red-300/90">{plantasError}</p> : null}
              {!plantasLoading && !plantasError && plantas.length === 0 ? (
                <p className="text-sm text-slate-400">No hay plantas autorizadas para consultar.</p>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto min-h-0 pr-1">
                {plantas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => choosePlant(p)}
                    className="rounded border border-cyan-700/70 bg-cyan-950/40 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-900/50 text-left"
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>
            </div>
          ) : activePlant ? (
            <DirectorIaChatPanel
              key={panelKey}
              token={token}
              plantaId={activePlant.id}
              plantaNombre={activePlant.nombre || undefined}
              uploadDay={uploadDay}
              chatMode
              fillAvailable={isLarge}
              className={isLarge ? "flex-1 min-h-0" : "flex-1 min-h-[320px]"}
            />
          ) : (
            <p className="text-sm text-slate-400">Selecciona una planta autorizada para abrir el chat.</p>
          )}
        </div>
      </div>
    </div>
  );
}
