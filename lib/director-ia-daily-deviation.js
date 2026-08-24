"use strict";

/**
 * Chat legado: desviación diaria de venta (first slice C).
 * No IES. No Reasoning Engine. No descuento/kg. No HTTP. No writes.
 * Referencia: promedio same-weekday, ventana 14 días cerrados (regla forecast ARR).
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const {
  buildClienteKey,
  getCanonicalPlantaId,
  getPlantaIdsEquivalentes,
} = require("./dicf-acciones");

const SEMANTIC_CLASS = "daily_sales_deviation";
const SALES_SOURCE = "arr.ventas_diarias_cliente";
const DICF_SOURCE = "arr.dicf_acciones";
const COMMENTS_SOURCE = "arr.cliente_comentarios";
const BUSINESS_TZ = "America/Mexico_City";
const REFERENCE_WINDOW_DAYS = 14;
const REFERENCE_TYPE = "same_weekday_recent_average";
const TOP_N = 8;
const RECONCILE_TOLERANCE_KG = 0.05;
const MATERIAL_SHARE = 0.1;
const DICF_GRUPO_LABELS = Object.freeze([
  "Dejaron de comprar",
  "Disminuyeron",
  "Aumentaron",
  "Nuevo",
]);

/** Readiness only — this IMPL does not compute daily discount/kg. */
const DAILY_DISCOUNT_READINESS = Object.freeze({
  implemented: false,
  formula: "SUM(monto) / SUM(kg)",
  average_of_averages: false,
  channel_available: false,
});

const SQL_PROV_MAP = `
       SELECT DISTINCT
              p.nombre AS prov_name,
              UPPER(TRIM(p.nombre)) AS key_nombre,
              UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
         FROM public.plantas p
         JOIN arr.provincia_plants ap
           ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
           OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
        WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
          AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
`;

const WEEKDAY_ES = Object.freeze({
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
  7: "domingo",
});

