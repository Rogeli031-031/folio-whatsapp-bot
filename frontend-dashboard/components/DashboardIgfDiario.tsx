"use client";

import { useEffect, useState } from "react";
import { fetchIgfDiarioPlants, getDashboardExcelDownloadUrl, type IgfDiarioPlant } from "@/lib/api";
import IgfDiarioGraficaModal from "@/components/IgfDiarioGraficaModal";

function todayInMexico() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function DashboardIgfDiario({
  token, initialPlantId, onClose,
}: { token: string; initialPlantId?: number; onClose: () => void }) {
  const [cutoff, setCutoff] = useState(todayInMexico);
  const [versionAsOfCorte, setVersionAsOfCorte] = useState(true);
  const [plants, setPlants] = useState<IgfDiarioPlant[]>([]);
  const [globalScope, setGlobalScope] = useState(false);
  const [plantCode, setPlantCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openChart, setOpenChart] = useState(false);
  const year = Number(cutoff.slice(0, 4));
  const month = Number(cutoff.slice(5, 7));
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(cutoff) && year >= 2000 && month >= 1 && month <= 12;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    if (!validDate) return;
    fetchIgfDiarioPlants(token, year, month).then((data) => {
      if (cancelled) return;
      setPlants(data.plants);
      setGlobalScope(data.global_scope);
      setPlantCode((current) => {
        if (current && data.plants.some((p) => p.code === current)) return current;
        return data.plants.find((p) => p.id === initialPlantId)?.code
          || (data.global_scope ? "" : data.plants[0]?.code || "");
      });
    }).catch((e: Error) => {
      if (!cancelled) { setError(e.message || "No se pudieron cargar las plantas."); setPlants([]); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, year, month, validDate, initialPlantId]);

  const plant = plants.find((p) => p.code === plantCode);
  const todas = !plantCode && globalScope;
  const canOpen = validDate && !loading && !error && plants.length > 0 && (todas || !!plant);

  if (openChart && canOpen) {
    return <IgfDiarioGraficaModal
      token={token} year={year} month={month} uploadDay={cutoff}
      versionAsOfCorte={versionAsOfCorte} plantCode={plantCode || null} todas={todas}
      scopeLabel={plant?.name || "PROVINCIA"}
      excelUrl={getDashboardExcelDownloadUrl(token, year, month, cutoff, versionAsOfCorte, plantCode || null, !todas, todas)}
      onClose={() => setOpenChart(false)}
    />;
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="dashboard-igf-title"
      className="w-full max-w-lg rounded-xl border border-slate-600 bg-slate-900 p-5 text-slate-100 shadow-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="dashboard-igf-title" className="text-lg font-semibold">IGF Diario</h2>
        <button type="button" onClick={onClose} className="rounded bg-slate-700 px-3 py-2">Cerrar</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Planta
          <select value={plantCode} onChange={(e) => setPlantCode(e.target.value)} disabled={loading || !!error}
            className="min-w-0 rounded border border-slate-600 bg-slate-800 px-3 py-2">
            {globalScope && <option value="">Todas las plantas</option>}
            {!globalScope && !plants.length && <option value="">Sin plantas disponibles</option>}
            {plants.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">Fecha de carga (corte)
          <input type="date" value={cutoff} min="2000-01-01" onChange={(e) => setCutoff(e.target.value)}
            className="min-w-0 rounded border border-slate-600 bg-slate-800 px-3 py-2" />
        </label>
      </div>
      <label className="my-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={versionAsOfCorte} onChange={(e) => setVersionAsOfCorte(e.target.checked)} />
        Versión ≤ corte
      </label>
      {loading && validDate && <p role="status" className="mb-3 text-sm text-slate-400">Cargando plantas…</p>}
      {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}
      {!loading && !error && !plants.length && <p role="status" className="mb-3 text-sm text-amber-300">No tienes plantas disponibles para IGF Diario en este periodo.</p>}
      <button type="button" disabled={!canOpen} onClick={() => setOpenChart(true)}
        className="rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-600 disabled:opacity-40">
        Ver gráfica y descargar
      </button>
    </section>
  </div>;
}
