"use strict";

const ALIASES = [
  ["puebla", "gt puebla"],
  ["tehuacan", "tehuacán"],
  ["queretaro", "querétaro", "gtm queretaro", "gtm querétaro"],
  ["san luis", "gtm san luis"],
  ["acapulco"],
  ["morelos"],
];

function foldPlant(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function canonOf(value) {
  const folded = foldPlant(value);
  if (!folded) return "";
  for (const group of ALIASES) {
    if (group.some((key) => foldPlant(key) === folded)) return foldPlant(group[0]);
  }
  return folded;
}

function plantsShareCanon(a, b) {
  const left = canonOf(a);
  const right = canonOf(b);
  return Boolean(left && right && left === right);
}

function finite(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ingresoImporte(margen, com, hg, ventaTon) {
  if (margen == null || com == null || hg == null || ventaTon == null) return null;
  if (!Number.isFinite(margen) || !Number.isFinite(com) || !Number.isFinite(hg) || !Number.isFinite(Number(ventaTon))) {
    return null;
  }
  return Math.round((margen + com - hg) * Number(ventaTon) * 1000);
}

function closeResultadoFinal(ingreso, operativos, corporativos, impuestosFederales) {
  if (ingreso == null || operativos == null || corporativos == null || impuestosFederales == null) return null;
  const utilOperImporte = ingreso - operativos;
  return utilOperImporte - corporativos - impuestosFederales;
}

function applyFinancialsToMiniRow(row, fin) {
  const margen = finite(fin && fin.margenKg);
  const com = finite(fin && fin.comDescKg);
  const hg = finite(fin && fin.hgKg);
  const ventaTon = finite(fin && fin.ventaTon);
  const ventaKg = ventaTon != null ? ventaTon * 1000 : null;
  const impuestosFederales = finite(fin && fin.impuestosFederalesImporte);
  const impuestos = impuestosFederales != null && ventaKg != null && ventaKg > 0 ? impuestosFederales / ventaKg : null;
  const ingreso = ingresoImporte(margen, com, hg, ventaTon);
  const operativos = finite(fin && fin.operativosImporte);
  const corporativos = finite(fin && fin.corporativosImporte);
  const gasto = operativos != null && corporativos != null ? operativos + corporativos : null;
  const utilOperImporte = ingreso != null && operativos != null ? ingreso - operativos : null;
  const resultadoFinalImporte = closeResultadoFinal(ingreso, operativos, corporativos, impuestosFederales);
  return {
    ...row,
    octoberContract: true,
    ventaTon,
    margen,
    comDesc: com,
    hgKg: hg,
    hgPct: finite(fin && fin.hgPct),
    hgDollar: finite(fin && fin.hgDollar),
    impuestos,
    ingreso,
    operativos,
    corporativos,
    gasto,
    utilOperImporte,
    resultadoFinalImporte,
  };
}

function blankOctoberMini(row) {
  return applyFinancialsToMiniRow(row, {});
}

function indexFinancials(rows) {
  const map = new Map();
  for (const row of rows || []) {
    if (!row || !row.financials) continue;
    for (const key of [row.plant_code, row.empresa, row.canon, row.igf_label]) {
      const canon = canonOf(key);
      if (canon && !map.has(canon)) map.set(canon, row.financials);
    }
  }
  return map;
}

function overlayMiniRows(miniRows, acumuladoRows) {
  const index = indexFinancials(acumuladoRows);
  return (miniRows || []).map((row) => {
    const fin = index.get(canonOf(row && row.plant_code)) || index.get(canonOf(row && row.empresa)) || null;
    if (!fin) return blankOctoberMini(row);
    return applyFinancialsToMiniRow(row, fin);
  });
}

function sumMoney(rows, key) {
  let total = 0;
  for (const row of rows || []) {
    const n = finite(row && row[key]);
    if (n == null) return null;
    total += n;
  }
  return total;
}

function weightedMetric(rows, key) {
  let numerator = 0;
  let denominator = 0;
  for (const row of rows || []) {
    const value = finite(row && row[key]);
    const venta = finite(row && row.ventaTon);
    if (value == null || venta == null) continue;
    numerator += value * venta;
    denominator += venta;
  }
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function zonaFromPlantRows(rows) {
  const list = rows || [];
  const venta = sumMoney(list, "ventaTon");
  return {
    empresa: "Zona Provincia",
    plant_code: null,
    octoberContract: true,
    ventaTon: venta == null ? null : Math.round(venta * 100) / 100,
    margen: weightedMetric(list, "margen"),
    comDesc: weightedMetric(list, "comDesc"),
    impuestos: weightedMetric(list, "impuestos"),
    hgKg: weightedMetric(list, "hgKg"),
    hgPct: weightedMetric(list, "hgPct"),
    hgDollar: weightedMetric(list, "hgDollar"),
    ingreso: sumMoney(list, "ingreso"),
    operativos: sumMoney(list, "operativos"),
    corporativos: sumMoney(list, "corporativos"),
    gasto: sumMoney(list, "gasto"),
    utilOperImporte: sumMoney(list, "utilOperImporte"),
    resultadoFinalImporte: sumMoney(list, "resultadoFinalImporte"),
  };
}

function expenseInputsFromComponentes(componentes, ventaTon) {
  if (!componentes) return null;
  const j = finite(componentes.gasto_corporativo);
  const k = finite(componentes.inversiones);
  const l = finite(componentes.impuestos_federales);
  const parts = [
    componentes.presupuesto_nomina_gastos,
    componentes.presupuesto_imss_sua,
    componentes.extraordinarios,
    componentes.provisiones_planta,
  ];
  const operativos = parts.every((value) => finite(value) != null)
    ? parts.reduce((sum, value) => sum + finite(value), 0)
    : null;
  const corporativos = j != null && k != null ? j + k : null;
  const ventaKg = finite(ventaTon) != null ? finite(ventaTon) * 1000 : null;
  const impuestos = l != null && ventaKg != null && ventaKg > 0 ? l / ventaKg : null;
  const gasto = operativos != null && corporativos != null ? operativos + corporativos : null;
  return { operativos, corporativos, gasto, impuestos, impuestosFederales: l };
}

module.exports = {
  plantsShareCanon,
  applyFinancialsToMiniRow,
  closeResultadoFinal,
  blankOctoberMini,
  overlayMiniRows,
  zonaFromPlantRows,
  expenseInputsFromComponentes,
  ingresoImporte,
};
