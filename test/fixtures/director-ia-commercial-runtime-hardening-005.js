"use strict";

/**
 * FIXTURES de prueba 005. No importar desde lib/ de producción.
 */

const HARDENING_FAMILY_IDS = Object.freeze([
  "CONTEXTUAL_NEW_CLIENT_COUNT",
  "NEW_CLIENT_DISCOUNT_EVIDENCE",
  "LOST_VOLUME_CONTEXTUAL_AGGREGATE",
  "PENDING_CLARIFICATION_OPERATION",
  "CHURN_RISK_MATERIALIZATION",
  "EXPECTED_NEXT_PURCHASE_MATERIALIZATION",
  "CHANNEL_SHARE_REFERENCE_PERIOD",
  "CHANNEL_FORECAST_PROJECTION_GUARDRAIL",
]);

const HARDENING_UTTERANCES = Object.freeze({
  CONTEXTUAL_NEW_CLIENT_COUNT: [
    "total de clientes nuevos",
    "¿cuántos fueron?",
    "¿y cuántos entraron?",
    "¿cuántos nuevos eran?",
    "dame el total",
    "¿cuántos en total?",
    "¿cuántas cuentas nuevas?",
    "¿cuántos clientes entraron?",
    "¿y el número total?",
    "¿cuántos fueron en ese mes?",
    "cuántos nuevos en total",
    "el total de nuevos",
    "número total de clientes nuevos",
    "cuántos nuevos hubo en total",
    "dime el total de nuevos",
    "cuántas cuentas nuevas eran",
    "cuántos clientes nuevos fueron",
    "y cuántos nuevos entraron",
    "total de cuentas nuevas",
    "cuántos eran los nuevos",
    "dame el número de nuevos",
    "cuántos nuevos en ese mes",
    "el conteo total de nuevos",
    "cuántos clientes nuevos en total",
    "total nuevos de ese periodo",
    "cuántos nuevos resultaron",
    "número de clientes nuevos",
    "cuántos entraron en total",
    "y cuántos clientes nuevos fueron",
    "cuántos nuevos tenemos en total",
  ],
  NEW_CLIENT_DISCOUNT_EVIDENCE: [
    "¿Qué descuento tuvieron los nuevos?",
    "¿qué descuento dimos a los nuevos?",
    "¿cuál fue su descuento por kilo?",
    "¿qué descuento promedio tuvieron?",
    "¿cuánto descuento recibieron?",
    "¿qué nuevos tenían descuento?",
    "¿cuáles no tienen dato de descuento?",
    "¿cuántos nuevos tienen descuento registrado?",
    "¿qué cobertura de descuento tenemos?",
    "¿cuántos no tienen fila de descuento?",
    "descuento de los clientes nuevos",
    "descuento por kg de los nuevos",
    "qué descuento ARR tuvieron los nuevos",
    "cobertura de descuento de los nuevos",
    "quiénes de los nuevos no tienen fila de descuento",
    "data_not_found de descuento de nuevos",
    "descuento observado de la cohorte nueva",
    "qué descuento real tuvieron los que entraron",
    "monto de descuento de los nuevos",
    "cuántos nuevos tienen evidencia de descuento",
    "cuáles nuevos están en DATA_NOT_FOUND",
    "no imputar cero al descuento de los nuevos",
    "descuento físico de clientes nuevos",
    "fila de descuento de los nuevos",
    "qué descuento por kilo de los que entraron",
    "descuento promedio solo con evidencia",
    "cuántos nuevos carecen de descuento",
    "evidencia de descuento de la entrada nueva",
    "qué descuento registrado tienen los nuevos",
    "descuento de la entrada nueva con cobertura",
  ],
  LOST_VOLUME_CONTEXTUAL_AGGREGATE: [
    "¿Cuánto perdimos con ellos?",
    "¿Cuántas toneladas se fueron?",
    "¿cuánto dejamos de vender?",
    "¿cuál fue la pérdida total?",
    "¿cuánto volumen perdimos?",
    "¿cuánto representan esos clientes?",
    "¿cuánto cayó por los que se fueron?",
    "¿qué volumen dejaron?",
    "¿cuánto perdimos con los caídos?",
    "¿cuánto suman las bajas a cero?",
    "¿Cuánto dejamos de vender por los clientes que cayeron a cero?",
    "cuánto perdimos con los caídos a cero",
    "toneladas que se fueron con ellos",
    "pérdida total de esos clientes",
    "cuánto volumen dejaron esos",
    "cuánto dejamos de vender con ellos",
    "cuánto suman los que cayeron a cero",
    "volumen perdido de los caídos",
    "cuántas toneladas perdimos con ellos",
    "qué volumen se fue con esos clientes",
    "cuánto representan los que se fueron",
    "pérdida total de los caídos",
    "cuánto cayó el volumen con ellos",
    "cuánto dejamos de vender por esos",
    "suma de toneladas de los que cayeron a cero",
    "cuánto perdimos en volumen con los caídos",
    "lost volume de ellos",
    "cuánto volumen perdimos con esos",
    "cuánto suman las toneladas de los caídos",
    "qué pérdida total dejaron esos clientes",
  ],
  PENDING_CLARIFICATION_OPERATION: [
    "¿Cuánto perdimos con los que dejaron de comprar?",
    "dime la pérdida agregada de los que dejaron de comprar",
    "operación de pérdida de los que dejaron de comprar",
    "volumen agregado perdido de los que dejaron de comprar",
    "aclara el mes para la pérdida de los que dejaron de comprar",
    "completa el periodo de la pérdida total",
    "pendiente de mes para lost volume",
    "cuánto perdimos por clientes que dejaron de comprar",
    "pérdida agregada de quienes dejaron de comprar",
    "cuánto perdimos de los que dejaron la compra",
    "volumen agregado de los que dejaron de comprar",
    "dime cuánto perdimos de los que dejaron de comprar",
    "la pérdida agregada de los que dejaron",
    "operación de pérdida agregada pendiente de mes",
    "cuánto perdimos agregado de los que dejaron de comprar",
    "necesito la pérdida agregada de los que dejaron de comprar",
    "lost volume total de los que dejaron de comprar",
    "agregado de pérdida de los que dejaron de comprar",
    "cuánto perdimos en agregado por los que dejaron de comprar",
    "pide el mes para la pérdida agregada de los que dejaron",
    "pérdida total agregada de los que dejaron de comprar",
    "cuánto perdimos sin listar a los que dejaron de comprar",
    "no listes, dame la pérdida agregada de los que dejaron de comprar",
    "operación lost volume de los que dejaron de comprar",
    "cuánto perdimos agregado pendiente de periodo",
    "volumen perdido agregado de los que dejaron de comprar",
    "la operación de pérdida de los que dejaron de comprar",
    "cuánto perdimos total de los que dejaron de comprar",
    "agrega la pérdida de los que dejaron de comprar",
    "cuánto perdimos por la salida de los que dejaron de comprar",
  ],
  CHURN_RISK_MATERIALIZATION: [
    "¿quién está atrasado?",
    "¿qué clientes deberían haber comprado ya?",
    "¿quién lleva demasiado sin comprar?",
    "¿qué clientes muestran interrupción?",
    "¿quién está fuera de su frecuencia?",
    "¿qué clientes tienen retraso?",
    "¿qué clientes no han comprado cuando normalmente ya deberían?",
    "¿quién rompió su patrón de compra?",
    "¿qué cuentas están atrasadas?",
    "¿quién tiene señal de interrupción?",
    "¿Qué clientes están en riesgo de dejar de comprar?",
    "¿Qué clientes están en riesgo de dejar de comprar en septiembre?",
    "clientes atrasados respecto de su frecuencia",
    "quiénes están tardando más de lo normal",
    "señal de interrupción DICF",
    "qué clientes llevan retraso de compra",
    "quiénes rompieron su frecuencia",
    "listado de clientes atrasados",
    "quién está fuera de su patrón de compra",
    "clientes con days since last mayor a freqDays",
    "quiénes debieron haber comprado ya",
    "cuentas con interrupción comercial",
    "quiénes muestran atraso vs frecuencia",
    "riesgo de dejar de comprar por retraso",
    "clientes latentes por frecuencia",
    "quién está tardando vs su freqDays",
    "qué clientes tienen días de retraso",
    "interrupción de compra por frecuencia",
    "quiénes están atrasados de compra",
    "señales de interrupción sin probabilidad",
  ],
  EXPECTED_NEXT_PURCHASE_MATERIALIZATION: [
    "¿Cuándo vuelve TORTILLERIA ERICK?",
    "¿Cuándo debería comprar otra vez?",
    "¿cuándo es su próxima compra estimada?",
    "¿cuándo le toca?",
    "¿cuándo debería regresar?",
    "¿cuál sería su siguiente pedido?",
    "¿cuándo esperamos que compre?",
    "¿está atrasado?",
    "¿para qué fecha se esperaba?",
    "¿cuándo marca su frecuencia histórica?",
    "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
    "próxima compra estimada de TORTILLERIA ERICK",
    "cuándo le toca comprar otra vez",
    "expected next purchase de TORTILLERIA ERICK",
    "last purchase más freqDays de TORTILLERIA ERICK",
    "cuándo cae la siguiente compra de TORTILLERIA ERICK",
    "fecha estimada de TORTILLERIA ERICK",
    "cuándo debería comprar TORTILLERIA ERICK",
    "calendario estimado de TORTILLERIA ERICK",
    "siguiente compra de TORTILLERIA ERICK",
    "cuándo normalmente compra TORTILLERIA ERICK",
    "cuándo volvería TORTILLERIA ERICK",
    "próxima fecha esperada de TORTILLERIA ERICK",
    "cuándo le tocaría pedir a TORTILLERIA ERICK",
    "ventana histórica de compra de TORTILLERIA ERICK",
    "cuándo esperariamos a TORTILLERIA ERICK",
    "qué día debería comprar TORTILLERIA ERICK",
    "compra esperada de TORTILLERIA ERICK",
    "cuándo debería regresar TORTILLERIA ERICK",
    "marca su frecuencia histórica TORTILLERIA ERICK",
  ],
  CHANNEL_SHARE_REFERENCE_PERIOD: [
    "¿Cuánto cambió la participación de Casa contra julio?",
    "¿cómo quedó contra julio?",
    "¿qué cambió frente a julio?",
    "¿Casa ganó participación contra julio?",
    "¿cuántos pp cambió contra julio?",
    "¿y contra agosto?",
    "¿cómo estamos vs julio?",
    "¿qué diferencia hay contra julio?",
    "¿comparado con julio?",
    "¿cuánto varió respecto a julio?",
    "participación de Casa contra julio",
    "cambio de share contra julio",
    "Casa vs julio en pp",
    "cómo quedó Casa frente a julio",
    "variación de Casa respecto de julio",
    "delta de participación contra julio",
    "Casa comparado con julio",
    "cuánto cambió Comisionista contra julio",
    "pp de Casa contra julio",
    "share change contra julio",
    "cómo estamos contra julio",
    "qué cambió Casa vs julio",
    "participación frente a julio",
    "cuánto varió Casa comparado con julio",
    "Casa contra julio en puntos",
    "diferencia de mix contra julio",
    "cómo quedó el share contra julio",
    "evolución de Casa respecto a julio",
    "Casa ganó o perdió contra julio",
    "cambio porcentual de Casa contra julio",
  ],
  CHANNEL_FORECAST_PROJECTION_GUARDRAIL: [
    "¿qué porcentaje de Casa proyectamos al cierre?",
    "¿cómo cerrará Casa?",
    "¿cuánto será Comisionista al cierre?",
    "¿qué share tendrá Casa?",
    "¿cómo proyectamos el mix?",
    "¿cuánto representará Casa al cierre?",
    "¿qué porcentaje esperamos de Comisionistas?",
    "¿cómo terminará la mezcla?",
    "¿qué forecast tenemos por canal?",
    "¿cómo se proyecta Casa vs Comisionista?",
    "para septiembre que porcentaje de casa y de comisionistas proyectamos al cierre?",
    "qué porcentaje de Casa y Comisionista proyectamos al cierre",
    "cómo cerrará el mix Casa Comisionista",
    "qué porcentaje esperamos de Casa al cierre",
    "estimamos el share de Comisionista al cierre",
    "proyectamos la participación de Casa al cierre",
    "cómo terminará Casa versus Comisionista",
    "qué share tendrá Comisionista al cierre",
    "forecast por canal Casa Comisionista",
    "cómo proyectamos Casa y Comisionista al cierre",
    "qué porcentaje de Comisionista proyectamos al cierre",
    "cerrará Casa con qué porcentaje",
    "esperamos qué mix de Casa al cierre",
    "terminará la mezcla Casa Comisionista cómo",
    "proyectamos al cierre el porcentaje de Casa",
    "qué representará Comisionista al cierre",
    "cómo se proyecta el share Casa Comisionista",
    "estimamos Casa y Comisionista al cierre",
    "qué porcentaje de casa proyectamos para septiembre al cierre",
    "forecast de mix Casa Comisionista al cierre",
  ],
});

