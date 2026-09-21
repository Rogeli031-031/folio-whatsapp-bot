"use strict";

const FAMILY_IDS = Object.freeze([
  "CHANNEL_SALES_STATUS",
  "CLIENT_MOVEMENT_DEJARON",
  "CLIENT_COMMENTS_PERIOD",
  "ACTION_REGISTER_DIRECT",
  "ACTION_REGISTER_RECENT",
  "BITACORA_TOPIC_LOOKUP",
]);

function unique(list) {
  return Object.freeze([...new Set(list.filter(Boolean))]);
}

function padFamily(base, extras) {
  const out = [...base];
  let i = 0;
  while (out.length < 50 && i < extras.length) {
    out.push(extras[i]);
    i += 1;
  }
  if (out.length < 50) throw new Error(`family needs 50, got ${out.length}`);
  return unique(out).slice(0, 50);
}

const CHANNEL_SALES_STATUS = padFamily(
  [
    "¿Cómo va la venta Casa?",
    "¿Cómo vamos en Casa?",
    "¿Cómo está vendiendo Casa?",
    "¿Cuánto lleva Casa?",
    "¿Qué venta tenemos en Casa?",
    "¿Cuántas toneladas lleva Casa?",
    "¿Cuál es el acumulado de Casa?",
    "¿Cómo va Comisionista?",
    "¿Cuánto lleva Comisionista?",
    "¿Cómo está vendiendo Comisionista?",
    "¿Cómo va Casa Autotanque?",
    "¿Cuánto vendió Casa Carburación?",
    "¿Cómo va Casa Portátil?",
    "Compara Casa contra Comisionista",
    "¿Cuánto representa Casa?",
  ],
  [
    "¿Cómo va la venta de Casa?",
    "¿Cómo andamos en Casa?",
    "¿Cuánto vendió Casa?",
    "¿Cuánto vendimos en Comisionista?",
    "¿Cómo va la venta Comisionista?",
    "Dame el acumulado de Comisionista",
    "¿Qué venta tenemos en Comisionista?",
    "¿Cuántas toneladas lleva Comisionista?",
    "¿Cómo va Casa carburación?",
    "¿Cómo va Casa portátil?",
    "¿Cómo va Casa autotanque?",
    "¿Cuánto lleva Casa Autotanque?",
    "¿Cuánto representa Comisionista?",
    "Compara Casa y Comisionista",
    "¿Cómo va el canal Casa?",
    "¿Cómo va el canal Comisionista?",
    "¿Qué venta observada hay en Casa?",
    "¿Cómo está Casa este mes?",
    "¿Cómo está Comisionista este mes?",
    "¿Cuánto lleva vendido Casa?",
    "¿Cuánto lleva vendido Comisionista?",
    "¿Cómo pinta Casa?",
    "¿Cómo pinta Comisionista?",
    "¿Cuál es la venta de Casa Carburación?",
    "¿Cuál es la venta de Casa Portátil?",
    "¿Cómo vamos en Casa Autotanque?",
    "¿Cuánto acumula Casa?",
    "¿Cuánto acumula Comisionista?",
    "¿Qué tal va Casa?",
    "¿Qué tal va Comisionista?",
    "Venta Casa al corte",
    "Venta Comisionista al corte",
    "¿Cómo va Casa versus Comisionista?",
    "¿Cuánto pesa Casa en la venta?",
    "Dame toneladas de Casa",
  ]
);

