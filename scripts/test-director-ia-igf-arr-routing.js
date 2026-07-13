"use strict";

/**
 * Routing / detección anexo IGF+ARR (sin BD ni OpenAI).
 * node scripts/test-director-ia-igf-arr-routing.js
 */

const {
  shouldAttachIgfArrAnnex,
  isIgfForecastQuestion,
  isArrForecastQuestion,
  isDeltaClientesIgfQuestion,
  resolveYearMonthFromQuestion,
} = require("../lib/director-ia-igf-arr");
const { buildDirectorIaChatPrompt, extractChatContextFromPayload } = require("../lib/director-ia-chat");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isIgfForecastQuestion("¿Cómo va la utilidad IGF de Puebla?"), "igf utilidad");
assert(isArrForecastQuestion("¿Cuál es la proyección de venta ARR?"), "arr proyeccion");
assert(isDeltaClientesIgfQuestion("¿Qué clientes dejaron de comprar?"), "delta dejaron");
assert(shouldAttachIgfArrAnnex("margen $/kg IGF del forecast"), "margen+igf");
assert(!shouldAttachIgfArrAnnex("¿Cómo vamos en mantenimiento?"), "no mantenimiento");
assert(!shouldAttachIgfArrAnnex("quién es el responsable de oficinas"), "no oficinas");

const ym = resolveYearMonthFromQuestion("resumen IGF julio 2026", { year: 2026, month: 1 });
assert(ym.year === 2026 && ym.month === 7, `ym ${ym.year}-${ym.month}`);

const ctx = extractChatContextFromPayload({
  bitacora: [],
  action_register: {
    ok: true,
    summary: { open: 1, closed: 0, overdue: 0 },
    executive_summary: { risk_level: "BAJO", findings: [] },
    temas: [],
    responsables: [],
    top_overdue: [],
    invalid_overdue: { count: 0, examples: [] },
    tema_details: [],
    dicf_details: [],
  },
});

const annex =
  "---\nANEXO — IGF / ARR (KPIs de planta — complemento; no sustituye Bitácora, DICF ni Action Register)\nPlanta: Puebla\n";
const prompt = buildDirectorIaChatPrompt(ctx, "¿Cómo va el forecast IGF?", {
  includePlantSummaryPrefix: true,
  igfArrAnnexText: annex,
});
assert(prompt.hasIgfArrAnnex === true, "flag annex");
assert(prompt.userContent.includes("ANEXO — IGF / ARR"), "anexo en user");
assert(prompt.systemPrompt.includes("IGF / ARR") || prompt.systemPrompt.includes("ANEXO — IGF"), "addendum system");

console.log("OK IGF/ARR annex routing + prompt");
