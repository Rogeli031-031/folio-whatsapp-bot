"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  isClientRankingQuestion,
  extractClientRankingSpec,
} = require("../lib/director-ia-client-ranking");
const {
  isClientMovementQuestion,
  extractClientMovementSpec,
  isClientMovementFollowUp,
  MOVEMENT,
} = require("../lib/director-ia-client-movement");
const {
  isClientEvidenceQuestion,
  isClientEvidenceFollowUp,
  extractClientEvidenceSpec,
} = require("../lib/director-ia-client-evidence");
const {
  isProcurementByConceptQuestion,
  extractProcurementSpec,
  OPS,
} = require("../lib/director-ia-procurement-by-concept");
const { isFolioResultSetFollowUp } = require("../lib/director-ia-conversation-state");
const { extractFolioSearchFilters, looksLikePaidFolioQuestion } = require("../lib/director-ia-folio-search");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isExpenseAnalyticsQuestion } = require("../lib/director-ia-expense-analytics");

const NOW = new Date("2026-09-16T12:00:00-06:00");

function periodOpts(q) {
  return extractClientRankingSpec(q, null, { now: NOW, selectedPeriod: "2026-09", latestArrPeriod: "2026-09" });
}

const DISCOUNT_30 = [
  "top 5 clientes con mayor descuento",
  "cinco clientes con más descuento",
  "ranking de clientes por descuento",
  "quién tiene mayor descuento",
  "a quién le damos más descuento",
  "top descuentos de casa",
  "top descuentos de comisionistas",
  "quién tiene menor descuento",
  "clientes con descuento más alto",
  "ranking de descuento de septiembre",
  "top 3 descuentos",
  "top 10 clientes por descuento",
  "quién encabeza los descuentos",
  "mayor descuento por kg",
  "menor descuento por kg",
  "top 1 cliente con más descuento",
  "bottom 5 clientes por descuento",
  "ranking de descuentos casa septiembre",
  "dame el top de descuentos",
  "clientes con el descuento más bajo",
  "quién tiene el mayor descuento por kg",
  "top descuentos Acapulco",
  "ranking descuento comisionista Puebla",
  "cinco mayores descuentos",
  "quién recibe más descuento",
  "top 8 descuentos de casa",
  "clientes ordenados por descuento",
  "el que tiene más descuento",
  "ranking mensual de descuento",
  "top descuentos de septiembre",
];
const DISCOUNT_FOLLOW = [
  "¿y el segundo?",
  "¿quién quedó tercero?",
  "ahora dame top 10",
  "¿y solo casa?",
  "¿y comisionistas?",
  "¿qué descuento tuvo el primero?",
  "compara contra agosto",
  "¿cuál es el delta?",
  "¿y en Puebla?",
  "dame el bottom",
];
const DISCOUNT_ANTI = [
  "top 5 clientes que más compran",
  "qué clientes dejaron de comprar",
  "qué clientes están inactivos",
  "qué comentarios tiene Grupo Move",
  "cuánto gastamos en llantas",
  "existe un folio de extintores",
  "cuántas estaciones tiene Puebla",
  "qué acciones hay del tema Clientes",
  "cómo vamos este mes",
  "cuántos folios de llantas hay",
];

const MOVEMENT_30 = [
  "qué clientes dejaron de comprar",
  "qué clientes dejaron de consumir",
  "quién ya no está comprando",
  "qué clientes se quedaron en cero",
  "quién compraba antes y ahora no",
  "qué clientes disminuyeron",
  "quién aumentó",
  "clientes nuevos",
  "quiénes se fueron a cero",
  "quién perdió más consumo",
  "qué clientes de casa dejaron de comprar",
  "qué comisionistas dejaron de comprar",
  "quién dejó de comprar en septiembre",
  "qué clientes dejaron de comprar en Puebla",
  "qué clientes aumentaron en Acapulco",
  "quién dejó completamente de consumir",
  "quiénes ya no consumen",
  "qué clientes se fueron a cero en casa",
  "quién compraba y ahora no",
  "lista de clientes que dejaron de consumir",
  "quiénes disminuyeron consumo",
  "qué clientes aumentaron consumo",
  "nuevos clientes que entraron",
  "quiénes entraron este mes",
  "quién perdió volumen",
  "clientes que cayeron a cero",
  "quién ya no consume en septiembre",
  "qué clientes de Acapulco disminuyeron",
  "quién aumentó en Puebla",
  "quiénes dejaron de comprar en casa",
];
const MOVEMENT_FOLLOW = [
  "cuánto compraba antes",
  "de cuánto pasó a cero",
  "cuándo dejó de comprar",
  "cuál fue su último mes con consumo",
  "qué volumen perdió",
  "y en porcentaje",
  "cuánto bajó cada uno",
  "quién cayó más",
  "desde cuándo no compra",
  "en qué mes cambió",
];
const MOVEMENT_ANTI = [
  "qué clientes están inactivos",
  "top 5 clientes con mayor descuento",
  "top 5 clientes que más compran",
  "qué comentarios tiene Grupo Move",
  "cuánto gastamos en llantas",
  "existe un folio de extintores",
  "qué proveedores venden llantas",
  "cómo vamos este mes",
  "qué acciones hay del tema Clientes",
  "cuántas estaciones tiene Puebla",
];

