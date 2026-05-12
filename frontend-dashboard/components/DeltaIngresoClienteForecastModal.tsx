"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  postDicfDatos,
  getDicfExcelUrl,
  type DicfResult,
  type DeltaIngresoForecastCliente,
} from "@/lib/api";
import { DicfAccionesClientePanel } from "@/components/DicfAccionesClientePanel";
import {
  DICF_HISTORY_WEEK_OPTIONS,
  type DicfHistoryWeeks,
  filterDicfClienteHistoryByWeeks,
} from "@/lib/dicf-cliente-history-weeks";
import { parseDicfVentaSheetForClienteFallback } from "@/lib/dicf-excel-fallback-cliente";

/** Cliente cargado desde Excel completo (p. ej. estado «Otros»), no desde listas DICF. */
const GRUPO_DICF_EXCEL_FALLBACK = "Historial (fuera de buckets DICF)";

function normalizeClienteNombre(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findClienteEnDicf(
  dicf: DicfResult,
  nombre: string
): { grupo: string; cliente: DeltaIngresoForecastCliente } | null {
  const want = normalizeClienteNombre(nombre);
  if (!want) return null;
  const buckets: { grupo: string; clientes: DeltaIngresoForecastCliente[] }[] = [
    { grupo: "Dejaron de comprar", clientes: dicf.dejaron?.clientes ?? [] },
    { grupo: "- Ingreso", clientes: dicf.disminuyeron?.clientes ?? [] },
    { grupo: "+ Ingreso", clientes: dicf.aumentaron?.clientes ?? [] },
    { grupo: "Nuevos", clientes: dicf.nuevos?.clientes ?? [] },
  ];
  for (const b of buckets) {
    const found = b.clientes.find((c) => normalizeClienteNombre(c.cliente || "") === want);
    if (found) return { grupo: b.grupo, cliente: found };
  }
  return null;
}

type MesRowState = {
  loading: boolean;
  error: string | null;
  rows: {
    mes: string;
    ventaTon: number | null;
    descKg: number | null;
    ingresoMxn: number | null;
    _descMxn?: number | null;
    _margenKg?: number | null;
  }[];
};

export type DeltaIngresoClienteForecastModalProps = {
  token: string;
  /** Misma etiqueta de planta / empresa que en Delta Ingreso Cliente Forecast (p. ej. GT Morelos). */
  planta: string;
  clienteNombre: string | null;
  onClose: () => void;
  canDicfAcciones: boolean;
};

/**
 * Mismo contenido que el modal de «Delta Ingreso Cliente Forecast» en la página principal:
 * carga DICF por planta, localiza al cliente en las listas y muestra detalle + tabla mensual + DICE.
 */
export default function DeltaIngresoClienteForecastModal({
  token,
  planta,
  clienteNombre,
  onClose,
  canDicfAcciones,
}: DeltaIngresoClienteForecastModalProps) {
  const open = Boolean(clienteNombre && planta && token);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingDicf, setLoadingDicf] = useState(false);
  const [dicfData, setDicfData] = useState<DicfResult | null>(null);
  const [deltaClienteSel, setDeltaClienteSel] = useState<{
    grupo: string;
    cliente: DeltaIngresoForecastCliente;
  } | null>(null);
  const [dicfMesRowsByCliente, setDicfMesRowsByCliente] = useState<Record<string, MesRowState>>({});
  const [historialSemanas, setHistorialSemanas] = useState<DicfHistoryWeeks>(4);

  useEffect(() => {
    if (clienteNombre?.trim()) setHistorialSemanas(4);
  }, [clienteNombre, planta]);

  useEffect(() => {
    if (!open || !clienteNombre || !planta || !token) {
      setLoadError(null);
      setLoadingDicf(false);
      setDicfData(null);
      setDeltaClienteSel(null);
      setDicfMesRowsByCliente({});
      return;
    }

    let cancelled = false;
    setLoadError(null);
    setDicfData(null);
    setDeltaClienteSel(null);
    setDicfMesRowsByCliente({});
    setLoadingDicf(true);

    (async () => {
      try {
        const data = await postDicfDatos(token, { planta: planta.trim() });
        if (cancelled) return;
        setDicfData(data);
        const found = findClienteEnDicf(data, clienteNombre);
        if (found) {
          setLoadError(null);
          setDeltaClienteSel(found);
        } else {
          try {
            const url = getDicfExcelUrl(token, planta.trim(), null);
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Excel (${resp.status})`);
            const buf = await resp.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const ws = wb.Sheets["Venta (Ton)"] || wb.Sheets[wb.SheetNames?.[0] || ""];
            if (!ws) throw new Error("Sin hoja Venta (Ton)");
            const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as unknown[][];
            const parsed = parseDicfVentaSheetForClienteFallback(aoa, clienteNombre, data.last_date);
            if (parsed) {
              const cn = (parsed.cliente.cliente || "").trim();
              const canal = (parsed.cliente.canal || "").trim();
              const subcanal = (parsed.cliente.subcanal || "").trim();
              const cacheKey = `${planta}||?||${canal}||${subcanal}||${cn}`.toLowerCase();
              setDicfMesRowsByCliente({
                [cacheKey]: { loading: false, error: null, rows: parsed.mesRows },
              });
              setDeltaClienteSel({ grupo: GRUPO_DICF_EXCEL_FALLBACK, cliente: parsed.cliente });
              setLoadError(null);
            } else {
              setLoadError(
                "Este cliente no aparece en las listas de Delta Ingreso Cliente Forecast para esta planta (solo clientes en Dejaron / − Ingreso / + Ingreso / Nuevos), ni en el Excel completo de ventas de la planta."
              );
              setDeltaClienteSel(null);
            }
          } catch {
            setLoadError(
              "Este cliente no aparece en las listas de Delta Ingreso Cliente Forecast para esta planta (solo clientes en Dejaron / − Ingreso / + Ingreso / Nuevos). No se pudo cargar el Excel completo para mostrar historial alternativo."
            );
            setDeltaClienteSel(null);
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Error al cargar Delta Ingreso Cliente Forecast");
        }
      } finally {
        if (!cancelled) setLoadingDicf(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, clienteNombre, planta, token]);

  useEffect(() => {
    if (!token || !planta || !deltaClienteSel || !dicfData) return;

    const cn = (deltaClienteSel.cliente?.cliente || "").trim();
    if (!cn) return;

    const grupo = (deltaClienteSel.grupo || "").toLowerCase();
    const tipo: "dejaron" | "nuevos" | "aumentaron" | "disminuyeron" | null = grupo.includes("dejaron")
      ? "dejaron"
      : grupo.includes("nuevos")
        ? "nuevos"
        : grupo.includes("aument")
          ? "aumentaron"
          : grupo.includes("dismin") || grupo.includes("- ingreso")
            ? "disminuyeron"
            : grupo.includes("+ ingreso")
              ? "aumentaron"
              : null;

    const canal = (deltaClienteSel.cliente?.canal || "").trim();
    const subcanal = (deltaClienteSel.cliente?.subcanal || "").trim();
    const cacheKey = `${planta}||${tipo || "?"}||${canal}||${subcanal}||${cn}`.toLowerCase();
    const cached = dicfMesRowsByCliente[cacheKey];
    if (cached?.loading || (cached?.rows?.length ?? 0) > 0 || cached?.error) return;

    let cancelled = false;
    setDicfMesRowsByCliente((prev) => ({
      ...prev,
      [cacheKey]: { loading: true, error: null, rows: [] },
    }));

    (async () => {
      try {
        const url = getDicfExcelUrl(
          token,
          planta,
          tipo && canal && subcanal ? { tipo, canal, subcanal } : null
        );
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Error al descargar Excel (${resp.status})`);
        const buf = await resp.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets["Venta (Ton)"] || wb.Sheets[wb.SheetNames?.[0] || ""];
        if (!ws) throw new Error("No se encontró hoja 'Venta (Ton)' en el Excel");

        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as unknown[][];
        const header = (aoa?.[0] || []).map((x) => (x != null ? String(x).trim() : ""));
        if (!header.length) throw new Error("Excel vacío");

        const monthLabels: string[] = [];
        for (const h of header) {
          if (/^venta\s+/i.test(h || "")) {
            const label = String(h).replace(/^venta\s+/i, "").trim();
            if (label) monthLabels.push(label);
          }
        }

        const findHeaderIdx = (fullLabel: string) =>
          header.findIndex((h) => (h || "").toLowerCase() === fullLabel.toLowerCase());

        const row = (aoa || []).find((r) => {
          const c = r?.[0] != null ? String(r[0]).trim() : "";
          return c === cn || c.toLowerCase() === cn.toLowerCase();
        });
        if (!row) throw new Error("No se encontró el cliente en el Excel");

        const rows = monthLabels.map((mes) => {
          const iV = findHeaderIdx(`Venta ${mes}`);
          const iD = findHeaderIdx(`Descuento ${mes}`);
          const iM = findHeaderIdx(`Margen ${mes}`);
          const ventaTonRaw = iV >= 0 ? Number((row as unknown[])[iV]) : NaN;
          const descMxnRaw = iD >= 0 ? Number((row as unknown[])[iD]) : NaN;
          const margenKgRaw = iM >= 0 ? Number((row as unknown[])[iM]) : NaN;
          const ventaTon = Number.isFinite(ventaTonRaw) ? ventaTonRaw : null;
          const descMxn = Number.isFinite(descMxnRaw) ? descMxnRaw : null;
          const margenKg = Number.isFinite(margenKgRaw) ? margenKgRaw : null;
          const ventaKg = ventaTon != null ? ventaTon * 1000 : null;
          const descKg = ventaKg != null && ventaKg > 0 && descMxn != null ? descMxn / ventaKg : null;
          const ingresoMxn =
            ventaKg != null && ventaKg > 0 && margenKg != null
              ? ventaKg * margenKg - Math.abs(descMxn != null ? descMxn : 0)
              : null;
          return { mes, ventaTon, descKg, ingresoMxn, _descMxn: descMxn, _margenKg: margenKg };
        });

        if (cancelled) return;
        setDicfMesRowsByCliente((prev) => ({
          ...prev,
          [cacheKey]: { loading: false, error: null, rows },
        }));
      } catch (e: unknown) {
        if (cancelled) return;
        setDicfMesRowsByCliente((prev) => ({
          ...prev,
          [cacheKey]: {
            loading: false,
            error: e instanceof Error ? e.message : "Error al leer Excel",
            rows: [],
          },
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, planta, deltaClienteSel, dicfData]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[85vh] min-h-[40vh] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-700 pb-3">
          <h3 className="text-xl font-semibold text-slate-200">
            Delta Ingreso Cliente Forecast · {planta} · {dicfData?.periodoMes ?? "—"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          {loadingDicf && <p className="text-slate-400">Cargando datos del cliente…</p>}
          {loadError && !loadingDicf && <p className="text-amber-300">{loadError}</p>}
          {deltaClienteSel && !loadingDicf && (
            <>
              <p>
                <span className="font-semibold">{deltaClienteSel.cliente.cliente}</span>{" "}
                <span className="text-slate-400">· {deltaClienteSel.grupo}</span>
              </p>
              {deltaClienteSel.grupo === GRUPO_DICF_EXCEL_FALLBACK ? (
                <p className="rounded border border-sky-800/60 bg-sky-950/40 px-3 py-2 text-sm text-sky-100/95">
                  Este cliente no entra en las categorías Dejaron / − Ingreso / + Ingreso / Nuevos del periodo DICF
                  actual (p. ej. inactivo o sin delta en forecast). Se muestran la tabla mensual y las compras diarias a
                  partir del Excel completo de la planta.
                </p>
              ) : (
                <>
                  <p>
                    Ingreso A:{" "}
                    <span className="font-mono">{deltaClienteSel.cliente.ingresoAStr ?? "$0"}</span> · Ingreso B
                    forecast: <span className="font-mono">{deltaClienteSel.cliente.ingresoBStr ?? "$0"}</span> · Delta:{" "}
                    <span className="font-mono">{deltaClienteSel.cliente.deltaIngresoStr ?? "$0"}</span>
                  </p>
                  <p className="text-xs text-slate-500 max-w-3xl">
                    <strong>Ingreso A</strong> = ingreso del <strong>mes calendario anterior completo</strong> (kg del
                    mes × margen IGF de ese mes − descuentos del mes). <strong>Ingreso B</strong> = proyección a cierre
                    del <strong>mes en curso</strong>, usando margen IGF del mes actual y el descuento $/kg calculado
                    sobre la ventana de historial (p. ej. 60 días). <strong>Delta</strong> = B − A.
                  </p>
                </>
              )}
              {(() => {
                const clienteNombreSel = (deltaClienteSel.cliente?.cliente || "").trim();
                const grupo = (deltaClienteSel.grupo || "").toLowerCase();
                const tipo =
                  grupo.includes("dejaron") ? "dejaron"
                    : grupo.includes("nuevos") ? "nuevos"
                      : grupo.includes("aument") ? "aumentaron"
                        : grupo.includes("dismin") || grupo.includes("- ingreso") ? "disminuyeron"
                          : grupo.includes("+ ingreso") ? "aumentaron"
                            : "?";
                const canal = (deltaClienteSel.cliente?.canal || "").trim();
                const subcanal = (deltaClienteSel.cliente?.subcanal || "").trim();
                const cacheKey =
                  `${planta}||${tipo}||${canal}||${subcanal}||${clienteNombreSel}`.toLowerCase();
                const st = dicfMesRowsByCliente[cacheKey];
                const fmtTon = (n: number | null) =>
                  n != null && Number.isFinite(n)
                    ? n.toLocaleString("es-MX", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                    : "—";
                const fmtKg = (n: number | null) =>
                  n != null && Number.isFinite(n)
                    ? n.toLocaleString("es-MX", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                    : "—";
                const fmtMxn0 = (n: number | null) =>
                  n != null && Number.isFinite(n)
                    ? n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 })
                    : "—";
                const excelCliente = dicfData?.excelData?.clientes?.find(
                  (x) => (x.cliente || "").trim().toLowerCase() === clienteNombreSel.toLowerCase()
                );
                const realTonForecast =
                  excelCliente?.kg_mes_real != null && Number.isFinite(Number(excelCliente.kg_mes_real))
                    ? Number(excelCliente.kg_mes_real) / 1000
                    : null;
                return (
                  <div className="mt-2 rounded border border-slate-700 bg-slate-800/40 p-3">
                    <h4 className="mb-2 text-base font-semibold text-slate-300">
                      Venta y descuento por mes (Enero → Forecast)
                    </h4>
                    {st?.loading && <p className="text-sm text-slate-400">Cargando datos del Excel…</p>}
                    {st?.error && <p className="text-sm text-red-300">No se pudo leer el Excel: {st.error}</p>}
                    {!st?.loading && !st?.error && st?.rows && st.rows.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[40rem] border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-slate-700 text-slate-400">
                              <th className="py-1 pr-2 text-left">Mes</th>
                              <th className="py-1 pr-2 text-right">Venta (Ton)</th>
                              <th className="py-1 text-right">Descuento ($/Kg)</th>
                              <th className="py-1 text-right">Ingreso (MXN)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {st.rows.map((r, idx) => (
                              <tr key={idx} className="border-b border-slate-800">
                                <td className="py-1 pr-2">{r.mes}</td>
                                <td className="py-1 pr-2 text-right tabular-nums">
                                  {fmtTon(r.ventaTon)}
                                  {realTonForecast != null && /forecast/i.test(r.mes)
                                    ? ` (${fmtTon(realTonForecast)})`
                                    : ""}
                                </td>
                                <td className="py-1 text-right tabular-nums">{fmtKg(r.descKg)}</td>
                                <td className="py-1 text-right tabular-nums">{fmtMxn0(r.ingresoMxn)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {!st?.loading && !st?.error && (!st?.rows || st.rows.length === 0) && (
                      <p className="text-sm text-slate-500">Sin datos por mes.</p>
                    )}
                    <p className="mt-2 text-[0.7rem] text-slate-500">
                      Nota: Descuento $/Kg = Descuento MXN / Venta kg del mismo mes.
                    </p>
                  </div>
                );
              })()}
              {token && planta && (
                <DicfAccionesClientePanel
                  token={token}
                  planta={planta}
                  grupoLabel={deltaClienteSel.grupo}
                  cliente={deltaClienteSel.cliente}
                  canUse={canDicfAcciones}
                />
              )}
              <p>
                Frecuencia estimada:{" "}
                {deltaClienteSel.cliente.freqDays != null && deltaClienteSel.cliente.freqDays < 9000
                  ? `cada ${deltaClienteSel.cliente.freqDays.toFixed(1)} días`
                  : deltaClienteSel.cliente.freqDays != null && deltaClienteSel.cliente.freqDays >= 9000
                    ? "sin compras en la ventana"
                    : "sin datos"}{" "}
                · Estado: {deltaClienteSel.cliente.estado || "N/D"}
              </p>
              <p>
                Días desde última compra (en ventana):{" "}
                {typeof deltaClienteSel.cliente.daysSinceLast === "number"
                  ? `${deltaClienteSel.cliente.daysSinceLast} días`
                  : "N/D"}
                {deltaClienteSel.cliente.lastPurchaseDate && (
                  <>
                    {" "}
                    · Última compra real: {deltaClienteSel.cliente.lastPurchaseDate}
                    {typeof deltaClienteSel.cliente.daysSinceLastReal === "number"
                      ? ` (hace ${deltaClienteSel.cliente.daysSinceLastReal} días)`
                      : ""}
                  </>
                )}
              </p>
              <div className="mt-2">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-semibold text-slate-400">
                    Compras últimas {historialSemanas} semanas
                  </h4>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Ventana</span>
                    <select
                      value={historialSemanas}
                      onChange={(e) =>
                        setHistorialSemanas(Number(e.target.value) as DicfHistoryWeeks)
                      }
                      className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                    >
                      {DICF_HISTORY_WEEK_OPTIONS.map((w) => (
                        <option key={w} value={w}>
                          {w} sem.
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {(() => {
                  const hist = filterDicfClienteHistoryByWeeks(
                    deltaClienteSel.cliente.historyLast4Weeks,
                    historialSemanas
                  );
                  return hist.length > 0 ? (
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="py-1 pr-2 text-left">Fecha</th>
                          <th className="py-1 text-right">Volumen (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hist.map((h, idx) => (
                          <tr key={`${h.fecha}-${idx}`} className="border-b border-slate-800">
                            <td className="py-1 pr-2">{h.fecha}</td>
                            <td className="py-1 text-right tabular-nums">
                              {h.kg.toLocaleString("es-MX", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Sin compras en las últimas {historialSemanas} semanas.
                    </p>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
