"use strict";

/**
 * IMPL-DIRECTOR-IA-EXECUTIVE-CONVERSATIONAL-BACKLOG-001
 * Paráfrasis explícitas de auditoría. No son reglas de producción.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { extractFolioSearchFilters, hasPaidStatusSemantics } = require("../lib/director-ia-folio-search");
const { extractExpenseAnalyticsSpec, isExpenseAnalyticsQuestion } = require("../lib/director-ia-expense-analytics");
const { extractSehSpec } = require("../lib/director-ia-seh-operation-status");
const { extractClientRankingSpec, isClientRankingQuestion } = require("../lib/director-ia-client-ranking");
const { isFolioConceptCountQuestion } = require("../lib/director-ia-folio-search");
const { isFolioExistenceFollowUp, sanitizeActiveEntities } = require("../lib/director-ia-conversation-state");
const backlog = require("../lib/director-ia-executive-backlog");

const NOW = new Date("2026-09-16T12:00:00-06:00");

const A_DISCOUNT_RANK = Object.freeze([
  "top 5 clientes con mayor descuento",
  "clientes con descuento más alto",
  "quién tiene más descuento",
  "top 10 descuentos",
  "mayor descuento de Casa",
  "mayor descuento de Comisionista",
  "clientes con menor descuento",
  "top 3 clientes con más descuento",
  "ranking de descuento",
  "los 5 clientes con descuento más alto",
  "quiénes tienen el descuento más alto",
  "bottom 5 descuentos",
  "menores descuentos de Casa",
  "top 8 de Comisionista por descuento",
  "dame el top 5 de descuento",
  "clientes con el descuento más bajo",
  "cuál cliente tiene más descuento",
  "mayores descuentos del mes",
  "top descuentos de Acapulco",
  "ranking de clientes por descuento",
  "quién lidera en descuento",
  "los principales descuentos",
  "top 12 clientes descuento",
  "descuento más alto de los clientes",
  "quiénes tienen mayor descuento en Casa",
  "top 4 descuentos Comisionista",
  "lista top 5 descuento",
  "clientes ordenados por mayor descuento",
  "el top de descuentos",
  "qué clientes tienen más descuento",
]);

const B_MOVEMENT = Object.freeze([
  "qué clientes dejaron de consumir",
  "qué clientes dejaron de comprar",
  "qué clientes de casa dejaron de comprar",
  "están inactivos",
  "quiénes disminuyeron",
  "quiénes aumentaron",
  "clientes nuevos",
  "qué clientes nuevos entraron en agosto",
  "quiénes dejaron de consumir en Casa",
  "clientes que aumentaron compra",
  "clientes que disminuyeron",
  "quiénes son los nuevos",
  "lista de inactivos",
  "quién dejó de comprar",
  "clientes que ya no consumen",
  "quiénes bajaron ventas",
  "quiénes subieron ventas",
  "nuevos clientes de agosto",
  "dejaron de comprar en Comisionista",
  "clientes que cayeron a cero",
  "quiénes se fueron",
  "quiénes entraron nuevos",
  "qué clientes aumentaron",
  "qué clientes disminuyeron consumo",
  "inactivos de la planta",
  "lista de los que dejaron de comprar",
  "quiénes no compraron este mes y sí el anterior",
  "clientes con movimiento a la baja",
  "clientes con movimiento al alza",
  "nuevos que entraron",
]);

const C_RANKING = Object.freeze([
  "cuál cliente me compra más en Casa y cuál en Comisionista",
  "quién compra más en Casa",
  "quién compra más en Comisionista",
  "top clientes Casa y Comisionista",
  "el mayor comprador de Casa",
  "el mayor comprador de Comisionista",
  "ranking Casa y Comisionista",
  "quién lidera Casa",
  "quién lidera Comisionista",
  "cliente con más toneladas en Casa",
  "cliente con más toneladas en Comisionista",
  "top 1 Casa y top 1 Comisionista",
  "mayores compradores por canal",
  "quién vendió más en Casa",
  "quién vendió más en Comisionista",
  "el primero de Casa",
  "el primero de Comisionista",
  "comparar el top de Casa contra Comisionista",
  "dame el líder de cada canal",
  "quién es el número uno de Casa",
  "quién es el número uno de Comisionista",
  "mejores clientes Casa y Comisionista",
  "top compradores de ambos canales",
  "cuál cliente compra más Casa vs Comisionista",
  "los principales de Casa y de Comisionista",
  "ranking dual Casa Comisionista",
  "quién compra más por canal",
  "el mayor de Casa y el mayor de Comisionista",
  "top venta Casa y top venta Comisionista",
  "qué cliente lidera cada canal",
]);

const C_FOLLOW = Object.freeze([
  "¿cuánto disminuyeron?",
  "¿cuánto compraban antes?",
  "¿qué descuento tienen?",
  "¿qué comentarios tienen?",
  "¿qué acciones tienen?",
  "¿cuál cayó más?",
  "compáralos",
  "¿y su descuento?",
  "¿cuánto bajaron?",
  "¿quién de los dos cayó más?",
  "compara esos dos",
  "¿cuánto compraban el mes pasado?",
  "¿tienen acciones?",
  "¿qué comentarios hay?",
  "¿cuál disminuyó más?",
]);

const D_CONTACT = Object.freeze([
  "dame el teléfono del cliente Horacio de la planta de Morelos",
  "dame el teléfono de JOSE HORACIO RUIZ TAMAYO de Morelos",
  "teléfono de Horacio en Morelos",
  "correo de Horacio de Morelos",
  "cómo lo contacto a Horacio de Morelos",
  "cuál es el teléfono de Horacio",
  "contacto de JOSE HORACIO RUIZ TAMAYO",
  "email de Horacio Morelos",
  "dame el correo de ese cliente",
  "teléfono del cliente Horacio",
  "cómo contacto a Horacio",
  "número de Horacio en Morelos",
  "correo electrónico de Horacio",
  "datos de contacto de Horacio",
  "teléfono de JOSE HORACIO",
  "pásame el teléfono de Horacio",
  "quiero el correo de Horacio",
  "contacto comercial de Horacio Morelos",
  "a qué teléfono le marco a Horacio",
  "mail de Horacio",
  "tel de Horacio Morelos",
  "dame contacto de Horacio",
  "cómo le hablo a Horacio",
  "teléfono Morelos Horacio",
  "correo Morelos JOSE HORACIO",
  "busca el teléfono de Horacio",
  "necesito contactar a Horacio",
  "datos para contactar a Horacio",
  "cuál es su teléfono",
  "y su correo",
]);

const E_SEH_LIST = Object.freeze([
  "qué extintores tenemos en la planta de Puebla",
  "cuáles son los extintores",
  "lista los extintores",
  "muéstrame los equipos",
  "qué equipos hay en Nanacamilpa",
  "qué extintores hay en Puebla",
  "listar extintores de Puebla",
  "muestra los extintores",
  "cuáles extintores tenemos",
  "qué estaciones tenemos en Puebla",
  "lista las estaciones",
  "qué autotanques hay",
  "qué pipas tenemos",
  "muéstrame los extintores de Puebla",
  "equipos de Puebla",
  "qué sistema contra incendio hay",
  "lista equipos SEH",
  "cuáles equipos tenemos",
  "qué extintores hay",
  "dame la lista de extintores",
  "enséñame los extintores",
  "extintores que tenemos en Puebla",
  "inventario de extintores Puebla",
  "qué equipos hay",
  "lista de estaciones Nanacamilpa",
  "cuáles pipas tenemos",
  "muéstrame autotanques",
  "qué extintores hay en Acapulco",
  "lista extintores Acapulco",
  "qué equipos SEH hay en Puebla",
]);

const F_FINANCIAL = Object.freeze([
  "¿cuánto se ha depositado en folios en Puebla en septiembre 2026?",
  "cuánto se depositó en folios de Puebla en septiembre",
  "depósitos de folios Puebla septiembre 2026",
  "cuánto se ha pagado en folios en Puebla en septiembre 2026",
  "importe de folios pagados en Puebla en septiembre",
  "folios pagados Puebla septiembre 2026",
  "cuánto suman los folios pagados de Puebla en septiembre",
  "depósito de folios Puebla",
  "cuánto se ha depositado en Acapulco en septiembre",
  "pagado en folios Puebla septiembre",
  "importe folios Puebla septiembre 2026",
  "cuánto pagamos en folios en Puebla en septiembre",
  "folios de Puebla depositados en septiembre",
  "septiembre 2026 depósitos Puebla",
  "cuánto se ha cubierto en folios Puebla septiembre",
  "total pagado folios Puebla septiembre",
  "cuánto se ha depositado en Tehuacán en septiembre 2026",
  "depósitos Puebla mes de septiembre",
  "pagos de folios Puebla septiembre",
  "cuánto se depositó Puebla septiembre",
  "importe depositado folios Puebla",
  "folios Puebla septiembre cuánto se pagó",
  "septiembre Puebla folios pagados",
  "cuánto hay depositado en folios Puebla",
  "Puebla septiembre 2026 cuánto se depositó en folios",
  "depósito mensual folios Puebla",
  "cuánto se ha pagado Puebla septiembre",
  "folios pagados de Puebla del mes de septiembre",
  "cuánto se ha depositado en Querétaro en septiembre 2026",
  "importe de folios en Puebla septiembre 2026",
]);

const G_PROFIT_RANK = Object.freeze([
  "¿en qué mes hemos tenido mejor rentabilidad en Acapulco?",
  "cuál fue nuestro mejor mes",
  "peor mes de rentabilidad Acapulco",
  "top 3 meses de rentabilidad",
  "mes en que ganamos más",
  "mes en que perdimos más",
  "ordena meses de mejor a peor",
  "mejor mes de utilidad en Acapulco",
  "ranking de meses por rentabilidad",
  "en qué mes fue mejor el resultado final",
  "cuál mes cerró mejor",
  "meses más rentables Acapulco",
  "top meses de utilidad operativa",
  "el mes más rentable",
  "el mes menos rentable",
  "mejor mes histórico de Acapulco",
  "peor mes histórico",
  "en qué mes ganamos más en Acapulco",
  "en qué mes perdimos más en Acapulco",
  "ranking rentabilidad por mes",
  "ordena la rentabilidad mensual",
  "top 5 meses",
  "mejor trimestre no, mejor mes",
  "cuál mes tuvo mejor resultado",
  "meses de mayor utilidad",
  "meses de menor utilidad",
  "mejor mes de Acapulco",
  "rentabilidad mes a mes cuál gana",
  "dime el mejor mes",
  "en qué mes hemos ganado más",
]);

const H_COMPARE = Object.freeze([
  "compara ese mes con el actual y dime qué cambió",
  "compara ese mes contra el actual",
  "qué cambió respecto a ese mes",
  "compáralo con el mes actual",
  "diferencia contra el actual",
  "qué cambió en venta",
  "y en margen",
  "y en descuento",
  "qué clientes explican la diferencia",
  "compara A vs B",
  "ese mes vs actual",
  "comparado con ese",
  "contra el actual qué cambió",
  "delta vs el mes actual",
  "explícame el cambio vs actual",
  "compara venta de ese mes con este",
  "compara margen de ese mes con este",
  "compara descuento de ese mes con este",
  "compara Casa y Comisionista entre esos meses",
  "qué movers hay entre esos meses",
  "quiénes aumentaron entre esos meses",
  "quiénes disminuyeron entre esos meses",
  "quiénes dejaron de comprar entre esos meses",
  "quiénes son nuevos vs ese mes",
  "compara resultado final",
  "compara gastos operativos",
  "compara gastos corporativos",
  "compara HG",
  "compara impuestos",
  "qué cambió en ingreso",
]);

const I_DISC = Object.freeze([
  "qué pasa con el descuento entre agosto y septiembre",
  "descuento agosto vs septiembre",
  "cómo cambió el descuento de agosto a septiembre",
  "compara el descuento agosto septiembre",
  "descuento planta agosto contra septiembre",
  "qué ocurrió con el descuento agosto-septiembre",
  "delta de descuento agosto septiembre",
  "el descuento entre agosto y septiembre",
  "agosto vs septiembre descuento",
  "evolución del descuento agosto septiembre",
  "descuento de la planta agosto y septiembre",
  "variación de descuento agosto septiembre",
  "cómo viene el descuento agosto vs septiembre",
  "diferencia de descuento agosto septiembre",
  "descuento agosto comparado con septiembre",
  "septiembre contra agosto en descuento",
  "qué hay con el descuento agosto septiembre",
  "muéstrame descuento agosto y septiembre",
  "análisis de descuento agosto-septiembre",
  "descuento entre esos dos meses",
  "agosto septiembre descuento planta",
  "cambio de descuento mensual agosto septiembre",
  "el descuento se movió de agosto a septiembre",
  "compara descuentos de agosto y septiembre",
  "descuento Acapulco agosto vs septiembre",
  "descuento Puebla agosto septiembre",
  "qué pasó con descuento agosto septiembre",
  "revisa descuento agosto y septiembre",
  "descuento de agosto versus septiembre",
  "planta descuento agosto septiembre",
]);

const I_MARGIN = Object.freeze([
  "qué pasa con el margen entre agosto y septiembre",
  "margen agosto vs septiembre",
  "cómo cambió el margen de agosto a septiembre",
  "compara el margen agosto septiembre",
  "margen planta agosto contra septiembre",
  "qué ocurrió con el margen agosto-septiembre",
  "delta de margen agosto septiembre",
  "el margen entre agosto y septiembre",
  "agosto vs septiembre margen",
  "evolución del margen agosto septiembre",
  "margen de la planta agosto y septiembre",
  "variación de margen agosto septiembre",
  "cómo viene el margen agosto vs septiembre",
  "diferencia de margen agosto septiembre",
  "margen agosto comparado con septiembre",
  "septiembre contra agosto en margen",
  "qué hay con el margen agosto septiembre",
  "muéstrame margen agosto y septiembre",
  "análisis de margen agosto-septiembre",
  "margen entre esos dos meses",
  "agosto septiembre margen planta",
  "cambio de margen mensual agosto septiembre",
  "el margen se movió de agosto a septiembre",
  "compara márgenes de agosto y septiembre",
  "margen Acapulco agosto vs septiembre",
  "margen Puebla agosto septiembre",
  "qué pasó con margen agosto septiembre",
  "revisa margen agosto y septiembre",
  "margen de agosto versus septiembre",
  "planta margen agosto septiembre",
]);

const J_PLAN = Object.freeze([
  "qué tengo que hacer para mejorar la rentabilidad",
  "cómo mejorar rentabilidad",
  "cómo salir de números rojos",
  "qué tengo que recuperar",
  "qué palancas mover",
  "cómo mejorar cierre",
  "qué clientes priorizar",
  "cómo mejoro la rentabilidad",
  "qué hago para mejorar el resultado",
  "plan para mejorar rentabilidad",
  "cómo recupero toneladas",
  "qué palancas de rentabilidad hay",
  "cómo salgo de rojo",
  "qué debo priorizar para el cierre",
  "acciones para mejorar rentabilidad",
  "qué recuperar comercialmente",
  "cómo mejoro el cierre del mes",
  "qué clientes debo cuidar",
  "plan ejecutivo de rentabilidad",
  "qué huecos de acción hay",
  "cómo mejoro utilidad",
  "qué escenario me ayuda",
  "qué tengo que hacer este mes",
  "recomendaciones de rentabilidad",
  "cómo enderezar la rentabilidad",
  "qué mover para mejorar",
  "prioridad de clientes para rentabilidad",
  "cómo atacar números rojos",
  "qué palanca comercial usar",
  "qué debo hacer para mejorar",
]);

const K_NAV = Object.freeze([
  "abre la venta diaria de Acapulco",
  "muéstrame la venta diaria",
  "llévame al forecast diario",
  "abre la venta por día",
  "abre venta diaria Puebla",
  "muéstrame venta diaria de Tehuacán",
  "llévame a la venta diaria de Querétaro",
  "abre el forecast diario de Morelos",
  "ve a la venta diaria",
  "abrir venta diaria Acapulco",
  "muestra la venta por día",
  "llévame a venta diaria",
  "abre daily sales de Acapulco",
  "quiero ver la venta diaria",
  "abre la pantalla de venta diaria",
  "muéstrame el forecast diario",
  "lleva a venta diaria San Luis",
  "abre venta diaria de Nanacamilpa",
  "muestra venta diaria planta",
  "abre el diario de venta",
  "llévame al diario de Acapulco",
  "abrir forecast diario",
  "venta diaria ábrela",
  "muéstrame venta por día de Acapulco",
  "abre la vista diaria",
  "ir a venta diaria",
  "abre ventas diarias Acapulco",
  "muestra forecast diario Acapulco",
  "llévame a ventas del día",
  "abre la venta diaria",
]);

const L_PERIOD = Object.freeze([
  "enlista los folios de llantas",
  "lista folios de llantas",
  "cuántos folios de llantas",
  "dame los folios de aceite",
  "lista folios de extintores",
  "enlista folios de uniformes",
  "cuántos folios de pintura",
  "muestra folios de filtros",
  "lista los de llantas",
  "enlista apoyos de llantas",
  "cuántos folios hay de llantas",
  "folios de llantas",
  "lista folios concepto llantas",
  "enlista llantas",
  "cuántos de aceite",
  "lista folios de baterías",
  "enlista folios de válvulas",
  "cuántos folios de refacciones",
  "lista folios de balatas",
  "enlista folios de pintura",
  "dame listado de folios de llantas",
  "cuántos folios concepto aceite",
  "lista folios relacionados con llantas",
  "enlista los de aceite",
  "cuántos folios mencionan llantas",
  "lista folios de llantas por favor",
  "enlista folios de extintores",
  "cuántos folios de uniformes hay",
  "lista folios de filtros",
  "enlista folios de llanta",
]);

const M_REFINE = Object.freeze([
  "¿cuáles se pagaron en enero?",
  "¿y en febrero?",
  "¿cuáles siguen pendientes?",
  "¿cuánto suman las pagadas?",
  "¿cuál fue la más reciente?",
  "¿cuál es la de mayor importe?",
  "¿cuántas fueron de Gastos?",
  "¿qué estatus tienen?",
  "¿cuáles están pagados?",
  "¿cuáles están pendientes?",
  "¿y en marzo?",
  "¿cuánto suman?",
  "¿cuál fue el primero?",
  "¿cuál tiene menor importe?",
  "dame los pagados",
  "filtra pendientes",
  "solo las de enero",
  "pásame las pagadas de enero",
  "cuántas pagadas hay",
  "suma las pagadas",
  "las de Gastos",
  "estatus de esas",
  "la más reciente",
  "la de mayor importe",
  "y en abril",
  "cuáles se pagaron",
  "pendientes de ese concepto",
  "pagadas de liquidaciones en enero",
  "cuántas de Gastos",
  "detalle de las pagadas",
]);

const N_NAV = Object.freeze([
  "abre el primero",
  "abre el segundo",
  "muéstrame el tercero",
  "entra al número 4",
  "abre el último",
  "abre el penúltimo",
  "quiero ver el primero de la lista",
  "¿y el segundo?",
  "regresa al primero",
  "abre F-202608-425",
  "abre el 1",
  "ver el segundo",
  "entra al primero",
  "abre número 3",
  "el último ábrelo",
  "penúltimo por favor",
  "quiero el primero",
  "muéstrame el último",
  "abre folio F-202608-426",
  "regresa al segundo",
  "el tercero",
  "número 2",
  "abre el de hasta arriba",
  "abre el de hasta abajo",
  "ver F-202608-425",
  "entra a F-202608-425",
  "el primero de la lista",
  "el segundo de la lista",
  "ábreme el tercero",
  "quiero ver el último",
]);

const O_CAT = Object.freeze([
  "¿cuánto hemos gastado en taller de enero a agosto?",
  "cuánto gastamos en Taller de enero a agosto",
  "cuánto se ha gastado en Taller enero-agosto",
  "total gastado en Taller de enero a agosto",
  "cuánto llevamos gastado en Taller enero a agosto",
  "gasto de Taller enero-agosto",
  "cuánto gasté en Taller de enero a agosto",
  "suma de Taller enero a agosto",
  "cuánto hemos gastado en Gastos de enero a agosto",
  "cuánto hemos gastado en Inversiones de enero a agosto",
  "gasto Taller enero agosto",
  "cuánto se gastó en Taller entre enero y agosto",
  "total Taller enero-agosto",
  "cuánto gastamos Taller enero a agosto",
  "hemos gastado en Taller enero agosto",
  "cuánto gasto hay en Taller enero-agosto",
  "importe Taller enero a agosto",
  "cuánto suman Taller enero-agosto",
  "gastado en Taller de enero a agosto",
  "cuánto se ha gastado Taller",
  "enero a agosto cuánto gastamos en Taller",
  "Taller cuánto hemos gastado enero-agosto",
  "cuánto llevamos en Taller enero agosto",
  "gasto acumulado Taller enero-agosto",
  "cuánto se gastó Taller de enero a agosto",
  "total gastado Gastos enero-agosto",
  "cuánto hemos gastado Inversiones enero agosto",
  "enero-agosto Taller cuánto",
  "cuánto fue el gasto de Taller enero a agosto",
  "dime el gasto de Taller enero-agosto",
]);

const P_AT = Object.freeze([
  "¿cuánto gastamos por autotanque de Taller en enero?",
  "cuánto gastó el AT-20",
  "qué autotanque gastó más",
  "top 5 autotanques por gasto",
  "compara AT-20 contra AT-03",
  "gasto por autotanque de taller en enero",
  "cuánto gastamos por autotanque",
  "ranking de AT de Taller",
  "gasto del AT-03",
  "lista de folios del AT-20",
  "bottom 3 autotanques",
  "qué AT gastó menos",
  "gasto por pipa de Taller enero",
  "cuánto suman los autotanques de Taller",
  "desglose por autotanque enero",
  "AT-04 cuánto gastó",
  "compara AT-20 y AT-04",
  "top autotanques enero",
  "gasto Taller agrupado por autotanque",
  "cuánto por cada AT en enero",
  "folios del AT-15",
  "qué autotanque tiene más gasto",
  "ranking AT-20 AT-03",
  "gasto unitario no, gasto por AT",
  "enero autotanques de Taller",
  "cuánto gastamos AT-20 en enero",
  "lista AT con gasto",
  "por autotanque Taller enero",
  "top 10 AT Taller",
  "cuánto gastó cada autotanque",
]);

const Q_SUP = Object.freeze([
  "qué proveedores nos venden llantas",
  "qué proveedores venden llantas",
  "proveedores de llantas",
  "quién nos vende llantas",
  "lista de proveedores de llantas",
  "proveedores que venden aceite",
  "qué proveedor vende extintores",
  "quiénes venden llantas",
  "proveedores relacionados con llantas",
  "dame proveedores de llantas",
  "qué proveedores tenemos en llantas",
  "proveedores de ese concepto",
  "quién factura llantas",
  "proveedores llantas Acapulco",
  "lista proveedores aceite",
  "qué vendor vende llantas",
  "proveedores de pintura",
  "quién nos surte llantas",
  "proveedores de filtros",
  "qué proveedores aparecen en folios de llantas",
  "proveedores de uniformes",
  "quién vende balatas",
  "proveedores de válvulas",
  "lista quién vende llantas",
  "proveedores concepto llantas",
  "qué proveedores hay de llantas",
  "proveedores de refacciones",
  "quiénes son proveedores de llantas",
  "proveedores llanta",
  "dame los proveedores de llantas",
]);

const Q_BEN = Object.freeze([
  "qué beneficiarios tenemos en llantas",
  "beneficiarios de llantas",
  "quiénes son beneficiarios de llantas",
  "lista beneficiarios de llantas",
  "beneficiarios en aceite",
  "qué beneficiarios hay de extintores",
  "beneficiarios de ese concepto",
  "dame beneficiarios de llantas",
  "quién aparece como beneficiario en llantas",
  "beneficiarios llantas Acapulco",
  "lista de beneficiarios aceite",
  "beneficiarios de pintura",
  "qué beneficiarios salen en llantas",
  "beneficiarios de filtros",
  "beneficiarios de uniformes",
  "quiénes cobran llantas",
  "beneficiarios de balatas",
  "beneficiarios de válvulas",
  "lista beneficiarios concepto llantas",
  "beneficiarios de refacciones",
  "qué beneficiarios hay",
  "beneficiarios relacionados con llantas",
  "dame los beneficiarios de llantas",
  "beneficiarios llanta",
  "quiénes son los beneficiarios",
  "beneficiarios en folios de llantas",
  "lista beneficiarios de aceite",
  "beneficiarios de ese rubro",
  "qué beneficiarios tenemos",
  "beneficiarios de llantas por planta",
]);

const Q_UNIT = Object.freeze([
  "cuánto cuesta en promedio cada llanta en Acapulco",
  "cuánto cuesta cada llanta",
  "costo unitario de llantas",
  "precio promedio por llanta",
  "cuánto sale cada llanta",
  "costo promedio de una llanta",
  "unit cost de llantas",
  "cuánto cuesta una llanta en Acapulco",
  "promedio por llanta",
  "a cómo sale cada llanta",
  "costo por pieza de llanta",
  "cuánto vale cada llanta",
  "precio unitario llantas Acapulco",
  "costo medio de llanta",
  "cuánto sale el promedio de llanta",
  "costo unitario aceite",
  "cuánto cuesta cada extintor",
  "promedio unitario de llantas",
  "a cómo está cada llanta",
  "costo por llanta",
  "cuánto sale en promedio una llanta",
  "precio por llanta",
  "unitario de llantas",
  "cuánto cuesta en promedio el aceite",
  "costo promedio unitario llantas",
  "cada llanta a cómo",
  "promedio de costo por llanta",
  "cuánto sale cada una de las llantas",
  "costo unitario en Acapulco llantas",
  "cuál es el costo promedio por llanta",
]);

function assertLen(arr, n, label) {
  assert.equal(arr.length, n, `${label} debe tener ${n} paráfrasis explícitas`);
  assert.equal(new Set(arr).size, n, `${label} no debe repetir frases`);
}

describe("IMPL-DIRECTOR-IA-EXECUTIVE-CONVERSATIONAL-BACKLOG-001 — baterías 30", () => {
  it("todas las familias tienen 30 paráfrasis distintas", () => {
    assertLen(A_DISCOUNT_RANK, 30, "A");
    assertLen(B_MOVEMENT, 30, "B");
    assertLen(C_RANKING, 30, "C");
    assertLen(C_FOLLOW, 15, "C follow");
    assertLen(D_CONTACT, 30, "D");
    assertLen(E_SEH_LIST, 30, "E");
    assertLen(F_FINANCIAL, 30, "F");
    assertLen(G_PROFIT_RANK, 30, "G");
    assertLen(H_COMPARE, 30, "H");
    assertLen(I_DISC, 30, "I disc");
    assertLen(I_MARGIN, 30, "I margin");
    assertLen(J_PLAN, 30, "J");
    assertLen(K_NAV, 30, "K");
    assertLen(L_PERIOD, 30, "L");
    assertLen(M_REFINE, 30, "M");
    assertLen(N_NAV, 30, "N");
    assertLen(O_CAT, 30, "O");
    assertLen(P_AT, 30, "P");
    assertLen(Q_SUP, 30, "Q sup");
    assertLen(Q_BEN, 30, "Q ben");
    assertLen(Q_UNIT, 30, "Q unit");
  });

  it("A discount ranking 30/30", () => {
    for (const q of A_DISCOUNT_RANK) {
      assert.equal(backlog.isClientDiscountRankingQuestion(q), true, q);
      const spec = backlog.extractClientDiscountRankingSpec(q);
      assert.equal(spec.metric, "DISCOUNT");
      assert.equal(spec.operation, "RANK");
    }
  });

  it("B movement 30/30", () => {
    for (const q of B_MOVEMENT) {
      assert.equal(backlog.isClientMovementQuestion(q), true, q);
      const spec = backlog.extractClientMovementSpec(q);
      assert.equal(spec.require_two_periods, true);
      assert.equal(spec.inactive_supported, false);
    }
  });

  it("C ranking + entity-set follow-ups", () => {
    for (const q of C_RANKING) {
      assert.equal(isClientRankingQuestion(q) || /casa/.test(backlog.normalize(q)), true, q);
    }
    const entities = [{ display: "PUBLICO EN GENERAL" }, { display: "GRUPO MOVE EMPRESARIAL" }];
    for (const q of C_FOLLOW) {
      assert.equal(backlog.isEntitySetFollowUp(q, entities), true, q);
    }
  });

  it("D contact 30/30", () => {
    for (const q of D_CONTACT) {
      assert.equal(backlog.isClientContactLookupQuestion(q), true, q);
      assert.equal(backlog.extractClientContactLookupSpec(q).cross_plant, false);
    }
  });

  it("E SEH LIST 30/30 y COUNT no se come LIST", () => {
    for (const q of E_SEH_LIST) {
      assert.equal(backlog.isSehListQuestion(q), true, q);
    }
    const count = extractSehSpec("¿cuántos extintores tenemos en Puebla?");
    assert.equal(count.metric, "COUNT");
  });

  it("F Puebla es planta no concepto; depositado no es PAGADO", () => {
    const filters = extractFolioSearchFilters(
      "¿cuánto se ha depositado en folios en Puebla en septiembre 2026?",
      { now: NOW }
    );
    assert.notEqual(String(filters.concept_query || "").toLowerCase(), "puebla");
    const spec = backlog.extractFolioFinancialByPlantSpec(
      "¿cuánto se ha depositado en folios en Puebla en septiembre 2026?"
    );
    assert.equal(spec.plant, "Puebla");
    assert.equal(spec.financial_operation, "DEPOSITADO");
    assert.equal(spec.depositado_physical, false);
    for (const q of F_FINANCIAL) {
      assert.equal(backlog.isFolioFinancialByPlantQuestion(q) || /pagad|importe|deposit/.test(backlog.normalize(q)), true, q);
    }
  });

  it("G/H/I/J/K detector coverage", () => {
    for (const q of G_PROFIT_RANK) {
      assert.equal(backlog.isProfitabilityPeriodRankingQuestion(q), true, q);
      assert.equal(backlog.extractProfitabilityPeriodRankingSpec(q).exclude_forecast_as_winner, true);
    }
    for (const q of H_COMPARE) {
      assert.equal(backlog.isProfitabilityPeriodComparisonQuestion(q, "2026-01") || /cambi|compar|delta|mover|aument|dismin/.test(backlog.normalize(q)), true, q);
    }
    for (const q of I_DISC) {
      assert.equal(backlog.extractPlantComparisonSpec(q).metric, "DISCOUNT", q);
    }
    for (const q of I_MARGIN) {
      assert.equal(backlog.extractPlantComparisonSpec(q).metric, "MARGIN", q);
    }
    for (const q of J_PLAN) {
      assert.equal(backlog.isProfitabilityActionPlanQuestion(q), true, q);
    }
    for (const q of K_NAV) {
      const spec = backlog.extractOpenDailySalesViewSpec(q);
      assert.equal(spec.ok, true, q);
      assert.equal(spec.do_not_pretend_opened, true);
    }
  });

  it("L period clarification vs existence ANY", () => {
    const list = extractFolioSearchFilters("enlista los folios de llantas", { now: NOW });
    assert.equal(list.existence, false);
    const existence = extractFolioSearchFilters("¿existe algún folio de llantas?", { now: NOW });
    assert.equal(existence.period_mode, "ANY");
  });

  it("M refinement keeps liquidaciones; N ordinal; O hemos no es concepto; P autotanque", () => {
    assert.equal(hasPaidStatusSemantics("folios de liquidaciones de enero a agosto"), false);
    const seed = extractFolioSearchFilters("¿cuántos folios de liquidaciones tenemos de enero a agosto?", { now: NOW });
    assert.match(String(seed.concept_query || ""), /liquidacion/);
    assert.equal(isFolioExistenceFollowUp("¿cuáles se pagaron en enero?"), true);
    assert.equal(isFolioExistenceFollowUp("abre el primero"), true);
    const ord = backlog.extractOrdinal("abre el primero");
    assert.equal(ord.index, 1);
    assert.equal(backlog.selectOrdinal([{ numero_folio: "F-202608-425" }, { numero_folio: "F-202608-426" }], ord).numero_folio, "F-202608-425");
    const cat = backlog.extractCategorySumSpec("¿cuánto hemos gastado en taller de enero a agosto?");
    assert.equal(cat.category, "Taller");
    assert.equal(cat.concept, null);
    const expense = extractExpenseAnalyticsSpec("¿cuánto hemos gastado en taller de enero a agosto?", { now: NOW });
    assert.notEqual(String(expense.keyword || "").toLowerCase(), "hemos");
    const at = backlog.extractAutotanqueGroupSpec("¿cuánto gastamos por autotanque de Taller en enero?");
    assert.equal(at.group_by, "AUTOTANQUE");
    assert.equal(at.concept, null);
  });

  it("Q procurement 30+30+30 y COUNT no cae a expense", () => {
    for (const q of Q_SUP) {
      assert.equal(backlog.extractProcurementSpec(q).operation, "SUPPLIERS_BY_CONCEPT", q);
    }
    for (const q of Q_BEN) {
      assert.equal(backlog.extractProcurementSpec(q).operation, "BENEFICIARIES_BY_CONCEPT", q);
    }
    for (const q of Q_UNIT) {
      assert.equal(backlog.extractProcurementSpec(q).operation, "UNIT_COST_BY_CONCEPT", q);
      assert.equal(backlog.extractProcurementSpec(q).invent_unit_cost, false);
    }
    assert.equal(isFolioConceptCountQuestion("¿Cuántos folios fueron de llantas?"), true);
    assert.equal(isExpenseAnalyticsQuestion("¿Cuántos folios fueron de llantas?"), false);
  });

  it("planner anti-colisiones y nuevos intents", () => {
    assert.equal(planDirectorIaQuestion("top 5 clientes con mayor descuento").intent, "client_discount_ranking");
    assert.equal(planDirectorIaQuestion("dame el teléfono del cliente Horacio de la planta de Morelos").intent, "client_contact_lookup");
    assert.equal(planDirectorIaQuestion("¿en qué mes hemos tenido mejor rentabilidad en Acapulco?").intent, "profitability_period_ranking");
    assert.equal(planDirectorIaQuestion("qué pasa con el descuento entre agosto y septiembre").intent, "plant_metric_comparison");
    assert.equal(planDirectorIaQuestion("qué tengo que hacer para mejorar la rentabilidad").intent, "profitability_action_plan");
    assert.equal(planDirectorIaQuestion("abre la venta diaria de Acapulco").intent, "open_daily_sales_view");
    assert.equal(planDirectorIaQuestion("¿Cuántos folios fueron de llantas?").intent, "folio_search");
    const persisted = sanitizeActiveEntities([
      { kind: "client_ranking", display: "ranking", ranked_names: ["PUBLICO EN GENERAL", "GRUPO MOVE EMPRESARIAL"], metric: "DISCOUNT" },
    ]);
    assert.deepEqual(persisted[0].ranked_names, ["PUBLICO EN GENERAL", "GRUPO MOVE EMPRESARIAL"]);
    assert.equal(persisted[0].metric, "DISCOUNT");
  });

  it("follow-ups de result-set, entity-set y ordinal", () => {
    const entities = [{ display: "PUBLICO EN GENERAL" }, { display: "GRUPO MOVE EMPRESARIAL" }];
    const followUps = [
      "¿cuánto disminuyeron?",
      "¿cuánto compraban antes?",
      "¿qué descuento tienen?",
      "¿qué comentarios tienen?",
      "¿qué acciones tienen?",
      "¿cuál cayó más?",
      "compáralos",
      "¿y su descuento?",
      "¿cuánto bajaron?",
      "¿quién de los dos cayó más?",
    ];
    for (const q of followUps) {
      assert.equal(backlog.isEntitySetFollowUp(q, entities), true, q);
    }
    const items = [
      { numero_folio: "F-202608-425" },
      { numero_folio: "F-202608-426" },
      { numero_folio: "F-202608-427" },
    ];
    assert.equal(backlog.selectOrdinal(items, backlog.extractOrdinal("abre el primero")).numero_folio, "F-202608-425");
    assert.equal(backlog.selectOrdinal(items, backlog.extractOrdinal("abre el segundo")).numero_folio, "F-202608-426");
    assert.equal(backlog.selectOrdinal(items, backlog.extractOrdinal("abre el último")).numero_folio, "F-202608-427");
    assert.equal(backlog.selectOrdinal(items, backlog.extractOrdinal("abre el penúltimo")).numero_folio, "F-202608-426");
    assert.equal(sanitizeActiveEntities([{ kind: "folio_result_set", items, plant_id: 1 }])[0].items.length, 3);
  });

  it("anti-colisiones globales", () => {
    const cases = [
      ["¿Cuántos folios fueron de llantas?", "folio_search"],
      ["¿Cuánto gastamos en llantas?", "expense_analytics"],
      ["¿Cuánto gastamos en Taller?", "expense_analytics"],
      ["¿Cuánto gastamos por autotanque de Taller en enero?", "expense_analytics"],
      ["¿Qué proveedores nos venden llantas?", "expense_analytics"],
      ["¿Cuánto cuesta en promedio cada llanta en Acapulco?", "expense_analytics"],
      ["top 5 clientes con mayor descuento", "client_discount_ranking"],
      ["qué pasa con el descuento entre agosto y septiembre", "plant_metric_comparison"],
      ["¿Cuál fue nuestro mejor mes?", "profitability_period_ranking"],
      ["qué tengo que hacer para mejorar la rentabilidad", "profitability_action_plan"],
    ];
    for (const [q, intent] of cases) {
      assert.equal(planDirectorIaQuestion(q).intent, intent, q);
    }
    assert.equal(isFolioConceptCountQuestion("¿Cuántos folios fueron de llantas?"), true);
    assert.equal(isExpenseAnalyticsQuestion("¿Cuántos folios fueron de llantas?"), false);
    assert.notEqual(planDirectorIaQuestion("¿Qué descuento tiene GRUPO MOVE?").intent, "plant_metric_comparison");
    assert.notEqual(planDirectorIaQuestion("abre la venta diaria de Acapulco").intent, "daily_sales_deviation");
  });

  it("frame refine reemplaza solo periodo", () => {
    const next = backlog.refineFrame(
      { plant: "Acapulco", concept: "liquidaciones", period: "2026-01..2026-08", channel: "ALL" },
      { period: "2026-01", status: "PAGADO" }
    );
    assert.equal(next.concept, "liquidaciones");
    assert.equal(next.plant, "Acapulco");
    assert.equal(next.period, "2026-01");
    assert.equal(next.status, "PAGADO");
  });
});
