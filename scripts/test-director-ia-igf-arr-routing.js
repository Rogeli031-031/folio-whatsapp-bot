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
  isPlantFinancialKpiQuestion,
  resolveYearMonthFromQuestion,
} = require("../lib/director-ia-igf-arr");
const {
  buildDirectorIaChatPrompt,
  extractChatContextFromPayload,
  resolveDirectorIaChatRouting,
} = require("../lib/director-ia-chat");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(shouldAttachIgfArrAnnex("como se comporto el margen?"), "margen solo");
assert(isPlantFinancialKpiQuestion("como se comporto el margen?"), "kpi margen");

const ctxFin = extractChatContextFromPayload({
  bitacora: [
    {
      fecha: "2026-07-11",
      tipo: "visita_planta",
      titulo: "x",
      resumen_ia: "y",
      planta_nombre: "Puebla",
    },
  ],
  action_register: {
    ok: true,
    summary: { open: 1, closed: 0, overdue: 0 },
    executive_summary: { risk_level: "BAJO", findings: [] },
    temas: [],
    responsables: [],
    top_overdue: [],
    invalid_overdue: { count: 0, examples: [] },
    tema_details: [],
    dicf_details: [{ historial: [{ creado_en: "2026-05-01" }] }],
  },
});
assert(
  resolveDirectorIaChatRouting("como se comporto el margen?", ctxFin).promptMode === "igf_arr_focused",
  "margen → igf_arr_focused no bitácora"
);

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
  "---\nANEXO — IGF / ARR (KPIs de planta)\nCOMPARACION MARGEN $/kg\n- junio: 6.57\n- julio: 6.61\n- delta: +0.04\n";
const prompt = buildDirectorIaChatPrompt(ctx, "como se comporto el margen?", {
  igfArrFocused: true,
  useFocused: true,
  focusedText: annex,
});
assert(prompt.promptMode === "igf_arr_focused", "prompt mode focused");
assert(prompt.userContent.includes("COMPARACION MARGEN"), "margen en user");
assert(prompt.userContent.includes("6.57"), "cifra margen");

console.log("OK IGF/ARR annex routing + margen focused");
