"use client";

import { useState } from "react";
import { postCrearProyecto, type CrearProyectoPayload } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  plantaId: number;
  plantaNombre: string;
  token: string;
  onCreated: () => void;
}

export default function CrearProyectoModal({ open, onClose, plantaId, plantaNombre, token, onCreated }: Props) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const initFecha = fechaInicio || today;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const nombreTrim = nombre.trim();
    if (!nombreTrim || nombreTrim.length < 2) {
      setError("El nombre es obligatorio (mín. 2 caracteres).");
      return;
    }
    setSaving(true);
    try {
      const payload: CrearProyectoPayload = {
        planta_id: plantaId,
        nombre: nombreTrim,
        descripcion: descripcion.trim() || undefined,
        fecha_inicio: fechaInicio.trim() || initFecha,
        fecha_cierre_estimada: fechaCierre.trim() || undefined,
      };
      await postCrearProyecto(token, payload);
      onCreated();
      onClose();
      setNombre("");
      setDescripcion("");
      setFechaInicio("");
      setFechaCierre("");
    } catch (err) {
      setError((err as Error).message || "Error al guardar el proyecto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 p-3">
          <h2 className="text-lg font-medium text-slate-200">Crear proyecto</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && <p className="rounded bg-red-900/50 p-2 text-sm text-red-300">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">Planta</label>
            <p className="text-sm text-slate-200">{plantaNombre}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">Nombre del proyecto *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
              placeholder="Nombre del proyecto"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">Descripción (opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 min-h-[60px]"
              placeholder="Descripción breve"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio || today}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Cierre estimado (opcional)</label>
              <input
                type="date"
                value={fechaCierre}
                onChange={(e) => setFechaCierre(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar proyecto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
