"use strict";

/**
 * Director IA — composición semántica del backlog ejecutivo.
 * Las paráfrasis viven en tests. Aquí: dominio, operación, dimensión y refinamiento.
 */

const { extractNamedPlant } = require("./director-ia-historical-margin");
const { extractPlantLabel } = require("./director-ia-seh-operation-status");

const FUNCTIONAL_WORDS = Object.freeze([
  "hemos",
  "ha",
  "han",
  "se",
  "ha",
  "llevamos",
  "gastado",
  "gastamos",
  "gasté",
  "gaste",
  "gasto",
  "total",
  "cuanto",
  "cuantos",
  "de",
  "en",
  "por",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
]);

const PLANT_CONCEPT_BLOCKLIST = Object.freeze([
  "acapulco",
  "puebla",
  "tehuacan",
  "queretaro",
  "san luis",
  "san luis potosi",
  "morelos",
  "nanacamilpa",
]);

const CATEGORY_LABELS = Object.freeze({
  taller: "Taller",
  gastos: "Gastos",
  inversiones: "Inversiones",
  inversion: "Inversiones",
});

function normalize(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPlant(question) {
  return extractNamedPlant(question) || extractPlantLabel(question) || null;
}

function isPlantToken(token) {
  const n = normalize(token);
  return PLANT_CONCEPT_BLOCKLIST.some((p) => n === p || n.includes(p));
}

function extractOrdinal(question) {
  const n = normalize(question);
  if (/\bpenultimo\b/.test(n)) return { kind: "ordinal", index: -2 };
  if (/\bultimo\b/.test(n) && !/\bmes\b/.test(n)) return { kind: "ordinal", index: -1 };
  if (/\bprimero\b/.test(n) || /\bnumero\s+1\b/.test(n) || /\b1o\b/.test(n)) return { kind: "ordinal", index: 1 };
  if (/\bsegundo\b/.test(n) || /\bnumero\s+2\b/.test(n)) return { kind: "ordinal", index: 2 };
  if (/\btercero\b/.test(n) || /\bnumero\s+3\b/.test(n)) return { kind: "ordinal", index: 3 };
  const num = n.match(/\bnumero\s+(\d{1,2})\b/) || n.match(/\bel\s+(\d{1,2})\b/);
  if (num) return { kind: "ordinal", index: Number(num[1]) };
  const folio = String(question || "").match(/\bF-\d{6}-\d+\b/i);
  if (folio) return { kind: "folio_id", value: folio[0].toUpperCase() };
  return null;
}

function refineFrame(prev, patch) {
  const base = prev && typeof prev === "object" ? { ...prev } : {};
  const next = { ...base };
  if (!patch || typeof patch !== "object") return next;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    next[key] = value;
  }
  return next;
}

function selectOrdinal(items, selector) {
  const list = Array.isArray(items) ? items : [];
  if (!selector || !list.length) return null;
  if (selector.kind === "folio_id") {
    return list.find((row) => String(row.numero_folio || row.display || "").toUpperCase() === selector.value) || null;
  }
  if (selector.kind !== "ordinal") return null;
  if (selector.index === -1) return list[list.length - 1] || null;
  if (selector.index === -2) return list[list.length - 2] || null;
  return list[selector.index - 1] || null;
}

function extractChannel(n) {
  if (/\bcomisionistas?\b/.test(n)) return "COMISIONISTA";
  if (/\bcasa\b/.test(n)) return "CASA";
  return "ALL";
}

function extractRankN(n, fallback = 5) {
  const digit = n.match(/\btop\s+(\d{1,2})\b/) || n.match(/\blos\s+(\d{1,2})\b/) || n.match(/\b(\d{1,2})\s+clientes\b/);
  if (digit) {
    const v = Number(digit[1]);
    if (v >= 1 && v <= 20) return v;
  }
  return fallback;
}

function isClientDiscountRankingQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (/\b(folios?|extintor|accion|bitacora)\b/.test(n)) return false;
  const discount = /\bdescuento/.test(n);
  const rank =
    /\btop\b/.test(n) ||
    /\bbottom\b/.test(n) ||
    /\branking\b/.test(n) ||
    /\bmayor(?:es)?\b/.test(n) ||
    /\bmenor(?:es)?\b/.test(n) ||
    /\bmas\s+alto\b/.test(n) ||
    /\bmas\s+bajo\b/.test(n) ||
    /\bquien(?:es)?\s+tiene/.test(n) ||
    /\bcual(?:es)?\s+cliente/.test(n) ||
    /\btienen?\s+(mas|el|mayor)\s+descuento/.test(n) ||
    /\bque\s+clientes\s+tienen/.test(n) ||
    /\bclientes?\s+con\b/.test(n) ||
    /\blider/.test(n) ||
    /\bprincipales?\b/.test(n) ||
    /\bordenad/.test(n);
  return discount && rank;
}