const HARDENING_ANTI_COLLISIONS = Object.freeze([
  ["¿Qué porcentaje de la venta de agosto fue Casa?", "SALES_CHANNEL_SHARE", "CHANNEL_FORECAST_PROJECTION_GUARDRAIL"],
  ["participación observada de Casa en agosto", "SALES_CHANNEL_SHARE", "CHANNEL_FORECAST_PROJECTION_GUARDRAIL"],
  ["para septiembre que porcentaje de casa y de comisionistas proyectamos al cierre?", "CHANNEL_FORECAST_PROJECTION_GUARDRAIL", "SALES_CHANNEL_SHARE"],
  ["qué porcentaje de Casa proyectamos al cierre", "CHANNEL_FORECAST_PROJECTION_GUARDRAIL", "SALES_CHANNEL_SHARE"],
  ["qué porcentaje proyectado es Casa y Comisionista", null, "CHANNEL_FORECAST_PROJECTION_GUARDRAIL"],
  ["descuento cero real de los nuevos", "NEW_CLIENT_DISCOUNT_EVIDENCE", "NEW_CLIENTS"],
  ["¿Qué descuento tuvieron los nuevos?", "NEW_CLIENT_DISCOUNT_EVIDENCE", "NEW_CLIENTS"],
  ["¿Cuáles no tienen dato de descuento?", "NEW_CLIENT_DISCOUNT_EVIDENCE", "NEW_CLIENTS"],
  ["¿Cuánto cambió la participación de Casa contra julio?", "CHANNEL_SHARE_REFERENCE_PERIOD", "SALES_CHANNEL_SHARE"],
  ["¿Qué porcentaje de la venta de julio fue Casa?", "SALES_CHANNEL_SHARE", "CHANNEL_SHARE_REFERENCE_PERIOD"],
  ["participación de Casa en julio", "SALES_CHANNEL_SHARE", "CHANNEL_SHARE_REFERENCE_PERIOD"],
  ["¿cómo quedó contra julio?", "CHANNEL_SHARE_REFERENCE_PERIOD", "SALES_CHANNEL_SHARE"],
  ["dame los que dejaron de comprar en agosto", "LOST_CLIENTS", "CHURN_RISK_MATERIALIZATION"],
  ["¿Qué clientes están en riesgo de dejar de comprar?", "CHURN_RISK_MATERIALIZATION", "LOST_CLIENTS"],
  ["¿Qué clientes están en riesgo de dejar de comprar en septiembre?", "CHURN_RISK_MATERIALIZATION", "LOST_CLIENTS"],
  ["quiénes dejaron de comprar", "LOST_CLIENTS", "CHURN_RISK_MATERIALIZATION"],
  ["¿Cuánto perdimos con ellos?", "LOST_VOLUME_CONTEXTUAL_AGGREGATE", "LOST_CLIENTS"],
  ["quiénes perdimos en agosto", "LOST_CLIENTS", "LOST_VOLUME_CONTEXTUAL_AGGREGATE"],
  ["¿Cuánto dejamos de vender por los clientes que cayeron a cero?", "LOST_VOLUME_CONTEXTUAL_AGGREGATE", "LOST_CLIENTS"],
  ["top 10 que dejaron de comprar", "LOST_CLIENTS", "LOST_VOLUME_CONTEXTUAL_AGGREGATE"],
  ["total de clientes nuevos", "CONTEXTUAL_NEW_CLIENT_COUNT", "NEW_CLIENT_PURCHASE_TOTAL"],
  ["¿Qué clientes nuevos entraron en agosto?", "NEW_CLIENTS", "CONTEXTUAL_NEW_CLIENT_COUNT"],
  ["cuánto compraron los nuevos", "NEW_CLIENT_PURCHASE_TOTAL", "CONTEXTUAL_NEW_CLIENT_COUNT"],
  ["¿Cuándo vuelve TORTILLERIA ERICK?", "EXPECTED_NEXT_PURCHASE_MATERIALIZATION", "CHURN_RISK_MATERIALIZATION"],
  ["¿quién está atrasado?", "CHURN_RISK_MATERIALIZATION", "EXPECTED_NEXT_PURCHASE_MATERIALIZATION"],
  ["¿está atrasado?", "EXPECTED_NEXT_PURCHASE_MATERIALIZATION", "CHURN_RISK_MATERIALIZATION"],
  ["¿Cuánto perdimos con los que dejaron de comprar?", "PENDING_CLARIFICATION_OPERATION", "LOST_CLIENTS"],
  ["cómo cerrará Casa", "CHANNEL_FORECAST_PROJECTION_GUARDRAIL", "SALES_CHANNEL_SHARE"],
  ["venta observada de Casa en agosto", "SALES_CHANNEL_SHARE", "CHANNEL_FORECAST_PROJECTION_GUARDRAIL"],
  ["Dame los 10 clientes comisionistas que más compraron en agosto.", "TOP_CLIENTS_BY_CHANNEL", "CHANNEL_FORECAST_PROJECTION_GUARDRAIL"],
]);