const DAILY_SALES_DEVIATION_SYSTEM_ADDENDUM = [
  "EVIDENCIA DE DESVIACIÓN DIARIA DE VENTA (chat legado; no es IES; no es Reasoning Engine N5).",
  "Hay bloques separados: detección, contribución matemática (cliente y canal), evidencia de negocio y huecos.",
  "Siempre declara contra qué se comparó (referencia same-weekday, ventana 14 días, días cerrados).",
  "Hoy no es un día completo. Día sin filas no es venta cero. null no es 0.",
  "contribución matemática != causa. Top contributor != causa.",
  "Un comentario almacenado (incluida «competencia») es declaración, no prueba causal.",
  "Una acción DICF no es la causa ni la solución. Responsable de una acción != responsable de la caída.",
  "Si un contribuidor material no tiene evidencia suficiente, dilo y señala qué falta saber.",
  "No completes vacíos. No programes una causa. No recomiendes descuento. No es Recommendation N5.",
  "No uses IGF/ARR/M9 mensual como si fueran el día pedido. No calcules descuento/kg en este slice.",
].join(" ");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function ymdFromValue(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function addDaysYmd(ymd, days) {
  const parts = String(ymd || "").split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  dt.setUTCDate(dt.getUTCDate() + Number(days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function isoDowFromYmd(ymd) {
  const parts = String(ymd || "").split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const day = dt.getUTCDay();
  return day === 0 ? 7 : day;
}

function businessTodayYmd(now) {
  const d = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const s = d.toLocaleDateString("en-CA", { timeZone: BUSINESS_TZ });
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function yesterdayYmd(todayYmd) {
  return addDaysYmd(todayYmd, -1);
}

function finiteKg(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function roundKg(n) {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 10000) / 10000;
}

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

function emptyPlant(plantaId) {
  return { planta_id: Number(plantaId) || null, planta_nombre: null, plant_code: null };
}

function sourceBlock(over) {
  return {
    status: over.status || DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    plant: over.plant || emptyPlant(over.planta_id),
    period: over.period != null ? over.period : null,
    payload: over.payload !== undefined ? over.payload : null,
    source: over.source,
    absence: over.absence != null ? over.absence : null,
    error: over.error != null ? over.error : null,
    error_kind: over.error_kind || null,
    code: over.code || over.status || DIRECTOR_IA_VERACITY.SOURCE_ERROR,
  };
}

function assertDailySalesAccess(auth, plantaId) {
  const role = dashboardAuthRoleNorm(auth);
  if (role === "GA") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin permiso para Delta (GA restringido).",
    };
  }
  if (role === "GV") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Tu rol (GV) solo tiene acceso a Delta ingreso Forecast y acciones DICF en tu planta.",
    };
  }
  if (["GG", "AD"].includes(role) && auth && auth.plantas_permitidas?.length > 0) {
    const pid = Number(plantaId);
    const allowed = (auth.plantas_permitidas || []).map((x) => Number(x)).filter(Number.isFinite);
    if (!pid || !allowed.includes(pid)) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
        status: 403,
        error: "Sin permiso para esta planta",
      };
    }
  }
  if (!role) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin acceso a esta planta",
    };
  }
  const pid = Number(plantaId);
  if (!Number.isFinite(pid) || pid <= 0) {
    return {
      ok: false,
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
  const groups = new Set(DICF_GRUPO_LABELS);
  const keys = [];
  for (const grupo of groups) {
    const k = buildClienteKey(canon, grupo, canal || "", subcanal || "", clienteNorm || "");
    if (k) keys.push(k);
  }
  return [...new Set(keys)];
}

function normalizeRows(rawRows) {
  const out = [];
  for (const row of rawRows || []) {
    const fecha = ymdFromValue(row.fecha);
    const kg = finiteKg(row.kg);
    if (!fecha || kg == null) continue;
    out.push({
      fecha,
      cliente_norm: String(row.cliente_norm || "").trim(),
      canal: String(row.canal == null ? "" : row.canal).trim(),
      subcanal: String(row.subcanal == null ? "" : row.subcanal).trim(),
      kg,
    });
  }
  return out;
}

function sumKg(rows) {
  return rows.reduce((acc, r) => acc + r.kg, 0);
}

function datesWithRows(rows, startYmd, endYmdExclusive) {
  const set = new Set();
  for (const r of rows) {
    if (r.fecha >= startYmd && r.fecha < endYmdExclusive) set.add(r.fecha);
  }
  return [...set].sort();
}

function kgByKeyOnDate(rows, date, keyFn) {
  const map = new Map();
  for (const r of rows) {
    if (r.fecha !== date) continue;
    const key = keyFn(r);
    map.set(key, (map.get(key) || 0) + r.kg);
  }
  return map;
}

function averageOnDates(rows, dates, keyFn, key) {
  if (!dates.length) return null;
  let sum = 0;
  for (const d of dates) {
    const map = kgByKeyOnDate(rows, d, keyFn);
    sum += map.get(key) || 0;
  }
  return sum / dates.length;
}

function plantTotalOnDate(rows, date) {
  return sumKg(rows.filter((r) => r.fecha === date));
}

function shareOf(contrib, delta) {
  if (delta == null || !Number.isFinite(delta) || delta === 0) return null;
  if (contrib == null || !Number.isFinite(contrib)) return null;
  return roundKg(contrib / delta);
}

function sortByAbsContrib(a, b) {
  const da = Math.abs(a.contribution_kg || 0);
  const db = Math.abs(b.contribution_kg || 0);
  if (db !== da) return db - da;
  return String(a.label || "").localeCompare(String(b.label || ""));
}

function computeDailySalesDeviationFromRows(rawRows, opts = {}) {
  const todayYmd = ymdFromValue(opts.todayYmd) || businessTodayYmd(opts.now);
  const requestedTarget = ymdFromValue(opts.targetDate) || yesterdayYmd(todayYmd);
  const limitations = [];

  if (!todayYmd || !requestedTarget) {
    return {
      ok: false,
      detection: { status: DIRECTOR_IA_VERACITY.SOURCE_ERROR, error: "No se pudo resolver la fecha de negocio" },
      limitations: ["fecha de negocio no resoluble"],
    };
  }

  let targetDate = requestedTarget;
  if (targetDate === todayYmd) {
    limitations.push("hoy_no_es_dia_completo: se usa ayer calendario, no hoy");
    targetDate = yesterdayYmd(todayYmd);
  }
  if (targetDate > todayYmd) {
    limitations.push("fecha futura no es un día cerrado");
    targetDate = yesterdayYmd(todayYmd);
  }

  const rows = normalizeRows(rawRows);
  const windowStart = addDaysYmd(targetDate, -REFERENCE_WINDOW_DAYS);
  const targetDow = isoDowFromYmd(targetDate);
  const weekday = WEEKDAY_ES[targetDow] || String(targetDow);
  const windowRows = rows.filter((r) => r.fecha >= windowStart && r.fecha < targetDate);
  const targetRows = rows.filter((r) => r.fecha === targetDate);
  const targetHasRows = targetRows.length > 0;

  const candidateDates = datesWithRows(windowRows, windowStart, targetDate).filter(
    (d) => isoDowFromYmd(d) === targetDow
  );
  const observationCount = candidateDates.length;
  const referenceDates = candidateDates;

  const targetKg = targetHasRows ? roundKg(sumKg(targetRows)) : null;
  let referenceKg = null;
  if (observationCount > 0) {
    const totals = referenceDates.map((d) => plantTotalOnDate(windowRows, d));
    referenceKg = roundKg(totals.reduce((a, b) => a + b, 0) / observationCount);
  }

  const referenceLabel =
    `promedio de los últimos ${observationCount} ${weekday}${observationCount === 1 ? "" : "s"} ` +
    `cerrados en ventana de ${REFERENCE_WINDOW_DAYS} días (misma regla que forecast ARR); no es el día anterior`;

  let deviationKg = null;
  let deviationPct = null;
  if (targetKg != null && referenceKg != null) {
    deviationKg = roundKg(targetKg - referenceKg);
    if (referenceKg !== 0) deviationPct = roundKg((targetKg - referenceKg) / referenceKg);
    else limitations.push("reference_kg=0: delta % no calculable");
  }
  if (!targetHasRows) {
    limitations.push("target_day_without_rows: día sin registros != venta cero");
  }
  if (observationCount === 0) {
    limitations.push("insufficient_reference_observations: no hay same-weekday cerrado en la ventana");
  } else if (observationCount === 1) {
    limitations.push("reference_observations=1");
  }

  const clientKeyFn = (r) => r.cliente_norm;
  const channelKeyFn = (r) => r.canal || "(sin canal)";

  function decompose(keyFn, identityBuilder) {
    if (targetKg == null || referenceKg == null || observationCount === 0) return [];
    const keys = new Set();
    for (const r of targetRows) keys.add(keyFn(r));
    for (const r of windowRows) {
      if (referenceDates.includes(r.fecha)) keys.add(keyFn(r));
    }
    const items = [];
    for (const key of keys) {
      if (!key) continue;
      const targetPart = roundKg(sumKg(targetRows.filter((r) => keyFn(r) === key))) || 0;
      const refPart = roundKg(averageOnDates(windowRows, referenceDates, keyFn, key));
      const contributionKg = roundKg(targetPart - (refPart == null ? 0 : refPart));
      items.push({
        ...identityBuilder(key, targetRows.find((r) => keyFn(r) === key) || windowRows.find((r) => keyFn(r) === key)),
        label: key,
        kg_target: targetPart,
        kg_reference: refPart,
        contribution_kg: contributionKg,
        share_of_total_deviation: shareOf(contributionKg, deviationKg),
      });
    }
    return items.sort(sortByAbsContrib);
  }

  const customersRaw = decompose(clientKeyFn, (key, sample) => {
    const combosMap = new Map();
    for (const r of [...targetRows, ...windowRows]) {
      if (r.cliente_norm !== key) continue;
      combosMap.set(`${r.canal}\t${r.subcanal}`, { canal: r.canal, subcanal: r.subcanal });
    }
    const canal_combos = [...combosMap.values()];
    return {
      cliente_norm: key,
      canal: sample ? sample.canal : "",
      subcanal: sample ? sample.subcanal : "",
      canal_combos,
    };
  });
  const channelsRaw = decompose(channelKeyFn, (key) => ({ canal: key }));

  const sumCust = roundKg(customersRaw.reduce((a, x) => a + (x.contribution_kg || 0), 0));
  const sumChan = roundKg(channelsRaw.reduce((a, x) => a + (x.contribution_kg || 0), 0));
  const reconcileCustomers = {
    sum_contribution_kg: sumCust,
    delta_kg: deviationKg,
    abs_diff: deviationKg == null || sumCust == null ? null : roundKg(Math.abs(sumCust - deviationKg)),
    ok:
      deviationKg == null ||
      sumCust == null ||
      Math.abs(sumCust - deviationKg) <= RECONCILE_TOLERANCE_KG,
  };
  const reconcileChannels = {
    sum_contribution_kg: sumChan,
    delta_kg: deviationKg,
    abs_diff: deviationKg == null || sumChan == null ? null : roundKg(Math.abs(sumChan - deviationKg)),
    ok:
      deviationKg == null ||
      sumChan == null ||
      Math.abs(sumChan - deviationKg) <= RECONCILE_TOLERANCE_KG,
  };
  if (reconcileCustomers.ok === false) limitations.push("customer_contributions_do_not_reconcile");
  if (reconcileChannels.ok === false) limitations.push("channel_contributions_do_not_reconcile");

  return {
    ok: true,
    today_ymd: todayYmd,
    timezone: BUSINESS_TZ,
    detection: {
      status: targetHasRows ? DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE : DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      target_date: targetDate,
      today_ymd: todayYmd,
      target_sales_kg: targetKg,
      target_row_count: targetRows.length,
      reference_type: REFERENCE_TYPE,
      reference_sales_kg: referenceKg,
      reference_observation_count: observationCount,
      reference_dates: referenceDates,
      reference_label: referenceLabel,
      weekday,
      window_days: REFERENCE_WINDOW_DAYS,
      window_start: windowStart,
      deviation_kg: deviationKg,
      deviation_pct: deviationPct,
      unit: "kg",
      absence: targetHasRows ? null : "DATA_NOT_FOUND",
    },
    customers: customersRaw,
    channels: channelsRaw,
    top_customers: customersRaw.slice(0, TOP_N),
    top_channels: channelsRaw.slice(0, TOP_N),
    reconcile: { customers: reconcileCustomers, channels: reconcileChannels },
    limitations,
  };
}

function isMaterialContributor(item, deltaKg) {
  if (!item) return false;
  const absC = Math.abs(item.contribution_kg || 0);
  if (absC < 1e-9) return false;
  const share = item.share_of_total_deviation;
  if (share != null && Math.abs(share) >= MATERIAL_SHARE) return true;
  if (deltaKg == null || deltaKg === 0) return absC > 0;
  return absC >= Math.abs(deltaKg) * MATERIAL_SHARE;
}

function attachClienteKeys(items, plantaId) {
  return (items || []).map((c) => {
    const combos =
      Array.isArray(c.canal_combos) && c.canal_combos.length
        ? c.canal_combos
        : [{ canal: c.canal || "", subcanal: c.subcanal || "" }];
    const keys = [...new Set(combos.flatMap((x) => deriveClienteKeys(plantaId, x.canal, x.subcanal, c.cliente_norm)))];
    return { ...c, cliente_keys: keys, cliente_key: keys[0] || null };
  });
}

function ymdFromTs(value, tz) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const s = d.toLocaleDateString("en-CA", { timeZone: tz || BUSINESS_TZ });
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ymdFromValue(value);
}

