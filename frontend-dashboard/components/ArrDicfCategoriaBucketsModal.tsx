"use client";

import { useCallback, useEffect, useState } from "react";
import {
  postDicfDatos,
  type DeltaIngresoForecastCliente,
  type DicfResult,
} from "@/lib/api";
import { dicfClienteEsComisionista } from "@/lib/arr-categoria";

export type ArrDicfPlanNuevoRow = {
  nombre: string;
  categoria: "CASA" | "COMISIONISTA";
  kg: number;
};

/** Una fila del resumen forecast (subcategoría + totales). */
export type ArrForecastSubcategoriaResumenRow = {
  subcategoria: string;
  ventaTon: number;
  comisionProyectadaMxn: number;
  esTotal?: boolean;
};

export type ArrDicfCategoriaBucketsModalProps = {
  open: boolean;
  onClose: () => void;
  token: string;
  /** Etiqueta IGF (ej. GT Morelos), misma que `empresa` en ARR. */
  planta: string;
  initialCategoria: "CASA" | "COMISIONISTA";
  /** Clientes nuevos solo plan ARR (no suelen aparecer en DICF). */
  planNuevos?: ArrDicfPlanNuevoRow[];
  onClienteDicfClick?: (nombre: string) => void;
  /** Mes B (forecast) al que aplica el resumen, ej. «Mayo 2026». */
  mesForecastLabel?: string;
  /**
   * Resumen por subcategoría: venta (t) y comisión proyectada (kg × $/kg desc.),
   * alineado al forecast del mes B (exclusiones, «Con venta» simulada, plan manual).
   */
  resumenSubcategoriaForecast?: {
    casa: ArrForecastSubcategoriaResumenRow[];
    comisionista: ArrForecastSubcategoriaResumenRow[];
  } | null;
};

function filtraPorCategoria(
  list: DeltaIngresoForecastCliente[],
  want: "CASA" | "COMISIONISTA"
): DeltaIngresoForecastCliente[] {
  return list.filter((c) =>
    want === "COMISIONISTA" ? dicfClienteEsComisionista(c) : !dicfClienteEsComisionista(c)
  );
}

/**
 * Movimiento DICF (Dejaron / Disminuyeron / Aumentaron / Nuevos) filtrado por Casa vs Comisionista.
 */
