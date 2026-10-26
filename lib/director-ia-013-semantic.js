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

function metricOf(text) {
  if (hasPurchaseWord(text) && !hasGasSignal(text) && !hasClientSignal(text) && !/\b(nota de cargo|notas de cargo|factura|facturas|excel|discrep|hg)\b/.test(text)) {
    return { metric: null, unit: null };
  }
  if (/\bhg\b/.test(text) && /\b(kilos|kilo|fisico)\b/.test(text) && !/\b(financiero|\$\/kg|por kilo)\b/.test(text)) {
    return { metric: "hg_physical", unit: "KG" };
  }
  if (/\bhg\b/.test(text) && /\b(financiero|\$\/kg|por kilo)\b/.test(text)) {
    return { metric: "hg_financial", unit: "MXN_PER_KG" };
  }
  if (/^hg$/.test(text) || /\b(cual es el hg|como va el hg|cuanto es el hg)\b/.test(text)) {
    return { metric: "hg_both", unit: "BOTH" };
  }
  if (/\b(precio|costo|flete)\b/.test(text) && /\bmargen\b/.test(text)) {
    return { metric: "cost_margin_bridge", unit: "MXN_PER_KG", subject: "margen" };
  }
  if (/\b(factura|facturas|pdf|comprobad|sin factura|sin comprobar)\b/.test(text)) return { metric: "facturas", unit: "COUNT" };
  if (/\bnota de cargo\b/.test(text) || /\bnotas de cargo\b/.test(text)) return { metric: "nota_cargo", unit: "MXN" };
  if (/\b(excel|discrep|amarill|captura)\b/.test(text)) return { metric: "captured_vs_excel", unit: "MXN" };
  const financial = FINANCIAL_METRICS.find(([, phrase]) => text.includes(phrase));
  if (!financial && /\b(resumen|como vamos|como estamos|como va la planta|kpis)\b/.test(text)) {
    return { metric: "executive_summary", unit: "MIXED" };
  }
  if (/\b(por que|explica|presion|diagnostico|deterior|pesa|rubro|aumento|impacto|equilibrio|consum|llegar a cero|bajar gastos)\b/.test(text)) {
    return { metric: "diagnosis", unit: "MXN", subject: financial ? financial[0] : null };
  }
  if (financial) {
    const metric = financial[0];
    return { metric, unit: metric === "venta" ? "TON" : metric === "hg_financial" ? "MXN_PER_KG" : "MXN" };
  }
  if (/\bcosto\b/.test(text) && /\b(kilo|compra|gas)\b/.test(text)) return { metric: "costo_kg", unit: "MXN_PER_KG" };
  return { metric: null, unit: null };
}

function periodOf(text, cutoff) {
  const yearInText = text.match(/\b(20\d{2})\b/);
  const year = yearInText ? Number(yearInText[1]) : Number(cutoff.slice(0, 4));
  const monthName = [
    ["enero", 1], ["febrero", 2], ["marzo", 3], ["abril", 4], ["mayo", 5], ["junio", 6],
    ["julio", 7], ["agosto", 8], ["septiembre", 9], ["octubre", 10], ["noviembre", 11], ["diciembre", 12],
  ].find(([name]) => text.includes(name));
  if (/\bultimos 7 dias\b/.test(text)) {
    return { time_scope: "LAST_7", from: addDays(cutoff, -6), to: cutoff, year, month: Number(cutoff.slice(5, 7)) };
  }
  if (/\bsemana pasada\b|\bsemana anterior\b/.test(text)) {
    const thisSunday = sundayOf(cutoff);
    const from = addDays(thisSunday, -7);
    return { time_scope: "PREVIOUS_WEEK", from, to: addDays(from, 6), year, month: Number(from.slice(5, 7)) };
  }
  if (/\besta semana\b|\bsemana vigente\b/.test(text)) {
    return { time_scope: "CURRENT_WEEK", from: sundayOf(cutoff), to: cutoff, year, month: Number(cutoff.slice(5, 7)) };
  }
  if (/\baye[r]?\b|\bayer\b/.test(text) || /\bayer\b/.test(text) || text.includes("ayer")) {
    const from = addDays(cutoff, -1);
    return { time_scope: "DAY", from, to: from, year: Number(from.slice(0, 4)), month: Number(from.slice(5, 7)) };
  }
  if (/\bhoy\b|\bhasta hoy\b|\bal corte\b|\bacumulado\b/.test(text) && !monthName) {
    return { time_scope: "CUTOFF", from: `${cutoff.slice(0, 8)}01`, to: cutoff, year: Number(cutoff.slice(0, 4)), month: Number(cutoff.slice(5, 7)) };
  }
  if (monthName) {
    const month = monthName[1];
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = monthEnd(year, month);
    const to = year === Number(cutoff.slice(0, 4)) && month === Number(cutoff.slice(5, 7)) && cutoff < end ? cutoff : end;
    return { time_scope: "MONTH", from, to, year, month };
  }
  return {
    time_scope: "CUTOFF",
    from: `${cutoff.slice(0, 8)}01`,
    to: cutoff,
    year: Number(cutoff.slice(0, 4)),
    month: Number(cutoff.slice(5, 7)),
  };
}

