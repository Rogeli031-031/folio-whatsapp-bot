"use strict";

const CATEGORY_COMMISSION_FAMILY_IDS = Object.freeze([
  "CASA_CATEGORY_COMMISSION",
  "CASA_SUBCATEGORY_COMMISSION",
  "COMISIONISTA_CATEGORY_COMMISSION",
  "COMISIONISTA_SUBCATEGORY_COMMISSION",
]);

const CASA_PHYSICAL_SUBS = Object.freeze(["Autotanque", "Carburación", "Portátil", "Sin subcategoría"]);

const CASA_CATEGORY_UTTERANCES = Object.freeze([
  "¿Qué comisión tenemos en Casa?",
  "¿Cuál es la comisión de Casa?",
  "¿Cuánto tenemos de comisión en Casa?",
  "¿Cuánto trae Casa de comisión?",
  "¿En cuánto está la comisión de Casa?",
  "¿Cómo vamos de comisión en Casa?",
  "¿Qué comisión lleva Casa?",
  "¿Cuánto llevamos de comisión en Casa?",
  "Dame la comisión de Casa.",
  "Comisión de Casa.",
  "¿Qué comisión tenemos para Casa?",
  "¿Cuál es el descuento de Casa?",
  "¿Cuánto descuento trae Casa?",
  "¿Cuál es la comisión proyectada de Casa?",
  "¿Cuánto proyectamos de comisión en Casa?",
  "¿Cuánto cerrará Casa de comisión?",
  "¿Qué comisión se proyecta para Casa?",
  "¿Cuál es el total de comisión de Casa?",
  "¿Cuánto suma la comisión de Casa?",
  "¿Qué comisión total tiene Casa?",
  "Dame las comisiones de Casa.",
  "¿Cómo están las comisiones de Casa?",
  "¿Cuánto tenemos en comisiones de Casa?",
  "Desglósame la comisión de Casa.",
  "Dame el detalle de comisión de Casa.",
  "¿Cómo se compone la comisión de Casa?",
  "¿Cuál es la comisión por subcategoría de Casa?",
  "Comisión Casa por subcategoría.",
  "¿Cuánto paga Casa de comisión?",
  "¿Qué valor de comisión tiene Casa?",
  "¿Cuánto tenemos de descuento en la categoría Casa?",
  "¿Cómo viene la comisión de Casa?",
  "¿Cuál es la comisión mensual de Casa?",
  "¿Qué comisión marca Casa?",
  "¿Qué tenemos de comisión en la categoría Casa?",
  "¿Cuánto representa la comisión de Casa?",
  "Dame comisión total y detalle de Casa.",
  "Dame comisión y subcategorías de Casa.",
  "¿Cuál es la comisión completa de Casa?",
  "¿Cuál es el resumen de comisión de Casa?",
  "¿Qué comisión proyectada tenemos en Casa?",
  "¿Cuánto cerramos de comisión Casa?",
  "¿En cuánto está Casa de comisión por kilo?",
  "¿Cuál es la comisión por kilo de Casa?",
  "¿Cuánto suma Casa en comisión?",
  "¿Qué comisión genera Casa?",
  "Dame el cuadro de comisión de Casa.",
  "Dame el resumen de Casa y sus comisiones.",
  "¿Cómo están las comisiones dentro de Casa?",
  "Casa: comisión total y por subcategoría.",
]);

