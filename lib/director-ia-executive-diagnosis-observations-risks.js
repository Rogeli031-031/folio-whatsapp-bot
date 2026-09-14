"use strict";

/**
 * DIAGNOSIS slice: OBSERVATION / DEVIATION / RISK / DATA_GAP.
 * Reuses PRE_CLOSE composeExecutiveCycle + deriveRisksAndGaps.
 * No second risk engine. No cause. No hypothesis. No recommendation. No priority.
 * Missing target is a DATA_GAP, not the whole diagnosis.
 */

const { composeExecutiveCycle } = require("./director-ia-executive-cycle-composer");
const {
  resolveSemanticScope,
  loadPlantCatalog,
  buildScopeClarificationResult,
  NEED_TYPES,
} = require("./director-ia-conversational-executive-layer");

const TYPED_RISK_CODES = Object.freeze([
  "FORECAST_BELOW_TARGET",
  "FORECAST_RESULT_NEGATIVE",
  "COMMERCIAL_DETERIORATION",
  "LOST_HIGH_VOLUME_CLIENT",
  "OVERDUE_ACTION",
  "REMAINING_FORECAST_DEPENDENCE",
]);

const TYPED_RISK_CODE_SET = new Set(TYPED_RISK_CODES);

const DATA_GAP_KINDS = Object.freeze([
  "TARGET_MISSING_FOR_PERIOD",
  "FORECAST_MISSING_FOR_PERIOD",
  "SOURCE_UNAVAILABLE",
]);

const MONTHS_ES = Object.freeze([
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]);

const FORBIDDEN_CAUSAL_RE = [
  /\bla causa es\b/i,
  /\besto ocurri[oó] porque\b/i,
  /\bse debe a\b/i,
  /\bel responsable es\b/i,
  /\bla principal causa\b/i,
  /\besta es la causa principal\b/i,
  /\bseguramente se debe\b/i,
  /\brecomiendo\b/i,
  /\blo m[aá]s importante es\b/i,
  /\bdeber[ií]as hacer\b/i,
];

const FORBIDDEN_JUDGMENT_RE = [/\bvamos bien\b/i, /\bvamos mal\b/i];

function containsForbiddenCausalLanguage(text) {
  const s = String(text || "");
  return FORBIDDEN_CAUSAL_RE.some((re) => re.test(s));
}

function containsForbiddenJudgmentLanguage(text) {
  return FORBIDDEN_JUDGMENT_RE.some((re) => re.test(String(text || "")));
}

function formatPeriodLabel(period) {
  const s = String(period || "");
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return s || "periodo abierto";
  const month = Number(m[2]);
  if (month < 1 || month > 12) return s;
  return `${MONTHS_ES[month - 1]} ${m[1]}`;
}

