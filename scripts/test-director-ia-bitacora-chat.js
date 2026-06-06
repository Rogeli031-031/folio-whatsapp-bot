"use strict";

/**
 * Pruebas locales Sprint 2B — routing Bitácora IA en chat (sin OpenAI ni BD).
 * Ejecutar: node scripts/test-director-ia-bitacora-chat.js
 */

const {
  isBitacoraQuestion,
  isDicfContextQuestion,
  isMejoraContinuaQuestion,
  isNarrativeQuestion,
  buildFocusedBitacoraContext,
  buildFocusedDicfContext,
  combineBitacoraDicfContext,
  buildDirectorIaChatPrompt,
  extractChatContextFromPayload,
  resolveDirectorIaChatRouting,
  inferSourcesFromChat,
} = require("../lib/director-ia-chat");

const mockBitacora = [
  {
    fecha: "2026-05-10",
    tipo: "visita_planta",
    titulo: "Visita Tehuacán — seguimiento gerencial",
    resumen_ia:
      "Oportunidad en Coapan: ampliar autotanque. El gerente comentó riesgo de competencia en la zona sur.",
    planta_nombre: "Tehuacán",
  },
  {
    fecha: "2026-05-05",
    tipo: "junta_consejo",
    titulo: "Junta consejo Tehuacán",
    resumen_ia: "Revisión de márgenes y plan comercial Q2.",
    planta_nombre: "Tehuacán",
  },
];

const chatContext = extractChatContextFromPayload({
  bitacora: mockBitacora,
  action_register: {
    ok: true,
    summary: { open: 5, closed: 2, overdue: 1 },
    executive_summary: { risk_level: "MEDIO", findings: ["Mantenimiento con retrasos"] },
    temas: [{ name: "Mantenimiento", open_count: 5, closed_count: 1, overdue_count: 1, progress_percent: 40 }],
    responsables: [],
    top_overdue: [],
    invalid_overdue: { count: 0, examples: [] },
    tema_details: [
      {
        tema: "Mantenimiento",
        open_actions: [{ id: 1, title: "Pintura barda perimetral", responsable: "Juan", dias_vencido: 0 }],
      },
    ],
    dicf_details: [
      {
        public_code: "DICF1",
        cliente_nombre: "Cliente X",
        descripcion: "Cliente dejó de comprar",
        planta_label: "Tehuacán",
        estado: "hecho",
        cerrada: true,
        resultado_cierre: "Bajó demanda estacional.",
        historial: [{ evento: "cerrada", creado_en: "2026-04-01", actor_nombre: "Ana", detalle: {} }],
      },
    ],
  },
});

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const cases = [
  {
    q: "¿Qué oportunidades se identificaron en Tehuacán?",
    expectMode: "bitacora_focused",
    expectBitacora: true,
    expectDicf: false,
  },
  {
    q: "¿Qué comentó el gerente sobre Coapan?",
    expectMode: "bitacora_focused",
    expectBitacora: true,
    expectDicf: false,
  },
  {
    q: "¿Qué clientes dejaron de comprar?",
    expectMode: "dicf_focused",
    expectBitacora: false,
    expectDicf: true,
  },
  {
    q: "¿Cómo va mantenimiento?",
    expectMode: "focused",
    expectBitacora: false,
    expectDicf: false,
  },
  {
    q: "¿Qué riesgos se comentaron en la visita de Tehuacán?",
    expectMode: "bitacora_focused",
    expectBitacora: true,
    expectDicf: false,
  },
  {
    q: "¿Cómo va el Plan Maestro?",
    expectMode: "mejora_continua",
    expectBitacora: false,
    expectDicf: false,
  },
  {
    q: "¿Qué oportunidades vimos en Tehuacán y qué clientes dejaron de comprar?",
    expectMode: "bitacora_focused",
    expectBitacora: true,
    expectDicf: true,
    combined: true,
  },
];

for (const c of cases) {
  const routing =
    c.expectMode === "mejora_continua"
      ? { promptMode: "mejora_continua" }
      : resolveDirectorIaChatRouting(c.q, chatContext);

  assert(routing.promptMode === c.expectMode, `${c.q} → mode ${routing.promptMode}, expected ${c.expectMode}`);

  if (c.expectMode !== "mejora_continua") {
    assert(isBitacoraQuestion(c.q) === c.expectBitacora, `isBitacoraQuestion: ${c.q}`);
    assert(isDicfContextQuestion(c.q) === c.expectDicf, `isDicfContextQuestion: ${c.q}`);
  }

  if (c.combined) {
    assert(routing.combinedBitacoraDicf === true, `combined routing: ${c.q}`);
  }
}

const bitacoraCtx = buildFocusedBitacoraContext(mockBitacora, cases[0].q);
assert(bitacoraCtx.text.includes("Oportunidad en Coapan"), "bitacora context includes oportunidad");
assert(bitacoraCtx.text.includes("Resumen:"), "bitacora context format");

const combined = combineBitacoraDicfContext(
  buildFocusedBitacoraContext(mockBitacora, cases[6].q),
  buildFocusedDicfContext(chatContext, cases[6].q)
);
assert(combined.text.includes("BITÁCORA IA"), "combined has bitacora section");
assert(combined.text.includes("CONTEXTO DICF"), "combined has dicf section");

const prompt = buildDirectorIaChatPrompt(chatContext, cases[0].q, {
  useFocused: true,
  focusedText: bitacoraCtx.text,
  bitacoraFocused: true,
});
assert(prompt.promptMode === "bitacora_focused", "prompt mode bitacora_focused");

const sources = inferSourcesFromChat(chatContext, cases[0].q, "mock answer", {
  promptMode: "bitacora_focused",
});
assert(sources.includes("bitacora_ia.sessions"), "sources include bitacora_ia.sessions");
assert(sources.includes("bitacora_ia.context"), "sources include bitacora_ia.context");

const combinedSources = inferSourcesFromChat(chatContext, cases[6].q, "mock", {
  promptMode: "bitacora_focused",
  combinedDicf: true,
});
assert(combinedSources.includes("action_register.dicf_details"), "combined sources include dicf");

console.log("OK Sprint 2B routing —", cases.length, "casos");
console.log("bitacora_focused preview:\n", bitacoraCtx.text.slice(0, 400), "…");
