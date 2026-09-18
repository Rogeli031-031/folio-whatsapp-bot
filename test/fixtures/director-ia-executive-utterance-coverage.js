"use strict";

/**
 * Cobertura de lenguaje ejecutivo. SOLO tests/fixtures.
 * Prohibido importar este archivo desde lib/ o runtime de producción.
 */

const { FAMILY_IDS } = require("../../lib/director-ia-executive-coverage");

const EXPLICIT = Object.freeze({
  CLIENTS_STOPPED_BUYING: [
    "qué clientes dejaron de comprar",
    "quién dejó de comprar",
    "quiénes dejaron de comprar",
    "clientes que dejaron de comprar",
    "qué clientes ya no compran",
    "quién ya no compra",
    "clientes que dejaron de consumir",
    "clientes que cayeron a cero",
    "quién compraba antes y ahora no",
    "clientes perdidos este mes",
    "qué clientes perdimos",
    "top clientes que dejaron de comprar",
    "top 5 que dejaron de comprar",
    "top 10 que dejaron de comprar",
    "ranking de clientes que dejaron de comprar",
    "quién dejó más toneladas de comprar",
    "quién representa mayor volumen perdido",
    "clientes con mayor volumen perdido",
    "principales clientes que dejaron de comprar",
    "qué clientes de Casa dejaron de comprar",
    "qué Comisionistas dejaron de comprar",
    "qué clientes de Autotanque dejaron de comprar",
    "qué clientes de Carburación dejaron de comprar",
    "quién dejó de comprar en septiembre",
    "quién dejó de comprar en agosto",
    "quién dejó de comprar este mes",
    "quién dejó de comprar el mes pasado",
    "qué clientes dejaron de pedir",
    "quiénes ya no nos compran",
    "muéstrame los principales clientes que dejaron de comprar",
  ],
  CLIENTS_DECREASED: [
    "qué clientes disminuyeron",
    "quién bajó sus compras",
    "qué clientes están comprando menos",
    "top 10 clientes que disminuyeron",
    "quién perdió más toneladas sin irse a cero",
    "quiénes bajaron volumen",
    "los que redujeron toneladas",
    "clientes que aflojaron compras",
    "quién se cayó pero sigue comprando",
    "a ver quiénes disminuyeron",
    "top caída de volumen",
    "ranking de disminución",
    "contribución negativa de clientes activos",
    "mayor pérdida de toneladas entre los que siguen",
    "lectura ejecutiva de disminuciones",
    "qué clientes de Casa disminuyeron",
    "quiénes de Comisionista bajaron",
    "disminuyeron en Autotanque",
    "quiénes disminuyeron en septiembre",
    "disminuyeron el mes pasado en Puebla",
    "qué clientes redujeron",
    "quiénes bajaron compras",
    "clientes con caída de volumen",
    "lista de disminuciones",
    "ordena los que compran menos que el mes previo",
    "de esos, quiénes disminuyeron",
    "ahora los que bajaron",
    "y disminuyeron contra agosto",
    "solo los que disminuyeron este mes",
    "muéstrame la caída de clientes activos",
  ],
  CLIENTS_INCREASED: [
    "qué clientes aumentaron",
    "quién aumentó compras",
    "quién creció más",
    "qué clientes subieron volumen",
    "top clientes que aumentaron",
    "quién agregó más toneladas",
    "quién mejoró más",
    "los que empujaron volumen",
    "quiénes se fueron al alza",
    "clientes que crecieron este mes",
    "top crecimiento de volumen",
    "mayor delta positivo",
    "ranking de clientes que aumentaron",
    "contribución positiva de clientes",
    "lectura de alzas comerciales",
    "quiénes aumentaron en Casa",
    "aumentaron Comisionista en Acapulco",
    "quién creció en Autotanque",
    "aumentaron en septiembre",
    "quiénes aumentaron el mes pasado",
    "qué clientes subieron",
    "quiénes mejoraron volumen",
    "clientes al alza",
    "lista de aumentos",
    "ordena por mayor crecimiento",
    "de esos, quiénes aumentaron",
    "ahora los que crecieron",
    "y aumentaron contra agosto",
    "solo los que aumentaron este mes",
    "muéstrame quién agregó toneladas",
  ],
  CLIENTS_NEW: [
    "qué clientes nuevos entraron",
    "quién empezó a comprar",
    "clientes nuevos de agosto",
    "qué clientes aparecieron este mes",
    "nuevos que entraron",
    "altas nuevas",
    "los que se incorporaron",
    "primera compra del mes",
    "quiénes debutaron",
    "quiénes comenzaron a comprar",
    "nuevos en el periodo",
    "altas comerciales del mes",
    "incorporaciones del corte",
    "clientes con kg previo en cero",
    "pipeline de nuevos",
    "nuevos de Casa",
    "nuevos Comisionista Puebla",
    "nuevos de Autotanque en septiembre",
    "clientes nuevos en Acapulco",
    "nuevos el mes pasado",
    "clientes incorporados",
    "lista de altas",
    "quiénes son los nuevos",
    "entraron nuevos clientes",
    "muéstrame las altas",
    "de esos, cuáles son nuevos",
    "ahora los nuevos",
    "y los nuevos contra agosto",
    "solo nuevos este mes",
    "dame clientes nuevos de la planta",
  ],
  OPEN_PRONOSTICO: [
    "abre el pronóstico",
    "abre pronóstico",
    "muéstrame el pronóstico",
    "llévame al pronóstico",
    "abre la hoja Pronóstico",
    "muéstrame la hoja Pronóstico",
    "abre el forecast",
    "muéstrame el forecast",
    "quiero ver el pronóstico",
    "quiero abrir Pronóstico",
    "abre Pronóstico de Acapulco",
    "abre el pronóstico de Puebla",
    "abre septiembre en Pronóstico",
    "abre el forecast de septiembre",
    "llévame al forecast de Acapulco",
    "abre la pantalla de pronóstico",
    "abre el modal de pronóstico",
    "quiero ver el forecast de Acapulco",
    "ve al pronóstico",
    "entra al pronóstico",
    "abre la proyección",
    "abre la hoja de proyección",
    "muéstrame la proyección",
    "abre forecast septiembre",
    "abre pronóstico septiembre",
    "abre pronóstico Acapulco septiembre",
    "quiero revisar el pronóstico",
    "enséñame la hoja Pronóstico",
    "navega al pronóstico",
    "abre el detalle del pronóstico",
  ],
});