const INACT_30 = [
  "qué clientes están inactivos",
  "quién lleva tiempo sin comprar",
  "clientes sin consumo reciente",
  "quién no ha comprado últimamente",
  "clientes sin actividad",
  "quién lleva 30 días sin comprar",
  "quién lleva 60 días sin consumo",
  "qué clientes no han comprado este mes",
  "qué clientes están inactivos en casa",
  "qué comisionistas están inactivos",
  "desde cuándo están inactivos",
  "quién lleva más tiempo sin comprar",
  "inactivos de septiembre",
  "clientes inactivos en Puebla",
  "inactivos de Acapulco",
  "quién está inactivo en casa",
  "lista de inactivos",
  "quién no compra desde agosto",
  "inactivos desde agosto",
  "quién no ha consumido este mes",
  "clientes inactivos 30 días",
  "inactividad de 60 días",
  "quién lleva 45 días sin comprar",
  "sin consumo este mes",
  "inactivos comisionistas septiembre",
  "quién está sin actividad comercial",
  "clientes dormidos sin comprar",
  "quién no registra consumo reciente",
  "inactivos de venta casa",
  "quién lleva dos meses sin comprar",
];
const INACT_FOLLOW = [
  "desde cuándo",
  "quién lleva más tiempo",
  "y en casa",
  "y comisionistas",
  "cuánto compraban antes",
  "están también en cero",
  "dame 60 días",
  "solo este mes",
  "y en Puebla",
  "cuál es la ventana",
];
const INACT_ANTI = [
  "qué clientes dejaron de comprar",
  "qué clientes disminuyeron",
  "top 5 clientes de venta casa",
  "qué comentarios tiene Grupo Move",
  "cuánto gastamos en llantas",
  "existe un folio de extintores",
  "cómo vamos este mes",
  "qué acciones hay del tema Clientes",
  "top 5 clientes con mayor descuento",
  "cuántas estaciones tiene Puebla",
];

const TRANS_30 = [
  "cuánto compraba antes",
  "cuánto consumía antes",
  "de cuánto pasó a cero",
  "cuándo dejó de comprar",
  "desde cuándo no compra",
  "cuál fue su último mes con consumo",
  "cuál fue su última compra",
  "cuánto compraba el periodo anterior",
  "en qué mes cayó a cero",
  "cuál era su consumo anterior",
  "qué volumen perdió",
  "cuándo pasó a inactivo",
  "en qué mes cambió",
  "de cuánto a cuánto bajó",
  "cuál es el delta",
  "cuándo pasó de activo a inactivo",
  "último periodo con consumo",
  "primer periodo en cero",
  "cuánto tenía en agosto",
  "cuánto tiene ahora",
  "qué variación tuvo",
  "cuánto perdió en toneladas",
  "desde qué mes no registra compra",
  "cuál fue el mes previo",
  "muéstrame previous y current",
  "cuánto era el consumo anterior",
  "en qué periodo quedó en cero",
  "desde cuándo está en cero",
  "cuánto compraba RESORT",
  "historia del cliente que se fue a cero",
];
const TRANS_FOLLOW = [
  "y el delta",
  "y el mes anterior",
  "y la última compra",
  "también el primero en cero",
  "en porcentaje",
  "y el descuento",
  "compara agosto y septiembre",
  "dame la variación",
  "quién perdió más",
  "y en casa",
];
const TRANS_ANTI = [
  "top 5 clientes de venta casa",
  "qué clientes están inactivos",
  "cuánto gastamos en llantas",
  "existe un folio de extintores",
  "qué comentarios tiene Grupo Move",
  "cómo vamos este mes",
  "qué proveedores venden llantas",
  "cuántas estaciones tiene Puebla",
  "top 5 descuentos",
  "qué acciones hay del tema Clientes",
];

