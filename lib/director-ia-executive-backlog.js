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

const ORDINAL_WORDS = Object.freeze({
  primero: 1,
  primer: 1,
  segundo: 2,
  tercero: 3,
  tercer: 3,
  cuarto: 4,
  quinto: 5,
  sexto: 6,
  septimo: 7,
  octavo: 8,
  noveno: 9,
  decimo: 10,
});

function extractFolioIdToken(question) {
  const raw = String(question || "");
  const hit = raw.match(/F-\d{6}-\d+/i);
  return hit ? hit[0].toUpperCase() : null;
}

function isFolioNavigationVerb(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\babre\b/.test(n) ||
      /\bentra\b/.test(n) ||
      /\bregresa\b/.test(n) ||
      /\bmuestrame\b/.test(n) ||
      /\bensename\b/.test(n) ||
      /\bllevame\b/.test(n) ||
      /\bve\s+al\b/.test(n) ||
      /\bquiero\s+(ver|abrir)\b/.test(n) ||
      /\bver\b/.test(n)
  );
}

function extractOrdinal(question) {
  const folioId = extractFolioIdToken(question);
  if (folioId) return { kind: "folio_id", value: folioId, reference_type: "EXPLICIT_ID" };
  const n = normalize(question);
  if (!n) return null;
  if (/\bpenultimo\b/.test(n)) return { kind: "ordinal", index: -2, reference_type: "ORDINAL" };
  if (/\bultimo\b/.test(n) && !/\bmes\b/.test(n)) return { kind: "ordinal", index: -1, reference_type: "ORDINAL" };
  for (const [word, index] of Object.entries(ORDINAL_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(n)) return { kind: "ordinal", index, reference_type: "ORDINAL" };
  }
  if (/\b1o\b/.test(n)) return { kind: "ordinal", index: 1, reference_type: "ORDINAL" };
  const num =
    n.match(/\bnumero\s+(\d{1,2})\b/) ||
    n.match(/\bfolio\s+(?:numero\s+)?(\d{1,2})\b/) ||
    n.match(/\bel\s+(\d{1,2})\b/) ||
    n.match(/\bal\s+(\d{1,2})\b/);
  if (num) return { kind: "ordinal", index: Number(num[1]), reference_type: "INDEX" };
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
  const picked = selectFromDisplayedResultSet(items, selector);
  return picked && picked.ok ? picked.hit : null;
}

