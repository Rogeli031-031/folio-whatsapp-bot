"use strict";

/**
 * Endurecimiento comercial runtime 005.
 * Clasifica familias de prueba y helpers de evidencia/contexto.
 * No es phrasebook de producción: las 30 formas viven en test/fixtures.
 */

const {
  classifyCommercialRuntimeFamily,
  isNewClientDiscountQuestion,
  isLostClientVolumeTotalQuestion,
  isLostClientsListQuestion,
} = require("./director-ia-commercial-runtime-004");
const {
  isChannelForecastGuardrailQuestion,
  isChurnRiskQuestion,
  isExpectedNextPurchaseQuestion,
  isSalesChannelShareChangeQuestion,
  isChannelForecastProjectionGuardrailQuestion,
} = require("./director-ia-predictive-commercial");
const { isPeriodOnlyAnswer } = require("./director-ia-pending-completion");
const { normalize } = require("./director-ia-executive-backlog");

const FAMILY_IDS = Object.freeze([
  "CONTEXTUAL_NEW_CLIENT_COUNT",
  "NEW_CLIENT_DISCOUNT_EVIDENCE",
  "LOST_VOLUME_CONTEXTUAL_AGGREGATE",
  "PENDING_CLARIFICATION_OPERATION",
  "CHURN_RISK_MATERIALIZATION",
  "EXPECTED_NEXT_PURCHASE_MATERIALIZATION",
  "CHANNEL_SHARE_REFERENCE_PERIOD",
  "CHANNEL_FORECAST_PROJECTION_GUARDRAIL",
]);

function nq(raw) {
  return normalize(raw);
}

function isContextualNewClientCountQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\bdescuento/.test(n) || (/\btoneladas\b/.test(n) && /\bcompr/.test(n))) return false;
  if (/\bvolvieron\b/.test(n) || /\bretencion\b/.test(n)) return false;
  if (/\bperdida\b/.test(n) || /\bvolumen\b/.test(n) || /\bdescuento/.test(n)) return false;
  if (/\bquien(?:es)?\b/.test(n) && !/\bcuantos\b/.test(n) && !/\btotal\b/.test(n)) return false;
  if (/\blista\b/.test(n) || /\blistado\b/.test(n) || /\bnombres\b/.test(n)) return false;
  return Boolean(
    (/\btotal\b/.test(n) && /\bnuevos?\b/.test(n) && !/\b(compr|venta|kg|descuento)\b/.test(n)) ||
      (/\btotal\b/.test(n) && /\bcuentas?\b/.test(n) && /\bnuev/.test(n)) ||
      (/\bcuantos\b/.test(n) &&
        (/\b(nuevos?|entraron|fueron|cuentas)\b/.test(n) || /\ben\s+total\b/.test(n) || /\ben\s+ese\s+mes\b/.test(n)) &&
        !/\b(tonel|compraron|descuento|volvieron)\b/.test(n)) ||
      (/\bcuantas\b/.test(n) && /\bcuentas\b/.test(n)) ||
      /\bnumero\s+total\b/.test(n) ||
      /\bnumero\s+de\s+(clientes\s+)?nuevos\b/.test(n) ||
      /\bdame\s+el\s+(total|numero)\b/.test(n) ||
      /\by\s+cuantos\s+entraron\b/.test(n) ||
      /\bcuantos\s+nuevos\s+eran\b/.test(n) ||
      /\bcuantos\s+clientes\s+entraron\b/.test(n)
  );
}

function isNewClientDiscountEvidenceQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  const discount =
    /\bdescuento/.test(n) ||
    (/\bdimos\b/.test(n) && /\bnuevos?\b/.test(n)) ||
    /\bcobertura\s+de\s+descuento\b/.test(n) ||
    /\bfila\s+de\s+descuento\b/.test(n) ||
    /\bdata_not_found\b/.test(n);
  if (!discount) return false;
  if (/\bdejaron\b/.test(n) && !/\bnuevos?\b/.test(n)) return false;
  return true;
}

function isLostVolumeContextualAggregateQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\bbajaron\b/.test(n) || /\bdisminuy/.test(n)) return false;
  if (/\bquien(?:es)?\b/.test(n) && !/\bcuanto\b/.test(n) && !/\bcuantas\b/.test(n)) return false;
  if (/\bcompleta\s+el\s+periodo\b/.test(n) || /\bpendiente\s+de\s+mes\b/.test(n) || /\bperdida\s+agregada\b/.test(n)) {
    return false;
  }
  if (/\bdejamos\s+de\s+vender\b/.test(n)) return true;
  if (/\blost\s+volume\b/.test(n) && (/\bellos\b/.test(n) || /\besos\b/.test(n) || /\bcaidos?\b/.test(n))) return true;
  if (/\bperdida\s+total\b/.test(n) && !/\bdejaron\s+de\s+comprar\b/.test(n) && !/\bagregada\b/.test(n)) return true;
  if (/\bcuanto\s+volumen\b/.test(n) || /\bque\s+volumen\b/.test(n) || /\btoneladas\s+que\s+se\s+fueron\b/.test(n)) return true;
  if (/\bsuma\s+de\s+toneladas\b/.test(n) && /\bcayeron\b/.test(n)) return true;
  if (/\bvolumen\s+se\s+fue\b/.test(n)) return true;
  const lostSet =
    /\bellos\b/.test(n) ||
    /\besos\b/.test(n) ||
    /\bcaidos?\b/.test(n) ||
    /\bcayeron\s+a\s+cero\b/.test(n) ||
    /\bse\s+fueron\b/.test(n) ||
    /\bbajas\s+a\s+cero\b/.test(n) ||
    /\bcon\s+ellos\b/.test(n);
  const volume =
    /\bcuanto\s+perdimos\b/.test(n) ||
    /\bcuantas\s+toneladas\b/.test(n) ||
    /\btoneladas\s+se\s+fueron\b/.test(n) ||
    /\bvolumen\s+perdimos\b/.test(n) ||
    /\bcuanto\s+volumen\b/.test(n) ||
    /\bcuanto\s+representan\b/.test(n) ||
    /\bcuanto\s+cayo\b/.test(n) ||
    /\bque\s+volumen\s+dejaron\b/.test(n) ||
    /\bcuanto\s+suman\b/.test(n) ||
    /\bvolumen\s+perdido\b/.test(n);
  return lostSet && volume;
}

function isPendingClarificationOperationQuestion(question, prior) {
  const n = nq(question);
  if (!n) return false;
  if (prior && (prior.pending_operation || prior.want_aggregate || prior.pending_family === "LOST_VOLUME_TOTAL")) {
    if (isPeriodOnlyAnswer(question) || /^(agosto|julio|septiembre|junio|enero|febrero|marzo|abril|mayo|octubre|noviembre|diciembre)$/.test(n)) {
      return true;
    }
  }
  if (isLostVolumeContextualAggregateQuestion(question)) return false;
  if (/\b(agosto|julio|septiembre|junio)\b/.test(n) && !/\bde\s+que\s+mes\b/.test(n)) return false;
  if ((/\bquien(?:es)?\b/.test(n) && !/\b(perdida|volumen|perdimos|agregad)\b/.test(n)) || /\blista\b/.test(n) || /\btop\s+\d+\b/.test(n)) {
    return false;
  }
  const aggregateLost =
    (/\bcuanto\s+perdimos\b/.test(n) ||
      /\bperdida\s+agregada\b/.test(n) ||
      /\boperacion\s+de\s+perdida\b/.test(n) ||
      /\bvolumen\s+agregado\b/.test(n) ||
      /\bvolumen\s+perdido\s+agregado\b/.test(n) ||
      /\bagregado\s+de\s+perdida\b/.test(n) ||
      /\bagrega\s+la\s+perdida\b/.test(n) ||
      /\blost\s+volume\b/.test(n) ||
      /\bperdida\s+total\s+agregada\b/.test(n)) &&
    (/\bdejaron\b/.test(n) || /\bcaidos?\b/.test(n) || /\bperdida\s+agregada\b/.test(n) || /\bpendiente\b/.test(n));
  return Boolean(
    aggregateLost ||
      /\baclara\s+el\s+mes\s+para\s+la\s+perdida\b/.test(n) ||
      /\bcompleta\s+el\s+periodo\b/.test(n) ||
      /\bpendiente\s+de\s+mes\b/.test(n) ||
      /\boperacion\s+lost\s+volume\b/.test(n)
  );
}

function isChurnRiskMaterializationQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isExpectedNextPurchaseMaterializationQuestion(question) && !/\bquien(?:es)?\b/.test(n) && !/\bque\s+clientes\b/.test(n)) {
    return false;
  }
  return Boolean(
    isChurnRiskQuestion(question) ||
      /\bquien\s+esta\s+atrasado\b/.test(n) ||
      /\bque\s+clientes\s+deberian\s+haber\s+comprado\b/.test(n) ||
      /\bquien\s+lleva\s+demasiado\s+sin\s+comprar\b/.test(n) ||
      /\bmuestran\s+interrupcion\b/.test(n) ||
      /\bfuera\s+de\s+su\s+frecuencia\b/.test(n) ||
      /\bque\s+clientes\s+tienen\s+retraso\b/.test(n) ||
      /\bno\s+han\s+comprado\s+cuando\s+normalmente\b/.test(n) ||
      /\brompio\s+su\s+patron\b/.test(n) ||
      /\bcuentas\s+estan\s+atrasadas\b/.test(n) ||
      /\bsenal\s+de\s+interrupcion\b/.test(n) ||
      /\batrasados\s+de\s+compra\b/.test(n) ||
      /\binterrupcion\s+de\s+compra\b/.test(n) ||
      /\batrasados\b/.test(n) ||
      /\bretraso\s+dicf\b/.test(n) ||
      /\bdays\s+since\s+last\b/.test(n) ||
      /\bfuera\s+de\s+su\s+patron\b/.test(n) ||
      /\bdebieron\s+haber\s+comprado\b/.test(n) ||
      /\batraso\s+vs\s+frecuencia\b/.test(n) ||
      /\bdias\s+de\s+retraso\b/.test(n)
  );
}

function isExpectedNextPurchaseMaterializationQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\bquien(?:es)?\b/.test(n) || /\bque\s+clientes\b/.test(n) || /\bque\s+cuentas\b/.test(n)) return false;
  return Boolean(
    isExpectedNextPurchaseQuestion(question) ||
      /\bcuando\s+vuelve\b/.test(n) ||
      /\bcuando\s+deberia\s+comprar\s+otra\b/.test(n) ||
      /\bproxima\s+compra\s+estimada\b/.test(n) ||
      /\bcuando\s+le\s+toca\b/.test(n) ||
      /\bcuando\s+deberia\s+regresar\b/.test(n) ||
      /\bsiguiente\s+pedido\b/.test(n) ||
      /\bcuando\s+esperamos\s+que\s+compre\b/.test(n) ||
      /\besta\s+atrasado\b/.test(n) ||
      /\bpara\s+que\s+fecha\s+se\s+esperaba\b/.test(n) ||
      (/\bfrecuencia\s+historica\b/.test(n) && /\bcuando\b/.test(n)) ||
      /\bfecha\s+estimada\b/.test(n)
  );
}

function isChannelShareReferencePeriodQuestion(question, prior) {
  const n = nq(question);
  if (!n) return false;
  if (isChannelForecastProjectionGuardrailQuestion(question) || isChannelForecastGuardrailQuestion(question)) {
    return false;
  }
  const contra =
    /\bcontra\b/.test(n) ||
    /\bfrente\s+a\b/.test(n) ||
    /\bvs\b/.test(n) ||
    /\bversus\b/.test(n) ||
    /\brespecto\s+(de|a)\b/.test(n) ||
    /\bcomparado\s+con\b/.test(n);
  const month =
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(n);
  if (contra && month) return true;
  return isSalesChannelShareChangeQuestion(question) && contra;
}

