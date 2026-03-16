"use client";

import FolioCard from "./FolioCard";
import type { FolioCard as FolioCardType } from "@/lib/api";

const CAT_ORDER = ["GASTOS", "INVERSIONES", "DYO", "TALLER"];
const ROW_ORDER = ["Proyectos", ...CAT_ORDER] as const;

const ETAPA_LABELS: Record<string, string> = {
  PENDIENTE_APROB_PLANTA: "Pendiente aprobación planta",
  APROB_DIRECTOR_ZP: "Aprobación Director ZP",
  CARRO_COMPRA: "Carro de compra",
  DEPOSITO_CIERRE: "Depósito y cierre",
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

function EtapaIcon({ etapa, icon }: { etapa: string; icon?: string }) {
  if (etapa === "CARRO_COMPRA") {
    return <IconCarrito className="h-5 w-5 text-slate-300" />;
  }
  if (icon) {
    return <span className="text-lg leading-none" aria-hidden>{icon}</span>;
  }
  return null;
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
    (card as any).beneficiario,
    card.categoria,
    card.subcategoria,
    card.proyecto_codigo,
    card.proyecto_nombre,
    importeStr,
  ];
  return fields.some((f) => (f || "").toString().toLowerCase().includes(q));
}

function isUrgente(card: FolioCardType): boolean {
  const p = (card.prioridad || "").toString().toLowerCase();
  return p.includes("urgente") || p.includes("alta");
}

/** True si la tarjeta corresponde a la categoría DYO (no debe duplicarse en Urgentes). */
function isCategoriaDYO(card: FolioCardType): boolean {
  const c = (card.categoria || "").toString().trim().toUpperCase();
  return c === "DYO" || c.includes("DERECHOS") || c.includes("OBLIGACIONES");
}

export interface StageData {
  etapa: string;
  etapa_label?: string;
  etapa_icon?: string;
  stats?: { count: number; total_mxn: number; avg_aging: number | null };
  porCategoria: Record<string, FolioCardType[]>;
}

interface Props {
  planta_id: number;
  planta_nombre: string;
  stagesData: StageData[];
  searchTerm?: string;
  onOpenFolio: (id: number) => void;
  role: string;
  onSubirPoliza?: (id: number) => void;
  onImprimirGastos?: (id: number, numeroFolio: string, etapa?: string) => void;
  onCrearFolio?: (plantaId: number, plantaNombre: string) => void;
  onCrearFolioUrgente?: (plantaId: number, plantaNombre: string) => void;
  onCrearProyecto?: (plantaId: number, plantaNombre: string) => void;
}