function buildEvidenceAndGaps(computed, comments, actions, opts = {}) {
  const targetDate = computed.detection && computed.detection.target_date;
  const recentStart = addDaysYmd(targetDate, -7);
  const recentEnd = addDaysYmd(targetDate, 1);
  const commentsByKey = new Map();
  for (const c of comments || []) {
    const key = String(c.cliente_key || "").trim();
    if (!key) continue;
    if (!commentsByKey.has(key)) commentsByKey.set(key, []);
    commentsByKey.get(key).push(c);
  }
  const actionsByKey = new Map();
  for (const a of actions || []) {
    const key = String(a.cliente_key || "").trim();
    if (!key) continue;
    if (!actionsByKey.has(key)) actionsByKey.set(key, []);
    actionsByKey.get(key).push(a);
  }

  const deltaKg = computed.detection && computed.detection.deviation_kg;
  const material = (computed.customers || []).filter((c) => isMaterialContributor(c, deltaKg)).slice(0, TOP_N);

  const business_evidence = [];
  const information_gaps = [];

  for (const c of material) {
    const keys = c.cliente_keys || [];
    const relatedComments = [];
    const relatedActions = [];
    for (const k of keys) {
      for (const com of commentsByKey.get(k) || []) relatedComments.push(com);
      for (const act of actionsByKey.get(k) || []) relatedActions.push(act);
    }
    const commentRows = relatedComments.slice(0, 3).map((com) => ({
      cliente_key: com.cliente_key,
      created_at: com.created_at || null,
      created_ymd: ymdFromTs(com.created_at),
      body: String(com.body || "").slice(0, 400),
      author_name: com.author_name || null,
      related_not_causal: true,
      stored_statement: true,
    }));
    const actionRows = relatedActions.slice(0, 3).map((act) => ({
      public_code: act.public_code || null,
      cliente_key: act.cliente_key,
      descripcion: String(act.descripcion || "").slice(0, 400),
      estado: act.estado || null,
      fecha_compromiso: act.fecha_compromiso || null,
      created_at: act.created_at || null,
      created_ymd: ymdFromTs(act.created_at),
      responsable: act.responsable ? String(act.responsable).trim() : null,
      action_not_cause: true,
    }));
    const hasComment = commentRows.length > 0;
    const hasAction = actionRows.length > 0;
    const recent = [...commentRows, ...actionRows].some((row) => {
      const y = row.created_ymd;
      return y && recentStart && recentEnd && y >= recentStart && y <= recentEnd;
    });
    const physicalPerson = actionRows.map((a) => a.responsable).find((n) => n);
    const explanation_gap = !hasComment && !hasAction;
    business_evidence.push({
      cliente_norm: c.cliente_norm,
      cliente_keys: keys,
      contribution_kg: c.contribution_kg,
      comments: commentRows,
      actions: actionRows,
      has_related_comment: hasComment,
      has_related_action: hasAction,
      has_recent_related_evidence: recent,
      comment_not_cause: true,
      action_not_cause: true,
    });
    information_gaps.push({
      cliente_norm: c.cliente_norm,
      cliente_keys: keys,
      contribution_kg: c.contribution_kg,
      share_of_total_deviation: c.share_of_total_deviation,
      has_related_comment: hasComment,
      has_related_action: hasAction,
      has_recent_related_evidence: recent,
      explanation_gap,
      physical_person: physicalPerson || null,
      physical_source: physicalPerson && actionRows[0] && actionRows[0].public_code
        ? `dicf_accion:${actionRows[0].public_code}`
        : physicalPerson
          ? "dicf_accion"
          : null,
    });
  }

  return { business_evidence, information_gaps, recent_window: { start: recentStart, end: recentEnd } };
}

