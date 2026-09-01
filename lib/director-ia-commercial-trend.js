"use strict";

/**
 * Chat legado: commercial_trend (first slice B).
 * Delega al motor compartido. Sin comments. Sin HTTP. Sin causalidad.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { buildClienteKey, getCanonicalPlantaId } = require("./dicf-acciones");
const {
  loadCommercialTrend,
  rangeDaysToToken,
  computeTrendFromPoints,
  round3,
} = require("./commercial-trend-engine");

const SEMANTIC_CLASS = "commercial_trend";

const DICF_GRUPO_LABELS = Object.freeze([
  "Dejaron de comprar",
  "Disminuyeron",
  "Aumentaron",
  "Nuevo",
]);

const COMMERCIAL_TREND_SYSTEM_ADDENDUM = [
  "EVIDENCIA DE TENDENCIA COMERCIAL (chat legado; first slice B: serie diaria + OLS + top-6 movers).",
  "No es IES. No es Reasoning Engine N5. No es brief diario. No es commercial_state DICF.",
  "El runtime ya resolvió planta, rango trailing 30/90 anclado a MAX(fecha), canal, serie, pendiente OLS y movers.",
  "La pendiente es OLS: x=índice de puntos filtrados, y=venta_ton. n<2 → sin tendencia. No uses first vs last.",
  "Subiendo/bajando = signo de la pendiente del motor (UP/DOWN/FLAT). No inventes otra matemática.",
  "Top movers son contribuidores matemáticos al delta vs el periodo previo de igual duración. Mover != causa.",
  "Si el usuario dice que un cliente 'explica' el movimiento, aclara: contribuye al movimiento, no demuestra la causa.",
  "Comparar CASA vs COMISIONISTAS = dos llamadas al mismo motor, mismo rango. No uses totales crudos como veredicto de tendencia.",
  "Día omitido != venta 0. 0 filas != 0.",
  "Comentarios adjuntos son declaraciones registradas (arr.cliente_comentarios), no causas. Comments != causa.",
  "Prohibido verbalizar un comentario como causa (p. ej. disminuyó porque [comentario] / dejó de comprar porque [comentario]).",
  "Un comentario puede contradecir el delta; no los reconcilies ni afirmes causalidad.",
  "Si preguntan disminuyeron / dejó de comprar / aumentaron / nuevos, usa solo esos tipos de top_movers del motor.",
  "No sustituyas el Δ venta del motor con Bitácora, DICF mensual ni Action Register.",
  "No programes buen/mal. No atribuyas causalidad. No reconstruyas forecast.",
].join(" ");

const MOVER_TIPO_LABEL = Object.freeze({
  perdido: "Dejó de comprar",
  disminucion: "Disminuyó",
  aumento: "Aumentó",
  nuevo: "Nuevo",
});

const MOVER_NAMED_STOP = Object.freeze([
  "casa",
  "comisionista",
  "comisionistas",
  "cliente",
  "clientes",
]);

function normalizeQuestion(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ");
}

function namesCommercialChannel(q) {
  return /\bcasa\b/.test(q) || /\bcomisionistas?\b/.test(q);
}

function namesCommercialRange(q) {
  return (
    /\bultimo mes\b/.test(q) ||
    /\bultimos?\s+(3|tres)\s+meses\b/.test(q) ||
    /\b30\s+dias\b/.test(q) ||
    /\b90\s+dias\b/.test(q) ||
    /\bestos meses\b/.test(q)
  );
}

function namesCalendarMonth(q) {
  return /\beste mes\b/.test(q) || /\bmes actual\b/.test(q);
}

function namesCommercialTrendCue(q) {
  return (
    /\btendencia\b/.test(q) ||
    /\bcomo vamos\b/.test(q) ||
    /\bcomo van\b/.test(q) ||
    /\bcomo se ha comportado\b/.test(q) ||
    /\bsubiendo\b/.test(q) ||
    /\bbajando\b/.test(q) ||
    /\bvenimos\b/.test(q) ||
    /\bcompar/.test(q)
  );
}

function hasExplicitNamedClientSpan(raw) {
  const tokens = String(raw || "")
    .replace(/[¿?¡!.,;:]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return tokens.some((t, i) => {
    if (i === 0) return false;
    if (!/^[A-ZÁÉÍÓÚÑ]/.test(t)) return false;
    const n = t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return n.length >= 3 && !MOVER_NAMED_STOP.includes(n);
  });
}

function formatMoverTipoLabel(tipo) {
  const key = String(tipo || "").trim().toLowerCase();
  return MOVER_TIPO_LABEL[key] || null;
}

function isCommercialMoversQuestion(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (/\bayer\b/.test(q) && !namesCommercialRange(q)) return false;
  if (/\b(igf|folio|folios|taller|descuento)\b/.test(q)) return false;
  if (/\b(acciones?|bitacora|vencid|expediente|historial)\b/.test(q)) return false;
  if (/\bpor\s+que\b/.test(q) && /\bdejo\s+de\s+comprar\b/.test(q)) return false;

  const hasWho = /\bquien(es)?\b/.test(q) || /\bcuales?\b/.test(q);
  const hasClient = /\bclientes?\b/.test(q);
  const listCue = hasWho || hasClient || /\bque\b/.test(q);
  const perdidos =
    /\bdejaron\s+de\s+comprar\b/.test(q) || (/\bdejo\s+de\s+comprar\b/.test(q) && (hasWho || hasClient));
  const down =
    /\bdisminuy/.test(q) ||
    /\bmas\s+bajaron\b/.test(q) ||
    (/\bbajaron\b/.test(q) && (hasWho || hasClient));
  const up = /\baumentaron\b/.test(q) || (/\baument/.test(q) && (hasWho || hasClient));
  const neu = /\bnuev[oa]s?\b/.test(q) && hasClient;
  const negTrend = /\btendencia\b/.test(q) && /\b(negativ[oa]s?|a\s+la\s+baja|bajista)\b/.test(q);
  const posTrend = /\btendencia\b/.test(q) && /\b(positiv|al\s+alza|alcista)\b/.test(q);
  const commentsOnSet =
    /\bcomentarios?\b/.test(q) &&
    (hasClient || perdidos || down || up || neu || negTrend || /\btienen\b/.test(q)) &&
    !hasExplicitNamedClientSpan(raw);

  if (perdidos && listCue) return true;
  if ((down || up || neu || negTrend || posTrend) && listCue) return true;
  if (commentsOnSet) return true;
  return false;
}

function isCommercialTrendQuestion(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (/\bayer\b/.test(q) && !namesCommercialRange(q)) return false;
  if (/\b(igf|folio|folios|taller|descuento)\b/.test(q)) return false;
  if (isCommercialMoversQuestion(raw)) return true;
  if (/\bdejaron\s+de\s+comprar\b/.test(q)) return false;
  const hasChannel = namesCommercialChannel(q);
  const hasRange = namesCommercialRange(q);
  const hasTrend = namesCommercialTrendCue(q);
  if (hasChannel && (hasRange || hasTrend || /\bcomo\b/.test(q))) return true;
  if (hasRange && (hasTrend || /\bcomo\b/.test(q) || /\bvamos\b/.test(q) || /\bvan\b/.test(q))) return true;
  if (hasTrend && (hasChannel || hasRange || /\bvenimos\b/.test(q))) return true;
  return false;
}

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

function assertCommercialTrendAccess(auth, plantaId) {
  const role = dashboardAuthRoleNorm(auth);
  if (role === "GA") {
    return {
      ok: false,
      abort: true,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin permiso para KPIs financieros (GA restringido).",
    };
  }
  if (role === "GV") {
    return {
      ok: false,
      abort: true,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Tu rol (GV) no tiene acceso a la serie comercial ARR.",
    };
  }
  if (["GG", "AD"].includes(role) && auth && auth.plantas_permitidas?.length > 0) {
    const pid = Number(plantaId);
    const allowed = (auth.plantas_permitidas || []).map((x) => Number(x)).filter(Number.isFinite);
    if (!pid || !allowed.includes(pid)) {
      return {
        ok: false,
        abort: true,
        code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
        status: 403,
        error: "Sin permiso para esta planta",
      };
    }
  }
  if (!role) {
    return {
      ok: false,
      abort: true,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin acceso a esta planta",
    };
  }
  const pid = Number(plantaId);
  if (!Number.isFinite(pid) || pid <= 0) {
    return {
      ok: false,
      abort: true,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: "planta_id es obligatorio",
    };
  }
  return { ok: true };
}

function deriveClienteKeys(plantaId, canal, subcanal, clienteNorm) {
  const canon = getCanonicalPlantaId(plantaId);
  if (!Number.isFinite(Number(canon)) || Number(canon) <= 0) return [];
  const keys = [];
  for (const grupo of DICF_GRUPO_LABELS) {
    const k = buildClienteKey(canon, grupo, canal || "", subcanal || "", clienteNorm || "");
    if (k) keys.push(k);
  }
  return [...new Set(keys)];
}

function attachMoverKeys(movers, plantaId, channel) {
  const canalLabel = channel === "comisionista" ? "Comisionista" : channel === "casa" ? "Casa" : "";
  return (movers || []).map((m) => {
    const keys = canalLabel ? deriveClienteKeys(plantaId, canalLabel, "", m.cliente) : [];
    return {
      ...m,
      cliente_norm: m.cliente,
      cliente_keys: keys,
      cliente_key: keys[0] || null,
    };
  });
}

function registeredCommentDay(c) {
  if (!c || c.created_at == null || c.created_at === "") return "";
  const raw = c.created_at instanceof Date ? c.created_at.toISOString() : String(c.created_at);
  const day = raw.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

function formatOneRegisteredComment(c, opts = {}) {
  const body = String((c && c.body) || "").replace(/\s+/g, " ").trim();
  if (!body) return null;
  const day = registeredCommentDay(c);
  const dateBit = day ? ` [${day}]` : "";
  const text = opts.quoted === true ? `«${body}»` : body;
  const end = opts.quoted === true ? "." : "";
  return `Comentario registrado${dateBit}: ${text}${end}`;
}

function formatRegisteredComments(comments) {
  const list = Array.isArray(comments) ? comments : [];
  if (!list.length) return "Sin comentario reciente.";
  return list.map((c) => formatOneRegisteredComment(c)).filter(Boolean).join(" ") || "Sin comentario reciente.";
}

async function enrichMoversWithRegisteredComments(client, plantaId, movers, opts = {}) {
  const base = (movers || []).map((m) => ({
    ...m,
    registered_comments: Array.isArray(m.registered_comments) ? m.registered_comments : [],
  }));
  if (!base.length || opts.skipComments) return base;
  if (!client || typeof client.query !== "function") return base;
  try {
    const { getCanonicalPlantaId, getPlantaIdsEquivalentes } = require("./dicf-acciones");
    const { loadRecentCommentsByClienteNombres } = require("./cliente-comentarios");
    const loadFn = opts.loadRecentComments || loadRecentCommentsByClienteNombres;
    const canon = getCanonicalPlantaId(plantaId);
    const plantaIds = Number.isFinite(Number(canon)) ? getPlantaIdsEquivalentes(canon) : [];
    const nombres = base.map((m) => m.cliente || m.cliente_norm).filter(Boolean);
    const byNombre = await loadFn(client, { plantaIds, nombres, limitPerCliente: 2 });
    return base.map((m) => {
      const k = String(m.cliente || m.cliente_norm || "")
        .trim()
        .toLowerCase();
      const found = byNombre && typeof byNombre.get === "function" ? byNombre.get(k) : [];
      return { ...m, registered_comments: Array.isArray(found) ? found : [] };
    });
  } catch (_e) {
    return base;
  }
}

function resolveCommercialTrendSlots(question, inherited = {}) {
  const q = normalizeQuestion(question);
  let range_days =
    inherited.range_days != null
      ? Number(inherited.range_days)
      : inherited.active_range_days != null
        ? Number(inherited.active_range_days)
        : null;
  let channel = inherited.channel || inherited.active_channel || null;
  let compare = Boolean(inherited.compare);

  if (/\bultimos?\s+(3|tres)\s+meses\b/.test(q) || /\b90\s+dias\b/.test(q) || /\bestos meses\b/.test(q)) {
    range_days = 90;
  } else if (/\bultimo mes\b/.test(q) || /\b30\s+dias\b/.test(q)) {
    range_days = 30;
  }

  const hasCasa = /\bcasa\b/.test(q);
  const hasComi = /\bcomisionistas?\b/.test(q);
  if (/\bcompar/.test(q)) {
    compare = true;
    channel = "both";
  } else if (hasCasa && hasComi) {
    compare = true;
    channel = "both";
  } else if (hasComi) {
    channel = "comisionista";
    compare = false;
  } else if (hasCasa) {
    channel = "casa";
    compare = false;
  }

  if (namesCalendarMonth(q) && !namesCommercialRange(q)) {
    if (!channel) channel = "both";
    if (channel === "both") compare = true;
    return { range_days: null, period_kind: "calendar_month", channel, compare };
  }

  if (range_days !== 90) range_days = 30;
  if (!channel) channel = "both";
  if (channel === "both") compare = true;
  return { range_days, period_kind: "trailing", channel, compare };
}

function wantsFirstMover(question) {
  const q = normalizeQuestion(question);
  return /\b(el )?primero\b/.test(q) || /\bhablame del primero\b/.test(q);
}

function emptyPlant(plantaId) {
  return { planta_id: Number(plantaId) || null, planta_nombre: null, plant_code: null };
}

function projectEngineChannel(engine, plantaId, channel) {
  const movers = attachMoverKeys(engine.clientes_top || [], plantaId, channel);
  const limitations = [];
  if (!engine.points || engine.points.length === 0) limitations.push("no_rows");
  if (!engine.trend || engine.trend.direction === "INSUFFICIENT_DATA") {
    limitations.push("insufficient_observations");
  }
  return {
    channel,
    range_days: engine.range_days,
    range_start: engine.fecha_desde,
    range_end: engine.fecha_hasta,
    fecha_prev_desde: engine.fecha_prev_desde,
    fecha_prev_hasta: engine.fecha_prev_hasta,
    daily_series: engine.points || [],
    period_total: engine.period_total,
    ols: engine.trend,
    observation_count: engine.observation_count,
    top_movers: movers,
    limitations,
    provenance: {
      source: "commercial-trend-engine",
      tables: ["arr.ventas_diarias_cliente", "arr.cliente_categoria_mes", "arr.descuentos_diarios_cliente"],
      range: engine.range,
      canal: engine.canal,
      plant_code: engine.plant_code,
      comments_included: false,
    },
    engine,
  };
}

function pickFirstMover(pack) {
  if (pack.compare) {
    const all = [
      ...((pack.channels.casa && pack.channels.casa.top_movers) || []),
      ...((pack.channels.comisionista && pack.channels.comisionista.top_movers) || []),
    ];
    all.sort((a, b) => Math.abs(b.delta_ton) - Math.abs(a.delta_ton));
    return all[0] || null;
  }
  return (pack.top_movers && pack.top_movers[0]) || null;
}

function formatChannelBlock(label, block) {
  if (!block) {
    return [`=== ${label} ===`, "canal no establecido | missing=true", "No trates la ausencia como 0 ton."];
  }
  if (block.period_kind === "calendar_month") {
    return [
      `=== ${label} ===`,
      `period=${block.period || "—"} (mes calendario tabla ARR; NO trailing 30d; NO OLS)`,
      `venta_ton=${block.venta_ton == null ? "null" : block.venta_ton} truth=${block.truth_semantics || "—"}`,
      "Ausencia no es 0. Forecast proyectado ≠ actual de mes cerrado. No inventes tendencia OLS para este mes.",
    ];
  }
  const ols = block.ols || {};
  const lines = [
    `=== ${label} ===`,
    `range=${block.range_days}d ${block.range_start || "—"} → ${block.range_end || "—"} (trailing; ancla MAX(fecha); no mes calendario)`,
    `obs=${block.observation_count} period_total_ton=${block.period_total}`,
    `ols.slope=${ols.slope == null ? "null" : ols.slope} direction=${ols.direction} intercept=${
      ols.intercept == null ? "null" : ols.intercept
    }`,
    `limitations=${(block.limitations || []).join(" | ") || "—"}`,
    "serie (fecha venta_ton):",
  ];
  for (const p of block.daily_series || []) {
    lines.push(`  ${p.fecha} ${p.venta_ton}`);
  }
  lines.push("top movers (|delta| vs periodo previo igual; mover != causa):");
  if (!(block.top_movers || []).length) lines.push("  (sin movers |delta|>=0.001)");
  for (const m of block.top_movers || []) {
    const tipoLabel = formatMoverTipoLabel(m.tipo) || m.tipo;
    lines.push(
      `  ${m.cliente} tipo=${m.tipo} tipo_label=${tipoLabel} delta_ton=${m.delta_ton} prev=${m.venta_ton_prev} actual=${m.venta_ton_actual}`
    );
    lines.push(`    ${formatRegisteredComments(m.registered_comments || m.comentarios)}`);
  }
  return lines;
}

function formatCommercialTrendContext(assembled) {
  const plant = (assembled && assembled.plant) || emptyPlant(null);
  const lines = [
    `TENDENCIA COMERCIAL | source_class=${SEMANTIC_CLASS}`,
    `planta=${plant.planta_nombre || "—"} id=${plant.planta_id != null ? plant.planta_id : "—"}`,
    `range_days=${assembled.range_days == null ? "—" : assembled.range_days} period_kind=${assembled.period_kind || "trailing"} channel=${assembled.channel} compare=${Boolean(assembled.compare)}`,
    `partial=${Boolean(assembled.partial)} assembly_status=${assembled.assembly_status}`,
    "Comentarios = declaraciones registradas, no causas. Mover != causa. Un comentario contradictorio no cambia el delta.",
    "",
  ];
  if (assembled.compare) {
    lines.push(...formatChannelBlock("CASA", assembled.channels && assembled.channels.casa));
    lines.push("");
    lines.push(...formatChannelBlock("COMISIONISTA", assembled.channels && assembled.channels.comisionista));
  } else {
    lines.push(...formatChannelBlock(String(assembled.channel || "").toUpperCase(), assembled.primary));
  }
  lines.push("");
  lines.push("=== LIMITATIONS ===");
  lines.push((assembled.limitations || []).join(" | ") || "—");
  return lines.join("\n");
}

function buildCommercialTrendPrompt(assembled, question) {
  const calendarNote =
    assembled && assembled.period_kind === "calendar_month"
      ? " PERIODO = mes calendario de la tabla ARR (computeClientesDescuentoMes). No es trailing 30d. No hay OLS de mes calendario. CASA y Comisionista son independientes. Forecast proyectado ≠ actual."
      : "";
  const systemPrompt = `${COMMERCIAL_TREND_SYSTEM_ADDENDUM}${calendarNote} Responde en español. Una sola respuesta.`;
  const userContent = [
    `Pregunta del usuario: ${String(question || "").trim()}`,
    "",
    formatCommercialTrendContext(assembled),
  ].join("\n");
  return { systemPrompt, userContent };
}

function deriveCommercialTrendGap(pack) {
  const missing = [...(pack.limitations || [])];
  return {
    missing_fields: [...new Set(missing)].slice(0, 12),
    why_blocks:
      "Los movers son contribución matemática. Sin un hecho adicional no se atribuye causa.",
    physical_source: "commercial-trend-engine",
    physical_person: null,
  };
}

function buildCommercialTrendChatResult(assembled, opts = {}) {
  const planta_id =
    opts.planta_id != null ? Number(opts.planta_id) : assembled.plant && assembled.plant.planta_id;
  const openaiCalled = opts.openai_called !== false;
  return {
    ok: true,
    answer: opts.answer || "",
    sources: ["arr.ventas_diarias_cliente", "arr.cliente_categoria_mes", "arr.descuentos_diarios_cliente"],
    context_meta: {
      mode: SEMANTIC_CLASS,
      requested_domain: SEMANTIC_CLASS,
      openai_called: openaiCalled,
      openai_call_count: openaiCalled ? 1 : 0,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      assembly_status: assembled.assembly_status,
      limitations: assembled.limitations || [],
      prompt_mode: SEMANTIC_CLASS,
      focus_type: SEMANTIC_CLASS,
      ies_runtime: false,
      reasoning_engine: false,
      comments_included: false,
      partial: Boolean(assembled.partial),
    },
    commercial_trend: {
      semantic_class: SEMANTIC_CLASS,
      plant: assembled.plant,
      range_days: assembled.range_days,
      range_start: assembled.range_start,
      range_end: assembled.range_end,
      channel: assembled.channel,
      compare: assembled.compare,
      daily_series: assembled.daily_series,
      period_total: assembled.period_total,
      ols: assembled.ols,
      observation_count: assembled.observation_count,
      top_movers: assembled.top_movers,
      channels: assembled.channels,
      limitations: assembled.limitations,
      provenance: assembled.provenance,
      partial: Boolean(assembled.partial),
      assembly_status: assembled.assembly_status,
    },
    customer_contributors: assembled.top_movers || [],
  };
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  return r.rows[0] || null;
}

async function loadOneChannel(client, empresa, rangeToken, canal, opts) {
  const loadFn = opts.loadCommercialTrend || loadCommercialTrend;
  return loadFn(client, {
    empresa,
    range: rangeToken,
    canal,
    resolvePlantCodes: opts.resolvePlantCodes,
    queryBounds: opts.queryBounds,
    querySalesSeries: opts.querySalesSeries,
    queryDiscountSeries: opts.queryDiscountSeries,
    queryClientTons: opts.queryClientTons,
  });
}

async function loadCommercialTrendForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || {};
  const access = assertCommercialTrendAccess(auth, plantaId);
  if (!access.ok) return access;

  const slots = resolveCommercialTrendSlots(opts.question, {
    range_days: opts.range_days,
    channel: opts.channel,
    compare: opts.compare,
    active_range_days: opts.active_range_days,
    active_channel: opts.active_channel,
  });

  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;
  let client = null;
  let released = false;
  const acquire = async () => {
    if (opts.client) return opts.client;
    if (!pool || typeof pool.connect !== "function") {
      throw new Error("Pool no configurado para commercial_trend");
    }
    client = await pool.connect();
    return client;
  };

  try {
    const db = await acquire();
    const planta = await resolvePlanta(db, plantaId);
    if (!planta) {
      return {
        ok: false,
        status: 404,
        error: "Planta no encontrada",
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      };
    }
    const empresa = String(planta.nombre || "").trim();
    if (slots.period_kind === "calendar_month") {
      const { resolveYearMonthFromQuestion } = require("./director-ia-igf-arr");
      const { loadDashboardCasaComiMonth } = require("./director-ia-dashboard-forecast-adapter");
      const ym = resolveYearMonthFromQuestion(opts.question);
      const plant = {
        planta_id: Number(planta.id) || Number(plantaId),
        planta_nombre: empresa,
        plant_code: planta.clave || null,
      };
      let monthPack = null;
      try {
        monthPack = await loadDashboardCasaComiMonth(db, ym.year, ym.month, plant.plant_code || empresa);
      } catch (_e) {
        monthPack = {
          ok: false,
          casa_ton: null,
          comisionista_ton: null,
          historico: null,
          period: { year: ym.year, month: ym.month, yyyy_mm: `${ym.year}-${String(ym.month).padStart(2, "0")}` },
        };
      }
      const yyyyMm = monthPack.period && monthPack.period.yyyy_mm;
      const casaTon = monthPack.casa_ton;
      const comiTon = monthPack.comisionista_ton;
      const truth = monthPack.truth_semantics || (monthPack.historico ? "ACTUAL_MONTH" : "FORECAST_PROJECTION");
      const casaBlock = {
        channel: "casa",
        period_kind: "calendar_month",
        period: yyyyMm,
        venta_ton: casaTon,
        truth_semantics: truth,
        ols: null,
        limitations: casaTon == null ? ["calendar_month_unavailable"] : [],
        provenance: { source: "dashboard-arr-forecast.computeClientesDescuentoMes", canal: "casa" },
      };
      const comiBlock = {
        channel: "comisionista",
        period_kind: "calendar_month",
        period: yyyyMm,
        venta_ton: comiTon,
        truth_semantics: truth,
        ols: null,
        limitations: comiTon == null ? ["calendar_month_unavailable"] : [],
        provenance: { source: "dashboard-arr-forecast.computeClientesDescuentoMes", canal: "comisionista" },
      };
      const limitations = [
        "calendar_month_not_trailing_30d",
        "ols_not_applicable_to_calendar_month",
      ];
      if (casaTon == null) limitations.push("casa_missing");
      if (comiTon == null) limitations.push("comisionista_missing");
      return {
        ok: true,
        semantic_class: SEMANTIC_CLASS,
        plant,
        range_days: null,
        period_kind: "calendar_month",
        range_start: yyyyMm,
        range_end: yyyyMm,
        channel: slots.channel === "both" || slots.compare ? "both" : slots.channel,
        compare: slots.channel === "both" || slots.compare || Boolean(slots.compare),
        daily_series: null,
        period_total: null,
        ols: null,
        observation_count: null,
        top_movers: [],
        primary: casaBlock,
        channels: { casa: casaBlock, comisionista: comiBlock },
        calendar_month: monthPack,
        limitations,
        provenance: {
          source: "dashboard-arr-forecast.computeClientesDescuentoMes",
          comments_included: false,
          shared_engine: false,
          period_kind: "calendar_month",
        },
        partial: casaTon == null || comiTon == null,
        assembly_status: casaTon == null && comiTon == null ? "empty" : "ok",
        first_mover: null,
        pending_information_gap: {
          missing_fields: limitations.slice(0, 12),
          why_blocks: "Mes calendario de tabla ARR. No hay OLS de mes calendario.",
          physical_source: "dashboard-arr-forecast.computeClientesDescuentoMes",
          physical_person: null,
        },
      };
    }
    const rangeToken = rangeDaysToToken(slots.range_days);
    const plant = {
      planta_id: Number(planta.id) || Number(plantaId),
      planta_nombre: empresa,
      plant_code: planta.clave || null,
    };

    const wantBoth = slots.channel === "both" || slots.compare;
    let casaEngine = null;
    let comiEngine = null;
    let primaryEngine = null;

    if (wantBoth) {
      casaEngine = await loadOneChannel(db, empresa, rangeToken, "casa", opts);
      comiEngine = await loadOneChannel(db, empresa, rangeToken, "comisionista", opts);
      if (casaEngine && casaEngine.ok === false) return casaEngine;
      if (comiEngine && comiEngine.ok === false) return comiEngine;
    } else {
      primaryEngine = await loadOneChannel(db, empresa, rangeToken, slots.channel, opts);
      if (primaryEngine && primaryEngine.ok === false) return primaryEngine;
    }

    let casaBlock = casaEngine ? projectEngineChannel(casaEngine, plant.planta_id, "casa") : null;
    let comiBlock = comiEngine ? projectEngineChannel(comiEngine, plant.planta_id, "comisionista") : null;
    let primaryBlock = primaryEngine
      ? projectEngineChannel(primaryEngine, plant.planta_id, slots.channel)
      : casaBlock;
    if (casaBlock) {
      casaBlock = {
        ...casaBlock,
        top_movers: await enrichMoversWithRegisteredComments(db, plant.planta_id, casaBlock.top_movers, opts),
      };
    }
    if (comiBlock) {
      comiBlock = {
        ...comiBlock,
        top_movers: await enrichMoversWithRegisteredComments(db, plant.planta_id, comiBlock.top_movers, opts),
      };
    }
    if (primaryBlock && primaryBlock !== casaBlock && primaryBlock !== comiBlock) {
      primaryBlock = {
        ...primaryBlock,
        top_movers: await enrichMoversWithRegisteredComments(db, plant.planta_id, primaryBlock.top_movers, opts),
      };
    } else if (wantBoth) {
      primaryBlock = casaBlock;
    }

    const limitations = [];
    if (wantBoth) {
      if ((casaBlock.limitations || []).includes("no_rows")) limitations.push("casa_missing");
      if ((comiBlock.limitations || []).includes("no_rows")) limitations.push("comisionista_missing");
      limitations.push(...(casaBlock.limitations || []).map((x) => `casa:${x}`));
      limitations.push(...(comiBlock.limitations || []).map((x) => `comisionista:${x}`));
    } else {
      limitations.push(...(primaryBlock.limitations || []));
    }

    const assembled = {
      ok: true,
      semantic_class: SEMANTIC_CLASS,
      plant,
      range_days: slots.range_days,
      range_start: primaryBlock && primaryBlock.range_start,
      range_end: primaryBlock && primaryBlock.range_end,
      channel: wantBoth ? "both" : slots.channel,
      compare: wantBoth,
      daily_series: wantBoth ? null : primaryBlock.daily_series,
      period_total: wantBoth ? null : primaryBlock.period_total,
      ols: wantBoth ? null : primaryBlock.ols,
      observation_count: wantBoth ? null : primaryBlock.observation_count,
      top_movers: wantBoth
        ? [
            ...((casaBlock && casaBlock.top_movers) || []),
            ...((comiBlock && comiBlock.top_movers) || []),
          ].sort((a, b) => Math.abs(b.delta_ton) - Math.abs(a.delta_ton))
        : primaryBlock.top_movers,
      primary: primaryBlock,
      channels: { casa: casaBlock, comisionista: comiBlock },
      limitations: [...new Set(limitations)],
      provenance: {
        source: "commercial-trend-engine",
        comments_included: false,
        shared_engine: true,
      },
      partial: limitations.includes("casa_missing") || limitations.includes("comisionista_missing") || limitations.includes("insufficient_observations") || limitations.includes("no_rows"),
      assembly_status: limitations.includes("no_rows") && !wantBoth ? "empty" : "ok",
    };

    assembled.pending_information_gap = deriveCommercialTrendGap(assembled);
    assembled.first_mover = pickFirstMover(assembled);
    return assembled;
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: (e && e.message) || "SOURCE_ERROR",
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    };
  } finally {
    if (client && !released && typeof client.release === "function") {
      client.release();
      released = true;
    }
  }
}

module.exports = {
  SEMANTIC_CLASS,
  COMMERCIAL_TREND_SYSTEM_ADDENDUM,
  MOVER_TIPO_LABEL,
  isCommercialTrendQuestion,
  isCommercialMoversQuestion,
  formatMoverTipoLabel,
  registeredCommentDay,
  formatOneRegisteredComment,
  formatRegisteredComments,
  enrichMoversWithRegisteredComments,
  namesCalendarMonth,
  resolveCommercialTrendSlots,
  wantsFirstMover,
  attachMoverKeys,
  pickFirstMover,
  projectEngineChannel,
  formatCommercialTrendContext,
  buildCommercialTrendPrompt,
  buildCommercialTrendChatResult,
  deriveCommercialTrendGap,
  loadCommercialTrendForChat,
  assertCommercialTrendAccess,
  computeTrendFromPoints,
  round3,
};
