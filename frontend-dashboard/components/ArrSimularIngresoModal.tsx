"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fmtNum } from "@/lib/igf-kpi-ui";

/** Campos necesarios para la misma fórmula que `ingresoClienteMarginal` en ARR. */
export type ArrSimularMetricas = {
  margenKg: number | null;
  hgDisplay: number | null;
  hgDinero: number | null;
};

function ingresoSimuladoKg(
  kg: number,
  descKg: number | null,
  m: ArrSimularMetricas
): number | null {
  if (!Number.isFinite(kg) || kg < 0) return null;
  if (kg === 0) return 0;
  const margen = m.margenKg;
  const hg = m.hgDisplay;
  const hgDin = m.hgDinero;
  if (margen == null || hg == null || hgDin == null) return null;
  const d = descKg ?? 0;
  const dMag = Number.isFinite(d) ? Math.abs(d) : 0;
  const raw = kg * (margen - dMag) + (hg * kg * hgDin) / 100;
  return Math.round(raw);
}

export type ArrSimularClienteOpcion = {
  cliente: string;
  ventaKg: number;
  descKg: number | null;
  ingresoTabla: number | null;
  soloNuevo: boolean;
};

type Props = {
  onClose: () => void;
  empresa: string;
  mesForecastLabel: string;
  metricas: ArrSimularMetricas;
  clientes: ArrSimularClienteOpcion[];
};

