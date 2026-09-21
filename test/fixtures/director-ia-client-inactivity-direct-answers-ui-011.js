"use strict";

const FAMILY_IDS = Object.freeze([
  "INACTIVE_CLIENTS",
  "LAST_PURCHASE_DIRECT",
  "DIRECT_ANSWER_COMPRESSION",
  "OPEN_CLIENT_DELTA_FORECAST",
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

const INACTIVE_CLIENTS = padFamily(
  [
    "¿Qué clientes no han comprado?",
    "¿Quiénes no han comprado?",
    "¿Qué clientes dejaron de comprar?",
    "¿Quién dejó de comprarnos?",
    "¿Qué clientes están inactivos?",
    "¿Qué clientes llevan tiempo sin comprar?",
    "¿Quiénes no han comprado recientemente?",
    "¿Qué clientes no tienen compras recientes?",
    "¿Quiénes dejaron de consumir?",
    "¿Qué clientes están sin movimiento?",
    "¿Quiénes llevan más tiempo sin comprar?",
    "¿Qué clientes están atrasados en compra?",
    "¿Quiénes están inactivos comercialmente?",
    "¿Quién ya no está comprando?",
    "¿Qué clientes no han vuelto a comprar?",
  ],
  [
    "Lista de clientes inactivos.",
    "Dame los que no han comprado.",
    "¿Quiénes están sin compra?",
    "Clientes sin movimiento comercial.",
    "¿Qué cuentas no han comprado?",
    "¿Quiénes están inactivos?",
    "Clientes que dejaron de comprar.",
    "¿Quién no ha comprado?",
    "Dame inactivos de la planta.",
    "¿Qué clientes están sin compras?",
    "¿Quiénes no tienen compra reciente?",
    "Clientes atrasados en compra.",
    "¿Quiénes no han consumido?",
    "Lista de no compraron.",
    "¿Qué clientes siguen sin comprar?",
    "¿Quiénes están quietos comercialmente?",
    "Clientes inactivos, por favor.",
    "¿Quiénes no han pedido?",
    "Dame los inactivos.",
    "¿Qué clientes no compran desde hace tiempo?",
    "¿Quiénes no han regresado a comprar?",
    "Clientes sin compra reciente.",
    "¿Quiénes dejaron de pedirnos?",
    "¿Qué clientes están parados?",
    "Lista de clientes sin movimiento.",
    "¿Quiénes no han comprado en la planta?",
    "¿Qué clientes están en inactividad?",
    "Dame quiénes no han comprado.",
    "¿Quiénes no tienen movimiento?",
    "Clientes que no han vuelto.",
    "¿Qué clientes están dormidos comercialmente?",
    "¿Quiénes no han hecho compra?",
    "Inactivos de esta planta.",
    "¿Qué clientes no han comprado nada?",
    "¿Quiénes están sin actividad de compra?",
  ]
);

const LAST_PURCHASE_DIRECT = padFamily(
  [
    "¿Cuándo compró por última vez BAYAM RESIDENCES?",
    "¿Cuál fue la última compra de BAYAM RESIDENCES?",
    "¿Cuándo fue su última compra?",
    "¿Qué día compró por última vez?",
    "¿Hace cuánto no compra BAYAM RESIDENCES?",
    "¿Cuándo nos compró por última vez?",
    "¿Cuál es su fecha de última compra?",
    "¿Desde cuándo no compra?",
    "¿Cuándo hizo su compra más reciente?",
    "¿Cuál fue su compra más reciente?",
  ],
  [
    "¿Cuándo fue la última vez que compró BAYAM RESIDENCES?",
    "Última compra de ese cliente.",
    "¿Cuándo compró por última vez?",
    "Fecha de última compra.",
    "¿Cuál fue la última vez que nos compró?",
    "¿Qué día fue su última compra?",
    "¿Cuándo fue la compra más reciente?",
    "¿Hace cuánto fue su última compra?",
    "Dime la última compra.",
    "¿Cuándo compró más recientemente?",
    "Última fecha de compra.",
    "¿Cuál es la última compra?",
    "¿Desde qué día no compra?",
    "¿Cuándo fue su compra última?",
    "Dame su última compra.",
    "¿Qué fecha tiene de última compra?",
    "¿Cuándo nos compró más reciente?",
    "Última vez que compró.",
    "¿Cuál fue el día de su última compra?",
    "¿Cuándo compró la última vez?",
    "¿Hace cuánto no nos compra?",
    "¿Cuál es la compra más reciente?",
    "¿Cuándo fue la última compra?",
    "Dime cuándo compró por última vez.",
    "¿Qué día nos compró por última vez?",
    "¿Cuándo hizo la última compra?",
    "Su última compra, ¿cuándo fue?",
    "¿Desde cuándo no nos compra?",
    "Fecha de su compra más reciente.",
    "¿Cuándo fue la última vez que nos compró?",
    "¿Cuál fue su última fecha de compra?",
    "¿Hace cuánto compró por última vez?",
    "¿Cuándo compró reciente?",
    "Última compra: ¿qué día?",
    "¿Qué día compró más reciente?",
    "¿Cuándo fue su compra más nueva?",
    "Dame la fecha de última compra.",
    "¿Cuál es el día de la última compra?",
    "¿Cuándo compró ese cliente por última vez?",
    "¿Hace cuánto no hay compra?",
  ]
);

const DIRECT_ANSWER_COMPRESSION = padFamily(
  [
    "¿Cuándo debería volver a comprar?",
    "¿Cada cuánto compra?",
    "¿Está atrasado?",
    "¿Cuántos días lleva?",
    "¿Cuándo debería volver?",
    "¿Cuántos están inactivos?",
    "¿Cada cuántos días compra?",
    "¿Está atrasada?",
    "¿Cuántos días lleva sin comprar?",
    "¿Cuándo esperamos que vuelva?",
  ],
  [
    "¿Cuál es su frecuencia?",
    "¿Cada cuánto nos compra?",
    "¿Ya se atrasó?",
    "¿Cuántos días sin comprar lleva?",
    "¿Cuándo vuelve?",
    "¿Cuántos no han comprado?",
    "Dime si está atrasado.",
    "¿Cada cuánto es su ciclo?",
    "¿Cuántos días lleva de atraso?",
    "¿Cuándo le toca volver?",
    "Frecuencia de compra.",
    "¿Está fuera de frecuencia?",
    "¿Cuántos clientes están inactivos?",
    "¿Cuándo debería haber vuelto?",
    "¿Cada cuánto suele comprar?",
    "¿Lleva muchos días sin comprar?",
    "¿Está al día o atrasado?",
    "¿Cuántos inactivos hay?",
    "¿Cuándo esperamos la siguiente?",
    "¿Cuál es el ciclo de compra?",
    "¿Cuántos días van sin compra?",
    "¿Ya debería haber comprado?",
    "¿Cuándo le toca comprar?",
    "¿Sigue dentro de frecuencia?",
    "¿Cuántos están sin compra?",
    "Dime la frecuencia.",
    "¿Está atrasado en su ciclo?",
    "¿Cuántos días cumple sin comprar?",
    "¿Cuándo se espera que compre?",
    "¿Cuántos inactivos tenemos?",
    "¿Cada cuánto vuelve a comprar?",
    "¿Lleva atraso?",
    "¿Cuántos días tiene sin movimiento?",
    "¿Cuándo toca la siguiente compra?",
    "¿Cuántos no han comprado aún?",
    "¿Su frecuencia es de cuántos días?",
    "¿Está vencido el ciclo?",
    "¿Cuántos días tiene de inactividad?",
    "¿Cuándo cae la siguiente compra?",
    "¿Cuántos clientes no han comprado?",
  ]
);

const OPEN_CLIENT_DELTA_FORECAST = padFamily(
  [
    "abre la información de BAYAM RESIDENCES",
    "abre BAYAM RESIDENCES",
    "muéstrame BAYAM RESIDENCES",
    "abre el detalle de BAYAM RESIDENCES",
    "quiero ver la información de BAYAM RESIDENCES",
    "enséñame el detalle del cliente",
    "abre la ficha de BAYAM RESIDENCES",
    "muéstrame la ficha",
    "abre el forecast de BAYAM RESIDENCES",
    "abre el delta de ingreso",
    "quiero ver su forecast",
    "abre su información",
    "muéstrame el detalle de ese cliente",
    "abre ese cliente",
    "quiero ver sus datos",
  ],
  [
    "abre la información del cliente BAYAM RESIDENCES",
    "abre el detalle",
    "muéstrame su información",
    "abre la ficha",
    "quiero ver el detalle",
    "enséñame BAYAM RESIDENCES",
    "abre su ficha",
    "muéstrame el forecast",
    "abre su delta de ingreso",
    "quiero ver la ficha",
    "abre el cliente",
    "enséñame su detalle",
    "abre su forecast",
    "muéstrame ese cliente",
    "quiero ver BAYAM RESIDENCES",
    "abre el detalle de ese cliente",
    "muéstrame la información",
    "abre datos de BAYAM RESIDENCES",
    "quiero ver el delta de ingreso",
    "abre la información",
    "enséñame la ficha",
    "abre detalle de BAYAM RESIDENCES",
    "muéstrame sus datos",
    "abre ficha del cliente",
    "quiero ver ese cliente",
    "abre su detalle",
    "enséñame el forecast del cliente",
    "abre información del cliente",
    "muéstrame el delta de ingreso",
    "abre este cliente",
    "quiero ver su detalle",
    "abre la ficha de ese cliente",
    "enséñame su información",
    "abre el forecast de ese cliente",
    "muéstrame la ficha del cliente",
  ]
);

function expandAnti() {
  const rows = [
    { q: "¿Qué clientes compraron poco?", not_family: "INACTIVE_CLIENTS" },
    { q: "¿Quiénes disminuyeron?", not_family: "INACTIVE_CLIENTS" },
    { q: "clientes de menor volumen", not_family: "INACTIVE_CLIENTS" },
    { q: "clientes con baja participación", not_family: "INACTIVE_CLIENTS" },
    { q: "¿Cuántas toneladas perdimos por los que bajaron?", not_family: "INACTIVE_CLIENTS" },
    { q: "MATERIALIDAD COMERCIAL de la planta", not_family: "LAST_PURCHASE_DIRECT" },
    { q: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", not_family: "LAST_PURCHASE_DIRECT" },
    { q: "abre la venta diaria", not_family: "OPEN_CLIENT_DELTA_FORECAST" },
    { q: "abre el movimiento por categoría", not_family: "OPEN_CLIENT_DELTA_FORECAST" },
    { q: "abre el pronóstico", not_family: "OPEN_CLIENT_DELTA_FORECAST" },
    { q: "Dame un diagnóstico de BAYAM RESIDENCES", not_family: "OPEN_CLIENT_DELTA_FORECAST" },
    { q: "abre su información", not_family: "INACTIVE_CLIENTS" },
    { q: "¿Cómo va la venta?", not_family: "INACTIVE_CLIENTS" },
    { q: "diagnóstico de la planta actual", not_family: "LAST_PURCHASE_DIRECT" },
    { q: "¿Cómo va septiembre contra octubre?", not_family: "OPEN_CLIENT_DELTA_FORECAST" },
    { q: "¿Cuánto gastamos en llantas de enero a septiembre?", not_family: "INACTIVE_CLIENTS" },
    { q: "¿Qué comisión tenemos en Casa?", not_family: "OPEN_CLIENT_DELTA_FORECAST" },
    { q: "¿Cómo estamos en regulaciones?", not_family: "INACTIVE_CLIENTS" },
    { q: "total de clientes nuevos", not_family: "INACTIVE_CLIENTS" },
    { q: "¿Qué clientes están en riesgo de dejar de comprar?", not_family: "INACTIVE_CLIENTS" },
  ];
  const extras = [];
  const blockers = [
    "¿Qué clientes compraron poco?",
    "¿Quiénes disminuyeron?",
    "abre la venta diaria",
    "abre el movimiento por categoría",
    "¿Cómo va la venta?",
    "¿Cuánto gastamos en taller?",
    "¿Qué permisos están vencidos?",
    "Dame los documentos pendientes de regulación.",
    "¿Qué comisión tenemos en Comisionista?",
    "abre la venta diaria de Acapulco",
    "clientes nuevos de agosto",
    "¿Cómo vamos de IGF?",
    "¿Cómo vamos de ARR?",
    "Brief ejecutivo diario",
    "¿Cuál es el margen de enero?",
    "top clientes de enero",
    "¿Cuánto vendimos de Casa en enero?",
    "Lista folios de enero",
    "Diagnóstico financiero",
    "¿Cuánto invertimos de enero a septiembre?",
    "forecast por cliente",
    "¿Qué folio de taller mayor hay?",
    "Action Register atrasado",
    "¿Cómo está la rentabilidad?",
    "extintor vencido de estación",
    "¿Cuántas estaciones de carburación hay?",
    "Pronóstico contractual de la planta",
    "Cierre proyectado de planta",
    "¿Qué cumplimiento de venta tenemos?",
    "Abre el folio F-260101-1",
    "¿Cuánto suman los folios de gastos?",
    "¿Cuál es el descuento de septiembre?",
    "¿Cómo vamos contra el mismo periodo del mes anterior?",
    "¿Cuánto vendió la planta hoy, esta semana y este mes?",
    "¿Qué estación de carburación tiene baja venta?",
  ];
  for (const fam of FAMILY_IDS) {
    for (const q of blockers) extras.push({ q, not_family: fam });
  }
  return Object.freeze(rows.concat(extras));
}

function expandMultiTurn() {
  const base = [
    {
      turns: ["¿Qué clientes no han comprado?", "BAYAM RESIDENCES", "¿Cuándo fue su última compra?"],
      families: ["INACTIVE_CLIENTS", null, "LAST_PURCHASE_DIRECT"],
    },
    {
      turns: ["¿Cuándo fue la última compra de BAYAM RESIDENCES?", "¿Cada cuánto compra?", "¿Está atrasado?"],
      families: ["LAST_PURCHASE_DIRECT", "DIRECT_ANSWER_COMPRESSION", "DIRECT_ANSWER_COMPRESSION"],
    },
    {
      turns: ["¿Cuándo esperamos que vuelva a comprar BAYAM RESIDENCES?", "abre su información"],
      families: ["DIRECT_ANSWER_COMPRESSION", "OPEN_CLIENT_DELTA_FORECAST"],
    },
    {
      turns: ["Háblame de BAYAM RESIDENCES", "abre el detalle"],
      families: [null, "OPEN_CLIENT_DELTA_FORECAST"],
    },
    {
      turns: ["abre la información de BAYAM RESIDENCES"],
      families: ["OPEN_CLIENT_DELTA_FORECAST"],
    },
    {
      turns: ["¿y TORTILLERIA ERICK?", "abre su información"],
      families: [null, "OPEN_CLIENT_DELTA_FORECAST"],
      opens_client: "TORTILLERIA ERICK",
    },
  ];
  const extra = [];
  for (const q of INACTIVE_CLIENTS.slice(0, 20)) extra.push({ turns: [q], families: ["INACTIVE_CLIENTS"] });
  for (const q of LAST_PURCHASE_DIRECT.slice(0, 20)) extra.push({ turns: [q], families: ["LAST_PURCHASE_DIRECT"] });
  for (const q of DIRECT_ANSWER_COMPRESSION.slice(0, 20)) extra.push({ turns: [q], families: ["DIRECT_ANSWER_COMPRESSION"] });
  for (const q of OPEN_CLIENT_DELTA_FORECAST.slice(0, 20)) extra.push({ turns: [q], families: ["OPEN_CLIENT_DELTA_FORECAST"] });
  extra.push({ turns: ["¿Qué clientes no han comprado?"], families: ["INACTIVE_CLIENTS"] });
  extra.push({ turns: ["¿Cuándo fue la última vez que compró BAYAM RESIDENCES?"], families: ["LAST_PURCHASE_DIRECT"] });
  extra.push({ turns: ["abre su información"], families: ["OPEN_CLIENT_DELTA_FORECAST"] });
  extra.push({
    turns: ["¿Qué clientes no han comprado?", "abre su información"],
    families: ["INACTIVE_CLIENTS", "OPEN_CLIENT_DELTA_FORECAST"],
  });
  extra.push({
    turns: ["¿Cuándo fue su última compra?", "¿Cada cuánto compra?"],
    families: ["LAST_PURCHASE_DIRECT", "DIRECT_ANSWER_COMPRESSION"],
  });
  extra.push({
    turns: ["¿Cómo va la venta?"],
    not_families: ["INACTIVE_CLIENTS"],
  });
  extra.push({
    turns: ["¿Cuánto gastamos en llantas de enero a septiembre?"],
    not_families: ["OPEN_CLIENT_DELTA_FORECAST"],
  });
  extra.push({
    turns: ["¿Cuál fue su última compra?"],
    families: ["LAST_PURCHASE_DIRECT"],
  });
  extra.push({
    turns: ["¿Qué folios contienen la palabra llanta?"],
    not_families: ["INACTIVE_CLIENTS"],
  });
  extra.push({ turns: ["¿Qué clientes están inactivos?", "¿Cuántos están inactivos?"], families: ["INACTIVE_CLIENTS", "DIRECT_ANSWER_COMPRESSION"] });
  extra.push({ turns: ["abre la ficha de BAYAM RESIDENCES", "¿Cuál fue su última compra?"], families: ["OPEN_CLIENT_DELTA_FORECAST", "LAST_PURCHASE_DIRECT"] });
  extra.push({ turns: ["¿Hace cuánto no compra BAYAM RESIDENCES?"], families: ["LAST_PURCHASE_DIRECT"] });
  extra.push({ turns: ["Dame los que no han comprado."], families: ["INACTIVE_CLIENTS"] });
  extra.push({ turns: ["quiero ver su forecast"], families: ["OPEN_CLIENT_DELTA_FORECAST"] });
  extra.push({ turns: ["¿Está atrasado?", "¿Cuántos días lleva sin comprar?"], families: ["DIRECT_ANSWER_COMPRESSION", "DIRECT_ANSWER_COMPRESSION"] });
  extra.push({ turns: ["¿Quiénes no han comprado recientemente?"], families: ["INACTIVE_CLIENTS"] });
  extra.push({ turns: ["muéstrame el detalle de ese cliente"], families: ["OPEN_CLIENT_DELTA_FORECAST"] });
  extra.push({ turns: ["¿Desde cuándo no compra?"], families: ["LAST_PURCHASE_DIRECT"] });
  extra.push({ turns: ["¿Cuántos clientes están inactivos?"], families: ["DIRECT_ANSWER_COMPRESSION"] });
  return Object.freeze([...base, ...extra]);
}

const FORBIDDEN_BLOCKS = Object.freeze([
  "MATERIALIDAD COMERCIAL",
  "Action Register",
  "kg_mes_real",
  "164 ZAPATA",
  "171 COSTA AZUL",
]);

module.exports = {
  FAMILY_IDS,
  INACTIVE_CLIENTS,
  LAST_PURCHASE_DIRECT,
  DIRECT_ANSWER_COMPRESSION,
  OPEN_CLIENT_DELTA_FORECAST,
  ANTI_COLLISIONS: expandAnti(),
  MULTI_TURN: expandMultiTurn(),
  FORBIDDEN_BLOCKS,
};