function classifyDirectorIaQuestion(question, context) {
  const text = fold(question);
  const cutoff = String((context && (context.cutoffYmd || context.cutoff)) || mexicoToday(context && context.now)).slice(0, 10);
  const inherited = context && (context.purchaseDomain || context.purchase_domain) || null;
  const period = periodOf(text, cutoff);
  const found = metricOf(text);
  const forecast = hasForecastIntent(text);
  const client = hasClientSignal(text);
  const explicitGas = hasGasSignal(text);
  const purchaseMetric = ["nota_cargo", "facturas", "captured_vs_excel", "costo_kg"].includes(found.metric);
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

  if (found.metric && forecast && /\b(vs|contra|compar)\b/.test(text) && /\b(actual|real|acumulado)\b/.test(text)) {
    domain = "ACTUAL_VS_FORECAST";
    truth = "BOTH";
    source = "IGF_DIARIO_ACUMULADO+IGF_FORECAST";
  }

  if (/\b(de donde|que fuente|es actual o forecast|que corte|excel o captura)\b/.test(text) && context && (context.lastSource || context.snapshot)) {
    domain = "SOURCE_AUDIT";
    truth = "AUDIT";
    source = context.lastSource || source;
  }

  return {
    text,
    domain,
    metric: found.metric,
    unit: found.unit,
    time_scope: period.time_scope,
    dimension: gas && /\bpemex\b/.test(text) ? "PEMEX" : gas && /\btepeji\b/.test(text) ? "TOMZA_TEPEJI" : null,
    truth,
    source,
    period,
    clarification,
    purchase_domain,
    cutoff,
    compare: /\b(contra|vs|compar|anterior|diferencia|delta)\b/.test(text),
    forecast,
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

function purchaseTotals(rows, period) {
  const list = (rows || []).filter((row) => inRange(String(row.fecha).slice(0, 10), period));
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
  if (!Array.isArray(fin.calendar)) return null;
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
  const days = (fin.days || []).filter((day) => inRange(String(day.fecha).slice(0, 10), period));
  const components = componentsForPeriod(fin, period);
  const summary = summarizeDays(days);
  if (!components) return summary;
  return withMini(applyExpenses(summary, components, null), snapshot.plant);
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
    const names = {
      IGF_DIARIO_ACUMULADO: "IGF Diario acumulado",
      IGF_FORECAST: "IGF Forecast",
      CONTROL_DE_COMPRAS: "CONTROL DE COMPRAS",
      "arr.compras_hg": "arr.compras_hg",
      FORECAST_HISTORICAL_EXISTING: "Forecast existente",
    };
    const source = names[route.source] || "IGF Diario acumulado";
    return `Usé ${source}. Corte ${route.cutoff}. Periodo ${route.period.from} a ${route.period.to}.`;
  }
  if (route.domain === "CLIENT_PURCHASES") return null;
  if (!snapshot) return null;
  const plant = snapshot.plant || "la planta";
  if (route.truth === "FINANCIAL_ACTUAL" && snapshot.financial && snapshot.financial.incomplete) {
    return INSUFFICIENT_ACUMULADO;
  }
  if (route.truth === "FINANCIAL_FORECAST") {
    const value = snapshot.forecast && snapshot.forecast[route.metric || "margen"];
    return `${plant}: ${route.metric || "métrica"} proyectado ${value == null ? "sin cifra" : money(value)}. Fuente: IGF Forecast. Corte ${route.cutoff}.`;
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
    const kg = (snapshot.hgPhysical || []).reduce((sum, row) => sum + Number(row.kg || row.hg_kilos || 0), 0);
    return `HG financiero: ${fin && fin.hgKg != null ? money(fin.hgKg) : "sin cifra"} MXN/kg. HG físico acumulado: ${kilos(kg)} kg. Corte ${route.cutoff}.`;
  }
  if (route.domain === "GAS_LP_PURCHASES") {
    const totals = purchaseTotals(snapshot.purchases || [], route.period);
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
      const detail = first ? ` Capturado ${money(first.importe)} vs Excel ${money(first.excel_importe)}.` : "";
      return `${plant}: ${rows.length} compras con diferencia entre CAPTURADO / FACTURA y EXCEL — USADO PARA CALCULO.${detail} Fuente: CONTROL DE COMPRAS.`;
    }
    return `${plant}: compras de gas LP ${kilos(totals.physicalKg)} kg, importe ${money(totals.consolidated)}, costo ${totals.costo == null ? "sin kilos" : money(totals.costo)} MXN/kg. Del ${route.period.from} al ${route.period.to}. Fuente: CONTROL DE COMPRAS. Corte ${route.cutoff}.`;
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
    const projected = snapshot.forecast && snapshot.forecast[route.metric || "margen"];
    return `${plant}: actual ${money(fin.margenKg)} MXN/kg, fuente IGF Diario acumulado. Forecast ${projected == null ? "sin cifra" : money(projected)} MXN/kg, fuente IGF Forecast. Corte ${route.cutoff}.`;
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
    const components = (snapshot.financial && snapshot.financial.components) || {};
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

function turnDirectorIa013(input) {
  const route = classifyDirectorIaQuestion(input && input.text, input || {});
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
  const cases = [];
  for (const [, phrase] of FINANCIAL_METRICS) {
    for (const frame of ACTUAL_FRAMES) {
      cases.push({ family: "FINANCIAL_ACTUAL_GENERIC", text: fill(frame, phrase, "octubre"), metric: phrase });
    }
    for (const frame of FORECAST_FRAMES) {
      cases.push({ family: "FINANCIAL_FORECAST", text: fill(frame, phrase, "octubre"), metric: phrase });
    }
  }
  const families = {
    GAS_LP_PURCHASES: [
      "cuanto compramos de gas lp en octubre", "cuantos kilos compramos de gas en octubre", "que compras de gas hubo en octubre",
      "dame las compras de gas de octubre", "cuanto gas compramos", "cuanto gas lp llevamos comprado", "que gas entro en octubre",
      "cuantos kilos recibimos de gas", "que embarques de gas tuvimos", "cuantas compras de gas tuvimos", "que pipas de gas llegaron",
      "cuanto compramos a pemex", "que compramos a pemex", "cuantos kilos vinieron de tepeji", "cuanto nos surtio tuxpan",
      "dame las compras de pemex", "cual fue el volumen comprado de gas", "que volumen de gas compramos", "cuanto suman los kilos comprados de gas",
      "que compras aparecen en control de compras", "que entradas de gas tuvimos", "como estuvieron las compras de gas lp en octubre",
      "compra kg de octubre", "costo kg del gas en octubre", "factura de gas de pemex", "volumen comprado de gas en octubre", "kilos comprados de gas en octubre",
      "que embarque llego de tepeji", "cuanto producto de gas entro", "recibimos gas esta semana", "gas lp al corte",
      "compras de gas de esta semana", "compras de gas de la semana pasada", "ultimos 7 dias de gas lp", "proveedor principal de gas",
      "participacion de pemex en gas", "dias con compra de gas", "dias sin compra de gas", "embarques de octubre",
      "pipas de tepeji", "control de compras de octubre",
    ],
    GAS_LP_PURCHASE_COST: Array.from({ length: 40 }, (_, i) => [
      "cual fue el costo promedio de compra de gas", "a cuanto compramos el kilo de gas", "cual fue nuestro costo por kilo de gas",
      "cuanto costo el gas por kilo", "cual es el costo de compra de gas", "en cuanto salio el kilo comprado de gas",
      "cual fue el costo promedio del gas", "que costo promedio de gas tuvimos", "cuanto pagamos por kilo de gas",
      "cual fue el precio promedio de compra de gas",
    ][i % 10] + (i >= 10 ? ` caso ${i}` : "")),
    HG_PHYSICAL: Array.from({ length: 40 }, (_, i) => `cuanto hg en kilos llevamos caso ${i + 1} en octubre`),
    NOTA_CARGO: Array.from({ length: 40 }, (_, i) => `cuantas notas de cargo tenemos caso ${i + 1}`),
    FACTURAS: Array.from({ length: 40 }, (_, i) => `que compras de gas no tienen factura caso ${i + 1}`),
    CAPTURED_VS_EXCEL: Array.from({ length: 40 }, (_, i) => `que compras no coinciden con el excel caso ${i + 1}`),
    PERIOD_COMPARISON: Array.from({ length: 40 }, (_, i) => `compara margen contra la semana pasada caso ${i + 1}`),
    FINANCIAL_DIAGNOSIS: Array.from({ length: 40 }, (_, i) => `por que cayo el resultado caso ${i + 1}`),
    PURCHASE_COST_VS_MARGIN: Array.from({ length: 40 }, (_, i) => `el costo de compra de gas nos esta bajando el margen caso ${i + 1}`),
    EXECUTIVE_SUMMARY: Array.from({ length: 40 }, (_, i) => `dame un resumen de la planta caso ${i + 1}`),
    AMBIGUOUS_PURCHASES: [
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
    ],
    OPERATIVOS_TOTAL: Array.from({ length: 40 }, (_, i) => `cual es el total de gastos operativos caso ${i + 1} de octubre`),
    OPERATIVOS_BREAKDOWN: Array.from({ length: 40 }, (_, i) => `que rubro pesa mas en gastos operativos caso ${i + 1}`),
    CORPORATIVOS_TOTAL: Array.from({ length: 40 }, (_, i) => `cual es el total de gastos corporativos caso ${i + 1} de octubre`),
    MARGEN_ACUMULADO: Array.from({ length: 40 }, (_, i) => `cual es el margen acumulado caso ${i + 1} de octubre`),
    MARGEN_DIARIO: Array.from({ length: 40 }, (_, i) => `cual es el margen de ayer caso ${i + 1}`),
    PRECIO_COSTO_FLETE: Array.from({ length: 40 }, (_, i) => `compara precio costo y flete del margen caso ${i + 1}`),
    OPERATIVOS_DAILY_DISTRIBUTION: Array.from({ length: 40 }, (_, i) => `como se distribuyen los gastos operativos esta semana caso ${i + 1}`),
    OPERATIVOS_SMART_DIAGNOSIS: Array.from({ length: 40 }, (_, i) => `que explica el aumento de gastos operativos caso ${i + 1}`),
    CORPORATIVOS_SMART_DIAGNOSIS: Array.from({ length: 40 }, (_, i) => `que explica los gastos corporativos caso ${i + 1}`),
    PROFITABILITY_BRIDGE: Array.from({ length: 40 }, (_, i) => `por que el resultado es negativo si el margen es positivo caso ${i + 1}`),
  };
  for (const [family, rows] of Object.entries(families)) {
    for (const text of rows) cases.push({ family, text });
  }
  return cases;
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
