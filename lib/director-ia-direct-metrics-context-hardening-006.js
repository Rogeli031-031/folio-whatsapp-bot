"use strict";

/**
 * Endurecimiento 006 — métricas directas IGF + contexto conversacional.
 * Las 30 formas por familia viven en test/fixtures. No es phrasebook de producción.
 *
 * HG vs HG$ (documentado antes de implementar):
 * - HG ($/kg) / HG$ → campo físico `hg_kg`. Unidad MXN/kg.
 *   Es la columna de pesos por kilo. "¿Qué HG tenemos?" usa este campo.
 * - HG (%) → campo físico `hg_pct`. Unidad %. No se mezcla con hg_kg.
 * - No existe una columna distinta llamada HG$. HG$ es la etiqueta de `hg_kg`.
 *
 * Comisión (contrato humano):
 * - "comisión" es alias ejecutivo del valor IGF DESC./DESCUENTO (`com_desc_kg`).
 * - No es canal Comisionista.
 */

function runtime005() {
  return require("./director-ia-commercial-runtime-hardening-005");
}

function isContextualNewClientCountQuestion(question) {
  return runtime005().isContextualNewClientCountQuestion(question);
}

function isChurnRiskMaterializationQuestion(question) {
  return runtime005().isChurnRiskMaterializationQuestion(question);
}

function isExpectedNextPurchaseMaterializationQuestion(question) {
  return runtime005().isExpectedNextPurchaseMaterializationQuestion(question);
}

const FAMILY_IDS = Object.freeze([
  "IGF_DISCOUNT_CURRENT",
  "IGF_DISCOUNT_PROJECTED",
  "IGF_COMMISSION_CURRENT",
  "IGF_COMMISSION_PROJECTED",
  "IGF_HG_CURRENT",
  "IGF_HG_PROJECTED",
  "IGF_CORPORATE_EXPENSE_CURRENT",
  "IGF_CORPORATE_EXPENSE_PROJECTED",
  "IGF_PROFITABILITY",
  "CONTEXTUAL_NEW_CLIENT_COUNT",
  "RESULT_SET_PRONOUN_REFERENCE",
  "CHURN_RISK_NONEMPTY",
  "EXPECTED_NEXT_PURCHASE_NONEMPTY",
]);

const IGF_HG_FIELD_CONTRACT = Object.freeze({
  HG: {
    physical_key: "hg_kg",
    excel_headers: Object.freeze(["HG ($/kg)", "HG - $/Kg"]),
    unit: "MXN/kg",
    meaning: "HG en pesos por kilogramo. Responde «qué HG tenemos».",
  },
  "HG$": {
    physical_key: "hg_kg",
    alias_of: "HG",
    unit: "MXN/kg",
    meaning: "Etiqueta monetaria de la misma columna física hg_kg. No es un importe aparte.",
  },
  HG_PCT: {
    physical_key: "hg_pct",
    excel_headers: Object.freeze(["HG (%)", "HG - %"]),
    unit: "%",
    meaning: "HG porcentual. No se mezcla con hg_kg.",
  },
  default_for_bare_hg_question: "hg_kg",
});

const IGF_DIRECT_METRICS = Object.freeze([
  "DISCOUNT",
  "COMMISSION",
  "HG",
  "CORPORATE_EXPENSE",
  "OPERATING_EXPENSE",
  "TOTAL_EXPENSE",
  "MARGIN",
  "TAX",
  "PROFITABILITY",
  "OPERATING_PROFIT",
  "FINAL_RESULT",
  "SALES",
]);

const OUTCOME = Object.freeze({
  RESULT_WITH_EVIDENCE: "RESULT_WITH_EVIDENCE",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
  CLARIFICATION_REQUIRED: "CLARIFICATION_REQUIRED",
});

const MONTH_NAMES = Object.freeze({
  "01": "enero",
  "02": "febrero",
  "03": "marzo",
  "04": "abril",
  "05": "mayo",
  "06": "junio",
  "07": "julio",
  "08": "agosto",
  "09": "septiembre",
  10: "octubre",
  11: "noviembre",
  12: "diciembre",
});