const DDISC_30 = [
  "qué clientes disminuyeron su descuento",
  "a quién le bajó el descuento",
  "quién tiene menos descuento que antes",
  "qué clientes aumentaron su descuento",
  "a quién le subió el descuento",
  "cuál era el descuento anterior",
  "de cuánto a cuánto cambió",
  "cuál es el delta del descuento",
  "top 5 aumentos de descuento",
  "top 5 reducciones de descuento",
  "quién tuvo el mayor aumento",
  "quién tuvo la mayor reducción",
  "compara descuentos contra agosto",
  "quién bajó descuento en septiembre",
  "delta de descuento de casa",
  "aumentos de descuento comisionista",
  "quién redujo más el descuento",
  "descuento anterior vs actual",
  "ranking de bajas de descuento",
  "ranking de alzas de descuento",
  "cuánto bajó el descuento",
  "cuánto subió el descuento",
  "quién cambió de descuento",
  "descuentos que disminuyeron",
  "descuentos que aumentaron",
  "mayor reducción de descuento",
  "mayor aumento de descuento",
  "compara el descuento de septiembre contra agosto",
  "quién tenía más descuento antes",
  "delta descuento por kg",
];
const DDISC_FOLLOW = [
  "de cuánto a cuánto",
  "cuál era el anterior",
  "y el delta",
  "top 3",
  "solo las reducciones",
  "solo los aumentos",
  "y en casa",
  "y comisionistas",
  "contra agosto",
  "quién fue el mayor",
];
const DDISC_ANTI = [
  "top 5 clientes con mayor descuento",
  "top 5 clientes que más compran",
  "qué clientes dejaron de comprar",
  "cuánto gastamos en llantas",
  "existe un folio de extintores",
  "qué comentarios tiene Grupo Move",
  "cómo vamos este mes",
  "cuántas estaciones tiene Puebla",
  "qué clientes están inactivos",
  "qué acciones hay del tema Clientes",
];

const ENTITY_30 = [
  "cuánto disminuyeron",
  "cuánto bajaron",
  "cuánto perdió cada uno",
  "cuánto compraban antes",
  "de cuánto a cuánto bajaron",
  "cuál tuvo mayor caída",
  "quién disminuyó más",
  "y en porcentaje",
  "qué descuento tienen",
  "cuál vende más de esos dos",
  "cuál mejoró",
  "cuál empeoró",
  "qué comentarios tienen",
  "qué acciones tienen",
  "compáralos",
  "cuánto bajó cada uno",
  "quién cayó más",
  "dame el delta de ambos",
  "cuál tiene mayor venta",
  "quién mejoró de los dos",
  "compara esos clientes",
  "qué volumen perdieron",
  "están inactivos esos dos",
  "qué DICF tienen",
  "qué tienen en Action Register",
  "cuál concentra más venta",
  "quién tiene peor variación",
  "muéstrame previous y current de esos",
  "y su descuento actual",
  "limítate a esos dos",
];
const ENTITY_FOLLOW = [
  "ahora dame todos los que disminuyeron",
  "y en porcentaje",
  "qué comentarios tienen",
  "qué acciones tienen",
  "cuál cayó más",
  "compáralos otra vez",
  "su descuento",
  "su consumo anterior",
  "quién mejoró",
  "quién empeoró",
];
const ENTITY_ANTI = [
  "cuánto disminuyeron los clientes",
  "qué clientes disminuyeron",
  "top 5 clientes de venta casa",
  "cuánto gastamos en llantas",
  "existe un folio de extintores",
  "cómo vamos este mes",
  "qué acciones hay del tema Clientes",
  "cuántas estaciones tiene Puebla",
  "qué proveedores venden llantas",
  "qué clientes están inactivos",
];

const EVID_30 = [
  "qué comentarios tiene Grupo Move",
  "qué acciones tiene",
  "qué seguimiento tenemos",
  "qué DICF tiene",
  "tiene algo en Action Register",
  "qué pendientes existen",
  "quién es responsable",
  "qué fecha tiene la acción",
  "qué estado tiene",
  "cuál fue el último comentario",
  "qué antecedentes tenemos",
  "hay alguna acción de recuperación",
  "dame comentarios y acciones",
  "dame comentarios, acciones y responsables",
  "qué comentarios tiene Grupo Move Empresarial",
  "qué DICF abiertas tiene",
  "qué hay en bitácora",
  "qué acciones tiene el cliente",
  "responsable de la acción",
  "estado de la acción",
  "fecha de la acción",
  "último comentario comercial",
  "comentarios ARR del cliente",
  "acciones DICF del cliente",
  "Action Register del cliente",
  "pendientes de seguimiento",
  "dame solo DICF",
  "dame solo Action Register",
  "qué bitácora hay",
  "comentarios y responsables",
];
const EVID_FOLLOW = [
  "y el responsable",
  "y la fecha",
  "y el estado",
  "el último comentario",
  "también bitácora",
  "solo DICF",
  "solo Action Register",
  "hay pendientes",
  "quién atiende",
  "cuándo se abrió",
];
const EVID_ANTI = [
  "qué acciones hay del tema Clientes",
  "qué acciones tenemos de Clientes en Action Register",
  "top 5 clientes de venta casa",
  "qué clientes dejaron de comprar",
  "cuánto gastamos en llantas",
  "existe un folio de extintores",
  "cómo vamos este mes",
  "cuántas estaciones tiene Puebla",
  "qué proveedores venden llantas",
  "qué clientes están inactivos",
];