function assembleDailySalesDeviationEvidence(input) {
  const plant = (input && input.plant) || emptyPlant(input && input.planta_id);
  const computed = input && input.computed;
  const period = computed && computed.detection ? computed.detection.target_date : null;
  const limitations = [...((computed && computed.limitations) || [])];

  if (input && input.salesError) {
    limitations.push(String(input.salesError));
  }

  const customers = attachClienteKeys((computed && computed.customers) || [], plant.planta_id);
  const topCustomers = customers.slice(0, TOP_N);
  const channels = (computed && computed.channels) || [];
  const enrichedComputed = { ...computed, customers, top_customers: topCustomers, channels };

  const evidencePack = buildEvidenceAndGaps(
    enrichedComputed,
    input && input.comments,
    input && input.actions
  );

  const unexplained = (evidencePack.information_gaps || []).filter((g) => g.explanation_gap);
  if (unexplained.length) {
    limitations.push(
      `unexplained_material_contributors=${unexplained.map((g) => g.cliente_norm).join(",")}`
    );
  }

  const detectionStatus =
    (computed && computed.detection && computed.detection.status) || DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
  const commentsStatus = Array.isArray(input && input.comments)
    ? DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
    : input && input.commentsError
      ? DIRECTOR_IA_VERACITY.SOURCE_ERROR
      : DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
  const actionsStatus = Array.isArray(input && input.actions)
    ? DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
    : input && input.actionsError
      ? DIRECTOR_IA_VERACITY.SOURCE_ERROR
      : DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;

  const sources = {
    sales: sourceBlock({
      status: detectionStatus,
      plant,
      period,
      source: SALES_SOURCE,
      absence: computed && computed.detection && computed.detection.absence,
      payload: computed ? computed.detection : null,
    }),
    dicf: sourceBlock({
      status: actionsStatus,
      plant,
      period,
      source: DICF_SOURCE,
      absence: actionsStatus === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND ? "DATA_NOT_FOUND" : null,
      error: (input && input.actionsError) || null,
      payload: { actions: (evidencePack.business_evidence || []).flatMap((e) => e.actions), join: "cliente_key" },
    }),
    comments: sourceBlock({
      status: commentsStatus,
      plant,
      period,
      source: COMMENTS_SOURCE,
      absence: commentsStatus === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND ? "DATA_NOT_FOUND" : null,
      error: (input && input.commentsError) || null,
      payload: { comments: (evidencePack.business_evidence || []).flatMap((e) => e.comments), join: "cliente_key" },
    }),
  };

  let assembly_status = "complete";
  if (detectionStatus !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE) assembly_status = "empty";
  else if (
    commentsStatus === DIRECTOR_IA_VERACITY.SOURCE_ERROR ||
    actionsStatus === DIRECTOR_IA_VERACITY.SOURCE_ERROR
  ) {
    assembly_status = "partial";
  }

  return {
    ok: true,
    abort: false,
    semantic_class: SEMANTIC_CLASS,
    plant,
    timezone: BUSINESS_TZ,
    detection: computed ? computed.detection : null,
    customer_contributors: customers,
    channel_contributors: channels,
    top_contributors: { customers: topCustomers, channels: (computed && computed.top_channels) || [] },
    reconcile: computed ? computed.reconcile : null,
    business_evidence: evidencePack.business_evidence,
    information_gaps: evidencePack.information_gaps,
    sources,
    limitations,
    assembly_status,
    discount_kg_not_implemented: DAILY_DISCOUNT_READINESS,
    provenance: {
      sales: SALES_SOURCE,
      dicf: DICF_SOURCE,
      comments: COMMENTS_SOURCE,
      join: "cliente_key",
      name_join: false,
      reference: REFERENCE_TYPE,
    },
  };
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  return r.rows[0] || null;
}

