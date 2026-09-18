"use strict";

const FAMILY_IDS = Object.freeze([
  "EXPECTED_NEXT_PURCHASE_ENRICHED",
  "LAST_PURCHASE",
  "PURCHASE_FREQUENCY",
  "PURCHASE_OVERDUE",
]);

const EXPECTED_NEXT_ENRICHED = Object.freeze([
  "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
  "¿Cuándo debería volver a comprar TORTILLERIA ERICK?",
  "¿Cuándo le toca comprar otra vez a TORTILLERIA ERICK?",
  "¿Cuál sería su siguiente compra de TORTILLERIA ERICK?",
  "¿Cuándo esperamos su próximo pedido de TORTILLERIA ERICK?",
  "¿Cuándo compraría otra vez TORTILLERIA ERICK según su frecuencia?",
  "¿Cuándo debería regresar TORTILLERIA ERICK?",
  "¿Cuándo vence su ciclo de compra de TORTILLERIA ERICK?",
  "¿Cuándo se esperaba que comprara TORTILLERIA ERICK?",
  "¿Cuándo vuelve a comprar TORTILLERIA ERICK?",
  "¿Cuándo le toca pedir otra vez a TORTILLERIA ERICK?",
  "¿Cuál es la próxima compra estimada de TORTILLERIA ERICK?",
  "¿Cuándo cae la siguiente compra de TORTILLERIA ERICK?",
  "¿Cuándo esperamos que compre otra vez TORTILLERIA ERICK?",
  "Próxima compra de TORTILLERIA ERICK.",
  "Siguiente pedido de TORTILLERIA ERICK.",
  "¿Cuándo volvería a comprar TORTILLERIA ERICK?",
  "Fecha esperada de compra de TORTILLERIA ERICK.",
  "¿Cuándo debería comprar otra vez TORTILLERIA ERICK?",
  "¿Cuándo esperamos que vuelva a comprar Tortillería Erick?",
  "¿Cuándo esperamos que vuelva a comprar tortilleria erick?",
  "Expected next purchase de TORTILLERIA ERICK.",
  "¿Cuándo debería hacer pedido TORTILLERIA ERICK?",
  "Ventana histórica de compra de TORTILLERIA ERICK.",
  "¿Cuándo le toca comprar a TORTILLERIA ERICK según su historial?",
  "¿Para qué fecha se esperaba la compra de TORTILLERIA ERICK?",
  "¿Cuándo normalmente compra otra vez TORTILLERIA ERICK?",
  "Calendario estimado de TORTILLERIA ERICK.",
  "¿Cuándo caería la siguiente compra de TORTILLERIA ERICK?",
  "¿Cuándo esperamos la siguiente compra de TORTILLERIA ERICK?",
]);

const EVIDENCE_DETAIL = Object.freeze([
  "¿Cuál fue la última compra de TORTILLERIA ERICK?",
  "¿Cuándo compró por última vez TORTILLERIA ERICK?",
  "¿Qué día compró por última vez TORTILLERIA ERICK?",
  "¿Cuál es la fecha de la última compra de TORTILLERIA ERICK?",
  "¿Cada cuántos días compra TORTILLERIA ERICK?",
  "¿Qué frecuencia tiene TORTILLERIA ERICK?",
  "¿Con qué frecuencia compra TORTILLERIA ERICK?",
  "¿Cuál es su frecuencia de TORTILLERIA ERICK?",
  "¿Está atrasada TORTILLERIA ERICK?",
  "¿Cuántos días lleva sin comprar TORTILLERIA ERICK?",
  "¿Cuándo debería haber comprado otra vez TORTILLERIA ERICK?",
  "¿Se pasó de su frecuencia TORTILLERIA ERICK?",
  "Última compra de Tortillería Erick.",
  "Frecuencia de tortilleria erick.",
  "¿Está atrasada Tortillería Erick?",
  "¿Cuántos días sin comprar tiene TORTILLERIA ERICK?",
  "¿Cuál fue su última compra de TORTILLERIA ERICK?",
  "¿Cada cuántos días compra Tortillería Erick?",
  "¿Cuándo debería haber comprado TORTILLERIA ERICK?",
  "Días sin comprar de TORTILLERIA ERICK.",
]);

