"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
  isSehOnlyToken,
} from "@/lib/auth";
import { fetchPlantas, fetchSehCumplimiento, type SehCumplimientoResponse } from "@/lib/api";
import { SEH_AMBITOS, filterPlantasSeh, type SehAmbitoKey } from "@/lib/seh-ambitos";
import SehCumplimientoMeter from "@/components/SehCumplimientoMeter";

function SehHomeContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [plantas, setPlantas] = useState<{ id: number; nombre: string }[]>([]);
  const [selectedPlantaId, setSelectedPlantaId] = useState<number | undefined>(undefined);
  const [cumplimiento, setCumplimiento] = useState<SehCumplimientoResponse | null>(null);
  const [cumplimientoLoading, setCumplimientoLoading] = useState(false);

  useEffect(() => {
    const t = parseTokenFromQuery(searchParams) || getTokenFromStorage();
    if (t) {
      setTokenInStorage(t);
      setToken(t);
      setUnauthorized(false);
    } else {
      setToken(null);
      setUnauthorized(true);
    }
    const pid = parseInt(String(searchParams.get("planta_id") || ""), 10);
    if (Number.isFinite(pid)) setSelectedPlantaId(pid);
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    fetchPlantas(token)
      .then((d) => setPlantas(filterPlantasSeh(d.plantas || [])))
      .catch((e) => {
        if (String(e?.message || "").includes("401") || String(e?.message || "").includes("Token")) {
          setUnauthorized(true);
        }
      });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setCumplimientoLoading(true);
    fetchSehCumplimiento(token, selectedPlantaId)
      .then(setCumplimiento)
      .catch(() => setCumplimiento(null))
      .finally(() => setCumplimientoLoading(false));
  }, [token, selectedPlantaId]);

  const sehOnly = token ? isSehOnlyToken(token) : false;
  const q = useMemo(() => {
    const parts: string[] = [];
    if (token) parts.push(`t=${encodeURIComponent(token)}`);
    if (selectedPlantaId != null) parts.push(`planta_id=${selectedPlantaId}`);
    return parts.length ? `?${parts.join("&")}` : "";
  }, [token, selectedPlantaId]);

  const meterFor = (key: SehAmbitoKey) => {
    const a = cumplimiento?.ambitos?.[key];
    return {
      pct: a?.pct ?? 0,
      complying: a?.complying ?? 0,
      total: a?.total ?? 0,
    };
  };

  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Acceso no autorizado</h1>
          <p className="mt-2 text-sm text-slate-400">
            Escribe &quot;SEH&quot; en WhatsApp para obtener un enlace de acceso.
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-900/50 px-4 py-2">
        <div className="flex items-center gap-2">
          {!sehOnly && (
            <Link
              href={`/dashboard?t=${encodeURIComponent(token)}`}
              className="rounded border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
            >
              Folios
            </Link>
          )}
          <h1 className="text-base font-semibold text-white">SEH · Seguridad e Higiene</h1>
          {sehOnly && (
            <span className="rounded border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[11px] text-amber-200">
              Acceso exclusivo SEH
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-700 bg-slate-900/60 p-1">
          <button
            type="button"
            onClick={() => setSelectedPlantaId(undefined)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedPlantaId == null ? "bg-amber-600 text-white" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Todas
          </button>
          {plantas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlantaId(p.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedPlantaId === p.id ? "bg-amber-600 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          Indicador = puntos en cumplimiento / puntos aplicables.
          PLANTA: REGULACIÓN (índice 69; Vigente y no vencido; N/A no cuenta) + OPERACIÓN vigente.
          ESTACIÓN y AUTOTANQUE: solo OPERACIÓN con vencimiento vigente.
        </p>

        <div className="flex flex-col gap-3">
          {SEH_AMBITOS.map((ambito) => {
            const operacionHref = `/seh/operacion/${ambito.key}${q}`;
            const regulacionHref =
              ambito.regulacionHref === "carpetas-legales" ? `/seh/carpetas-legales${q}` : null;
            const meter = meterFor(ambito.key);
            return (
              <div key={ambito.key} className="flex items-stretch gap-3">
                <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-600 bg-slate-900/70 shadow-sm">
                  <div className="border-b border-slate-700 bg-amber-950/25 px-4 py-5 text-center">
                    <h2 className="text-lg font-semibold tracking-wide text-amber-100">{ambito.cardTitle}</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-0">
                    <Link
                      href={operacionHref}
                      className="border-r border-slate-700 px-4 py-4 text-center text-sm font-semibold tracking-wide text-emerald-200 hover:bg-emerald-950/40"
                    >
                      OPERACIÓN
                    </Link>
                    {regulacionHref ? (
                      <Link
                        href={regulacionHref}
                        className="px-4 py-4 text-center text-sm font-semibold tracking-wide text-sky-200 hover:bg-sky-950/40"
                      >
                        REGULACIÓN
                      </Link>
                    ) : (
                      <span
                        className="px-4 py-4 text-center text-sm font-semibold tracking-wide text-slate-600"
                        title="Próximamente"
                      >
                        REGULACIÓN
                      </span>
                    )}
                  </div>
                </div>
                <SehCumplimientoMeter
                  pct={meter.pct}
                  complying={meter.complying}
                  total={meter.total}
                  loading={cumplimientoLoading}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SehPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-slate-400">Cargando SEH…</p>
        </div>
      }
    >
      <SehHomeContent />
    </Suspense>
  );
}