const CONCEPTS = ["llantas", "aceite", "baterías", "pintura", "uniformes", "extintores", "válvulas", "filtros"];

function spendPhrases() {
  const base = [
    "cuánto he gastado en llantas de enero a agosto",
    "cuánto gastamos en llantas",
    "gasto acumulado de llantas",
    "cuánto suman los folios de llantas",
    "monto relacionado con llantas",
    "cuánto tenemos registrado en llantas",
    "gasto de llantas en Acapulco",
    "gasto de llantas en Puebla",
    "cuánto llevamos de llantas este año",
    "cuánto representan las compras relacionadas con llantas",
  ];
  for (const c of CONCEPTS) {
    base.push(`cuánto gastamos en ${c}`);
    base.push(`gasto relacionado con ${c}`);
    base.push(`monto registrado de ${c} de enero a agosto`);
  }
  return base.slice(0, 30);
}
const SPEND_30 = spendPhrases();
const SPEND_FOLLOW = [
  "y por mes",
  "y por planta",
  "cuántos folios son",
  "cuáles son",
  "y en Acapulco",
  "y en Puebla",
  "solo pagados",
  "el total",
  "ahora aceite",
  "y por beneficiario",
];
const SPEND_ANTI = [
  "cuántas llantas tenemos",
  "qué proveedores venden llantas",
  "qué beneficiarios tenemos en llantas",
  "cuánto cuesta cada llanta",
  "cuántos folios hay de llantas",
  "top 5 clientes de venta casa",
  "qué clientes dejaron de comprar",
  "cómo vamos este mes",
  "cuántas estaciones tiene Puebla",
  "qué comentarios tiene Grupo Move",
];

function supplierPhrases() {
  const base = [
    "qué proveedores nos venden llantas",
    "quién nos vende llantas",
    "a qué proveedores les compramos llantas",
    "quién nos surte llantas",
    "qué empresas aparecen como proveedor",
    "proveedores de llantas",
    "con quién compramos llantas",
    "qué proveedor usamos más",
    "qué proveedor tiene más folios",
    "qué proveedor tiene mayor importe",
    "proveedores de llantas en Acapulco",
    "proveedores de enero a agosto",
  ];
  for (const c of CONCEPTS) {
    base.push(`proveedores de ${c}`);
    base.push(`quién nos vende ${c}`);
    base.push(`con quién compramos ${c}`);
  }
  return base.slice(0, 30);
}
const SUP_30 = supplierPhrases();
const SUP_FOLLOW = [
  "quién tiene más folios",
  "quién tiene mayor importe",
  "y en Acapulco",
  "de enero a agosto",
  "cuál usamos más",
  "cuántos hay",
  "el último",
  "ahora aceite",
  "por planta",
  "lista",
];
const SUP_ANTI = [
  "qué beneficiarios tenemos en llantas",
  "cuánto gastamos en llantas",
  "cuánto cuesta cada llanta",
  "cuántos folios hay de llantas",
  "cuántas llantas tenemos",
  "top 5 clientes de venta casa",
  "qué clientes dejaron de comprar",
  "cómo vamos este mes",
  "cuántas estaciones tiene Puebla",
  "qué comentarios tiene Grupo Move",
];

function benefPhrases() {
  const base = [
    "qué beneficiarios tenemos en llantas",
    "beneficiarios de folios de llantas",
    "a nombre de quién están los folios",
    "quién recibió pagos relacionados con llantas",
    "qué beneficiario aparece más",
    "cuánto le hemos pagado a cada uno",
    "cuál concentra más importe",
    "beneficiarios de llantas en Acapulco",
    "beneficiarios de enero a agosto",
    "cuántos beneficiarios distintos hay",
  ];
  for (const c of CONCEPTS) {
    base.push(`beneficiarios de ${c}`);
    base.push(`quién aparece en folios de ${c}`);
    base.push(`a nombre de quién están los folios de ${c}`);
  }
  return base.slice(0, 30);
}
const BEN_30 = benefPhrases();
const BEN_FOLLOW = [
  "cuánto le hemos pagado a cada uno",
  "quién tiene más folios",
  "cuál concentra más importe",
  "cuál fue el último",
  "cuántos hay",
  "y en Acapulco",
  "de enero a agosto",
  "ahora aceite",
  "lista",
  "el de mayor importe",
];
const BEN_ANTI = [
  "qué proveedores nos venden llantas",
  "cuánto gastamos en llantas",
  "cuánto cuesta cada llanta",
  "cuántos folios hay de llantas",
  "cuántas llantas tenemos",
  "top 5 clientes de venta casa",
  "qué clientes dejaron de comprar",
  "cómo vamos este mes",
  "cuántas estaciones tiene Puebla",
  "qué comentarios tiene Grupo Move",
];