function expandAntiCollisions(base) {
  const extra = [];
  const observed = [
    "participación observada de Casa",
    "share observado de Comisionista",
    "porcentaje observado Casa agosto",
    "cómo se dividió la venta observada",
    "reparto observado Casa Comisionista",
  ];
  const projected = [
    "qué porcentaje de Casa proyectamos al cierre",
    "cómo cerrará Comisionista",
    "qué share tendrá Casa al cierre",
    "cómo proyectamos el mix al cierre",
    "qué porcentaje esperamos de Casa",
  ];
  for (const q of observed) extra.push([q, null, "CHANNEL_FORECAST_PROJECTION_GUARDRAIL"]);
  for (const q of projected) extra.push([q, "CHANNEL_FORECAST_PROJECTION_GUARDRAIL", "SALES_CHANNEL_SHARE"]);
  const zeroReal = [
    "descuento cero observado de un nuevo",
    "nuevo con descuento 0 registrado",
    "fila de descuento en cero de un nuevo",
  ];
  const missing = [
    "cuáles no tienen fila de descuento",
    "data_not_found de descuento de nuevos",
    "cuántos nuevos carecen de descuento",
  ];
  for (const q of zeroReal) extra.push([q, "NEW_CLIENT_DISCOUNT_EVIDENCE", "NEW_CLIENTS"]);
  for (const q of missing) extra.push([q, "NEW_CLIENT_DISCOUNT_EVIDENCE", "NEW_CLIENTS"]);
  const contra = [
    "Casa contra julio",
    "pp contra julio",
    "share contra julio",
    "varió respecto a julio",
    "estamos vs julio",
  ];
  const enJulio = [
    "participación de Casa en julio",
    "qué porcentaje fue Casa en julio",
    "share de Casa en julio",
    "cómo quedó Casa en julio",
    "venta de Casa en julio",
  ];
  for (const q of contra) extra.push([q, "CHANNEL_SHARE_REFERENCE_PERIOD", "SALES_CHANNEL_SHARE"]);
  for (const q of enJulio) extra.push([q, null, "CHANNEL_SHARE_REFERENCE_PERIOD"]);
  const lostList = [
    "quiénes dejaron de comprar",
    "lista de los que cayeron a cero",
    "dame los que se fueron",
    "qué clientes perdimos",
    "top 10 que dejaron de comprar",
  ];
  const risk = [
    "quién está en riesgo de dejar de comprar",
    "qué clientes están atrasados",
    "quién tiene señal de interrupción",
    "quién está fuera de su frecuencia",
    "qué cuentas están atrasadas",
  ];
  for (const q of lostList) extra.push([q, null, "CHURN_RISK_MATERIALIZATION"]);
  for (const q of risk) extra.push([q, "CHURN_RISK_MATERIALIZATION", "LOST_CLIENTS"]);
  const howMuch = [
    "cuánto perdimos con ellos",
    "cuánto dejamos de vender",
    "pérdida total de los caídos",
    "cuánto volumen perdimos",
    "cuánto suman las bajas a cero",
  ];
  const whoLost = [
    "quiénes perdimos",
    "qué clientes se fueron",
    "lista de caídos a cero",
    "dame los que dejaron de comprar",
    "cuáles clientes perdimos",
  ];
  for (const q of howMuch) extra.push([q, "LOST_VOLUME_CONTEXTUAL_AGGREGATE", "LOST_CLIENTS"]);
  for (const q of whoLost) extra.push([q, null, "LOST_VOLUME_CONTEXTUAL_AGGREGATE"]);
  const counts = [
    "total de clientes nuevos",
    "cuántos fueron",
    "cuántos en total",
    "dame el total",
    "número total de clientes nuevos",
  ];
  const lists = [
    "qué clientes nuevos entraron en agosto",
    "lista de clientes nuevos",
    "quiénes son los nuevos",
    "nombres de los nuevos de agosto",
    "dame los clientes nuevos",
  ];
  for (const q of counts) extra.push([q, "CONTEXTUAL_NEW_CLIENT_COUNT", "NEW_CLIENTS"]);
  for (const q of lists) extra.push([q, null, "CONTEXTUAL_NEW_CLIENT_COUNT"]);
  const more = [];
  for (let i = 1; i <= 40; i += 1) {
    more.push([`participación observada variante ${i} de Casa`, null, "CHANNEL_FORECAST_PROJECTION_GUARDRAIL"]);
    more.push([`proyectamos al cierre el porcentaje de Casa v${i}`, "CHANNEL_FORECAST_PROJECTION_GUARDRAIL", "SALES_CHANNEL_SHARE"]);
  }
  return [...base, ...extra, ...more];
}

