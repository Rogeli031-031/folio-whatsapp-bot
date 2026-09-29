"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchIgfDiarioGrafica, type IgfDiarioGraficaResponse } from "@/lib/api";

const RANGOS = [
  { id: "1d", label: "1D" },
  { id: "5d", label: "5D" },
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "ytd", label: "YTD" },
  { id: "1a", label: "1A" },
  { id: "5a", label: "5A" },
  { id: "todo", label: "Todo" },
] as const;

type RangeId = (typeof RANGOS)[number]["id"];
type Metric = "mxn" | "per_kg";

type Props = {
  token: string;
  year: number;
  month: number;
  uploadDay?: string | null;
  versionAsOfCorte?: boolean;
  plantCode?: string | null;
  todas: boolean;
  scopeLabel: string;
  excelUrl: string;
  onClose: () => void;
};

function linearTrendIndexed(pairs: { x: number; y: number }[]): { a: number; b: number; xFirst: number; xLast: number } | null {
  const usable = pairs.filter((pair) => Number.isFinite(pair.x) && Number.isFinite(pair.y));
  const n = usable.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const pair of usable) {
    sumX += pair.x;
    sumY += pair.y;
    sumXY += pair.x * pair.y;
    sumXX += pair.x * pair.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const xs = usable.map((pair) => pair.x);
  return { a, b, xFirst: Math.min(...xs), xLast: Math.max(...xs) };
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

function fmtPerKg(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg`;
}

function fmtDescKg(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${Math.abs(n).toLocaleString("es-MX", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}/kg`;
}

function fmtKg(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("es-MX")} kg`;
}

function fmtFecha(fecha: string): string {
  const match = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return fecha;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtIngreso(fecha: string): string {
  const match = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return fecha;
  return `${match[3]}/${match[2]}`;
}

export default function IgfDiarioGraficaModal({
  token,
  year,
  month,
  uploadDay,
  versionAsOfCorte,
  plantCode,
  todas,
  scopeLabel,
  excelUrl,
  onClose,
}: Props) {
  const [metric, setMetric] = useState<Metric>("mxn");
  const [range, setRange] = useState<RangeId>("1m");
  const [data, setData] = useState<IgfDiarioGraficaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    let cancel = false;
    setError(null);
    fetchIgfDiarioGrafica({
      token,
      year,
      month,
      range,
      uploadDay,
      versionAsOfCorte,
      plantCode: todas ? null : plantCode,
      todas,
    })
      .then((payload) => {
        if (!cancel) setData(payload);
      })
      .catch((err: Error) => {
        if (!cancel) setError(err.message || "No se pudo cargar la gráfica");
      });
    return () => {
      cancel = true;
    };
  }, [token, year, month, range, uploadDay, versionAsOfCorte, plantCode, todas]);

  const chart = useMemo(() => {
    const points = data?.points || [];
    const W = 760;
    const H = 380;
    const padL = 64;
    const padR = 16;
    const padT = 16;
    const padB = 32;
    const valueOf = (point: IgfDiarioGraficaResponse["points"][number]) =>
      metric === "mxn" ? point.resultado_mxn : point.resultado_per_kg;
    const usable = points
      .map((point, index) => ({ point, index, value: valueOf(point) }))
      .filter((item) => typeof item.value === "number");
    const trendPairs = points.flatMap((point, index) => {
      const value = valueOf(point);
      if (point.estado !== "real" || !point.complete || typeof value !== "number") return [];
      return [{ x: index, y: value }];
    });
    const trend = linearTrendIndexed(trendPairs);
    const vals = usable.map((item) => item.value as number);
    const trendVals = trend ? [trend.a + trend.b * trend.xFirst, trend.a + trend.b * trend.xLast] : [];
    const all = [...vals, ...trendVals, 0];
    const minV = all.length ? Math.min(...all) : 0;
    const maxV = all.length ? Math.max(...all) : 1;
    const span = Math.max(maxV - minV, 0.01);
    const yMin = minV - span * 0.08;
    const yMax = maxV + span * 0.08;
    const ySpan = Math.max(yMax - yMin, 0.01);
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const yOf = (value: number) => padT + (1 - (value - yMin) / ySpan) * innerH;
    const xOf = (index: number) =>
      points.length <= 1 ? padL + innerW / 2 : padL + (index / (points.length - 1)) * innerW;
    return { W, H, padL, padT, padB, yOf, xOf, yMin, yMax, trend, points, valueOf };
  }, [data, metric]);

  const maxClients = Math.max(1, ...(data?.new_clients_chart || []).map((item) => item.count));
  const metricLabel = metric === "mxn" ? "$" : "$/kg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-2xl">
        <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3">
          <h2 className="text-base font-semibold text-white">Gráfica · Rentabilidad IGF Diario</h2>
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-center">
            <div className="text-3xl font-black tracking-[0.12em] text-sky-300 sm:text-4xl">
              {scopeLabel}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.open(excelUrl, "_blank", "noopener,noreferrer")}
              className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
            >
              Descargar Excel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>Métrica {metricLabel}:</span>
            {(["mxn", "per_kg"] as Metric[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setMetric(id)}
                className={`rounded px-2 py-1 ${metric === id ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300"}`}
              >
                {id === "mxn" ? "$" : "$/kg"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1"><span className="h-0.5 w-5 bg-sky-400" /> Real</span>
            <span className="inline-flex items-center gap-1"><span className="h-0.5 w-5 border-t border-dashed border-amber-300" /> Proyectado</span>
            <span className="inline-flex items-center gap-1"><span className="h-0.5 w-5 bg-white" /> Tendencia real</span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="h-[380px] w-full">
              <line
                x1={chart.padL}
                x2={chart.W - 16}
                y1={chart.yOf(0)}
                y2={chart.yOf(0)}
                stroke="#e2e8f0"
                strokeWidth={1.5}
              />
              {/* línea de cero */}
              {chart.points.map((point, index) => {
                const value = chart.valueOf(point);
                if (typeof value !== "number" || index === 0) return null;
                const prev = chart.points[index - 1];
                const prevValue = chart.valueOf(prev);
                if (typeof prevValue !== "number" || prev.estado !== point.estado) return null;
                return (
                  <line
                    key={point.fecha}
                    x1={chart.xOf(index - 1)}
                    y1={chart.yOf(prevValue)}
                    x2={chart.xOf(index)}
                    y2={chart.yOf(value)}
                    stroke={point.estado === "proyectado" ? "#fcd34d" : "#38bdf8"}
                    strokeDasharray={point.estado === "proyectado" ? "5 4" : undefined}
                    strokeWidth={2}
                    opacity={point.complete && prev.complete ? 1 : 0.4}
                  />
                );
              })}
              {chart.trend && (
                <line
                  x1={chart.xOf(chart.trend.xFirst)}
                  y1={chart.yOf(chart.trend.a + chart.trend.b * chart.trend.xFirst)}
                  x2={chart.xOf(chart.trend.xLast)}
                  y2={chart.yOf(chart.trend.a + chart.trend.b * chart.trend.xLast)}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              )}
              {chart.points.map((point, index) => {
                const value = chart.valueOf(point);
                if (typeof value !== "number") return null;
                return (
                  <circle
                    key={`${point.fecha}-p`}
                    cx={chart.xOf(index)}
                    cy={chart.yOf(value)}
                    r={point.complete ? 3 : 4}
                    fill={point.complete ? "#38bdf8" : "#f59e0b"}
                    opacity={point.complete ? 1 : 0.55}
                    onMouseEnter={() => setHover(index)}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
            </svg>
            {hover != null && chart.points[hover] && (
              <div className="mt-2 rounded border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200">
                <div className="font-medium text-white">{fmtFecha(chart.points[hover].fecha)}</div>
                <div>Resultado: {fmtMoney(chart.points[hover].resultado_mxn)}</div>
                <div>Resultado/kg: {fmtPerKg(chart.points[hover].resultado_per_kg)}</div>
                <div>Venta: {fmtKg(chart.points[hover].venta_kg)}</div>
                <div>Estado: {chart.points[hover].estado === "proyectado" ? "Proyectado" : "Real"}</div>
                <div>Cobertura: {chart.points[hover].complete ? "Completa" : "Incompleta"}</div>
                {!chart.points[hover].complete && (chart.points[hover].missing_components || []).length > 0 && (
                  <div>Falta: {chart.points[hover].missing_components.join(", ")}</div>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {(data?.weeks || []).map((week) => (
                <div key={`${week.label}-${week.fecha_desde}`} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">
                  <div className="text-slate-400">{week.label}{week.estado === "mixto" ? " · Mixta" : ""}</div>
                  <div className="text-base font-semibold text-white">
                    {metric === "mxn" ? fmtMoney(week.resultado_mxn) : fmtPerKg(week.resultado_per_kg)}
                  </div>
                  <div>{fmtMoney(week.resultado_mxn)} · {fmtPerKg(week.resultado_per_kg)}</div>
                  {!week.complete && <div className="text-amber-300">Cobertura incompleta</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded border border-slate-700 p-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Clientes nuevos</div>
              <div className="flex h-36 items-end gap-1">
                {(data?.new_clients_chart || []).map((item) => (
                  <div key={item.label} className="group flex flex-1 flex-col items-center justify-end" title={`${item.label}: ${item.count} clientes nuevos, ${fmtKg(item.kg)} captados`}>
                    <div
                      className="w-full rounded-t bg-emerald-500"
                      style={{ height: `${Math.max(4, (item.count / maxClients) * 120)}px` }}
                    />
                    <div className="mt-1 text-[10px] text-slate-400">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Top 10 nuevos</div>
              <ol className="space-y-1 text-xs text-slate-200">
                {(data?.new_clients_top || []).map((item, index) => (
                  <li key={`${item.planta}-${item.cliente}-${item.fecha_ingreso}`}>
                    <span className="font-medium text-white">
                      {index + 1}. {todas && item.planta ? `${item.planta} · ` : ""}{item.cliente}
                    </span>
                    <div>{fmtKg(item.kg)} · Desc. {fmtDescKg(item.descuento_per_kg)} · Ingreso {fmtIngreso(item.fecha_ingreso)}</div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-t border-slate-700 px-4 py-2">
          {RANGOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              className={`rounded px-2 py-1 text-xs ${range === item.id ? "bg-slate-200 text-slate-900" : "text-slate-300"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
