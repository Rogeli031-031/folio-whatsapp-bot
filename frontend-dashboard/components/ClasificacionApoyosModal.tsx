"use client";

import { useMemo, useState } from "react";
import {
  downloadClasificacionApoyosExcel,
  fetchClasificacionApoyos,
  fetchClasificacionApoyosDetalle,
  type ClasificacionApoyosData,
  type ClasificacionDetalleFolio,
} from "@/lib/api";

interface Props {
  open: boolean;
  token: string;
  onClose: () => void;
  onOpenFolio?: (id: number) => void;
  /** Si el kanban tiene planta seleccionada, filtra comparativo y Excel a esa planta. */
  selectedPlantaId?: number | null;
  selectedPlantaNombre?: string | null;
}

type CatApi = "GASTOS" | "INVERSIONES" | "TALLER" | "TOTAL";

function mesActualYAnteriorMx(): { actual: string; anterior: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const actual = `${y}-${String(m).padStart(2, "0")}`;
  let py = y;
  let pm = m - 1;
  if (pm < 1) {
    pm = 12;
    py -= 1;
  }
  return { actual, anterior: `${py}-${String(pm).padStart(2, "0")}` };
}

function buildMesOptions(): { value: string; label: string }[] {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const { actual } = mesActualYAnteriorMx();
  const [y0, m0] = actual.split("-").map(Number);
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 24; i++) {
    let y = y0;
    let m = m0 - i;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    const value = `${y}-${String(m).padStart(2, "0")}`;
    out.push({ value, label: `${meses[m - 1]} ${y}` });
  }
  return out;
}

