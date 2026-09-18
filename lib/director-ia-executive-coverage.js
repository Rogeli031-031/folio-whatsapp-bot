"use strict";

/**
 * Cobertura ejecutiva: clasificación semántica de familias.
 * Las 30 frases viven en tests. Aquí solo señales (no phrasebook).
 */

const { extractNamedPlant } = require("./director-ia-historical-margin");
const { extractPlantLabel } = require("./director-ia-seh-operation-status");

function normalize(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FAMILY_IDS = Object.freeze([
  "CLIENTS_STOPPED_BUYING",
  "CLIENTS_DECREASED",
  "CLIENTS_INCREASED",
  "CLIENTS_NEW",
  "CLIENTS_REACTIVATED",
  "CLIENT_STATUS",
  "LAST_PURCHASE",
  "FREQUENCY",
  "FREQUENCY_DEVIATION",
  "LOST_INCOME",
  "MOVEMENT_SUMMARY",
  "CLIENT_RANKING",
  "DISCOUNT_RANKING",
  "DISCOUNT_MOVEMENT",
  "DISCOUNT_ABOVE_AVERAGE",
  "HIGH_DISCOUNT_LOW_VOLUME",
  "DISCOUNT_NO_RETURN",
  "GROWTH_WITHOUT_DISCOUNT",
  "DISCOUNT_TOTAL",
  "DISCOUNT_CHANNEL_COMPARISON",
  "DISCOUNT_HISTORY",
  "DAILY_SALES",
  "SALES_TODAY_VS_YESTERDAY",
  "SALES_SAME_DAY_PRIOR_MONTH",
  "SALES_BY_WEEKDAY",
  "SALES_MOMENTUM",
  "REQUIRED_DAILY_PACE",
  "TARGET_GAP",
  "CHANNEL_GROWTH_CONTRIBUTION",
  "CHANNEL_DECLINE_CONTRIBUTION",
  "FORECAST_CLOSE",
  "OPEN_PRONOSTICO",
  "FORECAST_TARGET_COMPARISON",
  "TARGET_RECOVERY_REQUIREMENT",
  "FORECAST_SCENARIOS",
  "LOST_CLIENT_RECOVERY_SCENARIO",
  "CLIENT_CONCENTRATION",
  "CLIENT_DECLINE_CONTRIBUTION",
  "CLIENT_GROWTH_CONTRIBUTION",
  "PROFITABILITY_STATUS",
  "PROFITABILITY_DRIVERS",
  "MONTH_OVER_MONTH_EXECUTIVE",
  "BEST_WORST_MONTH",
  "MONTHS_BELOW_TARGET",
  "RESULT_RECOVERY_SCENARIO",
  "EXPENSE_RANKING",
  "EXPENSE_GROWTH",
  "SUPPLIER_SPEND",
  "UNIT_COST",
  "UNIT_EXPENSE",
  "EXPENSE_OUTLIERS",
  "RECURRING_EXPENSE",
  "NEW_EXPENSE_CONCEPTS",
  "EXPENSE_YOY",
  "OVERDUE_ACTIONS",
  "ACTIONS_BY_RESPONSIBLE",
  "STALE_ACTIONS",
  "RECURRING_ACTIONS",
  "STALLED_COMMITMENTS",
  "COMMERCIAL_ACTIONS",
  "SAFETY_ACTIONS",
  "ISSUE_ORIGIN",
  "PRIOR_OCCURRENCE",
  "PRIOR_DECISION",
  "PRIOR_ACTIONS",
  "ACTION_EFFECTIVENESS",
  "RECURRING_ISSUES",
  "DELAYED_PROJECTS",
  "PROJECTS_DUE_SOON",
  "STALE_PROJECTS",
  "PROJECT_OPEN_ACTIONS",
  "BLOCKED_PROJECTS",
  "EXPIRED_EQUIPMENT",
  "EQUIPMENT_DUE",
  "STATION_PENDING",
  "EXTINGUISHER_ATTENTION",
  "OPERATIONAL_SIGNALS",
  "RECOVERABLE_VOLUME_CANDIDATES",
  "CLIENT_GROWTH_CANDIDATES",
  "COMMERCIAL_VISIT_CANDIDATES",
  "DISCOUNT_REVIEW_CANDIDATES",
  "MOVEMENT_DISCOUNT_CROSS",
  "MOVEMENT_ACTION_CROSS",
  "MOVEMENT_FREQUENCY_CROSS",
  "MOVEMENT_INCOME_CROSS",
  "EXECUTIVE_STATUS",
  "EXECUTIVE_DIAGNOSIS",
  "CLIENT_REVIEW_CANDIDATES",
  "EXECUTIVE_RISK_SIGNALS",
  "EXECUTIVE_OPPORTUNITIES",
  "CLIENT_CHURN_RISK",
  "EXPECTED_NEXT_PURCHASE",
  "NEW_CLIENT_RETENTION",
  "CLIENT_CHURN_RATE",
  "CLIENT_PARETO",
  "SALES_MIX_SHIFT",
  "FORECAST_ACCURACY",
  "DATA_FRESHNESS",
  "COMMERCIAL_ANOMALIES",
  "SINCE_LAST_REVIEW",
  "SALES_CHANNEL_SHARE",
  "SALES_CHANNEL_SHARE_CHANGE",
  "TOP_CLIENTS_PROJECTED_SHARE",
  "TOP_CLIENTS_PROJECTED_CONCENTRATION",
]);

const LIMITATION = Object.freeze({
  CLIENTS_REACTIVATED:
    "Puedo medir quién compró este mes y no el anterior (nuevos en el periodo). No tengo un contrato separado de reactivados (hueco + regreso) distinto de NUEVOS.",
  CLIENT_STATUS:
    "El ARR/DICF etiqueta Activo, Latente e Inactivo con umbrales internos de esa fuente. Si no cargo esa lectura, no invento el umbral.",
  LAST_PURCHASE:
    "La última compra vive en DICF (lastPurchaseDate). Si no está cargada para esa planta/periodo, no invento la fecha.",
  FREQUENCY:
    "La frecuencia (cada N días) sale de DICF freqDays. Sin esa fila no invento el intervalo.",
  FREQUENCY_DEVIATION:
    "Comparar days_since_last_purchase contra freqDays solo es válido si ambas vienen de DICF del mismo cliente.",
  DISCOUNT_MOVEMENT:
    "Puedo comparar descuento $/kg entre dos meses del mismo cliente. Sin ambos meses no invento el cambio.",
  DISCOUNT_ABOVE_AVERAGE:
    "El promedio contractual es ponderado SUM(monto)/SUM(kg) del mismo periodo/planta. Sin esa base no marco 'arriba del promedio'.",
  HIGH_DISCOUNT_LOW_VOLUME:
    "Puedo cruzar DISCOUNT_PER_KG y VENTA_TON del mismo periodo. Sin ambos no armo el cruce.",
  DISCOUNT_NO_RETURN:
    "Necesito delta de descuento y delta de volumen del mismo cliente. Sin los dos periodos no lo califico.",
  GROWTH_WITHOUT_DISCOUNT:
    "Necesito delta de volumen y delta de descuento $/kg. Sin ambos no lo califico.",
  DISCOUNT_HISTORY:
    "La evolución mensual de descuento requiere la serie mes a mes. No la reduzco a dos puntos si pediste historial.",
  SALES_SAME_DAY_PRIOR_MONTH:
    "La comparación día-equivalente del mes pasado requiere la serie diaria ARR. Sin esa fecha no la invento.",
  SALES_BY_WEEKDAY:
    "El día de semana con mayor venta requiere el rango histórico pedido. Sin rango no elijo uno.",
  SALES_MOMENTUM:
    "Aceleración requiere al menos dos velocidades comparables. Un solo punto no es momentum.",
  REQUIRED_DAILY_PACE:
    "El ritmo diario necesario es (meta − observado) / días restantes. Sin meta válida no lo calculo.",
  TARGET_GAP:
    "El gap contra meta no es el gap contra forecast. Sin meta cargada no lo invento.",
  CHANNEL_GROWTH_CONTRIBUTION:
    "Puedo descomponer el delta de kg por canal. No afirmo que el canal cause el crecimiento.",
  CHANNEL_DECLINE_CONTRIBUTION:
    "Puedo descomponer el delta negativo por canal. No afirmo causalidad.",
  FORECAST_SCENARIOS:
    "No tengo escenarios contractuales conservador/base/agresivo. No los invento.",
  LOST_CLIENT_RECOVERY_SCENARIO:
    "Si recupero clientes perdidos, el volumen es un SCENARIO (kg previo), no un hecho de cierre.",
  CLIENT_CONCENTRATION:
    "La concentración es la suma de VENTA_TON del top N sobre el total del mismo periodo. Sin el total no la invento.",
  FORECAST_TARGET_COMPARISON:
    "Forecast y meta son lecturas distintas. Las comparo solo si ambas existen para el mismo periodo.",
  TARGET_RECOVERY_REQUIREMENT:
    "Puedo calcular el gap a meta. No traduzco ese gap a 'hay que recuperar estos clientes'.",
  RESULT_RECOVERY_SCENARIO:
    "Recuperar X pesos exige palancas contractuales (venta, descuento, gasto). Sin esas conversiones no armo el escenario.",
  SUPPLIER_SPEND:
    "Solo atribuyo gasto a proveedor cuando el folio trae esa atribución física. Si no, lo declaro.",
  UNIT_COST:
    "No infiero cantidad ni costo unitario desde el número de folios.",
  EXPENSE_OUTLIERS:
    "No tengo un método de outlier contractual publicado. No marco atípicos por ocurrencia.",
  RECURRING_EXPENSE:
    "La recurrencia exige frecuencia observada por concepto. Sin historial no la afirmo.",
  NEW_EXPENSE_CONCEPTS:
    "Un concepto nuevo es primera aparición en el histórico disponible. Sin ese histórico no lo etiqueto.",
  STALE_ACTIONS:
    "Temas sin resolver requieren antigüedad contractual del Action Register. Sin fecha de corte no la invento.",
  RECURRING_ACTIONS:
    "Acciones repetidas requieren el mismo tema en más de un corte. Un solo listado no demuestra recurrencia.",
  STALLED_COMMITMENTS:
    "Compromisos sin avance necesitan dos cortes temporales. Con uno solo no lo afirmo.",
  ACTION_EFFECTIVENESS:
    "Si funcionó exige un resultado posterior comparable. Sin ese segundo corte no lo califico.",
  PROJECTS_DUE_SOON:
    "La ventana de 'por vencer' no está fijada en contrato. Sin ventana explícita no elijo una.",
  STALE_PROJECTS:
    "Proyectos sin avance necesitan dos lecturas de avance. Con una sola no lo afirmo.",
  BLOCKED_PROJECTS:
    "Bloqueado solo si el registro de proyecto trae ese estado. No lo infiero.",
  OPERATIONAL_SIGNALS:
    "Riesgo operativo solo con señales SEH/contrato. No generalizo 'hay riesgo'.",
  RECOVERABLE_VOLUME_CANDIDATES:
    "Son candidatos por brecha histórica, no una recuperación prometida.",
  COMMERCIAL_VISIT_CANDIDATES:
    "Genero candidatos a revisión comercial con evidencia. No emito una orden de visita.",
});

function isNavVerb(n) {
  return Boolean(
    /\babre\b/.test(n) ||
      /\babrela\b/.test(n) ||
      /\babrir\b/.test(n) ||
      /\bmuestra/.test(n) ||
      /\blleva/.test(n) ||
      /\bve\s+a\b/.test(n) ||
      /\bir\s+a\b/.test(n) ||
      /\bentra\b/.test(n) ||
      /\bnavega\b/.test(n) ||
      /\bquiero\s+(ver|abrir|revisar)\b/.test(n) ||
      /\bensen/.test(n)
  );
}

function isForecastValueAsk(n) {
  return Boolean(
    /\bcual\s+es\b/.test(n) ||
      /\bcuanto\b/.test(n) ||
      /\bcomo\s+vamos\s+a\s+cerrar\b/.test(n) ||
      /\bcomo\s+se\s+calcula\b/.test(n) ||
      /\bproy\b/.test(n) && !isNavVerb(n)
  );
}

function isOpenPronosticoQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (isForecastValueAsk(n) && !isNavVerb(n)) return false;
  if (/\bventa\s+diaria\b/.test(n) || /\bventas\s+diarias\b/.test(n)) return false;
  const view =
    /\bpronostico\b/.test(n) ||
    /\bforecast\b/.test(n) ||
    /\bhoja\s+de\s+proyeccion\b/.test(n) ||
    (/\bproyeccion\b/.test(n) && isNavVerb(n)) ||
    /\bmodal\s+de\s+pronostico\b/.test(n) ||
    /\bpantalla\s+de\s+pronostico\b/.test(n) ||
    /\bdetalle\s+del\s+pronostico\b/.test(n);
  return isNavVerb(n) && view;
}

