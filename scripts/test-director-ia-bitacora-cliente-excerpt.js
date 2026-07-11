"use strict";

/**
 * Cliente en transcripción Plaud (min 7) debe aparecer aunque resumen_ia esté truncado.
 * node scripts/test-director-ia-bitacora-cliente-excerpt.js
 */

const {
  buildExtractiveResumen,
  extractBitacoraExcerptForSearch,
} = require("../lib/director-ia-bitacora");
const {
  buildMonthlyIntegratedContext,
  buildDirectorIaChatPrompt,
  extractChatContextFromPayload,
  expandQuestionFromChatHistory,
  extractLikelyClientNameTokensFromQuestion,
} = require("../lib/director-ia-chat");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const contenido = `00:00:24 Lzaragoza
José Alberto Lainez Pérez consiguió otro proveedor.
00:01:30 Lzaragoza
Romegas servicios energéticos, Romegas también veo una caída de 50 t.
00:07:04 Lzaragoza
Saúl Jonathan Carmona Hernández es el que me comentaste de las estaciones, el si son 60 toneladas que ya no compró, pero el porque el crédito es comisionista y no se le aprobó y aquí nos costó todo 60 toneladas.`;

const resumenViejo = contenido.slice(0, 1200);
const resumenNuevo = buildExtractiveResumen(contenido);
assert(resumenNuevo.includes("Saúl Jonathan") || resumenNuevo.includes("Saul Jonathan"), "resumen nuevo incluye Saúl");

const excerpt = extractBitacoraExcerptForSearch(contenido, ["SAUL JONATAN CARMONA HERNANDEZ"]);
assert(excerpt && excerpt.includes("60 toneladas"), "extracto Saul con 60 ton");

const names = extractLikelyClientNameTokensFromQuestion("SAUL JONATAN CARMONA HERNANDEZ");
assert(names.length > 0, "detecta nombre en mayúsculas");

const expanded = expandQuestionFromChatHistory("se habla de el en la junta o bitacora?", [
  { role: "user", content: "SAUL JONATAN CARMONA HERNANDEZ" },
]);
assert(expanded.includes("SAUL JONATAN"), "expande pronombre con historial");

const ctx = extractChatContextFromPayload({
  bitacora: [
    {
      fecha: "2026-07-11",
      tipo: "visita_planta",
      titulo: "Visita y seguimiento a clientes",
      resumen_ia: resumenViejo,
      contenido,
      planta_nombre: "Puebla",
    },
  ],
  action_register: {
    ok: true,
    summary: { open: 10, closed: 5, overdue: 2 },
    executive_summary: { risk_level: "ALTO", findings: [] },
    temas: [],
    responsables: [],
    top_overdue: [],
    invalid_overdue: { count: 0, examples: [] },
    tema_details: [],
    dicf_details: [],
  },
});

const integrated = buildMonthlyIntegratedContext(ctx, "SAUL JONATAN CARMONA HERNANDEZ");
assert(integrated.text.includes("60 toneladas"), "contexto integrado menciona 60t Saul");
assert(integrated.text.includes("CONSULTA POR CLIENTE"), "encabezado cliente");
assert(integrated.text.includes("PRIORIDAD"), "prioridad bitácora");

const promptClient = buildDirectorIaChatPrompt(ctx, "SAUL JONATAN CARMONA HERNANDEZ", {
  monthlyIntegrated: true,
  clientNameLookup: true,
  useFocused: true,
  focusedText: integrated.text,
});
assert(promptClient.userContent.includes("situación ACTUAL"), "regla causa actual");

console.log("OK bitácora — búsqueda cliente en transcripción completa");