const HARDENING_ANTI_COLLISIONS_FULL = Object.freeze(expandAntiCollisions([...HARDENING_ANTI_COLLISIONS]));

const HARDENING_MULTI_TURN = Object.freeze([
  [
    { q: "¿Qué clientes nuevos entraron en agosto?", expect: { period: "2026-08" } },
    { q: "total de clientes nuevos", expect: { family: "CONTEXTUAL_NEW_CLIENT_COUNT", period: "2026-08", noClarification: true } },
    { q: "¿y cuántas toneladas compraron?", expect: { period: "2026-08" } },
    { q: "¿y qué descuento tuvieron?", expect: { family: "NEW_CLIENT_DISCOUNT_EVIDENCE", period: "2026-08" } },
  ],
  [
    { q: "Dame los que dejaron de comprar en agosto", expect: { period: "2026-08" } },
    { q: "¿Cuánto perdimos con ellos?", expect: { family: "LOST_VOLUME_CONTEXTUAL_AGGREGATE", period: "2026-08" } },
    { q: "¿Y cuáles eran Comisionistas?", expect: { period: "2026-08" } },
  ],
  [
    { q: "¿Cuánto perdimos por clientes caídos?", expect: { family: "LOST_VOLUME_CONTEXTUAL_AGGREGATE" } },
    { q: "¿de qué mes?", expect: {} },
    { q: "agosto", expect: { family: "PENDING_CLARIFICATION_OPERATION", period: "2026-08", keepAggregate: true } },
  ],
  [
    { q: "¿Qué porcentaje fue Casa en agosto?", expect: { period: "2026-08" } },
    { q: "¿y contra julio?", expect: { family: "CHANNEL_SHARE_REFERENCE_PERIOD", from: "2026-07", to: "2026-08" } },
  ],
  [
    { q: "¿Cómo va Casa este mes?", expect: {} },
    { q: "¿qué porcentaje proyectamos al cierre?", expect: { family: "CHANNEL_FORECAST_PROJECTION_GUARDRAIL" } },
  ],
]);