const CASA_SUBCATEGORY_TEMPLATES = Object.freeze([
  "¿Cuál es la comisión de Casa {sub}?",
  "¿Qué comisión tenemos en Casa {sub}?",
  "¿Cuánto trae {sub} dentro de Casa?",
  "¿En cuánto está la comisión de {sub} Casa?",
  "¿Cuál es el descuento de Casa {sub}?",
  "Comisión Casa {sub}.",
  "Dame comisión de {sub} en Casa.",
  "¿Cuánto proyectamos de comisión en Casa {sub}?",
  "¿Cuál es la comisión por kilo de Casa {sub}?",
  "¿Cuánto suma la comisión de Casa {sub}?",
  "¿Qué comisión lleva Casa {sub}?",
  "¿Cuánto tenemos de comisión en {sub} de Casa?",
  "Dame el detalle de comisión de Casa {sub}.",
  "¿Cuál es la comisión proyectada de Casa {sub}?",
  "¿Cuánto cierra Casa {sub} de comisión?",
  "¿Qué descuento tiene Casa {sub}?",
  "¿En cuánto está Casa {sub} de comisión?",
  "¿Cómo va la comisión de {sub} en Casa?",
  "¿Cuál es el valor de comisión de Casa {sub}?",
  "¿Cuánto paga Casa {sub} de comisión?",
  "Resumen de comisión Casa {sub}.",
  "Dame comisión y kilo de Casa {sub}.",
  "¿Qué comisión genera Casa {sub}?",
  "¿Cuánto representa la comisión de Casa {sub}?",
  "¿Cuál es la comisión mensual de Casa {sub}?",
  "¿Cómo viene {sub} de comisión en Casa?",
  "¿Qué comisión marca Casa {sub}?",
  "Comisión proyectada Casa {sub}.",
  "¿Cuánto tenemos de descuento en Casa {sub}?",
  "¿Cuál es la comisión completa de Casa {sub}?",
  "Dame el cuadro de Casa {sub}.",
  "¿Cuánto suma Casa {sub} en comisión?",
  "¿Qué comisión total tiene Casa {sub}?",
  "¿Cuál es el resumen de comisión de {sub} Casa?",
  "¿Cuánto llevamos de comisión en Casa {sub}?",
  "¿Qué comisión se proyecta para Casa {sub}?",
  "¿En cuánto está el descuento de {sub} Casa?",
  "Dame las comisiones de Casa {sub}.",
  "¿Cómo está la comisión de {sub} dentro de Casa?",
  "Casa {sub}: comisión y kilo.",
  "¿Cuánto proyectamos en {sub} de Casa?",
  "¿Cuál es el descuento proyectado de Casa {sub}?",
  "¿Qué comisión tenemos para {sub} Casa?",
  "¿Cuánto trae Casa {sub} de comisión?",
  "Detalle de comisión {sub} Casa.",
  "¿Cuál es la comisión $/kg de Casa {sub}?",
  "¿Cuánto cierra de comisión {sub} en Casa?",
  "¿Qué comisión proyectada tiene Casa {sub}?",
  "Dame comisión de la subcategoría {sub} de Casa.",
  "Casa {sub} comisión total.",
]);

const COMISIONISTA_CATEGORY_UTTERANCES = Object.freeze([
  "¿Qué comisión tenemos en Comisionista?",
  "¿Cuál es la comisión de Comisionista?",
  "¿Cuánto tenemos de comisión en Comisionista?",
  "Dame las comisiones de Comisionista.",
  "¿Cuánto suma la comisión de Comisionista?",
  "Desglósame la comisión de Comisionista.",
  "¿Cuál es la comisión por subcategoría de Comisionista?",
  "¿Qué comisión proyectamos para Comisionista?",
  "¿Cuál es la comisión total de Comisionista?",
  "Comisionista: comisión total y detalle.",
  "¿Cuánto trae Comisionista de comisión?",
  "¿En cuánto está la comisión de Comisionista?",
  "¿Cómo vamos de comisión en Comisionista?",
  "¿Qué comisión lleva Comisionista?",
  "¿Cuánto llevamos de comisión en Comisionista?",
  "Dame la comisión de Comisionista.",
  "Comisión de Comisionista.",
  "¿Qué comisión tenemos para Comisionista?",
  "¿Cuál es el descuento de Comisionista?",
  "¿Cuánto descuento trae Comisionista?",
  "¿Cuál es la comisión proyectada de Comisionista?",
  "¿Cuánto proyectamos de comisión en Comisionista?",
  "¿Cuánto cerrará Comisionista de comisión?",
  "¿Qué comisión se proyecta para Comisionista?",
  "¿Qué comisión total tiene Comisionista?",
  "¿Cómo están las comisiones de Comisionista?",
  "¿Cuánto tenemos en comisiones de Comisionista?",
  "Dame el detalle de comisión de Comisionista.",
  "¿Cómo se compone la comisión de Comisionista?",
  "Comisión Comisionista por subcategoría.",
  "¿Cuánto paga Comisionista de comisión?",
  "¿Qué valor de comisión tiene Comisionista?",
  "¿Cuánto tenemos de descuento en la categoría Comisionista?",
  "¿Cómo viene la comisión de Comisionista?",
  "¿Cuál es la comisión mensual de Comisionista?",
  "¿Qué comisión marca Comisionista?",
  "¿Qué tenemos de comisión en la categoría Comisionista?",
  "¿Cuánto representa la comisión de Comisionista?",
  "Dame comisión total y detalle de Comisionista.",
  "Dame comisión y subcategorías de Comisionista.",
  "¿Cuál es la comisión completa de Comisionista?",
  "¿Cuál es el resumen de comisión de Comisionista?",
  "¿Qué comisión proyectada tenemos en Comisionista?",
  "¿Cuánto cerramos de comisión Comisionista?",
  "¿En cuánto está Comisionista de comisión por kilo?",
  "¿Cuál es la comisión por kilo de Comisionista?",
  "¿Cuánto suma Comisionista en comisión?",
  "¿Qué comisión genera Comisionista?",
  "Dame el cuadro de comisión de Comisionista.",
  "Dame el resumen de Comisionista y sus comisiones.",
]);

