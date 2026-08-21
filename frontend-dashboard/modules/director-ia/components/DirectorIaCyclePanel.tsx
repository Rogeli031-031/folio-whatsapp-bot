"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDirectorIaCycle } from "@/modules/director-ia/lib/api";
import cycleCore from "@/modules/director-ia/lib/cycle-client-core";
import type { DirectorIaCycleInterpreted } from "@/modules/director-ia/lib/cycle-client-core";

const TRANSPORT = cycleCore.TRANSPORT;
const createDirectorIaCycleUiSession = cycleCore.createDirectorIaCycleUiSession;

type DirectorIaCyclePanelProps = {
  token: string;
  plantaId: string;
  year: string;
  month: string;
  onUnauthorized?: () => void;
};

function parseSelectedPlantaId(raw: string) {
  const n = parseInt(String(raw || "").trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function toneClass(interpreted: DirectorIaCycleInterpreted | null, transportState: string) {
  if (transportState === TRANSPORT.loading) return "border-slate-600 bg-slate-900/50";
  if (transportState === TRANSPORT.transport_error) return "border-red-500/50 bg-red-950/25";
  if (!interpreted || transportState === TRANSPORT.idle) return "border-slate-700 bg-slate-900/40";
  if (interpreted.outcomeKind === "ACQUIRED_EMPTY" || interpreted.outcomeKind === "ENTITY_UNRESOLVED" || interpreted.outcomeKind === "QUERY_SCOPE_INCOMPLETE") {
    return "border-amber-700/50 bg-amber-950/20";
  }
  if (interpreted.outcomeKind === "ABSTAIN" || interpreted.outcomeKind === "NO_KNOWLEDGE") {
    return "border-slate-600 bg-slate-900/50";
  }
  return "border-slate-600 bg-slate-900/40";
}

export function DirectorIaCyclePanel({
  token,
  plantaId,
  year,
  month,
  onUnauthorized,
}: DirectorIaCyclePanelProps) {
  const sessionRef = useRef(createDirectorIaCycleUiSession());
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [transportState, setTransportState] = useState<string>(TRANSPORT.idle);
  const [interpreted, setInterpreted] = useState<DirectorIaCycleInterpreted | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      sessionRef.current.invalidate();
    };
  }, []);

  const ejecutar = useCallback(async () => {
    const session = sessionRef.current;
    if (!session.beginRequest()) return;
    const gen = session.generation();
    setTransportState(TRANSPORT.loading);
    setLocalError(null);
    setInterpreted(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const pid = parseSelectedPlantaId(plantaId);
    if (pid == null) {
      const invalid = {
        transportState: TRANSPORT.transport_error,
        httpStatus: 400,
        outcomeKind: "INVALID_INPUT",
        headline: "La solicitud no es válida",
        detail: "Indica un ID de planta válido.",
        trace_id: null,
        authFailure: false,
        authorizationFailure: false,
        acquisition_status: null,
        ies_status: null,
        reasoning_status: null,
        knowledge_coverage: null,
        source_health: null,
        code: "INVALID_INPUT",
        channel_output: null,
      } as DirectorIaCycleInterpreted;
      session.finishRequest(invalid, gen);
      if (!mountedRef.current || session.isStale(gen)) return;
      setInterpreted(invalid);
      setTransportState(TRANSPORT.transport_error);
      setLocalError("Indica un ID de planta válido.");
      return;
    }

    const input: { planta_id: number; year?: number; month?: number } = { planta_id: pid };
    const yearN = parseInt(String(year || "").trim(), 10);
    const monthN = parseInt(String(month || "").trim(), 10);
    if (Number.isFinite(yearN) && yearN > 0) input.year = yearN;
    if (Number.isFinite(monthN) && monthN >= 1 && monthN <= 12) input.month = monthN;

    try {
      const result = await fetchDirectorIaCycle(token, input, undefined, { signal: ac.signal });
      if (!mountedRef.current || session.isStale(gen)) return;
      session.finishRequest(result, gen);
      setInterpreted(result);
      setTransportState(result.transportState);
      if (result.authFailure && onUnauthorized) onUnauthorized();
    } catch {
      if (!mountedRef.current || session.isStale(gen)) return;
      const failed = {
        transportState: TRANSPORT.transport_error,
        httpStatus: 500,
        outcomeKind: "INTERNAL_ERROR",
        headline: "No se pudo completar la consulta",
        detail: null,
        trace_id: null,
        authFailure: false,
        authorizationFailure: false,
        acquisition_status: null,
        ies_status: null,
        reasoning_status: null,
        knowledge_coverage: null,
        source_health: null,
        code: null,
        channel_output: null,
      } as DirectorIaCycleInterpreted;
      session.finishRequest(failed, gen);
      if (!mountedRef.current || session.isStale(gen)) return;
      setInterpreted(failed);
      setTransportState(TRANSPORT.transport_error);
    }
  }, [token, plantaId, year, month, onUnauthorized]);

  const loading = transportState === TRANSPORT.loading;
  const blocks = interpreted && interpreted.channel_output && interpreted.channel_output.content_blocks
    ? interpreted.channel_output.content_blocks
    : [];

  return (
    <div className={`rounded-lg border p-4 space-y-4 ${toneClass(interpreted, transportState)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-slate-200">Ciclo Director IA</h2>
          <p className="text-xs text-slate-500 mt-1">
            Consulta el ciclo productivo de la planta seleccionada. Un resultado 200 no implica una
            conclusión de negocio.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void ejecutar()}
          disabled={loading}
          className="rounded bg-sky-800 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {loading ? "Consultando…" : "Ejecutar ciclo"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400" role="status">
          Consultando ciclo Director IA…
        </p>
      ) : null}

      {localError && transportState === TRANSPORT.transport_error && !interpreted?.acquisition_status ? (
        <p className="text-sm text-red-300">{localError}</p>
      ) : null}

      {interpreted && transportState !== TRANSPORT.loading ? (
        <div className="space-y-3" aria-live="polite">
          <div>
            <p className="text-sm font-medium text-slate-100">{interpreted.headline}</p>
            {interpreted.detail ? (
              <p className="text-xs text-slate-400 mt-1">{interpreted.detail}</p>
            ) : null}
          </div>

          {transportState === TRANSPORT.completed ? (
            <dl className="grid gap-2 sm:grid-cols-3 text-xs">
              <div>
                <dt className="text-slate-500">Estado de adquisición</dt>
                <dd className="font-mono text-slate-200">{interpreted.acquisition_status || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">IES</dt>
                <dd className="font-mono text-slate-200">{interpreted.ies_status || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Razonamiento</dt>
                <dd className="font-mono text-slate-200">{interpreted.reasoning_status || "—"}</dd>
              </div>
            </dl>
          ) : null}

          {blocks.length > 0 ? (
            <ul className="space-y-2">
              {blocks.map((block, idx) => (
                <li
                  key={`${block.sequence ?? idx}-${block.semantic_type || "block"}`}
                  className="rounded border border-slate-700 bg-slate-950/40 px-3 py-2"
                >
                  {block.semantic_type ? (
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                      {block.semantic_type}
                      {block.content_class ? ` · ${block.content_class}` : ""}
                    </p>
                  ) : null}
                  <p className="text-sm text-slate-100 whitespace-pre-wrap">
                    {block.statement_or_reference || "—"}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          {interpreted.trace_id ? (
            <p className="text-[10px] font-mono text-slate-500 break-all" aria-label="Referencia de traza">
              ref {interpreted.trace_id}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