function expandMultiTurn(base) {
  const extra = [];
  for (let i = 0; i < 11; i += 1) {
    extra.push([
      { q: "¿Qué clientes nuevos entraron en agosto?", expect: { period: "2026-08" } },
      { q: "total de clientes nuevos", expect: { family: "CONTEXTUAL_NEW_CLIENT_COUNT", period: "2026-08" } },
    ]);
    extra.push([
      { q: "Dame los que dejaron de comprar en agosto", expect: { period: "2026-08" } },
      { q: "¿Cuánto dejamos de vender por los clientes que cayeron a cero?", expect: { family: "LOST_VOLUME_CONTEXTUAL_AGGREGATE", period: "2026-08" } },
    ]);
    extra.push([
      { q: "¿Cuánto perdimos con los que dejaron de comprar?", expect: { family: "PENDING_CLARIFICATION_OPERATION" } },
      { q: "agosto", expect: { family: "PENDING_CLARIFICATION_OPERATION", period: "2026-08", keepAggregate: true } },
    ]);
    extra.push([
      { q: "¿Qué porcentaje fue Casa en agosto?", expect: { period: "2026-08" } },
      { q: "¿cuánto cambió contra julio?", expect: { family: "CHANNEL_SHARE_REFERENCE_PERIOD", from: "2026-07", to: "2026-08" } },
    ]);
    extra.push([
      { q: "¿Cómo va Casa este mes?" },
      { q: "para septiembre que porcentaje de casa y de comisionistas proyectamos al cierre?", expect: { family: "CHANNEL_FORECAST_PROJECTION_GUARDRAIL" } },
    ]);
  }
  return [...base, ...extra];
}