function extractClientDiscountRankingSpec(question, prior) {
  const n = normalize(question);
  if (!isClientDiscountRankingQuestion(question) && !(prior && prior.ok && /\bdescuento/.test(n))) {
    return { ok: false };
  }
  return {
    ok: true,
    family: "CLIENT_DISCOUNT_RANKING",
    domain: "ARR",
    operation: "RANK",
    metric: "DISCOUNT",
    direction: /\bmenor|bottom|mas\s+bajo|menos\b/.test(n) ? "LOW" : "HIGH",
    limit: extractRankN(n, prior && prior.limit ? prior.limit : 5),
    channel: extractChannel(n),
    plant: extractPlant(question) || (prior && prior.plant) || null,
  };
}

function isClientMovementQuestion(question) {
  const n = normalize(question);
  if (!n || /\b(folios?|extintor)\b/.test(n)) return false;
  return Boolean(
    /\bdejaron\s+de\s+(comprar|consumir)\b/.test(n) ||
      /\bdejo\s+de\s+(comprar|consumir)\b/.test(n) ||
      /\bdisminuy/.test(n) ||
      /\baumentaron\b/.test(n) ||
      /\bclientes?\s+nuevos?\b/.test(n) ||
      /\bnuevos?\s+clientes?\b/.test(n) ||
      /\blos\s+nuevos\b/.test(n) ||
      /\bson\s+los\s+nuevos\b/.test(n) ||
      /\bentraron\s+nuevos\b/.test(n) ||
      /\bnuevos?\s+que\s+entraron\b/.test(n) ||
      /\binactiv/.test(n) ||
      /\bse\s+fueron\b/.test(n) ||
      /\bcayeron\s+a\s+cero\b/.test(n) ||
      /\bya\s+no\s+consumen\b/.test(n) ||
      /\bbajaron\s+ventas\b/.test(n) ||
      /\bsubieron\s+ventas\b/.test(n) ||
      /\bno\s+compraron\b/.test(n) ||
      /\bmovimiento\s+a\s+la\s+baja\b/.test(n) ||
      /\bmovimiento\s+al\s+alza\b/.test(n)
  );
}

function extractClientMovementSpec(question, prior) {
  const n = normalize(question);
  if (!isClientMovementQuestion(question)) return { ok: false };
  let movement = "DISMINUYERON";
  if (/\bdejaron\s+de\b/.test(n) || /\bdejo\s+de\b/.test(n)) movement = "DEJARON_DE_COMPRAR";
  else if (/\baumentaron\b/.test(n)) movement = "AUMENTARON";
  else if (/\bnuevos?\b/.test(n)) movement = "NUEVOS";
  else if (/\binactiv/.test(n)) movement = "INACTIVOS";
  return {
    ok: true,
    family: "CLIENT_MOVEMENT",
    domain: "ARR",
    operation: "LIST",
    movement,
    channel: extractChannel(n),
    plant: extractPlant(question) || (prior && prior.plant) || null,
    require_two_periods: true,
    inactive_supported: false,
  };
}

function isEntitySetFollowUp(question, priorEntities) {
  const n = normalize(question);
  if (!n || !Array.isArray(priorEntities) || priorEntities.length < 1) return false;
  return Boolean(
    /\bdisminuy/.test(n) ||
      /\bcompraban\b/.test(n) ||
      /\bbajaron\b/.test(n) ||
      /\bdescuento/.test(n) ||
      /\bcomentarios?\b/.test(n) ||
      /\bacciones?\b/.test(n) ||
      /\bcayo\s+mas\b/.test(n) ||
      /\bde\s+los\s+dos\b/.test(n) ||
      /\besos\s+dos\b/.test(n) ||
      /\bcompar/.test(n)
  );
}

function isClientContactLookupQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\btelefono\b/.test(n) ||
      /\btel\b/.test(n) ||
      /\bcorreo\b/.test(n) ||
      /\bemail\b/.test(n) ||
      /\bmail\b/.test(n) ||
      /\bcontacto\b/.test(n) ||
      /\bcontactar\b/.test(n) ||
      /\bcomo\s+lo\s+contacto\b/.test(n) ||
      /\bcomo\s+le\s+hablo\b/.test(n) ||
      /\bnumero\s+de\b/.test(n) && /\bhoracio|cliente\b/.test(n)
  );
}

