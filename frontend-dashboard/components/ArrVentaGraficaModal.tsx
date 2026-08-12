"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchArrVentaSerie,
  type ArrVentaClienteTop,
  type ArrVentaSerieCanal,
  type ArrVentaSeriePoint,
  type ArrVentaSerieRange,
} from "@/lib/api";

const RANGOS: { id: ArrVentaSerieRange; label: string }[] = [
  { id: "1d", label: "1D" },
  { id: "5d", label: "5D" },
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "ytd", label: "YTD" },
  { id: "1a", label: "1A" },
  { id: "5a", label: "5A" },
  { id: "todo", label: "Todo" },
];

type Props = {
  token: string;
  empresa: string;
  onClose: () => void;
};

function fmtTon(n: number): string {
  return n.toLocaleString("es-MX", { maximumFractionDigits: 2 });
}

function fmtTonSigned(n: number): string {
  const abs = fmtTon(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `-${abs}`;
  return abs;
}

function fmtMoney(n: number): string {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  });
}

function fmtFechaLarga(fecha: string): string {
  const m = String(fecha || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return fecha || "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return fecha;
  return dt.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtLabelFecha(fecha: string, range: ArrVentaSerieRange): string {
  const m = String(fecha || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return fecha || "";
  const y = m[1];
  const mo = m[2];
  const d = m[3];
  if (range === "1d" || range === "5d" || range === "1m") {
    return `${d}/${mo}`;
  }
  if (range === "3m" || range === "ytd" || range === "1a") {
    return `${mo}/${y.slice(2)}`;
  }
  return `${Number(mo)}/${y.slice(2)}`;
}

function buildPath(
  points: { x: number; y: number }[],
  closeBottom: boolean,
  width: number,
  height: number,
  padB: number
): string {
  if (!points.length) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  if (closeBottom && points.length) {
    const last = points[points.length - 1];
    const first = points[0];
    d += ` L ${last.x} ${height - padB} L ${first.x} ${height - padB} Z`;
  }
  return d;
}

function linearTrend(values: number[]): { a: number; b: number } | null {
  const n = values.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}

function tipoLabel(tipo: string): string {
  if (tipo === "nuevo") return "Nuevo";
  if (tipo === "perdido") return "Dejó de comprar";
  if (tipo === "disminucion") return "Disminuyó";
  if (tipo === "aumento") return "Aumentó";
  return tipo;
}

function tipoClass(tipo: string): string {
  if (tipo === "nuevo") return "bg-emerald-100 text-emerald-800";
  if (tipo === "perdido") return "bg-rose-100 text-rose-800";
  if (tipo === "disminucion") return "bg-amber-100 text-amber-900";
  return "bg-sky-100 text-sky-800";
}

export default function ArrVentaGraficaModal({ token, empresa, onClose }: Props) {
  const [range, setRange] = useState<ArrVentaSerieRange>("1m");
  const [canal, setCanal] = useState<"casa" | "comisionista">("casa");
  const [points, setPoints] = useState<ArrVentaSeriePoint[]>([]);
  const [clientesTop, setClientesTop] = useState<ArrVentaClienteTop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const canalApi: ArrVentaSerieCanal = canal;
    fetchArrVentaSerie(token, { empresa, range, canal: canalApi })
      .then((data) => {
        if (cancelled) return;
        setPoints(data.points || []);
        setClientesTop(data.clientes_top || []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message || "Error al cargar la serie");
        setPoints([]);
        setClientesTop([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, empresa, range, canal]);

  const series = useMemo(() => {
    return (points || []).map((p) => ({
      fecha: p.fecha,
      ton: Number(p.venta_ton) || 0,
      descuento: Number(p.descuento_mxn) || 0,
    }));
  }, [points]);

  useEffect(() => {
    setSelectedIdx(null);
    setHoverIdx(null);
  }, [range, canal, empresa]);

  const chart = useMemo(() => {
    const W = 980;
    const H = 460;
    const padL = 56;
    const padR = 24;
    const padT = 28;
    const padB = 44;
    const vals = series.map((s) => s.ton);
    const trend = linearTrend(vals);
    const trendVals =
      trend && vals.length >= 2 ? [trend.a, trend.a + trend.b * (vals.length - 1)] : [];
    const allForScale = [...vals, ...trendVals];
    const minV = allForScale.length ? Math.min(...allForScale) : 0;
    const maxV = allForScale.length ? Math.max(...allForScale) : 1;
    const span = Math.max(maxV - minV, 0.01);
    const yMin = Math.max(0, minV - span * 0.08);
    const yMax = maxV + span * 0.08;
    const ySpan = Math.max(yMax - yMin, 0.01);
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const yOf = (ton: number) => padT + (1 - (ton - yMin) / ySpan) * innerH;
    const pts = series.map((s, i) => {
      const x =
        series.length <= 1 ? padL + innerW / 2 : padL + (i / (series.length - 1)) * innerW;
      return { x, y: yOf(s.ton), ...s };
    });
    let trendLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
    if (trend && pts.length >= 2) {
      trendLine = {
        x1: pts[0].x,
        y1: yOf(trend.a),
        x2: pts[pts.length - 1].x,
        y2: yOf(trend.a + trend.b * (pts.length - 1)),
      };
    }
    const ticks = 5;
    const yTicks = Array.from({ length: ticks }, (_, i) => {
      const v = yMin + (ySpan * i) / (ticks - 1);
      return { v, y: yOf(v) };
    });
    const xLabelCount = Math.min(8, series.length);
    const xLabels: { i: number; label: string; x: number }[] = [];
    if (series.length) {
      for (let k = 0; k < xLabelCount; k++) {
        const i =
          xLabelCount === 1 ? 0 : Math.round((k * (series.length - 1)) / (xLabelCount - 1));
        xLabels.push({
          i,
          label: fmtLabelFecha(series[i].fecha, range),
          x: pts[i].x,
        });
      }
    }
    return { W, H, padL, padR, padT, padB, pts, yTicks, xLabels, trendLine };
  }, [series, range]);

  const lineColor = canal === "casa" ? "#ca8a04" : "#38bdf8";
  const fillId = canal === "casa" ? "arrFillCasa" : "arrFillComi";
  const linePath = buildPath(
    chart.pts.map((p) => ({ x: p.x, y: p.y })),
    false,
    chart.W,
    chart.H,
    chart.padB
  );
  const areaPath = buildPath(
    chart.pts.map((p) => ({ x: p.x, y: p.y })),
    true,
    chart.W,
    chart.H,
    chart.padB
  );
  const activeIdx = selectedIdx != null ? selectedIdx : hoverIdx;
  const active = activeIdx != null ? chart.pts[activeIdx] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-white">Gráfica · Toneladas de venta</h2>
            <p className="text-xs text-slate-400">
              {empresa} · eje Y: toneladas · eje X: tiempo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
          >
            Cerrar
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-2">
          <span className="text-xs text-slate-500">Canal:</span>
          <button
            type="button"
            onClick={() => setCanal("casa")}
            className={`rounded px-3 py-1.5 text-xs font-semibold ${
              canal === "casa"
                ? "bg-yellow-600/90 text-yellow-50"
                : "bg-slate-800 text-yellow-200/80 hover:bg-slate-700"
            }`}
          >
            Venta CASA
          </button>
          <button
            type="button"
            onClick={() => setCanal("comisionista")}
            className={`rounded px-3 py-1.5 text-xs font-semibold ${
              canal === "comisionista"
                ? "bg-sky-600/90 text-sky-50"
                : "bg-slate-800 text-sky-200/80 hover:bg-slate-700"
            }`}
          >
            Venta COMISIONISTA
          </button>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="inline-block h-0.5 w-4 rounded bg-emerald-500" />
            Línea de tendencia
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#f8fafc] p-3">
          {loading && <p className="p-4 text-sm text-slate-600">Cargando serie…</p>}
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {!loading && !error && series.length === 0 && (
            <p className="p-4 text-sm text-slate-600">No hay datos de venta diaria para este rango.</p>
          )}
          {!loading && !error && series.length > 0 && (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
              <div className="relative min-w-0 flex-1">
                <svg
                  viewBox={`0 0 ${chart.W} ${chart.H}`}
                  className="h-auto w-full"
                  role="img"
                  aria-label="Gráfica de toneladas de venta"
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  <defs>
                    <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {chart.yTicks.map((t) => (
                    <g key={`y-${t.v}`}>
                      <line
                        x1={chart.padL}
                        x2={chart.W - chart.padR}
                        y1={t.y}
                        y2={t.y}
                        stroke="#cbd5e1"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={chart.padL - 8}
                        y={t.y + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="#64748b"
                      >
                        {fmtTon(t.v)}
                      </text>
                    </g>
                  ))}
                  {areaPath && <path d={areaPath} fill={`url(#${fillId})`} />}
                  {linePath && (
                    <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.5" />
                  )}
                  {chart.trendLine && (
                    <g>
                      <line
                        x1={chart.trendLine.x1}
                        y1={chart.trendLine.y1}
                        x2={chart.trendLine.x2}
                        y2={chart.trendLine.y2}
                        stroke="#16a34a"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <text
                        x={chart.trendLine.x2}
                        y={chart.trendLine.y2 - 8}
                        textAnchor="end"
                        fontSize="11"
                        fontWeight="600"
                        fill="#15803d"
                      >
                        Tendencia
                      </text>
                    </g>
                  )}
                  {chart.pts.length > 0 && (
                    <circle
                      cx={chart.pts[chart.pts.length - 1].x}
                      cy={chart.pts[chart.pts.length - 1].y}
                      r="4.5"
                      fill={lineColor}
                    />
                  )}
                  {chart.xLabels.map((lab) => (
                    <text
                      key={`x-${lab.i}-${lab.label}`}
                      x={lab.x}
                      y={chart.H - 14}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#475569"
                    >
                      {lab.label}
                    </text>
                  ))}
                  {chart.pts.map((p, i) => (
                    <rect
                      key={`hit-${p.fecha}`}
                      x={p.x - (chart.pts.length > 1 ? chart.W / chart.pts.length / 2 : 20)}
                      y={chart.padT}
                      width={chart.pts.length > 1 ? chart.W / chart.pts.length : 40}
                      height={chart.H - chart.padT - chart.padB}
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoverIdx(i)}
                      onClick={() => setSelectedIdx((prev) => (prev === i ? null : i))}
                    />
                  ))}
                  {active && (
                    <g>
                      <line
                        x1={active.x}
                        x2={active.x}
                        y1={chart.padT}
                        y2={chart.H - chart.padB}
                        stroke="#94a3b8"
                        strokeDasharray="3 3"
                      />
                      <circle
                        cx={active.x}
                        cy={active.y}
                        r="5"
                        fill={lineColor}
                        stroke="#fff"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                </svg>
                {active && (
                  <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 shadow-md">
                    <div className="text-base font-semibold tabular-nums">
                      {fmtTon(active.ton)}{" "}
                      <span className="text-sm font-medium text-slate-500">ton</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      Venta del día · {canal === "casa" ? "CASA" : "COMISIONISTA"}
                    </div>
                    <div className="mt-1 text-xs text-slate-700">
                      Descuento:{" "}
                      <strong className="tabular-nums">{fmtMoney(active.descuento)}</strong>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {fmtFechaLarga(active.fecha)}
                    </div>
                  </div>
                )}
              </div>

              <aside className="w-full shrink-0 rounded-lg border border-slate-200 bg-white p-3 lg:w-[300px]">
                <h3 className="text-sm font-semibold text-slate-800">Top 6 clientes · Δ venta</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  Vs periodo previo del mismo largo · {canal === "casa" ? "CASA" : "COMISIONISTA"}
                </p>
                {clientesTop.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">Sin cambios relevantes en el rango.</p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {clientesTop.map((c, idx) => (
                      <li
                        key={`${c.cliente}-${idx}`}
                        className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-slate-800" title={c.cliente}>
                              {idx + 1}. {c.cliente}
                            </div>
                            <span
                              className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${tipoClass(
                                String(c.tipo)
                              )}`}
                            >
                              {tipoLabel(String(c.tipo))}
                            </span>
                          </div>
                          <div
                            className={`shrink-0 text-right text-sm font-bold tabular-nums ${
                              c.delta_ton < 0 ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {fmtTonSigned(c.delta_ton)}
                            <div className="text-[10px] font-medium text-slate-500">ton</div>
                          </div>
                        </div>
                        <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
                          <span>Prev: {fmtTon(c.venta_ton_prev)}</span>
                          <span>Actual: {fmtTon(c.venta_ton_actual)}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </aside>

              <aside className="w-full shrink-0 rounded-lg border border-slate-200 bg-white p-3 lg:w-[340px]">
                <h3 className="text-sm font-semibold text-slate-800">Últimos comentarios</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  Delta Ingreso Cliente Forecast · 2 más recientes por cliente
                </p>
                {clientesTop.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">Sin clientes en el top.</p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {clientesTop.map((c, idx) => {
                      const comments = Array.isArray(c.comentarios) ? c.comentarios : [];
                      return (
                        <li
                          key={`com-${c.cliente}-${idx}`}
                          className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2"
                        >
                          <div className="truncate text-[11px] font-semibold text-slate-700" title={c.cliente}>
                            {idx + 1}. {c.cliente}
                          </div>
                          {comments.length === 0 ? (
                            <p className="mt-1 text-[11px] italic text-slate-400">Sin comentarios</p>
                          ) : (
                            <ul className="mt-1.5 space-y-1.5">
                              {comments.slice(0, 2).map((com, j) => (
                                <li key={`c-${idx}-${j}`} className="border-l-2 border-sky-300 pl-2">
                                  <p className="text-[11px] leading-snug text-slate-700">
                                    {String(com.body || "").trim() || "—"}
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    {[com.created_at, com.author_name].filter(Boolean).join(" · ") || "—"}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </aside>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1 border-t border-slate-700 bg-slate-950/60 px-3 py-2">
          {RANGOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                range === r.id
                  ? "bg-slate-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
