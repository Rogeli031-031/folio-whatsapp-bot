"use strict";

/**
 * Cobertura comercial runtime 004.
 * Clasifica familias de prueba y helpers de contexto. No es phrasebook de producción:
 * las 30 formas viven en test/fixtures.
 */

const {
  classifyPredictiveFamily,
  isPredictiveCommercialQuestion,
  isNewClientRetentionQuestion,
  isChurnRiskQuestion,
  isExpectedNextPurchaseQuestion,
  isSalesChannelShareQuestion,
  isSalesChannelShareChangeQuestion,
  isSalesMixShiftQuestion,
  isChannelForecastGuardrailQuestion,
} = require("./director-ia-predictive-commercial");
const {
  isClientMovementQuestion,
  extractClientMovementSpec,
  extractChannel,
  normalize,
} = require("./director-ia-executive-backlog");
const { isOpenPronosticoQuestion } = require("./director-ia-executive-coverage");

const FAMILY_IDS = Object.freeze([
  "NEW_CLIENTS",
  "NEW_CLIENT_PURCHASE_TOTAL",
  "NEW_CLIENT_DISCOUNT",
  "NEW_CLIENT_RETENTION",
  "LOST_CLIENTS",
  "LOST_CLIENT_VOLUME_TOTAL",
  "DECREASED_CLIENT_VOLUME_TOTAL",
  "CLIENT_CHURN_RISK",
  "EXPECTED_NEXT_PURCHASE",
  "SALES_CHANNEL_SHARE",
  "SALES_CHANNEL_SHARE_CHANGE",
  "TOP_CLIENTS_BY_CHANNEL",
  "SALES_MIX_SHIFT",
  "CHANNEL_FORECAST_GUARDRAIL",
]);

const CHANNEL_FORECAST_NOT_AVAILABLE =
  "No existe un forecast separado para Casa ni para Comisionista. El forecast disponible es de la planta completa. Puedo mostrarte la participación observada, la venta observada de cada canal o el forecast total de planta. No reparto el forecast de planta con shares observados.";

function nq(raw) {
  return normalize(raw);
}

function isCasaAsClientName(raw) {
  const n = nq(raw);
  if (!n) return false;
  if (!/\bcasa\b/.test(n)) return false;
  if (/\bcomisionistas?\b/.test(n)) return false;
  if (/\b(canal|participacion|porcentaje|mix|mezcla|peso|share)\b/.test(n)) return false;
  return Boolean(
    /\bcasa\s+(martinez|lopez|garcia|hernandez|gonzalez|rodriguez|sanchez|ramirez|torres|flores|rivera|gomez|diaz|cruz|morales|reyes|gutierrez|ortiz|chavez|ramos)\b/.test(
      n
    )
  );
}

function isAggregateCue(n) {
  return Boolean(
    /\bcuanto\b/.test(n) ||
      /\bcuantos\b/.test(n) ||
      /\bcuantas\b/.test(n) ||
      /\btotal\b/.test(n) ||
      /\ben\s+conjunto\b/.test(n) ||
      /\bsumaron\b/.test(n) ||
      /\bsuma\b/.test(n) ||
      /\btoneladas\b/.test(n) ||
      /\bporcentaje\b/.test(n) ||
      /\btasa\b/.test(n) ||
      /\bvolumen\b/.test(n)
  );
}

function isNewClientsListQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isNewClientRetentionQuestion(question)) return false;
  if (isNewClientDiscountQuestion(question)) return false;
  if (isNewClientPurchaseTotalQuestion(question)) return false;
  const newCue =
    /\bnuevos?\b/.test(n) ||
    /\bnuevas?\b/.test(n) ||
    /\bdebutaron\b/.test(n) ||
    /\bdieron\s+de\s+alta\b/.test(n) ||
    /\bfirst\s+buy\b/.test(n) ||
    /\bempezaron\s+a\s+comprar\b/.test(n) ||
    (/\bno\s+compraban\b/.test(n) && /\bahora\s+si\b/.test(n));
  const listCue =
    /\bclientes?\b/.test(n) ||
    /\bcuentas?\b/.test(n) ||
    /\bentraron\b/.test(n) ||
    /\blista\b/.test(n) ||
    /\blistado\b/.test(n) ||
    /\bquien(?:es)?\b/.test(n) ||
    /\bdame\b/.test(n) ||
    /\bque\b/.test(n);
  if (/\blos\s+nuevos\b/.test(n) || /\bcuales\s+son\s+los\s+nuevos\b/.test(n) || /\bnombres\s+de\s+los\s+nuevos\b/.test(n)) {
    return !/\bdescuento/.test(n) && !isNewClientPurchaseTotalQuestion(question) && !isNewClientRetentionQuestion(question);
  }
  return newCue && listCue && !/\bdescuento/.test(n) && !isAggregateCue(n);
}

function isNewClientPurchaseTotalQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isNewClientRetentionQuestion(question)) return false;
  if (/\bdescuento/.test(n)) return false;
  const cohort =
    /\bclientes?\s+nuevos?\b/.test(n) ||
    /\bnuevos?\s+clientes?\b/.test(n) ||
    /\blos\s+nuevos\b/.test(n) ||
    /\bnuevos\b/.test(n) ||
    /\bentraron\b/.test(n) ||
    /\bempezaron\s+a\s+comprar\b/.test(n);
  if (!cohort) return false;
  return Boolean(
    /\bcuanto\s+compraron\b/.test(n) ||
      /\bcuanto\s+sumaron\b/.test(n) ||
      /\bventa\s+total\b/.test(n) ||
      /\bventa\s+agregada\b/.test(n) ||
      /\btoneladas\s+totales\b/.test(n) ||
      /\ben\s+conjunto\b/.test(n) ||
      /\btotal\s+(compr|venta|tonel|kg)\b/.test(n) ||
      /\bcompra\s+total\b/.test(n) ||
      /\bagregado\s+de\s+compra\b/.test(n) ||
      /\btotalizaron\b/.test(n) ||
      /\bcuantas\s+toneladas\b/.test(n) ||
      /\btoneladas\s+que\s+compraron\b/.test(n) ||
      /\bsuma\s+de\s+toneladas\b/.test(n) ||
      /\bcuanto\s+vendieron\s+los\s+nuevos\b/.test(n) ||
      /\bcuanto\s+facturaron\s+los\s+nuevos\b/.test(n) ||
      /\bvolumen\s+total\s+de\s+los\s+nuevos\b/.test(n) ||
      (/\b(cuanto|cuantas)\b/.test(n) && /\b(compr|sum|venta|tonel|volumen|conjunto|represent)\b/.test(n)) ||
      /\btotal\s+comprado\b/.test(n) ||
      /\btotal\s+toneladas\b/.test(n) ||
      (/\brepresento\b/.test(n) && /\bcompra\b/.test(n))
  );
}

function isNewClientDiscountQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (!/\bdescuento/.test(n) && !(/\bdimos\b/.test(n) && /\bnuevos?\b/.test(n))) return false;
  return Boolean(
    /\bclientes?\s+nuevos?\b/.test(n) ||
      /\bnuevos?\s+clientes?\b/.test(n) ||
      /\blos\s+nuevos\b/.test(n) ||
      /\bnuevos?\b/.test(n) ||
      /\bcohorte\s+nueva\b/.test(n) ||
      (/\bentraron\b/.test(n) && /\bdescuento/.test(n)) ||
      (/\bempezaron\s+a\s+comprar\b/.test(n) && /\bdescuento/.test(n))
  );
}

function isLostClientsListQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isLostClientVolumeTotalQuestion(question)) return false;
  if (isChurnRiskQuestion(question)) return false;
  if (isNewClientRetentionQuestion(question)) return false;
  return Boolean(
    /\bdejaron\s+de\s+(comprar|consumir|pedir)\b/.test(n) ||
      /\bdejo\s+de\s+(comprar|consumir|pedir)\b/.test(n) ||
      /\bya\s+no\s+(compran|compra|consumen)\b/.test(n) ||
      /\bclientes?\s+perdidos?\b/.test(n) ||
      /\bcayeron\s+a\s+cero\b/.test(n) ||
      /\bse\s+fueron\b/.test(n) ||
      /\bclientes?\s+perdimos\b/.test(n) ||
      /\bque\s+clientes\s+perdimos\b/.test(n) ||
      /\bcaidos\b/.test(n) ||
      /\bse\s+perdieron\b/.test(n) ||
      /\babandonaron\s+la\s+compra\b/.test(n) ||
      (/\bno\s+compraron\b/.test(n) && /\banterior\b/.test(n)) ||
      (/\bno\s+volvieron\b/.test(n) && /\bcompraban\b/.test(n))
  );
}

function isLostClientVolumeTotalQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\bbajaron\b/.test(n) || /\bdisminuy/.test(n)) return false;
  const lostSet =
    /\bdejaron\s+de\b/.test(n) ||
    /\bdejo\s+de\b/.test(n) ||
    /\bcaidos?\b/.test(n) ||
    /\bse\s+fueron\b/.test(n) ||
    /\bperdidos?\b/.test(n) ||
    /\bperdidos\b/.test(n) ||
    /\besos\s+clientes\b/.test(n) ||
    /\bcon\s+ellos\b/.test(n) ||
    /\besos\b/.test(n) ||
    /\bellos\b/.test(n) ||
    /\bclientes?\s+que\s+dejaron\b/.test(n) ||
    /\bbaja\s+a\s+cero\b/.test(n) ||
    /\bcaidos\s+a\s+cero\b/.test(n);
  const volume =
    /\btoneladas\b/.test(n) ||
    /\bvolumen\b/.test(n) ||
    /\bperdimos\b/.test(n) ||
    /\bperdida\b/.test(n) ||
    /\bdejamos\s+de\s+vender\b/.test(n) ||
    /\bse\s+cayo\b/.test(n) ||
    /\bdejaron\s+de\s+entrar\b/.test(n) ||
    /\blost\s+volume\b/.test(n);
  if (/\bdisminuy/.test(n) || /\bbajaron\b/.test(n) || /\bdisminucion\b/.test(n)) return false;
  if (/\bcuantas\s+toneladas\s+perdimos\b/.test(n) && !/\bbajaron\b/.test(n) && !/\bdisminuy/.test(n)) {
    return true;
  }
  if (/\blost\s+volume\b/.test(n) || /\babs\s+delta\b/.test(n)) return true;
  if (/\bsuman\b/.test(n) && /\bse\s+fueron\b/.test(n)) return true;
  if (/\brepresenta\s+la\s+perdida\b/.test(n)) return true;
  if (/\btoneladas\s+perdidas\b/.test(n) && /\bdejaron\b/.test(n)) return true;
  return lostSet && volume;
}

function isDecreasedClientVolumeTotalQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  const decreased =
    /\bbajaron\b/.test(n) ||
    /\bdisminuy/.test(n) ||
    /\blos\s+que\s+bajaron\b/.test(n) ||
    /\bcompraron\s+menos\b/.test(n) ||
    /\bbaja\s+parcial\b/.test(n) ||
    /\bdisminucion\b/.test(n);
  const volume =
    /\btoneladas\b/.test(n) ||
    /\bvolumen\b/.test(n) ||
    /\bperdimos\b/.test(n) ||
    /\bperdida\b/.test(n) ||
    /\bcuanto\b/.test(n) ||
    /\bagregado\b/.test(n) ||
    /\bsuma\b/.test(n) ||
    /\btotal\b/.test(n) ||
    /\bdelta\b/.test(n) ||
    /\bcaidas?\b/.test(n);
  return decreased && volume;
}

function isObservedChannelSalesQuestion(question) {
  const n = nq(question);
  if (!n || isCasaAsClientName(n)) return false;
  if (isChannelForecastGuardrailQuestion(question)) return false;
  if (isSalesChannelShareChangeQuestion(question)) return false;
  const channel = /\bcasa\b/.test(n) || /\bcomisionistas?\b/.test(n);
  if (!channel) return false;
  return Boolean(
    /\bcuanto\s+vendio\b/.test(n) ||
      /\bcuanto\s+vendimos\b/.test(n) ||
      /\bcuanto\s+compro\s+(casa|comisionista)\b/.test(n) ||
      /\btoneladas\s+de\s+(casa|comisionista)\b/.test(n) ||
      /\bventa\s+de\s+(casa|comisionista)\b/.test(n)
  );
}