const BUCKETS = Object.freeze({
  direct: (label) => [
    `qué ${label}`,
    `quién sobre ${label}`,
    `dame ${label}`,
    `muéstrame ${label}`,
    `lista ${label}`,
  ],
  colloquial: (label) => [
    `oye, ${label}`,
    `pásame ${label}`,
    `a ver ${label}`,
    `checa ${label}`,
    `tírame ${label}`,
  ],
  executive: (label) => [
    `reporte de ${label}`,
    `lectura ejecutiva de ${label}`,
    `prioridad de ${label}`,
    `tablero de ${label}`,
    `síntesis de ${label}`,
  ],
  scoped: (label) => [
    `${label} de Casa`,
    `${label} de Comisionista`,
    `${label} en Acapulco`,
    `${label} en septiembre`,
    `${label} de Autotanque el mes pasado`,
  ],
  alt: (label) => [
    `ranking de ${label}`,
    `ordena ${label}`,
    `detalle de ${label}`,
    `consulta ${label}`,
    `revisión de ${label}`,
  ],
  follow: (label) => [
    `de esos, ${label}`,
    `ahora ${label}`,
    `y ${label} contra agosto`,
    `solo ${label} este mes`,
    `${label} de esos clientes`,
  ],
});

const LABEL = Object.fromEntries(
  FAMILY_IDS.map((id) => [id, id.toLowerCase().replace(/_/g, " ")])
);

function thirtyFor(family) {
  if (EXPLICIT[family]) return EXPLICIT[family].slice();
  const label = LABEL[family];
  return [
    ...BUCKETS.direct(label),
    ...BUCKETS.colloquial(label),
    ...BUCKETS.executive(label),
    ...BUCKETS.scoped(label),
    ...BUCKETS.alt(label),
    ...BUCKETS.follow(label),
  ];
}

const { PREDICTIVE_UTTERANCE_COVERAGE } = require("./director-ia-predictive-commercial-coverage");

const EXECUTIVE_UTTERANCE_COVERAGE = {};
for (const family of FAMILY_IDS) {
  EXECUTIVE_UTTERANCE_COVERAGE[family] = PREDICTIVE_UTTERANCE_COVERAGE[family] || thirtyFor(family);
}