function nq(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isComisionistaChannelQuestion(question) {
  const n = nq(question);
  return /\bcomisionistas?\b/.test(n);
}

function isProjectedCue(question) {
  const n = nq(question);
  return Boolean(
    /\bproyectad[oa]s?\b/.test(n) ||
      /\bproyectamos\b/.test(n) ||
      /\bproyecta\b/.test(n) ||
      /\bforecast\b/.test(n) ||
      /\bal\s+cierre\b/.test(n) ||
      /\bcerrara\b/.test(n) ||
      /\besperamos\b/.test(n) ||
      /\bestimad[oa]\b/.test(n) ||
      /\bestima\b/.test(n) ||
      /\bproyeccion\b/.test(n)
  );
}

function isCurrentCue(question) {
  const n = nq(question);
  return Boolean(
    /\bactual\b/.test(n) ||
      /\ba\s+la\s+fecha\b/.test(n) ||
      /\bllevamos\b/.test(n) ||
      /\btenemos\b/.test(n) ||
      /\bhoy\b/.test(n)
  );
}

function isNewDomainExplicit(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\bdisminuy/.test(n) || /\bbajaron\b/.test(n)) return true;
  if (isComisionistaChannelQuestion(question) && !/\bcomision\b/.test(n)) return true;
  if (/\bnuevos?\b/.test(n) && /\b(clientes?|cuentas?|entraron)\b/.test(n)) return true;
  if (/\bpronostico\b/.test(n) && /\babre\b/.test(n)) return true;
  return false;
}

function isResultSetPronounReference(question) {
  const n = nq(question);
  if (!n) return false;
  if (isNewDomainExplicit(question)) return false;
  return Boolean(
    /\bpor\s+ellos\b/.test(n) ||
      /\bcon\s+ellos\b/.test(n) ||
      /\bellos\b/.test(n) ||
      /\besos\s+clientes\b/.test(n) ||
      /\besos\b/.test(n) ||
      /\blos\s+anteriores\b/.test(n) ||
      /\blos\s+que\s+mencionaste\b/.test(n) ||
      /\blos\s+de\s+arriba\b/.test(n) ||
      /\bese\s+grupo\b/.test(n) ||
      /\bese\s+conjunto\b/.test(n)
  );
}

function shouldKeepPriorMovement(question, prior) {
  if (!prior || !prior.movement) return false;
  const n = nq(question);
  if (/\bdisminuy/.test(n) || (/\bbajaron\b/.test(n) && !isResultSetPronounReference(question))) {
    return false;
  }
  return isResultSetPronounReference(question) || /\bdejamos\s+de\s+vender\b/.test(n);
}

function neverConvertDejaronToDisminuyeron(question, priorMovement) {
  if (priorMovement !== "DEJARON_DE_COMPRAR") return false;
  const n = nq(question);
  if (/\bdisminuy/.test(n) && !isResultSetPronounReference(question)) return false;
  return isResultSetPronounReference(question) || /\bdejamos\s+de\s+vender\b/.test(n) || /\bperdimos\b/.test(n);
}

function isIgfDiscountQuestion(question) {
  const n = nq(question);
  if (!n || (!/\bdescuento/.test(n) && !/\bdesc\b/.test(n))) return false;
  if (/\bnuevos?\b/.test(n)) return false;
  if (/\bayer\b/.test(n) || /\bdiario\b/.test(n)) return false;
  if (isComisionistaChannelQuestion(question)) return false;
  if (/\btop\b/.test(n) || /\branking\b/.test(n)) return false;
  if (/\bmayor\s+descuento\b/.test(n) || /\bmenor\s+descuento\b/.test(n)) return false;
  if (/\bentre\b/.test(n)) return false;
  if (/\btiene\b/.test(n) && !/\btenemos\b/.test(n)) return false;
  if (/\bclientes?\b/.test(n) && !/\b(tenemos|llevamos|actual|hoy)\b/.test(n)) return false;
  return true;
}

function isIgfCommissionQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isComisionistaChannelQuestion(question)) return false;
  if (/\bcomisionista/.test(n)) return false;
  return Boolean(
    /\bcomision\b/.test(n) ||
      /\bcomisiones\b/.test(n) ||
      /\bcuanto\s+tenemos\s+de\s+comision\b/.test(n) ||
      /\bcual\s+es\s+la\s+comision\b/.test(n)
  );
}

function isIgfHgQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\bhg\s*%/.test(n) || /\bhg\s+por\s+ciento\b/.test(n) || /\bhg\s+porcent/.test(n)) return false;
  return Boolean(/\bhg\b/.test(n) || /\bhg\$/.test(n) || /\bhg\s+\$/.test(n));
}

function isIgfHgPctQuestion(question) {
  const n = nq(question);
  return /\bhg\s*%/.test(n) || /\bhg\s+por\s+ciento\b/.test(n) || /\bhg\s+porcent/.test(n);
}

function isIgfCorporateExpenseQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\boperativ/.test(n) && !/\bcorporativ/.test(n)) return false;
  return Boolean(
    /\bgasto(?:s)?\s+corporativ/.test(n) ||
      /\bcorporativ/.test(n) ||
      /\bgtos\/apoyos\s+corp\b/.test(n) ||
      /\bapoyos\s+corporativ/.test(n)
  );
}

function isIgfOperatingExpenseQuestion(question) {
  const n = nq(question);
  return /\bgasto(?:s)?\s+operativ/.test(n) || (/\boperativos\b/.test(n) && /\bgasto/.test(n));
}

function isIgfTotalExpenseQuestion(question) {
  const n = nq(question);
  return (/\bgasto\s+total\b/.test(n) || /\btotal\s+de\s+gasto/.test(n)) && !/\bcorporativ/.test(n);
}

function isIgfMarginQuestion(question) {
  const n = nq(question);
  if (!n || !/\bmargen\b/.test(n)) return false;
  if (/\brentabilidad\b/.test(n) || /\butilidad\b/.test(n) || /\bresultado\s+final\b/.test(n)) return false;
  if (/\bmayo\b/.test(n) && /\bfue\b/.test(n)) return false;
  return true;
}

function isIgfTaxQuestion(question) {
  const n = nq(question);
  return /\bimpuesto/.test(n);
}

function isIgfSalesQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\bdescuento/.test(n) || /\bcomision/.test(n) || /\bhg\b/.test(n)) return false;
  return /\bventa(?:s)?\b/.test(n) && (/\btenemos\b/.test(n) || /\bproyectad/.test(n) || /\bcual\s+es\s+la\s+venta\b/.test(n));
}

function isIgfProfitabilityQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\bmargen\b/.test(n) && !/\brentabilidad\b/.test(n)) return false;
  if (/\bresultado\s+final\b/.test(n) && !/\brentabilidad\b/.test(n)) return false;
  if (/\butilidad\s+operativ/.test(n) && !/\brentabilidad\b/.test(n)) return false;
  return /\brentabilidad\b/.test(n);
}

function isIgfOperatingProfitQuestion(question) {
  const n = nq(question);
  return /\butilidad\s+operativ/.test(n);
}

function isIgfFinalResultQuestion(question) {
  const n = nq(question);
  return /\bresultado\s+final\b/.test(n);
}

function igfDirectMetricId(question) {
  if (isIgfCommissionQuestion(question)) return "COMMISSION";
  if (isIgfDiscountQuestion(question)) return "DISCOUNT";
  if (isIgfHgPctQuestion(question)) return "HG_PCT";
  if (isIgfHgQuestion(question)) return "HG";
  if (isIgfCorporateExpenseQuestion(question)) return "CORPORATE_EXPENSE";
  if (isIgfOperatingExpenseQuestion(question)) return "OPERATING_EXPENSE";
  if (isIgfTotalExpenseQuestion(question)) return "TOTAL_EXPENSE";
  if (isIgfTaxQuestion(question)) return "TAX";
  if (isIgfSalesQuestion(question)) return "SALES";
  if (isIgfOperatingProfitQuestion(question) && !isIgfProfitabilityQuestion(question)) return "OPERATING_PROFIT";
  if (isIgfFinalResultQuestion(question) && !isIgfProfitabilityQuestion(question)) return "FINAL_RESULT";
  if (isIgfMarginQuestion(question)) return "MARGIN";
  if (isIgfProfitabilityQuestion(question)) return "PROFITABILITY";
  return null;
}

