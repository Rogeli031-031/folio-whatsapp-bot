"use strict";

const FAMILY_IDS = Object.freeze([
  "REGULATION_STATUS",
  "REGULATION_PLANT_DETAIL",
  "TALLER_EXPENSE",
  "EXPECTED_NEXT_PURCHASE",
]);

const REGULATION_STATUS_UTTERANCES = Object.freeze([
  "¿Cómo estamos en regulaciones?",
  "¿Cómo vamos de regulación?",
  "¿Cómo estamos en SEH?",
  "¿Cómo va Seguridad e Higiene?",
  "¿Qué cumplimiento tenemos en regulación?",
  "¿Cuál es nuestro cumplimiento de SEH?",
  "¿Cómo está la planta en regulación?",
  "¿Qué porcentaje llevamos en regulación?",
  "¿Cómo vamos en cumplimiento regulatorio?",
  "¿Cuál es el estatus de regulación?",
  "¿Cómo estamos de permisos?",
  "¿Qué cumplimiento tiene la planta?",
  "¿Cómo está estación en SEH?",
  "¿Cómo está autotanque en SEH?",
  "¿Qué porcentaje cumple estación?",
  "¿Qué porcentaje cumple autotanque?",
  "¿Qué porcentaje cumple planta?",
  "Dame el estado de SEH.",
  "Dame el cumplimiento regulatorio.",
  "¿Cómo andamos de seguridad e higiene?",
  "¿Qué nivel de cumplimiento tenemos?",
  "¿Estamos al corriente en regulación?",
  "¿Qué tan cumplidos estamos en SEH?",
  "¿Cómo vienen los permisos?",
  "¿Cuál es la situación regulatoria?",
  "¿Cómo está el cumplimiento documental?",
  "¿Cómo vamos con obligaciones regulatorias?",
  "Resumen de regulación.",
  "Resumen de SEH.",
  "¿Cómo va SEH?",
]);

const REGULATION_PLANT_DETAIL_UTTERANCES = Object.freeze([
  "¿Cómo vamos con regulación de planta?",
  "¿Cómo estamos en regulación de planta?",
  "¿Qué documentos de regulación están pendientes?",
  "¿Qué tenemos sin estado?",
  "¿Qué permisos están vencidos?",
  "¿Qué vence próximamente?",
  "¿Qué documentos están vigentes?",
  "¿Cómo estamos en permisos federales?",
  "¿Qué hay en trámite en regulación de planta?",
  "¿Cuáles están N/A en carpetas legales?",
  "Dame los documentos sin estado.",
  "Lista los vencidos de regulación de planta.",
  "¿Qué próximos a vencer hay en regulación?",
  "¿Qué vigentes marca el índice legal?",
  "¿Qué documentos de planta están en trámite?",
  "Muéstrame carpetas legales de planta.",
  "¿Qué hay pendiente en carpetas legales?",
  "¿Cuáles permisos federales están vigentes?",
  "¿Qué documentos de regulación no tienen estado?",
  "¿Qué vencidos hay en el índice legal?",
  "¿Qué observación tienen los sin estado?",
  "Detalle documental de regulación de planta.",
  "¿Qué bloques están sin estado?",
  "¿Qué documentos vencen en 30 días?",
  "¿Cuál es el estatus por documento de planta?",
  "¿Qué hay vencido en permisos de planta?",
  "¿Qué documentos de regulación están vigentes hoy?",
  "¿Qué N/A hay en regulación de planta?",
  "¿Qué pendientes documentales marca el índice?",
  "Índice legal: sin estado y vencidos.",
]);

const TALLER_EXPENSE_UTTERANCES = Object.freeze([
  "¿Cuánto gastamos en taller?",
  "¿Cuánto hemos gastado en taller?",
  "¿Cuál es el gasto de taller?",
  "¿Cuánto llevamos gastado en taller?",
  "¿Cuánto salió taller?",
  "¿Qué gasto tenemos en taller?",
  "¿Cuánto se pagó en taller?",
  "¿Cuánto hemos pagado de taller?",
  "¿Cuánto suman los folios de taller?",
  "¿Cuál es el total de taller?",
  "¿Cuánto cuesta taller?",
  "¿Cuánto gastamos en reparaciones de taller?",
  "¿Qué monto tenemos de taller?",
  "¿Cuánto dinero se fue a taller?",
  "¿Cuál fue el gasto total en taller?",
  "Dame el gasto de taller.",
  "Dame el total de taller.",
  "¿Cuánto representa taller?",
  "¿Qué importe tiene taller?",
  "¿Cuánto acumulamos de taller?",
  "¿Cuánto llevamos en la categoría Taller?",
  "¿Cuál es el acumulado de Taller?",
  "¿Cuánto hemos desembolsado en Taller?",
  "¿Cuánto se ha gastado en la categoría Taller?",
  "¿Cuánto suman los gastos de Taller?",
  "¿Cuál es el importe acumulado de Taller?",
  "¿Cuánto gastó la planta en Taller?",
  "¿Cuál es el total pagado de Taller?",
  "¿Qué monto acumulado tenemos en Taller?",
  "Taller, ¿cuánto llevamos?",
]);

