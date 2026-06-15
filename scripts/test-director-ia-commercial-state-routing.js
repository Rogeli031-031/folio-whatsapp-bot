"use strict";

/**
 * Sprint 2E — routing commercial_state vs dicf_focused (sin OpenAI ni BD).
 * node scripts/test-director-ia-commercial-state-routing.js
 */

const {
  resolveDirectorIaChatRouting,
  extractChatContextFromPayload,
  isCommercialStateListQuestion,
  isDicfActionQuestionForChat,
  isDicfContextQuestion,
  resolveCommercialStateCategory,
  inferSourcesFromChat,
  buildDirectorIaChatPrompt,
} = require("../lib/director-ia-chat");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

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
    dicf_details: [
      {
        dicf_id: 1,
        public_code: "X1",
        cliente_nombre: "Carlos Juárez",
        descripcion: "Seguimiento caída",
        planta_label: "Tehuacán",
        estado: "hecho",
        cerrada: true,
        resultado_cierre: "Cliente pausó por remodelación.",
        historial: [{ evento: "cerrada", creado_en: "2026-04-01T00:00:00.000Z" }],
      },
      {
        dicf_id: 2,
        public_code: "X2",
        cliente_nombre: "Otro Cliente",
        descripcion: "Acción dejaron",
        planta_label: "Tehuacán",
        estado: "hecho",
        cerrada: true,
        resultado_cierre: "Baja estacional.",
        historial: [],
      },
    ],
  },
});

const cases = [
  {
    id: "A",
    q: "¿Qué clientes dejaron de comprar?",
    expectMode: "commercial_state",
    expectCategory: "dejaron",
    expectCommercialList: true,
    expectDicfAction: false,
  },
  {
    id: "B",
    q: "¿Qué clientes aumentaron?",
    expectMode: "commercial_state",
    expectCategory: "aumentaron",
    expectCommercialList: true,
    expectDicfAction: false,
  },
  {
    id: "C",
    q: "¿Qué clientes nuevos tenemos?",
    expectMode: "commercial_state",
    expectCategory: "nuevos",
    expectCommercialList: true,
    expectDicfAction: false,
  },
  {
    id: "D",
    q: "¿Qué acciones se han hecho con clientes que dejaron de comprar?",
    expectMode: "dicf_focused",
    expectCategory: null,
    expectCommercialList: false,
    expectDicfAction: true,
  },
  {
    id: "E",
    q: "¿Qué pasó con Carlos Juárez?",
    expectMode: "dicf_focused",
    expectCategory: null,
    expectCommercialList: false,
    expectDicfAction: true,
  },
];

let failed = 0;

for (const c of cases) {
  const routing = resolveDirectorIaChatRouting(c.q, chatContext);
  const commercialList = isCommercialStateListQuestion(c.q);
  const dicfAction = isDicfActionQuestionForChat(c.q);
  const dicfBroad = isDicfContextQuestion(c.q);
  const category = resolveCommercialStateCategory(c.q);

  const ok =
    routing.promptMode === c.expectMode &&
    commercialList === c.expectCommercialList &&
    dicfAction === c.expectDicfAction &&
    (c.expectCategory == null || category === c.expectCategory) &&
    (c.expectMode !== "commercial_state" || routing.commercialCategory === c.expectCategory);

  console.log(`${ok ? "OK" : "FAIL"} — Caso ${c.id}: ${c.q}`);
  console.log(
    `  routing=${routing.promptMode} | commercialList=${commercialList} | dicfAction=${dicfAction} | dicfBroad=${dicfBroad} | category=${category}`
  );

  if (c.expectMode === "commercial_state") {
    const prompt = buildDirectorIaChatPrompt(chatContext, c.q, {
      useFocused: true,
      focusedText: "(mock estado comercial)",
      commercialStateFocused: true,
      commercialCategory: c.expectCategory,
    });
    const sources = inferSourcesFromChat(chatContext, c.q, "(mock)", {
      promptMode: "commercial_state",
      commercialCategory: c.expectCategory,
    });
    assert(prompt.promptMode === "commercial_state", `Caso ${c.id}: promptMode commercial_state`);
    assert(sources.includes("commercial_state.dicf_compute"), `Caso ${c.id}: source compute`);
    assert(sources.includes(`commercial_state.${c.expectCategory}`), `Caso ${c.id}: source categoría`);
  }

  if (c.expectMode === "dicf_focused") {
    const prompt = buildDirectorIaChatPrompt(chatContext, c.q, {
      useFocused: true,
      focusedText: "(mock dicf)",
      dicfFocused: true,
    });
    assert(prompt.promptMode === "dicf_focused", `Caso ${c.id}: promptMode dicf_focused`);
  }

  if (!ok) failed += 1;
}

assert(!isCommercialStateListQuestion("¿Qué aprendimos de los clientes que dejaron de comprar?"), "aprendimos → no lista");
assert(isDicfActionQuestionForChat("¿Qué aprendimos de los clientes que dejaron de comprar?"), "aprendimos → dicf acción");
assert(
  resolveDirectorIaChatRouting("¿Qué aprendimos de los clientes que dejaron de comprar?", chatContext).promptMode ===
    "dicf_focused",
  "aprendimos → dicf_focused routing"
);

if (failed > 0) {
  console.error(`\n${failed} prueba(s) fallida(s).`);
  process.exit(1);
}

console.log("\nOK Sprint 2E — routing commercial_state vs dicf_focused (5 casos A–E + regresión aprendimos).");