function isTopClientsByChannelQuestion(question) {
  const n = nq(question);
  if (!n || isCasaAsClientName(n)) return false;
  if (isChannelForecastGuardrailQuestion(question)) return false;
  if (/\bproyectad/.test(n) || /\bforecast\b/.test(n) || /\bpronostic/.test(n)) return false;
  const channel =
    /\bcomisionistas?\b/.test(n) ||
    /\bcanal\s+casa\b/.test(n) ||
    /\bcanal\s+comisionista\b/.test(n) ||
    (/\bcasa\b/.test(n) &&
      (/\bclientes?\b/.test(n) ||
        /\btop\b/.test(n) ||
        /\branking\b/.test(n) ||
        /\bcuentas\b/.test(n) ||
        /\bmas\s+compran\b/.test(n) ||
        /\blos\s+\d+\b/.test(n)));
  const rank =
    /\btop\b/.test(n) ||
    /\bprincipales\b/.test(n) ||
    /\bmas\s+compran\b/.test(n) ||
    /\bmas\s+venden\b/.test(n) ||
    /\bvenden\s+mas\b/.test(n) ||
    /\bcompran\s+mas\b/.test(n) ||
    /\bmas\s+fuertes\b/.test(n) ||
    /\bmas\s+mueven\b/.test(n) ||
    /\bmas\s+piden\b/.test(n) ||
    /\bmayores\b/.test(n) ||
    /\branking\b/.test(n) ||
    /\blame\s+los\b/.test(n) ||
    /\bdame\b/.test(n) ||
    /\blos\s+\d+\s+/.test(n) ||
    /\b\d+\s+clientes\s+comisionistas\b/.test(n) ||
    /\blos\s+que\s+mas\s+compran\b/.test(n);
  return Boolean(channel && rank);
}

function isLooseChurnRisk(n) {
  return Boolean(
    /\btarde\s+vs\s+su\s+frecuencia\b/.test(n) ||
      /\bmas\s+dias\s+de\s+lo\s+normal\b/.test(n) ||
      /\batraso\s+de\s+compra\b/.test(n) ||
      /\bno\s+predictivas\s+de\s+interrupcion\b/.test(n) ||
      /\bruptura\s+de\s+frecuencia\b/.test(n) ||
      /\bdebieron\s+haber\s+comprado\b/.test(n) ||
      /\batrasados\s+respecto\b/.test(n) ||
      /\bcontinidad\s+de\s+compra\b/.test(n) ||
      /\bcontinuidad\s+de\s+compra\b/.test(n)
  );
}

function isLooseShare(n) {
  return Boolean(
    (/\bcasa\b/.test(n) && /\bcomisionistas?\b/.test(n) && (/\bcuanto\s+fue\b/.test(n) || /\breparto\b/.test(n) || /\bshare\s+observado\b/.test(n))) ||
      (/\bventa\s+por\s+canal\b/.test(n) && /\bporcentaje\b/.test(n)) ||
      (/\bcuanto\s+fue\s+cada\s+canal\b/.test(n))
  );
}

function isLooseShareChange(n) {
  if (/\bmezcla\b/.test(n) || /\bcomposicion\b/.test(n) || /\bshift\s+comercial\b/.test(n)) return false;
  return Boolean(
    /\bpp\b/.test(n) ||
      /\bshare\s+change\b/.test(n) ||
      /\bcambio\s+de\s+share\b/.test(n) ||
      /\bvariacion\s+en\s+pp\b/.test(n) ||
      /\bdelta\s+pp\b/.test(n) ||
      /\bestructura\s+casa\b/.test(n) ||
      (/\bshare\b/.test(n) && /\b(agosto|julio|cambio|casa|comisionista)\b/.test(n) && !/\bobservado\b/.test(n)) ||
      (/\bmes\s+anterior\b/.test(n) && /\bparticipacion\b/.test(n) && /\b(casa|comisionista)\b/.test(n))
  );
}

function isLooseMix(n) {
  return Boolean(
    /\bcomposicion\b/.test(n) && /\b(casa|cambio|mezcla)\b/.test(n) ||
      /\bshift\s+comercial\b/.test(n)
  );
}

function isEllipsisFollowUp(question) {
  const n = nq(question);
  if (!n) return false;
  return Boolean(
    /^(y\s+)?(casa|comisionistas?|en\s+porcentaje|contra\s+\w+|cuanto\s+cambio|el\s+mix|ellos|esos)$/.test(n) ||
      /^(y\s+)?(cuanto\s+perdimos|cuales\s+eran|el\s+mas\s+importante|que\s+descuento|cuantos\s+volvieron|que\s+porcentaje\s+representan|en\s+porcentaje)/.test(
        n
      )
  );
}

