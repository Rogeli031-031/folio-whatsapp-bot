"use strict";

/**
 * Delta Ingreso: router de comandos ZP/GG (determinístico).
 * - isExplicitAskGG: solo entonces se permite parseZPAskGGIntent.
 * - isDataQuery: consultas de datos => responder con BD, no escalar a GG.
 * - parseDeltaIngresoCommand: extrae comando + planta/cliente/pregunta.
 * - executeDeltaIngresoCommand: ejecuta y devuelve texto para WhatsApp.
 */

const PLANTS_PROVINCIA = ["Acapulco", "Morelos", "Puebla", "Querétaro", "San Luis", "Tehuacán"];
const PLANTS_ALIAS = {
  tehuacan: "Tehuacán",
  tehuacán: "Tehuacán",
  queretaro: "Querétaro",
  querétaro: "Querétaro",
  sanluis: "San Luis",
  "san luis": "San Luis",
  acapulco: "Acapulco",
  morelos: "Morelos",
  puebla: "Puebla",
};

/** Keywords que indican folios; si el texto las contiene, NO es modo natural Delta Ingreso. */
const FOLIO_KEYWORDS = [
  "folio", "crear folio", "aprobacion", "aprobación", "cotizacion", "cotización",
  "carrito", "categoria", "categoría", "taller", "solicitud folio", "folio numero",
];

/** Modo natural: true solo si el texto parece Delta Ingreso y NO folios. */
function deltaIngresoLikelyText(text) {
  const t = normalizeForMatch(String(text || ""));
  if (!t) return false;
  const diTerms = [
    "delta ingreso", "no compran", "menos ingreso", "+ingreso", "nuevos",
    "clientes mas afectados", "venta y descuento", "peores", "negativos provincia",
  ];
  const hasDi = diTerms.some((k) => t.includes(k));
  const hasFolio = FOLIO_KEYWORDS.some((k) => t.includes(normalizeForMatch(k)));
  return hasDi && !hasFolio;
}

/** Traduce frase natural a comando "di ..." (sin prefijo). Devuelve null si no hay traducción. */
function translateNaturalToDi(text) {
  const t = normalizeForMatch(String(text || ""));
  if (!t) return null;
  if (/peores|mas\s+afectados|negativos\s+provincia/.test(t)) return "di peores";
  if (/no\s+compran/.test(t)) return "di no compran";
  if (/menos\s+ingreso/.test(t)) return "di menos ingreso";
  if (/nuevos/.test(t)) return "di nuevos";
  if (/mas\s+ingreso|\+\s*ingreso/.test(t)) return "di mas ingreso";
  if (/venta\s+y\s+descuento|venta\s+descuento/.test(t)) return "di venta descuento";
  if (/pendientes/.test(t)) return "di pendientes";
  if (/periodos/.test(t)) return "di periodos";
  if (/ayuda|help/.test(t)) return "di ayuda";
  if (/resumen/.test(t)) return "di resumen";
  if (/causa/.test(t)) return "di causa";
  return null;
}

/** Palabras que activan modo conversacional (intención Delta Ingreso). */
const CONVERSATIONAL_TRIGGERS = [
  "planta peor", "peores", "negativos", "clientes afectados", "top clientes", "detalle",
  "venta", "descuento", "riesgo", "oportunidad", "oportunidades", "seguimiento", "acciones", "pendientes",
  "resumen", "hoy", "mas impacto", "mas afectados", "peor planta", "nuevos", "crecen", "aumentando", "consumo",
  "cada mes", "primeros",
];

/** Extrae nombre de planta desde texto normalizado (o null). */
function extractPlantFromConversation(t) {
  const normalized = normalizeForMatch(t);
  for (const [alias, name] of Object.entries(PLANTS_ALIAS)) {
    if (normalized.includes(alias)) return name;
  }
  for (const p of PLANTS_PROVINCIA) {
    if (normalized.includes(normalizeForMatch(p))) return p;
  }
  return null;
}

/**
 * Modo conversacional: traduce pregunta en lenguaje natural a comando "di ...".
 * Devuelve { translatedCommand: "di ..." } o null si no aplica.
 * No activa si el texto contiene palabras de folios (FOLIO_KEYWORDS).
 */
function deltaIngresoConversationalRouter(text) {
  const raw = String(text || "").trim();
  const t = normalizeForMatch(raw);
  if (!t) return null;

  if (FOLIO_KEYWORDS.some((k) => t.includes(normalizeForMatch(k)))) return null;

  const hasTrigger = CONVERSATIONAL_TRIGGERS.some((k) => t.includes(normalizeForMatch(k)));
  if (!hasTrigger) return null;

  const planta = extractPlantFromConversation(raw);
  const scope = planta || "provincia";

  if (/planta\s+peor|peores\s+plantas|planta\s+esta\s+peor|planta\s+tiene\s+mas\s+impacto|cuales\s+son\s+las\s+peores|que\s+planta\s+esta\s+peor/i.test(t) || (t.includes("peores") && !planta && !/detalle|venta|resumen|riesgo|oportunidad|seguimiento|hoy/.test(t))) {
    return { translatedCommand: "di peores" };
  }

  if (/clientes\s+mas\s+afectados|quienes\s+son\s+los\s+clientes\s+afectados|detalle\s+top|top\s+clientes\s+afectados/.test(t)) {
    if (planta) return { translatedCommand: "di detalle top " + planta };
    if (t.includes("provincia")) return { translatedCommand: "di peores" };
  }

  if (/venta\s+y\s+descuento|venta\s+descuento|descuento\s+de\s+los\s+mas\s+afectados/.test(t)) {
    const p = planta || "provincia";
    return { translatedCommand: "di venta descuento " + p + " top3" };
  }

  if (/riesgos?|que\s+riesgos/.test(t)) {
    return { translatedCommand: "di riesgo " + scope };
  }

  if (/oportunidades?|que\s+oportunidades/.test(t)) {
    return { translatedCommand: "di oportunidades " + scope };
  }

  if (/resumen\s+de|resumen\s+del?|resumen\s+provincia|^resumen\b|dame\s+un\s+resumen|un\s+resumen/.test(t)) {
    return { translatedCommand: "di resumen " + scope };
  }

  if (/que\s+esta\s+pasando\s+hoy|que\s+pasa\s+hoy|que\s+hay\s+hoy|estado\s+hoy/.test(t)) {
    return { translatedCommand: "di hoy provincia" };
  }

  if (/como\s+vamos\s+con\s+las\s+acciones|como\s+vamos\s+acciones|seguimiento\s+de\s+acciones|acciones\s+pendientes/.test(t) || (t.includes("seguimiento") && (t.includes("acciones") || !planta))) {
    return { translatedCommand: "di seguimiento " + (planta ? planta : "provincia") };
  }

  if (/pendientes|acciones\s+abiertas/.test(t) && !/seguimiento|hoy/.test(t)) {
    return { translatedCommand: "di pendientes " + (planta || "provincia") };
  }

  if (/clientes\s+nuevos|que\s+clientes\s+nuevos|nuevos\s+tenemos/.test(t)) {
    return { translatedCommand: "di nuevos " + (planta ? planta : "provincia") };
  }

  if (/aumentando\s+su\s+consumo|clientes\s+que\s+crecen|que\s+clientes\s+estan\s+aumentando|crecen/.test(t)) {
    return { translatedCommand: "di crecimiento " + (planta ? planta : "provincia") };
  }

  return null;
}

/** Preferencias de periodo por actor (in-memory, TTL 24h). */
const periodPreferenceStore = new Map();
const PREF_TTL_MS = 24 * 60 * 60 * 1000;

function getPeriodoPreference(key) {
  const entry = periodPreferenceStore.get(key);
  if (!entry || (entry.expiresAt && Date.now() > entry.expiresAt)) {
    if (entry) periodPreferenceStore.delete(key);
    return null;
  }
  return { periodoA: entry.periodoA, periodoB: entry.periodoB };
}

function setPeriodoPreference(key, periodoA, periodoB) {
  periodPreferenceStore.set(key, {
    periodoA: String(periodoA || "").trim(),
    periodoB: String(periodoB || "").trim(),
    expiresAt: Date.now() + PREF_TTL_MS,
  });
}

/** Extrae topN de resto de comando: "top 3", "top3", "3", "primeros 3". Default 5. */
function parseTopN(rest, defaultN) {
  const r = String(rest || "").trim();
  const m = r.match(/(?:^|\s)(?:top\s*)?(\d+)|primeros\s*(\d+)/i) || r.match(/(\d+)\s*$/);
  const n = m ? parseInt(m[1] || m[2], 10) : (defaultN === undefined ? 5 : defaultN);
  return Number.isFinite(n) && n >= 1 && n <= 20 ? n : (defaultN === undefined ? 5 : defaultN);
}