const COMISIONISTA_SUBCATEGORY_TEMPLATES = Object.freeze([
  "¿Cuál es la comisión de Comisionista {sub}?",
  "¿Qué comisión tenemos en {sub} de Comisionista?",
  "¿Cuánto trae {sub} dentro de Comisionista?",
  "¿Cuánto proyectamos de comisión en Comisionista {sub}?",
  "¿Cuál es la comisión por kilo de Comisionista {sub}?",
  "Comisión Comisionista {sub}.",
  "Dame comisión de {sub} en Comisionista.",
  "¿En cuánto está la comisión de {sub} Comisionista?",
  "¿Cuál es el descuento de Comisionista {sub}?",
  "¿Cuánto suma la comisión de Comisionista {sub}?",
  "¿Qué comisión lleva Comisionista {sub}?",
  "¿Cuánto tenemos de comisión en Comisionista {sub}?",
  "Dame el detalle de comisión de Comisionista {sub}.",
  "¿Cuál es la comisión proyectada de Comisionista {sub}?",
  "¿Cuánto cierra Comisionista {sub} de comisión?",
  "¿Qué descuento tiene Comisionista {sub}?",
  "¿En cuánto está Comisionista {sub} de comisión?",
  "¿Cómo va la comisión de {sub} en Comisionista?",
  "¿Cuál es el valor de comisión de Comisionista {sub}?",
  "¿Cuánto paga Comisionista {sub} de comisión?",
  "Resumen de comisión Comisionista {sub}.",
  "Dame comisión y kilo de Comisionista {sub}.",
  "¿Qué comisión genera Comisionista {sub}?",
  "¿Cuánto representa la comisión de Comisionista {sub}?",
  "¿Cuál es la comisión mensual de Comisionista {sub}?",
  "¿Cómo viene {sub} de comisión en Comisionista?",
  "¿Qué comisión marca Comisionista {sub}?",
  "Comisión proyectada Comisionista {sub}.",
  "¿Cuánto tenemos de descuento en Comisionista {sub}?",
  "¿Cuál es la comisión completa de Comisionista {sub}?",
  "Dame el cuadro de Comisionista {sub}.",
  "¿Cuánto suma Comisionista {sub} en comisión?",
  "¿Qué comisión total tiene Comisionista {sub}?",
  "¿Cuál es el resumen de comisión de {sub} Comisionista?",
  "¿Cuánto llevamos de comisión en Comisionista {sub}?",
  "¿Qué comisión se proyecta para Comisionista {sub}?",
  "¿En cuánto está el descuento de {sub} Comisionista?",
  "Dame las comisiones de Comisionista {sub}.",
  "¿Cómo está la comisión de {sub} dentro de Comisionista?",
  "Comisionista {sub}: comisión y kilo.",
  "¿Cuánto proyectamos en {sub} de Comisionista?",
  "¿Cuál es el descuento proyectado de Comisionista {sub}?",
  "¿Qué comisión tenemos para {sub} Comisionista?",
  "¿Cuánto trae Comisionista {sub} de comisión?",
  "Detalle de comisión {sub} Comisionista.",
  "¿Cuál es la comisión $/kg de Comisionista {sub}?",
  "¿Cuánto cierra de comisión {sub} en Comisionista?",
  "¿Qué comisión proyectada tiene Comisionista {sub}?",
  "Dame comisión de la subcategoría {sub} de Comisionista.",
  "Comisionista {sub} comisión total.",
]);

