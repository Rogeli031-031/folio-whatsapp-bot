"use strict";

const { buildExtractiveResumen, RESUMEN_IA_TRIGGER_CHARS, RESUMEN_IA_MAX_CHARS } = require("../lib/director-ia-bitacora");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const short = "Visita Tehuacán — resumen corto.";
assert(buildExtractiveResumen(short) === short, "contenido corto = resumen_ia igual");

const long = ["Párrafo uno de la visita.", "Segundo párrafo con más detalle comercial.", "Tercer bloque extenso " + "x".repeat(900)].join("\n\n");
const resumen = buildExtractiveResumen(long);
assert(resumen.length <= RESUMEN_IA_MAX_CHARS + 2, "resumen largo acotado");
assert(resumen.includes("Párrafo uno"), "incluye primer párrafo");

console.log("RESUMEN_IA_TRIGGER_CHARS:", RESUMEN_IA_TRIGGER_CHARS);
console.log("short resumen length:", buildExtractiveResumen(short).length);
console.log("long resumen length:", resumen.length);
console.log("OK buildExtractiveResumen");
