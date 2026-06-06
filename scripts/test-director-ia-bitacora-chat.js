"use strict";

/**
 * Pruebas Sprint 2B.1 — Bitácora como anexo (sin OpenAI ni BD).
 * Ejecutar: node scripts/test-director-ia-bitacora-chat.js
 */

const {
  isBitacoraQuestion,
  isDicfContextQuestion,
  isMejoraContinuaQuestion,
  buildDirectorIaChatPrompt,
  extractChatContextFromPayload,
  resolveDirectorIaChatRouting,
  inferSourcesFromChat,
  buildPlantDiagnosticUserPrefix,
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
];

const chatContext = extractChatContextFromPayload({
  bitacora: mockBitacora,
  action_register: {
    ok: true,
    summary: { open: 5, closed: 2, overdue: 1 },
    executive_summary: { risk_level: "MEDIO", findings: ["Mantenimiento con retrasos"] },
    temas: [{ name: "Mantenimiento", open_count: 5, closed_count: 1, overdue_count: 1, progress_percent: 40 }],
    responsables: [{ name: "Juan", open_count: 3, overdue_count: 1, role_name: "Gerente" }],
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
    name: "Riesgos Tehuacán",
    q: "¿Qué riesgos se identificaron en Tehuacán?",
    expectMode: "full",
    expectAnnex: true,
    expectPrimary: "action_register",
    forbidOnlyBitacora: true,
  },
  {
    name: "Clientes dejaron de comprar",
    q: "¿Qué clientes dejaron de comprar?",
    expectMode: "dicf_focused",
    expectAnnex: false,
    expectPrimary: "dicf",
  },
  {
    name: "Mantenimiento",
    q: "¿Cómo vamos en mantenimiento?",
    expectMode: "focused",
    expectAnnex: false,
    expectPrimary: "action_register",
  },
  {
    name: "Oportunidades Tehuacán",
    q: "¿Qué oportunidades se identificaron en Tehuacán?",
    expectMode: "full",
    expectAnnex: true,
    expectPrimary: "action_register",
    forbidOnlyBitacora: true,
  },
  {
    name: "Plan Maestro",
    q: "¿Cómo va el Plan Maestro?",
    expectMode: "mejora_continua",
    expectAnnex: false,
    mejora: true,
  },
  {
    name: "Combinado oportunidades + DICF",
    q: "¿Qué oportunidades vimos en Tehuacán y qué clientes dejaron de comprar?",
    expectMode: "dicf_focused",
    expectAnnex: true,
    expectPrimary: "dicf",
  },
];

for (const c of cases) {
  if (c.mejora) {
    const routing = resolveDirectorIaChatRouting(c.q, chatContext);
    assert(routing.promptMode === "mejora_continua", `${c.name}: mode`);
    continue;
  }

  const routing = resolveDirectorIaChatRouting(c.q, chatContext);
  assert(routing.promptMode === c.expectMode, `${c.name}: mode ${routing.promptMode} != ${c.expectMode}`);
  assert(Boolean(routing.hasBitacoraAnnex) === c.expectAnnex, `${c.name}: annex flag`);

  let promptOpts = { bitacoraAnnexText: null };
  if (routing.promptMode === "dicf_focused") {
    promptOpts = {
      useFocused: true,
      focusedText: "CONTEXTO DICF MOCK",
      dicfFocused: true,
      bitacoraAnnexText: c.expectAnnex ? "---\nANEXO — BITÁCORA IA (contexto de campo complementario)\nmock" : null,
    };
  } else if (routing.promptMode === "focused") {
    promptOpts = {
      useFocused: true,
      focusedText: "CONTEXTO AR MOCK",
      bitacoraAnnexText: null,
    };
  } else if (routing.promptMode === "full") {
    promptOpts = {
      bitacoraAnnexText: c.expectAnnex ? "---\nANEXO — BITÁCORA IA (contexto de campo complementario)\nmock" : null,
    };
    if (routing.plantDiagnostic) {
      promptOpts.plantDiagnostic = true;
      promptOpts.plantDiagnosticPrefix = buildPlantDiagnosticUserPrefix(chatContext);
    }
  }

  const prompt = buildDirectorIaChatPrompt(chatContext, c.q, promptOpts);
  assert(prompt.promptMode === c.expectMode, `${c.name}: prompt mode`);

  if (c.expectPrimary === "action_register") {
    assert(
      prompt.userContent.includes("Contexto operativo") || prompt.userContent.includes("Contexto focalizado"),
      `${c.name}: debe incluir AR`
    );
  }
  if (c.expectPrimary === "dicf") {
    assert(prompt.userContent.includes("DICF"), `${c.name}: debe incluir DICF`);
  }
  if (c.expectAnnex) {
    assert(prompt.userContent.includes("ANEXO — BITÁCORA IA"), `${c.name}: debe incluir anexo`);
  }
  if (c.forbidOnlyBitacora) {
    assert(!prompt.userContent.startsWith("Nota: No se encontró contexto"), `${c.name}: no fallback exclusivo`);
    assert(prompt.userContent.includes("Contexto operativo"), `${c.name}: AR en prompt`);
  }

  const sources = inferSourcesFromChat(chatContext, c.q, "mock", {
    promptMode: prompt.promptMode,
    hasBitacoraAnnex: prompt.hasBitacoraAnnex,
  });
  if (c.expectPrimary === "dicf") {
    assert(sources.includes("action_register.dicf_details"), `${c.name}: source dicf`);
  }
  if (c.expectPrimary === "action_register" && c.expectMode === "full") {
    assert(sources.includes("action_register.summary"), `${c.name}: source ar summary`);
  }
  if (c.expectAnnex) {
    assert(sources.includes("bitacora_ia.context"), `${c.name}: source bitacora`);
  }
  if (c.expectAnnex === false && c.expectMode !== "mejora_continua") {
    if (!c.q.includes("Plan Maestro")) {
      assert(!sources.includes("bitacora_ia.context") || c.expectMode === "full", `${c.name}: sin bitacora source`);
    }
  }
}

const q1 = cases[0].q;
const prompt1 = buildDirectorIaChatPrompt(chatContext, q1, {
  bitacoraAnnexText: `---\nANEXO — BITÁCORA IA (contexto de campo complementario)\nUsa Bitácora IA como contexto de campo complementario. No debe sustituir Action Register, DICF ni Mejora Continua.\nSolo resumen_ia.\n\nSESIONES RELEVANTES:\n\nFecha: 2026-05-10 | Tipo: visita_planta | Título: Visita Tehuacán\nPlanta: Tehuacán\nResumen: Riesgo de competencia en zona sur.`,
});

console.log("OK Sprint 2B.1 —", cases.length, "casos");
console.log("\n=== userContent Caso 1 (extracto) ===\n");
console.log(prompt1.userContent.slice(0, 900));
console.log("\n… [JSON AR completo] …\n");
console.log(prompt1.userContent.slice(-500));