function expandTemplates(templates, subs) {
  const out = [];
  for (const sub of subs) {
    for (const t of templates) {
      out.push(t.replace(/\{sub\}/g, sub));
    }
  }
  return out;
}

const CATEGORY_COMMISSION_UTTERANCES = Object.freeze({
  CASA_CATEGORY_COMMISSION: CASA_CATEGORY_UTTERANCES,
  CASA_SUBCATEGORY_COMMISSION: CASA_SUBCATEGORY_TEMPLATES,
  COMISIONISTA_CATEGORY_COMMISSION: COMISIONISTA_CATEGORY_UTTERANCES,
  COMISIONISTA_SUBCATEGORY_COMMISSION: COMISIONISTA_SUBCATEGORY_TEMPLATES,
});

const OPEN_CATEGORY_COMMANDS = Object.freeze([
  "abre movimiento por categoría",
  "abre la tabla de Casa",
  "abre comisiones de Casa",
  "abre la comisión de Comisionista",
  "muéstrame la tabla de comisiones",
  "abre movimiento de Comisionista",
  "abre la tabla de Comisionista",
  "abrir movimiento por categoría",
  "abre comisiones de Comisionista",
  "muestra la tabla de Casa",
]);

const DIRECT_PRONOSTICO_COMMANDS = Object.freeze([
  "abre la venta diaria",
  "abrir la venta diaria",
  "muéstrame la venta diaria",
  "abre ventas diarias",
]);

const SOFT_PRONOSTICO_ASKS = Object.freeze(["Quiero ver la venta diaria.", "Quiero ver el pronóstico."]);

const UI_CONFIRMS = Object.freeze(["sí", "si", "sí ábrela", "adelante", "ábrela", "ok", "va"]);

const ANTI_COLLISIONS = [];

function addAnti(q, want, not) {
  ANTI_COLLISIONS.push([q, want, not]);
}

for (const q of CASA_CATEGORY_UTTERANCES) {
  addAnti(q, "CASA_CATEGORY_COMMISSION", "IGF_COMMISSION_CURRENT");
  addAnti(q, "CASA_CATEGORY_COMMISSION", "CASA_SUBCATEGORY_COMMISSION");
}
for (const q of [
  "¿Qué comisión tenemos?",
  "¿Cuánto tenemos de comisión?",
  "¿Cuál es la comisión?",
  "¿Qué descuento tenemos?",
  "¿Cuál es el descuento IGF?",
]) {
  addAnti(q, "IGF_COMMISSION_OR_DISCOUNT", "CASA_CATEGORY_COMMISSION");
  addAnti(q, "IGF_COMMISSION_OR_DISCOUNT", "COMISIONISTA_CATEGORY_COMMISSION");
}
for (const q of [
  "top comisionistas",
  "ranking de comisionistas",
  "dame los 10 comisionistas que más compraron",
  "clientes Casa que más compraron",
  "ranking Casa",
  "top 5 clientes Casa",
  "clientes del canal Comisionista",
  "mezcla casa comisionista",
]) {
  addAnti(q, null, "CASA_CATEGORY_COMMISSION");
  addAnti(q, null, "COMISIONISTA_CATEGORY_COMMISSION");
  addAnti(q, null, "COMISIONISTA_SUBCATEGORY_COMMISSION");
}
for (const q of OPEN_CATEGORY_COMMANDS) addAnti(q, "OPEN_CATEGORY_MOVEMENT", "CASA_CATEGORY_COMMISSION");
for (const q of DIRECT_PRONOSTICO_COMMANDS) {
  addAnti(q, "OPEN_IGF_PRONOSTICO_MODAL", "SOFT_DAILY_SALES_OFFER");
  addAnti(q, "OPEN_IGF_PRONOSTICO_MODAL", "CASA_CATEGORY_COMMISSION");
}
addAnti("dime la venta diaria", null, "OPEN_IGF_PRONOSTICO_MODAL");
addAnti("cuál es el pronóstico", null, "OPEN_IGF_PRONOSTICO_MODAL");
addAnti("abre pronóstico", "OPEN_PRONOSTICO", "CASA_CATEGORY_COMMISSION");
addAnti("sí", null, "OPEN_CATEGORY_MOVEMENT");
addAnti("ok", null, "OPEN_IGF_PRONOSTICO_MODAL");
addAnti("¿Cuál es la comisión de Casa Autotanque?", "CASA_SUBCATEGORY_COMMISSION", "CASA_CATEGORY_COMMISSION");
addAnti("¿Qué comisión tenemos en Casa?", "CASA_CATEGORY_COMMISSION", "CASA_SUBCATEGORY_COMMISSION");
addAnti("¿Qué comisión tenemos en Comisionista?", "COMISIONISTA_CATEGORY_COMMISSION", "IGF_COMMISSION_CURRENT");
addAnti("comisión de Comisionista", "COMISIONISTA_CATEGORY_COMMISSION", "IGF_COMMISSION_CURRENT");
addAnti("descuento global", null, "CASA_CATEGORY_COMMISSION");

