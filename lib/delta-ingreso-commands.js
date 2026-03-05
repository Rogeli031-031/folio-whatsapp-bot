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

/** True solo si el texto es explícito "preguntar al GG/gerente". Determinístico, sin OpenAI. */
function isExplicitAskGG(text) {
  const t = normalizeForMatch(text);
  if (!t) return false;
  if (/^askgg\s+/.test(t) || /^ask\s+gg\s+/.test(t)) return true;
  const phrases = [
    "preguntale al gg",
    "preguntale al gerente",
    "pidele al gg",
    "pidele al gerente",
    "consultale al gg",
    "consúltale al gg",
  ];
  if (phrases.some((p) => t.includes(p))) return true;
  if (/^(estatus|plan|5w2h|cerrar|cierre)\s+/.test(t)) return true;
  return false;
}

/** Heurística: es consulta de datos (venta/descuento/top) y NO estatus/plan/cierre. */
function isDataQuery(text) {
  const t = normalizeForMatch(text);
  if (!t) return false;
  const dataTerms = [
    "venta",
    "descuento",
    "ton",
    "kg",
    "top",
    "clientes",
    "enero",
    "febrero",
    "mes",
    "cada mes",
    "primeros",
    "afectados",
    "no compran",
    "menos ingreso",
    "nuevos",
    "mas ingreso",
  ];
  const excludeTerms = [
    "estatus",
    "plan",
    "5w2h",
    "por que",
    "causa",
    "evidencia",
    "cerrar",
    "confirmar",
    "seguimiento",
  ];
  const hasData = dataTerms.some((k) => t.includes(k));
  const hasExclude = excludeTerms.some((k) => t.includes(k));
  return hasData && !hasExclude;
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
    const planta = rest ? (resolvePlanta(rest, plants) || detectPlantaAtEnd(raw)) : null;
    return { type: "resumen", planta: planta || undefined, raw };
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
  if ((match = t.match(/^nuevos\s+(.+)$/))) {
    const rest = match[1].trim();
    const topN = parseTopN(rest, 5);
    const restSinTop = rest.replace(/\b(?:top\s*)?\d+\b|\bprimeros\s*\d+\b/gi, "").trim();
    const planta = resolvePlanta(restSinTop, plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "nuevos", planta, topN, raw } : null;
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
      "di resumen [planta] | di causa [planta] [topN]",
      "di no compran {planta} [topN] | di menos ingreso {planta} [topN]",
      "di nuevos {planta} [topN] | di mas ingreso {planta} [topN]",
      "di detalle top {planta} | di venta descuento [planta] topN",
      "di cliente [planta] {nombre} | di estatus/plan/cerrar {planta} {cliente}",
      "di crear accion {planta} {cliente} | di 5w2h #ID | di actualizar #ID campo=valor",
      "di pendientes [planta] | di cerrar #ID [motivo] | di cerrados hoy",
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

  if (cmd.type === "resumen") {
    const plantList = cmd.planta ? [{ plant_code: cmd.planta }] : plants;
    let totalNoCompran = 0;
    let totalMenosIngreso = 0;
    const allAffected = [];
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
    }
    const totalNeg = totalNoCompran + totalMenosIngreso;
    const top3 = allAffected.sort((a, b) => b.impact - a.impact).slice(0, 3);
    let causaFrase = "";
    if (aiDb && client) {
      const causas = await aiDb.getCausaByPlant(client, pa, pb, cmd.planta || null);
      if (causas && causas.length) causaFrase = "\nCausas (why_tag): " + causas.slice(0, 3).map((r) => `${r.tag} (${r.cnt})`).join(", ");
    }
    const scope = cmd.planta ? cmd.planta : "Provincia";
    const lines = [
      `📊 Resumen ${scope} (${pa} vs ${pb})`,
      `No compran: ${fmtMxn(-totalNoCompran)} | −Ingreso: ${fmtMxn(-totalMenosIngreso)}`,
      `Total negativos: ${fmtMxn(-totalNeg)}`,
      "Top 3 afectación:",
      ...top3.map((c, i) => `${i + 1}) ${c.cliente} (${c.planta}): ${fmtMxn(-(c.impact || 0))}`),
      causaFrase,
    ];
    return lines.filter(Boolean).join("\n");
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

  if (cmd.type === "nuevos") {
    const data = await getData(cmd.planta);
    const list = (data?.clientesNuevos?.clientes || []).slice(0, N);
    if (!list.length) return `Planta ${cmd.planta}: sin clientes nuevos.`;
    const lines = [`📊 Nuevos – ${cmd.planta} (${pa} vs ${pb})`, ...list.map((c, i) => `${i + 1}) ${c.cliente}: ${c.kgBStr || "0"} ton, ${c.descKgBStr || "-"} $/kg, ${c.ingresoBStr || "-"}`)];
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
  getPeriodoPreference,
  setPeriodoPreference,
  PLANTS_PROVINCIA,
  resolvePlanta,
  detectPlantaAtEnd,
};
