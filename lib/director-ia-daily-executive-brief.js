"use strict";

/**
 * Chat legado: brief ejecutivo diario (first slice B).
 * Compone venta diaria + descuento/kg diario. No phrasebook. No causalidad.
 * No ingreso diario. No IES. No Reasoning Engine. No M9 mensual.
 */

const {
  BUSINESS_TZ,
  yesterdayYmd,
  businessTodayYmd,
  ymdFromValue,
  loadDailySalesDeviationForChat,
  formatDailySalesDeviationContext,
} = require("./director-ia-daily-deviation");
const {
  loadDailyDiscountDeviationForChat,
  formatDailyDiscountDeviationContext,
} = require("./director-ia-daily-discount");

const SEMANTIC_CLASS = "daily_executive_brief";

const DAILY_EXECUTIVE_BRIEF_SYSTEM_ADDENDUM = [
  "EVIDENCIA DE BRIEF EJECUTIVO DIARIO (chat legado; first slice B: venta diaria + descuento/kg diario).",
  "No es IES. No es Reasoning Engine N5. No es ingreso diario. No es M9 mensual.",
  "El runtime ya resolvió planta, fecha, valores, referencias, deltas, contribuidores, evidencia, huecos y provenance.",
  "Hay bloques separados de venta y de descuento/kg. Cada uno conserva su provenance, limitations y gaps.",
  "Tú decides qué destaca, si hay tensión entre las métricas, qué conviene revisar y qué sigue sin explicación.",
  "No clasifiques el día como buen día o mal día. No uses umbrales arbitrarios. No fabriques una anomalía si ambas métricas están cerca de su referencia.",
  "No atribuyas causalidad entre las dos métricas. Coincidencia de movimientos no es causa.",
  "Un comentario o una acción almacenada es declaración, no prueba causal.",
  "Si una métrica no pudo establecerse, responde con la otra y declara la limitación. Si ambas faltan, no inventes valores ni un resumen numérico.",
  "0 filas no es 0. Hoy no es un día cerrado. missing no es zero.",
  "El bloque de venta puede advertir que descuento/kg no vive en ese slice; el brief sí trae descuento/kg en su propio bloque. Usa ese bloque.",
].join(" ");

