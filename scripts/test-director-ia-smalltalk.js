"use strict";

/**
 * Smalltalk / ayuda conversacional Director IA (modal AR).
 * node scripts/test-director-ia-smalltalk.js
 */

const {
  classifyConversationalIntent,
  buildConversationalAnswer,
  conversationalPromptMode,
  isNarrativeQuestion,
  isDicfContextQuestion,
  resolveDirectorIaChatRouting,
  extractChatContextFromPayload,
} = require("../lib/director-ia-chat");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const chatContext = extractChatContextFromPayload({
  action_register: {
    ok: true,
    summary: { open: 10, closed: 2, overdue: 3 },
    executive_summary: { risk_level: "MEDIO", findings: [] },
    temas: [],
    responsables: [],
    top_overdue: [],
    invalid_overdue: { count: 0, examples: [] },
    tema_details: [],
    dicf_details: [
      {
        public_code: "D1",
        cliente_nombre: "Cliente X",
        descripcion: "Caída",
        planta_label: "Morelos",
        estado: "hecho",
        cerrada: true,
        resultado_cierre: "Estacional",
        historial: [],
      },
    ],
  },
});

const cases = [
  { q: "hola", mode: "smalltalk" },
  { q: "Buenos días", mode: "smalltalk" },
  { q: "qué tal", mode: "smalltalk" },
  { q: "qué puedes hacer", mode: "help" },
  { q: "ayuda", mode: "help" },
  { q: "cómo me puedes ayudar", mode: "help" },
  { q: "gracias", mode: "thanks" },
  { q: "ok", mode: "thanks" },
  { q: "entendido", mode: "thanks" },
];

for (const { q, mode } of cases) {
  const intent = classifyConversationalIntent(q);
  assert(intent && intent.mode === mode, `"${q}" → ${mode}, got ${intent?.mode || "null"}`);
  const answer = buildConversationalAnswer(mode, "Morelos");
  assert(answer && answer.length > 20, `"${q}" debe generar respuesta`);
  assert(conversationalPromptMode(mode) === (mode === "help" ? "help" : "smalltalk"), `prompt_mode ${q}`);
}

const greeting = buildConversationalAnswer("smalltalk", "Morelos");
assert(greeting.includes("Hola, soy Director IA"), "saludo estándar");
assert(greeting.includes("Morelos"), "saludo incluye planta");
assert(greeting.includes("DICF"), "saludo menciona DICF");

const help = buildConversationalAnswer("help", "Acapulco");
assert(help.includes("¿Cómo va mantenimiento?"), "ayuda incluye ejemplo mantenimiento");
assert(help.includes("¿Qué clientes dejaron de comprar?"), "ayuda incluye ejemplo DICF/clientes");

const thanks = buildConversationalAnswer("thanks", "Puebla");
assert(thanks.includes("Con gusto"), "gracias respuesta breve");

const notConvo = [
  "cómo va mantenimiento",
  "qué clientes dejaron de comprar",
  "hola, cómo va mantenimiento",
  "¿Cuáles son los riesgos de la planta?",
];
for (const q of notConvo) {
  assert(!classifyConversationalIntent(q), `"${q}" no debe ser conversacional`);
}

assert(isNarrativeQuestion("cómo va mantenimiento"), "mantenimiento sigue siendo narrativa");
assert(isDicfContextQuestion("qué clientes dejaron de comprar"), "clientes comprar sigue siendo DICF");

const routingMaint = resolveDirectorIaChatRouting("cómo va mantenimiento", chatContext);
assert(routingMaint.promptMode === "focused", "mantenimiento → focused AR");

const routingDicf = resolveDirectorIaChatRouting("qué clientes dejaron de comprar", chatContext);
assert(routingDicf.dicfFocused === true, "clientes comprar → DICF");

console.log("OK — test-director-ia-smalltalk (" + cases.length + " casos conversacionales + regresión AR/DICF)");
