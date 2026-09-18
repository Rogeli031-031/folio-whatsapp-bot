"use strict";

/**
 * Genera utterances explícitas (tests only). No se importa desde lib/.
 */

const fs = require("fs");
const path = require("path");
const { FAMILY_IDS } = require("../../lib/director-ia-executive-coverage");

const CORE = {
  CLIENTS_STOPPED_BUYING: {
    noun: "clientes que dejaron de comprar",
    verb: "dejaron de comprar",
    who: "quién dejó de comprar",
    colloq: ["quiénes ya no nos compran", "quién ya no compra", "clientes que ya no piden", "los que se fueron a cero", "quién compraba y ahora no"],
    exec: ["principales clientes perdidos", "ranking de clientes que dejaron de comprar", "mayor volumen perdido", "quién representa más toneladas perdidas", "clientes con mayor volumen perdido"],
    alt: ["qué clientes dejaron de consumir", "qué clientes dejaron de pedir", "clientes que cayeron a cero", "qué clientes perdimos", "lista de clientes perdidos"],
  },
  CLIENTS_DECREASED: {
    noun: "clientes que disminuyeron",
    verb: "disminuyeron",
    who: "quién bajó sus compras",
    colloq: ["quiénes están comprando menos", "quiénes bajaron volumen", "los que redujeron toneladas", "quién se cayó vs el mes pasado", "clientes que aflojaron"],
    exec: ["top caída de volumen", "mayor pérdida de toneladas entre los que siguen comprando", "ranking de disminución", "quién perdió más toneladas sin irse a cero", "contribución negativa de clientes activos"],
    alt: ["qué clientes redujeron", "quiénes bajaron compras", "clientes con caída de volumen", "quiénes compran menos", "lista de disminuciones"],
  },
  CLIENTS_INCREASED: {
    noun: "clientes que aumentaron",
    verb: "aumentaron",
    who: "quién aumentó compras",
    colloq: ["quién creció más", "quiénes subieron volumen", "los que agregaron toneladas", "quién se recuperó al alza", "clientes que empujaron"],
    exec: ["top crecimiento de volumen", "mayor delta positivo", "ranking de clientes que aumentaron", "quién agregó más toneladas", "contribución positiva de clientes"],
    alt: ["qué clientes subieron", "quiénes mejoraron volumen", "clientes al alza", "quién creció en toneladas", "lista de aumentos"],
  },
  CLIENTS_NEW: {
    noun: "clientes nuevos",
    verb: "entraron",
    who: "quién empezó a comprar",
    colloq: ["quiénes aparecieron este mes", "altas nuevas", "los que se incorporaron", "primera compra del mes", "quiénes debutaron"],
    exec: ["nuevos en el periodo", "altas comerciales del mes", "clientes con kg previo en cero y actual positivo", "incorporaciones del corte", "pipeline de nuevos"],
    alt: ["qué clientes nuevos entraron", "quiénes comenzaron a comprar", "clientes incorporados", "nuevos de la planta", "lista de altas"],
  },
  OPEN_PRONOSTICO: {
    noun: "pronóstico",
    verb: "abre",
    who: "llévame al pronóstico",
    colloq: ["enséñame la hoja Pronóstico", "quiero ver el forecast", "abre la proyección", "entra al pronóstico", "ve al pronóstico"],
    exec: ["abre la hoja Pronóstico", "abre el modal de pronóstico", "abre la pantalla de pronóstico", "abre el detalle del pronóstico", "navega al pronóstico"],
    alt: ["abre el forecast", "muéstrame el forecast", "quiero abrir Pronóstico", "abre la hoja de proyección", "quiero revisar el pronóstico"],
  },
};

function scoped(base) {
  return [
    `${base} de Casa`,
    `${base} de Comisionista`,
    `${base} de Autotanque`,
    `${base} en Acapulco`,
    `${base} en septiembre`,
  ];
}