const CLIENT_MOVEMENT_DEJARON = padFamily(
  [
    "¿Qué clientes dejaron de comprar?",
    "Top 10 clientes que dejaron de comprar",
    "¿Quiénes dejaron de comprar?",
    "¿Qué clientes cayeron a cero?",
    "¿Quién dejó de comprarnos?",
    "¿Qué clientes perdimos?",
    "¿Quién compraba el mes pasado y ahora no?",
    "¿Qué clientes se fueron este mes?",
    "¿Qué clientes de Casa dejaron de comprar?",
    "¿Qué Comisionistas dejaron de comprar?",
    "¿Cuánto volumen perdimos por los que dejaron de comprar?",
  ],
  [
    "Dame el top 10 de los que dejaron de comprar",
    "Top 5 clientes que dejaron de consumir",
    "Lista de clientes que dejaron de pedir",
    "¿Qué clientes ya no compran?",
    "¿Qué clientes ya no consumen?",
    "Clientes perdidos este mes",
    "¿Quiénes cayeron a cero?",
    "¿Qué clientes dejaron de consumir?",
    "¿Qué clientes dejaron de pedir?",
    "Top 10 que se fueron este mes",
    "¿Quiénes perdimos?",
    "Clientes que cayeron a cero",
    "¿Qué cuentas dejaron de comprar?",
    "Dame quienes dejaron de comprar",
    "¿Qué clientes de Comisionista dejaron de comprar?",
    "Top 10 Casa que dejaron de comprar",
    "¿Cuántas toneladas perdimos por los que dejaron de comprar?",
    "Volumen perdido por clientes que dejaron de comprar",
    "¿Quiénes dejaron de comprarnos?",
    "¿Qué clientes dejaron de comprarnos?",
    "Los 10 que dejaron de comprar",
    "Ranking de clientes que cayeron a cero",
    "¿Qué clientes perdidos hay?",
    "Clientes que ya no compran",
    "¿Quién dejó de comprar?",
    "Top clientes perdidos",
    "¿Qué clientes se perdieron al caer a cero?",
    "Dame los que dejaron de consumir",
    "¿Quién compraba y ahora no?",
    "Clientes que dejaron de pedir este mes",
    "Top 8 clientes que dejaron de comprar",
    "¿Qué clientes de Casa cayeron a cero?",
    "¿Qué volumen dejaron de comprar?",
    "Lista top 10 dejaron de comprar",
    "¿Quiénes se fueron y dejaron de comprar?",
    "Clientes que ya no nos compran",
    "¿Qué clientes dejaron de comprar en Casa?",
    "Top 10 clientes perdidos",
    "¿Qué cuentas cayeron a cero?",
  ]
);

const CLIENT_COMMENTS_PERIOD = padFamily(
  [
    "¿Qué comentarios de clientes tenemos en septiembre?",
    "Dame los comentarios de septiembre.",
    "¿Qué se comentó de clientes este mes?",
    "¿Qué observaciones tenemos?",
    "¿Cuáles son los últimos comentarios?",
    "¿Qué comentarios hay de los que dejaron de comprar?",
    "¿Qué comentario tenemos de BAYAM?",
    "¿Cuál es el comentario más reciente de ese cliente?",
    "Dame cliente, comentario y fecha.",
    "Dame los 10 comentarios más recientes.",
  ],
  [
    "¿Qué comentarios de clientes hay?",
    "Comentarios de septiembre",
    "¿Qué notas de cliente tenemos?",
    "¿Qué nota comercial hay en septiembre?",
    "Observaciones de clientes en septiembre",
    "¿Qué se comentó en septiembre?",
    "Dame observaciones de este mes",
    "¿Hay comentarios de BAYAM en septiembre?",
    "¿Qué comentario tenemos de BAYAM RESIDENCES?",
    "¿Cuál es el último comentario de ese cliente?",
    "Comentarios de Casa en septiembre",
    "Comentarios de Comisionista",
    "¿Qué comentarios hay de los que disminuyeron?",
    "Dame los comentarios más recientes",
    "Últimos comentarios de clientes",
    "¿Qué observaciones hay de clientes?",
    "Lista de comentarios de septiembre",
    "¿Qué se comentó de clientes?",
    "Dame 5 comentarios",
    "¿Qué comentarios tenemos?",
    "Comentarios del mes",
    "¿Hay observaciones recientes?",
    "¿Qué comentario reciente hay?",
    "Dame comentario y fecha",
    "¿Qué comentarios de clientes de Casa hay?",
    "Observaciones de septiembre",
    "¿Qué se comentó este mes de clientes?",
    "Comentarios registrados de clientes",
    "¿Cuáles comentarios tenemos en septiembre?",
    "Dame los comentarios del cliente activo",
    "¿Qué notas de cliente hay este mes?",
    "Comentarios, cliente y fecha",
    "¿Qué observaciones de septiembre hay?",
    "¿Hay comentario de ese cliente?",
    "Último comentario del cliente",
    "¿Qué comentarios hay este mes?",
    "Dame observaciones y fecha",
    "Comentarios de los que dejaron de comprar",
    "¿Qué se comentó de los que disminuyeron?",
    "Lista de 10 comentarios recientes",
  ]
);

