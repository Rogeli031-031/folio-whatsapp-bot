"use client";

import { useState, useEffect } from "react";
import { fetchPlantas, fetchProyectosPorPlanta, postCrearFolio, type CrearFolioPayload } from "@/lib/api";

const CATEGORIAS = [
  { clave: "GASTOS", nombre: "Gastos" },
  { clave: "INVERSIONES", nombre: "Inversiones" },
  { clave: "DYO", nombre: "Derechos y Obligaciones" },
  { clave: "TALLER", nombre: "Taller" },
];

const SUBCATEGORIAS: Record<string, string[]> = {
  GASTOS: ["Contractuales", "Equipo planta", "Estaciones", "Jurídicos", "Liquidaciones laborales", "Pasivos meses anteriores", "Rentas", "Trámites vehiculares", "Varios"],
  INVERSIONES: ["Equipo para la planta", "Instalaciones a clientes", "Publicidad", "Tanques y cilindros", "Estaciones"],
  DYO: [],
  TALLER: [],
};

const PRIORIDADES = ["Urgente no programado", "Alta", "Media", "Baja"];

interface Props {
  open: boolean;
  onClose: () => void;
  plantaId: number;
  plantaNombre: string;
  token: string;
  onCreated: () => void;
  /** Si true, el folio se crea con prioridad "Urgente no programado" */
  urgente?: boolean;
}

const PRIORIDAD_URGENTE = "Urgente no programado";

export default function CrearFolioModal({ open, onClose, plantaId, plantaNombre, token, onCreated, urgente = false }: Props) {
  const [plantas, setPlantas] = useState<{ id: number; nombre: string }[]>([]);
  const [beneficiario, setBeneficiario] = useState("");
  const [concepto, setConcepto] = useState("");
  const [importe, setImporte] = useState("");
  const [categoria, setCategoria] = useState("GASTOS");
  const [subcategoria, setSubcategoria] = useState("");
  const [prioridad, setPrioridad] = useState(urgente ? PRIORIDAD_URGENTE : "Media");
  const [unidad, setUnidad] = useState("");
  const [estacion, setEstacion] = useState("");
  const [banco, setBanco] = useState("");
  const [cuenta_bancaria, setCuentaBancaria] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlantaId, setSelectedPlantaId] = useState(plantaId);
  const [proyectoId, setProyectoId] = useState<number | null>(null);
  const [proyectos, setProyectos] = useState<{ id: number; codigo: string; nombre: string }[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedPlantaId(plantaId);
      setProyectoId(null);
      setPrioridad(urgente ? PRIORIDAD_URGENTE : "Media");
      if (token) fetchPlantas(token).then((r) => setPlantas(r.plantas || [])).catch(() => setPlantas([]));
    }
  }, [open, token, plantaId, urgente]);

  useEffect(() => {
    if (!open || !token || !selectedPlantaId) {
      setProyectos([]);
      return;
    }
    fetchProyectosPorPlanta(token, selectedPlantaId)
      .then((r) => setProyectos(r.proyectos || []))
      .catch(() => setProyectos([]));
  }, [open, token, selectedPlantaId]);

  const subs = SUBCATEGORIAS[categoria] || [];
  const showUnidad = categoria === "TALLER";
  const showEstacion = subcategoria.trim().toLowerCase() === "estaciones";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const conceptoTrim = concepto.trim();
    const importeNum = parseFloat(importe.replace(/,/g, "."));
    if (!conceptoTrim || conceptoTrim.length < 2) {
      setError("El concepto es obligatorio (mín. 2 caracteres).");
      return;
    }
    if (!Number.isFinite(importeNum) || importeNum < 0) {
      setError("El importe debe ser un número mayor o igual a 0.");
      return;
    }
    setSaving(true);
    try {
      const payload: CrearFolioPayload = {
        planta_id: selectedPlantaId,
        proyecto_id: proyectoId && proyectoId > 0 ? proyectoId : undefined,
        beneficiario: beneficiario.trim() || undefined,
        concepto: conceptoTrim,
        importe: importeNum,
        categoria,
        subcategoria: subcategoria.trim() || undefined,
        prioridad,
        unidad: unidad.trim() || undefined,
        estacion: estacion.trim() || undefined,
        banco: banco.trim() || undefined,
        cuenta_bancaria: cuenta_bancaria.trim() || undefined,
      };
      await postCrearFolio(token, payload);
      onCreated();
      onClose();
      setConcepto("");
      setImporte("");
      setBeneficiario("");
      setSubcategoria("");
      setUnidad("");
      setEstacion("");
      setBanco("");
      setCuentaBancaria("");
    } catch (err) {
      setError((err as Error).message || "Error al guardar el folio.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const plantaOptions = plantas.length
    ? plantas.some((p) => p.id === plantaId)
      ? plantas
      : [{ id: plantaId, nombre: plantaNombre }, ...plantas]
    : [{ id: plantaId, nombre: plantaNombre }];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-lg border border-slate-600 bg-slate-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2">
          <h2 className="text-lg font-medium text-slate-200">{urgente ? "Crear folio urgente" : "Crear folio"}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-2">
          {error && <p className="rounded bg-red-900/50 px-2 py-1 text-sm text-red-300">{error}</p>}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Planta</label>
              <select
                value={selectedPlantaId}
                onChange={(e) => setSelectedPlantaId(Number(e.target.value))}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                required
              >
                {plantaOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Proyecto (opcional)</label>
              <select
                value={proyectoId ?? ""}
                onChange={(e) => { const v = e.target.value; setProyectoId(v === "" ? null : Number(v)); }}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
              >
                <option value="">— Ninguno —</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.codigo} – {p.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Beneficiario</label>
              <input
                type="text"
                value={beneficiario}
                onChange={(e) => setBeneficiario(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                placeholder="Nombre o razón social"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Importe (MXN) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                placeholder="Ej: 1500 o 1,500.50"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">Concepto (razón del pago) *</label>
            <textarea
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 min-h-[56px]"
              placeholder="Descripción del gasto"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Categoría *</label>
              <select
                value={categoria}
                onChange={(e) => { setCategoria(e.target.value); setSubcategoria(""); }}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                required
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.clave} value={c.clave}>{c.nombre}</option>
                ))}
              </select>
            </div>
            {subs.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-0.5">Subcategoría</label>
                <select
                  value={subcategoria}
                  onChange={(e) => setSubcategoria(e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                >
                  <option value="">— Opcional —</option>
                  {subs.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Prioridad *</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                required
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {showUnidad && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-0.5">Unidad</label>
                <input
                  type="text"
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                  placeholder="AT-15"
                />
              </div>
            )}
            {showEstacion && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-0.5">Estación</label>
                <input
                  type="text"
                  value={estacion}
                  onChange={(e) => setEstacion(e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                  placeholder="Nombre estación"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Banco</label>
              <input
                type="text"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                placeholder="Nombre del banco"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Cuenta bancaria</label>
              <input
                type="text"
                value={cuenta_bancaria}
                onChange={(e) => setCuentaBancaria(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                placeholder="CLABE o número de cuenta"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar folio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
