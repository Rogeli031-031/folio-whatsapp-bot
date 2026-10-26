"use strict";

const { summarizeDays, applyExpenses, margenOf, weightedByVenta, usesOctoberContract } = require("./igf-diario-monthly-financials");
const { buildExpenseDailySchedule, sumAssignedForWeek } = require("./igf-diario-gastos-distribucion");
const { applyIgfDiarioAcumuladoMini } = require("./dashboard-arr-forecast");

const CLARIFICATION = "¿Te refieres a compras de gas LP o a compras en general?";
const INSUFFICIENT_ACUMULADO = "No tengo información suficiente del IGF Diario acumulado para ese periodo.";

const FINANCIAL_METRICS = [
  ["resultado_final", "resultado final"],
  ["util_oper", "utilidad operativa"],
  ["com_desc", "comisiones y descuentos"],
  ["hg_financial", "hg financiero"],
  ["operativos", "gastos operativos"],
  ["corporativos", "gastos corporativos"],
  ["gasto", "gasto total"],
  ["inversiones", "inversiones"],
  ["impuestos", "impuestos"],
  ["ingreso", "ingreso"],
  ["margen", "margen"],
  ["venta", "venta"],
  ["operativos", "operativos"],
  ["corporativos", "corporativos"],
  ["operativos", "operativo"],
  ["corporativos", "corporativo"],
  ["gasto", "gasto"],
  ["resultado_final", "resultado"],
];

const INTERNAL_CODES = [
  "RESULT_WITH_EVIDENCE",
  "INSUFFICIENT_EVIDENCE",
  "DATA_NOT_FOUND",
  "SOURCE_RESTRICTED",
  "CLARIFICATION_REQUIRED",
];

function fold(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mexicoToday(now) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now || new Date());
}