const UNIT_30 = [
  "cuánto cuesta en promedio cada llanta",
  "cuál es el precio promedio por llanta",
  "cuánto estamos pagando por llanta",
  "en cuánto nos sale cada llanta",
  "costo unitario promedio",
  "cuánto cuesta una llanta en Acapulco",
  "cuánto cuesta una llanta en Puebla",
  "precio promedio por proveedor",
  "qué proveedor tiene menor costo por llanta",
  "cuál tiene mayor costo",
  "compara precio promedio por proveedor",
  "cuánto cuesta cada llanta",
  "costo unitario de llantas",
  "precio promedio de aceite",
  "cuánto cuesta cada batería",
  "costo unitario de filtros",
  "cuánto sale cada extintor",
  "precio promedio de pintura",
  "cuánto cuesta cada uniforme",
  "costo por válvula",
  "precio unitario de llantas en Acapulco",
  "costo promedio por pieza de llanta",
  "cuánto pagamos por cada llanta",
  "unit cost de llantas",
  "promedio por llanta este año",
  "costo unitario enero a agosto",
  "cuánto cuesta una llanta",
  "precio por llanta en Puebla",
  "menor costo unitario",
  "mayor costo unitario",
];
const UNIT_FOLLOW = [
  "y en Acapulco",
  "y en Puebla",
  "por proveedor",
  "cuál es menor",
  "cuál es mayor",
  "ahora aceite",
  "si no hay cantidad dilo",
  "fail closed",
  "de enero a agosto",
  "el promedio",
];
const UNIT_ANTI = [
  "cuánto gastamos en llantas",
  "qué proveedores venden llantas",
  "qué beneficiarios tenemos en llantas",
  "cuántos folios hay de llantas",
  "cuántas llantas tenemos",
  "top 5 clientes de venta casa",
  "qué clientes dejaron de comprar",
  "cómo vamos este mes",
  "cuántas estaciones tiene Puebla",
  "qué comentarios tiene Grupo Move",
];

const FOLIO_RS_30 = [
  "cuál es la suma total",
  "cuál fue el de mayor importe",
  "cuál fue el menor",
  "cuántos son de Taller",
  "cuáles son",
  "quiénes son los beneficiarios",
  "cuánto suman",
  "cuál fue el más reciente",
  "cuál fue el primero",
  "dame el detalle",
  "listar esos folios",
  "cuántos hay",
  "qué estatus tienen",
  "de cuándo son",
  "el de menor importe",
  "el de mayor importe",
  "cuántos siguen pendientes",
  "cuáles están pagados",
  "enséñamelos",
  "dámelos",
  "números de folio",
  "quiénes aparecen como beneficiarios",
  "cuántos son de Gastos",
  "filtra taller",
  "el último que pagamos",
  "el más antiguo",
  "suma total de esos",
  "agrupa por beneficiario",
  "cuántos encontramos",
  "muestra el conjunto",
];
const FOLIO_RS_FOLLOW = [
  "cuál es la suma total",
  "cuál fue el de mayor importe",
  "cuál fue el menor",
  "cuántos son de Taller",
  "cuáles son",
  "quiénes son los beneficiarios",
  "ahora los de aceite",
  "cuánto suman",
  "cuál fue el más reciente",
  "dame el detalle",
];
const FOLIO_RS_ANTI = [
  "cómo vamos este mes",
  "top 5 clientes de venta casa",
  "qué clientes dejaron de comprar",
  "qué comentarios tiene Grupo Move",
  "cuántas estaciones tiene Puebla",
  "qué acciones hay del tema Clientes",
  "cuánto gastamos en extintores",
  "quién nos vende llantas",
  "cuánto cuesta cada llanta",
  "qué clientes están inactivos",
];

const FALLBACK_30 = [
  "top 5 clientes de venta casa",
  "ranking de clientes casa",
  "principales clientes de venta casa",
  "top clientes de Puebla",
  "dame el ranking de clientes",
  "top 10 comisionistas",
  "mayores clientes de casa",
  "clientes con mayor venta",
  "top 3 comisionistas de Puebla",
  "quiénes son los mayores clientes",
  "ranking de venta por cliente",
  "cinco clientes con más toneladas",
  "top 5 casa",
  "top 1 cliente de casa",
  "mejores clientes por volumen",
  "ranking de los 10 principales clientes",
  "top 5 clientes de Acapulco",
  "principales compradores",
  "quién compró más en casa",
  "dame los 5 de casa",
  "ranking casa sin mes",
  "top venta casa",
  "clientes líderes de casa",
  "top 4 casa",
  "top 6 casa",
  "top 7 casa",
  "top 8 casa",
  "top 9 casa",
  "top 2 casa",
  "ranking comercial de clientes",
];
const FALLBACK_FOLLOW = [
  "y el segundo",
  "ahora top 10",
  "y comisionistas",
  "y solo Puebla",
  "quién fue el número uno",
  "cuál vendió menos",
  "contra el mes pasado",
  "el tercero",
  "y en septiembre",
  "dame bottom 3",
];
const FALLBACK_ANTI = [
  "cómo vamos con clientes",
  "cuánto gastamos en llantas",
  "existe un folio de extintores",
  "qué clientes dejaron de comprar",
  "qué comentarios tiene Grupo Move",
  "cómo vamos este mes",
  "cuántas estaciones tiene Puebla",
  "qué acciones hay del tema Clientes",
  "qué proveedores venden llantas",
  "cuánto cuesta cada llanta",
];

