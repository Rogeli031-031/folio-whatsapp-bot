"use strict";

/**
 * Director IA v2 Fase 1 — catálogo y detección de dominios no integrados.
 * node scripts/test-director-ia-capabilities.js
 */

const {
  getDirectorIaCapability,
  listDirectorIaCapabilities,
  isDirectorIaDomainReadable,
  buildDirectorIaCapabilitiesSummary,
  detectUnsupportedDirectorIaDomain,
  buildUnsupportedDomainChatResult,
  SOURCE_NOT_INTEGRATED,
  DIRECTOR_IA_VERACITY,
} = require("../lib/director-ia-capabilities");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function expectBlocked(question, domainId) {
  const cap = detectUnsupportedDirectorIaDomain(question);
  assert(cap, `"${question}" debería bloquearse`);
  assert(cap.id === domainId, `"${question}" → ${domainId}, got ${cap && cap.id}`);
  assert(cap.canRead === false, `"${question}" dominio debe canRead=false`);
  const result = buildUnsupportedDomainChatResult(cap, { planta_id: 1 });
  assert(result.ok === true, "limitation result ok");
  assert(Array.isArray(result.sources) && result.sources.length === 0, "sources vacío");
  assert(result.context_meta && result.context_meta.mode === "capability_limitation", "mode");
  assert(result.context_meta.openai_called === false, "openai_called false");
  assert(result.context_meta.requested_domain === domainId, "requested_domain");
  assert(result.limitation && result.limitation.code === SOURCE_NOT_INTEGRATED, "limitation code");
  assert(
    /todavía no está integrado/i.test(result.answer) || /no está integrado/i.test(result.answer),
    "answer honesta"
  );
  assert(!/no existe/i.test(result.answer), "no afirmar que el dato no existe");
}

function expectAllowed(question) {
  const cap = detectUnsupportedDirectorIaDomain(question);
  assert(cap == null, `"${question}" debería permitirse, got ${cap && cap.id}`);
}

let failed = 0;
const cases = [
  () => {
    const all = listDirectorIaCapabilities();
    assert(all.length >= 28, `catálogo incompleto: ${all.length}`);
    assert(getDirectorIaCapability("action_register"), "action_register");
    assert(isDirectorIaDomainReadable("action_register") === true, "AR readable");
    assert(isDirectorIaDomainReadable("duplicados") === true, "duplicados readable");
    assert(isDirectorIaDomainReadable("proyectos") === true, "proyectos readable");
    assert(isDirectorIaDomainReadable("dashboard_kpis") === true, "dashboard_kpis readable");
    assert(isDirectorIaDomainReadable("delta_venta") === true, "delta_venta readable");
    assert(isDirectorIaDomainReadable("delta_descuento") === true, "delta_descuento readable");
    assert(isDirectorIaDomainReadable("delta_ingreso") === true, "delta_ingreso readable");
    assert(isDirectorIaDomainReadable("kanban") === false, "kanban not readable");
    assert(isDirectorIaDomainReadable("folio_historial") === false, "historial not readable");
    const summary = buildDirectorIaCapabilitiesSummary();
    assert(summary.readable.length > 0, "summary readable");
    assert(summary.not_integrated.length > 0, "summary not_integrated");
    assert(DIRECTOR_IA_VERACITY.SOURCE_NOT_INTEGRATED === "SOURCE_NOT_INTEGRATED", "const");
  },
  () => expectBlocked("¿En qué etapa está el folio 123?", "kanban"),
  () => expectBlocked("¿Cuál fue el último movimiento del folio 456?", "folio_historial"),
  () => expectBlocked("¿Qué documentos le faltan?", "documentos"),
  () => expectBlocked("¿Ya tiene póliza?", "polizas"),
  () => expectBlocked("¿Tiene cheque o depósito?", "cheques"),
  () => expectBlocked("¿Cómo va el presupuesto semanal?", "presupuestos"),
  () => expectAllowed("¿Existen folios duplicados?"),
  () => expectAllowed("¿Hay folios duplicados?"),
  () => expectAllowed("¿Qué proyectos están retrasados?"),
  () => expectAllowed("¿Cuáles son los kpis del dashboard?"),
  () => expectAllowed("¿Cómo cambió la venta?"),
  () => expectAllowed("¿Cómo cambió el descuento?"),
  () => expectAllowed("¿Cómo cambió el ingreso?"),
  () => expectBlocked("¿Qué inversiones están pendientes?", "inversiones"),
  () => expectAllowed("¿Qué acciones están vencidas?"),
  () => expectAllowed("¿Cómo va ARR?"),
  () => expectAllowed("¿Cómo va IGF?"),
  () => expectAllowed("¿Qué comentarios hay del folio?"),
  () => expectAllowed("¿Qué dice la bitácora?"),
  () => expectAllowed("¿Qué comentarios hay del cliente?"),
  () => expectAllowed("¿Qué clientes dejaron de comprar?"),
  () => expectAllowed("cómo va la planta"),
  () => expectAllowed("folio 123"),
  () => expectAllowed("háblame del folio"),
];

for (let i = 0; i < cases.length; i++) {
  try {
    cases[i]();
    console.log(`OK  ${i + 1}/${cases.length}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${i + 1}/${cases.length}: ${e.message}`);
  }
}

if (failed > 0) {
  console.error(`\nFallaron ${failed} caso(s).`);
  process.exit(1);
}
console.log(`\nTodos los ${cases.length} casos pasaron.`);
process.exit(0);
