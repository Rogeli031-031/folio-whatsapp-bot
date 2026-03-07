"use client";

import type { FolioCard as FolioCardType } from "@/lib/api";

interface Props {
  card: FolioCardType;
  onOpen: (id: number) => void;
  role: string;
  onSubirPoliza?: (id: number) => void;
  onImprimirGastos?: (id: number, numeroFolio: string) => void;
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

/** Icono fantasma para folios privados (solo ZP y AD). */
function IconFantasma({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <title>Privado (solo ZP y AD)</title>
      <path d="M12 2C6.48 2 2 6.48 2 12c0 2.5 1 4.8 2.6 6.4V22l3.4-2.2 3.4 2.2 3.4-2.2 3.4 2.2v-3.6C20 16.8 22 14.5 22 12c0-5.52-4.48-10-10-10zm0 2c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9L17 15.17l-2.5-1.6L12 15.17l-2.5-1.6L7 15.17l-1.31-.91C4.63 13.55 4 11.85 4 10c0-4.41 3.59-8 8-8zm-2.5 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
    </svg>
  );
}

/** Icono de alarma para folios urgentes. */
function IconAlarma({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <title>Urgente</title>
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
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

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Formatea mes_cargo (YYYY-MM) a "Mar 2026". */
function formatMesCargo(mesCargo: string | null | undefined): string | null {
  if (!mesCargo || typeof mesCargo !== "string") return null;
  const t = mesCargo.trim();
  const m = t.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const monthIdx = parseInt(m[2], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return `${MESES[monthIdx]} ${m[1]}`;
}

export default function FolioCard({ card, onOpen, role, onSubirPoliza, onImprimirGastos }: Props) {
  const mxn = card.importe != null && !isNaN(card.importe)
    ? `$${card.importe.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`
    : null;

  const mesCargo = formatMesCargo(card.mes_cargo);

  const bordeClase = card.por_recuperar
    ? "border-l-blue-600"
    : card.tiene_cotizacion === false
    ? "border-l-red-700"
    : etapaColor(card.estatus);

  const etapa = estatusToEtapaVisual(card.estatus);
  const showPolizaBtn = role === "AD" && etapa === "CARRO_COMPRA" && onSubirPoliza;
  const showImprimirBtn = card.tiene_cotizacion !== false && onImprimirGastos;

  return (
    <div
      className={`rounded border border-slate-700 bg-slate-800/80 p-2.5 border-l-4 ${bordeClase} cursor-pointer hover:bg-slate-700/80 transition-colors`}
      onClick={() => onOpen(card.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(card.id)}
    >
      {mesCargo && (
        <div className="text-base font-semibold text-slate-100 tracking-wide mb-1.5">{mesCargo}</div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-xs font-medium text-slate-200">{card.folio_codigo}</span>
          {(card.prioridad && String(card.prioridad).toLowerCase().includes("urgente")) && (
            <IconAlarma className="h-4 w-4 flex-shrink-0 text-red-500" aria-hidden />
          )}
          {card.solo_zp_ad && (
            <IconFantasma className="h-4 w-4 flex-shrink-0 text-purple-400" aria-hidden />
          )}
        </div>
        {mxn && <span className="text-xs text-slate-400 flex-shrink-0">{mxn}</span>}
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
        {showImprimirBtn && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onImprimirGastos(card.id, card.numero_folio || card.folio_codigo || String(card.id)); }}
            className="ml-auto rounded bg-amber-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-amber-500"
          >
            Imprimir
          </button>
        )}
      </div>
    </div>
  );
}
