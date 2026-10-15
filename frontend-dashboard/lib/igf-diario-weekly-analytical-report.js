"use strict";

const PARTIDAS = [
  { key: "precio_kg", label: "Precio de venta", sign: 1 },
  { key: "costo_kg", label: "Costo del gas", sign: -1 },
  { key: "flete_kg", label: "Flete", sign: -1 },
  { key: "gasto_corporativo_kg", label: "Gasto corporativo", sign: -1 },
  { key: "inversiones_kg", label: "Inversiones", sign: -1 },
  { key: "impuestos_federales_kg", label: "Impuestos federales", sign: -1 },
  { key: "presupuesto_nomina_gastos_kg", label: "Presupuesto nómina/gastos", sign: -1 },
  { key: "presupuesto_imss_sua_kg", label: "Presupuesto IMSS/SUA", sign: -1 },
  { key: "extraordinarios_kg", label: "Extraordinarios", sign: -1 },
  { key: "provisiones_planta_kg", label: "Provisiones de la planta", sign: -1 },
  { key: "hg_kg", label: "HG/XK", sign: -1 },
  { key: "com_desc_kg", label: "Comisiones y descuentos", sign: 1 },
];

const PESO_TOLERANCE = 0.01;
const KG_TOLERANCE = 1e-6;
const VISIBLE_RATE = 0.0005;
const PARTIAL_LABEL = "Análisis parcial / No conciliable con el detalle disponible";

