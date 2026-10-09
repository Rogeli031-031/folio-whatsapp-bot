"use client";

import { useEffect, useState } from "react";
import { fetchIgfDiarioSemanal, type IgfDiarioSemanalAllResponse } from "@/lib/api";
import { WEEKLY_ROWS, fmtValue, tone, weekLabel } from "@/lib/igf-diario-weekly-rows";

export default function IgfDiarioWeeklyAllPlantsPanel({
  token,
  year,
  month,
  uploadDay,
  versionAsOfCorte,
}: {
  token: string;
  year: number;
  month: number;
  uploadDay?: string | null;
  versionAsOfCorte?: boolean;
}) {
  const [anchor, setAnchor] = useState((uploadDay || "").trim());
  const [data, setData] = useState<IgfDiarioSemanalAllResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAnchor((uploadDay || "").trim());
  }, [year, month, uploadDay]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    fetchIgfDiarioSemanal({
      token,
      year,
      month,
      todas: true,
      weekAnchor: anchor,
      uploadDay,
      versionAsOfCorte,
    })
      .then((payload) => {
        if (!cancel && payload && "plants" in payload) setData(payload);
      })
      .catch((err: Error) => {
        if (!cancel) setError(err.message || "No se pudo cargar la semana");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [token, year, month, anchor, uploadDay, versionAsOfCorte]);

  const estado = data?.week.estado === "proyectada" ? "PROYECTADA" : data?.week.estado === "parcial" ? "PARCIAL" : "REAL";
  const plants = data?.plants || [];

  return (
    <section className="mt-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium text-slate-100">IGF Diario semanal · Todas</h3>
        {data && <span className="rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-100">{estado}</span>}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!data?.nav.prev_enabled}
          onClick={() => data && setAnchor(data.nav.prev_anchor)}
          className="rounded bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          ◀ Semana anterior
        </button>
        <div className="min-w-0 text-sm font-medium text-slate-100">
          {data ? weekLabel(data.week.week_number, data.week.fecha_desde, data.week.fecha_hasta) : "Semana"}
        </div>
        <button
          type="button"
          disabled={!data?.nav.next_enabled}
          onClick={() => data && setAnchor(data.nav.next_anchor)}
          className="rounded bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          Semana siguiente ▶
        </button>
      </div>
      {loading && <p className="text-sm text-slate-400">Cargando semana…</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="overflow-x-auto rounded border border-slate-700">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-slate-900/80 text-xs font-semibold text-slate-300">
              <th className="sticky left-0 z-20 min-w-[220px] bg-slate-900 px-3 py-2 text-left">Concepto</th>
              {data?.resumen && (
                <th data-resumen="1" className="min-w-[150px] bg-sky-950 px-3 py-2 text-right text-sky-100">
                  RESUMEN SEMANAL
                </th>
              )}
              {plants.map((plant) => (
                <th key={plant.plant_code} className="min-w-[120px] px-3 py-2 text-right">
                  {plant.empresa}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKLY_ROWS.map((row) => {
              const band = row.strongest ? "bg-amber-900/30" : row.highlight ? "bg-amber-950/25" : "";
              return (
                <tr
                  key={row.key}
                  data-row-key={row.key}
                  data-highlight={row.highlight ? "1" : "0"}
                  data-strongest={row.strongest ? "1" : "0"}
                  data-separator={row.separatorBefore ? "1" : "0"}
                  className={band}
                >
                  <th
                    className={`sticky left-0 z-10 px-3 text-left font-medium text-slate-100 ${row.separatorBefore ? "border-t-4 border-slate-400 py-3" : "border-t border-slate-700 py-2"} ${row.strongest ? "bg-amber-800/50" : row.highlight ? "bg-amber-900/45" : "bg-slate-800"}`}
                  >
                    {row.label}
                  </th>
                  {data?.resumen && (
                    <td
                      data-resumen="1"
                      className={`bg-sky-950/40 px-3 text-right tabular-nums text-sky-50 ${row.separatorBefore ? "border-t-4 border-slate-400 py-3" : "border-t border-slate-700 py-2"} ${tone(row.key, data.resumen.metrics[row.key])} ${row.strongest ? "text-base font-semibold" : ""}`}
                    >
                      {fmtValue(data.resumen.metrics[row.key], row.unit)}
                    </td>
                  )}
                  {plants.map((plant) => {
                    const value = plant.metrics[row.key];
                    return (
                      <td
                        key={`${row.key}-${plant.plant_code}`}
                        className={`px-3 text-right tabular-nums ${row.separatorBefore ? "border-t-4 border-slate-400 py-3" : "border-t border-slate-700 py-2"} ${tone(row.key, value)} ${row.strongest ? "text-base font-semibold" : ""}`}
                      >
                        {fmtValue(value, row.unit)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
