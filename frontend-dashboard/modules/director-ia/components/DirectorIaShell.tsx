"use client";

import { useState } from "react";

const MESES = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

export function DirectorIaShell() {
  const [planta, setPlanta] = useState("");
  const [mes, setMes] = useState("");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 px-4 py-4">
        <h1 className="text-xl font-semibold text-white">Director IA</h1>
      </header>

      <main className="mx-auto max-w-4xl p-4 space-y-6">
        <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 min-w-[12rem]">
              <span className="text-xs text-slate-400">Planta</span>
              <select
                value={planta}
                onChange={(e) => setPlanta(e.target.value)}
                className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200"
                aria-label="Selector de planta"
              >
                <option value="">— Seleccionar planta (placeholder) —</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 min-w-[10rem]">
              <span className="text-xs text-slate-400">Mes</span>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200"
                aria-label="Selector de mes"
              >
                <option value="">— Seleccionar mes —</option>
                {MESES.map((m) => (
                  <option key={m.value} value={m.value} disabled>
                    {m.label} (placeholder)
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled
              className="rounded bg-violet-700 px-4 py-2 text-sm font-medium text-white opacity-60 cursor-not-allowed"
              title="Próximamente"
            >
              Analizar planta
            </button>
          </div>
        </section>

        <section
          className="min-h-[280px] rounded-lg border border-dashed border-slate-600 bg-slate-900/40 p-6"
          aria-label="Área de resultados"
        >
          <p className="text-sm text-slate-500 text-center">
            Los resultados del análisis aparecerán aquí.
          </p>
        </section>
      </main>
    </div>
  );
}