function follow(base) {
  return [
    `de esos, ${base}`,
    `ahora ${base}`,
    `y ${base} el mes pasado`,
    `solo ${base} este mes`,
    `${base} contra agosto`,
  ];
}

function thirty(family, core) {
  if (family === "OPEN_PRONOSTICO") {
    return [
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
    ];
  }
  const c = core || {
    noun: family.toLowerCase().replace(/_/g, " "),
    verb: "muéstrame",
    who: `quién sobre ${family.toLowerCase()}`,
    colloq: [`oye, ${family.toLowerCase()}`, `pasame ${family.toLowerCase()}`, `a ver ${family.toLowerCase()}`, `tirame ${family.toLowerCase()}`, `checa ${family.toLowerCase()}`],
    exec: [`reporte de ${family.toLowerCase()}`, `lectura ejecutiva de ${family.toLowerCase()}`, `prioridad de ${family.toLowerCase()}`, `tablero de ${family.toLowerCase()}`, `síntesis de ${family.toLowerCase()}`],
    alt: [`lista ${family.toLowerCase()}`, `ranking ${family.toLowerCase()}`, `detalle ${family.toLowerCase()}`, `consulta ${family.toLowerCase()}`, `revisión ${family.toLowerCase()}`],
  };
  return [
    `qué ${c.noun}`,
    c.who,
    `${c.verb} ${c.noun}`,
    `dame ${c.noun}`,
    `muéstrame ${c.noun}`,
    ...c.colloq,
    ...c.exec,
    ...scoped(c.noun),
    ...c.alt,
    ...follow(c.noun),
  ];
}

const SPECIAL = {
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
};

const coverage = {};
for (const family of FAMILY_IDS) {
  coverage[family] = SPECIAL[family] || thirty(family, CORE[family]);
  if (coverage[family].length < 30) {
    throw new Error(`${family} has ${coverage[family].length}`);
  }
}

const anti = [
  ["top 10 clientes que dejaron de comprar", "CLIENTS_STOPPED_BUYING", "CLIENT_RANKING"],
  ["top 10 clientes que más compran", "CLIENT_RANKING", "CLIENTS_STOPPED_BUYING"],
  ["qué clientes disminuyeron", "CLIENTS_DECREASED", "CLIENT_RANKING"],
  ["quiénes compran menos en absoluto", "CLIENT_RANKING", "CLIENTS_DECREASED"],
  ["qué clientes aumentaron", "CLIENTS_INCREASED", "CLIENT_RANKING"],
  ["top 10 que más compran", "CLIENT_RANKING", "CLIENTS_INCREASED"],
  ["clientes con mayor descuento", "DISCOUNT_RANKING", "DISCOUNT_TOTAL"],
  ["cuánto dimos en descuentos", "DISCOUNT_TOTAL", "DISCOUNT_RANKING"],
  ["abre el pronóstico", "OPEN_PRONOSTICO", "FORECAST_CLOSE"],
  ["cuál es el pronóstico", "FORECAST_CLOSE", "OPEN_PRONOSTICO"],
  ["cómo se calcula el pronóstico", "FORECAST_CLOSE", "OPEN_PRONOSTICO"],
  ["cuál es el PROY", "FORECAST_CLOSE", "OPEN_PRONOSTICO"],
  ["abre venta diaria", "DAILY_SALES", "OPEN_PRONOSTICO"],
  ["qué clientes nuevos entraron", "CLIENTS_NEW", "CLIENTS_REACTIVATED"],
  ["qué clientes se reactivaron", "CLIENTS_REACTIVATED", "CLIENTS_NEW"],
  ["qué folios de llantas hay", null, "CLIENTS_STOPPED_BUYING"],
  ["proyectos retrasados", "DELAYED_PROJECTS", "OVERDUE_ACTIONS"],
  ["acciones vencidas", "OVERDUE_ACTIONS", "DELAYED_PROJECTS"],
  ["equipos SEH vencidos", "EXPIRED_EQUIPMENT", "DELAYED_PROJECTS"],
  ["qué clientes dejaron de comprar", "CLIENTS_STOPPED_BUYING", "CLIENTS_DECREASED"],
];