const HARDENING_MULTI_TURN_FULL = Object.freeze(expandMultiTurn([...HARDENING_MULTI_TURN]));

const HARDENING_REGRESSIONS = Object.freeze([
  { q: "total de clientes nuevos", family: "CONTEXTUAL_NEW_CLIENT_COUNT" },
  { q: "¿Cuánto dejamos de vender por los clientes que cayeron a cero?", family: "LOST_VOLUME_CONTEXTUAL_AGGREGATE" },
  { q: "¿Qué clientes están en riesgo de dejar de comprar?", family: "CHURN_RISK_MATERIALIZATION" },
  { q: "¿Qué clientes están en riesgo de dejar de comprar en septiembre?", family: "CHURN_RISK_MATERIALIZATION" },
  { q: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", family: "EXPECTED_NEXT_PURCHASE_MATERIALIZATION" },
  { q: "¿Cuánto cambió la participación de Casa contra julio?", family: "CHANNEL_SHARE_REFERENCE_PERIOD" },
  { q: "Dame los 10 clientes comisionistas que más compraron en agosto.", family: "TOP_CLIENTS_BY_CHANNEL" },
  { q: "para septiembre que porcentaje de casa y de comisionistas proyectamos al cierre?", family: "CHANNEL_FORECAST_PROJECTION_GUARDRAIL" },
]);

module.exports = {
  HARDENING_FAMILY_IDS,
  HARDENING_UTTERANCES,
  HARDENING_ANTI_COLLISIONS: HARDENING_ANTI_COLLISIONS_FULL,
  HARDENING_MULTI_TURN: HARDENING_MULTI_TURN_FULL,
  HARDENING_REGRESSIONS,
};
