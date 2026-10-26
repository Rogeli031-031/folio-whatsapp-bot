"use strict";

const METRICS = [
  ["venta", "venta", "TON"],
  ["margen", "margen", "MXN_PER_KG"],
  ["com_desc", "comisiones y descuentos", "MXN_PER_KG"],
  ["impuestos", "impuestos", "MXN"],
  ["hg_financial", "hg financiero", "MXN_PER_KG"],
  ["ingreso", "ingreso", "MXN"],
  ["operativos", "gastos operativos", "MXN"],
  ["corporativos", "gastos corporativos", "MXN"],
  ["gasto", "gasto total", "MXN"],
  ["util_oper", "utilidad operativa", "MXN"],
  ["resultado_final", "resultado final", "MXN"],
  ["inversiones", "inversiones", "MXN"],
];

const ACTUAL_TEMPLATES = [
  ["cual es {m} de octubre", "MONTH"],
  ["cuanto es {m} de octubre", "MONTH"],
  ["como va {m} en octubre", "MONTH"],
  ["dame {m} de octubre", "MONTH"],
  ["que llevamos de {m} este mes", "CUTOFF"],
  ["{m} al corte", "CUTOFF"],
  ["{m} hasta hoy", "CUTOFF"],
  ["en cuanto esta {m} de octubre", "MONTH"],
  ["como estamos en {m}", "CUTOFF"],
  ["cual es {m} acumulado de octubre", "MONTH"],
  ["revisa {m} de octubre", "MONTH"],
  ["consulta {m} de octubre", "MONTH"],
  ["muestrame {m} de octubre", "MONTH"],
  ["necesito {m} de octubre", "MONTH"],
  ["{m} de esta semana", "CURRENT_WEEK"],
  ["{m} de ayer", "DAY"],
  ["{m} del 10 de octubre", "DAY"],
  ["{m} del 1 al 15 de octubre", "RANGE"],
  ["cuanto acumulamos de {m}", "CUTOFF"],
  ["que tenemos de {m} en octubre", "MONTH"],
  ["dime {m} de octubre", "MONTH"],
  ["{m} real de octubre", "MONTH"],
  ["el dato de {m} en octubre", "MONTH"],
  ["como viene {m} este mes", "CUTOFF"],
  ["{m} hasta el corte", "CUTOFF"],
  ["cual es el acumulado de {m}", "CUTOFF"],
  ["que marca {m} en octubre", "MONTH"],
  ["ensename {m} de octubre", "MONTH"],
  ["quiero saber {m} de octubre", "MONTH"],
  ["{m} de la semana pasada", "PREVIOUS_WEEK"],
  ["{m} del 20/10/2026", "DAY"],
  ["{m} del 2026-10-20", "DAY"],
  ["como va {m} al corte", "CUTOFF"],
  ["{m} de octubre por favor", "MONTH"],
  ["reporta {m} de octubre", "MONTH"],
  ["{m} vigente de octubre", "MONTH"],
  ["situacion de {m} en octubre", "MONTH"],
  ["lectura de {m} en octubre", "MONTH"],
  ["{m} de este mes", "CUTOFF"],
  ["cual es {m} hoy", "DAY"],
];

const FORECAST_TEMPLATES = [
  ["cual es el forecast de {m} en octubre", "MONTH"],
  ["cual es {m} proyectado de octubre", "MONTH"],
  ["cuanto esperamos de {m} en octubre", "MONTH"],
  ["como esperamos cerrar {m} en octubre", "MONTH"],
  ["cual es la proyeccion de {m} en octubre", "MONTH"],
  ["en cuanto proyectamos {m} de octubre", "MONTH"],
  ["como va a cerrar {m} en octubre", "MONTH"],
  ["cual es el cierre esperado de {m}", "CUTOFF"],
  ["que pronostico tenemos de {m} en octubre", "MONTH"],
  ["dame el forecast de {m} en octubre", "MONTH"],
  ["dame la proyeccion de {m} en octubre", "MONTH"],
  ["que dice arr sobre {m} en octubre", "MONTH"],
  ["cual es el arr de {m} en octubre", "MONTH"],
  ["a cuanto esperamos llegar en {m}", "CUTOFF"],
  ["que esperamos cerrar en {m} en octubre", "MONTH"],
  ["en cuanto va a terminar {m} en octubre", "MONTH"],
  ["como terminara el mes en {m}", "CUTOFF"],
  ["que valor estimado tiene {m} en octubre", "MONTH"],
  ["cual es {m} estimado de octubre", "MONTH"],
  ["cual es {m} esperado de octubre", "MONTH"],
  ["que numero proyectamos en {m}", "CUTOFF"],
  ["cual es el escenario de {m} en octubre", "MONTH"],
  ["que tenemos pronosticado en {m}", "CUTOFF"],
  ["cual es nuestro pronostico de {m}", "CUTOFF"],
  ["como pinta {m} al cierre", "CUTOFF"],
  ["como viene el forecast de {m}", "CUTOFF"],
  ["que proyecta el sistema para {m}", "CUTOFF"],
  ["que dice el forecast para {m} en octubre", "MONTH"],
  ["cual seria {m} al cierre", "CUTOFF"],
  ["cuanto proyecta arr en {m}", "CUTOFF"],
  ["que estimacion hay de {m} en octubre", "MONTH"],
  ["cual es la estimacion mensual de {m}", "CUTOFF"],
  ["que cierre estimamos en {m}", "CUTOFF"],
  ["que resultado proyectamos en {m}", "CUTOFF"],
  ["cual es el valor futuro de {m}", "CUTOFF"],
  ["donde terminariamos en {m}", "CUTOFF"],
  ["como quedariamos en {m} en octubre", "MONTH"],
  ["si seguimos asi en cuanto cierra {m}", "CUTOFF"],
  ["al ritmo actual como cierra {m}", "CUTOFF"],
  ["que cierre esperado tenemos para {m}", "CUTOFF"],
];

function fill(frame, metric) {
  return frame.split("{m}").join(metric);
}

