"use client";

import { useEffect, useMemo, useState } from "react";

export type ArrNuevoClientePlanPayload = {
  nombre: string;
  kg: number;
  descKg: number;
  gastoMxn: number;
};

export type ArrNuevoClientePlanSavePayload = ArrNuevoClientePlanPayload & {
  id?: string;
};

/** Misma forma que la fila en workspace (evita importar desde la página). */
export type ArrNuevoClientePlanEdicion = {
  id: string;
  nombre: string;
  kg: number;
  descKg: number;
  gastoMxn: number;
};

type Props = {
  abierto: boolean;
  onClose: () => void;
  onSave: (p: ArrNuevoClientePlanSavePayload) => void;
  mesForecastLabel: string;
  /** Nombres ya usados (comparación sin distinguir mayúsculas). */
  nombresExistentes: string[];
  /** Si viene definido, el modal abre en modo edición con esos valores. */
  clienteEditar?: ArrNuevoClientePlanEdicion | null;
};

export default function ArrNuevoClientePlanModal({
  abierto,
  onClose,
  onSave,
  mesForecastLabel,
  nombresExistentes,
  clienteEditar,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [kgStr, setKgStr] = useState("");
  const [descStr, setDescStr] = useState("");
  const [gastoStr, setGastoStr] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nombresBloqueados = useMemo(() => {
    const set = new Set(
      nombresExistentes.map((n) => n.trim().toLowerCase()).filter(Boolean)
    );
    if (clienteEditar) {
      set.delete(clienteEditar.nombre.trim().toLowerCase());
    }
    return set;
  }, [nombresExistentes, clienteEditar]);

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    if (clienteEditar) {
      setNombre(clienteEditar.nombre);
      setKgStr(String(Math.round(clienteEditar.kg)));
      setDescStr(String(clienteEditar.descKg));
      setGastoStr(String(clienteEditar.gastoMxn));
    } else {
      setNombre("");
      setKgStr("");
      setDescStr("");
      setGastoStr("");
    }
  }, [abierto, clienteEditar]);

  function parseNum(s: string): number | null {
    const t = String(s).trim().replace(",", ".");
    if (t === "") return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }

  function handleGuardar() {
    setError(null);
    const nom = nombre.trim();
    if (!nom) {
      setError("Indica el nombre del cliente.");
      return;
    }
    if (nombresBloqueados.has(nom.toLowerCase())) {
      setError("Ya existe otro cliente con ese nombre.");
      return;
    }
    const kg = parseNum(kgStr);
    if (kg == null || kg <= 0) {
      setError("La venta en kg debe ser mayor que cero.");
      return;
    }
    const descRaw = parseNum(descStr);
    if (descRaw == null) {
      setError("Indica el descuento por kilo ($/kg).");
      return;
    }
    const descKg = descRaw > 0 ? -Math.abs(descRaw) : descRaw;
    const gasto = parseNum(gastoStr);
    if (gasto == null || !Number.isFinite(gasto) || gasto < 0) {
      setError("Indica el gasto (MXN, mayor o igual a cero).");
      return;
    }
    const base: ArrNuevoClientePlanSavePayload = {
      nombre: nom,
      kg,
      descKg,
      gastoMxn: gasto,
    };
    if (clienteEditar) base.id = clienteEditar.id;
    onSave(base);
    onClose();
  }

  const modoEdicion = Boolean(clienteEditar);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nuevo-cliente-plan-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 p-5 text-slate-100 shadow-xl">
        <h2 id="nuevo-cliente-plan-title" className="text-lg font-semibold text-slate-50">
          {modoEdicion ? "Editar cliente (plan)" : "Nuevo cliente (plan)"}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Mes forecast: <span className="text-slate-300">{mesForecastLabel}</span>.
          {modoEdicion
            ? " Los cambios actualizan de inmediato el resumen (venta, descuento ponderado, gasto y rentabilidad)."
            : " Se sumará el volumen al resumen, se recalculará el descuento ponderado, el gasto y la rentabilidad del mes proyectado."}
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-slate-300">Nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Ej. Cliente demo"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Venta (kg)</span>
            <input
              value={kgStr}
              onChange={(e) => setKgStr(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Ej. 15000"
              inputMode="decimal"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Descuento por kilo ($/kg)</span>
            <input
              value={descStr}
              onChange={(e) => setDescStr(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Positivo = descuento; negativo = mismo signo que la tabla"
              inputMode="decimal"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Gasto (MXN)</span>
            <input
              value={gastoStr}
              onChange={(e) => setGastoStr(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Ej. 50000"
              inputMode="decimal"
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            className="rounded border border-sky-600 bg-sky-950/60 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-900/50"
          >
            {modoEdicion ? "Guardar cambios" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
