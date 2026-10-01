"use client";

import { useEffect, useState } from "react";
import {
  fetchArrVentaSerie,
  type ArrVentaClienteTop,
  type ArrVentaSeriePoint,
  type ArrVentaSerieRange,
} from "@/lib/api";
import { ArrVentaSerieView } from "@/components/ArrVentaGraficaModal";

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

export default function ArrVentaCanalPanel({
  token,
  empresa,
  canal,
  range,
  provincia = false,
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

  const title = canal === "casa" ? "CASA" : "COMISIONISTA";

  return (
    <section className="overflow-hidden rounded border border-slate-700 bg-slate-950">
      <div className={`px-3 py-2 text-sm font-semibold ${canal === "casa" ? "text-yellow-400" : "text-sky-400"}`}>
        {title}
      </div>
      {loading && <p className="px-3 pb-3 text-xs text-slate-400">Cargando serie…</p>}
      {error && <p className="px-3 pb-3 text-xs text-red-300">{error}</p>}
      {!loading && !error && (
        <ArrVentaSerieView
          points={points}
          clientesTop={clientesTop}
          range={range}
          canal={canal}
          isCliente={false}
          clienteLabel=""
          embedded
          onClienteDoubleClick={onClienteDoubleClick}
        />
      )}
    </section>
  );
}