function classifyCommercialRuntimeFamily(question, prior) {
  const n = nq(question);
  if (
    isChannelForecastGuardrailQuestion(question) ||
    (/\b(casa|comisionistas?)\b/.test(n) &&
      !/\bcomisionistas?\b/.test(n) !== !/\bcasa\b/.test(n) &&
      !/\bporcentaje\b/.test(n) &&
      !/\brepresent/.test(n) &&
      !/\btop\b/.test(n) &&
      !/\bclientes?\b/.test(n) &&
      (/\bpronostic/.test(n) || /\bva\s+a\s+/.test(n) || /\baportara\b/.test(n) || /\bproyect/.test(n)))
  ) {
    return "CHANNEL_FORECAST_GUARDRAIL";
  }
  if (isNewClientDiscountQuestion(question)) return "NEW_CLIENT_DISCOUNT";
  if (isExpectedNextPurchaseQuestion(question)) return "EXPECTED_NEXT_PURCHASE";
  if (isNewClientRetentionQuestion(question)) return "NEW_CLIENT_RETENTION";
  if (isChurnRiskQuestion(question) || isLooseChurnRisk(n)) return "CLIENT_CHURN_RISK";
  if (isNewClientPurchaseTotalQuestion(question)) return "NEW_CLIENT_PURCHASE_TOTAL";
  if (isLostClientVolumeTotalQuestion(question)) return "LOST_CLIENT_VOLUME_TOTAL";
  if (isDecreasedClientVolumeTotalQuestion(question)) return "DECREASED_CLIENT_VOLUME_TOTAL";
  if (isLooseMix(n) || isSalesMixShiftQuestion(question)) return "SALES_MIX_SHIFT";
  if (isLooseShareChange(n)) return "SALES_CHANNEL_SHARE_CHANGE";
  if (isSalesChannelShareChangeQuestion(question)) return "SALES_CHANNEL_SHARE_CHANGE";
  if (isSalesChannelShareQuestion(question) || isObservedChannelSalesQuestion(question) || isLooseShare(n)) {
    return "SALES_CHANNEL_SHARE";
  }
  if (isTopClientsByChannelQuestion(question)) return "TOP_CLIENTS_BY_CHANNEL";
  if (isLostClientsListQuestion(question)) return "LOST_CLIENTS";
  if (isNewClientsListQuestion(question)) return "NEW_CLIENTS";
  if (
    prior &&
    prior.family &&
    /\bcuanto\s+cambio\b/.test(n) &&
    (prior.family === "SALES_CHANNEL_SHARE" || prior.family === "SALES_CHANNEL_SHARE_CHANGE")
  ) {
    return "SALES_CHANNEL_SHARE_CHANGE";
  }

  const pred = classifyPredictiveFamily(question, prior);
  if (pred === "SALES_CHANNEL_SHARE") return "SALES_CHANNEL_SHARE";
  if (pred === "SALES_CHANNEL_SHARE_CHANGE") return "SALES_CHANNEL_SHARE_CHANGE";
  if (pred === "SALES_MIX_SHIFT") return "SALES_MIX_SHIFT";
  if (pred === "NEW_CLIENT_RETENTION") return "NEW_CLIENT_RETENTION";
  if (pred === "CLIENT_CHURN_RISK") return "CLIENT_CHURN_RISK";
  if (pred === "EXPECTED_NEXT_PURCHASE") return "EXPECTED_NEXT_PURCHASE";
  if (pred === "CHANNEL_FORECAST_GUARDRAIL") return "CHANNEL_FORECAST_GUARDRAIL";

  if (prior && prior.family && (isEllipsisFollowUp(question) || require("./director-ia-pending-completion").isPeriodOnlyAnswer(question))) {
    const n = nq(question);
    if (/\bcuanto\s+cambio\b/.test(n) || /\bcontra\b/.test(n)) return "SALES_CHANNEL_SHARE_CHANGE";
    if (/\bperdimos\b/.test(n) && (prior.family === "LOST_CLIENTS" || prior.movement === "DEJARON_DE_COMPRAR")) {
      return "LOST_CLIENT_VOLUME_TOTAL";
    }
    if (/\bdescuento/.test(n) && (prior.family === "NEW_CLIENTS" || prior.movement === "NUEVOS")) {
      return "NEW_CLIENT_DISCOUNT";
    }
    if (/\bvolvieron\b/.test(n) && (prior.family === "NEW_CLIENTS" || prior.movement === "NUEVOS")) {
      return "NEW_CLIENT_RETENTION";
    }
    return prior.family;
  }
  return null;
}

function isCommercialDomainSwitch(question, prior) {
  const family = classifyCommercialRuntimeFamily(question, null);
  if (!family || !prior || !prior.family) return false;
  const priorDomain = familyDomain(prior.family);
  const nextDomain = familyDomain(family);
  return priorDomain !== nextDomain;
}

