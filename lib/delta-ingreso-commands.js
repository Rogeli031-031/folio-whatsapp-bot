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

  let match;
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
    const planta = resolvePlanta(match[1].trim(), plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "no_compran", planta, raw } : null;
  }
  if ((match = t.match(/^menos\s+ingreso\s+(.+)$/))) {
    const planta = resolvePlanta(match[1].trim(), plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "menos_ingreso", planta, raw } : null;
  }
  if ((match = t.match(/^nuevos\s+(.+)$/))) {
    const planta = resolvePlanta(match[1].trim(), plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "nuevos", planta, raw } : null;
  }
  if ((match = t.match(/^mas\s+ingreso\s+(.+)$/))) {
    const planta = resolvePlanta(match[1].trim(), plants) || detectPlantaAtEnd(raw);
    return planta ? { type: "mas_ingreso", planta, raw } : null;
  }
  if ((match = t.match(/^cliente\s+(\w+(?:\s+\w+)?)\s+(.+)$/))) {
    const planta = resolvePlanta(match[1].trim(), plants);
    if (planta) return { type: "cliente", planta, cliente: match[2].trim(), raw };
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
      "📋 Delta Ingreso – Comandos",
      "• plantas | periodos | peores",
      "• negativos provincia | negativos {planta}",
      "• top {planta} | top5 {planta}",
      "• detalle top {planta} | venta desc top {planta}",
      "• no compran | menos ingreso | nuevos | mas ingreso + {planta}",
      "• cliente {planta} {nombre}",
      "• estatus | plan | cerrar + {planta} {cliente}",
      "• Para preguntar al GG: «pregúntale al GG» o «askgg {planta} {pregunta}»",
    ];
    return lines.join("\n");
  }

  if (cmd.type === "plantas") {
    const names = plants.length ? plants.map((p) => p.plant_code) : PLANTS_PROVINCIA;
    return `📋 Plantas Provincia:\n${names.join(", ")}`;
  }

  if (cmd.type === "periodos") {
    return `📅 Periodos configurados: ${pa || "?"} vs ${pb || "?"}`;
  }

  const getData = async (planta) => {
    if (!getDeltaIngresoDatosInternal || !client) return null;
    return getDeltaIngresoDatosInternal(client, planta, pa, pb, false);
  };

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

  if (cmd.type === "no_compran") {
    const data = await getData(cmd.planta);
    const list = (data?.dejaron?.clientes || []).slice(0, 5);
    if (!list.length) return `Planta ${cmd.planta}: ningún cliente "no compran".`;
    const lines = [`📊 No compran – ${cmd.planta} (${pa} vs ${pb})`, ...list.map((c, i) => `${i + 1}) ${c.cliente}: ${c.ingresoAStr} (${c.kgAStr} ton → 0)`)];
    return lines.join("\n");
  }

  if (cmd.type === "menos_ingreso") {
    const data = await getData(cmd.planta);
    const list = (data?.disminuyeron?.clientes || []).slice(0, 5);
    if (!list.length) return `Planta ${cmd.planta}: sin clientes −Ingreso.`;
    const lines = [`📊 −Ingreso – ${cmd.planta} (${pa} vs ${pb})`, ...list.map((c, i) => `${i + 1}) ${c.cliente}: ${c.deltaIngresoStr}`)];
    return lines.join("\n");
  }

  if (cmd.type === "nuevos") {
    const data = await getData(cmd.planta);
    const list = (data?.clientesNuevos?.clientes || []).slice(0, 5);
    if (!list.length) return `Planta ${cmd.planta}: sin clientes nuevos.`;
    const lines = [`📊 Nuevos – ${cmd.planta} (${pa} vs ${pb})`, ...list.map((c, i) => `${i + 1}) ${c.cliente}: ${c.ingresoBStr}`)];
    return lines.join("\n");
  }

  if (cmd.type === "mas_ingreso") {
    const data = await getData(cmd.planta);
    const list = (data?.mas?.clientes || []).slice(0, 5);
    if (!list.length) return `Planta ${cmd.planta}: sin clientes +ingreso.`;
    const lines = [`📊 +Ingreso – ${cmd.planta} (${pa} vs ${pb})`, ...list.map((c, i) => `${i + 1}) ${c.cliente}: ${c.deltaIngresoStr}`)];
    return lines.join("\n");
  }

  if (cmd.type === "cliente") {
    const data = await getData(cmd.planta);
    if (!data) return `Sin datos para ${cmd.planta}.`;
    const all = [
      ...(data.dejaron?.clientes || []),
      ...(data.disminuyeron?.clientes || []),
      ...(data.mas?.clientes || []),
      ...(data.clientesNuevos?.clientes || []),
    ];
    const key = normalizeForMatch(cmd.cliente);
    const found = all.find((c) => normalizeForMatch(c.cliente).includes(key) || key.includes(normalizeForMatch(c.cliente)));
    if (!found) return `Cliente no encontrado en ${cmd.planta} para "${cmd.cliente}".`;
    const labA = periodoToShortLabel(pa);
    const labB = periodoToShortLabel(pb);
    const lines = [
      `Cliente: ${found.cliente}`,
      `Planta: ${cmd.planta}`,
      "",
      "Ventas",
      `${labA}: ${found.kgAStr || "0"} ton`,
      `${labB}: ${found.kgBStr || "0"} ton`,
      "",
      "Descuento promedio",
      `${labA}: ${found.descKgAStr || "0"}`,
      `${labB}: ${found.descKgBStr || "0"}`,
    ];
    return lines.join("\n");
  }

  if (cmd.type === "estatus" || cmd.type === "plan") {
    if (!aiDb || !client) return "No disponible.";
    const actions = await aiDb.getOpenActionsByPlant(client, cmd.planta, pa, pb);
    const actionsAll = await aiDb.getActionsForSummary(client, pa, pb);
    const byPlant = (actionsAll || []).filter((a) => String(a.plant_code).toLowerCase() === String(cmd.planta).toLowerCase());
    const key = normalizeForMatch(cmd.cliente);
    const action = (actions || []).find((a) => normalizeForMatch(a.cliente_norm).includes(key)) || byPlant.find((a) => normalizeForMatch(a.cliente_norm).includes(key));
    if (action) {
      const lines = [
        `Cliente: ${action.cliente_norm}`,
        `Planta: ${cmd.planta}`,
        "Plan registrado (5W2H):",
        action.what ? `WHAT: ${action.what}` : "",
        action.why_tag || action.why_detail ? `WHY: ${action.why_tag || ""} ${action.why_detail || ""}`.trim() : "",
        action.when_date ? `WHEN: ${action.when_date}` : "",
        action.who ? `WHO: ${action.who}` : "",
        `Status: ${action.action_status}`,
      ];
      return lines.filter(Boolean).join("\n");
    }
    return { reply: `Le pedí al GG de ${cmd.planta} el estatus y plan. Te aviso cuando responda.`, askGG: { plant_code: cmd.planta, question_text: `Estatus y plan 5W2H de ${cmd.cliente}` } };
  }

  if (cmd.type === "cerrar") {
    return `Para cerrar "${cmd.cliente}" en ${cmd.planta}: el GG debe responder aquí "CERRADO: ${cmd.cliente}" (o "CERRADO ${cmd.cliente}"). Se notificará al Director.`;
  }

  return null;
}

module.exports = {
  isExplicitAskGG,
  isDataQuery,
  parseDeltaIngresoCommand,
  executeDeltaIngresoCommand,
  PLANTS_PROVINCIA,
  resolvePlanta,
  detectPlantaAtEnd,
};