function extractClientNameHint(question) {
  let n = normalize(question);
  if (!n) return "";
  n = n
    .replace(/\bplanta de \w+\b/g, " ")
    .replace(/\b(acapulco|puebla|tehuacan|queretaro|morelos|nanacamilpa|san luis(?: potosi)?)\b/g, " ")
    .replace(
      /\b(dame|el|la|los|las|de|del|cliente|telefono|tel|correo|email|mail|contacto|contactar|como|lo|le|hablo|numero|datos|comercial|electronico|pasame|quiero|busca|necesito|para|a|que|marco|cual|es|su|y)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  return n;
}

function extractClientContactLookupSpec(question) {
  const n = normalize(question);
  if (!isClientContactLookupQuestion(question)) return { ok: false };
  const plant = extractPlant(question);
  let field = "contacto";
  if (/\btelefono\b/.test(n) || /\btel\b/.test(n)) field = "telefono";
  else if (/\bcorreo\b/.test(n) || /\bemail\b/.test(n) || /\bmail\b/.test(n)) field = "correo";
  return {
    ok: true,
    family: "CLIENT_CONTACT_LOOKUP",
    plant,
    name_hint: extractClientNameHint(question),
    field,
    requires_unique_name: true,
    cross_plant: false,
  };
}

function isSehListQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (!/\b(extintor(?:es)?|estaciones?|autotanques?|pipas?|equipos?|sistema\s+contra\s+incendio|seh)\b/.test(n)) {
    return false;
  }
  if (/\bcuant[oa]s\b/.test(n) || /\bvencid|\bestatus|\bestado\b/.test(n)) return false;
  return Boolean(
    /\bque\b/.test(n) ||
      /\bcuales\b/.test(n) ||
      /\blista\b/.test(n) ||
      /\blistar\b/.test(n) ||
      /\bmuestra/.test(n) ||
      /\bensen/.test(n) ||
      /\btenemos\b/.test(n) ||
      /\bhay\b/.test(n) ||
      /\binventario\b/.test(n) ||
      /\bequipos?\s+de\b/.test(n)
  );
}

function isFolioFinancialByPlantQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\bfolios?\b/.test(n) &&
      (/\bdeposit/.test(n) ||
        /\bpagad/.test(n) ||
        /\bpagamos\b/.test(n) ||
        /\bpago\b/.test(n) ||
        /\bpagos\b/.test(n) ||
        /\bimporte\b/.test(n) ||
        /\bcubierto\b/.test(n) ||
        /\bcuanto\s+se\s+ha\b/.test(n)) &&
      Boolean(extractPlant(question))
  );
}

function extractFolioFinancialByPlantSpec(question) {
  if (!isFolioFinancialByPlantQuestion(question)) return { ok: false };
  const n = normalize(question);
  const plant = extractPlant(question);
  let financial_operation = "IMPORTE";
  if (/\bdeposit/.test(n)) financial_operation = "DEPOSITADO";
  else if (/\bpagad/.test(n)) financial_operation = "PAGADO";
  return {
    ok: true,
    family: "FOLIO_FINANCIAL_BY_PLANT",
    plant,
    concept: isPlantToken(plant) ? null : null,
    financial_operation,
    depositado_physical: false,
    truthfulness:
      financial_operation === "DEPOSITADO"
        ? "No existe un campo físico de depósito en Folios. PAGADO/mes_cargo no se traduce a depositado."
        : null,
  };
}

function isProfitabilityPeriodRankingQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (/\b(folios?|extintor|descuento\s+entre)\b/.test(n)) return false;
  return Boolean(
    (/\brentabilidad\b/.test(n) ||
      /\brentable/.test(n) ||
      /\butilidad\b/.test(n) ||
      /\bresultado\b/.test(n) ||
      /\bganamos\b/.test(n) ||
      /\bganado\b/.test(n) ||
      /\bperdimos\b/.test(n) ||
      /\bmejor\s+mes\b/.test(n) ||
      /\bpeor\s+mes\b/.test(n) ||
      /\bmeses?\s+de\s+(mayor|menor)\b/.test(n) ||
      /\borden(?:a|ar)?\s+meses\b/.test(n) ||
      /\borden(?:a|ar)?\s+la\s+rentabilidad/.test(n) ||
      /\btop\s+\d+\s+meses\b/.test(n) ||
      /\btop\s+meses\b/.test(n) ||
      /\bcerro\s+mejor\b/.test(n) ||
      /\bmes\s+cerro\b/.test(n)) &&
      (/\bmes\b/.test(n) || /\bmeses\b/.test(n) || /\btop\b/.test(n) || /\bmejor\b/.test(n) || /\bpeor\b/.test(n) || /\borden/.test(n))
  );
}