const ACTION_REGISTER_DIRECT = padFamily(
  [
    "¿Qué acciones tenemos?",
    "¿Qué hay en Action Register?",
    "Dame las acciones abiertas.",
    "¿Qué pendientes tenemos?",
    "¿Cuántas están vencidas?",
    "¿Qué acciones tiene Mantenimiento?",
    "¿Qué acciones tiene Juan Carlos?",
    "¿Qué compromisos siguen pendientes?",
    "Muéstrame las acciones activas.",
  ],
  [
    "¿Qué acciones hay?",
    "Dame las acciones",
    "¿Cuáles son las acciones abiertas?",
    "¿Qué acciones están abiertas?",
    "¿Qué acciones están cerradas?",
    "¿Qué acciones están vencidas?",
    "¿Cuántas acciones abiertas hay?",
    "¿Cuántas acciones cerradas hay?",
    "Lista de pendientes",
    "Action Register de la planta",
    "¿Qué puntos de acción tenemos?",
    "¿Qué compromisos tenemos?",
    "Dame los pendientes",
    "Muéstrame Action Register",
    "¿Qué hay pendiente en acciones?",
    "Acciones abiertas de Mantenimiento",
    "Pendientes de Mantenimiento",
    "¿Qué acciones activas hay?",
    "Estado de las acciones",
    "¿Qué acciones siguen abiertas?",
    "Dame el conteo de acciones",
    "¿Cuántos pendientes hay?",
    "¿Cuántos compromisos hay?",
    "Lista de acciones abiertas",
    "¿Qué acciones del Action Register hay?",
    "Puntos de acción abiertos",
    "¿Qué hay vencido en acciones?",
    "Acciones de la planta",
    "Dame acciones pendientes",
    "¿Qué acciones quedan abiertas?",
    "Compromisos abiertos",
    "¿Qué hay en el register?",
    "Muéstrame pendientes",
    "¿Qué acciones registradas hay?",
    "Conteo de Action Register",
    "¿Qué acciones tiene el tema Mantenimiento?",
    "Acciones abiertas y cerradas",
    "¿Hay acciones vencidas?",
    "Dame acciones de Juan Carlos",
    "¿Qué pendientes tiene Mantenimiento?",
    "Lista Action Register",
  ]
);

