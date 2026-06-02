"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  parseTokenFromQuery,
  getTokenFromStorage,
  setTokenInStorage,
} from "@/lib/auth";
import {
  fetchDirectorIaContext,
  type DirectorIaContextResponse,
} from "@/modules/director-ia/lib/api";

const MESES = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

function ContextResultPanel({
  data,
  error,
  loading,
}: {
  data: DirectorIaContextResponse | null;
  error: string | null;
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-slate-400">Consultando contexto…</p>;
  }
  if (error) {
    return (
      <div className="rounded border border-red-500/50 bg-red-950/30 p-3">
        <p className="text-sm font-medium text-red-300">Error</p>
        <p className="text-sm text-red-200/90 mt-1">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <p className="text-sm text-slate-500 text-center">
        Pulsa «Probar contexto» para llamar al backend.
      </p>
    );
  }
  if (data.enabled === false) {
    return (
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-slate-400">enabled:</span>{" "}
          <span className="text-amber-300 font-mono">false</span>
        </p>
        <p className="text-slate-500 text-xs">
          El backend tiene Director IA deshabilitado (ENABLE_DIRECTOR_IA).
        </p>
      </div>
    );
  }
  const { timestamp, sources } = data;
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-slate-400">enabled</dt>
        <dd className="font-mono text-emerald-300">true</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-slate-400">timestamp</dt>
        <dd className="font-mono text-slate-200 break-all">{timestamp}</dd>
      </div>
      <div>
        <dt className="text-slate-400">sources.igf</dt>
        <dd className="font-mono text-slate-200">{String(sources.igf)}</dd>
      </div>
      <div>
        <dt className="text-slate-400">sources.arr</dt>
        <dd className="font-mono text-slate-200">{String(sources.arr)}</dd>
      </div>
      <div>
        <dt className="text-slate-400">sources.dicf</dt>
        <dd className="font-mono text-slate-200">{String(sources.dicf)}</dd>
      </div>
      <div>
        <dt className="text-slate-400">sources.action_register</dt>
        <dd className="font-mono text-slate-200">{String(sources.action_register)}</dd>
      </div>
      {"action_register" in data && (
        <div className="sm:col-span-2 space-y-2 border-t border-slate-700 pt-3 mt-1">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">action_register</p>
          {data.action_register.ok ? (
            <div className="space-y-4">
              <dl className="grid gap-2 sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500 text-xs">open</dt>
                  <dd className="font-mono text-slate-200">{data.action_register.summary.open}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">closed</dt>
                  <dd className="font-mono text-slate-200">{data.action_register.summary.closed}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">overdue</dt>
                  <dd className="font-mono text-amber-200">{data.action_register.summary.overdue}</dd>
                </div>
              </dl>
              {data.action_register.responsables.length > 0 ? (
                <div>
                  <p className="text-slate-500 text-xs font-medium mb-2">Responsables (top 10, abiertas)</p>
                  <div className="overflow-x-auto rounded border border-slate-700">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-800/80 text-slate-400 text-xs">
                        <tr>
                          <th className="px-3 py-2 font-medium">Responsable</th>
                          <th className="px-3 py-2 font-medium text-right">Abiertas</th>
                          <th className="px-3 py-2 font-medium text-right">Vencidas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.action_register.responsables.map((r) => (
                          <tr key={r.name} className="border-t border-slate-700/80">
                            <td className="px-3 py-2 text-slate-200">{r.name}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-200">{r.open_count}</td>
                            <td className="px-3 py-2 text-right font-mono text-amber-200">{r.overdue_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sin acciones abiertas con responsable asignado.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-300/90">{data.action_register.error}</p>
          )}
        </div>
      )}
    </dl>
  );
}

export function DirectorIaShell() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [planta, setPlanta] = useState("");
  const [mes, setMes] = useState("");
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextData, setContextData] = useState<DirectorIaContextResponse | null>(null);

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
  }, [searchParams]);

  const probarContexto = useCallback(async () => {
    if (!token) return;
    setContextLoading(true);
    setContextError(null);
    setContextData(null);
    try {
      const data = await fetchDirectorIaContext(token, planta.trim() || undefined);
      setContextData(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al consultar contexto";
      if (msg.includes("401") || msg.toLowerCase().includes("token")) {
        setUnauthorized(true);
      }
      setContextError(msg);
    } finally {
      setContextLoading(false);
    }
  }, [token, planta]);

  if (unauthorized || !token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6">
        <p className="text-center text-slate-400">
          Abre esta página con el token del dashboard (por ejemplo desde KPI:{" "}
          <span className="font-mono text-slate-300">/director-ia?t=…</span>
          ).
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 px-4 py-4">
        <h1 className="text-xl font-semibold text-white">Director IA</h1>
      </header>

      <main className="mx-auto max-w-4xl p-4 space-y-6">
        <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 min-w-[12rem]">
              <span className="text-xs text-slate-400">Planta</span>
              <input
                type="number"
                min={1}
                value={planta}
                onChange={(e) => setPlanta(e.target.value)}
                placeholder="ID planta (ej. 3)"
                className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 w-full"
                aria-label="ID de planta para contexto"
              />
            </label>

            <label className="flex flex-col gap-1 min-w-[10rem]">
              <span className="text-xs text-slate-400">Mes</span>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200"
                aria-label="Selector de mes"
              >
                <option value="">— Seleccionar mes —</option>
                {MESES.map((m) => (
                  <option key={m.value} value={m.value} disabled>
                    {m.label} (placeholder)
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled
              className="rounded bg-violet-700 px-4 py-2 text-sm font-medium text-white opacity-60 cursor-not-allowed"
              title="Próximamente"
            >
              Analizar planta
            </button>

            <button
              type="button"
              onClick={() => void probarContexto()}
              disabled={contextLoading}
              className="rounded border border-cyan-600/80 bg-cyan-950/40 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-900/40 disabled:opacity-50"
            >
              {contextLoading ? "Probando…" : "Probar contexto"}
            </button>
          </div>
        </section>

        <section
          className="min-h-[280px] rounded-lg border border-dashed border-slate-600 bg-slate-900/40 p-6"
          aria-label="Área de resultados"
        >
          <h2 className="text-sm font-medium text-slate-300 mb-4">Respuesta GET /api/director-ia/context</h2>
          <ContextResultPanel data={contextData} error={contextError} loading={contextLoading} />
        </section>
      </main>
    </div>
  );
}
