"use client";

import { useState } from "react";
import FolioCard from "./FolioCard";
import type { FolioCard as FolioCardType, KanbanBoard as KanbanBoardType } from "@/lib/api";
import { postMoverEtapaFolio } from "@/lib/api";
import { textMatchesSearch } from "@/lib/texto-busqueda";

interface Props {
  data: KanbanBoardType | null;
  selectedPlantaId?: number;
  searchTerm?: string;
  token?: string | null;
  onOpenFolio: (id: number) => void;
  onSelectPlanta?: (plantaId: number | undefined) => void;
  onSubirPoliza?: (id: number) => void;
  onImprimirGastos?: (id: number, numeroFolio: string, etapa?: string) => void;
  onCrearFolio?: (plantaId: number, plantaNombre: string) => void;
  onCrearFolioUrgente?: (plantaId: number, plantaNombre: string) => void;
  onCrearProyecto?: (plantaId: number, plantaNombre: string) => void;
  onAnalizarDuplicados?: (plantaId: number, plantaNombre: string) => void;
  /** Tras mover etapa por arrastre. */
  onMovedEtapa?: () => void;
}

const CAT_ORDER = ["GASTOS", "INVERSIONES", "DYO", "TALLER"];

const ETAPA_SHORT: Record<string, string> = {
  PENDIENTE_APROB_PLANTA: "Pendiente planta",
  APROB_DIRECTOR_ZP: "Director ZP",
  CARRO_COMPRA: "Carro",
  CUENTA_FONDOS: "Cuenta de fondos",
  CHEQUE_GENERADO: "Cheque Generado",
  DEPOSITO_CIERRE: "Depósito",
  COMPROBACIONES: "Comprobaciones",
  EVIDENCIAS: "Evidencias",
  CANCELADO: "Cancelado",
};