const TALLER_PERIOD_MATRIX = Object.freeze(["enero", "agosto", "enero-septiembre", "año a la fecha"]);

const EXPECTED_NEXT_PURCHASE_UTTERANCES = Object.freeze([
  "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
  "¿Cuándo debería volver a comprar TORTILLERIA ERICK?",
  "¿Cuándo le toca comprar otra vez a TORTILLERIA ERICK?",
  "¿Cuál sería su siguiente compra de TORTILLERIA ERICK?",
  "¿Cuándo esperamos su próximo pedido de TORTILLERIA ERICK?",
  "¿Cuándo compraría otra vez TORTILLERIA ERICK según su frecuencia?",
  "¿Cuándo debería regresar TORTILLERIA ERICK?",
  "¿Cuándo vence su ciclo de compra de TORTILLERIA ERICK?",
  "¿Está atrasado TORTILLERIA ERICK?",
  "¿Cuándo se esperaba que comprara TORTILLERIA ERICK?",
  "¿Cuándo vuelve a comprar TORTILLERIA ERICK?",
  "¿Cuándo le toca pedir otra vez a TORTILLERIA ERICK?",
  "¿Cuál es la próxima compra estimada de TORTILLERIA ERICK?",
  "¿Cuándo cae la siguiente compra de TORTILLERIA ERICK?",
  "¿Cuándo esperamos que compre otra vez TORTILLERIA ERICK?",
  "Próxima compra de TORTILLERIA ERICK.",
  "Siguiente pedido de TORTILLERIA ERICK.",
  "¿Cuándo normalmente compra TORTILLERIA ERICK otra vez?",
  "¿Cuándo volvería a comprar TORTILLERIA ERICK?",
  "¿Para qué fecha se esperaba la compra de TORTILLERIA ERICK?",
  "¿Cuándo debería comprar otra vez TORTILLERIA ERICK?",
  "Fecha esperada de compra de TORTILLERIA ERICK.",
  "¿Cuándo esperamos que vuelva a comprar Tortillería Erick?",
  "¿Cuándo esperamos que vuelva a comprar tortilleria erick?",
  "¿Cuándo le toca comprar a TORTILLERIA ERICK según su historial?",
  "¿Está atrasado respecto a su frecuencia TORTILLERIA ERICK?",
  "Ventana histórica de compra de TORTILLERIA ERICK.",
  "Expected next purchase de TORTILLERIA ERICK.",
  "¿Cuándo debería hacer pedido TORTILLERIA ERICK?",
  "¿Cuándo se esperaba la siguiente compra de TORTILLERIA ERICK?",
]);

