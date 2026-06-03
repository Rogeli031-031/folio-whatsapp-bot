"use client";

import type {
  DirectorIaMejoraContinuaArea,
  DirectorIaMejoraContinuaEstatus,
  DirectorIaMejoraContinuaResponse,
} from "@/modules/director-ia/lib/api";

const ESTATUS_STYLES: Record<
  DirectorIaMejoraContinuaEstatus,
  { ring: string; bg: string; text: string; dot: string; label: string }
> = {
  VERDE: {
    ring: "border-emerald-600/70",
    bg: "bg-emerald-950/35",
    text: "text-emerald-200",
    dot: "bg-emerald-400",
    label: "Verde",
  },
  AMARILLO: {
    ring: "border-amber-500/70",
    bg: "bg-amber-950/35",
    text: "text-amber-200",
    dot: "bg-amber-400",
    label: "Amarillo",
  },
  ROJO: {
    ring: "border-red-600/70",
    bg: "bg-red-950/40",
    text: "text-red-200",
    dot: "bg-red-500",
    label: "Rojo",
  },
};

function isAreaEnRiesgo(estatus: DirectorIaMejoraContinuaEstatus) {
  return estatus === "AMARILLO" || estatus === "ROJO";
}

function collectResponsablesPrincipales(areas: DirectorIaMejoraContinuaArea[]) {
  const enRiesgo = new Set<string>();
  const resto = new Set<string>();

  for (const a of areas) {
    for (const name of a.responsables) {
      if (!name.trim()) continue;
      if (isAreaEnRiesgo(a.estatus)) enRiesgo.add(name);
      else resto.add(name);
    }
  }

  Array.from(enRiesgo).forEach((name) => resto.delete(name));

  return [...Array.from(enRiesgo), ...Array.from(resto).sort((a, b) => a.localeCompare(b, "es"))];
}

function SemáforoAreaCard({ area }: { area: DirectorIaMejoraContinuaArea }) {
  const s = ESTATUS_STYLES[area.estatus];
  return (
    <div
      className={`rounded-lg border ${s.ring} ${s.bg} p-3 flex flex-col gap-2 min-h-[7.5rem]`}
      title={`${area.area}: ${area.estatus}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-200 leading-snug">{area.area}</p>
        <span className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${s.dot} mt-0.5`} aria-hidden />
      </div>
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${s.text}`}>{s.label}</p>
      <p className="text-[10px] text-slate-400 mt-auto">
        {area.evidencias_mes} evidencia{area.evidencias_mes === 1 ? "" : "s"} en el mes
      </p>
    </div>
  );
}

export function DirectorIaMejoraContinuaPanel({
  data,
  error,
  loading,
}: {
  data: DirectorIaMejoraContinuaResponse | null;
  error: string | null;
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-slate-400">Cargando mejora continua…</p>;
  }

  if (error) {
    return (
      <div className="rounded border border-red-500/50 bg-red-950/30 p-3">
        <p className="text-sm font-medium text-red-300">Error</p>
        <p className="text-sm text-red-200/90 mt-1">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-slate-500 text-center">
        Indica planta, año y mes; luego pulsa «Mejora continua».
      </p>
    );
  }

  if ("enabled" in data && data.enabled === false) {
    return (
      <p className="text-sm text-amber-300/90">
        Director IA deshabilitado en el servidor (ENABLE_DIRECTOR_IA).
      </p>
    );
  }

  if (!("ok" in data) || !data.ok) {
    return (
      <p className="text-sm text-red-300/90">{"error" in data ? data.error : "Error al cargar mejora continua"}</p>
    );
  }

  const { resumen, areas, year, month, planta_id } = data;
  const areasEnRiesgo = areas.filter((a) => isAreaEnRiesgo(a.estatus));
  const responsablesPrincipales = collectResponsablesPrincipales(areas);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          Planta <span className="font-mono text-slate-300">{planta_id}</span>
        </span>
        <span>
          Periodo{" "}
          <span className="font-mono text-slate-300">
            {year}-{String(month).padStart(2, "0")}
          </span>
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-600 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Cumplimiento</p>
          <p className="text-2xl font-semibold text-white mt-1 font-mono">{resumen.cumplimiento}</p>
          <p className="text-xs text-slate-400 mt-1">áreas en verde</p>
        </div>
        <div className="rounded-lg border border-slate-600 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Cumplimiento %</p>
          <p className="text-2xl font-semibold text-emerald-300 mt-1 font-mono">{resumen.cumplimiento_pct}%</p>
        </div>
        <div className="rounded-lg border border-slate-600 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Semáforo global</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs font-mono">
            <span className="text-emerald-300">V {resumen.verdes}</span>
            <span className="text-amber-200">A {resumen.amarillas}</span>
            <span className="text-red-300">R {resumen.rojas}</span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
          Semáforo — 5 áreas estratégicas
        </p>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {areas.map((a) => (
            <SemáforoAreaCard key={a.area} area={a} />
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-amber-700/40 bg-amber-950/15 p-4 space-y-3">
        <p className="text-sm font-medium text-amber-100/95">Áreas en riesgo</p>
        {areasEnRiesgo.length === 0 ? (
          <p className="text-sm text-emerald-300/90">Ninguna — todas las áreas están en verde.</p>
        ) : (
          <ul className="space-y-2">
            {areasEnRiesgo.map((a) => {
              const s = ESTATUS_STYLES[a.estatus];
              return (
                <li
                  key={a.area}
                  className="flex flex-wrap items-center gap-2 text-sm border-b border-slate-700/60 pb-2 last:border-0 last:pb-0"
                >
                  <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${s.ring} ${s.bg} ${s.text}`}>
                    {a.estatus}
                  </span>
                  <span className="text-slate-200 font-medium">{a.area}</span>
                  <span className="text-xs text-slate-400">
                    {a.acciones_abiertas} abiertas
                    {a.acciones_vencidas > 0 ? ` · ${a.acciones_vencidas} vencidas` : ""}
                    {a.evidencias_mes === 0 ? " · sin evidencia en el mes" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-600 bg-slate-900/40 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-200">Responsables principales</p>
        {responsablesPrincipales.length === 0 ? (
          <p className="text-sm text-slate-500">Sin responsables asignados en las 5 áreas.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {responsablesPrincipales.map((name) => {
              const enRiesgo = areas.some(
                (a) => isAreaEnRiesgo(a.estatus) && a.responsables.includes(name)
              );
              return (
                <li
                  key={name}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    enRiesgo
                      ? "border-amber-600/60 bg-amber-950/30 text-amber-100"
                      : "border-slate-600 bg-slate-800/80 text-slate-300"
                  }`}
                >
                  {name}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[10px] text-slate-500">
          Destacados en ámbar si participan en un área en riesgo (amarillo o rojo).
        </p>
      </div>
    </div>
  );
}