function normalizeBriefQuestion(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function namesSalesMetric(q) {
  return /\bventas?\b/.test(q) || /\bvendimos\b/.test(q) || /\bvendio\b/.test(q) || /\bvendi\b/.test(q);
}

function namesDiscountMetric(q) {
  return /\bdescuentos?\b/.test(q);
}

/**
 * Señal semántica de overview diario sin métrica nombrada.
 * Tokens, no phrasebook. No copiar frases de producto aquí.
 */
function isDailyExecutiveBriefQuestion(raw) {
  const q = normalizeBriefQuestion(raw);
  if (!q) return false;
  if (namesSalesMetric(q) || namesDiscountMetric(q)) return false;
  if (/\b(mes|mensual|semana|semanal)\b/.test(q)) return false;
  if (/\b(igf|folio|folios|accion|acciones|cheque|cheques|bitacora)\b/.test(q)) return false;
  if (/\bque paso con\b/.test(q)) return false;
  if (/\bclientes?\b/.test(q)) return false;

  const hasClosedOrNamedDay =
    /\bayer\b/.test(q) ||
    /\bhoy\b/.test(q) ||
    (/\bdia\b/.test(q) && !/\b(mes|mensual)\b/.test(q));
  if (!hasClosedOrNamedDay) return false;

  return (
    /\bcomo\b/.test(q) ||
    /\bque tal\b/.test(q) ||
    /\bque paso\b/.test(q) ||
    /\bresumen\b/.test(q) ||
    /\bimportante\b/.test(q) ||
    /\bdeb/.test(q) ||
    /\bcerramos\b/.test(q) ||
    /\bcuentame\b/.test(q) ||
    /\bdime\b/.test(q) ||
    /\bhay algo\b/.test(q) ||
    /\bestuv/.test(q) ||
    /\bfue\b/.test(q) ||
    /\bsalio\b/.test(q) ||
    /\btuvimos\b/.test(q)
  );
}

function emptyPlant(plantaId) {
  return { planta_id: Number(plantaId) || null, planta_nombre: null, plant_code: null };
}

function prefixItems(list, prefix) {
  return (Array.isArray(list) ? list : []).filter(Boolean).map((item) => `${prefix}:${item}`);
}

function inspectMetricResult(result) {
  if (!result) {
    return {
      available: false,
      missing: true,
      abort: false,
      assembled: null,
      error: "no_result",
      status: 500,
      limitations: ["metric_missing"],
      provenance: null,
      information_gaps: [],
    };
  }
  if (result.abort) {
    return {
      available: false,
      missing: true,
      abort: true,
      assembled: null,
      error: result.error || "SOURCE_RESTRICTED",
      status: result.status || 403,
      code: result.code || "SOURCE_RESTRICTED",
      limitations: [result.code || "SOURCE_RESTRICTED"],
      provenance: null,
      information_gaps: [],
    };
  }
  if (result.ok === false) {
    return {
      available: false,
      missing: true,
      abort: false,
      assembled: null,
      error: result.error || "load_failed",
      status: result.status || 500,
      code: result.code || null,
      limitations: [result.error || "load_failed"],
      provenance: null,
      information_gaps: [],
    };
  }
  return {
    available: true,
    missing: false,
    abort: false,
    assembled: result,
    error: null,
    status: 200,
    limitations: Array.isArray(result.limitations) ? result.limitations : [],
    provenance: result.provenance || null,
    information_gaps: Array.isArray(result.information_gaps) ? result.information_gaps : [],
  };
}

async function safeLoad(fn, pool, plantaId, req, opts) {
  try {
    return await fn(pool, plantaId, req, opts);
  } catch (e) {
    return {
      ok: false,
      abort: false,
      status: 500,
      error: (e && e.message) || "TOOL_ERROR",
    };
  }
}

function deriveBriefPendingInformationGap(pack) {
  const missing = [];
  if (pack && pack.sales && pack.sales.missing) missing.push("sales:metric_missing");
  if (pack && pack.discount && pack.discount.missing) missing.push("discount:metric_missing");
  missing.push(...prefixItems(pack && pack.sales && pack.sales.limitations, "sales"));
  missing.push(...prefixItems(pack && pack.discount && pack.discount.limitations, "discount"));
  missing.push(...prefixItems(pack && pack.brief_limitations, "brief"));

  const salesGaps = (pack && pack.information_gaps && pack.information_gaps.sales) || [];
  const discountGaps = (pack && pack.information_gaps && pack.information_gaps.discount) || [];
  if (salesGaps.some((g) => g && g.explanation_gap)) {
    missing.push("sales:evidencia_que_explique_contribuidores_materiales");
  }
  if (discountGaps.some((g) => g && g.explanation_gap)) {
    missing.push("discount:evidencia_que_explique_contribuidores_materiales");
  }

  let why_blocks =
    "Sin un hecho adicional observado no se atribuye causa ni se cierra la lectura del día.";
  if (pack && pack.sales && pack.sales.available && pack.discount && pack.discount.missing) {
    why_blocks = "La venta se estableció; el descuento/kg no pudo establecerse. missing no es zero.";
  } else if (pack && pack.discount && pack.discount.available && pack.sales && pack.sales.missing) {
    why_blocks = "El descuento/kg se estableció; la venta no pudo establecerse. missing no es zero.";
  } else if (pack && pack.sales && pack.sales.missing && pack.discount && pack.discount.missing) {
    why_blocks = "Ni venta ni descuento/kg pudieron establecerse. No se inventa un resumen numérico.";
  }

  return {
    missing_fields: [...new Set(missing)].slice(0, 16),
    why_blocks,
    physical_source: null,
    physical_person: null,
  };
}

function formatDailyExecutiveBriefContext(assembled) {
  const plant = (assembled && assembled.plant) || emptyPlant(null);
  const sales = (assembled && assembled.sales) || {};
  const discount = (assembled && assembled.discount) || {};
  const lines = [
    `BRIEF EJECUTIVO DIARIO | source_class=${SEMANTIC_CLASS} | tz=${(assembled && assembled.timezone) || BUSINESS_TZ}`,
    `target_date=${assembled && assembled.target_date} (ayer calendario completo; hoy=${assembled && assembled.today_ymd} no se usa como día cerrado)`,
    `planta=${plant.planta_nombre || "—"} id=${plant.planta_id != null ? plant.planta_id : "—"}`,
    `partial=${Boolean(assembled && assembled.partial)} assembly_status=${assembled && assembled.assembly_status}`,
    `sales.available=${Boolean(sales.available)} discount.available=${Boolean(discount.available)}`,
    "Los bloques conservan provenance y gaps separados. No mezclar causalidad.",
    "Día sin filas != 0. missing != zero.",
    "",
    "=== BLOQUE VENTA ===",
  ];
  if (sales.available && sales.assembled) {
    lines.push(formatDailySalesDeviationContext(sales.assembled));
  } else {
    lines.push(
      `venta no establecida | missing=true | error=${sales.error || "—"} | limitations=${
        (sales.limitations || []).join(" | ") || "—"
      }`
    );
    lines.push("No trates la ausencia de venta como 0 kg.");
  }
  lines.push("");
  lines.push("=== BLOQUE DESCUENTO/KG ===");
  if (discount.available && discount.assembled) {
    lines.push(formatDailyDiscountDeviationContext(discount.assembled));
  } else {
    lines.push(
      `descuento/kg no establecido | missing=true | error=${discount.error || "—"} | limitations=${
        (discount.limitations || []).join(" | ") || "—"
      }`
    );
    lines.push("No trates la ausencia de descuento/kg como ratio 0.");
  }
  lines.push("");
  lines.push("=== PROVENANCE SEPARADO ===");
  lines.push(
    `sales_provenance=${
      sales.provenance ? JSON.stringify(sales.provenance) : "no_disponible"
    }`
  );
  lines.push(
    `discount_provenance=${
      discount.provenance ? JSON.stringify(discount.provenance) : "no_disponible"
    }`
  );
  lines.push("");
  lines.push("=== LIMITATIONS / GAPS SEPARADOS ===");
  lines.push(`sales_limitations: ${(sales.limitations || []).join(" | ") || "—"}`);
  lines.push(`discount_limitations: ${(discount.limitations || []).join(" | ") || "—"}`);
  const salesGaps = (assembled && assembled.information_gaps && assembled.information_gaps.sales) || [];
  const discountGaps =
    (assembled && assembled.information_gaps && assembled.information_gaps.discount) || [];
  if (!salesGaps.length) lines.push("sales_gaps: (sin gaps de venta o venta no disponible)");
  for (const g of salesGaps) {
    lines.push(
      `- sales ${g.cliente_norm || "—"} gap=${g.explanation_gap} comment=${g.has_related_comment} action=${g.has_related_action}`
    );
  }
  if (!discountGaps.length) lines.push("discount_gaps: (sin gaps de descuento o descuento no disponible)");
  for (const g of discountGaps) {
    lines.push(
      `- discount ${g.cliente_norm || "—"} gap=${g.explanation_gap} comment=${g.has_related_comment} action=${g.has_related_action}`
    );
  }
  return lines.join("\n");
}

function buildDailyExecutiveBriefPrompt(assembled, question) {
  const systemPrompt = `${DAILY_EXECUTIVE_BRIEF_SYSTEM_ADDENDUM} Responde en español. Una sola respuesta.`;
  const userContent = [
    `Pregunta del usuario: ${String(question || "").trim()}`,
    "",
    formatDailyExecutiveBriefContext(assembled),
  ].join("\n");
  return { systemPrompt, userContent };
}

function buildDailyExecutiveBriefChatResult(assembled, opts = {}) {
  const planta_id =
    opts.planta_id != null ? Number(opts.planta_id) : assembled.plant && assembled.plant.planta_id;
  const openaiCalled = opts.openai_called !== false;
  return {
    ok: true,
    answer: opts.answer || "",
    sources: ["arr.ventas_diarias_cliente", "arr.descuentos_diarios_cliente"],
    context_meta: {
      mode: SEMANTIC_CLASS,
      requested_domain: SEMANTIC_CLASS,
      openai_called: openaiCalled,
      openai_call_count: openaiCalled ? 1 : 0,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      assembly_status: assembled.assembly_status,
      limitations: {
        sales: (assembled.sales && assembled.sales.limitations) || [],
        discount: (assembled.discount && assembled.discount.limitations) || [],
        brief: assembled.brief_limitations || [],
      },
      prompt_mode: SEMANTIC_CLASS,
      focus_type: SEMANTIC_CLASS,
      ies_runtime: false,
      reasoning_engine: false,
      m9_included: false,
      daily_income_implemented: false,
      partial: Boolean(assembled.partial),
    },
    daily_executive_brief: {
      semantic_class: SEMANTIC_CLASS,
      plant: assembled.plant,
      target_date: assembled.target_date,
      sales: assembled.sales,
      discount: assembled.discount,
      provenance: assembled.provenance,
      information_gaps: assembled.information_gaps,
      limitations: {
        sales: (assembled.sales && assembled.sales.limitations) || [],
        discount: (assembled.discount && assembled.discount.limitations) || [],
        brief: assembled.brief_limitations || [],
      },
      partial: Boolean(assembled.partial),
      assembly_status: assembled.assembly_status,
    },
  };
}

async function loadDailyExecutiveBriefForChat(pool, plantaId, req, opts = {}) {
  const todayYmd = ymdFromValue(opts.todayYmd) || businessTodayYmd(opts.now);
  let targetDate = ymdFromValue(opts.targetDate) || yesterdayYmd(todayYmd);
  const requestedToday = ymdFromValue(opts.targetDate) === todayYmd;
  if (targetDate === todayYmd) targetDate = yesterdayYmd(todayYmd);

  const sharedOpts = {
    question: opts.question,
    targetDate,
    todayYmd,
    now: opts.now,
    auth: opts.auth,
  };

  const loadSales = opts.loadSales || loadDailySalesDeviationForChat;
  const loadDiscount = opts.loadDiscount || loadDailyDiscountDeviationForChat;

  const salesRaw = await safeLoad(loadSales, pool, plantaId, req, {
    ...sharedOpts,
    resolvePlanta: opts.resolvePlanta || opts.resolveSalesPlanta,
    querySalesRows: opts.querySalesRows,
    queryComments: opts.querySalesComments || opts.queryComments,
    queryActions: opts.querySalesActions || opts.queryActions,
  });
  const discountRaw = await safeLoad(loadDiscount, pool, plantaId, req, {
    ...sharedOpts,
    resolvePlanta: opts.resolveDiscountPlanta || opts.resolvePlanta,
    queryDiscountRows: opts.queryDiscountRows,
    queryKgRows: opts.queryKgRows,
    queryComments: opts.queryDiscountComments || opts.queryComments,
    queryActions: opts.queryDiscountActions || opts.queryActions,
  });

  const sales = inspectMetricResult(salesRaw);
  const discount = inspectMetricResult(discountRaw);

  if (sales.abort && discount.abort) {
    return {
      ok: false,
      abort: true,
      status: sales.status || discount.status || 403,
      code: sales.code || discount.code || "SOURCE_RESTRICTED",
      error: sales.error || discount.error || "Sin acceso a brief diario",
    };
  }

  const plant =
    (sales.available && sales.assembled && sales.assembled.plant) ||
    (discount.available && discount.assembled && discount.assembled.plant) ||
    emptyPlant(plantaId);

  const brief_limitations = [];
  if (requestedToday || ymdFromValue(opts.targetDate) === todayYmd) {
    brief_limitations.push("hoy_no_es_dia_completo: se usa ayer calendario, no hoy");
  }
  if (sales.missing) brief_limitations.push("sales_unavailable");
  if (discount.missing) brief_limitations.push("discount_unavailable");
  if (sales.missing && discount.missing) {
    brief_limitations.push("both_metrics_unavailable: no inventar resumen");
  }

  let assembly_status = "complete";
  if (sales.available && discount.available) assembly_status = "complete";
  else if (sales.available || discount.available) assembly_status = "partial";
  else assembly_status = "unavailable";

  const pack = {
    ok: true,
    abort: false,
    semantic_class: SEMANTIC_CLASS,
    plant,
    timezone: BUSINESS_TZ,
    target_date: targetDate,
    today_ymd: todayYmd,
    sales,
    discount,
    partial: Boolean(sales.missing || discount.missing),
    assembly_status,
    brief_limitations,
    provenance: {
      sales: sales.provenance,
      discount: discount.provenance,
    },
    information_gaps: {
      sales: sales.information_gaps,
      discount: discount.information_gaps,
    },
    customer_contributors: [
      ...((sales.available && sales.assembled && sales.assembled.customer_contributors) || []),
      ...((discount.available && discount.assembled && discount.assembled.customer_contributors) || []),
    ],
    limitations: [
      ...prefixItems(sales.limitations, "sales"),
      ...prefixItems(discount.limitations, "discount"),
      ...brief_limitations,
    ],
  };
  pack.pending_information_gap = deriveBriefPendingInformationGap(pack);
  return pack;
}

module.exports = {
  SEMANTIC_CLASS,
  BUSINESS_TZ,
  DAILY_EXECUTIVE_BRIEF_SYSTEM_ADDENDUM,
  isDailyExecutiveBriefQuestion,
  loadDailyExecutiveBriefForChat,
  formatDailyExecutiveBriefContext,
  buildDailyExecutiveBriefPrompt,
  buildDailyExecutiveBriefChatResult,
  deriveBriefPendingInformationGap,
};