function isIgfDirectMetricQuestion(question) {
  const metric = igfDirectMetricId(question);
  if (!metric) return false;
  if (metric === "PROFITABILITY" || metric === "OPERATING_PROFIT" || metric === "FINAL_RESULT") {
    return false;
  }
  return true;
}

function isChurnRisk006(question) {
  const n = nq(question);
  if (isExpectedNext006(question) && !/\bquien(?:es)?\b/.test(n) && !/\bque\s+clientes\b/.test(n) && !/\bque\s+cuentas\b/.test(n)) {
    return false;
  }
  return (
    isChurnRiskMaterializationQuestion(question) ||
    /\briesgo\s+de\s+abandono\b/.test(n) ||
    /\blistado\s+de\s+riesgo\b/.test(n) ||
    /\bclientes\s+con\s+retraso\b/.test(n) ||
    /\bsenal\s+dicf\b/.test(n) ||
    /\bsuper[oó]\s+su\s+frecuencia\b/.test(n) ||
    /\bfuera\s+de\s+freqdays\b/.test(n) ||
    /\batraso\s+de\s+compra\b/.test(n) ||
    /\bcuentas\s+con\s+interrupcion\b/.test(n)
  );
}

function isExpectedNext006(question) {
  const n = nq(question);
  if (/\bquien(?:es)?\b/.test(n) || /\bque\s+clientes\b/.test(n) || /\bque\s+cuentas\b/.test(n)) return false;
  return (
    isExpectedNextPurchaseMaterializationQuestion(question) ||
    /\bexpected\s+next\b/.test(n) ||
    /\bnext\s+purchase\b/.test(n) ||
    /\brecompra\b/.test(n) ||
    /\bciclo\s+de\s+compra\b/.test(n) ||
    /\bretorna\b/.test(n) ||
    /\breaparecer\b/.test(n) ||
    /\bsiguiente\s+compra\b/.test(n) ||
    /\bfecha\s+last\b/.test(n) ||
    /\bestimacion\s+puntual\b/.test(n) ||
    /\bproxima\s+fecha\b/.test(n) ||
    /\bciclo\s+de\s+erick\b/.test(n) ||
    /\ble\s+corresponde\s+comprar\b/.test(n) ||
    /\bse\s+espera\s+a\b/.test(n)
  );
}

function isBareMonthAnswer(question) {
  const n = nq(question);
  return /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)$/.test(n);
}

function classifyDirectMetricsFamily(question, prior) {
  if (isResultSetPronounReference(question)) return "RESULT_SET_PRONOUN_REFERENCE";
  if (
    prior &&
    (prior.pending_operation === "COUNT" || prior.want_count || prior.family === "CONTEXTUAL_NEW_CLIENT_COUNT") &&
    isBareMonthAnswer(question)
  ) {
    return "CONTEXTUAL_NEW_CLIENT_COUNT";
  }
  if (isExpectedNext006(question) && !isChurnRisk006(question)) {
    return "EXPECTED_NEXT_PURCHASE_NONEMPTY";
  }
  if (isChurnRisk006(question)) return "CHURN_RISK_NONEMPTY";
  if (isContextualNewClientCountQuestion(question)) return "CONTEXTUAL_NEW_CLIENT_COUNT";
  const metric = igfDirectMetricId(question);
  const projected = isProjectedCue(question);
  if (metric === "DISCOUNT") return projected ? "IGF_DISCOUNT_PROJECTED" : "IGF_DISCOUNT_CURRENT";
  if (metric === "COMMISSION") return projected ? "IGF_COMMISSION_PROJECTED" : "IGF_COMMISSION_CURRENT";
  if (metric === "HG") return projected ? "IGF_HG_PROJECTED" : "IGF_HG_CURRENT";
  if (metric === "CORPORATE_EXPENSE") return projected ? "IGF_CORPORATE_EXPENSE_PROJECTED" : "IGF_CORPORATE_EXPENSE_CURRENT";
  if (metric === "PROFITABILITY") return "IGF_PROFITABILITY";
  if (prior && prior.family && FAMILY_IDS.includes(prior.family) && isResultSetPronounReference(question)) {
    return "RESULT_SET_PRONOUN_REFERENCE";
  }
  return null;
}