for (const q of COMISIONISTA_CATEGORY_UTTERANCES) {
  addAnti(q, "COMISIONISTA_CATEGORY_COMMISSION", "IGF_COMMISSION_CURRENT");
  addAnti(q, "COMISIONISTA_CATEGORY_COMMISSION", "CASA_CATEGORY_COMMISSION");
}

const MULTI_TURN = [];

function addConvo(turns) {
  MULTI_TURN.push(turns);
}

addConvo([
  { q: "¿Qué comisión tenemos en Casa?", expect: { family: "CASA_CATEGORY_COMMISSION", offer: true } },
  { q: "sí", expect: { family: "UI_CONFIRM", ui_action: "OPEN_CATEGORY_MOVEMENT", category: "CASA" } },
]);
addConvo([
  { q: "¿Qué comisión tenemos en Comisionista?", expect: { family: "COMISIONISTA_CATEGORY_COMMISSION" } },
  { q: "sí ábrela", expect: { family: "UI_CONFIRM", ui_action: "OPEN_CATEGORY_MOVEMENT", category: "COMISIONISTA" } },
]);
addConvo([
  { q: "¿Cuál es la comisión de Casa Autotanque?", expect: { family: "CASA_SUBCATEGORY_COMMISSION" } },
  { q: "abre la tabla", expect: { family: "OPEN_CATEGORY_MOVEMENT", category: "CASA" } },
]);
addConvo([
  { q: "¿Qué comisión tenemos?", expect: { family: "IGF_COMMISSION_OR_DISCOUNT" } },
  { q: "¿y en Casa?", expect: { family: "CASA_CATEGORY_COMMISSION" } },
  { q: "¿y en Autotanque?", expect: { family: "CASA_SUBCATEGORY_COMMISSION" } },
]);
addConvo([{ q: "abre la venta diaria", expect: { family: "OPEN_IGF_PRONOSTICO_MODAL", immediate: true } }]);
addConvo([
  { q: "Quiero ver la venta diaria.", expect: { family: "SOFT_DAILY_SALES_OFFER" } },
  { q: "sí", expect: { family: "UI_CONFIRM", ui_action: "OPEN_IGF_PRONOSTICO_MODAL" } },
]);
addConvo([
  { q: "¿Qué comisión tenemos en Casa?", expect: { family: "CASA_CATEGORY_COMMISSION" } },
  { q: "¿Qué HG tenemos?", expect: { family: null, stale_confirm: false } },
  { q: "sí", expect: { family: null, no_stale_ui: true } },
]);