export default function ArrSimularIngresoModal({
  onClose,
  empresa,
  mesForecastLabel,
  metricas,
  clientes,
}: Props) {
  const [modo, setModo] = useState<"nuevo" | "existente">("existente");
  const [clienteSel, setClienteSel] = useState<string>("");
  const [ventaKgStr, setVentaKgStr] = useState<string>("");
  const [descKgStr, setDescKgStr] = useState<string>("");
  const didInitFromLista = useRef(false);

  const coefOk =
    metricas.margenKg != null &&
    metricas.hgDisplay != null &&
    metricas.hgDinero != null;

  const ventaKg = useMemo(() => {
    const n = parseFloat(String(ventaKgStr).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [ventaKgStr]);

  const descKg = useMemo(() => {
    const s = String(descKgStr).trim();
    if (s === "") return null;
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [descKgStr]);

  const ingresoCalc = useMemo(() => {
    if (ventaKg == null) return null;
    return ingresoSimuladoKg(ventaKg, descKg, metricas);
  }, [ventaKg, descKg, metricas]);

  const filaSeleccionada = useMemo(
    () => clientes.find((c) => c.cliente === clienteSel) ?? null,
    [clientes, clienteSel]
  );

  /** Primera vez que hay filas de clientes: precargar el primero (mes forecast). */
  useLayoutEffect(() => {
    if (modo !== "existente" || didInitFromLista.current) return;
    if (!clientes.length) return;
    didInitFromLista.current = true;
    const f = clientes[0];
    setClienteSel(f.cliente);
    setVentaKgStr(String(f.ventaKg));
    setDescKgStr(f.descKg != null && Number.isFinite(f.descKg) ? String(f.descKg) : "");
  }, [clientes, modo]);

  useEffect(() => {
    if (modo !== "nuevo") return;
    setClienteSel("");
    setVentaKgStr("0");
    setDescKgStr("0");
  }, [modo]);

  useEffect(() => {
    if (modo !== "existente") return;
    if (clienteSel && clientes.some((c) => c.cliente === clienteSel)) return;
    if (clientes[0]) {
      const f = clientes[0];
      setClienteSel(f.cliente);
      setVentaKgStr(String(f.ventaKg));
      setDescKgStr(f.descKg != null && Number.isFinite(f.descKg) ? String(f.descKg) : "");
    }
  }, [modo, clienteSel, clientes]);

  const aplicarClienteDesdeTabla = (nombre: string) => {
    setClienteSel(nombre);
    if (!nombre) return;
    const f = clientes.find((c) => c.cliente === nombre);
    if (f) {
      setVentaKgStr(String(f.ventaKg));
      setDescKgStr(f.descKg != null && Number.isFinite(f.descKg) ? String(f.descKg) : "");
    }
  };

  const deltaVsTabla =
    filaSeleccionada && ingresoCalc != null && filaSeleccionada.ingresoTabla != null
      ? ingresoCalc - filaSeleccionada.ingresoTabla
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="arr-simular-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-700 pb-3">
          <div>
            <h2 id="arr-simular-title" className="text-lg font-semibold text-slate-100">
              Simular ingreso cliente
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {empresa} · Mes forecast: <span className="text-slate-300">{mesForecastLabel || "—"}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {!coefOk && (
          <p className="mb-4 rounded border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
            No hay margen / HG completos para el mes forecast en IGF. Carga el mes o elige otra empresa.
          </p>
        )}

        <div className="mb-4 rounded border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Coeficientes (IGF mes forecast)
          </p>
          <ul className="space-y-1 tabular-nums">
            <li>
              Margen <span className="text-slate-400">($/kg)</span>:{" "}
              {metricas.margenKg != null ? fmtNum(metricas.margenKg, 4) : "—"}
            </li>
            <li>
              HG <span className="text-slate-400">(%)</span>:{" "}
              {metricas.hgDisplay != null ? fmtNum(metricas.hgDisplay, 2) : "—"}
            </li>
            <li>
              HG <span className="text-slate-400">($/kg)</span>:{" "}
              {metricas.hgDinero != null ? fmtNum(metricas.hgDinero, 4) : "—"}
            </li>
          </ul>
          <p className="mt-2 text-[0.65rem] text-slate-500 leading-snug">
            Ingreso ≈ kg × (margen − desc. $/kg) + HG% × kg × HG $/kg. Misma lógica que la tabla ARR para el mes
            proyectado.
          </p>
        </div>

        <fieldset className="mb-4 space-y-2 text-sm">
          <legend className="mb-2 text-xs font-medium text-slate-400">Escenario</legend>
          <label className="flex cursor-pointer items-center gap-2 text-slate-200">
            <input
              type="radio"
              name="arr-sim-modo"
              checked={modo === "existente"}
              onChange={() => setModo("existente")}
              className="border-slate-500"
            />
            Cliente con compras en el mes forecast (cargar desde tabla o editar)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-slate-200">
            <input
              type="radio"
              name="arr-sim-modo"
              checked={modo === "nuevo"}
              onChange={() => setModo("nuevo")}
              className="border-slate-500"
            />
            Cliente nuevo — partir de 0 y proyectar venta / descuento
          </label>
        </fieldset>

        {modo === "existente" && (
          <label className="mb-4 block text-sm">
            <span className="mb-1 block text-slate-400">Cliente</span>
            <select
              value={clienteSel}
              onChange={(e) => aplicarClienteDesdeTabla(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-2 text-slate-100"
            >
              <option value="">— Elegir —</option>
              {clientes.map((c) => (
                <option key={`${c.cliente}-${c.soloNuevo}`} value={c.cliente}>
                  {c.cliente}
                  {c.soloNuevo ? " (solo mes B)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Venta (kg)</span>
            <input
              type="text"
              inputMode="decimal"
              value={ventaKgStr}
              onChange={(e) => setVentaKgStr(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-2 text-slate-100 tabular-nums"
              placeholder="0"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Descuento ($/kg)</span>
            <input
              type="text"
              inputMode="decimal"
              value={descKgStr}
              onChange={(e) => setDescKgStr(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-2 text-slate-100 tabular-nums"
              placeholder="0"
            />
          </label>
        </div>

        <div className="mt-6 rounded border border-emerald-900/50 bg-emerald-950/25 px-4 py-3 text-sm">
          <p className="text-slate-400">Ingreso simulado (MXN)</p>
          <p className="text-xl font-semibold tabular-nums text-emerald-300">
            {ingresoCalc != null ? (
              <>${fmtNum(ingresoCalc, 0)}</>
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </p>
          {filaSeleccionada && filaSeleccionada.ingresoTabla != null && ingresoCalc != null && modo === "existente" && (
            <p className="mt-2 text-xs text-slate-400">
              En tabla ({mesForecastLabel}): ${fmtNum(filaSeleccionada.ingresoTabla, 0)}
              {deltaVsTabla != null && (
                <span className={deltaVsTabla >= 0 ? " text-emerald-400" : " text-red-400"}>
                  {" "}
                  · Diferencia: {deltaVsTabla >= 0 ? "+" : "−"}$
                  {fmtNum(Math.abs(deltaVsTabla), 0)}
                </span>
              )}
            </p>
          )}
        </div>

        <p className="mt-4 text-[0.7rem] leading-snug text-slate-500">
          Ajusta venta y descuento $/kg para ver el ingreso con el margen y HG del IGF del mes forecast (
          {mesForecastLabel}).
        </p>
      </div>
    </div>
  );
}
