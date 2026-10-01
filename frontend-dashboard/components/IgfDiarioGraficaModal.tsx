"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchIgfDiarioGrafica, type ArrVentaSerieRange, type IgfDiarioGraficaResponse } from "@/lib/api";
import ArrVentaCanalPanel from "@/components/ArrVentaCanalPanel";
import ArrVentaGraficaModal from "@/components/ArrVentaGraficaModal";

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
type CoverageSummary = {
  total_points: number;
  numeric_points: number;
  complete_points: number;
  missing_by_component: Record<string, number>;
  first_missing_date?: { fecha: string; components: string[] } | null;
  missing_by_plant?: Record<string, number>;
};
type GraficaData = IgfDiarioGraficaResponse & { coverage_summary?: CoverageSummary };
const COVERAGE_ORDER = ["VENTA", "PRECIO", "COSTO", "FLETE", "HG", "C&D", "CORPORATIVO", "OPERATIVO"];

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

const MES_ABREV = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function niceStep(span: number, targetCount: number) {
  const slots = Math.max(1, targetCount - 1);
  const rough = span / slots;
  if (!(rough > 0) || !Number.isFinite(rough)) return 1;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / mag;
  let base = 10;
  if (residual <= 1) base = 1;
  else if (residual <= 2) base = 2;
  else if (residual <= 2.5) base = 2.5;
  else if (residual <= 5) base = 5;
  return base * mag;
}

function buildNiceYTicks(yMin: number, yMax: number, _metric: Metric, targetCount = 5) {
  let lo = Math.min(yMin || 0, yMax || 0, 0);
  let hi = Math.max(yMin || 0, yMax || 0, 0);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const step = niceStep(hi - lo, targetCount);
  const start = Math.floor(lo / step + 1e-9) * step;
  const end = Math.ceil(hi / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step * 0.5; value += step) {
    const clean = Number((Math.round(value / step) * step).toPrecision(12));
    if (!ticks.length || Math.abs(ticks[ticks.length - 1] - clean) > step * 1e-6) ticks.push(clean);
  }
  if (!ticks.some((tick) => Math.abs(tick) < step * 1e-6)) ticks.push(0);
  ticks.sort((a, b) => a - b);
  return ticks;
}

function formatXLabel(fecha: string, range: string) {
  const match = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(fecha || "");
  const mon = MES_ABREV[Number(match[2]) - 1] || match[2];
  const id = String(range || "1m").trim().toLowerCase();
  if (id === "3m") return `${match[3]} ${mon}`;
  if (id === "ytd" || id === "1a" || id === "5a" || id === "todo") return `${mon} ${match[1].slice(2)}`;
  return `${match[3]}/${match[2]}`;
}

function buildXAxisTicks(points: { fecha: string }[], range: string, maxTicks = 7) {
  const n = points.length;
  if (!n) return [] as { index: number; fecha: string; label: string }[];
  const limit = Math.max(1, maxTicks);
  const indexes: number[] = [];
  if (n === 1 || limit === 1) indexes.push(0);
  else {
    const count = Math.min(limit, n);
    for (let i = 0; i < count; i += 1) indexes.push(Math.round((i * (n - 1)) / (count - 1)));
  }
  const uniqueIdx: number[] = [];
  for (const index of indexes) {
    if (!uniqueIdx.includes(index)) uniqueIdx.push(index);
  }
  const ticks = uniqueIdx.map((index) => ({
    index,
    fecha: points[index].fecha,
    label: formatXLabel(points[index].fecha, range),
  }));
  const seen = new Set<string>();
  const kept: { index: number; fecha: string; label: string }[] = [];
  ticks.forEach((tick, i) => {
    const edge = i === 0 || i === ticks.length - 1;
    if (!edge && seen.has(tick.label)) return;
    seen.add(tick.label);
    kept.push(tick);
  });
  return kept;
}