const extraConfirms = ["si", "adelante", "ábrela", "ok", "va", "sí ábrela"];
for (const cat of ["Casa", "Comisionista"]) {
  for (const conf of extraConfirms) {
    addConvo([
      { q: `¿Qué comisión tenemos en ${cat}?`, expect: { family: cat === "Casa" ? "CASA_CATEGORY_COMMISSION" : "COMISIONISTA_CATEGORY_COMMISSION" } },
      { q: conf, expect: { family: "UI_CONFIRM", category: cat === "Casa" ? "CASA" : "COMISIONISTA" } },
    ]);
  }
}

for (const sub of CASA_PHYSICAL_SUBS) {
  addConvo([
    { q: `¿Cuál es la comisión de Casa ${sub}?`, expect: { family: "CASA_SUBCATEGORY_COMMISSION" } },
    { q: "abre la tabla", expect: { family: "OPEN_CATEGORY_MOVEMENT", category: "CASA" } },
  ]);
}

for (let i = 0; i < 40; i += 1) {
  const q = CASA_CATEGORY_UTTERANCES[i % CASA_CATEGORY_UTTERANCES.length];
  addConvo([
    { q, expect: { family: "CASA_CATEGORY_COMMISSION" } },
    { q: i % 2 === 0 ? "sí" : "ok", expect: { family: "UI_CONFIRM", category: "CASA" } },
  ]);
}
for (let i = 0; i < 20; i += 1) {
  const q = COMISIONISTA_CATEGORY_UTTERANCES[i % COMISIONISTA_CATEGORY_UTTERANCES.length];
  addConvo([
    { q, expect: { family: "COMISIONISTA_CATEGORY_COMMISSION" } },
    { q: i % 2 === 0 ? "sí ábrela" : "adelante", expect: { family: "UI_CONFIRM", category: "COMISIONISTA" } },
  ]);
}

const CATEGORY_COMMISSION_REGRESSIONS = Object.freeze([
  { q: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", never: "Invalid time value" },
  { q: "¿Qué comisión tenemos?", not_family: "CASA_CATEGORY_COMMISSION" },
  { q: "¿Qué comisión tenemos en Casa?", family: "CASA_CATEGORY_COMMISSION" },
  { q: "¿Qué comisión tenemos en Comisionista?", family: "COMISIONISTA_CATEGORY_COMMISSION" },
]);

const SAMPLE_CATEGORY_ROWS = Object.freeze([
  { categoria: "CASA", subcategoria: "Autotanque", kg_proyectado: 483280, descuento_kg: 0.308 },
  { categoria: "CASA", subcategoria: "Carburación", kg_proyectado: 206100, descuento_kg: 4.339 },
  { categoria: "CASA", subcategoria: "Portátil", kg_proyectado: 3170, descuento_kg: 0.13 },
  { categoria: "CASA", subcategoria: "", kg_proyectado: 85420, descuento_kg: 0.13 },
  { categoria: "COMISIONISTA", subcategoria: "Estacionario", kg_proyectado: 120000, descuento_kg: 0.22 },
  { categoria: "COMISIONISTA", subcategoria: "Carburación", kg_proyectado: 45000, descuento_kg: 1.1 },
]);

module.exports = {
  CATEGORY_COMMISSION_FAMILY_IDS,
  CASA_PHYSICAL_SUBS,
  CASA_CATEGORY_UTTERANCES,
  CASA_SUBCATEGORY_TEMPLATES,
  COMISIONISTA_CATEGORY_UTTERANCES,
  COMISIONISTA_SUBCATEGORY_TEMPLATES,
  CATEGORY_COMMISSION_UTTERANCES,
  OPEN_CATEGORY_COMMANDS,
  DIRECT_PRONOSTICO_COMMANDS,
  SOFT_PRONOSTICO_ASKS,
  UI_CONFIRMS,
  CATEGORY_COMMISSION_ANTI_COLLISIONS: ANTI_COLLISIONS,
  CATEGORY_COMMISSION_MULTI_TURN: MULTI_TURN,
  CATEGORY_COMMISSION_REGRESSIONS,
  SAMPLE_CATEGORY_ROWS,
  expandTemplates,
};