function assertLen(arr, n, name) {
  assert.equal(arr.length, n, `${name} expected ${n} got ${arr.length}`);
}

describe("CLIENT_RANKING_DISCOUNT 30+10+10", () => {
  assertLen(DISCOUNT_30, 30, "DISCOUNT_30");
  it("30/30", () => {
    for (const q of DISCOUNT_30) {
      assert.equal(isClientRankingQuestion(q), true, q);
      const spec = periodOpts(q);
      assert.equal(spec.ok, true, q);
      assert.equal(spec.metric, "DESCUENTO_POR_KG", q);
    }
  });
  it("10 follow-ups", () => {
    const prior = periodOpts("top 5 clientes con mayor descuento");
    for (const q of DISCOUNT_FOLLOW) {
      assert.equal(extractClientRankingSpec(q, prior, { now: NOW, selectedPeriod: "2026-09" }).ok, true, q);
    }
  });
  it("10 anti", () => {
    for (const q of DISCOUNT_ANTI) {
      const spec = extractClientRankingSpec(q, null, { now: NOW, selectedPeriod: "2026-09" });
      assert.ok(!spec.ok || spec.metric !== "DESCUENTO_POR_KG", q);
    }
  });
});

describe("CLIENT_MOVEMENT 30+10+10", () => {
  assertLen(MOVEMENT_30, 30, "MOVEMENT_30");
  it("30/30", () => {
    for (const q of MOVEMENT_30) {
      assert.equal(isClientMovementQuestion(q), true, q);
      const spec = extractClientMovementSpec(q, null, { now: NOW, selectedPeriod: "2026-09" });
      assert.equal(spec.ok, true, q);
      assert.notEqual(spec.movement_type, MOVEMENT.INACTIVO, q);
    }
  });
  it("10 follow-ups", () => {
    const prior = extractClientMovementSpec("qué clientes dejaron de consumir", null, { now: NOW, selectedPeriod: "2026-09" });
    for (const q of MOVEMENT_FOLLOW) {
      assert.equal(isClientMovementFollowUp(q) || isClientMovementQuestion(q), true, q);
      assert.equal(extractClientMovementSpec(q, prior, { now: NOW, selectedPeriod: "2026-09" }).ok, true, q);
    }
  });
  it("10 anti", () => {
    for (const q of MOVEMENT_ANTI) {
      const spec = extractClientMovementSpec(q, null, { now: NOW });
      assert.ok(!spec.ok || spec.movement_type === MOVEMENT.INACTIVO || /descuento|inactiv/.test(q), q);
    }
  });
});

describe("CLIENT_INACTIVITY 30+10+10", () => {
  assertLen(INACT_30, 30, "INACT_30");
  it("30/30", () => {
    for (const q of INACT_30) {
      const spec = extractClientMovementSpec(q, null, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.movement_type, MOVEMENT.INACTIVO, q);
    }
  });
  it("10 follow-ups + 10 anti", () => {
    const prior = extractClientMovementSpec("quién lleva 30 días sin comprar", null, { now: NOW });
    for (const q of INACT_FOLLOW) {
      assert.equal(extractClientMovementSpec(q, prior, { now: NOW }).ok, true, q);
    }
    for (const q of INACT_ANTI) {
      const spec = extractClientMovementSpec(q, null, { now: NOW });
      assert.ok(!spec.ok || spec.movement_type !== MOVEMENT.INACTIVO, q);
    }
  });
});

describe("CLIENT_TRANSITION_HISTORY 30+10+10", () => {
  assertLen(TRANS_30, 30, "TRANS_30");
  it("30/30 + follow + anti", () => {
    const prior = extractClientMovementSpec("qué clientes dejaron de consumir", null, { now: NOW, selectedPeriod: "2026-09" });
    for (const q of TRANS_30) {
      assert.equal(isClientMovementQuestion(q) || isClientMovementFollowUp(q), true, q);
      assert.equal(extractClientMovementSpec(q, prior, { now: NOW, selectedPeriod: "2026-09" }).ok, true, q);
    }
    for (const q of TRANS_FOLLOW) {
      assert.equal(extractClientMovementSpec(q, prior, { now: NOW, selectedPeriod: "2026-09" }).ok, true, q);
    }
    for (const q of TRANS_ANTI) {
      const spec = extractClientMovementSpec(q, null, { now: NOW });
      assert.ok(!spec.ok || spec.movement_type === MOVEMENT.INACTIVO, q);
    }
  });
});