function scopeOf(text) {
  const t = String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (t.includes("ultimos 7")) return "LAST_7";
  if (t.includes("ultima semana")) return "LAST_DATA_WEEK";
  if (t.includes("semana pasada") || t.includes("semana anterior")) return "PREVIOUS_WEEK";
  if (t.includes("esta semana")) return "CURRENT_WEEK";
  if ((t.match(/20\d{2}-\d{2}-\d{2}/g) || []).length >= 2) return "RANGE";
  if (/del \d{1,2} al \d{1,2}/.test(t) || /entre el \d{1,2}/.test(t)) return "RANGE";
  if (/\d{1,2}\/\d{1,2}\/20\d{2}/.test(t) || /20\d{2}-\d{2}-\d{2}/.test(t)) return "DAY";
  if (/\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/.test(t)) return "DAY";
  if (/\bel \d{1,2}\b/.test(t)) return "DAY";
  if (t.includes("ayer")) return "DAY";
  if (/\bhoy\b/.test(t) && !t.includes("hasta hoy")) return "DAY";
  if (t.includes("octubre") || t.includes("septiembre")) return "MONTH";
  return "CUTOFF";
}

function financialExpect(metric, unit, timeScope, truth) {
  return {
    domain: truth === "BOTH" ? "ACTUAL_VS_FORECAST" : "FINANCIAL",
    metric,
    truth,
    source: truth === "FINANCIAL_FORECAST" ? "IGF_FORECAST" : truth === "BOTH" ? "IGF_DIARIO_ACUMULADO+IGF_FORECAST" : "IGF_DIARIO_ACUMULADO",
    unit,
    time_scope: timeScope,
    dimension: null,
  };
}

function row(family, text, expect) {
  return { family, text, expect };
}

function forty(family, sentences, expectOf) {
  if (sentences.length < 40) throw new Error(`${family} tiene ${sentences.length}`);
  return sentences.slice(0, 40).map((text) => row(family, text, expectOf(text)));
}

