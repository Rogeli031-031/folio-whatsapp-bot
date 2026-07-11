"use strict";

/**
 * Bitácora y DICF agrupados por mes (3 meses, más reciente primero).
 * node scripts/test-director-ia-bitacora-monthly.js
 */

const {
  buildBitacoraAnnex,
  buildFocusedDicfContext,
  buildMonthlyIntegratedContext,
  buildDirectorIaChatPrompt,
  extractChatContextFromPayload,
  formatBitacoraMonthlyBlocks,
  getRecentMonthKeysFromAnchor,
} = require("../lib/director-ia-chat");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert.deepStrictEqual = (a, b, msg) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || `expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`);
};

assert(
  getRecentMonthKeysFromAnchor("2026-07-11", 3).join(",") === "2026-07,2026-06,2026-05",
  "ventana 3 meses desde julio"
);

const sessions = [
  {
    fecha: "2026-07-11",
    tipo: "visita_planta",
    titulo: "Visita julio",
    resumen_ia: "Recuperación zona norte en julio.",
    planta_nombre: "Puebla",
  },
  {
    fecha: "2026-05-08",
    tipo: "visita_planta",
    titulo: "Visita mayo",
    resumen_ia: "Compromiso gas mayo.",
    planta_nombre: "Puebla",
  },
];

const monthly = formatBitacoraMonthlyBlocks(sessions, { anchorSessions: sessions }).join("\n");
assert(monthly.includes("--- JULIO 2026 ---"), "bloque julio");
assert(monthly.includes("--- JUNIO 2026 ---"), "bloque junio");
assert(monthly.includes("--- MAYO 2026 ---"), "bloque mayo");
assert(monthly.includes("(sin sesiones en este mes)"), "junio vacío");
assert(monthly.indexOf("JULIO") < monthly.indexOf("JUNIO"), "orden descendente");
assert(monthly.indexOf("JUNIO") < monthly.indexOf("MAYO"), "orden descendente");

const annex = buildBitacoraAnnex(sessions, "¿Qué comentó el gerente?", null, { prioritizeRecent: true });
assert(annex.text.includes("ÚLTIMOS 3 MESES"), "anexo mensual");

const chatContext = extractChatContextFromPayload({
  bitacora: sessions,
  action_register: {
    ok: true,
    summary: { open: 1, closed: 1, overdue: 0 },
    executive_summary: { risk_level: "BAJO", findings: [] },
    temas: [],
    responsables: [],
    top_overdue: [],
    invalid_overdue: { count: 0, examples: [] },
    tema_details: [],
    dicf_details: [
      {
        public_code: "P1",
        cliente_nombre: "Cliente Mayo",
        descripcion: "Gas mayo",
        planta_label: "Puebla",
        estado: "hecho",
        cerrada: true,
        resultado_cierre: "Cierre mayo.",
        historial: [{ evento: "cerrada", creado_en: "2026-05-13T00:00:00.000Z" }],
      },
      {
        public_code: "P2",
        cliente_nombre: "Cliente Julio",
        descripcion: "Seguimiento julio",
        planta_label: "Puebla",
        estado: "abierto",
        cerrada: false,
        historial: [{ evento: "creada", creado_en: "2026-07-02T00:00:00.000Z" }],
      },
    ],
  },
});

const dicf = buildFocusedDicfContext(chatContext, "¿Cómo van los clientes?");
assert(dicf.text.includes("--- JULIO 2026 ---"), "dicf julio");
assert(dicf.text.includes("--- MAYO 2026 ---"), "dicf mayo");
assert(dicf.text.includes("Cliente Julio"), "cliente julio en bloque");
assert(!dicf.text.includes("Cliente Abril"), "sin clientes fuera de ventana");

const integrated = buildMonthlyIntegratedContext(chatContext, "¿Cómo van los clientes?");
assert(integrated.text.includes("BITÁCORA IA"), "integrado bitácora");
assert(integrated.text.includes("DICF / CLIENTES"), "integrado dicf");
assert(integrated.text.includes("Cliente Mayo"), "integrado mayo dicf");

const prompt = buildDirectorIaChatPrompt(chatContext, "Resumen de clientes", {
  monthlyIntegrated: true,
  useFocused: true,
  focusedText: integrated.text,
});
assert(prompt.promptMode === "monthly_integrated", "prompt integrado");
assert(prompt.systemPrompt.includes("integra"), "system integrado");

console.log("OK bitácora/DICF agrupados por mes (3 meses)");