const ANTI_COLLISIONS = Object.freeze([
  { q: "¿Cuánto gastamos en taller de enero a septiembre?", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "¿Cómo estamos en regulaciones?", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "¿Qué comisión tenemos en Casa?", not_family: "LAST_PURCHASE" },
  { q: "¿Cuántos clientes nuevos hubo?", not_family: "PURCHASE_FREQUENCY" },
  { q: "¿Cuál es el forecast de TORTILLERIA ERICK?", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "Pronóstico contractual de TORTILLERIA ERICK", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "¿Cuánto proyectamos que compre TORTILLERIA ERICK?", not_family: "LAST_PURCHASE" },
  { q: "¿Cómo estamos en SEH?", not_family: "PURCHASE_OVERDUE" },
  { q: "¿Qué acciones están vencidas?", not_family: "PURCHASE_OVERDUE" },
  { q: "¿Está atrasado el Action Register?", not_family: "PURCHASE_OVERDUE" },
  { q: "¿Cuándo vence el extintor de planta?", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "¿Cuánto vendimos de enero a septiembre?", not_family: "LAST_PURCHASE" },
  { q: "Top clientes de enero", not_family: "PURCHASE_FREQUENCY" },
  { q: "¿Cuál es la comisión general?", not_family: "LAST_PURCHASE" },
  { q: "abre la venta diaria", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "¿Cuánto gastamos en taller?", not_family: "PURCHASE_OVERDUE" },
  { q: "Clientes nuevos de agosto", not_family: "LAST_PURCHASE" },
  { q: "¿Quiénes dejaron de comprar?", not_family: "PURCHASE_FREQUENCY" },
  { q: "¿Cómo va Taller?", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "Resumen de SEH.", not_family: "LAST_PURCHASE" },
  { q: "¿Qué documentos están vigentes?", not_family: "PURCHASE_OVERDUE" },
  { q: "¿Cuánto pesa Casa?", not_family: "PURCHASE_FREQUENCY" },
  { q: "Brief ejecutivo diario", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "¿Cómo cerramos el mes?", not_family: "LAST_PURCHASE" },
  { q: "¿Cuál es el margen de enero?", not_family: "PURCHASE_FREQUENCY" },
  { q: "Gasto operativo IGF", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "¿Cuántos folios de taller hay?", not_family: "LAST_PURCHASE" },
  { q: "¿Cómo vamos de IGF?", not_family: "PURCHASE_OVERDUE" },
  { q: "¿Cómo vamos de ARR?", not_family: "PURCHASE_FREQUENCY" },
  { q: "Diagnóstico de planta", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "¿Cuándo esperamos el forecast?", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "Cierre proyectado de TORTILLERIA ERICK", not_family: "LAST_PURCHASE" },
  { q: "¿Qué porcentaje de Casa tenemos?", not_family: "PURCHASE_FREQUENCY" },
  { q: "Lista folios de enero", not_family: "PURCHASE_OVERDUE" },
  { q: "¿Cuánto invertimos de enero a septiembre?", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "¿Cómo va seguridad?", not_family: "LAST_PURCHASE" },
  { q: "¿Quién es responsable de seguridad?", not_family: "PURCHASE_OVERDUE" },
  { q: "Prejunta de septiembre", not_family: "PURCHASE_FREQUENCY" },
  { q: "¿Cuál es el descuento de septiembre?", not_family: "LAST_PURCHASE" },
  { q: "¿Cuánto vendió Casa en enero?", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "Exporta el excel de SEH", not_family: "PURCHASE_OVERDUE" },
  { q: "Taller por AT-12", not_family: "LAST_PURCHASE" },
  { q: "¿Qué folio de taller mayor hay?", not_family: "PURCHASE_FREQUENCY" },
  { q: "¿Cómo está la rentabilidad?", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "¿Cuánto gastamos en comidas?", not_family: "LAST_PURCHASE" },
  { q: "¿Cuánto suman los folios de gastos?", not_family: "PURCHASE_OVERDUE" },
  { q: "Abre el folio F-260101-1", not_family: "PURCHASE_FREQUENCY" },
  { q: "¿Qué cumplimiento de venta tenemos?", not_family: "EXPECTED_NEXT_PURCHASE_ENRICHED" },
  { q: "¿Qué porcentaje de forecast llevamos?", not_family: "LAST_PURCHASE" },
  { q: "Clientes de enero", not_family: "PURCHASE_OVERDUE" },
]);

const MULTI_TURN = Object.freeze([
  {
    turns: [
      "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
      "¿Cuál fue su última compra?",
      "¿Cada cuántos días compra?",
      "¿Está atrasada?",
    ],
    families: [
      "EXPECTED_NEXT_PURCHASE_ENRICHED",
      "LAST_PURCHASE",
      "PURCHASE_FREQUENCY",
      "PURCHASE_OVERDUE",
    ],
  },
  {
    turns: [
      "¿Cuánto gastamos en taller de enero a septiembre?",
      "¿Cuántos folios fueron?",
      "¿Y cuántos están en otros estados?",
    ],
    intents: ["expense_analytics", "expense_analytics", "expense_analytics"],
  },
]);