function buildWeeklyClientTrend(chart: { label: string; tipo: "week" | "day"; count: number; kg: number }[]) {
  const weeks = chart.filter((item) => item.tipo === "week");
  const days = chart.filter((item) => item.tipo === "day");
  const sem2 = weeks.find((item) => item.label === "SEM -2") || { label: "SEM -2", count: 0, kg: 0 };
  const sem1 = weeks.find((item) => item.label === "SEM -1") || { label: "SEM -1", count: 0, kg: 0 };
  return [
    { label: "SEM -2", count: Number(sem2.count) || 0, kg: Number(sem2.kg) || 0, partial: false },
    { label: "SEM -1", count: Number(sem1.count) || 0, kg: Number(sem1.kg) || 0, partial: false },
    {
      label: "SEM ACTUAL · PARCIAL",
      count: days.reduce((sum, item) => sum + (Number(item.count) || 0), 0),
      kg: days.reduce((sum, item) => sum + (Number(item.kg) || 0), 0),
      partial: true,
    },
  ];
}

function weekGridSpan(
  points: { fecha: string }[],
  week: { fecha_desde: string; fecha_hasta: string }
) {
  let start = -1;
  let end = -1;
  points.forEach((point, index) => {
    if (point.fecha >= week.fecha_desde && point.fecha <= week.fecha_hasta) {
      if (start < 0) start = index;
      end = index;
    }
  });
  if (start < 0 || end < 0) return null;
  return { gridColumnStart: start + 1, gridColumnEnd: end + 2 };
}