function finiteOrNull(v) {
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

function plantPeriod(plant, pack) {
  const period =
    (plant && plant.current && plant.current.period) ||
    (plant && plant.target && plant.target.period) ||
    (pack && pack.period) ||
    null;
  return period;
}

function projectFindingsFromCyclePack(pack, opts) {
  const findings = [];
  if (!pack || pack.ok === false || !Array.isArray(pack.plants)) return findings;
  const allowedIds =
    opts && Array.isArray(opts.plantIds) && opts.plantIds.length
      ? new Set(opts.plantIds.map((id) => Number(id)))
      : null;
  const allowedPeriod = opts && opts.period ? String(opts.period) : pack.period ? String(pack.period) : null;

  for (const plant of pack.plants) {
    const identity = plant.identity || {};
    const plantId = Number(identity.planta_id);
    if (allowedIds && !allowedIds.has(plantId)) continue;
    const period = plantPeriod(plant, pack);
    if (allowedPeriod && period && String(period) !== String(allowedPeriod)) continue;

    const plantName = identity.planta_nombre || null;
    const current = plant.current || {};
    const target = plant.target || {};
    const actualTon = current.status === "OK" ? finiteOrNull(current.venta_ton) : null;
    const targetTon = target.status === "OK" ? finiteOrNull(target.venta_ton) : null;

    if (actualTon != null) {
      findings.push({
        level: "OBSERVATION",
        kind: "SALES_TO_DATE",
        plant_id: plantId,
        plant_name: plantName,
        period,
        observed: actualTon,
        reference: null,
        unit: "t",
        rule: "ACTUAL_COMMERCIAL.venta_ton to-date del YYYY-MM abierto. No evalúa cumplimiento.",
        evidence: [`current.venta_ton=${actualTon}`],
        source: "arr.ventas_diarias_cliente",
        note: "Hecho de venta acumulada. Sin target no afirma arriba ni abajo de meta.",
      });
    }

    if (actualTon != null && targetTon != null && actualTon < targetTon) {
      findings.push({
        level: "DEVIATION",
        kind: "SALES_BELOW_TARGET",
        plant_id: plantId,
        plant_name: plantName,
        period,
        observed: actualTon,
        reference: targetTon,
        unit: "t",
        rule: "ACTUAL_COMMERCIAL.venta_ton < TARGET_COMMITMENT.venta_ton del mismo YYYY-MM.",
        evidence: [`current.venta_ton=${actualTon}`, `target.venta_ton=${targetTon}`],
        source: "arr.ventas_diarias_cliente / igf_meta.meta_lines",
        note: "Desviación != causa.",
      });
    } else if (actualTon != null && targetTon != null && actualTon >= targetTon) {
      findings.push({
        level: "OBSERVATION",
        kind: "SALES_AT_OR_ABOVE_TARGET",
        plant_id: plantId,
        plant_name: plantName,
        period,
        observed: actualTon,
        reference: targetTon,
        unit: "t",
        rule: "ACTUAL_COMMERCIAL.venta_ton >= TARGET_COMMITMENT.venta_ton del mismo YYYY-MM.",
        evidence: [`current.venta_ton=${actualTon}`, `target.venta_ton=${targetTon}`],
        source: "arr.ventas_diarias_cliente / igf_meta.meta_lines",
      });
    }

    const gapSeen = new Set();
    const addGap = (kind, extra) => {
      if (!kind || !DATA_GAP_KINDS.includes(kind)) return;
      const key =
        kind === "SOURCE_UNAVAILABLE" ? `${kind}:${extra.source || ""}:${plantId}` : `${kind}:${plantId}`;
      if (gapSeen.has(key)) return;
      gapSeen.add(key);
      findings.push({
        level: "DATA_GAP",
        kind,
        plant_id: plantId,
        plant_name: plantName,
        period,
        observed: null,
        reference: null,
        rule: extra.rule,
        evidence: extra.evidence || [`${kind}`],
        source: extra.source || null,
        note: "Hueco de información. No es riesgo tipado ni causa.",
      });
    };

    if (target.status === "TARGET_MISSING_FOR_PERIOD") {
      addGap("TARGET_MISSING_FOR_PERIOD", {
        rule: "No hay TARGET_COMMITMENT (igf_meta) para este YYYY-MM. Sin carry-forward.",
        evidence: [`target.status=TARGET_MISSING_FOR_PERIOD`],
        source: "igf_meta.meta_lines",
      });
    }
    if (plant.base_forecast && plant.base_forecast.status === "FORECAST_MISSING_FOR_PERIOD") {
      addGap("FORECAST_MISSING_FOR_PERIOD", {
        rule: "No hay FORECAST IGF para este YYYY-MM.",
        evidence: [`forecast.status=FORECAST_MISSING_FOR_PERIOD`],
        source: "igf.compromiso_lines",
      });
    }
    if (current.status === "SOURCE_UNAVAILABLE") {
      addGap("SOURCE_UNAVAILABLE", {
        rule: "ACTUAL_COMMERCIAL to-date no pudo establecerse.",
        evidence: [`current.status=SOURCE_UNAVAILABLE`],
        source: "arr.ventas_diarias_cliente",
      });
    }
    if (plant.actions && plant.actions.status === "SOURCE_UNAVAILABLE") {
      addGap("SOURCE_UNAVAILABLE", {
        rule: "Action Register no pudo establecerse.",
        evidence: [`actions.status=SOURCE_UNAVAILABLE`],
        source: "arr.action_register_items",
      });
    }
    for (const gap of plant.gaps || []) {
      if (!gap || !DATA_GAP_KINDS.includes(gap.kind)) continue;
      addGap(gap.kind, {
        rule: gap.statement || gap.kind,
        evidence: Array.isArray(gap.evidence_refs) ? gap.evidence_refs : [`gap.kind=${gap.kind}`],
        source: gap.source || gap.kind,
      });
    }

    for (const lost of current.lost_clients || []) {
      findings.push({
        level: "OBSERVATION",
        kind: "LOST_CLIENT",
        plant_id: plantId,
        plant_name: plantName,
        period,
        observed: 0,
        reference: lost.kg_prior,
        unit: "kg",
        client: lost.cliente_norm || null,
        rule: "Cliente con kg del mes previo > 0 y kg to-date = 0.",
        evidence: [`lost.cliente=${lost.cliente_norm} kg_prior=${lost.kg_prior}`],
        source: "arr.ventas_diarias_cliente",
        note: "Hecho de movimiento. No afirma por qué dejó de comprar.",
      });
    }

    for (const created of current.new_clients || []) {
      findings.push({
        level: "OBSERVATION",
        kind: "NEW_CLIENT",
        plant_id: plantId,
        plant_name: plantName,
        period,
        observed: created.kg_current,
        reference: 0,
        unit: "kg",
        client: created.cliente_norm || null,
        rule: "Cliente con kg to-date > 0 y kg del mes previo = 0.",
        evidence: [`new.cliente=${created.cliente_norm} kg_current=${created.kg_current}`],
        source: "arr.ventas_diarias_cliente",
        note: "Hecho de movimiento. No afirma que la planta vaya bien.",
      });
    }

    for (const mover of current.top_negative_movers || []) {
      findings.push({
        level: "DEVIATION",
        kind: "CLIENT_KG_VS_PRIOR",
        plant_id: plantId,
        plant_name: plantName,
        period,
        observed: mover.delta_kg,
        reference: "kg mes previo comparable",
        unit: "kg",
        client: mover.cliente_norm || null,
        rule: "delta_kg vs mes calendario previo (to-date vs mes completo). Contribución != causa.",
        evidence: [`mover.cliente=${mover.cliente_norm} delta_kg=${mover.delta_kg}`],
        source: "arr.ventas_diarias_cliente",
        note: "Desviación cuantificada. No es causa ni riesgo nuevo.",
      });
    }

    for (const mover of current.top_positive_movers || []) {
      findings.push({
        level: "OBSERVATION",
        kind: "CLIENT_KG_VS_PRIOR_UP",
        plant_id: plantId,
        plant_name: plantName,
        period,
        observed: mover.delta_kg,
        reference: "kg mes previo comparable",
        unit: "kg",
        client: mover.cliente_norm || null,
        rule: "delta_kg > 0 vs mes calendario previo. Hecho. No afirma que la planta vaya bien.",
        evidence: [`mover.cliente=${mover.cliente_norm} delta_kg=${mover.delta_kg}`],
        source: "arr.ventas_diarias_cliente",
        note: "Hecho de movimiento. No es cumplimiento ni riesgo.",
      });
    }

    const actions = plant.actions || {};
    const overdue = actions.status === "OK" ? Number(actions.overdue) || 0 : 0;
    if (overdue > 0) {
      const top = (actions.top_overdue || [])[0] || null;
      findings.push({
        level: "OBSERVATION",
        kind: "OVERDUE_ACTION_COUNT",
        plant_id: plantId,
        plant_name: plantName,
        period,
        observed: overdue,
        reference: null,
        rule: "Action Register.overdue > 0.",
        evidence: [`actions.overdue=${overdue}`],
        source: "arr.action_register_items",
        action_title: top && top.titulo ? top.titulo : null,
        action_owner_record: top && top.responsable ? top.responsable : null,
        days_overdue: top && top.dias_vencido != null ? top.dias_vencido : null,
        note: "Hecho de registro. Acción != causa de venta.",
      });
    }

    for (const risk of plant.risks || []) {
      if (!risk || !TYPED_RISK_CODE_SET.has(risk.risk_code)) continue;
      findings.push({
        level: "RISK",
        kind: risk.risk_code,
        risk_code: risk.risk_code,
        plant_id: risk.plant_id != null ? Number(risk.plant_id) : plantId,
        plant_name: risk.plant_name || plantName,
        period,
        observed: null,
        reference: null,
        rule: risk.condition || risk.risk_code,
        evidence: Array.isArray(risk.evidence_refs) ? risk.evidence_refs.slice() : [],
        source: "PRE_CLOSE deriveRisksAndGaps",
        note: "Regla de riesgo existente. No afirma causa.",
      });
    }
  }

  return findings;
}

function formatFindingLine(f) {
  const plant = f.plant_name || `planta ${f.plant_id}`;
  const periodLabel = formatPeriodLabel(f.period);
  const trace = f.kind ? ` [${f.kind}]` : "";
  if (f.kind === "SALES_TO_DATE") {
    return `- Venta acumulada del periodo: ${f.observed} ${f.unit}. ${plant}, ${periodLabel}. Fuente ARR (to-date). No evalúa cumplimiento.${trace}`;
  }
  if (f.kind === "LOST_CLIENT") {
    return `- Cliente ${f.client}: 0 kg to-date; ${f.reference} kg el mes previo. ${plant}, ${periodLabel}. Hecho de movimiento. No afirma por qué dejó de comprar.${trace}`;
  }
  if (f.kind === "NEW_CLIENT") {
    return `- Cliente ${f.client}: ${f.observed} kg to-date; no tenía kg el mes previo. ${plant}, ${periodLabel}. Hecho de movimiento. No afirma que la planta vaya bien.${trace}`;
  }
  if (f.kind === "CLIENT_KG_VS_PRIOR") {
    return `- Cliente ${f.client}: ${f.observed} kg vs el mes calendario previo (to-date vs mes completo). ${plant}, ${periodLabel}. Contribución != causa.${trace}`;
  }
  if (f.kind === "CLIENT_KG_VS_PRIOR_UP") {
    return `- Cliente ${f.client}: ${f.observed} kg vs el mes calendario previo (to-date vs mes completo). ${plant}, ${periodLabel}. Hecho de movimiento. No afirma que la planta vaya bien.${trace}`;
  }
  if (f.kind === "OVERDUE_ACTION_COUNT") {
    const action = f.action_title ? ` Acción registrada: ${f.action_title}.` : "";
    const days = f.days_overdue != null ? ` Días vencida: ${f.days_overdue}.` : "";
    return `- Acciones vencidas en Action Register: ${f.observed}.${action}${days} ${plant}. Hecho de registro. Acción != causa de venta.${trace}`;
  }
  if (f.kind === "SALES_BELOW_TARGET") {
    return `- Venta to-date ${f.observed} ${f.unit} vs meta ${f.reference} ${f.unit}. ${plant}, ${periodLabel}. Desviación vs igf_meta. No es causa.${trace}`;
  }
  if (f.kind === "SALES_AT_OR_ABOVE_TARGET") {
    return `- Venta to-date ${f.observed} ${f.unit} frente a meta ${f.reference} ${f.unit}. ${plant}, ${periodLabel}. Comparación física. No afirma que la planta vaya bien.${trace}`;
  }
  if (f.level === "RISK") {
    const refs = Array.isArray(f.evidence) && f.evidence.length ? ` Evidencia: ${f.evidence.join("; ")}.` : "";
    const rule = String(f.rule || "regla PRE_CLOSE existente").replace(/\.\s*$/, "");
    return `- ${f.risk_code || f.kind}: ${rule}.${refs} ${plant}, ${periodLabel}. Regla ya tipada. No afirma causa.${trace}`;
  }
  if (f.kind === "TARGET_MISSING_FOR_PERIOD") {
    return `- No hay meta física (igf_meta) cargada para ${periodLabel}. ${plant}. Hueco de información; no es el diagnóstico completo.${trace}`;
  }
  if (f.kind === "FORECAST_MISSING_FOR_PERIOD") {
    return `- No hay forecast IGF cargado para ${periodLabel}. ${plant}. Hueco de información.${trace}`;
  }
  if (f.kind === "SOURCE_UNAVAILABLE") {
    return `- Fuente no disponible: ${f.source || "sin identificar"}. ${plant}, ${periodLabel}. Hueco de información.${trace}`;
  }
  const bits = [`${plant}`, periodLabel];
  if (f.client) bits.push(`cliente ${f.client}`);
  if (f.observed != null) bits.push(`${f.observed}${f.unit ? ` ${f.unit}` : ""}`);
  if (f.note) bits.push(f.note);
  return `- ${bits.join(" · ")}${trace}`;
}

function formatDiagnosisAnswer(findings, pack, opts) {
  const period = (pack && pack.period) || (opts && opts.period) || null;
  const plants = (pack && pack.plants) || [];
  const plantName =
    plants.length === 1
      ? (plants[0].identity && plants[0].identity.planta_nombre) || `planta ${plants[0].identity && plants[0].identity.planta_id}`
      : plants.map((p) => p.identity && p.identity.planta_nombre).filter(Boolean).join(", ") || null;

  const observations = (findings || []).filter((f) => f.level === "OBSERVATION");
  const deviations = (findings || []).filter((f) => f.level === "DEVIATION");
  const risks = (findings || []).filter((f) => f.level === "RISK");
  const gaps = (findings || []).filter((f) => f.level === "DATA_GAP");

  const lines = [];
  if (plantName && period) {
    lines.push(`Diagnóstico ejecutivo — ${plantName} — ${formatPeriodLabel(period)}`);
  } else {
    lines.push("Diagnóstico ejecutivo — observaciones, desviaciones, riesgos y huecos soportados.");
    if (plantName) lines.push(`Planta: ${plantName}`);
    if (period) lines.push(`Periodo: ${formatPeriodLabel(period)}`);
  }
  lines.push("No afirma causa. Correlación != causalidad. Detectar un hallazgo != saber por qué ocurrió.");
  if (opts && opts.principal_problem_asked) {
    lines.push(
      "No hay regla de materialidad autorizada para elegir un único problema principal. Se listan hallazgos agrupados, sin ranking."
    );
  }

  if (!observations.length && !deviations.length && !risks.length && !gaps.length) {
    lines.push("");
    lines.push("No hay observaciones, desviaciones ni riesgos tipados en el periodo abierto para esta planta.");
  } else {
    if (observations.length) {
      lines.push("");
      lines.push("Observaciones");
      observations.forEach((f) => lines.push(formatFindingLine(f)));
    }
    if (deviations.length) {
      lines.push("");
      lines.push("Desviaciones");
      deviations.forEach((f) => lines.push(formatFindingLine(f)));
    }
    lines.push("");
    lines.push("Riesgos");
    if (risks.length) risks.forEach((f) => lines.push(formatFindingLine(f)));
    else lines.push("- No detecto riesgos tipados en este contexto.");
    if (gaps.length) {
      lines.push("");
      lines.push("Huecos de información");
      gaps.forEach((f) => lines.push(formatFindingLine(f)));
    }
  }

  const text = lines.join("\n");
  if (containsForbiddenCausalLanguage(text) || containsForbiddenJudgmentLanguage(text)) {
    return "Hallazgos disponibles, pero el texto no puede emitirse con lenguaje causal o de juicio. Reconsultar evidencias físicas.";
  }
  return text;
}

async function loadExecutiveDiagnosisForChat(pool, plantaId, req, opts = {}) {
  const composeFn = opts.composeExecutiveCycle || composeExecutiveCycle;
  const pack = await composeFn(pool, plantaId, req, {
    question: opts.question,
    ...(opts.composeOpts || {}),
  });
  if (!pack || pack.ok === false || pack.abort) return pack;
  const plantIds = (pack.plants || []).map((p) => p.identity && p.identity.planta_id).filter((id) => id != null);
  const findings = projectFindingsFromCyclePack(pack, {
    plantIds,
    period: pack.period,
  });
  return { ok: true, pack, findings, period: pack.period };
}

function buildExecutiveDiagnosisChatResult(loaded, opts) {
  const pack = loaded && loaded.pack;
  const findings = (loaded && loaded.findings) || [];
  const planta_id =
    opts.planta_id != null
      ? Number(opts.planta_id)
      : pack && pack.requested_plant_id != null
        ? Number(pack.requested_plant_id)
        : null;
  const answer =
    opts.answer ||
    formatDiagnosisAnswer(findings, pack, {
      principal_problem_asked: Boolean(opts.principal_problem_asked),
    });
  return {
    ok: true,
    answer,
    sources: [
      "arr.ventas_diarias_cliente",
      "igf_meta.meta_lines",
      "igf.compromiso_lines",
      "arr.action_register_items",
    ],
    context_meta: {
      mode: "executive_diagnosis",
      requested_domain: "executive_diagnosis",
      semantic_need: NEED_TYPES.DIAGNOSIS_OBSERVATION_RISK,
      openai_called: false,
      openai_call_count: 0,
      planta_id,
      period: pack && pack.period,
      timestamp: new Date().toISOString(),
      ies_runtime: false,
      reasoning_engine: false,
      cause_claimed: false,
      hypothesis_claimed: false,
      recommendation_claimed: false,
      priority_claimed: false,
      finding_counts: {
        observation: findings.filter((f) => f.level === "OBSERVATION").length,
        deviation: findings.filter((f) => f.level === "DEVIATION").length,
        risk: findings.filter((f) => f.level === "RISK").length,
        data_gap: findings.filter((f) => f.level === "DATA_GAP").length,
      },
    },
    executive_diagnosis: {
      need_type: NEED_TYPES.DIAGNOSIS_OBSERVATION_RISK,
      levels: ["OBSERVATION", "DEVIATION", "RISK", "DATA_GAP"],
      findings,
      period: pack && pack.period,
      authorized_plant_ids: pack && pack.authorized_plant_ids,
    },
  };
}

async function handleExecutiveDiagnosisForChat(opts) {
  const { req, uiPlantaId, question } = opts;
  const auth = (req && req.dashboardAuth) || {};
  const catalog = await loadPlantCatalog(opts.pool, opts.plantCatalog);
  const plantLabel =
    (req && req.body && req.body.planta_nombre) ||
    (catalog.find((p) => Number(p.planta_id) === Number(uiPlantaId)) || {}).nombre ||
    null;
  const scope = resolveSemanticScope(question, {
    ui_planta_id: uiPlantaId,
    ui_plant_label: plantLabel,
    plant_catalog: catalog,
    auth,
    ui_plant_anchor: req && req.body && req.body.ui_plant_anchor,
  });
  if (scope.action === "ASK_CLARIFICATION") {
    return buildScopeClarificationResult({
      clarification: scope.clarification,
      planta_id: uiPlantaId,
      scope_source: scope.scope_source,
    });
  }
  if (scope.action === "NOT_AUTHORIZED") {
    return {
      ok: false,
      status: scope.status || 403,
      code: scope.code || "SOURCE_RESTRICTED",
      error: scope.error || "Sin acceso a esta planta",
    };
  }

  const targetPlantId = scope.planta_id;
  let loaded;
  try {
    loaded = await loadExecutiveDiagnosisForChat(opts.pool, targetPlantId, req, {
      question,
      composeExecutiveCycle: opts.composeExecutiveCycle,
      composeOpts: opts.composeOpts,
    });
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: (e && e.message) || "No se pudo ensamblar diagnóstico ejecutivo",
    };
  }
  if (loaded && loaded.abort) {
    return {
      ok: false,
      status: loaded.status || 403,
      code: loaded.code || "SOURCE_RESTRICTED",
      error: loaded.error || "Sin acceso a esta planta",
    };
  }
  if (!loaded || loaded.ok === false) {
    return {
      ok: false,
      status: (loaded && loaded.status) || 500,
      error: (loaded && loaded.error) || "No se pudo ensamblar diagnóstico ejecutivo",
    };
  }
  return buildExecutiveDiagnosisChatResult(loaded, {
    planta_id: targetPlantId,
    principal_problem_asked: /\bprincipal problema\b/.test(
      String(question || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    ),
  });
}

module.exports = {
  TYPED_RISK_CODES,
  DATA_GAP_KINDS,
  containsForbiddenCausalLanguage,
  containsForbiddenJudgmentLanguage,
  projectFindingsFromCyclePack,
  formatDiagnosisAnswer,
  loadExecutiveDiagnosisForChat,
  buildExecutiveDiagnosisChatResult,
  handleExecutiveDiagnosisForChat,
};