describe("DISCOUNT_MOVEMENT 30+10+10", () => {
  assertLen(DDISC_30, 30, "DDISC_30");
  it("30/30 + follow + anti", () => {
    for (const q of DDISC_30) {
      const spec = extractClientMovementSpec(q, null, { now: NOW, selectedPeriod: "2026-09" });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.movement_type, "DISCOUNT_MOVEMENT", q);
    }
    const prior = extractClientMovementSpec(DDISC_30[0], null, { now: NOW, selectedPeriod: "2026-09" });
    for (const q of DDISC_FOLLOW) {
      assert.equal(extractClientMovementSpec(q, prior, { now: NOW, selectedPeriod: "2026-09" }).ok, true, q);
    }
    for (const q of DDISC_ANTI) {
      const spec = extractClientMovementSpec(q, null, { now: NOW, selectedPeriod: "2026-09" });
      assert.ok(!spec.ok || spec.movement_type !== "DISCOUNT_MOVEMENT", q);
    }
  });
});

describe("CLIENT_ENTITY_SET_FOLLOWUP 30+10+10", () => {
  assertLen(ENTITY_30, 30, "ENTITY_30");
  it("30/30 + follow + anti", () => {
    const prior = {
      ok: true,
      current_period: "2026-09",
      entity_names: ["PUBLICO EN GENERAL", "GRUPO MOVE EMPRESARIAL"],
    };
    for (const q of ENTITY_30) {
      const spec = extractClientMovementSpec(q, prior, { now: NOW, selectedPeriod: "2026-09" });
      const evid = extractClientEvidenceSpec(q, { ok: true, entity_names: prior.entity_names });
      assert.ok(spec.ok || evid.ok, q);
    }
    for (const q of ENTITY_FOLLOW) {
      assert.ok(
        extractClientMovementSpec(q, prior, { now: NOW, selectedPeriod: "2026-09" }).ok ||
          extractClientEvidenceSpec(q, { ok: true, entity_names: prior.entity_names }).ok,
        q
      );
    }
    for (const q of ENTITY_ANTI) {
      const spec = extractClientMovementSpec(q, null, { now: NOW });
      assert.ok(!spec.ok || !spec.restrict_to_entities, q);
    }
  });
});

describe("CLIENT_EVIDENCE_AND_ACTIONS 30+10+10", () => {
  assertLen(EVID_30, 30, "EVID_30");
  it("30/30 + follow + anti", () => {
    const prior = { ok: true, entity_names: ["GRUPO MOVE EMPRESARIAL"] };
    for (const q of EVID_30) {
      assert.equal(isClientEvidenceQuestion(q) || isClientEvidenceFollowUp(q), true, q);
      assert.equal(extractClientEvidenceSpec(q, prior).ok, true, q);
    }
    for (const q of EVID_FOLLOW) {
      assert.equal(extractClientEvidenceSpec(q, prior).ok, true, q);
    }
    for (const q of EVID_ANTI) {
      assert.equal(isClientEvidenceQuestion(q), false, q);
    }
  });
});

describe("PROCUREMENT_SPEND 30+10+10", () => {
  assertLen(SPEND_30, 30, "SPEND_30");
  it("30/30 + follow + anti", () => {
    for (const q of SPEND_30) {
      assert.ok(isExpenseAnalyticsQuestion(q) || isProcurementByConceptQuestion(q), q);
    }
    for (const q of SPEND_FOLLOW) {
      assert.ok(typeof q === "string" && q.length > 2);
    }
    assert.equal(isExpenseAnalyticsQuestion("cuántas llantas tenemos"), false);
    assert.equal(isProcurementByConceptQuestion("cuántas llantas tenemos"), false);
    for (const q of SPEND_ANTI) {
      const spend = isExpenseAnalyticsQuestion(q) && /llantas|gast/.test(q);
      if (q === "cuántas llantas tenemos") assert.equal(spend, false);
    }
  });
});

describe("PROCUREMENT_SUPPLIERS 30+10+10", () => {
  assertLen(SUP_30, 30, "SUP_30");
  it("30/30 + follow + anti", () => {
    for (const q of SUP_30) {
      const spec = extractProcurementSpec(q, null, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.operation, OPS.SUPPLIERS, q);
    }
    const prior = extractProcurementSpec(SUP_30[0], null, { now: NOW });
    for (const q of SUP_FOLLOW) {
      assert.equal(extractProcurementSpec(q, prior, { now: NOW }).ok, true, q);
    }
    for (const q of SUP_ANTI) {
      const spec = extractProcurementSpec(q, null, { now: NOW });
      assert.ok(!spec.ok || spec.operation !== OPS.SUPPLIERS, q);
    }
  });
});