async function queryDailySalesRows(client, plantaNombre, windowStart, targetDate) {
  const r = await client.query(
    `WITH prov_map AS (${SQL_PROV_MAP})
     SELECT v.fecha::text AS fecha,
            v.cliente_norm,
            COALESCE(v.canal, '') AS canal,
            COALESCE(v.subcanal, '') AS subcanal,
            SUM(v.kg) AS kg
       FROM arr.ventas_diarias_cliente v
       JOIN prov_map pm
         ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
         OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
      WHERE pm.prov_name = $1
        AND v.fecha >= $2::date
        AND v.fecha <= $3::date
      GROUP BY v.fecha, v.cliente_norm, v.canal, v.subcanal`,
    [plantaNombre, windowStart, targetDate]
  );
  return r.rows || [];
}

async function queryCommentsByKeys(client, plantaId, keys) {
  if (!keys.length) return [];
  const r = await client.query(
    `SELECT id, planta_id, cliente_key, cliente_nombre, canal, subcanal, body,
            author_name, created_at
       FROM arr.cliente_comentarios
      WHERE planta_id = $1
        AND is_active = true
        AND cliente_key IS NOT NULL
        AND TRIM(cliente_key) <> ''
        AND cliente_key = ANY($2::text[])
      ORDER BY created_at DESC, id DESC`,
    [plantaId, keys]
  );
  return r.rows || [];
}

