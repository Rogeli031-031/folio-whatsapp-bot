"use strict";

/**
 * Sprint 2B.2 — integridad contextual Director IA.
 * node scripts/test-director-ia-context-integrity.js
 */

const {
  isPlantDiagnosticQuestion,
  isMejoraContinuaQuestion,
  isDicfContextQuestion,
  resolveNarrativeFocus,
  resolveDirectorIaChatRouting,
  buildFocusedNarrativeContext,
  buildDirectorIaChatPrompt,
  buildPlantDiagnosticUserPrefix,
  formatActionsExecutiveSection,
  extractChatContextFromPayload,
  inferSourcesFromChat,
} = require("../lib/director-ia-chat");

const chatContext = extractChatContextFromPayload({
  bitacora: [{ fecha: "2026-05-01", tipo: "visita_planta", titulo: "Visita", resumen_ia: "Nota", planta_nombre: "Morelos" }],
  action_register: {
    ok: true,
    summary: { open: 36, closed: 10, overdue: 32 },
    executive_summary: {
      risk_level: "ALTO",
      findings: ["Mantenimiento con retrasos", "32 acciones vencidas"],
    },
    temas: [{ name: "General", open_count: 0, closed_count: 2, overdue_count: 0, progress_percent: 100 }],
    responsables: [{ name: "Juan", open_count: 5, overdue_count: 3, role_name: "Gerente" }],
    top_overdue: [
      { id: 1, titulo: "Pintura barda", tema: "Mantenimiento", dias_vencido: 45, prioridad: "ALTA" },
    ],
    invalid_overdue: { count: 0, examples: [] },
    tema_details: [
      {
        tema: "Mantenimiento",
        open_count: 20,
        overdue_count: 15,
        responsables: [],
        open_actions: [{ id: 2, title: "Iluminación patio", responsable: "Ana", dias_vencido: 10, role_name: "Sup" }],
      },
    ],
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

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const qRiesgos =
  "¿Cuáles son los tres riesgos más importantes de la planta y qué debería hacer el gerente general esta semana?";

assert(isPlantDiagnosticQuestion(qRiesgos), "pregunta riesgos = plant diagnostic");
assert(!isMejoraContinuaQuestion(qRiesgos), "no es mejora continua");

const routingRiesgos = resolveDirectorIaChatRouting(qRiesgos, chatContext);
assert(routingRiesgos.promptMode === "full", "riesgos → full, no focused");
assert(routingRiesgos.plantDiagnostic === true, "riesgos → plantDiagnostic");

const prefix = buildPlantDiagnosticUserPrefix(chatContext);
assert(prefix.includes("Acciones abiertas: 36"), "prefijo incluye 36 abiertas");
assert(prefix.includes("Acciones vencidas"), "prefijo incluye vencidas");
assert(prefix.includes("Nivel de riesgo ejecutivo: ALTO"), "prefijo incluye riesgo");

const promptRiesgos = buildDirectorIaChatPrompt(chatContext, qRiesgos, {
  plantDiagnostic: true,
  plantDiagnosticPrefix: prefix,
});
assert(promptRiesgos.promptMode === "full", "prompt mode full");
assert(promptRiesgos.userContent.includes("Acciones abiertas: 36"), "userContent tiene 36 abiertas");
assert(promptRiesgos.userContent.includes('"open": 36'), "userContent tiene JSON summary");
assert(
  !promptRiesgos.userContent.includes("(ninguna acción abierta registrada)"),
  "no frase negativa absoluta"
);
assert(
  !promptRiesgos.userContent.includes("No hay acciones coincidentes") ||
    promptRiesgos.userContent.includes("Acciones abiertas: 36"),
  "si hay filtro vacío, también hay resumen global"
);

const qMorelos = "¿Qué está pasando en Morelos?";
const routingMorelos = resolveDirectorIaChatRouting(qMorelos, chatContext);
assert(routingMorelos.plantDiagnostic === true, "Morelos diagnóstico");
const promptMorelos = buildDirectorIaChatPrompt(chatContext, qMorelos, {
  plantDiagnostic: true,
  plantDiagnosticPrefix: buildPlantDiagnosticUserPrefix(chatContext),
});
assert(promptMorelos.userContent.includes("Acciones abiertas: 36"), "Morelos incluye conteos");

const emptySection = formatActionsExecutiveSection([], { filterLabel: "tema General" });
assert(
  emptySection.includes("No hay acciones coincidentes con esta consulta específica"),
  "mensaje filtro vacío correcto"
);
assert(!emptySection.includes("ninguna acción abierta registrada"), "sin frase antigua");

const focused = buildFocusedNarrativeContext(chatContext, "¿Cómo vamos en mantenimiento?");
assert(focused.text.includes("RESUMEN GLOBAL DE PLANTA"), "focused incluye resumen global");
assert(focused.text.includes("Acciones abiertas: 36"), "focused incluye 36");

const focusGerente = resolveNarrativeFocus(qRiesgos, chatContext);
assert(!(focusGerente && focusGerente.type === "tema" && focusGerente.tema === "General"), "gerente general no → tema General");

const qDicf = "¿Qué clientes dejaron de comprar?";
const routingDicf = resolveDirectorIaChatRouting(qDicf, chatContext);
assert(routingDicf.promptMode === "dicf_focused", "DICF sigue funcionando");

const qMc = "¿Cómo va el Plan Maestro?";
assert(resolveDirectorIaChatRouting(qMc, chatContext).promptMode === "mejora_continua", "MC exclusiva");

const sources = inferSourcesFromChat(chatContext, qRiesgos, "mock", {
  promptMode: "full",
  hasBitacoraAnnex: false,
});
assert(sources.includes("action_register.summary"), "sources AR");
assert(sources.includes("action_register.executive_summary"), "sources executive");

console.log("OK Sprint 2B.2 — integridad contextual (8 casos)");
console.log("\n=== Prompt riesgos (extracto) ===\n");
console.log(promptRiesgos.userContent.slice(0, 1200));
console.log("\n…\n");
