"use strict";

/**
 * Cobertura predictiva/comercial 003.
 * Señales semánticas, no phrasebook. No inventa forecast por canal ni por cliente.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { extractNamedPlant } = require("./director-ia-historical-margin");
const { extractPlantLabel, assertSehPlantaAccess } = require("./director-ia-seh-operation-status");
const { queryMonthlySales } = require("./director-ia-client-profile");
const { resolvePlantCodes } = require("./commercial-trend-engine");
const { MONTHS_ES } = require("./director-ia-folio-search");
const {
  extractRankingPeriod,
  hasPeriod,
  formatMonthLabel,
  previousYearMonth,
} = require("./director-ia-client-ranking");
const { classifyEstatus, previousYearMonth: prevYmMovement } = require("./director-ia-client-movement");
const { computeClientesDescuentoMes, resolveArrClientesMesPlantCode } = require("./dashboard-arr-forecast");

const SEMANTIC_CLASS = "predictive_commercial";

const FAMILY_IDS = Object.freeze([
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

const FAMILY_STATUS = Object.freeze({
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

const LIMITATION = Object.freeze({
  CLIENT_CHURN_RISK:
    "Puedo marcar señales de interrupción (días desde última compra vs frecuencia DICF) cuando ambas existen. No afirmo que el cliente va a dejar de comprar.",
  EXPECTED_NEXT_PURCHASE:
    "La fecha estimada es última compra + freqDays DICF. Es una ventana histórica, no un compromiso de compra.",
  FORECAST_ACCURACY:
    "No tengo un snapshot histórico del forecast que existía en el momento. No recalculo hoy un mes viejo y lo presento como el pronóstico original.",
  COMMERCIAL_ANOMALIES:
    "No hay un criterio contractual de atípico comercial. No marco anomalías por intuición.",
  SINCE_LAST_REVIEW:
    "No invento la última junta. ¿Desde qué fecha o mes quieres comparar?",
  CHANNEL_FORECAST:
    "Tengo participación observada Casa/Comisionista. No hay forecast contractual por canal; no reparto el forecast de planta con un supuesto.",
  CHANNEL_FORECAST_NOT_AVAILABLE:
    "No existe un forecast separado para Casa ni para Comisionista. El forecast disponible es de la planta completa. Puedo mostrarte la participación observada, la venta observada de cada canal o el forecast total de planta. No reparto el forecast de planta con shares observados.",
  CLIENT_FORECAST:
    "Tengo venta observada por cliente y el cierre proyectado de la planta, pero no una proyección contractual por cliente.",
});

function normalize(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function kgToTon(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n / 1000) * 10) / 10;
}

function nextYearMonth(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return null;
  let year = Number(period.slice(0, 4));
  let month = Number(period.slice(5, 7)) + 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function pct(part, total) {
  const a = Number(part);
  const b = Number(total);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
  return Math.round((a / b) * 1000) / 10;
}

function extractLimit(n, fallback = 10) {
  const digit = n.match(/\btop\s+(\d{1,2})\b/) || n.match(/\blos\s+(\d{1,2})\b/) || n.match(/\b(\d{1,2})\s+comisionistas?\b/);
  if (digit) {
    const v = Number(digit[1]);
    if (v >= 1 && v <= 20) return v;
  }
  return fallback;
}

function extractParetoThreshold(n) {
  if (/\b90\b/.test(n) || /\bnoventa\b/.test(n)) return 90;
  if (/\b70\b/.test(n) || /\bsetenta\b/.test(n)) return 70;
  if (/\b50\b/.test(n) || /\bmitad\b/.test(n)) return 50;
  return 80;
}

function extractChannel(n) {
  if (/\bcomisionistas?\b/.test(n) && !/\bcasa\b/.test(n)) return "COMISIONISTA";
  if (/\bcasa\b/.test(n) && !/\bcomisionistas?\b/.test(n)) return "CASA";
  return "ALL";
}

function isForecastSemantics(n) {
  return Boolean(
    /\bproyectad/.test(n) ||
      /\bproyectamos\b/.test(n) ||
      /\bforecast\b/.test(n) ||
      /\bcierre\s+proyectad/.test(n) ||
      /\bdel\s+total\s+proyectad/.test(n) ||
      /\bdentro\s+del\s+forecast\b/.test(n) ||
      /\besperamos\b/.test(n) ||
      /\bestimamos\b/.test(n) ||
      /\bterminara\b/.test(n)
  );
}

function isChannelForecastProjectionGuardrailQuestion(question) {
  const n = normalize(question);
  if (!n || isCasaAsClientName(n)) return false;
  if (/\babre\b/.test(n) && /\b(pronostico|forecast|igf)\b/.test(n)) return false;
  if (/\bcierre\s+proyectad/.test(n) && !/\bproyectamos\b/.test(n) && !/\bal\s+cierre\b/.test(n) && !/\bcerrara\b/.test(n)) {
    return false;
  }
  if (/\bporcentaje\b/.test(n) && /\bproyectamos\b/.test(n) && /\b(cierre|al\s+cierre)\b/.test(n)) return true;
  const channel =
    /\bcasa\b/.test(n) ||
    /\bcomisionistas?\b/.test(n) ||
    /\bcanal(?:es)?\b/.test(n) ||
    /\bmix\b/.test(n) ||
    /\bmezcla\b/.test(n);
  if (!channel) return false;
  if (/\btop\b/.test(n) && /\bclientes?\b/.test(n) && !/\bproyectamos\b/.test(n) && !/\bal\s+cierre\b/.test(n)) {
    return false;
  }
  if (/\bporcentaje\s+proyectado\b/.test(n) && !/\bproyectamos\b/.test(n) && !/\bal\s+cierre\b/.test(n) && !/\bcerrara\b/.test(n)) {
    return false;
  }
  return Boolean(
    /\bproyectamos\b/.test(n) ||
      /\besperamos\b/.test(n) ||
      /\bestimamos\b/.test(n) ||
      /\bterminara\b/.test(n) ||
      /\bcerrara\b/.test(n) ||
      /\bal\s+cierre\b/.test(n) ||
      /\bcomo\s+cerrara\b/.test(n) ||
      /\bcomo\s+terminara\b/.test(n) ||
      /\bshare\s+tendra\b/.test(n) ||
      /\brepresentara\b/.test(n) ||
      /\bcomo\s+se\s+proyecta\b/.test(n) ||
      /\bforecast\s+(por|de|tenemos|canal|tenemos)\b/.test(n) ||
      /\bcomo\s+proyectamos\b/.test(n) ||
      /\bcomo\s+cerrara\s+(casa|comisionista|el\s+mix|la\s+mezcla)\b/.test(n) ||
      (/\bproyectamos\b/.test(n) && /\b(mix|mezcla|share|porcentaje|participacion)\b/.test(n))
  );
}

function extractContraReferenceMonth(n, now) {
  const names = Object.keys(MONTHS_ES || {}).sort((a, b) => b.length - a.length);
  if (!names.length) return null;
  const hit = String(n || "").match(
    new RegExp(`\\b(?:contra|frente\\s+a|vs|versus|respecto\\s+(?:de|a)|comparado\\s+con)\\s+(${names.join("|")})\\b`)
  );
  if (!hit) return null;
  const yearM = String(n || "").match(/\b(20\d{2})\b/);
  const d = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
  }).formatToParts(d);
  const year = yearM ? yearM[1] : parts.find((p) => p.type === "year").value;
  return `${year}-${MONTHS_ES[hit[1]]}`;
}

function isCasaAsClientName(n) {
  if (!n || !/\bcasa\b/.test(n)) return false;
  if (/\bcomisionistas?\b/.test(n)) return false;
  if (/\b(canal|participacion|porcentaje|mix|mezcla|peso|share|forecast|pronostic|proyectad)\b/.test(n)) return false;
  return Boolean(
    /\bcasa\s+(martinez|lopez|garcia|hernandez|gonzalez|rodriguez|sanchez|ramirez|torres|flores|rivera|gomez|diaz|cruz|morales|reyes|gutierrez|ortiz|chavez|ramos)\b/.test(
      n
    )
  );
}

function isChannelForecastGuardrailQuestion(question) {
  const n = normalize(question);
  if (!n || isCasaAsClientName(n)) return false;
  if (/\babre\b/.test(n) && /\b(pronostico|forecast|igf)\b/.test(n)) return false;
  const casa = /\bcasa\b/.test(n);
  const comi = /\bcomisionistas?\b/.test(n);
  if ((casa && comi) || (!casa && !comi)) return false;
  if (/\btop\b/.test(n) || /\bprincipales\b/.test(n) || /\bclientes?\b/.test(n)) return false;
  if (
    /\bporcentaje\b/.test(n) ||
    /\bparticipacion\b/.test(n) ||
    /\bpesan\b/.test(n) ||
    /\bpesa\b/.test(n) ||
    /\bpeso\b/.test(n) ||
    /\brepresent/.test(n) ||
    /\bconcentra/.test(n) ||
    /\bdentro\s+del\s+forecast\b/.test(n) ||
    /\bdel\s+total\s+proyectad/.test(n)
  ) {
    return false;
  }
  return Boolean(
    /\bproyectad/.test(n) ||
      /\bforecast\b/.test(n) ||
      /\bpronostic/.test(n) ||
      /\bcerrara\b/.test(n) ||
      /\bva\s+a\s+vender\b/.test(n) ||
      /\bva\s+a\s+vender\b/.test(n) ||
      /\bproyectamos\b/.test(n) ||
      /\bproyecta\b/.test(n) ||
      /\besperamos\s+vender\b/.test(n) ||
      /\baportara\b/.test(n) ||
      /\bventa\s+proyectada\b/.test(n) ||
      /\bcierre\s+proyectad/.test(n) ||
      /\bcuanto\s+cerrara\b/.test(n) ||
      /\bventa\s+futura\b/.test(n) ||
      /\bproyeccion\s+de\s+venta\b/.test(n) ||
      /\bforecast\s+canal\b/.test(n) ||
      /\bforecast\s+separado\b/.test(n)
  );
}

function isClientCountShare(n) {
  return /\bporcentaje\s+de\s+clientes\b/.test(n) || /\bque\s+porcentaje\s+de\s+clientes\b/.test(n);
}

function isAbsoluteChannelSales(n) {
  return (
    (/\bcuanto\s+vendio\b/.test(n) || /\bcuanto\s+vendimos\b/.test(n) || /\btoneladas\s+de\b/.test(n)) &&
    /\b(casa|comisionista)/.test(n) &&
    !/\bporcentaje\b/.test(n) &&
    !/\bparticipacion\b/.test(n)
  );
}

function isChannelGrowth(n) {
  return /\bque\s+canal\s+crecio\b/.test(n) || /\bcuanto\s+crecera\s+comisionista\b/.test(n);
}

function isTopClientsProjectedShareQuestion(question) {
  const n = normalize(question);
  if (!n || isClientCountShare(n)) return false;
  if (/\ben\s+el\s+mix\b/.test(n)) return false;
  if (/\bcasa\b/.test(n) && /\bcomisionistas?\b/.test(n) && !/\btop\b/.test(n) && !/\bclientes?\b/.test(n) && !/\bprincipales\b/.test(n)) {
    return false;
  }
  if (/\bventa\s+observada\b/.test(n) && /\bcierre\s+proyectad/.test(n)) return true;
  if (isProjectedConcentrationQuestion(question) && !/\bcada\s+uno\b/.test(n)) return false;
  const hasRank =
    /\btop\b/.test(n) ||
    /\bprincipales\b/.test(n) ||
    /\bclientes?\b/.test(n) ||
    /\b\d+\s+comisionistas?\b/.test(n) ||
    /\bmas\s+grandes\b/.test(n) ||
    /\bcompran\s+mas\b/.test(n) ||
    /\bmas\s+venden\b/.test(n) ||
    /\bvenden\s+mas\b/.test(n) ||
    /\bmayor\s+volumen\b/.test(n) ||
    /\bmas\s+fuertes\b/.test(n) ||
    /\bpor\s+compra\b/.test(n) ||
    /\bprincipal(es)?\b/.test(n) ||
    /\bcada\s+uno\b/.test(n) ||
    /\buno\s+por\s+uno\b/.test(n) ||
    /\bnumero\s+uno\b/.test(n) ||
    /\bventa\s+proyectada\b/.test(n);
  const hasShare = /\bporcentaje\b/.test(n) || /\bpesan\b/.test(n) || /\bpesa\b/.test(n) || /\bpeso\b/.test(n) || /\bparticipacion\b/.test(n) || /\brepresent/.test(n) || /\baport/.test(n) || /\bcontribucion\b/.test(n);
  const hasDenom =
    isForecastSemantics(n) ||
    /\bproyeccion\b/.test(n) ||
    /\bforecast\b/.test(n) ||
    /\bcierre\s+proyectad/.test(n);
  return (
    hasRank &&
    hasShare &&
    (hasDenom ||
      (/\bcada\s+uno\b/.test(n) && (hasDenom || /\b(comisionistas?|clientes?|top)\b/.test(n))) ||
      (/\btop\b/.test(n) && /\bcomisionistas?\b/.test(n)))
  );
}

function isProjectedConcentrationQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (/\bcada\s+uno\b/.test(n) || /\buno\s+por\s+uno\b/.test(n) || /\bno\s+el\s+acumulado\b/.test(n)) return false;
  const together =
    /\bjuntos?\b/.test(n) ||
    /\bacumulad/.test(n) ||
    /\bconjunta\b/.test(n) ||
    /\bconcentr/.test(n) ||
    /\bsuma\s+porcentual\b/.test(n) ||
    (/\bdepende/.test(n) && (isForecastSemantics(n) || /\btop\s+\d+\b/.test(n)));
  const top = /\btop\b/.test(n) || /\bprincipales\b/.test(n);
  return together && top;
}

function isSalesChannelShareQuestion(question) {
  const n = normalize(question);
  if (!n || isClientCountShare(n) || isAbsoluteChannelSales(n) || isChannelGrowth(n)) return false;
  if (isChannelForecastGuardrailQuestion(question)) return false;
  if (isCasaAsClientName(n)) return false;
  if (isTopClientsProjectedShareQuestion(question) || isProjectedConcentrationQuestion(question)) return false;
  if (/\ben\s+el\s+mix\b/.test(n) || /\bmezcla\b/.test(n) || /\bcomposicion\b/.test(n)) return false;
  if (/\bautotanque\b/.test(n) || /\bcarburacion\b/.test(n) || /\bsubcategoria\b/.test(n)) return false;
  const shareCue =
    /\bporcentaje\b/.test(n) ||
    /\bparticipacion\b/.test(n) ||
    /\bpeso\b/.test(n) ||
    /\brepresenta\b/.test(n) ||
    /\brepresento\b/.test(n) ||
    /\bparte\s+(corresponde|de)\b/.test(n) ||
    /\bcomo\s+se\s+(divide|reparte|dividio|repartio)\b/.test(n) ||
    /\bmix\s+porcentual\b/.test(n) ||
    /\bproporcion\b/.test(n) ||
    /\breparte\s+la\s+proyeccion\b/.test(n) ||
    /\bquedo\b/.test(n) ||
    /\bcontra\s+comisionista\b/.test(n);
  const channels =
    /\bcasa\b/.test(n) ||
    /\bcomisionistas?\b/.test(n) ||
    /\bcada\s+(canal|uno)\b/.test(n) ||
    /\bcomo\s+se\s+dividio\b/.test(n) ||
    /\breparte\s+la\s+(venta|proyeccion)\b/.test(n) ||
    /\bse\s+repartio\s+la\s+venta\b/.test(n) ||
    /\bsplit\s+de\s+canales\b/.test(n) ||
    /\bcanales\b/.test(n);
  return shareCue && channels && !/\btop\s+\d+\b/.test(n);
}

function isSalesChannelShareChangeQuestion(question) {
  const n = normalize(question);
  if (/\bmezcla\b/.test(n) && !/\bshare\b/.test(n) && !/\bpuntos\b/.test(n) && !/\bpp\b/.test(n)) return false;
  if (/\ben\s+el\s+mix\b/.test(n) && !/\bshare\b/.test(n) && !/\bpuntos\b/.test(n) && !/\bpp\b/.test(n)) return false;
  if (/\bmix\s+comercial\b/.test(n) && !/\bpp\b/.test(n) && !/\bpuntos\b/.test(n)) return false;
  if (
    !isSalesChannelShareQuestion(question) &&
    !(
      (/\b(puntos|share|participacion|peso|pesa|bajo|subio|cambio|evolucion|estructura|creciendo|movio)/.test(n) &&
        /\b(casa|comisionista|canal)\b/.test(n)) ||
      (/\bparticipacion\b/.test(n) && /\bagosto\b/.test(n) && /\bseptiembre\b/.test(n))
    )
  ) {
    return false;
  }
  if (isTopClientsProjectedShareQuestion(question) || isProjectedConcentrationQuestion(question)) return false;
  return Boolean(
    /\bcambio\b/.test(n) ||
      /\bcambio\b/.test(n) ||
      /\bgan(o|ando|aron)\b/.test(n) ||
      /\bperdi(o|endo|eron)\b/.test(n) ||
      /\bsubio\b/.test(n) ||
      /\bbajo\b/.test(n) ||
      /\bpuntos\b/.test(n) ||
      /\bevolucion/.test(n) ||
      /\bhistorica\b/.test(n) ||
      /\bdelta\b/.test(n) ||
      /\bpesa\s+(mas|menos)\b/.test(n) ||
      /\bcreciendo\s+dentro\b/.test(n) ||
      (/\bagosto\b/.test(n) && /\bseptiembre\b/.test(n)) ||
      (/\bcanal\b/.test(n) && /\b(gano|perdio|ganando|perdiendo|movio)\b/.test(n)) ||
      (/\baumento\b/.test(n) && /\b(casa|comisionista)\b/.test(n)) ||
      (/\b(contra|frente\s+a|vs|respecto\s+(de|a)|comparado\s+con)\b/.test(n) &&
        /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(n) &&
        /\b(casa|comisionistas?|participacion|share|cambio|quedo|vari|pp|estamos|diferencia)\b/.test(n))
  );
}

function isParetoQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\bpareto\b/.test(n) ||
      /\b80\b/.test(n) && /\b(venta|toneladas|clientes|generan|por\s+ciento)\b/.test(n) ||
      /\b80\s*(por\s*ciento|%)\b/.test(n) ||
      /\b80\s+por\s+ciento\b/.test(n) ||
      /\b80-20\b/.test(n) ||
      (/\bconcentra/.test(n) && /\b(80|70|90|50|mitad|cartera|mayor\s+parte)\b/.test(n)) ||
      /\bdependemos\s+de\s+pocos\b/.test(n) ||
      /\bcurva\s+de\s+concentracion\b/.test(n) ||
      /\bque\s+tan\s+concentrada\s+esta\s+la\s+cartera\b/.test(n) ||
      /\bminimo\s+numero\s+de\s+clientes\s+para\s+llegar\b/.test(n) ||
      /\bclientes\s+necesarios\s+para\s+acumular\b/.test(n) ||
      /\bquien(es)?\s+representan\s+la\s+mayor\s+parte\b/.test(n) ||
      /\bcuantos\s+generan\s+el\s+(80|70|90|50)\b/.test(n) ||
      /\bconcentran\s+casi\s+toda\s+la\s+venta\b/.test(n) ||
      /\bmayor\s+parte\s+del\s+negocio\b/.test(n) ||
      /\bsostienen\s+la\s+(planta|venta)\b/.test(n) ||
      /\bdepende\s+de\s+los\s+principales\b/.test(n) ||
      /\bmitad\s+de\s+la\s+venta\b/.test(n)
  );
}

function isChurnRateQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (/\briesgo\b/.test(n) || /\bpodria\b/.test(n) || /\bdeberia\s+haber\b/.test(n) || /\bnuevos?\b/.test(n)) return false;
  return Boolean(
    /\bchurn\b/.test(n) ||
      /\btasa\s+de\s+perdida\b/.test(n) ||
      /\btasa\s+de\s+inactividad\b/.test(n) ||
      /\bporcentaje\s+de\s+clientes\s+(estamos\s+)?perdi/.test(n) ||
      (/\bporcentaje\b/.test(n) && /\bdejo\s+de\s+comprar\b/.test(n)) ||
      /\bporcentaje\s+de\s+cartera\b/.test(n) ||
      /\bretencion\b/.test(n) ||
      /\bcuantos\s+clientes\s+perdemos\b/.test(n) ||
      /\bestamos\s+perdiendo\s+mas\s+clientes\b/.test(n) ||
      /\bsubio\s+la\s+perdida\b/.test(n) ||
      /\bbajo\s+la\s+retencion\b/.test(n) ||
      /\bque\s+tan\s+rapido\s+perdemos\b/.test(n) ||
      /\bactivos\s+se\s+volvieron\s+inactivos\b/.test(n) ||
      /\bcuantos\s+se\s+fueron\b/.test(n) ||
      /\bperdida\s+en\s+(agosto|septiembre|julio)\b/.test(n) ||
      /\bque\s+mes\s+perdimos\b/.test(n) ||
      /\bevolucion\s+(de\s+la\s+perdida|mensual)\b/.test(n) ||
      /\btendencia\s+de\s+clientes\s+que\s+dejan\b/.test(n) ||
      /\bmejoramos\s+o\s+empeoramos\b/.test(n) ||
      /\bque\s+canal\s+pierde\s+mas\b/.test(n) ||
      /\bcuantos\s+del\s+mes\s+pasado\s+siguen\b/.test(n) ||
      /\bque\s+proporcion\s+conservamos\b/.test(n) ||
      /\bsubcategoria\s+pierde\s+mas\b/.test(n) ||
      /\bdonde\s+perdemos\s+mas\b/.test(n) ||
      /\bevolucion\s+mensual\b/.test(n) ||
      /\bcomo\s+evoluciono\s+la\s+perdida\b/.test(n)
  );
}

function isNewClientRetentionQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (/\bdescuento/.test(n)) return false;
  return (
    (/\bnuevos?\b/.test(n) &&
      (/\bretencion\b/.test(n) ||
        /\bsiguen\b/.test(n) ||
        /\bpermanec/.test(n) ||
        /\bconservamos\b/.test(n) ||
        /\bse\s+quedaron\b/.test(n) ||
        /\bse\s+perdieron\b/.test(n) ||
        /\brecompra\b/.test(n) ||
        /\bsegunda\s+compra\b/.test(n) ||
        /\bvolvieron\b/.test(n) ||
        /\bregresaron\b/.test(n) ||
        /\brepitieron\b/.test(n) ||
        /\brepitio\b/.test(n) ||
        /\bse\s+retuvo\b/.test(n) ||
        /\bno\s+regresaron\b/.test(n) ||
        /\bno\s+volvieron\b/.test(n) ||
        /\bcohorte\b/.test(n) ||
        /\bcompraron\s+otra\s+vez\b/.test(n) ||
        /\bseguimos\s+conservando\b/.test(n) ||
        /\bretuvimos\b/.test(n) ||
        /\brepitio\b/.test(n) ||
        /\brepitieron\s+compra\b/.test(n) ||
        /\bporcentaje\s+repitio\b/.test(n) ||
        /\bporcentaje\s+se\s+retuvo\b/.test(n) ||
        /\bretencion\s+tuvimos\b/.test(n) ||
        /\bvolvieron\s+a\s+comprar\b/.test(n) ||
        /\buna\s+sola\s+vez\b/.test(n) ||
        /\bvarias\s+compras\b/.test(n) ||
        /\bgeneracion\b/.test(n) ||
        /\bseguimiento\b/.test(n) ||
        /\brecurrentes\b/.test(n) ||
        /\bretiene\b/.test(n) ||
        /\bretenemos\b/.test(n) ||
        /\bllegaron\s+y\s+cuantos\s+permanecen\b/.test(n) ||
        /\bcomo\s+nos\s+fue\s+con\s+los\s+nuevos\b/.test(n) ||
        /\bdejaron\s+de\s+comprar\b/.test(n))) ||
    /\bretencion\s+de\s+la\s+generacion\b/.test(n) ||
    /\bque\s+retencion\s+tuvimos\b/.test(n) ||
    /\bcuantos\s+repitieron\s+compra\b/.test(n) ||
    /\bque\s+porcentaje\s+repitio\b/.test(n) ||
    /\bque\s+porcentaje\s+se\s+retuvo\b/.test(n) ||
    /\bcuantos\s+seguimos\s+conservando\b/.test(n) ||
    /\bde\s+la\s+cohorte\b/.test(n) ||
    /\bporcentaje\s+de\s+nuevos\s+retuvimos\b/.test(n) ||
    /\bllegaron\s+y\s+cuantos\s+permanecen\b/.test(n) ||
    /\bque\s+paso\s+con\s+los\s+clientes\s+nuevos\b/.test(n) ||
    /\bque\s+paso\s+con\s+los\s+clientes\s+que\s+entraron\b/.test(n) ||
    /\bde\s+los\s+que\s+entraron\b/.test(n) ||
    /\bquien\s+dejo\s+de\s+comprar\s+despues\s+de\s+la\s+primera\s+compra\b/.test(n) ||
    /\bquienes\s+volvieron\s+a\s+comprar\b/.test(n) ||
    /\bsegunda\s+compra\b/.test(n) ||
    /\brecompra\b/.test(n) ||
    /\buna\s+sola\s+vez\b/.test(n) ||
    /\bvarias\s+compras\b/.test(n) ||
    /\bretiene\s+mejor\b/.test(n) ||
    /\bretenemos\s+mas\b/.test(n)
  );
}

function isSalesMixShiftQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (isSinceLastReviewQuestion(question)) return false;
  if (isSalesChannelShareChangeQuestion(question)) return false;
  if (isSalesChannelShareQuestion(question) && !/\bmix\b/.test(n) && !/\bmezcla\b/.test(n) && !/\bcomposicion\b/.test(n)) {
    return false;
  }
  return Boolean(
    /\bmezcla\b/.test(n) ||
      (/\bmix\b/.test(n) && !/\bmix\s+porcentual\s+casa\b/.test(n)) ||
      /\bcomposicion\b/.test(n) ||
      (/\bsubcategoria\b/.test(n) && /\bparticipacion\b/.test(n)) ||
      (/\bautotanque\b/.test(n) && (/\bporcentaje\b/.test(n) || /\bpeso\b/.test(n))) ||
      (/\bcarburacion\b/.test(n) && (/\bporcentaje\b/.test(n) || /\bpeso\b/.test(n) || /\bdependemos\b/.test(n))) ||
      /\bcomo\s+se\s+distribuye\s+la\s+venta\b/.test(n) ||
      /\bcomo\s+se\s+repartieron\s+las\s+toneladas\b/.test(n) ||
      /\bmix\s+comercial\b/.test(n) ||
      /\bparte\s+viene\s+de\s+cada\s+segmento\b/.test(n) ||
      /\bcarburacion\b/.test(n) ||
      /\bcategoria\b/.test(n) && /\b(peso|ganando|perdio)\b/.test(n) ||
      /\bpeso\s+de\s+cada\s+categoria\b/.test(n) ||
      /\bautotanque\s+pesa\b/.test(n) ||
      /\bcambio\s+mas\s+la\s+participacion\b/.test(n)
  );
}

function isDataFreshnessQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\bhasta\s+que\s+fecha\b/.test(n) ||
      /\bhasta\s+que\s+dia\b/.test(n) ||
      /\bultima\s+(carga|fecha\s+disponible)\b/.test(n) ||
      /\bultima\s+fecha\s+disponible\b/.test(n) ||
      (/\bcorte\b/.test(n) && (/\brespondes\b/.test(n) || /\bdime\b/.test(n) || /\bcon\s+que\b/.test(n))) ||
      /\btan\s+recientes\b/.test(n) ||
      /\bactualiz(ado|ados|ada|adas|o)\b/.test(n) ||
      /\bultimo\s+descuento\s+cargado\b/.test(n) ||
      /\bya\s+cargaron\s+hoy\b/.test(n) ||
      /\bya\s+estan\s+completos\b/.test(n) ||
      /\bultimo\s+dato\b/.test(n) ||
      /\bfresco\b/.test(n) ||
      /\bhuecos\b/.test(n) ||
      /\bdias\s+faltan\b/.test(n) ||
      /\bfalta\s+algun\s+dia\b/.test(n) ||
      /\binformacion\s+incompleta\b/.test(n) ||
      /\bfuente\b/.test(n) && /\b(atrasada|faltante|atrasadas)\b/.test(n) ||
      /\btabla\s+esta\s+atrasada\b/.test(n) ||
      /\bmeses\s+incompletos\b/.test(n) ||
      /\bseptiembre\s+esta\s+completo\b/.test(n) ||
      /\bretraso\s+tienen\s+los\s+datos\b/.test(n) ||
      /\bfecha\s+del\s+ultimo\s+dato\b/.test(n) ||
      /\besta\s+respuesta\s+corresponde\s+a\s+que\s+fecha\b/.test(n)
  );
}

function isChurnRiskQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\briesgo\b/.test(n) && (/\bdejar\s+de\s+comprar\b/.test(n) || /\binactiv/.test(n) || /\bperdida\b/.test(n) || /\babandono\b/.test(n) || /\bcomercial\b/.test(n)) ||
    /\bpodria\s+dejar\s+de\s+compr/.test(n) ||
    /\bparece(n)?\s+estar\s+por\s+dejar\b/.test(n) ||
    /\bcerca\s+de\s+volverse\s+inactivos\b/.test(n) ||
    /\bdemasiado\s+tiempo\s+sin\s+comprar\b/.test(n) ||
    /\brompie(ndo|ron)\s+su\s+frecuencia\b/.test(n) ||
    /\btardando\s+mas\s+de\s+lo\s+normal\b/.test(n) ||
    /\bcomprando\s+cada\s+vez\s+menos\s+seguido\b/.test(n) ||
    /\bsenales?\s+de\s+(abandono|que\s+puede)\b/.test(n) ||
    /\bseñales?\s+de\b/.test(n) ||
    /\bsenal(es)?\s+de\b/.test(n) ||
    (/\briesgo\b/.test(n) && /\b(clientes?|casa|comisionistas?)\b/.test(n)) ||
    /\bentrando\s+en\s+riesgo\b/.test(n) ||
    /\bdebemos\s+vigilar\b/.test(n) ||
    /\bpor\s+salirse\s+de\s+su\s+patron\b/.test(n) ||
    /\bdejando\s+pasar\s+su\s+fecha\s+habitual\b/.test(n) ||
    /\bmas\s+dias\s+de\s+los\s+esperados\b/.test(n) ||
    /\bpodrian\s+caer\s+a\s+cero\b/.test(n) ||
    /\bpuede\s+convertirse\s+en\s+cliente\s+inactivo\b/.test(n) ||
    /\bperdiendo\s+continuidad\b/.test(n) ||
    /\bantes\s+de\s+perderlos\b/.test(n) ||
    /\brompieron\s+su\s+frecuencia\b/.test(n) ||
    /\bdeberia(n)?\s+haber\s+comprado\b/.test(n) ||
    /\batrasado\s+respecto\s+a\s+su\s+frecuencia\b/.test(n) ||
    /\bsenal(?:es)?\s+de\s+interrupcion\b/.test(n) ||
    /\bretraso\s+de\s+compra\b/.test(n) ||
    /\bretraso\s+dicf\b/.test(n) ||
    /\bdays\s+since\s+last\b/.test(n) ||
    /\bfreqdays\b/.test(n) ||
    /\bclientes\s+latentes\b/.test(n) ||
    /\bvigilar\s+por\s+frecuencia\b/.test(n) ||
    /\binterrupcion\s+comercial\b/.test(n) ||
    /\bfecha\s+habitual\b/.test(n) ||
    /\bpatron\b/.test(n) && /\b(salirse|romper|atras)/.test(n) ||
    /\bquien\s+esta\s+atrasado\b/.test(n) ||
    /\blleva\s+demasiado\s+sin\s+comprar\b/.test(n) ||
    /\bfuera\s+de\s+su\s+frecuencia\b/.test(n) ||
    /\bque\s+clientes\s+tienen\s+retraso\b/.test(n) ||
    /\bcuentas\s+estan\s+atrasadas\b/.test(n) ||
    /\bmuestran\s+interrupcion\b/.test(n) ||
    /\bno\s+han\s+comprado\s+cuando\s+normalmente\b/.test(n)
  );
}

function isExpectedNextPurchaseQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\bcuando\s+deberia\b/.test(n) ||
      /\bcuando\s+le\s+toca\b/.test(n) ||
      /\bcuando\s+esperamos\b/.test(n) ||
      /\bcuando\s+seria\b/.test(n) ||
      /\bcuando\s+normalmente\b/.test(n) ||
      /\bcuando\s+deberia\s+regresar\b/.test(n) ||
      /\bcuando\s+le\s+toca\s+comprar\s+otra\b/.test(n) ||
      /\bcuando\s+volveria\b/.test(n) ||
      /\besta\s+atrasado\b/.test(n) ||
      /\bproxima\s+compra\b/.test(n) ||
      /\bproxima\s+compra\s+estimada\b/.test(n) ||
      /\bproxima\s+fecha\s+esperada\b/.test(n) ||
      /\bsiguiente\s+compra\b/.test(n) ||
      /\bsiguiente\s+pedido\b/.test(n) ||
      /\ble\s+toca\s+comprar\b/.test(n) ||
      /\ble\s+tocaria\s+pedir\b/.test(n) ||
      /\bcompras?\s+esperadas?\b/.test(n) ||
      /\bcompra\s+esperada\b/.test(n) ||
      /\bcalendario\s+estimado\b/.test(n) ||
      /\bsegun\s+su\s+(frecuencia|historial)\b/.test(n) ||
      /\bexpected\s+next\s+purchase\b/.test(n) ||
      /\blast\s+purchase\s+mas\s+freqdays\b/.test(n) ||
      /\bventana\s+historica\s+de\s+compra\b/.test(n) ||
      /\bcuando\s+vuelve\b/.test(n) ||
      /\bcuando\s+esperamos\s+que\s+compre\b/.test(n) ||
      /\bcuando\s+deberia\s+comprar\s+otra\b/.test(n) ||
      /\bcuando\s+deberia\s+regresar\b/.test(n) ||
      /\bpara\s+que\s+fecha\s+se\s+esperaba\b/.test(n) ||
      /\bmarca\s+su\s+frecuencia\s+historica\b/.test(n) ||
      /\bcuando\s+cae\s+la\s+siguiente\b/.test(n) ||
      /\bcuando\s+esperariamos\b/.test(n) ||
      /\bdeberia(n)?\s+comprar\s+(esta|hoy|manana|en|antes|pronto|otra)\b/.test(n) ||
      /\bque\s+dia\s+deberia\s+comprar\b/.test(n) ||
      /\bdeberia\s+volver\b/.test(n) ||
      /\bproximos\s+a\s+su\s+compra\b/.test(n) ||
      /\bpor\s+llegar\s+a\s+su\s+frecuencia\b/.test(n) ||
      /\bfecha\s+esperada\b/.test(n) ||
      /\bdeberia\s+hacer\s+pedido\b/.test(n)
  );
}

function isForecastAccuracyQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\bpreciso\s+fue\s+el\s+forecast\b/.test(n) ||
      /\bque\s+tan\s+bien\s+pronosticamos\b/.test(n) ||
      (/\berror\b/.test(n) && /\b(forecast|pronostico|proyect|promedio)\b/.test(n)) ||
      /\bforecast\s+vs\s+cierre\b/.test(n) ||
      /\bproyectabamos\s+y\s+cuanto\s+cerramos\b/.test(n) ||
      /\bacertamos\s+el\s+pronostico\b/.test(n) ||
      /\bprecision\s+historica\b/.test(n) ||
      /\bsobreestimamos\b/.test(n) ||
      /\bsubestimamos\b/.test(n) ||
      /\bproyectamos\s+de\s+(mas|menos)\b/.test(n) ||
      /\bmejor\s+forecast\b/.test(n) ||
      /\bpeor\s+forecast\b/.test(n) ||
      /\bmes\s+tuvo\s+mayor\s+error\b/.test(n) ||
      /\bproyectamos\s+mejor\b/.test(n) ||
      /\bpronosticando\s+mejor\b/.test(n) ||
      /\bsesgo\s+a\s+sobreproyectar\b/.test(n) ||
      /\bquedamos\s+cortos\b/.test(n) ||
      /\bdesviacion\s+promedio\b/.test(n) ||
      /\bequivocamos\b/.test(n) ||
      /\bque\s+tan\s+cerca\s+estuvimos\b/.test(n) ||
      /\bconfiable\s+ha\s+sido\b/.test(n) ||
      /\bfallo\s+mas\s+el\s+forecast\b/.test(n) ||
      /\bprecision\s+del\s+forecast\b/.test(n) ||
      /\bultimos\s+6\s+meses\s+de\s+forecast\b/.test(n) ||
      /\bconfiable\s+es\s+la\s+proyeccion\b/.test(n)
  );
}

function isCommercialAnomaliesQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\banomal/.test(n) ||
      /\batipic/.test(n) ||
      (/\batipic/.test(n) && /\b(movimientos?|comercial|venta|cliente|tonelada)\b/.test(n)) ||
      /\bse\s+ve\s+raro\b/.test(n) ||
      /\bfuera\s+de\s+patron\b/.test(n) ||
      /\bfuera\s+de\s+lo\s+normal\b/.test(n) ||
      /\bfuera\s+de\s+banda\b/.test(n) ||
      /\bdesviacion\s+atipica\b/.test(n) ||
      /\bmovimiento\s+raro\b/.test(n) ||
      /\bsalto\s+inexplicable\b/.test(n) ||
      /\bsalen\s+del\s+patron\b/.test(n) ||
      /\bsalio\s+de\s+su\s+rango\b/.test(n) ||
      /\boutliers?\b/.test(n) ||
      /\bpico\s+atipic/.test(n) ||
      /\bbrinco\s+atipic/.test(n) ||
      /\brarezas\s+comerciales\b/.test(n)
  );
}

function isSinceLastReviewQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\bdesde\s+la\s+ultima\s+(junta|revision|reunion)\b/.test(n) ||
      /\bque\s+cambio\s+desde\b/.test(n) ||
      /\bdesde\s+la\s+(junta|reunion|revision)\b/.test(n) ||
      /\bcontra\s+la\s+ultima\s+revision\b/.test(n) ||
      /\bdesde\s+que\s+revisamos\b/.test(n) ||
      /\bdesde\s+ayer\s+en\s+la\s+revision\b/.test(n) ||
      /\bno\s+inventes\s+la\s+junta\b/.test(n) ||
      /\bultimo\s+corte\s+de\s+junta\b/.test(n) ||
      /\bcomparado\s+con\s+la\s+ultima\s+revision\b/.test(n) ||
      /\bdespues\s+de\s+la\s+junta\b/.test(n) ||
      /\bdesde\s+la\s+junta\b/.test(n) ||
      /\bde\s+la\s+ultima\s+revision\b/.test(n)
  );
}

function isPredictiveFollowUp(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /^(y\s+)?proyectado$/.test(n) ||
      /\by\s+proyectado\b/.test(n) ||
      /\by\s+juntos\b/.test(n) ||
      /\bjuntos\s+cuanto\b/.test(n) ||
      /\bsolo\s+top\s+\d+\b/.test(n) ||
      /\blos\s+top\s+\d+\b/.test(n) ||
      /\bahora\s+(casa|comisionistas?|all|todos)\b/.test(n) ||
      /\bsolo\s+(casa|comisionistas?)\b/.test(n) ||
      /^(y\s+)?(casa|comisionistas?)$/.test(n) ||
      /^(y\s+)?en\s+porcentaje$/.test(n) ||
      /^(y\s+)?contra\s+\w+$/.test(n) ||
      /^(y\s+)?cuanto\s+cambio$/.test(n) ||
      /^(y\s+)?en\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)$/.test(
        n
      ) ||
      require("./director-ia-pending-completion").isPeriodOnlyAnswer(question)
  );
}

function classifyPredictiveFamily(question, prior) {
  if (isChannelForecastGuardrailQuestion(question)) return "CHANNEL_FORECAST_GUARDRAIL";
  if (isChannelForecastProjectionGuardrailQuestion(question)) return "CHANNEL_FORECAST_GUARDRAIL";
  if (isProjectedConcentrationQuestion(question)) return "TOP_CLIENTS_PROJECTED_CONCENTRATION";
  if (isTopClientsProjectedShareQuestion(question)) return "TOP_CLIENTS_PROJECTED_SHARE";
  if (isSalesChannelShareChangeQuestion(question)) return "SALES_CHANNEL_SHARE_CHANGE";
  if (isSalesChannelShareQuestion(question)) return "SALES_CHANNEL_SHARE";
  if (isSinceLastReviewQuestion(question)) return "SINCE_LAST_REVIEW";
  if (isParetoQuestion(question)) return "CLIENT_PARETO";
  if (isNewClientRetentionQuestion(question)) return "NEW_CLIENT_RETENTION";
  if (isChurnRiskQuestion(question)) return "CLIENT_CHURN_RISK";
  if (isExpectedNextPurchaseQuestion(question)) return "EXPECTED_NEXT_PURCHASE";
  if (isChurnRateQuestion(question)) return "CLIENT_CHURN_RATE";
  if (isSalesMixShiftQuestion(question)) return "SALES_MIX_SHIFT";
  if (isDataFreshnessQuestion(question)) return "DATA_FRESHNESS";
  if (isForecastAccuracyQuestion(question)) return "FORECAST_ACCURACY";
  if (isCommercialAnomaliesQuestion(question)) return "COMMERCIAL_ANOMALIES";
  if (prior && prior.family && isPredictiveFollowUp(question)) {
    const n = normalize(question);
    if (/\by\s+juntos\b/.test(n) || /\bjuntos\s+cuanto\b/.test(n)) return "TOP_CLIENTS_PROJECTED_CONCENTRATION";
    if (/proyectado/.test(n) && prior.family === "SALES_CHANNEL_SHARE") return "SALES_CHANNEL_SHARE";
    if (/proyectado/.test(n) && (prior.family === "CLIENT_RANKING" || prior.family === "TOP_CLIENTS_PROJECTED_SHARE")) {
      return "TOP_CLIENTS_PROJECTED_SHARE";
    }
    return prior.family;
  }
  return null;
}

function isPredictiveCommercialQuestion(question, prior) {
  return Boolean(classifyPredictiveFamily(question, prior));
}

function buildFrame(question, prior, now) {
  const n = normalize(question);
  const family = classifyPredictiveFamily(question, prior) || (prior && prior.family) || null;
  const periodFrame = extractRankingPeriod(n, now, prior);
  const contraFrom = extractContraReferenceMonth(n, now);
  let period = periodFrame.period || (prior && prior.period) || null;
  let period_from = prior && prior.period_from ? prior.period_from : null;
  let needs_contra_base = false;
  if (contraFrom) {
    const periodB = (prior && prior.period) || null;
    if (periodB && periodB !== contraFrom) {
      period = periodB;
      period_from = contraFrom;
    } else if (!periodB) {
      period = null;
      period_from = contraFrom;
      needs_contra_base = true;
    } else {
      period = periodB;
      period_from = contraFrom;
    }
  }
  let data_semantics = isForecastSemantics(n) ? "FORECAST" : (prior && prior.data_semantics) || "OBSERVED";
  if (/\by\s+proyectado\b/.test(n) || n === "proyectado" || n === "y proyectado") data_semantics = "FORECAST";
  if (isChannelForecastProjectionGuardrailQuestion(question)) data_semantics = "FORECAST";
  const channel = extractChannel(n) !== "ALL" ? extractChannel(n) : (prior && (prior.channel || prior.customer_segment)) || "ALL";
  const usesProjectedDenom =
    family === "TOP_CLIENTS_PROJECTED_SHARE" ||
    family === "TOP_CLIENTS_PROJECTED_CONCENTRATION" ||
    (data_semantics === "FORECAST" && family && family.indexOf("CHANNEL") < 0);
  return {
    ok: Boolean(family),
    family,
    domain: "ARR",
    operation:
      family === "TOP_CLIENTS_PROJECTED_SHARE"
        ? "RANK_COMPOSITION"
        : family === "TOP_CLIENTS_PROJECTED_CONCENTRATION"
          ? "CONCENTRATION"
          : family === "SALES_CHANNEL_SHARE" || family === "SALES_CHANNEL_SHARE_CHANGE"
            ? "COMPOSITION"
            : "ANALYZE",
    entity_type:
      family && family.indexOf("CHANNEL") >= 0 ? "CHANNEL" : family === "DATA_FRESHNESS" ? "SOURCE" : "CLIENT",
    metric: "VENTA_TON",
    plant_label: extractNamedPlant(question) || extractPlantLabel(question) || (prior && prior.plant_label) || null,
    period,
    period_from,
    needs_contra_base,
    period_kind: contraFrom ? "SINGLE" : periodFrame.period_kind || (prior && prior.period_kind) || null,
    period_start: periodFrame.period_start || (prior && prior.period_start) || null,
    period_end: periodFrame.period_end || (prior && prior.period_end) || null,
    channel,
    customer_segment: channel,
    subcategory: (prior && prior.subcategory) || null,
    limit: extractLimit(n, (prior && prior.limit) || 10),
    direction: "HIGH",
    denominator: usesProjectedDenom || (prior && prior.denominator === "PROJECTED_TOTAL_PLANT_SALES")
      ? "PROJECTED_TOTAL_PLANT_SALES"
      : "OBSERVED_CHANNEL_TOTAL",
    data_semantics,
    pareto_threshold: extractParetoThreshold(n),
    filters: {},
  };
}

function rowCanal(row) {
  const n = String((row && (row.canal || row.categoria)) || "Casa").toLowerCase();
  return n.includes("comisionista") ? "COMISIONISTA" : "CASA";
}

function sumByChannel(rows) {
  let casa = 0;
  let comi = 0;
  for (const r of rows || []) {
    const kg = Number(r.kg) || 0;
    if (rowCanal(r) === "COMISIONISTA") comi += kg;
    else casa += kg;
  }
  return { casa_kg: casa, comisionista_kg: comi, total_kg: casa + comi };
}

function mixBySubcategory(rows) {
  const map = new Map();
  let total = 0;
  for (const r of rows || []) {
    const key = String(r.subcanal || r.subcategoria || rowCanal(r) || "Casa").trim() || "Casa";
    const kg = Number(r.kg) || 0;
    map.set(key, (map.get(key) || 0) + kg);
    total += kg;
  }
  return { map, total };
}

function rankRows(rows, limit, channel) {
  const map = new Map();
  for (const r of rows || []) {
    if (channel && channel !== "ALL" && rowCanal(r) !== channel) continue;
    const name = String(r.cliente_norm || r.cliente || "").trim();
    if (!name) continue;
    map.set(name, (map.get(name) || 0) + (Number(r.kg) || 0));
  }
  return [...map.entries()]
    .map(([cliente, kg]) => ({ cliente, kg, ton: kgToTon(kg) }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, limit || 10);
}

function paretoCut(ranked, threshold, totalKg) {
  const want = (Number(threshold) || 80) / 100 * totalKg;
  const out = [];
  let acc = 0;
  for (const row of ranked) {
    acc += row.kg;
    out.push({ ...row, accumulated_kg: acc, accumulated_pct: pct(acc, totalKg) });
    if (acc >= want) break;
  }
  return out;
}

async function loadPlantForecastKg(db, codes, period, opts = {}) {
  if (opts.plantForecastKg != null) return Number(opts.plantForecastKg);
  if (!db || !codes || !codes.length || !period || !/^\d{4}-\d{2}$/.test(period)) return null;
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  const r = await db.query(
    `SELECT SUM(kg_forecast) AS kg
       FROM arr.forecast_mensual
      WHERE UPPER(TRIM(plant_code)) = ANY($1::text[])
        AND year = $2 AND month = $3`,
    [codes.map((c) => String(c).toUpperCase()), year, month]
  );
  const kg = Number(r.rows && r.rows[0] && r.rows[0].kg);
  return Number.isFinite(kg) && kg > 0 ? kg : null;
}

async function loadMaxFecha(db, codes, opts = {}) {
  if (opts.maxFecha) return opts.maxFecha;
  if (!db || !codes || !codes.length) return null;
  const r = await db.query(
    `SELECT MAX(fecha)::date AS max_fecha
       FROM arr.ventas_diarias_cliente
      WHERE UPPER(TRIM(plant_code)) = ANY($1::text[])`,
    [codes.map((c) => String(c).toUpperCase())]
  );
  const v = r.rows && r.rows[0] && r.rows[0].max_fecha;
  return v ? String(v).slice(0, 10) : null;
}

function extractExpectedClientHint(question) {
  const n = normalize(question);
  if (!n) return "";
  const cleaned = n
    .replace(
      /\b(cuando|esperamos|deberia|volver|vuelva|comprar|compra|proxima|siguiente|pedido|toca|regresar|normalmente|estimada|atrasado|esta|de|del|la|el|los|las|que|a|otra|vez|cliente|clientes|estan|riesgo|dejar|senal|senales|interrupcion|frecuencia|historica|listado|marca|quienes|quien)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length < 4) return "";
  if (!/[a-z]{4,}/.test(cleaned)) return "";
  const tokens = cleaned.split(" ").filter((t) => t.length >= 4);
  if (!tokens.length) return "";
  if (tokens.every((t) => /^(agosto|septiembre|julio|enero|febrero|marzo|abril|mayo|junio|octubre|noviembre|diciembre|comercial|inactividad|abandono|patron)$/.test(t))) {
    return "";
  }
  return cleaned;
}

function limitationAnswer(family, extra) {
  return extra || LIMITATION[family] || LIMITATION.CLIENT_FORECAST;
}

function insufficientDicfEvidence(family) {
  if (family === "EXPECTED_NEXT_PURCHASE") {
    return "Falta evidencia DICF: no tengo freqDays y/o last_purchase_date para calcular expected_next_purchase = last_purchase_date + freqDays. No invento la fecha.";
  }
  return "INSUFFICIENT_EVIDENCE: no tengo frecuencia histórica DICF (freqDays) junto con last_purchase_date. No invento un score de abandono ni afirmo que el cliente va a dejar de comprar.";
}

async function loadDicfSignalsReadOnly(db, codes, now, opts = {}) {
  if (Array.isArray(opts.dicfRows) && opts.dicfRows.length) return opts.dicfRows;
  if (!db || typeof db.query !== "function" || !codes || !codes.length) return [];
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  try {
    const cached = await db.query(
      `SELECT cliente_norm AS cliente, freq_days AS "freqDays", days_since_last AS "daysSinceLast"
         FROM arr.dicf_cliente_mes
        WHERE UPPER(TRIM(plant_code)) = ANY($1::text[])
          AND year = $2 AND month = $3`,
      [codes.map((c) => String(c).toUpperCase()), year, month]
    );
    const lastBuy = await db.query(
      `SELECT cliente_norm AS cliente, MAX(fecha)::date AS last_fecha
         FROM arr.ventas_diarias_cliente
        WHERE UPPER(TRIM(plant_code)) = ANY($1::text[])
          AND kg > 0
        GROUP BY cliente_norm`,
      [codes.map((c) => String(c).toUpperCase())]
    );
    const lastMap = new Map(
      (lastBuy.rows || []).map((r) => [String(r.cliente || "").trim(), r.last_fecha ? String(r.last_fecha).slice(0, 10) : null])
    );
    return (cached.rows || [])
      .map((r) => ({
        cliente: r.cliente,
        freqDays: Number(r.freqDays),
        lastPurchaseDate: lastMap.get(String(r.cliente || "").trim()) || null,
        daysSinceLast: Number(r.daysSinceLast),
      }))
      .filter((r) => r.cliente);
  } catch (e) {
    return [];
  }
}

async function loadPredictiveForChat(pool, plantaId, req, opts = {}) {
  const now = opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();
  const question = opts.question || "";
  const prior = opts.priorSpec && opts.priorSpec.ok ? opts.priorSpec : null;
  const spec = buildFrame(question, prior, now);
  if (!spec.ok) return { ok: false, error: "No pude clasificar la pregunta comercial.", spec, now };

  const family = spec.family;
  if (family === "COMMERCIAL_ANOMALIES") {
    return { ok: true, family, spec, limitation: LIMITATION.COMMERCIAL_ANOMALIES, now };
  }
  if (family === "FORECAST_ACCURACY") {
    return { ok: true, family, spec, limitation: LIMITATION.FORECAST_ACCURACY, now };
  }
  if (family === "SINCE_LAST_REVIEW" && !hasPeriod(spec)) {
    return { ok: true, family, spec, clarification: LIMITATION.SINCE_LAST_REVIEW, now };
  }
  if (family === "CHANNEL_FORECAST_GUARDRAIL" || isChannelForecastProjectionGuardrailQuestion(question)) {
    return {
      ok: true,
      family: "CHANNEL_FORECAST_GUARDRAIL",
      spec,
      limitation: LIMITATION.CHANNEL_FORECAST_NOT_AVAILABLE,
      now,
    };
  }
  if (family === "SALES_CHANNEL_SHARE_CHANGE" && spec.needs_contra_base) {
    const ref = spec.period_from ? formatMonthLabel(spec.period_from) : "ese mes";
    return {
      ok: true,
      family,
      spec,
      clarification: `¿Contra ${ref} respecto de qué mes?`,
      now,
    };
  }
  if (family === "SALES_CHANNEL_SHARE" && spec.data_semantics === "FORECAST") {
    return {
      ok: true,
      family,
      spec,
      limitation: LIMITATION.CHANNEL_FORECAST,
      now,
    };
  }

  const selectedId = Number(plantaId);
  const plantIdToUse = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null;
  if (!plantIdToUse && family !== "DATA_FRESHNESS") {
    return { ok: true, clarification: "¿De qué planta quieres esta lectura comercial?", spec, now, family };
  }
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  if (plantIdToUse) {
    const denied = assertSehPlantaAccess(auth, plantIdToUse);
    if (!denied.ok) return { ...denied, spec, now, family };
  }

  if (
    ["SALES_CHANNEL_SHARE", "SALES_CHANNEL_SHARE_CHANGE", "TOP_CLIENTS_PROJECTED_SHARE", "TOP_CLIENTS_PROJECTED_CONCENTRATION", "CLIENT_PARETO", "SALES_MIX_SHIFT", "CLIENT_CHURN_RATE", "NEW_CLIENT_RETENTION", "TOP_CLIENTS_BY_CHANNEL"].includes(family) &&
    !hasPeriod(spec)
  ) {
    return {
      ok: true,
      family,
      spec,
      clarification: "¿De qué mes o periodo quieres esa lectura comercial?",
      now,
    };
  }

  if (Array.isArray(opts.salesRows) || opts.movementPack || opts.maxFecha || opts.dicfRows || opts.plantForecastKg != null) {
    return finishWithData({ spec, family, now, planta_id: plantIdToUse, opts, question });
  }

  const db = opts.db || pool;
  const plantLabel = spec.plant_label || (req && req.body && req.body.planta_nombre);
  let codes = opts.plantCodes;
  if (!codes && db && typeof db.query === "function") {
    const resolved = await resolvePlantCodes(db, plantLabel);
    codes = resolved && resolved.uniqueCodes;
  }
  if (!codes || !codes.length) {
    return {
      ok: false,
      status: 400,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      error: "No pude resolver el código ARR de la planta. No invento cifras.",
      spec,
      now,
      family,
    };
  }

  if (family === "DATA_FRESHNESS") {
    const maxFecha = await loadMaxFecha(db, codes, opts);
    return {
      ok: true,
      family,
      spec,
      now,
      planta_id: plantIdToUse,
      freshness: { source: "arr.ventas_diarias_cliente", max_fecha: maxFecha },
      data_semantics: "OBSERVED",
    };
  }

  if (family === "CLIENT_CHURN_RISK" || family === "EXPECTED_NEXT_PURCHASE") {
    if (Array.isArray(opts.dicfRows) && opts.dicfRows.length) {
      return finishWithData({ spec, family, now, planta_id: plantIdToUse, opts, question });
    }
    const loaded = await loadDicfSignalsReadOnly(db, codes, now, opts);
    if (loaded && loaded.length) {
      return finishWithData({
        spec,
        family,
        now,
        planta_id: plantIdToUse,
        opts: { ...opts, dicfRows: loaded },
        question,
      });
    }
    return {
      ok: true,
      family,
      spec,
      limitation: insufficientDicfEvidence(family),
      now,
      planta_id: plantIdToUse,
    };
  }

  const period = spec.period;
  const [y, m] = period.split("-").map(Number);
  const startStr = `${period}-01`;
  const last = new Date(y, m, 0).getDate();
  const endStr = `${period}-${String(last).padStart(2, "0")}`;
  const qSales = opts.queryMonthlySales || queryMonthlySales;
  const sales = await qSales(db, codes, startStr, endStr, "ambos");
  const salesRows = (sales && sales.rows) || sales || [];
  let priorRows = null;
  if (family === "SALES_CHANNEL_SHARE_CHANGE" || family === "SALES_MIX_SHIFT" || family === "NEW_CLIENT_RETENTION") {
    const prev = spec.period_from || previousYearMonth(period);
    const [py, pm] = prev.split("-").map(Number);
    const pLast = new Date(py, pm, 0).getDate();
    const priorSales = await qSales(db, codes, `${prev}-01`, `${prev}-${String(pLast).padStart(2, "0")}`, "ambos");
    priorRows = (priorSales && priorSales.rows) || priorSales || [];
  }
  let plantForecastKg = null;
  if (family === "TOP_CLIENTS_PROJECTED_SHARE" || family === "TOP_CLIENTS_PROJECTED_CONCENTRATION") {
    plantForecastKg = await loadPlantForecastKg(db, codes, period, opts);
  }
  let movementPack = null;
  if (family === "CLIENT_CHURN_RATE" || family === "NEW_CLIENT_RETENTION") {
    const plantCode = opts.arrPlantCode || (await resolveArrClientesMesPlantCode(db, plantLabel));
    const compute = opts.computeClientesDescuentoMes || computeClientesDescuentoMes;
    if (family === "NEW_CLIENT_RETENTION") {
      const next = nextYearMonth(period);
      const [ny, nm] = String(next).split("-").map(Number);
      const [packA, packB] = await Promise.all([
        compute(db, y, m, plantCode, { historico: true }),
        compute(db, ny, nm, plantCode, { historico: true }),
      ]);
      movementPack = { packA, packB, prev: period, next };
    } else {
      const prev = prevYmMovement(period);
      const [py, pm] = prev.split("-").map(Number);
      const [packA, packB] = await Promise.all([
        compute(db, py, pm, plantCode, { historico: true }),
        compute(db, y, m, plantCode, { historico: true }),
      ]);
      movementPack = { packA, packB, prev };
    }
  }
  return finishWithData({
    spec,
    family,
    now,
    planta_id: plantIdToUse,
    opts: { ...opts, salesRows, priorRows, plantForecastKg, movementPack },
    question,
  });
}

function finishWithData({ spec, family, now, planta_id, opts, question }) {
  const salesRows = opts.salesRows || [];
  const priorRows = opts.priorRows || [];
  if (family === "SALES_CHANNEL_SHARE") {
    const ch = sumByChannel(salesRows);
    if (ch.total_kg <= 0) {
      return {
        ok: true,
        family,
        spec,
        now,
        planta_id,
        no_data: `No tengo venta observada Casa/Comisionista para ${formatMonthLabel(spec.period)}.`,
      };
    }
    return {
      ok: true,
      family,
      spec,
      now,
      planta_id,
      channels: {
        casa_ton: kgToTon(ch.casa_kg),
        comisionista_ton: kgToTon(ch.comisionista_kg),
        casa_pct: pct(ch.casa_kg, ch.total_kg),
        comisionista_pct: pct(ch.comisionista_kg, ch.total_kg),
        total_ton: kgToTon(ch.total_kg),
      },
      data_semantics: "OBSERVED",
      denominator: "OBSERVED_CHANNEL_TOTAL",
    };
  }
  if (family === "SALES_CHANNEL_SHARE_CHANGE") {
    const a = sumByChannel(priorRows);
    const b = sumByChannel(salesRows);
    if (a.total_kg <= 0 || b.total_kg <= 0) {
      return { ok: true, family, spec, now, planta_id, no_data: "No tengo participación comparable en ambos meses." };
    }
    const casaA = pct(a.casa_kg, a.total_kg);
    const casaB = pct(b.casa_kg, b.total_kg);
    const comiA = pct(a.comisionista_kg, a.total_kg);
    const comiB = pct(b.comisionista_kg, b.total_kg);
    return {
      ok: true,
      family,
      spec,
      now,
      planta_id,
      change: {
        from: spec.period_from || previousYearMonth(spec.period),
        to: spec.period,
        casa_pp: Math.round((casaB - casaA) * 10) / 10,
        comisionista_pp: Math.round((comiB - comiA) * 10) / 10,
        casa_from: casaA,
        casa_to: casaB,
        comisionista_from: comiA,
        comisionista_to: comiB,
      },
      data_semantics: "OBSERVED",
    };
  }
  if (family === "SALES_MIX_SHIFT") {
    const qn = normalize(question || (spec && spec.question) || "");
    const subcategoryAsked = /\bautotanque\b/.test(qn) || /\bcarburacion\b/.test(qn) || /\bsubcategoria\b/.test(qn);
    if (!subcategoryAsked && (salesRows.length || priorRows.length)) {
      const a = sumByChannel(priorRows);
      const b = sumByChannel(salesRows);
      if (a.total_kg > 0 && b.total_kg > 0) {
        const casaA = pct(a.casa_kg, a.total_kg);
        const casaB = pct(b.casa_kg, b.total_kg);
        const comiA = pct(a.comisionista_kg, a.total_kg);
        const comiB = pct(b.comisionista_kg, b.total_kg);
        return {
          ok: true,
          family,
          spec,
          now,
          planta_id,
          change: {
            from: previousYearMonth(spec.period),
            to: spec.period,
            casa_pp: Math.round((casaB - casaA) * 10) / 10,
            comisionista_pp: Math.round((comiB - comiA) * 10) / 10,
            casa_from: casaA,
            casa_to: casaB,
            comisionista_from: comiA,
            comisionista_to: comiB,
            mix_kind: "CASA_COMISIONISTA",
          },
          data_semantics: "OBSERVED",
        };
      }
    }
    const a = mixBySubcategory(priorRows.length ? priorRows : salesRows);
    const b = mixBySubcategory(salesRows);
    if (b.total <= 0) {
      return { ok: true, family, spec, now, planta_id, no_data: "No tengo mezcla de venta para ese periodo." };
    }
    const keys = new Set([...a.map.keys(), ...b.map.keys()]);
    const shifts = [...keys].map((k) => ({
      subcategory: k,
      pct_from: pct(a.map.get(k) || 0, a.total || 1),
      pct_to: pct(b.map.get(k) || 0, b.total),
    }));
    return { ok: true, family, spec, now, planta_id, mix: shifts, data_semantics: "OBSERVED" };
  }
  if (family === "TOP_CLIENTS_BY_CHANNEL") {
    const ranked = rankRows(salesRows, spec.limit, spec.customer_segment);
    const ch = sumByChannel(salesRows);
    const channelKg =
      spec.customer_segment === "COMISIONISTA"
        ? ch.comisionista_kg
        : spec.customer_segment === "CASA"
          ? ch.casa_kg
          : ch.total_kg;
    if (!ranked.length) {
      return { ok: true, family, spec, now, planta_id, no_data: "No tengo compra observada para ese ranking de canal." };
    }
    return {
      ok: true,
      family,
      spec,
      now,
      planta_id,
      ranked: ranked.map((r) => ({
        ...r,
        observed_ton: r.ton,
        pct_of_channel: pct(r.kg, channelKg),
        pct_of_total: pct(r.kg, ch.total_kg),
      })),
      channel_ton: kgToTon(channelKg),
      total_ton: kgToTon(ch.total_kg),
      data_semantics: "OBSERVED",
    };
  }
  if (family === "CLIENT_PARETO") {
    const all = rankRows(salesRows, 999, spec.customer_segment);
    const totalKg = all.reduce((s, r) => s + r.kg, 0);
    if (!totalKg) return { ok: true, family, spec, now, planta_id, no_data: "No tengo volumen para armar el Pareto." };
    const cut = paretoCut(all, spec.pareto_threshold, totalKg);
    return {
      ok: true,
      family,
      spec,
      now,
      planta_id,
      pareto: cut,
      clients_needed: cut.length,
      threshold: spec.pareto_threshold,
      data_semantics: "OBSERVED",
    };
  }
  if (family === "TOP_CLIENTS_PROJECTED_SHARE" || family === "TOP_CLIENTS_PROJECTED_CONCENTRATION") {
    const ranked = rankRows(salesRows, spec.limit, spec.customer_segment);
    const denom = Number(opts.plantForecastKg);
    if (!ranked.length) {
      return { ok: true, family, spec, now, planta_id, no_data: "No tengo compra observada para ese ranking." };
    }
    if (!Number.isFinite(denom) || denom <= 0) {
      return {
        ok: true,
        family,
        spec,
        now,
        planta_id,
        limitation: "Tengo la venta observada por cliente, pero no un cierre proyectado de planta para usarlo de denominador.",
        ranked,
      };
    }
    const withShare = ranked.map((r) => ({
      ...r,
      observed_ton: r.ton,
      pct_of_projected: pct(r.kg, denom),
    }));
    const accKg = withShare.reduce((s, r) => s + r.kg, 0);
    return {
      ok: true,
      family,
      spec,
      now,
      planta_id,
      ranked: withShare,
      accumulated_ton: kgToTon(accKg),
      accumulated_pct: pct(accKg, denom),
      denominator_kg: denom,
      numerator: "OBSERVED_CLIENT_KG",
      denominator: "PROJECTED_TOTAL_PLANT_SALES",
      data_semantics: "OBSERVED_OVER_PROJECTED_PLANT",
    };
  }
  if (family === "CLIENT_CHURN_RATE" || family === "NEW_CLIENT_RETENTION") {
    const packA = (opts.movementPack && opts.movementPack.packA && opts.movementPack.packA.rows) || [];
    const packB = (opts.movementPack && opts.movementPack.packB && opts.movementPack.packB.rows) || [];
    const mapB = new Map(packB.map((r) => [String(r.cliente || "").trim(), r]));
    if (family === "NEW_CLIENT_RETENTION") {
      let news = 0;
      let retained = 0;
      const retainedNames = [];
      const lostNew = [];
      for (const r of packA) {
        const name = String(r.cliente || "").trim();
        if (!name) continue;
        const prevKg = Number(r.prevKg != null ? r.prevKg : r.kg_a);
        const curKg = Number(r.kg != null ? r.kg : r.kg_b) || 0;
        const isNew =
          r.estatus === "Nuevo" ||
          r.movement === "NUEVOS" ||
          classifyEstatus(Number.isFinite(prevKg) ? prevKg : 0, curKg) === "NUEVOS";
        if (!isNew) continue;
        news += 1;
        const later = mapB.get(name);
        if (later && Number(later.kg) > 0) {
          retained += 1;
          retainedNames.push(name);
        } else lostNew.push(name);
      }
      if (!news) {
        return { ok: true, family, spec, now, planta_id, no_data: "No tengo una generación NEW_IN_PERIOD comparable. No afirmo FIRST_EVER. No calculo retención sin mes posterior." };
      }
      return {
        ok: true,
        family,
        spec,
        now,
        planta_id,
        retention: {
          new_in_prior: news,
          new_clients_count: news,
          retained,
          retained_next_month_count: retained,
          lost: lostNew.length,
          rate: pct(retained, news),
          names: retainedNames.slice(0, 20),
          not_retained: lostNew.slice(0, 20),
        },
        compare_period: spec.period,
        next_period: nextYearMonth(spec.period),
      };
    }
    let base = 0;
    let left = 0;
    const source = packB.length ? packB : packA;
    for (const r of source) {
      const prevKg = Number(r.prevKg != null ? r.prevKg : r.kg_a);
      const curKg = Number(r.kg != null ? r.kg : r.kg_b);
      const priorKg = Number.isFinite(prevKg) ? prevKg : 0;
      const currentKg = Number.isFinite(curKg) ? curKg : 0;
      if (priorKg > 0) {
        base += 1;
        if (currentKg <= 0) left += 1;
      }
    }
    if (!base) return { ok: true, family, spec, now, planta_id, no_data: "No tengo población base con compra en el mes previo. Denominador = clientes con kg previo > 0." };
    return {
      ok: true,
      family,
      spec,
      now,
      planta_id,
      churn: { denominator: base, numerator: left, rate: pct(left, base) },
      data_semantics: "OBSERVED",
    };
  }
  if (family === "CLIENT_CHURN_RISK" || family === "EXPECTED_NEXT_PURCHASE") {
    const hint = extractExpectedClientHint(question || "");
    let pool = opts.dicfRows || [];
    if (hint) {
      const h = hint.toLowerCase();
      pool = pool.filter((r) => String(r.cliente || "").toLowerCase().includes(h));
    }
    const asOf = opts.asOfDate || now.toISOString().slice(0, 10);
    const scored = [];
    const missing = [];
    for (const r of pool) {
      const last = r.lastPurchaseDate ? String(r.lastPurchaseDate).slice(0, 10) : null;
      const freq = Number(r.freqDays);
      if (!last || !Number.isFinite(freq) || freq <= 0 || freq >= 9999) {
        missing.push({
          cliente: r.cliente,
          missing: [!last ? "last_purchase_date" : null, !Number.isFinite(freq) || freq <= 0 || freq >= 9999 ? "freqDays" : null].filter(
            Boolean
          ),
        });
        continue;
      }
      const days = Math.round((new Date(`${asOf}T00:00:00`) - new Date(`${last}T00:00:00`)) / 86400000);
      const expected = new Date(`${last}T00:00:00`);
      expected.setDate(expected.getDate() + freq);
      scored.push({
        cliente: r.cliente,
        lastPurchaseDate: last,
        days_since_last_purchase: days,
        historical_frequency: freq,
        overdue_days: days - freq,
        expected_next: expected.toISOString().slice(0, 10),
      });
    }
    if (!scored.length) {
      if (missing.length) {
        const first = missing[0];
        return {
          ok: true,
          family,
          spec,
          now,
          planta_id,
          limitation: `INSUFFICIENT_EVIDENCE: falta ${first.missing.join(" y ")} para ${first.cliente || "el cliente"}. No invento la fecha ni un score de abandono.`,
        };
      }
      return { ok: true, family, spec, limitation: insufficientDicfEvidence(family), now, planta_id };
    }
    if (family === "EXPECTED_NEXT_PURCHASE") {
      return {
        ok: true,
        family,
        spec,
        now,
        planta_id,
        expected: scored.sort((a, b) => a.expected_next.localeCompare(b.expected_next)).slice(0, spec.limit),
      };
    }
    const risk = scored.filter((r) => r.overdue_days > 0).sort((a, b) => b.overdue_days - a.overdue_days).slice(0, spec.limit);
    return { ok: true, family, spec, now, planta_id, risk };
  }
  if (family === "DATA_FRESHNESS") {
    return { ok: true, family, spec, now, planta_id, freshness: { source: "arr.ventas_diarias_cliente", max_fecha: opts.maxFecha || null } };
  }
  return { ok: true, family, spec, now, planta_id, limitation: limitationAnswer(family) };
}

function neverEmptyPredictiveLocal(answer, family) {
  const text = String(answer == null ? "" : answer).trim();
  if (text) {
    if (/INSUFFICIENT_EVIDENCE|CLARIFICATION_REQUIRED|RESULT_WITH_EVIDENCE/.test(text)) return text;
    return `RESULT_WITH_EVIDENCE: ${text}`;
  }
  if (family === "EXPECTED_NEXT_PURCHASE") {
    return "INSUFFICIENT_EVIDENCE: falta freqDays o last_purchase_date. No invento la fecha.";
  }
  if (family === "CLIENT_CHURN_RISK") {
    return "INSUFFICIENT_EVIDENCE: no hay clientes con retraso respecto de frecuencia histórica DICF. No afirmo que vayan a dejar de comprar.";
  }
  return "INSUFFICIENT_EVIDENCE: no pude materializar la lectura comercial. No invento cifras.";
}

function buildPredictiveAnswer(payload) {
  if (!payload) return neverEmptyPredictiveLocal(null, null);
  if (payload.clarification) return payload.clarification;
  if (payload.limitation) return payload.limitation;
  if (payload.no_data) return payload.no_data;
  const spec = payload.spec || {};
  const month = formatMonthLabel(spec.period);
  if (payload.channels) {
    const c = payload.channels;
    return [
      `Participación observada de venta en ${month} (Casa + Comisionista = 100%):`,
      `Casa: ${c.casa_pct}% (${c.casa_ton.toFixed(1)} ton)`,
      `Comisionista: ${c.comisionista_pct}% (${c.comisionista_ton.toFixed(1)} ton)`,
    ].join("\n");
  }
  if (payload.change) {
    const x = payload.change;
    const sign = (n) => (n > 0 ? `+${n}` : String(n));
    const title =
      x.mix_kind === "CASA_COMISIONISTA"
        ? `Cambio de mezcla Casa/Comisionista ${formatMonthLabel(x.from)} → ${formatMonthLabel(x.to)} (puntos porcentuales):`
        : `Cambio de participación observada ${formatMonthLabel(x.from)} → ${formatMonthLabel(x.to)} (puntos porcentuales, no %):`;
    return [
      title,
      `Casa: ${x.casa_from}% → ${x.casa_to}% (${sign(x.casa_pp)} pp)`,
      `Comisionista: ${x.comisionista_from}% → ${x.comisionista_to}% (${sign(x.comisionista_pp)} pp)`,
    ].join("\n");
  }
  if (payload.ranked && payload.denominator === "PROJECTED_TOTAL_PLANT_SALES") {
    const label = spec.customer_segment === "CASA" ? "Casa" : spec.customer_segment === "COMISIONISTA" ? "Comisionistas" : "clientes";
    const lines = [
      `Top ${spec.limit} ${label} por compra observada — ${month}`,
      `El porcentaje es venta observada del cliente sobre el cierre proyectado total de la planta. No es proyección del cliente.`,
    ];
    payload.ranked.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.cliente}`);
      lines.push(`   Venta observada: ${r.observed_ton.toFixed(1)} ton`);
      lines.push(`   % del cierre proyectado planta: ${r.pct_of_projected}%`);
    });
    if (payload.family === "TOP_CLIENTS_PROJECTED_CONCENTRATION" || payload.accumulated_pct != null) {
      lines.push(`Top ${spec.limit} acumulado: ${payload.accumulated_ton.toFixed(1)} ton`);
      lines.push(`${payload.accumulated_pct}% del cierre proyectado de la planta`);
    }
    return lines.join("\n");
  }
  if (payload.pareto) {
    return [
      `Clientes necesarios para acumular el ${payload.threshold}% de la venta observada en ${month}: ${payload.clients_needed}.`,
      ...payload.pareto.map((r, i) => `${i + 1}. ${r.cliente} — ${r.ton.toFixed(1)} ton (acum. ${r.accumulated_pct}%)`),
    ].join("\n");
  }
  if (payload.churn) {
    return `En ${month}, ${payload.churn.numerator} de ${payload.churn.denominator} clientes con compra en el mes previo pasaron a sin compra (${payload.churn.rate}%). Denominador = clientes con kg previo > 0.`;
  }
  if (payload.retention) {
    const cohort = formatMonthLabel(payload.compare_period || spec.period);
    const next = formatMonthLabel(payload.next_period || month);
    const count = payload.retention.new_clients_count != null ? payload.retention.new_clients_count : payload.retention.new_in_prior;
    const retained =
      payload.retention.retained_next_month_count != null
        ? payload.retention.retained_next_month_count
        : payload.retention.retained;
    return `De ${count} clientes nuevos de ${cohort} (NEW_IN_PERIOD), ${retained} volvieron a comprar en ${next} (${payload.retention.rate}%). retention_rate = retained_next_month_count / new_clients_count. No afirmo primera compra histórica.`;
  }
  if (payload.risk) {
    if (!payload.risk.length) {
      return "INSUFFICIENT_EVIDENCE: no hay clientes con retraso respecto de frecuencia histórica DICF. No afirmo que vayan a dejar de comprar.";
    }
    return [
      "Clientes con señal de interrupción (retraso respecto de frecuencia histórica). No afirmo que vayan a dejar de comprar.",
      ...payload.risk.map((r, i) =>
        [
          `${i + 1}. ${r.cliente}`,
          `   Última compra: ${r.lastPurchaseDate}`,
          `   freqDays: ${r.historical_frequency}`,
          `   Días desde última compra: ${r.days_since_last_purchase}`,
          `   Días de retraso: ${r.overdue_days}`,
        ].join("\n")
      ),
    ].join("\n");
  }
  if (payload.expected) {
    if (!payload.expected.length) {
      return "INSUFFICIENT_EVIDENCE: falta freqDays o última compra. No invento la fecha.";
    }
    return [
      "Próxima compra estimada = last_purchase_date + freqDays. Es una estimación histórica, no un compromiso y no un forecast contractual.",
      ...payload.expected.map((r) =>
        `${r.cliente}: fecha estimada ${r.expected_next} | última compra ${r.lastPurchaseDate || "DATA_NOT_FOUND"} | freqDays ${r.historical_frequency}`.trim()
      ),
    ].join("\n");
  }
  if (payload.ranked && payload.family === "TOP_CLIENTS_BY_CHANNEL") {
    const label = spec.customer_segment === "CASA" ? "Casa" : spec.customer_segment === "COMISIONISTA" ? "Comisionista" : "clientes";
    const lines = [`Top ${spec.limit} ${label} — ${month}`];
    payload.ranked.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.cliente} — ${r.ton.toFixed(1)} ton`);
      if (r.pct_of_channel != null) lines.push(`   Participación del canal: ${r.pct_of_channel}%`);
      if (r.pct_of_total != null) lines.push(`   Participación del total observado: ${r.pct_of_total}%`);
    });
    return lines.join("\n");
  }
  if (payload.freshness) {
    if (!payload.freshness.max_fecha) return "No tengo MAX(fecha) de arr.ventas_diarias_cliente para esa planta. No uso la fecha del servidor.";
    return `Respondo con corte de ventas ${payload.freshness.max_fecha} (MAX(fecha) de ${payload.freshness.source}). No es la fecha del servidor.`;
  }
  if (payload.mix) {
    const lines = payload.mix
      .map((m) => `${m.subcategory}: ${m.pct_from != null ? `${m.pct_from}% → ` : ""}${m.pct_to}%`)
      .slice(0, 12);
    return [`Mezcla de participación observada en ${month} (no toneladas absolutas):`, ...lines].join("\n");
  }
  if (spec.family === "CLIENT_CHURN_RISK") {
    return insufficientDicfEvidence("CLIENT_CHURN_RISK");
  }
  if (spec.family === "EXPECTED_NEXT_PURCHASE") {
    return insufficientDicfEvidence("EXPECTED_NEXT_PURCHASE");
  }
  const fallback = limitationAnswer(spec.family);
  return neverEmptyPredictiveLocal(
    fallback || "INSUFFICIENT_EVIDENCE: no pude materializar la lectura comercial sin inventar cifras.",
    spec.family
  );
}

function buildPredictiveChatResult(payload, opts = {}) {
  const family = payload && (payload.family || (payload.spec && payload.spec.family));
  const answer = neverEmptyPredictiveLocal(buildPredictiveAnswer(payload), family);
  const spec = payload && payload.spec;
  const plantaId = payload && payload.planta_id != null ? payload.planta_id : opts.planta_id;
  const pending =
    payload && payload.clarification && spec && !hasPeriod(spec)
      ? {
          kind: "dimension_completion",
          parent_intent: "predictive_commercial",
          missing_fields: ["period"],
          frame: { ...spec },
          original_question: payload.question || null,
          why_blocks: "Falta periodo. No invento el mes.",
        }
      : null;
  return {
    ok: true,
    answer,
    sources: payload && payload.ok !== false ? ["arr.ventas_diarias_cliente"] : [],
    context_meta: {
      mode: SEMANTIC_CLASS,
      openai_called: false,
      veracity: DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
      semantic_class: SEMANTIC_CLASS,
      family: payload && payload.family,
      planta_id: plantaId,
      conversation_state: {
        parent_intent: "predictive_commercial",
        planta_id: plantaId,
        active_subtopic: payload && payload.family,
        active_entities: [
          {
            kind: "predictive_commercial",
            family: payload && payload.family,
            channel: spec && spec.channel,
            period: spec && spec.period,
            limit: spec && spec.limit,
            denominator: spec && spec.denominator,
            data_semantics: spec && spec.data_semantics,
            ranked_names: ((payload && payload.ranked) || []).map((r) => r.cliente).slice(0, 20),
          },
        ],
        pending_information_gap: pending,
      },
    },
  };
}

function priorPredictiveFromState(state) {
  const entities = state && Array.isArray(state.active_entities) ? state.active_entities : [];
  const hit = entities.find((e) => e && e.kind === "predictive_commercial");
  const gap = state && state.pending_information_gap && state.pending_information_gap.frame;
  if (!hit && !gap && !(state && state.parent_intent === "predictive_commercial")) return null;
  return {
    ok: true,
    family: (hit && hit.family) || (gap && gap.family) || null,
    channel: (hit && hit.channel) || (gap && gap.channel) || "ALL",
    customer_segment: (hit && hit.channel) || (gap && gap.customer_segment) || "ALL",
    period: (hit && hit.period) || (gap && (gap.period_month || gap.period)) || null,
    limit: (hit && hit.limit) || (gap && gap.limit) || 10,
    denominator: (hit && hit.denominator) || (gap && gap.denominator) || null,
    data_semantics: (hit && hit.data_semantics) || (gap && gap.data_semantics) || "OBSERVED",
    ranked_names: (hit && hit.ranked_names) || [],
  };
}

module.exports = {
  SEMANTIC_CLASS,
  FAMILY_IDS,
  FAMILY_STATUS,
  LIMITATION,
  classifyPredictiveFamily,
  isPredictiveCommercialQuestion,
  isPredictiveFollowUp,
  isTopClientsProjectedShareQuestion,
  isSalesChannelShareQuestion,
  isSalesChannelShareChangeQuestion,
  isSalesMixShiftQuestion,
  isNewClientRetentionQuestion,
  isChurnRiskQuestion,
  isExpectedNextPurchaseQuestion,
  isChannelForecastGuardrailQuestion,
  isChannelForecastProjectionGuardrailQuestion,
  extractContraReferenceMonth,
  isProjectedConcentrationQuestion,
  isParetoQuestion,
  buildFrame,
  sumByChannel,
  rankRows,
  paretoCut,
  pct,
  nextYearMonth,
  loadPredictiveForChat,
  buildPredictiveAnswer,
  buildPredictiveChatResult,
  priorPredictiveFromState,
};