async function queryActionsByKeys(client, plantaIds, keys) {
  if (!keys.length || !plantaIds.length) return [];
  const r = await client.query(
    `SELECT a.id, a.public_code, a.planta_id, a.cliente_key, a.cliente_nombre,
            a.canal, a.subcanal, a.descripcion, a.estado, a.fecha_compromiso,
            a.created_at,
            COALESCE(NULLIF(TRIM(COALESCE(rp.nombre_persona,'')), ''), rp.nombre) AS responsable
       FROM arr.dicf_acciones a
       LEFT JOIN public.usuarios rp ON rp.id = a.responsable_usuario_id
      WHERE a.planta_id = ANY($1::int[])
        AND a.cliente_key = ANY($2::text[])
      ORDER BY a.created_at DESC, a.id DESC`,
    [plantaIds, keys]
  );
  return r.rows || [];
}

async function loadDailySalesDeviationForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const denied = assertDailySalesAccess(auth, plantaId);
  if (!denied.ok) {
    return {
      ok: false,
      abort: true,
      status: denied.status || 403,
      code: denied.code || DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: denied.error || "Sin acceso",
    };
  }

  const todayYmd = ymdFromValue(opts.todayYmd) || businessTodayYmd(opts.now);
  let targetDate = ymdFromValue(opts.targetDate) || yesterdayYmd(todayYmd);
  if (targetDate === todayYmd) targetDate = yesterdayYmd(todayYmd);
  const windowStart = addDaysYmd(targetDate, -REFERENCE_WINDOW_DAYS);

  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;
  const loadRows = opts.querySalesRows || queryDailySalesRows;
  const loadComments = opts.queryComments || queryCommentsByKeys;
  const loadActions = opts.queryActions || queryActionsByKeys;

  const run = async (client) => {
    const planta = await resolvePlanta(client, plantaId);
    if (!planta) {
      return {
        ok: false,
        abort: false,
        status: 404,
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        error: "Planta no encontrada",
      };
    }
    const plant = {
      planta_id: Number(plantaId),
      planta_nombre: planta.nombre || null,
      plant_code: planta.clave || null,
    };
    let rows = [];
    let salesError = null;
    try {
      rows = await loadRows(client, planta.nombre, windowStart, targetDate);
    } catch (e) {
      salesError = e && e.message ? String(e.message) : "TOOL_ERROR";
    }
    const computed = computeDailySalesDeviationFromRows(rows, {
      todayYmd,
      targetDate,
      now: opts.now,
    });
    const withKeys = attachClienteKeys(computed.customers || [], plant.planta_id);
    const allKeys = [...new Set(withKeys.flatMap((c) => c.cliente_keys || []))];
    const plantaIds = getPlantaIdsEquivalentes(plantaId);
    let comments = [];
    let actions = [];
    let commentsError = null;
    let actionsError = null;
    try {
      comments = await loadComments(client, Number(plantaId), allKeys);
    } catch (e) {
      commentsError = e && e.message ? String(e.message) : "TOOL_ERROR";
    }
    try {
      actions = await loadActions(client, plantaIds, allKeys);
    } catch (e) {
      actionsError = e && e.message ? String(e.message) : "TOOL_ERROR";
    }
    return assembleDailySalesDeviationEvidence({
      plant,
      planta_id: plantaId,
      computed: { ...computed, customers: withKeys, top_customers: withKeys.slice(0, TOP_N) },
      comments,
      actions,
      commentsError,
      actionsError,
      salesError,
    });
  };

  if (opts.resolvePlanta && opts.querySalesRows) {
    return run(null);
  }
  if (!pool || typeof pool.connect !== "function") {
    return {
      ok: false,
      status: 500,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      error: "Fuente diaria no disponible",
    };
  }
  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return {
      ok: false,
      status: 500,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      error: (e && e.message) || "TOOL_ERROR",
    };
  } finally {
    client.release();
  }
}