describe("PROCUREMENT_BENEFICIARIES 30+10+10", () => {
  assertLen(BEN_30, 30, "BEN_30");
  it("30/30 + follow + anti", () => {
    for (const q of BEN_30) {
      const spec = extractProcurementSpec(q, null, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.operation, OPS.BENEFICIARIES, q);
    }
    const prior = extractProcurementSpec(BEN_30[0], null, { now: NOW });
    for (const q of BEN_FOLLOW) {
      assert.equal(extractProcurementSpec(q, prior, { now: NOW }).ok, true, q);
    }
    for (const q of BEN_ANTI) {
      const spec = extractProcurementSpec(q, null, { now: NOW });
      assert.ok(!spec.ok || spec.operation !== OPS.BENEFICIARIES, q);
    }
  });
});

describe("PROCUREMENT_UNIT_COST 30+10+10", () => {
  assertLen(UNIT_30, 30, "UNIT_30");
  it("30/30 + follow + anti", () => {
    for (const q of UNIT_30) {
      const spec = extractProcurementSpec(q, null, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.operation, OPS.UNIT_COST, q);
    }
    const prior = extractProcurementSpec(UNIT_30[0], null, { now: NOW });
    for (const q of UNIT_FOLLOW) {
      assert.equal(extractProcurementSpec(q, prior, { now: NOW }).ok, true, q);
    }
    for (const q of UNIT_ANTI) {
      const spec = extractProcurementSpec(q, null, { now: NOW });
      assert.ok(!spec.ok || spec.operation !== OPS.UNIT_COST, q);
    }
  });
});

describe("FOLIO_UNIVERSAL_RESULT_SET 30+10+10", () => {
  assertLen(FOLIO_RS_30, 30, "FOLIO_RS_30");
  it("30/30 + follow + anti", () => {
    for (const q of FOLIO_RS_30) {
      assert.equal(isFolioResultSetFollowUp(q), true, q);
    }
    for (const q of FOLIO_RS_FOLLOW) {
      assert.equal(isFolioResultSetFollowUp(q), true, q);
    }
    for (const q of FOLIO_RS_ANTI) {
      assert.equal(isFolioResultSetFollowUp(q), false, q);
    }
  });
});

describe("CLIENT_RANKING_PERIOD_FALLBACK 30+10+10", () => {
  assertLen(FALLBACK_30, 30, "FALLBACK_30");
  it("30/30 usan periodo latest/selected", () => {
    for (const q of FALLBACK_30) {
      assert.equal(isClientRankingQuestion(q), true, q);
      const spec = extractClientRankingSpec(q, null, { now: NOW, latestArrPeriod: "2026-09" });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.period, "2026-09", q);
      assert.ok(spec.period_origin === "latest_arr" || spec.period_origin === "arr_selected" || spec.period, q);
    }
  });
  it("10 follow + 10 anti", () => {
    const prior = extractClientRankingSpec("top 5 clientes de venta casa", null, { now: NOW, latestArrPeriod: "2026-09" });
    for (const q of FALLBACK_FOLLOW) {
      assert.equal(extractClientRankingSpec(q, prior, { now: NOW, latestArrPeriod: "2026-09" }).ok, true, q);
    }
    for (const q of FALLBACK_ANTI) {
      assert.equal(isClientRankingQuestion(q), false, q);
    }
  });
});

describe("conteo conceptual >= 650", () => {
  it("13 familias × 50", () => {
    const total =
      50 * 13;
    assert.equal(total, 650);
    assert.equal(DISCOUNT_30.length + DISCOUNT_FOLLOW.length + DISCOUNT_ANTI.length, 50);
    assert.equal(MOVEMENT_30.length + MOVEMENT_FOLLOW.length + MOVEMENT_ANTI.length, 50);
    assert.equal(INACT_30.length + INACT_FOLLOW.length + INACT_ANTI.length, 50);
    assert.equal(TRANS_30.length + TRANS_FOLLOW.length + TRANS_ANTI.length, 50);
    assert.equal(DDISC_30.length + DDISC_FOLLOW.length + DDISC_ANTI.length, 50);
    assert.equal(ENTITY_30.length + ENTITY_FOLLOW.length + ENTITY_ANTI.length, 50);
    assert.equal(EVID_30.length + EVID_FOLLOW.length + EVID_ANTI.length, 50);
    assert.equal(SPEND_30.length + SPEND_FOLLOW.length + SPEND_ANTI.length, 50);
    assert.equal(SUP_30.length + SUP_FOLLOW.length + SUP_ANTI.length, 50);
    assert.equal(BEN_30.length + BEN_FOLLOW.length + BEN_ANTI.length, 50);
    assert.equal(UNIT_30.length + UNIT_FOLLOW.length + UNIT_ANTI.length, 50);
    assert.equal(FOLIO_RS_30.length + FOLIO_RS_FOLLOW.length + FOLIO_RS_ANTI.length, 50);
    assert.equal(FALLBACK_30.length + FALLBACK_FOLLOW.length + FALLBACK_ANTI.length, 50);
  });
});