function extractProfitabilityPeriodRankingSpec(question) {
  const n = normalize(question);
  if (!isProfitabilityPeriodRankingQuestion(question)) return { ok: false };
  return {
    ok: true,
    family: "PROFITABILITY_PERIOD_RANKING",
    plant: extractPlant(question),
    direction: /\bpeor|perdimos|menos\b/.test(n) ? "WORST" : "BEST",
    limit: extractRankN(n, 1),
    prefer_closed: true,
    exclude_forecast_as_winner: true,
  };
}

function isProfitabilityPeriodComparisonQuestion(question, priorPeriod) {
  const n = normalize(question);
  if (!n) return false;
  const compareCue =
    /\bcompar/.test(n) ||
    /\bdiferencia\b/.test(n) ||
    /\bdelta\b/.test(n) ||
    /\bcambio\b/.test(n) ||
    /\bvs\b/.test(n) ||
    /\bcontra\b/.test(n) ||
    /\brespecto\b/.test(n) ||
    /\bexplican\b/.test(n);
  const periodCue = /\bmes\b/.test(n) || /\bactual\b/.test(n) || /\bese\b/.test(n) || Boolean(priorPeriod);
  if (compareCue && periodCue) return true;
  if (
    priorPeriod &&
    (/\by\s+en\b/.test(n) ||
      /\ben\s+(venta|margen|descuento|ingreso|gastos?|hg|impuestos|casa|comisionista|resultado)\b/.test(n) ||
      /\bmovers?\b/.test(n) ||
      /\baumentaron\b/.test(n) ||
      /\bdisminuy/.test(n) ||
      /\bdejaron\s+de\b/.test(n) ||
      /\bnuevos\b/.test(n))
  ) {
    return true;
  }
  return false;
}

function isPlantDiscountOrMarginComparisonQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (/\bcliente\b/.test(n) || /\bgrupo\s+move\b/.test(n)) return false;
  const metric = /\bdescuento/.test(n) ? "DISCOUNT" : /\bmargen(?:es)?\b/.test(n) ? "MARGIN" : null;
  if (!metric) return false;
  return /\bentre\b/.test(n) || /\bvs\b/.test(n) || /\bcontra\b/.test(n) || (/\bagosto\b/.test(n) && /\bseptiembre\b/.test(n));
}

function extractPlantComparisonSpec(question) {
  const n = normalize(question);
  if (!isPlantDiscountOrMarginComparisonQuestion(question)) return { ok: false };
  return {
    ok: true,
    family: /\bdescuento/.test(n) ? "PLANT_DISCOUNT_COMPARISON" : "PLANT_MARGIN_COMPARISON",
    metric: /\bdescuento/.test(n) ? "DISCOUNT" : "MARGIN",
    plant: extractPlant(question),
    requires_client: false,
    label_forecast_vs_final: true,
  };
}

function isProfitabilityActionPlanQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (/\ben\s+que\s+mes\b/.test(n) || /\bmejor\s+mes\b/.test(n) || /\bpeor\s+mes\b/.test(n)) return false;
  const domain =
    /\brentabilidad\b/.test(n) ||
    /\bnumeros?\s+rojos?\b/.test(n) ||
    /\brojo\b/.test(n) ||
    /\bcierre\b/.test(n) ||
    /\butilidad\b/.test(n) ||
    /\bresultado\b/.test(n) ||
    /\bpalancas?\b/.test(n) ||
    /\brecuper/.test(n) ||
    /\bprioriz/.test(n) ||
    /\bprioridad\b/.test(n) ||
    /\bcuidar\b/.test(n) ||
    /\bescenario\b/.test(n) ||
    /\bhuecos?\b/.test(n) ||
    /\btoneladas\b/.test(n) ||
    /\bmejorar\b/.test(n) ||
    /\beste\s+mes\b/.test(n);
  const action =
    /\bmejorar\b/.test(n) ||
    /\bmejoro\b/.test(n) ||
    /\bque\s+tengo\s+que\s+hacer\b/.test(n) ||
    /\bque\s+debo\s+hacer\b/.test(n) ||
    /\bque\s+hago\b/.test(n) ||
    /\bpalancas?\b/.test(n) ||
    /\brecuper/.test(n) ||
    /\bprioriz/.test(n) ||
    /\bprioridad\b/.test(n) ||
    /\bcuidar\b/.test(n) ||
    /\bsalir\b/.test(n) ||
    /\bsalgo\b/.test(n) ||
    /\bplan\b/.test(n) ||
    /\brecomend/.test(n) ||
    /\benderezar\b/.test(n) ||
    /\batacar\b/.test(n) ||
    /\bmover\b/.test(n) ||
    /\bescenario\b/.test(n) ||
    /\bhuecos?\s+de\s+accion\b/.test(n);
  return Boolean(domain && action);
}

function isOpenDailySalesViewQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (/\bcuanto\s+vend/.test(n) || /\btendencia\b/.test(n) || /\bcomo\s+se\s+calcula\b/.test(n)) return false;
  return Boolean(
    (/\babre\b/.test(n) || /\babrela\b/.test(n) || /\bmuestra/.test(n) || /\blleva/.test(n) || /\bve\s+a\b/.test(n) || /\bir\s+a\b/.test(n) || /\babrir\b/.test(n) || /\bquiero\s+ver\b/.test(n)) &&
      (/\bventa\s+diaria\b/.test(n) ||
        /\bventas\s+diarias\b/.test(n) ||
        /\bforecast\s+diario\b/.test(n) ||
        /\bventa\s+por\s+dia\b/.test(n) ||
        /\bdaily\s+sales\b/.test(n) ||
        /\bdiario\s+de\s+venta\b/.test(n) ||
        /\bal\s+diario\b/.test(n) ||
        /\bdiario\s+de\b/.test(n) ||
        /\bvista\s+diaria\b/.test(n) ||
        /\bventas\s+del\s+dia\b/.test(n) ||
        /\bpantalla\s+de\s+venta\s+diaria\b/.test(n))
  );
}

function extractOpenDailySalesViewSpec(question) {
  if (!isOpenDailySalesViewQuestion(question)) return { ok: false };
  return {
    ok: true,
    family: "OPEN_DAILY_SALES_VIEW",
    plant: extractPlant(question),
    action: "navigate",
    ui_action: { type: "OPEN_DAILY_SALES_VIEW", plant: extractPlant(question) },
    do_not_pretend_opened: true,
  };
}

function isFolioResultNavigationQuestion(question, priorResultSet) {
  const n = normalize(question);
  if (!n) return false;
  if (/\babre\b/.test(n) || /\bentra\b/.test(n) || /\bver\b/.test(n) || /\bregresa\b/.test(n) || /\bquiero\s+ver\b/.test(n)) {
    return Boolean(extractOrdinal(question) || /\bF-\d{6}-\d+\b/i.test(question) || priorResultSet);
  }
  return Boolean(extractOrdinal(question) && priorResultSet);
}

function isFolioResultRefinementQuestion(question, priorSpec) {
  const n = normalize(question);
  if (!n || !priorSpec) return false;
  return Boolean(
    /\bpagaron\b/.test(n) ||
      /\bpagad/.test(n) ||
      /\bpendient/.test(n) ||
      /\by\s+en\b/.test(n) ||
      /\bfebrero\b/.test(n) ||
      /\benero\b/.test(n) && /\bcuales\b/.test(n) ||
      /\bsuman\s+las\s+pagadas\b/.test(n) ||
      /\bde\s+gastos\b/.test(n) ||
      /\bmas\s+reciente\b/.test(n)
  );
}

function isAutotanqueGroupQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (/\b(AT|PT)-\d+\b/i.test(question) && /\bgast/.test(n)) return true;
  return Boolean(/\b(autotanque|autotanques)\b/.test(n) && /\b(taller|gast)\b/.test(n));
}

function extractAutotanqueGroupSpec(question) {
  if (!isAutotanqueGroupQuestion(question)) return { ok: false };
  const token = String(question || "").match(/\b((?:AT|PT)[-\s]?\d{1,4})\b/i);
  return {
    ok: true,
    family: "FOLIO_TALLER_BY_AUTOTANQUE",
    category: "Taller",
    concept: null,
    group_by: "AUTOTANQUE",
    metric: "SUM_AMOUNT",
    unit_token: token ? token[1].replace(/\s+/g, "").toUpperCase() : null,
    identification: "public.folios.unidad (textual token AT/PT)",
  };
}

function isProcurementQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\bproveedores?\b/.test(n) ||
      /\bbeneficiarios?\b/.test(n) ||
      /\bcobran\b/.test(n) ||
      /\bvende(?:n)?\b/.test(n) ||
      /\bsurte\b/.test(n) ||
      /\bfactura\b/.test(n) ||
      /\bvendor\b/.test(n) ||
      (/\bcuesta\b/.test(n) && /\bpromedio\b/.test(n)) ||
      /\bcosto\s+unitario\b/.test(n) ||
      /\bcosto\s+promedio\b/.test(n) ||
      /\bpromedio\s+(por|de|unitario)\b/.test(n) ||
      /\bcuanto\s+cuesta\s+cada\b/.test(n) ||
      /\bprecio\s+(promedio|unitario|por)\b/.test(n) ||
      /\ba\s+como\b/.test(n) ||
      /\bcada\s+llanta\b/.test(n) ||
      /\buna\s+llanta\b/.test(n) ||
      /\bunitario\b/.test(n) ||
      /\bunit\s+cost\b/.test(n) ||
      /\bcosto\s+medio\b/.test(n) ||
      /\bcosto\s+por\b/.test(n) ||
      /\bvale\b/.test(n) ||
      /\bsale\b/.test(n)
  );
}

function extractProcurementSpec(question) {
  const n = normalize(question);
  if (!isProcurementQuestion(question)) return { ok: false };
  let operation = "SUPPLIERS_BY_CONCEPT";
  if (/\bbeneficiarios?\b/.test(n) || /\bcobran\b/.test(n)) operation = "BENEFICIARIES_BY_CONCEPT";
  if (
    /\bcuesta\b/.test(n) ||
    /\bunitario\b/.test(n) ||
    /\bcada\b/.test(n) ||
    /\bprecio\b/.test(n) ||
    /\bpromedio\b/.test(n) ||
    /\bcosto\b/.test(n) ||
    /\bvale\b/.test(n) ||
    /\bsale\b/.test(n) ||
    /\bunit\s+cost\b/.test(n)
  ) {
    operation = "UNIT_COST_BY_CONCEPT";
  }
  return {
    ok: true,
    family: "PROCUREMENT",
    operation,
    invent_unit_cost: false,
    mixed_folio_attribution: false,
  };
}

function isCategorySumQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (/\bllantas?\b/.test(n) || /\baceite\b/.test(n)) return false;
  return Boolean(/\bgast/.test(n) && /\b(taller|gastos|inversiones?)\b/.test(n));
}

function extractCategorySumSpec(question) {
  const n = normalize(question);
  if (!isCategorySumQuestion(question)) return { ok: false };
  let category = null;
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    if (new RegExp(`\\b${key}\\b`).test(n)) {
      category = label;
      break;
    }
  }
  return {
    ok: true,
    family: "FOLIO_CATEGORY_SUM_NORMALIZATION",
    category,
    concept: null,
    operation: "SUM",
  };
}

module.exports = {
  normalize,
  extractPlant,
  extractChannel,
  isPlantToken,
  extractOrdinal,
  refineFrame,
  selectOrdinal,
  FUNCTIONAL_WORDS,
  isClientDiscountRankingQuestion,
  extractClientDiscountRankingSpec,
  isClientMovementQuestion,
  extractClientMovementSpec,
  isEntitySetFollowUp,
  isClientContactLookupQuestion,
  extractClientContactLookupSpec,
  extractClientNameHint,
  isSehListQuestion,
  isFolioFinancialByPlantQuestion,
  extractFolioFinancialByPlantSpec,
  isProfitabilityPeriodRankingQuestion,
  extractProfitabilityPeriodRankingSpec,
  isProfitabilityPeriodComparisonQuestion,
  isPlantDiscountOrMarginComparisonQuestion,
  extractPlantComparisonSpec,
  isProfitabilityActionPlanQuestion,
  isOpenDailySalesViewQuestion,
  extractOpenDailySalesViewSpec,
  isFolioResultNavigationQuestion,
  isFolioResultRefinementQuestion,
  isAutotanqueGroupQuestion,
  extractAutotanqueGroupSpec,
  isProcurementQuestion,
  extractProcurementSpec,
  isCategorySumQuestion,
  extractCategorySumSpec,
};
