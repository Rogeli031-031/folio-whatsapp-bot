"use client";

import FolioCard from "./FolioCard";
import type { FolioCard as FolioCardType, KanbanBoard as KanbanBoardType } from "@/lib/api";

interface Props {
  data: KanbanBoardType | null;
  selectedPlantaId?: number;
  searchTerm?: string;
  onOpenFolio: (id: number) => void;
  onSelectPlanta?: (plantaId: number | undefined) => void;
  onSubirPoliza?: (id: number) => void;
  onImprimirGastos?: (id: number, numeroFolio: string, etapa?: string) => void;
  onCrearFolio?: (plantaId: number, plantaNombre: string) => void;
  onCrearFolioUrgente?: (plantaId: number, plantaNombre: string) => void;
  onCrearProyecto?: (plantaId: number, plantaNombre: string) => void;
}

const CAT_ORDER = ["GASTOS", "INVERSIONES", "DYO", "TALLER"];

const ETAPA_SHORT: Record<string, string> = {
  PENDIENTE_APROB_PLANTA: "Pendiente planta",
  APROB_DIRECTOR_ZP: "Director ZP",
  CARRO_COMPRA: "Carro",
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
    card.beneficiario,
    card.categoria,
    card.subcategoria,
    card.proyecto_codigo,
    card.proyecto_nombre,
    card.planta_nombre,
    card.numero_cheque,
    importeStr,
  ];
  return fields.some((f) => (f || "").toString().toLowerCase().includes(q));
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
  onOpenFolio,
  onSelectPlanta,
  onSubirPoliza,
  onImprimirGastos,
  onCrearFolio,
  onCrearFolioUrgente,
  onCrearProyecto,
}: Props) {
  if (!data) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">Cargando tablero…</div>
    );
  }

  const role = data.meta?.role || "GG";
  const fmtMxn = (n: number | null | undefined) =>
    n != null && !isNaN(n) ? `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "—";

  const plantsRaw = data.board[0]?.plantas ?? [];
  const plants = plantsRaw.filter((p) => isPlantaVisible(p.planta_nombre || ""));

  const activePlanta =
    selectedPlantaId != null
      ? plants.find((p) => p.planta_id === selectedPlantaId) || null
      : null;

  const columns = data.board.map((col) => {
    const plantasSrc = selectedPlantaId
      ? col.plantas.filter((p) => p.planta_id === selectedPlantaId)
      : col.plantas.filter((p) => isPlantaVisible(p.planta_nombre || ""));

    const cards = sortCards(
      plantasSrc
        .flatMap((p) =>
          cardsFromPorCategoria(p.porCategoria).map((c) => ({
            ...c,
            planta_id: c.planta_id ?? p.planta_id,
            planta_nombre: c.planta_nombre || p.planta_nombre,
          }))
        )
        .filter((c) => matchesSearch(c, searchTerm))
    );

    const totalMxn = cards.reduce((s, c) => s + (Number(c.importe) || 0), 0);

    return {
      etapa: col.etapa,
      etapa_label: col.etapa_label ?? ETAPA_SHORT[col.etapa] ?? col.etapa,
      etapa_icon: col.etapa_icon,
      cards,
      count: cards.length,
      total_mxn: totalMxn,
    };
  });

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
          </div>
        )}
      </div>

      {/* Columnas por etapa */}
      <div className="flex gap-3 overflow-x-auto pb-2 min-h-[60vh]">
        {columns.map((col) => (
          <div
            key={col.etapa}
            className="flex w-[17.5rem] flex-shrink-0 flex-col rounded-lg border border-slate-700 bg-slate-900/55"
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
                <p className="px-1 py-6 text-center text-xs text-slate-500">Sin folios</p>
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