const ACTION_REGISTER_RECENT = padFamily(
  [
    "¿Cuáles son las últimas acciones?",
    "Dame las acciones más recientes.",
    "¿Qué se agregó recientemente?",
    "¿Qué hay nuevo en Action Register?",
    "¿Cuál fue la acción más reciente?",
    "Dame las últimas 10.",
    "¿Qué acciones entraron esta semana?",
    "¿Qué salió de la última revisión?",
    "Ordena las acciones de más nueva a más antigua.",
  ],
  [
    "¿Qué acciones del Action Register son las últimas?",
    "Últimas acciones del Action Register",
    "Dame las últimas acciones",
    "Acciones recién agregadas",
    "¿Qué acciones nuevas hay?",
    "Últimos registros de acciones",
    "¿Cuáles son las acciones más nuevas?",
    "Dame las últimas 5 acciones",
    "¿Qué se registró recientemente en Action Register?",
    "Acción más reciente",
    "¿Qué acciones nuevas entraron?",
    "Lista de acciones recientes",
    "¿Qué hay de nuevo en acciones?",
    "Recién agregadas al Action Register",
    "¿Cuáles acciones se agregaron último?",
    "Dame 10 acciones recientes",
    "Últimas 10 acciones",
    "¿Qué acciones se cargaron esta semana?",
    "Orden cronológico de acciones nuevas",
    "De la más nueva a la más antigua",
    "¿Cuál es el último registro de Action Register?",
    "Acciones de la última revisión",
    "¿Qué salió nuevo en la última revisión?",
    "Más recientes del Action Register",
    "¿Qué acciones se crearon último?",
    "Dame lo último de acciones",
    "Últimas acciones agregadas",
    "¿Qué hay recién en Action Register?",
    "Acciones nuevas esta semana",
    "¿Cuáles fueron las últimas acciones registradas?",
    "Dame las nuevas del register",
    "Último punto de acción",
    "¿Qué compromiso se agregó reciente?",
    "Acciones por fecha de registro",
    "No las vencidas, las últimas",
    "Las más nuevas, no las críticas",
    "¿Qué acciones son las más recientes?",
    "Recientes, no atrasadas",
    "Últimas acciones, no vencidas",
    "Dame recientes de Action Register",
    "¿Qué se agregó nuevo a las acciones?",
  ]
);

const BITACORA_TOPIC_LOOKUP = padFamily(
  [
    "¿Qué sabemos de Oaxaca?",
    "¿Alguna información de Oaxaca?",
    "¿Qué tenemos sobre Oaxaca?",
    "¿Qué se ha dicho de Oaxaca?",
    "¿Hay algo de Oaxaca?",
    "¿Tenemos antecedentes de Oaxaca?",
    "Busca información de Oaxaca.",
    "¿Qué aparece sobre Oaxaca en las bitácoras?",
    "¿Qué fue lo último que se dijo de Oaxaca?",
    "¿En Plaud tenemos algo de Oaxaca?",
  ],
  [
    "¿Qué sabemos de Gas de Oaxaca?",
    "¿Alguna información de Gas de Oaxaca?",
    "¿Qué tenemos de Oaxaca?",
    "¿Hay información de Oaxaca?",
    "¿Tenemos algo sobre Oaxaca?",
    "¿Qué se ha dicho sobre Oaxaca?",
    "Busca Oaxaca en bitácoras",
    "¿Qué aparece de Oaxaca?",
    "¿Qué sabemos sobre ese tema de Oaxaca?",
    "¿Hay antecedentes de Oaxaca?",
    "¿Qué tenemos en Plaud de Oaxaca?",
    "¿Alguna nota de Oaxaca?",
    "¿Qué se dijo de Oaxaca?",
    "Información de Oaxaca en bitácora",
    "¿Qué hay en bitácoras sobre Oaxaca?",
    "¿Tenemos algo de Gas de Oaxaca?",
    "¿Qué sabemos acerca de Oaxaca?",
    "¿Hay algo sobre Gas de Oaxaca?",
    "Busca información de Gas de Oaxaca",
    "¿Qué se ha mencionado de Oaxaca?",
    "¿Qué aparece en Plaud sobre Oaxaca?",
    "¿Qué sabemos hoy de Oaxaca?",
    "¿Alguna referencia de Oaxaca?",
    "¿Hay registro de Oaxaca?",
    "¿Qué tenemos registrado de Oaxaca?",
    "Bitácoras que hablen de Oaxaca",
    "¿Qué se ha documentado de Oaxaca?",
    "¿Hay contexto de Oaxaca?",
    "¿Qué sabemos del tema Oaxaca?",
    "¿Alguna información sobre Gas de Oaxaca?",
    "¿Qué hay de Oaxaca en Plaud?",
    "¿Se ha dicho algo de Oaxaca?",
    "¿Tenemos bitácora de Oaxaca como tema?",
    "¿Qué sabemos si hay Oaxaca en bitácoras?",
    "¿Hay menciones de Oaxaca?",
    "¿Qué aparece mencionado de Oaxaca?",
    "Busca menciones de Oaxaca",
    "¿Qué se ha dicho en bitácoras de Oaxaca?",
    "¿Algún antecedente de Gas de Oaxaca?",
    "¿Qué tenemos escrito de Oaxaca?",
  ]
);

