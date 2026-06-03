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
  fetchDirectorIaChat,
  type DirectorIaContextResponse,
  type DirectorIaInvalidOverdueExample,
  type DirectorIaTopOverdueAction,
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

const PRIORIDAD_BADGE: Record<DirectorIaTopOverdueAction["prioridad"], string> = {
  CRITICA: "bg-red-950/60 text-red-200 border-red-700",
  ALTA: "bg-orange-950/50 text-orange-200 border-orange-700",
  MEDIA: "bg-amber-950/40 text-amber-200 border-amber-700",
  BAJA: "bg-slate-800 text-slate-300 border-slate-600",
};

function riskBadgeClass(level: "ALTO" | "MEDIO" | "BAJO") {
  if (level === "ALTO") return "text-red-300 border-red-600 bg-red-950/40";
  if (level === "MEDIO") return "text-amber-200 border-amber-600 bg-amber-950/30";
  return "text-emerald-300 border-emerald-700 bg-emerald-950/30";
}

function formatInvalidOverdueReason(reason: string) {
  if (reason === "due_date_fuera_de_rango") return "Fecha fuera de rango operativo";
  if (reason === "dias_vencido_excesivo") return "Días vencidos superiores a 10 años";
  return reason;
}

function DirectorIaChatPanel({
  token,
  plantaId,
}: {
  token: string;
  plantaId: string;
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [lastSources, setLastSources] = useState<string[]>([]);

  const consultar = useCallback(async () => {
    const q = question.trim();
    const pid = parseInt(plantaId.trim(), 10);
    if (!q) {
      setError("Escribe una pregunta.");
      return;
    }
    if (!Number.isFinite(pid) || pid <= 0) {
      setError("Indica un ID de planta válido arriba.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDirectorIaChat(token, pid, q);
      if ("enabled" in res && res.enabled === false) {
        setError("Director IA deshabilitado en el servidor.");
        return;
      }
      if (!("ok" in res) || !res.ok) {
        setError("error" in res ? res.error : "Error al consultar");
        return;
      }
      setLastQuestion(q);
      setLastAnswer(res.answer);
      setLastSources(res.sources || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al consultar");
    } finally {
      setLoading(false);
    }
  }, [token, plantaId, question]);

  return (
    <div className="rounded-lg border border-cyan-800/50 bg-slate-900/60 p-4 space-y-3">
      <p className="text-sm font-medium text-slate-200">Chat Director IA</p>
      <p className="text-xs text-slate-500">
        Asistente ejecutivo basado en el contexto de Action Register de la planta seleccionada.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) void consultar();
          }}
          placeholder="Pregúntale al Director IA..."
          className="flex-1 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
          aria-label="Pregunta al Director IA"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void consultar()}
          disabled={loading}
          className="rounded border border-cyan-600/80 bg-cyan-950/50 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-900/40 disabled:opacity-50 shrink-0"
        >
          {loading ? "Consultando…" : "Consultar"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-300/90">{error}</p> : null}
      {lastQuestion && lastAnswer ? (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Pregunta</p>
            <p className="text-sm text-slate-200">{lastQuestion}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Respuesta</p>
            <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">{lastAnswer}</p>
          </div>
          {lastSources.length > 0 ? (
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Fuentes</p>
              <ul className="flex flex-wrap gap-1.5">
                {lastSources.map((s) => (
                  <li
                    key={s}
                    className="font-mono text-[10px] rounded border border-slate-600 bg-slate-800/80 px-2 py-0.5 text-slate-400"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InvalidOverduePanel({
  count,
  examples,
}: {
  count: number;
  examples: DirectorIaInvalidOverdueExample[];
}) {
  if (count <= 0) return null;

  return (
    <div className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-4 space-y-3">
      <p className="text-sm text-amber-100/95">
        ⚠️ Calidad de datos: se excluyeron {count}{" "}
        {count === 1 ? "acción vencida" : "acciones vencidas"} con fechas inválidas del análisis
        ejecutivo.
      </p>
      <p className="text-xs text-slate-400">
        Estas acciones siguen existiendo en Action Register; solo se excluyen del análisis ejecutivo
        para evitar días vencidos irreales.
      </p>
      {examples.length > 0 ? (
        <div>
          <p className="text-slate-500 text-xs font-medium mb-2">Ejemplos (máx. 10)</p>
          <div className="overflow-x-auto rounded border border-amber-800/40">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-800/80 text-slate-400 text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Tema</th>
                  <th className="px-3 py-2 font-medium">Responsable</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {examples.map((row) => (
                  <tr key={row.id} className="border-t border-slate-700/80">
                    <td className="px-3 py-2 font-mono text-slate-300">{row.id}</td>
                    <td className="px-3 py-2 text-slate-200">{row.tema}</td>
                    <td className="px-3 py-2 text-slate-300">{row.responsable || "—"}</td>
                    <td className="px-3 py-2 font-mono text-amber-200/90">{row.due_date || "—"}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs">
                      {formatInvalidOverdueReason(row.reason)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ContextResultPanel({
  data,
  error,
  loading,
  token,
  plantaId,
}: {
  data: DirectorIaContextResponse | null;
  error: string | null;
  loading: boolean;
  token: string;
  plantaId: string;
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
            <div className="space-y-6">
              {data.action_register.executive_summary && (
                <div className="rounded-lg border border-slate-600 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-medium text-slate-200">Resumen ejecutivo</p>
                    <span
                      className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(data.action_register.executive_summary.risk_level)}`}
                    >
                      Estado general: {data.action_register.executive_summary.risk_level}
                    </span>
                  </div>
                  {data.action_register.executive_summary.findings.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                      {data.action_register.executive_summary.findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">Sin hallazgos.</p>
                  )}
                </div>
              )}

              <DirectorIaChatPanel token={token} plantaId={plantaId} />

              {data.action_register.invalid_overdue &&
              data.action_register.invalid_overdue.count > 0 ? (
                <InvalidOverduePanel
                  count={data.action_register.invalid_overdue.count}
                  examples={data.action_register.invalid_overdue.examples}
                />
              ) : null}

              {data.action_register.top_overdue.length > 0 ? (
                <div>
                  <p className="text-slate-500 text-xs font-medium mb-2">Top acciones críticas (vencidas)</p>
                  <div className="overflow-x-auto rounded border border-slate-700">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-800/80 text-slate-400 text-xs">
                        <tr>
                          <th className="px-3 py-2 font-medium">Prioridad</th>
                          <th className="px-3 py-2 font-medium text-right">Días vencido</th>
                          <th className="px-3 py-2 font-medium">Tema</th>
                          <th className="px-3 py-2 font-medium">Responsable</th>
                          <th className="px-3 py-2 font-medium">Rol</th>
                          <th className="px-3 py-2 font-medium">Título</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.action_register.top_overdue.map((a) => (
                          <tr key={a.id} className="border-t border-slate-700/80">
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PRIORIDAD_BADGE[a.prioridad]}`}
                              >
                                {a.prioridad}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-amber-200">{a.dias_vencido}</td>
                            <td className="px-3 py-2 text-slate-200">{a.tema}</td>
                            <td className="px-3 py-2 text-slate-300">{a.responsable || "—"}</td>
                            <td className="px-3 py-2 text-slate-400 text-xs">{a.role_name || a.role_key || "—"}</td>
                            <td className="px-3 py-2 text-slate-200 max-w-xs truncate" title={a.titulo}>
                              {a.titulo}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sin acciones vencidas abiertas.</p>
              )}

              <dl className="grid gap-2 sm:grid-cols-3 text-sm">
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
                          <th className="px-3 py-2 font-medium">Rol</th>
                          <th className="px-3 py-2 font-medium text-right">Abiertas</th>
                          <th className="px-3 py-2 font-medium text-right">Vencidas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.action_register.responsables.map((r) => (
                          <tr key={r.name} className="border-t border-slate-700/80">
                            <td className="px-3 py-2 text-slate-200">{r.name}</td>
                            <td className="px-3 py-2 text-slate-400 text-xs">
                              {r.role_name || r.role_key || "—"}
                            </td>
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
              {data.action_register.temas.length > 0 ? (
                <div>
                  <p className="text-slate-500 text-xs font-medium mb-2">Temas</p>
                  <div className="overflow-x-auto rounded border border-slate-700">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-800/80 text-slate-400 text-xs">
                        <tr>
                          <th className="px-3 py-2 font-medium">Tema</th>
                          <th className="px-3 py-2 font-medium text-right">Abiertas</th>
                          <th className="px-3 py-2 font-medium text-right">Cerradas</th>
                          <th className="px-3 py-2 font-medium text-right">Vencidas</th>
                          <th className="px-3 py-2 font-medium text-right">Avance %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.action_register.temas.map((t) => (
                          <tr key={t.name} className="border-t border-slate-700/80">
                            <td className="px-3 py-2 text-slate-200">{t.name}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-200">{t.open_count}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-200">{t.closed_count}</td>
                            <td className="px-3 py-2 text-right font-mono text-amber-200">{t.overdue_count}</td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-200/90">{t.progress_percent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sin acciones registradas por tema.</p>
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
          <ContextResultPanel
            data={contextData}
            error={contextError}
            loading={contextLoading}
            token={token}
            plantaId={planta}
          />
        </section>
      </main>
    </div>
  );
}
