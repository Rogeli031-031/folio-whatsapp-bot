"use strict";

/**
 * Sprint 2D — entidades comerciales en Director IA chat (sin OpenAI ni BD).
 * node scripts/test-director-ia-comercial-entities-chat.js
 */

const {
  filterDicfDetailsByQuestion,
  buildFocusedDicfContext,
  buildBitacoraAnnex,
  buildDirectorIaChatPrompt,
  extractChatContextFromPayload,
  inferSourcesFromChat,
  textMatchesCommercialTokens,
} = require("../lib/director-ia-chat");

const {
  extractCommercialMentionsFromQuestion,
  buildCommercialEntitiesContextBlock,
  buildCommercialSearchTokens,
  normalizeCommercialName,
} = require("../lib/comercial-entidad");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const catalog = [
  {
    id: 1,
    planta_id: 5,
    nombre_canonico: "Tiberio González",
    notas: null,
    aliases: [
      {
        id: 10,
        entidad_id: 1,
        alias_nombre: "Carlos Juárez",
        alias_tipo: "operativo",
        fuente: "manual",
        verificado: true,
        created_at: "2026-05-01T00:00:00.000Z",
      },
    ],
  },
];

const question = "¿Qué sabemos de Carlos Juárez?";
const entidades = extractCommercialMentionsFromQuestion(catalog, question);
assert(entidades.length === 1, "detecta entidad por alias");
assert(entidades[0].nombre_canonico === "Tiberio González", "canónico Tiberio");
assert(entidades[0].matched_mention === "Carlos Juárez", "mención Carlos");
assert(entidades[0].match_type === "alias", "match_type alias");

const commercialResolution = {
  entidades,
  search_tokens: entidades.flatMap((e) => e.search_tokens),
  block: buildCommercialEntitiesContextBlock(entidades),
};

assert(commercialResolution.search_tokens.includes("Carlos Juárez"), "token Carlos");
assert(commercialResolution.search_tokens.includes("Tiberio González"), "token Tiberio");
assert(commercialResolution.block.includes("ENTIDADES COMERCIALES RELACIONADAS"), "bloque contexto");
assert(commercialResolution.block.includes("Carlos Juárez (operativo)"), "alias en bloque");
assert(commercialResolution.block.includes("arr.comercial_entidad_alias"), "fuente en bloque");

const dicfDetails = [
  {
    public_code: "D1",
    cliente_nombre: "Tiberio González",
    descripcion: "Seguimiento comercial Oaxaca",
    planta_label: "Oaxaca",
    estado: "hecho",
    cerrada: true,
    resultado_cierre: "Cliente activo con pedidos estacionales.",
    historial: [],
  },
  {
    public_code: "D2",
    cliente_nombre: "Otro Cliente SA",
    descripcion: "Otra acción",
    planta_label: "Oaxaca",
    estado: "pendiente",
    cerrada: false,
    historial: [],
  },
];

const filtered = filterDicfDetailsByQuestion(dicfDetails, question, commercialResolution);
assert(filtered.length === 1, "DICF filtrado a Tiberio");
assert(filtered[0].cliente_nombre === "Tiberio González", "DICF match canónico");

const chatContext = extractChatContextFromPayload({
  action_register: {
    ok: true,
    summary: { open: 1, closed: 0, overdue: 0 },
    executive_summary: { risk_level: "BAJO", findings: [] },
    temas: [],
    responsables: [],
    top_overdue: [],
    invalid_overdue: { count: 0, examples: [] },
    tema_details: [],
    dicf_details: dicfDetails,
  },
});

const dicfFocused = buildFocusedDicfContext(chatContext, question, commercialResolution);
assert(dicfFocused.text.includes("Tiberio González"), "focused DICF incluye canónico");
assert(!dicfFocused.text.includes("Otro Cliente SA"), "focused DICF excluye otro cliente");

const bitacora = [
  {
    fecha: "2026-05-01",
    tipo: "comercial",
    titulo: "Visita Oaxaca",
    resumen_ia: "Carlos Juárez comentó oportunidad de autotanque.",
    planta_nombre: "Oaxaca",
  },
  {
    fecha: "2026-05-02",
    tipo: "operaciones",
    titulo: "Otro tema",
    resumen_ia: "Sin relación comercial.",
    planta_nombre: "Oaxaca",
  },
];

const annex = buildBitacoraAnnex(bitacora, question, commercialResolution);
assert(annex.text.includes("Carlos Juárez"), "bitácora incluye sesión Carlos");
assert(!annex.text.includes("Sin relación comercial"), "bitácora excluye sesión irrelevante");

const prompt = buildDirectorIaChatPrompt(chatContext, question, {
  useFocused: true,
  focusedText: dicfFocused.text,
  dicfFocused: true,
  commercialEntitiesBlock: commercialResolution.block,
  commercialResolution,
});

assert(prompt.userContent.includes("ENTIDADES COMERCIALES RELACIONADAS"), "prompt con bloque");
assert(prompt.userContent.indexOf("ENTIDADES COMERCIALES") < prompt.userContent.indexOf("Tiberio González"), "bloque antes DICF");

const sources = inferSourcesFromChat(chatContext, question, "mock", {
  promptMode: "dicf_focused",
  commercialResolution,
});
assert(sources.includes("comercial_entidades.canonico"), "source canonico");
assert(sources.includes("comercial_entidades.alias"), "source alias");

assert(
  textMatchesCommercialTokens("Tiberio González — seguimiento", commercialResolution.search_tokens),
  "textMatchesCommercialTokens"
);
assert(normalizeCommercialName("Carlos Juárez") === "carlos juarez", "normalize");

console.log("OK Sprint 2D — entidades comerciales en chat (10 casos)");
console.log("\n=== Auditoría ejemplo ===");
console.log("Pregunta original:", question);
console.log("Entidad detectada:", entidades[0].entidad_id);
console.log("Alias encontrado:", entidades[0].matched_mention);
console.log("Nombre canónico:", entidades[0].nombre_canonico);
console.log("Tokens búsqueda:", commercialResolution.search_tokens.join(", "));
console.log("Fuentes:", sources.join(", "));
console.log("\n=== Bloque contexto ===\n");
console.log(commercialResolution.block);