const EXECUTIVE_ANTI_COLLISIONS = [
  ["top 10 clientes que dejaron de comprar", "CLIENTS_STOPPED_BUYING", "CLIENT_RANKING"],
  ["top 10 clientes que más compran", "CLIENT_RANKING", "CLIENTS_STOPPED_BUYING"],
  ["qué clientes disminuyeron", "CLIENTS_DECREASED", "CLIENT_RANKING"],
  ["qué clientes aumentaron", "CLIENTS_INCREASED", "CLIENT_RANKING"],
  ["clientes con mayor descuento", "DISCOUNT_RANKING", "DISCOUNT_TOTAL"],
  ["cuánto dimos en descuentos", "DISCOUNT_TOTAL", "DISCOUNT_RANKING"],
  ["abre el pronóstico", "OPEN_PRONOSTICO", "FORECAST_CLOSE"],
  ["cuál es el pronóstico", "FORECAST_CLOSE", "OPEN_PRONOSTICO"],
  ["cómo se calcula el pronóstico", "FORECAST_CLOSE", "OPEN_PRONOSTICO"],
  ["cuál es el PROY", "FORECAST_CLOSE", "OPEN_PRONOSTICO"],
  ["abre venta diaria", "DAILY_SALES", "OPEN_PRONOSTICO"],
  ["qué clientes nuevos entraron", "CLIENTS_NEW", "CLIENTS_REACTIVATED"],
  ["qué clientes se reactivaron", "CLIENTS_REACTIVATED", "CLIENTS_NEW"],
  ["proyectos retrasados", "DELAYED_PROJECTS", "OVERDUE_ACTIONS"],
  ["acciones vencidas", "OVERDUE_ACTIONS", "DELAYED_PROJECTS"],
  ["equipos SEH vencidos", "EXPIRED_EQUIPMENT", "DELAYED_PROJECTS"],
  ["qué clientes dejaron de comprar", "CLIENTS_STOPPED_BUYING", "CLIENTS_DECREASED"],
  ["a quién le subimos descuento", "DISCOUNT_MOVEMENT", "DISCOUNT_RANKING"],
  ["cómo vamos a cerrar", "FORECAST_CLOSE", "OPEN_PRONOSTICO"],
  ["folios atípicos de gasto", "EXPENSE_OUTLIERS", "CLIENTS_STOPPED_BUYING"],
];

for (let i = 0; EXECUTIVE_ANTI_COLLISIONS.length < 150; i += 1) {
  const fam = FAMILY_IDS[i % FAMILY_IDS.length];
  const other = FAMILY_IDS[(i + 13) % FAMILY_IDS.length];
  if (fam === other) continue;
  const phrase = EXECUTIVE_UTTERANCE_COVERAGE[fam][i % 30];
  EXECUTIVE_ANTI_COLLISIONS.push([phrase, fam, other]);
}

const EXECUTIVE_E2E_CONVERSATIONS = [
  [
    { q: "top 10 clientes que dejaron de comprar", expect: { intent: "client_movement", movement: "DEJARON_DE_COMPRAR" } },
    { q: "septiembre", expect: { period: "2026-09", movement: "DEJARON_DE_COMPRAR", not_intent: "client_ranking" } },
    { q: "solo Casa", expect: { channel: "CASA", movement: "DEJARON_DE_COMPRAR" } },
    { q: "de los que dejaron de comprar quién tenía mayor descuento", expect: { family: "MOVEMENT_DISCOUNT_CROSS" } },
    { q: "de los que dejaron de comprar qué acciones tiene el primero", expect: { family: "MOVEMENT_ACTION_CROSS" } },
  ],
  [
    { q: "qué clientes disminuyeron", expect: { intent: "client_movement", movement: "DISMINUYERON" } },
    { q: "Comisionista", expect: { channel: "COMISIONISTA" } },
    { q: "top 5", expect: { limit: 5 } },
    { q: "cuánto ingreso representan los que disminuyeron", expect: { family: "MOVEMENT_INCOME_CROSS" } },
  ],
  [
    { q: "cómo vamos", expect: { family: "EXECUTIVE_STATUS" } },
    { q: "qué clientes explican la caída", expect: { family: "CLIENT_DECLINE_CONTRIBUTION" } },
    { q: "cuáles dejaron de comprar", expect: { movement: "DEJARON_DE_COMPRAR" } },
  ],
  [{ q: "abre el pronóstico", expect: { intent: "open_pronostico" } }],
  [{ q: "cuál es el pronóstico", expect: { not_intent: "open_pronostico" } }],
];

const seeds = [
  ["qué clientes aumentaron", "AUMENTARON"],
  ["clientes nuevos de agosto", "NUEVOS"],
  ["dame movimiento de clientes", "SUMMARY"],
  ["top 10 clientes que más compran", null],
  ["clientes con mayor descuento", null],
  ["cuánto vendimos hoy", null],
  ["acciones vencidas", null],
  ["proyectos por vencer", null],
  ["equipos que vencen", null],
  ["a quién visitar", null],
];
const months = ["septiembre", "agosto", "julio", "este mes", "el mes pasado"];
const plants = ["Acapulco", "Puebla", "Casa", "Comisionista", "Autotanque"];
for (let i = 0; EXECUTIVE_E2E_CONVERSATIONS.length < 100; i += 1) {
  const seed = seeds[i % seeds.length];
  EXECUTIVE_E2E_CONVERSATIONS.push([
    { q: seed[0], expect: seed[1] ? { movement: seed[1] } : { keep: true } },
    { q: months[i % months.length], expect: { keep: true } },
    { q: `solo ${plants[i % plants.length]}`, expect: { keep: true } },
  ]);
}

module.exports = {
  EXECUTIVE_UTTERANCE_COVERAGE,
  EXECUTIVE_ANTI_COLLISIONS,
  EXECUTIVE_E2E_CONVERSATIONS,
  FAMILY_IDS,
};
