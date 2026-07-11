"use strict";

/**
 * Bitácora + DICF → contexto integrado por mes (ej. Puebla julio vs mayo).
 * node scripts/test-director-ia-bitacora-priority.js
 */

const {
  resolveDirectorIaChatRouting,
  extractChatContextFromPayload,
  shouldUseMonthlyIntegratedChat,
  bitacoraIsNewerThanDicf,
  isExplicitDicfHistoryQuestion,
  buildDirectorIaChatPrompt,
  buildMonthlyIntegratedContext,
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
    temas: [{ name: "Clientes", open_count: 3, closed_count: 10, overdue_count: 1, progress_percent: 50 }],
    responsables: [],
    top_overdue: [],
    invalid_overdue: { count: 0, examples: [] },
    tema_details: [
      {
        tema: "Clientes",
        open_actions: [{ id: 1, title: "Seguimiento cartera", responsable: "Gerente", dias_vencido: 0 }],
      },
    ],
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
  shouldUseMonthlyIntegratedChat("¿Qué comentó el gerente sobre clientes?", pueblaContext),
  "pregunta clientes → integrado"
);
assert(
  !shouldUseMonthlyIntegratedChat("¿Qué pasó con CLIENTE MAYO?", pueblaContext),
  "historial explícito → no forzar integrado"
);
assert(isExplicitDicfHistoryQuestion("¿Qué pasó con CLIENTE MAYO?"), "detecta historial explícito");

const routing = resolveDirectorIaChatRouting("¿Qué comentó el gerente sobre clientes?", pueblaContext);
assert(routing.promptMode === "monthly_integrated", `mode ${routing.promptMode}`);
assert(routing.monthlyIntegrated === true, "flag integrado");

const focused = buildMonthlyIntegratedContext(pueblaContext, "¿Qué comentó el gerente sobre clientes?");
assert(focused.text.includes("2026-07-11") || focused.text.includes("julio"), "incluye sesión julio");
assert(focused.text.includes("JULIO 2026"), "bloque julio");
assert(focused.text.includes("MAYO 2026"), "bloque mayo");
assert(focused.text.includes("CLIENTE MAYO"), "incluye DICF mayo");
assert(focused.text.includes("DICF / CLIENTES"), "sección DICF");
assert(focused.text.includes("RESUMEN GLOBAL DE PLANTA"), "incluye AR");

const prompt = buildDirectorIaChatPrompt(pueblaContext, "¿Qué comentó el gerente sobre clientes?", {
  monthlyIntegrated: true,
  useFocused: true,
  focusedText: focused.text,
});
assert(prompt.promptMode === "monthly_integrated", "prompt monthly_integrated");
assert(prompt.userContent.includes("integrado por mes"), "instrucción integrada");
assert(prompt.userContent.includes("CLIENTE MAYO"), "DICF en prompt");

const routingDicf = resolveDirectorIaChatRouting("¿Qué pasó con CLIENTE MAYO?", pueblaContext);
assert(routingDicf.promptMode === "dicf_focused", `historial → dicf ${routingDicf.promptMode}`);

console.log("OK contexto integrado mensual — Puebla julio + mayo DICF");
