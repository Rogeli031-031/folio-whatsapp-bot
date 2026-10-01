"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchArrVentaSerie,
  type ArrVentaClienteTop,
  type ArrVentaSeriePoint,
  type ArrVentaSerieRange,
} from "@/lib/api";

type Canal = "casa" | "comisionista";

type Props = {
  token: string;
  empresa: string;
  canal: Canal;
  range: ArrVentaSerieRange;
  provincia?: boolean;
  embedded?: boolean;
  showComments?: boolean;
  onClienteDoubleClick?: (cliente: string) => void;
};

function linearTrend(values: number[]): { a: number; b: number } | null {
  const n = values.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  values.forEach((y, x) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}

function fmtTon(n: number): string {
  return n.toLocaleString("es-MX", { maximumFractionDigits: 2 });
}

function fmtTonSigned(n: number): string {
  const abs = fmtTon(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `-${abs}`;
  return abs;
}

function tipoLabel(tipo: string): string {
  if (tipo === "nuevo") return "Nuevo";
  if (tipo === "perdido") return "Dejó de comprar";
  if (tipo === "disminucion") return "Disminuyó";
  if (tipo === "aumento") return "Aumentó";
  if (tipo === "sin_cambio") return "Sin cambio";
  return tipo;
}

export default function ArrVentaCanalPanel({
  token,
  empresa,
  canal,
  range,
  provincia = false,
  showComments = false,
  onClienteDoubleClick,
}: Props) {
  const [points, setPoints] = useState<ArrVentaSeriePoint[]>([]);
  const [clientesTop, setClientesTop] = useState<ArrVentaClienteTop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchArrVentaSerie(
      token,
      { empresa, range, canal, provincia },
      { signal: ctrl.signal }
    )
      .then((data) => {
        if (cancelled) return;
        setPoints(data.points || []);
        setClientesTop(data.clientes_top || []);
      })
      .catch((err: Error) => {
        if (cancelled || ctrl.signal.aborted) return;
        setError(err.message || "Error al cargar la serie");
        setPoints([]);
        setClientesTop([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [token, empresa, range, canal, provincia]);

  const chart = useMemo(() => {
    const vals = points.map((point) => Number(point.venta_ton) || 0);
    const trend = linearTrend(vals);
    const trendVals = trend ? [trend.a, trend.a + trend.b * (vals.length - 1)] : [];
    const all = [...vals, ...trendVals, 0];
    const minV = Math.min(...all);
    const maxV = Math.max(...all, 1);
    const span = Math.max(maxV - minV, 0.01);
    const yMin = minV > 0 ? minV - span * 0.08 : minV;
    const yMax = maxV + span * 0.08;
    const ySpan = Math.max(yMax - yMin, 0.01);
    const W = 320;
    const H = 120;
    const pad = 8;
    const xOf = (index: number) =>
      vals.length <= 1 ? W / 2 : pad + (index / (vals.length - 1)) * (W - pad * 2);
    const yOf = (value: number) => pad + (1 - (value - yMin) / ySpan) * (H - pad * 2);
    const line = vals.map((value, index) => `${xOf(index)},${yOf(value)}`).join(" ");
    const trendLine = trend
      ? {
          x1: xOf(0),
          y1: yOf(trend.a),
          x2: xOf(vals.length - 1),
          y2: yOf(trend.a + trend.b * (vals.length - 1)),
        }
      : null;
    return { W, H, line, trendLine };
  }, [points]);

  const lineColor = canal === "casa" ? "#ca8a04" : "#38bdf8";
  const title = canal === "casa" ? "CASA" : "COMISIONISTA";

  return (
    <section className="rounded border border-slate-700 bg-slate-950 p-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={canal === "casa" ? "font-semibold text-yellow-400" : "font-semibold text-sky-400"}>
          {title}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
          <span className="h-0.5 w-4 bg-emerald-500" /> tendencia
        </span>
      </div>
      {loading && <p className="text-xs text-slate-400">Cargando serie…</p>}
      {error && <p className="text-xs text-red-300">{error}</p>}
      {!loading && !error && points.length === 0 && (
        <p className="text-xs text-slate-500">No hay datos de venta diaria para este rango.</p>
      )}
      {!loading && !error && points.length > 0 && (
        <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="h-28 w-full" role="img" aria-label={`Gráfica de toneladas ${title}`}>
          <polyline fill="none" stroke={lineColor} strokeWidth="2" points={chart.line} />
          {chart.trendLine && (
            <line
              x1={chart.trendLine.x1}
              y1={chart.trendLine.y1}
              x2={chart.trendLine.x2}
              y2={chart.trendLine.y2}
              stroke="#16a34a"
              strokeWidth="1.5"
            />
          )}
        </svg>
      )}
      <div className="mt-2">
        <div className="text-[11px] font-semibold text-slate-200">Top 6 clientes · Δ venta</div>
        {clientesTop.length === 0 ? (
          <p className="mt-1 text-[11px] text-slate-500">Sin cambios relevantes en el rango.</p>
        ) : (
          <ol className="mt-1 space-y-1">
            {clientesTop.map((cliente, index) => (
              <li key={`${cliente.cliente}-${index}`}>
                <button
                  type="button"
                  className="w-full cursor-pointer rounded border border-slate-800 px-2 py-1 text-left text-[11px] text-slate-200 hover:border-slate-600"
                  title="Doble clic para abrir gráfica del cliente"
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    onClienteDoubleClick?.(cliente.cliente);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium text-white">
                      {index + 1}. {cliente.cliente}
                    </span>
                    <span className="shrink-0 text-slate-300">{tipoLabel(String(cliente.tipo || ""))}</span>
                  </div>
                  <div className="text-slate-400">
                    Δ {fmtTonSigned(Number(cliente.delta_ton) || 0)} ton · Prev {fmtTon(Number(cliente.venta_ton_prev) || 0)} · Actual {fmtTon(Number(cliente.venta_ton_actual) || 0)}
                  </div>
                  {showComments && (cliente.comentarios || []).slice(0, 1).map((comment) => (
                    <div key={`${comment.created_at}-${comment.body}`} className="truncate text-[10px] text-slate-500">
                      {comment.body}
                    </div>
                  ))}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