export default function PlantTable({
  planta_id,
  planta_nombre,
  stagesData,
  searchTerm,
  onOpenFolio,
  role,
  onSubirPoliza,
  onImprimirGastos,
  onCrearFolio,
  onCrearFolioUrgente,
  onCrearProyecto,
}: Props) {
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

  const getCardsForRowAndStage = (rowKey: string, porCategoria: Record<string, FolioCardType[]>): FolioCardType[] => {
    const all = CAT_ORDER.flatMap((cat) => porCategoria[cat] || []);
    const filtered = all.filter((c) => matchesSearch(c, searchTerm));
    if (rowKey === "Urgentes") return filtered.filter(isUrgente).filter((c) => !isCategoriaDYO(c));
    if (rowKey === "Proyectos") return filtered.filter((c) => c.proyecto_id != null);
    return (porCategoria[rowKey] || []).filter((c) => matchesSearch(c, searchTerm));
  };

  /** Agrupa tarjetas por subcategoría para mostrar en columnas. */
  const groupBySubcategoria = (cards: FolioCardType[]): Record<string, FolioCardType[]> => {
    const out: Record<string, FolioCardType[]> = {};
    for (const c of cards) {
      const sub = (c.subcategoria || "").trim() || "—";
      if (!out[sub]) out[sub] = [];
      out[sub].push(c);
    }
    return out;
  };

  /** Agrupa tarjetas por proyecto (para la fila Proyectos). Clave: id_codigo para ordenar. */
  const groupByProyecto = (cards: FolioCardType[]): Record<string, FolioCardType[]> => {
    const out: Record<string, FolioCardType[]> = {};
    for (const c of cards) {
      const id = c.proyecto_id ?? 0;
      const cod = (c.proyecto_codigo || "").trim() || "—";
      const key = `${id}_${cod}`;
      if (!out[key]) out[key] = [];
      out[key].push(c);
    }
    return out;
  };

  return (
    <div className="rounded border border-slate-700 bg-slate-800/40 p-3">
      <div className="sticky top-0 z-20 -mx-3 -mt-3 mb-3 flex items-center justify-between gap-2 border-b border-slate-600 bg-slate-900 px-3 py-2 shadow-md">
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
      </div>

      <div className="pb-0 -mr-3">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-10 w-[140px] flex-shrink-0 border border-slate-600 bg-slate-800 p-2 text-left text-[10px] font-medium uppercase tracking-wide text-slate-400 align-top shadow-[2px_0_4px_rgba(0,0,0,0.2)]">
                Categoría
              </th>
              {stagesData.map((s) => {
                const label = s.etapa_label ?? ETAPA_LABELS[s.etapa] ?? s.etapa;
                const st = s.stats;
                return (
                  <th
                    key={s.etapa}
                    className="sticky top-0 z-10 min-w-[220px] border border-slate-600 bg-slate-800 p-2 text-left align-top shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                  >
                    <div className="flex items-center gap-2 font-medium text-slate-200">
                      <EtapaIcon etapa={s.etapa} icon={s.etapa_icon} />
                      <span className="text-sm">{label}</span>
                    </div>
                    {st && (
                      <div className="mt-1 flex gap-2 text-xs text-slate-400">
                        <span>{st.count} folios</span>
                        <span>{fmtMxn(st.total_mxn)}</span>
                        {st.avg_aging != null && <span>{st.avg_aging}d prom</span>}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ROW_ORDER.map((rowKey) => (
              <tr key={rowKey}>
                <td className="sticky left-0 z-[5] w-[140px] border border-slate-600 bg-slate-800/80 p-2 align-top shadow-[2px_0_4px_rgba(0,0,0,0.15)]">
                  <span className="text-xs font-medium text-slate-300" style={{ writingMode: "horizontal-tb" }}>
                    {rowKey}
                  </span>
                </td>
                {stagesData.map((s) => {
                  const cards = getCardsForRowAndStage(rowKey, s.porCategoria);
                  const total = cards.reduce((sum, c) => sum + (Number(c.importe) || 0), 0);
                  const isProyectos = rowKey === "Proyectos";
                  const bySub = isProyectos ? groupByProyecto(cards) : groupBySubcategoria(cards);
                  const subKeys = Object.keys(bySub).sort((a, b) => (a === "—" || a.startsWith("0_") ? 1 : b === "—" || b.startsWith("0_") ? -1 : a.localeCompare(b)));
                  return (
                    <td
                      key={s.etapa}
                      className="min-w-[220px] border border-slate-600 bg-slate-900/40 p-2 align-top"
                    >
                      <div className="mb-1 text-[10px] text-amber-400/90">{fmtMxn(total)}</div>
                      <div className="flex gap-2 min-h-[40px]">
                        {subKeys.length === 0 ? (
                          <span className="text-xs text-slate-500">—</span>
                        ) : (
                          subKeys.map((subKey) => {
                            const subCards = bySub[subKey] || [];
                            const subTotal = subCards.reduce((sum, c) => sum + (Number(c.importe) || 0), 0);
                            const masDeSeis = subCards.length > 6;
                            const first = subCards[0];
                            const blockTitle = isProyectos
                              ? (first?.proyecto_codigo || first?.proyecto_nombre || "—")
                              : subKey;
                            const blockDesc = isProyectos ? (first?.proyecto_nombre || "") : "";
                            return (
                              <div
                                key={subKey}
                                className={
                                  masDeSeis
                                    ? "flex-shrink-0 w-[630px] min-w-[630px] rounded border border-slate-600 bg-slate-800/60 p-1.5"
                                    : "flex-shrink-0 w-[200px] rounded border border-slate-600 bg-slate-800/60 p-1.5"
                                }
                              >
                                <div className="mb-1 text-[10px] font-medium text-slate-400 truncate" title={isProyectos ? `${first?.proyecto_codigo ?? ""} ${first?.proyecto_nombre ?? ""}`.trim() || undefined : subKey}>
                                  {isProyectos ? (
                                    <>
                                      <span className="block truncate">{first?.proyecto_codigo || "—"}</span>
                                      {blockDesc ? <span className="block truncate text-slate-500 font-normal">{blockDesc}</span> : null}
                                    </>
                                  ) : (
                                    blockTitle
                                  )}
                                </div>
                                <div className="text-[10px] text-amber-400/80 mb-1">{fmtMxn(subTotal)}</div>
                                <div className={masDeSeis ? "grid grid-cols-3 gap-2" : "space-y-1"}>
                                  {subCards.map((c) => (
                                    <FolioCard
                                      key={c.id}
                                      card={c}
                                      onOpen={onOpenFolio}
                                      role={role}
                                      onSubirPoliza={onSubirPoliza}
                                      onImprimirGastos={onImprimirGastos ? (id, num) => onImprimirGastos(id, num, s.etapa) : undefined}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