const plants = ["Acapulco", "Puebla", "Casa", "Comisionista", "Autotanque"];
const months = ["septiembre", "agosto", "julio", "este mes", "el mes pasado"];
for (let i = 0; anti.length < 150; i += 1) {
  const fam = FAMILY_IDS[i % FAMILY_IDS.length];
  const other = FAMILY_IDS[(i + 11) % FAMILY_IDS.length];
  if (fam === other) continue;
  anti.push([
    `${coverage[fam][i % coverage[fam].length]} ${plants[i % plants.length]} ${months[i % months.length]}`,
    fam,
    other,
  ]);
}

const e2e = [];
function pushConv(turns) {
  e2e.push(turns);
}
pushConv([
  { q: "top 10 clientes que dejaron de comprar", expect: { intent: "client_movement", movement: "DEJARON_DE_COMPRAR" } },
  { q: "septiembre", expect: { period: "2026-09", movement: "DEJARON_DE_COMPRAR", not_intent: "client_ranking" } },
  { q: "solo Casa", expect: { channel: "CASA", movement: "DEJARON_DE_COMPRAR" } },
  { q: "cuál tenía mayor descuento", expect: { family: "MOVEMENT_DISCOUNT_CROSS" } },
  { q: "qué acciones tiene el primero", expect: { family: "MOVEMENT_ACTION_CROSS" } },
]);
pushConv([
  { q: "qué clientes disminuyeron", expect: { intent: "client_movement", movement: "DISMINUYERON" } },
  { q: "Comisionista", expect: { channel: "COMISIONISTA", movement: "DISMINUYERON" } },
  { q: "top 5", expect: { limit: 5, movement: "DISMINUYERON" } },
  { q: "cuánto ingreso representan", expect: { family: "MOVEMENT_INCOME_CROSS" } },
]);
pushConv([
  { q: "cómo vamos", expect: { family: "EXECUTIVE_STATUS" } },
  { q: "qué clientes explican la caída", expect: { family: "CLIENT_DECLINE_CONTRIBUTION" } },
  { q: "solo Autotanque", expect: { keep: true } },
  { q: "cuáles dejaron de comprar", expect: { movement: "DEJARON_DE_COMPRAR" } },
]);
pushConv([
  { q: "abre el pronóstico", expect: { intent: "open_pronostico" } },
]);
pushConv([
  { q: "cuál es el pronóstico", expect: { not_intent: "open_pronostico" } },
]);

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
while (e2e.length < 100) {
  const i = e2e.length;
  const seed = seeds[i % seeds.length];
  const month = months[i % months.length];
  const plant = plants[i % plants.length];
  pushConv([
    { q: seed[0], expect: seed[1] ? { movement: seed[1] } : { keep: true } },
    { q: month, expect: { keep: true } },
    { q: `solo ${plant}`, expect: { keep: true } },
  ]);
}

const out = `/* eslint-disable */
"use strict";
/** Fixtures de cobertura ejecutiva. SOLO tests. No importar desde lib/. */
module.exports = {
  EXECUTIVE_UTTERANCE_COVERAGE: ${JSON.stringify(coverage, null, 2)},
  EXECUTIVE_ANTI_COLLISIONS: ${JSON.stringify(anti, null, 2)},
  EXECUTIVE_E2E_CONVERSATIONS: ${JSON.stringify(e2e, null, 2)},
};
`;

const dest = path.join(__dirname, "director-ia-executive-utterance-coverage.js");
fs.writeFileSync(dest, out);
console.log("wrote", dest, "families", Object.keys(coverage).length, "anti", anti.length, "e2e", e2e.length);
