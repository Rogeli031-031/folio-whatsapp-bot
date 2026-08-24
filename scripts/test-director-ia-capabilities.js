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

function expectBlocked(question, domainId, opts = {}) {
  const cap = detectUnsupportedDirectorIaDomain(question);
  assert(cap, `"${question}" debería bloquearse`);
  assert(cap.id === domainId, `"${question}" → ${domainId}, got ${cap && cap.id}`);
  if (opts.requireCanReadFalse !== false) {
    assert(cap.canRead === false, `"${question}" dominio debe canRead=false`);
  }
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
    assert(isDirectorIaDomainReadable("kanban") === true, "kanban readable (estatus/etapa)");
    assert(isDirectorIaDomainReadable("folios") === true, "folios readable (estatus/etapa)");
    assert(isDirectorIaDomainReadable("folio_historial") === true, "historial readable");
    assert(isDirectorIaDomainReadable("documentos") === true, "documentos metadata readable");
    assert(isDirectorIaDomainReadable("gastos") === true, "gastos query readable");
    assert(isDirectorIaDomainReadable("inversiones") === true, "inversiones query readable");
    assert(isDirectorIaDomainReadable("clasificacion_apoyos") === true, "clasificacion query readable");
    assert(isDirectorIaDomainReadable("presupuestos") === true, "presupuestos query readable");
    assert(isDirectorIaDomainReadable("revision_notes") === true, "revision_notes readable");
    assert(isDirectorIaDomainReadable("commercial_dossier") === true, "commercial_dossier readable");
    const summary = buildDirectorIaCapabilitiesSummary();
    assert(summary.readable.length > 0, "summary readable");
    assert(summary.not_integrated.length > 0, "summary not_integrated");
    assert(DIRECTOR_IA_VERACITY.SOURCE_NOT_INTEGRATED === "SOURCE_NOT_INTEGRATED", "const");
  },
  () => expectAllowed("¿En qué etapa está el folio 123?"),
  () => expectAllowed("listar folios de la planta"),
  () => expectAllowed("folios en evidencias"),
  () => expectAllowed("¿Cuál fue el último movimiento del folio 456?"),
  () => expectAllowed("¿Quién movió el folio 123?"),
  () => expectAllowed("listar documentos del folio 123"),
  () => expectAllowed("qué documentos tiene el folio 123"),
  () => expectAllowed("registros documentales del folio 123"),
  () => expectBlocked("¿Qué documentos le faltan?", "documentos", { requireCanReadFalse: false }),
  () => expectBlocked("muéstrame el PDF del folio 123", "documentos", { requireCanReadFalse: false }),
  () => expectBlocked("contenido del documento del folio 123", "documentos", { requireCanReadFalse: false }),
  () => expectBlocked("¿Ya tiene póliza?", "polizas"),
  () => expectBlocked("¿Tiene cheque o depósito?", "cheques"),
  () => expectAllowed("¿Cómo va el presupuesto semanal?"),
  () => expectAllowed("mi presupuesto"),
  () => expectAllowed("cómo va el carro de presupuesto"),
  () => expectBlocked("asignar presupuesto", "presupuestos", { requireCanReadFalse: false }),
  () => expectBlocked("seleccionar folios del presupuesto semanal", "presupuestos", { requireCanReadFalse: false }),
  () => expectAllowed("¿Existen folios duplicados?"),
  () => expectAllowed("¿Hay folios duplicados?"),
  () => expectAllowed("¿Qué proyectos están retrasados?"),
  () => expectAllowed("¿Cuáles son los kpis del dashboard?"),
  () => expectAllowed("¿Cómo cambió la venta?"),
  () => expectAllowed("¿Cómo cambió el descuento?"),
  () => expectAllowed("¿Cómo cambió el ingreso?"),
  () => expectAllowed("¿Qué gastos de folios existen?"),
  () => expectAllowed("¿Qué inversiones están pendientes?"),
  () => expectAllowed("listar gastos de folios 2026-01"),
  () => expectAllowed("cómo van los gastos"),
  () => expectBlocked("exportar excel de gastos de folios", "gastos", { requireCanReadFalse: false }),
  () => expectBlocked("exportar excel de inversiones", "inversiones", { requireCanReadFalse: false }),
  () => expectAllowed("clasificación de apoyos 2026-01 2026-02"),
  () => expectAllowed("comparativo de clasificación 2026-01 vs 2026-02"),
  () => expectBlocked("exportar excel de clasificación de apoyos", "clasificacion_apoyos", { requireCanReadFalse: false }),
  () => expectBlocked("comparar clasificación contra excel", "clasificacion_apoyos", { requireCanReadFalse: false }),
  () => expectAllowed("¿Qué dicen las notas de la última revisión?"),
  () => expectAllowed("notas de revisión 2026-08-20"),
  () => expectAllowed("¿Qué acciones están vencidas?"),
  () => expectAllowed("¿Cómo va ARR?"),
  () => expectAllowed("¿Cómo va IGF?"),
  () => expectAllowed("¿Qué comentarios hay del folio?"),
  () => expectAllowed("¿Qué dice la bitácora?"),
  () => expectAllowed("¿Qué comentarios hay del cliente?"),
  () => expectAllowed("¿Qué clientes dejaron de comprar?"),
  () => expectAllowed("Dame el expediente comercial de Acme"),
  () => expectAllowed("Muéstrame estado, comentarios y acciones de Acme"),
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