const LITERAL_REGRESSIONS = Object.freeze([
  { q: "¿Cómo estamos en regulaciones?", family: "REGULATION_STATUS", intent: "seh_regulation" },
  { q: "¿Cuánto gastamos en taller de enero a septiembre?", family: "TALLER_EXPENSE", intent: "expense_analytics" },
  { q: "¿Cuánto gastamos en taller?", family: "TALLER_EXPENSE", intent: "expense_analytics" },
  { q: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", family: "EXPECTED_NEXT_PURCHASE", intent: "predictive_commercial" },
]);

const ANTI_COLLISIONS = Object.freeze([
  { q: "¿Cómo estamos en regulaciones?", not_intent: "action_status" },
  { q: "¿Cómo estamos en regulaciones?", not_intent: "plant_diagnosis" },
  { q: "¿Cómo estamos en regulaciones?", not_intent: "predictive_commercial" },
  { q: "¿Cómo vamos de regulación?", not_intent: "action_status" },
  { q: "¿Cómo estamos en SEH?", not_intent: "plant_diagnosis" },
  { q: "¿Cómo va Seguridad e Higiene?", not_intent: "action_status" },
  { q: "Resumen de SEH.", not_intent: "plant_diagnosis" },
  { q: "¿Cuál es el estatus de regulación?", not_intent: "action_status" },
  { q: "¿Cómo estamos de permisos?", not_intent: "folio_search" },
  { q: "¿Qué documentos de regulación están pendientes?", not_intent: "action_status" },
  { q: "¿Qué permisos están vencidos?", not_intent: "overdue_actions" },
  { q: "¿Qué acciones están vencidas?", not_family: "REGULATION_PLANT_DETAIL" },
  { q: "¿Qué hay vencido en Action Register?", not_intent: "seh_regulation" },
  { q: "¿Cómo va el Action Register?", not_intent: "seh_regulation" },
  { q: "¿Cómo va Taller?", not_intent: "expense_analytics" },
  { q: "¿Cómo va mantenimiento?", not_intent: "seh_regulation" },
  { q: "¿Cuánto gastamos en taller de enero a septiembre?", not_intent: "predictive_commercial" },
  { q: "¿Cuánto gastamos en taller de enero a septiembre?", not_intent: "client_ranking" },
  { q: "¿Cuánto gastamos en taller de enero a septiembre?", not_intent: "igf_direct_metric" },
  { q: "¿Cuánto gastamos en taller?", not_intent: "predictive_commercial" },
  { q: "¿Cuál es el gasto de taller?", not_intent: "financial_diagnosis" },
  { q: "¿Cuánto suman los folios de taller?", not_intent: "predictive_commercial" },
  { q: "¿Cuánto gastó la planta en Taller?", not_intent: "plant_diagnosis" },
  { q: "¿Cuánto llevamos en la categoría Taller?", not_intent: "client_movement" },
  { q: "¿Cuánto se ha gastado en la categoría Taller?", not_intent: "igf_direct_metric" },
  { q: "Taller, ¿cuánto llevamos?", not_intent: "action_status" },
  { q: "¿Cuánto gastamos en gastos operativos IGF?", not_family: "TALLER_EXPENSE" },
  { q: "¿Cómo van los gastos de la planta?", not_intent: "expense_analytics" },
  { q: "¿Quiénes compraron en enero?", not_intent: "expense_analytics" },
  { q: "¿Cuáles clientes compraron en enero?", not_family: "TALLER_EXPENSE" },
  { q: "Top clientes de enero a septiembre", not_intent: "expense_analytics" },
  { q: "¿Cuánto vendimos de enero a septiembre?", not_intent: "expense_analytics" },
  { q: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", not_intent: "expense_analytics" },
  { q: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", not_family: "TALLER_EXPENSE" },
  { q: "¿Cuál es el forecast de TORTILLERIA ERICK?", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "¿Cuánto proyectamos que compre TORTILLERIA ERICK?", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "Pronóstico contractual de TORTILLERIA ERICK", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "¿Qué comisión tenemos?", not_intent: "seh_regulation" },
  { q: "¿Qué comisión tenemos en Casa?", not_intent: "seh_regulation" },
  { q: "abre la venta diaria", not_intent: "seh_regulation" },
  { q: "¿Cuántos extintores hay?", not_family: "REGULATION_STATUS" },
  { q: "¿Cuántos extintores de estación están vencidos?", not_intent: "seh_regulation" },
  { q: "¿Cómo va la planta?", not_intent: "seh_regulation" },
  { q: "Diagnóstico de planta", not_intent: "seh_regulation" },
  { q: "¿Qué folio de taller mayor hay?", not_family: "TALLER_EXPENSE" },
  { q: "Taller por AT-12", not_family: "TALLER_EXPENSE" },
  { q: "¿Cuánto gastamos en inversiones?", not_family: "TALLER_EXPENSE" },
  { q: "¿Cuál es el descuento de septiembre?", not_intent: "expense_analytics" },
  { q: "¿Cuánto vendió Casa en enero?", not_intent: "expense_analytics" },
  { q: "Clientes nuevos de enero", not_intent: "expense_analytics" },
  { q: "¿Está atrasado el Action Register?", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "¿Cuándo vence el extintor de planta?", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "¿Qué porcentaje de Casa tenemos?", not_intent: "seh_regulation" },
  { q: "Resumen de venta diaria", not_intent: "seh_regulation" },
  { q: "¿Cómo vamos de margen?", not_intent: "seh_regulation" },
  { q: "¿Cómo vamos de IGF?", not_intent: "seh_regulation" },
  { q: "¿Cómo vamos de ARR?", not_intent: "seh_regulation" },
  { q: "¿Cuánto gastamos en taller de enero a septiembre?", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "¿Cómo estamos en regulaciones?", not_family: "TALLER_EXPENSE" },
  { q: "¿Cómo estamos en regulaciones?", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", not_intent: "seh_regulation" },
  { q: "¿Cuánto gastamos en taller?", not_intent: "seh_regulation" },
  { q: "Dame el estado de SEH.", not_intent: "predictive_commercial" },
  { q: "¿Qué tan cumplidos estamos en SEH?", not_intent: "financial_diagnosis" },
  { q: "¿Cómo está el cumplimiento documental?", not_intent: "folio_search" },
  { q: "¿Qué tenemos sin estado?", not_intent: "action_status" },
  { q: "¿Qué vence próximamente?", not_intent: "overdue_actions" },
  { q: "¿Qué documentos están vigentes?", not_intent: "folio_status" },
  { q: "¿Cómo estamos en permisos federales?", not_intent: "action_status" },
  { q: "¿Cuánto hemos desembolsado en Taller?", not_intent: "predictive_commercial" },
  { q: "¿Cuál es el acumulado de Taller?", not_intent: "client_ranking" },
  { q: "¿Cuánto se pagó en taller?", not_intent: "igf_direct_metric" },
  { q: "¿Cuánto dinero se fue a taller?", not_intent: "plant_diagnosis" },
  { q: "¿Cuál fue el gasto total en taller?", not_intent: "open_pronostico" },
  { q: "Dame el gasto de taller.", not_intent: "category_commission" },
  { q: "¿Cuánto representa taller?", not_intent: "predictive_commercial" },
  { q: "¿Qué importe tiene taller?", not_intent: "igf_direct_metric" },
  { q: "año a la fecha de taller, ¿cuánto gastamos?", not_intent: "predictive_commercial" },
  { q: "acumulado enero-septiembre de taller", not_intent: "predictive_commercial" },
  { q: "del 1 de enero al 30 de septiembre ¿cuánto gastamos en taller?", not_intent: "predictive_commercial" },
  { q: "este año hasta septiembre ¿cuánto gastamos en taller?", not_intent: "predictive_commercial" },
  { q: "¿Cuándo debería volver a comprar TORTILLERIA ERICK?", not_intent: "client_movement" },
  { q: "¿Está atrasado TORTILLERIA ERICK?", not_intent: "overdue_actions" },
  { q: "Frecuencia histórica de TORTILLERIA ERICK", not_intent: "expense_analytics" },
  { q: "¿Cuánto pronosticamos de venta para TORTILLERIA ERICK?", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "Cierre proyectado de TORTILLERIA ERICK", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "¿Qué clientes dejaron de comprar?", not_intent: "seh_regulation" },
  { q: "¿Qué clientes nuevos hubo?", not_intent: "expense_analytics" },
  { q: "¿Cómo está estación ECO-1?", not_family: "REGULATION_STATUS" },
  { q: "¿Hay extintores vencidos?", not_intent: "seh_regulation" },
  { q: "¿Cómo va SCI?", not_intent: "seh_regulation" },
  { q: "¿Quién es responsable de seguridad?", not_intent: "seh_regulation" },
  { q: "¿Cómo va seguridad?", not_intent: "seh_regulation" },
  { q: "Notas de revisión de regulación", not_intent: "seh_regulation" },
  { q: "Exporta el excel de SEH", not_intent: "seh_regulation" },
  { q: "¿Cuánto gastamos en llantas?", not_family: "TALLER_EXPENSE" },
  { q: "Lista folios de enero", not_intent: "seh_regulation" },
  { q: "¿Cuántos folios de taller hay?", not_intent: "seh_regulation" },
  { q: "Abre el folio F-260101-1", not_intent: "expense_analytics" },
  { q: "¿Cuál es el margen de enero?", not_intent: "expense_analytics" },
  { q: "¿Cómo vamos de venta?", not_intent: "expense_analytics" },
  { q: "¿Cómo vamos de descuento?", not_intent: "seh_regulation" },
  { q: "Brief ejecutivo diario", not_intent: "seh_regulation" },
  { q: "Prejunta de septiembre", not_intent: "seh_regulation" },
  { q: "¿Cómo cerramos el mes?", not_intent: "expense_analytics" },
  { q: "¿Cuánto pesa Casa?", not_intent: "seh_regulation" },
  { q: "Top 5 clientes", not_intent: "expense_analytics" },
  { q: "¿Cuándo esperamos el forecast?", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "¿Cuándo vence la acción de Juan?", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "¿Cuándo vence el permiso de la pipa ECO?", not_family: "EXPECTED_NEXT_PURCHASE" },
  { q: "Clientes de enero", not_intent: "expense_analytics" },
  { q: "Gasto operativo IGF de enero a septiembre", not_family: "TALLER_EXPENSE" },
  { q: "¿Cómo está la rentabilidad?", not_intent: "seh_regulation" },
  { q: "¿Cómo estamos de calidad?", not_intent: "seh_regulation" },
  { q: "¿Cómo va producción?", not_intent: "seh_regulation" },
  { q: "¿Cómo va logística?", not_intent: "seh_regulation" },
  { q: "Acciones vencidas de seguridad", not_intent: "seh_regulation" },
  { q: "¿Qué cumplimiento de venta tenemos?", not_intent: "seh_regulation" },
  { q: "¿Qué porcentaje de forecast llevamos?", not_intent: "seh_regulation" },
  { q: "¿Cuánto gastamos en comidas?", not_family: "TALLER_EXPENSE" },
  { q: "¿Cuánto suman los folios de gastos?", not_family: "TALLER_EXPENSE" },
  { q: "¿Cuánto invertimos de enero a septiembre?", not_family: "TALLER_EXPENSE" },
]);

function expandAntiCollisions(base) {
  const extra = [];
  const regulationQs = [
    "¿Cómo estamos en regulaciones?",
    "¿Cómo estamos en SEH?",
    "Resumen de regulación.",
    "¿Cuál es la situación regulatoria?",
  ];
  const notIntents = [
    "action_status",
    "plant_diagnosis",
    "predictive_commercial",
    "expense_analytics",
    "folio_search",
    "overdue_actions",
  ];
  for (const q of regulationQs) {
    for (const not_intent of notIntents) extra.push({ q, not_intent });
  }
  const tallerQs = [
    "¿Cuánto gastamos en taller?",
    "¿Cuánto gastamos en taller de enero a septiembre?",
    "Dame el total de taller.",
    "¿Cuánto llevamos en la categoría Taller?",
  ];
  const tallerNot = [
    "predictive_commercial",
    "client_ranking",
    "client_movement",
    "igf_direct_metric",
    "plant_diagnosis",
    "seh_regulation",
  ];
  for (const q of tallerQs) {
    for (const not_intent of tallerNot) extra.push({ q, not_intent });
  }
  const nextQs = [
    "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
    "¿Cuándo debería volver a comprar TORTILLERIA ERICK?",
    "¿Está atrasado TORTILLERIA ERICK?",
  ];
  const nextNot = ["expense_analytics", "seh_regulation", "client_ranking", "open_pronostico"];
  for (const q of nextQs) {
    for (const not_intent of nextNot) extra.push({ q, not_intent });
  }
  return Object.freeze([...base, ...extra]);
}

const ANTI_COLLISIONS_EXPANDED = expandAntiCollisions(ANTI_COLLISIONS);

const MULTI_TURN = Object.freeze([
  { turns: ["¿Cómo estamos en regulaciones?", "¿Y en planta?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["¿Cómo estamos en regulaciones?", "¿Qué tenemos sin estado?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["¿Cómo estamos en SEH?", "¿Y estación?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["¿Cómo estamos en SEH?", "¿Y autotanque?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["Resumen de SEH.", "¿Y en planta?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["¿Cómo vamos de regulación?", "¿Qué documentos están vigentes?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["¿Cómo estamos en regulación de planta?", "¿Qué tenemos sin estado?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["¿Qué tenemos sin estado?", "¿Y los vencidos?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["¿Qué permisos están vencidos?", "¿Y los vigentes?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["¿Qué vence próximamente?", "¿Y en trámite?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["¿Cuánto gastamos en taller?", "enero"], expect: ["expense_analytics", "expense_analytics"] },
  { turns: ["¿Cuánto gastamos en taller?", "agosto"], expect: ["expense_analytics", "expense_analytics"] },
  { turns: ["¿Cuánto gastamos en taller?", "enero a septiembre"], expect: ["expense_analytics", "expense_analytics"] },
  { turns: ["¿Cuánto gastamos en taller?", "enero-septiembre"], expect: ["expense_analytics", "expense_analytics"] },
  { turns: ["¿Cuánto gastamos en taller?", "año a la fecha"], expect: ["expense_analytics", "expense_analytics"] },
  { turns: ["¿Cuánto gastamos en taller?", "enero", "¿y en febrero?"], expect: ["expense_analytics", "expense_analytics", "expense_analytics"] },
  { turns: ["¿Cuánto gastamos en taller?", "enero", "¿y acumulado hasta septiembre?"], expect: ["expense_analytics", "expense_analytics", "expense_analytics"] },
  { turns: ["¿Cuál es el gasto de taller?", "de enero a septiembre"], expect: ["expense_analytics", "expense_analytics"] },
  { turns: ["Dame el total de taller.", "del 1 de enero al 30 de septiembre"], expect: ["expense_analytics", "expense_analytics"] },
  { turns: ["¿Cuánto llevamos en la categoría Taller?", "este año hasta septiembre"], expect: ["expense_analytics", "expense_analytics"] },
  { turns: ["¿Cuánto gastamos en taller de enero a septiembre?", "¿y en febrero?"], expect: ["expense_analytics", "expense_analytics"] },
  { turns: ["¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", "¿Y cuál fue su última compra?"], expect: ["predictive_commercial", "predictive_commercial"] },
  { turns: ["¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", "¿Cada cuántos días compra?"], expect: ["predictive_commercial", "predictive_commercial"] },
  { turns: ["¿Cuándo debería volver a comprar TORTILLERIA ERICK?", "¿Está atrasado?"], expect: ["predictive_commercial", "predictive_commercial"] },
  { turns: ["¿Cuándo le toca comprar otra vez a TORTILLERIA ERICK?", "¿Y su frecuencia?"], expect: ["predictive_commercial", "predictive_commercial"] },
  { turns: ["¿Cómo estamos en regulaciones?", "¿Cuánto gastamos en taller?"], expect: ["seh_regulation", "expense_analytics"] },
  { turns: ["¿Cuánto gastamos en taller?", "¿Cómo estamos en regulaciones?"], expect: ["expense_analytics", "seh_regulation"] },
  { turns: ["¿Cómo estamos en regulaciones?", "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?"], expect: ["seh_regulation", "predictive_commercial"] },
  { turns: ["¿Cuánto gastamos en taller de enero a septiembre?", "¿Cómo estamos en SEH?"], expect: ["expense_analytics", "seh_regulation"] },
  { turns: ["Resumen de regulación.", "¿Qué tenemos sin estado?", "¿Y vencidos?"], expect: ["seh_regulation", "seh_regulation", "seh_regulation"] },
  { turns: ["¿Cómo estamos en regulaciones?", "¿Cómo está estación en SEH?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["¿Cuánto gastamos en taller?", "enero-septiembre"], expect: ["expense_analytics", "expense_analytics"] },
  { turns: ["Dame el gasto de taller.", "agosto"], expect: ["expense_analytics", "expense_analytics"] },
  { turns: ["¿Qué tenemos sin estado?", "¿Y los vigentes?"], expect: ["seh_regulation", "seh_regulation"] },
  { turns: ["¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", "¿Cuándo debería regresar?"], expect: ["predictive_commercial", "predictive_commercial"] },
]);

function expandMultiTurn(base) {
  const extra = [];
  for (const month of ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto"]) {
    extra.push({
      turns: ["¿Cuánto gastamos en taller?", month],
      expect: ["expense_analytics", "expense_analytics"],
    });
  }
  for (const q of [
    "¿Cómo estamos en regulaciones?",
    "¿Cómo estamos en SEH?",
    "Resumen de SEH.",
    "Dame el estado de SEH.",
    "¿Cómo va Seguridad e Higiene?",
  ]) {
    extra.push({ turns: [q, "¿Y en planta?"], expect: ["seh_regulation", "seh_regulation"] });
    extra.push({ turns: [q, "¿Qué tenemos sin estado?"], expect: ["seh_regulation", "seh_regulation"] });
  }
  for (const q of EXPECTED_NEXT_PURCHASE_UTTERANCES.slice(0, 8)) {
    extra.push({
      turns: [q, "¿Y cuál fue su última compra?"],
      expect: ["predictive_commercial", "predictive_commercial"],
    });
  }
  return Object.freeze([...base, ...extra]);
}

const MULTI_TURN_EXPANDED = expandMultiTurn(MULTI_TURN);

const SAMPLE_EQUIPOS = Object.freeze([
  { categoria: "PLANTA", locacion: "Báscula", descripcion: "Extintor", componente: "EXTINTOR", nombre: "", vence: "2027-01-01" },
  { categoria: "PLANTA", locacion: "Oficina", descripcion: "Extintor", componente: "EXTINTOR", nombre: "", vence: "2025-01-01" },
  { categoria: "SISTEMA CONTRA INCENDIO", locacion: "", descripcion: "", componente: "", nombre: "Bomba jockey", vence: "2027-06-01" },
  { categoria: "ESTACIONES", locacion: "ECO-1", descripcion: "Extintor", componente: "EXTINTOR", nombre: "", vence: "2027-03-01" },
  { categoria: "PIPAS", locacion: "AT-01", descripcion: "Extintor", componente: "EXTINTOR", nombre: "", vence: "2027-04-01" },
]);

const SAMPLE_CARPETAS = Object.freeze([
  { doc_no: "1.1", estatus: "vigente", vencimiento: "2027-12-01", vencimiento_na: false, comentario: "CRE vigente" },
  { doc_no: "1.2", estatus: "", vencimiento: null, vencimiento_na: false, comentario: "Sin cargar" },
  { doc_no: "2.1", estatus: "en_tramite", vencimiento: "2026-10-01", vencimiento_na: false, comentario: "Renovación" },
  { doc_no: "3.1", estatus: "vigente", vencimiento: "2020-01-01", vencimiento_na: false, comentario: "Vencido físico" },
  { doc_no: "3.2", estatus: "na", vencimiento: null, vencimiento_na: true, comentario: "No aplica" },
  { doc_no: "4.1", estatus: "vigente", vencimiento: "2026-10-01", vencimiento_na: false, comentario: "Por vencer" },
]);

const SAMPLE_TALLER_FOLIOS = Object.freeze([
  { id: 1, numero_folio: "F-260101-1", categoria: "TALLER", mes_cargo: "2026-01", importe: 1000, estatus: "PAGADO", concepto: "Reparación bomba" },
  { id: 2, numero_folio: "F-260201-1", categoria: "TALLER", mes_cargo: "2026-02", importe: 2500, estatus: "PENDIENTE", concepto: "Soldadura" },
  { id: 3, numero_folio: "F-260801-1", categoria: "TALLER", mes_cargo: "2026-08", importe: 4000, estatus: "PAGADO", concepto: "Tornería" },
  { id: 4, numero_folio: "F-260901-1", categoria: "TALLER", mes_cargo: "2026-09", importe: 1500, estatus: "PAGADO", concepto: "Filtros" },
  { id: 5, numero_folio: "F-260301-1", categoria: "GASTOS", mes_cargo: "2026-01", importe: 9999, estatus: "PAGADO", concepto: "No taller" },
]);

const SAMPLE_DICF_ROWS = Object.freeze([
  {
    cliente: "TORTILLERIA ERICK",
    freqDays: 7,
    lastPurchaseDate: "2026-09-10",
    daysSinceLast: 8,
    estado: "ACTIVO",
  },
  {
    cliente: "GAS ERICK NORTE",
    freqDays: 14,
    lastPurchaseDate: "2026-09-01",
    daysSinceLast: 17,
    estado: "ACTIVO",
  },
]);

module.exports = {
  FAMILY_IDS,
  REGULATION_STATUS_UTTERANCES,
  REGULATION_PLANT_DETAIL_UTTERANCES,
  TALLER_EXPENSE_UTTERANCES,
  TALLER_PERIOD_MATRIX,
  EXPECTED_NEXT_PURCHASE_UTTERANCES,
  LITERAL_REGRESSIONS,
  ANTI_COLLISIONS: ANTI_COLLISIONS_EXPANDED,
  MULTI_TURN: MULTI_TURN_EXPANDED,
  SAMPLE_EQUIPOS,
  SAMPLE_CARPETAS,
  SAMPLE_TALLER_FOLIOS,
  SAMPLE_DICF_ROWS,
};