function rowHasDiscountEvidence(row) {
  if (!row || typeof row !== "object") return false;
  if (row.discount_status === "DATA_NOT_FOUND") return false;
  if (row.hasDiscountRow === false || row.has_discount_row === false || row.has_discount_evidence === false) {
    return false;
  }
  if (row.hasDiscountRow === true || row.has_discount_row === true || row.has_discount_evidence === true) {
    return true;
  }
  if (row.discount_status === "OBSERVED" || row.discount_status === "ZERO_OBSERVED") return true;
  const monto = row.monto;
  if (monto == null) return false;
  const n = Number(monto);
  if (!Number.isFinite(n)) return false;
  if (n === 0) return false;
  return true;
}

function discountStatusForRow(row) {
  if (!rowHasDiscountEvidence(row)) return "DATA_NOT_FOUND";
  const monto = Number(row.monto);
  const descKg = row.descKg != null ? Number(row.descKg) : null;
  if ((Number.isFinite(monto) && monto === 0) || (descKg != null && descKg === 0)) return "ZERO_OBSERVED";
  return "OBSERVED";
}

function classifyHardeningFamily(question, prior) {
  if (isChannelForecastProjectionGuardrailQuestion(question)) return "CHANNEL_FORECAST_PROJECTION_GUARDRAIL";
  if (isExpectedNextPurchaseMaterializationQuestion(question) && !isChurnRiskMaterializationQuestion(question)) {
    return "EXPECTED_NEXT_PURCHASE_MATERIALIZATION";
  }
  if (isChurnRiskMaterializationQuestion(question)) return "CHURN_RISK_MATERIALIZATION";
  if (isNewClientDiscountEvidenceQuestion(question)) return "NEW_CLIENT_DISCOUNT_EVIDENCE";
  if (isPendingClarificationOperationQuestion(question, prior)) return "PENDING_CLARIFICATION_OPERATION";
  if (isLostVolumeContextualAggregateQuestion(question)) return "LOST_VOLUME_CONTEXTUAL_AGGREGATE";
  if (isContextualNewClientCountQuestion(question)) return "CONTEXTUAL_NEW_CLIENT_COUNT";
  if (isChannelShareReferencePeriodQuestion(question, prior)) return "CHANNEL_SHARE_REFERENCE_PERIOD";
  if (isExpectedNextPurchaseMaterializationQuestion(question)) return "EXPECTED_NEXT_PURCHASE_MATERIALIZATION";
  return null;
}

function inheritedPeriodFromPrior(prior) {
  if (!prior) return null;
  if (prior.period && /^\d{4}-\d{2}$/.test(prior.period)) return prior.period;
  if (prior.periodoB && /^\d{4}-\d{2}$/.test(prior.periodoB)) return prior.periodoB;
  if (prior.period_month && /^\d{4}-\d{2}$/.test(prior.period_month)) return prior.period_month;
  return null;
}

module.exports = {
  FAMILY_IDS,
  classifyHardeningFamily,
  classifyCommercialRuntimeFamily,
  isContextualNewClientCountQuestion,
  isNewClientDiscountEvidenceQuestion,
  isLostVolumeContextualAggregateQuestion,
  isPendingClarificationOperationQuestion,
  isChurnRiskMaterializationQuestion,
  isExpectedNextPurchaseMaterializationQuestion,
  isChannelShareReferencePeriodQuestion,
  isChannelForecastProjectionGuardrailQuestion,
  isNewClientDiscountQuestion,
  isLostClientVolumeTotalQuestion,
  isLostClientsListQuestion,
  rowHasDiscountEvidence,
  discountStatusForRow,
  inheritedPeriodFromPrior,
};
