"use strict";

/**
 * Pruebas locales Sprint 1 — contexto DICF en Director IA (sin OpenAI ni BD).
 * Ejecutar: node scripts/test-director-ia-dicf-context.js
 */

const {
  isDicfContextQuestion,
  buildFocusedDicfContext,
  extractChatContextFromPayload,
  buildDirectorIaChatPrompt,
  filterDicfDetailsByQuestion,
} = require("../lib/director-ia-chat");

const mockDicfDetails = [
  {
    dicf_id: 101,
    public_code: "ABC123",
    cliente_nombre: "Socorro Romero",
    descripcion: "Validar si la caída es estacional o estructural",
    planta_label: "Tehuacán",
    estado: "hecho",
    cerrada: true,
    fecha_compromiso: "2026-04-15",
    resultado_cierre:
      "Bajó la demanda por temporalidad, hace más calor y las granjas necesitan menos gas.",
    responsable: "Juan Pérez",
    cerrado_at: "2026-04-20T18:00:00.000Z",
    historial: [
      { evento: "creada", creado_en: "2026-04-01T10:00:00.000Z", actor_nombre: "Ana", detalle: { descripcion: "Validar caída" } },
      { evento: "fecha_compromiso", creado_en: "2026-04-02T11:00:00.000Z", actor_nombre: "Juan", detalle: { fecha: "2026-04-15" } },
      { evento: "cerrada", creado_en: "2026-04-20T18:00:00.000Z", actor_nombre: "Juan", detalle: { resultado_cierre: "Bajó la demanda por temporalidad, hace más calor y las granjas necesitan menos gas." } },
    ],
  },
  {
    dicf_id: 102,
    public_code: "DEF456",
    cliente_nombre: "Gustavo Nieto",
    descripcion: "Seguimiento por baja de volumen",
    planta_label: "Tehuacán",
    estado: "hecho",
    cerrada: true,
    fecha_compromiso: "2026-03-10",
    resultado_cierre: "Cliente confirmó pausa temporal por remodelación de granja.",
    responsable: "María López",
    cerrado_at: "2026-03-12T15:00:00.000Z",
    historial: [
      { evento: "creada", creado_en: "2026-03-01T09:00:00.000Z", actor_nombre: "Ana", detalle: null },
      { evento: "fecha_compromiso", creado_en: "2026-03-02T09:00:00.000Z", actor_nombre: "María", detalle: { fecha: "2026-03-10" } },
      { evento: "cerrada", creado_en: "2026-03-12T15:00:00.000Z", actor_nombre: "María", detalle: { resultado_cierre: "Cliente confirmó pausa temporal por remodelación de granja." } },
    ],
  },
  {
    dicf_id: 103,
    public_code: "GHI789",
    cliente_nombre: "Cliente Abierto SA",
    descripcion: "Recuperar volumen",
    planta_label: "Tehuacán",
    estado: "pendiente",
    cerrada: false,
    fecha_compromiso: "2026-05-25",
    resultado_cierre: null,
    responsable: "Pedro",
    cerrado_at: null,
    historial: [
      { evento: "creada", creado_en: "2026-05-01T09:00:00.000Z", actor_nombre: "Ana", detalle: null },
      { evento: "fecha_compromiso", creado_en: "2026-05-02T09:00:00.000Z", actor_nombre: "Pedro", detalle: { fecha: "2026-05-25" } },
    ],
  },
];

const chatContext = extractChatContextFromPayload({
  action_register: {
    ok: true,
    summary: { open: 1, closed: 2, overdue: 0 },
    executive_summary: { risk_level: "BAJO", findings: [] },
    temas: [],
    responsables: [],
    top_overdue: [],
    invalid_overdue: { count: 0, examples: [] },
    tema_details: [],
    dicf_details: mockDicfDetails,
  },
});

const cases = [
  {
    name: "Caso 1 — conclusión Socorro Romero",
    q: "¿Qué se concluyó sobre la caída de Socorro Romero?",
    assert: (text) =>
      text.includes("Socorro Romero") &&
      text.includes("Bajó la demanda por temporalidad") &&
      text.includes("Resultado de cierre"),
  },
  {
    name: "Caso 2 — cerradas recientemente",
    q: "¿Qué acciones DICF se cerraron recientemente?",
    assert: (text) => text.includes("CERRADA") && text.includes("ABC123") && text.includes("DEF456"),
  },
  {
    name: "Caso 3 — historial",
    q: "¿Qué historial tiene esta acción de Socorro Romero?",
    assert: (text) =>
      text.includes("creada") &&
      text.includes("fecha_compromiso") &&
      text.includes("cerrada"),
  },
  {
    name: "Caso 4 — aprendizaje clientes",
    q: "¿Qué aprendimos de los clientes que dejaron de comprar?",
    assert: (text) => text.includes("Resultado de cierre") && !text.includes("Cliente Abierto SA"),
  },
];

let failed = 0;
for (const c of cases) {
  const dicf = isDicfContextQuestion(c.q);
  const filtered = filterDicfDetailsByQuestion(chatContext.dicf_details, c.q);
  const focused = buildFocusedDicfContext(chatContext, c.q);
  const prompt = buildDirectorIaChatPrompt(chatContext, c.q, {
    useFocused: true,
    focusedText: focused.text,
    dicfFocused: true,
  });
  const ok = dicf && c.assert(focused.text);
  console.log(`${ok ? "OK" : "FAIL"} — ${c.name}`);
  console.log(`  isDicfContextQuestion: ${dicf} | matched: ${filtered.length} | promptMode: ${prompt.promptMode}`);
  if (!ok) {
    failed += 1;
    console.log("  --- context excerpt ---\n" + focused.text.split("\n").slice(0, 12).join("\n"));
  }
}

console.log("\nPayload ejemplo (1 acción):");
console.log(JSON.stringify(mockDicfDetails[0], null, 2));

if (failed > 0) {
  console.error(`\n${failed} prueba(s) fallida(s).`);
  process.exit(1);
}
console.log("\nTodas las pruebas locales pasaron.");
