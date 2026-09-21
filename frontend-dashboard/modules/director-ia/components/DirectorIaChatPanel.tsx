"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDirectorIaChat } from "@/modules/director-ia/lib/api";
import { resolveDirectorIaUploadDayFromSearch } from "@/modules/director-ia/lib/chat-request";
import { buildOpenPronosticoHref } from "@/lib/igf-open-pronostico";

export type DirectorIaChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type DirectorIaChatPanelProps = {
  token: string;
  plantaId: number | string;
  plantaNombre?: string;
  /** Muestra fuentes técnicas bajo la última respuesta (página Director IA). */
  showSources?: boolean;
  /** Estilo burbujas de chat; oculta textos explicativos extra. */
  chatMode?: boolean;
  className?: string;
  /** Corte IGF/ARR ya resuelto por el padre; si falta, se lee `upload_day` de la URL. */
  uploadDay?: string | null;
  /** El área de mensajes ocupa el alto disponible (modal large). Default: tope 50vh. */
  fillAvailable?: boolean;
  /** Si el backend emite OPEN_FOLIO con folio_id, abre el detalle real. */
  onOpenFolio?: (folioId: number) => void;
  /** Si el backend emite OPEN_PRONOSTICO / OPEN_IGF_PRONOSTICO_MODAL, abre el modal real de Pronóstico. */
  onOpenPronostico?: (action: { type: string; plant?: string | null; year?: number | null; month?: number | null }) => void;
  /** Si el backend emite OPEN_CATEGORY_MOVEMENT, abre Movimiento por categoría. */
  onOpenCategoryMovement?: (action: {
    type: string;
    category?: "CASA" | "COMISIONISTA" | null;
    plant?: string | null;
  }) => void;
  onOpenClientDeltaForecast?: (action: {
    type: string;
    client?: string | null;
    plant?: string | null;
    plant_id?: number | null;
    period?: string | null;
  }) => void;
};

function newMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function DirectorIaChatPanel({
  token,
  plantaId,
  plantaNombre,
  showSources = false,
  chatMode = false,
  className = "",
  uploadDay: uploadDayProp = null,
  fillAvailable = false,
  onOpenFolio,
  onOpenPronostico,
  onOpenCategoryMovement,
  onOpenClientDeltaForecast,
}: DirectorIaChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectorIaChatMessage[]>([]);
  const [lastSources, setLastSources] = useState<string[]>([]);
  const [conversationState, setConversationState] = useState<Record<string, unknown> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const consumedActionRef = useRef<string | null>(null);

  useEffect(() => {
    setConversationState(null);
  }, [plantaId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const consultar = useCallback(async () => {
    const q = question.trim();
    const pid =
      typeof plantaId === "number" ? plantaId : parseInt(String(plantaId).trim(), 10);
    if (!q) {
      setError("Escribe una pregunta.");
      return;
    }
    if (!Number.isFinite(pid) || pid <= 0) {
      setError("Selecciona una planta válida.");
      return;
    }

    const userMsg: DirectorIaChatMessage = { id: newMessageId(), role: "user", content: q };
    const historyForApi = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    setError(null);
    setLastSources([]);

    try {
      const fromUrl =
        typeof window !== "undefined" ? resolveDirectorIaUploadDayFromSearch(window.location.search) : null;
      const uploadDay = uploadDayProp || fromUrl;
      const res = await fetchDirectorIaChat(token, pid, q, historyForApi, {
        upload_day: uploadDay,
        planta_nombre: plantaNombre || null,
        search: typeof window !== "undefined" ? window.location.search : null,
        conversation_state: conversationState,
      });
      if ("enabled" in res && res.enabled === false) {
        setError("Director IA deshabilitado en el servidor.");
        return;
      }
      if (!("ok" in res) || !res.ok) {
        setError("error" in res ? res.error : "Error al consultar");
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), role: "assistant", content: res.answer },
      ]);
      setLastSources(res.sources || []);
      const nextState =
        res.context_meta &&
        typeof res.context_meta === "object" &&
        "conversation_state" in res.context_meta
          ? (res.context_meta as { conversation_state?: Record<string, unknown> }).conversation_state
          : null;
      if (nextState) setConversationState(nextState);
      const action = "ui_action" in res ? res.ui_action : null;
      const actionKey = action
        ? `${action.type}:${action.category || ""}:${action.plant || ""}:${action.folio_id || ""}:${Date.now()}`
        : null;
      if (action && actionKey && consumedActionRef.current !== actionKey) {
        consumedActionRef.current = actionKey;
        if (
          action.type === "OPEN_FOLIO" &&
          action.folio_id != null &&
          Number.isFinite(Number(action.folio_id)) &&
          typeof onOpenFolio === "function"
        ) {
          onOpenFolio(Number(action.folio_id));
        }
        const openPronosticoTypes = new Set([
          "OPEN_PRONOSTICO",
          "OPEN_IGF_PRONOSTICO_MODAL",
          "OPEN_DAILY_SALES_VIEW",
        ]);
        if (openPronosticoTypes.has(action.type)) {
          if (typeof onOpenPronostico === "function") {
            onOpenPronostico({
              type: action.type,
              plant: action.plant || null,
              year: action.year ?? null,
              month: action.month ?? null,
            });
          } else if (typeof window !== "undefined") {
            window.location.assign(buildOpenPronosticoHref(window.location.search, { plant: action.plant }));
          }
        }
        if (action.type === "OPEN_CATEGORY_MOVEMENT" && typeof onOpenCategoryMovement === "function") {
          onOpenCategoryMovement({
            type: action.type,
            category: action.category === "COMISIONISTA" ? "COMISIONISTA" : "CASA",
            plant: action.plant || plantaNombre || null,
          });
        }
        if (action.type === "OPEN_CLIENT_DELTA_FORECAST" && typeof onOpenClientDeltaForecast === "function") {
          onOpenClientDeltaForecast({
            type: action.type,
            client: action.client || null,
            plant: action.plant || plantaNombre || null,
            plant_id: action.plant_id ?? null,
            period: action.period || null,
          });
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al consultar");
    } finally {
      setLoading(false);
    }
  }, [token, plantaId, plantaNombre, question, messages, uploadDayProp, conversationState, onOpenFolio, onOpenPronostico, onOpenCategoryMovement, onOpenClientDeltaForecast]);

  const fillChat = Boolean(chatMode && fillAvailable);
  const shellClass = chatMode
    ? fillChat
      ? `h-full flex flex-col min-h-0 overflow-hidden ${className}`
      : `flex flex-col min-h-0 ${className}`
    : `rounded-lg border border-cyan-800/50 bg-slate-900/60 p-4 space-y-3 ${className}`;

  const emptyPrompt = (
    <p className="text-sm text-slate-500">
      Pregunta sobre acciones, riesgos o situación de
      {plantaNombre ? ` ${plantaNombre}` : " la planta seleccionada"}.
    </p>
  );

  const bubbleList = (
    <>
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-cyan-950/70 border border-cyan-700/50 text-cyan-50"
                : "bg-slate-800 border border-slate-600 text-slate-100"
            }`}
          >
            {m.content}
          </div>
        </div>
      ))}
      {loading ? (
        <div className="flex justify-start">
          <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-400">
            Pensando…
          </div>
        </div>
      ) : null}
    </>
  );

  const composerRow = (
    <div className={`flex flex-col sm:flex-row gap-2 ${chatMode ? "pt-2 border-t border-slate-700 shrink-0" : ""}`}>
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !loading) void consultar();
        }}
        placeholder="Escribe tu pregunta…"
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
        {loading ? "Enviando…" : chatMode ? "Enviar" : "Consultar"}
      </button>
    </div>
  );

  const errorNode = error ? (
    <p className={fillChat ? "text-sm text-red-300/90 px-1 pt-1 max-h-16 overflow-y-auto" : "text-sm text-red-300/90"}>
      {error}
    </p>
  ) : null;

  return (
    <div className={shellClass}>
      {!chatMode ? (
        <>
          <p className="text-sm font-medium text-slate-200">Chat Director IA</p>
          <p className="text-xs text-slate-500">
            Asistente ejecutivo basado en el contexto de Action Register
            {plantaNombre ? ` de ${plantaNombre}` : " de la planta seleccionada"}.
          </p>
        </>
      ) : null}

      {fillChat ? (
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-3 px-1 py-2">
          {messages.length === 0 && !loading ? (
            <div className="flex min-h-full items-center justify-center px-4 py-4 text-center">{emptyPrompt}</div>
          ) : (
            bubbleList
          )}
        </div>
      ) : null}

      {chatMode && !fillChat && messages.length === 0 && !loading ? (
        <div className="flex-1 flex items-center justify-center px-4 py-8 text-center">{emptyPrompt}</div>
      ) : null}

      {chatMode && !fillChat && messages.length > 0 ? (
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 px-1 py-2 min-h-[200px] max-h-[50vh]">
          {bubbleList}
        </div>
      ) : null}

      {!chatMode && (messages.length > 0 || loading) ? (
        <div className="space-y-3 border-t border-slate-700 pt-3 max-h-[40vh] overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id}>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
                {m.role === "user" ? "Pregunta" : "Respuesta"}
              </p>
              <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          ))}
          {loading ? <p className="text-sm text-slate-400">Consultando…</p> : null}
        </div>
      ) : null}

      {fillChat ? (
        <div className="shrink-0">
          {errorNode}
          {composerRow}
        </div>
      ) : (
        <>
          {composerRow}
          {errorNode}
        </>
      )}

      {!chatMode && showSources && lastSources.length > 0 ? (
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
  );
}