function finite(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function addDays(value, days) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

function cloneDay(day) {
  return {
    fecha: day && day.fecha ? String(day.fecha) : null,
    weekday: day && day.weekday ? String(day.weekday) : null,
    estado: day && day.estado ? String(day.estado) : null,
    metrics: day && day.metrics ? { ...day.metrics } : {},
    missing_components: Array.isArray(day && day.missing_components) ? day.missing_components.slice() : [],
    com_desc_source: day && day.com_desc_source ? String(day.com_desc_source) : null,
    com_desc_source_date: day && day.com_desc_source_date ? String(day.com_desc_source_date) : null,
  };
}

function cloneWeek(week) {
  const coverage = week && week.coverage ? JSON.parse(JSON.stringify(week.coverage)) : null;
  return {
    id: String(week.id || week.fecha_desde || ""),
    fecha_desde: String(week.fecha_desde || ""),
    fecha_hasta: String(week.fecha_hasta || ""),
    week_number: week.week_number,
    week_year: week.week_year == null ? null : Number(week.week_year),
    estado: week.estado || null,
    complete: week.complete == null ? null : Boolean(week.complete),
    missing_components: Array.isArray(week.missing_components) ? week.missing_components.slice() : [],
    metrics: week && week.metrics ? { ...week.metrics } : {},
    coverage,
    days: Array.isArray(week && week.days) ? week.days.map(cloneDay) : [],
    corte_ymd: week && week.corte_ymd ? String(week.corte_ymd) : null,
    version_as_of_corte: week && week.version_as_of_corte == null ? null : Boolean(week.version_as_of_corte),
    plant_code: week && week.plant_code ? String(week.plant_code) : null,
    empresa: week && week.empresa ? String(week.empresa) : null,
  };
}

function freezePlantExport(input) {
  const ids = new Set(input && input.selectedIds || []);
  const chosen = (input && input.weeks || [])
    .filter((week) => ids.has(String(week.id || week.fecha_desde || "")))
    .map(cloneWeek)
    .sort((left, right) => left.fecha_desde.localeCompare(right.fecha_desde));
  const first = chosen[0] || {};
  return {
    plant: String((input && input.empresa) || first.empresa || ""),
    plantCode: String((input && input.plantCode) || first.plant_code || ""),
    corte_ymd: chosen.reduce((found, week) => found || week.corte_ymd, null),
    version_as_of_corte: chosen.some((week) => week.version_as_of_corte === true),
    weeks: chosen,
  };
}

function coverageLabel(block) {
  if (!block) return "no informada";
  const sales = Number(block.days_with_sales || 0);
  const covered = Number(block.days_covered || 0);
  if (sales <= 0 && !(finite(block.kg_covered) > 0)) return "sin datos";
  if (sales > 0 && covered < sales) return "parcial";
  if (sales > 0 && covered === sales) return "completa";
  return "no informada";
}

function timeLabel(estado) {
  if (estado === "real") return "real";
  if (estado === "proyectada") return "proyectada";
  if (estado === "parcial") return "mixta";
  return "no informada";
}

function provenance(days) {
  const seen = [];
  for (const day of days || []) {
    const source = day && day.com_desc_source;
    if (!source || source === "NULL") continue;
    const date = day.com_desc_source_date || "";
    const label = `${source}${date ? ` ${date}` : ""}`;
    if (!seen.includes(label)) seen.push(label);
  }
  return {
    com_desc: seen,
    otras: "No informada",
  };
}

function assessWeek(week) {
  const metrics = week.metrics || {};
  const resultCoverage = week.coverage && week.coverage.resultado ? week.coverage.resultado : null;
  const cdCoverage = week.coverage && week.coverage.com_desc_kg ? week.coverage.com_desc_kg : null;
  const R = finite(metrics.resultado_mxn);
  const r = finite(metrics.resultado_kg);
  const V = finite(metrics.venta_kg);
  const Q = resultCoverage ? finite(resultCoverage.kg_covered) : null;
  const qCd = cdCoverage ? finite(cdCoverage.kg_covered) : null;
  const rates = PARTIDAS.map((partida, index) => ({
    index,
    key: partida.key,
    label: partida.label,
    sign: partida.sign,
    value: finite(metrics[partida.key]),
  }));
  const missing = rates.filter((rate) => rate.value == null).map((rate) => rate.label);
  const signedSum = missing.length === 0
    ? rates.reduce((sum, rate) => sum + rate.sign * rate.value, 0)
    : null;
  const reasons = [];
  if (R == null || r == null) reasons.push("resultado oficial incompleto");
  if (!(Q > 0)) reasons.push("sin kilos cubiertos del resultado");
  if (V == null) reasons.push("sin venta total");
  if (Q != null && V != null && Math.abs(Q - V) > KG_TOLERANCE) reasons.push("Q distinto de V dentro de la semana");
  if (qCd == null) reasons.push("sin base de comisiones y descuentos");
  if (Q != null && qCd != null && Math.abs(Q - qCd) > KG_TOLERANCE) reasons.push("la cobertura de C&D no coincide con Q");
  if (missing.length) reasons.push(`partidas sin dato: ${missing.join(", ")}`);
  if (R != null && r != null && Q != null && Math.abs(R - Q * r) > PESO_TOLERANCE) reasons.push("R no cierra con Q*r");
  if (signedSum != null && r != null && Q != null && Math.abs((signedSum - r) * Q) > PESO_TOLERANCE) {
    reasons.push("la suma firmada de las doce partidas no reproduce r");
  }
  return {
    id: week.id,
    fecha_desde: week.fecha_desde,
    fecha_hasta: week.fecha_hasta,
    week_number: week.week_number,
    week_year: week.week_year,
    estado: week.estado,
    time_label: timeLabel(week.estado),
    result_coverage_label: coverageLabel(resultCoverage),
    cd_coverage_label: coverageLabel(cdCoverage),
    missing_components: week.missing_components || [],
    R,
    r,
    V,
    Q,
    qCd,
    rates,
    signedSum,
    reasons,
    compatible: reasons.length === 0,
    provenance: provenance(week.days),
  };
}

function percentChange(previous, current) {
  if (previous == null || current == null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

function rankLines(lines) {
  return lines
    .filter((line) => line.aporte != null)
    .slice()
    .sort((left, right) => Math.abs(right.aporte) - Math.abs(left.aporte) || left.index - right.index);
}

function transitionOf(previous, current) {
  const consecutive = addDays(previous.fecha_desde && previous.fecha_hasta, 1) === current.fecha_desde;
  const yearChange = previous.week_year != null && current.week_year != null && previous.week_year !== current.week_year
    || String(previous.fecha_desde).slice(0, 4) !== String(current.fecha_desde).slice(0, 4);
  const lines = PARTIDAS.map((partida, index) => {
    const before = previous.rates[index].value;
    const after = current.rates[index].value;
    const aporte = before == null || after == null ? null : partida.sign * (after - before);
    return {
      index,
      key: partida.key,
      label: partida.label,
      sign: partida.sign,
      anterior: before,
      actual: after,
      aporte,
    };
  });
  const baseReasons = previous.reasons.concat(current.reasons);
  const official = {
    delta_r: previous.r == null || current.r == null ? null : current.r - previous.r,
    delta_R: previous.R == null || current.R == null ? null : current.R - previous.R,
    delta_V: previous.V == null || current.V == null ? null : current.V - previous.V,
    delta_Q: previous.Q == null || current.Q == null ? null : current.Q - previous.Q,
    percent_r: percentChange(previous.r, current.r),
    percent_V: percentChange(previous.V, current.V),
  };
  const shared = {
    previous_id: previous.id,
    current_id: current.id,
    fecha_desde: previous.fecha_desde,
    fecha_hasta: current.fecha_hasta,
    previous_label: `${previous.fecha_desde}–${previous.fecha_hasta}`,
    current_label: `${current.fecha_desde}–${current.fecha_hasta}`,
    consecutive,
    year_change: yearChange,
    lines,
    official,
    previous,
    current,
  };
  if (baseReasons.length) {
    return {
      ...shared,
      conciliable: false,
      label: PARTIAL_LABEL,
      reasons: baseReasons,
      effects: null,
      volume_effect: null,
      residual: null,
      waterfall: null,
      pressure: null,
      support: null,
    };
  }
  const qMid = (previous.Q + current.Q) / 2;
  const rMid = (previous.r + current.r) / 2;
  const effects = lines.map((line) => ({
    ...line,
    pesos: line.aporte * qMid,
  }));
  const volume = (current.Q - previous.Q) * rMid;
  const attributed = effects.reduce((sum, line) => sum + line.pesos, 0) + volume;
  const residual = official.delta_R - attributed;
  if (Math.abs(residual) > PESO_TOLERANCE) {
    return {
      ...shared,
      conciliable: false,
      label: PARTIAL_LABEL,
      reasons: [`residual ${residual} mayor que $0.01`],
      effects,
      volume_effect: volume,
      residual,
      waterfall: null,
      pressure: null,
      support: null,
    };
  }
  const ranked = rankLines(effects);
  const top = ranked.slice(0, 5);
  const rest = ranked.slice(5);
  const otras = rest.reduce((sum, line) => sum + line.aporte, 0);
  const visible = effects.filter((line) => Math.abs(line.aporte) >= VISIBLE_RATE);
  const support = visible.filter((line) => line.aporte > 0).sort((left, right) => right.aporte - left.aporte || left.index - right.index)[0] || null;
  const pressure = visible.filter((line) => line.aporte < 0).sort((left, right) => left.aporte - right.aporte || left.index - right.index)[0] || null;
  return {
    ...shared,
    conciliable: true,
    label: "Conciliada",
    reasons: [],
    effects,
    volume_effect: volume,
    residual,
    waterfall: {
      anterior: previous.r,
      actual: current.r,
      top,
      otras,
      otras_labels: rest.map((line) => line.label),
    },
    pressure,
    support,
  };
}

function buildAnalyticalReport(frozen, exportedAt) {
  const weeks = (frozen.weeks || []).map(assessWeek);
  const transitions = [];
  for (let index = 1; index < weeks.length; index += 1) {
    transitions.push(transitionOf(weeks[index - 1], weeks[index]));
  }
  return {
    plant: frozen.plant,
    plantCode: frozen.plantCode,
    corte_ymd: frozen.corte_ymd,
    version_as_of_corte: frozen.version_as_of_corte,
    exportedAt: exportedAt || null,
    single_week: weeks.length === 1,
    weeks,
    transitions,
    partial_label: PARTIAL_LABEL,
  };
}

module.exports = {
  PARTIDAS,
  PESO_TOLERANCE,
  PARTIAL_LABEL,
  freezePlantExport,
  buildAnalyticalReport,
  assessWeek,
};