function selectFromDisplayedResultSet(items, selector) {
  const list = Array.isArray(items) ? items : [];
  if (!selector) return { ok: false, code: "NO_SELECTOR" };
  if (selector.kind === "folio_id") {
    const hit =
      list.find((row) => String(row.numero_folio || row.display || "").toUpperCase() === selector.value) || null;
    if (hit) return { ok: true, hit, reference_type: "EXPLICIT_ID" };
    return { ok: false, code: "ID_NOT_IN_SET", numero_folio: selector.value, reference_type: "EXPLICIT_ID" };
  }
  if (selector.kind !== "ordinal") return { ok: false, code: "NO_SELECTOR" };
  if (!list.length) return { ok: false, code: "NO_RESULT_SET", requested: selector.index };
  if (selector.index === -1) return { ok: true, hit: list[list.length - 1], reference_type: "ORDINAL" };
  if (selector.index === -2) {
    if (list.length < 2) return { ok: false, code: "OUT_OF_RANGE", size: list.length, requested: "penúltimo" };
    return { ok: true, hit: list[list.length - 2], reference_type: "ORDINAL" };
  }
  if (!Number.isFinite(selector.index) || selector.index < 1 || selector.index > list.length) {
    return {
      ok: false,
      code: "OUT_OF_RANGE",
      size: list.length,
      requested: selector.index,
      reference_type: selector.reference_type || "INDEX",
    };
  }
  return { ok: true, hit: list[selector.index - 1], reference_type: selector.reference_type || "INDEX" };
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

function isIndividualDiscountLookupQuestion(question) {
  const n = normalize(question);
  if (!n || !/\bdescuento/.test(n)) return false;
  if (/\b(quienes|cuales|top|ranking|ordena|lista|principales)\b/.test(n)) return false;
  if (/\bclientes\b/.test(n)) return false;
  if (/\b(primero|segundo|tercero|numero\s+uno)\b/.test(n)) return false;
  if (/\bquien\s+(tiene|recibe)\b/.test(n) && /\b(mayor|mas|mejor|alto)\b/.test(n)) return false;
  return Boolean(/\b(que|cual)\s+descuento\s+(tiene|tuvo|recibe)\b/.test(n));
}

function isClientDiscountRankingQuestion(question) {
  const n = normalize(question);
  if (!n) return false;
  if (/\b(folios?|extintor|accion|bitacora)\b/.test(n)) return false;
  if (isIndividualDiscountLookupQuestion(question)) return false;
  const discount = /\bdescuento/.test(n);
  const rank =
    /\btop\b/.test(n) ||
    /\bbottom\b/.test(n) ||
    /\branking\b/.test(n) ||
    /\bmayor(?:es)?\b/.test(n) ||
    /\bmenor(?:es)?\b/.test(n) ||
    /\bmas\s+altos?\b/.test(n) ||
    /\bmas\s+descuento\b/.test(n) ||
    /\bmejor\s+descuento\b/.test(n) ||
    /\bmejor\s+precio\s+(via|por)\s+descuento/.test(n) ||
    /\bprecio\s+(via|por)\s+descuento/.test(n) ||
    /\bmas\s+bajo\b/.test(n) ||
    /\bquien(?:es)?\s+(tiene|recibe)/.test(n) ||
    /\bcual(?:es)?\s+(son\s+los\s+)?clientes?/.test(n) ||
    /\btienen?\s+(mas|el|mayor|mejor)\s+descuento/.test(n) ||
    /\brecibe(?:n)?\s+(mas|mayor|mejor)\s+descuento/.test(n) ||
    /\bque\s+clientes?\s+(tienen|reciben)/.test(n) ||
    /\bclientes?\s+con\b/.test(n) ||
    /\bclientes?\s+que\s+recibe/.test(n) ||
    /\blider/.test(n) ||
    /\bprincipales?\b/.test(n) ||
    /\borden/.test(n) ||
    /\blista\b/.test(n) && /\b(clientes?|descuento|top|ranking)\b/.test(n) ||
    /\bpor\s+descuento\b/.test(n);
  return discount && rank;
}

function extractClientDiscountRankingSpec(question, prior) {
  const n = normalize(question);
  if (!isClientDiscountRankingQuestion(question) && !(prior && prior.ok)) {
    return { ok: false };
  }
  const singularTop1 =
    !/\bclientes\b/.test(n) &&
    !/\btop\b/.test(n) &&
    (/\bquien\s+(tiene|tuvo|recibe)\b/.test(n) || /\bque\s+cliente\s+(tiene|tuvo|recibe)\b/.test(n));
  return {
    ok: true,
    family: "CLIENT_DISCOUNT_RANKING",
    domain: "ARR",
    operation: "RANK",
    entity_type: "CLIENT",
    metric: "DISCOUNT",
    discount_metric: "DISCOUNT_PER_KG",
    direction:
      /\bmayor\s+a\s+menor\b/.test(n)
        ? "HIGH"
        : /\bmenor\s+a\s+mayor\b/.test(n) ||
            ((/\bmenor(?:es)?\b/.test(n) || /\bbottom\b/.test(n) || /\bmas\s+bajo\b/.test(n) || /\bmenos\s+descuento\b/.test(n)) &&
              !/\bmayor(?:es)?\b/.test(n))
          ? "LOW"
          : "HIGH",
    limit: singularTop1 ? 1 : extractRankN(n, prior && prior.limit ? prior.limit : 5),
    channel: extractChannel(n) || (prior && prior.channel) || "ALL",
    plant: extractPlant(question) || (prior && prior.plant) || null,
  };
}

function isClientMovementQuestion(question) {
  const n = normalize(question);
  if (!n || /\b(folios?|extintor)\b/.test(n)) return false;
  if (/\bpor\s+que\b/.test(n)) return false;
  if (/\bcomentarios?\b/.test(n)) return false;
  if (/\b(mezcla|mix|participacion|forecast|pronostic|proyectad)\b/.test(n) && /\b(casa|comisionista|canal|venta)\b/.test(n)) {
    return false;
  }
  if (
    /\bnuevos?\b/.test(n) &&
    (/\bvolvieron\b/.test(n) ||
      /\bregresaron\b/.test(n) ||
      /\bretencion\b/.test(n) ||
      /\brepitieron\b/.test(n) ||
      /\bse\s+retuvo\b/.test(n) ||
      /\bcohorte\b/.test(n))
  ) {
    return false;
  }
  if (/\bdescuento/.test(n) && !/\b(dejaron|dejo|disminuy|aumentaron|nuevos?)\b/.test(n)) return false;
  if (/\bmas\s+compran\b/.test(n) || /\bmayor\s+compra\b/.test(n) || /\bmayor\s+venta\b/.test(n)) return false;
  return Boolean(
    /\bdejaron\s+de\s+(comprar|consumir|pedir)\b/.test(n) ||
      /\bdejo\s+de\s+(comprar|consumir|pedir)\b/.test(n) ||
      /\bya\s+no\s+(compran|compra|consumen)\b/.test(n) ||
      /\bcayeron\s+a\s+cero\b/.test(n) ||
      /\bclientes?\s+perdidos?\b/.test(n) ||
      /\bvolumen\s+perdido\b/.test(n) ||
      /\bdisminuy/.test(n) ||
      (/\bbajaron\b/.test(n) && /\b(clientes?|compras?|volumen|toneladas)\b/.test(n) && !/\bdescuento/.test(n)) ||
      (/\baumentaron\b/.test(n) && !/\bdescuento/.test(n)) ||
      /\bclientes?\s+nuevos?\b/.test(n) ||
      /\bclientes?\s+son\s+nuevos?\b/.test(n) ||
      /\bnuevos?\s+clientes?\b/.test(n) ||
      /\blos\s+nuevos\b/.test(n) ||
      /\bson\s+los\s+nuevos\b/.test(n) ||
      /\bentraron\s+nuevos\b/.test(n) ||
      /\bnuevos?\s+que\s+entraron\b/.test(n) ||
      /\bempezaron\s+a\s+comprar\b/.test(n) ||
      /\binactiv/.test(n) ||
      /\bse\s+fueron\b/.test(n) ||
      /\bya\s+no\s+consumen\b/.test(n) ||
      /\bbajaron\s+ventas\b/.test(n) ||
      /\bsubieron\s+ventas\b/.test(n) ||
      /\bno\s+compraron\b/.test(n) ||
      /\bmovimiento\s+de\s+clientes\b/.test(n) ||
      /\bmovimiento\s+a\s+la\s+baja\b/.test(n) ||
      /\bmovimiento\s+al\s+alza\b/.test(n) ||
      (/\btotal\b/.test(n) && /\bnuevos?\b/.test(n)) ||
      (/\bcuantos\b/.test(n) && /\b(nuevos?|entraron|fueron|cuentas)\b/.test(n)) ||
      /\bdejamos\s+de\s+vender\b/.test(n) ||
      /\bperdida\s+total\b/.test(n)
  );
}

function extractClientMovementSpec(question, prior) {
  const n = normalize(question);
  if (!isClientMovementQuestion(question) && !(prior && prior.movement) && !(prior && prior.result_set_family)) {
    return { ok: false };
  }
  const runtime006 = require("./director-ia-direct-metrics-context-hardening-006");
  const pronoun = runtime006.isResultSetPronounReference(question);
  const priorMovement = (prior && prior.movement) || (prior && prior.result_set_family) || null;
  const explicitDecreased = /\bdisminuy/.test(n) || (/\bbajaron\b/.test(n) && !pronoun);
  let movement = priorMovement || "DISMINUYERON";
  if (pronoun && priorMovement && !explicitDecreased) {
    movement = priorMovement;
  } else if (
    /\bdejaron\s+de\b/.test(n) ||
    /\bdejo\s+de\b/.test(n) ||
    /\bdejamos\s+de\s+vender\b/.test(n) ||
    /\bya\s+no\s+(compr|consum)/.test(n) ||
    /\bcayeron\s+a\s+cero\b/.test(n) ||
    /\bclientes?\s+perdidos?\b/.test(n) ||
    /\bvolumen\s+perdido\b/.test(n) ||
    (/\bperdimos\b/.test(n) && (/\bclientes?\b/.test(n) || /\bdejaron\b/.test(n) || /\besos\b/.test(n) || /\bellos\b/.test(n)))
  ) {
    movement = "DEJARON_DE_COMPRAR";
  } else if (/\bmovimiento\s+de\s+clientes\b/.test(n) || /\bcomo\s+se\s+movieron\b/.test(n)) {
    movement = "SUMMARY";
  } else if (/\baumentaron\b/.test(n) || /\bsubieron\s+ventas\b/.test(n) || /\bmovimiento\s+al\s+alza\b/.test(n)) {
    movement = "AUMENTARON";
  } else if (/\bnuevos?\b/.test(n) || /\bempezaron\s+a\s+comprar\b/.test(n) || /\bentraron\b/.test(n)) {
    movement = "NUEVOS";
  } else if (/\binactiv/.test(n)) {
    movement = "INACTIVOS";
  } else if (explicitDecreased || /\bmovimiento\s+a\s+la\s+baja\b/.test(n)) {
    movement = "DISMINUYERON";
  }
  if (runtime006.neverConvertDejaronToDisminuyeron(question, priorMovement)) {
    movement = "DEJARON_DE_COMPRAR";
  }
  const digit = n.match(/\btop\s+(\d{1,2})\b/) || n.match(/\blos\s+(\d{1,2})\b/);
  const limit = digit ? Number(digit[1]) : (prior && prior.limit) || 10;
  return {
    ok: true,
    family: "CLIENT_MOVEMENT",
    domain: "ARR",
    operation: movement === "SUMMARY" ? "SUMMARIZE" : "RANK",
    entity_type: "CLIENT",
    movement,
    metric: /\bingreso\b/.test(n) ? "LOST_INCOME" : movement === "DEJARON_DE_COMPRAR" ? "LOST_VOLUME" : "VOLUME_DELTA",
    direction: movement === "AUMENTARON" ? "MOST_POSITIVE" : movement === "DISMINUYERON" ? "MOST_NEGATIVE" : "HIGH",
    limit: Number.isFinite(limit) && limit >= 1 && limit <= 20 ? limit : 10,
    channel: extractChannel(n) || (prior && prior.channel) || "ALL",
    plant: extractPlant(question) || (prior && prior.plant) || null,
    subcategory: (prior && prior.subcategory) || null,
    require_two_periods: true,
    inactive_supported: false,
    want_aggregate: Boolean(
      /\bcuanto\b/.test(n) ||
        /\bcuantas\b/.test(n) ||
        /\btotal\b/.test(n) ||
        /\btoneladas\b/.test(n) ||
        /\bsumaron\b/.test(n) ||
        /\ben\s+conjunto\b/.test(n) ||
        /\bperdimos\b/.test(n) ||
        /\bvolumen\b/.test(n) ||
        /\bdejamos\s+de\s+vender\b/.test(n) ||
        (prior && prior.want_aggregate)
    ),
    want_discount: /\bdescuento/.test(n) || Boolean(prior && prior.want_discount && !/\bcuantos\b/.test(n)),
    want_count: Boolean(
      ((/\btotal\b/.test(n) && /\bnuevos?\b/.test(n) && !/\b(compr|tonel|venta|kg|descuento)\b/.test(n)) ||
        (/\bcuantos\b/.test(n) &&
          /\b(nuevos?|entraron|fueron|cuentas)\b/.test(n) &&
          !/\b(tonel|compr|descuento|volvieron)\b/.test(n)) ||
        (prior && prior.want_count && !/\bdescuento/.test(n) && !/\btoneladas\b/.test(n)))
    ),
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
      /\besos\s+clientes\b/.test(n) ||
      /\bcon\s+ellos\b/.test(n) ||
      /\bpor\s+ellos\b/.test(n) ||
      /\blos\s+anteriores\b/.test(n) ||
      /\blos\s+que\s+mencionaste\b/.test(n) ||
      /\blos\s+de\s+arriba\b/.test(n) ||
      /\bese\s+grupo\b/.test(n) ||
      /\bese\s+conjunto\b/.test(n) ||
      /\bcuanto\s+perdimos\b/.test(n) ||
      /\bde\s+esos\b/.test(n) ||
      /\bel\s+mas\s+importante\b/.test(n) ||
      /\bcuales\s+eran\b/.test(n) ||
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

function isExplicitFolioIdQuestion(question) {
  const sel = extractOrdinal(question);
  return Boolean(sel && sel.kind === "folio_id" && isFolioNavigationVerb(question));
}

function isFolioIndexNavigationQuestion(question) {
  const sel = extractOrdinal(question);
  return Boolean(sel && sel.kind === "ordinal" && isFolioNavigationVerb(question));
}

function isFolioResultNavigationQuestion(question, priorResultSet) {
  if (isExplicitFolioIdQuestion(question)) return true;
  if (isFolioIndexNavigationQuestion(question)) return true;
  const sel = extractOrdinal(question);
  return Boolean(sel && priorResultSet);
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
  extractFolioIdToken,
  refineFrame,
  selectOrdinal,
  selectFromDisplayedResultSet,
  FUNCTIONAL_WORDS,
  isClientDiscountRankingQuestion,
  isIndividualDiscountLookupQuestion,
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
  isExplicitFolioIdQuestion,
  isFolioIndexNavigationQuestion,
  isFolioNavigationVerb,
  isFolioResultRefinementQuestion,
  isAutotanqueGroupQuestion,
  extractAutotanqueGroupSpec,
  isProcurementQuestion,
  extractProcurementSpec,
  isCategorySumQuestion,
  extractCategorySumSpec,
};