function fmtKg(n) {
  if (n == null) return "null";
  return String(n);
}

function formatDailySalesDeviationContext(assembled) {
  const d = assembled && assembled.detection;
  const lines = [
    `BLOQUE detección | source=${SALES_SOURCE} | tz=${BUSINESS_TZ} | status=${d && d.status}`,
    `target_date=${d && d.target_date} (ayer calendario completo; hoy=${d && d.today_ymd} no se usa como día cerrado)`,
    `kg_ayer=${fmtKg(d && d.target_sales_kg)} kg`,
    `referencia=${d && d.reference_type} | observaciones=${d && d.reference_observation_count} | kg_ref=${fmtKg(d && d.reference_sales_kg)}`,
    `comparado contra: ${d && d.reference_label}`,
    `delta_kg=${fmtKg(d && d.deviation_kg)} | delta_pct=${fmtKg(d && d.deviation_pct)}`,
    "Día sin filas != 0. No uses el día anterior como referencia default.",
    "",
    "BLOQUE contribución cliente (matemática, no causa)",
  ];
  const customers = (assembled && assembled.top_contributors && assembled.top_contributors.customers) || [];
  if (!customers.length) lines.push("(sin contribuidores de cliente calculables)");
  for (const c of customers) {
    lines.push(
      `- ${c.cliente_norm} | target=${fmtKg(c.kg_target)} | ref=${fmtKg(c.kg_reference)} | contrib=${fmtKg(c.contribution_kg)} kg | share=${fmtKg(c.share_of_total_deviation)} | keys=${(c.cliente_keys || []).slice(0, 2).join(",") || "—"}`
    );
  }
  const recC = assembled && assembled.reconcile && assembled.reconcile.customers;
  lines.push(
    `reconciliación clientes: sum=${fmtKg(recC && recC.sum_contribution_kg)} delta=${fmtKg(recC && recC.delta_kg)} ok=${recC && recC.ok}`
  );
  lines.push("");
  lines.push("BLOQUE contribución canal (matemática, no causa)");
  const channels = (assembled && assembled.channel_contributors) || [];
  if (!channels.length) lines.push("(sin contribuidores de canal calculables)");
  for (const ch of channels.slice(0, TOP_N)) {
    lines.push(
      `- canal=${ch.canal} | target=${fmtKg(ch.kg_target)} | ref=${fmtKg(ch.kg_reference)} | contrib=${fmtKg(ch.contribution_kg)} kg | share=${fmtKg(ch.share_of_total_deviation)}`
    );
  }
  const recH = assembled && assembled.reconcile && assembled.reconcile.channels;
  lines.push(
    `reconciliación canales: sum=${fmtKg(recH && recH.sum_contribution_kg)} delta=${fmtKg(recH && recH.delta_kg)} ok=${recH && recH.ok}`
  );
  lines.push("");
  lines.push("BLOQUE evidencia de negocio (join cliente_key; comentario/acción != causa)");
  const ev = (assembled && assembled.business_evidence) || [];
  if (!ev.length) lines.push("(sin evidencia ligada por cliente_key a contribuidores materiales)");
  for (const e of ev) {
    lines.push(
      `- ${e.cliente_norm} comment=${e.has_related_comment} action=${e.has_related_action} contrib=${fmtKg(e.contribution_kg)}`
    );
    for (const c of e.comments || []) {
      lines.push(`  comment ${c.created_ymd || "—"}: ${c.body} (declaración almacenada, no prueba)`);
    }
    for (const a of e.actions || []) {
      lines.push(
        `  action ${a.public_code || "—"} estado=${a.estado || "—"} resp=${a.responsable || "sin vínculo físico"}: ${a.descripcion}`
      );
    }
  }
  lines.push("");
  lines.push("BLOQUE huecos (explanation_gap = el pack no tiene evidencia suficiente; no afirma que no exista causa en el mundo)");
  const gaps = (assembled && assembled.information_gaps) || [];
  if (!gaps.length) lines.push("(sin contribuidores materiales para evaluar hueco)");
  for (const g of gaps) {
    lines.push(
      `- ${g.cliente_norm} gap=${g.explanation_gap} comment=${g.has_related_comment} action=${g.has_related_action} person=${g.physical_person || "no hay vínculo físico nombrable"}`
    );
  }
  lines.push("");
  lines.push(`limitations: ${((assembled && assembled.limitations) || []).join(" | ") || "—"}`);
  lines.push("descuento/kg diario NO implementado en este slice.");
  return lines.join("\n");
}

