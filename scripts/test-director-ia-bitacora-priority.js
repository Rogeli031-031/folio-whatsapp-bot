"use strict";

/**
 * Bitácora reciente debe ganar a DICF histórico (ej. Puebla julio vs mayo).
 * node scripts/test-director-ia-bitacora-priority.js
 */

const {
  resolveDirectorIaChatRouting,
  extractChatContextFromPayload,
  shouldPrioritizeBitacoraOverDicf,
  bitacoraIsNewerThanDicf,
  isExplicitDicfHistoryQuestion,
  buildDirectorIaChatPrompt,
  buildFocusedBitacoraContext,
} = require("../lib/director-ia-chat");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const pueblaContext = extractChatContextFromPayload({
  bitacora: [
    {
      fecha: "2026-07-11",
      created_at: "2026-07-11T15:00:00.000Z",
      tipo: "visita_planta",
      titulo: "Visita y seguimiento a clientes Puebla",
      resumen_ia:
        "En julio el gerente comentó recuperación en zona norte y nuevos compromisos de gas para la segunda quincena.",
      planta_nombre: "Puebla",
    },
  ],
  action_register: {
    ok: true,
    summary: { open: 12, closed: 40, overdue: 2 },
    executive_summary: { risk_level: "MEDIO", findings: [] },
    temas: [],
    responsables: [],
    top_overdue: [],
    invalid_overdue: { count: 0, examples: [] },
    tema_details: [],
    dicf_details: [
      {
        dicf_id: 10,
        public_code: "P1",
        cliente_nombre: "CLIENTE MAYO",
        descripcion: "Solicito gas para el dia 13/05/2026",
        planta_label: "Puebla",
        estado: "hecho",
        cerrada: true,
        resultado_cierre: "Compromiso mayo — espera autorización de crédito.",
        historial: [{ evento: "cerrada", creado_en: "2026-05-13T00:00:00.000Z" }],
      },
    ],
  },
});

assert(bitacoraIsNewerThanDicf(pueblaContext), "julio bitácora > mayo DICF");
assert(
  shouldPrioritizeBitacoraOverDicf("¿Qué comentó el gerente sobre clientes?", pueblaContext),
  "pregunta clientes → priorizar bitácora"
);
assert(
  !shouldPrioritizeBitacoraOverDicf("¿Qué pasó con CLIENTE MAYO?", pueblaContext),
  "historial explícito → no forzar bitácora"
);
assert(isExplicitDicfHistoryQuestion("¿Qué pasó con CLIENTE MAYO?"), "detecta historial explícito");

const routing = resolveDirectorIaChatRouting("¿Qué comentó el gerente sobre clientes?", pueblaContext);
assert(routing.promptMode === "bitacora_focused", `mode ${routing.promptMode}`);
assert(routing.bitacoraPrioritized === true, "flag priorizado");

const focused = buildFocusedBitacoraContext(pueblaContext.bitacora, "¿Qué comentó el gerente sobre clientes?", {
  prioritizeRecent: true,
});
assert(focused.text.includes("2026-07-11"), "incluye sesión julio");
assert(focused.text.includes("JULIO 2026"), "agrupado por mes julio");
assert(focused.text.includes("ÚLTIMOS 3 MESES"), "ventana 3 meses");

const prompt = buildDirectorIaChatPrompt(pueblaContext, "¿Qué comentó el gerente sobre clientes?", {
  bitacoraOnlyFallback: true,
  bitacoraPrioritized: true,
  bitacoraAnnexText: focused.text,
});
assert(prompt.promptMode === "bitacora_focused", "prompt bitacora_focused");
assert(prompt.userContent.includes("más reciente"), "instrucción de prioridad");
assert(!prompt.userContent.includes("No se encontró contexto suficiente"), "no mensaje de fallback vacío");

const routingDicf = resolveDirectorIaChatRouting("¿Qué pasó con CLIENTE MAYO?", pueblaContext);
assert(routingDicf.promptMode === "dicf_focused", `historial → dicf ${routingDicf.promptMode}`);

console.log("OK bitácora prioridad sobre DICF — Puebla julio vs mayo");