function parseYmd(iso) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatYmd(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(iso, days) {
  const date = parseYmd(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatYmd(date);
}

function sundayOf(iso) {
  const date = parseYmd(iso);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return formatYmd(date);
}

function monthEnd(year, month) {
  return formatYmd(new Date(Date.UTC(year, month, 0)));
}

function hasForecastIntent(text) {
  return /\b(forecast|pronostic\w*|proyect\w*|proyeccion|estimad\w*|estimac\w*|esperamos|esperad\w*|estimamos|\barr\b|cierre esperado|como cerrara|como terminara|va a cerrar|va a terminar|como cierra|en cuanto cierra|al cierre|cierre estim|escenario|valor futuro|terminariamos|quedariamos)\b/.test(text);
}

function hasClientSignal(text) {
  return /\b(cliente|clientes|dejo de comprar|dejaron de comprar|frecuencia|proxima compra|pedido|sin comprar|atrasad|socorro)\b/.test(text)
    || /\bcompras en general\b/.test(text);
}

function hasGasSignal(text) {
  return /\b(gas lp|gas|pemex|tuxpan|tepeji|proveedor|embarques?|pipas?|nota de cargo|control de compras)\b/.test(text)
    || /\b(compra kg|costo kg|factura de gas|kilos comprados|kilos recibimos|volumen comprado)\b/.test(text);
}

function hasPurchaseWord(text) {
  return /\b(compras|compra|compramos|comprado|compro|compraron|comprobar)\b/.test(text);
}

function hasPhrase(text, phrase) {
  return new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text);
}

function metricOf(text) {
  if (hasPurchaseWord(text) && !hasGasSignal(text) && !hasClientSignal(text) && !/\b(?:nota de cargo|notas de cargo|factura|excel|discrep\w*|amarill\w*|captur\w*|hg|diferencia de kg|diferencia de importe|diferencia de kilos)\b/.test(text)) {
    return { metric: null, unit: null };
  }
  if (/\bhg\b/.test(text) && /\b(kilos|kilo|fisico)\b/.test(text) && !/\b(financiero|\$\/kg|por kilo)\b/.test(text)) {
    return { metric: "hg_physical", unit: "KG" };
  }
  if (/\bhg\b/.test(text) && (/\b(financiero|por kilo)\b/.test(text) || /\$\/kg/.test(text))) {
    return { metric: "hg_financial", unit: "MXN_PER_KG" };
  }
  if (/^hg$/.test(text) || /\b(cual es el hg|como va el hg|cuanto es el hg|hg de esta semana|hg de la semana|hg del mes|hg de octubre)\b/.test(text) || (/\bhg\b/.test(text) && !/\b(kilos|kilo|fisico|financiero|por kilo)\b/.test(text) && !/\$\/kg/.test(text) && !/\b(compras|gas)\b/.test(text))) {
    return { metric: "hg_both", unit: "BOTH" };
  }
  if (/\b(precio|costo|flete)\b/.test(text) && /\bmargen\b/.test(text)) {
    return { metric: "cost_margin_bridge", unit: "MXN_PER_KG", subject: "margen" };
  }
  if (/\bflete\b/.test(text) && /\b(precio|costo)\b/.test(text)) {
    return { metric: "cost_margin_bridge", unit: "MXN_PER_KG", subject: "margen" };
  }
  if (/\bprecio\b/.test(text) && /\bcosto\b/.test(text)) {
    return { metric: "cost_margin_bridge", unit: "MXN_PER_KG", subject: "margen" };
  }
  if (/\b(puente de margen|puente del margen|componentes del margen|se compone el margen|se arma el margen|desarma el margen|precio costo flete|precio costo y flete|margen y sus tres piezas|tres piezas del margen|componentes diarios del margen|arma el margen)\b/.test(text)) {
    return { metric: "cost_margin_bridge", unit: "MXN_PER_KG", subject: "margen" };
  }
  if (/\b(?:factura\w*|pdf|comprobad\w*|sin factura|sin comprobar|facturar)\b/.test(text)) return { metric: "facturas", unit: "COUNT" };
  if (/\bnota de cargo\b/.test(text) || /\bnotas de cargo\b/.test(text)) return { metric: "nota_cargo", unit: "MXN" };
  if (/\b(?:excel|discrep\w*|amarill\w*|captur\w*|diferencia de importe|diferencia de kilos|diferencia de kg)\b/.test(text)) return { metric: "captured_vs_excel", unit: "MXN" };
  const financial = FINANCIAL_METRICS.find(([, phrase]) => hasPhrase(text, phrase));
  if (/\bcosto\b/.test(text) && /\b(kilo|compra|gas|pemex|tepeji|tuxpan)\b/.test(text)) return { metric: "costo_kg", unit: "MXN_PER_KG" };
  if (/\b(por kilo|precio de compra|precio promedio de compra|a cuanto|a como|en cuanto|cuanto vale el kilo|importe entre kilos)\b/.test(text) && /\b(gas|pemex|tepeji|tuxpan|compr|kilo)\b/.test(text)) {
    return { metric: "costo_kg", unit: "MXN_PER_KG" };
  }
  if (!financial && /\b(resumen|como vamos|como estamos|como va|como viene la planta|kpis|panorama|estado general|estado al corte|numeros de la planta|numeros clave|lectura ejecutiva|sintesis|cuadro de la planta|reporte corto|reporte de esta semana|situacion de la planta|lectura de la planta|para direccion|que trae la planta)\b/.test(text)) {
    return { metric: "executive_summary", unit: "MIXED" };
  }
  if (/\b(?:por que|explica\w*|presion\w*|diagnostico\w*|deterior\w*|pesa\w*|rubro\w*|aumento\w*|impacto\w*|equilibrio|consum\w*|llegar a cero|bajar gastos|que paso|se come|resta despues|no alcanza|puente|parte del resultado|desglose|partidas|composicion|detalle|se arma|nomina|imss|extraordinarios|provisiones|porcentaje|cambio\w*|movio|peso|delta|cero|interpone|apaga|camino|queda despues|que pasa entre|dentro de|mejora del|cuatro rubros|distribucion|reparto|repartid\w*|calendario|habiles|dia por dia|asignad\w*|partida\w*|bajas de|abre los|restan los|crecio|bajo|por componente|despues de|menos corporativos|positivo resultado|entre utilidad|matematica del)\b/.test(text)) {
    return { metric: "diagnosis", unit: "MXN", subject: financial ? financial[0] : null };
  }
  if (financial) {
    const metric = financial[0];
    const perKg = metric === "hg_financial" || metric === "margen" || metric === "com_desc";
    return { metric, unit: metric === "venta" ? "TON" : perKg ? "MXN_PER_KG" : "MXN" };
  }
  if (/\b(mas barato|mas caro|surtio mas|quien surtio)\b/.test(text)) return { metric: "provider_rank", unit: "MXN_PER_KG" };
  return { metric: null, unit: null };
}

const MONTHS = [
  ["enero", 1], ["febrero", 2], ["marzo", 3], ["abril", 4], ["mayo", 5], ["junio", 6],
  ["julio", 7], ["agosto", 8], ["septiembre", 9], ["octubre", 10], ["noviembre", 11], ["diciembre", 12],
];

function monthIndex(name) {
  const found = MONTHS.find(([label]) => label === name);
  return found ? found[1] : null;
}

function validDay(year, month, day) {
  if (!year || !month || !day || day < 1 || month < 1 || month > 12) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dayPeriod(year, month, day) {
  if (!validDay(year, month, day)) return { time_scope: "DAY", invalid: true, from: null, to: null, year, month };
  const from = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { time_scope: "DAY", from, to: from, year, month };
}

function rangePeriod(year, month, dayA, dayB, monthB) {
  const endMonth = monthB || month;
  if (!validDay(year, month, dayA) || !validDay(year, endMonth, dayB)) {
    return { time_scope: "RANGE", invalid: true, from: null, to: null, year, month };
  }
  const from = `${year}-${String(month).padStart(2, "0")}-${String(dayA).padStart(2, "0")}`;
  const to = `${year}-${String(endMonth).padStart(2, "0")}-${String(dayB).padStart(2, "0")}`;
  if (from > to) return { time_scope: "RANGE", invalid: true, from, to, year, month };
  return { time_scope: "RANGE", from, to, year, month: Number(from.slice(5, 7)) };
}

function periodOf(text, cutoff) {
  const cutoffYear = Number(cutoff.slice(0, 4));
  const cutoffMonth = Number(cutoff.slice(5, 7));
  const yearInText = text.match(/\b(20\d{2})\b/);
  const year = yearInText ? Number(yearInText[1]) : cutoffYear;
  const monthName = MONTHS
    .map(([name, number]) => [name, number, text.search(new RegExp(`\\b${name}\\b`))])
    .filter(([, , at]) => at >= 0)
    .sort((a, b) => a[2] - b[2])[0] || null;
  const twoIso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b[\s\S]*\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (twoIso) {
    const from = `${twoIso[1]}-${twoIso[2]}-${twoIso[3]}`;
    const to = `${twoIso[4]}-${twoIso[5]}-${twoIso[6]}`;
    return { time_scope: "RANGE", invalid: from > to, from, to, year: Number(from.slice(0, 4)), month: Number(from.slice(5, 7)) };
  }
  const namedRange = text.match(/\b(?:del|desde el) (\d{1,2}) al (\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/);
  if (namedRange) return rangePeriod(year, monthIndex(namedRange[3]), Number(namedRange[1]), Number(namedRange[2]));
  const between = text.match(/\bentre el (\d{1,2}) y el (\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/);
  if (between) return rangePeriod(year, monthIndex(between[3]), Number(between[1]), Number(between[2]));
  const sharedRange = text.match(/\bdel (\d{1,2}) al (\d{1,2})\b/);
  if (sharedRange && !namedRange) return rangePeriod(year, monthName ? monthName[1] : cutoffMonth, Number(sharedRange[1]), Number(sharedRange[2]));
  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (slash) return dayPeriod(Number(slash[3]), Number(slash[2]), Number(slash[1]));
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return dayPeriod(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dayOfMonth = text.match(/\b(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/);
  if (dayOfMonth) return dayPeriod(year, monthIndex(dayOfMonth[2]), Number(dayOfMonth[1]));
  const elDia = text.match(/\b(?:el dia|el) (\d{1,2})\b/);
  if (elDia) return dayPeriod(year, monthName ? monthName[1] : cutoffMonth, Number(elDia[1]));
  if (/\bultimos 7 dias\b/.test(text)) {
    return { time_scope: "LAST_7", from: addDays(cutoff, -6), to: cutoff, year: cutoffYear, month: cutoffMonth };
  }
  if (/\bultima semana\b/.test(text)) {
    return { time_scope: "LAST_DATA_WEEK", from: null, to: null, year: cutoffYear, month: cutoffMonth };
  }
  if (/\bsemana pasada\b|\bsemana anterior\b/.test(text)) {
    const from = addDays(sundayOf(cutoff), -7);
    return { time_scope: "PREVIOUS_WEEK", from, to: addDays(from, 6), year: Number(from.slice(0, 4)), month: Number(from.slice(5, 7)) };
  }
  if (/\besta semana\b|\bsemana vigente\b/.test(text)) {
    return { time_scope: "CURRENT_WEEK", from: sundayOf(cutoff), to: cutoff, year: cutoffYear, month: cutoffMonth };
  }
  if (text.includes("ayer")) {
    const from = addDays(cutoff, -1);
    return { time_scope: "DAY", from, to: from, year: Number(from.slice(0, 4)), month: Number(from.slice(5, 7)) };
  }
  if (/\bhoy\b/.test(text) && !/\bhasta hoy\b/.test(text)) {
    return { time_scope: "DAY", from: cutoff, to: cutoff, year: cutoffYear, month: cutoffMonth };
  }
  if (/\bhasta hoy\b|\bal corte\b|\bacumulado\b|\beste mes\b/.test(text) && !monthName) {
    return { time_scope: "CUTOFF", from: `${cutoff.slice(0, 8)}01`, to: cutoff, year: cutoffYear, month: cutoffMonth };
  }
  if (monthName) {
    const month = monthName[1];
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = monthEnd(year, month);
    const to = year === cutoffYear && month === cutoffMonth && cutoff < end ? cutoff : end;
    return { time_scope: "MONTH", from, to, year, month };
  }
  return { time_scope: "CUTOFF", from: `${cutoff.slice(0, 8)}01`, to: cutoff, year: cutoffYear, month: cutoffMonth };
}

function providerDimension(text) {
  if (/\bpemex tuxpan\b/.test(text)) return "PEMEX_TUXPAN";
  if (/\btomza tepeji\b|\btepeji\b/.test(text)) return "TOMZA_TEPEJI";
  if (/\btomza tuxpan\b|\btuxpan\b/.test(text)) return "TOMZA_TUXPAN";
  if (/\bpemex\b/.test(text)) return "PEMEX";
  return null;
}

function providerMatches(name, dimension) {
  const folded = fold(name);
  if (!dimension) return true;
  if (dimension === "PEMEX_TUXPAN") return folded === "pemex tuxpan";
  if (dimension === "TOMZA_TEPEJI") return folded === "tomza tepeji" || folded === "tepeji";
  if (dimension === "TOMZA_TUXPAN") return folded === "tomza tuxpan" || folded === "tuxpan";
  if (dimension === "PEMEX") return folded === "pemex";
  return true;
}

function classifyDirectorIaQuestion(question, context) {
  const text = fold(question);
  const cutoff = String((context && (context.cutoffYmd || context.cutoff)) || mexicoToday(context && context.now)).slice(0, 10);
  const rawDomain = context && (context.purchaseDomain || context.purchase_domain) || null;
  const inherited = rawDomain === "GAS_LP" || rawDomain === "CLIENT_PURCHASES" ? rawDomain : null;
  const period = periodOf(text, cutoff);
  const found = metricOf(text);
  const forecast = hasForecastIntent(text);
  const client = hasClientSignal(text);
  const explicitGas = hasGasSignal(text);
  const purchaseMetric = ["nota_cargo", "facturas", "captured_vs_excel", "costo_kg", "provider_rank"].includes(found.metric);
  const gas = purchaseMetric || (explicitGas && !found.metric) || (inherited === "GAS_LP" && !client && !found.metric && !forecast);
  const purchaseWord = hasPurchaseWord(text);
  const october = usesOctoberContract(period.year, period.month);

  let domain = "FINANCIAL";
  let truth = forecast ? "FINANCIAL_FORECAST" : (october ? "FINANCIAL_ACTUAL" : "FINANCIAL_HISTORICAL");
  let source = forecast ? "IGF_FORECAST" : (october ? "IGF_DIARIO_ACUMULADO" : "FORECAST_HISTORICAL_EXISTING");
  let purchase_domain = inherited;
  let clarification = false;

  if (found.metric === "hg_physical") {
    domain = "HG_PHYSICAL";
    truth = "ACTUAL";
    source = "arr.compras_hg";
  } else if (client) {
    domain = "CLIENT_PURCHASES";
    truth = "ACTUAL";
    source = "CLIENT_PURCHASES";
    purchase_domain = "CLIENT_PURCHASES";
  } else if (gas || found.metric === "nota_cargo" || found.metric === "facturas" || found.metric === "captured_vs_excel" || found.metric === "costo_kg") {
    domain = "GAS_LP_PURCHASES";
    truth = "ACTUAL";
    source = "CONTROL_DE_COMPRAS";
    purchase_domain = "GAS_LP";
  } else if (purchaseWord && !found.metric) {
    clarification = !inherited;
    domain = inherited === "CLIENT_PURCHASES" ? "CLIENT_PURCHASES" : inherited === "GAS_LP" ? "GAS_LP_PURCHASES" : "PURCHASE_DOMAIN_CLARIFICATION";
    truth = "CLARIFICATION";
    source = clarification ? null : source;
  } else if (found.metric === "cost_margin_bridge") {
    domain = "COST_MARGIN_BRIDGE";
    truth = october ? "FINANCIAL_ACTUAL" : "FINANCIAL_HISTORICAL";
    source = october ? "IGF_DIARIO_ACUMULADO" : "FORECAST_HISTORICAL_EXISTING";
  } else if (inherited === "CLIENT_PURCHASES" && !found.metric && !explicitGas) {
    domain = "CLIENT_PURCHASES";
    truth = "ACTUAL";
    source = "CLIENT_PURCHASES";
    purchase_domain = "CLIENT_PURCHASES";
  } else if (found.metric === "hg_both") {
    domain = "HG_BOTH";
    truth = "ACTUAL";
    source = "IGF_DIARIO_ACUMULADO+arr.compras_hg";
  } else if (found.metric === "executive_summary") {
    domain = "EXECUTIVE_SUMMARY";
    truth = forecast ? "FINANCIAL_FORECAST" : "FINANCIAL_ACTUAL";
    source = forecast ? "IGF_FORECAST" : "IGF_DIARIO_ACUMULADO";
  } else if (found.metric === "diagnosis") {
    domain = "FINANCIAL_DIAGNOSIS";
    truth = "FINANCIAL_ACTUAL";
    source = october ? "IGF_DIARIO_ACUMULADO" : "FORECAST_HISTORICAL_EXISTING";
  }

  if (found.metric && forecast && /\b(vs|contra|compar)\b/.test(text) && /\b(actual\w*|real\w*|acumulado|vigente)\b/.test(text)) {
    domain = "ACTUAL_VS_FORECAST";
    truth = "BOTH";
    source = "IGF_DIARIO_ACUMULADO+IGF_FORECAST";
  }

  if (/\b(de donde|que fuente|es actual o forecast|que corte|excel o captura)\b/.test(text)) {
    domain = "SOURCE_AUDIT";
    truth = "AUDIT";
    source = context && context.lastSource ? context.lastSource : null;
  }

  return {
    text,
    domain,
    metric: found.metric,
    unit: found.unit,
    time_scope: period.time_scope,
    dimension: providerDimension(text),
    truth,
    source,
    period,
    clarification,
    purchase_domain,
    october,
    cutoff,
    compare: /\b(contra|vs|compar|anterior|diferencia|delta)\b/.test(text),
    forecast,
    context: {
      last_from: context && context.last_from || null,
      last_to: context && context.last_to || null,
    },
  };
}

function money(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function kilos(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value).toLocaleString("es-MX", { maximumFractionDigits: 3 });
}

function inRange(fecha, period) {
  return fecha >= period.from && fecha <= period.to;
}

function effectiveKg(row) {
  if (row.excel_kg != null) return Number(row.excel_kg);
  if (row.effective_kg != null) return Number(row.effective_kg);
  return Number(row.kg) || 0;
}

function effectiveImporte(row) {
  if (row.excel_importe != null) return Number(row.excel_importe);
  if (row.effective_importe != null) return Number(row.effective_importe);
  return Number(row.importe) || 0;
}

function isNota(row) {
  return fold(row.proveedor || row.proveedor_nombre || "") === "nota de cargo";
}

function purchaseTotals(rows, period, dimension) {
  const list = (rows || []).filter((row) => {
    if (!inRange(String(row.fecha).slice(0, 10), period)) return false;
    if (!dimension) return true;
    if (isNota(row)) return false;
    return providerMatches(row.proveedor || row.proveedor_nombre, dimension);
  });
  let physicalKg = 0;
  let physicalImporte = 0;
  let notaImporte = 0;
  let notaCount = 0;
  for (const row of list) {
    if (isNota(row)) {
      notaCount += 1;
      notaImporte += effectiveImporte(row);
    } else {
      physicalKg += effectiveKg(row);
      physicalImporte += effectiveImporte(row);
    }
  }
  const consolidated = physicalImporte + notaImporte;
  return {
    list,
    physicalKg,
    physicalImporte,
    notaImporte,
    notaCount,
    consolidated,
    costo: physicalKg > 0 ? consolidated / physicalKg : null,
  };
}

const EXPENSE_KEYS = [
  "presupuesto_nomina_gastos",
  "presupuesto_imss_sua",
  "extraordinarios",
  "provisiones_planta",
  "gasto_corporativo",
  "inversiones",
  "impuestos_federales",
];

function withMini(fin, plant) {
  const code = plant || "PLANTA";
  if (fin.margenKg == null || fin.hgKg == null) return fin;
  const mini = applyIgfDiarioAcumuladoMini({
    rows: [{
      plant_code: code,
      empresa: code,
      ventaTon: fin.ventaTon,
      comDesc: fin.comDescKg || 0,
      impuestos: fin.impuestoKg || 0,
      operativos: fin.operativosImporte,
      corporativos: fin.corporativosImporte,
    }],
  }, { [code]: { margen: fin.margenKg, hg: fin.hgKg } });
  const row = (mini.rows && mini.rows[0]) || {};
  return {
    ...fin,
    ingreso: row.ingreso,
    utilOperImporte: row.utilOperImporte,
    resultadoFinalImporte: row.resultadoFinalImporte,
    mini,
  };
}

function componentsForPeriod(fin, period) {
  const base = (fin && fin.components) || {};
  if (!period || period.time_scope === "MONTH" || period.time_scope === "CUTOFF") return base;
  if (fin.missingDistribution || !Array.isArray(fin.calendar)) return null;
  const weekDays = fin.calendar.filter((day) => inRange(String(day.fecha).slice(0, 10), period));
  const partial = {};
  for (const key of EXPENSE_KEYS) {
    if (base[key] == null) return null;
    const schedule = buildExpenseDailySchedule({
      monthlyAmount: base[key],
      days: fin.calendar,
      overrides: (fin.overrides && fin.overrides[key]) || [],
    });
    partial[key] = sumAssignedForWeek(schedule, weekDays);
  }
  return partial;
}

function financialOf(snapshot, period) {
  const fin = snapshot && snapshot.financial;
  if (!fin || fin.incomplete) return null;
  const scope = period && period.time_scope;
  if (fin.authoritative && (scope === "MONTH" || scope === "CUTOFF")) {
    return { ...fin.authoritative, periodComponents: fin.components || {}, distributionMissing: false };
  }
  const days = (fin.days || []).filter((day) => inRange(String(day.fecha).slice(0, 10), period));
  const components = componentsForPeriod(fin, period);
  const summary = summarizeDays(days);
  if (!components) return { ...summary, distributionMissing: true, periodComponents: null };
  return { ...withMini(applyExpenses(summary, components, null), snapshot.plant), periodComponents: components, distributionMissing: false };
}

function metricAmount(fin, metric) {
  if (!fin) return null;
  const values = {
    venta: fin.ventaTon,
    margen: fin.margenKg,
    com_desc: fin.comDescKg,
    hg_financial: fin.hgKg,
    ingreso: fin.ingreso,
    operativos: fin.operativosImporte,
    corporativos: fin.corporativosImporte,
    gasto: fin.gastoImporte,
    util_oper: fin.utilOperImporte,
    resultado_final: fin.resultadoFinalImporte,
    inversiones: fin.inversionesImporte,
    impuestos: fin.impuestosFederalesImporte,
  };
  return Object.prototype.hasOwnProperty.call(values, metric) ? values[metric] : null;
}

function hideInternalCodes(text) {
  let out = String(text || "");
  for (const code of INTERNAL_CODES) {
    out = out.replace(new RegExp(`^${code}\\s*:\\s*`, "i"), "");
    out = out.replace(new RegExp(`\\b${code}\\b`, "g"), "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function composeDirectorIa013(route, snapshot) {
  if (route.clarification) return CLARIFICATION;
  if (route.domain === "SOURCE_AUDIT") {
    if (!route.source) return "En el hilo actual no tengo una fuente previa identificada.";
    const names = {
      IGF_DIARIO_ACUMULADO: "IGF Diario acumulado",
      IGF_FORECAST: "IGF Forecast",
      "IGF_DIARIO_ACUMULADO+IGF_FORECAST": "IGF Diario acumulado y IGF Forecast",
      CONTROL_DE_COMPRAS: "CONTROL DE COMPRAS",
      "arr.compras_hg": "arr.compras_hg",
      FORECAST_HISTORICAL_EXISTING: "Forecast existente",
    };
    const source = names[route.source];
    if (!source) return "En el hilo actual no tengo una fuente previa identificada.";
    const from = route.context && route.context.last_from;
    const to = route.context && route.context.last_to;
    const period = from && to ? ` Periodo ${from} a ${to}.` : "";
    return `Usé ${source}. Corte ${route.cutoff}.${period}`;
  }
  if (route.domain === "CLIENT_PURCHASES") return null;
  if (!snapshot) return null;
  const plant = snapshot.plant || "la planta";
  if (route.truth === "FINANCIAL_ACTUAL" && snapshot.financial && snapshot.financial.incomplete) {
    return INSUFFICIENT_ACUMULADO;
  }
  if (route.truth === "FINANCIAL_FORECAST") {
    if (snapshot.forecastStatus === "LOADER_NOT_IMPLEMENTED") {
      return `${plant}: no consulté IGF Forecast porque el loader no está configurado. Corte ${route.cutoff}.`;
    }
    const metric = route.metric;
    const value = metric && snapshot.forecast ? snapshot.forecast[metric] : null;
    return `${plant}: ${metric || "métrica"} proyectado ${value == null ? "sin cifra" : money(value)}. Fuente: IGF Forecast. Corte ${route.cutoff}.`;
  }
  if (route.truth === "FINANCIAL_HISTORICAL") {
    const value = snapshot.historical && snapshot.historical[route.metric || "margen"];
    return `${plant}: ${route.metric || "métrica"} histórico ${value == null ? "sin cifra" : money(value)}. Fuente: histórica / Forecast existente. Corte ${route.cutoff}.`;
  }
  if (route.metric === "hg_physical" || route.domain === "HG_PHYSICAL") {
    const kg = (snapshot.hgPhysical || []).filter((row) => inRange(row.fecha, route.period)).reduce((sum, row) => sum + Number(row.kg || row.hg_kilos || 0), 0);
    return `${plant} lleva ${kilos(kg)} kg de HG físico del ${route.period.from} al ${route.period.to}. Fuente: arr.compras_hg. Corte ${route.cutoff}.`;
  }
  if (route.metric === "hg_both" || route.domain === "HG_BOTH") {
    const fin = financialOf(snapshot, route.period);
    const kg = (snapshot.hgPhysical || []).filter((row) => inRange(String(row.fecha).slice(0, 10), route.period)).reduce((sum, row) => sum + Number(row.kg || row.hg_kilos || 0), 0);
    return `HG financiero: ${fin && fin.hgKg != null ? money(fin.hgKg) : "sin cifra"} MXN/kg del ${route.period.from} al ${route.period.to}. HG físico: ${kilos(kg)} kg en el mismo periodo. Corte ${route.cutoff}.`;
  }
  if (route.period && route.period.invalid) return "Ese rango de fechas no es válido.";
  if (route.period && route.period.from && route.cutoff && route.period.from > route.cutoff) {
    return `Ese día queda después del corte ${route.cutoff}.`;
  }
  if (route.domain === "GAS_LP_PURCHASES") {
    const totals = purchaseTotals(snapshot.purchases || [], route.period, route.dimension);
    if (route.metric === "nota_cargo") {
      return `${plant}: ${totals.notaCount} notas de cargo, importe ${money(totals.notaImporte)}. No suman kilos. Fuente: CONTROL DE COMPRAS. ${route.period.from} a ${route.period.to}.`;
    }
    if (route.metric === "facturas") {
      const missing = totals.list.filter((row) => !isNota(row) && !row.has_document);
      return `${plant}: ${missing.length} compras de gas LP sin factura entre ${route.period.from} y ${route.period.to}. Fuente: CONTROL DE COMPRAS.`;
    }
    if (route.metric === "captured_vs_excel") {
      const rows = totals.list.filter((row) => row.discrepant);
      const first = rows[0];
      const detail = first
        ? ` ${first.fecha} ${first.proveedor}: capturado ${kilos(first.kg)} kg y ${money(first.importe)}, Excel ${kilos(first.excel_kg)} kg y ${money(first.excel_importe)}.`
        : "";
      return `${plant}: ${rows.length} compras con diferencia entre CAPTURADO / FACTURA y EXCEL — USADO PARA CALCULO.${detail} Fuente: CONTROL DE COMPRAS.`;
    }
    if (route.metric === "provider_rank") {
      const groups = new Map();
      for (const row of totals.list) {
        if (isNota(row)) continue;
        const name = row.proveedor || row.proveedor_nombre || "sin proveedor";
        const prev = groups.get(name) || { kg: 0, importe: 0 };
        prev.kg += effectiveKg(row);
        prev.importe += effectiveImporte(row);
        groups.set(name, prev);
      }
      const ranked = [...groups.entries()].filter(([, value]) => value.kg > 0).map(([name, value]) => ({ name, costo: value.importe / value.kg, kg: value.kg }));
      ranked.sort((a, b) => a.costo - b.costo);
      const cheap = ranked[0];
      const kilosLeader = [...groups.entries()].sort((a, b) => b[1].kg - a[1].kg)[0];
      return `${plant}: el proveedor más barato es ${cheap ? `${cheap.name} a ${money(cheap.costo)} MXN/kg` : "sin kilos"}. Quien surtió más kilos: ${kilosLeader ? `${kilosLeader[0]} con ${kilos(kilosLeader[1].kg)} kg` : "sin datos"}. Del ${route.period.from} al ${route.period.to}. Fuente: CONTROL DE COMPRAS. Corte ${route.cutoff}.`;
    }
    const who = route.dimension ? ` de ${route.dimension}` : "";
    return `${plant}: compras de gas LP${who} ${kilos(totals.physicalKg)} kg, importe ${money(totals.consolidated)}, costo ${totals.costo == null ? "sin kilos" : money(totals.costo)} MXN/kg. Del ${route.period.from} al ${route.period.to}. Fuente: CONTROL DE COMPRAS. Corte ${route.cutoff}.`;
  }
  if (route.domain === "COST_MARGIN_BRIDGE") {
    const days = ((snapshot.financial && snapshot.financial.days) || []).filter((day) => inRange(String(day.fecha).slice(0, 10), route.period));
    const precio = weightedByVenta(days, (day) => day.precio, (day) => day.ventaKg);
    const costo = weightedByVenta(days, (day) => day.costoKg, (day) => day.ventaKg);
    const flete = weightedByVenta(days, (day) => day.fleteKg, (day) => day.ventaKg);
    const margen = weightedByVenta(days, (day) => margenOf(day), (day) => day.ventaKg);
    return `${plant}: aproximación de margen ${money(margen)} MXN/kg = precio ${money(precio)} − costo ${money(costo)} − flete ${money(flete)}. Mantener los demás constantes es una simulación, no un dato guardado. Fuente: IGF Diario acumulado. Corte ${route.cutoff}.`;
  }
  const fin = financialOf(snapshot, route.period);
  if (!fin) return INSUFFICIENT_ACUMULADO;
  if (route.domain === "ACTUAL_VS_FORECAST") {
    const metric = route.metric || "margen";
    const actual = metricAmount(fin, metric);
    if (snapshot.forecastStatus === "LOADER_NOT_IMPLEMENTED") {
      return `${plant}: ${metric} actual ${actual == null ? "sin cifra" : money(actual)}, fuente IGF Diario acumulado. No consulté IGF Forecast porque el loader no está configurado. Corte ${route.cutoff}.`;
    }
    const projected = snapshot.forecast ? snapshot.forecast[metric] : null;
    return `${plant}: ${metric} actual ${actual == null ? "sin cifra" : money(actual)}, fuente IGF Diario acumulado. Forecast ${projected == null ? "sin cifra" : money(projected)}, fuente IGF Forecast. Corte ${route.cutoff}.`;
  }
  if (route.compare && /\b(semana pasada|semana anterior)\b/.test(route.text || "")) {
    const current = classifyDirectorIaQuestion("margen de esta semana", { cutoffYmd: route.cutoff });
    const nowFin = financialOf(snapshot, current.period);
    const beforeFin = financialOf(snapshot, route.period);
    const delta = nowFin && beforeFin && nowFin.margenKg != null && beforeFin.margenKg != null ? nowFin.margenKg - beforeFin.margenKg : null;
    const pct = delta != null && beforeFin.margenKg ? (delta / beforeFin.margenKg) * 100 : null;
    return `${plant}: margen esta semana ${nowFin && nowFin.margenKg != null ? money(nowFin.margenKg) : "sin cifra"} MXN/kg (${current.period.from} a ${current.period.to}). Semana pasada ${beforeFin && beforeFin.margenKg != null ? money(beforeFin.margenKg) : "sin cifra"} MXN/kg (${route.period.from} a ${route.period.to}). Delta ${delta == null ? "sin cifra" : money(delta)} MXN/kg${pct == null ? "" : `, ${money(pct)}%`}. Fuente: IGF Diario acumulado. Corte ${route.cutoff}.`;
  }
  const field = {
    venta: fin.ventaTon,
    margen: fin.margenKg,
    com_desc: fin.comDescKg,
    hg_financial: fin.hgKg,
    ingreso: fin.ingreso,
    operativos: fin.operativosImporte,
    corporativos: fin.corporativosImporte,
    gasto: fin.gastoImporte,
    util_oper: fin.utilOperImporte,
    resultado_final: fin.resultadoFinalImporte,
    inversiones: fin.inversionesImporte,
    impuestos: fin.impuestosFederalesImporte,
  }[route.metric || "margen"];
  if (route.metric === "diagnosis" || route.domain === "FINANCIAL_DIAGNOSIS") {
    if (fin.distributionMissing) return "No tengo la distribución diaria productiva para ese periodo.";
    const components = fin.periodComponents || {};
    const operParts = [
      ["nómina y gastos", components.presupuesto_nomina_gastos],
      ["IMSS/SUA", components.presupuesto_imss_sua],
      ["extraordinarios", components.extraordinarios],
      ["provisiones de planta", components.provisiones_planta],
    ];
    const corpParts = [
      ["gasto corporativo", components.gasto_corporativo],
      ["inversiones", components.inversiones],
    ];
    const ranked = [...operParts, ...corpParts].filter(([, value]) => value != null).sort((a, b) => Number(b[1]) - Number(a[1]));
    const top = ranked[0] ? `${ranked[0][0]} (${money(ranked[0][1])})` : "sin componentes";
    const breakdown = operParts.map(([name, value]) => `${name} ${money(value)}`).join(", ");
    if (/\b(equilibrio|llegar a cero|subir margen|bajar gastos)\b/.test(route.text || "")) {
      const gap = fin.resultadoFinalImporte == null ? null : Math.abs(Number(fin.resultadoFinalImporte));
      return `${plant}: simulación matemática. El resultado final es ${money(fin.resultadoFinalImporte)}. Para llegar a cero, los gastos tendrían que bajar ${money(gap)} o el margen subir el equivalente. No guardé ningún cambio. Fuente: IGF Diario acumulado. Corte ${route.cutoff}.`;
    }
    const pressure = Number(fin.operativosImporte) >= Number(fin.corporativosImporte) ? "los operativos" : "los corporativos";
    return `${plant}: el margen es ${money(fin.margenKg)} MXN/kg, el ingreso ${money(fin.ingreso)}, los operativos ${money(fin.operativosImporte)} (${breakdown}), la utilidad operativa ${money(fin.utilOperImporte)}, los corporativos ${money(fin.corporativosImporte)} y el resultado final ${money(fin.resultadoFinalImporte)}. La mayor presión aritmética son ${pressure}. El componente más alto es ${top}. No atribuyo causas externas. Fuente: IGF Diario acumulado. Corte ${route.cutoff}.`;
  }
  if (route.metric === "executive_summary" || route.domain === "EXECUTIVE_SUMMARY") {
    const totals = purchaseTotals(snapshot.purchases || [], route.period);
    const hg = (snapshot.hgPhysical || []).filter((row) => inRange(row.fecha, route.period)).reduce((sum, row) => sum + Number(row.kg || 0), 0);
    return [
      `${plant} · ${route.period.from} a ${route.period.to}`,
      `Venta: ${money(fin.ventaTon)} t`,
      `Margen: ${money(fin.margenKg)} MXN/kg`,
      `Compras gas LP: ${kilos(totals.physicalKg)} kg`,
      `Costo compra: ${totals.costo == null ? "sin kilos" : money(totals.costo)} MXN/kg`,
      `HG físico: ${kilos(hg)} kg`,
      `HG financiero: ${money(fin.hgKg)} MXN/kg`,
      `Resultado final: ${money(fin.resultadoFinalImporte)}`,
      "Fuente financiera: IGF Diario acumulado.",
      "Fuente compras/HG físico: CONTROL DE COMPRAS.",
      `Corte: ${route.cutoff}.`,
    ].join("\n");
  }
  const unit = route.metric === "margen" || route.metric === "hg_financial" || route.metric === "com_desc" ? " MXN/kg" : "";
  return `${plant}: ${route.metric || "dato"} ${field == null ? "sin cifra" : money(field)}${unit}. Periodo ${route.period.from} a ${route.period.to}. Fuente: IGF Diario acumulado. Corte ${route.cutoff}.`;
}

function resolveLastDataWeek(route, snapshot) {
  if (!route || !route.period || route.period.time_scope !== "LAST_DATA_WEEK") return route;
  const dates = [];
  for (const day of (snapshot && snapshot.financial && snapshot.financial.days) || []) dates.push(String(day.fecha).slice(0, 10));
  for (const row of (snapshot && snapshot.purchases) || []) dates.push(String(row.fecha).slice(0, 10));
  for (const row of (snapshot && snapshot.hgPhysical) || []) dates.push(String(row.fecha).slice(0, 10));
  const usable = dates.filter((fecha) => fecha && fecha <= route.cutoff).sort();
  if (!usable.length) return { ...route, period: { ...route.period, invalid: true } };
  const last = usable[usable.length - 1];
  const from = sundayOf(last);
  const saturday = addDays(from, 6);
  const to = saturday > route.cutoff ? route.cutoff : saturday;
  const period = { time_scope: "LAST_DATA_WEEK", from, to, year: Number(from.slice(0, 4)), month: Number(from.slice(5, 7)) };
  return { ...route, period, time_scope: "LAST_DATA_WEEK" };
}

function turnDirectorIa013(input) {
  const classified = classifyDirectorIaQuestion(input && input.text, input || {});
  const route = resolveLastDataWeek(classified, input && input.snapshot);
  const answer = composeDirectorIa013(route, input && input.snapshot);
  return {
    ...route,
    answer: answer ? hideInternalCodes(answer) : null,
    sources: route.source ? [route.source] : [],
  };
}

const ACTUAL_FRAMES = [
  "cual es {m} de {p}", "cuanto es {m} de {p}", "cuanto llevamos de {m} en {p}", "como va {m} en {p}",
  "dame {m} de {p}", "dime {m} de {p}", "que tenemos de {m} en {p}", "en cuanto esta {m} de {p}",
  "en cuanto vamos de {m}", "cuanto tenemos acumulado de {m}", "cual es {m} acumulado", "cual es {m} acumulado de {p}",
  "como cerramos hasta ahora en {m}", "como estamos en {m}", "que valor tiene {m}", "que numero tenemos en {m}",
  "cual es el dato actual de {m}", "cual es el dato real de {m}", "cual es {m} real", "cual es {m} al corte",
  "cuanto trae {m}", "que marca {m}", "que dice el acumulado de {m}", "como viene {m} este mes",
  "como llevamos {m}", "que llevamos en {m}", "cuanto llevamos hasta hoy de {m}", "cuanto llevamos hasta el corte en {m}",
  "cual es el acumulado mensual de {m}", "dame el acumulado de {m}", "dime como vamos con {m}", "ensename {m} de {p}",
  "muestrame {m} de {p}", "necesito saber {m} de {p}", "quiero saber cuanto es {m}", "quiero revisar {m}",
  "revisa {m} de {p}", "consulta {m} de {p}", "que resultado tenemos en {m}", "donde estamos parados en {m}",
];

const FORECAST_FRAMES = [
  "cual es el forecast de {m}", "cual es {m} proyectado", "cuanto esperamos de {m}", "como esperamos cerrar en {m}",
  "cual es la proyeccion de {m}", "en cuanto proyectamos {m}", "como va a cerrar {m}", "cual es el cierre esperado de {m}",
  "que pronostico tenemos de {m}", "dame el forecast de {m}", "dame la proyeccion de {m}", "que dice arr sobre {m}",
  "cual es el arr de {m}", "a cuanto esperamos llegar en {m}", "que esperamos cerrar en {m}", "en cuanto va a terminar {m}",
  "como terminara el mes en {m}", "que valor estimado tiene {m}", "cual es {m} estimado", "cual es {m} esperado",
  "que numero proyectamos en {m}", "cual es el escenario de {m}", "que tenemos pronosticado en {m}", "cual es nuestro pronostico de {m}",
  "como pinta {m} al cierre", "como viene el forecast de {m}", "que proyecta el sistema para {m}", "que dice el forecast para {m}",
  "cual seria {m} al cierre", "cuanto proyecta arr en {m}", "que estimacion hay de {m}", "cual es la estimacion mensual de {m}",
  "que cierre estimamos en {m}", "que resultado proyectamos en {m}", "cual es el valor futuro de {m}", "donde terminariamos en {m}",
  "como quedariamos en {m}", "si seguimos asi en cuanto cierra {m}", "al ritmo actual como cierra {m}", "que cierre esperado tenemos para {m}",
];

function fill(frame, metric, period) {
  return frame.split("{m}").join(metric).split("{p}").join(period);
}

function directorIa013Corpus() {
  return require("./director-ia-013-corpus").directorIa013Corpus();
}

function acumuladoMiniFromSnapshot(snapshot) {
  const fin = financialOf(snapshot, { from: "0000-01-01", to: "9999-12-31" });
  const mini = applyIgfDiarioAcumuladoMini({
    rows: [{
      plant_code: snapshot.plant,
      empresa: snapshot.plant,
      ventaTon: fin.ventaTon,
      comDesc: fin.comDescKg,
      impuestos: fin.impuestoKg,
      operativos: fin.operativosImporte,
      corporativos: fin.corporativosImporte,
    }],
  }, {
    [snapshot.plant]: { margen: fin.margenKg, hg: fin.hgKg },
  });
  return { fin, mini };
}

module.exports = {
  CLARIFICATION,
  INSUFFICIENT_ACUMULADO,
  FINANCIAL_METRICS,
  ACTUAL_FRAMES,
  FORECAST_FRAMES,
  fold,
  mexicoToday,
  sundayOf,
  addDays,
  classifyDirectorIaQuestion,
  composeDirectorIa013,
  turnDirectorIa013,
  hideInternalCodes,
  directorIa013Corpus,
  purchaseTotals,
  providerMatches,
  metricAmount,
  effectiveKg,
  effectiveImporte,
  financialOf,
  acumuladoMiniFromSnapshot,
  buildExpenseDailySchedule,
  sumAssignedForWeek,
  margenOf,
  weightedByVenta,
  applyExpenses,
  summarizeDays,
};
