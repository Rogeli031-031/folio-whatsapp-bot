"use client";

import { useEffect, useState } from "react";
import { fetchIgfDiarioSemanal, type IgfDiarioSemanalMetrics, type IgfDiarioSemanalResponse } from "@/lib/api";
import IgfDiarioGraficaModal from "@/components/IgfDiarioGraficaModal";

type Unit = "kg" | "mxn" | "per_kg";

const ROWS: { key: keyof IgfDiarioSemanalMetrics; label: string; unit: Unit }[] = [
  { key: "venta_kg", label: "Venta en kilos", unit: "kg" },
  { key: "precio_kg", label: "Precio de venta al público", unit: "per_kg" },
  { key: "ingreso_mxn", label: "Ingreso generado", unit: "mxn" },
  { key: "costo_kg", label: "Costo del Gas LP", unit: "per_kg" },
  { key: "flete_kg", label: "Flete terrestre", unit: "per_kg" },
  { key: "margen_kg", label: "Margen", unit: "per_kg" },
  { key: "gasto_corporativo_kg", label: "Gasto Corporativo", unit: "per_kg" },
  { key: "inversiones_kg", label: "Inversiones", unit: "per_kg" },
  { key: "impuestos_federales_kg", label: "Impuestos Federales", unit: "per_kg" },
  { key: "margen_neto_kg", label: "Margen Neto", unit: "per_kg" },
  { key: "presupuesto_nomina_gastos_kg", label: "Presupuesto Nómina/Gastos", unit: "per_kg" },
  { key: "presupuesto_imss_sua_kg", label: "Presupuesto IMSS/SUA", unit: "per_kg" },
  { key: "extraordinarios_kg", label: "Extraordinarios", unit: "per_kg" },
  { key: "provisiones_planta_kg", label: "Provisiones de la Planta", unit: "per_kg" },
  { key: "sobrante_antes_hg_kg", label: "Sobrante de Operación antes de HG", unit: "per_kg" },
  { key: "hg_mxn", label: "HG", unit: "mxn" },
  { key: "sobrante_con_hg_kg", label: "Sobrante de Operación con HG", unit: "per_kg" },
  { key: "com_desc_kg", label: "Comisiones y Descuentos", unit: "per_kg" },
  { key: "resultado_kg", label: "RESULTADO ($/kg)", unit: "per_kg" },
  { key: "resultado_mxn", label: "RESULTADO (Importe)", unit: "mxn" },
];

function fmtFecha(value: string): string {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function fmtValue(value: number | null, unit: Unit): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (unit === "kg") return value.toLocaleString("es-MX", { maximumFractionDigits: 0 });
  return value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tone(key: string, value: number | null): string {
  if (value == null) return "text-slate-500";
  if (value < 0) return "text-red-400";
  if ((key === "resultado_kg" || key === "resultado_mxn") && value > 0) return "text-emerald-300";
  return "text-slate-100";
}

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
        if (!cancel) setData(payload);
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

  const selectedRow = ROWS.find((row) => row.key === selected) || ROWS[ROWS.length - 1];
  const estado = data?.week.estado === "proyectada" ? "PROYECTADA" : data?.week.estado === "parcial" ? "PARCIAL" : "REAL";

  return (
    <section className="mt-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium text-slate-100">IGF Diario semanal · {data?.empresa || empresa}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {data && <span className="rounded bg-slate-700 px-2 py-1 font-semibold text-slate-100">{estado}</span>}
          {data && !data.week.complete && (
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
          {data
            ? `SEMANA ISO ${data.week.iso_week} · ${fmtFecha(data.week.fecha_desde)}–${fmtFecha(data.week.fecha_hasta)}`
            : "Semana"}
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
      {data && data.week.missing_components.length > 0 && (
        <p className="mb-2 text-xs text-amber-200">Faltantes: {data.week.missing_components.join(", ")}</p>
      )}
      <div className="overflow-hidden rounded border border-slate-700">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] bg-slate-900/80 text-xs font-semibold text-slate-300">
          <div className="px-3 py-2">Concepto</div>
          <div className="px-3 py-2 text-right">Valor semana</div>
        </div>
        {ROWS.map((row) => {
          const value = data ? data.metrics[row.key] : null;
          const active = row.key === selected;
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => setSelected(row.key)}
              className={`grid w-full grid-cols-[minmax(0,1fr)_auto] border-t border-slate-700 text-left text-sm ${active ? "bg-sky-950/70" : "bg-transparent"}`}
            >
              <span className="px-3 py-2 text-slate-200">{row.label}</span>
              <span className={`px-3 py-2 text-right tabular-nums ${tone(row.key, value)}`}>{fmtValue(value, row.unit)}</span>
            </button>
          );
        })}
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
          onClose={() => setChartOpen(false)}
        />
      )}
    </section>
  );
}