function normalizeForMatch(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palabras de SEGUIMIENTO: pueden ser comando de acciones o AskGG si además es explícito. */
const SEGUIMIENTO_WORDS = [
  "estatus", "plan", "5w2h", "causa", "evidencia", "confirmar", "cerrar", "cierre", "seguimiento", "pendiente", "avances",
];

/** Palabras de DATA: resolver con comandos/datos locales, NO escalar a GG. */
const DATA_WORDS = [
  "venta", "descuento", "ton", "kg", "top", "clientes", "mes", "periodos", "afectados", "nuevos", "crecen", "cayeron",
  "resumen", "riesgo", "oportunidades", "peores", "enero", "febrero", "cada mes", "primeros", "no compran", "menos ingreso", "mas ingreso",
  "crecimiento", "recuperables", "estables", "foco", "causas",
];

/** True SOLO si el texto es EXPLÍCITO "preguntar al GG/gerente". Regla dura: solo AskGG cuando esto es true. */
function isExplicitAskGG(text) {
  const t = normalizeForMatch(text);
  if (!t) return false;
  if (/^askgg\s+/.test(t) || /^ask\s+gg\s+/.test(t)) return true;
  const phrases = [
    "preguntale al gg", "preguntale al gerente", "pidele al gg", "pidele al gerente",
    "consultale al gg", "consúltale al gg",
  ];
  if (phrases.some((p) => t.includes(p))) return true;
  if (/^(estatus|plan|5w2h|cerrar|cierre)\s+/.test(t)) return true;
  return false;
}

/** True si parece consulta de DATOS (venta, descuento, top, clientes, etc.) => resolver con data local. */
function isDataQuery(text) {
  const t = normalizeForMatch(text);
  if (!t) return false;
  if (FOLIO_KEYWORDS.some((k) => t.includes(normalizeForMatch(k)))) return false;
  return DATA_WORDS.some((k) => t.includes(normalizeForMatch(k)));
}

function resolvePlanta(plantaRaw, plantsList) {
  const list = plantsList && plantsList.length ? plantsList : PLANTS_PROVINCIA;
  const key = normalizeForMatch(String(plantaRaw || ""));
  if (PLANTS_ALIAS[key]) return PLANTS_ALIAS[key];
  const byName = list.find((p) => normalizeForMatch(p) === key || normalizeForMatch(p).includes(key));
  if (byName) return typeof byName === "string" ? byName : byName.plant_code;
  return null;
}

/** Autodetección: "... en Morelos" / "... de Puebla" al final. */
function detectPlantaAtEnd(text) {
  const t = text.trim();
  const m = t.match(/\s+(?:en|de)\s+([A-Za-záéíóúÁÉÍÓÚñÑ\s]+)$/);
  if (m) return resolvePlanta(m[1].trim(), PLANTS_PROVINCIA);
  return null;
}

/**
 * Parsea comando. Return { type, planta?, cliente?, pregunta?, raw? } o null.
 * Tolerante a acentos y mayúsculas.
 */
function parseDeltaIngresoCommand(text, plantsList) {
  const raw = String(text || "").trim();
  const t = normalizeForMatch(raw);
  if (!t) return null;

  const plants = plantsList && plantsList.length ? plantsList.map((p) => (typeof p === "string" ? p : p.plant_code)) : PLANTS_PROVINCIA;

  if (/^ayuda$/.test(t) || t === "help") return { type: "ayuda", raw };

  if (/^plantas$/.test(t)) return { type: "plantas", raw };

  if (/^periodos$/.test(t)) return { type: "periodos", raw };

  if (/^negativos\s+provincia$/.test(t)) return { type: "negativos_provincia", raw };

  if (/^peores$/.test(t)) return { type: "peores", raw };

  if (/^pendientes$/.test(t)) return { type: "pendientes", raw };

  if (/^cerrados\s+hoy$/.test(t)) return { type: "cerrados_hoy", raw };

  let match;
  if ((match = t.match(/^5w2h\s+#?(\d+)$/i))) return { type: "5w2h_id", id: parseInt(match[1], 10), raw };
  if ((match = t.match(/^actualizar\s+#?(\d+)\s+(.+)$/i))) {
    const id = parseInt(match[1], 10);
    const pairs = match[2].trim().split(/\s+/).filter(Boolean);
    const updates = {};
    for (const p of pairs) {
      const eq = p.indexOf("=");
      if (eq > 0) {
        const k = p.slice(0, eq).toLowerCase();
        let v = p.slice(eq + 1).trim();
        if (/^["']/.test(v)) v = v.replace(/^["']|["']$/g, "");
        updates[k] = v;
      }
    }
    return Object.keys(updates).length ? { type: "actualizar_id", id, updates, raw } : null;
  }
  if ((match = t.match(/^cerrar\s+#?(\d+)(?:\s+(.+))?$/i))) return { type: "cerrar_id", id: parseInt(match[1], 10), motivo: match[2] ? match[2].trim().replace(/^["']|["']$/g, "") : null, raw };
  if ((match = t.match(/^set\s+periodos\s+(.+)$/i))) {
    const rest = match[1].trim();
    const a = rest.match(/A\s*=\s*(\d{4}-\d{2})/i);
    const b = rest.match(/B\s*=\s*(\d{4}-\d{2})/i);
    if (a && b) return { type: "set_periodos", periodoA: a[1], periodoB: b[1], raw };
    return null;
  }
  if ((match = t.match(/^periodos\s+(.+)$/))) {
    const planta = resolvePlanta(match[1].trim(), plants) || detectPlantaAtEnd(raw);
    return { type: "periodos", planta: planta || undefined, raw };
  }
  if ((match = t.match(/^resumen(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    if (!rest || normalizeForMatch(rest) === "provincia") return { type: "resumen", provincia: true, raw };
    const planta = resolvePlanta(rest, plants) || detectPlantaAtEnd(raw);
    return { type: "resumen", planta: planta || undefined, raw };
  }
  if ((match = t.match(/^riesgo(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    if (!rest || normalizeForMatch(rest) === "provincia") return { type: "riesgo", provincia: true, raw };
    const planta = resolvePlanta(rest, plants) || detectPlantaAtEnd(raw);
    return { type: "riesgo", planta: planta || undefined, raw };
  }
  if ((match = t.match(/^oportunidades(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    if (!rest || normalizeForMatch(rest) === "provincia") return { type: "oportunidades", provincia: true, raw };
    const planta = resolvePlanta(rest, plants) || detectPlantaAtEnd(raw);
    return { type: "oportunidades", planta: planta || undefined, raw };
  }
  if ((match = t.match(/^foco(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    const topN = parseTopN(rest, 10);
    const restSinTop = rest.replace(/\b(?:top\s*)?\d+\b|\bprimeros\s*\d+\b/gi, "").trim();
    if (!restSinTop || normalizeForMatch(restSinTop) === "provincia") return { type: "foco", provincia: true, topN, raw };
    const planta = resolvePlanta(restSinTop, plants) || detectPlantaAtEnd(raw);
    return { type: "foco", planta: planta || undefined, topN, raw };
  }
  if ((match = t.match(/^seguimiento(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    if (!rest || normalizeForMatch(rest) === "provincia") return { type: "seguimiento", provincia: true, raw };
    const planta = resolvePlanta(rest, plants) || detectPlantaAtEnd(raw);
    return { type: "seguimiento", planta: planta || undefined, raw };
  }
  if ((match = t.match(/^hoy(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    if (!rest || normalizeForMatch(rest) === "provincia") return { type: "hoy", provincia: true, raw };
    const planta = resolvePlanta(rest, plants) || detectPlantaAtEnd(raw);
    return { type: "hoy", planta: planta || undefined, raw };
  }
  if ((match = t.match(/^mix(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    const planta = rest ? (resolvePlanta(rest, plants) || detectPlantaAtEnd(raw)) : null;
    return planta ? { type: "mix", planta, raw } : null;
  }
  if ((match = t.match(/^causas(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    if (!rest || normalizeForMatch(rest) === "provincia") return { type: "causas", provincia: true, raw };
    const planta = resolvePlanta(rest, plants) || detectPlantaAtEnd(raw);
    return { type: "causas", planta: planta || undefined, raw };
  }
  if ((match = t.match(/^bloqueos(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    if (!rest || normalizeForMatch(rest) === "provincia") return { type: "bloqueos", provincia: true, raw };
    const planta = resolvePlanta(rest, plants) || detectPlantaAtEnd(raw);
    return { type: "bloqueos", planta: planta || undefined, raw };
  }
  if ((match = t.match(/^vencidas(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    if (!rest || normalizeForMatch(rest) === "provincia") return { type: "vencidas", provincia: true, raw };
    const planta = resolvePlanta(rest, plants) || detectPlantaAtEnd(raw);
    return { type: "vencidas", planta: planta || undefined, raw };
  }
  if ((match = t.match(/^semaforo(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    if (!rest || normalizeForMatch(rest) === "provincia") return { type: "semaforo", provincia: true, raw };
    const planta = resolvePlanta(rest, plants) || detectPlantaAtEnd(raw);
    return { type: "semaforo", planta: planta || undefined, raw };
  }
  if ((match = t.match(/^kpis(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    if (!rest || normalizeForMatch(rest) === "provincia") return { type: "kpis", provincia: true, raw };
    const planta = resolvePlanta(rest, plants) || detectPlantaAtEnd(raw);
    return { type: "kpis", planta: planta || undefined, raw };
  }
  if ((match = t.match(/^venta\s+descuento(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    const topN = parseTopN(rest, 3);
    const restSinTop = rest.replace(/\b(?:top\s*)?\d+\b|\bprimeros\s*\d+\b/gi, "").trim();
    const planta = restSinTop ? (resolvePlanta(restSinTop, plants) || detectPlantaAtEnd(raw)) : null;
    return { type: "venta_descuento", planta, topN, raw };
  }
  if ((match = t.match(/^crear\s+accion(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    const first = rest.split(/\s+/)[0];
    const planta = resolvePlanta(first, plants) || detectPlantaAtEnd(raw);
    const cliente = planta && rest.toLowerCase().startsWith(normalizeForMatch(first)) ? rest.slice(first.length).trim() : rest;
    if (planta && cliente) return { type: "crear_accion", planta, cliente, raw };
    return null;
  }
  if ((match = t.match(/^pendientes\s+(.+)$/))) {
    const planta = resolvePlanta(match[1].trim(), plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "pendientes", planta, raw } : { type: "pendientes", raw };
  }
  if ((match = t.match(/^causa(?:\s+(.+))?$/i))) {
    const rest = (match[1] || "").trim();
    const topN = parseTopN(rest, 10);
    const restSinTop = rest.replace(/\b(?:top\s*)?\d+\b|\bprimeros\s*\d+\b/gi, "").trim();
    const planta = restSinTop ? (resolvePlanta(restSinTop, plants) || detectPlantaAtEnd(raw)) : null;
    return { type: "causa", planta: planta || undefined, topN, raw };
  }

  if ((match = t.match(/^negativos\s+(.+)$/))) {
    const planta = resolvePlanta(match[1].trim(), plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "negativos_planta", planta, raw } : null;
  }
  if ((match = t.match(/^top5\s+(.+)$/))) {
    const planta = resolvePlanta(match[1].trim(), plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "top5", planta, raw } : null;
  }
  if ((match = t.match(/^top\s+(.+)$/))) {
    const planta = resolvePlanta(match[1].trim(), plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "top", planta, raw } : null;
  }
  if ((match = t.match(/^(?:detalle\s+top|venta\s+desc\s+top)\s+(.+)$/))) {
    const planta = resolvePlanta(match[1].trim(), plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "detalle_top", planta, raw } : null;
  }
  if ((match = t.match(/^no\s+compran\s+(.+)$/))) {
    const rest = match[1].trim();
    const topN = parseTopN(rest, 5);
    const restSinTop = rest.replace(/\b(?:top\s*)?\d+\b|\bprimeros\s*\d+\b/gi, "").trim();
    const planta = resolvePlanta(restSinTop, plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "no_compran", planta, topN, raw } : null;
  }
  if ((match = t.match(/^menos\s+ingreso\s+(.+)$/))) {
    const rest = match[1].trim();
    const topN = parseTopN(rest, 5);
    const restSinTop = rest.replace(/\b(?:top\s*)?\d+\b|\bprimeros\s*\d+\b/gi, "").trim();
    const planta = resolvePlanta(restSinTop, plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "menos_ingreso", planta, topN, raw } : null;
  }
  if (/^(crecimiento|crecen)$/.test(t)) return { type: "crecimiento", provincia: true, topN: 10, raw };
  if ((match = t.match(/^(?:crecimiento|crecen)\s+(.+)$/))) {
    const rest = match[1].trim();
    const topN = parseTopN(rest, 10);
    const restSinTop = rest.replace(/\b(?:top\s*)?\d+\b|\bprimeros\s*\d+\b/gi, "").trim();
    const planta = resolvePlanta(restSinTop, plants) || detectPlantaAtEnd(raw);
    if (planta) return { type: "crecimiento", planta, topN, raw };
    if (!restSinTop || normalizeForMatch(restSinTop) === "provincia") return { type: "crecimiento", provincia: true, topN, raw };
    return null;
  }
  if (/^nuevos$/.test(t)) return { type: "nuevos", provincia: true, topN: 10, raw };
  if ((match = t.match(/^nuevos\s+(.+)$/))) {
    const rest = match[1].trim();
    const topN = parseTopN(rest, 10);
    const restSinTop = rest.replace(/\b(?:top\s*)?\d+\b|\bprimeros\s*\d+\b/gi, "").trim();
    const planta = resolvePlanta(restSinTop, plants) || detectPlantaAtEnd(raw);
    if (planta) return { type: "nuevos", planta, topN, raw };
    if (!restSinTop || normalizeForMatch(restSinTop) === "provincia") return { type: "nuevos", provincia: true, topN, raw };
    return null;
  }
  if ((match = t.match(/^mas\s+ingreso\s+(.+)$/))) {
    const rest = match[1].trim();
    const topN = parseTopN(rest, 5);
    const restSinTop = rest.replace(/\b(?:top\s*)?\d+\b|\bprimeros\s*\d+\b/gi, "").trim();
    const planta = resolvePlanta(restSinTop, plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "mas_ingreso", planta, topN, raw } : null;
  }
  if ((match = t.match(/^cliente\s+(.+)$/))) {
    const rest = match[1].trim();
    const parts = rest.split(/\s+/).filter(Boolean);
    const first = parts[0];
    const planta = resolvePlanta(first, plants);
    if (planta && parts.length > 1) return { type: "cliente", planta, cliente: parts.slice(1).join(" "), raw };
    return { type: "cliente", planta: null, cliente: rest, raw };
  }
  if ((match = t.match(/^estatus\s+(.+)$/))) {
    const rest = match[1].trim();
    const planta = plants.find((p) => rest.toLowerCase().startsWith(normalizeForMatch(p)));
    const plNorm = planta ? normalizeForMatch(planta) : "";
    const cliente = planta && rest.toLowerCase().startsWith(plNorm) ? rest.slice(plNorm.length).trim() : rest;
    const pRes = planta || resolvePlanta(rest.split(/\s+/)[0], plants) || detectPlantaAtEnd(raw);
    if (pRes) return { type: "estatus", planta: pRes, cliente: cliente || rest, raw };
  }
  if ((match = t.match(/^plan\s+(.+)$/))) {
    const rest = match[1].trim();
    const planta = plants.find((p) => rest.toLowerCase().startsWith(normalizeForMatch(p)));
    const plNorm = planta ? normalizeForMatch(planta) : "";
    const cliente = planta && rest.toLowerCase().startsWith(plNorm) ? rest.slice(plNorm.length).trim() : rest;
    const pRes = planta || resolvePlanta(rest.split(/\s+/)[0], plants) || detectPlantaAtEnd(raw);
    if (pRes) return { type: "plan", planta: pRes, cliente: cliente || rest, raw };
  }
  if ((match = t.match(/^cerrar\s+(.+)$/))) {
    const rest = match[1].trim();
    const pRes = resolvePlanta(rest.split(/\s+/)[0], plants) || detectPlantaAtEnd(raw);
    const plNorm = pRes ? normalizeForMatch(pRes) : "";
    const cliente = pRes && rest.toLowerCase().startsWith(plNorm) ? rest.slice(plNorm.length).trim() : rest;
    if (pRes) return { type: "cerrar", planta: pRes, cliente: cliente || rest, raw };
  }

  return null;
}

function fmtMxn(n) {
  return n != null && !isNaN(n) ? n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "$0";
}
function fmtTon(kg) {
  if (kg == null || isNaN(kg)) return "0.0 ton";
  return (kg / 1000).toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " ton";
}

/** Parsea desc/kg desde string tipo "-2.86 $/kg" o "0.12 $/kg" → número $/kg. */
function parseDescKgStr(s) {
  if (!s || typeof s !== "string") return 0;
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*\$?\s*\/?\s*kg/i);
  return m ? parseFloat(m[1]) : 0;
}

/** Desc total en $: (kg/1000) * |$/kg| con signo negativo. */
function descMontoFromKgAndDescKg(kg, descKgStr) {
  const perKg = parseDescKgStr(descKgStr);
  const ton = (kg != null && !isNaN(kg) ? kg : 0) / 1000;
  const monto = ton * Math.abs(perKg);
  return perKg < 0 ? -monto : monto;
}

/** Periodo "2026-01" → "Ene 2026". */
function periodoToShortLabel(periodo) {
  if (!periodo || typeof periodo !== "string") return periodo || "";
  const [y, m] = periodo.split("-");
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const idx = parseInt(m, 10);
  if (!Number.isFinite(idx) || idx < 1 || idx > 12) return periodo;
  return `${meses[idx - 1]} ${y}`;
}

async function executeDeltaIngresoCommand(cmd, opts) {
  const { client, fromPhone, periodos, getDeltaIngresoDatosInternal, plantsWithId, aiDb } = opts;
  const pa = periodos?.periodoA || opts.periodoA;
  const pb = periodos?.periodoB || opts.periodoB;
  const plants = plantsWithId || [];

  if (cmd.type === "ayuda") {
    const lines = [
      "📋 Delta Ingreso – Comandos (di ayuda)",
      "di plantas | di periodos [planta] | di set periodos A=YYYY-MM B=YYYY-MM",
      "di peores | di negativos provincia | di negativos {planta}",
      "di resumen provincia | di resumen {planta}",
      "di riesgo provincia | di riesgo {planta}",
      "di oportunidades provincia | di oportunidades {planta}",
      "di foco provincia [topN] | di foco {planta} [topN]",
      "di seguimiento provincia | di seguimiento {planta}",
      "di hoy provincia | di hoy {planta}",
      "di no compran {planta} [topN] | di menos ingreso/nuevos/mas ingreso {planta} [topN]",
      "di detalle top {planta} | di venta descuento [planta] topN",
      "di mix {planta} | di causas/bloqueos/vencidas/semaforo/kpis [provincia|planta]",
      "di cliente [planta] {nombre} | di crear accion {planta} {cliente}",
      "di 5w2h #ID | di actualizar #ID campo=valor | di pendientes [planta] | di cerrar #ID",
      "Preguntar al GG: «pregúntale al GG» o «askgg {pregunta}»",
    ];
    return lines.join("\n");
  }

  if (cmd.type === "plantas") {
    const names = plants.length ? plants.map((p) => p.plant_code) : PLANTS_PROVINCIA;
    return `📋 Plantas Provincia:\n${names.join(", ")}`;
  }

  if (cmd.type === "periodos") {
    const scope = cmd.planta ? ` (planta ${cmd.planta})` : "";
    return `📅 Periodos${scope}: ${pa || "?"} vs ${pb || "?"}. Para cambiar: di set periodos A=YYYY-MM B=YYYY-MM`;
  }

  if (cmd.type === "set_periodos") {
    setPeriodoPreference(fromPhone || "default", cmd.periodoA, cmd.periodoB);
    return `Periodos guardados: A=${cmd.periodoA} B=${cmd.periodoB}. Los siguientes comandos usarán estos periodos.`;
  }

  const getData = async (planta) => {
    if (!getDeltaIngresoDatosInternal || !client) return null;
    return getDeltaIngresoDatosInternal(client, planta, pa, pb, false);
  };
  const getDataFull = async (planta) => {
    if (!getDeltaIngresoDatosInternal || !client) return null;
    return getDeltaIngresoDatosInternal(client, planta, pa, pb, true);
  };

  if (cmd.type === "resumen") {
    const scopeProvincia = !!cmd.provincia;
    const plantList = scopeProvincia ? plants : (cmd.planta ? [{ plant_code: cmd.planta }] : plants);
    let totalNoCompran = 0;
    let totalMenosIngreso = 0;
    const allAffected = [];
    const plantTotals = [];
    for (const row of plantList) {
      const planta = row.plant_code || row;
      const data = await getData(planta);
      if (!data) continue;
      const noC = data.dejaron?.totalDeltaIngreso != null ? data.dejaron.totalDeltaIngreso : 0;
      const menI = data.disminuyeron?.totalDeltaIngreso != null ? Math.abs(Math.min(0, data.disminuyeron.totalDeltaIngreso)) : 0;
      totalNoCompran += noC;
      totalMenosIngreso += menI;
      const combined = [
        ...(data.dejaron?.clientes || []).map((c) => ({ ...c, planta, impact: c.ingresoA != null ? c.ingresoA : 0 })),
        ...(data.disminuyeron?.clientes || []).map((c) => ({ ...c, planta, impact: c.deltaIngreso != null ? Math.abs(c.deltaIngreso) : 0 })),
      ];
      allAffected.push(...combined);
      if (scopeProvincia && (noC + menI > 0)) plantTotals.push({ planta, totalNeg: noC + menI });
    }
    const totalNeg = totalNoCompran + totalMenosIngreso;
    const labA = periodoToShortLabel(pa);
    const labB = periodoToShortLabel(pb);

    if (scopeProvincia) {
      const top3Plantas = plantTotals.sort((a, b) => b.totalNeg - a.totalNeg).slice(0, 3);
      const top5Clientes = allAffected.sort((a, b) => b.impact - a.impact).slice(0, 5);
      let counts = { open: 0, in_progress: 0, blocked: 0, closedHoy: 0 };
      if (aiDb && client) counts = await aiDb.getAccionesCountByStatus(client, pa, pb, null);
      const lines = [
        `📊 Resumen Provincia (${pa} vs ${pb})`,
        `Total negativos: ${fmtMxn(-totalNeg)} (No compran + −Ingreso)`,
        "Top 3 plantas:",
        ...top3Plantas.map((x, i) => `${i + 1}) ${x.planta}: ${fmtMxn(-x.totalNeg)}`),
        "Top 5 clientes afectados:",
        ...top5Clientes.map((c, i) => `${i + 1}) ${c.cliente} (${c.planta}): ${fmtMxn(-(c.impact || 0))}`),
        `Acciones: Abiertas ${counts.open} | En proceso ${counts.in_progress} | Bloqueadas ${counts.blocked} | Cerradas hoy ${counts.closedHoy}`,
      ];
      return lines.join("\n");
    }

    if (cmd.planta) {
      const data = await getData(cmd.planta);
      if (!data) return `Sin datos para ${cmd.planta}.`;
      const noC = data.dejaron?.totalDeltaIngreso != null ? data.dejaron.totalDeltaIngreso : 0;
      const menI = data.disminuyeron?.totalDeltaIngreso != null ? Math.abs(Math.min(0, data.disminuyeron.totalDeltaIngreso)) : 0;
      const nuevos = (data.clientesNuevos?.clientes || []).reduce((s, c) => s + (c.ingresoB != null ? c.ingresoB : 0), 0);
      const masVal = (data.mas?.clientes || []).reduce((s, c) => s + (c.deltaIngreso != null ? c.deltaIngreso : 0), 0);
      const totalNegPlanta = noC + menI;
      const top3 = [
        ...(data.dejaron?.clientes || []).map((c) => ({ ...c, tipo: "No compran" })),
        ...(data.disminuyeron?.clientes || []).map((c) => ({ ...c, tipo: "−Ingreso" })),
      ].sort((a, b) => (a.deltaIngreso != null ? a.deltaIngreso : -a.ingresoA) - (b.deltaIngreso != null ? b.deltaIngreso : -b.ingresoA)).slice(0, 3);
      const lines = [
        `📊 Resumen ${cmd.planta} (${pa} vs ${pb})`,
        `No compran: ${fmtMxn(-noC)} | −Ingreso: ${fmtMxn(-menI)} | Nuevos: ${fmtMxn(nuevos)} | +Ingreso: ${fmtMxn(masVal)}`,
        `Total negativos: ${fmtMxn(-totalNegPlanta)}`,
        "Top 3 afectados:",
        ...top3.map((c, i) => `${i + 1}) ${c.cliente}: ${c.kgAStr || "0"}→${c.kgBStr || "0"} ton, desc ${c.descKgAStr || "-"}→${c.descKgBStr || "-"}, Δ ${c.deltaIngresoStr || c.ingresoAStr || "-"}`),
      ];
      if (aiDb && client) {
        const pend = await aiDb.getPendientesByPlant(client, pa, pb, cmd.planta);
        const counts = await aiDb.getAccionesCountByStatus(client, pa, pb, cmd.planta);
        lines.push(`Acciones: Abiertas ${counts.open} | Bloqueadas ${counts.blocked}`);
        const top1 = pend.slice(0, 1);
        if (top1.length) lines.push(`Top impacto: ${top1[0].cliente_norm} ${fmtMxn(top1[0].how_much_impact_mxn)}`);
      }
      return lines.join("\n");
    }

    const scope = "Provincia";
    const top3 = allAffected.sort((a, b) => b.impact - a.impact).slice(0, 3);
    const lines = [
      `📊 Resumen ${scope} (${pa} vs ${pb})`,
      `No compran: ${fmtMxn(-totalNoCompran)} | −Ingreso: ${fmtMxn(-totalMenosIngreso)}`,
      `Total negativos: ${fmtMxn(-totalNeg)}`,
      "Top 3 afectación:",
      ...top3.map((c, i) => `${i + 1}) ${c.cliente} (${c.planta}): ${fmtMxn(-(c.impact || 0))}`),
    ];
    return lines.join("\n");
  }

  if (cmd.type === "riesgo") {
    const plantList = cmd.provincia ? plants : [{ plant_code: cmd.planta }];
    const riesgos = [];
    for (const row of plantList) {
      const planta = row.plant_code || row;
      const data = await getData(planta);
      if (!data) continue;
      for (const c of data.dejaron?.clientes || []) {
        const tonA = (c.kgA || 0) / 1000;
        if (tonA >= 10) riesgos.push({ planta, cliente: c.cliente, tipo: "NO_COMPRA", impact: c.ingresoA || 0, tonA, tonB: 0 });
      }
      for (const c of data.disminuyeron?.clientes || []) {
        const tonA = (c.kgA || 0) / 1000;
        const tonB = (c.kgB || 0) / 1000;
        const caidaPct = tonA > 0 ? (tonA - tonB) / tonA : 0;
        const d = c.deltaIngreso != null ? c.deltaIngreso : 0;
        if (caidaPct >= 0.5 && d <= -50000) riesgos.push({ planta, cliente: c.cliente, tipo: "CAIDA_VOL", impact: Math.abs(d), tonA, tonB });
      }
    }
    if (aiDb && client) {
      const plantFilter = cmd.provincia ? null : cmd.planta;
      const bloqueos = await aiDb.getBloqueos(client, pa, pb, plantFilter);
      for (const a of (bloqueos || []).slice(0, 15)) {
        riesgos.push({ planta: a.plant_code, cliente: a.cliente_norm, tipo: "BLOQUEO", impact: Math.abs(a.how_much_impact_mxn || 0), tonA: null, tonB: null });
      }
    }
    riesgos.sort((a, b) => b.impact - a.impact);
    const top10 = riesgos.slice(0, 10);
    const scope = cmd.provincia ? "Provincia" : cmd.planta;
    const lines = [`📊 Riesgo – ${scope} (${pa} vs ${pb})`, ...top10.map((r, i) => `${i + 1}) ${r.planta}|${r.cliente}|${r.tipo}|${fmtMxn(-r.impact)}|${r.tonA != null ? r.tonA.toFixed(1) : "-"}→${r.tonB != null ? r.tonB.toFixed(1) : "-"} ton`)];
    return lines.length > 1 ? lines.join("\n") : `Sin riesgos en ${scope}.`;
  }

  if (cmd.type === "oportunidades") {
    const plantList = cmd.provincia ? plants : [{ plant_code: cmd.planta }];
    const opps = [];
    for (const row of plantList) {
      const planta = row.plant_code || row;
      const data = await getData(planta);
      if (!data) continue;
      for (const c of data.mas?.clientes || []) {
        const d = c.deltaIngreso != null ? c.deltaIngreso : 0;
        if (d >= 30000) opps.push({ planta, cliente: c.cliente, deltaIngreso: d, tonB: (c.kgB || 0) / 1000 });
      }
      for (const c of data.clientesNuevos?.clientes || []) {
        const tonB = (c.kgB || 0) / 1000;
        if (tonB >= 5) opps.push({ planta, cliente: c.cliente, deltaIngreso: c.ingresoB || 0, tonB });
      }
    }
    opps.sort((a, b) => (b.deltaIngreso || 0) - (a.deltaIngreso || 0));
    const top10 = opps.slice(0, 10);
    const scope = cmd.provincia ? "Provincia" : cmd.planta;
    const lines = [`📊 Oportunidades – ${scope} (${pa} vs ${pb})`, ...top10.map((o, i) => `${i + 1}) ${o.planta}|${o.cliente}|${fmtMxn(o.deltaIngreso)}|${o.tonB.toFixed(1)} ton`)];
    return lines.length > 1 ? lines.join("\n") : `Sin oportunidades en ${scope}.`;
  }

  if (cmd.type === "foco") {
    const plantList = cmd.provincia ? plants : [{ plant_code: cmd.planta }];
    const negativos = [];
    let totalNeg = 0;
    for (const row of plantList) {
      const planta = row.plant_code || row;
      const data = await getData(planta);
      if (!data) continue;
      const combined = [
        ...(data.dejaron?.clientes || []).map((c) => ({ ...c, planta, impact: c.ingresoA != null ? c.ingresoA : 0 })),
        ...(data.disminuyeron?.clientes || []).map((c) => ({ ...c, planta, impact: c.deltaIngreso != null ? Math.abs(c.deltaIngreso) : 0 })),
      ];
      for (const c of combined) {
        negativos.push(c);
        totalNeg += c.impact || 0;
      }
    }
    negativos.sort((a, b) => (b.impact || 0) - (a.impact || 0));
    const topN = Math.min(cmd.topN || 10, 20);
    let acum = 0;
    const umbral80 = totalNeg * 0.8;
    const focoList = [];
    for (const c of negativos) {
      if (focoList.length >= topN) break;
      focoList.push(c);
      acum += c.impact || 0;
      if (acum >= umbral80) break;
    }
    const scope = cmd.provincia ? "Provincia" : cmd.planta;
    const lines = [`FOCO ${scope} (${pa} vs ${pb})`, `Total negativos: ${fmtMxn(-totalNeg)}`, "Clientes que explican ~80%:", ...focoList.map((c, i) => `${i + 1}) ${c.cliente} (${c.planta}): ${fmtMxn(-(c.impact || 0))}`)];
    return lines.length > 1 ? lines.join("\n") : `Sin negativos en ${scope}.`;
  }

  if (cmd.type === "seguimiento") {
    if (!aiDb || !client) return "No disponible.";
    const plantCode = cmd.provincia ? null : cmd.planta;
    const counts = await aiDb.getAccionesCountByStatus(client, pa, pb, plantCode);
    const responsables = await aiDb.getResponsablesAbiertas(client, pa, pb, plantCode);
    const viejas = await aiDb.getMasViejasSinUpdate(client, pa, pb, plantCode, 5);
    const scope = cmd.provincia ? "Provincia" : cmd.planta;
    const hoy = new Date().toISOString().slice(0, 10);
    const diasSinUpdate = (last) => {
      if (!last) return null;
      const d = new Date(last);
      const h = new Date();
      return Math.floor((h - d) / (24 * 60 * 60 * 1000));
    };
    const lines = [
      `SEGUIMIENTO ${scope} (${pa} vs ${pb})`,
      `Abiertas: ${counts.open} | En proceso: ${counts.in_progress} | Bloqueadas: ${counts.blocked} | Cerradas hoy: ${counts.closedHoy}`,
      "Responsables:",
      ...(responsables.slice(0, 8).map((r) => `- ${r.who}: ${r.cnt}`)),
      "Más urgentes:",
      ...(viejas.map((a, i) => `${i + 1}) ${a.cliente_norm} (${a.plant_code})${a.last_update_at ? " sin update " + diasSinUpdate(a.last_update_at) + " días" : " sin update"} status ${a.action_status}`)),
    ];
    return lines.join("\n");
  }

  if (cmd.type === "hoy") {
    if (!aiDb || !client) return "No disponible.";
    const plantCode = cmd.provincia ? null : cmd.planta;
    const cerrados = await aiDb.getCerradosHoy(client, pa, pb);
    const actualizadas = await aiDb.getActualizadasHoy(client, pa, pb, plantCode);
    const bloqueosHoy = await aiDb.getBloqueosHoy(client, pa, pb, plantCode);
    const vencidas = await aiDb.getVencidas(client, pa, pb, plantCode);
    const filtroCerrados = plantCode ? cerrados.filter((a) => String(a.plant_code).toLowerCase() === String(plantCode).toLowerCase()) : cerrados;
    const scope = cmd.provincia ? "Provincia" : cmd.planta;
    const lines = [
      `HOY ${scope} (${pa} vs ${pb})`,
      `Cerradas: ${filtroCerrados.length}`,
      filtroCerrados.length ? "Top: " + filtroCerrados.slice(0, 5).map((a) => `${a.cliente_norm} (${a.plant_code})`).join(", ") : "",
      `Actualizadas: ${actualizadas.length}`,
      actualizadas.length ? "Top: " + actualizadas.slice(0, 5).map((a) => `${a.cliente_norm} (${a.plant_code})`).join(", ") : "",
      `Nuevos bloqueos: ${bloqueosHoy.length}`,
      `Vencidas: ${vencidas.length}`,
      vencidas.length ? "Top: " + vencidas.slice(0, 5).map((a) => `${a.cliente_norm} (${a.plant_code}) vence ${a.when_date}`).join(", ") : "",
    ];
    return lines.filter(Boolean).join("\n");
  }

  if (cmd.type === "mix") {
    const data = await getData(cmd.planta);
    if (!data) return `Sin datos para ${cmd.planta}.`;
    const noC = data.dejaron?.totalDeltaIngreso != null ? data.dejaron.totalDeltaIngreso : 0;
    const menI = data.disminuyeron?.totalDeltaIngreso != null ? Math.abs(Math.min(0, data.disminuyeron.totalDeltaIngreso)) : 0;
    const total = noC + menI;
    const pctNoC = total > 0 ? Math.round((noC / total) * 100) : 0;
    const pctMenI = total > 0 ? Math.round((menI / total) * 100) : 0;
    return `📊 Mix ${cmd.planta}: No compran ${pctNoC}% (${fmtMxn(-noC)}) | −Ingreso ${pctMenI}% (${fmtMxn(-menI)}). Total negativos: ${fmtMxn(-total)}`;
  }

  if (cmd.type === "causas") {
    if (!aiDb || !client) return "No disponible.";
    const plantCode = cmd.provincia ? null : cmd.planta;
    const list = await aiDb.getCausaByPlant(client, pa, pb, plantCode, true);
    const openOnly = list;
    const scope = cmd.provincia ? "Provincia" : cmd.planta;
    const lines = [`📊 Causas (why_tag) – ${scope}`, ...(openOnly.slice(0, 10).map((r) => `• ${r.tag}: ${r.cnt} acciones, impacto ${fmtMxn(r.sum_mxn)}`))];
    return lines.length > 1 ? lines.join("\n") : `Sin causas en ${scope}.`;
  }

  if (cmd.type === "bloqueos") {
    if (!aiDb || !client) return "No disponible.";
    const plantCode = cmd.provincia ? null : cmd.planta;
    const list = await aiDb.getBloqueos(client, pa, pb, plantCode);
    const scope = cmd.provincia ? "Provincia" : cmd.planta;
    const lines = [`📊 Bloqueos – ${scope}`, ...(list.slice(0, 10).map((a) => `• ${a.cliente_norm} (${a.plant_code}): ${(a.last_update_text || "").slice(0, 40)}... ${fmtMxn(a.how_much_impact_mxn)}`))];
    return lines.length > 1 ? lines.join("\n") : `Sin bloqueos en ${scope}.`;
  }

  if (cmd.type === "vencidas") {
    if (!aiDb || !client) return "No disponible.";
    const plantCode = cmd.provincia ? null : cmd.planta;
    const list = await aiDb.getVencidas(client, pa, pb, plantCode);
    const scope = cmd.provincia ? "Provincia" : cmd.planta;
    const lines = [`📊 Vencidas (when_date < hoy) – ${scope}`, ...(list.slice(0, 15).map((a) => `• #${a.id} ${a.cliente_norm} (${a.plant_code}) vence ${a.when_date} ${a.action_status}`))];
    return lines.length > 1 ? lines.join("\n") : `Sin vencidas en ${scope}.`;
  }

  if (cmd.type === "semaforo") {
    if (!aiDb || !client) return "No disponible.";
    const plantCode = cmd.provincia ? null : cmd.planta;
    const pend = await aiDb.getPendientesByPlant(client, pa, pb, plantCode);
    const cerradosHoy = await aiDb.getCerradosHoy(client, pa, pb);
    const filtroCerrados = plantCode ? cerradosHoy.filter((a) => String(a.plant_code).toLowerCase() === String(plantCode).toLowerCase()) : cerradosHoy;
    const vencidas = await aiDb.getVencidas(client, pa, pb, plantCode);
    const vencidasIds = new Set(vencidas.map((v) => v.id));
    const hoy = new Date();
    const rojo = pend.filter((a) => a.action_status === "BLOCKED" || vencidasIds.has(a.id));
    const sinUpdate7Dias = (last) => !last || (hoy - new Date(last)) / (24 * 60 * 60 * 1000) > 7;
    const amarillo = pend.filter((a) => a.action_status === "IN_PROGRESS" && sinUpdate7Dias(a.last_update_at));
    const conUpdateReciente = (a) => a.last_update_at && (hoy - new Date(a.last_update_at)) / (24 * 60 * 60 * 1000) < 3;
    const verdeCount = filtroCerrados.length + pend.filter(conUpdateReciente).length;
    const scope = cmd.provincia ? "Provincia" : cmd.planta;
    const lines = [`📊 Semáforo – ${scope}`, `ROJO: ${rojo.length} (BLOCKED o vencida)`, `AMARILLO: ${amarillo.length} (IN_PROGRESS sin update >7 días)`, `VERDE: ${verdeCount} (cerradas hoy o update <3 días)`, "Top 5 rojos:", ...rojo.slice(0, 5).map((a) => `• ${a.cliente_norm} (${a.plant_code}) ${a.action_status}`)];
    return lines.join("\n");
  }

  if (cmd.type === "kpis") {
    if (!aiDb || !client) return "No disponible.";
    const plantCode = cmd.provincia ? null : cmd.planta;
    const pend = await aiDb.getPendientesByPlant(client, pa, pb, plantCode);
    const counts = await aiDb.getAccionesCountByStatus(client, pa, pb, plantCode);
    const conWho = pend.filter((a) => a.who && String(a.who).trim()).length;
    const conWhen = pend.filter((a) => a.when_date).length;
    const conWhy = pend.filter((a) => a.why_tag).length;
    const conImpact = pend.filter((a) => a.how_much_impact_mxn != null).length;
    const total = pend.length;
    const pct = (n) => total ? Math.round((n / total) * 100) : 0;
    const scope = cmd.provincia ? "Provincia" : cmd.planta;
    const lines = [`📊 KPIs acciones – ${scope}`, `% con who: ${pct(conWho)}%`, `% con when_date: ${pct(conWhen)}%`, `% con why_tag: ${pct(conWhy)}%`, `% con how_much_impact_mxn: ${pct(conImpact)}%`, `Cerradas hoy: ${counts.closedHoy} | Bloqueadas: ${counts.blocked}`];
    return lines.join("\n");
  }

  if (cmd.type === "negativos_provincia") {
    const parts = [];
    for (const row of plants) {
      const planta = row.plant_code || row;
      const data = await getData(planta);
      if (data && (data.dejaron?.clientes?.length || data.disminuyeron?.clientes?.length)) {
        const d = data.dejaron?.totalDeltaIngresoStr || "$0";
        const i = data.disminuyeron?.totalDeltaIngresoStr || "$0";
        parts.push(`${planta}: No compran ${d} · −Ingreso ${i}`);
      }
    }
    return `📊 Negativos Provincia (${pa} vs ${pb})\n${parts.length ? parts.join("\n") : "Sin datos."}`;
  }

  if (cmd.type === "peores") {
    const list = [];
    for (const row of plants) {
      const planta = row.plant_code || row;
      const data = await getData(planta);
      if (!data) continue;
      const dejaronVal = data.dejaron?.totalDeltaIngreso != null ? data.dejaron.totalDeltaIngreso : 0;
      const disminVal = data.disminuyeron?.totalDeltaIngreso != null ? data.disminuyeron.totalDeltaIngreso : 0;
      const totalNeg = dejaronVal + Math.abs(Math.min(0, disminVal));
      if (totalNeg > 0) list.push({ planta, totalNeg });
    }
    list.sort((a, b) => b.totalNeg - a.totalNeg);
    const totalProvincia = list.reduce((s, x) => s + x.totalNeg, 0);
    const lines = ["📊 Plantas con mayor impacto (ΔIngreso)", ...list.slice(0, 6).map((x, i) => `${i + 1} ${x.planta}: ${fmtMxn(x.totalNeg)}`), `Total Provincia: ${fmtMxn(-totalProvincia)}`];
    return lines.join("\n");
  }

  const onePlantResponse = async (data, tipo, titulo) => {
    if (!data || !data[tipo]?.clientes?.length) return `Planta ${cmd.planta}: sin datos para ${titulo}.`;
    const list = data[tipo].clientes.slice(0, tipo === "top5" || cmd.type === "top5" ? 5 : 3);
    const lines = [`📊 ${titulo} – ${cmd.planta} (${pa} vs ${pb})`];
    list.forEach((c, i) => {
      lines.push(`${i + 1}) ${c.cliente}: ${c.deltaIngresoStr || c.ingresoAStr || "-"}`);
    });
    return lines.join("\n");
  };

  if (cmd.type === "negativos_planta") {
    const data = await getData(cmd.planta);
    if (!data) return `Sin datos para ${cmd.planta}.`;
    const noC = (data.dejaron?.clientes || []).slice(0, 3);
    const menI = (data.disminuyeron?.clientes || []).slice(0, 3);
    const lines = [`📊 Negativos ${cmd.planta} (${pa} vs ${pb})`, "No compran:", ...noC.map((c) => `  • ${c.cliente}: ${c.ingresoAStr}`), "−Ingreso:", ...menI.map((c) => `  • ${c.cliente}: ${c.deltaIngresoStr}`)];
    return lines.join("\n");
  }

  if (cmd.type === "top" || cmd.type === "top5") {
    const data = await getData(cmd.planta);
    const N = cmd.type === "top5" ? 5 : 3;
    const combined = [
      ...(data?.dejaron?.clientes || []).map((c) => ({ ...c, tipo: "No compran" })),
      ...(data?.disminuyeron?.clientes || []).map((c) => ({ ...c, tipo: "−Ingreso" })),
    ];
    const sorted = combined
    .sort((a, b) => {
      const da = a.deltaIngreso != null ? a.deltaIngreso : (a.ingresoA != null ? -a.ingresoA : 0);
      const db = b.deltaIngreso != null ? b.deltaIngreso : (b.ingresoA != null ? -b.ingresoA : 0);
      return da - db;
    })
    .slice(0, N);
    if (!sorted.length) return `Planta ${cmd.planta}: sin negativos.`;
    const lines = [`📊 Top ${N} afectados – ${cmd.planta} (${pa} vs ${pb})`];
    sorted.forEach((c, i) => lines.push(`${i + 1}) ${c.cliente}: ${c.deltaIngresoStr || c.ingresoAStr}`));
    return lines.join("\n");
  }

  if (cmd.type === "detalle_top") {
    const data = await getData(cmd.planta);
    if (!data) return `Sin datos para ${cmd.planta}.`;
    const combined = [
      ...(data.dejaron?.clientes || []).map((c) => ({ ...c, tipo: "No compran" })),
      ...(data.disminuyeron?.clientes || []).map((c) => ({ ...c, tipo: "−Ingreso" })),
    ];
    const top3 = combined.sort((a, b) => (a.deltaIngreso != null && b.deltaIngreso != null ? a.deltaIngreso - b.deltaIngreso : 0)).slice(0, 3);
    if (!top3.length) return `Planta ${cmd.planta}: sin negativos.`;
    const labA = periodoToShortLabel(pa);
    const labB = periodoToShortLabel(pb);
    const lines = [`Planta: ${cmd.planta.toUpperCase()}`, `Periodo: ${labA} vs ${labB}`, "Top 3 clientes más afectados (ΔIngreso):"];
    top3.forEach((c, i) => {
      const descA = descMontoFromKgAndDescKg(c.kgA, c.descKgAStr);
      const descB = descMontoFromKgAndDescKg(c.kgB, c.descKgBStr);
      lines.push(`${i + 1}) ${c.cliente}:`);
      lines.push(`   ${labA}: ${c.kgAStr || "0"} ton | Desc: ${fmtMxn(descA)}`);
      lines.push(`   ${labB}: ${c.kgBStr || "0"} ton | Desc: ${fmtMxn(descB)}`);
      lines.push(`   ΔIngreso: ${c.deltaIngresoStr || "-"}`);
    });
    return lines.join("\n");
  }

  if (cmd.type === "venta_descuento") {
    const planta = cmd.planta || (plants[0] && (plants[0].plant_code || plants[0]));
    if (!planta) return "Indica planta. Ej: di venta descuento queretaro top3.";
    const data = await getData(planta);
    if (!data) return `Sin datos para ${planta}.`;
    const combined = [
      ...(data.dejaron?.clientes || []).map((c) => ({ ...c, tipo: "No compran" })),
      ...(data.disminuyeron?.clientes || []).map((c) => ({ ...c, tipo: "−Ingreso" })),
    ];
    const topN = Math.min(cmd.topN || 3, 10);
    const list = combined.sort((a, b) => (a.deltaIngreso != null && b.deltaIngreso != null ? a.deltaIngreso - b.deltaIngreso : 0)).slice(0, topN);
    if (!list.length) return `Planta ${planta}: sin negativos.`;
    const labA = periodoToShortLabel(pa);
    const labB = periodoToShortLabel(pb);
    const lines = [`📊 Venta y descuento – ${planta} (top ${topN})`];
    list.forEach((c, i) => {
      lines.push(`${i + 1}) ${c.cliente}: ${labA} ${c.kgAStr || "0"} ton ${c.descKgAStr || "-"} $/kg | ${labB} ${c.kgBStr || "0"} ton ${c.descKgBStr || "-"} $/kg | Δ ${c.deltaIngresoStr || "-"}`);
    });
    return lines.join("\n");
  }

  const N = cmd.topN != null ? Math.min(Number(cmd.topN) || 5, 20) : 5;

  if (cmd.type === "no_compran") {
    const data = await getData(cmd.planta);
    const list = (data?.dejaron?.clientes || []).slice(0, N);
    if (!list.length) return `Planta ${cmd.planta}: ningún cliente "no compran".`;
    const labA = periodoToShortLabel(pa);
    const lines = [`📊 No compran – ${cmd.planta} (${pa} vs ${pb})`, ...list.map((c, i) => `${i + 1}) ${c.cliente}: ${c.kgAStr || "0"} ton, ${c.descKgAStr || "-"} $/kg, ${c.ingresoAStr || "-"}`)];
    return lines.join("\n");
  }

  if (cmd.type === "menos_ingreso") {
    const data = await getData(cmd.planta);
    const list = (data?.disminuyeron?.clientes || []).slice(0, N);
    if (!list.length) return `Planta ${cmd.planta}: sin clientes −Ingreso.`;
    const lines = [`📊 −Ingreso – ${cmd.planta} (${pa} vs ${pb})`, ...list.map((c, i) => `${i + 1}) ${c.cliente}: tonA ${c.kgAStr || "0"} tonB ${c.kgBStr || "0"}, desc ${c.descKgAStr || "-"}/${c.descKgBStr || "-"}, Δ ${c.deltaIngresoStr}`)];
    return lines.join("\n");
  }

  if (cmd.type === "crecimiento") {
    const Nc = cmd.topN != null ? Math.min(Number(cmd.topN), 20) : 10;
    const labA = periodoToShortLabel(pa);
    const labB = periodoToShortLabel(pb);
    if (cmd.provincia || !cmd.planta) {
      const all = [];
      for (const row of plants) {
        const pl = row.plant_code || row;
        const data = await getDataFull(pl);
        (data?.crecen?.clientes || []).forEach((c) => all.push({ ...c, planta: pl }));
      }
      all.sort((a, b) => ((b.kgB || 0) - (b.kgA || 0)) - ((a.kgB || 0) - (a.kgA || 0)));
      const list = all.slice(0, Nc);
      if (!list.length) return `Crecimiento (kgB>kgA) – ${labA} vs ${labB}: ninguno en Provincia.`;
      const lines = [`📊 Crecimiento – Provincia (${labA} vs ${labB})`, "Planta|Cliente|tonA→tonB|Δton|ΔIngreso", ...list.map((c, i) => {
        const dTon = ((c.kgB || 0) - (c.kgA || 0)) / 1000;
        return `${i + 1}) ${c.planta}|${c.cliente}|${c.kgAStr || "0"}→${c.kgBStr || "0"}|+${dTon.toFixed(1)} ton|${c.deltaIngresoStr || "-"}`;
      })];
      return lines.join("\n");
    }
    const data = await getDataFull(cmd.planta);
    const list = (data?.crecen?.clientes || []).slice(0, Nc);
    if (!list.length) return `Planta ${cmd.planta}: sin clientes con kgB>kgA.`;
    const lines = [`📊 Crecimiento – ${cmd.planta} (${labA} vs ${labB})`, "Planta|Cliente|tonA→tonB|Δton|ΔIngreso", ...list.map((c, i) => {
      const dTon = ((c.kgB || 0) - (c.kgA || 0)) / 1000;
      return `${i + 1}) ${cmd.planta}|${c.cliente}|${c.kgAStr || "0"}→${c.kgBStr || "0"}|+${dTon.toFixed(1)} ton|${c.deltaIngresoStr || "-"}`;
    })];
    return lines.join("\n");
  }

  if (cmd.type === "nuevos") {
    const Nn = cmd.topN != null ? Math.min(Number(cmd.topN), 20) : 10;
    const labA = periodoToShortLabel(pa);
    const labB = periodoToShortLabel(pb);
    if (cmd.provincia || !cmd.planta) {
      const all = [];
      for (const row of plants) {
        const pl = row.plant_code || row;
        const data = await getDataFull(pl);
        (data?.clientesNuevos?.clientes || []).forEach((c) => all.push({ ...c, planta: pl }));
      }
      all.sort((a, b) => (b.kgB || 0) - (a.kgB || 0));
      const list = all.slice(0, Nn);
      if (!list.length) return `Nuevos (${labA}→${labB}): ninguno en Provincia.`;
      const lines = [`📊 Nuevos – Provincia (${labA} vs ${labB})`, "Planta|Cliente|tonB|ingresoB", ...list.map((c, i) => `${i + 1}) ${c.planta}|${c.cliente}|${c.kgBStr || "0"} ton|${c.ingresoBStr || "-"}`)];
      return lines.join("\n");
    }
    const data = await getDataFull(cmd.planta);
    const list = (data?.clientesNuevos?.clientes || []).slice(0, Nn);
    if (!list.length) return `Planta ${cmd.planta}: sin clientes nuevos (kgA≤0 y kgB>0).`;
    const lines = [`📊 Nuevos – ${cmd.planta} (${labA} vs ${labB})`, "Planta|Cliente|tonB|ingresoB", ...list.map((c, i) => `${i + 1}) ${cmd.planta}|${c.cliente}|${c.kgBStr || "0"} ton|${c.ingresoBStr || "-"}`)];
    return lines.join("\n");
  }

  if (cmd.type === "mas_ingreso") {
    const data = await getData(cmd.planta);
    const list = (data?.mas?.clientes || []).slice(0, N);
    if (!list.length) return `Planta ${cmd.planta}: sin clientes +ingreso.`;
    const lines = [`📊 +Ingreso – ${cmd.planta} (${pa} vs ${pb})`, ...list.map((c, i) => `${i + 1}) ${c.cliente}: tonA ${c.kgAStr || "0"} tonB ${c.kgBStr || "0"}, Δ ${c.deltaIngresoStr}`)];
    return lines.join("\n");
  }

  if (cmd.type === "cliente") {
    const key = normalizeForMatch(cmd.cliente);
    const plantList = cmd.planta ? [cmd.planta] : plants.map((p) => p.plant_code || p);
    let found = null;
    let foundPlanta = null;
    for (const pl of plantList) {
      const data = await getData(pl);
      if (!data) continue;
      const all = [
        ...(data.dejaron?.clientes || []),
        ...(data.disminuyeron?.clientes || []),
        ...(data.mas?.clientes || []),
        ...(data.clientesNuevos?.clientes || []),
      ];
      const f = all.find((c) => normalizeForMatch(c.cliente).includes(key) || key.includes(normalizeForMatch(c.cliente)));
      if (f) {
        found = f;
        foundPlanta = pl;
        break;
      }
    }
    if (!found) return `Cliente no encontrado${cmd.planta ? " en " + cmd.planta : ""} para "${cmd.cliente}".`;
    const labA = periodoToShortLabel(pa);
    const labB = periodoToShortLabel(pb);
    const lines = [
      `Cliente: ${found.cliente}`,
      `Planta: ${foundPlanta}`,
      "",
      "Ventas",
      `${labA}: ${found.kgAStr || "0"} ton`,
      `${labB}: ${found.kgBStr || "0"} ton`,
      "",
      "Descuento $/kg (negativo)",
      `${labA}: ${found.descKgAStr || "-"}`,
      `${labB}: ${found.descKgBStr || "-"}`,
      found.deltaIngresoStr != null ? `ΔIngreso: ${found.deltaIngresoStr}` : "",
    ];
    return lines.filter(Boolean).join("\n");
  }

  if (cmd.type === "estatus" || cmd.type === "plan") {
    if (!aiDb || !client) return "No disponible.";
    const action = cmd.planta && cmd.cliente
      ? await aiDb.getActionByPlantAndCliente(client, cmd.planta, cmd.cliente, pa, pb)
      : null;
    if (!action && cmd.planta) {
      const actions = await aiDb.getOpenActionsByPlant(client, cmd.planta, pa, pb);
      const actionsAll = await aiDb.getActionsForSummary(client, pa, pb);
      const byPlant = (actionsAll || []).filter((a) => String(a.plant_code).toLowerCase() === String(cmd.planta).toLowerCase());
      const key = normalizeForMatch(cmd.cliente);
      const found = (actions || []).find((a) => normalizeForMatch(a.cliente_norm).includes(key)) || byPlant.find((a) => normalizeForMatch(a.cliente_norm).includes(key));
      if (found && aiDb.getActionByPlantAndCliente) {
        const full = await aiDb.getActionByPlantAndCliente(client, found.plant_code, found.cliente_norm, pa, pb);
        if (full) {
          const lines = [
            `Cliente: ${full.cliente_norm}`,
            `Planta: ${cmd.planta}`,
            "",
            `Status: ${full.action_status}`,
            `Responsable: ${full.who || "GG " + cmd.planta}`,
            full.when_date ? `Fecha compromiso: ${full.when_date}` : "",
            full.last_update_text ? "Último update:\n" + full.last_update_text : "",
            full.how_much_impact_mxn != null ? "Impacto estimado:\n" + fmtMxn(full.how_much_impact_mxn) : "",
          ];
          return lines.filter(Boolean).join("\n");
        }
      }
    }
    if (action) {
      const lines = [
        `Cliente: ${action.cliente_norm}`,
        `Planta: ${cmd.planta}`,
        "",
        `Status: ${action.action_status}`,
        `Responsable: ${action.who || "GG " + cmd.planta}`,
        action.when_date ? `Fecha compromiso: ${action.when_date}` : "",
        action.last_update_text ? "Último update:\n" + action.last_update_text : "",
        action.how_much_impact_mxn != null ? "Impacto estimado:\n" + fmtMxn(action.how_much_impact_mxn) : "",
      ];
      return lines.filter(Boolean).join("\n");
    }
    return { reply: `Le pedí al GG de ${cmd.planta} el estatus y plan. Te aviso cuando responda.`, askGG: { plant_code: cmd.planta, question_text: `Estatus y plan 5W2H de ${cmd.cliente}` } };
  }

  if (cmd.type === "pendientes") {
    if (!aiDb || !client) return "No disponible.";
    const list = aiDb.getPendientesByPlant ? await aiDb.getPendientesByPlant(client, pa, pb, cmd.planta || null) : await aiDb.getPendientes(client, pa, pb);
    if (!list.length) return cmd.planta ? `No hay pendientes en ${cmd.planta}.` : "No hay acciones pendientes.";
    const lines = ["📋 Pendientes (por impacto)", ...list.slice(0, 15).map((a, i) => `#${a.id} ${a.plant_code} ${a.cliente_norm}: ${a.action_status}${a.how_much_impact_mxn != null ? " " + fmtMxn(a.how_much_impact_mxn) : ""}${a.last_update_at ? " · " + String(a.last_update_at).slice(0, 10) : ""}`)];
    return lines.join("\n");
  }

  if (cmd.type === "cerrados_hoy") {
    if (!aiDb || !client) return "No disponible.";
    const list = await aiDb.getCerradosHoy(client, pa, pb);
    if (!list.length) return "Ninguna acción cerrada hoy.";
    const lines = ["📋 Cerrados hoy", ...list.map((a) => `• ${a.plant_code} ${a.cliente_norm} (${a.closed_confirmed_by || "-"})`)];
    return lines.join("\n");
  }

  if (cmd.type === "cerrar") {
    return `Para cerrar "${cmd.cliente}" en ${cmd.planta}: el GG debe responder aquí "CERRADO: ${cmd.cliente}" (o "CERRADO ${cmd.cliente}"). Se notificará al Director.`;
  }

  if (cmd.type === "crear_accion") {
    if (!aiDb || !client) return "No disponible.";
    const clienteNorm = String(cmd.cliente || "").trim().substring(0, 255);
    const negativeType = "NO_COMPRAN";
    const id = await aiDb.createAction(client, {
      plant_code: cmd.planta,
      cliente_norm: clienteNorm,
      periodo_a: pa,
      periodo_b: pb,
      negative_type: negativeType,
      what: `Acción creada por comando para ${clienteNorm}`,
    });
    if (!id) return "No se pudo crear la acción (¿ya existe?).";
    return `Acción #${id} creada (${cmd.planta} – ${clienteNorm}). Usa: di 5w2h #${id} para completar 5W2H.`;
  }

  if (cmd.type === "5w2h_id") {
    if (!aiDb || !client) return "No disponible.";
    const action = await aiDb.getActionById(client, cmd.id);
    if (!action) return `No existe acción #${cmd.id}.`;
    const lines = [
      `📋 5W2H – Acción #${cmd.id} (${action.plant_code} – ${action.cliente_norm})`,
      "Responde paso a paso (como niño):",
      "1) What: ¿Qué pasó?",
      "2) Why: ¿Por qué? (tag: INVENTARIO, PRECIO, COMPETENCIA, OTRO)",
      "3) Where: ¿Dónde?",
      "4) When: Fecha compromiso (YYYY-MM-DD)",
      "5) Who: ¿Quién atiende?",
      "6) How: Pasos a seguir",
      "7) How much: Impacto en kg y MXN + evidencia",
      "",
      "Para actualizar: di actualizar #" + cmd.id + " why_tag=INVENTARIO why_detail=\"...\"",
      "Para cerrar: di cerrar #" + cmd.id + " o responde CERRADO #" + cmd.id,
    ];
    return lines.join("\n");
  }

  if (cmd.type === "actualizar_id") {
    if (!aiDb || !client) return "No disponible.";
    const action = await aiDb.getActionById(client, cmd.id);
    if (!action) return `No existe acción #${cmd.id}.`;
    const map = { why_tag: "why_tag", why_detail: "why_detail", where_text: "where_text", when_date: "when_date", who: "who", how_much_impact_kg: "how_much_impact_kg", how_much_impact_mxn: "how_much_impact_mxn", last_update_text: "last_update_text" };
    const fields = {};
    for (const [k, v] of Object.entries(cmd.updates || {})) {
      const dbKey = map[k] || k;
      if (dbKey === "when_date" && v) fields.when_date = v;
      else if (dbKey === "how_much_impact_kg" && v != null) fields.how_much_impact_kg = parseFloat(v);
      else if (dbKey === "how_much_impact_mxn" && v != null) fields.how_much_impact_mxn = parseFloat(v);
      else if (v != null && v !== "") fields[dbKey] = v;
    }
    if (Object.keys(fields).length) await aiDb.updateActionById(client, cmd.id, fields);
    return `Acción #${cmd.id} actualizada.`;
  }

  if (cmd.type === "cerrar_id") {
    if (!aiDb || !client) return "No disponible.";
    const by = (opts.actorNombre || fromPhone || "Usuario").toString().substring(0, 50);
    const row = await aiDb.markActionClosedById(client, cmd.id, by);
    if (!row) return `No existe acción #${cmd.id} o no se pudo cerrar.`;
    try {
      const zpList = await (opts.getUsersByRole && opts.getUsersByRole(client, "ZP")) || [];
      const notif = `✅ Delta Ingreso: acción #${cmd.id} (${row.plant_code} – ${row.cliente_norm}) cerrada por ${by}.`;
      for (const u of zpList) {
        if (u && u.telefono && opts.sendWhatsApp) await opts.sendWhatsApp(u.telefono, notif, { event: "delta_ingreso_ai_cierre" });
      }
    } catch (e) { /* ignore */ }
    return `Acción #${cmd.id} cerrada. Se notificó al Director.`;
  }

  if (cmd.type === "causa") {
    if (!aiDb || !client) return "No disponible.";
    const list = await aiDb.getCausaByPlant(client, pa, pb, cmd.planta || null);
    if (!list.length) return cmd.planta ? `Sin causas registradas en ${cmd.planta}.` : "Sin causas registradas.";
    const scope = cmd.planta ? cmd.planta : "Provincia";
    const lines = [`📊 Causas (why_tag) – ${scope} (${pa} vs ${pb})`, ...list.slice(0, cmd.topN || 10).map((r) => `• ${r.tag}: ${r.cnt} acciones, impacto ${fmtMxn(r.sum_mxn)}`)];
    return lines.join("\n");
  }

  return null;
}

/**
 * Entrada única para mensajes con prefijo "di ".
 * Solo se invoca desde server.js cuando text.toLowerCase().startsWith("di ").
 * No toca folios ni el flujo existente.
 */
async function handleDeltaIngresoCommand(opts) {
  const {
    text,
    actor,
    client,
    fromNorm,
    safeReply,
    getDeltaIngresoDatosInternal,
    deltaIngresoAiDb,
    getUsersByRole,
    sendWhatsApp,
    PERIODO_AI_A,
    PERIODO_AI_B,
  } = opts;
  const input = (text || "").trim();
  if (!input) return safeReply("Escribe un comando después de «di». Ej: di peores, di pendientes.");

  await deltaIngresoAiDb.ensureDeltaIngresoAiSchema(client);
  const plantsWithId = await deltaIngresoAiDb.getProvinciaPlantsWithPlantaId(client);
  const plantsHint = plantsWithId.map((r) => r.plant_code);
  let pa = PERIODO_AI_A;
  let pb = PERIODO_AI_B;
  const prefs = getPeriodoPreference(fromNorm || "default");
  if (prefs && prefs.periodoA && prefs.periodoB) {
    pa = prefs.periodoA;
    pb = prefs.periodoB;
  }
  const isGG = actor && (actor.rol_clave === "GG" || (actor.rol_nombre && String(actor.rol_nombre).toUpperCase().includes("GG")));
  const plantCodeGG = isGG && (actor.planta_nombre || actor.planta_id);

  /* Comandos solo para GG */
  if (isGG && plantCodeGG) {
    const mPlan = input.match(/^plan\s+(.+)$/);
    const mUpdate = input.match(/^update\s+(\S+)\s+(.+)$/);
    const mBloqueo = input.match(/^bloqueo\s+(\S+)\s+(.+)$/);
    const mCerrar = input.match(/^cerrar\s+(\S+)$/);
    if (mPlan) {
      const cliente = mPlan[1].trim();
      await deltaIngresoAiDb.setActionInProgress(client, plantCodeGG, cliente, pa, pb);
      return safeReply(`Plan marcado en proceso para ${cliente.toUpperCase()}.`);
    }
    if (mUpdate) {
      const cliente = mUpdate[1].trim();
      const texto = mUpdate[2].trim();
      await deltaIngresoAiDb.updateActionUpdate(client, plantCodeGG, cliente, pa, pb, texto);
      return safeReply(`Update registrado para ${cliente.toUpperCase()}.`);
    }
    if (mBloqueo) {
      const cliente = mBloqueo[1].trim();
      const texto = mBloqueo[2].trim();
      await deltaIngresoAiDb.updateActionBlocked(client, plantCodeGG, cliente, pa, pb, texto);
      return safeReply(`Bloqueo registrado para ${cliente.toUpperCase()}.`);
    }
    if (mCerrar) {
      const cliente = mCerrar[1].trim();
      const by = (actor.nombre || fromNorm || "GG").toString().substring(0, 50);
      await deltaIngresoAiDb.markActionClosed(client, plantCodeGG, cliente, pa, pb, by);
      try {
        const zpList = await getUsersByRole(client, "ZP");
        const notif = `✅ Delta Ingreso: ${plantCodeGG} – ${cliente.toUpperCase()} cerrado por ${by}.`;
        for (const u of zpList) {
          if (u && u.telefono) await sendWhatsApp(u.telefono, notif, { event: "delta_ingreso_ai_cierre_gg" });
        }
      } catch (e) {
        /* ignore */
      }
      return safeReply(`Cierre registrado para ${cliente.toUpperCase()}. Se notificó al Director.`);
    }
  }

  /* Comandos ZP / compartidos: peores, detalle top, estatus, pendientes, cerrados hoy */
  const cmd = parseDeltaIngresoCommand(input, plantsHint);
  if (!cmd) return safeReply("Comando no reconocido. Prueba: di peores, di detalle top morelos, di estatus morelos gasisa, di pendientes, di cerrados hoy.");

  const cmdResponse = await executeDeltaIngresoCommand(cmd, {
    client,
    fromPhone: fromNorm,
    periodos: { periodoA: pa, periodoB: pb },
    getDeltaIngresoDatosInternal,
    plantsWithId,
    aiDb: deltaIngresoAiDb,
    getUsersByRole,
    sendWhatsApp,
    actorNombre: actor?.nombre || fromNorm,
  });
  if (!cmdResponse) return safeReply("Sin datos para ese comando.");
  const replyText = typeof cmdResponse === "object" && cmdResponse.reply ? cmdResponse.reply : cmdResponse;
  const MAX_LEN = 900;
  let out = (replyText || "").trim();
  if (out.length > MAX_LEN) {
    const first = out.substring(0, MAX_LEN);
    const lastBreak = first.lastIndexOf("\n");
    const split = lastBreak > MAX_LEN / 2 ? lastBreak : MAX_LEN;
    await safeReply(out.substring(0, split));
    out = out.substring(split);
  }
  return safeReply(out || "Sin respuesta.");
}

module.exports = {
  isExplicitAskGG,
  isDataQuery,
  parseDeltaIngresoCommand,
  executeDeltaIngresoCommand,
  handleDeltaIngresoCommand,
  deltaIngresoLikelyText,
  translateNaturalToDi,
  deltaIngresoConversationalRouter,
  getPeriodoPreference,
  setPeriodoPreference,
  PLANTS_PROVINCIA,
  resolvePlanta,
  detectPlantaAtEnd,
};