function fmtMxn(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

function fmtDiff(n: number): string {
  const abs = Math.abs(Math.round(n));
  const s = `$${abs.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
  if (n > 0) return `+${s}`;
  if (n < 0) return `-${s}`;
  return s;
}

/** Misma mapa que el kanban del dashboard. */
function estatusToEtapaVisual(estatus: string | null | undefined): string {
  const s = (estatus || "").trim().toUpperCase();
  if (!s) return "PENDIENTE_APROB_PLANTA";
  if (s === "CANCELADO") return "CANCELADO";
  if (s === "CANCELACION_SOLICITADA") return "APROB_DIRECTOR_ZP";
  if (s === "EVIDENCIAS") return "EVIDENCIAS";
  if (s === "COMPROBACIONES") return "COMPROBACIONES";
  if (["PAGADO", "CERRADO"].includes(s)) return "DEPOSITO_CIERRE";
  if (["CHEQUE_GENERADO", "SOLICITANDO_PAGO"].includes(s)) return "CHEQUE_GENERADO";
  if (s === "CUENTA_FONDOS") return "CUENTA_FONDOS";
  if (["APROBADO_ZP", "LISTO_PARA_PROGRAMACION", "SELECCIONADO_SEMANA"].includes(s)) return "CARRO_COMPRA";
  if (s === "PENDIENTE_APROB_ZP" || /RECHAZADO_ZP/.test(s)) return "APROB_DIRECTOR_ZP";
  return "PENDIENTE_APROB_PLANTA";
}

const ETAPA_ORDER = [
  "PENDIENTE_APROB_PLANTA",
  "APROB_DIRECTOR_ZP",
  "CARRO_COMPRA",
  "CUENTA_FONDOS",
  "CHEQUE_GENERADO",
  "DEPOSITO_CIERRE",
  "COMPROBACIONES",
  "EVIDENCIAS",
  "CANCELADO",
] as const;

const ETAPA_LABELS: Record<string, string> = {
  PENDIENTE_APROB_PLANTA: "Pendiente aprobación planta",
  APROB_DIRECTOR_ZP: "Aprobación Director ZP",
  CARRO_COMPRA: "Carro de compra",
  CUENTA_FONDOS: "Cuenta de fondos",
  CHEQUE_GENERADO: "Cheque Generado",
  DEPOSITO_CIERRE: "Depósito y cierre",
  COMPROBACIONES: "Comprobaciones",
  EVIDENCIAS: "Evidencias",
  CANCELADO: "Cancelado",
};

function groupFoliosByEtapa(folios: ClasificacionDetalleFolio[]): {
  etapa: string;
  label: string;
  items: ClasificacionDetalleFolio[];
  total: number;
}[] {
  const map = new Map<string, ClasificacionDetalleFolio[]>();
  for (let i = 0; i < folios.length; i++) {
    const f = folios[i];
    const etapa = estatusToEtapaVisual(f.estatus);
    const list = map.get(etapa);
    if (list) list.push(f);
    else map.set(etapa, [f]);
  }
  const groups: {
    etapa: string;
    label: string;
    items: ClasificacionDetalleFolio[];
    total: number;
  }[] = [];
  for (let i = 0; i < ETAPA_ORDER.length; i++) {
    const etapa = ETAPA_ORDER[i];
    const items = map.get(etapa);
    if (!items || items.length === 0) continue;
    groups.push({
      etapa,
      label: ETAPA_LABELS[etapa] || etapa,
      items,
      total: items.reduce((s, f) => s + (Number(f.importe) || 0), 0),
    });
  }
  const known = new Set<string>(Array.from(ETAPA_ORDER));
  const extraKeys = Array.from(map.keys());
  for (let i = 0; i < extraKeys.length; i++) {
    const etapa = extraKeys[i];
    if (known.has(etapa)) continue;
    const items = map.get(etapa) || [];
    groups.push({
      etapa,
      label: ETAPA_LABELS[etapa] || etapa,
      items,
      total: items.reduce((s, f) => s + (Number(f.importe) || 0), 0),
    });
  }
  return groups;
}

export default function ClasificacionApoyosModal({
  open,
  token,
  onClose,
  onOpenFolio,
  selectedPlantaId = null,
  selectedPlantaNombre = null,
}: Props) {
  const defaults = useMemo(() => mesActualYAnteriorMx(), []);
  const options = useMemo(() => buildMesOptions(), []);
  const [mesA, setMesA] = useState(defaults.actual);
  const [mesB, setMesB] = useState(defaults.anterior);
  const [step, setStep] = useState<"pick" | "view">("pick");
  const [data, setData] = useState<ClasificacionApoyosData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detalle, setDetalle] = useState<{
    planta: string;
    mes: string;
    mesLabel: string;
    categoria: CatApi;
  } | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [folios, setFolios] = useState<ClasificacionDetalleFolio[] | null>(null);
  const [detalleTotal, setDetalleTotal] = useState(0);

  const plantaFiltroLabel = selectedPlantaNombre || (selectedPlantaId != null ? `Planta #${selectedPlantaId}` : null);

  if (!open) return null;

  const handleVer = async () => {
    setError(null);
    if (mesA === mesB) {
      setError("Elige dos meses distintos.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchClasificacionApoyos(token, mesA, mesB, selectedPlantaId);
      setData(res);
      setStep("view");
      setDetalle(null);
      setFolios(null);
    } catch (e) {
      setError((e as Error).message || "Error al cargar comparativo");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    setError(null);
    try {
      await downloadClasificacionApoyosExcel(token, data.mes_a, data.mes_b, selectedPlantaId);
    } catch (e) {
      setError((e as Error).message || "Error al exportar Excel");
    } finally {
      setExporting(false);
    }
  };

  const openDetalle = async (planta: string, mes: string, mesLabel: string, categoria: CatApi) => {
    setDetalle({ planta, mes, mesLabel, categoria });
    setDetalleLoading(true);
    setDetalleError(null);
    setFolios(null);
    try {
      const res = await fetchClasificacionApoyosDetalle(token, { mes, planta, categoria });
      setFolios(res.folios || []);
      setDetalleTotal(res.total || 0);
    } catch (e) {
      setDetalleError((e as Error).message || "Error al cargar desglose");
    } finally {
      setDetalleLoading(false);
    }
  };

  const AmountBtn = ({
    value,
    onClick,
    className = "",
    muted = false,
  }: {
    value: number;
    onClick?: () => void;
    className?: string;
    muted?: boolean;
  }) => {
    if (!onClick) {
      return (
        <span className={`font-mono text-xs tabular-nums ${muted ? "text-slate-400" : "text-slate-200"} ${className}`}>
          {fmtMxn(value)}
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded px-1.5 py-0.5 font-mono text-xs tabular-nums underline-offset-2 hover:underline hover:bg-slate-700/80 ${
          muted ? "text-slate-300" : "text-emerald-300"
        } ${className}`}
        title="Ver desglose de folios"
      >
        {fmtMxn(value)}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" role="dialog" aria-modal>
      <div
        className={`flex max-h-[92vh] w-full flex-col rounded-lg border border-slate-600 bg-slate-900 shadow-xl ${
          step === "view" ? "max-w-6xl" : "max-w-md"
        }`}
      >
        {step === "pick" ? (
          <div className="p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-white">Clasificación de apoyos</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Elige el mes principal y el mes a comparar. Luego verás el comparativo digital (como en IGF).
                  {plantaFiltroLabel ? (
                    <span className="mt-1 block text-amber-300/90">
                      Filtrado por planta: <strong>{plantaFiltroLabel}</strong>
                    </span>
                  ) : null}
                </p>
              </div>
              <button type="button" onClick={onClose} className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                Cerrar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-400">
                Mes principal
                <select
                  value={mesA}
                  onChange={(e) => setMesA(e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                >
                  {options.map((o) => (
                    <option key={`a-${o.value}`} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-400">
                Mes a comparar
                <select
                  value={mesB}
                  onChange={(e) => setMesB(e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                >
                  {options.map((o) => (
                    <option key={`b-${o.value}`} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleVer()}
                disabled={loading}
                className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
              >
                {loading ? "Cargando…" : "Ver comparativo"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-700 px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Clasificación de apoyos</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {data?.vs_label}
                  {plantaFiltroLabel ? ` · ${plantaFiltroLabel}` : ""} · clic en un monto para ver el desglose
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("pick");
                    setDetalle(null);
                    setFolios(null);
                  }}
                  className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
                >
                  Cambiar meses
                </button>
                <button
                  type="button"
                  onClick={() => void handleExport()}
                  disabled={exporting || !data}
                  className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {exporting ? "Exportando…" : "Exportar a Excel"}
                </button>
                <button type="button" onClick={onClose} className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                  Cerrar
                </button>
              </div>
            </div>

            {error && <p className="px-4 pt-2 text-sm text-red-400">{error}</p>}

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {data && (
                <div className="overflow-x-auto rounded border border-slate-700">
                  <table className="min-w-[920px] w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/80">
                        <th className="px-2 py-2 text-slate-300" rowSpan={2}>PLANTA</th>
                        <th className="px-2 py-1 text-center text-emerald-400/90" colSpan={4}>
                          {data.mes_a_label}
                        </th>
                        <th className="px-2 py-1 text-center text-slate-300" colSpan={4}>
                          {data.mes_b_label}
                        </th>
                        <th className="px-2 py-2 text-center text-sky-300" rowSpan={2}>
                          {data.vs_label}
                        </th>
                      </tr>
                      <tr className="border-b border-slate-700 bg-slate-800/50 text-[10px] uppercase tracking-wide">
                        <th className="bg-slate-900/40 px-2 py-1.5 text-center text-sky-200">Gastos</th>
                        <th className="bg-red-950/40 px-2 py-1.5 text-center text-red-200">Inversiones</th>
                        <th className="bg-orange-950/40 px-2 py-1.5 text-center text-orange-200">Taller</th>
                        <th className="bg-sky-950/40 px-2 py-1.5 text-center text-sky-100">Total</th>
                        <th className="bg-slate-900/40 px-2 py-1.5 text-center text-sky-200">Gastos</th>
                        <th className="bg-red-950/40 px-2 py-1.5 text-center text-red-200">Inversiones</th>
                        <th className="bg-orange-950/40 px-2 py-1.5 text-center text-orange-200">Taller</th>
                        <th className="bg-sky-950/40 px-2 py-1.5 text-center text-sky-100">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.plantas.map((p) => (
                        <tr key={p.label} className="border-b border-slate-800 hover:bg-slate-800/40">
                          <td className="px-2 py-2 font-medium text-slate-200">{p.label}</td>
                          <td className="px-1 py-1 text-center">
                            <AmountBtn
                              value={p.a.gastos}
                              onClick={() => void openDetalle(p.label, data.mes_a, data.mes_a_label, "GASTOS")}
                            />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <AmountBtn
                              value={p.a.inversiones}
                              onClick={() => void openDetalle(p.label, data.mes_a, data.mes_a_label, "INVERSIONES")}
                            />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <AmountBtn
                              value={p.a.taller}
                              onClick={() => void openDetalle(p.label, data.mes_a, data.mes_a_label, "TALLER")}
                            />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <AmountBtn
                              value={p.a.total}
                              onClick={() => void openDetalle(p.label, data.mes_a, data.mes_a_label, "TOTAL")}
                            />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <AmountBtn
                              value={p.b.gastos}
                              muted
                              onClick={() => void openDetalle(p.label, data.mes_b, data.mes_b_label, "GASTOS")}
                            />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <AmountBtn
                              value={p.b.inversiones}
                              muted
                              onClick={() => void openDetalle(p.label, data.mes_b, data.mes_b_label, "INVERSIONES")}
                            />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <AmountBtn
                              value={p.b.taller}
                              muted
                              onClick={() => void openDetalle(p.label, data.mes_b, data.mes_b_label, "TALLER")}
                            />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <AmountBtn
                              value={p.b.total}
                              muted
                              onClick={() => void openDetalle(p.label, data.mes_b, data.mes_b_label, "TOTAL")}
                            />
                          </td>
                          <td className={`px-2 py-2 text-center font-mono text-xs tabular-nums ${p.diff > 0 ? "text-red-400" : "text-slate-300"}`}>
                            {fmtDiff(p.diff)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-600 bg-slate-800/70 font-semibold">
                        <td className="px-2 py-2 text-slate-100">TOTAL PROVINCIA</td>
                        <td className="px-2 py-2 text-center font-mono text-emerald-300">{fmtMxn(data.totales.a.gastos)}</td>
                        <td className="px-2 py-2 text-center font-mono text-emerald-300">{fmtMxn(data.totales.a.inversiones)}</td>
                        <td className="px-2 py-2 text-center font-mono text-emerald-300">{fmtMxn(data.totales.a.taller)}</td>
                        <td className="px-2 py-2 text-center font-mono text-emerald-300">{fmtMxn(data.totales.a.total)}</td>
                        <td className="px-2 py-2 text-center font-mono text-slate-200">{fmtMxn(data.totales.b.gastos)}</td>
                        <td className="px-2 py-2 text-center font-mono text-slate-200">{fmtMxn(data.totales.b.inversiones)}</td>
                        <td className="px-2 py-2 text-center font-mono text-slate-200">{fmtMxn(data.totales.b.taller)}</td>
                        <td className="px-2 py-2 text-center font-mono text-slate-200">{fmtMxn(data.totales.b.total)}</td>
                        <td className={`px-2 py-2 text-center font-mono ${data.totales.diff > 0 ? "text-red-400" : "text-slate-200"}`}>
                          {fmtDiff(data.totales.diff)}
                        </td>
                      </tr>
                      <tr className="bg-slate-900/50 text-sky-200">
                        <td className="px-2 py-2">{data.vs_label}</td>
                        <td className="px-2 py-2 text-center font-mono">{fmtDiff(data.diffs_categoria.gastos)}</td>
                        <td className="px-2 py-2 text-center font-mono">{fmtDiff(data.diffs_categoria.inversiones)}</td>
                        <td className="px-2 py-2 text-center font-mono">{fmtDiff(data.diffs_categoria.taller)}</td>
                        <td className="px-2 py-2 text-center font-mono bg-slate-800/80">{fmtDiff(data.diffs_categoria.total)}</td>
                        <td colSpan={5} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {detalle && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            setDetalle(null);
            setFolios(null);
          }}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex flex-shrink-0 items-center justify-between border-b border-slate-700 pb-2">
              <div>
                <h3 className="text-base font-semibold text-slate-200">
                  {detalle.planta} · {detalle.categoria}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {detalle.mesLabel} · {folios ? `${folios.length} folios · ${fmtMxn(detalleTotal)}` : "…"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetalle(null);
                  setFolios(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                ×
              </button>
            </div>
            {detalleLoading && <p className="text-sm text-slate-400">Cargando desglose…</p>}
            {detalleError && <p className="text-sm text-red-400">{detalleError}</p>}
            {!detalleLoading && !detalleError && folios && (
              <div className="min-h-0 flex-1 overflow-auto">
                {folios.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay folios en este criterio.</p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2 min-h-[40vh]">
                    {groupFoliosByEtapa(folios).map((g) => (
                      <section
                        key={g.etapa}
                        className="flex w-[17rem] flex-shrink-0 flex-col rounded-lg border border-slate-700 bg-slate-900/70"
                      >
                        <div className="sticky top-0 z-[1] border-b border-slate-700 bg-slate-800/95 px-2.5 py-2 backdrop-blur-sm">
                          <h4 className="text-sm font-medium text-slate-100 leading-snug">{g.label}</h4>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {g.items.length} folio{g.items.length === 1 ? "" : "s"} ·{" "}
                            <span className="font-mono text-amber-300/90">{fmtMxn(g.total)}</span>
                          </p>
                        </div>
                        <ul className="flex-1 space-y-2 overflow-y-auto p-2 max-h-[calc(85vh-8rem)]">
                          {g.items.map((f) => (
                            <li key={f.id}>
                              <button
                                type="button"
                                onClick={() => onOpenFolio?.(f.id)}
                                className="w-full rounded border border-slate-700 bg-slate-800/60 px-2.5 py-2 text-left hover:border-amber-600/50 hover:bg-slate-800"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-mono text-xs text-amber-300">
                                    {f.numero_folio || f.folio_codigo}
                                  </span>
                                  <span className="font-mono text-xs text-slate-200">{fmtMxn(f.importe)}</span>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{f.concepto || "—"}</p>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {[f.categoria, f.subcategoria, f.beneficiario].filter(Boolean).join(" · ")}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