function expandAnti() {
  const rows = [
    { q: "¿Cómo va la venta?", not_family: "CHANNEL_SALES_STATUS" },
    { q: "diagnóstico de la planta actual", not_family: "CHANNEL_SALES_STATUS" },
    { q: "Top 10 clientes por compra observada", not_family: "CLIENT_MOVEMENT_DEJARON" },
    { q: "¿Qué clientes disminuyeron?", not_family: "CLIENT_MOVEMENT_DEJARON" },
    { q: "¿Qué clientes no han comprado?", not_family: "CLIENT_MOVEMENT_DEJARON" },
    { q: "¿Qué comentarios de clientes tenemos en septiembre?", not_family: "CLIENT_MOVEMENT_DEJARON" },
    { q: "¿Cómo va septiembre contra octubre?", not_family: "CLIENT_COMMENTS_PERIOD" },
    { q: "¿Qué acciones tenemos?", not_family: "BITACORA_TOPIC_LOOKUP" },
    { q: "¿Cuáles son las últimas acciones?", not_family: "ACTION_REGISTER_DIRECT" },
    { q: "¿Qué acciones están vencidas y son críticas?", not_family: "ACTION_REGISTER_RECENT" },
    { q: "cambia a Oaxaca", not_family: "BITACORA_TOPIC_LOOKUP" },
    { q: "consulta la planta Oaxaca", not_family: "BITACORA_TOPIC_LOOKUP" },
    { q: "¿Cuándo fue la última vez que compró BAYAM RESIDENCES?", not_family: "BITACORA_TOPIC_LOOKUP" },
    { q: "abre su información", not_family: "CHANNEL_SALES_STATUS" },
    { q: "¿Cuánto gastamos en llantas de enero a septiembre?", not_family: "ACTION_REGISTER_DIRECT" },
    { q: "¿Cómo estamos en regulaciones?", not_family: "BITACORA_TOPIC_LOOKUP" },
    { q: "¿Qué comisión tenemos en Casa?", not_family: "CHANNEL_SALES_STATUS" },
    { q: "abre la venta diaria", not_family: "CHANNEL_SALES_STATUS" },
  ];
  const extras = [];
  for (const fam of FAMILY_IDS) {
    extras.push({ q: "¿Cómo va la venta?", not_family: fam === "CHANNEL_SALES_STATUS" ? "CLIENT_MOVEMENT_DEJARON" : fam });
    extras.push({ q: "¿Qué clientes disminuyeron?", not_family: fam });
    extras.push({ q: "¿Qué clientes no han comprado?", not_family: fam });
    extras.push({ q: "diagnóstico de la planta actual", not_family: fam });
    extras.push({ q: "¿Cuánto gastamos en taller de enero a septiembre?", not_family: fam });
    extras.push({ q: "¿Cómo estamos en regulaciones?", not_family: fam });
    extras.push({ q: "total de clientes nuevos", not_family: fam });
    extras.push({ q: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", not_family: fam });
    extras.push({ q: "abre el movimiento por categoría", not_family: fam });
    extras.push({ q: "abre la venta diaria", not_family: fam });
  }
  for (const q of CHANNEL_SALES_STATUS) extras.push({ q, not_family: "CLIENT_MOVEMENT_DEJARON" });
  for (const q of CHANNEL_SALES_STATUS.slice(0, 20)) extras.push({ q, not_family: "ACTION_REGISTER_DIRECT" });
  for (const q of CHANNEL_SALES_STATUS.slice(0, 15)) extras.push({ q, not_family: "CLIENT_COMMENTS_PERIOD" });
  for (const q of CLIENT_MOVEMENT_DEJARON) extras.push({ q, not_family: "CLIENT_COMMENTS_PERIOD" });
  for (const q of CLIENT_MOVEMENT_DEJARON.slice(0, 20)) extras.push({ q, not_family: "CHANNEL_SALES_STATUS" });
  for (const q of CLIENT_MOVEMENT_DEJARON.slice(0, 15)) extras.push({ q, not_family: "ACTION_REGISTER_DIRECT" });
  for (const q of CLIENT_COMMENTS_PERIOD) extras.push({ q, not_family: "CLIENT_MOVEMENT_DEJARON" });
  for (const q of CLIENT_COMMENTS_PERIOD.slice(0, 20)) extras.push({ q, not_family: "BITACORA_TOPIC_LOOKUP" });
  for (const q of ACTION_REGISTER_DIRECT) extras.push({ q, not_family: "ACTION_REGISTER_RECENT" });
  for (const q of ACTION_REGISTER_DIRECT.slice(0, 15)) extras.push({ q, not_family: "BITACORA_TOPIC_LOOKUP" });
  for (const q of ACTION_REGISTER_RECENT) extras.push({ q, not_family: "ACTION_REGISTER_DIRECT" });
  for (const q of ACTION_REGISTER_RECENT.slice(0, 15)) extras.push({ q, not_family: "CLIENT_COMMENTS_PERIOD" });
  for (const q of BITACORA_TOPIC_LOOKUP) extras.push({ q, not_family: "CLIENT_COMMENTS_PERIOD" });
  for (const q of BITACORA_TOPIC_LOOKUP.slice(0, 15)) extras.push({ q, not_family: "CHANNEL_SALES_STATUS" });
  extras.push({ q: "en la planta Oaxaca", not_family: "BITACORA_TOPIC_LOOKUP" });
  extras.push({ q: "¿Qué comentario tenemos de BAYAM?", not_family: "BITACORA_TOPIC_LOOKUP" });
  extras.push({ q: "las acciones más vencidas", not_family: "ACTION_REGISTER_RECENT" });
  extras.push({ q: "las acciones más críticas", not_family: "ACTION_REGISTER_RECENT" });
  extras.push({ q: "venta total de la planta", not_family: "CHANNEL_SALES_STATUS" });
  extras.push({ q: "Top 10 clientes por compra observada", not_family: "CLIENT_MOVEMENT_DEJARON" });
  extras.push({ q: "¿Qué clientes disminuyeron en septiembre?", not_family: "CLIENT_MOVEMENT_DEJARON" });
  extras.push({ q: "abre el proyecto de Oaxaca", not_family: "BITACORA_TOPIC_LOOKUP" });
  extras.push({ q: "¿Cómo va la venta?", not_family: "CHANNEL_SALES_STATUS" });
  extras.push({ q: "septiembre contra octubre", not_family: "CLIENT_COMMENTS_PERIOD" });
  extras.push({ q: "¿Qué clientes no han comprado?", not_family: "CLIENT_COMMENTS_PERIOD" });
  extras.push({ q: "acciones más atrasadas", not_family: "ACTION_REGISTER_RECENT" });
  extras.push({ q: "consulta Oaxaca como planta", not_family: "BITACORA_TOPIC_LOOKUP" });
  return Object.freeze(rows.concat(extras));
}

function expandMultiTurn() {
  const base = [
    { turns: ["¿Cómo va la venta Casa?", "¿Y Comisionista?"], families: ["CHANNEL_SALES_STATUS", "CHANNEL_SALES_STATUS"] },
    { turns: ["¿Cómo va Casa?", "¿Y Autotanque?"], families: ["CHANNEL_SALES_STATUS", "CHANNEL_SALES_STATUS"] },
    { turns: ["¿Cómo va Casa?", "¿Y en agosto?"], families: ["CHANNEL_SALES_STATUS", "CHANNEL_SALES_STATUS"] },
    { turns: ["Top 10 clientes que dejaron de comprar", "septiembre"], families: ["CLIENT_MOVEMENT_DEJARON", null] },
    { turns: ["¿Qué clientes dejaron de comprar?", "¿Qué comentarios tenemos de ellos?"], families: ["CLIENT_MOVEMENT_DEJARON", "CLIENT_COMMENTS_PERIOD"] },
    { turns: ["¿Qué comentarios tenemos en septiembre?", "¿y solo Casa?"], families: ["CLIENT_COMMENTS_PERIOD", "CLIENT_COMMENTS_PERIOD"] },
    { turns: ["¿Qué acciones tenemos?", "Dame las últimas 10."], families: ["ACTION_REGISTER_DIRECT", "ACTION_REGISTER_RECENT"] },
    { turns: ["Dame las últimas acciones.", "Solo Mantenimiento."], families: ["ACTION_REGISTER_RECENT", "ACTION_REGISTER_RECENT"] },
    { turns: ["¿Qué sabemos de Oaxaca?", "¿Qué fue lo último?"], families: ["BITACORA_TOPIC_LOOKUP", "BITACORA_TOPIC_LOOKUP"] },
    { turns: ["¿Alguna información de Oaxaca?", "resúmelo"], families: ["BITACORA_TOPIC_LOOKUP", "BITACORA_TOPIC_LOOKUP"] },
  ];
  const extra = [];
  for (const q of CHANNEL_SALES_STATUS.slice(0, 25)) extra.push({ turns: [q], families: ["CHANNEL_SALES_STATUS"] });
  for (const q of CLIENT_MOVEMENT_DEJARON.slice(0, 25)) extra.push({ turns: [q], families: ["CLIENT_MOVEMENT_DEJARON"] });
  for (const q of CLIENT_COMMENTS_PERIOD.slice(0, 25)) extra.push({ turns: [q], families: ["CLIENT_COMMENTS_PERIOD"] });
  for (const q of ACTION_REGISTER_DIRECT.slice(0, 25)) extra.push({ turns: [q], families: ["ACTION_REGISTER_DIRECT"] });
  for (const q of ACTION_REGISTER_RECENT.slice(0, 25)) extra.push({ turns: [q], families: ["ACTION_REGISTER_RECENT"] });
  for (const q of BITACORA_TOPIC_LOOKUP.slice(0, 25)) extra.push({ turns: [q], families: ["BITACORA_TOPIC_LOOKUP"] });
  extra.push({ turns: ["¿Cómo va la venta Casa?", "¿Y Comisionista?", "¿Y Autotanque?"], families: ["CHANNEL_SALES_STATUS", "CHANNEL_SALES_STATUS", "CHANNEL_SALES_STATUS"] });
  extra.push({ turns: ["¿Qué clientes dejaron de comprar?", "¿Qué comentarios tenemos en septiembre?"], families: ["CLIENT_MOVEMENT_DEJARON", "CLIENT_COMMENTS_PERIOD"] });
  extra.push({ turns: ["¿Qué acciones tenemos?"], families: ["ACTION_REGISTER_DIRECT"] });
  extra.push({ turns: ["¿Qué sabemos de Oaxaca?", "resúmelo"], families: ["BITACORA_TOPIC_LOOKUP", "BITACORA_TOPIC_LOOKUP"] });
  extra.push({ turns: ["¿Cómo va la venta?"], not_families: ["CHANNEL_SALES_STATUS"] });
  return Object.freeze([...base, ...extra]);
}

module.exports = {
  FAMILY_IDS,
  CHANNEL_SALES_STATUS,
  CLIENT_MOVEMENT_DEJARON,
  CLIENT_COMMENTS_PERIOD,
  ACTION_REGISTER_DIRECT,
  ACTION_REGISTER_RECENT,
  BITACORA_TOPIC_LOOKUP,
  ANTI_COLLISIONS: expandAnti(),
  MULTI_TURN: expandMultiTurn(),
};