function yearMonthFromNow(now) {
  const d = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  return `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}`;
}

function formatPeriodLabel(period) {
  const m = String(period || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return "el periodo vigente";
  const name = MONTH_NAMES[m[2]] || m[2];
  return `${name} de ${m[1]}`;
}

function extractNamedPeriod(question, now) {
  const n = nq(question);
  const months = {
    enero: "01",
    febrero: "02",
    marzo: "03",
    abril: "04",
    mayo: "05",
    junio: "06",
    julio: "07",
    agosto: "08",
    septiembre: "09",
    setiembre: "09",
    octubre: "10",
    noviembre: "11",
    diciembre: "12",
  };
  for (const [name, mm] of Object.entries(months)) {
    if (new RegExp(`\\b${name}\\b`).test(n)) {
      const yearM = n.match(/\b(20\d{2})\b/);
      const year = yearM ? yearM[1] : yearMonthFromNow(now).slice(0, 4);
      return `${year}-${mm}`;
    }
  }
  const ym = n.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
  return ym ? ym[0] : null;
}

function extractIgfDirectMetric(question, opts = {}) {
  const metric = igfDirectMetricId(question);
  const now = opts.now;
  const period = extractNamedPeriod(question, now) || (opts.prior && opts.prior.period) || yearMonthFromNow(now);
  const projected = isProjectedCue(question);
  const current = isCurrentCue(question);
  let tense = "current";
  if (projected && !current) tense = "projected";
  else if (projected && current) tense = "projected";
  else if (!projected && !current) tense = "current";
  const hgField = isIgfHgPctQuestion(question) ? "hg_pct" : IGF_HG_FIELD_CONTRACT.default_for_bare_hg_question;
  return {
    ok: Boolean(metric),
    intent: "igf_direct_metric",
    metric,
    tense,
    period,
    period_label: formatPeriodLabel(period),
    hg_physical_key: hgField,
    commission_aliases_discount: metric === "COMMISSION",
    short_answer: true,
  };
}

function formatMxnKg(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return `${Number(value).toFixed(2)} MXN/kg`;
}

function formatMxn(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const n = Math.round(Number(value));
  const abs = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return n < 0 ? `-$${abs}` : `$${abs}`;
}

function formatTons(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return `${Number(value).toFixed(1)} t`;
}

function pickMetricValue(metric, values, tense) {
  const bag = values && typeof values === "object" ? values : {};
  const source = tense === "projected" ? bag.projected || bag : bag.current || bag;
  const fallback = tense === "projected" ? bag.current : bag.projected;
  const key =
    metric === "COMMISSION" || metric === "DISCOUNT"
      ? "com_desc_kg"
      : metric === "HG"
        ? "hg_kg"
        : metric === "HG_PCT"
          ? "hg_pct"
          : metric === "CORPORATE_EXPENSE"
            ? bag.corporativos != null || (source && source.corporativos != null)
              ? "corporativos"
              : "gtos_apoyos_corp_kg"
            : metric === "OPERATING_EXPENSE"
              ? bag.operativos != null || (source && source.operativos != null)
                ? "operativos"
                : "gasto_kg"
              : metric === "TOTAL_EXPENSE"
                ? "gasto"
                : metric === "MARGIN"
                  ? "margen_kg"
                  : metric === "TAX"
                    ? "impuesto_kg"
                    : metric === "SALES"
                      ? "venta_ton"
                      : metric === "OPERATING_PROFIT" || metric === "PROFITABILITY"
                        ? bag.util_oper_importe != null || (source && source.util_oper_importe != null)
                          ? "util_oper_importe"
                          : "util_oper_kg"
                        : metric === "FINAL_RESULT"
                          ? bag.resultado_final_importe != null || (source && source.resultado_final_importe != null)
                            ? "resultado_final_importe"
                            : "resultado_final_kg"
                          : null;
  if (!key) return { value: null, key: null, onlyProjected: false };
  const fromSource = source && source[key] != null ? source[key] : bag[key];
  if (fromSource != null) return { value: fromSource, key, onlyProjected: tense !== "projected" && source === bag.projected };
  if (fallback && fallback[key] != null) {
    return { value: fallback[key], key, onlyProjected: tense === "current" };
  }
  return { value: null, key, onlyProjected: false };
}

function metricNoun(metric) {
  if (metric === "COMMISSION") return "comisión";
  if (metric === "DISCOUNT") return "descuento";
  if (metric === "HG") return "HG";
  if (metric === "HG_PCT") return "HG %";
  if (metric === "CORPORATE_EXPENSE") return "gasto corporativo";
  if (metric === "OPERATING_EXPENSE") return "gasto operativo";
  if (metric === "TOTAL_EXPENSE") return "gasto total";
  if (metric === "MARGIN") return "margen";
  if (metric === "TAX") return "impuesto";
  if (metric === "SALES") return "venta";
  if (metric === "PROFITABILITY") return "rentabilidad";
  if (metric === "OPERATING_PROFIT") return "utilidad operativa";
  if (metric === "FINAL_RESULT") return "resultado final";
  return "métrica";
}

function formatMetricValue(metric, value) {
  if (metric === "CORPORATE_EXPENSE" || metric === "OPERATING_EXPENSE" || metric === "TOTAL_EXPENSE") {
    if (Math.abs(Number(value)) >= 10) return formatMxn(value);
    return formatMxnKg(value);
  }
  if (metric === "PROFITABILITY" || metric === "OPERATING_PROFIT" || metric === "FINAL_RESULT") {
    if (Math.abs(Number(value)) >= 10) return formatMxn(value);
    return formatMxnKg(value);
  }
  if (metric === "SALES") return formatTons(value);
  if (metric === "HG_PCT") return `${Number(value).toFixed(2)}%`;
  return formatMxnKg(value);
}

function buildIgfDirectMetricAnswer(spec, values, opts = {}) {
  const metric = spec && spec.metric;
  if (!metric) {
    return ensureNonEmptyAnswer(null, OUTCOME.INSUFFICIENT_EVIDENCE, "INSUFFICIENT_EVIDENCE: no identifiqué la métrica IGF.");
  }
  const tense = (spec && spec.tense) || "current";
  const periodLabel = (spec && spec.period_label) || formatPeriodLabel(spec && spec.period);
  const picked = pickMetricValue(metric, values, tense);
  if (picked.value == null || !Number.isFinite(Number(picked.value))) {
    return ensureNonEmptyAnswer(
      null,
      OUTCOME.INSUFFICIENT_EVIDENCE,
      `INSUFFICIENT_EVIDENCE: no hay cifra IGF defendible de ${metricNoun(metric)} para ${periodLabel}.`
    );
  }
  const formatted = formatMetricValue(metric, picked.value);
  const noun = metricNoun(metric);
  let sentence;
  if (metric === "CORPORATE_EXPENSE") {
    sentence =
      tense === "projected" || picked.onlyProjected
        ? `Gastos corporativos proyectados de ${periodLabel}: ${formatted}.`
        : `El gasto corporativo de ${periodLabel} es ${formatted}.`;
  } else if (metric === "COMMISSION") {
    sentence =
      tense === "projected"
        ? `La comisión proyectada de ${periodLabel} es ${formatted}.`
        : `La comisión de ${periodLabel} es ${formatted}.`;
  } else if (metric === "DISCOUNT") {
    sentence =
      tense === "projected"
        ? `El descuento proyectado de ${periodLabel} es ${formatted}.`
        : `El descuento de ${periodLabel} es ${formatted}.`;
  } else if (metric === "HG") {
    sentence =
      tense === "projected"
        ? `El HG proyectado de ${periodLabel} es ${formatted}.`
        : `El HG de ${periodLabel} es ${formatted}.`;
  } else {
    const art = /^[aeiouáéíóú]/i.test(noun) ? "El" : noun === "venta" ? "La" : "El";
    sentence =
      tense === "projected"
        ? `${art} ${noun} proyectad${noun.endsWith("a") ? "a" : "o"} de ${periodLabel} es ${formatted}.`
        : `${art} ${noun} de ${periodLabel} es ${formatted}.`;
  }
  if (picked.onlyProjected && tense === "current") {
    sentence += " Esta cifra solo existe como proyectada; no hay valor actual a la fecha.";
  }
  const banned = /MATERIALIDAD COMERCIAL|Action Register|\bDICF\b|Bitácora|diagnóstico completo/i;
  if (banned.test(sentence)) {
    sentence = sentence.replace(banned, "").replace(/\s+/g, " ").trim();
  }
  return ensureNonEmptyAnswer(sentence, OUTCOME.RESULT_WITH_EVIDENCE, sentence);
}

function valuesFromMiniRow(row, auth) {
  const read = (camel, authKey) => {
    if (row && row[camel] != null && row[camel] !== "") return Number(row[camel]);
    if (auth && auth[authKey] != null && auth[authKey] !== "") return Number(auth[authKey]);
    return null;
  };
  return {
    com_desc_kg: read("comDesc", "desc_kg"),
    hg_kg: read("hgKg", "hg_kg"),
    hg_pct: read("hgPct", "hg_pct"),
    margen_kg: read("margen", "margen"),
    impuesto_kg: read("impuestos", "impuestos"),
    venta_ton: read("ventaTon", "venta_ton"),
    corporativos: read("corporativos", "corporativos"),
    operativos: read("operativos", "operativos"),
    gasto: read("gasto", "gasto"),
    gtos_apoyos_corp_kg: read("gtosApoyosCorpKg", "gtos_apoyos_corp_kg"),
    util_oper_importe: read("utilOperImporte", "util_oper_importe"),
    util_oper_kg: read("utilOperKg", "util_oper_kg"),
    resultado_final_importe: read("resultadoFinalImporte", "resultado_final_importe"),
    resultado_final_kg: read("resultadoFinalKg", "resultado_final_kg"),
  };
}

function igfCompositionValue(composition, key) {
  const lines = composition && Array.isArray(composition.lines) ? composition.lines : [];
  const found = lines.find((l) => l && (l.line_key === key || l.key === key));
  if (!found || found.value == null || found.value === "") return null;
  const n = Number(found.value);
  return Number.isFinite(n) ? n : null;
}

function valuesFromSnapshot(assembled) {
  const igf = assembled && assembled.igf;
  const composition = igf && igf.composition;
  if (!composition) return {};
  const keys = [
    "com_desc_kg",
    "hg_kg",
    "hg_pct",
    "margen_kg",
    "impuesto_kg",
    "venta_ton",
    "gtos_apoyos_corp_kg",
    "gasto_kg",
    "util_oper_kg",
    "util_oper_importe",
    "resultado_final_kg",
    "resultado_final_importe",
  ];
  const out = {};
  for (const key of keys) out[key] = igfCompositionValue(composition, key);
  return out;
}

function persistResultSet(spec, rows) {
  const ids = (rows || []).map((r) => String((r && (r.cliente || r.id)) || "").trim()).filter(Boolean).slice(0, 80);
  return {
    result_set_family: (spec && spec.movement) || null,
    result_set_period: (spec && spec.period) || null,
    result_set_ids: ids,
    result_set_operation: (spec && spec.pending_operation) || (spec && spec.want_count ? "COUNT" : spec && spec.want_aggregate ? "AGGREGATE" : "RANK"),
  };
}

function filterRowsByResultSet(rows, resultSetIds) {
  if (!Array.isArray(resultSetIds) || !resultSetIds.length) return rows || [];
  const set = new Set(resultSetIds.map((n) => String(n).trim().toLowerCase()));
  return (rows || []).filter((r) => set.has(String((r && r.cliente) || "").trim().toLowerCase()));
}

function ensureNonEmptyAnswer(answer, outcome, fallback) {
  const text = String(answer == null ? "" : answer).trim();
  const tag = outcome || (text ? OUTCOME.RESULT_WITH_EVIDENCE : OUTCOME.INSUFFICIENT_EVIDENCE);
  const body = text || String(fallback || "INSUFFICIENT_EVIDENCE: no pude materializar la respuesta. No invento cifras.").trim();
  if (!body) {
    return `${OUTCOME.INSUFFICIENT_EVIDENCE}: no pude materializar la respuesta. No invento cifras.`;
  }
  if (
    body.startsWith(OUTCOME.RESULT_WITH_EVIDENCE) ||
    body.startsWith(OUTCOME.INSUFFICIENT_EVIDENCE) ||
    body.startsWith(OUTCOME.CLARIFICATION_REQUIRED)
  ) {
    return body;
  }
  if (tag === OUTCOME.RESULT_WITH_EVIDENCE) return `${OUTCOME.RESULT_WITH_EVIDENCE}: ${body}`;
  if (tag === OUTCOME.CLARIFICATION_REQUIRED) return `${OUTCOME.CLARIFICATION_REQUIRED}: ${body}`;
  return body.includes("INSUFFICIENT_EVIDENCE") ? body : `${OUTCOME.INSUFFICIENT_EVIDENCE}: ${body}`;
}

function neverEmptyPredictiveAnswer(answer, family) {
  const text = String(answer == null ? "" : answer).trim();
  if (text) {
    if (
      text.startsWith(OUTCOME.RESULT_WITH_EVIDENCE) ||
      text.startsWith(OUTCOME.INSUFFICIENT_EVIDENCE) ||
      text.startsWith(OUTCOME.CLARIFICATION_REQUIRED) ||
      /INSUFFICIENT_EVIDENCE|CLARIFICATION_REQUIRED/.test(text)
    ) {
      return text;
    }
    return `${OUTCOME.RESULT_WITH_EVIDENCE}: ${text}`;
  }
  if (family === "EXPECTED_NEXT_PURCHASE" || family === "EXPECTED_NEXT_PURCHASE_NONEMPTY") {
    return `${OUTCOME.INSUFFICIENT_EVIDENCE}: falta freqDays o last_purchase_date. No invento la fecha.`;
  }
  return `${OUTCOME.INSUFFICIENT_EVIDENCE}: no hay clientes con retraso respecto de frecuencia histórica DICF. No afirmo que vayan a dejar de comprar.`;
}

function pendingFamilyForCount(movement) {
  if (movement === "NUEVOS") return "NUEVOS";
  return movement || "NUEVOS";
}

module.exports = {
  FAMILY_IDS,
  IGF_HG_FIELD_CONTRACT,
  IGF_DIRECT_METRICS,
  OUTCOME,
  nq,
  isResultSetPronounReference,
  shouldKeepPriorMovement,
  neverConvertDejaronToDisminuyeron,
  isIgfDirectMetricQuestion,
  isIgfCommissionQuestion,
  isIgfDiscountQuestion,
  isIgfHgQuestion,
  isComisionistaChannelQuestion,
  isProjectedCue,
  isCurrentCue,
  igfDirectMetricId,
  classifyDirectMetricsFamily,
  extractIgfDirectMetric,
  buildIgfDirectMetricAnswer,
  valuesFromMiniRow,
  valuesFromSnapshot,
  persistResultSet,
  filterRowsByResultSet,
  ensureNonEmptyAnswer,
  neverEmptyPredictiveAnswer,
  pendingFamilyForCount,
  formatPeriodLabel,
  yearMonthFromNow,
  isContextualNewClientCountQuestion,
  isChurnRiskMaterializationQuestion,
  isExpectedNextPurchaseMaterializationQuestion,
};
