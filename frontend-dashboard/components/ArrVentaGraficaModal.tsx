"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchArrVentaSerie,
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

function fmtMoney(n: number): string {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  });
}

function fmtFechaLarga(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  if (!y || !m || !d) return fecha;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtLabelFecha(fecha: string, range: ArrVentaSerieRange): string {
  const [y, m, d] = fecha.split("-").map(Number);
  if (!y || !m || !d) return fecha;
  if (range === "1d" || range === "5d" || range === "1m") {
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
  }
  if (range === "3m" || range === "ytd" || range === "1a") {
    return `${String(m).padStart(2, "0")}/${String(y).slice(2)}`;
  }
  return `${m}/${String(y).slice(2)}`;
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

export default function ArrVentaGraficaModal({ token, empresa, onClose }: Props) {
  const [range, setRange] = useState<ArrVentaSerieRange>("1m");
  const [canal, setCanal] = useState<"casa" | "comisionista">("casa");
  const [points, setPoints] = useState<ArrVentaSeriePoint[]>([]);
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
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message || "Error al cargar la serie");
        setPoints([]);
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
    const W = 960;
    const H = 420;
    const padL = 56;
    const padR = 24;
    const padT = 24;
    const padB = 44;
    const vals = series.map((s) => s.ton);
    const minV = vals.length ? Math.min(...vals) : 0;
    const maxV = vals.length ? Math.max(...vals) : 1;
    const span = Math.max(maxV - minV, 0.01);
    const yMin = Math.max(0, minV - span * 0.08);
    const yMax = maxV + span * 0.08;
    const ySpan = Math.max(yMax - yMin, 0.01);
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const pts = series.map((s, i) => {
      const x =
        series.length <= 1 ? padL + innerW / 2 : padL + (i / (series.length - 1)) * innerW;
      const y = padT + (1 - (s.ton - yMin) / ySpan) * innerH;
      return { x, y, ...s };
    });
    const ticks = 5;
    const yTicks = Array.from({ length: ticks }, (_, i) => {
      const v = yMin + (ySpan * i) / (ticks - 1);
      const y = padT + (1 - (v - yMin) / ySpan) * innerH;
      return { v, y };
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
    return { W, H, padL, padR, padT, padB, pts, yTicks, xLabels, yMin, yMax };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-2xl">
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
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#f8fafc] p-3">
          {loading && <p className="p-4 text-sm text-slate-600">Cargando serie…</p>}
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {!loading && !error && series.length === 0 && (
            <p className="p-4 text-sm text-slate-600">No hay datos de venta diaria para este rango.</p>
          )}
          {!loading && !error && series.length > 0 && (
            <div className="relative w-full">
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
                {/* hit areas */}
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
                  <div className="mt-1 text-[11px] text-slate-500">{fmtFechaLarga(active.fecha)}</div>
                </div>
              )}
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
