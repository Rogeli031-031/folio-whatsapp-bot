"use client";

import { useEffect, useMemo, useState } from "react";

export type ArrNuevoClientePlanPayload = {
  nombre: string;
  kg: number;
  descKg: number;
  gastoMxn: number;
  /** null = usar HG del mes forecast en el ingreso marginal. */
  hgCliente: number | null;
  /** null = usar HG$ del mes forecast en el mismo término. */
  hgCompra: number | null;
  responsable: string;
  responsableId: number;
  categoria: "CASA" | "COMISIONISTA";
  subcategoria: string;
  comentarios: string;
  /** Si false, el volumen no suma al forecast del mes B (solo plan futuro). Por defecto true. */
  incluirEnForecastMes?: boolean;
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
  responsable: string;
  responsableId?: number | null;
  categoria: "CASA" | "COMISIONISTA";
  subcategoria: string;
  hgCliente?: number | null;
  hgCompra?: number | null;
  comentarios?: string;
  /** Fila vinculada a casillas Sin venta / Con venta (campos de volumen acotados). */
  origen?: "manual" | "sin_venta" | "con_venta";
  /** Si false, no suma al forecast del mes B. */
  incluirEnForecastMes?: boolean;
};

type Props = {
  abierto: boolean;
  onClose: () => void;
  onSave: (p: ArrNuevoClientePlanSavePayload) => void;
  mesForecastLabel: string;
  /** Nombres ya usados (comparación sin distinguir mayúsculas). */
  nombresExistentes: string[];
  responsables: { id: number; nombre: string }[];
  subcategorias: { categoria: "CASA" | "COMISIONISTA"; subcategoria: string }[];
  /** Si viene definido, el modal abre en modo edición con esos valores. */
  clienteEditar?: ArrNuevoClientePlanEdicion | null;
};