function fmtYTick(value: number, metric: Metric) {
  if (metric === "per_kg") {
    const sign = value < 0 ? "-" : "";
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  }
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const kilos = abs / 1000;
    const text = Number.isInteger(kilos) ? String(kilos) : kilos.toFixed(1);
    return `${sign}$${text}k`;
  }
  return `${sign}$${Math.round(abs)}`;
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
  const [data, setData] = useState<GraficaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [arrCliente, setArrCliente] = useState<string | null>(null);
  const arrEmpresa = todas ? "Provincia" : scopeLabel;

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
    const padL = 78;
    const padR = 16;
    const padT = 16;
    const padB = 48;
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
    const yTicks = buildNiceYTicks(yMin, yMax, metric);
    const xTicks = buildXAxisTicks(points, range);
    return { W, H, padL, padT, padB, yOf, xOf, yMin, yMax, trend, points, valueOf, yTicks, xTicks };
  }, [data, metric, range]);

  const metricLabel = metric === "mxn" ? "$" : "$/kg";
  const weekSpans = (data?.weeks || [])
    .map((week) => ({ week, span: weekGridSpan(chart.points, week) }))
    .filter((item) => item.span);

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
            <span className="inline-flex items-center gap-1"><span className="h-0.5 w-5 bg-yellow-300" /> Tendencia real</span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(420px,1fr)]">
          <div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            {(data?.coverage_summary?.numeric_points ?? chart.points.filter((point) => typeof chart.valueOf(point) === "number").length) === 0 ? (
              <div className="flex h-[380px] flex-col justify-center rounded border border-slate-700 px-4 text-sm text-slate-200">
                <p className="font-medium text-white">Sin rentabilidad calculable para este periodo.</p>
                <p className="mt-2 text-amber-200">
                  Falta: {COVERAGE_ORDER
                    .map((key) => ({ key, days: data?.coverage_summary?.missing_by_component?.[key] || 0 }))
                    .filter((item) => item.days > 0)
                    .sort((a, b) => b.days - a.days || a.key.localeCompare(b.key, "es"))
                    .map((item) => `${item.key} · ${item.days} días`)
                    .join(" · ") || "sin detalle"}
                </p>
              </div>
            ) : (
            <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="h-[380px] w-full">
              {chart.yTicks.map((tick) => (
                <g key={`y-${tick}`}>
                  {Math.abs(tick) > 1e-9 && (
                    <line
                      x1={chart.padL}
                      x2={chart.W - 16}
                      y1={chart.yOf(tick)}
                      y2={chart.yOf(tick)}
                      stroke="#334155"
                      strokeWidth={1}
                    />
                  )}
                  <text x={chart.padL - 8} y={chart.yOf(tick) + 3} textAnchor="end" fill="#94a3b8" fontSize={11}>
                    {fmtYTick(tick, metric)}
                  </text>
                </g>
              ))}
              {chart.xTicks.map((tick) => (
                <text key={`x-${tick.index}`} x={chart.xOf(tick.index)} y={chart.H - 12} textAnchor="middle" fill="#94a3b8" fontSize={11}>
                  {tick.label}
                </text>
              ))}
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
                  stroke="#facc15"
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
            )}
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
            <div className="mt-3 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {chart.points.length > 0 && (
                  <div
                    className="grid gap-1"
                    style={{
                      marginLeft: `${(chart.padL / chart.W) * 100}%`,
                      marginRight: `${(16 / chart.W) * 100}%`,
                      gridTemplateColumns: `repeat(${chart.points.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {weekSpans.map(({ week, span }) => (
                      <div
                        key={`${week.label}-${week.fecha_desde}`}
                        className="rounded border border-slate-700 px-1 py-1 text-[10px] text-slate-200"
                        style={{ gridColumnStart: span?.gridColumnStart, gridColumnEnd: span?.gridColumnEnd }}
                      >
                        <div className="text-slate-400">{week.label}{week.estado === "mixto" ? " · Mixta" : ""}</div>
                        <div className="text-sm font-semibold text-white">
                          {metric === "mxn" ? fmtMoney(week.resultado_mxn) : fmtPerKg(week.resultado_per_kg)}
                        </div>
                        <div>{fmtMoney(week.resultado_mxn)} · {fmtPerKg(week.resultado_per_kg)}</div>
                        {!week.complete && <div className="text-amber-300">Cobertura incompleta</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {data?.month_close && (
                <div className="w-[180px] shrink-0 rounded border border-sky-400 bg-slate-950 px-3 py-2 text-xs text-slate-200">
                  <div className="font-semibold tracking-wide text-sky-300">{data.month_close.label}</div>
                  {!data.month_close.complete ? (
                    <>
                      <div className="text-2xl font-semibold text-white">—</div>
                      <div className="text-amber-300">Cobertura incompleta</div>
                      <div>Falta: {(data.month_close.missing_components || []).join(", ")}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-semibold text-white">
                        {metric === "mxn" ? fmtMoney(data.month_close.resultado_mxn) : fmtPerKg(data.month_close.resultado_per_kg)}
                      </div>
                      <div>
                        {metric === "mxn" ? fmtPerKg(data.month_close.resultado_per_kg) : fmtMoney(data.month_close.resultado_mxn)}
                      </div>
                      <div>Venta: {fmtKg(data.month_close.venta_kg)}</div>
                      {data.month_close.has_projection && <div>Real + proyectado</div>}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Clientes nuevos y Top 10 nuevos no se renderizan en esta vista. Tendencia semanal permanece en el backend. */}
            <ArrVentaCanalPanel
              token={token}
              empresa={arrEmpresa}
              canal="casa"
              range={range as ArrVentaSerieRange}
              provincia={todas}
              embedded
              onClienteDoubleClick={setArrCliente}
            />
            <ArrVentaCanalPanel
              token={token}
              empresa={arrEmpresa}
              canal="comisionista"
              range={range as ArrVentaSerieRange}
              provincia={todas}
              embedded
              onClienteDoubleClick={setArrCliente}
            />
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
      {arrCliente && (
        <ArrVentaGraficaModal
          token={token}
          empresa={arrEmpresa}
          mode="cliente"
          clienteNorm={arrCliente}
          provincia={todas}
          onClose={() => setArrCliente(null)}
        />
      )}
    </div>
  );
}
