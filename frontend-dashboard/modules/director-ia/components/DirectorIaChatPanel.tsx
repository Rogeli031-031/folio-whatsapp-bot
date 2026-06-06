"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDirectorIaChat } from "@/modules/director-ia/lib/api";

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
}: DirectorIaChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectorIaChatMessage[]>([]);
  const [lastSources, setLastSources] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    setError(null);
    setLastSources([]);

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
      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), role: "assistant", content: res.answer },
      ]);
      setLastSources(res.sources || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al consultar");
    } finally {
      setLoading(false);
    }
  }, [token, plantaId, question]);

  const shellClass = chatMode
    ? `flex flex-col min-h-0 ${className}`
    : `rounded-lg border border-cyan-800/50 bg-slate-900/60 p-4 space-y-3 ${className}`;

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

      {chatMode && messages.length === 0 && !loading ? (
        <div className="flex-1 flex items-center justify-center px-4 py-8 text-center">
          <p className="text-sm text-slate-500">
            Pregunta sobre acciones, riesgos o situación de
            {plantaNombre ? ` ${plantaNombre}` : " la planta seleccionada"}.
          </p>
        </div>
      ) : null}

      {chatMode && messages.length > 0 ? (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-3 px-1 py-2 min-h-[200px] max-h-[50vh]"
        >
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

      {error ? <p className="text-sm text-red-300/90">{error}</p> : null}

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
