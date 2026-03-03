"use client";

import type { FolioCard as FolioCardType } from "@/lib/api";

interface Props {
  card: FolioCardType;
  onOpen: (id: number) => void;
  role: string;
  onSubirPoliza?: (id: number) => void;
}

/** Estatus técnico → etapa visual (alineado con backend). */
function estatusToEtapaVisual(estatus: string | null): string {
  const s = (estatus || "").trim().toUpperCase();
  if (!s) return "PENDIENTE_APROB_PLANTA";
  if (s === "CANCELADO") return "CANCELADO";
  if (s === "CANCELACION_SOLICITADA") return "APROB_DIRECTOR_ZP";
  if (["PAGADO", "CERRADO"].includes(s)) return "DEPOSITO_CIERRE";
  if (["APROBADO_ZP", "LISTO_PARA_PROGRAMACION", "SELECCIONADO_SEMANA", "SOLICITANDO_PAGO"].includes(s)) return "CARRO_COMPRA";
  if (s === "PENDIENTE_APROB_ZP" || /RECHAZADO_ZP/.test(s)) return "APROB_DIRECTOR_ZP";
  return "PENDIENTE_APROB_PLANTA";
}

/** Color del borde por etapa visual. Carro = neutro; preparado para modoColorCarrito "por_igf" en el futuro. */
const MODO_COLOR_CARRITO = "default" as const;

function etapaColor(estatus: string | null): string {
  if (!estatus) return "border-l-slate-500";
  const etapa = estatusToEtapaVisual(estatus);
  if (etapa === "CANCELADO") return "border-l-red-900";
  if (etapa === "DEPOSITO_CIERRE") return "border-l-green-600";
  if (etapa === "CARRO_COMPRA") {
    return MODO_COLOR_CARRITO === "default" ? "border-l-slate-400" : "border-l-slate-400";
  }
  if (etapa === "APROB_DIRECTOR_ZP") return "border-l-amber-500";
  return "border-l-amber-500";
}

export default function FolioCard({ card, onOpen, role, onSubirPoliza }: Props) {
  const mxn = card.importe != null && !isNaN(card.importe)
    ? `$${card.importe.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`
    : null;

  const bordeClase = card.tiene_cotizacion === false
    ? "border-l-red-700"
    : etapaColor(card.estatus);

  const etapa = estatusToEtapaVisual(card.estatus);
  const showPolizaBtn = role === "AD" && etapa === "CARRO_COMPRA" && onSubirPoliza;

  return (
    <div
      className={`rounded border border-slate-700 bg-slate-800/80 p-2.5 border-l-4 ${bordeClase} cursor-pointer hover:bg-slate-700/80 transition-colors`}
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
      <div className="mt-2 flex flex-wrap gap-1 items-center">
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
        {showPolizaBtn && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onSubirPoliza(card.id); }}
            className="ml-auto rounded bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-500"
          >
            Subir póliza
          </button>
        )}
      </div>
    </div>
  );
}
