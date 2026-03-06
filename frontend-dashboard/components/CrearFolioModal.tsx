"use client";

import { useState, useEffect } from "react";
import { fetchPlantas, postCrearFolio, type CrearFolioPayload } from "@/lib/api";

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

const PRIORIDADES = ["Alta", "Media", "Baja"];

interface Props {
  open: boolean;
  onClose: () => void;
  plantaId: number;
  plantaNombre: string;
  token: string;
  onCreated: () => void;
}

export default function CrearFolioModal({ open, onClose, plantaId, plantaNombre, token, onCreated }: Props) {
  const [plantas, setPlantas] = useState<{ id: number; nombre: string }[]>([]);
  const [beneficiario, setBeneficiario] = useState("");
  const [concepto, setConcepto] = useState("");
  const [importe, setImporte] = useState("");
  const [categoria, setCategoria] = useState("GASTOS");
  const [subcategoria, setSubcategoria] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [unidad, setUnidad] = useState("");
  const [estacion, setEstacion] = useState("");
  const [banco, setBanco] = useState("");
  const [cuenta_bancaria, setCuentaBancaria] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlantaId, setSelectedPlantaId] = useState(plantaId);

  useEffect(() => {
    if (open) {
      setSelectedPlantaId(plantaId);
      if (token) fetchPlantas(token).then((r) => setPlantas(r.plantas || [])).catch(() => setPlantas([]));
    }
  }, [open, token, plantaId]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-slate-600 bg-slate-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 p-3">
          <h2 className="text-lg font-medium text-slate-200">Crear folio</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <p className="rounded bg-red-900/50 p-2 text-sm text-red-300">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Planta</label>
            <select
              value={selectedPlantaId}
              onChange={(e) => setSelectedPlantaId(Number(e.target.value))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              required
            >
              {(
                plantas.length
                  ? plantas.some((p) => p.id === plantaId)
                    ? plantas
                    : [{ id: plantaId, nombre: plantaNombre }, ...plantas]
                  : [{ id: plantaId, nombre: plantaNombre }]
              ).map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Beneficiario (a quién se paga)</label>
            <input
              type="text"
              value={beneficiario}
              onChange={(e) => setBeneficiario(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="Nombre o razón social"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Concepto (razón del pago) *</label>
            <textarea
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200 min-h-[80px]"
              placeholder="Descripción del gasto"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Importe (MXN) *</label>
            <input
              type="text"
              inputMode="decimal"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="Ej: 1500 o 1,500.50"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Categoría *</label>
            <select
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value); setSubcategoria(""); }}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              required
            >
              {CATEGORIAS.map((c) => (
                <option key={c.clave} value={c.clave}>{c.nombre}</option>
              ))}
            </select>
          </div>
          {subs.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Subcategoría</label>
              <select
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              >
                <option value="">— Opcional —</option>
                {subs.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          {showUnidad && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Unidad (ej. AT-15, C-3)</label>
              <input
                type="text"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
                placeholder="AT-15"
              />
            </div>
          )}
          {showEstacion && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Estación</label>
              <input
                type="text"
                value={estacion}
                onChange={(e) => setEstacion(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
                placeholder="Nombre de la estación"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Prioridad *</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              required
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Banco</label>
            <input
              type="text"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="Nombre del banco"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Cuenta bancaria</label>
            <input
              type="text"
              value={cuenta_bancaria}
              onChange={(e) => setCuentaBancaria(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="CLABE o número de cuenta"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar folio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
