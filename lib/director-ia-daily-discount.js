"use strict";

/**
 * Chat legado: desviación diaria de descuento/kg (first slice D).
 * No IES. No Reasoning Engine. No HTTP. No writes. No canal. No causalidad.
 * Planta y referencia: SUM(monto)/SUM(kg) pooled. No AVG de ratios. No M9.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const {
  buildClienteKey,
  getCanonicalPlantaId,
  getPlantaIdsEquivalentes,
} = require("./dicf-acciones");
const {
  BUSINESS_TZ,
  REFERENCE_WINDOW_DAYS,
  assertDailySalesAccess,
  businessTodayYmd,
  yesterdayYmd,
  addDaysYmd,
  isoDowFromYmd,
  ymdFromValue,
} = require("./director-ia-daily-deviation");

const SEMANTIC_CLASS = "daily_discount_deviation";
const DISCOUNT_SOURCE = "arr.descuentos_diarios_cliente";
const KG_SOURCE = "arr.ventas_diarias_cliente";
const DICF_SOURCE = "arr.dicf_acciones";
const COMMENTS_SOURCE = "arr.cliente_comentarios";
const REFERENCE_TYPE = "same_weekday_14d_pooled";
const TOP_N = 8;
const RECONCILE_TOLERANCE = 1e-8;
const MATERIAL_SHARE = 0.1;
const DICF_GRUPO_LABELS = Object.freeze([
  "Dejaron de comprar",
  "Disminuyeron",
  "Aumentaron",
  "Nuevo",
]);

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

const DAILY_DISCOUNT_DEVIATION_SYSTEM_ADDENDUM = [
  "EVIDENCIA DE DESVIACIÓN DIARIA DE DESCUENTO/KG (chat legado; no es IES; no es Reasoning Engine N5; no es M9 mensual).",
  "El runtime ya calculó fecha, ratio ponderado SUM(monto)/SUM(kg), referencia pooled same-weekday 14 días y contribución por cliente.",
  "Hay bloques separados: summary, reference, customer contributors, business evidence, information gaps, limitations, provenance.",
  "Siempre declara contra qué se comparó (referencia pooled same-weekday, ventana 14 días, N observaciones, SUM(monto_ref)/SUM(kg_ref)).",
  "Hoy no es un día completo. Día sin filas no es descuento/kg 0. null no es 0. kg=0 deja el ratio indefinido, no 0.",
  "No promedies ratios diarios. No uses average-of-averages. No copies la matemática mensual M9.",
  "contribución matemática != causa. El cliente con ratio más alto no es necesariamente el que más movió el ponderado.",
  "No hay contribución por canal: la fuente de descuento no tiene canal. No prorratees monto entre canales.",
  "Un comentario almacenado es declaración, no prueba causal. Una acción DICF no es la causa. Responsable de una acción != culpable del descuento.",
  "Si un contribuidor material no tiene evidencia suficiente, dilo y señala qué falta saber.",
  "No completes vacíos. No programes una causa. No inventes competencia, mix/rate ni motivo comercial.",
  "Interpreta el pack fresco + HILO: qué destaca, quién movió matemáticamente el ponderado, qué evidencia existe, qué no está explicado, qué falta saber.",
].join(" ");

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function roundNum(n) {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 1e10) / 1e10;
}

function ratio(monto, kg) {
  const m = finiteNumber(monto);
  const k = finiteNumber(kg);
  if (m == null || k == null) return null;
  if (k === 0) return null;
  return roundNum(m / k);
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

function normalizeDiscountRows(rawRows) {
  const out = [];
  for (const row of rawRows || []) {
    const fecha = ymdFromValue(row.fecha);
    const monto = finiteNumber(row.monto);
    if (!fecha || monto == null) continue;
    out.push({
      fecha,
      cliente_norm: String(row.cliente_norm || "").trim(),
      monto,
    });
  }
  return out;
}

function normalizeKgRows(rawRows) {
  const out = [];
  for (const row of rawRows || []) {
    const fecha = ymdFromValue(row.fecha);
    const kg = finiteNumber(row.kg);
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

function datesWithRows(discountRows, kgRows, startYmd, endYmdExclusive) {
  const set = new Set();
  for (const r of discountRows) {
    if (r.fecha >= startYmd && r.fecha < endYmdExclusive) set.add(r.fecha);
  }
  for (const r of kgRows) {
    if (r.fecha >= startYmd && r.fecha < endYmdExclusive) set.add(r.fecha);
  }
  return [...set].sort();
}

function sumFieldOnDates(rows, dates, field) {
  const dateSet = new Set(dates);
  let sum = 0;
  for (const r of rows) {
    if (!dateSet.has(r.fecha)) continue;
    sum += r[field];
  }
  return sum;
}

function sumFieldOnDate(rows, date, field) {
  let sum = 0;
  let found = false;
  for (const r of rows) {
    if (r.fecha !== date) continue;
    sum += r[field];
    found = true;
  }
  return { sum, found };
}

function clientFieldOnDates(rows, cliente, dates, field) {
  const dateSet = new Set(dates);
  let sum = 0;
  for (const r of rows) {
    if (r.cliente_norm !== cliente) continue;
    if (!dateSet.has(r.fecha)) continue;
    sum += r[field];
  }
  return sum;
}

function shareOf(contrib, delta) {
  if (delta == null || !Number.isFinite(delta) || delta === 0) return null;
  if (contrib == null || !Number.isFinite(contrib)) return null;
  return roundNum(contrib / delta);
}

function sortByAbsContrib(a, b) {
  const da = Math.abs(a.contribution_to_plant_delta || 0);
  const db = Math.abs(b.contribution_to_plant_delta || 0);
  if (db !== da) return db - da;
  return String(a.cliente_norm || "").localeCompare(String(b.cliente_norm || ""));
}

function computeDailyDiscountDeviationFromRows(discountRaw, kgRaw, opts = {}) {
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

  const discountRows = normalizeDiscountRows(discountRaw);
  const kgRows = normalizeKgRows(kgRaw);
  const windowStart = addDaysYmd(targetDate, -REFERENCE_WINDOW_DAYS);
  const targetDow = isoDowFromYmd(targetDate);
  const weekday = WEEKDAY_ES[targetDow] || String(targetDow);

  const windowDiscount = discountRows.filter((r) => r.fecha >= windowStart && r.fecha < targetDate);
  const windowKg = kgRows.filter((r) => r.fecha >= windowStart && r.fecha < targetDate);
  const targetDiscount = discountRows.filter((r) => r.fecha === targetDate);
  const targetKgRows = kgRows.filter((r) => r.fecha === targetDate);
  const targetHasRows = targetDiscount.length > 0 || targetKgRows.length > 0;

  const candidateDates = datesWithRows(windowDiscount, windowKg, windowStart, targetDate).filter(
    (d) => isoDowFromYmd(d) === targetDow
  );
  const observationCount = candidateDates.length;
  const referenceDates = candidateDates;

  const targetKgBlock = sumFieldOnDate(targetKgRows, targetDate, "kg");
  const targetMontoBlock = sumFieldOnDate(targetDiscount, targetDate, "monto");
  const K_target = targetHasRows && targetKgBlock.found ? roundNum(targetKgBlock.sum) : targetHasRows ? 0 : null;
  const monto_target = targetHasRows ? roundNum(targetMontoBlock.sum) : null;

  let K_ref = null;
  let monto_ref = null;
  if (observationCount > 0) {
    K_ref = roundNum(sumFieldOnDates(windowKg, referenceDates, "kg"));
    monto_ref = roundNum(sumFieldOnDates(windowDiscount, referenceDates, "monto"));
  }

  const target_ratio = K_target != null && K_target !== 0 ? ratio(monto_target, K_target) : null;
  const reference_ratio = K_ref != null && K_ref !== 0 ? ratio(monto_ref, K_ref) : null;

  if (targetHasRows && (K_target == null || K_target === 0)) {
    limitations.push("kg_target=0: ratio de planta indefinido (no 0)");
  }
  if (observationCount > 0 && (K_ref == null || K_ref === 0)) {
    limitations.push("kg_ref=0: ratio de referencia indefinido (no 0)");
  }

  const referenceLabel =
    `SUM(monto)/SUM(kg) pooled de los últimos ${observationCount} ${weekday}${observationCount === 1 ? "" : "s"} ` +
    `cerrados en ventana de ${REFERENCE_WINDOW_DAYS} días; no es promedio de ratios diarios; no es el día anterior; no es M9 mensual`;

  let delta_ratio = null;
  if (target_ratio != null && reference_ratio != null) {
    delta_ratio = roundNum(target_ratio - reference_ratio);
  }
  if (!targetHasRows) {
    limitations.push("target_day_without_rows: día sin registros != descuento/kg 0");
  }
  if (observationCount === 0) {
    limitations.push("insufficient_reference_observations: no hay same-weekday cerrado en la ventana");
  } else if (observationCount === 1) {
    limitations.push("reference_observations=1");
  }

  const clients = new Set();
  for (const r of targetDiscount) if (r.cliente_norm) clients.add(r.cliente_norm);
  for (const r of windowDiscount) {
    if (referenceDates.includes(r.fecha) && r.cliente_norm) clients.add(r.cliente_norm);
  }

  const customersRaw = [];
  if (K_target != null && K_target !== 0 && K_ref != null && K_ref !== 0 && observationCount > 0) {
    for (const cliente of clients) {
      const monto_i_t = roundNum(clientFieldOnDates(targetDiscount, cliente, [targetDate], "monto")) || 0;
      const kg_i_t = roundNum(clientFieldOnDates(targetKgRows, cliente, [targetDate], "kg")) || 0;
      const monto_i_r = roundNum(clientFieldOnDates(windowDiscount, cliente, referenceDates, "monto")) || 0;
      const kg_i_r = roundNum(clientFieldOnDates(windowKg, cliente, referenceDates, "kg")) || 0;
      const contrib = roundNum(monto_i_t / K_target - monto_i_r / K_ref);
      const combosMap = new Map();
      for (const r of [...targetKgRows, ...windowKg]) {
        if (r.cliente_norm !== cliente) continue;
        combosMap.set(`${r.canal}\t${r.subcanal}`, { canal: r.canal, subcanal: r.subcanal });
      }
      customersRaw.push({
        cliente_norm: cliente,
        canal_combos: [...combosMap.values()],
        monto_target: monto_i_t,
        kg_target: kg_i_t,
        ratio_target: ratio(monto_i_t, kg_i_t),
        monto_ref: monto_i_r,
        kg_ref: kg_i_r,
        ratio_ref: ratio(monto_i_r, kg_i_r),
        contribution_to_plant_delta: contrib,
        share_of_delta: shareOf(contrib, delta_ratio),
      });
    }
    customersRaw.sort(sortByAbsContrib);
  }

  const sumContrib = roundNum(customersRaw.reduce((a, x) => a + (x.contribution_to_plant_delta || 0), 0));
  const reconcileCustomers = {
    sum_contribution: sumContrib,
    delta_ratio,
    abs_diff: delta_ratio == null || sumContrib == null ? null : roundNum(Math.abs(sumContrib - delta_ratio)),
    ok:
      delta_ratio == null ||
      sumContrib == null ||
      Math.abs(sumContrib - delta_ratio) <= RECONCILE_TOLERANCE,
  };
  if (reconcileCustomers.ok === false) limitations.push("customer_contributions_do_not_reconcile");

  const dailyRefRatios = referenceDates.map((d) => {
    const k = sumFieldOnDate(windowKg, d, "kg").sum;
    const m = sumFieldOnDate(windowDiscount, d, "monto").sum;
    return ratio(m, k);
  });
  const avgOfDailyRatios =
    dailyRefRatios.length && dailyRefRatios.every((x) => x != null)
      ? roundNum(dailyRefRatios.reduce((a, b) => a + b, 0) / dailyRefRatios.length)
      : null;

  return {
    ok: true,
    today_ymd: todayYmd,
    timezone: BUSINESS_TZ,
    detection: {
      status: targetHasRows
        ? K_target != null && K_target !== 0
          ? DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
          : DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        : DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      target_date: targetDate,
      today_ymd: todayYmd,
      target_monto: monto_target,
      target_kg: K_target,
      target_ratio,
      target_row_count: targetDiscount.length + targetKgRows.length,
      reference_type: REFERENCE_TYPE,
      reference_monto: monto_ref,
      reference_kg: K_ref,
      reference_ratio,
      reference_observation_count: observationCount,
      reference_dates: referenceDates,
      reference_label: referenceLabel,
      reference_avg_of_daily_ratios: avgOfDailyRatios,
      weekday,
      window_days: REFERENCE_WINDOW_DAYS,
      window_start: windowStart,
      delta_ratio,
      unit: "monto/kg",
      plant_formula: "SUM(monto)/SUM(kg)",
      average_of_averages: false,
      absence: targetHasRows ? null : "DATA_NOT_FOUND",
    },
    customers: customersRaw,
    top_customers: customersRaw.slice(0, TOP_N),
    reconcile: { customers: reconcileCustomers },
    limitations,
  };
}

function isMaterialContributor(item, deltaRatio) {
  if (!item) return false;
  const absC = Math.abs(item.contribution_to_plant_delta || 0);
  if (absC < 1e-12) return false;
  const share = item.share_of_delta;
  if (share != null && Math.abs(share) >= MATERIAL_SHARE) return true;
  if (deltaRatio == null || deltaRatio === 0) return absC > 0;
  return absC >= Math.abs(deltaRatio) * MATERIAL_SHARE;
}

function attachClienteKeys(items, plantaId) {
  return (items || []).map((c) => {
    const combos =
      Array.isArray(c.canal_combos) && c.canal_combos.length
        ? c.canal_combos
        : [{ canal: "", subcanal: "" }];
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

function buildEvidenceAndGaps(computed, comments, actions) {
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

  const deltaRatio = computed.detection && computed.detection.delta_ratio;
  const material = (computed.customers || []).filter((c) => isMaterialContributor(c, deltaRatio)).slice(0, TOP_N);

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
      comment_not_cause: true,
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
      responsible_not_cause: true,
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
      contribution_to_plant_delta: c.contribution_to_plant_delta,
      comments: commentRows,
      actions: actionRows,
      has_related_comment: hasComment,
      has_related_action: hasAction,
      has_recent_related_evidence: recent,
      comment_not_cause: true,
      action_not_cause: true,
      responsible_not_cause: true,
    });
    information_gaps.push({
      cliente_norm: c.cliente_norm,
      cliente_keys: keys,
      contribution_to_plant_delta: c.contribution_to_plant_delta,
      share_of_delta: c.share_of_delta,
      has_related_comment: hasComment,
      has_related_action: hasAction,
      has_recent_related_evidence: recent,
      explanation_gap,
      linked_responsible: physicalPerson || null,
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

function assembleDailyDiscountDeviationEvidence(input) {
  const plant = (input && input.plant) || emptyPlant(input && input.planta_id);
  const computed = input && input.computed;
  const period = computed && computed.detection ? computed.detection.target_date : null;
  const limitations = [...((computed && computed.limitations) || [])];

  if (input && input.discountError) limitations.push(String(input.discountError));
  if (input && input.kgError) limitations.push(String(input.kgError));

  const customers = attachClienteKeys((computed && computed.customers) || [], plant.planta_id);
  const topCustomers = customers.slice(0, TOP_N);
  const enrichedComputed = { ...computed, customers, top_customers: topCustomers };

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
    discount: sourceBlock({
      status: detectionStatus,
      plant,
      period,
      source: DISCOUNT_SOURCE,
      absence: computed && computed.detection && computed.detection.absence,
      payload: computed ? computed.detection : null,
    }),
    kg: sourceBlock({
      status: detectionStatus,
      plant,
      period,
      source: KG_SOURCE,
      absence: computed && computed.detection && computed.detection.absence,
      payload: computed ? { target_kg: computed.detection && computed.detection.target_kg } : null,
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

  const detection = computed ? computed.detection : null;
  return {
    ok: true,
    abort: false,
    semantic_class: SEMANTIC_CLASS,
    plant,
    timezone: BUSINESS_TZ,
    summary: detection
      ? {
          target_date: detection.target_date,
          today_ymd: detection.today_ymd,
          target_monto: detection.target_monto,
          target_kg: detection.target_kg,
          target_ratio: detection.target_ratio,
          reference_ratio: detection.reference_ratio,
          delta_ratio: detection.delta_ratio,
          unit: detection.unit,
          plant_formula: detection.plant_formula,
          status: detection.status,
        }
      : null,
    reference: detection
      ? {
          type: detection.reference_type,
          observation_count: detection.reference_observation_count,
          dates: detection.reference_dates,
          label: detection.reference_label,
          monto: detection.reference_monto,
          kg: detection.reference_kg,
          ratio: detection.reference_ratio,
          weekday: detection.weekday,
          window_days: detection.window_days,
          pooled: true,
          average_of_daily_ratios: false,
        }
      : null,
    detection,
    customer_contributors: customers,
    top_contributors: { customers: topCustomers },
    reconcile: computed ? computed.reconcile : null,
    business_evidence: evidencePack.business_evidence,
    information_gaps: evidencePack.information_gaps,
    sources,
    limitations,
    assembly_status,
    provenance: {
      discount: DISCOUNT_SOURCE,
      kg: KG_SOURCE,
      dicf: DICF_SOURCE,
      comments: COMMENTS_SOURCE,
      join: "cliente_key",
      name_join: false,
      channel_contribution: false,
      reference: REFERENCE_TYPE,
      plant_formula: "SUM(monto)/SUM(kg)",
      average_of_averages: false,
    },
  };
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  return r.rows[0] || null;
}

async function queryDailyDiscountRows(client, plantaNombre, windowStart, targetDate) {
  const r = await client.query(
    `WITH prov_map AS (${SQL_PROV_MAP})
     SELECT d.fecha::text AS fecha,
            d.cliente_norm,
            SUM(d.monto) AS monto
       FROM arr.descuentos_diarios_cliente d
       JOIN prov_map pm
         ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
         OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
      WHERE pm.prov_name = $1
        AND d.fecha >= $2::date
        AND d.fecha <= $3::date
      GROUP BY d.fecha, d.cliente_norm`,
    [plantaNombre, windowStart, targetDate]
  );
  return r.rows || [];
}

async function queryDailyKgRows(client, plantaNombre, windowStart, targetDate) {
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

async function loadDailyDiscountDeviationForChat(pool, plantaId, req, opts = {}) {
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
  const loadDiscount = opts.queryDiscountRows || queryDailyDiscountRows;
  const loadKg = opts.queryKgRows || queryDailyKgRows;
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
    let discountRows = [];
    let kgRows = [];
    let discountError = null;
    let kgError = null;
    try {
      discountRows = await loadDiscount(client, planta.nombre, windowStart, targetDate);
    } catch (e) {
      discountError = e && e.message ? String(e.message) : "TOOL_ERROR";
    }
    try {
      kgRows = await loadKg(client, planta.nombre, windowStart, targetDate);
    } catch (e) {
      kgError = e && e.message ? String(e.message) : "TOOL_ERROR";
    }
    const computed = computeDailyDiscountDeviationFromRows(discountRows, kgRows, {
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
    return assembleDailyDiscountDeviationEvidence({
      plant,
      planta_id: plantaId,
      computed: { ...computed, customers: withKeys, top_customers: withKeys.slice(0, TOP_N) },
      comments,
      actions,
      commentsError,
      actionsError,
      discountError,
      kgError,
    });
  };

  if (opts.resolvePlanta && opts.queryDiscountRows && opts.queryKgRows) {
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

function fmt(n) {
  if (n == null) return "null";
  return String(n);
}

function formatDailyDiscountDeviationContext(assembled) {
  const d = assembled && assembled.detection;
  const summary = assembled && assembled.summary;
  const reference = assembled && assembled.reference;
  const lines = [
    `BLOQUE summary | source_discount=${DISCOUNT_SOURCE} | source_kg=${KG_SOURCE} | tz=${BUSINESS_TZ} | status=${d && d.status}`,
    `target_date=${d && d.target_date} (ayer calendario completo CDMX; hoy=${d && d.today_ymd} no se usa como día cerrado)`,
    `plant_formula=SUM(monto)/SUM(kg) | NO AVG de ratios | NO average-of-averages | NO M9 mensual`,
    `monto_ayer=${fmt(summary && summary.target_monto)} | kg_ayer=${fmt(summary && summary.target_kg)} | R_target=${fmt(summary && summary.target_ratio)}`,
    `R_ref=${fmt(summary && summary.reference_ratio)} | delta=${fmt(summary && summary.delta_ratio)} ${d && d.unit}`,
    "Día sin filas != 0. kg=0 → ratio indefinido, no 0. null no es 0.",
    "",
    "BLOQUE reference (pooled same-weekday 14d)",
    `type=${reference && reference.type} | observaciones=${reference && reference.observation_count} | fechas=${((reference && reference.dates) || []).join(",") || "—"}`,
    `monto_ref=${fmt(reference && reference.monto)} | kg_ref=${fmt(reference && reference.kg)} | R_ref=SUM(monto_ref)/SUM(kg_ref)=${fmt(reference && reference.ratio)}`,
    `comparado contra: ${reference && reference.label}`,
    "No uses el día anterior como referencia default. No promedies ratios diarios.",
    "",
    "BLOQUE customer contributors (matemática, no causa; contrib_i = monto_i_t/K_t − monto_i_r/K_r)",
  ];
  const customers = (assembled && assembled.top_contributors && assembled.top_contributors.customers) || [];
  if (!customers.length) lines.push("(sin contribuidores de cliente calculables)");
  for (const c of customers) {
    lines.push(
      `- ${c.cliente_norm} | monto_t=${fmt(c.monto_target)} kg_t=${fmt(c.kg_target)} ratio_t=${fmt(c.ratio_target)} | monto_r=${fmt(c.monto_ref)} kg_r=${fmt(c.kg_ref)} ratio_r=${fmt(c.ratio_ref)} | contrib=${fmt(c.contribution_to_plant_delta)} | share=${fmt(c.share_of_delta)} | keys=${(c.cliente_keys || []).slice(0, 2).join(",") || "—"}`
    );
  }
  const recC = assembled && assembled.reconcile && assembled.reconcile.customers;
  lines.push(
    `reconciliación clientes: SUM(contrib_i)=${fmt(recC && recC.sum_contribution)} R_t-R_ref=${fmt(recC && recC.delta_ratio)} ok=${recC && recC.ok}`
  );
  lines.push("Cliente con ratio más alto != necesariamente el mayor mover del ponderado.");
  lines.push("");
  lines.push("BLOQUE channel contribution: NO APLICA (fuente de descuento sin canal; no prorrateo).");
  lines.push("");
  lines.push("BLOQUE business evidence (join cliente_key canónico; comentario/acción/responsable != causa)");
  const ev = (assembled && assembled.business_evidence) || [];
  if (!ev.length) lines.push("(sin evidencia ligada por cliente_key a contribuidores materiales)");
  for (const e of ev) {
    lines.push(
      `- ${e.cliente_norm} comment=${e.has_related_comment} action=${e.has_related_action} contrib=${fmt(e.contribution_to_plant_delta)}`
    );
    for (const c of e.comments || []) {
      lines.push(`  comment ${c.created_ymd || "—"}: ${c.body} (declaración almacenada, no prueba causal)`);
    }
    for (const a of e.actions || []) {
      lines.push(
        `  action ${a.public_code || "—"} estado=${a.estado || "—"} resp=${a.responsable || "sin vínculo físico"}: ${a.descripcion} (acción != causa; responsable != culpable)`
      );
    }
  }
  lines.push("");
  lines.push("BLOQUE information gaps (explanation_gap = el pack no tiene evidencia suficiente; no afirma que no exista causa en el mundo)");
  const gaps = (assembled && assembled.information_gaps) || [];
  if (!gaps.length) lines.push("(sin contribuidores materiales para evaluar hueco)");
  for (const g of gaps) {
    lines.push(
      `- ${g.cliente_norm} gap=${g.explanation_gap} comment=${g.has_related_comment} action=${g.has_related_action} person=${g.linked_responsible || g.physical_person || "no hay vínculo físico nombrable"}`
    );
  }
  lines.push("");
  lines.push(`BLOQUE limitations: ${((assembled && assembled.limitations) || []).join(" | ") || "—"}`);
  const prov = assembled && assembled.provenance;
  lines.push(
    `BLOQUE provenance: discount=${prov && prov.discount} kg=${prov && prov.kg} join=${prov && prov.join} name_join=${prov && prov.name_join} channel=${prov && prov.channel_contribution} formula=${prov && prov.plant_formula}`
  );
  return lines.join("\n");
}

function buildDailyDiscountDeviationPrompt(assembled, question) {
  const systemPrompt = `${DAILY_DISCOUNT_DEVIATION_SYSTEM_ADDENDUM} Responde en español. Una sola respuesta. Sin plantilla rígida.`;
  const userContent = [
    `Pregunta del usuario: ${String(question || "").trim()}`,
    "",
    formatDailyDiscountDeviationContext(assembled),
  ].join("\n");
  return { systemPrompt, userContent };
}

function buildDailyDiscountDeviationChatResult(assembled, opts = {}) {
  const planta_id =
    opts.planta_id != null ? Number(opts.planta_id) : assembled.plant && assembled.plant.planta_id;
  const openaiCalled = opts.openai_called !== false;
  return {
    ok: true,
    answer: opts.answer || "",
    sources: [DISCOUNT_SOURCE, KG_SOURCE, DICF_SOURCE, COMMENTS_SOURCE],
    context_meta: {
      mode: "daily_discount_deviation",
      requested_domain: "daily_discount_deviation",
      openai_called: openaiCalled,
      openai_call_count: openaiCalled ? 1 : 0,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      assembly_status: assembled.assembly_status,
      limitations: assembled.limitations,
      prompt_mode: "daily_discount_deviation",
      focus_type: "daily_discount_deviation",
      ies_runtime: false,
      reasoning_engine: false,
      m9_included: false,
      channel_contribution: false,
    },
    daily_discount_deviation: {
      semantic_class: SEMANTIC_CLASS,
      plant: assembled.plant,
      summary: assembled.summary,
      reference: assembled.reference,
      detection: assembled.detection,
      customer_contributors: assembled.customer_contributors,
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
  DISCOUNT_SOURCE,
  KG_SOURCE,
  DICF_SOURCE,
  COMMENTS_SOURCE,
  BUSINESS_TZ,
  REFERENCE_WINDOW_DAYS,
  REFERENCE_TYPE,
  RECONCILE_TOLERANCE,
  DAILY_DISCOUNT_DEVIATION_SYSTEM_ADDENDUM,
  computeDailyDiscountDeviationFromRows,
  assembleDailyDiscountDeviationEvidence,
  loadDailyDiscountDeviationForChat,
  formatDailyDiscountDeviationContext,
  buildDailyDiscountDeviationPrompt,
  buildDailyDiscountDeviationChatResult,
};