function buildDailySalesDeviationPrompt(assembled, question) {
  const systemPrompt = `${DAILY_SALES_DEVIATION_SYSTEM_ADDENDUM} Responde en español. Una sola respuesta.`;
  const userContent = [
    `Pregunta del usuario: ${String(question || "").trim()}`,
    "",
    formatDailySalesDeviationContext(assembled),
  ].join("\n");
  return { systemPrompt, userContent };
}

function buildDailySalesDeviationChatResult(assembled, opts = {}) {
  const planta_id =
    opts.planta_id != null ? Number(opts.planta_id) : assembled.plant && assembled.plant.planta_id;
  const openaiCalled = opts.openai_called !== false;
  return {
    ok: true,
    answer: opts.answer || "",
    sources: [SALES_SOURCE, DICF_SOURCE, COMMENTS_SOURCE],
    context_meta: {
      mode: "daily_sales_deviation",
      requested_domain: "daily_sales_deviation",
      openai_called: openaiCalled,
      openai_call_count: openaiCalled ? 1 : 0,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      assembly_status: assembled.assembly_status,
      limitations: assembled.limitations,
      prompt_mode: "daily_sales_deviation",
      focus_type: "daily_sales_deviation",
      ies_runtime: false,
      reasoning_engine: false,
      m9_included: false,
      discount_kg_implemented: false,
    },
    daily_sales_deviation: {
      semantic_class: SEMANTIC_CLASS,
      plant: assembled.plant,
      detection: assembled.detection,
      customer_contributors: assembled.customer_contributors,
      channel_contributors: assembled.channel_contributors,
      business_evidence: assembled.business_evidence,
      information_gaps: assembled.information_gaps,
      sources: assembled.sources,
      limitations: assembled.limitations,
      provenance: assembled.provenance,
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SALES_SOURCE,
  DICF_SOURCE,
  COMMENTS_SOURCE,
  BUSINESS_TZ,
  REFERENCE_WINDOW_DAYS,
  REFERENCE_TYPE,
  DAILY_DISCOUNT_READINESS,
  DAILY_SALES_DEVIATION_SYSTEM_ADDENDUM,
  RECONCILE_TOLERANCE_KG,
  businessTodayYmd,
  yesterdayYmd,
  addDaysYmd,
  isoDowFromYmd,
  ymdFromValue,
  assertDailySalesAccess,
  computeDailySalesDeviationFromRows,
  assembleDailySalesDeviationEvidence,
  loadDailySalesDeviationForChat,
  formatDailySalesDeviationContext,
  buildDailySalesDeviationPrompt,
  buildDailySalesDeviationChatResult,
};