function IconCarrito({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function matchesSearch(card: FolioCardType, term: string | undefined): boolean {
  const q = (term || "").trim();
  if (!q) return true;
  const importeStr =
    card.importe != null && !isNaN(card.importe)
      ? card.importe.toLocaleString("es-MX", { maximumFractionDigits: 0 })
      : "";
  const fields = [
    card.numero_folio,
    card.folio_codigo,
    card.descripcion,
    card.beneficiario,
    card.categoria,
    card.subcategoria,
    card.proyecto_codigo,
    card.proyecto_nombre,
    card.planta_nombre,
    card.numero_cheque,
    importeStr,
  ];
  return fields.some((f) => textMatchesSearch(f, q));
}

function isUrgente(card: FolioCardType): boolean {
  const p = (card.prioridad || "").toString().toLowerCase();
  return p.includes("urgente") || p.includes("alta");
}

function cardsFromPorCategoria(porCategoria: Record<string, FolioCardType[]> | undefined): FolioCardType[] {
  if (!porCategoria) return [];
  const known = CAT_ORDER.flatMap((cat) => porCategoria[cat] || []);
  const knownIds = new Set(known.map((c) => c.id));
  const extra = Object.entries(porCategoria)
    .filter(([k]) => !CAT_ORDER.includes(k))
    .flatMap(([, list]) => list || [])
    .filter((c) => !knownIds.has(c.id));
  return [...known, ...extra];
}

function sortCards(cards: FolioCardType[]): FolioCardType[] {
  return [...cards].sort((a, b) => {
    const ua = isUrgente(a) ? 0 : 1;
    const ub = isUrgente(b) ? 0 : 1;
    if (ua !== ub) return ua - ub;
    const aa = a.aging ?? -1;
    const bb = b.aging ?? -1;
    return bb - aa;
  });
}

const CLAVES_CODIGO_PLANTA = ["E7", "E8", "E9", "E10", "E11", "E12", "E13", "E15"];

function isPlantaVisible(nombre: string): boolean {
  const n = (nombre || "").trim().toUpperCase();
  if (CLAVES_CODIGO_PLANTA.includes(n)) return false;
  if (/^E\d+$/.test(n)) return false;
  return true;
}

export default function KanbanBoard({
  data,
  selectedPlantaId,
  searchTerm,
  token,
  onOpenFolio,
  onSelectPlanta,
  onSubirPoliza,
  onImprimirGastos,
  onCrearFolio,
  onCrearFolioUrgente,
  onAnalizarDuplicados,
  onCrearProyecto,
  onMovedEtapa,
}: Props) {
  const [dragOverEtapa, setDragOverEtapa] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">Cargando tablero…</div>
    );
  }

  const role = data.meta?.role || "GG";
  const roleUpper = String(role).toUpperCase();
  const canDrag = roleUpper === "AD" || roleUpper === "ZP";
  const fmtMxn = (n: number | null | undefined) =>
    n != null && !isNaN(n) ? `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "—";

  const plantsMap = new Map<number, { planta_id: number; planta_nombre: string }>();
  for (const col of data.board || []) {
    for (const p of col.plantas || []) {
      if (!isPlantaVisible(p.planta_nombre || "")) continue;
      if (!plantsMap.has(p.planta_id)) {
        plantsMap.set(p.planta_id, { planta_id: p.planta_id, planta_nombre: p.planta_nombre });
      }
    }
  }
  const plants = Array.from(plantsMap.values()).sort((a, b) =>
    (a.planta_nombre || "").localeCompare(b.planta_nombre || "", "es")
  );
  const activePlanta =
    selectedPlantaId != null ? plants.find((p) => p.planta_id === selectedPlantaId) : null;

  const columns = (data.board || []).map((col) => {
    let cards: FolioCardType[] = [];
    for (const p of col.plantas || []) {
      if (selectedPlantaId != null && p.planta_id !== selectedPlantaId) continue;
      if (!isPlantaVisible(p.planta_nombre || "")) continue;
      const list = sortCards(cardsFromPorCategoria(p.porCategoria).filter((c) => matchesSearch(c, searchTerm)));
      cards = cards.concat(list.map((c) => ({ ...c, planta_nombre: c.planta_nombre || p.planta_nombre })));
    }
    const total_mxn = cards.reduce((s, c) => s + (Number(c.importe) || 0), 0);
    return {
      etapa: col.etapa,
      etapa_label: col.etapa_label ?? ETAPA_SHORT[col.etapa] ?? col.etapa,
      etapa_icon: col.etapa_icon,
      count: cards.length,
      total_mxn,
      cards,
    };
  });

  const handleDrop = async (etapaDestino: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverEtapa(null);
    if (!canDrag || !token || moving) return;
    const raw = e.dataTransfer.getData("application/x-folio-id") || e.dataTransfer.getData("text/plain");
    const folioId = parseInt(raw, 10);
    if (!Number.isFinite(folioId)) return;
    setMoving(true);
    setMoveError(null);
    try {
      await postMoverEtapaFolio(token, folioId, etapaDestino);
      onMovedEtapa?.();
    } catch (err) {
      setMoveError((err as Error).message || "No se pudo mover el folio");
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Tabs de planta */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-700 bg-slate-900/60 p-1">
          <button
            type="button"
            onClick={() => onSelectPlanta?.(undefined)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedPlantaId == null
                ? "bg-amber-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Todas
          </button>
          {plants.map((p) => (
            <button
              key={p.planta_id}
              type="button"
              onClick={() => onSelectPlanta?.(p.planta_id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedPlantaId === p.planta_id
                  ? "bg-amber-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {p.planta_nombre}
            </button>
          ))}
        </div>

        {activePlanta && (
          <div className="flex flex-wrap items-center gap-1.5">
            {onCrearFolio && (
              <button
                type="button"
                onClick={() => onCrearFolio(activePlanta.planta_id, activePlanta.planta_nombre)}
                className="rounded bg-emerald-700 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-600"
              >
                Crear folio
              </button>
            )}
            {onCrearFolioUrgente && (
              <button
                type="button"
                onClick={() => onCrearFolioUrgente(activePlanta.planta_id, activePlanta.planta_nombre)}
                className="rounded bg-amber-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-amber-500"
              >
                Crear folio urgente
              </button>
            )}
            {onCrearProyecto && (
              <button
                type="button"
                onClick={() => onCrearProyecto(activePlanta.planta_id, activePlanta.planta_nombre)}
                className="rounded bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-blue-500"
              >
                Crear proyecto
              </button>
            )}
            {onAnalizarDuplicados && (
              <button
                type="button"
                onClick={() => onAnalizarDuplicados(activePlanta.planta_id, activePlanta.planta_nombre)}
                className="rounded bg-slate-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-slate-500"
                title="Busca folios con mismo importe y concepto similar"
              >
                Análisis duplicados
              </button>
            )}
          </div>
        )}
      </div>

      {canDrag && (
        <p className="text-[11px] text-slate-500">
          Puedes arrastrar folios entre columnas para cambiar etapa (sin validar condiciones).
          {moving ? " Moviendo…" : ""}
        </p>
      )}
      {moveError && <p className="text-xs text-red-400">{moveError}</p>}

      {/* Columnas por etapa */}
      <div className="flex gap-3 overflow-x-auto pb-2 min-h-[60vh]">
        {columns.map((col) => (
          <div
            key={col.etapa}
            className={`flex w-[17.5rem] flex-shrink-0 flex-col rounded-lg border bg-slate-900/55 transition-colors ${
              dragOverEtapa === col.etapa ? "border-amber-500 bg-amber-950/20" : "border-slate-700"
            }`}
            onDragOver={(e) => {
              if (!canDrag) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOverEtapa(col.etapa);
            }}
            onDragLeave={() => {
              setDragOverEtapa((prev) => (prev === col.etapa ? null : prev));
            }}
            onDrop={(e) => void handleDrop(col.etapa, e)}
          >
            <div className="sticky top-0 z-[1] border-b border-slate-700 bg-slate-900/95 px-2.5 py-2 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 font-medium text-slate-100">
                {col.etapa === "CARRO_COMPRA" ? (
                  <IconCarrito className="h-4 w-4 text-slate-300" />
                ) : col.etapa_icon ? (
                  <span className="text-base leading-none" aria-hidden>
                    {col.etapa_icon}
                  </span>
                ) : null}
                <span className="text-sm">{col.etapa_label}</span>
              </div>
              <div className="mt-1 flex gap-2 text-[11px] text-slate-400">
                <span>{col.count} folios</span>
                <span className="text-amber-400/90">{fmtMxn(col.total_mxn)}</span>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-2 max-h-[calc(100vh-14rem)]">
              {col.cards.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-slate-500">
                  {canDrag ? "Suelta aquí un folio" : "Sin folios"}
                </p>
              ) : (
                col.cards.map((c) => (
                  <div key={c.id} className="space-y-0.5">
                    {selectedPlantaId == null && c.planta_nombre && (
                      <div className="px-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        {c.planta_nombre}
                      </div>
                    )}
                    <FolioCard
                      card={c}
                      onOpen={onOpenFolio}
                      role={role}
                      onSubirPoliza={onSubirPoliza}
                      onImprimirGastos={onImprimirGastos}
                      draggableCard={canDrag}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