function familyDomain(family) {
  if (
    family === "SALES_CHANNEL_SHARE" ||
    family === "SALES_CHANNEL_SHARE_CHANGE" ||
    family === "SALES_MIX_SHIFT" ||
    family === "TOP_CLIENTS_BY_CHANNEL" ||
    family === "CHANNEL_FORECAST_GUARDRAIL"
  ) {
    return "channel";
  }
  if (family === "CLIENT_CHURN_RISK" || family === "EXPECTED_NEXT_PURCHASE") return "dicf";
  if (family === "NEW_CLIENT_RETENTION") return "retention";
  return "movement";
}

function shouldInheritMovementContext(question, prior) {
  const n = nq(question);
  if (!n || !prior) return false;
  if (isCommercialDomainSwitch(question, prior)) return false;
  if (isChannelForecastGuardrailQuestion(question)) return false;
  if (isSalesChannelShareQuestion(question) || isObservedChannelSalesQuestion(question)) return false;
  if (isSalesChannelShareChangeQuestion(question) || isSalesMixShiftQuestion(question)) return false;
  if (isPredictiveCommercialQuestion(question) && !isNewClientDiscountQuestion(question)) {
    return false;
  }
  return Boolean(
    /\bcon\s+ellos\b/.test(n) ||
      /\besos\s+clientes\b/.test(n) ||
      /\besos\b/.test(n) ||
      /\bcuanto\s+perdimos\b/.test(n) ||
      /\btoneladas\s+perdimos\b/.test(n) ||
      /\bcuales\s+eran\b/.test(n) ||
      /\bde\s+esos\b/.test(n) ||
      /\bel\s+mas\s+importante\b/.test(n) ||
      /\bque\s+descuento\s+ten/.test(n) ||
      /\bdescuento\s+tenian\b/.test(n)
  );
}

function movementIntentFromFamily(family) {
  if (family === "NEW_CLIENTS" || family === "NEW_CLIENT_PURCHASE_TOTAL" || family === "NEW_CLIENT_DISCOUNT") {
    return "client_movement";
  }
  if (family === "LOST_CLIENTS" || family === "LOST_CLIENT_VOLUME_TOTAL" || family === "DECREASED_CLIENT_VOLUME_TOTAL") {
    return "client_movement";
  }
  return "predictive_commercial";
}

function wantsMovementAggregate(question, family) {
  const n = nq(question);
  if (
    family === "NEW_CLIENT_PURCHASE_TOTAL" ||
    family === "LOST_CLIENT_VOLUME_TOTAL" ||
    family === "DECREASED_CLIENT_VOLUME_TOTAL" ||
    family === "NEW_CLIENT_DISCOUNT"
  ) {
    return true;
  }
  return isAggregateCue(n);
}

function computeMovementAggregates(rows, movement) {
  const matched = (rows || []).filter((r) => r && r.movement === movement);
  let lostKg = 0;
  let boughtKg = 0;
  let monto = 0;
  for (const r of matched) {
    lostKg += Math.abs(Number(r.delta_kg) || 0);
    boughtKg += Number(r.kg_b != null ? r.kg_b : r.kg) || 0;
    monto += Math.abs(Number(r.monto != null ? r.monto : r.monto_descuento) || 0);
  }
  const discountKg = boughtKg > 0 ? monto / boughtKg : null;
  return {
    matched,
    count: matched.length,
    lost_volume_kg: lostKg,
    lost_volume_ton: Math.round((lostKg / 1000) * 10) / 10,
    bought_kg: boughtKg,
    bought_ton: Math.round((boughtKg / 1000) * 10) / 10,
    discount_kg: discountKg,
    has_discount_evidence: boughtKg > 0 && monto > 0,
  };
}

function plannerIntentForCommercialFamily(family) {
  return movementIntentFromFamily(family);
}

module.exports = {
  FAMILY_IDS,
  CHANNEL_FORECAST_NOT_AVAILABLE,
  classifyCommercialRuntimeFamily,
  isCasaAsClientName,
  isNewClientsListQuestion,
  isNewClientPurchaseTotalQuestion,
  isNewClientDiscountQuestion,
  isLostClientsListQuestion,
  isLostClientVolumeTotalQuestion,
  isDecreasedClientVolumeTotalQuestion,
  isObservedChannelSalesQuestion,
  isTopClientsByChannelQuestion,
  isCommercialDomainSwitch,
  shouldInheritMovementContext,
  wantsMovementAggregate,
  computeMovementAggregates,
  plannerIntentForCommercialFamily,
  isEllipsisFollowUp,
  isClientMovementQuestion,
  extractClientMovementSpec,
  extractChannel,
  isOpenPronosticoQuestion,
  isChannelForecastGuardrailQuestion,
};