function expandMultiTurn(base) {
  const extra = [];
  for (const q of EXPECTED_NEXT_ENRICHED.slice(0, 10)) {
    extra.push({
      turns: [q, "¿Cuál fue su última compra?"],
      families: ["EXPECTED_NEXT_PURCHASE_ENRICHED", "LAST_PURCHASE"],
    });
    extra.push({
      turns: [q, "¿Cada cuántos días compra?"],
      families: ["EXPECTED_NEXT_PURCHASE_ENRICHED", "PURCHASE_FREQUENCY"],
    });
  }
  extra.push({
    turns: ["¿Cuánto gastamos en taller?", "enero a septiembre", "¿Y cuántos están en otros estados?"],
    intents: ["expense_analytics", "expense_analytics", "expense_analytics"],
  });
  extra.push({
    turns: ["¿Cuál fue la última compra de TORTILLERIA ERICK?", "¿Está atrasada?"],
    families: ["LAST_PURCHASE", "PURCHASE_OVERDUE"],
  });
  extra.push({
    turns: ["¿Cada cuántos días compra TORTILLERIA ERICK?", "¿Cuántos días lleva sin comprar?"],
    families: ["PURCHASE_FREQUENCY", "PURCHASE_OVERDUE"],
  });
  extra.push({
    turns: ["¿Cuándo debería haber comprado otra vez TORTILLERIA ERICK?", "¿Cuál fue su última compra?"],
    families: ["PURCHASE_OVERDUE", "LAST_PURCHASE"],
  });
  extra.push({
    turns: ["Dame el gasto de taller.", "agosto", "¿Cuántos folios fueron?"],
    intents: ["expense_analytics", "expense_analytics", "expense_analytics"],
  });
  extra.push({
    turns: ["¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", "¿Y cuántos días lleva sin comprar?"],
    families: ["EXPECTED_NEXT_PURCHASE_ENRICHED", "PURCHASE_OVERDUE"],
  });
  extra.push({
    turns: ["¿Está atrasada TORTILLERIA ERICK?", "¿Cada cuántos días compra?"],
    families: ["PURCHASE_OVERDUE", "PURCHASE_FREQUENCY"],
  });
  extra.push({
    turns: ["¿Cuánto gastamos en taller de enero a septiembre?", "¿Y cuántos están en otros estados?"],
    intents: ["expense_analytics", "expense_analytics"],
  });
  extra.push({
    turns: ["¿Cuándo esperamos que vuelva a comprar tortilleria erick?", "¿Cuál fue la última compra?"],
    families: ["EXPECTED_NEXT_PURCHASE_ENRICHED", "LAST_PURCHASE"],
  });
  extra.push({
    turns: ["¿Cuándo esperamos que vuelva a comprar Tortillería Erick?", "¿Está atrasada?"],
    families: ["EXPECTED_NEXT_PURCHASE_ENRICHED", "PURCHASE_OVERDUE"],
  });
  return Object.freeze([...base, ...extra]);
}

const INCOMPLETE_COMPUTE_DICF = Object.freeze({
  aumentaron: {
    clientes: [{ cliente: "TORTILLERIA ERICK", freqDays: 7, lastPurchaseDate: null, estado: "ACTIVO" }],
  },
});

const SYNTHETIC_COMPUTE_DICF = Object.freeze({
  disminuyeron: {
    clientes: [{ cliente: "CLIENTE TEST", freqDays: 14, lastPurchaseDate: null }],
  },
});

const TALLER_OTHER_STATUS_FOLIOS = Object.freeze([
  { id: 1, categoria: "TALLER", mes_cargo: "2026-01", importe: 100, estatus: "PAGADO", concepto: "A" },
  { id: 2, categoria: "TALLER", mes_cargo: "2026-01", importe: 100, estatus: "PENDIENTE", concepto: "B" },
  { id: 3, categoria: "TALLER", mes_cargo: "2026-01", importe: 100, estatus: "AUTORIZADO", concepto: "C" },
]);

module.exports = {
  FAMILY_IDS,
  EXPECTED_NEXT_ENRICHED,
  EVIDENCE_DETAIL,
  ANTI_COLLISIONS,
  MULTI_TURN: expandMultiTurn(MULTI_TURN),
  INCOMPLETE_COMPUTE_DICF,
  SYNTHETIC_COMPUTE_DICF,
  TALLER_OTHER_STATUS_FOLIOS,
};