function directorIa013Corpus() {
  const cases = [];
  for (const [metric, phrase, unit] of METRICS) {
    for (const [frame, timeScope] of ACTUAL_TEMPLATES) {
      cases.push(row("FINANCIAL_ACTUAL_GENERIC", fill(frame, phrase), financialExpect(metric, unit, timeScope, "FINANCIAL_ACTUAL")));
    }
    for (const [frame, timeScope] of FORECAST_TEMPLATES) {
      cases.push(row("FINANCIAL_FORECAST", fill(frame, phrase), financialExpect(metric, unit, timeScope, "FINANCIAL_FORECAST")));
    }
  }
  const gas = [
    "cuanto compramos de gas lp en octubre", "cuantos kilos de gas lp entraron en octubre", "que compras de gas hubo en octubre",
    "dame las compras de gas de octubre", "cuanto gas compramos este mes", "cuanto gas lp llevamos comprado", "que gas entro en octubre",
    "cuantos kilos recibimos de gas", "que embarques de gas tuvimos", "cuantas compras de gas tuvimos en octubre", "que pipas de gas llegaron",
    "cuanto compramos a pemex esta semana", "que compramos a pemex en octubre", "cuanto compramos a tepeji ayer", "cuanto nos surtio tuxpan",
    "dame las compras de pemex", "cual fue el volumen comprado de gas", "que volumen de gas compramos en octubre", "cuanto suman los kilos comprados de gas",
    "que compras aparecen en control de compras", "como estuvieron las compras de gas lp en octubre", "compra kg de gas en octubre",
    "que embarque de gas llego de tepeji", "cuanto producto de gas entro", "recibimos gas esta semana", "gas lp al corte",
    "compras de gas de esta semana", "compras de gas de la semana pasada", "ultimos 7 dias de gas lp", "proveedor principal de gas",
    "parte de pemex en el gas", "dias con compra de gas", "dias sin compra de gas lp", "embarques de gas en octubre",
    "pipas de tepeji en octubre", "control de compras de gas en octubre", "cuanto gas lp hubo hoy", "kilos de gas lp del 10 de octubre",
    "compras de gas del 1 al 15 de octubre", "ultima semana de gas lp",
  ];
  cases.push(...forty("GAS_LP_PURCHASES", gas, (text) => ({
    domain: "GAS_LP_PURCHASES",
    metric: null,
    truth: "ACTUAL",
    source: "CONTROL_DE_COMPRAS",
    unit: null,
    time_scope: scopeOf(text),
    dimension: text.includes("tepeji") ? "TOMZA_TEPEJI" : text.includes("tuxpan") ? "TOMZA_TUXPAN" : text.includes("pemex") ? "PEMEX" : null,
  })));
  const cost = [
    "cual fue el costo promedio de compra de gas", "a cuanto compramos el kilo de gas lp", "cual fue nuestro costo por kilo de gas",
    "cuanto costo el gas por kilo en octubre", "cual es el costo de compra de gas lp", "en cuanto salio el kilo comprado de gas",
    "cual fue el costo promedio del gas esta semana", "que costo promedio de gas tuvimos en octubre", "cuanto pagamos por kilo de gas",
    "cual fue el precio promedio de compra de gas", "costo promedio de pemex esta semana", "costo promedio de tepeji ayer",
    "a como nos salio el gas lp en octubre", "cual es el costo kg del gas en octubre", "cuanto nos costo el kilo de gas lp",
    "precio de compra del gas esta semana", "costo del gas lp al corte", "en cuanto compramos cada kilo de gas",
    "cual es el costo consolidado del gas lp", "cuanto vale el kilo de gas comprado", "costo de pemex en octubre",
    "costo de tepeji en octubre", "costo de tuxpan en octubre", "a cuanto salio pemex esta semana",
    "a cuanto salio tepeji ayer", "cual fue el costo del gas del 10 de octubre", "costo del gas del 1 al 15 de octubre",
    "como va el costo del gas lp", "que costo trae el gas esta semana", "revisa el costo kg del gas",
    "consulta el costo de compra de gas lp", "dame el costo promedio del gas de octubre", "el kilo de gas a cuanto quedo",
    "costo unitario del gas lp en octubre", "importe entre kilos del gas esta semana", "costo efectivo del gas lp",
    "a cuanto cerramos el kilo de gas comprado", "cual es el costo vigente del gas lp", "que pagamos por kilo de gas lp en octubre",
    "cual proveedor fue mas barato",
  ];
  cases.push(...forty("GAS_LP_PURCHASE_COST", cost, (text) => ({
    domain: "GAS_LP_PURCHASES",
    metric: /\b(mas barato|mas caro|surtio mas|quien surtio)\b/.test(text) ? "provider_rank" : "costo_kg",
    truth: "ACTUAL",
    source: "CONTROL_DE_COMPRAS",
    unit: "MXN_PER_KG",
    time_scope: scopeOf(text),
    dimension: text.includes("tepeji") ? "TOMZA_TEPEJI" : text.includes("tuxpan") ? "TOMZA_TUXPAN" : text.includes("pemex") ? "PEMEX" : null,
  })));
  const hg = [
    "cuanto hg en kilos llevamos en octubre", "cuantos kilos de hg hubo en octubre", "hg fisico de octubre", "suma de hg en kilos en octubre",
    "kilos de hg este mes", "hg en kilos de esta semana", "hg fisico de ayer", "cuanto hg en kilos hubo el 20",
    "kilos de hg del 10 de octubre", "hg fisico del 20/10/2026", "hg en kilos del 2026-10-20", "hg fisico del 1 al 15 de octubre",
    "cuanto hg fisico acumulamos", "dame los kilos de hg", "cuanto suma el hg en kilos", "hg en kilos al corte",
    "hg fisico hasta hoy", "cuantos kilos de hg entraron", "volumen de hg en kilos", "hg en kilos de la semana pasada",
    "hg fisico de hoy", "hg de esta semana", "cuanto hg en kilos hubo hoy", "hg fisico de esta semana",
    "los kilos de hg de octubre", "que hg en kilos llevamos", "consulta el hg fisico", "revisa los kilos de hg",
    "hg en kilos del 5 al 12", "cuanto hg fisico hubo en octubre", "kilos de hg al corte", "hg fisico acumulado de octubre",
    "dame el hg en kilos de octubre", "en cuantos kilos va el hg", "hg en kilos de octubre por favor", "suma hg fisico de octubre",
    "cuanto hg en kilos traemos", "hg fisico vigente", "kilos de hg del mes", "ultima semana de hg en kilos",
  ];
  cases.push(...forty("HG_PHYSICAL", hg, (text) => {
    const physical = /\b(kilos|kilo|fisico)\b/.test(text);
    return {
      domain: physical ? "HG_PHYSICAL" : "HG_BOTH",
      metric: physical ? "hg_physical" : "hg_both",
      truth: "ACTUAL",
      source: physical ? "arr.compras_hg" : "IGF_DIARIO_ACUMULADO+arr.compras_hg",
      unit: physical ? "KG" : "BOTH",
      time_scope: scopeOf(text),
      dimension: null,
    };
  }));
  const notes = [
    "cuantas notas de cargo tenemos en octubre", "importe de notas de cargo en octubre", "notas de cargo de esta semana",
    "notas de cargo de ayer", "cuanto suman las notas de cargo", "notas de cargo del 10 de octubre", "notas de cargo del 1 al 15 de octubre",
    "que fechas tienen nota de cargo", "porcentaje de importe en notas de cargo", "notas de cargo contra la semana pasada",
    "dame las notas de cargo de octubre", "cuantas notas de cargo van al corte", "notas de cargo de hoy", "importe de nota de cargo esta semana",
    "notas de cargo no suman kilos", "consulta las notas de cargo", "revisa notas de cargo de octubre", "notas de cargo del mes",
    "cuanto importe hay en notas de cargo", "notas de cargo de la semana pasada", "listado de notas de cargo", "notas de cargo hasta hoy",
    "cual es el importe de notas de cargo", "notas de cargo de octubre por proveedor no, el total", "cuantas notas de cargo hubo en octubre",
    "notas de cargo del 20/10/2026", "notas de cargo entre el 3 y el 10 de octubre", "el peso de las notas de cargo en el importe",
    "notas de cargo acumuladas", "dame el conteo de notas de cargo", "notas de cargo vigentes de octubre", "que notas de cargo entraron",
    "importe consolidado de notas de cargo", "notas de cargo de este mes", "cuanto representan las notas de cargo", "notas de cargo al corte",
    "notas de cargo de gas en octubre", "revisa el importe de notas de cargo", "notas de cargo sin kilos", "ultima semana de notas de cargo",
  ];
  cases.push(...forty("NOTA_CARGO", notes, (text) => ({
    domain: "GAS_LP_PURCHASES", metric: "nota_cargo", truth: "ACTUAL", source: "CONTROL_DE_COMPRAS", unit: "MXN", time_scope: scopeOf(text), dimension: null,
  })));
  const invoices = [
    "que compras de gas no tienen factura", "cuantas compras de gas estan sin factura", "importe sin factura de gas lp",
    "kilos sin factura de gas", "compras de gas pendientes de factura", "que compras de pemex no tienen factura",
    "facturas de gas de octubre", "compras de gas comprobadas", "porcentaje comprobado del gas lp", "compras de tepeji sin factura",
    "que fecha tiene una compra de gas sin factura", "dame las compras de gas sin pdf", "facturas pendientes del gas",
    "cuanto importe de gas sigue sin factura", "compras de gas con factura", "revisa facturas de gas lp", "consulta compras de gas sin comprobar",
    "gas lp sin factura esta semana", "facturas de gas de ayer", "compras de gas sin factura de octubre", "que proveedor de gas debe factura",
    "listado de gas sin factura", "cuantas facturas de gas faltan", "importe de gas no comprobado", "kilos de gas sin comprobar",
    "facturas de gas al corte", "compras de gas sin factura hoy", "porcentaje de gas comprobado", "facturas pendientes de pemex",
    "que compras de gas ya tienen factura", "revisa el gas sin factura", "consulta el comprobado de gas lp", "facturas de gas del 10 de octubre",
    "compras de gas sin factura del 1 al 15", "cuanto gas falta por facturar", "estado de facturas de gas", "gas lp facturado y pendiente",
    "dame el pendiente de facturas de gas", "compras de tuxpan sin factura", "facturas de gas de esta semana",
  ];
  cases.push(...forty("FACTURAS", invoices, (text) => ({
    domain: "GAS_LP_PURCHASES", metric: "facturas", truth: "ACTUAL", source: "CONTROL_DE_COMPRAS", unit: "COUNT", time_scope: scopeOf(text), dimension: text.includes("pemex") ? "PEMEX" : text.includes("tepeji") ? "TOMZA_TEPEJI" : text.includes("tuxpan") ? "TOMZA_TUXPAN" : null,
  })));
  const excel = [
    "que compras no coinciden con el excel", "diferencia de kilos contra el excel", "diferencia de importe contra el excel",
    "dias amarillos de compras", "mayor diferencia contra el excel", "suma neta de diferencias del excel",
    "capturado contra excel de pemex", "muestrame capturado y excel", "que compras estan discrepantes", "excel usado para calculo",
    "compras con diferencia de kg", "compras con diferencia de importe", "discrepancia de excel esta semana", "discrepancia de excel en octubre",
    "que dia amarillo pesa mas", "revisa el excel de compras", "consulta diferencias contra excel", "captura versus excel",
    "donde no cuadra el excel", "importe capturado contra excel", "kilos capturados contra excel", "excel de tepeji no cuadra",
    "dame las discrepancias del excel", "compras fuera del excel", "diferencia neta del excel", "el excel y la captura de octubre",
    "que proveedor tiene mas diferencia de excel", "dias en amarillo de octubre", "revisa lo capturado contra el excel",
    "consulta la diferencia de excel", "excel de esta semana", "excel de ayer", "mayor diferencia de importe",
    "mayor diferencia de kilos", "suma de diferencias de excel", "compras discrepantes de pemex", "el calculo usa el excel",
    "muestra excel usado para calculo", "diferencias del excel al corte", "captura y excel de octubre",
  ];
  cases.push(...forty("CAPTURED_VS_EXCEL", excel, (text) => ({
    domain: "GAS_LP_PURCHASES", metric: "captured_vs_excel", truth: "ACTUAL", source: "CONTROL_DE_COMPRAS", unit: "MXN", time_scope: scopeOf(text), dimension: text.includes("pemex") ? "PEMEX" : text.includes("tepeji") ? "TOMZA_TEPEJI" : null,
  })));
  const compare = [
    "compara margen contra la semana pasada", "compara margen actual vs forecast", "compara operativos actual vs forecast",
    "compara resultado final actual vs forecast", "margen contra ayer", "venta contra la semana pasada", "gastos operativos contra el mes anterior",
    "compara ingreso actual vs forecast",     "compara el margen contra la semana pasada en otro corte", "hg financiero contra la semana pasada",
    "diferencia de hg financiero contra la semana pasada", "margen contra la semana anterior", "compara corporativos actual vs forecast",
    "diferencia de margen contra ayer", "diferencia de operativos contra la semana pasada", "compara gasto total actual vs forecast",
    "compara utilidad operativa actual vs forecast", "compara inversiones actual vs forecast", "compara impuestos actual vs forecast",
    "compara comisiones y descuentos actual vs forecast", "venta de esta semana contra la anterior", "margen de octubre contra septiembre",
    "resultado final contra la semana pasada", "ingreso contra ayer", "operativos de esta semana contra la pasada",
    "corporativos contra la semana pasada", "hg financiero actual vs forecast", "compara venta actual vs forecast",
    "compara el margen vigente contra el forecast", "diferencia de resultado final contra ayer", "diferencia absoluta de margen",
    "cuanto vario el margen contra ayer", "cuanto vario el ingreso contra la semana pasada", "compara el gasto actual contra forecast",
    "operativos reales contra proyectados", "resultado real contra estimado", "margen vigente contra el forecast",
    "esta semana contra la semana pasada en margen", "ayer contra el corte en venta", "forecast contra el acumulado de margen",
  ];
  cases.push(...forty("PERIOD_COMPARISON", compare, (text) => {
    const both = /\b(?:forecast|proyect\w*|estimad\w*)\b/.test(text) && /\b(?:actual\w*|real\w*|acumulado|vigente|contra|vs|compar\w*)\b/.test(text);
    const metric = text.includes("resultado") ? "resultado_final"
      : text.includes("utilidad") ? "util_oper"
      : text.includes("comision") ? "com_desc"
      : text.includes("hg financiero") ? "hg_financial"
      : text.includes("operativos") ? "operativos"
      : text.includes("corporativ") ? "corporativos"
      : text.includes("gasto") ? "gasto"
      : text.includes("inversion") ? "inversiones"
      : text.includes("impuesto") ? "impuestos"
      : text.includes("ingreso") ? "ingreso"
      : text.includes("venta") ? "venta"
      : "margen";
    const unit = metric === "venta" ? "TON" : (metric === "margen" || metric === "com_desc" || metric === "hg_financial") ? "MXN_PER_KG" : "MXN";
    return {
      domain: both ? "ACTUAL_VS_FORECAST" : "FINANCIAL",
      metric,
      truth: both ? "BOTH" : "FINANCIAL_ACTUAL",
      source: both ? "IGF_DIARIO_ACUMULADO+IGF_FORECAST" : "IGF_DIARIO_ACUMULADO",
      unit,
      time_scope: scopeOf(text),
      dimension: null,
    };
  }));
  const diagnosis = [
    "por que cayo el resultado", "que explica el resultado de octubre", "por que el resultado es negativo si el margen es positivo",
    "que presion tiene el resultado", "diagnostico del resultado de octubre", "por que subieron los operativos esta semana",
    "que explica los gastos operativos", "que explica los gastos corporativos", "que paso entre utilidad operativa y resultado final",
    "que consume la utilidad", "principal presion del mes", "principal mejora del margen no, del resultado",
    "por que bajo el ingreso", "que deterioro trae el resultado", "explica el resultado al corte",
    "por que los operativos pesan mas", "que rubro empuja el resultado", "diagnostico de esta semana",
    "por que el margen no alcanza", "que explica la caida", "explica el resultado negativo con margen positivo",
    "explica el paso de margen a resultado final", "que se come la utilidad operativa", "presion de operativos esta semana",
    "presion de corporativos en octubre", "por que no llega el resultado", "explica gastos operativos de esta semana",
    "explica gastos corporativos de octubre", "que cambio en el resultado", "diagnostico aritmetico de octubre",
    "por que el resultado de ayer", "que presion hay al corte", "resultado de esta semana por que",
    "explica la utilidad operativa contra el resultado", "que resta despues de operativos", "que resta despues de corporativos",
    "por que octubre cierra negativo", "explica el puente de rentabilidad", "diagnostico del corte",
    "que parte del resultado pesa mas",
  ];
  cases.push(...forty("FINANCIAL_DIAGNOSIS", diagnosis, (text) => ({
    domain: "FINANCIAL_DIAGNOSIS",
    metric: "diagnosis",
    truth: "FINANCIAL_ACTUAL",
    source: "IGF_DIARIO_ACUMULADO",
    unit: "MXN",
    time_scope: scopeOf(text),
    dimension: null,
  })));
  const bridge = [];
  for (let i = 0; i < 40; i += 1) {
    const forms = [
      "compara precio costo y flete del margen",
      "el costo de compra de gas nos esta bajando el margen",
      "como se arma el margen con precio costo y flete",
      "precio menos costo menos flete",
      "que parte del margen es costo",
      "que parte del margen es flete",
      "puente de precio costo flete y margen",
      "margen bruto de precio costo y flete",
    ];
    bridge.push(`${forms[i % forms.length]} en octubre variante ${["hoy", "al corte", "de esta semana", "de ayer", "del mes"][i % 5]} ${i}`);
  }
  // The loop above uses a numeric suffix. Replace with hand-written lines.
  bridge.length = 0;
  bridge.push(
    "compara precio costo y flete del margen", "el costo de compra de gas nos esta bajando el margen", "como se arma el margen con precio costo y flete",
    "precio menos costo menos flete del margen", "que parte del margen es el costo", "que parte del margen es el flete",
    "puente de precio costo flete y margen", "margen bruto desde precio costo y flete", "si sube el costo que pasa con el margen",
    "si baja el flete que pasa con el margen", "si sube el precio que pasa con el margen", "desarma el margen en precio costo y flete",
    "margen igual a precio menos costo menos flete", "efecto del costo en el margen", "efecto del flete en el margen",
    "efecto del precio en el margen", "simulacion de precio costo flete", "aproximacion del margen con costo nuevo",
    "manteniendo el flete cuanto cambia el margen", "manteniendo el costo cuanto cambia el margen", "puente de margen de octubre",
    "puente de margen de esta semana", "puente de margen de ayer", "precio costo y flete al corte",
    "revisa precio costo y flete", "consulta el puente del margen", "el flete nos come margen", "el costo del gas come margen",
    "el precio no cubre costo y flete", "margen desglosado en precio costo flete", "de que se compone el margen",
    "componentes del margen bruto", "precio costo flete de octubre", "precio costo flete de esta semana", "precio costo flete de ayer",
    "cuanto aporta el precio al margen", "cuanto resta el costo al margen", "cuanto resta el flete al margen",
    "margen y sus tres piezas", "arma el margen del corte"
  );
  cases.push(...forty("PURCHASE_COST_VS_MARGIN", bridge, (text) => ({
    domain: "COST_MARGIN_BRIDGE", metric: "cost_margin_bridge", truth: "FINANCIAL_ACTUAL", source: "IGF_DIARIO_ACUMULADO", unit: "MXN_PER_KG", time_scope: scopeOf(text), dimension: null,
  })));
  const summary = [
    "dame un resumen de la planta", "dame resumen de acapulco esta semana", "como vamos este mes", "como estamos al corte",
    "resumen ejecutivo de octubre", "kpis de la planta", "como va la planta esta semana", "un resumen al corte",
    "resumen de ayer", "resumen de esta semana", "como va la planta en octubre", "dame el panorama de octubre",
    "estado general de la planta", "reporte corto de octubre", "como va el acumulado", "resumen hasta hoy",
    "que trae la planta este mes", "panorama al corte", "panorama general de la planta en octubre", "como vamos en la planta",
    "situacion de la planta en octubre", "lectura ejecutiva de octubre", "resumen del corte", "como va todo este mes",
    "dame los numeros de la planta", "resumen para la direccion de la planta", "como estamos este mes", "panorama de esta semana",
    "resumen de la operacion de octubre", "estado al corte", "como viene la planta", "reporte de esta semana",
    "sintesis de octubre", "cuadro de la planta", "resumen para direccion", "como va octubre en la planta",
    "numeros clave de octubre", "resumen de hoy", "panorama de ayer", "lectura de la planta al corte",
  ];
  cases.push(...forty("EXECUTIVE_SUMMARY", summary, (text) => ({
    domain: "EXECUTIVE_SUMMARY",
    metric: "executive_summary",
    truth: "FINANCIAL_ACTUAL",
    source: "IGF_DIARIO_ACUMULADO",
    unit: "MIXED",
    time_scope: scopeOf(text),
    dimension: null,
  })));
  const ambiguous = [
    "cuales son las compras", "que compras tenemos", "como van las compras", "cuanto llevamos de compras",
    "dame las compras", "muestrame las compras", "que compramos", "cuanto compramos", "como estuvieron las compras",
    "que paso con las compras", "cuales son las compras de esta semana", "cuales fueron las compras de la semana pasada",
    "cuales son las compras del mes", "dame las compras de octubre", "que compras hubo ayer", "que compras hubo hoy",
    "que compras hubo el lunes", "cuantas compras tuvimos", "cual fue la ultima compra", "que compras entraron",
    "que compras salieron", "como vienen las compras", "que movimiento hubo en compras", "cual es el total de compras",
    "cuanto suman las compras", "que tenemos comprado", "cual es el acumulado de compras", "que se compro este mes",
    "que se compro esta semana", "que hay de compras", "revisa compras", "consulta compras", "necesito ver compras",
    "quiero saber de compras", "que me dices de las compras", "dame un resumen de compras", "como estamos en compras",
    "que hay nuevo en compras", "cuales son nuestras compras", "que compras llevamos",
  ];
  cases.push(...forty("AMBIGUOUS_PURCHASES", ambiguous, (text) => ({
    domain: "PURCHASE_DOMAIN_CLARIFICATION", metric: null, truth: "CLARIFICATION", source: null, unit: null, time_scope: scopeOf(text), dimension: null,
  })));
  function scoped(family, lines, metric, unit, domain) {
    cases.push(...forty(family, lines, (text) => {
      const diagnosis = /\b(?:por que|explica\w*|presion\w*|diagnostico\w*|deterior\w*|pesa\w*|rubro\w*|aumento\w*|impacto\w*|equilibrio|consum\w*|llegar a cero|bajar gastos|que paso|se come|resta despues|no alcanza|puente|desglose|partidas|composicion|detalle|se arma|nomina|imss|extraordinarios|provisiones|porcentaje|cambio\w*|movio|peso|delta|cero|interpone|apaga|camino|queda despues|que pasa entre|dentro de|mejora del|cuatro rubros|distribucion|reparto|repartid\w*|calendario|habiles|dia por dia|asignad\w*|partida\w*|bajas de|abre los|restan los|crecio|bajo|por componente|despues de)\b/.test(text);
      const bridge = metric === "cost_margin_bridge";
      return {
        domain: bridge ? "COST_MARGIN_BRIDGE" : diagnosis ? "FINANCIAL_DIAGNOSIS" : (domain || "FINANCIAL"),
        metric: bridge ? "cost_margin_bridge" : diagnosis ? "diagnosis" : metric,
        truth: "FINANCIAL_ACTUAL",
        source: "IGF_DIARIO_ACUMULADO",
        unit: bridge ? "MXN_PER_KG" : unit,
        time_scope: scopeOf(text),
        dimension: null,
      };
    }));
  }
  scoped("OPERATIVOS_TOTAL", [
    "cual es el total de gastos operativos de octubre", "cuanto van los gastos operativos", "gastos operativos al corte",
    "gastos operativos de esta semana", "gastos operativos de ayer", "dame los gastos operativos de octubre",
    "en cuanto estan los gastos operativos", "como van los gastos operativos", "gastos operativos hasta hoy",
    "total operativo de octubre", "gastos operativos acumulados", "revisa gastos operativos", "consulta gastos operativos de octubre",
    "gastos operativos del mes", "que llevamos de gastos operativos", "gastos operativos vigentes", "lectura de gastos operativos",
    "gastos operativos de octubre por favor", "cuanto suman los gastos operativos", "gastos operativos del corte",
    "operacion en gastos operativos de octubre", "el monto de gastos operativos", "gastos operativos este mes", "como vienen los gastos operativos",
    "situacion de gastos operativos", "gastos operativos reales de octubre", "importe de gastos operativos", "gastos operativos a la fecha",
    "cuanto traemos de gastos operativos", "gastos operativos del acumulado", "total de operativos en octubre", "gastos operativos hoy",
    "gastos operativos de la operacion", "numero de gastos operativos", "gastos operativos sin corporativos", "solo gastos operativos de octubre",
    "gastos operativos plantilla de octubre", "cuanto es el gasto operativo", "los operativos de octubre en total", "gastos operativos cerrados al corte",
  ], "operativos", "MXN");
  scoped("OPERATIVOS_BREAKDOWN", [
    "que rubro pesa mas en gastos operativos", "desglose de gastos operativos de octubre", "cuanto es nomina dentro de gastos operativos",
    "cuanto es imss dentro de gastos operativos", "partidas de gastos operativos", "composicion de gastos operativos",
    "que componente de gastos operativos es mayor", "nomina y gastos contra imss", "extraordinarios dentro de gastos operativos",
    "provisiones dentro de gastos operativos", "reparto de gastos operativos", "porcentaje de nomina en gastos operativos",
    "porcentaje de imss en gastos operativos", "rubros de gastos operativos de esta semana", "desglose operativo de ayer",
    "abre los gastos operativos", "detalle de gastos operativos", "partidas operativas de octubre",
    "que pesa mas de la nomina", "como se componen los gastos operativos", "gastos operativos por rubro", "top de rubros operativos",
    "nomina gastos imss extraordinarios y provisiones", "estructura de gastos operativos", "mezcla de gastos operativos",
    "gastos operativos pieza por pieza", "cuanto pesa cada rubro operativo", "desglose operativo al corte",
    "rubros operativos de octubre", "composicion operativa del mes", "que partida operativa manda", "detalle operativo de esta semana",
    "abre nomina imss y provisiones", "gastos operativos en cuatro rubros", "participacion de extraordinarios", "participacion de provisiones",
    "como se arma el operativo", "lectura por rubro operativo", "gastos operativos separados", "el detalle operativo de octubre",
  ], "operativos", "MXN");
  scoped("CORPORATIVOS_TOTAL", [
    "cual es el total de gastos corporativos de octubre", "cuanto van los gastos corporativos", "gastos corporativos al corte",
    "gastos corporativos de esta semana", "gastos corporativos de ayer", "dame los gastos corporativos", "en cuanto estan los gastos corporativos",
    "como van los gastos corporativos", "gastos corporativos hasta hoy", "total corporativo de octubre", "gastos corporativos acumulados",
    "revisa gastos corporativos", "consulta gastos corporativos de octubre", "gastos corporativos del mes", "que llevamos de gastos corporativos",
    "gastos corporativos vigentes", "lectura de gastos corporativos", "gastos corporativos de octubre por favor", "cuanto suman los gastos corporativos",
    "gastos corporativos del corte", "el monto corporativo", "gastos corporativos este mes", "como vienen los gastos corporativos",
    "situacion de gastos corporativos", "gastos corporativos reales", "importe de gastos corporativos", "gastos corporativos a la fecha",
    "cuanto traemos de gastos corporativos", "gastos corporativos del acumulado", "total corporativo en octubre", "gastos corporativos hoy",
    "numero de gastos corporativos", "solo gastos corporativos", "gastos corporativos sin operativos", "los corporativos de octubre",
    "gastos corporativos cerrados al corte", "cuanto es lo corporativo", "importe corporativo de octubre", "gastos corporativos de la planta",
    "monto de gastos corporativos en octubre",
  ], "corporativos", "MXN");
  scoped("MARGEN_ACUMULADO", [
    "cual es el margen de octubre", "margen acumulado al corte", "margen ponderado de octubre", "como va el margen acumulado",
    "dame el margen del mes", "margen de octubre hasta hoy", "margen acumulado de esta semana", "margen real acumulado",
    "en cuanto va el margen de octubre", "margen del acumulado", "consulta el margen acumulado", "revisa el margen de octubre",
    "margen vigente acumulado", "que margen llevamos en octubre", "margen del mes al corte", "margen acumulado por favor",
    "lectura del margen de octubre", "margen bruto acumulado", "el margen que llevamos", "margen de octubre en acumulado",
    "cuanto es el margen del mes", "margen hasta el corte", "margen de lo que va de octubre", "margen consolidado de octubre",
    "margen del periodo de octubre", "situacion del margen acumulado", "margen de venta acumulado", "el acumulado del margen",
    "margen mensual de octubre", "como viene el margen acumulado", "margen de octubre a la fecha", "numero de margen acumulado",
    "margen real de octubre", "margen de este mes", "el margen al dia de octubre", "margen que trae octubre",
    "reporte del margen acumulado", "margen de la planta en octubre", "cual es nuestro margen de octubre", "margen acumulado hoy no, del mes",
  ], "margen", "MXN_PER_KG");
  scoped("MARGEN_DIARIO", [
    "cual es el margen de ayer", "margen de hoy", "margen del 10 de octubre", "margen del 20/10/2026", "margen del 2026-10-20",
    "margen del dia 12 de octubre", "como estuvo el margen ayer", "margen de un dia de octubre", "dame el margen de ayer",
    "margen bruto de ayer", "en cuanto estuvo el margen hoy", "margen del 5 de octubre", "margen de la fecha de ayer",
    "consulta el margen de hoy", "revisa el margen del 10 de octubre", "margen diario de ayer", "que margen hubo ayer",
    "margen del corte de hoy", "margen de esa fecha 2026-10-15", "margen del 15 de octubre", "el margen de antier no, de ayer",
    "margen de la jornada de ayer", "margen por dia de ayer", "cuanto marco el margen ayer", "margen de hoy al corte del dia",
    "margen del 8 de octubre", "margen del 9 de octubre", "margen del 11 de octubre", "margen del 12 de octubre",
    "margen del 13 de octubre", "margen del 14 de octubre", "margen del 16 de octubre", "margen del 18 de octubre",
    "margen del 19 de octubre", "margen de la venta de ayer", "un solo dia de margen", "margen puntual de ayer",
    "margen de la fecha 2026-10-10", "como cerro el margen ayer", "margen diario de hoy",
  ], "margen", "MXN_PER_KG");
  scoped("PRECIO_COSTO_FLETE", [
    "precio costo y flete del margen de octubre", "dame precio costo y flete", "como van precio costo y flete",
    "precio de octubre costo y flete", "flete costo y precio del margen", "tres piezas del margen en octubre",
    "precio vigente costo y flete", "costo y flete junto al precio", "lectura de precio costo flete", "precio costo flete al corte",
    "precio costo flete de esta semana", "precio costo flete de ayer", "consulta precio costo y flete", "revisa precio costo flete",
    "el precio el costo y el flete", "separame precio costo y flete", "margen en precio costo flete", "componentes diarios del margen",
    "precio de venta costo y flete", "flete por kilo y costo", "precio por kilo costo y flete", "como se ve el precio contra el costo",
    "costo kg y flete kg", "precio kg costo kg flete kg", "estructura de precio costo flete", "precio costo flete de octubre",
    "numeros de precio costo y flete", "situacion de precio costo flete", "precio costo flete hasta hoy", "el flete y el costo de octubre",
    "precio de octubre con costo y flete", "abre precio costo flete", "detalle de precio costo flete", "precio costo flete del mes",
    "que precio que costo y que flete", "trio precio costo flete", "precio costo flete vigente", "reporte de precio costo flete",
    "precio costo flete de la planta", "como quedo precio costo flete",
  ], "cost_margin_bridge", "MXN_PER_KG");
  const dist = [
    "como se distribuyen los gastos operativos esta semana", "distribucion diaria de gastos operativos", "gastos operativos por dia de esta semana",
    "no me dividas el mes, la semana de gastos operativos", "nomina de esta semana segun el calendario", "imss de esta semana en la distribucion",
    "extraordinarios de ayer en la distribucion", "provisiones de esta semana", "distribucion de gastos operativos de octubre",
    "que dias llevan gasto operativo", "calendario de gastos operativos", "reparto diario de nomina", "reparto diario de imss",
    "gastos operativos asignados a esta semana", "suma diaria de gastos operativos", "distribucion vigente de operativos",
    "como cayo el gasto operativo en la semana", "dias habiles de gastos operativos", "gastos operativos del domingo al corte",
    "la semana real de gastos operativos", "distribucion de nomina y gastos", "distribucion de provisiones", "distribucion de extraordinarios",
    "operativos dia por dia", "gastos operativos de la semana pasada en distribucion", "que parte de la nomina cae esta semana",
    "imss asignado a esta semana", "no uses el mensual entre dias de la distribucion", "calendario productivo de gastos", "distribucion operativa al corte",
    "gastos operativos repartidos", "como se asigna la nomina", "como se asigna el imss", "semana de provisiones de planta",
    "semana de extraordinarios", "detalle diario de operativos", "gastos operativos sobre los dias habiles", "distribucion de esta semana",
    "operativos de los dias pedidos", "la distribucion de octubre en la semana",
  ];
  cases.push(...forty("OPERATIVOS_DAILY_DISTRIBUTION", dist, (text) => {
    const diagnosis = /\b(?:nomina|imss|extraordinarios|provisiones|desglose|detalle|distribucion|reparto|repartid\w*|calendario|asignad\w*|habiles|dia por dia)\b/.test(text);
    return {
      domain: diagnosis ? "FINANCIAL_DIAGNOSIS" : "FINANCIAL",
      metric: diagnosis ? "diagnosis" : "operativos",
      truth: "FINANCIAL_ACTUAL",
      source: "IGF_DIARIO_ACUMULADO",
      unit: "MXN",
      time_scope: scopeOf(text),
      dimension: null,
    };
  }));
  const smartO = [
    "que explica el aumento de gastos operativos", "que rubro operativo crecio", "que partida de gastos operativos pesa mas",
    "que porcentaje es nomina", "cambios de gastos operativos desde la semana pasada", "por que subieron los operativos esta semana",
    "principal aumento operativo", "que componente operativo cambio", "diagnostico de gastos operativos", "explica los gastos operativos de esta semana",
    "que presion hay en gastos operativos", "nomina contra imss en el aumento", "extraordinarios explican el operativo", "provisiones y el aumento",
    "que rubro operativo manda esta semana", "delta de nomina", "delta de imss", "delta de extraordinarios", "delta de provisiones",
    "top de aumentos operativos", "que cambio en gastos operativos", "por que el operativo de octubre", "explica el operativo al corte",
    "que partida operativa subio", "composicion del aumento operativo", "gastos operativos por que", "explica el origen del operativo",
    "que peso tiene la nomina", "que peso tiene el imss", "aumentos de gastos operativos", "bajas de gastos operativos",
    "comparativo de rubros operativos", "que rubro operativo bajo", "presion de nomina", "presion de extraordinarios",
    "explica provisiones de planta",     "el operativo de esta semana por rubro", "diagnostico operativo de ayer", "que movio los gastos operativos",
    "explica el salto de gastos operativos",
  ];
  cases.push(...forty("OPERATIVOS_SMART_DIAGNOSIS", smartO, (text) => ({
    domain: "FINANCIAL_DIAGNOSIS", metric: "diagnosis", truth: "FINANCIAL_ACTUAL", source: "IGF_DIARIO_ACUMULADO", unit: "MXN", time_scope: scopeOf(text), dimension: null,
  })));
  const smartC = [
    "que explica los gastos corporativos", "explica inversiones contra gasto corporativo", "que pesa mas en gastos corporativos",
    "que cambio en gastos corporativos", "impacto de gastos corporativos en el resultado", "por que subieron los gastos corporativos",
    "diagnostico de gastos corporativos", "explica inversiones", "explica el gasto corporativo", "corporativos de esta semana por que",
    "que parte corporativa pesa mas", "delta de inversiones", "delta de gasto corporativo", "presion corporativa",
    "explica gastos corporativos y el resultado final", "que consume el resultado desde corporativos", "composicion corporativa",
    "abre los gastos corporativos", "rubros corporativos", "explica las inversiones de octubre", "explica el gasto corporativo de octubre",
    "que movio lo corporativo", "explica los corporativos al corte", "explica el puente corporativo", "explica el paso de utilidad a resultado por corporativos",
    "cuanto restan los corporativos", "peso de inversiones", "peso del gasto corporativo", "cambio corporativo de esta semana",
    "cambio corporativo de ayer", "diagnostico corporativo", "principal rubro corporativo", "que corporativo crecio",
    "que corporativo bajo", "impacto de inversiones", "impacto del gasto corporativo", "corporativos por componente",
    "explica la lectura de gastos corporativos y resultado", "por que los corporativos", "el resultado despues de corporativos",
  ];
  cases.push(...forty("CORPORATIVOS_SMART_DIAGNOSIS", smartC, (text) => ({
    domain: "FINANCIAL_DIAGNOSIS", metric: "diagnosis", truth: "FINANCIAL_ACTUAL", source: "IGF_DIARIO_ACUMULADO", unit: "MXN", time_scope: scopeOf(text), dimension: null,
  })));
  const profit = [
    "por que tengo resultado negativo si el margen es positivo", "que consume la utilidad", "que pasa entre utilidad operativa y resultado final",
    "cuanto tendrian que bajar gastos para llegar a cero", "cuanto tendria que subir el margen para equilibrio", "simulacion para llegar a cero",
    "puente de rentabilidad", "explica el paso de margen a ingreso y a resultado", "que se interpone entre margen y resultado", "utilidad operativa menos corporativos",
    "por que el resultado no acompana al margen", "equilibrio de resultado", "bajar gastos para equilibrio", "subir margen para equilibrio",
    "que falta para resultado cero", "simulacion matematica del resultado", "explica el calculo sin guardar nada", "resultado en cero",
    "cuanto sobra o falta para cero", "puente completo de octubre", "puente de esta semana", "puente de ayer", "explica el paso del ingreso al resultado",
    "explica operativos y corporativos contra el ingreso", "por que se acaba la utilidad", "margen positivo resultado negativo",
    "explica el signo del resultado", "que apaga el margen", "camino del margen al resultado", "equilibrio sin guardar cambios",
    "cuanto tendrian que bajar los operativos para cero", "cuanto tendrian que bajar los corporativos para cero", "escenario de equilibrio",
    "resultado cero si baja el gasto", "resultado cero si sube el margen", "simula el equilibrio", "puente de rentabilidad al corte",
    "entre utilidad y final", "que queda despues de todos los gastos", "por que el final es negativo",
  ];
  cases.push(...forty("PROFITABILITY_BRIDGE", profit, (text) => ({
    domain: "FINANCIAL_DIAGNOSIS", metric: "diagnosis", truth: "FINANCIAL_ACTUAL", source: "IGF_DIARIO_ACUMULADO", unit: "MXN", time_scope: scopeOf(text), dimension: null,
  })));
  return cases;
}

module.exports = { directorIa013Corpus };