export default function ArrNuevoClientePlanModal({
  abierto,
  onClose,
  onSave,
  mesForecastLabel,
  nombresExistentes,
  responsables,
  subcategorias,
  clienteEditar,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [kgStr, setKgStr] = useState("");
  const [descStr, setDescStr] = useState("");
  const [gastoStr, setGastoStr] = useState("");
  const [hgClienteStr, setHgClienteStr] = useState("");
  const [hgCompraStr, setHgCompraStr] = useState("");
  const [responsableIdStr, setResponsableIdStr] = useState("");
  const [categoria, setCategoria] = useState<"CASA" | "COMISIONISTA">("CASA");
  const [subcategoria, setSubcategoria] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [incluirEnForecastMes, setIncluirEnForecastMes] = useState(true);
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
        const hg = clienteEditar.hgCliente;
        setHgClienteStr(
          hg != null && Number.isFinite(hg) ? String(hg) : ""
        );
        const hgCp = clienteEditar.hgCompra;
        setHgCompraStr(
          hgCp != null && Number.isFinite(hgCp) ? String(hgCp) : ""
        );
        setCategoria(clienteEditar.categoria ?? "CASA");
        setSubcategoria(clienteEditar.subcategoria ?? "");
        setComentarios((clienteEditar.comentarios ?? "").slice(0, 2000));
        setIncluirEnForecastMes(clienteEditar.incluirEnForecastMes !== false);
        const rid = clienteEditar.responsableId;
        if (rid != null && Number.isFinite(rid) && rid > 0) {
          setResponsableIdStr(String(rid));
        } else {
          const nm = (clienteEditar.responsable || "").trim().toLowerCase();
          const hit = responsables.find((u) => u.nombre.trim().toLowerCase() === nm);
          if (hit) {
            setResponsableIdStr(String(hit.id));
          } else if (
            (clienteEditar.origen === "sin_venta" || clienteEditar.origen === "con_venta") &&
            responsables.length > 0
          ) {
            setResponsableIdStr(String(responsables[0].id));
          } else {
            setResponsableIdStr("");
          }
        }
      } else {
        setNombre("");
      setKgStr("");
      setDescStr("");
      setGastoStr("");
      setHgClienteStr("");
      setHgCompraStr("");
      setResponsableIdStr("");
      setCategoria("CASA");
      setSubcategoria("");
      setComentarios("");
      setIncluirEnForecastMes(true);
    }
  }, [abierto, clienteEditar, responsables]);

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
    const origen = clienteEditar?.origen;
    const esSinVentaRow = origen === "sin_venta";
    const esConVentaRow = origen === "con_venta";
    const esForecastMeta = esSinVentaRow || esConVentaRow;
    if (!esForecastMeta && nombresBloqueados.has(nom.toLowerCase())) {
      setError("Ya existe otro cliente con ese nombre.");
      return;
    }

    let kg = parseNum(kgStr);
    if (kg == null || kg <= 0) {
      if (esSinVentaRow && clienteEditar) kg = clienteEditar.kg;
      else {
        setError("La venta en kg debe ser mayor que cero.");
        return;
      }
    }

    let descRaw = parseNum(descStr);
    if (descRaw == null) {
      if (esSinVentaRow && clienteEditar) descRaw = clienteEditar.descKg;
      else {
        setError("Indica el descuento por kilo ($/kg).");
        return;
      }
    }
    const descKg = descRaw > 0 ? -Math.abs(descRaw) : descRaw;

    let gasto = parseNum(gastoStr);
    if (gasto == null || !Number.isFinite(gasto) || gasto < 0) {
      if (esSinVentaRow) gasto = 0;
      else {
        setError("Indica el gasto (MXN, mayor o igual a cero).");
        return;
      }
    }

    const hgClienteTrim = hgClienteStr.trim();
    let hgCliente: number | null = null;
    if (esSinVentaRow) {
      const hgParsed = parseNum(hgClienteTrim);
      if (hgClienteTrim === "" || hgParsed == null || !Number.isFinite(hgParsed)) {
        setError("Indica HG cliente (obligatorio al marcar Sin venta).");
        return;
      }
      hgCliente = hgParsed;
    } else if (hgClienteTrim !== "") {
      const hgParsed = parseNum(hgClienteTrim);
      if (hgParsed == null || !Number.isFinite(hgParsed)) {
        setError("HG cliente debe ser un número válido o déjalo vacío para usar el HG del mes.");
        return;
      }
      hgCliente = hgParsed;
    }

    const hgCompraTrim = hgCompraStr.trim();
    let hgCompra: number | null = null;
    if (esSinVentaRow) {
      const hcp = parseNum(hgCompraTrim);
      if (hgCompraTrim === "" || hcp == null || !Number.isFinite(hcp)) {
        setError("Indica HG compra (obligatorio al marcar Sin venta).");
        return;
      }
      hgCompra = hcp;
    } else if (hgCompraTrim !== "") {
      const hcp = parseNum(hgCompraTrim);
      if (hcp == null || !Number.isFinite(hcp)) {
        setError(
          "HG compra debe ser un número válido o déjalo vacío para usar HG$ del mes."
        );
        return;
      }
      hgCompra = hcp;
    }

    const sub = subcategoria.trim() || (esSinVentaRow ? (clienteEditar?.subcategoria ?? "").trim() : "");
    if (!sub) {
      setError("Indica la subcategoría.");
      return;
    }

    const rid = parseInt(String(responsableIdStr).trim(), 10);
    if (!Number.isFinite(rid) || rid <= 0) {
      setError("Selecciona un responsable de la lista.");
      return;
    }
    const u = responsables.find((x) => x.id === rid);
    if (!u) {
      setError("Responsable inválido o no pertenece a la planta.");
      return;
    }
    const base: ArrNuevoClientePlanSavePayload = {
      nombre: nom,
      kg,
      descKg,
      gastoMxn: gasto,
      hgCliente,
      hgCompra,
      responsable: u.nombre,
      responsableId: rid,
      categoria,
      subcategoria: sub,
      comentarios: comentarios.trim().slice(0, 2000),
      incluirEnForecastMes,
    };
    if (clienteEditar) base.id = clienteEditar.id;
    onSave(base);
    onClose();
  }

  const modoEdicion = Boolean(clienteEditar);
  const roOrigen = clienteEditar?.origen;
  const readOnlyNombreForecast =
    roOrigen === "sin_venta" || roOrigen === "con_venta";
  const readOnlyVolumenSinVenta = roOrigen === "sin_venta";
  const readOnlyHg = roOrigen === "con_venta";
  const clsRo = (locked: boolean) => (locked ? "cursor-not-allowed bg-slate-900/70 text-slate-300" : "");

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
        <div className="mt-1 space-y-1 text-xs text-slate-400">
          <p>
            Mes forecast: <span className="text-slate-300">{mesForecastLabel}</span>.
            {modoEdicion
              ? " Los cambios actualizan de inmediato el resumen (venta, descuento ponderado, gasto y rentabilidad)."
              : " Se sumará el volumen al resumen, se recalculará el descuento ponderado, el gasto y la rentabilidad del mes proyectado."}
          </p>
          {roOrigen === "sin_venta" ? (
            <p className="text-sky-300/90">
              Cliente marcado como Sin venta. Indica HG cliente y HG compra (van a columnas H e I del
              Excel). Categoría y subcategoría se tomaron del listado ARR del cliente.
            </p>
          ) : readOnlyNombreForecast ? (
            <p className="text-sky-300/90">
              Casilla «Con venta» en la tabla de clientes. Puedes editar comentarios, responsable y
              categorías; el volumen sigue al pronóstico de la tabla.
            </p>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-slate-300">Nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              readOnly={readOnlyNombreForecast}
              className={`mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${clsRo(readOnlyNombreForecast)}`}
              placeholder="Ej. Cliente demo"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Venta (kg)</span>
            <input
              value={kgStr}
              onChange={(e) => setKgStr(e.target.value)}
              readOnly={readOnlyVolumenSinVenta}
              className={`mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${clsRo(readOnlyVolumenSinVenta)}`}
              placeholder="Ej. 15000"
              inputMode="decimal"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Descuento por kilo ($/kg)</span>
            <input
              value={descStr}
              onChange={(e) => setDescStr(e.target.value)}
              readOnly={readOnlyVolumenSinVenta}
              className={`mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${clsRo(readOnlyVolumenSinVenta)}`}
              placeholder="Positivo = descuento; negativo = mismo signo que la tabla"
              inputMode="decimal"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Gasto (MXN)</span>
            <input
              value={gastoStr}
              onChange={(e) => setGastoStr(e.target.value)}
              readOnly={readOnlyVolumenSinVenta}
              className={`mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${clsRo(readOnlyVolumenSinVenta)}`}
              placeholder="Ej. 50000"
              inputMode="decimal"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">
              HG cliente{roOrigen === "sin_venta" ? " *" : ""}
            </span>
            <input
              value={hgClienteStr}
              onChange={(e) => setHgClienteStr(e.target.value)}
              readOnly={readOnlyHg}
              className={`mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${clsRo(readOnlyHg)}`}
              placeholder={
                roOrigen === "sin_venta" ? "Obligatorio (columna H en Excel)" : "Vacío = HG del mes forecast"
              }
              inputMode="decimal"
            />
            <span className="mt-1 block text-[0.65rem] text-slate-500">
              Mismo concepto que HG del resumen; sustituye solo ese factor en{" "}
              <span className="font-mono text-slate-400">kg×HG×HG$/100</span>.
            </span>
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">
              HG compra{roOrigen === "sin_venta" ? " *" : ""}
            </span>
            <input
              value={hgCompraStr}
              onChange={(e) => setHgCompraStr(e.target.value)}
              readOnly={readOnlyHg}
              className={`mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${clsRo(readOnlyHg)}`}
              placeholder={
                roOrigen === "sin_venta" ? "Obligatorio (columna I en Excel)" : "Vacío = HG$ del mes forecast"
              }
              inputMode="decimal"
            />
            <span className="mt-1 block text-[0.65rem] text-slate-500">
              Mismo concepto que HG$ del resumen; sustituye solo ese factor en{" "}
              <span className="font-mono text-slate-400">kg×HG×HG$/100</span>.
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-300">Categoría</span>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as "CASA" | "COMISIONISTA")}
                disabled={readOnlyVolumenSinVenta}
                className={`mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${clsRo(readOnlyVolumenSinVenta)}`}
              >
                <option value="CASA">CASA</option>
                <option value="COMISIONISTA">COMISIONISTA</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-300">Subcategoría</span>
              <select
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Seleccionar…</option>
                {subcategorias
                  .filter((s) => s.categoria === categoria)
                  .map((s) => (
                    <option key={`${s.categoria}::${s.subcategoria}`} value={s.subcategoria}>
                      {s.subcategoria}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-slate-300">Responsable</span>
            <select
              value={responsableIdStr}
              onChange={(e) => setResponsableIdStr(e.target.value)}
              disabled={responsables.length === 0}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {responsables.length === 0 ? "Sin usuarios (revisa planta / permisos)…" : "Seleccionar…"}
              </option>
              {responsables.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Proyección del mes</span>
            <select
              value={incluirEnForecastMes ? "mes" : "futuro"}
              onChange={(e) => setIncluirEnForecastMes(e.target.value === "mes")}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="mes">Suma al forecast del mes seleccionado</option>
              <option value="futuro">Solo plan (compra en meses futuros)</option>
            </select>
            <span className="mt-1 block text-[0.65rem] text-slate-500">
              «Solo plan» no afecta venta, descuento, HG, gasto ni renta del mes B en el resumen superior.
            </span>
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Comentarios</span>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value.slice(0, 2000))}
              rows={3}
              className="mt-1 w-full resize-y rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Opcional"
              maxLength={2000}
            />
            <span className="mt-0.5 block text-[0.65rem] text-slate-500">
              {comentarios.length}/2000
            </span>
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
