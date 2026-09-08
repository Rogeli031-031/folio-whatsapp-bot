"use strict";

/**
 * Chat legado: ensamblaje IGF + ARR + M9 para financial_diagnosis.
 * No IES. No Reasoning Engine. No HTTP. No writes. No fusión de hechos.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { loadIgfArrSourceBlocksForChat } = require("./director-ia-igf-arr");
const {
  loadDeltaVentaForChat,
  loadDeltaDescuentoForChat,
  loadDeltaIngresoForChat,
} = require("./director-ia-m9-deltas");

const SEMANTIC_CLASS = "financial_diagnosis_multi_source";
const IGF_SOURCE = "igf.compromiso_lines";
const ARR_SOURCE = "arr.proyeccion_planta";
const M9_SOURCE = "dashboard.delta_venta|delta_descuento|delta_ingreso";

const FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM = [
  "EVIDENCIA FINANCIERA MULTI-FUENTE (chat legado; no es IES; no es Reasoning Engine N5).",
  "Hay tres bloques separados: IGF, ARR y M9. Cada hecho cita su bloque.",
  "No fusiones cifras de bloques distintos. No sustituyas una fuente con otra.",
  "null no es 0. Ausencia no es cero. Error no es ausencia. SOURCE_RESTRICTED no es missing.",
  "Si alignment.status es mismatch, no trates los cortes como el mismo mes.",
  "Permitido: coincidencias, tensiones y comparación solo de hechos con cortes alineados.",
  "Prohibido: causalidad; «IGF causó ARR»; «el delta prueba la causa»; responsable; impacto causal.",
  "No formules hipótesis N5. No completes vacíos.",
].join(" ");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYyyyMm(year, month) {
  if (!Number.isFinite(Number(year)) || !Number.isFinite(Number(month))) return null;
  return `${year}-${pad2(month)}`;
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

function mapIgfBlock(raw, plant, year, month) {
  const period = toYyyyMm(year, month);
  const basePlant = plant || emptyPlant();
  if (!raw) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant: basePlant,
      period,
      source: IGF_SOURCE,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: null,
    });
  }
  if (raw.load_error) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      plant: basePlant,
      period,
      source: IGF_SOURCE,
      absence: null,
      error: raw.load_error,
      error_kind: "TOOL_ERROR",
      payload: null,
    });
  }
  if (!raw.version_id) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant: basePlant,
      period,
      source: IGF_SOURCE,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: { version_id: null, version_number: null, composition: null, omitted_null_keys: [] },
    });
  }
  if (!raw.row) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant: basePlant,
      period,
      source: IGF_SOURCE,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: {
        version_id: raw.version_id,
        version_number: raw.version_number,
        composition: null,
        omitted_null_keys: [],
      },
    });
  }
  const composition = raw.composition || null;
  const omitted = (composition && composition.omitted_null_keys) || [];
  const status =
    omitted.length > 0 ? DIRECTOR_IA_VERACITY.SOURCE_PARTIAL : DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  return sourceBlock({
    status,
    plant: basePlant,
    period,
    source: IGF_SOURCE,
    absence: omitted.length ? "omitted_null_keys" : null,
    error: null,
    payload: {
      version_id: raw.version_id,
      version_number: raw.version_number,
      composition,
      omitted_null_keys: omitted,
      null_is_not_zero: true,
    },
  });
}

function mapArrBlock(raw, plant, year, month) {
  const period = toYyyyMm(year, month);
  const basePlant = plant || emptyPlant();
  if (!raw) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      plant: basePlant,
      period,
      source: ARR_SOURCE,
      absence: "DATA_NOT_FOUND",
      error: null,
      payload: {
        observed_venta_ton: null,
        projected_venta_ton: null,
        observed_desc_kg: null,
        projected_desc_kg: null,
        venta_ton: null,
        desc_kg: null,
      },
    });
  }
  if (raw.load_error) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      plant: basePlant,
      period,
      source: ARR_SOURCE,
      absence: null,
      error: raw.load_error,
      error_kind: "TOOL_ERROR",
      payload: {
        observed_venta_ton: null,
        projected_venta_ton: null,
        observed_desc_kg: null,
        projected_desc_kg: null,
        venta_ton: null,
        desc_kg: null,
      },
    });
  }
  const finiteNum = (v) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
  const observedVenta = finiteNum(raw.observed_venta_ton);
  const projectedVenta = finiteNum(raw.projected_venta_ton);
  const observedDesc = finiteNum(raw.observed_desc_kg);
  const projectedDesc = finiteNum(raw.projected_desc_kg);
  const previousVenta = finiteNum(raw.previous_month_venta_ton);
  const legacyVenta = finiteNum(raw.venta_ton);
  const legacyDesc = finiteNum(raw.desc_kg);
  const ventaOk = projectedVenta != null || observedVenta != null || legacyVenta != null;
  const descOk = projectedDesc != null || observedDesc != null || legacyDesc != null;
  let status = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  let absence = null;
  if (!ventaOk && !descOk) {
    status = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
    absence = "DATA_NOT_FOUND";
  } else if (!ventaOk || !descOk) {
    status = DIRECTOR_IA_VERACITY.SOURCE_PARTIAL;
    absence = "partial_null";
  }
  return sourceBlock({
    status,
    plant: basePlant,
    period,
    source: ARR_SOURCE,
    absence,
    error: null,
    payload: {
      observed_venta_ton: observedVenta,
      projected_venta_ton: projectedVenta,
      observed_desc_kg: observedDesc,
      projected_desc_kg: projectedDesc,
      previous_month_venta_ton: previousVenta,
      venta_ton: projectedVenta != null ? projectedVenta : legacyVenta,
      desc_kg: projectedDesc != null ? projectedDesc : legacyDesc,
      null_is_not_zero: true,
    },
  });
}

function truncateM9Datos(datos) {
  if (!datos || typeof datos !== "object") return datos || null;
  const cap = (group) => {
    if (!group || typeof group !== "object") return group;
    const hasClientes = Array.isArray(group.clientes);
    const payloadCount = hasClientes ? group.clientes.length : null;
    const sample = hasClientes ? group.clientes.slice(0, 3) : null;
    return {
      ...group,
      clientes: hasClientes ? sample : group.clientes,
      payload_client_count: payloadCount,
      sample_client_count: hasClientes ? sample.length : null,
      clientes_truncated: hasClientes ? payloadCount > 3 : false,
    };
  };
  return {
    planta: datos.planta || null,
    periodoA: datos.periodoA || null,
    periodoB: datos.periodoB || null,
    dejaron: cap(datos.dejaron),
    mas: cap(datos.mas),
    disminuyeron: cap(datos.disminuyeron),
    margenAStr: datos.margenAStr,
    margenBStr: datos.margenBStr,
  };
}

function mapM9Family(payload, plantFallback) {
  if (!payload) {
    return sourceBlock({
      status: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      plant: plantFallback,
      period: { period_a: null, period_b: null },
      source: M9_SOURCE,
      absence: null,
      error: "M9 payload ausente",
    });
  }
  if (payload.ok === true) {
    const plant = {
      planta_id: payload.planta_id != null ? Number(payload.planta_id) : plantFallback.planta_id,
      planta_nombre: payload.planta_nombre || plantFallback.planta_nombre,
      plant_code: payload.planta_clave || plantFallback.plant_code,
    };
    const missingInputs = Array.isArray(payload.missing_inputs)
      ? payload.missing_inputs
      : (payload.datos && Array.isArray(payload.datos.missing_inputs) ? payload.datos.missing_inputs : []);
    const partial =
      payload.availability_status === DIRECTOR_IA_VERACITY.SOURCE_PARTIAL ||
      payload.exact_ingreso === false ||
      (payload.datos && payload.datos.exact_ingreso === false);
    return sourceBlock({
      status: partial ? DIRECTOR_IA_VERACITY.SOURCE_PARTIAL : DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
      plant,
      period: {
        period_a: payload.periodoA,
        period_b: payload.periodoB,
        period_source: payload.period_source || null,
      },
      source: `dashboard.${payload.family || "delta"}`,
      absence: partial ? "partial_null" : null,
      error: null,
      payload: {
        family: payload.family,
        semantic_class: payload.semantic_class,
        unit: payload.unit,
        source_coercion: payload.source_coercion,
        not: payload.not,
        percent_change_not_computed: true,
        exact_ingreso: payload.exact_ingreso,
        missing_inputs: missingInputs,
        datos: truncateM9Datos(payload.datos),
      },
    });
  }
  const code = payload.code || DIRECTOR_IA_VERACITY.SOURCE_ERROR;
  const restricted = code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
  const notFound = code === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
  return sourceBlock({
    status: restricted
      ? DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED
      : notFound
        ? DIRECTOR_IA_VERACITY.DATA_NOT_FOUND
        : DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    plant: plantFallback,
    period: { period_a: payload.periodoA || null, period_b: payload.periodoB || null },
    source: M9_SOURCE,
    absence: notFound ? "DATA_NOT_FOUND" : null,
    error: notFound ? null : payload.error || (restricted ? "SOURCE_RESTRICTED" : "SOURCE_ERROR"),
    code,
    error_kind: !restricted && !notFound ? "TOOL_ERROR" : null,
    payload: { periodos_disponibles: payload.periodos_disponibles || [] },
  });
}

function aggregateM9(venta, desc, ing, plant) {
  const families = { venta, descuento: desc, ingreso: ing };
  const statuses = [venta.status, desc.status, ing.status];
  let status = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (statuses.every((s) => s === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED)) {
    status = DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
  } else if (statuses.every((s) => s === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND)) {
    status = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
  } else if (statuses.every((s) => s === DIRECTOR_IA_VERACITY.SOURCE_ERROR)) {
    status = DIRECTOR_IA_VERACITY.SOURCE_ERROR;
  } else if (statuses.some((s) => s !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE)) {
    status = DIRECTOR_IA_VERACITY.SOURCE_PARTIAL;
  }
  const period =
    (venta.period && venta.period.period_a && venta.period.period_b && venta.period) ||
    (desc.period && desc.period.period_a && desc.period.period_b && desc.period) ||
    (ing.period && ing.period.period_a && ing.period.period_b && ing.period) ||
    { period_a: null, period_b: null };
  return sourceBlock({
    status,
    plant,
    period,
    source: M9_SOURCE,
    absence: status === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND ? "DATA_NOT_FOUND" : null,
    error:
      status === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED
        ? venta.error || desc.error || ing.error
        : status === DIRECTOR_IA_VERACITY.SOURCE_ERROR
          ? venta.error || desc.error || ing.error
          : null,
    payload: families,
  });
}

function buildAlignment(igf, arr, m9) {
  const igfPeriod = typeof igf.period === "string" ? igf.period : null;
  const arrPeriod = typeof arr.period === "string" ? arr.period : null;
  const periodA = m9.period && m9.period.period_a ? String(m9.period.period_a) : null;
  const periodB = m9.period && m9.period.period_b ? String(m9.period.period_b) : null;
  const sameIgfArr = Boolean(igfPeriod && arrPeriod && igfPeriod === arrPeriod);
  const igfInM9 = Boolean(igfPeriod && periodA && periodB && (igfPeriod === periodA || igfPeriod === periodB));
  const comparable = sameIgfArr && igfInM9;
  return {
    status: comparable ? "comparable" : "mismatch",
    igf_period: igfPeriod,
    arr_period: arrPeriod,
    m9_period_a: periodA,
    m9_period_b: periodB,
    silently_aligned: false,
    note: comparable
      ? "El YYYY-MM de IGF/ARR aparece en el par M9. Siguen siendo objetos distintos."
      : "Los cortes no coinciden. No se alinearon en silencio. No los trates como el mismo mes.",
  };
}

function collectLimitations(igf, arr, m9, alignment) {
  const out = [
    "no_causalidad",
    "no_fusion_entre_fuentes",
    "null_no_es_cero",
    "chat_legado_no_ies_no_n5",
  ];
  if (alignment.status === "mismatch") out.push("period_mismatch");
  if (igf.status !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE) out.push(`igf_${igf.status}`);
  if (arr.status !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE) out.push(`arr_${arr.status}`);
  if (m9.status !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE) out.push(`m9_${m9.status}`);
  return out;
}

function assembleFinancialDiagnosisEvidence(input) {
  const plant = input.plant || emptyPlant(input.planta_id);
  const year = input.year;
  const month = input.month;
  const igf = mapIgfBlock(input.igfRaw, plant, year, month);
  const arr = mapArrBlock(input.arrRaw, plant, year, month);
  const venta = mapM9Family(input.m9Venta, plant);
  const desc = mapM9Family(input.m9Descuento, plant);
  const ing = mapM9Family(input.m9Ingreso, plant);
  const m9 = aggregateM9(venta, desc, ing, plant);
  const alignment = buildAlignment(igf, arr, m9);
  const limitations = collectLimitations(igf, arr, m9, alignment);
  return {
    ok: true,
    abort: false,
    semantic_class: SEMANTIC_CLASS,
    plant,
    requested_period: {
      igf_arr_yyyy_mm: toYyyyMm(year, month),
      m9_periodo_a: m9.period && m9.period.period_a,
      m9_periodo_b: m9.period && m9.period.period_b,
    },
    sources: { igf, arr, m9 },
    alignment,
    limitations,
  };
}

function shouldAbortForAuthz(auth, assembled) {
  const role = dashboardAuthRoleNorm(auth);
  const igf = assembled.sources.igf;
  const arr = assembled.sources.arr;
  const m9 = assembled.sources.m9;
  const families = m9.payload || {};
  const anyRestricted = [igf, arr, m9, families.venta, families.descuento, families.ingreso].some(
    (b) => b && b.status === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED
  );
  if (role === "GA") return anyRestricted;
  if (role === "GV") {
    return (
      igf.status === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED ||
      arr.status === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED
    );
  }
  return m9.status === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
}

async function loadFinancialDiagnosisForChat(pool, plantaId, req, opts = {}) {
  const question =
    opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const loadIgfArr = opts.loadIgfArrBlocks || loadIgfArrSourceBlocksForChat;
  const loadVenta = opts.loadDeltaVenta || loadDeltaVentaForChat;
  const loadDesc = opts.loadDeltaDescuento || loadDeltaDescuentoForChat;
  const loadIng = opts.loadDeltaIngreso || loadDeltaIngresoForChat;

  const igfArr = await loadIgfArr(pool, plantaId, req, question);
  if (igfArr && igfArr.abort) {
    return {
      ok: false,
      abort: true,
      status: igfArr.status || 403,
      code: igfArr.code || DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: igfArr.error || "Sin acceso a KPIs financieros",
    };
  }

  const m9Opts = { question, ...(opts.m9Opts || {}) };
  const m9Venta = await loadVenta(pool, plantaId, req, m9Opts);
  const m9Descuento = await loadDesc(pool, plantaId, req, m9Opts);
  const m9Ingreso = await loadIng(pool, plantaId, req, m9Opts);

  const plant =
    (igfArr && igfArr.plant) ||
    (m9Venta && m9Venta.ok
      ? {
          planta_id: Number(plantaId),
          planta_nombre: m9Venta.planta_nombre,
          plant_code: m9Venta.planta_clave || null,
        }
      : emptyPlant(plantaId));

  let igfRaw = igfArr && igfArr.igf;
  let arrRaw = igfArr && igfArr.arr;
  if (igfArr && igfArr.ok === false && !igfArr.abort) {
    igfRaw = igfRaw || { load_error: igfArr.error || "Error IGF" };
    arrRaw = arrRaw || { load_error: igfArr.error || "Error ARR" };
  }

  const assembled = assembleFinancialDiagnosisEvidence({
    planta_id: plantaId,
    plant,
    year: igfArr && igfArr.year,
    month: igfArr && igfArr.month,
    igfRaw,
    arrRaw,
    m9Venta,
    m9Descuento,
    m9Ingreso,
  });

  const auth = (req && req.dashboardAuth) || opts.auth || {};
  if (shouldAbortForAuthz(auth, assembled)) {
    const restricted =
      assembled.sources.m9.status === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED
        ? assembled.sources.m9
        : assembled.sources.igf;
    return {
      ok: false,
      abort: true,
      status: 403,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: restricted.error || "Sin acceso a KPIs financieros.",
    };
  }

  return assembled;
}

function statusLine(block) {
  const bits = [`status=${block.status}`];
  if (block.absence) bits.push(`absence=${block.absence}`);
  if (block.error) bits.push(`error=${block.error}`);
  return bits.join(" | ");
}

function formatIgfPayload(block) {
  const p = block.payload;
  if (!p) return ["(sin payload)"];
  const lines = [
    `periodo=${block.period || "—"} | version=${p.version_id != null ? `v${p.version_number} id ${p.version_id}` : "—"}`,
    "null no es 0. COMPOSICIÓN != CAUSALIDAD. No es M9.",
  ];
  const comp = p.composition;
  if (!comp || comp.ok !== true || !Array.isArray(comp.lines) || !comp.lines.length) {
    lines.push("sin líneas de composición observadas.");
  } else {
    for (const line of comp.lines.slice(0, 18)) {
      lines.push(
        `- ${line.line_key} (${line.line_label}, ${line.unit}): valor almacenado ${line.value} ${line.unit}.`
      );
    }
    if (Array.isArray(p.omitted_null_keys) && p.omitted_null_keys.length) {
      lines.push(`omitted_null_keys (no son cero): ${p.omitted_null_keys.join(", ")}`);
    }
  }
  return lines;
}

function formatArrPayload(block) {
  const p = block.payload || {};
  return [
    `periodo=${block.period || "—"}`,
    `observed_venta_ton=${p.observed_venta_ton == null ? "null" : p.observed_venta_ton}`,
    `projected_venta_ton=${p.projected_venta_ton == null ? "null" : p.projected_venta_ton}`,
    `observed_desc_kg=${p.observed_desc_kg == null ? "null" : p.observed_desc_kg}`,
    `projected_desc_kg=${p.projected_desc_kg == null ? "null" : p.projected_desc_kg}`,
    `venta_ton=${p.venta_ton == null ? "null" : p.venta_ton}`,
    `desc_kg=${p.desc_kg == null ? "null" : p.desc_kg}`,
    "ARR observed != projected != IGF commitment. No es delta M9. null no es 0.",
  ];
}

const M9_FAMILY_TOTAL_FIELD = {
  delta_venta: "totalDeltaKg",
  delta_descuento: "totalDeltaRatio",
  delta_ingreso: "totalDeltaIngreso",
};

function m9FamilyTotalField(name, payload) {
  const family = payload && payload.family ? String(payload.family) : String(name || "");
  return M9_FAMILY_TOTAL_FIELD[family] || null;
}

function finiteCount(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function m9VentaBucketSemantics(name) {
  if (name === "disminuyeron") return "GROSS_DECREASE_MAGNITUDE_KG";
  if (name === "mas") return "GROSS_INCREASE_MAGNITUDE_KG";
  if (name === "dejaron") return "GROSS_STOPPED_BUYING_MAGNITUDE_KG";
  return null;
}

function formatM9Bucket(name, bucket, totalField) {
  if (bucket == null || typeof bucket !== "object") {
    return `  ${name}: exists=NO, payload_client_count=UNAVAILABLE`;
  }
  const payloadCount = finiteCount(bucket.payload_client_count);
  const sampleCount = finiteCount(bucket.sample_client_count);
  const state =
    payloadCount === 0 ? "EMPTY" : payloadCount != null && payloadCount > 0 ? "NONEMPTY" : "NO_CLIENT_LIST";
  const truncated =
    bucket.clientes_truncated === true ? "YES" : payloadCount != null ? "NO" : "UNAVAILABLE";
  const bits = [
    `${name}: exists=YES`,
    `state=${state}`,
    `payload_client_count=${payloadCount == null ? "UNAVAILABLE" : payloadCount}`,
    `sample_client_count=${sampleCount == null ? "UNAVAILABLE" : sampleCount}`,
    `truncated=${truncated}`,
  ];
  if (totalField) {
    const hasTotal = Object.prototype.hasOwnProperty.call(bucket, totalField);
    const raw = hasTotal ? bucket[totalField] : undefined;
    if (!hasTotal || raw == null || raw === "" || !Number.isFinite(Number(raw))) {
      bits.push(`${totalField}=UNAVAILABLE`);
    } else {
      bits.push(`${totalField}=${Number(raw)}`);
    }
  }
  if (totalField === "totalDeltaKg") {
    const semantics = m9VentaBucketSemantics(name);
    if (semantics) {
      bits.push(`semantics=${semantics}`);
      bits.push("NOT_PLANT_NET_DELTA");
      bits.push("NOT_IGF_ARR_GAP");
      bits.push("M9_PLANT_NET_DELTA_STATUS=NOT_AVAILABLE");
    }
  }
  return `  ${bits.join(", ")}`;
}

function formatM9StructuralConvention(text) {
  const raw = text != null ? String(text).trim() : "";
  if (!raw) return null;
  return [
    `  CONVENCION_ESTRUCTURAL: ${raw}`,
    "  CONVENCION_ESTRUCTURAL aplica a clasificación cliente-a-cliente. Cliente ausente dentro de un periodo transaccional puede mapear a cero para clasificación. NO significa que el periodo completo no tenga clientes. NO significa DATA_NOT_FOUND. NO significa ausencia de evidencia.",
  ].join("\n");
}

function formatM9Family(name, block) {
  if (!block) return `${name}: (sin bloque)`;
  const p = block.payload || {};
  const d = p.datos || {};
  const period = block.period || {};
  const lines = [
    `${name}: ${statusLine(block)} | ${period.period_a || "—"} vs ${period.period_b || "—"} (${period.period_source || "—"})`,
  ];
  if (
    block.status === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND ||
    block.status === DIRECTOR_IA_VERACITY.SOURCE_ERROR ||
    block.status === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED
  ) {
    lines.push(`  ${name}: NO DISPONIBLE. null no es 0. No afirma causalidad.`);
    return lines.join("\n");
  }
  if (block.status === DIRECTOR_IA_VERACITY.SOURCE_PARTIAL) {
    const missing = Array.isArray(p.missing_inputs) && p.missing_inputs.length
      ? p.missing_inputs.join(", ")
      : "insumo requerido";
    lines.push(
      `  ${name}: NO DISPONIBLE exacto (faltan: ${missing}). null no es 0. No afirma causalidad.`
    );
    return lines.join("\n");
  }
  if (block.status === DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE && d) {
    const totalField = m9FamilyTotalField(name, p);
    lines.push(`  unit=${p.unit || "—"}`);
    lines.push(formatM9Bucket("dejaron", d.dejaron, totalField));
    lines.push(formatM9Bucket("mas", d.mas, totalField));
    lines.push(formatM9Bucket("disminuyeron", d.disminuyeron, totalField));
    const convention = formatM9StructuralConvention(p.source_coercion);
    if (convention) lines.push(convention);
  }
  return lines.join("\n");
}

function formatFinancialDiagnosisContext(assembled) {
  const igf = assembled.sources.igf;
  const arr = assembled.sources.arr;
  const m9 = assembled.sources.m9;
  const plant = assembled.plant || {};
  const align = assembled.alignment || {};
  const lines = [
    "---",
    "BLOQUES FINANCIEROS SEPARADOS (financial_diagnosis)",
    `Planta: ${plant.planta_nombre || "—"} | planta_id=${plant.planta_id || "—"} | ARR code=${plant.plant_code || "—"}`,
    `alignment.status=${align.status} | IGF=${align.igf_period || "—"} | ARR=${align.arr_period || "—"} | M9=${align.m9_period_a || "—"} vs ${align.m9_period_b || "—"}`,
    `alignment.note: ${align.note}`,
    `limitations: ${(assembled.limitations || []).join(", ")}`,
    "",
    `BLOQUE IGF | source=${igf.source} | plant=${(igf.plant && igf.plant.planta_nombre) || "—"} | ${statusLine(igf)}`,
    ...formatIgfPayload(igf),
    "",
    `BLOQUE ARR | source=${arr.source} | plant=${(arr.plant && arr.plant.planta_nombre) || "—"} | ${statusLine(arr)}`,
    ...formatArrPayload(arr),
    "",
    `BLOQUE M9 | source=${m9.source} | ${statusLine(m9)}`,
    formatM9Family("delta_venta", m9.payload && m9.payload.venta),
    formatM9Family("delta_descuento", m9.payload && m9.payload.descuento),
    formatM9Family("delta_ingreso", m9.payload && m9.payload.ingreso),
    "",
    "Fin de bloques. No inventes cifras. No afirmes causa.",
  ];
  return lines.join("\n");
}

function isPorQueFinancialQuestion(question) {
  const q = String(question || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return /\b(por\s+que|porque)\b/.test(q);
}

function promptSourceStatus(block) {
  return block && block.status ? String(block.status) : "UNAVAILABLE";
}

function promptMissingInputs(block) {
  const payload = block && block.payload && typeof block.payload === "object" ? block.payload : {};
  return Array.isArray(payload.missing_inputs) ? payload.missing_inputs.filter(Boolean) : [];
}

function buildFinancialDiagnosisPromptControl(assembled, question) {
  const align = (assembled && assembled.alignment) || {};
  const sources = (assembled && assembled.sources) || {};
  const igf = sources.igf || {};
  const arr = sources.arr || {};
  const m9 = sources.m9 || {};
  const families = m9.payload || {};
  const venta = families.venta || {};
  const desc = families.descuento || {};
  const ing = families.ingreso || {};
  const alignmentStatus = align.status === "comparable" ? "comparable" : "mismatch";
  const missing = [
    ...promptMissingInputs(igf).map((k) => `igf:${k}`),
    ...promptMissingInputs(arr).map((k) => `arr:${k}`),
    ...promptMissingInputs(venta).map((k) => `delta_venta:${k}`),
    ...promptMissingInputs(desc).map((k) => `delta_descuento:${k}`),
    ...promptMissingInputs(ing).map((k) => `delta_ingreso:${k}`),
  ];
  const lines = [
    "FINANCIAL_DIAGNOSIS_CONTROL",
    `ALIGNMENT_STATUS=${alignmentStatus}`,
    "ALIGNMENT_AUTHORITY=buildAlignment",
    `IGF_PERIOD=${align.igf_period || "—"}`,
    `ARR_PERIOD=${align.arr_period || "—"}`,
    `M9_PERIOD_A=${align.m9_period_a || "—"}`,
    `M9_PERIOD_B=${align.m9_period_b || "—"}`,
    `IGF_STATUS=${promptSourceStatus(igf)}`,
    `ARR_STATUS=${promptSourceStatus(arr)}`,
    `M9_STATUS=${promptSourceStatus(m9)}`,
    `M9_DELTA_VENTA_STATUS=${promptSourceStatus(venta)}`,
    `M9_DELTA_DESCUENTO_STATUS=${promptSourceStatus(desc)}`,
    `M9_DELTA_INGRESO_STATUS=${promptSourceStatus(ing)}`,
    "CAUSAL_EVIDENCE=NONE",
    "TENSION=descriptive_difference_only",
    "M9_PLANT_NET_DELTA_STATUS=NOT_AVAILABLE",
    "M9 disminuyeron.totalDeltaKg=GROSS_DECREASE_MAGNITUDE_KG (reducción bruta acumulada del bucket de clientes que disminuyeron).",
    "M9 mas.totalDeltaKg=GROSS_INCREASE_MAGNITUDE_KG (incluye clientes nuevos). No es delta neto de planta.",
    "M9 dejaron.totalDeltaKg=GROSS_STOPPED_BUYING_MAGNITUDE_KG. No es delta neto de planta.",
  ];
  if (alignmentStatus === "comparable") {
    lines.push(
      `REQUIRED: tratar IGF ${align.igf_period || "—"} / ARR ${align.arr_period || "—"} / M9 ${align.m9_period_a || "—"}->${align.m9_period_b || "—"} como comparables según buildAlignment.`,
      "REQUIRED: alignment.status es autoritativo. No lo reinterpretas.",
      "FORBIDDEN: period mismatch",
      "FORBIDDEN: periodo diferente que limita comparación",
      "FORBIDDEN: falta de alineación"
    );
  } else {
    lines.push(
      "REQUIRED: declarar period mismatch. No trates los cortes como el mismo mes.",
      "FORBIDDEN: tratar los bloques como comparables o el mismo mes."
    );
  }
  lines.push(
    "SOURCE_AVAILABLE MUST NOT be rewritten as missing or unavailable.",
    "SOURCE_PARTIAL: resultado exacto no disponible solo según missing_inputs físicos.",
    "SOURCE_PARTIAL MUST NOT invent missing reason outside missing_inputs.",
    "CONVENCION_ESTRUCTURAL MUST NOT mean el periodo no tiene clientes, ausencia de clientes, or DATA_NOT_FOUND.",
    "FORBIDDEN: debido a (atribución causal); causó; provocó; explica; puede estar relacionado; podría indicar la causa; sugiere que X ocasionó Y.",
    "ALLOWED: describir simultáneamente Delta Ingreso disminuyó y Delta Venta disminuyó. Coexistencia no autoriza causalidad.",
    "Tensión solo significa diferencia descriptiva entre objetos o fuentes. Tensión no es driver, causa, explicación, «podría indicar» ni «puede estar relacionado».",
    "No formules hipótesis N5. No nombres responsable. No inventes impacto causal.",
    "FORBIDDEN: Delta Venta disminuyó X usando solo disminuyeron.totalDeltaKg.",
    "FORBIDDEN: la planta cayó X usando un bucket M9.",
    "FORBIDDEN: la venta neta cayó X usando un bucket M9.",
    "FORBIDDEN: equiparar un bucket M9 con el gap IGF-ARR.",
    "REQUIRED: si mencionas 1059160.26 o disminuyeron.totalDeltaKg, dilo como reducción bruta acumulada del bucket de clientes que disminuyeron, no como caída neta de planta.",
    "REQUIRED: otros buckets pueden compensar esa magnitud. No afirmes resultado neto sin fuente física.",
    "IGF venta y ARR projected_venta_ton no son M9 Delta Venta."
  );
  if (missing.length) {
    lines.push(`MISSING_INPUTS=${missing.join(",")}`);
  }
  if (isPorQueFinancialQuestion(question)) {
    lines.push(
      "REQUIRED: la pregunta pide causa y CAUSAL_EVIDENCE=NONE; declara que con estas fuentes no puedes determinar por qué cayó el ingreso ni atribuir causalidad a venta, descuento o clientes."
    );
  }
  return lines.join("\n");
}

function buildFinancialDiagnosisPrompt(assembled, question) {
  const context = formatFinancialDiagnosisContext(assembled);
  const control = buildFinancialDiagnosisPromptControl(assembled, question);
  const systemPrompt = [
    "Eres Director IA. Responde en español, breve y ejecutivo.",
    FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM,
    control,
  ].join("\n");
  const userContent = [
    context,
    "",
    "Pregunta del ejecutivo:",
    String(question || ""),
    "",
    "Resume hechos por bloque. Señala coincidencias o tensiones sin causalidad. Declara limitaciones y period mismatch si existen.",
    "Period mismatch se declara únicamente si FINANCIAL_DIAGNOSIS_CONTROL ALIGNMENT_STATUS=mismatch. Si ALIGNMENT_STATUS=comparable está PROHIBIDO afirmar period mismatch, periodo diferente que limita comparación o falta de alineación.",
  ].join("\n");
  return { systemPrompt, userContent, context };
}

function listedSources() {
  return [IGF_SOURCE, ARR_SOURCE, M9_SOURCE, "financial_diagnosis.blocks"];
}

function buildFinancialDiagnosisChatResult(assembled, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : assembled.plant && assembled.plant.planta_id;
  const openaiCalled = opts.openai_called !== false;
  return {
    ok: true,
    answer: opts.answer || "",
    sources: listedSources(),
    context_meta: {
      mode: "financial_diagnosis",
      requested_domain: "financial_diagnosis",
      openai_called: openaiCalled,
      openai_call_count: openaiCalled ? 1 : 0,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      alignment: assembled.alignment,
      limitations: assembled.limitations,
      prompt_mode: "financial_diagnosis",
      focus_type: "financial_diagnosis",
      igf_arr_annex: false,
      ies_runtime: false,
      reasoning_engine: false,
    },
    financial_diagnosis: {
      semantic_class: SEMANTIC_CLASS,
      plant: assembled.plant,
      requested_period: assembled.requested_period,
      sources: assembled.sources,
      alignment: assembled.alignment,
      limitations: assembled.limitations,
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  IGF_SOURCE,
  ARR_SOURCE,
  M9_SOURCE,
  FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM,
  toYyyyMm,
  assembleFinancialDiagnosisEvidence,
  shouldAbortForAuthz,
  loadFinancialDiagnosisForChat,
  formatFinancialDiagnosisContext,
  buildFinancialDiagnosisPrompt,
  buildFinancialDiagnosisChatResult,
};