function fmtMxn(v: number): string {
  return v.toLocaleString("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function ArrDicfCategoriaBucketsModal({
  open,
  onClose,
  token,
  planta,
  initialCategoria,
  planNuevos = [],
  onClienteDicfClick,
  mesForecastLabel,
  resumenSubcategoriaForecast,
}: ArrDicfCategoriaBucketsModalProps) {
  const [categoria, setCategoria] = useState<"CASA" | "COMISIONISTA">(initialCategoria);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dicf, setDicf] = useState<DicfResult | null>(null);

  useEffect(() => {
    if (open) setCategoria(initialCategoria);
  }, [open, initialCategoria]);

  useEffect(() => {
    if (!open || !token.trim() || !planta.trim()) {
      setDicf(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDicf(null);
    (async () => {
      try {
        const data = await postDicfDatos(token, { planta: planta.trim() });
        if (!cancelled) {
          setDicf(data);
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setDicf(null);
          setError(e instanceof Error ? e.message : "Error al cargar DICF");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, token, planta]);

  const planNuevosFiltrados = planNuevos.filter((n) => n.categoria === categoria);

  const renderLista = useCallback(
    (
      titulo: string,
      tituloClass: string,
      clientes: DeltaIngresoForecastCliente[],
      grupoClick: "dejaron" | "disminuyeron" | "aumentaron" | "nuevos"
    ) => {
      const ingresoStr = (c: DeltaIngresoForecastCliente) =>
        grupoClick === "dejaron" ? c.ingresoAStr : c.deltaIngresoStr;
      return (
        <div className="min-w-0">
          <h4 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${tituloClass}`}>
            {titulo}
          </h4>
          <ul className="max-h-[min(28rem,65vh)] space-y-1 overflow-y-auto text-xs text-slate-300">
            {clientes.map((c, i) => (
              <li
                key={`${c.cliente}-${i}`}
                className="border-b border-slate-800/60 pb-1.5"
              >
                {onClienteDicfClick ? (
                  <button
                    type="button"
                    onClick={() => onClienteDicfClick(String(c.cliente || "").trim())}
                    className="w-full text-left hover:text-amber-200"
                  >
                    <span className="font-medium text-slate-100">{c.cliente}</span>
                    {(c.acciones_abiertas || 0) > 0 && (
                      <span className="ml-1 inline-flex items-center rounded border border-amber-700/50 bg-amber-900/25 px-1 py-0.5 text-[0.6rem] text-amber-200">
                        Acc.: {c.acciones_abiertas}
                      </span>
                    )}
                    : {c.deltaKgStr != null ? `${c.deltaKgStr} Ton · ` : ""}
                    {ingresoStr(c) ?? "—"}
                  </button>
                ) : (
                  <div>
                    <span className="font-medium text-slate-100">{c.cliente}</span>
                    : {c.deltaKgStr != null ? `${c.deltaKgStr} Ton · ` : ""}
                    {ingresoStr(c) ?? "—"}
                  </div>
                )}
                <p className="mt-0.5 pl-0.5 text-[0.65rem] text-slate-500">
                  Frec.:{" "}
                  {c.freqDays != null && c.freqDays < 9000
                    ? `cada ${c.freqDays.toFixed(0)} d`
                    : "N/A"}{" "}
                  · Última:{" "}
                  {c.lastPurchaseDate
                    ? `${c.lastPurchaseDate} (${c.daysSinceLastReal ?? "?"} d)`
                    : typeof c.daysSinceLast === "number"
                      ? `${c.daysSinceLast} d`
                      : "N/D"}{" "}
                  · {c.estado ?? "—"}
                </p>
              </li>
            ))}
            {grupoClick === "nuevos" &&
              planNuevosFiltrados.map((n) => (
                <li
                  key={`plan-${n.nombre}`}
                  className="border-b border-slate-800/60 pb-1.5 text-slate-400"
                >
                  <span className="font-medium text-slate-200">{n.nombre}</span>
                  <span className="ml-1 text-[0.65rem] text-sky-300/90">(plan)</span>
                  <span className="text-slate-400">
                    : {`${(n.kg / 1000).toFixed(2)} Ton`}
                  </span>
                </li>
              ))}
            {clientes.length === 0 && !(grupoClick === "nuevos" && planNuevosFiltrados.length > 0) && (
              <li className="text-slate-500">Sin clientes</li>
            )}
          </ul>
        </div>
      );
    },
    [onClienteDicfClick, planNuevosFiltrados]
  );

  if (!open) return null;

  const dejaron = dicf ? filtraPorCategoria(dicf.dejaron?.clientes ?? [], categoria) : [];
  const disminuyeron = dicf
    ? filtraPorCategoria(dicf.disminuyeron?.clientes ?? [], categoria)
    : [];
  const aumentaron = dicf
    ? filtraPorCategoria(dicf.aumentaron?.clientes ?? [], categoria)
    : [];
  const nuevos = dicf ? filtraPorCategoria(dicf.nuevos?.clientes ?? [], categoria) : [];

  const filasResumenSubcat =
    resumenSubcategoriaForecast?.[categoria === "COMISIONISTA" ? "comisionista" : "casa"] ?? [];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arr-dicf-cat-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3">
          <div>
            <h2 id="arr-dicf-cat-modal-title" className="text-base font-semibold text-white">
              Movimiento por categoría
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{planta}</p>
            {mesForecastLabel ? (
              <p className="mt-0.5 text-[0.65rem] text-slate-500">Forecast: {mesForecastLabel}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded border border-slate-600 bg-slate-950/80 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setCategoria("CASA")}
                className={`rounded px-3 py-1.5 transition ${
                  categoria === "CASA"
                    ? "bg-sky-700 text-white shadow"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                CASA
              </button>
              <button
                type="button"
                onClick={() => setCategoria("COMISIONISTA")}
                className={`rounded px-3 py-1.5 transition ${
                  categoria === "COMISIONISTA"
                    ? "bg-violet-700 text-white shadow"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                COMISIONISTA
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-500 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-5rem)] overflow-y-auto p-4">
          {filasResumenSubcat.length > 0 && (
            <section
              className="mb-4 rounded-md border border-slate-600/70 bg-slate-950/50 p-3"
              aria-label="Resumen por subcategoría"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                Resumen por subcategoría · {categoria}
              </h3>
              <p className="mt-1 text-[0.65rem] leading-snug text-slate-500">
                Venta en toneladas y comisión proyectada del mes (kg × desc. $/kg), alineado al forecast del tablero:
                exclusiones «Sin venta», simulación «Con venta» y clientes nuevos del plan manual que suman al mes.
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[260px] border-collapse text-left text-xs text-slate-200">
                  <thead>
                    <tr className="border-b border-slate-600/80 text-[0.65rem] uppercase text-slate-400">
                      <th className="py-1.5 pr-2 font-medium">Subcategoría</th>
                      <th className="py-1.5 pr-2 text-right font-medium">Venta (t)</th>
                      <th className="py-1.5 text-right font-medium">Comisión proyectada ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasResumenSubcat.map((row, idx) => (
                      <tr
                        key={`${row.subcategoria}-${idx}`}
                        className={`border-b border-slate-800/80 ${
                          row.esTotal ? "bg-slate-800/40 font-semibold text-slate-100" : ""
                        }`}
                      >
                        <td className="py-1.5 pr-2">{row.subcategoria}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {row.ventaTon.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">${fmtMxn(row.comisionProyectadaMxn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {loading && <p className="text-sm text-slate-400">Cargando clientes…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && !error && dicf && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {renderLista("Dejaron de comprar", "text-slate-300", dejaron, "dejaron")}
              {renderLista("Disminuyeron", "text-red-400", disminuyeron, "disminuyeron")}
              {renderLista("Aumentaron", "text-emerald-400", aumentaron, "aumentaron")}
              {renderLista("Nuevos", "text-slate-200", nuevos, "nuevos")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