function extractOpenPronosticoSpec(question) {
  if (!isOpenPronosticoQuestion(question)) return { ok: false };
  const plant = extractNamedPlant(question) || extractPlantLabel(question) || null;
  return {
    ok: true,
    family: "OPEN_PRONOSTICO",
    domain: "IGF",
    operation: "NAVIGATE",
    view: "PRONOSTICO",
    plant,
    ui_action: {
      type: "OPEN_PRONOSTICO",
      plant,
      do_not_pretend_opened: true,
    },
  };
}

function classifyExecutiveFamily(question) {
  const n = normalize(question);
  if (!n) return null;
  const predictive = require("./director-ia-predictive-commercial").classifyPredictiveFamily(question);
  if (predictive) return predictive;
  if (isOpenPronosticoQuestion(question)) return "OPEN_PRONOSTICO";
  if (/\bventa\s+diaria\b/.test(n) && isNavVerb(n)) return "DAILY_SALES";
  if (/\bcomo\s+se\s+calcula\b/.test(n) && /\b(prom|pronostico|forecast)\b/.test(n)) return "FORECAST_CLOSE";
  if (/\bcual\s+es\s+el\s+proy\b/.test(n) || /\bproy\b/.test(n) && !isNavVerb(n) && /\b(cual|cuanto)\b/.test(n)) {
    return "FORECAST_CLOSE";
  }
  if (
    (/\bpronostico\b/.test(n) || /\bforecast\b/.test(n) || /\bcerrar\b/.test(n)) &&
    (/\bcual\s+es\b/.test(n) || /\bcuanto\b/.test(n) || /\bcomo\s+vamos\s+a\s+cerrar\b/.test(n) || /\bproyectamos\b/.test(n))
  ) {
    if (/\bmeta\b/.test(n) || /\bobjetivo\b/.test(n)) return "FORECAST_TARGET_COMPARISON";
    return "FORECAST_CLOSE";
  }
  if (/\bescenario/.test(n) && /\b(conservador|agresivo|base)\b/.test(n)) return "FORECAST_SCENARIOS";
  if (/\brecuperamos\s+los\s+clientes\s+perdidos\b/.test(n) || /\bsi\s+recuperamos\b/.test(n) && /\bperdid/.test(n)) {
    return "LOST_CLIENT_RECOVERY_SCENARIO";
  }
  if (/\bacciones?\b/.test(n) && /\b(dejaron|disminuy)/.test(n)) return "MOVEMENT_ACTION_CROSS";
  if (/\bdescuento/.test(n) && /\b(dejaron|disminuy)/.test(n)) return "MOVEMENT_DISCOUNT_CROSS";
  if (/\bfrecuencia\b/.test(n) && /\b(dejaron|desaparec)/.test(n)) return "MOVEMENT_FREQUENCY_CROSS";
  if (/\bingreso\b/.test(n) && /\b(dejaron|disminuy)/.test(n)) return "MOVEMENT_INCOME_CROSS";
  if (/\bdejaron\s+de\b/.test(n) || /\bdejo\s+de\b/.test(n) || /\bcayeron\s+a\s+cero\b/.test(n) || /\bya\s+no\s+compr/.test(n)) {
    if (/\bingreso\b/.test(n)) return "LOST_INCOME";
    return "CLIENTS_STOPPED_BUYING";
  }
  if (/\bdisminuy/.test(n) || (/\bbajaron\b/.test(n) && /\bclientes?\b/.test(n) && !/\bdescuento/.test(n))) {
    return "CLIENTS_DECREASED";
  }
  if ((/\baumentaron\b/.test(n) || /\bcrecio\b/.test(n) || /\bsubieron\s+volumen\b/.test(n)) && !/\bdescuento/.test(n)) {
    if (/\bclientes?\b/.test(n) || /\bquien/.test(n)) return "CLIENTS_INCREASED";
  }
  if (/\bclientes?\s+nuevos?\b/.test(n) || /\bnuevos?\s+clientes?\b/.test(n) || /\bempezaron\s+a\s+comprar\b/.test(n)) {
    return "CLIENTS_NEW";
  }
  if (/\breactiv/.test(n) || /\bvolvieron\s+a\s+comprar\b/.test(n) || (/\bregresaron\b/.test(n) && /\bclientes?\b/.test(n))) {
    return "CLIENTS_REACTIVATED";
  }
  if (/\b(inactivos?|latentes?|activos?)\b/.test(n) && /\bclientes?\b/.test(n)) return "CLIENT_STATUS";
  if (/\bultima\s+compra\b/.test(n) || /\bcuando\s+compro\b/.test(n) || /\blleva\s+mas\s+tiempo\s+sin\s+comprar\b/.test(n)) {
    return "LAST_PURCHASE";
  }
  if (/\bfrecuencia\b/.test(n) || /\bcada\s+cuanto\s+compr/.test(n) || /\bcada\s+\d+\s+d/.test(n)) {
    return /\b(romp|desvi|deberia\s+haber|mas\s+tiempo\s+de\s+lo\s+normal)\b/.test(n)
      ? "FREQUENCY_DEVIATION"
      : "FREQUENCY";
  }
  if (/\bmovimiento\s+de\s+clientes\b/.test(n) || /\bcomo\s+se\s+movieron\s+los\s+clientes\b/.test(n) || /\bque\s+paso\s+con\s+los\s+clientes\b/.test(n)) {
    return "MOVEMENT_SUMMARY";
  }
  if (/\bdescuento/.test(n) && /\b(subimos|aumento|redujo|cambio)\b/.test(n)) return "DISCOUNT_MOVEMENT";
  if (/\bdescuento/.test(n) && /\barriba\s+del\s+promedio\b/.test(n)) return "DISCOUNT_ABOVE_AVERAGE";
  if (/\bdescuento/.test(n) && /\b(poco\s+volumen|bajo\s+volumen)\b/.test(n)) return "HIGH_DISCOUNT_LOW_VOLUME";
  if (/\bdescuento/.test(n) && /\bsin\s+(mas\s+)?volumen\b/.test(n)) return "DISCOUNT_NO_RETURN";
  if (/\bvolumen\b/.test(n) && /\bsin\s+mas\s+descuento\b/.test(n)) return "GROWTH_WITHOUT_DISCOUNT";
  if (/\bdescuento/.test(n) && (/\btotal\b/.test(n) || /\bcuanto\s+dimos\b/.test(n) || /\bcediendo\b/.test(n))) {
    return "DISCOUNT_TOTAL";
  }
  if (/\bdescuento/.test(n) && /\b(casa|comisionista)\b/.test(n) && /\bvs\b/.test(n)) return "DISCOUNT_CHANNEL_COMPARISON";
  if (/\bdescuento/.test(n) && (/\bhistorial\b/.test(n) || /\bevolucion\b/.test(n) || /\bserie\b/.test(n))) {
    return "DISCOUNT_HISTORY";
  }
  if (/\bdescuento/.test(n) && (/\btop\b/.test(n) || /\bmayor\b/.test(n) || /\branking\b/.test(n))) {
    return "DISCOUNT_RANKING";
  }
  if ((/\bmas\s+compran\b/.test(n) || /\bmayor\s+compra\b/.test(n) || /\btop\b/.test(n) && /\bclientes?\b/.test(n)) && !/\bdescuento/.test(n) && !/\bdejaron\b/.test(n)) {
    return "CLIENT_RANKING";
  }
  if (/\bhoy\s+vs\s+ayer\b/.test(n) || (/\bhoy\b/.test(n) && /\bayer\b/.test(n) && /\bventa/.test(n))) {
    return "SALES_TODAY_VS_YESTERDAY";
  }
  if (/\bmismo\s+dia\b/.test(n) && /\bmes\s+pasado\b/.test(n)) return "SALES_SAME_DAY_PRIOR_MONTH";
  if (/\bdia\s+de\s+(la\s+)?semana\b/.test(n) && /\bventa/.test(n)) return "SALES_BY_WEEKDAY";
  if (/\b(aceler|desaceler)/.test(n) && /\bventa/.test(n)) return "SALES_MOMENTUM";
  if (/\britmo\s+diario\b/.test(n) || /\bpara\s+llegar\s+a\s+(la\s+)?meta\b/.test(n) && /\bdias?\b/.test(n)) {
    return "REQUIRED_DAILY_PACE";
  }
  if (/\bgap\b/.test(n) && /\bmeta\b/.test(n)) return "TARGET_GAP";
  if (/\bque\s+falta\s+para\s+(llegar\s+a\s+)?(la\s+)?meta\b/.test(n)) return "TARGET_RECOVERY_REQUIREMENT";
  if (/\bcanal\b/.test(n) && /\b(crecimiento|explica\s+el\s+crecimiento)\b/.test(n)) return "CHANNEL_GROWTH_CONTRIBUTION";
  if (/\bcanal\b/.test(n) && /\b(caida|explica\s+la\s+caida)\b/.test(n)) return "CHANNEL_DECLINE_CONTRIBUTION";
  if (/\bventa\b/.test(n) && (/\bhoy\b/.test(n) || /\bdiaria\b/.test(n))) return "DAILY_SALES";
  if (/\bvendimos\s+hoy\b/.test(n) || /\bventa\s+de\s+hoy\b/.test(n)) return "DAILY_SALES";
  if (/\bconcentracion\b/.test(n) || /\bporcentaje\b/.test(n) && /\btop\s+\d+\b/.test(n)) return "CLIENT_CONCENTRATION";
  if (/\bclientes?\b/.test(n) && /\bexplican\s+la\s+caida\b/.test(n)) return "CLIENT_DECLINE_CONTRIBUTION";
  if (/\bclientes?\b/.test(n) && /\bexplican\s+el\s+crecimiento\b/.test(n)) return "CLIENT_GROWTH_CONTRIBUTION";
  if (/\bdrivers?\b/.test(n) && /\brentabilidad\b/.test(n)) return "PROFITABILITY_DRIVERS";
  if (/\brentabilidad\b/.test(n) && (/\bcomo\s+va/.test(n) || /\bestatus\b/.test(n) || /\bgeneral\b/.test(n))) {
    return "PROFITABILITY_STATUS";
  }
  if (/\bvs\s+mes\s+pasado\b/.test(n) || /\bmes\s+contra\s+mes\b/.test(n)) return "MONTH_OVER_MONTH_EXECUTIVE";
  if (/\b(mejor|peor)\s+mes\b/.test(n)) return "BEST_WORST_MONTH";
  if (/\bmeses\b/.test(n) && /\bbajo\s+(objetivo|meta)\b/.test(n)) return "MONTHS_BELOW_TARGET";
  if (/\brecuperar\b/.test(n) && /\bpesos\b/.test(n)) return "RESULT_RECOVERY_SCENARIO";
  if (/\bgasto\b/.test(n) && (/\brubro\b/.test(n) || /\bconcepto\b/.test(n)) && /\bmayor\b/.test(n)) return "EXPENSE_RANKING";
  if (/\bgasto\b/.test(n) && /\baumento\b/.test(n)) return "EXPENSE_GROWTH";
  if (/\bproveedores?\b/.test(n) && /\bgasto\b/.test(n)) return "SUPPLIER_SPEND";
  if (/\bcosto\s+(promedio|unitario)\b/.test(n)) return "UNIT_COST";
  if (/\bunidades?\b/.test(n) && /\bgasto\b/.test(n)) return "UNIT_EXPENSE";
  if (/\bfolios?\s+atipic/.test(n) || /\boutliers?\b/.test(n) && /\bgasto/.test(n)) return "EXPENSE_OUTLIERS";
  if (/\bgastos?\s+recurrentes\b/.test(n)) return "RECURRING_EXPENSE";
  if (/\bconceptos?\s+nuevos?\b/.test(n) && /\bgasto/.test(n)) return "NEW_EXPENSE_CONCEPTS";
  if (/\bgasto\b/.test(n) && /\bano\s+vs\s+ano\b/.test(n)) return "EXPENSE_YOY";
  if (/\bacciones?\b/.test(n) && /\bvencid/.test(n)) return "OVERDUE_ACTIONS";
  if (/\bresponsable\b/.test(n) && /\bpendient/.test(n)) return "ACTIONS_BY_RESPONSIBLE";
  if (/\btemas?\s+sin\s+resolver\b/.test(n)) return "STALE_ACTIONS";
  if (/\bacciones?\s+repetid/.test(n) || /\bproblemas?\s+recurrentes\b/.test(n) && /\baccion/.test(n)) {
    return "RECURRING_ACTIONS";
  }
  if (/\bcompromisos?\s+sin\s+avance\b/.test(n)) return "STALLED_COMMITMENTS";
  if (/\bacciones?\b/.test(n) && /\b(comercial|impacto\s+comercial)\b/.test(n)) return "COMMERCIAL_ACTIONS";
  if (/\bacciones?\b/.test(n) && /\bseguridad\b/.test(n)) return "SAFETY_ACTIONS";
  if (/\bcuando\s+empezo\b/.test(n) || /\borigen\s+del\s+tema\b/.test(n)) return "ISSUE_ORIGIN";
  if (/\bya\s+habia\s+pasado\b/.test(n)) return "PRIOR_OCCURRENCE";
  if (/\bque\s+se\s+decidio\b/.test(n)) return "PRIOR_DECISION";
  if (/\bque\s+se\s+hizo\b/.test(n)) return "PRIOR_ACTIONS";
  if (/\bfunciono\b/.test(n) && /\baccion/.test(n)) return "ACTION_EFFECTIVENESS";
  if (/\bproblemas?\s+recurrentes\b/.test(n)) return "RECURRING_ISSUES";
  if (/\bproyectos?\s+retrasad/.test(n)) return "DELAYED_PROJECTS";
  if (/\bproyectos?\s+por\s+vencer\b/.test(n)) return "PROJECTS_DUE_SOON";
  if (/\bproyectos?\s+sin\s+avance\b/.test(n)) return "STALE_PROJECTS";
  if (/\bproyectos?\b/.test(n) && /\bacciones?\s+abiertas\b/.test(n)) return "PROJECT_OPEN_ACTIONS";
  if (/\bproyectos?\s+bloquead/.test(n)) return "BLOCKED_PROJECTS";
  if (/\bequipos?\b/.test(n) && /\bvencid/.test(n)) return "EXPIRED_EQUIPMENT";
  if (/\bequipos?\b/.test(n) && /\bvencen\b/.test(n)) return "EQUIPMENT_DUE";
  if (/\bestaciones?\b/.test(n) && /\bpendient/.test(n)) return "STATION_PENDING";
  if (/\bextintores?\b/.test(n) && /\batencion\b/.test(n)) return "EXTINGUISHER_ATTENTION";
  if (/\briesgo\s+operativ/.test(n)) return "OPERATIONAL_SIGNALS";
  if (/\boportunidad\b/.test(n) && /\btoneladas\b/.test(n)) return "RECOVERABLE_VOLUME_CANDIDATES";
  if (/\bclientes?\s+con\s+potencial\b/.test(n)) return "CLIENT_GROWTH_CANDIDATES";
  if (/\ba\s+quien\s+visitar\b/.test(n)) return "COMMERCIAL_VISIT_CANDIDATES";
  if (/\bdescuento\s+sin\s+retorno\b/.test(n) || /\brevisar\s+descuento\b/.test(n)) return "DISCOUNT_REVIEW_CANDIDATES";
  if (/\bcomo\s+vamos\b/.test(n) || /\breporte\s+ejecutivo\b/.test(n) || /\bcomo\s+va\b/.test(n) && /\b(acapulco|puebla|planta)\b/.test(n)) {
    return "EXECUTIVE_STATUS";
  }
  if (/\bpor\s+que\s+bajo\s+rentabilidad\b/.test(n) || /\bdiagnostico\s+ejecutivo\b/.test(n)) return "EXECUTIVE_DIAGNOSIS";
  if (/\bque\s+clientes\s+revisar\b/.test(n)) return "CLIENT_REVIEW_CANDIDATES";
  if (/\bque\s+deberia\s+preocuparme\b/.test(n)) return "EXECUTIVE_RISK_SIGNALS";
  if (/\bque\s+oportunidades\s+ves\b/.test(n)) return "EXECUTIVE_OPPORTUNITIES";
  return null;
}

