"use client";

import { useEffect, useState } from "react";
import { fetchIgfDiarioSemanal, type IgfDiarioSemanalMetrics, type IgfDiarioSemanalResponse } from "@/lib/api";
import IgfDiarioGraficaModal from "@/components/IgfDiarioGraficaModal";
import { WEEKLY_ROWS, coverageLines, dayHeader, fmtValue, tone, weekLabel } from "@/lib/igf-diario-weekly-rows";

export default function IgfDiarioWeeklyPlantPanel({
  token,
  year,
  month,
  plantCode,
  empresa,
  uploadDay,
  versionAsOfCorte,
  excelUrl,
}: {
  token: string;
  year: number;
  month: number;
  plantCode: string;
  empresa: string;
  uploadDay?: string | null;
  versionAsOfCorte?: boolean;
  excelUrl: string;
}) {
  const [anchor, setAnchor] = useState((uploadDay || "").trim());
  const [data, setData] = useState<IgfDiarioSemanalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<keyof IgfDiarioSemanalMetrics>("resultado_mxn");
  const [chartOpen, setChartOpen] = useState(false);

  useEffect(() => {
    setAnchor((uploadDay || "").trim());
    setSelected("resultado_mxn");
  }, [plantCode, year, month, uploadDay]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    fetchIgfDiarioSemanal({
      token,
      year,
      month,
      plantCode,
      weekAnchor: anchor,
      uploadDay,
      versionAsOfCorte,
    })
      .then((payload) => {
        if (!cancel && payload && "metrics" in payload) setData(payload);
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
  }, [token, year, month, plantCode, anchor, uploadDay, versionAsOfCorte]);

  const selectedRow = WEEKLY_ROWS.find((row) => row.key === selected) || WEEKLY_ROWS[WEEKLY_ROWS.length - 1];
  const estado = data?.week.estado === "proyectada" ? "PROYECTADA" : data?.week.estado === "parcial" ? "PARCIAL" : "REAL";
  const days = data?.days || [];

  return (
    <section className="mt-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium text-slate-100">IGF Diario semanal · {data?.empresa || empresa}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {data && <span className="rounded bg-slate-700 px-2 py-1 font-semibold text-slate-100">{estado}</span>}
          {data && data.week.complete === false && (
            <span className="rounded bg-amber-900/60 px-2 py-1 font-semibold text-amber-200">INCOMPLETA</span>
          )}
        </div>
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
        <button
          type="button"
          onClick={() => setChartOpen(true)}
          className="rounded bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white"
        >
          Gráfica
        </button>
      </div>
      {loading && <p className="text-sm text-slate-400">Cargando semana…</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}
      {data && (data.week.missing_components || []).length > 0 && (
        <p className="mb-2 text-xs text-amber-200">Faltantes: {(data.week.missing_components || []).join(", ")}</p>
      )}
      {data && coverageLines(data.coverage || data.week.coverage).map((line) => (
        <p key={line} data-coverage="partial" className="mb-2 text-xs font-medium text-amber-100">{line}</p>
      ))}
      {data && days.some((day) => (day.missing_components || []).length > 0) && (
        <p className="mb-2 text-xs text-amber-200">
          Días incompletos: {days.filter((day) => (day.missing_components || []).length > 0).map((day) => `${dayHeader(day.fecha)} (${(day.missing_components || []).join(", ")})`).join("; ")}
        </p>
      )}
      <div className="overflow-x-auto rounded border border-slate-700">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-slate-900/80 text-xs font-semibold text-slate-300">
              <th className="sticky left-0 z-20 min-w-[220px] bg-slate-900 px-3 py-2 text-left">Concepto</th>
              <th className="sticky left-[220px] z-20 min-w-[108px] bg-slate-900 px-3 py-2 text-right">Semana</th>
              {days.map((day) => (
                <th
                  key={day.fecha}
                  className={`min-w-[96px] px-3 py-2 text-right ${day.estado === "proyectada" ? "bg-slate-950/70 text-slate-400 weekly-day-proyectado" : ""}`}
                >
                  {dayHeader(day.fecha)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKLY_ROWS.map((row) => {
              const value = data ? data.metrics[row.key] : null;
              const active = row.key === selected;
              const band = row.strongest
                ? "bg-amber-900/30"
                : row.highlight
                  ? "bg-amber-950/25"
                  : "";
              return (
                <tr
                  key={row.key}
                  data-row-key={row.key}
                  data-highlight={row.highlight ? "1" : "0"}
                  data-strongest={row.strongest ? "1" : "0"}
                  data-separator={row.separatorBefore ? "1" : "0"}
                  onClick={() => setSelected(row.key)}
                  className={`cursor-pointer ${band} ${active ? "ring-1 ring-inset ring-sky-500" : ""}`}
                >
                  <th
                    className={`sticky left-0 z-10 px-3 text-left font-medium text-slate-100 ${row.separatorBefore ? "border-t-4 border-slate-400 py-3" : "border-t border-slate-700 py-2"} ${row.strongest ? "bg-amber-800/50" : row.highlight ? "bg-amber-900/45" : "bg-slate-800"}`}
                  >
                    {row.label}
                  </th>
                  <td className={`sticky left-[220px] z-10 bg-slate-900 px-3 text-right tabular-nums ${row.separatorBefore ? "border-t-4 border-slate-400 py-3" : "border-t border-slate-700 py-2"} ${tone(row.key, value)} ${row.strongest ? "text-base font-semibold" : ""}`}>
                    {fmtValue(value, row.unit)}
                  </td>
                  {days.map((day) => {
                    const dayValue = day.metrics[row.key];
                    return (
                      <td
                        key={`${row.key}-${day.fecha}`}
                        className={`px-3 text-right tabular-nums ${row.separatorBefore ? "border-t-4 border-slate-400 py-3" : "border-t border-slate-700 py-2"} ${tone(row.key, dayValue)} ${day.estado === "proyectada" ? "bg-slate-950/40 weekly-day-proyectado" : ""} ${row.strongest ? "text-base font-semibold" : ""}`}
                      >
                        {fmtValue(dayValue, row.unit)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {chartOpen && (
        <IgfDiarioGraficaModal
          token={token}
          year={year}
          month={month}
          uploadDay={uploadDay}
          versionAsOfCorte={versionAsOfCorte}
          plantCode={plantCode}
          todas={false}
          scopeLabel={data?.empresa || empresa}
          excelUrl={excelUrl}
          seriesMetric={selectedRow.key}
          seriesLabel={selectedRow.label}
          seriesUnit={selectedRow.unit}
          weekAnchor={anchor}
          onClose={() => setChartOpen(false)}
        />
      )}
    </section>
  );
}
