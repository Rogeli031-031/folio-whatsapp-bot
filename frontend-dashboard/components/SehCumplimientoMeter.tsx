"use client";

import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["700"],
});

type Props = {
  pct: number;
  complying: number;
  total: number;
  loading?: boolean;
};

/** Indicador digital estilo display verde (cumplimiento %). */
export default function SehCumplimientoMeter({ pct, complying, total, loading }: Props) {
  const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, Math.round(pct))) : 0;
  const digits = String(safePct).padStart(3, "0");

  return (
    <div
      className="flex w-[7.5rem] flex-shrink-0 flex-col items-center justify-center rounded-xl border border-slate-600 bg-black px-2 py-2 shadow-inner"
      title={`${complying} de ${total} puntos en cumplimiento`}
    >
      <div className="text-[9px] uppercase tracking-wider text-slate-500">Cumple</div>
      <div
        className={`${orbitron.className} text-[1.85rem] leading-none tracking-wider`}
        style={{
          color: "#39FF14",
          textShadow: "0 0 6px rgba(57,255,20,0.85), 0 0 14px rgba(57,255,20,0.45)",
        }}
      >
        {loading ? "---" : digits}
        <span className="ml-0.5 text-[1.1rem]">%</span>
      </div>
      <div className="mt-1 text-[10px] tabular-nums text-slate-400">
        {loading ? "…" : `${complying}/${total}`}
      </div>
    </div>
  );
}