const FAMILY_STATUS = Object.freeze({
  CLIENTS_STOPPED_BUYING: "SUPPORTED",
  CLIENTS_DECREASED: "SUPPORTED",
  CLIENTS_INCREASED: "SUPPORTED",
  CLIENTS_NEW: "SUPPORTED",
  CLIENTS_REACTIVATED: "SOURCE_MISSING",
  CLIENT_STATUS: "PARTIAL",
  LAST_PURCHASE: "PARTIAL",
  FREQUENCY: "PARTIAL",
  FREQUENCY_DEVIATION: "CONTRACT_MISSING",
  LOST_INCOME: "SUPPORTED",
  MOVEMENT_SUMMARY: "SUPPORTED",
  CLIENT_RANKING: "SUPPORTED",
  DISCOUNT_RANKING: "SUPPORTED",
  DISCOUNT_MOVEMENT: "PARTIAL",
  DISCOUNT_ABOVE_AVERAGE: "PARTIAL",
  HIGH_DISCOUNT_LOW_VOLUME: "PARTIAL",
  DISCOUNT_NO_RETURN: "PARTIAL",
  GROWTH_WITHOUT_DISCOUNT: "PARTIAL",
  DISCOUNT_TOTAL: "PARTIAL",
  DISCOUNT_CHANNEL_COMPARISON: "PARTIAL",
  DISCOUNT_HISTORY: "PARTIAL",
  DAILY_SALES: "SUPPORTED",
  SALES_TODAY_VS_YESTERDAY: "PARTIAL",
  SALES_SAME_DAY_PRIOR_MONTH: "PARTIAL",
  SALES_BY_WEEKDAY: "PARTIAL",
  SALES_MOMENTUM: "CONTRACT_MISSING",
  REQUIRED_DAILY_PACE: "PARTIAL",
  TARGET_GAP: "PARTIAL",
  CHANNEL_GROWTH_CONTRIBUTION: "PARTIAL",
  CHANNEL_DECLINE_CONTRIBUTION: "PARTIAL",
  FORECAST_CLOSE: "SUPPORTED",
  OPEN_PRONOSTICO: "SUPPORTED",
  FORECAST_TARGET_COMPARISON: "PARTIAL",
  TARGET_RECOVERY_REQUIREMENT: "PARTIAL",
  FORECAST_SCENARIOS: "CONTRACT_MISSING",
  LOST_CLIENT_RECOVERY_SCENARIO: "PARTIAL",
  CLIENT_CONCENTRATION: "PARTIAL",
  CLIENT_DECLINE_CONTRIBUTION: "PARTIAL",
  CLIENT_GROWTH_CONTRIBUTION: "PARTIAL",
  PROFITABILITY_STATUS: "SUPPORTED",
  PROFITABILITY_DRIVERS: "PARTIAL",
  MONTH_OVER_MONTH_EXECUTIVE: "PARTIAL",
  BEST_WORST_MONTH: "PARTIAL",
  MONTHS_BELOW_TARGET: "PARTIAL",
  RESULT_RECOVERY_SCENARIO: "CONTRACT_MISSING",
  EXPENSE_RANKING: "SUPPORTED",
  EXPENSE_GROWTH: "PARTIAL",
  SUPPLIER_SPEND: "PARTIAL",
  UNIT_COST: "SOURCE_MISSING",
  UNIT_EXPENSE: "PARTIAL",
  EXPENSE_OUTLIERS: "CONTRACT_MISSING",
  RECURRING_EXPENSE: "PARTIAL",
  NEW_EXPENSE_CONCEPTS: "PARTIAL",
  EXPENSE_YOY: "PARTIAL",
  OVERDUE_ACTIONS: "SUPPORTED",
  ACTIONS_BY_RESPONSIBLE: "SUPPORTED",
  STALE_ACTIONS: "PARTIAL",
  RECURRING_ACTIONS: "CONTRACT_MISSING",
  STALLED_COMMITMENTS: "CONTRACT_MISSING",
  COMMERCIAL_ACTIONS: "PARTIAL",
  SAFETY_ACTIONS: "PARTIAL",
  ISSUE_ORIGIN: "PARTIAL",
  PRIOR_OCCURRENCE: "PARTIAL",
  PRIOR_DECISION: "PARTIAL",
  PRIOR_ACTIONS: "PARTIAL",
  ACTION_EFFECTIVENESS: "CONTRACT_MISSING",
  RECURRING_ISSUES: "PARTIAL",
  DELAYED_PROJECTS: "PARTIAL",
  PROJECTS_DUE_SOON: "CONTRACT_MISSING",
  STALE_PROJECTS: "CONTRACT_MISSING",
  PROJECT_OPEN_ACTIONS: "PARTIAL",
  BLOCKED_PROJECTS: "SOURCE_MISSING",
  EXPIRED_EQUIPMENT: "SUPPORTED",
  EQUIPMENT_DUE: "SUPPORTED",
  STATION_PENDING: "PARTIAL",
  EXTINGUISHER_ATTENTION: "SUPPORTED",
  OPERATIONAL_SIGNALS: "PARTIAL",
  RECOVERABLE_VOLUME_CANDIDATES: "PARTIAL",
  CLIENT_GROWTH_CANDIDATES: "PARTIAL",
  COMMERCIAL_VISIT_CANDIDATES: "PARTIAL",
  DISCOUNT_REVIEW_CANDIDATES: "PARTIAL",
  MOVEMENT_DISCOUNT_CROSS: "PARTIAL",
  MOVEMENT_ACTION_CROSS: "PARTIAL",
  MOVEMENT_FREQUENCY_CROSS: "PARTIAL",
  MOVEMENT_INCOME_CROSS: "PARTIAL",
  EXECUTIVE_STATUS: "SUPPORTED",
  EXECUTIVE_DIAGNOSIS: "PARTIAL",
  CLIENT_REVIEW_CANDIDATES: "PARTIAL",
  EXECUTIVE_RISK_SIGNALS: "PARTIAL",
  EXECUTIVE_OPPORTUNITIES: "PARTIAL",
  CLIENT_CHURN_RISK: "PARTIAL",
  EXPECTED_NEXT_PURCHASE: "PARTIAL",
  NEW_CLIENT_RETENTION: "SUPPORTED",
  CLIENT_CHURN_RATE: "SUPPORTED",
  CLIENT_PARETO: "SUPPORTED",
  SALES_MIX_SHIFT: "SUPPORTED",
  FORECAST_ACCURACY: "SOURCE_MISSING",
  DATA_FRESHNESS: "PARTIAL",
  COMMERCIAL_ANOMALIES: "CONTRACT_MISSING",
  SINCE_LAST_REVIEW: "PARTIAL",
  SALES_CHANNEL_SHARE: "PARTIAL",
  SALES_CHANNEL_SHARE_CHANGE: "SUPPORTED",
  TOP_CLIENTS_PROJECTED_SHARE: "SUPPORTED",
  TOP_CLIENTS_PROJECTED_CONCENTRATION: "SUPPORTED",
});

function limitationForFamily(family) {
  return LIMITATION[family] || null;
}

function statusForFamily(family) {
  return FAMILY_STATUS[family] || "NOT_IMPLEMENTED";
}

module.exports = {
  FAMILY_IDS,
  LIMITATION,
  FAMILY_STATUS,
  classifyExecutiveFamily,
  limitationForFamily,
  statusForFamily,
  isOpenPronosticoQuestion,
  extractOpenPronosticoSpec,
  isForecastValueAsk,
  normalize,
};
